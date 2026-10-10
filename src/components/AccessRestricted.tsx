import React from 'react';
import { ShieldAlert, Lock, ArrowRight, CheckCircle2, Crown, Users, Coffee, Flame } from 'lucide-react';
import { useApp, ActiveView } from '../context/AppContext';
import { UserRole } from '../types';

interface AccessRestrictedProps {
  viewName: string;
  requiredRoles?: string[];
  isSuperAdminDenied?: boolean;
  denialReason?: string;
}

export const AccessRestricted: React.FC<AccessRestrictedProps> = ({ 
  viewName,
  requiredRoles = ['Admin', 'Gerente'],
  isSuperAdminDenied = false,
  denialReason
}) => {
  const { currentUser, switchRole, setCurrentView } = useApp();

  const roleLabels: Record<string, string> = {
    owner: 'Admin (Dono)',
    manager: 'Gerente',
    cashier: 'Atendente (Caixa)',
    kitchen: 'Cozinha (KDS)',
    waiter: 'Atendente (Salão)',
    driver: 'Entregador',
    super_admin: 'Super Admin'
  };

  const getRecommendedView = (role: string): { view: ActiveView; label: string } => {
    switch (role) {
      case 'kitchen':
        return { view: 'kds', label: 'Monitor da Cozinha (KDS)' };
      case 'cashier':
      case 'waiter':
        return { view: 'pdv', label: 'Frente de Caixa (PDV)' };
      default:
        return { view: 'overview_bi', label: 'Visão Geral do Restaurante' };
    }
  };

  const recommended = getRecommendedView(currentUser.role);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-[#11111A] border-2 border-[#DA291C]/40 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(218,41,28,0.2)] relative overflow-hidden text-center">
        {/* Ambient Top Glow */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-72 h-32 bg-[#DA291C]/25 blur-3xl pointer-events-none" />

        {/* Header Icon */}
        <div className="w-16 h-16 rounded-2xl bg-[#DA291C]/20 border-2 border-[#DA291C]/50 text-[#DA291C] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#DA291C]/20 animate-pulse">
          <ShieldAlert className="w-9 h-9" />
        </div>

        {/* Title */}
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-2">
          {isSuperAdminDenied ? 'Acesso Negado — Central Super Admin' : 'Acesso Restrito por Função (RBAC)'}
        </h2>

        <p className="text-xs sm:text-sm text-zinc-300 max-w-md mx-auto mb-6 leading-relaxed">
          {isSuperAdminDenied ? (
            denialReason || (
              <>A rota <span className="text-white font-bold font-mono">/super_admin</span> é exclusiva para o <strong>Super Administrador</strong> da plataforma. Sua conta autenticada não possui a <strong>claim ou role de 'super_admin'</strong> verificada no Firestore/Auth.</>
            )
          ) : (
            <>O recurso <span className="text-white font-bold">"{viewName}"</span> é protegido pelas regras de segurança do Firestore e requer autorização de nível <span className="text-[#FFC72C] font-bold">{requiredRoles.join(' ou ')}</span>.</>
          )}
        </p>

        {/* Current Credentials Card */}
        <div className="bg-[#181826] border border-zinc-800 rounded-2xl p-4 mb-6 text-left">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase text-zinc-400 tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#DA291C]" />
              Status da Verificação de Segurança
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#DA291C]/20 text-[#DA291C] border border-[#DA291C]/40">
              {roleLabels[currentUser.role] || currentUser.role}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-300 font-bold text-sm border border-zinc-700">
              {currentUser.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-white truncate">{currentUser.name}</div>
              <div className="text-[11px] text-zinc-400 truncate">{currentUser.email}</div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-zinc-800/80 text-[11.5px] text-zinc-400 flex items-start gap-2">
            <Lock className="w-3.5 h-3.5 text-[#FFC72C] shrink-0 mt-0.5" />
            <span>
              {isSuperAdminDenied 
                ? 'Esta tentativa de acesso via URL ou navegação direta foi interceptada e registrada no log de auditoria de segurança da plataforma.'
                : 'As regras de segurança do Firestore bloqueiam operações não autorizadas para proteger a integridade dos dados e o fluxo de caixa da loja.'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setCurrentView(recommended.view)}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#DA291C] to-[#FF7A00] hover:opacity-95 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer hover:scale-[1.01]"
          >
            <span>Retornar ao Painel Seguro ({recommended.label})</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {isSuperAdminDenied && (
            <button
              type="button"
              onClick={() => setCurrentView('login_auth')}
              className="w-full py-2.5 px-4 rounded-xl bg-[#181826] hover:bg-zinc-800 border border-[#DA291C]/40 hover:border-[#DA291C] text-[#FFC72C] font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Crown className="w-3.5 h-3.5" />
              <span>Entrar com Credenciais de Super Administrador</span>
            </button>
          )}

          {/* Quick switch to test with another role if NOT in production lockdown */}
          {!isSuperAdminDenied && (
            <div className="pt-2">
              <div className="text-[11px] font-bold uppercase text-zinc-400 mb-2">
                Alternar Modo / Cargo para Teste (Firestore RBAC)
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { role: 'owner', label: 'Admin (Dono)', icon: Crown, color: '#DA291C' },
                  { role: 'manager', label: 'Gerente', icon: Users, color: '#FFC72C' },
                  { role: 'cashier', label: 'Atendente', icon: Coffee, color: '#00D26A' },
                ].map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.role}
                      type="button"
                      onClick={() => switchRole(item.role as UserRole)}
                      className="py-2 px-2.5 rounded-lg bg-[#181826] hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color: item.color }} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
