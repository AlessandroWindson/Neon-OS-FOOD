import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  LayoutGrid,
  List,
  Filter,
  ArrowUpDown,
  DollarSign,
  TrendingUp,
  Boxes,
  Eye,
  Camera,
  Edit3,
  CheckCircle2,
  AlertCircle,
  X,
  ScatterChart as ScatterIcon,
  Sparkles,
  ExternalLink,
  Flame,
  UtensilsCrossed,
  Layers,
  ChevronDown,
  Check,
  Plus
} from 'lucide-react';
import { Product, BCGClassification } from '../types';
import { formatBRL, formatPercent } from '../utils/formatters';
import { playBeep, playCashRegister } from '../utils/audio';

export interface ComputedProduct extends Product {
  computedPrice: number;
  computedCost: number;
  computedMarginReais: number;
  computedMarginPercent: number;
  computedVolume: number;
  computedRevenue: number;
  computedProfit: number;
  computedCmvPercent: number;
}

interface ProductImageGridProps {
  products: ComputedProduct[];
  onSelectProduct: (product: ComputedProduct) => void;
  onEditProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onFocusScatter: (product: ComputedProduct) => void;
  getQuadrantBadge: (q?: BCGClassification | string) => {
    label: string;
    short: string;
    color: string;
    bg: string;
    dot?: string;
    name?: string;
    icon?: string;
    action?: string;
    border?: string;
  };
  benchmarks: {
    avgVolume: number;
    avgMarginReais: number;
    avgMarginPercent: number;
    totalRevenue: number;
    totalProfit: number;
  };
  onOpenCatalogoPdf?: () => void;
  onOpenExportModal?: () => void;
  onNewProduct?: () => void;
}

// Preset library of curated, mouth-watering food photos
export const FOOD_PRESET_IMAGES = [
  {
    title: 'X-Salada Especial com Bisnagas',
    category: 'Burguer',
    url: '/images/x-salada-dulci.jpg'
  },
  {
    title: 'X-Tudo Gigante com Baré e Bisnagas',
    category: 'Burguer',
    url: '/images/x-tudo-gigante-dulci.jpg'
  },
  {
    title: 'X-Caboquinho Manaus (Tucumã & Coalho)',
    category: 'Lanches',
    url: '/images/x-caboquinho-manaus.jpg'
  },
  {
    title: 'Misto Quente Tostado na Chapa',
    category: 'Lanches',
    url: '/images/misto-quente-chapa.jpg'
  },
  {
    title: 'Pizza Tradicional Calabresa & Muçarela',
    category: 'Pizza',
    url: '/images/pizza-tradicional-dulci.jpg'
  },
  {
    title: 'Pastel Frito Crocante com Bisnagas',
    category: 'Porções',
    url: '/images/pastel-frito-crocante.jpg'
  },
  {
    title: 'Batata Frita Crocante com Bisnagas',
    category: 'Porções',
    url: '/images/batata-frita-dulci.jpg'
  },
  {
    title: 'Tigela de Açaí Tradicional de Manaus',
    category: 'Açaí',
    url: '/images/acai-tigela-manaus.jpg'
  },
  {
    title: 'Combo Oferta da Casa (X-Saladas + Baré)',
    category: 'Combos',
    url: '/images/combo-dulci-bare.jpg'
  },
  {
    title: 'Combo Família com Coca-Cola 1L',
    category: 'Combos',
    url: '/images/combo-dulci-coca.jpg'
  },
  {
    title: 'Combo Maior Economia com Guaraná Regente',
    category: 'Combos',
    url: '/images/combo-dulci-regente.jpg'
  },
  {
    title: 'Guaraná Baré 2L Geladinho',
    category: 'Bebidas',
    url: '/images/guarana-bare-2l-gelado.jpg'
  },
  {
    title: 'Guaraná Tuchaua 2L Regional',
    category: 'Bebidas',
    url: '/images/guarana-tuchaua-gelado.jpg'
  },
  {
    title: 'Teté Cola 2L Regional',
    category: 'Bebidas',
    url: '/images/tete-cola-gelada.jpg'
  },
  {
    title: 'Coca-Cola 2L Garrafa Gelada',
    category: 'Bebidas',
    url: '/images/coca-cola-2l-garrafa.jpg'
  },
  {
    title: 'Coca-Cola Lata 350ml Geladíssima',
    category: 'Bebidas',
    url: '/images/coca-cola-lata-gelada.jpg'
  },
  {
    title: 'Fanta Laranja Gelada',
    category: 'Bebidas',
    url: '/images/fanta-laranja-gelada.jpg'
  },
  {
    title: 'Chopp Artesanal IPA Gelado',
    category: 'Bebidas',
    url: '/images/chopp-artesanal-gelado.jpg'
  },
  {
    title: 'Água Mineral 500ml Geladinha',
    category: 'Bebidas',
    url: '/images/agua-mineral-500ml.jpg'
  }
];

