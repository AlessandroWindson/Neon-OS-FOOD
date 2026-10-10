import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Flame,
  UtensilsCrossed,
  Sparkles,
  Heart,
  Sandwich,
  Soup,
  IceCream2,
  Beer,
  Search,
  Plus,
  Minus,
  ShoppingBag,
  Clock,
  MapPin,
  Phone,
  CheckCircle2,
  ArrowRight,
  X,
  MessageSquare,
  DollarSign,
  QrCode,
  CreditCard,
  Banknote,
  SlidersHorizontal,
  Printer,
  Copy,
  Share2,
  FileText,
  Layers,
  ChefHat,
  ShieldCheck,
  Check,
  Zap,
  LayoutGrid,
  ListFilter,
  ChevronRight,
  ChevronLeft,
  Tag,
  Eye,
  Award,
  Filter,
  Pizza,
  Coffee,
  Cake,
  Sun,
  Moon,
  Type,
  BookOpen,
  RefreshCw,
  LocateFixed,
  Truck,
  Navigation,
  Maximize2,
  Minimize2,
  ArrowLeft,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Product, ProductCategory, ProductPriceVariant } from '../types';
import { formatBRL } from '../utils/formatters';
import { playBeep, playCashRegister, playKitchenBell } from '../utils/audio';
import { generatePixPayload, getPixQrCodeUrl } from '../utils/pix';
import {
  calculateDistanceKm,
  calculateDeliveryFeeByLocation,
  requestCurrentBrowserLocation,
  DEFAULT_STORE_COORDS,
  Coordinates,
} from '../utils/deliveryGeo';
import {
  StoriesBarSkeleton,
  CategoryShowcaseSkeleton,
  StickyCategoryNavSkeleton,
  ProductSectionSkeleton,
  ProductItemSkeleton
} from './CardapioSkeletons';
import {
  SmartUpsellModal,
  SmartCartUpsellRow,
} from './SmartUpsellModal';
import { PixDynamicPaymentModal, PixOrderPayload } from './PixDynamicPaymentModal';
import { PaymentGatewayModal } from './PaymentGatewayModal';
import { DULCI_CONTACT, generateDulciWhatsAppMenuText } from '../data/lanchoneteDulciData';
import { playNewOrderSound } from '../services/universalMarketplaceService';

interface CartItemCustomized {
  product: Product;
  selectedVariant?: ProductPriceVariant;
  selectedOptions: { groupName: string; itemName: string; price: number }[];
  quantity: number;
  notes: string;
  unitPrice: number;
  totalPrice: number;
}

// Category icons mapping helper
const getCategoryIcon = (iconName: string, iconClass = 'w-4 h-4') => {
  switch (iconName) {
    case 'Flame': return <Flame className={iconClass} />;
    case 'UtensilsCrossed': return <UtensilsCrossed className={iconClass} />;
    case 'Sparkles': return <Sparkles className={iconClass} />;
    case 'Heart': return <Heart className={iconClass} />;
    case 'Sandwich': return <Sandwich className={iconClass} />;
    case 'Soup': return <Soup className={iconClass} />;
    case 'IceCream2': return <IceCream2 className={iconClass} />;
    case 'Beer': return <Beer className={iconClass} />;
    case 'Zap': return <Zap className={iconClass} />;
    case 'Award': return <Award className={iconClass} />;
    case 'Pizza': return <Pizza className={iconClass} />;
    case 'Coffee': return <Coffee className={iconClass} />;
    case 'Cake': return <Cake className={iconClass} />;
    default: return <UtensilsCrossed className={iconClass} />;
  }
};

// Short category name for compact mobile badges
const getCategoryShortName = (name: string) => {
  if (name.includes('Ofertas') || name.includes('Promoções')) return 'Ofertas';
  if (name.includes('X-Saladas') || name.includes('Lanches')) return 'Lanches';
  if (name.includes('Mistos')) return 'Mistos';
  if (name.includes('Pastéis') || name.includes('Pasteis')) return 'Pastéis';
  if (name.includes('Acompanhamentos') || name.includes('Fritas')) return 'Fritas';
  if (name.includes('Pizzas')) return 'Pizzas';
  if (name.includes('Refrigerantes')) return 'Refrigerantes';
  if (name.includes('Sucos')) return 'Sucos';
  if (name.includes('Combos')) return 'Combos';
  if (name.includes('Burguers') || name.includes('Smash')) return 'Smash';
  if (name.includes('Porções')) return 'Porções';
  if (name.includes('Açaí')) return 'Açaí';
  if (name.includes('Bebidas')) return 'Bebidas';
  return name.split(' ')[0];
};

// Helper component to highlight search matches cleanly
const HighlightText: React.FC<{
  text: string;
  highlight: string;
  readingMode?: boolean;
}> = ({ text, highlight, readingMode = false }) => {
  if (!highlight || !highlight.trim()) {
    return <>{text}</>;
  }

  const cleanQuery = highlight.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${cleanQuery})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.trim().toLowerCase() ? (
          <mark
            key={i}
            className={`px-1 py-0.5 rounded font-black ${
              readingMode
                ? 'bg-amber-300 text-black shadow-xs'
                : 'bg-[#FFC72C]/30 text-[#FFC72C] border-b-2 border-[#FFC72C]'
            }`}
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
};

