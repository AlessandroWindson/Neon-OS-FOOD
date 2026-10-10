import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AlertTriangle, 
  TrendingDown, 
  TrendingUp, 
  Target, 
  BellRing, 
  Volume2, 
  VolumeX, 
  CheckCircle2, 
  Sparkles, 
  Zap, 
  DollarSign, 
  ArrowRight, 
  Percent, 
  QrCode, 
  Edit3, 
  Save, 
  X, 
  Clock, 
  ShieldAlert,
  Flame,
  Lightbulb,
  Share2,
  Sliders,
  Settings
} from 'lucide-react';
import { formatBRL, formatPercent } from '../utils/formatters';
import { playAlert, playBeep, playCashRegister, playKitchenBell } from '../utils/audio';
import { getManagerTargetsConfig, ManagerTargetsConfig } from '../utils/targetsStorage';

interface MonitorFluxoCaixaProps {
  dailyNetVolume: number;      // Saldo líquido real do dia (descontado de MDR)
  dailyGrossVolume: number;    // Volume bruto total do dia
  pixVolume: number;           // Volume liquidado via Pix (D+0)
  cardVolume: number;          // Volume via cartão
  onSimulateSale?: (method: 'pix' | 'credit_card' | 'debit_card', amount: number) => void;
  onOpenConfigModal?: () => void;
}

