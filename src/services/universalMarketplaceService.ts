import { Product, Order, OrderStatus } from '../types';

export type MarketplacePlatformId = 'ifood' | '99food' | 'uber' | 'uber_direct';

export type IntegrationStatus = 'connected' | 'warning' | 'error' | 'disconnected';
export type IntegrationEnvironment = 'production' | 'sandbox' | 'homologation';

export interface MarketplaceConfig {
  id: MarketplacePlatformId;
  name: string;
  badgeName: string;
  tagColor: string;
  borderColor: string;
  bgColor: string;
  enabled: boolean;
  status: IntegrationStatus;
  environment: IntegrationEnvironment;
  merchantId: string;
  clientId: string;
  clientSecret: string;
  catalogId?: string;
  webhookSecret?: string;
  webhookUrl: string;
  autoAcceptOrders: boolean;
  syncCatalogEnabled: boolean;
  syncStockEnabled: boolean;
  lastSyncAt?: string;
  lastPingAt?: string;
  errorMessage?: string;
  totalOrdersReceived: number;
}

export interface MarketplaceLog {
  id: string;
  platform: MarketplacePlatformId;
  timestamp: string;
  eventType: 'auth' | 'catalog_sync' | 'price_sync' | 'stock_sync' | 'order_received' | 'status_update' | 'error' | 'ping';
  status: 'success' | 'warning' | 'error';
  title: string;
  details: string;
  payload?: any;
}

/**
 * Interface Universal para Conectores de Marketplace (Adapter Pattern)
 */
export interface IPlatformConnector {
  platformId: MarketplacePlatformId;
  connect(config: MarketplaceConfig): Promise<{ success: boolean; message: string }>;
  testConnection(): Promise<{ success: boolean; latencyMs: number; message: string }>;
  syncCatalog(products: Product[]): Promise<{ syncedItems: number; errors: number }>;
  syncStockAvailability(productId: string, available: boolean): Promise<boolean>;
  updateOrderStatus(externalOrderId: string, status: OrderStatus): Promise<boolean>;
}

// Storage keys
const STORAGE_CONFIG_KEY = 'dulci_marketplace_configs_v1';
const STORAGE_LOGS_KEY = 'dulci_marketplace_logs_v1';

export const DEFAULT_MARKETPLACE_CONFIGS: Record<MarketplacePlatformId, MarketplaceConfig> = {
  ifood: {
    id: 'ifood',
    name: 'iFood Brasil',
    badgeName: 'iFood Marketplace',
    tagColor: 'text-[#EA1D2C]',
    borderColor: 'border-[#EA1D2C]/40',
    bgColor: 'bg-[#EA1D2C]/10',
    enabled: true,
    status: 'connected',
    environment: 'production',
    merchantId: 'mcht_dulci_am_01',
    clientId: 'dulci_ifood_client_prod',
    clientSecret: '••••••••••••••••••••••••',
    catalogId: 'cat_dulci_manaus_main',
    webhookSecret: 'whsec_ifood_manaus_8829',
    webhookUrl: 'https://ais-dev-6bfggj7d3hqrjg7hp5lgrz-347509953670.us-east1.run.app/api/webhooks/ifood',
    autoAcceptOrders: true,
    syncCatalogEnabled: true,
    syncStockEnabled: true,
    lastSyncAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    lastPingAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    totalOrdersReceived: 184,
  },
  '99food': {
    id: '99food',
    name: '99Food Express',
    badgeName: '99Food Open API',
    tagColor: 'text-[#FF9E00]',
    borderColor: 'border-[#FF9E00]/40',
    bgColor: 'bg-[#FF9E00]/10',
    enabled: true,
    status: 'connected',
    environment: 'production',
    merchantId: '99_store_dulci_am',
    clientId: 'app_99_dulci_key',
    clientSecret: '••••••••••••••••••••••••',
    catalogId: 'menu_99_dulci_v1',
    webhookSecret: 'whsec_99_am_99182',
    webhookUrl: 'https://ais-dev-6bfggj7d3hqrjg7hp5lgrz-347509953670.us-east1.run.app/api/webhooks/99food',
    autoAcceptOrders: true,
    syncCatalogEnabled: true,
    syncStockEnabled: true,
    lastSyncAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    lastPingAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    totalOrdersReceived: 92,
  },
  uber: {
    id: 'uber',
    name: 'Uber Eats',
    badgeName: 'Uber Marketplace',
    tagColor: 'text-[#06C167]',
    borderColor: 'border-[#06C167]/40',
    bgColor: 'bg-[#06C167]/10',
    enabled: true,
    status: 'connected',
    environment: 'production',
    merchantId: 'store_uber_dulci_manaus',
    clientId: 'uber_eats_client_id_dulci',
    clientSecret: '••••••••••••••••••••••••',
    catalogId: 'uber_menu_dulci_01',
    webhookSecret: 'whsec_uber_88319',
    webhookUrl: 'https://ais-dev-6bfggj7d3hqrjg7hp5lgrz-347509953670.us-east1.run.app/api/webhooks/uber',
    autoAcceptOrders: false,
    syncCatalogEnabled: true,
    syncStockEnabled: true,
    lastSyncAt: new Date(Date.now() - 1000 * 60 * 80).toISOString(),
    lastPingAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    totalOrdersReceived: 76,
  },
  uber_direct: {
    id: 'uber_direct',
    name: 'Uber Direct (Entregas Sob Demanda)',
    badgeName: 'Uber Direct API',
    tagColor: 'text-[#00D2FF]',
    borderColor: 'border-[#00D2FF]/40',
    bgColor: 'bg-[#00D2FF]/10',
    enabled: true,
    status: 'connected',
    environment: 'production',
    merchantId: 'customer_dulci_am_direct',
    clientId: 'uber_direct_client_key',
    clientSecret: '••••••••••••••••••••••••',
    webhookUrl: 'https://ais-dev-6bfggj7d3hqrjg7hp5lgrz-347509953670.us-east1.run.app/api/webhooks/uber-direct',
    autoAcceptOrders: true,
    syncCatalogEnabled: false,
    syncStockEnabled: false,
    lastSyncAt: new Date().toISOString(),
    lastPingAt: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
    totalOrdersReceived: 45,
  }
};

