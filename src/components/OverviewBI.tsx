import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  DollarSign, 
  Receipt, 
  CookingPot, 
  Plus, 
  BookOpen, 
  ShoppingBag, 
  Layers, 
  Boxes, 
  TrendingUp, 
  Headphones, 
  Store, 
  ChevronRight,
  ArrowRight,
  Sparkles,
  Play,
  AlertTriangle,
  Download
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatBRL } from '../utils/formatters';
import { playBeep } from '../utils/audio';
import { GuiaAtivacaoTestes360 } from './GuiaAtivacaoTestes360';
import { DashboardDesempenho } from './DashboardDesempenho';
import { financialFirestoreService, SaleFirestore } from '../services/financialFirestoreService';

export const OverviewBI: React.FC = () => {
  const { 
    currentUser, 
    currentBranch, 
    tenant, 
    orders, 
    ingredients = [],
    isDemoMode,
    setCurrentView,
    openExportModal 
  } = useApp();

  const [isGuiaModalOpen, setIsGuiaModalOpen] = useState(false);
  const [isLoadingFirestore, setIsLoadingFirestore] = useState<boolean>(true);
  const [firestoreSales, setFirestoreSales] = useState<SaleFirestore[]>([]);

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Sincronização em tempo real com as vendas registradas no Firestore para a empresa autenticada
  useEffect(() => {
    const empresaId = tenant?.id || currentBranch?.tenantId || 'empresa_dulci';
    setIsLoadingFirestore(true);

    const unsubscribe = financialFirestoreService.subscribeSales(empresaId, (sales) => {
      const validSales = (sales || []).filter(s => 
        s && 
        (s.empresaId === empresaId || !s.empresaId || empresaId === 'empresa_dulci') &&
        (Number(s.grossTotal || s.netAmount || 0) > 0)
      );
      setFirestoreSales(validSales);
      setIsLoadingFirestore(false);
    });

    return () => unsubscribe();
  }, [tenant?.id, currentBranch?.tenantId]);

  // Insumos críticos (estoque <= mínimo de segurança)
  const criticalIngredients = useMemo(() => {
    return (ingredients || []).filter(ing => {
      const stock = Number(ing.currentStock || 0);
      const min = Number(ing.minimumStock ?? 1);
      return stock <= min;
    });
  }, [ingredients]);

  // 1. Pedidos reais de hoje
  const todayOrders = useMemo(() => {
    return orders.filter(o => {
      if (o.status === 'canceled' || (o.status as string) === 'cancelled') return false;
      const orderDate = o.createdAt ? o.createdAt.split('T')[0] : todayStr;
      return orderDate === todayStr;
    });
  }, [orders, todayStr]);

  const totalOrdersToday = todayOrders.length;

  // 2. Vendas reais de hoje no Firestore para a empresa autenticada
  const todayFirestoreSales = useMemo(() => {
    return firestoreSales.filter(s => {
      const sDate = s.saleDate || (s.createdAt ? s.createdAt.split('T')[0] : '');
      return sDate === todayStr;
    });
  }, [firestoreSales, todayStr]);

  // 3. Vendas reais de hoje (pedidos concluídos ou pagos)
  const todaySales = useMemo(() => {
    return todayOrders.filter(o => 
      o.status === 'completed' || 
      o.status === 'delivered' || 
      o.paymentStatus === 'paid'
    );
  }, [todayOrders]);

  const totalRevenueToday = useMemo(() => {
    if (isDemoMode) {
      return todaySales.reduce((acc, o) => acc + (o.total || (o as any).totalPrice || 0), 0);
    }
    // No modo real, o faturamento vem rigorosamente do Firestore
    return todayFirestoreSales.reduce((acc, s) => acc + (s.grossTotal || s.netAmount || 0), 0);
  }, [isDemoMode, todaySales, todayFirestoreSales]);

  // 4. Pedidos em preparo ou pendentes na fila operacional
  const inPrepOrders = useMemo(() => {
    return todayOrders.filter(o => 
      o.status === 'preparing' || 
      o.status === 'pending' || 
      o.status === 'recebido' || 
      o.status === 'ready'
    );
  }, [todayOrders]);

  const inPrepCount = inPrepOrders.length;

  // Saudação humanizada por horário
  const getGreeting = () => {
    const hour = now.getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const userName = currentUser?.name?.split(' ')[0] || 'Regeane';
  const establishmentName = tenant?.name || currentBranch?.name || 'Lanchonete Dulci';

  const formatChannel = (ch: string, table?: number) => {
    switch (ch) {
      case 'delivery_whatsapp': return 'WhatsApp Delivery';
      case 'cardapio_online': return 'Cardápio Online';
      case 'pdv_balcao':
      case 'balcao': return 'Balcão';
      case 'mesa': return table ? `Mesa ${table}` : 'Mesa';
      case 'atendente_mesa': return 'Atendente';
      case 'delivery_web': return 'Delivery';
      default: return ch || 'Balcão';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
      case 'recebido': return { label: 'Novo', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
      case 'preparing': return { label: 'Em preparo', color: 'text-orange-400 bg-orange-500/10 border-orange-500/30' };
      case 'ready': return { label: 'Pronto', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
      case 'delivering': return { label: 'Em entrega', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' };
      case 'completed':
      case 'delivered': return { label: 'Finalizado', color: 'text-zinc-400 bg-zinc-800 border-zinc-700' };
      default: return { label: status, color: 'text-zinc-400 bg-zinc-800 border-zinc-700' };
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16 font-sans text-zinc-100">
      
      {/* ========================================================================= */}
      {/* 1. CABEÇALHO MINIMALISTA: SAUDAÇÃO & AÇÕES PRINCIPAIS                     */}
      {/* ========================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-zinc-800/80">
        
        {/* Bloco de Saudação */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Store className="w-3.5 h-3.5 text-[#FFC72C]" />
            <span className="font-semibold text-zinc-300">{establishmentName}</span>
            <span>•</span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {totalOrdersToday === 0 ? 'Tudo pronto para começar' : 'Operação ativa hoje'}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {getGreeting()}, {userName}.
          </h1>

          <p className="text-xs sm:text-sm text-zinc-400 font-medium">
            {totalOrdersToday === 0 
              ? 'Do balcão à cozinha, seu negócio no ritmo da casa.'
              : `${totalOrdersToday} pedido(s) registrado(s) hoje na unidade.`}
          </p>
        </div>

        {/* Ações Principais (Apenas o Essencial) */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              setCurrentView('pdv');
              playBeep(800, 0.04);
            }}
            className="flex items-center gap-2 px-4.5 py-2.5 rounded-xl bg-gradient-to-r from-[#DA291C] to-[#E51A24] text-white text-xs sm:text-sm font-bold shadow-[0_0_15px_rgba(218,41,28,0.35)] border border-[#FFC72C]/30 hover:brightness-110 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#FFC72C]" />
            <span>Novo Pedido</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              setCurrentView('cardapio_digital');
              playBeep(850, 0.04);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#14141E] hover:bg-[#1C1C28] text-zinc-200 hover:text-white text-xs sm:text-sm font-medium border border-zinc-800 transition-all cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-zinc-400" />
            <span>Cardápio</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              setCurrentView('central_pedidos');
              playBeep(850, 0.04);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#14141E] hover:bg-[#1C1C28] text-zinc-200 hover:text-white text-xs sm:text-sm font-medium border border-zinc-800 transition-all cursor-pointer"
          >
            <Layers className="w-4 h-4 text-zinc-400" />
            <span>Ver Pedidos</span>
            {totalOrdersToday > 0 && (
              <span className="ml-1 px-1.5 py-0.2 text-[10px] font-mono font-bold rounded bg-[#FFC72C]/20 text-[#FFC72C]">
                {totalOrdersToday}
              </span>
            )}
          </motion.button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CENTRAL DE IMPLANTAÇÃO E TESTES 360° (4 PILARES INTEGRADOS)               */}
      {/* ========================================================================= */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#181524] via-[#1C182E] to-[#141220] border border-[#3A2E5E]/80 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#FFC72C] to-[#FF7A00] text-black font-black flex items-center justify-center shrink-0 shadow-lg">
            <Sparkles className="w-5 h-5 text-black" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-white text-sm sm:text-base">Guia de Ativação & Testes 360°</span>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/30">
                4 Pilares Prontos
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              1. Teste de Ponta a Ponta (Caixa & Pedido Real) • 2. Dados da Empresa & Mesas • 3. Gateways Pix • 4. Impressora ESC/POS
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setIsGuiaModalOpen(true);
            playBeep(900, 0.05);
          }}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FFC72C] to-[#FF9900] hover:brightness-110 text-black text-xs font-black shadow-[0_0_15px_rgba(255,199,44,0.35)] transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 self-stretch sm:self-auto justify-center shrink-0"
        >
          <Play className="w-3.5 h-3.5 fill-black" />
          <span>EXECUTAR TESTES & CONFIGURAÇÕES</span>
        </button>
      </div>

      {/* Alerta Visual de Estoque Crítico (Disparado quando estoque <= mínimo de segurança) */}
      {criticalIngredients.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#DA291C]/20 via-[#FF6B00]/15 to-transparent border border-[#DA291C]/50 shadow-[0_0_20px_rgba(218,41,28,0.2)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#DA291C]/30 border border-[#DA291C]/60 text-[#FF4D4F] flex items-center justify-center shrink-0 animate-pulse">
              <AlertTriangle className="w-5 h-5 text-[#FF4D4F]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-white text-sm">
                  Alerta de Estoque: {criticalIngredients.length} Insumo{criticalIngredients.length > 1 ? 's' : ''} em Nível Crítico
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#DA291C]/30 text-[#FF4D4F] border border-[#DA291C]/40">
                  Abaixo do Mínimo Seguro
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                {criticalIngredients.slice(0, 4).map(ing => (
                  <span key={ing.id} className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-black/40 border border-zinc-700/60 text-zinc-300">
                    <strong className="text-white font-sans">{ing.name}:</strong> <span className="text-[#FF4D4F] font-bold">{ing.currentStock} {ing.unit}</span> (mín. {ing.minimumStock || 1})
                  </span>
                ))}
                {criticalIngredients.length > 4 && (
                  <span className="text-[11px] text-zinc-400">+{criticalIngredients.length - 4} outros</span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              playBeep(850, 0.04);
              setCurrentView('estoque_cmv');
            }}
            className="px-4 py-2.5 rounded-xl bg-[#FFC72C] hover:bg-[#FFD700] text-black text-xs font-black transition-all cursor-pointer whitespace-nowrap self-stretch sm:self-auto text-center shrink-0 shadow-sm"
          >
            Gerenciar Estoque →
          </button>
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* 2. OPERAÇÃO DE HOJE: 3 INDICADORES ESSENCIAIS                              */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Operação de Hoje
          </h2>
          <span className="text-[11px] text-zinc-500 font-mono">
            {now.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          {/* Card 1: Pedidos Hoje */}
          <div className="p-5 rounded-2xl bg-[#12121A] border border-zinc-800/80 hover:border-zinc-700 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-semibold">Pedidos hoje</span>
              <Receipt className="w-4 h-4 text-zinc-500" />
            </div>
            <div className="mt-4">
              <div className="text-3xl font-black font-mono text-white tracking-tight">
                {totalOrdersToday}
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">
                {totalOrdersToday === 0 ? 'Nenhum pedido hoje' : `${totalOrdersToday} pedido(s) registrado(s)`}
              </p>
            </div>
          </div>

          {/* Card 2: Vendas Hoje */}
          <div className="p-5 rounded-2xl bg-[#12121A] border border-zinc-800/80 hover:border-zinc-700 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-semibold">Vendas hoje</span>
              <DollarSign className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="mt-4">
              {isLoadingFirestore ? (
                <div className="h-9 w-32 bg-zinc-800/80 rounded-lg animate-pulse my-0.5" />
              ) : (
                <div className="text-3xl font-black font-mono text-emerald-400 tracking-tight">
                  {formatBRL(totalRevenueToday)}
                </div>
              )}
              <p className="text-[11px] text-zinc-500 mt-1">
                {isLoadingFirestore 
                  ? 'Verificando Firestore...' 
                  : totalRevenueToday === 0 
                    ? 'Sem faturamento liquidado' 
                    : `${todayFirestoreSales.length || todaySales.length} venda(s) no Firestore`}
              </p>
            </div>
          </div>

          {/* Card 3: Em Preparo */}
          <div className="p-5 rounded-2xl bg-[#12121A] border border-zinc-800/80 hover:border-zinc-700 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-semibold">Em preparo</span>
              <CookingPot className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-4">
              <div className="text-3xl font-black font-mono text-amber-400 tracking-tight">
                {inPrepCount}
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">
                {inPrepCount === 0 ? 'Fila de cozinha vazia' : `${inPrepCount} pedido(s) em andamento`}
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* DASHBOARD DE DESEMPENHO & EVOLUÇÃO DE VENDAS VS META (D3.JS)              */}
      {/* ========================================================================= */}
      <DashboardDesempenho />

      {/* ========================================================================= */}
      {/* 3. SEUS PEDIDOS (ESTADO VAZIO LIMPO OU LISTA MINIMALISTA)                   */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Seus Pedidos
          </h2>
          {todayOrders.length > 0 && (
            <button
              onClick={() => {
                setCurrentView('central_pedidos');
                playBeep(850, 0.04);
              }}
              className="text-xs text-[#FFC72C] hover:underline flex items-center gap-1 cursor-pointer font-medium"
            >
              <span>Ver todos na Central</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {todayOrders.length === 0 ? (
          /* Estado Vazio Minimalista e Humanizado */
          <div className="p-8 sm:p-12 rounded-2xl bg-[#12121A] border border-zinc-800/80 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-zinc-800/60 text-zinc-400 flex items-center justify-center mx-auto border border-zinc-700/60">
              <ShoppingBag className="w-5 h-5 text-zinc-300" />
            </div>
            
            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                Do balcão à cozinha, seu negócio no ritmo da casa.
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Ainda não há pedidos registrados. Assim que entrarem novos pedidos via WhatsApp, Cardápio Online, Delivery ou Balcão com os Atendentes, eles aparecerão aqui em tempo real.
              </p>
            </div>

            <div className="pt-2">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setCurrentView('pdv');
                  playBeep(800, 0.04);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold border border-zinc-700 cursor-pointer transition-all"
              >
                <Plus className="w-3.5 h-3.5 text-[#FFC72C]" />
                <span>Fazer Primeiro Pedido</span>
              </motion.button>
            </div>
          </div>
        ) : (
          /* Lista Minimalista de Pedidos Reais de Hoje */
          <div className="rounded-2xl bg-[#12121A] border border-zinc-800/80 divide-y divide-zinc-800/60 overflow-hidden">
            {todayOrders.slice(0, 5).map(order => {
              const statusCfg = getStatusLabel(order.status);
              return (
                <div 
                  key={order.id}
                  onClick={() => {
                    setCurrentView('central_pedidos');
                    playBeep(850, 0.04);
                  }}
                  className="p-4 sm:p-4.5 hover:bg-zinc-800/30 transition-colors flex items-center justify-between gap-4 cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className="font-mono font-bold text-sm text-[#FFC72C] shrink-0">
                      {order.displayCode}
                    </span>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-white truncate">
                          {order.customerName || 'Cliente'}
                        </span>
                        <span className="text-[10px] text-zinc-400 bg-zinc-800 px-1.5 py-0.2 rounded">
                          {formatChannel(order.channel, order.tableNumber)}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 truncate">
                        {order.items?.map(it => `${it.quantity}x ${it.productName || (it as any).name}`).join(', ') || 'Sem itens'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusCfg.color}`}>
                      {statusCfg.label}
                    </span>
                    <span className="font-mono font-bold text-xs text-white">
                      {formatBRL(order.total)}
                    </span>
                    <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. ATALHOS RÁPIDOS DA OPERAÇÃO                                             */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
          Atalhos
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          
          {/* Atalho 1: Cardápio */}
          <button
            onClick={() => {
              setCurrentView('cardapio_digital');
              playBeep(850, 0.04);
            }}
            className="p-4 rounded-xl bg-[#12121A] border border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-800/40 transition-all text-left space-y-2 cursor-pointer group"
          >
            <BookOpen className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
            <div>
              <div className="text-xs font-bold text-white">Cardápio</div>
              <p className="text-[11px] text-zinc-500">Produtos e preços</p>
            </div>
          </button>

          {/* Atalho 2: Estoque */}
          <button
            onClick={() => {
              setCurrentView('estoque_cmv');
              playBeep(850, 0.04);
            }}
            className="p-4 rounded-xl bg-[#12121A] border border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-800/40 transition-all text-left space-y-2 cursor-pointer group"
          >
            <Boxes className="w-5 h-5 text-orange-400 group-hover:scale-110 transition-transform" />
            <div>
              <div className="text-xs font-bold text-white">Estoque</div>
              <p className="text-[11px] text-zinc-500">Insumos e CMV</p>
            </div>
          </button>

          {/* Atalho 3: Financeiro */}
          <button
            onClick={() => {
              setCurrentView('financeiro_dre');
              playBeep(850, 0.04);
            }}
            className="p-4 rounded-xl bg-[#12121A] border border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-800/40 transition-all text-left space-y-2 cursor-pointer group"
          >
            <TrendingUp className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
            <div>
              <div className="text-xs font-bold text-white">Financeiro</div>
              <p className="text-[11px] text-zinc-500">DRE e fluxo de caixa</p>
            </div>
          </button>

          {/* Atalho 4: Auditoria & Suporte */}
          <button
            onClick={() => {
              setCurrentView('auditoria');
              playBeep(850, 0.04);
            }}
            className="p-4 rounded-xl bg-[#12121A] border border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-800/40 transition-all text-left space-y-2 cursor-pointer group"
          >
            <Headphones className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
            <div>
              <div className="text-xs font-bold text-white">Auditoria & Suporte</div>
              <p className="text-[11px] text-zinc-500">Logs e chamados 24h</p>
            </div>
          </button>

          {/* Atalho 5: Backup & Exportação de Dados */}
          <button
            onClick={() => {
              playBeep(850, 0.04);
              openExportModal('completo');
            }}
            className="p-4 rounded-xl bg-[#12121A] border border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-800/40 transition-all text-left space-y-2 cursor-pointer group col-span-2 sm:col-span-1"
          >
            <Download className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
            <div>
              <div className="text-xs font-bold text-white">Backup Operacional</div>
              <p className="text-[11px] text-zinc-500">Exportar CSV/Excel</p>
            </div>
          </button>

        </div>
      </div>

      {/* Modal Guia de Ativação e Testes 360° */}
      <GuiaAtivacaoTestes360 
        isOpen={isGuiaModalOpen} 
        onClose={() => setIsGuiaModalOpen(false)} 
      />

    </div>
  );
};
