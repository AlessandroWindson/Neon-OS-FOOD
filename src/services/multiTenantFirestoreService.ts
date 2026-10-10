import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

/**
 * ============================================================================
 * MULTI-TENANT FIRESTORE SCHEMA TYPES
 * Collections: 'Empresas', 'Unidades', 'Produtos', 'Pedidos'
 * ============================================================================
 */

export interface EmpresaFirestore {
  id: string;
  name: string;
  slug: string;
  cnpj: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  phone: string;
  planId: string;
  planName: string;
  monthlyFee: number;
  status: 'active' | 'trial' | 'suspended' | 'deactivated' | 'canceled';
  branchesCount: number;
  trialEndsAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface UnidadeFirestore {
  id: string;
  empresaId: string;
  tenantId?: string;
  name: string;
  code: string;
  city: string;
  state: string;
  address: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  isMain: boolean;
  status: 'open' | 'closed' | 'Ativa' | 'Inativa' | 'Suspensa' | 'Em configuração';
  tradeName?: string;
  corporateName?: string;
  cnpj?: string;
  kdsAvgTimeMin?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProdutoFirestore {
  id: string;
  empresaId: string;
  unidadeId?: string; // Se omitido ou 'global', aplica-se a todas as filiais
  tenantId?: string;
  branchId?: string;
  name: string;
  description: string;
  category: string;
  price: number;
  costPrice: number;
  marginPercent?: number;
  cmvPercent?: number;
  available: boolean;
  imageUrl?: string;
  station: 'grill' | 'fryer' | 'assembly' | 'bar' | 'dessert' | 'all';
  bcgClassification: 'star' | 'cash_cow' | 'question_mark' | 'puzzle' | 'dog' | 'horse';
  stock?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CategoriaFirestore {
  id: string;
  empresaId: string;
  tenantId?: string;
  branchId?: string;
  name: string;
  icon: string;
  order: number;
  imageUrl?: string;
  description?: string;
  colorGradient?: string;
  badge?: string;
  startingPrice?: number;
  popularTag?: string;
  active?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PedidoFirestore {
  id: string;
  empresaId: string;
  unidadeId: string;
  tenantId?: string;
  branchId?: string;
  orderNumber: number;
  displayCode: string;
  channel: string;
  status: string;
  customerName: string;
  customerPhone?: string;
  tableNumber?: number;
  comandaNumber?: number;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  serviceFee: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  preparationNotes?: string;
  items?: any[];
  createdAt: string;
  updatedAt: string;
}

// ----------------------------------------------------------------------------
// 1. EMPRESAS (Multi-Tenancy Root)
// ----------------------------------------------------------------------------

export async function saveEmpresa(empresa: EmpresaFirestore): Promise<void> {
  const path = `empresas/${empresa.id}`;
  try {
    const docRef = doc(db, 'empresas', empresa.id);
    await setDoc(docRef, {
      ...empresa,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // Sincronizar na coleção legada 'tenants' para compatibilidade
    const tenantRef = doc(db, 'tenants', empresa.id);
    await setDoc(tenantRef, empresa, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getEmpresas(): Promise<EmpresaFirestore[]> {
  const path = 'empresas';
  try {
    const querySnapshot = await getDocs(collection(db, 'empresas'));
    const list: EmpresaFirestore[] = [];
    querySnapshot.forEach((docSnap) => {
      list.push(docSnap.data() as EmpresaFirestore);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function getEmpresaById(empresaId: string): Promise<EmpresaFirestore | null> {
  const path = `empresas/${empresaId}`;
  try {
    const docSnap = await getDoc(doc(db, 'empresas', empresaId));
    if (docSnap.exists()) {
      return docSnap.data() as EmpresaFirestore;
    }
    // Fallback legado em 'tenants'
    const tenantSnap = await getDoc(doc(db, 'tenants', empresaId));
    if (tenantSnap.exists()) {
      return tenantSnap.data() as EmpresaFirestore;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function deleteEmpresa(empresaId: string): Promise<void> {
  const path = `empresas/${empresaId}`;
  try {
    await deleteDoc(doc(db, 'empresas', empresaId));
    await deleteDoc(doc(db, 'tenants', empresaId)).catch(() => {});
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeEmpresas(onUpdate: (empresas: EmpresaFirestore[]) => void): Unsubscribe {
  const path = 'empresas';
  return onSnapshot(
    collection(db, 'empresas'),
    (snapshot) => {
      const list: EmpresaFirestore[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as EmpresaFirestore);
      });
      onUpdate(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

// ----------------------------------------------------------------------------
// 2. UNIDADES (Multi-Unidade / Filiais)
// ----------------------------------------------------------------------------

export async function saveUnidade(empresaId: string, unidade: UnidadeFirestore): Promise<void> {
  const nestedPath = `empresas/${empresaId}/unidades/${unidade.id}`;
  try {
    // 1. Subcoleção aninhada sob a Empresa
    const nestedRef = doc(db, 'empresas', empresaId, 'unidades', unidade.id);
    await setDoc(nestedRef, {
      ...unidade,
      empresaId,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // 2. Coleção indexada global para buscas diretas com garantia de empresaId
    const globalRef = doc(db, 'unidades', unidade.id);
    await setDoc(globalRef, {
      ...unidade,
      empresaId,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, nestedPath);
  }
}

export async function getUnidadesByEmpresa(empresaId: string): Promise<UnidadeFirestore[]> {
  const path = `empresas/${empresaId}/unidades`;
  try {
    const subCol = collection(db, 'empresas', empresaId, 'unidades');
    const querySnapshot = await getDocs(subCol);
    const list: UnidadeFirestore[] = [];
    querySnapshot.forEach((docSnap) => {
      list.push(docSnap.data() as UnidadeFirestore);
    });

    if (list.length > 0) return list;

    // Fallback: consulta indexada na coleção global filtrando rigorosamente por empresaId
    const globalQuery = query(collection(db, 'unidades'), where('empresaId', '==', empresaId));
    const globalSnapshot = await getDocs(globalQuery);
    globalSnapshot.forEach((docSnap) => {
      list.push(docSnap.data() as UnidadeFirestore);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function getUnidadeById(empresaId: string, unidadeId: string): Promise<UnidadeFirestore | null> {
  const path = `empresas/${empresaId}/unidades/${unidadeId}`;
  try {
    const docSnap = await getDoc(doc(db, 'empresas', empresaId, 'unidades', unidadeId));
    if (docSnap.exists()) {
      return docSnap.data() as UnidadeFirestore;
    }
    const globalSnap = await getDoc(doc(db, 'unidades', unidadeId));
    if (globalSnap.exists()) {
      const data = globalSnap.data() as UnidadeFirestore;
      if (data.empresaId === empresaId) return data;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function deleteUnidade(empresaId: string, unidadeId: string): Promise<void> {
  const path = `empresas/${empresaId}/unidades/${unidadeId}`;
  try {
    await deleteDoc(doc(db, 'empresas', empresaId, 'unidades', unidadeId));
    await deleteDoc(doc(db, 'unidades', unidadeId)).catch(() => {});
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeUnidades(
  empresaId: string,
  onUpdate: (unidades: UnidadeFirestore[]) => void
): Unsubscribe {
  const path = `empresas/${empresaId}/unidades`;
  const subCol = collection(db, 'empresas', empresaId, 'unidades');

  return onSnapshot(
    subCol,
    (snapshot) => {
      const list: UnidadeFirestore[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as UnidadeFirestore);
      });
      onUpdate(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

// ----------------------------------------------------------------------------
// 3. PRODUTOS (Multi-Tenant Menu Items)
// ----------------------------------------------------------------------------

export async function saveProduto(empresaId: string, produto: ProdutoFirestore): Promise<void> {
  const nestedPath = `empresas/${empresaId}/produtos/${produto.id}`;
  try {
    // 1. Subcoleção sob a Empresa
    const nestedRef = doc(db, 'empresas', empresaId, 'produtos', produto.id);
    await setDoc(nestedRef, {
      ...produto,
      empresaId,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // 2. Coleção indexada global garantindo empresaId
    const globalRef = doc(db, 'produtos', produto.id);
    await setDoc(globalRef, {
      ...produto,
      empresaId,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, nestedPath);
  }
}

export async function getProdutosByEmpresa(empresaId: string, unidadeId?: string): Promise<ProdutoFirestore[]> {
  const path = `empresas/${empresaId}/produtos`;
  try {
    const subCol = collection(db, 'empresas', empresaId, 'produtos');
    const querySnapshot = await getDocs(subCol);
    let list: ProdutoFirestore[] = [];
    querySnapshot.forEach((docSnap) => {
      list.push(docSnap.data() as ProdutoFirestore);
    });

    if (list.length === 0) {
      const globalQuery = query(collection(db, 'produtos'), where('empresaId', '==', empresaId));
      const globalSnap = await getDocs(globalQuery);
      globalSnap.forEach((docSnap) => {
        list.push(docSnap.data() as ProdutoFirestore);
      });
    }

    if (unidadeId) {
      list = list.filter(p => !p.unidadeId || p.unidadeId === unidadeId || p.unidadeId === 'global');
    }

    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function getProdutoById(empresaId: string, produtoId: string): Promise<ProdutoFirestore | null> {
  const path = `empresas/${empresaId}/produtos/${produtoId}`;
  try {
    const docSnap = await getDoc(doc(db, 'empresas', empresaId, 'produtos', produtoId));
    if (docSnap.exists()) {
      return docSnap.data() as ProdutoFirestore;
    }
    const globalSnap = await getDoc(doc(db, 'produtos', produtoId));
    if (globalSnap.exists()) {
      const data = globalSnap.data() as ProdutoFirestore;
      if (data.empresaId === empresaId) return data;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function deleteProduto(empresaId: string, produtoId: string): Promise<void> {
  const path = `empresas/${empresaId}/produtos/${produtoId}`;
  try {
    await deleteDoc(doc(db, 'empresas', empresaId, 'produtos', produtoId));
    await deleteDoc(doc(db, 'produtos', produtoId)).catch(() => {});
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeProdutos(
  empresaId: string,
  unidadeId: string | undefined,
  onUpdate: (produtos: ProdutoFirestore[]) => void
): Unsubscribe {
  const path = `empresas/${empresaId}/produtos`;
  const subCol = collection(db, 'empresas', empresaId, 'produtos');

  return onSnapshot(
    subCol,
    (snapshot) => {
      let list: ProdutoFirestore[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as ProdutoFirestore);
      });
      if (unidadeId) {
        list = list.filter(p => !p.unidadeId || p.unidadeId === unidadeId || p.unidadeId === 'global');
      }
      onUpdate(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

// ----------------------------------------------------------------------------
// 3.1. CATEGORIAS (Multi-Tenant Menu Categories)
// ----------------------------------------------------------------------------

export async function saveCategoria(empresaId: string, categoria: CategoriaFirestore): Promise<void> {
  const nestedPath = `empresas/${empresaId}/categorias/${categoria.id}`;
  try {
    const enriched = {
      ...categoria,
      empresaId,
      tenantId: empresaId,
      updatedAt: new Date().toISOString()
    };

    // 1. Subcoleção sob a Empresa (Isolamento Multi-Tenant Nativo)
    const nestedRef = doc(db, 'empresas', empresaId, 'categorias', categoria.id);
    await setDoc(nestedRef, enriched, { merge: true });

    // 2. Coleção indexada global garantindo empresaId
    const globalRef = doc(db, 'categorias', categoria.id);
    await setDoc(globalRef, enriched, { merge: true });

    // 3. Compatibilidade retroativa com /restaurants/{id}/categories
    const retroRef = doc(db, 'restaurants', empresaId, 'categories', categoria.id);
    await setDoc(retroRef, enriched, { merge: true }).catch(() => {});
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, nestedPath);
  }
}

export async function getCategoriasByEmpresa(empresaId: string): Promise<CategoriaFirestore[]> {
  const path = `empresas/${empresaId}/categorias`;
  try {
    const subCol = collection(db, 'empresas', empresaId, 'categorias');
    const querySnapshot = await getDocs(subCol);
    let list: CategoriaFirestore[] = [];
    querySnapshot.forEach((docSnap) => {
      list.push(docSnap.data() as CategoriaFirestore);
    });

    if (list.length === 0) {
      const globalQuery = query(collection(db, 'categorias'), where('empresaId', '==', empresaId));
      const globalSnap = await getDocs(globalQuery);
      globalSnap.forEach((docSnap) => {
        list.push(docSnap.data() as CategoriaFirestore);
      });
    }

    if (list.length === 0) {
      const retroCol = collection(db, 'restaurants', empresaId, 'categories');
      const retroSnap = await getDocs(retroCol);
      retroSnap.forEach((docSnap) => {
        list.push(docSnap.data() as CategoriaFirestore);
      });
    }

    list.sort((a, b) => (a.order || 99) - (b.order || 99));
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function deleteCategoria(empresaId: string, categoriaId: string): Promise<void> {
  const path = `empresas/${empresaId}/categorias/${categoriaId}`;
  try {
    await deleteDoc(doc(db, 'empresas', empresaId, 'categorias', categoriaId));
    await deleteDoc(doc(db, 'categorias', categoriaId)).catch(() => {});
    await deleteDoc(doc(db, 'restaurants', empresaId, 'categories', categoriaId)).catch(() => {});
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeCategorias(
  empresaId: string,
  onUpdate: (categorias: CategoriaFirestore[]) => void
): Unsubscribe {
  const path = `empresas/${empresaId}/categorias`;
  const subCol = collection(db, 'empresas', empresaId, 'categorias');

  return onSnapshot(
    subCol,
    (snapshot) => {
      const list: CategoriaFirestore[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as CategoriaFirestore);
      });
      list.sort((a, b) => (a.order || 99) - (b.order || 99));
      onUpdate(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

// ----------------------------------------------------------------------------
// 4. PEDIDOS (Multi-Tenant Orders)
// ----------------------------------------------------------------------------

export async function savePedido(empresaId: string, pedido: PedidoFirestore): Promise<void> {
  const nestedPath = `empresas/${empresaId}/pedidos/${pedido.id}`;
  try {
    // 1. Subcoleção sob a Empresa
    const nestedRef = doc(db, 'empresas', empresaId, 'pedidos', pedido.id);
    await setDoc(nestedRef, {
      ...pedido,
      empresaId,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // 2. Coleção indexada global garantindo empresaId
    const globalRef = doc(db, 'pedidos', pedido.id);
    await setDoc(globalRef, {
      ...pedido,
      empresaId,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, nestedPath);
  }
}

export async function getPedidosByEmpresa(empresaId: string, unidadeId?: string): Promise<PedidoFirestore[]> {
  const path = `empresas/${empresaId}/pedidos`;
  try {
    const subCol = collection(db, 'empresas', empresaId, 'pedidos');
    const querySnapshot = await getDocs(subCol);
    let list: PedidoFirestore[] = [];
    querySnapshot.forEach((docSnap) => {
      list.push(docSnap.data() as PedidoFirestore);
    });

    if (list.length === 0) {
      const globalQuery = query(collection(db, 'pedidos'), where('empresaId', '==', empresaId));
      const globalSnap = await getDocs(globalQuery);
      globalSnap.forEach((docSnap) => {
        list.push(docSnap.data() as PedidoFirestore);
      });
    }

    if (unidadeId) {
      list = list.filter(p => p.unidadeId === unidadeId);
    }

    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function getPedidoById(empresaId: string, pedidoId: string): Promise<PedidoFirestore | null> {
  const path = `empresas/${empresaId}/pedidos/${pedidoId}`;
  try {
    const docSnap = await getDoc(doc(db, 'empresas', empresaId, 'pedidos', pedidoId));
    if (docSnap.exists()) {
      return docSnap.data() as PedidoFirestore;
    }
    const globalSnap = await getDoc(doc(db, 'pedidos', pedidoId));
    if (globalSnap.exists()) {
      const data = globalSnap.data() as PedidoFirestore;
      if (data.empresaId === empresaId) return data;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function updatePedidoStatus(
  empresaId: string,
  pedidoId: string,
  status: string,
  preparationNotes?: string
): Promise<void> {
  const path = `empresas/${empresaId}/pedidos/${pedidoId}`;
  try {
    const updateData: Record<string, any> = {
      status,
      updatedAt: new Date().toISOString()
    };
    if (preparationNotes !== undefined) {
      updateData.preparationNotes = preparationNotes;
    }

    const nestedRef = doc(db, 'empresas', empresaId, 'pedidos', pedidoId);
    await updateDoc(nestedRef, updateData);

    const globalRef = doc(db, 'pedidos', pedidoId);
    await updateDoc(globalRef, updateData).catch(() => {});
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deletePedido(empresaId: string, pedidoId: string): Promise<void> {
  const path = `empresas/${empresaId}/pedidos/${pedidoId}`;
  try {
    await deleteDoc(doc(db, 'empresas', empresaId, 'pedidos', pedidoId));
    await deleteDoc(doc(db, 'pedidos', pedidoId)).catch(() => {});
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribePedidos(
  empresaId: string,
  unidadeId: string | undefined,
  onUpdate: (pedidos: PedidoFirestore[]) => void
): Unsubscribe {
  const path = `empresas/${empresaId}/pedidos`;
  const subCol = collection(db, 'empresas', empresaId, 'pedidos');

  return onSnapshot(
    subCol,
    (snapshot) => {
      let list: PedidoFirestore[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as PedidoFirestore);
      });
      if (unidadeId) {
        list = list.filter(p => p.unidadeId === unidadeId);
      }
      onUpdate(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

// ----------------------------------------------------------------------------
// 5. DIAGNÓSTICO E AUDITORIA DE ISOLAMENTO MULTI-TENANT
// ----------------------------------------------------------------------------

export interface MultiTenantIsolationReport {
  empresaId: string;
  isEmpresaCreated: boolean;
  unidadesCount: number;
  produtosCount: number;
  pedidosCount: number;
  isIsolated: boolean;
  timestamp: string;
}

export async function verifyMultiTenantIsolation(
  empresaId: string = 'tenant_lanchonete_dulci'
): Promise<MultiTenantIsolationReport> {
  try {
    const empresa = await getEmpresaById(empresaId);
    const unidades = await getUnidadesByEmpresa(empresaId);
    const produtos = await getProdutosByEmpresa(empresaId);
    const pedidos = await getPedidosByEmpresa(empresaId);

    const isIsolated = unidades.every(u => u.empresaId === empresaId) &&
                       produtos.every(p => p.empresaId === empresaId) &&
                       pedidos.every(o => o.empresaId === empresaId);

    return {
      empresaId,
      isEmpresaCreated: !!empresa,
      unidadesCount: unidades.length,
      produtosCount: produtos.length,
      pedidosCount: pedidos.length,
      isIsolated,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('[MultiTenant] Falha na auditoria de isolamento:', error);
    return {
      empresaId,
      isEmpresaCreated: false,
      unidadesCount: 0,
      produtosCount: 0,
      pedidosCount: 0,
      isIsolated: false,
      timestamp: new Date().toISOString()
    };
  }
}

// ----------------------------------------------------------------------------
// 6. INITIAL SEEDING HELPER
// Sets up initial schema and documents for Empresas, Unidades, Produtos, Pedidos
// ----------------------------------------------------------------------------

export async function seedInitialMultiTenantSchema(): Promise<{
  empresasCount: number;
  unidadesCount: number;
  produtosCount: number;
  pedidosCount: number;
}> {
  console.log('[MultiTenantFirestore] Inicializando schema e coleções do Firestore...');

  const now = new Date().toISOString();
  const empresaId = 'tenant_lanchonete_dulci';

  // 1. Empresa: Lanchonete Dulci
  const empresaDulci: EmpresaFirestore = {
    id: empresaId,
    name: 'Lanchonete Dulci',
    slug: 'lanchonete-dulci',
    cnpj: '45.189.231/0001-92',
    ownerId: 'usr_regeane_dulci',
    ownerName: 'Regeane Souza',
    ownerEmail: 'regeane@lanchonetedulci.com.br',
    phone: '(11) 98452-3319',
    planId: 'plan_pro',
    planName: 'Plano Pro Neon',
    monthlyFee: 89.90,
    status: 'active',
    branchesCount: 2,
    trialEndsAt: '2026-12-31T23:59:59Z',
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: now,
  };
  await saveEmpresa(empresaDulci);

  // 1.1 Persistir perfil da Regeane Souza no Firestore (/users/usr_regeane_dulci)
  try {
    await setDoc(doc(db, 'users', 'usr_regeane_dulci'), {
      id: 'usr_regeane_dulci',
      name: 'Regeane Souza',
      displayName: 'Regeane Souza',
      email: 'regeane@lanchonetedulci.com.br',
      phone: '(11) 98452-3319',
      role: 'owner',
      tenantId: empresaId,
      companyName: 'Lanchonete Dulci',
      branchId: 'branch_dulci_matriz',
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
      createdAt: '2026-01-15T10:00:00Z',
      updatedAt: now,
    }, { merge: true });
  } catch (err) {
    console.warn('Erro ao persistir perfil de Regeane Souza:', err);
  }

  // 2. Unidades: Matriz Centro e Quiosque Shopping
  const unidadeMatriz: UnidadeFirestore = {
    id: 'branch_dulci_matriz',
    empresaId,
    tenantId: empresaId,
    name: 'Lanchonete Dulci - Matriz Centro',
    code: 'DULCI-01',
    city: 'São Paulo',
    state: 'SP',
    address: 'Rua das Flores, 245 - Centro',
    phone: '(11) 3321-4455',
    whatsapp: '(11) 98452-3319',
    email: 'contato@lanchonetedulci.com.br',
    isMain: true,
    status: 'Ativa',
    tradeName: 'Lanchonete Dulci Matriz',
    corporateName: 'Dulci Alimentos e Bebidas Ltda',
    cnpj: '45.189.231/0001-92',
    kdsAvgTimeMin: 12.0,
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: now,
  };

  const unidadeShopping: UnidadeFirestore = {
    id: 'branch_dulci_shopping',
    empresaId,
    tenantId: empresaId,
    name: 'Lanchonete Dulci - Quiosque Shopping',
    code: 'DULCI-02',
    city: 'São Paulo',
    state: 'SP',
    address: 'Av. Paulista, 1500 - Piso 2 - Bela Vista',
    phone: '(11) 3289-9988',
    whatsapp: '(11) 98452-3320',
    email: 'shopping@lanchonetedulci.com.br',
    isMain: false,
    status: 'Ativa',
    tradeName: 'Lanchonete Dulci Shopping Paulista',
    corporateName: 'Dulci Express Quiosque Ltda',
    cnpj: '45.189.231/0002-73',
    kdsAvgTimeMin: 9.5,
    createdAt: '2026-02-01T10:00:00Z',
    updatedAt: now,
  };

  await saveUnidade(empresaId, unidadeMatriz);
  await saveUnidade(empresaId, unidadeShopping);

  // 3. Produtos: Itens do Cardápio
  const produtosSeed: ProdutoFirestore[] = [
    {
      id: 'prod_smash_neon_duplo',
      empresaId,
      unidadeId: 'global',
      tenantId: empresaId,
      branchId: 'global',
      name: 'Smash Burger Duplo Dulci',
      description: '2x Smash burguer de 90g, queijo cheddar derretido, cebola caramelizada e maionese defumada.',
      category: 'Burgers',
      price: 36.90,
      costPrice: 12.50,
      marginPercent: 66.1,
      cmvPercent: 33.9,
      available: true,
      station: 'grill',
      bcgClassification: 'star',
      stock: 95,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prod_batata_rustica',
      empresaId,
      unidadeId: 'global',
      tenantId: empresaId,
      branchId: 'global',
      name: 'Batata Rústica com Alecrim & Páprica',
      description: 'Batatas rústicas artesanais crocantes temperadas com alecrim fresco e páprica defumada.',
      category: 'Porções',
      price: 24.90,
      costPrice: 6.20,
      marginPercent: 75.1,
      cmvPercent: 24.9,
      available: true,
      station: 'fryer',
      bcgClassification: 'cash_cow',
      stock: 140,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prod_refrigerante_lata',
      empresaId,
      unidadeId: 'global',
      tenantId: empresaId,
      branchId: 'global',
      name: 'Refrigerante em Lata 350ml',
      description: 'Coca-Cola original ou zero açúcar geladíssima.',
      category: 'Bebidas',
      price: 7.50,
      costPrice: 2.80,
      marginPercent: 62.7,
      cmvPercent: 37.3,
      available: true,
      station: 'bar',
      bcgClassification: 'cash_cow',
      stock: 220,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prod_sobremesa_pudim',
      empresaId,
      unidadeId: 'global',
      tenantId: empresaId,
      branchId: 'global',
      name: 'Pudim de Leite Condensado na Taça',
      description: 'Pudim tradicional cremoso sem furinhos com calda de caramelo dourada.',
      category: 'Sobremesas',
      price: 14.90,
      costPrice: 4.10,
      marginPercent: 72.5,
      cmvPercent: 27.5,
      available: true,
      station: 'dessert',
      bcgClassification: 'question_mark',
      stock: 45,
      createdAt: now,
      updatedAt: now,
    }
  ];

  for (const prod of produtosSeed) {
    await saveProduto(empresaId, prod);
  }

  // 4. Pedidos: Exemplos operacionais de comanda e delivery
  const pedidosSeed: PedidoFirestore[] = [
    {
      id: 'ped_dulci_1041',
      empresaId,
      unidadeId: 'branch_dulci_matriz',
      tenantId: empresaId,
      branchId: 'branch_dulci_matriz',
      orderNumber: 1041,
      displayCode: '#1041',
      channel: 'mesa',
      status: 'completed',
      customerName: 'Alesandro Costa',
      customerPhone: '(11) 99111-2233',
      tableNumber: 4,
      subtotal: 61.80,
      discount: 0,
      deliveryFee: 0,
      serviceFee: 6.18,
      total: 67.98,
      paymentMethod: 'pix',
      paymentStatus: 'paid',
      preparationNotes: 'Sem cebola no smash',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'ped_dulci_1042',
      empresaId,
      unidadeId: 'branch_dulci_matriz',
      tenantId: empresaId,
      branchId: 'branch_dulci_matriz',
      orderNumber: 1042,
      displayCode: '#1042',
      channel: 'delivery_whatsapp',
      status: 'preparing',
      customerName: 'Mariana Silva',
      customerPhone: '(11) 98888-7766',
      subtotal: 69.30,
      discount: 5.00,
      deliveryFee: 6.00,
      serviceFee: 0,
      total: 70.30,
      paymentMethod: 'credit_card',
      paymentStatus: 'paid',
      preparationNotes: 'Ponto da carne: bem passado',
      createdAt: now,
      updatedAt: now,
    }
  ];

  for (const ped of pedidosSeed) {
    await savePedido(empresaId, ped);
  }

  console.log('[MultiTenantFirestore] Schema e dados iniciais criados com sucesso!');

  return {
    empresasCount: 1,
    unidadesCount: 2,
    produtosCount: produtosSeed.length,
    pedidosCount: pedidosSeed.length,
  };
}

/**
 * Associa explicitamente a conta de Regeane Souza à empresa Lanchonete Dulci no Firestore/Firebase
 */
export async function associateRegeaneToDulciInFirestore(customUid?: string): Promise<void> {
  const targetUid = customUid || 'usr_regeane_dulci';
  const empresaId = 'tenant_lanchonete_dulci';
  const now = new Date().toISOString();

  // 1. Usuário no Firestore
  await setDoc(doc(db, 'users', targetUid), {
    id: targetUid,
    name: 'Regeane Souza',
    displayName: 'Regeane Souza',
    email: 'regeane@lanchonetedulci.com.br',
    phone: '(11) 98452-3319',
    role: 'owner',
    tenantId: empresaId,
    companyName: 'Lanchonete Dulci',
    branchId: 'branch_dulci_matriz',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    updatedAt: now,
  }, { merge: true });

  // 2. Empresa / Tenant no Firestore
  await setDoc(doc(db, 'empresas', empresaId), {
    id: empresaId,
    name: 'Lanchonete Dulci',
    slug: 'lanchonete-dulci',
    cnpj: '45.189.231/0001-92',
    ownerId: targetUid,
    ownerName: 'Regeane Souza',
    ownerDisplayName: 'Regeane Souza',
    ownerEmail: 'regeane@lanchonetedulci.com.br',
    phone: '(11) 98452-3319',
    planId: 'plan_pro',
    planName: 'Plano Pro Neon (R$ 89,90/mês)',
    monthlyFee: 89.90,
    status: 'active',
    branchesCount: 2,
    trialEndsAt: '2026-12-31T23:59:59Z',
    updatedAt: now,
  }, { merge: true });

  await setDoc(doc(db, 'tenants', empresaId), {
    id: empresaId,
    name: 'Lanchonete Dulci',
    slug: 'lanchonete-dulci',
    cnpj: '45.189.231/0001-92',
    owner: 'Regeane Souza',
    ownerName: 'Regeane Souza',
    ownerDisplayName: 'Regeane Souza',
    ownerEmail: 'regeane@lanchonetedulci.com.br',
    ownerId: targetUid,
    phone: '(11) 98452-3319',
    planId: 'plan_pro',
    planName: 'Plano Pro Neon (R$ 89,90/mês)',
    monthlyFee: 89.90,
    status: 'active',
    branchesCount: 2,
    trialEndsAt: '2026-12-31T23:59:59Z',
    updatedAt: now,
  }, { merge: true });
}

