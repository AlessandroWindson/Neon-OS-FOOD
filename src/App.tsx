import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Crown, ShieldAlert, LogOut } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { CommandPalette } from './components/CommandPalette';
import { LandingPage } from './components/LandingPage';
import { AuthModal } from './components/AuthModal';
import { OnboardingWizard } from './components/OnboardingWizard';
import { OverviewBI } from './components/OverviewBI';
import { PDVInteligente } from './components/PDVInteligente';
import { MapaMesasComandas } from './components/MapaMesasComandas';
import { AtendenteMobile } from './components/AtendenteMobile';
import { CentralPedidos } from './components/CentralPedidos';
import { KDSKitchen } from './components/KDSKitchen';
import { GestaoProdutos } from './components/GestaoProdutos';
import { CardapioDigitalCliente } from './components/CardapioDigitalCliente';
import { MobileExperience } from './components/MobileExperience';
import { GestaoEntregasDelivery } from './components/GestaoEntregasDelivery';
import { CentralIntegracoesMarketplace } from './components/CentralIntegracoesMarketplace';
import { EstoqueCMV } from './components/EstoqueCMV';
import { GamificacaoEquipe } from './components/GamificacaoEquipe';
import { GestaoEquipe } from './components/GestaoEquipe';
import { FinanceiroDRE } from './components/FinanceiroDRE';
import { DashboardFinanceiro } from './components/DashboardFinanceiro';
import { FidelidadeCRM } from './components/FidelidadeCRM';
import { FranquiasMultiunidades } from './components/FranquiasMultiunidades';
import { ConfiguracoesParametros } from './components/ConfiguracoesParametros';
import { AuditoriaSuporte } from './components/AuditoriaSuporte';
import { SuperAdminSaaS } from './components/SuperAdminSaaS';
import { ConfiguracaoGatewayPagamento } from './components/ConfiguracaoGatewayPagamento';
import { GerenciamentoImpressoras } from './components/GerenciamentoImpressoras';
import { ThermalPrintModal } from './components/ThermalPrintModal';
import { ExportacaoDadosOperacionaisModal } from './components/ExportacaoDadosOperacionaisModal';
import { AICopilotModal } from './components/AICopilotModal';
import { WebhookSimulationModal } from './components/WebhookSimulationModal';
import { OfflineBanner } from './components/OfflineBanner';
import { OfflineSyncModal } from './components/OfflineSyncModal';
import { MeuPlanoModal } from './components/MeuPlanoModal';
import { AccessRestricted } from './components/AccessRestricted';
import { CompanyActivationGate } from './components/CompanyActivationGate';

interface ViewTheme {
  color: string;
  label: string;
}

const VIEW_THEMES: Record<string, ViewTheme> = {
  overview_bi: { color: '#FFC72C', label: 'Visão Geral' },
  cardapio_digital: { color: '#FF7A00', label: 'Cardápio Online' },
  cardapio_bcg: { color: '#F59E0B', label: 'Gestão de Cardápio' },
  central_pedidos: { color: '#FF3030', label: 'Central de Pedidos' },
  pdv: { color: '#00D26A', label: 'Vendas & Caixa' },
  mesas_comandas: { color: '#38C9FF', label: 'Mesas & Comandas' },
  atendente_mobile: { color: '#FB923C', label: 'Atendente Mobile' },
  kds: { color: '#FF5722', label: 'Cozinha em Tempo Real' },
  delivery_gestao: { color: '#00B8FF', label: 'Entregas & Delivery' },
  mobile_exp: { color: '#A855F7', label: 'Experiência Mobile' },
  estoque_cmv: { color: '#F59E0B', label: 'Estoque & Custos' },
  gamificacao: { color: '#EAB308', label: 'Equipe & Metas' },
  gestao_equipe: { color: '#FFC72C', label: 'Gestão de Funcionários' },
  financeiro_dre: { color: '#8B5CF6', label: 'Financeiro & DRE' },
  dashboard_financeiro: { color: '#00E676', label: 'Pix vs Cartão' },
  fidelidade: { color: '#EC4899', label: 'Clientes & Fidelidade' },
  franquias: { color: '#6366F1', label: 'Minhas Filiais' },
  configuracoes: { color: '#94A3B8', label: 'Configurações' },
  gateway_pagamentos: { color: '#00D26A', label: 'Gateways de Pagamento' },
  gerenciamento_impressoras: { color: '#38BDF8', label: 'Gerenciamento de Impressoras' },
  auditoria: { color: '#14B8A6', label: 'Histórico & Segurança' },
  central_integracoes: { color: '#EA1D2C', label: 'Integrações & Marketplaces' },
  super_admin: { color: '#DA291C', label: 'Super Admin' },
  acesso_negado: { color: '#EF4444', label: 'Acesso Negado' },
};

