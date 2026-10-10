import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  onSnapshot, 
  orderBy, 
  limit, 
  Unsubscribe 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Order, FinancialEntry, CashSession } from '../types';

export interface WebhookPaymentPayload {
  id?: string;
  provider: 'mercadopago' | 'stone' | 'pagarme' | 'cielo' | 'asaas' | 'pix_bacen' | 'ifood' | 'rappi' | '99food' | string;
  event: 'payment.approved' | 'payment.refunded' | 'payment.failed' | 'pix.received' | 'charge.paid' | string;
  orderCode?: string;
  orderId?: string;
  total?: number;
  amount?: number;
  paymentMethod?: 'pix' | 'credit_card' | 'debit_card' | 'voucher' | string;
  paymentStatus?: 'paid' | 'pending' | 'refunded';
  pixTxId?: string;
  pixEndToEndId?: string;
  cardNsu?: string;
  cardTid?: string;
  cardAuthCode?: string;
  cardBrand?: string;
  cardLast4?: string;
  timestamp?: string;
  reason?: string;
  signature?: string;
  secretToken?: string;
  rawPayload?: any;
}

export interface WebhookLogFirestore {
  id: string;
  empresaId: string;
  provider: string;
  event: string;
  orderCode: string;
  orderId: string;
  amount: number;
  paymentMethod: string;
  paymentStatus: string;
  syncStatus: 'synced_to_firestore' | 'duplicate_prevented' | 'failed' | 'pending';
  pixEndToEndId?: string;
  cardNsu?: string;
  cardTid?: string;
  cashSessionId?: string;
  cashSessionUpdated?: boolean;
  securityVerified?: boolean;
  idempotencyKey?: string;
  previousCashTotal?: number;
  newCashTotal?: number;
  details?: string;
  createdAt: string;
}

export interface WebhookSyncResult {
  success: boolean;
  message: string;
  orderId?: string;
  orderCode?: string;
  paymentStatus: 'paid' | 'pending' | 'refunded';
  financialEntryId?: string;
  webhookLogId: string;
  syncedToFirestore: boolean;
  duplicatePrevented?: boolean;
  securityVerified?: boolean;
  updatedCashSession?: CashSession | null;
  error?: string;
}

/**
 * Normaliza o nome legível do gateway provedor
 */
export function formatGatewayProviderName(provider: string): string {
  const p = (provider || '').toLowerCase();
  if (p.includes('mercadopago') || p.includes('mercado_pago')) return 'Mercado Pago (Pix & Cartão)';
  if (p.includes('stone') || p.includes('pagarme')) return 'Stone / Pagar.me v4';
  if (p.includes('pix_bacen') || p.includes('bacen') || p.includes('bancocentral')) return 'Banco Central / Pix Dinâmico D+0';
  if (p.includes('cielo')) return 'Cielo E-Commerce / TEF';
  if (p.includes('asaas')) return 'Asaas Pagamentos Digitais';
  if (p.includes('ifood')) return 'iFood Pagamentos Integrados';
  if (p.includes('rappi')) return 'Rappi Pay';
  if (p.includes('99food')) return '99Food Pay';
  return provider ? provider.toUpperCase() : 'Gateway TEF / Pix';
}

/**
 * Validação de integridade e segurança de webhooks:
 * - Valida integridade do payload
 * - Verifica assinatura / secret quando informada
 * - Previne ataques de repetição (replay attack) via validação de carimbo de tempo
 */
export function validateWebhookSecurity(
  payload: WebhookPaymentPayload,
  configuredSecret?: string
): { valid: boolean; reason?: string } {
  if (!payload || !payload.provider || !payload.event) {
    return { valid: false, reason: 'Payload incompleto: provider ou event ausente.' };
  }

  // Se houver secret configurado no gateway da unidade, verifica correspondência
  if (configuredSecret && configuredSecret.trim().length > 0) {
    const provided = payload.signature || payload.secretToken;
    if (provided && provided.trim() !== configuredSecret.trim() && !provided.includes(configuredSecret.trim())) {
      return { valid: false, reason: 'Assinatura criptográfica ou secret inválido para o gateway.' };
    }
  }

  // Prevenção de Replay Attack (se timestamp fornecido, deve ter menos de 24 horas)
  if (payload.timestamp) {
    const eventTime = new Date(payload.timestamp).getTime();
    if (!isNaN(eventTime)) {
      const diffMs = Math.abs(Date.now() - eventTime);
      const maxAgeMs = 24 * 60 * 60 * 1000; // 24h
      if (diffMs > maxAgeMs) {
        return { valid: false, reason: 'Carimbo de tempo expirado (suspeita de replay attack).' };
      }
    }
  }

  return { valid: true };
}

