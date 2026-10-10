import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Layers, 
  DollarSign, 
  UtensilsCrossed, 
  Smartphone, 
  CookingPot, 
  Truck, 
  Sparkles, 
  Package, 
  Users, 
  Boxes, 
  PieChart, 
  BarChart3, 
  Trophy, 
  Building2, 
  ShieldCheck, 
  Crown, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  ChevronDown,
  Flame,
  MessageCircle,
  FolderOpen,
  Folder,
  CircleDot,
  QrCode,
  CreditCard,
  LogIn,
  UserPlus,
  Lock,
  Webhook,
  Share2,
  Printer
} from 'lucide-react';
import { useApp, ActiveView } from '../context/AppContext';
import { playPageTransitionSound, playSoftClickSound, playBeep } from '../utils/audio';

function isViewRestrictedForRole(role: string, view: ActiveView): boolean {
  const norm = (role || 'owner').toLowerCase();
  // Super Admin view is strictly exclusive to the verified super_admin role
  if (view === 'super_admin') {
    return norm !== 'super_admin';
  }
  if (['super_admin', 'owner', 'admin'].includes(norm)) return false;
  if (['manager', 'gerente'].includes(norm)) {
    return false;
  }
  if (['cashier', 'waiter', 'driver'].includes(norm)) {
    return ['financeiro_dre', 'dashboard_financeiro', 'gestao_equipe', 'auditoria', 'franquias'].includes(view);
  }
  if (['kitchen'].includes(norm)) {
    return ['financeiro_dre', 'dashboard_financeiro', 'pdv', 'mesas_comandas', 'gestao_equipe', 'auditoria', 'franquias', 'configuracoes'].includes(view);
  }
  return false;
}

interface SidebarProps {
  onOpenMeuPlano?: () => void;
  onOpenWhatsApp?: () => void;
  onOpenPrintModal?: () => void;
}

export interface SubNavItem {
  id: string;
  label: string;
  view: ActiveView;
  icon: React.ElementType;
  color: string;
  badge?: string | number;
  badgeColor?: string;
  isSpecialHighlight?: boolean;
}

