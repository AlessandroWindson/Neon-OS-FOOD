import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Flame, 
  Sparkles, 
  Star, 
  Award, 
  CheckCircle2, 
  TrendingUp, 
  Gift, 
  Users,
  DollarSign,
  UserPlus,
  ArrowRight,
  Shield,
  Zap
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '../context/AppContext';
import { formatBRL } from '../utils/formatters';
import { playLevelUp, playCashRegister, playBeep } from '../utils/audio';

export const GamificacaoEquipe: React.FC = () => {
  const { employees, teamMembers, setCurrentView } = useApp();

  const membersList = (employees && employees.length > 0 ? employees : teamMembers) || [];
  const sortedMembers = [...membersList].sort((a, b) => (b.xpPoints || 0) - (a.xpPoints || 0));

  const [missions, setMissions] = useState([
    { id: 1, title: 'Missão Sobremesa Quente', desc: 'Vender 12 Shakes de Pistache hoje no salão', progress: 8, target: 12, completed: false, rewardXp: 250, rewardBrl: 30 },
    { id: 2, title: 'Velocidade Chapa & KDS', desc: 'Manter 90% dos pedidos de smash burger prontos abaixo de 8 minutos', progress: 94, target: 100, isPercent: true, completed: false, rewardXp: 300, rewardBrl: 50 },
    { id: 3, title: 'Super Upsell Batata & Bacon', desc: 'Adicionar Bacon Extra e Queijo Cheddar em 15 pedidos', progress: 15, target: 15, completed: true, rewardXp: 200, rewardBrl: 25 },
  ]);

  const handleCompleteMission = (id: number) => {
    setMissions(prev => prev.map(m => {
      if (m.id === id) {
        if (!m.completed) {
          playLevelUp();
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.6 }
          });
          return { ...m, completed: true, progress: m.target };
        }
      }
      return m;
    }));
  };

  return (
    <div className="space-y-6 pb-20 select-none">
      {/* Header */}
      <motion.div 
        layout
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-r from-[#141218] via-[#181522] to-[#12121A] border border-[#28283C] shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
      >
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#FFC72C] px-3 py-1 rounded-full bg-[#FFC72C]/15 border border-[#FFC72C]/30">
              Arena Neon da Equipe
            </span>
            <span className="text-xs text-[#71717A]">•</span>
            <span className="text-xs font-bold text-[#EAB308]">Gamificação & Metas de Venda</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-display text-white tracking-tight pt-1">
            Ranking, Missões Diárias & Gorjetas
          </h1>
          <p className="text-xs sm:text-sm text-[#A1A1AA] max-w-2xl leading-relaxed">
            Motive atendentes de mesa, chapeiros, auxiliares de cozinha e cozinheiros com metas meritocráticas em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <button
            onClick={() => {
              setCurrentView('gestao_equipe');
              playBeep(880, 0.05);
            }}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#FFC72C] to-[#F59E0B] text-black font-black text-xs hover:brightness-110 shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>Cadastrar Funcionários</span>
          </button>

          <motion.div 
            whileHover={{ scale: 1.03 }}
            className="flex items-center gap-3 bg-[#181826] px-5 py-2.5 rounded-2xl border border-[#2E2E40] shadow-md shrink-0"
          >
            <Trophy className="w-5 h-5 text-[#FFC72C] drop-shadow-[0_0_8px_rgba(255,199,44,0.3)]" />
            <div>
              <div className="text-[9px] text-[#A1A1AA] uppercase font-bold tracking-wider">Pote de Premiação do Mês</div>
              <div className="text-sm font-black font-mono text-[#00E676]">{formatBRL(1200.00)}</div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Daily Missions Grid */}
      <motion.div 
        layout
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ layout: { type: 'spring', stiffness: 350, damping: 30 }, duration: 0.25 }}
        className="bg-[#12121A] border border-[#242438] p-6 rounded-3xl space-y-5 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Flame className="w-5 h-5 text-[#FF6B00]" />
            <span>Missões do Dia • Turno Almoço & Jantar</span>
          </h3>
          <span className="text-xs text-[#A1A1AA] font-semibold">Atualização automática via PDV & KDS</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {missions.map((m, idx) => (
              <motion.div
                key={m.id}
                layout
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{ scale: 1.02, y: -2 }}
                transition={{ 
                  layout: { type: 'spring', stiffness: 350, damping: 30 },
                  type: 'spring', 
                  stiffness: 400, 
                  damping: 22,
                  delay: idx * 0.05 
                }}
                onClick={() => handleCompleteMission(m.id)}
                className={`p-6 rounded-3xl border flex flex-col justify-between transition-all shadow-md cursor-pointer ${
                  m.completed
                    ? 'bg-[#00E676]/10 border-[#00E676]/50'
                    : 'bg-[#161624] border-[#242438] hover:border-[#FFC72C]/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-extrabold text-sm text-white truncate">{m.title}</h4>
                    {m.completed ? (
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#00E676] text-black font-black flex items-center gap-1 shrink-0">
                        <CheckCircle2 className="w-3 h-3" /> Batida!
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FFC72C]/20 text-[#FFC72C] font-bold border border-[#FFC72C]/30">
                        Em progresso
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#A1A1AA] mt-1.5 leading-relaxed">{m.desc}</p>
                </div>

                <div className="mt-5 space-y-2.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-[#A1A1AA]">Progresso:</span>
                    <span className="text-white font-mono">
                      {m.progress}/{m.target} {m.isPercent ? '%' : 'un'}
                    </span>
                  </div>
                  <div className="w-full bg-[#20202E] h-2.5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#A855F7] via-[#DA291C] to-[#FFC72C] rounded-full transition-all"
                      style={{ width: `${Math.min(100, (m.progress / m.target) * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs font-bold text-[#FFC72C] pt-1">
                    <span>+{m.rewardXp} XP</span>
                    <span className="text-[#00E676] font-mono">+{formatBRL(m.rewardBrl)} bônus</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Leaderboard Table */}
      <motion.div 
        layout
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ layout: { type: 'spring', stiffness: 350, damping: 30 }, duration: 0.25, delay: 0.1 }}
        className="bg-[#12121A] border border-[#242438] p-6 rounded-3xl space-y-5 shadow-xl"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#FFC72C]" />
            <span>Ranking & Desempenho dos Colaboradores ({sortedMembers.length})</span>
          </h3>

          <button
            onClick={() => setCurrentView('gestao_equipe')}
            className="text-xs text-[#FFC72C] hover:text-[#FFE066] font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <span>Ver detalhes de cargos e salários</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {sortedMembers.map((member, index) => (
              <motion.div
                key={member.id}
                layout
                initial={{ opacity: 0, x: -10, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{ scale: 1.01, x: 2 }}
                transition={{ 
                  layout: { type: 'spring', stiffness: 350, damping: 30 },
                  type: 'spring', 
                  stiffness: 400, 
                  damping: 22,
                  delay: index * 0.04 
                }}
                className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                  index === 0
                    ? 'bg-gradient-to-r from-[#FFC72C]/15 via-[#181826] to-[#14141E] border-[#FFC72C]/50 shadow-[0_0_15px_rgba(255,199,44,0.15)]'
                    : 'bg-[#161624] border-[#242438] hover:border-[#38384D]'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="font-black text-base w-7 text-center text-[#A1A1AA] shrink-0">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                  </div>
                  <img src={member.avatarUrl} alt="" className="w-11 h-11 rounded-full object-cover border border-white/10 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-extrabold text-sm text-white flex items-center gap-2 truncate">
                      <span className="truncate">{member.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#A855F7]/20 text-[#C4B5FD] font-bold shrink-0">
                        Nível {member.level || 1}
                      </span>
                    </div>
                    <div className="text-xs text-[#A1A1AA] truncate flex items-center gap-2">
                      <span>{member.roleTitle || member.role}</span>
                      {member.badges && member.badges.length > 0 && (
                        <span className="text-[10px] text-[#FFC72C] font-semibold hidden md:inline">
                          • {member.badges[0]}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 text-right shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#222232]">
                  <div>
                    <div className="text-[10px] text-[#A1A1AA] uppercase font-bold">Vendas Mês</div>
                    <div className="text-sm font-black text-[#00D26A]">{formatBRL(member.salesMonth || 0)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#A1A1AA] uppercase font-bold">XP Acumulado</div>
                    <div className="text-sm font-black text-[#FFE600]">{member.xpPoints || 0} XP</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#A1A1AA] uppercase font-bold">Gorjetas</div>
                    <div className="text-sm font-black text-white">{formatBRL(member.tipsMonth || 0)}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
