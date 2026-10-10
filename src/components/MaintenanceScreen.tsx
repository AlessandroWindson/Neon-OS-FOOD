import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Wrench, 
  ShieldCheck, 
  Clock, 
  Phone, 
  RefreshCw, 
  Lock, 
  AlertTriangle,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { playBeep, playCashRegister } from '../utils/audio';

export const MaintenanceScreen: React.FC = () => {
  const { maintenanceConfig, switchToSuperAdmin, setMaintenanceMode } = useApp();
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleAdminBypass = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'Man4uS') {
      playCashRegister();
      switchToSuperAdmin();
    } else {
      setError(true);
      playBeep(400, 0.1);
      setTimeout(() => setError(false), 2500);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    playBeep(700, 0.05);
    setTimeout(() => {
      setIsRefreshing(false);
      window.location.reload();
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-zinc-100 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-amber-600/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl bg-zinc-900/90 border border-zinc-800 rounded-2xl p-8 shadow-2xl relative z-10 backdrop-blur-md text-center"
      >
        {/* Brand Header */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500 shadow-lg shadow-red-600/20">
            <Wrench className="w-6 h-6 animate-pulse" />
          </div>
          <div className="text-left">
            <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
              NEON <span className="text-red-500">FOOD OS</span>
            </h2>
            <p className="text-[11px] text-zinc-400 font-mono uppercase tracking-wider">
              Plataforma SaaS de Gestão Gastronômica
            </p>
          </div>
        </div>

        {/* Status Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-medium mb-4">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Manutenção Técnica Programada</span>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-white mb-3">
          {maintenanceConfig.title || 'Sistema Temporariamente em Manutenção'}
        </h1>

        {/* Message */}
        <p className="text-zinc-300 text-sm leading-relaxed mb-6">
          {maintenanceConfig.message || 'Estamos realizando atualizações técnicas e melhorias em nossa infraestrutura em nuvem para garantir a máxima estabilidade, velocidade e segurança para seu restaurante.'}
        </p>

        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 text-left">
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3.5 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-zinc-800/80 text-zinc-300">
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-[10px] text-zinc-400 uppercase font-semibold">Previsão</p>
              <p className="text-xs font-medium text-zinc-200">{maintenanceConfig.estimatedReturn || 'Normalização em breve'}</p>
            </div>
          </div>

          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3.5 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-zinc-800/80 text-zinc-300">
              <Phone className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] text-zinc-400 uppercase font-semibold">Plantão Emergencial</p>
              <p className="text-xs font-medium text-emerald-400">{maintenanceConfig.contactWhatsApp || '(11) 99999-0001'}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 border-t border-zinc-800/60">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Verificando...' : 'Verificar Disponibilidade'}
          </button>

          <button
            onClick={() => setShowAdminLogin(!showAdminLogin)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-medium transition-all flex items-center justify-center gap-2"
          >
            <Lock className="w-3.5 h-3.5 text-zinc-400" />
            Acesso Super Admin
          </button>
        </div>

        {/* Super Admin Login Drawer */}
        {showAdminLogin && (
          <motion.form 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            onSubmit={handleAdminBypass}
            className="mt-6 pt-5 border-t border-zinc-800/80 text-left"
          >
            <p className="text-xs text-zinc-400 mb-2 font-medium flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-red-500" />
              Autenticação Mestre da Plataforma:
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha mestra (Man4uS)"
                className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
                autoFocus
              />
              <button
                type="submit"
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-md shadow-red-600/30"
              >
                <span>Acessar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            {error && (
              <p className="text-[11px] text-red-400 mt-2 font-medium">
                Senha incorreta. Acesso restrito ao proprietário da plataforma.
              </p>
            )}
          </motion.form>
        )}
      </motion.div>

      {/* Footer copyright */}
      <div className="mt-8 text-center text-zinc-500 text-[11px]">
        NEON FOOD OS • Central de Operações Cloud • Plataforma SaaS
      </div>
    </div>
  );
};
