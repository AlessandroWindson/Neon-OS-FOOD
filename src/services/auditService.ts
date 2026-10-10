import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  limit, 
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, auth, OperationType, handleFirestoreError } from './firebase';
import { AuditLog, User, UserRole, Order } from '../types';

export type CriticalActionType = 
  | 'login' 
  | 'order_creation' 
  | 'price_change' 
  | 'deletion'
  | 'order_create'
  | 'user_login'
  | 'cancel_item'
  | 'discount_applied'
  | 'cash_bleed'
  | 'system_config'
  | string;

export interface LogActionInput {
  actionType: CriticalActionType;
  userId: string;
  tenantId: string;
  metadata?: Record<string, any>;
  description?: string;
  userName?: string;
  userEmail?: string;
  userRole?: UserRole | string;
  severity?: 'info' | 'warning' | 'critical';
  timestamp?: string;
  ipAddress?: string;
}

export interface LogAuditParams {
  tenantId: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  userRole?: UserRole | string;
  action: CriticalActionType;
  actionType?: CriticalActionType;
  category?: 'auth' | 'order' | 'price' | 'delete' | 'config' | 'system';
  description: string;
  metadata?: Record<string, any>;
  details?: Record<string, any>;
  severity?: 'info' | 'warning' | 'critical';
  ipAddress?: string;
}

/**
 * Normaliza e gera a descrição e a severidade padrão para os tipos de ações críticas
 */
function getDefaultActionMetadata(
  actionType: string,
  metadata?: Record<string, any>
): { description: string; severity: 'info' | 'warning' | 'critical'; category: 'auth' | 'order' | 'price' | 'delete' | 'config' | 'system' } {
  switch (actionType) {
    case 'login':
    case 'user_login':
      return {
        description: metadata?.userName 
          ? `Login realizado por ${metadata.userName} (${metadata.userEmail || ''})` 
          : 'Login de usuário efetuado no sistema.',
        severity: 'info',
        category: 'auth'
      };

    case 'order_creation':
    case 'order_create':
      return {
        description: metadata?.displayCode || metadata?.orderNumber
          ? `Criação de Pedido ${metadata.displayCode || `#${metadata.orderNumber}`} no valor de R$ ${(metadata.total || 0).toFixed(2)}.`
          : 'Criação de novo pedido registrada.',
        severity: 'info',
        category: 'order'
      };

    case 'price_change':
      return {
        description: metadata?.productName
          ? `Alteração de preço no item "${metadata.productName}": de R$ ${(metadata.oldPrice || 0).toFixed(2)} para R$ ${(metadata.newPrice || 0).toFixed(2)}.`
          : 'Alteração de preço de item no cardápio.',
        severity: 'warning',
        category: 'price'
      };

    case 'deletion':
      return {
        description: metadata?.entityName || metadata?.entityType
          ? `Exclusão crítica de ${metadata.entityType || 'registro'}: "${metadata.entityName || metadata.entityId}".`
          : 'Exclusão crítica de registro executada.',
        severity: 'critical',
        category: 'delete'
      };

    default:
      return {
        description: 'Operação registrada na trilha de auditoria.',
        severity: 'info',
        category: 'system'
      };
  }
}

/**
 * Função principal requisitada: logAction
 * Persiste eventos críticos (login, criação de pedidos, alterações de preço, exclusões)
 * na coleção 'auditLogs' do Firestore com timestamp, userId, tenantId, actionType e metadados.
 *
 * Suporta assinatura por objeto (LogActionInput) ou posicional:
 * logAction(actionType, userId, tenantId, metadata, description)
 */
