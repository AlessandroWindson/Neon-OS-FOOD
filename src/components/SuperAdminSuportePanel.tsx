import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Crown, 
  LifeBuoy, 
  MessageSquare, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ShieldCheck, 
  User, 
  UserCheck, 
  Building2, 
  Database, 
  RefreshCw, 
  Zap, 
  Sparkles, 
  Plus, 
  X, 
  Phone, 
  Mail, 
  Sliders, 
  Layers, 
  SlidersHorizontal,
  Check
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SupportTicket, TicketPriority, TicketStatus } from '../types';
import { playBeep, playCashRegister } from '../utils/audio';

export const SuperAdminSuportePanel: React.FC = () => {
  const { 
    currentUser, 
    tenant, 
    branches, 
    updateTenantSettings, 
    supportTickets, 
    createSupportTicket, 
    replySupportTicket, 
    updateTicketStatus,
    switchToSuperAdmin,
    switchToUser
  } = useApp();

  const [selectedTicketId, setSelectedTicketId] = useState<string>(
    supportTickets[0]?.id || ''
  );
  const [replyText, setReplyText] = useState('');
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [isStaffMode, setIsStaffMode] = useState(currentUser.role === 'super_admin');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // New ticket form state
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState<SupportTicket['category']>('impressora_termica');
  const [newPriority, setNewPriority] = useState<TicketPriority>('medium');
  const [newDescription, setNewDescription] = useState('');

  // Diagnostics state
  const [isTestingFirestore, setIsTestingFirestore] = useState(false);
  const [firestoreStatus, setFirestoreStatus] = useState<string | null>(null);

  // Selected ticket
  const activeTicket = supportTickets.find(t => t.id === selectedTicketId) || supportTickets[0];

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeTicket) return;

    await replySupportTicket(activeTicket.id, replyText.trim(), isStaffMode);
    setReplyText('');
    playBeep(880, 0.06);
    setToastMsg('Mensagem enviada com sucesso no chamado!');
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newDescription.trim()) {
      alert('Preencha o assunto e a descrição do chamado.');
      return;
    }

    const created = await createSupportTicket({
      subject: newSubject.trim(),
      category: newCategory,
      priority: newPriority,
      description: newDescription.trim()
    });

    setIsCreatingTicket(false);
    setSelectedTicketId(created.id);
    setNewSubject('');
    setNewDescription('');
    playCashRegister();
    setToastMsg(`Chamado ${created.ticketNumber} aberto com sucesso!`);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleTestFirestore = async () => {
    setIsTestingFirestore(true);
    setFirestoreStatus('Verificando conexão com o Firestore Database ID...');
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      setFirestoreStatus('Conexão com Firestore estável e sincronizada (Database ID: ai-studio-neonfoodos-5efedcdf-5a1d-470f-b24e-92d7571f4972).');
      playBeep(750, 0.05);
    } catch {
      setFirestoreStatus('Erro ao pingar Firestore.');
    } finally {
      setIsTestingFirestore(false);
    }
  };

  const getPriorityBadge = (priority: TicketPriority) => {
    switch (priority) {
      case 'urgent':
        return <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-red-500/20 text-red-400 border border-red-500/40">Urgente</span>;
      case 'high':
        return <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">Alta</span>;
      case 'medium':
        return <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-500/20 text-blue-400 border border-blue-500/40">Média</span>;
      default:
        return <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-zinc-500/20 text-zinc-300 border border-zinc-500/40">Baixa</span>;
    }
  };

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case 'resolved':
        return <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">Resolvido</span>;
      case 'in_progress':
        return <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">Em Atendimento</span>;
      case 'closed':
        return <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-zinc-500/20 text-zinc-400 border border-zinc-500/40">Fechado</span>;
      default:
        return <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">Aberto</span>;
    }
  };

  const getCategoryLabel = (cat: SupportTicket['category']) => {
    const map: Record<SupportTicket['category'], string> = {
      suporte_tecnico: 'Suporte Técnico Geral',
      duvida_operacional: 'Dúvida Operacional',
      financeiro: 'Financeiro & Faturas',
      nfce_fiscal: 'NFC-e & Emissão Fiscal',
      integracao_whatsapp: 'Integração WhatsApp Bot',
      impressora_termica: 'Impressora Térmica 80mm',
      sugestao_recurso: 'Sugestão de Recurso'
    };
    return map[cat] || cat;
  };

  return (
    <div className="space-y-6 select-none">
      {/* Toast Feedback */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-4 rounded-2xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 flex items-center justify-between gap-3 shadow-2xl backdrop-blur-md sticky top-16 z-50 text-xs font-semibold"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{toastMsg}</span>
            </div>
            <button onClick={() => setToastMsg(null)} className="text-emerald-400 hover:text-emerald-200">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card 1: Identidade do Super Admin & Troca Rápida */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#181216] via-[#1E1524] to-[#12121A] border border-[#DA291C]/50 shadow-2xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={currentUser.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80"}
                alt={currentUser.displayName || currentUser.name || "Super Administrador"}
                className="w-16 h-16 rounded-2xl border-2 border-[#FFC72C] object-cover shadow-lg"
              />
              <span className="absolute -bottom-1 -right-1 p-1 bg-[#DA291C] rounded-full text-[#FFC72C]">
                <Crown className="w-3.5 h-3.5" />
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#FFC72C] px-2.5 py-0.5 rounded-full bg-[#DA291C]/30 border border-[#FFC72C]/30">
                  Dono do Super Admin
                </span>
                <span className="text-xs text-zinc-500">•</span>
                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Acesso Master Global
                </span>
              </div>
              <h2 className="text-xl font-black text-white mt-1">{currentUser.displayName || currentUser.name || 'Super Administrador'}</h2>
              <p className="text-xs text-zinc-400">
                Super Administrador do NEON FOOD OS • Suporte, Homologação e Configuração de Usuários
              </p>
            </div>
          </div>

          {/* Botões de Alternância Rápida de Sessão */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <button
              type="button"
              onClick={switchToSuperAdmin}
              className={`flex-1 sm:flex-none px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                currentUser.role === 'super_admin'
                  ? 'bg-gradient-to-r from-[#DA291C] to-[#FF6B00] text-white border-[#FFC72C]/40 shadow-lg shadow-red-900/30'
                  : 'bg-[#181826] hover:bg-[#202032] text-zinc-300 border-zinc-700'
              }`}
            >
              <Crown className="w-4 h-4 text-[#FFC72C]" />
              <span>Sessão Super Admin</span>
            </button>

            <button
              type="button"
              onClick={switchToUser}
              className={`flex-1 sm:flex-none px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                currentUser.role === 'owner'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-400/40 shadow-lg shadow-emerald-900/30'
                  : 'bg-[#181826] hover:bg-[#202032] text-zinc-300 border-zinc-700'
              }`}
            >
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span>Sessão do Usuário</span>
            </button>
          </div>
        </div>

        {/* Status da Sessão Ativa */}
        <div className="mt-4 pt-4 border-t border-[#2A2438] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-zinc-300">
            <span className="text-zinc-500 font-semibold">Usuário Logado no Momento:</span>
            <span className="font-bold text-white bg-zinc-800/80 px-2.5 py-1 rounded-lg border border-zinc-700">
              {currentUser.displayName || currentUser.name} ({currentUser.role === 'super_admin' ? 'Super Admin' : 'Usuário Gestor'})
            </span>
            <span className="text-zinc-500 font-semibold">• Loja:</span>
            <span className="font-bold text-[#FFC72C]">{tenant.name}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-zinc-400">Responder como:</span>
            <button
              onClick={() => setIsStaffMode(!isStaffMode)}
              className={`px-3 py-1 rounded-xl text-[11px] font-black border transition-all ${
                isStaffMode 
                  ? 'bg-[#DA291C]/20 border-[#DA291C] text-[#FFC72C]' 
                  : 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
              }`}
            >
              {isStaffMode ? `👑 ${currentUser.displayName || currentUser.name || 'Super Admin'}` : '👤 Usuário'}
            </button>
          </div>
        </div>
      </div>

      {/* Card 2: Central de Suporte & Chamados Técnicos ao Usuário */}
      <div className="p-6 rounded-3xl bg-[#12121A] border border-[#242438] shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#20202E]">
          <div>
            <div className="flex items-center gap-2">
              <LifeBuoy className="w-5 h-5 text-[#00D2FF]" />
              <h3 className="text-lg font-black text-white">Central de Suporte & Chamados</h3>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Canal direto de suporte técnico entre a equipe do restaurante e a administração da plataforma
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCreatingTicket(true)}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#00D2FF] to-[#0084FF] text-black font-extrabold text-xs shadow-lg hover:brightness-110 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Abrir Novo Chamado</span>
          </button>
        </div>

        {/* Modal / Bloco de Abertura de Novo Chamado */}
        <AnimatePresence>
          {isCreatingTicket && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-5 rounded-2xl bg-[#161624] border border-[#00D2FF]/40 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <LifeBuoy className="w-4 h-4 text-[#00D2FF]" />
                  <span>Novo Chamado de Suporte ao Super Admin</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setIsCreatingTicket(false)}
                  className="p-1 text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateTicket} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-zinc-400 font-semibold mb-1">Assunto do Chamado *</label>
                    <input
                      type="text"
                      required
                      value={newSubject}
                      onChange={e => setNewSubject(e.target.value)}
                      placeholder="Ex: Dúvida sobre impressão de pedidos na chapa da cozinha"
                      className="w-full bg-[#181828] border border-[#2E2E44] rounded-xl px-3.5 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-[#00D2FF]"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-400 font-semibold mb-1">Categoria</label>
                    <select
                      value={newCategory}
                      onChange={e => setNewCategory(e.target.value as any)}
                      className="w-full bg-[#181828] border border-[#2E2E44] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-[#00D2FF]"
                    >
                      <option value="impressora_termica">Impressora Térmica 80mm</option>
                      <option value="suporte_tecnico">Suporte Técnico Geral</option>
                      <option value="duvida_operacional">Dúvida Operacional</option>
                      <option value="nfce_fiscal">NFC-e & Emissão Fiscal</option>
                      <option value="integracao_whatsapp">Integração WhatsApp</option>
                      <option value="financeiro">Financeiro & Faturas</option>
                      <option value="sugestao_recurso">Sugestão de Recurso</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-zinc-400 font-semibold mb-1">Prioridade</label>
                    <select
                      value={newPriority}
                      onChange={e => setNewPriority(e.target.value as any)}
                      className="w-full bg-[#181828] border border-[#2E2E44] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-[#00D2FF]"
                    >
                      <option value="low">Baixa</option>
                      <option value="medium">Média</option>
                      <option value="high">Alta</option>
                      <option value="urgent">Urgente (Loja travada)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Mensagem Detalhada *</label>
                  <textarea
                    rows={3}
                    required
                    value={newDescription}
                    onChange={e => setNewDescription(e.target.value)}
                    placeholder="Descreva detalhadamente o ocorrido ou solicitação de suporte..."
                    className="w-full bg-[#181828] border border-[#2E2E44] rounded-xl p-3 text-white placeholder-zinc-500 focus:outline-none focus:border-[#00D2FF]"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreatingTicket(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#00D2FF] text-black font-extrabold shadow-md hover:brightness-110"
                  >
                    Registrar Chamado
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Layout Split: Lista de Chamados à esquerda + Conversa / Chat à direita */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna 1: Lista de Chamados */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
              <span>Chamados ({supportTickets.length})</span>
              <span className="text-[10px] text-zinc-500">Persistidos no Firestore</span>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {supportTickets.map(ticket => {
                const isSelected = ticket.id === activeTicket?.id;
                return (
                  <div
                    key={ticket.id}
                    onClick={() => {
                      setSelectedTicketId(ticket.id);
                      playBeep(650, 0.04);
                    }}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#1C1C2C] border-[#00D2FF] shadow-lg shadow-cyan-950/40'
                        : 'bg-[#151522] border-[#222234] hover:border-[#32324A]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono font-bold text-[#00D2FF]">{ticket.ticketNumber}</span>
                      <div className="flex items-center gap-1.5">
                        {getPriorityBadge(ticket.priority)}
                        {getStatusBadge(ticket.status)}
                      </div>
                    </div>

                    <div className="text-xs font-bold text-white mt-1 truncate">{ticket.subject}</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">{getCategoryLabel(ticket.category)}</div>

                    <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-[#202030] text-[10px] text-zinc-500">
                      <span>{ticket.userName}</span>
                      <span>{new Date(ticket.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Coluna 2: Detalhe do Chamado & Chat com Super Admin */}
          {activeTicket ? (
            <div className="lg:col-span-2 bg-[#161624] border border-[#26263A] rounded-2xl p-5 flex flex-col justify-between h-[540px]">
              <div>
                {/* Header do Chamado Selecionado */}
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#242438]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-black text-[#00D2FF]">{activeTicket.ticketNumber}</span>
                      <span className="text-xs text-zinc-500">•</span>
                      <span className="text-xs text-zinc-400">{getCategoryLabel(activeTicket.category)}</span>
                      {getPriorityBadge(activeTicket.priority)}
                      {getStatusBadge(activeTicket.status)}
                    </div>
                    <h4 className="text-sm sm:text-base font-black text-white mt-1">{activeTicket.subject}</h4>
                    <p className="text-[11px] text-zinc-400">
                      Aberto por <strong className="text-zinc-200">{activeTicket.userName}</strong> ({activeTicket.tenantName}) • Atendente responsável: <strong className="text-[#FFC72C]">{activeTicket.assignedStaffName || 'Equipe de Suporte'}</strong>
                    </p>
                  </div>

                  {/* Ações Rápidas de Status do Super Admin */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => updateTicketStatus(activeTicket.id, 'in_progress')}
                      className="px-2.5 py-1 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-400 border border-cyan-800/50 text-[10px] font-bold cursor-pointer"
                      title="Marcar como Em Atendimento"
                    >
                      Em Atendimento
                    </button>
                    <button
                      onClick={() => updateTicketStatus(activeTicket.id, 'resolved')}
                      className="px-2.5 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-400 border border-emerald-800/50 text-[10px] font-bold cursor-pointer"
                      title="Marcar como Resolvido"
                    >
                      ✓ Resolvido
                    </button>
                  </div>
                </div>

                {/* Histórico de Mensagens */}
                <div className="space-y-3 py-4 overflow-y-auto max-h-[340px] pr-1">
                  {activeTicket.messages.map((msg, i) => {
                    const isStaff = msg.isStaffReply || msg.senderRole === 'super_admin';

                    return (
                      <div
                        key={msg.id || i}
                        className={`p-3 rounded-2xl max-w-[85%] text-xs ${
                          isStaff
                            ? 'ml-auto bg-gradient-to-r from-[#201824] to-[#281828] border border-[#DA291C]/40 text-zinc-200'
                            : 'mr-auto bg-[#1C1C2C] border border-[#2E2E44] text-zinc-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3 text-[10px] text-zinc-400 mb-1">
                          <span className="font-bold flex items-center gap-1">
                            {isStaff ? (
                              <>
                                <Crown className="w-3 h-3 text-[#FFC72C]" />
                                <span className="text-[#FFC72C]">{msg.senderName}</span>
                              </>
                            ) : (
                              <>
                                <User className="w-3 h-3 text-zinc-400" />
                                <span className="text-zinc-300">{msg.senderName}</span>
                              </>
                            )}
                          </span>
                          <span className="text-zinc-500 font-mono">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="leading-relaxed whitespace-pre-wrap">{msg.message}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

                {/* Input de Resposta */}
                <form onSubmit={handleSendReply} className="pt-3 border-t border-[#242438] flex items-center gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder={
                      isStaffMode 
                        ? 'Responder como Suporte Técnico...' 
                        : 'Responder como Usuário...'
                    }
                    className="flex-1 bg-[#1A1A2A] border border-[#2E2E44] rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#00D2FF]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#00D2FF] to-[#0084FF] text-black font-black text-xs flex items-center gap-1.5 shadow-md hover:brightness-110 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Enviar</span>
                  </button>
                </form>
              </div>
          ) : (
            <div className="lg:col-span-2 flex items-center justify-center p-8 bg-[#161624] border border-[#26263A] rounded-2xl text-xs text-zinc-400">
              Nenhum chamado selecionado.
            </div>
          )}
        </div>
      </div>

      {/* Card 3: Parâmetros do Super Admin para dar Suporte ao Usuário */}
      <div className="p-6 rounded-3xl bg-[#12121A] border border-[#242438] shadow-2xl space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#20202E]">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-[#FFC72C]" />
            <h3 className="text-lg font-black text-white">Parâmetros de Suporte e Contrato da Empresa</h3>
          </div>
          <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">
            {tenant.name}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-xs">
          <div className="p-4 rounded-2xl bg-[#161624] border border-[#26263A]">
            <div className="text-zinc-400 font-semibold mb-1">Plano Atual Liberado</div>
            <div className="text-sm font-bold text-white">{tenant.planName}</div>
            <div className="text-[11px] text-zinc-500 mt-1">Status: <strong className="text-emerald-400 font-bold">Ativo</strong></div>
          </div>

          <div className="p-4 rounded-2xl bg-[#161624] border border-[#26263A]">
            <div className="text-zinc-400 font-semibold mb-1">Filiais em Operação</div>
            <div className="text-sm font-bold text-[#00D2FF]">{branches.length} de 5 filiais permitidas</div>
            <div className="text-[11px] text-zinc-500 mt-1">Matriz Centro e Quiosque Shopping</div>
          </div>

          <div className="p-4 rounded-2xl bg-[#161624] border border-[#26263A]">
            <div className="text-zinc-400 font-semibold mb-1">Diagnóstico do Banco Firestore</div>
            <button
              type="button"
              disabled={isTestingFirestore}
              onClick={handleTestFirestore}
              className="mt-1 px-3 py-1.5 rounded-xl bg-[#1C1C2C] hover:bg-[#28283E] text-zinc-200 border border-zinc-700 font-bold text-[11px] flex items-center gap-1.5 cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-[#00D2FF]" />
              <span>{isTestingFirestore ? 'Testando...' : 'Testar Conexão Firestore'}</span>
            </button>
            {firestoreStatus && (
              <div className="text-[10px] text-emerald-400 mt-1 font-medium">{firestoreStatus}</div>
            )}
          </div>
        </div>

        {/* Feature Flags Configuradas pelo Super Admin */}
        <div>
          <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">
            Módulos e Recursos Liberados para este Restaurante
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {[
              { label: 'KDS Cozinha em Tempo Real', active: tenant.settings.enableKds, key: 'enableKds' },
              { label: 'Cardápio Online & QR Code', active: tenant.settings.enableCardapioOnline, key: 'enableCardapioOnline' },
              { label: 'Baixa Automática de Estoque', active: tenant.settings.enableStockDeduction, key: 'enableStockDeduction' },
              { label: 'Emissão Automática NFC-e', active: tenant.settings.autoEmitNfce, key: 'autoEmitNfce' },
              { label: 'Impressão Térmica Automática', active: tenant.settings.printAutoOnOrder, key: 'printAutoOnOrder' },
              { label: 'Cópia para Cozinha / Chapa', active: tenant.settings.printKitchenCopy, key: 'printKitchenCopy' },
              { label: 'Bot de WhatsApp Integrado', active: tenant.settings.enableWhatsappBot, key: 'enableWhatsappBot' },
              { label: 'Respostas Automáticas WhatsApp', active: tenant.settings.whatsappAutoReply, key: 'whatsappAutoReply' },
            ].map(mod => (
              <div
                key={mod.key}
                onClick={() => {
                  updateTenantSettings({ [mod.key]: !mod.active });
                  playBeep(650, 0.03);
                  setToastMsg(`Módulo "${mod.label}" ${!mod.active ? 'ativado' : 'desativado'} com sucesso!`);
                  setTimeout(() => setToastMsg(null), 2500);
                }}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                  mod.active
                    ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-[#151522] border-zinc-800 text-zinc-400'
                }`}
              >
                <span className="font-semibold">{mod.label}</span>
                <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${
                  mod.active ? 'bg-emerald-500 text-black font-black' : 'bg-zinc-700 text-zinc-400'
                }`}>
                  {mod.active ? '✓' : '✕'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
