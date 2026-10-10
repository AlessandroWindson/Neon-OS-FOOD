import { Product, BCGClassification } from '../types';

export type ElasticityType = 'inelastic' | 'elastic' | 'unitary';
export type OptimizationStrategy = 'conservative' | 'balanced' | 'aggressive';

export interface ElasticityProfile {
  productId: string;
  productName: string;
  category: string;
  classification: BCGClassification;
  imageUrl: string;
  currentPrice: number;
  currentCost: number;
  currentCmv: number;
  currentVolume: number;
  currentMarginReais: number;
  currentMarginPercent: number;
  currentRevenueMonthly: number;
  currentProfitMonthly: number;
  
  // Elasticity metrics
  elasticityCoefficient: number; // Ep (e.g. -0.42 for inelastic star, -1.85 for elastic dog)
  elasticityType: ElasticityType;
  elasticityLabel: string;
  elasticityRationale: string;
  
  // Recommendations
  suggestedPriceDelta: number;
  suggestedNewPrice: number;
  priceDeltaPercent: number;
  
  // Projections using Ep = (%ΔQ) / (%ΔP) => %ΔQ = Ep * %ΔP
  projectedVolumePercentChange: number;
  projectedNewVolume: number;
  projectedNewMarginReais: number;
  projectedNewMarginPercent: number;
  projectedNewCmv: number;
  projectedNewRevenueMonthly: number;
  projectedNewProfitMonthly: number;
  projectedProfitDeltaMonthly: number;
  projectedProfitGainPercent: number;
  
  strategicRecommendation: string;
  badgeAction: string;
}

export interface ElasticityPortfolioSummary {
  totalItemsTargeted: number;
  starItemsCount: number;
  dogItemsCount: number;
  currentTotalProfitMonthly: number;
  projectedTotalProfitMonthly: number;
  totalMonthlyGainReais: number;
  totalMonthlyGainPercent: number;
  avgPriceChangePercent: number;
  avgVolumeChangePercent: number;
  items: ElasticityProfile[];
}

/**
 * Derives realistic Price Elasticity of Demand (Ep) for a restaurant dish
 * based on its BCG quadrant, CMV, category, and sales volume.
 */
export function estimateProductElasticity(
  product: Product,
  benchmarks?: { avgVolume: number; avgMarginReais: number }
): { coefficient: number; type: ElasticityType; rationale: string } {
  const price = Number(product.price || 0);
  const cost = Number(product.costPrice || 0);
  const volume = Number(product.salesVolume30Days ?? product.salesCountMonth ?? 0);
  const cmv = price > 0 ? (cost / price) * 100 : 0;
  const classification = product.bcgClassification;

  // 1. STAR ITEMS (⭐ Estrelas: Alta Fidelidade, Alta Aceitação, Baixa Sensibilidade ao Preço)
  if (classification === 'star') {
    // Premium burgers, signature drinks, house specialties have very low elasticity (inelastic)
    if (product.category === 'cat_smash' || product.category === 'cat_bebidas' || product.category === 'cat_burgers') {
      return {
        coefficient: -0.38,
        type: 'inelastic',
        rationale: 'Item âncora/assinatura com altíssima fidelização de clientes. A demanda é inelástica (|Ep| < 1), suportando reajuste positivo com perda insignificante de pedidos.'
      };
    }
    return {
      coefficient: -0.45,
      type: 'inelastic',
      rationale: 'Prato Estrela com forte valor percebido. Pequenos reajustes de preço aumentam a margem unitária sem abalar a base de pedidos.'
    };
  }

  // 2. DOG ITEMS (🐶 Cães de Guarda: Baixo Giro, Alta Sensibilidade ou CMV Excessivo)
  if (classification === 'dog') {
    // If CMV is super high (> 45%), the price was underquoted or recipe is too costly
    if (cmv >= 45) {
      return {
        coefficient: -1.65,
        type: 'elastic',
        rationale: 'Item com CMV asfixiante e baixo giro. Demanda elástica (|Ep| > 1). Exige reposicionamento de preço para cobrir CMV alvo ou reformulação de insumos.'
      };
    }
    return {
      coefficient: -1.85,
      type: 'elastic',
      rationale: 'Demanda sensível ao preço com baixo volume. Ajuste cirúrgico com nova apresentação ou combo pode evitar perdas sem afastar os poucos compradores.'
    };
  }

  // 3. CASH COW / PLOWHORSE (🐎 Cavalos de Batalha: Alto Volume, Baixa Margem)
  if (classification === 'cash_cow' || classification === 'horse') {
    return {
      coefficient: -0.75,
      type: 'inelastic',
      rationale: 'Prato de alto volume e preço competitivo. Elasticidade moderadamente inelástica; reajustes fracionados (+R$ 1 a R$ 2) geram grande ganho em escala.'
    };
  }

  // 4. PUZZLE / QUESTION MARK (❓ Quebra-Cabeça: Alta Margem, Baixo Volume)
  return {
    coefficient: -1.25,
    type: 'elastic',
    rationale: 'Margem unitária excelente mas baixa frequência. Preço no teto da categoria. Estratégia de promoção/combo é mais eficiente que corte de preço.'
  };
}

