import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Package,
  Plus,
  Search,
  Edit3,
  Trash2,
  CheckCircle2,
  X,
  UtensilsCrossed,
  AlertCircle,
  Filter,
  Camera,
  Upload,
  Image as ImageIcon,
  Eye,
  EyeOff,
  FolderPlus,
  RefreshCw,
  WifiOff,
  ChevronDown,
  Sparkles,
  Layers,
  ArrowRight,
  TrendingUp,
  Flame,
  Coffee,
  Wine,
  Tag,
  Sliders,
  Check,
  Download
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Product, ProductCategory, ProductPriceVariant } from '../types';
import { formatBRL } from '../utils/formatters';
import { playBeep, playCashRegister } from '../utils/audio';
import { db, auth } from '../lib/firebase';
import { doc, setDoc, deleteDoc, collection, onSnapshot } from 'firebase/firestore';

// Culinary and category resolution helper for human-friendly names, badges, icons and descriptions
const resolveCategoryInfo = (catKey: string, currentCategories: ProductCategory[] = []) => {
  if (!catKey || catKey.trim() === '' || catKey === 'Sem categoria') {
    return {
      id: 'sem_categoria',
      name: 'Sem Categoria',
      icon: 'UtensilsCrossed',
      badge: 'Geral',
      description: 'Itens adicionados sem categoria específica definida.'
    };
  }

  // 1. Direct match in registered categories
  const found = currentCategories.find(c => 
    c.id.toLowerCase() === catKey.toLowerCase() || 
    c.name.toLowerCase() === catKey.toLowerCase()
  );
  if (found && found.name && !found.name.toLowerCase().startsWith('cat_')) {
    return {
      id: found.id,
      name: found.name,
      icon: found.icon || 'Flame',
      badge: found.badge || '🔥 Artesanal',
      description: found.description || 'Itens selecionados e preparados na hora com qualidade artesanal.'
    };
  }

  // 2. Slug & culinary humanization for keys like 'cat_smash', 'smash', 'burgers', etc.
  const clean = catKey.replace(/^cat[_-]/i, '').replace(/[_-]/g, ' ').trim();
  const lower = clean.toLowerCase();

  const culinaryMap: Record<string, { name: string; icon: string; badge: string; desc: string }> = {
    'smash': { name: 'Burguers & Smash', icon: 'Flame', badge: '🔥 Mais Pedidos', desc: 'Blends 100% bovinos prensados com crostinha crocante na chapa e pão brioche.' },
    'smash burgers': { name: 'Burguers & Smash', icon: 'Flame', badge: '🔥 Mais Pedidos', desc: 'Blends 100% bovinos prensados com crostinha crocante na chapa e pão brioche.' },
    'burgers': { name: 'Burgers Artesanais', icon: 'Flame', badge: 'Especialidade', desc: 'Hambúrgueres especiais com blends selecionados e molhos artesanais.' },
    'hamburgueres': { name: 'Hambúrgueres & Smash', icon: 'Flame', badge: 'Especialidade', desc: 'Receitas artesanais preparadas na chapa de ferro e fogo alto.' },
    'bebidas': { name: 'Bebidas & Refrescos', icon: 'Coffee', badge: 'Refrescante', desc: 'Refrigerantes, sucos naturais e águas bem geladas.' },
    'drinks': { name: 'Drinks & Coquetéis', icon: 'Wine', badge: 'Bar VIP', desc: 'Coquetéis e drinks especiais preparados por nossos bartenders.' },
    'porcoes': { name: 'Porções & Entradas', icon: 'UtensilsCrossed', badge: 'Para Compartilhar', desc: 'Batatas crocantes, anéis de cebola e petiscos especiais servidos quentinhos.' },
    'sobremesas': { name: 'Sobremesas & Doces', icon: 'Sparkles', badge: 'Delícias', desc: 'Finalize sua experiência gastronômica com sobremesas artesanais irresistíveis.' },
    'combos': { name: 'Combos & Ofertas', icon: 'Package', badge: 'Econômico', desc: 'Refeições completas com lanche, acompanhamento e bebida gelada.' },
    'pizzas': { name: 'Pizzas Artesanais', icon: 'Flame', badge: 'Forno a Lenha', desc: 'Massas de fermentação lenta com coberturas generosas e queijo derretido.' },
    'lanches': { name: 'Lanches Especiais', icon: 'UtensilsCrossed', badge: 'Clássicos', desc: 'Sanduíches e lanches quentes feitos com ingredientes frescos do dia.' }
  };

  if (culinaryMap[lower]) {
    return {
      id: catKey,
      name: culinaryMap[lower].name,
      icon: culinaryMap[lower].icon,
      badge: culinaryMap[lower].badge,
      description: culinaryMap[lower].desc
    };
  }

  // Capitalize neatly
  const formatted = clean
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

  return {
    id: catKey,
    name: formatted || 'Geral',
    icon: 'UtensilsCrossed',
    badge: 'Cardápio',
    description: 'Itens disponíveis nesta seção do cardápio.'
  };
};

const renderCategoryIcon = (iconName: string, className = "w-5 h-5") => {
  switch ((iconName || '').toLowerCase()) {
    case 'flame':
      return <Flame className={className} />;
    case 'coffee':
      return <Coffee className={className} />;
    case 'wine':
      return <Wine className={className} />;
    case 'sparkles':
      return <Sparkles className={className} />;
    case 'package':
      return <Package className={className} />;
    case 'layers':
      return <Layers className={className} />;
    case 'tag':
      return <Tag className={className} />;
    default:
      return <UtensilsCrossed className={className} />;
  }
};

