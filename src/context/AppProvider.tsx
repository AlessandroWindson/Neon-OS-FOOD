import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import useSound from 'use-sound';
import alertaPedidoSound from '/alerta-pedido.mp3';
import { 
  User, 
  Tenant, 
  TenantStatus,
  Branch, 
  Product, 
  Ingredient, 
  Order, 
  TableItem, 
  ComandaItem,
  DeliveryDriver, 
  StaffGamification, 
  FinancialEntry, 
  LoyaltyMember, 
  AuditLog, 
  SaaSPlan,
  CashSession,
  UserRole,
  PaymentMethod,
  WebhookNotification,
  WebhookEventPayload,
  WebhookProvider,
  WebhookEventType,
  OrderStatus,
  OrderChannel,
  ProductCategory,
  Supplier,
  Employee,
  Customer,
  SupportTicket,
  TicketMessage,
  TicketPriority,
  TicketStatus,
  TenantRecord,
  SystemAnnouncement,
  MaintenanceSettings,
  BillPayable,
  BillReceivable,
  PurchaseRecord,
  CashMovementRecord,
  FinancialTransaction
} from '../types';
import { 
  saveBranchToFirestore, 
  deleteBranchFromFirestore, 
  saveSupportTicketToFirestore, 
  saveTenantRecordToFirestore,
  saveMaintenanceSettingsToFirestore,
  SUPER_ADMIN_USER, 
  TEST_USER_REGEANE, 
  TEST_TENANT_DULCI,
  INITIAL_PLATFORM_USERS,
  INITIAL_TENANT_RECORDS,
  INITIAL_BRANCHES_DULCI
} from '../services/firebase';
import {
  saveEmpresa,
  saveUnidade,
  saveProduto,
  saveCategoria,
  deleteCategoria,
  savePedido,
  updatePedidoStatus,
  subscribePedidos
} from '../services/multiTenantFirestoreService';
import {
  financialFirestoreService,
  SaleFirestore,
  ExpenseFirestore,
  CashMovementFirestore
} from '../services/financialFirestoreService';
import { orderFinancialTransactionService } from '../services/orderFinancialTransactionListenerService';
import { syncPaymentWebhookToFirestore } from '../services/webhookFirestoreService';
import { 
  mockTenant, 
  mockBranches, 
  mockCurrentUser, 
  mockProducts, 
  mockIngredients, 
  mockSuppliers,
  mockOrders, 
  mockTables, 
  cleanInitialTables,
  mockComandas,
  mockDrivers, 
  mockGamificationStaff, 
  mockFinancialEntries, 
  mockLoyaltyMembers, 
  mockAuditLogs, 
  mockSaaSPlans,
  mockCategories,
  mockEmployees,
  mockCustomers
} from '../data/mockData';
import { DULCI_CATEGORIES, DULCI_PRODUCTS, DULCI_INITIAL_ORDERS } from '../data/lanchoneteDulciData';
import { playKitchenBell, playCashRegister, playBeep, playLevelUp, playLoudOrderAlert } from '../utils/audio';
import { onAuthStateChanged, signOut as fbSignOut } from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc, collection, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { 
  getNotificationPermissionStatus, 
  requestNotificationPermission, 
  sendNewOrderPushAlert, 
  sendOrderCancelledPushAlert, 
  sendPaymentApprovedPushAlert, 
  sendLowStockPushAlert,
  triggerNativePushNotification, 
  NotificationPermissionState 
} from '../utils/pushNotifications';
import { 
  offlineStorage, 
  registerServiceWorkerSync, 
  pingServerHealth, 
  syncBatchWithServer, 
  OfflinePendingAction 
} from '../utils/offlineSync';
import { 
  paymentGatewayService, 
  CardDetailsInput, 
  GatewayTransactionResult 
} from '../services/paymentGatewayService';
import { thermalPrinterService } from '../services/escposService';
import { 
  verifySuperAdminAccessViaFirebase, 
  isFastSuperAdminCheck, 
  checkUserIdSuperAdminClaim,
  SuperAdminAuthVerificationResult 
} from '../services/superAdminAuthGuard';
import { auditService } from '../services/auditService';

export type ActiveView = 
  | 'landing'
  | 'login_auth'
  | 'onboarding'
  | 'overview_bi'
  | 'pdv'
  | 'mesas_comandas'
  | 'atendente_mobile'
  | 'central_pedidos'
  | 'kds'
  | 'cardapio_digital'
  | 'cardapio_bcg'
  | 'delivery_gestao'
  | 'mobile_exp'
  | 'estoque_cmv'
  | 'gestao_equipe'
  | 'gamificacao'
  | 'financeiro_dre'
  | 'dashboard_financeiro'
  | 'fidelidade'
  | 'franquias'
  | 'configuracoes'
  | 'gateway_pagamentos'
  | 'gerenciamento_impressoras'
  | 'auditoria'
  | 'central_integracoes'
  | 'super_admin'
  | 'acesso_negado';

export const VIEW_GLOBAL_COLORS: Record<ActiveView, string> = {
  landing: '#DA291C',
  login_auth: '#DA291C',
  onboarding: '#FFC72C',
  overview_bi: '#FFC72C',       // Amarelo McDonald's Golden Arches
  pdv: '#00D26A',               // Verde Caixa & Vendas
  mesas_comandas: '#38C9FF',     // Azul Salão
  atendente_mobile: '#FB923C',   // Laranja Atendente
  central_pedidos: '#FF3030',    // Vermelho Neon Pedidos
  kds: '#FF5722',               // Chama Cozinha
  cardapio_digital: '#FF7A00',   // Laranja Gastronômico
  cardapio_bcg: '#F59E0B',       // Âmbar Cardápio
  delivery_gestao: '#00B8FF',    // Ciano Entregas
  central_integracoes: '#EA1D2C', // Vermelho Integrações & Marketplaces
  mobile_exp: '#A855F7',         // Roxo Mobile
  estoque_cmv: '#F59E0B',        // Âmbar Estoque
  gestao_equipe: '#FFC72C',      // Amarelo Dourado Gestão de Funcionários
  gamificacao: '#EAB308',        // Ouro Equipe
  financeiro_dre: '#8B5CF6',     // Violeta Financeiro
  dashboard_financeiro: '#00E676', // Verde Neon Pix & Finanças
  gateway_pagamentos: '#00D26A',  // Verde Neon Credenciais & Gateway
  gerenciamento_impressoras: '#38BDF8', // Azul Claro Impressoras Térmicas
  fidelidade: '#EC4899',         // Rosa Fidelidade
  franquias: '#6366F1',          // Índigo Multiunidades
  configuracoes: '#94A3B8',      // Prata Configurações
  auditoria: '#14B8A6',          // Verde-Azulado Auditoria
  super_admin: '#DA291C',        // Vermelho Matriz
  acesso_negado: '#EF4444',      // Vermelho Alerta Acesso Negado
};

export interface AppContextType {
  // Navigation & Current User
  currentView: ActiveView;
  setCurrentView: (view: ActiveView) => void;
  activePageColor: string;
  currentUser: User;
  setCurrentUser: (user: User) => void;
  switchRole: (role: UserRole) => void;
  logout: () => Promise<void>;

  // Super Admin RBAC Security & Verification
  isSuperAdminAuthorized: boolean;
  isCheckingSuperAdminAuth: boolean;
  superAdminDenialReason: string;
  checkSuperAdminAuthorization: (userId?: string) => Promise<boolean>;
  verifySuperAdminAuth: (candidateUser?: User) => Promise<boolean>;
  
  // Multi-tenant & Branches
  tenant: Tenant;
  setTenant: React.Dispatch<React.SetStateAction<Tenant>>;
  updateTenantSettings: (settings: Partial<Tenant['settings']>) => void;
  activateCompany: (planId?: string) => void;
  deactivateCompany: () => void;
  suspendCompany: () => void;
  setCompanyStatus: (status: TenantStatus) => void;
  isCompanyActive: boolean;
  isDemoMode: boolean;
  loadDemoData: () => void;
  clearToRealEmptyData: () => void;
  branches: Branch[];
  currentBranch: Branch;
  setCurrentBranch: (branch: Branch) => void;
  addBranch: (branch: Omit<Branch, 'id'> & { id?: string }) => Promise<void>;
  updateBranch: (branch: Branch) => Promise<void>;
  deleteBranch: (branchId: string) => Promise<void>;
  
  // Suporte & Atendimento a Usuários
  supportTickets: SupportTicket[];
  createSupportTicket: (data: { subject: string; category: SupportTicket['category']; priority: TicketPriority; description: string }) => Promise<SupportTicket>;
  replySupportTicket: (ticketId: string, message: string, isStaffReply?: boolean) => Promise<void>;
  updateTicketStatus: (ticketId: string, status: TicketStatus) => Promise<void>;
  
  // Alternadores Diretos de Perfil (Super Admin x Usuário)
  switchToSuperAdmin: () => void;
  switchToUser: () => void;

  // Modo de Suporte / Impersonação do Super Admin
  isSupportMode: boolean;
  supportAdminName: string;
  supportAccountName: string;
  enterSupportMode: (accountName?: string, tenantId?: string) => void;
  exitSupportMode: () => void;

  // Super Admin Platform Management
  allTenants: TenantRecord[];
  setAllTenants: React.Dispatch<React.SetStateAction<TenantRecord[]>>;
  addTenantRecord: (newTenant: Omit<TenantRecord, 'id'>) => Promise<TenantRecord>;
  updateTenantRecord: (id: string, partial: Partial<TenantRecord>) => Promise<void>;
  platformUsers: User[];
  setPlatformUsers: React.Dispatch<React.SetStateAction<User[]>>;
  addPlatformUser: (user: Omit<User, 'id'>) => void;
  updatePlatformUser: (id: string, partial: Partial<User>) => void;
  deletePlatformUser: (id: string) => void;
  maintenanceMode: boolean;
  setMaintenanceMode: (active: boolean) => void;
  maintenanceConfig: MaintenanceSettings;
  setMaintenanceConfig: React.Dispatch<React.SetStateAction<MaintenanceSettings>>;
  announcements: SystemAnnouncement[];
  addAnnouncement: (announcement: Omit<SystemAnnouncement, 'id' | 'createdAt'>) => void;
  removeAnnouncement: (id: string) => void;
  
  // Data Collections
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  updateProduct: (updated: Product) => void;
  addProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  batchUpdateProducts: (updatedList: Product[]) => void;
  categories: ProductCategory[];
  setCategories: React.Dispatch<React.SetStateAction<ProductCategory[]>>;
  addCategory: (category: ProductCategory) => void;
  updateCategory: (category: ProductCategory, oldIdOrName?: string) => void;
  deleteCategory: (id: string) => void;
  ingredients: Ingredient[];
  setIngredients: React.Dispatch<React.SetStateAction<Ingredient[]>>;
  suppliers: Supplier[];
  updateStock: (ingredientId: string, newStock: number) => void;
  quickRestockIngredient: (ingredientId: string, addedQty: number) => void;
  autoReplenishIngredient: (ingredientId: string, customQty?: number) => { success: boolean; message: string };
  triggerLowStockPushAlert: (ingredientId: string) => Promise<boolean>;
  addIngredient: (data: { name: string; currentStock: number; unit?: string; costPerUnit?: number; category?: string; minimumStock?: number }) => Ingredient;
  updateIngredient: (id: string, data: { name?: string; currentStock?: number; unit?: string; costPerUnit?: number; category?: string; minimumStock?: number }) => void;
  deleteIngredient: (id: string) => void;
  clearAllIngredients: () => void;
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  tables: TableItem[];
  setTables: React.Dispatch<React.SetStateAction<TableItem[]>>;
  comandas: ComandaItem[];
  setComandas: React.Dispatch<React.SetStateAction<ComandaItem[]>>;
  drivers: DeliveryDriver[];
  setDrivers: React.Dispatch<React.SetStateAction<DeliveryDriver[]>>;
  assignDriverToOrder: (orderId: string, driverId: string) => void;
  completeDriverDelivery: (orderId: string) => void;
  updateDriverStatus: (driverId: string, status: 'available' | 'on_route' | 'offline') => void;
  updateDriverCoords: (driverId: string, coords: { lat: number; lng: number }, heading?: number, speedKmh?: number) => void;
  addDeliveryDriver: (driver: Omit<DeliveryDriver, 'id'>) => void;
  gamificationStaff: StaffGamification[];
  financialEntries: FinancialEntry[];
  addFinancialEntry: (entry: Omit<FinancialEntry, 'id'>) => FinancialEntry;
  deleteFinancialEntry: (id: string) => void;
  updateFinancialEntry: (id: string, updates: Partial<FinancialEntry>) => void;
  billsPayable: BillPayable[];
  addBillPayable: (bill: Omit<BillPayable, 'id'>) => BillPayable;
  payBillPayable: (id: string, paymentMethod: PaymentMethod | 'transferencia' | 'boleto', paidAmount?: number) => void;
  deleteBillPayable: (id: string) => void;
  billsReceivable: BillReceivable[];
  addBillReceivable: (bill: Omit<BillReceivable, 'id'>) => BillReceivable;
  receiveBillReceivable: (id: string, paymentMethod: PaymentMethod | 'transferencia' | 'boleto', receivedAmount?: number) => void;
  deleteBillReceivable: (id: string) => void;
  purchases: PurchaseRecord[];
  registerPurchase: (purchaseData: Omit<PurchaseRecord, 'id' | 'createdAt'>) => PurchaseRecord;
  cashMovements: CashMovementRecord[];
  salesFirestore: SaleFirestore[];
  expensesFirestore: ExpenseFirestore[];
  cashMovementsFirestore: CashMovementFirestore[];
  financialTransactions: FinancialTransaction[];
  clearAllFinancialData: () => void;
  loyaltyMembers: LoyaltyMember[];
  auditLogs: AuditLog[];
  saasPlans: SaaSPlan[];
  setSaasPlans: React.Dispatch<React.SetStateAction<SaaSPlan[]>>;
  
  // Staff & Employees Management
  employees: Employee[];
  teamMembers: Employee[];
  addEmployee: (employeeData: Omit<Employee, 'id' | 'xpPoints' | 'level' | 'salesMonth' | 'tipsMonth' | 'ordersCompletedToday' | 'speedAvgMin' | 'customerRating' | 'badges' | 'joinedAt'> & Partial<Employee>) => Employee;
  updateEmployee: (id: string, partial: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;
  
  // Customers & CRM Fidelidade
  customers: Customer[];
  addCustomer: (customerData: Omit<Customer, 'id' | 'totalOrders' | 'totalSpent' | 'cashbackBalance' | 'lastOrderDate'> & Partial<Customer>) => Customer;
  updateCustomer: (id: string, partial: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  addCashback: (customerId: string, amount: number) => void;
  redeemCashback: (customerId: string, amount: number) => boolean;

  // Audit Logs
  addAuditLog: (entry: Omit<AuditLog, 'id' | 'timestamp'>) => void;
  
  // Cash Session
  activeCashSession: CashSession | null;
  openCashSession: (initialAmount: number) => void;
  closeCashSession: (countedAmount: number, notes?: string) => void;
  addCashMovement: (type: 'bleed' | 'supply', amount: number, reason: string) => void;
  updateActiveCashSession: (session: CashSession) => void;
  
  // Order actions
  createOrder: (orderData: Partial<Order>) => Order;
  addOrder: (orderData: Partial<Order>) => Order;
  updateOrderStatus: (orderId: string, status: OrderStatus, driverId?: string) => void;
  cancelOrder: (orderId: string, reason: string) => void;
  triggerOrderReceivedAlert: () => void;
  
  // Print simulation
  printOrder: Order | null;
  setPrintOrder: (order: Order | null) => void;
  
  // AI Copilot
  isAICopilotOpen: boolean;
  setIsAICopilotOpen: (open: boolean) => void;
  
  // Exportação & Backup de Dados Operacionais
  isExportModalOpen: boolean;
  setIsExportModalOpen: (open: boolean) => void;
  exportModalInitialTab: 'produtos' | 'vendas' | 'auditoria' | 'completo';
  openExportModal: (tab?: 'produtos' | 'vendas' | 'auditoria' | 'completo') => void;
  
  // Webhooks & Real-time Integration
  isWebhookModalOpen: boolean;
  setIsWebhookModalOpen: (open: boolean) => void;
  webhookNotifications: WebhookNotification[];
  handleIncomingWebhook: (payload: WebhookEventPayload) => { success: boolean; message: string; order?: Order };
  clearWebhookNotifications: () => void;
  markNotificationAsRead: (id: string) => void;
  webhookAutoSimulation: boolean;
  setWebhookAutoSimulation: (active: boolean) => void;
  simulatePartnerWebhook: (provider?: WebhookProvider, eventType?: WebhookEventType) => void;
  sendSilentWaiterNotification: (title: string, message: string, tableNumber?: number) => void;

  // Native Push Notifications (Service Worker & OS)
  notificationPermission: NotificationPermissionState;
  requestPushNotifications: () => Promise<NotificationPermissionState>;
  testPushNotification: (title?: string, body?: string) => Promise<boolean>;

  // Offline & Service Worker Resilience
  isOnline: boolean;
  isForceOffline: boolean;
  effectiveIsOnline: boolean;
  networkLatencyMs: number;
  pendingSyncQueue: OfflinePendingAction[];
  isSyncing: boolean;
  lastSyncTimestamp: string | null;
  isOfflineSyncModalOpen: boolean;
  setIsOfflineSyncModalOpen: (open: boolean) => void;
  toggleForceOffline: () => void;
  triggerManualSync: () => Promise<{ success: boolean; syncedCount: number }>;
  clearSyncQueue: () => void;
  removeSyncQueueItem: (id: string) => void;
  simulateOfflineOrder: () => void;

  // Gateway de Pagamento & Baixa Automática
  processGatewayPaymentAndClearOrder: (request: {
    orderPayload?: any;
    existingOrderId?: string;
    paymentMethod: 'pix' | 'credit_card' | 'debit_card';
    cardDetails?: CardDetailsInput;
    pixTxId?: string;
  }) => Promise<{ order: Order; transaction: GatewayTransactionResult }>;

  // System state
  simulationActive: boolean;
  setSimulationActive: (active: boolean) => void;
  resetAllDataToDefault: () => void;
}

// Helper to extract initial view from URL parameters, hash, or path
const getInitialViewFromUrl = (): ActiveView | null => {
  if (typeof window === 'undefined') return null;
  try {
    // 1. Check URL query params: ?view=... or ?page=... or ?mesa=...
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('mesa') || urlParams.has('table')) {
      return 'cardapio_digital';
    }
    const viewParam = (urlParams.get('view') || urlParams.get('page'))?.toLowerCase();
    if (viewParam) {
      if (viewParam === 'super_admin' || viewParam === 'superadmin' || viewParam === 'admin') return 'super_admin';
      if (viewParam in VIEW_GLOBAL_COLORS) return viewParam as ActiveView;
    }

    // 2. Check hash: #super_admin or #/super_admin
    const hash = window.location.hash.replace(/^#[/]?/, '').toLowerCase();
    if (hash) {
      if (hash === 'super_admin' || hash === 'superadmin' || hash === 'admin') return 'super_admin';
      if (hash in VIEW_GLOBAL_COLORS) return hash as ActiveView;
    }

    // 3. Check pathname: /super_admin or /superadmin
    const path = window.location.pathname.replace(/^\//, '').toLowerCase();
    if (path) {
      if (path === 'super_admin' || path === 'superadmin' || path === 'admin') return 'super_admin';
      if (path in VIEW_GLOBAL_COLORS) return path as ActiveView;
    }
  } catch {}
  return null;
};

// Synchronize view with URL without reloading
const syncViewToUrl = (view: ActiveView) => {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    if (view === 'overview_bi') {
      url.searchParams.delete('view');
      url.searchParams.delete('page');
    } else {
      url.searchParams.set('view', view);
    }
    window.history.replaceState({ view }, '', url.toString());
  } catch {}
};

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Navigation & User with Initial URL Protection
  const [currentUser, setCurrentUser] = useState<User>(mockCurrentUser);
  const [currentView, setCurrentView] = useState<ActiveView>(() => {
    const fromUrl = getInitialViewFromUrl();
    if (fromUrl === 'super_admin') {
      // Early protection: if initial user is not verified super admin, redirect to acesso_negado
      if (isFastSuperAdminCheck(mockCurrentUser)) {
        return 'super_admin';
      }
      return 'acesso_negado';
    }
    return fromUrl || 'overview_bi';
  });

  // Super Admin RBAC Security & Verification
  const [isSuperAdminAuthorized, setIsSuperAdminAuthorized] = useState<boolean>(() => {
    return isFastSuperAdminCheck(mockCurrentUser);
  });
  const [isCheckingSuperAdminAuth, setIsCheckingSuperAdminAuth] = useState<boolean>(false);
  const [superAdminDenialReason, setSuperAdminDenialReason] = useState<string>(() => {
    const fromUrl = getInitialViewFromUrl();
    if (fromUrl === 'super_admin' && !isFastSuperAdminCheck(mockCurrentUser)) {
      return 'Acesso negado: A rota /super_admin é exclusiva para o Super Administrador da plataforma e requer credenciais verificadas via Firestore/Auth.';
    }
    return '';
  });

  // Função que valida se o ID do usuário logado possui a claim personalizada 'role: super_admin' no Firestore/Auth
  const checkSuperAdminAuthorization = async (userId?: string): Promise<boolean> => {
    const targetUid = userId || auth.currentUser?.uid || currentUser.id;
    if (!targetUid) {
      setIsSuperAdminAuthorized(false);
      setSuperAdminDenialReason('Nenhum identificador de usuário disponível para validação de segurança.');
      return false;
    }

    setIsCheckingSuperAdminAuth(true);
    try {
      const res = await checkUserIdSuperAdminClaim(targetUid);
      setIsSuperAdminAuthorized(res.isAuthorized);
      if (!res.isAuthorized) {
        setSuperAdminDenialReason(res.message);
        if (currentView === 'super_admin') {
          setCurrentView('acesso_negado');
          syncViewToUrl('acesso_negado');
        }
      } else {
        setSuperAdminDenialReason('');
      }
      return res.isAuthorized;
    } catch (err: any) {
      setIsSuperAdminAuthorized(false);
      setSuperAdminDenialReason('Erro de conexão ao verificar credenciais master com o Firestore.');
      return false;
    } finally {
      setIsCheckingSuperAdminAuth(false);
    }
  };

  // Verificação profunda via Firestore/Auth (compatibilidade)
  const verifySuperAdminAuth = async (candidateUser?: User): Promise<boolean> => {
    const targetUid = candidateUser?.id || currentUser.id;
    return checkSuperAdminAuthorization(targetUid);
  };

  // Safe view router with RBAC guard
  const setCurrentViewSafely = (view: ActiveView) => {
    if (view === 'super_admin') {
      const targetUid = auth.currentUser?.uid || currentUser.id;
      checkSuperAdminAuthorization(targetUid).then((isAuthorized) => {
        if (!isAuthorized) {
          setIsSuperAdminAuthorized(false);
          setCurrentView('acesso_negado');
          syncViewToUrl('acesso_negado');
          playBeep(350, 0.15);
        } else {
          setIsSuperAdminAuthorized(true);
          setSuperAdminDenialReason('');
          setCurrentView('super_admin');
          syncViewToUrl('super_admin');
        }
      });
      return;
    }

    setCurrentView(view);
    syncViewToUrl(view);
  };
  // Multi-tenant & Activation State
  const isOldRestaurantName = (n?: string) => {
    if (!n) return false;
    const lower = n.toLowerCase();
    return lower.includes('neon smash') || lower.includes('neon burger') || lower === 'neon food' || lower === 'neon smash burger & bar';
  };

  const [tenant, setTenant] = useState<Tenant>(() => {
    try {
      const saved = localStorage.getItem('neon_tenant_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (isOldRestaurantName(parsed.name) || parsed.name === 'Neon Smash Burger & Bar')) {
          parsed.name = 'Lanchonete Dulci';
          if (parsed.settings) {
            if (parsed.settings.menuCustomSlug === 'neon-burger-bar') parsed.settings.menuCustomSlug = 'lanchonete-dulci';
            if (parsed.settings.pixBeneficiaryName && isOldRestaurantName(parsed.settings.pixBeneficiaryName)) {
              parsed.settings.pixBeneficiaryName = 'Lanchonete Dulci';
            }
          }
          try { localStorage.setItem('neon_tenant_v3', JSON.stringify(parsed)); } catch (e) {}
        }
        return parsed;
      }
    } catch (e) {}
    return {
      ...mockTenant,
      status: 'not_activated', // Sistema inicia NÃO ATIVADO conforme exigência do Super Admin
      activatedAt: undefined,
      lastAccessAt: new Date().toISOString()
    };
  });