export interface TreeCategory {
  id: string;
  title: string;
  icon: React.ElementType;
  color: string;
  subItems: SubNavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  onOpenMeuPlano, 
  onOpenWhatsApp 
}) => {
  const { 
    currentView, 
    setCurrentView, 
    switchRole,
    currentUser,
    activePageColor,
    orders, 
    ingredients 
  } = useApp();

  const [collapsed, setCollapsed] = useState(false);

  // Dynamic counts for live badges
  const activeOrdersCount = orders.filter(
    o => o.status === 'preparing' || o.status === 'ready' || o.status === 'pending'
  ).length;

  const lowStockCount = ingredients.filter(i => i.currentStock <= i.minimumStock).length;

  // Tree Categories with McDonald's & Modern Food-Tech aesthetic
  const categories: TreeCategory[] = [
    {
      id: 'operacao',
      title: 'Operação',
      icon: Flame,
      color: '#DA291C', // McDonald's Red
      subItems: [
        { 
          id: 'visao_geral', 
          label: 'Visão Geral', 
          view: 'overview_bi', 
          icon: LayoutDashboard,
          color: '#FFC72C'
        },
        { 
          id: 'pedidos', 
          label: 'Pedidos & Balcão', 
          view: 'central_pedidos', 
          icon: Layers, 
          color: '#FF3030',
          badge: activeOrdersCount > 0 ? activeOrdersCount : undefined,
          badgeColor: 'bg-[#DA291C] text-white font-black animate-pulse'
        },
        { 
          id: 'vendas', 
          label: 'Vendas & Caixa', 
          view: 'pdv', 
          icon: DollarSign, 
          color: '#00D26A',
          badge: 'F2',
          badgeColor: 'bg-[#00D26A]/20 text-[#00D26A] border border-[#00D26A]/30 font-mono'
        },
        { 
          id: 'mesas', 
          label: 'Mesas & Comandas', 
          view: 'mesas_comandas', 
          icon: UtensilsCrossed,
          color: '#38C9FF'
        },
        { 
          id: 'atendente', 
          label: 'Atendente Mobile', 
          view: 'atendente_mobile', 
          icon: Smartphone,
          color: '#FB923C',
          badge: 'Celular',
          badgeColor: 'bg-amber-500/20 text-amber-300'
        },
        { 
          id: 'cozinha', 
          label: 'Cozinha', 
          view: 'kds', 
          icon: CookingPot,
          color: '#FF5722',
          badge: 'Ao Vivo',
          badgeColor: 'bg-orange-500/20 text-orange-400'
        },
        { 
          id: 'delivery', 
          label: 'Delivery & Entregas', 
          view: 'delivery_gestao', 
          icon: Truck,
          color: '#00B8FF'
        },
        { 
          id: 'central_integracoes', 
          label: 'Central de Integrações', 
          view: 'central_integracoes', 
          icon: Share2,
          color: '#EA1D2C',
          badge: 'iFood & 99',
          badgeColor: 'bg-[#EA1D2C]/20 text-[#EA1D2C] border border-[#EA1D2C]/30 text-[10px] font-bold'
        },
      ]
    },
    {
      id: 'cardapio',
      title: 'Cardápio',
      icon: UtensilsCrossed,
      color: '#FFC72C', // McDonald's Golden Yellow
      subItems: [
        { 
          id: 'cardapio_digital', 
          label: 'Cardápio Online', 
          view: 'cardapio_digital', 
          icon: Sparkles,
          color: '#FF7A00',
          badge: 'Cliente',
          badgeColor: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
          isSpecialHighlight: true
        },
        { 
          id: 'gestao_cardapio', 
          label: 'Gestão de Produtos', 
          view: 'cardapio_bcg', 
          icon: Package,
          color: '#FFC72C'
        },
      ]
    },
    {
      id: 'gestao',
      title: 'Gestão',
      icon: BarChart3,
      color: '#FF7A00', // Delicious Orange
      subItems: [
        { 
          id: 'estoque', 
          label: 'Estoque & Insumos', 
          view: 'estoque_cmv', 
          icon: Boxes,
          color: '#F59E0B',
          badge: lowStockCount > 0 ? `${lowStockCount} rep.` : undefined,
          badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
        },
        { 
          id: 'financeiro', 
          label: 'Financeiro & Lucro', 
          view: 'financeiro_dre', 
          icon: PieChart,
          color: '#8B5CF6'
        },
        { 
          id: 'dashboard_financeiro', 
          label: 'Pix vs Cartão (Fluxo)', 
          view: 'dashboard_financeiro', 
          icon: QrCode,
          color: '#00E676',
          badge: 'Ao Vivo',
          badgeColor: 'bg-emerald-500/20 text-[#00E676] border border-emerald-500/30'
        },
        { 
          id: 'clientes', 
          label: 'Clientes & Fidelidade', 
          view: 'fidelidade', 
          icon: Users,
          color: '#EC4899'
        },
      ]
    },
    {
      id: 'equipe',
      title: 'Equipe',
      icon: Users,
      color: '#FFC72C',
      subItems: [
        { 
          id: 'gestao_equipe', 
          label: 'Gestão de Funcionários', 
          view: 'gestao_equipe', 
          icon: UserPlus,
          color: '#FFC72C',
          badge: 'Cadastro',
          badgeColor: 'bg-amber-500/20 text-[#FFC72C] border border-[#FFC72C]/30 font-semibold'
        },
        { 
          id: 'gamificacao', 
          label: 'Equipe & Metas', 
          view: 'gamificacao', 
          icon: Trophy,
          color: '#EAB308'
        },
        { 
          id: 'auditoria', 
          label: 'Segurança & Histórico', 
          view: 'auditoria', 
          icon: ShieldCheck,
          color: '#14B8A6'
        },
      ]
    },
    {
      id: 'conexoes',
      title: 'Conexões',
      icon: Webhook,
      color: '#00D26A',
      subItems: [
        { 
          id: 'gateways_pagamentos', 
          label: 'Pagamentos (Gateways)', 
          view: 'gateway_pagamentos', 
          icon: CreditCard,
          color: '#00D26A',
          badge: 'Pix & Cartão',
          badgeColor: 'bg-emerald-500/20 text-[#00D26A] border border-emerald-500/30'
        },
        { 
          id: 'gerenciamento_impressoras', 
          label: 'Gerenciamento de Impressoras', 
          view: 'gerenciamento_impressoras', 
          icon: Printer,
          color: '#38BDF8',
          badge: 'Rede & USB',
          badgeColor: 'bg-sky-500/20 text-sky-300 border border-sky-500/30 font-semibold'
        },
        { 
          id: 'whatsapp_conexao', 
          label: 'WhatsApp & Integrações', 
          view: 'configuracoes', 
          icon: Smartphone,
          color: '#25D366'
        },
      ]
    },
    {
      id: 'sistema',
      title: 'Sistema',
      icon: Settings,
      color: '#8B5CF6',
      subItems: [
        { 
          id: 'super_admin', 
          label: '👑 Super Admin', 
          view: 'super_admin', 
          icon: Crown,
          color: '#DA291C',
          badge: 'Master',
          badgeColor: 'bg-[#DA291C]/30 text-[#FFC72C] border border-[#FFC72C]/40'
        },
        { 
          id: 'pagina_vendas', 
          label: 'Página de Vendas', 
          view: 'landing', 
          icon: Sparkles,
          color: '#FFC72C',
          badge: 'Planos',
          badgeColor: 'bg-amber-500/20 text-[#FFC72C]'
        },
        { 
          id: 'multiunidades', 
          label: 'Minhas Filiais', 
          view: 'franquias', 
          icon: Building2,
          color: '#6366F1'
        },
        { 
          id: 'configuracoes', 
          label: 'Configurações', 
          view: 'configuracoes', 
          icon: Settings,
          color: '#94A3B8'
        },
        { 
          id: 'login_auth', 
          label: 'Entrar / Cadastrar', 
          view: 'login_auth', 
          icon: LogIn,
          color: '#00E676'
        },
      ]
    }
  ];

  // Accordion state: keep active categories open
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    operacao: true,
    cardapio: true,
    gestao: true,
    equipe: false,
    conexoes: false,
    sistema: false,
  });

  // Automatically keep parent category open if active view changes
  useEffect(() => {
    const parentCat = categories.find(cat => cat.subItems.some(sub => sub.view === currentView));
    if (parentCat && !openCategories[parentCat.id]) {
      setOpenCategories(prev => ({ ...prev, [parentCat.id]: true }));
    }
  }, [currentView]);

  // Click on category node in the tree: trigger soft click Web Audio
  const handleCategoryClick = (catId: string) => {
    playSoftClickSound();
    setOpenCategories(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };

  // Click on subcategory item: trigger soft click + page transition sound
  const handleSubItemClick = (subItem: SubNavItem) => {
    playSoftClickSound(1.2);
    playPageTransitionSound(subItem.view);
    setCurrentView(subItem.view);
  };

  return (
    <aside
      id="neon-tree-sidebar"
      className={`hidden md:flex flex-col bg-[#07070A] border-r border-[#151520] transition-all duration-300 select-none z-30 shrink-0 relative ${
        collapsed ? 'w-14' : 'w-56'
      }`}
      aria-label="Menu de Navegação Principal em Árvore"
    >
      {/* Top Header: Ultra-minimalista & Compacto */}
      <div className="h-12 px-3 border-b border-[#14141E] flex items-center justify-between">
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#DA291C] shadow-[0_0_6px_#DA291C] animate-pulse" />
            <span className="text-[10px] font-black tracking-wider text-zinc-300 uppercase">
              Navegação
            </span>
          </div>
        ) : (
          <div className="w-full flex justify-center">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#DA291C] to-[#FF7A00] flex items-center justify-center text-[#FFC72C] shadow-[0_0_8px_rgba(218,41,28,0.4)]">
              <Flame className="w-3.5 h-3.5 fill-[#FFC72C] text-[#FFC72C]" />
            </div>
          </div>
        )}

        <button
          onClick={() => {
            playSoftClickSound();
            setCollapsed(!collapsed);
          }}
          className="p-1 rounded-md bg-[#0F0F16] hover:bg-[#181824] text-zinc-400 hover:text-white transition-colors cursor-pointer border border-[#1A1A28]"
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </div>

      {/* Expandable Tree Menu */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-2 scrollbar-thin">
        {categories.map((cat) => {
          const CatIcon = cat.icon;
          const isOpen = openCategories[cat.id];
          const hasActiveChild = cat.subItems.some(sub => sub.view === currentView);
          const activeSubItem = cat.subItems.find(sub => sub.view === currentView);
          const dynamicColor = activeSubItem ? (activePageColor || activeSubItem.color) : cat.color;

          return (
            <div key={cat.id} className="space-y-0.5">
              {/* Category Tree Node (Root) */}
              {!collapsed ? (
                <button
                  type="button"
                  onClick={() => handleCategoryClick(cat.id)}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 cursor-pointer group ${
                    hasActiveChild 
                      ? 'text-white' 
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#101018]'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div 
                      className="w-4 h-4 rounded flex items-center justify-center transition-colors duration-300 shrink-0"
                      style={{ color: dynamicColor }}
                    >
                      <CatIcon className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110" />
                    </div>
                    <span 
                      className="text-[11px] font-extrabold uppercase tracking-tight truncate transition-colors duration-300"
                      style={hasActiveChild ? { color: dynamicColor } : undefined}
                    >
                      {cat.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {hasActiveChild && (
                      <span 
                        className="w-1.5 h-1.5 rounded-full transition-colors duration-300"
                        style={{ backgroundColor: dynamicColor, boxShadow: `0 0 6px ${dynamicColor}` }}
                      />
                    )}
                    <motion.div
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.18 }}
                    >
                      <ChevronDown className="w-3 h-3 text-zinc-500 group-hover:text-zinc-300" />
                    </motion.div>
                  </div>
                </button>
              ) : (
                // Collapsed divider pill with color transition
                <div className="flex justify-center py-1">
                  <div 
                    className="w-5 h-0.5 rounded-full opacity-35 transition-colors duration-300"
                    style={{ backgroundColor: dynamicColor }}
                  />
                </div>
              )}

              {/* Subcategories Tree Branches */}
              <AnimatePresence initial={false}>
                {(isOpen || collapsed) && (
                  <motion.div
                    initial={collapsed ? false : { height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={collapsed ? false : { height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className={`overflow-hidden ${
                      !collapsed 
                        ? 'ml-3 pl-2.5 border-l border-[#1A1A28] space-y-0.5 relative transition-colors duration-300' 
                        : 'space-y-1'
                    }`}
                    style={
                      !collapsed && hasActiveChild
                        ? { borderColor: `${dynamicColor}40` }
                        : undefined
                    }
                  >
                    {cat.subItems.map((sub) => {
                      const SubIcon = sub.icon;
                      const isActive = currentView === sub.view;
                      const isSpecial = sub.isSpecialHighlight;
                      const currentColor = isActive ? (activePageColor || sub.color) : sub.color;
                      const isRestricted = isViewRestrictedForRole(currentUser.role, sub.view);

                      return (
                        <button
                          key={sub.id}
                          id={`tree-subitem-${sub.id}`}
                          onClick={() => handleSubItemClick(sub)}
                          aria-current={isActive ? 'page' : undefined}
                          title={collapsed ? `${sub.label} (${cat.title})${isRestricted ? ' [Restrito]' : ''}` : undefined}
                          className={`w-full flex items-center gap-2 px-2 py-1 rounded-lg text-xs transition-all duration-200 cursor-pointer relative group ${
                            isActive
                              ? 'text-white font-bold'
                              : isSpecial
                              ? 'bg-gradient-to-r from-[#DA291C]/10 to-[#FF7A00]/10 text-white font-bold border border-[#FFC72C]/25 hover:border-[#FFC72C]'
                              : isRestricted
                              ? 'text-zinc-500 hover:text-zinc-300 hover:bg-[#101018]'
                              : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#101018]'
                          } ${collapsed ? 'justify-center px-0 py-1.5' : 'justify-between'}`}
                          style={
                            isActive
                              ? {
                                  backgroundColor: `${currentColor}16`,
                                  borderColor: `${currentColor}35`,
                                  borderWidth: 1,
                                  boxShadow: `0 0 10px ${currentColor}20`
                                }
                              : undefined
                          }
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {/* Tree leaf connector / bullet in expanded mode */}
                            {!collapsed && (
                              <span 
                                className="w-1 h-1 rounded-full shrink-0 transition-colors duration-200"
                                style={{ 
                                  backgroundColor: isActive ? currentColor : isRestricted ? '#2A2A38' : '#3A3A4E' 
                                }}
                              />
                            )}

                            {/* Subitem Icon with dynamic color shift */}
                            <div 
                              className={`w-5 h-5 rounded flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                                isActive 
                                  ? 'bg-black/40' 
                                  : isSpecial 
                                  ? 'bg-gradient-to-br from-[#DA291C] to-[#FF7A00] text-[#FFC72C]' 
                                  : 'bg-transparent'
                              }`}
                              style={isActive ? { color: currentColor } : undefined}
                            >
                              <SubIcon 
                                className={`w-3.5 h-3.5 transition-colors duration-200 ${
                                  isActive 
                                    ? '' 
                                    : isSpecial 
                                    ? 'text-[#FFC72C]' 
                                    : isRestricted
                                    ? 'text-zinc-600 group-hover:text-zinc-400'
                                    : 'text-zinc-400 group-hover:text-white'
                                }`}
                                style={isActive ? { color: currentColor } : undefined}
                              />
                            </div>

                            {!collapsed && (
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span 
                                  className={`truncate text-left text-[11px] transition-colors duration-200 ${isRestricted ? 'text-zinc-500' : ''}`}
                                  style={isActive ? { color: currentColor } : undefined}
                                >
                                  {sub.label}
                                </span>
                                {isRestricted && (
                                  <Lock className="w-2.5 h-2.5 text-zinc-600 shrink-0" />
                                )}
                              </div>
                            )}
                          </div>

                          {/* Live Badge */}
                          {!collapsed && (
                            isRestricted ? (
                              <span className="px-1 py-0.2 rounded text-[7.5px] font-black uppercase tracking-wider bg-zinc-800/80 text-zinc-500 border border-zinc-700/40 shrink-0">
                                RBAC
                              </span>
                            ) : sub.badge ? (
                              <span className={`px-1 py-0.2 rounded text-[8.5px] font-black shrink-0 ${sub.badgeColor || 'bg-white/10 text-zinc-300'}`}>
                                {sub.badge}
                              </span>
                            ) : null
                          )}

                          {/* Active Tree Indicator Line */}
                          {isActive && (
                            <motion.span 
                              layoutId="activeTreeIndicator"
                              className="absolute -left-[11px] top-1.5 bottom-1.5 w-[2px] rounded-full"
                              style={{ 
                                backgroundColor: currentColor,
                                boxShadow: `0 0 6px ${currentColor}`
                              }}
                              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Bottom Minimalist Shortcuts: Super Admin, Página de Vendas, Meu Plano & WhatsApp */}
      <div className="p-2 border-t border-[#14141E] bg-[#060608] space-y-1">
        {!collapsed ? (
          <>
            {/* Atalhos Rápidos: Super Admin & Página de Vendas */}
            <div className="grid grid-cols-2 gap-1 mb-1">
              <button
                onClick={() => {
                  playSoftClickSound();
                  switchRole('super_admin');
                  setCurrentView('super_admin');
                }}
                className="py-1 px-1.5 rounded-lg bg-[#DA291C]/15 hover:bg-[#DA291C]/25 text-[#FFC72C] border border-[#DA291C]/30 text-[9.5px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 text-center"
                title="Acessar Super Admin (Master SaaS)"
              >
                <Crown className="w-3 h-3 text-[#FFC72C] shrink-0" />
                <span className="truncate">Super Admin</span>
              </button>

              <button
                onClick={() => {
                  playSoftClickSound();
                  setCurrentView('landing');
                }}
                className="py-1 px-1.5 rounded-lg bg-[#14141E] hover:bg-[#1C1C28] text-zinc-300 hover:text-white border border-[#242436] text-[9.5px] font-semibold transition-all cursor-pointer flex items-center justify-center gap-1 text-center"
                title="Ir para a Página de Vendas & Planos"
              >
                <Sparkles className="w-3 h-3 text-[#FFC72C] shrink-0" />
                <span className="truncate">Pág. Vendas</span>
              </button>
            </div>

            {/* Card Meu Plano */}
            <button
              onClick={() => {
                playSoftClickSound();
                playPageTransitionSound('meu_plano');
                onOpenMeuPlano?.();
              }}
              className="w-full p-1.5 rounded-lg bg-gradient-to-r from-[#101018] to-[#0D0D14] hover:from-[#161622] hover:to-[#101018] border border-[#FFC72C]/20 hover:border-[#FFC72C] transition-all duration-200 cursor-pointer text-left group"
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-[#FFC72C] text-[10.5px] flex items-center gap-1.5">
                  <Crown className="w-3 h-3 text-[#FFC72C] fill-[#FFC72C]" />
                  Meu Plano
                </span>
                <span className="text-[8px] font-black uppercase text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1 py-0.2 rounded">
                  15d Grátis
                </span>
              </div>
            </button>

            {/* Suporte WhatsApp */}
            <button
              onClick={() => {
                playSoftClickSound();
                onOpenWhatsApp?.();
              }}
              className="w-full py-1 px-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 text-[10px] font-bold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <MessageCircle className="w-3 h-3 shrink-0" />
              <span>Suporte WhatsApp</span>
            </button>
          </>
        ) : (
          <div className="space-y-1">
            <button
              onClick={() => {
                playSoftClickSound();
                switchRole('super_admin');
                setCurrentView('super_admin');
              }}
              className="w-full py-1.5 flex justify-center text-[#FFC72C] hover:bg-[#DA291C]/20 rounded-lg transition-colors cursor-pointer"
              title="Super Admin"
            >
              <Crown className="w-3.5 h-3.5 text-[#FFC72C]" />
            </button>
            <button
              onClick={() => {
                playSoftClickSound();
                setCurrentView('landing');
              }}
              className="w-full py-1.5 flex justify-center text-[#FFC72C] hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
              title="Página de Vendas"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#FFC72C]" />
            </button>
            <button
              onClick={() => {
                playSoftClickSound();
                playPageTransitionSound('meu_plano');
                onOpenMeuPlano?.();
              }}
              className="w-full py-1.5 flex justify-center text-[#FFC72C] hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
              title="Meu Plano (15 Dias Grátis)"
            >
              <Crown className="w-3.5 h-3.5 fill-[#FFC72C]" />
            </button>
            <button
              onClick={() => {
                playSoftClickSound();
                onOpenWhatsApp?.();
              }}
              className="w-full py-1.5 flex justify-center text-emerald-400 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
              title="Suporte no WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
