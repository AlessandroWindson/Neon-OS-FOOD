import React, { useState } from 'react';
import { 
  Webhook, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Zap, 
  RefreshCw, 
  X, 
  Copy, 
  Check, 
  ArrowRight,
  Sparkles,
  CreditCard,
  Truck,
  RotateCcw,
  Bell,
  BellRing,
  BellOff,
  Laptop,
  Smartphone,
  ShieldCheck
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { WebhookProvider, WebhookEventType, WebhookEventPayload } from '../types';
import { formatBRL } from '../utils/formatters';
import { playBeep } from '../utils/audio';

interface WebhookSimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WebhookSimulationModal: React.FC<WebhookSimulationModalProps> = ({ isOpen, onClose }) => {
  const { 
    handleIncomingWebhook, 
    webhookNotifications, 
    clearWebhookNotifications, 
    markNotificationAsRead,
    webhookAutoSimulation,
    setWebhookAutoSimulation,
    simulatePartnerWebhook,
    notificationPermission,
    requestPushNotifications,
    testPushNotification
  } = useApp();

  const [activeTab, setActiveTab] = useState<'simulator' | 'logs' | 'endpoints' | 'push'>('simulator');
  const [selectedProvider, setSelectedProvider] = useState<WebhookProvider>('ifood');
  const [selectedEvent, setSelectedEvent] = useState<WebhookEventType>('order.created');
  const [customerName, setCustomerName] = useState('Juliana Ferreira');
  const [customerPhone, setCustomerPhone] = useState('(11) 98765-4321');
  const [orderTotal, setOrderTotal] = useState(78.50);
  const [customNotes, setCustomNotes] = useState('Sem cebola, ponto da carne ao ponto para mal');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [isFiring, setIsFiring] = useState(false);
  const [lastDispatchedInfo, setLastDispatchedInfo] = useState<string | null>(null);
  const [testPushStatus, setTestPushStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const providersConfig: { id: WebhookProvider; name: string; type: 'delivery' | 'payment'; color: string; badge: string }[] = [
    { id: 'ifood', name: 'iFood Brasil', type: 'delivery', color: 'text-[#EA1D2C] border-[#EA1D2C]/40 bg-[#EA1D2C]/10', badge: 'Delivery' },
    { id: 'rappi', name: 'Rappi Delivery', type: 'delivery', color: 'text-[#FF441F] border-[#FF441F]/40 bg-[#FF441F]/10', badge: 'Delivery' },
    { id: '99food', name: '99Food Express', type: 'delivery', color: 'text-[#FF9E00] border-[#FF9E00]/40 bg-[#FF9E00]/10', badge: 'Delivery' },
    { id: 'mercadopago', name: 'Mercado Pago (PIX/QR)', type: 'payment', color: 'text-[#009EE3] border-[#009EE3]/40 bg-[#009EE3]/10', badge: 'Gateway' },
    { id: 'stone', name: 'Stone / Pagar.me', type: 'payment', color: 'text-[#00A868] border-[#00A868]/40 bg-[#00A868]/10', badge: 'Gateway' },
    { id: 'cielo', name: 'Cielo LIO / Ecommerce', type: 'payment', color: 'text-[#0066CC] border-[#0066CC]/40 bg-[#0066CC]/10', badge: 'Gateway' },
    { id: 'pagseguro', name: 'PagSeguro / PagBank', type: 'payment', color: 'text-[#00D26A] border-[#00D26A]/40 bg-[#00D26A]/10', badge: 'Gateway' },
  ];

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(key);
    playBeep(900, 0.04);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const handleTriggerWebhook = () => {
    setIsFiring(true);
    playBeep(880, 0.06);

    const payload: WebhookEventPayload = {
      provider: selectedProvider,
      event: selectedEvent,
      orderCode: `#${Math.floor(1000 + Math.random() * 9000)}`,
      channel: selectedProvider === 'rappi' ? 'rappi' : selectedProvider === '99food' ? '99food' : selectedProvider === 'ifood' ? 'ifood' : 'pdv_balcao',
      customer: {
        name: customerName,
        phone: customerPhone,
        address: {
          street: 'Av. Paulista',
          number: '1578',
          neighborhood: 'Bela Vista',
          city: 'São Paulo',
          zipCode: '01310-200'
        }
      },
      items: [
        { name: 'X-Salada Especial Dulci', quantity: 1, price: 28.90, notes: customNotes, station: 'grill' },
        { name: 'Porção de Batata Frita Crocante', quantity: 1, price: 18.00, station: 'fryer' },
        { name: 'Guaraná Baré Lata 350ml', quantity: 1, price: 6.00, station: 'bar' }
      ],
      total: orderTotal,
      paymentMethod: selectedProvider === 'mercadopago' ? 'pix' : 'credit_card',
      paymentStatus: selectedEvent === 'payment.failed' ? 'pending' : selectedEvent === 'payment.refunded' ? 'refunded' : 'paid',
      reason: selectedEvent === 'order.cancelled' ? 'Cliente solicitou cancelamento por tempo de entrega' : undefined
    };

    setTimeout(() => {
      const result = handleIncomingWebhook(payload);
      setIsFiring(false);
      setLastDispatchedInfo(`✅ Evento ${payload.event} do ${payload.provider.toUpperCase()} disparado com sucesso!`);
      setTimeout(() => setLastDispatchedInfo(null), 4000);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#101016] border border-[#272738] rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#202030] flex items-center justify-between bg-[#14141E]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#FF7A00] to-[#E31837] p-0.5 shadow-[0_0_15px_rgba(255,122,0,0.3)]">
              <div className="w-full h-full bg-[#0E0E14] rounded-[14px] flex items-center justify-center">
                <Webhook className="w-5 h-5 text-[#FF7A00]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-white">Central de Webhooks em Tempo Real</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#00D26A]/20 text-[#00D26A] border border-[#00D26A]/30">
                  HTTP REST • Real-time
                </span>
              </div>
              <p className="text-xs text-[#A1A1AA]">
                Recepção e simulação de eventos iFood, Rappi, 99Food e Gateways de Pagamento (Mercado Pago, Stone, Cielo)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Auto-Simulation Toggle */}
            <div className="hidden sm:flex items-center gap-2 bg-[#181824] px-3 py-1.5 rounded-xl border border-[#28283C]">
              <span className="text-[11px] font-bold text-[#D4D4D8]">Simulação Auto:</span>
              <button
                onClick={() => setWebhookAutoSimulation(!webhookAutoSimulation)}
                className={`w-9 h-5 rounded-full transition-colors relative ${webhookAutoSimulation ? 'bg-[#00D26A]' : 'bg-[#2E2E40]'}`}
              >
                <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform ${webhookAutoSimulation ? 'left-4.5' : 'left-0.5'}`} />
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-[#1C1C28] hover:bg-[#282838] text-[#A1A1AA] hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-2 px-4 pt-3 border-b border-[#202030] bg-[#12121A]">
          <button
            onClick={() => setActiveTab('simulator')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === 'simulator'
                ? 'border-[#FF7A00] text-[#FF7A00]'
                : 'border-transparent text-[#71717A] hover:text-[#D4D4D8]'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Simulador de Eventos</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === 'logs'
                ? 'border-[#FF7A00] text-[#FF7A00]'
                : 'border-transparent text-[#71717A] hover:text-[#D4D4D8]'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Histórico de Notificações</span>
            {webhookNotifications.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#E31837] text-white text-[10px] font-extrabold">
                {webhookNotifications.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('endpoints')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === 'endpoints'
                ? 'border-[#FF7A00] text-[#FF7A00]'
                : 'border-transparent text-[#71717A] hover:text-[#D4D4D8]'
            }`}
          >
            <Webhook className="w-3.5 h-3.5" />
            <span>Endpoints & URLs</span>
          </button>

          <button
            onClick={() => setActiveTab('push')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === 'push'
                ? 'border-[#00D26A] text-[#00D26A]'
                : 'border-transparent text-[#71717A] hover:text-[#D4D4D8]'
            }`}
          >
            <BellRing className="w-3.5 h-3.5" />
            <span>Alertas Push (OS)</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase ${
              notificationPermission === 'granted'
                ? 'bg-[#00D26A]/20 text-[#00D26A] border border-[#00D26A]/40'
                : notificationPermission === 'denied'
                ? 'bg-[#E31837]/20 text-[#E31837] border border-[#E31837]/40'
                : 'bg-[#FF7A00]/20 text-[#FF7A00] border border-[#FF7A00]/40'
            }`}>
              {notificationPermission === 'granted' ? 'Ativo' : notificationPermission === 'denied' ? 'Bloqueado' : 'Pendente'}
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-thin scrollbar-thumb-[#242436]">
          
          {/* TAB 1: SIMULATOR */}
          {activeTab === 'simulator' && (
            <div className="space-y-6">
              {/* Step 1: Select Provider */}
              <div>
                <label className="block text-xs font-black uppercase text-[#71717A] tracking-wider mb-2.5">
                  1. Escolha o Parceiro / Gateway
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {providersConfig.map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedProvider(p.id);
                        if (p.type === 'payment' && selectedEvent.startsWith('order.')) {
                          setSelectedEvent('payment.approved');
                        } else if (p.type === 'delivery' && selectedEvent.startsWith('payment.')) {
                          setSelectedEvent('order.created');
                        }
                        playBeep(700, 0.03);
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all relative ${
                        selectedProvider === p.id
                          ? 'border-[#FF7A00] bg-[#1E1A22] shadow-[0_0_15px_rgba(255,122,0,0.2)]'
                          : 'border-[#222232] bg-[#14141E] hover:border-[#383850]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-black uppercase ${p.color}`}>
                          {p.badge}
                        </span>
                        {p.type === 'delivery' ? <Truck className="w-3.5 h-3.5 text-[#A1A1AA]" /> : <CreditCard className="w-3.5 h-3.5 text-[#A1A1AA]" />}
                      </div>
                      <div className="font-extrabold text-xs text-white truncate">{p.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Select Event */}
              <div>
                <label className="block text-xs font-black uppercase text-[#71717A] tracking-wider mb-2.5">
                  2. Tipo de Evento Recebido via Webhook
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'order.created', label: '📥 Novo Pedido (order.created)', desc: 'Cria pedido no KDS e baixa estoque' },
                    { id: 'order.confirmed', label: '📋 Pedido Confirmado (order.confirmed)', desc: 'Confirmação pelo parceiro' },
                    { id: 'order.preparing', label: '👨‍🍳 Em Preparo no KDS (order.preparing)', desc: 'Sinaliza cocção nas praças KDS' },
                    { id: 'order.ready', label: '🛎️ Pedido Pronto (order.ready)', desc: 'Sino KDS e envio para expedição' },
                    { id: 'order.dispatched', label: '🛵 Despachado Entregador (order.dispatched)', desc: 'Saiu para entrega com motoboy' },
                    { id: 'order.delivered', label: '✅ Pedido Entregue (order.delivered)', desc: 'Finaliza e conclui o pedido' },
                    { id: 'order.cancelled', label: '❌ Cancelamento (order.cancelled)', desc: 'Cancela com estorno e auditoria' },
                    { id: 'payment.approved', label: '💰 Pagamento Aprovado', desc: 'Entrada no Caixa e DRE' },
                    { id: 'payment.refunded', label: '💸 Reembolso / Estorno', desc: 'Registra estorno no financeiro' },
                  ].map(evt => (
                    <button
                      key={evt.id}
                      onClick={() => {
                        setSelectedEvent(evt.id as WebhookEventType);
                        playBeep(750, 0.03);
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        selectedEvent === evt.id
                          ? 'border-[#00D26A] bg-[#00D26A]/10 text-white shadow-[0_0_12px_rgba(0,210,106,0.2)]'
                          : 'border-[#222232] bg-[#14141E] text-[#A1A1AA] hover:text-white hover:border-[#323246]'
                      }`}
                    >
                      <div className="font-bold text-xs">{evt.label}</div>
                      <div className="text-[10px] text-[#71717A] mt-0.5">{evt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 3: Payload Details */}
              <div className="bg-[#14141E] border border-[#242436] rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase text-[#D4D4D8] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#FFE600]" />
                    Parâmetros do Payload Simulado
                  </span>
                  <button
                    onClick={() => simulatePartnerWebhook()}
                    className="text-[11px] text-[#77D4E1] hover:underline font-bold flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Gerar Aleatório
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#71717A] mb-1">Nome do Cliente</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      className="w-full bg-[#1A1A28] border border-[#2C2C40] rounded-xl px-3 py-2 text-xs text-white focus:border-[#FF7A00] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#71717A] mb-1">WhatsApp / Telefone</label>
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      className="w-full bg-[#1A1A28] border border-[#2C2C40] rounded-xl px-3 py-2 text-xs text-white focus:border-[#FF7A00] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#71717A] mb-1">Valor Total (R$)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={orderTotal}
                      onChange={e => setOrderTotal(parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#1A1A28] border border-[#2C2C40] rounded-xl px-3 py-2 text-xs text-white focus:border-[#FF7A00] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#71717A] mb-1">Observações / Itens</label>
                  <input
                    type="text"
                    value={customNotes}
                    onChange={e => setCustomNotes(e.target.value)}
                    className="w-full bg-[#1A1A28] border border-[#2C2C40] rounded-xl px-3 py-2 text-xs text-white focus:border-[#FF7A00] focus:outline-none"
                  />
                </div>
              </div>

              {/* Action Trigger Button */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="text-xs text-[#71717A]">
                  O webhook será processado pelo <strong className="text-white">AppProvider</strong> e refletirá no KDS, Caixa e Financeiro.
                </div>

                <button
                  onClick={handleTriggerWebhook}
                  disabled={isFiring}
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-[#FF7A00] to-[#E31837] hover:from-[#FF8C1A] hover:to-[#FF2B4E] text-white font-extrabold text-xs shadow-[0_0_20px_rgba(255,122,0,0.4)] flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{isFiring ? 'Processando Webhook...' : 'Disparar Webhook no Neon OS'}</span>
                </button>
              </div>

              {lastDispatchedInfo && (
                <div className="p-3 bg-[#00D26A]/10 border border-[#00D26A]/30 rounded-2xl text-xs text-[#00D26A] font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{lastDispatchedInfo}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: LOGS & HISTORY */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase text-[#71717A]">
                  Histórico de Notificações Recebidas ({webhookNotifications.length})
                </span>
                {webhookNotifications.length > 0 && (
                  <button
                    onClick={() => clearWebhookNotifications()}
                    className="text-xs text-[#E31837] hover:underline font-bold"
                  >
                    Limpar Histórico
                  </button>
                )}
              </div>

              {webhookNotifications.length === 0 ? (
                <div className="p-12 text-center border border-dashed border-[#262638] rounded-3xl">
                  <Webhook className="w-8 h-8 text-[#525266] mx-auto mb-2 opacity-50" />
                  <div className="font-bold text-xs text-[#A1A1AA]">Nenhum webhook recebido recentemente.</div>
                  <div className="text-[11px] text-[#71717A] mt-1">Dispare eventos pelo simulador ou ative a simulação automática.</div>
                </div>
              ) : (
                <div className="space-y-2">
                  {webhookNotifications.map(notif => (
                    <div
                      key={notif.id}
                      onClick={() => markNotificationAsRead(notif.id)}
                      className={`p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                        notif.read
                          ? 'bg-[#12121A] border-[#222230] opacity-80'
                          : 'bg-[#181824] border-[#FF7A00]/40 shadow-[0_0_12px_rgba(255,122,0,0.1)]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs uppercase shrink-0 ${
                          notif.provider === 'ifood' ? 'bg-[#EA1D2C]/20 text-[#EA1D2C]' :
                          notif.provider === 'rappi' ? 'bg-[#FF441F]/20 text-[#FF441F]' :
                          notif.provider === 'mercadopago' ? 'bg-[#009EE3]/20 text-[#009EE3]' :
                          'bg-[#00D26A]/20 text-[#00D26A]'
                        }`}>
                          {notif.provider.slice(0, 2)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-xs text-white">{notif.title}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-black/40 text-[#A1A1AA]">
                              {notif.eventType}
                            </span>
                          </div>
                          <div className="text-xs text-[#D4D4D8] mt-0.5">{notif.message}</div>
                          {notif.amount && (
                            <div className="text-[11px] text-[#00D26A] font-bold mt-1">
                              Valor: {formatBRL(notif.amount)}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-[10px] text-[#71717A] font-mono">
                          {new Date(notif.timestamp).toLocaleTimeString('pt-BR')}
                        </div>
                        {!notif.read && (
                          <span className="w-2 h-2 rounded-full bg-[#FF7A00] inline-block mt-1 animate-ping" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ENDPOINTS & REST APIS */}
          {activeTab === 'endpoints' && (
            <div className="space-y-4">
              <div className="text-xs text-[#A1A1AA]">
                Copie e configure estas URLs no Portal do Desenvolvedor do iFood, Rappi, 99Food ou no seu Gateway de Pagamento:
              </div>

              <div className="space-y-3">
                {[
                  {
                    name: 'iFood Merchant API v2 Webhook',
                    provider: 'ifood',
                    endpoint: 'https://ais-dev-6bfggj7d3hqrjg7hp5lgrz-347509953670.us-east1.run.app/api/webhooks/ifood',
                    events: 'ORDER_PLACED, ORDER_CONFIRMED, ORDER_CANCELLED, DISPATCHED'
                  },
                  {
                    name: 'Rappi Partner Webhook Listener',
                    provider: 'rappi',
                    endpoint: 'https://ais-dev-6bfggj7d3hqrjg7hp5lgrz-347509953670.us-east1.run.app/api/webhooks/rappi',
                    events: 'orders.new, orders.cooking, orders.picked_up, orders.canceled'
                  },
                  {
                    name: 'Mercado Pago IPN / Webhooks',
                    provider: 'mercadopago',
                    endpoint: 'https://ais-dev-6bfggj7d3hqrjg7hp5lgrz-347509953670.us-east1.run.app/api/webhooks/mercadopago',
                    events: 'payment.created, payment.updated, point_integration_wh'
                  },
                  {
                    name: 'Stone / Pagar.me Postback Webhook',
                    provider: 'stone',
                    endpoint: 'https://ais-dev-6bfggj7d3hqrjg7hp5lgrz-347509953670.us-east1.run.app/api/webhooks/stone',
                    events: 'transaction_status_changed, charge.refunded'
                  }
                ].map(ep => (
                  <div key={ep.provider} className="p-4 bg-[#14141E] border border-[#242436] rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-white">{ep.name}</span>
                      <span className="text-[10px] text-[#71717A] font-mono uppercase">{ep.events}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={ep.endpoint}
                        className="flex-1 bg-[#1A1A28] border border-[#2C2C40] rounded-xl px-3 py-2 text-xs font-mono text-[#FFE600] focus:outline-none"
                      />
                      <button
                        onClick={() => handleCopy(ep.endpoint, ep.provider)}
                        className="px-3 py-2 bg-[#222232] hover:bg-[#2C2C40] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        {copiedUrl === ep.provider ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-[#00D26A]" />
                            <span className="text-[#00D26A]">Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar URL</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: PUSH NOTIFICATIONS & SERVICE WORKER */}
          {activeTab === 'push' && (
            <div className="space-y-6">
              
              {/* Push Status Banner */}
              <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
                notificationPermission === 'granted'
                  ? 'bg-[#00D26A]/10 border-[#00D26A]/40'
                  : notificationPermission === 'denied'
                  ? 'bg-[#E31837]/10 border-[#E31837]/40'
                  : 'bg-[#FF7A00]/10 border-[#FF7A00]/40'
              }`}>
                <div className="flex items-center gap-3.5">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    notificationPermission === 'granted'
                      ? 'bg-[#00D26A]/20 text-[#00D26A]'
                      : notificationPermission === 'denied'
                      ? 'bg-[#E31837]/20 text-[#E31837]'
                      : 'bg-[#FF7A00]/20 text-[#FF7A00]'
                  }`}>
                    {notificationPermission === 'granted' ? (
                      <BellRing className="w-6 h-6 animate-bounce" />
                    ) : notificationPermission === 'denied' ? (
                      <BellOff className="w-6 h-6" />
                    ) : (
                      <Bell className="w-6 h-6 animate-pulse" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-extrabold text-white">
                        {notificationPermission === 'granted'
                          ? 'Notificações Nativas do SO Ativadas'
                          : notificationPermission === 'denied'
                          ? 'Notificações Bloqueadas no Navegador'
                          : 'Permissão de Notificações Pendente'}
                      </h4>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        notificationPermission === 'granted'
                          ? 'bg-[#00D26A]/20 text-[#00D26A] border border-[#00D26A]/30'
                          : notificationPermission === 'denied'
                          ? 'bg-[#E31837]/20 text-[#E31837] border border-[#E31837]/30'
                          : 'bg-[#FF7A00]/20 text-[#FF7A00] border border-[#FF7A00]/30'
                      }`}>
                        {notificationPermission === 'granted' ? 'Service Worker Online' : 'Ação Necessária'}
                      </span>
                    </div>
                    <p className="text-xs text-[#A1A1AA] mt-0.5">
                      {notificationPermission === 'granted'
                        ? 'O restaurante receberá pop-ups na barra de tarefas / central de notificações do Windows, Mac, Android e iOS PWA mesmo com a aba em segundo plano.'
                        : notificationPermission === 'denied'
                        ? 'Permissão negada. Para ativar, clique no ícone de cadeado na barra de endereço do navegador e autorize as notificações.'
                        : 'Permita as notificações para que a equipe de cozinha e gestores não percam nenhum pedido de delivery em tempo real.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {notificationPermission !== 'granted' ? (
                    <button
                      onClick={async () => {
                        const status = await requestPushNotifications();
                        if (status === 'granted') {
                          setTestPushStatus('✅ Alertas ativados com sucesso no seu Sistema Operacional!');
                          setTimeout(() => setTestPushStatus(null), 4000);
                        }
                      }}
                      className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-[#00D26A] to-[#009EE3] text-black font-extrabold text-xs rounded-xl shadow-lg hover:brightness-110 flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <BellRing className="w-4 h-4" />
                      <span>Ativar Notificações Nativas</span>
                    </button>
                  ) : (
                    <button
                      onClick={async () => {
                        playBeep(900, 0.08);
                        const ok = await testPushNotification(
                          '🚨 NOVO PEDIDO #1094 (IFOOD)',
                          'Cliente: Ana Clara • 2x Smash Burger + Fritas • R$ 89,90 • Enviado para o KDS!'
                        );
                        if (ok) {
                          setTestPushStatus('🔔 Alerta nativo de teste enviado para a central do seu SO!');
                          setTimeout(() => setTestPushStatus(null), 4000);
                        } else {
                          setTestPushStatus('⚠️ Verifique as permissões de notificação do sistema.');
                          setTimeout(() => setTestPushStatus(null), 4000);
                        }
                      }}
                      className="w-full sm:w-auto px-4 py-2.5 bg-[#00D26A] hover:bg-[#00E575] text-black font-extrabold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Zap className="w-4 h-4" />
                      <span>Testar Alerta Push Agora</span>
                    </button>
                  )}
                </div>
              </div>

              {testPushStatus && (
                <div className="p-3 bg-[#00D26A]/10 border border-[#00D26A]/30 rounded-xl text-xs text-[#00D26A] font-bold flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{testPushStatus}</span>
                </div>
              )}

              {/* Service Worker Features Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-4 bg-[#14141E] border border-[#242436] rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-[#009EE3]">
                    <Laptop className="w-4 h-4" />
                    <span className="text-xs font-bold text-white">Desktop (Windows / macOS)</span>
                  </div>
                  <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
                    Exibe banner nativo no canto da tela com som característico, permitindo clicar para focar diretamente na comanda no KDS.
                  </p>
                </div>

                <div className="p-4 bg-[#14141E] border border-[#242436] rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-[#00D26A]">
                    <Smartphone className="w-4 h-4" />
                    <span className="text-xs font-bold text-white">Mobile & Tablets (PWA)</span>
                  </div>
                  <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
                    Vibração háptica de alta intensidade <code className="text-[#FFE600]">[300ms, 100ms, 300ms]</code> e alerta na tela de bloqueio via Service Worker.
                  </p>
                </div>

                <div className="p-4 bg-[#14141E] border border-[#242436] rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-[#FF7A00]">
                    <ShieldCheck className="w-4 h-4" />
                    <span className="text-xs font-bold text-white">Segundo Plano & Offline</span>
                  </div>
                  <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
                    O Service Worker <code className="text-[#FFE600]">sw.js</code> processa e enfileira eventos mesmo se o restaurante estiver navegando em outros sistemas.
                  </p>
                </div>
              </div>

              {/* Action Buttons for Custom Event Push Tests */}
              <div>
                <label className="block text-xs font-black uppercase text-[#71717A] tracking-wider mb-3">
                  Simular Alertas Nativos Específicos do Restaurante
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => {
                      simulatePartnerWebhook('ifood', 'order.created');
                      setTestPushStatus('📥 Pedido iFood simulado e notificação nativa disparada!');
                      setTimeout(() => setTestPushStatus(null), 4000);
                    }}
                    className="p-3.5 bg-[#171724] hover:bg-[#202032] border border-[#27273C] hover:border-[#EA1D2C]/60 rounded-2xl text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-extrabold text-[#EA1D2C] flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#EA1D2C]" />
                        Novo Pedido iFood
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#71717A] group-hover:text-white group-hover:translate-x-1 transition-all" />
                    </div>
                    <p className="text-[11px] text-[#71717A]">
                      Dispara push com nome do cliente, itens e redirecionamento para o KDS.
                    </p>
                  </button>

                  <button
                    onClick={() => {
                      simulatePartnerWebhook('mercadopago', 'payment.approved');
                      setTestPushStatus('💰 Pagamento PIX simulado e notificação nativa disparada!');
                      setTimeout(() => setTestPushStatus(null), 4000);
                    }}
                    className="p-3.5 bg-[#171724] hover:bg-[#202032] border border-[#27273C] hover:border-[#009EE3]/60 rounded-2xl text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-extrabold text-[#009EE3] flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#009EE3]" />
                        Pagamento PIX Aprovado
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#71717A] group-hover:text-white group-hover:translate-x-1 transition-all" />
                    </div>
                    <p className="text-[11px] text-[#71717A]">
                      Dispara push com valor liquidado e entrada imediata no Caixa.
                    </p>
                  </button>

                  <button
                    onClick={() => {
                      simulatePartnerWebhook('rappi', 'order.cancelled');
                      setTestPushStatus('❌ Cancelamento simulado e alerta crítico disparado!');
                      setTimeout(() => setTestPushStatus(null), 4000);
                    }}
                    className="p-3.5 bg-[#171724] hover:bg-[#202032] border border-[#27273C] hover:border-[#E31837]/60 rounded-2xl text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-extrabold text-[#E31837] flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#E31837]" />
                        Cancelamento de Pedido
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#71717A] group-hover:text-white group-hover:translate-x-1 transition-all" />
                    </div>
                    <p className="text-[11px] text-[#71717A]">
                      Dispara alerta de cancelamento com estorno e remoção da comanda da cozinha.
                    </p>
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#202030] bg-[#14141E] flex items-center justify-between">
          <div className="text-xs text-[#71717A] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00D26A] animate-pulse" />
            <span>Escutando conexões via AppProvider & Webhooks Gateway</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#20202E] hover:bg-[#2B2B3C] text-white text-xs font-bold rounded-xl transition-colors"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