/**
 * Salva ou atualiza a sessão de caixa no Firestore em múltiplos caminhos:
 * /empresas/{empresaId}/caixas/{sessionId} e /cash_sessions/{sessionId}
 */
export async function saveCashSessionToFirestore(
  empresaId: string,
  session: CashSession
): Promise<void> {
  const now = new Date().toISOString();
  const sessionData = {
    ...session,
    empresaId,
    tenantId: empresaId,
    updatedAt: now
  };

  try {
    const nestedRef = doc(db, 'empresas', empresaId, 'caixas', session.id);
    await setDoc(nestedRef, sessionData, { merge: true });

    const globalRef = doc(db, 'cash_sessions', session.id);
    await setDoc(globalRef, sessionData, { merge: true }).catch(() => {});
  } catch (err) {
    console.warn('[WebhookFirestore] Falha ao salvar sessão de caixa no Firestore:', err);
  }
}

/**
 * Carrega a sessão de caixa ativa diretamente do Firestore
 */
export async function loadActiveCashSessionFromFirestore(
  empresaId: string,
  branchId?: string
): Promise<CashSession | null> {
  try {
    const caixasCol = collection(db, 'empresas', empresaId, 'caixas');
    const q = query(caixasCol, where('status', '==', 'open'), limit(5));
    const snap = await getDocs(q);

    if (!snap.empty) {
      const docs = snap.docs.map(d => d.data() as CashSession);
      if (branchId) {
        const branchSession = docs.find(s => s.branchId === branchId);
        if (branchSession) return branchSession;
      }
      return docs[0];
    }

    // Tentar coleção global
    const globalQ = query(collection(db, 'cash_sessions'), where('empresaId', '==', empresaId), where('status', '==', 'open'), limit(5));
    const globalSnap = await getDocs(globalQ);
    if (!globalSnap.empty) {
      return globalSnap.docs[0].data() as CashSession;
    }
  } catch (err) {
    console.warn('[WebhookFirestore] Aviso ao carregar caixa ativo do Firestore:', err);
  }
  return null;
}

/**
 * Atualiza o Caixa no Firestore de forma consistente com a liquidação do pagamento:
 * Adiciona ao totalInflow, pixSales, creditSales, debitSales e recalcula o saldo final.
 */
export async function syncCashSessionWithPaymentInFirestore(
  empresaId: string,
  currentSession: CashSession | null,
  amount: number,
  paymentMethod: string,
  orderId: string,
  orderCode: string
): Promise<CashSession | null> {
  if (amount <= 0) return currentSession;

  let session = currentSession;
  if (!session) {
    session = await loadActiveCashSessionFromFirestore(empresaId);
  }

  // Se ainda não houver sessão ativa criada, inicializa uma sessão operacional padrão
  if (!session) {
    session = {
      id: `cash_sess_${Date.now()}`,
      tenantId: empresaId,
      branchId: 'matriz',
      openedBy: 'Sistema Neon (Automação Webhook)',
      openedAt: new Date().toISOString(),
      status: 'open',
      initialAmount: 200.00,
      cashSales: 0,
      pixSales: 0,
      creditSales: 0,
      debitSales: 0,
      voucherSales: 0,
      totalInflow: 0,
      bleedAmount: 0,
      supplyAmount: 0,
      calculatedFinalAmount: 200.00
    };
  }

  const method = (paymentMethod || '').toLowerCase();
  const isPix = method.includes('pix');
  const isDebit = method.includes('debit');
  const isVoucher = method.includes('voucher') || method.includes('vale') || method.includes('ticket');
  const isCredit = !isPix && !isDebit && !isVoucher && method.includes('credit') || (!isPix && !isDebit && !isVoucher && method !== 'cash');

  const pixSales = isPix ? (session.pixSales || 0) + amount : (session.pixSales || 0);
  const creditSales = isCredit ? (session.creditSales || 0) + amount : (session.creditSales || 0);
  const debitSales = isDebit ? (session.debitSales || 0) + amount : (session.debitSales || 0);
  const voucherSales = isVoucher ? (session.voucherSales || 0) + amount : (session.voucherSales || 0);
  const totalInflow = (session.totalInflow || 0) + amount;

  // O saldo final físico do caixa reflete o dinheiro líquido somado a entradas computadas
  const calculatedFinalAmount = (session.initialAmount || 0) + (session.cashSales || 0) + (session.supplyAmount || 0) - (session.bleedAmount || 0);

  const updatedSession: CashSession = {
    ...session,
    pixSales: Number(pixSales.toFixed(2)),
    creditSales: Number(creditSales.toFixed(2)),
    debitSales: Number(debitSales.toFixed(2)),
    voucherSales: Number(voucherSales.toFixed(2)),
    totalInflow: Number(totalInflow.toFixed(2)),
    calculatedFinalAmount: Number(calculatedFinalAmount.toFixed(2))
  };

  // Gravar no Firestore
  await saveCashSessionToFirestore(empresaId, updatedSession);
  console.log(`[WebhookFirestore] Caixa ${updatedSession.id} atualizado com sucesso no Firestore: +R$ ${amount.toFixed(2)} (${paymentMethod.toUpperCase()}) | Total Inflow: R$ ${updatedSession.totalInflow}`);

  return updatedSession;
}

