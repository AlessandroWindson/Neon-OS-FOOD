import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  QrCode, 
  CreditCard, 
  Database, 
  Lock, 
  Key, 
  ArrowRight,
  Sparkles,
  Radio,
  FileCheck,
  Zap,
  Info
} from 'lucide-react';
import { Order, CashSession } from '../types';
import { UnitGatewayConfig } from '../services/unitGatewayConfigService';
import { 
  syncPaymentWebhookToFirestore, 
  formatGatewayProviderName, 
  WebhookSyncResult 
} from '../services/webhookFirestoreService';
import { formatBRL } from '../utils/formatters';
import { playCashRegister, playBeep, playKitchenBell } from '../utils/audio';

interface ModalSimuladorWebhookSeguroProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  activeCashSession: CashSession | null;
  tenantId: string;
  currentBranchName?: string;
  unitGatewayConfig: UnitGatewayConfig | null;
  onSuccess: (result: WebhookSyncResult) => void;
  onCreateTestOrder?: () => Order | void;
}

export const ModalSimuladorWebhookSeguro: React.FC<ModalSimuladorWebhookSeguroProps> = ({
  isOpen,
  onClose,
  orders,
  activeCashSession,
  tenantId,
  currentBranchName = 'Matriz',
  unitGatewayConfig,
  onSuccess,
  onCreateTestOrder
}) => {
  const [provider, setProvider] = useState<'mercadopago' | 'stone' | 'pix_bacen' | 'cielo' | 'asaas'>('mercadopago');
  const [event, setEvent] = useState<'payment.approved' | 'payment.refunded' | 'payment.failed'>('payment.approved');
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [customAmount, setCustomAmount] = useState<string>('45.90');
  const [useConfiguredSecret, setUseConfiguredSecret] = useState(true);
  const [customSecret, setCustomSecret] = useState('');
  const [customProtocol, setCustomProtocol] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<WebhookSyncResult | null>(null);

  // Pedidos que estão pendentes ou elegíveis
  const pendingOrders = useMemo(() => {
    return orders.filter(o => o.paymentStatus !== 'paid' || o.status === 'pending');
  }, [orders]);

  // Atualizar valor quando o pedido selecionado mudar
  const handleSelectOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    if (orderId) {
      const ord = orders.find(o => o.id === orderId);
      if (ord) {
        setCustomAmount(ord.total.toFixed(2));
      }
    }
  };

  // Segredo efetivo a ser testado
  const effectiveSecret = useMemo(() => {
    if (useConfiguredSecret) {
      return unitGatewayConfig?.webhookSecret || 'whsec_neon_live_auth_key';
    }
    return customSecret;
  }, [useConfiguredSecret, unitGatewayConfig?.webhookSecret, customSecret]);

  // Gerar protocolo automático se vazio
  const currentProtocol = useMemo(() => {
    if (customProtocol.trim()) return customProtocol.trim();
    if (provider === 'mercadopago' || provider === 'pix_bacen') {
      return `E000381662026${Date.now()}`;
    }
    return `NSU${Math.floor(10000000 + Math.random() * 90000000)}`;
  }, [customProtocol, provider]);

  const handleExecuteWebhook = async () => {
    setIsProcessing(true);
    setLastResult(null);

    try {
      const amountNum = parseFloat(customAmount) || 45.90;
      const targetOrder = orders.find(o => o.id === selectedOrderId);
      const isPix = provider === 'mercadopago' || provider === 'pix_bacen';
      const orderCode = targetOrder?.displayCode || `#${Math.floor(1000 + Math.random() * 9000)}`;

      const payload = {
        provider,
        event,
        orderCode,
        orderId: selectedOrderId || undefined,
        total: amountNum,
        paymentMethod: isPix ? 'pix' : 'credit_card',
        paymentStatus: event === 'payment.approved' ? ('paid' as const) : event === 'payment.refunded' ? ('refunded' as const) : ('pending' as const),
        pixEndToEndId: isPix ? currentProtocol : undefined,
        cardNsu: !isPix ? currentProtocol : undefined,
        cardTid: !isPix ? `TID-${Date.now()}` : undefined,
        cardAuthCode: !isPix ? `AUT-${Math.floor(100000 + Math.random() * 900000)}` : undefined,
        signature: effectiveSecret,
        secretToken: effectiveSecret,
        timestamp: new Date().toISOString()
      };

      const result = await syncPaymentWebhookToFirestore(
        tenantId || 'tenant_lanchonete_dulci',
        payload,
        targetOrder,
        activeCashSession,
        unitGatewayConfig?.webhookSecret
      );

      setLastResult(result);

      if (result.success) {
        if (event === 'payment.approved' && !result.duplicatePrevented) {
          playCashRegister();
        } else {
          playBeep(700, 0.05);
        }
        onSuccess(result);
      } else {
        playBeep(300, 0.1);
      }
    } catch (err: any) {
      console.error('[ModalSimuladorWebhook] Falha ao processar webhook:', err);
      setLastResult({
        success: false,
        message: err?.message || 'Falha inesperada ao sincronizar webhook.',
        paymentStatus: 'pending',
        webhookLogId: `err_${Date.now()}`,
        syncedToFirestore: false,
        securityVerified: false,
        error: err?.message
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[#12121E] border border-zinc-700/80 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl my-6 flex flex-col"
      >
        {/* Top Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-[#00E676]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">Manipulador Seguro de Webhooks</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-[#00E676] border border-emerald-500/40">
                  Integridade Firestore
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Recebe notificações de gateways, valida assinaturas e liquida o Pedido e o Caixa no Firestore.
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-xl bg-zinc-800/60 hover:bg-zinc-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Status Caixa & Unidade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between">
              <span className="text-zinc-400">Unidade Operacional:</span>
              <span className="font-bold text-white truncate max-w-[150px]">{currentBranchName}</span>
            </div>
            <div className="p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between">
              <span className="text-zinc-400">Caixa no Firestore:</span>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${activeCashSession?.status === 'open' ? 'bg-[#00E676] animate-pulse' : 'bg-amber-400'}`} />
                <span className="font-bold text-white font-mono">
                  {activeCashSession ? `${formatBRL(activeCashSession.calculatedFinalAmount)} (Inflow: ${formatBRL(activeCashSession.totalInflow || 0)})` : 'Sessão Padrão'}
                </span>
              </div>
            </div>
          </div>

          {/* 1. Seleção do Gateway Provedor */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
              <span>1. Gateway Provedor de Pagamento</span>
              <span className="text-[10px] text-zinc-500">Origem da Notificação</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'mercadopago', name: 'Mercado Pago', desc: 'Pix QR Dinâmico', icon: QrCode },
                { id: 'stone', name: 'Stone / Pagar.me', desc: 'Cartão & TEF', icon: CreditCard },
                { id: 'pix_bacen', name: 'Pix Banco Central', desc: 'PSP D+0 Direto', icon: QrCode },
                { id: 'cielo', name: 'Cielo E-Commerce', desc: 'Crédito / Débito', icon: CreditCard },
                { id: 'asaas', name: 'Asaas Pagamentos', desc: 'Pix / Boleto / Cartão', icon: QrCode }
              ].map((gt) => {
                const Icon = gt.icon;
                const isSelected = provider === gt.id;
                return (
                  <button
                    key={gt.id}
                    type="button"
                    onClick={() => setProvider(gt.id as any)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                      isSelected
                        ? 'bg-emerald-500/10 border-[#00E676] text-white shadow-sm'
                        : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-[#00E676]' : 'text-zinc-500'}`} />
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#00E676]" />}
                    </div>
                    <span className="font-bold text-xs">{gt.name}</span>
                    <span className="text-[10px] text-zinc-500">{gt.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Seleção de Pedido Alvo */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-300">
                2. Pedido Vinculado ao Pagamento
              </label>
              {onCreateTestOrder && (
                <button
                  type="button"
                  onClick={() => {
                    const newOrd = onCreateTestOrder();
                    if (newOrd && newOrd.id) {
                      handleSelectOrder(newOrd.id);
                    }
                  }}
                  className="text-[11px] text-[#00E676] hover:underline flex items-center gap-1 font-bold cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Criar Pedido Pendente</span>
                </button>
              )}
            </div>

            <select
              value={selectedOrderId}
              onChange={(e) => handleSelectOrder(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:border-[#00E676] focus:outline-none transition-all cursor-pointer font-mono"
            >
              <option value="">-- Selecionar Pedido Pendente (ou gerar avulso) --</option>
              {pendingOrders.map(ord => (
                <option key={ord.id} value={ord.id}>
                  {ord.displayCode} - {ord.customerName} ({formatBRL(ord.total)}) [{ord.paymentMethod.toUpperCase()}]
                </option>
              ))}
            </select>
          </div>

          {/* 3. Evento, Valor e Protocolo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300">Evento Recebido</label>
              <select
                value={event}
                onChange={(e) => setEvent(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:border-[#00E676] focus:outline-none font-mono"
              >
                <option value="payment.approved">payment.approved (Aprovado)</option>
                <option value="payment.refunded">payment.refunded (Estorno)</option>
                <option value="payment.failed">payment.failed (Recusado)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300">Valor da Transação (R$)</label>
              <input
                type="number"
                step="0.01"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-mono font-bold focus:border-[#00E676] focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-300">Protocolo / NSU</label>
                <button
                  type="button"
                  onClick={() => setCustomProtocol('')}
                  title="Gerar novo ID aleatório"
                  className="text-[10px] text-zinc-400 hover:text-white"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
              <input
                type="text"
                placeholder={currentProtocol}
                value={customProtocol}
                onChange={(e) => setCustomProtocol(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-mono focus:border-[#00E676] focus:outline-none"
              />
            </div>
          </div>

          {/* 4. Segurança e Assinatura Criptográfica */}
          <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white">Validação de Assinatura & Secret Token</span>
              </div>
              <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useConfiguredSecret}
                  onChange={(e) => setUseConfiguredSecret(e.target.checked)}
                  className="rounded border-zinc-700 text-[#00E676] focus:ring-0"
                />
                <span>Usar Chave da Unidade</span>
              </label>
            </div>

            {useConfiguredSecret ? (
              <div className="flex items-center justify-between bg-black/40 p-2.5 rounded-xl border border-zinc-800/80 text-xs font-mono">
                <span className="text-zinc-400 truncate max-w-[280px]">
                  Secret Ativo: {unitGatewayConfig?.webhookSecret ? `${unitGatewayConfig.webhookSecret.substring(0, 12)}...` : 'whsec_neon_live_auth_key'}
                </span>
                <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5" /> Assinatura Válida
                </span>
              </div>
            ) : (
              <div className="space-y-1">
                <input
                  type="text"
                  placeholder="Digite uma assinatura ou token simulado (teste de recusa)"
                  value={customSecret}
                  onChange={(e) => setCustomSecret(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-zinc-700 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                />
                <p className="text-[10px] text-zinc-500">
                  Dica: digite uma chave inválida para testar a rejeição de segurança do webhook.
                </p>
              </div>
            )}
          </div>

          {/* Feedback do Resultado da Execução */}
          {lastResult && (
            <div className={`p-4 rounded-2xl border text-xs space-y-2 animate-in fade-in duration-300 ${
              lastResult.success 
                ? lastResult.duplicatePrevented
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}>
              <div className="flex items-center justify-between font-bold">
                <div className="flex items-center gap-2">
                  {lastResult.success ? (
                    lastResult.duplicatePrevented ? <AlertTriangle className="w-4 h-4 text-amber-400" /> : <CheckCircle2 className="w-4 h-4 text-[#00E676]" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                  )}
                  <span>{lastResult.success ? (lastResult.duplicatePrevented ? 'Idempotência Acionada' : 'Sincronizado no Firestore com Sucesso!') : 'Falha na Validação'}</span>
                </div>
                <span className="font-mono text-[10px] text-zinc-400">Log: {lastResult.webhookLogId}</span>
              </div>
              <p className="text-[11px] leading-relaxed text-zinc-300">{lastResult.message}</p>

              {lastResult.success && !lastResult.duplicatePrevented && (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800 font-mono text-[11px]">
                  <div className="bg-black/30 p-2 rounded-lg">
                    <span className="text-zinc-500 block text-[10px]">Status Pedido:</span>
                    <strong className="text-[#00E676]">PAID (Liquidado)</strong>
                  </div>
                  <div className="bg-black/30 p-2 rounded-lg">
                    <span className="text-zinc-500 block text-[10px]">Caixa no Firestore:</span>
                    <strong className="text-white">
                      +{formatBRL(parseFloat(customAmount) || 0)} no Inflow
                    </strong>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons Footer */}
        <div className="p-5 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs transition-all cursor-pointer"
          >
            Fechar
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleExecuteWebhook}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-[#00E676] hover:brightness-110 text-black font-black text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Sincronizando Firestore...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Processar Notificação Webhook</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