export const MonitorFluxoCaixa: React.FC<MonitorFluxoCaixaProps> = ({
  dailyNetVolume,
  dailyGrossVolume,
  pixVolume,
  cardVolume,
  onSimulateSale,
  onOpenConfigModal
}) => {
  // Meta Diária Pré-definida (carregada das preferências do gerente ou padrão R$ 5.000,00)
  const [dailyTarget, setDailyTarget] = useState<number>(() => {
    return getManagerTargetsConfig().dailyRevenueTarget;
  });

  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [tempTargetInput, setTempTargetInput] = useState(dailyTarget.toString());
  const [soundEnabled, setSoundEnabled] = useState(() => getManagerTargetsConfig().soundAlertsEnabled);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showTacticalActions, setShowTacticalActions] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Escuta atualizações de metas disparadas pelo modal do gerente
  useEffect(() => {
    const handleTargetsUpdated = (e: any) => {
      const newConfig = e.detail as ManagerTargetsConfig;
      if (newConfig?.dailyRevenueTarget) {
        setDailyTarget(newConfig.dailyRevenueTarget);
        setTempTargetInput(newConfig.dailyRevenueTarget.toString());
      }
      if (typeof newConfig?.soundAlertsEnabled === 'boolean') {
        setSoundEnabled(newConfig.soundAlertsEnabled);
      }
    };
    window.addEventListener('neon_targets_updated', handleTargetsUpdated);
    return () => window.removeEventListener('neon_targets_updated', handleTargetsUpdated);
  }, []);

  // Cálculos do Fluxo vs Meta
  const progressPercent = useMemo(() => {
    if (dailyTarget <= 0) return 100;
    return Math.min(200, (dailyNetVolume / dailyTarget) * 100);
  }, [dailyNetVolume, dailyTarget]);

  const shortfall = Math.max(0, dailyTarget - dailyNetVolume);
  const surplus = Math.max(0, dailyNetVolume - dailyTarget);
  const isBelowTarget = dailyNetVolume < dailyTarget;

  // Classificação do Alerta
  const alertLevel = useMemo<'danger' | 'warning' | 'success'>(() => {
    if (progressPercent >= 100) return 'success';
    if (progressPercent >= 75) return 'warning';
    return 'danger'; // Crítico: menos de 75% da meta
  }, [progressPercent]);

  // Projeção horária simples (Run-Rate diário)
  const hourlyRunRate = useMemo(() => {
    const currentHour = new Date().getHours();
    // Horário operacional do restaurante estimado (10h às 23h = 13 horas)
    const elapsedHours = Math.max(1, Math.min(13, currentHour >= 10 ? currentHour - 10 : 2));
    const ratePerHour = dailyNetVolume / elapsedHours;
    const projectedEndOfDay = dailyNetVolume + (ratePerHour * Math.max(0, 13 - elapsedHours));
    return {
      ratePerHour,
      projectedEndOfDay,
      willBeatTarget: projectedEndOfDay >= dailyTarget,
      projectedDiff: projectedEndOfDay - dailyTarget
    };
  }, [dailyNetVolume, dailyTarget]);

  // Salvar nova meta
  const handleSaveTarget = () => {
    const parsed = parseFloat(tempTargetInput);
    if (!isNaN(parsed) && parsed > 0) {
      setDailyTarget(parsed);
      try {
        localStorage.setItem('neon_food_daily_cashflow_target', parsed.toString());
      } catch (err) {
        console.warn(err);
      }
      setIsEditingTarget(false);
      playBeep(880, 0.08);
      setIsDismissed(false); // Reavalia alerta com a nova meta
    }
  };

  // Preset rápido de metas
  const handleSelectPresetTarget = (val: number) => {
    setDailyTarget(val);
    setTempTargetInput(val.toString());
    try {
      localStorage.setItem('neon_food_daily_cashflow_target', val.toString());
    } catch (err) {}
    setIsEditingTarget(false);
    playBeep(840, 0.05);
    setIsDismissed(false);
  };

  // Disparo sonoro quando entra em estado crítico (com controle)
  useEffect(() => {
    if (isBelowTarget && soundEnabled && !isDismissed && alertLevel === 'danger') {
      const timer = setTimeout(() => {
        playAlert();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [alertLevel, isBelowTarget, soundEnabled, isDismissed]);

  // Execução de Ação Tática de Recuperação do Fluxo
  const handleTriggerRecoveryCampaign = (type: 'pix_promo' | 'vip_push' | 'pdv_combo') => {
    playCashRegister();
    if (type === 'pix_promo') {
      setActionSuccessMsg('🚀 Campanha "Pix Instantâneo com 5% de Desconto" ativada no Cardápio Online!');
      // Simula recuperação automática de uma venda via Pix
      if (onSimulateSale) {
        setTimeout(() => {
          onSimulateSale('pix', 129.90);
        }, 1200);
      }
    } else if (type === 'vip_push') {
      setActionSuccessMsg('📲 Notificação de WhatsApp disparada para 45 clientes VIP com cupom de jantar!');
      if (onSimulateSale) {
        setTimeout(() => {
          onSimulateSale('credit_card', 158.00);
        }, 1500);
      }
    } else {
      setActionSuccessMsg('🍔 Combo Sugestivo de Sobremesa + Chopp ativado com destaque no PDV!');
      if (onSimulateSale) {
        setTimeout(() => {
          onSimulateSale('pix', 89.50);
        }, 1000);
      }
    }

    setTimeout(() => {
      setActionSuccessMsg(null);
    }, 6000);
  };

  return (
    <div className="w-full relative overflow-hidden transition-all duration-500" id="monitor_fluxo_caixa_root">
      
      {/* ========================================================================= */}
      {/* BANNER PRINCIPAL COM ESTADO DINÂMICO DE ALERTA VISUAL */}
      {/* ========================================================================= */}
      <motion.div 
        layout
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-3xl p-5 md:p-6 transition-all duration-500 border relative overflow-hidden backdrop-blur-xl ${
          alertLevel === 'danger'
            ? 'bg-gradient-to-br from-[#1E0E14] via-[#150A10] to-[#12121E] border-rose-500/50 shadow-[0_0_35px_rgba(244,63,94,0.35)]'
            : alertLevel === 'warning'
            ? 'bg-gradient-to-br from-[#1C1608] via-[#141006] to-[#12121E] border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.25)]'
            : 'bg-gradient-to-br from-[#081C12] via-[#06140E] to-[#12121E] border-emerald-500/50 shadow-[0_0_35px_rgba(0,230,118,0.25)]'
        }`}
      >
        {/* Luzes / Glow de Fundo temáticos */}
        {alertLevel === 'danger' && (
          <>
            <div className="absolute top-0 right-0 w-80 h-40 bg-rose-500/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
            <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-rose-600/10 rounded-full blur-2xl pointer-events-none" />
          </>
        )}
        {alertLevel === 'warning' && (
          <div className="absolute top-0 right-0 w-72 h-36 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        )}
        {alertLevel === 'success' && (
          <div className="absolute top-0 right-0 w-72 h-36 bg-[#00E676]/15 rounded-full blur-3xl pointer-events-none" />
        )}

        <div className="relative z-10 space-y-4">
          
          {/* Cabeçalho do Alerta com Badges e Controles */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            
            <div className="flex items-center gap-3">
              {/* Ícone Animado Conforme o Nível */}
              <div className={`p-3 rounded-2xl border flex items-center justify-center shrink-0 transition-transform ${
                alertLevel === 'danger'
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-400 animate-bounce'
                  : alertLevel === 'warning'
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                  : 'bg-emerald-500/20 border-emerald-500/40 text-[#00E676]'
              }`}>
                {alertLevel === 'danger' ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : alertLevel === 'warning' ? (
                  <ShieldAlert className="w-6 h-6" />
                ) : (
                  <CheckCircle2 className="w-6 h-6" />
                )}
              </div>

              {/* Título & Badge de Alerta */}
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 border ${
                    alertLevel === 'danger'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                      : alertLevel === 'warning'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-emerald-500/20 text-[#00E676] border-emerald-500/40'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${
                      alertLevel === 'danger' ? 'bg-rose-500 animate-ping' : alertLevel === 'warning' ? 'bg-amber-400' : 'bg-[#00E676]'
                    }`} />
                    {alertLevel === 'danger'
                      ? 'ALERTA VISUAL: FLUXO DE CAIXA ABAIXO DA META DIÁRIA'
                      : alertLevel === 'warning'
                      ? 'ATENÇÃO: FLUXO PRÓXIMO DA META DIÁRIA'
                      : 'EXCELENTE: META DIÁRIA DE FLUXO SUPERADA!'}
                  </span>

                  <span className="text-xs text-zinc-400 font-mono font-medium">
                    Monitoramento Contínuo
                  </span>
                </div>

                <h3 className="text-lg md:text-xl font-black text-white tracking-tight mt-1 flex items-center gap-2">
                  {alertLevel === 'danger' ? (
                    <span>Déficit de <span className="text-rose-400 font-mono">{formatBRL(shortfall)}</span> para atingir o ponto de equilíbrio de hoje</span>
                  ) : alertLevel === 'warning' ? (
                    <span>Restam <span className="text-amber-400 font-mono">{formatBRL(shortfall)}</span> para bater a meta</span>
                  ) : (
                    <span>Superávit de <span className="text-[#00E676] font-mono">+{formatBRL(surplus)}</span> acima do objetivo diário</span>
                  )}
                </h3>
              </div>
            </div>

            {/* Ações Rápidas do Cabeçalho: Edição de Meta, Som e Ações */}
            <div className="flex items-center gap-2 self-start lg:self-auto flex-wrap">
              {/* Botão de Ajustar Meta */}
              <button
                onClick={() => {
                  if (onOpenConfigModal) {
                    onOpenConfigModal();
                  } else {
                    setIsEditingTarget(!isEditingTarget);
                  }
                  playBeep(700, 0.04);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-[#FFC72C] border border-amber-500/30 text-xs font-semibold transition-all active:scale-95 cursor-pointer shadow-sm"
                title="Configurar metas diárias de faturamento e preferências do gerente"
              >
                <Sliders className="w-3.5 h-3.5 text-[#FFC72C]" />
                <span>Meta: <strong className="font-mono text-white">{formatBRL(dailyTarget)}</strong></span>
                <Settings className="w-3 h-3 text-amber-400" />
              </button>

              {/* Botão de Som de Alerta */}
              <button
                onClick={() => {
                  setSoundEnabled(!soundEnabled);
                  playBeep(soundEnabled ? 400 : 880, 0.05);
                }}
                className={`p-2 rounded-xl border text-xs font-semibold transition-all active:scale-95 ${
                  soundEnabled
                    ? 'bg-zinc-800/80 text-zinc-200 border-zinc-700 hover:bg-zinc-700'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                }`}
                title={soundEnabled ? 'Alerta sonoro ativado (clique para silenciar)' : 'Alerta sonoro silenciado'}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              {/* Botão para Testar Disparo do Alerta Sonoro */}
              <button
                onClick={() => {
                  playAlert();
                }}
                className="px-2.5 py-1.5 rounded-xl bg-zinc-800/60 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/80 text-[11px] font-medium transition-all"
                title="Testar sinal de áudio do alarme"
              >
                <BellRing className="w-3.5 h-3.5" />
              </button>

              {/* Botão de Ações Táticas para Recuperação */}
              {isBelowTarget && (
                <button
                  onClick={() => {
                    setShowTacticalActions(!showTacticalActions);
                    playBeep(750, 0.04);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-600 text-white text-xs font-black shadow-md hover:brightness-110 active:scale-95 transition-all"
                >
                  <Flame className="w-3.5 h-3.5 fill-white" />
                  <span>Plano de Recuperação</span>
                </button>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* EDITOR RETRÁTIL DE META DIÁRIA */}
          {/* ========================================================================= */}
          <AnimatePresence>
            {isEditingTarget && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-[#0D0D15] border border-zinc-700/80 rounded-2xl p-4 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Target className="w-4 h-4 text-[#00E676]" />
                      Configurar Meta Pré-Definida de Fluxo de Caixa Diário
                    </h4>
                    <p className="text-[11px] text-zinc-400">
                      O sistema emitirá alertas visuais instantâneos quando o saldo líquido cair ou estiver abaixo desta linha.
                    </p>
                  </div>

                  <button
                    onClick={() => setIsEditingTarget(false)}
                    className="text-zinc-400 hover:text-white self-end sm:self-auto"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Presets Rápidos */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-zinc-400 font-medium">Metas Rápidas:</span>
                    {[2500, 3500, 5000, 7500, 10000].map(val => (
                      <button
                        key={val}
                        onClick={() => handleSelectPresetTarget(val)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                          dailyTarget === val
                            ? 'bg-[#00E676] text-black shadow-[0_0_10px_rgba(0,230,118,0.3)]'
                            : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                        }`}
                      >
                        {formatBRL(val)}
                      </button>
                    ))}
                  </div>

                  {/* Input Personalizado */}
                  <div className="flex items-center gap-2 ml-auto">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 font-mono">R$</span>
                      <input
                        type="number"
                        step="100"
                        min="500"
                        value={tempTargetInput}
                        onChange={(e) => setTempTargetInput(e.target.value)}
                        placeholder="5000.00"
                        className="w-32 bg-zinc-900 border border-zinc-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white font-mono font-bold focus:border-[#00E676] focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={handleSaveTarget}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#00E676] text-black font-black text-xs hover:brightness-110 active:scale-95 transition-all"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Salvar Meta</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ========================================================================= */}
          {/* BARRA DE PROGRESSO MULTI-ESTÁGIO COM MARCADOR DE META (100%) */}
          {/* ========================================================================= */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-zinc-300 font-medium">Realizado Hoje (Líquido):</span>
                <strong className={`font-mono font-black text-sm ${
                  alertLevel === 'danger' ? 'text-rose-400' : alertLevel === 'warning' ? 'text-amber-400' : 'text-[#00E676]'
                }`}>
                  {formatBRL(dailyNetVolume)}
                </strong>
                <span className="text-[11px] text-zinc-400">
                  ({progressPercent.toFixed(1)}% atingido)
                </span>
              </div>

              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="text-zinc-400">Meta Estabelecida:</span>
                <strong className="text-white font-bold">{formatBRL(dailyTarget)}</strong>
              </div>
            </div>

            {/* Barra Visual com Gradiente e Marcador de Meta */}
            <div className="relative w-full h-4 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 p-0.5 shadow-inner">
              {/* Progresso Atual */}
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, progressPercent)}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className={`h-full rounded-full transition-all duration-700 relative ${
                  alertLevel === 'danger'
                    ? 'bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 shadow-[0_0_12px_rgba(244,63,94,0.6)]'
                    : alertLevel === 'warning'
                    ? 'bg-gradient-to-r from-amber-600 to-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                    : 'bg-gradient-to-r from-teal-500 to-[#00E676] shadow-[0_0_15px_rgba(0,230,118,0.7)]'
                }`}
              />

              {/* Marcador de Linha da Meta (100%) se superado */}
              {progressPercent > 100 && (
                <div className="absolute right-0 top-0 bottom-0 w-1 bg-white shadow-[0_0_8px_#fff]" />
              )}
            </div>

            {/* Marcadores de Etapas */}
            <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono pt-0.5">
              <span>R$ 0,00</span>
              <span>25% ({formatBRL(dailyTarget * 0.25)})</span>
              <span>50% ({formatBRL(dailyTarget * 0.50)})</span>
              <span>75% ({formatBRL(dailyTarget * 0.75)})</span>
              <span className={`font-bold ${progressPercent >= 100 ? 'text-[#00E676]' : 'text-zinc-300'}`}>
                100% Meta ({formatBRL(dailyTarget)})
              </span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* LINHA DE ANÁLISE PREDITIVA E RUN-RATE HORÁRIO */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            
            {/* Box 1: Run-Rate de Vendas */}
            <div className="bg-black/30 border border-zinc-800/80 rounded-2xl p-3 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">Ritmo Atual de Caixa</span>
                <p className="text-xs text-zinc-300 font-medium flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-zinc-400" />
                  Média por Hora:
                </p>
              </div>
              <span className="text-sm font-black font-mono text-white">
                {formatBRL(hourlyRunRate.ratePerHour)}/h
              </span>
            </div>

            {/* Box 2: Projeção de Fechamento */}
            <div className="bg-black/30 border border-zinc-800/80 rounded-2xl p-3 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">Projeção no Ritmo Atual</span>
                <p className="text-xs text-zinc-300 font-medium flex items-center gap-1">
                  {hourlyRunRate.willBeatTarget ? (
                    <TrendingUp className="w-3.5 h-3.5 text-[#00E676]" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                  )}
                  Estimativa de Fechamento:
                </p>
              </div>
              <div className="text-right">
                <span className={`text-sm font-black font-mono ${
                  hourlyRunRate.willBeatTarget ? 'text-[#00E676]' : 'text-rose-400'
                }`}>
                  {formatBRL(hourlyRunRate.projectedEndOfDay)}
                </span>
                <p className="text-[9px] text-zinc-400 font-mono">
                  {hourlyRunRate.willBeatTarget ? `+${formatBRL(hourlyRunRate.projectedDiff)}` : `${formatBRL(hourlyRunRate.projectedDiff)}`}
                </p>
              </div>
            </div>

            {/* Box 3: Split Pix como Alavanca de Liquidez */}
            <div className="bg-black/30 border border-zinc-800/80 rounded-2xl p-3 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-bold flex items-center gap-1">
                  <QrCode className="w-3 h-3 text-[#00E676]" />
                  Liquidez D+0 Imediata
                </span>
                <p className="text-xs text-zinc-300 font-medium">Disponível em Conta Agora:</p>
              </div>
              <div className="text-right">
                <span className="text-sm font-black font-mono text-[#00E676]">
                  {formatBRL(pixVolume)}
                </span>
                <p className="text-[9px] text-zinc-400 font-mono">via Pix Dinâmico</p>
              </div>
            </div>

          </div>

          {/* ========================================================================= */}
          {/* MENSAGEM DE FEEDBACK APÓS DISPARO DE CAMPANHA */}
          {/* ========================================================================= */}
          <AnimatePresence>
            {actionSuccessMsg && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 p-3 rounded-2xl text-xs font-bold flex items-center justify-between gap-3 shadow-lg"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#00E676] shrink-0" />
                  <span>{actionSuccessMsg}</span>
                </div>
                <button
                  onClick={() => setActionSuccessMsg(null)}
                  className="text-emerald-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ========================================================================= */}
          {/* PLANO DE RECUPERAÇÃO DO FLUXO (AÇÕES TÁTICAS ACIONÁVEIS) */}
          {/* ========================================================================= */}
          <AnimatePresence>
            {showTacticalActions && isBelowTarget && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-[#0B0B12] border border-rose-500/30 rounded-2xl p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-rose-400" />
                    <h4 className="text-xs font-bold text-white">
                      Ações Táticas Imediatas para Reverter o Déficit de Caixa
                    </h4>
                  </div>
                  <button
                    onClick={() => setShowTacticalActions(false)}
                    className="text-zinc-400 hover:text-white text-xs"
                  >
                    Fechar
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Ação 1: Desconto Pix */}
                  <button
                    onClick={() => handleTriggerRecoveryCampaign('pix_promo')}
                    className="p-3 rounded-xl bg-zinc-900/90 hover:bg-emerald-950/40 border border-zinc-800 hover:border-[#00E676]/50 text-left transition-all group flex flex-col justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold text-[#00E676]">
                        <span className="flex items-center gap-1.5">
                          <QrCode className="w-3.5 h-3.5" />
                          Incentivo Pix 5%
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        Ativa banner promocional de Pix no Cardápio Online para antecipar recebíveis com D+0.
                      </p>
                    </div>
                    <span className="mt-2.5 inline-block text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-md self-start">
                      Disparar Promoção
                    </span>
                  </button>

                  {/* Ação 2: Disparo WhatsApp VIP */}
                  <button
                    onClick={() => handleTriggerRecoveryCampaign('vip_push')}
                    className="p-3 rounded-xl bg-zinc-900/90 hover:bg-blue-950/40 border border-zinc-800 hover:border-blue-500/50 text-left transition-all group flex flex-col justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold text-blue-400">
                        <span className="flex items-center gap-1.5">
                          <Share2 className="w-3.5 h-3.5" />
                          Notificação VIP
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        Envia cupom exclusivo de sobremesa cortesia para clientes fiéis com pedidos no jantar.
                      </p>
                    </div>
                    <span className="mt-2.5 inline-block text-[10px] font-bold text-blue-400 bg-blue-500/15 px-2 py-0.5 rounded-md self-start">
                      Disparar WhatsApp
                    </span>
                  </button>

                  {/* Ação 3: Upsell no PDV */}
                  <button
                    onClick={() => handleTriggerRecoveryCampaign('pdv_combo')}
                    className="p-3 rounded-xl bg-zinc-900/90 hover:bg-purple-950/40 border border-zinc-800 hover:border-purple-500/50 text-left transition-all group flex flex-col justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold text-purple-400">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          Upsell no Balcão
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        Ativa aviso na tela dos atendentes para sugerir combo duplo com Chopp ou Refrigerante.
                      </p>
                    </div>
                    <span className="mt-2.5 inline-block text-[10px] font-bold text-purple-400 bg-purple-500/15 px-2 py-0.5 rounded-md self-start">
                      Ativar Venda Sugestiva
                    </span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </motion.div>

    </div>
  );
};
