export interface ManagerTargetsConfig {
  dailyRevenueTarget: number;       // Meta diária geral de faturamento bruto/líquido (0 = Nenhuma meta definida)
  pixShareTargetPercent: number;    // Meta de participação mínima via PIX (% para liquidação D+0)
  averageTicketTarget: number;      // Meta de ticket médio por transação (R$)
  alertThresholdPercent: number;    // Limiar percentual para disparar alerta crítico (ex: 75%)
  soundAlertsEnabled: boolean;      // Habilitar efeitos sonoros de alerta
  hasCustomTarget: boolean;         // Se o usuário configurou expressamente uma meta
  lastUpdated?: string;             // Timestamp da última atualização
}

export const DEFAULT_MANAGER_TARGETS: ManagerTargetsConfig = {
  dailyRevenueTarget: 0,            // Regra: Dado não cadastrado não existe. Meta padrão = 0.
  pixShareTargetPercent: 0,
  averageTicketTarget: 0,
  alertThresholdPercent: 75,
  soundAlertsEnabled: true,
  hasCustomTarget: false,
  lastUpdated: undefined
};

const STORAGE_KEY = 'neon_food_manager_targets_config';
const LEGACY_STORAGE_KEY = 'neon_food_daily_cashflow_target';

export function getManagerTargetsConfig(): ManagerTargetsConfig {
  if (typeof window === 'undefined') return DEFAULT_MANAGER_TARGETS;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const targetVal = Number(parsed.dailyRevenueTarget) || 0;
      return {
        ...DEFAULT_MANAGER_TARGETS,
        ...parsed,
        dailyRevenueTarget: targetVal,
        hasCustomTarget: parsed.hasCustomTarget !== undefined ? Boolean(parsed.hasCustomTarget) : (targetVal > 0)
      };
    }
  } catch (e) {
    console.warn('Erro ao carregar metas do localStorage:', e);
  }

  return DEFAULT_MANAGER_TARGETS;
}

export function saveManagerTargetsConfig(config: ManagerTargetsConfig): void {
  if (typeof window === 'undefined') return;

  try {
    const toSave: ManagerTargetsConfig = {
      ...config,
      hasCustomTarget: (config.dailyRevenueTarget || 0) > 0,
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    localStorage.setItem(LEGACY_STORAGE_KEY, config.dailyRevenueTarget.toString());

    // Dispara evento customizado no window para sincronização reativa imediata entre componentes
    window.dispatchEvent(new CustomEvent('neon_targets_updated', { detail: toSave }));
  } catch (e) {
    console.warn('Erro ao salvar metas no localStorage:', e);
  }
}

export function resetManagerTargetsConfig(): ManagerTargetsConfig {
  saveManagerTargetsConfig(DEFAULT_MANAGER_TARGETS);
  return DEFAULT_MANAGER_TARGETS;
}