/**
 * Calculates optimal price suggestion using Elasticity Economics:
 * %ΔQ = Ep * %ΔP
 * NewProfit = (NewPrice - Cost) * (CurrentVolume * (1 + %ΔQ))
 */
export function calculateElasticityProfile(
  product: Product,
  strategy: OptimizationStrategy = 'balanced'
): ElasticityProfile {
  const price = Number(product.price || 0);
  const cost = Number(product.costPrice || 0);
  const volume = Number(product.salesVolume30Days ?? product.salesCountMonth ?? 0);
  const marginReais = Math.max(0, price - cost);
  const marginPercent = price > 0 ? (marginReais / price) * 100 : 0;
  const cmv = price > 0 ? (cost / price) * 100 : 0;
  const revenueMonthly = price * volume;
  const profitMonthly = marginReais * volume;
  
  const { coefficient, type, rationale } = estimateProductElasticity(product);

  let deltaReais = 0;
  let strategicRecommendation = '';
  let badgeAction = '';

  // Multiplier depending on strategy aggressiveness
  const strategyFactor = strategy === 'conservative' ? 0.6 : strategy === 'aggressive' ? 1.4 : 1.0;

  if (product.bcgClassification === 'star') {
    // For Inelastic Star: We can increase price by +4% to +10% depending on CMV and strategy
    // Target: Maximize profit with minimal volume sacrifice
    let targetPercentIncrease = 0.065; // Default 6.5% increase for stars
    if (cmv > 30) targetPercentIncrease = 0.09; // If CMV is creeping up, increase more
    if (cmv < 22) targetPercentIncrease = 0.05; // If CMV is already ultra-healthy, gentle adjustment

    const rawDelta = price * targetPercentIncrease * strategyFactor;
    // Round to clean restaurant price endings (.00, .50, or .90)
    deltaReais = Math.max(1.0, Math.round(rawDelta * 2) / 2);

    strategicRecommendation = `Por ser um prato Estrela inelástico (Ep: ${coefficient}), um reajuste de +${formatBRL(deltaReais)} gera ganho direto na margem com perda de volume estimada em apenas ${(Math.abs(coefficient * (deltaReais / price) * 100)).toFixed(1)}%.`;
    badgeAction = `Aumentar +${formatBRL(deltaReais)} (Inelástico)`;
  } else if (product.bcgClassification === 'dog') {
    // For Dog Items:
    // If CMV is too high (> 38%), we MUST increase price to achieve minimum viable CMV of ~30%,
    // even with volume drop, because selling at low margin is hurting kitchen capacity.
    if (cmv > 36) {
      const targetHealthyPrice = cost / 0.30; // Preço para atingir 30% CMV
      const rawDelta = (targetHealthyPrice - price) * strategyFactor;
      deltaReais = Math.max(2.0, Math.round(rawDelta * 2) / 2);

      strategicRecommendation = `Prato Cão de Guarda com CMV crítico de ${cmv.toFixed(1)}%. Reajuste de +${formatBRL(deltaReais)} recupera a margem para cobrir custos de insumos e mão de obra.`;
      badgeAction = `Reajustar +${formatBRL(deltaReais)} (CMV Alvo 30%)`;
    } else {
      // If CMV is normal but demand is dead, test slight price repositioning or combo anchor
      const rawDelta = 2.00 * strategyFactor;
      deltaReais = Math.round(rawDelta * 2) / 2;
      strategicRecommendation = `Reposicionar precificação em +${formatBRL(deltaReais)} agregando novo acompanhamento para transformar o item em produto de combate.`;
      badgeAction = `Ajustar +${formatBRL(deltaReais)}`;
    }
  } else if (product.bcgClassification === 'cash_cow' || product.bcgClassification === 'horse') {
    // Plowhorse: Gentle +R$ 1.50 - R$ 2.50
    deltaReais = Math.round(1.50 * strategyFactor * 2) / 2;
    strategicRecommendation = `Cavalo de Batalha de alto giro: pequeno aumento de +${formatBRL(deltaReais)} multiplica o lucro operacional em escala.`;
    badgeAction = `Reajustar +${formatBRL(deltaReais)}`;
  } else {
    // Puzzle: Keep price or test +R$ 1.00
    deltaReais = Math.round(1.00 * strategyFactor * 2) / 2;
    strategicRecommendation = `Quebra-cabeça: margem já é alta, focar em marketing e visibilidade.`;
    badgeAction = `Ajustar +${formatBRL(deltaReais)}`;
  }

  const suggestedNewPrice = Math.max(1, price + deltaReais);
  const priceDeltaPercent = price > 0 ? (deltaReais / price) * 100 : 0;
  
  // %ΔQ = Ep * %ΔP
  const projectedVolumePercentChange = coefficient * priceDeltaPercent;
  const projectedNewVolume = Math.max(1, Math.round(volume * (1 + (projectedVolumePercentChange / 100))));
  
  const projectedNewMarginReais = Math.max(0, suggestedNewPrice - cost);
  const projectedNewMarginPercent = suggestedNewPrice > 0 ? (projectedNewMarginReais / suggestedNewPrice) * 100 : 0;
  const projectedNewCmv = suggestedNewPrice > 0 ? (cost / suggestedNewPrice) * 100 : 0;
  const projectedNewRevenueMonthly = suggestedNewPrice * projectedNewVolume;
  const projectedNewProfitMonthly = projectedNewMarginReais * projectedNewVolume;
  const projectedProfitDeltaMonthly = projectedNewProfitMonthly - profitMonthly;
  const projectedProfitGainPercent = profitMonthly > 0 ? (projectedProfitDeltaMonthly / profitMonthly) * 100 : 0;

  let elasticityLabel = 'Demanda Inelástica (|Ep| < 1)';
  if (type === 'elastic') elasticityLabel = 'Demanda Elástica (|Ep| > 1)';
  if (type === 'unitary') elasticityLabel = 'Elasticidade Unitária (|Ep| = 1)';

  return {
    productId: product.id,
    productName: product.name,
    category: product.category,
    classification: product.bcgClassification,
    imageUrl: product.imageUrl,
    currentPrice: price,
    currentCost: cost,
    currentCmv: cmv,
    currentVolume: volume,
    currentMarginReais: marginReais,
    currentMarginPercent: marginPercent,
    currentRevenueMonthly: revenueMonthly,
    currentProfitMonthly: profitMonthly,
    
    elasticityCoefficient: coefficient,
    elasticityType: type,
    elasticityLabel,
    elasticityRationale: rationale,
    
    suggestedPriceDelta: deltaReais,
    suggestedNewPrice,
    priceDeltaPercent,
    
    projectedVolumePercentChange,
    projectedNewVolume,
    projectedNewMarginReais,
    projectedNewMarginPercent,
    projectedNewCmv,
    projectedNewRevenueMonthly,
    projectedNewProfitMonthly,
    projectedProfitDeltaMonthly,
    projectedProfitGainPercent,
    
    strategicRecommendation,
    badgeAction,
  };
}

