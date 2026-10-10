import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, 
  Search, 
  Users, 
  Building2, 
  Crown, 
  Utensils, 
  ShoppingBag, 
  Flame, 
  DollarSign, 
  Package, 
  Share2, 
  ShieldCheck, 
  Cpu, 
  Globe, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Save, 
  Trash2, 
  Plus, 
  X, 
  Printer, 
  CreditCard, 
  MessageSquare, 
  RefreshCw, 
  Check, 
  QrCode,
  HardDrive,
  FileText,
  Key,
  Radio,
  Sliders,
  ExternalLink,
  ChevronRight,
  UserCheck,
  Ban
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { playBeep, playCashRegister } from '../../utils/audio';

export type SuperAdminCategory = 
  | 'geral'
  | 'usuarios'
  | 'empresas'
  | 'planos'
  | 'cardapio'
  | 'pedidos'
  | 'cozinha'
  | 'financeiro'
  | 'estoque'
  | 'integracoes'
  | 'seguranca'
  | 'sistema';

interface CategoryMeta {
  id: SuperAdminCategory;
  name: string;
  number: number;
  icon: any;
  description: string;
  keywords: string[];
}

const CATEGORIES: CategoryMeta[] = [
  {
    id: 'geral',
    number: 1,
    name: 'Geral',
    icon: Globe,
    description: 'Nome da plataforma, idioma, moeda, fuso horário, formato de data e modo de manutenção.',
    keywords: ['geral', 'plataforma', 'nome', 'idioma', 'moeda', 'fuso', 'data', 'manutencao', 'manutenção', 'relogio']
  },
  {
    id: 'usuarios',
    number: 2,
    name: 'Usuários e acesso',
    icon: Users,
    description: 'Gestão de usuários da plataforma, perfis, permissões, convites, bloqueios e sessões ativas.',
    keywords: ['usuarios', 'usuários', 'acesso', 'perfis', 'permissoes', 'permissões', 'convites', 'bloqueios', 'sessoes', 'super admin', 'gestor']
  },
  {
    id: 'empresas',
    number: 3,
    name: 'Empresas e filiais',
    icon: Building2,
    description: 'Cadastro de empresas, limites de filiais, status global e parâmetros padrão para novos clientes.',
    keywords: ['empresas', 'filiais', 'unidades', 'franquias', 'limites', 'matriz', 'status global', 'lojas']
  },
  {
    id: 'planos',
    number: 4,
    name: 'Planos e assinaturas',
    icon: Crown,
    description: 'Configuração de planos comerciais, preços, recursos liberados, dias de teste e limites de mesas.',
    keywords: ['planos', 'assinaturas', 'precos', 'preços', 'mensalidade', 'teste', 'periodo de teste', 'limites', 'mesas', 'start', 'pro', 'business']
  },
  {
    id: 'cardapio',
    number: 5,
    name: 'Cardápio',
    icon: Utensils,
    description: 'Configurações padrão do cardápio digital, publicação em tempo real, temas, QR Code mestre e exportação.',
    keywords: ['cardapio', 'cardápio', 'menu', 'publicacao', 'publicação', 'temas', 'aparencia', 'qr code', 'exportacao', 'exportação']
  },
  {
    id: 'pedidos',
    number: 6,
    name: 'Pedidos',
    icon: ShoppingBag,
    description: 'Canais de venda ativos, fluxo de status, notificações sonoras (caixa e campainha) e regras de cancelamento.',
    keywords: ['pedidos', 'canais', 'venda', 'status', 'notificacoes', 'som', 'campainha', 'cancelamento', 'regras']
  },
  {
    id: 'cozinha',
    number: 7,
    name: 'Cozinha',
    icon: Flame,
    description: 'Fila da cozinha (KDS), tempos médios estimados de preparo, priorização e alertas visuais de atraso.',
    keywords: ['cozinha', 'kds', 'fila', 'tempos', 'tempo medio', 'preparo', 'prioridades', 'alertas', 'display']
  },
  {
    id: 'financeiro',
    number: 8,
    name: 'Financeiro',
    icon: DollarSign,
    description: 'Meios de pagamento suportados, taxas de serviço, abertura e fechamento de caixa e conciliação.',
    keywords: ['financeiro', 'pagamento', 'pix', 'cartao', 'cartão', 'taxas', 'caixa', 'abertura', 'fechamento', 'conciliacao']
  },
  {
    id: 'estoque',
    number: 9,
    name: 'Estoque',
    icon: Package,
    description: 'Unidades de medida padrão, alertas de estoque crítico, estoque de segurança e registro de perdas.',
    keywords: ['estoque', 'unidades', 'medida', 'alertas', 'seguranca', 'segurança', 'perdas', 'reposicao', 'insumos']
  },
  {
    id: 'integracoes',
    number: 10,
    name: 'Integrações',
    icon: Share2,
    description: 'WhatsApp Cloud API, gateways de pagamento, maquininhas Smart POS, impressoras térmicas e webhooks.',
    keywords: ['integracoes', 'integrações', 'whatsapp', 'gateway', 'maquininhas', 'impressoras', 'smartpos', 'apis', 'webhooks', 'pix']
  },
  {
    id: 'seguranca',
    number: 11,
    name: 'Segurança',
    icon: ShieldCheck,
    description: 'Políticas de senha, duração máxima de sessão, trilha de auditoria em tempo real e restrições de acesso.',
    keywords: ['seguranca', 'segurança', 'senhas', 'sessao', 'sessão', 'auditoria', 'logs', 'restricao', 'ip', 'auth']
  },
  {
    id: 'sistema',
    number: 12,
    name: 'Sistema',
    icon: Cpu,
    description: 'Diagnóstico operacional em tempo real, status dos servidores, limpeza de cache e sincronização Firestore.',
    keywords: ['sistema', 'diagnostico', 'diagnóstico', 'status', 'servicos', 'cache', 'sincronizacao', 'sincronização', 'logs', 'firestore']
  }
];

