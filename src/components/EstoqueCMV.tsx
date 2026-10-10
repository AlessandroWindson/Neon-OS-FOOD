import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Boxes, 
  Plus, 
  Search, 
  Sparkles, 
  DollarSign, 
  Trash2, 
  Edit3, 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  Copy, 
  MessageSquare, 
  ArrowUpDown,
  Calculator,
  Percent,
  Check,
  PackagePlus,
  Minus,
  RotateCcw,
  SlidersHorizontal,
  Download
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '../context/AppContext';
import { Ingredient } from '../types';
import { formatBRL } from '../utils/formatters';
import { playBeep, playCashRegister, playSoftClickSound } from '../utils/audio';

export const EstoqueCMV: React.FC = () => {
  const { 
    ingredients = [], 
    addIngredient, 
    updateIngredient,
    deleteIngredient, 
    updateStock, 
    clearAllIngredients,
    registerPurchase,
    tenant,
    currentBranch,
    openExportModal
  } = useApp();

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'critical' | 'ok'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'cost' | 'total'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Modal states
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isAIPurchaseModalOpen, setIsAIPurchaseModalOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);

  // Registration & Edit Form States
  const [formName, setFormName] = useState('');
  const [formQuantity, setFormQuantity] = useState<number | string>('');
  const [formUnit, setFormUnit] = useState('kg');
  const [formPrice, setFormPrice] = useState<number | string>('');
  const [formMinimumStock, setFormMinimumStock] = useState<number | string>('');

  // Quick edit stock quantity modal state
  const [quickStockItem, setQuickStockItem] = useState<Ingredient | null>(null);
  const [quickStockValue, setQuickStockValue] = useState<number | string>('');

  // Quick edit minimum stock threshold modal state
  const [quickMinStockItem, setQuickMinStockItem] = useState<Ingredient | null>(null);
  const [quickMinStockValue, setQuickMinStockValue] = useState<number | string>('');

  // Interactive AI Purchase List states
  const [selectedIngredientIds, setSelectedIngredientIds] = useState<Record<string, boolean>>({});
  const [customQuantities, setCustomQuantities] = useState<Record<string, number>>({});
  const [priceScenario, setPriceScenario] = useState<'average' | 'negotiated' | 'buffer'>('average');
  const [filterOnlyUrgent, setFilterOnlyUrgent] = useState(false);
  const [restockSuccessMessage, setRestockSuccessMessage] = useState<string | null>(null);

  // Copy feedback
  const [copiedList, setCopiedList] = useState(false);

  // Sort & Filter ingredients
  const filteredIngredients = useMemo(() => {
    return (ingredients || [])
      .filter(ing => {
        const term = searchTerm.toLowerCase();
        const matchesTerm = (
          ing.name.toLowerCase().includes(term) ||
          (ing.category && ing.category.toLowerCase().includes(term))
        );
        const isLow = (ing.currentStock || 0) <= (ing.minimumStock || 1);
        if (statusFilter === 'critical') return matchesTerm && isLow;
        if (statusFilter === 'ok') return matchesTerm && !isLow;
        return matchesTerm;
      })
      .sort((a, b) => {
        let valA: any;
        let valB: any;
        if (sortBy === 'name') {
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
          return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        } else if (sortBy === 'stock') {
          valA = a.currentStock || 0;
          valB = b.currentStock || 0;
        } else if (sortBy === 'cost') {
          valA = a.costPerUnit || 0;
          valB = b.costPerUnit || 0;
        } else {
          valA = (a.currentStock || 0) * (a.costPerUnit || 0);
          valB = (b.currentStock || 0) * (b.costPerUnit || 0);
        }
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      });
  }, [ingredients, searchTerm, statusFilter, sortBy, sortDirection]);

  // Metrics calculated strictly from registered items
  const totalStockValue = useMemo(() => {
    return (ingredients || []).reduce((acc, ing) => {
      const price = ing.costPerUnit || 0;
      const qty = ing.currentStock || 0;
      return acc + (price * qty);
    }, 0);
  }, [ingredients]);

  const totalRegisteredItems = ingredients.length;

  const lowStockCount = useMemo(() => {
    return (ingredients || []).filter(ing => (ing.currentStock || 0) <= (ing.minimumStock || 1)).length;
  }, [ingredients]);

  // Overall Average Unit Cost of registered ingredients
  const overallAverageItemCost = useMemo(() => {
    if (ingredients.length === 0) return 0;
    const sum = ingredients.reduce((acc, ing) => acc + (ing.costPerUnit || 0), 0);
    return sum / ingredients.length;
  }, [ingredients]);

  // Open modal for new ingredient
  const handleOpenNewModal = () => {
    setEditingIngredient(null);
    setFormName('');
    setFormQuantity('');
    setFormUnit('kg');
    setFormPrice('');
    setFormMinimumStock('');
    setIsRegisterModalOpen(true);
    playSoftClickSound();
  };

  // Open modal for editing existing ingredient
  const handleOpenEditModal = (ing: Ingredient) => {
    setEditingIngredient(ing);
    setFormName(ing.name);
    setFormQuantity(ing.currentStock);
    setFormUnit(ing.unit || 'kg');
    setFormPrice(ing.costPerUnit || '');
    setFormMinimumStock(ing.minimumStock !== undefined ? ing.minimumStock : Math.max(1, Math.round((Number(ing.currentStock) || 0) * 0.3)));
    setIsRegisterModalOpen(true);
    playSoftClickSound();
  };

  // Submit registration form with explicit minimum stock level
  const handleSaveIngredient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const qty = parseFloat(String(formQuantity).replace(',', '.')) || 0;
    const price = parseFloat(String(formPrice).replace(',', '.')) || 0;
    const parsedMinStock = parseFloat(String(formMinimumStock).replace(',', '.'));
    const minStock = !isNaN(parsedMinStock) && parsedMinStock >= 0
      ? parsedMinStock
      : Math.max(1, Math.round(qty * 0.3));

    if (editingIngredient) {
      // Update existing item dynamically in state
      if (updateIngredient) {
        updateIngredient(editingIngredient.id, {
          name: formName.trim(),
          currentStock: qty,
          unit: formUnit,
          costPerUnit: price,
          minimumStock: minStock
        });
      } else {
        updateStock(editingIngredient.id, qty);
      }
      playCashRegister();
    } else {
      // Add new item to form the dynamic list
      addIngredient({
        name: formName.trim(),
        currentStock: qty,
        unit: formUnit,
        costPerUnit: price,
        category: 'Insumos',
        minimumStock: minStock
      });
      playCashRegister();
      confetti({
        particleCount: 45,
        spread: 60,
        origin: { y: 0.6 }
      });
    }

    setIsRegisterModalOpen(false);
  };

  // Handle item deletion
  const handleDeleteItem = (id: string, name: string) => {
    if (confirm(`Remover "${name}" da lista de insumos?`)) {
      deleteIngredient(id);
      playBeep(440, 0.1);
    }
  };

  // Handle quick stock quantity update
  const handleConfirmQuickStock = () => {
    if (quickStockItem) {
      const val = parseFloat(String(quickStockValue).replace(',', '.'));
      if (!isNaN(val)) {
        updateStock(quickStockItem.id, Math.max(0, val));
        playCashRegister();
      }
      setQuickStockItem(null);
    }
  };

  // Handle quick minimum stock threshold update
  const handleConfirmQuickMinStock = () => {
    if (quickMinStockItem) {
      const val = parseFloat(String(quickMinStockValue).replace(',', '.'));
      if (!isNaN(val) && val >= 0) {
        if (updateIngredient) {
          updateIngredient(quickMinStockItem.id, { minimumStock: val });
        }
        playCashRegister();
      }
      setQuickMinStockItem(null);
    }
  };

  // =========================================================================
  // LOGICA DA LISTA DE COMPRAS IA BASEADA EM DADOS REAIS E PREÇOS MÉDIOS
  // =========================================================================

  // Scenario Multiplier:
  // - 'average': 1.0 (Preço médio cadastrado)
  // - 'negotiated': 0.93 (-7% economia por atacado/negociação)
  // - 'buffer': 1.08 (+8% margem de segurança/inflação de suprimentos)
  const scenarioMultiplier = useMemo(() => {
    if (priceScenario === 'negotiated') return 0.93;
    if (priceScenario === 'buffer') return 1.08;
    return 1.0;
  }, [priceScenario]);

  // Generate IA Shopping list based on real registered ingredients
  const rawAiShoppingList = useMemo(() => {
    return (ingredients || []).map(ing => {
      const current = ing.currentStock || 0;
      const min = ing.minimumStock || 1;
      const isUrgent = current <= min;

      // Smart recommendation based on inventory safety levels:
      // If critical/below minimum: replenishes up to 2.5x minimum
      // If safe: suggests 50% buffer or 1.2x minimum to maintain healthy flow
      const defaultSuggested = isUrgent
        ? Math.max(1, Math.ceil(min * 2.5 - current))
        : Math.max(1, Math.ceil(min * 1.2));

      const suggestedQty = customQuantities[ing.id] !== undefined
        ? customQuantities[ing.id]
        : defaultSuggested;

      // Registered unit price (base for average calculation)
      const baseAveragePrice = ing.costPerUnit || 0;
      // Adjusted price according to market scenario
      const effectiveUnitPrice = Number((baseAveragePrice * scenarioMultiplier).toFixed(2));
      const totalEstimated = Number((suggestedQty * effectiveUnitPrice).toFixed(2));

      // Is included in the purchase
      const isSelected = selectedIngredientIds[ing.id] !== undefined
        ? selectedIngredientIds[ing.id]
        : true; // default all selected

      return {
        ...ing,
        suggestedQty,
        baseAveragePrice,
        effectiveUnitPrice,
        totalEstimated,
        isUrgent,
        isSelected
      };
    });
  }, [ingredients, customQuantities, scenarioMultiplier, selectedIngredientIds]);

  // Filtered list for the modal display
  const displayAiShoppingList = useMemo(() => {
    if (filterOnlyUrgent) {
      return rawAiShoppingList.filter(item => item.isUrgent);
    }
    return rawAiShoppingList;
  }, [rawAiShoppingList, filterOnlyUrgent]);

  // Active items selected by user in the AI shopping list
  const activeSelectedItems = useMemo(() => {
    return rawAiShoppingList.filter(item => item.isSelected);
  }, [rawAiShoppingList]);

  // Total Estimated Purchase Cost (sum of all selected items)
  const totalAIPurchaseCost = useMemo(() => {
    return activeSelectedItems.reduce((sum, item) => sum + item.totalEstimated, 0);
  }, [activeSelectedItems]);

  // Total Base Cost (at 100% average price without scenario)
  const totalBaseCost = useMemo(() => {
    return activeSelectedItems.reduce((sum, item) => sum + (item.suggestedQty * item.baseAveragePrice), 0);
  }, [activeSelectedItems]);

  // Total Quantity of Units to be purchased
  const totalUnitsToBuy = useMemo(() => {
    return activeSelectedItems.reduce((sum, item) => sum + item.suggestedQty, 0);
  }, [activeSelectedItems]);

  // Average Price per Insumo Item in this purchase
  const averagePricePerPurchaseItem = useMemo(() => {
    if (activeSelectedItems.length === 0) return 0;
    return totalAIPurchaseCost / activeSelectedItems.length;
  }, [activeSelectedItems, totalAIPurchaseCost]);

  // Weighted Average Cost per unit purchased
  const weightedAverageUnitCost = useMemo(() => {
    if (totalUnitsToBuy === 0) return 0;
    return totalAIPurchaseCost / totalUnitsToBuy;
  }, [totalAIPurchaseCost, totalUnitsToBuy]);

  // Urgent vs Preventive split
  const urgentSubtotal = useMemo(() => {
    return activeSelectedItems
      .filter(item => item.isUrgent)
      .reduce((sum, item) => sum + item.totalEstimated, 0);
  }, [activeSelectedItems]);

  const preventiveSubtotal = useMemo(() => {
    return activeSelectedItems
      .filter(item => !item.isUrgent)
      .reduce((sum, item) => sum + item.totalEstimated, 0);
  }, [activeSelectedItems]);

  // Toggle selection for an item in AI list
  const handleToggleItemSelection = (id: string) => {
    setSelectedIngredientIds(prev => {
      const current = prev[id] !== undefined ? prev[id] : true;
      return { ...prev, [id]: !current };
    });
    playSoftClickSound();
  };

  // Adjust suggested quantity in AI list
  const handleAdjustQuantity = (id: string, delta: number) => {
    const item = rawAiShoppingList.find(i => i.id === id);
    if (!item) return;
    const current = item.suggestedQty;
    const newQty = Math.max(1, current + delta);
    setCustomQuantities(prev => ({ ...prev, [id]: newQty }));
    playSoftClickSound();
  };

  // Direct set quantity
  const handleSetDirectQuantity = (id: string, value: string) => {
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && parsed >= 0) {
      setCustomQuantities(prev => ({ ...prev, [id]: parsed }));
    }
  };

  // Select / Deselect All
  const handleSelectAll = (select: boolean) => {
    const updated: Record<string, boolean> = {};
    rawAiShoppingList.forEach(item => {
      updated[item.id] = select;
    });
    setSelectedIngredientIds(updated);
    playSoftClickSound();
  };

  // Execute Restock (Dar Entrada no Estoque dos itens comprados com registro financeiro)
  const handleConfirmRestockArrival = () => {
    if (activeSelectedItems.length === 0) return;

    if (registerPurchase) {
      registerPurchase({
        tenantId: tenant?.id || 'tenant_lanchonete_dulci',
        branchId: currentBranch?.id || 'branch_matriz_manaus',
        supplierName: activeSelectedItems[0]?.supplier || 'Distribuidora Fornecedora de Insumos',
        items: activeSelectedItems.map(item => ({
          ingredientId: item.id,
          ingredientName: item.name,
          quantity: item.suggestedQty,
          unit: item.unit,
          unitPrice: item.effectiveUnitPrice,
          totalPrice: item.totalEstimated
        })),
        totalAmount: totalAIPurchaseCost,
        paymentTerms: 'a_vista',
        paymentStatus: 'paid',
        paymentMethod: 'pix',
        date: new Date().toISOString().split('T')[0],
        notes: `Entrada de reposição de estoque com ${activeSelectedItems.length} insumo(s)`
      });
    } else {
      activeSelectedItems.forEach(item => {
        const newStock = (item.currentStock || 0) + item.suggestedQty;
        updateStock(item.id, newStock);
      });
    }

    playCashRegister();
    confetti({
      particleCount: 70,
      spread: 70,
      origin: { y: 0.5 }
    });

    setRestockSuccessMessage(
      `Sucesso! Entrada de ${activeSelectedItems.length} insumo(s) efetuada no estoque com valor de ${formatBRL(totalAIPurchaseCost)} e registrada no Financeiro.`
    );
    setTimeout(() => setRestockSuccessMessage(null), 4000);
  };

  // Copy shopping list formatted for WhatsApp
  const handleCopyShoppingList = () => {
    if (activeSelectedItems.length === 0) return;

    const urgentItems = activeSelectedItems.filter(i => i.isUrgent);
    const regularItems = activeSelectedItems.filter(i => !i.isUrgent);

    const lines = [
      `🛒 *LISTA DE COMPRAS SUGERIDA PELA IA (NEON FOOD OS)*`,
      `📅 Data: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
      `💰 Orçamento Estimado: ${formatBRL(totalAIPurchaseCost)} (Preço Médio de Referência)`,
      `📊 Média por Insumo: ${formatBRL(averagePricePerPurchaseItem)} | Custo Médio Unitário: ${formatBRL(weightedAverageUnitCost)}`,
      `---------------------------------`,
      ...(urgentItems.length > 0 ? [
        `🚨 *ITENS URGENTES (ESTOQUE CRÍTICO)*:`,
        ...urgentItems.map(item => 
          `• *${item.name}*: ${item.suggestedQty} ${item.unit} | Preço Médio: ${formatBRL(item.effectiveUnitPrice)}/${item.unit} | Subtotal: ${formatBRL(item.totalEstimated)}`
        ),
        `---------------------------------`
      ] : []),
      ...(regularItems.length > 0 ? [
        `📦 *ITENS DE REPOSIÇÃO PREVENTIVA*:`,
        ...regularItems.map(item => 
          `• *${item.name}*: ${item.suggestedQty} ${item.unit} | Preço Médio: ${formatBRL(item.effectiveUnitPrice)}/${item.unit} | Subtotal: ${formatBRL(item.totalEstimated)}`
        ),
        `---------------------------------`
      ] : []),
      `Total de Itens: ${activeSelectedItems.length} | Unidades Totais: ${totalUnitsToBuy}`,
      `Gerado automaticamente com base no histórico e estoque real.`
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedList(true);
    playCashRegister();
    setTimeout(() => setCopiedList(false), 2500);
  };

  // Send shopping list via WhatsApp
  const handleSendWhatsApp = () => {
    if (activeSelectedItems.length === 0) return;

    const lines = [
      `🛒 *COTAÇÃO DE INSUMOS & REPOSIÇÃO DE ESTOQUE*`,
      `📅 Data: ${new Date().toLocaleDateString('pt-BR')}`,
      `💰 Orçamento Estimado: ${formatBRL(totalAIPurchaseCost)} (Base de Preços Médios)`,
      `---------------------------------`,
      ...activeSelectedItems.map(item => 
        `• ${item.name}: ${item.suggestedQty} ${item.unit} (Ref. Preço Médio: ${formatBRL(item.effectiveUnitPrice)}/${item.unit})${item.isUrgent ? ' ⚠️ Urgente' : ''}`
      ),
      `---------------------------------`,
      `Por favor, confirmar os valores finais e o prazo de entrega. Obrigado!`
    ];

    const message = encodeURIComponent(lines.join('\n'));
    window.open(`https://api.whatsapp.com/send?text=${message}`, '_blank');
  };

  return (
    <div className="space-y-5 sm:space-y-6 pb-24 select-none max-w-7xl mx-auto w-full">
      {/* Header with High-Contrast McDonald's / Modern Food-Tech styling */}
      <div className="relative overflow-hidden p-5 sm:p-7 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-[#141218] via-[#1A1624] to-[#12121A] border border-[#2D283E] shadow-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 sm:gap-6">
        <div className="space-y-1.5 w-full lg:w-auto">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#FFC72C] px-3 py-1 rounded-full bg-[#FFC72C]/15 border border-[#FFC72C]/30 flex items-center gap-1.5">
              <Boxes className="w-3.5 h-3.5 text-[#FFC72C]" />
              Gestão de Estoque & Insumos
            </span>
            <span className="text-xs text-[#71717A] hidden xs:inline">•</span>
            <span className="text-xs font-bold text-[#00E676] flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#00E676]" />
              Previsão Inteligente com IA
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-display text-white tracking-tight pt-1">
            Estoque de Ingredientes & Insumos
          </h1>
          <p className="text-xs sm:text-sm text-[#A1A1AA] max-w-2xl leading-relaxed">
            Cadastre seus insumos rapidamente com nome, quantidade e preço unitário. A lista se forma dinamicamente e a IA calcula sua Lista de Compras baseada nos preços médios reais.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full lg:w-auto shrink-0">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              setIsAIPurchaseModalOpen(true);
              playSoftClickSound();
            }}
            className="w-full sm:w-auto px-4 py-3 min-h-[44px] bg-[#1E1B2E] hover:bg-[#28243C] text-[#FFC72C] border border-[#FFC72C]/40 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_16px_rgba(255,199,44,0.15)]"
          >
            <Sparkles className="w-4 h-4 text-[#FFC72C] shrink-0" />
            <span>Gerar Lista de Compras IA</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleOpenNewModal}
            className="w-full sm:w-auto px-5 py-3 min-h-[44px] bg-gradient-to-r from-[#DA291C] to-[#F5222D] hover:from-[#B7180D] hover:to-[#DA291C] text-white rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(218,41,28,0.4)]"
          >
            <Plus className="w-4.5 h-4.5 shrink-0" />
            <span>CADASTRAR INSUMOS</span>
          </motion.button>
        </div>
      </div>

      {/* Success Alert Banner if Restock Happened */}
      <AnimatePresence>
        {restockSuccessMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3.5 sm:p-4 rounded-2xl bg-[#00E676]/15 border border-[#00E676]/40 text-[#00E676] flex items-center justify-between shadow-lg text-xs font-bold gap-2"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-[#00E676] shrink-0" />
              <span>{restockSuccessMessage}</span>
            </div>
            <button
              onClick={() => setRestockSuccessMessage(null)}
              className="p-1 rounded-lg hover:bg-[#00E676]/20 text-[#00E676] shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KPI Cards - Dynamically computed from registered ingredients */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
        <div className="bg-[#12121A] border border-[#242438] p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-xl hover:border-[#00E676]/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#A1A1AA] uppercase font-bold tracking-wider">Valor Total em Estoque</span>
            <DollarSign className="w-4 h-4 text-[#00E676]" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-[#00E676] mt-2">
            {formatBRL(totalStockValue)}
          </div>
          <div className="text-[11px] text-[#71717A] mt-1 font-medium">
            Calculado sobre {totalRegisteredItems} insumo(s)
          </div>
        </div>

        <div className="bg-[#12121A] border border-[#242438] p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-xl hover:border-[#FFC72C]/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#A1A1AA] uppercase font-bold tracking-wider">Preço Médio / Insumo</span>
            <Calculator className="w-4 h-4 text-[#FFC72C]" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-white mt-2">
            {formatBRL(overallAverageItemCost)}
          </div>
          <div className="text-[11px] text-[#FFC72C] mt-1 font-medium">
            Média de custo unitário cadastrado
          </div>
        </div>

        <div className="bg-[#12121A] border border-[#242438] p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-xl hover:border-[#38BDF8]/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#A1A1AA] uppercase font-bold tracking-wider">Itens Cadastrados</span>
            <Boxes className="w-4 h-4 text-[#38BDF8]" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-white mt-2">
            {totalRegisteredItems} <span className="text-xs font-sans font-normal text-[#A1A1AA]">insumos</span>
          </div>
          <div className="text-[11px] text-[#38BDF8] mt-1 font-medium">
            Gerenciados dinamicamente
          </div>
        </div>

        <div className="bg-[#12121A] border border-[#242438] p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-xl hover:border-[#DA291C]/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#A1A1AA] uppercase font-bold tracking-wider">Estoque Crítico</span>
            <AlertTriangle className="w-4 h-4 text-[#DA291C]" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-[#DA291C] mt-2">
            {lowStockCount} <span className="text-xs font-sans font-normal text-[#A1A1AA]">atenção</span>
          </div>
          <div className="text-[11px] text-[#A1A1AA] mt-1 font-medium">
            {lowStockCount > 0 ? 'Prioritários na Lista IA' : 'Todos níveis abastecidos'}
          </div>
        </div>
      </div>

      {/* Main Stock Container */}
      <div className="bg-[#12121A] border border-[#242438] p-4 sm:p-6 rounded-2xl sm:rounded-3xl space-y-4 sm:space-y-5 shadow-xl">
        {/* Search Bar, Filters and Actions */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 w-full max-w-2xl">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-[#71717A] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nome do insumo..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-[#181824] border border-[#28283C] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-[#52525B] focus:border-[#FFC72C] focus:outline-none transition-colors"
              />
            </div>

            {/* Quick Status Filter Tabs */}
            <div className="flex items-center bg-[#181824] p-1 rounded-xl border border-[#28283C] shrink-0 text-xs overflow-x-auto scrollbar-none justify-between sm:justify-start">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === 'all'
                    ? 'bg-[#FFC72C] text-black shadow-sm'
                    : 'text-[#A1A1AA] hover:text-white'
                }`}
              >
                Todos ({ingredients.length})
              </button>
              <button
                onClick={() => setStatusFilter('critical')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === 'critical'
                    ? 'bg-[#DA291C] text-white shadow-sm'
                    : 'text-[#A1A1AA] hover:text-white'
                }`}
              >
                Crítico ({lowStockCount})
              </button>
              <button
                onClick={() => setStatusFilter('ok')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === 'ok'
                    ? 'bg-[#00E676] text-black shadow-sm'
                    : 'text-[#A1A1AA] hover:text-white'
                }`}
              >
                Abastecidos ({ingredients.length - lowStockCount})
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 justify-between sm:justify-end w-full lg:w-auto">
            {ingredients.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('Tem certeza que deseja limpar todos os insumos cadastrados? Esta ação reiniciará sua lista.')) {
                    clearAllIngredients();
                    playBeep(440, 0.1);
                  }
                }}
                className="px-3 py-2 text-xs font-bold text-[#71717A] hover:text-[#DA291C] hover:bg-[#DA291C]/10 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                title="Limpar lista de insumos"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Limpar Lista</span>
              </button>
            )}

            <button
              onClick={() => openExportModal('produtos')}
              className="px-3.5 py-2.5 bg-[#181824] hover:bg-[#202030] border border-[#28283C] text-zinc-300 hover:text-[#00E676] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[40px]"
              title="Exportar Produtos, Insumos e CMV para CSV/Excel"
            >
              <Download className="w-3.5 h-3.5 text-[#00E676]" />
              <span className="hidden sm:inline">Exportar CSV</span>
            </button>

            <button
              onClick={handleOpenNewModal}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-[#FFC72C]/15 hover:bg-[#FFC72C]/25 border border-[#FFC72C]/40 text-[#FFC72C] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[40px]"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Insumo</span>
            </button>
          </div>
        </div>

        {/* Dynamic List */}
        {filteredIngredients.length === 0 ? (
          /* Empty State */
          <div className="py-12 sm:py-16 text-center border-2 border-dashed border-[#242436] rounded-2xl p-6 sm:p-8 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-[#1C1A28] border border-[#2E2A42] flex items-center justify-center text-[#FFC72C] shadow-inner">
              <Boxes className="w-8 h-8" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="text-base sm:text-lg font-black text-white">
                {ingredients.length === 0 ? 'Nenhum insumo cadastrado.' : 'Nenhum insumo encontrado para este filtro'}
              </h3>
              <p className="text-xs text-[#A1A1AA] leading-relaxed">
                {ingredients.length === 0 
                  ? 'Clique no botão abaixo para cadastrar seu primeiro insumo com 3 informações simples (Nome, Quantidade e Preço Unitário). A cada insumo cadastrado, a lista e os cálculos de IA se formam dinamicamente.'
                  : 'Ajuste os filtros de busca para visualizar outros insumos cadastrados.'}
              </p>
            </div>
            {ingredients.length === 0 && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleOpenNewModal}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] bg-gradient-to-r from-[#DA291C] to-[#FFC72C] text-black font-black text-xs uppercase tracking-wider rounded-xl sm:rounded-2xl shadow-[0_0_20px_rgba(255,199,44,0.3)] cursor-pointer w-full sm:w-auto"
              >
                <Plus className="w-4 h-4 text-black" />
                <span>+ Cadastrar insumo</span>
              </motion.button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile Cards View (md:hidden) - Zero glued elements, touch friendly */}
            <div className="block md:hidden space-y-3">
              {filteredIngredients.map(ing => {
                const unitPrice = ing.costPerUnit || 0;
                const stockTotal = (ing.currentStock || 0) * unitPrice;
                const isLow = (ing.currentStock || 0) <= (ing.minimumStock || 1);

                return (
                  <div 
                    key={ing.id} 
                    className="p-4 rounded-2xl bg-[#161624] border border-[#28283C] space-y-3.5 shadow-md"
                  >
                    {/* Top Row: Name & Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-extrabold text-white text-sm flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isLow ? 'bg-[#DA291C]' : 'bg-[#FFC72C]'}`} />
                          <span className="truncate">{ing.name}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 ml-4.5">
                          <span className="text-[10px] text-[#71717A] uppercase">
                            Mínimo: {ing.minimumStock || 1} {ing.unit}
                          </span>
                          <button
                            onClick={() => {
                              setQuickMinStockItem(ing);
                              setQuickMinStockValue(ing.minimumStock || 1);
                            }}
                            className="p-0.5 rounded text-zinc-500 hover:text-[#FFC72C] transition-colors cursor-pointer"
                            title="Ajustar nível mínimo de alerta crítico"
                          >
                            <SlidersHorizontal className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        isLow
                          ? 'bg-[#DA291C]/20 text-[#FF4D4F] border border-[#DA291C]/40'
                          : 'bg-[#00E676]/15 text-[#00E676] border border-[#00E676]/30'
                      }`}>
                        {isLow ? (
                          <>
                            <AlertTriangle className="w-3 h-3" />
                            <span>Crítico</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Normal</span>
                          </>
                        )}
                      </span>
                    </div>

                    {/* Middle Grid: Stock Quantity, Unit Price, Total */}
                    <div className="grid grid-cols-3 gap-2 p-2.5 bg-[#101018] rounded-xl border border-[#20202E] text-center">
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-[#71717A] uppercase font-bold block">Estoque</span>
                        <div className="flex items-center justify-center gap-1">
                          <span className="font-mono font-black text-white text-xs">
                            {ing.currentStock} {ing.unit}
                          </span>
                          <button
                            onClick={() => {
                              setQuickStockItem(ing);
                              setQuickStockValue(ing.currentStock);
                            }}
                            className="p-1 rounded-md bg-[#222234] text-[#FFC72C] hover:text-white"
                            title="Ajustar rápido"
                          >
                            <ArrowUpDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-0.5 border-x border-[#20202E]">
                        <span className="text-[10px] text-[#71717A] uppercase font-bold block">Preço Un.</span>
                        <span className="font-mono font-bold text-[#FFC72C] text-xs block">
                          {formatBRL(unitPrice)}
                        </span>
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-[10px] text-[#71717A] uppercase font-bold block">Subtotal</span>
                        <span className="font-mono font-black text-[#00E676] text-xs block">
                          {formatBRL(stockTotal)}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Row: Actions */}
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#20202E]">
                      <button
                        onClick={() => handleOpenEditModal(ing)}
                        className="px-3 py-1.5 rounded-xl bg-[#202030] hover:bg-[#2A2A40] text-zinc-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-[#FFC72C]" />
                        <span>Editar</span>
                      </button>
                      <button
                        onClick={() => handleDeleteItem(ing.id, ing.name)}
                        className="px-3 py-1.5 rounded-xl bg-[#202030] hover:bg-[#DA291C]/20 text-zinc-400 hover:text-[#FF4D4F] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remover</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View (hidden md:block) */}
            <div className="hidden md:block overflow-x-auto rounded-2xl border border-[#242436]">
              <table className="w-full text-left border-collapse min-w-[720px]">
                <thead>
                  <tr className="bg-[#181824] border-b border-[#242436] text-[11px] font-extrabold uppercase text-[#71717A] tracking-wider">
                    <th 
                      onClick={() => {
                        if (sortBy === 'name') setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                        else { setSortBy('name'); setSortDirection('asc'); }
                      }}
                      className="py-3.5 px-4 cursor-pointer hover:text-white"
                    >
                      Insumo / Ingrediente {sortBy === 'name' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th 
                      onClick={() => {
                        if (sortBy === 'stock') setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                        else { setSortBy('stock'); setSortDirection('asc'); }
                      }}
                      className="py-3.5 px-4 cursor-pointer hover:text-white"
                    >
                      Estoque Atual {sortBy === 'stock' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th 
                      onClick={() => {
                        if (sortBy === 'cost') setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                        else { setSortBy('cost'); setSortDirection('asc'); }
                      }}
                      className="py-3.5 px-4 cursor-pointer hover:text-white"
                    >
                      Preço Unitário {sortBy === 'cost' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th 
                      onClick={() => {
                        if (sortBy === 'total') setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                        else { setSortBy('total'); setSortDirection('asc'); }
                      }}
                      className="py-3.5 px-4 cursor-pointer hover:text-white"
                    >
                      Valor em Estoque {sortBy === 'total' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1C1C2A] text-xs">
                  {filteredIngredients.map(ing => {
                    const unitPrice = ing.costPerUnit || 0;
                    const stockTotal = (ing.currentStock || 0) * unitPrice;
                    const isLow = (ing.currentStock || 0) <= (ing.minimumStock || 1);

                    return (
                      <tr key={ing.id} className="hover:bg-[#161624] transition-colors group">
                        {/* Name */}
                        <td className="py-3.5 px-4">
                          <div className="font-extrabold text-white text-sm flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${isLow ? 'bg-[#DA291C]' : 'bg-[#FFC72C]'}`}></span>
                            <span>{ing.name}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 ml-4">
                            <span className="text-[10px] text-[#71717A] uppercase">
                              Mínimo: {ing.minimumStock || 1} {ing.unit}
                            </span>
                            <button
                              onClick={() => {
                                setQuickMinStockItem(ing);
                                setQuickMinStockValue(ing.minimumStock || 1);
                              }}
                              className="p-0.5 rounded text-zinc-500 hover:text-[#FFC72C] transition-colors cursor-pointer"
                              title="Ajustar nível mínimo de alerta crítico"
                            >
                              <SlidersHorizontal className="w-3 h-3" />
                            </button>
                          </div>
                        </td>

                        {/* Quantity with fast quick-adjust button */}
                        <td className="py-3.5 px-4 font-mono">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-black text-sm">
                              {ing.currentStock} {ing.unit}
                            </span>
                            <button
                              onClick={() => {
                                setQuickStockItem(ing);
                                setQuickStockValue(ing.currentStock);
                              }}
                              className="p-1 rounded-lg bg-[#202030] hover:bg-[#2A2A40] text-[#A1A1AA] hover:text-[#FFC72C] transition-colors cursor-pointer"
                              title="Ajustar quantidade em estoque"
                            >
                              <ArrowUpDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* Unit Price */}
                        <td className="py-3.5 px-4 font-mono font-bold text-[#FFC72C]">
                          {formatBRL(unitPrice)} <span className="text-[10px] text-[#71717A]">/{ing.unit}</span>
                        </td>

                        {/* Total Value */}
                        <td className="py-3.5 px-4 font-mono font-bold text-[#00E676]">
                          {formatBRL(stockTotal)}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${
                            isLow
                              ? 'bg-[#DA291C]/20 text-[#FF4D4F] border border-[#DA291C]/40'
                              : 'bg-[#00E676]/15 text-[#00E676] border border-[#00E676]/30'
                          }`}>
                            {isLow ? (
                              <>
                                <AlertTriangle className="w-3 h-3" />
                                <span>Estoque Baixo</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Abastecido</span>
                              </>
                            )}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditModal(ing)}
                              className="p-2 rounded-xl bg-[#1C1C28] hover:bg-[#28283C] text-[#A1A1AA] hover:text-white transition-colors cursor-pointer"
                              title="Editar Insumo"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(ing.id, ing.name)}
                              className="p-2 rounded-xl bg-[#1C1C28] hover:bg-[#DA291C]/20 text-[#A1A1AA] hover:text-[#FF4D4F] transition-colors cursor-pointer"
                              title="Remover Insumo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ========================================================= */}
      {/* PEQUENA JANELA MODAL: CADASTRO DE INSUMOS (MÁXIMO 3 CAMPOS) */}
      {/* ========================================================= */}
      <AnimatePresence>
        {isRegisterModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md bg-[#14121B] border border-[#2D283E] rounded-3xl p-6 shadow-2xl space-y-5"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#242436]">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-[#DA291C]/20 text-[#DA291C] border border-[#DA291C]/30">
                    <Boxes className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">
                      {editingIngredient ? 'Editar Insumo' : 'Cadastrar Insumo'}
                    </h3>
                    <p className="text-[11px] text-[#A1A1AA]">
                      Apenas 3 informações básicas e diretas
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="p-2 rounded-xl bg-[#1C1C28] text-[#A1A1AA] hover:text-white cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Simplified Form: Max 3 Inputs */}
              <form onSubmit={handleSaveIngredient} className="space-y-4 text-xs">
                {/* CAMPO 1: Nome do Insumo */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-[#E4E4E7] uppercase tracking-wider">
                    1. Nome do Insumo / Item *
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="Ex: Batatas para Batata Frita"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    className="w-full bg-[#1A1826] border border-[#2D2A40] focus:border-[#FFC72C] rounded-xl px-3.5 py-2.5 text-white placeholder-[#52525B] focus:outline-none transition-colors text-sm"
                  />
                  <p className="text-[10px] text-[#71717A]">
                    Exemplo: Batatas para Batata Frita, Pão Brioche, Molho Especial
                  </p>
                </div>

                {/* CAMPO 2: Quantidade & Unidade */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-[#E4E4E7] uppercase tracking-wider">
                    2. Quantidade em Estoque *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      placeholder="Ex: 1 ou 10"
                      value={formQuantity}
                      onChange={e => setFormQuantity(e.target.value)}
                      className="flex-1 bg-[#1A1826] border border-[#2D2A40] focus:border-[#FFC72C] rounded-xl px-3.5 py-2.5 text-white placeholder-[#52525B] focus:outline-none transition-colors text-sm font-mono"
                    />
                    <select
                      value={formUnit}
                      onChange={e => setFormUnit(e.target.value)}
                      className="w-28 bg-[#1A1826] border border-[#2D2A40] focus:border-[#FFC72C] rounded-xl px-2.5 py-2.5 text-white focus:outline-none text-xs font-bold cursor-pointer"
                    >
                      <option value="kg">kg (quilo)</option>
                      <option value="un">un (unidade)</option>
                      <option value="L">L (litro)</option>
                      <option value="pct">pct (pacote)</option>
                      <option value="cx">cx (caixa)</option>
                      <option value="g">g (gramas)</option>
                      <option value="ml">ml (mililitros)</option>
                    </select>
                  </div>
                  <p className="text-[10px] text-[#71717A]">
                    Exemplo: 1kg, 10 un, 5 L
                  </p>
                </div>

                {/* CAMPO 3: Preço Unitário de Custo */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-[#E4E4E7] uppercase tracking-wider">
                    3. Preço / Custo Unitário (R$) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-[#00E676] text-xs">
                      R$
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="Ex: 8.50"
                      value={formPrice}
                      onChange={e => setFormPrice(e.target.value)}
                      className="w-full bg-[#1A1826] border border-[#2D2A40] focus:border-[#00E676] rounded-xl pl-10 pr-4 py-2.5 text-[#00E676] font-mono font-bold placeholder-[#52525B] focus:outline-none transition-colors text-sm"
                    />
                  </div>
                  <p className="text-[10px] text-[#71717A]">
                    Valor pago por {formUnit} (base de cálculo para a Lista de Compras IA)
                  </p>
                </div>

                {/* CAMPO 4: Nível Mínimo de Segurança (Alerta Crítico) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold text-[#E4E4E7] uppercase tracking-wider">
                      4. Estoque Mínimo de Segurança (Alerta Crítico) *
                    </label>
                    <span className="text-[10px] text-[#FFC72C] font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Alerta no KDS & Dashboard
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder={`Ex: ${formQuantity ? Math.max(1, Math.round(Number(formQuantity) * 0.3)) : '2'}`}
                      value={formMinimumStock}
                      onChange={e => setFormMinimumStock(e.target.value)}
                      className="w-full bg-[#1A1826] border border-[#2D2A40] focus:border-[#FFC72C] rounded-xl px-3.5 py-2.5 text-white font-mono font-bold placeholder-[#52525B] focus:outline-none transition-colors text-sm"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#A1A1AA]">
                      {formUnit}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#71717A]">
                    Quando o estoque for igual ou menor que este valor, um alerta visual crítico será disparado no KDS (Cozinha) e no Dashboard.
                  </p>
                </div>

                {/* Modal Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#242436]">
                  <button
                    type="button"
                    onClick={() => setIsRegisterModalOpen(false)}
                    className="px-4 py-2.5 bg-[#1C1C28] hover:bg-[#262638] text-[#A1A1AA] hover:text-white rounded-xl font-bold transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-gradient-to-r from-[#DA291C] to-[#FFC72C] hover:opacity-95 text-black font-black rounded-xl transition-all shadow-[0_0_15px_rgba(255,199,44,0.3)] cursor-pointer"
                  >
                    {editingIngredient ? 'Salvar Alterações' : 'Cadastrar Insumo'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* MODAL: AJUSTE RÁPIDO DE QUANTIDADE EM ESTOQUE */}
      {/* ========================================================= */}
      <AnimatePresence>
        {quickStockItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xs bg-[#14121B] border border-[#2D283E] rounded-3xl p-5 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#242436]">
                <h4 className="text-sm font-black text-white">Atualizar Estoque</h4>
                <button
                  onClick={() => setQuickStockItem(null)}
                  className="text-[#71717A] hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <p className="text-[#A1A1AA]">
                  Insumo: <span className="text-white font-bold">{quickStockItem.name}</span>
                </p>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-[#71717A]">
                    Nova Quantidade ({quickStockItem.unit})
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    autoFocus
                    value={quickStockValue}
                    onChange={e => setQuickStockValue(e.target.value)}
                    className="w-full bg-[#1A1826] border border-[#2D2A40] rounded-xl px-3.5 py-2 text-white font-mono font-bold text-sm focus:border-[#FFC72C] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickStockItem(null)}
                  className="px-3 py-1.5 bg-[#1C1C28] text-[#A1A1AA] hover:text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmQuickStock}
                  className="px-4 py-1.5 bg-[#00E676] text-black font-black rounded-xl text-xs cursor-pointer shadow-md"
                >
                  Salvar
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Quick Edit Minimum Stock Modal */}
        {quickMinStockItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xs bg-[#14121B] border border-[#2D283E] rounded-3xl p-5 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#242436]">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#FFC72C]" />
                  <h4 className="text-sm font-black text-white">Nível Mínimo Crítico</h4>
                </div>
                <button
                  onClick={() => setQuickMinStockItem(null)}
                  className="text-[#71717A] hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <p className="text-[#A1A1AA]">
                  Insumo: <span className="text-white font-bold">{quickMinStockItem.name}</span>
                </p>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-[#71717A]">
                    Ponto de Alerta Mínimo ({quickMinStockItem.unit})
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    autoFocus
                    value={quickMinStockValue}
                    onChange={e => setQuickMinStockValue(e.target.value)}
                    className="w-full bg-[#1A1826] border border-[#2D2A40] rounded-xl px-3.5 py-2 text-white font-mono font-bold text-sm focus:border-[#FFC72C] focus:outline-none"
                  />
                  <p className="text-[10px] text-zinc-500">
                    Dispara alerta visual na Cozinha (KDS) e Dashboard quando o estoque estiver igual ou abaixo deste valor.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickMinStockItem(null)}
                  className="px-3 py-1.5 bg-[#1C1C28] text-[#A1A1AA] hover:text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmQuickMinStock}
                  className="px-4 py-1.5 bg-[#FFC72C] text-black font-black rounded-xl text-xs cursor-pointer shadow-md"
                >
                  Salvar Mínimo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* MODAL: GERAR LISTA DE COMPRAS IA (BASEADA EM PREÇOS MÉDIOS) */}
      {/* ========================================================= */}
      <AnimatePresence>
        {isAIPurchaseModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-4xl bg-[#14121B] border border-[#3E3452] rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-2xl space-y-4 sm:space-y-5 my-4 sm:my-6 max-h-[92vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#242436] shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-gradient-to-br from-[#FFC72C]/20 to-[#DA291C]/20 text-[#FFC72C] border border-[#FFC72C]/40 shadow-inner">
                    <Sparkles className="w-5 h-5 text-[#FFC72C]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2 flex-wrap">
                      <span>Lista de Compras Inteligente IA</span>
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/30 font-mono font-bold">
                        Preços Médios de Custo
                      </span>
                    </h3>
                    <p className="text-xs text-[#A1A1AA]">
                      Calculada a partir dos seus {ingredients.length} insumo(s) reais cadastrados no estoque
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAIPurchaseModalOpen(false)}
                  className="p-2 rounded-xl bg-[#1C1C28] text-[#A1A1AA] hover:text-white cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="overflow-y-auto space-y-4 flex-1 pr-1">
                {ingredients.length === 0 ? (
                  <div className="py-14 text-center space-y-4">
                    <div className="w-16 h-16 rounded-3xl bg-[#1C192E] border border-[#2D283E] text-[#FFC72C] flex items-center justify-center mx-auto shadow-inner">
                      <Boxes className="w-8 h-8 opacity-60" />
                    </div>
                    <div className="space-y-1.5 max-w-sm mx-auto">
                      <h4 className="text-base font-black text-white">Nenhum Insumo Cadastrado</h4>
                      <p className="text-xs text-[#A1A1AA]">
                        A IA necessita de insumos cadastrados com preços unitários para gerar a estimativa de custos e quantidades.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setIsAIPurchaseModalOpen(false);
                        handleOpenNewModal();
                      }}
                      className="px-5 py-2.5 bg-gradient-to-r from-[#DA291C] to-[#FFC72C] text-black font-black rounded-xl text-xs cursor-pointer shadow-[0_0_15px_rgba(255,199,44,0.3)]"
                    >
                      Cadastrar Primeiro Insumo Agora
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Summary Cards of Average Price Cost Estimation */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="p-3.5 rounded-2xl bg-[#181726] border border-[#2B2742]">
                        <div className="text-[10px] text-[#A1A1AA] uppercase font-bold tracking-wider">
                          Orçamento Previsto (Total)
                        </div>
                        <div className="text-xl sm:text-2xl font-black font-mono text-[#00E676] mt-1">
                          {formatBRL(totalAIPurchaseCost)}
                        </div>
                        <div className="text-[10px] text-[#71717A] mt-0.5">
                          {activeSelectedItems.length} item(ns) selecionado(s)
                        </div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-[#181726] border border-[#2B2742]">
                        <div className="text-[10px] text-[#A1A1AA] uppercase font-bold tracking-wider">
                          Preço Médio por Insumo
                        </div>
                        <div className="text-xl sm:text-2xl font-black font-mono text-[#FFC72C] mt-1">
                          {formatBRL(averagePricePerPurchaseItem)}
                        </div>
                        <div className="text-[10px] text-[#A1A1AA] mt-0.5">
                          Base de cálculo nos dados reais
                        </div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-[#181726] border border-[#2B2742]">
                        <div className="text-[10px] text-[#A1A1AA] uppercase font-bold tracking-wider">
                          Reposição Crítica
                        </div>
                        <div className="text-xl sm:text-2xl font-black font-mono text-[#DA291C] mt-1">
                          {formatBRL(urgentSubtotal)}
                        </div>
                        <div className="text-[10px] text-[#FF4D4F] mt-0.5">
                          {activeSelectedItems.filter(i => i.isUrgent).length} item(ns) abaixo do mínimo
                        </div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-[#181726] border border-[#2B2742]">
                        <div className="text-[10px] text-[#A1A1AA] uppercase font-bold tracking-wider">
                          Reposição Preventiva
                        </div>
                        <div className="text-xl sm:text-2xl font-black font-mono text-[#38BDF8] mt-1">
                          {formatBRL(preventiveSubtotal)}
                        </div>
                        <div className="text-[10px] text-[#38BDF8] mt-0.5">
                          Para manter giro de vendas
                        </div>
                      </div>
                    </div>

                    {/* Interactive Scenario & Filter Bar */}
                    <div className="p-3.5 rounded-2xl bg-[#161424] border border-[#27233C] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold text-[#A1A1AA] uppercase tracking-wider flex items-center gap-1">
                          <SlidersHorizontal className="w-3.5 h-3.5 text-[#FFC72C]" />
                          Cenário de Negociação:
                        </span>
                        <div className="flex items-center bg-[#1A1828] p-1 rounded-xl border border-[#2A2742]">
                          <button
                            onClick={() => setPriceScenario('average')}
                            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                              priceScenario === 'average'
                                ? 'bg-[#FFC72C] text-black shadow-sm'
                                : 'text-[#A1A1AA] hover:text-white'
                            }`}
                          >
                            Preço Médio (100%)
                          </button>
                          <button
                            onClick={() => setPriceScenario('negotiated')}
                            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                              priceScenario === 'negotiated'
                                ? 'bg-[#00E676] text-black shadow-sm'
                                : 'text-[#A1A1AA] hover:text-white'
                            }`}
                          >
                            Negociação Atacado (-7%)
                          </button>
                          <button
                            onClick={() => setPriceScenario('buffer')}
                            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                              priceScenario === 'buffer'
                                ? 'bg-[#DA291C] text-white shadow-sm'
                                : 'text-[#A1A1AA] hover:text-white'
                            }`}
                          >
                            Margem Inflação (+8%)
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          onClick={() => setFilterOnlyUrgent(prev => !prev)}
                          className={`px-3 py-1.5 rounded-xl border font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                            filterOnlyUrgent
                              ? 'bg-[#DA291C]/20 border-[#DA291C] text-[#FF4D4F]'
                              : 'bg-[#1C1A2B] border-[#2A2742] text-[#A1A1AA] hover:text-white'
                          }`}
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Apenas Urgentes</span>
                        </button>

                        <div className="h-4 w-[1px] bg-[#2A2742] hidden sm:block"></div>

                        <button
                          onClick={() => handleSelectAll(true)}
                          className="text-[11px] font-bold text-[#FFC72C] hover:underline cursor-pointer"
                        >
                          Marcar Todos
                        </button>
                        <span className="text-zinc-600">•</span>
                        <button
                          onClick={() => handleSelectAll(false)}
                          className="text-[11px] font-bold text-[#A1A1AA] hover:underline cursor-pointer"
                        >
                          Desmarcar
                        </button>
                      </div>
                    </div>

                    {/* Table of Recommended Purchases */}
                    <div className="border border-[#242436] rounded-2xl overflow-x-auto bg-[#111019]">
                      <table className="w-full text-left border-collapse text-xs min-w-[560px]">
                        <thead>
                          <tr className="bg-[#181724] border-b border-[#242436] text-[10px] font-extrabold uppercase text-[#71717A]">
                            <th className="py-2.5 px-3 w-10 text-center">Sel.</th>
                            <th className="py-2.5 px-3">Insumo Cadastrado</th>
                            <th className="py-2.5 px-3">Estoque Atual</th>
                            <th className="py-2.5 px-3">Comprar Sugerido IA</th>
                            <th className="py-2.5 px-3">Preço Médio</th>
                            <th className="py-2.5 px-3 text-right">Subtotal Estimado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1F1E2E]">
                          {displayAiShoppingList.map(item => (
                            <tr 
                              key={item.id} 
                              className={`transition-colors ${
                                item.isSelected ? 'hover:bg-[#181628]' : 'opacity-40 bg-black/20'
                              }`}
                            >
                              {/* Selection Checkbox */}
                              <td className="py-2.5 px-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={item.isSelected}
                                  onChange={() => handleToggleItemSelection(item.id)}
                                  className="w-4 h-4 rounded border-zinc-700 text-[#FFC72C] focus:ring-[#FFC72C] cursor-pointer accent-[#FFC72C]"
                                />
                              </td>

                              {/* Ingredient Name */}
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-white flex items-center gap-1.5">
                                  <span>{item.name}</span>
                                  {item.isUrgent && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#DA291C]/20 text-[#FF4D4F] border border-[#DA291C]/30">
                                      Crítico
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-[#71717A]">
                                  Mínimo seguro: {item.minimumStock || 1} {item.unit}
                                </div>
                              </td>

                              {/* Current Stock */}
                              <td className="py-2.5 px-3 font-mono text-[#A1A1AA]">
                                {item.currentStock} {item.unit}
                              </td>

                              {/* Suggested Quantity with Interactive Controls */}
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => handleAdjustQuantity(item.id, -1)}
                                    className="w-6 h-6 rounded-lg bg-[#201E30] hover:bg-[#2A2740] text-[#A1A1AA] hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.suggestedQty}
                                    onChange={e => handleSetDirectQuantity(item.id, e.target.value)}
                                    className="w-14 text-center font-mono font-black text-sm text-[#FFC72C] bg-[#161424] border border-[#2D2A42] rounded-lg py-0.5 focus:outline-none focus:border-[#FFC72C]"
                                  />
                                  <span className="text-[10px] text-[#71717A]">{item.unit}</span>
                                  <button
                                    onClick={() => handleAdjustQuantity(item.id, 1)}
                                    className="w-6 h-6 rounded-lg bg-[#201E30] hover:bg-[#2A2740] text-[#A1A1AA] hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                              </td>

                              {/* Average Unit Cost */}
                              <td className="py-2.5 px-3 font-mono">
                                <span className="text-white font-bold">{formatBRL(item.effectiveUnitPrice)}</span>
                                <span className="text-[10px] text-[#71717A]">/{item.unit}</span>
                                {priceScenario !== 'average' && (
                                  <div className="text-[9px] text-[#71717A] line-through">
                                    {formatBRL(item.baseAveragePrice)}
                                  </div>
                                )}
                              </td>

                              {/* Estimated Subtotal */}
                              <td className="py-2.5 px-3 font-mono font-black text-[#00E676] text-right text-sm">
                                {formatBRL(item.totalEstimated)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>

              {/* Actions Footer */}
              {ingredients.length > 0 && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-[#242436] shrink-0">
                  <div className="text-[11px] text-[#71717A]">
                    {copiedList ? '✓ Lista copiada com sucesso!' : 'Envie a cotação via WhatsApp ou dê entrada automática no estoque.'}
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto justify-end">
                    <button
                      onClick={handleCopyShoppingList}
                      disabled={activeSelectedItems.length === 0}
                      className="px-3.5 py-2.5 min-h-[42px] bg-[#1E1B2C] hover:bg-[#28243C] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-[#302B48] transition-all cursor-pointer disabled:opacity-40"
                    >
                      <Copy className="w-3.5 h-3.5 text-[#FFC72C]" />
                      <span>{copiedList ? 'Copiado!' : 'Copiar Lista'}</span>
                    </button>

                    <button
                      onClick={handleSendWhatsApp}
                      disabled={activeSelectedItems.length === 0}
                      className="px-4 py-2.5 min-h-[42px] bg-[#00D26A] hover:bg-[#00B85C] text-black rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-[0_0_12px_rgba(0,210,106,0.3)] disabled:opacity-40"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-black" />
                      <span>Cotar no WhatsApp</span>
                    </button>

                    <button
                      onClick={handleConfirmRestockArrival}
                      disabled={activeSelectedItems.length === 0}
                      className="px-4 py-2.5 min-h-[42px] bg-gradient-to-r from-[#DA291C] to-[#FFC72C] hover:opacity-95 text-black rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-[0_0_16px_rgba(255,199,44,0.3)] disabled:opacity-40"
                      title="Atualiza o estoque real dos insumos selecionados com as quantidades indicadas"
                    >
                      <PackagePlus className="w-4 h-4 text-black" />
                      <span>Dar Entrada no Estoque</span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
