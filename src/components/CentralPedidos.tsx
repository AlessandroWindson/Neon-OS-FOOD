import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Layers, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  ChevronRight, 
  Printer, 
  Phone, 
  MessageSquare, 
  ArrowRight, 
  AlertCircle,
  Truck,
  CookingPot,
  ShoppingBag,
  RotateCcw,
  Flame,
  UtensilsCrossed,
  DollarSign,
  Share2,
  Send,
  Download,
  QrCode,
  Zap
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Order, OrderStatus } from '../types';
import { formatBRL } from '../utils/formatters';
import { playBeep, playKitchenBell, playCashRegister, playSoftClickSound } from '../utils/audio';
import { CompartilharCardapioModal } from './CompartilharCardapioModal';
import { PaymentGatewayModal } from './PaymentGatewayModal';

const columns: { id: OrderStatus; title: string; color: string; bgBadge: string; glow: string }[] = [
  { id: 'pending', title: '1. Novos / Pendentes', color: 'text-[#FFC72C]', bgBadge: 'bg-[#FFC72C]/15 border-[#FFC72C]/30 text-[#FFC72C]', glow: 'shadow-[0_0_12px_rgba(255,199,44,0.2)]' },
  { id: 'preparing', title: '2. Na Cozinha (Chapa & Forno)', color: 'text-[#FF6B00]', bgBadge: 'bg-[#FF6B00]/15 border-[#FF6B00]/30 text-[#FF6B00]', glow: 'shadow-[0_0_12px_rgba(255,107,0,0.2)]' },
  { id: 'ready', title: '3. Pronto / Balcão & Expedição', color: 'text-[#00E676]', bgBadge: 'bg-[#00E676]/15 border-[#00E676]/30 text-[#00E676]', glow: 'shadow-[0_0_12px_rgba(0,230,118,0.2)]' },
  { id: 'delivering', title: '4. Em Rota / Entregas', color: 'text-[#00D2FF]', bgBadge: 'bg-[#00D2FF]/15 border-[#00D2FF]/30 text-[#00D2FF]', glow: 'shadow-[0_0_12px_rgba(0,210,255,0.2)]' },
];

