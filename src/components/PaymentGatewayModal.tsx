import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { 
  QrCode, 
  CreditCard, 
  CheckCircle2, 
  Copy, 
  Check, 
  Clock, 
  ShieldCheck, 
  Lock, 
  AlertCircle, 
  Sparkles, 
  ExternalLink, 
  Smartphone, 
  Building2, 
  RotateCw, 
  Receipt, 
  ArrowRight, 
  ChevronRight, 
  Printer, 
  X, 
  Zap, 
  DollarSign, 
  Share2, 
  FileText,
  BadgePercent
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatBRL } from '../utils/formatters';
import { playCashRegister, playBeep, playKitchenBell } from '../utils/audio';
import { generatePixPayload, getPixQrCodeUrl } from '../utils/pix';
import { 
  paymentGatewayService, 
  detectCardBrand, 
  formatCardNumber, 
  formatExpiryDate, 
  formatCpf, 
  validateCardNumberLuhn, 
  calculateInstallments,
  CardBrand,
  GatewayTransactionResult
} from '../services/paymentGatewayService';
import { Order, PaymentMethod } from '../types';

interface PaymentGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderPayload?: {
    customerName?: string;
    customerPhone?: string;
    customerAddress?: any;
    tableNumber?: number;
    items?: any[];
    subtotal?: number;
    deliveryFee?: number;
    serviceFee?: number;
    total: number;
    orderChannel?: string;
    orderId?: string;
    displayCode?: string;
  };
  existingOrder?: Order | null;
  initialMethod?: 'pix' | 'credit_card' | 'debit_card';
  onPaymentSuccess?: (order: Order, transaction: GatewayTransactionResult) => void;
}

