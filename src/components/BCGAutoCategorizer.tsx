import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Zap, 
  Sliders, 
  CheckCircle2, 
  TrendingUp, 
  DollarSign, 
  HelpCircle, 
  RefreshCw, 
  Info, 
  Layers, 
  ArrowRight,
  ShieldAlert,
  Percent,
  Flame,
  PieChart,
  Check,
  X
} from 'lucide-react';
import { Product, BCGClassification } from '../types';
import { formatBRL, formatPercent } from '../utils/formatters';
import { playCashRegister, playBeep } from '../utils/audio';

export interface CategorizationThresholds {
  volumeThreshold: number;
  marginMetric: 'margin_reais' | 'margin_percent' | 'cmv_percent';
  marginThreshold: number; // R$ or %
}

interface BCGAutoCategorizerProps {
  products: Product[];
  benchmarks: {
    avgVolume: number;
    avgMarginReais: number;
    avgMarginPercent: number;
    totalRevenue: number;
    totalProfit: number;
  };
  onApplyCategorization: (updatedProducts: Product[], summary: {
    stars: number;
    cashCows: number;
    questionMarks: number;
    dogs: number;
  }) => void;
  onFilterQuadrant?: (quadrant: BCGClassification | 'all') => void;
  selectedQuadrant?: BCGClassification | 'all';
  autoModeEnabled: boolean;
  onToggleAutoMode: (enabled: boolean) => void;
}

