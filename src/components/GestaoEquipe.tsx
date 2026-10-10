import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Edit3, 
  Trash2, 
  Phone, 
  MessageSquare, 
  Shield, 
  Clock, 
  DollarSign, 
  CheckCircle2, 
  X, 
  Flame, 
  UtensilsCrossed, 
  ChefHat, 
  Coffee, 
  Award, 
  Lock,
  ChevronRight,
  Sparkles,
  Bike
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '../context/AppContext';
import { Employee, StaffRole } from '../types';
import { formatBRL } from '../utils/formatters';
import { playBeep, playCashRegister, playSoftClickSound } from '../utils/audio';

// Categorias Claras de Operação (Cozinha, Atendimento, Entrega, Gestão)
export type RoleDepartment = 'cozinha' | 'atendimento' | 'entrega' | 'gestao';

export interface DepartmentConfig {
  id: RoleDepartment;
  title: string;
  icon: React.ElementType;
  badgeColor: string;
  roles: {
    role: StaffRole;
    label: string;
    description: string;
  }[];
}

export const DEPARTMENTS: DepartmentConfig[] = [
  {
    id: 'cozinha',
    title: 'Cozinha & Chapa',
    icon: Flame,
    badgeColor: 'text-[#FF5722] bg-[#FF5722]/15 border-[#FF5722]/30',
    roles: [
      { role: 'chapeiro', label: 'Chapeiro(a) Smash', description: 'Grelha, burgers artesanais e chapa KDS' },
      { role: 'cozinheiro', label: 'Cozinheiro(a)', description: 'Preparo de porções, molhos e acompanhamentos' },
      { role: 'auxiliar_cozinha', label: 'Auxiliar de Cozinha', description: 'Cortes, pré-preparo e higienização' }
    ]
  },
  {
    id: 'atendimento',
    title: 'Atendimento & Caixa',
    icon: Coffee,
    badgeColor: 'text-[#FFC72C] bg-[#FFC72C]/15 border-[#FFC72C]/30',
    roles: [
      { role: 'atendente', label: 'Atendente / Salão', description: 'Mesas, comandas e entrega de pedidos' },
      { role: 'caixa', label: 'Operador de Caixa', description: 'Abertura, fechamento e pagamentos no PDV' }
    ]
  },
  {
    id: 'entrega',
    title: 'Entrega & Logística',
    icon: Bike,
    badgeColor: 'text-[#00D2FF] bg-[#00D2FF]/15 border-[#00D2FF]/30',
    roles: [
      { role: 'entregador', label: 'Motoboy / Entregador', description: 'Roteirização e entregas delivery' }
    ]
  },
  {
    id: 'gestao',
    title: 'Gestão & Turno',
    icon: Shield,
    badgeColor: 'text-[#DA291C] bg-[#DA291C]/15 border-[#DA291C]/30',
    roles: [
      { role: 'gerente', label: 'Gerente de Turno', description: 'Supervisão geral, cancelamentos e equipe' }
    ]
  }
];

const DEFAULT_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
  'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150'
];

