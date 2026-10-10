import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  QrCode, 
  Copy, 
  Check, 
  Sparkles, 
  Clock, 
  ShieldCheck, 
  Zap, 
  CheckCircle2, 
  ArrowRight, 
  MessageSquare, 
  CookingPot, 
  RefreshCw, 
  X, 
  ExternalLink, 
  Flame,
  Smartphone,
  Share2,
  AlertCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Order, OrderChannel, OrderItem, WebhookNotification } from '../types';
import { formatBRL } from '../utils/formatters';
import { playBeep, playCashRegister, playKitchenBell } from '../utils/audio';
import { generatePixPayload, getPixQrCodeUrl } from '../utils/pix';

export interface PixOrderPayload {
  customerName: string;
  customerPhone?: string;
  customerAddress?: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    zipCode: string;
    complement?: string;
  };
  tableNumber?: number;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  total: number;
  orderChannel: OrderChannel;
}

interface PixDynamicPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderPayload: PixOrderPayload;
  onPaymentConfirmed: (createdOrder: Order) => void;
  onNavigateToKDS?: () => void;
  readingMode?: boolean;
}

type PaymentStep = 'waiting' | 'verifying' | 'confirmed' | 'expired';

export const PixDynamicPaymentModal: React.FC<PixDynamicPaymentModalProps> = ({
  isOpen,
  onClose,
  orderPayload,
  onPaymentConfirmed,
  onNavigateToKDS,
  readingMode = false,
}) => {
  const { tenant, createOrder, setWebhookNotifications, sendNewOrderPushAlert } = useApp();

  // Step state
  const [paymentStep, setPaymentStep] = useState<PaymentStep>('waiting');
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

  // 15-minute countdown (900 seconds)
  const [timeLeft, setTimeLeft] = useState<number>(900);
  
  // Auto-simulation toggle (enabled by default for intuitive live testing in preview)
  const [autoSimulateSeconds, setAutoSimulateSeconds] = useState<number>(8);
  const [isAutoSimulateActive, setIsAutoSimulateActive] = useState<boolean>(true);

  // Unique TxID for this Pix transaction
  const txId = useMemo(() => {
    return 'PED' + Math.floor(1000 + Math.random() * 9000);
  }, [isOpen]);

  // Generated End-to-End ID upon confirmation
  const [endToEndId, setEndToEndId] = useState<string>('');

  // Generate dynamic Pix EMVCo payload
  const pixPayload = useMemo(() => {
    const key = tenant?.settings?.pixKey || '38492011000185';
    const keyType = tenant?.settings?.pixKeyType || 'cnpj';
    const merchantName = tenant?.settings?.pixBeneficiaryName || tenant?.name || 'Lanchonete Dulci';
    const merchantCity = tenant?.settings?.pixCity || 'SAO PAULO';

    return generatePixPayload({
      pixKey: key,
      pixKeyType: keyType,
      merchantName,
      merchantCity,
      amount: orderPayload.total > 0 ? orderPayload.total : undefined,
      txId: txId,
      description: `Pedido ${txId} ${orderPayload.customerName || 'Cliente'}`.slice(0, 40),
    });
  }, [tenant, orderPayload.total, txId, orderPayload.customerName]);

  // QR Code URL image
  const qrCodeUrl = useMemo(() => {
    return getPixQrCodeUrl(pixPayload, 280);
  }, [pixPayload]);

  // Reset states on open
  useEffect(() => {
    if (isOpen) {
      setPaymentStep('waiting');
      setTimeLeft(900);
      setCopiedPayload(false);
      setCreatedOrder(null);
      setAutoSimulateSeconds(8);
      setIsAutoSimulateActive(true);
    }
  }, [isOpen]);

  // Countdown timer effect
  useEffect(() => {
    if (!isOpen || paymentStep !== 'waiting') return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setPaymentStep('expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, paymentStep]);

  // Auto-simulation countdown for demo
  useEffect(() => {
    if (!isOpen || paymentStep !== 'waiting' || !isAutoSimulateActive) return;

    const timer = setInterval(() => {
      setAutoSimulateSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          triggerConfirmPayment();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, paymentStep, isAutoSimulateActive]);

  // Trigger Confirmation (Webhook Simulation or Bank Confirmation)
  const triggerConfirmPayment = () => {
    if (paymentStep === 'confirmed' || paymentStep === 'verifying') return;

    setPaymentStep('verifying');
    playBeep(880, 0.05);

    // Create unique End-to-End Pix ID (Padrão Banco Central: E + ISPB + Timestamp + Random)
    const generatedE2E = `E38492011${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    setEndToEndId(generatedE2E);

    setTimeout(() => {
      // 1. Create order in context with status: 'preparing' (immediately ready for KDS kitchen!)
      const newOrder = createOrder({
        channel: orderPayload.orderChannel,
        status: 'preparing', // Atualiza automaticamente para em preparo no KDS!
        customerName: orderPayload.customerName || 'Cliente Pix',
        customerPhone: orderPayload.customerPhone,
        customerAddress: orderPayload.customerAddress,
        tableNumber: orderPayload.tableNumber,
        items: orderPayload.items,
        subtotal: orderPayload.subtotal,
        discount: 0,
        deliveryFee: orderPayload.deliveryFee,
        serviceFee: orderPayload.serviceFee,
        total: orderPayload.total,
        paymentMethod: 'pix',
        paymentStatus: 'paid', // Status Pago
        paidAmount: orderPayload.total,
        pixTxId: txId,
        pixEndToEndId: generatedE2E,
        pixPaidAt: new Date().toISOString(),
      });

      setCreatedOrder(newOrder);
      setPaymentStep('confirmed');

      // 2. Audio & Visual celebrations
      playCashRegister();
      setTimeout(() => playKitchenBell(), 300);

      // 3. Register real-time webhook notification
      const webhookNotif: WebhookNotification = {
        id: `wh_pix_${Date.now()}`,
        provider: 'mercadopago',
        eventType: 'payment.approved',
        title: `Pix Instantâneo • Pedido #${newOrder.orderNumber} Aprovado!`,
        message: `Pagamento de R$ ${newOrder.total.toFixed(2)} liquidado via Pix (${txId}) para ${tenant.name}. Enviado diretamente ao KDS!`,
        orderId: newOrder.id,
        orderCode: newOrder.displayCode,
        amount: newOrder.total,
        timestamp: new Date().toISOString(),
        read: false,
      };
      setWebhookNotifications((prev) => [webhookNotif, ...prev.slice(0, 49)]);

      // 4. Send push notification if permitted
      if (sendNewOrderPushAlert) {
        sendNewOrderPushAlert({
          providerName: 'Pix Dinâmico (Banco Central)',
          orderCode: newOrder.displayCode,
          customerName: newOrder.customerName,
          total: newOrder.total,
          itemCount: newOrder.items.length,
        }).catch((e) => console.warn('[Pix Push]', e));
      }

      // 5. Notify parent callback
      onPaymentConfirmed(newOrder);
    }, 1200);
  };

  // Copy Pix Copia e Cola
  const handleCopyPayload = () => {
    playBeep(900, 0.04);
    navigator.clipboard.writeText(pixPayload);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2500);
  };

  // WhatsApp formatted receipt
  const handleShareWhatsApp = () => {
    if (!createdOrder) return;
    playBeep(880, 0.04);

    const text = encodeURIComponent(
      `✅ *COMPROVANTE DE PAGAMENTO PIX - ${tenant.name.toUpperCase()}*\n\n` +
      `📦 *Pedido:* #${createdOrder.orderNumber} (${createdOrder.displayCode})\n` +
      `👤 *Cliente:* ${createdOrder.customerName}\n` +
      `💰 *Valor Pago:* ${formatBRL(createdOrder.total)}\n` +
      `⚡ *Forma de Pagamento:* Pix Dinâmico Instantâneo\n` +
      `🆔 *ID da Transação (TxID):* ${txId}\n` +
      `🔒 *End-to-End ID:* ${endToEndId}\n` +
      `🍳 *Status:* EM PREPARO NA COZINHA\n\n` +
      `Obrigado pela preferência!`
    );

    const phone = createdOrder.customerPhone ? createdOrder.customerPhone.replace(/\D/g, '') : '';
    const waUrl = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(waUrl, '_blank');
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 25 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 25 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={`w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border my-auto transition-all relative ${
            readingMode
              ? 'bg-white border-2 border-zinc-400 text-zinc-950 shadow-zinc-400/50'
              : 'bg-[#12121A] border-[#2A2A40] text-white shadow-[0_0_60px_rgba(0,230,118,0.2)] ring-1 ring-white/10'
          }`}
        >
          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className={`absolute top-4 right-4 p-2 rounded-full z-10 transition-all cursor-pointer ${
              readingMode
                ? 'bg-zinc-200 hover:bg-zinc-300 text-zinc-800'
                : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white'
            }`}
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>

          {/* =========================================================
              VIEW 1: AGUARDANDO PAGAMENTO (WAITING & VERIFYING)
             ========================================================= */}
          {paymentStep !== 'confirmed' && paymentStep !== 'expired' && (
            <div className="p-5 sm:p-7 space-y-5">
              {/* Header */}
              <div className="text-center space-y-1.5 pt-1">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-sm">
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Pix Dinâmico Instantâneo</span>
                </div>
                <h3 className={`text-xl sm:text-2xl font-black tracking-tight ${
                  readingMode ? 'text-zinc-950' : 'text-white'
                }`}>
                  Pague e Acompanhe o Pedido
                </h3>
                <p className={`text-xs ${readingMode ? 'text-zinc-700' : 'text-zinc-400'}`}>
                  Escaneie o QR Code no app do seu banco. O status na cozinha será atualizado instantaneamente!
                </p>
              </div>

              {/* QR Code and Total Showcase */}
              <div className={`p-5 rounded-2xl border flex flex-col items-center justify-center space-y-3 relative shadow-inner ${
                readingMode
                  ? 'bg-amber-50/60 border-amber-200'
                  : 'bg-[#0B0B10] border-zinc-800/90'
              }`}>
                {/* QR Code Box */}
                <div className="relative p-3 bg-white rounded-2xl shadow-xl border-4 border-zinc-800 group">
                  <img
                    src={qrCodeUrl}
                    alt="QR Code Pix Dinâmico"
                    className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
                    crossOrigin="anonymous"
                  />
                  {/* Radar Scanning Line Animation */}
                  {paymentStep === 'waiting' && (
                    <motion.div
                      className="absolute left-3 right-3 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#00E676]"
                      animate={{ top: ['12px', 'calc(100% - 16px)', '12px'] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  )}
                  {paymentStep === 'verifying' && (
                    <div className="absolute inset-0 bg-black/60 rounded-xl backdrop-blur-xs flex flex-col items-center justify-center text-white gap-2">
                      <RefreshCw className="w-8 h-8 text-[#00E676] animate-spin" />
                      <span className="text-xs font-black">Validando Pix...</span>
                    </div>
                  )}
                </div>

                {/* Amount Display */}
                <div className="text-center space-y-0.5">
                  <span className={`text-[10px] uppercase font-bold tracking-wider ${
                    readingMode ? 'text-zinc-600' : 'text-zinc-400'
                  }`}>
                    Valor Exato com Centavos
                  </span>
                  <div className="text-3xl sm:text-4xl font-black font-mono text-[#FFC72C] drop-shadow-[0_2px_12px_rgba(255,199,44,0.3)]">
                    {formatBRL(orderPayload.total)}
                  </div>
                </div>

                {/* Expiration Timer & TxID Badge */}
                <div className="flex items-center gap-3 text-xs font-mono font-bold">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Expira em {formatTimer(timeLeft)}</span>
                  </div>
                  <div className="px-2.5 py-1 rounded-lg bg-zinc-800/80 border border-zinc-700 text-zinc-300">
                    <span>TxID: {txId}</span>
                  </div>
                </div>
              </div>

              {/* Pix Copia e Cola Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className={readingMode ? 'text-zinc-800' : 'text-zinc-400'}>
                    Código Pix Copia e Cola (EMV)
                  </span>
                  <span className="text-emerald-500 font-mono text-[10px]">
                    Padrão Banco Central
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className={`flex-1 p-2.5 rounded-xl border text-[11px] font-mono truncate select-all ${
                    readingMode
                      ? 'bg-zinc-100 border-zinc-300 text-zinc-800'
                      : 'bg-black/60 border-zinc-800 text-zinc-300'
                  }`}>
                    {pixPayload}
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyPayload}
                    className={`px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 active:scale-95 shadow-md ${
                      copiedPayload
                        ? 'bg-emerald-500 text-black font-black'
                        : readingMode
                        ? 'bg-zinc-900 hover:bg-black text-white'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                    }`}
                  >
                    {copiedPayload ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Status Machine Timeline */}
              <div className={`p-3.5 rounded-2xl border space-y-2.5 ${
                readingMode ? 'bg-zinc-50 border-zinc-300' : 'bg-[#151522] border-zinc-800/90'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                    readingMode ? 'text-zinc-800' : 'text-zinc-300'
                  }`}>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span>Conexão em Tempo Real com a Cozinha</span>
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    Atualização 2s
                  </span>
                </div>

                {/* Progress Steps */}
                <div className="grid grid-cols-3 gap-1.5 text-[10px] text-center font-bold">
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center gap-1">
                    <Check className="w-3 h-3 stroke-[3]" />
                    <span>QR Emitido</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center gap-1 animate-pulse">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Aguardando Banco</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-zinc-800 text-zinc-500 border border-zinc-700/50 flex items-center justify-center gap-1">
                    <CookingPot className="w-3 h-3" />
                    <span>Cozinha</span>
                  </div>
                </div>
              </div>

              {/* Webhook Instant Simulator Action (Crucial for Live Demo / Testing) */}
              <div className="space-y-2.5 pt-1">
                <button
                  type="button"
                  onClick={triggerConfirmPayment}
                  disabled={paymentStep === 'verifying'}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#00E676] via-emerald-400 to-[#00C853] hover:brightness-110 active:scale-98 text-[#09090D] font-black text-xs sm:text-sm transition-all shadow-[0_0_25px_rgba(0,230,118,0.4)] flex items-center justify-center gap-2 cursor-pointer border border-emerald-300"
                >
                  <Zap className="w-4 h-4 fill-black" />
                  <span>Simular Pagamento Bancário Instantâneo (Webhook)</span>
                </button>

                {/* Auto simulation countdown indicator */}
                {isAutoSimulateActive && autoSimulateSeconds > 0 && (
                  <div className="flex items-center justify-between px-2 text-[11px] text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#FFC72C]" />
                      <span>Auto-confirmação para teste em: <strong className="text-white font-mono">{autoSimulateSeconds}s</strong></span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAutoSimulateActive(false)}
                      className="text-[10px] text-zinc-400 hover:text-white underline cursor-pointer"
                    >
                      Pausar
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =========================================================
              VIEW 2: PAGAMENTO CONFIRMADO & KDS ATUALIZADO
             ========================================================= */}
          {paymentStep === 'confirmed' && createdOrder && (
            <div className="p-6 sm:p-8 space-y-6 text-center">
              {/* Animated Success Badge */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 14, stiffness: 220 }}
                className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#00E676] to-[#00C853] text-[#0B0B0F] flex items-center justify-center mx-auto shadow-[0_0_35px_rgba(0,230,118,0.6)] border-4 border-emerald-300"
              >
                <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
              </motion.div>

              {/* Success Heading */}
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-black uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Liquidação Instantânea Banco Central</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Pagamento Pix Confirmado!
                </h3>
                <p className="text-xs text-zinc-300 max-w-sm mx-auto">
                  O pedido <strong className="text-[#FFC72C] font-mono">#{createdOrder.orderNumber}</strong> foi creditado e <span className="text-emerald-400 font-bold">enviado automaticamente para a fila de preparo da cozinha</span>!
                </p>
              </div>

              {/* Order & Kitchen Ticket Card */}
              <div className={`p-4 rounded-2xl border text-left space-y-3 ${
                readingMode
                  ? 'bg-zinc-50 border-zinc-300 text-zinc-900'
                  : 'bg-[#151522] border-zinc-800 text-zinc-100 shadow-inner'
              }`}>
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
                  <div>
                    <span className="text-xs text-zinc-400 block font-bold">Código do Pedido</span>
                    <span className="text-lg font-black font-mono text-[#FFC72C]">
                      {createdOrder.displayCode}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-zinc-400 block font-bold">Status na Cozinha</span>
                    <span className="px-2.5 py-1 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-black flex items-center gap-1">
                      <CookingPot className="w-3.5 h-3.5" />
                      <span>Em Preparo (Ativo)</span>
                    </span>
                  </div>
                </div>

                {/* Items Summary */}
                <div className="space-y-1 py-1 text-xs">
                  <div className="flex justify-between font-bold text-zinc-400 text-[11px]">
                    <span>Itens do Pedido ({createdOrder.items.length})</span>
                    <span>Total: {formatBRL(createdOrder.total)}</span>
                  </div>
                  <div className="space-y-1 max-h-24 overflow-y-auto pr-1 scrollbar-thin">
                    {createdOrder.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between text-[11px] text-zinc-300">
                        <span className="truncate">{it.quantity}x {it.productName}</span>
                        <span className="font-mono text-zinc-400">{formatBRL(it.totalPrice)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Security Audit Details */}
                <div className="pt-2 border-t border-zinc-800/80 text-[10px] text-zinc-500 space-y-0.5 font-mono">
                  <div className="truncate">
                    <strong>EndToEnd ID:</strong> {endToEndId}
                  </div>
                  <div>
                    <strong>Data/Hora:</strong> {new Date().toLocaleTimeString('pt-BR')}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-2">
                {onNavigateToKDS && (
                  <button
                    type="button"
                    onClick={() => {
                      playBeep(900, 0.05);
                      onClose();
                      onNavigateToKDS();
                    }}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#DA291C] hover:brightness-110 active:scale-95 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-950/50 cursor-pointer transition-all"
                  >
                    <CookingPot className="w-4 h-4 text-[#FFC72C]" />
                    <span>Ver Pedido na Cozinha</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    className="py-3 px-3 rounded-xl bg-[#25D366]/20 hover:bg-[#25D366]/30 border border-[#25D366]/40 text-[#25D366] font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Enviar Comprovante</span>
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="py-3 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Concluir</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              VIEW 3: EXPIRADO
             ========================================================= */}
          {paymentStep === 'expired' && (
            <div className="p-8 text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-500 border border-red-500/30 flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black text-white">QR Code Expirado</h3>
                <p className="text-xs text-zinc-400">
                  O tempo de 15 minutos para pagamento deste QR Code foi excedido.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTimeLeft(900);
                  setPaymentStep('waiting');
                }}
                className="w-full py-3 rounded-xl bg-[#DA291C] hover:bg-red-700 text-white font-bold text-xs cursor-pointer transition-all"
              >
                Gerar Novo QR Code Pix
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
