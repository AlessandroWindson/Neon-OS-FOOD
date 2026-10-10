import { Order, OrderItem } from '../types';
import { db } from './db';

const COLLECTION = 'orders';

export class OrderService {
  /**
   * Calculate total, subtotal, discount and tax for an order
   */
  public calculateTotals(items: OrderItem[], discount: number = 0, deliveryFee: number = 0, serviceFee: number = 0) {
    const subtotal = items.reduce((acc, item) => {
      const itemPrice = item.unitPrice || 0;
      const optionsTotal = (item.selectedOptions || []).reduce((cAcc, c) => cAcc + (c.price || 0), 0);
      return acc + (itemPrice + optionsTotal) * item.quantity;
    }, 0);

    const total = Math.max(0, subtotal - discount + deliveryFee + serviceFee);

    return {
      subtotal,
      discount,
      deliveryFee,
      serviceFee,
      total,
    };
  }

  /**
   * Generate next sequential display code (e.g. #1043)
   */
  public generateNextCode(existingOrders: Order[]): string {
    const maxNumber = existingOrders.reduce((max, o) => {
      const match = o.displayCode.replace(/\D/g, '');
      const num = parseInt(match, 10);
      return !isNaN(num) && num > max ? num : max;
    }, 1000);

    return `#${maxNumber + 1}`;
  }

  /**
   * Save orders collection
   */
  public async saveOrders(orders: Order[]): Promise<void> {
    await db.set(COLLECTION, orders);
  }

  /**
   * Load orders collection
   */
  public async loadOrders(defaultOrders: Order[]): Promise<Order[]> {
    return await db.get<Order[]>(COLLECTION, defaultOrders);
  }

  /**
   * Transition order to next logical status
   */
  public getNextStatus(currentStatus: Order['status']): Order['status'] | null {
    switch (currentStatus) {
      case 'pending':
        return 'preparing';
      case 'preparing':
        return 'ready';
      case 'ready':
        return 'delivering';
      case 'delivering':
        return 'completed';
      default:
        return null;
    }
  }
}

export const orderService = new OrderService();