export const PaymentGatewayModal: React.FC<PaymentGatewayModalProps> = ({
  isOpen,
  onClose,
  orderPayload,
  existingOrder,
  initialMethod = 'pix',
  onPaymentSuccess,
}) => {
  const { 
    tenant, 
    processGatewayPaymentAndClearOrder, 
    setWebhookNotifications, 
    sendNewOrderPushAlert 
  } = useApp();

  const effectivePayload = useMemo(() => {
    if (existingOrder) {
      return {
        orderId: existingOrder.id,
        displayCode: existingOrder.displayCode,
        customerName: existingOrder.customerName,
        customerPhone: existingOrder.customerPhone,
        customerAddress: existingOrder.customerAddress,
        tableNumber: existingOrder.tableNumber,
        items: existingOrder.items,
        subtotal: existingOrder.subtotal,
        deliveryFee: existingOrder.deliveryFee,
        serviceFee: existingOrder.serviceFee,
        total: existingOrder.total,
        orderChannel: existingOrder.channel,
      };
    }
    return orderPayload || {
      customerName: 'Cliente',
      items: [],
      subtotal: 0,
      deliveryFee: 0,
      serviceFee: 0,
      total: 0,
      orderChannel: 'cardapio_online'
    };
  }, [existingOrder, orderPayload]);

  // Active Method Tab ('pix' | 'credit_card' | 'debit_card')
  const [selectedMethod, setSelectedMethod] = useState<'pix' | 'credit_card' | 'debit_card'>(initialMethod);

  // Flow State
  const [status, setStatus] = useState<'idle' | 'processing' | 'approved' | 'declined'>('idle');
  const [processingStep, setProcessingStep] = useState<string>('Iniciando comunicação com o gateway...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Created Order & Transaction Details
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [completedTx, setCompletedTx] = useState<GatewayTransactionResult | null>(null);

  // ==========================================
  // PIX DINÂMICO STATES
  // ==========================================
  const [pixTxId] = useState<string>(() => existingOrder?.pixTxId || `PED-${Math.floor(1000 + Math.random() * 9000)}`);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(900); // 15 minutos
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isSimulatingBank, setIsSimulatingBank] = useState<boolean>(false);

  // Dynamic Pix Payload calculation
  const pixPayloadString = useMemo(() => {
    if (!tenant?.settings?.pixKey) return '';
    return generatePixPayload({
      pixKey: tenant.settings.pixKey,
      pixKeyType: tenant.settings.pixKeyType || 'cnpj',
      merchantName: tenant.settings.pixBeneficiaryName || tenant.name || 'Lanchonete Dulci',
      merchantCity: tenant.settings.pixCity || 'SAO PAULO',
      amount: effectivePayload.total > 0 ? effectivePayload.total : undefined,
      txId: pixTxId,
      description: `Pedido ${existingOrder?.displayCode || pixTxId}`,
    });
  }, [tenant, effectivePayload.total, pixTxId, existingOrder]);

  const pixQrCodeUrl = useMemo(() => {
    return getPixQrCodeUrl(pixPayloadString, 260);
  }, [pixPayloadString]);

  // Pix Countdown Timer
  useEffect(() => {
    if (!isOpen || status !== 'idle' || selectedMethod !== 'pix') return;
    const interval = setInterval(() => {
      setCountdownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, status, selectedMethod]);

  const formattedCountdown = useMemo(() => {
    const mins = Math.floor(countdownSeconds / 60);
    const secs = countdownSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, [countdownSeconds]);

  // ==========================================
  // CARD STATES (CREDIT / DEBIT)
  // ==========================================
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState(effectivePayload.customerName || '');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cpf, setCpf] = useState('341.982.018-44');
  const [installments, setInstallments] = useState(1);
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  // Detected brand
  const detectedBrand = useMemo<CardBrand>(() => {
    return detectCardBrand(cardNumber);
  }, [cardNumber]);

  // Installment calculations
  const installmentOptions = useMemo(() => {
    return calculateInstallments(effectivePayload.total, 6);
  }, [effectivePayload.total]);

  // Reset states when opening
  useEffect(() => {
    if (isOpen) {
      setSelectedMethod(initialMethod);
      setStatus('idle');
      setErrorMessage(null);
      setCompletedOrder(null);
      setCompletedTx(null);
      setCountdownSeconds(900);
      setIsCopied(false);
      setCardHolder(effectivePayload.customerName || '');
    }
  }, [isOpen, initialMethod, effectivePayload.customerName]);

  // Trigger celebratory confetti on approved status
  useEffect(() => {
    if (status === 'approved') {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#00E676', '#FFC72C', '#DA291C', '#FFFFFF'],
        });
      } catch (e) {}
    }
  }, [status]);

  // Handle Copy Pix
  const handleCopyPix = () => {
    if (!pixPayloadString) return;
    navigator.clipboard.writeText(pixPayloadString);
    setIsCopied(true);
    playBeep(900, 0.05);
    setTimeout(() => setIsCopied(false), 3000);
  };

  // Quick Preset Test Cards
  const handleFillTestCard = (presetBrand: 'mastercard' | 'visa' | 'elo') => {
    playBeep(700, 0.04);
    if (presetBrand === 'mastercard') {
      setCardNumber('5502 0941 8492 1024');
      setExpiryDate('11/29');
      setCvv('842');
      setCardHolder(orderPayload.customerName || 'MARCELO SILVEIRA');
    } else if (presetBrand === 'visa') {
      setCardNumber('4111 1111 1111 4242');
      setExpiryDate('08/28');
      setCvv('123');
      setCardHolder(orderPayload.customerName || 'RODRIGO ALMEIDA');
    } else {
      setCardNumber('6363 6810 9481 9201');
      setExpiryDate('05/30');
      setCvv('991');
      setCardHolder(orderPayload.customerName || 'CAMILA CASTRO');
    }
  };

  // Process Card or Pix Payment
  const handleProcessPayment = async (overrideMethod?: 'pix' | 'credit_card' | 'debit_card') => {
    const methodToUse = overrideMethod || selectedMethod;

    // Basic Validations for Cards
    if (methodToUse === 'credit_card' || methodToUse === 'debit_card') {
      const cleanNumber = cardNumber.replace(/\D/g, '');
      if (cleanNumber.length < 13) {
        setErrorMessage('Por favor, informe o número completo do cartão (16 dígitos).');
        playBeep(300, 0.1);
        return;
      }
      if (!cardHolder.trim()) {
        setErrorMessage('Informe o nome impresso no cartão.');
        playBeep(300, 0.1);
        return;
      }
      if (expiryDate.length < 5) {
        setErrorMessage('Informe a validade do cartão no formato MM/AA.');
        playBeep(300, 0.1);
        return;
      }
      if (cvv.length < 3) {
        setErrorMessage('Informe o código de segurança (CVV de 3 ou 4 dígitos).');
        playBeep(300, 0.1);
        return;
      }
    }

    setErrorMessage(null);
    setStatus('processing');
    playBeep(850, 0.05);

    try {
      // Step-by-step interactive simulated gateway phases
      setProcessingStep('1. Criptografando transação com chave AES-256...');
      await new Promise((r) => setTimeout(r, 600));

      setProcessingStep('2. Validando Antifraude e Score de Risco...');
      await new Promise((r) => setTimeout(r, 700));

      setProcessingStep('3. Comunicando com Adquirente (Stone / Pagar.me)...');
      await new Promise((r) => setTimeout(r, 800));

      setProcessingStep('4. Autorizando e registrando baixa automática...');

      const result = await processGatewayPaymentAndClearOrder({
        orderPayload: effectivePayload,
        existingOrderId: existingOrder?.id,
        paymentMethod: methodToUse,
        cardDetails: {
          cardNumber,
          cardHolder,
          expiryDate,
          cvv,
          installments: methodToUse === 'credit_card' ? installments : 1,
          cpf,
        },
        pixTxId,
      });

      setCompletedOrder(result.order);
      setCompletedTx(result.transaction);
      setStatus('approved');

      // Notificação oficial de Webhook em tempo real
      if (setWebhookNotifications) {
        const webhookNotif = {
          id: `wh_gateway_${Date.now()}`,
          provider: 'mercadopago',
          eventType: 'payment.approved',
          title: `Gateway • Pedido ${result.order.displayCode} Pago (${methodToUse.toUpperCase()})`,
          message: `Pagamento de R$ ${result.order.total.toFixed(2)} liquidado via Gateway (NSU: ${result.transaction.nsu}, Aut: ${result.transaction.authCode}). Baixa automática via Webhook concluída!`,
          orderId: result.order.id,
          orderCode: result.order.displayCode,
          amount: result.order.total,
          timestamp: new Date().toISOString(),
          read: false,
        };
        setWebhookNotifications(prev => [webhookNotif, ...prev.slice(0, 49)]);
      }

      if (sendNewOrderPushAlert && !existingOrder) {
        sendNewOrderPushAlert({
          providerName: 'Gateway Pix / Cartão',
          orderCode: result.order.displayCode,
          customerName: result.order.customerName,
          total: result.order.total,
          itemCount: result.order.items.length,
        }).catch(e => console.warn('[Gateway Push]', e));
      }

      if (onPaymentSuccess) {
        onPaymentSuccess(result.order, result.transaction);
      }
    } catch (err: any) {
      console.error('[Gateway] Erro ao processar:', err);
      setStatus('declined');
      setErrorMessage(err?.message || 'A transação não pôde ser autorizada pela adquirente. Tente outro cartão.');
    }
  };

  // Simulate Instant Bank Webhook Clearing for Pix
  const handleSimulateBankConfirmation = async () => {
    setIsSimulatingBank(true);
    playBeep(950, 0.06);
    try {
      await paymentGatewayService.simulateBankClearing(pixTxId);
      await handleProcessPayment('pix');
    } finally {
      setIsSimulatingBank(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-xl bg-[#0E0E17] border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden text-white flex flex-col max-h-[92vh]"
      >
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-gradient-to-r from-zinc-950 via-[#12121E] to-zinc-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#00E676]/10 border border-[#00E676]/30 flex items-center justify-center text-[#00E676] shadow-[0_0_15px_rgba(0,230,118,0.2)]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Gateway de Pagamento Seguro
                </h3>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-400">
                  <Lock className="w-2.5 h-2.5" /> 256-bit SSL
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                {tenant?.name || 'Lanchonete Dulci'} • Baixa automática no Caixa e KDS
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* STATE: PROCESSING SPINNER */}
          {status === 'processing' && (
            <div className="py-12 px-4 text-center space-y-5">
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-zinc-800" />
                <div className="absolute inset-0 rounded-full border-4 border-t-[#00E676] border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                <div className="absolute inset-2 rounded-full bg-emerald-950/40 flex items-center justify-center">
                  <Lock className="w-6 h-6 text-[#00E676] animate-pulse" />
                </div>
              </div>

              <div className="space-y-1">
                <h4 className="text-lg font-black text-white">Processando com Gateway</h4>
                <p className="text-xs text-[#00E676] font-mono animate-pulse">{processingStep}</p>
                <p className="text-[11px] text-zinc-400 max-w-sm mx-auto pt-2">
                  Por favor, aguarde. Não feche esta janela enquanto conectamos à adquirente bancária.
                </p>
              </div>

              <div className="p-3 bg-zinc-900/90 border border-zinc-800 rounded-2xl max-w-xs mx-auto text-left text-xs space-y-1">
                <div className="flex justify-between text-zinc-400 text-[11px]">
                  <span>Total a Liquidar:</span>
                  <span className="font-bold text-white font-mono">{formatBRL(orderPayload.total)}</span>
                </div>
                <div className="flex justify-between text-zinc-400 text-[11px]">
                  <span>Forma:</span>
                  <span className="font-bold text-[#FFC72C]">
                    {selectedMethod === 'pix' ? 'Pix Instantâneo' : selectedMethod === 'credit_card' ? 'Cartão de Crédito' : 'Cartão de Débito'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STATE: APPROVED (BAIXA AUTOMÁTICA COMPROVADA) */}
          {status === 'approved' && completedTx && completedOrder && (
            <div className="space-y-5 py-2">
              {/* Green Success Badge */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/80 via-zinc-900 to-zinc-950 border-2 border-[#00E676] shadow-[0_0_30px_rgba(0,230,118,0.25)] text-center space-y-2">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-[#00E676] text-black flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Pagamento Aprovado com Sucesso!
                </h4>
                <p className="text-xs text-emerald-400 font-medium">
                  Transação liquidada • Pedido {completedOrder.displayCode} enviado para a Cozinha!
                </p>

                {/* Triple Automated Action Clearance Badges */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-3 text-left">
                  <div className="p-2.5 rounded-xl bg-zinc-950/90 border border-zinc-800 space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#00E676]">
                      <Check className="w-3.5 h-3.5" />
                      <span>Baixa no Pedido</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-tight">
                      Status marcado como <strong>PAGO</strong> e direcionado à esteira KDS.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-zinc-950/90 border border-zinc-800 space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#FFC72C]">
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>Baixa no Caixa</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-tight">
                      Lançado no Caixa Ativo e DRE Financeiro (Líquido: {formatBRL(completedTx.netAmount)}).
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-zinc-950/90 border border-zinc-800 space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-sky-400">
                      <Printer className="w-3.5 h-3.5" />
                      <span>Comanda Cozinha</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-tight">
                      Comanda térmica despachada via ESC/POS para produção.
                    </p>
                  </div>
                </div>
              </div>

              {/* Digital Transaction Voucher / Comprovante */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-zinc-400" />
                    <span className="font-bold text-zinc-200">Comprovante Digital Adquirente</span>
                  </div>
                  <span className="text-[10px] bg-zinc-900 border border-zinc-700 px-2 py-0.5 rounded text-[#FFC72C]">
                    AUTORIZADO
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-y-2 text-[11px]">
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Gateway Adquirente</span>
                    <span className="font-bold text-white">{completedTx.gatewayProvider}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Número da Autorização</span>
                    <span className="font-bold text-[#00E676]">{completedTx.authCode}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px]">NSU Host</span>
                    <span className="font-bold text-white">{completedTx.nsu}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px]">TID Adquirente</span>
                    <span className="font-bold text-white">{completedTx.tid}</span>
                  </div>
                  {completedTx.method !== 'pix' && completedTx.cardLast4 && (
                    <>
                      <div>
                        <span className="text-zinc-500 block text-[10px]">Cartão</span>
                        <span className="font-bold text-white">
                          {completedTx.brand?.toUpperCase()} •••• {completedTx.cardLast4}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block text-[10px]">Parcelamento</span>
                        <span className="font-bold text-white">{completedTx.installments}x</span>
                      </div>
                    </>
                  )}
                  {completedTx.method === 'pix' && completedTx.pixEndToEndId && (
                    <div className="col-span-2">
                      <span className="text-zinc-500 block text-[10px]">End-to-End ID (Bacen)</span>
                      <span className="font-bold text-zinc-300 break-all text-[10px]">
                        {completedTx.pixEndToEndId}
                      </span>
                    </div>
                  )}
                  <div className="col-span-2 pt-2 border-t border-zinc-900 flex justify-between items-center text-sm font-sans">
                    <span className="font-bold text-zinc-300">Valor Total Pago:</span>
                    <span className="font-black text-white text-base text-[#00E676]">
                      {formatBRL(completedTx.amount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `*Comprovante de Pagamento - ${tenant?.name || 'Lanchonete Dulci'}*\nPedido: ${completedOrder.displayCode}\nValor: ${formatBRL(completedTx.amount)}\nAutorização: ${completedTx.authCode}\nNSU: ${completedTx.nsu}\nStatus: PAGO COM SUCESSO`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-400 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Enviar Comprovante WhatsApp</span>
                </a>

                <button
                  onClick={onClose}
                  className="p-3 rounded-xl bg-gradient-to-r from-[#DA291C] to-[#B81F14] hover:brightness-110 text-white font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Concluir e Ver Pedido</span>
                </button>
              </div>
            </div>
          )}

          {/* STATE: DECLINED */}
          {status === 'declined' && (
            <div className="py-8 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-red-950/80 border border-red-500/40 text-red-400 flex items-center justify-center">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-black text-white">Transação Não Autorizada</h4>
                <p className="text-xs text-red-400 max-w-sm mx-auto">{errorMessage}</p>
              </div>
              <button
                onClick={() => setStatus('idle')}
                className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Tentar Novamente ou Mudar Forma
              </button>
            </div>
          )}

          {/* STATE: IDLE (FORM & METHOD SELECTOR) */}
          {status === 'idle' && (
            <div className="space-y-5">
              {/* Payment Method Tabs */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-zinc-950 border border-zinc-800 rounded-2xl">
                <button
                  type="button"
                  onClick={() => {
                    playBeep(650, 0.03);
                    setSelectedMethod('pix');
                  }}
                  className={`py-2.5 px-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    selectedMethod === 'pix'
                      ? 'bg-[#00E676] text-black shadow-[0_0_15px_rgba(0,230,118,0.3)]'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span>Pix Dinâmico</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playBeep(650, 0.03);
                    setSelectedMethod('credit_card');
                  }}
                  className={`py-2.5 px-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    selectedMethod === 'credit_card'
                      ? 'bg-gradient-to-r from-[#DA291C] to-[#B81F14] text-white shadow-[0_0_15px_rgba(218,41,28,0.3)]'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Cartão Crédito</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playBeep(650, 0.03);
                    setSelectedMethod('debit_card');
                  }}
                  className={`py-2.5 px-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    selectedMethod === 'debit_card'
                      ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Cartão Débito</span>
                </button>
              </div>

              {/* Order Summary Strip */}
              <div className="p-3 bg-zinc-950/80 border border-zinc-800/80 rounded-2xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-zinc-400 block text-[10px]">Cliente / Comanda:</span>
                  <span className="font-bold text-white">
                    {orderPayload.customerName} {orderPayload.tableNumber ? `(Mesa ${orderPayload.tableNumber})` : ''}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-zinc-400 block text-[10px]">Total a Liquidar:</span>
                  <span className="font-black text-base text-[#FFC72C] font-mono">
                    {formatBRL(orderPayload.total)}
                  </span>
                </div>
              </div>

              {/* TAB 1: PIX DINÂMICO */}
              {selectedMethod === 'pix' && (
                <div className="space-y-4">
                  {/* Dynamic QR Code & Timer Card */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-zinc-950 border border-zinc-800 text-center space-y-3">
                    <div className="flex items-center justify-between text-xs border-b border-zinc-900 pb-2">
                      <span className="flex items-center gap-1.5 text-zinc-400">
                        <Clock className="w-3.5 h-3.5 text-[#FFC72C]" />
                        <span>Expira em:</span>
                      </span>
                      <span className="font-black font-mono text-[#FFC72C] bg-amber-950/40 px-2 py-0.5 rounded-lg border border-amber-500/20">
                        {formattedCountdown}
                      </span>
                    </div>

                    {/* QR Code Container */}
                    <div className="relative inline-block p-3 rounded-2xl bg-white shadow-xl mx-auto">
                      {pixQrCodeUrl ? (
                        <img
                          src={pixQrCodeUrl}
                          alt="QR Code Pix"
                          className="w-44 h-44 sm:w-48 sm:h-48 object-contain mx-auto"
                        />
                      ) : (
                        <div className="w-44 h-44 flex items-center justify-center text-zinc-400 text-xs">
                          Gerando QR Code...
                        </div>
                      )}
                      <div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full bg-[#00E676] text-black font-black text-[9px] shadow font-mono">
                        PIX BACEN
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs font-bold text-white">Aponte a câmera do seu banco para pagar</p>
                      <p className="text-[11px] text-zinc-400">
                        Identificador da transação: <strong className="text-zinc-200 font-mono">{pixTxId}</strong>
                      </p>
                    </div>

                    {/* Pix Copia e Cola Button */}
                    <button
                      type="button"
                      onClick={handleCopyPix}
                      className={`w-full py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        isCopied
                          ? 'bg-emerald-950 border-emerald-500 text-emerald-300 shadow-[0_0_15px_rgba(0,230,118,0.2)]'
                          : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-white'
                      }`}
                    >
                      {isCopied ? <Check className="w-4 h-4 text-[#00E676]" /> : <Copy className="w-4 h-4 text-zinc-400" />}
                      <span>{isCopied ? 'Código Pix Copiado com Sucesso!' : 'Copiar Código Pix (Copia e Cola)'}</span>
                    </button>
                  </div>

                  {/* Beneficiary Details */}
                  <div className="p-3 bg-zinc-950/60 border border-zinc-800/80 rounded-2xl text-[11px] text-zinc-400 space-y-1">
                    <div className="flex justify-between">
                      <span>Beneficiário:</span>
                      <strong className="text-zinc-200">{tenant?.settings?.pixBeneficiaryName || tenant?.name}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Chave Pix:</span>
                      <span className="text-zinc-300 font-mono">{tenant?.settings?.pixKey || '38.492.011/0001-85'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cidade:</span>
                      <span className="text-zinc-300">{tenant?.settings?.pixCity || 'São Paulo'}</span>
                    </div>
                  </div>

                  {/* Live Webhook / Banco Simulation Button */}
                  <div className="p-3 rounded-2xl bg-emerald-950/30 border border-[#00E676]/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#00E676] animate-ping" />
                      <span className="text-zinc-300 text-[11px]">
                        Ouvindo confirmação bancária em tempo real...
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={isSimulatingBank}
                      onClick={handleSimulateBankConfirmation}
                      className="w-full sm:w-auto py-2 px-3 bg-[#00E676] hover:bg-[#00C853] text-black font-black rounded-xl text-[11px] transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>{isSimulatingBank ? 'Verificando...' : 'Simular Pix Pago no Banco'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2 & 3: CARTÃO DE CRÉDITO OU DÉBITO */}
              {(selectedMethod === 'credit_card' || selectedMethod === 'debit_card') && (
                <div className="space-y-4">
                  {/* Interactive Virtual Card Display */}
                  <div className="perspective-[1000px] w-full max-w-sm mx-auto">
                    <div
                      className={`relative w-full h-48 sm:h-52 rounded-2xl p-5 text-white transition-transform duration-500 transform-style-3d shadow-2xl border ${
                        selectedMethod === 'credit_card'
                          ? 'bg-gradient-to-tr from-[#1A0B0E] via-[#2A1116] to-[#40121A] border-red-500/30'
                          : 'bg-gradient-to-tr from-[#0B1220] via-[#101C33] to-[#16294A] border-blue-500/30'
                      } ${isCardFlipped ? 'rotate-y-180' : ''}`}
                    >
                      {/* CARD FRONT */}
                      {!isCardFlipped ? (
                        <div className="h-full flex flex-col justify-between">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {/* Chip */}
                              <div className="w-10 h-7 rounded-md bg-gradient-to-br from-amber-200 to-amber-500 border border-amber-600 shadow-inner flex items-center justify-center">
                                <div className="w-6 h-4 border border-amber-800/40 rounded-sm" />
                              </div>
                              {/* Contactless Icon */}
                              <RotateCw className="w-4 h-4 text-zinc-400 rotate-90 opacity-60" />
                            </div>

                            {/* Card Brand Badge */}
                            <div className="text-right">
                              <span className="text-[10px] font-mono tracking-widest text-zinc-400 block">
                                {selectedMethod === 'credit_card' ? 'CRÉDITO' : 'DÉBITO'}
                              </span>
                              <span className="font-black text-sm tracking-wider uppercase text-[#FFC72C]">
                                {detectedBrand !== 'unknown' ? detectedBrand : 'CARTÃO'}
                              </span>
                            </div>
                          </div>

                          {/* Card Number */}
                          <div className="py-2">
                            <p className="font-mono text-lg sm:text-xl tracking-[0.2em] font-bold drop-shadow-md">
                              {cardNumber ? formatCardNumber(cardNumber) : '•••• •••• •••• ••••'}
                            </p>
                          </div>

                          {/* Cardholder & Expiry */}
                          <div className="flex items-end justify-between text-xs">
                            <div className="max-w-[70%]">
                              <span className="text-[9px] text-zinc-400 uppercase tracking-wider block">
                                Titular do Cartão
                              </span>
                              <p className="font-bold uppercase truncate font-mono text-zinc-200 text-xs">
                                {cardHolder || 'NOME DO TITULAR'}
                              </p>
                            </div>
                            <div>
                              <span className="text-[9px] text-zinc-400 uppercase tracking-wider block">Validade</span>
                              <p className="font-bold font-mono text-zinc-200 text-xs">
                                {expiryDate || 'MM/AA'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* CARD BACK (CVV) */
                        <div className="h-full flex flex-col justify-between -rotate-y-180">
                          <div className="h-9 bg-black -mx-5 mt-2 shadow-inner" />
                          <div className="space-y-1">
                            <span className="text-[9px] text-zinc-400 uppercase tracking-wider block text-right pr-2">
                              CVV / CVC
                            </span>
                            <div className="bg-white text-black font-mono font-bold text-right px-3 py-1.5 rounded text-xs shadow-inner">
                              {cvv || '•••'}
                            </div>
                          </div>
                          <div className="text-[9px] text-zinc-400 text-center">
                            Autorização de segurança via Gateway Tokenizado SSL
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Fast Test Preset Buttons */}
                  <div className="flex items-center justify-center gap-2 text-[10px]">
                    <span className="text-zinc-500 font-bold">Preencher teste:</span>
                    <button
                      type="button"
                      onClick={() => handleFillTestCard('mastercard')}
                      className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg transition-colors cursor-pointer"
                    >
                      Mastercard
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFillTestCard('visa')}
                      className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg transition-colors cursor-pointer"
                    >
                      Visa
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFillTestCard('elo')}
                      className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg transition-colors cursor-pointer"
                    >
                      Elo
                    </button>
                  </div>

                  {/* Card Form Inputs */}
                  <div className="space-y-3">
                    {/* Card Number */}
                    <div>
                      <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                        Número do Cartão
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="0000 0000 0000 0000"
                          value={cardNumber}
                          maxLength={19}
                          onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                          onFocus={() => setIsCardFlipped(false)}
                          className="w-full p-3 pl-10 bg-zinc-950 border border-zinc-800 rounded-xl text-white font-mono text-sm placeholder-zinc-600 outline-none focus:border-[#FFC72C] transition-all"
                        />
                        <CreditCard className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
                        {detectedBrand !== 'unknown' && (
                          <span className="absolute right-3 top-3 text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-[#FFC72C] uppercase">
                            {detectedBrand}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Cardholder Name */}
                    <div>
                      <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                        Nome Impresso no Cartão
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: MARCELO A SILVEIRA"
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                        onFocus={() => setIsCardFlipped(false)}
                        className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs placeholder-zinc-600 outline-none focus:border-[#FFC72C] transition-all"
                      />
                    </div>

                    {/* Expiry, CVV and CPF Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                          Validade
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="MM/AA"
                          value={expiryDate}
                          maxLength={5}
                          onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
                          onFocus={() => setIsCardFlipped(false)}
                          className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white font-mono text-xs placeholder-zinc-600 outline-none focus:border-[#FFC72C] transition-all"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                          CVV
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="123"
                          value={cvv}
                          maxLength={4}
                          onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                          onFocus={() => setIsCardFlipped(true)}
                          onBlur={() => setIsCardFlipped(false)}
                          className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white font-mono text-xs placeholder-zinc-600 outline-none focus:border-[#FFC72C] transition-all"
                        />
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                          CPF do Titular
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="000.000.000-00"
                          value={cpf}
                          maxLength={14}
                          onChange={(e) => setCpf(formatCpf(e.target.value))}
                          onFocus={() => setIsCardFlipped(false)}
                          className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white font-mono text-xs placeholder-zinc-600 outline-none focus:border-[#FFC72C] transition-all"
                        />
                      </div>
                    </div>

                    {/* Installments Selector (Credit Card Only) */}
                    {selectedMethod === 'credit_card' && (
                      <div>
                        <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                          Parcelamento (Sem Juros até 3x)
                        </label>
                        <select
                          value={installments}
                          onChange={(e) => setInstallments(Number(e.target.value))}
                          className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs outline-none focus:border-[#FFC72C] cursor-pointer"
                        >
                          {installmentOptions.map((opt) => (
                            <option key={opt.installments} value={opt.installments}>
                              {opt.installments}x de {formatBRL(opt.monthlyAmount)}{' '}
                              {opt.hasInterest
                                ? `(${opt.interestRatePercent}% a.m. - Total: ${formatBRL(opt.totalAmount)})`
                                : '(Sem juros)'}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Error Notification */}
                  {errorMessage && (
                    <div className="p-3 bg-red-950/50 border border-red-500/40 rounded-xl text-xs text-red-300 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="button"
                    onClick={() => handleProcessPayment()}
                    className={`w-full py-3.5 px-4 font-black rounded-xl text-xs sm:text-sm transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer ${
                      selectedMethod === 'credit_card'
                        ? 'bg-gradient-to-r from-[#DA291C] to-[#B81F14] hover:brightness-110 active:scale-98 text-white shadow-red-950/50'
                        : 'bg-blue-600 hover:bg-blue-500 active:scale-98 text-white shadow-blue-950/50'
                    }`}
                  >
                    <Lock className="w-4 h-4" />
                    <span>
                      Pagar {formatBRL(orderPayload.total)} via{' '}
                      {selectedMethod === 'credit_card' ? 'Cartão de Crédito' : 'Cartão de Débito'}
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-3.5 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#00E676]" />
            <span>Transação 100% Criptografada • Stone / Pagar.me Gateway</span>
          </div>
          <span className="font-mono text-zinc-400">ID: {pixTxId}</span>
        </div>
      </motion.div>
    </div>
  );
};
