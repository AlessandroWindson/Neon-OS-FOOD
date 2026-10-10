import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CreditCard, 
  QrCode, 
  Smartphone, 
  Wifi, 
  Battery, 
  CheckCircle2, 
  AlertCircle, 
  Printer, 
  X, 
  RefreshCw, 
  Check, 
  Zap, 
  ShieldCheck, 
  Receipt,
  RotateCcw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '../context/AppContext';
import { PaymentTerminal } from '../types';
import { formatBRL, formatDateTime } from '../utils/formatters';
import { playBeep, playCashRegister } from '../utils/audio';

export interface SmartPOSPaymentTarget {
  type: 'mesa' | 'comanda' | 'pdv';
  id: string | number;
  title: string; // Ex: 'Mesa 04' ou 'Comanda #102'
  amount: number;
  customerName?: string;
  waiterName?: string;
  itemsCount?: number;
}

interface SmartPOSPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: SmartPOSPaymentTarget | null;
  onPaymentApproved: (result: {
    method: 'credit' | 'debit' | 'pix' | 'voucher';
    brand: string;
    nsu: string;
    tid: string;
    authCode: string;
    terminalName: string;
    amount: number;
  }) => void;
}

export const SmartPOSPaymentModal: React.FC<SmartPOSPaymentModalProps> = ({
  isOpen,
  onClose,
  target,
  onPaymentApproved,
}) => {
  const { setPrintOrder, tenant } = useApp();

  // Pre-configured Smart POS terminals
  const [terminals] = useState<PaymentTerminal[]>([
    {
      id: 'term_01',
      name: 'Smart POS 01 - Salão Principal',
      model: 'Pax A910 Smart 4G',
      provider: 'stone',
      serialNumber: 'SN-948201-BR',
      status: 'online',
      batteryLevel: 88,
      signalStrength: 5,
      assignedZone: 'Salão Principal',
      assignedWaiter: 'Atendente Salão',
      supportedMethods: ['credit', 'debit', 'pix', 'voucher'],
    },
    {
      id: 'term_02',
      name: 'Smart POS 02 - Bar & Varanda',
      model: 'Cielo LIO V3 Smart',
      provider: 'cielo',
      serialNumber: 'SN-381029-BR',
      status: 'online',
      batteryLevel: 94,
      signalStrength: 4,
      assignedZone: 'Área Externa & Bar',
      assignedWaiter: 'Atendente Bar',
      supportedMethods: ['credit', 'debit', 'pix', 'voucher'],
    },
    {
      id: 'term_03',
      name: 'Smart POS 03 - Balcão / Caixa Central',
      model: 'PagBank Pro Smart Touch',
      provider: 'pagbank',
      serialNumber: 'SN-102948-BR',
      status: 'online',
      batteryLevel: 100,
      signalStrength: 5,
      assignedZone: 'Balcão / Caixa',
      supportedMethods: ['credit', 'debit', 'pix', 'voucher'],
    },
    {
      id: 'term_04',
      name: 'Smart POS 04 - Móvel Atendente Lucas',
      model: 'Gertec GPOS700 Pro',
      provider: 'rede',
      serialNumber: 'SN-772910-BR',
      status: 'online',
      batteryLevel: 72,
      signalStrength: 4,
      assignedWaiter: 'Lucas Atendente',
      supportedMethods: ['credit', 'debit', 'pix'],
    },
  ]);

  const [selectedTerminalId, setSelectedTerminalId] = useState<string>('term_01');
  const [paymentMethod, setPaymentMethod] = useState<'credit' | 'debit' | 'pix' | 'voucher'>('credit');
  const [installments, setInstallments] = useState<number>(1);
  const [includeServiceFee, setIncludeServiceFee] = useState<boolean>(true);

  // Terminal Transaction Lifecycle
  const [step, setStep] = useState<'config' | 'sending' | 'waiting_card' | 'authorizing' | 'approved' | 'failed'>('config');
  const [approvedDetails, setApprovedDetails] = useState<{
    brand: string;
    nsu: string;
    tid: string;
    authCode: string;
    timestamp: string;
    amount: number;
    terminalName: string;
  } | null>(null);

  // Reset modal state on open
  useEffect(() => {
    if (isOpen) {
      setStep('config');
      setApprovedDetails(null);
      setPaymentMethod('credit');
      setInstallments(1);
    }
  }, [isOpen]);

  if (!isOpen || !target) return null;

  const selectedTerminal = terminals.find(t => t.id === selectedTerminalId) || terminals[0];

  const baseAmount = target.amount;
  const serviceAmount = includeServiceFee ? baseAmount * 0.1 : 0;
  const totalAmount = Number((baseAmount + serviceAmount).toFixed(2));

  // Send transaction to Smart POS Terminal
  const handleSendToTerminal = () => {
    playBeep(980, 0.05);
    setStep('sending');

    setTimeout(() => {
      setStep('waiting_card');
      playBeep(1200, 0.08);
    }, 1200);
  };

  // Simulate customer customer tapping card, inserting chip, or scanning Pix
  const handleSimulateCustomerPayment = () => {
    playBeep(850, 0.04);
    setStep('authorizing');

    setTimeout(() => {
      // Generated TEF details
      const brands = paymentMethod === 'pix' 
        ? ['Pix Banco Central'] 
        : paymentMethod === 'debit' 
        ? ['Mastercard Débito', 'Visa Electron', 'Elo Débito'] 
        : ['Mastercard Black', 'Visa Platinum', 'Elo Nanquim'];
      
      const brandChosen = brands[Math.floor(Math.random() * brands.length)];
      const nsu = Math.floor(10000000 + Math.random() * 90000000).toString();
      const tid = Math.floor(100000000000 + Math.random() * 900000000000).toString();
      const authCode = `AUT${Math.floor(100000 + Math.random() * 900000)}`;

      const result = {
        brand: brandChosen,
        nsu,
        tid,
        authCode,
        timestamp: new Date().toISOString(),
        amount: totalAmount,
        terminalName: selectedTerminal.name,
      };

      setApprovedDetails(result);
      setStep('approved');
      playCashRegister();

      try {
        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#00D26A', '#FFC72C', '#DA291C']
        });
      } catch (e) {}

      // Trigger callback to finalize mesa / comanda in parent component
      onPaymentApproved({
        method: paymentMethod,
        brand: brandChosen,
        nsu,
        tid,
        authCode,
        terminalName: selectedTerminal.name,
        amount: totalAmount,
      });
    }, 1600);
  };

  // Print TEF receipt directly on thermal printer
  const handlePrintTEFReceipt = () => {
    if (!approvedDetails) return;
    setPrintOrder({
      id: `tef_${Date.now()}`,
      orderNumber: Number(String(target.id).replace(/\D/g, '')) || 101,
      displayCode: `TEF #${approvedDetails.authCode}`,
      tenantId: 'tenant_01',
      branchId: 'branch_01',
      channel: target.type === 'mesa' ? 'mesa' : 'comanda',
      status: 'completed',
      customerName: target.customerName || `${target.title} (Cartão/Pix)`,
      tableNumber: target.type === 'mesa' ? Number(target.id) : undefined,
      items: [
        {
          id: 'tef_item_1',
          productId: 'prod_tef',
          productName: `Liquidação ${target.title} (${approvedDetails.brand})`,
          quantity: 1,
          unitPrice: totalAmount,
          totalPrice: totalAmount,
          station: 'assembly',
          status: 'ready'
        }
      ],
      subtotal: baseAmount,
      serviceFee: serviceAmount,
      discount: 0,
      deliveryFee: 0,
      total: totalAmount,
      paymentMethod: paymentMethod === 'pix' ? 'pix' : paymentMethod === 'debit' ? 'debit_card' : 'credit_card',
      paymentStatus: 'paid',
      createdAt: approvedDetails.timestamp,
      updatedAt: approvedDetails.timestamp,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 select-none">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-[#101018] border border-[#242436] rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl relative flex flex-col max-h-[92vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1E1E2C] pb-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#DA291C] to-[#FF7A00] flex items-center justify-center text-[#FFC72C] shadow-[0_0_12px_rgba(218,41,28,0.4)]">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">Maquininha Smart POS</h3>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  TEF Direto
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Cobrança de <strong className="text-white">{target.title}</strong> via terminal integrado
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-[#1A1A26] text-zinc-400 hover:text-white hover:bg-[#262638] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP 1: CONFIGURATION */}
        {step === 'config' && (
          <div className="space-y-4">
            {/* Amount Summary Card */}
            <div className="p-4 rounded-2xl bg-[#141420] border border-[#222234] space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Consumo Original:</span>
                <span className="font-mono text-zinc-200 font-bold">{formatBRL(baseAmount)}</span>
              </div>

              <div className="flex items-center justify-between text-xs text-zinc-400">
                <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                  <input
                    type="checkbox"
                    checked={includeServiceFee}
                    onChange={e => setIncludeServiceFee(e.target.checked)}
                    className="rounded accent-[#DA291C]"
                  />
                  <span>Taxa de Atendimento do Salão (10%)</span>
                </label>
                <span className="font-mono text-zinc-200 font-bold">
                  {formatBRL(serviceAmount)}
                </span>
              </div>

              <div className="pt-2 border-t border-[#1E1E2C] flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-zinc-400 uppercase font-bold">Total a Cobrar na Maquininha</div>
                  <div className="text-2xl font-black text-[#00D26A] font-mono">
                    {formatBRL(totalAmount)}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-[#FFC72C] bg-[#FFC72C]/10 border border-[#FFC72C]/25 px-2 py-0.5 rounded font-bold">
                    {target.title}
                  </span>
                </div>
              </div>
            </div>

            {/* Select Target Smart POS */}
            <div>
              <label className="block text-[11px] font-black uppercase text-zinc-400 mb-1.5">
                1. Selecione a Maquininha de Cartão
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {terminals.map(term => {
                  const isSelected = selectedTerminalId === term.id;
                  return (
                    <button
                      key={term.id}
                      type="button"
                      onClick={() => {
                        setSelectedTerminalId(term.id);
                        playBeep(850, 0.02);
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                        isSelected 
                          ? 'bg-[#DA291C]/15 border-[#DA291C] text-white shadow-[0_0_12px_rgba(218,41,28,0.25)]' 
                          : 'bg-[#141420] border-[#222234] text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs truncate max-w-[140px]">{term.name}</span>
                        <span className="flex items-center gap-1 text-[9px] text-emerald-400 font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Pronta
                        </span>
                      </div>
                      <div className="text-[10px] text-zinc-400 flex items-center justify-between">
                        <span>{term.model}</span>
                        <span className="flex items-center gap-1 text-zinc-400">
                          <Battery className="w-3 h-3 text-emerald-400" />
                          {term.batteryLevel}%
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Select Payment Method */}
            <div>
              <label className="block text-[11px] font-black uppercase text-zinc-400 mb-1.5">
                2. Modalidade no Terminal
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('credit');
                    playBeep(850, 0.02);
                  }}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                    paymentMethod === 'credit'
                      ? 'bg-[#DA291C]/15 border-[#DA291C] text-[#FFC72C] font-black shadow-[0_0_10px_rgba(218,41,28,0.25)]'
                      : 'bg-[#141420] border-[#222234] text-zinc-400 hover:text-white'
                  }`}
                >
                  <CreditCard className="w-5 h-5 mx-auto mb-1 text-[#FFC72C]" />
                  <div className="text-xs font-bold">Crédito</div>
                  <div className="text-[9px] text-zinc-400">À vista / Parc.</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('debit');
                    playBeep(850, 0.02);
                  }}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                    paymentMethod === 'debit'
                      ? 'bg-[#00B8FF]/15 border-[#00B8FF] text-[#00B8FF] font-black shadow-[0_0_10px_rgba(0,184,255,0.25)]'
                      : 'bg-[#141420] border-[#222234] text-zinc-400 hover:text-white'
                  }`}
                >
                  <CreditCard className="w-5 h-5 mx-auto mb-1 text-[#00B8FF]" />
                  <div className="text-xs font-bold">Débito</div>
                  <div className="text-[9px] text-zinc-400">À vista</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('pix');
                    playBeep(850, 0.02);
                  }}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                    paymentMethod === 'pix'
                      ? 'bg-[#00D26A]/15 border-[#00D26A] text-[#00D26A] font-black shadow-[0_0_10px_rgba(0,210,106,0.25)]'
                      : 'bg-[#141420] border-[#222234] text-zinc-400 hover:text-white'
                  }`}
                >
                  <QrCode className="w-5 h-5 mx-auto mb-1 text-[#00D26A]" />
                  <div className="text-xs font-bold">Pix Terminal</div>
                  <div className="text-[9px] text-zinc-400">QR no visor</div>
                </button>
              </div>

              {/* Installments selector if credit */}
              {paymentMethod === 'credit' && (
                <div className="mt-2.5 p-2 rounded-xl bg-[#141420] border border-[#222234] flex items-center justify-between text-xs">
                  <span className="text-zinc-400 font-bold">Parcelamento:</span>
                  <select
                    value={installments}
                    onChange={e => setInstallments(Number(e.target.value))}
                    className="bg-[#1C1C2A] border border-[#2E2E42] rounded-lg px-2.5 py-1 text-xs text-white font-bold focus:outline-none"
                  >
                    <option value={1}>1x de {formatBRL(totalAmount)} (À Vista)</option>
                    <option value={2}>2x de {formatBRL(totalAmount / 2)}</option>
                    <option value={3}>3x de {formatBRL(totalAmount / 3)}</option>
                    <option value={4}>4x de {formatBRL(totalAmount / 4)}</option>
                    <option value={6}>6x de {formatBRL(totalAmount / 6)}</option>
                  </select>
                </div>
              )}
            </div>

            {/* Action button */}
            <button
              onClick={handleSendToTerminal}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#DA291C] to-[#FF7A00] hover:brightness-110 active:scale-[0.99] text-white font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(218,41,28,0.4)] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4 text-[#FFC72C]" />
              <span>Lançar {formatBRL(totalAmount)} no {selectedTerminal.name.split('-')[0]}</span>
            </button>
          </div>
        )}

        {/* STEP 2: SENDING / WAITING FOR CARD OR PIX INTERACTION */}
        {(step === 'sending' || step === 'waiting_card' || step === 'authorizing') && (
          <div className="py-6 space-y-6 flex flex-col items-center justify-center text-center">
            {/* Realistic Simulated Smart POS Terminal Device */}
            <div className="w-64 bg-[#0A0A0E] border-2 border-[#333348] rounded-3xl p-4 shadow-2xl relative overflow-hidden">
              {/* Terminal Bezel Top Bar */}
              <div className="flex items-center justify-between text-[9px] text-zinc-500 pb-2 border-b border-zinc-800 font-mono">
                <span className="flex items-center gap-1 text-emerald-400">
                  <Wifi className="w-2.5 h-2.5" /> 4G LTE
                </span>
                <span className="font-bold text-zinc-400">{tenant.name.toUpperCase()}</span>
                <span className="flex items-center gap-0.5">
                  <Battery className="w-2.5 h-2.5 text-emerald-400" /> {selectedTerminal.batteryLevel}%
                </span>
              </div>

              {/* Terminal Screen Glass */}
              <div className="my-3 py-4 px-3 bg-[#0F0F16] rounded-2xl border border-zinc-800 flex flex-col items-center justify-center min-h-[160px] space-y-2 relative">
                {step === 'sending' && (
                  <div className="space-y-2">
                    <RefreshCw className="w-7 h-7 text-[#FFC72C] animate-spin mx-auto" />
                    <div className="text-xs font-bold text-white">Sincronizando com o Sistema...</div>
                    <div className="text-[10px] text-zinc-400">{target.title}</div>
                  </div>
                )}

                {step === 'waiting_card' && (
                  <div className="space-y-2 w-full">
                    <div className="text-[10px] uppercase font-mono text-zinc-400 tracking-wider">
                      {target.title} • {paymentMethod.toUpperCase()}
                    </div>
                    <div className="text-xl font-black text-white font-mono">
                      {formatBRL(totalAmount)}
                    </div>

                    {paymentMethod === 'pix' ? (
                      <div className="p-2 bg-white rounded-xl mx-auto w-24 h-24 flex items-center justify-center shadow-lg">
                        <QrCode className="w-20 h-20 text-black" />
                      </div>
                    ) : (
                      <div className="space-y-1.5 py-2">
                        <motion.div 
                          animate={{ y: [0, -4, 0] }} 
                          transition={{ repeat: Infinity, duration: 1.5 }}
                          className="w-10 h-10 rounded-full bg-[#DA291C]/20 border border-[#DA291C]/50 text-[#FFC72C] flex items-center justify-center mx-auto"
                        >
                          <CreditCard className="w-5 h-5" />
                        </motion.div>
                        <div className="text-[11px] font-bold text-emerald-400">
                          Aproxime ou Insira o Cartão
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {step === 'authorizing' && (
                  <div className="space-y-2">
                    <RefreshCw className="w-8 h-8 text-[#00D26A] animate-spin mx-auto" />
                    <div className="text-xs font-black text-white">Autorizando com a Rede...</div>
                    <div className="text-[10px] text-zinc-400">Aguarde a resposta do adquirente</div>
                  </div>
                )}
              </div>

              {/* Terminal Bottom Slot Hint */}
              <div className="text-[8.5px] text-zinc-600 uppercase tracking-widest pt-1 border-t border-zinc-900 font-mono text-center">
                CHIP & CONTACLESS NFC
              </div>
            </div>

            {/* Interactive button to simulate customer completing payment on terminal */}
            {step === 'waiting_card' && (
              <div className="space-y-2 w-full max-w-xs">
                <button
                  onClick={handleSimulateCustomerPayment}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs rounded-xl shadow-[0_0_15px_rgba(0,210,106,0.3)] transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Simular Cliente Pagando no Terminal</span>
                </button>
                <p className="text-[10px] text-zinc-500">
                  Ao aproximar o cartão ou ler o Pix na maquininha física, a confirmação ocorre instantaneamente via TEF.
                </p>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: APPROVED & FINALIZED */}
        {step === 'approved' && approvedDetails && (
          <div className="py-4 space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_15px_rgba(0,210,106,0.4)]">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-black text-white">Transação Autorizada com Sucesso!</h4>
              <p className="text-xs text-zinc-300">
                O valor de <strong className="text-emerald-400 font-mono">{formatBRL(approvedDetails.amount)}</strong> foi liquidado no terminal.
              </p>
            </div>

            {/* TEF Electronic Voucher Summary */}
            <div className="p-3.5 rounded-2xl bg-[#141420] border border-[#242436] text-xs font-mono space-y-1.5 leading-relaxed">
              <div className="flex justify-between text-zinc-400">
                <span>TERMINAL:</span>
                <span className="text-white font-bold">{approvedDetails.terminalName}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>BANDEIRA:</span>
                <span className="text-[#FFC72C] font-bold">{approvedDetails.brand}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>AUTORIZAÇÃO:</span>
                <span className="text-white font-bold">{approvedDetails.authCode}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>DOC / NSU:</span>
                <span className="text-white">{approvedDetails.nsu}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>TID ADQUIRENTE:</span>
                <span className="text-white">{approvedDetails.tid}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>HORÁRIO:</span>
                <span className="text-zinc-300">{formatDateTime(approvedDetails.timestamp)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
              <button
                onClick={handlePrintTEFReceipt}
                className="w-full sm:flex-1 py-3 rounded-xl bg-[#1C1C2A] hover:bg-[#28283C] text-[#FFC72C] border border-[#FFC72C]/30 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <Printer className="w-4 h-4 text-[#FFC72C]" />
                <span>Imprimir Comprovante Térmico</span>
              </button>

              <button
                onClick={onClose}
                className="w-full sm:flex-1 py-3 rounded-xl bg-[#00D26A] hover:bg-[#00E575] text-black font-black text-xs shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Concluir & Liberar {target.title}</span>
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
