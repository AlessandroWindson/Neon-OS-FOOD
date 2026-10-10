import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  UserPlus, 
  Shield, 
  Lock, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  KeyRound, 
  Mail, 
  Phone, 
  Building2,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PlatformUser, UserRole } from '../../types';
import { playBeep, playCashRegister } from '../../utils/audio';

export const SuperAdminUsuarios: React.FC = () => {
  const { 
    currentUser,
    platformUsers, 
    addPlatformUser, 
    updatePlatformUser, 
    deletePlatformUser, 
    allTenants,
    saveAuditLogToFirestore
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<PlatformUser | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form state for New / Edit User
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'owner' as UserRole,
    tenantId: allTenants[0]?.id || 'tenant_default',
    password: ''
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const filteredUsers = platformUsers.filter(u => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.phone && u.phone.includes(searchTerm));
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;

    const newUser: PlatformUser = {
      id: `usr_${Date.now()}`,
      name: formData.name,
      email: formData.email,
      phone: formData.phone || '',
      role: formData.role,
      tenantId: formData.tenantId,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    await addPlatformUser(newUser);
    await saveAuditLogToFirestore({
      action: 'USUÁRIO_CRIADO',
      userName: currentUser.name || 'Super Admin',
      userRole: 'super_admin',
      description: `Criado usuário ${newUser.name} (${newUser.role}) para o tenant ${newUser.tenantId}`,
      severity: 'info'
    });

    setIsNewUserModalOpen(false);
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: 'owner',
      tenantId: allTenants[0]?.id || 'tenant_default',
      password: ''
    });
    playCashRegister();
    showToast(`Usuário ${newUser.name} criado com sucesso!`);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    await updatePlatformUser(editingUser.id, {
      name: editingUser.name,
      email: editingUser.email,
      phone: editingUser.phone,
      role: editingUser.role,
      status: editingUser.status
    });

    await saveAuditLogToFirestore({
      action: 'USUÁRIO_EDITADO',
      userName: currentUser.name || 'Super Admin',
      userRole: 'super_admin',
      description: `Atualizados dados do usuário ${editingUser.name} (${editingUser.email})`,
      severity: 'warning'
    });

    setEditingUser(null);
    playBeep(650, 0.05);
    showToast(`Usuário ${editingUser.name} atualizado!`);
  };

  const handleToggleSuspend = async (user: PlatformUser) => {
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    await updatePlatformUser(user.id, { status: newStatus });
    await saveAuditLogToFirestore({
      action: newStatus === 'suspended' ? 'USUÁRIO_SUSPENSO' : 'USUÁRIO_REATIVADO',
      userName: currentUser.name || 'Super Admin',
      userRole: 'super_admin',
      description: `${newStatus === 'suspended' ? 'Suspenso' : 'Reativado'} acesso do usuário ${user.name}`,
      severity: newStatus === 'suspended' ? 'critical' : 'info'
    });
    playBeep(400, 0.1);
    showToast(`Status do usuário alterado para ${newStatus === 'active' ? 'Ativo' : 'Suspenso'}`);
  };

  const handleResetPassword = async (user: PlatformUser) => {
    playCashRegister();
    await saveAuditLogToFirestore({
      action: 'SENHA_REDEFINIDA',
      userName: currentUser.name || 'Super Admin',
      userRole: 'super_admin',
      description: `Enviado link de redefinição de senha para ${user.email}`,
      severity: 'warning'
    });
    showToast(`Instruções de redefinição de senha enviadas para ${user.email}`);
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

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#12121A] border border-[#242438] p-5 rounded-3xl">
        <div>
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            <span>Gerenciamento de Usuários da Plataforma</span>
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Total de {platformUsers.length} usuários cadastrados em todas as instâncias de restaurantes.
          </p>
        </div>

        <button
          onClick={() => setIsNewUserModalOpen(true)}
          className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#FF6B00] to-[#DA291C] hover:brightness-110 text-white font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer transition-all shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Novo Usuário</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome, e-mail ou telefone..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-[#12121A] border border-[#242438] rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-[#FFC72C] focus:outline-none"
          />
        </div>

        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="bg-[#12121A] border border-[#242438] rounded-2xl px-4 py-2.5 text-xs text-white focus:border-[#FFC72C] focus:outline-none cursor-pointer"
        >
          <option value="all">Todas as Funções</option>
          <option value="super_admin">Super Admin</option>
          <option value="owner">Proprietário (Owner)</option>
          <option value="manager">Gerente (Manager)</option>
          <option value="cashier">Operador de Caixa</option>
          <option value="kitchen">Cozinha (KDS)</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-[#12121A] border border-[#242438] rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-[#20202E] text-[11px] font-extrabold uppercase text-zinc-400 bg-[#0E0E16]">
                <th className="py-3.5 px-4">Usuário / Contato</th>
                <th className="py-3.5 px-4">Papel / Função</th>
                <th className="py-3.5 px-4">Empresa / Tenant</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Ações Administrativas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1C1C28] text-xs">
              {filteredUsers.map(u => {
                const tenantName = allTenants.find(t => t.id === u.tenantId)?.name || u.tenantId;
                const isSuper = u.role === 'super_admin';

                return (
                  <tr key={u.id} className="hover:bg-[#161622] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span>{u.name}</span>
                        {isSuper && (
                          <span className="text-[9px] font-black uppercase bg-red-500/20 text-red-300 border border-red-500/40 px-1.5 py-0.2 rounded">
                            MASTER
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-400 font-mono flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3 text-zinc-500" />
                        <span>{u.email}</span>
                      </div>
                      {u.phone && (
                        <div className="text-[10px] text-zinc-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" />
                          <span>{u.phone}</span>
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                        u.role === 'super_admin' ? 'bg-red-500/20 text-red-300 border-red-500/40' :
                        u.role === 'owner' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                        u.role === 'manager' ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' :
                        'bg-blue-500/20 text-blue-300 border-blue-500/40'
                      }`}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-zinc-300">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="font-medium">{tenantName}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit ${
                        u.status === 'active' 
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'active' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                        <span>{u.status === 'active' ? 'Ativo' : 'Suspenso'}</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setEditingUser(u)}
                          className="p-1.5 rounded-xl bg-[#1F1F2E] hover:bg-[#2B2B3C] text-zinc-300 hover:text-white transition-colors cursor-pointer"
                          title="Editar dados"
                        >
                          <Edit className="w-3.5 h-3.5 text-amber-400" />
                        </button>

                        <button
                          onClick={() => handleResetPassword(u)}
                          className="p-1.5 rounded-xl bg-[#1F1F2E] hover:bg-[#2B2B3C] text-zinc-300 hover:text-white transition-colors cursor-pointer"
                          title="Redefinir senha"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-sky-400" />
                        </button>

                        {!isSuper && (
                          <button
                            onClick={() => handleToggleSuspend(u)}
                            className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                              u.status === 'active' 
                                ? 'bg-red-500/15 hover:bg-red-500/25 text-red-400' 
                                : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400'
                            }`}
                            title={u.status === 'active' ? 'Suspender usuário' : 'Reativar usuário'}
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Novo Usuário */}
      {isNewUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#12121E] border border-[#2D2D42] rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-amber-400" />
                <span>Adicionar Usuário na Plataforma</span>
              </h3>
              <button onClick={() => setIsNewUserModalOpen(false)} className="text-zinc-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 font-bold uppercase text-[10px] mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Eduardo"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#181826] border border-[#2B2B3C] rounded-xl px-3 py-2 text-white focus:border-[#FFC72C] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-bold uppercase text-[10px] mb-1">E-mail de Login</label>
                <input
                  type="email"
                  required
                  placeholder="usuario@restaurante.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-[#181826] border border-[#2B2B3C] rounded-xl px-3 py-2 text-white focus:border-[#FFC72C] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-bold uppercase text-[10px] mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="(11) 99999-9999"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-[#181826] border border-[#2B2B3C] rounded-xl px-3 py-2 text-white focus:border-[#FFC72C] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-bold uppercase text-[10px] mb-1">Função / Perfil</label>
                  <select
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full bg-[#181826] border border-[#2B2B3C] rounded-xl px-3 py-2 text-white focus:border-[#FFC72C] focus:outline-none"
                  >
                    <option value="owner">Proprietário (Owner)</option>
                    <option value="manager">Gerente</option>
                    <option value="cashier">Operador de Caixa</option>
                    <option value="kitchen">Cozinha (KDS)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 font-bold uppercase text-[10px] mb-1">Vincular à Empresa</label>
                <select
                  value={formData.tenantId}
                  onChange={e => setFormData({ ...formData, tenantId: e.target.value })}
                  className="w-full bg-[#181826] border border-[#2B2B3C] rounded-xl px-3 py-2 text-white focus:border-[#FFC72C] focus:outline-none"
                >
                  {allTenants.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.cnpj || 'Sem CNPJ'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-zinc-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewUserModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#DA291C] text-white font-bold"
                >
                  Criar Usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Usuário */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#12121E] border border-[#2D2D42] rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Edit className="w-4 h-4 text-amber-400" />
                <span>Editar Usuário: {editingUser.name}</span>
              </h3>
              <button onClick={() => setEditingUser(null)} className="text-zinc-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 font-bold uppercase text-[10px] mb-1">Nome</label>
                <input
                  type="text"
                  required
                  value={editingUser.name}
                  onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full bg-[#181826] border border-[#2B2B3C] rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-bold uppercase text-[10px] mb-1">E-mail</label>
                <input
                  type="email"
                  required
                  value={editingUser.email}
                  onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full bg-[#181826] border border-[#2B2B3C] rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-bold uppercase text-[10px] mb-1">Função / Perfil</label>
                <select
                  value={editingUser.role}
                  onChange={e => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
                  className="w-full bg-[#181826] border border-[#2B2B3C] rounded-xl px-3 py-2 text-white"
                >
                  <option value="super_admin">Super Admin</option>
                  <option value="owner">Proprietário (Owner)</option>
                  <option value="manager">Gerente</option>
                  <option value="cashier">Operador de Caixa</option>
                  <option value="kitchen">Cozinha (KDS)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-zinc-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
