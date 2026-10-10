import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Lock, 
  Unlock, 
  Printer, 
  Calendar, 
  AlertCircle,
  ArrowUpRight,
  PieChart as PieIcon,
  BarChart3,
  Clock,
  Receipt,
  ShoppingBag,
  CheckCircle2,
  Wallet,
  CreditCard,
  QrCode,
  Coins,
  Download,
  PlusCircle,
  Filter,
  Truck,
  FileText,
  Layers,
  Search,
  X,
  AlertTriangle,
  Check,
  PackagePlus,
  Info,
  CalendarDays,
  FileSpreadsheet
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { useApp } from '../context/AppContext';
import { formatBRL, formatPercent, formatDateTime } from '../utils/formatters';
import { playCashRegister, playBeep, playKitchenBell } from '../utils/audio';
import { 
  BillPayable, 
  BillPayableCategory, 
  BillReceivable, 
  PurchaseRecord, 
  FinancialEntry, 
  PaymentMethod 
} from '../types';

// Custom Tooltip for Cash Flow Bar Chart
const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#12121E] border border-zinc-700/80 p-3 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.7)] text-xs space-y-1.5 backdrop-blur-md">
        <p className="font-bold text-zinc-300 border-b border-zinc-800 pb-1 flex items-center justify-between gap-4">
          <span>Data / Período:</span>
          <span className="text-[#FFC72C] font-mono">{label}</span>
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center justify-between gap-4 text-[11px]">
            <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name}:
            </span>
            <span className="font-black font-mono text-white">
              {formatBRL(entry.value)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const FinanceiroDRE: React.FC = () => {
  const { 
    activeCashSession, 
    openCashSession, 
    closeCashSession, 
    addCashMovement,
    orders,
    products,
    ingredients,
    currentBranch,
    tenant,
    financialEntries,
    addFinancialEntry,
    deleteFinancialEntry,
    billsPayable,
    addBillPayable,
    payBillPayable,
    deleteBillPayable,
    billsReceivable,
    addBillReceivable,
    receiveBillReceivable,
    deleteBillReceivable,
    purchases,
    registerPurchase,
    currentUser,
    salesFirestore,
    expensesFirestore,
    cashMovementsFirestore,
    financialTransactions,
    clearAllFinancialData
  } = useApp();

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    'visao_geral' | 'vendas' | 'contas_receber' | 'contas_pagar' | 'compras' | 'despesas' | 'caixa' | 'resultados'
  >('visao_geral');

  // Time Filter
  const [timeFilter, setTimeFilter] = useState<'today' | '7days' | '30days' | 'all'>('today');

  // Search and status filters
  const [billPayableStatusFilter, setBillPayableStatusFilter] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');
  const [billReceivableStatusFilter, setBillReceivableStatusFilter] = useState<'all' | 'pending' | 'received' | 'overdue'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [isCashOpenModalOpen, setIsCashOpenModalOpen] = useState(false);
  const [isCashCloseModalOpen, setIsCashCloseModalOpen] = useState(false);
  const [isCashMovementModalOpen, setIsCashMovementModalOpen] = useState(false);
  const [isNewExpenseModalOpen, setIsNewExpenseModalOpen] = useState(false);
  const [isNewBillPayableModalOpen, setIsNewBillPayableModalOpen] = useState(false);
  const [isPayBillModalOpen, setIsPayBillModalOpen] = useState(false);
  const [selectedBillToPay, setSelectedBillToPay] = useState<BillPayable | null>(null);
  const [isNewBillReceivableModalOpen, setIsNewBillReceivableModalOpen] = useState(false);
  const [isReceiveBillModalOpen, setIsReceiveBillModalOpen] = useState(false);
  const [selectedBillToReceive, setSelectedBillToReceive] = useState<BillReceivable | null>(null);
  const [isNewPurchaseModalOpen, setIsNewPurchaseModalOpen] = useState(false);

  // Form states for modals
  const [openCashInitialAmount, setOpenCashInitialAmount] = useState('150.00');
  const [closeCashCountedAmount, setCloseCashCountedAmount] = useState('');
  const [closeCashNotes, setCloseCashNotes] = useState('');

  const [cashMovementType, setCashMovementType] = useState<'bleed' | 'supply'>('bleed');
  const [cashMovementAmount, setCashMovementAmount] = useState('');
  const [cashMovementReason, setCashMovementReason] = useState('');

  // New Expense Modal Form
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseCategory, setExpenseCategory] = useState<string>('energia_agua');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expensePaymentMethod, setExpensePaymentMethod] = useState<PaymentMethod | 'transferencia' | 'boleto'>('pix');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);

  // New Bill Payable Modal Form
  const [billPayDesc, setBillPayDesc] = useState('');
  const [billPayCategory, setBillPayCategory] = useState<BillPayableCategory>('fornecedores');
  const [billPayAmount, setBillPayAmount] = useState('');
  const [billPayDueDate, setBillPayDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [billPayRecipient, setBillPayRecipient] = useState('');
  const [billPayNotes, setBillPayNotes] = useState('');

  // Pay Bill Modal Form
  const [payBillMethod, setPayBillMethod] = useState<PaymentMethod | 'transferencia' | 'boleto'>('pix');
  const [payBillAmount, setPayBillAmount] = useState('');

  // New Bill Receivable Modal Form
  const [billRecDesc, setBillRecDesc] = useState('');
  const [billRecCategory, setBillRecCategory] = useState<any>('vendas_prazo');
  const [billRecAmount, setBillRecAmount] = useState('');
  const [billRecDueDate, setBillRecDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [billRecCustomer, setBillRecCustomer] = useState('');
  const [billRecNotes, setBillRecNotes] = useState('');

  // Receive Bill Modal Form
  const [receiveBillMethod, setReceiveBillMethod] = useState<PaymentMethod | 'transferencia' | 'boleto'>('pix');
  const [receiveBillAmount, setReceiveBillAmount] = useState('');

  // New Purchase Modal Form
  const [purchaseSupplier, setPurchaseSupplier] = useState('');
  const [purchaseTerms, setPurchaseTerms] = useState<'a_vista' | 'a_prazo'>('a_vista');
  const [purchaseDueDate, setPurchaseDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [purchaseMethod, setPurchaseMethod] = useState<PaymentMethod | 'transferencia' | 'boleto'>('pix');
  const [purchaseSelectedIngredientId, setPurchaseSelectedIngredientId] = useState('');
  const [purchaseIngredientName, setPurchaseIngredientName] = useState('');
  const [purchaseQuantity, setPurchaseQuantity] = useState('');
  const [purchaseUnit, setPurchaseUnit] = useState('kg');
  const [purchaseUnitPrice, setPurchaseUnitPrice] = useState('');
  const [purchaseNotes, setPurchaseNotes] = useState('');

  // Helper date filtering
  const isDateInFilter = (dateStr: string | undefined): boolean => {
    if (!dateStr) return true;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const itemDate = dateStr.split('T')[0];

    if (timeFilter === 'today') {
      return itemDate === todayStr;
    }
    if (timeFilter === '7days') {
      const diffMs = now.getTime() - new Date(itemDate).getTime();
      return diffMs <= 7 * 24 * 3600 * 1000;
    }
    if (timeFilter === '30days') {
      const diffMs = now.getTime() - new Date(itemDate).getTime();
      return diffMs <= 30 * 24 * 3600 * 1000;
    }
    return true; // 'all'
  };

  // 1. VENDAS REALIZADAS REAIS DO FIRESTORE & ESTADO DA LOJA
  // Consolida a coleção Firestore 'Sales' e coleção Firestore 'financialTransactions' com pedidos finalizados e pagos
  const consolidatedCompletedSales = useMemo(() => {
    const map = new Map<string, {
      id: string;
      orderId: string;
      displayCode: string;
      customerName: string;
      channel: string;
      paymentMethod: string;
      total: number;
      totalCmv?: number;
      totalCardFees?: number;
      totalTaxes?: number;
      netRevenue?: number;
      grossProfit?: number;
      items: Array<any>;
      createdAt: string;
      source: 'firestore_sales' | 'firestore_transactions' | 'orders';
    }>();

    // 1.1 Vendas sincronizadas do Firestore (Coleção 'Sales')
    salesFirestore.forEach(s => {
      const key = s.orderId || s.id;
      map.set(key, {
        id: s.id,
        orderId: s.orderId || s.id,
        displayCode: s.displayCode || `#${key.slice(-4)}`,
        customerName: s.customerName || 'Consumidor',
        channel: s.channel || 'balcao',
        paymentMethod: s.paymentMethod || 'pix',
        total: s.totalGross || 0,
        totalCmv: s.totalCmv,
        totalCardFees: s.totalCardFees,
        totalTaxes: s.totalTaxes,
        netRevenue: s.netRevenue,
        grossProfit: s.grossProfit,
        items: s.items || [],
        createdAt: s.finalizedAt || s.createdAt || new Date().toISOString(),
        source: 'firestore_sales'
      });
    });

    // 1.2 Transações gravadas na coleção Firestore 'financialTransactions'
    financialTransactions.forEach(tx => {
      const key = tx.orderId || tx.idempotencyKey || tx.id;
      if (!map.has(key)) {
        map.set(key, {
          id: tx.id,
          orderId: key,
          displayCode: tx.orderCode || `#${key.slice(-4)}`,
          customerName: tx.customerName || 'Consumidor',
          channel: tx.channel || 'balcao',
          paymentMethod: tx.paymentMethod || 'pix',
          total: tx.amount || 0,
          items: [],
          createdAt: tx.createdAt || tx.timestamp || new Date().toISOString(),
          source: 'firestore_transactions'
        });
      }
    });

    // 1.3 Pedidos finalizados e pagos do aplicativo
    orders.forEach(o => {
      const isCompleted = o.status === 'completed' || (o.status as string) === 'delivered';
      const isPaid = o.paymentStatus === 'paid';
      if (!isCompleted || !isPaid) return;
      const key = o.id;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          id: o.id,
          orderId: o.id,
          displayCode: o.displayCode || `#${o.id.slice(-4)}`,
          customerName: o.customerName || 'Consumidor',
          channel: o.channel || 'balcao',
          paymentMethod: o.paymentMethod || 'pix',
          total: o.total || 0,
          items: o.items || [],
          createdAt: o.createdAt || o.updatedAt || new Date().toISOString(),
          source: 'orders'
        });
      } else if ((!existing.items || existing.items.length === 0) && o.items && o.items.length > 0) {
        existing.items = o.items;
      }
    });

    return Array.from(map.values()).filter(sale => isDateInFilter(sale.createdAt));
  }, [salesFirestore, financialTransactions, orders, timeFilter]);

  // Receita Bruta Real das Vendas
  const totalGrossRevenue = useMemo(() => {
    return consolidatedCompletedSales.reduce((sum, s) => sum + (s.total || 0), 0);
  }, [consolidatedCompletedSales]);

  const salesCount = consolidatedCompletedSales.length;
  const averageTicket = salesCount > 0 ? totalGrossRevenue / salesCount : 0;

  // Taxas reais de cartão deduzidas das vendas em cartão
  const totalCardFees = useMemo(() => {
    return consolidatedCompletedSales.reduce((sum, s) => {
      if (s.totalCardFees !== undefined) return sum + s.totalCardFees;
      const total = s.total || 0;
      if (s.paymentMethod === 'credit_card') return sum + (total * 0.0289);
      if (s.paymentMethod === 'debit_card') return sum + (total * 0.0129);
      return sum;
    }, 0);
  }, [consolidatedCompletedSales]);

  // Impostos (Simples Nacional ~ 4.5% apenas sobre faturamento real)
  const totalTaxes = useMemo(() => {
    return consolidatedCompletedSales.reduce((sum, s) => {
      if (s.totalTaxes !== undefined) return sum + s.totalTaxes;
      return sum + (s.total * 0.045);
    }, 0);
  }, [consolidatedCompletedSales]);

  // Receita Líquida Real
  const netRevenue = Math.max(0, totalGrossRevenue - totalCardFees - totalTaxes);

  // 2. CÁLCULO DO CUSTO DOS PRODUTOS (CMV REAL BASEADO EM FICHA TÉCNICA E INSUMOS)
  const cmvAnalysis = useMemo(() => {
    let totalCost = 0;
    let itemsWithTechnicalSheet = 0;
    let itemsWithoutCost = 0;
    const incompleteProducts: string[] = [];

    consolidatedCompletedSales.forEach(sale => {
      // Se a venda já veio do Firestore com totalCmv pré-computado
      if (sale.totalCmv !== undefined && sale.totalCmv > 0) {
        totalCost += sale.totalCmv;
        itemsWithTechnicalSheet += (sale.items?.length || 1);
        return;
      }

      (sale.items || []).forEach(item => {
        const prod = products.find(p => p.id === item.productId || p.name.toLowerCase() === item.productName.toLowerCase());
        const qty = item.quantity || 1;

        if (prod && prod.recipe && prod.recipe.length > 0) {
          let sheetCost = 0;
          let sheetHasMissingCost = false;

          prod.recipe.forEach(rec => {
            const ing = ingredients.find(i => i.id === rec.ingredientId || i.name.toLowerCase() === rec.ingredientName.toLowerCase());
            const unitCost = ing && ing.costPerUnit > 0 ? ing.costPerUnit : (rec.unitCost > 0 ? rec.unitCost : 0);

            if (unitCost <= 0) {
              sheetHasMissingCost = true;
            } else {
              sheetCost += (rec.quantity * unitCost);
            }
          });

          if (sheetHasMissingCost) {
            itemsWithoutCost += qty;
            if (!incompleteProducts.includes(prod.name)) incompleteProducts.push(prod.name);
          } else {
            itemsWithTechnicalSheet += qty;
            totalCost += sheetCost * qty;
          }
        } else if (prod && prod.costPrice && prod.costPrice > 0) {
          itemsWithTechnicalSheet += qty;
          totalCost += prod.costPrice * qty;
        } else {
          itemsWithoutCost += qty;
          if (prod && !incompleteProducts.includes(prod.name)) {
            incompleteProducts.push(prod.name);
          } else if (!prod && !incompleteProducts.includes(item.productName)) {
            incompleteProducts.push(item.productName);
          }
        }
      });
    });

    const isCostIncomplete = incompleteProducts.length > 0;
    return {
      totalCost: Number(totalCost.toFixed(2)),
      itemsWithTechnicalSheet,
      itemsWithoutCost,
      isCostIncomplete,
      incompleteProducts
    };
  }, [consolidatedCompletedSales, products, ingredients]);

  // 3. DESPESAS OPERACIONAIS REAIS DO FIRESTORE (Coleção 'Expenses' + Lançamentos)
  const consolidatedExpenses = useMemo(() => {
    const map = new Map<string, {
      id: string;
      date: string;
      description: string;
      category: string;
      paymentMethod: string;
      amount: number;
      status: string;
      source: 'firestore' | 'local';
    }>();

    // 3.1 Despesas persistidas na coleção Firestore 'Expenses'
    expensesFirestore.forEach(exp => {
      map.set(exp.id, {
        id: exp.id,
        date: exp.date || (exp.createdAt ? exp.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]),
        description: exp.description,
        category: exp.category,
        paymentMethod: exp.paymentMethod,
        amount: exp.amount,
        status: exp.status || 'paid',
        source: 'firestore'
      });
    });

    // 3.2 Lançamentos operacionais locais / state
    financialEntries.filter(e => e.type === 'expense').forEach(e => {
      if (!map.has(e.id)) {
        map.set(e.id, {
          id: e.id,
          date: e.date,
          description: e.description,
          category: e.category,
          paymentMethod: e.paymentMethod,
          amount: e.amount,
          status: e.status,
          source: 'local'
        });
      }
    });

    return Array.from(map.values()).filter(e => isDateInFilter(e.date));
  }, [expensesFirestore, financialEntries, timeFilter]);

  const realExpenses = useMemo(() => {
    return consolidatedExpenses
      .filter(e => e.status === 'paid')
      .reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [consolidatedExpenses]);

  // 4. RESULTADO E MARGEM
  const grossProfit = Math.max(0, netRevenue - cmvAnalysis.totalCost);
  const netResult = netRevenue - cmvAnalysis.totalCost - realExpenses;
  const grossMarginPercent = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;
  const netMarginPercent = totalGrossRevenue > 0 ? (netResult / totalGrossRevenue) * 100 : 0;

  // 5. DISTRIBUIÇÃO REAL POR FORMA DE PAGAMENTO
  const paymentBreakdown = useMemo(() => {
    const map: Record<string, { label: string; total: number; count: number; color: string }> = {
      pix: { label: 'PIX Instantâneo', total: 0, count: 0, color: '#00E676' },
      credit_card: { label: 'Cartão de Crédito', total: 0, count: 0, color: '#FFC72C' },
      debit_card: { label: 'Cartão de Débito', total: 0, count: 0, color: '#00D2FF' },
      cash: { label: 'Dinheiro em Espécie', total: 0, count: 0, color: '#FF6B00' },
      voucher: { label: 'Vale Refeição / Alimentação', total: 0, count: 0, color: '#A855F7' },
      outros: { label: 'Outras Formas', total: 0, count: 0, color: '#71717A' }
    };

    consolidatedCompletedSales.forEach(s => {
      const method = (s.paymentMethod || 'outros') as string;
      const target = map[method] || map.outros;
      target.total += (s.total || 0);
      target.count += 1;
    });

    return Object.values(map)
      .filter(m => m.count > 0 || m.total > 0)
      .map(m => ({
        ...m,
        percent: totalGrossRevenue > 0 ? ((m.total / totalGrossRevenue) * 100).toFixed(1) : '0.0'
      }));
  }, [consolidatedCompletedSales, totalGrossRevenue]);

  // 6. FLUXO DE CAIXA REAL (Timeline de Entradas vs Saídas)
  const cashFlowDailyData = useMemo(() => {
    const datesMap = new Map<string, { date: string; displayDate: string; entradas: number; saidas: number }>();

    // Add sales entries
    consolidatedCompletedSales.forEach(s => {
      const d = (s.createdAt || new Date().toISOString()).split('T')[0];
      if (!datesMap.has(d)) {
        const parts = d.split('-');
        datesMap.set(d, { date: d, displayDate: `${parts[2]}/${parts[1]}`, entradas: 0, saidas: 0 });
      }
      datesMap.get(d)!.entradas += (s.total || 0);
    });

    // Add financial entries (expenses and manual incomes)
    consolidatedExpenses.forEach(e => {
      const d = (e.date || new Date().toISOString()).split('T')[0];
      if (!datesMap.has(d)) {
        const parts = d.split('-');
        datesMap.set(d, { date: d, displayDate: `${parts[2]}/${parts[1]}`, entradas: 0, saidas: 0 });
      }
      if (e.status === 'paid') {
        datesMap.get(d)!.saidas += (e.amount || 0);
      }
    });

    const list = Array.from(datesMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    return list.map(item => ({
      ...item,
      entradas: Number(item.entradas.toFixed(2)),
      saidas: Number(item.saidas.toFixed(2))
    }));
  }, [consolidatedCompletedSales, consolidatedExpenses]);

  // Check if there are ANY real movements in the system
  const hasRealMovements = useMemo(() => {
    return (
      consolidatedCompletedSales.length > 0 ||
      (salesFirestore && salesFirestore.length > 0) ||
      (financialTransactions && financialTransactions.length > 0) ||
      consolidatedExpenses.length > 0 ||
      (expensesFirestore && expensesFirestore.length > 0) ||
      purchases.length > 0 ||
      billsPayable.length > 0 ||
      billsReceivable.length > 0 ||
      (cashMovementsFirestore && cashMovementsFirestore.length > 0) ||
      activeCashSession !== null
    );
  }, [consolidatedCompletedSales, salesFirestore, financialTransactions, consolidatedExpenses, expensesFirestore, purchases, billsPayable, billsReceivable, cashMovementsFirestore, activeCashSession]);

  // Filtered Bills Payable
  const filteredBillsPayable = useMemo(() => {
    return billsPayable.filter(b => {
      if (billPayableStatusFilter !== 'all' && b.status !== billPayableStatusFilter) return false;
      if (searchTerm) {
        const t = searchTerm.toLowerCase();
        return (
          b.description.toLowerCase().includes(t) ||
          b.category.toLowerCase().includes(t) ||
          (b.recipient && b.recipient.toLowerCase().includes(t))
        );
      }
      return true;
    });
  }, [billsPayable, billPayableStatusFilter, searchTerm]);

  // Filtered Bills Receivable
  const filteredBillsReceivable = useMemo(() => {
    return billsReceivable.filter(b => {
      if (billReceivableStatusFilter !== 'all' && b.status !== billReceivableStatusFilter) return false;
      if (searchTerm) {
        const t = searchTerm.toLowerCase();
        return (
          b.description.toLowerCase().includes(t) ||
          b.category.toLowerCase().includes(t) ||
          (b.customerName && b.customerName.toLowerCase().includes(t))
        );
      }
      return true;
    });
  }, [billsReceivable, billReceivableStatusFilter, searchTerm]);

  // Handlers for Cash Session
  const handleOpenCash = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(openCashInitialAmount.replace(',', '.')) || 0;
    openCashSession(val);
    playCashRegister();
    setIsCashOpenModalOpen(false);
  };

  const handleCloseCash = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCashSession) return;
    const counted = parseFloat(closeCashCountedAmount.replace(',', '.')) || activeCashSession.calculatedFinalAmount;
    closeCashSession(counted, closeCashNotes || 'Fechamento de turno pelo módulo financeiro');
    playCashRegister();
    setIsCashCloseModalOpen(false);
  };

  const handleAddMovement = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(cashMovementAmount.replace(',', '.')) || 0;
    if (val <= 0 || !cashMovementReason.trim()) return;
    addCashMovement(cashMovementType, val, cashMovementReason.trim());
    playCashRegister();
    setCashMovementAmount('');
    setCashMovementReason('');
    setIsCashMovementModalOpen(false);
  };

  // Handler for New Expense
  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(expenseAmount.replace(',', '.')) || 0;
    if (amount <= 0 || !expenseDescription.trim()) return;

    addFinancialEntry({
      tenantId: tenant?.id || 'tenant_lanchonete_dulci',
      branchId: currentBranch?.id || 'branch_matriz_manaus',
      type: 'expense',
      category: expenseCategory as any,
      description: expenseDescription.trim(),
      amount,
      date: expenseDate || new Date().toISOString().split('T')[0],
      paymentMethod: expensePaymentMethod,
      status: 'paid'
    });

    if (expensePaymentMethod === 'cash' && activeCashSession) {
      addCashMovement('bleed', amount, `Despesa: ${expenseDescription.trim()}`);
    }

    playCashRegister();
    setExpenseDescription('');
    setExpenseAmount('');
    setIsNewExpenseModalOpen(false);
  };

  // Handler for New Bill Payable
  const handleCreateBillPayable = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(billPayAmount.replace(',', '.')) || 0;
    if (amount <= 0 || !billPayDesc.trim()) return;

    addBillPayable({
      tenantId: tenant?.id || 'tenant_lanchonete_dulci',
      branchId: currentBranch?.id || 'branch_matriz_manaus',
      category: billPayCategory,
      description: billPayDesc.trim(),
      amount,
      dueDate: billPayDueDate || new Date().toISOString().split('T')[0],
      issueDate: new Date().toISOString().split('T')[0],
      status: 'pending',
      recipient: billPayRecipient.trim(),
      notes: billPayNotes.trim()
    });

    playBeep(700, 0.05);
    setBillPayDesc('');
    setBillPayAmount('');
    setBillPayRecipient('');
    setBillPayNotes('');
    setIsNewBillPayableModalOpen(false);
  };

  // Handler for Paying a Bill
  const handleExecutePayBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBillToPay) return;
    const amount = parseFloat(payBillAmount.replace(',', '.')) || selectedBillToPay.amount;

    payBillPayable(selectedBillToPay.id, payBillMethod, amount);
    playCashRegister();
    setSelectedBillToPay(null);
    setIsPayBillModalOpen(false);
  };

  // Handler for New Bill Receivable
  const handleCreateBillReceivable = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(billRecAmount.replace(',', '.')) || 0;
    if (amount <= 0 || !billRecDesc.trim()) return;

    addBillReceivable({
      tenantId: tenant?.id || 'tenant_lanchonete_dulci',
      branchId: currentBranch?.id || 'branch_matriz_manaus',
      category: billRecCategory,
      description: billRecDesc.trim(),
      amount,
      dueDate: billRecDueDate || new Date().toISOString().split('T')[0],
      issueDate: new Date().toISOString().split('T')[0],
      status: 'pending',
      customerName: billRecCustomer.trim(),
      notes: billRecNotes.trim()
    });

    playBeep(700, 0.05);
    setBillRecDesc('');
    setBillRecAmount('');
    setBillRecCustomer('');
    setBillRecNotes('');
    setIsNewBillReceivableModalOpen(false);
  };

  // Handler for Receiving a Bill
  const handleExecuteReceiveBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBillToReceive) return;
    const amount = parseFloat(receiveBillAmount.replace(',', '.')) || selectedBillToReceive.amount;

    receiveBillReceivable(selectedBillToReceive.id, receiveBillMethod, amount);
    playCashRegister();
    setSelectedBillToReceive(null);
    setIsReceiveBillModalOpen(false);
  };

  // Handler for New Purchase
  const handleCreatePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(purchaseQuantity.replace(',', '.')) || 0;
    const unitPrice = parseFloat(purchaseUnitPrice.replace(',', '.')) || 0;
    const totalAmount = qty * unitPrice;

    if (qty <= 0 || unitPrice <= 0) return;

    const ingName = purchaseIngredientName.trim() || 
      ingredients.find(i => i.id === purchaseSelectedIngredientId)?.name || 'Insumo Comprado';

    registerPurchase({
      tenantId: tenant?.id || 'tenant_lanchonete_dulci',
      branchId: currentBranch?.id || 'branch_matriz_manaus',
      supplierName: purchaseSupplier.trim() || 'Fornecedor de Insumos',
      items: [
        {
          ingredientId: purchaseSelectedIngredientId || `ing_${Date.now()}`,
          ingredientName: ingName,
          quantity: qty,
          unit: purchaseUnit,
          unitPrice,
          totalPrice: totalAmount
        }
      ],
      totalAmount,
      paymentTerms: purchaseTerms,
      dueDate: purchaseDueDate,
      paymentStatus: purchaseTerms === 'a_vista' ? 'paid' : 'pending',
      paymentMethod: purchaseMethod,
      date: new Date().toISOString().split('T')[0],
      notes: purchaseNotes.trim()
    });

    playCashRegister();
    setPurchaseSupplier('');
    setPurchaseQuantity('');
    setPurchaseUnitPrice('');
    setPurchaseNotes('');
    setIsNewPurchaseModalOpen(false);
  };

  // Export CSV
  const handleExportCSV = () => {
    const separator = ';';
    const lines: string[] = [];

    lines.push(`"RELATÓRIO FINANCEIRO & DRE - LANCHONETE DULCI"`);
    lines.push(`"Data da Emissão"${separator}"${formatDateTime(new Date().toISOString())}"`);
    lines.push(`"Período"${separator}"${timeFilter.toUpperCase()}"`);
    lines.push('');
    lines.push(`"DEMONSTRAÇÃO DO RESULTADO DO EXERCÍCIO (DRE)"`);
    lines.push(`"Receita Bruta Total"${separator}"${totalGrossRevenue.toFixed(2)}"`);
    lines.push(`"(-) Taxas de Cartão"${separator}"${totalCardFees.toFixed(2)}"`);
    lines.push(`"(-) Impostos Estimados (4.5%)"${separator}"${totalTaxes.toFixed(2)}"`);
    lines.push(`"(=) Receita Líquida Real"${separator}"${netRevenue.toFixed(2)}"`);
    lines.push(`"(-) Custo dos Produtos (CMV Insumos)"${separator}"${cmvAnalysis.totalCost.toFixed(2)}"`);
    lines.push(`"(=) Lucro Bruto"${separator}"${grossProfit.toFixed(2)}"`);
    lines.push(`"(-) Despesas Operacionais Pagas"${separator}"${realExpenses.toFixed(2)}"`);
    lines.push(`"(=) Resultado Líquido Final"${separator}"${netResult.toFixed(2)}"`);
    lines.push('');
    lines.push(`"VENDAS REALIZADAS E CONCLUÍDAS"`);
    lines.push(`"Código"${separator}"Data"${separator}"Cliente"${separator}"Canal"${separator}"Método"${separator}"Total (R$)"`);
    
    consolidatedCompletedSales.forEach(o => {
      lines.push(`"${o.displayCode || o.id}"${separator}"${formatDateTime(o.createdAt)}"${separator}"${o.customerName || 'Cliente'}"${separator}"${o.channel}"${separator}"${o.paymentMethod}"${separator}"${o.total.toFixed(2)}"`);
    });

    const csvContent = '\uFEFF' + lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `DRE_Financeiro_Dulci_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    playCashRegister();
  };

  return (
    <div className="space-y-6 pb-24 max-w-7xl mx-auto w-full select-none">
      {/* Top Banner / Header */}
      <div className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-r from-[#141218] via-[#1A1624] to-[#12121A] border border-[#2D283E] shadow-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8B5CF6] px-3 py-1 rounded-full bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-[#8B5CF6]" />
              Gestão Financeira & Lucratividade Real
            </span>
            <span className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800">
              <span className="w-2 h-2 rounded-full bg-[#00E676] animate-pulse" />
              Dados 100% Reais
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <span>Financeiro & Lucro</span>
            <span className="text-sm font-medium text-zinc-400 bg-zinc-800/80 px-2.5 py-1 rounded-xl border border-zinc-700">
              {tenant?.name || 'Lanchonete Dulci'}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
            Resultados derivados exclusivamente de operações reais: vendas finalizadas, pedidos entregues, compras de insumos e despesas confirmadas.
          </p>
          {/* Indicadores de Conexão com Coleções do Firestore */}
          <div className="flex items-center gap-2 flex-wrap pt-1 text-[11px] font-mono text-zinc-400">
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-[#00E676] animate-pulse" />
              Firestore Sincronizado
            </span>
            <span className="px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300">
              {salesFirestore.length} Vendas (Sales)
            </span>
            <span className="px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300">
              {financialTransactions.length} Transações (Idempotente)
            </span>
            <span className="px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300">
              {expensesFirestore.length} Despesas (Expenses)
            </span>
            <span className="px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300">
              {cashMovementsFirestore.length} Movimentos Caixa
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* Caixa status pill */}
          {activeCashSession ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsCashMovementModalOpen(true)}
                className="px-3.5 py-2.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
              >
                <Coins className="w-4 h-4 text-[#FFC72C]" />
                <span>Sangria / Suprimento</span>
              </button>
              <button
                onClick={() => {
                  setCloseCashCountedAmount(activeCashSession.calculatedFinalAmount.toFixed(2));
                  setIsCashCloseModalOpen(true);
                }}
                className="px-3.5 py-2.5 rounded-2xl bg-[#DA291C]/20 hover:bg-[#DA291C]/30 border border-[#DA291C]/40 text-[#DA291C] font-black text-xs flex items-center gap-2 transition-all cursor-pointer"
              >
                <Lock className="w-4 h-4 text-[#DA291C]" />
                <span>Fechar Caixa</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsCashOpenModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-[#00E676] hover:brightness-110 text-black font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-[0_0_16px_rgba(0,230,118,0.3)]"
            >
              <Unlock className="w-4 h-4 text-black" />
              <span>Abrir Sessão de Caixa</span>
            </button>
          )}

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            disabled={!hasRealMovements}
            className="px-3.5 py-2.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4 text-[#FFC72C]" />
            <span>Exportar CSV</span>
          </button>

          {/* Print */}
          <button
            onClick={() => window.print()}
            className="px-3 py-2.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 8 Official Tabs Required by Architecture */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin border-b border-zinc-800">
        {[
          { id: 'visao_geral', label: 'Visão Geral', icon: BarChart3, color: '#8B5CF6' },
          { id: 'vendas', label: 'Vendas', icon: ShoppingBag, color: '#00E676', count: salesCount },
          { id: 'contas_receber', label: 'Contas a Receber', icon: ArrowUpRight, color: '#00D2FF', count: billsReceivable.filter(b => b.status === 'pending').length },
          { id: 'contas_pagar', label: 'Contas a Pagar', icon: Receipt, color: '#DA291C', count: billsPayable.filter(b => b.status === 'pending').length },
          { id: 'compras', label: 'Compras', icon: Truck, color: '#F59E0B', count: purchases.length },
          { id: 'despesas', label: 'Despesas', icon: TrendingDown, color: '#EC4899', count: consolidatedExpenses.length },
          { id: 'caixa', label: 'Caixa', icon: Wallet, color: '#FFC72C', badge: activeCashSession ? 'Aberto' : 'Fechado' },
          { id: 'resultados', label: 'Resultados (DRE)', icon: FileSpreadsheet, color: '#10B981' },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                playBeep(800, 0.03);
              }}
              className={`px-4 py-3 rounded-2xl font-bold text-xs whitespace-nowrap flex items-center gap-2 transition-all cursor-pointer border ${
                isActive
                  ? 'bg-zinc-800 text-white shadow-lg border-zinc-600'
                  : 'bg-[#12121A]/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border-transparent'
              }`}
            >
              <Icon className="w-4 h-4" style={{ color: isActive ? tab.color : undefined }} />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-zinc-700 text-zinc-300">
                  {tab.count}
                </span>
              )}
              {tab.badge && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${activeCashSession ? 'bg-[#00E676]/20 text-[#00E676]' : 'bg-zinc-800 text-zinc-400'}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Global Filter Bar (Period Selection) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#12121A] p-3 rounded-2xl border border-zinc-800/80">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-zinc-400 ml-1" />
          <span className="text-xs text-zinc-400 font-medium">Período de Apuração:</span>
        </div>

        <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-zinc-800/60">
          {[
            { id: 'today', label: 'Hoje' },
            { id: '7days', label: 'Últimos 7 dias' },
            { id: '30days', label: 'Últimos 30 dias' },
            { id: 'all', label: 'Todo o Período' },
          ].map(p => (
            <button
              key={p.id}
              onClick={() => {
                setTimeFilter(p.id as any);
                playBeep(700, 0.02);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                timeFilter === p.id
                  ? 'bg-[#8B5CF6] text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Incomplete Cost Alert Banner (Rule 9: Não inventar custos) */}
      {cmvAnalysis.isCostIncomplete && salesCount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-3 shadow-lg">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-extrabold text-white text-sm">Custo dos Produtos Incompleto</h4>
            <p className="text-amber-200/90 leading-relaxed">
              Existem itens com vendas realizadas que ainda não possuem ficha técnica completa ou custo de insumos cadastrado no estoque (Ex: {cmvAnalysis.incompleteProducts.slice(0, 3).join(', ')}). 
              Cadastre o custo dos insumos da ficha técnica no módulo <strong>Estoque & Insumos</strong> para calcular o resultado com precisão contábil.
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. VISÃO GERAL (TAB) */}
      {/* ========================================================================= */}
      {activeTab === 'visao_geral' && (
        <div className="space-y-6">
          {!hasRealMovements ? (
            /* Clean & Professional Empty State required by Rule 3 */
            <div className="p-12 rounded-3xl bg-[#12121A] border border-zinc-800 text-center space-y-5 max-w-2xl mx-auto shadow-2xl">
              <div className="w-16 h-16 rounded-3xl bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 text-[#8B5CF6] flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(139,92,246,0.3)]">
                <BarChart3 className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-white">Ainda não há movimentações financeiras</h3>
                <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
                  Assim que suas vendas, pagamentos, compras e despesas forem registradas, seus resultados aparecerão aqui automaticamente.
                </p>
              </div>

              <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => setIsCashOpenModalOpen(true)}
                  className="px-4 py-2.5 rounded-2xl bg-[#00E676] hover:brightness-110 text-black font-black text-xs flex items-center gap-2 cursor-pointer shadow-lg"
                >
                  <Unlock className="w-4 h-4" />
                  <span>Abrir Caixa</span>
                </button>
                <button
                  onClick={() => setIsNewExpenseModalOpen(true)}
                  className="px-4 py-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer border border-zinc-700"
                >
                  <PlusCircle className="w-4 h-4 text-[#EC4899]" />
                  <span>Registrar Despesa</span>
                </button>
                <button
                  onClick={() => setIsNewPurchaseModalOpen(true)}
                  className="px-4 py-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer border border-zinc-700"
                >
                  <PackagePlus className="w-4 h-4 text-[#F59E0B]" />
                  <span>Comprar Insumos</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* KPI Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Receita Real */}
                <div className="p-5 rounded-2xl bg-[#12121A] border border-zinc-800 space-y-2 shadow-lg">
                  <div className="flex items-center justify-between text-zinc-400 text-xs">
                    <span className="font-semibold">Receita Realizada</span>
                    <TrendingUp className="w-4 h-4 text-[#00E676]" />
                  </div>
                  <div className="text-2xl font-black text-white font-mono">
                    {formatBRL(totalGrossRevenue)}
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    {salesCount} {salesCount === 1 ? 'venda finalizada' : 'vendas finalizadas'}
                  </div>
                </div>

                {/* Custo dos Produtos (CMV) */}
                <div className="p-5 rounded-2xl bg-[#12121A] border border-zinc-800 space-y-2 shadow-lg">
                  <div className="flex items-center justify-between text-zinc-400 text-xs">
                    <span className="font-semibold">Custo dos Produtos (CMV)</span>
                    <TrendingDown className="w-4 h-4 text-[#FF6B00]" />
                  </div>
                  <div className="text-2xl font-black text-[#FF6B00] font-mono">
                    {formatBRL(cmvAnalysis.totalCost)}
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    {cmvAnalysis.isCostIncomplete ? (
                      <span className="text-amber-400 font-bold">⚠️ Custo incompleto</span>
                    ) : (
                      <span>Baseado em ficha técnica real</span>
                    )}
                  </div>
                </div>

                {/* Despesas Pagas */}
                <div className="p-5 rounded-2xl bg-[#12121A] border border-zinc-800 space-y-2 shadow-lg">
                  <div className="flex items-center justify-between text-zinc-400 text-xs">
                    <span className="font-semibold">Despesas Pagas</span>
                    <Receipt className="w-4 h-4 text-[#EC4899]" />
                  </div>
                  <div className="text-2xl font-black text-[#EC4899] font-mono">
                    {formatBRL(realExpenses)}
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    Custos operacionais liquidados
                  </div>
                </div>

                {/* Resultado / Lucro */}
                <div className="p-5 rounded-2xl bg-[#12121A] border border-zinc-800 space-y-2 shadow-lg">
                  <div className="flex items-center justify-between text-zinc-400 text-xs">
                    <span className="font-semibold">Resultado do Período</span>
                    <BarChart3 className="w-4 h-4 text-[#8B5CF6]" />
                  </div>
                  <div className={`text-2xl font-black font-mono ${netResult >= 0 ? 'text-[#00E676]' : 'text-[#DA291C]'}`}>
                    {formatBRL(netResult)}
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    {totalGrossRevenue > 0 ? `Margem Líquida: ${netMarginPercent.toFixed(1)}%` : 'Sem vendas no período'}
                  </div>
                </div>

                {/* Saldo em Caixa */}
                <div className="p-5 rounded-2xl bg-[#12121A] border border-zinc-800 space-y-2 shadow-lg">
                  <div className="flex items-center justify-between text-zinc-400 text-xs">
                    <span className="font-semibold">Saldo em Gaveta</span>
                    <Wallet className="w-4 h-4 text-[#FFC72C]" />
                  </div>
                  <div className="text-2xl font-black text-[#FFC72C] font-mono">
                    {activeCashSession ? formatBRL(activeCashSession.calculatedFinalAmount) : 'R$ 0,00'}
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    {activeCashSession ? 'Sessão aberta agora' : 'Caixa fechado'}
                  </div>
                </div>
              </div>

              {/* Fluxo de Caixa Diário Real */}
              <div className="p-6 rounded-3xl bg-[#12121A] border border-zinc-800 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#8B5CF6]" />
                    <span>Fluxo de Caixa Real (Entradas vs Saídas)</span>
                  </h3>
                  <span className="text-xs text-zinc-500 font-mono">Baseado em datas de movimentação efetiva</span>
                </div>

                {cashFlowDailyData.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-8 text-center">Nenhum fluxo no período selecionado.</p>
                ) : (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={cashFlowDailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#222234" />
                        <XAxis dataKey="displayDate" stroke="#71717A" fontSize={11} />
                        <YAxis stroke="#71717A" fontSize={11} tickFormatter={(val) => `R$${val}`} />
                        <Tooltip content={<CustomBarTooltip />} />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                        <Bar dataKey="entradas" name="Entradas Realizadas" fill="#00E676" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="saidas" name="Saídas / Despesas" fill="#DA291C" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. VENDAS (TAB) */}
      {/* ========================================================================= */}
      {activeTab === 'vendas' && (
        <div className="space-y-6">
          {/* Header & Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-[#12121A] border border-zinc-800 space-y-1">
              <span className="text-xs text-zinc-400 font-semibold">Total de Vendas Concluídas</span>
              <div className="text-2xl font-black text-white font-mono">{formatBRL(totalGrossRevenue)}</div>
              <div className="text-[11px] text-zinc-500">{salesCount} pedidos finalizados e pagos</div>
            </div>
            <div className="p-5 rounded-2xl bg-[#12121A] border border-zinc-800 space-y-1">
              <span className="text-xs text-zinc-400 font-semibold">Ticket Médio Real</span>
              <div className="text-2xl font-black text-[#00E676] font-mono">{formatBRL(averageTicket)}</div>
              <div className="text-[11px] text-zinc-500">Média exata por venda concluída</div>
            </div>
            <div className="p-5 rounded-2xl bg-[#12121A] border border-zinc-800 space-y-1">
              <span className="text-xs text-zinc-400 font-semibold">Taxas de Cartão Retidas</span>
              <div className="text-2xl font-black text-[#DA291C] font-mono">{formatBRL(totalCardFees)}</div>
              <div className="text-[11px] text-zinc-500">Débito e crédito descontados</div>
            </div>
          </div>

          {/* Formas de Pagamento Reais (Rule 7) */}
          <div className="p-6 rounded-3xl bg-[#12121A] border border-zinc-800 space-y-4 shadow-xl">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#00E676]" />
              <span>Distribuição Real por Forma de Pagamento</span>
            </h3>

            {paymentBreakdown.length === 0 ? (
              <p className="text-xs text-zinc-500 py-6 text-center">Nenhuma venda registrada para apurar formas de pagamento.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {paymentBreakdown.map(p => (
                  <div key={p.label} className="p-4 rounded-2xl bg-black/40 border border-zinc-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-300">{p.label}</span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                        {p.percent}%
                      </span>
                    </div>
                    <div className="text-xl font-black text-white font-mono">{formatBRL(p.total)}</div>
                    <div className="text-[11px] text-zinc-500">{p.count} transações</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lista de Vendas Realizadas */}
          <div className="p-6 rounded-3xl bg-[#12121A] border border-zinc-800 space-y-4 shadow-xl">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#8B5CF6]" />
              <span>Relatório de Vendas Finalizadas</span>
            </h3>

            {consolidatedCompletedSales.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 text-xs">
                Nenhuma venda finalizada no período selecionado. Pedidos em aberto ou em preparo não geram receita até conclusão e pagamento.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="pb-3">Código</th>
                      <th className="pb-3">Data / Hora</th>
                      <th className="pb-3">Cliente</th>
                      <th className="pb-3">Canal</th>
                      <th className="pb-3">Origem Firestore</th>
                      <th className="pb-3">Forma Pgto</th>
                      <th className="pb-3 text-right">Valor Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {consolidatedCompletedSales.map(s => (
                      <tr key={s.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="py-3 font-mono font-extrabold text-[#FFC72C]">{s.displayCode || s.id}</td>
                        <td className="py-3 text-zinc-400">{formatDateTime(s.createdAt)}</td>
                        <td className="py-3 font-semibold text-white">{s.customerName || 'Consumidor'}</td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono text-[10px]">
                            {s.channel}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-full font-mono text-[9px] font-bold ${
                            s.source === 'firestore_sales' 
                              ? 'bg-emerald-500/15 text-[#00E676] border border-emerald-500/30'
                              : s.source === 'firestore_transactions'
                              ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                              : 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                          }`}>
                            {s.source === 'firestore_sales' ? 'Firestore (Sales)' : s.source === 'firestore_transactions' ? 'Firestore (Transactions)' : 'PDV Real'}
                          </span>
                        </td>
                        <td className="py-3 uppercase text-zinc-300 font-bold">{s.paymentMethod}</td>
                        <td className="py-3 text-right font-mono font-black text-[#00E676]">{formatBRL(s.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Transações Automáticas no Firestore (Coleção 'financialTransactions' com Idempotência) */}
          <div className="p-6 rounded-3xl bg-[#12121A] border border-zinc-800 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00E676] animate-pulse" />
                  <span>Transações Financeiras Firestore ('financialTransactions')</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#8B5CF6]/20 text-[#A78BFA] border border-[#8B5CF6]/30">
                    Idempotência Estrita por Pedido
                  </span>
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Transações geradas automaticamente por serviço em tempo real quando o status do pedido é "finalizado" e o pagamento é confirmado.
                </p>
              </div>
              <span className="text-xs font-mono text-zinc-400 px-2.5 py-1 rounded-xl bg-zinc-900 border border-zinc-800">
                {financialTransactions.length} {financialTransactions.length === 1 ? 'registro' : 'registros'}
              </span>
            </div>

            {financialTransactions.length === 0 ? (
              <div className="py-10 text-center text-zinc-500 text-xs bg-black/20 rounded-2xl border border-zinc-800/60 p-6">
                <AlertCircle className="w-6 h-6 text-zinc-600 mx-auto mb-2" />
                <p className="font-semibold text-zinc-400">Nenhuma transação gravada ainda em 'financialTransactions'.</p>
                <p className="text-zinc-500 mt-1">Assim que um pedido mudar de status para 'finalizado' com pagamento confirmado, a transação será gravada com o ID do pedido como chave de idempotência.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="pb-3">Chave de Idempotência (ID Pedido)</th>
                      <th className="pb-3">Data / Registro</th>
                      <th className="pb-3">Cliente / Descrição</th>
                      <th className="pb-3">Forma Pgto</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Valor Líquido</th>
                      <th className="pb-3 text-right">Valor Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {financialTransactions.map(tx => (
                      <tr key={tx.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="py-3">
                          <div className="flex flex-col">
                            <span className="font-mono font-black text-[#A78BFA] text-[11px]">{tx.id}</span>
                            <span className="text-[10px] text-zinc-500 font-mono">Chave: {tx.idempotencyKey || tx.orderId}</span>
                          </div>
                        </td>
                        <td className="py-3 text-zinc-400">{formatDateTime(tx.createdAt || tx.timestamp)}</td>
                        <td className="py-3">
                          <div className="font-semibold text-white">{tx.customerName || 'Consumidor'}</div>
                          <div className="text-[10px] text-zinc-400 truncate max-w-xs">{tx.description}</div>
                        </td>
                        <td className="py-3 uppercase text-zinc-300 font-bold text-[11px]">{tx.paymentMethod}</td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 rounded-full bg-[#00E676]/15 border border-[#00E676]/30 text-[#00E676] text-[10px] font-black uppercase">
                            {tx.paymentStatus}
                          </span>
                        </td>
                        <td className="py-3 text-right font-mono font-bold text-zinc-300">
                          {formatBRL(tx.netAmount !== undefined ? tx.netAmount : tx.amount)}
                        </td>
                        <td className="py-3 text-right font-mono font-black text-[#00E676]">
                          {formatBRL(tx.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. CONTAS A RECEBER (TAB) */}
      {/* ========================================================================= */}
      {activeTab === 'contas_receber' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-lg font-extrabold text-white">Contas a Receber</h2>
              <p className="text-xs text-zinc-400">Valores faturados, vendas a prazo, convênios ou repasses pendentes de liquidação.</p>
            </div>
            <button
              onClick={() => setIsNewBillReceivableModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-[#00D2FF] hover:brightness-110 text-black font-black text-xs flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Novo Título a Receber</span>
            </button>
          </div>

          {/* Subfilters */}
          <div className="flex items-center gap-2">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'pending', label: 'Pendentes' },
              { id: 'received', label: 'Recebidos' },
              { id: 'overdue', label: 'Vencidos' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setBillReceivableStatusFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  billReceivableStatusFilter === f.id
                    ? 'bg-zinc-800 text-white border border-zinc-700'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="p-6 rounded-3xl bg-[#12121A] border border-zinc-800 space-y-4 shadow-xl">
            {filteredBillsReceivable.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 text-xs">
                Nenhum título a receber cadastrado.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="pb-3">Descrição / Origem</th>
                      <th className="pb-3">Sacado / Cliente</th>
                      <th className="pb-3">Categoria</th>
                      <th className="pb-3">Vencimento</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Valor</th>
                      <th className="pb-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {filteredBillsReceivable.map(bill => (
                      <tr key={bill.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="py-3 font-bold text-white">{bill.description}</td>
                        <td className="py-3 text-zinc-300">{bill.customerName || '-'}</td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-[10px] font-mono">
                            {bill.category}
                          </span>
                        </td>
                        <td className="py-3 font-mono text-zinc-400">{bill.dueDate}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            bill.status === 'received'
                              ? 'bg-emerald-500/20 text-[#00E676]'
                              : bill.status === 'overdue'
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}>
                            {bill.status === 'received' ? 'Recebido' : bill.status === 'overdue' ? 'Vencido' : 'Pendente'}
                          </span>
                        </td>
                        <td className="py-3 text-right font-mono font-black text-white">{formatBRL(bill.amount)}</td>
                        <td className="py-3 text-right">
                          {bill.status !== 'received' ? (
                            <button
                              onClick={() => {
                                setSelectedBillToReceive(bill);
                                setReceiveBillAmount(bill.amount.toFixed(2));
                                setIsReceiveBillModalOpen(true);
                              }}
                              className="px-3 py-1 rounded-xl bg-[#00E676] hover:brightness-110 text-black font-extrabold text-[11px] cursor-pointer"
                            >
                              Baixar
                            </button>
                          ) : (
                            <span className="text-[11px] text-zinc-500">Liquidado</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. CONTAS A PAGAR (TAB) */}
      {/* ========================================================================= */}
      {activeTab === 'contas_pagar' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-lg font-extrabold text-white">Contas a Pagar</h2>
              <p className="text-xs text-zinc-400">Compromissos financeiros reais: fornecedores, aluguel, energia, água, folha e manutenções.</p>
            </div>
            <button
              onClick={() => setIsNewBillPayableModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-[#DA291C] hover:brightness-110 text-white font-black text-xs flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Nova Conta a Pagar</span>
            </button>
          </div>

          {/* Subfilters */}
          <div className="flex items-center gap-2">
            {[
              { id: 'all', label: 'Todas' },
              { id: 'pending', label: 'Pendentes' },
              { id: 'paid', label: 'Pagas' },
              { id: 'overdue', label: 'Vencidas' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setBillPayableStatusFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  billPayableStatusFilter === f.id
                    ? 'bg-zinc-800 text-white border border-zinc-700'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="p-6 rounded-3xl bg-[#12121A] border border-zinc-800 space-y-4 shadow-xl">
            {filteredBillsPayable.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 text-xs">
                Nenhuma conta a pagar cadastrada.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="pb-3">Descrição</th>
                      <th className="pb-3">Credor / Fornecedor</th>
                      <th className="pb-3">Categoria</th>
                      <th className="pb-3">Vencimento</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Valor</th>
                      <th className="pb-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {filteredBillsPayable.map(bill => (
                      <tr key={bill.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="py-3 font-bold text-white">{bill.description}</td>
                        <td className="py-3 text-zinc-300">{bill.recipient || '-'}</td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-[10px] font-mono">
                            {bill.category}
                          </span>
                        </td>
                        <td className="py-3 font-mono text-zinc-400">{bill.dueDate}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            bill.status === 'paid'
                              ? 'bg-emerald-500/20 text-[#00E676]'
                              : bill.status === 'overdue'
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}>
                            {bill.status === 'paid' ? 'Paga' : bill.status === 'overdue' ? 'Vencida' : 'Pendente'}
                          </span>
                        </td>
                        <td className="py-3 text-right font-mono font-black text-white">{formatBRL(bill.amount)}</td>
                        <td className="py-3 text-right">
                          {bill.status !== 'paid' ? (
                            <button
                              onClick={() => {
                                setSelectedBillToPay(bill);
                                setPayBillAmount(bill.amount.toFixed(2));
                                setIsPayBillModalOpen(true);
                              }}
                              className="px-3 py-1 rounded-xl bg-[#00E676] hover:brightness-110 text-black font-extrabold text-[11px] cursor-pointer"
                            >
                              Pagar
                            </button>
                          ) : (
                            <span className="text-[11px] text-zinc-500">Paga</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. COMPRAS (TAB) */}
      {/* ========================================================================= */}
      {activeTab === 'compras' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-lg font-extrabold text-white">Compras de Insumos</h2>
              <p className="text-xs text-zinc-400">Entradas de mercadorias integradas ao estoque, atualizando custos médios ponderados.</p>
            </div>
            <button
              onClick={() => setIsNewPurchaseModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-[#F59E0B] hover:brightness-110 text-black font-black text-xs flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <PackagePlus className="w-4 h-4" />
              <span>Nova Compra de Insumos</span>
            </button>
          </div>

          <div className="p-6 rounded-3xl bg-[#12121A] border border-zinc-800 space-y-4 shadow-xl">
            {purchases.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 text-xs">
                Nenhuma compra registrada. Registre compras para alimentar o estoque e os custos reais dos produtos.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="pb-3">Ref / Data</th>
                      <th className="pb-3">Fornecedor</th>
                      <th className="pb-3">Itens Comprados</th>
                      <th className="pb-3">Condição</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Valor Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {purchases.map(p => (
                      <tr key={p.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="py-3 font-mono font-bold text-zinc-400">
                          <div>{p.id}</div>
                          <div className="text-[10px] text-zinc-600">{p.date}</div>
                        </td>
                        <td className="py-3 font-bold text-white">{p.supplierName}</td>
                        <td className="py-3 text-zinc-300">
                          {p.items.map(it => `${it.quantity} ${it.unit} ${it.ingredientName}`).join(', ')}
                        </td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-[10px] font-mono">
                            {p.paymentTerms === 'a_vista' ? 'À Vista' : 'A Prazo'}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.paymentStatus === 'paid' ? 'bg-emerald-500/20 text-[#00E676]' : 'bg-amber-500/20 text-amber-300'
                          }`}>
                            {p.paymentStatus === 'paid' ? 'Pago' : 'Pendente'}
                          </span>
                        </td>
                        <td className="py-3 text-right font-mono font-black text-white">{formatBRL(p.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. DESPESAS (TAB) */}
      {/* ========================================================================= */}
      {activeTab === 'despesas' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-lg font-extrabold text-white">Despesas Operacionais</h2>
              <p className="text-xs text-zinc-400">Registro e histórico de despesas pagas: energia, água, salários, aluguel, manutenção e impostos.</p>
            </div>
            <button
              onClick={() => setIsNewExpenseModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-[#EC4899] hover:brightness-110 text-white font-black text-xs flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Registrar Nova Despesa</span>
            </button>
          </div>

          <div className="p-6 rounded-3xl bg-[#12121A] border border-zinc-800 space-y-4 shadow-xl">
            {consolidatedExpenses.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 text-xs">
                Nenhuma despesa operacional registrada no sistema.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="pb-3">Data</th>
                      <th className="pb-3">Descrição</th>
                      <th className="pb-3">Categoria</th>
                      <th className="pb-3">Origem Firestore</th>
                      <th className="pb-3">Forma Pgto</th>
                      <th className="pb-3 text-right">Valor</th>
                      <th className="pb-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {consolidatedExpenses.map(exp => (
                      <tr key={exp.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="py-3 font-mono text-zinc-400">{exp.date}</td>
                        <td className="py-3 font-bold text-white">{exp.description}</td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-[10px] font-mono">
                            {exp.category}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-full font-mono text-[9px] font-bold ${
                            exp.source === 'firestore'
                              ? 'bg-emerald-500/15 text-[#00E676] border border-emerald-500/30'
                              : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                          }`}>
                            {exp.source === 'firestore' ? 'Firestore (Expenses)' : 'Local'}
                          </span>
                        </td>
                        <td className="py-3 uppercase text-zinc-300 font-mono text-[10px]">{exp.paymentMethod}</td>
                        <td className="py-3 text-right font-mono font-black text-[#DA291C]">{formatBRL(exp.amount)}</td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => deleteFinancialEntry(exp.id)}
                            className="text-zinc-500 hover:text-red-400 text-xs font-bold cursor-pointer"
                          >
                            Excluir
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. CAIXA (TAB) */}
      {/* ========================================================================= */}
      {activeTab === 'caixa' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-lg font-extrabold text-white">Controle de Caixa & Turnos</h2>
              <p className="text-xs text-zinc-400">Abertura de gaveta com fundo de troco, sangrias, suprimentos e conferência cega no fechamento.</p>
            </div>
            {activeCashSession ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsCashMovementModalOpen(true)}
                  className="px-3.5 py-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer"
                >
                  <Coins className="w-4 h-4 text-[#FFC72C]" />
                  <span>Sangria / Suprimento</span>
                </button>
                <button
                  onClick={() => {
                    setCloseCashCountedAmount(activeCashSession.calculatedFinalAmount.toFixed(2));
                    setIsCashCloseModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-2xl bg-[#DA291C] hover:brightness-110 text-white font-black text-xs flex items-center gap-2 cursor-pointer shadow-lg"
                >
                  <Lock className="w-4 h-4" />
                  <span>Fechar Caixa</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsCashOpenModalOpen(true)}
                className="px-4 py-2.5 rounded-2xl bg-[#00E676] hover:brightness-110 text-black font-black text-xs flex items-center gap-2 cursor-pointer shadow-lg"
              >
                <Unlock className="w-4 h-4" />
                <span>Abrir Caixa</span>
              </button>
            )}
          </div>

          {/* Current Session Summary */}
          {activeCashSession ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-[#12121A] border border-zinc-800 space-y-1">
                <span className="text-xs text-zinc-400 font-semibold">Fundo de Troco Inicial</span>
                <div className="text-2xl font-black text-white font-mono">{formatBRL(activeCashSession.initialAmount)}</div>
                <div className="text-[11px] text-zinc-500">Aberto por {activeCashSession.openedBy}</div>
              </div>
              <div className="p-5 rounded-2xl bg-[#12121A] border border-zinc-800 space-y-1">
                <span className="text-xs text-zinc-400 font-semibold">Vendas em Dinheiro</span>
                <div className="text-2xl font-black text-[#00E676] font-mono">{formatBRL(activeCashSession.cashSales)}</div>
                <div className="text-[11px] text-zinc-500">Recebido em espécie na sessão</div>
              </div>
              <div className="p-5 rounded-2xl bg-[#12121A] border border-zinc-800 space-y-1">
                <span className="text-xs text-zinc-400 font-semibold">Sangrias Efetuadas</span>
                <div className="text-2xl font-black text-[#DA291C] font-mono">{formatBRL(activeCashSession.bleedAmount)}</div>
                <div className="text-[11px] text-zinc-500">Retiradas da gaveta</div>
              </div>
              <div className="p-5 rounded-2xl bg-[#12121A] border border-zinc-800 space-y-1">
                <span className="text-xs text-zinc-400 font-semibold">Saldo Esperado em Dinheiro</span>
                <div className="text-2xl font-black text-[#FFC72C] font-mono">{formatBRL(activeCashSession.calculatedFinalAmount)}</div>
                <div className="text-[11px] text-zinc-500">Fundo + Vendas + Suprimentos - Sangrias</div>
              </div>
            </div>
          ) : (
            <div className="p-10 rounded-3xl bg-[#12121A] border border-zinc-800 text-center space-y-3">
              <Lock className="w-10 h-10 text-zinc-600 mx-auto" />
              <h3 className="text-base font-bold text-white">Nenhuma sessão de caixa aberta no momento</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Abra a sessão informando o valor real em dinheiro na gaveta para iniciar as operações de atendimento.
              </p>
            </div>
          )}

          {/* Tabela de Movimentações Reais de Caixa no Firestore ('CashMovements') */}
          <div className="p-6 rounded-3xl bg-[#12121A] border border-zinc-800 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <Coins className="w-4 h-4 text-[#FFC72C]" />
                  <span>Movimentações de Caixa no Firestore (Coleção 'CashMovements')</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-[#00E676] border border-emerald-500/30">
                    Tempo Real
                  </span>
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Histórico de sangrias, suprimentos, aberturas, fechamentos e vendas em dinheiro sincronizados na nuvem.
                </p>
              </div>
              <span className="text-xs font-mono text-zinc-400 px-2.5 py-1 rounded-xl bg-zinc-900 border border-zinc-800">
                {cashMovementsFirestore.length} {cashMovementsFirestore.length === 1 ? 'movimento' : 'movimentos'}
              </span>
            </div>

            {cashMovementsFirestore.length === 0 ? (
              <div className="py-10 text-center text-zinc-500 text-xs bg-black/20 rounded-2xl border border-zinc-800/60 p-6">
                <Coins className="w-6 h-6 text-zinc-600 mx-auto mb-2" />
                <p className="font-semibold text-zinc-400">Nenhum movimento gravado ainda em 'CashMovements'.</p>
                <p className="text-zinc-500 mt-1">As sangrias, suprimentos e aberturas de caixa são gravadas automaticamente no Firestore.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="pb-3">ID Movimento</th>
                      <th className="pb-3">Data / Hora</th>
                      <th className="pb-3">Tipo</th>
                      <th className="pb-3">Operador</th>
                      <th className="pb-3">Motivo / Descrição</th>
                      <th className="pb-3 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {cashMovementsFirestore.map(mov => {
                      const isPositive = mov.type === 'supply' || mov.type === 'opening' || mov.type === 'sale_cash';
                      return (
                        <tr key={mov.id} className="hover:bg-zinc-800/30 transition-colors">
                          <td className="py-3 font-mono text-[11px] text-zinc-400">{mov.id}</td>
                          <td className="py-3 text-zinc-400">{formatDateTime(mov.createdAt)}</td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              mov.type === 'bleed'
                                ? 'bg-red-500/20 text-red-400'
                                : mov.type === 'supply'
                                ? 'bg-emerald-500/20 text-[#00E676]'
                                : mov.type === 'opening'
                                ? 'bg-blue-500/20 text-blue-300'
                                : mov.type === 'closing'
                                ? 'bg-purple-500/20 text-purple-300'
                                : 'bg-yellow-500/20 text-yellow-300'
                            }`}>
                              {mov.type === 'bleed' ? 'Sangria' : mov.type === 'supply' ? 'Suprimento' : mov.type === 'opening' ? 'Abertura' : mov.type === 'closing' ? 'Fechamento' : 'Venda Dinheiro'}
                            </span>
                          </td>
                          <td className="py-3 text-white font-semibold">{mov.operator}</td>
                          <td className="py-3 text-zinc-300">{mov.reason}</td>
                          <td className={`py-3 text-right font-mono font-black ${isPositive ? 'text-[#00E676]' : 'text-[#DA291C]'}`}>
                            {isPositive ? '+' : '-'}{formatBRL(mov.amount)}
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

      {/* ========================================================================= */}
      {/* 8. RESULTADOS (DRE CONTÁBIL REAL) */}
      {/* ========================================================================= */}
      {activeTab === 'resultados' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-lg font-extrabold text-white">Demonstração do Resultado (DRE)</h2>
              <p className="text-xs text-zinc-400">Estrutura contábil oficial alimentada 100% por vendas concluídas, custos reais e despesas.</p>
            </div>
            <button
              onClick={handleExportCSV}
              disabled={!hasRealMovements}
              className="px-4 py-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer border border-zinc-700 disabled:opacity-40"
            >
              <Download className="w-4 h-4 text-[#FFC72C]" />
              <span>Baixar Relatório CSV</span>
            </button>
          </div>

          {!hasRealMovements || salesCount === 0 ? (
            <div className="p-10 rounded-3xl bg-[#12121A] border border-zinc-800 text-center space-y-3">
              <Info className="w-10 h-10 text-zinc-600 mx-auto" />
              <h3 className="text-base font-bold text-white">Ainda não é possível calcular sua margem com precisão</h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                Cadastre os custos dos produtos no cardápio e registre suas primeiras vendas finalizadas para visualizar o DRE completo.
              </p>
            </div>
          ) : (
            <div className="p-6 rounded-3xl bg-[#12121A] border border-zinc-800 space-y-4 shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="pb-3">Linha DRE</th>
                      <th className="pb-3 text-right">Valor Real</th>
                      <th className="pb-3 text-right">% Receita Bruta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-mono">
                    {/* Receita Bruta */}
                    <tr className="hover:bg-zinc-800/20 font-bold">
                      <td className="py-3 text-white">(+) Receita Bruta de Vendas Finalizadas</td>
                      <td className="py-3 text-right text-[#00E676]">{formatBRL(totalGrossRevenue)}</td>
                      <td className="py-3 text-right text-zinc-400">100.0%</td>
                    </tr>

                    {/* Deduções */}
                    <tr className="hover:bg-zinc-800/20 text-zinc-400">
                      <td className="py-2 pl-4">(-) Taxas de Cartão & Adquirentes</td>
                      <td className="py-2 text-right text-red-400">-{formatBRL(totalCardFees)}</td>
                      <td className="py-2 text-right text-zinc-500">
                        {totalGrossRevenue > 0 ? ((totalCardFees / totalGrossRevenue) * 100).toFixed(1) : 0}%
                      </td>
                    </tr>
                    <tr className="hover:bg-zinc-800/20 text-zinc-400">
                      <td className="py-2 pl-4">(-) Impostos Estimados Simples Nacional (~4.5%)</td>
                      <td className="py-2 text-right text-red-400">-{formatBRL(totalTaxes)}</td>
                      <td className="py-2 text-right text-zinc-500">4.5%</td>
                    </tr>

                    {/* Receita Líquida */}
                    <tr className="hover:bg-zinc-800/20 font-bold border-t border-zinc-800">
                      <td className="py-3 text-zinc-200">(=) Receita Líquida Real</td>
                      <td className="py-3 text-right text-white">{formatBRL(netRevenue)}</td>
                      <td className="py-3 text-right text-zinc-300">
                        {totalGrossRevenue > 0 ? ((netRevenue / totalGrossRevenue) * 100).toFixed(1) : 0}%
                      </td>
                    </tr>

                    {/* CMV */}
                    <tr className="hover:bg-zinc-800/20 text-[#FF6B00] font-semibold">
                      <td className="py-3">
                        (-) Custo dos Produtos (CMV Insumos)
                        {cmvAnalysis.isCostIncomplete && (
                          <span className="ml-2 text-[10px] text-amber-400 font-sans font-bold">⚠️ Ficha técnica incompleta</span>
                        )}
                      </td>
                      <td className="py-3 text-right">-{formatBRL(cmvAnalysis.totalCost)}</td>
                      <td className="py-3 text-right text-zinc-400">
                        {totalGrossRevenue > 0 ? ((cmvAnalysis.totalCost / totalGrossRevenue) * 100).toFixed(1) : 0}%
                      </td>
                    </tr>

                    {/* Lucro Bruto */}
                    <tr className="hover:bg-zinc-800/20 font-black border-t border-zinc-800">
                      <td className="py-3 text-[#FFC72C]">(=) Lucro Bruto Operacional</td>
                      <td className="py-3 text-right text-[#FFC72C]">{formatBRL(grossProfit)}</td>
                      <td className="py-3 text-right text-zinc-300">{grossMarginPercent.toFixed(1)}%</td>
                    </tr>

                    {/* Despesas Operacionais */}
                    <tr className="hover:bg-zinc-800/20 text-[#EC4899] font-semibold">
                      <td className="py-3">(-) Despesas Operacionais Pagas</td>
                      <td className="py-3 text-right">-{formatBRL(realExpenses)}</td>
                      <td className="py-3 text-right text-zinc-400">
                        {totalGrossRevenue > 0 ? ((realExpenses / totalGrossRevenue) * 100).toFixed(1) : 0}%
                      </td>
                    </tr>

                    {/* Resultado Líquido Final */}
                    <tr className="hover:bg-zinc-800/30 text-sm font-black border-t-2 border-zinc-700">
                      <td className="py-4 text-white">(=) RESULTADO LÍQUIDO FINAL ({netResult >= 0 ? 'LUCRO' : 'PREJUÍZO'})</td>
                      <td className={`py-4 text-right ${netResult >= 0 ? 'text-[#00E676]' : 'text-[#DA291C]'}`}>
                        {formatBRL(netResult)}
                      </td>
                      <td className={`py-4 text-right font-bold ${netResult >= 0 ? 'text-[#00E676]' : 'text-[#DA291C]'}`}>
                        {netMarginPercent.toFixed(1)}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAIS OPERACIONAIS INTEGRADOS */}
      {/* ========================================================================= */}

      {/* Modal Abertura de Caixa */}
      <AnimatePresence>
        {isCashOpenModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#14121A] border border-zinc-700/80 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Unlock className="w-5 h-5 text-[#00E676]" />
                  <span>Abertura de Caixa</span>
                </h3>
                <button onClick={() => setIsCashOpenModalOpen(false)} className="text-zinc-400 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleOpenCash} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Operador Responsável</label>
                  <input
                    type="text"
                    disabled
                    value={currentUser?.name || 'Administrador'}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-300 font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Fundo de Troco Inicial em Dinheiro (R$)</label>
                  <input
                    type="text"
                    required
                    value={openCashInitialAmount}
                    onChange={(e) => setOpenCashInitialAmount(e.target.value)}
                    placeholder="150.00"
                    className="w-full bg-zinc-900 border border-zinc-700 focus:border-[#00E676] rounded-xl px-3 py-2 text-white font-mono text-base font-extrabold outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-[#00E676] hover:brightness-110 text-black font-black text-xs transition-all cursor-pointer shadow-lg"
                >
                  Confirmar Abertura de Caixa
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Fechamento de Caixa */}
      <AnimatePresence>
        {isCashCloseModalOpen && activeCashSession && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#14121A] border border-zinc-700/80 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Lock className="w-5 h-5 text-[#DA291C]" />
                  <span>Fechamento de Caixa</span>
                </h3>
                <button onClick={() => setIsCashCloseModalOpen(false)} className="text-zinc-400 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs space-y-1 font-mono">
                <div className="flex justify-between text-zinc-400">
                  <span>Saldo Esperado no Caixa:</span>
                  <strong className="text-white font-black">{formatBRL(activeCashSession.calculatedFinalAmount)}</strong>
                </div>
              </div>

              <form onSubmit={handleCloseCash} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Valor Final Contado na Gaveta em Dinheiro (R$)</label>
                  <input
                    type="text"
                    required
                    value={closeCashCountedAmount}
                    onChange={(e) => setCloseCashCountedAmount(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 focus:border-[#DA291C] rounded-xl px-3 py-2 text-white font-mono text-base font-extrabold outline-none"
                  />
                  {closeCashCountedAmount && (
                    <div className="text-[11px] font-mono font-bold pt-1">
                      {(() => {
                        const counted = parseFloat(closeCashCountedAmount.replace(',', '.')) || 0;
                        const diff = counted - activeCashSession.calculatedFinalAmount;
                        if (Math.abs(diff) < 0.01) return <span className="text-[#00E676]">✓ Sem diferença (Caixa Perfeito)</span>;
                        if (diff > 0) return <span className="text-[#00E676]">Sobra de caixa: +{formatBRL(diff)}</span>;
                        return <span className="text-[#DA291C]">Falta de caixa: -{formatBRL(Math.abs(diff))}</span>;
                      })()}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Observações do Turno</label>
                  <input
                    type="text"
                    value={closeCashNotes}
                    onChange={(e) => setCloseCashNotes(e.target.value)}
                    placeholder="Turno finalizado sem ocorrências"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-[#DA291C] hover:brightness-110 text-white font-black text-xs transition-all cursor-pointer shadow-lg"
                >
                  Confirmar Fechamento do Caixa
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Sangria / Suprimento */}
      <AnimatePresence>
        {isCashMovementModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#14121A] border border-zinc-700/80 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Coins className="w-5 h-5 text-[#FFC72C]" />
                  <span>Movimentação de Caixa</span>
                </h3>
                <button onClick={() => setIsCashMovementModalOpen(false)} className="text-zinc-400 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCashMovementType('bleed')}
                  className={`py-2 rounded-xl font-bold text-xs cursor-pointer border ${
                    cashMovementType === 'bleed'
                      ? 'bg-[#DA291C]/20 border-[#DA291C] text-[#DA291C]'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                  }`}
                >
                  Sangria (Retirada)
                </button>
                <button
                  type="button"
                  onClick={() => setCashMovementType('supply')}
                  className={`py-2 rounded-xl font-bold text-xs cursor-pointer border ${
                    cashMovementType === 'supply'
                      ? 'bg-[#00E676]/20 border-[#00E676] text-[#00E676]'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                  }`}
                >
                  Suprimento (Entrada)
                </button>
              </div>

              <form onSubmit={handleAddMovement} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Valor da Movimentação (R$)</label>
                  <input
                    type="text"
                    required
                    value={cashMovementAmount}
                    onChange={(e) => setCashMovementAmount(e.target.value)}
                    placeholder="50.00"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono text-base font-extrabold outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Motivo Justificado</label>
                  <input
                    type="text"
                    required
                    value={cashMovementReason}
                    onChange={(e) => setCashMovementReason(e.target.value)}
                    placeholder="Ex: Pagamento entregador diária / Reforço troco moedas"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-[#FFC72C] hover:brightness-110 text-black font-black text-xs transition-all cursor-pointer shadow-lg"
                >
                  Registrar Movimentação
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Nova Despesa Operacional */}
      <AnimatePresence>
        {isNewExpenseModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#14121A] border border-zinc-700/80 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-[#EC4899]" />
                  <span>Registrar Despesa Operacional</span>
                </h3>
                <button onClick={() => setIsNewExpenseModalOpen(false)} className="text-zinc-400 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateExpense} className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Descrição</label>
                  <input
                    type="text"
                    required
                    value={expenseDescription}
                    onChange={(e) => setExpenseDescription(e.target.value)}
                    placeholder="Ex: Conta de Energia Amazonas Energia / Sacolas Delivery"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Categoria</label>
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white outline-none"
                  >
                    <option value="energia_agua">Energia Elétrica / Água</option>
                    <option value="aluguel">Aluguel do Ponto</option>
                    <option value="folha_pagamento">Salários / Folha</option>
                    <option value="marketing">Marketing / Divulgação</option>
                    <option value="manutencao">Manutenção & Reparos</option>
                    <option value="outros">Outros Custos Fixos</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-zinc-400 font-semibold">Valor (R$)</label>
                    <input
                      type="text"
                      required
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                      placeholder="180.00"
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono font-bold outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-zinc-400 font-semibold">Forma de Pagamento</label>
                    <select
                      value={expensePaymentMethod}
                      onChange={(e) => setExpensePaymentMethod(e.target.value as any)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white outline-none"
                    >
                      <option value="pix">PIX</option>
                      <option value="cash">Dinheiro da Gaveta</option>
                      <option value="transferencia">Transferência</option>
                      <option value="boleto">Boleto</option>
                      <option value="debit_card">Cartão Débito</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-[#EC4899] hover:brightness-110 text-white font-black text-xs transition-all cursor-pointer shadow-lg mt-2"
                >
                  Salvar Despesa
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Nova Conta a Pagar */}
      <AnimatePresence>
        {isNewBillPayableModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#14121A] border border-zinc-700/80 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-[#DA291C]" />
                  <span>Nova Conta a Pagar</span>
                </h3>
                <button onClick={() => setIsNewBillPayableModalOpen(false)} className="text-zinc-400 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateBillPayable} className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Descrição do Título</label>
                  <input
                    type="text"
                    required
                    value={billPayDesc}
                    onChange={(e) => setBillPayDesc(e.target.value)}
                    placeholder="Ex: Fornecedor de Carnes Angus / Manutenção Chapa"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-zinc-400 font-semibold">Categoria</label>
                    <select
                      value={billPayCategory}
                      onChange={(e) => setBillPayCategory(e.target.value as any)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white outline-none"
                    >
                      <option value="fornecedores">Fornecedores</option>
                      <option value="aluguel">Aluguel</option>
                      <option value="energia">Energia</option>
                      <option value="agua">Água</option>
                      <option value="internet">Internet</option>
                      <option value="salarios">Salários</option>
                      <option value="servicos">Serviços</option>
                      <option value="manutencao">Manutenção</option>
                      <option value="impostos">Impostos</option>
                      <option value="marketing">Marketing</option>
                      <option value="outros">Outros</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-zinc-400 font-semibold">Fornecedor / Credor</label>
                    <input
                      type="text"
                      value={billPayRecipient}
                      onChange={(e) => setBillPayRecipient(e.target.value)}
                      placeholder="Nome do Credor"
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-zinc-400 font-semibold">Valor (R$)</label>
                    <input
                      type="text"
                      required
                      value={billPayAmount}
                      onChange={(e) => setBillPayAmount(e.target.value)}
                      placeholder="250.00"
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono font-bold outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-zinc-400 font-semibold">Data de Vencimento</label>
                    <input
                      type="date"
                      required
                      value={billPayDueDate}
                      onChange={(e) => setBillPayDueDate(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white outline-none font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-[#DA291C] hover:brightness-110 text-white font-black text-xs transition-all cursor-pointer shadow-lg mt-2"
                >
                  Cadastrar Conta a Pagar
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Pagar Conta */}
      <AnimatePresence>
        {isPayBillModalOpen && selectedBillToPay && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#14121A] border border-zinc-700/80 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Check className="w-5 h-5 text-[#00E676]" />
                  <span>Registrar Pagamento de Conta</span>
                </h3>
                <button onClick={() => setIsPayBillModalOpen(false)} className="text-zinc-400 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs space-y-1">
                <div className="text-white font-bold">{selectedBillToPay.description}</div>
                <div className="text-zinc-400 font-mono">Valor Total: {formatBRL(selectedBillToPay.amount)}</div>
              </div>

              <form onSubmit={handleExecutePayBill} className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Valor Pago (R$)</label>
                  <input
                    type="text"
                    required
                    value={payBillAmount}
                    onChange={(e) => setPayBillAmount(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono font-bold outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Forma de Pagamento Utilizada</label>
                  <select
                    value={payBillMethod}
                    onChange={(e) => setPayBillMethod(e.target.value as any)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white outline-none"
                  >
                    <option value="pix">PIX</option>
                    <option value="cash">Dinheiro em Espécie (Gaveta do Caixa)</option>
                    <option value="transferencia">Transferência Bancária</option>
                    <option value="boleto">Boleto Liquidado</option>
                    <option value="debit_card">Cartão Débito</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-[#00E676] hover:brightness-110 text-black font-black text-xs transition-all cursor-pointer shadow-lg mt-2"
                >
                  Confirmar Baixa do Pagamento
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Nova Compra de Insumos (Integrado com Estoque) */}
      <AnimatePresence>
        {isNewPurchaseModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#14121A] border border-zinc-700/80 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <PackagePlus className="w-5 h-5 text-[#F59E0B]" />
                  <span>Nova Compra de Insumos & Entrada no Estoque</span>
                </h3>
                <button onClick={() => setIsNewPurchaseModalOpen(false)} className="text-zinc-400 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreatePurchase} className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Fornecedor</label>
                  <input
                    type="text"
                    required
                    value={purchaseSupplier}
                    onChange={(e) => setPurchaseSupplier(e.target.value)}
                    placeholder="Ex: Frigorífico Central / Panificadora Real"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Insumo do Estoque</label>
                  {ingredients.length > 0 ? (
                    <select
                      value={purchaseSelectedIngredientId}
                      onChange={(e) => {
                        setPurchaseSelectedIngredientId(e.target.value);
                        const found = ingredients.find(i => i.id === e.target.value);
                        if (found) {
                          setPurchaseUnit(found.unit || 'kg');
                          setPurchaseUnitPrice(found.costPerUnit ? String(found.costPerUnit) : '');
                        }
                      }}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white outline-none"
                    >
                      <option value="">Selecione um insumo já cadastrado ou digite abaixo</option>
                      {ingredients.map(ing => (
                        <option key={ing.id} value={ing.id}>
                          {ing.name} (Estoque atual: {ing.currentStock} {ing.unit})
                        </option>
                      ))}
                    </select>
                  ) : null}
                  <input
                    type="text"
                    value={purchaseIngredientName}
                    onChange={(e) => setPurchaseIngredientName(e.target.value)}
                    placeholder="Ou digite o nome do insumo se novo (Ex: Queijo Mussarela Fatiado)"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white outline-none mt-1"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-zinc-400 font-semibold">Quantidade</label>
                    <input
                      type="text"
                      required
                      value={purchaseQuantity}
                      onChange={(e) => setPurchaseQuantity(e.target.value)}
                      placeholder="10"
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono font-bold outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-zinc-400 font-semibold">Unidade</label>
                    <select
                      value={purchaseUnit}
                      onChange={(e) => setPurchaseUnit(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white outline-none"
                    >
                      <option value="kg">kg (Quilograma)</option>
                      <option value="g">g (Grama)</option>
                      <option value="un">un (Unidade)</option>
                      <option value="pct">pct (Pacote)</option>
                      <option value="l">l (Litro)</option>
                      <option value="cx">cx (Caixa)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-zinc-400 font-semibold">Preço Unitário (R$)</label>
                    <input
                      type="text"
                      required
                      value={purchaseUnitPrice}
                      onChange={(e) => setPurchaseUnitPrice(e.target.value)}
                      placeholder="28.50"
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono font-bold outline-none"
                    />
                  </div>
                </div>

                {purchaseQuantity && purchaseUnitPrice && (
                  <div className="p-3 rounded-xl bg-black/40 border border-zinc-800 text-xs flex justify-between font-mono">
                    <span className="text-zinc-400">Total da Compra:</span>
                    <strong className="text-[#F59E0B] font-extrabold text-sm">
                      {formatBRL((parseFloat(purchaseQuantity.replace(',', '.')) || 0) * (parseFloat(purchaseUnitPrice.replace(',', '.')) || 0))}
                    </strong>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-zinc-400 font-semibold">Condição de Pagamento</label>
                    <select
                      value={purchaseTerms}
                      onChange={(e) => setPurchaseTerms(e.target.value as any)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white outline-none"
                    >
                      <option value="a_vista">À Vista (Saída Imediata de Caixa)</option>
                      <option value="a_prazo">A Prazo (Gera Conta a Pagar)</option>
                    </select>
                  </div>
                  {purchaseTerms === 'a_prazo' ? (
                    <div className="space-y-1">
                      <label className="text-zinc-400 font-semibold">Vencimento do Boleto</label>
                      <input
                        type="date"
                        value={purchaseDueDate}
                        onChange={(e) => setPurchaseDueDate(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white outline-none font-mono"
                      />
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="text-zinc-400 font-semibold">Forma de Saída</label>
                      <select
                        value={purchaseMethod}
                        onChange={(e) => setPurchaseMethod(e.target.value as any)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white outline-none"
                      >
                        <option value="pix">PIX</option>
                        <option value="cash">Dinheiro em Espécie (Caixa)</option>
                        <option value="transferencia">Transferência</option>
                      </select>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-[#F59E0B] hover:brightness-110 text-black font-black text-xs transition-all cursor-pointer shadow-lg mt-2"
                >
                  Registrar Compra & Atualizar Estoque
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Nova Conta a Receber */}
      <AnimatePresence>
        {isNewBillReceivableModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#14121A] border border-zinc-700/80 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <ArrowUpRight className="w-5 h-5 text-[#00D2FF]" />
                  <span>Novo Título a Receber</span>
                </h3>
                <button onClick={() => setIsNewBillReceivableModalOpen(false)} className="text-zinc-400 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateBillReceivable} className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Descrição</label>
                  <input
                    type="text"
                    required
                    value={billRecDesc}
                    onChange={(e) => setBillRecDesc(e.target.value)}
                    placeholder="Ex: Fornecimento Evento Aniversário / Convênio Mensal"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-zinc-400 font-semibold">Cliente / Sacado</label>
                    <input
                      type="text"
                      value={billRecCustomer}
                      onChange={(e) => setBillRecCustomer(e.target.value)}
                      placeholder="Nome do Cliente"
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-zinc-400 font-semibold">Valor (R$)</label>
                    <input
                      type="text"
                      required
                      value={billRecAmount}
                      onChange={(e) => setBillRecAmount(e.target.value)}
                      placeholder="350.00"
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono font-bold outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Data de Vencimento</label>
                  <input
                    type="date"
                    required
                    value={billRecDueDate}
                    onChange={(e) => setBillRecDueDate(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white outline-none font-mono"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-[#00D2FF] hover:brightness-110 text-black font-black text-xs transition-all cursor-pointer shadow-lg mt-2"
                >
                  Cadastrar Título a Receber
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Baixar Conta a Receber */}
      <AnimatePresence>
        {isReceiveBillModalOpen && selectedBillToReceive && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#14121A] border border-zinc-700/80 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#00E676]" />
                  <span>Confirmar Recebimento de Valor</span>
                </h3>
                <button onClick={() => setIsReceiveBillModalOpen(false)} className="text-zinc-400 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs space-y-1">
                <div className="text-white font-bold">{selectedBillToReceive.description}</div>
                <div className="text-zinc-400 font-mono">Valor: {formatBRL(selectedBillToReceive.amount)}</div>
              </div>

              <form onSubmit={handleExecuteReceiveBill} className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Valor Efetivamente Recebido (R$)</label>
                  <input
                    type="text"
                    required
                    value={receiveBillAmount}
                    onChange={(e) => setReceiveBillAmount(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono font-bold outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Forma de Recebimento</label>
                  <select
                    value={receiveBillMethod}
                    onChange={(e) => setReceiveBillMethod(e.target.value as any)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white outline-none"
                  >
                    <option value="pix">PIX Instantâneo</option>
                    <option value="cash">Dinheiro em Espécie (Gaveta do Caixa)</option>
                    <option value="transferencia">Transferência Bancária</option>
                    <option value="debit_card">Cartão Débito</option>
                    <option value="credit_card">Cartão Crédito</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-[#00E676] hover:brightness-110 text-black font-black text-xs transition-all cursor-pointer shadow-lg mt-2"
                >
                  Confirmar Entrada Financeira
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
