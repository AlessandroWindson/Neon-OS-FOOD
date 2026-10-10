/**
 * NEON FOOD OS - Native Push & Service Worker Notification Engine
 * Gerencia alertas nativos do Sistema Operacional (Desktop, Windows, macOS, Android, iOS PWA)
 * para novos pedidos e eventos críticos recebidos via Webhooks.
 */

export interface PushNotificationPayload {
  title: string;
  body: string;
  orderCode?: string;
  channel?: string;
  customerName?: string;
  total?: number;
  icon?: string;
  tag?: string;
  targetView?: 'kds' | 'orders' | 'delivery' | 'caixa' | 'estoque';
  actions?: Array<{ action: string; title: string }>;
}

export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

/**
 * Verifica se a API de Notificações e Service Worker são suportadas no navegador
 */
export function isPushNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Obtém o status atual de permissão de notificações nativas
 */
export function getNotificationPermissionStatus(): NotificationPermissionState {
  if (!isPushNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission as NotificationPermissionState;
}

/**
 * Solicita autorização ao usuário para exibir alertas nativos do SO
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!isPushNotificationSupported()) {
    console.warn('[Push Notification] Notificações nativas não são suportadas neste navegador.');
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    console.log('[Push Notification] Permissão concedida pelo usuário:', permission);
    return permission as NotificationPermissionState;
  } catch (error) {
    console.error('[Push Notification] Erro ao solicitar permissão:', error);
    return 'denied';
  }
}

export interface ExtendedNotificationOptions extends NotificationOptions {
  vibrate?: number[];
  actions?: Array<{ action: string; title: string }>;
  renotify?: boolean;
  requireInteraction?: boolean;
}

/**
 * Dispara uma notificação nativa do Sistema Operacional usando o Service Worker
 */
export async function triggerNativePushNotification(payload: PushNotificationPayload): Promise<boolean> {
  if (!isPushNotificationSupported()) {
    return false;
  }

  // Se a permissão ainda for padrão, tenta solicitar
  let currentPermission = Notification.permission;
  if (currentPermission === 'default') {
    currentPermission = await Notification.requestPermission();
  }

  if (currentPermission !== 'granted') {
    console.log('[Push Notification] Notificação ignorada: permissão não concedida.');
    return false;
  }

  const notificationTitle = payload.title || '🍔 NEON FOOD OS • Novo Pedido!';
  const notificationOptions: ExtendedNotificationOptions = {
    body: payload.body,
    icon: payload.icon || '/icon.svg',
    badge: '/icon.svg',
    tag: payload.tag || `order_${payload.orderCode || Date.now()}`,
    vibrate: [300, 100, 300, 100, 400],
    data: {
      url: window.location.origin,
      orderCode: payload.orderCode,
      targetView: payload.targetView || 'kds'
    },
    requireInteraction: true,
    renotify: true,
    actions: payload.actions || [
      { action: 'open_kds', title: '👨‍🍳 Ver no KDS Cozinha' },
      { action: 'open_orders', title: '📋 Abrir Pedidos' }
    ]
  };

  try {
    // 1. Tenta disparar via Service Worker Registration (Padrão mais robusto para PWA e background)
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && typeof registration.showNotification === 'function') {
        await registration.showNotification(notificationTitle, notificationOptions as any);
        
        // Envia mensagem ao SW também para sincronização
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'SHOW_NATIVE_NOTIFICATION',
            title: notificationTitle,
            options: notificationOptions
          });
        }
        return true;
      }
    }

    // 2. Fallback direto via Web Notification Constructor
    const notification = new Notification(notificationTitle, notificationOptions as NotificationOptions);
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    return true;
  } catch (error) {
    console.error('[Push Notification] Erro ao disparar notificação nativa:', error);
    
    // Tenta fallback simples caso as opções avançadas (actions/vibrate) tenham falhado
    try {
      new Notification(notificationTitle, {
        body: payload.body,
        icon: '/icon.svg'
      });
      return true;
    } catch (fallbackError) {
      console.warn('[Push Notification] Fallback também falhou:', fallbackError);
      return false;
    }
  }
}