const MainLayout: React.FC = () => {
  const { 
    currentView, 
    setCurrentView, 
    switchRole, 
    activePageColor, 
    isWebhookModalOpen, 
    setIsWebhookModalOpen, 
    isExportModalOpen,
    setIsExportModalOpen,
    exportModalInitialTab,
    currentUser,
    isCompanyActive,
    tenant,
    isSupportMode,
    supportAdminName,
    supportAccountName,
    exitSupportMode,
    isSuperAdminAuthorized,
    superAdminDenialReason,
  } = useApp();
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isMeuPlanoOpen, setIsMeuPlanoOpen] = useState(false);

  const activeColor = activePageColor || VIEW_THEMES[currentView]?.color || '#DA291C';

  // Granular RBAC Role checks aligned with Firestore Security Rules
  const role = currentUser.role || 'owner';
  const isAdmin = ['super_admin', 'owner', 'admin'].includes(role);
  const isManager = ['manager', 'gerente'].includes(role);
  const isCashier = ['cashier', 'waiter', 'driver'].includes(role);
  const isKitchen = ['kitchen'].includes(role);

  const canAccessFinances = isAdmin || isManager;
  const canAccessStaffManagement = isAdmin || isManager;
  const canAccessPDV = !isKitchen; // Kitchen only uses KDS and production queue

  // Secure RBAC Guard: automatically redirect unauthorized attempts to 'acesso_negado'
  useEffect(() => {
    if (currentView === 'super_admin' && !isSuperAdminAuthorized) {
      setCurrentView('acesso_negado');
    }
  }, [currentView, isSuperAdminAuthorized, setCurrentView]);

  // Full-screen views without default app shell (Landing, Auth, Onboarding)
  if (currentView === 'landing') {
    return (
      <div className="min-h-screen bg-[#070709] text-white flex flex-col justify-between">
        {/* Barra Superior Fixa de Retorno / Navegação Rápida */}
        <header 
          className="sticky top-0 bg-[#0B0B13]/95 backdrop-blur-md border-b border-zinc-800 px-4 py-2.5 flex items-center justify-between shadow-lg"
          style={{ zIndex: 9999 }}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentView('overview_bi')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#DA291C] to-[#FF7A00] text-white text-xs font-black hover:opacity-90 transition-all cursor-pointer shadow-md"
              title="Voltar ao Painel da Loja"
            >
              <span>← Voltar ao Sistema (Painel da Loja)</span>
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-300 font-bold hidden md:inline">
              Página de Vendas & Apresentação Comercial
            </span>
            <button
              onClick={() => setCurrentView('login_auth')}
              className="text-xs font-bold text-emerald-400 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
            >
              Entrar / Cadastrar
            </button>
          </div>
        </header>

        <LandingPage />
        <ThermalPrintModal />
        <AICopilotModal />
        <WebhookSimulationModal isOpen={isWebhookModalOpen} onClose={() => setIsWebhookModalOpen(false)} />
        <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} />
        <MeuPlanoModal isOpen={isMeuPlanoOpen} onClose={() => setIsMeuPlanoOpen(false)} />
      </div>
    );
  }

  if (currentView === 'auth' || (currentView as string) === 'login_auth') {
    return (
      <div className="min-h-screen bg-[#09090B] text-[#F4F4F5] flex flex-col justify-between">
        {/* Barra Superior com Retorno ao Sistema */}
        <header 
          className="sticky top-0 bg-[#0B0B13]/95 backdrop-blur-md border-b border-zinc-800 px-4 py-2.5 flex items-center justify-between shadow-lg"
          style={{ zIndex: 9999 }}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentView('overview_bi')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition-all cursor-pointer"
            >
              <span>← Voltar ao Sistema (Painel da Loja)</span>
            </button>
          </div>
          <button
            onClick={() => setCurrentView('landing')}
            className="text-xs text-[#FFC72C] hover:underline font-bold cursor-pointer"
          >
            Ver Página de Vendas →
          </button>
        </header>

        <div className="flex-1 flex items-center justify-center p-4">
          <AuthModal />
        </div>
        <ThermalPrintModal />
        <AICopilotModal />
        <WebhookSimulationModal isOpen={isWebhookModalOpen} onClose={() => setIsWebhookModalOpen(false)} />
        <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} />
        <MeuPlanoModal isOpen={isMeuPlanoOpen} onClose={() => setIsMeuPlanoOpen(false)} />
      </div>
    );
  }

  if (currentView === 'onboarding') {
    return (
      <div className="min-h-screen bg-[#09090B] text-[#F4F4F5] flex flex-col justify-between">
        <header 
          className="sticky top-0 bg-[#0B0B13]/95 backdrop-blur-md border-b border-zinc-800 px-4 py-2.5 flex items-center justify-between shadow-lg"
          style={{ zIndex: 9999 }}
        >
          <button
            onClick={() => setCurrentView('overview_bi')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition-all cursor-pointer"
          >
            <span>← Voltar ao Painel da Loja</span>
          </button>
          <div className="text-xs text-[#FFC72C] font-bold">
            Passo a Passo de Configuração Inicial
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-4">
          <OnboardingWizard />
        </div>
        <ThermalPrintModal />
        <AICopilotModal />
        <WebhookSimulationModal isOpen={isWebhookModalOpen} onClose={() => setIsWebhookModalOpen(false)} />
        <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} />
        <MeuPlanoModal isOpen={isMeuPlanoOpen} onClose={() => setIsMeuPlanoOpen(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090D] text-[#F4F4F5] flex flex-col selection:bg-[#DA291C] selection:text-white font-sans">
      {/* Banner Permanente de Impersonação / Suporte Administrativo do Super Admin */}
      {isSupportMode && (
        <aside 
          role="region"
          aria-label="Aviso de Suporte Administrativo"
          className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white px-4 py-2.5 shadow-xl flex flex-wrap items-center justify-between gap-3 z-50 border-b border-amber-400/40 sticky top-0"
        >
          <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
            <ShieldAlert className="w-4 h-4 text-amber-200 shrink-0 animate-pulse" />
            <span className="font-bold">Você está acessando esta conta em modo de suporte administrativo.</span>
            <span className="hidden md:inline text-amber-200">•</span>
            <span className="hidden md:inline font-medium">Super Admin: <strong className="text-white font-black">{supportAdminName || 'Super Administrador'}</strong></span>
            <span className="hidden md:inline text-amber-200">•</span>
            <span className="hidden md:inline font-medium">Conta acessada: <strong className="text-white font-black">{supportAccountName || tenant?.name || 'Restaurante'}</strong></span>
          </div>
          <button
            onClick={exitSupportMode}
            className="px-3.5 py-1.5 bg-black/50 hover:bg-black/80 text-white text-xs font-black rounded-xl border border-white/30 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-md hover:scale-105 ml-auto sm:ml-0"
            title="Encerrar impersonação e retornar ao Super Admin"
          >
            <span>Encerrar acesso de suporte</span>
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </aside>
      )}

      {/* Top Navbar: Compact, Uncluttered, Essential Controls Only */}
      <Navbar 
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)} 
        onOpenMeuPlano={() => setIsMeuPlanoOpen(true)}
        onOpenHelp={() => setCurrentView('auditoria')}
      />

      {/* Dynamic Ambient Neon Accent Line reflecting active page theme */}
      <div 
        className="h-[2px] w-full transition-all duration-500 relative z-30"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${activeColor} 50%, transparent 100%)`,
          boxShadow: `0 0 16px ${activeColor}`
        }}
      />

      {/* Offline Contingency & Resilience Banner */}
      <OfflineBanner />

      {/* Main Workspace: Desktop Sidebar + Central Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <Sidebar 
          onOpenMeuPlano={() => setIsMeuPlanoOpen(true)}
          onOpenWhatsApp={() => window.open("https://wa.me/5511987654321?text=Ol%C3%A1%20Suporte%20Neon%20Food%20OS", "_blank")}
        />

        {/* Content View with subtle page ambient lighting */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3.5 sm:p-5 md:p-8 pb-28 sm:pb-32 md:pb-12 bg-[#09090D] scrollbar-thin relative">
          {/* Subtle Ambient Radial Glow of the Active Page */}
          <div 
            className="fixed top-14 right-0 left-0 md:left-56 h-64 pointer-events-none transition-all duration-700 opacity-20 z-0"
            style={{
              background: `radial-gradient(ellipse 60% 70% at 50% -10%, ${activeColor}, transparent)`
            }}
          />

          <div className="max-w-7xl mx-auto w-full relative z-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={!isCompanyActive && currentView !== 'super_admin' ? 'activation_gate' : currentView}
                initial={{ opacity: 0, y: 8, scale: 0.995 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.995 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="w-full"
              >
                {!isCompanyActive && currentView !== 'super_admin' ? (
                  <CompanyActivationGate />
                ) : (
                  <>
                    {currentView === 'overview_bi' && <OverviewBI />}
                    {currentView === 'pdv' && (
                      canAccessPDV 
                        ? <PDVInteligente /> 
                        : <AccessRestricted viewName="Frente de Caixa (PDV)" requiredRoles={['Atendente', 'Gerente', 'Admin']} />
                    )}
                    {currentView === 'mesas_comandas' && (
                      canAccessPDV 
                        ? <MapaMesasComandas /> 
                        : <AccessRestricted viewName="Mapa de Mesas & Comandas" requiredRoles={['Atendente', 'Gerente', 'Admin']} />
                    )}
                    {currentView === 'atendente_mobile' && <AtendenteMobile />}
                    {currentView === 'central_pedidos' && <CentralPedidos />}
                    {currentView === 'kds' && <KDSKitchen />}
                    {currentView === 'cardapio_digital' && <CardapioDigitalCliente />}
                    {currentView === 'cardapio_bcg' && <GestaoProdutos />}
                    {currentView === 'delivery_gestao' && <GestaoEntregasDelivery />}
                    {currentView === 'central_integracoes' && <CentralIntegracoesMarketplace />}
                    {currentView === 'mobile_exp' && <MobileExperience />}
                    {currentView === 'estoque_cmv' && <EstoqueCMV />}
                    {currentView === 'gamificacao' && <GamificacaoEquipe />}
                    {currentView === 'gestao_equipe' && (
                      canAccessStaffManagement 
                        ? <GestaoEquipe /> 
                        : <AccessRestricted viewName="Gestão de Funcionários & Escalas" requiredRoles={['Admin', 'Gerente']} />
                    )}
                    {currentView === 'financeiro_dre' && (
                      canAccessFinances 
                        ? <FinanceiroDRE /> 
                        : <AccessRestricted viewName="Financeiro DRE & Lucratividade Real" requiredRoles={['Admin', 'Gerente']} />
                    )}
                    {currentView === 'dashboard_financeiro' && (
                      canAccessFinances 
                        ? <DashboardFinanceiro /> 
                        : <AccessRestricted viewName="Dashboard Financeiro & Meios de Pagamento" requiredRoles={['Admin', 'Gerente']} />
                    )}
                    {currentView === 'fidelidade' && <FidelidadeCRM />}
                    {currentView === 'franquias' && (
                      isAdmin 
                        ? <FranquiasMultiunidades /> 
                        : <AccessRestricted viewName="Multiunidades & Franquias" requiredRoles={['Admin']} />
                    )}
                    {currentView === 'configuracoes' && (
                      isAdmin || isManager 
                        ? <ConfiguracoesParametros /> 
                        : <AccessRestricted viewName="Configurações & Parâmetros do Restaurante" requiredRoles={['Admin', 'Gerente']} />
                    )}
                    {currentView === 'gateway_pagamentos' && (
                      isAdmin || isManager 
                        ? <ConfiguracaoGatewayPagamento /> 
                        : <AccessRestricted viewName="Gateways de Pagamento & Conciliação" requiredRoles={['Admin', 'Gerente']} />
                    )}
                    {currentView === 'gerenciamento_impressoras' && <GerenciamentoImpressoras />}
                    {currentView === 'auditoria' && (
                      canAccessStaffManagement 
                        ? <AuditoriaSuporte /> 
                        : <AccessRestricted viewName="Auditoria & Histórico de Operações" requiredRoles={['Admin', 'Gerente']} />
                    )}
                    {currentView === 'super_admin' && (
                      isSuperAdminAuthorized 
                        ? <SuperAdminSaaS /> 
                        : <AccessRestricted 
                            viewName="Super Admin SaaS (Central de Comando)" 
                            requiredRoles={['Super Admin']} 
                            isSuperAdminDenied={true}
                            denialReason={superAdminDenialReason}
                          />
                    )}
                    {currentView === 'acesso_negado' && (
                      <AccessRestricted 
                        viewName="Super Admin SaaS (Central de Comando)" 
                        requiredRoles={['Super Admin']} 
                        isSuperAdminDenied={true}
                        denialReason={superAdminDenialReason}
                      />
                    )}
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (md:hidden) */}
      <BottomNav 
        onOpenMeuPlano={() => setIsMeuPlanoOpen(true)}
        onOpenShare={() => window.open("https://wa.me/?text=Confira%20o%20nosso%20card%C3%A1pio%20digital!", "_blank")}
      />

      {/* Modals & Dialogs */}
      <ThermalPrintModal />
      <ExportacaoDadosOperacionaisModal 
        isOpen={isExportModalOpen} 
        onClose={() => setIsExportModalOpen(false)} 
        initialTab={exportModalInitialTab} 
      />
      <AICopilotModal />
      <WebhookSimulationModal isOpen={isWebhookModalOpen} onClose={() => setIsWebhookModalOpen(false)} />
      <OfflineSyncModal />
      <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} />
      <MeuPlanoModal isOpen={isMeuPlanoOpen} onClose={() => setIsMeuPlanoOpen(false)} />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