export const CentralPedidos: React.FC = () => {
  const { orders, updateOrderStatus, setPrintOrder, tenant, setCurrentView, openExportModal } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedOrderForShare, setSelectedOrderForShare] = useState<Order | null>(null);

  // Gateway de Pagamentos & Cobrança Pix Dinâmico
  const [isGatewayModalOpen, setIsGatewayModalOpen] = useState(false);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<Order | null>(null);

  const formatChannelLabel = (channel: string, tableNumber?: number) => {
    switch (channel) {
      case 'delivery_whatsapp': return 'WhatsApp';
      case 'cardapio_online': return 'Cardápio Online';
      case 'pdv_balcao':
      case 'balcao': return 'Balcão';
      case 'mesa': return tableNumber ? `Mesa ${tableNumber}` : 'Mesa';
      case 'atendente_mesa': return 'Atendente';
      case 'delivery_web': return 'Delivery Web';
      default: return channel || 'Balcão';
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchSearch = o.displayCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (o.customerPhone && o.customerPhone.includes(searchTerm));
      const matchChannel = selectedChannel === 'all' || o.channel === selectedChannel;
      return matchSearch && matchChannel;
    });
  }, [orders, searchTerm, selectedChannel]);

  const handleAdvanceStatus = (order: Order) => {
    playKitchenBell();
    const nextMap: Record<OrderStatus, OrderStatus> = {
      pending: 'preparing',
      recebido: 'preparing',
      preparing: 'ready',
      ready: 'delivering',
      delivering: 'completed',
      completed: 'completed',
      canceled: 'canceled',
    };
    updateOrderStatus(order.id, nextMap[order.status]);
  };

  const handleSendWhatsApp = (order: Order) => {
    playBeep(880, 0.04);
    const domain = tenant?.settings?.menuCustomDomain || 'https://neonfood.app/cardapio';
    const slug = tenant?.settings?.menuCustomSlug || 'lanchonete-dulci';
    const link = `${domain}?loja=${slug}${order.tableNumber ? `&mesa=${order.tableNumber}` : ''}`;
    const phone = order.customerPhone ? order.customerPhone.replace(/\D/g, '') : '';
    
    const text = encodeURIComponent(
      `🍽️ *${tenant?.name || 'Lanchonete Dulci'}*\n\nOlá ${order.customerName}! Seu pedido *#${order.displayCode}* está com status: *${order.status === 'ready' ? 'PRONTO PARA RETIRADA!' : 'EM PREPARO'}*.\n\n📲 Acompanhe e veja nosso cardápio digital:\n👉 ${link}\n\nBom apetite!`
    );

    const waUrl = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-6 rounded-2xl bg-[#12121A] border border-[#222234] shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF6B00] to-[#DA291C] text-white flex items-center justify-center shadow-[0_0_15px_rgba(255,107,0,0.4)] border border-[#FFC72C]/30 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black font-display text-white tracking-tight flex items-center gap-2 flex-wrap">
              <span>Central de Pedidos Omnichannel</span>
              <span className="text-xs font-mono font-bold bg-[#FF6B00]/20 text-[#FFC72C] px-2 py-0.5 rounded-md border border-[#FFC72C]/30">
                {filteredOrders.length} pedidos
              </span>
            </h1>
            <p className="text-xs text-[#A1A1AA]">Fluxo Kanban em tempo real para salão, balcão, WhatsApp e delivery</p>
          </div>
        </div>

        {/* Filter, Search & Quick Share */}
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
          {/* Quick Menu Share */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setSelectedOrderForShare(null);
              setIsShareModalOpen(true);
              playBeep(900, 0.03);
            }}
            className="px-3.5 py-2.5 min-h-[40px] bg-[#25D366]/20 hover:bg-[#25D366]/30 border border-[#25D366]/50 text-[#25D366] rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shrink-0"
            title="Compartilhar Cardápio Digital via WhatsApp"
          >
            <MessageSquare className="w-3.5 h-3.5 shrink-0" />
            <span>Compartilhar Cardápio</span>
          </motion.button>

          {/* Exportar Vendas (CSV) */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              playBeep(850, 0.04);
              openExportModal('vendas');
            }}
            className="px-3.5 py-2.5 min-h-[40px] bg-[#181826] hover:bg-[#222234] border border-[#2A2A3E] hover:border-[#00E676]/40 text-zinc-300 hover:text-[#00E676] rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shrink-0"
            title="Exportar Relatório de Vendas e Pedidos em CSV / Excel"
          >
            <Download className="w-3.5 h-3.5 text-[#00E676] shrink-0" />
            <span>Exportar Vendas (CSV)</span>
          </motion.button>

          {/* Cobrança Pix Dinâmico no Gateway */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              const pendingOrder = filteredOrders.find(o => o.paymentStatus !== 'paid') || filteredOrders[0];
              if (pendingOrder) {
                setSelectedOrderForPayment(pendingOrder);
                setIsGatewayModalOpen(true);
              }
              playBeep(900, 0.03);
            }}
            className="px-3.5 py-2.5 min-h-[40px] bg-[#00E676]/15 hover:bg-[#00E676]/25 border border-[#00E676]/40 text-[#00E676] rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shrink-0"
            title="Abrir Terminal de Cobrança Pix Dinâmico no Gateway com Baixa Automática"
          >
            <QrCode className="w-3.5 h-3.5 text-[#00E676] shrink-0" />
            <span>Cobrança Pix Dinâmico</span>
          </motion.button>

          {/* Channel selector */}
          <select
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value)}
            className="bg-[#181826] border border-[#2A2A3E] text-xs text-white rounded-xl px-3 py-2 min-h-[40px] focus:border-[#FFC72C] cursor-pointer"
          >
            <option value="all">Todos os Canais</option>
            <option value="pdv_balcao">Balcão / Caixa</option>
            <option value="atendente_mesa">Atendentes (Mesa / Tablet)</option>
            <option value="cardapio_online">Cardápio Online / Link WhatsApp</option>
            <option value="delivery_whatsapp">WhatsApp Delivery</option>
            <option value="delivery_web">Delivery Web</option>
          </select>

          {/* Search bar */}
          <div className="relative flex-1 sm:w-60">
            <Search className="w-4 h-4 text-[#FFC72C] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar comanda, cliente..."
              className="w-full bg-[#181826] border border-[#2A2A3E] focus:border-[#DA291C] rounded-xl pl-9 pr-3 py-2 min-h-[40px] text-xs text-white placeholder-[#71717A]"
            />
          </div>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="p-12 sm:p-16 text-center bg-[#12121A] border border-[#20202E] rounded-3xl space-y-5 max-w-2xl mx-auto shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#DA291C]/20 to-[#FFC72C]/10 text-[#FFC72C] flex items-center justify-center mx-auto border border-[#FFC72C]/30 shadow-[0_0_20px_rgba(255,199,44,0.15)]">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black text-white tracking-tight">Do balcão à cozinha, seu negócio no ritmo da casa.</h3>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-md mx-auto">
              Nenhum pedido em andamento no momento. Quando chegarem novos pedidos via <strong className="text-white">WhatsApp</strong>, <strong className="text-white">Cardápio Digital</strong>, <strong className="text-white">Delivery</strong> ou forem abertos no <strong className="text-white">Balcão</strong> pelos Atendentes, eles aparecerão aqui em tempo real.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                setCurrentView('pdv');
                playBeep(800, 0.04);
              }}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-[#DA291C] to-[#E51A24] text-white font-black text-xs shadow-[0_0_15px_rgba(218,41,28,0.4)] border border-[#FFC72C]/30 cursor-pointer flex items-center gap-2"
            >
              <span>+ Novo Pedido</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                setIsShareModalOpen(true);
                playBeep(850, 0.04);
              }}
              className="px-5 py-3 rounded-2xl bg-[#181826] hover:bg-[#202032] text-zinc-200 hover:text-white font-bold text-xs border border-zinc-700/80 cursor-pointer flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4 text-[#25D366]" />
              <span>Ver Cardápio</span>
            </motion.button>
          </div>
        </div>
      ) : (
        /* Kanban Board Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {columns.map(col => {
          const colOrders = filteredOrders.filter(o => col.id === 'pending' ? (o.status === 'pending' || o.status === 'recebido') : o.status === col.id);
          return (
            <div
              key={col.id}
              className={`p-4 sm:p-5 rounded-2xl bg-[#12121A] border border-[#20202E] flex flex-col justify-between min-h-[500px] sm:min-h-[560px] ${col.glow}`}
            >
              {/* Column Header */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2.5 border-b border-[#20202E]">
                  <h3 className={`text-xs font-black uppercase tracking-wider ${col.color}`}>
                    {col.title}
                  </h3>
                  <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full border ${col.bgBadge}`}>
                    {colOrders.length}
                  </span>
                </div>

                {/* Orders List in Column */}
                <div className="space-y-3 overflow-y-auto max-h-[460px] pr-1">
                  <AnimatePresence mode="popLayout">
                    {colOrders.length === 0 ? (
                      <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="py-12 text-center text-[#71717A] text-xs font-medium"
                      >
                        Nenhum pedido nesta etapa
                      </motion.div>
                    ) : (
                      colOrders.map(order => (
                        <motion.div
                          key={order.id}
                          layout
                          initial={{ opacity: 0, scale: 0.94, y: 12 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, y: -12 }}
                          whileHover={{ scale: 1.015, y: -2 }}
                          transition={{ 
                            layout: { type: 'spring', stiffness: 350, damping: 30 },
                            opacity: { duration: 0.2 },
                            scale: { duration: 0.2 }
                          }}
                          className="p-3.5 rounded-xl bg-[#161622] border border-[#252538] hover:border-[#FFC72C]/40 transition-all space-y-2.5 shadow-sm"
                        >
                          {/* Order Header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-black font-mono text-[#FFC72C]">
                                {order.displayCode}
                              </span>
                              <span className="text-[10px] font-bold text-[#A1A1AA] px-2 py-0.5 rounded bg-[#20202E]">
                                {formatChannelLabel(order.channel, order.tableNumber)}
                              </span>
                              {(order.waiterName || (order as any).attendantName) && (
                                <span className="text-[9px] font-medium text-zinc-400 bg-zinc-800/80 px-1.5 py-0.5 rounded">
                                  Atendente: {order.waiterName || (order as any).attendantName}
                                </span>
                              )}
                              {order.syncStatus === 'pending_sync' ? (
                                <span className="text-[9px] font-bold text-amber-300 bg-amber-500/20 border border-amber-500/40 px-1.5 py-0.2 rounded flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                                  Offline
                                </span>
                              ) : order.isOfflineCreated ? (
                                <span className="text-[9px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 px-1.5 py-0.2 rounded">
                                  Sync OK
                                </span>
                              ) : null}
                            </div>
                            <span className="text-[10px] text-[#00E676] font-mono font-bold">
                              {formatBRL(order.total)}
                            </span>
                          </div>

                          {/* Customer Info */}
                          <div className="text-xs font-bold text-white truncate">
                            {order.customerName}
                          </div>

                          {/* Pix & Gateway Status Banner */}
                          <div className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[10px] ${
                            order.paymentStatus === 'paid'
                              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                              : 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
                          }`}>
                            <div className="flex items-center gap-1.5 font-bold">
                              <QrCode className="w-3.5 h-3.5 shrink-0" />
                              <span>{order.paymentStatus === 'paid' ? 'Pix Confirmado' : 'Aguardando Pix'}</span>
                            </div>
                            {order.paymentStatus !== 'paid' ? (
                              <button
                                onClick={() => {
                                  setSelectedOrderForPayment(order);
                                  setIsGatewayModalOpen(true);
                                  playSoftClickSound();
                                }}
                                className="text-[#FFC72C] hover:underline font-black flex items-center gap-0.5 cursor-pointer"
                              >
                                <span>Cobrar Pix</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            ) : (
                              <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30">
                                D+0 OK
                              </span>
                            )}
                          </div>

                          {/* Items preview */}
                          <div className="text-[11px] text-[#A1A1AA] space-y-0.5 border-t border-b border-[#20202E] py-1.5">
                            {order.items.slice(0, 3).map((item, idx) => (
                              <div key={idx} className="flex justify-between truncate">
                                <span className="truncate">{item.quantity}x {item.productName}</span>
                                <span className="text-[10px] text-[#71717A] uppercase">{item.station}</span>
                              </div>
                            ))}
                            {order.items.length > 3 && (
                              <div className="text-[10px] text-[#FFC72C] font-semibold">
                                +{order.items.length - 3} outros itens...
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center justify-between pt-1 gap-1.5">
                            <div className="flex items-center gap-1">
                              {/* Cobrança Pix Dinâmico no Gateway */}
                              <motion.button
                                whileHover={{ scale: 1.15 }}
                                whileTap={{ scale: 0.9 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                                onClick={() => {
                                  setSelectedOrderForPayment(order);
                                  setIsGatewayModalOpen(true);
                                  playSoftClickSound();
                                }}
                                className={`p-2 min-h-[36px] min-w-[36px] rounded-lg transition-colors cursor-pointer flex items-center justify-center ${
                                  order.paymentStatus === 'paid'
                                    ? 'bg-[#00E676]/10 hover:bg-[#00E676]/20 text-[#00E676]'
                                    : 'bg-[#FFC72C]/15 hover:bg-[#FFC72C]/25 text-[#FFC72C] shadow-[0_0_10px_rgba(255,199,44,0.2)]'
                                }`}
                                title={order.paymentStatus === 'paid' ? 'Ver Comprovante Pix / Gateway' : 'Cobrar Pedido via QR Code Pix Dinâmico no Gateway'}
                              >
                                <QrCode className="w-3.5 h-3.5" />
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.15 }}
                                whileTap={{ scale: 0.9 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                                onClick={() => setPrintOrder(order)}
                                className="p-2 min-h-[36px] min-w-[36px] rounded-lg bg-[#20202E] hover:bg-[#2A2A3E] text-[#A1A1AA] hover:text-white transition-colors cursor-pointer flex items-center justify-center"
                                title="Imprimir Cupom de Cozinha"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.15 }}
                                whileTap={{ scale: 0.9 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                                onClick={() => handleSendWhatsApp(order)}
                                className="p-2 min-h-[36px] min-w-[36px] rounded-lg bg-[#00E676]/15 hover:bg-[#00E676]/25 text-[#00E676] transition-colors cursor-pointer flex items-center justify-center"
                                title="Notificar Cliente via WhatsApp (wa.me)"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.15 }}
                                whileTap={{ scale: 0.9 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                                onClick={() => {
                                  setSelectedOrderForShare(order);
                                  setIsShareModalOpen(true);
                                }}
                                className="p-2 min-h-[36px] min-w-[36px] rounded-lg bg-[#FFC72C]/10 hover:bg-[#FFC72C]/20 text-[#FFC72C] transition-colors cursor-pointer flex items-center justify-center"
                                title="Opções de Compartilhamento do Cardápio"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                              </motion.button>
                            </div>

                            {order.status !== 'completed' && (
                              <motion.button
                                whileHover={{ scale: 1.05, brightness: 1.1 }}
                                whileTap={{ scale: 0.94 }}
                                transition={{ type: 'spring', stiffness: 450, damping: 20 }}
                                onClick={() => handleAdvanceStatus(order)}
                                className="px-3 py-2 min-h-[36px] rounded-lg bg-gradient-to-r from-[#DA291C] to-[#E51A24] hover:from-[#B7180D] hover:to-[#DA291C] text-white text-[11px] font-black transition-all flex items-center justify-center gap-1 cursor-pointer shadow-[0_0_10px_rgba(218,41,28,0.4)] border border-[#FFC72C]/30"
                              >
                                <span>Avançar</span>
                                <ChevronRight className="w-3 h-3 text-[#FFC72C]" />
                              </motion.button>
                            )}
                          </div>
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Modal Compartilhar Cardápio */}
      <CompartilharCardapioModal
        isOpen={isShareModalOpen}
        onClose={() => {
          setIsShareModalOpen(false);
          setSelectedOrderForShare(null);
        }}
        initialTable={selectedOrderForShare?.tableNumber}
        initialCustomerName={selectedOrderForShare?.customerName}
        initialCustomerPhone={selectedOrderForShare?.customerPhone}
      />

      {/* Modal Gateway de Pagamentos & Pix Dinâmico com Baixa Automática */}
      <PaymentGatewayModal
        isOpen={isGatewayModalOpen}
        onClose={() => {
          setIsGatewayModalOpen(false);
          setSelectedOrderForPayment(null);
        }}
        existingOrder={selectedOrderForPayment}
        initialMethod="pix"
        onPaymentSuccess={() => {
          playCashRegister();
        }}
      />
    </div>
  );
};