export const CardapioDigitalCliente: React.FC = () => {
  const { products, categories, tenant, currentBranch, addOrder, setCurrentView } = useApp();

  // Navigation & Search
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchCategoryFilter, setSearchCategoryFilter] = useState<string>('all');

  // Input refs for keyboard focus
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const stickySearchInputRef = React.useRef<HTMLInputElement>(null);

  // Modals state
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false);
  const [qrTableNumber, setQrTableNumber] = useState<string>('1');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedPdfText, setCopiedPdfText] = useState<boolean>(false);

  // Customization modal state
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductPriceVariant | undefined>(undefined);
  const [selectedOptionItems, setSelectedOptionItems] = useState<{ [groupName: string]: string[] }>({});
  const [itemQuantity, setItemQuantity] = useState<number>(1);
  const [itemNotes, setItemNotes] = useState<string>('');

  // Cart Drawer state
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [cartItems, setCartItems] = useState<CartItemCustomized[]>([]);
  const [orderChannel, setOrderChannel] = useState<'delivery' | 'dine_in' | 'takeout'>('dine_in');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerAddress, setCustomerAddress] = useState<string>('');
  const [tableNumber, setTableNumber] = useState<string>('4');
  // Geolocation & Delivery Fee State
  const [customerCoords, setCustomerCoords] = useState<Coordinates | null>(null);
  const [customerDistanceKm, setCustomerDistanceKm] = useState<number | null>(null);
  const [isDetectingGps, setIsDetectingGps] = useState<boolean>(false);
  const [gpsFeedbackMsg, setGpsFeedbackMsg] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card' | 'debit_card' | 'cash' | 'meal_voucher'>('pix');
  const [orderPlacedSuccess, setOrderPlacedSuccess] = useState<boolean>(false);
  const [showPixModal, setShowPixModal] = useState<boolean>(false);
  const [showGatewayModal, setShowGatewayModal] = useState<boolean>(false);
  const [gatewayInitialMethod, setGatewayInitialMethod] = useState<'pix' | 'credit_card' | 'debit_card'>('pix');
  const [pixCopiedSuccess, setPixCopiedSuccess] = useState<boolean>(false);
  const [currentPixTxId, setCurrentPixTxId] = useState<string>('PED-' + Math.floor(1000 + Math.random() * 9000));
  const [categoryViewMode, setCategoryViewMode] = useState<'carousel' | 'bento'>('carousel');
  const [isQuickIndexOpen, setIsQuickIndexOpen] = useState<boolean>(false);

  // Fullscreen Customer View (Experiência Pública do Cliente sem barras de administração)
  const [isFullscreenMode, setIsFullscreenMode] = useState<boolean>(() => {
    try {
      if (typeof window === 'undefined') return false;
      const params = new URLSearchParams(window.location.search);
      return params.get('mode') === 'customer' || params.get('fullscreen') === 'true';
    } catch {
      return false;
    }
  });

  // Smart Upsell Modal (Aumento do Ticket Médio)
  const [smartUpsellProduct, setSmartUpsellProduct] = useState<Product | null>(null);
  const [isSmartUpsellOpen, setIsSmartUpsellOpen] = useState<boolean>(false);

  // Reading Mode (Alto Contraste & Acessibilidade para Ambientes Iluminados / Luz Solar)
  const [readingMode, setReadingMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('neon_reading_mode') === 'true';
    } catch {
      return false;
    }
  });

  const [fontSizeScale, setFontSizeScale] = useState<'normal' | 'large' | 'extra-large'>(() => {
    try {
      const saved = localStorage.getItem('neon_font_scale');
      if (saved === 'normal' || saved === 'large' || saved === 'extra-large') return saved;
      return 'large';
    } catch {
      return 'large';
    }
  });

  const toggleReadingMode = () => {
    playBeep(900, 0.04);
    setReadingMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('neon_reading_mode', String(next));
      } catch {}
      return next;
    });
  };

  const handleSetFontSizeScale = (scale: 'normal' | 'large' | 'extra-large') => {
    playBeep(850, 0.03);
    setFontSizeScale(scale);
    try {
      localStorage.setItem('neon_font_scale', scale);
    } catch {}
  };

  // Skeleton screen loading state
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initial loading simulation & transition
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 650);
    return () => clearTimeout(timer);
  }, []);

  // Detect table from URL query string (?mesa=X or ?table=X)
  React.useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const mesaParam = params.get('mesa') || params.get('table');
      if (mesaParam) {
        const num = parseInt(mesaParam, 10);
        if (!isNaN(num) && num > 0) {
          setTableNumber(String(num));
          setOrderChannel('dine_in');
        }
      }
    } catch {}
  }, []);

  const handleRefreshMenu = () => {
    playBeep(850, 0.04);
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 600);
  };

  const isMenuLoading = isLoading && products.length > 0;

  const categoryScrollRef = React.useRef<HTMLDivElement>(null);
  const stickyNavRef = React.useRef<HTMLDivElement>(null);
  const storiesScrollRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll active item into view on both stickyNav and stories
  React.useEffect(() => {
    if (stickyNavRef.current) {
      const activeBtn = stickyNavRef.current.querySelector(`[data-cat-id="${activeCategory}"]`);
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
    if (storiesScrollRef.current) {
      const activeStory = storiesScrollRef.current.querySelector(`[data-story-id="${activeCategory}"]`);
      if (activeStory) {
        activeStory.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeCategory]);

  // Default category visual metadata fallback
  const categoryVisualDefaults: Record<string, { imageUrl: string; badge: string; desc: string; gradient: string; startingPrice?: number }> = {
    cat_promocoes_dulci: {
      imageUrl: '/images/x-salada-dulci.jpg',
      badge: '🔥 Destaque Máximo',
      desc: 'Combos exclusivos com super desconto e economia real para matar a fome.',
      gradient: 'from-[#DA291C] via-[#DC2626] to-[#FFC72C]',
      startingPrice: 25.00,
    },
    cat_lanches_dulci: {
      imageUrl: '/images/x-salada-dulci.jpg',
      badge: '🍔 Pão Brioche',
      desc: 'Pão brioche, ovo, queijo derretido, hambúrguer no ponto e tempero caseiro especial.',
      gradient: 'from-[#DA291C] via-[#B91C1C] to-black/90',
      startingPrice: 9.00,
    },
    cat_mistos_dulci: {
      imageUrl: '/images/misto-quente-chapa.jpg',
      badge: '🥪 Tostado na Chapa',
      desc: 'Pão de forma tostado com fartura de queijo derretido e presunto no capricho.',
      gradient: 'from-[#D97706] via-[#B45309] to-black/90',
      startingPrice: 6.00,
    },
    cat_pasteis_dulci: {
      imageUrl: '/images/pastel-frito-crocante.jpg',
      badge: '🥟 Frito na Hora',
      desc: 'Massa caseira dourada e crocante frita na hora com recheios generosos.',
      gradient: 'from-[#F59E0B] via-[#D97706] to-black/90',
      startingPrice: 6.00,
    },
    cat_acompanhamentos_dulci: {
      imageUrl: '/images/batata-frita-dulci.jpg',
      badge: '🍟 Crocante e Sequinha',
      desc: 'Batatas fritas douradas nas versões 200g individual e 400g família.',
      gradient: 'from-[#EA580C] via-[#C2410C] to-black/90',
      startingPrice: 10.00,
    },
    cat_pizzas_dulci: {
      imageUrl: '/images/pizza-tradicional-dulci.jpg',
      badge: '🍕 Massa Crocante',
      desc: 'Massa crocante, molho artesanal e muçarela abundante nos tamanhos Média e Grande.',
      gradient: 'from-[#DC2626] via-[#991B1B] to-black/90',
      startingPrice: 30.00,
    },
    cat_refrigerantes_dulci: {
      imageUrl: '/images/guarana-bare-gelado.jpg',
      badge: '🥤 Geladaço',
      desc: 'Refrigerantes nacionais e o consagrado sabor regional do Baré, Tuchaua e Teté Cola.',
      gradient: 'from-[#B91C1C] via-[#7F1D1D] to-black/90',
      startingPrice: 6.00,
    },
    cat_sucos_dulci: {
      imageUrl: '/images/suco-natural-amazonia.jpg',
      badge: '🌿 100% Natural',
      desc: 'Polpa natural batida na hora: Goiaba, Acerola, Maracujá e Graviola nos tamanhos 300ml e 1L.',
      gradient: 'from-[#059669] via-[#047857] to-black/90',
      startingPrice: 5.00,
    },
    cat_combos_dulci: {
      imageUrl: '/images/combo-dulci-bare.jpg',
      badge: '⭐ Combos com Bebida',
      desc: 'Combos de 3 e 4 X-Saladas com Guaraná Baré, Regente ou Coca-Cola 1L a 1,5L.',
      gradient: 'from-[#DA291C] via-[#FFC72C] to-black/90',
      startingPrice: 30.00,
    },
    cat_smash: {
      imageUrl: '/images/x-tudo-gigante-dulci.jpg',
      badge: '🔥 Mais Pedidos',
      desc: 'Blends Angus 100% bovinos prensados com crostinha na brasa em pão brioche amanteigado.',
      gradient: 'from-amber-600/90 via-red-600/80 to-black/90',
      startingPrice: 28.90,
    },
    cat_pizzas_tradicionais: {
      imageUrl: '/images/pizza-tradicional-dulci.jpg',
      badge: '🍕 48h Fermentação',
      desc: 'Massa italiana de fermentação lenta 48h, molho pelati italiano e muçarela derretida (P • M • G).',
      gradient: 'from-red-600/90 via-orange-600/80 to-black/90',
      startingPrice: 38.90,
    },
    cat_pizzas_especiais: {
      imageUrl: '/images/pizza-tradicional-dulci.jpg',
      badge: '⭐ Assinatura Chef',
      desc: 'Criações exclusivas com ingredientes selecionados, costela 12h, 4 queijos nobres e bordas vulcão.',
      gradient: 'from-purple-600/90 via-pink-600/80 to-black/90',
      startingPrice: 44.90,
    },
    cat_pizzas_doces: {
      imageUrl: '/images/pizza-tradicional-dulci.jpg',
      badge: '🍫 Nutella Pura',
      desc: 'Massa fina crocante coberta com Nutella pura, morangos frescos selecionados e chocolate belga.',
      gradient: 'from-pink-600/90 via-rose-700/80 to-black/90',
      startingPrice: 34.90,
    },
    cat_lanches: {
      imageUrl: '/images/x-salada-dulci.jpg',
      badge: '🥪 Fartura Total',
      desc: 'Lanches tradicionais brasileiros prensados com muita fartura de queijo, filé e tempero caseiro.',
      gradient: 'from-yellow-600/90 via-amber-700/80 to-black/90',
      startingPrice: 24.90,
    },
    cat_portions: {
      imageUrl: '/images/batata-frita-dulci.jpg',
      badge: '🍟 Super Crocante',
      desc: 'Batatas rústicas com alecrim, anéis de cebola e porções crocantes para compartilhar.',
      gradient: 'from-orange-500/90 via-yellow-600/80 to-black/90',
      startingPrice: 19.90,
    },
    cat_acai: {
      imageUrl: '/images/acai-tigela-manaus.jpg',
      badge: '🍧 100% Puro Pará',
      desc: 'Açaí puro do Pará batido super cremoso com frutas frescas, leite ninho e coberturas.',
      gradient: 'from-purple-800/90 via-indigo-900/80 to-black/90',
      startingPrice: 18.90,
    },
    cat_combos: {
      imageUrl: '/images/combo-dulci-bare.jpg',
      badge: '🏷️ Economia até 25%',
      desc: 'Combos completos com hambúrguer, batata rústica e refrigerante com super desconto.',
      gradient: 'from-red-600/90 via-amber-600/80 to-black/90',
      startingPrice: 49.90,
    },
    cat_drinks: {
      imageUrl: '/images/coca-cola-lata-gelada.jpg',
      badge: '🍻 Estupidamente Geladas',
      desc: 'Refrigerantes em lata, sucos naturais feitos na hora e chopp artesanal de pressão.',
      gradient: 'from-blue-600/90 via-cyan-600/80 to-black/90',
      startingPrice: 7.90,
    },
    cat_dessert: {
      imageUrl: '/images/acai-tigela-manaus.jpg',
      badge: '🍫 Sobremesas Especiais',
      desc: 'Doces artesanais, açaí no capricho e delícias para fechar seu pedido.',
      gradient: 'from-amber-800/90 via-red-800/80 to-black/90',
      startingPrice: 22.90,
    },
  };

  const getCategoryDetails = (cat: ProductCategory) => {
    const fallback = categoryVisualDefaults[cat.id] || {
      imageUrl: '/images/x-salada-dulci.jpg',
      badge: '✨ Destaque',
      desc: 'Pratos selecionados preparados com receitas exclusivas da nossa cozinha.',
      gradient: 'from-zinc-800/90 to-zinc-900/90',
      startingPrice: undefined,
    };

    return {
      imageUrl: cat.imageUrl || fallback.imageUrl,
      badge: cat.badge || fallback.badge,
      desc: cat.description || fallback.desc,
      gradient: cat.colorGradient || fallback.gradient,
      startingPrice: cat.startingPrice || fallback.startingPrice,
    };
  };

  const handleScrollCarousel = (direction: 'left' | 'right') => {
    if (categoryScrollRef.current) {
      const offset = direction === 'left' ? -280 : 280;
      categoryScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  const handleSelectCategory = (catId: string) => {
    playBeep(750, 0.04);
    setActiveCategory(catId);
    if (catId === 'all') {
      window.scrollTo({ top: 480, behavior: 'smooth' });
    } else {
      setTimeout(() => {
        const el = document.getElementById(`section-${catId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 50);
    }
  };

  // Keyboard shortcuts: '/' to focus search, 'Escape' to clear
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      if (e.key === 'Escape' && searchTerm) {
        setSearchTerm('');
        searchInputRef.current?.blur();
        stickySearchInputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchTerm]);

  // Quick Search Suggestion Tags
  const quickSearchTags = [
    { label: '🔥 Mais Pedidos', query: 'artesanal' },
    { label: '🍔 Smash Angus', query: 'smash' },
    { label: '🍕 Pizzas', query: 'pizza' },
    { label: '🥓 Bacon', query: 'bacon' },
    { label: '🧀 Catupiry', query: 'catupiry' },
    { label: '🍟 Fritas & Porções', query: 'fritas' },
    { label: '🍫 Doces & Sobremesas', query: 'doce' },
    { label: '🥤 Bebidas & Refrigerantes', query: 'coca' },
  ];

  const handleQuickTagClick = (query: string) => {
    playBeep(850, 0.03);
    if (searchTerm.toLowerCase() === query.toLowerCase()) {
      setSearchTerm('');
    } else {
      setSearchTerm(query);
      setSearchCategoryFilter('all');
    }
  };

  // Search active state
  const isSearching = searchTerm.trim().length > 0;

  // All matching products across the entire restaurant catalog
  const allMatchingProducts = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const query = searchTerm.toLowerCase().trim();
    return products.filter((prod) => {
      const matchesName = prod.name.toLowerCase().includes(query);
      const matchesDesc = prod.description.toLowerCase().includes(query);
      const matchesNum = prod.itemNumber ? String(prod.itemNumber).includes(query) : false;
      const matchesTag = prod.tags ? prod.tags.some((t) => t.toLowerCase().includes(query)) : false;
      const cat = categories.find((c) => c.id === prod.category);
      const matchesCatName = cat ? cat.name.toLowerCase().includes(query) : false;
      return matchesName || matchesDesc || matchesNum || matchesTag || matchesCatName;
    });
  }, [products, categories, searchTerm]);

  // Matching products filtered by subcategory chip if user selected one
  const searchMatchingProducts = useMemo(() => {
    if (searchCategoryFilter === 'all') {
      return allMatchingProducts;
    }
    return allMatchingProducts.filter((p) => p.category === searchCategoryFilter);
  }, [allMatchingProducts, searchCategoryFilter]);

  // Category counts among search results
  const availableSearchCategories = useMemo(() => {
    if (allMatchingProducts.length === 0) return [];
    const countsByCat: Record<string, number> = {};
    allMatchingProducts.forEach((p) => {
      countsByCat[p.category] = (countsByCat[p.category] || 0) + 1;
    });
    return categories
      .filter((c) => countsByCat[c.id] > 0)
      .map((c) => ({
        id: c.id,
        name: c.name,
        count: countsByCat[c.id],
      }));
  }, [allMatchingProducts, categories]);

  // Flexible category matcher so any product created with "Lanches" or "cat_lanches" or custom name is NEVER lost
  const isProductInCategory = (prodCategory: string, catId: string) => {
    if (!prodCategory || !catId) return false;
    const p = prodCategory.toLowerCase().trim();
    const c = catId.toLowerCase().trim();
    if (p === c) return true;
    if (p === c.replace(/^cat_/, '')) return true;
    if (c === p.replace(/^cat_/, '')) return true;
    const catObj = categories.find(cat => cat.id.toLowerCase() === c || cat.name.toLowerCase() === c);
    if (catObj && catObj.name.toLowerCase() === p) return true;
    return false;
  };

  // Filtered products list for standard browsing
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      if (activeCategory !== 'all' && !isProductInCategory(prod.category, activeCategory)) {
        return false;
      }
      return true;
    });
  }, [products, activeCategory, categories]);

  // Grouped products by category for the continuous landing page view
  const productsGroupedByCategory = useMemo(() => {
    const map = new Map<string, Product[]>();
    categories.forEach((cat) => {
      map.set(cat.id, []);
    });

    filteredProducts.forEach((prod) => {
      // Find matching registered category or assign to existing category key
      const matched = categories.find(c => isProductInCategory(prod.category, c.id));
      const targetCatId = matched ? matched.id : (prod.category || 'outros');
      const list = map.get(targetCatId);
      if (list) {
        list.push(prod);
      } else {
        map.set(targetCatId, [prod]);
      }
    });

    return map;
  }, [filteredProducts, categories]);

  // Handle opening product customization
  const handleOpenCustomize = (product: Product) => {
    playBeep(800, 0.05);
    setCustomizingProduct(product);
    setSelectedVariant(product.priceVariants && product.priceVariants.length > 0 ? product.priceVariants[0] : undefined);
    setSelectedOptionItems({});
    setItemQuantity(1);
    setItemNotes('');
  };

  // Helper to determine if product is a main item eligible for upsell
  const isEligibleForUpsell = (product: Product) => {
    const cat = (product.category || '').toLowerCase();
    const name = (product.name || '').toLowerCase();
    // Do not trigger for standalone drinks
    if (cat.includes('drink') || (name.includes('coca') && !name.includes('combo'))) {
      return false;
    }
    return (
      cat.includes('smash') ||
      cat.includes('pizza') ||
      cat.includes('lanche') ||
      cat.includes('portion') ||
      cat.includes('acai') ||
      cat.includes('combo') ||
      product.price >= 18
    );
  };

  const triggerSmartUpsell = (product: Product) => {
    if (isEligibleForUpsell(product)) {
      setSmartUpsellProduct(product);
      setIsSmartUpsellOpen(true);
    }
  };

  // Add a recommended product from upsell modal or cart strip
  const handleAddRecommendation = (product: Product) => {
    const basePrice = product.priceVariants && product.priceVariants.length > 0 ? product.priceVariants[0].price : product.price;
    const defaultVariant = product.priceVariants && product.priceVariants.length > 0 ? product.priceVariants[0] : undefined;

    setCartItems((prev) => {
      const existingIdx = prev.findIndex(
        (item) =>
          item.product.id === product.id &&
          item.selectedVariant?.label === defaultVariant?.label &&
          item.selectedOptions.length === 0 &&
          item.notes === ''
      );

      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx].quantity += 1;
        updated[existingIdx].totalPrice = updated[existingIdx].quantity * updated[existingIdx].unitPrice;
        return updated;
      }

      return [
        ...prev,
        {
          product,
          selectedVariant: defaultVariant,
          selectedOptions: [],
          quantity: 1,
          notes: '',
          unitPrice: basePrice,
          totalPrice: basePrice,
        },
      ];
    });
  };

  // Direct add to cart for promo cards
  const handleAddToCartDirect = (product: Product) => {
    handleAddRecommendation(product);
  };

  // Quick add without opening modal (for simple items)
  const handleQuickAdd = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    playCashRegister();

    const basePrice = product.priceVariants && product.priceVariants.length > 0 ? product.priceVariants[0].price : product.price;
    const defaultVariant = product.priceVariants && product.priceVariants.length > 0 ? product.priceVariants[0] : undefined;

    setCartItems((prev) => {
      const existingIdx = prev.findIndex(
        (item) =>
          item.product.id === product.id &&
          item.selectedVariant?.label === defaultVariant?.label &&
          item.selectedOptions.length === 0 &&
          item.notes === ''
      );

      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx].quantity += 1;
        updated[existingIdx].totalPrice = updated[existingIdx].quantity * updated[existingIdx].unitPrice;
        return updated;
      }

      return [
        ...prev,
        {
          product,
          selectedVariant: defaultVariant,
          selectedOptions: [],
          quantity: 1,
          notes: '',
          unitPrice: basePrice,
          totalPrice: basePrice,
        },
      ];
    });

    // Trigger Smart Upsell modal for eligible main items
    triggerSmartUpsell(product);
  };

  // Add customized item to cart
  const handleAddCustomizedToCart = () => {
    if (!customizingProduct) return;
    playCashRegister();

    const currentProduct = customizingProduct;
    const basePrice = selectedVariant ? selectedVariant.price : customizingProduct.price;
    
    // Calculate options total
    const chosenOptionsList: { groupName: string; itemName: string; price: number }[] = [];
    Object.entries(selectedOptionItems).forEach(([groupName, itemNames]) => {
      const groupDef = customizingProduct.options?.find((o) => o.groupName === groupName);
      if (!groupDef) return;
      (itemNames as string[]).forEach((name) => {
        const optDef = groupDef.items.find((i) => i.name === name);
        if (optDef) {
          chosenOptionsList.push({
            groupName,
            itemName: optDef.name,
            price: optDef.price,
          });
        }
      });
    });

    const optionsSum = chosenOptionsList.reduce((acc, curr) => acc + curr.price, 0);
    const unitPrice = basePrice + optionsSum;
    const totalPrice = unitPrice * itemQuantity;

    setCartItems((prev) => [
      ...prev,
      {
        product: customizingProduct,
        selectedVariant,
        selectedOptions: chosenOptionsList,
        quantity: itemQuantity,
        notes: itemNotes.trim(),
        unitPrice,
        totalPrice,
      },
    ]);

    setCustomizingProduct(null);

    // Trigger Smart Upsell modal for eligible main items
    triggerSmartUpsell(currentProduct);
  };

  // Cart total calculations
  const totalItemsCount = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.quantity, 0);
  }, [cartItems]);

  const cartSubtotal = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.totalPrice, 0);
  }, [cartItems]);

  // Dynamic Geolocation-based Delivery Fee Calculation
  const deliveryCalcResult = useMemo(() => {
    if (orderChannel !== 'delivery') return null;
    if (customerCoords) {
      return calculateDeliveryFeeByLocation(
        customerCoords,
        tenant?.settings,
        cartSubtotal,
        tenant?.settings?.storeCoordinates || DEFAULT_STORE_COORDS
      );
    }
    const freeOver = tenant?.settings?.freeDeliveryOver ?? 120.00;
    const isFree = freeOver > 0 && cartSubtotal >= freeOver;
    const baseFee = tenant?.settings?.deliveryBaseFee ?? 7.50;
    return {
      deliveryFee: isFree ? 0 : baseFee,
      isFreeDelivery: isFree,
      distanceKm: 3.0,
      estimatedMinutesMin: 25,
      estimatedMinutesMax: 40,
      isDeliverable: true,
      zone: { name: 'Raio Padrão (3 km)', badgeBg: 'bg-emerald-900/30 text-emerald-400 border-emerald-500/30' },
      breakdown: { baseFee, extraKmFee: 0, extraKmCount: 0 },
    };
  }, [orderChannel, customerCoords, tenant?.settings, cartSubtotal]);

  const deliveryFee = orderChannel === 'delivery' ? (deliveryCalcResult?.deliveryFee ?? 7.50) : 0;
  const cartTotal = cartSubtotal + deliveryFee;
  const finalOrderTotal = useMemo(() => {
    return cartTotal + (orderChannel === 'dine_in' ? cartSubtotal * 0.10 : 0);
  }, [cartTotal, orderChannel, cartSubtotal]);

  // Handler for GPS location detection from browser
  const handleDetectCustomerGps = async () => {
    setIsDetectingGps(true);
    setGpsFeedbackMsg(null);
    playBeep(850, 0.04);
    try {
      const { coords } = await requestCurrentBrowserLocation();
      setCustomerCoords(coords);
      const storePos = tenant?.settings?.storeCoordinates || DEFAULT_STORE_COORDS;
      const distKm = calculateDistanceKm(storePos.lat, storePos.lng, coords.lat, coords.lng);
      setCustomerDistanceKm(distKm);
      if (!customerAddress.trim()) {
        setCustomerAddress('Localização Atual via GPS (São Paulo)');
      }
      playKitchenBell();
      setGpsFeedbackMsg(`GPS Conectado! ~${distKm} km da loja`);
    } catch (err) {
      const fallback: Coordinates = {
        lat: -23.5620 + (Math.random() - 0.5) * 0.03,
        lng: -46.6620 + (Math.random() - 0.5) * 0.03,
      };
      setCustomerCoords(fallback);
      const storePos = tenant?.settings?.storeCoordinates || DEFAULT_STORE_COORDS;
      const distKm = calculateDistanceKm(storePos.lat, storePos.lng, fallback.lat, fallback.lng);
      setCustomerDistanceKm(distKm);
      if (!customerAddress.trim()) {
        setCustomerAddress('Localização GPS (Jardins / Região Paulista)');
      }
      playKitchenBell();
      setGpsFeedbackMsg(`GPS Estimado: ~${distKm} km da loja`);
    } finally {
      setIsDetectingGps(false);
    }
  };

  // Dynamic Pix Order Payload for the PixDynamicPaymentModal
  const pixOrderPayload: PixOrderPayload = useMemo(() => {
    const orderItems = cartItems.map((item, idx) => ({
      id: `item_pix_${Date.now()}_${idx}`,
      productId: item.product.id,
      productName: `${item.product.name}${item.selectedVariant ? ` (${item.selectedVariant.label})` : ''}`,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      station: (
        item.product.category === 'drink' ? 'bar' :
        item.product.category === 'dessert' || item.product.category === 'acai' ? 'dessert' :
        item.product.category === 'portion' ? 'fryer' : 'grill'
      ) as any,
      status: 'pending' as const,
      notes: [
        item.notes,
        ...item.selectedOptions.map((o) => `${o.itemName} (+${formatBRL(o.price)})`),
      ]
        .filter(Boolean)
        .join(' | '),
    }));

    return {
      customerName: customerName.trim() || (orderChannel === 'dine_in' ? `Mesa ${tableNumber || 'Salão'}` : 'Cliente Cardápio Online'),
      customerPhone: customerPhone.trim() || undefined,
      customerAddress: customerAddress.trim() ? {
        street: customerAddress.trim(),
        number: '',
        neighborhood: '',
        city: tenant?.settings?.pixCity || 'São Paulo',
        zipCode: '',
        coords: customerCoords || undefined,
        distanceKm: customerDistanceKm || undefined,
      } : undefined,
      tableNumber: orderChannel === 'dine_in' && tableNumber ? Number(tableNumber) : undefined,
      items: orderItems,
      subtotal: cartSubtotal,
      deliveryFee,
      serviceFee: orderChannel === 'dine_in' ? cartSubtotal * 0.10 : 0,
      total: finalOrderTotal,
      orderChannel: orderChannel === 'delivery' ? 'delivery_whatsapp' : orderChannel === 'dine_in' ? 'mesa' : 'pdv_balcao',
    };
  }, [customerName, orderChannel, tableNumber, customerPhone, customerAddress, customerCoords, customerDistanceKm, tenant, cartItems, cartSubtotal, deliveryFee, finalOrderTotal]);

  const handlePixPaymentConfirmed = (_createdOrder: any) => {
    setCartItems([]);
    setIsCartOpen(false);
  };

  const handleGatewayPaymentSuccess = (_createdOrder: any, _transaction: any) => {
    setCartItems([]);
    setIsCartOpen(false);
    setOrderPlacedSuccess(true);
    playCashRegister();
    setTimeout(() => {
      setOrderPlacedSuccess(false);
    }, 8000);
  };

  // Dynamic Pix Payload & QR Code for the current order
  const dynamicOrderPixPayload = useMemo(() => {
    if (!tenant?.settings?.pixKey) return '';
    return generatePixPayload({
      pixKey: tenant.settings.pixKey,
      pixKeyType: tenant.settings.pixKeyType || 'cnpj',
      merchantName: tenant.settings.pixBeneficiaryName || tenant.name || 'Lanchonete Dulci',
      merchantCity: tenant.settings.pixCity || 'SAO PAULO',
      amount: finalOrderTotal > 0 ? finalOrderTotal : undefined,
      txId: currentPixTxId,
      description: `Pedido ${currentPixTxId}`,
    });
  }, [tenant, finalOrderTotal, currentPixTxId]);

  const dynamicOrderPixQrUrl = useMemo(() => {
    return getPixQrCodeUrl(dynamicOrderPixPayload, 280);
  }, [dynamicOrderPixPayload]);

  // Handle Cart item quantity adjustments
  const handleUpdateCartQty = (index: number, delta: number) => {
    playBeep(650, 0.04);
    setCartItems((prev) => {
      const updated = [...prev];
      const newQty = updated[index].quantity + delta;
      if (newQty <= 0) {
        return updated.filter((_, i) => i !== index);
      }
      updated[index].quantity = newQty;
      updated[index].totalPrice = newQty * updated[index].unitPrice;
      return updated;
    });
  };

  // Finalize order into system (sends to KDS Cozinha and Central de Pedidos)
  const handleFinalizeSystemOrder = () => {
    if (cartItems.length === 0) return;
    playCashRegister();

    const orderItems = cartItems.map((item) => ({
      productId: item.product.id,
      productName: `${item.product.name}${item.selectedVariant ? ` (${item.selectedVariant.label})` : ''}`,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      notes: [
        item.notes,
        ...item.selectedOptions.map((o) => `${o.itemName} (+${formatBRL(o.price)})`),
      ]
        .filter(Boolean)
        .join(' | '),
    }));

    addOrder({
      branchId: currentBranch?.id || tenant?.id || 'matriz',
      tenantId: tenant?.id || 'tenant_lanchonete_dulci',
      channel: orderChannel === 'delivery' ? 'delivery_whatsapp' : orderChannel === 'dine_in' ? 'mesa' : 'pdv_balcao',
      status: 'pending',
      customerName: customerName.trim() || (orderChannel === 'dine_in' ? `Mesa ${tableNumber || 'Salão'}` : 'Cliente Cardápio Online'),
      customerPhone: customerPhone.trim() || undefined,
      customerAddress: customerAddress.trim() ? {
        street: customerAddress.trim(),
        number: '',
        neighborhood: '',
        city: tenant?.settings?.pixCity || 'São Paulo',
        zipCode: '',
        coords: customerCoords || undefined,
        distanceKm: customerDistanceKm || undefined,
      } : undefined,
      tableNumber: orderChannel === 'dine_in' && tableNumber ? Number(tableNumber) : undefined,
      items: orderItems,
      subtotal: cartSubtotal,
      discount: 0,
      deliveryFee,
      serviceFee: orderChannel === 'dine_in' ? cartSubtotal * 0.10 : 0,
      total: finalOrderTotal,
      paymentMethod: paymentMethod as any,
      paymentStatus: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    setOrderPlacedSuccess(true);
    setTimeout(() => {
      setCartItems([]);
      setIsCartOpen(false);
      setShowPixModal(false);
      setOrderPlacedSuccess(false);
      setCurrentPixTxId('PED-' + Math.floor(1000 + Math.random() * 9000));
    }, 2500);
  };

  // Send WhatsApp Order
  const handleSendWhatsAppOrder = () => {
    if (cartItems.length === 0) return;
    playCashRegister();

    const itemsText = cartItems
      .map((item, idx) => {
        const variantText = item.selectedVariant ? ` [${item.selectedVariant.label}]` : '';
        const optionsText =
          item.selectedOptions.length > 0
            ? `\n   ↳ Adicionais: ${item.selectedOptions.map((o) => o.itemName).join(', ')}`
            : '';
        const notesText = item.notes ? `\n   ↳ Obs: "${item.notes}"` : '';
        return `*${idx + 1}. ${item.quantity}x ${item.product.name}${variantText}* - ${formatBRL(item.totalPrice)}${optionsText}${notesText}`;
      })
      .join('\n');

    const paymentLabels: Record<string, string> = {
      pix: 'PIX Instantâneo (QR Code)',
      credit_card: 'Cartão de Crédito (Maquininha)',
      debit_card: 'Cartão de Débito (Maquininha)',
      cash: 'Dinheiro',
      meal_voucher: 'Vale Refeição / Alimentação',
    };

    const typeText =
      orderChannel === 'delivery'
        ? `🛵 *ENTREGA EM DOMICÍLIO*\n📍 *Endereço:* ${customerAddress || 'A combinar'}`
        : orderChannel === 'dine_in'
        ? `🍽️ *CONSUMIR NO LOCAL*\n🪑 *Mesa:* ${tableNumber || 'Salão'}`
        : `🛍️ *RETIRADA NO BALCÃO*`;

    const pixDetails = (paymentMethod === 'pix' && tenant?.settings?.pixKey)
      ? `\n━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🔑 *DADOS DE PAGAMENTO PIX:*\n` +
        `👤 *Favorecido:* ${tenant.settings.pixBeneficiaryName || tenant.name}\n` +
        `🗝️ *Chave Pix (${(tenant.settings.pixKeyType || 'cnpj').toUpperCase()}):* ${tenant.settings.pixKey}\n` +
        `📍 *Cidade:* ${tenant.settings.pixCity || 'São Paulo'}\n` +
        `📋 *Pix Copia e Cola:*\n\`${dynamicOrderPixPayload}\`\n`
      : '';

    const message = `🍔 *NOVO PEDIDO - ${tenant?.name || 'LANCHONETE DULCI'}* (${currentPixTxId})\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 *Cliente:* ${customerName || 'Cliente'}\n` +
      `📱 *WhatsApp:* ${customerPhone || 'Não informado'}\n` +
      `${typeText}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📋 *ITENS DO PEDIDO:*\n${itemsText}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `💵 *Subtotal:* ${formatBRL(cartSubtotal)}\n` +
      (orderChannel === 'delivery' ? `🛵 *Taxa de Entrega:* ${deliveryFee === 0 ? 'GRÁTIS' : formatBRL(deliveryFee)}\n` : '') +
      (orderChannel === 'dine_in' ? `🍽️ *Taxa de Atendimento (10%):* ${formatBRL(cartSubtotal * 0.10)}\n` : '') +
      `💰 *TOTAL DO PEDIDO:* ${formatBRL(finalOrderTotal)}\n` +
      `💳 *Forma de Pagamento:* ${paymentLabels[paymentMethod] || 'PIX'}\n` +
      pixDetails +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `_Pedido gerado pelo Cardápio Online Oficial_`;

    const cleanPhone = (tenant?.settings?.whatsappNumber || DULCI_CONTACT.whatsappNumber).replace(/\D/g, '');
    const phoneWithDDI = cleanPhone.length === 10 || cleanPhone.length === 11 ? `55${cleanPhone}` : cleanPhone;
    const whatsappUrl = `https://wa.me/${phoneWithDDI}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');

    // Also register order in system for KDS kitchen
    handleFinalizeSystemOrder();
  };

  // Copy Menu Link
  const handleCopyLink = () => {
    playBeep(900, 0.04);
    const domain = tenant?.settings?.menuCustomDomain || 'https://neonfood.app/cardapio';
    const slug = tenant?.settings?.menuCustomSlug || 'lanchonete-dulci';
    const link = `${domain}?loja=${slug}${qrTableNumber ? `&mesa=${qrTableNumber}` : ''}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Copy Complete Formatted Text Menu for WhatsApp
  const handleCopyWhatsappFormattedMenu = () => {
    playBeep(900, 0.04);
    const text = generateDulciWhatsAppMenuText();
    navigator.clipboard.writeText(text);
    setCopiedPdfText(true);
    setTimeout(() => setCopiedPdfText(false), 2000);
  };

  // Direct WhatsApp Share of Menu
  const handleShareMenuWhatsApp = () => {
    const domain = tenant?.settings?.menuCustomDomain || 'https://neonfood.app/cardapio';
    const slug = tenant?.settings?.menuCustomSlug || 'lanchonete-dulci';
    const link = `${domain}?loja=${slug}`;
    const zapText = `🔥 *Cardápio Oficial - ${tenant?.name || 'Lanchonete Dulci'} (Manaus / AM)* 🔥\n\n` +
      `Acesse nosso cardápio completo com fotos reais, combos, lanches no pão brioche, mistos na chapa, pastéis crocantes, pizzas e refrigerantes regionais:\n` +
      `👉 ${link}\n\n` +
      `🛵 *Faça seu pedido online pelo celular ou envie aqui no WhatsApp!*`;
    window.open(`https://wa.me/?text=${encodeURIComponent(zapText)}`, '_blank');
  };

  return (
    <div className={`min-h-screen font-sans pb-24 transition-colors duration-200 ${
      isFullscreenMode ? 'fixed inset-0 z-[100] overflow-y-auto' : ''
    } ${
      readingMode
        ? 'bg-[#F4F4F6] text-zinc-950 selection:bg-[#DA291C] selection:text-white'
        : 'bg-[#0A0A0E] text-zinc-100 selection:bg-[#DA291C] selection:text-white'
    }`}>
      {/* Top Banner when in Fullscreen Customer View */}
      {isFullscreenMode && (
        <div className="sticky top-0 z-[120] bg-gradient-to-r from-[#DA291C] via-[#B91C1C] to-zinc-950 text-white px-4 py-2 flex items-center justify-between shadow-2xl border-b border-[#FFC72C]/40 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00D26A] animate-ping" />
            <span className="font-black text-[#FFC72C]">LANCHEONETE DULCI</span>
            <span className="text-zinc-300 hidden sm:inline">• Modo Cardápio Público do Cliente (Manaus - AM)</span>
          </div>
          <button
            type="button"
            onClick={() => {
              playBeep();
              setIsFullscreenMode(false);
            }}
            className="px-3 py-1 bg-black/70 hover:bg-black text-white font-black rounded-lg border border-white/30 text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow hover:scale-105"
            title="Voltar ao Painel da Lanchonete"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#FFC72C]" />
            <span>Voltar ao Painel da Loja</span>
          </button>
        </div>
      )}

      {/* 1. HERO HEADER WITH FAST-FOOD & REGIONAL MANAUS VIBES */}
      <div className={`relative overflow-hidden transition-colors duration-200 ${
        readingMode
          ? 'bg-white border-b-2 border-zinc-300 shadow-sm'
          : 'bg-gradient-to-b from-[#181112] via-[#120D10] to-[#0A0A0E] border-b border-zinc-800/80 shadow-2xl'
      }`}>
        {/* Glowing fast-food atmospheric glows (only on dark mode) */}
        {!readingMode && (
          <>
            <div className="absolute top-0 left-1/4 w-[400px] h-[260px] bg-[#DA291C]/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-0 right-10 w-[350px] h-[220px] bg-[#FFC72C]/10 rounded-full blur-3xl pointer-events-none" />
          </>
        )}

        <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8 relative z-10">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            {/* Brand details - Lanchonete Dulci (Manaus - AM) */}
            <div className="text-center lg:text-left space-y-2.5">
              <div className={`inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-black tracking-wider uppercase shadow-sm ${
                readingMode
                  ? 'bg-amber-100 border border-amber-300 text-amber-950'
                  : 'bg-[#DA291C]/20 border border-[#DA291C]/40 text-[#FFC72C]'
              }`}>
                <Flame className={`w-3.5 h-3.5 ${readingMode ? 'text-[#DA291C]' : 'text-[#FFC72C] animate-pulse'}`} />
                <span>Manaus – Amazonas – Brasil • Tradição & Sabor Regional</span>
              </div>
              
              <h1 className={`text-3xl sm:text-4xl md:text-5xl font-black tracking-tight flex items-center justify-center lg:justify-start gap-3 ${
                readingMode ? 'text-zinc-950' : 'text-white'
              }`}>
                <span className={readingMode ? 'text-[#B81F14]' : 'text-[#FFC72C] drop-shadow-[0_2px_12px_rgba(255,199,44,0.45)]'}>
                  {tenant?.name || 'LANCHEONETE DULCI'}
                </span>
              </h1>
              
              <p className={`text-xs sm:text-sm max-w-xl leading-relaxed ${
                readingMode ? 'text-zinc-800 font-semibold' : 'text-zinc-300'
              }`}>
                “Seu sabor favorito em Manaus”. Lanches no pão brioche amanteigado, X-Saladas artesanais, Pizzas de massa crocante nos tamanhos M e G, Pastéis sequinhos fritos na hora por R$ 6,00 e o verdadeiro Guaraná Baré!
              </p>

              {/* Status pill & highlights */}
              <div className="pt-1 flex flex-wrap items-center justify-center lg:justify-start gap-2.5 text-xs">
                {orderChannel === 'dine_in' && tableNumber && (
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-black border ${
                    readingMode
                      ? 'bg-emerald-100 text-emerald-950 border-emerald-500 shadow-sm'
                      : 'bg-[#00D26A]/20 text-[#00D26A] border-[#00D26A]/50 shadow-[0_0_12px_rgba(0,210,106,0.25)]'
                  }`}>
                    <QrCode className="w-3.5 h-3.5 text-[#00D26A]" />
                    <span>📍 ATENDIMENTO NA MESA {tableNumber.padStart(2, '0')}</span>
                  </span>
                )}
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold border ${
                  readingMode
                    ? 'bg-emerald-100 text-emerald-950 border-emerald-400'
                    : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                }`}>
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                  Cozinha Aberta • Pedidos Imediatos
                </span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold border ${
                  readingMode
                    ? 'bg-zinc-100 text-zinc-900 border-zinc-300'
                    : 'bg-zinc-900/90 text-zinc-300 border border-zinc-800'
                }`}>
                  <Clock className={`w-3.5 h-3.5 ${readingMode ? 'text-[#DA291C]' : 'text-[#FFC72C]'}`} />
                  Tempo de Entrega: 30 a 45 min
                </span>
                <a
                  href={`https://wa.me/5592993032598?text=${encodeURIComponent('Olá! Quero fazer um pedido na Lanchonete Dulci.')}`}
                  target="_blank"
                  rel="noreferrer"
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold border transition-all ${
                    readingMode
                      ? 'bg-emerald-100 text-emerald-950 border-emerald-400 hover:bg-emerald-200'
                      : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>📲 Zap: (92) 99303-2598</span>
                </a>
              </div>

              {/* Botões Principais de Conversão (CTA) */}
              <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    playBeep(880, 0.04);
                    searchInputRef.current?.focus();
                  }}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#DA291C] to-[#B91C1C] hover:brightness-110 active:scale-95 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-red-950/40 border border-[#FFC72C]/40 transition-all cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4 text-[#FFC72C]" />
                  <span>PEDIR AGORA</span>
                </button>
                <a
                  href={`https://wa.me/5592993032598?text=${encodeURIComponent('Olá! Quero fazer um pedido na Lanchonete Dulci.')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-md transition-all active:scale-95"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>PEDIR PELO WHATSAPP</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    playBeep();
                    setActiveCategory('all');
                    stickyNavRef.current?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all"
                >
                  <span>VER CARDÁPIO</span>
                </button>
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="flex flex-col gap-2.5 w-full lg:w-auto">
              {/* Action buttons: Reading Mode, Fullscreen, QR Code, PDF Flyer, Cart */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                {/* Fullscreen Mode */}
                <button
                  type="button"
                  onClick={() => {
                    playBeep(880, 0.04);
                    setIsFullscreenMode((prev) => !prev);
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2.5 px-3 font-bold rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer ${
                    isFullscreenMode
                      ? 'bg-[#FFC72C] text-black border-2 border-[#FFC72C] shadow-md'
                      : readingMode
                        ? 'bg-white hover:bg-zinc-100 text-zinc-900 border-2 border-zinc-300'
                        : 'bg-zinc-900 hover:bg-zinc-800 text-[#FFC72C] border border-zinc-800 hover:border-[#FFC72C]/50'
                  }`}
                  title={isFullscreenMode ? 'Voltar ao Painel Interno' : 'Visualizar como Cliente (Modo Tela Cheia)'}
                >
                  {isFullscreenMode ? (
                    <Minimize2 className="w-4 h-4 text-black" />
                  ) : (
                    <Maximize2 className="w-4 h-4 text-[#FFC72C]" />
                  )}
                  <span>{isFullscreenMode ? 'Painel' : 'Tela Cheia'}</span>
                </button>

                {/* Toggle Modo Leitura */}
                <button
                  type="button"
                  onClick={toggleReadingMode}
                  className={`flex items-center justify-center gap-1.5 py-2.5 px-3 font-black rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer ${
                    readingMode
                      ? 'bg-amber-400 hover:bg-amber-500 text-black border-2 border-black ring-2 ring-amber-300'
                      : 'bg-zinc-900 hover:bg-zinc-800 text-[#FFC72C] border border-zinc-800 hover:border-[#FFC72C]/50'
                  }`}
                  title="Alternar Modo de Leitura (Alto Contraste para Ambientes Iluminados / Luz Solar)"
                >
                  <Sun className={`w-4 h-4 ${readingMode ? 'text-black animate-pulse' : 'text-[#FFC72C]'}`} />
                  <span>{readingMode ? 'Leitura On' : 'Modo Leitura'}</span>
                </button>

                <button
                  onClick={() => { playBeep(); setIsQrModalOpen(true); }}
                  className={`flex items-center justify-center gap-1.5 py-2.5 px-3 font-bold rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer ${
                    readingMode
                      ? 'bg-white hover:bg-zinc-100 text-zinc-900 border-2 border-zinc-300'
                      : 'bg-zinc-900 hover:bg-zinc-800 text-[#FFC72C] border border-zinc-800 hover:border-[#FFC72C]/50'
                  }`}
                  title="Gerar QR Code de Mesa ou Link WhatsApp"
                >
                  <QrCode className={`w-4 h-4 ${readingMode ? 'text-zinc-900' : 'text-[#FFC72C]'}`} />
                  <span>QR Mesa</span>
                </button>

                <button
                  onClick={() => { playBeep(); setIsPdfModalOpen(true); }}
                  className={`flex items-center justify-center gap-1.5 py-2.5 px-3 font-bold rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer ${
                    readingMode
                      ? 'bg-white hover:bg-zinc-100 text-zinc-900 border-2 border-zinc-300'
                      : 'bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 hover:border-zinc-700'
                  }`}
                  title="Ver Panfleto / Cardápio em PDF Imprimível"
                >
                  <FileText className="w-4 h-4 text-[#DA291C]" />
                  <span>Cardápio PDF</span>
                </button>

                <button
                  onClick={() => { playBeep(); setIsCartOpen(true); }}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-gradient-to-r from-[#DA291C] to-[#B81F14] hover:brightness-110 active:scale-95 text-white font-bold rounded-xl shadow-lg shadow-red-950/40 transition-all cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4 text-[#FFC72C]" />
                  <span>Sacola ({totalItemsCount})</span>
                </button>
              </div>
            </div>
          </div>

          {/* 1.1 SEÇÃO DE DESTAQUE MÁXIMO: 🔥 OFERTAS DA DULCI (COMBOS REAIS DAS IMAGENS) */}
          <div className="mt-5 space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#DA291C] animate-ping" />
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <span className="text-[#DA291C]">🔥</span> OFERTAS DA DULCI
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#FFC72C] text-black">
                  Destaque Máximo
                </span>
              </div>
              <span className="text-xs text-zinc-400">
                Mais pedidos em Manaus • Peça direto ou no WhatsApp
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              {/* Promoção 01 */}
              <div className="rounded-2xl p-4 bg-gradient-to-b from-[#220B0B] to-[#120505] border-2 border-[#DA291C] flex flex-col justify-between shadow-xl relative overflow-hidden group hover:border-[#FFC72C] transition-all">
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-[#DA291C] text-white text-[10px] font-black uppercase tracking-wider shadow">
                  OFERTA DA CASA
                </div>
                <div className="space-y-1.5 pt-4">
                  <span className="text-2xl">🍔🍔🍔</span>
                  <h3 className="font-black text-sm text-white leading-tight">3 X-Saladas</h3>
                  <p className="text-[11px] text-zinc-400 line-clamp-2">Pão brioche, hambúrguer, ovo, queijo, presunto, alface e tomate.</p>
                  <div className="pt-2">
                    <span className="text-[10px] text-zinc-500 line-through block">De R$ 27,00</span>
                    <span className="text-xl font-black font-mono text-[#FFC72C]">R$ 25,00</span>
                    <span className="text-[10px] font-bold text-emerald-400 ml-1.5">Economize R$ 2</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const promo = products.find(p => p.id === 'dulci_promo_01');
                    if (promo) {
                      handleAddToCartDirect(promo);
                      playCashRegister();
                    }
                  }}
                  className="mt-3.5 w-full py-2.5 rounded-xl bg-[#DA291C] hover:bg-[#B91C1C] active:scale-95 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-red-950/50 transition-all cursor-pointer"
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-[#FFC72C]" />
                  <span>QUERO ESSA OFERTA</span>
                </button>
              </div>

              {/* Promoção 02 */}
              <div className="rounded-2xl p-4 bg-gradient-to-b from-[#220B0B] to-[#120505] border-2 border-[#DA291C] flex flex-col justify-between shadow-xl relative overflow-hidden group hover:border-[#FFC72C] transition-all">
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-[#FFC72C] text-black text-[10px] font-black uppercase tracking-wider shadow">
                  COMBO FAMÍLIA
                </div>
                <div className="space-y-1.5 pt-4">
                  <span className="text-2xl">🍔🥤</span>
                  <h3 className="font-black text-sm text-white leading-tight">3 X-Saladas + Coca 1L</h3>
                  <p className="text-[11px] text-zinc-400 line-clamp-2">3 lanches completos no capricho + Coca-Cola 1 Litro bem gelada.</p>
                  <div className="pt-2">
                    <span className="text-[10px] text-zinc-500 block">Preço do Combo</span>
                    <span className="text-xl font-black font-mono text-[#FFC72C]">R$ 34,00</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const promo = products.find(p => p.id === 'dulci_promo_02');
                    if (promo) {
                      handleAddToCartDirect(promo);
                      playCashRegister();
                    }
                  }}
                  className="mt-3.5 w-full py-2.5 rounded-xl bg-[#DA291C] hover:bg-[#B91C1C] active:scale-95 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-red-950/50 transition-all cursor-pointer"
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-[#FFC72C]" />
                  <span>PEDIR COMBO</span>
                </button>
              </div>

              {/* Promoção 03 */}
              <div className="rounded-2xl p-4 bg-gradient-to-b from-[#220B0B] to-[#120505] border-2 border-[#DA291C] flex flex-col justify-between shadow-xl relative overflow-hidden group hover:border-[#FFC72C] transition-all">
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-[#00D26A] text-black text-[10px] font-black uppercase tracking-wider shadow">
                  COMBO ECONÔMICO
                </div>
                <div className="space-y-1.5 pt-4">
                  <span className="text-2xl">🍔🍺</span>
                  <h3 className="font-black text-sm text-white leading-tight">3 X-Saladas + Baré 1L</h3>
                  <p className="text-[11px] text-zinc-400 line-clamp-2">3 lanches artesanais + o autêntico Guaraná Baré 1 Litro de Manaus.</p>
                  <div className="pt-2">
                    <span className="text-[10px] text-zinc-500 block">Preço Especial</span>
                    <span className="text-xl font-black font-mono text-[#FFC72C]">R$ 32,00</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const promo = products.find(p => p.id === 'dulci_promo_03');
                    if (promo) {
                      handleAddToCartDirect(promo);
                      playCashRegister();
                    }
                  }}
                  className="mt-3.5 w-full py-2.5 rounded-xl bg-[#DA291C] hover:bg-[#B91C1C] active:scale-95 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-red-950/50 transition-all cursor-pointer"
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-[#FFC72C]" />
                  <span>PEDIR AGORA</span>
                </button>
              </div>

              {/* Promoção 04 */}
              <div className="rounded-2xl p-4 bg-gradient-to-b from-[#220B0B] to-[#120505] border-2 border-[#DA291C] flex flex-col justify-between shadow-xl relative overflow-hidden group hover:border-[#FFC72C] transition-all">
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-[#FF7A00] text-white text-[10px] font-black uppercase tracking-wider shadow">
                  MAIOR ECONOMIA
                </div>
                <div className="space-y-1.5 pt-4">
                  <span className="text-2xl">🍔🥤</span>
                  <h3 className="font-black text-sm text-white leading-tight">3 X-Saladas + Regente 1L</h3>
                  <p className="text-[11px] text-zinc-400 line-clamp-2">Trio de lanches artesanais + Guaraná Regente 1L trincando de gelado.</p>
                  <div className="pt-2">
                    <span className="text-[10px] text-zinc-500 block">Combo Econômico</span>
                    <span className="text-xl font-black font-mono text-[#FFC72C]">R$ 30,00</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const promo = products.find(p => p.id === 'dulci_promo_04');
                    if (promo) {
                      handleAddToCartDirect(promo);
                      playCashRegister();
                    }
                  }}
                  className="mt-3.5 w-full py-2.5 rounded-xl bg-[#DA291C] hover:bg-[#B91C1C] active:scale-95 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-red-950/50 transition-all cursor-pointer"
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-[#FFC72C]" />
                  <span>QUERO O COMBO</span>
                </button>
              </div>

              {/* Promoção 05 */}
              <div className="rounded-2xl p-4 bg-gradient-to-b from-[#220B0B] to-[#120505] border-2 border-[#DA291C] flex flex-col justify-between shadow-xl relative overflow-hidden group hover:border-[#FFC72C] transition-all">
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-[#DA291C] text-[#FFC72C] border border-[#FFC72C]/40 text-[10px] font-black uppercase tracking-wider shadow">
                  COMBO PRA GALERA
                </div>
                <div className="space-y-1.5 pt-4">
                  <span className="text-2xl">🍔🍔🍔🍔</span>
                  <h3 className="font-black text-sm text-white leading-tight">4 X-Saladas + Regente 1,5L</h3>
                  <p className="text-[11px] text-zinc-400 line-clamp-2">4 lanches caprichados com refrigerante 1,5L para toda a turma.</p>
                  <div className="pt-2">
                    <span className="text-[10px] text-zinc-500 block">Banquete da Turma</span>
                    <span className="text-xl font-black font-mono text-[#FFC72C]">R$ 40,00</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const promo = products.find(p => p.id === 'dulci_promo_05');
                    if (promo) {
                      handleAddToCartDirect(promo);
                      playCashRegister();
                    }
                  }}
                  className="mt-3.5 w-full py-2.5 rounded-xl bg-[#DA291C] hover:bg-[#B91C1C] active:scale-95 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-red-950/50 transition-all cursor-pointer"
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-[#FFC72C]" />
                  <span>PEDIR AGORA</span>
                </button>
              </div>
            </div>
          </div>

          {/* 1.2 BANNER OFICIAL: COMO FAZER SEU PEDIDO (5 PASSOS SIMPLES) */}
          <div className={`mt-4 p-4 sm:p-5 rounded-2xl border transition-all ${
            readingMode
              ? 'bg-white border-2 border-zinc-300 shadow-sm'
              : 'bg-[#14121A] border-zinc-800 shadow-xl'
          }`}>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#DA291C] to-[#FFC72C] flex items-center justify-center text-black font-black shadow-md shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className={`text-xs sm:text-sm font-black uppercase tracking-wide ${
                  readingMode ? 'text-zinc-950' : 'text-white'
                }`}>
                  Como Fazer seu Pedido
                </h3>
                <p className={`text-[11px] sm:text-xs ${
                  readingMode ? 'text-zinc-700 font-medium' : 'text-zinc-400'
                }`}>
                  “Escolha seus produtos, personalize do seu jeito, confira sua sacola e confirme. Assim que o pedido for enviado, nossa equipe começa a preparar.”
                </p>
              </div>
            </div>

            {/* Visual 5-step flow: 01 -> 02 -> 03 -> 04 -> 05 */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3 pt-3 border-t border-zinc-800/60">
              <div className={`p-2.5 rounded-xl border text-center flex flex-col items-center justify-center gap-1 ${
                readingMode ? 'bg-zinc-50 border-zinc-300' : 'bg-zinc-900/80 border-zinc-800'
              }`}>
                <span className="text-xs font-mono font-black text-[#DA291C]">01</span>
                <span className="text-lg">🍔</span>
                <span className={`text-[11px] font-bold leading-tight ${readingMode ? 'text-zinc-900' : 'text-zinc-200'}`}>
                  Escolha seus produtos
                </span>
              </div>

              <div className={`p-2.5 rounded-xl border text-center flex flex-col items-center justify-center gap-1 ${
                readingMode ? 'bg-zinc-50 border-zinc-300' : 'bg-zinc-900/80 border-zinc-800'
              }`}>
                <span className="text-xs font-mono font-black text-[#FFC72C]">02</span>
                <span className="text-lg">✨</span>
                <span className={`text-[11px] font-bold leading-tight ${readingMode ? 'text-zinc-900' : 'text-zinc-200'}`}>
                  Monte do seu jeito
                </span>
              </div>

              <div className={`p-2.5 rounded-xl border text-center flex flex-col items-center justify-center gap-1 ${
                readingMode ? 'bg-zinc-50 border-zinc-300' : 'bg-zinc-900/80 border-zinc-800'
              }`}>
                <span className="text-xs font-mono font-black text-[#FF7A00]">03</span>
                <span className="text-lg">🛍️</span>
                <span className={`text-[11px] font-bold leading-tight ${readingMode ? 'text-zinc-900' : 'text-zinc-200'}`}>
                  Confira seu pedido
                </span>
              </div>

              <div className={`p-2.5 rounded-xl border text-center flex flex-col items-center justify-center gap-1 ${
                readingMode ? 'bg-zinc-50 border-zinc-300' : 'bg-zinc-900/80 border-zinc-800'
              }`}>
                <span className="text-xs font-mono font-black text-[#00D26A]">04</span>
                <span className="text-lg">✅</span>
                <span className={`text-[11px] font-bold leading-tight ${readingMode ? 'text-zinc-900' : 'text-zinc-200'}`}>
                  Confirme
                </span>
              </div>

              <div className={`col-span-2 sm:col-span-1 p-2.5 rounded-xl border text-center flex flex-col items-center justify-center gap-1 ${
                readingMode ? 'bg-zinc-50 border-zinc-300' : 'bg-zinc-900/80 border-zinc-800'
              }`}>
                <span className="text-xs font-mono font-black text-[#00B8FF]">05</span>
                <span className="text-lg">👨‍🍳</span>
                <span className={`text-[11px] font-bold leading-tight ${readingMode ? 'text-zinc-900' : 'text-zinc-200'}`}>
                  Nossa cozinha prepara
                </span>
              </div>
            </div>
          </div>

          {/* DEDICATED PROMINENT DYNAMIC SEARCH BAR */}
          <div className="mt-4 pt-3 border-t border-zinc-800/60">
            <div className={`p-4 sm:p-5 rounded-2xl border transition-all duration-300 shadow-xl ${
              readingMode
                ? 'bg-white border-2 border-zinc-300 shadow-zinc-200'
                : 'bg-gradient-to-r from-[#140F13] via-[#100D12] to-[#140F13] border-zinc-700/80 shadow-black/40 ring-1 ring-white/5'
            }`}>
              {/* Header inside search bar card */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className={`p-1 rounded-lg ${readingMode ? 'bg-amber-100 text-amber-950' : 'bg-[#FFC72C]/20 text-[#FFC72C]'}`}>
                    <Search className="w-4 h-4" />
                  </div>
                  <span className={`text-xs font-black tracking-wide uppercase ${readingMode ? 'text-zinc-900' : 'text-zinc-200'}`}>
                    Pesquisa Instantânea no Cardápio
                  </span>
                  <span className={`hidden sm:inline-block w-1.5 h-1.5 rounded-full ${isSearching ? 'bg-[#FFC72C] animate-ping' : 'bg-emerald-500'}`} />
                </div>

                <div className="flex items-center gap-2 text-xs">
                  {isSearching ? (
                    <span className={`px-2.5 py-0.5 rounded-full font-black text-xs border ${
                      readingMode
                        ? 'bg-amber-100 text-amber-950 border-amber-400'
                        : 'bg-[#DA291C]/30 text-[#FFC72C] border-[#FFC72C]/40'
                    }`}>
                      {allMatchingProducts.length} {allMatchingProducts.length === 1 ? 'item encontrado' : 'itens encontrados'}
                    </span>
                  ) : (
                    <span className={`text-[11px] font-medium ${readingMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
                      {products.length} itens disponíveis em {categories.length} categorias
                    </span>
                  )}
                </div>
              </div>

              {/* Input wrapper */}
              <div className="relative">
                <Search className={`w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${
                  readingMode ? 'text-zinc-700' : isSearching ? 'text-[#FFC72C]' : 'text-zinc-400'
                }`} />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="O que você deseja saborear? Busque por nome (ex: Smash, Calabresa), ingrediente (bacon, catupiry) ou nº..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setSearchCategoryFilter('all');
                  }}
                  className={`w-full pl-11 pr-24 py-3 sm:py-3.5 rounded-xl text-sm font-medium transition-all outline-none ${
                    readingMode
                      ? 'bg-zinc-50 border-2 border-zinc-400 text-zinc-950 placeholder-zinc-500 font-bold focus:border-black focus:bg-white shadow-xs'
                      : 'bg-zinc-900/90 border border-zinc-700/90 focus:border-[#FFC72C] focus:ring-2 focus:ring-[#FFC72C]/30 placeholder-zinc-500 text-white shadow-inner'
                  }`}
                />

                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  {/* Shortcut key hint */}
                  <kbd className={`hidden md:inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-mono font-bold rounded border ${
                    readingMode
                      ? 'bg-zinc-100 text-zinc-600 border-zinc-300'
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                  }`} title="Pressione / para focar a barra de pesquisa">
                    /
                  </kbd>

                  {/* Clear button */}
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm('');
                        setSearchCategoryFilter('all');
                        searchInputRef.current?.focus();
                      }}
                      className={`p-1.5 rounded-lg flex items-center gap-1 text-xs font-bold transition-all cursor-pointer ${
                        readingMode
                          ? 'bg-zinc-200 hover:bg-zinc-300 text-zinc-900'
                          : 'bg-zinc-800 hover:bg-[#DA291C] text-zinc-300 hover:text-white'
                      }`}
                      title="Limpar pesquisa"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline text-[11px]">Limpar</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Search Tags Suggestions */}
              <div className="mt-3 flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
                <span className={`text-[11px] font-bold shrink-0 mr-1 flex items-center gap-1 ${
                  readingMode ? 'text-zinc-700' : 'text-zinc-400'
                }`}>
                  <Sparkles className="w-3 h-3 text-[#FFC72C]" />
                  Sugestões:
                </span>
                {quickSearchTags.map((tag) => {
                  const isActive = searchTerm.toLowerCase() === tag.query.toLowerCase();
                  return (
                    <button
                      key={tag.query}
                      type="button"
                      onClick={() => handleQuickTagClick(tag.query)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer border ${
                        isActive
                          ? readingMode
                            ? 'bg-black text-amber-300 border-black shadow-xs font-black'
                            : 'bg-[#DA291C] text-white border-[#FFC72C] shadow-md shadow-red-950/40'
                          : readingMode
                          ? 'bg-zinc-100 hover:bg-amber-100 text-zinc-900 border-zinc-300'
                          : 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border-zinc-800'
                      }`}
                    >
                      {tag.label}
                    </button>
                  );
                })}
              </div>

              {/* Active search filter status */}
              {isSearching && (
                <div className="mt-2 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className={readingMode ? 'text-zinc-700' : 'text-zinc-400'}>
                      Filtrando cardápio por:
                    </span>
                    <strong className={readingMode ? 'text-zinc-950 font-black' : 'text-[#FFC72C] font-black'}>
                      "{searchTerm}"
                    </strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setSearchCategoryFilter('all');
                    }}
                    className={`text-[11px] font-bold hover:underline cursor-pointer ${
                      readingMode ? 'text-[#DA291C]' : 'text-amber-400'
                    }`}
                  >
                    Restaurar cardápio completo
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* READING MODE ACCESSIBILITY BAR */}
      {readingMode && (
        <div className="bg-amber-100/95 border-b-2 border-amber-300 px-4 py-2.5 text-zinc-950 shadow-sm sticky top-0 z-40 backdrop-blur-md">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-amber-400 text-black font-black">
                <Sun className="w-4 h-4" />
              </span>
              <span className="font-black text-zinc-950">
                Modo de Leitura Ativo • Alto Contraste para Luz Solar / Ambientes Claros
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-zinc-800 font-bold flex items-center gap-1">
                <Type className="w-4 h-4 text-zinc-700" /> Tamanho da Fonte:
              </span>
              <div className="flex items-center bg-white rounded-xl p-0.5 border-2 border-zinc-400 shadow-inner">
                <button
                  type="button"
                  onClick={() => handleSetFontSizeScale('normal')}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    fontSizeScale === 'normal'
                      ? 'bg-[#DA291C] text-white shadow-sm'
                      : 'text-zinc-700 hover:text-black hover:bg-zinc-100'
                  }`}
                  title="Fonte Normal (16px)"
                >
                  A (Normal)
                </button>
                <button
                  type="button"
                  onClick={() => handleSetFontSizeScale('large')}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    fontSizeScale === 'large'
                      ? 'bg-[#DA291C] text-white shadow-sm'
                      : 'text-zinc-700 hover:text-black hover:bg-zinc-100'
                  }`}
                  title="Fonte Grande (18px)"
                >
                  A+ (Grande)
                </button>
                <button
                  type="button"
                  onClick={() => handleSetFontSizeScale('extra-large')}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    fontSizeScale === 'extra-large'
                      ? 'bg-[#DA291C] text-white shadow-sm'
                      : 'text-zinc-700 hover:text-black hover:bg-zinc-100'
                  }`}
                  title="Fonte Extra Grande (22px)"
                >
                  A++ (Máximo)
                </button>
              </div>

              <button
                type="button"
                onClick={toggleReadingMode}
                className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm ml-1 active:scale-95"
              >
                <Moon className="w-3.5 h-3.5 text-[#FFC72C]" />
                <span>Voltar ao Tema Escuro</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1.5 STORIES CIRCULARES DE CATEGORIAS (MOBILE & DESKTOP ULTRA-RÁPIDO) */}
      <div className={`border-b py-3.5 shadow-md relative z-20 transition-colors duration-200 ${
        readingMode
          ? 'bg-white border-zinc-300'
          : 'bg-[#0D0D14]/95 border-zinc-800/90'
      }`}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between mb-2.5">
            <div className={`flex items-center gap-2 text-xs font-black uppercase tracking-wider ${
              readingMode ? 'text-zinc-900' : 'text-white'
            }`}>
              <Sparkles className={`w-3.5 h-3.5 ${readingMode ? 'text-[#DA291C]' : 'text-[#FFC72C] animate-pulse'}`} />
              <span>Navegação Rápida • Categorias</span>
            </div>
            <button
              type="button"
              onClick={() => {
                playBeep(850, 0.03);
                setIsQuickIndexOpen(true);
              }}
              className={`text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer px-2.5 py-1 rounded-lg border ${
                readingMode
                  ? 'bg-zinc-100 text-zinc-900 border-zinc-400 hover:bg-zinc-200'
                  : 'bg-zinc-900/80 text-[#FFC72C] hover:text-[#FFE600] border-zinc-800 hover:border-[#FFC72C]/40'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Ver Índice ({categories.length})</span>
            </button>
          </div>

          {isMenuLoading ? (
            <StoriesBarSkeleton readingMode={readingMode} />
          ) : (
            <div
              ref={storiesScrollRef}
              className="flex items-start gap-3.5 sm:gap-5 overflow-x-auto pb-1 scrollbar-none snap-x snap-mandatory touch-pan-x"
            >
              {/* "Todos" Circular Story */}
              <motion.button
                data-story-id="all"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.94 }}
                onClick={() => handleSelectCategory('all')}
                className="flex flex-col items-center gap-1.5 shrink-0 snap-start cursor-pointer group focus:outline-none"
              >
                <div
                  className={`p-[2.5px] rounded-full transition-all duration-300 ${
                    activeCategory === 'all'
                      ? 'bg-gradient-to-tr from-[#DA291C] via-[#FF6B00] to-[#FFC72C] shadow-[0_0_16px_rgba(255,199,44,0.55)] scale-105 ring-2 ring-[#FFC72C]/50'
                      : readingMode
                        ? 'bg-zinc-300 group-hover:bg-zinc-400'
                        : 'bg-zinc-800 group-hover:bg-zinc-700'
                  }`}
                >
                  <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-zinc-950 p-0.5 relative overflow-hidden flex items-center justify-center border-2 border-black">
                    <img
                      src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=300&auto=format&fit=crop&q=80"
                      alt="Todos os Pratos"
                      className="w-full h-full object-cover rounded-full group-hover:scale-110 transition-transform duration-300 filter brightness-95"
                      loading="eager"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-[#FFC72C] drop-shadow-[0_2px_8px_rgba(255,199,44,0.8)]" />
                    </div>
                    {/* Category icon badge pegged at bottom-right */}
                    <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-[#DA291C] text-[#FFC72C] border-2 border-black flex items-center justify-center shadow-md">
                      <UtensilsCrossed className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
                <span
                  className={`text-[11px] sm:text-xs font-black text-center truncate max-w-[76px] sm:max-w-[84px] transition-colors ${
                    activeCategory === 'all'
                      ? readingMode ? 'text-[#DA291C]' : 'text-[#FFC72C]'
                      : readingMode ? 'text-zinc-900 group-hover:text-black' : 'text-zinc-300 group-hover:text-white'
                  }`}
                >
                  Todos
                </span>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full border font-bold ${
                  readingMode
                    ? 'bg-zinc-100 text-zinc-900 border-zinc-400'
                    : 'bg-black/90 text-zinc-400 border-zinc-800'
                }`}>
                  {products.length} itens
                </span>
              </motion.button>

              {/* Each Category Story */}
              {categories.map((cat) => {
                const details = getCategoryDetails(cat);
                const count = products.filter((p) => p.category === cat.id).length;
                const isActive = activeCategory === cat.id;

                return (
                  <motion.button
                    key={cat.id}
                    data-story-id={cat.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => handleSelectCategory(cat.id)}
                    className="flex flex-col items-center gap-1.5 shrink-0 snap-start cursor-pointer group focus:outline-none"
                  >
                    {/* Outer gradient story ring */}
                    <div
                      className={`p-[2.5px] rounded-full transition-all duration-300 ${
                        isActive
                          ? 'bg-gradient-to-tr from-[#DA291C] via-[#FF6B00] to-[#FFC72C] shadow-[0_0_16px_rgba(255,199,44,0.55)] scale-105 ring-2 ring-[#FFC72C]/50'
                          : readingMode
                            ? 'bg-zinc-300 group-hover:bg-zinc-400'
                            : 'bg-zinc-800 group-hover:bg-zinc-700'
                      }`}
                    >
                      <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-zinc-950 p-0.5 relative overflow-hidden border-2 border-black">
                        <img
                          src={details.imageUrl}
                          alt={cat.name}
                          className="w-full h-full object-cover rounded-full group-hover:scale-110 transition-transform duration-300"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                        
                        {/* Pegged Category Icon Badge at Bottom-Right */}
                        <div
                          className={`absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full border-2 border-black flex items-center justify-center shadow-md transition-transform ${
                            isActive
                              ? 'bg-[#FFC72C] text-black scale-110'
                              : 'bg-[#DA291C] text-[#FFC72C] group-hover:scale-105'
                          }`}
                        >
                          {getCategoryIcon(cat.icon, 'w-3 h-3')}
                        </div>
                      </div>
                    </div>

                    {/* Category Name */}
                    <span
                      className={`text-[11px] sm:text-xs font-black text-center truncate max-w-[76px] sm:max-w-[84px] transition-colors ${
                        isActive
                          ? readingMode ? 'text-[#DA291C]' : 'text-[#FFC72C]'
                          : readingMode ? 'text-zinc-900 group-hover:text-black font-bold' : 'text-zinc-300 group-hover:text-white'
                      }`}
                    >
                      {getCategoryShortName(cat.name)}
                    </span>

                    {/* Item count or starting price */}
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full border font-bold ${
                        isActive
                          ? readingMode
                            ? 'bg-red-100 text-red-950 border-red-400'
                            : 'bg-[#DA291C]/30 text-[#FFC72C] border-[#FFC72C]/40'
                          : readingMode
                            ? 'bg-zinc-100 text-zinc-900 border-zinc-400'
                            : 'bg-black/90 text-zinc-400 border-zinc-800'
                      }`}
                    >
                      {count} {count === 1 ? 'item' : 'itens'}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 2. VISUAL CATEGORY SHOWCASE (CAROUSEL & BENTO GRID MODES) */}
      <div className="max-w-6xl mx-auto px-4 pt-6 pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-[#DA291C] to-[#FFC72C] text-black shadow-lg shadow-red-950/30">
              <ChefHat className="w-5 h-5 font-black" />
            </div>
            <div>
              <h2 className={`text-lg sm:text-xl font-black tracking-tight uppercase flex items-center gap-2 ${
                readingMode ? 'text-zinc-950' : 'text-white'
              }`}>
                Explorar Categorias
                <span className={`text-[11px] font-normal px-2 py-0.5 rounded-full border ${
                  readingMode
                    ? 'bg-amber-100 text-amber-950 border-amber-300 font-bold'
                    : 'bg-[#FFC72C]/15 text-[#FFC72C] border-[#FFC72C]/30'
                }`}>
                  {categories.length} Seções
                </span>
              </h2>
              <p className={`text-xs ${readingMode ? 'text-zinc-700 font-medium' : 'text-zinc-400'}`}>
                Fotos reais, descrições detalhadas e navegação instantânea
              </p>
            </div>
          </div>

          {/* View Mode Switcher & Carousel Controls */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {categoryViewMode === 'carousel' && (
              <div className={`hidden sm:flex items-center gap-1 p-1 rounded-xl border ${
                readingMode
                  ? 'bg-zinc-100 border-zinc-300'
                  : 'bg-zinc-900/90 border-zinc-800'
              }`}>
                <button
                  onClick={() => handleScrollCarousel('left')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    readingMode ? 'text-zinc-700 hover:text-black hover:bg-zinc-200' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }`}
                  title="Rolar para esquerda"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleScrollCarousel('right')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    readingMode ? 'text-zinc-700 hover:text-black hover:bg-zinc-200' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }`}
                  title="Rolar para direita"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className={`flex items-center p-1 rounded-xl border text-xs ${
              readingMode
                ? 'bg-zinc-100 border-zinc-300'
                : 'bg-zinc-900/90 border-zinc-800'
            }`}>
              <button
                onClick={() => {
                  playBeep(800, 0.03);
                  setCategoryViewMode('carousel');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  categoryViewMode === 'carousel'
                    ? 'bg-[#DA291C] text-white shadow-md'
                    : readingMode
                      ? 'text-zinc-700 hover:text-black'
                      : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span>Carrossel</span>
              </button>

              <button
                onClick={() => {
                  playBeep(800, 0.03);
                  setCategoryViewMode('bento');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  categoryViewMode === 'bento'
                    ? 'bg-[#DA291C] text-white shadow-md'
                    : readingMode
                      ? 'text-zinc-700 hover:text-black'
                      : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Vitrine com Fotos</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2.1 CAROUSEL / BENTO MODE OR SKELETON SCREEN */}
        {isMenuLoading ? (
          <CategoryShowcaseSkeleton readingMode={readingMode} viewMode={categoryViewMode} />
        ) : categoryViewMode === 'carousel' ? (
          <div
            ref={categoryScrollRef}
            className="flex items-stretch gap-3 overflow-x-auto pb-3 pt-1 scrollbar-none scroll-smooth snap-x"
          >
            {/* "Todos os Pratos" Story Card */}
            <motion.button
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelectCategory('all')}
              className={`shrink-0 w-32 sm:w-36 rounded-2xl p-3 flex flex-col items-center justify-between text-center transition-all cursor-pointer relative overflow-hidden border snap-start ${
                activeCategory === 'all'
                  ? 'bg-gradient-to-b from-[#DA291C] to-[#911208] text-white border-[#FFC72C] shadow-lg shadow-red-950/50'
                  : readingMode
                    ? 'bg-white text-zinc-900 hover:bg-zinc-100 border-2 border-zinc-300'
                    : 'bg-zinc-900/90 text-zinc-300 hover:bg-zinc-800/90 border-zinc-800/90 hover:border-zinc-700'
              }`}
            >
              <div className="relative mb-2">
                <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center transition-all ${
                  activeCategory === 'all'
                    ? 'bg-[#FFC72C] text-black shadow-lg shadow-amber-500/30'
                    : readingMode
                      ? 'bg-zinc-100 text-[#DA291C] border border-zinc-300'
                      : 'bg-zinc-800 text-[#FFC72C] border border-zinc-700'
                }`}>
                  <Sparkles className="w-7 h-7" />
                </div>
                <span className={`absolute -bottom-1 -right-1 px-1.5 py-0.5 text-[9px] font-black rounded-full font-mono ${
                  readingMode
                    ? 'bg-zinc-900 text-amber-300 border border-zinc-800'
                    : 'bg-black text-[#FFC72C] border border-zinc-700'
                }`}>
                  {products.length}
                </span>
              </div>
              <div>
                <p className="font-black text-xs sm:text-sm line-clamp-1">Todos os Pratos</p>
                <p className={`text-[10px] mt-0.5 ${readingMode ? 'text-zinc-600 font-semibold' : 'text-zinc-400'}`}>Cardápio Completo</p>
              </div>
              {activeCategory === 'all' && (
                <div className="w-6 h-1 rounded-full bg-[#FFC72C] mt-2" />
              )}
            </motion.button>

            {/* Individual Categories in Carousel */}
            {categories.map((cat) => {
              const details = getCategoryDetails(cat);
              const count = products.filter((p) => p.category === cat.id).length;
              const isActive = activeCategory === cat.id;

              return (
                <motion.button
                  key={cat.id}
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelectCategory(cat.id)}
                  className={`shrink-0 w-36 sm:w-40 rounded-2xl p-2.5 flex flex-col justify-between text-left transition-all cursor-pointer relative overflow-hidden border snap-start group ${
                    isActive
                      ? readingMode
                        ? 'bg-white border-2 border-[#DA291C] shadow-lg ring-2 ring-red-400/40'
                        : 'bg-zinc-900 border-[#FFC72C] shadow-xl shadow-red-950/40 ring-2 ring-[#FFC72C]/40'
                      : readingMode
                        ? 'bg-white hover:bg-zinc-50 border-2 border-zinc-300'
                        : 'bg-zinc-900/80 hover:bg-zinc-800/90 border-zinc-800/80 hover:border-zinc-700'
                  }`}
                >
                  {/* High Quality Food Image with Rounded Aspect Ratio */}
                  <div className="relative w-full h-24 sm:h-28 rounded-xl overflow-hidden mb-2 bg-zinc-950">
                    <img
                      src={details.imageUrl}
                      alt={cat.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                    
                    {/* Glowing Category Icon Badge */}
                    <div className={`absolute top-2 left-2 p-1.5 rounded-lg backdrop-blur-md border ${
                      isActive
                        ? 'bg-[#DA291C] text-[#FFC72C] border-[#FFC72C]/60 shadow-lg'
                        : 'bg-black/60 text-white border-white/20'
                    }`}>
                      {getCategoryIcon(cat.icon, 'w-3.5 h-3.5')}
                    </div>

                    {/* Count badge */}
                    <span className="absolute bottom-1.5 right-1.5 px-2 py-0.5 text-[10px] font-black rounded-md bg-black/80 text-[#FFC72C] border border-zinc-700/60 font-mono backdrop-blur-sm">
                      {count} {count === 1 ? 'item' : 'itens'}
                    </span>
                  </div>

                  {/* Category Title, Starting Price & Badge */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <h3 className={`font-black text-xs sm:text-sm line-clamp-1 ${
                        isActive
                          ? readingMode ? 'text-[#DA291C]' : 'text-[#FFC72C]'
                          : readingMode ? 'text-zinc-950 group-hover:text-[#DA291C]' : 'text-white group-hover:text-[#FFC72C]'
                      } transition-colors`}>
                        {cat.name}
                      </h3>
                    </div>
                    {details.startingPrice ? (
                      <span className={`text-[10px] font-mono font-bold block ${
                        readingMode ? 'text-[#B81F14]' : 'text-[#FFC72C]'
                      }`}>
                        A partir de {formatBRL(details.startingPrice)}
                      </span>
                    ) : details.badge ? (
                      <span className={`inline-block text-[9px] font-semibold truncate max-w-full ${
                        readingMode ? 'text-zinc-600' : 'text-zinc-400'
                      }`}>
                        {details.badge}
                      </span>
                    ) : null}
                  </div>

                  {/* Active Indicator Bar */}
                  {isActive && (
                    <div className="w-full h-1 rounded-full bg-gradient-to-r from-[#DA291C] to-[#FFC72C] mt-2" />
                  )}
                </motion.button>
              );
            })}
          </div>
        ) : (
          /* 2.2 BENTO GRID SHOWCASE WITH HIGH QUALITY IMAGES */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 py-2">
            {categories.map((cat) => {
              const details = getCategoryDetails(cat);
              const count = products.filter((p) => p.category === cat.id).length;
              const isActive = activeCategory === cat.id;

              return (
                <motion.div
                  key={cat.id}
                  whileHover={{ y: -3 }}
                  onClick={() => handleSelectCategory(cat.id)}
                  className={`group relative rounded-2xl overflow-hidden border cursor-pointer transition-all duration-300 h-48 flex flex-col justify-end p-4 shadow-lg ${
                    isActive
                      ? readingMode
                        ? 'border-2 border-[#DA291C] ring-2 ring-red-400/40 shadow-xl'
                        : 'border-[#FFC72C] ring-2 ring-[#FFC72C]/40 shadow-red-950/60'
                      : readingMode
                        ? 'border-2 border-zinc-300 hover:border-black'
                        : 'border-zinc-800 hover:border-[#FFC72C]/50 hover:shadow-xl'
                  }`}
                >
                  {/* Background High-Definition Photography */}
                  <img
                    src={details.imageUrl}
                    alt={cat.name}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />

                  {/* Multi-layered dark gradient for high legibility */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30 group-hover:via-black/50 transition-colors" />

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/75 backdrop-blur-md border border-white/15 text-[#FFC72C] text-xs font-bold shadow-md">
                      {getCategoryIcon(cat.icon, 'w-3.5 h-3.5 text-[#FFC72C]')}
                      <span>{details.badge}</span>
                    </div>

                    <span className="px-2 py-0.5 rounded-lg bg-black/80 backdrop-blur-md text-white text-[11px] font-mono font-bold border border-zinc-700">
                      {count} {count === 1 ? 'prato' : 'pratos'}
                    </span>
                  </div>

                  {/* Bottom Information */}
                  <div className="relative z-10 space-y-1.5">
                    <h3 className="text-base sm:text-lg font-black text-white group-hover:text-[#FFC72C] transition-colors leading-tight">
                      {cat.name}
                    </h3>
                    <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed opacity-90">
                      {details.desc}
                    </p>

                    <div className="flex items-center justify-between pt-1 text-xs">
                      {details.startingPrice ? (
                        <span className="text-[#FFC72C] font-bold">
                          A partir de <strong className="font-black text-sm">{formatBRL(details.startingPrice)}</strong>
                        </span>
                      ) : (
                        <span className="text-zinc-400">Ver opções</span>
                      )}

                      <span className="flex items-center gap-1 text-[11px] font-bold text-white group-hover:text-[#FFC72C] transition-colors">
                        <span>Explorar</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. STICKY CATEGORY NAVIGATOR WITH FAST-FOOD BADGES & HIGH-RES MINI AVATARS */}
      <div className={`sticky top-0 z-30 backdrop-blur-md py-2 transition-colors duration-200 border-y ${
        readingMode
          ? 'bg-white/95 border-zinc-300 shadow-md'
          : 'bg-[#0A0A0E]/95 border-zinc-800/80 shadow-2xl'
      }`}>
        <div className="max-w-6xl mx-auto px-4 flex items-center gap-2">
          {/* Quick Reading Mode toggle button in Sticky bar */}
          <button
            type="button"
            onClick={toggleReadingMode}
            className={`shrink-0 p-2 sm:px-3 sm:py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer text-xs font-black shadow-sm group active:scale-95 border ${
              readingMode
                ? 'bg-amber-400 text-black border-black hover:bg-amber-500 ring-1 ring-amber-300'
                : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border-zinc-700/80'
            }`}
            title="Alternar Modo de Leitura (Alto Contraste)"
          >
            {readingMode ? (
              <>
                <Moon className="w-4 h-4 text-black" />
                <span className="hidden sm:inline">Tema Escuro</span>
              </>
            ) : (
              <>
                <Sun className="w-4 h-4 text-[#FFC72C]" />
                <span className="hidden sm:inline">Leitura</span>
              </>
            )}
          </button>

          {/* Quick Index trigger button */}
          <button
            type="button"
            onClick={() => {
              playBeep(850, 0.04);
              setIsQuickIndexOpen(true);
            }}
            className={`shrink-0 p-2 sm:px-3 sm:py-2 rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer text-xs font-black shadow-sm group active:scale-95 ${
              readingMode
                ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border-zinc-300'
                : 'bg-zinc-900/90 hover:bg-[#DA291C] text-zinc-300 hover:text-white border-zinc-700/80'
            }`}
            title="Abrir Índice Completo de Categorias"
          >
            <Layers className={`w-4 h-4 ${readingMode ? 'text-[#DA291C]' : 'text-[#FFC72C] group-hover:text-white'} transition-colors`} />
            <span className="hidden sm:inline">Índice</span>
          </button>

          {/* Quick Reload / Refresh menu button */}
          <button
            type="button"
            onClick={handleRefreshMenu}
            disabled={isMenuLoading}
            className={`shrink-0 p-2 sm:px-3 sm:py-2 rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer text-xs font-black shadow-sm group active:scale-95 ${
              readingMode
                ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border-zinc-300'
                : 'bg-zinc-900/90 hover:bg-[#DA291C] text-zinc-300 hover:text-white border-zinc-700/80'
            }`}
            title="Atualizar Cardápio (Ver animação Skeleton)"
          >
            <RefreshCw className={`w-4 h-4 ${isMenuLoading ? 'animate-spin text-[#DA291C]' : readingMode ? 'text-[#DA291C]' : 'text-[#FFC72C]'} transition-transform`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>

          {/* Horizontal Scrollable Pills or Skeleton */}
          {isMenuLoading ? (
            <div className="flex-1 overflow-hidden">
              <StickyCategoryNavSkeleton readingMode={readingMode} />
            </div>
          ) : (
            <div
              ref={stickyNavRef}
              className="flex-1 flex items-center gap-2 overflow-x-auto scrollbar-none scroll-smooth py-0.5"
            >
              {/* Todos os Pratos Button */}
              <button
                data-cat-id="all"
                onClick={() => handleSelectCategory('all')}
                className={`flex items-center gap-2 px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  readingMode
                    ? activeCategory === 'all'
                      ? 'bg-[#DA291C] text-white shadow-md scale-102 border-2 border-black font-black'
                      : 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200 border-2 border-zinc-300 font-bold'
                    : activeCategory === 'all'
                      ? 'bg-gradient-to-r from-[#DA291C] to-[#E31837] text-white shadow-lg shadow-red-600/40 scale-102 border-2 border-[#FFC72C]'
                      : 'bg-zinc-900/90 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800/60'
                }`}
              >
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#FFC72C]/20 border border-[#FFC72C]/40 flex items-center justify-center shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-[#FFC72C]" />
                </div>
                <span>Todos os Pratos</span>
                <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-mono ${
                  readingMode
                    ? activeCategory === 'all' ? 'bg-black text-white font-bold' : 'bg-zinc-200 text-zinc-900 font-bold'
                    : activeCategory === 'all' ? 'bg-black/40 text-[#FFC72C] font-bold' : 'bg-black/30 text-zinc-300'
                }`}>
                  {products.length}
                </span>
              </button>

              {/* Each Category Pill with High-Quality Mini Thumbnail & Icon */}
              {categories.map((cat) => {
                const details = getCategoryDetails(cat);
                const count = products.filter((p) => p.category === cat.id).length;
                const isActive = activeCategory === cat.id;

                return (
                  <button
                    key={cat.id}
                    data-cat-id={cat.id}
                    onClick={() => handleSelectCategory(cat.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                      readingMode
                        ? isActive
                          ? 'bg-[#DA291C] text-white shadow-md scale-102 border-2 border-black font-black'
                          : 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200 border-2 border-zinc-300 font-bold'
                        : isActive
                          ? 'bg-gradient-to-r from-[#DA291C] to-[#E31837] text-white shadow-lg shadow-red-600/40 scale-102 border-2 border-[#FFC72C]'
                          : 'bg-zinc-900/90 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800/60'
                    }`}
                  >
                    {/* High Quality Mini Image Thumbnail Avatar with Glow */}
                    <div className="relative w-6 h-6 sm:w-7 sm:h-7 rounded-full overflow-hidden shrink-0 border border-white/25 shadow-sm">
                      <img
                        src={details.imageUrl}
                        alt={cat.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/10" />
                    </div>

                    <span className={isActive ? (readingMode ? 'text-white' : 'text-[#FFC72C]') : (readingMode ? 'text-zinc-800' : 'text-zinc-400')}>
                      {getCategoryIcon(cat.icon, 'w-3.5 h-3.5')}
                    </span>

                    <span>{cat.name}</span>

                    {count > 0 && (
                      <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-mono ${
                        readingMode
                          ? isActive ? 'bg-black text-white font-bold' : 'bg-zinc-200 text-zinc-900 font-bold'
                          : isActive ? 'bg-black/40 text-[#FFC72C] font-bold' : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Compact Sticky Search Bar */}
          <div className="relative shrink-0 w-36 sm:w-52 md:w-64">
            <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
              readingMode ? 'text-zinc-700' : isSearching ? 'text-[#FFC72C]' : 'text-zinc-400'
            }`} />
            <input
              ref={stickySearchInputRef}
              type="text"
              placeholder="Buscar prato ou nº..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setSearchCategoryFilter('all');
              }}
              className={`w-full pl-8 pr-7 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all outline-none ${
                readingMode
                  ? 'bg-zinc-100 border-2 border-zinc-300 text-zinc-950 placeholder-zinc-500 focus:border-black focus:bg-white'
                  : 'bg-zinc-900/90 border border-zinc-700/80 text-white placeholder-zinc-500 focus:border-[#FFC72C] focus:ring-1 focus:ring-[#FFC72C]'
              }`}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSearchCategoryFilter('all');
                }}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full ${
                  readingMode ? 'text-zinc-700 hover:text-black' : 'text-zinc-400 hover:text-white'
                }`}
                title="Limpar pesquisa"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. EXTENSIVE LIST-FORMAT MENU (MCDONALD'S / CLUBE PIZZARIA / BURGUER GOURMET STYLE) */}
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-12">
        {isMenuLoading ? (
          <div className="space-y-12">
            <ProductSectionSkeleton readingMode={readingMode} count={4} />
            <ProductSectionSkeleton readingMode={readingMode} count={4} />
          </div>
        ) : products.length === 0 ? (
          /* EMPTY STATE WHEN RESTAURANT HAS NO REGISTERED PRODUCTS YET */
          <div className="text-center py-20 px-6 rounded-3xl border border-zinc-800/80 bg-[#121218]/90 max-w-xl mx-auto shadow-2xl space-y-5">
            <div className="w-20 h-20 rounded-3xl mx-auto bg-gradient-to-tr from-[#DA291C]/20 to-[#FFC72C]/20 border border-[#FFC72C]/30 flex items-center justify-center text-[#FFC72C] shadow-lg">
              <UtensilsCrossed className="w-10 h-10 animate-bounce" />
            </div>
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-[#FFC72C] bg-[#FFC72C]/10 px-3 py-1 rounded-full border border-[#FFC72C]/20">
                Cardápio em Preparação
              </span>
              <h2 className="text-2xl font-black text-white">Nenhum produto cadastrado.</h2>
              <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
                Cadastre seus lanches, bebidas com variações (lata, 1L, 2L) e pratos na área de <strong>Gestão → Produtos</strong> para que apareçam automaticamente aqui no Cardápio Online.
              </p>
            </div>
            <button
              onClick={() => setCurrentView('cardapio_bcg')}
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-[#DA291C] to-[#FF7A00] hover:brightness-110 text-white font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ Cadastrar produto</span>
            </button>
          </div>
        ) : isSearching ? (
          /* DEDICATED INSTANT SEARCH RESULTS VIEW */
          <section className="space-y-6">
            {/* Search Results Header */}
            <div className={`p-5 sm:p-6 rounded-2xl border shadow-xl ${
              readingMode
                ? 'bg-white border-2 border-zinc-300'
                : 'bg-gradient-to-r from-[#171114] via-[#120F12] to-[#0E0B10] border-zinc-800 ring-1 ring-white/5'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                    readingMode
                      ? 'bg-amber-100 text-amber-950 border-2 border-amber-300'
                      : 'bg-[#FFC72C]/20 text-[#FFC72C] border border-[#FFC72C]/40'
                  }`}>
                    <Search className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className={`text-xl sm:text-2xl font-black tracking-tight ${
                        readingMode ? 'text-zinc-950' : 'text-white'
                      }`}>
                        Resultados para "{searchTerm}"
                      </h2>
                      <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                        readingMode
                          ? 'bg-amber-100 text-amber-950 border-amber-400'
                          : 'bg-[#DA291C]/30 text-[#FFC72C] border-[#FFC72C]/40'
                      }`}>
                        {searchMatchingProducts.length} {searchMatchingProducts.length === 1 ? 'item encontrado' : 'itens encontrados'}
                      </span>
                    </div>
                    <p className={`text-xs mt-1 ${readingMode ? 'text-zinc-700 font-medium' : 'text-zinc-400'}`}>
                      Busca dinâmica instantânea em nomes, descrições, ingredientes e números dos itens.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setSearchCategoryFilter('all');
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-black border transition-all flex items-center gap-1.5 self-start sm:self-center cursor-pointer shadow-sm active:scale-95 ${
                    readingMode
                      ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border-zinc-300'
                      : 'bg-zinc-900 hover:bg-[#DA291C] text-zinc-200 hover:text-white border-zinc-700'
                  }`}
                >
                  <X className="w-4 h-4" />
                  <span>Limpar Busca</span>
                </button>
              </div>

              {/* Subcategory Filter Pills for Search Results */}
              {availableSearchCategories.length > 1 && (
                <div className="flex items-center gap-2 pt-4 border-t mt-4 overflow-x-auto scrollbar-none">
                  <span className={`text-[11px] font-bold shrink-0 ${readingMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
                    Filtrar resultados:
                  </span>
                  <button
                    type="button"
                    onClick={() => setSearchCategoryFilter('all')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      searchCategoryFilter === 'all'
                        ? 'bg-[#DA291C] text-white shadow-sm'
                        : readingMode
                        ? 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    Todos ({allMatchingProducts.length})
                  </button>
                  {availableSearchCategories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSearchCategoryFilter(cat.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                        searchCategoryFilter === cat.id
                          ? 'bg-[#DA291C] text-white shadow-sm font-black'
                          : readingMode
                          ? 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200'
                          : 'bg-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <span>{cat.name}</span>
                      <span className="text-[10px] opacity-80">({cat.count})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Matching items or friendly empty state */}
            {searchMatchingProducts.length === 0 ? (
              <div className={`text-center py-16 px-4 rounded-3xl border ${
                readingMode
                  ? 'bg-white border-2 border-zinc-300'
                  : 'bg-zinc-900/40 border-zinc-800/80'
              }`}>
                <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center bg-[#DA291C]/10 text-[#DA291C] border border-[#DA291C]/20 mb-4">
                  <Search className="w-8 h-8 opacity-60" />
                </div>
                <h3 className={`text-lg font-black mb-1 ${readingMode ? 'text-zinc-950' : 'text-white'}`}>
                  Nenhum item encontrado para "{searchTerm}"
                </h3>
                <p className={`text-xs max-w-md mx-auto mb-5 leading-relaxed ${
                  readingMode ? 'text-zinc-700 font-medium' : 'text-zinc-400'
                }`}>
                  Não encontramos nenhum prato correspondente a este termo. Que tal experimentar uma dessas sugestões populares?
                </p>

                {/* Suggestion pills */}
                <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto mb-6">
                  {['Smash', 'Calabresa', 'Bacon', 'Catupiry', 'Fritas', 'Chocolate', 'Açaí', 'Coca-Cola'].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        setSearchTerm(tag);
                        setSearchCategoryFilter('all');
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        readingMode
                          ? 'bg-zinc-100 hover:bg-amber-100 text-zinc-900 border-zinc-300'
                          : 'bg-zinc-800/80 hover:bg-zinc-700 text-[#FFC72C] border-zinc-700'
                      }`}
                    >
                      + {tag}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setSearchCategoryFilter('all');
                  }}
                  className="px-5 py-2.5 bg-[#DA291C] hover:bg-[#FFC72C] hover:text-black text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-lg active:scale-95"
                >
                  Ver Cardápio Completo
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {searchMatchingProducts.map((product) => (
                  <ProductListItem
                    key={product.id}
                    product={product}
                    category={categories.find((c) => c.id === product.category)}
                    onCustomize={() => handleOpenCustomize(product)}
                    onQuickAdd={(e) => handleQuickAdd(product, e)}
                    readingMode={readingMode}
                    fontSizeScale={fontSizeScale}
                    searchQuery={searchTerm}
                  />
                ))}
              </div>
            )}
          </section>
        ) : activeCategory === 'all' ? (
          // Continuous section-by-section category listing with rich visual banners
          Array.from(productsGroupedByCategory.entries()).map(([catId, prods]) => {
            if (prods.length === 0) return null;
            let cat = categories.find((c) => c.id === catId || c.name.toLowerCase() === catId.toLowerCase());
            if (!cat) {
              cat = {
                id: catId,
                name: catId.replace(/^cat_/, '').replace(/_/g, ' ').toUpperCase(),
                icon: 'UtensilsCrossed',
                order: 99,
                imageUrl: prods[0]?.imageUrl || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80',
                description: `Deliciosas opções de ${catId}`
              };
            }
            const details = getCategoryDetails(cat);

            return (
              <section key={catId} id={`section-${catId}`} className="scroll-mt-24 space-y-4">
                {/* Category Header Banner with High Quality Photography & Visual Accent */}
                <div className={`relative rounded-2xl overflow-hidden border shadow-xl ${
                  readingMode ? 'border-2 border-zinc-300 bg-white' : 'border-zinc-800/90'
                }`}>
                  {/* Banner Backdrop Image */}
                  <img
                    src={details.imageUrl}
                    alt={cat.name}
                    className={`absolute inset-0 w-full h-full object-cover filter blur-[1px] ${
                      readingMode ? 'opacity-15' : 'opacity-25'
                    }`}
                  />
                  <div className={`absolute inset-0 ${
                    readingMode
                      ? 'bg-gradient-to-r from-white via-white/90 to-white/70'
                      : 'bg-gradient-to-r from-[#0B0B10] via-[#0B0B10]/90 to-[#0B0B10]/70'
                  }`} />

                  <div className="relative z-10 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                        readingMode
                          ? 'bg-red-100 text-[#DA291C] border-2 border-red-300 shadow-red-200'
                          : 'bg-[#DA291C]/30 text-[#FFC72C] border border-[#DA291C]/50 shadow-red-950/40'
                      }`}>
                        {getCategoryIcon(cat.icon, `w-6 h-6 ${readingMode ? 'text-[#DA291C]' : 'text-[#FFC72C]'}`)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className={`text-xl sm:text-2xl font-black tracking-tight uppercase ${
                            readingMode ? 'text-zinc-950' : 'text-white'
                          }`}>
                            {cat.name}
                          </h2>
                          <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md border ${
                            readingMode
                              ? 'bg-zinc-100 text-zinc-900 border-zinc-300'
                              : 'bg-zinc-800/90 text-[#FFC72C] border border-zinc-700'
                          }`}>
                            {prods.length} {prods.length === 1 ? 'item' : 'itens'}
                          </span>
                        </div>
                        <p className={`text-xs mt-1 max-w-2xl leading-relaxed ${
                          readingMode ? 'text-zinc-700 font-medium' : 'text-zinc-300'
                        }`}>
                          {details.desc}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        onClick={() => handleSelectCategory(cat.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                          readingMode
                            ? 'bg-zinc-100 hover:bg-[#DA291C] text-zinc-900 hover:text-white border-zinc-300'
                            : 'bg-zinc-900/90 hover:bg-[#DA291C] text-zinc-300 hover:text-white border-zinc-700'
                        }`}
                      >
                        <Filter className={`w-3 h-3 ${readingMode ? 'text-[#DA291C]' : 'text-[#FFC72C]'}`} />
                        <span>Ver apenas esta</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Products in List Format with Numbering and Golden Price Badges */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {prods.map((product) => (
                    <ProductListItem
                      key={product.id}
                      product={product}
                      category={categories.find((c) => c.id === product.category)}
                      onCustomize={() => handleOpenCustomize(product)}
                      onQuickAdd={(e) => handleQuickAdd(product, e)}
                      readingMode={readingMode}
                      fontSizeScale={fontSizeScale}
                      searchQuery={searchTerm}
                    />
                  ))}
                </div>
              </section>
            );
          })
        ) : (
          // Single filtered category listing
          <section className="space-y-4">
            {(() => {
              const rawSelectedCat = categories.find((c) => c.id === activeCategory || c.name.toLowerCase() === activeCategory.toLowerCase());
              const selectedCat = rawSelectedCat || {
                id: activeCategory,
                name: activeCategory.replace(/^cat_/, '').replace(/_/g, ' ').toUpperCase(),
                icon: 'UtensilsCrossed',
                order: 99,
                imageUrl: filteredProducts[0]?.imageUrl || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80',
                description: `Itens de ${activeCategory}`
              };
              const details = getCategoryDetails(selectedCat);

              return (
                <div className={`relative rounded-2xl overflow-hidden border shadow-xl mb-6 ${
                  readingMode ? 'border-2 border-zinc-300 bg-white' : 'border-zinc-800/90'
                }`}>
                  {details && (
                    <img
                      src={details.imageUrl}
                      alt={selectedCat?.name || ''}
                      className={`absolute inset-0 w-full h-full object-cover filter blur-[1px] ${
                        readingMode ? 'opacity-15' : 'opacity-25'
                      }`}
                    />
                  )}
                  <div className={`absolute inset-0 ${
                    readingMode
                      ? 'bg-gradient-to-r from-white via-white/90 to-white/70'
                      : 'bg-gradient-to-r from-[#0B0B10] via-[#0B0B10]/90 to-[#0B0B10]/70'
                  }`} />

                  <div className="relative z-10 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                        readingMode
                          ? 'bg-red-100 text-[#DA291C] border-2 border-red-300'
                          : 'bg-[#DA291C]/30 text-[#FFC72C] border border-[#DA291C]/50 shadow-red-950/40'
                      }`}>
                        {getCategoryIcon(selectedCat?.icon || '', `w-6 h-6 ${readingMode ? 'text-[#DA291C]' : 'text-[#FFC72C]'}`)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className={`text-xl sm:text-2xl font-black tracking-tight uppercase ${
                            readingMode ? 'text-zinc-950' : 'text-white'
                          }`}>
                            {selectedCat?.name || 'Categoria'}
                          </h2>
                          <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md border ${
                            readingMode
                              ? 'bg-zinc-100 text-zinc-900 border-zinc-300'
                              : 'bg-zinc-800/90 text-[#FFC72C] border border-zinc-700'
                          }`}>
                            {filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'itens'}
                          </span>
                        </div>
                        {details && (
                          <p className={`text-xs mt-1 max-w-2xl leading-relaxed ${
                            readingMode ? 'text-zinc-700 font-medium' : 'text-zinc-300'
                          }`}>
                            {details.desc}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleSelectCategory('all')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 self-end sm:self-center cursor-pointer ${
                        readingMode
                          ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border-zinc-300 font-bold'
                          : 'bg-zinc-800/90 hover:bg-zinc-700 text-white border-zinc-700'
                      }`}
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${readingMode ? 'text-[#DA291C]' : 'text-[#FFC72C]'}`} />
                      <span>Ver Todos os Pratos</span>
                    </button>
                  </div>
                </div>
              );
            })()}

            {filteredProducts.length === 0 ? (
              <div className={`text-center py-16 rounded-2xl border ${
                readingMode ? 'bg-white border-2 border-zinc-300' : 'bg-zinc-900/40 border-zinc-800'
              }`}>
                <p className={`text-sm ${readingMode ? 'text-zinc-700 font-bold' : 'text-zinc-400'}`}>Nenhum prato encontrado com esta busca ou categoria.</p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setActiveCategory('all');
                  }}
                  className="mt-3 px-4 py-2 bg-[#DA291C] text-white rounded-xl text-xs font-bold hover:bg-[#FFC72C] hover:text-black transition-all cursor-pointer"
                >
                  Limpar Filtros e Ver Todos
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredProducts.map((product) => (
                  <ProductListItem
                    key={product.id}
                    product={product}
                    category={categories.find((c) => c.id === product.category)}
                    onCustomize={() => handleOpenCustomize(product)}
                    onQuickAdd={(e) => handleQuickAdd(product, e)}
                    readingMode={readingMode}
                    fontSizeScale={fontSizeScale}
                    searchQuery={searchTerm}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {/* 4. FOOTER INFORMATIONAL SECTION */}
      <div className={`max-w-6xl mx-auto px-4 pt-12 border-t mt-12 text-xs space-y-8 ${
        readingMode ? 'border-zinc-300 text-zinc-700' : 'border-zinc-800/80 text-zinc-400'
      }`}>
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 p-6 rounded-2xl border ${
          readingMode
            ? 'bg-white border-2 border-zinc-300 shadow-sm'
            : 'bg-zinc-900/60 border-zinc-800/80'
        }`}>
          <div className="space-y-2">
            <h4 className={`font-black uppercase tracking-wider flex items-center gap-2 ${
              readingMode ? 'text-zinc-950' : 'text-white'
            }`}>
              <MapPin className={`w-4 h-4 ${readingMode ? 'text-[#DA291C]' : 'text-[#FFC72C]'}`} />
              Localização & Retirada
            </h4>
            <p className={readingMode ? 'font-medium text-zinc-800' : ''}>Av. Paulista, 1000 - Bela Vista</p>
            <p className={readingMode ? 'font-medium text-zinc-800' : ''}>São Paulo - SP • CEP 01310-100</p>
            <p className={readingMode ? 'text-zinc-600' : 'text-zinc-500'}>Estacionamento conveniado no local.</p>
          </div>

          <div className="space-y-2">
            <h4 className={`font-black uppercase tracking-wider flex items-center gap-2 ${
              readingMode ? 'text-zinc-950' : 'text-white'
            }`}>
              <Clock className={`w-4 h-4 ${readingMode ? 'text-[#DA291C]' : 'text-[#FFC72C]'}`} />
              Horário de Atendimento
            </h4>
            <p><strong className={readingMode ? 'text-zinc-950' : 'text-zinc-200'}>Terça a Domingo:</strong> 18h às 23h59</p>
            <p><strong className={readingMode ? 'text-zinc-950' : 'text-zinc-200'}>Sexta e Sábado:</strong> 18h à 01h00</p>
            <p className={readingMode ? 'text-red-700 font-bold' : 'text-red-400'}>Segunda-feira: Fechado para descanso</p>
          </div>

          <div className="space-y-2">
            <h4 className={`font-black uppercase tracking-wider flex items-center gap-2 ${
              readingMode ? 'text-zinc-950' : 'text-white'
            }`}>
              <CreditCard className={`w-4 h-4 ${readingMode ? 'text-[#DA291C]' : 'text-[#FFC72C]'}`} />
              Formas de Pagamento
            </h4>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className={`px-2 py-0.5 rounded font-bold border ${
                readingMode
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                  : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
              }`}>PIX</span>
              <span className={`px-2 py-0.5 rounded font-medium border ${
                readingMode
                  ? 'bg-zinc-100 text-zinc-900 border-zinc-300'
                  : 'bg-zinc-800 text-zinc-300 border-transparent'
              }`}>Cartões Crédito / Débito</span>
              <span className={`px-2 py-0.5 rounded font-medium border ${
                readingMode
                  ? 'bg-zinc-100 text-zinc-900 border-zinc-300'
                  : 'bg-zinc-800 text-zinc-300 border-transparent'
              }`}>Dinheiro</span>
              <span className={`px-2 py-0.5 rounded font-bold border ${
                readingMode
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-amber-950/80 text-amber-300 border-amber-800'
              }`}>Vale Refeição / VR</span>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className={`font-black uppercase tracking-wider flex items-center gap-2 ${
              readingMode ? 'text-zinc-950' : 'text-white'
            }`}>
              <Phone className={`w-4 h-4 ${readingMode ? 'text-[#DA291C]' : 'text-[#FFC72C]'}`} />
              WhatsApp & Atendimento
            </h4>
            <p className={readingMode ? 'font-medium text-zinc-800' : ''}>WhatsApp: {tenant?.settings?.whatsappNumber ? tenant.settings.whatsappNumber.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3') : DULCI_CONTACT.whatsappDisplay}</p>
            <p className={readingMode ? 'font-medium text-zinc-800' : ''}>Instagram: @lanchonetedulci</p>
            <p className={readingMode ? 'text-zinc-600' : 'text-zinc-500'}>Atendimento presencial e delivery em Manaus – AM.</p>
          </div>
        </div>

        <div className={`text-center pb-8 ${readingMode ? 'text-zinc-600 font-medium' : 'text-zinc-600'}`}>
          <p>© {new Date().getFullYear()} {tenant?.name || 'LANCHEONETE DULCI'} • Manaus - AM • Cardápio Digital Oficial</p>
        </div>
      </div>

      {/* 5. FLOATING BOTTOM BAR WHEN CART HAS ITEMS */}
      {cartItems.length > 0 && !isCartOpen && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          className="fixed bottom-4 left-0 right-0 z-40 px-4 max-w-2xl mx-auto"
        >
          <div className="bg-gradient-to-r from-[#DA291C] via-[#B81F14] to-[#8F140A] text-white p-3.5 sm:p-4 rounded-2xl shadow-2xl shadow-red-950/80 border border-red-500/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-black/30 flex items-center justify-center font-black text-[#FFC72C] text-lg">
                {totalItemsCount}
              </div>
              <div>
                <p className="text-xs text-red-100 font-medium">Subtotal do Pedido</p>
                <p className="text-base sm:text-lg font-black text-[#FFC72C]">{formatBRL(cartTotal)}</p>
              </div>
            </div>

            <button
              onClick={() => {
                playBeep();
                setIsCartOpen(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#FFC72C] hover:bg-[#FFD255] active:scale-95 text-black font-black rounded-xl text-sm transition-all shadow-md"
            >
              <span>Ver Sacola</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* 6. MODAL: QR CODE GENERATOR & TABLE DISPLAY */}
      <AnimatePresence>
        {isQrModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-[#111116] border border-zinc-800 w-full max-w-md rounded-3xl shadow-2xl p-6 text-zinc-100 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#FFC72C]/15 text-[#FFC72C] border border-[#FFC72C]/30">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-white">QR Code do Cardápio</h3>
                    <p className="text-[11px] text-zinc-400">Acesso instantâneo via câmera do celular</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsQrModalOpen(false)}
                  className="p-2 text-zinc-400 hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Table Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Vincular a uma Mesa do Salão:
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {['Geral', '1', '2', '3', '4', '5', '6', '7'].map((num) => {
                    const isSelected = num === 'Geral' ? qrTableNumber === '' : qrTableNumber === num;
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => {
                          playBeep();
                          setQrTableNumber(num === 'Geral' ? '' : num);
                        }}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                          isSelected
                            ? 'bg-[#DA291C] border-[#FFC72C] text-white shadow-md font-black'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {num === 'Geral' ? 'Sem Mesa' : `Mesa ${num}`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Visual QR Code Display (Vector styled) */}
              <div className="bg-white p-5 rounded-2xl flex flex-col items-center justify-center space-y-3 shadow-inner">
                {/* Simulated high-density authentic QR Code Graphic */}
                <div className="w-48 h-48 bg-white p-2 border-2 border-black rounded-lg flex items-center justify-center relative">
                  <svg viewBox="0 0 100 100" className="w-full h-full text-black fill-current">
                    {/* Top-Left Corner Box */}
                    <rect x="0" y="0" width="28" height="28" fill="black" />
                    <rect x="4" y="4" width="20" height="20" fill="white" />
                    <rect x="8" y="8" width="12" height="12" fill="black" />

                    {/* Top-Right Corner Box */}
                    <rect x="72" y="0" width="28" height="28" fill="black" />
                    <rect x="76" y="4" width="20" height="20" fill="white" />
                    <rect x="80" y="8" width="12" height="12" fill="black" />

                    {/* Bottom-Left Corner Box */}
                    <rect x="0" y="72" width="28" height="28" fill="black" />
                    <rect x="4" y="76" width="20" height="20" fill="white" />
                    <rect x="8" y="80" width="12" height="12" fill="black" />

                    {/* Data Pattern Blocks */}
                    <rect x="36" y="8" width="8" height="8" />
                    <rect x="48" y="8" width="8" height="8" />
                    <rect x="36" y="20" width="8" height="8" />
                    <rect x="8" y="36" width="8" height="8" />
                    <rect x="20" y="36" width="8" height="8" />
                    <rect x="36" y="36" width="28" height="28" rx="4" fill="#DA291C" />
                    <rect x="44" y="44" width="12" height="12" rx="2" fill="#FFC72C" />
                    <rect x="72" y="36" width="8" height="8" />
                    <rect x="84" y="36" width="8" height="8" />
                    <rect x="8" y="48" width="8" height="8" />
                    <rect x="20" y="48" width="8" height="8" />
                    <rect x="72" y="48" width="8" height="8" />
                    <rect x="84" y="48" width="8" height="8" />
                    <rect x="36" y="72" width="8" height="8" />
                    <rect x="48" y="72" width="8" height="8" />
                    <rect x="60" y="72" width="8" height="8" />
                    <rect x="72" y="72" width="8" height="8" />
                    <rect x="84" y="72" width="8" height="8" />
                    <rect x="36" y="84" width="8" height="8" />
                    <rect x="60" y="84" width="8" height="8" />
                    <rect x="72" y="84" width="8" height="8" />
                  </svg>
                </div>

                <div className="text-center">
                  <span className="font-black text-black text-sm uppercase tracking-wide">
                    {tenant?.name || 'LANCHONETE DULCI'}
                  </span>
                  <p className="text-[11px] font-bold text-zinc-600">
                    {qrTableNumber ? `🪑 MESA Nº ${qrTableNumber}` : 'CARDÁPIO DIGITAL OFICIAL'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyLink}
                    className="flex-1 py-2.5 px-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    {copiedLink ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-[#FFC72C]" />}
                    <span>{copiedLink ? 'Link Copiado!' : 'Copiar Link WhatsApp'}</span>
                  </button>

                  <button
                    onClick={() => {
                      const link = `https://neonfood.app/cardapio${qrTableNumber ? `?mesa=${qrTableNumber}` : ''}`;
                      const msg = `🍔 Acesse nosso Cardápio Online Oficial da ${tenant?.name || 'Lanchonete Dulci'}: ${link}`;
                      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                    }}
                    className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>WhatsApp</span>
                  </button>
                </div>

                <button
                  onClick={() => window.print()}
                  className="w-full py-2.5 bg-gradient-to-r from-[#DA291C] to-[#B81F14] hover:brightness-110 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg"
                >
                  <Printer className="w-4 h-4 text-[#FFC72C]" />
                  <span>Imprimir Display Acrílico para Mesa</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. MODAL: FULL PRINTABLE PDF FLYER (MODEL DIRECTLY AFTER THE 3 USER INSPIRATION IMAGES) */}
      <AnimatePresence>
        {isPdfModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-[#101016] border border-zinc-700 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden my-4 text-zinc-100 flex flex-col max-h-[92vh]"
            >
              {/* PDF Modal Controls Header */}
              <div className="p-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-5 h-5 text-[#FFC72C]" />
                  <div>
                    <h3 className="font-black text-sm sm:text-base text-white">Visualização de Cardápio em PDF / Panfleto</h3>
                    <p className="text-[10px] sm:text-xs text-zinc-400">Layout gráfico estilizado pronto para envio no WhatsApp ou impressão A4</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleCopyWhatsappFormattedMenu}
                    className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                    title="Copiar texto do cardápio completo com emojis para colar no WhatsApp"
                  >
                    {copiedPdfText ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#FFC72C]" />}
                    <span>{copiedPdfText ? 'Copiado p/ WhatsApp!' : 'Copiar Texto WhatsApp'}</span>
                  </button>

                  <button
                    onClick={handleShareMenuWhatsApp}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Mandar no WhatsApp</span>
                  </button>

                  <button
                    onClick={() => window.print()}
                    className="px-3 py-1.5 bg-[#DA291C] hover:bg-[#FFC72C] hover:text-black text-white text-xs font-black rounded-xl transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimir / Salvar PDF</span>
                  </button>

                  <button
                    onClick={() => setIsPdfModalOpen(false)}
                    className="p-1.5 text-zinc-400 hover:text-white rounded-lg cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* PDF Flyer Content Body (Rendered as the authentic Corel / Poster Pamphlet from the images) */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#0c0a0c] text-white font-sans scrollbar-thin">
                <div id="flyer-pdf-print-area" className="bg-[#120F12] border-4 border-[#FFC72C]/40 rounded-3xl p-5 sm:p-8 shadow-2xl relative space-y-6">
                  {/* Decorative corner ribbons */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#DA291C]/30 to-transparent rounded-tr-3xl pointer-events-none" />

                  {/* FLYER HEADER */}
                  <div className="text-center space-y-2 border-b-2 border-[#FFC72C]/50 pb-5">
                    <div className="inline-block px-4 py-1 rounded-full bg-[#DA291C] text-white text-xs font-black uppercase tracking-widest shadow-md">
                      ★ HOT & TASTY • QUALIDADE PREMIUM ★
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-black text-[#FFC72C] drop-shadow-[0_2px_8px_rgba(255,199,44,0.5)] tracking-tight">
                      {tenant?.name || 'LANCHONETE DULCI'}
                    </h2>
                    <p className="text-xs text-zinc-300 max-w-lg mx-auto">
                      Seu sabor favorito em Manaus! X-Saladas artesanais, Lanches no pão brioche amanteigado, Pizzas de massa crocante, Pastéis fritos na hora e Guaraná Baré gelado.
                    </p>
                    <div className="flex items-center justify-center gap-4 text-xs font-bold text-[#FFC72C] pt-1">
                      <span>🛵 DELIVERY: (92) 99303-2598</span>
                      <span>•</span>
                      <span>⚡ ACEITAMOS PIX & CARTÕES</span>
                    </div>
                  </div>

                  {/* 2-COLUMN AUTHENTIC GASTRONOMIC PAMPHLET (LANCHEONETE DULCI - MANAUS / AM) */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 items-start">
                    {/* LEFT COLUMN */}
                    <div className="space-y-6">
                      {categories.slice(0, Math.ceil(categories.length / 2)).map((cat) => {
                        const catProducts = products.filter(p => isProductInCategory(p.category, cat.id));
                        if (catProducts.length === 0) return null;
                        return (
                          <div key={cat.id} className="space-y-3 break-inside-avoid">
                            <div className="bg-gradient-to-r from-[#DA291C] to-[#B91C1C] text-white px-3.5 py-1.5 rounded-xl font-black text-xs sm:text-sm flex items-center justify-between shadow-md border border-red-700/50">
                              <span className="flex items-center gap-1.5">{cat.name}</span>
                              <span className="font-mono text-[10px] text-[#FFC72C] uppercase tracking-wider">{catProducts.length} itens</span>
                            </div>
                            <div className="space-y-3 text-xs">
                              {catProducts.map((item, idx) => (
                                <div key={item.id} className="border-b border-zinc-800/80 pb-2 flex gap-3 items-center">
                                  {item.imageUrl && (
                                    <img 
                                      src={item.imageUrl} 
                                      alt={item.name} 
                                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover shrink-0 border border-zinc-700/70 shadow-md bg-zinc-900"
                                      loading="lazy"
                                    />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start font-bold gap-2">
                                      <span className="text-white text-xs sm:text-sm truncate">
                                        <strong className="text-[#FFC72C] mr-1">{item.itemNumber || String(idx + 1).padStart(2, '0')}</strong> {item.name}
                                      </span>
                                      <span className="font-mono text-[#FFC72C] shrink-0 text-xs font-black">
                                        {item.priceVariants && item.priceVariants.length > 0 
                                          ? item.priceVariants.map(v => `${v.label?.split(' ')[0] || ''} ${formatBRL(v.price)}`).join(' • ')
                                          : formatBRL(item.price)}
                                      </span>
                                    </div>
                                    {item.description && (
                                      <p className="text-[10px] text-zinc-400 leading-tight line-clamp-2 mt-0.5">{item.description}</p>
                                    )}
                                    {item.badgeText && (
                                      <span className="inline-block mt-1 text-[9px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded-md uppercase">
                                        {item.badgeText}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="space-y-6">
                      {categories.slice(Math.ceil(categories.length / 2)).map((cat) => {
                        const catProducts = products.filter(p => isProductInCategory(p.category, cat.id));
                        if (catProducts.length === 0) return null;
                        return (
                          <div key={cat.id} className="space-y-3 break-inside-avoid">
                            <div className="bg-gradient-to-r from-[#FFC72C] to-[#EAB308] text-black px-3.5 py-1.5 rounded-xl font-black text-xs sm:text-sm flex items-center justify-between shadow-md border border-amber-400">
                              <span className="flex items-center gap-1.5">{cat.name}</span>
                              <span className="font-mono text-[10px] text-black/80 uppercase tracking-wider">{catProducts.length} itens</span>
                            </div>
                            <div className="space-y-3 text-xs">
                              {catProducts.map((item, idx) => (
                                <div key={item.id} className="border-b border-zinc-800/80 pb-2 flex gap-3 items-center">
                                  {item.imageUrl && (
                                    <img 
                                      src={item.imageUrl} 
                                      alt={item.name} 
                                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover shrink-0 border border-zinc-700/70 shadow-md bg-zinc-900"
                                      loading="lazy"
                                    />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start font-bold gap-2">
                                      <span className="text-white text-xs sm:text-sm truncate">
                                        <strong className="text-[#FFC72C] mr-1">{item.itemNumber || String(idx + 1).padStart(2, '0')}</strong> {item.name}
                                      </span>
                                      <span className="font-mono text-[#00E676] shrink-0 text-xs font-black">
                                        {item.priceVariants && item.priceVariants.length > 0 
                                          ? item.priceVariants.map(v => `${v.label?.split(' ')[0] || ''} ${formatBRL(v.price)}`).join(' • ')
                                          : formatBRL(item.price)}
                                      </span>
                                    </div>
                                    {item.description && (
                                      <p className="text-[10px] text-zinc-400 leading-tight line-clamp-2 mt-0.5">{item.description}</p>
                                    )}
                                    {item.badgeText && (
                                      <span className="inline-block mt-1 text-[9px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded-md uppercase">
                                        {item.badgeText}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* FLYER FOOTER */}
                  <div className="border-t-2 border-[#FFC72C]/50 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-white rounded-xl shadow-md border border-zinc-700 shrink-0">
                        <img 
                          src={getPixQrCodeUrl(`${tenant?.settings?.menuCustomDomain || 'https://neonfood.app/cardapio'}?loja=${tenant?.settings?.menuCustomSlug || 'lanchonete-dulci'}&origem=pdf_flyer`, 84)} 
                          alt="QR Code Cardápio" 
                          className="w-16 h-16 object-contain"
                        />
                      </div>
                      <div className="text-left">
                        <p className="font-black text-white text-xs sm:text-sm">FAÇA SEU PEDIDO PELO CELULAR OU WHATSAPP</p>
                        <p className="text-zinc-300 text-[11px]">📍 Manaus – Amazonas | 📲 {DULCI_CONTACT.whatsappDisplay}</p>
                        <p className="text-zinc-400 text-[10px]">Chave Pix: {tenant?.settings?.pixKey || 'pix@lanchonetedulci.com.br'}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={handleCopyWhatsappFormattedMenu}
                        className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-[#FFC72C] font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiedPdfText ? 'Copiado!' : 'Copiar Texto'}</span>
                      </button>
                      <button
                        onClick={handleShareMenuWhatsApp}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </button>
                      <button
                        onClick={() => window.print()}
                        className="px-2.5 py-1.5 rounded-lg bg-[#DA291C] hover:bg-[#FFC72C] hover:text-black text-white font-black text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Imprimir / PDF</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 8. CUSTOMIZATION MODAL (POPUP DO PRATO PARA SELEÇÃO DE TAMANHO / BORDAS / ADICIONAIS) */}
      <AnimatePresence>
        {customizingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-[#111116] border border-zinc-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden my-8 text-zinc-100"
            >
              {/* Product Hero Image inside modal */}
              <div className="relative h-52 sm:h-60 w-full overflow-hidden bg-zinc-900">
                <img
                  src={customizingProduct.imageUrl}
                  alt={customizingProduct.name}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => setCustomizingProduct(null)}
                  className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/90 text-white rounded-full transition-all"
                >
                  <X className="w-5 h-5" />
                </button>

                {customizingProduct.itemNumber && (
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-[#DA291C] text-white font-black text-xs font-mono shadow-md">
                    Nº {customizingProduct.itemNumber}
                  </span>
                )}
              </div>

              <div className="p-5 sm:p-6 space-y-6 max-h-[60vh] overflow-y-auto scrollbar-thin">
                {/* Title & Description */}
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {customizingProduct.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-400 mt-1 leading-relaxed">
                    {customizingProduct.description}
                  </p>
                </div>

                {/* Price Variant Selection (For Pizzas P/M/G, Açaí 300ml/500ml) */}
                {customizingProduct.priceVariants && customizingProduct.priceVariants.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#FFC72C] uppercase tracking-wider flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      Selecione o Tamanho / Porção
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {customizingProduct.priceVariants.map((variant) => {
                        const isSelected = selectedVariant?.label === variant.label;
                        return (
                          <button
                            key={variant.label}
                            type="button"
                            onClick={() => {
                              playBeep();
                              setSelectedVariant(variant);
                            }}
                            className={`p-2.5 rounded-xl border text-center transition-all ${
                              isSelected
                                ? 'bg-red-600/20 border-[#DA291C] text-white shadow-md'
                                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                            }`}
                          >
                            <p className="text-xs font-bold">{variant.label}</p>
                            <p className="text-xs font-black text-[#FFC72C] mt-1">{formatBRL(variant.price)}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Custom Options (Bordas recheadas, adicionais, etc.) */}
                {customizingProduct.options && customizingProduct.options.length > 0 && (
                  <div className="space-y-5">
                    {customizingProduct.options.map((group) => {
                      const selectedInGroup = selectedOptionItems[group.groupName] || [];
                      return (
                        <div key={group.groupName} className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                              {group.groupName}
                            </label>
                            <span className="text-[10px] text-zinc-500 font-mono">
                              {group.required ? 'Obrigatório' : `Até ${group.max}`}
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            {group.items.map((opt) => {
                              const isChecked = selectedInGroup.includes(opt.name);
                              return (
                                <button
                                  key={opt.name}
                                  type="button"
                                  onClick={() => {
                                    playBeep();
                                    setSelectedOptionItems((prev) => {
                                      const current = prev[group.groupName] || [];
                                      if (group.max === 1) {
                                        return { ...prev, [group.groupName]: [opt.name] };
                                      }
                                      if (isChecked) {
                                        return { ...prev, [group.groupName]: current.filter((n) => n !== opt.name) };
                                      }
                                      if (current.length < group.max) {
                                        return { ...prev, [group.groupName]: [...current, opt.name] };
                                      }
                                      return prev;
                                    });
                                  }}
                                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs transition-all ${
                                    isChecked
                                      ? 'bg-zinc-800 border-[#FFC72C]/70 text-white'
                                      : 'bg-zinc-900/80 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <div
                                      className={`w-4 h-4 rounded ${group.max === 1 ? 'rounded-full' : 'rounded'} border flex items-center justify-center ${
                                        isChecked ? 'bg-[#FFC72C] border-[#FFC72C] text-black' : 'border-zinc-600'
                                      }`}
                                    >
                                      {isChecked && <CheckCircle2 className="w-3 h-3 text-black" />}
                                    </div>
                                    <span className="font-medium">{opt.name}</span>
                                  </div>
                                  <span className="font-bold text-zinc-400">
                                    {opt.price > 0 ? `+${formatBRL(opt.price)}` : 'Grátis'}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Notes Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">Observações Especiais do Pedido</label>
                  <textarea
                    rows={2}
                    placeholder="Ex: sem cebola, ponto bem passado, molho à parte, etc."
                    value={itemNotes}
                    onChange={(e) => setItemNotes(e.target.value)}
                    className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:border-[#FFC72C] focus:ring-1 focus:ring-[#FFC72C] outline-none"
                  />
                </div>
              </div>

              {/* Modal Footer with quantity & add button */}
              <div className="p-4 bg-zinc-950 border-t border-zinc-800/80 flex items-center justify-between gap-4">
                {/* Quantity buttons */}
                <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => {
                      playBeep();
                      setItemQuantity((q) => Math.max(1, q - 1));
                    }}
                    className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-white"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-6 text-center font-bold text-sm font-mono">{itemQuantity}</span>
                  <button
                    type="button"
                    onClick={() => {
                      playBeep();
                      setItemQuantity((q) => q + 1);
                    }}
                    className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-white"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Add Button */}
                <button
                  type="button"
                  onClick={handleAddCustomizedToCart}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-[#DA291C] to-[#B81F14] hover:brightness-110 active:scale-95 text-white font-black rounded-xl text-sm transition-all shadow-lg flex items-center justify-between"
                >
                  <span>Adicionar ao Pedido</span>
                  <span className="text-[#FFC72C]">
                    {formatBRL(
                      ((selectedVariant ? selectedVariant.price : customizingProduct.price) +
                        Object.entries(selectedOptionItems).reduce((sum, [grp, names]) => {
                          const groupDef = customizingProduct.options?.find((o) => o.groupName === grp);
                          if (!groupDef) return sum;
                          const nameList = names as string[];
                          const optSum = nameList.reduce((s, n) => {
                            const found = groupDef.items.find((i) => i.name === n);
                            return s + (found ? found.price : 0);
                          }, 0);
                          return sum + optSum;
                        }, 0)) *
                        itemQuantity
                    )}
                  </span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 9. CART DRAWER (GAVETA DE SACOLA / CHECKOUT) */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-md bg-[#0F0F14] border-l border-zinc-800 flex flex-col h-full text-zinc-100 shadow-2xl"
            >
              {/* Cart Drawer Header */}
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
                <div className="flex items-center gap-2.5">
                  <ShoppingBag className="w-5 h-5 text-[#FFC72C]" />
                  <h3 className="font-black text-lg text-white">Sua Sacola de Pedidos</h3>
                  <span className="px-2 py-0.5 rounded-full bg-red-600/30 text-red-300 font-mono text-xs">
                    {totalItemsCount}
                  </span>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="p-2 text-zinc-400 hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Cart Drawer Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
                {orderPlacedSuccess ? (
                  <div className="text-center py-12 space-y-4">
                    <div className="w-18 h-18 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto border-2 border-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.3)] animate-bounce">
                      <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                    </div>
                    <div className="space-y-1">
                      <div className="inline-block px-3 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-mono font-bold">
                        CÓDIGO #{currentPixTxId}
                      </div>
                      <h4 className="text-xl font-black text-white">Pedido Enviado para a Cozinha!</h4>
                      <p className="text-xs text-zinc-300 max-w-xs mx-auto leading-relaxed">
                        Nossa equipe já recebeu seu pedido e está preparando seus itens com todo o carinho e cuidado.
                      </p>
                    </div>

                    <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3.5 max-w-xs mx-auto text-left space-y-2 text-xs">
                      <div className="flex items-center justify-between text-zinc-400">
                        <span>Tempo estimado:</span>
                        <strong className="text-[#FFC72C]">20 a 30 minutos</strong>
                      </div>
                      <div className="flex items-center justify-between text-zinc-400">
                        <span>Canal de preparo:</span>
                        <strong className="text-white">Cozinha Principal</strong>
                      </div>
                      <p className="text-[11px] text-zinc-400 pt-1 border-t border-zinc-800">
                        Qualquer dúvida, é só chamar nossos atendentes ou mandar uma mensagem no WhatsApp!
                      </p>
                    </div>
                  </div>
                ) : cartItems.length === 0 ? (
                  <div className="text-center py-20 text-zinc-500 space-y-3">
                    <ShoppingBag className="w-12 h-12 mx-auto text-zinc-700" />
                    <p className="text-sm font-semibold">Sua sacola está vazia</p>
                    <p className="text-xs">Selecione deliciosos lanches, pizzas e açaí para começar!</p>
                  </div>
                ) : (
                  <>
                    {/* Channel Selector */}
                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-zinc-900 rounded-xl border border-zinc-800 text-xs">
                      <button
                        onClick={() => {
                          playBeep();
                          setOrderChannel('dine_in');
                        }}
                        className={`py-2 rounded-lg font-bold transition-all ${
                          orderChannel === 'dine_in'
                            ? 'bg-[#DA291C] text-white shadow-md'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        🍽️ Na Mesa
                      </button>
                      <button
                        onClick={() => {
                          playBeep();
                          setOrderChannel('delivery');
                        }}
                        className={`py-2 rounded-lg font-bold transition-all ${
                          orderChannel === 'delivery'
                            ? 'bg-[#DA291C] text-white shadow-md'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        🛵 Delivery
                      </button>
                      <button
                        onClick={() => {
                          playBeep();
                          setOrderChannel('takeout');
                        }}
                        className={`py-2 rounded-lg font-bold transition-all ${
                          orderChannel === 'takeout'
                            ? 'bg-[#DA291C] text-white shadow-md'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        🛍️ Retirada
                      </button>
                    </div>

                    {/* Customer details */}
                    <div className="space-y-2 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800 text-xs">
                      <input
                        type="text"
                        placeholder="Seu Nome Completo"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 outline-none focus:border-[#FFC72C]"
                      />
                      <input
                        type="text"
                        placeholder="Seu WhatsApp (Ex: 11 99999-9999)"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 outline-none focus:border-[#FFC72C]"
                      />
                      {orderChannel === 'delivery' && (
                        <div className="space-y-2">
                          <input
                            type="text"
                            placeholder="Endereço Completo (Rua, Número, Bairro)"
                            value={customerAddress}
                            onChange={(e) => setCustomerAddress(e.target.value)}
                            className="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 outline-none focus:border-[#FFC72C]"
                          />

                          {/* GPS Detection Action */}
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={handleDetectCustomerGps}
                              disabled={isDetectingGps}
                              className="px-3 py-1.5 rounded-lg bg-[#00E676]/15 hover:bg-[#00E676]/25 border border-[#00E676]/40 text-[#00E676] font-bold text-[11px] flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                              <LocateFixed className={`w-3.5 h-3.5 ${isDetectingGps ? 'animate-spin' : ''}`} />
                              <span>{isDetectingGps ? 'Detectando Satélite...' : '📍 Usar Meu GPS (Calcular Frete Exato)'}</span>
                            </button>

                            {customerDistanceKm && (
                              <span className="text-[11px] font-mono font-bold text-[#00D2FF]">
                                ~{customerDistanceKm} km da loja
                              </span>
                            )}
                          </div>

                          {/* Live Dynamic Delivery Feedback Badge */}
                          {deliveryCalcResult && (
                            <div className="p-2.5 rounded-lg bg-[#0B0B14] border border-zinc-800 text-[11px] space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-zinc-400">
                                  Taxa Calculada ({deliveryCalcResult.zone.name}):
                                </span>
                                <span className={`font-black ${deliveryCalcResult.isFreeDelivery ? 'text-[#00E676]' : 'text-white'}`}>
                                  {deliveryCalcResult.isFreeDelivery ? 'GRÁTIS' : formatBRL(deliveryCalcResult.deliveryFee)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-zinc-500 text-[10px]">
                                <span>Tempo Estimado (ETA):</span>
                                <span className="text-[#FFC72C] font-bold">
                                  ~{deliveryCalcResult.estimatedMinutesMin} a {deliveryCalcResult.estimatedMinutesMax} min
                                </span>
                              </div>
                              {gpsFeedbackMsg && (
                                <p className="text-[10px] text-[#00E676] pt-1 border-t border-zinc-900 font-medium">
                                  ✓ {gpsFeedbackMsg}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      {orderChannel === 'dine_in' && (
                        <input
                          type="number"
                          placeholder="Número da Mesa (Ex: 4)"
                          value={tableNumber}
                          onChange={(e) => setTableNumber(e.target.value)}
                          className="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 outline-none focus:border-[#FFC72C]"
                        />
                      )}
                    </div>

                    {/* Items List */}
                    <div className="space-y-2.5">
                      <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                        Itens Selecionados
                      </label>
                      {cartItems.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-zinc-900/80 rounded-xl border border-zinc-800/80 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-white truncate">
                              {item.product.name}
                              {item.selectedVariant && (
                                <span className="text-[#FFC72C] font-normal ml-1">
                                  [{item.selectedVariant.label}]
                                </span>
                              )}
                            </p>
                            {item.selectedOptions.length > 0 && (
                              <p className="text-[10px] text-zinc-400 truncate">
                                + {item.selectedOptions.map((o) => o.itemName).join(', ')}
                              </p>
                            )}
                            {item.notes && (
                              <p className="text-[10px] text-amber-400 italic truncate">Obs: {item.notes}</p>
                            )}
                            <p className="font-bold text-[#FFC72C] mt-1">{formatBRL(item.totalPrice)}</p>
                          </div>

                          <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 rounded-lg p-1">
                            <button
                              onClick={() => handleUpdateCartQty(idx, -1)}
                              className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center text-white"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-5 text-center font-bold font-mono">{item.quantity}</span>
                            <button
                              onClick={() => handleUpdateCartQty(idx, 1)}
                              className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center text-white"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Smart Upsell Strip: Turbine sua Sacola */}
                    <SmartCartUpsellRow
                      allProducts={products}
                      currentCartItems={cartItems}
                      onAddRecommendation={handleAddRecommendation}
                      readingMode={readingMode}
                    />

                    {/* Payment Method Selector */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                        Forma de Pagamento
                      </label>
                      <div className="grid grid-cols-2 gap-1.5 text-xs">
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('pix')}
                          className={`p-2 rounded-lg border text-left flex items-center gap-2 ${
                            paymentMethod === 'pix'
                              ? 'bg-emerald-950/70 border-[#00E676] text-[#00E676] font-bold shadow-[0_0_10px_rgba(0,230,118,0.2)]'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                          }`}
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>PIX Instantâneo</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('credit_card')}
                          className={`p-2 rounded-lg border text-left flex items-center gap-2 ${
                            paymentMethod === 'credit_card'
                              ? 'bg-red-950 border-red-500 text-red-300 font-bold'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                          }`}
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Cartão Crédito</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('debit_card')}
                          className={`p-2 rounded-lg border text-left flex items-center gap-2 ${
                            paymentMethod === 'debit_card'
                              ? 'bg-blue-950 border-blue-500 text-blue-300 font-bold'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                          }`}
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Cartão Débito</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('cash')}
                          className={`p-2 rounded-lg border text-left flex items-center gap-2 ${
                            paymentMethod === 'cash'
                              ? 'bg-amber-950 border-amber-500 text-amber-300 font-bold'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                          }`}
                        >
                          <Banknote className="w-3.5 h-3.5" />
                          <span>Dinheiro</span>
                        </button>
                      </div>

                      {/* PIX Instantâneo Dynamic Preview Banner */}
                      {paymentMethod === 'pix' && (
                        <div className="mt-2 p-2.5 rounded-xl bg-emerald-950/40 border border-[#00E676]/30 flex items-start gap-2 text-xs">
                          <Zap className="w-4 h-4 text-[#00E676] shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <div className="text-white font-bold text-[11px] flex items-center gap-1.5">
                              <span>QR Code Pix Automático Pronto</span>
                              <span className="text-[9px] bg-[#00E676]/20 text-[#00E676] px-1.5 py-0.5 rounded font-mono">
                                {formatBRL(finalOrderTotal)}
                              </span>
                            </div>
                            <p className="text-[10px] text-zinc-400 leading-tight">
                              Chave Pix configurada da loja: <strong className="text-zinc-200">{tenant?.settings?.pixKey || '38.492.011/0001-85'}</strong> ({tenant?.settings?.pixBeneficiaryName || tenant?.name})
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Cartão de Crédito Dynamic Preview Banner */}
                      {paymentMethod === 'credit_card' && (
                        <div className="mt-2 p-2.5 rounded-xl bg-red-950/40 border border-red-500/30 flex items-start gap-2 text-xs">
                          <CreditCard className="w-4 h-4 text-[#FFC72C] shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <div className="text-white font-bold text-[11px] flex items-center gap-1.5">
                              <span>Gateway de Cartão de Crédito</span>
                              <span className="text-[9px] bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded font-mono">
                                Até 6x • Baixa Imediata
                              </span>
                            </div>
                            <p className="text-[10px] text-zinc-400 leading-tight">
                              Pague com Mastercard, Visa, Elo ou Amex. Autenticação imediata e envio direto à cozinha!
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Cartão de Débito Dynamic Preview Banner */}
                      {paymentMethod === 'debit_card' && (
                        <div className="mt-2 p-2.5 rounded-xl bg-blue-950/40 border border-blue-500/30 flex items-start gap-2 text-xs">
                          <CreditCard className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <div className="text-white font-bold text-[11px] flex items-center gap-1.5">
                              <span>Gateway de Cartão de Débito</span>
                              <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-mono">
                                À vista • Débito Online
                              </span>
                            </div>
                            <p className="text-[10px] text-zinc-400 leading-tight">
                              Débito instantâneo autorizado via gateway bancário com baixa no caixa em tempo real.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Cart Drawer Footer */}
              {cartItems.length > 0 && !orderPlacedSuccess && (
                <div className="p-4 bg-zinc-950 border-t border-zinc-800 space-y-3">
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-zinc-400">
                      <span>Subtotal</span>
                      <span>{formatBRL(cartSubtotal)}</span>
                    </div>
                    {orderChannel === 'delivery' && (
                      <div className="flex justify-between text-zinc-400">
                        <span>Taxa de Entrega</span>
                        <span className={deliveryFee === 0 ? 'text-emerald-400 font-bold' : ''}>
                          {deliveryFee === 0 ? 'GRÁTIS' : formatBRL(deliveryFee)}
                        </span>
                      </div>
                    )}
                    {orderChannel === 'dine_in' && (
                      <div className="flex justify-between text-zinc-400">
                        <span>Taxa de Atendimento Mesa (10%)</span>
                        <span>{formatBRL(cartSubtotal * 0.10)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-black text-white pt-1 border-t border-zinc-800">
                      <span>Total Geral</span>
                      <span className="text-[#FFC72C]">
                        {formatBRL(finalOrderTotal)}
                      </span>
                    </div>
                  </div>

                  {/* Dynamic Action Buttons based on Payment Method */}
                  {paymentMethod === 'pix' ? (
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          playBeep(800, 0.05);
                          setGatewayInitialMethod('pix');
                          setShowGatewayModal(true);
                        }}
                        className="w-full py-3 px-3 bg-gradient-to-r from-[#00E676] to-[#00C853] hover:brightness-110 active:scale-95 text-black font-black rounded-xl text-xs sm:text-sm transition-all shadow-[0_0_20px_rgba(0,230,118,0.3)] flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <QrCode className="w-4 h-4 text-black" />
                        <span>Pagar via Pix Dinâmico ({formatBRL(finalOrderTotal)})</span>
                      </button>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={handleSendWhatsAppOrder}
                          className="py-2.5 px-2 bg-[#25D366]/20 hover:bg-[#25D366]/30 border border-[#25D366]/40 text-[#25D366] font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Pedir no WhatsApp</span>
                        </button>
                        <button
                          onClick={handleFinalizeSystemOrder}
                          className="py-2.5 px-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#FFC72C]" />
                          <span>Enviar sem Pagar Agora</span>
                        </button>
                      </div>
                    </div>
                  ) : paymentMethod === 'credit_card' ? (
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          playBeep(800, 0.05);
                          setGatewayInitialMethod('credit_card');
                          setShowGatewayModal(true);
                        }}
                        className="w-full py-3 px-3 bg-gradient-to-r from-[#DA291C] to-[#B81F14] hover:brightness-110 active:scale-95 text-white font-black rounded-xl text-xs sm:text-sm transition-all shadow-[0_0_20px_rgba(218,41,28,0.3)] flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <CreditCard className="w-4 h-4 text-white" />
                        <span>Pagar com Cartão de Crédito ({formatBRL(finalOrderTotal)})</span>
                      </button>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={handleSendWhatsAppOrder}
                          className="py-2.5 px-2 bg-[#25D366]/20 hover:bg-[#25D366]/30 border border-[#25D366]/40 text-[#25D366] font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Pedir no WhatsApp</span>
                        </button>
                        <button
                          onClick={handleFinalizeSystemOrder}
                          className="py-2.5 px-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#FFC72C]" />
                          <span>Enviar sem Pagar Agora</span>
                        </button>
                      </div>
                    </div>
                  ) : paymentMethod === 'debit_card' ? (
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          playBeep(800, 0.05);
                          setGatewayInitialMethod('debit_card');
                          setShowGatewayModal(true);
                        }}
                        className="w-full py-3 px-3 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-black rounded-xl text-xs sm:text-sm transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <CreditCard className="w-4 h-4 text-white" />
                        <span>Pagar com Cartão de Débito ({formatBRL(finalOrderTotal)})</span>
                      </button>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={handleSendWhatsAppOrder}
                          className="py-2.5 px-2 bg-[#25D366]/20 hover:bg-[#25D366]/30 border border-[#25D366]/40 text-[#25D366] font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Pedir no WhatsApp</span>
                        </button>
                        <button
                          onClick={handleFinalizeSystemOrder}
                          className="py-2.5 px-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#FFC72C]" />
                          <span>Enviar sem Pagar Agora</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <button
                        onClick={handleFinalizeSystemOrder}
                        className="w-full py-3 px-3 bg-gradient-to-r from-[#DA291C] to-[#B81F14] hover:brightness-110 active:scale-95 text-white font-black rounded-xl text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4 text-[#FFC72C]" />
                        <span>Finalizar Pedido ({paymentMethod === 'cash' ? 'Pagar no Dinheiro' : 'Vale Refeição'})</span>
                      </button>
                      <button
                        onClick={handleSendWhatsAppOrder}
                        className="w-full py-2.5 px-2 bg-[#25D366]/20 hover:bg-[#25D366]/30 border border-[#25D366]/40 text-[#25D366] font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Confirmar também no WhatsApp</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==========================================
          GATEWAY DE PAGAMENTO INTEGRADO (PIX, CRÉDITO, DÉBITO)
          COM BAIXA AUTOMÁTICA NO SISTEMA E FINANCEIRO
          ========================================== */}
      <PaymentGatewayModal
        isOpen={showGatewayModal}
        onClose={() => setShowGatewayModal(false)}
        orderPayload={pixOrderPayload}
        initialMethod={gatewayInitialMethod}
        onPaymentSuccess={handleGatewayPaymentSuccess}
      />

      {/* ==========================================
          MODAL DE PAGAMENTO PIX DINÂMICO INTEGRADO AO KDS
          ========================================== */}
      <PixDynamicPaymentModal
        isOpen={showPixModal}
        onClose={() => setShowPixModal(false)}
        orderPayload={pixOrderPayload}
        onPaymentConfirmed={handlePixPaymentConfirmed}
        onNavigateToKDS={() => setCurrentView('kds')}
        readingMode={readingMode}
      />

      {/* ==========================================
          MODAL: ÍNDICE VISUAL DE CATEGORIAS (QUICK JUMP SHEET)
          ========================================== */}
      <AnimatePresence>
        {isQuickIndexOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 20 }}
              className={`w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden my-4 flex flex-col max-h-[90vh] border ${
                readingMode
                  ? 'bg-white border-2 border-zinc-300 text-zinc-900'
                  : 'bg-[#111118] border-zinc-700/80 text-zinc-100'
              }`}
            >
              {/* Modal Header */}
              <div className={`p-4 sm:p-5 flex items-center justify-between border-b ${
                readingMode ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-950/90 border-zinc-800'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    readingMode
                      ? 'bg-red-100 border-2 border-red-300 text-[#DA291C]'
                      : 'bg-[#DA291C]/20 border border-[#DA291C]/40 text-[#FFC72C]'
                  }`}>
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className={`text-lg font-black flex items-center gap-2 ${
                      readingMode ? 'text-zinc-950' : 'text-white'
                    }`}>
                      <span>Navegar por Categorias</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold border ${
                        readingMode
                          ? 'bg-amber-100 text-amber-950 border-amber-300'
                          : 'bg-[#FFC72C]/20 text-[#FFC72C] border-[#FFC72C]/30'
                      }`}>
                        {categories.length} Seções
                      </span>
                    </h3>
                    <p className={`text-xs ${readingMode ? 'text-zinc-700 font-medium' : 'text-zinc-400'}`}>
                      Toque em qualquer categoria para saltar instantaneamente
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsQuickIndexOpen(false)}
                  className={`p-2 rounded-xl transition-all cursor-pointer ${
                    readingMode
                      ? 'text-zinc-700 hover:text-black bg-zinc-100 hover:bg-zinc-200 border border-zinc-300'
                      : 'text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800'
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Category Grid with High Quality Thumbnails */}
              <div className="p-4 sm:p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 scrollbar-thin">
                {/* Option: Ver Todos os Pratos */}
                <button
                  type="button"
                  onClick={() => {
                    handleSelectCategory('all');
                    setIsQuickIndexOpen(false);
                  }}
                  className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                    readingMode
                      ? activeCategory === 'all'
                        ? 'bg-red-50 border-2 border-[#DA291C] shadow-md'
                        : 'bg-zinc-50 hover:bg-zinc-100 border-2 border-zinc-200 hover:border-black'
                      : activeCategory === 'all'
                        ? 'bg-gradient-to-r from-[#DA291C]/30 to-[#FFC72C]/20 border-[#FFC72C] shadow-lg shadow-red-950/30'
                        : 'bg-zinc-900/80 hover:bg-zinc-800/90 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                    readingMode
                      ? 'bg-red-100 border-red-300 text-[#DA291C]'
                      : 'bg-[#FFC72C]/20 border-[#FFC72C]/40 text-[#FFC72C]'
                  }`}>
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-black text-sm ${readingMode ? 'text-zinc-950' : 'text-white'}`}>Todos os Pratos</h4>
                    <p className={`text-[11px] ${readingMode ? 'text-zinc-600 font-medium' : 'text-zinc-400'}`}>{products.length} opções disponíveis</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0" />
                </button>

                {categories.map((cat) => {
                  const details = getCategoryDetails(cat);
                  const count = products.filter((p) => p.category === cat.id).length;
                  const isActive = activeCategory === cat.id;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        handleSelectCategory(cat.id);
                        setIsQuickIndexOpen(false);
                      }}
                      className={`relative overflow-hidden group rounded-2xl border p-3 text-left transition-all duration-200 cursor-pointer flex items-center gap-3.5 ${
                        readingMode
                          ? isActive
                            ? 'border-2 border-[#DA291C] ring-2 ring-red-400/40 bg-red-50/50 shadow-md'
                            : 'border-2 border-zinc-200 bg-zinc-50 hover:bg-zinc-100 hover:border-black'
                          : isActive
                            ? 'border-[#FFC72C] ring-2 ring-[#FFC72C]/30 bg-zinc-900 shadow-xl'
                            : 'border-zinc-800/90 bg-zinc-900/60 hover:bg-zinc-800/80 hover:border-zinc-700'
                      }`}
                    >
                      {/* High-res thumbnail */}
                      <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-white/10 shadow-md">
                        <img
                          src={details.imageUrl}
                          alt={cat.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          {getCategoryIcon(cat.icon, 'w-5 h-5 text-white drop-shadow-md')}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className={`font-black text-sm truncate ${
                            readingMode ? 'text-zinc-950 group-hover:text-[#DA291C]' : 'text-white group-hover:text-[#FFC72C]'
                          } transition-colors`}>
                            {cat.name}
                          </h4>
                        </div>
                        <p className={`text-[10px] truncate mt-0.5 ${readingMode ? 'text-zinc-600 font-medium' : 'text-zinc-400'}`}>
                          {details.badge}
                        </p>
                        <div className="flex items-center justify-between mt-1 text-[10px]">
                          <span className={`font-mono font-bold ${readingMode ? 'text-[#B81F14]' : 'text-[#FFC72C]'}`}>
                            {count} {count === 1 ? 'item' : 'itens'}
                          </span>
                          {details.startingPrice && (
                            <span className={readingMode ? 'text-zinc-600' : 'text-zinc-400'}>
                              A partir de <strong className={readingMode ? 'text-zinc-950 font-bold' : 'text-zinc-200'}>{formatBRL(details.startingPrice)}</strong>
                            </span>
                          )}
                        </div>
                      </div>

                      <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white shrink-0 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  );
                })}
              </div>

              {/* Modal Footer */}
              <div className={`p-3 border-t text-center text-xs flex items-center justify-between px-5 ${
                readingMode ? 'bg-zinc-50 border-zinc-200 text-zinc-700 font-medium' : 'bg-zinc-950 border-zinc-800 text-zinc-400'
              }`}>
                <span>Total de {products.length} itens cadastrados</span>
                <button
                  type="button"
                  onClick={() => setIsQuickIndexOpen(false)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    readingMode
                      ? 'bg-zinc-900 text-white hover:bg-black'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                  }`}
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==========================================
          MODAL DE SUGESTÃO INTELIGENTE / UPSELL
          ========================================== */}
      <SmartUpsellModal
        isOpen={isSmartUpsellOpen}
        onClose={() => setIsSmartUpsellOpen(false)}
        mainProduct={smartUpsellProduct}
        allProducts={products}
        currentCartItems={cartItems}
        onAddRecommendation={handleAddRecommendation}
        onGoToCart={() => setIsCartOpen(true)}
        readingMode={readingMode}
      />

      {/* FLOATING QUICK CATEGORY NAVIGATOR BUTTON */}
      {!isCartOpen && (
        <div className="fixed bottom-5 right-5 z-30 flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.94 }}
            type="button"
            onClick={() => {
              playBeep(850, 0.04);
              setIsQuickIndexOpen(true);
            }}
            className="flex items-center gap-2.5 px-4 py-2.5 bg-gradient-to-r from-[#DA291C] via-[#B81F14] to-black text-white font-black text-xs sm:text-sm rounded-full shadow-2xl border-2 border-[#FFC72C] shadow-red-950/70 hover:shadow-[0_0_20px_rgba(255,199,44,0.4)] cursor-pointer backdrop-blur-md transition-all active:scale-95"
            title="Abrir Índice de Categorias com Fotos"
          >
            <div className="w-6 h-6 rounded-full bg-[#FFC72C] flex items-center justify-center text-black font-black shadow-sm">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <span>Categorias</span>
            <span className="px-1.5 py-0.5 rounded-full bg-black/70 text-[#FFC72C] text-[10px] font-mono font-bold border border-[#FFC72C]/40">
              {categories.length}
            </span>
          </motion.button>
        </div>
      )}
    </div>
  );
};

// ==========================================
// SUB-COMPONENT: PRODUCT LIST ITEM
// ==========================================
interface ProductListItemProps {
  product: Product;
  category?: ProductCategory;
  onCustomize: () => void;
  onQuickAdd: (e: React.MouseEvent) => void;
  readingMode?: boolean;
  fontSizeScale?: 'normal' | 'large' | 'xlarge';
  searchQuery?: string;
}

const ProductListItem: React.FC<ProductListItemProps> = ({
  product,
  category,
  onCustomize,
  onQuickAdd,
  readingMode = false,
  fontSizeScale = 'normal',
  searchQuery = '',
}) => {
  const hasVariants = product.priceVariants && product.priceVariants.length > 0;

  // Accessible font-size scales
  const titleClasses =
    fontSizeScale === 'xlarge'
      ? 'text-base sm:text-lg lg:text-xl font-black'
      : fontSizeScale === 'large'
        ? 'text-sm sm:text-base lg:text-lg font-black'
        : 'text-sm sm:text-base font-black';

  const descClasses =
    fontSizeScale === 'xlarge'
      ? 'text-sm sm:text-base'
      : fontSizeScale === 'large'
        ? 'text-xs sm:text-sm'
        : 'text-xs';

  const priceClasses =
    fontSizeScale === 'xlarge'
      ? 'text-base sm:text-lg font-black'
      : fontSizeScale === 'large'
        ? 'text-sm sm:text-base font-black'
        : 'text-sm sm:text-base font-black';

  return (
    <motion.div
      whileHover={{ y: -2 }}
      onClick={onCustomize}
      className={`group relative rounded-2xl p-3.5 sm:p-4 flex gap-3.5 sm:gap-4 cursor-pointer transition-all duration-200 ${
        readingMode
          ? 'bg-white hover:bg-zinc-50 border-2 border-zinc-300 hover:border-zinc-950 shadow-sm hover:shadow-md'
          : 'bg-[#111116] hover:bg-[#16161D] border border-zinc-800/80 hover:border-[#FFC72C]/40 shadow-md hover:shadow-xl hover:shadow-red-950/20'
      }`}
    >
      {/* Product Image & Badges */}
      <div className={`relative w-28 sm:w-36 h-28 sm:h-36 shrink-0 rounded-xl overflow-hidden ${
        readingMode ? 'bg-zinc-100 border-2 border-zinc-300' : 'bg-zinc-900 border border-zinc-800/80'
      }`}>
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Item Number Badge */}
        {product.itemNumber && (
          <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-[#DA291C] text-white font-black text-[10px] font-mono shadow-md">
            #{product.itemNumber}
          </span>
        )}

        {/* Highlight Tag badge */}
        {product.badgeText && (
          <span className={`absolute bottom-1.5 left-1.5 right-1.5 text-center px-1.5 py-0.5 rounded font-bold text-[9px] truncate ${
            readingMode
              ? 'bg-zinc-900/90 text-amber-300 border border-zinc-800'
              : 'bg-black/80 backdrop-blur-sm text-[#FFC72C] border border-white/10'
          }`}>
            {product.badgeText}
          </span>
        )}
      </div>

      {/* Product Information */}
      <div className="flex-1 flex flex-col justify-between min-w-0">
        <div>
          {/* Category mini-badge indicator */}
          {category && (
            <div className={`flex items-center gap-1 text-[10px] font-bold mb-1 ${
              readingMode ? 'text-[#B81F14]' : 'text-[#FFC72C]'
            }`}>
              <span className={`p-0.5 rounded ${readingMode ? 'bg-red-100 text-[#DA291C]' : 'bg-[#DA291C]/20 text-[#FFC72C]'}`}>
                {getCategoryIcon(category.icon, 'w-3 h-3')}
              </span>
              <span className="truncate">{category.name}</span>
            </div>
          )}

          <div className="flex items-start justify-between gap-2">
            <h3 className={`${titleClasses} leading-tight line-clamp-1 transition-colors ${
              readingMode ? 'text-zinc-950 group-hover:text-[#DA291C]' : 'text-white group-hover:text-[#FFC72C]'
            }`}>
              <HighlightText text={product.name} highlight={searchQuery} readingMode={readingMode} />
            </h3>
          </div>

          <p className={`${descClasses} mt-1 line-clamp-2 sm:line-clamp-3 leading-relaxed ${
            readingMode ? 'text-zinc-800 font-medium' : 'text-zinc-400'
          }`}>
            <HighlightText text={product.description} highlight={searchQuery} readingMode={readingMode} />
          </p>

          {/* Tags */}
          {product.tags && product.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {product.tags.slice(0, 2).map((t, idx) => (
                <span
                  key={idx}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                    readingMode
                      ? 'bg-zinc-100 text-zinc-800 border-zinc-300'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                  }`}
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Price & Action Button */}
        <div className={`flex flex-wrap items-center justify-between gap-2 pt-2.5 mt-1 border-t ${
          readingMode ? 'border-zinc-200' : 'border-zinc-800/80'
        }`}>
          <div>
            {hasVariants ? (
              <div className="flex items-center gap-1.5 flex-wrap">
                {product.priceVariants!.slice(0, 3).map((v, idx) => (
                  <div
                    key={idx}
                    className={`px-2 py-0.5 rounded-lg text-center border ${
                      readingMode
                        ? 'bg-zinc-100 border-zinc-300'
                        : 'bg-[#FFC72C]/10 border-[#FFC72C]/30'
                    }`}
                  >
                    <span className={`text-[9px] font-bold block uppercase ${
                      readingMode ? 'text-zinc-700' : 'text-zinc-400'
                    }`}>{v.label}</span>
                    <span className={`text-xs font-black font-mono ${
                      readingMode ? 'text-[#B81F14]' : 'text-[#FFC72C]'
                    }`}>{formatBRL(v.price)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className={`px-2.5 py-1 rounded-xl font-mono shadow-md ${priceClasses} ${
                  readingMode
                    ? 'bg-zinc-950 text-white border border-black'
                    : 'bg-gradient-to-r from-[#FFC72C] to-[#FFD255] text-black shadow-amber-500/20'
                }`}>
                  {formatBRL(product.price)}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onQuickAdd}
              className={`flex items-center gap-1.5 px-3 py-1.5 font-black text-xs rounded-xl transition-all shadow-md cursor-pointer active:scale-95 ${
                readingMode
                  ? 'bg-[#DA291C] hover:bg-black text-white border border-red-800'
                  : 'bg-[#DA291C] hover:bg-[#FFC72C] hover:text-black text-white'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
