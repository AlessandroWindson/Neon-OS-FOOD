import { Product, BCGClassification } from '../types';
import { db } from './db';

const COLLECTION = 'products';

export class ProductService {
  public async loadProducts(defaultProducts: Product[]): Promise<Product[]> {
    return await db.get<Product[]>(COLLECTION, defaultProducts);
  }

  public async saveProducts(products: Product[]): Promise<void> {
    await db.set(COLLECTION, products);
  }

  /**
   * Recalculate margins and CMV for a product
   */
  public calculateMetrics(product: Product, avgVolume: number, avgMargin: number): Product {
    const price = Number(product.price || 0);
    const cost = Number(product.costPrice || 0);
    const marginReais = Math.max(0, price - cost);
    const marginPercent = price > 0 ? (marginReais / price) * 100 : 0;
    const cmvPercent = price > 0 ? (cost / price) * 100 : 0;
    const volume = Number(product.salesVolume30Days ?? product.salesCountMonth ?? 0);

    const isHighVol = volume >= avgVolume;
    const isHighMargin = marginReais >= avgMargin;

    let classification: BCGClassification = 'star';
    if (isHighVol && isHighMargin) classification = 'star';
    else if (isHighVol && !isHighMargin) classification = 'cash_cow';
    else if (!isHighVol && isHighMargin) classification = 'puzzle';
    else classification = 'dog';

    return {
      ...product,
      profitMarginPercent: marginPercent,
      marginPercent: marginPercent,
      cmvPercent: cmvPercent,
      bcgClassification: classification,
    };
  }
}

export const productService = new ProductService();