/**
 * Optimizes the entire catalog or filtered targets (Stars & Dogs)
 * and generates portfolio-wide financial simulations.
 */
export function generateElasticityPortfolioAnalysis(
  products: Product[],
  targetQuadrants: ('star' | 'dog' | 'all') = 'all',
  strategy: OptimizationStrategy = 'balanced'
): ElasticityPortfolioSummary {
  const filtered = products.filter(p => {
    if (targetQuadrants === 'star') return p.bcgClassification === 'star';
    if (targetQuadrants === 'dog') return p.bcgClassification === 'dog';
    return p.bcgClassification === 'star' || p.bcgClassification === 'dog';
  });

  const profiles = filtered.map(p => calculateElasticityProfile(p, strategy));

  const currentTotalProfitMonthly = profiles.reduce((acc, p) => acc + p.currentProfitMonthly, 0);
  const projectedTotalProfitMonthly = profiles.reduce((acc, p) => acc + p.projectedNewProfitMonthly, 0);
  const totalMonthlyGainReais = projectedTotalProfitMonthly - currentTotalProfitMonthly;
  const totalMonthlyGainPercent = currentTotalProfitMonthly > 0 
    ? (totalMonthlyGainReais / currentTotalProfitMonthly) * 100 
    : 0;

  const avgPriceChangePercent = profiles.length > 0
    ? profiles.reduce((acc, p) => acc + p.priceDeltaPercent, 0) / profiles.length
    : 0;

  const avgVolumeChangePercent = profiles.length > 0
    ? profiles.reduce((acc, p) => acc + p.projectedVolumePercentChange, 0) / profiles.length
    : 0;

  return {
    totalItemsTargeted: profiles.length,
    starItemsCount: profiles.filter(p => p.classification === 'star').length,
    dogItemsCount: profiles.filter(p => p.classification === 'dog').length,
    currentTotalProfitMonthly,
    projectedTotalProfitMonthly,
    totalMonthlyGainReais,
    totalMonthlyGainPercent,
    avgPriceChangePercent,
    avgVolumeChangePercent,
    items: profiles,
  };
}

function formatBRL(val: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
}
