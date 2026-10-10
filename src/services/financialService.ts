import { CashSession, FinancialEntry, Order } from '../types';
import { db } from './db';

const CASH_COLLECTION = 'cash_sessions';
const FINANCIAL_COLLECTION = 'financial_entries';

export class FinancialService {
  public async loadCashSession(defaultSession: CashSession | null): Promise<CashSession | null> {
    return await db.get<CashSession | null>(CASH_COLLECTION, defaultSession);
  }

  public async saveCashSession(session: CashSession | null): Promise<void> {
    await db.set(CASH_COLLECTION, session);
  }

  public async loadEntries(defaultEntries: FinancialEntry[]): Promise<FinancialEntry[]> {
    return await db.get<FinancialEntry[]>(FINANCIAL_COLLECTION, defaultEntries);
  }

  public async saveEntries(entries: FinancialEntry[]): Promise<void> {
    await db.set(FINANCIAL_COLLECTION, entries);
  }

  public calculateSummary(entries: FinancialEntry[], orders: Order[]) {
    const revenueOrders = orders
      .filter(o => o.status !== 'canceled')
      .reduce((sum, o) => sum + (o.total || 0), 0);

    const expenses = entries
      .filter(e => e.type === 'expense' && e.status === 'paid')
      .reduce((sum, e) => sum + e.amount, 0);

    const pendingExpenses = entries
      .filter(e => e.type === 'expense' && e.status === 'pending')
      .reduce((sum, e) => sum + e.amount, 0);

    const netProfit = revenueOrders - expenses;
    const profitMargin = revenueOrders > 0 ? (netProfit / revenueOrders) * 100 : 0;

    return {
      grossRevenue: revenueOrders,
      totalExpenses: expenses,
      pendingExpenses,
      netProfit,
      profitMargin,
    };
  }
}

export const financialService = new FinancialService();
