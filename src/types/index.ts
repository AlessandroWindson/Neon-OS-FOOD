export type UserRole = 
  | 'super_admin' 
  | 'owner' 
  | 'manager' 
  | 'cashier' 
  | 'kitchen' 
  | 'waiter' 
  | 'driver' 
  | 'customer';

export interface User {
  id: string;
  name: string;
  displayName?: string;
  email: string;
  phone: string;
  role: UserRole;
  tenantId: string;
  branchId: string;
  avatarUrl?: string;
}

export type TenantStatus = 'not_activated' | 'active' | 'trial' | 'suspended' | 'deactivated' | 'canceled';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  cnpj: string;
  planId: string;
  planName: string;
  monthlyFee: number;
  status: TenantStatus;
  trialEndsAt: string;
  activatedAt?: string;
  lastAccessAt?: string;
  logoUrl?: string;
  createdAt: string;
  settings: TenantSettings;
}

export interface TenantSettings {
  currency: string;
  serviceTaxPercent: number;
  defaultDeliveryFee: number;
  deliveryBaseFee?: number;
  deliveryFeePerKm?: number;
  deliveryBaseRadiusKm?: number;
  deliveryMaxRadiusKm?: number;
  freeDeliveryOver?: number;
  storeCoordinates?: { lat: number; lng: number };
  storeAddress?: string;
  cashbackPercent: number;
  whatsappAutoReply: boolean;
  whatsappNumber: string;
  whatsappCustomLink?: string;
  pixKeyType?: 'cnpj' | 'cpf' | 'email' | 'phone' | 'random';
  pixKey?: string;
  pixBeneficiaryName?: string;
  pixCity?: string;
  menuCustomSlug?: string;
  menuCustomDomain?: string;
  whatsappGreetingTemplate?: string;
  whatsappTableTemplate?: string;
  whatsappDeliveryTemplate?: string;
  whatsappPromoTemplate?: string;
  whatsappPdfTemplate?: string;
  enableCardapioOnline?: boolean;
  enableAtendenteMobile?: boolean;
  enableKds: boolean;
  enableStockDeduction: boolean;
  printerPaperWidth?: '58mm' | '80mm';
  thermalPaperWidth?: '58mm' | '80mm';
  printAutoOnOrder: boolean;
  printKitchenCopy?: boolean;
  autoEmitNfce?: boolean;
  enableWhatsappBot?: boolean;
  fiscalType: 'NFCe' | 'SAT' | 'NFE' | 'Nenhum';
  paymentGatewayConfig?: PaymentGatewayConfig;
}

export type PaymentGatewayProvider = 'mercadopago' | 'asaas' | 'stone' | 'pagseguro' | 'cielo' | 'direct_pix';

export interface PaymentGatewayCredentials {
  mercadoPago?: {
    publicKey: string;
    accessToken: string;
    clientId?: string;
    clientSecret?: string;
    webhookSecret?: string;
  };
  asaas?: {
    apiKey: string;
    walletId?: string;
    webhookToken?: string;
  };
  stone?: {
    secretKey: string;
    publicKey: string;
    accountId?: string;
    webhookSecret?: string;
  };
  pagseguro?: {
    email: string;
    token: string;
    appId?: string;
    appKey?: string;
    webhookKey?: string;
  };
  cielo?: {
    merchantId: string;
    merchantKey: string;
  };
  directPix?: {
    pixKeyType: 'cnpj' | 'cpf' | 'email' | 'phone' | 'random';
    pixKey: string;
    beneficiaryName: string;
    city: string;
    bankName?: string;
  };
}

export interface PaymentGatewayConfig {
  provider: PaymentGatewayProvider;
  environment: 'sandbox' | 'production';
  credentials: PaymentGatewayCredentials;
  pix: {
    enabled: boolean;
    expirationMinutes: number;
    discountPercent: number;
    autoReconciliation: boolean;
  };
  creditCard: {
    enabled: boolean;
    maxInstallments: number;
    freeInstallments: number;
    monthlyInterestRate: number;
    mdrFeePercent: number;
    autoCapture: boolean;
    antiFraud: boolean;
  };
  debitCard: {
    enabled: boolean;
    mdrFeePercent: number;
    require3DSecure: boolean;
  };
  smartPOS: {
    enabled: boolean;
    terminalBrand: string;
    terminalId: string;
    tefIntegrated: boolean;
  };
  webhookEndpoint: string;
  webhookSecret: string;
  lastTestedAt?: string;
  connectionStatus?: 'connected' | 'disconnected' | 'testing' | 'error';
}

