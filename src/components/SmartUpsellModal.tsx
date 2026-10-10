import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Plus,
  Check,
  ShoppingBag,
  ArrowRight,
  X,
  Flame,
  Utensils,
  Coffee,
  Beer,
  Zap,
  CheckCircle2,
  Tag
} from 'lucide-react';
import { Product, ProductCategory } from '../types';
import { formatBRL } from '../utils/formatters';
import { playCashRegister, playBeep } from '../utils/audio';

export interface CartItemLike {
  product: Product;
  quantity: number;
  totalPrice: number;
}

export interface SmartRecommendation {
  product: Product;
  reasonTag: string;
  badge: string;
  categoryType: 'drink' | 'side' | 'dessert' | 'special';
  popularityPercent: number;
}

/**
 * Intelligent recommendation engine based on main item and current cart items
 */
export function getSmartRecommendations(
  mainProduct: Product | null,
  allProducts: Product[],
  currentCartItems: CartItemLike[]
): SmartRecommendation[] {
  if (!mainProduct || allProducts.length === 0) return [];

  const cartProductIds = new Set(currentCartItems.map((item) => item.product.id));
  const availableCandidates = allProducts.filter(
    (p) => p.available && p.id !== mainProduct.id && !cartProductIds.has(p.id)
  );

  const mainCategory = (mainProduct.category || '').toLowerCase();
  const mainName = (mainProduct.name || '').toLowerCase();

  const recommendations: SmartRecommendation[] = [];

  // Helper to find a product matching predicate
  const findProduct = (predicate: (p: Product) => boolean): Product | undefined => {
    return availableCandidates.find(
      (p) => predicate(p) && !recommendations.some((r) => r.product.id === p.id)
    );
  };

  // Helper to get products from specific category
  const findInCategory = (catId: string): Product | undefined => {
    return availableCandidates.find(
      (p) => p.category === catId && !recommendations.some((r) => r.product.id === p.id)
    );
  };

  // 1. BURGERS & SANDWICHES (cat_smash, cat_lanches)
  if (mainCategory.includes('smash') || mainCategory.includes('lanche') || mainName.includes('burger')) {
    // 1st: Fries / Portions
    const side = findProduct(
      (p) =>
        p.category === 'cat_portions' ||
        p.name.toLowerCase().includes('batata') ||
        p.name.toLowerCase().includes('frita') ||
        p.name.toLowerCase().includes('onion')
    );
    if (side) {
      recommendations.push({
        product: side,
        reasonTag: '🍟 Combinação Perfeita',
        badge: 'Crocância Máxima',
        categoryType: 'side',
        popularityPercent: 94,
      });
    }

    // 2nd: Cold Beverage / Refrigerante
    const drink = findProduct(
      (p) =>
        p.category === 'cat_drinks' ||
        p.name.toLowerCase().includes('coca') ||
        p.name.toLowerCase().includes('guaraná') ||
        p.name.toLowerCase().includes('chopp')
    );
    if (drink) {
      recommendations.push({
        product: drink,
        reasonTag: '🥤 Bebida Gelada',
        badge: 'Super Refrescante',
        categoryType: 'drink',
        popularityPercent: 91,
      });
    }

    // 3rd: Dessert / Milkshake
    const dessert = findProduct(
      (p) =>
        p.category === 'cat_dessert' ||
        p.category === 'cat_acai' ||
        p.name.toLowerCase().includes('shake') ||
        p.name.toLowerCase().includes('brownie')
    );
    if (dessert) {
      recommendations.push({
        product: dessert,
        reasonTag: '🍦 Sobremesa Irresistível',
        badge: 'Fechamento Doce',
        categoryType: 'dessert',
        popularityPercent: 78,
      });
    }
  }
  // 2. PIZZAS (Tradicionais, Especiais, Gourmet)
  else if (mainCategory.includes('pizza') || mainName.includes('pizza')) {
    // 1st: Beverage (Soda, Chopp)
    const drink = findProduct(
      (p) =>
        p.category === 'cat_drinks' ||
        p.name.toLowerCase().includes('coca') ||
        p.name.toLowerCase().includes('guaraná') ||
        p.name.toLowerCase().includes('chopp')
    );
    if (drink) {
      recommendations.push({
        product: drink,
        reasonTag: '🥤 Acompanha a Pizza',
        badge: 'Estupidamente Gelada',
        categoryType: 'drink',
        popularityPercent: 96,
      });
    }

    // 2nd: Sweet Pizza or Dessert
    const sweetPizza = findProduct(
      (p) =>
        p.category === 'cat_pizzas_doces' ||
        p.category === 'cat_dessert' ||
        p.name.toLowerCase().includes('nutella') ||
        p.name.toLowerCase().includes('chocolate')
    );
    if (sweetPizza) {
      recommendations.push({
        product: sweetPizza,
        reasonTag: '🍫 Sobremesa dos Sonhos',
        badge: 'Pizza Doce Especial',
        categoryType: 'dessert',
        popularityPercent: 86,
      });
    }

    // 3rd: Crispy Starter / Portion
    const side = findProduct((p) => p.category === 'cat_portions');
    if (side) {
      recommendations.push({
        product: side,
        reasonTag: '🍟 Entrada Crocante',
        badge: 'Para Compartilhar',
        categoryType: 'side',
        popularityPercent: 72,
      });
    }
  }
  // 3. PORTIONS / APERITIVOS
  else if (mainCategory.includes('portion') || mainCategory.includes('porcoes')) {
    // 1st: Beer / Cold Drink
    const drink = findProduct(
      (p) =>
        p.category === 'cat_drinks' ||
        p.name.toLowerCase().includes('chopp') ||
        p.name.toLowerCase().includes('cerveja') ||
        p.name.toLowerCase().includes('coca')
    );
    if (drink) {
      recommendations.push({
        product: drink,
        reasonTag: '🍻 Casamento Perfeito',
        badge: 'Chopp & Drinks',
        categoryType: 'drink',
        popularityPercent: 92,
      });
    }

    // 2nd: Main Burger / Sandwich
    const mainBurger = findProduct(
      (p) => p.category === 'cat_smash' || p.category === 'cat_lanches'
    );
    if (mainBurger) {
      recommendations.push({
        product: mainBurger,
        reasonTag: '🍔 Prato Principal',
        badge: 'Mais Vendido',
        categoryType: 'special',
        popularityPercent: 88,
      });
    }
  }
  // 4. AÇAÍ & TIGELAS
  else if (mainCategory.includes('acai') || mainName.includes('açaí')) {
    // 1st: Natural Drink / Water
    const drink = findProduct(
      (p) =>
        p.category === 'cat_drinks' ||
        p.name.toLowerCase().includes('suco') ||
        p.name.toLowerCase().includes('água')
    );
    if (drink) {
      recommendations.push({
        product: drink,
        reasonTag: '🥤 Hidratação Gelada',
        badge: '100% Natural',
        categoryType: 'drink',
        popularityPercent: 84,
      });
    }

    // 2nd: Sweet Snack or Second Dessert
    const extraDessert = findProduct(
      (p) => p.category === 'cat_dessert' || p.category === 'cat_pizzas_doces'
    );
    if (extraDessert) {
      recommendations.push({
        product: extraDessert,
        reasonTag: '🍫 Turbinar Experiência',
        badge: 'Doce Artesanal',
        categoryType: 'dessert',
        popularityPercent: 77,
      });
    }
  }
  // 5. COMBOS
  else if (mainCategory.includes('combo')) {
    // Dessert or Extra Side
    const dessert = findProduct((p) => p.category === 'cat_dessert');
    if (dessert) {
      recommendations.push({
        product: dessert,
        reasonTag: '🍦 Feche com Chave de Ouro',
        badge: 'Sobremesa Especial',
        categoryType: 'dessert',
        popularityPercent: 89,
      });
    }
  }

  // Fallbacks: Ensure we have up to 3 recommendations by pulling from drinks, portions, desserts
  if (recommendations.length < 3) {
    const fallbackCategories = ['cat_drinks', 'cat_portions', 'cat_dessert', 'cat_smash'];
    for (const cat of fallbackCategories) {
      if (recommendations.length >= 3) break;
      const extra = findInCategory(cat);
      if (extra) {
        recommendations.push({
          product: extra,
          reasonTag: '⭐ Campeão de Vendas',
          badge: extra.badgeText || 'Destaque da Casa',
          categoryType: cat === 'cat_drinks' ? 'drink' : cat === 'cat_portions' ? 'side' : 'dessert',
          popularityPercent: 85,
        });
      }
    }
  }

  return recommendations.slice(0, 3);
}

