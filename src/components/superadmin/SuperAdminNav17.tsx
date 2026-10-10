import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  GitBranch, 
  CreditCard, 
  Receipt, 
  LifeBuoy, 
  MessageSquare, 
  Wrench, 
  Headphones, 
  AlertOctagon, 
  Server, 
  Layers, 
  ShieldCheck, 
  FileText, 
  Radio, 
  Settings 
} from 'lucide-react';
import { playBeep } from '../../utils/audio';

export type SuperAdminTab = 
  | 'visao_geral'
  | 'usuarios'
  | 'empresas'
  | 'filiais'
  | 'planos'
  | 'assinaturas'
  | 'suporte'
  | 'chamados'
  | 'suporte_tecnico'
  | 'suporte_operacional'
  | 'manutencao'
  | 'sistema'
  | 'integracoes'
  | 'seguranca'
  | 'auditoria'
  | 'comunicacoes'
  | 'configuracoes';

interface NavItem {
  id: SuperAdminTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
  color?: string;
  group?: 'principal' | 'suporte' | 'plataforma';
}

export const SUPER_ADMIN_NAV_ITEMS: NavItem[] = [
  // Bloco 1: Gestão Principal
  { id: 'visao_geral', label: '1. Visão Geral', icon: LayoutDashboard, group: 'principal' },
  { id: 'usuarios', label: '2. Usuários', icon: Users, group: 'principal' },
  { id: 'empresas', label: '3. Empresas', icon: Building2, group: 'principal' },
  { id: 'filiais', label: '4. Filiais', icon: GitBranch, group: 'principal' },
  { id: 'planos', label: '5. Planos', icon: CreditCard, group: 'principal' },
  { id: 'assinaturas', label: '6. Assinaturas', icon: Receipt, group: 'principal' },

  // Bloco 2: Atendimento & Suporte
  { id: 'suporte', label: '7. Suporte', icon: LifeBuoy, group: 'suporte' },
  { id: 'chamados', label: '8. Chamados', icon: MessageSquare, group: 'suporte' },
  { id: 'suporte_tecnico', label: '9. Suporte Técnico', icon: Wrench, group: 'suporte' },
  { id: 'suporte_operacional', label: '10. Suporte Operacional', icon: Headphones, group: 'suporte' },

  // Bloco 3: Engenharia & Manutenção
  { id: 'manutencao', label: '11. Manutenção', icon: AlertOctagon, group: 'plataforma' },
  { id: 'sistema', label: '12. Sistema', icon: Server, group: 'plataforma' },
  { id: 'integracoes', label: '13. Integrações', icon: Layers, group: 'plataforma' },
  { id: 'seguranca', label: '14. Segurança', icon: ShieldCheck, group: 'plataforma' },
  { id: 'auditoria', label: '15. Auditoria', icon: FileText, group: 'plataforma' },
  { id: 'comunicacoes', label: '16. Comunicações', icon: Radio, group: 'plataforma' },
  { id: 'configuracoes', label: '17. Configurações', icon: Settings, group: 'plataforma' },
];

interface SuperAdminNav17Props {
  activeTab: SuperAdminTab;
  onSelectTab: (tab: SuperAdminTab) => void;
  openTicketsCount?: number;
  maintenanceActive?: boolean;
}

export const SuperAdminNav17: React.FC<SuperAdminNav17Props> = ({
  activeTab,
  onSelectTab,
  openTicketsCount = 0,
  maintenanceActive = false,
}) => {
  return (
    <div className="bg-[#0D0D16] border border-[#242436] p-2.5 rounded-3xl shadow-xl space-y-2">
      <div className="flex items-center justify-between px-3 py-1 text-[11px] font-black uppercase text-zinc-400 tracking-wider">
        <span>CENTRAL DE COMANDO (17 MÓDULOS)</span>
        <span className="text-[10px] text-[#FFC72C] font-mono">NEON FOOD OS</span>
      </div>

      {/* Horizontal scrollable track for buttons with smooth badges */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {SUPER_ADMIN_NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                playBeep(620, 0.03);
                onSelectTab(item.id);
              }}
              className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-gradient-to-r from-[#DA291C] to-[#FF5722] text-white shadow-[0_0_20px_rgba(218,41,28,0.4)] ring-1 ring-white/20'
                  : 'text-zinc-400 hover:text-white hover:bg-[#161624] bg-[#10101A]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
              <span>{item.label}</span>

              {/* Dynamic Badges */}
              {item.id === 'chamados' && openTicketsCount > 0 && (
                <span className={`px-1.5 py-0.2 text-[10px] font-black rounded-full ${
                  isActive ? 'bg-white text-red-600' : 'bg-red-500/30 text-red-300 border border-red-500/40'
                }`}>
                  {openTicketsCount}
                </span>
              )}

              {item.id === 'manutencao' && maintenanceActive && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