export const GestaoEquipe: React.FC = () => {
  const { 
    employees = [], 
    addEmployee, 
    updateEmployee, 
    deleteEmployee, 
    setCurrentView 
  } = useApp();

  // Search and Category Tabs
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<'all' | RoleDepartment>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Simplified Form States with explanatory labels & categories
  const [formCategory, setFormCategory] = useState<RoleDepartment>('cozinha');
  const [formRole, setFormRole] = useState<StaffRole>('chapeiro');
  const [formName, setFormName] = useState('');
  const [formShift, setFormShift] = useState<'manha' | 'noite' | 'madrugada' | 'integral'>('noite');
  const [formPhone, setFormPhone] = useState('');
  const [formAccessPin, setFormAccessPin] = useState('1234');
  const [formSalary, setFormSalary] = useState<number | string>(1850);
  const [formAvatar, setFormAvatar] = useState(DEFAULT_AVATARS[0]);

  // Helper to map role to department
  const getRoleDepartment = (role: StaffRole): RoleDepartment => {
    if (['chapeiro', 'cozinheiro', 'auxiliar_cozinha'].includes(role)) return 'cozinha';
    if (['atendente', 'caixa'].includes(role)) return 'atendimento';
    if (role === 'entregador') return 'entrega';
    return 'gestao';
  };

  // Helper to get role label
  const getRoleLabel = (role: StaffRole): string => {
    for (const dept of DEPARTMENTS) {
      const found = dept.roles.find(r => r.role === role);
      if (found) return found.label;
    }
    return role;
  };

  // Filtered list
  const filteredEmployees = useMemo(() => {
    return (employees || []).filter(emp => {
      const term = searchTerm.toLowerCase();
      const matchSearch = 
        emp.name.toLowerCase().includes(term) ||
        emp.phone.includes(term) ||
        emp.roleTitle.toLowerCase().includes(term);

      if (selectedDeptFilter === 'all') return matchSearch;
      return matchSearch && getRoleDepartment(emp.role) === selectedDeptFilter;
    });
  }, [employees, searchTerm, selectedDeptFilter]);

  // Metrics
  const totalEmployees = employees.length;
  const kitchenCount = employees.filter(e => getRoleDepartment(e.role) === 'cozinha').length;
  const frontCount = employees.filter(e => getRoleDepartment(e.role) === 'atendimento').length;

  // Open modal for new registration
  const handleOpenNewModal = () => {
    setEditingEmployee(null);
    setFormCategory('cozinha');
    setFormRole('chapeiro');
    setFormName('');
    setFormShift('noite');
    setFormPhone('');
    setFormAccessPin(String(Math.floor(1000 + Math.random() * 9000)));
    setFormSalary(1850);
    setFormAvatar(DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)]);
    setIsModalOpen(true);
    playSoftClickSound();
  };

  // Open modal for editing
  const handleOpenEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    const dept = getRoleDepartment(emp.role);
    setFormCategory(dept);
    setFormRole(emp.role);
    setFormName(emp.name);
    setFormShift(emp.shift || 'noite');
    setFormPhone(emp.phone);
    setFormAccessPin(emp.accessPin || '1234');
    setFormSalary(emp.salary || 1850);
    setFormAvatar(emp.avatarUrl || DEFAULT_AVATARS[0]);
    setIsModalOpen(true);
    playSoftClickSound();
  };

  // Submit employee form
  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) return;

    const roleLabel = getRoleLabel(formRole);
    const sal = parseFloat(String(formSalary)) || 0;

    if (editingEmployee) {
      updateEmployee(editingEmployee.id, {
        name: formName.trim(),
        role: formRole,
        roleTitle: roleLabel,
        shift: formShift,
        phone: formPhone.trim(),
        salary: sal,
        accessPin: formAccessPin.trim() || '1234',
        avatarUrl: formAvatar
      });
      playBeep(900, 0.08);
    } else {
      addEmployee({
        name: formName.trim(),
        role: formRole,
        roleTitle: roleLabel,
        shift: formShift,
        phone: formPhone.trim(),
        salary: sal,
        accessPin: formAccessPin.trim() || '1234',
        avatarUrl: formAvatar,
        status: 'active'
      });
      playCashRegister();
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });
    }

    setIsModalOpen(false);
  };

  // Delete employee
  const handleDeleteEmployee = (id: string, name: string) => {
    if (confirm(`Remover "${name}" da equipe?`)) {
      deleteEmployee(id);
      playBeep(440, 0.1);
    }
  };

  return (
    <div className="space-y-6 pb-24 select-none">
      {/* Header */}
      <div className="relative overflow-hidden p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-[#141218] via-[#1A1624] to-[#12121A] border border-[#2D283E] shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#FFC72C] px-3 py-1 rounded-full bg-[#FFC72C]/15 border border-[#FFC72C]/30 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#FFC72C]" />
              Equipe Operacional
            </span>
            <span className="text-xs text-[#71717A]">•</span>
            <span className="text-xs font-bold text-[#00E676]">Cozinha, Chapa, Salão & Caixa</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-display text-white tracking-tight pt-1">
            Gestão de Funcionários
          </h1>
          <p className="text-xs sm:text-sm text-[#A1A1AA] max-w-2xl leading-relaxed">
            Cadastre facilmente atendentes, chapeiros, auxiliares e cozinheiros com categorias claras e PIN de acesso para o PDV e KDS.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 shrink-0 w-full md:w-auto flex-wrap sm:flex-nowrap">
          <button
            onClick={() => setCurrentView('gamificacao')}
            className="px-4 py-3 bg-[#1A1826] hover:bg-[#242036] border border-[#2D283E] text-[#FFC72C] rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Award className="w-4 h-4 text-[#FFC72C]" />
            <span>Ver Metas & Ranking</span>
          </button>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleOpenNewModal}
            className="flex-1 sm:flex-none px-5 py-3 bg-gradient-to-r from-[#DA291C] to-[#F5222D] hover:from-[#B7180D] hover:to-[#DA291C] text-white rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(218,41,28,0.4)]"
          >
            <UserPlus className="w-4.5 h-4.5 shrink-0" />
            <span>CADASTRAR FUNCIONÁRIO</span>
          </motion.button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#12121A] border border-[#242438] p-5 rounded-3xl shadow-lg flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-[#71717A] uppercase tracking-wider">Total de Colaboradores</div>
            <div className="text-2xl font-black font-mono text-white mt-1">
              {totalEmployees} <span className="text-xs font-sans font-bold text-[#00E676]">ativos</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#1C1A28] border border-[#2D283E] flex items-center justify-center text-white">
            <Users className="w-6 h-6 text-[#FFC72C]" />
          </div>
        </div>

        <div className="bg-[#12121A] border border-[#242438] p-5 rounded-3xl shadow-lg flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-[#71717A] uppercase tracking-wider">Cozinha & Chapa KDS</div>
            <div className="text-2xl font-black font-mono text-[#FF5722] mt-1">
              {kitchenCount} <span className="text-xs font-sans font-normal text-[#A1A1AA]">colaboradores</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#FF5722]/10 border border-[#FF5722]/20 flex items-center justify-center text-[#FF5722]">
            <Flame className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#12121A] border border-[#242438] p-5 rounded-3xl shadow-lg flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-[#71717A] uppercase tracking-wider">Atendimento & Balcão</div>
            <div className="text-2xl font-black font-mono text-[#FFC72C] mt-1">
              {frontCount} <span className="text-xs font-sans font-normal text-[#A1A1AA]">colaboradores</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#FFC72C]/10 border border-[#FFC72C]/20 flex items-center justify-center text-[#FFC72C]">
            <Coffee className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Category Tabs & Search */}
      <div className="bg-[#12121A] border border-[#242438] p-5 rounded-3xl space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedDeptFilter('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedDeptFilter === 'all'
                  ? 'bg-[#FFC72C] text-black font-black shadow-md'
                  : 'bg-[#181824] text-[#A1A1AA] hover:text-white border border-[#28283C]'
              }`}
            >
              Todos ({employees.length})
            </button>

            {DEPARTMENTS.map(dept => {
              const count = employees.filter(e => getRoleDepartment(e.role) === dept.id).length;
              const Icon = dept.icon;
              return (
                <button
                  key={dept.id}
                  onClick={() => setSelectedDeptFilter(dept.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                    selectedDeptFilter === dept.id
                      ? 'bg-white text-black font-black shadow-md'
                      : 'bg-[#181824] text-[#A1A1AA] hover:text-white border border-[#28283C]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{dept.title} ({count})</span>
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-[#71717A] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nome ou cargo..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-[#181824] border border-[#28283C] rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-[#52525B] focus:border-[#FFC72C] focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Minimalist Cards Grid */}
        {filteredEmployees.length === 0 ? (
          <div className="py-14 text-center border-2 border-dashed border-[#242436] rounded-2xl p-6 space-y-3">
            <Users className="w-10 h-10 text-[#71717A] mx-auto opacity-50" />
            <p className="text-sm font-bold text-white">Nenhum funcionário encontrado</p>
            <p className="text-xs text-[#71717A]">Clique em Cadastrar Funcionário para adicionar novos membros à equipe.</p>
            <button
              onClick={handleOpenNewModal}
              className="px-4 py-2 bg-[#DA291C] text-white font-bold text-xs rounded-xl"
            >
              Cadastrar Agora
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEmployees.map(emp => {
              const deptId = getRoleDepartment(emp.role);
              const deptConfig = DEPARTMENTS.find(d => d.id === deptId) || DEPARTMENTS[0];
              const DeptIcon = deptConfig.icon;

              return (
                <div
                  key={emp.id}
                  className="bg-[#181824] border border-[#262438] hover:border-[#3E3856] p-5 rounded-2xl space-y-4 transition-all hover:shadow-xl"
                >
                  {/* Top: Avatar, Name and Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img 
                        src={emp.avatarUrl || DEFAULT_AVATARS[0]} 
                        alt={emp.name}
                        className="w-12 h-12 rounded-2xl object-cover border border-[#3E3856]"
                      />
                      <div>
                        <h4 className="font-extrabold text-white text-sm leading-tight">
                          {emp.name}
                        </h4>
                        <div className="text-[11px] text-[#A1A1AA] mt-0.5">
                          {emp.roleTitle}
                        </div>
                      </div>
                    </div>

                    {/* Department Tag */}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${deptConfig.badgeColor}`}>
                      <DeptIcon className="w-3 h-3" />
                      <span>{deptConfig.title.split('&')[0].trim()}</span>
                    </span>
                  </div>

                  {/* Details row: Shift & PIN */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#222032] text-xs">
                    <div>
                      <span className="text-[10px] text-[#71717A] uppercase font-bold block">Turno</span>
                      <span className="font-bold text-white capitalize flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-[#FFC72C]" />
                        {emp.shift === 'manha' ? 'Manhã (09h-17h)' :
                         emp.shift === 'noite' ? 'Noite (16h-00h)' :
                         emp.shift === 'madrugada' ? 'Madrugada (22h-06h)' : 'Escala 12x36'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-[#71717A] uppercase font-bold block">PIN do PDV</span>
                      <span className="font-mono font-bold text-[#00E676] flex items-center gap-1 mt-0.5">
                        <Lock className="w-3 h-3" />
                        {emp.accessPin || '1234'}
                      </span>
                    </div>
                  </div>

                  {/* Bottom: Contact & Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#222032]">
                    <a
                      href={`https://api.whatsapp.com/send?phone=55${emp.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#00D26A] font-bold flex items-center gap-1 hover:underline"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>{emp.phone}</span>
                    </a>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditModal(emp)}
                        className="p-1.5 rounded-lg bg-[#201E2E] hover:bg-[#2D2A42] text-[#A1A1AA] hover:text-white transition-colors"
                        title="Editar"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                        className="p-1.5 rounded-lg bg-[#201E2E] hover:bg-[#DA291C]/20 text-[#A1A1AA] hover:text-[#FF4D4F] transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL INTUITIVO DE CADASTRO DE FUNCIONÁRIO                */}
      {/* ========================================================= */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg bg-[#14121B] border border-[#2D283E] rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 my-8"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#242436]">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-[#DA291C]/20 text-[#DA291C] border border-[#DA291C]/30">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">
                      {editingEmployee ? 'Editar Funcionário' : 'Cadastrar Novo Funcionário'}
                    </h3>
                    <p className="text-[11px] text-[#A1A1AA]">
                      Selecione a categoria operacional e preencha os dados básicos
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-xl bg-[#1C1C28] text-[#A1A1AA] hover:text-white cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form with Explanatory Labels */}
              <form onSubmit={handleSaveEmployee} className="space-y-4 text-xs">
                {/* 1. SELEÇÃO DE CATEGORIA CLARA (Cozinha vs Atendimento vs Entrega vs Gestão) */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-extrabold text-[#E4E4E7] uppercase tracking-wider">
                    1. Categoria Operacional (Onde o funcionário atua) *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {DEPARTMENTS.map(dept => {
                      const Icon = dept.icon;
                      const isSelected = formCategory === dept.id;
                      return (
                        <button
                          key={dept.id}
                          type="button"
                          onClick={() => {
                            setFormCategory(dept.id);
                            // Auto select first role of department
                            setFormRole(dept.roles[0].role);
                          }}
                          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                            isSelected
                              ? 'bg-[#FFC72C]/15 border-[#FFC72C] text-white font-black scale-102 shadow-sm'
                              : 'bg-[#181824] border-[#2A283C] text-[#A1A1AA] hover:text-white'
                          }`}
                        >
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-[#FFC72C]' : 'text-[#71717A]'}`} />
                          <span className="text-[11px] font-bold">{dept.title.split('&')[0].trim()}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. CARGO ESPECÍFICO DENTRO DA CATEGORIA */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-extrabold text-[#E4E4E7] uppercase tracking-wider">
                    2. Cargo Específico *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(DEPARTMENTS.find(d => d.id === formCategory)?.roles || []).map(r => (
                      <button
                        key={r.role}
                        type="button"
                        onClick={() => setFormRole(r.role)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          formRole === r.role
                            ? 'bg-gradient-to-r from-[#DA291C]/25 to-[#FFC72C]/15 border-[#DA291C] text-white font-bold'
                            : 'bg-[#1A1826] border-[#28263A] text-[#A1A1AA] hover:text-white'
                        }`}
                      >
                        <div className="font-extrabold text-xs text-white">{r.label}</div>
                        <div className="text-[10px] text-[#71717A] mt-0.5">{r.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. NOME DO FUNCIONÁRIO COM LABEL EXPLICATIVO */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-extrabold text-[#E4E4E7] uppercase tracking-wider">
                    3. Nome Completo ou de Crachá *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Carlos Eduardo (Chapa Noturno)"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    className="w-full bg-[#181824] border border-[#28283C] rounded-xl px-3.5 py-2.5 text-white placeholder-[#52525B] focus:border-[#FFC72C] focus:outline-none text-sm font-semibold"
                  />
                  <p className="text-[10px] text-[#71717A]">
                    Como o colaborador aparecerá no KDS da cozinha, no PDV e na escala.
                  </p>
                </div>

                {/* 4. TURNO E WHATSAPP EM 2 COLUNAS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-extrabold text-[#E4E4E7] uppercase tracking-wider">
                      Turno de Trabalho *
                    </label>
                    <select
                      value={formShift}
                      onChange={e => setFormShift(e.target.value as any)}
                      className="w-full bg-[#181824] border border-[#28283C] rounded-xl px-3 py-2.5 text-white focus:border-[#FFC72C] focus:outline-none text-xs font-bold"
                    >
                      <option value="noite">Noite (16h às 00h)</option>
                      <option value="manha">Manhã (09h às 17h)</option>
                      <option value="madrugada">Madrugada (22h às 06h)</option>
                      <option value="integral">Escala 12x36</option>
                    </select>
                    <p className="text-[10px] text-[#71717A]">Horário de escala padrão</p>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-extrabold text-[#E4E4E7] uppercase tracking-wider">
                      WhatsApp / Telefone *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="(11) 98765-4321"
                      value={formPhone}
                      onChange={e => setFormPhone(e.target.value)}
                      className="w-full bg-[#181824] border border-[#28283C] rounded-xl px-3.5 py-2.5 text-white placeholder-[#52525B] focus:border-[#FFC72C] focus:outline-none text-xs font-bold"
                    />
                    <p className="text-[10px] text-[#71717A]">Para envio de escalas e avisos</p>
                  </div>
                </div>

                {/* 5. PIN DE ACESSO AO PDV E SALÁRIO BASE */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-extrabold text-[#E4E4E7] uppercase tracking-wider">
                      PIN de Acesso (4 Dígitos) *
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      placeholder="1234"
                      value={formAccessPin}
                      onChange={e => setFormAccessPin(e.target.value)}
                      className="w-full bg-[#181824] border border-[#28283C] rounded-xl px-3.5 py-2.5 text-[#00E676] font-mono font-bold text-sm focus:border-[#00E676] focus:outline-none"
                    />
                    <p className="text-[10px] text-[#71717A]">Senha rápida para desbloquear o PDV/Caixa</p>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-extrabold text-[#E4E4E7] uppercase tracking-wider">
                      Salário Base (R$)
                    </label>
                    <input
                      type="number"
                      step="50"
                      value={formSalary}
                      onChange={e => setFormSalary(e.target.value)}
                      className="w-full bg-[#181824] border border-[#28283C] rounded-xl px-3.5 py-2.5 text-white font-mono font-bold text-sm focus:border-[#FFC72C] focus:outline-none"
                    />
                    <p className="text-[10px] text-[#71717A]">Para controle de folha e custos</p>
                  </div>
                </div>

                {/* Modal Action Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#242436]">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 bg-[#1C1C28] hover:bg-[#262638] text-[#A1A1AA] hover:text-white rounded-xl font-bold transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-gradient-to-r from-[#DA291C] to-[#FFC72C] hover:opacity-95 text-black font-black rounded-xl transition-all shadow-[0_0_15px_rgba(255,199,44,0.3)] cursor-pointer"
                  >
                    {editingEmployee ? 'Salvar Alterações' : 'Concluir Cadastro'}
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
