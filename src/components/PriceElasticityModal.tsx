import React, { useState, useMemo } from 'react';
import {
  X,
  Sparkles,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CheckCircle2,
  Sliders,
  ArrowRight,
  HelpCircle,
  BarChart3,
  Layers,
  Flame,
  Star,
  ShieldAlert,
  Zap,
  Info,
  ChevronRight,
  RefreshCw,
  Award
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceDot
} from 'recharts';
import { Product, BCGClassification } from '../types';
import { formatBRL, formatPercent } from '../utils/formatters';
import { playBeep, playCashRegister, playAlert } from '../utils/audio';
import {
  OptimizationStrategy,
  ElasticityProfile,
  calculateElasticityProfile,
  generateElasticityPortfolioAnalysis
} from '../utils/elasticityEngine';

interface PriceElasticityModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onApplySinglePrice: (productId: string, newPrice: number) => void;
  onApplyBatchPrices: (updates: { productId: string; newPrice: number }[]) => void;
}

export const PriceElasticityModal: React.FC<PriceElasticityModalProps> = ({
  isOpen,
  onClose,
  products,
  onApplySinglePrice,
  onApplyBatchPrices,
}) => {
  const [strategy, setStrategy] = useState<OptimizationStrategy>('balanced');
  const [selectedQuadrantFilter, setSelectedQuadrantFilter] = useState<'all' | 'star' | 'dog'>('all');
  const [focusedProductId, setFocusedProductId] = useState<string | null>(null);
  
  // Custom manual price overrides in modal
  const [customPriceDeltas, setCustomPriceDeltas] = useState<Record<string, number>>({});
  const [appliedProductIds, setAppliedProductIds] = useState<string[]>([]);

  // Calculate portfolio analysis
  const portfolioAnalysis = useMemo(() => {
    return generateElasticityPortfolioAnalysis(products, selectedQuadrantFilter, strategy);
  }, [products, selectedQuadrantFilter, strategy]);

  // Adjust item profiles if user manually manipulated sliders
  const itemProfiles = useMemo(() => {
    return portfolioAnalysis.items.map(baseProfile => {
      const manualDelta = customPriceDeltas[baseProfile.productId];
      if (manualDelta === undefined) return baseProfile;

      const price = baseProfile.currentPrice;
      const cost = baseProfile.currentCost;
      const volume = baseProfile.currentVolume;
      const coefficient = baseProfile.elasticityCoefficient;
      
      const newPrice = Math.max(1, price + manualDelta);
      const priceDeltaPercent = price > 0 ? (manualDelta / price) * 100 : 0;
      const projectedVolumePercentChange = coefficient * priceDeltaPercent;
      const projectedNewVolume = Math.max(1, Math.round(volume * (1 + (projectedVolumePercentChange / 100))));
      const projectedNewMarginReais = Math.max(0, newPrice - cost);
      const projectedNewMarginPercent = newPrice > 0 ? (projectedNewMarginReais / newPrice) * 100 : 0;
      const projectedNewCmv = newPrice > 0 ? (cost / newPrice) * 100 : 0;
      const projectedNewProfitMonthly = projectedNewMarginReais * projectedNewVolume;
      const projectedProfitDeltaMonthly = projectedNewProfitMonthly - baseProfile.currentProfitMonthly;

      return {
        ...baseProfile,
        suggestedPriceDelta: manualDelta,
        suggestedNewPrice: newPrice,
        priceDeltaPercent,
        projectedVolumePercentChange,
        projectedNewVolume,
        projectedNewMarginReais,
        projectedNewMarginPercent,
        projectedNewCmv,
        projectedNewProfitMonthly,
        projectedProfitDeltaMonthly,
        projectedProfitGainPercent: baseProfile.currentProfitMonthly > 0
          ? (projectedProfitDeltaMonthly / baseProfile.currentProfitMonthly) * 100
          : 0,
      };
    });
  }, [portfolioAnalysis.items, customPriceDeltas]);

  // Default focus product
  const focusedProfile = useMemo(() => {
    if (focusedProductId) {
      const found = itemProfiles.find(p => p.productId === focusedProductId);
      if (found) return found;
    }
    return itemProfiles[0] || null;
  }, [itemProfiles, focusedProductId]);

  // Generate Simulation Curve for focused product: Q(P) and Profit(P)
  const elasticityCurveData = useMemo(() => {
    if (!focusedProfile) return [];

    const p0 = focusedProfile.currentPrice;
    const c0 = focusedProfile.currentCost;
    const q0 = focusedProfile.currentVolume;
    const ep = focusedProfile.elasticityCoefficient;

    const points = [];
    const minPrice = Math.max(1, Math.floor(p0 * 0.75));
    const maxPrice = Math.ceil(p0 * 1.35);
    const step = Math.max(0.5, (maxPrice - minPrice) / 14);

    for (let p = minPrice; p <= maxPrice; p += step) {
      const priceDeltaPct = ((p - p0) / p0) * 100;
      const volDeltaPct = ep * priceDeltaPct;
      const qProj = Math.max(0, q0 * (1 + volDeltaPct / 100));
      const marginR = Math.max(0, p - c0);
      const profitM = marginR * qProj;
      const revM = p * qProj;

      points.push({
        price: Number(p.toFixed(2)),
        demand: Math.round(qProj),
        profit: Math.round(profitM),
        revenue: Math.round(revM),
        isCurrent: Math.abs(p - p0) < 0.3,
        isSuggested: Math.abs(p - focusedProfile.suggestedNewPrice) < 0.3,
      });
    }

    return points;
  }, [focusedProfile]);

  // Overall totals recalculated with manual tweaks
  const totalMonthlyGain = useMemo(() => {
    return itemProfiles.reduce((acc, p) => acc + p.projectedProfitDeltaMonthly, 0);
  }, [itemProfiles]);

  if (!isOpen) return null;

  const handleApplySingle = (profile: ElasticityProfile) => {
    onApplySinglePrice(profile.productId, profile.suggestedNewPrice);
    setAppliedProductIds(prev => [...prev, profile.productId]);
    playCashRegister();
  };

  const handleApplyAll = () => {
    const updates = itemProfiles.map(p => ({
      productId: p.productId,
      newPrice: p.suggestedNewPrice,
    }));
    onApplyBatchPrices(updates);
    setAppliedProductIds(itemProfiles.map(p => p.productId));
    playCashRegister();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in overflow-y-auto">
      <div className="bg-[#0F0F16] border border-[#2B2B3E] rounded-3xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-6 bg-[#141420] border-b border-[#242436] flex items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#FFE600] to-[#FF9900] text-black flex items-center justify-center shadow-lg shadow-[#FFE600]/20 font-black">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#FFE600] flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Economia Comportamental & Elasticidade de Demanda
                </span>
                <span className="text-[10px] text-[#71717A]">• Matriz Kasavana & Smith</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white mt-0.5">
                Otimizador Automático de Preços por Elasticidade ($E_p$)
              </h2>
              <p className="text-xs text-[#A1A1AA]">
                Ajuste automático para pratos <strong>⭐ Estrelas</strong> (aproveitamento de demanda inelástica) e <strong>🐶 Cães de Guarda</strong> (recuperação de CMV crítico).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setCustomPriceDeltas({});
                setAppliedProductIds([]);
                playBeep(700, 0.04);
              }}
              className="p-2 bg-[#1C1C28] hover:bg-[#28283C] text-[#A1A1AA] hover:text-white rounded-xl border border-[#2E2E42] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
              title="Restaurar sugestões padrão da IA"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Restaurar Padrão</span>
            </button>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-[#1C1C28] hover:bg-[#2A2A3E] text-[#A1A1AA] hover:text-white flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODAL CONTROLS & KPI SUMMARY BANNER */}
        <div className="p-4 sm:p-6 bg-[#0B0B11] border-b border-[#202030] space-y-4">
          
          {/* Strategy Bar & Target Filters */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            
            {/* Strategy Selectors */}
            <div className="flex items-center gap-2 bg-[#14141E] p-1.5 rounded-2xl border border-[#222234]">
              <span className="text-[11px] font-bold text-[#71717A] px-2 flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5 text-[#FFE600]" />
                Perfil:
              </span>
              {(['conservative', 'balanced', 'aggressive'] as OptimizationStrategy[]).map(st => (
                <button
                  key={st}
                  onClick={() => {
                    setStrategy(st);
                    playBeep(800, 0.03);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    strategy === st
                      ? 'bg-[#FFE600] text-black font-black shadow-md'
                      : 'text-[#A1A1AA] hover:text-white'
                  }`}
                >
                  {st === 'conservative' ? '🛡️ Conservador (+3-5%)' : st === 'balanced' ? '⚖️ Equilibrado (+6-8%)' : '🚀 Agressivo (+10-14%)'}
                </button>
              ))}
            </div>

            {/* Quadrant Target Filter */}
            <div className="flex items-center gap-1.5 bg-[#14141E] p-1.5 rounded-2xl border border-[#222234]">
              <button
                onClick={() => setSelectedQuadrantFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedQuadrantFilter === 'all'
                    ? 'bg-white text-black font-black'
                    : 'text-[#71717A] hover:text-white'
                }`}
              >
                Todos ({portfolioAnalysis.totalItemsTargeted})
              </button>
              <button
                onClick={() => setSelectedQuadrantFilter('star')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedQuadrantFilter === 'star'
                    ? 'bg-[#FFE600] text-black font-black'
                    : 'text-[#FFE600] hover:bg-[#222218]'
                }`}
              >
                ⭐ Estrelas ({portfolioAnalysis.starItemsCount})
              </button>
              <button
                onClick={() => setSelectedQuadrantFilter('dog')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedQuadrantFilter === 'dog'
                    ? 'bg-[#FF2B4E] text-white font-black'
                    : 'text-[#FF2B4E] hover:bg-[#251419]'
                }`}
              >
                🐶 Cães ({portfolioAnalysis.dogItemsCount})
              </button>
            </div>

          </div>

          {/* 4 KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            
            <div className="p-3.5 bg-gradient-to-br from-[#121A15] to-[#0E1511] border border-[#00D26A]/30 rounded-2xl">
              <div className="flex items-center justify-between text-[#00D26A]">
                <span className="text-[10px] font-black uppercase tracking-wider">Lucro Extra Mensal</span>
                <TrendingUp className="w-4 h-4" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-white mt-1 font-mono">
                +{formatBRL(totalMonthlyGain)}
              </div>
              <span className="text-[11px] text-[#00D26A] font-extrabold block mt-0.5">
                +{portfolioAnalysis.totalMonthlyGainPercent.toFixed(1)}% sobre margem atual
              </span>
            </div>

            <div className="p-3.5 bg-[#14141E] border border-[#242436] rounded-2xl">
              <div className="flex items-center justify-between text-[#FFE600]">
                <span className="text-[10px] font-black uppercase tracking-wider">Itens Estrela (Inelásticos)</span>
                <Star className="w-4 h-4" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-white mt-1">
                {portfolioAnalysis.starItemsCount} pratos
              </div>
              <span className="text-[11px] text-[#A1A1AA] block mt-0.5">
                Elasticidade média: <strong>Ep = -0.41</strong>
              </span>
            </div>

            <div className="p-3.5 bg-[#14141E] border border-[#242436] rounded-2xl">
              <div className="flex items-center justify-between text-[#FF2B4E]">
                <span className="text-[10px] font-black uppercase tracking-wider">Itens Cão de Guarda</span>
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-white mt-1">
                {portfolioAnalysis.dogItemsCount} pratos
              </div>
              <span className="text-[11px] text-[#A1A1AA] block mt-0.5">
                Ajuste para CMV Alvo de 30%
              </span>
            </div>

            <div className="p-3.5 bg-[#14141E] border border-[#242436] rounded-2xl">
              <div className="flex items-center justify-between text-[#77D4E1]">
                <span className="text-[10px] font-black uppercase tracking-wider">Impacto Projetado em Vendas</span>
                <BarChart3 className="w-4 h-4" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-white mt-1">
                {portfolioAnalysis.avgVolumeChangePercent > 0 ? `+${portfolioAnalysis.avgVolumeChangePercent.toFixed(1)}%` : `${portfolioAnalysis.avgVolumeChangePercent.toFixed(1)}%`}
              </div>
              <span className="text-[11px] text-[#00D26A] font-bold block mt-0.5">
                Lucro sobe mesmo com leve variação
              </span>
            </div>

          </div>

        </div>

        {/* MODAL MAIN BODY: GRID WITH ITEMS TABLE + DYNAMIC CURVE VISUALIZER */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* LEFT COLUMN: LIST OF DISHES TO OPTIMIZE */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#FFE600]" />
                  Pratos Analisados ({itemProfiles.length})
                </h3>
                <span className="text-[11px] text-[#71717A]">
                  Clique em um item para visualizar a curva de demanda e lucro
                </span>
              </div>

              <div className="space-y-3">
                {itemProfiles.map((item) => {
                  const isStar = item.classification === 'star';
                  const isFocused = focusedProfile?.productId === item.productId;
                  const isApplied = appliedProductIds.includes(item.productId);

                  const borderColor = isFocused
                    ? 'border-[#FFE600] bg-[#1A1A28]'
                    : isStar
                    ? 'border-[#FFE600]/30 bg-[#13131C] hover:border-[#FFE600]/60'
                    : 'border-[#FF2B4E]/30 bg-[#140E10] hover:border-[#FF2B4E]/60';

                  return (
                    <div
                      key={item.productId}
                      onClick={() => {
                        setFocusedProductId(item.productId);
                        playBeep(850, 0.03);
                      }}
                      className={`p-4 rounded-2xl border ${borderColor} transition-all cursor-pointer space-y-3 shadow-md relative`}
                    >
                      {/* Top Bar: Image, Name, Badge, Delta Price */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.imageUrl}
                            alt={item.productName}
                            className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${
                                isStar ? 'bg-[#FFE600]/20 text-[#FFE600] border-[#FFE600]/40' : 'bg-[#FF2B4E]/20 text-[#FF2B4E] border-[#FF2B4E]/40'
                              }`}>
                                {isStar ? '⭐ Estrela' : '🐶 Cão de Guarda'}
                              </span>
                              <span className="text-[10px] font-mono font-bold text-[#A1A1AA] bg-black/40 px-1.5 py-0.5 rounded border border-white/5">
                                Ep: {item.elasticityCoefficient}
                              </span>
                            </div>
                            <h4 className="font-black text-sm text-white mt-1 leading-snug">
                              {item.productName}
                            </h4>
                          </div>
                        </div>

                        {/* Price Tag Comparison */}
                        <div className="text-right">
                          <div className="flex items-center gap-1.5 justify-end">
                            <span className="text-xs text-[#71717A] line-through font-mono">{formatBRL(item.currentPrice)}</span>
                            <ArrowRight className="w-3 h-3 text-[#FFE600]" />
                            <span className="text-sm font-black text-[#00D26A] font-mono">{formatBRL(item.suggestedNewPrice)}</span>
                          </div>
                          <span className="text-[10px] font-black text-[#FFE600] font-mono">
                            +{formatBRL(item.suggestedPriceDelta)} (+{item.priceDeltaPercent.toFixed(1)}%)
                          </span>
                        </div>
                      </div>

                      {/* Economic Rationale */}
                      <p className="text-xs text-[#D4D4D8] leading-relaxed">
                        {item.strategicRecommendation}
                      </p>

                      {/* 4 Metric Chips: CMV, Margin, Volume, Extra Profit */}
                      <div className="grid grid-cols-4 gap-2 bg-black/40 p-2.5 rounded-xl border border-white/5 text-center text-xs">
                        <div>
                          <span className="text-[9px] text-[#71717A] uppercase font-bold block">CMV Projetado</span>
                          <span className={`font-mono font-black ${item.projectedNewCmv <= 30 ? 'text-[#00D26A]' : 'text-[#FFE600]'}`}>
                            {item.projectedNewCmv.toFixed(1)}%
                          </span>
                        </div>

                        <div>
                          <span className="text-[9px] text-[#71717A] uppercase font-bold block">Margem Unit.</span>
                          <span className="font-mono font-black text-[#FFE600]">
                            {formatBRL(item.projectedNewMarginReais)}
                          </span>
                        </div>

                        <div>
                          <span className="text-[9px] text-[#71717A] uppercase font-bold block">Vol. Projetado</span>
                          <span className="font-mono font-black text-[#77D4E1]">
                            {item.projectedNewVolume} un <span className="text-[9px] text-[#A1A1AA]">({item.projectedVolumePercentChange.toFixed(1)}%)</span>
                          </span>
                        </div>

                        <div>
                          <span className="text-[9px] text-[#71717A] uppercase font-bold block">Lucro Adicional</span>
                          <span className="font-mono font-black text-[#00D26A]">
                            +{formatBRL(item.projectedProfitDeltaMonthly)}/mês
                          </span>
                        </div>
                      </div>

                      {/* Slider de ajuste fino manual para este item */}
                      <div className="pt-1 flex items-center justify-between gap-3">
                        <div className="flex-1 flex items-center gap-2">
                          <span className="text-[10px] text-[#71717A] whitespace-nowrap">Ajuste fino:</span>
                          <input
                            type="range"
                            min="0"
                            max={Math.max(10, Math.round(item.currentPrice * 0.3))}
                            step="0.5"
                            value={item.suggestedPriceDelta}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setCustomPriceDeltas(prev => ({ ...prev, [item.productId]: val }));
                            }}
                            className="w-full accent-[#FFE600] h-1.5 bg-[#252538] rounded-lg cursor-pointer"
                          />
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApplySingle(item);
                          }}
                          disabled={isApplied}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                            isApplied
                              ? 'bg-[#00D26A]/20 text-[#00D26A] border border-[#00D26A]/40 cursor-default'
                              : 'bg-[#FFE600] hover:bg-[#FFD700] text-black shadow-md'
                          }`}
                        >
                          {isApplied ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Aplicado</span>
                            </>
                          ) : (
                            <>
                              <Zap className="w-3.5 h-3.5" />
                              <span>Aplicar {formatBRL(item.suggestedNewPrice)}</span>
                            </>
                          )}
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>

            {/* RIGHT COLUMN: DYNAMIC ELASTICITY & PROFIT CURVE VISUALIZER */}
            <div className="lg:col-span-5 space-y-4">
              
              {focusedProfile ? (
                <div className="bg-[#141420] border border-[#28283C] p-4 sm:p-5 rounded-3xl space-y-4 sticky top-4">
                  
                  <div className="flex items-center justify-between pb-3 border-b border-[#222232]">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#FFE600] flex items-center gap-1">
                        <BarChart3 className="w-3.5 h-3.5" />
                        Curva de Elasticidade & Lucro
                      </span>
                      <h4 className="text-sm font-black text-white mt-0.5">
                        {focusedProfile.productName}
                      </h4>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-[#71717A] uppercase font-bold block">Coeficiente Ep</span>
                      <span className="font-mono font-black text-[#FFE600]">{focusedProfile.elasticityCoefficient}</span>
                    </div>
                  </div>

                  {/* Curva Gráfica Interativa com Recharts */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#A1A1AA]">Curva de Lucro Mensal Projetado (R$)</span>
                      <span className="text-[#00D26A] font-bold">Ponto Ótimo: {formatBRL(focusedProfile.suggestedNewPrice)}</span>
                    </div>

                    <div className="h-56 w-full bg-[#0A0A0F] rounded-2xl border border-[#20202E] p-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={elasticityCurveData} margin={{ top: 15, right: 15, left: -10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1E1E2C" />
                          <XAxis
                            dataKey="price"
                            tick={{ fill: '#71717A', fontSize: 10 }}
                            tickFormatter={(val) => `R$${val}`}
                            stroke="#333346"
                          />
                          <YAxis
                            tick={{ fill: '#71717A', fontSize: 10 }}
                            tickFormatter={(val) => `R$${val}`}
                            stroke="#333346"
                          />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-[#161622] border border-[#2C2C40] p-3 rounded-xl shadow-xl text-xs space-y-1 text-white">
                                    <div className="font-black text-[#FFE600]">Preço: {formatBRL(data.price)}</div>
                                    <div className="text-[#00D26A] font-bold">Lucro Total: {formatBRL(data.profit)}/mês</div>
                                    <div className="text-[#77D4E1]">Vendas Estimadas: {data.demand} un</div>
                                    <div className="text-[#A1A1AA]">Faturamento: {formatBRL(data.revenue)}</div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          
                          {/* Linha de Lucro Total */}
                          <Line
                            type="monotone"
                            dataKey="profit"
                            name="Lucro Mensal"
                            stroke="#00D26A"
                            strokeWidth={3}
                            dot={false}
                          />

                          {/* Ponto do Preço Atual */}
                          <ReferenceLine
                            x={focusedProfile.currentPrice}
                            stroke="#71717A"
                            strokeDasharray="3 3"
                            label={{ value: 'Atual', fill: '#A1A1AA', fontSize: 9, position: 'top' }}
                          />

                          {/* Ponto do Preço Sugerido */}
                          <ReferenceLine
                            x={focusedProfile.suggestedNewPrice}
                            stroke="#FFE600"
                            strokeWidth={2}
                            label={{ value: 'Ótimo Ep', fill: '#FFE600', fontSize: 10, position: 'top', fontWeight: 'bold' }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Explicação Didática da Elasticidade */}
                  <div className="p-3.5 bg-[#0C0C12] rounded-2xl border border-[#222232] space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-[#FFE600] font-black">
                      <HelpCircle className="w-4 h-4 shrink-0" />
                      <span>Como o Algoritmo Calculou Esse Preço?</span>
                    </div>
                    <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
                      {focusedProfile.elasticityRationale}
                    </p>
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                      <span className="text-[#71717A]">Ganho de Lucro Líquido:</span>
                      <strong className="text-[#00D26A] font-mono">+{formatBRL(focusedProfile.projectedProfitDeltaMonthly)}/mês</strong>
                    </div>
                  </div>

                  {/* Ação Rápida para o item focado */}
                  <button
                    onClick={() => handleApplySingle(focusedProfile)}
                    className="w-full py-3 bg-gradient-to-r from-[#FFE600] to-[#FF9900] hover:brightness-110 text-black font-extrabold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>APLICAR REAJUSTE DE {formatBRL(focusedProfile.suggestedNewPrice)}</span>
                  </button>

                </div>
              ) : (
                <div className="bg-[#141420] border border-[#28283C] p-6 rounded-3xl text-center space-y-3 text-xs text-[#71717A]">
                  <Info className="w-8 h-8 mx-auto text-[#FFE600]" />
                  <p>Selecione um prato na lista ao lado para ver a análise gráfica de sensibilidade da curva de lucro.</p>
                </div>
              )}

            </div>

          </div>

        </div>

        {/* MODAL FOOTER: BATCH ACTIONS */}
        <div className="p-4 sm:p-6 bg-[#141420] border-t border-[#242436] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00D26A]/20 text-[#00D26A] flex items-center justify-center font-black">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-[#A1A1AA]">Impacto Total nas Contas do Restaurante:</span>
              <div className="text-base font-black text-white">
                <span className="text-[#00D26A] font-mono">+{formatBRL(totalMonthlyGain)}</span> de lucro operacional adicional / mês
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-[#1C1C28] hover:bg-[#28283C] text-[#A1A1AA] hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Fechar
            </button>

            <button
              onClick={handleApplyAll}
              className="px-6 py-2.5 bg-gradient-to-r from-[#00D26A] to-[#00E575] hover:brightness-110 text-black font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Zap className="w-4 h-4 fill-black" />
              <span>APLICAR TODAS AS {itemProfiles.length} SUGESTÕES NO CARDÁPIO</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
