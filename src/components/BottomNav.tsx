import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Layers, 
  DollarSign, 
  UtensilsCrossed, 
  Menu, 
  X, 
  CookingPot, 
  Boxes, 
  PieChart, 
  Truck, 
  Users, 
  Trophy, 
  Settings, 
  HelpCircle, 
  Sparkles,
  ChevronRight,
  Share2,
  Tag,
  BarChart3,
  Webhook,
  Crown,
  Smartphone
} from 'lucide-react';
import { useApp, ActiveView } from '../context/AppContext';
import { playBeep } from '../utils/audio';

interface BottomNavProps {
  onOpenHelp?: () => void;
  onOpenShare?: () => void;
  onOpenMeuPlano?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ 
  onOpenHelp, 
  onOpenShare,
  onOpenMeuPlano 
}) => {
  const { 
    currentView, 
    setCurrentView, 
    orders, 
    setIsAICopilotOpen,
    setIsWebhookModalOpen 
  } = useApp();
  
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const activeOrdersCount = orders.filter(
    o => o.status === 'preparing' || o.status === 'ready' || o.status === 'pending'
  ).length;

  const navigateTo = (view: ActiveView) => {
    setCurrentView(view);
    setIsDrawerOpen(false);
    playBeep(800, 0.03);
  };

  // Exactly the 12 items required by the Master Prompt for the "MAIS" drawer:
  // Mesas, Comandas, Cozinha, Delivery, Clientes, Estoque, Financeiro, Resultados, Equipe, Integrações, Configurações, Meu Plano
  const moreItems: { 
    id: string; 
    label: string; 
    icon: React.ElementType; 
    color: string; 
    badge?: string;
    action: () => void;
  }[] = [
    { 
      id: 'mesas', 
      label: 'Mesas', 
      icon: UtensilsCrossed, 
      color: '#38C9FF', 
      action: () => navigateTo('mesas_comandas') 
    },
    { 
      id: 'comandas', 
      label: 'Comandas', 
      icon: Tag, 
      color: '#FF7A00', 
      action: () => navigateTo('mesas_comandas') 
    },
    { 
      id: 'atendente', 
      label: 'Atendente Mobile', 
      icon: Smartphone, 
      color: '#FB923C', 
      badge: 'Salão',
      action: () => navigateTo('atendente_mobile') 
    },
    { 
      id: 'cozinha', 
      label: 'Cozinha', 
      icon: CookingPot, 
      color: '#FFC72C', 
      badge: 'Tempo Real',
      action: () => navigateTo('kds') 
    },
    { 
      id: 'delivery', 
      label: 'Delivery', 
      icon: Truck, 
      color: '#38BDF8', 
      action: () => navigateTo('delivery_gestao') 
    },
    { 
      id: 'clientes', 
      label: 'Clientes', 
      icon: Users, 
      color: '#F472B6', 
      action: () => navigateTo('fidelidade') 
    },
    { 
      id: 'estoque', 
      label: 'Estoque', 
      icon: Boxes, 
      color: '#00E676', 
      action: () => navigateTo('estoque_cmv') 
    },
    { 
      id: 'financeiro', 
      label: 'Financeiro', 
      icon: PieChart, 
      color: '#A78BFA', 
      action: () => navigateTo('financeiro_dre') 
    },
    { 
      id: 'resultados', 
      label: 'Resultados', 
      icon: BarChart3, 
      color: '#FBBF24', 
      action: () => navigateTo('overview_bi') 
    },
    { 
      id: 'equipe', 
      label: 'Equipe', 
      icon: Trophy, 
      color: '#FBBF24', 
      action: () => navigateTo('gamificacao') 
    },
    { 
      id: 'super_admin', 
      label: 'Super Admin', 
      icon: Crown, 
      color: '#DA291C', 
      badge: 'ADMIN',
      action: () => navigateTo('super_admin') 
    },
    { 
      id: 'integracoes', 
      label: 'Integrações', 
      icon: Webhook, 
      color: '#818CF8', 
      action: () => {
        setIsDrawerOpen(false);
        setIsWebhookModalOpen(true);
      }
    },
    { 
      id: 'configuracoes', 
      label: 'Configurações', 
      icon: Settings, 
      color: '#22D3EE', 
      action: () => navigateTo('configuracoes') 
    },
    { 
      id: 'meu_plano', 
      label: 'Meu Plano', 
      icon: Crown, 
      color: '#FFC72C', 
      badge: '15d Grátis',
      action: () => {
        setIsDrawerOpen(false);
        onOpenMeuPlano?.();
      }
    },
  ];

  return (
    <>
      {/* Mobile Bottom Navigation Bar (md:hidden) */}
      <nav 
        id="neon-mobile-bottom-nav"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0E0E14]/95 backdrop-blur-xl border-t border-[#232330] px-3 py-2 flex items-center justify-around shadow-[0_-4px_25px_rgba(0,0,0,0.5)] select-none"
        aria-label="Navegação mobile"
      >
        {/* 1. Início */}
        <button
          id="btn-nav-inicio"
          onClick={() => navigateTo('overview_bi')}
          className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-colors cursor-pointer ${
            currentView === 'overview_bi' ? 'text-[#FFC72C]' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] font-semibold tracking-tight">Início</span>
        </button>

        {/* 2. Pedidos */}
        <button
          id="btn-nav-pedidos"
          onClick={() => navigateTo('central_pedidos')}
          className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 relative transition-colors cursor-pointer ${
            currentView === 'central_pedidos' ? 'text-[#FFC72C]' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <div className="relative">
            <Layers className="w-5 h-5" />
            {activeOrdersCount > 0 && (
              <span className="absolute -top-1.5 -right-2 px-1.5 py-0.2 min-w-[16px] h-4 rounded-full bg-[#DA291C] text-white text-[9px] font-black flex items-center justify-center border border-[#0E0E14]">
                {activeOrdersCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-semibold tracking-tight">Pedidos</span>
        </button>

        {/* 3. Vender (Destaque Central McDonald's Vermelho & Dourado) */}
        <button
          id="btn-nav-vender"
          onClick={() => navigateTo('pdv')}
          className="flex flex-col items-center justify-center -mt-5 flex-1 cursor-pointer group"
          title="Frente de Caixa (Vendas)"
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#DA291C] via-[#FF7A00] to-[#FFC72C] p-[2px] shadow-[0_4px_16px_rgba(218,41,28,0.45)] group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-[#0E0E14] group-hover:bg-[#161620] rounded-[14px] flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-[#FFC72C]" />
            </div>
          </div>
          <span className="text-[10px] font-bold text-white tracking-tight mt-0.5">Vender</span>
        </button>

        {/* 4. Cardápio */}
        <button
          id="btn-nav-cardapio"
          onClick={() => navigateTo('cardapio_digital')}
          className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-colors cursor-pointer ${
            currentView === 'cardapio_digital' ? 'text-[#FFC72C]' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <UtensilsCrossed className="w-5 h-5" />
          <span className="text-[10px] font-semibold tracking-tight">Cardápio</span>
        </button>

        {/* 5. Mais */}
        <button
          id="btn-nav-mais"
          onClick={() => {
            setIsDrawerOpen(true);
            playBeep(750, 0.03);
          }}
          className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-colors cursor-pointer ${
            isDrawerOpen ? 'text-[#FFC72C]' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] font-semibold tracking-tight">Mais</span>
        </button>
      </nav>

      {/* Mobile Drawer (Menu Completo "Mais") */}
      {isDrawerOpen && (
        <div 
          className="md:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end"
          onClick={() => setIsDrawerOpen(false)}
        >
          <div 
            className="bg-[#12121A] border-t border-[#262638] rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#232332] mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#DA291C]/20 border border-[#FFC72C]/30 flex items-center justify-center text-[#FFC72C]">
                  <Menu className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Todos os Módulos</h3>
                  <p className="text-[11px] text-zinc-400">Acesse qualquer área do restaurante</p>
                </div>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="w-8 h-8 rounded-full bg-[#1C1C28] text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Actions Highlight */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                onClick={() => {
                  setIsDrawerOpen(false);
                  setIsAICopilotOpen(true);
                  playBeep(920, 0.04);
                }}
                className="flex items-center gap-2.5 p-3 rounded-2xl bg-[#DA291C]/10 border border-[#DA291C]/30 text-left hover:bg-[#DA291C]/20 transition-colors cursor-pointer"
              >
                <Sparkles className="w-5 h-5 text-[#FFC72C] shrink-0" />
                <div>
                  <div className="text-xs font-bold text-white">Copiloto IA</div>
                  <div className="text-[10px] text-[#FFC72C]">Sugestões e Análise</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsDrawerOpen(false);
                  onOpenShare?.();
                  playBeep(880, 0.03);
                }}
                className="flex items-center gap-2.5 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-left hover:bg-emerald-500/20 transition-colors cursor-pointer"
              >
                <Share2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-white">WhatsApp</div>
                  <div className="text-[10px] text-emerald-400">Enviar Cardápio</div>
                </div>
              </button>
            </div>

            {/* Navigation List */}
            <div className="grid grid-cols-1 gap-1.5">
              {moreItems.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={item.action}
                    className="flex items-center justify-between p-3 rounded-xl transition-colors text-left cursor-pointer border bg-[#181824] hover:bg-[#1F1F2E] border-[#252538] text-zinc-300"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${item.color}15`, color: item.color }}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-semibold">{item.label}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.badge && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/10 text-zinc-300">
                          {item.badge}
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-zinc-500" />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Bottom Support Link */}
            <div className="mt-4 pt-3 border-t border-[#232332] flex items-center justify-between text-xs text-zinc-400">
              <button
                onClick={() => {
                  setIsDrawerOpen(false);
                  onOpenHelp?.();
                }}
                className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
              >
                <HelpCircle className="w-4 h-4 text-[#FFC72C]" />
                <span>Ajuda & Suporte</span>
              </button>
              <span className="text-[10px] text-zinc-500">v3.3.0 • Offline Ready</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
