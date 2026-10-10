import React, { useState } from 'react';
import { 
  CreditCard, 
  Receipt, 
  GitBranch, 
  CheckCircle2, 
  Edit2, 
  Plus, 
  Building2, 
  MapPin, 
  Phone, 
  DollarSign, 
  Calendar, 
  AlertTriangle,
  X,
  ShieldCheck,
  Check
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SaaSPlan } from '../../types';
import { formatBRL } from '../../utils/formatters';
import { playBeep, playCashRegister } from '../../utils/audio';

interface SuperAdminPlanosAssinaturasProps {
  viewMode: 'planos' | 'assinaturas' | 'filiais';
}

export const SuperAdminPlanosAssinaturas: React.FC<SuperAdminPlanosAssinaturasProps> = ({ viewMode }) => {
  const { 
    currentUser,
    saasPlans, 
    setSaasPlans, 
    allTenants, 
    branches, 
    addBranch,
    saveAuditLogToFirestore 
  } = useApp();

  const [editingPlan, setEditingPlan] = useState<SaaSPlan | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isAddBranchModalOpen, setIsAddBranchModalOpen] = useState(false);

  // New Branch Form
  const [branchForm, setBranchForm] = useState({
    name: '',
    address: '',
    city: 'São Paulo',
    state: 'SP',
    phone: '',
    isMain: false
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    const updated = saasPlans.map(p => p.id === editingPlan.id ? editingPlan : p);
    setSaasPlans(updated);
    
    await saveAuditLogToFirestore({
      action: 'PLANO_EDITADO',
      userName: currentUser.name || 'Super Admin',
      userRole: 'super_admin',
      description: `Atualizados valores do plano ${editingPlan.name}: R$ ${editingPlan.priceMonthly}/mês`,
      severity: 'warning'
    });

    setEditingPlan(null);
    playCashRegister();
    showToast(`Plano ${editingPlan.name} atualizado com sucesso!`);
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchForm.name) return;

    const newBranch = {
      id: `br_${Date.now()}`,
      name: branchForm.name,
      address: branchForm.address || 'Endereço Comercial',
      city: branchForm.city,
      state: branchForm.state,
      phone: branchForm.phone || '(11) 98765-4321',
      isMain: branchForm.isMain,
      active: true
    };

    addBranch(newBranch);
    await saveAuditLogToFirestore({
      action: 'FILIAL_CADASTRADA',
      userName: currentUser.name || 'Super Admin',
      userRole: 'super_admin',
      description: `Cadastrada nova filial ${newBranch.name} (${newBranch.city}/${newBranch.state})`,
      severity: 'info'
    });

    setIsAddBranchModalOpen(false);
    setBranchForm({ name: '', address: '', city: 'São Paulo', state: 'SP', phone: '', isMain: false });
    playCashRegister();
    showToast(`Filial ${newBranch.name} cadastrada com sucesso!`);
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

      {/* VIEW: PLANOS */}
      {viewMode === 'planos' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-[#12121A] border border-[#242438] p-5 rounded-3xl">
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#FFC72C]" />
                <span>Gestão de Planos Comerciais do NEON FOOD OS</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Edite os valores mensais e anuais, limites de filiais e usuários para cada categoria de cliente.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {saasPlans.map(plan => (
              <div
                key={plan.id}
                className={`bg-[#12121A] border p-5 rounded-3xl shadow-xl flex flex-col justify-between space-y-4 relative ${
                  plan.recommended ? 'border-[#FFC72C]' : 'border-[#242438]'
                }`}
              >
                {plan.recommended && (
                  <span className="absolute -top-2.5 right-6 text-[10px] font-black uppercase bg-[#FFC72C] text-black px-2.5 py-0.5 rounded-full shadow-md">
                    Mais Escolhido
                  </span>
                )}

                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-base font-black text-white">{plan.name}</h4>
                      <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">{plan.description}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#1E1E2E]">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-[#00E676] font-mono">
                        {formatBRL(plan.priceMonthly)}
                      </span>
                      <span className="text-xs text-zinc-400">/mês</span>
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">
                      Anual: <strong className="text-white">{formatBRL(plan.priceAnnual)}</strong>/ano
                    </div>
                  </div>

                  {/* Limits and Support */}
                  <div className="my-3 py-2 bg-[#0E0E14] rounded-xl px-3 text-[11px] space-y-1 text-zinc-400">
                    <div>Lojas Inclusas: <strong className="text-white">{plan.maxBranches}</strong></div>
                    <div>Usuários Máx: <strong className="text-white">{plan.maxUsers}</strong></div>
                    <div>Suporte: <strong className="text-white">{plan.supportType}</strong></div>
                  </div>

                  {/* Features list */}
                  <div className="space-y-1 text-xs text-zinc-300">
                    {plan.features.slice(0, 5).map((f, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="text-[11px] line-clamp-1">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setEditingPlan({ ...plan })}
                  className="w-full py-2.5 rounded-xl bg-[#1C1C28] hover:bg-[#28283C] text-white text-xs font-bold border border-[#2E2E40] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-[#FFC72C]" />
                  <span>Editar Parâmetros</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW: ASSINATURAS */}
      {viewMode === 'assinaturas' && (
        <div className="space-y-6">
          <div className="bg-[#12121A] border border-[#242438] p-5 rounded-3xl flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-400" />
                <span>Controle Financeiro de Assinaturas & Cobranças</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Acompanhe o status de pagamento mensal, método utilizado e histórico de faturamento dos clientes.
              </p>
            </div>
          </div>

          <div className="bg-[#12121A] border border-[#242438] rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[750px]">
                <thead>
                  <tr className="border-b border-[#20202E] text-[11px] font-extrabold uppercase text-zinc-400 bg-[#0E0E16]">
                    <th className="py-3.5 px-4">Empresa / Cliente</th>
                    <th className="py-3.5 px-4">Plano</th>
                    <th className="py-3.5 px-4">Valor Mensal</th>
                    <th className="py-3.5 px-4">Método</th>
                    <th className="py-3.5 px-4">Próxima Renovação</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Ação Financeira</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1C1C28] text-xs">
                  {allTenants.map(t => (
                    <tr key={t.id} className="hover:bg-[#161622] transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white">{t.name}</div>
                        <div className="text-[10px] text-zinc-400 font-mono">{t.cnpj}</div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#FFC72C]">{t.planName}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                        {formatBRL(t.monthlyRevenue || 99.90)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-[#1A1A28] border border-zinc-700 text-zinc-300 font-mono text-[11px]">
                          Pix Automático
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-zinc-300 font-mono text-[11px]">
                        Dia 10 do mês
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          ✓ Em Dia
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            playCashRegister();
                            showToast(`Fatura de ${t.name} reenviada via WhatsApp/E-mail com sucesso!`);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-[#1C1C28] hover:bg-[#262638] text-zinc-200 text-[11px] font-bold border border-zinc-700 transition-colors cursor-pointer"
                        >
                          Reenviar Fatura
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: FILIAIS */}
      {viewMode === 'filiais' && (
        <div className="space-y-6">
          <div className="bg-[#12121A] border border-[#242438] p-5 rounded-3xl flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-indigo-400" />
                <span>Gestão Consolidada de Filiais da Plataforma</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Listagem de matrizes e unidades secundárias cadastradas pelos clientes.
              </p>
            </div>

            <button
              onClick={() => setIsAddBranchModalOpen(true)}
              className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Filial</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {branches.map(b => (
              <div key={b.id} className="bg-[#12121A] border border-[#242438] p-5 rounded-3xl space-y-3 shadow-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                      b.isMain ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-zinc-800 text-zinc-400'
                    }`}>
                      {b.isMain ? 'Matriz Principal' : 'Unidade Filial'}
                    </span>
                    <h4 className="text-sm font-black text-white mt-1.5">{b.name}</h4>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>

                <div className="space-y-1 text-xs text-zinc-400 pt-1">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{b.address} - {b.city}/{b.state}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{b.phone}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Editar Plano */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#12121E] border border-[#2D2D42] rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-[#FFC72C]" />
                <span>Editar Plano: {editingPlan.name}</span>
              </h3>
              <button onClick={() => setEditingPlan(null)} className="text-zinc-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 font-bold uppercase text-[10px] mb-1">Nome do Plano</label>
                <input
                  type="text"
                  required
                  value={editingPlan.name}
                  onChange={e => setEditingPlan({ ...editingPlan, name: e.target.value })}
                  className="w-full bg-[#181826] border border-[#2B2B3C] rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-bold uppercase text-[10px] mb-1">Preço Mensal (R$)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingPlan.priceMonthly}
                    onChange={e => setEditingPlan({ ...editingPlan, priceMonthly: Number(e.target.value) })}
                    className="w-full bg-[#181826] border border-[#2B2B3C] rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 font-bold uppercase text-[10px] mb-1">Preço Anual (R$)</label>
                  <input
                    type="number"
                    step="1"
                    value={editingPlan.priceAnnual}
                    onChange={e => setEditingPlan({ ...editingPlan, priceAnnual: Number(e.target.value) })}
                    className="w-full bg-[#181826] border border-[#2B2B3C] rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-bold uppercase text-[10px] mb-1">Lojas Máximas</label>
                  <input
                    type="number"
                    value={editingPlan.maxBranches}
                    onChange={e => setEditingPlan({ ...editingPlan, maxBranches: Number(e.target.value) })}
                    className="w-full bg-[#181826] border border-[#2B2B3C] rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 font-bold uppercase text-[10px] mb-1">Usuários Máximos</label>
                  <input
                    type="number"
                    value={editingPlan.maxUsers}
                    onChange={e => setEditingPlan({ ...editingPlan, maxUsers: Number(e.target.value) })}
                    className="w-full bg-[#181826] border border-[#2B2B3C] rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#FFC72C] hover:bg-[#FFD359] text-black font-black"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Nova Filial */}
      {isAddBranchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#12121E] border border-[#2D2D42] rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-indigo-400" />
                <span>Adicionar Nova Filial</span>
              </h3>
              <button onClick={() => setIsAddBranchModalOpen(false)} className="text-zinc-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBranch} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 font-bold uppercase text-[10px] mb-1">Nome da Unidade</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Unidade Jardins"
                  value={branchForm.name}
                  onChange={e => setBranchForm({ ...branchForm, name: e.target.value })}
                  className="w-full bg-[#181826] border border-[#2B2B3C] rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-bold uppercase text-[10px] mb-1">Endereço</label>
                <input
                  type="text"
                  placeholder="Rua Oscar Freire, 1000"
                  value={branchForm.address}
                  onChange={e => setBranchForm({ ...branchForm, address: e.target.value })}
                  className="w-full bg-[#181826] border border-[#2B2B3C] rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-bold uppercase text-[10px] mb-1">Cidade</label>
                  <input
                    type="text"
                    value={branchForm.city}
                    onChange={e => setBranchForm({ ...branchForm, city: e.target.value })}
                    className="w-full bg-[#181826] border border-[#2B2B3C] rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 font-bold uppercase text-[10px] mb-1">UF</label>
                  <input
                    type="text"
                    value={branchForm.state}
                    onChange={e => setBranchForm({ ...branchForm, state: e.target.value })}
                    className="w-full bg-[#181826] border border-[#2B2B3C] rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddBranchModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                >
                  Salvar Filial
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
