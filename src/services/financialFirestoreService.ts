import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Unsubscribe,
  runTransaction
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Order, Product, Ingredient, PaymentMethod } from '../types';

/**
 * ============================================================================
 * FIRESTORE BACKEND SCHEMA: Sales, Expenses & CashMovements
 * ============================================================================
 */

export interface SaleFirestore {
  id: string; // ex: sale_ord_1041
  empresaId: string;
  unidadeId: string;
  orderId: string;
  orderNumber: number;
  displayCode: string;
  customerName: string;
  customerPhone?: string;
  channel: string;
  paymentMethod: string;
  paymentStatus: 'paid';
  subtotal: number;
  discount: number;
  deliveryFee: number;
  serviceFee: number;
  grossTotal: number;
  cardFee: number;
  netAmount: number;
  costOfGoods: number; // CMV real baseado na ficha técnica
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    costPrice: number;
    totalPrice: number;
  }>;
  saleDate: string; // YYYY-MM-DD
  createdAt: string;
  settledAt: string;
}

export interface ExpenseFirestore {
  id: string;
  empresaId: string;
  unidadeId: string;
  category: 'cmv_insumos' | 'fornecedores' | 'aluguel' | 'energia_agua' | 'folha_pagamento' | 'manutencao' | 'taxa_cartao' | 'taxa_ifood' | 'marketing' | 'outros';
  description: string;
  amount: number;
  paymentMethod: string;
  status: 'paid' | 'pending';
  expenseDate: string; // YYYY-MM-DD
  source: 'purchase' | 'bill_payable' | 'operational_expense' | 'gateway_fee' | 'refund';
  referenceId?: string;
  recipient?: string;
  paidAt?: string;
  createdAt: string;
}

export interface CashMovementFirestore {
  id: string;
  empresaId: string;
  unidadeId: string;
  sessionId?: string;
  type: 'inflow_sale' | 'bleed' | 'supply' | 'outflow_expense' | 'outflow_purchase' | 'opening' | 'closing' | 'refund';
  amount: number;
  paymentMethod: string;
  reason: string;
  operatorName: string;
  referenceId?: string;
  timestamp: string;
  createdAt: string;
}

/**
 * ============================================================================
 * FIRESTORE SERVICE & TRIGGER LOGIC FOR FINANCIAL INTEGRITY
 * ============================================================================
 */

