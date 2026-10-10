import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CookingPot, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Flame, 
  Filter, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Timer, 
  UtensilsCrossed, 
  Zap, 
  ShieldCheck, 
  Check,
  Printer,
  Wifi,
  BellRing,
  RefreshCw,
  Sliders
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { KitchenStation, Order, OrderItem } from '../types';
import { playBeep, playKitchenBell } from '../utils/audio';
import { thermalPrinterService } from '../services/escposService';
import { ThermalPrinterSettingsModal } from './ThermalPrinterSettingsModal';

const stations: { id: KitchenStation; label: string; icon: string; color: string }[] = [
  { id: 'all', label: 'Todas as Praças', icon: '🍽️', color: 'text-white' },
  { id: 'grill', label: 'Parrilla & Burgers', icon: '🥩', color: 'text-[#DA291C]' },
  { id: 'fryer', label: 'Fritura & Batatas', icon: '🍟', color: 'text-[#FFC72C]' },
  { id: 'assembly', label: 'Montagem & Pizzas', icon: '🍕', color: 'text-[#FF6B00]' },
  { id: 'bar', label: 'Bar & Shakes', icon: '🥤', color: 'text-[#00D2FF]' },
  { id: 'dessert', label: 'Açaí & Sobremesas', icon: '🍧', color: 'text-[#E11D48]' },
];

