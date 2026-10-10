import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wallet, 
  CreditCard, 
  QrCode, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock, 
  Calendar, 
  Filter, 
  Download, 
  RefreshCw, 
  Zap, 
  CheckCircle2, 
  AlertCircle, 
  Printer, 
  Search, 
  ChevronRight, 
  PieChart as PieIcon, 
  BarChart3, 
  Layers, 
  Receipt, 
  Smartphone, 
  Store, 
  ShoppingBag,
  ExternalLink,
  ShieldCheck,
  Percent,
  Sparkles,
  Info,
  X,
  FileSpreadsheet,
  FileText,
  Target,
  Sliders,
  Settings,
  Radio,
  Banknote,
  CheckCheck,
  Send,
  AlertTriangle,
  ArrowRight,
  Database,
  Activity,
  Check,
  Key,
  Building2
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import { useApp } from '../context/AppContext';
import { Order, PaymentMethod, FinancialEntry, CashSession } from '../types';
import { formatBRL, formatPercent, formatDateTime, formatTimeOnly } from '../utils/formatters';
import { playCashRegister, playBeep, playKitchenBell } from '../utils/audio';
import { thermalPrinterService } from '../services/escposService';
import { MonitorFluxoCaixa } from './MonitorFluxoCaixa';
import { ExportContabilidadeModal } from './ExportContabilidadeModal';
import { ConfigMetasModal } from './ConfigMetasModal';
import { ModalConfiguracaoChavesUnidade } from './ModalConfiguracaoChavesUnidade';
import { ModalSimuladorWebhookSeguro } from './ModalSimuladorWebhookSeguro';
import { getManagerTargetsConfig, ManagerTargetsConfig } from '../utils/targetsStorage';
import { 
  syncPaymentWebhookToFirestore, 
  subscribeWebhookLogs, 
  subscribeFirestoreOrders,
  subscribeFirestoreCashSession,
  subscribeFirestoreFinancialEntries,
  formatGatewayProviderName, 
  WebhookLogFirestore 
} from '../services/webhookFirestoreService';
import { 
  UnitGatewayConfig, 
  subscribeUnitGatewayConfig 
} from '../services/unitGatewayConfigService';

