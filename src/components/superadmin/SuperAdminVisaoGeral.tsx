import React from 'react';
import { 
  Building2, 
  Users, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  LifeBuoy, 
  Server, 
  ShieldCheck, 
  Crown, 
  GitBranch, 
  Clock, 
  ArrowRight,
  Activity,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SuperAdminTab } from './SuperAdminNav17';
import { formatBRL } from '../../utils/formatters';
import { playCashRegister, playBeep } from '../../utils/audio';

interface SuperAdminVisaoGeralProps {
  onSelectTab: (tab: SuperAdminTab) => void;
}

export const SuperAdminVisaoGeral: React.FC<SuperAdminVisaoGeralProps> = ({ onSelectTab }) => {
  const { 
    allTenants, 
    platformUsers, 
    supportTickets, 
    branches, 
    maintenanceMode, 
    isCompanyActive,
    tenant,
    activateCompany,
    suspendCompany,
    isDemoMode,
    clearToRealEmptyData
  } = useApp();

  const activeTenants = allTenants.filter(t => t.status === 'active');
  const trialTenants = allTenants.filter(t => t.status === 'trial');
  const mrr = activeTenants.reduce((acc, t) => acc + (t.monthlyRevenue || 99.90), 0);
  const arr = mrr * 12;
  const pendingTickets = supportTickets.filter(t => t.status === 'open' || t.status === 'in_progress');
  const criticalTickets = supportTickets.filter(t => t.priority === 'critical');

  return (
    <div className="space-y-6">
      {/* Real Data & Tenant Master Banner */}
      <div className="bg-gradient-to-r from-[#181216] via-[#1A1624] to-[#12121C] border-2 border-[#FFC72C]/40 p-6 rounded-3xl space-y-4 shadow-[0_0_30px_rgba(255,199,44,0.12)]">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-[#FFC72C]/15 text-[#FFC72C] border border-[#FFC72C]/30 flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-[#FFC72C]" />
                <span>Instância Master Atual</span>
              </span>
              <span className={`text-[11px] font-extrabold uppercase px-3 py-1 rounded-full flex items-center gap-1.5 ${
                isCompanyActive 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                  : tenant.status === 'suspended'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}>
                <span className={`w-2 h-2 rounded-full ${isCompanyActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span>
                  {isCompanyActive 
                    ? 'Empresa Ativada & Operacional' 
                    : tenant.status === 'suspended'
                      ? 'Empresa Suspensa'
                      : 'Não Ativado (Bloqueado)'}
                </span>
              </span>
              <span className="text-[11px] font-bold px-3 py-1 rounded-full border bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                🛡️ Modo 100% Real (Zero Mock Data)
              </span>
            </div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <span>{tenant.name || 'Minha Empresa Gastronômica'}</span>
              <span className="text-xs text-zinc-400 font-mono font-normal">({tenant.cnpj || 'CNPJ não informado'})</span>
            </h2>
            <p className="text-xs text-zinc-400 max-w-2xl">
              Plataforma NEON FOOD OS operando em tempo real com Google Cloud Firestore e Firebase Authentication.
            </p>
          </div>

          {/* Instant Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            {!isCompanyActive ? (
              <button
                onClick={() => {
                  activateCompany();
                  playCashRegister();
                }}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-[#00E676] to-[#00B050] hover:brightness-110 text-black font-black text-xs transition-all shadow-[0_0_20px_rgba(0,230,118,0.4)] flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-black" />
                <span>Ativar Empresa no Sistema</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  suspendCompany();
                  playBeep(400, 0.1);
                }}
                className="px-4 py-2.5 rounded-2xl bg-[#DA291C]/20 hover:bg-[#DA291C]/35 text-[#DA291C] border border-[#DA291C]/40 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Suspender Licença</span>
              </button>
            )}

            {isDemoMode && (
              <button
                onClick={() => {
                  if (confirm('Deseja limpar todos os dados de demonstração e deixar o sistema 100% REAL e vazio?')) {
                    clearToRealEmptyData();
                    playBeep(500, 0.1);
                  }
                }}
                className="px-4 py-2.5 rounded-2xl bg-[#00E676]/15 hover:bg-[#00E676]/25 text-[#00E676] border border-[#00E676]/40 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Usar Apenas Dados Reais</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main SaaS Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MRR */}
        <div className="bg-[#12121A] border border-[#242438] p-5 rounded-3xl shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase text-zinc-400">MRR (Recorrência)</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#00E676] font-mono">{formatBRL(mrr)}</div>
          <div className="text-[11px] text-zinc-400 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>ARR Projetado: <strong>{formatBRL(arr)}</strong></span>
          </div>
        </div>

        {/* Total Empresas */}
        <div className="bg-[#12121A] border border-[#242438] p-5 rounded-3xl shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase text-zinc-400">Restaurantes / Tenants</span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white font-mono">{allTenants.length}</div>
          <div className="text-[11px] text-zinc-400">
            <span className="text-emerald-400 font-bold">{activeTenants.length} ativos</span> • <span className="text-amber-400">{trialTenants.length} em teste</span>
          </div>
        </div>

        {/* Total Usuários */}
        <div className="bg-[#12121A] border border-[#242438] p-5 rounded-3xl shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase text-zinc-400">Usuários na Plataforma</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white font-mono">{platformUsers.length}</div>
          <div className="text-[11px] text-zinc-400">
            Proprietários, gerentes e operadores
          </div>
        </div>

        {/* Chamados Abertos */}
        <div className="bg-[#12121A] border border-[#242438] p-5 rounded-3xl shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase text-zinc-400">Chamados em Aberto</span>
            <div className={`p-2 rounded-xl ${pendingTickets.length > 0 ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
              <LifeBuoy className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white font-mono">{pendingTickets.length}</div>
          <div className="text-[11px] text-zinc-400">
            {criticalTickets.length > 0 ? (
              <span className="text-red-400 font-bold">{criticalTickets.length} chamados críticos</span>
            ) : (
              <span className="text-emerald-400 font-bold">Nenhum chamado crítico</span>
            )}
          </div>
        </div>
      </div>

      {/* Shortcuts & Operations Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card: Gestão de Empresas */}
        <div className="bg-[#12121A] border border-[#242438] p-5 rounded-3xl space-y-3 flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-white font-black text-sm">
              <Building2 className="w-4 h-4 text-[#FF6B00]" />
              <span>Gerenciar Empresas Cadastradas</span>
            </div>
            <p className="text-xs text-zinc-400">
              Visualize dados cadastrais, CNPJ, faturamento e execute login de suporte com impersonação transparente.
            </p>
          </div>
          <button
            onClick={() => onSelectTab('empresas')}
            className="w-full py-2.5 rounded-2xl bg-[#1A1A28] hover:bg-[#222234] text-white text-xs font-bold border border-[#2C2C40] flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <span>Ver Todas as Empresas</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card: Fila de Chamados */}
        <div className="bg-[#12121A] border border-[#242438] p-5 rounded-3xl space-y-3 flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-white font-black text-sm">
              <LifeBuoy className="w-4 h-4 text-[#00D2FF]" />
              <span>Fila de Atendimento & Chamados</span>
            </div>
            <p className="text-xs text-zinc-400">
              Responda dúvidas de impressão térmica, KDS e configurações fiscais com mensagens em tempo real.
            </p>
          </div>
          <button
            onClick={() => onSelectTab('chamados')}
            className="w-full py-2.5 rounded-2xl bg-[#1A1A28] hover:bg-[#222234] text-white text-xs font-bold border border-[#2C2C40] flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <span>Atender Chamados ({pendingTickets.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card: Infraestrutura Cloud */}
        <div className="bg-[#12121A] border border-[#242438] p-5 rounded-3xl space-y-3 flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-white font-black text-sm">
              <Server className="w-4 h-4 text-emerald-400" />
              <span>Infraestrutura & Status</span>
            </div>
            <p className="text-xs text-zinc-400">
              Monitore Cloud Firestore, WebSockets de pedidos, latência de servidores e ative o modo manutenção.
            </p>
          </div>
          <button
            onClick={() => onSelectTab('sistema')}
            className="w-full py-2.5 rounded-2xl bg-[#1A1A28] hover:bg-[#222234] text-white text-xs font-bold border border-[#2C2C40] flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <span>Monitorar Servidores</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
