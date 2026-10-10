import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AlertTriangle, 
  Flame, 
  TrendingUp, 
  TrendingDown, 
  ShieldAlert, 
  Boxes, 
  PackageOpen, 
  Send, 
  CheckCircle2, 
  X, 
  Sparkles, 
  ArrowRight, 
  DollarSign, 
  Clock, 
  Sliders, 
  RefreshCw, 
  MessageSquare, 
  Plus, 
  ChevronRight, 
  Bell, 
  ExternalLink,
  Info,
  Check,
  Zap
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Ingredient, Product, Supplier } from '../types';
import { formatBRL, formatPercent } from '../utils/formatters';
import { playBeep, playCashRegister } from '../utils/audio';

export type AlertCategory = 'all' | 'critical_reorder' | 'high_cmv';

export interface UnifiedStockCmvAlert {
  id: string;
  type: 'critical_reorder' | 'warning_reorder' | 'high_cmv';
  severity: 'critical' | 'warning';
  title: string;
  categoryLabel: string;
  // Item references
  itemType: 'ingredient' | 'product';
  itemId: string;
  itemName: string;
  itemCategory: string;
  itemImage?: string;
  
  // Stock specific
  currentStock?: number;
  minimumStock?: number;
  reorderPoint?: number;
  idealStock?: number;
  unit?: string;
  deficitToIdeal?: number;
  predictedRuptureHours?: number;
  supplierName?: string;
  supplierPhone?: string;
  supplierLeadTimeDays?: number;
  costPerUnit?: number;
  
  // CMV specific
  salePrice?: number;
  costPrice?: number;
  cmvPercent?: number;
  targetCmvPercent?: number;
  marginPercent?: number;
  suggestedPrice?: number;
  monthlyVolume?: number;
  monthlyImpactReais?: number;
  
  // Recommendation
  actionRecommendation: string;
  dismissed?: boolean;
}

interface DashboardStockCmvAlertsProps {
  onNavigateToStock?: () => void;
  onNavigateToMenu?: () => void;
}

