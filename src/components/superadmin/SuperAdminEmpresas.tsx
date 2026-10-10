import React, { useState } from 'react';
import { 
  Building2, 
  Search, 
  Plus, 
  Eye, 
  CheckCircle2, 
  AlertTriangle, 
  Edit, 
  DollarSign, 
  Phone, 
  MapPin, 
  Store,
  X,
  CreditCard,
  ShieldCheck,
  FileSpreadsheet
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { TenantRecord } from '../../types';
import { formatBRL } from '../../utils/formatters';
import { playBeep, playCashRegister } from '../../utils/audio';

export const SuperAdminEmpresas: React.FC = () => {
  const { 
    currentUser,
    allTenants, 
    addTenantRecord, 
    updateTenantRecord, 
    enterSupportMode, 
    setCurrentView,
    saveAuditLogToFirestore
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'trial' | 'suspended'>('all');
  const [isNewTenantModalOpen, setIsNewTenantModalOpen] = useState(false);
  const [selectedTenantDetails, setSelectedTenantDetails] = useState<TenantRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form for New Tenant
  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    owner: '',
    email: '',
    phone: '',
    planName: 'Pro',
    monthlyRevenue: 99.90,
    branchesCount: 1,
    city: 'São Paulo - SP'
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const filteredTenants = allTenants.filter(t => {
    const matchesSearch = 
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.owner && t.owner.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.cnpj && t.cnpj.includes(searchTerm));
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    const newRecord: TenantRecord = {
      id: `tenant_${Date.now()}`,
      name: formData.name,
      cnpj: formData.cnpj || '00.000.000/0001-00',
      owner: formData.owner || 'Responsável',
      email: formData.email || 'contato@restaurante.com',
      phone: formData.phone || '(11) 99999-9999',
      planName: formData.planName,
      status: 'active',
      branchesCount: Number(formData.branchesCount) || 1,
      monthlyRevenue: Number(formData.monthlyRevenue) || 99.90,
      trialDaysLeft: 15,
      createdAt: new Date().toISOString()
    };

    await addTenantRecord(newRecord);
    await saveAuditLogToFirestore({
      action: 'EMPRESA_CADASTRADA',
      userName: currentUser.name || 'Super Admin',
      userRole: 'super_admin',
      description: `Cadastrada nova empresa ${newRecord.name} (CNPJ: ${newRecord.cnpj}) no plano ${newRecord.planName}`,
      severity: 'info'
    });

    setIsNewTenantModalOpen(false);
    setFormData({
      name: '',
      cnpj: '',
      owner: '',
      email: '',
      phone: '',
      planName: 'Pro',
      monthlyRevenue: 99.90,
      branchesCount: 1,
      city: 'São Paulo - SP'
    });
    playCashRegister();
    showToast(`Empresa ${newRecord.name} adicionada com sucesso!`);
  };

  const handleToggleStatus = async (tenant: TenantRecord) => {
    const nextStatus = tenant.status === 'active' ? 'suspended' : 'active';
    await updateTenantRecord(tenant.id, { status: nextStatus });
    await saveAuditLogToFirestore({
      action: nextStatus === 'suspended' ? 'EMPRESA_SUSPENSA' : 'EMPRESA_REATIVADA',
      userName: currentUser.name || 'Super Admin',
      userRole: 'super_admin',
      description: `${nextStatus === 'suspended' ? 'Suspensa' : 'Reativada'} licença da empresa ${tenant.name}`,
      severity: nextStatus === 'suspended' ? 'critical' : 'info'
    });
    playBeep(450, 0.08);
    showToast(`Empresa ${tenant.name} agora está ${nextStatus === 'active' ? 'Ativa' : 'Suspensa'}!`);
  };

  const handleGhostLogin = (tenant: TenantRecord) => {
    playCashRegister();
    enterSupportMode(currentUser.name || 'Super Admin', tenant.name);
    setCurrentView('overview_bi');
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="p-3 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-2xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#12121A] border border-[#242438] p-5 rounded-3xl">
        <div>
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#FF6B00]" />
            <span>Empresas & Restaurantes Cadastrados</span>
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Total de {allTenants.length} empresas ativas e em período de teste na plataforma.
          </p>
        </div>

        <button
          onClick={() => setIsNewTenantModalOpen(true)}
          className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#FF6B00] to-[#DA291C] hover:brightness-110 text-white font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Empresa</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por restaurante, responsável ou CNPJ..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-[#12121A] border border-[#242438] rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-[#FF6B00] focus:outline-none"
          />
        </div>

        <div className="flex gap-2">
          {(['all', 'active', 'trial', 'suspended'] as const).map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === status
                  ? 'bg-[#FF6B00] text-black shadow-md'
                  : 'bg-[#12121A] text-zinc-400 border border-[#242438] hover:text-white'
              }`}
            >
              {status === 'all' && 'Todas'}
              {status === 'active' && 'Ativas'}
              {status === 'trial' && 'Em Teste'}
              {status === 'suspended' && 'Suspensas'}
            </button>
          ))}
        </div>
      </div>

      {/* Tenants Table */}
      <div className="bg-[#12121A] border border-[#242438] rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-[#20202E] text-[11px] font-extrabold uppercase text-zinc-400 bg-[#0E0E16]">
                <th className="py-3.5 px-4">Restaurante / CNPJ</th>
                <th className="py-3.5 px-4">Responsável</th>
                <th className="py-3.5 px-4">Plano Contratado</th>
                <th className="py-3.5 px-4">Filiais</th>
                <th className="py-3.5 px-4">Mensalidade</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Ação Super Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1C1C28] text-xs">
              {filteredTenants.map(t => (
                <tr key={t.id} className="hover:bg-[#161622] transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-extrabold text-white">{t.name}</div>
                    <div className="text-[10px] text-zinc-400 font-mono mt-0.5">{t.cnpj}</div>
                  </td>

                  <td className="py-3.5 px-4 text-zinc-300">
                    <div>{t.owner}</div>
                    <div className="text-[10px] text-zinc-500">{t.phone}</div>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="font-bold text-[#FFC72C] bg-[#FFC72C]/10 border border-[#FFC72C]/30 px-2.5 py-0.5 rounded-full">
                      {t.planName}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 font-mono font-bold text-white">
                    {t.branchesCount || 1} un
                  </td>

                  <td className="py-3.5 px-4 font-mono font-black text-[#00D26A]">
                    {formatBRL(t.monthlyRevenue || 99.90)}
                  </td>

                  <td className="py-3.5 px-4">
                    {t.status === 'active' ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        ✓ Ativo Pago
                      </span>
                    ) : t.status === 'suspended' ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                        ✕ Suspenso
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        ⏳ Teste ({t.trialDaysLeft || 15}d)
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleGhostLogin(t)}
                        title="Acessar conta do restaurante em modo suporte com auditoria"
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#DA291C] hover:brightness-110 text-white text-[11px] font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#FFC72C]" />
                        <span>Acessar Loja</span>
                      </button>

                      <button
                        onClick={() => handleToggleStatus(t)}
                        className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                          t.status === 'active'
                            ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
                            : 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                        }`}
                        title={t.status === 'active' ? 'Suspender empresa' : 'Ativar empresa'}
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Nova Empresa */}
      {isNewTenantModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#12121E] border border-[#2D2D42] rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Store className="w-4 h-4 text-[#FF6B00]" />
                <span>Cadastrar Nova Empresa / Restaurante</span>
              </h3>
              <button onClick={() => setIsNewTenantModalOpen(false)} className="text-zinc-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTenant} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-bold uppercase text-[10px] mb-1">Nome Fantasia</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Pizzaria Forno & Sabor"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-[#181826] border border-[#2B2B3C] rounded-xl px-3 py-2 text-white focus:border-[#FF6B00] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-bold uppercase text-[10px] mb-1">CNPJ</label>
                  <input
                    type="text"
                    placeholder="12.345.678/0001-90"
                    value={formData.cnpj}
                    onChange={e => setFormData({ ...formData, cnpj: e.target.value })}
                    className="w-full bg-[#181826] border border-[#2B2B3C] rounded-xl px-3 py-2 text-white font-mono focus:border-[#FF6B00] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-bold uppercase text-[10px] mb-1">Responsável</label>
                  <input
                    type="text"
                    placeholder="Nome do Proprietário"
                    value={formData.owner}
                    onChange={e => setFormData({ ...formData, owner: e.target.value })}
                    className="w-full bg-[#181826] border border-[#2B2B3C] rounded-xl px-3 py-2 text-white focus:border-[#FF6B00] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-bold uppercase text-[10px] mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="(11) 98765-4321"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-[#181826] border border-[#2B2B3C] rounded-xl px-3 py-2 text-white focus:border-[#FF6B00] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-zinc-400 font-bold uppercase text-[10px] mb-1">Plano Inicial</label>
                  <select
                    value={formData.planName}
                    onChange={e => setFormData({ ...formData, planName: e.target.value })}
                    className="w-full bg-[#181826] border border-[#2B2B3C] rounded-xl px-3 py-2 text-white focus:border-[#FF6B00] focus:outline-none"
                  >
                    <option value="Start">Start (R$ 39,90)</option>
                    <option value="Pro">Pro (R$ 59,90)</option>
                    <option value="Business">Business (R$ 79,90)</option>
                    <option value="Premium">Premium (R$ 99,90)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 font-bold uppercase text-[10px] mb-1">Mensalidade (R$)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.monthlyRevenue}
                    onChange={e => setFormData({ ...formData, monthlyRevenue: Number(e.target.value) })}
                    className="w-full bg-[#181826] border border-[#2B2B3C] rounded-xl px-3 py-2 text-white font-mono focus:border-[#FF6B00] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-bold uppercase text-[10px] mb-1">Qtd Filiais</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.branchesCount}
                    onChange={e => setFormData({ ...formData, branchesCount: Number(e.target.value) })}
                    className="w-full bg-[#181826] border border-[#2B2B3C] rounded-xl px-3 py-2 text-white font-mono focus:border-[#FF6B00] focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewTenantModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#DA291C] text-white font-bold"
                >
                  Salvar e Ativar Empresa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
