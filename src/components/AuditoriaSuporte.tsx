import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldAlert, 
  LifeBuoy, 
  Lock, 
  FileText, 
  MessageSquare, 
  Phone, 
  CheckCircle2, 
  AlertTriangle,
  History,
  Search,
  Filter,
  Download,
  ShieldCheck,
  RefreshCw,
  User,
  Activity,
  Calendar,
  CalendarDays,
  CalendarRange,
  Trash2,
  Tag,
  ShoppingBag,
  LogIn,
  Wallet,
  X,
  RotateCcw,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatDateTime } from '../utils/formatters';
import { playBeep, playSoftClickSound } from '../utils/audio';

export type ActionFilterType = 
  | 'all' 
  | 'deletion' 
  | 'price_change' 
  | 'order' 
  | 'login' 
  | 'cash' 
  | 'system';

export const AuditoriaSuporte: React.FC = () => {
  const { auditLogs = [], currentUser, tenant, openExportModal } = useApp();
  
  // Dynamic filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<'all' | 'info' | 'warning' | 'critical'>('all');
  const [selectedAction, setSelectedAction] = useState<ActionFilterType>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Support state
  const [supportCategory, setSupportCategory] = useState('NFC-e e Emissão Fiscal');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSent, setSupportSent] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Helper to get formatted today string (YYYY-MM-DD)
  const getTodayStr = () => new Date().toISOString().split('T')[0];

  // Quick date presets
  const applyDatePreset = (preset: 'today' | '7days' | '30days' | 'month' | 'clear') => {
    playSoftClickSound();
    const today = new Date();
    const todayStr = getTodayStr();

    switch (preset) {
      case 'today':
        setStartDate(todayStr);
        setEndDate(todayStr);
        break;
      case '7days': {
        const d = new Date();
        d.setDate(d.getDate() - 6);
        setStartDate(d.toISOString().split('T')[0]);
        setEndDate(todayStr);
        break;
      }
      case '30days': {
        const d = new Date();
        d.setDate(d.getDate() - 29);
        setStartDate(d.toISOString().split('T')[0]);
        setEndDate(todayStr);
        break;
      }
      case 'month': {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        setStartDate(firstDay.toISOString().split('T')[0]);
        setEndDate(todayStr);
        break;
      }
      case 'clear':
        setStartDate('');
        setEndDate('');
        break;
    }
  };

  // Helper to check action matching
  const matchActionType = (log: any, target: ActionFilterType): boolean => {
    if (target === 'all') return true;
    
    const act = (log.action || '').toLowerCase();
    const actType = (log.actionType || '').toLowerCase();
    const cat = (log.category || '').toLowerCase();
    const desc = (log.description || '').toLowerCase();

    if (target === 'deletion') {
      return (
        act === 'deletion' ||
        actType === 'deletion' ||
        act === 'cancel_item' ||
        act === 'order_cancelled' ||
        act === 'staff_removed' ||
        cat === 'delete' ||
        desc.includes('exclus') ||
        desc.includes('cancelam') ||
        desc.includes('removido') ||
        desc.includes('deletad')
      );
    }

    if (target === 'price_change') {
      return (
        act === 'price_change' ||
        actType === 'price_change' ||
        cat === 'price' ||
        desc.includes('preço') ||
        desc.includes('preco') ||
        desc.includes('valor alterado')
      );
    }

    if (target === 'order') {
      return (
        act === 'order_create' ||
        act === 'order_creation' ||
        actType === 'order_creation' ||
        actType === 'order_create' ||
        cat === 'order' ||
        desc.includes('pedido') ||
        desc.includes('comanda')
      );
    }

    if (target === 'login') {
      return (
        act === 'login' ||
        actType === 'login' ||
        act === 'ghost_login' ||
        act === 'user_login' ||
        cat === 'auth' ||
        desc.includes('login') ||
        desc.includes('autentica') ||
        desc.includes('acesso administrativo')
      );
    }

    if (target === 'cash') {
      return (
        act === 'cash_bleed' ||
        act === 'cash_supply' ||
        act === 'cash_movement' ||
        desc.includes('sangria') ||
        desc.includes('suprimento') ||
        desc.includes('caixa')
      );
    }

    if (target === 'system') {
      return (
        act === 'system_config' ||
        act === 'config_change' ||
        cat === 'config' ||
        cat === 'system' ||
        desc.includes('sistema') ||
        desc.includes('configuração')
      );
    }

    return act === target || actType === target;
  };

  // Action counts for badges
  const actionCounts = useMemo(() => {
    const counts = {
      all: (auditLogs || []).length,
      deletion: 0,
      price_change: 0,
      order: 0,
      login: 0,
      cash: 0,
      system: 0,
    };

    (auditLogs || []).forEach(log => {
      if (matchActionType(log, 'deletion')) counts.deletion++;
      if (matchActionType(log, 'price_change')) counts.price_change++;
      if (matchActionType(log, 'order')) counts.order++;
      if (matchActionType(log, 'login')) counts.login++;
      if (matchActionType(log, 'cash')) counts.cash++;
      if (matchActionType(log, 'system')) counts.system++;
    });

    return counts;
  }, [auditLogs]);

  // Dynamic filter pipeline
  const filteredLogs = useMemo(() => {
    return (auditLogs || []).filter(log => {
      // 1. Severity filter
      if (selectedSeverity !== 'all' && log.severity !== selectedSeverity) {
        return false;
      }

      // 2. Specific Action Type filter
      if (selectedAction !== 'all') {
        if (!matchActionType(log, selectedAction)) {
          return false;
        }
      }

      // 3. Date range filter (start date inclusive, end date inclusive)
      if (startDate) {
        const logTime = new Date(log.timestamp).getTime();
        const startLimit = new Date(`${startDate}T00:00:00.000`).getTime();
        if (!isNaN(logTime) && !isNaN(startLimit) && logTime < startLimit) {
          return false;
        }
      }

      if (endDate) {
        const logTime = new Date(log.timestamp).getTime();
        const endLimit = new Date(`${endDate}T23:59:59.999`).getTime();
        if (!isNaN(logTime) && !isNaN(endLimit) && logTime > endLimit) {
          return false;
        }
      }

      // 4. Search term filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchSearch = 
          (log.userName && log.userName.toLowerCase().includes(term)) ||
          (log.action && log.action.toLowerCase().includes(term)) ||
          (log.actionType && log.actionType.toLowerCase().includes(term)) ||
          (log.description && log.description.toLowerCase().includes(term)) ||
          (log.ipAddress && log.ipAddress.includes(term)) ||
          (log.tenantId && log.tenantId.toLowerCase().includes(term)) ||
          (log.userEmail && log.userEmail.toLowerCase().includes(term)) ||
          (log.userId && log.userId.toLowerCase().includes(term));
        if (!matchSearch) return false;
      }

      return true;
    });
  }, [auditLogs, selectedSeverity, selectedAction, startDate, endDate, searchTerm]);

  // Check if any filter is active
  const hasActiveFilters = Boolean(
    searchTerm.trim() || 
    selectedSeverity !== 'all' || 
    selectedAction !== 'all' || 
    startDate || 
    endDate
  );

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedSeverity('all');
    setSelectedAction('all');
    setStartDate('');
    setEndDate('');
    playSoftClickSound();
  };

  const handleSendSupport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportMessage.trim()) return;
    setSupportSent(true);
    playBeep(880, 0.08);
    setTimeout(() => {
      setSupportSent(false);
      setSupportMessage('');
    }, 4000);
  };

  // Export filtered logs to CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;
    setIsExporting(true);
    playSoftClickSound();

    try {
      const headers = ['ID', 'Data/Hora', 'Tenant ID', 'Usuário', 'E-mail', 'Perfil', 'Tipo de Ação', 'Descrição', 'Severidade', 'IP'];
      const rows = filteredLogs.map(log => [
        `"${log.id}"`,
        `"${log.timestamp}"`,
        `"${log.tenantId || tenant?.id || ''}"`,
        `"${(log.userName || '').replace(/"/g, '""')}"`,
        `"${(log.userEmail || '').replace(/"/g, '""')}"`,
        `"${log.userRole || ''}"`,
        `"${log.actionType || log.action || ''}"`,
        `"${(log.description || '').replace(/"/g, '""')}"`,
        `"${log.severity || 'info'}"`,
        `"${log.ipAddress || ''}"`
      ]);

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `auditoria_dulci_${getTodayStr()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.warn('Erro ao exportar CSV:', e);
    } finally {
      setTimeout(() => setIsExporting(false), 800);
    }
  };

  const getActionLabel = (action: string) => {
    const map: Record<string, string> = {
      login: 'Autenticação / Login',
      user_login: 'Autenticação / Login',
      order_create: 'Criação de Pedido',
      order_creation: 'Criação de Pedido',
      price_change: 'Alteração de Preço',
      deletion: 'Exclusão Crítica',
      discount_applied: 'Desconto Concedido',
      staff_registered: 'Colaborador Cadastrado',
      staff_removed: 'Colaborador Desligado',
      cash_bleed: 'Sangria de Caixa',
      cash_supply: 'Suprimento de Caixa',
      cancel_item: 'Cancelamento de Item',
      ghost_login: 'Acesso Administrativo',
      system_config: 'Configuração do Sistema',
      order_cancelled: 'Pedido Cancelado',
    };
    return map[action] || action || 'Operação Registrada';
  };

  const getSeverityBadge = (severity?: string) => {
    switch (severity) {
      case 'critical':
        return <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#DA291C]/20 text-[#FF4D4D] border border-[#DA291C]/40">Crítico</span>;
      case 'warning':
        return <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#FFC72C]/20 text-[#FFC72C] border border-[#FFC72C]/40">Atenção</span>;
      default:
        return <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/40">Informativo</span>;
    }
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
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#14B8A6] px-3 py-1 rounded-full bg-[#14B8A6]/15 border border-[#14B8A6]/30">
              Segurança & Histórico LGPD
            </span>
            <span className="text-xs text-[#71717A]">•</span>
            <span className="text-xs font-bold text-[#FFC72C]">Rastreabilidade Total no Firestore</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-display text-white tracking-tight pt-1">
            Logs de Auditoria & Central de Ajuda 24h
          </h1>
          <p className="text-xs sm:text-sm text-[#A1A1AA] max-w-2xl leading-relaxed">
            Registro imutável no Firestore (coleção <code className="text-[#14B8A6] font-mono font-bold">auditLogs</code>) com filtros dinâmicos por intervalo de datas e tipos específicos de operações críticas.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <button
            onClick={handleExportCSV}
            disabled={filteredLogs.length === 0 || isExporting}
            className="px-4 py-2.5 rounded-2xl bg-[#1A1A28] hover:bg-[#222234] border border-[#28283C] text-xs font-bold text-white flex items-center gap-2 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title="Exportar logs filtrados em formato CSV"
          >
            <Download className="w-4 h-4 text-[#14B8A6]" />
            <span>{isExporting ? 'Exportando...' : 'Exportar Logs (CSV)'}</span>
          </button>

          <button
            onClick={() => {
              playSoftClickSound();
              openExportModal('auditoria');
            }}
            className="px-4 py-2.5 rounded-2xl bg-[#14B8A6]/15 hover:bg-[#14B8A6]/25 border border-[#14B8A6]/40 text-xs font-bold text-[#14B8A6] flex items-center gap-2 transition-all cursor-pointer"
            title="Abrir Central de Backup & Exportação Operacional"
          >
            <Download className="w-4 h-4 text-[#14B8A6]" />
            <span>Central de Backup Geral</span>
          </button>

          <div className="px-4 py-2.5 rounded-2xl bg-[#181824] border border-[#242436] flex items-center gap-2 text-xs font-bold text-[#14B8A6]">
            <ShieldCheck className="w-4 h-4 text-[#14B8A6]" />
            <span>Auditoria 100% Ativa</span>
          </div>
        </div>
      </motion.div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#12121A] border border-[#242438]">
          <div className="text-[11px] uppercase font-bold text-[#71717A] tracking-wider">Total Auditado</div>
          <div className="text-2xl font-black font-mono text-white mt-1">{(auditLogs || []).length} registros</div>
          <div className="text-xs text-[#14B8A6] font-medium mt-1">Persistência imutável</div>
        </div>
        <div className="p-5 rounded-2xl bg-[#12121A] border border-[#242438]">
          <div className="text-[11px] uppercase font-bold text-[#71717A] tracking-wider">Registros Filtrados</div>
          <div className="text-2xl font-black font-mono text-[#00E676] mt-1">{filteredLogs.length} exibidos</div>
          <div className="text-xs text-zinc-400 font-medium mt-1">
            {hasActiveFilters ? 'Filtros aplicados' : 'Mostrando todos os logs'}
          </div>
        </div>
        <div className="p-5 rounded-2xl bg-[#12121A] border border-[#242438]">
          <div className="text-[11px] uppercase font-bold text-[#71717A] tracking-wider">Exclusões & Críticos</div>
          <div className="text-2xl font-black font-mono text-[#FF4D4D] mt-1">{actionCounts.deletion} eventos</div>
          <div className="text-xs text-[#FF4D4D]/80 font-medium mt-1">Exclusões e cancelamentos</div>
        </div>
        <div className="p-5 rounded-2xl bg-[#12121A] border border-[#242438]">
          <div className="text-[11px] uppercase font-bold text-[#71717A] tracking-wider">Alterações de Preço</div>
          <div className="text-2xl font-black font-mono text-[#FFC72C] mt-1">{actionCounts.price_change} eventos</div>
          <div className="text-xs text-[#FFC72C]/80 font-medium mt-1">Modificações no cardápio</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Audit Logs Table with Dynamic Filters */}
        <motion.div 
          layout
          initial={{ opacity: 0, scale: 0.97, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ layout: { type: 'spring', stiffness: 350, damping: 30 }, duration: 0.2 }}
          className="lg:col-span-2 bg-[#12121A] border border-[#242438] p-6 rounded-3xl space-y-4 shadow-xl"
        >
          {/* Main Top Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#20202E]">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-[#FFC72C]" />
              <h3 className="text-base font-black text-white">Trilha de Auditoria em Tempo Real</h3>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#181824] border border-[#282838] text-zinc-400">
                {filteredLogs.length} de {(auditLogs || []).length}
              </span>
            </div>

            {/* Severity quick selector */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {(['all', 'info', 'warning', 'critical'] as const).map(sev => (
                <button
                  key={sev}
                  onClick={() => {
                    setSelectedSeverity(sev);
                    playSoftClickSound();
                  }}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedSeverity === sev 
                      ? 'bg-[#14B8A6] text-black font-extrabold shadow-sm' 
                      : 'bg-[#181824] text-[#A1A1AA] hover:text-white border border-[#242436]'
                  }`}
                >
                  {sev === 'all' ? 'Todas Severidades' : sev === 'info' ? 'Info' : sev === 'warning' ? 'Atenção' : 'Crítico'}
                </button>
              ))}
            </div>
          </div>

          {/* ================================================================= */}
          {/* FILTRO 1: TIPO DE AÇÃO ESPECÍFICA (Pills com Ícones e Contadores) */}
          {/* ================================================================= */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-zinc-400">
              <span className="flex items-center gap-1.5 text-zinc-300">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#14B8A6]" />
                Filtrar por Tipo de Ação:
              </span>
              {selectedAction !== 'all' && (
                <button
                  onClick={() => {
                    setSelectedAction('all');
                    playSoftClickSound();
                  }}
                  className="text-[11px] text-[#14B8A6] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Limpar ação
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
              {/* Todas */}
              <button
                onClick={() => {
                  setSelectedAction('all');
                  playSoftClickSound();
                }}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedAction === 'all'
                    ? 'bg-white text-black shadow-md'
                    : 'bg-[#161622] hover:bg-[#1E1E2C] text-zinc-400 hover:text-white border border-[#242436]'
                }`}
              >
                <span>Todas</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${selectedAction === 'all' ? 'bg-black/15 text-black' : 'bg-[#222234] text-zinc-400'}`}>
                  {actionCounts.all}
                </span>
              </button>

              {/* Apenas Exclusões */}
              <button
                onClick={() => {
                  setSelectedAction('deletion');
                  playSoftClickSound();
                }}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedAction === 'deletion'
                    ? 'bg-[#FF4D4D] text-white shadow-[0_0_12px_rgba(255,77,77,0.4)]'
                    : 'bg-[#161622] hover:bg-[#1E1E2C] text-red-300 border border-red-500/30'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Apenas Exclusões</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${selectedAction === 'deletion' ? 'bg-black/25 text-white' : 'bg-red-500/20 text-red-300'}`}>
                  {actionCounts.deletion}
                </span>
              </button>

              {/* Apenas Alterações de Preço */}
              <button
                onClick={() => {
                  setSelectedAction('price_change');
                  playSoftClickSound();
                }}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedAction === 'price_change'
                    ? 'bg-[#FFC72C] text-black font-extrabold shadow-[0_0_12px_rgba(255,199,44,0.4)]'
                    : 'bg-[#161622] hover:bg-[#1E1E2C] text-amber-300 border border-amber-500/30'
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                <span>Alterações de Preço</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${selectedAction === 'price_change' ? 'bg-black/20 text-black' : 'bg-amber-500/20 text-amber-300'}`}>
                  {actionCounts.price_change}
                </span>
              </button>

              {/* Criação de Pedidos */}
              <button
                onClick={() => {
                  setSelectedAction('order');
                  playSoftClickSound();
                }}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedAction === 'order'
                    ? 'bg-[#00E676] text-black font-extrabold shadow-[0_0_12px_rgba(0,230,118,0.4)]'
                    : 'bg-[#161622] hover:bg-[#1E1E2C] text-emerald-300 border border-emerald-500/30'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Pedidos</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${selectedAction === 'order' ? 'bg-black/20 text-black' : 'bg-emerald-500/20 text-emerald-300'}`}>
                  {actionCounts.order}
                </span>
              </button>

              {/* Logins */}
              <button
                onClick={() => {
                  setSelectedAction('login');
                  playSoftClickSound();
                }}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedAction === 'login'
                    ? 'bg-blue-500 text-white shadow-[0_0_12px_rgba(59,130,246,0.4)]'
                    : 'bg-[#161622] hover:bg-[#1E1E2C] text-blue-300 border border-blue-500/30'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Logins</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${selectedAction === 'login' ? 'bg-black/25 text-white' : 'bg-blue-500/20 text-blue-300'}`}>
                  {actionCounts.login}
                </span>
              </button>

              {/* Caixa & Sangrias */}
              <button
                onClick={() => {
                  setSelectedAction('cash');
                  playSoftClickSound();
                }}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedAction === 'cash'
                    ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                    : 'bg-[#161622] hover:bg-[#1E1E2C] text-purple-300 border border-purple-500/30'
                }`}
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Caixa</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${selectedAction === 'cash' ? 'bg-black/25 text-white' : 'bg-purple-500/20 text-purple-300'}`}>
                  {actionCounts.cash}
                </span>
              </button>
            </div>
          </div>

          {/* ================================================================= */}
          {/* FILTRO 2: DATEPICKER POR INTERVALO DE DATAS COM ATALHOS RÁPIDOS */}
          {/* ================================================================= */}
          <div className="p-3.5 rounded-2xl bg-[#161624] border border-[#242436] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <CalendarRange className="w-3.5 h-3.5 text-[#FFC72C]" />
                Intervalo de Datas (Datepicker):
              </span>

              {/* Atalhos Rápidos */}
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-none text-[11px]">
                <button
                  type="button"
                  onClick={() => applyDatePreset('today')}
                  className="px-2.5 py-1 rounded-lg bg-[#1E1E2C] hover:bg-[#28283C] text-zinc-300 hover:text-white border border-[#2D2D42] cursor-pointer"
                >
                  Hoje
                </button>
                <button
                  type="button"
                  onClick={() => applyDatePreset('7days')}
                  className="px-2.5 py-1 rounded-lg bg-[#1E1E2C] hover:bg-[#28283C] text-zinc-300 hover:text-white border border-[#2D2D42] cursor-pointer"
                >
                  Últimos 7 dias
                </button>
                <button
                  type="button"
                  onClick={() => applyDatePreset('30days')}
                  className="px-2.5 py-1 rounded-lg bg-[#1E1E2C] hover:bg-[#28283C] text-zinc-300 hover:text-white border border-[#2D2D42] cursor-pointer"
                >
                  30 dias
                </button>
                <button
                  type="button"
                  onClick={() => applyDatePreset('month')}
                  className="px-2.5 py-1 rounded-lg bg-[#1E1E2C] hover:bg-[#28283C] text-zinc-300 hover:text-white border border-[#2D2D42] cursor-pointer"
                >
                  Este mês
                </button>
                {(startDate || endDate) && (
                  <button
                    type="button"
                    onClick={() => applyDatePreset('clear')}
                    className="px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 cursor-pointer flex items-center gap-1"
                    title="Remover filtro de datas"
                  >
                    <X className="w-3 h-3" /> Limpar
                  </button>
                )}
              </div>
            </div>

            {/* Inputs de Data Inicial e Data Final */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[#14B8A6]" />
                  Data Inicial:
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={startDate}
                    max={endDate || undefined}
                    onChange={e => {
                      setStartDate(e.target.value);
                      playSoftClickSound();
                    }}
                    className="w-full bg-[#12121A] border border-[#282838] focus:border-[#14B8A6] rounded-xl px-3 py-2 text-xs text-white scheme-dark focus:outline-none cursor-pointer"
                  />
                  {startDate && (
                    <button
                      onClick={() => setStartDate('')}
                      className="absolute right-8 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white p-1"
                      title="Limpar data inicial"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              <div className="relative">
                <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1 flex items-center gap-1">
                  <CalendarDays className="w-3 h-3 text-[#FFC72C]" />
                  Data Final:
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={endDate}
                    min={startDate || undefined}
                    onChange={e => {
                      setEndDate(e.target.value);
                      playSoftClickSound();
                    }}
                    className="w-full bg-[#12121A] border border-[#282838] focus:border-[#FFC72C] rounded-xl px-3 py-2 text-xs text-white scheme-dark focus:outline-none cursor-pointer"
                  />
                  {endDate && (
                    <button
                      onClick={() => setEndDate('')}
                      className="absolute right-8 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white p-1"
                      title="Limpar data final"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Range feedback badge */}
            {(startDate || endDate) && (
              <div className="text-[11px] text-zinc-400 flex items-center gap-2 pt-1 border-t border-[#202030]">
                <span className="font-semibold text-white">Filtrando período:</span>
                <span>
                  {startDate ? `A partir de ${startDate.split('-').reverse().join('/')}` : 'Desde o início'} até{' '}
                  {endDate ? `${endDate.split('-').reverse().join('/')}` : 'Hoje'}
                </span>
              </div>
            )}
          </div>

          {/* Search bar & active filter pills */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#71717A] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por operador, ação, descrição, detalhes ou IP..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-[#181824] border border-[#282838] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-[#52525B] focus:border-[#14B8A6] focus:outline-none"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="px-3.5 py-2.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-xs font-bold text-red-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Zerar Filtros</span>
              </button>
            )}
          </div>

          {/* Table / List */}
          <div className="divide-y divide-[#1C1C28] text-xs max-h-[560px] overflow-y-auto pr-1">
            {filteredLogs.length === 0 ? (
              <div className="py-14 text-center text-[#71717A] space-y-3">
                <ShieldCheck className="w-12 h-12 text-[#2E2E44] mx-auto" />
                <div className="space-y-1">
                  <p className="font-bold text-white text-sm">Nenhum evento encontrado para os filtros selecionados.</p>
                  <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                    Tente expandir o intervalo de datas, selecionar outro tipo de ação ou limpar a busca.
                  </p>
                </div>
                {hasActiveFilters && (
                  <button
                    onClick={handleResetFilters}
                    className="px-4 py-2 rounded-xl bg-[#1A1A28] border border-[#2C2C40] text-xs font-bold text-[#14B8A6] hover:text-white cursor-pointer"
                  >
                    Restaurar Todos os Logs
                  </button>
                )}
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {filteredLogs.map((log, idx) => (
                  <motion.div 
                    key={log.id || `log_${idx}`} 
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ layout: { type: 'spring', stiffness: 350, damping: 30 }, delay: Math.min(idx * 0.02, 0.2) }}
                    className="py-3.5 flex flex-col sm:flex-row items-start justify-between gap-3 hover:bg-[#161622]/60 p-2.5 rounded-xl transition-colors"
                  >
                    <div className="flex items-start gap-3 w-full sm:w-auto">
                      <div className={`p-2.5 rounded-2xl border shrink-0 mt-0.5 shadow-sm ${
                        log.severity === 'critical' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                        log.severity === 'warning' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                        'bg-[#181824] border-[#262638] text-[#14B8A6]'
                      }`}>
                        {matchActionType(log, 'deletion') ? (
                          <Trash2 className="w-4 h-4 text-red-400" />
                        ) : matchActionType(log, 'price_change') ? (
                          <Tag className="w-4 h-4 text-amber-400" />
                        ) : matchActionType(log, 'order') ? (
                          <ShoppingBag className="w-4 h-4 text-emerald-400" />
                        ) : matchActionType(log, 'login') ? (
                          <LogIn className="w-4 h-4 text-blue-400" />
                        ) : (
                          <ShieldAlert className="w-4 h-4" />
                        )}
                      </div>

                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white text-sm">
                            {getActionLabel(log.actionType || log.action)}
                          </span>
                          {getSeverityBadge(log.severity)}
                          {log.tenantId && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#1B1B2A] border border-[#2B2B3E] text-zinc-400">
                              {log.tenantId}
                            </span>
                          )}
                        </div>

                        {/* Description render safely as string */}
                        <div className="text-xs text-[#D1D5DB] leading-relaxed">
                          {log.description || (typeof log.details === 'string' ? log.details : 'Ação concluída com sucesso.')}
                        </div>

                        {/* Metadata / Details parsed safely as key-value chips */}
                        {((log.metadata && Object.keys(log.metadata).length > 0) || (log.details && typeof log.details === 'object' && Object.keys(log.details).length > 0)) && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {Object.entries({ ...(log.details || {}), ...(log.metadata || {}) }).map(([key, val]) => (
                              <span key={key} className="text-[10px] bg-[#1A1A28] border border-[#28283C] text-[#9CA3AF] px-2 py-0.5 rounded-md font-mono">
                                {key}: <strong className="text-white">{typeof val === 'object' ? JSON.stringify(val) : String(val)}</strong>
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="text-[11px] text-[#71717A] font-mono flex items-center gap-2 flex-wrap">
                          <span>Operador: <strong className="text-white">{log.userName || 'Sistema'}</strong></span>
                          {log.userRole && (
                            <>
                              <span>•</span>
                              <span>Função: <strong className="text-zinc-300">{log.userRole}</strong></span>
                            </>
                          )}
                          <span>•</span>
                          <span>IP: {log.ipAddress || '192.168.1.100'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 self-end sm:self-start">
                      <span className="text-xs text-[#71717A] font-mono whitespace-nowrap bg-[#161622] px-2.5 py-1 rounded-lg border border-[#242436]">
                        {formatDateTime(log.timestamp)}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </motion.div>

        {/* Right Col: 24/7 VIP Support */}
        <motion.div 
          layout
          initial={{ opacity: 0, scale: 0.97, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ layout: { type: 'spring', stiffness: 350, damping: 30 }, duration: 0.2, delay: 0.05 }}
          className="bg-[#12121A] border border-[#242438] p-6 rounded-3xl space-y-5 flex flex-col justify-between shadow-xl"
        >
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <LifeBuoy className="w-5 h-5 text-[#00E676]" />
              <span>Suporte Técnico Neon 24h</span>
            </h3>
            <p className="text-xs text-[#A1A1AA] mt-1 leading-relaxed">
              Fale diretamente com especialistas do Neon Food OS em caso de dúvidas fiscais, auditoria de dados, impressoras ou operação.
            </p>

            <form onSubmit={handleSendSupport} className="mt-4 space-y-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-[#A1A1AA] mb-1">Qual o assunto?</label>
                <select 
                  value={supportCategory}
                  onChange={e => setSupportCategory(e.target.value)}
                  className="w-full bg-[#161624] border border-[#282838] rounded-2xl px-4 py-2.5 text-xs text-white focus:border-[#00E676] focus:outline-none"
                >
                  <option>NFC-e e Emissão Fiscal</option>
                  <option>Auditoria LGPD & Rastreabilidade</option>
                  <option>Configuração de Impressora Térmica (ESC/POS)</option>
                  <option>Ativação de Robô do WhatsApp</option>
                  <option>Dúvida sobre Sangria ou Fechamento de Caixa</option>
                  <option>Outros assuntos urgentes</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-[#A1A1AA] mb-1">Descreva o que está acontecendo</label>
                <textarea
                  rows={4}
                  required
                  value={supportMessage}
                  onChange={e => setSupportMessage(e.target.value)}
                  placeholder="Explique detalhadamente como podemos ajudar..."
                  className="w-full bg-[#161624] border border-[#282838] rounded-2xl p-3 text-xs text-white placeholder-[#52525B] focus:border-[#00E676] focus:outline-none"
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-[#00E676] to-[#00C853] hover:from-[#00C853] hover:to-[#00B248] text-black font-black text-xs rounded-2xl shadow-[0_0_15px_rgba(0,230,118,0.4)] transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                <span>ENVIAR CHAMADO PRIORITÁRIO</span>
              </motion.button>

              <AnimatePresence>
                {supportSent && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0, y: -10 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -10 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className="p-4 bg-[#00E676]/20 border border-[#00E676] rounded-2xl text-xs text-[#00E676] font-bold flex items-center gap-2 overflow-hidden"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Chamado #{Math.floor(1000 + Math.random() * 9000)} aberto com sucesso! Nossa equipe responderá em instantes.</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </div>

          <div className="pt-4 border-t border-[#20202E] space-y-2 text-xs text-[#A1A1AA]">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#00E676]" />
              <span>WhatsApp Prioritário: (11) 98765-4321</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#FFC72C]" />
              <span>Criptografia ponta a ponta & Backup a cada 5m</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