  // Garantir sincronização do nome Lanchonete Dulci caso tenha sido persistido anteriormente como Neon Smash
  useEffect(() => {
    if (tenant && (isOldRestaurantName(tenant.name) || tenant.name === 'Neon Smash Burger & Bar')) {
      const updated = { 
        ...tenant, 
        name: 'Lanchonete Dulci',
        settings: {
          ...tenant.settings,
          menuCustomSlug: tenant.settings?.menuCustomSlug === 'neon-burger-bar' ? 'lanchonete-dulci' : tenant.settings?.menuCustomSlug,
          pixBeneficiaryName: isOldRestaurantName(tenant.settings?.pixBeneficiaryName) ? 'Lanchonete Dulci' : tenant.settings?.pixBeneficiaryName
        }
      };
      setTenant(updated);
      try { localStorage.setItem('neon_tenant_v3', JSON.stringify(updated)); } catch (e) {}
    }
  }, [tenant]);

  // Demo mode flag - default is FALSE (Conta 100% Real, sem dados fictícios)
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('neon_is_demo_mode') === 'true';
    } catch (e) {
      return false;
    }
  });

  // Modo de Suporte Administrativo / Impersonação do Super Admin
  const [isSupportMode, setIsSupportMode] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('neon_support_mode') === 'true';
    } catch {
      return false;
    }
  });
  const [supportAdminName, setSupportAdminName] = useState<string>('Super Administrador');
  const [supportAccountName, setSupportAccountName] = useState<string>('Lanchonete Dulci');

  const isCompanyActive = tenant.status === 'active' || tenant.status === 'trial';

  const activateCompany = (planId?: string) => {
    const activatedAt = new Date().toISOString();
    setTenant(prev => {
      const next: Tenant = {
        ...prev,
        status: 'active',
        planId: planId || prev.planId || 'plan_pro',
        activatedAt,
        lastAccessAt: activatedAt
      };
      try { localStorage.setItem('neon_tenant_v3', JSON.stringify(next)); } catch (e) {}
      return next;
    });
    addAuditLog({
      action: 'company_activated',
      description: `Empresa "${tenant.name}" ativada com sucesso pelo Super Administrador.`,
      userName: currentUser.name || 'Super Admin',
      userRole: currentUser.role || 'super_admin',
      severity: 'info',
      ipAddress: '127.0.0.1'
    });
  };

  const deactivateCompany = () => {
    setTenant(prev => {
      const next: Tenant = {
        ...prev,
        status: 'deactivated',
      };
      try { localStorage.setItem('neon_tenant_v3', JSON.stringify(next)); } catch (e) {}
      return next;
    });
    addAuditLog({
      action: 'company_deactivated',
      description: `Empresa "${tenant.name}" desativada pelo Super Administrador.`,
      userName: currentUser.name || 'Super Admin',
      userRole: currentUser.role || 'super_admin',
      severity: 'warning',
      ipAddress: '127.0.0.1'
    });
  };

  const suspendCompany = () => {
    setTenant(prev => {
      const next: Tenant = {
        ...prev,
        status: 'suspended',
      };
      try { localStorage.setItem('neon_tenant_v3', JSON.stringify(next)); } catch (e) {}
      return next;
    });
    addAuditLog({
      action: 'company_suspended',
      description: `Empresa "${tenant.name}" suspensa pelo Super Administrador.`,
      userName: currentUser.name || 'Super Admin',
      userRole: currentUser.role || 'super_admin',
      severity: 'warning',
      ipAddress: '127.0.0.1'
    });
  };

  const setCompanyStatus = (status: TenantStatus) => {
    setTenant(prev => {
      const next: Tenant = {
        ...prev,
        status,
        activatedAt: status === 'active' && !prev.activatedAt ? new Date().toISOString() : prev.activatedAt,
        lastAccessAt: new Date().toISOString()
      };
      try { localStorage.setItem('neon_tenant_v3', JSON.stringify(next)); } catch (e) {}
      return next;
    });
  };

  const clearToRealEmptyData = () => {
    setIsDemoMode(false);
    try {
      localStorage.removeItem('neon_is_demo_mode');
      localStorage.setItem('neon_ingredients_v3', JSON.stringify([]));
      localStorage.setItem('neon_products_v3', JSON.stringify([]));
      localStorage.setItem('neon_orders_v3', JSON.stringify([]));
      localStorage.setItem('neon_customers_v3', JSON.stringify([]));
      localStorage.setItem('neon_employees_v3', JSON.stringify([]));
      localStorage.setItem('neon_financial_entries_v3', JSON.stringify([]));
      localStorage.setItem('neon_tables_v3', JSON.stringify(cleanInitialTables));
      localStorage.setItem('neon_comandas_v3', JSON.stringify([]));
    } catch (e) {}
    setIngredients([]);
    setProducts([]);
    setOrders([]);
    setCustomers([]);
    setEmployees([]);
    setFinancialEntries([]);
    setTables(cleanInitialTables);
    setComandas([]);
    setCurrentBranch(prev => ({ ...prev, revenueToday: 0, ordersToday: 0 }));
  };

  const loadDemoData = () => {
    setIsDemoMode(true);
    try {
      localStorage.setItem('neon_is_demo_mode', 'true');
      localStorage.setItem('neon_tables_v3', JSON.stringify(mockTables));
      localStorage.setItem('neon_comandas_v3', JSON.stringify(mockComandas));
    } catch (e) {}
    setIngredients(mockIngredients);
    setProducts(mockProducts);
    setOrders(mockOrders);
    setCustomers(mockCustomers);
    setEmployees(mockEmployees);
    setFinancialEntries(mockFinancialEntries);
    setTables(mockTables);
    setComandas(mockComandas);
    setCurrentBranch(mockBranches[0]);
  };

  // Branches with dynamic zero metrics if real
  const [branches, setBranches] = useState<Branch[]>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('neon_branches_v3');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const sanitized = parsed.map(b => {
              if (isOldRestaurantName(b.name) || isOldRestaurantName(b.tradeName) || b.name === 'Neon Smash Burger & Bar' || b.tradeName === 'Neon Smash Burger & Bar') {
                return { ...b, name: 'Lanchonete Dulci', tradeName: 'Lanchonete Dulci' };
              }
              return b;
            });
            try { localStorage.setItem('neon_branches_v3', JSON.stringify(sanitized)); } catch {}
            return sanitized;
          }
        }
      }
    } catch {}
    const isDemo = typeof window !== 'undefined' && localStorage.getItem('neon_is_demo_mode') === 'true';
    if (isDemo) {
      return mockBranches.map(b => ({
        ...b,
        revenueToday: b.revenueToday,
        ordersToday: b.ordersToday,
      }));
    }
    return INITIAL_BRANCHES_DULCI;
  });
  const [currentBranch, setCurrentBranch] = useState<Branch>(() => {
    return branches[0] || INITIAL_BRANCHES_DULCI[0];
  });

  // Support Tickets State
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('neon_support_tickets_v3');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      }
    } catch {}
    const isDemo = typeof window !== 'undefined' && localStorage.getItem('neon_is_demo_mode') === 'true';
    if (isDemo) {
      return [
        {
          id: 'ticket_001',
          ticketNumber: '#TK-1001',
          tenantId: 'tenant_lanchonete_dulci',
          tenantName: 'Lanchonete Dulci',
          userId: 'usr_gestor',
          userName: 'Usuário Gestor',
          userEmail: 'gestor@lanchonetedulci.com.br',
          userPhone: 'Não informado',
          subject: 'Boas-vindas e Configuração de Impressão Térmica 80mm',
          category: 'impressora_termica',
          priority: 'medium',
          status: 'in_progress',
          description: 'Configuração inicial da unidade Lanchonete Dulci.',
          messages: [],
          assignedTo: 'usr_superadmin_alessandro',
          assignedStaffName: 'Equipe de Suporte',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      ];
    }
    return [];
  });

  // Global Dynamic Active Page Theme Color
  const activePageColor = VIEW_GLOBAL_COLORS[currentView] || '#DA291C';

  // Real-time Firestore sync for Support Tickets
  useEffect(() => {
    try {
      const ticketsRef = collection(db, 'support_tickets');
      const unsub = onSnapshot(ticketsRef, (snapshot) => {
        if (!snapshot.empty) {
          const loaded: SupportTicket[] = [];
          snapshot.forEach(docSnap => {
            loaded.push({ id: docSnap.id, ...docSnap.data() } as SupportTicket);
          });
          loaded.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
          setSupportTickets(loaded);
          try { localStorage.setItem('neon_support_tickets_v3', JSON.stringify(loaded)); } catch {}
        }
      }, () => {});
      return () => unsub();
    } catch {}
  }, []);

  // Super Admin - Plataforma SaaS State: Tenants
  const [allTenants, setAllTenants] = useState<TenantRecord[]>(() => {
    try {
      const saved = localStorage.getItem('neon_all_tenants_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const sanitized = parsed.map(t => {
            if (isOldRestaurantName(t.name) || t.name === 'Neon Smash Burger & Bar') {
              return { ...t, name: 'Lanchonete Dulci' };
            }
            return t;
          });
          try { localStorage.setItem('neon_all_tenants_v3', JSON.stringify(sanitized)); } catch {}
          return sanitized;
        }
      }
    } catch {}
    return INITIAL_TENANT_RECORDS;
  });

  const addTenantRecord = async (newTenant: Omit<TenantRecord, 'id'>): Promise<TenantRecord> => {
    const id = `tenant_${Date.now()}`;
    const record: TenantRecord = {
      ...newTenant,
      id,
      joinedAt: newTenant.joinedAt || new Date().toLocaleDateString('pt-BR'),
      status: newTenant.status || 'active',
      monthlyRevenue: newTenant.monthlyRevenue || 0,
      branchesCount: newTenant.branchesCount || 1,
    };
    setAllTenants(prev => {
      const next = [record, ...prev];
      try { localStorage.setItem('neon_all_tenants_v3', JSON.stringify(next)); } catch {}
      return next;
    });
    saveTenantRecordToFirestore(record).catch(() => {});
    return record;
  };

  const updateTenantRecord = async (id: string, partial: Partial<TenantRecord>): Promise<void> => {
    setAllTenants(prev => {
      const next = prev.map(t => {
        if (t.id === id) {
          const updated = { ...t, ...partial };
          saveTenantRecordToFirestore(updated).catch(() => {});
          return updated;
        }
        return t;
      });
      try { localStorage.setItem('neon_all_tenants_v3', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // Super Admin - Plataforma SaaS State: Platform Users
  const [platformUsers, setPlatformUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem('neon_platform_users_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_PLATFORM_USERS;
  });

  const addPlatformUser = (user: Omit<User, 'id'>) => {
    const newUser: User = {
      ...user,
      id: `usr_${Date.now()}`,
    };
    setPlatformUsers(prev => {
      const next = [newUser, ...prev];
      try { localStorage.setItem('neon_platform_users_v3', JSON.stringify(next)); } catch {}
      return next;
    });
    addAuditLog({
      action: 'user_created',
      description: `Novo usuário ${newUser.name} (${newUser.email}) criado na plataforma.`,
      userName: currentUser.name || 'Super Admin',
      userRole: currentUser.role || 'super_admin',
      severity: 'info',
      ipAddress: '127.0.0.1'
    });
  };

  const updatePlatformUser = (id: string, partial: Partial<User>) => {
    setPlatformUsers(prev => {
      const next = prev.map(u => u.id === id ? { ...u, ...partial } : u);
      try { localStorage.setItem('neon_platform_users_v3', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const deletePlatformUser = (id: string) => {
    setPlatformUsers(prev => {
      const next = prev.filter(u => u.id !== id);
      try { localStorage.setItem('neon_platform_users_v3', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // Super Admin - Modo de Manutenção
  const [maintenanceMode, setMaintenanceModeState] = useState<boolean>(() => {
    try {
      return localStorage.getItem('neon_maintenance_mode') === 'true';
    } catch {
      return false;
    }
  });

  const [maintenanceConfig, setMaintenanceConfig] = useState<MaintenanceSettings>(() => {
    try {
      const saved = localStorage.getItem('neon_maintenance_config');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      enabled: false,
      title: 'NEON FOOD OS em Manutenção Programada',
      message: 'Estamos realizando atualizações técnicas e melhorias em nossa infraestrutura em nuvem para garantir a máxima estabilidade e velocidade para seu restaurante.',
      estimatedReturn: 'Previsão de normalização: em breve',
      contactWhatsApp: '(11) 99999-0001'
    };
  });

  const setMaintenanceMode = (active: boolean) => {
    setMaintenanceModeState(active);
    try { localStorage.setItem('neon_maintenance_mode', active ? 'true' : 'false'); } catch {}
    const updated = { ...maintenanceConfig, enabled: active };
    setMaintenanceConfig(updated);
    try { localStorage.setItem('neon_maintenance_config', JSON.stringify(updated)); } catch {}
    saveMaintenanceSettingsToFirestore(updated).catch(() => {});
  };

  // Super Admin - Comunicações Globais
  const [announcements, setAnnouncements] = useState<SystemAnnouncement[]>(() => {
    try {
      const saved = localStorage.getItem('neon_announcements');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'ann_01',
        title: 'Atualização do Motor de Impressão ESC/POS 80mm',
        message: 'Nova versão do driver com corte automático de guilhotina e roteamento direto por estação de preparo habilitada!',
        severity: 'info',
        createdAt: new Date().toLocaleDateString('pt-BR'),
        author: currentUser.name || 'Super Admin',
        active: true
      }
    ];
  });

  const addAnnouncement = (ann: Omit<SystemAnnouncement, 'id' | 'createdAt'>) => {
    const newAnn: SystemAnnouncement = {
      ...ann,
      id: `ann_${Date.now()}`,
      createdAt: new Date().toLocaleDateString('pt-BR'),
    };
    setAnnouncements(prev => {
      const next = [newAnn, ...prev];
      try { localStorage.setItem('neon_announcements', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const removeAnnouncement = (id: string) => {
    setAnnouncements(prev => {
      const next = prev.filter(a => a.id !== id);
      try { localStorage.setItem('neon_announcements', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // Firebase Auth sync & real role management with Firestore verification
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        let profileName = fbUser.displayName || fbUser.email?.split('@')[0] || 'Usuário';
        let companyName = '';
        let phone = '';
        let role: UserRole = 'owner';
        let avatarUrl = fbUser.photoURL || undefined;
        let firestoreDisplayName = '';

        try {
          // 1. Inspecionar Custom Claims do Token JWT do Firebase
          const idToken = await fbUser.getIdTokenResult();
          if (idToken.claims?.role) {
            role = idToken.claims.role as UserRole;
          } else if (idToken.claims?.super_admin === true) {
            role = 'super_admin';
          }

          // 2. Consultar documento real do usuário no Firestore (/users/{uid})
          const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            // Buscar o displayName real persistido no Firestore
            firestoreDisplayName = data.displayName || data.name || '';
            if (firestoreDisplayName) {
              profileName = firestoreDisplayName;
            }
            if (data.companyName) companyName = data.companyName;
            if (data.phone) phone = data.phone;
            if (data.role) role = data.role as UserRole;
            if (data.avatarUrl) avatarUrl = data.avatarUrl;
          } else {
            // Se o documento ainda não existir, cria o perfil inicial com a role verificada e o displayName real
            await setDoc(doc(db, 'users', fbUser.uid), {
              id: fbUser.uid,
              name: profileName,
              displayName: profileName,
              email: fbUser.email || '',
              role: role,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }, { merge: true });
          }

          // 3. Consultar também se há registro na coleção /admins/{uid}
          try {
            const adminDoc = await getDoc(doc(db, 'admins', fbUser.uid));
            if (adminDoc.exists()) {
              const adminData = adminDoc.data();
              role = 'super_admin';
              if (adminData.displayName || adminData.name) {
                firestoreDisplayName = adminData.displayName || adminData.name;
                profileName = firestoreDisplayName;
              }
            }
          } catch (adminErr) {}
        } catch (err) {
          console.warn('Aviso ao sincronizar dados de usuário e role no Firestore:', err);
        }

        // 4. Validação rigorosa de Super Admin baseada no ID do usuário e Firestore Claims
        const isAuthorizedSuperAdmin = await checkSuperAdminAuthorization(fbUser.uid);
        if (isAuthorizedSuperAdmin) {
          role = 'super_admin';
        } else if (role === 'super_admin') {
          // Se o perfil alegar super_admin mas o backend não autorizar o ID, rebaixar para owner de segurança
          role = 'owner';
        }

        // REGRA DE OURO: Exibir 'Alesandro Windson' APENAS quando esse for o dado persistido para o UID do Super Admin
        if (role === 'super_admin') {
          if (firestoreDisplayName === 'Alesandro Windson') {
            profileName = 'Alesandro Windson';
          } else if (firestoreDisplayName) {
            profileName = firestoreDisplayName;
          } else if (fbUser.displayName) {
            profileName = fbUser.displayName;
          } else {
            profileName = 'Super Administrador';
          }
          setSupportAdminName(profileName);
        } else {
          setSupportAdminName('Super Administrador');
        }

        setCurrentUser({
          id: fbUser.uid,
          name: profileName,
          displayName: profileName,
          email: fbUser.email || '',
          phone: phone || '',
          role: role,
          tenantId: 'tenant_lanchonete_dulci',
          branchId: 'branch_dulci_matriz',
          avatarUrl: avatarUrl,
        });

        // Auditoria global de login no Firestore
        auditService.logLogin(
          {
            id: fbUser.uid,
            name: profileName,
            email: fbUser.email || '',
            role: role
          },
          'tenant_lanchonete_dulci',
          { provider: fbUser.providerData?.[0]?.providerId || 'firebase_auth' }
        ).catch(() => {});

        if (companyName) {
          setTenant(prev => ({
            ...prev,
            name: companyName,
          }));
        }
      } else {
        // Usuário deslogado: resetar autorização master
        setIsSuperAdminAuthorized(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Monitoramento de rota URL para proteção em tempo real
  useEffect(() => {
    const handleUrlNavigation = () => {
      const targetView = getInitialViewFromUrl();
      if (targetView) {
        setCurrentViewSafely(targetView);
      }
    };

    window.addEventListener('popstate', handleUrlNavigation);
    window.addEventListener('hashchange', handleUrlNavigation);
    return () => {
      window.removeEventListener('popstate', handleUrlNavigation);
      window.removeEventListener('hashchange', handleUrlNavigation);
    };
  }, [currentUser]);

  // Verificação inicial profunda se a URL contiver super_admin
  useEffect(() => {
    const initialView = getInitialViewFromUrl();
    if (initialView === 'super_admin') {
      checkSuperAdminAuthorization(currentUser.id);
    }
  }, []);

  const logout = async () => {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('super_admin_verified');
        sessionStorage.removeItem('super_admin_auth');
      }
      await fbSignOut(auth);
    } catch (e) {}
    setIsSuperAdminAuthorized(false);
    setCurrentUser(mockCurrentUser);
    setCurrentView('login_auth');
    syncViewToUrl('login_auth');
  };

  useEffect(() => {
    try {
      document.documentElement.style.setProperty('--active-page-color', activePageColor);
      document.documentElement.style.setProperty('--active-page-glow', `${activePageColor}33`);
    } catch (e) {}
  }, [activePageColor]);
  
  // Entities - Cardápio Oficial Lanchonete Dulci (Manaus - AM) carregado por padrão
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      if (typeof window !== 'undefined' && localStorage.getItem('neon_is_demo_mode') === 'true') return mockProducts;
      const saved = typeof window !== 'undefined' ? localStorage.getItem('neon_products_v3') : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasDulci = parsed.some(p => p.id.startsWith('dulci_'));
          if (hasDulci) {
            const dulciMap = new Map(DULCI_PRODUCTS.map(dp => [dp.id, dp.imageUrl]));
            return parsed.map(p => dulciMap.has(p.id) ? { ...p, imageUrl: dulciMap.get(p.id) || p.imageUrl } : p);
          }
          return [...DULCI_PRODUCTS, ...parsed];
        }
      }
      return DULCI_PRODUCTS;
    } catch (e) {
      return DULCI_PRODUCTS;
    }
  });

  const updateProduct = (updated: Product) => {
    const oldProduct = products.find(p => p.id === updated.id);

    setProducts(prev => {
      const next = prev.map(p => p.id === updated.id ? updated : p);
      try { localStorage.setItem('neon_products_v3', JSON.stringify(next)); } catch (e) {}
      return next;
    });

    const restaurantId = tenant?.id || auth.currentUser?.uid || 'default_restaurant';

    // Auditoria Global: Registrar alteração de preço no Firestore 'auditLogs'
    if (oldProduct && typeof updated.price === 'number' && oldProduct.price !== updated.price) {
      auditService.logPriceChange(
        { id: updated.id, name: updated.name },
        oldProduct.price,
        updated.price,
        currentUser,
        restaurantId
      ).catch(() => {});
    }

    try {
      setDoc(doc(db, 'restaurants', restaurantId, 'products', updated.id), {
        ...updated,
        tenantId: restaurantId,
        branchId: updated.branchId || currentBranch?.id || 'branch_matriz_sp',
        updatedAt: new Date().toISOString(),
        updatedBy: auth.currentUser?.email || 'Gerente'
      }, { merge: true }).catch(() => {});

      // Sincronizar na coleção multi-tenant de Produtos
      saveProduto(restaurantId, {
        id: updated.id,
        empresaId: restaurantId,
        unidadeId: updated.branchId || currentBranch?.id || 'global',
        tenantId: restaurantId,
        branchId: updated.branchId || currentBranch?.id || 'global',
        name: updated.name,
        description: updated.description || '',
        category: updated.category || 'Geral',
        price: updated.price || 0,
        costPrice: updated.costPrice || 0,
        marginPercent: updated.marginPercent || 0,
        cmvPercent: updated.cmvPercent || 0,
        available: updated.available !== false,
        imageUrl: updated.imageUrl,
        station: updated.station || 'all',
        bcgClassification: updated.bcgClassification || 'star',
        stock: 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }).catch(() => {});
    } catch (err) {}
  };

  const addProduct = (newProduct: Product) => {
    const enriched: Product = {
      ...newProduct,
      tenantId: tenant?.id || 'tenant_neon_sp',
      branchId: newProduct.branchId || currentBranch?.id || 'branch_matriz_sp',
      available: newProduct.available !== undefined ? newProduct.available : true,
      status: newProduct.status || 'active',
    };

    setProducts(prev => {
      const next = [enriched, ...prev.filter(p => p.id !== enriched.id)];
      try { localStorage.setItem('neon_products_v3', JSON.stringify(next)); } catch (e) {}
      return next;
    });

    const restaurantId = tenant?.id || auth.currentUser?.uid || 'default_restaurant';
    try {
      setDoc(doc(db, 'restaurants', restaurantId, 'products', enriched.id), {
        ...enriched,
        tenantId: restaurantId,
        updatedAt: new Date().toISOString(),
        updatedBy: auth.currentUser?.email || 'Gerente'
      }, { merge: true }).catch(() => {});

      // Sincronizar na coleção multi-tenant de Produtos
      saveProduto(restaurantId, {
        id: enriched.id,
        empresaId: restaurantId,
        unidadeId: enriched.branchId || 'global',
        tenantId: restaurantId,
        branchId: enriched.branchId || 'global',
        name: enriched.name,
        description: enriched.description || '',
        category: enriched.category || 'Geral',
        price: enriched.price || 0,
        costPrice: enriched.costPrice || 0,
        marginPercent: enriched.marginPercent || 0,
        cmvPercent: enriched.cmvPercent || 0,
        available: enriched.available !== false,
        imageUrl: enriched.imageUrl,
        station: enriched.station || 'all',
        bcgClassification: enriched.bcgClassification || 'star',
        stock: 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }).catch(() => {});
    } catch (err) {}

    // Auto register category if new
    if (enriched.category && enriched.category !== 'Sem categoria') {
      const catClean = enriched.category.trim();
      setCategories(prev => {
        const exists = prev.some(c => 
          c.id.toLowerCase() === catClean.toLowerCase() || 
          c.name.toLowerCase() === catClean.toLowerCase()
        );
        if (!exists) {
          const newCat: ProductCategory = {
            id: catClean.toLowerCase().replace(/\s+/g, '_'),
            name: catClean,
            icon: 'UtensilsCrossed',
            order: prev.length + 1,
            imageUrl: enriched.imageUrl,
            description: `Itens de ${catClean}.`,
            badge: 'Novo'
          };
          const nextCats = [...prev, newCat];
          try { localStorage.setItem('neon_categories', JSON.stringify(nextCats)); } catch (e) {}
          try {
            setDoc(doc(db, 'restaurants', restaurantId, 'categories', newCat.id), {
              ...newCat,
              tenantId: restaurantId,
              branchId: currentBranch?.id || 'branch_matriz_sp',
              createdAt: new Date().toISOString()
            }, { merge: true }).catch(() => {});
          } catch (err) {}
          return nextCats;
        }
        return prev;
      });
    }
  };

  const deleteProduct = (id: string) => {
    const deletedProduct = products.find(p => p.id === id);

    setProducts(prev => {
      const next = prev.filter(p => p.id !== id);
      try { localStorage.setItem('neon_products_v3', JSON.stringify(next)); } catch (e) {}
      return next;
    });

    const restaurantId = tenant?.id || auth.currentUser?.uid || 'default_restaurant';

    // Auditoria Global: Registrar exclusão de produto no Firestore 'auditLogs'
    auditService.logDeletion(
      'produto',
      id,
      deletedProduct?.name || 'Produto Removido',
      currentUser,
      restaurantId,
      { category: deletedProduct?.category, price: deletedProduct?.price }
    ).catch(() => {});

    try {
      deleteDoc(doc(db, 'restaurants', restaurantId, 'products', id)).catch(() => {});
      deleteDoc(doc(db, 'produtos', id)).catch(() => {});
      deleteDoc(doc(db, 'empresas', restaurantId, 'produtos', id)).catch(() => {});
    } catch (err) {}
  };

  const batchUpdateProducts = (updatedList: Product[]) => {
    setProducts(prev => {
      const map = new Map(updatedList.map(u => [u.id, u]));
      const next = prev.map(p => map.get(p.id) || p);
      try { localStorage.setItem('neon_products_v3', JSON.stringify(next)); } catch (e) {}
      return next;
    });
  };

  const [categories, setCategories] = useState<ProductCategory[]>(() => {
    const isDemo = typeof window !== 'undefined' && localStorage.getItem('neon_is_demo_mode') === 'true';
    if (isDemo) return mockCategories;
    const saved = typeof window !== 'undefined' ? localStorage.getItem('neon_categories') : null;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasDulci = parsed.some(c => c.id.includes('dulci'));
          if (hasDulci) {
            const dulciCatMap = new Map(DULCI_CATEGORIES.map(dc => [dc.id, dc.imageUrl]));
            return parsed.map(c => dulciCatMap.has(c.id) ? { ...c, imageUrl: dulciCatMap.get(c.id) || c.imageUrl } : c);
          }
          return [...DULCI_CATEGORIES, ...parsed];
        }
      } catch (e) {}
    }
    return DULCI_CATEGORIES;
  });

  const addCategory = (category: ProductCategory) => {
    setCategories(prev => {
      if (prev.some(c => c.id.toLowerCase() === category.id.toLowerCase() || c.name.toLowerCase() === category.name.toLowerCase())) {
        return prev;
      }
      const next = [...prev, category];
      try { localStorage.setItem('neon_categories', JSON.stringify(next)); } catch (e) {}
      return next;
    });

    const restaurantId = tenant?.id || auth.currentUser?.uid || 'default_restaurant';
    const nowIso = new Date().toISOString();
    try {
      setDoc(doc(db, 'restaurants', restaurantId, 'categories', category.id), {
        ...category,
        tenantId: restaurantId,
        branchId: currentBranch?.id || 'branch_matriz_sp',
        createdAt: nowIso
      }, { merge: true }).catch(() => {});

      // Sincronização Multi-Tenant Nativa
      saveCategoria(restaurantId, {
        id: category.id,
        empresaId: restaurantId,
        tenantId: restaurantId,
        branchId: currentBranch?.id || 'branch_matriz_sp',
        name: category.name,
        icon: category.icon || 'UtensilsCrossed',
        order: category.order || 99,
        imageUrl: category.imageUrl,
        description: category.description,
        colorGradient: category.colorGradient,
        badge: category.badge,
        startingPrice: category.startingPrice,
        popularTag: category.popularTag,
        active: true,
        createdAt: nowIso,
        updatedAt: nowIso
      }).catch(() => {});
    } catch (err) {}
  };

  const updateCategory = (category: ProductCategory, oldIdOrName?: string) => {
    setCategories(prev => {
      let found = false;
      const next = prev.map(c => {
        const match = c.id === category.id || 
          (oldIdOrName && (c.id === oldIdOrName || c.name.toLowerCase() === oldIdOrName.toLowerCase()));
        if (match) {
          found = true;
          return { ...c, ...category };
        }
        return c;
      });
      if (!found) {
        next.push(category);
      }
      try { localStorage.setItem('neon_categories', JSON.stringify(next)); } catch (e) {}
      return next;
    });

    const restaurantId = tenant?.id || auth.currentUser?.uid || 'default_restaurant';
    const nowIso = new Date().toISOString();
    try {
      setDoc(doc(db, 'restaurants', restaurantId, 'categories', category.id), {
        ...category,
        tenantId: restaurantId,
        branchId: currentBranch?.id || 'branch_matriz_sp',
        updatedAt: nowIso
      }, { merge: true }).catch(() => {});

      // Sincronização Multi-Tenant Nativa
      saveCategoria(restaurantId, {
        id: category.id,
        empresaId: restaurantId,
        tenantId: restaurantId,
        branchId: currentBranch?.id || 'branch_matriz_sp',
        name: category.name,
        icon: category.icon || 'UtensilsCrossed',
        order: category.order || 99,
        imageUrl: category.imageUrl,
        description: category.description,
        colorGradient: category.colorGradient,
        badge: category.badge,
        startingPrice: category.startingPrice,
        popularTag: category.popularTag,
        active: true,
        createdAt: nowIso,
        updatedAt: nowIso
      }).catch(() => {});
    } catch (err) {}
  };

  const deleteCategory = (id: string) => {
    const deletedCat = categories.find(c => c.id === id || c.name.toLowerCase() === id.toLowerCase());

    setCategories(prev => {
      const next = prev.filter(c => c.id !== id && c.name.toLowerCase() !== id.toLowerCase());
      try { localStorage.setItem('neon_categories', JSON.stringify(next)); } catch (e) {}
      return next;
    });

    const restaurantId = tenant?.id || auth.currentUser?.uid || 'default_restaurant';

    // Auditoria Global: Registrar exclusão de categoria no Firestore 'auditLogs'
    auditService.logDeletion(
      'categoria',
      id,
      deletedCat?.name || id,
      currentUser,
      restaurantId
    ).catch(() => {});

    try {
      deleteDoc(doc(db, 'restaurants', restaurantId, 'categories', id)).catch(() => {});
      deleteCategoria(restaurantId, id).catch(() => {});
    } catch (err) {}
  };

  // Real-time Firestore sync for products and categories (Real mode only)
  useEffect(() => {
    const isDemo = typeof window !== 'undefined' && localStorage.getItem('neon_is_demo_mode') === 'true';
    if (isDemo) return;

    const restaurantId = tenant?.id || auth.currentUser?.uid || 'default_restaurant';
    try {
      const prodsRef = collection(db, 'empresas', restaurantId, 'produtos');
      const retroProdsRef = collection(db, 'restaurants', restaurantId, 'products');

      const handleProdsSnap = (snapshot: any) => {
        if (!snapshot.empty) {
          const loaded: Product[] = [];
          snapshot.forEach((docSnap: any) => {
            loaded.push({ id: docSnap.id, ...docSnap.data() } as Product);
          });
          setProducts(loaded);
          try { localStorage.setItem('neon_products_v3', JSON.stringify(loaded)); } catch (e) {}
        }
      };

      const unsubProds = onSnapshot(prodsRef, handleProdsSnap, () => {});
      const unsubRetroProds = onSnapshot(retroProdsRef, handleProdsSnap, () => {});

      const catsRef = collection(db, 'empresas', restaurantId, 'categorias');
      const retroCatsRef = collection(db, 'restaurants', restaurantId, 'categories');

      const handleCatsSnap = (snapshot: any) => {
        if (!snapshot.empty) {
          const loadedCats: ProductCategory[] = [];
          snapshot.forEach((docSnap: any) => {
            loadedCats.push({ id: docSnap.id, ...docSnap.data() } as ProductCategory);
          });
          loadedCats.sort((a, b) => (a.order || 99) - (b.order || 99));
          setCategories(loadedCats);
          try { localStorage.setItem('neon_categories', JSON.stringify(loadedCats)); } catch (e) {}
        }
      };

      const unsubCats = onSnapshot(catsRef, handleCatsSnap, () => {});
      const unsubRetroCats = onSnapshot(retroCatsRef, handleCatsSnap, () => {});

      // Escutar em tempo real os pedidos da empresa no Firestore (atualizados por webhooks ou outros terminais)
      const empresaId = tenant?.id || restaurantId;
      const unsubPedidos = subscribePedidos(empresaId, currentBranch?.id, (remotePedidos) => {
        const cleanRemote = (remotePedidos || []).filter(p => 
          p && 
          p.id && 
          !p.id.startsWith('dulci_ord_') && 
          !p.id.startsWith('ord_mock') && 
          !p.id.startsWith('mock_') && 
          p.customerName !== 'Thiago Ramos' && 
          p.customerName !== 'Larissa Castro' && 
          p.customerName !== 'Carlos Eduardo' && 
          p.customerName !== 'Amanda Pinheiro'
        );

        setOrders(prevOrders => {
          // Mantém pedidos locais offline não sincronizados
          const pendingLocal = prevOrders.filter(o => 
            o.syncStatus === 'pending_sync' && 
            !o.id.startsWith('dulci_ord_') && 
            !o.id.startsWith('mock_')
          );
          const map = new Map<string, Order>();
          cleanRemote.forEach(p => {
            map.set(p.id, {
              ...p,
              status: (p.status as OrderStatus) || 'pending',
              paymentStatus: (p.paymentStatus as any) || 'pending',
              paymentMethod: (p.paymentMethod as any) || 'pix',
              items: p.items || [],
            } as Order);
          });
          pendingLocal.forEach(p => {
            if (!map.has(p.id)) map.set(p.id, p);
          });
          const result = Array.from(map.values());
          try { localStorage.setItem('neon_orders_v3', JSON.stringify(result)); } catch (e) {}
          return result;
        });
      });

      return () => {
        unsubProds();
        unsubRetroProds();
        unsubCats();
        unsubRetroCats();
        unsubPedidos();
      };
    } catch (e) {}
  }, [tenant?.id, currentBranch?.id]);

  const [ingredients, setIngredients] = useState<Ingredient[]>(() => {
    try {
      if (localStorage.getItem('neon_is_demo_mode') === 'true') return mockIngredients;
      const saved = localStorage.getItem('neon_ingredients_v3');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const addIngredient = (data: { 
    name: string; 
    currentStock: number; 
    unit?: string; 
    costPerUnit?: number; 
    category?: string; 
    minimumStock?: number 
  }): Ingredient => {
    const unit = data.unit || 'kg';
    const currentStock = Math.max(0, Number(data.currentStock) || 0);
    // Preço unitário opcional: se não informado, registra 0 (Preço ainda não informado)
    const costPerUnit = data.costPerUnit !== undefined && data.costPerUnit !== null && !isNaN(Number(data.costPerUnit)) ? Number(data.costPerUnit) : 0;
    const minimumStock = data.minimumStock !== undefined ? Number(data.minimumStock) : Math.max(1, Math.round(currentStock * 0.3));
    const idealStock = Math.max(minimumStock * 2, Math.round(currentStock * 2));
    const status: 'critical' | 'warning' | 'ok' = 
      currentStock <= minimumStock ? 'critical' : currentStock <= minimumStock * 1.3 ? 'warning' : 'ok';

    const newIng: Ingredient = {
      id: `ing_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tenantId: tenant?.id || 'tenant_neon_01',
      name: data.name.trim(),
      category: data.category || 'Insumos',
      unit,
      currentStock,
      minimumStock,
      idealStock,
      costPerUnit,
      supplier: 'Fornecedor Cadastrado',
      leadTimeDays: 1,
      lossFactorPercent: 2.0,
      lastRestockDate: new Date().toISOString().split('T')[0],
      predictedRuptureHours: currentStock <= minimumStock ? 12 : 48,
      status
    };

    setIngredients(prev => {
      const next = [newIng, ...prev];
      try { localStorage.setItem('neon_ingredients_v3', JSON.stringify(next)); } catch (e) {}
      return next;
    });
    return newIng;
  };

  const deleteIngredient = (id: string) => {
    setIngredients(prev => {
      const next = prev.filter(i => i.id !== id);
      try { localStorage.setItem('neon_ingredients_v3', JSON.stringify(next)); } catch (e) {}
      return next;
    });
  };

  const updateIngredient = (id: string, data: { name?: string; currentStock?: number; unit?: string; costPerUnit?: number; category?: string; minimumStock?: number }) => {
    setIngredients(prev => {
      const next = prev.map(ing => {
        if (ing.id !== id) return ing;
        const currentStock = data.currentStock !== undefined ? Math.max(0, Number(data.currentStock)) : ing.currentStock;
        const minimumStock = data.minimumStock !== undefined ? Number(data.minimumStock) : ing.minimumStock;
        const status: 'critical' | 'warning' | 'ok' = 
          currentStock <= minimumStock 
            ? 'critical' 
            : currentStock <= minimumStock * 1.3 
            ? 'warning' 
            : 'ok';
        return {
          ...ing,
          name: data.name !== undefined ? data.name.trim() : ing.name,
          currentStock,
          unit: data.unit || ing.unit,
          costPerUnit: data.costPerUnit !== undefined && data.costPerUnit !== null ? Number(data.costPerUnit) : ing.costPerUnit,
          category: data.category || ing.category,
          minimumStock,
          status,
          lastRestockDate: new Date().toISOString().split('T')[0]
        };
      });
      try { localStorage.setItem('neon_ingredients_v3', JSON.stringify(next)); } catch (e) {}
      return next;
    });
  };

  const clearAllIngredients = () => {
    setIngredients([]);
    try { localStorage.setItem('neon_ingredients_v3', JSON.stringify([])); } catch (e) {}
  };

  const updateStock = (ingredientId: string, newStock: number) => {
    setIngredients(prev => {
      const next = prev.map(ing => {
        if (ing.id !== ingredientId) return ing;
        const validStock = Math.max(0, Number(newStock.toFixed(2)));
        const status: 'critical' | 'warning' | 'ok' = 
          validStock <= ing.minimumStock 
            ? 'critical' 
            : validStock <= ing.minimumStock * 1.3 
            ? 'warning' 
            : 'ok';
        return {
          ...ing,
          currentStock: validStock,
          status,
          lastRestockDate: new Date().toISOString().split('T')[0]
        };
      });
      try { localStorage.setItem('neon_ingredients_v3', JSON.stringify(next)); } catch (e) {}
      return next;
    });
  };

  const quickRestockIngredient = (ingredientId: string, addedQty: number) => {
    setIngredients(prev => {
      const next = prev.map(ing => {
        if (ing.id !== ingredientId) return ing;
        const validStock = Math.max(0, Number((ing.currentStock + addedQty).toFixed(2)));
        const status: 'critical' | 'warning' | 'ok' = 
          validStock <= ing.minimumStock 
            ? 'critical' 
            : validStock <= ing.minimumStock * 1.3 
            ? 'warning' 
            : 'ok';
        return {
          ...ing,
          currentStock: validStock,
          status,
          lastRestockDate: new Date().toISOString().split('T')[0]
        };
      });
      try { localStorage.setItem('neon_ingredients_v3', JSON.stringify(next)); } catch (e) {}
      return next;
    });
  };

  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      if (typeof window !== 'undefined') {
        // Purga chave antiga legada neon_orders se existir
        localStorage.removeItem('neon_orders');
        const saved = localStorage.getItem('neon_orders_v3');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            // Filtra rigorosamente qualquer pedido de demonstração/mock legado
            const cleanOrders = parsed.filter(o => 
              o && 
              o.id && 
              !o.id.startsWith('dulci_ord_') && 
              !o.id.startsWith('ord_mock') && 
              !o.id.startsWith('mock_') && 
              !['ord_1042', 'ord_1043', 'ord_1044', 'ord_1045'].includes(o.id) &&
              o.customerName !== 'Thiago Ramos' && 
              o.customerName !== 'Larissa Castro' && 
              o.customerName !== 'Carlos Eduardo' && 
              o.customerName !== 'Amanda Pinheiro' &&
              o.customerName !== 'Mariana Duarte' &&
              o.customerName !== 'Felipe Santana (WhatsApp Online)' &&
              o.customerName !== 'Camila Rocha (iFood)' &&
              !o.customerName?.includes('Carlos & Amigos')
            );
            try { localStorage.setItem('neon_orders_v3', JSON.stringify(cleanOrders)); } catch {}
            return cleanOrders;
          }
        }
      }
      return [];
    } catch (e) {
      return [];
    }
  });

  // Keep branch metrics strictly aligned with real sales & persist real orders
  useEffect(() => {
    const isDemo = localStorage.getItem('neon_is_demo_mode') === 'true';
    if (!isDemo) {
      const cleanOrders = orders.filter(o => 
        o && 
        o.id && 
        !o.id.startsWith('dulci_ord_') && 
        !o.id.startsWith('ord_mock') && 
        !o.id.startsWith('mock_') && 
        !['ord_1042', 'ord_1043', 'ord_1044', 'ord_1045'].includes(o.id) &&
        o.customerName !== 'Thiago Ramos' && 
        o.customerName !== 'Larissa Castro' && 
        o.customerName !== 'Carlos Eduardo' && 
        o.customerName !== 'Amanda Pinheiro' &&
        o.customerName !== 'Mariana Duarte' &&
        o.customerName !== 'Felipe Santana (WhatsApp Online)' &&
        o.customerName !== 'Camila Rocha (iFood)' &&
        !o.customerName?.includes('Carlos & Amigos')
      );
      try {
        localStorage.setItem('neon_orders_v3', JSON.stringify(cleanOrders));
      } catch (e) {}

      const realRev = cleanOrders
        .filter(o => o.status === 'completed' || (o as any).isPaid || o.paymentStatus === 'paid')
        .reduce((acc, o) => acc + (o.total ?? (o as any).totalPrice ?? 0), 0);
      const realOrders = cleanOrders.length;
      setCurrentBranch(prev => ({
        ...prev,
        revenueToday: realRev,
        ordersToday: realOrders,
        cmvToday: realRev > 0 ? prev.cmvToday : 0,
        kdsAvgTimeMin: realOrders > 0 ? prev.kdsAvgTimeMin : 0,
      }));
    }
  }, [orders]);

  const [tables, setTables] = useState<TableItem[]>(() => {
    try {
      if (localStorage.getItem('neon_is_demo_mode') === 'true') return mockTables;
      const saved = localStorage.getItem('neon_tables_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // If in real mode and not demo, verify if tables had old mock values like 'Bruna Atendente' or 'Marcelo Atendente'
          const hasOldMockWaiter = parsed.some((t: any) => 
            t.waiterName === 'Bruna Atendente' || 
            t.waiterName === 'Marcelo Atendente' || 
            t.reservationName === 'Família Silva'
          );
          if (hasOldMockWaiter) {
            return cleanInitialTables;
          }
          return parsed;
        }
      }
      return cleanInitialTables;
    } catch (e) {
      return cleanInitialTables;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('neon_tables_v3', JSON.stringify(tables));
    } catch (e) {}
  }, [tables]);

  const [comandas, setComandas] = useState<ComandaItem[]>(() => {
    try {
      if (localStorage.getItem('neon_is_demo_mode') === 'true') return mockComandas;
      const saved = localStorage.getItem('neon_comandas_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const hasOldMockComanda = parsed.some((c: any) => 
            c.customerName === 'Lucas Ferreira' || 
            c.customerName === 'Juliana Paes' || 
            c.customerName === 'Balcão Rápido - Felipe'
          );
          if (hasOldMockComanda) {
            return [];
          }
          return parsed;
        }
      }
      return [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('neon_comandas_v3', JSON.stringify(comandas));
    } catch (e) {}
  }, [comandas]);
  const [drivers, setDrivers] = useState<DeliveryDriver[]>([]);
  const [gamificationStaff, setGamificationStaff] = useState<StaffGamification[]>([]);
  // Financeiro & Lucro 100% Real - Inicia zerado, sem mocks
  const [financialEntries, setFinancialEntries] = useState<FinancialEntry[]>(() => {
    try {
      const saved = localStorage.getItem('neon_financial_entries_v3');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        // Purga rigorosamente quaisquer mocks residuais antigos (fin_01 a fin_06 ou tenant_neon_01)
        return parsed.filter(e => !e.id?.startsWith('fin_0') && e.tenantId !== 'tenant_neon_01');
      }
      return [];
    } catch (e) {
      return [];
    }
  });

  const [billsPayable, setBillsPayable] = useState<BillPayable[]>(() => {
    try {
      const saved = localStorage.getItem('neon_bills_payable_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [billsReceivable, setBillsReceivable] = useState<BillReceivable[]>(() => {
    try {
      const saved = localStorage.getItem('neon_bills_receivable_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [purchases, setPurchases] = useState<PurchaseRecord[]>(() => {
    try {
      const saved = localStorage.getItem('neon_purchases_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [cashMovements, setCashMovements] = useState<CashMovementRecord[]>(() => {
    try {
      const saved = localStorage.getItem('neon_cash_movements_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Coleções 100% Reais do Firestore: Sales, Expenses & CashMovements
  const [salesFirestore, setSalesFirestore] = useState<SaleFirestore[]>([]);
  const [expensesFirestore, setExpensesFirestore] = useState<ExpenseFirestore[]>([]);
  const [cashMovementsFirestore, setCashMovementsFirestore] = useState<CashMovementFirestore[]>([]);
  const [financialTransactions, setFinancialTransactions] = useState<FinancialTransaction[]>([]);

  // Inscrição em Tempo Real às Coleções do Firestore e Gatilho de Pedidos
  useEffect(() => {
    const empresaId = tenant?.id || 'tenant_lanchonete_dulci';
    const unsubSales = financialFirestoreService.subscribeSales(empresaId, (sales) => {
      setSalesFirestore(sales);
    });
    const unsubExpenses = financialFirestoreService.subscribeExpenses(empresaId, (expenses) => {
      setExpensesFirestore(expenses);
    });
    const unsubCash = financialFirestoreService.subscribeCashMovements(empresaId, (movements) => {
      setCashMovementsFirestore(movements);
    });
    // Gatilho: escuta em tempo real mudanças no status dos pedidos para 'finalizado'/'completed' e gera transação idempotente
    const unsubOrdersTrigger = orderFinancialTransactionService.startOrderFinalizedTransactionListener(
      empresaId,
      () => products,
      () => ingredients
    );
    const unsubTx = orderFinancialTransactionService.subscribeFinancialTransactions(empresaId, (txs) => {
      setFinancialTransactions(txs);
    });

    return () => {
      unsubSales();
      unsubExpenses();
      unsubCash();
      unsubOrdersTrigger();
      unsubTx();
    };
  }, [tenant?.id, products, ingredients]);

  // Persistência local contínua dos módulos financeiros
  useEffect(() => {
    try { localStorage.setItem('neon_financial_entries_v3', JSON.stringify(financialEntries)); } catch (e) {}
  }, [financialEntries]);

  useEffect(() => {
    try { localStorage.setItem('neon_bills_payable_v1', JSON.stringify(billsPayable)); } catch (e) {}
  }, [billsPayable]);

  useEffect(() => {
    try { localStorage.setItem('neon_bills_receivable_v1', JSON.stringify(billsReceivable)); } catch (e) {}
  }, [billsReceivable]);

  useEffect(() => {
    try { localStorage.setItem('neon_purchases_v1', JSON.stringify(purchases)); } catch (e) {}
  }, [purchases]);

  useEffect(() => {
    try { localStorage.setItem('neon_cash_movements_v1', JSON.stringify(cashMovements)); } catch (e) {}
  }, [cashMovements]);

  // Métodos de Gestão Financeira Real
  const addFinancialEntry = (entry: Omit<FinancialEntry, 'id'>): FinancialEntry => {
    const newEntry: FinancialEntry = {
      ...entry,
      id: `fin_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };
    setFinancialEntries(prev => [newEntry, ...prev]);

    // Gatilho Firestore: Se despesa operacional real e paga, persiste na coleção 'Expenses'
    if (entry.type === 'expense' && entry.status === 'paid') {
      const empresaId = entry.tenantId || tenant?.id || 'tenant_lanchonete_dulci';
      financialFirestoreService.recordExpense(
        empresaId,
        {
          empresaId,
          unidadeId: entry.branchId || currentBranch?.id || 'branch_dulci_matriz',
          category: (entry.category === 'vendas' ? 'outros' : entry.category) as any,
          description: entry.description,
          amount: entry.amount,
          paymentMethod: entry.paymentMethod,
          status: 'paid',
          expenseDate: entry.date,
          source: 'operational_expense',
          referenceId: newEntry.id,
          paidAt: new Date().toISOString()
        },
        activeCashSession?.id,
        currentUser?.name || 'Operador'
      ).catch(e => console.warn('[addFinancialEntry] Erro ao gravar despesa no Firestore:', e));
    }

    return newEntry;
  };

  const deleteFinancialEntry = (id: string) => {
    setFinancialEntries(prev => prev.filter(e => e.id !== id));
  };

  const updateFinancialEntry = (id: string, updates: Partial<FinancialEntry>) => {
    setFinancialEntries(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const addBillPayable = (data: Omit<BillPayable, 'id'>): BillPayable => {
    const newBill: BillPayable = {
      ...data,
      id: `bill_p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };
    setBillsPayable(prev => [newBill, ...prev]);
    return newBill;
  };

  const deleteBillPayable = (id: string) => {
    setBillsPayable(prev => prev.filter(b => b.id !== id));
  };

  const payBillPayable = (id: string, paymentMethod: PaymentMethod | 'transferencia' | 'boleto', paidAmount?: number) => {
    const bill = billsPayable.find(b => b.id === id);
    if (!bill) return;
    const amountToPay = paidAmount || bill.amount;
    const now = new Date().toISOString();
    const today = now.split('T')[0];

    setBillsPayable(prev => prev.map(b => b.id === id ? {
      ...b,
      status: 'paid',
      paidAt: now,
      paidAmount: amountToPay,
      paymentMethod
    } : b));

    const catMap: Record<string, any> = {
      fornecedores: 'cmv_insumos',
      aluguel: 'aluguel',
      energia: 'energia_agua',
      agua: 'energia_agua',
      internet: 'outros',
      salarios: 'folha_pagamento',
      servicos: 'manutencao',
      manutencao: 'manutencao',
      impostos: 'outros',
      marketing: 'marketing',
      outros: 'outros'
    };

    const newFin: FinancialEntry = {
      id: `fin_pay_${Date.now()}`,
      tenantId: bill.tenantId,
      branchId: bill.branchId,
      type: 'expense',
      category: catMap[bill.category] || 'outros',
      description: `Pagamento Conta: ${bill.description} (${bill.recipient || ''})`,
      amount: amountToPay,
      date: today,
      paymentMethod,
      status: 'paid'
    };
    setFinancialEntries(prev => [newFin, ...prev]);

    // Gatilho Firestore: Registra o pagamento da conta a pagar na coleção 'Expenses'
    const empresaId = bill.tenantId || tenant?.id || 'tenant_lanchonete_dulci';
    financialFirestoreService.recordExpense(
      empresaId,
      {
        empresaId,
        unidadeId: bill.branchId || currentBranch?.id || 'branch_dulci_matriz',
        category: (catMap[bill.category] as any) || 'outros',
        description: `Pagamento Conta: ${bill.description} (${bill.recipient || ''})`,
        amount: amountToPay,
        paymentMethod,
        status: 'paid',
        expenseDate: today,
        source: 'bill_payable',
        referenceId: bill.id,
        recipient: bill.recipient,
        paidAt: now
      },
      activeCashSession?.id,
      currentUser?.name || 'Gestor'
    ).catch(e => console.warn('[payBillPayable] Erro ao gravar no Firestore:', e));

    if (paymentMethod === 'cash' && activeCashSession) {
      addCashMovement('bleed', amountToPay, `Pagamento de conta: ${bill.description}`);
    }
  };

  const addBillReceivable = (data: Omit<BillReceivable, 'id'>): BillReceivable => {
    const newBill: BillReceivable = {
      ...data,
      id: `bill_r_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };
    setBillsReceivable(prev => [newBill, ...prev]);
    return newBill;
  };

  const deleteBillReceivable = (id: string) => {
    setBillsReceivable(prev => prev.filter(b => b.id !== id));
  };

  const receiveBillReceivable = (id: string, paymentMethod: PaymentMethod | 'transferencia' | 'boleto', receivedAmount?: number) => {
    const bill = billsReceivable.find(b => b.id === id);
    if (!bill) return;
    const amountReceived = receivedAmount || bill.amount;
    const now = new Date().toISOString();
    const today = now.split('T')[0];

    setBillsReceivable(prev => prev.map(b => b.id === id ? {
      ...b,
      status: 'received',
      receivedAt: now,
      receivedAmount: amountReceived,
      paymentMethod
    } : b));

    const newFin: FinancialEntry = {
      id: `fin_rec_${Date.now()}`,
      tenantId: bill.tenantId,
      branchId: bill.branchId,
      type: 'income',
      category: 'vendas',
      description: `Recebimento: ${bill.description} (${bill.customerName || ''})`,
      amount: amountReceived,
      date: today,
      paymentMethod,
      status: 'paid'
    };
    setFinancialEntries(prev => [newFin, ...prev]);

    if (paymentMethod === 'cash' && activeCashSession) {
      addCashMovement('supply', amountReceived, `Recebimento de título: ${bill.description}`);
    }
  };

  const registerPurchase = (data: Omit<PurchaseRecord, 'id' | 'createdAt'>): PurchaseRecord => {
    const id = `pur_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const today = now.split('T')[0];

    let billPayableId: string | undefined = undefined;

    if (data.paymentTerms === 'a_prazo') {
      const bill = addBillPayable({
        tenantId: data.tenantId,
        branchId: data.branchId,
        category: 'fornecedores',
        description: `Compra Insumos - ${data.supplierName} (Ref: ${id})`,
        amount: data.totalAmount,
        dueDate: data.dueDate || today,
        issueDate: data.date || today,
        status: 'pending',
        recipient: data.supplierName,
        purchaseId: id,
        notes: data.notes
      });
      billPayableId = bill.id;
    } else {
      const newFin: FinancialEntry = {
        id: `fin_pur_${Date.now()}`,
        tenantId: data.tenantId,
        branchId: data.branchId,
        type: 'expense',
        category: 'cmv_insumos',
        description: `Compra de Insumos à Vista: ${data.supplierName} (Ref: ${id})`,
        amount: data.totalAmount,
        date: data.date || today,
        paymentMethod: data.paymentMethod,
        status: 'paid'
      };
      setFinancialEntries(prev => [newFin, ...prev]);

      if (data.paymentMethod === 'cash' && activeCashSession) {
        addCashMovement('bleed', data.totalAmount, `Compra de insumos à vista: ${data.supplierName}`);
      }
    }

    // Atualização de estoque e cálculo rigoroso de custo médio ponderado
    data.items.forEach(item => {
      setIngredients(prevIngs => {
        const existing = prevIngs.find(i => i.id === item.ingredientId || i.name.toLowerCase() === item.ingredientName.toLowerCase());
        if (existing) {
          const currentQty = existing.currentStock || 0;
          const currentCost = existing.costPerUnit || 0;
          const addedQty = item.quantity;
          const addedPrice = item.unitPrice;
          const newQty = Math.max(0, Number((currentQty + addedQty).toFixed(2)));
          const newAvgCost = newQty > 0 ? Number(((currentQty * currentCost + addedQty * addedPrice) / newQty).toFixed(2)) : addedPrice;

          return prevIngs.map(i => i.id === existing.id ? {
            ...i,
            currentStock: newQty,
            costPerUnit: newAvgCost,
            supplier: data.supplierName || i.supplier,
            lastRestockDate: today,
            status: newQty <= i.minimumStock ? 'critical' : newQty <= i.minimumStock * 1.3 ? 'warning' : 'ok'
          } : i);
        } else {
          const newIng: Ingredient = {
            id: item.ingredientId || `ing_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            tenantId: data.tenantId,
            name: item.ingredientName,
            category: 'Insumos',
            unit: (item.unit as any) || 'kg',
            currentStock: item.quantity,
            minimumStock: Math.max(1, Math.round(item.quantity * 0.3)),
            idealStock: Math.round(item.quantity * 1.5),
            costPerUnit: item.unitPrice,
            supplier: data.supplierName,
            leadTimeDays: 2,
            lossFactorPercent: 0,
            lastRestockDate: today,
            status: 'ok'
          };
          return [newIng, ...prevIngs];
        }
      });
    });

    const newPurchase: PurchaseRecord = {
      ...data,
      id,
      createdAt: now,
      billPayableId
    };

    setPurchases(prev => [newPurchase, ...prev]);

    // Gatilho Firestore: Integração oficial de Compra com a coleção 'Expenses' e 'CashMovements'
    const empresaId = data.tenantId || tenant?.id || 'tenant_lanchonete_dulci';
    financialFirestoreService.recordPurchase(
      empresaId,
      {
        supplierName: data.supplierName,
        items: data.items,
        totalAmount: data.totalAmount,
        paymentTerms: data.paymentTerms,
        paymentMethod: data.paymentMethod,
        dueDate: data.dueDate,
        notes: data.notes,
        unidadeId: data.branchId || currentBranch?.id || 'branch_dulci_matriz'
      },
      activeCashSession?.id,
      currentUser?.name || 'Comprador'
    ).catch(e => console.warn('[registerPurchase] Erro ao gravar compra no Firestore:', e));

    return newPurchase;
  };

  const clearAllFinancialData = () => {
    setFinancialEntries([]);
    setBillsPayable([]);
    setBillsReceivable([]);
    setPurchases([]);
    setCashMovements([]);
    setSalesFirestore([]);
    setExpensesFirestore([]);
    setCashMovementsFirestore([]);
    try {
      localStorage.setItem('neon_financial_entries_v3', JSON.stringify([]));
      localStorage.setItem('neon_bills_payable_v1', JSON.stringify([]));
      localStorage.setItem('neon_bills_receivable_v1', JSON.stringify([]));
      localStorage.setItem('neon_purchases_v1', JSON.stringify([]));
      localStorage.setItem('neon_cash_movements_v1', JSON.stringify([]));
    } catch {}
    const empresaId = tenant?.id || 'tenant_lanchonete_dulci';
    financialFirestoreService.clearAllFinancialDataInFirestore(empresaId).catch(e => {
      console.warn('[clearAllFinancialData] Erro ao zerar dados no Firestore:', e);
    });
  };
  const [loyaltyMembers, setLoyaltyMembers] = useState<LoyaltyMember[]>([]);
  
  // Audit Logs State: 100% Real, persisted in Firestore 'auditLogs'
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('neon_audit_logs_v1');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  // Real-time Firestore sync for auditLogs
  useEffect(() => {
    const isDemo = typeof window !== 'undefined' && localStorage.getItem('neon_is_demo_mode') === 'true';
    if (isDemo) return;

    const currentTenantId = tenant?.id || 'tenant_lanchonete_dulci';
    const unsub = auditService.subscribeAuditLogs(currentTenantId, (liveLogs) => {
      if (liveLogs && liveLogs.length > 0) {
        setAuditLogs(liveLogs);
      }
    });

    return () => unsub();
  }, [tenant?.id]);

  const [saasPlans, setSaasPlans] = useState<SaaSPlan[]>(mockSaaSPlans);

  // Employees & Team Members State - Empty by default
  const [employees, setEmployees] = useState<Employee[]>(() => {
    try {
      if (localStorage.getItem('neon_is_demo_mode') === 'true') return mockEmployees;
      const saved = localStorage.getItem('neon_employees_v3');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Customers & Fidelidade CRM State - Empty by default
  const [customers, setCustomers] = useState<Customer[]>(() => {
    try {
      if (localStorage.getItem('neon_is_demo_mode') === 'true') return mockCustomers;
      const saved = localStorage.getItem('neon_customers_v3');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const addAuditLog = (entry: Omit<AuditLog, 'id' | 'timestamp'>) => {
    const resolvedTenantId = entry.tenantId || tenant?.id || 'tenant_lanchonete_dulci';
    const resolvedUserId = entry.userId || auth.currentUser?.uid || currentUser?.id || 'system';
    const resolvedUserName = entry.userName || currentUser?.name || 'Operador';
    const resolvedUserRole = entry.userRole || currentUser?.role || 'admin';

    auditService.logEvent({
      tenantId: resolvedTenantId,
      userId: resolvedUserId,
      userName: resolvedUserName,
      userEmail: entry.userEmail || currentUser?.email || auth.currentUser?.email || '',
      userRole: resolvedUserRole,
      action: entry.action,
      category: entry.category || 'system',
      description: entry.description,
      details: entry.details,
      severity: entry.severity || 'info',
      ipAddress: entry.ipAddress || (typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1')
    }).then(newLog => {
      setAuditLogs(prev => [newLog, ...prev.filter(l => l.id !== newLog.id)]);
    }).catch(() => {});
  };

  const addEmployee = (data: any): Employee => {
    const roleTitles: Record<string, string> = {
      atendente: 'Atendente de Salão (Tablet / Celular)',
      chapeiro: 'Chapeiro(a) Master na Chapa',
      auxiliar_cozinha: 'Auxiliar de Cozinha & Porções',
      cozinheiro: 'Cozinheiro(a) Chefe de Turno',
      gerente: 'Gerente Geral de Loja',
      entregador: 'Entregador Neon'
    };

    const newEmp: Employee = {
      id: `emp_${Date.now()}`,
      name: data.name || 'Novo Colaborador',
      role: data.role || 'atendente',
      roleTitle: data.roleTitle || roleTitles[data.role || 'atendente'] || 'Colaborador',
      phone: data.phone || '',
      email: data.email || '',
      cpf: data.cpf || '',
      shift: data.shift || 'integral',
      status: data.status || 'ativo',
      salary: Number(data.salary) || 2000,
      commissionPercent: Number(data.commissionPercent) || 2,
      avatarUrl: data.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      xpPoints: data.xpPoints || 1000,
      level: data.level || 1,
      salesMonth: data.salesMonth || 0,
      tipsMonth: data.tipsMonth || 0,
      ordersCompletedToday: 0,
      speedAvgMin: 8.0,
      customerRating: 5.0,
      badges: data.badges || ['🚀 Novo Integrante'],
      joinedAt: new Date().toISOString().split('T')[0],
      ...data
    };

    setEmployees(prev => {
      const next = [newEmp, ...prev];
      try { localStorage.setItem('neon_employees', JSON.stringify(next)); } catch (e) {}
      return next;
    });

    addAuditLog({
      userName: currentUser?.name || 'Administrador',
      userRole: currentUser?.role || 'owner',
      action: 'staff_registered',
      description: `Novo colaborador cadastrado: ${newEmp.name} (${newEmp.roleTitle})`,
      details: { employeeId: newEmp.id, role: newEmp.role, turno: newEmp.shift },
      ipAddress: '192.168.1.100',
      severity: 'info'
    });

    return newEmp;
  };

  const updateEmployee = (id: string, partial: Partial<Employee>) => {
    setEmployees(prev => {
      const next = prev.map(e => e.id === id ? { ...e, ...partial } : e);
      try { localStorage.setItem('neon_employees', JSON.stringify(next)); } catch (e) {}
      return next;
    });
  };

  const deleteEmployee = (id: string) => {
    setEmployees(prev => {
      const target = prev.find(e => e.id === id);
      if (target) {
        addAuditLog({
          userName: currentUser?.name || 'Administrador',
          userRole: currentUser?.role || 'owner',
          action: 'staff_removed',
          description: `Colaborador removido da equipe: ${target.name} (${target.roleTitle})`,
          details: { employeeId: target.id },
          ipAddress: '192.168.1.100',
          severity: 'warning'
        });
      }
      const next = prev.filter(e => e.id !== id);
      try { localStorage.setItem('neon_employees', JSON.stringify(next)); } catch (e) {}
      return next;
    });
  };

  const addCustomer = (data: any): Customer => {
    const newCust: Customer = {
      id: `cust_${Date.now()}`,
      name: data.name || 'Novo Cliente',
      phone: data.phone || '',
      email: data.email || '',
      cpf: data.cpf || '',
      address: data.address || '',
      segment: data.segment || 'new',
      totalOrders: Number(data.totalOrders) || 0,
      totalSpent: Number(data.totalSpent) || 0,
      cashbackBalance: Number(data.cashbackBalance) || 0,
      points: Number(data.points) || Math.round((Number(data.cashbackBalance) || 0) * 10),
      tier: data.tier || 'bronze',
      lastOrderDate: new Date().toISOString().split('T')[0],
      notes: data.notes || '',
      ...data
    };

    setCustomers(prev => {
      const next = [newCust, ...prev];
      try { localStorage.setItem('neon_customers', JSON.stringify(next)); } catch (e) {}
      return next;
    });
    return newCust;
  };

  const updateCustomer = (id: string, partial: Partial<Customer>) => {
    setCustomers(prev => {
      const next = prev.map(c => c.id === id ? { ...c, ...partial } : c);
      try { localStorage.setItem('neon_customers', JSON.stringify(next)); } catch (e) {}
      return next;
    });
  };

  const deleteCustomer = (id: string) => {
    setCustomers(prev => {
      const next = prev.filter(c => c.id !== id);
      try { localStorage.setItem('neon_customers', JSON.stringify(next)); } catch (e) {}
      return next;
    });
  };

  const addCashback = (customerId: string, amount: number) => {
    setCustomers(prev => {
      const next = prev.map(c => {
        if (c.id === customerId) {
          return {
            ...c,
            cashbackBalance: Math.max(0, c.cashbackBalance + amount),
            points: (c.points || 0) + Math.round(amount * 10)
          };
        }
        return c;
      });
      try { localStorage.setItem('neon_customers', JSON.stringify(next)); } catch (e) {}
      return next;
    });
  };

  const redeemCashback = (customerId: string, amount: number): boolean => {
    let success = false;
    setCustomers(prev => {
      const cust = prev.find(c => c.id === customerId);
      if (!cust || cust.cashbackBalance < amount) return prev;
      success = true;
      const next = prev.map(c => {
        if (c.id === customerId) {
          return { ...c, cashbackBalance: Math.max(0, c.cashbackBalance - amount) };
        }
        return c;
      });
      try { localStorage.setItem('neon_customers', JSON.stringify(next)); } catch (e) {}
      return next;
    });
    return success;
  };
  
  // Webhooks & Partner Integrations State
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportModalInitialTab, setExportModalInitialTab] = useState<'produtos' | 'vendas' | 'auditoria' | 'completo'>('completo');

  const openExportModal = (tab: 'produtos' | 'vendas' | 'auditoria' | 'completo' = 'completo') => {
    setExportModalInitialTab(tab);
    setIsExportModalOpen(true);
  };
  const [webhookAutoSimulation, setWebhookAutoSimulation] = useState(true);
  const [webhookNotifications, setWebhookNotifications] = useState<WebhookNotification[]>(() => {
    const saved = localStorage.getItem('neon_webhook_notifications');
    return saved ? JSON.parse(saved) : [
      {
        id: 'wh_init_1',
        provider: 'ifood',
        eventType: 'order.created',
        title: 'iFood • Pedido #1042 Recebido',
        message: 'Cliente: Roberto Almeida - R$ 76,80 (2 itens)',
        orderCode: '#1042',
        amount: 76.80,
        timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
        read: true
      },
      {
        id: 'wh_init_2',
        provider: 'mercadopago',
        eventType: 'payment.approved',
        title: 'Mercado Pago • PIX Aprovado',
        message: 'Recebimento de R$ 94,90 (Mesa 04)',
        amount: 94.90,
        timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
        read: true
      }
    ];
  });
  
  // Active Cash Session
  const [activeCashSession, setActiveCashSession] = useState<CashSession | null>({
    id: 'cash_sess_01',
    tenantId: mockTenant.id,
    branchId: mockBranches[0].id,
    openedBy: mockCurrentUser.name,
    openedAt: '2026-08-23T11:30:00Z',
    status: 'open',
    initialAmount: 200.00,
    cashSales: 450.00,
    pixSales: 3890.50,
    creditSales: 2600.00,
    debitSales: 900.00,
    voucherSales: 0,
    totalInflow: 7840.50,
    bleedAmount: 300.00,
    supplyAmount: 50.00,
    calculatedFinalAmount: 400.00,
  });

  // Modal print & AI
  const [printOrder, setPrintOrder] = useState<Order | null>(null);
  const [isAICopilotOpen, setIsAICopilotOpen] = useState(false);
  const [simulationActive, setSimulationActive] = useState(true);

  // Native Push Notification State
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermissionState>(getNotificationPermissionStatus());

  // High-priority kitchen audio chime for incoming / received orders using use-sound & alerta-pedido.mp3
  const [playOrderReceivedSound] = useSound(alertaPedidoSound, {
    volume: 1.0,
    interrupt: true,
  });

  // Sound triggering function firing use-sound audio alert with fallback for maximum reliability
  const triggerOrderReceivedAlert = () => {
    try {
      if (typeof playOrderReceivedSound === 'function') {
        playOrderReceivedSound();
      }
    } catch (e) {
      console.warn('[Audio Alert Fallback]', e);
    }
    // Web Audio API harmonic chime fallback
    playLoudOrderAlert();
  };

  // Listen for Service Worker Notification Click Navigation events
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const messageHandler = (event: MessageEvent) => {
        if (event.data?.type === 'NOTIFICATION_CLICKED') {
          const action = event.data.action;
          const data = event.data.data;
          if (action === 'open_kds' || data?.targetView === 'kds') {
            setCurrentView('kds');
          } else if (action === 'open_orders' || data?.targetView === 'orders') {
            setCurrentView('central_pedidos');
          } else if (action === 'open_caixa' || data?.targetView === 'caixa') {
            setCurrentView('pdv');
          }
        }
      };
      navigator.serviceWorker.addEventListener('message', messageHandler);
      return () => {
        navigator.serviceWorker.removeEventListener('message', messageHandler);
      };
    }
  }, []);

  const requestPushNotifications = async (): Promise<NotificationPermissionState> => {
    const status = await requestNotificationPermission();
    setNotificationPermission(status);
    if (status === 'granted') {
      await triggerNativePushNotification({
        title: '🔔 Alertas Nativos Ativados!',
        body: 'O NEON FOOD OS alertará o restaurante com som e pop-up do sistema operacional para todos os novos pedidos.',
        tag: 'push_activated',
        targetView: 'kds'
      });
    }
    return status;
  };

  const testPushNotification = async (title?: string, body?: string): Promise<boolean> => {
    return triggerNativePushNotification({
      title: title || '🚨 NOVO PEDIDO #1089 (IFOOD)',
      body: body || 'Cliente: Roberto Almeida • 2 itens • R$ 76,80 • Enviado direto para o KDS Cozinha!',
      tag: `test_push_${Date.now()}`,
      targetView: 'kds',
      actions: [
        { action: 'open_kds', title: '👨‍🍳 Ver no KDS' },
        { action: 'open_orders', title: '📋 Pedidos' }
      ]
    });
  };

  // Offline & Service Worker Resilience State
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isForceOffline, setIsForceOffline] = useState<boolean>(false);
  const [networkLatencyMs, setNetworkLatencyMs] = useState<number>(18);
  const [pendingSyncQueue, setPendingSyncQueue] = useState<OfflinePendingAction[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<string | null>(null);
  const [isOfflineSyncModalOpen, setIsOfflineSyncModalOpen] = useState<boolean>(false);

  const effectiveIsOnline = isOnline && !isForceOffline;

  // Enqueue offline action helper
  const enqueueOfflineAction = async (
    type: OfflinePendingAction['type'],
    description: string,
    payload: any
  ) => {
    const newAction: OfflinePendingAction = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
      description,
      payload,
      timestamp: new Date().toISOString(),
      clientTimestamp: Date.now(),
      status: 'pending',
      retries: 0
    };
    await offlineStorage.save(newAction);
    setPendingSyncQueue(prev => [newAction, ...prev]);
    registerServiceWorkerSync();
  };

  // Trigger batch sync with server
  const triggerManualSync = async (): Promise<{ success: boolean; syncedCount: number }> => {
    if (isSyncing) return { success: false, syncedCount: 0 };
    const currentQueue = await offlineStorage.getAll();
    if (currentQueue.length === 0) {
      return { success: true, syncedCount: 0 };
    }

    setIsSyncing(true);
    try {
      const result = await syncBatchWithServer(currentQueue);
      if (result.success) {
        await offlineStorage.clear();
        setPendingSyncQueue([]);
        setLastSyncTimestamp(new Date().toISOString());

        // Update local orders sync status
        setOrders(prev => prev.map(o => o.syncStatus === 'pending_sync' ? { ...o, syncStatus: 'synced' } : o));

        playCashRegister();

        const newLog: AuditLog = {
          id: `log_sync_${Date.now()}`,
          timestamp: new Date().toISOString(),
          userName: currentUser.name,
          userRole: currentUser.role,
          action: 'system_backup',
          description: `Sincronização Offline Concluída: ${result.syncedCount} ações sincronizadas com o servidor`,
          details: { syncedCount: result.syncedCount, processedIds: result.processedIds },
          ipAddress: '192.168.1.1',
          severity: 'info'
        };
        setAuditLogs(prev => [newLog, ...prev]);

        return { success: true, syncedCount: result.syncedCount };
      }
      return { success: false, syncedCount: 0 };
    } catch (e) {
      console.warn('[Offline Sync Trigger error]', e);
      return { success: false, syncedCount: 0 };
    } finally {
      setIsSyncing(false);
    }
  };

  // Toggle simulated offline mode
  const toggleForceOffline = () => {
    setIsForceOffline(prev => {
      const next = !prev;
      if (!next) {
        // Toggled back to online -> trigger automatic sync of any pending queue items
        setTimeout(() => {
          triggerManualSync();
        }, 400);
      }
      playBeep(next ? 440 : 880, 0.06);
      return next;
    });
  };

  // Clear sync queue
  const clearSyncQueue = async () => {
    await offlineStorage.clear();
    setPendingSyncQueue([]);
    playBeep(500, 0.04);
  };

  // Remove individual item
  const removeSyncQueueItem = async (id: string) => {
    await offlineStorage.remove(id);
    setPendingSyncQueue(prev => prev.filter(item => item.id !== id));
  };

  // Helper to simulate an offline order easily
  const simulateOfflineOrder = () => {
    const nextNumber = Math.max(1040, ...orders.map(o => o.orderNumber)) + 1;
    const testItems = [
      {
        id: `item_${Date.now()}_1`,
        productId: products[0]?.id || 'prod_01',
        productName: products[0]?.name || 'X-Salada Especial Dulci',
        quantity: 2,
        unitPrice: products[0]?.price || 34.90,
        totalPrice: (products[0]?.price || 34.90) * 2,
        station: 'grill' as const,
        status: 'pending' as const
      },
      {
        id: `item_${Date.now()}_2`,
        productId: products[1]?.id || 'prod_02',
        productName: 'Batata Rústica Especial',
        quantity: 1,
        unitPrice: 19.90,
        totalPrice: 19.90,
        station: 'fryer' as const,
        status: 'pending' as const
      }
    ];
    const total = testItems.reduce((acc, i) => acc + i.totalPrice, 0);

    createOrder({
      customerName: 'Cliente Offline (Simulação)',
      channel: 'pdv_balcao',
      items: testItems,
      total,
      subtotal: total,
      paymentMethod: 'pix',
      paymentStatus: 'paid',
      status: 'recebido'
    });
  };

  // Load offline queue and initialize listeners on mount
  useEffect(() => {
    // 1. Initial queue load
    offlineStorage.getAll().then(items => {
      setPendingSyncQueue(items);
    });

    // 2. Register Service Worker Background Sync
    registerServiceWorkerSync();

    // 3. Online/Offline window events
    const handleOnline = () => {
      setIsOnline(true);
      pingServerHealth().then(r => setNetworkLatencyMs(r.latencyMs));
      // Auto-sync when reconnection is detected!
      triggerManualSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setNetworkLatencyMs(0);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 4. Periodic ping to check actual connection
    const intervalId = setInterval(() => {
      if (navigator.onLine && !isForceOffline) {
        pingServerHealth().then(r => {
          setIsOnline(r.online);
          setNetworkLatencyMs(r.latencyMs);
        });
      }
    }, 15000);

    // 5. Service worker messages
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const swMessageHandler = (event: MessageEvent) => {
        if (event.data?.type === 'SERVICE_WORKER_BACKGROUND_SYNC') {
          console.log('[App] Background sync signal received from Service Worker');
          triggerManualSync();
        } else if (event.data?.type === 'SW_SYNC_SUCCESS') {
          setPendingSyncQueue([]);
          setLastSyncTimestamp(new Date().toISOString());
        }
      };
      navigator.serviceWorker.addEventListener('message', swMessageHandler);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        clearInterval(intervalId);
        navigator.serviceWorker.removeEventListener('message', swMessageHandler);
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
    };
  }, [isForceOffline]);

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem('neon_products', JSON.stringify(products));
    } catch (e) {}
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem('neon_ingredients', JSON.stringify(ingredients));
    } catch (e) {}
  }, [ingredients]);

  useEffect(() => {
    try {
      localStorage.setItem('neon_orders', JSON.stringify(orders));
    } catch (e) {}
  }, [orders]);

  // Role Switcher helper com validação de backend e persistência real
  const switchRole = async (role: UserRole) => {
    if (role === 'super_admin') {
      const targetUid = auth.currentUser?.uid || currentUser.id;
      const isAuthorized = await checkSuperAdminAuthorization(targetUid);
      if (!isAuthorized) {
        setIsSuperAdminAuthorized(false);
        setSuperAdminDenialReason('Troca de perfil bloqueada: O ID deste usuário não possui a claim personalizada "role: super_admin" no Firestore/Auth.');
        setCurrentViewSafely('acesso_negado');
        playBeep(350, 0.1);
        return;
      }
      setIsSuperAdminAuthorized(true);

      // Buscar displayName real do Super Admin no Firestore
      let superAdminDisplayName = 'Super Administrador';
      try {
        const snap = await getDoc(doc(db, 'users', targetUid));
        if (snap.exists()) {
          const d = snap.data();
          const persisted = d.displayName || d.name;
          // Exibir 'Alesandro Windson' apenas quando esse for o dado persistido para o UID do Super Admin
          if (persisted === 'Alesandro Windson') {
            superAdminDisplayName = 'Alesandro Windson';
          } else if (persisted) {
            superAdminDisplayName = persisted;
          }
        } else if (auth.currentUser?.displayName) {
          superAdminDisplayName = auth.currentUser.displayName;
        }
      } catch {}

      setCurrentUser(prev => ({
        ...prev,
        role: 'super_admin',
        name: superAdminDisplayName,
        displayName: superAdminDisplayName,
      }));
      setSupportAdminName(superAdminDisplayName);
      playBeep(650, 0.05);
      return;
    }

    setIsSuperAdminAuthorized(false);
    if (currentView === 'super_admin') {
      setCurrentViewSafely('overview_bi');
    }

    // Persistir a role real no Firestore se o usuário estiver autenticado no Firebase Auth
    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'users', auth.currentUser.uid), {
          role,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      } catch (err) {
        console.warn('Aviso: Não foi possível sincronizar nova role no Firestore:', err);
      }
    }

    setCurrentUser(prev => ({
      ...prev,
      role,
    }));
    playBeep(650, 0.05);
  };

  // Direct Profile Switchers
  const switchToSuperAdmin = async () => {
    try {
      sessionStorage.setItem('super_admin_verified', 'true');
      sessionStorage.setItem('super_admin_auth', 'true');
    } catch {}

    const targetUid = auth.currentUser?.uid || SUPER_ADMIN_USER.id;
    const isAuthorized = await checkSuperAdminAuthorization(targetUid);
    if (isAuthorized) {
      setIsSuperAdminAuthorized(true);
      setSuperAdminDenialReason('');

      // Buscar displayName real do Super Admin no Firestore
      let superAdminDisplayName = 'Super Administrador';
      try {
        const snap = await getDoc(doc(db, 'users', targetUid));
        if (snap.exists()) {
          const d = snap.data();
          const persisted = d.displayName || d.name;
          // Exibir 'Alesandro Windson' apenas quando esse for o dado persistido para o UID do Super Admin
          if (persisted === 'Alesandro Windson') {
            superAdminDisplayName = 'Alesandro Windson';
          } else if (persisted) {
            superAdminDisplayName = persisted;
          }
        } else if (auth.currentUser?.displayName) {
          superAdminDisplayName = auth.currentUser.displayName;
        }
      } catch (e) {
        if (auth.currentUser?.displayName) {
          superAdminDisplayName = auth.currentUser.displayName;
        }
      }

      setCurrentUser(prev => ({
        ...prev,
        id: targetUid,
        name: superAdminDisplayName,
        displayName: superAdminDisplayName,
        role: 'super_admin',
      }));
      setSupportAdminName(superAdminDisplayName);
      setCurrentViewSafely('super_admin');
      playBeep(880, 0.08);
    } else {
      setIsSuperAdminAuthorized(false);
      setCurrentViewSafely('acesso_negado');
      playBeep(350, 0.1);
    }
  };

  const switchToUser = async () => {
    try {
      sessionStorage.removeItem('super_admin_verified');
      sessionStorage.removeItem('super_admin_auth');
    } catch {}
    setIsSuperAdminAuthorized(false);

    let userDisplayName = 'Usuário Gestor';
    const targetUid = auth.currentUser?.uid || 'usr_gestor';
    try {
      if (auth.currentUser) {
        const snap = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (snap.exists()) {
          const d = snap.data();
          userDisplayName = d.displayName || d.name || auth.currentUser.displayName || 'Usuário Gestor';
        } else if (auth.currentUser.displayName) {
          userDisplayName = auth.currentUser.displayName;
        }
      }
    } catch {}

    setCurrentUser(prev => ({
      ...prev,
      id: targetUid,
      name: userDisplayName,
      displayName: userDisplayName,
      role: 'owner',
    }));
    setTenant(TEST_TENANT_DULCI);
    setBranches(INITIAL_BRANCHES_DULCI);
    setCurrentBranch(INITIAL_BRANCHES_DULCI[0]);
    setCurrentViewSafely('overview_bi');
    playBeep(650, 0.05);
  };

  // Modo de Suporte / Impersonação do Super Admin
  const enterSupportMode = (accountName?: string, tenantId?: string) => {
    if (tenantId) {
      const foundTenant = allTenants.find(t => t.id === tenantId);
      if (foundTenant) {
        setSupportAccountName(`${foundTenant.owner} — ${foundTenant.name}`);
        setTenant(prev => ({
          ...prev,
          id: foundTenant.id,
          name: foundTenant.name,
          slug: foundTenant.id.replace('tenant_', ''),
          cnpj: foundTenant.cnpj,
          planId: foundTenant.planId,
          planName: foundTenant.planName,
          monthlyFee: foundTenant.monthlyRevenue,
          status: foundTenant.status === 'active' ? 'active' : 'trial',
          trialEndsAt: foundTenant.expiresAt || '2026-12-31',
          createdAt: foundTenant.joinedAt
        }));
      } else {
        setSupportAccountName(accountName || tenant?.name || 'Restaurante');
      }
    } else if (accountName) {
      setSupportAccountName(accountName);
    } else {
      setSupportAccountName(tenant?.name || 'Restaurante');
    }
    setIsSupportMode(true);
    try {
      sessionStorage.setItem('neon_support_mode', 'true');
    } catch {}
    setCurrentUser(prev => ({
      ...prev,
      role: 'owner',
    }));
    setCurrentView('overview_bi');
    playCashRegister();
  };

  const exitSupportMode = () => {
    setIsSupportMode(false);
    try {
      sessionStorage.removeItem('neon_support_mode');
    } catch {}
    switchToSuperAdmin();
    playBeep(880, 0.08);
  };

  // Branch CRUD Methods with Firestore Persistence
  const addBranch = async (newBranchData: Omit<Branch, 'id'> & { id?: string }) => {
    const id = newBranchData.id || `branch_${Date.now()}`;
    const newBranch: Branch = {
      ...newBranchData,
      id,
      tenantId: tenant?.id || 'tenant_lanchonete_dulci',
      code: newBranchData.code || `DULCI-${String(branches.length + 1).padStart(2, '0')}`,
      status: newBranchData.status || 'open',
      branchStatus: newBranchData.branchStatus || 'Ativa',
      revenueToday: 0,
      ordersToday: 0,
      cmvToday: 0,
      kdsAvgTimeMin: 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setBranches(prev => {
      const next = [...prev, newBranch];
      try { localStorage.setItem('neon_branches_v3', JSON.stringify(next)); } catch {}
      return next;
    });

    await saveBranchToFirestore(newBranch.tenantId, newBranch);
    await saveUnidade(newBranch.tenantId, {
      id: newBranch.id,
      empresaId: newBranch.tenantId,
      tenantId: newBranch.tenantId,
      name: newBranch.name,
      code: newBranch.code,
      city: newBranch.city || 'São Paulo',
      state: newBranch.state || 'SP',
      address: newBranch.address || '',
      phone: newBranch.phone || '',
      whatsapp: newBranch.whatsapp || '',
      email: newBranch.email || '',
      isMain: newBranch.isMain || false,
      status: (newBranch.branchStatus as any) || 'Ativa',
      cnpj: newBranch.cnpj || '',
      kdsAvgTimeMin: newBranch.kdsAvgTimeMin || 10,
      createdAt: newBranch.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).catch(() => {});

    addAuditLog({
      action: 'branch_created',
      description: `Nova filial cadastrada: ${newBranch.name} (${newBranch.city || 'São Paulo'}).`,
      userName: currentUser.name || 'Usuário',
      userRole: currentUser.role || 'owner',
      severity: 'info',
      ipAddress: '127.0.0.1'
    });
  };

  const updateBranch = async (updatedBranch: Branch) => {
    const enriched: Branch = {
      ...updatedBranch,
      updatedAt: new Date().toISOString()
    };

    setBranches(prev => {
      const next = prev.map(b => b.id === enriched.id ? enriched : b);
      try { localStorage.setItem('neon_branches_v3', JSON.stringify(next)); } catch {}
      return next;
    });

    if (currentBranch.id === enriched.id) {
      setCurrentBranch(enriched);
    }

    await saveBranchToFirestore(enriched.tenantId || tenant.id, enriched);
    await saveUnidade(enriched.tenantId || tenant.id, {
      id: enriched.id,
      empresaId: enriched.tenantId || tenant.id,
      tenantId: enriched.tenantId || tenant.id,
      name: enriched.name,
      code: enriched.code,
      city: enriched.city || 'São Paulo',
      state: enriched.state || 'SP',
      address: enriched.address || '',
      phone: enriched.phone || '',
      whatsapp: enriched.whatsapp || '',
      email: enriched.email || '',
      isMain: enriched.isMain || false,
      status: (enriched.branchStatus as any) || 'Ativa',
      cnpj: enriched.cnpj || '',
      kdsAvgTimeMin: enriched.kdsAvgTimeMin || 10,
      createdAt: enriched.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).catch(() => {});

    addAuditLog({
      action: 'branch_updated',
      description: `Dados cadastrais e endereço da filial atualizados: ${enriched.name}.`,
      userName: currentUser.name || 'Usuário',
      userRole: currentUser.role || 'owner',
      severity: 'info',
      ipAddress: '127.0.0.1'
    });
  };

  const deleteBranch = async (branchId: string) => {
    setBranches(prev => {
      const next = prev.filter(b => b.id !== branchId);
      try { localStorage.setItem('neon_branches_v3', JSON.stringify(next)); } catch {}
      return next;
    });

    if (currentBranch.id === branchId && branches.length > 1) {
      const remaining = branches.filter(b => b.id !== branchId);
      setCurrentBranch(remaining[0]);
    }

    await deleteBranchFromFirestore(tenant.id, branchId);
  };

  // Support Tickets Methods with Firestore Persistence
  const createSupportTicket = async (data: { subject: string; category: SupportTicket['category']; priority: TicketPriority; description: string }): Promise<SupportTicket> => {
    const ticketNum = `#TK-${1000 + supportTickets.length + 1}`;
    const newTicket: SupportTicket = {
      id: `ticket_${Date.now()}`,
      ticketNumber: ticketNum,
      tenantId: tenant.id,
      tenantName: tenant.name,
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email || 'contato@lanchonetedulci.com.br',
      userPhone: currentUser.phone,
      subject: data.subject,
      category: data.category,
      priority: data.priority,
      status: 'open',
      description: data.description,
      messages: [
        {
          id: `msg_${Date.now()}`,
          senderId: currentUser.id,
          senderName: currentUser.name,
          senderRole: currentUser.role,
          message: data.description,
          createdAt: new Date().toISOString(),
          isStaffReply: false
        }
      ],
      assignedTo: 'usr_superadmin_alesandro',
      assignedStaffName: 'Equipe de Suporte',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setSupportTickets(prev => {
      const next = [newTicket, ...prev];
      try { localStorage.setItem('neon_support_tickets_v3', JSON.stringify(next)); } catch {}
      return next;
    });

    await saveSupportTicketToFirestore(newTicket);
    return newTicket;
  };

  const replySupportTicket = async (ticketId: string, message: string, isStaffReply: boolean = false) => {
    const newMsg: TicketMessage = {
      id: `msg_${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      message,
      createdAt: new Date().toISOString(),
      isStaffReply: isStaffReply || currentUser.role === 'super_admin'
    };

    setSupportTickets(prev => {
      const next = prev.map(t => {
        if (t.id === ticketId) {
          const updated: SupportTicket = {
            ...t,
            messages: [...t.messages, newMsg],
            status: isStaffReply ? 'in_progress' : t.status,
            updatedAt: new Date().toISOString()
          };
          saveSupportTicketToFirestore(updated).catch(() => {});
          return updated;
        }
        return t;
      });
      try { localStorage.setItem('neon_support_tickets_v3', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const updateTicketStatus = async (ticketId: string, status: TicketStatus) => {
    setSupportTickets(prev => {
      const next = prev.map(t => {
        if (t.id === ticketId) {
          const updated: SupportTicket = {
            ...t,
            status,
            updatedAt: new Date().toISOString(),
            resolvedAt: status === 'resolved' || status === 'closed' ? new Date().toISOString() : t.resolvedAt
          };
          saveSupportTicketToFirestore(updated).catch(() => {});
          return updated;
        }
        return t;
      });
      try { localStorage.setItem('neon_support_tickets_v3', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // Tenant settings update
  const updateTenantSettings = (settings: Partial<Tenant['settings']>) => {
    setTenant(prev => ({
      ...prev,
      settings: { ...prev.settings, ...settings },
    }));
  };

  // Cash Session controls
  const openCashSession = (initialAmount: number) => {
    const newSession: CashSession = {
      id: `cash_${Date.now()}`,
      tenantId: tenant.id,
      branchId: currentBranch.id,
      openedBy: currentUser.name,
      openedAt: new Date().toISOString(),
      status: 'open',
      initialAmount,
      cashSales: 0,
      pixSales: 0,
      creditSales: 0,
      debitSales: 0,
      voucherSales: 0,
      totalInflow: 0,
      bleedAmount: 0,
      supplyAmount: 0,
      calculatedFinalAmount: initialAmount,
    };
    setActiveCashSession(newSession);
    playCashRegister();

    // Gatilho Firestore: Registra abertura na coleção 'CashMovements'
    financialFirestoreService.recordCashMovement(
      tenant.id,
      {
        empresaId: tenant.id,
        unidadeId: currentBranch.id,
        sessionId: newSession.id,
        type: 'opening',
        amount: initialAmount,
        paymentMethod: 'cash',
        reason: `Abertura de Caixa inicial: R$ ${initialAmount.toFixed(2)}`,
        operatorName: currentUser.name,
        timestamp: newSession.openedAt,
      }
    ).catch(e => console.warn('[openCashSession] Erro ao gravar abertura no Firestore:', e));

    // Auditoria Global: Gravar abertura de caixa no Firestore 'auditLogs'
    auditService.logAction({
      actionType: 'cash_supply',
      userId: currentUser.id,
      tenantId: tenant.id,
      description: `Abertura de Caixa inicial no valor de R$ ${initialAmount.toFixed(2)} realizada por ${currentUser.name}.`,
      metadata: {
        sessionId: newSession.id,
        initialAmount,
        openedBy: currentUser.name,
        branchId: currentBranch.id
      },
      severity: 'info'
    }).catch(() => {});
  };

  const closeCashSession = (countedAmount: number, notes?: string) => {
    if (!activeCashSession) return;
    const diff = countedAmount - activeCashSession.calculatedFinalAmount;
    const closedSession = {
      ...activeCashSession,
      status: 'closed' as const,
      closedBy: currentUser.name,
      closedAt: new Date().toISOString(),
      countedFinalAmount: countedAmount,
      difference: diff,
      notes,
    };
    setActiveCashSession(closedSession);
    playCashRegister();

    // Gatilho Firestore: Registra fechamento na coleção 'CashMovements'
    financialFirestoreService.recordCashMovement(
      tenant.id,
      {
        empresaId: tenant.id,
        unidadeId: currentBranch.id,
        sessionId: activeCashSession.id,
        type: 'closing',
        amount: countedAmount,
        paymentMethod: 'cash',
        reason: `Fechamento de Caixa - Contado: R$ ${countedAmount.toFixed(2)}${notes ? ' (' + notes + ')' : ''}`,
        operatorName: currentUser.name,
        timestamp: new Date().toISOString(),
      }
    ).catch(e => console.warn('[closeCashSession] Erro ao gravar fechamento no Firestore:', e));

    // Auditoria Global: Gravar fechamento de caixa no Firestore 'auditLogs'
    auditService.logAction({
      actionType: 'cash_close',
      userId: currentUser.id,
      tenantId: tenant.id,
      description: `Fechamento de Caixa: R$ ${countedAmount.toFixed(2)} conferido (Diferença: R$ ${diff.toFixed(2)}) por ${currentUser.name}.`,
      metadata: {
        sessionId: activeCashSession.id,
        countedAmount,
        difference: diff,
        notes
      },
      severity: Math.abs(diff) > 0 ? 'warning' : 'info'
    }).catch(() => {});
  };

  const addCashMovement = (type: 'bleed' | 'supply', amount: number, reason: string) => {
    if (!activeCashSession) return;
    setActiveCashSession(prev => {
      if (!prev) return null;
      const bleed = type === 'bleed' ? prev.bleedAmount + amount : prev.bleedAmount;
      const supply = type === 'supply' ? prev.supplyAmount + amount : prev.supplyAmount;
      const calculated = prev.initialAmount + prev.cashSales + supply - bleed;
      return {
        ...prev,
        bleedAmount: bleed,
        supplyAmount: supply,
        calculatedFinalAmount: calculated,
      };
    });

    // Gatilho Firestore: Registra sangria/suprimento na coleção 'CashMovements'
    financialFirestoreService.recordCashMovement(
      tenant.id,
      {
        empresaId: tenant.id,
        unidadeId: currentBranch.id,
        sessionId: activeCashSession.id,
        type: type === 'bleed' ? 'bleed' : 'supply',
        amount,
        paymentMethod: 'cash',
        reason: `${type === 'bleed' ? 'Sangria' : 'Suprimento'}: ${reason}`,
        operatorName: currentUser.name,
        timestamp: new Date().toISOString(),
      }
    ).catch(e => console.warn('[addCashMovement] Erro ao gravar movimentação no Firestore:', e));

    // Log in audit
    auditService.logAction({
      actionType: type === 'bleed' ? 'cash_bleed' : 'cash_supply',
      userId: currentUser.id,
      tenantId: tenant.id,
      description: `${type === 'bleed' ? 'Sangria' : 'Suprimento'} de caixa de R$ ${amount.toFixed(2)} - Motivo: ${reason}`,
      metadata: { amount, type, reason },
      severity: type === 'bleed' ? 'warning' : 'info'
    }).then(logged => {
      setAuditLogs(prev => [logged, ...prev.filter(l => l.id !== logged.id)]);
    }).catch(() => {});

    // If offline, enqueue for cloud sync
    if (!effectiveIsOnline) {
      enqueueOfflineAction('CASH_MOVEMENT', `${type === 'bleed' ? 'Sangria' : 'Suprimento'} de Caixa R$ ${amount.toFixed(2)} (${reason})`, {
        type,
        amount,
        reason,
        cashSessionId: activeCashSession.id
      });
    }
  };

  // Order lifecycle
  const createOrder = (orderData: Partial<Order>): Order => {
    const nextNumber = Math.max(1040, ...orders.map(o => o.orderNumber)) + 1;
    const initialStatus: OrderStatus = orderData.status || 'recebido';
    const isOffline = !effectiveIsOnline;

    const newOrder: Order = {
      id: `ord_${Date.now()}`,
      orderNumber: nextNumber,
      displayCode: `#${nextNumber}`,
      tenantId: tenant.id,
      branchId: currentBranch.id,
      channel: orderData.channel || 'pdv_balcao',
      status: initialStatus,
      customerName: orderData.customerName || 'Cliente Balcão',
      customerPhone: orderData.customerPhone,
      customerAddress: orderData.customerAddress,
      tableNumber: orderData.tableNumber,
      comandaNumber: orderData.comandaNumber,
      items: orderData.items || [],
      subtotal: orderData.subtotal || 0,
      discount: orderData.discount || 0,
      deliveryFee: orderData.deliveryFee || 0,
      serviceFee: orderData.serviceFee || 0,
      total: orderData.total || 0,
      paymentMethod: orderData.paymentMethod || 'pix',
      paymentStatus: orderData.paymentStatus || 'paid',
      paidAmount: orderData.paidAmount || orderData.total || 0,
      pixTxId: orderData.pixTxId,
      pixEndToEndId: orderData.pixEndToEndId,
      pixPaidAt: orderData.pixPaidAt,
      cashbackEarned: Number(((orderData.total || 0) * (tenant.settings.cashbackPercent / 100)).toFixed(2)),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      estimatedDeliveryMin: 35,
      isOfflineCreated: isOffline,
      syncStatus: isOffline ? 'pending_sync' : 'synced',
    };

    setOrders(prev => [newOrder, ...prev]);

    // Sincronizar na coleção multi-tenant de Pedidos no Firestore
    const orderEmpresaId = newOrder.tenantId || tenant.id || 'tenant_lanchonete_dulci';
    savePedido(orderEmpresaId, {
      id: newOrder.id,
      empresaId: orderEmpresaId,
      unidadeId: newOrder.branchId || currentBranch.id || 'branch_dulci_matriz',
      tenantId: orderEmpresaId,
      branchId: newOrder.branchId || currentBranch.id || 'branch_dulci_matriz',
      orderNumber: newOrder.orderNumber,
      displayCode: newOrder.displayCode,
      channel: newOrder.channel,
      status: newOrder.status,
      customerName: newOrder.customerName,
      customerPhone: newOrder.customerPhone,
      tableNumber: newOrder.tableNumber,
      subtotal: newOrder.subtotal,
      discount: newOrder.discount,
      deliveryFee: newOrder.deliveryFee,
      serviceFee: newOrder.serviceFee,
      total: newOrder.total,
      paymentMethod: newOrder.paymentMethod,
      paymentStatus: newOrder.paymentStatus,
      preparationNotes: newOrder.preparationNotes,
      createdAt: newOrder.createdAt,
      updatedAt: newOrder.updatedAt,
    }).catch(() => {});

    // If device is offline, enqueue in local persistent queue for automatic cloud sync
    if (isOffline) {
      enqueueOfflineAction('CREATE_ORDER', `Pedido #${newOrder.orderNumber} - ${newOrder.customerName} (R$ ${newOrder.total.toFixed(2)})`, newOrder);
    }

    // Automatically trigger audio alert when order is created in 'recebido', 'pending' or 'preparing' status
    if (initialStatus === 'recebido' || initialStatus === 'pending' || initialStatus === 'preparing') {
      triggerOrderReceivedAlert();
    }

    // Auditoria Global: Registrar criação de pedido no Firestore 'auditLogs'
    auditService.logOrderCreation(newOrder, currentUser, orderEmpresaId).catch(() => {});

    // Deduct stock if enabled
    if (tenant.settings.enableStockDeduction) {
      newOrder.items.forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        if (prod && prod.recipe) {
          prod.recipe.forEach(ingItem => {
            setIngredients(prevIngs => prevIngs.map(ing => {
              if (ing.id === ingItem.ingredientId) {
                const consumed = ingItem.quantity * item.quantity;
                const newStock = Math.max(0, Number((ing.currentStock - consumed).toFixed(2)));
                return {
                  ...ing,
                  currentStock: newStock,
                  status: newStock <= ing.minimumStock ? 'critical' : newStock <= ing.minimumStock * 1.5 ? 'warning' : 'ok',
                };
              }
              return ing;
            }));
          });
        }
      });
    }

    // Somente pedidos finalizados e com pagamento confirmado geram receita no Caixa e no Financeiro
    const isCompletedAndPaid = (newOrder.status === 'completed' || (newOrder.status as string) === 'delivered') && newOrder.paymentStatus === 'paid';

    if (isCompletedAndPaid) {
      if (activeCashSession) {
        setActiveCashSession(prev => {
          if (!prev) return null;
          let cashSales = prev.cashSales;
          let pixSales = prev.pixSales;
          let creditSales = prev.creditSales;
          let debitSales = prev.debitSales;
          let voucherSales = prev.voucherSales;

          if (newOrder.paymentMethod === 'cash') cashSales += newOrder.total;
          else if (newOrder.paymentMethod === 'pix') pixSales += newOrder.total;
          else if (newOrder.paymentMethod === 'credit_card') creditSales += newOrder.total;
          else if (newOrder.paymentMethod === 'debit_card') debitSales += newOrder.total;
          else if (newOrder.paymentMethod === 'voucher') voucherSales += newOrder.total;

          const totalInflow = prev.totalInflow + newOrder.total;
          const calculatedFinalAmount = prev.initialAmount + cashSales + prev.supplyAmount - prev.bleedAmount;

          return {
            ...prev,
            cashSales,
            pixSales,
            creditSales,
            debitSales,
            voucherSales,
            totalInflow,
            calculatedFinalAmount,
          };
        });
      }

      // Registro da Venda Realizada
      const newFin: FinancialEntry = {
        id: `fin_ord_${newOrder.id}`,
        tenantId: tenant.id,
        branchId: currentBranch.id,
        type: 'income',
        category: 'vendas',
        description: `Venda Pedido ${newOrder.displayCode} (${newOrder.channel})`,
        amount: newOrder.total,
        date: new Date().toISOString().split('T')[0],
        paymentMethod: newOrder.paymentMethod,
        status: 'paid',
      };
      setFinancialEntries(prev => [newFin, ...prev]);

      // Gatilho Firestore: Registra atomicamente a Venda Real na coleção 'Sales' & 'CashMovements'
      financialFirestoreService.recordOrderFinalizedSale(
        orderEmpresaId,
        newOrder,
        products,
        ingredients,
        activeCashSession?.id,
        currentUser?.name || 'Operador PDV'
      ).catch(e => console.warn('[createOrder] Erro ao gravar venda no Firestore:', e));

      // Gatilho Automático: Insere na coleção 'financialTransactions' com chave de idempotência
      orderFinancialTransactionService.processOrderFinalizedTransaction(
        orderEmpresaId,
        newOrder,
        products,
        ingredients
      ).catch(e => console.warn('[createOrder] Erro no gatilho financialTransactions:', e));
    }

    // Update table status if tableNumber was specified
    if (newOrder.tableNumber) {
      setTables(prev => prev.map(t => {
        if (t.number === newOrder.tableNumber) {
          const addedAmount = newOrder.total || 0;
          return {
            ...t,
            status: 'occupied',
            currentOrderId: newOrder.id,
            total: (t.total || 0) + addedAmount,
            currentTotal: Number(((t.currentTotal || 0) + addedAmount).toFixed(2)),
            ordersCount: (t.ordersCount || 0) + 1,
            occupiedSince: t.occupiedSince || new Date().toISOString(),
            openedAt: t.openedAt || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          };
        }
        return t;
      }));
    }

    // Update Customer CRM & Cashback
    if (newOrder.customerPhone || (newOrder.customerName && newOrder.customerName !== 'Cliente Balcão')) {
      const today = new Date().toISOString().split('T')[0];
      setCustomers(prev => {
        const existingIdx = prev.findIndex(c => 
          (newOrder.customerPhone && c.phone && c.phone.replace(/\D/g, '') === newOrder.customerPhone.replace(/\D/g, '')) ||
          (c.name.toLowerCase() === (newOrder.customerName || '').toLowerCase())
        );

        if (existingIdx >= 0) {
          const updated = [...prev];
          const c = updated[existingIdx];
          updated[existingIdx] = {
            ...c,
            totalOrders: c.totalOrders + 1,
            totalSpent: Number((c.totalSpent + newOrder.total).toFixed(2)),
            cashbackBalance: Number((c.cashbackBalance + (newOrder.cashbackEarned || 0)).toFixed(2)),
            lastOrderDate: today,
          };
          return updated;
        } else if (newOrder.customerName && newOrder.customerName.trim().length >= 3) {
          const newCust: Customer = {
            id: `cust_${Date.now()}`,
            name: newOrder.customerName.trim(),
            phone: newOrder.customerPhone || '',
            segment: 'new',
            totalOrders: 1,
            totalSpent: newOrder.total,
            cashbackBalance: newOrder.cashbackEarned || 0,
            tier: 'bronze',
            lastOrderDate: today,
          };
          return [newCust, ...prev];
        }
        return prev;
      });
    }

    // Register human-friendly audit log
    const newLog: AuditLog = {
      id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      userName: currentUser?.name || 'Atendente / Caixa',
      userRole: currentUser?.role || 'admin',
      action: 'order_create',
      description: `Novo pedido #${newOrder.orderNumber} via ${newOrder.channel} (R$ ${newOrder.total.toFixed(2)})`,
      ipAddress: '192.168.1.100',
      severity: 'info'
    };
    setAuditLogs(prev => [newLog, ...prev.slice(0, 99)]);

    return newOrder;
  };

  // Processamento do Gateway de Pagamento com Baixa Automática no Pedido e no Financeiro
  const processGatewayPaymentAndClearOrder = async (request: {
    orderPayload?: any;
    existingOrderId?: string;
    paymentMethod: 'pix' | 'credit_card' | 'debit_card';
    cardDetails?: CardDetailsInput;
    pixTxId?: string;
  }): Promise<{ order: Order; transaction: GatewayTransactionResult }> => {
    // Verificar se se trata de liquidação de um pedido já existente no sistema
    const existingOrder = request.existingOrderId
      ? orders.find(o => o.id === request.existingOrderId)
      : (request.orderPayload?.orderId ? orders.find(o => o.id === request.orderPayload.orderId) : null);

    const payload = existingOrder ? {
      orderId: existingOrder.id,
      customerName: existingOrder.customerName,
      customerPhone: existingOrder.customerPhone,
      customerAddress: existingOrder.customerAddress,
      tableNumber: existingOrder.tableNumber,
      items: existingOrder.items,
      subtotal: existingOrder.subtotal,
      discount: existingOrder.discount,
      deliveryFee: existingOrder.deliveryFee,
      serviceFee: existingOrder.serviceFee,
      total: existingOrder.total,
      orderChannel: existingOrder.channel,
      ...request.orderPayload,
    } : (request.orderPayload || { total: 0, customerName: 'Cliente' });

    // 1. Processar transação com o Gateway de Pagamentos
    const transaction = await paymentGatewayService.processPayment({
      ...request,
      orderPayload: payload,
    });

    const isOffline = !effectiveIsOnline;
    let finalOrder: Order;

    if (existingOrder) {
      // Atualizar pedido existente com baixa de pagamento e avanço de status
      const shouldAdvanceToKitchen = existingOrder.status === 'pending' || (existingOrder.status as string) === 'recebido';
      finalOrder = {
        ...existingOrder,
        paymentStatus: 'paid', // Baixa automática no pedido!
        paidAmount: existingOrder.total,
        status: shouldAdvanceToKitchen ? 'preparing' : existingOrder.status, // Envio direto para a cozinha se pendente
        paymentMethod: request.paymentMethod,
        pixTxId: transaction.pixTxId || existingOrder.pixTxId,
        pixEndToEndId: transaction.pixEndToEndId || existingOrder.pixEndToEndId,
        pixPaidAt: transaction.clearedAt,
        cardBrand: transaction.brand,
        cardLast4: transaction.cardLast4,
        cardAuthCode: transaction.authCode,
        cardTid: transaction.tid,
        cardNsu: transaction.nsu,
        cardInstallments: transaction.installments,
        gatewayProvider: transaction.gatewayProvider,
        gatewayFee: transaction.feeAmount,
        gatewayPaidAt: transaction.clearedAt,
        updatedAt: new Date().toISOString(),
        items: existingOrder.items.map(it => ({
          ...it,
          status: shouldAdvanceToKitchen ? 'preparing' : it.status
        }))
      };

      setOrders(prev => prev.map(o => o.id === existingOrder.id ? finalOrder : o));
    } else {
      // Gerar número sequencial e criar Pedido novo com status Pago
      const nextNumber = Math.max(1040, ...orders.map(o => o.orderNumber)) + 1;
      finalOrder = {
        id: `ord_${Date.now()}`,
        orderNumber: nextNumber,
        displayCode: `#${nextNumber}`,
        tenantId: tenant.id,
        branchId: currentBranch.id,
        channel: (payload.orderChannel as OrderChannel) || 'cardapio_online',
        status: 'preparing', // Imediatamente despachado para a esteira de preparo da cozinha
        customerName: payload.customerName || 'Cliente Cardápio Online',
        customerPhone: payload.customerPhone,
        customerAddress: payload.customerAddress,
        tableNumber: payload.tableNumber,
        items: payload.items || [],
        subtotal: payload.subtotal || 0,
        discount: payload.discount || 0,
        deliveryFee: payload.deliveryFee || 0,
        serviceFee: payload.serviceFee || 0,
        total: payload.total || 0,
        paymentMethod: request.paymentMethod,
        paymentStatus: 'paid', // Baixa automática no pedido!
        paidAmount: payload.total,
        pixTxId: transaction.pixTxId,
        pixEndToEndId: transaction.pixEndToEndId,
        pixPaidAt: transaction.clearedAt,
        cardBrand: transaction.brand,
        cardLast4: transaction.cardLast4,
        cardAuthCode: transaction.authCode,
        cardTid: transaction.tid,
        cardNsu: transaction.nsu,
        cardInstallments: transaction.installments,
        gatewayProvider: transaction.gatewayProvider,
        gatewayFee: transaction.feeAmount,
        gatewayPaidAt: transaction.clearedAt,
        cashbackEarned: Number(((payload.total || 0) * (tenant.settings.cashbackPercent / 100)).toFixed(2)),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        estimatedDeliveryMin: 35,
        isOfflineCreated: isOffline,
        syncStatus: isOffline ? 'pending_sync' : 'synced',
      };

      setOrders(prev => [finalOrder, ...prev]);
    }

    // 3. Dedução de Estoque de Insumos da Ficha Técnica (CMV) se não deduzido anteriormente
    if (tenant.settings.enableStockDeduction && !existingOrder) {
      finalOrder.items.forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        if (prod && prod.recipe) {
          prod.recipe.forEach(ingItem => {
            setIngredients(prevIngs => prevIngs.map(ing => {
              if (ing.id === ingItem.ingredientId) {
                const consumed = ingItem.quantity * item.quantity;
                const newStock = Math.max(0, Number((ing.currentStock - consumed).toFixed(2)));
                return {
                  ...ing,
                  currentStock: newStock,
                  status: newStock <= ing.minimumStock ? 'critical' : newStock <= ing.minimumStock * 1.5 ? 'warning' : 'ok',
                };
              }
              return ing;
            }));
          });
        }
      });
    }

    // 4. Baixa Automática no Caixa do Restaurante (Cash Session)
    if (activeCashSession) {
      setActiveCashSession(prev => {
        if (!prev) return null;
        let cashSales = prev.cashSales;
        let pixSales = prev.pixSales;
        let creditSales = prev.creditSales;
        let debitSales = prev.debitSales;
        let voucherSales = prev.voucherSales;

        if (request.paymentMethod === 'pix') pixSales += finalOrder.total;
        else if (request.paymentMethod === 'credit_card') creditSales += finalOrder.total;
        else if (request.paymentMethod === 'debit_card') debitSales += finalOrder.total;

        const totalInflow = prev.totalInflow + finalOrder.total;
        const calculatedFinalAmount = prev.initialAmount + cashSales + prev.supplyAmount - prev.bleedAmount;

        return {
          ...prev,
          cashSales,
          pixSales,
          creditSales,
          debitSales,
          voucherSales,
          totalInflow,
          calculatedFinalAmount,
        };
      });
    }

    // 5. Baixa Automática no Financeiro (Entrada de Vendas + Despesa de Taxa MDR do Gateway)
    const methodLabel = request.paymentMethod === 'pix' ? 'PIX Dinâmico' : request.paymentMethod === 'credit_card' ? 'Cartão de Crédito' : 'Cartão de Débito';
    const newFinIncome: FinancialEntry = {
      id: `fin_inc_${Date.now()}`,
      tenantId: tenant.id,
      branchId: currentBranch.id,
      type: 'income',
      category: 'vendas',
      description: `Venda Pedido ${finalOrder.displayCode} (${methodLabel}) - Gateway ${transaction.gatewayProvider} (NSU ${transaction.nsu})`,
      amount: finalOrder.total,
      date: new Date().toISOString().split('T')[0],
      paymentMethod: request.paymentMethod,
      status: 'paid',
    };

    const newFinEntries: FinancialEntry[] = [newFinIncome];

    // Se houver taxa cobrada pelo gateway (MDR), registra despesa para DRE real
    if (transaction.feeAmount > 0) {
      const newFinExpense: FinancialEntry = {
        id: `fin_exp_${Date.now()}_fee`,
        tenantId: tenant.id,
        branchId: currentBranch.id,
        type: 'expense',
        category: 'taxa_cartao',
        description: `Taxa Adquirente Gateway Pedido ${finalOrder.displayCode} (${transaction.feePercent}% MDR - NSU ${transaction.nsu})`,
        amount: transaction.feeAmount,
        date: new Date().toISOString().split('T')[0],
        paymentMethod: request.paymentMethod,
        status: 'paid',
      };
      newFinEntries.push(newFinExpense);
    }

    setFinancialEntries(prev => [...newFinEntries, ...prev]);

    // 6. Registro de Auditoria no Livro Caixa
    const newLog: AuditLog = {
      id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      userName: finalOrder.customerName,
      userRole: 'customer',
      action: existingOrder ? 'order_update' : 'order_create',
      description: `Baixa Automática Gateway [${request.paymentMethod.toUpperCase()}]: Pedido ${finalOrder.displayCode} de R$ ${finalOrder.total.toFixed(2)} liquidado via ${transaction.gatewayProvider} (NSU ${transaction.nsu} / TID ${transaction.tid})`,
      details: { orderId: finalOrder.id, amount: finalOrder.total, transaction },
      ipAddress: '177.18.29.110',
      severity: 'info',
    };
    setAuditLogs(prev => [newLog, ...prev]);

    if (!existingOrder) {
      if (finalOrder.tableNumber) {
        setTables(prev => prev.map(t => {
          if (t.number === finalOrder.tableNumber) {
            const addedAmount = finalOrder.total || 0;
            return {
              ...t,
              status: 'occupied',
              currentOrderId: finalOrder.id,
              total: (t.total || 0) + addedAmount,
              currentTotal: Number(((t.currentTotal || 0) + addedAmount).toFixed(2)),
              ordersCount: (t.ordersCount || 0) + 1,
              occupiedSince: t.occupiedSince || new Date().toISOString(),
              openedAt: t.openedAt || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            };
          }
          return t;
        }));
      }

      if (finalOrder.customerPhone || (finalOrder.customerName && finalOrder.customerName !== 'Cliente Balcão')) {
        const today = new Date().toISOString().split('T')[0];
        setCustomers(prev => {
          const existingIdx = prev.findIndex(c => 
            (finalOrder.customerPhone && c.phone && c.phone.replace(/\D/g, '') === finalOrder.customerPhone.replace(/\D/g, '')) ||
            (c.name.toLowerCase() === (finalOrder.customerName || '').toLowerCase())
          );

          if (existingIdx >= 0) {
            const updated = [...prev];
            const c = updated[existingIdx];
            updated[existingIdx] = {
              ...c,
              totalOrders: c.totalOrders + 1,
              totalSpent: Number((c.totalSpent + finalOrder.total).toFixed(2)),
              cashbackBalance: Number((c.cashbackBalance + (finalOrder.cashbackEarned || 0)).toFixed(2)),
              lastOrderDate: today,
            };
            return updated;
          } else if (finalOrder.customerName && finalOrder.customerName.trim().length >= 3) {
            const newCust: Customer = {
              id: `cust_${Date.now()}`,
              name: finalOrder.customerName.trim(),
              phone: finalOrder.customerPhone || '',
              segment: 'new',
              totalOrders: 1,
              totalSpent: finalOrder.total,
              cashbackBalance: finalOrder.cashbackEarned || 0,
              tier: 'bronze',
              lastOrderDate: today,
            };
            return [newCust, ...prev];
          }
          return prev;
        });
      }
    }

    // 7. Envio Automático para as Impressoras Térmicas Configuradas (Cozinha & Comprovante Fiscal)
    try {
      thermalPrinterService.dispatchAutoPrintsOnOrderFinalized(finalOrder, tenant);
    } catch (e) {
      console.warn('[ThermalPrinter] Auto-print dispatch error:', e);
    }

    // 8. Efeitos Sonoros e Notificação Push de Pagamento Aprovado
    playCashRegister();
    setTimeout(() => playKitchenBell(), 300);
    sendPaymentApprovedPushAlert({
      providerName: transaction.gatewayProvider,
      orderCode: finalOrder.displayCode,
      amount: finalOrder.total,
      method: request.paymentMethod
    });
    triggerOrderReceivedAlert();

    // 9. Enfileirar para sincronização de nuvem se offline
    if (isOffline) {
      enqueueOfflineAction('CREATE_ORDER', `Pedido Pago #${finalOrder.orderNumber} - ${finalOrder.customerName}`, finalOrder);
    }

    return { order: finalOrder, transaction };
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus, driverId?: string) => {
    const targetOrder = orders.find(o => o.id === orderId);

    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        const updated = { ...o, status, updatedAt: new Date().toISOString() };
        if (driverId) {
          const drv = drivers.find(d => d.id === driverId);
          updated.driverId = driverId;
          updated.driverName = drv ? drv.name : 'Entregador Dulci';
        }
        return updated;
      }
      return o;
    }));

    // Se o pedido foi finalizado/entregue e está pago, registra a venda no Financeiro, Caixa e baixa de estoque
    if (targetOrder && (status === 'completed' || (status as string) === 'delivered') && targetOrder.paymentStatus === 'paid') {
      const today = new Date().toISOString().split('T')[0];

      // 1. Registra no Financeiro se ainda não registrado
      setFinancialEntries(prev => {
        const alreadyExists = prev.some(e => e.id === `fin_ord_${targetOrder.id}` || (e.description.includes(targetOrder.displayCode) && e.type === 'income'));
        if (alreadyExists) return prev;
        const newFin: FinancialEntry = {
          id: `fin_ord_${targetOrder.id}`,
          tenantId: targetOrder.tenantId || tenant.id,
          branchId: targetOrder.branchId || currentBranch.id,
          type: 'income',
          category: 'vendas',
          description: `Venda Finalizada Pedido ${targetOrder.displayCode} (${targetOrder.channel})`,
          amount: targetOrder.total,
          date: today,
          paymentMethod: targetOrder.paymentMethod,
          status: 'paid'
        };
        return [newFin, ...prev];
      });

      // Gatilho Firestore: Registra atomicamente a Venda Real na coleção 'Sales' & 'CashMovements'
      const orderEmpresaId = targetOrder.tenantId || tenant?.id || 'tenant_lanchonete_dulci';
      const finalizedOrder = { ...targetOrder, status, updatedAt: new Date().toISOString() };
      financialFirestoreService.recordOrderFinalizedSale(
        orderEmpresaId,
        finalizedOrder,
        products,
        ingredients,
        activeCashSession?.id,
        currentUser?.name || 'Operador PDV'
      ).catch(e => console.warn('[updateOrderStatus] Erro ao gravar venda no Firestore:', e));

      // Gatilho Automático: Insere na coleção 'financialTransactions' com chave de idempotência
      orderFinancialTransactionService.processOrderFinalizedTransaction(
        orderEmpresaId,
        finalizedOrder,
        products,
        ingredients
      ).catch(e => console.warn('[updateOrderStatus] Erro no gatilho financialTransactions:', e));

      // 2. Atualiza Caixa se aberto
      if (activeCashSession) {
        setActiveCashSession(prev => {
          if (!prev) return null;
          let cashSales = prev.cashSales;
          let pixSales = prev.pixSales;
          let creditSales = prev.creditSales;
          let debitSales = prev.debitSales;
          let voucherSales = prev.voucherSales;

          if (targetOrder.paymentMethod === 'cash') cashSales += targetOrder.total;
          else if (targetOrder.paymentMethod === 'pix') pixSales += targetOrder.total;
          else if (targetOrder.paymentMethod === 'credit_card') creditSales += targetOrder.total;
          else if (targetOrder.paymentMethod === 'debit_card') debitSales += targetOrder.total;
          else if (targetOrder.paymentMethod === 'voucher') voucherSales += targetOrder.total;

          const totalInflow = prev.totalInflow + targetOrder.total;
          const calculatedFinalAmount = prev.initialAmount + cashSales + prev.supplyAmount - prev.bleedAmount;

          return {
            ...prev,
            cashSales,
            pixSales,
            creditSales,
            debitSales,
            voucherSales,
            totalInflow,
            calculatedFinalAmount,
          };
        });
      }

      // 3. Dedução de Estoque de Insumos da Ficha Técnica se não deduzido antes
      if (tenant.settings.enableStockDeduction) {
        targetOrder.items.forEach(item => {
          const prod = products.find(p => p.id === item.productId || p.name === item.productName);
          if (prod && prod.recipe) {
            prod.recipe.forEach(ingItem => {
              setIngredients(prevIngs => prevIngs.map(ing => {
                if (ing.id === ingItem.ingredientId) {
                  const consumed = ingItem.quantity * item.quantity;
                  const newStock = Math.max(0, Number((ing.currentStock - consumed).toFixed(2)));
                  return {
                    ...ing,
                    currentStock: newStock,
                    status: newStock <= ing.minimumStock ? 'critical' : newStock <= ing.minimumStock * 1.5 ? 'warning' : 'ok',
                  };
                }
                return ing;
              }));
            });
          }
        });
      }
    }

    // Disparar o áudio alerta-pedido.mp3 automaticamente via use-sound sempre que o status for alterado para 'recebido'
    if (status === 'recebido' || status === 'pending') {
      triggerOrderReceivedAlert();
    }
    if (status === 'ready') playKitchenBell();
    if (status === 'completed') playCashRegister();

    // Sincronizar atualização de status no Firestore
    const orderEmpresaId = tenant?.id || 'tenant_lanchonete_dulci';
    updatePedidoStatus(orderEmpresaId, orderId, status).catch(() => {});

    // If device is offline, enqueue update status
    if (!effectiveIsOnline) {
      enqueueOfflineAction('UPDATE_ORDER_STATUS', `Atualização de status do Pedido ${orderId} para "${status}"`, {
        orderId,
        status,
        driverId
      });
    }
  };

  const cancelOrder = (orderId: string, reason: string) => {
    const targetOrder = orders.find(o => o.id === orderId);

    // Se o pedido cancelado já havia sido finalizado como venda paga, registra estorno rastreável
    if (targetOrder && (targetOrder.status === 'completed' || (targetOrder.status as string) === 'delivered') && targetOrder.paymentStatus === 'paid') {
      const today = new Date().toISOString().split('T')[0];
      const refundEntry: FinancialEntry = {
        id: `fin_ref_${Date.now()}`,
        tenantId: targetOrder.tenantId || tenant.id,
        branchId: targetOrder.branchId || currentBranch.id,
        type: 'expense',
        category: 'outros',
        description: `Estorno Pedido ${targetOrder.displayCode} - Motivo: ${reason}`,
        amount: targetOrder.total,
        date: today,
        paymentMethod: targetOrder.paymentMethod,
        status: 'paid'
      };
      setFinancialEntries(prev => [refundEntry, ...prev]);

      if (targetOrder.paymentMethod === 'cash' && activeCashSession) {
        addCashMovement('bleed', targetOrder.total, `Estorno Cancelamento Pedido ${targetOrder.displayCode}: ${reason}`);
      }

      // Gatilho Firestore: Registra estorno rastreável nas coleções 'Expenses' e 'CashMovements'
      const orderEmpresaId = targetOrder.tenantId || tenant?.id || 'tenant_lanchonete_dulci';
      financialFirestoreService.recordOrderCanceledRefund(
        orderEmpresaId,
        targetOrder,
        reason,
        currentUser?.name || 'Gerente'
      ).catch(e => console.warn('[cancelOrder] Erro ao gravar estorno no Firestore:', e));
    }

    // Sincronizar cancelamento no Firestore
    const orderEmpresaId = tenant?.id || 'tenant_lanchonete_dulci';
    updatePedidoStatus(orderEmpresaId, orderId, 'canceled', reason).catch(() => {});

    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          status: 'canceled',
          cancellationReason: reason,
          updatedAt: new Date().toISOString(),
        };
      }
      return o;
    }));

    // Auditoria Global: Registrar cancelamento/exclusão de pedido no Firestore 'auditLogs'
    auditService.logDeletion(
      'pedido',
      orderId,
      targetOrder?.displayCode || orderId,
      currentUser,
      orderEmpresaId,
      { cancellationReason: reason, total: targetOrder?.total }
    ).then(logged => {
      setAuditLogs(prev => [logged, ...prev.filter(l => l.id !== logged.id)]);
    }).catch(() => {});
  };

  // Delivery Management & Dispatch Methods
  const assignDriverToOrder = (orderId: string, driverId: string) => {
    const targetDriver = drivers.find(d => d.id === driverId);
    const targetOrder = orders.find(o => o.id === orderId);
    if (!targetDriver || !targetOrder) return;

    playBeep(920, 0.08);

    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          status: 'delivering',
          driverId,
          driverName: targetDriver.name,
          updatedAt: new Date().toISOString(),
        };
      }
      return o;
    }));

    setDrivers(prev => prev.map(d => {
      if (d.id === driverId) {
        const destCoords = targetOrder.customerAddress?.coords || { lat: -23.5630, lng: -46.6690 };
        const destAddress = targetOrder.customerAddress
          ? `${targetOrder.customerAddress.street}, ${targetOrder.customerAddress.number}`
          : 'Endereço do Cliente';
        const distKm = targetOrder.customerAddress?.distanceKm || 3.0;

        return {
          ...d,
          status: 'on_route',
          currentOrdersCount: d.currentOrdersCount + 1,
          assignedOrderId: orderId,
          destinationCoords: destCoords,
          destinationAddress: destAddress,
          speedKmh: d.vehicle === 'bike' ? 18 : 36,
          estimatedArrivalMin: Math.round(distKm * 3.2 + 8),
        };
      }
      return d;
    }));

    const newLog: AuditLog = {
      id: `log_drv_dispatch_${Date.now()}`,
      timestamp: new Date().toISOString(),
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'system_config',
      description: `Pedido ${targetOrder.displayCode} despachado com ${targetDriver.name} (${targetDriver.vehicle.toUpperCase()})`,
      details: { orderId, driverId, driverName: targetDriver.name },
      ipAddress: '192.168.1.100',
      severity: 'info',
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const completeDriverDelivery = (orderId: string) => {
    const targetOrder = orders.find(o => o.id === orderId);
    playCashRegister();

    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          status: 'completed',
          updatedAt: new Date().toISOString(),
        };
      }
      return o;
    }));

    if (targetOrder?.driverId) {
      const driverId = targetOrder.driverId;
      setDrivers(prev => prev.map(d => {
        if (d.id === driverId) {
          const tip = targetOrder.total >= 80 ? 5.00 : 3.00;
          return {
            ...d,
            status: 'available',
            currentOrdersCount: Math.max(0, d.currentOrdersCount - 1),
            completedToday: d.completedToday + 1,
            totalTipsToday: d.totalTipsToday + tip,
            assignedOrderId: undefined,
            destinationCoords: undefined,
            destinationAddress: undefined,
            speedKmh: 0,
            estimatedArrivalMin: undefined,
          };
        }
        return d;
      }));
    }

    if (targetOrder) {
      const newLog: AuditLog = {
        id: `log_drv_complete_${Date.now()}`,
        timestamp: new Date().toISOString(),
        userName: targetOrder.driverName || currentUser.name,
        userRole: currentUser.role,
        action: 'system_config',
        description: `Entrega do Pedido ${targetOrder.displayCode} finalizada com sucesso`,
        details: { orderId, total: targetOrder.total },
        ipAddress: '192.168.1.112',
        severity: 'info',
      };
      setAuditLogs(prev => [newLog, ...prev]);
    }
  };

  const updateDriverStatus = (driverId: string, status: 'available' | 'on_route' | 'offline') => {
    setDrivers(prev => prev.map(d => {
      if (d.id === driverId) {
        return {
          ...d,
          status,
          speedKmh: status === 'available' ? 0 : d.speedKmh,
        };
      }
      return d;
    }));
  };

  const updateDriverCoords = (
    driverId: string,
    coords: { lat: number; lng: number },
    heading?: number,
    speedKmh?: number
  ) => {
    setDrivers(prev => prev.map(d => {
      if (d.id === driverId) {
        return {
          ...d,
          coords,
          ...(heading !== undefined ? { heading } : {}),
          ...(speedKmh !== undefined ? { speedKmh } : {}),
        };
      }
      return d;
    }));
  };

  const addDeliveryDriver = (driverData: Omit<DeliveryDriver, 'id'>) => {
    const newDriver: DeliveryDriver = {
      ...driverData,
      id: `drv_${Date.now()}`,
      completedToday: 0,
      totalTipsToday: 0,
      currentOrdersCount: 0,
      rating: 5.0,
      coords: driverData.coords || { lat: -23.5645, lng: -46.6527 },
      batteryLevel: driverData.batteryLevel ?? 95,
      status: driverData.status || 'available',
    };
    setDrivers(prev => [newDriver, ...prev]);
    playLevelUp();
  };

  // Save webhook notifications to localStorage
  useEffect(() => {
    localStorage.setItem('neon_webhook_notifications', JSON.stringify(webhookNotifications));
  }, [webhookNotifications]);

  // Handle incoming webhooks from iFood, Rappi, 99Food, Mercado Pago, Stone, etc.
  const handleIncomingWebhook = (payload: WebhookEventPayload): { success: boolean; message: string; order?: Order } => {
    const { provider, event, orderCode, customer, items, total, paymentMethod, paymentStatus, reason } = payload;
    const providerName = provider === 'ifood' ? 'iFood' : provider === 'rappi' ? 'Rappi' : provider === '99food' ? '99Food' : provider === 'mercadopago' ? 'Mercado Pago' : provider === 'stone' ? 'Stone' : provider.toUpperCase();

    // 1. Handle order creation (order.created)
    if (event === 'order.created') {
      const orderItems = items && items.length > 0 ? items.map((it, idx) => ({
        id: `item_wh_${Date.now()}_${idx}`,
        productId: products[0]?.id || 'prod_01',
        productName: it.name,
        quantity: it.quantity,
        unitPrice: it.price,
        totalPrice: it.quantity * it.price,
        notes: it.notes || '',
        station: it.station || 'assembly',
        status: 'pending' as const
      })) : [
        {
          id: `item_wh_${Date.now()}_1`,
          productId: products[0]?.id || 'prod_01',
          productName: 'X-Salada Especial Dulci',
          quantity: 1,
          unitPrice: 28.90,
          totalPrice: 28.90,
          station: 'grill' as const,
          status: 'pending' as const
        },
        {
          id: `item_wh_${Date.now()}_2`,
          productId: products[3]?.id || 'prod_04',
          productName: 'Batata Rústica com Alecrim & Bacon',
          quantity: 1,
          unitPrice: 22.90,
          totalPrice: 22.90,
          station: 'fryer' as const,
          status: 'pending' as const
        }
      ];

      const calculatedSubtotal = orderItems.reduce((acc, i) => acc + i.totalPrice, 0);
      const finalTotal = total || calculatedSubtotal + 8.90;

      const created = createOrder({
        channel: payload.channel || (provider === 'rappi' ? 'rappi' : provider === '99food' ? '99food' : 'ifood'),
        status: 'recebido',
        customerName: customer?.name || `Cliente ${providerName}`,
        customerPhone: customer?.phone || '(11) 98888-7777',
        customerAddress: customer?.address ? {
          street: customer.address.street,
          number: customer.address.number,
          neighborhood: customer.address.neighborhood,
          city: customer.address.city,
          zipCode: customer.address.zipCode || '01310-100',
          distanceKm: 3.2
        } : {
          street: 'Av. Paulista',
          number: '1200',
          neighborhood: 'Bela Vista',
          city: 'São Paulo',
          zipCode: '01310-100',
          distanceKm: 2.8
        },
        items: orderItems,
        subtotal: calculatedSubtotal,
        deliveryFee: 8.90,
        total: finalTotal,
        paymentMethod: paymentMethod || 'credit_card',
        paymentStatus: paymentStatus || 'paid',
        paidAmount: finalTotal,
      });

      // Notification
      const newNotif: WebhookNotification = {
        id: `wh_notif_${Date.now()}`,
        provider,
        eventType: event,
        title: `${providerName} • Novo Pedido #${created.orderNumber}`,
        message: `Cliente: ${created.customerName} - Total: R$ ${created.total.toFixed(2)} (${orderItems.length} itens)`,
        orderId: created.id,
        orderCode: created.displayCode,
        amount: created.total,
        payload,
        timestamp: new Date().toISOString(),
        read: false
      };
      setWebhookNotifications(prev => [newNotif, ...prev.slice(0, 49)]);

      // Native OS Push Notification via Service Worker
      sendNewOrderPushAlert({
        providerName,
        orderCode: created.displayCode,
        customerName: created.customerName,
        total: created.total,
        itemCount: orderItems.length
      }).catch(err => console.warn('[Push Notification Dispatch Warning]', err));

      // Audit
      const newLog: AuditLog = {
        id: `log_wh_${Date.now()}`,
        timestamp: new Date().toISOString(),
        userName: `Webhook ${providerName}`,
        userRole: 'manager',
        action: 'system_config',
        description: `Webhook ${providerName}: Pedido ${created.displayCode} integrado com sucesso via API`,
        details: { provider, event, orderId: created.id, total: created.total },
        ipAddress: '10.0.4.12 (Webhook Gateway)',
        severity: 'info'
      };
      setAuditLogs(prev => [newLog, ...prev]);

      return { success: true, message: `Pedido ${created.displayCode} recebido e enviado ao KDS`, order: created };
    }

    // 2. Handle order cancellation (order.cancelled)
    if (event === 'order.cancelled') {
      const targetOrder = orders.find(o => o.displayCode === orderCode || o.id === payload.orderId) || orders[0];
      if (targetOrder) {
        cancelOrder(targetOrder.id, reason || `Cancelado via Webhook ${providerName}`);
        
        const newNotif: WebhookNotification = {
          id: `wh_notif_${Date.now()}`,
          provider,
          eventType: event,
          title: `${providerName} • Pedido ${targetOrder.displayCode} Cancelado`,
          message: `Motivo: ${reason || 'Cancelamento solicitado pelo parceiro'}`,
          orderId: targetOrder.id,
          orderCode: targetOrder.displayCode,
          amount: targetOrder.total,
          timestamp: new Date().toISOString(),
          read: false
        };
        setWebhookNotifications(prev => [newNotif, ...prev.slice(0, 49)]);

        sendOrderCancelledPushAlert({
          providerName,
          orderCode: targetOrder.displayCode,
          reason: reason || 'Cancelamento solicitado pelo parceiro'
        }).catch(err => console.warn('[Push Notification Dispatch Warning]', err));

        return { success: true, message: `Pedido ${targetOrder.displayCode} cancelado com sucesso.` };
      }
    }

    // 3. Handle payment events (payment.approved, pix.received, charge.paid, payment.refunded, payment.failed)
    if (event === 'payment.approved' || event === 'pix.received' || event === 'charge.paid' || event === 'payment.confirmed') {
      const amount = total || 85.00;

      // Localizar pedido correspondente no sistema e atualizar status automaticamente
      const targetOrder = orders.find(o => 
        (orderCode && (o.displayCode === orderCode || o.displayCode === `#${orderCode.replace('#', '')}` || o.pixTxId === orderCode)) ||
        (payload.orderId && o.id === payload.orderId) ||
        (payload.rawPayload?.pixTxId && o.pixTxId === payload.rawPayload.pixTxId) ||
        (payload.rawPayload?.id && (o.cardNsu === payload.rawPayload.nsu || o.cardTid === payload.rawPayload.tid))
      );

      if (targetOrder) {
        const shouldAdvanceToKitchen = targetOrder.status === 'pending' || (targetOrder.status as string) === 'recebido';
        setOrders(prevOrders => prevOrders.map(o => {
          if (o.id === targetOrder.id) {
            return {
              ...o,
              paymentStatus: 'paid',
              paidAmount: targetOrder.total,
              status: shouldAdvanceToKitchen ? 'preparing' : o.status,
              paymentMethod: paymentMethod || o.paymentMethod,
              pixEndToEndId: payload.rawPayload?.pixEndToEndId || o.pixEndToEndId,
              cardNsu: payload.rawPayload?.nsu || o.cardNsu,
              cardTid: payload.rawPayload?.tid || o.cardTid,
              cardAuthCode: payload.rawPayload?.authCode || o.cardAuthCode,
              gatewayProvider: providerName,
              gatewayPaidAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              items: o.items.map(it => ({
                ...it,
                status: shouldAdvanceToKitchen ? 'preparing' : it.status
              }))
            };
          }
          return o;
        }));

        try {
          thermalPrinterService.dispatchKitchenOrder(targetOrder);
        } catch (e) {
          console.warn('[ThermalPrinter] Webhook dispatch error:', e);
        }
      }

      // Sincronizar em tempo real diretamente no Firestore (atualizando Pedido, Caixa, Finanças e Logs)
      const targetEmpresaId = targetOrder?.tenantId || tenant.id || 'tenant_lanchonete_dulci';
      syncPaymentWebhookToFirestore(
        targetEmpresaId,
        {
          provider,
          event: 'payment.approved',
          orderCode: targetOrder?.displayCode || orderCode,
          orderId: targetOrder?.id || payload.orderId,
          total: amount,
          paymentMethod: paymentMethod || targetOrder?.paymentMethod || 'pix',
          paymentStatus: 'paid',
          pixTxId: targetOrder?.pixTxId,
          pixEndToEndId: payload.rawPayload?.pixEndToEndId || targetOrder?.pixEndToEndId,
          cardNsu: payload.rawPayload?.nsu || targetOrder?.cardNsu,
          cardTid: payload.rawPayload?.tid || targetOrder?.cardTid,
          cardAuthCode: payload.rawPayload?.authCode || targetOrder?.cardAuthCode,
          signature: payload.rawPayload?.signature,
          secretToken: payload.rawPayload?.secretToken,
          rawPayload: payload.rawPayload
        },
        targetOrder,
        activeCashSession
      ).then(syncRes => {
        if (syncRes.updatedCashSession) {
          setActiveCashSession(syncRes.updatedCashSession);
        }
      }).catch(err => {
        console.warn('[WebhookFirestore Sync Warning]', err);
      });

      const newFin: FinancialEntry = {
        id: `fin_wh_${Date.now()}`,
        tenantId: tenant.id,
        branchId: currentBranch.id,
        type: 'income',
        category: 'vendas',
        description: `Recebimento Gateway ${providerName} (Webhook Real-time - Pedido ${targetOrder?.displayCode || orderCode || 'Gateway'})`,
        amount: amount,
        date: new Date().toISOString().split('T')[0],
        paymentMethod: paymentMethod || 'pix',
        status: 'paid',
      };
      setFinancialEntries(prev => [newFin, ...prev]);
      playCashRegister();

      sendPaymentApprovedPushAlert({
        providerName,
        orderCode: targetOrder?.displayCode || orderCode || 'PED-GW',
        amount,
        method: paymentMethod || 'pix'
      }).catch(err => console.warn('[Push Notification Dispatch Warning]', err));

      if (activeCashSession) {
        setActiveCashSession(prev => {
          if (!prev) return null;
          const methodLower = (paymentMethod || '').toLowerCase();
          const pixAdd = (methodLower.includes('pix') || provider === 'mercadopago') ? amount : 0;
          const cardAdd = (!methodLower.includes('pix') && provider !== 'mercadopago') ? amount : 0;
          return {
            ...prev,
            pixSales: Number(((prev.pixSales || 0) + pixAdd).toFixed(2)),
            creditSales: Number(((prev.creditSales || 0) + cardAdd).toFixed(2)),
            totalInflow: Number(((prev.totalInflow || 0) + amount).toFixed(2)),
            calculatedFinalAmount: Number(((prev.calculatedFinalAmount || 0) + pixAdd + cardAdd).toFixed(2))
          };
        });
      }

      const newNotif: WebhookNotification = {
        id: `wh_notif_${Date.now()}`,
        provider,
        eventType: event,
        title: `${providerName} • Pagamento Aprovado`,
        message: `Pedido ${targetOrder?.displayCode || orderCode || ''}: R$ ${amount.toFixed(2)} liquidado via ${paymentMethod || 'PIX/Cartão'} (Baixa Automática no KDS, Caixa e Firestore)`,
        amount: amount,
        orderCode: targetOrder?.displayCode || orderCode,
        orderId: targetOrder?.id,
        timestamp: new Date().toISOString(),
        read: false
      };
      setWebhookNotifications(prev => [newNotif, ...prev.slice(0, 49)]);
      return { 
        success: true, 
        message: `Pagamento de R$ ${amount.toFixed(2)} aprovado no gateway e sincronizado no Firestore para o pedido ${targetOrder?.displayCode || ''}.` 
      };
    }

    if (event === 'payment.refunded' || event === 'charge.refunded' || event === 'pix.chargeback') {
      const amount = total || 45.00;
      const targetOrder = orders.find(o => 
        (orderCode && (o.displayCode === orderCode || o.displayCode === `#${orderCode.replace('#', '')}`)) ||
        (payload.orderId && o.id === payload.orderId)
      );

      // Sincronizar estorno no Firestore
      const targetEmpresaId = targetOrder?.tenantId || tenant.id || 'tenant_lanchonete_dulci';
      syncPaymentWebhookToFirestore(targetEmpresaId, {
        provider,
        event: 'payment.refunded',
        orderCode: targetOrder?.displayCode || orderCode,
        orderId: targetOrder?.id || payload.orderId,
        total: amount,
        paymentMethod: paymentMethod || targetOrder?.paymentMethod,
        paymentStatus: 'refunded',
        reason,
        rawPayload: payload.rawPayload
      }, targetOrder).catch(err => {
        console.warn('[WebhookFirestore Refund Sync Warning]', err);
      });

      const newFin: FinancialEntry = {
        id: `fin_wh_ref_${Date.now()}`,
        tenantId: tenant.id,
        branchId: currentBranch.id,
        type: 'expense',
        category: 'outros',
        description: `Estorno/Reembolso ${providerName} (Chargeback Webhook)`,
        amount: amount,
        date: new Date().toISOString().split('T')[0],
        paymentMethod: paymentMethod || 'pix',
        status: 'paid',
      };
      setFinancialEntries(prev => [newFin, ...prev]);

      const newNotif: WebhookNotification = {
        id: `wh_notif_${Date.now()}`,
        provider,
        eventType: event,
        title: `${providerName} • Reembolso Processado`,
        message: `Estorno de R$ ${amount.toFixed(2)} registrado no financeiro e Firestore`,
        amount: amount,
        timestamp: new Date().toISOString(),
        read: false
      };
      setWebhookNotifications(prev => [newNotif, ...prev.slice(0, 49)]);
      return { success: true, message: `Reembolso registrado no DRE e Firestore.` };
    }

    // 4. Status transitions
    if (
      event === 'order.confirmed' || 
      event === 'order.preparing' || 
      event === 'order.ready' || 
      event === 'order.dispatched' || 
      event === 'order.delivered'
    ) {
      const targetOrder = orders.find(o => 
        o.displayCode === orderCode || 
        o.displayCode === `#${orderCode?.replace('#', '')}` || 
        o.id === payload.orderId ||
        String(o.orderNumber) === orderCode?.replace('#', '')
      ) || orders[0];

      if (targetOrder) {
        let nextStatus: OrderStatus = 'preparing';
        let itemStatus: 'pending' | 'preparing' | 'ready' = 'preparing';

        if (event === 'order.confirmed' || event === 'order.preparing') {
          nextStatus = 'preparing';
          itemStatus = 'preparing';
          playKitchenBell();
        } else if (event === 'order.ready') {
          nextStatus = 'ready';
          itemStatus = 'ready';
          playKitchenBell();
        } else if (event === 'order.dispatched') {
          nextStatus = 'delivering';
        } else if (event === 'order.delivered') {
          nextStatus = 'completed';
          playCashRegister();
        }

        setOrders(prevOrders => prevOrders.map(o => {
          if (o.id === targetOrder.id) {
            return {
              ...o,
              status: nextStatus,
              updatedAt: new Date().toISOString(),
              items: o.items.map(item => ({
                ...item,
                status: itemStatus
              }))
            };
          }
          return o;
        }));

        const statusLabels: Record<string, string> = {
          preparing: '👨‍🍳 Em Preparo na Cozinha (KDS)',
          ready: '🛎️ Pronto para Retirada / Despacho',
          delivering: '🛵 Saiu para Entrega com Entregador',
          completed: '✅ Entregue e Concluído',
        };

        const newNotif: WebhookNotification = {
          id: `wh_notif_${Date.now()}`,
          provider,
          eventType: event,
          title: `${providerName} • Pedido ${targetOrder.displayCode}`,
          message: statusLabels[nextStatus] || `Status atualizado para: ${nextStatus.toUpperCase()}`,
          orderId: targetOrder.id,
          orderCode: targetOrder.displayCode,
          amount: targetOrder.total,
          timestamp: new Date().toISOString(),
          read: false
        };
        setWebhookNotifications(prev => [newNotif, ...prev.slice(0, 49)]);

        const newLog: AuditLog = {
          id: `log_wh_stat_${Date.now()}`,
          timestamp: new Date().toISOString(),
          userName: `Webhook ${providerName}`,
          userRole: 'manager',
          action: 'system_config',
          description: `Pedido ${targetOrder.displayCode} atualizado para ${nextStatus.toUpperCase()} via Webhook ${providerName}`,
          details: { orderId: targetOrder.id, previousStatus: targetOrder.status, newStatus: nextStatus },
          ipAddress: '10.0.4.12 (Webhook Gateway)',
          severity: 'info'
        };
        setAuditLogs(prev => [newLog, ...prev]);

        return { success: true, message: `Status do pedido ${targetOrder.displayCode} atualizado para ${nextStatus}.` };
      }
    }

    return { success: true, message: `Evento ${event} recebido de ${providerName}` };
  };

  const clearWebhookNotifications = () => {
    setWebhookNotifications([]);
    localStorage.removeItem('neon_webhook_notifications');
  };

  const markNotificationAsRead = (id: string) => {
    setWebhookNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  // Dispatches a silent notification to the waiters and floor staff
  const sendSilentWaiterNotification = (title: string, message: string, tableNumber?: number) => {
    const newNotif: WebhookNotification = {
      id: `notif-waiter-${Date.now()}`,
      provider: 'local' as any,
      eventType: 'table.cleaning_requested' as any,
      title,
      message,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      read: false,
    };
    setWebhookNotifications(prev => [newNotif, ...prev.slice(0, 49)]);

    try {
      const alert = {
        id: `alert-${Date.now()}`,
        tableNumber,
        title,
        message,
        createdAt: new Date().toISOString(),
        status: 'pending',
      };
      const existing = JSON.parse(localStorage.getItem('neon_waiter_cleaning_alerts') || '[]');
      localStorage.setItem('neon_waiter_cleaning_alerts', JSON.stringify([alert, ...existing.slice(0, 30)]));
    } catch {
      // ignore
    }

    // Gentle tactile haptic feedback on supported mobile devices
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([100, 50, 100]);
      } catch {
        // ignore
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('neon:waiter-cleaning-alert', {
        detail: { tableNumber, title, message, timestamp: new Date().toISOString() }
      }));
    }

    addAuditLog({
      action: 'table_cleaning_alert',
      description: `Mesa ${tableNumber ? `Mesa ${tableNumber}` : ''}: Notificação silenciosa enviada para a equipe de garçons (${title}).`,
      userName: currentUser?.name || 'Sistema Salão',
      userRole: currentUser?.role || 'waiter',
      ipAddress: '192.168.1.100',
      severity: 'warning',
    });
  };

  // Simulates partner events randomly or on demand
  const simulatePartnerWebhook = (provider: WebhookProvider = 'ifood', eventType: WebhookEventType = 'order.created') => {
    const randomCustomers = [
      { name: 'Fernanda Lima', phone: '(11) 98765-1122', street: 'Rua Augusta, 940' },
      { name: 'Bruno Guimarães', phone: '(11) 97711-2233', street: 'Alameda Santos, 1800' },
      { name: 'Carla Silveira', phone: '(11) 99123-4455', street: 'Rua da Consolação, 2300' },
      { name: 'Matheus Prado', phone: '(11) 98234-9988', street: 'Av. Brigadeiro Faria Lima, 3477' },
    ];
    const c = randomCustomers[Math.floor(Math.random() * randomCustomers.length)];

    handleIncomingWebhook({
      provider,
      event: eventType,
      orderCode: `#${Math.floor(1000 + Math.random() * 9000)}`,
      customer: {
        name: c.name,
        phone: c.phone,
        address: {
          street: c.street,
          number: '100',
          neighborhood: 'Jardins',
          city: 'São Paulo'
        }
      },
      items: [
        { name: 'X-Salada Especial Dulci', quantity: 2, price: 28.90, station: 'grill' },
        { name: 'Guaraná Baré Lata 350ml', quantity: 2, price: 6.00, station: 'bar' }
      ],
      total: 69.80,
      paymentMethod: provider === 'mercadopago' ? 'pix' : 'credit_card',
      paymentStatus: 'paid'
    });
  };

  // Auto Polling / Listener against Backend Webhooks Endpoint
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    const checkServerWebhooks = async () => {
      try {
        const res = await fetch('/api/webhooks/pending');
        if (res.ok) {
          const data = await res.json();
          if (data && data.events && data.events.length > 0) {
            data.events.forEach((evt: WebhookEventPayload) => {
              handleIncomingWebhook(evt);
            });
          }
        }
      } catch (err) {
        // Silently ignore network polling failures in dev preview
      }
    };

    interval = setInterval(checkServerWebhooks, 4000);
    return () => clearInterval(interval);
  }, [products, orders, tenant, currentBranch, activeCashSession]);

  const resetAllDataToDefault = () => {
    localStorage.removeItem('neon_products');
    localStorage.removeItem('neon_ingredients');
    localStorage.removeItem('neon_orders');
    localStorage.removeItem('neon_orders_v3');
    localStorage.removeItem('neon_webhook_notifications');
    setProducts(mockProducts);
    setIngredients(mockIngredients);
    setOrders([]);
    setTables(mockTables);
    setDrivers(mockDrivers);
    setFinancialEntries(mockFinancialEntries);
    setLoyaltyMembers(mockLoyaltyMembers);
    setAuditLogs(mockAuditLogs);
    setWebhookNotifications([]);
    playLevelUp();
  };

  return (
    <AppContext.Provider
      value={{
        currentView,
        setCurrentView: setCurrentViewSafely,
        activePageColor,
        currentUser,
        setCurrentUser,
        switchRole,
        logout,
        isSuperAdminAuthorized,
        isCheckingSuperAdminAuth,
        superAdminDenialReason,
        checkSuperAdminAuthorization,
        verifySuperAdminAuth,
        tenant,
        setTenant,
        updateTenantSettings,
        activateCompany,
        deactivateCompany,
        suspendCompany,
        setCompanyStatus,
        isCompanyActive,
        isDemoMode,
        loadDemoData,
        clearToRealEmptyData,
        branches,
        currentBranch,
        setCurrentBranch,
        addBranch,
        updateBranch,
        deleteBranch,
        supportTickets,
        createSupportTicket,
        replySupportTicket,
        updateTicketStatus,
        switchToSuperAdmin,
        switchToUser,
        isSupportMode,
        supportAdminName,
        supportAccountName,
        enterSupportMode,
        exitSupportMode,
        allTenants,
        setAllTenants,
        addTenantRecord,
        updateTenantRecord,
        platformUsers,
        setPlatformUsers,
        addPlatformUser,
        updatePlatformUser,
        deletePlatformUser,
        maintenanceMode,
        setMaintenanceMode,
        maintenanceConfig,
        setMaintenanceConfig,
        announcements,
        addAnnouncement,
        removeAnnouncement,
        products,
        setProducts,
        updateProduct,
        addProduct,
        deleteProduct,
        batchUpdateProducts,
        categories,
        setCategories,
        addCategory,
        updateCategory,
        deleteCategory,
        ingredients,
        setIngredients,
        suppliers,
        updateStock,
        quickRestockIngredient,
        addIngredient,
        updateIngredient,
        deleteIngredient,
        clearAllIngredients,
        orders,
        setOrders,
        tables,
        setTables,
        comandas,
        setComandas,
        drivers,
        setDrivers,
        assignDriverToOrder,
        completeDriverDelivery,
        updateDriverStatus,
        updateDriverCoords,
        addDeliveryDriver,
        gamificationStaff,
        financialEntries,
        addFinancialEntry,
        deleteFinancialEntry,
        updateFinancialEntry,
        billsPayable,
        addBillPayable,
        payBillPayable,
        deleteBillPayable,
        billsReceivable,
        addBillReceivable,
        receiveBillReceivable,
        deleteBillReceivable,
        purchases,
        registerPurchase,
        cashMovements,
        salesFirestore,
        expensesFirestore,
        cashMovementsFirestore,
        financialTransactions,
        clearAllFinancialData,
        loyaltyMembers,
        auditLogs,
        saasPlans,
        setSaasPlans,
        employees,
        teamMembers: employees,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        customers,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        addCashback,
        redeemCashback,
        addAuditLog,
        activeCashSession,
        openCashSession,
        closeCashSession,
        addCashMovement,
        updateActiveCashSession: (session: CashSession) => setActiveCashSession(session),
        createOrder,
        addOrder: createOrder,
        processGatewayPaymentAndClearOrder,
        updateOrderStatus,
        cancelOrder,
        triggerOrderReceivedAlert,
        printOrder,
        setPrintOrder,
        isAICopilotOpen,
        setIsAICopilotOpen,
        isWebhookModalOpen,
        setIsWebhookModalOpen,
        isExportModalOpen,
        setIsExportModalOpen,
        exportModalInitialTab,
        openExportModal,
        webhookNotifications,
        handleIncomingWebhook,
        clearWebhookNotifications,
        markNotificationAsRead,
        webhookAutoSimulation,
        setWebhookAutoSimulation,
        simulatePartnerWebhook,
        sendSilentWaiterNotification,
        notificationPermission,
        requestPushNotifications,
        testPushNotification,
        // Offline & Service Worker Resilience
        isOnline,
        isForceOffline,
        effectiveIsOnline,
        networkLatencyMs,
        pendingSyncQueue,
        isSyncing,
        lastSyncTimestamp,
        isOfflineSyncModalOpen,
        setIsOfflineSyncModalOpen,
        toggleForceOffline,
        triggerManualSync,
        clearSyncQueue,
        removeSyncQueueItem,
        simulateOfflineOrder,
        simulationActive,
        setSimulationActive,
        resetAllDataToDefault,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp deve ser usado dentro de um AppProvider');
  }
  return context;
};

export const useAppContext = useApp;
