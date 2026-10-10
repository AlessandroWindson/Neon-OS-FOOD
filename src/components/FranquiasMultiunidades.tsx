import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Clock, 
  Save, 
  Edit3, 
  Trash2, 
  Plus, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Store, 
  Globe, 
  Mail, 
  FileText, 
  Sparkles, 
  Search, 
  Check,
  Utensils,
  Image,
  Tag,
  User,
  Info,
  ExternalLink,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Branch, BranchOpeningHoursDay } from '../types';
import { playBeep, playCashRegister } from '../utils/audio';

const DAYS_OF_WEEK = [
  { key: 'seg', label: 'Segunda-feira' },
  { key: 'ter', label: 'Terça-feira' },
  { key: 'qua', label: 'Quarta-feira' },
  { key: 'qui', label: 'Quinta-feira' },
  { key: 'sex', label: 'Sexta-feira' },
  { key: 'sab', label: 'Sábado' },
  { key: 'dom', label: 'Domingo' },
];

const DEFAULT_HOURS: Record<string, BranchOpeningHoursDay> = {
  seg: { isOpen: true, openTime: '10:00', closeTime: '23:00' },
  ter: { isOpen: true, openTime: '10:00', closeTime: '23:00' },
  qua: { isOpen: true, openTime: '10:00', closeTime: '23:00' },
  qui: { isOpen: true, openTime: '10:00', closeTime: '23:00' },
  sex: { isOpen: true, openTime: '10:00', closeTime: '00:00' },
  sab: { isOpen: true, openTime: '11:00', closeTime: '00:00' },
  dom: { isOpen: true, openTime: '11:00', closeTime: '22:00' },
};

type ModalTab = 'basicas' | 'endereco' | 'contato' | 'identidade' | 'horarios' | 'status';