export async function logAction(
  actionTypeOrParams: CriticalActionType | LogActionInput,
  userId?: string,
  tenantId?: string,
  metadata?: Record<string, any>,
  description?: string
): Promise<AuditLog> {
  let normalized: LogActionInput;

  if (typeof actionTypeOrParams === 'object') {
    normalized = actionTypeOrParams;
  } else {
    normalized = {
      actionType: actionTypeOrParams,
      userId: userId || 'system',
      tenantId: tenantId || 'tenant_default',
      metadata: metadata || {},
      description: description
    };
  }

  const logId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const nowIso = normalized.timestamp || new Date().toISOString();
  const defaults = getDefaultActionMetadata(normalized.actionType, normalized.metadata);

  // Resolver dados do usuário atual se não estiverem preenchidos
  const authUser = auth.currentUser;
  const resolvedUserId = normalized.userId || authUser?.uid || 'system_guest';
  const resolvedUserName = normalized.userName || normalized.metadata?.userName || authUser?.displayName || 'Operador';
  const resolvedUserEmail = normalized.userEmail || normalized.metadata?.userEmail || authUser?.email || '';
  const resolvedUserRole = normalized.userRole || normalized.metadata?.userRole || 'cashier';

  const mergedMetadata = {
    ...normalized.metadata
  };

  const auditEntry: AuditLog = {
    id: logId,
    timestamp: nowIso,
    tenantId: normalized.tenantId || 'tenant_default',
    userId: resolvedUserId,
    userName: resolvedUserName,
    userEmail: resolvedUserEmail,
    userRole: resolvedUserRole,
    actionType: normalized.actionType,
    action: normalized.actionType,
    category: defaults.category,
    description: normalized.description || defaults.description,
    metadata: mergedMetadata,
    details: mergedMetadata,
    ipAddress: normalized.ipAddress || (typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1'),
    severity: normalized.severity || defaults.severity,
    createdAt: nowIso
  };

  // 1. Gravação direta no Firestore na coleção raiz 'auditLogs'
  try {
    const docRef = doc(db, 'auditLogs', logId);
    await setDoc(docRef, {
      ...auditEntry,
      _serverCreatedAt: serverTimestamp()
    }, { merge: true });

    // 2. Espelhamento multi-tenant sob a empresa (/empresas/{tenantId}/auditLogs)
    if (normalized.tenantId && normalized.tenantId !== 'tenant_default') {
      const tenantDocRef = doc(db, 'empresas', normalized.tenantId, 'auditLogs', logId);
      setDoc(tenantDocRef, {
        ...auditEntry,
        _serverCreatedAt: serverTimestamp()
      }, { merge: true }).catch(() => {});
    }

    // 3. Compatibilidade retroativa com coleção legado 'audit_logs'
    const legacyDocRef = doc(db, 'audit_logs', logId);
    setDoc(legacyDocRef, {
      ...auditEntry,
      _serverCreatedAt: serverTimestamp()
    }, { merge: true }).catch(() => {});
  } catch (error) {
    console.warn('[AuditService.logAction] Erro ao gravar auditLog no Firestore (persistindo em cache):', error);
  }

  // 4. Salvar no histórico local de auditoria para visualização instantânea offline
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('neon_audit_logs_v1');
      const parsed: AuditLog[] = stored ? JSON.parse(stored) : [];
      const next = [auditEntry, ...parsed.slice(0, 499)];
      localStorage.setItem('neon_audit_logs_v1', JSON.stringify(next));
    } catch (e) {}
  }

  return auditEntry;
}

/**
 * Classe de Serviço de Auditoria Global do NEON FOOD OS
 */
class AuditService {
  private collectionName = 'auditLogs';

  /**
   * Função central logAction exposta na instância
   */
  async logAction(
    actionTypeOrParams: CriticalActionType | LogActionInput,
    userId?: string,
    tenantId?: string,
    metadata?: Record<string, any>,
    description?: string
  ): Promise<AuditLog> {
    return logAction(actionTypeOrParams, userId, tenantId, metadata, description);
  }

  /**
   * Alias de compatibilidade com logEvent
   */
  async logEvent(params: LogAuditParams): Promise<AuditLog> {
    return logAction({
      actionType: params.actionType || params.action,
      userId: params.userId || 'system',
      tenantId: params.tenantId || 'tenant_default',
      metadata: params.metadata || params.details || {},
      description: params.description,
      userName: params.userName,
      userEmail: params.userEmail,
      userRole: params.userRole,
      severity: params.severity,
      ipAddress: params.ipAddress
    });
  }

  // ==========================================================================
  // HELPERS ESPECÍFICOS PARA AS 4 AÇÕES CRÍTICAS
  // ==========================================================================

  /**
   * 1. Ação Crítica: LOGIN
   */
  async logLogin(user: Partial<User>, tenantId: string, details?: Record<string, any>): Promise<AuditLog> {
    const authUser = auth.currentUser;
    const uid = user?.id || authUser?.uid || 'system_guest';
    const name = user?.name || user?.displayName || authUser?.displayName || 'Usuário';
    const email = user?.email || authUser?.email || '';
    const role = user?.role || 'cashier';

    return logAction({
      actionType: 'login',
      userId: uid,
      tenantId: tenantId || 'tenant_default',
      userName: name,
      userEmail: email,
      userRole: role,
      severity: 'info',
      description: `Autenticação efetuada: ${name} (${email || 'sem e-mail'}) com perfil [${role}].`,
      metadata: {
        method: details?.method || 'session_or_credential',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        timestamp: new Date().toISOString(),
        ...details
      }
    });
  }

  /**
   * 2. Ação Crítica: CRIAÇÃO DE PEDIDO
   */
  async logOrderCreation(order: Partial<Order>, user?: Partial<User> | null, tenantId?: string): Promise<AuditLog> {
    const authUser = auth.currentUser;
    const uid = user?.id || authUser?.uid || 'system';
    const name = user?.name || authUser?.displayName || 'Operador';
    const email = user?.email || authUser?.email || '';
    const role = user?.role || 'cashier';
    const resolvedTenantId = tenantId || order.tenantId || 'tenant_default';
    const totalFormatted = (order.total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const itemsCount = order.items?.length || 0;

    return logAction({
      actionType: 'order_creation',
      userId: uid,
      tenantId: resolvedTenantId,
      userName: name,
      userEmail: email,
      userRole: role,
      severity: 'info',
      description: `Pedido ${order.displayCode || `#${order.orderNumber || ''}`} criado no valor de ${totalFormatted} via ${order.channel || 'PDV'} (${itemsCount} itens).`,
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        displayCode: order.displayCode,
        channel: order.channel,
        total: order.total,
        paymentMethod: order.paymentMethod,
        itemsCount,
        customerName: order.customerName,
        tableNumber: order.tableNumber,
        comandaNumber: order.comandaNumber
      }
    });
  }