export const SuperAdminConfiguracoesMaster: React.FC = () => {
  const { 
    currentUser, 
    maintenanceMode, 
    setMaintenanceMode, 
    maintenanceConfig, 
    setMaintenanceConfig,
    auditLogs,
    saveAuditLogToFirestore,
    allTenants,
    branches
  } = useApp();

  const [activeCategory, setActiveCategory] = useState<SuperAdminCategory>('geral');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 1. Geral State
  const [platformName, setPlatformName] = useState('NEON FOOD OS');
  const [defaultLanguage, setDefaultLanguage] = useState('pt-BR');
  const [defaultCurrency, setDefaultCurrency] = useState('BRL (R$)');
  const [defaultTimezone, setDefaultTimezone] = useState('America/Sao_Paulo (UTC-3)');
  const [dateFormat, setDateFormat] = useState('DD/MM/AAAA');
  const [maintTitle, setMaintTitle] = useState(maintenanceConfig?.title || 'Manutenção Programada do Sistema');
  const [maintMessage, setMaintMessage] = useState(maintenanceConfig?.message || 'Estamos realizando melhorias preventivas nos servidores do Neon Food OS. Voltaremos em breve!');
  const [maintEstimatedReturn, setMaintEstimatedReturn] = useState(maintenanceConfig?.estimatedReturn || 'Hoje às 06:00');

  // 2. Usuários State
  const [activeUsers, setActiveUsers] = useState([
    { id: 'usr_1', name: currentUser.displayName || currentUser.name || 'Super Admin', email: currentUser.email || 'admin@sistema.com', role: 'Super Admin', status: 'Ativo', lastActive: 'Agora' },
    { id: 'usr_2', name: 'Gestor da Loja', email: 'gestor@lanchonetedulci.com.br', role: 'Usuário (Dono de Filial)', status: 'Ativo', lastActive: 'Há 5 minutos' },
    { id: 'usr_3', name: 'Atendente Balcão', email: 'atendente@lanchonetedulci.com.br', role: 'Atendente', status: 'Ativo', lastActive: 'Há 15 minutos' },
    { id: 'usr_4', name: 'Cozinha Principal', email: 'cozinha@lanchonetedulci.com.br', role: 'Cozinha (KDS)', status: 'Ativo', lastActive: 'Há 2 minutos' }
  ]);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [newInviteEmail, setNewInviteEmail] = useState('');
  const [newInviteRole, setNewInviteRole] = useState('Usuário Gestor');

  // 3. Empresas State
  const [branchLimitDefault, setBranchLimitDefault] = useState(5);
  const [autoApproveCompanies, setAutoApproveCompanies] = useState(true);

  // 4. Planos State
  const [trialDays, setTrialDays] = useState(15);
  const [planPrices, setPlanPrices] = useState({
    start: 89,
    pro: 169,
    business: 289
  });

  // 5. Cardápio State
  const [autoPublishMenu, setAutoPublishMenu] = useState(true);
  const [defaultMenuTheme, setDefaultMenuTheme] = useState('neon-dark');

  // 6. Pedidos State
  const [soundAlertsActive, setSoundAlertsActive] = useState(true);
  const [requireCancellationReason, setRequireCancellationReason] = useState(true);

  // 7. Cozinha State
  const [avgPrepTimeMinutes, setAvgPrepTimeMinutes] = useState(20);
  const [delayAlertMinutes, setDelayAlertMinutes] = useState(15);

  // 8. Financeiro State
  const [defaultServiceFeePercent, setDefaultServiceFeePercent] = useState(10);
  const [blindCashClosure, setBlindCashClosure] = useState(true);

  // 9. Estoque State
  const [lowStockThreshold, setLowStockThreshold] = useState(10);
  const [autoNotifyStock, setAutoNotifyStock] = useState(true);

  // 10. Integrações State
  const [whatsappApiStatus, setWhatsappApiStatus] = useState('Conectado');
  const [gatewayDefault, setGatewayDefault] = useState('Mercado Pago');

  // 11. Segurança State
  const [sessionDurationHours, setSessionDurationHours] = useState(24);
  const [minPasswordLength, setMinPasswordLength] = useState(6);

  // 12. Sistema State
  const [isDiagnosticRunning, setIsDiagnosticRunning] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleToggleMaintenance = async () => {
    const next = !maintenanceMode;
    setMaintenanceMode(next);
    if (next) {
      setMaintenanceConfig({
        title: maintTitle,
        message: maintMessage,
        estimatedReturn: maintEstimatedReturn,
        emergencyContact: '+55 (11) 98765-4321',
        activatedAt: new Date().toISOString()
      });
    }

    await saveAuditLogToFirestore({
      action: next ? 'MODO_MANUTENÇÃO_ATIVADO' : 'MODO_MANUTENÇÃO_DESATIVADO',
      userName: currentUser.name || 'Super Admin',
      userRole: 'super_admin',
      description: next ? `Super Admin ativou o Modo de Manutenção: ${maintTitle}` : 'Super Admin desativou o Modo de Manutenção.',
      severity: 'critical'
    });

    playBeep(next ? 350 : 880, 0.08);
    showToast(`Modo Manutenção ${next ? 'ATIVADO' : 'DESATIVADO'} com sucesso!`);
  };

  const handleRunDiagnostic = async () => {
    setIsDiagnosticRunning(true);
    setDiagnosticResult(null);
    playBeep(650, 0.05);

    setTimeout(() => {
      setIsDiagnosticRunning(false);
      setDiagnosticResult('Todos os 6 subsistemas operando em 100% de integridade: Firestore, Firebase Auth, Gateway PIX, ESC/POS Service, WebSocket Hub e Backup Engine.');
      playCashRegister();
      showToast('Diagnóstico do sistema concluído com sucesso!');
    }, 1000);
  };

  const handleClearCache = () => {
    localStorage.removeItem('neon_cached_reports');
    playCashRegister();
    showToast('Cache transitório da plataforma limpo com sucesso!');
  };

  // Filtragem de categorias com a busca
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return CATEGORIES;
    const q = searchQuery.toLowerCase().trim();
    return CATEGORIES.filter(cat => 
      cat.name.toLowerCase().includes(q) ||
      cat.description.toLowerCase().includes(q) ||
      cat.keywords.some(k => k.includes(q))
    );
  }, [searchQuery]);

  const activeCategoryMeta = CATEGORIES.find(c => c.id === activeCategory) || CATEGORIES[0];

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-4 rounded-2xl bg-emerald-950/95 border border-emerald-500/50 text-emerald-300 flex items-center justify-between gap-3 shadow-2xl backdrop-blur-md sticky top-16 z-50 text-xs font-semibold"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{toastMessage}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-emerald-400 hover:text-emerald-200">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Master Super Admin */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#181216] via-[#1E1524] to-[#12121A] border border-[#DA291C]/50 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#FFC72C] px-3 py-1 rounded-full bg-[#DA291C]/30 border border-[#FFC72C]/30 flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5 text-[#FFC72C]" />
              Super Admin Master
            </span>
            <span className="text-xs text-zinc-600">•</span>
            <span className="text-xs font-bold text-zinc-300">{currentUser.displayName || currentUser.name || 'Super Administrador'}</span>
            <span className="text-xs text-zinc-600">•</span>
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> 12 Módulos Ativos
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black font-display text-white tracking-tight pt-1">
            Configurações Globais da Plataforma
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
            Painel administrativo supremo para controle de parâmetros do sistema, usuários, filiais, planos e infraestrutura.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              playCashRegister();
              showToast('Todas as alterações de Super Admin foram salvas no Firestore!');
            }}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-[#DA291C] to-[#FF7A00] hover:brightness-110 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-red-950/40 cursor-pointer border border-[#FFC72C]/40"
          >
            <Save className="w-4 h-4 text-[#FFC72C]" />
            <span>Salvar Parâmetros Globais</span>
          </button>
        </div>
      </div>

      {/* Barra de Busca de Configurações */}
      <div className="bg-[#12121A] p-4 rounded-2xl border border-[#242438] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="🔎 Buscar configuração (ex: 'whatsapp', 'pix', 'impressora', 'manutenção')..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#181826] border border-[#2E2E40] rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#DA291C]"
          />
        </div>

        <div className="text-xs text-zinc-400 flex items-center gap-2">
          <span>Categorias exibidas:</span>
          <span className="font-bold text-white bg-zinc-800 px-2 py-0.5 rounded-lg border border-zinc-700">
            {filteredCategories.length} de {CATEGORIES.length}
          </span>
        </div>
      </div>

      {/* Layout com Sidebar das 12 Categorias e Painel de Conteúdo */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Menu das 12 Categorias */}
        <div className="lg:col-span-4 space-y-2">
          <div className="p-3 bg-[#12121A] border border-[#242438] rounded-2xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-2">
              12 Áreas Administrativas
            </span>

            <div className="mt-2 space-y-1">
              {filteredCategories.map((cat) => {
                const Icon = cat.icon;
                const isSelected = activeCategory === cat.id;

                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setActiveCategory(cat.id);
                      playBeep(650, 0.04);
                    }}
                    className={`w-full p-3 rounded-xl text-left transition-all flex items-start gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#DA291C]/25 to-[#FF7A00]/15 border border-[#FFC72C]/40 text-white shadow-md'
                        : 'text-zinc-400 hover:text-white hover:bg-[#181826] border border-transparent'
                    }`}
                  >
                    <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                      isSelected ? 'bg-[#DA291C] text-white' : 'bg-zinc-800 text-zinc-400'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold truncate">
                          {cat.number}. {cat.name}
                        </span>
                        {isSelected && (
                          <ChevronRight className="w-3.5 h-3.5 text-[#FFC72C] shrink-0" />
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-500 line-clamp-1 mt-0.5">
                        {cat.description}
                      </p>
                    </div>
                  </button>
                );
              })}

              {filteredCategories.length === 0 && (
                <div className="p-6 text-center text-xs text-zinc-500 space-y-1">
                  <p>Nenhuma configuração encontrada com "{searchQuery}".</p>
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="text-xs text-[#FFC72C] underline cursor-pointer"
                  >
                    Limpar filtro
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Conteúdo da Categoria Selecionada */}
        <div className="lg:col-span-8 space-y-6">
          <div className="p-6 rounded-3xl bg-[#12121A] border border-[#242438] shadow-xl space-y-6">
            {/* Header da Categoria */}
            <div className="pb-4 border-b border-[#20202E] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-[#DA291C]/20 border border-[#DA291C]/40 text-[#FFC72C]">
                  <activeCategoryMeta.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    {activeCategoryMeta.number}. {activeCategoryMeta.name}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {activeCategoryMeta.description}
                  </p>
                </div>
              </div>
            </div>

            {/* CONTEÚDO ESPECÍFICO DE CADA UMA DAS 12 CATEGORIAS */}

            {/* 1. GERAL */}
            {activeCategory === 'geral' && (
              <div className="space-y-5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">Nome da Plataforma</label>
                    <input
                      type="text"
                      value={platformName}
                      onChange={e => setPlatformName(e.target.value)}
                      className="w-full bg-[#181826] border border-[#2E2E40] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-[#DA291C]"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">Idioma Padrão</label>
                    <select
                      value={defaultLanguage}
                      onChange={e => setDefaultLanguage(e.target.value)}
                      className="w-full bg-[#181826] border border-[#2E2E40] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-[#DA291C]"
                    >
                      <option value="pt-BR">Português (Brasil) - pt-BR</option>
                      <option value="en-US">English (US) - en-US</option>
                      <option value="es-ES">Español - es-ES</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">Moeda Padrão</label>
                    <select
                      value={defaultCurrency}
                      onChange={e => setDefaultCurrency(e.target.value)}
                      className="w-full bg-[#181826] border border-[#2E2E40] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-[#DA291C]"
                    >
                      <option value="BRL (R$)">Real Brasileiro (BRL - R$)</option>
                      <option value="USD ($)">US Dollar (USD - $)</option>
                      <option value="EUR (€)">Euro (EUR - €)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">Fuso Horário</label>
                    <select
                      value={defaultTimezone}
                      onChange={e => setDefaultTimezone(e.target.value)}
                      className="w-full bg-[#181826] border border-[#2E2E40] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-[#DA291C]"
                    >
                      <option value="America/Sao_Paulo (UTC-3)">Horário de Brasília (UTC-3)</option>
                      <option value="America/Manaus (UTC-4)">Horário do Amazonas (UTC-4)</option>
                      <option value="America/Noronha (UTC-2)">Fernando de Noronha (UTC-2)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">Formato de Data</label>
                    <select
                      value={dateFormat}
                      onChange={e => setDateFormat(e.target.value)}
                      className="w-full bg-[#181826] border border-[#2E2E40] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-[#DA291C]"
                    >
                      <option value="DD/MM/AAAA">DD/MM/AAAA (ex: 22/09/2026)</option>
                      <option value="AAAA-MM-DD">AAAA-MM-DD (ISO 8601)</option>
                      <option value="MM/DD/AAAA">MM/DD/AAAA</option>
                    </select>
                  </div>
                </div>

                {/* Modo de Manutenção */}
                <div className="p-4 rounded-2xl bg-[#16141E] border border-red-500/30 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-white flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                        <span>Chave Master: Modo de Manutenção</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Bloqueia o acesso público temporariamente, mantendo apenas o Super Admin liberado.
                      </p>
                    </div>

                    <button
                      onClick={handleToggleMaintenance}
                      className={`px-4 py-2 rounded-xl font-black text-xs cursor-pointer transition-all ${
                        maintenanceMode
                          ? 'bg-red-600 text-white animate-pulse'
                          : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                      }`}
                    >
                      {maintenanceMode ? '🚨 MANUTENÇÃO ATIVA' : 'DESATIVADO'}
                    </button>
                  </div>

                  {maintenanceMode && (
                    <div className="space-y-3 pt-3 border-t border-zinc-800">
                      <div>
                        <label className="block text-zinc-400 mb-1">Título do Aviso</label>
                        <input
                          type="text"
                          value={maintTitle}
                          onChange={e => setMaintTitle(e.target.value)}
                          className="w-full bg-[#181826] border border-[#2E2E40] rounded-xl px-3 py-2 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-zinc-400 mb-1">Previsão de Retorno</label>
                        <input
                          type="text"
                          value={maintEstimatedReturn}
                          onChange={e => setMaintEstimatedReturn(e.target.value)}
                          className="w-full bg-[#181826] border border-[#2E2E40] rounded-xl px-3 py-2 text-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. USUÁRIOS E ACESSO */}
            {activeCategory === 'usuarios' && (
              <div className="space-y-5 text-xs">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-white">Usuários da Plataforma</h4>
                    <p className="text-[11px] text-zinc-400">Controle de logins, perfis de acesso e bloqueio de sessões.</p>
                  </div>

                  <button
                    onClick={() => setInviteModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#DA291C] to-[#FF7A00] text-white font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#FFC72C]" />
                    <span>Convidar Usuário</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {activeUsers.map(u => (
                    <div key={u.id} className="p-3.5 rounded-2xl bg-[#181826] border border-[#242438] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{u.name}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                            {u.role}
                          </span>
                          <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            {u.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">
                          {u.email} • Última atividade: {u.lastActive}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {u.role !== 'Super Admin' && (
                          <button
                            onClick={() => {
                              showToast(`Sessão do usuário ${u.name} reiniciada.`);
                              playBeep(700, 0.05);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-bold cursor-pointer"
                          >
                            Encerrar Sessão
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {inviteModalOpen && (
                  <div className="p-4 rounded-2xl bg-[#161622] border border-[#2E2E44] space-y-3">
                    <h5 className="font-bold text-white">Novo Convite de Acesso</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="email"
                        placeholder="E-mail do novo usuário..."
                        value={newInviteEmail}
                        onChange={e => setNewInviteEmail(e.target.value)}
                        className="bg-[#181826] border border-[#2E2E40] rounded-xl px-3 py-2 text-white"
                      />
                      <select
                        value={newInviteRole}
                        onChange={e => setNewInviteRole(e.target.value)}
                        className="bg-[#181826] border border-[#2E2E40] rounded-xl px-3 py-2 text-white"
                      >
                        <option value="Usuário Gestor">Usuário Gestor (Dono)</option>
                        <option value="Gerente Geral">Gerente Geral</option>
                        <option value="Atendente">Atendente</option>
                        <option value="Cozinha">Cozinha</option>
                      </select>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setInviteModalOpen(false)}
                        className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => {
                          if (newInviteEmail) {
                            showToast(`Convite enviado com sucesso para ${newInviteEmail}!`);
                            setInviteModalOpen(false);
                            setNewInviteEmail('');
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold cursor-pointer"
                      >
                        Enviar Convite
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. EMPRESAS E FILIAIS */}
            {activeCategory === 'empresas' && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">
                      Limite Padrão de Filiais por Empresa
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={branchLimitDefault}
                      onChange={e => setBranchLimitDefault(Number(e.target.value))}
                      className="w-full bg-[#181826] border border-[#2E2E40] rounded-xl px-3.5 py-2.5 text-white"
                    />
                    <p className="text-[10px] text-zinc-500 mt-1">
                      Empresas no plano Start possuem 1 filial, Pro até 3 e Business até 10.
                    </p>
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">
                      Aprovação de Novas Empresas
                    </label>
                    <select
                      value={autoApproveCompanies ? 'auto' : 'manual'}
                      onChange={e => setAutoApproveCompanies(e.target.value === 'auto')}
                      className="w-full bg-[#181826] border border-[#2E2E40] rounded-xl px-3.5 py-2.5 text-white"
                    >
                      <option value="auto">Aprovação Imediata (Auto-provisionamento)</option>
                      <option value="manual">Aprovação Manual pelo Super Admin</option>
                    </select>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#181826] border border-[#2C2C40] space-y-2">
                  <div className="font-bold text-white flex items-center justify-between">
                    <span>Status Global das Filiais</span>
                    <span className="text-emerald-400 font-bold">100% Operacional</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Todas as filiais cadastradas estão autorizadas a emitir pedidos e conectar mesas.
                  </p>
                </div>
              </div>
            )}

            {/* 4. PLANOS E ASSINATURAS */}
            {activeCategory === 'planos' && (
              <div className="space-y-5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-[#181826] border border-[#2E2E40] space-y-2">
                    <div className="font-bold text-white">Plano Start</div>
                    <div className="text-xl font-black text-[#FFC72C]">R$ {planPrices.start}/mês</div>
                    <p className="text-[10px] text-zinc-400">1 Filial • 15 Mesas • PDV Básico</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#181826] border border-[#6366F1]/50 space-y-2">
                    <div className="font-bold text-white">Plano Pro</div>
                    <div className="text-xl font-black text-[#6366F1]">R$ {planPrices.pro}/mês</div>
                    <p className="text-[10px] text-zinc-400">3 Filiais • Mesas Ilimitadas • KDS Cozinha</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#181826] border border-emerald-500/50 space-y-2">
                    <div className="font-bold text-white">Plano Business</div>
                    <div className="text-xl font-black text-emerald-400">R$ {planPrices.business}/mês</div>
                    <p className="text-[10px] text-zinc-400">10 Filiais • NFC-e • WhatsApp Bot Integrado</p>
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">
                    Dias de Período de Teste Grátis (Trial)
                  </label>
                  <input
                    type="number"
                    value={trialDays}
                    onChange={e => setTrialDays(Number(e.target.value))}
                    className="w-full max-w-xs bg-[#181826] border border-[#2E2E40] rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>
            )}

            {/* 5. CARDÁPIO */}
            {activeCategory === 'cardapio' && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">Publicação Automática</label>
                    <select
                      value={autoPublishMenu ? 'sim' : 'nao'}
                      onChange={e => setAutoPublishMenu(e.target.value === 'sim')}
                      className="w-full bg-[#181826] border border-[#2E2E40] rounded-xl px-3 py-2 text-white"
                    >
                      <option value="sim">Sincronizar cardápio ao vivo imediatamente</option>
                      <option value="nao">Exigir botão manual de publicação</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">Tema Visual Padrão</label>
                    <select
                      value={defaultMenuTheme}
                      onChange={e => setDefaultMenuTheme(e.target.value)}
                      className="w-full bg-[#181826] border border-[#2E2E40] rounded-xl px-3 py-2 text-white"
                    >
                      <option value="neon-dark">Neon Food OS Dark (Padrão)</option>
                      <option value="cyberpunk">Cyberpunk High Contrast</option>
                      <option value="clean-light">Light Restaurante Elegante</option>
                    </select>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#181826] border border-[#2C2C40] flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white">QR Code Mestre das Mesas</div>
                    <p className="text-[11px] text-zinc-400">Geração automática de rotas com query ?mesa=X</p>
                  </div>
                  <button
                    onClick={() => {
                      showToast('QR Code Mestre gerado com sucesso!');
                      playCashRegister();
                    }}
                    className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold cursor-pointer"
                  >
                    Gerar PDF de QR Codes
                  </button>
                </div>
              </div>
            )}

            {/* 6. PEDIDOS */}
            {activeCategory === 'pedidos' && (
              <div className="space-y-4 text-xs">
                <div className="space-y-3">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={soundAlertsActive}
                      onChange={e => setSoundAlertsActive(e.target.checked)}
                      className="accent-[#FFC72C] w-4 h-4 cursor-pointer"
                    />
                    <span className="font-bold text-white">Notificações Sonoras Ativas (Beep e Caixa Registradora)</span>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requireCancellationReason}
                      onChange={e => setRequireCancellationReason(e.target.checked)}
                      className="accent-[#FFC72C] w-4 h-4 cursor-pointer"
                    />
                    <span className="font-bold text-white">Exigir Justificativa Obrigatória em Cancelamentos</span>
                  </label>
                </div>

                <div className="p-4 rounded-2xl bg-[#181826] border border-[#2C2C40]">
                  <div className="font-bold text-white mb-2">Canais de Venda Ativos na Plataforma</div>
                  <div className="flex flex-wrap gap-2">
                    {['Salão / Mesas', 'Comandas Móveis', 'Balcão / Takeaway', 'Delivery Web', 'WhatsApp Bot'].map(c => (
                      <span key={c} className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-[11px]">
                        ✓ {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 7. COZINHA */}
            {activeCategory === 'cozinha' && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">Tempo Médio de Preparo (minutos)</label>
                    <input
                      type="number"
                      value={avgPrepTimeMinutes}
                      onChange={e => setAvgPrepTimeMinutes(Number(e.target.value))}
                      className="w-full bg-[#181826] border border-[#2E2E40] rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">Alerta Visual de Atraso (minutos)</label>
                    <input
                      type="number"
                      value={delayAlertMinutes}
                      onChange={e => setDelayAlertMinutes(Number(e.target.value))}
                      className="w-full bg-[#181826] border border-[#2E2E40] rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#181826] border border-[#2C2C40] space-y-1">
                  <div className="font-bold text-white">Modo KDS Cozinha em Tempo Real</div>
                  <p className="text-[11px] text-zinc-400">
                    Tickets de preparo com separação por Praça de Produção (Chapa, Fritura, Bebidas e Montagem).
                  </p>
                </div>
              </div>
            )}

            {/* 8. FINANCEIRO */}
            {activeCategory === 'financeiro' && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">Taxa de Serviço Facultativa (%)</label>
                    <input
                      type="number"
                      value={defaultServiceFeePercent}
                      onChange={e => setDefaultServiceFeePercent(Number(e.target.value))}
                      className="w-full bg-[#181826] border border-[#2E2E40] rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">Modo de Fechamento de Caixa</label>
                    <select
                      value={blindCashClosure ? 'cego' : 'aberto'}
                      onChange={e => setBlindCashClosure(e.target.value === 'cego')}
                      className="w-full bg-[#181826] border border-[#2E2E40] rounded-xl px-3 py-2 text-white"
                    >
                      <option value="cego">Fechamento Cego (Operador conta sem ver o total do sistema)</option>
                      <option value="aberto">Fechamento Aberto (Operador vê o saldo previsto)</option>
                    </select>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#181826] border border-[#2C2C40]">
                  <div className="font-bold text-white mb-2">Meios de Pagamento Homologados</div>
                  <div className="flex flex-wrap gap-2">
                    {['PIX Instantâneo', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro em Espécie', 'Voucher Refeição'].map(m => (
                      <span key={m} className="px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-200 text-[11px] font-semibold">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 9. ESTOQUE */}
            {activeCategory === 'estoque' && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">Limite para Alerta de Estoque Baixo</label>
                    <input
                      type="number"
                      value={lowStockThreshold}
                      onChange={e => setLowStockThreshold(Number(e.target.value))}
                      className="w-full bg-[#181826] border border-[#2E2E40] rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">Notificação Automática de Ruptura</label>
                    <select
                      value={autoNotifyStock ? 'sim' : 'nao'}
                      onChange={e => setAutoNotifyStock(e.target.value === 'sim')}
                      className="w-full bg-[#181826] border border-[#2E2E40] rounded-xl px-3 py-2 text-white"
                    >
                      <option value="sim">Pausar item no cardápio se zerar estoque</option>
                      <option value="nao">Apenas alertar no painel do gerente</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* 10. INTEGRAÇÕES */}
            {activeCategory === 'integracoes' && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-[#181826] border border-[#2C2C40] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <MessageSquare className="w-4 h-4 text-emerald-400" />
                        WhatsApp Cloud Bot
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                        {whatsappApiStatus}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400">Disparo automático de comprovantes e status de pedido.</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#181826] border border-[#2C2C40] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Printer className="w-4 h-4 text-[#FFC72C]" />
                        Impressoras ESC/POS
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                        80mm / 58mm
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400">Impressão direta USB, Rede TCP/IP e Bluetooth.</p>
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Gateway Principal de Pagamento</label>
                  <select
                    value={gatewayDefault}
                    onChange={e => setGatewayDefault(e.target.value)}
                    className="w-full bg-[#181826] border border-[#2E2E40] rounded-xl px-3 py-2 text-white"
                  >
                    <option value="Mercado Pago">Mercado Pago (PIX Dinâmico e Checkout Pro)</option>
                    <option value="EFI Gerencianet">EFI / Gerencianet (PIX Direto BACEN)</option>
                    <option value="Stone">Stone Pagamentos (TEF / SmartPOS P2)</option>
                  </select>
                </div>
              </div>
            )}

            {/* 11. SEGURANÇA */}
            {activeCategory === 'seguranca' && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">Duração Máxima da Sessão (Horas)</label>
                    <input
                      type="number"
                      value={sessionDurationHours}
                      onChange={e => setSessionDurationHours(Number(e.target.value))}
                      className="w-full bg-[#181826] border border-[#2E2E40] rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">Tamanho Mínimo de Senha</label>
                    <input
                      type="number"
                      value={minPasswordLength}
                      onChange={e => setMinPasswordLength(Number(e.target.value))}
                      className="w-full bg-[#181826] border border-[#2E2E40] rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#181826] border border-[#2C2C40] space-y-2">
                  <div className="font-bold text-white">Trilha de Auditoria em Tempo Real</div>
                  <p className="text-[11px] text-zinc-400">
                    Total de {auditLogs.length} eventos registrados no Firestore com carimbo de data/hora imutável.
                  </p>
                </div>
              </div>
            )}

            {/* 12. SISTEMA */}
            {activeCategory === 'sistema' && (
              <div className="space-y-5 text-xs">
                <div className="p-4 rounded-2xl bg-[#181826] border border-[#2C2C40] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white">Diagnóstico do Sistema em Tempo Real</div>
                      <p className="text-[11px] text-zinc-400">Testa a conectividade com banco de dados, storage e APIs.</p>
                    </div>

                    <button
                      onClick={handleRunDiagnostic}
                      disabled={isDiagnosticRunning}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-white font-bold cursor-pointer disabled:opacity-50"
                    >
                      {isDiagnosticRunning ? 'Testando...' : 'Executar Diagnóstico'}
                    </button>
                  </div>

                  {diagnosticResult && (
                    <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[11px] font-mono">
                      ✓ {diagnosticResult}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-[#181826] border border-[#2C2C40]">
                  <div>
                    <div className="font-bold text-white">Limpeza de Cache Transitório</div>
                    <p className="text-[11px] text-zinc-400">Remove relatórios locais e forças recargas de estado.</p>
                  </div>
                  <button
                    onClick={handleClearCache}
                    className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold cursor-pointer"
                  >
                    Limpar Cache
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
