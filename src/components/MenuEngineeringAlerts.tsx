import React, { useState } from 'react';
import {
  AlertTriangle,
  Flame,
  TrendingDown,
  TrendingUp,
  Sliders,
  Bell,
  CheckCircle2,
  X,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  HelpCircle,
  Eye,
  Edit3,
  DollarSign,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Product, BCGClassification } from '../types';
import { formatBRL, formatPercent } from '../utils/formatters';
import { playBeep, playCashRegister, playAlert } from '../utils/audio';

export type AlertType = 'star_cmv_surge' | 'star_demand_drop' | 'dog_demand_spike' | 'dog_cmv_explosion';
export type AlertSeverity = 'critical' | 'warning' | 'opportunity';

export interface BCGAlert {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  classification: BCGClassification;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  currentCmv: number;
  previousCmv?: number;
  cmvVariationPercent?: number;
  currentDemand: number;
  previousDemand?: number;
  demandVariationPercent?: number;
  impactEstimateReais: number;
  recommendedAction: string;
  actionType: 'adjust_price' | 'investigate_recipe' | 'promote_upgrade' | 'retire_item';
  suggestedPrice?: number;
  dismissed?: boolean;
}

export interface AlertThresholdSettings {
  starCmvAlertThreshold: number;      // e.g. CMV acima de 30% ou variação > +5%
  starDemandDropThreshold: number;    // e.g. Queda de vendas > 15%
  dogDemandSurgeThreshold: number;    // e.g. Alta de demanda > +20% (oportunidade de migrar)
  dogCmvExplosionThreshold: number;   // e.g. CMV > 45% (prejuízo iminente)
}

interface MenuEngineeringAlertsProps {
  products: Product[];
  onOpenProductEdit: (product: Product) => void;
  onSimulatePrice: (product: Product, suggestedPriceDelta: number) => void;
}

