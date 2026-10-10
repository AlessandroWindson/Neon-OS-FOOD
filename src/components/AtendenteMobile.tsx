import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Smartphone,
  Tablet,
  Search,
  Plus,
  Minus,
  Trash2,
  CookingPot,
  CheckCircle2,
  Users,
  UtensilsCrossed,
  Sparkles,
  Flame,
  Clock,
  Printer,
  X,
  ChefHat,
  Tag,
  AlertCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Product, OrderItem, ProductCategory } from '../types';
import { formatBRL } from '../utils/formatters';
import { playBeep, playCashRegister, playKitchenBell } from '../utils/audio';
import { thermalPrinterService } from '../services/escposService';

export const AtendenteMobile: React.FC = () => {
  const { products, categories, createOrder, tables, updateTableStatus, setPrintOrder, currentUser } = useApp();

  // Atendente & Order Type Selection (Mesa, Balcão, Para Viagem, Retirada, Delivery)
  type AtendenteOrderType = 'mesa' | 'balcao' | 'viagem' | 'retirada' | 'delivery';
  const [atendenteName, setAtendenteName] = useState<string>(() => currentUser?.name || 'Atendente');
  const [selectedTableNumber, setSelectedTableNumber] = useState<number>(4);
  const [customerGuests, setCustomerGuests] = useState<number>(2);
  const [orderType, setOrderType] = useState<AtendenteOrderType>('mesa');
  const [customerNameInput, setCustomerNameInput] = useState<string>('');
  const [customerPhoneInput, setCustomerPhoneInput] = useState<string>('');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategoryId, setActiveCategoryId] = useState<string>('all');

  // Cart / Comanda State
  const [cartItems, setCartItems] = useState<OrderItem[]>([]);
  const [isCustomizing, setIsCustomizing] = useState<Product | null>(null);
  const [customQuantity, setCustomQuantity] = useState<number>(1);
  const [customNotes, setCustomNotes] = useState<string>('');
  const [selectedPriceVariantIndex, setSelectedPriceVariantIndex] = useState<number>(0);
  const [extraBacon, setExtraBacon] = useState<boolean>(false);
  const [extraCheese, setExtraCheese] = useState<boolean>(false);
  const [noOnion, setNoOnion] = useState<boolean>(false);

  // Success Feedback
  const [sentSuccessOrder, setSentSuccessOrder] = useState<{ table: number | string; total: number; orderNum: number } | null>(null);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      if (activeCategoryId !== 'all' && prod.category !== activeCategoryId) {
        return false;
      }
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchesName = prod.name.toLowerCase().includes(q);
        const matchesDesc = prod.description.toLowerCase().includes(q);
        const matchesNum = prod.itemNumber ? String(prod.itemNumber).includes(q) : false;
        return matchesName || matchesDesc || matchesNum;
      }
      return true;
    });
  }, [products, activeCategoryId, searchQuery]);

  // Cart Totals
  const cartSubtotal = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.totalPrice, 0);
  }, [cartItems]);

  const serviceTax = useMemo(() => {
    return cartSubtotal * 0.10; // 10% de atendimento
  }, [cartSubtotal]);

  const cartTotal = cartSubtotal + serviceTax;

  // Quick Add Item
  const handleQuickAdd = (product: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    playBeep(850, 0.03);

    const unitPrice = product.priceVariants && product.priceVariants.length > 0
      ? product.priceVariants[0].price
      : product.price;

    const existingIdx = cartItems.findIndex(
      (item) => item.productId === product.id && (!item.notes || item.notes === '')
    );

    if (existingIdx >= 0) {
      setCartItems((prev) => {
        const copy = [...prev];
        copy[existingIdx].quantity += 1;
        copy[existingIdx].totalPrice = copy[existingIdx].quantity * copy[existingIdx].unitPrice;
        return copy;
      });
    } else {
      const newItem: OrderItem = {
        id: `atend_item_${Date.now()}_${Math.random()}`,
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice: unitPrice,
        totalPrice: unitPrice,
        notes: '',
        station: product.station,
        status: 'pending',
      };
      setCartItems((prev) => [...prev, newItem]);
    }
  };

  // Open Customize Modal
  const handleOpenCustomize = (product: Product) => {
    playBeep(750, 0.04);
    setIsCustomizing(product);
    setCustomQuantity(1);
    setCustomNotes('');
    setSelectedPriceVariantIndex(0);
    setExtraBacon(false);
    setExtraCheese(false);
    setNoOnion(false);
  };

  // Confirm Customized Item Add
  const handleConfirmCustomize = () => {
    if (!isCustomizing) return;
    playCashRegister();

    let basePrice = isCustomizing.price;
    let variantLabel = '';

    if (isCustomizing.priceVariants && isCustomizing.priceVariants.length > 0) {
      const variant = isCustomizing.priceVariants[selectedPriceVariantIndex];
      if (variant) {
        basePrice = variant.price;
        variantLabel = `[${variant.label}] `;
      }
    }

    let extraSum = 0;
    const notesArr: string[] = [];
    if (customNotes.trim()) notesArr.push(customNotes.trim());
    if (extraBacon) {
      extraSum += 5.0;
      notesArr.push('+ BACON EXTRA');
    }
    if (extraCheese) {
      extraSum += 4.5;
      notesArr.push('+ QUEIJO EXTRA');
    }
    if (noOnion) {
      notesArr.push('SEM CEBOLA');
    }

    const unitPrice = basePrice + extraSum;
    const finalName = `${variantLabel}${isCustomizing.name}`;

    const newItem: OrderItem = {
      id: `atend_item_${Date.now()}_${Math.random()}`,
      productId: isCustomizing.id,
      productName: finalName,
      quantity: customQuantity,
      unitPrice: unitPrice,
      totalPrice: unitPrice * customQuantity,
      notes: notesArr.join(', '),
      station: isCustomizing.station,
      status: 'pending',
    };

    setCartItems((prev) => [...prev, newItem]);
    setIsCustomizing(null);
  };

  // Update Cart Quantity
  const handleUpdateQty = (itemId: string, delta: number) => {
    playBeep(650, 0.03);
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.id === itemId) {
            const newQ = item.quantity + delta;
            return newQ > 0 ? { ...item, quantity: newQ, totalPrice: newQ * item.unitPrice } : null;
          }
          return item;
        })
        .filter(Boolean) as OrderItem[]
    );
  };

  // Dispatch Order to Kitchen KDS
  const handleDispatchOrder = () => {
    if (cartItems.length === 0) return;

    playKitchenBell();
    const orderNum = Math.floor(100 + Math.random() * 899);

    let channel: 'atendente_mesa' | 'pdv_balcao' | 'delivery_web' = 'atendente_mesa';
    let typeLabel = `Mesa ${selectedTableNumber}`;

    if (orderType === 'mesa') {
      channel = 'atendente_mesa';
      typeLabel = `Mesa ${selectedTableNumber}`;
    } else if (orderType === 'balcao') {
      channel = 'pdv_balcao';
      typeLabel = 'Balcão';
    } else if (orderType === 'viagem') {
      channel = 'pdv_balcao';
      typeLabel = 'Para Viagem';
    } else if (orderType === 'retirada') {
      channel = 'pdv_balcao';
      typeLabel = 'Retirada';
    } else if (orderType === 'delivery') {
      channel = 'delivery_web';
      typeLabel = 'Delivery';
    }

    const customerDisplay = customerNameInput.trim() 
      ? `${customerNameInput.trim()} (${typeLabel})` 
      : `${atendenteName} • ${typeLabel}`;

    const orderData = {
      channel,
      customerName: customerDisplay,
      customerPhone: customerPhoneInput.trim() || undefined,
      tableNumber: orderType === 'mesa' ? selectedTableNumber : undefined,
      items: cartItems,
      subtotal: cartSubtotal,
      discount: 0,
      deliveryFee: orderType === 'delivery' ? 5.0 : 0,
      serviceFee: orderType === 'mesa' ? serviceTax : 0,
      total: orderType === 'mesa' ? cartTotal : (cartSubtotal + (orderType === 'delivery' ? 5.0 : 0)),
      paymentMethod: 'pix' as const,
      paymentStatus: 'pending' as const,
      status: 'recebido' as const,
    };

    createOrder(orderData);

    // Auto-dispatch ESC/POS directly to the kitchen printer
    thermalPrinterService.dispatchKitchenOrder({
      id: `ord_${Date.now()}`,
      displayCode: `#${orderNum}`,
      ...orderData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Update table visual status to occupied
    if (orderType === 'mesa') {
      const targetTable = tables.find((t) => t.number === selectedTableNumber);
      if (targetTable) {
        updateTableStatus(targetTable.id, 'occupied', cartTotal, customerGuests);
      }
    }

    // Set success modal info
    setSentSuccessOrder({
      table: typeLabel,
      total: orderData.total,
      orderNum: orderNum,
    });

    // Clear cart and customer inputs for next table order
    setCartItems([]);
    setCustomerNameInput('');
    setCustomerPhoneInput('');
  };

  return (
    <div className="min-h-screen bg-[#0A0A0E] text-zinc-100 font-sans pb-28 md:pb-12">
      {/* 1. TOP ATENDENTE HEADER (OPTIMIZED FOR PHONES & TABLETS) */}
      <div className="sticky top-0 z-40 bg-[#121118]/95 backdrop-blur-md border-b border-zinc-800 shadow-xl px-4 py-3">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Brand & Mode */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#DA291C] to-[#FFC72C] flex items-center justify-center text-black shadow-lg shadow-red-950/40">
              <Smartphone className="w-5 h-5 font-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Atendimento Móvel
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Celular & Tablet
                </span>
              </div>
              <p className="text-xs text-zinc-400">Lançamento rápido de pedidos de salão direto para a Cozinha</p>
            </div>
          </div>

          {/* Atendente Name & Dining Mode Toggle */}
          <div className="flex items-center gap-2 text-xs">
            {/* Select Atendente */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1.5 flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-[#FFC72C]" />
              <select
                value={atendenteName}
                onChange={(e) => setAtendenteName(e.target.value)}
                className="bg-transparent text-white font-bold outline-none cursor-pointer"
              >
                <option value={currentUser?.name || 'Atendente'} className="bg-zinc-900">{currentUser?.name || 'Atendente'} (Você)</option>
                <option value="Atendente Salão" className="bg-zinc-900">Atendente Salão</option>
                <option value="Atendente Balcão" className="bg-zinc-900">Atendente Balcão</option>
                <option value="Atendente Bar" className="bg-zinc-900">Atendente Bar</option>
              </select>
            </div>

            {/* 5 Botões Grandes de Tipos de Pedido para Atendente */}
            <div className="flex flex-wrap items-center bg-zinc-900 border border-zinc-800 rounded-xl p-1 gap-1">
              <button
                type="button"
                onClick={() => {
                  playBeep();
                  setOrderType('mesa');
                }}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                  orderType === 'mesa'
                    ? 'bg-[#DA291C] text-white shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span>🍽️ Mesa</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  playBeep();
                  setOrderType('balcao');
                }}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                  orderType === 'balcao'
                    ? 'bg-[#DA291C] text-white shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span>🏪 Balcão</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  playBeep();
                  setOrderType('viagem');
                }}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                  orderType === 'viagem'
                    ? 'bg-[#DA291C] text-white shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span>🛍️ Para Viagem</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  playBeep();
                  setOrderType('retirada');
                }}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                  orderType === 'retirada'
                    ? 'bg-[#DA291C] text-white shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span>📦 Retirada</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  playBeep();
                  setOrderType('delivery');
                }}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                  orderType === 'delivery'
                    ? 'bg-[#DA291C] text-white shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span>🛵 Delivery</span>
              </button>
            </div>
          </div>
        </div>

        {/* Customer Name & Phone Input for Non-Mesa channels */}
        {orderType !== 'mesa' && (
          <div className="max-w-6xl mx-auto mt-3 pt-3 border-t border-zinc-800/80 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-[#FFC72C] flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              Identificação do Cliente:
            </span>
            <input
              type="text"
              placeholder="Nome do cliente (ex: Carlos Silva)..."
              value={customerNameInput}
              onChange={(e) => setCustomerNameInput(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-[#FFC72C] outline-none w-56"
            />
            <input
              type="tel"
              placeholder="WhatsApp / Telefone..."
              value={customerPhoneInput}
              onChange={(e) => setCustomerPhoneInput(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-[#FFC72C] outline-none w-44"
            />
          </div>
        )}

        {/* Quick Table Grid Picker (When in Mesa mode) */}
        {orderType === 'mesa' && (
          <div className="max-w-6xl mx-auto mt-3 pt-3 border-t border-zinc-800/80 flex items-center gap-2 overflow-x-auto scrollbar-none">
            <span className="text-xs font-bold text-zinc-400 whitespace-nowrap flex items-center gap-1">
              <UtensilsCrossed className="w-3.5 h-3.5 text-[#FFC72C]" />
              Mesa:
            </span>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16, 18, 20].map((num) => {
              const isSelected = selectedTableNumber === num;
              const tableObj = tables.find((t) => t.number === num);
              const isOccupied = tableObj && tableObj.status === 'occupied';

              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    playBeep(800, 0.02);
                    setSelectedTableNumber(num);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-mono text-xs font-black shrink-0 transition-all border ${
                    isSelected
                      ? 'bg-[#FFC72C] text-black border-[#FFC72C] shadow-md shadow-amber-500/20 scale-105'
                      : isOccupied
                      ? 'bg-amber-950/40 text-amber-300 border-amber-800/60'
                      : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  M{num < 10 ? `0${num}` : num}
                  {isOccupied && <span className="ml-1 text-[9px] text-amber-400">●</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. MAIN WORKSPACE: SEARCH + CATEGORIES + PRODUCTS + COMANDA DRAWER */}
      <div className="max-w-6xl mx-auto px-4 py-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT 2 COLS: CATALOG & SEARCH */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search bar & quick filter */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por lanche, pizza, açaí ou nº..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-900/90 border border-zinc-800 rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:border-[#FFC72C] outline-none shadow-inner"
            />
          </div>

          {/* Categories Pill Bar */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
            <button
              type="button"
              onClick={() => {
                playBeep();
                setActiveCategoryId('all');
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                activeCategoryId === 'all'
                  ? 'bg-[#DA291C] text-white border-[#DA291C] shadow-md'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
              }`}
            >
              Todos ({products.length})
            </button>

            {categories.map((cat) => {
              const count = products.filter((p) => p.category === cat.id).length;
              const isActive = activeCategoryId === cat.id;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    playBeep();
                    setActiveCategoryId(cat.id);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-[#DA291C] text-white border-[#DA291C] shadow-md'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                  }`}
                >
                  <span>{cat.name}</span>
                  <span className="text-[10px] opacity-70">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Products List (Phone & Tablet Friendly List Cards) */}
          <div className="space-y-3">
            {filteredProducts.map((product) => {
              const hasVariants = product.priceVariants && product.priceVariants.length > 0;
              const displayPrice = hasVariants ? product.priceVariants![0].price : product.price;

              return (
                <motion.div
                  key={product.id}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => handleOpenCustomize(product)}
                  className="bg-[#111117] hover:bg-[#161622] border border-zinc-800/90 hover:border-[#FFC72C]/50 rounded-2xl p-3 flex items-center gap-3.5 cursor-pointer transition-all shadow-md"
                >
                  {/* Thumbnail Image with # Badge */}
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-zinc-900 shrink-0 border border-zinc-800">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {product.itemNumber && (
                      <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-[#DA291C] text-white font-black text-[10px] font-mono shadow">
                        #{product.itemNumber}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-sm sm:text-base text-white truncate">
                      {product.name}
                    </h3>
                    <p className="text-xs text-zinc-400 line-clamp-2 mt-0.5 leading-relaxed">
                      {product.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-sm font-black text-[#FFC72C]">
                        {formatBRL(displayPrice)}
                      </span>
                      {hasVariants && (
                        <span className="text-[10px] text-zinc-400 font-mono">
                          (P • M • G)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleQuickAdd(product, e)}
                      className="px-3 py-2 bg-[#DA291C] hover:bg-[#FFC72C] hover:text-black text-white font-black text-xs rounded-xl transition-all shadow flex items-center justify-center gap-1"
                      title="Adicionar direto"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="hidden sm:inline">Adicionar</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenCustomize(product);
                      }}
                      className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold rounded-lg transition-all text-center"
                    >
                      Opções
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COL: CURRENT TABLE COMANDA / LIVE ORDER BASKET */}
        <div className="lg:col-span-1">
          <div className="sticky top-28 bg-[#121118] border border-zinc-800 rounded-3xl p-4 sm:p-5 shadow-2xl space-y-4">
            {/* Comanda Header */}
            <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <UtensilsCrossed className="w-4 h-4 text-[#FFC72C]" />
                  <h3 className="font-black text-base text-white">
                    {orderType === 'mesa' ? `Comanda Mesa ${selectedTableNumber}` : 'Comanda Balcão'}
                  </h3>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Atendente: <strong className="text-white">{atendenteName}</strong>
                </p>
              </div>

              {cartItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCartItems([])}
                  className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors"
                  title="Limpar comanda"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Items List */}
            <div className="space-y-2.5 max-h-72 overflow-y-auto scrollbar-thin pr-1">
              {cartItems.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 space-y-2">
                  <CookingPot className="w-10 h-10 mx-auto text-zinc-700" />
                  <p className="text-xs font-semibold">Nenhum item na comanda ainda</p>
                  <p className="text-[11px]">Toque em um item ao lado para adicionar ao pedido da mesa.</p>
                </div>
              ) : (
                cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 bg-zinc-900/90 rounded-xl border border-zinc-800 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-white truncate">{item.productName}</p>
                      {item.notes && (
                        <p className="text-[10px] text-amber-400 italic truncate">{item.notes}</p>
                      )}
                      <p className="font-bold text-[#FFC72C] mt-0.5">{formatBRL(item.totalPrice)}</p>
                    </div>

                    <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.id, -1)}
                        className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center text-white"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-5 text-center font-mono font-bold text-xs">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.id, 1)}
                        className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center text-white"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Totals & Dispatch */}
            {cartItems.length > 0 && (
              <div className="border-t border-zinc-800 pt-3 space-y-3">
                <div className="space-y-1 text-xs text-zinc-400">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatBRL(cartSubtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Taxa de Atendimento (10%)</span>
                    <span>{formatBRL(serviceTax)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-white pt-1 border-t border-zinc-800">
                    <span>Total da Mesa</span>
                    <span className="text-[#FFC72C]">{formatBRL(cartTotal)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDispatchOrder}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-[#DA291C] to-[#B81F14] hover:brightness-110 active:scale-95 text-white font-black text-sm rounded-xl transition-all shadow-lg shadow-red-950/40 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CookingPot className="w-5 h-5 text-[#FFC72C]" />
                  <span>Enviar Pedido para a Cozinha</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. MODAL: PRODUCT CUSTOMIZATION */}
      <AnimatePresence>
        {isCustomizing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#121118] border border-zinc-800 w-full max-w-md rounded-3xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-start justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-3">
                  <img
                    src={isCustomizing.imageUrl}
                    alt={isCustomizing.name}
                    className="w-12 h-12 rounded-xl object-cover border border-zinc-700"
                  />
                  <div>
                    <h3 className="font-black text-base text-white">{isCustomizing.name}</h3>
                    <p className="text-xs text-zinc-400">Personalizar para a comanda</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCustomizing(null)}
                  className="p-1 text-zinc-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Price Variants (if pizza or sized item) */}
              {isCustomizing.priceVariants && isCustomizing.priceVariants.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">Escolha o Tamanho:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {isCustomizing.priceVariants.map((variant, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedPriceVariantIndex(idx)}
                        className={`p-2 rounded-xl text-xs font-bold border transition-all ${
                          selectedPriceVariantIndex === idx
                            ? 'bg-[#DA291C] text-white border-[#FFC72C]'
                            : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <div>{variant.label}</div>
                        <div className="text-[11px] text-[#FFC72C] font-mono">{formatBRL(variant.price)}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Modifiers */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300">Adicionais e Modificadores:</label>
                <div className="space-y-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setExtraBacon((v) => !v)}
                    className={`w-full p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                      extraBacon
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <span>+ Bacon Crocante Extra</span>
                    <span>+ R$ 5,00</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExtraCheese((v) => !v)}
                    className={`w-full p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                      extraCheese
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <span>+ Queijo Cheddar / Catupiry Extra</span>
                    <span>+ R$ 4,50</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNoOnion((v) => !v)}
                    className={`w-full p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                      noOnion
                        ? 'bg-red-500/20 border-red-500 text-red-300 font-bold'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <span>Sem Cebola</span>
                    <span>Modificador</span>
                  </button>
                </div>
              </div>

              {/* Special Notes */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300">Observação da Cozinha:</label>
                <input
                  type="text"
                  placeholder="Ex: carne bem passada, sem molho..."
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 outline-none focus:border-[#FFC72C]"
                />
              </div>

              {/* Quantity and Confirm */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => setCustomQuantity((q) => Math.max(1, q - 1))}
                    className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-white"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-6 text-center font-mono font-bold text-xs">{customQuantity}</span>
                  <button
                    type="button"
                    onClick={() => setCustomQuantity((q) => q + 1)}
                    className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-white"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleConfirmCustomize}
                  className="flex-1 py-3 px-4 bg-[#DA291C] hover:bg-[#FFC72C] hover:text-black text-white font-black text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Adicionar à Comanda</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. MODAL: SUCCESS DISPATCH CONFIRMATION */}
      <AnimatePresence>
        {sentSuccessOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#121118] border border-emerald-500/40 w-full max-w-sm rounded-3xl p-6 text-center shadow-[0_0_40px_rgba(16,185,129,0.2)] space-y-4"
            >
              <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/40">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h3 className="text-xl font-black text-white">Pedido Enviado com Sucesso!</h3>
                <p className="text-xs text-zinc-300 mt-1">
                  Enviado para a equipe da cozinha em nome de <strong className="text-emerald-400">{sentSuccessOrder.table}</strong>.
                </p>
                <div className="mt-3 p-3 bg-zinc-900 rounded-xl border border-zinc-800 text-xs font-mono">
                  <div className="text-zinc-400">Senha / Comanda #{sentSuccessOrder.orderNum}</div>
                  <div className="text-base font-black text-[#FFC72C] mt-0.5">{formatBRL(sentSuccessOrder.total)}</div>
                </div>

                <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-[#00E676] font-bold">
                  <Printer className="w-3.5 h-3.5" />
                  <span>Comanda enviada à Cozinha (ESC/POS)</span>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    playKitchenBell();
                    thermalPrinterService.dispatchKitchenComanda({
                      code: `#${sentSuccessOrder.orderNum}`,
                      customerName: sentSuccessOrder.table,
                      openedAt: new Date().toLocaleTimeString('pt-BR'),
                      items: [],
                    });
                  }}
                  className="w-full py-2.5 bg-[#1C1C2A] hover:bg-[#252538] text-[#FFC72C] font-bold text-xs rounded-xl transition-all border border-[#35354A] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Reimprimir Comanda na Cozinha</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSentSuccessOrder(null)}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Continuar Atendimento
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
