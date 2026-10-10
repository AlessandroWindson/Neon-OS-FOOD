import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  UtensilsCrossed, 
  Sparkles, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Star, 
  AlertCircle, 
  TrendingUp, 
  DollarSign, 
  Boxes, 
  CheckCircle2, 
  X,
  HelpCircle,
  Flame,
  LayoutGrid,
  ScatterChart as ScatterIcon,
  Sliders,
  ArrowRight,
  TrendingDown,
  Info,
  Layers,
  Award,
  Zap,
  Target,
  BarChart3,
  Filter,
  Download,
  FileSpreadsheet,
  FileText,
  QrCode,
  Camera,
  Eye
} from 'lucide-react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell
} from 'recharts';
import { useApp } from '../context/AppContext';
import { Product, BCGClassification } from '../types';
import { formatBRL, formatPercent } from '../utils/formatters';
import { playBeep, playCashRegister } from '../utils/audio';
import { MenuEngineeringExportModal } from './MenuEngineeringExportModal';
import { MenuEngineeringAlerts } from './MenuEngineeringAlerts';
import { PriceElasticityModal } from './PriceElasticityModal';
import { CatalogoPdfExportModal } from './CatalogoPdfExportModal';
import { ProductImageGrid, FOOD_PRESET_IMAGES } from './ProductImageGrid';
import { BCGAutoCategorizer } from './BCGAutoCategorizer';
import {
  calculateElasticityProfile,
  generateElasticityPortfolioAnalysis
} from '../utils/elasticityEngine';

