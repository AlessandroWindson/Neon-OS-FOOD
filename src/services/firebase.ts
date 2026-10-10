import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  getDocs, 
  onSnapshot, 
  query, 
  where, 
  orderBy,
  addDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';
import { Branch, Tenant, User, SupportTicket, TenantRecord, MaintenanceSettings, AuditLog } from '../types';

// Initialize singleton Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase services using specified firestoreDatabaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Super Admin Definition (Default canonical reference, displayName will be updated from Firestore)
 */
export const SUPER_ADMIN_USER: User = {
  id: 'usr_superadmin_alessandro',
  name: 'Super Administrador',
  displayName: 'Super Administrador',
  email: 'admin@sistema.com',
  phone: 'Não informado',
  role: 'super_admin',
  tenantId: 'tenant_system_master',
  branchId: 'branch_system_master',
  avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
};

/**
 * Initial Platform Users List for Super Admin Management
 */
export const TEST_USER_REGEANE: User = {
  id: 'usr_regeane_dulci',
  name: 'Regeane Souza',
  displayName: 'Regeane Souza',
  email: 'regeane@lanchonetedulci.com.br',
  phone: '(11) 98452-3319',
  role: 'owner', // Papel no sistema = Proprietária / Gestora da Lanchonete Dulci
  tenantId: 'tenant_lanchonete_dulci',
  branchId: 'branch_dulci_matriz',
  avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
};

/**
 * Initial Platform Users List for Super Admin Management
 */
export const INITIAL_PLATFORM_USERS: User[] = [
  SUPER_ADMIN_USER,
  TEST_USER_REGEANE
];

/**
 * Initial Registered Tenants
 */
export const INITIAL_TENANT_RECORDS: TenantRecord[] = [
  {
    id: 'tenant_lanchonete_dulci',
    name: 'Lanchonete Dulci',
    cnpj: '45.189.231/0001-92',
    owner: 'Regeane Souza',
    email: 'regeane@lanchonetedulci.com.br',
    phone: '(11) 98452-3319',
    planId: 'plan_pro',
    planName: 'Plano Pro (R$ 89,90/mês)',
    branchesCount: 1,
    status: 'active',
    monthlyRevenue: 0,
    joinedAt: '15/01/2026',
    expiresAt: '2026-12-31',
    paymentMethod: 'pix',
  }
];

/**
 * Default Tenant for Test User: Lanchonete Dulci
 */
export const TEST_TENANT_DULCI: Tenant = {
  id: 'tenant_lanchonete_dulci',
  name: 'Lanchonete Dulci',
  slug: 'lanchonete-dulci',
  cnpj: 'Não informado',
  planId: 'plan_pro',
  planName: 'Plano Pro Neon (R$ 89,90/mês)',
  monthlyFee: 89.90,
  status: 'active',
  trialEndsAt: '2026-12-31T23:59:59Z',
  createdAt: '2026-01-15T10:00:00Z',
  settings: {
    currency: 'BRL',
    serviceTaxPercent: 10,
    defaultDeliveryFee: 6.0,
    deliveryBaseFee: 5.0,
    deliveryFeePerKm: 1.5,
    freeDeliveryOver: 60.0,
    cashbackPercent: 5.0,
    whatsappAutoReply: true,
    whatsappNumber: '',
    whatsappCustomLink: '',
    pixKeyType: 'cnpj',
    pixKey: '',
    pixBeneficiaryName: 'Lanchonete Dulci',
    pixCity: 'Não informado',
    menuCustomSlug: 'lanchonete-dulci',
    menuCustomDomain: '',
    whatsappGreetingTemplate: '🍔 *Olá! Bem-vindo à Lanchonete Dulci!* 🥤\n\nConfira nosso cardápio digital completo com deliciosos lanches, sucos e porções artesanais:\n👉 {link_cardapio}\n\nFaça seu pedido direto aqui!',
    whatsappTableTemplate: '🍽️ *Cardápio de Mesa - Lanchonete Dulci* (Mesa {mesa})\n\nOlá! Para pedir sem esperar na fila, acesse:\n👉 {link_cardapio}?mesa={mesa}',
    whatsappDeliveryTemplate: '🛵 *Delivery Lanchonete Dulci*\n\nPeça nossos deliciosos lanches no conforto da sua casa:\n👉 {link_cardapio}?origem=delivery\n\n⚡ Entrega rápida e caprichada!',
    whatsappPromoTemplate: '🔥 *PROMOÇÃO DULCI DO DIA* 🔥\n\nCombo Especial do Dia com 10% OFF no cupom *DULCI10*!\n👉 {link_cardapio}?cupom=DULCI10',
    whatsappPdfTemplate: '📄 *Cardápio Completo em PDF - Lanchonete Dulci*\n👉 {link_cardapio}?modo=pdf',
    enableCardapioOnline: true,
    enableKds: true,
    enableStockDeduction: true,
    printerPaperWidth: '80mm',
    thermalPaperWidth: '80mm',
    printAutoOnOrder: true,
    printKitchenCopy: true,
    autoEmitNfce: true,
    enableWhatsappBot: true,
    fiscalType: 'NFCe',
  },
};

/**
 * Initial Branches for Lanchonete Dulci
 */
