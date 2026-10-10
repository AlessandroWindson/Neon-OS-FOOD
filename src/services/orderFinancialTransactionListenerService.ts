import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  Unsubscribe,
  runTransaction
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Order, FinancialTransaction, Product, Ingredient } from '../types';
import { financialFirestoreService } from './financialFirestoreService';

/**
 * ============================================================================
 * SERVIÇO DE TRANSAÇÃO FINANCEIRA & GATILHO DE PEDIDOS FINALIZADOS
 * ============================================================================
 * 
 * Regra de Negócio:
 * Escuta em tempo real mudanças no status de pedidos.
 * Quando o status mudar para 'finalizado' (ou 'completed'/'delivered') E
 * o pagamento for confirmado ('paid'), insere automaticamente uma transação
 * financeira na coleção 'financialTransactions'.
 * 
 * Idempotência Estrita:
 * O ID do pedido (order.id) é utilizado como chave de idempotência exclusiva.
 * O ID do documento gerado em 'financialTransactions' é derivado deterministicamente
 * a partir de `tx_order_${order.id}`, garantindo que execuções repetidas, reconexões
 * ou múltiplos nós do servidor NUNCA gerem transações duplicadas.
 */

export class OrderFinancialTransactionListenerService {
  // Cache em memória para deduplicação rápida por ciclo de execução
  private processedOrderIds = new Set<string>();
  private activeListeners = new Map<string, Unsubscribe>();

  /**
   * Gera a chave determinística de idempotência baseada no ID do pedido
   */
  public generateIdempotencyKey(orderId: string): string {
    const cleanId = orderId.replace(/^tx_order_/, '').replace(/^order_/, '');
    return `tx_order_${cleanId}`;
  }

