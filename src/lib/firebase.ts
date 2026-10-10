import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export { storage } from '../services/firebase';

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

// Ensure restaurant and owner staff record exist
export async function syncRestaurantAndOwner(userId: string, companyName: string, email: string, role: string = 'owner') {
  const restaurantId = userId; // UID-based restaurant ID for the owner
  const restaurantRef = doc(db, 'restaurants', restaurantId);
  const staffRef = doc(db, 'restaurants', restaurantId, 'staff', userId);

  try {
    const existing = await getDoc(restaurantRef);
    if (!existing.exists()) {
      await setDoc(restaurantRef, {
        id: restaurantId,
        name: companyName || 'Meu Restaurante',
        ownerId: userId,
        status: 'active',
        createdAt: new Date().toISOString()
      });
    }

    const staffExisting = await getDoc(staffRef);
    if (!staffExisting.exists()) {
      await setDoc(staffRef, {
        userId,
        name: companyName || email.split('@')[0],
        email,
        role,
        active: 'true',
        createdAt: new Date().toISOString()
      });
    }
  } catch (err) {
    console.warn('Erro ao sincronizar restaurante e staff no Firestore:', err);
  }
}

// Register or update staff member role in restaurant Firestore subcollection
export async function registerStaffMemberInFirestore(
  restaurantId: string, 
  staffUid: string, 
  staffData: { name: string; email: string; role: 'admin' | 'manager' | 'cashier' | 'waiter' | 'kitchen'; shift?: string }
) {
  const staffRef = doc(db, 'restaurants', restaurantId, 'staff', staffUid);
  await setDoc(staffRef, {
    userId: staffUid,
    name: staffData.name,
    email: staffData.email,
    role: staffData.role,
    shift: staffData.shift || 'Geral',
    active: 'true',
    createdAt: new Date().toISOString()
  }, { merge: true });
}

// Client-side RBAC validation helper matching Firestore Security Rules
export type AppCollection = 'finances' | 'staff' | 'products' | 'orders' | 'inventory' | 'super_admin';

export function checkCollectionPermission(
  userRole: string, 
  collection: AppCollection, 
  action: 'read' | 'create' | 'update' | 'delete'
): boolean {
  const normalizedRole = userRole.toLowerCase();

  // 1. Super Admin & Owner/Admin: Full unrestricted access
  if (['super_admin', 'owner', 'admin'].includes(normalizedRole)) {
    return true;
  }

  // 2. Gerente: Operational management (Menu, Orders, Inventory, Finances, Staff viewing)
  if (['manager', 'gerente'].includes(normalizedRole)) {
    if (collection === 'super_admin') return false;
    if (collection === 'staff') {
      return action === 'read'; // Manager can view team, but cannot create/delete staff
    }
    return true; // Full access to finances, products, orders, inventory
  }

  // 3. Atendente: Orders, Tables, Menu consultation, Basic inventory view
  if (['cashier', 'caixa', 'waiter', 'atendente', 'attendant'].includes(normalizedRole)) {
    if (collection === 'finances' || collection === 'super_admin' || collection === 'staff') {
      return false; // Denied by Firestore rules
    }
    if (collection === 'products') {
      return action === 'read';
    }
    if (collection === 'inventory') {
      return action === 'read'; // Can only check item availability
    }
    if (collection === 'orders') {
      return action !== 'delete'; // Cannot delete orders
    }
  }

  // 4. Cozinha: KDS order status updates & Ingredient deductions
  if (['kitchen', 'cozinha', 'chef', 'chapeiro', 'cozinheiro', 'auxiliar_cozinha'].includes(normalizedRole)) {
    if (collection === 'finances' || collection === 'super_admin' || collection === 'staff') {
      return false; // Denied by Firestore rules
    }
    if (collection === 'products') {
      return action === 'read';
    }
    if (collection === 'orders') {
      return action === 'read' || action === 'update'; // Can view and update preparation status
    }
    if (collection === 'inventory') {
      return action === 'read' || action === 'update'; // Can view and deduct ingredients
    }
  }

  return false;
}

// Test connection on boot
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Verifique a configuração do Firebase.");
    }
  }
}