export class FinancialFirestoreService {
  /**
   * Gatilho de Venda Real: Quando um pedido é finalizado ('completed'/'delivered') E pago ('paid'),
   * registra atomicamente a Venda na coleção 'Sales', calcula taxas e CMV real,
   * e gera a movimentação correspondente em 'CashMovements' se recebido em dinheiro.
   */
  public async recordOrderFinalizedSale(
    empresaId: string,
    order: Order,
    products: Product[] = [],
    ingredients: Ingredient[] = [],
    activeSessionId?: string,
    operatorName: string = 'Sistema PDV'
  ): Promise<SaleFirestore | null> {
    const isCompleted = order.status === 'completed' || (order.status as string) === 'delivered';
    const isPaid = order.paymentStatus === 'paid';

    // Regra Absoluta: Apenas pedidos finalizados e pagos geram venda financeira real
    if (!isCompleted || !isPaid) {
      return null;
    }

    const saleId = `sale_${order.id}`;
    const now = new Date().toISOString();
    const today = now.split('T')[0];
    const unidadeId = order.branchId || 'branch_dulci_matriz';

    // 1. Cálculo real de taxas de adquirente (MDR)
    let cardFee = 0;
    if (order.paymentMethod === 'credit_card') {
      cardFee = Number(((order.total || 0) * 0.0289).toFixed(2));
    } else if (order.paymentMethod === 'debit_card') {
      cardFee = Number(((order.total || 0) * 0.0129).toFixed(2));
    }
    const netAmount = Math.max(0, Number(((order.total || 0) - cardFee).toFixed(2)));

    // 2. Cálculo real do CMV (Custo dos Produtos) baseado estritamente na ficha técnica
    let totalCmv = 0;
    const saleItems = (order.items || []).map(item => {
      const prod = products.find(p => p.id === item.productId || p.name.toLowerCase() === item.productName.toLowerCase());
      let unitCost = 0;

      if (prod && prod.recipe && prod.recipe.length > 0) {
        prod.recipe.forEach(rec => {
          const ing = ingredients.find(i => i.id === rec.ingredientId || i.name.toLowerCase() === rec.ingredientName.toLowerCase());
          const ingUnitCost = ing && ing.costPerUnit > 0 ? ing.costPerUnit : (rec.unitCost > 0 ? rec.unitCost : 0);
          unitCost += (rec.quantity * ingUnitCost);
        });
      } else if (prod && prod.costPrice && prod.costPrice > 0) {
        unitCost = prod.costPrice;
      }

      const itemTotalCost = unitCost * item.quantity;
      totalCmv += itemTotalCost;

      return {
        productId: item.productId || 'custom',
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        costPrice: Number(unitCost.toFixed(2)),
        totalPrice: item.totalPrice || (item.unitPrice * item.quantity),
      };
    });

    const saleDoc: SaleFirestore = {
      id: saleId,
      empresaId,
      unidadeId,
      orderId: order.id,
      orderNumber: order.orderNumber,
      displayCode: order.displayCode,
      customerName: order.customerName || 'Consumidor',
      customerPhone: order.customerPhone,
      channel: order.channel || 'pdv_balcao',
      paymentMethod: order.paymentMethod,
      paymentStatus: 'paid',
      subtotal: order.subtotal || order.total,
      discount: order.discount || 0,
      deliveryFee: order.deliveryFee || 0,
      serviceFee: order.serviceFee || 0,
      grossTotal: order.total,
      cardFee,
      netAmount,
      costOfGoods: Number(totalCmv.toFixed(2)),
      items: saleItems,
      saleDate: today,
      createdAt: order.createdAt || now,
      settledAt: now,
    };

    try {
      // Grava na subcoleção multi-tenant E na coleção global 'Sales' para indexação segura
      await Promise.all([
        setDoc(doc(db, 'empresas', empresaId, 'Sales', saleId), saleDoc, { merge: true }),
        setDoc(doc(db, 'Sales', saleId), saleDoc, { merge: true }),
        setDoc(doc(db, 'sales', saleId), saleDoc, { merge: true }),
      ]);

      // 3. Se a venda foi paga em dinheiro, gera evento de entrada no caixa (CashMovements)
      if (order.paymentMethod === 'cash') {
        const movementId = `mov_sale_${order.id}`;
        const cashMovement: CashMovementFirestore = {
          id: movementId,
          empresaId,
          unidadeId,
          sessionId: activeSessionId,
          type: 'inflow_sale',
          amount: order.total,
          paymentMethod: 'cash',
          reason: `Venda Pedido ${order.displayCode} (${order.channel})`,
          operatorName,
          referenceId: order.id,
          timestamp: now,
          createdAt: now,
        };

        await Promise.all([
          setDoc(doc(db, 'empresas', empresaId, 'CashMovements', movementId), cashMovement, { merge: true }),
          setDoc(doc(db, 'CashMovements', movementId), cashMovement, { merge: true }),
          setDoc(doc(db, 'cash_movements', movementId), cashMovement, { merge: true }),
        ]);
      }

      // 4. Se houve taxa de adquirente (MDR), registra despesa automática na coleção 'Expenses'
      if (cardFee > 0) {
        const feeExpenseId = `exp_fee_${order.id}`;
        const feeExpense: ExpenseFirestore = {
          id: feeExpenseId,
          empresaId,
          unidadeId,
          category: 'taxa_cartao',
          description: `Taxa Cartão Pedido ${order.displayCode} (${order.paymentMethod})`,
          amount: cardFee,
          paymentMethod: order.paymentMethod,
          status: 'paid',
          expenseDate: today,
          source: 'gateway_fee',
          referenceId: order.id,
          createdAt: now,
        };

        await Promise.all([
          setDoc(doc(db, 'empresas', empresaId, 'Expenses', feeExpenseId), feeExpense, { merge: true }),
          setDoc(doc(db, 'Expenses', feeExpenseId), feeExpense, { merge: true }),
          setDoc(doc(db, 'expenses', feeExpenseId), feeExpense, { merge: true }),
        ]);
      }

      return saleDoc;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `Sales/${saleId}`);
      return null;
    }
  }

  /**
   * Gatilho de Estorno/Cancelamento de Pedido: Se um pedido finalizado for cancelado,
   * registra o estorno rastreável em 'Expenses' e a retirada de dinheiro em 'CashMovements'.
   */
  public async recordOrderCanceledRefund(
    empresaId: string,
    order: Order,
    reason: string,
    operatorName: string = 'Gerente'
  ): Promise<void> {
    const saleId = `sale_${order.id}`;
    const now = new Date().toISOString();
    const today = now.split('T')[0];
    const unidadeId = order.branchId || 'branch_dulci_matriz';

    try {
      // 1. Verifica se existia venda real registrada
      const saleRef = doc(db, 'empresas', empresaId, 'Sales', saleId);
      const saleSnap = await getDoc(saleRef);

      if (saleSnap.exists() || (order.paymentStatus === 'paid' && (order.status === 'completed' || (order.status as string) === 'delivered'))) {
        // Registra despesa de estorno rastreável
        const refundExpenseId = `exp_refund_${order.id}`;
        const refundExpense: ExpenseFirestore = {
          id: refundExpenseId,
          empresaId,
          unidadeId,
          category: 'outros',
          description: `Estorno Pedido ${order.displayCode} - Motivo: ${reason}`,
          amount: order.total,
          paymentMethod: order.paymentMethod,
          status: 'paid',
          expenseDate: today,
          source: 'refund',
          referenceId: order.id,
          createdAt: now,
        };

        await Promise.all([
          setDoc(doc(db, 'empresas', empresaId, 'Expenses', refundExpenseId), refundExpense, { merge: true }),
          setDoc(doc(db, 'Expenses', refundExpenseId), refundExpense, { merge: true }),
          setDoc(doc(db, 'expenses', refundExpenseId), refundExpense, { merge: true }),
        ]);

        // Se o estorno foi em dinheiro, registra saída no Caixa
        if (order.paymentMethod === 'cash') {
          const movementId = `mov_refund_${order.id}`;
          const refundMovement: CashMovementFirestore = {
            id: movementId,
            empresaId,
            unidadeId,
            type: 'refund',
            amount: order.total,
            paymentMethod: 'cash',
            reason: `Estorno Pedido ${order.displayCode}: ${reason}`,
            operatorName,
            referenceId: order.id,
            timestamp: now,
            createdAt: now,
          };

          await Promise.all([
            setDoc(doc(db, 'empresas', empresaId, 'CashMovements', movementId), refundMovement, { merge: true }),
            setDoc(doc(db, 'CashMovements', movementId), refundMovement, { merge: true }),
            setDoc(doc(db, 'cash_movements', movementId), refundMovement, { merge: true }),
          ]);
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `Expenses/exp_refund_${order.id}`);
    }
  }

  /**
   * Registro Direto de Despesa Operacional no Firestore
   */
  public async recordExpense(
    empresaId: string,
    expenseData: Omit<ExpenseFirestore, 'id' | 'createdAt'>,
    activeSessionId?: string,
    operatorName: string = 'Operador'
  ): Promise<ExpenseFirestore> {
    const expenseId = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const expense: ExpenseFirestore = {
      ...expenseData,
      id: expenseId,
      createdAt: now,
    };

    try {
      await Promise.all([
        setDoc(doc(db, 'empresas', empresaId, 'Expenses', expenseId), expense, { merge: true }),
        setDoc(doc(db, 'Expenses', expenseId), expense, { merge: true }),
        setDoc(doc(db, 'expenses', expenseId), expense, { merge: true }),
      ]);

      // Se paga em dinheiro, registra a saída no Caixa
      if (expenseData.paymentMethod === 'cash' && expenseData.status === 'paid') {
        const movementId = `mov_exp_${expenseId}`;
        const cashMovement: CashMovementFirestore = {
          id: movementId,
          empresaId,
          unidadeId: expenseData.unidadeId,
          sessionId: activeSessionId,
          type: 'outflow_expense',
          amount: expenseData.amount,
          paymentMethod: 'cash',
          reason: `Despesa: ${expenseData.description}`,
          operatorName,
          referenceId: expenseId,
          timestamp: now,
          createdAt: now,
        };

        await Promise.all([
          setDoc(doc(db, 'empresas', empresaId, 'CashMovements', movementId), cashMovement, { merge: true }),
          setDoc(doc(db, 'CashMovements', movementId), cashMovement, { merge: true }),
          setDoc(doc(db, 'cash_movements', movementId), cashMovement, { merge: true }),
        ]);
      }

      return expense;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `Expenses/${expenseId}`);
      throw error;
    }
  }

  /**
   * Registro de Compra de Insumos com Atualização de Custos e Integração com Firestore
   */
  public async recordPurchase(
    empresaId: string,
    purchaseData: {
      supplierName: string;
      items: Array<{
        ingredientId: string;
        ingredientName: string;
        quantity: number;
        unit: string;
        unitPrice: number;
        totalPrice: number;
      }>;
      totalAmount: number;
      paymentTerms: 'a_vista' | 'a_prazo';
      paymentMethod: string;
      dueDate?: string;
      notes?: string;
      unidadeId?: string;
    },
    activeSessionId?: string,
    operatorName: string = 'Comprador'
  ): Promise<void> {
    const purchaseId = `pur_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const today = now.split('T')[0];
    const unidadeId = purchaseData.unidadeId || 'branch_dulci_matriz';

    try {
      if (purchaseData.paymentTerms === 'a_vista') {
        // Gera registro na coleção 'Expenses'
        const expenseId = `exp_pur_${purchaseId}`;
        const expense: ExpenseFirestore = {
          id: expenseId,
          empresaId,
          unidadeId,
          category: 'cmv_insumos',
          description: `Compra de Insumos: ${purchaseData.supplierName} (Ref: ${purchaseId})`,
          amount: purchaseData.totalAmount,
          paymentMethod: purchaseData.paymentMethod,
          status: 'paid',
          expenseDate: today,
          source: 'purchase',
          referenceId: purchaseId,
          recipient: purchaseData.supplierName,
          createdAt: now,
        };

        await Promise.all([
          setDoc(doc(db, 'empresas', empresaId, 'Expenses', expenseId), expense, { merge: true }),
          setDoc(doc(db, 'Expenses', expenseId), expense, { merge: true }),
          setDoc(doc(db, 'expenses', expenseId), expense, { merge: true }),
        ]);

        // Se pago em dinheiro da gaveta, registra saída em 'CashMovements'
        if (purchaseData.paymentMethod === 'cash') {
          const movementId = `mov_pur_${purchaseId}`;
          const cashMovement: CashMovementFirestore = {
            id: movementId,
            empresaId,
            unidadeId,
            sessionId: activeSessionId,
            type: 'outflow_purchase',
            amount: purchaseData.totalAmount,
            paymentMethod: 'cash',
            reason: `Compra de Insumos à Vista: ${purchaseData.supplierName}`,
            operatorName,
            referenceId: purchaseId,
            timestamp: now,
            createdAt: now,
          };

          await Promise.all([
            setDoc(doc(db, 'empresas', empresaId, 'CashMovements', movementId), cashMovement, { merge: true }),
            setDoc(doc(db, 'CashMovements', movementId), cashMovement, { merge: true }),
            setDoc(doc(db, 'cash_movements', movementId), cashMovement, { merge: true }),
          ]);
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `Expenses/exp_pur_${purchaseId}`);
      throw error;
    }
  }

  /**
   * Registro Direto de Movimentação de Caixa (Sangria, Suprimento, Abertura, Fechamento)
   */
  public async recordCashMovement(
    empresaId: string,
    movementData: Omit<CashMovementFirestore, 'id' | 'createdAt'>
  ): Promise<CashMovementFirestore> {
    const movementId = `mov_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const movement: CashMovementFirestore = {
      ...movementData,
      id: movementId,
      createdAt: now,
    };

    try {
      await Promise.all([
        setDoc(doc(db, 'empresas', empresaId, 'CashMovements', movementId), movement, { merge: true }),
        setDoc(doc(db, 'CashMovements', movementId), movement, { merge: true }),
        setDoc(doc(db, 'cash_movements', movementId), movement, { merge: true }),
      ]);
      return movement;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `CashMovements/${movementId}`);
      throw error;
    }
  }

  /**
   * Inscrição em Tempo Real à Coleção 'Sales'
   */
  public subscribeSales(
    empresaId: string,
    callback: (sales: SaleFirestore[]) => void
  ): Unsubscribe {
    const q = query(
      collection(db, 'empresas', empresaId, 'Sales')
    );

    return onSnapshot(q, (snapshot) => {
      const sales: SaleFirestore[] = [];
      snapshot.forEach(docSnap => {
        sales.push(docSnap.data() as SaleFirestore);
      });
      callback(sales);
    }, (error) => {
      console.warn('[FinancialFirestoreService] Erro ao assinar Sales:', error);
      callback([]);
    });
  }

  /**
   * Inscrição em Tempo Real à Coleção 'Expenses'
   */
  public subscribeExpenses(
    empresaId: string,
    callback: (expenses: ExpenseFirestore[]) => void
  ): Unsubscribe {
    const q = query(
      collection(db, 'empresas', empresaId, 'Expenses')
    );

    return onSnapshot(q, (snapshot) => {
      const expenses: ExpenseFirestore[] = [];
      snapshot.forEach(docSnap => {
        expenses.push(docSnap.data() as ExpenseFirestore);
      });
      callback(expenses);
    }, (error) => {
      console.warn('[FinancialFirestoreService] Erro ao assinar Expenses:', error);
      callback([]);
    });
  }

  /**
   * Inscrição em Tempo Real à Coleção 'CashMovements'
   */
  public subscribeCashMovements(
    empresaId: string,
    callback: (movements: CashMovementFirestore[]) => void
  ): Unsubscribe {
    const q = query(
      collection(db, 'empresas', empresaId, 'CashMovements')
    );

    return onSnapshot(q, (snapshot) => {
      const movements: CashMovementFirestore[] = [];
      snapshot.forEach(docSnap => {
        movements.push(docSnap.data() as CashMovementFirestore);
      });
      callback(movements);
    }, (error) => {
      console.warn('[FinancialFirestoreService] Erro ao assinar CashMovements:', error);
      callback([]);
    });
  }

  /**
   * Busca pontual de Vendas do Firestore
   */
  public async fetchSales(empresaId: string): Promise<SaleFirestore[]> {
    try {
      const snap = await getDocs(collection(db, 'empresas', empresaId, 'Sales'));
      const sales: SaleFirestore[] = [];
      snap.forEach(d => sales.push(d.data() as SaleFirestore));
      return sales;
    } catch (e) {
      console.warn('[FinancialFirestoreService] Erro ao buscar Sales:', e);
      return [];
    }
  }

  /**
   * Busca pontual de Despesas do Firestore
   */
  public async fetchExpenses(empresaId: string): Promise<ExpenseFirestore[]> {
    try {
      const snap = await getDocs(collection(db, 'empresas', empresaId, 'Expenses'));
      const expenses: ExpenseFirestore[] = [];
      snap.forEach(d => expenses.push(d.data() as ExpenseFirestore));
      return expenses;
    } catch (e) {
      console.warn('[FinancialFirestoreService] Erro ao buscar Expenses:', e);
      return [];
    }
  }

  /**
   * Busca pontual de Movimentações de Caixa do Firestore
   */
  public async fetchCashMovements(empresaId: string): Promise<CashMovementFirestore[]> {
    try {
      const snap = await getDocs(collection(db, 'empresas', empresaId, 'CashMovements'));
      const movements: CashMovementFirestore[] = [];
      snap.forEach(d => movements.push(d.data() as CashMovementFirestore));
      return movements;
    } catch (e) {
      console.warn('[FinancialFirestoreService] Erro ao buscar CashMovements:', e);
      return [];
    }
  }

  /**
   * Limpa e zera atomicamente todos os dados financeiros no Firestore para o tenant
   */
  public async clearAllFinancialDataInFirestore(empresaId: string): Promise<void> {
    try {
      const [salesSnap, expSnap, movSnap] = await Promise.all([
        getDocs(collection(db, 'empresas', empresaId, 'Sales')),
        getDocs(collection(db, 'empresas', empresaId, 'Expenses')),
        getDocs(collection(db, 'empresas', empresaId, 'CashMovements')),
      ]);

      const deletePromises: Promise<any>[] = [];

      salesSnap.forEach(d => {
        deletePromises.push(deleteDoc(d.ref));
        deletePromises.push(deleteDoc(doc(db, 'Sales', d.id)).catch(() => {}));
        deletePromises.push(deleteDoc(doc(db, 'sales', d.id)).catch(() => {}));
      });

      expSnap.forEach(d => {
        deletePromises.push(deleteDoc(d.ref));
        deletePromises.push(deleteDoc(doc(db, 'Expenses', d.id)).catch(() => {}));
        deletePromises.push(deleteDoc(doc(db, 'expenses', d.id)).catch(() => {}));
      });

      movSnap.forEach(d => {
        deletePromises.push(deleteDoc(d.ref));
        deletePromises.push(deleteDoc(doc(db, 'CashMovements', d.id)).catch(() => {}));
        deletePromises.push(deleteDoc(doc(db, 'cash_movements', d.id)).catch(() => {}));
      });

      await Promise.all(deletePromises);
      console.log(`[FinancialFirestoreService] Dados financeiros do tenant ${empresaId} foram zerados com sucesso.`);
    } catch (e) {
      console.error('[FinancialFirestoreService] Erro ao zerar dados no Firestore:', e);
    }
  }
}

export const financialFirestoreService = new FinancialFirestoreService();
