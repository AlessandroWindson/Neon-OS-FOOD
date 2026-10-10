import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  DollarSign, 
  Trash2, 
  Plus, 
  Minus, 
  Printer, 
  QrCode, 
  CreditCard, 
  Banknote, 
  Users, 
  Sparkles, 
  CheckCircle2, 
  X, 
  Percent, 
  ShoppingBag,
  Clock,
  ArrowRight,
  Receipt,
  RotateCcw,
  Flame,
  UtensilsCrossed,
  Layers,
  Share2,
  MessageSquare,
  Send,
  ExternalLink,
  WifiOff,
  Database,
  UserCheck,
  Coins,
  ArrowDownCircle,
  ArrowUpCircle,
  Keyboard,
  FileEdit,
  Tag,
  Package,
  Copy,
  Check,
  Zap,
  ShieldCheck,
  Maximize2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '../context/AppContext';
import { Product, OrderItem, PaymentMethod, Customer, Employee } from '../types';
import { formatBRL } from '../utils/formatters';
import { playBeep, playCashRegister, playKitchenBell, playSoftClickSound } from '../utils/audio';
import { CompartilharCardapioModal } from './CompartilharCardapioModal';
import { generatePixPayload, getPixQrCodeUrl } from '../utils/pix';
import { PaymentGatewayModal } from './PaymentGatewayModal';
import { paymentGatewayService } from '../services/paymentGatewayService';
import { thermalPrinterService } from '../services/escposService';