export const ProductImageGrid: React.FC<ProductImageGridProps> = ({
  products,
  onSelectProduct,
  onEditProduct,
  onUpdateProduct,
  onFocusScatter,
  getQuadrantBadge,
  benchmarks,
  onOpenCatalogoPdf,
  onOpenExportModal,
  onNewProduct
}) => {
  // View mode layout: 'cards' (Visual Image Grid) or 'table' (Detailed Technical Table)
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Local search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedQuadrant, setSelectedQuadrant] = useState<BCGClassification | 'all'>('all');
  const [sortBy, setSortBy] = useState<
    'sales_desc' | 'revenue_desc' | 'margin_reais_desc' | 'cmv_asc' | 'price_desc' | 'price_asc' | 'name_asc'
  >('sales_desc');

  // Lightbox / Image Zoom Modal
  const [previewProduct, setPreviewProduct] = useState<ComputedProduct | null>(null);
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [isChangingPhoto, setIsChangingPhoto] = useState(false);

  // Category mapping
  const categoryMap: Record<string, { name: string; icon: string }> = {
    cat_smash: { name: 'Burguers & Smash', icon: '🍔' },
    cat_pizzas_tradicionais: { name: 'Pizzas Tradicionais', icon: '🍕' },
    cat_pizzas_especiais: { name: 'Pizzas Especiais', icon: '⭐' },
    cat_pizzas_doces: { name: 'Pizzas Doces', icon: '🍫' },
    cat_lanches: { name: 'Lanches da Casa', icon: '🥪' },
    cat_portions: { name: 'Porções & Fritas', icon: '🍟' },
    cat_acai: { name: 'Açaí & Sobremesas', icon: '🍧' },
    cat_combos: { name: 'Combos do Chef', icon: '🏷️' },
    cat_drinks: { name: 'Bebidas & Chopp', icon: '🥤' }
  };

  // Station mapping
  const stationMap: Record<string, string> = {
    grill: '🍔 Grelha',
    fryer: '🍟 Fritura',
    assembly: '🥪 Montagem',
    bar: '🥤 Bar & Bebidas',
    dessert: '🍧 Sobremesas',
    all: 'Geral'
  };

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchQuadrant =
        selectedQuadrant === 'all' ||
        p.bcgClassification === selectedQuadrant ||
        (selectedQuadrant === 'puzzle' && (p.bcgClassification === 'puzzle' || p.bcgClassification === 'question_mark'));

      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;

      const matchSearch =
        searchTerm.trim() === '' ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.tags && p.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase())));

      return matchQuadrant && matchCat && matchSearch;
    });
  }, [products, selectedQuadrant, selectedCategory, searchTerm]);

  // Sort products
  const sortedProducts = useMemo(() => {
    const list = [...filteredProducts];
    switch (sortBy) {
      case 'sales_desc':
        return list.sort((a, b) => b.computedVolume - a.computedVolume);
      case 'revenue_desc':
        return list.sort((a, b) => b.computedRevenue - a.computedRevenue);
      case 'margin_reais_desc':
        return list.sort((a, b) => b.computedMarginReais - a.computedMarginReais);
      case 'cmv_asc':
        return list.sort((a, b) => a.computedCmvPercent - b.computedCmvPercent);
      case 'price_desc':
        return list.sort((a, b) => b.computedPrice - a.computedPrice);
      case 'price_asc':
        return list.sort((a, b) => a.computedPrice - b.computedPrice);
      case 'name_asc':
        return list.sort((a, b) => a.name.localeCompare(b.name));
      default:
        return list;
    }
  }, [filteredProducts, sortBy]);

  // Toggle availability right from card
  const handleToggleAvailability = (e: React.MouseEvent, prod: ComputedProduct) => {
    e.stopPropagation();
    const updated: Product = {
      ...prod,
      available: !prod.available
    };
    onUpdateProduct(updated);
    playBeep(prod.available ? 600 : 900, 0.04);
  };

  // Open Image Lightbox
  const handleOpenPreview = (e: React.MouseEvent, prod: ComputedProduct) => {
    e.stopPropagation();
    setPreviewProduct(prod);
    setCustomImageUrl(prod.imageUrl || '');
    setIsChangingPhoto(false);
    playBeep(750, 0.03);
  };

  // Save new photo from Lightbox
  const handleSavePhoto = (newUrl: string) => {
    if (!previewProduct || !newUrl.trim()) return;
    const updated: Product = {
      ...previewProduct,
      imageUrl: newUrl.trim()
    };
    onUpdateProduct(updated);
    setPreviewProduct({
      ...previewProduct,
      imageUrl: newUrl.trim()
    });
    setIsChangingPhoto(false);
    playCashRegister();
  };

  return (
    <div className="space-y-6">
      {/* Top Filter and Controls Toolbar */}
      <div className="bg-[#111117] border border-[#222230] p-4 sm:p-5 rounded-3xl space-y-4 shadow-xl">
        {/* Row 1: Search, Layout Toggle, Sort, and Quick Action Buttons */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pb-3 border-b border-[#20202E]">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#71717A] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nome do prato, descrição ou tag..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-[#181824] border border-[#282838] rounded-xl pl-10 pr-8 py-2.5 text-xs text-white placeholder-[#52525B] focus:border-[#FFC72C] focus:outline-none transition-all font-medium"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right Toolbar Controls */}
          <div className="flex flex-wrap items-center gap-2.5 justify-end">
            {/* View Mode Switcher (Cards Grid vs Detailed Table) */}
            <div className="flex items-center bg-[#0C0C12] p-1 rounded-xl border border-[#242436]">
              <button
                onClick={() => {
                  setViewMode('cards');
                  playBeep(700, 0.02);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-[#FFC72C] text-black shadow-md'
                    : 'text-[#A1A1AA] hover:text-white'
                }`}
                title="Visualização em Grade Visual com Fotos"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Grade com Fotos</span>
              </button>

              <button
                onClick={() => {
                  setViewMode('table');
                  playBeep(700, 0.02);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-[#FFC72C] text-black shadow-md'
                    : 'text-[#A1A1AA] hover:text-white'
                }`}
                title="Visualização em Lista e Fichas Técnicas"
              >
                <List className="w-3.5 h-3.5" />
                <span>Lista Técnica</span>
              </button>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 bg-[#181824] border border-[#282838] px-2.5 py-1.5 rounded-xl text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#FFC72C]" />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer pr-2"
              >
                <option value="sales_desc" className="bg-[#181824] text-white">Mais Vendidos (Volume 30d)</option>
                <option value="revenue_desc" className="bg-[#181824] text-white">Maior Faturamento (R$)</option>
                <option value="margin_reais_desc" className="bg-[#181824] text-white">Maior Margem (R$)</option>
                <option value="cmv_asc" className="bg-[#181824] text-white">Menor Custo Ingredientes (Mais Eficiente)</option>
                <option value="price_desc" className="bg-[#181824] text-white">Preço: Maior ao Menor</option>
                <option value="price_asc" className="bg-[#181824] text-white">Preço: Menor ao Maior</option>
                <option value="name_asc" className="bg-[#181824] text-white">Nome A-Z</option>
              </select>
            </div>

            {/* Export Buttons */}
            {onOpenCatalogoPdf && (
              <button
                onClick={onOpenCatalogoPdf}
                className="px-3 py-2 bg-[#DA291C] hover:bg-[#E31837] text-white border border-[#FFC72C]/40 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(218,41,28,0.3)] transition-all"
                title="Exportar Cardápio Oficial em PDF com QR Code"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#FFC72C]" />
                <span>Catálogo PDF</span>
              </button>
            )}

            {onNewProduct && (
              <button
                onClick={onNewProduct}
                className="px-3 py-2 bg-gradient-to-r from-[#FFC72C] to-[#FF9E00] hover:brightness-110 text-black rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
              >
                <Plus className="w-4 h-4 text-black" />
                <span>Novo Prato</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Category Filter Horizontal Scrollable Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <span className="text-[11px] font-bold uppercase text-[#71717A] shrink-0 mr-1">
            Categorias:
          </span>

          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              selectedCategory === 'all'
                ? 'bg-white text-black shadow-md font-black'
                : 'bg-[#181824] text-[#A1A1AA] hover:text-white border border-[#282838]'
            }`}
          >
            <span>🍽️ Todas</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30 font-mono">
              {products.length}
            </span>
          </button>

          {Object.entries(categoryMap).map(([catId, info]) => {
            const count = products.filter(p => p.category === catId).length;
            const isSelected = selectedCategory === catId;

            return (
              <button
                key={catId}
                onClick={() => setSelectedCategory(isSelected ? 'all' : catId)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#FFC72C] text-black shadow-md font-black'
                    : 'bg-[#181824] text-[#A1A1AA] hover:text-white border border-[#282838]'
                }`}
              >
                <span>{info.icon}</span>
                <span>{info.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isSelected ? 'bg-black/20 text-black font-bold' : 'bg-black/40 text-zinc-400'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Row 3: Quadrant Filter Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[11px] font-bold uppercase text-[#71717A] mr-1">
              Matriz BCG:
            </span>

            {[
              { id: 'all', label: 'Todos os Quadrantes', count: products.length, color: 'text-white' },
              { id: 'star', label: '⭐ Estrelas', count: products.filter(p => p.bcgClassification === 'star').length, color: 'text-[#FFE600]' },
              { id: 'cash_cow', label: '🐄 Vacas Leiteiras', count: products.filter(p => p.bcgClassification === 'cash_cow' || p.bcgClassification === 'horse').length, color: 'text-[#00E676]' },
              { id: 'puzzle', label: '❓ Interrogações', count: products.filter(p => p.bcgClassification === 'puzzle' || p.bcgClassification === 'question_mark').length, color: 'text-[#00E5FF]' },
              { id: 'dog', label: '🍍 Abacaxis', count: products.filter(p => p.bcgClassification === 'dog').length, color: 'text-[#FF2B4E]' },
            ].map(q => (
              <button
                key={q.id}
                onClick={() => setSelectedQuadrant(selectedQuadrant === q.id ? 'all' : (q.id as any))}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs border flex items-center gap-1.5 transition-all cursor-pointer ${
                  selectedQuadrant === q.id
                    ? 'bg-[#252538] text-white border-[#FFC72C] shadow-sm'
                    : 'bg-[#151520] text-[#A1A1AA] border-[#252536] hover:text-white'
                }`}
              >
                <span className={q.color}>{q.label}</span>
                <span className="text-[10px] bg-black/40 px-1.5 py-0.2 rounded font-mono">
                  {q.count}
                </span>
              </button>
            ))}
          </div>

          <div className="text-xs text-[#A1A1AA]">
            Exibindo <strong className="text-white font-mono">{sortedProducts.length}</strong> de {products.length} itens
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODE 1: VISUAL IMAGE GRID (Cards com Imagens em Destaque)*/}
      {/* ======================================================== */}
      {viewMode === 'cards' && (
        <div>
          {sortedProducts.length === 0 ? (
            <div className="bg-[#111117] border border-[#222230] p-12 rounded-3xl text-center space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-[#1C1C28] flex items-center justify-center text-[#71717A] mx-auto">
                <UtensilsCrossed className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-white">Nenhum prato encontrado</h3>
              <p className="text-xs text-[#71717A] max-w-sm mx-auto">
                Tente ajustar a busca ou os filtros de categoria e quadrante BCG selecionados.
              </p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('all');
                  setSelectedQuadrant('all');
                }}
                className="px-4 py-2 bg-[#FFC72C] text-black text-xs font-black rounded-xl cursor-pointer hover:bg-yellow-400 transition-all shadow-md mt-2"
              >
                Limpar Todos os Filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
              <AnimatePresence mode="popLayout">
                {sortedProducts.map((prod, idx) => {
                  const badge = getQuadrantBadge(prod.bcgClassification);
                  const isAvailable = prod.available !== false;
                  const catInfo = categoryMap[prod.category] || { name: prod.category, icon: '🍽️' };
                  const stationLabel = stationMap[prod.station] || prod.station || 'Cozinha';

                  return (
                    <motion.div
                      key={prod.id}
                      layout
                      initial={{ opacity: 0, scale: 0.94, y: 12 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.92 }}
                      whileHover={{ y: -4 }}
                      transition={{
                        layout: { type: 'spring', stiffness: 350, damping: 30 },
                        type: 'spring',
                        stiffness: 400,
                        damping: 22,
                        delay: Math.min(0.2, idx * 0.02)
                      }}
                      className="group bg-[#13131D] hover:bg-[#181826] border border-[#242436] hover:border-[#FFC72C]/60 rounded-3xl overflow-hidden shadow-xl hover:shadow-[0_12px_36px_rgba(0,0,0,0.6)] transition-all duration-300 flex flex-col justify-between"
                    >
                      {/* CARD TOP: HERO IMAGE WITH OVERLAYS */}
                      <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-[#0A0A0F]">
                        {/* Food Image */}
                        <img
                          src={prod.imageUrl || FOOD_PRESET_IMAGES[0].url}
                          alt={prod.name}
                          className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500 ease-out"
                          loading="lazy"
                          onError={(e) => {
                            // Fallback to high-res generic delicious burger image if broken
                            (e.target as HTMLImageElement).src = FOOD_PRESET_IMAGES[0].url;
                          }}
                        />

                        {/* Top Gradient Vignette */}
                        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/90 pointer-events-none" />

                        {/* Top Left: BCG Quadrant Badge */}
                        <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide border shadow-lg backdrop-blur-md flex items-center gap-1 ${badge.bg}`}>
                            {badge.short}
                          </span>

                          {prod.badgeText && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-[#DA291C] text-white border border-[#FFC72C]/40 shadow-sm">
                              {prod.badgeText}
                            </span>
                          )}
                        </div>

                        {/* Top Right: Status Badge & Quick Zoom Button */}
                        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
                          {/* Availability Toggle Chip */}
                          <button
                            onClick={(e) => handleToggleAvailability(e, prod)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black border backdrop-blur-md transition-all cursor-pointer flex items-center gap-1 shadow-md ${
                              isAvailable
                                ? 'bg-[#00D26A]/20 border-[#00D26A]/40 text-[#00E676] hover:bg-[#00D26A]/30'
                                : 'bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30'
                            }`}
                            title={isAvailable ? 'Clique para pausar item no cardápio' : 'Clique para reativar item no cardápio'}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? 'bg-[#00E676] animate-pulse' : 'bg-red-400'}`} />
                            <span>{isAvailable ? 'Ativo' : 'Pausado'}</span>
                          </button>

                          {/* Quick Lightbox View Button */}
                          <button
                            onClick={(e) => handleOpenPreview(e, prod)}
                            className="p-1.5 rounded-xl bg-black/60 hover:bg-black text-zinc-300 hover:text-[#FFC72C] border border-white/10 backdrop-blur-md transition-all cursor-pointer"
                            title="Ampliar foto e ver detalhes"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Bottom Image Overlay: Price Tag & Category */}
                        <div className="absolute inset-x-0 bottom-0 p-3 pt-6 flex items-end justify-between z-10">
                          <div>
                            <span className="text-[10px] font-bold text-zinc-300 bg-black/60 px-2 py-0.5 rounded-md backdrop-blur-sm flex items-center gap-1 border border-white/10">
                              <span>{catInfo.icon}</span>
                              <span className="truncate max-w-[120px]">{catInfo.name}</span>
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="text-lg font-black font-mono text-[#00E676] drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                              {formatBRL(prod.computedPrice)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* CARD BODY: INFORMATION & FINANCIAL KPI TILES */}
                      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                        <div>
                          {/* Title & Station */}
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-black text-sm text-white group-hover:text-[#FFC72C] transition-colors line-clamp-1 leading-snug">
                              {prod.name}
                            </h3>
                          </div>

                          {/* Description */}
                          <p className="text-[11px] text-[#A1A1AA] line-clamp-2 mt-1 leading-relaxed min-h-[30px]">
                            {prod.description || 'Receita especial preparada com ingredientes selecionados do chef.'}
                          </p>
                        </div>

                        {/* 4-Metric Grid for Engineering Diagnosis */}
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#20202E] text-xs">
                          {/* Custo Insumos */}
                          <div className="bg-[#0C0C12] p-2 rounded-xl border border-[#222230]">
                            <span className="text-[9px] font-bold uppercase text-[#71717A] block">
                              Custo dos Ingredientes
                            </span>
                            <div className="font-mono font-bold text-white mt-0.5 flex items-center justify-between">
                              <span>{formatBRL(prod.computedCost)}</span>
                              <span className={`text-[10px] font-black px-1.5 py-0.2 rounded ${
                                prod.computedCmvPercent <= 28
                                  ? 'bg-[#00D26A]/20 text-[#00E676]'
                                  : prod.computedCmvPercent <= 34
                                  ? 'bg-yellow-500/20 text-yellow-400'
                                  : 'bg-red-500/20 text-red-400'
                              }`}>
                                {formatPercent(prod.computedCmvPercent)}
                              </span>
                            </div>
                          </div>

                          {/* Margem Unitária */}
                          <div className="bg-[#0C0C12] p-2 rounded-xl border border-[#222230]">
                            <span className="text-[9px] font-bold uppercase text-[#71717A] block">
                              Margem Unitária
                            </span>
                            <div className="font-mono font-bold text-[#FFC72C] mt-0.5 flex items-center justify-between">
                              <span>{formatBRL(prod.computedMarginReais)}</span>
                              <span className="text-[10px] text-zinc-400 font-mono">
                                {formatPercent(prod.computedMarginPercent)}
                              </span>
                            </div>
                          </div>

                          {/* Vendas no Mês */}
                          <div className="bg-[#0C0C12] p-2 rounded-xl border border-[#222230]">
                            <span className="text-[9px] font-bold uppercase text-[#71717A] block">
                              Volume (30 Dias)
                            </span>
                            <div className="font-mono font-bold text-[#77D4E1] mt-0.5 flex items-center justify-between">
                              <span>{prod.computedVolume} un</span>
                              <span className="text-[10px] text-zinc-500">
                                {prod.computedVolume >= benchmarks.avgVolume ? '🔥 Alta' : 'Baixa'}
                              </span>
                            </div>
                          </div>

                          {/* Faturamento Mensal */}
                          <div className="bg-[#0C0C12] p-2 rounded-xl border border-[#222230]">
                            <span className="text-[9px] font-bold uppercase text-[#71717A] block">
                              Faturamento Gerado
                            </span>
                            <div className="font-mono font-bold text-[#00E676] mt-0.5 truncate">
                              {formatBRL(prod.computedRevenue)}
                            </div>
                          </div>
                        </div>

                        {/* Classificação Visual Automática BCG (Vendas vs Custos) */}
                        <div className={`p-2.5 rounded-2xl border transition-all ${badge.bg}`}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-sm shrink-0">{badge.icon || '📊'}</span>
                              <div className="min-w-0">
                                <div className="font-black text-white text-xs leading-tight truncate flex items-center gap-1.5">
                                  <span>{badge.name || badge.short}</span>
                                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-black/40 text-zinc-300 font-bold">
                                    BCG
                                  </span>
                                </div>
                                <div className="text-[10px] text-zinc-300 truncate mt-0.5">
                                  {prod.computedVolume >= benchmarks.avgVolume ? 'Alto Volume' : 'Baixo Volume'} • {prod.computedMarginReais >= benchmarks.avgMarginReais ? 'Alta Margem' : 'Baixa Margem'}
                                </div>
                              </div>
                            </div>

                            {/* Dual Traffic Light Dots (Sales vs Cost Margin) */}
                            <div className="flex items-center gap-1.5 shrink-0 bg-black/50 px-2 py-1 rounded-xl border border-white/10">
                              <div className="flex items-center gap-1" title={`Vendas 30d: ${prod.computedVolume} un (Média: ${benchmarks.avgVolume} un)`}>
                                <span className={`w-2 h-2 rounded-full ${prod.computedVolume >= benchmarks.avgVolume ? 'bg-[#00E676] shadow-[0_0_6px_#00E676]' : 'bg-red-400'}`} />
                                <span className="text-[9px] font-mono font-bold text-zinc-300">Vendas</span>
                              </div>
                              <span className="text-zinc-600">•</span>
                              <div className="flex items-center gap-1" title={`Margem: ${formatBRL(prod.computedMarginReais)} (Média: ${formatBRL(benchmarks.avgMarginReais)})`}>
                                <span className={`w-2 h-2 rounded-full ${prod.computedMarginReais >= benchmarks.avgMarginReais ? 'bg-[#FFE600] shadow-[0_0_6px_#FFE600]' : 'bg-red-400'}`} />
                                <span className="text-[9px] font-mono font-bold text-zinc-300">Margem</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Station Tag & Insumos Count */}
                        <div className="flex items-center justify-between text-[10px] text-[#71717A] pt-1">
                          <span className="flex items-center gap-1 font-bold">
                            <span>Praça:</span>
                            <strong className="text-zinc-300 uppercase">{stationLabel}</strong>
                          </span>

                          <span className="text-zinc-400">
                            {((prod.ingredients || prod.recipe || []) as any[]).length} ingredientes na composição
                          </span>
                        </div>
                      </div>

                      {/* CARD FOOTER: ACTIONS */}
                      <div className="p-3 bg-[#0D0D14] border-t border-[#1F1F2E] flex items-center justify-between gap-2">
                        {/* Ver no Gráfico BCG */}
                        <button
                          onClick={() => {
                            onFocusScatter(prod);
                            playBeep(800, 0.03);
                          }}
                          className="flex-1 py-1.5 px-2 bg-[#181824] hover:bg-[#222234] text-[#FFE600] rounded-xl text-xs font-bold border border-[#2E2E42] hover:border-[#FFE600]/40 flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-sm"
                          title="Focar na Matriz BCG e Simular Preço"
                        >
                          <ScatterIcon className="w-3.5 h-3.5 text-[#FFE600]" />
                          <span>Simular Preço</span>
                        </button>

                        {/* Editar Ficha Técnica & Foto */}
                        <button
                          onClick={() => {
                            onEditProduct(prod);
                            playBeep(850, 0.04);
                          }}
                          className="flex-1 py-1.5 px-2 bg-[#20202E] hover:bg-[#2A2A3E] text-white rounded-xl text-xs font-bold border border-[#303044] hover:border-[#FFC72C]/40 flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-sm"
                          title="Editar Ingredientes, Preço e Fotografia"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-[#FFC72C]" />
                          <span>Ficha & Foto</span>
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODE 2: DETAILED TECHNICAL SHEET TABLE VIEW             */}
      {/* ======================================================== */}
      {viewMode === 'table' && (
        <div className="bg-[#111117] border border-[#222230] rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#0D0D14] border-b border-[#222232] text-[#71717A] uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4 font-bold">Prato / Foto</th>
                  <th className="py-3 px-3 font-bold">Categoria</th>
                  <th className="py-3 px-3 font-bold text-right">Preço Venda</th>
                  <th className="py-3 px-3 font-bold text-right">Custo Ingredientes</th>
                  <th className="py-3 px-3 font-bold text-right">Custo %</th>
                  <th className="py-3 px-3 font-bold text-right">Margem (R$)</th>
                  <th className="py-3 px-3 font-bold text-right">Volume 30d</th>
                  <th className="py-3 px-3 font-bold text-right">Faturamento</th>
                  <th className="py-3 px-3 font-bold text-center">Status do Prato</th>
                  <th className="py-3 px-4 font-bold text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1D1D2C]">
                {sortedProducts.map((prod) => {
                  const badge = getQuadrantBadge(prod.bcgClassification);
                  const isAvailable = prod.available !== false;

                  return (
                    <tr
                      key={prod.id}
                      className="hover:bg-[#161622] transition-colors group cursor-pointer"
                      onClick={() => onSelectProduct(prod)}
                    >
                      {/* Product Name and Thumbnail */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            onClick={(e) => handleOpenPreview(e, prod)}
                            className="w-12 h-12 rounded-xl bg-[#09090D] overflow-hidden shrink-0 border border-[#262638] relative cursor-zoom-in group-hover:border-[#FFC72C]/40 transition-all"
                            title="Clique para ampliar a foto"
                          >
                            <img
                              src={prod.imageUrl || FOOD_PRESET_IMAGES[0].url}
                              alt={prod.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-all"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = FOOD_PRESET_IMAGES[0].url;
                              }}
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                              <Eye className="w-3.5 h-3.5" />
                            </div>
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white group-hover:text-[#FFC72C] transition-colors truncate">
                                {prod.name}
                              </span>
                              {!isAvailable && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 font-bold">
                                  Pausado
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-[#71717A] truncate block max-w-xs">
                              {prod.description}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-3 text-zinc-300 font-medium">
                        {categoryMap[prod.category]?.name || prod.category}
                      </td>

                      {/* Selling Price */}
                      <td className="py-3 px-3 text-right font-black font-mono text-[#00E676]">
                        {formatBRL(prod.computedPrice)}
                      </td>

                      {/* Cost */}
                      <td className="py-3 px-3 text-right font-mono text-zinc-300">
                        {formatBRL(prod.computedCost)}
                      </td>

                      {/* CMV */}
                      <td className="py-3 px-3 text-right">
                        <span className={`px-1.5 py-0.5 rounded font-mono font-bold text-[11px] ${
                          prod.computedCmvPercent <= 28
                            ? 'bg-[#00D26A]/20 text-[#00E676]'
                            : prod.computedCmvPercent <= 34
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {formatPercent(prod.computedCmvPercent)}
                        </span>
                      </td>

                      {/* Margin Unit */}
                      <td className="py-3 px-3 text-right font-mono font-black text-[#FFC72C]">
                        {formatBRL(prod.computedMarginReais)}
                      </td>

                      {/* Volume */}
                      <td className="py-3 px-3 text-right font-mono text-zinc-200">
                        {prod.computedVolume} un
                      </td>

                      {/* Revenue */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-[#00D26A]">
                        {formatBRL(prod.computedRevenue)}
                      </td>

                      {/* Quadrant Badge */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black border ${badge.bg}`}>
                            <span>{badge.icon}</span>
                            <span>{badge.name || badge.short}</span>
                          </span>
                          <div className="flex items-center gap-1 text-[9px] text-zinc-400 font-mono">
                            <span className={`w-1.5 h-1.5 rounded-full ${prod.computedVolume >= benchmarks.avgVolume ? 'bg-[#00E676]' : 'bg-red-400'}`} title={`Volume: ${prod.computedVolume} un`} />
                            <span className={`w-1.5 h-1.5 rounded-full ${prod.computedMarginReais >= benchmarks.avgMarginReais ? 'bg-[#FFE600]' : 'bg-red-400'}`} title={`Margem: ${formatBRL(prod.computedMarginReais)}`} />
                          </div>
                        </div>
                      </td>

                      {/* Action buttons */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              onFocusScatter(prod);
                              playBeep(800, 0.03);
                            }}
                            className="p-1.5 rounded-lg bg-[#181824] hover:bg-[#242436] text-[#FFE600] border border-[#2B2B3E] cursor-pointer"
                            title="Ver na Matriz BCG"
                          >
                            <ScatterIcon className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => {
                              onEditProduct(prod);
                              playBeep(850, 0.04);
                            }}
                            className="p-1.5 rounded-lg bg-[#20202E] hover:bg-[#2A2A3E] text-white border border-[#303044] cursor-pointer"
                            title="Editar Ficha Técnica & Foto"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-[#FFC72C]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: IMAGE LIGHTBOX & QUICK PHOTO REPLACEMENT          */}
      {/* ======================================================== */}
      <AnimatePresence>
        {previewProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#12121A] border border-[#282838] w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden text-zinc-100 my-auto"
            >
              {/* Header */}
              <div className="p-4 sm:p-5 bg-[#0A0A10] border-b border-[#222232] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#FFC72C]/15 border border-[#FFC72C]/30 flex items-center justify-center text-[#FFC72C]">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <span>{previewProduct.name}</span>
                      <span className="text-xs font-mono font-black text-[#00E676] bg-[#00E676]/10 px-2 py-0.5 rounded-lg border border-[#00E676]/30">
                        {formatBRL(previewProduct.computedPrice)}
                      </span>
                    </h3>
                    <p className="text-xs text-[#A1A1AA]">
                      Fotografia em Alta Resolução & Detalhes da Ficha Técnica
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setPreviewProduct(null)}
                  className="p-2 text-zinc-400 hover:text-white hover:bg-[#1E1E2C] rounded-xl transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-4 sm:p-6 space-y-6">
                {/* Hero High-Res Image Showcase */}
                <div className="relative rounded-2xl overflow-hidden border border-[#28283C] bg-black h-72 sm:h-80 shadow-2xl">
                  <img
                    src={customImageUrl || previewProduct.imageUrl || FOOD_PRESET_IMAGES[0].url}
                    alt={previewProduct.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = FOOD_PRESET_IMAGES[0].url;
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

                  {/* Overlaid Badges */}
                  <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between z-10">
                    <div className="space-y-1">
                      <span className="px-3 py-1 rounded-full text-xs font-black bg-black/60 backdrop-blur-md border border-white/20 text-[#FFC72C] inline-block">
                        {getQuadrantBadge(previewProduct.bcgClassification).label}
                      </span>
                      <p className="text-xs text-zinc-300 max-w-md line-clamp-2">
                        {previewProduct.description}
                      </p>
                    </div>

                    <button
                      onClick={() => setIsChangingPhoto(!isChangingPhoto)}
                      className="px-3.5 py-2 bg-[#FFC72C] hover:bg-yellow-400 text-black text-xs font-black rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
                    >
                      <Camera className="w-4 h-4" />
                      <span>{isChangingPhoto ? 'Fechar Galeria' : 'Trocar Foto'}</span>
                    </button>
                  </div>
                </div>

                {/* Photo Change Section */}
                {isChangingPhoto && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 bg-[#181824] rounded-2xl border border-[#2C2C3E] space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-[#FFC72C]" />
                        <span>Selecione uma Foto Gastronômica ou Cole uma URL</span>
                      </h4>
                      <span className="text-[11px] text-[#A1A1AA]">
                        15 presets profissionais de alta conversão
                      </span>
                    </div>

                    {/* Custom URL input */}
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        value={customImageUrl}
                        onChange={e => setCustomImageUrl(e.target.value)}
                        placeholder="https://images.unsplash.com/..."
                        className="flex-1 bg-[#0F0F16] border border-[#2E2E40] rounded-xl px-3 py-2 text-xs text-white focus:border-[#FFC72C] focus:outline-none"
                      />
                      <button
                        onClick={() => handleSavePhoto(customImageUrl)}
                        className="px-4 py-2 bg-[#00D26A] hover:bg-[#00E676] text-black font-black text-xs rounded-xl cursor-pointer shadow-md transition-all flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Aplicar URL</span>
                      </button>
                    </div>

                    {/* Preset gallery tiles */}
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 pt-2 max-h-48 overflow-y-auto scrollbar-thin">
                      {FOOD_PRESET_IMAGES.map((preset, pIdx) => (
                        <div
                          key={pIdx}
                          onClick={() => {
                            setCustomImageUrl(preset.url);
                            handleSavePhoto(preset.url);
                          }}
                          className="group/preset relative h-20 rounded-xl overflow-hidden border border-[#2C2C3E] hover:border-[#FFC72C] cursor-pointer transition-all shadow-sm"
                        >
                          <img
                            src={preset.url}
                            alt={preset.title}
                            className="w-full h-full object-cover group-hover/preset:scale-110 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/40 group-hover/preset:bg-black/10 transition-colors" />
                          <span className="absolute inset-x-0 bottom-0 p-1 bg-black/80 text-[9px] font-bold text-white truncate text-center">
                            {preset.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Key KPIs Breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-[#161622] rounded-2xl border border-[#242436] text-center">
                    <span className="text-[10px] font-bold uppercase text-[#71717A]">Preço de Venda</span>
                    <div className="text-base font-black font-mono text-[#00E676] mt-1">
                      {formatBRL(previewProduct.computedPrice)}
                    </div>
                  </div>

                  <div className="p-3 bg-[#161622] rounded-2xl border border-[#242436] text-center">
                    <span className="text-[10px] font-bold uppercase text-[#71717A]">Custo Ingredientes</span>
                    <div className="text-base font-black font-mono text-white mt-1">
                      {formatBRL(previewProduct.computedCost)}
                    </div>
                  </div>

                  <div className="p-3 bg-[#161622] rounded-2xl border border-[#242436] text-center">
                    <span className="text-[10px] font-bold uppercase text-[#71717A]">Custo %</span>
                    <div className="text-base font-black font-mono text-[#FFC72C] mt-1">
                      {formatPercent(previewProduct.computedCmvPercent)}
                    </div>
                  </div>

                  <div className="p-3 bg-[#161622] rounded-2xl border border-[#242436] text-center">
                    <span className="text-[10px] font-bold uppercase text-[#71717A]">Volume Mensal</span>
                    <div className="text-base font-black font-mono text-[#77D4E1] mt-1">
                      {previewProduct.computedVolume} un
                    </div>
                  </div>
                </div>

                {/* Quick Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => {
                      const prodToFocus = previewProduct;
                      setPreviewProduct(null);
                      onFocusScatter(prodToFocus);
                    }}
                    className="px-4 py-2.5 bg-[#1C1C2A] hover:bg-[#252538] text-[#FFE600] font-bold text-xs rounded-xl border border-[#2C2C40] flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <ScatterIcon className="w-4 h-4" />
                    <span>Ver na Matriz BCG</span>
                  </button>

                  <button
                    onClick={() => {
                      const prodToEdit = previewProduct;
                      setPreviewProduct(null);
                      onEditProduct(prodToEdit);
                    }}
                    className="px-5 py-2.5 bg-gradient-to-r from-[#DA291C] to-[#FF7A00] hover:brightness-110 text-white font-black text-xs rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Edit3 className="w-4 h-4 text-[#FFC72C]" />
                    <span>Editar Ficha Técnica Completa</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