export const BCGAutoCategorizer: React.FC<BCGAutoCategorizerProps> = ({
  products,
  benchmarks,
  onApplyCategorization,
  onFilterQuadrant,
  selectedQuadrant = 'all',
  autoModeEnabled,
  onToggleAutoMode,
}) => {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastCategorizedTime, setLastCategorizedTime] = useState<string | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<{
    show: boolean;
    message: string;
    summary?: { stars: number; cashCows: number; questionMarks: number; dogs: number };
  }>({ show: false, message: '' });

  // Customizable thresholds (defaults to Kasavana & Smith mathematical benchmarks)
  const [thresholds, setThresholds] = useState<CategorizationThresholds>({
    volumeThreshold: benchmarks.avgVolume || 80,
    marginMetric: 'margin_reais',
    marginThreshold: benchmarks.avgMarginReais || 15.0,
  });

  // Calculate live dynamic classification preview based on current thresholds
  const previewClassification = useMemo(() => {
    let stars = 0;
    let cashCows = 0;
    let questionMarks = 0;
    let dogs = 0;

    const classifiedProducts = products.map(prod => {
      const price = Number(prod.price || 0);
      const cost = Number(prod.costPrice || 0);
      const marginReais = Math.max(0, price - cost);
      const marginPercent = price > 0 ? (marginReais / price) * 100 : 0;
      const cmvPercent = price > 0 ? (cost / price) * 100 : 0;
      const volume = Number(prod.salesVolume30Days ?? prod.salesCountMonth ?? 0);

      const isHighVolume = volume >= thresholds.volumeThreshold;
      let isHighMargin = false;

      if (thresholds.marginMetric === 'margin_reais') {
        isHighMargin = marginReais >= thresholds.marginThreshold;
      } else if (thresholds.marginMetric === 'margin_percent') {
        isHighMargin = marginPercent >= thresholds.marginThreshold;
      } else {
        // CMV: lower than threshold is high profitability
        isHighMargin = cmvPercent <= thresholds.marginThreshold;
      }

      let newClassification: BCGClassification;
      if (isHighVolume && isHighMargin) {
        newClassification = 'star';
        stars++;
      } else if (isHighVolume && !isHighMargin) {
        newClassification = 'cash_cow';
        cashCows++;
      } else if (!isHighVolume && isHighMargin) {
        newClassification = 'question_mark';
        questionMarks++;
      } else {
        newClassification = 'dog';
        dogs++;
      }

      return {
        ...prod,
        bcgClassification: newClassification,
      };
    });

    return {
      classifiedProducts,
      counts: { stars, cashCows, questionMarks, dogs }
    };
  }, [products, thresholds]);

  // Current database distribution
  const currentDistribution = useMemo(() => {
    let stars = 0;
    let cashCows = 0;
    let questionMarks = 0;
    let dogs = 0;

    products.forEach(p => {
      const c = p.bcgClassification;
      if (c === 'star') stars++;
      else if (c === 'cash_cow' || c === 'horse') cashCows++;
      else if (c === 'question_mark' || c === 'puzzle') questionMarks++;
      else dogs++;
    });

    return { stars, cashCows, questionMarks, dogs };
  }, [products]);

  // Execute Auto-Categorization
  const handleExecuteCategorization = () => {
    setIsProcessing(true);
    playBeep(900, 0.05);

    setTimeout(() => {
      onApplyCategorization(previewClassification.classifiedProducts, previewClassification.counts);
      playCashRegister();
      setIsProcessing(false);
      setLastCategorizedTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));

      setFeedbackToast({
        show: true,
        message: `Cardápio categorizado com sucesso com base nas vendas e custos!`,
        summary: previewClassification.counts,
      });

      setTimeout(() => {
        setFeedbackToast(prev => ({ ...prev, show: false }));
      }, 5000);
    }, 400);
  };

  // Reset to Kasavana & Smith mathematical averages
  const handleResetToAverages = () => {
    setThresholds({
      volumeThreshold: benchmarks.avgVolume,
      marginMetric: 'margin_reais',
      marginThreshold: benchmarks.avgMarginReais,
    });
    playBeep(700, 0.04);
  };

  const totalItems = products.length || 1;

  return (
    <div className="bg-gradient-to-b from-[#141420] to-[#101018] border border-[#2A2A3E] rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5">
      {/* Toast Feedback Notification */}
      <AnimatePresence>
        {feedbackToast.show && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            className="bg-gradient-to-r from-[#00D26A] to-[#00A854] text-black px-4 py-3 rounded-2xl shadow-xl flex items-center justify-between gap-3 font-bold text-xs"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-black shrink-0" />
              <div>
                <span className="font-extrabold">{feedbackToast.message}</span>
                {feedbackToast.summary && (
                  <span className="block text-[11px] font-medium opacity-90">
                    ⭐ {feedbackToast.summary.stars} Estrelas • 🐄 {feedbackToast.summary.cashCows} Vacas Leiteiras • ❓ {feedbackToast.summary.questionMarks} Interrogações • 🍍 {feedbackToast.summary.dogs} Abacaxis
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => setFeedbackToast(prev => ({ ...prev, show: false }))}
              className="p-1 rounded-lg hover:bg-black/10 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Bar with Action Controls */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-[#242436]">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#FFC72C]/15 text-[#FFC72C] border border-[#FFC72C]/30 flex items-center gap-1">
              <Zap className="w-3 h-3 fill-[#FFC72C]" />
              Motor de Auto-Categorização BCG
            </span>
            <span className="text-xs text-[#71717A]">•</span>
            <span className="text-xs text-[#A1A1AA]">
              Popularidade (Vendas 30d) vs. Lucratividade (CMV / Ficha Técnica)
            </span>
          </div>

          <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
            <span>Classificação Automática do Cardápio</span>
            {lastCategorizedTime && (
              <span className="text-[10px] font-normal text-zinc-400 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                Atualizado às {lastCategorizedTime}
              </span>
            )}
          </h2>

          <p className="text-xs text-[#A1A1AA] max-w-2xl leading-relaxed">
            O algoritmo classifica automaticamente cada item em <strong>Estrelas</strong>, <strong>Vacas Leiteiras</strong>, <strong>Interrogações</strong> e <strong>Abacaxis</strong> cruzando o volume de vendas e a margem de contribuição.
          </p>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-start lg:justify-end">
          {/* Continuous Auto-Sync Toggle */}
          <button
            onClick={() => {
              onToggleAutoMode(!autoModeEnabled);
              playBeep(autoModeEnabled ? 600 : 900, 0.04);
            }}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-2 ${
              autoModeEnabled
                ? 'bg-[#00D26A]/15 border-[#00D26A]/40 text-[#00E676] hover:bg-[#00D26A]/25'
                : 'bg-[#181824] border-[#2E2E40] text-[#A1A1AA] hover:text-white'
            }`}
            title="Recalcula a categoria automaticamente sempre que um preço, ficha técnica ou venda mudar"
          >
            <div className={`w-2 h-2 rounded-full ${autoModeEnabled ? 'bg-[#00E676] animate-pulse' : 'bg-zinc-600'}`} />
            <span>Sincronização em Tempo Real: <strong>{autoModeEnabled ? 'Ativa' : 'Manual'}</strong></span>
          </button>

          {/* Config Parameters Button */}
          <button
            onClick={() => {
              setIsConfigOpen(!isConfigOpen);
              playBeep(750, 0.03);
            }}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
              isConfigOpen
                ? 'bg-[#FFC72C] text-black border-[#FFC72C] shadow-md'
                : 'bg-[#181824] hover:bg-[#202030] text-zinc-300 hover:text-white border-[#2E2E40]'
            }`}
            title="Ajustar os pontos de corte de volume de vendas e margem"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Critérios de Corte</span>
          </button>

          {/* Primary Action: Run Auto Categorization */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 450, damping: 20 }}
            onClick={handleExecuteCategorization}
            disabled={isProcessing}
            className="px-4 py-2.5 bg-gradient-to-r from-[#FFC72C] via-[#FFB700] to-[#FF8C00] hover:brightness-110 text-black rounded-xl text-xs font-black transition-all cursor-pointer shadow-[0_0_20px_rgba(255,199,44,0.35)] flex items-center gap-2"
          >
            <Zap className={`w-4 h-4 fill-black ${isProcessing ? 'animate-spin' : ''}`} />
            <span>{isProcessing ? 'Classificando Cardápio...' : 'Categorizar Menu com Dados'}</span>
          </motion.button>
        </div>
      </div>

      {/* Expandable Criteria Configuration Drawer */}
      <AnimatePresence>
        {isConfigOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden bg-[#0D0D14] border border-[#2D2D42] rounded-2xl p-4 sm:p-5 space-y-4 shadow-inner"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#20202E]">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#FFC72C]" />
                <h4 className="text-xs font-black uppercase tracking-wider text-white">
                  Personalizar Parâmetros da Matriz de Engenharia
                </h4>
              </div>
              <button
                onClick={handleResetToAverages}
                className="text-[11px] font-bold text-[#FFC72C] hover:underline flex items-center gap-1 cursor-pointer"
                title="Redefinir para as médias calculadas de Kasavana & Smith"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Restaurar Médias Matemáticas</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              {/* Volume Cutoff */}
              <div className="bg-[#14141E] p-3 rounded-xl border border-[#242436] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-[#00E676]" />
                    Ponto de Corte: Volume de Vendas
                  </span>
                  <span className="text-[10px] text-[#71717A]">Média: {benchmarks.avgVolume} un</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="10"
                    max={Math.max(200, benchmarks.avgVolume * 2)}
                    step="5"
                    value={thresholds.volumeThreshold}
                    onChange={(e) => setThresholds({ ...thresholds, volumeThreshold: Number(e.target.value) })}
                    className="flex-1 accent-[#00E676] cursor-pointer"
                  />
                  <span className="font-mono font-black text-white bg-black/40 px-2 py-1 rounded border border-white/10 w-16 text-right">
                    {thresholds.volumeThreshold} un
                  </span>
                </div>
                <p className="text-[10px] text-[#71717A]">
                  Pratos com vendas 30d ≥ {thresholds.volumeThreshold} un serão categorizados como <strong>Alto Volume</strong>.
                </p>
              </div>

              {/* Profitability Metric Chooser */}
              <div className="bg-[#14141E] p-3 rounded-xl border border-[#242436] space-y-2">
                <span className="font-bold text-white block">
                  Métrica de Rentabilidade (Custos)
                </span>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    onClick={() => setThresholds({
                      ...thresholds,
                      marginMetric: 'margin_reais',
                      marginThreshold: benchmarks.avgMarginReais,
                    })}
                    className={`py-1.5 px-1 rounded-lg text-[10px] font-bold transition-all text-center ${
                      thresholds.marginMetric === 'margin_reais'
                        ? 'bg-[#FFC72C] text-black font-black'
                        : 'bg-[#1E1E2C] text-[#A1A1AA] hover:text-white'
                    }`}
                  >
                    Margem R$
                  </button>
                  <button
                    onClick={() => setThresholds({
                      ...thresholds,
                      marginMetric: 'margin_percent',
                      marginThreshold: benchmarks.avgMarginPercent,
                    })}
                    className={`py-1.5 px-1 rounded-lg text-[10px] font-bold transition-all text-center ${
                      thresholds.marginMetric === 'margin_percent'
                        ? 'bg-[#FFC72C] text-black font-black'
                        : 'bg-[#1E1E2C] text-[#A1A1AA] hover:text-white'
                    }`}
                  >
                    Margem %
                  </button>
                  <button
                    onClick={() => setThresholds({
                      ...thresholds,
                      marginMetric: 'cmv_percent',
                      marginThreshold: 30,
                    })}
                    className={`py-1.5 px-1 rounded-lg text-[10px] font-bold transition-all text-center ${
                      thresholds.marginMetric === 'cmv_percent'
                        ? 'bg-[#FFC72C] text-black font-black'
                        : 'bg-[#1E1E2C] text-[#A1A1AA] hover:text-white'
                    }`}
                  >
                    CMV % Alvo
                  </button>
                </div>
                <p className="text-[10px] text-[#71717A]">
                  {thresholds.marginMetric === 'margin_reais'
                    ? 'Avalia o lucro unitário líquido retido por prato em reais.'
                    : thresholds.marginMetric === 'margin_percent'
                    ? 'Avalia a margem bruta percentual sobre o preço de venda.'
                    : 'Considera eficiente pratos com CMV abaixo do teto definido.'}
                </p>
              </div>

              {/* Margin / Profitability Cutoff Value */}
              <div className="bg-[#14141E] p-3 rounded-xl border border-[#242436] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-[#FFC72C]" />
                    Ponto de Corte: {thresholds.marginMetric === 'margin_reais' ? 'Margem Mínima (R$)' : thresholds.marginMetric === 'margin_percent' ? 'Margem Mínima (%)' : 'CMV Máximo (%)'}
                  </span>
                  <span className="text-[10px] text-[#71717A]">
                    {thresholds.marginMetric === 'margin_reais' ? `Média: ${formatBRL(benchmarks.avgMarginReais)}` : `Média: ${benchmarks.avgMarginPercent}%`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={thresholds.marginMetric === 'margin_reais' ? 5 : 15}
                    max={thresholds.marginMetric === 'margin_reais' ? 50 : 80}
                    step={thresholds.marginMetric === 'margin_reais' ? 0.5 : 1}
                    value={thresholds.marginThreshold}
                    onChange={(e) => setThresholds({ ...thresholds, marginThreshold: Number(e.target.value) })}
                    className="flex-1 accent-[#FFC72C] cursor-pointer"
                  />
                  <span className="font-mono font-black text-[#FFC72C] bg-black/40 px-2 py-1 rounded border border-white/10 w-20 text-right">
                    {thresholds.marginMetric === 'margin_reais'
                      ? formatBRL(thresholds.marginThreshold)
                      : `${thresholds.marginThreshold}%`}
                  </span>
                </div>
                <p className="text-[10px] text-[#71717A]">
                  Pratos com rentabilidade acima deste valor são classificados como <strong>Alta Margem</strong>.
                </p>
              </div>
            </div>

            {/* Preview Banner */}
            <div className="flex items-center justify-between pt-2 border-t border-[#20202E] text-xs">
              <span className="text-zinc-400">
                Prévia da distribuição com esses critérios: <strong>{previewClassification.counts.stars} Estrelas</strong>, <strong>{previewClassification.counts.cashCows} Vacas Leiteiras</strong>, <strong>{previewClassification.counts.questionMarks} Interrogações</strong>, <strong>{previewClassification.counts.dogs} Abacaxis</strong>.
              </span>
              <button
                onClick={handleExecuteCategorization}
                className="px-3 py-1.5 bg-[#00D26A] hover:bg-[#00E676] text-black font-extrabold rounded-lg cursor-pointer transition-all"
              >
                Aplicar Estes Parâmetros
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4 Interactive Visual Cards: Estrelas, Vacas Leiteiras, Interrogações, Abacaxis */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARD 1: ESTRELAS */}
        <motion.div
          whileHover={{ y: -3 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          onClick={() => onFilterQuadrant?.(selectedQuadrant === 'star' ? 'all' : 'star')}
          className={`relative overflow-hidden p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
            selectedQuadrant === 'star'
              ? 'bg-[#1E1C12] border-[#FFE600] shadow-[0_0_20px_rgba(255,230,0,0.25)]'
              : 'bg-[#15151F] hover:bg-[#1A1A28] border-[#2E2E42] hover:border-[#FFE600]/60'
          }`}
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider bg-[#FFE600]/15 text-[#FFE600] border border-[#FFE600]/30 flex items-center gap-1 shadow-sm">
                <span>⭐</span>
                <span>Estrelas</span>
              </span>
              <span className="text-[10px] font-mono text-[#71717A]">
                {((currentDistribution.stars / totalItems) * 100).toFixed(0)}% do menu
              </span>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <div className="text-2xl font-black font-mono text-white">
                {currentDistribution.stars} <span className="text-xs font-medium text-zinc-400">pratos</span>
              </div>
              <span className="text-[11px] font-black text-[#FFE600]">Alta Margem • Alto Volume</span>
            </div>

            <div className="bg-[#0D0D14] p-2.5 rounded-xl border border-white/5 space-y-1 text-[11px]">
              <div className="flex items-center justify-between text-zinc-300">
                <span className="text-[#71717A]">Critério Vendas:</span>
                <span className="font-mono text-[#00E676] font-bold">≥ {thresholds.volumeThreshold} un/mês</span>
              </div>
              <div className="flex items-center justify-between text-zinc-300">
                <span className="text-[#71717A]">Critério Custo/Margem:</span>
                <span className="font-mono text-[#FFE600] font-bold">
                  ≥ {thresholds.marginMetric === 'margin_reais' ? formatBRL(thresholds.marginThreshold) : `${thresholds.marginThreshold}%`}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px]">
            <span className="text-zinc-400 line-clamp-1">Visibilidade máxima e padronização</span>
            <span className="text-[#FFE600] font-bold shrink-0 ml-1">Filtrar →</span>
          </div>
        </motion.div>

        {/* CARD 2: VACAS LEITEIRAS */}
        <motion.div
          whileHover={{ y: -3 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          onClick={() => onFilterQuadrant?.(selectedQuadrant === 'cash_cow' ? 'all' : 'cash_cow')}
          className={`relative overflow-hidden p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
            selectedQuadrant === 'cash_cow'
              ? 'bg-[#121E16] border-[#00D26A] shadow-[0_0_20px_rgba(0,210,106,0.25)]'
              : 'bg-[#15151F] hover:bg-[#1A1A28] border-[#2E2E42] hover:border-[#00D26A]/60'
          }`}
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider bg-[#00D26A]/15 text-[#00E676] border border-[#00D26A]/30 flex items-center gap-1 shadow-sm">
                <span>🐄</span>
                <span>Vacas Leiteiras</span>
              </span>
              <span className="text-[10px] font-mono text-[#71717A]">
                {((currentDistribution.cashCows / totalItems) * 100).toFixed(0)}% do menu
              </span>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <div className="text-2xl font-black font-mono text-white">
                {currentDistribution.cashCows} <span className="text-xs font-medium text-zinc-400">pratos</span>
              </div>
              <span className="text-[11px] font-black text-[#00E676]">Baixa Margem • Alto Volume</span>
            </div>

            <div className="bg-[#0D0D14] p-2.5 rounded-xl border border-white/5 space-y-1 text-[11px]">
              <div className="flex items-center justify-between text-zinc-300">
                <span className="text-[#71717A]">Critério Vendas:</span>
                <span className="font-mono text-[#00E676] font-bold">≥ {thresholds.volumeThreshold} un/mês</span>
              </div>
              <div className="flex items-center justify-between text-zinc-300">
                <span className="text-[#71717A]">Critério Custo/Margem:</span>
                <span className="font-mono text-[#FF2B4E] font-bold">
                  &lt; {thresholds.marginMetric === 'margin_reais' ? formatBRL(thresholds.marginThreshold) : `${thresholds.marginThreshold}%`}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px]">
            <span className="text-zinc-400 line-clamp-1">Reajustar preço (+R$ 1 a R$ 3) ou otimizar</span>
            <span className="text-[#00E676] font-bold shrink-0 ml-1">Filtrar →</span>
          </div>
        </motion.div>

        {/* CARD 3: INTERROGAÇÕES */}
        <motion.div
          whileHover={{ y: -3 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          onClick={() => onFilterQuadrant?.(selectedQuadrant === 'question_mark' ? 'all' : 'question_mark')}
          className={`relative overflow-hidden p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
            selectedQuadrant === 'question_mark'
              ? 'bg-[#101D22] border-[#00E5FF] shadow-[0_0_20px_rgba(0,229,255,0.25)]'
              : 'bg-[#15151F] hover:bg-[#1A1A28] border-[#2E2E42] hover:border-[#00E5FF]/60'
          }`}
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider bg-[#00E5FF]/15 text-[#00E5FF] border border-[#00E5FF]/30 flex items-center gap-1 shadow-sm">
                <span>❓</span>
                <span>Interrogações</span>
              </span>
              <span className="text-[10px] font-mono text-[#71717A]">
                {((currentDistribution.questionMarks / totalItems) * 100).toFixed(0)}% do menu
              </span>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <div className="text-2xl font-black font-mono text-white">
                {currentDistribution.questionMarks} <span className="text-xs font-medium text-zinc-400">pratos</span>
              </div>
              <span className="text-[11px] font-black text-[#00E5FF]">Alta Margem • Baixo Volume</span>
            </div>

            <div className="bg-[#0D0D14] p-2.5 rounded-xl border border-white/5 space-y-1 text-[11px]">
              <div className="flex items-center justify-between text-zinc-300">
                <span className="text-[#71717A]">Critério Vendas:</span>
                <span className="font-mono text-[#FF2B4E] font-bold">&lt; {thresholds.volumeThreshold} un/mês</span>
              </div>
              <div className="flex items-center justify-between text-zinc-300">
                <span className="text-[#71717A]">Critério Custo/Margem:</span>
                <span className="font-mono text-[#00E5FF] font-bold">
                  ≥ {thresholds.marginMetric === 'margin_reais' ? formatBRL(thresholds.marginThreshold) : `${thresholds.marginThreshold}%`}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px]">
            <span className="text-zinc-400 line-clamp-1">Criar combos, promoções e fotos atraentes</span>
            <span className="text-[#00E5FF] font-bold shrink-0 ml-1">Filtrar →</span>
          </div>
        </motion.div>

        {/* CARD 4: ABACAXIS */}
        <motion.div
          whileHover={{ y: -3 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          onClick={() => onFilterQuadrant?.(selectedQuadrant === 'dog' ? 'all' : 'dog')}
          className={`relative overflow-hidden p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
            selectedQuadrant === 'dog'
              ? 'bg-[#221215] border-[#FF2B4E] shadow-[0_0_20px_rgba(255,43,78,0.25)]'
              : 'bg-[#15151F] hover:bg-[#1A1A28] border-[#2E2E42] hover:border-[#FF2B4E]/60'
          }`}
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider bg-[#FF2B4E]/15 text-[#FF2B4E] border border-[#FF2B4E]/30 flex items-center gap-1 shadow-sm">
                <span>🍍</span>
                <span>Abacaxis</span>
              </span>
              <span className="text-[10px] font-mono text-[#71717A]">
                {((currentDistribution.dogs / totalItems) * 100).toFixed(0)}% do menu
              </span>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <div className="text-2xl font-black font-mono text-white">
                {currentDistribution.dogs} <span className="text-xs font-medium text-zinc-400">pratos</span>
              </div>
              <span className="text-[11px] font-black text-[#FF2B4E]">Baixa Margem • Baixo Volume</span>
            </div>

            <div className="bg-[#0D0D14] p-2.5 rounded-xl border border-white/5 space-y-1 text-[11px]">
              <div className="flex items-center justify-between text-zinc-300">
                <span className="text-[#71717A]">Critério Vendas:</span>
                <span className="font-mono text-[#FF2B4E] font-bold">&lt; {thresholds.volumeThreshold} un/mês</span>
              </div>
              <div className="flex items-center justify-between text-zinc-300">
                <span className="text-[#71717A]">Critério Custo/Margem:</span>
                <span className="font-mono text-[#FF2B4E] font-bold">
                  &lt; {thresholds.marginMetric === 'margin_reais' ? formatBRL(thresholds.marginThreshold) : `${thresholds.marginThreshold}%`}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px]">
            <span className="text-zinc-400 line-clamp-1">Reformular receita ou retirar do cardápio</span>
            <span className="text-[#FF2B4E] font-bold shrink-0 ml-1">Filtrar →</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
