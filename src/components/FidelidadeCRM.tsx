import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Gift, 
  Users, 
  MessageSquare, 
  Percent, 
  Sparkles, 
  Search, 
  Send, 
  CheckCircle2, 
  Clock, 
  TrendingUp,
  DollarSign,
  UserPlus,
  X,
  Phone,
  Coins,
  MapPin,
  FileText,
  Star,
  ExternalLink
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '../context/AppContext';
import { Customer } from '../types';
import { formatBRL, formatDateTime } from '../utils/formatters';
import { playBeep, playCashRegister, playSoftClickSound } from '../utils/audio';

export const FidelidadeCRM: React.FC = () => {
  const { 
    customers = [], 
    addCustomer, 
    updateCustomer, 
    addCashback, 
    setIsAICopilotOpen,
    tenant
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSegment, setSelectedSegment] = useState<'all' | 'vip' | 'frequent' | 'inactive' | 'new'>('all');
  const [broadcastMessage, setBroadcastMessage] = useState(() => 
    `🔥 Sentimos sua falta na ${tenant?.name || 'Lanchonete Dulci'}! Ganhe R$ 10 OFF no seu próximo pedido usando o cupom VOLTOU10.`
  );
  const [sentSuccess, setSentSuccess] = useState(false);

  // Modal Cadastrar Cliente
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCpf, setNewCpf] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newInitialCashback, setNewInitialCashback] = useState(5.00);

  // Modal Ajuste de Cashback
  const [selectedCustomerForCashback, setSelectedCustomerForCashback] = useState<Customer | null>(null);
  const [cashbackCreditAmount, setCashbackCreditAmount] = useState<number>(10.00);

  const filteredCustomers = useMemo(() => {
    return (customers || []).filter(c => {
      const matchSegment = selectedSegment === 'all' || c.segment === selectedSegment;
      const term = searchTerm.toLowerCase();
      const matchSearch = 
        c.name.toLowerCase().includes(term) || 
        c.phone.includes(term) ||
        (c.email && c.email.toLowerCase().includes(term));
      return matchSegment && matchSearch;
    });
  }, [customers, selectedSegment, searchTerm]);

  // Calculations
  const totalCashbackPool = useMemo(() => {
    return (customers || []).reduce((acc, curr) => acc + (curr.cashbackBalance || 0), 0);
  }, [customers]);

  const inactiveCount = useMemo(() => {
    return (customers || []).filter(c => c.segment === 'inactive').length;
  }, [customers]);

  const handleSendCampaign = () => {
    setSentSuccess(true);
    playCashRegister();
    confetti({
      particleCount: 40,
      spread: 50,
      origin: { y: 0.5 }
    });
    setTimeout(() => setSentSuccess(false), 4000);
  };

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) return;

    addCustomer({
      name: newName.trim(),
      phone: newPhone.trim(),
      email: newEmail.trim() || undefined,
      cpf: newCpf.trim() || undefined,
      address: newAddress.trim() || undefined,
      notes: newNotes.trim() || undefined,
      cashbackBalance: Number(newInitialCashback) || 0,
      segment: 'new',
      totalOrders: 1,
      totalSpent: 45.00,
      tier: 'bronze'
    });

    playCashRegister();
    setIsNewCustomerModalOpen(false);
    // Reset
    setNewName('');
    setNewPhone('');
    setNewEmail('');
    setNewCpf('');
    setNewAddress('');
    setNewNotes('');
    setNewInitialCashback(5.00);
  };

  const handleApplyCashbackCredit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerForCashback) return;

    addCashback(selectedCustomerForCashback.id, Number(cashbackCreditAmount) || 0);
    playCashRegister();
    setSelectedCustomerForCashback(null);
  };

  return (
    <div className="space-y-6 pb-20 select-none">
      {/* Header */}
      <div className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-r from-[#141218] via-[#181522] to-[#12121A] border border-[#28283C] shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#FFC72C] px-3 py-1 rounded-full bg-[#FFC72C]/15 border border-[#FFC72C]/30">
              CRM & Cashback Neon
            </span>
            <span className="text-xs text-[#71717A]">•</span>
            <span className="text-xs font-bold text-[#A1A1AA]">Retenção e Fidelização Ativa</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-display text-white tracking-tight pt-1">
            Clientes, Fidelidade & Campanhas WhatsApp
          </h1>
          <p className="text-xs sm:text-sm text-[#A1A1AA] max-w-2xl leading-relaxed">
            Programa de cashback inteligente estilo McDonald's App, segmentação de clientes e disparos diretos no WhatsApp sem taxas.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 w-full md:w-auto flex-wrap">
          <button
            onClick={() => {
              setIsNewCustomerModalOpen(true);
              playBeep(880, 0.05);
            }}
            className="flex-1 md:flex-none bg-gradient-to-r from-[#00E676] to-[#00C853] hover:from-[#00C853] hover:to-[#00B248] text-black font-black px-5 py-3 rounded-2xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(0,230,118,0.3)] active:scale-95"
          >
            <UserPlus className="w-4.5 h-4.5" />
            <span>Cadastrar Cliente</span>
          </button>

          <button
            onClick={() => {
              setIsAICopilotOpen(true);
              playBeep(900, 0.05);
            }}
            className="flex-1 md:flex-none bg-[#181826] hover:bg-[#202032] text-[#FFC72C] hover:text-white border border-[#FFC72C]/40 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_14px_rgba(255,199,44,0.15)] active:scale-95"
          >
            <Sparkles className="w-4.5 h-4.5 text-[#FFC72C]" />
            <span>Campanha com IA</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <motion.div 
          layout
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          whileHover={{ scale: 1.02, y: -2 }}
          transition={{ layout: { type: 'spring', stiffness: 350, damping: 30 }, type: 'spring', stiffness: 400, damping: 22 }}
          className="bg-[#12121A] border border-[#242438] hover:border-[#00E676]/50 p-6 rounded-3xl transition-all shadow-xl"
        >
          <div className="text-xs text-[#A1A1AA] uppercase font-bold tracking-wider">Clientes Ativos na Base</div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-white mt-3">{(customers || []).length} Clientes</div>
          <div className="text-xs text-[#00E676] font-semibold mt-2">+12 cadastrados hoje no PDV e QR Code</div>
        </motion.div>

        <motion.div 
          layout
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          whileHover={{ scale: 1.02, y: -2 }}
          transition={{ layout: { type: 'spring', stiffness: 350, damping: 30 }, type: 'spring', stiffness: 400, damping: 22, delay: 0.05 }}
          className="bg-[#12121A] border border-[#242438] hover:border-[#FFC72C]/50 p-6 rounded-3xl transition-all shadow-xl"
        >
          <div className="text-xs text-[#A1A1AA] uppercase font-bold tracking-wider">Saldo Total em Cashback</div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-[#FFC72C] mt-3 drop-shadow-[0_0_10px_rgba(255,199,44,0.25)]">
            {formatBRL(totalCashbackPool)}
          </div>
          <div className="text-xs text-[#A1A1AA] font-semibold mt-2">Gera recompra recorrente de 3.2x</div>
        </motion.div>

        <motion.div 
          layout
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          whileHover={{ scale: 1.02, y: -2 }}
          transition={{ layout: { type: 'spring', stiffness: 350, damping: 30 }, type: 'spring', stiffness: 400, damping: 22, delay: 0.1 }}
          className="bg-[#12121A] border border-[#242438] hover:border-[#DA291C]/60 p-6 rounded-3xl transition-all shadow-xl"
        >
          <div className="text-xs text-[#A1A1AA] uppercase font-bold tracking-wider">Inativos para Reativar</div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-[#DA291C] mt-3 drop-shadow-[0_0_10px_rgba(218,41,28,0.25)]">
            {inactiveCount} Clientes
          </div>
          <div className="text-xs text-[#00E676] font-semibold mt-2">Prontos para envio de cupom no WhatsApp</div>
        </motion.div>
      </div>

      {/* WhatsApp Disparo em Massa */}
      <div className="bg-gradient-to-br from-[#161624] to-[#111117] border border-[#00E676]/40 p-6 rounded-3xl space-y-4 shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#00E676]" />
            <span>Disparo Automatizado no WhatsApp Anota com Cupom</span>
          </h3>
          <span className="text-xs text-[#00E676] font-bold px-2.5 py-1 rounded-full bg-[#00E676]/10 border border-[#00E676]/30 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#00E676] animate-pulse" />
            WhatsApp Oficial Conectado
          </span>
        </div>

        <div className="space-y-3">
          <textarea
            value={broadcastMessage}
            onChange={e => setBroadcastMessage(e.target.value)}
            rows={3}
            className="w-full bg-[#0A0A0E] border border-[#262638] rounded-2xl p-4 text-xs text-white placeholder-[#52525B] focus:border-[#00E676] focus:outline-none leading-relaxed"
          />

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="text-xs text-[#A1A1AA]">
              Público Alvo: <strong className="text-white">{inactiveCount} Clientes Inativos</strong> (Estimativa de retorno: +R$ 3.800 em vendas)
            </div>

            <button
              onClick={handleSendCampaign}
              className="bg-gradient-to-r from-[#00E676] to-[#00C853] hover:from-[#00C853] hover:to-[#00B248] text-black font-black text-xs px-6 py-3 rounded-2xl shadow-[0_0_15px_rgba(0,230,118,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>DISPARAR CAMPANHA AGORA</span>
            </button>
          </div>

          <AnimatePresence>
            {sentSuccess && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 bg-[#00E676]/20 border border-[#00E676] rounded-2xl text-xs text-[#00E676] font-bold flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Campanha disparada com sucesso para os clientes com taxa de entrega instantânea!</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Customer List */}
      <div className="bg-[#12121A] border border-[#242438] p-6 rounded-3xl space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#71717A] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nome, WhatsApp ou e-mail..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-[#181822] border border-[#282838] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-[#52525B] focus:border-[#FFC72C] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'all', label: 'Todos os Clientes' },
              { id: 'vip', label: '⭐ VIPs' },
              { id: 'frequent', label: '🔁 Frequentes' },
              { id: 'new', label: '✨ Novos' },
              { id: 'inactive', label: '💤 Inativos' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => {
                  setSelectedSegment(f.id as any);
                  playSoftClickSound();
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedSegment === f.id
                    ? 'bg-[#FFC72C] text-black font-extrabold shadow-sm'
                    : 'bg-[#181822] text-[#A1A1AA] hover:text-white border border-[#242433]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[720px]">
            <thead>
              <tr className="border-b border-[#20202E] text-[11px] font-extrabold uppercase text-[#71717A]">
                <th className="py-3 px-3">Cliente</th>
                <th className="py-3 px-3">WhatsApp</th>
                <th className="py-3 px-3">Total de Pedidos</th>
                <th className="py-3 px-3">Gasto Total</th>
                <th className="py-3 px-3">Saldo de Cashback</th>
                <th className="py-3 px-3">Segmento</th>
                <th className="py-3 px-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1C1C28] text-xs">
              {filteredCustomers.map(cust => {
                const cleanPhone = cust.phone.replace(/\D/g, '');
                return (
                  <tr key={cust.id} className="hover:bg-[#161622] transition-colors">
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span>{cust.name}</span>
                        {cust.tier === 'black' && <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#000] border border-[#FFC72C] text-[#FFC72C] font-mono">BLACK</span>}
                        {cust.tier === 'ouro' && <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#FFC72C]/20 text-[#FFC72C] font-mono">OURO</span>}
                      </div>
                      {cust.notes && <div className="text-[11px] text-[#71717A] truncate max-w-xs">{cust.notes}</div>}
                    </td>
                    <td className="py-3.5 px-3 font-mono text-[#A1A1AA]">{cust.phone}</td>
                    <td className="py-3.5 px-3 font-mono font-bold text-white">{cust.totalOrders} pedidos</td>
                    <td className="py-3.5 px-3 font-mono font-bold text-[#00D26A]">{formatBRL(cust.totalSpent)}</td>
                    <td className="py-3.5 px-3 font-mono font-bold text-[#FFC72C]">{formatBRL(cust.cashbackBalance || 0)}</td>
                    <td className="py-3.5 px-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        cust.segment === 'vip' ? 'bg-[#FFE600]/20 text-[#FFE600]' :
                        cust.segment === 'frequent' ? 'bg-[#00D26A]/20 text-[#00D26A]' :
                        cust.segment === 'new' ? 'bg-[#38C9FF]/20 text-[#38C9FF]' :
                        'bg-[#FF2B4E]/20 text-[#FF2B4E]'
                      }`}>
                        {cust.segment === 'vip' ? '⭐ VIP' : cust.segment === 'frequent' ? '🔁 Frequente' : cust.segment === 'new' ? '✨ Novo' : '💤 Inativo'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedCustomerForCashback(cust);
                            playSoftClickSound();
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#FFC72C]/10 hover:bg-[#FFC72C]/25 text-[#FFC72C] border border-[#FFC72C]/30 text-[11px] font-bold transition-all cursor-pointer"
                          title="Adicionar Cashback"
                        >
                          + Cashback
                        </button>

                        <a
                          href={`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(`Olá ${cust.name}, tudo bem? Passando para te dar um vale desconto na ${tenant?.name || 'Lanchonete Dulci'}!`)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg bg-[#25D366]/10 hover:bg-[#25D366]/25 text-[#25D366] border border-[#25D366]/30 transition-all cursor-pointer"
                          title="Chamar no WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Novo Cliente */}
      <AnimatePresence>
        {isNewCustomerModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#14141E] border border-[#28283C] rounded-3xl p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#222232]">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#00E676]/20 text-[#00E676]">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">Cadastrar Novo Cliente</h3>
                    <p className="text-xs text-[#A1A1AA]">Adicione ao programa de fidelidade e cashback</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsNewCustomerModalOpen(false)}
                  className="p-1.5 rounded-xl bg-[#1C1C28] text-[#A1A1AA] hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateCustomer} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[#A1A1AA] mb-1">Nome Completo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Gabriel Pires"
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      className="w-full bg-[#181824] border border-[#282838] rounded-xl px-3 py-2.5 text-white focus:border-[#00E676] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[#A1A1AA] mb-1">WhatsApp / Telefone *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: (11) 98765-4321"
                      value={newPhone}
                      onChange={e => setNewPhone(e.target.value)}
                      className="w-full bg-[#181824] border border-[#282838] rounded-xl px-3 py-2.5 text-white focus:border-[#00E676] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[#A1A1AA] mb-1">E-mail</label>
                    <input
                      type="email"
                      placeholder="cliente@email.com"
                      value={newEmail}
                      onChange={e => setNewEmail(e.target.value)}
                      className="w-full bg-[#181824] border border-[#282838] rounded-xl px-3 py-2.5 text-white focus:border-[#00E676] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[#A1A1AA] mb-1">CPF (NFC-e)</label>
                    <input
                      type="text"
                      placeholder="000.000.000-00"
                      value={newCpf}
                      onChange={e => setNewCpf(e.target.value)}
                      className="w-full bg-[#181824] border border-[#282838] rounded-xl px-3 py-2.5 text-white focus:border-[#00E676] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-[#A1A1AA] mb-1">Endereço de Entrega</label>
                  <input
                    type="text"
                    placeholder="Rua, Número, Bairro, Cidade"
                    value={newAddress}
                    onChange={e => setNewAddress(e.target.value)}
                    className="w-full bg-[#181824] border border-[#282838] rounded-xl px-3 py-2.5 text-white focus:border-[#00E676] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-[#A1A1AA] mb-1">Bônus de Boas-Vindas (Cashback em R$)</label>
                  <input
                    type="number"
                    step="0.50"
                    value={newInitialCashback}
                    onChange={e => setNewInitialCashback(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#181824] border border-[#282838] rounded-xl px-3 py-2.5 text-white font-mono font-bold text-[#FFC72C] focus:border-[#FFC72C] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-[#A1A1AA] mb-1">Preferências & Observações</label>
                  <input
                    type="text"
                    placeholder="Ex: Prefere ponto da carne bem passado, alérgico a camarão"
                    value={newNotes}
                    onChange={e => setNewNotes(e.target.value)}
                    className="w-full bg-[#181824] border border-[#282838] rounded-xl px-3 py-2.5 text-white focus:border-[#00E676] focus:outline-none"
                  />
                </div>

                <div className="pt-3 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsNewCustomerModalOpen(false)}
                    className="flex-1 py-3 rounded-xl bg-[#1C1C28] text-white font-bold cursor-pointer hover:bg-[#252536]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#00E676] to-[#00C853] text-black font-black cursor-pointer hover:brightness-110 shadow-lg"
                  >
                    Salvar Cliente
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Adicionar Cashback */}
      <AnimatePresence>
        {selectedCustomerForCashback && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#14141E] border border-[#28283C] rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#222232]">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#FFC72C]/20 text-[#FFC72C]">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Creditar Cashback</h3>
                    <p className="text-xs text-[#A1A1AA]">{selectedCustomerForCashback.name}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedCustomerForCashback(null)}
                  className="p-1.5 rounded-xl bg-[#1C1C28] text-[#A1A1AA] hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 bg-[#181824] rounded-2xl flex items-center justify-between text-xs">
                <span className="text-[#A1A1AA]">Saldo Atual:</span>
                <span className="font-mono font-black text-[#FFC72C] text-sm">
                  {formatBRL(selectedCustomerForCashback.cashbackBalance || 0)}
                </span>
              </div>

              <form onSubmit={handleApplyCashbackCredit} className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-[#A1A1AA] mb-1">Valor a Creditar (R$)</label>
                  <input
                    type="number"
                    step="1.00"
                    min="1"
                    required
                    value={cashbackCreditAmount}
                    onChange={e => setCashbackCreditAmount(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#181824] border border-[#282838] rounded-xl px-4 py-3 text-white font-mono font-black text-lg text-[#00E676] focus:border-[#00E676] focus:outline-none"
                  />
                </div>

                <div className="flex gap-2">
                  {[5, 10, 20, 50].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setCashbackCreditAmount(val)}
                      className="flex-1 py-1.5 rounded-lg bg-[#181826] border border-[#2E2E40] text-xs font-bold text-[#FFC72C] hover:bg-[#202034] cursor-pointer"
                    >
                      +R$ {val}
                    </button>
                  ))}
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedCustomerForCashback(null)}
                    className="flex-1 py-3 rounded-xl bg-[#1C1C28] text-white font-bold text-xs cursor-pointer hover:bg-[#252536]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#FFC72C] to-[#F59E0B] text-black font-black text-xs cursor-pointer hover:brightness-110 shadow-lg"
                  >
                    Creditar Saldo
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