export const DashboardStockCmvAlerts: React.FC<DashboardStockCmvAlertsProps> = ({
  onNavigateToStock,
  onNavigateToMenu
}) => {
  const { 
    ingredients, 
    products, 
    suppliers, 
    updateStock, 
    quickRestockIngredient, 
    updateProduct,
    setCurrentView,
    setIsAICopilotOpen,
    tenant
  } = useApp();

  // Filter and threshold state
  const [selectedCategory, setSelectedCategory] = useState<AlertCategory>('all');
  const [cmvThresholdPercent, setCmvThresholdPercent] = useState<number>(32.0); // CMV > 32% triggers alert
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>([]);
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);

  // Quick Restock Modal State
  const [restockModalItem, setRestockModalItem] = useState<{
    ingredient: Ingredient;
    suggestedQty: number;
    supplier?: Supplier;
  } | null>(null);
  const [customRestockQty, setCustomRestockQty] = useState<number>(0);
  const [restockSuccessMessage, setRestockSuccessMessage] = useState<string | null>(null);

  // Price adjustment confirmation modal state
  const [priceAdjustItem, setPriceAdjustItem] = useState<{
    product: Product;
    suggestedPrice: number;
    newCmv: number;
  } | null>(null);

  // Build unified alerts dynamically from live state
  const alerts: UnifiedStockCmvAlert[] = useMemo(() => {
    const list: UnifiedStockCmvAlert[] = [];

    // 1. Stock / Reorder Point Alerts (from ingredients)
    ingredients.forEach(ing => {
      const isCritical = ing.status === 'critical' || ing.currentStock <= ing.minimumStock;
      const isWarning = !isCritical && (ing.status === 'warning' || ing.currentStock <= ing.minimumStock * 1.3);

      if (isCritical || isWarning) {
        // Look up supplier
        const sup = suppliers.find(s => s.name.toLowerCase().includes(ing.supplier.toLowerCase()) || ing.supplier.toLowerCase().includes(s.name.toLowerCase())) 
          || suppliers[0];

        const reorderPoint = ing.minimumStock; // Ponto de Pedido Crítico
        const deficitToIdeal = Math.max(0, Number((ing.idealStock - ing.currentStock).toFixed(2)));
        const deficitPercent = ing.minimumStock > 0 
          ? Math.round(((ing.minimumStock - ing.currentStock) / ing.minimumStock) * 100) 
          : 0;

        list.push({
          id: `stock_${ing.id}`,
          type: isCritical ? 'critical_reorder' : 'warning_reorder',
          severity: isCritical ? 'critical' : 'warning',
          title: isCritical 
            ? `Ruptura Iminente: Abaixo do Ponto de Pedido (${deficitPercent > 0 ? `-${deficitPercent}%` : 'Esgotando'})` 
            : `Estoque em Nível de Alerta (Aproximando do Ponto de Pedido)`,
          categoryLabel: 'Ponto de Pedido Crítico',
          itemType: 'ingredient',
          itemId: ing.id,
          itemName: ing.name,
          itemCategory: ing.category,
          currentStock: ing.currentStock,
          minimumStock: ing.minimumStock,
          reorderPoint,
          idealStock: ing.idealStock,
          unit: ing.unit,
          deficitToIdeal,
          predictedRuptureHours: ing.predictedRuptureHours || (isCritical ? 8 : 24),
          supplierName: ing.supplier,
          supplierPhone: sup?.phone || '11987654321',
          supplierLeadTimeDays: ing.leadTimeDays || sup?.leadTimeDays || 2,
          costPerUnit: ing.costPerUnit,
          actionRecommendation: isCritical 
            ? `Emitir pedido de compra de emergência para ${ing.supplier} (${deficitToIdeal} ${ing.unit} para atingir o estoque de segurança).`
            : `Programar reposição preventiva com o fornecedor nos próximos ${ing.leadTimeDays || 2} dias.`
        });
      }
    });

    // 2. High CMV Alerts (from products)
    products.forEach(prod => {
      if (!prod.available || prod.price <= 0) return;

      const currentCmv = Number(((prod.costPrice / prod.price) * 100).toFixed(1));

      if (currentCmv >= cmvThresholdPercent) {
        const excessCmv = Number((currentCmv - 30.0).toFixed(1));
        const targetCmv = 29.5;
        // Suggested price to bring CMV to 29.5%
        const suggested = Number((prod.costPrice / (targetCmv / 100)).toFixed(2));
        const volume = prod.salesVolume30Days || 120;
        const currentMargin = prod.price - prod.costPrice;
        const targetMargin = suggested - prod.costPrice;
        const monthlyImpactReais = Math.round((targetMargin - currentMargin) * volume);

        list.push({
          id: `cmv_${prod.id}`,
          type: 'high_cmv',
          severity: currentCmv >= 35.0 ? 'critical' : 'warning',
          title: `CMV Elevado: ${currentCmv}% (Meta: <30.0%)`,
          categoryLabel: 'CMV & Margem Comprimida',
          itemType: 'product',
          itemId: prod.id,
          itemName: prod.name,
          itemCategory: prod.category,
          itemImage: prod.imageUrl,
          salePrice: prod.price,
          costPrice: prod.costPrice,
          cmvPercent: currentCmv,
          targetCmvPercent: 30.0,
          marginPercent: Number((100 - currentCmv).toFixed(1)),
          suggestedPrice: suggested,
          monthlyVolume: volume,
          monthlyImpactReais,
          costPerUnit: prod.costPrice,
          actionRecommendation: `Reajustar preço de venda de ${formatBRL(prod.price)} para ${formatBRL(suggested)} ou otimizar ficha técnica para normalizar o CMV em ~29.5%.`
        });
      }
    });

    // Sort by severity (critical first) then by impact
    return list.sort((a, b) => {
      if (a.severity === 'critical' && b.severity !== 'critical') return -1;
      if (a.severity !== 'critical' && b.severity === 'critical') return 1;
      return 0;
    });
  }, [ingredients, products, suppliers, cmvThresholdPercent]);

  // Active (non-dismissed) alerts
  const activeAlerts = useMemo(() => {
    return alerts.filter(a => !dismissedAlertIds.includes(a.id));
  }, [alerts, dismissedAlertIds]);

  // Filtered by selected category tab
  const filteredAlerts = useMemo(() => {
    if (selectedCategory === 'critical_reorder') {
      return activeAlerts.filter(a => a.type === 'critical_reorder' || a.type === 'warning_reorder');
    }
    if (selectedCategory === 'high_cmv') {
      return activeAlerts.filter(a => a.type === 'high_cmv');
    }
    return activeAlerts;
  }, [activeAlerts, selectedCategory]);

  // Counts for tabs
  const criticalStockCount = activeAlerts.filter(a => a.type === 'critical_reorder' || a.type === 'warning_reorder').length;
  const highCmvCount = activeAlerts.filter(a => a.type === 'high_cmv').length;
  const totalAlertsCount = activeAlerts.length;

  // Handlers
  const handleDismissAlert = (id: string) => {
    playBeep(600, 0.05);
    setDismissedAlertIds(prev => [...prev, id]);
  };

  const handleOpenRestockModal = (alert: UnifiedStockCmvAlert) => {
    playBeep(850, 0.06);
    const ing = ingredients.find(i => i.id === alert.itemId);
    if (!ing) return;
    const sup = suppliers.find(s => s.name.toLowerCase().includes(ing.supplier.toLowerCase()) || ing.supplier.toLowerCase().includes(s.name.toLowerCase())) 
      || suppliers[0];
    const suggested = alert.deficitToIdeal || Math.max(1, ing.idealStock - ing.currentStock);
    setRestockModalItem({
      ingredient: ing,
      suggestedQty: suggested,
      supplier: sup
    });
    setCustomRestockQty(suggested);
  };

  const handleConfirmDirectRestock = () => {
    if (!restockModalItem) return;
    const { ingredient } = restockModalItem;
    const addQty = customRestockQty > 0 ? customRestockQty : restockModalItem.suggestedQty;
    
    quickRestockIngredient(ingredient.id, addQty);
    playCashRegister();

    setRestockSuccessMessage(`Entrada de +${addQty} ${ingredient.unit} de ${ingredient.name} registrada com sucesso!`);
    setTimeout(() => {
      setRestockSuccessMessage(null);
      setRestockModalItem(null);
    }, 1800);
  };

  const handleSendWhatsAppOrder = () => {
    if (!restockModalItem) return;
    const { ingredient, supplier } = restockModalItem;
    const qty = customRestockQty > 0 ? customRestockQty : restockModalItem.suggestedQty;
    const estCost = qty * ingredient.costPerUnit;
    const phone = supplier?.phone || '5511987654321';

    const text = encodeURIComponent(
      `*PEDIDO DE REPOSIÇÃO DE ESTOQUE - ${tenant?.name ? tenant.name.toUpperCase() : 'LANCHONETE DULCI'}*\n\n` +
      `Olá *${supplier?.name || ingredient.supplier}*!\n` +
      `Aqui é da equipe de compras da *${tenant?.name || 'Lanchonete Dulci'}*.\n\n` +
      `Precisamos com URGÊNCIA do seguinte pedido para reposição:\n` +
      `📦 *Insumo:* ${ingredient.name}\n` +
      `⚖️ *Quantidade Solicitada:* ${qty} ${ingredient.unit}\n` +
      `💰 *Custo Previsto:* ${formatBRL(estCost)}\n` +
      `🚚 *Prazo de Entrega Estimado:* ${ingredient.leadTimeDays || 2} dia(s)\n\n` +
      `Por favor, confirme a disponibilidade e previsão de entrega. Obrigado!`
    );

    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
    playBeep(950, 0.08);
  };

  const handleApplySuggestedPrice = (alert: UnifiedStockCmvAlert) => {
    const prod = products.find(p => p.id === alert.itemId);
    if (!prod || !alert.suggestedPrice) return;

    setPriceAdjustItem({
      product: prod,
      suggestedPrice: alert.suggestedPrice,
      newCmv: Number(((prod.costPrice / alert.suggestedPrice) * 100).toFixed(1))
    });
  };

  const handleConfirmPriceAdjust = () => {
    if (!priceAdjustItem) return;
    const { product, suggestedPrice } = priceAdjustItem;
    const updated: Product = {
      ...product,
      price: suggestedPrice,
      marginPercent: Number((((suggestedPrice - product.costPrice) / suggestedPrice) * 100).toFixed(1))
    };
    updateProduct(updated);
    playCashRegister();
    setPriceAdjustItem(null);
  };

  return (
    <div id="central-alertas-estoque-cmv" className="space-y-4">
      {/* Dynamic Summary Banner / Notification Bar */}
      <motion.div 
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={`p-5 rounded-3xl border transition-all shadow-xl relative overflow-hidden ${
          totalAlertsCount > 0 
            ? 'bg-gradient-to-r from-[#181115] via-[#1A1420] to-[#14141E] border-[#DA291C]/40 shadow-[0_0_24px_rgba(218,41,28,0.15)]' 
            : 'bg-[#12121A] border-[#00E676]/30 shadow-[0_0_20px_rgba(0,230,118,0.1)]'
        }`}
      >
        {/* Glow accents */}
        <div className="absolute -top-10 -right-10 w-64 h-32 bg-[#DA291C]/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-64 h-32 bg-[#FFC72C]/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
              criticalStockCount > 0 
                ? 'bg-[#DA291C]/25 text-[#DA291C] border border-[#DA291C]/50 shadow-[0_0_16px_rgba(218,41,28,0.35)]' 
                : highCmvCount > 0 
                ? 'bg-[#FF6B00]/25 text-[#FF6B00] border border-[#FF6B00]/50 shadow-[0_0_16px_rgba(255,107,0,0.35)]' 
                : 'bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/40'
            }`}>
              {totalAlertsCount > 0 ? (
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              ) : (
                <CheckCircle2 className="w-6 h-6" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-xs font-black uppercase tracking-wider text-white">
                  Radar Operacional: Estoque Crítico & CMV
                </span>
                {totalAlertsCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black font-mono bg-[#DA291C] text-white shadow-[0_0_10px_rgba(218,41,28,0.5)]">
                    {totalAlertsCount} {totalAlertsCount === 1 ? 'ALERTA ATIVO' : 'ALERTAS ATIVOS'}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-[#A1A1AA] mt-1 leading-snug">
                {totalAlertsCount > 0 ? (
                  <span>
                    <strong className="text-[#FF2B4E]">{criticalStockCount} insumo(s)</strong> abaixo do ponto de pedido crítico (risco de ruptura) e <strong className="text-[#FFC72C]">{highCmvCount} produto(s)</strong> com CMV elevado (&gt;{cmvThresholdPercent}%).
                  </span>
                ) : (
                  <span className="text-[#00E676] font-medium">
                    Todos os insumos estão acima do ponto de pedido e o CMV de todos os pratos está saudável (&lt;{cmvThresholdPercent}%).
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0">
            <button
              onClick={() => setIsConfigOpen(!isConfigOpen)}
              className="px-3.5 py-2.5 rounded-2xl bg-[#1E1E2E] hover:bg-[#28283C] text-xs font-bold text-[#A1A1AA] hover:text-white border border-[#2D2D42] transition-colors flex items-center gap-2 cursor-pointer"
              title="Configurar Metas de Alerta"
            >
              <Sliders className="w-4 h-4 text-[#FFC72C]" />
              <span className="hidden sm:inline">Metas</span>
            </button>

            {onNavigateToStock && (
              <button
                onClick={onNavigateToStock}
                className="px-4 py-2.5 rounded-2xl bg-[#181826] hover:bg-[#202034] text-xs font-bold text-[#00D2FF] hover:text-white border border-[#00D2FF]/30 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <Boxes className="w-4 h-4" />
                <span>Gestão de Estoque</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}

            {criticalStockCount > 0 && (
              <button
                onClick={() => {
                  setSelectedCategory('critical_reorder');
                  playBeep(800, 0.05);
                }}
                className="flex-1 md:flex-none px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#DA291C] to-[#FF2B4E] hover:from-[#B7180D] hover:to-[#DA291C] text-xs font-black text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_16px_rgba(218,41,28,0.4)]"
              >
                <Zap className="w-4 h-4 text-[#FFC72C]" />
                <span>Repor Imediato ({criticalStockCount})</span>
              </button>
            )}
          </div>
        </div>

        {/* Expandable Threshold Configuration */}
        <AnimatePresence>
          {isConfigOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-[#26263A] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              <div className="p-3.5 rounded-2xl bg-[#12121A] border border-[#242436]">
                <label className="text-[11px] font-bold text-[#A1A1AA] block mb-1">
                  Gatilho de CMV Elevado (% do Preço)
                </label>
                <div className="flex items-center gap-2 mt-1">
                  {[30.0, 32.0, 35.0].map(val => (
                    <button
                      key={val}
                      onClick={() => {
                        setCmvThresholdPercent(val);
                        playBeep(700, 0.04);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                        cmvThresholdPercent === val
                          ? 'bg-[#FF6B00] text-white shadow-[0_0_10px_rgba(255,107,0,0.4)]'
                          : 'bg-[#1C1C2C] text-[#A1A1AA] hover:text-white border border-[#2A2A3E]'
                      }`}
                    >
                      &gt; {val}%
                    </button>
                  ))}
                  <span className="text-[11px] text-[#71717A] ml-1">Atual: {cmvThresholdPercent}%</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#12121A] border border-[#242436]">
                <label className="text-[11px] font-bold text-[#A1A1AA] block mb-1">
                  Critério de Ponto de Pedido
                </label>
                <div className="text-xs text-[#E4E4E7] font-semibold mt-1">
                  Estoque Atual &le; Estoque Mínimo de Segurança
                </div>
                <div className="text-[10px] text-[#71717A] mt-0.5">
                  Calculado com lead time de cada fornecedor
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#12121A] border border-[#242436] flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white">Alertas Dispensados</div>
                  <div className="text-[10px] text-[#71717A]">{dismissedAlertIds.length} alertas ocultados</div>
                </div>
                {dismissedAlertIds.length > 0 && (
                  <button
                    onClick={() => {
                      setDismissedAlertIds([]);
                      playBeep(900, 0.05);
                    }}
                    className="text-xs font-bold text-[#00E676] hover:underline cursor-pointer"
                  >
                    Restaurar Todos
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Main Section Card: Notification Center */}
      <motion.div 
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="p-6 rounded-3xl bg-[#12121A] border border-[#242438] shadow-2xl space-y-6"
      >
        {/* Section Header with Category Tabs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#202030] pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#DA291C]/20 border border-[#DA291C]/40 text-[#FFC72C] flex items-center justify-center shadow-[0_0_12px_rgba(218,41,28,0.3)]">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                <span>Notificações de Ruptura & Custo de Mercadoria</span>
              </h2>
              <p className="text-xs text-[#71717A]">
                Alertas automáticos baseados no ritmo de vendas e consumo de insumos na cozinha
              </p>
            </div>
          </div>

          {/* Interactive Tabs */}
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[#181826] border border-[#26263A] w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => {
                setSelectedCategory('all');
                playBeep(750, 0.04);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                selectedCategory === 'all'
                  ? 'bg-[#222234] text-white border border-[#3A3A54] shadow-md'
                  : 'text-[#A1A1AA] hover:text-white'
              }`}
            >
              <span>Todos</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
                totalAlertsCount > 0 ? 'bg-[#DA291C] text-white' : 'bg-[#262638] text-[#A1A1AA]'
              }`}>
                {totalAlertsCount}
              </span>
            </button>

            <button
              onClick={() => {
                setSelectedCategory('critical_reorder');
                playBeep(750, 0.04);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                selectedCategory === 'critical_reorder'
                  ? 'bg-[#DA291C]/25 text-[#FF2B4E] border border-[#DA291C]/50 shadow-[0_0_12px_rgba(218,41,28,0.25)]'
                  : 'text-[#A1A1AA] hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#DA291C] animate-pulse" />
              <span>Ponto de Pedido Crítico</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black bg-[#DA291C]/30 text-[#FF2B4E]">
                {criticalStockCount}
              </span>
            </button>

            <button
              onClick={() => {
                setSelectedCategory('high_cmv');
                playBeep(750, 0.04);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                selectedCategory === 'high_cmv'
                  ? 'bg-[#FF6B00]/25 text-[#FFC72C] border border-[#FF6B00]/50 shadow-[0_0_12px_rgba(255,107,0,0.25)]'
                  : 'text-[#A1A1AA] hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#FF6B00]" />
              <span>CMV Elevado</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black bg-[#FF6B00]/30 text-[#FFC72C]">
                {highCmvCount}
              </span>
            </button>
          </div>
        </div>

        {/* Notifications Grid / List */}
        {filteredAlerts.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-12 px-6 text-center rounded-2xl bg-[#161622] border border-[#242436] space-y-3"
          >
            <div className="w-14 h-14 rounded-full bg-[#00E676]/15 border border-[#00E676]/30 text-[#00E676] mx-auto flex items-center justify-center shadow-[0_0_16px_rgba(0,230,118,0.25)]">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-white">Nenhum Alerta Pendente nesta Categoria!</h3>
            <p className="text-xs text-[#A1A1AA] max-w-md mx-auto leading-relaxed">
              Todos os itens de estoque estão devidamente abastecidos e a lucratividade dos pratos está dentro da meta saudável estabelecida.
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <AnimatePresence mode="popLayout">
              {filteredAlerts.map(alert => (
                <motion.div
                  key={alert.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -10 }}
                  whileHover={{ scale: 1.01, y: -2 }}
                  transition={{ 
                    layout: { type: 'spring', stiffness: 400, damping: 28 },
                    duration: 0.2 
                  }}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 shadow-lg group relative ${
                    alert.type === 'critical_reorder'
                      ? 'bg-gradient-to-br from-[#1A1215] via-[#16141D] to-[#12121A] border-[#DA291C]/45 hover:border-[#DA291C]/80 shadow-[0_0_18px_rgba(218,41,28,0.12)]'
                      : alert.type === 'warning_reorder'
                      ? 'bg-[#15141D] border-[#FFC72C]/35 hover:border-[#FFC72C]/70 shadow-[0_0_18px_rgba(255,199,44,0.08)]'
                      : 'bg-gradient-to-br from-[#1A1512] via-[#16151D] to-[#12121A] border-[#FF6B00]/45 hover:border-[#FF6B00]/80 shadow-[0_0_18px_rgba(255,107,0,0.12)]'
                  }`}
                >
                  {/* Top Bar of Card */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      {/* Badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                          alert.severity === 'critical'
                            ? 'bg-[#DA291C]/25 text-[#FF2B4E] border border-[#DA291C]/50 shadow-[0_0_8px_rgba(218,41,28,0.3)]'
                            : 'bg-[#FF6B00]/25 text-[#FFC72C] border border-[#FF6B00]/50'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${alert.severity === 'critical' ? 'bg-[#FF2B4E] animate-ping' : 'bg-[#FFC72C]'}`} />
                          <span>{alert.categoryLabel}</span>
                        </span>

                        <span className="text-[10px] font-bold text-[#71717A] px-2 py-0.5 rounded-md bg-[#20202E]">
                          {alert.itemCategory}
                        </span>

                        {alert.predictedRuptureHours !== undefined && (
                          <span className="text-[10px] font-mono font-bold text-[#FFC72C] flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FFC72C]/10 border border-[#FFC72C]/25">
                            <Clock className="w-3 h-3" />
                            <span>Esgota em ~{alert.predictedRuptureHours}h</span>
                          </span>
                        )}
                      </div>

                      {/* Item Name */}
                      <div className="flex items-center gap-2.5 pt-0.5">
                        {alert.itemImage && (
                          <img 
                            src={alert.itemImage} 
                            alt={alert.itemName}
                            className="w-10 h-10 rounded-xl object-cover border border-[#2D2D42] shrink-0" 
                          />
                        )}
                        <h4 className="text-sm sm:text-base font-black text-white truncate tracking-tight">
                          {alert.itemName}
                        </h4>
                      </div>
                    </div>

                    {/* Dismiss Button */}
                    <button
                      onClick={() => handleDismissAlert(alert.id)}
                      className="text-[#71717A] hover:text-white p-1 rounded-lg hover:bg-[#202030] transition-colors cursor-pointer shrink-0"
                      title="Dispensar alerta"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Visual Progress / Metrics Section */}
                  {alert.itemType === 'ingredient' ? (
                    /* Stock Reorder Point Visualizer */
                    <div className="p-3.5 rounded-xl bg-[#101018] border border-[#222232] space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#A1A1AA] flex items-center gap-1.5">
                          <Boxes className="w-3.5 h-3.5 text-[#FF2B4E]" />
                          <span>Estoque Atual vs. Ponto de Pedido</span>
                        </span>
                        <span className="font-mono font-black text-white">
                          <strong className={alert.severity === 'critical' ? 'text-[#FF2B4E]' : 'text-[#FFC72C]'}>
                            {alert.currentStock} {alert.unit}
                          </strong>
                          <span className="text-[#71717A]"> / Min {alert.minimumStock} {alert.unit}</span>
                        </span>
                      </div>

                      {/* Visual Stock Bar */}
                      <div className="space-y-1">
                        <div className="w-full h-3 rounded-full bg-[#1E1E2C] overflow-hidden p-0.5 relative">
                          {/* Reorder marker line */}
                          {alert.idealStock && alert.minimumStock && (
                            <div 
                              className="absolute top-0 bottom-0 w-0.5 bg-[#FFC72C] z-10 shadow-[0_0_6px_#FFC72C]"
                              style={{ left: `${Math.min(100, (alert.minimumStock / alert.idealStock) * 100)}%` }}
                              title={`Ponto de Pedido Crítico: ${alert.minimumStock} ${alert.unit}`}
                            />
                          )}
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              alert.severity === 'critical'
                                ? 'bg-gradient-to-r from-[#DA291C] to-[#FF2B4E] shadow-[0_0_10px_rgba(218,41,28,0.6)]'
                                : 'bg-gradient-to-r from-[#FF6B00] to-[#FFC72C]'
                            }`}
                            style={{ 
                              width: `${Math.max(6, Math.min(100, ((alert.currentStock || 0) / (alert.idealStock || 1)) * 100))}%` 
                            }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-[#71717A] font-mono px-0.5">
                          <span>0 {alert.unit}</span>
                          <span className="text-[#FFC72C]">Ponto Crítico: {alert.minimumStock} {alert.unit}</span>
                          <span>Ideal: {alert.idealStock} {alert.unit}</span>
                        </div>
                      </div>

                      {/* Supplier & Deficit Details */}
                      <div className="pt-1 flex items-center justify-between text-xs text-[#A1A1AA] border-t border-[#1C1C2A] flex-wrap gap-2">
                        <div>
                          Fornecedor: <strong className="text-white">{alert.supplierName}</strong> (Lead: {alert.supplierLeadTimeDays}d)
                        </div>
                        <div className="font-mono text-[#00E676] font-bold">
                          Comprar: +{alert.deficitToIdeal} {alert.unit} (~{formatBRL((alert.deficitToIdeal || 0) * (alert.costPerUnit || 0))})
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* High CMV & Margin Visualizer */
                    <div className="p-3.5 rounded-xl bg-[#101018] border border-[#222232] space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#A1A1AA] flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5 text-[#FF6B00]" />
                          <span>CMV Atual vs. Teto Saudável (30%)</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-[#FF2B4E] text-sm">
                            {alert.cmvPercent}%
                          </span>
                          <span className="text-[10px] text-[#71717A] font-medium">(Teto &lt; 30%)</span>
                        </div>
                      </div>

                      {/* Visual CMV Bar */}
                      <div className="space-y-1">
                        <div className="w-full h-3 rounded-full bg-[#1E1E2C] overflow-hidden p-0.5 relative">
                          {/* 30% Healthy target benchmark line */}
                          <div 
                            className="absolute top-0 bottom-0 w-0.5 bg-[#00E676] z-10 shadow-[0_0_6px_#00E676]"
                            style={{ left: '30%' }}
                            title="Meta Saudável: 30%"
                          />
                          <div 
                            className="h-full rounded-full bg-gradient-to-r from-[#FF6B00] to-[#DA291C] shadow-[0_0_10px_rgba(255,107,0,0.5)] transition-all duration-500"
                            style={{ width: `${Math.min(100, alert.cmvPercent || 0)}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-[#71717A] font-mono px-0.5">
                          <span>0%</span>
                          <span className="text-[#00E676] font-bold">Meta 30%</span>
                          <span className="text-[#FF2B4E] font-bold">Atual {alert.cmvPercent}%</span>
                          <span>100%</span>
                        </div>
                      </div>

                      {/* Price, Cost and Margin breakdown */}
                      <div className="pt-1 flex items-center justify-between text-xs border-t border-[#1C1C2A] flex-wrap gap-2">
                        <div className="text-[#A1A1AA]">
                          Preço: <strong className="text-white font-mono">{formatBRL(alert.salePrice || 0)}</strong> • Custo: <strong className="text-[#FF6B00] font-mono">{formatBRL(alert.costPrice || 0)}</strong>
                        </div>
                        <div className="text-[#00E676] font-bold text-xs">
                          Margem: {alert.marginPercent}% ({formatBRL((alert.salePrice || 0) - (alert.costPrice || 0))})
                        </div>
                      </div>

                      {/* Recommendation text */}
                      {alert.suggestedPrice && (
                        <div className="p-2.5 rounded-lg bg-[#FF6B00]/10 border border-[#FF6B00]/25 text-[11px] text-[#FFC72C] flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 shrink-0 text-[#FFC72C]" />
                            <span>Sugerido reajustar para <strong>{formatBRL(alert.suggestedPrice)}</strong> p/ restabelecer CMV 29.5%</span>
                          </div>
                          {alert.monthlyImpactReais !== undefined && (
                            <span className="font-mono text-[#00E676] font-bold shrink-0">
                              +{formatBRL(alert.monthlyImpactReais)}/mês
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Immediate Action Buttons */}
                  <div className="flex items-center gap-2.5 pt-1 flex-wrap">
                    {alert.itemType === 'ingredient' ? (
                      <>
                        <button
                          onClick={() => handleOpenRestockModal(alert)}
                          className="flex-1 py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-[#DA291C] to-[#FF2B4E] hover:from-[#B7180D] hover:to-[#DA291C] text-white text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_14px_rgba(218,41,28,0.35)]"
                        >
                          <Send className="w-3.5 h-3.5 text-[#FFC72C]" />
                          <span>Pedir no WhatsApp</span>
                        </button>

                        <button
                          onClick={() => handleOpenRestockModal(alert)}
                          className="py-2.5 px-3.5 rounded-xl bg-[#1C1C2C] hover:bg-[#25253A] text-[#00E676] hover:text-white border border-[#00E676]/30 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                          title="Dar entrada no estoque"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Entrada Rápida</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleApplySuggestedPrice(alert)}
                          className="flex-1 py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] hover:from-[#D95B00] hover:to-[#FF6B00] text-white text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_14px_rgba(255,107,0,0.35)]"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-white" />
                          <span>Aplicar Preço {formatBRL(alert.suggestedPrice || 0)}</span>
                        </button>

                        <button
                          onClick={() => {
                            if (onNavigateToMenu) {
                              onNavigateToMenu();
                            } else {
                              setCurrentView('cardapio_bcg');
                            }
                            playBeep(850, 0.05);
                          }}
                          className="py-2.5 px-3.5 rounded-xl bg-[#1C1C2C] hover:bg-[#25253A] text-[#00D2FF] hover:text-white border border-[#00D2FF]/30 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Engenharia BCG</span>
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* MODAL 1: Quick Purchase Order / Restock Modal (WhatsApp & Direct Entry) */}
      <AnimatePresence>
        {restockModalItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-lg p-6 rounded-3xl bg-[#14141E] border border-[#DA291C]/50 shadow-2xl space-y-5 relative"
            >
              {/* Close */}
              <button
                onClick={() => setRestockModalItem(null)}
                className="absolute top-5 right-5 text-[#71717A] hover:text-white p-1 rounded-lg hover:bg-[#222234] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#DA291C]/20 border border-[#DA291C]/40 text-[#FF2B4E] flex items-center justify-center shadow-[0_0_12px_rgba(218,41,28,0.3)]">
                  <PackageOpen className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs font-black text-[#FF2B4E] uppercase tracking-wider">
                    Pedido de Compra & Reposição Express
                  </div>
                  <h3 className="text-lg font-black text-white">
                    {restockModalItem.ingredient.name}
                  </h3>
                </div>
              </div>

              {/* Success Message Banner if confirmed */}
              {restockSuccessMessage && (
                <div className="p-3 rounded-2xl bg-[#00E676]/20 border border-[#00E676]/40 text-[#00E676] text-xs font-bold flex items-center gap-2 animate-pulse">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{restockSuccessMessage}</span>
                </div>
              )}

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-[#101018] border border-[#222232] text-xs">
                <div>
                  <span className="text-[#71717A] block">Estoque Atual:</span>
                  <span className="text-base font-black font-mono text-[#FF2B4E]">
                    {restockModalItem.ingredient.currentStock} {restockModalItem.ingredient.unit}
                  </span>
                </div>
                <div>
                  <span className="text-[#71717A] block">Ponto de Pedido Crítico:</span>
                  <span className="text-base font-black font-mono text-[#FFC72C]">
                    {restockModalItem.ingredient.minimumStock} {restockModalItem.ingredient.unit}
                  </span>
                </div>
                <div>
                  <span className="text-[#71717A] block">Estoque Ideal de Segurança:</span>
                  <span className="text-sm font-black font-mono text-white">
                    {restockModalItem.ingredient.idealStock} {restockModalItem.ingredient.unit}
                  </span>
                </div>
                <div>
                  <span className="text-[#71717A] block">Custo Unitário:</span>
                  <span className="text-sm font-black font-mono text-[#00E676]">
                    {formatBRL(restockModalItem.ingredient.costPerUnit)} / {restockModalItem.ingredient.unit}
                  </span>
                </div>
              </div>

              {/* Fornecedor card */}
              <div className="p-3.5 rounded-2xl bg-[#181826] border border-[#26263A] flex items-center justify-between text-xs">
                <div>
                  <div className="text-[#71717A] text-[10px] uppercase font-bold">Fornecedor Homologado</div>
                  <div className="text-white font-bold text-sm mt-0.5">{restockModalItem.ingredient.supplier}</div>
                  <div className="text-[#A1A1AA] text-[11px]">Prazo de entrega: ~{restockModalItem.ingredient.leadTimeDays || 2} dias</div>
                </div>
                <div className="text-right">
                  <div className="text-[#71717A] text-[10px] uppercase font-bold">WhatsApp</div>
                  <div className="text-[#00D2FF] font-mono font-bold">{restockModalItem.supplier?.phone || '(11) 98765-4321'}</div>
                </div>
              </div>

              {/* Quantity to restock input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#E4E4E7] flex items-center justify-between">
                  <span>Quantidade a Comprar / Receber ({restockModalItem.ingredient.unit}):</span>
                  <span className="text-[#00E676] font-mono font-black">
                    Total: {formatBRL((customRestockQty || 0) * restockModalItem.ingredient.costPerUnit)}
                  </span>
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCustomRestockQty(prev => Math.max(1, Number((prev - 5).toFixed(1))))}
                    className="w-10 h-10 rounded-xl bg-[#202030] text-white font-black hover:bg-[#2A2A40] cursor-pointer flex items-center justify-center text-sm"
                  >
                    -5
                  </button>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    value={customRestockQty}
                    onChange={(e) => setCustomRestockQty(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-[#101018] border border-[#2E2E44] text-white font-mono font-black text-center text-lg focus:outline-none focus:border-[#DA291C]"
                  />
                  <button
                    onClick={() => setCustomRestockQty(prev => Number((prev + 5).toFixed(1)))}
                    className="w-10 h-10 rounded-xl bg-[#202030] text-white font-black hover:bg-[#2A2A40] cursor-pointer flex items-center justify-center text-sm"
                  >
                    +5
                  </button>
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#71717A]">
                  <span>Sugerido para atingir Estoque Ideal: <strong>{restockModalItem.suggestedQty} {restockModalItem.ingredient.unit}</strong></span>
                  <button
                    onClick={() => setCustomRestockQty(restockModalItem.suggestedQty)}
                    className="text-[#FFC72C] hover:underline font-bold cursor-pointer"
                  >
                    Usar Sugerido
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  onClick={handleSendWhatsAppOrder}
                  className="py-3 px-4 rounded-2xl bg-[#00E676] hover:bg-[#00C853] text-[#0A0A0E] text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_16px_rgba(0,230,118,0.35)]"
                >
                  <MessageSquare className="w-4 h-4 fill-current" />
                  <span>Enviar WhatsApp Fornecedor</span>
                </button>

                <button
                  onClick={handleConfirmDirectRestock}
                  className="py-3 px-4 rounded-2xl bg-gradient-to-r from-[#DA291C] to-[#FF2B4E] hover:from-[#B7180D] hover:to-[#DA291C] text-white text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_16px_rgba(218,41,28,0.35)]"
                >
                  <Check className="w-4 h-4" />
                  <span>Registrar Entrada (+{customRestockQty})</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Price Adjustment Confirmation for High CMV */}
      <AnimatePresence>
        {priceAdjustItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-md p-6 rounded-3xl bg-[#14141E] border border-[#FF6B00]/50 shadow-2xl space-y-5 relative"
            >
              <button
                onClick={() => setPriceAdjustItem(null)}
                className="absolute top-5 right-5 text-[#71717A] hover:text-white p-1 rounded-lg hover:bg-[#222234] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#FF6B00]/20 border border-[#FF6B00]/40 text-[#FFC72C] flex items-center justify-center shadow-[0_0_12px_rgba(255,107,0,0.3)]">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs font-black text-[#FF6B00] uppercase tracking-wider">
                    Otimização de Preço & Margem
                  </div>
                  <h3 className="text-base font-black text-white">
                    {priceAdjustItem.product.name}
                  </h3>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#101018] border border-[#222232] space-y-3 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-[#1C1C2A]">
                  <span className="text-[#A1A1AA]">Preço de Venda Atual:</span>
                  <span className="font-mono font-black text-white">{formatBRL(priceAdjustItem.product.price)}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-[#1C1C2A]">
                  <span className="text-[#A1A1AA]">Custo dos Insumos (Ficha Técnica):</span>
                  <span className="font-mono font-black text-[#FF6B00]">{formatBRL(priceAdjustItem.product.costPrice)}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-[#1C1C2A]">
                  <span className="text-[#A1A1AA]">CMV Atual:</span>
                  <span className="font-mono font-black text-[#FF2B4E]">
                    {((priceAdjustItem.product.costPrice / priceAdjustItem.product.price) * 100).toFixed(1)}% (Comprimido)
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-white font-bold">Novo Preço Sugerido:</span>
                  <span className="font-mono font-black text-[#00E676] text-base">
                    {formatBRL(priceAdjustItem.suggestedPrice)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#A1A1AA]">
                  <span>Novo CMV Resultante:</span>
                  <span className="text-[#00E676] font-mono font-bold">{priceAdjustItem.newCmv}% (Saudável &lt; 30%)</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[#00E676]/10 border border-[#00E676]/30 text-xs text-[#00E676] flex items-center gap-2">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>O novo preço será aplicado imediatamente no cardápio digital, PDV e app dos atendentes.</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setPriceAdjustItem(null)}
                  className="flex-1 py-3 px-4 rounded-2xl bg-[#1C1C2C] hover:bg-[#25253A] text-xs font-bold text-[#A1A1AA] hover:text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmPriceAdjust}
                  className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] hover:from-[#D95B00] hover:to-[#FF6B00] text-xs font-black text-white transition-all cursor-pointer shadow-[0_0_16px_rgba(255,107,0,0.4)]"
                >
                  Confirmar Novo Preço
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
