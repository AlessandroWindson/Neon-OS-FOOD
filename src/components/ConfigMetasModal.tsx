import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Target, 
  Settings, 
  Sliders, 
  Save, 
  RotateCcw, 
  X, 
  CheckCircle2, 
  DollarSign, 
  QrCode, 
  TrendingUp, 
  AlertTriangle, 
  Volume2, 
  VolumeX, 
  Sparkles,
  ShieldAlert,
  Info,
  Layers,
  HelpCircle
} from 'lucide-react';
import { formatBRL, formatPercent } from '../utils/formatters';
import { playBeep, playCashRegister, playAlert } from '../utils/audio';
import { 
  ManagerTargetsConfig, 
  getManagerTargetsConfig, 
  saveManagerTargetsConfig, 
  resetManagerTargetsConfig 
} from '../utils/targetsStorage';

interface ConfigMetasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTargetsSaved?: (newConfig: ManagerTargetsConfig) => void;
  currentDailyNet?: number;
}

export const ConfigMetasModal: React.FC<ConfigMetasModalProps> = ({
  isOpen,
  onClose,
  onTargetsSaved,
  currentDailyNet = 0
}) => {
  const [config, setConfig] = useState<ManagerTargetsConfig>(getManagerTargetsConfig());
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Recarrega sempre que abrir o modal
  useEffect(() => {
    if (isOpen) {
      setConfig(getManagerTargetsConfig());
      setSaveSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const presets = [
    { label: 'R$ 3.000', value: 3000, tag: 'Dias de Semana' },
    { label: 'R$ 5.000', value: 5000, tag: 'Padrão' },
    { label: 'R$ 8.000', value: 8000, tag: 'Sexta / Sábado' },
    { label: 'R$ 12.000', value: 12000, tag: 'Domingo / Feriado' },
    { label: 'R$ 15.000', value: 15000, tag: 'Mega Turno' }
  ];

  const handleSave = () => {
    saveManagerTargetsConfig(config);
    playCashRegister();
    setSaveSuccess(true);
    if (onTargetsSaved) {
      onTargetsSaved(config);
    }
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 800);
  };

  const handleReset = () => {
    playBeep(450, 0.08);
    const reset = resetManagerTargetsConfig();
    setConfig(reset);
    if (onTargetsSaved) {
      onTargetsSaved(reset);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-[#12121E] border border-zinc-700/80 rounded-3xl w-full max-w-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.85)] flex flex-col max-h-[92vh]"
      >
        {/* Cabeçalho do Modal */}
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-gradient-to-r from-zinc-900 to-[#12121E]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#FFC72C]/15 text-[#FFC72C] border border-[#FFC72C]/30 shadow-[0_0_15px_rgba(255,199,44,0.2)]">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-[#FFC72C] border border-amber-500/30">
                  Preferências do Gerente
                </span>
                <span className="text-xs text-zinc-400 font-mono">Salvo em LocalStorage</span>
              </div>
              <h3 className="text-lg font-black text-white mt-0.5 flex items-center gap-2">
                <span>Configurar Metas de Faturamento</span>
              </h3>
            </div>
          </div>

          <button
            onClick={() => { playBeep(600, 0.04); onClose(); }}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário com Configurações */}
        <div className="p-6 overflow-y-auto space-y-6">

          {/* Feedback de Sucesso */}
          <AnimatePresence>
            {saveSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-[#00E676]/20 border border-[#00E676]/50 text-[#00E676] p-3 rounded-2xl text-xs font-bold flex items-center gap-2.5 shadow-lg"
              >
                <CheckCircle2 className="w-4 h-4 text-[#00E676] shrink-0" />
                <span>Metas atualizadas e salvas com sucesso no navegador! O painel já está sincronizado.</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 1. Meta Diária Geral de Faturamento */}
          <div className="bg-[#0A0A12] border border-zinc-800/90 rounded-2xl p-4 md:p-5 space-y-3.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-[#00E676]" />
                  Meta Principal de Faturamento Diário (R$)
                </label>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Valor base para monitoramento do fluxo de caixa e disparo de alertas visuais no dashboard.
                </p>
              </div>
              
              {/* Input Numérico de Meta */}
              <div className="relative shrink-0">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400 font-mono">
                  R$
                </span>
                <input
                  type="number"
                  step="100"
                  min="500"
                  max="500000"
                  value={config.dailyRevenueTarget}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setConfig({ ...config, dailyRevenueTarget: val });
                  }}
                  className="w-36 bg-zinc-900 border border-zinc-700 rounded-xl pl-8 pr-3 py-2 text-sm text-white font-mono font-bold text-right focus:border-[#00E676] focus:outline-none focus:ring-1 focus:ring-[#00E676]"
                />
              </div>
            </div>

            {/* Presets Rápidos de 1 Clique */}
            <div>
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block mb-1.5">
                Atalhos Rápidos de Meta:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {presets.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => {
                      setConfig({ ...config, dailyRevenueTarget: p.value });
                      playBeep(750, 0.03);
                    }}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      config.dailyRevenueTarget === p.value
                        ? 'bg-[#00E676] border-[#00E676] text-black font-black shadow-[0_0_12px_rgba(0,230,118,0.35)]'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white'
                    }`}
                  >
                    <span className="text-xs font-mono font-bold block">{p.label}</span>
                    <span className={`text-[9px] block ${config.dailyRevenueTarget === p.value ? 'text-black/80' : 'text-zinc-500'}`}>
                      {p.tag}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Projeção Atual */}
            <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs">
              <span className="text-zinc-400">Saldo atual realizado hoje:</span>
              <span className="font-mono font-bold text-white">
                {formatBRL(currentDailyNet)} 
                <span className="text-zinc-500 text-[11px] font-normal ml-1.5">
                  ({config.dailyRevenueTarget > 0 ? ((currentDailyNet / config.dailyRevenueTarget) * 100).toFixed(1) : 0}% da nova meta)
                </span>
              </span>
            </div>
          </div>

          {/* 2. Metas Secundárias: Pix & Ticket Médio */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Meta de Participação Pix */}
            <div className="bg-[#0A0A12] border border-zinc-800/90 rounded-2xl p-4 space-y-3">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-[#00E676]" />
                  Meta de Participação PIX (%)
                </label>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Porcentagem mínima de vendas via Pix para liquidação imediata D+0 e menor custo de taxas.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="10"
                  max="90"
                  step="5"
                  value={config.pixShareTargetPercent}
                  onChange={(e) => setConfig({ ...config, pixShareTargetPercent: parseInt(e.target.value) })}
                  className="flex-1 accent-[#00E676] cursor-pointer"
                />
                <span className="text-sm font-mono font-black text-[#00E676] w-12 text-right">
                  {config.pixShareTargetPercent}%
                </span>
              </div>

              <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                <span>10% (Mínimo)</span>
                <span>50% (Ideal)</span>
                <span>90% (Excelente)</span>
              </div>
            </div>

            {/* Meta de Ticket Médio */}
            <div className="bg-[#0A0A12] border border-zinc-800/90 rounded-2xl p-4 space-y-3">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                  Meta de Ticket Médio (R$)
                </label>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Valor médio desejado por transação/pedido fechado na loja.
                </p>
              </div>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400 font-mono">
                  R$
                </span>
                <input
                  type="number"
                  step="5"
                  min="10"
                  value={config.averageTicketTarget}
                  onChange={(e) => setConfig({ ...config, averageTicketTarget: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-8 pr-3 py-2 text-xs text-white font-mono font-bold focus:border-blue-500 focus:outline-none"
                />
              </div>

              <p className="text-[10px] text-zinc-500">
                Ajuda na recomendação de combos e vendas sugestivas no PDV.
              </p>
            </div>

          </div>

          {/* 3. Limiares de Alerta & Configurações Sonoras */}
          <div className="bg-[#0A0A12] border border-zinc-800/90 rounded-2xl p-4 space-y-4">
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                Sensibilidade do Alerta Visual de Fluxo
              </label>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Defina em qual percentual do dia o sistema deve acionar o alerta vermelho de déficit de caixa.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="range"
                min="50"
                max="90"
                step="5"
                value={config.alertThresholdPercent}
                onChange={(e) => setConfig({ ...config, alertThresholdPercent: parseInt(e.target.value) })}
                className="flex-1 accent-rose-500 cursor-pointer"
              />
              <span className="text-xs font-mono font-bold text-rose-400 w-16 text-right">
                Abaixo de {config.alertThresholdPercent}%
              </span>
            </div>

            {/* Toggle de Alarme Sonoro */}
            <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  {config.soundAlertsEnabled ? (
                    <Volume2 className="w-3.5 h-3.5 text-[#00E676]" />
                  ) : (
                    <VolumeX className="w-3.5 h-3.5 text-zinc-500" />
                  )}
                  Sinal Sonoro de Alerta Financeiro
                </span>
                <p className="text-[11px] text-zinc-400">
                  Toca aviso discreto no navegador quando o fluxo de caixa estiver crítico.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => playAlert()}
                  className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-medium border border-zinc-700 cursor-pointer"
                  title="Testar som do alerta"
                >
                  Testar Som
                </button>

                <button
                  type="button"
                  onClick={() => setConfig({ ...config, soundAlertsEnabled: !config.soundAlertsEnabled })}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    config.soundAlertsEnabled ? 'bg-[#00E676]' : 'bg-zinc-800'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-black transition-transform absolute top-1 ${
                    config.soundAlertsEnabled ? 'right-1' : 'left-1'
                  }`} />
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Rodapé de Ações */}
        <div className="p-6 border-t border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
            title="Restaurar valores padrões recomendados"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Padrões</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-[#00E676] hover:brightness-110 active:scale-95 text-black font-black text-xs shadow-[0_0_20px_rgba(0,230,118,0.4)] transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Preferências do Gerente</span>
            </button>
          </div>
        </div>

      </motion.div>
    </div>
  );
};