export const PDVInteligente: React.FC = () => {
  const { 
    products = [], 
    createOrder, 
    setPrintOrder, 
    tenant, 
    activeCashSession, 
    effectiveIsOnline,
    pendingSyncQueue = [],
    setIsOfflineSyncModalOpen,
    employees = [],
    customers = [],
    addAuditLog,
    redeemCashback,
    setCurrentView,
    setWebhookNotifications
  } = useApp();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [cartItems, setCartItems] = useState<OrderItem[]>([]);
  const [customerName, setCustomerName] = useState('Cliente Balcão');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Operator / Attendant
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(() => {
    return employees.length > 0 ? employees[0].id : 'emp_01';
  });
  const [isOperatorModalOpen, setIsOperatorModalOpen] = useState(false);

  // Destination & Table
  const [orderType, setOrderType] = useState<'takeout' | 'dine_in' | 'delivery'>('takeout');
  const [tableNumber, setTableNumber] = useState<number | undefined>(undefined);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [tempDiscount, setTempDiscount] = useState<number>(5);

  // Sangria & Suprimento modal
  const [isCashFlowModalOpen, setIsCashFlowModalOpen] = useState(false);
  const [cashFlowType, setCashFlowType] = useState<'sangria' | 'suprimento'>('sangria');
  const [cashFlowAmount, setCashFlowAmount] = useState<number>(50);
  const [cashFlowReason, setCashFlowReason] = useState('');
  const [cashFlowSuccess, setCashFlowSuccess] = useState(false);

  // Item note modal
  const [editingItemNoteId, setEditingItemNoteId] = useState<string | null>(null);
  const [tempItemNote, setTempItemNote] = useState('');

  // Payment Modal & Sharing Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [cashGiven, setCashGiven] = useState<number>(0);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [lastCreatedOrder, setLastCreatedOrder] = useState<any>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [modalInitialTable, setModalInitialTable] = useState<number | undefined>(undefined);
  const [modalCustomerName, setModalCustomerName] = useState<string>('');

  // Pix Dinâmico & Gateway Modal States
  const [isGatewayModalOpen, setIsGatewayModalOpen] = useState(false);
  const [pixTxId, setPixTxId] = useState<string>(() => `PDV-${Math.floor(1000 + Math.random() * 9000)}`);
  const [pixCopied, setPixCopied] = useState(false);
  const [isSimulatingWebhook, setIsSimulatingWebhook] = useState(false);

  // Current active employee object
  const currentEmployee = useMemo(() => {
    return employees.find(e => e.id === selectedEmployeeId) || employees[0] || {
      id: 'emp_01',
      name: 'Operador Padrão',
      roleTitle: 'Caixa / Balcão'
    };
  }, [employees, selectedEmployeeId]);

  // Categories extraction
  const categories = useMemo(() => {
    const set = new Set(products.map(p => p.category));
    return ['all', ...Array.from(set)];
  }, [products]);

  // Category labels and icons helper
  const getCategoryIcon = (cat: string) => {
    const c = cat.toLowerCase();
    if (c.includes('burger') || c.includes('hamb') || c.includes('smash')) return '🍔';
    if (c.includes('porç') || c.includes('batat') || c.includes('frango')) return '🍟';
    if (c.includes('pizz') || c.includes('esfih')) return '🍕';
    if (c.includes('açai') || c.includes('sobremesa') || c.includes('shake') || c.includes('doce')) return '🍧';
    if (c.includes('bebida') || c.includes('refrig') || c.includes('suco')) return '🥤';
    if (c.includes('combo')) return '⭐';
    return '🍽️';
  };

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchCat && matchSearch && p.available;
    });
  }, [products, selectedCategory, searchTerm]);

  // Calculate cart totals
  const subtotal = cartItems.reduce((acc, item) => acc + (item.totalPrice || (item.unitPrice * item.quantity)), 0);
  const total = Math.max(0, subtotal - discountAmount);
  const changeDue = paymentMethod === 'cash' && cashGiven > total ? cashGiven - total : 0;

  // Keyboard shortcuts (F2, F4, F7, F8, Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        handleClearCart();
        playBeep(600, 0.05);
      } else if (e.key === 'F4') {
        e.preventDefault();
        setIsDiscountModalOpen(true);
        playSoftClickSound();
      } else if (e.key === 'F7') {
        e.preventDefault();
        setIsCashFlowModalOpen(true);
        playSoftClickSound();
      } else if (e.key === 'F8') {
        e.preventDefault();
        if (cartItems.length > 0) {
          setIsPaymentModalOpen(true);
          playCashRegister();
        }
      } else if (e.key === 'Escape') {
        setIsPaymentModalOpen(false);
        setIsDiscountModalOpen(false);
        setIsCashFlowModalOpen(false);
        setIsOperatorModalOpen(false);
        setEditingItemNoteId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cartItems.length]);

  // Add to cart
  const handleAddToCart = (product: Product) => {
    playBeep(880, 0.03);
    setCartItems(prev => {
      const existing = prev.find(item => item.productId === product.id && !item.notes);
      if (existing) {
        return prev.map(item =>
          item.id === existing.id
            ? { ...item, quantity: item.quantity + 1, totalPrice: (item.quantity + 1) * item.unitPrice }
            : item
        );
      }
      const newItem: OrderItem = {
        id: `item_${Date.now()}_${Math.random()}`,
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice: product.price,
        totalPrice: product.price,
        station: product.station,
        status: 'pending',
      };
      return [...prev, newItem];
    });
  };

  // Adjust quantity
  const handleUpdateQuantity = (itemId: string, delta: number) => {
    playBeep(750, 0.02);
    setCartItems(prev => {
      return prev
        .map(item => {
          if (item.id === itemId) {
            const newQ = item.quantity + delta;
            return newQ > 0 ? { ...item, quantity: newQ, totalPrice: newQ * item.unitPrice } : null;
          }
          return item;
        })
        .filter(Boolean) as OrderItem[];
    });
  };

  // Clear cart
  const handleClearCart = () => {
    setCartItems([]);
    setDiscountAmount(0);
    setTableNumber(undefined);
    setCustomerName('Cliente Balcão');
    setCustomerPhone('');
    setSelectedCustomer(null);
  };

  // Regenerar TxId ao abrir modal de pagamento
  useEffect(() => {
    if (isPaymentModalOpen) {
      setPixTxId(`PDV-${Math.floor(1000 + Math.random() * 9000)}`);
      setPixCopied(false);
    }
  }, [isPaymentModalOpen]);

  // Payload e QR Code Pix Dinâmico do PDV
  const dynamicPixPayload = useMemo(() => {
    if (total <= 0) return '';
    const key = tenant?.settings?.pixKey || '38492011000185';
    const keyType = tenant?.settings?.pixKeyType || 'cnpj';
    const merchantName = tenant?.settings?.pixBeneficiaryName || tenant?.name || 'Lanchonete Dulci';
    const merchantCity = tenant?.settings?.pixCity || 'SAO PAULO';

    return generatePixPayload({
      pixKey: key,
      pixKeyType: keyType,
      merchantName,
      merchantCity,
      amount: total,
      txId: pixTxId,
      description: `PDV ${pixTxId} ${customerName || 'Balcao'}`.slice(0, 40),
    });
  }, [total, tenant, pixTxId, customerName]);

  const dynamicPixQrCodeUrl = useMemo(() => {
    if (!dynamicPixPayload) return '';
    return getPixQrCodeUrl(dynamicPixPayload, 220);
  }, [dynamicPixPayload]);

  const handleCopyPixPayload = () => {
    if (!dynamicPixPayload) return;
    navigator.clipboard.writeText(dynamicPixPayload);
    setPixCopied(true);
    playSoftClickSound();
    setTimeout(() => setPixCopied(false), 2500);
  };

  // Finalize order
  const handleFinalizeSale = () => {
    if (cartItems.length === 0) return;

    playCashRegister();
    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.8 },
      colors: ['#DA291C', '#FFC72C', '#FF6B00', '#00E676'],
    });

    const channelMap: Record<string, any> = {
      takeout: 'pdv_balcao',
      dine_in: 'mesa',
      delivery: 'delivery_web',
    };

    const isPix = paymentMethod === 'pix';
    const generatedE2E = isPix ? `E38492011${Date.now()}` : undefined;

    const newOrder = createOrder({
      customerName: customerName || 'Cliente Balcão',
      channel: channelMap[orderType] || 'pdv_balcao',
      tableNumber: orderType === 'dine_in' ? tableNumber : undefined,
      items: cartItems,
      subtotal,
      discount: discountAmount,
      serviceFee: 0,
      total,
      paymentMethod,
      paymentStatus: 'paid',
      status: 'preparing',
      pixTxId: isPix ? pixTxId : undefined,
      pixEndToEndId: generatedE2E,
      pixPaidAt: isPix ? new Date().toISOString() : undefined,
      gatewayProvider: isPix ? 'Banco Central / Pix Dinâmico' : undefined,
    });

    // If customer had cashback redeemed
    if (selectedCustomer && discountAmount > 0 && redeemCashback) {
      redeemCashback(selectedCustomer.id, discountAmount);
    }

    // Disparo automático para impressoras térmicas (Cozinha & Comprovante do Cliente)
    try {
      thermalPrinterService.dispatchAutoPrintsOnOrderFinalized(newOrder, tenant);
    } catch (e) {
      console.warn('[ThermalPrinter PDV] Erro no disparo automático:', e);
    }

    setLastCreatedOrder(newOrder);
    setIsPaymentModalOpen(false);
    setIsSuccessModalOpen(true);
    handleClearCart();
  };

  // Baixa Automática simulada por Webhook
  const handleSimulatePixWebhook = async () => {
    setIsSimulatingWebhook(true);
    playBeep(900, 0.05);
    try {
      await paymentGatewayService.simulateBankClearing(pixTxId);
      
      // Realizar baixa automática imediata no PDV
      handleFinalizeSale();

      if (setWebhookNotifications) {
        const notif = {
          id: `wh_pdv_pix_${Date.now()}`,
          provider: 'mercadopago',
          eventType: 'payment.approved',
          title: `Pix Dinâmico PDV • Venda Aprovada!`,
          message: `Recebimento de ${formatBRL(total)} liquidado via Webhook Pix (${pixTxId}) para ${tenant.name}. Baixa automática realizada no Caixa!`,
          amount: total,
          timestamp: new Date().toISOString(),
          read: false,
        };
        setWebhookNotifications(prev => [notif, ...prev.slice(0, 49)]);
      }
    } finally {
      setIsSimulatingWebhook(false);
    }
  };

  // Sangria / Suprimento submission
  const handleCashFlowSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cashFlowAmount <= 0) return;

    if (addAuditLog) {
      addAuditLog({
        userName: currentEmployee.name,
        userRole: 'cashier',
        action: cashFlowType === 'sangria' ? 'cash_bleed' : 'cash_supply',
        description: `${cashFlowType === 'sangria' ? 'Sangria de Caixa' : 'Suprimento de Caixa'} no valor de ${formatBRL(cashFlowAmount)}. Motivo: ${cashFlowReason || 'Operação de rotina'}`,
        details: { valor: cashFlowAmount, motivo: cashFlowReason, operador: currentEmployee.name },
        severity: cashFlowType === 'sangria' ? 'warning' : 'info'
      });
    }

    playCashRegister();
    setCashFlowSuccess(true);
    setTimeout(() => {
      setCashFlowSuccess(false);
      setIsCashFlowModalOpen(false);
      setCashFlowReason('');
    }, 2000);
  };

  // Customer Autocomplete Filter
  const matchingCustomers = useMemo(() => {
    if (!searchTerm && !customerName) return [];
    const term = customerName.toLowerCase();
    if (term === 'cliente balcão' || term.length < 2) return [];
    return customers.filter(c => c.name.toLowerCase().includes(term) || c.phone.includes(term));
  }, [customers, customerName]);

  const selectLoyaltyCustomer = (cust: Customer) => {
    setSelectedCustomer(cust);
    setCustomerName(cust.name);
    setCustomerPhone(cust.phone);
    setShowCustomerDropdown(false);
    playSoftClickSound();
  };

  return (
    <div className="space-y-6 pb-16 select-none">
      {/* Top Bar: McDonald's Theme Header with Brazilian Personalization */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-5 rounded-3xl bg-[#12121A] border border-[#242436] shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#DA291C] to-[#B31B10] text-[#FFC72C] flex items-center justify-center shadow-[0_0_20px_rgba(218,41,28,0.4)] border border-[#FFC72C]/40 shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-black font-display text-white tracking-tight">
                Frente de Caixa & PDV Balcão
              </h1>
              <span className="text-[10px] font-mono font-black bg-[#DA291C]/25 text-[#FFC72C] px-2 py-0.5 rounded-md border border-[#FFC72C]/30">
                F8 Pagar
              </span>
              {!effectiveIsOnline && (
                <button
                  type="button"
                  onClick={() => setIsOfflineSyncModalOpen(true)}
                  className="text-[10px] font-bold bg-red-500/20 hover:bg-red-500/30 text-red-300 px-2 py-0.5 rounded-md border border-red-500/40 flex items-center gap-1 cursor-pointer animate-pulse"
                >
                  <WifiOff className="w-3 h-3 text-red-400" />
                  <span>Modo Offline Ativo</span>
                </button>
              )}
            </div>
            <p className="text-xs text-[#A1A1AA] mt-0.5">
              Atendimento ágil de balcão, combos, comandas e integração com chapa & KDS
            </p>
          </div>
        </div>

        {/* Center/Right: Operator Selector, Sangria & Quick actions */}
        <div className="flex items-center gap-2.5 flex-wrap w-full lg:w-auto justify-start lg:justify-end">
          {/* Operator Switcher */}
          <button
            onClick={() => {
              setIsOperatorModalOpen(true);
              playSoftClickSound();
            }}
            className="px-3.5 py-2 rounded-2xl bg-[#181826] hover:bg-[#202034] border border-[#2E2E44] text-xs font-bold text-white flex items-center gap-2 cursor-pointer transition-all shadow-sm"
            title="Trocar Operador ou Atendente do Turno"
          >
            <UserCheck className="w-4 h-4 text-[#00E676]" />
            <div className="text-left">
              <div className="text-[9px] text-[#71717A] uppercase font-mono leading-none">Operador</div>
              <div className="text-xs font-black text-white truncate max-w-[130px] leading-tight">
                {currentEmployee.name}
              </div>
            </div>
          </button>

          {/* Sangria / Suprimento (F7) */}
          <button
            onClick={() => {
              setIsCashFlowModalOpen(true);
              playSoftClickSound();
            }}
            className="px-3.5 py-2 rounded-2xl bg-[#181826] hover:bg-[#202034] border border-[#2E2E44] text-xs font-bold text-[#FFC72C] flex items-center gap-2 cursor-pointer transition-all shadow-sm"
            title="Movimentação de Caixa: Sangria ou Suprimento (F7)"
          >
            <Coins className="w-4 h-4 text-[#FFC72C]" />
            <span>Sangria / Caixa</span>
            <span className="text-[10px] font-mono text-[#71717A]">F7</span>
          </button>

          {/* Gerenciamento de Impressoras Térmicas */}
          <button
            onClick={() => {
              setCurrentView('gerenciamento_impressoras');
              playSoftClickSound();
            }}
            className="px-3.5 py-2 bg-[#38BDF8]/15 hover:bg-[#38BDF8]/25 border border-[#38BDF8]/40 text-[#38BDF8] rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Configurar e Gerenciar Impressoras Térmicas (Rede IP / USB)"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Impressoras</span>
          </button>

          {/* WhatsApp Share Cardápio */}
          <button
            onClick={() => {
              setModalInitialTable(tableNumber);
              setModalCustomerName(customerName !== 'Cliente Balcão' ? customerName : '');
              setIsShareModalOpen(true);
              playBeep(900, 0.04);
            }}
            className="px-3.5 py-2 bg-[#25D366]/20 hover:bg-[#25D366]/30 border border-[#25D366]/50 text-[#25D366] rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Cardápio wa.me</span>
          </button>

          {/* Search bar */}
          <div className="relative w-full sm:w-56">
            <Search className="w-4 h-4 text-[#FFC72C] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar lanche, combo..."
              className="w-full bg-[#181826] border border-[#2A2A3E] focus:border-[#DA291C] rounded-2xl pl-9 pr-3 py-2 text-xs text-white placeholder-[#71717A] transition-all shadow-inner"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Catalog (8 cols) + Comanda / Balcão (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT: Products Catalog (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          
          {/* Category Filter Pills in McDonald's Signature Style */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map(cat => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    playSoftClickSound();
                  }}
                  className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected 
                      ? 'bg-gradient-to-r from-[#DA291C] to-[#E51A24] text-white shadow-[0_0_15px_rgba(218,41,28,0.45)] border border-[#FFC72C]/40 font-black scale-105' 
                      : 'bg-[#161622] text-[#A1A1AA] hover:text-white border border-[#262638] hover:border-[#3A3A50]'
                  }`}
                >
                  <span>{cat === 'all' ? '🍔' : getCategoryIcon(cat)}</span>
                  <span>{cat === 'all' ? 'Todos os Lanches' : cat}</span>
                </button>
              );
            })}
          </div>

          {/* Products Grid */}
          {filteredProducts.length === 0 ? (
            <div className="p-8 sm:p-12 rounded-3xl bg-[#12121A] border border-[#242436] text-center space-y-4 shadow-xl">
              <div className="w-16 h-16 rounded-2xl bg-[#DA291C]/15 border border-[#DA291C]/30 text-[#FFC72C] flex items-center justify-center mx-auto shadow-[0_0_15px_rgba(218,41,28,0.2)]">
                <Package className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-white">Nenhum produto encontrado</h3>
                <p className="text-xs text-[#A1A1AA] max-w-md mx-auto">
                  {products.length === 0
                    ? 'Você ainda não possui produtos cadastrados. Cadastre seus lanches e bebidas na Gestão de Produtos para iniciar as vendas.'
                    : 'Nenhum item corresponde ao filtro ou busca selecionada.'}
                </p>
              </div>
              {products.length === 0 && (
                <button
                  onClick={() => setCurrentView('cardapio_bcg')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#DA291C] to-[#E51A24] text-white text-xs font-black hover:brightness-110 transition-all shadow-[0_0_15px_rgba(218,41,28,0.4)] cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Cadastrar Produtos na Gestão</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {filteredProducts.map(product => {
                const inCartItem = cartItems.find(i => i.productId === product.id);
                const inCartCount = inCartItem?.quantity || 0;

                return (
                  <motion.div
                    key={product.id}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 450, damping: 22 }}
                    onClick={() => handleAddToCart(product)}
                    className={`group p-3 rounded-2xl bg-[#12121A] border transition-all cursor-pointer flex flex-col justify-between select-none relative shadow-md ${
                      inCartCount > 0 
                        ? 'border-[#FFC72C] shadow-[0_0_12px_rgba(255,199,44,0.18)]' 
                        : 'border-[#222234] hover:border-[#DA291C]/60'
                    }`}
                  >
                    {/* Badge count in cart */}
                    {inCartCount > 0 && (
                      <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gradient-to-br from-[#DA291C] to-[#B31B10] text-[#FFC72C] font-black text-xs flex items-center justify-center shadow-lg border border-[#FFC72C] z-10 animate-in zoom-in">
                        {inCartCount}
                      </span>
                    )}

                    <div>
                      {/* Image / Thumbnail */}
                      <div className="w-full h-28 rounded-xl overflow-hidden mb-2 bg-[#1A1A26] relative">
                        {product.image ? (
                          <img 
                            src={product.image} 
                            alt={product.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl">
                            {getCategoryIcon(product.category)}
                          </div>
                        )}
                        <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-[10px] font-bold text-[#FFC72C]">
                          {product.station === 'kitchen_bar' ? 'Chapa' : 'Bebidas'}
                        </span>
                      </div>

                      <h3 className="font-extrabold text-xs text-white line-clamp-1 group-hover:text-[#FFC72C] transition-colors">
                        {product.name}
                      </h3>
                      <p className="text-[11px] text-[#71717A] line-clamp-1 mt-0.5">
                        {product.description || 'Smash artesanal preparado na hora'}
                      </p>
                    </div>

                    {/* Price & Add action */}
                    <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-[#1E1E2C]">
                      <span className="font-mono font-black text-sm text-[#00E676]">
                        {formatBRL(product.price)}
                      </span>
                      <span className="w-6 h-6 rounded-lg bg-[#DA291C]/20 text-[#FFC72C] flex items-center justify-center font-bold text-xs group-hover:bg-[#DA291C] group-hover:text-white transition-colors">
                        +
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT: Comanda & Checkout Panel (4 cols) */}
        <div className="lg:col-span-4">
          <div className="bg-[#12121A] border border-[#242436] rounded-3xl p-5 space-y-4 shadow-2xl sticky top-20">
            
            {/* Comanda Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#20202E]">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#FFC72C]" />
                <h2 className="font-black text-base text-white">Comanda Atual</h2>
                <span className="text-[10px] font-mono text-[#A1A1AA] bg-[#181824] px-2 py-0.5 rounded-md border border-[#262638]">
                  {cartItems.reduce((s, i) => s + i.quantity, 0)} itens
                </span>
              </div>

              {cartItems.length > 0 && (
                <button
                  onClick={handleClearCart}
                  className="text-xs text-[#A1A1AA] hover:text-[#DA291C] flex items-center gap-1 transition-colors cursor-pointer"
                  title="Limpar Comanda (F2)"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Limpar (F2)</span>
                </button>
              )}
            </div>

            {/* Destination Selector: Balcão / Mesa / Delivery */}
            <div className="grid grid-cols-3 gap-1.5 bg-[#161624] p-1 rounded-2xl border border-[#252538]">
              <button
                onClick={() => setOrderType('takeout')}
                className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  orderType === 'takeout' 
                    ? 'bg-[#DA291C] text-white shadow-[0_0_10px_rgba(218,41,28,0.45)] font-black' 
                    : 'text-[#A1A1AA] hover:text-white'
                }`}
              >
                Balcão / Viagem
              </button>
              <button
                onClick={() => setOrderType('dine_in')}
                className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  orderType === 'dine_in' 
                    ? 'bg-[#FFC72C] text-black shadow-[0_0_10px_rgba(255,199,44,0.45)] font-black' 
                    : 'text-[#A1A1AA] hover:text-white'
                }`}
              >
                Mesa / Salão
              </button>
              <button
                onClick={() => setOrderType('delivery')}
                className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  orderType === 'delivery' 
                    ? 'bg-[#FF5722] text-white shadow-[0_0_10px_rgba(255,87,34,0.45)] font-black' 
                    : 'text-[#A1A1AA] hover:text-white'
                }`}
              >
                Delivery
              </button>
            </div>

            {/* Customer & Table Inputs with Loyalty Cashback Lookup */}
            <div className="space-y-2 relative">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="relative">
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      setShowCustomerDropdown(true);
                    }}
                    placeholder="Nome do Cliente"
                    className="w-full bg-[#181826] border border-[#28283C] focus:border-[#DA291C] rounded-xl px-3 py-2 text-xs text-white placeholder-[#71717A]"
                  />
                  {/* Autocomplete dropdown for registered customers */}
                  {showCustomerDropdown && matchingCustomers.length > 0 && (
                    <div className="absolute left-0 top-full mt-1 w-64 bg-[#14141E] border border-[#2E2E44] rounded-2xl p-2 shadow-2xl z-30 space-y-1">
                      <div className="text-[10px] text-[#71717A] uppercase font-bold px-2 py-1">
                        Clientes Cadastrados
                      </div>
                      {matchingCustomers.slice(0, 4).map(c => (
                        <div
                          key={c.id}
                          onClick={() => selectLoyaltyCustomer(c)}
                          className="p-2 rounded-xl hover:bg-[#1C1C2C] cursor-pointer flex items-center justify-between transition-colors"
                        >
                          <div>
                            <div className="font-bold text-white text-xs">{c.name}</div>
                            <div className="text-[10px] text-[#A1A1AA] font-mono">{c.phone}</div>
                          </div>
                          <div className="text-right font-mono font-bold text-[#FFC72C] text-xs">
                            {formatBRL(c.cashbackBalance || 0)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {orderType === 'dine_in' ? (
                  <input
                    type="number"
                    value={tableNumber || ''}
                    onChange={(e) => setTableNumber(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="Nº da Mesa"
                    className="w-full bg-[#181826] border border-[#28283C] focus:border-[#FFC72C] rounded-xl px-3 py-2 text-xs text-white placeholder-[#71717A]"
                  />
                ) : (
                  <div className="bg-[#181826] border border-[#28283C] rounded-xl px-3 py-2 text-xs text-[#FFC72C] font-bold flex items-center">
                    Balcão Imediato
                  </div>
                )}
              </div>

              {/* Customer Loyalty Banner if matched */}
              {selectedCustomer && (
                <div className="p-2.5 rounded-xl bg-[#FFC72C]/10 border border-[#FFC72C]/30 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#FFC72C] block">Cliente Fidelidade VIP</span>
                    <span className="text-white font-bold">{selectedCustomer.name}</span>
                    <span className="text-xs text-[#A1A1AA] block font-mono">
                      Saldo: <strong className="text-[#00E676]">{formatBRL(selectedCustomer.cashbackBalance || 0)}</strong>
                    </span>
                  </div>

                  {(selectedCustomer.cashbackBalance || 0) > 0 && discountAmount === 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const redeemVal = Math.min(10, selectedCustomer.cashbackBalance || 0);
                        setDiscountAmount(redeemVal);
                        playCashRegister();
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-[#FFC72C] hover:bg-[#FFE066] text-black font-black text-[11px] cursor-pointer shadow-sm"
                    >
                      Resgatar R$ 10
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Cart Items List */}
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              <AnimatePresence mode="popLayout">
                {cartItems.length === 0 ? (
                  <div className="py-10 text-center text-[#71717A]">
                    <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-30 text-[#FFC72C]" />
                    <p className="text-xs font-semibold text-[#A1A1AA]">Comanda Vazia</p>
                    <p className="text-[10px] mt-0.5">Clique em qualquer item no menu para lançar</p>
                  </div>
                ) : (
                  cartItems.map(item => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="p-3 rounded-2xl bg-[#161624] border border-[#242436] flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-extrabold text-white truncate">{item.productName}</div>
                          <div className="text-[11px] font-mono text-[#00E676] font-bold">{formatBRL(item.unitPrice)}</div>
                        </div>

                        {/* Quantity adjust buttons */}
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleUpdateQuantity(item.id, -1)}
                            className="w-6 h-6 rounded-lg bg-[#202030] hover:bg-[#DA291C] hover:text-white text-white flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center text-xs font-mono font-black text-[#FFC72C]">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleUpdateQuantity(item.id, 1)}
                            className="w-6 h-6 rounded-lg bg-[#202030] hover:bg-[#00E676] hover:text-black text-white flex items-center justify-center transition-colors cursor-pointer font-bold"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="text-right min-w-[65px] font-mono font-black text-xs text-white">
                          {formatBRL(item.totalPrice)}
                        </div>
                      </div>

                      {/* Notes / Customization row */}
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#202030]">
                        <span className="text-[#A1A1AA] italic truncate max-w-[200px]">
                          {item.notes ? `Obs: ${item.notes}` : 'Sem observações'}
                        </span>
                        <button
                          onClick={() => {
                            setEditingItemNoteId(item.id);
                            setTempItemNote(item.notes || '');
                          }}
                          className="text-[10px] text-[#FFC72C] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <FileEdit className="w-3 h-3" />
                          <span>Personalizar</span>
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>

            {/* Financial Summary & Checkout Button */}
            <div className="pt-3 border-t border-[#20202E] space-y-3">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-[#A1A1AA]">
                  <span>Subtotal dos itens</span>
                  <span className="font-mono text-white">{formatBRL(subtotal)}</span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#A1A1AA] flex items-center gap-1">
                    <span>Desconto (F4)</span>
                    <button 
                      onClick={() => setIsDiscountModalOpen(true)}
                      className="text-[10px] text-[#FFC72C] hover:underline cursor-pointer"
                    >
                      [Alterar]
                    </button>
                  </span>
                  <span className="font-mono font-bold text-[#00E676]">
                    {discountAmount > 0 ? `-${formatBRL(discountAmount)}` : 'R$ 0,00'}
                  </span>
                </div>

                <div className="flex justify-between text-base font-black text-white pt-2 border-t border-[#20202E]">
                  <span>Total a Pagar</span>
                  <span className="font-mono text-xl text-[#00E676]">{formatBRL(total)}</span>
                </div>
              </div>

              {/* Checkout Action Button */}
              <button
                disabled={cartItems.length === 0}
                onClick={() => setIsPaymentModalOpen(true)}
                className={`w-full py-3.5 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all ${
                  cartItems.length > 0
                    ? 'bg-gradient-to-r from-[#DA291C] to-[#E51A24] hover:from-[#B7180D] hover:to-[#DA291C] text-white shadow-[0_0_20px_rgba(218,41,28,0.55)] border border-[#FFC72C]/40 cursor-pointer active:scale-95'
                    : 'bg-[#181824] text-[#71717A] cursor-not-allowed'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-[#FFC72C]" />
                <span>FINALIZAR VENDA (F8)</span>
              </button>

              {/* Keyboard shortcuts reminder */}
              <div className="text-[10px] text-[#71717A] text-center font-mono flex items-center justify-center gap-3">
                <span>F2 Limpar</span>
                <span>•</span>
                <span>F4 Desconto</span>
                <span>•</span>
                <span>F7 Sangria</span>
                <span>•</span>
                <span>F8 Pagar</span>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Modal: Troca de Operador / Atendente */}
      <AnimatePresence>
        {isOperatorModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#14141E] border border-[#28283C] rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#222232]">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#00E676]/20 text-[#00E676]">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Operador do PDV</h3>
                    <p className="text-xs text-[#A1A1AA]">Selecione quem está operando o caixa no momento</p>
                  </div>
                </div>
                <button onClick={() => setIsOperatorModalOpen(false)} className="text-[#A1A1AA] hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {employees.map(emp => (
                  <div
                    key={emp.id}
                    onClick={() => {
                      setSelectedEmployeeId(emp.id);
                      setIsOperatorModalOpen(false);
                      playSoftClickSound();
                    }}
                    className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                      selectedEmployeeId === emp.id
                        ? 'bg-[#FFC72C]/15 border-[#FFC72C] text-white shadow-md'
                        : 'bg-[#181826] border-[#262638] text-[#A1A1AA] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img src={emp.avatarUrl} alt="" className="w-9 h-9 rounded-xl object-cover" />
                      <div>
                        <div className="font-bold text-sm text-white">{emp.name}</div>
                        <div className="text-[11px] text-[#A1A1AA]">{emp.roleTitle || emp.role}</div>
                      </div>
                    </div>
                    {selectedEmployeeId === emp.id && (
                      <span className="text-[10px] bg-[#FFC72C] text-black font-black px-2 py-0.5 rounded-full">
                        Ativo
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Sangria / Suprimento (F7) */}
      <AnimatePresence>
        {isCashFlowModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#14141E] border border-[#28283C] rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#222232]">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#FFC72C]/20 text-[#FFC72C]">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Movimentação de Caixa</h3>
                    <p className="text-xs text-[#A1A1AA]">Operador: {currentEmployee.name}</p>
                  </div>
                </div>
                <button onClick={() => setIsCashFlowModalOpen(false)} className="text-[#A1A1AA] hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Type Switcher: Sangria vs Suprimento */}
              <div className="grid grid-cols-2 gap-2 bg-[#181826] p-1 rounded-2xl border border-[#262638]">
                <button
                  type="button"
                  onClick={() => setCashFlowType('sangria')}
                  className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    cashFlowType === 'sangria'
                      ? 'bg-[#DA291C] text-white shadow-md font-black'
                      : 'text-[#A1A1AA] hover:text-white'
                  }`}
                >
                  <ArrowDownCircle className="w-4 h-4" />
                  <span>Sangria (Retirada)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCashFlowType('suprimento')}
                  className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    cashFlowType === 'suprimento'
                      ? 'bg-[#00E676] text-black shadow-md font-black'
                      : 'text-[#A1A1AA] hover:text-white'
                  }`}
                >
                  <ArrowUpCircle className="w-4 h-4" />
                  <span>Suprimento (Entrada)</span>
                </button>
              </div>

              <form onSubmit={handleCashFlowSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-[#A1A1AA] mb-1">Valor em Dinheiro (R$) *</label>
                  <input
                    type="number"
                    step="1.00"
                    min="1"
                    required
                    value={cashFlowAmount}
                    onChange={e => setCashFlowAmount(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#181826] border border-[#282838] rounded-xl px-4 py-3 text-white font-mono font-black text-xl text-[#00E676] focus:border-[#00E676] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-[#A1A1AA] mb-1">Motivo / Justificativa *</label>
                  <input
                    type="text"
                    required
                    placeholder={cashFlowType === 'sangria' ? 'Ex: Recolhimento para cofre central' : 'Ex: Fundo de troco para notas de R$ 5 e R$ 10'}
                    value={cashFlowReason}
                    onChange={e => setCashFlowReason(e.target.value)}
                    className="w-full bg-[#181826] border border-[#282838] rounded-xl px-3 py-2.5 text-white focus:border-[#FFC72C] focus:outline-none"
                  />
                </div>

                {cashFlowSuccess && (
                  <div className="p-3 bg-[#00E676]/20 border border-[#00E676] rounded-xl text-xs text-[#00E676] font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Movimentação registrada com sucesso no log de auditoria fiscal!</span>
                  </div>
                )}

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCashFlowModalOpen(false)}
                    className="flex-1 py-3 rounded-xl bg-[#1C1C28] text-white font-bold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#FFC72C] to-[#F59E0B] text-black font-black cursor-pointer hover:brightness-110 shadow-lg"
                  >
                    Confirmar {cashFlowType === 'sangria' ? 'Sangria' : 'Suprimento'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Aplicar Desconto (F4) */}
      <AnimatePresence>
        {isDiscountModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#14141E] border border-[#28283C] rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#222232]">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#00E676]/20 text-[#00E676]">
                    <Percent className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Desconto na Comanda</h3>
                    <p className="text-xs text-[#A1A1AA]">Aplique desconto em reais</p>
                  </div>
                </div>
                <button onClick={() => setIsDiscountModalOpen(false)} className="text-[#A1A1AA] hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-[#A1A1AA] mb-1">Valor do Desconto (R$)</label>
                  <input
                    type="number"
                    step="0.50"
                    min="0"
                    value={tempDiscount}
                    onChange={e => setTempDiscount(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#181826] border border-[#282838] rounded-xl px-4 py-3 text-white font-mono font-black text-xl text-[#00E676] focus:border-[#00E676] focus:outline-none"
                  />
                </div>

                <div className="flex gap-2">
                  {[2, 5, 10, 15].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setTempDiscount(val)}
                      className="flex-1 py-2 rounded-xl bg-[#181826] border border-[#282838] text-xs font-bold text-[#FFC72C] hover:bg-[#202034] cursor-pointer"
                    >
                      R$ {val}
                    </button>
                  ))}
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setDiscountAmount(0);
                      setIsDiscountModalOpen(false);
                    }}
                    className="flex-1 py-3 rounded-xl bg-[#1C1C28] text-[#DA291C] font-bold text-xs cursor-pointer"
                  >
                    Remover Desconto
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDiscountAmount(tempDiscount);
                      setIsDiscountModalOpen(false);
                      playSoftClickSound();
                    }}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#00E676] to-[#00C853] text-black font-black text-xs cursor-pointer shadow-lg"
                  >
                    Aplicar Desconto
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Observações Rápidas do Lanche */}
      <AnimatePresence>
        {editingItemNoteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#14141E] border border-[#28283C] rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#222232]">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#FFC72C]/20 text-[#FFC72C]">
                    <FileEdit className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Observação do Item</h3>
                    <p className="text-xs text-[#A1A1AA]">Instrução para a chapa e cozinha</p>
                  </div>
                </div>
                <button onClick={() => setEditingItemNoteId(null)} className="text-[#A1A1AA] hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Fast Presets */}
              <div className="flex flex-wrap gap-1.5">
                {['Sem Cebola', 'Sem Picles', 'Carne Bem Passada', 'Ao Ponto', 'Bacon Extra', 'Molho à Parte', 'Para Viagem'].map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setTempItemNote(prev => prev ? `${prev}, ${preset}` : preset);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#181826] border border-[#282838] text-[11px] font-bold text-[#A1A1AA] hover:text-white hover:border-[#FFC72C] cursor-pointer"
                  >
                    + {preset}
                  </button>
                ))}
              </div>

              <div>
                <textarea
                  rows={3}
                  value={tempItemNote}
                  onChange={e => setTempItemNote(e.target.value)}
                  placeholder="Escreva como o cliente prefere o preparo..."
                  className="w-full bg-[#181826] border border-[#282838] rounded-xl p-3 text-xs text-white focus:border-[#FFC72C] focus:outline-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingItemNoteId(null)}
                  className="flex-1 py-2.5 rounded-xl bg-[#1C1C28] text-white font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCartItems(prev => prev.map(item => item.id === editingItemNoteId ? { ...item, notes: tempItemNote } : item));
                    setEditingItemNoteId(null);
                    playSoftClickSound();
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-[#FFC72C] text-black font-black text-xs cursor-pointer shadow-lg"
                >
                  Salvar Observação
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Payment Modal: Checkout McDonald's Style */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#12121A] border border-[#2A2A3E] rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#20202E]">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Flame className="w-4 h-4 text-[#DA291C]" />
                  <span>Forma de Pagamento (F8)</span>
                </h3>
                <p className="text-xs text-[#71717A]">Operador: {currentEmployee.name}</p>
              </div>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-[#71717A] hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center py-3 bg-[#161624] rounded-2xl border border-[#252538] shadow-inner">
              <span className="text-xs font-bold text-[#A1A1AA]">Valor Total da Venda</span>
              <div className="text-3xl font-black font-mono text-[#00E676] mt-0.5">{formatBRL(total)}</div>
            </div>

            {/* Payment options grid */}
            <div className="grid grid-cols-3 gap-2.5">
              {/* PIX */}
              <button
                onClick={() => setPaymentMethod('pix')}
                className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
                  paymentMethod === 'pix' 
                    ? 'bg-[#00E676]/20 border-[#00E676] text-white shadow-[0_0_15px_rgba(0,230,118,0.4)]' 
                    : 'bg-[#161622] border-[#252536] text-[#A1A1AA] hover:border-[#00E676]/40'
                }`}
              >
                <QrCode className="w-6 h-6 mx-auto mb-1 text-[#00E676]" />
                <span className="text-xs font-black block">PIX Dinâmico</span>
              </button>

              {/* Cartão */}
              <button
                onClick={() => setPaymentMethod('credit_card')}
                className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
                  paymentMethod === 'credit_card' 
                    ? 'bg-[#00D2FF]/20 border-[#00D2FF] text-white shadow-[0_0_15px_rgba(0,210,255,0.4)]' 
                    : 'bg-[#161622] border-[#252536] text-[#A1A1AA] hover:border-[#00D2FF]/40'
                }`}
              >
                <CreditCard className="w-6 h-6 mx-auto mb-1 text-[#00D2FF]" />
                <span className="text-xs font-black block">Cartão</span>
              </button>

              {/* Dinheiro */}
              <button
                onClick={() => setPaymentMethod('cash')}
                className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
                  paymentMethod === 'cash' 
                    ? 'bg-[#FFC72C]/20 border-[#FFC72C] text-white shadow-[0_0_15px_rgba(255,199,44,0.4)]' 
                    : 'bg-[#161622] border-[#252536] text-[#A1A1AA] hover:border-[#FFC72C]/40'
                }`}
              >
                <Banknote className="w-6 h-6 mx-auto mb-1 text-[#FFC72C]" />
                <span className="text-xs font-black block">Dinheiro</span>
              </button>
            </div>

            {/* PIX Dinâmico QR Code & Gateway Box */}
            {paymentMethod === 'pix' && (
              <div className="p-4 rounded-2xl bg-[#12121D] border border-[#00E676]/40 shadow-inner space-y-3.5">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-[#252538]">
                  <div className="flex items-center gap-1.5 text-[#00E676] font-bold">
                    <span className="w-2 h-2 rounded-full bg-[#00E676] animate-ping" />
                    <span>QR Code Pix Dinâmico Instantâneo</span>
                  </div>
                  <span className="font-mono text-zinc-400 text-[11px]">TxID: {pixTxId}</span>
                </div>

                {/* QR Code Container */}
                <div className="text-center">
                  <div className="relative inline-block p-3 rounded-2xl bg-white shadow-xl mx-auto">
                    {dynamicPixQrCodeUrl ? (
                      <img
                        src={dynamicPixQrCodeUrl}
                        alt="QR Code Pix Dinâmico"
                        className="w-36 h-36 sm:w-40 sm:h-40 object-contain mx-auto"
                      />
                    ) : (
                      <div className="w-36 h-36 flex items-center justify-center text-zinc-400 text-xs">
                        Gerando QR Code Pix...
                      </div>
                    )}
                    <div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full bg-[#00E676] text-black font-black text-[9px] shadow font-mono">
                      PIX BACEN
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-300 font-semibold mt-2">
                    Aponte a câmera do aplicativo bancário para efetuar o pagamento
                  </p>
                </div>

                {/* Pix Copia e Cola & Terminal Fullscreen */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleCopyPixPayload}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      pixCopied
                        ? 'bg-emerald-950 border-emerald-500 text-emerald-300 shadow-sm'
                        : 'bg-[#181826] hover:bg-[#222234] border-[#2E2E44] text-white'
                    }`}
                  >
                    {pixCopied ? <Check className="w-3.5 h-3.5 text-[#00E676]" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
                    <span>{pixCopied ? 'Pix Copiado!' : 'Copiar Código Pix'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsPaymentModalOpen(false);
                      setIsGatewayModalOpen(true);
                      playSoftClickSound();
                    }}
                    className="py-2 px-3 rounded-xl bg-[#181826] hover:bg-[#222234] border border-[#2E2E44] text-zinc-300 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    title="Abrir no Terminal Interativo de Gateway com Tela Cheia para o Cliente"
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-[#FFC72C]" />
                    <span>Terminal Gateway</span>
                  </button>
                </div>

                {/* Live Webhook Status & Instant Simulation Button */}
                <div className="p-2.5 rounded-xl bg-emerald-950/20 border border-[#00E676]/30 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#00E676] animate-ping shrink-0" />
                    <span className="text-zinc-300 text-[11px]">
                      Aguardando baixa via Webhook (API D+0)...
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={isSimulatingWebhook}
                    onClick={handleSimulatePixWebhook}
                    className="w-full sm:w-auto py-1.5 px-3 bg-[#00E676] hover:bg-[#00C853] text-black font-black rounded-lg text-[11px] transition-all flex items-center justify-center gap-1 shadow cursor-pointer disabled:opacity-50"
                  >
                    <Zap className="w-3 h-3 fill-current" />
                    <span>{isSimulatingWebhook ? 'Processando...' : '⚡ Baixa Automática Webhook'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Cash change inputs if cash */}
            {paymentMethod === 'cash' && (
              <div className="space-y-2 p-3.5 rounded-2xl bg-[#161622] border border-[#28283C]">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#A1A1AA] font-bold">Valor em Dinheiro Recebido (R$)</span>
                  <input
                    type="number"
                    value={cashGiven || ''}
                    onChange={(e) => setCashGiven(Number(e.target.value))}
                    placeholder="0.00"
                    className="w-28 text-right bg-[#1C1C2A] border border-[#303046] focus:border-[#FFC72C] rounded-xl px-3 py-1.5 text-white font-mono font-bold text-xs"
                  />
                </div>
                {cashGiven > total && (
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-[#252538]">
                    <span className="text-[#00E676] font-black">Troco a Devolver</span>
                    <span className="font-mono font-black text-[#00E676] text-sm">{formatBRL(changeDue)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Confirm button */}
            <button
              onClick={handleFinalizeSale}
              className="w-full py-3.5 bg-gradient-to-r from-[#00E676] to-[#10B981] hover:from-[#00C853] hover:to-[#00E676] text-[#0B0B0F] font-black text-xs rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,230,118,0.4)] active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>CONFIRMAR VENDA & IMPRIMIR NA COZINHA</span>
            </button>
          </div>
        </div>
      )}

      {/* Payment Gateway Modal (Terminal Completo) */}
      <PaymentGatewayModal
        isOpen={isGatewayModalOpen}
        onClose={() => setIsGatewayModalOpen(false)}
        orderPayload={{
          customerName: customerName || 'Cliente Balcão',
          customerPhone,
          tableNumber: orderType === 'dine_in' ? tableNumber : undefined,
          items: cartItems,
          subtotal,
          deliveryFee: 0,
          serviceFee: 0,
          total,
          orderChannel: orderType === 'dine_in' ? 'mesa' : 'pdv_balcao',
        }}
        initialMethod="pix"
        onPaymentSuccess={(newOrder) => {
          setLastCreatedOrder(newOrder);
          setIsGatewayModalOpen(false);
          setIsPaymentModalOpen(false);
          setIsSuccessModalOpen(true);
          handleClearCart();
        }}
      />

      {/* Sale Success Modal */}
      {isSuccessModalOpen && lastCreatedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#12121A] border border-[#2A2A3E] rounded-3xl w-full max-w-sm p-6 text-center shadow-2xl space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/40 flex items-center justify-center mx-auto shadow-[0_0_15px_rgba(0,230,118,0.3)]">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-black text-white">Venda Concluída com Sucesso!</h3>
              <p className="text-xs text-[#A1A1AA] mt-0.5">Pedido {lastCreatedOrder.displayCode} enviado para a chapa e KDS</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#161624] border border-[#252538] text-xs font-mono text-left space-y-1.5">
              <div className="flex justify-between text-[#71717A]">
                <span>Código do Pedido:</span>
                <span className="text-[#FFC72C] font-black">{lastCreatedOrder.displayCode}</span>
              </div>
              <div className="flex justify-between text-[#71717A]">
                <span>Valor Total:</span>
                <span className="text-[#00E676] font-black">{formatBRL(lastCreatedOrder.total)}</span>
              </div>
              <div className="flex justify-between text-[#71717A]">
                <span>Canal / Destino:</span>
                <span className="text-white capitalize font-semibold">{lastCreatedOrder.channel}</span>
              </div>
              <div className="pt-1.5 border-t border-[#252538] flex items-center justify-between text-[11px] text-sky-400 font-sans font-bold">
                <span className="flex items-center gap-1.5">
                  <Printer className="w-3.5 h-3.5" />
                  Auto-Print ESC/POS:
                </span>
                <span className="text-emerald-400">Despachado Cozinha / Cupom</span>
              </div>
            </div>

            {/* WhatsApp receipt & cardapio share */}
            <button
              onClick={() => {
                const domain = tenant?.settings?.menuCustomDomain || 'https://neonfood.app/cardapio';
                const slug = tenant?.settings?.menuCustomSlug || 'lanchonete-dulci';
                const link = `${domain}?loja=${slug}`;
                const msg = encodeURIComponent(`🎉 *Comprovante - ${tenant?.name || 'Lanchonete Dulci'}*\n\nSeu pedido *#${lastCreatedOrder.displayCode}* no valor de *${formatBRL(lastCreatedOrder.total)}* foi confirmado!\n\n🍽️ Acesse nosso cardápio digital:\n👉 ${link}\n\nObrigado pela preferência!`);
                window.open(`https://wa.me/?text=${msg}`, '_blank');
              }}
              className="w-full py-2.5 bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] border border-[#25D366]/40 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Enviar Recibo e Cardápio (wa.me)</span>
            </button>

            <div className="flex gap-2.5">
              <button
                onClick={() => {
                  setPrintOrder(lastCreatedOrder);
                  setIsSuccessModalOpen(false);
                }}
                className="flex-1 py-3 bg-[#181826] hover:bg-[#202032] text-white border border-[#2E2E44] text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5 text-[#00E676]" />
                <span>Imprimir</span>
              </button>

              <button
                onClick={() => setIsSuccessModalOpen(false)}
                className="flex-1 py-3 bg-gradient-to-r from-[#DA291C] to-[#E51A24] hover:from-[#B7180D] hover:to-[#DA291C] text-white text-xs font-black rounded-xl transition-all cursor-pointer shadow-[0_0_15px_rgba(218,41,28,0.4)]"
              >
                Novo Pedido (F2)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Compartilhar Cardápio */}
      <CompartilharCardapioModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        initialTable={modalInitialTable}
        initialCustomerName={modalCustomerName}
      />
    </div>
  );
};
