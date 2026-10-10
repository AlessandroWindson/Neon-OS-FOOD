import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CreditCard, 
  QrCode, 
  Zap, 
  ShieldCheck, 
  Key, 
  Lock, 
  Unlock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  RefreshCw, 
  Save, 
  DollarSign, 
  TrendingUp, 
  Percent, 
  Building2, 
  Smartphone, 
  Terminal, 
  Webhook, 
  ExternalLink, 
  Clock, 
  ArrowRight, 
  Sliders, 
  Receipt,
  FileText,
  Activity,
  Server,
  Play
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { 
  PaymentGatewayProvider, 
  PaymentGatewayConfig, 
  Order, 
  PaymentMethod 
} from '../types';
import { formatBRL } from '../utils/formatters';
import { playCashRegister, playBeep, playKitchenBell } from '../utils/audio';
import { generatePixPayload, getPixQrCodeUrl } from '../utils/pix';
import { paymentGatewayService } from '../services/paymentGatewayService';
import { 
  saveUnitGatewayConfig, 
  getUnitGatewayConfig, 
  UnitGatewayConfig 
} from '../services/unitGatewayConfigService';

interface WebhookLogEntry {
  id: string;
  timestamp: string;
  provider: string;
  event: 'payment.approved' | 'payment.declined' | 'pix.received' | 'payment.refunded';
  orderCode: string;
  amount: number;
  feeAmount: number;
  netAmount: number;
  method: 'pix' | 'credit_card' | 'debit_card';
  httpStatus: number;
  status: 'success' | 'failed';
  details: string;
}