interface SmartUpsellModalProps {
  isOpen: boolean;
  onClose: () => void;
  mainProduct: Product | null;
  allProducts: Product[];
  currentCartItems: CartItemLike[];
  onAddRecommendation: (product: Product) => void;
  onGoToCart: () => void;
  readingMode?: boolean;
}

export const SmartUpsellModal: React.FC<SmartUpsellModalProps> = ({
  isOpen,
  onClose,
  mainProduct,
  allProducts,
  currentCartItems,
  onAddRecommendation,
  onGoToCart,
  readingMode = false,
}) => {
  const [addedProductIds, setAddedProductIds] = useState<Set<string>>(new Set());

  // Derive dynamic smart recommendations
  const recommendations = React.useMemo(() => {
    return getSmartRecommendations(mainProduct, allProducts, currentCartItems);
  }, [mainProduct, allProducts, currentCartItems]);

  // Reset added tracker when modal reopens for a new product
  React.useEffect(() => {
    if (isOpen) {
      setAddedProductIds(new Set());
    }
  }, [isOpen, mainProduct?.id]);

  if (!isOpen || !mainProduct || recommendations.length === 0) {
    return null;
  }

  const handleAdd = (product: Product) => {
    playCashRegister();
    onAddRecommendation(product);
    setAddedProductIds((prev) => new Set(prev).add(product.id));
  };

  const totalCartCount = currentCartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ type: 'spring', damping: 26, stiffness: 280 }}
          className={`w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border my-auto transition-all ${
            readingMode
              ? 'bg-white border-2 border-zinc-400 text-zinc-950 shadow-zinc-400/40'
              : 'bg-[#120F14] border-zinc-800 text-white shadow-black/80 ring-1 ring-white/10'
          }`}
        >
          {/* Top Banner Header with Badge */}
          <div className={`p-4 sm:p-5 relative ${
            readingMode
              ? 'bg-gradient-to-r from-amber-100 via-amber-50 to-orange-50 border-b border-zinc-300'
              : 'bg-gradient-to-r from-[#241318] via-[#1A0E13] to-[#120B0F] border-b border-zinc-800/80'
          }`}>
            {/* Close Button */}
            <button
              type="button"
              onClick={() => {
                playBeep(700, 0.03);
                onClose();
              }}
              className={`absolute top-3.5 right-3.5 p-1.5 rounded-full transition-all cursor-pointer ${
                readingMode
                  ? 'bg-zinc-200 hover:bg-zinc-300 text-zinc-800'
                  : 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
              title="Fechar sugestões"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Smart Tag Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-2.5 shadow-sm bg-gradient-to-r from-[#DA291C] to-red-600 text-white">
              <Sparkles className="w-3.5 h-3.5 text-[#FFC72C] animate-spin" style={{ animationDuration: '6s' }} />
              <span>Sugestão Inteligente do Chef</span>
            </div>

            {/* Title & Added Item Feedback */}
            <h3 className={`text-lg sm:text-xl font-black tracking-tight leading-snug ${
              readingMode ? 'text-zinc-950' : 'text-white'
            }`}>
              Turbine seu pedido e economize!
            </h3>
            
            {/* Main Product Acknowledgment Pill */}
            <div className={`mt-2.5 p-2 rounded-xl border flex items-center gap-2.5 ${
              readingMode
                ? 'bg-white border-zinc-300'
                : 'bg-zinc-900/90 border-zinc-800/90'
            }`}>
              <img
                src={mainProduct.imageUrl}
                alt={mainProduct.name}
                className="w-10 h-10 rounded-lg object-cover shrink-0 border border-zinc-700/50"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500 text-black text-[10px] font-black">
                    ✓
                  </span>
                  <span className="text-[11px] font-bold text-emerald-500">
                    Adicionado à sacola
                  </span>
                </div>
                <p className={`text-xs font-bold truncate ${readingMode ? 'text-zinc-900' : 'text-zinc-100'}`}>
                  {mainProduct.name}
                </p>
              </div>
              <span className={`text-xs font-black font-mono px-2 py-1 rounded-lg ${
                readingMode ? 'bg-amber-100 text-zinc-950 font-black' : 'text-[#FFC72C] bg-[#FFC72C]/10'
              }`}>
                {formatBRL(mainProduct.price)}
              </span>
            </div>
          </div>

          {/* Body: Recommendation Cards */}
          <div className="p-4 sm:p-5 space-y-3 max-h-[50vh] overflow-y-auto scrollbar-thin">
            <p className={`text-xs font-medium flex items-center justify-between ${
              readingMode ? 'text-zinc-700' : 'text-zinc-400'
            }`}>
              <span>Que tal adicionar uma bebida ou acompanhamento perfeito?</span>
              <span className="text-[10px] font-bold opacity-70">1-clique para adicionar</span>
            </p>

            <div className="space-y-2.5">
              {recommendations.map((rec) => {
                const isAdded = addedProductIds.has(rec.product.id);

                return (
                  <motion.div
                    key={rec.product.id}
                    layout
                    className={`p-3 rounded-2xl border transition-all flex items-center gap-3 relative ${
                      isAdded
                        ? readingMode
                          ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-200'
                          : 'bg-emerald-950/30 border-emerald-600/50 ring-1 ring-emerald-500/30'
                        : readingMode
                        ? 'bg-zinc-50 hover:bg-white border-zinc-300 hover:border-black shadow-xs'
                        : 'bg-[#171217] hover:bg-zinc-900/90 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    {/* Item Image with Category Badge */}
                    <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-xl overflow-hidden shrink-0 bg-zinc-900 border border-zinc-700/50">
                      <img
                        src={rec.product.imageUrl}
                        alt={rec.product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      {rec.product.itemNumber && (
                        <span className="absolute top-1 left-1 px-1 py-0.5 rounded bg-black/70 text-white font-mono text-[9px] font-bold">
                          #{rec.product.itemNumber}
                        </span>
                      )}
                    </div>

                    {/* Content details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide ${
                          rec.categoryType === 'drink'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : rec.categoryType === 'side'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
                        }`}>
                          {rec.reasonTag}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-bold hidden sm:inline">
                          ★ {rec.popularityPercent}% pedem juntos
                        </span>
                      </div>

                      <h4 className={`text-xs sm:text-sm font-black truncate leading-tight ${
                        readingMode ? 'text-zinc-950' : 'text-white'
                      }`}>
                        {rec.product.name}
                      </h4>

                      <p className={`text-[11px] line-clamp-1 mt-0.5 ${
                        readingMode ? 'text-zinc-700' : 'text-zinc-400'
                      }`}>
                        {rec.product.description}
                      </p>

                      <div className="mt-1 flex items-center gap-2">
                        <span className={`text-xs font-black font-mono ${
                          readingMode ? 'text-zinc-950' : 'text-[#FFC72C]'
                        }`}>
                          {formatBRL(rec.product.price)}
                        </span>
                        {rec.badge && (
                          <span className="text-[10px] text-zinc-500 font-medium">
                            • {rec.badge}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick Add Button */}
                    <button
                      type="button"
                      onClick={() => handleAdd(rec.product)}
                      className={`shrink-0 px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 ${
                        isAdded
                          ? 'bg-emerald-600 text-white shadow-emerald-950/50 ring-2 ring-emerald-400'
                          : readingMode
                          ? 'bg-zinc-900 hover:bg-black text-amber-300'
                          : 'bg-[#DA291C] hover:bg-[#FFC72C] hover:text-black text-white'
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Adicionado!</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Adicionar</span>
                        </>
                      )}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Modal Footer Controls */}
          <div className={`p-4 bg-zinc-950/90 border-t flex flex-col sm:flex-row items-center justify-between gap-2.5 ${
            readingMode ? 'bg-zinc-100 border-zinc-300' : 'border-zinc-800/80'
          }`}>
            <button
              type="button"
              onClick={() => {
                playBeep(700, 0.03);
                onClose();
              }}
              className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                readingMode
                  ? 'text-zinc-700 hover:text-black hover:bg-zinc-200'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              Continuar no Cardápio
            </button>

            <button
              type="button"
              onClick={() => {
                playBeep(900, 0.05);
                onClose();
                onGoToCart();
              }}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-[#DA291C] to-[#B81F14] hover:brightness-110 text-white flex items-center justify-center gap-2 shadow-lg shadow-red-950/50 cursor-pointer active:scale-95 transition-all"
            >
              <ShoppingBag className="w-4 h-4 text-[#FFC72C]" />
              <span>Ver Sacola ({totalCartCount})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

/**
 * Embedded Upsell Strip displayed directly inside the Cart Drawer (isCartOpen)
 */
interface SmartCartUpsellRowProps {
  allProducts: Product[];
  currentCartItems: CartItemLike[];
  onAddRecommendation: (product: Product) => void;
  readingMode?: boolean;
}

export const SmartCartUpsellRow: React.FC<SmartCartUpsellRowProps> = ({
  allProducts,
  currentCartItems,
  onAddRecommendation,
  readingMode = false,
}) => {
  // Compute best suggestions based on cart contents
  const suggestions = React.useMemo(() => {
    if (currentCartItems.length === 0) return [];

    // Prioritize main item from cart
    const primaryItem = currentCartItems[0]?.product || null;
    return getSmartRecommendations(primaryItem, allProducts, currentCartItems);
  }, [allProducts, currentCartItems]);

  if (suggestions.length === 0) return null;

  return (
    <div className={`p-3 rounded-2xl border space-y-2.5 ${
      readingMode
        ? 'bg-amber-50/60 border-amber-200'
        : 'bg-gradient-to-r from-[#171015] via-[#140E13] to-[#120B10] border-zinc-800/90'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#FFC72C]" />
          <span className={`text-[11px] font-black uppercase tracking-wider ${
            readingMode ? 'text-zinc-900' : 'text-zinc-200'
          }`}>
            Turbine sua Sacola
          </span>
        </div>
        <span className="text-[10px] text-zinc-500 font-bold">
          Mais pedidos juntos
        </span>
      </div>

      <div className="space-y-2">
        {suggestions.map((rec) => (
          <div
            key={rec.product.id}
            className={`p-2 rounded-xl border flex items-center justify-between gap-2 text-xs transition-all ${
              readingMode
                ? 'bg-white border-zinc-200 hover:border-black shadow-xs'
                : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <img
              src={rec.product.imageUrl}
              alt={rec.product.name}
              className="w-9 h-9 rounded-lg object-cover shrink-0 border border-zinc-700/50"
            />
            <div className="flex-1 min-w-0">
              <p className={`font-black truncate text-[11px] leading-tight ${
                readingMode ? 'text-zinc-950' : 'text-white'
              }`}>
                {rec.product.name}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-[#FFC72C] font-mono font-bold">
                  {formatBRL(rec.product.price)}
                </span>
                <span className="text-[9px] text-zinc-500 truncate">
                  • {rec.reasonTag}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onAddRecommendation(rec.product)}
              className="px-2.5 py-1 rounded-lg bg-[#DA291C] hover:bg-[#FFC72C] hover:text-black text-white text-[10px] font-black flex items-center gap-1 transition-all cursor-pointer active:scale-95 shadow-xs"
            >
              <Plus className="w-3 h-3" />
              <span>Adicionar</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