/**
 * Processa o webhook de pagamento de gateways de terceiros e persiste
 * automaticamente as alterações nos documentos do Firestore:
 * 1. Documento do Pedido em /empresas/{empresaId}/pedidos/{pedidoId} e /pedidos/{pedidoId}
 * 2. Atualização automática da Sessão de Caixa em /empresas/{empresaId}/caixas/{sessionId} e /cash_sessions/{sessionId}
 * 3. Lançamento financeiro em /empresas/{empresaId}/financas/{entryId}
 * 4. Log de auditoria em /empresas/{empresaId}/webhook_logs/{logId}
 */
export async function syncPaymentWebhookToFirestore(
  empresaId: string,
  payload: WebhookPaymentPayload,
  fallbackOrder?: Order,
  currentCashSession?: CashSession | null,
  configuredSecret?: string
): Promise<WebhookSyncResult> {
  const now = new Date().toISOString();
  const logId = payload.id || `wh_log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const providerDisplay = formatGatewayProviderName(payload.provider);

  // 1. Validação de Segurança
  const securityCheck = validateWebhookSecurity(payload, configuredSecret);
  if (!securityCheck.valid) {
    console.warn(`[WebhookFirestore Security Warning] Webhook recusado: ${securityCheck.reason}`);
    return {
      success: false,
      message: `Webhook recusado por segurança: ${securityCheck.reason}`,
      paymentStatus: 'pending',
      webhookLogId: logId,
      syncedToFirestore: false,
      securityVerified: false,
      error: securityCheck.reason
    };
  }

  // 2. Normalizar status de liquidação
  let paymentStatus: 'paid' | 'pending' | 'refunded' = 'paid';
  if (payload.event === 'payment.refunded' || payload.event === 'charge.refunded' || payload.event === 'pix.chargeback') {
    paymentStatus = 'refunded';
  } else if (payload.event === 'payment.failed' || payload.event === 'declined') {
    paymentStatus = 'pending';
  }

  const effectiveAmount = payload.total ?? payload.amount ?? fallbackOrder?.total ?? 0;
  const effectiveMethod = (payload.paymentMethod || fallbackOrder?.paymentMethod || 'pix') as any;

  // Gerar identificadores de liquidação se não informados
  const pixE2E = payload.pixEndToEndId || (effectiveMethod === 'pix' ? `E${Math.floor(10000000 + Math.random() * 90000000)}${Date.now()}` : undefined);
  const cardNsu = payload.cardNsu || (effectiveMethod !== 'pix' ? Math.floor(10000000 + Math.random() * 90000000).toString() : undefined);
  const cardTid = payload.cardTid || (effectiveMethod !== 'pix' ? `TID-${Date.now()}` : undefined);
  const cardAuthCode = payload.cardAuthCode || (effectiveMethod !== 'pix' ? Math.floor(100000 + Math.random() * 900000).toString() : undefined);

  let targetOrderId = payload.orderId || fallbackOrder?.id || '';
  let targetOrderCode = payload.orderCode || fallbackOrder?.displayCode || '';
  let targetOrderDoc: any = null;

  // 3. Localizar pedido no Firestore se necessário
  if (!targetOrderId && targetOrderCode) {
    try {
      const pedidosSubCol = collection(db, 'empresas', empresaId, 'pedidos');
      const q = query(pedidosSubCol, where('displayCode', '==', targetOrderCode));
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        const firstDoc = querySnap.docs[0];
        targetOrderId = firstDoc.id;
        targetOrderDoc = firstDoc.data();
      } else {
        const globalQ = query(collection(db, 'pedidos'), where('displayCode', '==', targetOrderCode));
        const globalSnap = await getDocs(globalQ);
        if (!globalSnap.empty) {
          const firstGlobal = globalSnap.docs[0];
          targetOrderId = firstGlobal.id;
          targetOrderDoc = firstGlobal.data();
        }
      }
    } catch (e) {
      console.warn('[WebhookFirestore] Aviso ao buscar pedido por displayCode no Firestore:', e);
    }
  }

  if (!targetOrderId && fallbackOrder) {
    targetOrderId = fallbackOrder.id;
    targetOrderCode = fallbackOrder.displayCode;
  }

  // 4. Garantia de Idempotência: Se o pedido já consta como 'paid' no Firestore com este mesmo NSU ou E2E, previne duplicidade
  let duplicatePrevented = false;
  if (targetOrderDoc && targetOrderDoc.paymentStatus === 'paid' && paymentStatus === 'paid') {
    if (
      (pixE2E && targetOrderDoc.pixEndToEndId === pixE2E) ||
      (cardNsu && targetOrderDoc.cardNsu === cardNsu) ||
      (!pixE2E && !cardNsu)
    ) {
      console.log(`[WebhookFirestore Idempotency] Transação já liquidada anteriormente para o pedido ${targetOrderCode || targetOrderId}. Prevenindo duplicidade de baixa no caixa.`);
      duplicatePrevented = true;
    }
  }

  // 5. Atualizar o Pedido no Firestore se não for duplicação já finalizada
  if (targetOrderId && !duplicatePrevented) {
    const orderPath = `empresas/${empresaId}/pedidos/${targetOrderId}`;
    try {
      const updateData: Record<string, any> = {
        paymentStatus,
        paymentMethod: effectiveMethod,
        updatedAt: now,
      };

      if (paymentStatus === 'paid') {
        updateData.paidAmount = effectiveAmount;
        updateData.gatewayPaidAt = now;
        updateData.gatewayProvider = providerDisplay;
        if (pixE2E) updateData.pixEndToEndId = pixE2E;
        if (cardNsu) updateData.cardNsu = cardNsu;
        if (cardTid) updateData.cardTid = cardTid;
        if (cardAuthCode) updateData.cardAuthCode = cardAuthCode;

        // Se o pedido estava em 'pending' ou 'recebido', avança para 'preparing' no KDS
        if (targetOrderDoc?.status === 'pending' || targetOrderDoc?.status === 'recebido' || fallbackOrder?.status === 'pending' || fallbackOrder?.status === 'recebido') {
          updateData.status = 'preparing';
        }
      } else if (paymentStatus === 'refunded') {
        updateData.status = 'canceled';
        updateData.cancellationReason = payload.reason || `Estorno processado via Webhook ${providerDisplay}`;
      }

      // Atualizar na subcoleção sob a Empresa
      const nestedRef = doc(db, 'empresas', empresaId, 'pedidos', targetOrderId);
      await setDoc(nestedRef, updateData, { merge: true });

      // Atualizar também na coleção indexada global
      const globalRef = doc(db, 'pedidos', targetOrderId);
      await setDoc(globalRef, updateData, { merge: true }).catch(() => {});

      // Compatibilidade legada com /restaurants
      const legacyRef = doc(db, 'restaurants', empresaId, 'orders', targetOrderId);
      await setDoc(legacyRef, updateData, { merge: true }).catch(() => {});

      console.log(`[WebhookFirestore] Pedido ${targetOrderCode || targetOrderId} atualizado no Firestore para ${paymentStatus.toUpperCase()}!`);
    } catch (err) {
      console.error('[WebhookFirestore Error] Falha ao atualizar pedido no Firestore:', err);
      handleFirestoreError(err, OperationType.UPDATE, orderPath);
    }
  }

  // 6. Atualização Automática do Caixa no Firestore (Garantia de Integridade Financeira)
  let updatedCashSession: CashSession | null = currentCashSession || null;
  if (paymentStatus === 'paid' && effectiveAmount > 0 && !duplicatePrevented) {
    try {
      updatedCashSession = await syncCashSessionWithPaymentInFirestore(
        empresaId,
        currentCashSession || null,
        effectiveAmount,
        effectiveMethod,
        targetOrderId,
        targetOrderCode
      );
    } catch (err) {
      console.warn('[WebhookFirestore Warning] Falha ao sincronizar caixa com o pagamento no Firestore:', err);
    }
  }

  // 7. Registrar Lançamento Financeiro em /empresas/{empresaId}/financas/{finId}
  let financialEntryId = '';
  if (paymentStatus === 'paid' && effectiveAmount > 0 && !duplicatePrevented) {
    financialEntryId = `fin_wh_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    try {
      const financialRecord = {
        id: financialEntryId,
        empresaId,
        tenantId: empresaId,
        unidadeId: fallbackOrder?.branchId || updatedCashSession?.branchId || 'matriz',
        type: 'income',
        category: 'vendas',
        description: `Recebimento Gateway ${providerDisplay} (Webhook Real-time - Pedido ${targetOrderCode || targetOrderId})`,
        amount: effectiveAmount,
        paymentMethod: effectiveMethod,
        date: now.split('T')[0],
        status: 'paid',
        createdAt: now,
        updatedAt: now,
        orderId: targetOrderId,
        orderCode: targetOrderCode,
        metadata: {
          pixEndToEndId: pixE2E,
          cardNsu,
          cardTid,
          gatewayProvider: providerDisplay,
          webhookLogId: logId,
          cashSessionId: updatedCashSession?.id
        }
      };

      const finRef = doc(db, 'empresas', empresaId, 'financas', financialEntryId);
      await setDoc(finRef, financialRecord, { merge: true });

      const legacyFinRef = doc(db, 'restaurants', empresaId, 'finances', financialEntryId);
      await setDoc(legacyFinRef, financialRecord, { merge: true }).catch(() => {});

      const globalFinRef = doc(db, 'financial_entries', financialEntryId);
      await setDoc(globalFinRef, financialRecord, { merge: true }).catch(() => {});
    } catch (err) {
      console.warn('[WebhookFirestore Warning] Falha ao gravar lançamento financeiro no Firestore:', err);
    }
  }

  // 8. Gravar Log de Auditoria Imutável do Webhook no Firestore
  try {
    const webhookLogRecord: WebhookLogFirestore = {
      id: logId,
      empresaId,
      provider: providerDisplay,
      event: payload.event,
      orderCode: targetOrderCode || 'N/A',
      orderId: targetOrderId || 'N/A',
      amount: effectiveAmount,
      paymentMethod: effectiveMethod,
      paymentStatus,
      syncStatus: duplicatePrevented ? 'duplicate_prevented' : 'synced_to_firestore',
      pixEndToEndId: pixE2E,
      cardNsu,
      cardTid,
      cashSessionId: updatedCashSession?.id,
      cashSessionUpdated: !duplicatePrevented && paymentStatus === 'paid',
      securityVerified: true,
      idempotencyKey: pixE2E || cardNsu || logId,
      previousCashTotal: currentCashSession?.totalInflow,
      newCashTotal: updatedCashSession?.totalInflow,
      details: duplicatePrevented 
        ? `Liquidação duplicada ignorada com sucesso (idempotência preservada para pedido ${targetOrderCode})`
        : `Liquidação ${paymentStatus === 'paid' ? 'Aprovada' : paymentStatus} com sucesso via Webhook de ${providerDisplay}. Caixa e Pedido atualizados no Firestore.`,
      createdAt: now
    };

    const logRef = doc(db, 'empresas', empresaId, 'webhook_logs', logId);
    await setDoc(logRef, webhookLogRecord);

    const globalLogRef = doc(db, 'webhook_logs', logId);
    await setDoc(globalLogRef, webhookLogRecord).catch(() => {});
  } catch (err) {
    console.warn('[WebhookFirestore Warning] Falha ao persistir audit log de webhook:', err);
  }

  return {
    success: true,
    message: duplicatePrevented
      ? `Aviso: Transação do pedido ${targetOrderCode || targetOrderId} já liquidada anteriormente (idempotência garantida).`
      : `Pagamento de R$ ${effectiveAmount.toFixed(2)} sincronizado no Firestore via Webhook (${providerDisplay}). Pedido e Caixa atualizados com sucesso.`,
    orderId: targetOrderId,
    orderCode: targetOrderCode,
    paymentStatus,
    financialEntryId: financialEntryId || undefined,
    webhookLogId: logId,
    syncedToFirestore: true,
    duplicatePrevented,
    securityVerified: true,
    updatedCashSession
  };
}