/**
 * Notificação Especializada: Novo Pedido de Webhook (iFood, Rappi, 99Food, etc.)
 */
export async function sendNewOrderPushAlert(params: {
  providerName: string;
  orderCode: string;
  customerName?: string;
  total: number;
  itemCount: number;
}): Promise<boolean> {
  const formattedTotal = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(params.total);
  const title = `🚨 NOVO PEDIDO ${params.orderCode} (${params.providerName.toUpperCase()})`;
  const body = `Cliente: ${params.customerName || 'Cliente Delivery'} • ${params.itemCount} ${params.itemCount === 1 ? 'item' : 'itens'}\nTotal: ${formattedTotal} • Enviado direto para o KDS!`;

  return triggerNativePushNotification({
    title,
    body,
    orderCode: params.orderCode,
    customerName: params.customerName,
    total: params.total,
    tag: `new_order_${params.orderCode}`,
    targetView: 'kds',
    actions: [
      { action: 'open_kds', title: '👨‍🍳 Abrir KDS' },
      { action: 'open_orders', title: '📋 Detalhes' }
    ]
  });
}

/**
 * Notificação Especializada: Cancelamento de Pedido
 */
export async function sendOrderCancelledPushAlert(params: {
  providerName: string;
  orderCode: string;
  reason?: string;
}): Promise<boolean> {
  return triggerNativePushNotification({
    title: `❌ PEDIDO CANCELADO ${params.orderCode} (${params.providerName.toUpperCase()})`,
    body: `Motivo: ${params.reason || 'Cancelado pelo cliente ou parceiro'}\nComanda removida da cozinha e estoque estornado.`,
    orderCode: params.orderCode,
    tag: `cancel_order_${params.orderCode}`,
    targetView: 'orders',
    actions: [
      { action: 'open_orders', title: '📋 Ver Cancelados' }
    ]
  });
}

/**
 * Notificação Especializada: Pagamento Aprovado Instantâneo (PIX / Cartão)
 */
export async function sendPaymentApprovedPushAlert(params: {
  providerName: string;
  orderCode?: string;
  amount: number;
  method?: string;
}): Promise<boolean> {
  const formattedAmount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(params.amount);
  return triggerNativePushNotification({
    title: `💰 PAGAMENTO CONFIRMADO: ${formattedAmount}`,
    body: `Recebido via ${params.providerName.toUpperCase()} (${(params.method || 'PIX').toUpperCase()}) • Creditado no Caixa Ativo.`,
    tag: `payment_${Date.now()}`,
    targetView: 'caixa',
    actions: [
      { action: 'open_caixa', title: '💵 Ver Caixa' }
    ]
  });
}

/**
 * Notificação Especializada: Alerta de Insumo no Nível Mínimo com Sugestão Automática de Reposição
 */
export interface LowStockPushAlertParams {
  ingredientName: string;
  currentStock: number;
  minimumStock: number;
  suggestedOrderQty: number;
  unit: string;
  supplierName?: string;
  costEstimate?: number;
}

export async function sendLowStockPushAlert(params: LowStockPushAlertParams): Promise<boolean> {
  const formattedCost = params.costEstimate 
    ? ` • Custo estimado: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(params.costEstimate)}` 
    : '';

  const title = `⚠️ ALERTA DE ESTOQUE BAIXO: ${params.ingredientName.toUpperCase()}`;
  const body = `Estoque atingiu o mínimo: ${params.currentStock} ${params.unit} (mínimo: ${params.minimumStock} ${params.unit}).\nSugestão de reposição: +${params.suggestedOrderQty} ${params.unit}${params.supplierName ? ` • Fornecedor: ${params.supplierName}` : ''}${formattedCost}`;

  return triggerNativePushNotification({
    title,
    body,
    tag: `low_stock_${params.ingredientName.toLowerCase().replace(/\s+/g, '_')}`,
    targetView: 'estoque',
    actions: [
      { action: 'open_estoque', title: '📦 Ver Estoque & Repor' },
      { action: 'open_reorder', title: '🛒 Fazer Pedido' }
    ]
  });
}