export interface BranchOpeningHoursDay {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

export interface Branch {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  city: string;
  state: string;
  address: string;
  phone: string;
  isMain: boolean;
  status: 'open' | 'closed';
  revenueToday: number;
  ordersToday: number;
  cmvToday: number;
  kdsAvgTimeMin: number;
  tradeName?: string;
  establishmentName?: string;
  corporateName?: string;
  cnpj?: string;
  responsibleCpf?: string;
  establishmentType?: string;
  category?: string;
  zipCode?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  whatsapp?: string;
  email?: string;
  instagram?: string;
  website?: string;
  branchStatus?: 'Ativa' | 'Inativa' | 'Suspensa' | 'Em configuração';
  openingHours?: Record<string, BranchOpeningHoursDay>;
  menuDisplayName?: string;
  menuDescription?: string;
  logoUrl?: string;
  bannerUrl?: string;
  publicInfo?: string;
  deliveryPhone?: string;
  deliveryWhatsapp?: string;
  deliveryBaseFee?: number;
  deliveryAreas?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TicketMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  message: string;
  createdAt: string;
  isStaffReply?: boolean;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string; // Ex: #TK-1002
  tenantId: string;
  tenantName: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  subject: string;
  category: 'suporte_tecnico' | 'duvida_operacional' | 'financeiro' | 'nfce_fiscal' | 'integracao_whatsapp' | 'impressora_termica' | 'sugestao_recurso';
  priority: TicketPriority;
  status: TicketStatus;
  description: string;
  messages: TicketMessage[];
  assignedTo?: string;
  assignedStaffName?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export type OrderChannel = 'pdv_balcao' | 'mesa' | 'comanda' | 'delivery_whatsapp' | 'delivery_web' | 'cardapio_online' | 'atendente_mesa' | 'ifood' | 'rappi' | '99food' | 'uber' | 'uber_direct';
export type OrderStatus = 'pending' | 'recebido' | 'preparing' | 'ready' | 'delivering' | 'completed' | 'canceled';
export type PaymentMethod = 'pix' | 'credit_card' | 'debit_card' | 'cash' | 'voucher' | 'wallet';

export interface OrderItemOption {
  name: string;
  price: number;
  quantity?: number;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
  selectedOptions?: OrderItemOption[];
  station: 'grill' | 'fryer' | 'assembly' | 'bar' | 'dessert';
  status: 'pending' | 'in_prep' | 'ready';
  prepStartedAt?: string;
  prepCompletedAt?: string;
}

export interface Order {
  id: string;
  orderNumber: number;
  displayCode: string; // Ex: #1042
  tenantId: string;
  branchId: string;
  channel: OrderChannel;
  status: OrderStatus;
  customerName: string;
  customerPhone?: string;
  customerAddress?: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    zipCode: string;
    complement?: string;
    coords?: { lat: number; lng: number };
    distanceKm?: number;
  };
  tableNumber?: number;
  comandaNumber?: number;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  serviceFee: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: 'pending' | 'paid' | 'refunded';
  paidAmount?: number;
  changeFor?: number;
  cashbackEarned?: number;
  pixTxId?: string;
  pixEndToEndId?: string;
  pixPaidAt?: string;
  cardBrand?: string;
  cardLast4?: string;
  cardAuthCode?: string;
  cardTid?: string;
  cardNsu?: string;
  cardInstallments?: number;
  gatewayProvider?: string;
  gatewayFee?: number;
  gatewayPaidAt?: string;
  driverId?: string;
  driverName?: string;
  notes?: string;
  preparationNotes?: string;
  createdAt: string;
  updatedAt: string;
  estimatedDeliveryMin?: number;
  cancellationReason?: string;
  isOfflineCreated?: boolean;
  syncStatus?: 'synced' | 'pending_sync';
}

export interface Ingredient {
  id: string;
  tenantId: string;
  name: string;
  category: string;
  unit: 'kg' | 'g' | 'l' | 'ml' | 'un' | 'pct' | 'cx' | string;
  currentStock: number;
  minimumStock: number;
  idealStock: number;
  costPerUnit: number;
  supplier: string;
  leadTimeDays: number;
  lossFactorPercent: number; // Fator de correção/perda
  lastRestockDate: string;
  predictedRuptureHours?: number;
  status: 'ok' | 'warning' | 'critical';
}

export interface TechnicalSheetItem {
  ingredientId: string;
  ingredientName: string;
  quantity: number; // Ex: 150g
  unit: string;
  unitCost: number;
  totalCost: number;
}

export type KitchenStation = 'grill' | 'fryer' | 'assembly' | 'bar' | 'dessert' | 'all';

export type BCGClassification = 'star' | 'cash_cow' | 'question_mark' | 'puzzle' | 'dog' | 'horse';

export interface Supplier {
  id: string;
  name: string;
  category: string;
  phone: string;
  leadTimeDays: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  cpf?: string;
  address?: string;
  segment: 'vip' | 'frequent' | 'inactive' | 'new';
  totalOrders: number;
  totalSpent: number;
  cashbackBalance: number;
  points?: number;
  tier?: 'bronze' | 'prata' | 'ouro' | 'black';
  lastOrderDate: string;
  notes?: string;
}

export type StaffRole = 
  | 'atendente' 
  | 'chapeiro' 
  | 'auxiliar_cozinha' 
  | 'cozinheiro' 
  | 'gerente' 
  | 'caixa'
  | 'entregador';

export interface Employee {
  id: string;
  name: string;
  role: StaffRole;
  roleTitle: string; // Ex: 'Atendente de Salão', 'Chapeiro(a) Master', 'Auxiliar de Cozinha', 'Cozinheiro(a)', etc.
  phone: string;
  email?: string;
  cpf?: string;
  shift: 'manha' | 'tarde' | 'noite' | 'integral';
  status: 'ativo' | 'folga' | 'ferias' | 'inativo';
  salary?: number;
  commissionPercent?: number;
  commissionRate?: number;
  accessPin?: string;
  avatarUrl: string;
  xpPoints: number;
  level: number;
  salesMonth: number;
  tipsMonth: number;
  ordersCompletedToday: number;
  speedAvgMin: number;
  customerRating: number;
  badges: string[];
  joinedAt: string;
}

export type TeamMember = Employee;

export interface ProductPriceVariant {
  id?: string;
  name?: string;
  label?: string; // Ex: 'P (4 Fatias)', 'M (6 Fatias)', 'G (8 Fatias)' ou '300ml', '500ml', '700ml'
  price: number;
  costPrice?: number;
  description?: string;
}

export interface Product {
  id: string;
  tenantId?: string;
  branchId?: string;
  status?: 'active' | 'inactive';
  itemNumber?: string; // Ex: '01', '02', '03'
  name: string;
  description: string;
  category: string;
  price: number;
  priceVariants?: ProductPriceVariant[];
  badgeText?: string; // Ex: 'Mais Pedido', 'Chef VIP', 'Promoção', 'Artesanal'
  tags?: string[];
  costPrice: number; // CMV Insumos calculado da ficha técnica
  marginPercent?: number; // Margem bruta
  profitMarginPercent?: number;
  cmvPercent?: number;
  imageUrl: string;
  available: boolean;
  trackStock?: boolean;
  station: 'grill' | 'fryer' | 'assembly' | 'bar' | 'dessert';
  salesVolume30Days?: number;
  salesCountMonth?: number;
  bcgClassification: BCGClassification;
  recipe?: TechnicalSheetItem[];
  ingredients?: any[];
  options?: {
    groupName: string;
    required: boolean;
    max: number;
    items: { name: string; price: number }[];
  }[];
}

export interface ProductCategory {
  id: string;
  name: string;
  icon: string;
  order: number;
  imageUrl?: string;
  description?: string;
  colorGradient?: string;
  badge?: string;
  startingPrice?: number;
  popularTag?: string;
}

export interface TableItem {
  number: number;
  name?: string;
  label?: string;
  seats: number;
  status: 'free' | 'occupied' | 'bill_requested' | 'reserved' | 'cleaning';
  currentOrderId?: string;
  currentTotal: number;
  waiterName?: string;
  openedAt?: string;
  customersCount?: number;
  x?: number;
  y?: number;
  shape?: 'square' | 'round' | 'rectangle';
  zone?: 'salao_principal' | 'varanda' | 'bar_lounge' | 'mezanino';
  reservationTime?: string;
  reservationName?: string;
  cleaningRequestedAt?: string;
}

export interface ComandaItem {
  id: string;
  code: string;
  customerName: string;
  phone?: string;
  tableNumber?: number;
  items: OrderItem[];
  total: number;
  openedAt: string;
  waiter: string;
  status: 'open' | 'closed';
}

export interface DeliveryDriver {
  id: string;
  name: string;
  phone: string;
  vehicle: 'moto' | 'bike' | 'carro';
  plate?: string;
  status: 'available' | 'on_route' | 'offline';
  currentOrdersCount: number;
  completedToday: number;
  totalTipsToday: number;
  rating: number;
  avatarUrl?: string;
  coords: { lat: number; lng: number };
  batteryLevel?: number;
  speedKmh?: number;
  heading?: number;
  assignedOrderId?: string;
  destinationCoords?: { lat: number; lng: number };
  destinationAddress?: string;
  estimatedArrivalMin?: number;
}

export interface CashSession {
  id: string;
  tenantId: string;
  branchId: string;
  openedBy: string;
  openedAt: string;
  closedBy?: string;
  closedAt?: string;
  status: 'open' | 'closed';
  initialAmount: number; // Fundo de troco
  cashSales: number;
  pixSales: number;
  creditSales: number;
  debitSales: number;
  voucherSales: number;
  totalInflow: number;
  bleedAmount: number; // Sangrias
  supplyAmount: number; // Suprimentos
  calculatedFinalAmount: number;
  countedFinalAmount?: number;
  difference?: number;
  notes?: string;
}

export interface FinancialEntry {
  id: string;
  tenantId: string;
  branchId: string;
  type: 'income' | 'expense';
  category: 'vendas' | 'cmv_insumos' | 'folha_pagamento' | 'aluguel' | 'energia_agua' | 'marketing' | 'taxa_cartao' | 'taxa_ifood' | 'manutencao' | 'outros';
  description: string;
  amount: number;
  date: string;
  paymentMethod: PaymentMethod | 'transferencia' | 'boleto';
  status: 'paid' | 'pending';
  receiptUrl?: string;
}

export interface FinancialTransaction {
  id: string;
  orderId: string;
  idempotencyKey: string;
  empresaId: string;
  unidadeId: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  paymentMethod: string;
  paymentStatus: 'paid';
  status: 'completed' | 'confirmed';
  channel?: string;
  customerName?: string;
  orderNumber?: number;
  displayCode?: string;
  itemsSummary?: string;
  costOfGoods?: number;
  netAmount?: number;
  cardFee?: number;
  createdAt: string;
  timestamp: string;
  settledAt?: string;
}

export type BillPayableCategory = 
  | 'fornecedores' 
  | 'aluguel' 
  | 'energia' 
  | 'agua' 
  | 'internet' 
  | 'salarios' 
  | 'servicos' 
  | 'manutencao' 
  | 'impostos' 
  | 'marketing' 
  | 'outros';

export interface BillPayable {
  id: string;
  tenantId: string;
  branchId: string;
  category: BillPayableCategory;
  description: string;
  amount: number;
  dueDate: string;
  issueDate: string;
  status: 'pending' | 'paid' | 'overdue';
  paidAt?: string;
  paidAmount?: number;
  paymentMethod?: PaymentMethod | 'transferencia' | 'boleto';
  purchaseId?: string;
  recipient?: string;
  recurrence?: 'none' | 'monthly' | 'weekly' | 'yearly';
  notes?: string;
}

export type BillReceivableCategory = 
  | 'vendas_prazo' 
  | 'evento' 
  | 'convenio' 
  | 'ifood_repasse' 
  | 'voucher' 
  | 'outros';

export interface BillReceivable {
  id: string;
  tenantId: string;
  branchId: string;
  category: BillReceivableCategory;
  description: string;
  amount: number;
  dueDate: string;
  issueDate: string;
  status: 'pending' | 'received' | 'overdue';
  receivedAt?: string;
  receivedAmount?: number;
  paymentMethod?: PaymentMethod | 'transferencia' | 'boleto';
  orderId?: string;
  customerName?: string;
  notes?: string;
}

export interface PurchaseItem {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

export interface PurchaseRecord {
  id: string;
  tenantId: string;
  branchId: string;
  supplierName: string;
  items: PurchaseItem[];
  totalAmount: number;
  paymentTerms: 'a_vista' | 'a_prazo';
  dueDate?: string;
  paymentStatus: 'paid' | 'pending';
  paymentMethod: PaymentMethod | 'transferencia' | 'boleto';
  paidAt?: string;
  date: string;
  createdAt: string;
  billPayableId?: string;
  notes?: string;
}

export interface CashMovementRecord {
  id: string;
  cashSessionId: string;
  tenantId: string;
  branchId: string;
  type: 'inflow_sale' | 'bleed' | 'supply' | 'outflow_expense' | 'outflow_purchase';
  amount: number;
  paymentMethod: PaymentMethod | 'transferencia' | 'boleto';
  reason: string;
  timestamp: string;
  operatorName: string;
  referenceId?: string;
}

export interface LoyaltyMember {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  email?: string;
  cpf: string;
  tier: 'bronze' | 'prata' | 'ouro' | 'black';
  points: number;
  cashbackBalance: number;
  totalSpent: number;
  ordersCount: number;
  lastOrderDate: string;
  favoriteProduct: string;
}

export interface StaffGamification {
  id: string;
  name: string;
  role: string;
  avatarUrl: string;
  xp: number;
  level: number;
  badges: string[];
  ordersCompletedToday: number;
  speedAvgMin: number;
  customerRating: number;
  salesUpsellTotal: number;
  dailyGoalProgress: number; // 0-100%
  rankPosition: number;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  tenantId?: string;
  userId?: string;
  userName: string;
  userEmail?: string;
  userRole: UserRole | string;
  actionType?: 'login' | 'order_creation' | 'price_change' | 'deletion' | string;
  action: 'login' | 'order_create' | 'order_creation' | 'price_change' | 'deletion' | 'cancel_item' | 'discount_applied' | 'cash_bleed' | 'ghost_login' | 'system_config' | 'config_change' | string;
  category?: 'auth' | 'order' | 'price' | 'delete' | 'config' | 'system';
  description: string;
  metadata?: Record<string, any>;
  details?: Record<string, any>;
  ipAddress: string;
  severity: 'info' | 'warning' | 'critical';
  createdAt?: string;
}

export type AuditLogEntry = AuditLog;

export interface SaaSPlan {
  id: string;
  name: string;
  priceMonthly: number;
  priceAnnual: number;
  recommended?: boolean;
  description: string;
  features: string[];
  maxOrdersMonth: number | 'ilimitado';
  maxBranches: number;
  maxUsers: number;
  supportType: string;
}

export type WebhookProvider = 'ifood' | 'rappi' | '99food' | 'uber' | 'uber_direct' | 'mercadopago' | 'stone' | 'cielo' | 'pagseguro' | 'asaas' | 'pix' | 'generic';

export type WebhookEventType = 
  | 'order.created' 
  | 'order.confirmed' 
  | 'order.preparing'
  | 'order.ready'
  | 'order.dispatched' 
  | 'order.delivered' 
  | 'order.cancelled'
  | 'payment.approved'
  | 'payment.refunded'
  | 'payment.failed'
  | 'pix.received'
  | 'charge.paid'
  | 'payment.confirmed'
  | 'charge.refunded'
  | 'pix.chargeback';

export interface WebhookNotification {
  id: string;
  provider: WebhookProvider;
  eventType: WebhookEventType;
  title: string;
  message: string;
  orderId?: string;
  orderCode?: string;
  amount?: number;
  payload?: any;
  timestamp: string;
  read?: boolean;
}

export type MarketplacePlatform = 'ifood' | '99food' | 'uber' | 'uber_direct';
export type MarketplaceStatus = 'connected' | 'warning' | 'error' | 'disconnected';

export interface MarketplaceConfig {
  id: MarketplacePlatform;
  name: string;
  badge: string;
  color: string;
  status: MarketplaceStatus;
  enabled: boolean;
  merchantId: string;
  clientId: string;
  clientSecret: string;
  storeId?: string;
  webhookUrl: string;
  lastSyncAt?: string;
  catalogSyncedCount?: number;
  autoAcceptOrders: boolean;
  useUberDirectForOwnDelivery?: boolean;
  latencyMs?: number;
}

export interface WebhookEventPayload {
  provider: WebhookProvider;
  event: WebhookEventType;
  orderId?: string;
  orderCode?: string;
  channel?: OrderChannel;
  customer?: {
    name: string;
    phone?: string;
    address?: {
      street: string;
      number: string;
      neighborhood: string;
      city: string;
      zipCode?: string;
    };
  };
  items?: {
    name: string;
    quantity: number;
    price: number;
    notes?: string;
    station?: 'grill' | 'fryer' | 'assembly' | 'bar' | 'dessert';
  }[];
  total?: number;
  paymentMethod?: PaymentMethod;
  paymentStatus?: 'pending' | 'paid' | 'refunded';
  reason?: string;
  rawPayload?: any;
}

// ==========================================
// MAQUININHAS DE CARTÃO & TERMINAIS SMART POS
// ==========================================
export type PaymentTerminalProvider = 'stone' | 'cielo' | 'pagbank' | 'rede' | 'getnet' | 'safrapay';

export interface PaymentTerminal {
  id: string;
  name: string; // Ex: 'Smart POS Salão 01'
  model: string; // Ex: 'Pax A910 Smart', 'Ingenico Move 5000', 'Gertec GPOS700'
  provider: PaymentTerminalProvider;
  serialNumber: string;
  ipAddress?: string;
  status: 'online' | 'busy' | 'offline';
  batteryLevel: number; // 0-100%
  signalStrength: number; // 1-5
  assignedZone?: string; // Ex: 'Salão Principal', 'Área Externa', 'Balcão'
  assignedWaiter?: string; // Ex: 'Marcelo Atendente'
  supportedMethods: ('credit' | 'debit' | 'pix' | 'voucher')[];
  lastTransaction?: {
    amount: number;
    method: string;
    nsu: string;
    tid: string;
    authorizationCode: string;
    brand: string;
    timestamp: string;
    status: 'approved' | 'declined';
    tableOrComanda?: string;
  };
}

export interface SmartPOSPaymentPayload {
  terminalId: string;
  method: 'credit' | 'debit' | 'pix' | 'voucher';
  installments?: number;
  amount: number;
  tableNumber?: number;
  comandaId?: string;
  customerName?: string;
}

// ==========================================
// IMPRESSORAS TÉRMICAS & ROTEAMENTO
// ==========================================
export interface ThermalPrinterConfig {
  id: string;
  name: string;
  location: 'caixa' | 'cozinha' | 'bar' | 'delivery';
  paperWidth: '58mm' | '80mm';
  interfaceType: 'usb' | 'network_ip' | 'bluetooth' | 'serial';
  ipAddress?: string;
  usbPort?: string;
  baudRate?: number;
  status: 'online' | 'offline' | 'paper_low' | 'out_of_paper';
  autoPrintTriggers: {
    onNewOrder: boolean;
    onBillRequested: boolean;
    onPaymentSettled: boolean;
    onSangria: boolean;
    onKitchenProduction: boolean;
  };
  printCopies: number;
  customHeader?: string;
  customFooter?: string;
  printKitchenOrder?: boolean;
  printCustomerReceipt?: boolean;
  copies?: number;
  cutPaper?: boolean;
  openCashDrawer?: boolean;
  headerText?: string;
  footerText?: string;
}

// ==========================================
// SUPER ADMIN & PLATAFORMA SAAS TYPES
// ==========================================
export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  tenantId: string;
  branchId?: string;
  status: 'active' | 'suspended' | 'inactive';
  createdAt: string;
  lastLogin?: string;
}

export interface TenantRecord {
  id: string;
  name: string;
  cnpj: string;
  owner: string;
  email: string;
  phone: string;
  planId?: string;
  planName: string;
  branchesCount: number;
  status: 'active' | 'trial' | 'pending_payment' | 'suspended' | 'deactivated';
  trialDaysLeft?: number;
  monthlyRevenue: number;
  joinedAt?: string;
  createdAt?: string;
  expiresAt?: string;
  paymentMethod?: string;
}

export interface SystemAnnouncement {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'urgent';
  targetPlan?: string;
  createdAt: string;
  author?: string;
  active: boolean;
}

export type Announcement = SystemAnnouncement;

export interface MaintenanceSettings {
  enabled: boolean;
  title: string;
  message: string;
  estimatedReturn: string;
  contactWhatsApp: string;
  updatedAt?: string;
}