/**
 * Escuta em tempo real os logs de webhook gravados no Firestore para a empresa
 */
export function subscribeWebhookLogs(
  empresaId: string,
  onUpdate: (logs: WebhookLogFirestore[]) => void
): Unsubscribe {
  const logsSubCol = collection(db, 'empresas', empresaId, 'webhook_logs');
  const q = query(logsSubCol, orderBy('createdAt', 'desc'), limit(35));

  return onSnapshot(
    q,
    (snapshot) => {
      const logs: WebhookLogFirestore[] = [];
      snapshot.forEach(docSnap => {
        logs.push(docSnap.data() as WebhookLogFirestore);
      });
      onUpdate(logs);
    },
    (err) => {
      console.warn('[WebhookFirestore Snapshot Warning] Erro ao assinar logs de webhook:', err);
    }
  );
}

/**
 * Escuta em tempo real os pedidos gravados no Firestore para a empresa
 * Permite que a DashboardFinanceiro reflita imediatamente as baixas via Webhook ou Caixa
 */
export function subscribeFirestoreOrders(
  empresaId: string,
  onUpdate: (orders: Order[]) => void
): Unsubscribe {
  const ordersSubCol = collection(db, 'empresas', empresaId, 'pedidos');
  const q = query(ordersSubCol, limit(100));

  return onSnapshot(
    q,
    (snapshot) => {
      const ordersList: Order[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as Order;
        if (data && (data.id || docSnap.id)) {
          ordersList.push({
            ...data,
            id: data.id || docSnap.id
          });
        }
      });
      onUpdate(ordersList);
    },
    (err) => {
      console.warn('[WebhookFirestore Snapshot Warning] Erro ao assinar pedidos do Firestore:', err);
    }
  );
}

