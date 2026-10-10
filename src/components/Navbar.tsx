import React, { useState, useEffect, useRef } from 'react';
import { 
  Flame, 
  ChevronDown,
  Store, 
  Bell, 
  Search, 
  AlertTriangle,
  LogOut,
  Check,
  Crown,
  HelpCircle,
  Sparkles,
  Users,
  DollarSign,
  CookingPot,
  Smartphone,
  Truck,
  LogIn,
  MessageCircle,
  ShieldCheck,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { useApp, ActiveView } from '../context/AppContext';
import { UserRole } from '../types';
import { playSoftClickSound, playPageTransitionSound } from '../utils/audio';

interface NavbarProps {
  onOpenCommandPalette?: () => void;
  onOpenMeuPlano?: () => void;
  onOpenHelp?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  onOpenCommandPalette,
  onOpenMeuPlano,
  onOpenHelp
}) => {
  const { 
    setCurrentView, 
    currentUser, 
    switchRole, 
    logout,
    tenant, 
    branches, 
    currentBranch, 
    setCurrentBranch,
    webhookNotifications,
    clearWebhookNotifications,
    markNotificationAsRead,
    ingredients,
    effectiveIsOnline,
    switchToSuperAdmin,
    switchToUser,
    openExportModal
  } = useApp();

  // Dropdown states
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isBranchOpen, setIsBranchOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Deriva o nome do usuário a partir de currentUser.displayName vindo do Firebase (Firestore/Auth)
  const userDisplayName = currentUser.displayName || currentUser.name || (currentUser.role === 'super_admin' ? 'Super Administrador' : 'Usuário');

  // Close dropdowns on click outside
  const navRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
        setIsBranchOpen(false);
        setIsProfileOpen(false);
        setIsHelpOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcuts (F2 for Vendas, ⌘K for Universal Search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        playSoftClickSound();
        onOpenCommandPalette?.();
      }
      if (e.key === 'F2') {
        e.preventDefault();
        playSoftClickSound(1.2);
        playPageTransitionSound('pdv');
        setCurrentView('pdv');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenCommandPalette, setCurrentView]);

  // Dynamic notification counts
  const lowStockIngredients = ingredients.filter(i => i.currentStock <= i.minimumStock);
  const unreadWebhooksCount = webhookNotifications.filter(n => !n.read).length;
  const totalAlertsCount = unreadWebhooksCount + (lowStockIngredients.length > 0 ? 1 : 0);

  const roleLabels: Record<UserRole, string> = {
    super_admin: '👑 Super Admin',
    owner: '👤 Usuário Gestor',
    manager: '👔 Gerente Operacional',
    cashier: '💵 Operador de Caixa',
    kitchen: '🍳 Cozinha em Tempo Real',
    waiter: '📱 Atendente Salão',
    driver: '🛵 Entregador (Delivery)',
    customer: '🍔 Cliente',
  };

  return (
    <header 
      ref={navRef}
      id="neon-minimal-header"
      className="h-14 bg-[#09090D] border-b border-[#1A1A26] px-3 sm:px-6 flex items-center justify-between sticky top-0 select-none shadow-md"
      style={{ zIndex: 9999 }}
    >
      {/* 1. ESQUERDA: LOGO MCDONALD'S FAST-FOOD FOOD-TECH + SELETOR DE UNIDADE */}
      <div className="flex items-center gap-3 sm:gap-5 shrink-0">
        {/* Logo NEON FOOD OS */}
        <button
          id="btn-logo-home"
          onClick={() => {
            playSoftClickSound();
            playPageTransitionSound('overview_bi');
            setCurrentView('overview_bi');
          }}
          className="flex items-center gap-2.5 group cursor-pointer focus:outline-none"
          title="Ir para o Resumo da Operação"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#DA291C] via-[#FF5722] to-[#FFC72C] flex items-center justify-center text-white shadow-[0_2px_10px_rgba(218,41,28,0.4)] border border-[#FFC72C]/40 transition-transform group-hover:scale-105 shrink-0">
            <Flame className="w-4 h-4 fill-[#FFC72C] text-[#FFC72C]" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-black text-sm sm:text-base tracking-tight text-white font-sans">
              NEON<span className="text-[#FFC72C]">FOOD</span>
            </span>
            <span className="text-[9px] font-black tracking-widest text-[#DA291C] px-1 py-0.2 rounded bg-[#DA291C]/15 border border-[#DA291C]/30">
              OS
            </span>
          </div>
        </button>

        <div className="h-4 w-px bg-[#1F1F2E] hidden sm:block" />

        {/* Unidade & Status Integrados em 1 Pílula Limpa */}
        <div className="relative">
          <button
            id="btn-unidade-seletor"
            onClick={() => {
              playSoftClickSound();
              setIsBranchOpen(!isBranchOpen);
              setIsNotifOpen(false);
              setIsProfileOpen(false);
              setIsHelpOpen(false);
            }}
            className="flex items-center gap-2 text-xs text-zinc-300 hover:text-white px-2.5 py-1.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer border border-[#20202E] bg-[#101018]"
            title="Alternar Loja / Filial"
          >
            <Store className="w-3.5 h-3.5 text-[#FFC72C] shrink-0" />
            <span className="font-bold max-w-[110px] sm:max-w-[160px] truncate text-xs text-zinc-200">
              {currentBranch?.name || tenant?.name || 'Matriz'}
            </span>
            <span 
              className={`w-2 h-2 rounded-full shrink-0 ${
                effectiveIsOnline ? 'bg-emerald-400 shadow-[0_0_6px_#34D399]' : 'bg-amber-400 animate-pulse'
              }`}
              title={effectiveIsOnline ? 'Sistema Online & Sincronizado' : 'Modo Offline Ativo'}
            />
            <ChevronDown className="w-3 h-3 text-zinc-500 shrink-0" />
          </button>

          {/* Dropdown de Unidades */}
          {isBranchOpen && (
            <div className="absolute left-0 top-full mt-2 w-[calc(100vw-1.5rem)] max-w-xs sm:w-64 bg-[#0E0E16] border border-[#20202E] rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1 flex items-center justify-between">
                <span>Unidades do Negócio</span>
                <span className="text-[#FFC72C] font-semibold">{branches.length} lojas</span>
              </div>
              <div className="space-y-1">
                {branches.map(b => (
                  <button
                    key={b.id}
                    onClick={() => {
                      playSoftClickSound();
                      setCurrentBranch(b);
                      setIsBranchOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                      currentBranch.id === b.id 
                        ? 'bg-[#DA291C]/15 text-[#FFC72C] font-bold border border-[#DA291C]/30' 
                        : 'text-zinc-300 hover:bg-white/5'
                    }`}
                  >
                    <div>
                      <div className="font-semibold">{b.name}</div>
                      <div className="text-[10px] text-zinc-500">{b.address || 'São Paulo, SP'}</div>
                    </div>
                    {currentBranch.id === b.id && <Check className="w-3.5 h-3.5 text-[#FFC72C]" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. CENTRO: BUSCA UNIVERSAL (Visível a partir de sm, adaptável) */}
      <div className="hidden sm:flex flex-1 max-w-sm sm:max-w-md mx-2 sm:mx-6 items-center justify-center">
        <button
          onClick={() => {
            playSoftClickSound();
            onOpenCommandPalette?.();
          }}
          className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#0F0F17] hover:bg-[#151522] border border-[#1E1E2C] hover:border-[#FFC72C]/40 text-xs text-zinc-400 hover:text-white transition-all cursor-pointer shadow-inner"
          title="Buscar no sistema (⌘K) ou abrir Vendas (F2)"
        >
          <div className="flex items-center gap-2.5 truncate">
            <Search className="w-4 h-4 text-[#FFC72C] shrink-0" />
            <span className="text-xs text-zinc-400 truncate">Buscar comanda, produto, mesa...</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <kbd className="hidden md:inline-block text-[9px] font-mono bg-[#181826] text-[#FFC72C] px-1.5 py-0.5 rounded border border-[#27273A]">
              ⌘K
            </kbd>
            <kbd className="hidden lg:inline-block text-[9px] font-mono bg-[#181826] text-emerald-400 px-1.5 py-0.5 rounded border border-[#27273A]">
              F2 Vendas
            </kbd>
          </div>
        </button>
      </div>

      {/* 3. DIREITA: CONTROLES CANÔNICOS (BUSCA MOBILE, NOTIFICAÇÕES, AJUDA, PERFIL) */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Busca Compacta no Mobile */}
        <button
          onClick={() => {
            playSoftClickSound();
            onOpenCommandPalette?.();
          }}
          className="sm:hidden p-2 rounded-xl bg-[#101018] hover:bg-[#181824] border border-[#20202E] text-[#FFC72C] cursor-pointer"
          title="Buscar no sistema (⌘K)"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Notificações (Minimalista) */}
        <div className="relative">
          <button
            id="btn-notificacoes"
            onClick={() => {
              playSoftClickSound();
              setIsNotifOpen(!isNotifOpen);
              setIsBranchOpen(false);
              setIsProfileOpen(false);
              setIsHelpOpen(false);
            }}
            className="p-2 rounded-xl bg-[#101018] hover:bg-[#181824] border border-[#20202E] text-zinc-400 hover:text-white transition-colors cursor-pointer relative"
            title="Avisos & Notificações da Operação"
          >
            <Bell className="w-4 h-4" />
            {totalAlertsCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#DA291C] shadow-[0_0_6px_#DA291C] animate-pulse" />
            )}
          </button>

          {/* Notificações Dropdown */}
          {isNotifOpen && (
            <div className="absolute right-0 top-full mt-2 w-[calc(100vw-1.5rem)] max-w-sm sm:w-80 bg-[#0E0E16] border border-[#20202E] rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-2 border-b border-[#1A1A28] mb-2">
                <span className="font-bold text-xs text-white flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-[#FFC72C]" />
                  Avisos & Notificações
                </span>
                {webhookNotifications.length > 0 && (
                  <button
                    onClick={clearWebhookNotifications}
                    className="text-[10px] text-zinc-400 hover:text-white cursor-pointer"
                  >
                    Limpar
                  </button>
                )}
              </div>

              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1 text-xs">
                {lowStockIngredients.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                    <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs mb-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>{lowStockIngredients.length} ingredientes em baixa</span>
                    </div>
                    <p className="text-[11px] text-zinc-300 mb-1.5">
                      {lowStockIngredients.slice(0, 2).map(i => i.name).join(', ')}...
                    </p>
                    <button
                      onClick={() => {
                        playSoftClickSound();
                        playPageTransitionSound('estoque_cmv');
                        setCurrentView('estoque_cmv');
                        setIsNotifOpen(false);
                      }}
                      className="text-[11px] font-bold text-[#FFC72C] hover:underline cursor-pointer"
                    >
                      Ver Estoque & Reposição →
                    </button>
                  </div>
                )}

                {webhookNotifications.length > 0 ? (
                  webhookNotifications.map(n => (
                    <div 
                      key={n.id}
                      onClick={() => markNotificationAsRead(n.id)}
                      className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
                        !n.read ? 'bg-[#151522] border-[#FFC72C]/40' : 'bg-[#0A0A10] border-[#181824] opacity-75'
                      }`}
                    >
                      <div className="font-bold text-white text-xs mb-0.5">{n.orderNumber || 'Novo Pedido'}</div>
                      <p className="text-[11px] text-zinc-300">{n.message}</p>
                    </div>
                  ))
                ) : (
                  lowStockIngredients.length === 0 && (
                    <div className="text-center py-5 text-zinc-500 text-xs">
                      Tudo certo! Nenhuma notificação pendente.
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>

        {/* Exportação & Backup Operacional (CSV/Excel) */}
        <button
          id="btn-exportar-dados"
          onClick={() => {
            playSoftClickSound();
            openExportModal('completo');
            setIsNotifOpen(false);
            setIsBranchOpen(false);
            setIsProfileOpen(false);
            setIsHelpOpen(false);
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#101018] hover:bg-[#181824] border border-[#20202E] hover:border-[#00E676]/50 text-zinc-300 hover:text-[#00E676] transition-all cursor-pointer shadow-xs text-xs font-semibold"
          title="Backup & Exportar Dados Operacionais (CSV / Excel)"
        >
          <Download className="w-3.5 h-3.5 text-[#00E676]" />
          <span className="hidden md:inline">Backup</span>
        </button>

        {/* Central de Ajuda & Suporte Canônica do Manifesto */}
        <div className="relative">
          <button
            id="btn-ajuda"
            onClick={() => {
              playSoftClickSound();
              setIsHelpOpen(!isHelpOpen);
              setIsNotifOpen(false);
              setIsBranchOpen(false);
              setIsProfileOpen(false);
            }}
            className="p-2 rounded-xl bg-[#101018] hover:bg-[#181824] border border-[#20202E] text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Ajuda & Suporte da Operação"
          >
            <HelpCircle className="w-4 h-4 text-[#FFC72C]" />
          </button>

          {isHelpOpen && (
            <div className="absolute right-0 top-full mt-2 w-[calc(100vw-1.5rem)] max-w-xs sm:w-64 bg-[#0E0E16] border border-[#20202E] rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150 text-left max-h-[80vh] overflow-y-auto">
              <div className="font-bold text-xs text-white pb-2 border-b border-[#1A1A28] mb-2 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-[#FFC72C]" />
                <span>Ajuda & Suporte</span>
              </div>
              <div className="space-y-1 text-xs">
                <button
                  onClick={() => {
                    playSoftClickSound();
                    setIsHelpOpen(false);
                    onOpenHelp?.();
                  }}
                  className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-white/5 text-zinc-300 hover:text-white transition-colors cursor-pointer text-left"
                >
                  <Sparkles className="w-4 h-4 text-[#FFC72C]" />
                  <div>
                    <div className="font-bold text-white text-xs">Perguntas Frequentes</div>
                    <div className="text-[10px] text-zinc-500">Dúvidas operacionais</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    playSoftClickSound();
                    setIsHelpOpen(false);
                    window.open("https://wa.me/5511987654321?text=Ol%C3%A1%20Suporte%20Neon%20Food%20OS", "_blank");
                  }}
                  className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-emerald-500/10 text-zinc-300 hover:text-emerald-300 transition-colors cursor-pointer text-left"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-400" />
                  <div>
                    <div className="font-bold text-emerald-400 text-xs">Suporte no WhatsApp</div>
                    <div className="text-[10px] text-zinc-500">Atendimento humanizado</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    playSoftClickSound();
                    setIsHelpOpen(false);
                    setCurrentView('landing');
                  }}
                  className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-white/5 text-zinc-300 hover:text-white transition-colors cursor-pointer text-left"
                >
                  <Store className="w-4 h-4 text-zinc-400" />
                  <div>
                    <div className="font-bold text-white text-xs">Página de Apresentação</div>
                    <div className="text-[10px] text-zinc-500">Recursos e Planos</div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Perfil & Alternar Cargo - Com Dropdown 100% Opaco, Alto Contraste e Fácil de Entender */}
        <div className="relative">
          <button
            id="btn-perfil"
            onClick={() => {
              playSoftClickSound();
              setIsProfileOpen(!isProfileOpen);
              setIsNotifOpen(false);
              setIsBranchOpen(false);
              setIsHelpOpen(false);
            }}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#101018] hover:bg-[#181824] border border-[#20202E] hover:border-[#FFC72C]/60 transition-all cursor-pointer shadow-xs"
            title="Menu do Usuário & Alternar Cargo"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#DA291C] to-[#FF7A00] flex items-center justify-center text-white font-black text-xs shadow-xs shrink-0">
              {userDisplayName.charAt(0)}
            </div>
            <div className="text-left hidden sm:block leading-tight">
              <div className="font-bold text-xs text-white truncate max-w-[110px]">
                {userDisplayName.split(' ')[0]}
              </div>
              <div className="text-[10px] text-[#FFC72C] font-black flex items-center gap-0.5">
                {currentUser.role === 'super_admin' ? '👑 Super Admin' : (roleLabels[currentUser.role]?.split(' ')[0] || 'Perfil')}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          </button>

          {/* Perfil Dropdown: Fundo Preto Sólido 100% Opaco, Sem Transparência, Z-index 99999 + Backdrop */}
          {isProfileOpen && (
            <>
              {/* Backdrop para fechar ao clicar fora e garantir que nada embaixo interfira */}
              <div 
                className="fixed inset-0 bg-black/40 backdrop-blur-[1px]"
                style={{ zIndex: 99998 }}
                onClick={() => setIsProfileOpen(false)}
              />

              <div 
                className="absolute right-0 top-full mt-2 w-[calc(100vw-1.5rem)] max-w-sm sm:w-96 rounded-2xl border-2 border-zinc-700 shadow-[0_25px_70px_rgba(0,0,0,0.98)] p-4 text-left select-none max-h-[85vh] overflow-y-auto"
                style={{ zIndex: 99999, backgroundColor: '#0B0B13', opacity: 1 }}
              >
                {/* Cabeçalho do Perfil */}
                <div className="flex items-center gap-3 pb-3 border-b border-zinc-800 mb-3 bg-[#13131F] p-3 rounded-xl border border-zinc-700/70">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#DA291C] to-[#FF7A00] flex items-center justify-center text-white font-black text-base shadow-md shrink-0">
                    {userDisplayName.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-black text-sm text-white truncate">{userDisplayName}</div>
                    <div className="text-xs text-[#FFC72C] font-bold truncate flex items-center gap-1">
                      <span>{currentUser.role === 'super_admin' ? '👑 Super Administrador Geral' : (roleLabels[currentUser.role] || currentUser.role)}</span>
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-0.5 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                      <span>Sessão ativa: {currentBranch?.name || 'Matriz'}</span>
                    </div>
                  </div>
                </div>

                {/* Se a sessão atual for do Super Admin, exibe atalho direto e discreto */}
                {currentUser.role === 'super_admin' && (
                  <div className="mb-3 p-3 rounded-xl bg-gradient-to-r from-[#DA291C]/20 to-[#FF7A00]/20 border border-[#DA291C]/40 text-left flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-[#FFC72C]" />
                      <div>
                        <div className="text-xs font-black text-white">Sessão Super Admin</div>
                        <div className="text-[10px] text-zinc-400">Criador da Plataforma</div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        playSoftClickSound();
                        setCurrentView('super_admin');
                        setIsProfileOpen(false);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#DA291C] hover:bg-[#DA291C]/80 text-white font-bold text-xs cursor-pointer shadow-sm"
                    >
                      Painel Master
                    </button>
                  </div>
                )}

                {/* ATALHOS RÁPIDOS: PÁGINA DE VENDAS & LOGIN / CADASTRO */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    onClick={() => {
                      playSoftClickSound();
                      setCurrentView('landing');
                      setIsProfileOpen(false);
                    }}
                    className="flex flex-col items-start p-2.5 rounded-xl bg-[#141420] hover:bg-[#1D1D2E] border border-zinc-700 hover:border-[#FFC72C]/60 text-left cursor-pointer transition-all shadow-xs"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-black text-white mb-0.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#FFC72C]" />
                      <span>Página de Vendas</span>
                    </div>
                    <span className="text-[10.5px] text-zinc-300">Planos, preços e site</span>
                  </button>

                  <button
                    onClick={() => {
                      playSoftClickSound();
                      setCurrentView('login_auth');
                      setIsProfileOpen(false);
                    }}
                    className="flex flex-col items-start p-2.5 rounded-xl bg-[#141420] hover:bg-[#1D1D2E] border border-zinc-700 hover:border-emerald-500/60 text-left cursor-pointer transition-all shadow-xs"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-black text-emerald-400 mb-0.5">
                      <LogIn className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Entrar / Cadastrar</span>
                    </div>
                    <span className="text-[10.5px] text-zinc-300">Login e nova conta</span>
                  </button>
                </div>

                {/* Seletor de Perfis com Linguagem Humana e Simples */}
                <div className="mb-3">
                  <div className="text-[11px] font-black text-zinc-300 uppercase tracking-wider px-1 mb-1.5 flex items-center justify-between">
                    <span>Mudar Modo / Cargo da Loja</span>
                    <span className="text-[10px] text-[#FFC72C] font-semibold">1 Clique</span>
                  </div>
                  
                  <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                    {/* Botão rápido para Modo Usuário */}
                    <button
                      onClick={() => {
                        playSoftClickSound();
                        switchToUser();
                        setCurrentView('overview_bi');
                        setIsProfileOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl transition-colors cursor-pointer text-left ${
                        currentUser.role === 'owner' 
                          ? 'bg-[#202034] text-emerald-400 font-bold border border-emerald-500/50 shadow-xs' 
                          : 'text-zinc-200 hover:bg-zinc-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-semibold truncate">👤 Modo Usuário ({currentUser.role === 'owner' ? userDisplayName : 'Gestor'})</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                          Usuário
                        </span>
                        {currentUser.role === 'owner' && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-1" />}
                      </div>
                    </button>

                    {/* Botão rápido para Super Admin */}
                    <button
                      onClick={() => {
                        playSoftClickSound();
                        switchToSuperAdmin();
                        setCurrentView('super_admin');
                        setIsProfileOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl transition-colors cursor-pointer text-left ${
                        currentUser.role === 'super_admin' 
                          ? 'bg-[#202034] text-[#FFC72C] font-bold border border-[#DA291C]/60 shadow-xs' 
                          : 'text-zinc-200 hover:bg-zinc-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-semibold truncate">👑 Super Admin ({currentUser.role === 'super_admin' ? userDisplayName : 'Master'})</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded bg-red-950/80 text-[#FFC72C] border border-red-800">
                          Master
                        </span>
                        {currentUser.role === 'super_admin' && <Check className="w-3.5 h-3.5 text-[#FFC72C] shrink-0 ml-1" />}
                      </div>
                    </button>

                    {[
                      { role: 'manager', label: '👔 Gerente (Operação, Estoque & DRE)', tag: 'Gestão', view: 'overview_bi' },
                      { role: 'cashier', label: '💵 Atendente (PDV & Vendas)', tag: 'Frente', view: 'pdv' },
                      { role: 'kitchen', label: '🍳 Cozinha (KDS & Produção)', tag: 'Produção', view: 'kds' },
                      { role: 'waiter', label: '📱 Atendente / Salão (Comandas)', tag: 'Salão', view: 'mesas_comandas' },
                      { role: 'driver', label: '🛵 Entregador (Delivery & Rotas)', tag: 'Logística', view: 'delivery_gestao' }
                    ].map(item => {
                      const isCurrent = currentUser.role === item.role;
                      return (
                        <button
                          key={item.role}
                          onClick={() => {
                            playSoftClickSound();
                            switchRole(item.role as UserRole);
                            setCurrentView(item.view as ActiveView);
                            setIsProfileOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl transition-colors cursor-pointer text-left ${
                            isCurrent 
                              ? 'bg-[#202034] text-[#FFC72C] font-bold border border-[#FFC72C]/50 shadow-xs' 
                              : 'text-zinc-200 hover:bg-zinc-800 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-semibold truncate">{item.label}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                              {item.tag}
                            </span>
                            {isCurrent && <Check className="w-3.5 h-3.5 text-[#FFC72C] shrink-0 ml-1" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Divisor */}
                <div className="h-px bg-zinc-800 my-2" />

                {/* Rodapé: Meu Plano & Sair */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => {
                      playSoftClickSound();
                      onOpenMeuPlano?.();
                      setIsProfileOpen(false);
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs text-[#FFC72C] bg-[#FFC72C]/10 hover:bg-[#FFC72C]/20 border border-[#FFC72C]/30 cursor-pointer font-bold transition-colors"
                  >
                    <Crown className="w-3.5 h-3.5 text-[#FFC72C]" />
                    <span>Meu Plano (15d Grátis)</span>
                  </button>

                  <button
                    onClick={async () => {
                      playSoftClickSound();
                      setIsProfileOpen(false);
                      await logout();
                    }}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 cursor-pointer font-bold transition-colors"
                    title="Desconectar do Firebase Auth"
                  >
                    <LogOut className="w-3.5 h-3.5 text-red-400" />
                    <span>Sair</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