export const KDSKitchen: React.FC = () => {
  const { orders, updateOrderStatus, ingredients = [], setCurrentView } = useApp();
  const [selectedStation, setSelectedStation] = useState<KitchenStation>('all');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoPrintEnabled, setAutoPrintEnabled] = useState(true);
  const [isPrinterSettingsOpen, setIsPrinterSettingsOpen] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Insumos críticos (estoque <= mínimo de segurança)
  const criticalIngredients = useMemo(() => {
    return (ingredients || []).filter(ing => {
      const stock = Number(ing.currentStock || 0);
      const min = Number(ing.minimumStock ?? 1);
      return stock <= min;
    });
  }, [ingredients]);

  // Print feedback toast state
  const [printFeedback, setPrintFeedback] = useState<{
    orderCode: string;
    printerName: string;
    bytesCount: number;
    message: string;
    hexPreview?: string;
  } | null>(null);

  // Keep track of printed order IDs to auto-print new orders only once
  const printedOrderIdsRef = useRef<Set<string>>(new Set());

  // Update live timer clock every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);

  // Filter kitchen active orders
  const kitchenOrders = useMemo(() => {
    return orders
      .filter(o => o.status === 'preparing' || o.status === 'pending' || o.status === 'recebido')
      .filter(o => {
        if (selectedStation === 'all') return true;
        return o.items.some(item => item.station === selectedStation);
      });
  }, [orders, selectedStation]);

  // Pix confirmed count
  const pixPaidCount = useMemo(() => {
    return kitchenOrders.filter(o => o.paymentMethod === 'pix' && o.paymentStatus === 'paid').length;
  }, [kitchenOrders]);

  // Auto-print new orders when they enter the kitchen
  useEffect(() => {
    if (!autoPrintEnabled) return;

    kitchenOrders.forEach(order => {
      if (!printedOrderIdsRef.current.has(order.id)) {
        printedOrderIdsRef.current.add(order.id);
        // Automatically dispatch ESC/POS to kitchen printer
        thermalPrinterService.dispatchKitchenOrder(order).then(res => {
          if (soundEnabled) playKitchenBell();
          setPrintFeedback({
            orderCode: order.displayCode,
            printerName: res.targetPrinter,
            bytesCount: res.bytesCount,
            message: `Auto-impressão: ${res.message}`,
            hexPreview: res.hexPreview,
          });
          setTimeout(() => setPrintFeedback(null), 4000);
        });
      }
    });
  }, [kitchenOrders, autoPrintEnabled, soundEnabled]);

  const handleMarkAsReady = (order: Order) => {
    if (soundEnabled) playKitchenBell();
    updateOrderStatus(order.id, 'ready');
  };

  const handlePrintToKitchen = async (order: Order, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (soundEnabled) playKitchenBell();

    const res = await thermalPrinterService.dispatchKitchenOrder(order, undefined, {
      stationFilter: selectedStation,
      isReprint: printedOrderIdsRef.current.has(order.id),
    });

    printedOrderIdsRef.current.add(order.id);

    setPrintFeedback({
      orderCode: order.displayCode,
      printerName: res.targetPrinter,
      bytesCount: res.bytesCount,
      message: res.message,
      hexPreview: res.hexPreview,
    });
    setTimeout(() => setPrintFeedback(null), 5000);
  };

  const handleTestKitchenPrinter = async () => {
    if (soundEnabled) playKitchenBell();
    const printer = thermalPrinterService.getKitchenPrinter();
    const res = await thermalPrinterService.testKitchenPrinter(printer);

    setPrintFeedback({
      orderCode: 'TESTE-ESC/POS',
      printerName: res.targetPrinter,
      bytesCount: res.bytesCount,
      message: 'Comanda de teste com alarme sonoro enviada com sucesso.',
      hexPreview: res.hexPreview,
    });
    setTimeout(() => setPrintFeedback(null), 5000);
  };

  // Helper for order preparation elapsed time
  const getElapsedMinutes = (createdAt: string) => {
    const created = new Date(createdAt).getTime();
    return Math.max(0, Math.floor((now - created) / 60000));
  };

  // Timer status styling
  const getTimeStatus = (minutes: number) => {
    if (minutes > 18) {
      return {
        badge: 'bg-[#DA291C] text-white animate-pulse border-2 border-[#FFC72C]',
        cardBorder: 'border-[#DA291C] shadow-[0_0_20px_rgba(218,41,28,0.4)]',
        label: 'Atrasado!',
      };
    }
    if (minutes > 10) {
      return {
        badge: 'bg-[#FF6B00] text-white border border-[#FFC72C]/40',
        cardBorder: 'border-[#FF6B00] shadow-[0_0_15px_rgba(255,107,0,0.3)]',
        label: 'Atenção',
      };
    }
    return {
      badge: 'bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/30',
      cardBorder: 'border-[#242436]',
      label: 'No Prazo',
    };
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-12 select-none">
      {/* Top Header: McDonald's Kitchen Terminal */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-[#12121A] border border-[#222234] shadow-xl">
        <div className="flex items-center gap-3 sm:gap-3.5">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-[#FFC72C] to-[#DA291C] text-[#0B0B0F] flex items-center justify-center shadow-[0_0_18px_rgba(255,199,44,0.4)] border border-[#FFC72C]/50 shrink-0">
            <CookingPot className="w-5 h-5 sm:w-6 sm:h-6 text-[#DA291C]" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-black font-display text-white tracking-tight flex items-center gap-2 flex-wrap">
              <span>Cozinha em Tempo Real</span>
              <span className="text-xs font-mono font-bold bg-[#DA291C]/20 text-[#FFC72C] px-2.5 py-0.5 rounded-full border border-[#FFC72C]/30">
                {kitchenOrders.length} na fila
              </span>
              {pixPaidCount > 0 && (
                <span className="text-xs font-mono font-bold bg-[#00E676]/20 text-[#00E676] px-2.5 py-0.5 rounded-full border border-[#00E676]/40 flex items-center gap-1 shadow-[0_0_12px_rgba(0,230,118,0.25)]">
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  {pixPaidCount} Pix Confirmado{pixPaidCount > 1 ? 's' : ''}
                </span>
              )}
            </h1>
            <p className="text-xs text-[#A1A1AA] mt-0.5">Visualização de alta velocidade com protocolo ESC/POS direto para impressora da cozinha</p>
          </div>
        </div>

        {/* Action Controls & ESC/POS Status Bar */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap w-full lg:w-auto justify-start lg:justify-end">
          {/* Printer Status Badge */}
          <div className="flex items-center gap-2 px-3 py-2 min-h-[40px] rounded-2xl bg-[#161624] border border-[#2B2B3E] text-xs">
            <span className="w-2 h-2 rounded-full bg-[#00E676] animate-ping shrink-0" />
            <Printer className="w-3.5 h-3.5 text-[#FFC72C] shrink-0" />
            <span className="text-zinc-300 font-bold hidden sm:inline">Cozinha (ESC/POS):</span>
            <span className="text-[#00E676] font-mono font-black">192.168.1.210:9100</span>
          </div>

          {/* Test Kitchen Printer Button */}
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleTestKitchenPrinter}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 min-h-[40px] rounded-2xl text-xs font-black bg-[#1E1E2E] hover:bg-[#28283C] text-white border border-[#35354A] transition-all cursor-pointer shadow-md"
            title="Enviar comanda de teste para a impressora física da cozinha"
          >
            <BellRing className="w-3.5 h-3.5 text-[#FFC72C] shrink-0" />
            <span>Testar Impressora</span>
          </motion.button>

          {/* Auto Print Toggle */}
          <button
            type="button"
            onClick={() => {
              setAutoPrintEnabled(!autoPrintEnabled);
              playBeep(700, 0.03);
            }}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 min-h-[40px] rounded-2xl text-xs font-bold transition-all cursor-pointer border ${
              autoPrintEnabled
                ? 'bg-[#FFC72C]/15 text-[#FFC72C] border-[#FFC72C]/40 shadow-[0_0_10px_rgba(255,199,44,0.2)]'
                : 'bg-[#181824] text-[#71717A] border-[#252536]'
            }`}
          >
            <Printer className="w-3.5 h-3.5 shrink-0" />
            <span>{autoPrintEnabled ? 'Auto-Imprimir: ON' : 'Auto-Imprimir: OFF'}</span>
          </button>

          {/* Audio Alert Toggle */}
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 500, damping: 22 }}
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              playBeep(880, 0.03);
            }}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 min-h-[40px] rounded-2xl text-xs font-bold transition-all cursor-pointer border ${
              soundEnabled
                ? 'bg-[#181826] text-[#00E676] border-[#00E676]/40 shadow-[0_0_10px_rgba(0,230,118,0.2)]'
                : 'bg-[#181824] text-[#71717A] border-[#252536]'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{soundEnabled ? 'Sons Ativos' : 'Mudo'}</span>
          </motion.button>

          {/* Settings shortcut */}
          <button
            onClick={() => setIsPrinterSettingsOpen(true)}
            className="p-2.5 min-h-[40px] min-w-[40px] rounded-2xl bg-[#1A1A28] hover:bg-[#252538] text-zinc-300 hover:text-white border border-[#303046] transition-all cursor-pointer shadow-md flex items-center justify-center"
            title="Ajustar portas, largura da bobina e roteamento ESC/POS"
          >
            <Sliders className="w-4 h-4 text-[#FFC72C]" />
          </button>
        </div>
      </div>

      {/* Alerta Visual de Insumos em Nível Crítico (Disparado quando estoque <= mínimo de segurança) */}
      {criticalIngredients.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-[#DA291C]/25 via-[#FF6B00]/15 to-[#12121A] border border-[#DA291C]/60 shadow-[0_0_25px_rgba(218,41,28,0.25)] space-y-2.5"
        >
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#DA291C] text-white flex items-center justify-center animate-pulse shadow-md">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <span className="font-black text-white text-xs sm:text-sm tracking-wide block">
                  🚨 ALERTA DA COZINHA: {criticalIngredients.length} INSUMO{criticalIngredients.length > 1 ? 'S' : ''} EM NÍVEL CRÍTICO
                </span>
                <span className="text-[11px] text-[#FFA39E]">
                  Estoque atingiu ou rompeu o nível mínimo de segurança definido na operação.
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                playBeep(850, 0.04);
                setCurrentView('estoque_cmv');
              }}
              className="px-3.5 py-1.5 rounded-xl bg-[#FFC72C] hover:bg-[#FFD700] text-black text-xs font-black transition-all cursor-pointer shadow-sm flex items-center gap-1.5 ml-auto"
            >
              <span>Gerenciar Estoque / CMV</span>
              <span>→</span>
            </button>
          </div>

          {/* Badges de cada ingrediente com estoque restante e mínimo */}
          <div className="flex items-center gap-2 flex-wrap pt-0.5">
            {criticalIngredients.map(ing => (
              <div
                key={ing.id}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#181119] border border-[#DA291C]/50 text-white font-mono text-xs shadow-xs"
              >
                <span className="w-2 h-2 rounded-full bg-[#DA291C] animate-ping shrink-0" />
                <span className="font-sans font-bold text-white">{ing.name}:</span>
                <span className="text-[#FF4D4F] font-black">{ing.currentStock} {ing.unit}</span>
                <span className="text-[#888899] text-[10px]">(mín. {ing.minimumStock || 1} {ing.unit})</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Station Selector Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 scrollbar-none">
        {stations.map(st => {
          const isSelected = selectedStation === st.id;
          const count = st.id === 'all' 
            ? kitchenOrders.length 
            : kitchenOrders.filter(o => o.items.some(it => it.station === st.id)).length;

          return (
            <button
              key={st.id}
              onClick={() => {
                setSelectedStation(st.id);
                playBeep(750, 0.02);
              }}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 min-h-[42px] rounded-xl sm:rounded-2xl text-xs font-black transition-all whitespace-nowrap cursor-pointer border shrink-0 ${
                isSelected
                  ? 'bg-gradient-to-r from-[#DA291C] to-[#FF6B00] text-white border-[#FFC72C]/40 shadow-[0_0_15px_rgba(218,41,28,0.35)]'
                  : 'bg-[#12121A] text-[#A1A1AA] border-[#242436] hover:text-white hover:bg-[#1A1A26]'
              }`}
            >
              <span>{st.icon}</span>
              <span>{st.label}</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                isSelected ? 'bg-white/20 text-white' : 'bg-[#20202E] text-[#71717A]'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Grid of Active Orders */}
      <AnimatePresence mode="popLayout">
        {kitchenOrders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-8 sm:p-12 rounded-2xl sm:rounded-3xl bg-[#12121A] border border-[#242436] text-center space-y-3 shadow-xl"
          >
            <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-3xl bg-[#1A1A28] border border-[#2D2D42] flex items-center justify-center text-3xl shadow-inner">
              ✨
            </div>
            <h3 className="text-base sm:text-lg font-black text-white">Nenhum pedido em espera nesta praça!</h3>
            <p className="text-xs text-[#71717A] max-w-sm mx-auto">
              Todas as comandas e hambúrgueres foram finalizados e entregues. Novos pedidos aparecerão aqui e serão impressos automaticamente via ESC/POS.
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {kitchenOrders.map(order => {
              const elapsed = getElapsedMinutes(order.createdAt);
              const status = getTimeStatus(elapsed);

              const itemsToRender = selectedStation === 'all'
                ? order.items
                : order.items.filter(it => it.station === selectedStation);

              if (itemsToRender.length === 0) return null;

              return (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, scale: 0.92, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.88, y: -15 }}
                  whileHover={{ scale: 1.015, y: -2 }}
                  transition={{ 
                    layout: { type: 'spring', stiffness: 350, damping: 30 },
                    opacity: { duration: 0.2 },
                    scale: { duration: 0.2 }
                  }}
                  className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-[#12121A] border transition-all flex flex-col justify-between min-h-[340px] sm:min-h-[380px] shadow-xl ${status.cardBorder}`}
                >
                  {/* Card Header: Code & Timer */}
                  <div>
                    <div className="flex items-center justify-between pb-2.5 border-b border-[#20202E]">
                      <div>
                        <span className="text-lg font-black font-mono text-[#FFC72C] block">
                          {order.displayCode}
                        </span>
                        <span className="text-[11px] font-bold text-[#A1A1AA] uppercase">
                          {order.channel === 'mesa' ? `Mesa #${order.tableNumber?.toString().padStart(2, '0')}` : order.channel}
                        </span>
                      </div>

                      {/* Timer Badge */}
                      <div className={`px-2.5 py-1 rounded-xl text-xs font-mono font-black flex items-center gap-1 ${status.badge}`}>
                        <Clock className="w-3.5 h-3.5" />
                        <span>{elapsed} min</span>
                      </div>
                    </div>

                    {/* Customer Note / Observations */}
                    <div className="py-2 text-xs font-bold text-white flex items-center justify-between">
                      <span className="truncate">{order.customerName}</span>
                      <span className="text-[10px] font-mono text-[#71717A]">{itemsToRender.length} itens</span>
                    </div>

                    {/* Pix Payment Confirmation Badge */}
                    {order.paymentMethod === 'pix' && order.paymentStatus === 'paid' && (
                      <div className="mb-2 py-1 px-2.5 rounded-xl bg-[#00E676]/15 border border-[#00E676]/35 text-[#00E676] flex items-center justify-between text-[10px] font-mono shadow-[0_0_10px_rgba(0,230,118,0.15)]">
                        <div className="flex items-center gap-1.5 font-black">
                          <Zap className="w-3 h-3 fill-current" />
                          <span>PIX CONFIRMADO</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-bold">
                          {order.pixTxId && <span className="text-zinc-400">Tx: {order.pixTxId}</span>}
                          <span className="text-white">R$ {order.total.toFixed(2)}</span>
                        </div>
                      </div>
                    )}

                    {/* Items List for this station */}
                    <div className="space-y-2 py-2 border-t border-[#20202E]">
                      {itemsToRender.map((item, idx) => {
                        const criticalMatch = criticalIngredients.find(ing => {
                          const pName = (item.productName || '').toLowerCase();
                          const ingName = (ing.name || '').toLowerCase();
                          return pName.includes(ingName) || ingName.includes(pName);
                        });

                        return (
                          <div
                            key={idx}
                            className={`p-2.5 rounded-2xl border flex items-start justify-between gap-2 transition-colors ${
                              criticalMatch ? 'bg-[#1D141C] border-[#DA291C]/50' : 'bg-[#161624] border-[#262638]'
                            }`}
                          >
                            <div className="flex-1">
                              <div className="text-xs font-black text-white">
                                <span className="text-[#FFC72C] font-mono mr-1.5">{item.quantity}x</span>
                                <span>{item.productName}</span>
                              </div>
                              {item.notes && (
                                <div className="text-[10px] text-[#FF6B00] mt-0.5 font-bold">
                                  ⚠️ Obs: {item.notes}
                                </div>
                              )}
                              {criticalMatch && (
                                <div className="inline-flex items-center gap-1 text-[9px] font-black text-[#FF4D4F] bg-[#DA291C]/25 border border-[#DA291C]/40 px-1.5 py-0.5 rounded-md mt-1">
                                  <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                                  <span>Insumo Crítico: {criticalMatch.name} ({criticalMatch.currentStock} {criticalMatch.unit})</span>
                                </div>
                              )}
                            </div>
                            <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-lg bg-[#20202E] text-[#A1A1AA]">
                              {item.station}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Dual Action Buttons: Print ESC/POS Ticket & Complete */}
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-2 border-t border-[#20202E]">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={(e) => handlePrintToKitchen(order, e)}
                      className="py-3 px-2 min-h-[44px] rounded-2xl bg-[#1B1B2C] hover:bg-[#25253C] border border-[#34344E] text-white font-bold text-[11px] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                      title="Imprimir comanda térmica ESC/POS na impressora da cozinha"
                    >
                      <Printer className="w-3.5 h-3.5 text-[#FFC72C] shrink-0" />
                      <span>Imprimir</span>
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.03, brightness: 1.08 }}
                      whileTap={{ scale: 0.95 }}
                      transition={{ type: 'spring', stiffness: 450, damping: 20 }}
                      onClick={() => handleMarkAsReady(order)}
                      className="py-3 px-2 min-h-[44px] rounded-2xl bg-gradient-to-r from-[#00E676] to-[#10B981] hover:from-[#00C853] hover:to-[#00E676] text-[#09090D] font-black text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer shadow-[0_0_15px_rgba(0,230,118,0.4)]"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Concluir</span>
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>

      {/* Floating ESC/POS Dispatch Feedback Toast */}
      <AnimatePresence>
        {printFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.9 }}
            className="fixed bottom-4 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 z-50 max-w-sm sm:max-w-md bg-[#161628] border-2 border-[#FFC72C] rounded-2xl sm:rounded-3xl p-4 shadow-[0_10px_35px_rgba(0,0,0,0.8)] text-white space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-xs sm:text-sm text-[#FFC72C]">
                <Printer className="w-4 h-4 text-[#FFC72C] shrink-0" />
                <span>Comanda Despachada para Cozinha!</span>
              </div>
              <button
                onClick={() => setPrintFeedback(null)}
                className="text-zinc-400 hover:text-white text-xs px-2 py-1 min-h-[32px] cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="text-xs text-zinc-300">
              <p><strong>Pedido:</strong> {printFeedback.orderCode} • <strong>Destino:</strong> {printFeedback.printerName}</p>
              <p className="text-[11px] text-zinc-400 mt-1 font-mono">
                Protocolo ESC/POS • {printFeedback.bytesCount} bytes • Campainha acionada • Corte automático
              </p>
            </div>
            {printFeedback.hexPreview && (
              <details className="text-[10px] text-zinc-400 bg-black/40 p-2 rounded-xl border border-zinc-800 font-mono">
                <summary className="cursor-pointer text-[#FFC72C] font-bold">Inspecionar Bytes ESC/POS (Hex Dump)</summary>
                <div className="mt-1 break-all select-all text-zinc-400">{printFeedback.hexPreview}</div>
              </details>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Embedded Thermal Printer Settings Modal */}
      <ThermalPrinterSettingsModal
        isOpen={isPrinterSettingsOpen}
        onClose={() => setIsPrinterSettingsOpen(false)}
      />
    </div>
  );
};