export const CardapioBCG: React.FC = () => {
  const { 
    products, 
    updateProduct, 
    addProduct, 
    deleteProduct, 
    categories, 
    addCategory, 
    batchUpdateProducts, 
    setIsAICopilotOpen, 
    tenant, 
    setCurrentView 
  } = useApp();
  
  // Real-time continuous auto-categorization state
  const [autoModeEnabled, setAutoModeEnabled] = useState<boolean>(true);

  // View mode tab: 'scatter' (Menu Engineering Scatter Plot), 'grid' (Fichas Técnicas), 'recommendations' (Diagnóstico Estratégico)
  const [activeTab, setActiveTab] = useState<'scatter' | 'grid' | 'recommendations'>('scatter');
  
  // Filters
  const [selectedQuadrant, setSelectedQuadrant] = useState<BCGClassification | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [metricY, setMetricY] = useState<'margin_reais' | 'margin_percent'>('margin_reais');
  
  // Selected product for live simulation & diagnosis
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [simulatedPriceDelta, setSimulatedPriceDelta] = useState<number>(0);
  
  // Modal for technical sheet editing & new product creation
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isNewItem, setIsNewItem] = useState<boolean>(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState<boolean>(false);
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [newVariantLabel, setNewVariantLabel] = useState<string>('');
  const [newVariantPrice, setNewVariantPrice] = useState<string>('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Modal for exporting analysis (PDF / CSV)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Modal for exporting full branded PDF menu catalogue with QR Code
  const [isCatalogoPdfModalOpen, setIsCatalogoPdfModalOpen] = useState(false);

  // Modal for Price Elasticity Optimization
  const [isElasticityModalOpen, setIsElasticityModalOpen] = useState(false);

  // Compute calculated metrics for all products
  const computedProducts = useMemo(() => {
    // 1. Calculate menu averages for dynamic mathematical classification
    const totalVol = products.reduce((acc, p) => acc + Number(p.salesVolume30Days ?? p.salesCountMonth ?? 0), 0);
    const avgVol = products.length > 0 ? Math.round(totalVol / products.length) : 80;

    const totalMargin = products.reduce((acc, p) => {
      const price = Number(p.price || 0);
      const cost = Number(p.costPrice || 0);
      return acc + Math.max(0, price - cost);
    }, 0);
    const avgMargin = products.length > 0 ? totalMargin / products.length : 15;

    return products.map(prod => {
      const price = Number(prod.price || 0);
      const cost = Number(prod.costPrice || 0);
      const marginReais = Math.max(0, price - cost);
      const marginPercent = price > 0 ? (marginReais / price) * 100 : 0;
      const salesVolume = Number(prod.salesVolume30Days ?? prod.salesCountMonth ?? 0);
      const monthlyRevenue = price * salesVolume;
      const monthlyProfit = marginReais * salesVolume;
      const cmvPercent = price > 0 ? (cost / price) * 100 : 0;

      // Automatic classification based on real sales and cost data
      let classification = prod.bcgClassification;
      if (autoModeEnabled) {
        const isHighVol = salesVolume >= avgVol;
        const isHighMargin = marginReais >= avgMargin;
        if (isHighVol && isHighMargin) classification = 'star';
        else if (isHighVol && !isHighMargin) classification = 'cash_cow';
        else if (!isHighVol && isHighMargin) classification = 'question_mark';
        else classification = 'dog';
      }

      return {
        ...prod,
        bcgClassification: classification,
        computedPrice: price,
        computedCost: cost,
        computedMarginReais: marginReais,
        computedMarginPercent: marginPercent,
        computedVolume: salesVolume,
        computedRevenue: monthlyRevenue,
        computedProfit: monthlyProfit,
        computedCmvPercent: cmvPercent,
      };
    });
  }, [products, autoModeEnabled]);

  // Formatted items for CSV & PDF export
  const exportItems = useMemo(() => {
    return computedProducts.map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      price: p.computedPrice,
      costPrice: p.computedCost,
      cmvPercent: p.computedCmvPercent,
      marginReais: p.computedMarginReais,
      marginPercent: p.computedMarginPercent,
      salesVolume: p.computedVolume,
      revenue: p.computedRevenue,
      profit: p.computedProfit,
      bcgClassification: p.bcgClassification,
    }));
  }, [computedProducts]);

  // Overall Benchmarks & Averages for Kasavana & Smith / BCG Menu Engineering
  const benchmarks = useMemo(() => {
    if (computedProducts.length === 0) {
      return { avgVolume: 0, avgMarginReais: 0, avgMarginPercent: 0, totalRevenue: 0, totalProfit: 0 };
    }
    const totalVol = computedProducts.reduce((acc, p) => acc + p.computedVolume, 0);
    const totalMargin = computedProducts.reduce((acc, p) => acc + p.computedMarginReais, 0);
    const totalRev = computedProducts.reduce((acc, p) => acc + p.computedRevenue, 0);
    const totalProf = computedProducts.reduce((acc, p) => acc + p.computedProfit, 0);

    const avgVol = totalVol / computedProducts.length;
    const avgMarginR = totalMargin / computedProducts.length;
    const avgMarginP = totalRev > 0 ? (totalProf / totalRev) * 100 : 0;

    return {
      avgVolume: Math.round(avgVol),
      avgMarginReais: Number(avgMarginR.toFixed(2)),
      avgMarginPercent: Number(avgMarginP.toFixed(1)),
      totalRevenue: totalRev,
      totalProfit: totalProf,
    };
  }, [computedProducts]);

  // Filtered products for display & scatter chart
  const filteredProducts = useMemo(() => {
    return computedProducts.filter(p => {
      const matchQuadrant = 
        selectedQuadrant === 'all' || 
        p.bcgClassification === selectedQuadrant ||
        (selectedQuadrant === 'puzzle' && (p.bcgClassification === 'puzzle' || p.bcgClassification === 'question_mark'));
      
      const matchCategory = 
        selectedCategory === 'all' || 
        p.category === selectedCategory;

      const matchSearch = 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.description.toLowerCase().includes(searchTerm.toLowerCase());

      return matchQuadrant && matchCategory && matchSearch;
    });
  }, [computedProducts, selectedQuadrant, selectedCategory, searchTerm]);

  // Scatter plot data points
  const scatterData = useMemo(() => {
    return filteredProducts.map(p => {
      const yVal = metricY === 'margin_reais' ? p.computedMarginReais : p.computedMarginPercent;
      
      // Determine engineering category dynamically based on benchmarks
      const isHighVolume = p.computedVolume >= benchmarks.avgVolume;
      const isHighMargin = metricY === 'margin_reais' 
        ? p.computedMarginReais >= benchmarks.avgMarginReais 
        : p.computedMarginPercent >= benchmarks.avgMarginPercent;

      let classification: 'star' | 'cash_cow' | 'puzzle' | 'dog' = 'star';
      if (isHighVolume && isHighMargin) classification = 'star';
      else if (isHighVolume && !isHighMargin) classification = 'cash_cow';
      else if (!isHighVolume && isHighMargin) classification = 'puzzle';
      else classification = 'dog';

      return {
        id: p.id,
        name: p.name,
        category: p.category,
        x: p.computedVolume, // Popularity (sales volume)
        y: Number(yVal.toFixed(2)), // Profitability (Margin R$ or %)
        z: Math.max(150, Math.min(800, p.computedRevenue / 50)), // Bubble size based on revenue
        revenue: p.computedRevenue,
        profit: p.computedProfit,
        price: p.computedPrice,
        cost: p.computedCost,
        marginReais: p.computedMarginReais,
        marginPercent: p.computedMarginPercent,
        cmvPercent: p.computedCmvPercent,
        imageUrl: p.imageUrl,
        classification,
        originalProduct: p,
      };
    });
  }, [filteredProducts, metricY, benchmarks]);

  // Helper for quadrant visual badge
  const getQuadrantBadge = (q?: BCGClassification | string) => {
    switch (q) {
      case 'star':
        return { 
          id: 'star',
          name: 'Estrela',
          icon: '⭐',
          label: '⭐ Estrela (Alta Rentabilidade • Alto Volume)', 
          short: '⭐ Estrela',
          bg: 'bg-[#FFE600]/15 text-[#FFE600] border-[#FFE600]/40',
          dot: 'bg-[#FFE600]',
          border: 'border-[#FFE600]',
          color: '#FFE600',
          action: 'Manter visibilidade máxima e padronização rígida'
        };
      case 'cash_cow':
      case 'horse':
        return { 
          id: 'cash_cow',
          name: 'Vaca Leiteira',
          icon: '🐄',
          label: '🐄 Vaca Leiteira (Baixa Rentabilidade • Alto Volume)', 
          short: '🐄 Vaca Leiteira',
          bg: 'bg-[#00D26A]/15 text-[#00E676] border-[#00D26A]/40',
          dot: 'bg-[#00E676]',
          border: 'border-[#00D26A]',
          color: '#00D26A',
          action: 'Aumentar preço gradualmente (+R$ 1 a R$ 3) ou otimizar insumos'
        };
      case 'puzzle':
      case 'question_mark':
        return { 
          id: 'question_mark',
          name: 'Interrogação',
          icon: '❓',
          label: '❓ Interrogação (Alta Rentabilidade • Baixo Volume)', 
          short: '❓ Interrogação',
          bg: 'bg-[#00E5FF]/15 text-[#00E5FF] border-[#00E5FF]/40',
          dot: 'bg-[#00E5FF]',
          border: 'border-[#00E5FF]',
          color: '#00E5FF',
          action: 'Promover em combos, treinar atendentes e dar destaque visual'
        };
      case 'dog':
      default:
        return { 
          id: 'dog',
          name: 'Abacaxi',
          icon: '🍍',
          label: '🍍 Abacaxi (Baixa Rentabilidade • Baixo Volume)', 
          short: '🍍 Abacaxi',
          bg: 'bg-[#FF2B4E]/15 text-[#FF2B4E] border-[#FF2B4E]/40',
          dot: 'bg-[#FF2B4E]',
          border: 'border-[#FF2B4E]',
          color: '#FF2B4E',
          action: 'Reformular receita/preço ou retirar do cardápio'
        };
    }
  };

  // Custom Scatter Chart Tooltip
  const CustomScatterTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const badge = getQuadrantBadge(data.classification);

      return (
        <div className="bg-[#14141E] border border-[#2D2D42] p-4 rounded-2xl shadow-2xl max-w-xs text-xs text-white space-y-3 z-50 pointer-events-none">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#09090D] overflow-hidden shrink-0 border border-[#2D2D42]">
              <img src={data.imageUrl} alt={data.name} className="w-full h-full object-cover" />
            </div>
            <div>
              <h4 className="font-black text-sm leading-tight text-white">{data.name}</h4>
              <span className={`inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-full border mt-1.5 ${badge.bg}`}>
                {badge.short}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 bg-[#0C0C12] p-2.5 rounded-xl border border-[#222232]">
            <div>
              <span className="text-[10px] text-[#71717A] uppercase font-bold">Preço de Venda</span>
              <div className="font-black text-[#00D26A]">{formatBRL(data.price)}</div>
            </div>
            <div>
              <span className="text-[10px] text-[#71717A] uppercase font-bold">Custo dos Ingredientes</span>
              <div className="font-black text-white">{formatBRL(data.cost)} ({formatPercent(data.cmvPercent)})</div>
            </div>
            <div>
              <span className="text-[10px] text-[#71717A] uppercase font-bold">Margem Unitária</span>
              <div className="font-black text-[#FFE600]">{formatBRL(data.marginReais)} ({formatPercent(data.marginPercent)})</div>
            </div>
            <div>
              <span className="text-[10px] text-[#71717A] uppercase font-bold">Vendas Mês</span>
              <div className="font-black text-[#77D4E1]">{data.x} un/mês</div>
            </div>
          </div>

          <div className="pt-2 border-t border-[#222232] flex items-center justify-between text-[11px]">
            <div>
              <span className="text-[#71717A]">Lucro Total Gerado:</span>
              <div className="font-black text-[#00D26A]">{formatBRL(data.profit)}</div>
            </div>
            <div className="text-right">
              <span className="text-[#71717A]">Faturamento:</span>
              <div className="font-black text-white">{formatBRL(data.revenue)}</div>
            </div>
          </div>

          <div className="bg-[#1A1A28] p-2 rounded-lg text-[10px] text-[#D4D4D8] leading-tight flex items-start gap-1.5 border border-[#2A2A3E]">
            <span className="shrink-0">💡</span>
            <span>{badge.action}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Portfolio elasticity summary for quick metric badges
  const elasticitySummary = useMemo(() => {
    return generateElasticityPortfolioAnalysis(products, 'all', 'balanced');
  }, [products]);

  // Selected product's elasticity profile
  const selectedProductElasticityProfile = useMemo(() => {
    if (!selectedProduct) return null;
    return calculateElasticityProfile(selectedProduct, 'balanced');
  }, [selectedProduct]);

  // Live simulation calculations for selected product with price elasticity
  const simulationResult = useMemo(() => {
    if (!selectedProduct) return null;
    const basePrice = Number(selectedProduct.price || 0);
    const newPrice = Math.max(1, basePrice + simulatedPriceDelta);
    const cost = Number(selectedProduct.costPrice || 0);
    const currentMargin = Math.max(0, basePrice - cost);
    const newMargin = Math.max(0, newPrice - cost);
    const volume = Number(selectedProduct.salesVolume30Days ?? selectedProduct.salesCountMonth ?? 0);
    
    // Elasticity formula: %ΔQ = Ep * %ΔP
    const ep = selectedProductElasticityProfile?.elasticityCoefficient ?? -0.5;
    const priceDeltaPercent = basePrice > 0 ? (simulatedPriceDelta / basePrice) * 100 : 0;
    const volumeDeltaPercent = ep * priceDeltaPercent;
    const dynamicVolume = Math.max(1, Math.round(volume * (1 + (volumeDeltaPercent / 100))));

    const currentProfit = currentMargin * volume;
    const newProfitDynamic = newMargin * dynamicVolume;
    const profitDelta = newProfitDynamic - currentProfit;
    const newCmv = newPrice > 0 ? (cost / newPrice) * 100 : 0;
    const newMarginPercent = newPrice > 0 ? (newMargin / newPrice) * 100 : 0;

    // Check if item would migrate quadrant
    const isHighVol = dynamicVolume >= benchmarks.avgVolume;
    const isHighMarginNew = newMargin >= benchmarks.avgMarginReais;
    let newClassification: BCGClassification = 'star';
    if (isHighVol && isHighMarginNew) newClassification = 'star';
    else if (isHighVol && !isHighMarginNew) newClassification = 'cash_cow';
    else if (!isHighVol && isHighMarginNew) newClassification = 'puzzle';
    else newClassification = 'dog';

    return {
      basePrice,
      newPrice,
      cost,
      currentMargin,
      newMargin,
      volume,
      dynamicVolume,
      volumeDeltaPercent,
      currentProfit,
      newProfit: newProfitDynamic,
      profitDelta,
      newCmv,
      newMarginPercent,
      newClassification,
      ep,
      suggestedDelta: selectedProductElasticityProfile?.suggestedPriceDelta ?? 0,
      suggestedNewPrice: selectedProductElasticityProfile?.suggestedNewPrice ?? basePrice,
    };
  }, [selectedProduct, simulatedPriceDelta, benchmarks, selectedProductElasticityProfile]);

  const handleApplySinglePrice = (productId: string, newPrice: number) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;
    const cost = Number(prod.costPrice || 0);
    const newCmv = newPrice > 0 ? (cost / newPrice) * 100 : 0;
    const margin = newPrice > 0 ? ((newPrice - cost) / newPrice) * 100 : 0;
    
    // Check quadrant
    const volume = Number(prod.salesVolume30Days ?? prod.salesCountMonth ?? 0);
    const isHighVol = volume >= benchmarks.avgVolume;
    const isHighMarginNew = (newPrice - cost) >= benchmarks.avgMarginReais;
    let newClassification: BCGClassification = 'star';
    if (isHighVol && isHighMarginNew) newClassification = 'star';
    else if (isHighVol && !isHighMarginNew) newClassification = 'cash_cow';
    else if (!isHighVol && isHighMarginNew) newClassification = 'puzzle';
    else newClassification = 'dog';

    const updated: Product = {
      ...prod,
      price: newPrice,
      cmvPercent: newCmv,
      profitMarginPercent: margin,
      marginPercent: margin,
      bcgClassification: newClassification,
    };
    updateProduct(updated);
    if (selectedProduct?.id === productId) {
      setSelectedProduct(updated);
      setSimulatedPriceDelta(0);
    }
  };

  const handleApplyBatchPrices = (updates: { productId: string; newPrice: number }[]) => {
    updates.forEach(u => {
      handleApplySinglePrice(u.productId, u.newPrice);
    });
  };

  return (
    <div className="space-y-6 pb-20 select-none">
      {/* Header Principal */}
      <div className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-r from-[#141218] via-[#181522] to-[#12121A] border border-[#28283C] shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#FFC72C] flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFC72C]/10 border border-[#FFC72C]/30 shadow-[0_0_10px_rgba(255,199,44,0.15)]">
              <Sparkles className="w-3.5 h-3.5" />
              Engenharia de Cardápio (Menu Engineering)
            </span>
            <span className="text-xs text-[#71717A]">•</span>
            <span className="text-xs font-bold text-[#A1A1AA]">Classificação dos Pratos</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-display text-white tracking-tight pt-1">
            Rentabilidade vs. Popularidade
          </h1>
          <p className="text-xs sm:text-sm text-[#A1A1AA] max-w-2xl leading-relaxed">
            Analise a margem de contribuição e o volume de vendas de cada prato no gráfico de dispersão 2D para maximizar o lucro do restaurante.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 450, damping: 20 }}
            onClick={() => {
              setIsElasticityModalOpen(true);
              playCashRegister();
            }}
            className="bg-gradient-to-r from-[#FFC72C] to-[#FFA500] hover:brightness-110 text-black px-4 py-3 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-[0_0_16px_rgba(255,199,44,0.3)]"
          >
            <Zap className="w-4 h-4 fill-black" />
            <span>Sugestões por Elasticidade ({elasticitySummary.starItemsCount + elasticitySummary.dogItemsCount})</span>
            <span className="bg-black/20 text-black px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">
              +{formatBRL(elasticitySummary.totalMonthlyGainReais)}/mês
            </span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 450, damping: 20 }}
            onClick={() => {
              setIsCatalogoPdfModalOpen(true);
              playCashRegister();
            }}
            className="bg-gradient-to-r from-[#DA291C] to-[#E31837] hover:brightness-110 text-white px-4 py-3 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-[0_0_18px_rgba(218,41,28,0.4)] border border-[#FFC72C]/40"
          >
            <FileText className="w-4 h-4 text-[#FFC72C]" />
            <span>Catálogo em PDF (com QR Code)</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 450, damping: 20 }}
            onClick={() => {
              setIsExportModalOpen(true);
              playBeep(880, 0.05);
            }}
            className="bg-[#181826] hover:bg-[#202032] text-white border border-[#2F2F44] hover:border-[#FFC72C] px-4 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <Download className="w-4 h-4 text-[#00E676]" />
            <span>Exportar Análise (CSV)</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 450, damping: 20 }}
            onClick={() => {
              setIsAICopilotOpen(true);
              playBeep(900, 0.06);
            }}
            className="bg-[#181826] hover:bg-[#202032] text-[#FFC72C] border border-[#FFC72C]/40 px-4 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            <span>Copiloto IA</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 450, damping: 20 }}
            onClick={() => {
              const newProd: Product = {
                id: `prod_${Date.now()}`,
                itemNumber: String(products.length + 1).padStart(2, '0'),
                name: 'X-Salada Especial',
                description: 'Pão brioche quentinho, hambúrguer 160g, queijo prato duplo derretido, alface fresca, tomate e maionese especial da casa.',
                category: categories[0]?.id || 'cat_smash',
                price: 32.00,
                costPrice: 8.50,
                cmvPercent: 26.5,
                salesVolume30Days: 0,
                salesCountMonth: 0,
                marginPercent: 73.5,
                profitMarginPercent: 73.5,
                bcgClassification: 'puzzle',
                station: 'grill',
                available: true,
                imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop&q=80',
                priceVariants: [],
                badgeText: 'Mais Pedido',
                recipe: []
              };
              setIsNewItem(true);
              setEditingProduct(newProd);
              setNewVariantLabel('');
              setNewVariantPrice('');
              playBeep(850, 0.04);
            }}
            className="bg-gradient-to-r from-[#DA291C] to-[#FF6B00] hover:brightness-110 text-white px-5 py-3 rounded-2xl text-xs font-extrabold shadow-[0_0_18px_rgba(218,41,28,0.45)] transition-all flex items-center gap-2 cursor-pointer border border-[#FFC72C]/30"
          >
            <Plus className="w-4 h-4 text-[#FFC72C]" />
            <span>Cadastrar Novo Produto</span>
          </motion.button>
        </div>
      </div>

      {/* KPI Cards de Engenharia de Cardápio */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div 
          layout
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          whileHover={{ scale: 1.02, y: -2 }}
          transition={{ layout: { type: 'spring', stiffness: 350, damping: 30 }, type: 'spring', stiffness: 400, damping: 22 }}
          className="bg-[#12121A] border border-[#242438] hover:border-[#FFC72C]/50 p-6 rounded-3xl flex items-center gap-4 transition-all shadow-xl"
        >
          <div className="w-12 h-12 rounded-2xl bg-[#FFC72C]/15 border border-[#FFC72C]/30 flex items-center justify-center text-[#FFC72C] shadow-[0_0_12px_rgba(255,199,44,0.25)]">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs uppercase font-bold text-[#71717A] tracking-wider">Margem Média Unitária</span>
            <div className="text-xl sm:text-2xl font-black font-mono text-white mt-1">{formatBRL(benchmarks.avgMarginReais)}</div>
            <span className="text-xs text-[#00E676] font-bold">Margem Média: {benchmarks.avgMarginPercent}%</span>
          </div>
        </motion.div>

        <motion.div 
          layout
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          whileHover={{ scale: 1.02, y: -2 }}
          transition={{ layout: { type: 'spring', stiffness: 350, damping: 30 }, type: 'spring', stiffness: 400, damping: 22, delay: 0.05 }}
          className="bg-[#12121A] border border-[#242438] hover:border-[#00D2FF]/50 p-6 rounded-3xl flex items-center gap-4 transition-all shadow-xl"
        >
          <div className="w-12 h-12 rounded-2xl bg-[#00D2FF]/15 border border-[#00D2FF]/30 flex items-center justify-center text-[#00D2FF] shadow-[0_0_12px_rgba(0,210,255,0.25)]">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs uppercase font-bold text-[#71717A] tracking-wider">Volume Médio / Item</span>
            <div className="text-xl sm:text-2xl font-black font-mono text-white mt-1">{benchmarks.avgVolume} <span className="text-xs font-normal text-[#A1A1AA]">un/mês</span></div>
            <span className="text-xs text-[#A1A1AA]">Linha de corte popularidade</span>
          </div>
        </motion.div>

        <motion.div 
          layout
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          whileHover={{ scale: 1.02, y: -2 }}
          transition={{ layout: { type: 'spring', stiffness: 350, damping: 30 }, type: 'spring', stiffness: 400, damping: 22, delay: 0.1 }}
          className="bg-[#12121A] border border-[#242438] hover:border-[#00E676]/50 p-6 rounded-3xl flex items-center gap-4 transition-all shadow-xl"
        >
          <div className="w-12 h-12 rounded-2xl bg-[#00E676]/15 border border-[#00E676]/30 flex items-center justify-center text-[#00E676] shadow-[0_0_12px_rgba(0,230,118,0.25)]">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs uppercase font-bold text-[#71717A] tracking-wider">Faturamento Cardápio</span>
            <div className="text-xl sm:text-2xl font-black font-mono text-white mt-1">{formatBRL(benchmarks.totalRevenue)}</div>
            <span className="text-xs text-[#71717A]">{computedProducts.length} pratos ativos</span>
          </div>
        </motion.div>

        <motion.div 
          layout
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          whileHover={{ scale: 1.02, y: -2 }}
          transition={{ layout: { type: 'spring', stiffness: 350, damping: 30 }, type: 'spring', stiffness: 400, damping: 22, delay: 0.15 }}
          className="bg-[#12121A] border border-[#242438] hover:border-[#FF6B00]/50 p-6 rounded-3xl flex items-center gap-4 transition-all shadow-xl"
        >
          <div className="w-12 h-12 rounded-2xl bg-[#FF6B00]/15 border border-[#FF6B00]/30 flex items-center justify-center text-[#FF6B00] shadow-[0_0_12px_rgba(255,107,0,0.25)]">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs uppercase font-bold text-[#71717A] tracking-wider">Lucro Bruto Total</span>
            <div className="text-xl sm:text-2xl font-black font-mono text-[#00E676] mt-1">{formatBRL(benchmarks.totalProfit)}</div>
            <span className="text-xs text-[#00E676] font-semibold">Lucro Retido em Insumos</span>
          </div>
        </motion.div>
      </div>

      {/* Sistema de Alertas Inteligentes: Variação Brusca de CMV e Demanda (Estrelas & Cães de Guarda) */}
      <MenuEngineeringAlerts
        products={products}
        onOpenProductEdit={(prod) => {
          setEditingProduct(prod);
          setActiveTab('grid');
        }}
        onSimulatePrice={(prod, delta) => {
          setSelectedProduct(prod);
          setSimulatedPriceDelta(delta);
          setActiveTab('scatter');
        }}
      />

      {/* Módulo de Categorização Automática BCG com Base em Vendas e Custos */}
      <BCGAutoCategorizer
        products={products}
        benchmarks={benchmarks}
        onApplyCategorization={(updatedProducts) => {
          batchUpdateProducts(updatedProducts);
        }}
        onFilterQuadrant={(q) => setSelectedQuadrant(q)}
        selectedQuadrant={selectedQuadrant}
        autoModeEnabled={autoModeEnabled}
        onToggleAutoMode={(enabled) => setAutoModeEnabled(enabled)}
      />

      {/* Navegação entre Abas Principais */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#111117] border border-[#222230] p-2 rounded-2xl">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 500, damping: 22 }}
            onClick={() => {
              setActiveTab('scatter');
              playBeep(700, 0.03);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'scatter'
                ? 'bg-[#FFE600] text-black shadow-md'
                : 'text-[#A1A1AA] hover:text-white hover:bg-[#1A1A26]'
            }`}
          >
            <ScatterIcon className="w-4 h-4" />
            <span>Matriz Gráfica 2D (Scatter Plot)</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 500, damping: 22 }}
            onClick={() => {
              setActiveTab('grid');
              playBeep(700, 0.03);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'grid'
                ? 'bg-[#FFE600] text-black shadow-md'
                : 'text-[#A1A1AA] hover:text-white hover:bg-[#1A1A26]'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Grade com Imagens & Fichas ({filteredProducts.length})</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 500, damping: 22 }}
            onClick={() => {
              setActiveTab('recommendations');
              playBeep(700, 0.03);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'recommendations'
                ? 'bg-[#FFE600] text-black shadow-md'
                : 'text-[#A1A1AA] hover:text-white hover:bg-[#1A1A26]'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>Diagnóstico Estratégico IA</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 500, damping: 22 }}
            onClick={() => {
              setCurrentView('cardapio_digital');
              playCashRegister();
            }}
            className="px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer bg-gradient-to-r from-[#DA291C] to-[#E31837] text-white shadow-[0_0_12px_rgba(218,41,28,0.4)] border border-[#FFC72C]/40"
          >
            <Sparkles className="w-4 h-4 text-[#FFC72C]" />
            <span>Cardápio do Cliente (McDonald's)</span>
          </motion.button>
        </div>

        {/* Quadrant Quick Filter Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 500, damping: 22 }}
            onClick={() => setSelectedQuadrant('all')}
            className={`px-2.5 py-1 rounded-lg font-bold border transition-all cursor-pointer ${
              selectedQuadrant === 'all'
                ? 'bg-white text-black border-white'
                : 'bg-[#181824] text-[#71717A] border-[#242436] hover:text-white'
            }`}
          >
            Todos ({products.length})
          </motion.button>

          {[
            { id: 'star', label: '⭐ Estrelas', count: products.filter(p => p.bcgClassification === 'star').length, color: 'text-[#FFE600]' },
            { id: 'cash_cow', label: '🐄 Vacas Leiteiras', count: products.filter(p => p.bcgClassification === 'cash_cow' || p.bcgClassification === 'horse').length, color: 'text-[#00E676]' },
            { id: 'puzzle', label: '❓ Interrogações', count: products.filter(p => p.bcgClassification === 'puzzle' || p.bcgClassification === 'question_mark').length, color: 'text-[#00E5FF]' },
            { id: 'dog', label: '🍍 Abacaxis', count: products.filter(p => p.bcgClassification === 'dog').length, color: 'text-[#FF2B4E]' },
          ].map(q => (
            <motion.button
              key={q.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 500, damping: 22 }}
              onClick={() => setSelectedQuadrant(selectedQuadrant === q.id ? 'all' : (q.id as BCGClassification))}
              className={`px-2.5 py-1 rounded-lg font-bold border flex items-center gap-1 transition-all cursor-pointer ${
                selectedQuadrant === q.id
                  ? 'bg-[#222232] text-white border-[#FFE600]'
                  : 'bg-[#181824] text-[#A1A1AA] border-[#242436] hover:text-white'
              }`}
            >
              <span className={q.color}>{q.label}</span>
              <span className="text-[10px] bg-black/40 px-1.5 py-0.2 rounded font-mono">{q.count}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* ======================================================== */}
      {/* ABA 1: MATRIZ GRÁFICA 2D - SCATTER PLOT DA ENGENHARIA    */}
      {/* ======================================================== */}
      {activeTab === 'scatter' && (
        <div className="space-y-6">
          {/* Controles de Gráfico & Eixos */}
          <div className="bg-[#111117] border border-[#222230] p-4 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-[#181824] p-1 rounded-xl border border-[#262638]">
                <span className="text-[10px] font-bold uppercase text-[#71717A] px-2">Eixo Y (Rentabilidade):</span>
                <button
                  onClick={() => setMetricY('margin_reais')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    metricY === 'margin_reais'
                      ? 'bg-[#FFE600] text-black shadow-sm'
                      : 'text-[#A1A1AA] hover:text-white'
                  }`}
                >
                  Margem em R$ (Lucro Unitário)
                </button>
                <button
                  onClick={() => setMetricY('margin_percent')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    metricY === 'margin_percent'
                      ? 'bg-[#FFE600] text-black shadow-sm'
                      : 'text-[#A1A1AA] hover:text-white'
                  }`}
                >
                  Margem Bruta %
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs text-[#71717A]">
                <Info className="w-3.5 h-3.5 text-[#FFE600]" />
                <span>O tamanho da bolha reflete o <strong>faturamento total (R$)</strong> do prato.</span>
              </div>
            </div>

            {/* Quick Search */}
            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filtrar prato no gráfico..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-[#181824] border border-[#282838] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-[#52525B] focus:border-[#FFE600] focus:outline-none"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Gráfico de Dispersão + Painel Lateral de Simulação */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            
            {/* Área Principal do Gráfico 2D */}
            <div className="xl:col-span-8 bg-[#111117] border border-[#222230] p-4 sm:p-6 rounded-3xl space-y-4 flex flex-col justify-between">
              
              {/* Header do Gráfico com identificação de Quadrantes */}
              <div className="flex items-center justify-between pb-2 border-b border-[#1E1E2C]">
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#FFE600]" />
                    Diagrama de Rentabilidade vs. Popularidade
                  </h3>
                  <p className="text-[11px] text-[#71717A]">
                    Clique em qualquer prato no gráfico para abrir o simulador de preço e diagnóstico instantâneo.
                  </p>
                </div>

                <div className="hidden sm:flex items-center gap-3 text-[11px]">
                  <span className="flex items-center gap-1.5 font-bold text-[#FFE600]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FFE600]" />
                    Estrelas
                  </span>
                  <span className="flex items-center gap-1.5 font-bold text-[#00E676]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#00E676]" />
                    Vacas Leiteiras
                  </span>
                  <span className="flex items-center gap-1.5 font-bold text-[#00E5FF]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#00E5FF]" />
                    Interrogações
                  </span>
                  <span className="flex items-center gap-1.5 font-bold text-[#FF2B4E]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FF2B4E]" />
                    Abacaxis
                  </span>
                </div>
              </div>

              {/* Box dos 4 Quadrantes Decorativa com Fundo Guiado */}
              <div className="relative w-full h-[460px] bg-[#0A0A0E] rounded-2xl border border-[#1E1E2C] p-2 overflow-hidden">
                
                {/* Legendas de Fundo dos 4 Quadrantes */}
                <div className="absolute inset-0 pointer-events-none grid grid-cols-2 grid-rows-2 p-6 z-0">
                  {/* Top Left: Interrogações (Alta Margem, Baixo Volume) */}
                  <div className="border-r border-b border-[#242436]/60 p-3 bg-[#00E5FF]/[0.02] flex flex-col justify-start items-start">
                    <span className="text-xs font-black text-[#00E5FF]/60 uppercase tracking-wider flex items-center gap-1">
                      ❓ Interrogações (Question Marks)
                    </span>
                    <span className="text-[10px] text-[#71717A]/60">Alta Rentabilidade • Baixo Volume</span>
                  </div>

                  {/* Top Right: Estrelas (Alta Margem, Alto Volume) */}
                  <div className="border-b border-[#242436]/60 p-3 bg-[#FFE600]/[0.02] flex flex-col justify-start items-end text-right">
                    <span className="text-xs font-black text-[#FFE600]/60 uppercase tracking-wider flex items-center gap-1">
                      ⭐ Estrelas (Stars)
                    </span>
                    <span className="text-[10px] text-[#71717A]/60">Alta Rentabilidade • Alto Volume</span>
                  </div>

                  {/* Bottom Left: Abacaxis (Baixa Margem, Baixo Volume) */}
                  <div className="border-r border-[#242436]/60 p-3 bg-[#E31837]/[0.02] flex flex-col justify-end items-start">
                    <span className="text-xs font-black text-[#FF2B4E]/60 uppercase tracking-wider flex items-center gap-1">
                      🍍 Abacaxis (Dogs)
                    </span>
                    <span className="text-[10px] text-[#71717A]/60">Baixa Rentabilidade • Baixo Volume</span>
                  </div>

                  {/* Bottom Right: Vacas Leiteiras (Baixa Margem, Alto Volume) */}
                  <div className="p-3 bg-[#00D26A]/[0.02] flex flex-col justify-end items-end text-right">
                    <span className="text-xs font-black text-[#00E676]/60 uppercase tracking-wider flex items-center gap-1">
                      🐄 Vacas Leiteiras (Cash Cows)
                    </span>
                    <span className="text-[10px] text-[#71717A]/60">Baixa Rentabilidade • Alto Volume</span>
                  </div>
                </div>

                {/* Gráfico Recharts ScatterChart */}
                <div className="relative z-10 w-full h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart
                      margin={{ top: 20, right: 30, bottom: 20, left: 10 }}
                      onClick={(e: any) => {
                        if (e && e.activePayload && e.activePayload.length) {
                          const point = e.activePayload[0].payload;
                          if (point?.originalProduct) {
                            setSelectedProduct(point.originalProduct);
                            setSimulatedPriceDelta(0);
                            playBeep(850, 0.04);
                          }
                        }
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#222232" vertical={true} horizontal={true} />
                      
                      <XAxis 
                        type="number" 
                        dataKey="x" 
                        name="Volume de Vendas" 
                        unit=" un" 
                        stroke="#71717A" 
                        tick={{ fill: '#A1A1AA', fontSize: 11 }}
                        tickLine={{ stroke: '#333346' }}
                      />
                      
                      <YAxis 
                        type="number" 
                        dataKey="y" 
                        name={metricY === 'margin_reais' ? 'Margem R$' : 'Margem %'} 
                        unit={metricY === 'margin_reais' ? ' R$' : '%'} 
                        stroke="#71717A" 
                        tick={{ fill: '#A1A1AA', fontSize: 11 }}
                        tickLine={{ stroke: '#333346' }}
                      />
                      
                      <ZAxis type="number" dataKey="z" range={[150, 800]} name="Faturamento Total" />
                      
                      <Tooltip content={<CustomScatterTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#FFE600' }} />

                      {/* Linha de Referência X: Média de Volume */}
                      <ReferenceLine 
                        x={benchmarks.avgVolume} 
                        stroke="#FFE600" 
                        strokeDasharray="4 4" 
                        strokeWidth={1.5}
                        label={{ 
                          value: `Média Volume: ${benchmarks.avgVolume} un`, 
                          fill: '#FFE600', 
                          fontSize: 10, 
                          position: 'top',
                          fontWeight: 'bold'
                        }} 
                      />

                      {/* Linha de Referência Y: Média de Margem */}
                      <ReferenceLine 
                        y={metricY === 'margin_reais' ? benchmarks.avgMarginReais : benchmarks.avgMarginPercent} 
                        stroke="#FFE600" 
                        strokeDasharray="4 4" 
                        strokeWidth={1.5}
                        label={{ 
                          value: `Média Rentab.: ${metricY === 'margin_reais' ? formatBRL(benchmarks.avgMarginReais) : benchmarks.avgMarginPercent + '%'}`, 
                          fill: '#FFE600', 
                          fontSize: 10, 
                          position: 'right',
                          fontWeight: 'bold'
                        }} 
                      />

                      <Scatter 
                        name="Pratos do Cardápio" 
                        data={scatterData} 
                        className="cursor-pointer"
                      >
                        {scatterData.map((entry, index) => {
                          let fillColor = '#FFE600';
                          if (entry.classification === 'star') fillColor = '#FFE600';
                          else if (entry.classification === 'cash_cow') fillColor = '#00D26A';
                          else if (entry.classification === 'puzzle') fillColor = '#77D4E1';
                          else if (entry.classification === 'dog') fillColor = '#FF2B4E';

                          const isSelected = selectedProduct?.id === entry.id;

                          return (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={fillColor} 
                              stroke={isSelected ? '#FFFFFF' : '#0A0A0E'} 
                              strokeWidth={isSelected ? 3 : 1.5}
                              className="transition-all hover:scale-125 cursor-pointer"
                              onClick={() => {
                                setSelectedProduct(entry.originalProduct);
                                setSimulatedPriceDelta(0);
                                playBeep(850, 0.04);
                              }}
                            />
                          );
                        })}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Rodapé explicativo da Engenharia de Cardápio */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-2 text-[11px]">
                <div className="p-2.5 rounded-xl bg-[#151520] border border-[#222232]">
                  <span className="font-extrabold text-[#FFE600] block">⭐ Estrelas (Lucro Alto / Volume Alto)</span>
                  <p className="text-[10px] text-[#A1A1AA] mt-0.5">Mantenha a receita inviolável e promova sempre no topo do cardápio.</p>
                </div>
                <div className="p-2.5 rounded-xl bg-[#151520] border border-[#222232]">
                  <span className="font-extrabold text-[#00E676] block">🐄 Vacas Leiteiras (Lucro Baixo / Volume Alto)</span>
                  <p className="text-[10px] text-[#A1A1AA] mt-0.5">Aumente o preço gradualmente ou renegocie insumos com fornecedores.</p>
                </div>
                <div className="p-2.5 rounded-xl bg-[#151520] border border-[#222232]">
                  <span className="font-extrabold text-[#00E5FF] block">❓ Interrogações (Lucro Alto / Volume Baixo)</span>
                  <p className="text-[10px] text-[#A1A1AA] mt-0.5">Melhore fotos, crie combos promocionais e incentive a equipe a oferecer.</p>
                </div>
                <div className="p-2.5 rounded-xl bg-[#151520] border border-[#222232]">
                  <span className="font-extrabold text-[#FF2B4E] block">🍍 Abacaxis (Lucro Baixo / Volume Baixo)</span>
                  <p className="text-[10px] text-[#A1A1AA] mt-0.5">Reformule a receita com menor custo ou substitua por um novo lançamento.</p>
                </div>
              </div>

            </div>

            {/* Painel Lateral: Diagnóstico & Simulador Interativo do Item */}
            <div className="xl:col-span-4 bg-[#111117] border border-[#222230] p-5 rounded-3xl space-y-4 flex flex-col justify-between">
              
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#20202E]">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[#FFE600]" />
                    <h3 className="font-extrabold text-sm text-white">Simulador de Impacto no Lucro</h3>
                  </div>
                  <span className="text-[10px] font-bold text-[#71717A] uppercase bg-[#181824] px-2 py-0.5 rounded">
                    Tempo Real
                  </span>
                </div>

                {!selectedProduct ? (
                  <div className="py-12 px-4 text-center space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-[#181824] border border-[#282838] flex items-center justify-center mx-auto text-[#FFE600]">
                      <Target className="w-7 h-7 animate-pulse" />
                    </div>
                    <h4 className="font-bold text-white text-sm">Selecione um Prato no Gráfico</h4>
                    <p className="text-xs text-[#71717A] max-w-xs mx-auto">
                      Clique em qualquer bolha da matriz para simular reajustes de preço, recalcular margens e prever o lucro adicional mensal.
                    </p>
                    <div className="pt-2">
                      <button
                        onClick={() => {
                          const firstStar = computedProducts.find(p => p.bcgClassification === 'cash_cow') || computedProducts[0];
                          setSelectedProduct(firstStar);
                          setSimulatedPriceDelta(0);
                        }}
                        className="px-3 py-1.5 bg-[#20202E] hover:bg-[#2C2C3E] text-white rounded-xl text-xs font-bold border border-[#343448] cursor-pointer transition-all"
                      >
                        Simular com "{computedProducts[0]?.name?.slice(0, 22)}..."
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 pt-3">
                    {/* Item Info Card */}
                    <div className="bg-[#161622] border border-[#242436] p-3 rounded-2xl flex items-center gap-3">
                      <div className="w-14 h-14 rounded-xl bg-[#0B0B10] overflow-hidden shrink-0 border border-[#2A2A3E]">
                        <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-black text-sm text-white truncate">{selectedProduct.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-extrabold text-[#00D26A]">{formatBRL(selectedProduct.price)}</span>
                          <span className="text-[10px] text-[#71717A]">Custo: {formatBRL(selectedProduct.costPrice)}</span>
                        </div>
                        <div className="text-[10px] text-[#FFE600] font-bold mt-0.5">
                          {selectedProduct.salesVolume30Days ?? selectedProduct.salesCountMonth ?? 0} pedidos/mês
                        </div>
                      </div>
                    </div>

                    {/* Sugestão Automática de Elasticidade de Demanda */}
                    {selectedProductElasticityProfile && (
                      <div className="bg-gradient-to-r from-[#1A1A12] to-[#14141E] border border-[#FFE600]/30 p-3 rounded-2xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-wider text-[#FFE600] flex items-center gap-1">
                            <Zap className="w-3.5 h-3.5 fill-[#FFE600]" />
                            Elasticidade de Demanda (Ep: {selectedProductElasticityProfile.elasticityCoefficient})
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                            selectedProductElasticityProfile.elasticityType === 'inelastic'
                              ? 'bg-[#FFE600]/20 text-[#FFE600] border-[#FFE600]/40'
                              : 'bg-[#FF2B4E]/20 text-[#FF2B4E] border-[#FF2B4E]/40'
                          }`}>
                            {selectedProductElasticityProfile.elasticityType === 'inelastic' ? 'Demanda Inelástica' : 'Demanda Elástica'}
                          </span>
                        </div>

                        <p className="text-[11px] text-[#D4D4D8] leading-tight">
                          {selectedProductElasticityProfile.strategicRecommendation}
                        </p>

                        <div className="pt-1 flex items-center justify-between">
                          <span className="text-[10px] text-[#A1A1AA]">
                            Preço Ótimo: <strong className="text-white font-mono">{formatBRL(selectedProductElasticityProfile.suggestedNewPrice)}</strong>
                          </span>
                          <button
                            onClick={() => {
                              setSimulatedPriceDelta(selectedProductElasticityProfile.suggestedPriceDelta);
                              playBeep(920, 0.04);
                            }}
                            className="px-2.5 py-1 bg-[#FFE600] hover:bg-[#FFD700] text-black font-black text-[10px] rounded-lg shadow cursor-pointer transition-all flex items-center gap-1"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Aplicar Sugestão (+{formatBRL(selectedProductElasticityProfile.suggestedPriceDelta)})</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Slider de Simulação de Reajuste */}
                    <div className="bg-[#161622] border border-[#242436] p-4 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">Simular Variação no Preço:</span>
                        <span className={`text-sm font-black font-mono ${
                          simulatedPriceDelta > 0 ? 'text-[#00D26A]' : simulatedPriceDelta < 0 ? 'text-[#FF2B4E]' : 'text-white'
                        }`}>
                          {simulatedPriceDelta > 0 ? `+${formatBRL(simulatedPriceDelta)}` : formatBRL(simulatedPriceDelta)}
                        </span>
                      </div>

                      <input
                        type="range"
                        min="-10"
                        max="15"
                        step="0.5"
                        value={simulatedPriceDelta}
                        onChange={(e) => setSimulatedPriceDelta(Number(e.target.value))}
                        className="w-full h-2 bg-[#262638] rounded-lg appearance-none cursor-pointer accent-[#FFE600]"
                      />

                      <div className="flex justify-between text-[10px] text-[#71717A] font-mono">
                        <span>-R$ 10,00</span>
                        <span className="text-white font-bold">R$ 0,00</span>
                        <span>+R$ 15,00</span>
                      </div>

                      {/* Botões de ajuste rápido */}
                      <div className="grid grid-cols-4 gap-1.5 pt-1">
                        {[-2, 0, 2, 4].map(val => (
                          <button
                            key={val}
                            onClick={() => setSimulatedPriceDelta(val)}
                            className={`py-1 rounded-lg text-[10px] font-extrabold border transition-all ${
                              simulatedPriceDelta === val
                                ? 'bg-[#FFE600] text-black border-[#FFE600]'
                                : 'bg-[#1D1D2C] text-[#A1A1AA] border-[#2A2A3E] hover:text-white'
                            }`}
                          >
                            {val > 0 ? `+R$ ${val}` : val < 0 ? `-R$ ${Math.abs(val)}` : 'Original'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Resultados da Simulação */}
                    {simulationResult && (
                      <div className="space-y-2.5">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-[#14141E] p-2.5 rounded-xl border border-[#242436]">
                            <span className="text-[10px] text-[#71717A] uppercase font-bold">Novo Preço Simulado</span>
                            <div className="text-sm font-black text-white mt-0.5">{formatBRL(simulationResult.newPrice)}</div>
                            <span className="text-[10px] text-[#00D26A] font-bold">Custo Insumos: {formatPercent(simulationResult.newCmv)}</span>
                          </div>

                          <div className="bg-[#14141E] p-2.5 rounded-xl border border-[#242436]">
                            <span className="text-[10px] text-[#71717A] uppercase font-bold">Nova Margem Unitária</span>
                            <div className="text-sm font-black text-[#FFE600] mt-0.5">{formatBRL(simulationResult.newMargin)}</div>
                            <span className="text-[10px] text-[#71717A]">({formatPercent(simulationResult.newMarginPercent)})</span>
                          </div>
                        </div>

                        {/* Volume com Elasticidade */}
                        <div className="bg-[#14141E] p-2.5 rounded-xl border border-[#242436] flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[10px] text-[#71717A] uppercase font-bold block">Demanda Projetada (Ep: {simulationResult.ep})</span>
                            <span className="text-sm font-black text-[#77D4E1] font-mono">
                              {simulationResult.dynamicVolume} pedidos/mês
                            </span>
                          </div>
                          <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
                            simulationResult.volumeDeltaPercent >= 0 ? 'bg-[#00D26A]/20 text-[#00D26A]' : 'bg-[#FF2B4E]/20 text-[#FF2B4E]'
                          }`}>
                            {simulationResult.volumeDeltaPercent >= 0 ? `+${simulationResult.volumeDeltaPercent.toFixed(1)}%` : `${simulationResult.volumeDeltaPercent.toFixed(1)}%`}
                          </span>
                        </div>

                        {/* Card de Impacto no Lucro Total */}
                        <div className={`p-3 rounded-2xl border flex items-center justify-between ${
                          simulationResult.profitDelta >= 0
                            ? 'bg-[#00D26A]/10 border-[#00D26A]/40 text-[#00D26A]'
                            : 'bg-[#E31837]/10 border-[#E31837]/40 text-[#FF2B4E]'
                        }`}>
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                              simulationResult.profitDelta >= 0 ? 'bg-[#00D26A]/20' : 'bg-[#E31837]/20'
                            }`}>
                              {simulationResult.profitDelta >= 0 ? (
                                <TrendingUp className="w-4 h-4" />
                              ) : (
                                <TrendingDown className="w-4 h-4" />
                              )}
                            </div>
                            <div>
                              <span className="text-[10px] uppercase font-black tracking-wider block">Impacto no Lucro Líquido</span>
                              <span className="text-sm font-black font-mono">
                                {simulationResult.profitDelta >= 0 ? `+${formatBRL(simulationResult.profitDelta)}` : formatBRL(simulationResult.profitDelta)} /mês
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Classificação Projetada */}
                        <div className="bg-[#14141E] p-3 rounded-xl border border-[#242436] flex items-center justify-between text-xs">
                          <span className="text-[#A1A1AA]">Quadrante Projetado:</span>
                          <span className={`font-extrabold px-2 py-0.5 rounded-full border text-[10px] ${
                            getQuadrantBadge(simulationResult.newClassification).bg
                          }`}>
                            {getQuadrantBadge(simulationResult.newClassification).short}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Botões de Ação do Simulador */}
              {selectedProduct && simulationResult && (
                <div className="space-y-2 pt-3 border-t border-[#20202E]">
                  {simulatedPriceDelta !== 0 && (
                    <button
                      onClick={() => {
                        const updated: Product = {
                          ...selectedProduct,
                          price: simulationResult.newPrice,
                          cmvPercent: simulationResult.newCmv,
                          profitMarginPercent: simulationResult.newMarginPercent,
                          marginPercent: simulationResult.newMarginPercent,
                          bcgClassification: simulationResult.newClassification,
                        };
                        updateProduct(updated);
                        setSelectedProduct(updated);
                        setSimulatedPriceDelta(0);
                        playCashRegister();
                      }}
                      className="w-full py-2.5 bg-[#00D26A] hover:bg-[#00E575] text-black font-extrabold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>APLICAR PREÇO DE {formatBRL(simulationResult.newPrice)} NO CARDÁPIO</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setEditingProduct(selectedProduct);
                      playBeep(850, 0.04);
                    }}
                    className="w-full py-2 bg-[#20202E] hover:bg-[#2A2A3E] text-white font-bold text-xs rounded-xl border border-[#303044] flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#FFE600]" />
                    <span>Editar Ficha Técnica Completa</span>
                  </button>
                </div>
              )}

            </div>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 2: GRADE COM SUPORTE A IMAGENS & FICHAS TÉCNICAS     */}
      {/* ======================================================== */}
      {activeTab === 'grid' && (
        <ProductImageGrid
          products={computedProducts}
          onSelectProduct={(p) => {
            setSelectedProduct(p);
          }}
          onEditProduct={(p) => {
            setEditingProduct(p);
            playBeep(850, 0.04);
          }}
          onUpdateProduct={(p) => {
            updateProduct(p);
          }}
          onFocusScatter={(p) => {
            setSelectedProduct(p);
            setActiveTab('scatter');
            setSimulatedPriceDelta(0);
          }}
          getQuadrantBadge={getQuadrantBadge}
          benchmarks={benchmarks}
          onOpenCatalogoPdf={() => {
            setIsCatalogoPdfModalOpen(true);
            playCashRegister();
          }}
          onOpenExportModal={() => {
            setIsExportModalOpen(true);
            playBeep(880, 0.05);
          }}
          onNewProduct={() => {
            const newProd: Product = {
              id: `prod_${Date.now()}`,
              itemNumber: String(products.length + 1).padStart(2, '0'),
              name: 'X-Salada Especial',
              description: 'Pão brioche quentinho, hambúrguer 160g, queijo prato duplo derretido, alface fresca, tomate e maionese especial da casa.',
              category: categories[0]?.id || 'cat_smash',
              price: 32.00,
              costPrice: 8.50,
              cmvPercent: 26.5,
              salesVolume30Days: 0,
              salesCountMonth: 0,
              marginPercent: 73.5,
              profitMarginPercent: 73.5,
              bcgClassification: 'puzzle',
              station: 'grill',
              available: true,
              imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop&q=80',
              priceVariants: [],
              badgeText: 'Mais Pedido',
              recipe: []
            };
            setIsNewItem(true);
            setEditingProduct(newProd);
            setNewVariantLabel('');
            setNewVariantPrice('');
            playBeep(850, 0.04);
          }}
        />
      )}

      {/* ======================================================== */}
      {/* ABA 3: DIAGNÓSTICO ESTRATÉGICO IA & PLANOS DE AÇÃO       */}
      {/* ======================================================== */}
      {activeTab === 'recommendations' && (
        <div className="space-y-6">
          <div className="bg-[#111117] border border-[#222230] p-6 rounded-3xl space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#FFE600] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  Matriz de Decisão Prescritiva Kasavana & Smith
                </span>
                <h2 className="text-xl font-black text-white mt-1">Plano de Ação Estratégico por Quadrante</h2>
                <p className="text-xs text-[#A1A1AA] mt-0.5">
                  Recomendações automáticas baseadas no cruzamento de dados de custo de ingredientes, faturamento e vendas do restaurante.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsElasticityModalOpen(true);
                    playCashRegister();
                  }}
                  className="px-4 py-2.5 bg-gradient-to-r from-[#FFE600] to-[#FF9900] hover:brightness-110 text-black font-black text-xs rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition-all shrink-0"
                >
                  <Zap className="w-4 h-4 fill-black" />
                  <span>Otimizador de Elasticidade ({elasticitySummary.starItemsCount + elasticitySummary.dogItemsCount} Pratos)</span>
                </button>

                <button
                  onClick={() => {
                    setIsExportModalOpen(true);
                    playBeep(880, 0.05);
                  }}
                  className="px-4 py-2.5 bg-[#1C1C28] hover:bg-[#2A2A3E] text-white border border-[#2E2E42] font-bold text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all shrink-0"
                >
                  <FileText className="w-4 h-4 text-[#00D26A]" />
                  <span>Exportar Relatório</span>
                </button>
              </div>
            </div>

            {/* Banner Destacado de Elasticidade */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#1C1C14] via-[#141420] to-[#1C1216] border border-[#FFE600]/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#FFE600]/20 border border-[#FFE600]/40 text-[#FFE600] flex items-center justify-center font-black shrink-0">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white flex items-center gap-2">
                    Sugestão Automática de Preços baseada em Elasticidade ($E_p$)
                    <span className="text-[10px] bg-[#00D26A]/20 text-[#00D26A] px-2 py-0.5 rounded-full border border-[#00D26A]/40 font-mono">
                      +{formatBRL(elasticitySummary.totalMonthlyGainReais)}/mês
                    </span>
                  </h4>
                  <p className="text-xs text-[#A1A1AA] mt-0.5">
                    Otimize pratos <strong>⭐ Estrelas (Inelásticos, $E_p \approx -0.41$)</strong> para capturar margem pura, e <strong>🐶 Cães de Guarda (Elásticos, $E_p \approx -1.65$)</strong> para recuperar a meta de custo de ingredientes de 30%.
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsElasticityModalOpen(true);
                  playCashRegister();
                }}
                className="px-4 py-2 bg-[#FFE600] hover:bg-[#FFD700] text-black font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-1.5 shrink-0"
              >
                <Zap className="w-3.5 h-3.5 fill-black" />
                <span>Simular Otimização de Portfolio</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Estrelas */}
              <div className="p-5 rounded-2xl bg-[#FFE600]/5 border border-[#FFE600]/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">⭐</span>
                    <h3 className="font-black text-sm text-[#FFE600]">Estrelas (Stars)</h3>
                  </div>
                  <span className="text-xs font-mono font-bold bg-[#FFE600]/20 text-[#FFE600] px-2 py-0.5 rounded-full border border-[#FFE600]/40">
                    {computedProducts.filter(p => p.bcgClassification === 'star').length} itens
                  </span>
                </div>
                <p className="text-xs text-[#D4D4D8] leading-relaxed">
                  Pratos de <strong>alta rentabilidade e altíssima demanda</strong>. São as âncoras de lucro do seu restaurante.
                </p>
                <div className="bg-[#14141E] p-3 rounded-xl border border-[#242436] space-y-1 text-xs text-[#A1A1AA]">
                  <strong className="text-white block">Ações Recomendadas:</strong>
                  <div>✅ Manter a receita rigorosamente padronizada na cozinha.</div>
                  <div>✅ Posicionar na "área dourada" (topo) do cardápio digital e impresso.</div>
                  <div>✅ Proteger contra rupturas de estoque dos insumos principais.</div>
                </div>
              </div>

              {/* Cavalos de Batalha / Vacas Leiteiras */}
              <div className="p-5 rounded-2xl bg-[#00D26A]/5 border border-[#00D26A]/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🐄</span>
                    <h3 className="font-black text-sm text-[#00E676]">Vacas Leiteiras (Cash Cows)</h3>
                  </div>
                  <span className="text-xs font-mono font-bold bg-[#00D26A]/20 text-[#00E676] px-2 py-0.5 rounded-full border border-[#00D26A]/40">
                    {computedProducts.filter(p => p.bcgClassification === 'cash_cow' || p.bcgClassification === 'horse').length} itens
                  </span>
                </div>
                <p className="text-xs text-[#D4D4D8] leading-relaxed">
                  Pratos muito populares com <strong>margem unitária abaixo da média</strong>. Geram alto fluxo, mas pouco lucro proporcional.
                </p>
                <div className="bg-[#14141E] p-3 rounded-xl border border-[#242436] space-y-1 text-xs text-[#A1A1AA]">
                  <strong className="text-white block">Ações Recomendadas:</strong>
                  <div>📈 Aumentar o preço gradativamente em +R$ 1,50 a R$ 3,00.</div>
                  <div>🧀 Renegociar embalagens ou insumos de maior custo com fornecedores.</div>
                  <div>🍟 Criar combos adicionando itens de altíssima margem (ex: bebidas e batatas).</div>
                </div>
              </div>

              {/* Interrogações */}
              <div className="p-5 rounded-2xl bg-[#00E5FF]/5 border border-[#00E5FF]/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">❓</span>
                    <h3 className="font-black text-sm text-[#00E5FF]">Interrogações (Question Marks)</h3>
                  </div>
                  <span className="text-xs font-mono font-bold bg-[#00E5FF]/20 text-[#00E5FF] px-2 py-0.5 rounded-full border border-[#00E5FF]/40">
                    {computedProducts.filter(p => p.bcgClassification === 'puzzle' || p.bcgClassification === 'question_mark').length} itens
                  </span>
                </div>
                <p className="text-xs text-[#D4D4D8] leading-relaxed">
                  Pratos com <strong>excelente margem de lucro, mas baixo volume de pedidos</strong>. Grande potencial inexplorado.
                </p>
                <div className="bg-[#14141E] p-3 rounded-xl border border-[#242436] space-y-1 text-xs text-[#A1A1AA]">
                  <strong className="text-white block">Ações Recomendadas:</strong>
                  <div>📸 Renovar a fotografia e descrição no cardápio online e WhatsApp.</div>
                  <div>🎯 Criar promoções relâmpago de degustação no Cardápio Digital e Delivery.</div>
                  <div>🧑‍🍳 Treinar os atendentes para sugestão ativa no salão e caixa.</div>
                </div>
              </div>

              {/* Abacaxis */}
              <div className="p-5 rounded-2xl bg-[#E31837]/5 border border-[#E31837]/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🍍</span>
                    <h3 className="font-black text-sm text-[#FF2B4E]">Abacaxis (Dogs)</h3>
                  </div>
                  <span className="text-xs font-mono font-bold bg-[#E31837]/20 text-[#FF2B4E] px-2 py-0.5 rounded-full border border-[#E31837]/40">
                    {computedProducts.filter(p => p.bcgClassification === 'dog').length} itens
                  </span>
                </div>
                <p className="text-xs text-[#D4D4D8] leading-relaxed">
                  Pratos com <strong>baixa margem e baixa saída</strong>. Ocupam espaço na cozinha e empatam capital no estoque.
                </p>
                <div className="bg-[#14141E] p-3 rounded-xl border border-[#242436] space-y-1 text-xs text-[#A1A1AA]">
                  <strong className="text-white block">Ações Recomendadas:</strong>
                  <div>❌ Avaliar retirada definitiva do cardápio para reduzir desperdício de insumos.</div>
                  <div>🧪 Reformular receita com ingredientes compartilhados com pratos Estrela.</div>
                  <div>🏷️ Elevar o preço para compensar o baixo giro caso seja mantido.</div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CADASTRAR OU EDITAR PRODUTO NO CARDÁPIO ONLINE    */}
      {/* ======================================================== */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-[#121218] border border-[#282838] rounded-3xl p-5 sm:p-7 max-w-2xl w-full shadow-2xl relative max-h-[92vh] overflow-y-auto space-y-5">
            <button
              onClick={() => {
                setEditingProduct(null);
                setIsNewItem(false);
                setIsCreatingCategory(false);
                setConfirmDeleteId(null);
              }}
              className="absolute top-5 right-5 text-[#71717A] hover:text-white p-2 rounded-xl bg-[#181824] hover:bg-[#222232] cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Cabeçalho do Modal */}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase text-[#FFE600] tracking-wider">
                  {isNewItem ? '✨ Novo Cadastro' : '📝 Gestão de Produto'}
                </span>
                <span className="text-xs text-[#71717A]">• Cardápio Online & Estoque</span>
              </div>
              <h3 className="text-xl font-black text-white mt-1">
                {isNewItem ? 'Cadastrar Item no Cardápio Online' : 'Editar Produto & Ficha Técnica'}
              </h3>
              <p className="text-xs text-[#A1A1AA] mt-0.5">
                Cadastre ou altere os dados uma única vez. As mudanças refletem instantaneamente no Cardápio Online do cliente.
              </p>
            </div>

            <div className="space-y-4">
              {/* 1. Nome e Categoria */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#FFC72C] mb-1.5 flex items-center gap-1.5">
                    <UtensilsCrossed className="w-3.5 h-3.5" />
                    <span>Nome do Produto / Prato *</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: X-Salada Especial, Coca-Cola..."
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="w-full bg-[#181824] border border-[#2E2E42] focus:border-[#FFC72C] rounded-xl px-3.5 py-2.5 text-sm text-white font-bold placeholder:text-zinc-600 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold uppercase text-[#A1A1AA] flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-[#FFC72C]" />
                      <span>Categoria no Cardápio *</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCreatingCategory(!isCreatingCategory)}
                      className="text-[10px] font-extrabold text-[#FFE600] hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{isCreatingCategory ? 'Cancelar' : '+ Nova Categoria'}</span>
                    </button>
                  </div>

                  {isCreatingCategory ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Nome da categoria..."
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="flex-1 bg-[#181824] border border-[#FFE600]/60 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!newCategoryName.trim()) return;
                          const catId = `cat_${newCategoryName.trim().toLowerCase().replace(/[\s\W-]+/g, '_')}`;
                          addCategory({
                            id: catId,
                            name: newCategoryName.trim(),
                            icon: '🍽️',
                            order: (categories.length || 0) + 1,
                            description: `Itens de ${newCategoryName.trim()}`
                          });
                          setEditingProduct({ ...editingProduct, category: catId });
                          setNewCategoryName('');
                          setIsCreatingCategory(false);
                          playCashRegister();
                        }}
                        className="px-3 py-2 bg-[#FFE600] text-black font-black text-xs rounded-xl hover:bg-[#FFF066] cursor-pointer"
                      >
                        Salvar
                      </button>
                    </div>
                  ) : (
                    <select
                      value={editingProduct.category}
                      onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                      className="w-full bg-[#181824] border border-[#2E2E42] focus:border-[#FFC72C] rounded-xl px-3.5 py-2.5 text-xs text-white font-bold focus:outline-none cursor-pointer"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.icon ? `${c.icon} ` : ''}{c.name}
                        </option>
                      ))}
                      <option value="cat_smash">🍔 Smash Burgers</option>
                      <option value="cat_lanches">🥪 Lanches Tradicionais</option>
                      <option value="cat_bebidas">🥤 Bebidas & Refrigerantes</option>
                      <option value="cat_pizzas">🍕 Pizzas Artesanais</option>
                      <option value="cat_porcoes">🍟 Porções & Batatas</option>
                      <option value="cat_sobremesas">🍰 Sobremesas</option>
                    </select>
                  )}
                </div>
              </div>

              {/* 2. Descrição no Cardápio Online (1 a 2 linhas) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold uppercase text-[#A1A1AA] flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#FFC72C]" />
                    <span>Descrição no Cardápio Online (1 a 2 linhas)</span>
                  </label>
                  <span className="text-[10px] text-[#71717A]">
                    {(editingProduct.description || '').length}/160 caracteres
                  </span>
                </div>
                <textarea
                  rows={2}
                  maxLength={200}
                  placeholder="Ex: Pão brioche selado, hambúrguer artesanal 160g, queijo prato duplo, alface crocante, tomate e maionese especial da casa."
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  className="w-full bg-[#181824] border border-[#2E2E42] focus:border-[#FFC72C] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none resize-none leading-relaxed"
                />
                <p className="text-[10px] text-[#71717A] mt-1">
                  💡 Uma descrição clara e saborosa desperta o apetite do cliente e aumenta a taxa de conversão em até 28%.
                </p>
              </div>

              {/* 3. Fotografia do Prato e Presets */}
              <div className="bg-[#181824] p-3.5 rounded-2xl border border-[#282838] space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase text-[#FFC72C] flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-[#FFC72C]" />
                    <span>Fotografia do Prato (Cardápio Online & Visualização)</span>
                  </label>
                  <span className="text-[10px] text-[#A1A1AA]">Alta resolução</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-black border border-[#303044] shrink-0">
                    <img
                      src={editingProduct.imageUrl || FOOD_PRESET_IMAGES[0].url}
                      alt={editingProduct.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = FOOD_PRESET_IMAGES[0].url;
                      }}
                    />
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/..."
                      value={editingProduct.imageUrl || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, imageUrl: e.target.value })}
                      className="w-full bg-[#101016] border border-[#2E2E40] rounded-xl px-3 py-2 text-xs text-white focus:border-[#FFC72C] focus:outline-none"
                    />
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-thin">
                      <span className="text-[9px] text-[#71717A] shrink-0 font-bold">Presets:</span>
                      {FOOD_PRESET_IMAGES.slice(0, 8).map((preset, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() => setEditingProduct({ ...editingProduct, imageUrl: preset.url })}
                          className="text-[9px] px-2 py-0.5 rounded-lg bg-[#20202E] hover:bg-[#2A2A3E] text-zinc-300 hover:text-white border border-[#323246] shrink-0 cursor-pointer transition-colors"
                        >
                          {preset.title.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Preço de Venda Base & Custo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#00E676] mb-1">
                    Preço de Venda Base (R$) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-zinc-500">R$</span>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={editingProduct.price || ''}
                      onChange={(e) => {
                        const newPrice = Number(e.target.value);
                        const cost = editingProduct.costPrice || 0;
                        const newCmv = newPrice > 0 ? (cost / newPrice) * 100 : 0;
                        const margin = newPrice > 0 ? ((newPrice - cost) / newPrice) * 100 : 0;
                        setEditingProduct({
                          ...editingProduct,
                          price: newPrice,
                          cmvPercent: newCmv,
                          profitMarginPercent: margin,
                          marginPercent: margin,
                        });
                      }}
                      className="w-full bg-[#181824] border border-[#282838] focus:border-[#00E676] rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:outline-none font-bold font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#71717A] mb-1">
                    Custo dos Insumos / CMV (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-zinc-500">R$</span>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={editingProduct.costPrice ?? ''}
                      onChange={(e) => {
                        const cost = Number(e.target.value);
                        const price = editingProduct.price || 0;
                        const newCmv = price > 0 ? (cost / price) * 100 : 0;
                        const margin = price > 0 ? ((price - cost) / price) * 100 : 0;
                        setEditingProduct({
                          ...editingProduct,
                          costPrice: cost,
                          cmvPercent: newCmv,
                          profitMarginPercent: margin,
                          marginPercent: margin,
                        });
                      }}
                      className="w-full bg-[#181824] border border-[#282838] focus:border-[#FFC72C] rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:outline-none font-bold font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Indicadores de Margem */}
              <div className="p-3 bg-[#0A0A0E] rounded-2xl border border-[#20202C] grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[#A1A1AA] text-[11px]">Custo dos Ingredientes (CMV): </span>
                  <div className="text-[#00D26A] font-black text-sm font-mono mt-0.5">
                    {formatPercent(editingProduct.cmvPercent ?? (editingProduct.price > 0 ? ((editingProduct.costPrice || 0) / editingProduct.price) * 100 : 0))}
                  </div>
                </div>
                <div>
                  <span className="text-[#A1A1AA] text-[11px]">Margem de Contribuição: </span>
                  <div className="text-[#FFE600] font-black text-sm font-mono mt-0.5">
                    {formatBRL(Math.max(0, (editingProduct.price || 0) - (editingProduct.costPrice || 0)))} ({formatPercent(editingProduct.profitMarginPercent ?? (editingProduct.price > 0 ? (((editingProduct.price || 0) - (editingProduct.costPrice || 0)) / editingProduct.price) * 100 : 0))})
                  </div>
                </div>
              </div>

              {/* 5. Variações de Tamanho / Preço (Ex: Bebidas: Lata, 1L, 1.5L, 2L ou Pizza P/M/G) */}
              <div className="bg-[#181824] p-4 rounded-2xl border border-[#282838] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-[11px] font-bold uppercase text-[#FFC72C] flex items-center gap-1.5">
                      <Boxes className="w-3.5 h-3.5 text-[#FFC72C]" />
                      <span>Variações de Tamanho & Preço</span>
                    </label>
                    <p className="text-[10px] text-[#A1A1AA] mt-0.5">
                      Ex: Bebidas (Lata 350ml, Garrafa 1L, 1.5L, 2L) ou Porções (P, M, G).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      // Preset rápido de bebidas
                      const drinkPresets = [
                        { label: 'Lata 350ml', price: 6.00 },
                        { label: 'Garrafa 1L', price: 10.00 },
                        { label: 'Garrafa 1.5L', price: 12.00 },
                        { label: 'Garrafa 2L', price: 14.00 }
                      ];
                      setEditingProduct({
                        ...editingProduct,
                        priceVariants: drinkPresets
                      });
                      playBeep(850, 0.04);
                    }}
                    className="text-[10px] font-extrabold px-2.5 py-1 rounded-lg bg-[#242436] hover:bg-[#2F2F46] text-zinc-300 hover:text-white border border-[#3A3A52] cursor-pointer transition-colors"
                  >
                    + Carregar Exemplo (Lata / 1L / 2L)
                  </button>
                </div>

                {/* Lista de variações existentes */}
                {(editingProduct.priceVariants && editingProduct.priceVariants.length > 0) ? (
                  <div className="space-y-2">
                    {editingProduct.priceVariants.map((variant, vIdx) => (
                      <div
                        key={vIdx}
                        className="flex items-center justify-between bg-[#111118] border border-[#262638] rounded-xl px-3.5 py-2 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#00D26A]" />
                          <span className="font-bold text-white">{variant.label}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-black text-[#00E676]">{formatBRL(variant.price)}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = (editingProduct.priceVariants || []).filter((_, i) => i !== vIdx);
                              setEditingProduct({ ...editingProduct, priceVariants: updated });
                            }}
                            className="text-red-400 hover:text-red-300 p-1 cursor-pointer"
                            title="Remover variação"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-2.5 px-3 bg-[#111118] rounded-xl border border-[#242434] text-[11px] text-[#71717A] text-center">
                    Nenhuma variação de tamanho cadastrada. O produto usará apenas o preço base ({formatBRL(editingProduct.price || 0)}).
                  </div>
                )}

                {/* Linha de cadastro de nova variação */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Nome da variação (ex: Lata 350ml, 1L, 2L, Grande...)"
                    value={newVariantLabel}
                    onChange={(e) => setNewVariantLabel(e.target.value)}
                    className="flex-1 bg-[#111118] border border-[#2A2A3E] focus:border-[#FFC72C] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                  <div className="relative w-28">
                    <span className="absolute left-2.5 top-2 text-[11px] text-zinc-500 font-bold">R$</span>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="0,00"
                      value={newVariantPrice}
                      onChange={(e) => setNewVariantPrice(e.target.value)}
                      className="w-full bg-[#111118] border border-[#2A2A3E] focus:border-[#FFC72C] rounded-xl pl-7 pr-2.5 py-2 text-xs text-white font-mono font-bold focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!newVariantLabel.trim() || !newVariantPrice) return;
                      const newVar = {
                        label: newVariantLabel.trim(),
                        price: Number(newVariantPrice)
                      };
                      setEditingProduct({
                        ...editingProduct,
                        priceVariants: [...(editingProduct.priceVariants || []), newVar]
                      });
                      setNewVariantLabel('');
                      setNewVariantPrice('');
                      playBeep(900, 0.03);
                    }}
                    className="px-3.5 py-2 bg-[#26263A] hover:bg-[#34344E] text-[#FFE600] font-bold text-xs rounded-xl border border-[#3E3E58] cursor-pointer transition-colors shrink-0 flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar</span>
                  </button>
                </div>
              </div>

              {/* 6. Destaque Visual, Praça e Disponibilidade */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#71717A] mb-1">
                    Selo de Destaque / Badge
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Mais Pedido, Artesanal..."
                    value={editingProduct.badgeText || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, badgeText: e.target.value })}
                    className="w-full bg-[#181824] border border-[#282838] focus:border-[#FFC72C] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#71717A] mb-1">
                    Praça de Preparo (KDS)
                  </label>
                  <select
                    value={editingProduct.station || 'grill'}
                    onChange={(e) => setEditingProduct({ ...editingProduct, station: e.target.value as any })}
                    className="w-full bg-[#181824] border border-[#282838] focus:border-[#FFC72C] rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
                  >
                    <option value="grill">Chapa / Grelha</option>
                    <option value="fryer">Fritadeira</option>
                    <option value="assembly">Montagem</option>
                    <option value="bar">Bar & Bebidas</option>
                    <option value="dessert">Sobremesas</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#71717A] mb-1">
                    Status no Cardápio
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditingProduct({ ...editingProduct, available: !editingProduct.available })}
                    className={`w-full py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      editingProduct.available
                        ? 'bg-[#00D26A]/20 border-[#00D26A]/50 text-[#00E676]'
                        : 'bg-red-500/20 border-red-500/50 text-red-400'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${editingProduct.available ? 'bg-[#00E676] animate-pulse' : 'bg-red-400'}`} />
                    <span>{editingProduct.available ? 'Visível (Ativo)' : 'Pausado (Oculto)'}</span>
                  </button>
                </div>
              </div>

              {/* Confirmação de Exclusão */}
              {confirmDeleteId && (
                <div className="p-3.5 bg-red-950/40 border border-red-500/50 rounded-2xl flex items-center justify-between gap-3 text-xs">
                  <div className="text-red-200">
                    <strong>Tem certeza que deseja excluir "{editingProduct.name}"?</strong>
                    <p className="text-[11px] text-red-300/80 mt-0.5">O produto será removido do Cardápio Online e do sistema.</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-3 py-1.5 bg-[#20202E] text-white rounded-xl font-bold cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        deleteProduct(editingProduct.id);
                        setEditingProduct(null);
                        setIsNewItem(false);
                        setConfirmDeleteId(null);
                        playBeep(600, 0.08);
                      }}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold cursor-pointer shadow-lg"
                    >
                      Sim, Excluir
                    </button>
                  </div>
                </div>
              )}

              {/* Botões de Ação no Rodapé do Modal */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
                {!isNewItem && !confirmDeleteId && (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(editingProduct.id)}
                    className="w-full sm:w-auto py-3 px-4 bg-red-500/15 hover:bg-red-500/25 text-red-400 hover:text-red-300 border border-red-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Excluir</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    // Salvar e abrir o cardápio online do cliente
                    if (isNewItem) {
                      addProduct(editingProduct);
                    } else {
                      updateProduct(editingProduct);
                    }
                    setEditingProduct(null);
                    setIsNewItem(false);
                    setCurrentView('cardapio_digital');
                    playCashRegister();
                  }}
                  className="w-full sm:w-auto py-3 px-4 bg-[#20202E] hover:bg-[#2A2A3E] text-white border border-[#303044] hover:border-[#FFE600]/40 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4 text-[#FFE600]" />
                  <span>Ver no Cardápio Online</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!editingProduct.name.trim()) {
                      alert('Por favor, informe o nome do produto.');
                      return;
                    }
                    if (isNewItem) {
                      addProduct(editingProduct);
                    } else {
                      updateProduct(editingProduct);
                    }
                    setEditingProduct(null);
                    setIsNewItem(false);
                    playCashRegister();
                  }}
                  className="w-full sm:flex-1 py-3.5 bg-gradient-to-r from-[#DA291C] via-[#FF6B00] to-[#FFC72C] hover:brightness-110 text-white font-black text-xs rounded-xl shadow-lg cursor-pointer transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>
                    {isNewItem ? 'SALVAR E PUBLICAR NO CARDÁPIO ONLINE' : 'SALVAR ALTERAÇÕES DO PRODUTO'}
                  </span>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Modal de Exportação do Catálogo Completo em PDF com Branding e QR Code */}
      <CatalogoPdfExportModal
        isOpen={isCatalogoPdfModalOpen}
        onClose={() => setIsCatalogoPdfModalOpen(false)}
        products={products}
      />

      {/* Modal de Exportação Executiva (PDF / CSV / Área de Transferência) */}
      <MenuEngineeringExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        products={exportItems}
        benchmarks={benchmarks}
        tenantName={tenant?.name || 'Lanchonete Dulci'}
        onOpenCatalogoPdf={() => setIsCatalogoPdfModalOpen(true)}
      />

      {/* Modal de Otimização de Preços por Elasticidade de Demanda (Ep) */}
      <PriceElasticityModal
        isOpen={isElasticityModalOpen}
        onClose={() => setIsElasticityModalOpen(false)}
        products={products}
        onApplySinglePrice={handleApplySinglePrice}
        onApplyBatchPrices={handleApplyBatchPrices}
      />

    </div>
  );
};