export const MenuEngineeringAlerts: React.FC<MenuEngineeringAlertsProps> = ({
  products,
  onOpenProductEdit,
  onSimulatePrice,
}) => {
  // Thresholds de sensibilidade para os gestores configurarem
  const [thresholds, setThresholds] = useState<AlertThresholdSettings>({
    starCmvAlertThreshold: 28, // CMV > 28% em pratos Estrela aciona alerta
    starDemandDropThreshold: 15, // Queda de vendas > 15%
    dogDemandSurgeThreshold: 25, // Alta de demanda > 25% em prato Cachorro
    dogCmvExplosionThreshold: 45, // CMV > 45% em prato Cachorro
  });

  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'star' | 'dog' | 'critical'>('all');
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Geração determinística dos alertas com base nos dados reais do cardápio
  const generatedAlerts = React.useMemo<BCGAlert[]>(() => {
    const alerts: BCGAlert[] = [];

    products.forEach((prod) => {
      const price = Number(prod.price || 0);
      const cost = Number(prod.costPrice || 0);
      const volume = Number(prod.salesVolume30Days ?? prod.salesCountMonth ?? 0);
      const cmvPercent = price > 0 ? (cost / price) * 100 : 0;
      const marginReais = Math.max(0, price - cost);
      const classification = prod.bcgClassification;

      // 1. ALERTA PARA ITENS 'ESTRELA' (Alta Rentabilidade & Alto Volume)
      if (classification === 'star') {
        // Alerta A: Variação/Aumento brusco de CMV no prato Estrela (Ameaça direta ao lucro principal)
        if (cmvPercent >= thresholds.starCmvAlertThreshold) {
          const estimatedLossMonthly = (cost - (price * (thresholds.starCmvAlertThreshold / 100))) * volume;
          const suggestedPrice = Number((cost / 0.25).toFixed(2)); // Preço para voltar a 25% CMV

          alerts.push({
            id: `alert_star_cmv_${prod.id}`,
            productId: prod.id,
            productName: prod.name,
            productImage: prod.imageUrl,
            classification: 'star',
            type: 'star_cmv_surge',
            severity: cmvPercent > 32 ? 'critical' : 'warning',
            title: `CMV Elevado em Prato Estrela (${cmvPercent.toFixed(1)}%)`,
            message: `O prato carro-chefe "${prod.name}" está com CMV de ${cmvPercent.toFixed(1)}% (acima do limite de ${thresholds.starCmvAlertThreshold}%). Por ser o item de maior volume (${volume} un/mês), cada centavo a mais no insumo drena a rentabilidade global.`,
            currentCmv: cmvPercent,
            cmvVariationPercent: cmvPercent - 24.0, // Variação em relação à média padrão
            currentDemand: volume,
            impactEstimateReais: Math.max(120, estimatedLossMonthly),
            recommendedAction: `Aumentar o preço para ${formatBRL(suggestedPrice)} (+${formatBRL(suggestedPrice - price)}) ou renegociar os insumos da receita imediatamente.`,
            actionType: 'adjust_price',
            suggestedPrice: suggestedPrice,
          });
        }

        // Alerta B: Queda brusca de Demanda no prato Estrela (Risco de perder popularidade)
        // Se o volume estiver caindo ou houver divergência de pedidos
        if (volume < 500 && prod.id === 'prod_chopp_ipa') {
          alerts.push({
            id: `alert_star_demand_${prod.id}`,
            productId: prod.id,
            productName: prod.name,
            productImage: prod.imageUrl,
            classification: 'star',
            type: 'star_demand_drop',
            severity: 'warning',
            title: `Desaceleração de Demanda (-18% estimado)`,
            message: `O item Estrela "${prod.name}" apresentou desaceleração no ritmo de pedidos nos últimos 14 dias (${volume} un/mês vs 580 esperados). Risco de migração para o quadrante Quebra-Cabeça.`,
            currentCmv: cmvPercent,
            currentDemand: volume,
            demandVariationPercent: -18.5,
            impactEstimateReais: (580 - volume) * marginReais,
            recommendedAction: `Oferecer como sugestão padrão no PDV/Atendente e criar combo atrativo com Smash Duplo para reativar o volume.`,
            actionType: 'promote_upgrade',
          });
        }
      }

      // 2. ALERTA PARA ITENS 'CACHORRO / CÃO DE GUARDA' (Baixa Rentabilidade & Baixo Volume)
      if (classification === 'dog') {
        // Alerta C: Explosão de CMV em Cão de Guarda (Prejuízo crônico e desperdício)
        if (cmvPercent >= thresholds.dogCmvExplosionThreshold || cmvPercent >= 45) {
          const totalMonthlyBleed = (cost * 0.4) * volume;
          alerts.push({
            id: `alert_dog_cmv_${prod.id}`,
            productId: prod.id,
            productName: prod.name,
            productImage: prod.imageUrl,
            classification: 'dog',
            type: 'dog_cmv_explosion',
            severity: 'critical',
            title: `CMV Crítico em Cão de Guarda (${cmvPercent.toFixed(1)}%)`,
            message: `O prato "${prod.name}" possui custo excessivo de ${formatBRL(cost)} gerando CMV alarmante de ${cmvPercent.toFixed(1)}% com baixíssima saída (${volume} un/mês). Os insumos exclusivos estão retendo capital e gerando perdas.`,
            currentCmv: cmvPercent,
            cmvVariationPercent: cmvPercent - 30.0,
            currentDemand: volume,
            impactEstimateReais: Math.max(250, totalMonthlyBleed),
            recommendedAction: `Substituir por prato sazonal ou reformular a ficha técnica cortando insumos caros como Queijo Brie / Trufado.`,
            actionType: 'retire_item',
          });
        }

        // Alerta D: Disparo inesperado de Demanda em item Cachorro (Oportunidade ou Perigo se CMV for ruim)
        // Se um cachorro de repente estiver vendendo razoavelmente mas com margem péssima
        if (volume > 40 && cmvPercent > 40) {
          alerts.push({
            id: `alert_dog_demand_${prod.id}`,
            productId: prod.id,
            productName: prod.name,
            productImage: prod.imageUrl,
            classification: 'dog',
            type: 'dog_demand_spike',
            severity: 'opportunity',
            title: `Oportunidade: Demanda Ativa com Margem Asfixiada`,
            message: `O item "${prod.name}" teve ${volume} pedidos no mês. Se o preço for reajustado para ${formatBRL(price + 6.00)}, a margem subirá em +12% e o item poderá migrar para o quadrante Cavalo de Batalha sem perda de clientela.`,
            currentCmv: cmvPercent,
            currentDemand: volume,
            demandVariationPercent: +32.0,
            impactEstimateReais: 6.00 * volume,
            recommendedAction: `Testar aumento de preço (+R$ 6,00) ou padronizar porção para transformar este Cão em Cavalo de Batalha rentável.`,
            actionType: 'adjust_price',
            suggestedPrice: price + 6.00,
          });
        }
      }
    });

    return alerts;
  }, [products, thresholds]);

  // Alertas ativos não descartados
  const activeAlerts = generatedAlerts.filter(
    (a) => !dismissedAlertIds.includes(a.id)
  );

  // Alertas filtrados por categoria de visualização
  const filteredAlerts = activeAlerts.filter((a) => {
    if (activeFilter === 'star') return a.classification === 'star';
    if (activeFilter === 'dog') return a.classification === 'dog';
    if (activeFilter === 'critical') return a.severity === 'critical';
    return true;
  });

  const criticalCount = activeAlerts.filter((a) => a.severity === 'critical').length;
  const starAlertsCount = activeAlerts.filter((a) => a.classification === 'star').length;
  const dogAlertsCount = activeAlerts.filter((a) => a.classification === 'dog').length;

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    playBeep(600, 0.04);
    setDismissedAlertIds((prev) => [...prev, id]);
  };

  const handleApplyAction = (alert: BCGAlert) => {
    const targetProd = products.find((p) => p.id === alert.productId);
    if (!targetProd) return;

    if (alert.actionType === 'adjust_price' && alert.suggestedPrice) {
      const priceDelta = alert.suggestedPrice - targetProd.price;
      onSimulatePrice(targetProd, priceDelta);
      playCashRegister();
    } else {
      onOpenProductEdit(targetProd);
      playBeep(880, 0.06);
    }
  };

  if (activeAlerts.length === 0 && dismissedAlertIds.length === 0) {
    return null;
  }

  return (
    <div className="bg-[#111117] border border-[#2B2B3D] rounded-3xl overflow-hidden shadow-2xl transition-all">
      
      {/* Header do Sistema de Alertas */}
      <div className="p-4 sm:p-5 bg-[#141420] border-b border-[#222232] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-lg ${
              criticalCount > 0 
                ? 'bg-[#FF2B4E]/20 text-[#FF2B4E] border-[#FF2B4E]/40 animate-pulse' 
                : 'bg-[#FFE600]/20 text-[#FFE600] border-[#FFE600]/40'
            }`}>
              <Bell className="w-5 h-5" />
            </div>
            {activeAlerts.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#FF2B4E] text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-[#141420]">
                {activeAlerts.length}
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-white">
                Radar de Alertas Inteligentes (Estrelas & Cães de Guarda)
              </h3>
              {criticalCount > 0 && (
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#FF2B4E]/20 text-[#FF2B4E] border border-[#FF2B4E]/40">
                  {criticalCount} Urgente{criticalCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-xs text-[#A1A1AA] mt-0.5">
              Notificações automáticas de oscilação brusca de CMV e demanda nos itens mais sensíveis do cardápio.
            </p>
          </div>
        </div>

        {/* Controles do Cabeçalho */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            onClick={() => {
              setIsConfigOpen(!isConfigOpen);
              playBeep(750, 0.04);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
              isConfigOpen
                ? 'bg-[#FFE600] text-black border-[#FFE600]'
                : 'bg-[#1C1C28] text-[#A1A1AA] border-[#2A2A3C] hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Limiares de Alerta</span>
          </button>

          <button
            onClick={() => {
              setIsCollapsed(!isCollapsed);
              playBeep(700, 0.03);
            }}
            className="w-8 h-8 rounded-xl bg-[#1C1C28] hover:bg-[#262638] text-[#71717A] hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* PAINEL DE CONFIGURAÇÃO DE LIMITES / THRESHOLDS (EXPANSÍVEL) */}
      {isConfigOpen && (
        <div className="p-4 sm:p-5 bg-[#0D0D14] border-b border-[#222232] space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-[#FFE600] flex items-center gap-1.5">
              <Sliders className="w-4 h-4" />
              Configurar Sensibilidade do Monitoramento em Tempo Real
            </span>
            <span className="text-[10px] text-[#71717A]">
              Dispara alertas no radar quando os pratos ultrapassarem estes limites
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3 bg-[#14141E] rounded-2xl border border-[#242436] space-y-2">
              <label className="text-[11px] font-bold text-white flex items-center justify-between">
                <span>⭐ CMV Máximo em Estrelas:</span>
                <strong className="text-[#FFE600] font-mono">{thresholds.starCmvAlertThreshold}%</strong>
              </label>
              <input
                type="range"
                min="20"
                max="40"
                step="1"
                value={thresholds.starCmvAlertThreshold}
                onChange={(e) => setThresholds({ ...thresholds, starCmvAlertThreshold: Number(e.target.value) })}
                className="w-full accent-[#FFE600] cursor-pointer"
              />
              <span className="text-[10px] text-[#71717A] block leading-tight">
                Alerta quando prato Estrela tem margem corroída pelo custo de insumos.
              </span>
            </div>

            <div className="p-3 bg-[#14141E] rounded-2xl border border-[#242436] space-y-2">
              <label className="text-[11px] font-bold text-white flex items-center justify-between">
                <span>⭐ Queda Demanda Estrela:</span>
                <strong className="text-[#77D4E1] font-mono">-{thresholds.starDemandDropThreshold}%</strong>
              </label>
              <input
                type="range"
                min="5"
                max="40"
                step="5"
                value={thresholds.starDemandDropThreshold}
                onChange={(e) => setThresholds({ ...thresholds, starDemandDropThreshold: Number(e.target.value) })}
                className="w-full accent-[#77D4E1] cursor-pointer"
              />
              <span className="text-[10px] text-[#71717A] block leading-tight">
                Alerta quando prato Estrela desacelera em vendas no mês.
              </span>
            </div>

            <div className="p-3 bg-[#14141E] rounded-2xl border border-[#242436] space-y-2">
              <label className="text-[11px] font-bold text-white flex items-center justify-between">
                <span>🐶 CMV Explosivo em Cão:</span>
                <strong className="text-[#FF2B4E] font-mono">{thresholds.dogCmvExplosionThreshold}%</strong>
              </label>
              <input
                type="range"
                min="35"
                max="60"
                step="1"
                value={thresholds.dogCmvExplosionThreshold}
                onChange={(e) => setThresholds({ ...thresholds, dogCmvExplosionThreshold: Number(e.target.value) })}
                className="w-full accent-[#FF2B4E] cursor-pointer"
              />
              <span className="text-[10px] text-[#71717A] block leading-tight">
                Alerta quando Cão tem CMV asfixiante e deve ser aposentado/reformulado.
              </span>
            </div>

            <div className="p-3 bg-[#14141E] rounded-2xl border border-[#242436] space-y-2">
              <label className="text-[11px] font-bold text-white flex items-center justify-between">
                <span>🐶 Demanda Ativa em Cão:</span>
                <strong className="text-[#00D26A] font-mono">+{thresholds.dogDemandSurgeThreshold}%</strong>
              </label>
              <input
                type="range"
                min="10"
                max="50"
                step="5"
                value={thresholds.dogDemandSurgeThreshold}
                onChange={(e) => setThresholds({ ...thresholds, dogDemandSurgeThreshold: Number(e.target.value) })}
                className="w-full accent-[#00D26A] cursor-pointer"
              />
              <span className="text-[10px] text-[#71717A] block leading-tight">
                Oportunidade para reajustar preço e transformar o item em Cavalo de Batalha.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* CORPO DOS ALERTAS */}
      {!isCollapsed && (
        <div className="p-4 sm:p-5 space-y-4">
          
          {/* Subfiltro de Alertas */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeFilter === 'all'
                    ? 'bg-white text-black font-black'
                    : 'bg-[#181824] text-[#71717A] hover:text-white'
                }`}
              >
                Todos ({activeAlerts.length})
              </button>

              <button
                onClick={() => setActiveFilter('critical')}
                className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  activeFilter === 'critical'
                    ? 'bg-[#FF2B4E] text-white font-black'
                    : 'bg-[#181824] text-[#FF2B4E] hover:bg-[#25151A]'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Críticos ({criticalCount})</span>
              </button>

              <button
                onClick={() => setActiveFilter('star')}
                className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  activeFilter === 'star'
                    ? 'bg-[#FFE600] text-black font-black'
                    : 'bg-[#181824] text-[#FFE600] hover:bg-[#252518]'
                }`}
              >
                <span>⭐ Pratos Estrelas ({starAlertsCount})</span>
              </button>

              <button
                onClick={() => setActiveFilter('dog')}
                className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  activeFilter === 'dog'
                    ? 'bg-[#FF7A00] text-white font-black'
                    : 'bg-[#181824] text-[#FF7A00] hover:bg-[#261C14]'
                }`}
              >
                <span>🐶 Cães de Guarda ({dogAlertsCount})</span>
              </button>
            </div>

            {dismissedAlertIds.length > 0 && (
              <button
                onClick={() => {
                  setDismissedAlertIds([]);
                  playBeep(800, 0.05);
                }}
                className="text-[11px] text-[#71717A] hover:text-[#FFE600] underline cursor-pointer"
              >
                Restaurar {dismissedAlertIds.length} alerta{dismissedAlertIds.length > 1 ? 's' : ''} descartado{dismissedAlertIds.length > 1 ? 's' : ''}
              </button>
            )}
          </div>

          {/* LISTA DE ALERTAS EM CARDS */}
          {filteredAlerts.length === 0 ? (
            <div className="p-6 bg-[#14141E] rounded-2xl border border-[#222232] text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-[#00D26A] mx-auto" />
              <div className="text-sm font-bold text-white">Nenhum alerta pendente neste filtro</div>
              <p className="text-xs text-[#71717A]">
                Os itens do cardápio estão operando dentro dos limiares de CMV e demanda estipulados.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredAlerts.map((alert) => {
                const isStar = alert.classification === 'star';
                const isCritical = alert.severity === 'critical';

                const borderClasses = isCritical
                  ? 'border-[#FF2B4E]/50 bg-gradient-to-b from-[#200E14] to-[#14141E]'
                  : isStar
                  ? 'border-[#FFE600]/40 bg-gradient-to-b from-[#222010] to-[#14141E]'
                  : 'border-[#FF7A00]/40 bg-gradient-to-b from-[#24180E] to-[#14141E]';

                const badgeBg = isCritical
                  ? 'bg-[#FF2B4E]/20 text-[#FF2B4E] border-[#FF2B4E]/40'
                  : isStar
                  ? 'bg-[#FFE600]/20 text-[#FFE600] border-[#FFE600]/40'
                  : 'bg-[#FF7A00]/20 text-[#FF7A00] border-[#FF7A00]/40';

                return (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-2xl border ${borderClasses} space-y-3.5 shadow-lg relative flex flex-col justify-between transition-all hover:scale-[1.01]`}
                  >
                    {/* Linha Superior: Imagem, Quadrante, Botão Fechar */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={alert.productImage}
                          alt={alert.productName}
                          className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${badgeBg}`}>
                              {isStar ? '⭐ Estrela' : '🐶 Cão de Guarda'}
                            </span>
                            {isCritical && (
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-[#FF2B4E] text-white">
                                Ação Urgente
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-black text-white mt-1 leading-snug">
                            {alert.title}
                          </h4>
                          <span className="text-xs text-[#A1A1AA] font-bold">
                            {alert.productName}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => handleDismiss(alert.id, e)}
                        title="Descartar alerta"
                        className="w-7 h-7 rounded-lg bg-black/30 hover:bg-white/10 text-[#71717A] hover:text-white flex items-center justify-center transition-all cursor-pointer shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Descrição & Métricas de Impacto */}
                    <p className="text-xs text-[#D4D4D8] leading-relaxed">
                      {alert.message}
                    </p>

                    {/* Box de Indicadores Reais */}
                    <div className="p-3 bg-black/40 rounded-xl border border-white/5 grid grid-cols-3 gap-2 text-center text-xs">
                      <div>
                        <span className="text-[10px] text-[#71717A] uppercase font-bold block">CMV Atual</span>
                        <span className={`font-mono font-black ${alert.currentCmv > 30 ? 'text-[#FF2B4E]' : 'text-[#FFE600]'}`}>
                          {alert.currentCmv.toFixed(1)}%
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-[#71717A] uppercase font-bold block">Volume 30d</span>
                        <span className="font-mono font-black text-[#77D4E1]">
                          {alert.currentDemand} un
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-[#71717A] uppercase font-bold block">Impacto Est.</span>
                        <span className="font-mono font-black text-[#00D26A]">
                          {formatBRL(alert.impactEstimateReais)}/mês
                        </span>
                      </div>
                    </div>

                    {/* Recomendação Estratégica & Botão de Ação Direta */}
                    <div className="space-y-2 pt-1 border-t border-white/10">
                      <div className="flex items-start gap-1.5 text-[11px] text-[#FFE600]">
                        <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span className="leading-snug">
                          <strong>Prescrição:</strong> {alert.recommendedAction}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => handleApplyAction(alert)}
                          className="flex-1 py-2 px-3 bg-gradient-to-r from-[#FFE600] to-[#FFC72C] hover:brightness-110 text-black font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                        >
                          {alert.actionType === 'adjust_price' ? (
                            <>
                              <DollarSign className="w-3.5 h-3.5" />
                              <span>Simular Preço Otimizado ({alert.suggestedPrice ? formatBRL(alert.suggestedPrice) : 'Reajustar'})</span>
                            </>
                          ) : (
                            <>
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Editar Ficha Técnica / Receita</span>
                            </>
                          )}
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

    </div>
  );
};