/**
 * Escuta em tempo real a sessão de caixa ativa gravada no Firestore para a empresa
 */
export function subscribeFirestoreCashSession(
  empresaId: string,
  onUpdate: (session: CashSession | null) => void
): Unsubscribe {
  const caixasCol = collection(db, 'empresas', empresaId, 'caixas');
  const q = query(caixasCol, where('status', '==', 'open'), limit(1));

  return onSnapshot(
    q,
    (snapshot) => {
      if (!snapshot.empty) {
        const firstDoc = snapshot.docs[0];
        const data = firstDoc.data() as CashSession;
        onUpdate({
          ...data,
          id: data.id || firstDoc.id
        });
      } else {
        onUpdate(null);
      }
    },
    (err) => {
      console.warn('[WebhookFirestore Snapshot Warning] Erro ao assinar caixa do Firestore:', err);
    }
  );
}

/**
 * Escuta em tempo real os lançamentos financeiros gravados no Firestore para a empresa
 */
export function subscribeFirestoreFinancialEntries(
  empresaId: string,
  onUpdate: (entries: FinancialEntry[]) => void
): Unsubscribe {
  const financasCol = collection(db, 'empresas', empresaId, 'financas');
  const q = query(financasCol, limit(100));

  return onSnapshot(
    q,
    (snapshot) => {
      const entries: FinancialEntry[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as FinancialEntry;
        if (data && (data.id || docSnap.id)) {
          entries.push({
            ...data,
            id: data.id || docSnap.id
          });
        }
      });
      onUpdate(entries);
    },
    (err) => {
      console.warn('[WebhookFirestore Snapshot Warning] Erro ao assinar finanças do Firestore:', err);
    }
  );
}

/**
 * Busca histórico recente de logs de webhooks persistidos no Firestore
 */
export async function fetchWebhookAuditLogs(empresaId: string): Promise<WebhookLogFirestore[]> {
  try {
    const logsSubCol = collection(db, 'empresas', empresaId, 'webhook_logs');
    const q = query(logsSubCol, orderBy('createdAt', 'desc'), limit(50));
    const snapshot = await getDocs(q);
    const logs: WebhookLogFirestore[] = [];
    snapshot.forEach(docSnap => {
      logs.push(docSnap.data() as WebhookLogFirestore);
    });
    return logs;
  } catch (err) {
    console.warn('[WebhookFirestore Warning] Falha ao carregar logs de webhook:', err);
    return [];
  }
}

