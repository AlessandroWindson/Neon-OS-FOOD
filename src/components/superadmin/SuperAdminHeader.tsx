import React, { useState } from 'react';
import { 
  Crown, 
  Bell, 
  LifeBuoy, 
  HelpCircle, 
  Settings, 
  LogOut, 
  Lock, 
  ChevronDown, 
  ShieldCheck, 
  UserCheck, 
  Sparkles, 
  Store,
  CheckCircle2,
  ExternalLink,
  User,
  Sliders
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { playBeep, playCashRegister } from '../../utils/audio';
import { UserProfileModal } from '../UserProfileModal';

interface SuperAdminHeaderProps {
  onLock: () => void;
  onSelectTab: (tab: any) => void;
  unreadNotificationsCount?: number;
}

export const SuperAdminHeader: React.FC<SuperAdminHeaderProps> = ({
  onLock,
  onSelectTab,
  unreadNotificationsCount = 3,
}) => {
  const { 
    currentUser, 
    setCurrentView, 
    switchToUser,
    tenant,
    supportTickets,
    maintenanceMode
  } = useApp();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Derivação do displayName do Super Admin via Firestore/Auth
  const adminDisplayName = currentUser.displayName || currentUser.name || 'Super Administrador';

  const pendingTicketsCount = supportTickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;

  return (
    <header className="relative z-30 bg-[#0B0B12] border-b border-[#242436] px-4 sm:px-6 py-3.5 shadow-2xl">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left: Brand + Identity */}
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-3">
            {/* Logo Badge */}
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#DA291C] via-[#FF5722] to-[#FFC72C] p-[1.5px] shadow-[0_0_20px_rgba(218,41,28,0.4)]">
              <div className="w-full h-full bg-[#0E0E18] rounded-[14px] flex items-center justify-center">
                <Crown className="w-5 h-5 text-[#FFC72C]" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-black tracking-tight text-white">
                  NEON FOOD OS
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#DA291C]/20 text-[#FFC72C] border border-[#DA291C]/40">
                  CENTRAL DE COMANDO
                </span>
              </div>
              <div className="text-[11px] text-zinc-400 flex items-center gap-1.5 font-medium">
                <span>Central de Comando da Plataforma</span>
                <span className="text-zinc-600">•</span>
                <span className="text-emerald-400 font-mono text-[10px]">v4.8.0 PRO</span>
              </div>
            </div>
          </div>

          {/* Mobile Fast Lock */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={onLock}
              className="p-2 rounded-xl bg-red-950/40 text-red-400 border border-red-800/40"
              title="Bloquear Central"
            >
              <Lock className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right: Actions, Online Status, Notifications, Profile */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 flex-wrap justify-end w-full md:w-auto">
          {/* Status Online */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#141420] border border-[#262638] text-xs">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-[11px] font-bold text-emerald-400">
              Online • Central Ativa
            </span>
            {maintenanceMode && (
              <span className="ml-1 text-[10px] font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                MANUTENÇÃO
              </span>
            )}
          </div>

          {/* Central de Suporte Button */}
          <button
            onClick={() => {
              playBeep(700, 0.04);
              onSelectTab('chamados');
            }}
            className="relative px-3 py-1.5 rounded-xl bg-[#181828] hover:bg-[#202034] text-zinc-200 hover:text-white border border-[#2D2D42] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            title="Abrir Chamados de Suporte"
          >
            <LifeBuoy className="w-3.5 h-3.5 text-[#00D2FF]" />
            <span className="hidden sm:inline">Suporte</span>
            {pendingTicketsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 text-[10px] font-black bg-[#DA291C] text-white rounded-full">
                {pendingTicketsCount}
              </span>
            )}
          </button>

          {/* Notificações Button */}
          <div className="relative">
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="relative p-2 rounded-xl bg-[#181828] hover:bg-[#202034] text-zinc-300 hover:text-white border border-[#2D2D42] transition-colors cursor-pointer"
              title="Notificações do Sistema"
            >
              <Bell className="w-4 h-4 text-[#FFC72C]" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#DA291C] text-white text-[9px] font-black flex items-center justify-center">
                {unreadNotificationsCount}
              </span>
            </button>

            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-[#12121E] border border-[#2A2A40] rounded-2xl p-4 shadow-2xl space-y-3 z-50">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <span className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-[#FFC72C]" /> Notificações da Central
                  </span>
                  <span className="text-[10px] text-zinc-400">Tempo Real</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-[#181828] border border-zinc-800">
                    <div className="font-bold text-white flex items-center justify-between">
                      <span>Novo chamado urgente</span>
                      <span className="text-[10px] text-zinc-500 font-mono">12m atrás</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5">Lanchonete Dulci solicitou auxílio para impressão 80mm.</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#181828] border border-zinc-800">
                    <div className="font-bold text-emerald-400 flex items-center justify-between">
                      <span>Assinatura renovada (Pix)</span>
                      <span className="text-[10px] text-zinc-500 font-mono">1h atrás</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5">The Burger House SP Franquia renovou Plano Premium (R$ 99,90).</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#181828] border border-zinc-800">
                    <div className="font-bold text-sky-400 flex items-center justify-between">
                      <span>Backup automático</span>
                      <span className="text-[10px] text-zinc-500 font-mono">03:00</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5">Snapshot do Google Cloud Firestore finalizado com 100% de integridade.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Ajuda Button */}
          <button
            onClick={() => setIsHelpOpen(!isHelpOpen)}
            className="p-2 rounded-xl bg-[#181828] hover:bg-[#202034] text-zinc-300 hover:text-white border border-[#2D2D42] transition-colors cursor-pointer"
            title="Ajuda e Documentação da Central"
          >
            <HelpCircle className="w-4 h-4 text-[#00E676]" />
          </button>

          {/* Configurações Button */}
          <button
            onClick={() => {
              playBeep(650, 0.04);
              onSelectTab('configuracoes');
            }}
            className="p-2 rounded-xl bg-[#181828] hover:bg-[#202034] text-zinc-300 hover:text-white border border-[#2D2D42] transition-colors cursor-pointer"
            title="Configurações Globais"
          >
            <Settings className="w-4 h-4 text-zinc-300" />
          </button>

          {/* Super Admin User Profile Chip & Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center gap-2.5 pl-2.5 pr-3 py-1.5 rounded-2xl bg-gradient-to-r from-[#1E121E] via-[#221728] to-[#1A182E] border border-[#DA291C]/50 hover:border-[#FFC72C]/60 transition-all cursor-pointer shadow-lg"
            >
              {/* Avatar with Ring */}
              <div className="relative w-8 h-8 rounded-xl overflow-hidden border border-[#FFC72C]/60 shrink-0">
                <img
                  src={currentUser.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80"}
                  alt={adminDisplayName}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border border-black" />
              </div>

              {/* Names */}
              <div className="text-left hidden lg:block">
                <div className="text-xs font-black text-white flex items-center gap-1 leading-tight">
                  <span>{adminDisplayName}</span>
                </div>
                <div className="text-[10px] font-bold text-[#FFC72C] flex items-center gap-1 leading-tight">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
                  <span>Super Admin</span>
                </div>
              </div>

              <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Menu do Administrador Dropdown */}
            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-[#12121E] border border-[#2C2C44] rounded-2xl p-2.5 shadow-2xl space-y-1 z-50 text-xs">
                <div className="px-3 py-2 border-b border-zinc-800/80 mb-1">
                  <div className="text-xs font-black text-white">{adminDisplayName}</div>
                  <div className="text-[10px] text-zinc-400 font-mono mt-0.5">{currentUser.email || 'admin@sistema.com'}</div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-red-950/60 text-[#FFC72C] border border-[#DA291C]/40 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
                      <span>Super Admin</span>
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsProfileModalOpen(true);
                  }}
                  className="w-full px-3 py-2 rounded-xl text-left text-zinc-200 hover:text-white hover:bg-[#1C1C2E] font-bold flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <User className="w-3.5 h-3.5 text-[#FFC72C]" />
                  <span>Perfil do Usuário</span>
                </button>

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsProfileModalOpen(true);
                  }}
                  className="w-full px-3 py-2 rounded-xl text-left text-zinc-200 hover:text-white hover:bg-[#1C1C2E] font-bold flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Sliders className="w-3.5 h-3.5 text-[#6366F1]" />
                  <span>Editar Perfil</span>
                </button>

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onSelectTab('configuracoes');
                  }}
                  className="w-full px-3 py-2 rounded-xl text-left text-zinc-200 hover:text-white hover:bg-[#1C1C2E] font-bold flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Settings className="w-3.5 h-3.5 text-blue-400" />
                  <span>Configurações</span>
                </button>

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onSelectTab('suporte');
                  }}
                  className="w-full px-3 py-2 rounded-xl text-left text-zinc-200 hover:text-white hover:bg-[#1C1C2E] font-bold flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <LifeBuoy className="w-3.5 h-3.5 text-[#00D2FF]" />
                  <span>Suporte</span>
                </button>

                <div className="border-t border-zinc-800/80 my-1 pt-1" />

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    playCashRegister();
                    switchToUser();
                    setCurrentView('overview_bi');
                  }}
                  className="w-full px-3 py-2 rounded-xl text-left text-emerald-300 hover:bg-emerald-950/30 font-bold flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <span>👤 Acessar como Usuário</span>
                </button>

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    setCurrentView('login_auth');
                  }}
                  className="w-full px-3 py-2 rounded-xl text-left text-red-300 hover:bg-red-950/30 font-bold flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5 text-red-400" />
                  <span>Logout / Sair</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Ajuda Rápida */}
      {isHelpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#12121E] border border-[#2D2D42] rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl text-left">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Central de Ajuda do Super Admin</h3>
                  <p className="text-xs text-zinc-400">Guia operacional para o proprietário da plataforma</p>
                </div>
              </div>
              <button 
                onClick={() => setIsHelpOpen(false)}
                className="text-zinc-500 hover:text-white text-xs font-bold px-2 py-1"
              >
                ✕ Fechar
              </button>
            </div>

            <div className="space-y-3 text-xs text-zinc-300 leading-relaxed">
              <div className="p-3 rounded-2xl bg-[#181828] border border-zinc-800 space-y-1">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-[#FFC72C]" />
                  <span>Identidade Master: {adminDisplayName}</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Você possui privilégios de Super Admin sobre toda a infraestrutura SaaS, incluindo suporte, filiais, planos e configurações.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-[#181828] border border-zinc-800 space-y-1">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <LifeBuoy className="w-3.5 h-3.5 text-[#00D2FF]" />
                  <span>Login de Suporte (Impersonação)</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Para diagnosticar chamados de usuários, utilize o suporte técnico. Todas as ações são registradas com trilha de auditoria imutável.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-[#181828] border border-zinc-800 space-y-1">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#DA291C]" />
                  <span>Modo Manutenção</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Quando ativo, usuários que acessarem a plataforma verão a tela de manutenção com aviso programado e canal de WhatsApp direto.
                </p>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setIsHelpOpen(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition-all"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Perfil do Usuário */}
      <UserProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
      />
    </header>
  );
};
