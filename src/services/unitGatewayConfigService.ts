import { 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  Unsubscribe 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from '../lib/firebase';

export interface UnitGatewayConfig {
  id: string;
  empresaId: string;
  unidadeId: string;
  unidadeName?: string;
  environment: 'sandbox' | 'production';
  activePixProvider: 'mercadopago' | 'stone' | 'asaas' | 'bacen_direct' | 'cielo' | string;
  activeCardProvider: 'mercadopago' | 'stone' | 'cielo' | 'pagseguro' | string;
  
  // PIX Específico da Unidade
  pixKey?: string;
  pixKeyType?: 'cnpj' | 'cpf' | 'email' | 'phone' | 'random';
  pixBeneficiaryName?: string;
  pixBeneficiaryCity?: string;

  // Mercado Pago
  mercadoPagoPublicKey?: string;
  mercadoPagoAccessToken?: string;
  mercadoPagoWebhookSecret?: string;

  // Stone / Pagar.me
  stoneApiKey?: string;
  stoneSecretKey?: string;
  stoneCode?: string;
  stoneTerminalId?: string;

  // Cielo
  cieloMerchantId?: string;
  cieloMerchantKey?: string;

  // Asaas
  asaasApiKey?: string;

  // Taxas Negociadas da Unidade (opcional)
  customFeePixPercent?: number;
  customFeeCreditPercent?: number;
  customFeeDebitPercent?: number;

  // Metadados de Auditoria e Segurança
  isConfigured: boolean;
  securityHash?: string;
  updatedAt: string;
  updatedBy?: string;
}

const LOCAL_STORAGE_KEY_PREFIX = 'neon_unit_gateway_config_';

/**
 * Cria ou recupera a chave de armazenamento local de fallback
 */
function getStorageKey(unidadeId: string): string {
  return `${LOCAL_STORAGE_KEY_PREFIX}${unidadeId}`;
}

/**
 * Mascara com segurança uma chave de API ou segredo para exibição no frontend
 */
export function maskSecretKey(key?: string, visibleChars = 4): string {
  if (!key || key.trim().length === 0) return '';
  const clean = key.trim();
  if (clean.length <= visibleChars * 2) {
    return '••••••••••••';
  }
  const start = clean.slice(0, visibleChars);
  const end = clean.slice(-visibleChars);
  return `${start}••••••••••••${end}`;
}

/**
 * Validador de formato de chaves de API e credenciais
 */
export function validateGatewayCredentials(config: Partial<UnitGatewayConfig>): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validação Mercado Pago
  if (config.activePixProvider === 'mercadopago' || config.activeCardProvider === 'mercadopago') {
    if (config.mercadoPagoAccessToken) {
      const token = config.mercadoPagoAccessToken.trim();
      if (!token.startsWith('APP_USR-') && !token.startsWith('TEST-')) {
        warnings.push('O Access Token do Mercado Pago geralmente começa com "APP_USR-" (produção) ou "TEST-" (sandbox).');
      }
      if (token.length < 25) {
        errors.push('O Access Token do Mercado Pago fornecido parece muito curto.');
      }
    }
    if (config.mercadoPagoPublicKey && !config.mercadoPagoPublicKey.startsWith('APP_USR-') && !config.mercadoPagoPublicKey.startsWith('TEST-')) {
      warnings.push('A Public Key do Mercado Pago geralmente possui o prefixo "APP_USR-" ou "TEST-".');
    }
  }

  // Validação Stone
  if (config.activeCardProvider === 'stone' || config.activePixProvider === 'stone') {
    if (config.stoneSecretKey && config.stoneSecretKey.length < 15) {
      errors.push('A Chave Secreta da Stone / Pagar.me fornecida é inválida.');
    }
  }

  // Validação Chave Pix
  if (config.pixKey) {
    const key = config.pixKey.trim();
    if (config.pixKeyType === 'email' && !key.includes('@')) {
      errors.push('A Chave Pix informada como tipo Email não contém o caractere "@".');
    }
    if (config.pixKeyType === 'cpf' && key.replace(/\D/g, '').length !== 11) {
      errors.push('O CPF da Chave Pix deve conter 11 dígitos numéricos.');
    }
    if (config.pixKeyType === 'cnpj' && key.replace(/\D/g, '').length !== 14) {
      errors.push('O CNPJ da Chave Pix deve conter 14 dígitos numéricos.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Salva as chaves de API e credenciais da Unidade de forma segura no Firestore
 */
export async function saveUnitGatewayConfig(
  empresaId: string,
  unidadeId: string,
  data: Partial<UnitGatewayConfig>
): Promise<UnitGatewayConfig> {
  const safeEmpresaId = empresaId || 'tenant_lanchonete_dulci';
  const safeUnidadeId = unidadeId || 'unidade_matriz';
  const now = new Date().toISOString();
  const currentUid = auth.currentUser?.uid || 'user_admin';

  // Monta objeto consolidado com atributos auditáveis
  const configDoc: UnitGatewayConfig = {
    id: `gateway_config_${safeUnidadeId}`,
    empresaId: safeEmpresaId,
    unidadeId: safeUnidadeId,
    unidadeName: data.unidadeName || 'Unidade Principal',
    environment: data.environment || 'sandbox',
    activePixProvider: data.activePixProvider || 'mercadopago',
    activeCardProvider: data.activeCardProvider || 'stone',
    pixKey: data.pixKey || '',
    pixKeyType: data.pixKeyType || 'cnpj',
    pixBeneficiaryName: data.pixBeneficiaryName || '',
    pixBeneficiaryCity: data.pixBeneficiaryCity || '',
    mercadoPagoPublicKey: data.mercadoPagoPublicKey || '',
    mercadoPagoAccessToken: data.mercadoPagoAccessToken || '',
    mercadoPagoWebhookSecret: data.mercadoPagoWebhookSecret || '',
    stoneApiKey: data.stoneApiKey || '',
    stoneSecretKey: data.stoneSecretKey || '',
    stoneCode: data.stoneCode || '',
    stoneTerminalId: data.stoneTerminalId || '',
    cieloMerchantId: data.cieloMerchantId || '',
    cieloMerchantKey: data.cieloMerchantKey || '',
    asaasApiKey: data.asaasApiKey || '',
    customFeePixPercent: data.customFeePixPercent ?? 0.89,
    customFeeCreditPercent: data.customFeeCreditPercent ?? 2.89,
    customFeeDebitPercent: data.customFeeDebitPercent ?? 1.29,
    isConfigured: Boolean(
      (data.mercadoPagoAccessToken && data.mercadoPagoAccessToken.trim().length > 10) ||
      (data.stoneSecretKey && data.stoneSecretKey.trim().length > 10) ||
      (data.pixKey && data.pixKey.trim().length > 5) ||
      (data.cieloMerchantKey && data.cieloMerchantKey.trim().length > 10)
    ),
    securityHash: btoa(`${safeUnidadeId}_${safeEmpresaId}_${now}`).slice(0, 24),
    updatedAt: now,
    updatedBy: currentUid
  };

  // Salvar no local storage de contingência imediata
  try {
    localStorage.setItem(getStorageKey(safeUnidadeId), JSON.stringify(configDoc));
  } catch (lsErr) {
    console.warn('[UnitGatewayConfig] Failed to save to localStorage cache:', lsErr);
  }

  // 1. Grava no caminho oficial da Unidade vinculada: /empresas/{empresaId}/unidades/{unidadeId}/configuracoes/gateways
  const primaryPath = `empresas/${safeEmpresaId}/unidades/${safeUnidadeId}/configuracoes/gateways`;
  try {
    const primaryRef = doc(db, 'empresas', safeEmpresaId, 'unidades', safeUnidadeId, 'configuracoes', 'gateways');
    await setDoc(primaryRef, configDoc, { merge: true });
    console.log(`[UnitGatewayConfig] Successfully saved to Firestore primary path: ${primaryPath}`);
  } catch (error) {
    console.warn(`[UnitGatewayConfig] Error saving to ${primaryPath}, trying global fallback...`, error);
    
    // Tenta gravar na coleção global de fallback: /gateway_configs/{unidadeId}
    const fallbackPath = `gateway_configs/${safeUnidadeId}`;
    try {
      const fallbackRef = doc(db, 'gateway_configs', safeUnidadeId);
      await setDoc(fallbackRef, configDoc, { merge: true });
      console.log(`[UnitGatewayConfig] Saved to fallback Firestore path: ${fallbackPath}`);
    } catch (fbErr) {
      handleFirestoreError(fbErr, OperationType.WRITE, fallbackPath);
    }
  }

  // 2. Grava também no caminho global /gateway_configs/{unidadeId} para redundância e sincronização ultra-rápida
  try {
    const mirrorRef = doc(db, 'gateway_configs', safeUnidadeId);
    await setDoc(mirrorRef, configDoc, { merge: true });
  } catch (mirrorErr) {
    console.warn('[UnitGatewayConfig] Non-critical mirror error:', mirrorErr);
  }

  return configDoc;
}

/**
 * Carrega as chaves de API da Unidade do Firestore
 */
export async function getUnitGatewayConfig(
  empresaId: string,
  unidadeId: string
): Promise<UnitGatewayConfig | null> {
  const safeEmpresaId = empresaId || 'tenant_lanchonete_dulci';
  const safeUnidadeId = unidadeId || 'unidade_matriz';

  // 1. Tentar ler do caminho principal no Firestore: /empresas/{empresaId}/unidades/{unidadeId}/configuracoes/gateways
  try {
    const primaryRef = doc(db, 'empresas', safeEmpresaId, 'unidades', safeUnidadeId, 'configuracoes', 'gateways');
    const snap = await getDoc(primaryRef);
    if (snap.exists()) {
      const data = snap.data() as UnitGatewayConfig;
      // Atualizar cache
      try {
        localStorage.setItem(getStorageKey(safeUnidadeId), JSON.stringify(data));
      } catch (_) {}
      return data;
    }
  } catch (err) {
    console.warn('[UnitGatewayConfig] Error reading primary Firestore config:', err);
  }

  // 2. Tentar ler do caminho secundário global /gateway_configs/{unidadeId}
  try {
    const fallbackRef = doc(db, 'gateway_configs', safeUnidadeId);
    const snap = await getDoc(fallbackRef);
    if (snap.exists()) {
      const data = snap.data() as UnitGatewayConfig;
      return data;
    }
  } catch (err) {
    console.warn('[UnitGatewayConfig] Error reading fallback Firestore config:', err);
  }

  // 3. Fallback para cache do localStorage
  try {
    const cached = localStorage.getItem(getStorageKey(safeUnidadeId));
    if (cached) {
      return JSON.parse(cached) as UnitGatewayConfig;
    }
  } catch (_) {}

  return null;
}

/**
 * Assina em tempo real o documento de configuração da Unidade no Firestore
 */
export function subscribeUnitGatewayConfig(
  empresaId: string,
  unidadeId: string,
  onUpdate: (config: UnitGatewayConfig | null) => void
): Unsubscribe {
  const safeEmpresaId = empresaId || 'tenant_lanchonete_dulci';
  const safeUnidadeId = unidadeId || 'unidade_matriz';

  const docRef = doc(db, 'empresas', safeEmpresaId, 'unidades', safeUnidadeId, 'configuracoes', 'gateways');

  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as UnitGatewayConfig;
        onUpdate(data);
      } else {
        // Tenta recuperar do fallback
        getUnitGatewayConfig(safeEmpresaId, safeUnidadeId)
          .then(cfg => onUpdate(cfg))
          .catch(() => onUpdate(null));
      }
    },
    (error) => {
      console.warn('[UnitGatewayConfig] onSnapshot listener error:', error);
      // Fallback gracioso
      getUnitGatewayConfig(safeEmpresaId, safeUnidadeId)
        .then(cfg => onUpdate(cfg))
        .catch(() => onUpdate(null));
    }
  );
}