export const INITIAL_BRANCHES_DULCI: Branch[] = [
  {
    id: 'branch_dulci_matriz',
    tenantId: 'tenant_lanchonete_dulci',
    name: 'Lanchonete Dulci',
    code: '01',
    city: 'Não informado',
    state: '',
    address: 'Não informado',
    phone: 'Não informado',
    isMain: true,
    status: 'open',
    revenueToday: 0,
    ordersToday: 0,
    cmvToday: 0,
    kdsAvgTimeMin: 0,
    tradeName: 'Lanchonete Dulci',
    corporateName: 'Não informado',
    cnpj: 'Não informado',
    responsibleCpf: 'Não informado',
    establishmentType: 'Não informado',
    zipCode: 'Não informado',
    street: 'Não informado',
    number: '',
    complement: '',
    neighborhood: 'Não informado',
    whatsapp: 'Não informado',
    email: 'Não informado',
    instagram: '',
    website: '',
    branchStatus: 'Ativa',
    openingHours: {
      seg: { isOpen: false, openTime: '', closeTime: '' },
      ter: { isOpen: false, openTime: '', closeTime: '' },
      qua: { isOpen: false, openTime: '', closeTime: '' },
      qui: { isOpen: false, openTime: '', closeTime: '' },
      sex: { isOpen: false, openTime: '', closeTime: '' },
      sab: { isOpen: false, openTime: '', closeTime: '' },
      dom: { isOpen: false, openTime: '', closeTime: '' },
    }
  }
];

/**
 * Persistence service for Branches in Firestore
 */
export async function saveBranchToFirestore(tenantId: string, branch: Branch): Promise<void> {
  try {
    const branchRef = doc(db, 'tenants', tenantId, 'branches', branch.id);
    await setDoc(branchRef, {
      ...branch,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('Erro ao salvar filial no Firestore:', err);
    // Fallback local storage
    try {
      const stored = localStorage.getItem(`neon_branches_${tenantId}`);
      const list: Branch[] = stored ? JSON.parse(stored) : [];
      const idx = list.findIndex(b => b.id === branch.id);
      if (idx >= 0) {
        list[idx] = branch;
      } else {
        list.push(branch);
      }
      localStorage.setItem(`neon_branches_${tenantId}`, JSON.stringify(list));
    } catch {
      // Ignora erro de fallback
    }
  }
}

/**
 * Delete branch from Firestore
 */
export async function deleteBranchFromFirestore(tenantId: string, branchId: string): Promise<void> {
  try {
    const branchRef = doc(db, 'tenants', tenantId, 'branches', branchId);
    await setDoc(branchRef, { status: 'closed', branchStatus: 'Inativa', deletedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.warn('Erro ao desativar filial no Firestore:', err);
  }
}

/**
 * Persistence service for Support Tickets in Firestore
 */
export async function saveSupportTicketToFirestore(ticket: SupportTicket): Promise<void> {
  try {
    const ticketRef = doc(db, 'support_tickets', ticket.id);
    await setDoc(ticketRef, {
      ...ticket,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('Erro ao salvar chamado no Firestore:', err);
    try {
      const stored = localStorage.getItem('neon_support_tickets');
      const list: SupportTicket[] = stored ? JSON.parse(stored) : [];
      const idx = list.findIndex(t => t.id === ticket.id);
      if (idx >= 0) {
        list[idx] = ticket;
      } else {
        list.unshift(ticket);
      }
      localStorage.setItem('neon_support_tickets', JSON.stringify(list));
    } catch {
      // ignore
    }
  }
}

/**
 * Persistence service for Audit Logs in Firestore
 */
export async function saveAuditLogToFirestore(log: AuditLog): Promise<void> {
  try {
    const logRef = doc(db, 'auditLogs', log.id);
    await setDoc(logRef, {
      ...log,
      createdAt: log.timestamp || new Date().toISOString()
    }, { merge: true });

    // Compatibilidade retroativa
    const legacyRef = doc(db, 'audit_logs', log.id);
    setDoc(legacyRef, {
      ...log,
      createdAt: log.timestamp || new Date().toISOString()
    }, { merge: true }).catch(() => {});
  } catch (err) {
    // silently fallback to local storage
  }
}

/**
 * Persistence service for Tenant Records in Firestore
 */
export async function saveTenantRecordToFirestore(tenant: TenantRecord): Promise<void> {
  try {
    const tenantRef = doc(db, 'tenants', tenant.id);
    await setDoc(tenantRef, {
      ...tenant,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('Erro ao salvar empresa no Firestore:', err);
  }
}

/**
 * Persistence service for Maintenance Mode in Firestore
 */
export async function saveMaintenanceSettingsToFirestore(settings: MaintenanceSettings): Promise<void> {
  try {
    const configRef = doc(db, 'system_settings', 'maintenance');
    await setDoc(configRef, {
      ...settings,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('Erro ao salvar modo de manutenção no Firestore:', err);
  }
}

export default {
  app,
  db,
  auth,
  storage,
  SUPER_ADMIN_USER,
  INITIAL_PLATFORM_USERS,
  INITIAL_TENANT_RECORDS,
  TEST_USER_REGEANE,
  TEST_TENANT_DULCI,
  INITIAL_BRANCHES_DULCI,
  saveSupportTicketToFirestore,
  saveAuditLogToFirestore,
  saveTenantRecordToFirestore,
  saveMaintenanceSettingsToFirestore
};