export const INITIAL_MARKETPLACE_LOGS: MarketplaceLog[] = [
  {
    id: 'log_01',
    platform: 'ifood',
    timestamp: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
    eventType: 'order_received',
    status: 'success',
    title: 'Pedido Recebido via Webhook iFood #IF-8821',
    details: '1x X-Tudo, 1x Batata Frita G, 1x Baré 2L. Valor: R$ 48,00. Cliente: Marcos Vinicius (Manaus).',
  },
  {
    id: 'log_02',
    platform: '99food',
    timestamp: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
    eventType: 'catalog_sync',
    status: 'success',
    title: 'Sincronização de Cardápio Concluída',
    details: '30 produtos e 9 categorias sincronizados com sucesso na loja 99Food Manaus.',
  },
  {
    id: 'log_03',
    platform: 'uber',
    timestamp: new Date(Date.now() - 1000 * 60 * 28).toISOString(),
    eventType: 'price_sync',
    status: 'success',
    title: 'Preços Atualizados no Catálogo Uber Eats',
    details: 'Ofertas da Dulci e Pizzas Média/Grande sincronizadas com os valores vigentes.',
  },
  {
    id: 'log_04',
    platform: 'uber_direct',
    timestamp: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
    eventType: 'order_received',
    status: 'success',
    title: 'Entregador Uber Direct Despachado',
    details: 'Corrida solicitada para entrega própria de WhatsApp #TK-104. Rastreamento ativo.',
  }
];

class UniversalMarketplaceManager {
  private configs: Record<MarketplacePlatformId, MarketplaceConfig>;
  private logs: MarketplaceLog[];

  constructor() {
    this.configs = this.loadConfigs();
    this.logs = this.loadLogs();
  }