export const GestaoProdutos: React.FC = () => {
  const {
    products,
    setProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    categories,
    setCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    currentBranch,
    tenant,
    setCurrentView,
    openExportModal
  } = useApp();

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available' | 'unavailable'>('all');

  // Loading, Offline & Error States
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Category Customization State
  const [isEditCategoryModalOpen, setIsEditCategoryModalOpen] = useState(false);
  const [editingCategoryKey, setEditingCategoryKey] = useState<string>('');
  const [editingCategoryId, setEditingCategoryId] = useState<string>('');
  const [editCategoryName, setEditCategoryName] = useState<string>('');
  const [editCategoryIcon, setEditCategoryIcon] = useState<string>('Flame');
  const [editCategoryBadge, setEditCategoryBadge] = useState<string>('🔥 Mais Pedidos');
  const [editCategoryDesc, setEditCategoryDesc] = useState<string>('');

  // Form State: Product
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPrice, setFormPrice] = useState<string>('');
  const [formCostPrice, setFormCostPrice] = useState<string>('');
  const [formAvailable, setFormAvailable] = useState<boolean>(true);
  const [formImageUrl, setFormImageUrl] = useState<string>('');
  const [formVariants, setFormVariants] = useState<ProductPriceVariant[]>([]);
  const [newVariantLabel, setNewVariantLabel] = useState('');
  const [newVariantPrice, setNewVariantPrice] = useState('');

  // Form State: Category
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('UtensilsCrossed');

  // Photo Upload Ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Network listener
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Filter products by current branch and user filters
  const branchProducts = useMemo(() => {
    return products.filter(p => {
      if (p.branchId && p.branchId !== currentBranch?.id) return false;
      return true;
    });
  }, [products, currentBranch?.id]);

  // List of all active categories (from registered categories + categories present in products)
  const availableCategories = useMemo(() => {
    const map = new Map<string, { id: string; name: string; icon: string; badge?: string }>();
    
    // First from categories
    categories.forEach(c => {
      map.set(c.name.toLowerCase(), {
        id: c.id,
        name: c.name,
        icon: c.icon || 'UtensilsCrossed',
        badge: c.badge
      });
    });

    // Then from products
    branchProducts.forEach(p => {
      if (p.category && p.category.trim()) {
        const meta = resolveCategoryInfo(p.category.trim(), categories);
        if (!map.has(meta.name.toLowerCase())) {
          map.set(meta.name.toLowerCase(), {
            id: meta.id,
            name: meta.name,
            icon: meta.icon,
            badge: meta.badge
          });
        }
      }
    });

    return Array.from(map.values());
  }, [categories, branchProducts]);

  // Dynamic real indicators calculated strictly from real branch products and distinct active categories
  const indicators = useMemo(() => {
    const total = branchProducts.length;
    const available = branchProducts.filter(p => p.available !== false && p.status !== 'inactive').length;
    const unavailable = branchProducts.filter(p => p.available === false || p.status === 'inactive').length;
    const catCount = availableCategories.length;
    return { total, available, unavailable, catCount };
  }, [branchProducts, availableCategories]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return branchProducts.filter(product => {
      const matchesSearch = 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()));

      const meta = resolveCategoryInfo(product.category || '', categories);
      const matchesCat = 
        selectedCategoryFilter === 'all' || 
        product.category.toLowerCase() === selectedCategoryFilter.toLowerCase() ||
        meta.name.toLowerCase() === selectedCategoryFilter.toLowerCase();

      const isAvail = product.available !== false && product.status !== 'inactive';
      const matchesAvail = 
        availabilityFilter === 'all' ||
        (availabilityFilter === 'available' && isAvail) ||
        (availabilityFilter === 'unavailable' && !isAvail);

      return matchesSearch && matchesCat && matchesAvail;
    });
  }, [branchProducts, searchTerm, selectedCategoryFilter, availabilityFilter, categories]);

  // Group products by category with resolved presentation metadata
  const productsGroupedByCategory = useMemo(() => {
    const map = new Map<string, {
      meta: { id: string; name: string; icon: string; badge: string; description: string; rawKey: string };
      products: Product[];
    }>();

    filteredProducts.forEach(prod => {
      const rawCat = prod.category ? prod.category.trim() : 'Sem categoria';
      const meta = resolveCategoryInfo(rawCat, categories);
      const groupKey = meta.name;

      if (!map.has(groupKey)) {
        map.set(groupKey, {
          meta: { ...meta, rawKey: rawCat },
          products: []
        });
      }
      map.get(groupKey)!.products.push(prod);
    });

    return map;
  }, [filteredProducts, categories]);

  // Open modal for new product
  const handleOpenNewProduct = () => {
    playBeep(700, 0.04);
    setEditingProduct(null);
    setFormName('');
    setFormCategory(availableCategories.length > 0 ? availableCategories[0].name : '');
    setFormDescription('');
    setFormPrice('');
    setFormCostPrice('');
    setFormAvailable(true);
    setFormImageUrl('');
    setFormVariants([]);
    setNewVariantLabel('');
    setNewVariantPrice('');
    setIsProductModalOpen(true);
  };

  // Open modal to customize / edit a category
  const handleOpenCustomizeCategory = (rawKey: string) => {
    playBeep(750, 0.04);
    const meta = resolveCategoryInfo(rawKey, categories);
    setEditingCategoryKey(rawKey);
    setEditingCategoryId(meta.id);
    setEditCategoryName(meta.name);
    setEditCategoryIcon(meta.icon || 'Flame');
    setEditCategoryBadge(meta.badge || '🔥 Mais Pedidos');
    setEditCategoryDesc(meta.description || '');
    setIsEditCategoryModalOpen(true);
  };

  // Save customized category
  const handleSaveCategoryCustomization = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCategoryName.trim()) return;

    const cleanNewName = editCategoryName.trim();
    const cleanId = editingCategoryId || cleanNewName.toLowerCase().replace(/\s+/g, '_');

    const updatedCatObj: ProductCategory = {
      id: cleanId,
      name: cleanNewName,
      icon: editCategoryIcon || 'Flame',
      badge: editCategoryBadge.trim() || undefined,
      description: editCategoryDesc.trim() || undefined,
      order: 1
    };

    // 1. Update in context
    if (updateCategory) {
      updateCategory(updatedCatObj, editingCategoryKey);
    } else {
      addCategory(updatedCatObj);
    }

    // 2. Update all products in current store that had this category
    const affectedProducts = products.filter(p => 
      p.category === editingCategoryKey || 
      p.category.toLowerCase() === editingCategoryKey.toLowerCase() ||
      p.category === cleanId ||
      resolveCategoryInfo(p.category || '', categories).name.toLowerCase() === editCategoryName.toLowerCase() ||
      resolveCategoryInfo(p.category || '', categories).name.toLowerCase() === editingCategoryKey.toLowerCase()
    );

    const restaurantId = tenant?.id || auth.currentUser?.uid || 'default_restaurant';

    affectedProducts.forEach(prod => {
      const updatedProd: Product = {
        ...prod,
        category: cleanNewName
      };
      updateProduct(updatedProd);

      try {
        setDoc(doc(db, 'restaurants', restaurantId, 'products', prod.id), {
          ...updatedProd,
          updatedAt: new Date().toISOString()
        }, { merge: true }).catch(() => {});
      } catch (err) {}
    });

    try {
      setDoc(doc(db, 'restaurants', restaurantId, 'categories', cleanId), {
        ...updatedCatObj,
        tenantId: restaurantId,
        branchId: currentBranch?.id || 'branch_matriz_sp',
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch(() => {});
    } catch (err) {}

    playCashRegister();
    setIsEditCategoryModalOpen(false);
  };

  // Open modal for editing product
  const handleOpenEditProduct = (prod: Product) => {
    playBeep(650, 0.04);
    setEditingProduct(prod);
    setFormName(prod.name);
    setFormCategory(prod.category || '');
    setFormDescription(prod.description || '');
    setFormPrice(prod.price !== undefined && prod.price !== null ? String(prod.price) : '');
    setFormCostPrice(prod.costPrice !== undefined && prod.costPrice !== null ? String(prod.costPrice) : '');
    setFormAvailable(prod.available !== false && prod.status !== 'inactive');
    setFormImageUrl(prod.imageUrl || '');
    setFormVariants(prod.priceVariants || []);
    setNewVariantLabel('');
    setNewVariantPrice('');
    setIsProductModalOpen(true);
  };

  // Toggle availability directly from the card
  const handleToggleAvailability = (prod: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = !(prod.available !== false && prod.status !== 'inactive');
    const updated: Product = {
      ...prod,
      available: newStatus,
      status: newStatus ? 'active' : 'inactive',
    };
    updateProduct(updated);
    playBeep(newStatus ? 880 : 440, 0.05);

    // Persist to Firestore
    const restaurantId = tenant?.id || auth.currentUser?.uid || 'default_restaurant';
    try {
      setDoc(doc(db, 'restaurants', restaurantId, 'products', prod.id), {
        ...updated,
        tenantId: restaurantId,
        branchId: currentBranch?.id || 'branch_matriz_sp',
        updatedAt: new Date().toISOString(),
        updatedBy: auth.currentUser?.email || 'Gerente'
      }, { merge: true }).catch(() => {});
    } catch (err) {}
  };

  // Image Upload handler
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setFormImageUrl(event.target.result as string);
          playBeep(800, 0.04);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Add variation
  const handleAddVariant = () => {
    if (!newVariantLabel.trim()) return;
    const priceNum = parseFloat(newVariantPrice.replace(',', '.'));
    if (isNaN(priceNum) || priceNum < 0) return;

    setFormVariants(prev => [...prev, { label: newVariantLabel.trim(), price: priceNum }]);
    setNewVariantLabel('');
    setNewVariantPrice('');
  };

  const handleRemoveVariant = (idx: number) => {
    setFormVariants(prev => prev.filter((_, i) => i !== idx));
  };

  // Save Product (Create or Edit)
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('Por favor informe o nome do produto.');
      return;
    }

    const priceNum = formPrice.trim() !== '' ? parseFloat(formPrice.replace(',', '.')) : 0;
    const costNum = formCostPrice.trim() !== '' ? parseFloat(formCostPrice.replace(',', '.')) : 0;

    const prodId = editingProduct ? editingProduct.id : `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const assignedCat = formCategory.trim() || 'Geral';

    const productPayload: Product = {
      ...(editingProduct || {}),
      id: prodId,
      name: formName.trim(),
      description: formDescription.trim(),
      category: assignedCat,
      price: priceNum,
      costPrice: costNum,
      available: formAvailable,
      status: formAvailable ? 'active' : 'inactive',
      imageUrl: formImageUrl,
      priceVariants: formVariants.length > 0 ? formVariants : undefined,
      tenantId: tenant?.id || 'tenant_neon_sp',
      branchId: currentBranch?.id || 'branch_matriz_sp',
      station: (editingProduct?.station) || 'grill',
      bcgClassification: (editingProduct?.bcgClassification) || 'star',
    };

    if (editingProduct) {
      updateProduct(productPayload);
    } else {
      addProduct(productPayload);
    }

    // Auto add category if new
    if (assignedCat && !categories.some(c => c.name.toLowerCase() === assignedCat.toLowerCase())) {
      const newCatObj: ProductCategory = {
        id: assignedCat.toLowerCase().replace(/\s+/g, '_'),
        name: assignedCat,
        icon: 'UtensilsCrossed',
        order: categories.length + 1
      };
      addCategory(newCatObj);
    }

    // Persist to Firestore
    const restaurantId = tenant?.id || auth.currentUser?.uid || 'default_restaurant';
    try {
      setDoc(doc(db, 'restaurants', restaurantId, 'products', prodId), {
        ...productPayload,
        updatedAt: new Date().toISOString(),
        updatedBy: auth.currentUser?.email || 'Gerente'
      }, { merge: true }).catch((err) => console.warn('Firestore write error:', err));
    } catch (err) {}

    playCashRegister();
    setIsProductModalOpen(false);
  };

  // Delete or Deactivate Product
  const handleDeleteProduct = (prod: Product) => {
    const confirmDelete = window.confirm(
      `Deseja realmente remover "${prod.name}" do cardápio?\n\nClique em OK para excluir permanentemente.`
    );
    if (!confirmDelete) return;

    deleteProduct(prod.id);
    playBeep(400, 0.08);

    // Delete in Firestore
    const restaurantId = tenant?.id || auth.currentUser?.uid || 'default_restaurant';
    try {
      deleteDoc(doc(db, 'restaurants', restaurantId, 'products', prod.id)).catch(() => {});
    } catch (err) {}
  };

  // Save New Category
  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const catNameClean = newCatName.trim();
    const catId = catNameClean.toLowerCase().replace(/\s+/g, '_');

    if (categories.some(c => c.id === catId || c.name.toLowerCase() === catNameClean.toLowerCase())) {
      alert('Esta categoria já existe.');
      return;
    }

    const newCat: ProductCategory = {
      id: catId,
      name: catNameClean,
      icon: newCatIcon || 'UtensilsCrossed',
      order: categories.length + 1
    };

    addCategory(newCat);

    // Persist to Firestore
    const restaurantId = tenant?.id || auth.currentUser?.uid || 'default_restaurant';
    try {
      setDoc(doc(db, 'restaurants', restaurantId, 'categories', catId), {
        ...newCat,
        tenantId: restaurantId,
        branchId: currentBranch?.id || 'branch_matriz_sp',
        createdAt: new Date().toISOString()
      }, { merge: true }).catch(() => {});
    } catch (err) {}

    playCashRegister();
    setNewCatName('');
    setIsCategoryModalOpen(false);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 sm:space-y-8 md:space-y-10 pb-28 md:pb-12 select-none">
      {/* Offline Alert Banner */}
      {isOffline && (
        <div className="p-4 sm:p-5 rounded-2xl bg-[#FFC72C]/10 border border-[#FFC72C]/30 text-[#FFC72C] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2.5">
            <WifiOff className="w-4 h-4 sm:w-5 sm:h-5 text-[#FFC72C] shrink-0" />
            <span className="leading-relaxed">Você está sem conexão. Suas alterações serão salvas localmente e sincronizadas com a nuvem quando a conexão retornar.</span>
          </div>
          <span className="font-bold uppercase tracking-wider text-[10px] sm:text-xs bg-[#FFC72C]/20 px-3 py-1 rounded-lg shrink-0 self-end sm:self-auto">
            Offline
          </span>
        </div>
      )}

      {/* Header Card - Responsivo: no desktop lado a lado com respiro; no mobile empilhado com gap consistente */}
      <div className="p-5 sm:p-6 md:p-8 rounded-3xl bg-gradient-to-r from-[#141218] via-[#181522] to-[#12121A] border border-[#28283C] shadow-2xl flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-2 sm:space-y-3">
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#FFC72C] px-3 py-1 rounded-full bg-[#FFC72C]/15 border border-[#FFC72C]/30 flex items-center gap-1.5 shrink-0">
              <Package className="w-3.5 h-3.5 text-[#FFC72C]" />
              Cardápio • Gestão de Produtos
            </span>
            <span className="text-zinc-600 hidden sm:inline">•</span>
            <span className="text-xs font-medium text-zinc-400 truncate">
              {currentBranch?.name || 'Unidade Principal'}
            </span>
          </div>
          
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black font-display text-white tracking-tight leading-tight">
            Gestão de Produtos
          </h1>
          
          <p className="text-xs sm:text-sm text-[#A1A1AA] max-w-xl leading-relaxed">
            Cadastre e organize os itens que aparecem no seu cardápio online e nos pontos de atendimento.
          </p>
        </div>

        {/* Action Buttons - No mobile ocupam largura total com toque fácil (min-h-[44px]) e gap amplo */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-3.5 w-full lg:w-auto shrink-0 pt-2 lg:pt-0 border-t border-zinc-800/60 lg:border-t-0">
          <button
            onClick={() => {
              playBeep(850, 0.04);
              openExportModal('produtos');
            }}
            className="w-full sm:w-auto min-h-[44px] px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-[#00E676] border border-zinc-700/80 font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-sm active:scale-98"
            title="Exportar Produtos e Cardápio Completo em CSV / Excel"
          >
            <Download className="w-4 h-4 text-[#00E676] shrink-0" />
            <span className="whitespace-nowrap">Exportar (CSV)</span>
          </button>

          <button
            onClick={() => {
              playBeep(850, 0.04);
              setIsCategoryModalOpen(true);
            }}
            className="w-full sm:w-auto min-h-[44px] px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/80 font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-sm active:scale-98"
          >
            <FolderPlus className="w-4 h-4 text-[#FFC72C] shrink-0" />
            <span className="whitespace-nowrap">+ Criar categoria</span>
          </button>

          <button
            onClick={() => {
              playBeep(850, 0.04);
              handleOpenNewProduct();
            }}
            className="w-full sm:w-auto min-h-[44px] px-5 sm:px-6 py-2.5 sm:py-3 rounded-2xl bg-gradient-to-r from-[#DA291C] to-[#FF7A00] hover:brightness-110 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-[0_0_20px_rgba(218,41,28,0.35)] active:scale-98"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">+ Cadastrar produto</span>
          </button>
        </div>
      </div>

      {/* 4 Real Data Indicators - Grid adaptativa: 1 col (<480px), 2 cols (sm), 4 cols (lg) com espaçamento consistente */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
        <div className="p-4 sm:p-5 rounded-2xl bg-[#12121A] border border-[#242438] flex items-center justify-between shadow-lg">
          <div className="space-y-1">
            <p className="text-[10px] sm:text-xs font-bold text-zinc-400 uppercase tracking-wider truncate">
              Cadastrados
            </p>
            <p className="text-xl sm:text-2xl md:text-3xl font-black font-mono text-white">
              {indicators.total}
            </p>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[#FFC72C] shrink-0 ml-2">
            <Package className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[#12121A] border border-[#242438] flex items-center justify-between shadow-lg">
          <div className="space-y-1">
            <p className="text-[10px] sm:text-xs font-bold text-zinc-400 uppercase tracking-wider truncate">
              Disponíveis
            </p>
            <p className="text-xl sm:text-2xl md:text-3xl font-black font-mono text-[#00E676]">
              {indicators.available}
            </p>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-[#00E676]/10 border border-[#00E676]/30 flex items-center justify-center text-[#00E676] shrink-0 ml-2">
            <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[#12121A] border border-[#242438] flex items-center justify-between shadow-lg">
          <div className="space-y-1">
            <p className="text-[10px] sm:text-xs font-bold text-zinc-400 uppercase tracking-wider truncate">
              Indisponíveis
            </p>
            <p className="text-xl sm:text-2xl md:text-3xl font-black font-mono text-zinc-400">
              {indicators.unavailable}
            </p>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 shrink-0 ml-2">
            <EyeOff className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[#12121A] border border-[#242438] flex items-center justify-between shadow-lg">
          <div className="space-y-1">
            <p className="text-[10px] sm:text-xs font-bold text-zinc-400 uppercase tracking-wider truncate">
              Categorias
            </p>
            <p className="text-xl sm:text-2xl md:text-3xl font-black font-mono text-[#FF7A00]">
              {indicators.catCount}
            </p>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-[#FF7A00]/10 border border-[#FF7A00]/30 flex items-center justify-center text-[#FF7A00] shrink-0 ml-2">
            <Layers className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {branchProducts.length === 0 ? (
        /* EMPTY STATE COM RESPIRO, PADRÃO E AÇÕES CONFORTÁVEIS */
        <div className="text-center py-16 sm:py-24 px-4 sm:px-8 rounded-3xl border border-dashed border-zinc-800 bg-[#121218]/80 max-w-xl mx-auto shadow-2xl space-y-6 sm:space-y-8 my-6">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl mx-auto bg-gradient-to-tr from-[#DA291C]/20 to-[#FFC72C]/20 border border-[#FFC72C]/30 flex items-center justify-center text-[#FFC72C] shadow-lg">
            <UtensilsCrossed className="w-10 h-10 sm:w-12 sm:h-12" />
          </div>
          
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-[#FFC72C] bg-[#FFC72C]/10 px-3.5 py-1.5 rounded-full border border-[#FFC72C]/20 inline-block">
              Monte seu cardápio
            </span>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white leading-tight">
              Você ainda não cadastrou nenhum produto.
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
              Comece adicionando o primeiro item da {tenant.name || 'Lanchonete Dulci'}.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 pt-2">
            <button
              onClick={handleOpenNewProduct}
              className="w-full sm:w-auto min-h-[44px] px-6 py-3.5 bg-gradient-to-r from-[#DA291C] to-[#FF7A00] hover:brightness-110 text-white font-black text-xs sm:text-sm rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <Plus className="w-4 h-4" />
              <span>+ Cadastrar produto</span>
            </button>

            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="w-full sm:w-auto min-h-[44px] px-5 py-3.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs sm:text-sm rounded-2xl border border-zinc-700/80 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <FolderPlus className="w-4 h-4 text-[#FFC72C]" />
              <span>+ Criar categoria</span>
            </button>
          </div>
        </div>
      ) : (
        /* WITH REAL REGISTERED PRODUCTS */
        <div className="space-y-6 sm:space-y-8">
          {/* Filter & Search Bar - Responsivo: Quebra elegante em mobile e tablet, gap consistente, sem espremer */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#12121A] border border-[#242438] flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4 shadow-lg">
            {/* Search Input */}
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar produto por nome ou descrição..."
                className="w-full min-h-[44px] pl-10 pr-9 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs sm:text-sm text-white placeholder:text-zinc-500 focus:border-[#FFC72C] focus:outline-none transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-white cursor-pointer"
                  title="Limpar busca"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Selects: No mobile dividem a linha com gap próprio; no desktop ficam alinhados */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:items-center gap-3 sm:gap-3.5">
              {/* Category Filter */}
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="w-full lg:w-auto min-h-[44px] px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs sm:text-sm text-zinc-200 focus:border-[#FFC72C] focus:outline-none cursor-pointer"
              >
                <option value="all">Todas as categorias ({availableCategories.length})</option>
                {availableCategories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>

              {/* Availability Filter */}
              <select
                value={availabilityFilter}
                onChange={(e) => setAvailabilityFilter(e.target.value as any)}
                className="w-full lg:w-auto min-h-[44px] px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs sm:text-sm text-zinc-200 focus:border-[#FFC72C] focus:outline-none cursor-pointer"
              >
                <option value="all">Disponibilidade: Todos</option>
                <option value="available">Somente Disponíveis</option>
                <option value="unavailable">Somente Indisponíveis</option>
              </select>
            </div>
          </div>

          {/* Grouped Products List */}
          {filteredProducts.length === 0 ? (
            <div className="text-center py-16 sm:py-20 px-4 rounded-2xl bg-[#121218] border border-zinc-800/60 space-y-3">
              <Package className="w-10 h-10 text-zinc-600 mx-auto" />
              <p className="text-sm sm:text-base font-bold text-zinc-300">Nenhum produto encontrado com os filtros atuais</p>
              <p className="text-xs sm:text-sm text-zinc-500 max-w-sm mx-auto">Tente remover a busca por texto ou selecionar outra categoria.</p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategoryFilter('all');
                  setAvailabilityFilter('all');
                }}
                className="mt-2 min-h-[40px] px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs sm:text-sm font-bold text-zinc-200 cursor-pointer"
              >
                Limpar filtros
              </button>
            </div>
          ) : (
            /* LISTAGEM DE CATEGORIAS: ESPAÇAMENTO GENEROSO ENTRE CADA CATEGORIA COM CABEÇALHO PERSONALIZADO */
            <div className="space-y-10 sm:space-y-14">
              {Array.from(productsGroupedByCategory.entries()).map(([categoryTitle, groupData]) => {
                const { meta, products: prods } = groupData;

                return (
                  <section key={categoryTitle} className="space-y-4 sm:space-y-6">
                    {/* Category Header com Banner Iluminado e Personalizado */}
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#141424] via-[#161628] to-[#12121D] border border-[#27273F] p-4 sm:p-5 shadow-xl">
                      {/* Efeito Glow decorativo */}
                      <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-[#FF7A00]/8 via-transparent to-transparent pointer-events-none" />
                      
                      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
                        {/* Lado Esquerdo: Ícone com gradiente, Título humanizado, Selo e Contador */}
                        <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 min-w-0">
                          {/* Caixa de Ícone com Brilho Suave */}
                          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#DA291C]/25 via-[#FF7A00]/20 to-[#FFC72C]/20 border border-[#FF7A00]/40 text-[#FFC72C] flex items-center justify-center shadow-[0_0_20px_rgba(255,122,0,0.25)] shrink-0">
                            {renderCategoryIcon(meta.icon, "w-6 h-6 sm:w-7 sm:h-7 text-[#FFC72C]")}
                          </div>

                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight font-display">
                                {meta.name}
                              </h2>

                              {/* Selo / Badge personalizada */}
                              {meta.badge && (
                                <span className="text-[10px] sm:text-xs font-black uppercase px-2.5 py-0.5 rounded-lg bg-gradient-to-r from-[#FF7A00]/20 to-[#DA291C]/20 text-[#FFC72C] border border-[#FF7A00]/40 tracking-wider shadow-sm flex items-center gap-1">
                                  <Sparkles className="w-3 h-3 text-[#FFC72C]" />
                                  <span>{meta.badge}</span>
                                </span>
                              )}

                              {/* Chip de Contagem de Itens */}
                              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-zinc-900/90 text-zinc-300 border border-zinc-700/70 flex items-center gap-1.5 shadow-inner">
                                <Package className="w-3 h-3 text-[#FFC72C]" />
                                <span>{prods.length} {prods.length === 1 ? 'produto cadastrado' : 'produtos cadastrados'}</span>
                              </span>

                              {/* Badge Ativa no Cardápio */}
                              <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-bold text-[#00E676] bg-[#00E676]/10 border border-[#00E676]/25 px-2.5 py-0.5 rounded-lg">
                                <span className="w-2 h-2 rounded-full bg-[#00E676] animate-pulse" />
                                Ativa no Cardápio
                              </span>
                            </div>

                            {/* Descrição / Subtítulo da Categoria */}
                            <p className="text-xs text-zinc-400 max-w-xl line-clamp-1 leading-relaxed">
                              {meta.description || `Produtos e opções artesanais disponíveis na categoria ${meta.name}.`}
                            </p>
                          </div>
                        </div>

                        {/* Lado Direito: Botões de Ação */}
                        <div className="flex items-center gap-2.5 w-full lg:w-auto justify-between lg:justify-end shrink-0 pt-3 lg:pt-0 border-t border-zinc-800/80 lg:border-t-0">
                          {/* Botão Personalizar Categoria */}
                          <button
                            onClick={() => handleOpenCustomizeCategory(meta.rawKey || meta.name)}
                            className="flex-1 lg:flex-none min-h-[42px] px-3.5 sm:px-4 py-2 rounded-xl bg-[#1B1B2A] hover:bg-[#26263A] text-zinc-200 hover:text-white border border-[#303048] text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-97"
                            title="Personalizar nome, ícone, selo e descrição desta categoria"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-[#FFC72C]" />
                            <span>Personalizar Categoria</span>
                          </button>

                          {/* Botão Adicionar Produto nesta Categoria */}
                          <button
                            onClick={() => {
                              handleOpenNewProduct();
                              setFormCategory(meta.name);
                            }}
                            className="flex-1 lg:flex-none min-h-[42px] px-4 sm:px-5 py-2 rounded-xl bg-gradient-to-r from-[#DA291C] to-[#FF7A00] hover:brightness-110 text-white font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_18px_rgba(218,41,28,0.35)] active:scale-97"
                          >
                            <Plus className="w-4 h-4 text-white" />
                            <span>+ Adicionar Produto</span>
                          </button>
                        </div>
                      </div>
                    </div>

                  {/* Category Items List:
                      Celular (<640px): 1 coluna
                      Tablet (640px-1023px): 2 colunas
                      Desktop (1024px-1279px): 3 colunas
                      Desktop amplo (1280px+): 3 a 4 colunas
                      Com gap-4 sm:gap-5 md:gap-6 para respiro visual consistente
                  */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5 md:gap-6">
                    {prods.map((prod, idx) => {
                      const isAvailable = prod.available !== false && prod.status !== 'inactive';
                      const formattedIndex = String(idx + 1).padStart(2, '0');

                      return (
                        <div
                          key={prod.id}
                          className={`p-4 sm:p-5 rounded-2xl bg-[#12121A] border transition-all shadow-lg flex flex-col justify-between gap-4 ${
                            isAvailable 
                              ? 'border-[#242438] hover:border-zinc-700' 
                              : 'border-zinc-800/50 opacity-70 bg-zinc-950/40'
                          }`}
                        >
                          {/* Top Row: Imagem + Info */}
                          <div className="flex items-start gap-3.5 sm:gap-4">
                            {/* Product Photo: proporção consistente, nunca deforma */}
                            <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-xl bg-zinc-900 border border-zinc-800 shrink-0 overflow-hidden flex items-center justify-center relative">
                              {prod.imageUrl ? (
                                <img
                                  src={prod.imageUrl}
                                  alt={prod.name}
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="text-center p-2 text-zinc-600 flex flex-col items-center justify-center">
                                  <ImageIcon className="w-6 h-6 text-zinc-600 mb-1" />
                                  <span className="text-[8px] font-bold uppercase tracking-wider text-zinc-500">Sem foto</span>
                                </div>
                              )}
                            </div>

                            {/* Info com hierarquia tipográfica */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="text-[10px] font-mono font-bold text-zinc-500 shrink-0">{formattedIndex}</span>
                                <h3 className="text-sm sm:text-base font-bold text-white truncate leading-tight" title={prod.name}>
                                  {prod.name}
                                </h3>
                              </div>
                              <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed mt-1">
                                {prod.description || <span className="italic text-zinc-600">Sem descrição informada</span>}
                              </p>
                            </div>
                          </div>

                          {/* Price Variants Pills if present */}
                          {prod.priceVariants && prod.priceVariants.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {prod.priceVariants.map((v, i) => (
                                <span key={i} className="text-[10px] sm:text-xs font-mono px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300">
                                  {v.label}: {formatBRL(v.price)}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Bottom Row: Preço e Ações - NUNCA GRUDADOS */}
                          <div className="pt-3.5 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-3">
                            {/* Preço */}
                            <div className="shrink-0">
                              {prod.price !== undefined && prod.price !== null && prod.price > 0 ? (
                                <span className="text-base sm:text-lg font-black font-mono text-[#00E676]">
                                  {formatBRL(prod.price)}
                                </span>
                              ) : (
                                <span className="text-[10px] sm:text-xs font-bold text-[#FFC72C] bg-[#FFC72C]/10 px-2.5 py-1 rounded-lg border border-[#FFC72C]/30 inline-block">
                                  Preço a definir
                                </span>
                              )}
                            </div>

                            {/* Ações com GAP claro e área de toque confortável */}
                            <div className="flex items-center gap-2 shrink-0">
                              {/* Availability Toggle */}
                              <button
                                onClick={(e) => handleToggleAvailability(prod, e)}
                                className={`min-h-[36px] px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                                  isAvailable
                                    ? 'bg-[#00E676]/15 text-[#00E676] border-[#00E676]/30 hover:bg-[#00E676]/25'
                                    : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
                                }`}
                                title={isAvailable ? 'Clique para marcar como Indisponível' : 'Clique para marcar como Disponível'}
                              >
                                <span className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-[#00E676] animate-pulse' : 'bg-zinc-500'}`} />
                                <span className="text-[11px] sm:text-xs">{isAvailable ? 'Disponível' : 'Indisponível'}</span>
                              </button>

                              {/* Edit Button */}
                              <button
                                onClick={() => handleOpenEditProduct(prod)}
                                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-all cursor-pointer flex items-center justify-center shrink-0"
                                title="Editar produto"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>

                              {/* Delete Button */}
                              <button
                                onClick={() => handleDeleteProduct(prod)}
                                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-zinc-900 hover:bg-[#DA291C]/20 text-zinc-500 hover:text-[#DA291C] border border-zinc-800 transition-all cursor-pointer flex items-center justify-center shrink-0"
                                title="Excluir produto"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
            </div>
          )}
        </div>
      )}

      {/* MODAL: CADASTRAR OU EDITAR PRODUTO - Responsivo em celular, tablet e desktop */}
      <AnimatePresence>
        {isProductModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-black/85 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-[#12121A] border border-[#28283C] rounded-3xl max-w-xl w-full max-h-[92vh] shadow-2xl flex flex-col overflow-hidden my-auto"
            >
              {/* Modal Header Fixo */}
              <div className="p-4 sm:p-6 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-[#12121A] z-10 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#DA291C]/15 text-[#FFC72C] flex items-center justify-center shrink-0">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-white leading-tight">
                      {editingProduct ? 'Editar Produto' : 'Cadastrar Novo Produto'}
                    </h2>
                    <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5">
                      Preencha os dados do item para exibição no cardápio
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsProductModalOpen(false)}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body / Form Scrollável com espaçamento consistente */}
              <form onSubmit={handleSaveProduct} className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1 text-xs sm:text-sm">
                {/* 1. Nome do Produto */}
                <div className="space-y-1.5">
                  <label className="block text-zinc-200 font-bold">
                    Nome do Produto <span className="text-[#DA291C]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ex: X-Salada Artesanal"
                    className="w-full min-h-[44px] px-3.5 sm:px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-600 focus:border-[#FFC72C] focus:outline-none"
                  />
                </div>

                {/* 2. Categoria */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-zinc-200 font-bold">
                      Categoria <span className="text-[#DA291C]">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCategoryModalOpen(true)}
                      className="text-xs text-[#FFC72C] hover:underline font-bold cursor-pointer"
                    >
                      + Criar categoria
                    </button>
                  </div>
                  {availableCategories.length === 0 ? (
                    <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-dashed border-zinc-800 text-zinc-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <span>Nenhuma categoria cadastrada ainda.</span>
                      <button
                        type="button"
                        onClick={() => setIsCategoryModalOpen(true)}
                        className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-bold text-xs cursor-pointer self-stretch sm:self-auto text-center"
                      >
                        Criar agora
                      </button>
                    </div>
                  ) : (
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full min-h-[44px] px-3.5 sm:px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:border-[#FFC72C] focus:outline-none cursor-pointer"
                    >
                      <option value="">Selecione uma categoria...</option>
                      {availableCategories.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* 3. Descrição */}
                <div className="space-y-1.5">
                  <label className="block text-zinc-200 font-bold">
                    Descrição do Item
                  </label>
                  <textarea
                    rows={2}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Ex: Pão brioche, hambúrguer 160g, queijo cheddar, alface, tomate e maionese artesanal."
                    className="w-full px-3.5 sm:px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-600 focus:border-[#FFC72C] focus:outline-none resize-none leading-relaxed"
                  />
                  <p className="text-[11px] text-zinc-500">Visível para o cliente no Cardápio Online.</p>
                </div>

                {/* 4. Preço e Custo - No celular empilha ou 2 colunas com respiro */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-zinc-200 font-bold">
                      Preço de Venda (R$)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 font-mono">R$</span>
                      <input
                        type="text"
                        value={formPrice}
                        onChange={(e) => setFormPrice(e.target.value)}
                        placeholder="0,00"
                        className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-mono font-bold placeholder:text-zinc-600 focus:border-[#00E676] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-zinc-200 font-bold">
                      Custo Estimado / Insumos (R$)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 font-mono">R$</span>
                      <input
                        type="text"
                        value={formCostPrice}
                        onChange={(e) => setFormCostPrice(e.target.value)}
                        placeholder="0,00"
                        className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-mono placeholder:text-zinc-600 focus:border-[#FFC72C] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 5. Foto do Produto */}
                <div className="space-y-2">
                  <label className="block text-zinc-200 font-bold">
                    Foto Real do Produto
                  </label>
                  
                  <div className="flex flex-col sm:flex-row items-center sm:items-center gap-4 p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-zinc-900 border border-zinc-700 shrink-0 overflow-hidden flex items-center justify-center relative">
                      {formImageUrl ? (
                        <img
                          src={formImageUrl}
                          alt="Prévia"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="text-center p-2">
                          <ImageIcon className="w-6 h-6 text-zinc-600 mx-auto mb-1" />
                          <span className="text-[9px] font-bold text-zinc-500 uppercase">Sem foto</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 space-y-2.5 w-full">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="image/*"
                          onChange={handleImageFileChange}
                          className="hidden"
                        />
                        <input
                          type="file"
                          ref={cameraInputRef}
                          accept="image/*"
                          capture="environment"
                          onChange={handleImageFileChange}
                          className="hidden"
                        />

                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="min-h-[40px] px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold flex items-center gap-2 cursor-pointer text-xs"
                        >
                          <Upload className="w-4 h-4" />
                          <span>Enviar Foto</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => cameraInputRef.current?.click()}
                          className="min-h-[40px] px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold flex items-center gap-2 cursor-pointer text-xs"
                        >
                          <Camera className="w-4 h-4" />
                          <span>Tirar Foto</span>
                        </button>

                        {formImageUrl && (
                          <button
                            type="button"
                            onClick={() => setFormImageUrl('')}
                            className="min-h-[40px] px-3 py-2 rounded-xl bg-red-950/40 text-red-400 hover:bg-red-950/60 font-bold text-xs cursor-pointer"
                          >
                            Remover
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500">Adicione uma foto real tirada no seu estabelecimento ou deixe sem imagem.</p>
                    </div>
                  </div>
                </div>

                {/* 6. Variações de Preço / Tamanho (Opcional) */}
                <div className="space-y-2">
                  <label className="block text-zinc-200 font-bold">
                    Variações de Tamanho / Opções (Opcional)
                  </label>
                  <p className="text-[11px] text-zinc-500">Ex: Lata 350ml, 1 Litro, 2 Litros ou Pequeno, Médio, Grande.</p>

                  {formVariants.length > 0 && (
                    <div className="space-y-2 mb-2">
                      {formVariants.map((v, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                          <span className="font-bold text-white text-xs">{v.label}</span>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-[#00E676] font-bold text-xs">{formatBRL(v.price)}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveVariant(idx)}
                              className="p-1 text-zinc-500 hover:text-red-400 cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5">
                    <input
                      type="text"
                      value={newVariantLabel}
                      onChange={(e) => setNewVariantLabel(e.target.value)}
                      placeholder="Ex: Lata 350ml"
                      className="flex-1 min-h-[42px] px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-600 focus:outline-none text-xs"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newVariantPrice}
                        onChange={(e) => setNewVariantPrice(e.target.value)}
                        placeholder="Preço (R$)"
                        className="w-28 min-h-[42px] px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-mono placeholder:text-zinc-600 focus:outline-none text-xs"
                      />
                      <button
                        type="button"
                        onClick={handleAddVariant}
                        className="min-h-[42px] px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl cursor-pointer text-xs shrink-0"
                      >
                        Adicionar
                      </button>
                    </div>
                  </div>
                </div>

                {/* 7. Disponibilidade Toggle */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-900 border border-zinc-800 gap-4">
                  <div>
                    <span className="font-bold text-white text-xs sm:text-sm">Disponível no Cardápio Online</span>
                    <p className="text-[11px] text-zinc-500 mt-0.5">Se desativado, o produto não poderá ser pedido pelos clientes.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormAvailable(!formAvailable)}
                    className={`w-14 h-7 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                      formAvailable ? 'bg-[#00E676]' : 'bg-zinc-700'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full bg-white transition-transform absolute top-0.5 ${
                        formAvailable ? 'left-7.5' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>

                {/* Modal Footer: Botões nunca grudados, no mobile empilhados ou largura total confortável */}
                <div className="pt-4 border-t border-zinc-800 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 sm:gap-3.5">
                  <button
                    type="button"
                    onClick={() => setIsProductModalOpen(false)}
                    className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white font-bold cursor-pointer text-center transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#DA291C] to-[#FF7A00] text-white font-black shadow-lg hover:brightness-110 active:scale-98 transition-all cursor-pointer text-center"
                  >
                    Salvar Produto
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: CRIAR CATEGORIA - Responsivo */}
      <AnimatePresence>
        {isCategoryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-[#12121A] border border-[#28283C] rounded-3xl max-w-md w-full shadow-2xl p-5 sm:p-6 space-y-4 sm:space-y-5 my-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#FFC72C]/15 text-[#FFC72C] flex items-center justify-center shrink-0">
                    <FolderPlus className="w-5 h-5" />
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-white">Criar Nova Categoria</h2>
                </div>
                <button
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="w-9 h-9 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveCategory} className="space-y-4 text-xs sm:text-sm">
                <div className="space-y-1.5">
                  <label className="block text-zinc-200 font-bold">
                    Nome da Categoria <span className="text-[#DA291C]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="Ex: Hambúrgueres, Bebidas, Pizzas..."
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-600 focus:border-[#FFC72C] focus:outline-none"
                  />
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    A categoria organiza os itens no seu cardápio online e no atendimento do PDV.
                  </p>
                </div>

                <div className="pt-3 border-t border-zinc-800/80 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCategoryModalOpen(false)}
                    className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white font-bold cursor-pointer text-center"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#DA291C] to-[#FF7A00] text-white font-black hover:brightness-110 active:scale-98 cursor-pointer text-center shadow-lg"
                  >
                    Criar Categoria
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: PERSONALIZAR CATEGORIA (NOME, ÍCONE, BADGE E DESCRIÇÃO) */}
      <AnimatePresence>
        {isEditCategoryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-[#12121A] border border-[#28283C] rounded-3xl max-w-xl w-full shadow-2xl p-5 sm:p-6 space-y-4 sm:space-y-5 my-auto"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#FF7A00]/20 to-[#DA291C]/20 border border-[#FF7A00]/40 text-[#FFC72C] flex items-center justify-center shadow-sm shrink-0">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-white">Personalizar Categoria</h2>
                    <p className="text-[11px] text-zinc-400">Edite o nome comercial, ícone, selo de destaque e descrição visual</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditCategoryModalOpen(false)}
                  className="w-9 h-9 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSaveCategoryCustomization} className="space-y-4 text-xs sm:text-sm">
                {/* 1. Nome de Exibição */}
                <div className="space-y-1.5">
                  <label className="block text-zinc-200 font-bold">
                    Nome de Exibição no Cardápio <span className="text-[#DA291C]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editCategoryName}
                    onChange={(e) => setEditCategoryName(e.target.value)}
                    placeholder="Ex: Burguers & Smash, Bebidas, Porções..."
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-bold placeholder:text-zinc-600 focus:border-[#FFC72C] focus:outline-none"
                  />
                  
                  {/* Sugestões rápidas de nomes */}
                  <div className="pt-1 flex flex-wrap gap-1.5">
                    <span className="text-[10px] text-zinc-500 self-center mr-1">Sugestões:</span>
                    {[
                      'Burguers & Smash',
                      'Burgers Artesanais',
                      'Bebidas & Refrescos',
                      'Porções & Petiscos',
                      'Sobremesas',
                      'Combos & Ofertas'
                    ].map(sug => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => setEditCategoryName(sug)}
                        className="px-2 py-0.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-[10px] font-medium text-zinc-400 hover:text-zinc-200 border border-zinc-800 cursor-pointer"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Seleção de Ícone */}
                <div className="space-y-1.5">
                  <label className="block text-zinc-200 font-bold">
                    Ícone Temático da Categoria
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {[
                      { icon: 'Flame', label: 'Fogo / Smash' },
                      { icon: 'UtensilsCrossed', label: 'Geral' },
                      { icon: 'Coffee', label: 'Bebidas' },
                      { icon: 'Wine', label: 'Drinks' },
                      { icon: 'Sparkles', label: 'Doces' },
                      { icon: 'Package', label: 'Combos' },
                      { icon: 'Tag', label: 'Oferta' },
                      { icon: 'Layers', label: 'Seção' }
                    ].map(item => {
                      const isSelected = editCategoryIcon.toLowerCase() === item.icon.toLowerCase();
                      return (
                        <button
                          key={item.icon}
                          type="button"
                          onClick={() => setEditCategoryIcon(item.icon)}
                          className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#FF7A00]/20 border-[#FF7A00] text-[#FFC72C] shadow-[0_0_12px_rgba(255,122,0,0.3)]'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                          }`}
                        >
                          <div className="w-6 h-6 flex items-center justify-center mb-1">
                            {renderCategoryIcon(item.icon, "w-5 h-5")}
                          </div>
                          <span className="text-[9px] font-medium truncate w-full text-center">
                            {item.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Selo de Destaque / Badge */}
                <div className="space-y-1.5">
                  <label className="block text-zinc-200 font-bold">
                    Selo de Destaque (Badge opcional)
                  </label>
                  <input
                    type="text"
                    value={editCategoryBadge}
                    onChange={(e) => setEditCategoryBadge(e.target.value)}
                    placeholder="Ex: 🔥 Mais Pedidos, Artesanal, Especialidade..."
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-600 focus:border-[#FFC72C] focus:outline-none"
                  />
                  
                  {/* Sugestões de badges */}
                  <div className="pt-1 flex flex-wrap gap-1.5">
                    {['🔥 Mais Pedidos', 'Artesanal', 'Especialidade', 'Refrescante', 'Top Vendas', 'Novidade'].map(sug => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => setEditCategoryBadge(sug)}
                        className="px-2 py-0.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-[10px] font-medium text-zinc-400 hover:text-zinc-200 border border-zinc-800 cursor-pointer"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Descrição / Subtítulo */}
                <div className="space-y-1.5">
                  <label className="block text-zinc-200 font-bold">
                    Descrição ou Subtítulo Comercial
                  </label>
                  <textarea
                    rows={2}
                    value={editCategoryDesc}
                    onChange={(e) => setEditCategoryDesc(e.target.value)}
                    placeholder="Ex: Blends 100% bovinos prensados com crostinha crocante na chapa e pão brioche amanteigado."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-600 focus:border-[#FFC72C] focus:outline-none resize-none leading-relaxed"
                  />
                </div>

                {/* Live Preview Card */}
                <div className="p-3.5 rounded-2xl bg-[#0E0E17] border border-[#202034] space-y-2">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-[#FFC72C]" />
                    <span>Pré-visualização do Banner:</span>
                  </p>
                  
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-[#161626] border border-[#2B2B44]">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#DA291C]/25 via-[#FF7A00]/20 to-[#FFC72C]/20 border border-[#FF7A00]/40 text-[#FFC72C] flex items-center justify-center shrink-0">
                      {renderCategoryIcon(editCategoryIcon, "w-5 h-5")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-black text-white">{editCategoryName || 'Nome da Categoria'}</span>
                        {editCategoryBadge && (
                          <span className="text-[9px] font-black px-2 py-0.5 rounded bg-[#FF7A00]/20 text-[#FFC72C] border border-[#FF7A00]/40">
                            {editCategoryBadge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 truncate">
                        {editCategoryDesc || 'Descrição da categoria...'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-zinc-800/80 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditCategoryModalOpen(false)}
                    className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white font-bold cursor-pointer text-center"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#DA291C] via-[#FF7A00] to-[#FFC72C] text-white font-black hover:brightness-110 active:scale-98 cursor-pointer text-center shadow-[0_0_20px_rgba(255,122,0,0.35)] flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>Salvar e Atualizar Categoria</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