// Tooltip para Gráfico de Área / Linhas Compostas
const CustomAreaTooltip = ({ active, payload, label, mode }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#12121E] border border-zinc-700/90 p-3.5 rounded-2xl shadow-[0_12px_36px_rgba(0,0,0,0.8)] text-xs space-y-2 backdrop-blur-xl min-w-[210px] z-50">
        <div className="border-b border-zinc-800 pb-1.5 flex items-center justify-between">
          <span className="text-zinc-400 font-medium">Período / Hora:</span>
          <span className="text-[#FFC72C] font-mono font-bold">{label}</span>
        </div>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => {
            const isMoney = mode !== 'count';
            return (
              <div key={`tooltip-${index}`} className="flex items-center justify-between gap-4 text-[11px]">
                <span className="flex items-center gap-1.5 font-medium" style={{ color: entry.color }}>
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                  {entry.name}:
                </span>
                <span className="font-mono font-black text-white">
                  {isMoney ? formatBRL(entry.value) : `${entry.value} transações`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

// Tooltip para Gráfico Donut de Meios de Pagamento
const CustomDonutTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-[#12121E] border border-zinc-700/90 p-3.5 rounded-2xl shadow-[0_12px_36px_rgba(0,0,0,0.8)] text-xs space-y-1.5 backdrop-blur-xl z-50">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: data.payload.color }} />
          <span className="font-bold text-white text-sm">{data.name}</span>
        </div>
        <div className="text-base font-black font-mono text-[#00E676]">
          {formatBRL(data.value)}
        </div>
        <div className="text-[11px] text-zinc-400 flex items-center justify-between gap-3">
          <span>Participação no Volume:</span>
          <strong className="text-white font-mono">{data.payload.percent}%</strong>
        </div>
        <div className="text-[11px] text-zinc-400 flex items-center justify-between gap-3">
          <span>Transações:</span>
          <strong className="text-white font-mono">{data.payload.count} pedidos</strong>
        </div>
      </div>
    );
  }
  return null;
};

export const DashboardFinanceiro: React.FC = () => {
  const { 
    orders, 
    financialEntries, 
    activeCashSession, 
    currentBranch, 
    tenant,
    addOrder,
    setCurrentView,
    handleIncomingWebhook,
    updateActiveCashSession,
    salesFirestore,
    expensesFirestore,
    cashMovementsFirestore,
    financialTransactions
  } = useApp();

  // Estados de Filtro
  const [timeFilter, setTimeFilter] = useState<'today' | '7days' | '30days' | 'all'>('today');
  const [metricMode, setMetricMode] = useState<'revenue' | 'count'>('revenue');
  const [activeTab, setActiveTab] = useState<'comparativo' | 'fluxo_caixa' | 'canais' | 'webhooks_sync'>('comparativo');
  
  // Estados de Sincronização Automática com Firestore & Gateways
  const [firestoreWebhookLogs, setFirestoreWebhookLogs] = useState<WebhookLogFirestore[]>([]);
  const [isSyncingWebhook, setIsSyncingWebhook] = useState(false);
  const [syncFeedbackMessage, setSyncFeedbackMessage] = useState<string | null>(null);
  const [syncedOrderIds, setSyncedOrderIds] = useState<Set<string>>(new Set());

  // Estado do Modal de Simulador Seguro de Webhook
  const [isWebhookSimulatorOpen, setIsWebhookSimulatorOpen] = useState(false);

  // Estado do Modal de Configuração de Chaves de API por Unidade no Firestore
  const [isUnitGatewayModalOpen, setIsUnitGatewayModalOpen] = useState(false);
  const [unitGatewayConfig, setUnitGatewayConfig] = useState<UnitGatewayConfig | null>(null);

  // Inscrição em tempo real aos logs de webhook gravados no Firestore
  useEffect(() => {
    const empresaId = tenant?.id || 'tenant_lanchonete_dulci';
    const unsub = subscribeWebhookLogs(empresaId, (logs) => {
      setFirestoreWebhookLogs(logs);
      const ids = new Set<string>();
      logs.forEach(l => {
        if (l.orderId) ids.add(l.orderId);
      });
      setSyncedOrderIds(ids);
    });
    return () => unsub();
  }, [tenant?.id]);

  // Inscrição em tempo real aos pedidos gravados no Firestore para a empresa
  const [firestoreOrders, setFirestoreOrders] = useState<Order[]>([]);
  const [firestoreCashSession, setFirestoreCashSession] = useState<CashSession | null>(null);
  const [firestoreFinancialEntries, setFirestoreFinancialEntries] = useState<FinancialEntry[]>([]);
  const [isFirestoreConnected, setIsFirestoreConnected] = useState<boolean>(true);

  useEffect(() => {
    const empresaId = tenant?.id || 'tenant_lanchonete_dulci';
    const unsub = subscribeFirestoreOrders(empresaId, (dbOrders) => {
      setFirestoreOrders(dbOrders);
      setIsFirestoreConnected(true);
    });
    return () => unsub();
  }, [tenant?.id]);

  // Inscrição em tempo real à sessão de caixa ativa gravada no Firestore
  useEffect(() => {
    const empresaId = tenant?.id || 'tenant_lanchonete_dulci';
    const unsub = subscribeFirestoreCashSession(empresaId, (session) => {
      if (session) {
        setFirestoreCashSession(session);
        updateActiveCashSession(session);
      }
    });
    return () => unsub();
  }, [tenant?.id, updateActiveCashSession]);

  // Inscrição em tempo real aos lançamentos financeiros da empresa gravados no Firestore
  useEffect(() => {
    const empresaId = tenant?.id || 'tenant_lanchonete_dulci';
    const unsub = subscribeFirestoreFinancialEntries(empresaId, (entries) => {
      setFirestoreFinancialEntries(entries);
    });
    return () => unsub();
  }, [tenant?.id]);

  // Sessão de caixa efetiva: Firestore prioritário, com fallback no estado local
  const effectiveCashSession = firestoreCashSession || activeCashSession;

  // Inscrição em tempo real às configurações de chaves da unidade selecionada
  useEffect(() => {
    const empresaId = tenant?.id || 'tenant_lanchonete_dulci';
    const unidadeId = currentBranch?.id || tenant?.id || 'branch_matriz_manaus';
    const unsub = subscribeUnitGatewayConfig(empresaId, unidadeId, (cfg) => {
      setUnitGatewayConfig(cfg);
    });
    return () => unsub();
  }, [tenant?.id, currentBranch?.id]);

  // Mesclagem em tempo real: Coleções do Firestore ('pedidos', 'Sales', 'financialTransactions') e Estado Local
  const allOrders = useMemo(() => {
    const map = new Map<string, Order>();

    // 1. Pedidos do estado da aplicação
    orders.forEach(o => map.set(o.id, o));

    // 2. Pedidos em tempo real do Firestore (precedência para baixas e webhooks)
    firestoreOrders.forEach(fOrder => {
      const existing = map.get(fOrder.id);
      if (!existing) {
        map.set(fOrder.id, fOrder);
      } else {
        map.set(fOrder.id, {
          ...existing,
          ...fOrder,
          paymentStatus: fOrder.paymentStatus || existing.paymentStatus,
          paymentMethod: fOrder.paymentMethod || existing.paymentMethod,
          pixEndToEndId: fOrder.pixEndToEndId || existing.pixEndToEndId,
          cardNsu: fOrder.cardNsu || existing.cardNsu,
          gatewayProvider: fOrder.gatewayProvider || existing.gatewayProvider,
          gatewayPaidAt: fOrder.gatewayPaidAt || existing.gatewayPaidAt,
          updatedAt: fOrder.updatedAt || existing.updatedAt
        });
      }
    });

    // 3. Vendas confirmadas persistidas na coleção Firestore 'Sales'
    salesFirestore.forEach(sale => {
      const key = sale.orderId || sale.id;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          id: key,
          orderNumber: parseInt(key.replace(/\D/g, '').slice(-4) || '1', 10),
          displayCode: sale.displayCode || `#${key.slice(-4)}`,
          tenantId: sale.empresaId || tenant?.id || 'tenant_lanchonete_dulci',
          branchId: currentBranch?.id || 'branch_matriz_manaus',
          channel: (sale.channel as any) || 'pdv_balcao',
          status: 'completed',
          paymentStatus: 'paid',
          paymentMethod: (sale.paymentMethod as any) || 'pix',
          total: sale.totalGross || 0,
          subtotal: sale.totalGross || 0,
          customerName: sale.customerName || 'Cliente Balcão',
          items: (sale.items || []).map((it, idx) => ({
            id: `item_${idx}`,
            productId: it.productId,
            productName: it.productName,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            totalPrice: it.totalPrice,
            station: 'grill',
            status: 'ready'
          })),
          createdAt: sale.finalizedAt || sale.createdAt || new Date().toISOString(),
          updatedAt: sale.finalizedAt || sale.createdAt || new Date().toISOString()
        } as Order);
      } else {
        existing.status = 'completed';
        existing.paymentStatus = 'paid';
        existing.total = sale.totalGross || existing.total;
      }
    });

    // 4. Transações financeiras com idempotência da coleção Firestore 'financialTransactions'
    financialTransactions.forEach(tx => {
      const key = tx.orderId || tx.idempotencyKey || tx.id;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          id: key,
          orderNumber: parseInt(key.replace(/\D/g, '').slice(-4) || '1', 10),
          displayCode: tx.orderCode || `#${key.slice(-4)}`,
          tenantId: tx.empresaId || tenant?.id || 'tenant_lanchonete_dulci',
          branchId: tx.branchId || currentBranch?.id || 'branch_matriz_manaus',
          channel: (tx.channel as any) || 'pdv_balcao',
          status: 'completed',
          paymentStatus: 'paid',
          paymentMethod: (tx.paymentMethod as any) || 'pix',
          total: tx.amount || 0,
          subtotal: tx.amount || 0,
          customerName: tx.customerName || 'Cliente Balcão',
          items: [],
          pixTxId: tx.pixEndToEndId,
          cardNsu: tx.cardNsu,
          cardAuthCode: tx.cardAuthCode,
          gatewayProvider: tx.gatewayProvider,
          createdAt: tx.createdAt || tx.timestamp || new Date().toISOString(),
          updatedAt: tx.createdAt || tx.timestamp || new Date().toISOString()
        } as Order);
      } else {
        existing.status = 'completed';
        existing.paymentStatus = 'paid';
        existing.total = tx.amount || existing.total;
        if (tx.pixEndToEndId) existing.pixEndToEndId = tx.pixEndToEndId;
        if (tx.cardNsu) existing.cardNsu = tx.cardNsu;
      }
    });

    return Array.from(map.values());
  }, [orders, firestoreOrders, salesFirestore, financialTransactions, tenant?.id, currentBranch?.id]);
  
  // Estados da Tabela de Histórico e Filtro de Liquidação de Pagamento
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState<'all' | 'pix' | 'credit_card' | 'debit_card' | 'cash'>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [settlementFilter, setSettlementFilter] = useState<'all' | 'gateway_confirmed' | 'webhook_pending' | 'cash_manual'>('all');
  const [selectedTransaction, setSelectedTransaction] = useState<Order | null>(null);

  // Estado do Modal de Exportação para Contabilidade (CSV / PDF)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Estados da Modal de Teste/Simulação de Transação
  const [isSimModalOpen, setIsSimModalOpen] = useState(false);
  const [simulationMethod, setSimulationMethod] = useState<'pix' | 'credit_card' | 'debit_card'>('pix');
  const [simCustomAmount, setSimCustomAmount] = useState('84.90');
  const [isSimulating, setIsSimulating] = useState(false);

  // Estados de Metas Diárias e Preferências do Gerente (Salvas no LocalStorage)
  const [managerTargets, setManagerTargets] = useState<ManagerTargetsConfig>(() => getManagerTargetsConfig());
  const [isConfigMetasOpen, setIsConfigMetasOpen] = useState(false);

  // Sincronização em tempo real das preferências do gerente
  useEffect(() => {
    const handleTargetsUpdated = (e: any) => {
      const updated = e.detail as ManagerTargetsConfig;
      if (updated) {
        setManagerTargets(updated);
      }
    };
    window.addEventListener('neon_targets_updated', handleTargetsUpdated);
    return () => window.removeEventListener('neon_targets_updated', handleTargetsUpdated);
  }, []);

  // =========================================================================
  // 1. FILTRAGEM DE PEDIDOS & HISTÓRICO CONFORME O PERÍODO SELECIONADO
  // =========================================================================
  const filteredOrders = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    return allOrders.filter(order => {
      // Ignora pedidos cancelados ou ainda não finalizados/pagos na apuração financeira
      if (order.status === 'canceled' || (order.status as string) === 'cancelled') return false;
      const isCompleted = order.status === 'completed' || order.status === 'delivered';
      const isPaid = order.paymentStatus === 'paid';
      if (!isCompleted || !isPaid) return false;
      
      // Isolamento estrito por Filial/Unidade selecionada
      if (currentBranch?.id && order.branchId && order.branchId !== currentBranch.id && currentBranch.id !== 'all') {
        return false;
      }

      const orderDate = order.createdAt ? order.createdAt.split('T')[0] : todayStr;
      
      if (timeFilter === 'today') {
        // Considera o dia de hoje
        return orderDate === todayStr || !order.createdAt;
      }
      
      if (timeFilter === '7days') {
        const diffDays = (now.getTime() - new Date(order.createdAt).getTime()) / (1000 * 3600 * 24);
        return diffDays <= 7;
      }
      
      if (timeFilter === '30days') {
        const diffDays = (now.getTime() - new Date(order.createdAt).getTime()) / (1000 * 3600 * 24);
        return diffDays <= 30;
      }
      
      return true; // 'all'
    });
  }, [allOrders, timeFilter, currentBranch?.id]);

  // =========================================================================
  // 2. CONSOLIDAÇÃO DOS VOLUMES PIX VS CARTÃO (CRÉDITO E DÉBITO)
  // =========================================================================
  const financialSummary = useMemo(() => {
    let pixTotal = 0;
    let pixCount = 0;
    
    let creditTotal = 0;
    let creditCount = 0;
    
    let debitTotal = 0;
    let debitCount = 0;
    
    let cashTotal = 0;
    let cashCount = 0;

    let totalVolume = 0;
    let totalCount = 0;

    filteredOrders.forEach(o => {
      const amt = o.total || 0;
      totalVolume += amt;
      totalCount += 1;

      if (o.paymentMethod === 'pix') {
        pixTotal += amt;
        pixCount += 1;
      } else if (o.paymentMethod === 'credit_card') {
        creditTotal += amt;
        creditCount += 1;
      } else if (o.paymentMethod === 'debit_card') {
        debitTotal += amt;
        debitCount += 1;
      } else if (o.paymentMethod === 'cash') {
        cashTotal += amt;
        cashCount += 1;
      } else {
        // Vouchers, etc.
        cashTotal += amt;
        cashCount += 1;
      }
    });

    const cardTotal = creditTotal + debitTotal;
    const cardCount = creditCount + debitCount;

    // Percentuais de Split
    const pixPercent = totalVolume > 0 ? (pixTotal / totalVolume) * 100 : 0;
    const cardPercent = totalVolume > 0 ? (cardTotal / totalVolume) * 100 : 0;
    const creditPercent = totalVolume > 0 ? (creditTotal / totalVolume) * 100 : 0;
    const debitPercent = totalVolume > 0 ? (debitTotal / totalVolume) * 100 : 0;
    const cashPercent = totalVolume > 0 ? (cashTotal / totalVolume) * 100 : 0;

    // Tickets Médios
    const pixTicket = pixCount > 0 ? pixTotal / pixCount : 0;
    const cardTicket = cardCount > 0 ? cardTotal / cardCount : 0;
    const creditTicket = creditCount > 0 ? creditTotal / creditCount : 0;
    const debitTicket = debitCount > 0 ? debitTotal / debitCount : 0;
    const avgTicket = totalCount > 0 ? totalVolume / totalCount : 0;

    // Estimativa de Taxas de Intermediação (MDR Adquirentes)
    // Pix: 0% a 0.50% (assumindo 0% ou taxa fixa zero no gateway direto)
    // Crédito: 2.89% MDR médio
    // Débito: 1.29% MDR médio
    const feePix = pixTotal * 0.00; // Taxa zero / benefício Pix
    const feeCredit = creditTotal * 0.0289;
    const feeDebit = debitTotal * 0.0129;
    const feeCardTotal = feeCredit + feeDebit;
    const totalFeesRetained = feePix + feeCardTotal;

    // Economia Gerada pelo Pix (se o volume Pix tivesse passado na média de cartão a 2.5%)
    const pixSavingsVsCard = pixTotal * 0.025;

    // Saldo Líquido Operacional
    const netVolume = totalVolume - totalFeesRetained;

    return {
      totalVolume,
      totalCount,
      avgTicket,
      pixTotal,
      pixCount,
      pixTicket,
      pixPercent,
      cardTotal,
      cardCount,
      cardTicket,
      cardPercent,
      creditTotal,
      creditCount,
      creditTicket,
      creditPercent,
      debitTotal,
      debitCount,
      debitTicket,
      debitPercent,
      cashTotal,
      cashCount,
      cashPercent,
      feePix,
      feeCredit,
      feeDebit,
      feeCardTotal,
      totalFeesRetained,
      pixSavingsVsCard,
      netVolume
    };
  }, [filteredOrders, timeFilter, effectiveCashSession]);

  // =========================================================================
  // 2.1 CONSOLIDAÇÃO DO STATUS DE LIQUIDAÇÃO DOS PAGAMENTOS:
  // - GATEWAY CONFIRMADO (PIX / CARTÃO LIQUIDADO VIA API/WEBHOOK)
  // - PENDENTE DE WEBHOOK (AGUARDANDO CONFIRMAÇÃO DO GATEWAY)
  // - REGISTRADO MANUALMENTE EM DINHEIRO (FRENTE DE CAIXA / GAVETA)
  // =========================================================================
  const getOrderSettlementCategory = (order: Order): 'gateway_confirmed' | 'webhook_pending' | 'cash_manual' => {
    const method = order.paymentMethod;
    const status = order.paymentStatus;

    // 1. Dinheiro físico manual
    if (method === 'cash' || (method as any) === 'dinheiro') {
      return 'cash_manual';
    }

    // 2. Pendente de Webhook (Pix, Cartão de Crédito ou Débito aguardando callback do gateway)
    if (
      (method === 'pix' || method === 'credit_card' || method === 'debit_card') &&
      (status === 'pending' || (status as string) === 'awaiting_payment')
    ) {
      return 'webhook_pending';
    }

    // 3. Confirmado via Gateway (Pix ou Cartão pago)
    if (
      (method === 'pix' || method === 'credit_card' || method === 'debit_card') &&
      status === 'paid'
    ) {
      return 'gateway_confirmed';
    }

    // Padrão: se status for pago, consideramos liquidado digitalmente; caso contrário, pendente de confirmação
    return status === 'paid' ? 'gateway_confirmed' : 'webhook_pending';
  };

  const settlementSummary = useMemo(() => {
    let gatewayTotal = 0;
    let gatewayCount = 0;
    let gatewayFees = 0;
    let gatewayPixTotal = 0;
    let gatewayPixCount = 0;
    let gatewayCardTotal = 0;
    let gatewayCardCount = 0;

    let pendingWebhookTotal = 0;
    let pendingWebhookCount = 0;
    let pendingPixCount = 0;
    let pendingPixTotal = 0;
    let pendingCardCount = 0;
    let pendingCardTotal = 0;

    let cashTotal = 0;
    let cashCount = 0;

    filteredOrders.forEach(o => {
      const cat = getOrderSettlementCategory(o);
      const amt = o.total || 0;

      if (cat === 'gateway_confirmed') {
        gatewayTotal += amt;
        gatewayCount += 1;
        if (o.paymentMethod === 'pix') {
          gatewayPixTotal += amt;
          gatewayPixCount += 1;
        } else {
          gatewayCardTotal += amt;
          gatewayCardCount += 1;
          const fee = o.paymentMethod === 'credit_card' ? (amt * 0.0289) : (amt * 0.0129);
          gatewayFees += fee;
        }
      } else if (cat === 'webhook_pending') {
        pendingWebhookTotal += amt;
        pendingWebhookCount += 1;
        if (o.paymentMethod === 'pix') {
          pendingPixCount += 1;
          pendingPixTotal += amt;
        } else {
          pendingCardCount += 1;
          pendingCardTotal += amt;
        }
      } else if (cat === 'cash_manual') {
        cashTotal += amt;
        cashCount += 1;
      }
    });

    const totalLiquidated = gatewayTotal + cashTotal;
    const grandTotal = totalLiquidated + pendingWebhookTotal;

    const gatewayPercent = grandTotal > 0 ? (gatewayTotal / grandTotal) * 100 : 0;
    const pendingPercent = grandTotal > 0 ? (pendingWebhookTotal / grandTotal) * 100 : 0;
    const cashPercent = grandTotal > 0 ? (cashTotal / grandTotal) * 100 : 0;

    return {
      gatewayTotal,
      gatewayCount,
      gatewayFees,
      gatewayNet: gatewayTotal - gatewayFees,
      gatewayPixTotal,
      gatewayPixCount,
      gatewayCardTotal,
      gatewayCardCount,
      gatewayPercent,

      pendingWebhookTotal,
      pendingWebhookCount,
      pendingPixCount,
      pendingPixTotal,
      pendingCardCount,
      pendingCardTotal,
      pendingPercent,

      cashTotal,
      cashCount,
      cashPercent,

      totalLiquidated,
      grandTotal
    };
  }, [filteredOrders]);

  // =========================================================================
  // 3. DADOS TEMPORAIS (HORÁRIO OU DIÁRIO) PARA O RECHARTS
  // =========================================================================
  const timelineChartData = useMemo(() => {
    if (timeFilter === 'today') {
      const hours = ['10h', '11h', '12h', '13h', '14h', '15h', '16h', '17h', '18h', '19h', '20h', '21h', '22h', '23h'];
      
      return hours.map((h) => {
        const targetH = parseInt(h.replace('h', ''), 10);
        const ordersInHour = filteredOrders.filter(o => {
          if (!o.createdAt) return false;
          try {
            return new Date(o.createdAt).getHours() === targetH;
          } catch (e) {
            return false;
          }
        });

        let pixVal = 0, creditVal = 0, debitVal = 0, cashVal = 0;
        let pixCount = 0, cardCount = 0;

        ordersInHour.forEach(o => {
          const amt = o.total || 0;
          if (o.paymentMethod === 'pix') {
            pixVal += amt;
            pixCount += 1;
          } else if (o.paymentMethod === 'credit_card') {
            creditVal += amt;
            cardCount += 1;
          } else if (o.paymentMethod === 'debit_card') {
            debitVal += amt;
            cardCount += 1;
          } else {
            cashVal += amt;
          }
        });

        const cardVal = Number((creditVal + debitVal).toFixed(2));
        const totalSlot = Number((pixVal + cardVal + cashVal).toFixed(2));
        const feesSlot = Number((creditVal * 0.0289 + debitVal * 0.0129).toFixed(2));
        const netSlot = Number((totalSlot - feesSlot).toFixed(2));

        return {
          period: h,
          pix: Number(pixVal.toFixed(2)),
          cartao: cardVal,
          credito: Number(creditVal.toFixed(2)),
          debito: Number(debitVal.toFixed(2)),
          dinheiro: Number(cashVal.toFixed(2)),
          total: totalSlot,
          liquido: netSlot,
          taxas: feesSlot,
          pixCount,
          cartaoCount: cardCount,
          totalCount: pixCount + cardCount
        };
      });
    }

    if (timeFilter === '7days') {
      const days = [
        { key: 1, label: 'Seg' },
        { key: 2, label: 'Ter' },
        { key: 3, label: 'Qua' },
        { key: 4, label: 'Qui' },
        { key: 5, label: 'Sex' },
        { key: 6, label: 'Sáb' },
        { key: 0, label: 'Dom' }
      ];

      return days.map((d) => {
        const ordersInDay = filteredOrders.filter(o => {
          if (!o.createdAt) return false;
          try {
            return new Date(o.createdAt).getDay() === d.key;
          } catch (e) {
            return false;
          }
        });

        let pixVal = 0, creditVal = 0, debitVal = 0;
        let pixCount = 0, cardCount = 0;

        ordersInDay.forEach(o => {
          const amt = o.total || 0;
          if (o.paymentMethod === 'pix') {
            pixVal += amt;
            pixCount += 1;
          } else if (o.paymentMethod === 'credit_card') {
            creditVal += amt;
            cardCount += 1;
          } else if (o.paymentMethod === 'debit_card') {
            debitVal += amt;
            cardCount += 1;
          }
        });

        const cardVal = Number((creditVal + debitVal).toFixed(2));
        const totalSlot = Number((pixVal + cardVal).toFixed(2));
        const feesSlot = Number((creditVal * 0.0289 + debitVal * 0.0129).toFixed(2));

        return {
          period: d.label,
          pix: Number(pixVal.toFixed(2)),
          cartao: cardVal,
          credito: Number(creditVal.toFixed(2)),
          debito: Number(debitVal.toFixed(2)),
          total: totalSlot,
          liquido: Number((totalSlot - feesSlot).toFixed(2)),
          taxas: feesSlot,
          pixCount,
          cartaoCount: cardCount,
        };
      });
    }

    // 30days ou all (4 Semanas do mês calculadas por data real)
    const weeks = ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'];
    const now = new Date();

    return weeks.map((w, idx) => {
      const ordersInWeek = filteredOrders.filter(o => {
        if (!o.createdAt) return false;
        try {
          const diffDays = (now.getTime() - new Date(o.createdAt).getTime()) / (1000 * 3600 * 24);
          const weekIdx = Math.min(3, Math.max(0, Math.floor(diffDays / 7)));
          return (3 - weekIdx) === idx;
        } catch (e) {
          return false;
        }
      });

      let pixVal = 0, creditVal = 0, debitVal = 0;
      let pixCount = 0, cardCount = 0;

      ordersInWeek.forEach(o => {
        const amt = o.total || 0;
        if (o.paymentMethod === 'pix') {
          pixVal += amt;
          pixCount += 1;
        } else if (o.paymentMethod === 'credit_card') {
          creditVal += amt;
          cardCount += 1;
        } else if (o.paymentMethod === 'debit_card') {
          debitVal += amt;
          cardCount += 1;
        }
      });

      const cardVal = Number((creditVal + debitVal).toFixed(2));
      const totalSlot = Number((pixVal + cardVal).toFixed(2));
      const feesSlot = Number((creditVal * 0.0289 + debitVal * 0.0129).toFixed(2));

      return {
        period: w,
        pix: Number(pixVal.toFixed(2)),
        cartao: cardVal,
        credito: Number(creditVal.toFixed(2)),
        debito: Number(debitVal.toFixed(2)),
        total: totalSlot,
        liquido: Number((totalSlot - feesSlot).toFixed(2)),
        taxas: feesSlot,
        pixCount,
        cartaoCount: cardCount,
      };
    });
  }, [timeFilter, filteredOrders]);

  // =========================================================================
  // 4. DADOS PARA O GRÁFICO DONUT (PIE CHART)
  // =========================================================================
  const paymentMethodDonutData = useMemo(() => {
    return [
      {
        name: 'PIX Dinâmico Instantâneo',
        shortName: 'PIX',
        value: financialSummary.pixTotal,
        percent: financialSummary.pixPercent.toFixed(1),
        count: financialSummary.pixCount,
        color: '#00E676', // Verde Neon Pix
        settlement: 'D+0 (Instantâneo na Conta)',
        avgFee: '0.00% (Sem MDR)'
      },
      {
        name: 'Cartão de Crédito',
        shortName: 'Crédito',
        value: financialSummary.creditTotal,
        percent: financialSummary.creditPercent.toFixed(1),
        count: financialSummary.creditCount,
        color: '#3B82F6', // Azul Elétrico
        settlement: 'D+30 (ou D+1 Antecipado)',
        avgFee: '2.89% MDR'
      },
      {
        name: 'Cartão de Débito',
        shortName: 'Débito',
        value: financialSummary.debitTotal,
        percent: financialSummary.debitPercent.toFixed(1),
        count: financialSummary.debitCount,
        color: '#8B5CF6', // Roxo Violeta
        settlement: 'D+1 Dia Útil',
        avgFee: '1.29% MDR'
      },
      {
        name: 'Dinheiro & Caixa',
        shortName: 'Dinheiro',
        value: financialSummary.cashTotal,
        percent: financialSummary.cashPercent.toFixed(1),
        count: financialSummary.cashCount,
        color: '#FFC72C', // Amarelo
        settlement: 'D+0 (Em Gaveta)',
        avgFee: '0.00%'
      }
    ].filter(item => item.value > 0);
  }, [financialSummary]);

  // =========================================================================
  // 5. DISTRIBUIÇÃO POR CANAL (PIX VS CARTÃO NO DELIVERY, SALÃO, PDV)
  // =========================================================================
  const channelsComparisonData = useMemo(() => {
    const channels = [
      { id: 'cardapio_online', name: 'Cardápio Digital & Online' },
      { id: 'delivery', name: 'Delivery WhatsApp & Direto' },
      { id: 'pdv_balcao', name: 'PDV Balcão & Balcão Rápido' },
      { id: 'mesa', name: 'Salão & Mesas (Comandas)' }
    ];

    return channels.map(ch => {
      const matchOrders = filteredOrders.filter(o => {
        if (ch.id === 'cardapio_online') return o.channel === 'cardapio_online';
        if (ch.id === 'delivery') return o.channel === 'delivery' || o.channel === 'delivery_whatsapp';
        if (ch.id === 'pdv_balcao') return o.channel === 'pdv_balcao' || o.channel === 'balcao';
        if (ch.id === 'mesa') return o.channel === 'mesa' || o.channel === 'salao' || o.channel === 'comanda';
        return false;
      });

      const pixVal = matchOrders
        .filter(o => o.paymentMethod === 'pix')
        .reduce((sum, o) => sum + (o.total || 0), 0);

      const cardVal = matchOrders
        .filter(o => o.paymentMethod === 'credit_card' || o.paymentMethod === 'debit_card')
        .reduce((sum, o) => sum + (o.total || 0), 0);

      return {
        channel: ch.name,
        pix: Number(pixVal.toFixed(2)),
        cartao: Number(cardVal.toFixed(2)),
        total: Number((pixVal + cardVal).toFixed(2))
      };
    });
  }, [filteredOrders]);

  // =========================================================================
  // 6. HISTÓRICO DETALHADO DE TRANSAÇÕES FILTRADAS
  // =========================================================================
  const paymentLedger = useMemo(() => {
    return filteredOrders
      .filter(o => {
        if (settlementFilter !== 'all') {
          const cat = getOrderSettlementCategory(o);
          if (cat !== settlementFilter) return false;
        }
        if (methodFilter !== 'all' && o.paymentMethod !== methodFilter) return false;
        if (channelFilter !== 'all' && o.channel !== channelFilter) return false;
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const matchCode = o.displayCode.toLowerCase().includes(term);
          const matchCustomer = o.customerName.toLowerCase().includes(term);
          const matchTx = o.pixTxId?.toLowerCase().includes(term);
          const matchNsu = o.cardNsu?.toLowerCase().includes(term);
          const matchAuth = o.cardAuthCode?.toLowerCase().includes(term);
          const matchGateway = o.gatewayProvider?.toLowerCase().includes(term);
          return matchCode || matchCustomer || matchTx || matchNsu || matchAuth || matchGateway;
        }
        return true;
      });
  }, [filteredOrders, settlementFilter, methodFilter, channelFilter, searchTerm]);

  // Aprovar pedido que estava pendente via Webhook com sincronização direta e persistente no Firestore
  const handleApproveWebhookOrder = async (order: Order, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsSyncingWebhook(true);
    playCashRegister();

    const providerKey = (order.gatewayProvider?.toLowerCase().replace(/\s+/g, '') as any) || (order.paymentMethod === 'pix' ? 'mercadopago' : 'stone');
    const pixE2E = `E000381662026${Date.now()}`;
    const nsu = `NSU${Math.floor(10000000 + Math.random() * 90000000)}`;
    const tid = `TID-${Date.now()}`;
    const authCode = `AUT-${Math.floor(100000 + Math.random() * 900000)}`;

    handleIncomingWebhook({
      provider: providerKey,
      event: 'payment.approved',
      orderCode: order.displayCode,
      orderId: order.id,
      total: order.total,
      paymentMethod: order.paymentMethod,
      rawPayload: {
        pixEndToEndId: pixE2E,
        nsu,
        tid,
        authCode
      }
    });

    try {
      const empresaId = order.tenantId || tenant?.id || 'tenant_lanchonete_dulci';
      const syncResult = await syncPaymentWebhookToFirestore(
        empresaId, 
        {
          provider: providerKey,
          event: 'payment.approved',
          orderCode: order.displayCode,
          orderId: order.id,
          total: order.total,
          paymentMethod: order.paymentMethod,
          paymentStatus: 'paid',
          pixEndToEndId: pixE2E,
          cardNsu: nsu,
          cardTid: tid,
          cardAuthCode: authCode,
          secretToken: unitGatewayConfig?.webhookSecret
        }, 
        order,
        activeCashSession,
        unitGatewayConfig?.webhookSecret
      );

      if (syncResult.updatedCashSession) {
        updateActiveCashSession(syncResult.updatedCashSession);
      }

      setSyncedOrderIds(prev => new Set(prev).add(order.id));
      setSyncFeedbackMessage(`✅ Pedido ${order.displayCode} (${formatBRL(order.total)}) liquidado e Caixa atualizado no Firestore!`);
      setTimeout(() => setSyncFeedbackMessage(null), 4000);
    } catch (err: any) {
      console.warn('Erro ao sincronizar webhook no Firestore:', err);
    } finally {
      setIsSyncingWebhook(false);
    }

    if (selectedTransaction?.id === order.id) {
      setSelectedTransaction(prev => prev ? {
        ...prev,
        paymentStatus: 'paid',
        paidAmount: order.total,
        gatewayPaidAt: new Date().toISOString()
      } : null);
    }
  };

  // Testar disparo de webhook e sincronização no Firestore
  const handleTestWebhookSync = async (provider: 'mercadopago' | 'stone' | 'pix' | 'cielo') => {
    setIsSyncingWebhook(true);
    playCashRegister();
    try {
      const isPix = provider === 'mercadopago' || provider === 'pix';
      const amount = Number((Math.random() * 50 + 35).toFixed(2));
      const orderCode = `#${Math.floor(1000 + Math.random() * 9000)}`;
      const empresaId = tenant?.id || 'tenant_lanchonete_dulci';

      const syncResult = await syncPaymentWebhookToFirestore(
        empresaId, 
        {
          provider,
          event: 'payment.approved',
          orderCode,
          total: amount,
          paymentMethod: isPix ? 'pix' : 'credit_card',
          paymentStatus: 'paid',
          pixEndToEndId: isPix ? `E000381662026${Date.now()}` : undefined,
          cardNsu: !isPix ? `NSU${Math.floor(10000000 + Math.random() * 90000000)}` : undefined,
          cardTid: !isPix ? `TID-${Date.now()}` : undefined,
          cardAuthCode: !isPix ? `AUT-${Math.floor(100000 + Math.random() * 900000)}` : undefined,
          secretToken: unitGatewayConfig?.webhookSecret
        },
        undefined,
        activeCashSession,
        unitGatewayConfig?.webhookSecret
      );

      if (syncResult.updatedCashSession) {
        updateActiveCashSession(syncResult.updatedCashSession);
      }

      handleIncomingWebhook({
        provider,
        event: 'payment.approved',
        orderCode,
        total: amount,
        paymentMethod: isPix ? 'pix' : 'credit_card'
      });

      setSyncFeedbackMessage(`✅ Webhook teste do ${formatGatewayProviderName(provider)} (${formatBRL(amount)}) gravado e Caixa atualizado no Firestore!`);
      setTimeout(() => setSyncFeedbackMessage(null), 5000);
    } catch (err: any) {
      console.error('Falha no teste de webhook:', err);
    } finally {
      setIsSyncingWebhook(false);
    }
  };

  // Gerar um pedido de teste pendente de webhook
  const handleCreateTestPendingOrder = (method: 'pix' | 'credit_card' = 'pix') => {
    playBeep(600, 0.05);
    const amount = Number((Math.random() * 60 + 35).toFixed(2));
    const isPix = method === 'pix';
    const testOrder: Partial<Order> = {
      branchId: currentBranch?.id || tenant?.id || 'matriz',
      tenantId: tenant?.id || currentBranch?.tenantId || 'tenant_lanchonete_dulci',
      channel: isPix ? 'cardapio_online' : 'pdv_balcao',
      status: 'pending',
      customerName: isPix ? 'Cliente App (Aguardando Pix QR)' : 'Cliente Balcão (Aguardando Cartão)',
      customerPhone: '11977665544',
      items: [
        {
          id: `item_${Date.now()}`,
          productId: 'prod_smash_duplo',
          productName: isPix ? 'Smash Neon Duplo Especial (QR Code Aberto)' : 'Pizza Especial + Chopp (Em análise gateway)',
          quantity: 1,
          unitPrice: amount,
          totalPrice: amount,
          station: 'grill',
          status: 'pending'
        }
      ],
      subtotal: amount,
      deliveryFee: 0,
      serviceFee: 0,
      total: amount,
      paymentMethod: method,
      paymentStatus: 'pending',
      pixTxId: isPix ? `PIX-PEND-${Math.floor(100000 + Math.random() * 900000)}` : undefined,
      gatewayProvider: isPix ? 'Mercado Pago (Pix Dinâmico)' : 'Stone SmartPOS',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    addOrder(testOrder);
  };

  // Gerar uma venda teste em dinheiro (frente de caixa manual)
  const handleCreateTestCashOrder = () => {
    playCashRegister();
    const amount = Number((Math.random() * 50 + 25).toFixed(2));
    const testOrder: Partial<Order> = {
      branchId: currentBranch?.id || tenant?.id || 'matriz',
      tenantId: tenant?.id || currentBranch?.tenantId || 'tenant_lanchonete_dulci',
      channel: 'pdv_balcao',
      status: 'completed',
      customerName: 'Cliente Balcão (Dinheiro em Espécie)',
      customerPhone: '1199887766',
      items: [
        {
          id: `item_${Date.now()}`,
          productId: 'prod_smash_duplo',
          productName: 'Combo Balcão Smash + Batata (Pago em Dinheiro)',
          quantity: 1,
          unitPrice: amount,
          totalPrice: amount,
          station: 'grill',
          status: 'ready'
        }
      ],
      subtotal: amount,
      deliveryFee: 0,
      serviceFee: 0,
      total: amount,
      paymentMethod: 'cash',
      paymentStatus: 'paid',
      paidAmount: amount + 10,
      changeFor: 10,
      notes: 'Recebido em cédulas no caixa PDV',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    addOrder(testOrder);
  };

  // =========================================================================
  // 7. SIMULAÇÃO DE PAGAMENTO EM TEMPO REAL
  // =========================================================================
  const handleSimulatePayment = (method: 'pix' | 'credit_card' | 'debit_card', customVal?: number) => {
    setIsSimulating(true);
    playCashRegister();

    const amount = customVal || parseFloat(simCustomAmount) || 84.90;
    const isPix = method === 'pix';
    const isCredit = method === 'credit_card';

    const sampleOrder: Partial<Order> = {
      branchId: currentBranch?.id || tenant?.id || 'matriz',
      tenantId: tenant?.id || currentBranch?.tenantId || 'tenant_lanchonete_dulci',
      channel: isPix ? 'cardapio_online' : 'pdv_balcao',
      status: 'completed',
      customerName: isPix ? 'Cliente Teste Pix Dinâmico' : 'Cliente Teste Maquininha Cartão',
      customerPhone: '11988776655',
      items: [
        {
          id: `item_${Date.now()}`,
          productId: 'prod_smash_duplo',
          productName: isPix ? 'Combo Smash Neon + Refri (Liquidado via Pix)' : 'Pizza Especial + Chopp (Liquidado via Cartão)',
          quantity: 1,
          unitPrice: amount,
          totalPrice: amount,
          station: 'grill',
          status: 'ready'
        }
      ],
      subtotal: amount,
      deliveryFee: 0,
      serviceFee: 0,
      total: amount,
      paymentMethod: method,
      paymentStatus: 'paid',
      paidAmount: amount,
      pixTxId: isPix ? `PIX-LIVE-${Math.floor(100000 + Math.random() * 900000)}` : undefined,
      pixEndToEndId: isPix ? `E0003816620260910${Math.floor(10000000 + Math.random() * 90000000)}` : undefined,
      pixPaidAt: isPix ? new Date().toISOString() : undefined,
      cardBrand: !isPix ? (isCredit ? 'Mastercard Black' : 'Visa Electron') : undefined,
      cardLast4: !isPix ? '4082' : undefined,
      cardAuthCode: !isPix ? `AUT-${Math.floor(100000 + Math.random() * 900000)}` : undefined,
      cardNsu: !isPix ? `NSU${Math.floor(10000000 + Math.random() * 90000000)}` : undefined,
      cardTid: !isPix ? `TID-${Date.now()}` : undefined,
      gatewayProvider: isPix ? 'Banco Central / Pix API' : 'Stone SmartPOS',
      gatewayFee: isPix ? 0 : Number((amount * (isCredit ? 0.0289 : 0.0129)).toFixed(2)),
      gatewayPaidAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    addOrder(sampleOrder);

    setTimeout(() => {
      setIsSimulating(false);
      setIsSimModalOpen(false);
      playKitchenBell();
    }, 450);
  };

  // Exportar Conciliação Financeira CSV
  const handleExportCSV = () => {
    playBeep(640, 0.08);
    const headers = 'Código,Horário,Cliente,Canal,Método,Status_Liquidação,Valor Bruto,Taxa Gateway,Valor Líquido,NSU_TxId,Status_Pedido\n';
    const rows = paymentLedger.map(o => {
      const fee = o.paymentMethod === 'credit_card' ? o.total * 0.0289 : (o.paymentMethod === 'debit_card' ? o.total * 0.0129 : 0);
      const net = o.total - fee;
      const refCode = o.pixTxId || o.cardNsu || o.cardAuthCode || 'N/A';
      const cat = getOrderSettlementCategory(o);
      const catLabel = cat === 'gateway_confirmed' ? 'Confirmado Gateway' : cat === 'webhook_pending' ? 'Pendente de Webhook' : 'Dinheiro Manual (Caixa)';
      return `"${o.displayCode}","${formatDateTime(o.createdAt)}","${o.customerName}","${o.channel}","${o.paymentMethod}","${catLabel}","${o.total.toFixed(2)}","${fee.toFixed(2)}","${net.toFixed(2)}","${refCode}","${o.paymentStatus}"`;
    }).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `relatorio-fluxo-pix-cartao-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-16 text-zinc-100 font-sans" id="dashboard_financeiro_root">
      
      {/* ========================================================================= */}
      {/* CABEÇALHO PRINCIPAL DO DASHBOARD FINANCEIRO */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#12121E] border border-zinc-800/90 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-[0_8px_32px_rgba(0,0,0,0.5)] relative overflow-hidden">
        {/* Glow de fundo */}
        <div className="absolute top-0 right-0 w-80 h-32 bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-32 bg-blue-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#00E676]/15 text-[#00E676] border border-[#00E676]/30">
              <span className="w-2 h-2 rounded-full bg-[#00E676] animate-pulse" />
              FLUXO DE CAIXA EM TEMPO REAL
            </span>
            <span className="text-xs text-zinc-400 font-medium flex items-center gap-1">
              <Store className="w-3.5 h-3.5 text-zinc-500" />
              {currentBranch?.name || tenant?.name || 'Unidade Principal'}
            </span>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Firestore Ao Vivo: {firestoreOrders.length} pedidos • {salesFirestore.length} vendas • {financialTransactions.length} txs
            </div>
          </div>

          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-2 sm:gap-3 flex-wrap">
            <span>Volume Pix vs Cartão</span>
            <span className="text-xs font-mono font-normal px-2.5 py-0.5 rounded-lg bg-zinc-800/80 border border-zinc-700 text-zinc-300">
              Recharts Analytics
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
            Monitore a proporção de vendas via <strong className="text-[#00E676]">Pix Instantâneo</strong> versus{' '}
            <strong className="text-blue-400">Cartões de Crédito</strong> e <strong className="text-purple-400">Débito</strong>.
            Acompanhe o fluxo de caixa, custos de adquirentes e liquidação bancária em tempo real.
          </p>
        </div>

        {/* Controles de Período e Ações Rápidas */}
        <div className="relative z-10 flex flex-wrap items-center gap-2 sm:gap-2.5 w-full lg:w-auto">
          {/* Seletor de Período */}
          <div className="flex items-center bg-[#09090D] border border-zinc-800 p-1 rounded-2xl w-full sm:w-auto justify-between sm:justify-start">
            <button
              onClick={() => { setTimeFilter('today'); playBeep(700, 0.04); }}
              className={`flex-1 sm:flex-initial px-3 py-1.5 min-h-[36px] text-xs font-bold rounded-xl transition-all cursor-pointer ${
                timeFilter === 'today'
                  ? 'bg-[#00E676] text-black shadow-[0_0_12px_rgba(0,230,118,0.4)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Hoje (Ao Vivo)
            </button>
            <button
              onClick={() => { setTimeFilter('7days'); playBeep(700, 0.04); }}
              className={`flex-1 sm:flex-initial px-3 py-1.5 min-h-[36px] text-xs font-bold rounded-xl transition-all cursor-pointer ${
                timeFilter === '7days'
                  ? 'bg-blue-500 text-white shadow-[0_0_12px_rgba(59,130,246,0.4)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              7 Dias
            </button>
            <button
              onClick={() => { setTimeFilter('30days'); playBeep(700, 0.04); }}
              className={`flex-1 sm:flex-initial px-3 py-1.5 min-h-[36px] text-xs font-bold rounded-xl transition-all cursor-pointer ${
                timeFilter === '30days'
                  ? 'bg-purple-500 text-white shadow-[0_0_12px_rgba(139,92,246,0.4)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              30 Dias
            </button>
          </div>

          {/* Botão de Configuração de Metas (Preferências do Gerente) */}
          <button
            onClick={() => {
              setIsConfigMetasOpen(true);
              playBeep(750, 0.04);
            }}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 min-h-[40px] text-xs font-bold rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 text-[#FFC72C] border border-amber-500/35 shadow-md transition-all active:scale-95 cursor-pointer"
            title="Configurar metas diárias de faturamento e preferências salvas no navegador"
          >
            <Target className="w-4 h-4 text-[#FFC72C] shrink-0" />
            <span>Configurar Metas</span>
          </button>

          {/* Botão de Simulação em Tempo Real */}
          <button
            onClick={() => setIsSimModalOpen(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 min-h-[40px] text-xs font-bold rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-black shadow-[0_0_20px_rgba(0,230,118,0.3)] hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            title="Simular uma nova transação e ver o gráfico atualizar instantaneamente"
          >
            <Zap className="w-4 h-4 text-black fill-black shrink-0" />
            <span>Simular Transação</span>
          </button>

          {/* Botão de Exportação para Contabilidade (CSV / PDF) */}
          <button
            onClick={() => {
              setIsExportModalOpen(true);
              playBeep(750, 0.04);
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-3.5 py-2 min-h-[40px] text-xs font-bold rounded-2xl bg-zinc-800/90 hover:bg-zinc-700 text-white border border-zinc-700 hover:border-[#00E676]/60 shadow-md transition-all active:scale-95 cursor-pointer"
            title="Exportar histórico de transações e conciliação para CSV ou PDF"
          >
            <Download className="w-4 h-4 text-[#00E676] shrink-0" />
            <span>Exportar CSV / PDF</span>
          </button>
        </div>
      </div>
      
      {/* ========================================================================= */}
      {/* MONITORAMENTO & ALERTA VISUAL DE FLUXO DE CAIXA DIÁRIO VS META */}
      {/* ========================================================================= */}
      <MonitorFluxoCaixa
        dailyNetVolume={financialSummary.netVolume}
        dailyGrossVolume={financialSummary.totalVolume}
        pixVolume={financialSummary.pixTotal}
        cardVolume={financialSummary.cardTotal}
        onSimulateSale={(method, amount) => handleSimulatePayment(method, amount)}
        onOpenConfigModal={() => setIsConfigMetasOpen(true)}
      />

      {/* ========================================================================= */}
      {/* CARDS DE KPI: PIX VS CARTÃO & FLUXO LÍQUIDO */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* CARD 1: VOLUME PIX */}
        <div className="bg-[#12121E] border border-emerald-500/30 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-[0_4px_24px_rgba(0,0,0,0.4)] relative overflow-hidden group hover:border-emerald-500/60 transition-all">
          <div className="absolute top-0 right-0 w-28 h-28 bg-[#00E676]/10 rounded-full blur-2xl pointer-events-none group-hover:bg-[#00E676]/20 transition-all" />
          
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2.5 rounded-2xl bg-[#00E676]/15 text-[#00E676] border border-[#00E676]/30">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-emerald-400">Volume PIX</span>
                <p className="text-[10px] text-zinc-400">Liquidação D+0 Imediata</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#00E676]/20 text-[#00E676]">
              {financialSummary.pixPercent.toFixed(1)}% do total
            </span>
          </div>

          <div className="space-y-1">
            <div className="text-2xl md:text-3xl font-black font-mono text-white tracking-tight">
              {formatBRL(financialSummary.pixTotal)}
            </div>
            <div className="flex items-center justify-between text-xs text-zinc-400 pt-1 border-t border-zinc-800/80">
              <span>{financialSummary.pixCount} transações</span>
              <span>Ticket: <strong className="text-white font-mono">{financialSummary.pixCount > 0 ? formatBRL(financialSummary.pixTicket) : '—'}</strong></span>
            </div>
          </div>

          <div className="mt-3.5 flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-500/10 px-2.5 py-1.5 rounded-xl border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>Taxa 0.00% • <strong>R$ {financialSummary.pixSavingsVsCard.toFixed(2)}</strong> economizados em taxas</span>
          </div>
        </div>

        {/* CARD 2: VOLUME CARTÃO CRÉDITO */}
        <div className="bg-[#12121E] border border-blue-500/30 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-[0_4px_24px_rgba(0,0,0,0.4)] relative overflow-hidden group hover:border-blue-500/60 transition-all">
          <div className="absolute top-0 right-0 w-28 h-28 bg-blue-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-blue-500/20 transition-all" />
          
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2.5 rounded-2xl bg-blue-500/15 text-blue-400 border border-blue-500/30">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-blue-400">Cartão Crédito</span>
                <p className="text-[10px] text-zinc-400">À vista & Parcelado</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300">
              {financialSummary.creditPercent.toFixed(1)}% do total
            </span>
          </div>

          <div className="space-y-1">
            <div className="text-2xl md:text-3xl font-black font-mono text-white tracking-tight">
              {formatBRL(financialSummary.creditTotal)}
            </div>
            <div className="flex items-center justify-between text-xs text-zinc-400 pt-1 border-t border-zinc-800/80">
              <span>{financialSummary.creditCount} transações</span>
              <span>Ticket: <strong className="text-white font-mono">{financialSummary.creditCount > 0 ? formatBRL(financialSummary.creditTicket) : '—'}</strong></span>
            </div>
          </div>

          <div className="mt-3.5 flex items-center justify-between text-[11px] text-zinc-400 bg-blue-500/5 px-2.5 py-1.5 rounded-xl border border-blue-500/15">
            <span>MDR Médio: ~2.89%</span>
            <span className="text-rose-400 font-mono font-bold">- {formatBRL(financialSummary.feeCredit)} retido</span>
          </div>
        </div>

        {/* CARD 3: VOLUME CARTÃO DÉBITO */}
        <div className="bg-[#12121E] border border-purple-500/30 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-[0_4px_24px_rgba(0,0,0,0.4)] relative overflow-hidden group hover:border-purple-500/60 transition-all">
          <div className="absolute top-0 right-0 w-28 h-28 bg-purple-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-purple-500/20 transition-all" />
          
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2.5 rounded-2xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-purple-400">Cartão Débito</span>
                <p className="text-[10px] text-zinc-400">Liquidação D+1 Útil</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300">
              {financialSummary.debitPercent.toFixed(1)}% do total
            </span>
          </div>

          <div className="space-y-1">
            <div className="text-2xl md:text-3xl font-black font-mono text-white tracking-tight">
              {formatBRL(financialSummary.debitTotal)}
            </div>
            <div className="flex items-center justify-between text-xs text-zinc-400 pt-1 border-t border-zinc-800/80">
              <span>{financialSummary.debitCount} transações</span>
              <span>Ticket: <strong className="text-white font-mono">{financialSummary.debitCount > 0 ? formatBRL(financialSummary.debitTicket) : '—'}</strong></span>
            </div>
          </div>

          <div className="mt-3.5 flex items-center justify-between text-[11px] text-zinc-400 bg-purple-500/5 px-2.5 py-1.5 rounded-xl border border-purple-500/15">
            <span>MDR Médio: ~1.29%</span>
            <span className="text-rose-400 font-mono font-bold">- {formatBRL(financialSummary.feeDebit)} retido</span>
          </div>
        </div>

        {/* CARD 4: FLUXO DE CAIXA LÍQUIDO */}
        <div className="bg-[#12121E] border border-amber-500/30 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-[0_4px_24px_rgba(0,0,0,0.4)] relative overflow-hidden group hover:border-amber-500/60 transition-all">
          <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/20 transition-all" />
          
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-amber-400">Saldo Líquido</span>
                <p className="text-[10px] text-zinc-400">Caixa Descontado de Taxas</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300">
              {financialSummary.totalCount} vendas
            </span>
          </div>

          <div className="space-y-1">
            <div className="text-2xl md:text-3xl font-black font-mono text-white tracking-tight">
              {formatBRL(financialSummary.netVolume)}
            </div>
            <div className="flex items-center justify-between text-xs text-zinc-400 pt-1 border-t border-zinc-800/80">
              <span>Bruto: {formatBRL(financialSummary.totalVolume)}</span>
              <span className="text-rose-400 font-mono">- {formatBRL(financialSummary.totalFeesRetained)}</span>
            </div>
          </div>

          <div className="mt-3.5 flex items-center justify-between text-[11px] text-zinc-300 bg-amber-500/10 px-2.5 py-1.5 rounded-xl border border-amber-500/20">
            <span>Status da Sessão:</span>
            <span className="font-bold text-[#00E676]">
              {activeCashSession?.status === 'open' ? '● Caixa Aberto' : '● Operacional'}
            </span>
          </div>

          {/* Meta Diária Definida pelo Gerente */}
          <div className="mt-3 pt-2.5 border-t border-zinc-800/80 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <button
                type="button"
                onClick={() => {
                  setIsConfigMetasOpen(true);
                  playBeep(700, 0.04);
                }}
                className="text-zinc-400 hover:text-[#FFC72C] flex items-center gap-1 transition-colors cursor-pointer group/meta"
                title="Clique para ajustar as metas de faturamento do gerente"
              >
                <Target className="w-3 h-3 text-[#FFC72C] group-hover/meta:scale-110 transition-transform" />
                <span>Meta Diária:</span>
                <strong className="font-mono text-white underline decoration-dashed decoration-zinc-600 underline-offset-2">
                  {formatBRL(managerTargets.dailyRevenueTarget)}
                </strong>
              </button>
              <span className={`font-mono font-bold ${
                financialSummary.netVolume >= managerTargets.dailyRevenueTarget ? 'text-[#00E676]' : 'text-amber-400'
              }`}>
                {managerTargets.dailyRevenueTarget > 0 
                  ? ((financialSummary.netVolume / managerTargets.dailyRevenueTarget) * 100).toFixed(0) 
                  : 0}%
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  financialSummary.netVolume >= managerTargets.dailyRevenueTarget 
                    ? 'bg-[#00E676]' 
                    : 'bg-gradient-to-r from-amber-500 to-[#00E676]'
                }`}
                style={{ 
                  width: `${Math.min(100, managerTargets.dailyRevenueTarget > 0 ? (financialSummary.netVolume / managerTargets.dailyRevenueTarget) * 100 : 0)}%` 
                }}
              />
            </div>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* ALERTA OPERACIONAL DE PEDIDOS PENDENTES DE WEBHOOK */}
      {/* ========================================================================= */}
      {settlementSummary.pendingWebhookCount > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-amber-500/15 via-[#FF7A00]/10 to-zinc-900 border border-amber-500/40 rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_4px_24px_rgba(245,158,11,0.15)] relative overflow-hidden"
        >
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0 relative">
              <Clock className="w-5 h-5 animate-pulse" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                  Atenção Operacional • 'Pendente' (aguardando webhook)
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 font-mono">
                  {settlementSummary.pendingWebhookCount} {settlementSummary.pendingWebhookCount === 1 ? 'pedido' : 'pedidos'}
                </span>
              </div>
              <p className="text-xs text-zinc-300 mt-0.5">
                Existem <strong>{formatBRL(settlementSummary.pendingWebhookTotal)}</strong> classificados como <strong>'Pendente' (aguardando webhook)</strong> aguardando confirmação do gateway ({settlementSummary.pendingPixCount} Pix QR Code / {settlementSummary.pendingCardCount} Cartão).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setSettlementFilter('webhook_pending');
                playBeep(700, 0.04);
                const el = document.getElementById('secao_historico_transacoes');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>Ver 'Pendente' (aguardando webhook)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {filteredOrders.find(o => getOrderSettlementCategory(o) === 'webhook_pending') && (
              <button
                onClick={() => {
                  const pending = filteredOrders.find(o => getOrderSettlementCategory(o) === 'webhook_pending');
                  if (pending) handleApproveWebhookOrder(pending);
                }}
                className="px-3.5 py-2 rounded-xl bg-[#00E676] hover:bg-[#00D26A] text-black font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                title="Simula o recebimento do callback HTTP do gateway de pagamento"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Simular Baixa Webhook</span>
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* Notificação Flutuante de Sucesso de Sincronização no Firestore */}
      <AnimatePresence>
        {syncFeedbackMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-2xl bg-emerald-950/90 border border-emerald-500/50 flex items-center justify-between gap-3 text-emerald-200 text-xs shadow-xl backdrop-blur-md"
          >
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-emerald-500/20 text-[#00E676]">
                <Database className="w-4 h-4" />
              </span>
              <span className="font-bold text-sm text-emerald-100">{syncFeedbackMessage}</span>
            </div>
            <button
              onClick={() => setSyncFeedbackMessage(null)}
              className="p-1.5 rounded-lg hover:bg-emerald-900/60 text-emerald-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* SEÇÃO PRINCIPAL: CONCILIAÇÃO & STATUS DE LIQUIDAÇÃO DOS PAGAMENTOS */}
      {/* DIFERENCIA: CONFIRMADO VIA GATEWAY VS PENDENTE DE WEBHOOK VS DINHEIRO MANUAL */}
      {/* ========================================================================= */}
      <div className="bg-[#12121E] border border-zinc-800 rounded-3xl p-5 md:p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] space-y-6 relative overflow-hidden">
        {/* Glow de fundo */}
        <div className="absolute top-0 right-1/4 w-96 h-40 bg-[#00E676]/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-40 bg-amber-500/5 blur-3xl pointer-events-none" />

        {/* Cabeçalho da Seção */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-blue-500/15 text-blue-400 border border-blue-500/30">
                <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
                CONCILIAÇÃO BANCÁRIA & GATEWAYS
              </span>
              <span className="text-xs text-zinc-400">Auditoria de Entradas e Liquidação</span>
            </div>
            <h2 className="text-lg md:text-xl font-black text-white tracking-tight flex items-center gap-2">
              <span>Status dos Pagamentos da Operação</span>
            </h2>
            <p className="text-xs text-zinc-400 max-w-3xl leading-relaxed">
              Diferenciação clara entre <strong className="text-[#00E676]">Pagamentos Confirmados via Gateway</strong> (liquidados automaticamente por Pix/Cartão via Webhook ou TEF),{' '}
              <strong className="text-amber-400">Pendentes de Webhook</strong> (QR Codes ativos aguardando pagamento do cliente ou análise de antifraude) e{' '}
              <strong className="text-[#FFC72C]">Registrados Manualmente em Dinheiro</strong> (frente de caixa e gaveta física do operador).
            </p>
          </div>

          {/* Ações Rápidas de Teste e Configuração */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleCreateTestPendingOrder('pix')}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all cursor-pointer"
              title="Cria um pedido de teste aguardando confirmação do webhook do gateway"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>+ Testar Webhook Pendente</span>
            </button>

            <button
              onClick={handleCreateTestCashOrder}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 transition-all cursor-pointer"
              title="Registra uma venda manual de teste em dinheiro na gaveta do caixa"
            >
              <Banknote className="w-3.5 h-3.5" />
              <span>+ Venda Dinheiro Caixa</span>
            </button>

            <button
              onClick={() => {
                setIsUnitGatewayModalOpen(true);
                playBeep(750, 0.04);
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/40 transition-all cursor-pointer shadow-sm active:scale-95"
              title="Configurar chaves de API Pix e Cartão desta Unidade no Firestore"
            >
              <Key className="w-3.5 h-3.5 text-purple-400" />
              <span>Chaves API da Unidade</span>
              {unitGatewayConfig?.isConfigured && (
                <span className="w-2 h-2 rounded-full bg-[#00E676] animate-pulse" title="Chaves configuradas no Firestore" />
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('webhooks_sync');
                playBeep(750, 0.04);
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-[#00E676] border border-emerald-500/30 transition-all cursor-pointer"
              title="Monitorar sincronização de webhooks no Firestore"
            >
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>Painel Sincronização Firestore</span>
            </button>

            <button
              onClick={() => {
                setCurrentView('gateway_pagamentos');
                playBeep(750, 0.04);
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white border border-zinc-700 transition-all cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-zinc-400" />
              <span>Configurar Gateways</span>
            </button>
          </div>
        </div>

        {/* GRADE DOS 3 CARDS DE STATUS DE PAGAMENTO */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          
          {/* ========================================================================= */}
          {/* CARD 1: PAGAMENTOS CONFIRMADOS VIA GATEWAY */}
          {/* ========================================================================= */}
          <div className="bg-[#09090D] border border-emerald-500/40 rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-emerald-500/80 transition-all flex flex-col justify-between shadow-[0_4px_20px_rgba(0,230,118,0.1)]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#00E676]/10 rounded-full blur-2xl pointer-events-none group-hover:bg-[#00E676]/20 transition-all" />

            <div className="space-y-3">
              {/* Header do Card */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2.5 rounded-2xl bg-[#00E676]/15 text-[#00E676] border border-[#00E676]/30">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-400">'Confirmado' (via gateway)</span>
                    <p className="text-[10px] text-zinc-400">Liquidação Digital Automática • Firestore OK</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/30">
                  {settlementSummary.gatewayPercent.toFixed(1)}% do faturamento
                </span>
              </div>

              {/* Valor Principal */}
              <div className="space-y-1 pt-1">
                <div className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight">
                  {formatBRL(settlementSummary.gatewayTotal)}
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>{settlementSummary.gatewayCount} pedidos liquidados</span>
                  <span className="text-emerald-400 font-bold text-[11px] flex items-center gap-1">
                    <Zap className="w-3 h-3" /> 100% Conciliado
                  </span>
                </div>
              </div>

              {/* Sub-Métricas: Pix vs Cartão */}
              <div className="pt-3 border-t border-zinc-800/80 space-y-2 text-xs">
                <div className="flex items-center justify-between text-zinc-300">
                  <span className="flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5 text-[#00E676]" />
                    <span>Pix Dinâmico (D+0):</span>
                  </span>
                  <strong className="font-mono text-white">{formatBRL(settlementSummary.gatewayPixTotal)}</strong>
                </div>

                <div className="flex items-center justify-between text-zinc-300">
                  <span className="flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                    <span>Cartões Créd./Déb.:</span>
                  </span>
                  <strong className="font-mono text-white">{formatBRL(settlementSummary.gatewayCardTotal)}</strong>
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-zinc-800/50">
                  <span>Taxas MDR Retidas:</span>
                  <span className="text-rose-400 font-mono font-bold">- {formatBRL(settlementSummary.gatewayFees)}</span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1.5 rounded-xl border border-emerald-500/20">
                  <span>Líquido em Conta:</span>
                  <span className="font-mono text-xs">{formatBRL(settlementSummary.gatewayNet)}</span>
                </div>
              </div>
            </div>

            {/* Rodapé: Botão de Filtro Rápido */}
            <div className="mt-4 pt-3 border-t border-zinc-800/80">
              <button
                type="button"
                onClick={() => {
                  setSettlementFilter('gateway_confirmed');
                  playBeep(700, 0.04);
                  const el = document.getElementById('secao_historico_transacoes');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  settlementFilter === 'gateway_confirmed'
                    ? 'bg-[#00E676] text-black shadow-md'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white'
                }`}
              >
                <span>{settlementFilter === 'gateway_confirmed' ? "✓ Filtrando 'Confirmado' (via gateway)" : "Filtrar 'Confirmado' (via gateway)"}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* CARD 2: PENDENTES DE WEBHOOK */}
          {/* ========================================================================= */}
          <div className={`bg-[#09090D] border rounded-2xl p-4 sm:p-5 relative overflow-hidden group transition-all flex flex-col justify-between ${
            settlementSummary.pendingWebhookCount > 0 
              ? 'border-amber-500/50 shadow-[0_4px_24px_rgba(245,158,11,0.15)] hover:border-amber-500/80' 
              : 'border-zinc-800 hover:border-zinc-700'
          }`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/20 transition-all" />

            <div className="space-y-3">
              {/* Header do Card */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-2.5 rounded-2xl border ${
                    settlementSummary.pendingWebhookCount > 0
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                  }`}>
                    <Clock className={`w-5 h-5 ${settlementSummary.pendingWebhookCount > 0 ? 'animate-pulse' : ''}`} />
                  </div>
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-amber-400">'Pendente' (aguardando webhook)</span>
                    <p className="text-[10px] text-zinc-400">Aguardando Retorno do Gateway • Retenção</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  settlementSummary.pendingWebhookCount > 0
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-zinc-800 text-zinc-500'
                }`}>
                  {settlementSummary.pendingWebhookCount} em aberto
                </span>
              </div>

              {/* Valor Principal */}
              <div className="space-y-1 pt-1">
                <div className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
                  settlementSummary.pendingWebhookCount > 0 ? 'text-amber-300' : 'text-zinc-400'
                }`}>
                  {formatBRL(settlementSummary.pendingWebhookTotal)}
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>{settlementSummary.pendingWebhookCount} pedidos aguardando</span>
                  <span className="text-amber-400 font-bold text-[11px] flex items-center gap-1">
                    <Radio className="w-3 h-3 animate-ping" /> Callback Ativo
                  </span>
                </div>
              </div>

              {/* Sub-Métricas: QR Codes Pix vs Análise de Cartão */}
              <div className="pt-3 border-t border-zinc-800/80 space-y-2 text-xs">
                <div className="flex items-center justify-between text-zinc-300">
                  <span className="flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5 text-amber-400" />
                    <span>QR Code Pix Aberto:</span>
                  </span>
                  <strong className="font-mono text-white">
                    {settlementSummary.pendingPixCount} ped. ({formatBRL(settlementSummary.pendingPixTotal)})
                  </strong>
                </div>

                <div className="flex items-center justify-between text-zinc-300">
                  <span className="flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                    <span>Cartão em Análise:</span>
                  </span>
                  <strong className="font-mono text-white">
                    {settlementSummary.pendingCardCount} ped. ({formatBRL(settlementSummary.pendingCardTotal)})
                  </strong>
                </div>

                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300/90 leading-tight">
                  {settlementSummary.pendingWebhookCount > 0 ? (
                    <span>
                      ⚠️ O pedido é enviado para a cozinha assim que o webhook da adquirente notificar o status <strong>approved</strong> no Firestore.
                    </span>
                  ) : (
                    <span className="text-zinc-400">
                      ✓ Nenhuma cobrança pendente. Todos os pagamentos gerados já foram confirmados ou finalizados.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Rodapé: Botões de Ação */}
            <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSettlementFilter('webhook_pending');
                  playBeep(700, 0.04);
                  const el = document.getElementById('secao_historico_transacoes');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  settlementFilter === 'webhook_pending'
                    ? 'bg-amber-500 text-black shadow-md'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white'
                }`}
              >
                <span>{settlementFilter === 'webhook_pending' ? "✓ Filtrando 'Pendente'" : "Filtrar 'Pendente'"}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {settlementSummary.pendingWebhookCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const pending = filteredOrders.find(o => getOrderSettlementCategory(o) === 'webhook_pending');
                    if (pending) handleApproveWebhookOrder(pending);
                  }}
                  className="py-2 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-[#00E676] border border-emerald-500/30 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  title="Simula a chegada da notificação de pagamento do gateway e atualiza o Firestore"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Aprovar 1º</span>
                </button>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* CARD 3: REGISTRADO MANUALMENTE EM DINHEIRO */}
          {/* ========================================================================= */}
          <div className="bg-[#09090D] border border-yellow-500/40 rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-yellow-500/80 transition-all flex flex-col justify-between shadow-[0_4px_20px_rgba(234,179,8,0.1)]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-yellow-500/20 transition-all" />

            <div className="space-y-3">
              {/* Header do Card */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2.5 rounded-2xl bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
                    <Banknote className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-yellow-400">'Registro Manual' (dinheiro)</span>
                    <p className="text-[10px] text-zinc-400">Frente de Caixa • Gaveta Física PDV</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                  {settlementSummary.cashPercent.toFixed(1)}% do total
                </span>
              </div>

              {/* Valor Principal */}
              <div className="space-y-1 pt-1">
                <div className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight">
                  {formatBRL(settlementSummary.cashTotal)}
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>{settlementSummary.cashCount} vendas em espécie</span>
                  <span className="text-yellow-400 font-bold text-[11px] flex items-center gap-1">
                    <Wallet className="w-3 h-3" /> Físico no PDV
                  </span>
                </div>
              </div>

              {/* Detalhes do Caixa Físico */}
              <div className="pt-3 border-t border-zinc-800/80 space-y-2 text-xs">
                <div className="flex items-center justify-between text-zinc-300">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Taxa de Gateway (MDR):</span>
                  </span>
                  <strong className="font-mono text-emerald-400">R$ 0,00 (0.00%)</strong>
                </div>

                <div className="flex items-center justify-between text-zinc-300">
                  <span className="flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Saldo Sessão de Caixa:</span>
                  </span>
                  <strong className="font-mono text-white">
                    {activeCashSession?.status === 'open' 
                      ? formatBRL(activeCashSession.currentBalance) 
                      : 'Caixa Fechado'}
                  </strong>
                </div>

                <div className="p-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-[11px] text-yellow-200/90 leading-tight">
                  <span>
                    💵 Recebido em cédulas e moedas no balcão. Lançamento direto na gaveta física com 0% taxa de intermediação.
                  </span>
                </div>
              </div>
            </div>

            {/* Rodapé: Botão de Filtro Rápido */}
            <div className="mt-4 pt-3 border-t border-zinc-800/80">
              <button
                type="button"
                onClick={() => {
                  setSettlementFilter('cash_manual');
                  playBeep(700, 0.04);
                  const el = document.getElementById('secao_historico_transacoes');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  settlementFilter === 'cash_manual'
                    ? 'bg-yellow-400 text-black shadow-md'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white'
                }`}
              >
                <span>{settlementFilter === 'cash_manual' ? "✓ Filtrando 'Registro Manual'" : "Filtrar 'Registro Manual' (dinheiro)"}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>

        {/* BARRA COMPARATIVA PROPORCIONAL DE STATUS DE LIQUIDAÇÃO */}
        <div className="p-4 bg-[#09090D] border border-zinc-800/80 rounded-2xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <span className="font-bold text-zinc-300 flex items-center gap-2">
              <Percent className="w-4 h-4 text-blue-400" />
              Distribuição Proporcional por Modalidade de Liquidação
            </span>

            <div className="flex items-center gap-3 sm:gap-4 font-mono text-[11px] flex-wrap">
              <span className="flex items-center gap-1.5 text-[#00E676]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00E676]" />
                'Confirmado' (via gateway): {settlementSummary.gatewayPercent.toFixed(1)}%
              </span>
              <span className="flex items-center gap-1.5 text-amber-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                'Pendente' (aguardando webhook): {settlementSummary.pendingPercent.toFixed(1)}%
              </span>
              <span className="flex items-center gap-1.5 text-yellow-300">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                'Registro Manual' (dinheiro): {settlementSummary.cashPercent.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Barra de Progresso Três Cores */}
          <div className="w-full h-3.5 bg-zinc-900 rounded-full overflow-hidden flex shadow-inner border border-zinc-800">
            <div 
              style={{ width: `${Math.max(settlementSummary.gatewayTotal > 0 ? 3 : 0, settlementSummary.gatewayPercent)}%` }} 
              className="h-full bg-[#00E676] transition-all duration-700"
              title={`Confirmado Gateway: ${formatBRL(settlementSummary.gatewayTotal)} (${settlementSummary.gatewayPercent.toFixed(1)}%)`}
            />
            <div 
              style={{ width: `${Math.max(settlementSummary.pendingWebhookTotal > 0 ? 3 : 0, settlementSummary.pendingPercent)}%` }} 
              className="h-full bg-amber-500 transition-all duration-700"
              title={`Pendente Webhook: ${formatBRL(settlementSummary.pendingWebhookTotal)} (${settlementSummary.pendingPercent.toFixed(1)}%)`}
            />
            <div 
              style={{ width: `${Math.max(settlementSummary.cashTotal > 0 ? 3 : 0, settlementSummary.cashPercent)}%` }} 
              className="h-full bg-yellow-400 transition-all duration-700"
              title={`Dinheiro Manual: ${formatBRL(settlementSummary.cashTotal)} (${settlementSummary.cashPercent.toFixed(1)}%)`}
            />
          </div>
        </div>
      </div>
      <div className="bg-[#12121E] border border-zinc-800 rounded-3xl p-5 md:p-6 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm md:text-base font-bold text-white flex items-center gap-2">
              <Percent className="w-4 h-4 text-[#FFC72C]" />
              Split do Faturamento: Pix vs Cartão de Crédito vs Cartão de Débito
            </h3>
            <p className="text-xs text-zinc-400">
              Proporção relativa entre os canais eletrônicos de pagamento recebidos pelo estabelecimento.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-[#00E676]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00E676]" />
              Pix: {financialSummary.pixPercent.toFixed(1)}%
            </span>
            <span className="flex items-center gap-1.5 text-blue-400">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              Crédito: {financialSummary.creditPercent.toFixed(1)}%
            </span>
            <span className="flex items-center gap-1.5 text-purple-400">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              Débito: {financialSummary.debitPercent.toFixed(1)}%
            </span>
            {financialSummary.cashPercent > 0 && (
              <span className="flex items-center gap-1.5 text-amber-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                Dinheiro: {financialSummary.cashPercent.toFixed(1)}%
              </span>
            )}
          </div>
        </div>

        {/* Barra de Progresso Multi-Cores */}
        <div className="w-full h-4 bg-zinc-900 rounded-full overflow-hidden flex shadow-inner border border-zinc-800">
          <div 
            style={{ width: `${Math.max(2, financialSummary.pixPercent)}%` }} 
            className="h-full bg-[#00E676] transition-all duration-700 relative group"
            title={`Pix: ${formatBRL(financialSummary.pixTotal)} (${financialSummary.pixPercent.toFixed(1)}%)`}
          />
          <div 
            style={{ width: `${Math.max(2, financialSummary.creditPercent)}%` }} 
            className="h-full bg-blue-500 transition-all duration-700 relative group"
            title={`Crédito: ${formatBRL(financialSummary.creditTotal)} (${financialSummary.creditPercent.toFixed(1)}%)`}
          />
          <div 
            style={{ width: `${Math.max(2, financialSummary.debitPercent)}%` }} 
            className="h-full bg-purple-500 transition-all duration-700 relative group"
            title={`Débito: ${formatBRL(financialSummary.debitTotal)} (${financialSummary.debitPercent.toFixed(1)}%)`}
          />
          {financialSummary.cashPercent > 0 && (
            <div 
              style={{ width: `${Math.max(2, financialSummary.cashPercent)}%` }} 
              className="h-full bg-amber-400 transition-all duration-700 relative group"
              title={`Dinheiro: ${formatBRL(financialSummary.cashTotal)} (${financialSummary.cashPercent.toFixed(1)}%)`}
            />
          )}
        </div>

        {/* Dica de Otimização Financeira */}
        <div className="flex items-center justify-between text-xs text-zinc-400 bg-zinc-900/60 p-3 rounded-2xl border border-zinc-800/80">
          <span className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#00E676] shrink-0" />
            <span>
              O Pix responde por <strong className="text-white">{financialSummary.pixPercent.toFixed(1)}%</strong> da receita.
              Estímulo ao Pix via QR Code na mesa e cardápio online economizou <strong>{formatBRL(financialSummary.pixSavingsVsCard)}</strong> em tarifas bancárias no período.
            </span>
          </span>
          <button
            onClick={() => setCurrentView('financeiro_dre')}
            className="hidden sm:flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 font-bold shrink-0 ml-4"
          >
            <span>Ver DRE Completo</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SEÇÃO PRINCIPAL DE GRÁFICOS RECHARTS */}
      {/* ========================================================================= */}
      <div className="bg-[#12121E] border border-zinc-800 rounded-3xl p-5 md:p-6 shadow-md space-y-6">
        
        {/* Barra de Abas do Gráfico */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => { setActiveTab('comparativo'); playBeep(750, 0.03); }}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-2xl transition-all ${
                activeTab === 'comparativo'
                  ? 'bg-zinc-800 text-white border border-zinc-700 shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <TrendingUp className="w-4 h-4 text-[#00E676]" />
              <span>Evolução Temporal Pix vs Cartão</span>
            </button>

            <button
              onClick={() => { setActiveTab('fluxo_caixa'); playBeep(750, 0.03); }}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-2xl transition-all ${
                activeTab === 'fluxo_caixa'
                  ? 'bg-zinc-800 text-white border border-zinc-700 shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <DollarSign className="w-4 h-4 text-[#FFC72C]" />
              <span>Fluxo Líquido Real-Time</span>
            </button>

            <button
              onClick={() => { setActiveTab('canais'); playBeep(750, 0.03); }}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-2xl transition-all ${
                activeTab === 'canais'
                  ? 'bg-zinc-800 text-white border border-zinc-700 shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <Layers className="w-4 h-4 text-blue-400" />
              <span>Canais de Venda</span>
            </button>

            <button
              onClick={() => { setActiveTab('webhooks_sync'); playBeep(750, 0.03); }}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-2xl transition-all ${
                activeTab === 'webhooks_sync'
                  ? 'bg-zinc-800 text-emerald-400 border border-emerald-500/50 shadow-md'
                  : 'text-zinc-400 hover:text-emerald-400 hover:bg-zinc-900'
              }`}
            >
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>Sincronização Webhooks & Firestore</span>
              {settlementSummary.pendingCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {settlementSummary.pendingCount}
                </span>
              )}
            </button>
          </div>

          {/* Toggle R$ / Quantidade */}
          <div className="flex items-center bg-[#09090D] border border-zinc-800 p-1 rounded-2xl self-start sm:self-auto">
            <button
              onClick={() => setMetricMode('revenue')}
              className={`px-3 py-1 text-xs font-bold rounded-xl transition-all ${
                metricMode === 'revenue'
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Volume (R$)
            </button>
            <button
              onClick={() => setMetricMode('count')}
              className={`px-3 py-1 text-xs font-bold rounded-xl transition-all ${
                metricMode === 'count'
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Nº Transações
            </button>
          </div>
        </div>

        {/* ABA 1: GRÁFICO COMPARATIVO TEMPORAL (PIX VS CARTÃO) */}
        {activeTab === 'comparativo' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Gráfico de Área Recharts (2 colunas) */}
            <div className="lg:col-span-2 space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="font-semibold text-white">
                  Curva de Transações {timeFilter === 'today' ? 'por Horário de Pico' : 'por Período'}
                </span>
                <span className="flex items-center gap-4 font-mono text-[11px]">
                  <span className="flex items-center gap-1.5 text-[#00E676]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#00E676]" />
                    Pix Instantâneo
                  </span>
                  <span className="flex items-center gap-1.5 text-blue-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    Cartão Crédito
                  </span>
                  <span className="flex items-center gap-1.5 text-purple-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                    Cartão Débito
                  </span>
                </span>
              </div>

              <div className="h-[320px] w-full pt-2">
                {financialSummary.totalCount > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={timelineChartData}
                      margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorPix" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00E676" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#00E676" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="colorCredit" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="colorDebit" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272A" opacity={0.5} />
                      <XAxis 
                        dataKey="period" 
                        stroke="#71717A" 
                        tick={{ fill: '#A1A1AA', fontSize: 11 }} 
                      />
                      <YAxis 
                        stroke="#71717A" 
                        tick={{ fill: '#A1A1AA', fontSize: 11 }}
                        tickFormatter={(v) => metricMode === 'revenue' ? `R$${v >= 1000 ? `${(v/1000).toFixed(1)}k` : v}` : v}
                      />
                      <Tooltip content={<CustomAreaTooltip mode={metricMode} />} />
                      
                      <Area 
                        type="monotone" 
                        dataKey={metricMode === 'revenue' ? 'pix' : 'pixCount'} 
                        name="Pix Instantâneo" 
                        stroke="#00E676" 
                        strokeWidth={2.5}
                        fillOpacity={1} 
                        fill="url(#colorPix)" 
                      />
                      <Area 
                        type="monotone" 
                        dataKey={metricMode === 'revenue' ? 'credito' : 'cartaoCount'} 
                        name="Cartão Crédito" 
                        stroke="#3B82F6" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorCredit)" 
                      />
                      <Area 
                        type="monotone" 
                        dataKey={metricMode === 'revenue' ? 'debito' : 'cartaoCount'} 
                        name="Cartão Débito" 
                        stroke="#8B5CF6" 
                        strokeWidth={1.8}
                        fillOpacity={1} 
                        fill="url(#colorDebit)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-2">
                    <Percent className="w-8 h-8 text-zinc-600 mx-auto" />
                    <div className="text-xs font-bold text-white">Ainda não há dados suficientes para gerar este gráfico.</div>
                    <p className="text-[11px] text-zinc-400 max-w-sm">
                      Quando suas primeiras vendas acontecerem, a distribuição entre Pix e Cartão aparecerá aqui em tempo real.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Gráfico Donut de Mix de Meios (1 coluna) */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <PieIcon className="w-3.5 h-3.5 text-purple-400" />
                  Mix de Pagamento (Donut)
                </h4>
                <p className="text-[11px] text-zinc-400">Participação relativa na receita da loja</p>
              </div>

              <div className="h-[180px] w-full relative my-2">
                {financialSummary.totalVolume > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={paymentMethodDonutData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {paymentMethodDonutData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="#12121E" strokeWidth={2} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomDonutTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    
                    {/* Texto Central do Donut */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[10px] text-zinc-400 uppercase font-semibold">Total</span>
                      <span className="text-xs font-black font-mono text-white">
                        {formatBRL(financialSummary.totalVolume)}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-1">
                    <PieIcon className="w-6 h-6 text-zinc-600 mx-auto" />
                    <span className="text-[11px] text-zinc-400">Sem vendas registradas</span>
                  </div>
                )}
              </div>

              {/* Legenda Detalhada com Prazos de Liquidação */}
              <div className="space-y-1.5 text-xs">
                {paymentMethodDonutData.map((m, idx) => (
                  <div key={`legend-${idx}`} className="flex items-center justify-between py-1 border-t border-zinc-800/60">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                      <div>
                        <span className="font-semibold text-white">{m.shortName}</span>
                        <p className="text-[10px] text-zinc-400">{m.settlement}</p>
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <span className="font-bold text-white">{formatBRL(m.value)}</span>
                      <p className="text-[10px] text-zinc-400">{m.percent}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ABA 2: FLUXO DE CAIXA LÍQUIDO REAL-TIME (ENTRADAS VS RETENÇÃO MDR) */}
        {activeTab === 'fluxo_caixa' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-zinc-400 gap-2">
              <div>
                <h4 className="text-sm font-bold text-white">
                  Entradas Brutas vs Retenção de Taxas Adquirentes vs Saldo Líquido
                </h4>
                <p className="text-xs text-zinc-400">
                  Veja quanto do seu dinheiro cai limpo na conta e quanto fica retido nas operadoras de cartão.
                </p>
              </div>
              <div className="flex items-center gap-4 font-mono text-[11px]">
                <span className="flex items-center gap-1.5 text-[#00E676]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00E676]" />
                  Saldo Líquido Recebido
                </span>
                <span className="flex items-center gap-1.5 text-rose-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  Taxas Retidas (MDR)
                </span>
              </div>
            </div>

            <div className="h-[320px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={timelineChartData}
                  margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272A" opacity={0.5} />
                  <XAxis dataKey="period" stroke="#71717A" tick={{ fill: '#A1A1AA', fontSize: 11 }} />
                  <YAxis 
                    stroke="#71717A" 
                    tick={{ fill: '#A1A1AA', fontSize: 11 }}
                    tickFormatter={(v) => `R$${v}`}
                  />
                  <Tooltip content={<CustomAreaTooltip mode="revenue" />} />
                  <Bar dataKey="liquido" name="Saldo Líquido" fill="#00E676" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="taxas" name="Taxas Adquirente" fill="#F43F5E" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="bg-zinc-900/60 border border-zinc-800 p-3.5 rounded-2xl">
                <span className="text-xs text-zinc-400">Faturamento Bruto Total</span>
                <div className="text-lg font-mono font-black text-white mt-0.5">
                  {formatBRL(financialSummary.totalVolume)}
                </div>
              </div>
              <div className="bg-zinc-900/60 border border-zinc-800 p-3.5 rounded-2xl">
                <span className="text-xs text-zinc-400">Taxas Retidas pelas Maquininhas</span>
                <div className="text-lg font-mono font-black text-rose-400 mt-0.5">
                  - {formatBRL(financialSummary.totalFeesRetained)}
                </div>
              </div>
              <div className="bg-zinc-900/60 border border-zinc-800 p-3.5 rounded-2xl">
                <span className="text-xs text-zinc-400">Caixa Líquido Operacional</span>
                <div className="text-lg font-mono font-black text-[#00E676] mt-0.5">
                  {formatBRL(financialSummary.netVolume)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ABA 3: CANAIS DE VENDA (PIX VS CARTÃO POR CANAL) */}
        {activeTab === 'canais' && (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-bold text-white">
                Distribuição de Pix vs Cartão por Canal de Venda
              </h4>
              <p className="text-xs text-zinc-400">
                Identifique em qual ponto de contato o cliente prefere pagar via QR Code Pix ou cartão físico.
              </p>
            </div>

            <div className="h-[300px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={channelsComparisonData}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 40, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272A" opacity={0.5} />
                  <XAxis type="number" stroke="#71717A" tickFormatter={(v) => `R$${v}`} />
                  <YAxis type="category" dataKey="channel" stroke="#71717A" tick={{ fill: '#E4E4E7', fontSize: 11 }} />
                  <Tooltip content={<CustomAreaTooltip mode="revenue" />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar dataKey="pix" name="Pix Instantâneo" fill="#00E676" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="cartao" name="Cartões (Crédito/Débito)" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ABA 4: SINCRONIZAÇÃO AUTOMÁTICA DE WEBHOOKS & FIRESTORE */}
        {activeTab === 'webhooks_sync' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-emerald-500/20 text-[#00E676]">
                    <Radio className="w-4 h-4 animate-pulse" />
                  </span>
                  <h4 className="text-base font-black text-white">
                    Sincronização de Webhooks com Firestore em Tempo Real
                  </h4>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Recepção e conciliação automática de callbacks HTTP enviados pelos gateways de pagamento (Pix Mercado Pago, Bacen D+0, Stone, Pagar.me e Cielo) com baixa instantânea no Firestore.
                </p>
              </div>

              {/* Botões de Teste Rápido & Simulador Seguro */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setIsWebhookSimulatorOpen(true);
                    playBeep(700, 0.04);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500/20 to-[#00E676]/30 hover:from-emerald-500/30 hover:to-[#00E676]/40 text-[#00E676] border border-[#00E676]/50 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                  title="Abrir Simulador e Ingestor Seguro de Webhooks com Validação Criptográfica"
                >
                  <ShieldCheck className="w-4 h-4 text-[#00E676]" />
                  <span>Simulador Seguro Webhook</span>
                </button>

                <button
                  type="button"
                  disabled={isSyncingWebhook}
                  onClick={() => handleTestWebhookSync('mercadopago')}
                  className="px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-[#00E676] text-[#00E676] hover:text-black border border-emerald-500/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                  title="Simula callback HTTP do Mercado Pago (Pix)"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Testar Webhook Pix</span>
                </button>

                <button
                  type="button"
                  disabled={isSyncingWebhook}
                  onClick={() => handleTestWebhookSync('stone')}
                  className="px-3 py-2 rounded-xl bg-blue-500/20 hover:bg-blue-500 text-blue-400 hover:text-white border border-blue-500/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                  title="Simula callback HTTP da Stone (Cartão)"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Testar Webhook Cartão</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsUnitGatewayModalOpen(true);
                    playBeep(750, 0.04);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                  title="Configurar chaves de API Pix e Cartão desta Unidade no Firestore"
                >
                  <Key className="w-3.5 h-3.5 text-purple-400" />
                  <span>Chaves API da Unidade</span>
                  {unitGatewayConfig?.isConfigured && (
                    <span className="w-2 h-2 rounded-full bg-[#00E676] animate-pulse" />
                  )}
                </button>
              </div>
            </div>

            {/* Banner de Status das Chaves de API da Unidade no Firestore */}
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
                  <Building2 className="w-4 h-4" />
                </span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-white">Unidade Ativa: {currentBranch?.name || 'Matriz Principal'}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                      {currentBranch?.code || 'FILIAL'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      unitGatewayConfig?.isConfigured 
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    }`}>
                      {unitGatewayConfig?.isConfigured ? 'Chaves Ativas no Firestore' : 'Chaves Padrão (Sandbox)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Ambiente: <strong className="text-zinc-200">{unitGatewayConfig?.environment === 'production' ? 'Produção (Real)' : 'Sandbox (Testes)'}</strong> • 
                    Pix: <strong className="text-[#00E676]">{unitGatewayConfig?.activePixProvider || 'Mercado Pago'}</strong> • 
                    Cartões: <strong className="text-blue-400">{unitGatewayConfig?.activeCardProvider || 'Stone'}</strong>
                    {unitGatewayConfig?.updatedAt && ` • Atualizado: ${new Date(unitGatewayConfig.updatedAt).toLocaleTimeString('pt-BR')}`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsUnitGatewayModalOpen(true);
                  playBeep(750, 0.04);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap self-start md:self-auto"
              >
                <Key className="w-3.5 h-3.5" />
                <span>Gerenciar Chaves</span>
              </button>
            </div>

            {/* Grid de Métricas de Sincronização do Firestore */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Status do Firestore */}
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400 font-bold">Base Firestore</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-[#00E676] border border-emerald-500/40">
                    <Activity className="w-3 h-3 animate-spin" /> Conectado
                  </span>
                </div>
                <div className="text-sm font-mono font-bold text-white truncate" title="ai-studio-neonfoodos-5efedcdf-5a1d-470f-b24e-92d7571f4972">
                  neonfoodos-5efedcdf
                </div>
                <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                  <Database className="w-3 h-3 text-zinc-400" />
                  <span>Multi-Tenant: {tenant?.id || 'tenant_lanchonete_dulci'}</span>
                </div>
              </div>

              {/* Card 2: Webhooks Gravados */}
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400 font-bold">Webhooks Gravados</span>
                  <CheckCircle2 className="w-4 h-4 text-[#00E676]" />
                </div>
                <div className="text-2xl font-mono font-black text-white">
                  {firestoreWebhookLogs.length}
                </div>
                <div className="text-[10px] text-zinc-500">
                  Logs auditados em <code className="text-zinc-400">/webhook_logs</code>
                </div>
              </div>

              {/* Card 3: Volume Conciliado */}
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400 font-bold">Volume Conciliado</span>
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-xl font-mono font-black text-[#00E676]">
                  {formatBRL(settlementSummary.gatewayNet)}
                </div>
                <div className="text-[10px] text-zinc-500">
                  {settlementSummary.gatewayCount} pagamentos liquidados via gateway
                </div>
              </div>

              {/* Card 4: Fila de Pendentes */}
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400 font-bold">Aguardando Webhook</span>
                  <Clock className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-mono font-black text-amber-400">
                  {settlementSummary.pendingCount}
                </div>
                <div className="text-[10px] text-zinc-500">
                  {formatBRL(settlementSummary.pendingTotal)} aguardando retorno de API
                </div>
              </div>
            </div>

            {/* Endpoints de Webhook Disponíveis */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                  <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                  <span>Rotas Ativas de Ingestão de Webhook (API Backend)</span>
                </h5>
                <span className="text-[11px] text-[#00E676] font-mono font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#00E676] animate-ping" />
                  Pronto para Receber
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 text-xs font-mono">
                <div className="bg-[#09090D] border border-zinc-800 p-2.5 rounded-xl flex flex-col justify-between gap-1">
                  <div className="flex items-center justify-between">
                    <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold">POST</span>
                    <span className="text-[10px] text-zinc-500">Mercado Pago</span>
                  </div>
                  <span className="text-zinc-300 text-[11px] truncate">/api/webhooks/mercadopago</span>
                  <span className="text-[10px] text-emerald-400">Pix QR Code & Gateway</span>
                </div>

                <div className="bg-[#09090D] border border-zinc-800 p-2.5 rounded-xl flex flex-col justify-between gap-1">
                  <div className="flex items-center justify-between">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">POST</span>
                    <span className="text-[10px] text-zinc-500">Stone / Pagar.me</span>
                  </div>
                  <span className="text-zinc-300 text-[11px] truncate">/api/webhooks/stone</span>
                  <span className="text-[10px] text-emerald-400">Maquininhas & TEF</span>
                </div>

                <div className="bg-[#09090D] border border-zinc-800 p-2.5 rounded-xl flex flex-col justify-between gap-1">
                  <div className="flex items-center justify-between">
                    <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold">POST</span>
                    <span className="text-[10px] text-zinc-500">Pix Bacen D+0</span>
                  </div>
                  <span className="text-zinc-300 text-[11px] truncate">/api/webhooks/pix</span>
                  <span className="text-[10px] text-emerald-400">Notificação PSP Banco Central</span>
                </div>

                <div className="bg-[#09090D] border border-zinc-800 p-2.5 rounded-xl flex flex-col justify-between gap-1">
                  <div className="flex items-center justify-between">
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">POST</span>
                    <span className="text-[10px] text-zinc-500">Cielo E-commerce</span>
                  </div>
                  <span className="text-zinc-300 text-[11px] truncate">/api/webhooks/cielo</span>
                  <span className="text-[10px] text-emerald-400">Checkout & TEF</span>
                </div>
              </div>
            </div>

            {/* Tabela de Logs de Webhook em Tempo Real do Firestore */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-bold text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-[#00E676]" />
                  <span>Eventos Sincronizados no Firestore ({firestoreWebhookLogs.length})</span>
                </h5>
                <span className="text-[11px] text-zinc-400">
                  Atualização instantânea via Firestore Snapshot
                </span>
              </div>

              {firestoreWebhookLogs.length === 0 ? (
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-[#00E676] flex items-center justify-center mx-auto">
                    <Radio className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h6 className="text-sm font-bold text-white">Nenhum evento registrado ainda</h6>
                    <p className="text-xs text-zinc-400 max-w-md mx-auto">
                      Dispare uma simulação de webhook Pix ou Cartão para visualizar o log persistido diretamente na coleção do Firestore.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                      type="button"
                      disabled={isSyncingWebhook}
                      onClick={() => handleTestWebhookSync('mercadopago')}
                      className="px-4 py-2 rounded-xl bg-[#00E676] text-black font-black text-xs hover:brightness-110 transition-all cursor-pointer"
                    >
                      Disparar Webhook Pix Teste
                    </button>
                    <button
                      type="button"
                      disabled={isSyncingWebhook}
                      onClick={() => handleTestWebhookSync('stone')}
                      className="px-4 py-2 rounded-xl bg-blue-500 text-white font-bold text-xs hover:brightness-110 transition-all cursor-pointer"
                    >
                      Disparar Webhook Cartão Teste
                    </button>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-[#09090D]">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-800 text-[11px] font-bold text-zinc-400 uppercase tracking-wider bg-zinc-900/60">
                        <th className="p-3">Horário</th>
                        <th className="p-3">Gateway</th>
                        <th className="p-3">Evento</th>
                        <th className="p-3">Pedido</th>
                        <th className="p-3">Protocolo / NSU</th>
                        <th className="p-3 text-right">Valor</th>
                        <th className="p-3 text-center">Caixa Firestore</th>
                        <th className="p-3 text-center">Segurança & Integridade</th>
                        <th className="p-3 text-center">Status Firestore</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 font-mono">
                      {firestoreWebhookLogs.map((log) => {
                        const isPix = log.paymentMethod === 'pix' || log.provider === 'mercadopago' || log.provider === 'pix';
                        const protocol = log.pixEndToEndId || log.cardNsu || log.cardTid || log.orderCode || 'N/A';
                        const timeStr = log.createdAt || (log as any).timestamp;
                        const eventStr = log.event || (log as any).eventType || 'payment.approved';
                        return (
                          <tr key={log.id} className="hover:bg-zinc-900/40 transition-colors">
                            <td className="p-3 text-zinc-400 whitespace-nowrap">
                              {timeStr ? formatDateTime(timeStr) : '-'}
                            </td>
                            <td className="p-3 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isPix 
                                  ? 'bg-emerald-500/15 text-[#00E676] border border-emerald-500/30' 
                                  : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                              }`}>
                                {isPix ? <QrCode className="w-3 h-3" /> : <CreditCard className="w-3 h-3" />}
                                {formatGatewayProviderName(log.provider)}
                              </span>
                            </td>
                            <td className="p-3 text-zinc-300 font-bold whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 text-[10px]">
                                {eventStr}
                              </span>
                            </td>
                            <td className="p-3 text-white font-bold whitespace-nowrap">
                              {log.orderCode || log.orderId || '-'}
                            </td>
                            <td className="p-3 text-zinc-400 truncate max-w-[170px] text-[10px]" title={protocol}>
                              {protocol}
                            </td>
                            <td className="p-3 text-right font-black text-[#00E676] whitespace-nowrap">
                              {formatBRL(log.amount)}
                            </td>
                            <td className="p-3 text-center whitespace-nowrap">
                              {log.cashSessionUpdated ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00E676]/15 text-[#00E676] border border-[#00E676]/30">
                                  <DollarSign className="w-3 h-3" /> Caixa Atualizado
                                </span>
                              ) : (
                                <span className="text-[10px] text-zinc-500">Saldo Inalterado</span>
                              )}
                            </td>
                            <td className="p-3 text-center whitespace-nowrap">
                              {log.syncStatus === 'duplicate_prevented' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                  <ShieldCheck className="w-3 h-3" /> Idempotente
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                                  <ShieldCheck className="w-3 h-3" /> Assinatura Válida
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-center whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-[#00E676] border border-emerald-500/40">
                                <Check className="w-3 h-3" /> Sincronizado
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* HISTÓRICO DETALHADO DE TRANSAÇÕES E CONCILIAÇÃO BANCÁRIA */}
      {/* ========================================================================= */}
      <div id="secao_historico_transacoes" className="bg-[#12121E] border border-zinc-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-md space-y-4">
        {/* ABAS DE SELEÇÃO RÁPIDA POR STATUS DE LIQUIDAÇÃO */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-zinc-800/80 scrollbar-thin">
          <button
            type="button"
            onClick={() => { setSettlementFilter('all'); playBeep(700, 0.03); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              settlementFilter === 'all'
                ? 'bg-zinc-700 text-white shadow-sm'
                : 'bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <span>Todos os Status</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-zinc-800 text-zinc-300">
              {filteredOrders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setSettlementFilter('gateway_confirmed'); playBeep(700, 0.03); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              settlementFilter === 'gateway_confirmed'
                ? 'bg-emerald-500/25 text-[#00E676] border border-emerald-500/40 shadow-sm'
                : 'bg-zinc-900/80 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-[#00E676]" />
            <span>'Confirmado' (via gateway)</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-[#00E676]">
              {settlementSummary.gatewayCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setSettlementFilter('webhook_pending'); playBeep(700, 0.03); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              settlementFilter === 'webhook_pending'
                ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'bg-zinc-900/80 text-zinc-400 hover:text-amber-300 hover:bg-zinc-800'
            }`}
          >
            <Clock className={`w-3.5 h-3.5 text-amber-400 ${settlementSummary.pendingWebhookCount > 0 ? 'animate-pulse' : ''}`} />
            <span>'Pendente' (aguardando webhook)</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
              settlementSummary.pendingWebhookCount > 0 
                ? 'bg-amber-500/30 text-amber-300 font-bold' 
                : 'bg-zinc-800 text-zinc-500'
            }`}>
              {settlementSummary.pendingWebhookCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setSettlementFilter('cash_manual'); playBeep(700, 0.03); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              settlementFilter === 'cash_manual'
                ? 'bg-yellow-500/25 text-yellow-300 border border-yellow-500/40 shadow-sm'
                : 'bg-zinc-900/80 text-zinc-400 hover:text-yellow-300 hover:bg-zinc-800'
            }`}
          >
            <Banknote className="w-3.5 h-3.5 text-yellow-400" />
            <span>'Registro Manual' (dinheiro)</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-yellow-500/20 text-yellow-300">
              {settlementSummary.cashCount}
            </span>
          </button>
        </div>

        {/* GUIA DE DISTINÇÃO CLARA DE STATUS & CONEXÃO FIRESTORE */}
        <div className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 flex-1">
            <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00E676] shrink-0" />
              <div>
                <strong className="text-emerald-400 block font-bold text-[11px]">'Confirmado' (via gateway)</strong>
                <span className="text-[10px] text-zinc-400">Pix/Cartão liquidado e validado por Webhook</span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0 animate-ping" />
              <div>
                <strong className="text-amber-300 block font-bold text-[11px]">'Pendente' (aguardando webhook)</strong>
                <span className="text-[10px] text-zinc-400">QR Code / cobrança gerada aguardando gateway</span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 shrink-0" />
              <div>
                <strong className="text-yellow-300 block font-bold text-[11px]">'Registro Manual' (dinheiro)</strong>
                <span className="text-[10px] text-zinc-400">Recebido em espécie no caixa físico (0% taxa)</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-800/80 border border-emerald-500/30 shrink-0 shadow-xs">
            <div className="w-2.5 h-2.5 rounded-full bg-[#00E676] animate-pulse" />
            <span className="text-[11px] text-zinc-300 font-mono">
              Reativo em Tempo Real: <strong className="text-emerald-400">{firestoreOrders.length > 0 ? `${firestoreOrders.length} sincronizados no Firestore` : 'Firestore Conectado (sem recarregar)'}</strong>
            </span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-400" />
              Histórico de Pagamentos & Transações em Tempo Real
            </h3>
            <p className="text-xs text-zinc-400">
              Auditoria de cada baixa de pagamento, status de liquidação e integridade no Firestore.
            </p>
          </div>

          {/* Filtros e Busca */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full md:w-auto">
            {/* Campo de Busca */}
            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por #Pedido, NSU, TxID..."
                className="w-full pl-8 pr-3 py-2 text-xs bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 min-h-[40px]"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')} 
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filtro de Meio */}
            <select
              value={methodFilter}
              onChange={(e: any) => setMethodFilter(e.target.value)}
              className="flex-1 sm:flex-initial px-3 py-2 text-xs bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-200 focus:outline-none focus:border-emerald-500 min-h-[40px] cursor-pointer"
            >
              <option value="all">Todos os Meios</option>
              <option value="pix">Apenas PIX</option>
              <option value="credit_card">Cartão de Crédito</option>
              <option value="debit_card">Cartão de Débito</option>
              <option value="cash">Dinheiro</option>
            </select>

            {/* Filtro de Canal */}
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="flex-1 sm:flex-initial px-3 py-2 text-xs bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-200 focus:outline-none focus:border-emerald-500 min-h-[40px] cursor-pointer"
            >
              <option value="all">Todos os Canais</option>
              <option value="cardapio_online">Cardápio Online</option>
              <option value="pdv_balcao">Balcão PDV</option>
              <option value="mesa">Mesas & Salão</option>
              <option value="delivery_whatsapp">Delivery WhatsApp</option>
              <option value="ifood">iFood</option>
            </select>

            {/* Botão de Exportação de Transações Filtradas */}
            <button
              onClick={() => {
                setIsExportModalOpen(true);
                playBeep(750, 0.04);
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-[#00E676]/15 hover:bg-[#00E676]/25 text-[#00E676] border border-[#00E676]/40 transition-all cursor-pointer active:scale-95 shadow-sm min-h-[40px]"
              title="Exportar dados contábeis em formato CSV ou PDF"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Exportar (CSV / PDF)</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MOBILE CARD VIEW: LISTA RESPONSIVA EM TELAS PEQUENAS (< 768px) */}
        {/* ========================================================================= */}
        <div className="block md:hidden space-y-3">
          {paymentLedger.length === 0 ? (
            <div className="p-8 text-center text-zinc-400 bg-zinc-900/40 rounded-2xl border border-zinc-800 text-xs space-y-1">
              <div className="font-bold text-zinc-300">
                {allOrders.length === 0 
                  ? 'Ainda não há movimentações financeiras' 
                  : 'Nenhuma transação encontrada com os filtros selecionados'}
              </div>
              <p className="text-[11px] text-zinc-500">
                {allOrders.length === 0 
                  ? 'Os pagamentos confirmados via Pix, cartões ou caixa físico aparecerão aqui em tempo real.' 
                  : 'Tente alterar o período ou o método de pagamento selecionado.'}
              </p>
            </div>
          ) : (
            paymentLedger.map((order) => {
              const settlementCat = getOrderSettlementCategory(order);
              const isPix = order.paymentMethod === 'pix';
              const isCredit = order.paymentMethod === 'credit_card';
              const isDebit = order.paymentMethod === 'debit_card';
              const isCash = order.paymentMethod === 'cash';

              const feeAmt = isCredit 
                ? (order.total * 0.0289) 
                : isDebit 
                ? (order.total * 0.0129) 
                : 0;
              const netAmt = order.total - feeAmt;

              const identifier = order.pixTxId 
                ? order.pixTxId 
                : order.cardNsu 
                ? `NSU: ${order.cardNsu}` 
                : order.cardAuthCode 
                ? `AUT: ${order.cardAuthCode}`
                : 'Balcão / Caixa';

              return (
                <div
                  key={order.id}
                  onClick={() => setSelectedTransaction(order)}
                  className={`p-4 bg-zinc-900/70 border rounded-2xl space-y-3 cursor-pointer transition-all ${
                    settlementCat === 'webhook_pending' 
                      ? 'border-amber-500/40 hover:border-amber-500/70 shadow-[0_0_15px_rgba(245,158,11,0.08)]' 
                      : 'border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700 font-mono text-xs font-bold">
                        {order.displayCode}
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        {formatDateTime(order.createdAt)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Método */}
                      {isPix && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00E676]/15 text-[#00E676] border border-[#00E676]/30">
                          <QrCode className="w-3 h-3" /> PIX
                        </span>
                      )}
                      {isCredit && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                          <CreditCard className="w-3 h-3" /> Crédito
                        </span>
                      )}
                      {isDebit && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
                          <CreditCard className="w-3 h-3" /> Débito
                        </span>
                      )}
                      {isCash && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/15 text-yellow-300 border border-yellow-500/30">
                          <DollarSign className="w-3 h-3" /> Dinheiro
                        </span>
                      )}

                      {/* Status de Liquidação */}
                      {settlementCat === 'gateway_confirmed' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-[#00E676] border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" /> 'Confirmado' (via gateway)
                        </span>
                      )}
                      {settlementCat === 'webhook_pending' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                          <Clock className="w-3 h-3 text-amber-400" /> 'Pendente' (aguardando webhook)
                        </span>
                      )}
                      {settlementCat === 'cash_manual' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/15 text-yellow-300 border border-yellow-500/30">
                          <Banknote className="w-3 h-3 text-yellow-400" /> 'Registro Manual' (dinheiro)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-800/80">
                    <div>
                      <div className="font-semibold text-zinc-200 text-xs">{order.customerName}</div>
                      <div className="text-[10px] text-zinc-500 capitalize">{order.channel.replace('_', ' ')}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black font-mono text-[#00E676]">{formatBRL(netAmt)}</div>
                      <div className="text-[10px] text-zinc-500">
                        Bruto: {formatBRL(order.total)} {feeAmt > 0 && `(Taxa -${formatBRL(feeAmt)})`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60 text-[11px]" onClick={(e) => e.stopPropagation()}>
                    <span className="text-zinc-500 truncate max-w-[150px] font-mono text-[10px]" title={identifier}>
                      {identifier}
                    </span>
                    <div className="flex items-center gap-2">
                      {settlementCat === 'webhook_pending' && (
                        <button
                          onClick={(e) => handleApproveWebhookOrder(order, e)}
                          disabled={isSyncingWebhook}
                          className="px-2.5 py-1.5 min-h-[38px] rounded-xl bg-[#00E676] hover:bg-[#00D26A] text-black text-xs font-black transition-all flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
                          title="Aprovar e sincronizar liquidação via Webhook diretamente no Firestore"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>Baixa Firestore</span>
                        </button>
                      )}

                      <button
                        onClick={() => setSelectedTransaction(order)}
                        className="px-3 py-1.5 min-h-[38px] rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors flex items-center gap-1 font-bold text-xs"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>Ver</span>
                      </button>
                      <button
                        onClick={() => {
                          try {
                            thermalPrinterService.dispatchKitchenOrder(order);
                            playBeep(800, 0.05);
                          } catch (err) {
                            console.warn(err);
                          }
                        }}
                        className="p-2 min-h-[38px] min-w-[38px] rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors flex items-center justify-center"
                        title="Imprimir Comprovante Térmico ESC/POS"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ========================================================================= */}
        {/* DESKTOP TABLE VIEW: TABELA RICA COM SCROLL HORIZONTAL SEGURO (>= 768px) */}
        {/* ========================================================================= */}
        <div className="hidden md:block overflow-x-auto rounded-2xl border border-zinc-800">
          <table className="w-full text-left text-xs min-w-[850px]">
            <thead className="bg-zinc-900/80 text-zinc-400 font-semibold border-b border-zinc-800 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3">Horário / Data</th>
                <th className="p-3">Código</th>
                <th className="p-3">Cliente / Canal</th>
                <th className="p-3">Método</th>
                <th className="p-3">Status de Liquidação</th>
                <th className="p-3">Código NSU / TxId</th>
                <th className="p-3 text-right">Valor Bruto</th>
                <th className="p-3 text-right">Taxa (MDR)</th>
                <th className="p-3 text-right">Líquido</th>
                <th className="p-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono">
              {paymentLedger.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-10 text-center font-sans">
                    <div className="space-y-1">
                      <div className="font-bold text-zinc-300 text-sm">
                        {allOrders.length === 0 
                          ? 'Ainda não há movimentações financeiras nesta unidade' 
                          : 'Nenhuma transação encontrada com os filtros selecionados'}
                      </div>
                      <p className="text-xs text-zinc-500">
                        {allOrders.length === 0 
                          ? 'As vendas e pagamentos via Pix, cartões ou dinheiro serão sincronizados instantaneamente pelo Firestore.' 
                          : 'Experimente limpar a busca ou selecionar outro período no menu superior.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paymentLedger.map((order) => {
                  const settlementCat = getOrderSettlementCategory(order);
                  const isPix = order.paymentMethod === 'pix';
                  const isCredit = order.paymentMethod === 'credit_card';
                  const isDebit = order.paymentMethod === 'debit_card';
                  const isCash = order.paymentMethod === 'cash';

                  const feeAmt = isCredit 
                    ? (order.total * 0.0289) 
                    : isDebit 
                    ? (order.total * 0.0129) 
                    : 0;
                  const netAmt = order.total - feeAmt;

                  const identifier = order.pixTxId 
                    ? order.pixTxId 
                    : order.cardNsu 
                    ? `NSU: ${order.cardNsu}` 
                    : order.cardAuthCode 
                    ? `AUT: ${order.cardAuthCode}`
                    : 'Balcão / Caixa';

                  return (
                    <tr 
                      key={order.id} 
                      className={`hover:bg-zinc-800/40 transition-colors group cursor-pointer ${
                        settlementCat === 'webhook_pending' ? 'bg-amber-500/5' : ''
                      }`}
                      onClick={() => setSelectedTransaction(order)}
                    >
                      {/* Horário */}
                      <td className="p-3 text-zinc-400 whitespace-nowrap text-[11px]">
                        {formatDateTime(order.createdAt)}
                      </td>

                      {/* Código */}
                      <td className="p-3 text-white font-bold whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700">
                          {order.displayCode}
                        </span>
                      </td>

                      {/* Cliente e Canal */}
                      <td className="p-3 font-sans whitespace-nowrap">
                        <div className="font-semibold text-zinc-200 text-xs">{order.customerName}</div>
                        <div className="text-[10px] text-zinc-500 capitalize">
                          {order.channel.replace('_', ' ')}
                        </div>
                      </td>

                      {/* Método */}
                      <td className="p-3 font-sans whitespace-nowrap">
                        {isPix && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#00E676]/15 text-[#00E676] border border-[#00E676]/30">
                            <QrCode className="w-3 h-3" />
                            PIX Dinâmico
                          </span>
                        )}
                        {isCredit && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                            <CreditCard className="w-3 h-3" />
                            Crédito {order.cardBrand ? `(${order.cardBrand})` : ''}
                          </span>
                        )}
                        {isDebit && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
                            <CreditCard className="w-3 h-3" />
                            Débito
                          </span>
                        )}
                        {isCash && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-yellow-500/15 text-yellow-300 border border-yellow-500/30">
                            <DollarSign className="w-3 h-3" />
                            Dinheiro
                          </span>
                        )}
                      </td>

                      {/* Status de Liquidação */}
                      <td className="p-3 font-sans whitespace-nowrap">
                        {settlementCat === 'gateway_confirmed' && (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#00E676]/15 text-[#00E676] border border-[#00E676]/30 w-fit">
                              <CheckCircle2 className="w-3 h-3" />
                              'Confirmado' (via gateway)
                            </span>
                            <span className="text-[10px] text-zinc-400 truncate max-w-[150px]">
                              {order.gatewayProvider || (isPix ? 'Pix Bacen D+0' : 'TEF Adquirente')} • Firestore OK
                            </span>
                          </div>
                        )}
                        {settlementCat === 'webhook_pending' && (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse w-fit">
                              <Clock className="w-3 h-3 text-amber-400" />
                              'Pendente' (aguardando webhook)
                            </span>
                            <span className="text-[10px] text-amber-400/80 font-mono">
                              Aguardando callback HTTP
                            </span>
                          </div>
                        )}
                        {settlementCat === 'cash_manual' && (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/15 text-yellow-300 border border-yellow-500/30 w-fit">
                              <Banknote className="w-3 h-3 text-yellow-400" />
                              'Registro Manual' (dinheiro)
                            </span>
                            <span className="text-[10px] text-zinc-400">
                              Frente de Caixa (0% taxa)
                            </span>
                          </div>
                        )}
                      </td>

                      {/* NSU / TxId */}
                      <td className="p-3 text-zinc-400 text-[11px] truncate max-w-[140px]" title={identifier}>
                        {identifier}
                      </td>

                      {/* Bruto */}
                      <td className="p-3 text-right font-bold text-white whitespace-nowrap">
                        {formatBRL(order.total)}
                      </td>

                      {/* Taxa */}
                      <td className="p-3 text-right whitespace-nowrap text-[11px]">
                        {feeAmt > 0 ? (
                          <span className="text-rose-400">- {formatBRL(feeAmt)}</span>
                        ) : (
                          <span className="text-emerald-400 font-bold">R$ 0,00 (0%)</span>
                        )}
                      </td>

                      {/* Líquido */}
                      <td className="p-3 text-right font-bold text-[#00E676] whitespace-nowrap">
                        {formatBRL(netAmt)}
                      </td>

                      {/* Ações */}
                      <td className="p-3 text-center whitespace-nowrap font-sans" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          {settlementCat === 'webhook_pending' && (
                            <button
                              onClick={(e) => handleApproveWebhookOrder(order, e)}
                              disabled={isSyncingWebhook}
                              className="px-2.5 py-1 rounded-lg bg-[#00E676] hover:bg-[#00D26A] text-black text-[10px] font-black transition-all cursor-pointer flex items-center gap-1 shadow-sm disabled:opacity-50"
                              title="Aprovar e sincronizar liquidação via Webhook diretamente no Firestore"
                            >
                              <Zap className="w-3 h-3" />
                              <span>Baixa Firestore</span>
                            </button>
                          )}

                          <button
                            onClick={() => setSelectedTransaction(order)}
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                            title="Ver Comprovante Detalhado"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              try {
                                thermalPrinterService.dispatchKitchenOrder(order);
                                playBeep(800, 0.05);
                              } catch (err) {
                                console.warn(err);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                            title="Imprimir Comprovante Térmico ESC/POS"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: COMPROVANTE & AUDITORIA DETALHADA DA TRANSAÇÃO */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {selectedTransaction && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-[#12121E] border border-zinc-700 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl text-zinc-100"
            >
              {/* Header do Comprovante */}
              <div className="bg-gradient-to-r from-zinc-900 to-[#181828] p-5 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-2xl ${
                    selectedTransaction.paymentMethod === 'pix'
                      ? 'bg-emerald-500/20 text-[#00E676] border border-emerald-500/30'
                      : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  }`}>
                    {selectedTransaction.paymentMethod === 'pix' ? <QrCode className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Comprovante de Liquidação</h3>
                    <p className="text-xs text-zinc-400 font-mono">Pedido {selectedTransaction.displayCode}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTransaction(null)}
                  className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Corpo do Comprovante */}
              <div className="p-6 space-y-4 text-xs font-sans">
                <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-sm font-bold">
                    <span className="text-zinc-300">Valor Total Pago:</span>
                    <span className="text-[#00E676] font-mono text-base">{formatBRL(selectedTransaction.total)}</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>Meio de Pagamento:</span>
                    <span className="text-white font-bold uppercase">{selectedTransaction.paymentMethod}</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>Data e Hora:</span>
                    <span className="text-white font-mono">{formatDateTime(selectedTransaction.createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>Canal de Venda:</span>
                    <span className="text-white capitalize">{selectedTransaction.channel.replace('_', ' ')}</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>Status de Liquidação:</span>
                    {getOrderSettlementCategory(selectedTransaction) === 'gateway_confirmed' && (
                      <span className="text-[#00E676] font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        'Confirmado' (via gateway)
                      </span>
                    )}
                    {getOrderSettlementCategory(selectedTransaction) === 'webhook_pending' && (
                      <span className="text-amber-400 font-bold flex items-center gap-1 animate-pulse">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        'Pendente' (aguardando webhook)
                      </span>
                    )}
                    {getOrderSettlementCategory(selectedTransaction) === 'cash_manual' && (
                      <span className="text-yellow-400 font-bold flex items-center gap-1">
                        <Banknote className="w-3.5 h-3.5 text-yellow-400" />
                        'Registro Manual' (dinheiro)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-zinc-400 pt-1 border-t border-zinc-800/60 text-[11px]">
                    <span>Persistência Firestore:</span>
                    <span className="text-emerald-400 font-mono font-bold flex items-center gap-1">
                      <Database className="w-3 h-3" /> Coleção 'pedidos' / Ativa
                    </span>
                  </div>
                </div>

                {/* Bloco de Ação quando Pendente de Webhook */}
                {getOrderSettlementCategory(selectedTransaction) === 'webhook_pending' && (
                  <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-amber-300 font-bold text-xs">
                        <Clock className="w-4 h-4 animate-pulse" />
                        <span>Aguardando Notificação do Gateway (Webhook)</span>
                      </div>
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-mono font-bold">
                        Pendente
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-300 leading-relaxed">
                      O cliente gerou a transação (QR Code Pix ou Autorização de Cartão). Assim que o gateway enviar o webhook assíncrono com status de aprovado, o sistema baixará a receita automaticamente.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        handleApproveWebhookOrder(selectedTransaction);
                        setSelectedTransaction(prev => prev ? ({ ...prev, paymentStatus: 'paid' }) : null);
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-[#00E676] hover:bg-[#00D26A] text-black font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                    >
                      <Zap className="w-4 h-4" />
                      <span>Simular Retorno do Webhook (Aprovar Pagamento)</span>
                    </button>
                  </div>
                )}

                {/* Metadados Técnicos do Gateway */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    Auditoria Técnica da Transação
                  </span>
                  <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 font-mono text-[11px] space-y-1 text-zinc-300">
                    {selectedTransaction.pixTxId && (
                      <div className="flex justify-between">
                        <span className="text-zinc-500">TxID Pix:</span>
                        <span className="text-emerald-400 truncate max-w-[240px]">{selectedTransaction.pixTxId}</span>
                      </div>
                    )}
                    {selectedTransaction.pixEndToEndId && (
                      <div className="flex justify-between">
                        <span className="text-zinc-500">EndToEnd:</span>
                        <span className="text-zinc-400 truncate max-w-[240px]">{selectedTransaction.pixEndToEndId}</span>
                      </div>
                    )}
                    {selectedTransaction.cardNsu && (
                      <div className="flex justify-between">
                        <span className="text-zinc-500">NSU Adquirente:</span>
                        <span className="text-blue-400">{selectedTransaction.cardNsu}</span>
                      </div>
                    )}
                    {selectedTransaction.cardAuthCode && (
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Cód. Autorização:</span>
                        <span className="text-zinc-300">{selectedTransaction.cardAuthCode}</span>
                      </div>
                    )}
                    {selectedTransaction.cardBrand && (
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Bandeira:</span>
                        <span className="text-white font-bold">{selectedTransaction.cardBrand}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Gateway:</span>
                      <span className="text-zinc-300">{selectedTransaction.gatewayProvider || 'Pix Central / TEF Integrado'}</span>
                    </div>
                  </div>
                </div>

                {/* Itens do Pedido */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    Itens Inclusos
                  </span>
                  <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                    {selectedTransaction.items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-zinc-800/60">
                        <span className="text-zinc-300">{item.quantity}x {item.productName}</span>
                        <span className="text-white font-mono">{formatBRL(item.totalPrice)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ações do Modal */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                  <button
                    onClick={() => {
                      try {
                        thermalPrinterService.dispatchKitchenOrder(selectedTransaction);
                        playBeep(800, 0.05);
                      } catch (err) {
                        console.warn(err);
                      }
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold transition-all text-xs"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Imprimir Via</span>
                  </button>
                  <button
                    onClick={() => setSelectedTransaction(null)}
                    className="px-4 py-2 rounded-xl bg-[#00E676] text-black font-bold hover:brightness-110 transition-all text-xs"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL: SIMULADOR DE TRANSAÇÃO EM TEMPO REAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isSimModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#12121E] border border-emerald-500/40 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl text-zinc-100"
            >
              <div className="p-5 bg-gradient-to-r from-emerald-950/80 to-zinc-900 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#00E676]/20 text-[#00E676]">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Simulador em Tempo Real</h3>
                    <p className="text-xs text-zinc-400">Injete uma venda e veja os gráficos recalcularem</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsSimModalOpen(false)}
                  className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs">
                {/* Escolha do Método */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-300">Escolha o Meio de Pagamento:</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setSimulationMethod('pix')}
                      className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all ${
                        simulationMethod === 'pix'
                          ? 'bg-emerald-500/20 border-[#00E676] text-[#00E676]'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                      }`}
                    >
                      <QrCode className="w-5 h-5" />
                      <span className="font-bold text-[11px]">PIX Dinâmico</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSimulationMethod('credit_card')}
                      className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all ${
                        simulationMethod === 'credit_card'
                          ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                      }`}
                    >
                      <CreditCard className="w-5 h-5" />
                      <span className="font-bold text-[11px]">Crédito</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSimulationMethod('debit_card')}
                      className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all ${
                        simulationMethod === 'debit_card'
                          ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                      }`}
                    >
                      <Wallet className="w-5 h-5" />
                      <span className="font-bold text-[11px]">Débito</span>
                    </button>
                  </div>
                </div>

                {/* Valor da Transação */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">Valor da Venda (R$):</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-mono font-bold">R$</span>
                    <input
                      type="number"
                      step="0.10"
                      value={simCustomAmount}
                      onChange={(e) => setSimCustomAmount(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-2xl py-2.5 pl-10 pr-3 font-mono text-base font-bold text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Prévia de taxas */}
                <div className="bg-zinc-900/80 p-3 rounded-2xl border border-zinc-800 space-y-1 text-[11px]">
                  <div className="flex justify-between text-zinc-400">
                    <span>Taxa Estimada da Operação:</span>
                    <span className="font-mono text-white">
                      {simulationMethod === 'pix' ? '0% (R$ 0,00)' : (simulationMethod === 'credit_card' ? '2.89% (~R$ 2,26)' : '1.29% (~R$ 1,01)')}
                    </span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Prazo de Liquidação na Conta:</span>
                    <span className="font-mono text-[#00E676]">
                      {simulationMethod === 'pix' ? 'Imediato (D+0)' : (simulationMethod === 'debit_card' ? 'D+1 Útil' : 'D+30')}
                    </span>
                  </div>
                </div>

                {/* Botão de Enviar */}
                <button
                  type="button"
                  disabled={isSimulating}
                  onClick={() => handleSimulatePayment(simulationMethod, parseFloat(simCustomAmount))}
                  className="w-full py-3 rounded-2xl bg-[#00E676] hover:brightness-110 active:scale-95 text-black font-black text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,230,118,0.4)] transition-all disabled:opacity-50"
                >
                  {isSimulating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Liquidando no Gateway...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-black" />
                      <span>Processar Venda e Atualizar Gráfico</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Exportação para Contabilidade (CSV / PDF) */}
      <ExportContabilidadeModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        orders={allOrders}
        initialTimeFilter={timeFilter}
        currentBranchName={currentBranch?.name}
        tenantName={tenant?.name}
      />

      {/* Modal de Configuração de Metas do Gerente (Salvo no LocalStorage) */}
      <ConfigMetasModal
        isOpen={isConfigMetasOpen}
        onClose={() => setIsConfigMetasOpen(false)}
        currentDailyNet={financialSummary.netVolume}
        onTargetsSaved={(newConfig) => {
          setManagerTargets(newConfig);
        }}
      />

      {/* Modal de Configuração Segura de Chaves de API (Pix/Cartão) por Unidade no Firestore */}
      <ModalConfiguracaoChavesUnidade
        isOpen={isUnitGatewayModalOpen}
        onClose={() => setIsUnitGatewayModalOpen(false)}
        onConfigSaved={(savedConfig) => {
          setUnitGatewayConfig(savedConfig);
          setSyncFeedbackMessage(`Chaves da Unidade "${savedConfig.unidadeName || 'Selecionada'}" sincronizadas com o Firestore.`);
        }}
      />

      {/* Modal Simulador e Ingestor Seguro de Webhooks de Pagamento */}
      <ModalSimuladorWebhookSeguro
        isOpen={isWebhookSimulatorOpen}
        onClose={() => setIsWebhookSimulatorOpen(false)}
        orders={allOrders}
        activeCashSession={activeCashSession}
        tenantId={tenant?.id || 'tenant_lanchonete_dulci'}
        currentBranchName={currentBranch?.name}
        unitGatewayConfig={unitGatewayConfig}
        onSuccess={(result) => {
          if (result.updatedCashSession) {
            updateActiveCashSession(result.updatedCashSession);
          }
          if (result.orderId) {
            setSyncedOrderIds(prev => new Set(prev).add(result.orderId!));
          }
          setSyncFeedbackMessage(`✅ ${result.message}`);
          setTimeout(() => setSyncFeedbackMessage(null), 5000);
        }}
        onCreateTestOrder={() => {
          return handleCreateTestPendingOrder('pix');
        }}
      />

    </div>
  );
};