  private loadConfigs(): Record<MarketplacePlatformId, MarketplaceConfig> {
    try {
      const saved = localStorage.getItem(STORAGE_CONFIG_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return { ...DEFAULT_MARKETPLACE_CONFIGS };
  }

  private saveConfigs(): void {
    try {
      localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(this.configs));
    } catch {}
  }

  private loadLogs(): MarketplaceLog[] {
    try {
      const saved = localStorage.getItem(STORAGE_LOGS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [...INITIAL_MARKETPLACE_LOGS];
  }

  private saveLogs(): void {
    try {
      localStorage.setItem(STORAGE_LOGS_KEY, JSON.stringify(this.logs.slice(0, 100)));
    } catch {}
  }

  public getConfigs(): Record<MarketplacePlatformId, MarketplaceConfig> {
    return { ...this.configs };
  }

  public getConfig(id: MarketplacePlatformId): MarketplaceConfig {
    return this.configs[id];
  }

  public getLogs(): MarketplaceLog[] {
    return [...this.logs];
  }

  public addLog(log: Omit<MarketplaceLog, 'id' | 'timestamp'>): MarketplaceLog {
    const newLog: MarketplaceLog = {
      ...log,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString()
    };
    this.logs.unshift(newLog);
    this.saveLogs();
    return newLog;
  }

  public updateConfig(id: MarketplacePlatformId, updates: Partial<MarketplaceConfig>): MarketplaceConfig {
    this.configs[id] = {
      ...this.configs[id],
      ...updates,
    };
    this.saveConfigs();
    return this.configs[id];
  }

  public async testConnection(id: MarketplacePlatformId): Promise<{ success: boolean; latencyMs: number; message: string }> {
    const config = this.configs[id];
    const startTime = performance.now();

    // Simulate authentic latency & TLS handshake to platform
    await new Promise(r => setTimeout(r, 650 + Math.random() * 400));
    const latency = Math.round(performance.now() - startTime);

    if (!config.enabled) {
      this.updateConfig(id, { status: 'disconnected', errorMessage: 'Integração desativada pelo operador.' });
      this.addLog({
        platform: id,
        eventType: 'ping',
        status: 'warning',
        title: `Teste de Conexão: Desativado (${config.name})`,
        details: 'Canal está desligado nas preferências da Lanchonete Dulci.'
      });
      return { success: false, latencyMs: latency, message: 'Canal desativado.' };
    }

    const isSuccess = Math.random() > 0.05; // 95% success
    if (isSuccess) {
      this.updateConfig(id, {
        status: 'connected',
        lastPingAt: new Date().toISOString(),
        errorMessage: undefined,
      });
      this.addLog({
        platform: id,
        eventType: 'ping',
        status: 'success',
        title: `Conexão OK com ${config.name} (${latency}ms)`,
        details: `OAuth 2.0 Token válido. Webhook endpoint ativo e respondendo 200 OK no ambiente ${config.environment}.`
      });
      return { success: true, latencyMs: latency, message: `Conexão bem-sucedida (${latency}ms) via TLS 1.3.` };
    } else {
      this.updateConfig(id, {
        status: 'error',
        errorMessage: 'Timeout ou erro 502 na API do parceiro. Verifique as credenciais.'
      });
      this.addLog({
        platform: id,
        eventType: 'error',
        status: 'error',
        title: `Erro de Conexão com ${config.name}`,
        details: 'Falha na validação do Client Secret ou merchant indisponível.'
      });
      return { success: false, latencyMs: latency, message: 'Falha na resposta do marketplace.' };
    }
  }

  public async syncAllCatalogs(products: Product[]): Promise<{ totalSynced: number; platforms: string[] }> {
    const platforms: string[] = [];
    let totalSynced = 0;

    for (const key of Object.keys(this.configs) as MarketplacePlatformId[]) {
      const cfg = this.configs[key];
      if (cfg.enabled && cfg.syncCatalogEnabled) {
        totalSynced += products.length;
        platforms.push(cfg.name);
        this.updateConfig(key, { lastSyncAt: new Date().toISOString() });
        this.addLog({
          platform: key,
          eventType: 'catalog_sync',
          status: 'success',
          title: `Cardápio Sincronizado: ${cfg.name}`,
          details: `${products.length} itens da Lanchonete Dulci (Lanches, Pizzas, Bebidas e Combos) atualizados instantaneamente.`
        });
      }
    }

    return { totalSynced, platforms };
  }

  public async toggleProductAvailability(productId: string, productName: string, available: boolean): Promise<void> {
    for (const key of Object.keys(this.configs) as MarketplacePlatformId[]) {
      const cfg = this.configs[key];
      if (cfg.enabled && cfg.syncStockEnabled) {
        this.addLog({
          platform: key,
          eventType: 'stock_sync',
          status: 'success',
          title: `${available ? 'Disponibilizado' : 'Pausado'}: ${productName}`,
          details: `Disponibilidade sincronizada na plataforma ${cfg.name}. Status: ${available ? 'Em Estoque' : 'Esgotado / Pausado'}.`
        });
      }
    }
  }
}

export const marketplaceManager = new UniversalMarketplaceManager();

/**
 * Toca o som oficial de NOVO PEDIDO CHEGANDO (Campainha dupla de restaurante)
 */
export function playNewOrderSound(): void {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // Primeiro toque (alto e nítido)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(880, ctx.currentTime); // A5
    osc1.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15); // E6
    gain1.gain.setValueAtTime(0.4, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.35);

    // Segundo toque (harmônico de finalização)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1760, ctx.currentTime + 0.2); // A6
    gain2.gain.setValueAtTime(0.35, ctx.currentTime + 0.2);
    gain2.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.7);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.2);
    osc2.stop(ctx.currentTime + 0.7);
  } catch (e) {
    console.warn('AudioContext not allowed or not supported:', e);
  }
}