export const FranquiasMultiunidades: React.FC = () => {
  const { 
    branches, 
    currentBranch, 
    setCurrentBranch, 
    addBranch, 
    updateBranch, 
    deleteBranch, 
    tenant,
    setCurrentView
  } = useApp();

  const [searchFilter, setSearchFilter] = useState('');
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<ModalTab>('basicas');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Branch>>({});

  const handleOpenEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setIsCreatingNew(false);
    setActiveModalTab('basicas');
    setFormData({
      ...branch,
      establishmentName: branch.establishmentName || branch.tradeName || tenant?.name || '',
      openingHours: branch.openingHours || DEFAULT_HOURS,
      branchStatus: branch.branchStatus || 'Ativa',
    });
    playBeep(650, 0.05);
  };

  const handleOpenCreate = () => {
    setEditingBranch(null);
    setIsCreatingNew(true);
    setActiveModalTab('basicas');
    setFormData({
      name: '',
      establishmentName: tenant?.name || '',
      tradeName: '',
      corporateName: '',
      code: `FILIAL-${String(branches.length + 1).padStart(2, '0')}`,
      cnpj: '',
      responsibleCpf: '',
      establishmentType: 'Lanchonete',
      category: 'Alimentação Rápida',
      city: '',
      state: '',
      zipCode: '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      referencePoint: '',
      address: '',
      phone: '',
      whatsapp: '',
      email: '',
      instagram: '',
      website: '',
      status: 'open',
      branchStatus: 'Ativa',
      isMain: branches.length === 0,
      openingHours: DEFAULT_HOURS,
      menuDisplayName: '',
      menuDescription: '',
      bannerUrl: '',
      logoUrl: '',
      publicNotes: '',
      internalNotes: '',
    });
    playBeep(750, 0.05);
  };

  const handleCloseModal = () => {
    setEditingBranch(null);
    setIsCreatingNew(false);
    setFormData({});
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      alert('Por favor, informe o nome da filial.');
      return;
    }

    setIsSaving(true);
    try {
      const streetPart = formData.street?.trim() || '';
      const numPart = formData.number?.trim() ? `, ${formData.number.trim()}` : '';
      const compPart = formData.complement?.trim() ? ` - ${formData.complement.trim()}` : '';
      const neighPart = formData.neighborhood?.trim() ? ` - ${formData.neighborhood.trim()}` : '';
      const cityPart = formData.city?.trim() ? ` - ${formData.city.trim()}` : '';
      const statePart = formData.state?.trim() ? `/${formData.state.trim()}` : '';
      
      const assembledAddress = `${streetPart}${numPart}${compPart}${neighPart}${cityPart}${statePart}`.trim();
      const finalAddress = assembledAddress || formData.address?.trim() || '';

      if (isCreatingNew) {
        await addBranch({
          ...formData,
          name: formData.name.trim(),
          establishmentName: formData.establishmentName?.trim() || tenant.name,
          tradeName: formData.tradeName?.trim() || formData.name.trim(),
          corporateName: formData.corporateName?.trim() || '',
          code: formData.code?.trim() || `FILIAL-${String(branches.length + 1).padStart(2, '0')}`,
          cnpj: formData.cnpj?.trim() || '',
          responsibleCpf: formData.responsibleCpf?.trim() || '',
          establishmentType: formData.establishmentType?.trim() || 'Lanchonete',
          category: formData.category?.trim() || '',
          city: formData.city?.trim() || '',
          state: formData.state?.trim() || '',
          zipCode: formData.zipCode?.trim() || '',
          street: formData.street?.trim() || '',
          number: formData.number?.trim() || '',
          complement: formData.complement?.trim() || '',
          neighborhood: formData.neighborhood?.trim() || '',
          referencePoint: formData.referencePoint?.trim() || '',
          address: finalAddress,
          phone: formData.phone?.trim() || '',
          whatsapp: formData.whatsapp?.trim() || '',
          email: formData.email?.trim() || '',
          instagram: formData.instagram?.trim() || '',
          website: formData.website?.trim() || '',
          isMain: formData.isMain || false,
          status: formData.status || 'open',
          branchStatus: formData.branchStatus || 'Ativa',
          openingHours: formData.openingHours || DEFAULT_HOURS,
          menuDisplayName: formData.menuDisplayName?.trim() || formData.name.trim(),
          menuDescription: formData.menuDescription?.trim() || '',
          bannerUrl: formData.bannerUrl?.trim() || '',
          logoUrl: formData.logoUrl?.trim() || '',
          publicNotes: formData.publicNotes?.trim() || '',
          internalNotes: formData.internalNotes?.trim() || '',
        } as Omit<Branch, 'id'>);

        setSaveSuccessMsg('Filial cadastrada com sucesso.');
      } else if (editingBranch) {
        const updated: Branch = {
          ...editingBranch,
          ...formData,
          name: formData.name.trim(),
          establishmentName: formData.establishmentName?.trim() || editingBranch.establishmentName || tenant.name,
          tradeName: formData.tradeName?.trim() || '',
          corporateName: formData.corporateName?.trim() || '',
          code: formData.code?.trim() || editingBranch.code,
          cnpj: formData.cnpj?.trim() || '',
          responsibleCpf: formData.responsibleCpf?.trim() || '',
          establishmentType: formData.establishmentType?.trim() || 'Lanchonete',
          category: formData.category?.trim() || '',
          city: formData.city?.trim() || '',
          state: formData.state?.trim() || '',
          zipCode: formData.zipCode?.trim() || '',
          street: formData.street?.trim() || '',
          number: formData.number?.trim() || '',
          complement: formData.complement?.trim() || '',
          neighborhood: formData.neighborhood?.trim() || '',
          referencePoint: formData.referencePoint?.trim() || '',
          address: finalAddress,
          phone: formData.phone?.trim() || '',
          whatsapp: formData.whatsapp?.trim() || '',
          email: formData.email?.trim() || '',
          instagram: formData.instagram?.trim() || '',
          website: formData.website?.trim() || '',
          branchStatus: formData.branchStatus || 'Ativa',
          openingHours: formData.openingHours || DEFAULT_HOURS,
          menuDisplayName: formData.menuDisplayName?.trim() || '',
          menuDescription: formData.menuDescription?.trim() || '',
          bannerUrl: formData.bannerUrl?.trim() || '',
          logoUrl: formData.logoUrl?.trim() || '',
          publicNotes: formData.publicNotes?.trim() || '',
          internalNotes: formData.internalNotes?.trim() || '',
          updatedAt: new Date().toISOString()
        } as Branch;

        await updateBranch(updated);
        setSaveSuccessMsg('Filial atualizada com sucesso.');
      }

      playCashRegister();
      handleCloseModal();
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Erro ao salvar filial:', err);
      alert('Ocorreu um erro ao salvar as informações da filial no Firebase.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (branchId: string) => {
    if (branches.length <= 1) {
      alert('Você não pode excluir a única filial do restaurante.');
      return;
    }
    await deleteBranch(branchId);
    setDeleteConfirmId(null);
    setSaveSuccessMsg('Filial removida com sucesso.');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const filteredBranches = branches.filter(b => 
    b.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    (b.establishmentName && b.establishmentName.toLowerCase().includes(searchFilter.toLowerCase())) ||
    b.city.toLowerCase().includes(searchFilter.toLowerCase()) ||
    (b.address && b.address.toLowerCase().includes(searchFilter.toLowerCase())) ||
    (b.cnpj && b.cnpj.includes(searchFilter))
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Toast Feedback */}
      <AnimatePresence>
        {saveSuccessMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="p-4 rounded-2xl bg-emerald-950/95 border border-emerald-500/50 text-emerald-300 flex items-center justify-between gap-3 shadow-2xl backdrop-blur-md sticky top-16 z-50"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="text-xs sm:text-sm font-bold">{saveSuccessMsg}</span>
            </div>
            <button 
              onClick={() => setSaveSuccessMsg(null)}
              className="text-emerald-400 hover:text-emerald-200 p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Conforme Especificação */}
      <motion.div 
        layout
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-r from-[#12121A] via-[#161626] to-[#12121A] border border-[#242438] shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
      >
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6366F1] px-3 py-1 rounded-full bg-[#6366F1]/15 border border-[#6366F1]/30">
              Sistema & Gestão
            </span>
            <span className="text-xs text-zinc-600">•</span>
            <span className="text-xs font-bold text-zinc-300">{tenant.name}</span>
            <span className="text-xs text-zinc-600">•</span>
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Firebase Firestore
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-display text-white tracking-tight pt-1">
            Minhas Filiais
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
            Gerencie as filiais, endereços, horários de atendimento e dados operacionais de cada unidade.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 500, damping: 22 }}
            onClick={handleOpenCreate}
            className="w-full md:w-auto bg-gradient-to-r from-[#DA291C] to-[#FF7A00] hover:brightness-110 text-white px-5 py-3 rounded-2xl text-xs sm:text-sm font-extrabold shadow-[0_0_15px_rgba(218,41,28,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer border border-[#FFC72C]/30"
          >
            <Plus className="w-4 h-4 text-[#FFC72C]" />
            <span>+ Adicionar filial</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Barra de Busca de Filiais */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#12121A] p-4 rounded-2xl border border-[#242438]">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome, cidade, endereço..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full bg-[#181826] border border-[#2E2E40] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#6366F1]"
          />
        </div>

        <div className="text-xs text-zinc-400 font-medium">
          Filiais cadastradas: <span className="text-white font-bold">{filteredBranches.length}</span>
        </div>
      </div>

      {/* Grid de Filiais / Estado Vazio */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredBranches.length === 0 ? (
          <div className="col-span-full p-12 text-center rounded-3xl bg-[#12121A] border border-[#242438] space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800/80 flex items-center justify-center text-zinc-500 mx-auto">
              <Building2 className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-white">Você ainda não possui filiais cadastradas.</h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              Cadastre a unidade principal ou as filiais do seu restaurante para gerenciar endereços, horários e equipe.
            </p>
            <button
              onClick={handleOpenCreate}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#DA291C] to-[#FF7A00] text-white font-bold text-xs inline-flex items-center gap-2 cursor-pointer shadow-lg hover:brightness-110"
            >
              <Plus className="w-4 h-4 text-[#FFC72C]" />
              <span>+ Adicionar filial</span>
            </button>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredBranches.map((branch) => {
              const isActive = branch.id === currentBranch.id;
              const isBranchActive = branch.branchStatus === 'Ativa' || (!branch.branchStatus && branch.status === 'open');
              const resumoEndereco = branch.address?.trim() || (
                branch.street ? `${branch.street}${branch.number ? ', ' + branch.number : ''}` : ''
              );

              return (
                <motion.div
                  key={branch.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={`rounded-3xl p-6 flex flex-col justify-between transition-all border shadow-xl ${
                    isActive
                      ? 'bg-gradient-to-b from-[#181828] to-[#12121A] border-[#6366F1]/80 shadow-[0_0_25px_rgba(99,102,241,0.15)]'
                      : 'bg-[#12121A] border border-[#242438] hover:border-[#38384D]'
                  }`}
                >
                  <div>
                    {/* Topo do Card: Nome da filial, Matriz/Filial, Status */}
                    <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#20202E]">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {branch.isMain ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFC72C]/20 text-[#FFC72C] border border-[#FFC72C]/40">
                              ★ Matriz
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                              Filial
                            </span>
                          )}

                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                            isBranchActive
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isBranchActive ? 'bg-emerald-400' : 'bg-zinc-500'}`}></span>
                            <span>{branch.branchStatus || (branch.status === 'open' ? 'Ativa' : 'Inativa')}</span>
                          </span>

                          {branch.code && (
                            <span className="text-[10px] font-mono text-zinc-500">
                              {branch.code}
                            </span>
                          )}
                        </div>

                        <h3 className="text-lg font-black text-white">{branch.name}</h3>
                        <p className="text-xs text-[#FFC72C] font-semibold">
                          {branch.tradeName || branch.establishmentName || tenant.name}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(branch)}
                          className="px-3 py-1.5 rounded-xl bg-[#1E1E2E] hover:bg-[#2A2A40] text-zinc-200 hover:text-white border border-[#3E3E58] transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-sm"
                          title="Editar dados da filial"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-[#6366F1]" />
                          <span>Editar filial</span>
                        </button>

                        {!branch.isMain && (
                          <button
                            onClick={() => setDeleteConfirmId(branch.id)}
                            className="p-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800/40 transition-colors cursor-pointer"
                            title="Remover filial"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Informações da Filial: Cidade - UF, Endereço, Contato, CNPJ */}
                    <div className="py-4 space-y-2.5 text-xs text-zinc-300 border-b border-[#20202E]">
                      {/* Cidade - UF e Endereço */}
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-[#FFC72C] shrink-0 mt-0.5" />
                        <div>
                          <div className="text-white font-medium">
                            {resumoEndereco ? resumoEndereco : <span className="text-zinc-500 italic">Endereço não informado</span>}
                          </div>
                          <div className="text-[11px] text-zinc-400 mt-0.5">
                            {branch.city && branch.state ? `${branch.city} - ${branch.state}` : (branch.city || branch.state || <span className="text-zinc-500">Cidade/Estado não informado</span>)}
                            {branch.zipCode ? ` • CEP ${branch.zipCode}` : ''}
                          </div>
                        </div>
                      </div>

                      {/* Contato & CNPJ */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1.5">
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="text-zinc-400 font-medium">Telefone:</span>
                          <span className="text-white truncate">
                            {branch.phone ? branch.phone : <span className="text-zinc-500 italic">Não informado</span>}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-emerald-400 font-bold text-[11px]">WA:</span>
                          <span className="text-zinc-400 font-medium">WhatsApp:</span>
                          <span className="text-white truncate">
                            {branch.whatsapp ? branch.whatsapp : <span className="text-zinc-500 italic">Não informado</span>}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span className="text-zinc-400 font-medium">CNPJ:</span>
                          <span className="text-white font-mono text-[11px] truncate">
                            {branch.cnpj ? branch.cnpj : <span className="text-zinc-500 italic font-sans">Não informado</span>}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          <span className="text-zinc-400 font-medium">E-mail:</span>
                          <span className="text-white truncate">
                            {branch.email ? branch.email : <span className="text-zinc-500 italic">Não informado</span>}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Botões do Card: [ Editar filial ] e [ Abrir unidade ] */}
                  <div className="pt-4 border-t border-[#20202E] mt-2 flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(branch)}
                      className="flex-1 py-2.5 bg-[#1C1C28] hover:bg-[#262638] text-zinc-300 hover:text-white font-bold text-xs rounded-2xl border border-[#2E2E40] transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-[#6366F1]" />
                      <span>Editar filial</span>
                    </button>

                    <button
                      onClick={() => {
                        setCurrentBranch(branch);
                        playBeep(880, 0.05);
                        setCurrentView('overview_bi');
                        setSaveSuccessMsg(`Unidade ${branch.name} selecionada.`);
                        setTimeout(() => setSaveSuccessMsg(null), 3000);
                      }}
                      className={`flex-1 py-2.5 font-bold text-xs rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm ${
                        isActive
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/50'
                          : 'bg-[#6366F1] hover:bg-[#5254E0] text-white'
                      }`}
                    >
                      <Store className="w-3.5 h-3.5" />
                      <span>{isActive ? 'Abrir Unidade (Ativa)' : 'Abrir unidade'}</span>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Modal de Confirmação de Exclusão */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#12121A] border border-red-500/40 p-6 rounded-3xl max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-red-400">
                <AlertCircle className="w-6 h-6 shrink-0" />
                <h3 className="text-lg font-bold text-white">Desativar Filial</h3>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Tem certeza que deseja desativar esta filial? Seus dados permanecerão arquivados no banco Firestore e poderão ser reativados a qualquer momento.
              </p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirmId)}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white shadow-lg cursor-pointer"
                >
                  Confirmar Desativação
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Completo: "Editar filial" com as 6 abas conforme solicitação do usuário */}
      <AnimatePresence>
        {(editingBranch || isCreatingNew) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#12121A] border border-[#2E2E44] rounded-3xl max-w-3xl w-full shadow-2xl my-auto overflow-hidden flex flex-col max-h-[92vh]"
            >
              {/* Header do Modal */}
              <div className="p-5 sm:p-6 border-b border-[#20202E] bg-[#161622] flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-[#6366F1]/15 border border-[#6366F1]/30 text-[#6366F1]">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-black text-white">
                      {isCreatingNew ? 'Cadastrar Nova Filial' : 'Editar Filial'}
                    </h2>
                    <p className="text-xs text-zinc-400">
                      Configure os dados da filial com sincronização e persistência no Firebase.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleCloseModal}
                  className="p-2 rounded-xl bg-zinc-800/60 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Seletor das 6 Abas Conforme Especificação */}
              <div className="flex items-center gap-1.5 p-2 bg-[#141420] border-b border-[#20202E] overflow-x-auto scrollbar-none">
                <button
                  type="button"
                  onClick={() => setActiveModalTab('basicas')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    activeModalTab === 'basicas'
                      ? 'bg-[#6366F1] text-white shadow-md'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                  }`}
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>1. Informações básicas</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModalTab('endereco')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    activeModalTab === 'endereco'
                      ? 'bg-[#6366F1] text-white shadow-md'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>2. Endereço da filial</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModalTab('contato')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    activeModalTab === 'contato'
                      ? 'bg-[#6366F1] text-white shadow-md'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                  }`}
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>3. Contato da filial</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModalTab('identidade')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    activeModalTab === 'identidade'
                      ? 'bg-[#6366F1] text-white shadow-md'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>4. Identidade da filial</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModalTab('horarios')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    activeModalTab === 'horarios'
                      ? 'bg-[#6366F1] text-white shadow-md'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>5. Horário de funcionamento</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModalTab('status')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    activeModalTab === 'status'
                      ? 'bg-[#6366F1] text-white shadow-md'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>6. Status da filial</span>
                </button>
              </div>

              {/* Formulário com as 6 Abas */}
              <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
                {/* 1. INFORMAÇÕES BÁSICAS */}
                {activeModalTab === 'basicas' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-white pb-2 border-b border-[#20202E]">
                      <Store className="w-4 h-4 text-[#FFC72C]" />
                      <span>Informações Básicas da Filial</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-zinc-300 font-semibold mb-1">
                          Nome da filial *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Ex: Lanchonete Dulci"
                          className="w-full bg-[#181826] border border-[#2E2E40] rounded-xl px-3.5 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-[#6366F1] text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-zinc-300 font-semibold mb-1">
                          Nome fantasia
                        </label>
                        <input
                          type="text"
                          value={formData.tradeName || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, tradeName: e.target.value }))}
                          placeholder="Ex: Dulci Burger"
                          className="w-full bg-[#181826] border border-[#2E2E40] rounded-xl px-3.5 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-[#6366F1]"
                        />
                      </div>

                      <div>
                        <label className="block text-zinc-300 font-semibold mb-1">
                          Razão social
                        </label>
                        <input
                          type="text"
                          value={formData.corporateName || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, corporateName: e.target.value }))}
                          placeholder="Ex: Neon Food Gastronomia LTDA"
                          className="w-full bg-[#181826] border border-[#2E2E40] rounded-xl px-3.5 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-[#6366F1]"
                        />
                      </div>

                      <div>
                        <label className="block text-zinc-300 font-semibold mb-1">
                          CNPJ (Deixar vazio se não possuir)
                        </label>
                        <input
                          type="text"
                          value={formData.cnpj || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, cnpj: e.target.value }))}
                          placeholder="00.000.000/0000-00"
                          className="w-full bg-[#181826] border border-[#2E2E40] rounded-xl px-3.5 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-[#6366F1] font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-zinc-300 font-semibold mb-1">
                          CPF do responsável (Deixar vazio se não possuir)
                        </label>
                        <input
                          type="text"
                          value={formData.responsibleCpf || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, responsibleCpf: e.target.value }))}
                          placeholder="000.000.000-00"
                          className="w-full bg-[#181826] border border-[#2E2E40] rounded-xl px-3.5 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-[#6366F1] font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-zinc-300 font-semibold mb-1">
                          Tipo de estabelecimento
                        </label>
                        <select
                          value={formData.establishmentType || 'Lanchonete'}
                          onChange={(e) => setFormData(prev => ({ ...prev, establishmentType: e.target.value }))}
                          className="w-full bg-[#181826] border border-[#2E2E40] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-[#6366F1]"
                        >
                          <option value="Lanchonete">Lanchonete</option>
                          <option value="Restaurante">Restaurante</option>
                          <option value="Hamburgueria">Hamburgueria</option>
                          <option value="Pizzaria">Pizzaria</option>
                          <option value="Cafeteria">Cafeteria / Padaria</option>
                          <option value="Bar / Choperia">Bar / Choperia</option>
                          <option value="Doceria / Sorveteria">Doceria / Sorveteria</option>
                          <option value="Dark Kitchen / Delivery">Dark Kitchen / Delivery</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-zinc-300 font-semibold mb-1">
                          Código interno de identificação
                        </label>
                        <input
                          type="text"
                          value={formData.code || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                          placeholder="FILIAL-01"
                          className="w-full bg-[#181826] border border-[#2E2E40] rounded-xl px-3.5 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-[#6366F1] font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. ENDEREÇO DA FILIAL */}
                {activeModalTab === 'endereco' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-white pb-2 border-b border-[#20202E]">
                      <MapPin className="w-4 h-4 text-[#FFC72C]" />
                      <span>Endereço Completo da Filial</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-zinc-300 font-semibold mb-1">CEP</label>
                        <input
                          type="text"
                          value={formData.zipCode || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, zipCode: e.target.value }))}
                          placeholder="00000-000"
                          className="w-full bg-[#181826] border border-[#2E2E40] rounded-xl px-3.5 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-[#6366F1] font-mono"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-zinc-300 font-semibold mb-1">Logradouro / Endereço</label>
                        <input
                          type="text"
                          value={formData.street || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, street: e.target.value }))}
                          placeholder="Rua, Avenida, Praça..."
                          className="w-full bg-[#181826] border border-[#2E2E40] rounded-xl px-3.5 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-[#6366F1]"
                        />
                      </div>

                      <div>
                        <label className="block text-zinc-300 font-semibold mb-1">Número</label>
                        <input
                          type="text"
                          value={formData.number || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, number: e.target.value }))}
                          placeholder="123 ou S/N"
                          className="w-full bg-[#181826] border border-[#2E2E40] rounded-xl px-3.5 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-[#6366F1]"
                        />
                      </div>

                      <div>
                        <label className="block text-zinc-300 font-semibold mb-1">Complemento</label>
                        <input
                          type="text"
                          value={formData.complement || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, complement: e.target.value }))}
                          placeholder="Sala 2, Loja B, Térreo"
                          className="w-full bg-[#181826] border border-[#2E2E40] rounded-xl px-3.5 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-[#6366F1]"
                        />
                      </div>

                      <div>
                        <label className="block text-zinc-300 font-semibold mb-1">Bairro</label>
                        <input
                          type="text"
                          value={formData.neighborhood || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, neighborhood: e.target.value }))}
                          placeholder="Bairro"
                          className="w-full bg-[#181826] border border-[#2E2E40] rounded-xl px-3.5 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-[#6366F1]"
                        />
                      </div>

                      <div>
                        <label className="block text-zinc-300 font-semibold mb-1">Cidade</label>
                        <input
                          type="text"
                          value={formData.city || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                          placeholder="Cidade"
                          className="w-full bg-[#181826] border border-[#2E2E40] rounded-xl px-3.5 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-[#6366F1]"
                        />
                      </div>

                      <div>
                        <label className="block text-zinc-300 font-semibold mb-1">Estado (UF)</label>
                        <input
                          type="text"
                          maxLength={2}
                          value={formData.state || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value.toUpperCase() }))}
                          placeholder="SP"
                          className="w-full bg-[#181826] border border-[#2E2E40] rounded-xl px-3.5 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-[#6366F1] uppercase font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-zinc-300 font-semibold mb-1">Ponto de referência</label>
                        <input
                          type="text"
                          value={formData.referencePoint || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, referencePoint: e.target.value }))}
                          placeholder="Próximo à praça central"
                          className="w-full bg-[#181826] border border-[#2E2E40] rounded-xl px-3.5 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-[#6366F1]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. CONTATO DA FILIAL */}
                {activeModalTab === 'contato' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-white pb-2 border-b border-[#20202E]">
                      <Phone className="w-4 h-4 text-emerald-400" />
                      <span>Canais de Contato e Atendimento</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-zinc-300 font-semibold mb-1">Telefone Fixo / Comercial</label>
                        <input
                          type="text"
                          value={formData.phone || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="(11) 3321-4455"
                          className="w-full bg-[#181826] border border-[#2E2E40] rounded-xl px-3.5 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-[#6366F1]"
                        />
                      </div>

                      <div>
                        <label className="block text-zinc-300 font-semibold mb-1">WhatsApp de Pedidos</label>
                        <input
                          type="text"
                          value={formData.whatsapp || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                          placeholder="(11) 98452-3319"
                          className="w-full bg-[#181826] border border-[#2E2E40] rounded-xl px-3.5 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-[#6366F1]"
                        />
                      </div>

                      <div>
                        <label className="block text-zinc-300 font-semibold mb-1">E-mail da Filial</label>
                        <input
                          type="email"
                          value={formData.email || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="contato@restaurante.com.br"
                          className="w-full bg-[#181826] border border-[#2E2E40] rounded-xl px-3.5 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-[#6366F1]"
                        />
                      </div>

                      <div>
                        <label className="block text-zinc-300 font-semibold mb-1">Instagram (@usuario)</label>
                        <input
                          type="text"
                          value={formData.instagram || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, instagram: e.target.value }))}
                          placeholder="@restaurante"
                          className="w-full bg-[#181826] border border-[#2E2E40] rounded-xl px-3.5 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-[#6366F1]"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-zinc-300 font-semibold mb-1">Website Oficial</label>
                        <input
                          type="text"
                          value={formData.website || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                          placeholder="https://restaurante.com.br"
                          className="w-full bg-[#181826] border border-[#2E2E40] rounded-xl px-3.5 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-[#6366F1]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. IDENTIDADE DA FILIAL */}
                {activeModalTab === 'identidade' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-white pb-2 border-b border-[#20202E]">
                      <Sparkles className="w-4 h-4 text-[#FFC72C]" />
                      <span>Identidade Visual e Informações Públicas</span>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-zinc-300 font-semibold mb-1">
                          Nome exibido aos clientes
                        </label>
                        <input
                          type="text"
                          value={formData.menuDisplayName || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, menuDisplayName: e.target.value }))}
                          placeholder="Ex: Lanchonete Dulci"
                          className="w-full bg-[#181826] border border-[#2E2E40] rounded-xl px-3.5 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-[#6366F1]"
                        />
                      </div>

                      <div>
                        <label className="block text-zinc-300 font-semibold mb-1">
                          Descrição curta da unidade
                        </label>
                        <textarea
                          rows={2}
                          value={formData.menuDescription || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, menuDescription: e.target.value }))}
                          placeholder="Ex: Lanches artesanais, porções crocantes e bebidas refrescantes."
                          className="w-full bg-[#181826] border border-[#2E2E40] rounded-xl px-3.5 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-[#6366F1]"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-zinc-300 font-semibold mb-1">URL do Logo</label>
                          <input
                            type="text"
                            value={formData.logoUrl || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, logoUrl: e.target.value }))}
                            placeholder="https://..."
                            className="w-full bg-[#181826] border border-[#2E2E40] rounded-xl px-3.5 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-[#6366F1]"
                          />
                        </div>

                        <div>
                          <label className="block text-zinc-300 font-semibold mb-1">URL da Imagem / Banner do Cardápio</label>
                          <input
                            type="text"
                            value={formData.bannerUrl || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, bannerUrl: e.target.value }))}
                            placeholder="https://..."
                            className="w-full bg-[#181826] border border-[#2E2E40] rounded-xl px-3.5 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-[#6366F1]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-zinc-300 font-semibold mb-1">
                          Informações públicas exibidas aos clientes no cardápio digital
                        </label>
                        <textarea
                          rows={2}
                          value={formData.publicNotes || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, publicNotes: e.target.value }))}
                          placeholder="Avisos sobre estacionamento conveniado, taxa de serviço facultativa, etc."
                          className="w-full bg-[#181826] border border-[#2E2E40] rounded-xl px-3.5 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-[#6366F1]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. HORÁRIO DE FUNCIONAMENTO */}
                {activeModalTab === 'horarios' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-white pb-2 border-b border-[#20202E]">
                      <Clock className="w-4 h-4 text-emerald-400" />
                      <span>Horários de Funcionamento (Semana)</span>
                    </div>

                    <div className="space-y-2.5">
                      {DAYS_OF_WEEK.map(({ key, label }) => {
                        const dayConfig = (formData.openingHours as any)?.[key] || { isOpen: true, openTime: '10:00', closeTime: '23:00' };

                        return (
                          <div 
                            key={key}
                            className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                              dayConfig.isOpen 
                                ? 'bg-[#181826] border-[#2C2C40]' 
                                : 'bg-[#12121A] border-zinc-800/80 opacity-60'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={dayConfig.isOpen}
                                  onChange={(e) => {
                                    const nextHours = {
                                      ...(formData.openingHours || DEFAULT_HOURS),
                                      [key]: { ...dayConfig, isOpen: e.target.checked }
                                    };
                                    setFormData(prev => ({ ...prev, openingHours: nextHours }));
                                  }}
                                  className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                              </label>
                              <span className="font-bold text-white text-xs w-28">{label}</span>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                dayConfig.isOpen ? 'text-emerald-400 bg-emerald-950/60' : 'text-zinc-500 bg-zinc-900'
                              }`}>
                                {dayConfig.isOpen ? 'Aberto' : 'Fechado'}
                              </span>
                            </div>

                            {dayConfig.isOpen && (
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-zinc-400">Abre:</span>
                                <input
                                  type="time"
                                  value={dayConfig.openTime || '10:00'}
                                  onChange={(e) => {
                                    const nextHours = {
                                      ...(formData.openingHours || DEFAULT_HOURS),
                                      [key]: { ...dayConfig, openTime: e.target.value }
                                    };
                                    setFormData(prev => ({ ...prev, openingHours: nextHours }));
                                  }}
                                  className="bg-[#12121E] border border-[#2E2E40] rounded-xl px-2.5 py-1.5 text-white font-mono"
                                />
                                <span className="text-zinc-400">Fecha:</span>
                                <input
                                  type="time"
                                  value={dayConfig.closeTime || '23:00'}
                                  onChange={(e) => {
                                    const nextHours = {
                                      ...(formData.openingHours || DEFAULT_HOURS),
                                      [key]: { ...dayConfig, closeTime: e.target.value }
                                    };
                                    setFormData(prev => ({ ...prev, openingHours: nextHours }));
                                  }}
                                  className="bg-[#12121E] border border-[#2E2E40] rounded-xl px-2.5 py-1.5 text-white font-mono"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 6. STATUS DA FILIAL */}
                {activeModalTab === 'status' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-white pb-2 border-b border-[#20202E]">
                      <ShieldCheck className="w-4 h-4 text-sky-400" />
                      <span>Status e Configurações Operacionais</span>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-zinc-300 font-semibold mb-2">Status da Filial no Sistema</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            { value: 'Ativa', desc: 'Em operação normal', color: 'emerald' },
                            { value: 'Inativa', desc: 'Temporariamente desativada', color: 'zinc' },
                            { value: 'Suspensa', desc: 'Bloqueada administrativamente', color: 'red' },
                            { value: 'Em configuração', desc: 'Preparando abertura', color: 'amber' },
                          ].map((st) => (
                            <button
                              key={st.value}
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, branchStatus: st.value as any }))}
                              className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                                (formData.branchStatus || 'Ativa') === st.value
                                  ? 'bg-[#1E1E30] border-[#6366F1] shadow-md'
                                  : 'bg-[#141420] border-[#222234] hover:bg-[#1A1A28]'
                              }`}
                            >
                              <div className="font-bold text-white text-xs">{st.value}</div>
                              <div className="text-[10px] text-zinc-400 mt-0.5">{st.desc}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-[#181826] border border-[#2C2C40] space-y-2">
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.isMain || false}
                            onChange={(e) => setFormData(prev => ({ ...prev, isMain: e.target.checked }))}
                            className="accent-[#FFC72C] w-4 h-4 cursor-pointer"
                          />
                          <span className="font-bold text-white text-xs">Definir como Unidade Matriz da Empresa</span>
                        </label>
                        <p className="text-[11px] text-zinc-400 pl-6.5">
                          A unidade matriz é a referência principal da sua conta para relatórios consolidados e faturamento.
                        </p>
                      </div>

                      <div>
                        <label className="block text-zinc-300 font-semibold mb-1">
                          Observações internas da operação (visível apenas para administradores)
                        </label>
                        <textarea
                          rows={3}
                          value={formData.internalNotes || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, internalNotes: e.target.value }))}
                          placeholder="Anotações internas sobre contrato, alvará, metas..."
                          className="w-full bg-[#181826] border border-[#2E2E40] rounded-xl px-3.5 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-[#6366F1]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Rodapé de Ações do Modal */}
                <div className="p-4 border-t border-[#20202E] bg-[#141420] flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#DA291C] to-[#FF7A00] hover:brightness-110 text-white font-black transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-red-950/50 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4 text-[#FFC72C]" />
                    <span>{isSaving ? 'Salvando...' : 'Salvar alterações'}</span>
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