  /**
   * 3. Ação Crítica: ALTERAÇÃO DE PREÇO
   */
  async logPriceChange(
    product: { id: string; name: string },
    oldPrice: number,
    newPrice: number,
    user?: Partial<User> | null,
    tenantId?: string
  ): Promise<AuditLog> {
    const authUser = auth.currentUser;
    const uid = user?.id || authUser?.uid || 'system';
    const name = user?.name || authUser?.displayName || 'Gerente';
    const email = user?.email || authUser?.email || '';
    const role = user?.role || 'admin';
    const diff = Number((newPrice - oldPrice).toFixed(2));
    const percent = oldPrice > 0 ? Number(((diff / oldPrice) * 100).toFixed(1)) : 0;
    const oldFmt = oldPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const newFmt = newPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return logAction({
      actionType: 'price_change',
      userId: uid,
      tenantId: tenantId || 'tenant_default',
      userName: name,
      userEmail: email,
      userRole: role,
      severity: 'warning',
      description: `Alteração de preço no produto "${product.name}": de ${oldFmt} para ${newFmt} (${diff >= 0 ? `+${percent}%` : `${percent}%`}).`,
      metadata: {
        productId: product.id,
        productName: product.name,
        oldPrice,
        newPrice,
        difference: diff,
        percentageChange: percent
      }
    });
  }

  /**
   * 4. Ação Crítica: EXCLUSÃO DE DADOS
   */
  async logDeletion(
    entityType: 'produto' | 'categoria' | 'pedido' | 'mesa' | 'comanda' | 'insumo' | 'usuario' | string,
    entityId: string,
    entityName: string,
    user?: Partial<User> | null,
    tenantId?: string,
    extraMetadata?: Record<string, any>
  ): Promise<AuditLog> {
    const authUser = auth.currentUser;
    const uid = user?.id || authUser?.uid || 'system';
    const name = user?.name || authUser?.displayName || 'Gerente';
    const email = user?.email || authUser?.email || '';
    const role = user?.role || 'admin';

    return logAction({
      actionType: 'deletion',
      userId: uid,
      tenantId: tenantId || 'tenant_default',
      userName: name,
      userEmail: email,
      userRole: role,
      severity: 'critical',
      description: `Exclusão de ${entityType}: "${entityName}" (ID: ${entityId}) executada por ${name}.`,
      metadata: {
        entityType,
        entityId,
        entityName,
        ...extraMetadata
      }
    });
  }

  // ==========================================================================
  // CONSULTAS E SUBSCRIÇÃO EM TEMPO REAL NO FIRESTORE
  // ==========================================================================

  /**
   * Assina em tempo real os logs de auditoria da coleção 'auditLogs'
   */
  subscribeAuditLogs(tenantId: string | null, onUpdate: (logs: AuditLog[]) => void): () => void {
    const collRef = collection(db, this.collectionName);

    let q = query(collRef, limit(150));

    if (tenantId && tenantId !== 'all') {
      try {
        q = query(collRef, where('tenantId', '==', tenantId), limit(150));
      } catch (e) {
        q = query(collRef, limit(150));
      }
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const logs: AuditLog[] = [];
        snapshot.forEach((docSnap) => {
          logs.push({ id: docSnap.id, ...docSnap.data() } as AuditLog);
        });

        logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        onUpdate(logs);
      },
      (error) => {
        console.warn('[AuditService] Listener de auditLogs encontrou aviso:', error);
        if (typeof window !== 'undefined') {
          try {
            const stored = localStorage.getItem('neon_audit_logs_v1');
            if (stored) {
              onUpdate(JSON.parse(stored));
            }
          } catch (e) {}
        }
      }
    );

    return unsubscribe;
  }

  /**
   * Busca registros pontuais de auditoria
   */
  async fetchAuditLogs(tenantId?: string, limitCount = 100): Promise<AuditLog[]> {
    const path = this.collectionName;
    try {
      const collRef = collection(db, path);
      let q = query(collRef, limit(limitCount));
      if (tenantId && tenantId !== 'all') {
        q = query(collRef, where('tenantId', '==', tenantId), limit(limitCount));
      }

      const snap = await getDocs(q);
      const list: AuditLog[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as AuditLog));
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return list;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  }
}

export const auditService = new AuditService();
export default auditService;