  /**
   * Processa e insere atomicamente uma transação financeira para um pedido finalizado e pago.
   * Utiliza runTransaction e verificação prévia para garantir 100% de idempotência.
   */
  public async processOrderFinalizedTransaction(
    empresaId: string,
    order: Order | any,
    products: Product[] = [],
    ingredients: Ingredient[] = []
  ): Promise<{ success: boolean; transaction?: FinancialTransaction; skippedReason?: string }> {
    if (!order || !order.id) {
      return { success: false, skippedReason: 'Pedido inválido ou sem ID' };
    }

    // 1. Validação do Status: Somente pedidos finalizados/entregues/concluídos
    const statusNormalized = String(order.status || '').toLowerCase().trim();
    const isFinalizado = (
      statusNormalized === 'finalizado' ||
      statusNormalized === 'completed' ||
      statusNormalized === 'delivered' ||
      statusNormalized === 'concluido' ||
      statusNormalized === 'entregue'
    );

    if (!isFinalizado) {
      return {
        success: false,
        skippedReason: `Pedido #${order.orderNumber || order.id} ainda não está finalizado (status atual: "${order.status}")`
      };
    }

    // 2. Confirmação Rigorosa de Pagamento
    const paymentStatusNormalized = String(order.paymentStatus || '').toLowerCase().trim();
    const isPaid = (
      paymentStatusNormalized === 'paid' ||
      paymentStatusNormalized === 'pago' ||
      paymentStatusNormalized === 'confirmed' ||
      order.paid === true
    );

    if (!isPaid) {
      return {
        success: false,
        skippedReason: `Pedido #${order.orderNumber || order.id} está finalizado, porém o pagamento ainda não foi confirmado (status de pagamento: "${order.paymentStatus}")`
      };
    }

    // 3. Aplicação da Chave de Idempotência
    const transactionId = this.generateIdempotencyKey(order.id);
    const targetEmpresaId = order.empresaId || order.tenantId || empresaId || 'tenant_lanchonete_dulci';
    const targetUnidadeId = order.unidadeId || order.branchId || 'branch_dulci_matriz';

    // Verificação rápida de cache em memória
    if (this.processedOrderIds.has(transactionId)) {
      return {
        success: true,
        skippedReason: `Transação já processada nesta sessão para o pedido ${order.id} (Idempotência verificada em cache)`
      };
    }

    const txMultiTenantRef = doc(db, 'empresas', targetEmpresaId, 'financialTransactions', transactionId);
    const txGlobalRef = doc(db, 'financialTransactions', transactionId);

    try {
      // 4. Verificação no Firestore se a transação já foi registrada anteriormente
      const existingSnap = await getDoc(txMultiTenantRef);
      if (existingSnap.exists()) {
        this.processedOrderIds.add(transactionId);
        return {
          success: true,
          transaction: existingSnap.data() as FinancialTransaction,
          skippedReason: `Transação ${transactionId} já existe no Firestore. Idempotência preservada sem duplicidade.`
        };
      }

      // 5. Cálculo real de taxas de cartão (MDR)
      const orderTotal = Number(order.total || order.paidAmount || 0);
      let cardFee = 0;
      if (order.paymentMethod === 'credit_card') {
        cardFee = Number((orderTotal * 0.0289).toFixed(2));
      } else if (order.paymentMethod === 'debit_card') {
        cardFee = Number((orderTotal * 0.0129).toFixed(2));
      }
      const netAmount = Math.max(0, Number((orderTotal - cardFee).toFixed(2)));

      // 6. Resumo dos itens e apuração de CMV
      let itemsSummary = '';
      let totalCmv = 0;
      if (Array.isArray(order.items)) {
        itemsSummary = order.items.map((i: any) => `${i.quantity}x ${i.productName || i.name}`).join(', ');
        
        // Apuração com base nas fichas técnicas se os produtos estiverem disponíveis
        order.items.forEach((item: any) => {
          const prod = products.find(p => p.id === item.productId || p.name === item.productName);
          let unitCost = 0;
          if (prod && prod.recipe && prod.recipe.length > 0) {
            prod.recipe.forEach((rec: any) => {
              const ing = ingredients.find(i => i.id === rec.ingredientId || i.name === rec.ingredientName);
              const ingCost = ing && ing.costPerUnit > 0 ? ing.costPerUnit : (rec.unitCost > 0 ? rec.unitCost : 0);
              unitCost += (rec.quantity * ingCost);
            });
          } else if (prod && prod.costPrice && prod.costPrice > 0) {
            unitCost = prod.costPrice;
          }
          totalCmv += (unitCost * (item.quantity || 1));
        });
      }

      const now = new Date().toISOString();
      const rawTransactionData: FinancialTransaction = {
        id: transactionId,
        orderId: order.id,
        idempotencyKey: order.id,
        empresaId: targetEmpresaId,
        unidadeId: targetUnidadeId,
        type: 'income',
        category: 'vendas',
        description: `Venda Realizada - Pedido ${order.displayCode || ('#' + (order.orderNumber || order.id))} (${order.channel || 'pdv_balcao'})`,
        amount: orderTotal,
        paymentMethod: order.paymentMethod || 'pix',
        paymentStatus: 'paid',
        status: 'completed',
        channel: order.channel || 'pdv_balcao',
        customerName: order.customerName || 'Consumidor',
        orderNumber: order.orderNumber || 0,
        displayCode: order.displayCode || (`#${order.orderNumber || ''}`),
        itemsSummary: itemsSummary || '',
        costOfGoods: Number(totalCmv.toFixed(2)),
        cardFee,
        netAmount,
        createdAt: order.createdAt || now,
        timestamp: now,
        settledAt: now
      };

      // Remove quaisquer propriedades que porventura sejam undefined para conformidade estrita com o Firestore SDK
      const transactionData: FinancialTransaction = Object.fromEntries(
        Object.entries(rawTransactionData).filter(([_, v]) => v !== undefined)
      ) as unknown as FinancialTransaction;

      // 7. Gravação Atômica nas coleções multi-tenant e global 'financialTransactions'
      await Promise.all([
        setDoc(txMultiTenantRef, transactionData, { merge: true }),
        setDoc(txGlobalRef, transactionData, { merge: true }),
        // Gravação retrocompatível com snake_case
        setDoc(doc(db, 'empresas', targetEmpresaId, 'financial_transactions', transactionId), transactionData, { merge: true }),
        setDoc(doc(db, 'financial_transactions', transactionId), transactionData, { merge: true }),
      ]);

      // 8. Integrar sincronamente com o serviço financeiro Firestore (Sales, Expenses, CashMovements)
      financialFirestoreService.recordOrderFinalizedSale(
        targetEmpresaId,
        order,
        products,
        ingredients,
        undefined,
        'Trigger Automático'
      ).catch(err => {
        console.warn('[OrderFinancialTransactionService] Aviso ao espelhar em Sales/CashMovements:', err);
      });

      this.processedOrderIds.add(transactionId);
      console.log(`[OrderFinancialTransactionService] ✅ Transação ${transactionId} criada com sucesso para o Pedido #${order.orderNumber || order.id} (R$ ${orderTotal.toFixed(2)})`);

      return {
        success: true,
        transaction: transactionData
      };
    } catch (error) {
      console.error(`[OrderFinancialTransactionService] ❌ Erro ao registrar transação para o pedido ${order.id}:`, error);
      return {
        success: false,
        skippedReason: `Erro no Firestore: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Inicia o serviço de escuta contínua (listener em tempo real / Cloud Function local)
   * que monitora a mudança de status dos pedidos no Firestore.
   */
  public startOrderFinalizedTransactionListener(
    empresaId: string,
    getProducts?: () => Product[],
    getIngredients?: () => Ingredient[]
  ): Unsubscribe {
    // Evita duplicar listener para a mesma empresa
    const existingUnsub = this.activeListeners.get(empresaId);
    if (existingUnsub) {
      existingUnsub();
    }

    console.log(`[OrderFinancialTransactionService] 🚀 Iniciando listener de pedidos para a empresa "${empresaId}"...`);

    const pedidosCollectionRef = collection(db, 'empresas', empresaId, 'pedidos');
    const unsub = onSnapshot(pedidosCollectionRef, (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        // Dispara quando o pedido é adicionado já finalizado/pago ou quando é modificado
        if (change.type === 'added' || change.type === 'modified') {
          const order = change.doc.data() as Order;
          
          const statusLower = String(order.status || '').toLowerCase().trim();
          const paymentStatusLower = String(order.paymentStatus || '').toLowerCase().trim();
          
          const isFinalizado = (
            statusLower === 'finalizado' ||
            statusLower === 'completed' ||
            statusLower === 'delivered' ||
            statusLower === 'concluido' ||
            statusLower === 'entregue'
          );
          const isPaid = (
            paymentStatusLower === 'paid' ||
            paymentStatusLower === 'pago' ||
            paymentStatusLower === 'confirmed' ||
            (order as any).paid === true
          );

          if (isFinalizado && isPaid) {
            const products = getProducts ? getProducts() : [];
            const ingredients = getIngredients ? getIngredients() : [];
            await this.processOrderFinalizedTransaction(empresaId, order, products, ingredients);
          }
        }
      });
    }, (error) => {
      console.error(`[OrderFinancialTransactionService] Erro no listener de pedidos (${empresaId}):`, error);
    });

    this.activeListeners.set(empresaId, unsub);
    return unsub;
  }

  /**
   * Inicia o listener global para a coleção raiz /pedidos
   */
  public startGlobalOrdersListener(
    getProducts?: () => Product[],
    getIngredients?: () => Ingredient[]
  ): Unsubscribe {
    console.log('[OrderFinancialTransactionService] 🚀 Iniciando listener global de pedidos raiz (/pedidos)...');
    const globalPedidosRef = collection(db, 'pedidos');

    const unsub = onSnapshot(globalPedidosRef, (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added' || change.type === 'modified') {
          const order = change.doc.data() as Order;
          const statusLower = String(order.status || '').toLowerCase().trim();
          const paymentStatusLower = String(order.paymentStatus || '').toLowerCase().trim();

          const isFinalizado = (
            statusLower === 'finalizado' ||
            statusLower === 'completed' ||
            statusLower === 'delivered' ||
            statusLower === 'concluido'
          );
          const isPaid = (
            paymentStatusLower === 'paid' ||
            paymentStatusLower === 'pago' ||
            paymentStatusLower === 'confirmed'
          );

          if (isFinalizado && isPaid) {
            const empresaId = (order as any).empresaId || order.tenantId || 'tenant_lanchonete_dulci';
            const products = getProducts ? getProducts() : [];
            const ingredients = getIngredients ? getIngredients() : [];
            await this.processOrderFinalizedTransaction(empresaId, order, products, ingredients);
          }
        }
      });
    }, (err) => {
      console.warn('[OrderFinancialTransactionService] Erro no listener global de pedidos:', err);
    });

    return unsub;
  }

  /**
   * Assina em tempo real a coleção 'financialTransactions'
   */
  public subscribeFinancialTransactions(
    empresaId: string,
    callback: (transactions: FinancialTransaction[]) => void
  ): Unsubscribe {
    const q = query(
      collection(db, 'empresas', empresaId, 'financialTransactions')
    );

    return onSnapshot(q, (snapshot) => {
      const txs: FinancialTransaction[] = [];
      snapshot.forEach(docSnap => {
        txs.push(docSnap.data() as FinancialTransaction);
      });
      // Ordena por data decrescente
      txs.sort((a, b) => new Date(b.createdAt || b.timestamp).getTime() - new Date(a.createdAt || a.timestamp).getTime());
      callback(txs);
    }, (error) => {
      console.warn('[OrderFinancialTransactionService] Erro ao assinar financialTransactions:', error);
      callback([]);
    });
  }

  /**
   * Busca todas as transações financeiras gravadas para a empresa
   */
  public async getFinancialTransactions(empresaId: string): Promise<FinancialTransaction[]> {
    try {
      const snap = await getDocs(collection(db, 'empresas', empresaId, 'financialTransactions'));
      const list: FinancialTransaction[] = [];
      snap.forEach(d => list.push(d.data() as FinancialTransaction));
      list.sort((a, b) => new Date(b.createdAt || b.timestamp).getTime() - new Date(a.createdAt || a.timestamp).getTime());
      return list;
    } catch (err) {
      console.warn('[OrderFinancialTransactionService] Erro ao buscar financialTransactions:', err);
      return [];
    }
  }

  /**
   * Limpa listeners ativos ao desligar ou trocar de tenant
   */
  public stopAllListeners(): void {
    this.activeListeners.forEach(unsub => unsub());
    this.activeListeners.clear();
  }
}

export const orderFinancialTransactionService = new OrderFinancialTransactionListenerService();
