import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Lock, 
  ShieldCheck, 
  CheckCircle2, 
  Sparkles, 
  AlertCircle, 
  ArrowRight, 
  Key, 
  Building2, 
  Layers,
  Crown
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '../context/AppContext';
import { playCashRegister, playBeep, playLevelUp } from '../utils/audio';

export const CompanyActivationGate: React.FC = () => {
  const { tenant, activateCompany, setCurrentView, switchRole, setCurrentUser } = useApp();
  const [isActivating, setIsActivating] = useState(false);

  const handleQuickActivate = () => {
    setIsActivating(true);
    playCashRegister();
    confetti({
      particleCount: 70,
      spread: 80,
      origin: { y: 0.6 }
    });

    setTimeout(() => {
      activateCompany();
      playLevelUp();
      setIsActivating(false);
      setCurrentView('overview_bi');
    }, 600);
  };

  const handleGoToSuperAdmin = () => {
    playBeep(600, 0.05);
    setCurrentView('super_admin');
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-xl bg-[#12121A] border border-[#2B2B3E] rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-center space-y-6"
      >
        {/* Subtle Ambient Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 bg-gradient-to-b from-[#DA291C]/25 via-[#FFC72C]/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        {/* Lock Icon Emblem */}
        <div className="relative z-10 mx-auto w-20 h-20 rounded-3xl bg-gradient-to-br from-[#1E1928] to-[#14121B] border border-[#DA291C]/40 flex items-center justify-center shadow-[0_0_30px_rgba(218,41,28,0.25)]">
          <Lock className="w-10 h-10 text-[#FFC72C] animate-pulse" />
        </div>

        {/* Header Titles */}
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DA291C]/15 border border-[#DA291C]/35 text-[#FF6B6B] text-[11px] font-black uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-[#DA291C] animate-ping" />
            <span>Acesso Operacional Bloqueado</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black font-display text-white tracking-tight pt-1">
            Sistema Não Ativado
          </h2>
          <p className="text-xs sm:text-sm text-[#A1A1AA] max-w-md mx-auto leading-relaxed">
            Esta empresa ainda não foi ativada pelo Super Administrador. O sistema operacional da loja (PDV, Mesas, Cozinha, Estoque e Relatórios) permanece bloqueado até a liberação.
          </p>
        </div>

        {/* Details Card */}
        <div className="relative z-10 bg-[#161622] border border-[#242436] rounded-2xl p-4 text-left space-y-3">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-[#242436]">
            <span className="text-[#71717A] flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#FFC72C]" />
              Empresa
            </span>
            <span className="font-bold text-white">{tenant.name || 'Nova Empresa'}</span>
          </div>
          <div className="flex items-center justify-between text-xs pb-2 border-b border-[#242436]">
            <span className="text-[#71717A]">CNPJ</span>
            <span className="font-mono text-[#D4D4D8]">{tenant.cnpj || '38.492.011/0001-85'}</span>
          </div>
          <div className="flex items-center justify-between text-xs pb-2 border-b border-[#242436]">
            <span className="text-[#71717A]">Plano Selecionado</span>
            <span className="font-bold text-[#FFC72C]">{tenant.planName || 'Plano Pro'}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#71717A]">Status Atual</span>
            <span className="inline-flex items-center gap-1 font-bold text-[11px] px-2.5 py-0.5 rounded-full bg-[#DA291C]/20 text-[#FF4D4F] border border-[#DA291C]/30">
              🔒 Não ativado
            </span>
          </div>
        </div>

        {/* Primary and Secondary Actions */}
        <div className="relative z-10 space-y-3 pt-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleQuickActivate}
            disabled={isActivating}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#DA291C] via-[#FF3030] to-[#FFC72C] text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(218,41,28,0.4)] cursor-pointer hover:opacity-95 transition-all"
          >
            <Key className="w-4 h-4 text-white" />
            <span>{isActivating ? 'Ativando Empresa...' : 'Ativar Empresa Agora (Super Admin)'}</span>
          </motion.button>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
            <button
              onClick={handleGoToSuperAdmin}
              className="text-xs text-[#FFC72C] hover:text-[#FFE082] font-bold py-2 px-4 rounded-xl hover:bg-[#FFC72C]/10 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Crown className="w-3.5 h-3.5 text-[#FFC72C]" />
              <span>Acessar Painel Central do Super Admin</span>
            </button>

            <span className="text-[#52525B] hidden sm:inline">•</span>

            <button
              onClick={() => setCurrentView('landing')}
              className="text-xs text-[#A1A1AA] hover:text-white font-medium py-2 px-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
            >
              Página de Vendas
            </button>
          </div>
        </div>

        {/* Guarantee Info */}
        <p className="relative z-10 text-[11px] text-[#71717A] max-w-sm mx-auto">
          Após a ativação, você terá acesso ao assistente de primeiro uso para cadastrar seu cardápio, insumos e configurar o sistema.
        </p>
      </motion.div>
    </div>
  );
};