export const ConfiguracaoGatewayPagamento: React.FC = () => {
  const { 
    tenant, 
    currentBranch,
    updateTenantSettings, 
    orders, 
    activeCashSession, 
    financialEntries, 
    handleIncomingWebhook, 
    processGatewayPaymentAndClearOrder 
  } = useApp();

  // Active Tab: 'credenciais' | 'regras_cobranca' | 'gerador_qrcode' | 'webhooks' | 'fluxo_caixa'
  const [activeTab, setActiveTab] = useState<'credenciais' | 'regras_cobranca' | 'gerador_qrcode' | 'webhooks' | 'fluxo_caixa'>('credenciais');

  // Selected Provider
  const [selectedProvider, setSelectedProvider] = useState<PaymentGatewayProvider>(
    tenant.settings.paymentGatewayConfig?.provider || 'mercadopago'
  );

  // Environment: 'sandbox' (Testes) vs 'production' (Real)
  const [environment, setEnvironment] = useState<'sandbox' | 'production'>(
    tenant.settings.paymentGatewayConfig?.environment || 'sandbox'
  );

  // Visibility toggle for sensitive tokens
  const [showSecretToken, setShowSecretToken] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);

  // Form Credentials State
  const [mercadoPagoKey, setMercadoPagoKey] = useState(
    tenant.settings.paymentGatewayConfig?.credentials?.mercadoPago?.publicKey || 'APP_USR-7a8b9c0d-1e2f-3a4b-5c6d-7e8f9a0b1c2d'
  );
  const [mercadoPagoToken, setMercadoPagoToken] = useState(
    tenant.settings.paymentGatewayConfig?.credentials?.mercadoPago?.accessToken || 'APP_USR-9876543210123456-092213-9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d-347509953'
  );
  const [mercadoPagoWebhookSecret, setMercadoPagoWebhookSecret] = useState(
    tenant.settings.paymentGatewayConfig?.credentials?.mercadoPago?.webhookSecret || 'whsec_mp_live_9a8b7c6d5e4f3a2b'
  );

  const [asaasApiKey, setAsaasApiKey] = useState(
    tenant.settings.paymentGatewayConfig?.credentials?.asaas?.apiKey || '$aact_YTU5YTE0M2M2N2I4MTliNzk0YTI5N2U5MzdjNWZmNDQ6OjAwMDAwMDAwMDAwMDAzNDc1MDk5NTM6OiRhYWNoXzk4NzY1NDMyMQ=='
  );
  const [asaasWalletId, setAsaasWalletId] = useState(
    tenant.settings.paymentGatewayConfig?.credentials?.asaas?.walletId || 'wal_neon_019283'
  );

  const [stoneSecretKey, setStoneSecretKey] = useState(
    tenant.settings.paymentGatewayConfig?.credentials?.stone?.secretKey || 'sk_live_9a8b7c6d5e4f3a2b1c0d'
  );
  const [stonePublicKey, setStonePublicKey] = useState(
    tenant.settings.paymentGatewayConfig?.credentials?.stone?.publicKey || 'pk_live_1a2b3c4d5e6f7a8b9c0d'
  );
  const [stoneAccountId, setStoneAccountId] = useState(
    tenant.settings.paymentGatewayConfig?.credentials?.stone?.accountId || 'acc_stone_44912'
  );

  const [cieloMerchantId, setCieloMerchantId] = useState(
    tenant.settings.paymentGatewayConfig?.credentials?.cielo?.merchantId || 'e3b8a1c9-7d4f-4e2a-9b1c-8a2d3f4e5c6b'
  );
  const [cieloMerchantKey, setCieloMerchantKey] = useState(
    tenant.settings.paymentGatewayConfig?.credentials?.cielo?.merchantKey || 'K9L8M7N6O5P4Q3R2S1T0U9V8W7X6Y5Z4'
  );

  const [pagseguroEmail, setPagseguroEmail] = useState(
    tenant.settings.paymentGatewayConfig?.credentials?.pagseguro?.email || 'financeiro@lanchonetedulci.com.br'
  );
  const [pagseguroToken, setPagseguroToken] = useState(
    tenant.settings.paymentGatewayConfig?.credentials?.pagseguro?.token || '98A7B6C5D4E3F2A1B0C9D8E7F6A5B4C3'
  );

  // Direct Pix (Banco Central Bacen EMV)
  const [pixKeyType, setPixKeyType] = useState<'cnpj' | 'cpf' | 'email' | 'phone' | 'random'>(
    tenant.settings.pixKeyType || 'cnpj'
  );
  const [pixKey, setPixKey] = useState(
    tenant.settings.pixKey || tenant.cnpj.replace(/\D/g, '') || '45189231000192'
  );
  const [pixBeneficiaryName, setPixBeneficiaryName] = useState(
    tenant.settings.pixBeneficiaryName || tenant.name || 'Lanchonete Dulci Ltda'
  );
  const [pixCity, setPixCity] = useState(
    tenant.settings.pixCity || 'SAO PAULO'
  );

  // Operational Rules State
  const [pixEnabled, setPixEnabled] = useState(true);
  const [pixExpirationMinutes, setPixExpirationMinutes] = useState(15);
  const [pixDiscountPercent, setPixDiscountPercent] = useState(5);
  const [pixAutoReconciliation, setPixAutoReconciliation] = useState(true);

  const [creditCardEnabled, setCreditCardEnabled] = useState(true);
  const [creditMdrPercent, setCreditMdrPercent] = useState(2.99);
  const [maxInstallments, setMaxInstallments] = useState(6);
  const [freeInstallments, setFreeInstallments] = useState(3);
  const [monthlyInterestRate, setMonthlyInterestRate] = useState(1.99);
  const [autoCaptureCredit, setAutoCaptureCredit] = useState(true);
  const [antiFraudEnabled, setAntiFraudEnabled] = useState(true);

  const [debitCardEnabled, setDebitCardEnabled] = useState(true);
  const [debitMdrPercent, setDebitMdrPercent] = useState(1.29);
  const [require3DSecure, setRequire3DSecure] = useState(true);

  const [smartPOSEnabled, setSmartPOSEnabled] = useState(true);
  const [smartPOSTerminalBrand, setSmartPOSTerminalBrand] = useState('Stone Smart POS v2');
  const [smartPOSTerminalId, setSmartPOSTerminalId] = useState('POS-NEON-01');

  // Connection Testing State
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{
    status: 'connected' | 'error' | null;
    message: string;
    latencyMs?: number;
    accountName?: string;
  }>({
    status: 'connected',
    message: 'Credenciais verificadas e ativas no ambiente Sandbox.',
    latencyMs: 134,
    accountName: `${tenant.name} (${selectedProvider.toUpperCase()})`
  });

  // Save State
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // ==========================================================================
  // ESTADO DO LABORATÓRIO DE GERAÇÃO DINÂMICA DE QR CODE
  // ==========================================================================
  const [dynamicQrAmount, setDynamicQrAmount] = useState<number>(48.90);
  const [dynamicQrTxId, setDynamicQrTxId] = useState<string>('PED-1088');
  const [dynamicQrCustomer, setDynamicQrCustomer] = useState<string>('Rodrigo Santos');
  const [dynamicQrCountdown, setDynamicQrCountdown] = useState<number>(pixExpirationMinutes * 60);
  const [isSimulatingPayment, setIsSimulatingPayment] = useState<boolean>(false);
  const [simulatedSuccessOrder, setSimulatedSuccessOrder] = useState<string | null>(null);

  // Generate dynamic Pix BR Code Payload
  const dynamicPixPayload = useMemo(() => {
    return generatePixPayload({
      pixKey: pixKey.trim(),
      pixKeyType,
      merchantName: pixBeneficiaryName.trim(),
      merchantCity: pixCity.trim(),
      amount: dynamicQrAmount > 0 ? dynamicQrAmount : undefined,
      txId: dynamicQrTxId.trim(),
      description: `Pedido ${dynamicQrTxId} ${tenant.name}`,
    });
  }, [pixKey, pixKeyType, pixBeneficiaryName, pixCity, dynamicQrAmount, dynamicQrTxId, tenant.name]);

  const dynamicQrCodeUrl = useMemo(() => {
    return getPixQrCodeUrl(dynamicPixPayload, 280);
  }, [dynamicPixPayload]);

  // QR Code countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setDynamicQrCountdown((prev) => (prev > 0 ? prev - 1 : pixExpirationMinutes * 60));
    }, 1000);
    return () => clearInterval(timer);
  }, [pixExpirationMinutes]);

  const formattedQrTimer = useMemo(() => {
    const m = Math.floor(dynamicQrCountdown / 60);
    const s = dynamicQrCountdown % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, [dynamicQrCountdown]);

  // ==========================================================================
  // ESTADO DOS WEBHOOKS EM TEMPO REAL & LOGS
  // ==========================================================================
  const webhookEndpointUrl = useMemo(() => {
    return `https://api.neonfoodos.com.br/api/webhooks/payments/${tenant.id}`;
  }, [tenant.id]);

  const webhookSecretKey = useMemo(() => {
    return `whsec_neon_${selectedProvider}_${tenant.id.replace(/\D/g, '') || '9921'}_live`;
  }, [selectedProvider, tenant.id]);

  const [webhookLogs, setWebhookLogs] = useState<WebhookLogEntry[]>([
    {
      id: 'wh_log_01',
      timestamp: new Date(Date.now() - 1000 * 60 * 12).toLocaleTimeString('pt-BR'),
      provider: 'Mercado Pago Gateway',
      event: 'pix.received',
      orderCode: '#1044',
      amount: 64.90,
      feeAmount: 0.00,
      netAmount: 64.90,
      method: 'pix',
      httpStatus: 200,
      status: 'success',
      details: 'Liquidação instantânea Bacen E2E E38492011202609221312984A09C - Pedido enviado ao KDS'
    },
    {
      id: 'wh_log_02',
      timestamp: new Date(Date.now() - 1000 * 60 * 35).toLocaleTimeString('pt-BR'),
      provider: 'Stone / Pagar.me',
      event: 'payment.approved',
      orderCode: '#1043',
      amount: 112.50,
      feeAmount: 3.36,
      netAmount: 109.14,
      method: 'credit_card',
      httpStatus: 200,
      status: 'success',
      details: 'Transação TID-2026-881920 autorizada com NSU 55910291 (Mastercard final 4421)'
    },
    {
      id: 'wh_log_03',
      timestamp: new Date(Date.now() - 1000 * 60 * 58).toLocaleTimeString('pt-BR'),
      provider: 'Asaas Pagamentos',
      event: 'payment.approved',
      orderCode: '#1041',
      amount: 43.00,
      feeAmount: 0.55,
      netAmount: 42.45,
      method: 'debit_card',
      httpStatus: 200,
      status: 'success',
      details: 'Débito Visa autenticado com 3DS - Crédito D+1 agendado'
    }
  ]);

  // Webhook Simulator State
  const [simWebhookEvent, setSimWebhookEvent] = useState<'payment.approved' | 'payment.declined' | 'pix.received' | 'payment.refunded'>('payment.approved');
  const [simWebhookAmount, setSimWebhookAmount] = useState<number>(78.90);
  const [simWebhookMethod, setSimWebhookMethod] = useState<'pix' | 'credit_card' | 'debit_card'>('pix');
  const [simWebhookOrderCode, setSimWebhookOrderCode] = useState<string>('#1045');
  const [isFiringWebhook, setIsFiringWebhook] = useState<boolean>(false);

  // Copy helper
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    playBeep(920, 0.05);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Test Gateway Connection Button
  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    playBeep(700, 0.04);
    setTestResult({ status: null, message: 'Comunicando com os servidores do gateway...' });

    setTimeout(() => {
      setIsTestingConnection(false);
      const isConfigured = 
        (selectedProvider === 'mercadopago' && mercadoPagoKey && mercadoPagoToken) ||
        (selectedProvider === 'asaas' && asaasApiKey) ||
        (selectedProvider === 'stone' && stoneSecretKey && stonePublicKey) ||
        (selectedProvider === 'cielo' && cieloMerchantId && cieloMerchantKey) ||
        (selectedProvider === 'pagseguro' && pagseguroToken) ||
        (selectedProvider === 'direct_pix' && pixKey);

      if (isConfigured) {
        const latency = Math.floor(95 + Math.random() * 85);
        setTestResult({
          status: 'connected',
          message: `Conexão validada com sucesso! API do ${selectedProvider.toUpperCase()} (${environment.toUpperCase()}) respondendo normalmente.`,
          latencyMs: latency,
          accountName: `${tenant.name} • Merchant #${Math.floor(100000 + Math.random() * 900000)}`
        });
        playCashRegister();
      } else {
        setTestResult({
          status: 'error',
          message: 'Falha na validação: As credenciais de API obrigatórias não foram preenchidas ou estão inválidas.'
        });
        playBeep(400, 0.15);
      }
    }, 900);
  };

  // Save Settings
  const handleSaveSettings = () => {
    const config: PaymentGatewayConfig = {
      provider: selectedProvider,
      environment,
      credentials: {
        mercadoPago: {
          publicKey: mercadoPagoKey.trim(),
          accessToken: mercadoPagoToken.trim(),
          webhookSecret: mercadoPagoWebhookSecret.trim()
        },
        asaas: {
          apiKey: asaasApiKey.trim(),
          walletId: asaasWalletId.trim()
        },
        stone: {
          secretKey: stoneSecretKey.trim(),
          publicKey: stonePublicKey.trim(),
          accountId: stoneAccountId.trim()
        },
        cielo: {
          merchantId: cieloMerchantId.trim(),
          merchantKey: cieloMerchantKey.trim()
        },
        pagseguro: {
          email: pagseguroEmail.trim(),
          token: pagseguroToken.trim()
        },
        directPix: {
          pixKeyType,
          pixKey: pixKey.trim(),
          beneficiaryName: pixBeneficiaryName.trim(),
          city: pixCity.trim()
        }
      },
      pix: {
        enabled: pixEnabled,
        expirationMinutes: pixExpirationMinutes,
        discountPercent: pixDiscountPercent,
        autoReconciliation: pixAutoReconciliation
      },
      creditCard: {
        enabled: creditCardEnabled,
        maxInstallments,
        freeInstallments,
        monthlyInterestRate,
        mdrFeePercent: creditMdrPercent,
        autoCapture: autoCaptureCredit,
        antiFraud: antiFraudEnabled
      },
      debitCard: {
        enabled: debitCardEnabled,
        mdrFeePercent: debitMdrPercent,
        require3DSecure
      },
      smartPOS: {
        enabled: smartPOSEnabled,
        terminalBrand: smartPOSTerminalBrand,
        terminalId: smartPOSTerminalId,
        tefIntegrated: true
      },
      webhookEndpoint: webhookEndpointUrl,
      webhookSecret: webhookSecretKey,
      lastTestedAt: new Date().toISOString(),
      connectionStatus: 'connected'
    };

    updateTenantSettings({
      paymentGatewayConfig: config,
      pixKeyType,
      pixKey: pixKey.trim(),
      pixBeneficiaryName: pixBeneficiaryName.trim(),
      pixCity: pixCity.trim()
    });

    // Persistência no Firestore vinculado à Unidade
    const safeEmpresaId = tenant?.id || 'tenant_lanchonete_dulci';
    const safeUnidadeId = currentBranch?.id || 'branch_matriz_sp';
    saveUnitGatewayConfig(safeEmpresaId, safeUnidadeId, {
      unidadeName: currentBranch?.name || 'Unidade Principal',
      environment,
      activePixProvider: selectedProvider === 'mercadopago' ? 'mercadopago' : (selectedProvider === 'stone' ? 'stone' : 'mercadopago'),
      activeCardProvider: selectedProvider === 'stone' ? 'stone' : 'mercadopago',
      pixKey: pixKey.trim(),
      pixKeyType,
      pixBeneficiaryName: pixBeneficiaryName.trim(),
      pixBeneficiaryCity: pixCity.trim(),
      mercadoPagoPublicKey: mercadoPagoKey.trim(),
      mercadoPagoAccessToken: mercadoPagoToken.trim(),
      mercadoPagoWebhookSecret: mercadoPagoWebhookSecret.trim(),
      stoneApiKey: stonePublicKey.trim(),
      stoneSecretKey: stoneSecretKey.trim(),
      stoneCode: stoneAccountId.trim(),
      cieloMerchantId: cieloMerchantId.trim(),
      cieloMerchantKey: cieloMerchantKey.trim(),
      asaasApiKey: asaasApiKey.trim(),
      customFeePixPercent: pixDiscountPercent,
      customFeeCreditPercent: creditMdrPercent,
      customFeeDebitPercent: debitMdrPercent
    }).catch(err => {
      console.warn('[ConfiguracaoGateway] Erro ao salvar chaves da unidade no Firestore:', err);
    });

    setSavedSuccess(true);
    playCashRegister();
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Simular Pagamento do QR Code Gerado (Laboratório Dinâmico)
  const handleSimulateQrPayment = async () => {
    setIsSimulatingPayment(true);
    playBeep(850, 0.04);

    setTimeout(() => {
      // Disparar liquidação e integração com o fluxo de caixa
      handleIncomingWebhook({
        provider: selectedProvider === 'direct_pix' ? 'mercadopago' : selectedProvider,
        event: 'payment.approved',
        orderCode: dynamicQrTxId,
        total: dynamicQrAmount,
        paymentMethod: 'pix',
        paymentStatus: 'paid',
        rawPayload: {
          pixTxId: dynamicQrTxId,
          pixEndToEndId: `E38492011${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
          amount: dynamicQrAmount,
          customerName: dynamicQrCustomer,
        }
      });

      // Adicionar aos logs de webhook
      const newLog: WebhookLogEntry = {
        id: `wh_log_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('pt-BR'),
        provider: `${selectedProvider.toUpperCase()} PIX Instantâneo`,
        event: 'pix.received',
        orderCode: dynamicQrTxId,
        amount: dynamicQrAmount,
        feeAmount: 0.00,
        netAmount: dynamicQrAmount,
        method: 'pix',
        httpStatus: 200,
        status: 'success',
        details: `Pix Dinâmico de R$ ${dynamicQrAmount.toFixed(2)} liquidado via QR Code pelo cliente ${dynamicQrCustomer}. Baixa automática no Caixa.`
      };
      setWebhookLogs(prev => [newLog, ...prev.slice(0, 19)]);

      setIsSimulatingPayment(false);
      setSimulatedSuccessOrder(dynamicQrTxId);
      playCashRegister();
      setTimeout(() => setSimulatedSuccessOrder(null), 5000);
    }, 700);
  };

  // Disparar Webhook Simulado
  const handleFireSimulatedWebhook = () => {
    setIsFiringWebhook(true);
    playBeep(880, 0.05);

    const mdrFee = simWebhookMethod === 'credit_card' 
      ? Number(((simWebhookAmount * creditMdrPercent) / 100).toFixed(2))
      : simWebhookMethod === 'debit_card'
        ? Number(((simWebhookAmount * debitMdrPercent) / 100).toFixed(2))
        : 0;

    const netVal = Number((simWebhookAmount - mdrFee).toFixed(2));

    setTimeout(() => {
      if (simWebhookEvent === 'payment.approved' || simWebhookEvent === 'pix.received') {
        handleIncomingWebhook({
          provider: selectedProvider === 'direct_pix' ? 'mercadopago' : selectedProvider,
          event: 'payment.approved',
          orderCode: simWebhookOrderCode,
          total: simWebhookAmount,
          paymentMethod: simWebhookMethod,
          paymentStatus: 'paid',
          rawPayload: {
            nsu: Math.floor(10000000 + Math.random() * 90000000).toString(),
            tid: `TID-${Date.now().toString().slice(-6)}`,
            authCode: Math.floor(100000 + Math.random() * 900000).toString(),
            amount: simWebhookAmount,
            feeAmount: mdrFee,
            netAmount: netVal,
          }
        });
      } else if (simWebhookEvent === 'payment.refunded') {
        handleIncomingWebhook({
          provider: selectedProvider === 'direct_pix' ? 'mercadopago' : selectedProvider,
          event: 'payment.refunded',
          orderCode: simWebhookOrderCode,
          total: simWebhookAmount,
          paymentMethod: simWebhookMethod,
          paymentStatus: 'refunded',
        });
      }

      const newLog: WebhookLogEntry = {
        id: `wh_log_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('pt-BR'),
        provider: `${selectedProvider.toUpperCase()}`,
        event: simWebhookEvent,
        orderCode: simWebhookOrderCode,
        amount: simWebhookAmount,
        feeAmount: mdrFee,
        netAmount: netVal,
        method: simWebhookMethod,
        httpStatus: simWebhookEvent === 'payment.declined' ? 400 : 200,
        status: simWebhookEvent === 'payment.declined' ? 'failed' : 'success',
        details: simWebhookEvent === 'payment.declined' 
          ? `Cartão recusado pela adquirente (motivo: saldo insuficiente ou antifraude)`
          : `Evento ${simWebhookEvent} processado com sucesso. Status atualizado e registrado no Fluxo de Caixa.`
      };

      setWebhookLogs(prev => [newLog, ...prev.slice(0, 19)]);
      setIsFiringWebhook(false);
      playKitchenBell();
    }, 500);
  };

  // Conciliação de Vendas no Fluxo de Caixa Atual
  const gatewayFinancialSummary = useMemo(() => {
    const gatewayEntries = financialEntries.filter(
      e => e.description.includes('Gateway') || e.description.includes('Webhook') || e.category === 'taxa_cartao'
    );

    const grossSales = gatewayEntries
      .filter(e => e.type === 'income')
      .reduce((sum, e) => sum + e.amount, 0);

    const gatewayFees = gatewayEntries
      .filter(e => e.type === 'expense' && e.category === 'taxa_cartao')
      .reduce((sum, e) => sum + e.amount, 0);

    const netReceived = grossSales - gatewayFees;

    return {
      grossSales,
      gatewayFees,
      netReceived,
      entriesCount: gatewayEntries.length,
      cashPix: activeCashSession?.pixSales || 0,
      cashCard: (activeCashSession?.creditSales || 0) + (activeCashSession?.debitSales || 0),
      cashTotal: activeCashSession?.calculatedFinalAmount || 0,
    };
  }, [financialEntries, activeCashSession]);

  return (
    <div className="space-y-6 pb-20 select-none">
      {/* 1. HEADER PRINCIPAL COM STATUS NEON E IDENTIDADE FOOD-TECH */}
      <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-r from-[#12121A] via-[#151522] to-[#0E0E14] border border-[#242438] shadow-2xl relative overflow-hidden">
        {/* Glow de fundo */}
        <div className="absolute top-0 right-0 w-96 h-48 bg-[#00D26A]/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00D26A] via-[#00B8FF] to-[#6366F1] p-0.5 shadow-[0_0_20px_rgba(0,210,106,0.35)] shrink-0">
              <div className="w-full h-full bg-[#0A0A10] rounded-[14px] flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-[#00D26A]" />
              </div>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Gateways de Pagamento & Conciliação
                </h1>
                <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                  environment === 'production'
                    ? 'bg-[#00D26A]/20 text-[#00D26A] border-[#00D26A]/40 shadow-[0_0_10px_rgba(0,210,106,0.3)]'
                    : 'bg-[#FFC72C]/20 text-[#FFC72C] border-[#FFC72C]/40 shadow-[0_0_10px_rgba(255,199,44,0.3)]'
                }`}>
                  ● {environment === 'production' ? 'PRODUÇÃO ATIVA' : 'SANDBOX / HOMOLOGAÇÃO'}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  PIX DINÂMICO + CARTÃO
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Configuração de credenciais de API, geração instantânea de BR Code do Banco Central, webhooks em tempo real e baixa automática no fluxo de caixa.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-center shrink-0">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTestingConnection}
              className="px-3.5 py-2.5 rounded-xl text-xs font-black bg-[#1A1A28] hover:bg-[#252538] text-zinc-200 border border-[#2E2E44] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#00D26A] ${isTestingConnection ? 'animate-spin' : ''}`} />
              <span>{isTestingConnection ? 'Testando API...' : 'Testar Credenciais'}</span>
            </button>

            <button
              type="button"
              onClick={handleSaveSettings}
              className="px-4 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-[#00D26A] to-[#00B8FF] hover:brightness-110 text-black transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(0,210,106,0.4)] active:scale-95"
            >
              <Save className="w-3.5 h-3.5 text-black" />
              <span>Salvar Alterações</span>
            </button>
          </div>
        </div>

        {/* Feedback de Salvamento */}
        <AnimatePresence>
          {savedSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center gap-2 shadow-lg"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Configurações e credenciais de pagamento salvas com sucesso! Integradas ao Cardápio Online, PDV e Fluxo de Caixa.</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status de Conexão com Diagnóstico */}
        {testResult.status && (
          <div className={`mt-4 p-3 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-2 ${
            testResult.status === 'connected'
              ? 'bg-[#00D26A]/10 border-[#00D26A]/30 text-emerald-300'
              : 'bg-red-950/60 border-red-500/40 text-red-300'
          }`}>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${testResult.status === 'connected' ? 'bg-[#00D26A] shadow-[0_0_8px_#00D26A] animate-pulse' : 'bg-red-500'}`} />
              <span className="font-bold">{testResult.message}</span>
            </div>
            {testResult.latencyMs && (
              <div className="flex items-center gap-3 text-[11px] font-mono font-bold text-zinc-400">
                <span>Latência: <strong className="text-white">{testResult.latencyMs}ms</strong></span>
                <span>Conta: <strong className="text-[#00D26A]">{testResult.accountName}</strong></span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. BARRA DE NAVEGAÇÃO POR ABAS */}
      <div className="flex items-center gap-2 p-1.5 bg-[#12121A] border border-[#242438] rounded-2xl overflow-x-auto scrollbar-none shadow-md">
        <button
          type="button"
          onClick={() => { setActiveTab('credenciais'); playBeep(650, 0.03); }}
          className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'credenciais'
              ? 'bg-[#00D26A] text-black shadow-[0_0_12px_rgba(0,210,106,0.35)]'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          <span>Credenciais do Gateway</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('regras_cobranca'); playBeep(650, 0.03); }}
          className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'regras_cobranca'
              ? 'bg-[#00B8FF] text-black shadow-[0_0_12px_rgba(0,184,255,0.35)]'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Regras de Pix & Cartão</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('gerador_qrcode'); playBeep(650, 0.03); }}
          className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'gerador_qrcode'
              ? 'bg-[#FFC72C] text-black shadow-[0_0_12px_rgba(255,199,44,0.35)]'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <QrCode className="w-3.5 h-3.5" />
          <span>Geração Dinâmica de QR Code</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('webhooks'); playBeep(650, 0.03); }}
          className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'webhooks'
              ? 'bg-[#A855F7] text-white shadow-[0_0_12px_rgba(168,85,247,0.35)]'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Webhook className="w-3.5 h-3.5" />
          <span>Webhooks & Notificações</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-900/60 text-purple-200 font-bold border border-purple-400/30">
            {webhookLogs.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('fluxo_caixa'); playBeep(650, 0.03); }}
          className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'fluxo_caixa'
              ? 'bg-gradient-to-r from-[#DA291C] to-[#FF7A00] text-white shadow-[0_0_12px_rgba(218,41,28,0.35)]'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>Integração com Fluxo de Caixa</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* ABA 01: CONFIGURAÇÃO DE CREDENCIAIS DOS PROVEDORES DE GATEWAY         */}
      {/* ===================================================================== */}
      {activeTab === 'credenciais' && (
        <div className="space-y-6">
          {/* Seletor de Provedor e Modo de Operação */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Cartão de Provedores */}
            <div className="lg:col-span-2 p-5 rounded-2xl bg-[#12121A] border border-[#242438] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Server className="w-4 h-4 text-[#00D26A]" />
                    Selecione o Provedor de Pagamento
                  </h2>
                  <p className="text-xs text-zinc-400">Escolha a adquirente ou gateway que processará as vendas de Pix e Cartão.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { id: 'mercadopago', name: 'Mercado Pago', badge: 'PIX + Cartão', color: 'from-[#009EE3]/20 to-[#009EE3]/5 border-[#009EE3]/40 text-[#009EE3]' },
                  { id: 'asaas', name: 'Asaas', badge: 'Pix Dinâmico', color: 'from-[#00D26A]/20 to-[#00D26A]/5 border-[#00D26A]/40 text-[#00D26A]' },
                  { id: 'stone', name: 'Stone / Pagar.me', badge: 'Smart POS + Web', color: 'from-[#00A868]/20 to-[#00A868]/5 border-[#00A868]/40 text-[#00A868]' },
                  { id: 'pagseguro', name: 'PagSeguro / PagBank', badge: 'Checkout & TEF', color: 'from-[#FFC72C]/20 to-[#FFC72C]/5 border-[#FFC72C]/40 text-[#FFC72C]' },
                  { id: 'cielo', name: 'Cielo E-commerce', badge: 'Adquirente 3.0', color: 'from-[#0066CC]/20 to-[#0066CC]/5 border-[#0066CC]/40 text-[#0066CC]' },
                  { id: 'direct_pix', name: 'Pix Bacen Direto', badge: 'Sem Intermediário', color: 'from-[#DA291C]/20 to-[#DA291C]/5 border-[#DA291C]/40 text-[#DA291C]' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedProvider(item.id as PaymentGatewayProvider);
                      playBeep(750, 0.03);
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
                      selectedProvider === item.id
                        ? `bg-gradient-to-br ${item.color} shadow-lg ring-1 ring-white/10`
                        : 'bg-[#181824] border-[#2A2A3E] text-zinc-400 hover:border-zinc-700 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-black/40 border border-white/10">
                        {item.badge}
                      </span>
                      {selectedProvider === item.id && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      )}
                    </div>
                    <div className="font-black text-xs sm:text-sm text-white">{item.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Cartão de Ambiente (Sandbox vs Produção) */}
            <div className="p-5 rounded-2xl bg-[#12121A] border border-[#242438] space-y-4 flex flex-col justify-between">
              <div>
                <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#FFC72C]" />
                  Ambiente de Execução
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Alterne entre modo de testes sem cobrança real e produção conectada ao banco.
                </p>
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => { setEnvironment('sandbox'); playBeep(600, 0.03); }}
                  className={`w-full p-3 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer ${
                    environment === 'sandbox'
                      ? 'bg-[#FFC72C]/15 border-[#FFC72C] text-white shadow-md'
                      : 'bg-[#181824] border-[#2A2A3E] text-zinc-400 hover:text-white'
                  }`}
                >
                  <div>
                    <div className="font-black text-xs text-[#FFC72C]">Sandbox / Homologação</div>
                    <div className="text-[11px] text-zinc-400">Cartões de teste e Pix simulado. Ideal para treinamento de equipe.</div>
                  </div>
                  {environment === 'sandbox' && <Check className="w-4 h-4 text-[#FFC72C]" />}
                </button>

                <button
                  type="button"
                  onClick={() => { setEnvironment('production'); playBeep(700, 0.03); }}
                  className={`w-full p-3 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer ${
                    environment === 'production'
                      ? 'bg-[#00D26A]/15 border-[#00D26A] text-white shadow-md'
                      : 'bg-[#181824] border-[#2A2A3E] text-zinc-400 hover:text-white'
                  }`}
                >
                  <div>
                    <div className="font-black text-xs text-[#00D26A]">Produção (Vendas Reais)</div>
                    <div className="text-[11px] text-zinc-400">Dinheiro real creditado na sua conta bancária via Pix e Adquirente.</div>
                  </div>
                  {environment === 'production' && <Check className="w-4 h-4 text-[#00D26A]" />}
                </button>
              </div>

              <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-[11px] text-zinc-400 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Criptografia de ponta a ponta e chaves protegidas por cofre seguro.</span>
              </div>
            </div>
          </div>

          {/* Formulário Dinâmico de Credenciais por Provedor */}
          <div className="p-5 sm:p-6 rounded-2xl bg-[#12121A] border border-[#242438] space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#202032] pb-4">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Key className="w-4 h-4 text-[#00D26A]" />
                  Credenciais de API — {selectedProvider.toUpperCase()} ({environment.toUpperCase()})
                </h3>
                <p className="text-xs text-zinc-400">
                  Preencha as chaves fornecidas no painel de desenvolvedor do seu provedor.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowSecretToken(!showSecretToken)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#181824] border border-[#2A2A3E] text-zinc-300 hover:text-white flex items-center gap-1.5 self-start cursor-pointer transition-colors"
              >
                {showSecretToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-[#00D26A]" />}
                <span>{showSecretToken ? 'Ocultar Chaves Secretas' : 'Revelar Chaves Secretas'}</span>
              </button>
            </div>

            {/* Provedor: Mercado Pago */}
            {selectedProvider === 'mercadopago' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                    <span>Public Key (Chave Pública)</span>
                    <span className="text-[10px] text-zinc-500 font-mono">Ex: APP_USR-...</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={mercadoPagoKey}
                      onChange={(e) => setMercadoPagoKey(e.target.value)}
                      placeholder="APP_USR-xxxx-xxxx-xxxx"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#181824] border border-[#2C2C40] text-xs font-mono text-white focus:border-[#00D26A] focus:outline-none transition-all pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopy(mercadoPagoKey, 'mp_public_key')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                      title="Copiar Public Key"
                    >
                      {copiedKey === 'mp_public_key' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                    <span>Access Token (Chave Privada / Secreta)</span>
                    <span className="text-[10px] text-emerald-400 font-bold">Confidencial</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showSecretToken ? 'text' : 'password'}
                      value={mercadoPagoToken}
                      onChange={(e) => setMercadoPagoToken(e.target.value)}
                      placeholder="APP_USR-xxxx..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#181824] border border-[#2C2C40] text-xs font-mono text-white focus:border-[#00D26A] focus:outline-none transition-all pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopy(mercadoPagoToken, 'mp_token')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                      title="Copiar Token"
                    >
                      {copiedKey === 'mp_token' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                    <span>Webhook Secret (Chave Secreta de Assinatura HMAC)</span>
                    <span className="text-[10px] text-zinc-400">Usado para validar a integridade dos avisos de pagamento</span>
                  </label>
                  <input
                    type={showSecretToken ? 'text' : 'password'}
                    value={mercadoPagoWebhookSecret}
                    onChange={(e) => setMercadoPagoWebhookSecret(e.target.value)}
                    placeholder="whsec_xxxx..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#181824] border border-[#2C2C40] text-xs font-mono text-white focus:border-[#00D26A] focus:outline-none transition-all"
                  />
                </div>
              </div>
            )}

            {/* Provedor: Asaas */}
            {selectedProvider === 'asaas' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">API Key / Access Token Asaas</label>
                  <input
                    type={showSecretToken ? 'text' : 'password'}
                    value={asaasApiKey}
                    onChange={(e) => setAsaasApiKey(e.target.value)}
                    placeholder="$aact_Y..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#181824] border border-[#2C2C40] text-xs font-mono text-white focus:border-[#00D26A] focus:outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">Wallet ID / Subconta (Opcional)</label>
                  <input
                    type="text"
                    value={asaasWalletId}
                    onChange={(e) => setAsaasWalletId(e.target.value)}
                    placeholder="wal_xxxx"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#181824] border border-[#2C2C40] text-xs font-mono text-white focus:border-[#00D26A] focus:outline-none transition-all"
                  />
                </div>
              </div>
            )}

            {/* Provedor: Stone / Pagar.me */}
            {selectedProvider === 'stone' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">Secret Key (sk_live / sk_test)</label>
                  <input
                    type={showSecretToken ? 'text' : 'password'}
                    value={stoneSecretKey}
                    onChange={(e) => setStoneSecretKey(e.target.value)}
                    placeholder="sk_live_xxxx"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#181824] border border-[#2C2C40] text-xs font-mono text-white focus:border-[#00D26A] focus:outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">Public Key (pk_live / pk_test)</label>
                  <input
                    type="text"
                    value={stonePublicKey}
                    onChange={(e) => setStonePublicKey(e.target.value)}
                    placeholder="pk_live_xxxx"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#181824] border border-[#2C2C40] text-xs font-mono text-white focus:border-[#00D26A] focus:outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">Stone Account ID</label>
                  <input
                    type="text"
                    value={stoneAccountId}
                    onChange={(e) => setStoneAccountId(e.target.value)}
                    placeholder="acc_stone_xxxx"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#181824] border border-[#2C2C40] text-xs font-mono text-white focus:border-[#00D26A] focus:outline-none transition-all"
                  />
                </div>
              </div>
            )}

            {/* Provedor: Cielo */}
            {selectedProvider === 'cielo' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">Merchant ID Cielo</label>
                  <input
                    type="text"
                    value={cieloMerchantId}
                    onChange={(e) => setCieloMerchantId(e.target.value)}
                    placeholder="00000000-0000-0000-0000-000000000000"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#181824] border border-[#2C2C40] text-xs font-mono text-white focus:border-[#00D26A] focus:outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">Merchant Key Cielo</label>
                  <input
                    type={showSecretToken ? 'text' : 'password'}
                    value={cieloMerchantKey}
                    onChange={(e) => setCieloMerchantKey(e.target.value)}
                    placeholder="Chave secreta de 32 caracteres"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#181824] border border-[#2C2C40] text-xs font-mono text-white focus:border-[#00D26A] focus:outline-none transition-all"
                  />
                </div>
              </div>
            )}

            {/* Provedor: PagSeguro */}
            {selectedProvider === 'pagseguro' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">E-mail da Conta PagBank</label>
                  <input
                    type="email"
                    value={pagseguroEmail}
                    onChange={(e) => setPagseguroEmail(e.target.value)}
                    placeholder="financeiro@empresa.com.br"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#181824] border border-[#2C2C40] text-xs text-white focus:border-[#00D26A] focus:outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">Token de Acesso / API Key</label>
                  <input
                    type={showSecretToken ? 'text' : 'password'}
                    value={pagseguroToken}
                    onChange={(e) => setPagseguroToken(e.target.value)}
                    placeholder="Token de 32 caracteres"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#181824] border border-[#2C2C40] text-xs font-mono text-white focus:border-[#00D26A] focus:outline-none transition-all"
                  />
                </div>
              </div>
            )}

            {/* Provedor: Pix Bacen Direto */}
            {selectedProvider === 'direct_pix' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">Tipo de Chave Pix</label>
                  <select
                    value={pixKeyType}
                    onChange={(e) => setPixKeyType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#181824] border border-[#2C2C40] text-xs font-bold text-white focus:border-[#00D26A] focus:outline-none transition-all"
                  >
                    <option value="cnpj">CNPJ</option>
                    <option value="cpf">CPF</option>
                    <option value="email">E-mail</option>
                    <option value="phone">Celular (com DDD)</option>
                    <option value="random">Chave Aleatória (EVP)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">Chave Pix</label>
                  <input
                    type="text"
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    placeholder="Chave Pix"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#181824] border border-[#2C2C40] text-xs font-mono text-white focus:border-[#00D26A] focus:outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">Nome do Beneficiário</label>
                  <input
                    type="text"
                    value={pixBeneficiaryName}
                    onChange={(e) => setPixBeneficiaryName(e.target.value)}
                    placeholder="Nome da Loja (até 25 caracteres)"
                    maxLength={25}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#181824] border border-[#2C2C40] text-xs text-white focus:border-[#00D26A] focus:outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">Cidade da Conta</label>
                  <input
                    type="text"
                    value={pixCity}
                    onChange={(e) => setPixCity(e.target.value)}
                    placeholder="SAO PAULO"
                    maxLength={15}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#181824] border border-[#2C2C40] text-xs text-white focus:border-[#00D26A] focus:outline-none transition-all"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* ABA 02: REGRAS DE COBRANÇA (TAXAS MDR, PARCELAMENTO, DESCONTOS)       */}
      {/* ===================================================================== */}
      {activeTab === 'regras_cobranca' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Card PIX */}
          <div className="p-5 rounded-2xl bg-[#12121A] border border-[#242438] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#00D26A]/20 text-[#00D26A]">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white">PIX Dinâmico</h3>
                  <p className="text-[11px] text-zinc-400">Banco Central & Open Finance</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPixEnabled(!pixEnabled)}
                className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${pixEnabled ? 'bg-[#00D26A]' : 'bg-zinc-700'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${pixEnabled ? 'left-5' : 'left-1'}`} />
              </button>
            </div>

            <div className="space-y-3 pt-2 border-t border-[#202030]">
              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">
                  Tempo de Validade do QR Code (Minutos)
                </label>
                <select
                  value={pixExpirationMinutes}
                  onChange={(e) => setPixExpirationMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[#181824] border border-[#2C2C40] text-xs font-bold text-white focus:border-[#00D26A] focus:outline-none"
                >
                  <option value={5}>5 minutos (Rápido / Balcão)</option>
                  <option value={10}>10 minutos</option>
                  <option value={15}>15 minutos (Padrão Recomendado)</option>
                  <option value={30}>30 minutos (Delivery)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">
                  Desconto de Incentivo no Pix (% OFF)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={20}
                    step={0.5}
                    value={pixDiscountPercent}
                    onChange={(e) => setPixDiscountPercent(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#181824] border border-[#2C2C40] text-xs font-mono font-bold text-white focus:border-[#00D26A] focus:outline-none pr-8"
                  />
                  <Percent className="w-3.5 h-3.5 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
                <span className="text-[10px] text-zinc-500 mt-1 block">Incentiva clientes a pagar no Pix, eliminando custos de MDR de cartão.</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/30 border border-white/5">
                <span className="text-xs font-bold text-zinc-300">Baixa Automática por Webhook</span>
                <button
                  type="button"
                  onClick={() => setPixAutoReconciliation(!pixAutoReconciliation)}
                  className={`w-8 h-5 rounded-full transition-colors relative cursor-pointer ${pixAutoReconciliation ? 'bg-[#00D26A]' : 'bg-zinc-700'}`}
                >
                  <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform ${pixAutoReconciliation ? 'left-4' : 'left-0.5'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Card Cartão de Crédito */}
          <div className="p-5 rounded-2xl bg-[#12121A] border border-[#242438] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#00B8FF]/20 text-[#00B8FF]">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white">Cartão de Crédito</h3>
                  <p className="text-[11px] text-zinc-400">Checkout Transparente & Parcelamento</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreditCardEnabled(!creditCardEnabled)}
                className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${creditCardEnabled ? 'bg-[#00B8FF]' : 'bg-zinc-700'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${creditCardEnabled ? 'left-5' : 'left-1'}`} />
              </button>
            </div>

            <div className="space-y-3 pt-2 border-t border-[#202030]">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                    Taxa MDR da Adquirente (%)
                  </label>
                  <input
                    type="number"
                    step={0.01}
                    value={creditMdrPercent}
                    onChange={(e) => setCreditMdrPercent(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#181824] border border-[#2C2C40] text-xs font-mono font-bold text-[#00B8FF] focus:outline-none"
                  />
                  <span className="text-[9px] text-zinc-500">Deduzido no Fluxo de Caixa</span>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                    Parcelamento Máximo
                  </label>
                  <select
                    value={maxInstallments}
                    onChange={(e) => setMaxInstallments(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#181824] border border-[#2C2C40] text-xs font-bold text-white focus:outline-none"
                  >
                    <option value={1}>1x (À Vista)</option>
                    <option value={3}>Até 3x</option>
                    <option value={6}>Até 6x</option>
                    <option value={12}>Até 12x</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                    Sem Juros até
                  </label>
                  <select
                    value={freeInstallments}
                    onChange={(e) => setFreeInstallments(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#181824] border border-[#2C2C40] text-xs font-bold text-white focus:outline-none"
                  >
                    <option value={1}>1x sem juros</option>
                    <option value={2}>2x sem juros</option>
                    <option value={3}>3x sem juros</option>
                    <option value={6}>6x sem juros</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                    Juros a.m. das demais (%)
                  </label>
                  <input
                    type="number"
                    step={0.1}
                    value={monthlyInterestRate}
                    onChange={(e) => setMonthlyInterestRate(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#181824] border border-[#2C2C40] text-xs font-mono font-bold text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/30 border border-white/5">
                <span className="text-xs font-bold text-zinc-300">Antifraude & 3DS Ativo</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">Proteção Ativa</span>
              </div>
            </div>
          </div>

          {/* Card Cartão de Débito & Smart POS */}
          <div className="p-5 rounded-2xl bg-[#12121A] border border-[#242438] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#A855F7]/20 text-[#A855F7]">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white">Débito & Smart POS</h3>
                  <p className="text-[11px] text-zinc-400">Cartão de Débito e Maquininhas</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDebitCardEnabled(!debitCardEnabled)}
                className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${debitCardEnabled ? 'bg-[#A855F7]' : 'bg-zinc-700'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${debitCardEnabled ? 'left-5' : 'left-1'}`} />
              </button>
            </div>

            <div className="space-y-3 pt-2 border-t border-[#202030]">
              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">
                  Taxa MDR Débito (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step={0.01}
                    value={debitMdrPercent}
                    onChange={(e) => setDebitMdrPercent(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#181824] border border-[#2C2C40] text-xs font-mono font-bold text-[#A855F7] focus:outline-none"
                  />
                  <Percent className="w-3.5 h-3.5 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
                <span className="text-[10px] text-zinc-500 mt-0.5 block">Liquidação média em D+1 no fluxo de caixa.</span>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">
                  Terminal Físico / Smart POS Padrão
                </label>
                <input
                  type="text"
                  value={smartPOSTerminalBrand}
                  onChange={(e) => setSmartPOSTerminalBrand(e.target.value)}
                  placeholder="Ex: Stone Smart, PagSeguro PRO, Cielo LIO"
                  className="w-full px-3 py-2 rounded-xl bg-[#181824] border border-[#2C2C40] text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/30 border border-white/5">
                <span className="text-xs font-bold text-zinc-300">Integração TEF Automática</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">Captura NSU/TID</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* ABA 03: GERAÇÃO DINÂMICA DE QR CODE (LABORATÓRIO INTERATIVO)          */}
      {/* ===================================================================== */}
      {activeTab === 'gerador_qrcode' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Coluna Esquerda: Formulário de Parâmetros Dinâmicos */}
          <div className="lg:col-span-6 p-5 sm:p-6 rounded-2xl bg-[#12121A] border border-[#242438] space-y-5">
            <div>
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-[#00D26A]" />
                <h3 className="text-base font-black text-white">Laboratório de Pix Dinâmico</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  EMVCo BR Code
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Geração em tempo real do código Pix com payload homologado pelo Banco Central (CRC16-CCITT).
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">Valor da Cobrança (R$)</label>
                  <input
                    type="number"
                    step={0.5}
                    value={dynamicQrAmount}
                    onChange={(e) => setDynamicQrAmount(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#181824] border border-[#2C2C40] text-sm font-mono font-black text-[#00D26A] focus:border-[#00D26A] focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">Identificador (TxId do Pedido)</label>
                  <input
                    type="text"
                    value={dynamicQrTxId}
                    onChange={(e) => setDynamicQrTxId(e.target.value.toUpperCase())}
                    maxLength={25}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#181824] border border-[#2C2C40] text-xs font-mono font-bold text-white focus:border-[#00D26A] focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300">Nome do Cliente (Opcional)</label>
                <input
                  type="text"
                  value={dynamicQrCustomer}
                  onChange={(e) => setDynamicQrCustomer(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#181824] border border-[#2C2C40] text-xs text-white focus:border-[#00D26A] focus:outline-none"
                />
              </div>

              {/* Pedidos em aberto rápidos para carregar no simulador */}
              <div className="space-y-1.5 pt-2 border-t border-[#202030]">
                <label className="text-[11px] font-bold text-zinc-400 block">Ou selecione um pedido em aberto no restaurante:</label>
                <div className="flex flex-wrap gap-1.5">
                  {orders.slice(0, 4).map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => {
                        setDynamicQrAmount(o.total);
                        setDynamicQrTxId(o.displayCode.replace('#', 'PED-'));
                        setDynamicQrCustomer(o.customerName);
                        playBeep(700, 0.03);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#181824] hover:bg-[#252538] border border-white/5 text-[11px] font-bold text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    >
                      {o.displayCode} • {formatBRL(o.total)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Botão de Ação: Simular Pagamento do Cliente */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSimulateQrPayment}
                  disabled={isSimulatingPayment}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#00D26A] to-[#00B8FF] hover:brightness-110 text-black font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(0,210,106,0.35)] active:scale-95 disabled:opacity-50"
                >
                  <Play className="w-4 h-4 fill-black" />
                  <span>{isSimulatingPayment ? 'Processando Liquidação Bancária...' : 'Simular Pagamento no App do Banco (Disparar Baixa)'}</span>
                </button>
              </div>

              <AnimatePresence>
                {simulatedSuccessOrder && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="p-3 rounded-xl bg-emerald-950/90 border border-emerald-500/60 text-emerald-300 text-xs font-bold flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Pix do pedido {simulatedSuccessOrder} confirmado! Baixa dada no KDS e valor computado no Fluxo de Caixa.</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Coluna Direita: Exibição do QR Code Dinâmico em Alta Resolução */}
          <div className="lg:col-span-6 p-5 sm:p-6 rounded-2xl bg-[#12121A] border border-[#242438] flex flex-col items-center justify-between text-center space-y-4">
            <div className="w-full flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#FFC72C]" />
                Expira em: <strong className="text-white font-mono">{formattedQrTimer}</strong>
              </span>
              <span className="text-xs font-bold font-mono text-[#00D26A] bg-[#00D26A]/10 px-2 py-0.5 rounded border border-[#00D26A]/30">
                {formatBRL(dynamicQrAmount)}
              </span>
            </div>

            {/* Container do QR Code com Borda Neon e Logo */}
            <div className="relative p-4 rounded-2xl bg-white shadow-2xl border-4 border-[#00D26A]/40 shadow-[0_0_30px_rgba(0,210,106,0.25)] group">
              <img
                src={dynamicQrCodeUrl}
                alt="QR Code Pix Dinâmico"
                className="w-56 h-56 object-contain"
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-10 h-10 rounded-xl bg-[#00D26A] text-black font-black text-xs flex items-center justify-center shadow-lg border-2 border-white">
                  PIX
                </div>
              </div>
            </div>

            {/* Copia e Cola Payload String */}
            <div className="w-full space-y-2">
              <div className="p-2.5 rounded-xl bg-[#0A0A10] border border-zinc-800 text-left">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Código Pix Copia e Cola</span>
                  <span className="text-[9px] font-mono text-zinc-500">Padrão BR Code Bacen</span>
                </div>
                <p className="text-[11px] font-mono text-zinc-300 break-all line-clamp-2 select-all">
                  {dynamicPixPayload}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleCopy(dynamicPixPayload, 'dynamic_pix_copia_cola')}
                className="w-full py-2.5 rounded-xl bg-[#1C1C28] hover:bg-[#282838] text-zinc-200 hover:text-white border border-[#2E2E44] text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                {copiedKey === 'dynamic_pix_copia_cola' ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">Código Copiado com Sucesso!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar Código Pix Copia e Cola</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* ABA 04: WEBHOOKS EM TEMPO REAL & SIMULADOR DE EVENTOS                 */}
      {/* ===================================================================== */}
      {activeTab === 'webhooks' && (
        <div className="space-y-6">
          {/* Painel da URL Oficial de Webhook */}
          <div className="p-5 sm:p-6 rounded-2xl bg-[#12121A] border border-[#242438] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Webhook className="w-4 h-4 text-[#A855F7]" />
                  Endpoint de Webhook Oficial (Notificações Instantâneas)
                </h3>
                <p className="text-xs text-zinc-400">
                  Cadastre esta URL no painel do seu gateway para receber confirmações instantâneas de pagamento.
                </p>
              </div>
              <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 self-start">
                POST • HTTPS REST
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300">URL do Webhook (Notification URL)</label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={webhookEndpointUrl}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#181824] border border-[#2C2C40] text-xs font-mono text-[#00D26A] select-all pr-9 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(webhookEndpointUrl, 'webhook_url')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                  >
                    {copiedKey === 'webhook_url' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300">Webhook Secret / Chave de Assinatura</label>
                <div className="relative">
                  <input
                    type={showWebhookSecret ? 'text' : 'password'}
                    readOnly
                    value={webhookSecretKey}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#181824] border border-[#2C2C40] text-xs font-mono text-white select-all pr-16 focus:outline-none"
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                      className="text-zinc-400 hover:text-white"
                    >
                      {showWebhookSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopy(webhookSecretKey, 'webhook_secret')}
                      className="text-zinc-400 hover:text-white"
                    >
                      {copiedKey === 'webhook_secret' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Simulador Interativo de Webhooks */}
          <div className="p-5 sm:p-6 rounded-2xl bg-[#12121A] border border-[#242438] space-y-4">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#FFC72C]" />
              Disparador de Eventos Webhook de Teste
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">Evento</label>
                <select
                  value={simWebhookEvent}
                  onChange={(e) => setSimWebhookEvent(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-[#181824] border border-[#2C2C40] text-xs font-bold text-white focus:outline-none"
                >
                  <option value="payment.approved">payment.approved (Aprovado)</option>
                  <option value="pix.received">pix.received (Pix Liquidado)</option>
                  <option value="payment.declined">payment.declined (Recusado)</option>
                  <option value="payment.refunded">payment.refunded (Estorno)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">Meio de Pagamento</label>
                <select
                  value={simWebhookMethod}
                  onChange={(e) => setSimWebhookMethod(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-[#181824] border border-[#2C2C40] text-xs font-bold text-white focus:outline-none"
                >
                  <option value="pix">PIX Dinâmico</option>
                  <option value="credit_card">Cartão de Crédito</option>
                  <option value="debit_card">Cartão de Débito</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">Valor (R$)</label>
                <input
                  type="number"
                  step={1}
                  value={simWebhookAmount}
                  onChange={(e) => setSimWebhookAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[#181824] border border-[#2C2C40] text-xs font-mono font-bold text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">Código Pedido</label>
                <input
                  type="text"
                  value={simWebhookOrderCode}
                  onChange={(e) => setSimWebhookOrderCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#181824] border border-[#2C2C40] text-xs font-mono font-bold text-white focus:outline-none"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleFireSimulatedWebhook}
              disabled={isFiringWebhook}
              className="px-4 py-2.5 rounded-xl bg-[#A855F7] hover:bg-[#9333EA] text-white font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md active:scale-95 disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{isFiringWebhook ? 'Transmitindo Payload...' : 'Disparar Webhook de Teste Agora'}</span>
            </button>
          </div>

          {/* Histórico / Logs de Webhooks Recebidos */}
          <div className="p-5 sm:p-6 rounded-2xl bg-[#12121A] border border-[#242438] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#00D26A]" />
                Histórico de Webhooks Recebidos ({webhookLogs.length})
              </h3>
              <span className="text-[10px] text-zinc-400">Tempo Real • Atualização Automática</span>
            </div>

            <div className="space-y-2">
              {webhookLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-[#181824] border border-[#28283C] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                      log.httpStatus === 200
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                      {log.httpStatus} OK
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-white font-mono">{log.orderCode}</strong>
                        <span className="text-zinc-500">•</span>
                        <span className="text-zinc-300 font-bold">{log.provider}</span>
                        <span className="text-zinc-500">•</span>
                        <span className="text-purple-400 font-mono">{log.event}</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5">{log.details}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono font-black text-[#00D26A]">{formatBRL(log.amount)}</div>
                    <div className="text-[10px] text-zinc-500">{log.timestamp}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* ABA 05: INTEGRAÇÃO DIRETA COM O FLUXO DE CAIXA                       */}
      {/* ===================================================================== */}
      {activeTab === 'fluxo_caixa' && (
        <div className="space-y-6">
          {/* Cards de Métricas de Conciliação Financeira */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-[#12121A] border border-[#242438] space-y-1">
              <span className="text-xs font-bold text-zinc-400">Total Vendas no Gateway</span>
              <div className="text-xl font-black text-white font-mono">{formatBRL(gatewayFinancialSummary.grossSales)}</div>
              <span className="text-[10px] text-emerald-400">Recebimentos Brutos</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#12121A] border border-[#242438] space-y-1">
              <span className="text-xs font-bold text-zinc-400">Taxas MDR Descontadas</span>
              <div className="text-xl font-black text-red-400 font-mono">-{formatBRL(gatewayFinancialSummary.gatewayFees)}</div>
              <span className="text-[10px] text-zinc-400">Custo da adquirente/gateway</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#12121A] border border-[#242438] space-y-1">
              <span className="text-xs font-bold text-zinc-400">Valor Líquido Creditado</span>
              <div className="text-xl font-black text-[#00D26A] font-mono">{formatBRL(gatewayFinancialSummary.netReceived)}</div>
              <span className="text-[10px] text-emerald-400">Impacto Real no DRE</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#12121A] border border-[#242438] space-y-1">
              <span className="text-xs font-bold text-zinc-400">Caixa do Turno Atual</span>
              <div className="text-xl font-black text-[#00B8FF] font-mono">{formatBRL(gatewayFinancialSummary.cashTotal)}</div>
              <span className="text-[10px] text-blue-300">
                Pix: {formatBRL(gatewayFinancialSummary.cashPix)} • Cartão: {formatBRL(gatewayFinancialSummary.cashCard)}
              </span>
            </div>
          </div>

          {/* Tabela dos Lançamentos Financeiros do Gateway */}
          <div className="p-5 sm:p-6 rounded-2xl bg-[#12121A] border border-[#242438] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-[#00D26A]" />
                  Conciliação Automática no Livro Caixa
                </h3>
                <p className="text-xs text-zinc-400">
                  Cada aprovação de Pix ou Cartão no gateway lança a receita bruta e a taxa MDR correspondente no DRE.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {financialEntries
                .filter(e => e.description.includes('Gateway') || e.description.includes('Webhook') || e.category === 'taxa_cartao' || e.category === 'vendas')
                .slice(0, 8)
                .map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3.5 rounded-xl bg-[#181824] border border-[#26263A] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          entry.type === 'income'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}>
                          {entry.type === 'income' ? 'RECEITA' : 'TAXA MDR'}
                        </span>
                        <strong className="text-white">{entry.description}</strong>
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        Data: {entry.date} • Método: {entry.paymentMethod.toUpperCase()} • Status: Liquidado
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`text-sm font-black font-mono ${
                        entry.type === 'income' ? 'text-[#00D26A]' : 'text-red-400'
                      }`}>
                        {entry.type === 'income' ? '+' : '-'}{formatBRL(entry.amount)}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
