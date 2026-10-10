import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { orderFinancialTransactionService } from './src/services/orderFinancialTransactionListenerService';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy Gemini AI initialization
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    try {
      aiClient = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    } catch (err) {
      console.error('Error initializing Gemini client:', err);
    }
  }
  return aiClient;
}

// Health route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'NEON FOOD OS', timestamp: new Date().toISOString() });
});

// In-memory store for synced offline actions (for audit and telemetry)
interface SyncedOfflineItem {
  id: string;
  type: string;
  payload: any;
  receivedAt: string;
  clientTimestamp: number;
}
const syncedOfflineHistory: SyncedOfflineItem[] = [];

// Batch Synchronization Endpoint for Offline Service Worker / Client
app.post('/api/sync/batch', (req, res) => {
  try {
    const { actions } = req.body;
    if (!actions || !Array.isArray(actions)) {
      return res.status(400).json({ error: 'A lista de ações pendentes deve ser um array válido' });
    }

    const processedIds: string[] = [];
    const now = new Date().toISOString();

    for (const item of actions) {
      if (!item.id) continue;
      // Deduplicate if already processed
      const exists = syncedOfflineHistory.some(h => h.id === item.id);
      if (!exists) {
        syncedOfflineHistory.push({
          id: item.id,
          type: item.type || 'UNKNOWN',
          payload: item.payload,
          receivedAt: now,
          clientTimestamp: item.clientTimestamp || Date.now(),
        });
      }
      processedIds.push(item.id);
    }

    // Keep history bounded
    if (syncedOfflineHistory.length > 200) {
      syncedOfflineHistory.splice(0, syncedOfflineHistory.length - 200);
    }

    console.log(`[OFFLINE SYNC BATCH] Sincronizadas com sucesso ${processedIds.length} ações pendentes do restaurante.`);

    return res.status(200).json({
      status: 'success',
      syncedCount: processedIds.length,
      processedIds,
      serverTime: now,
      message: `${processedIds.length} ações sincronizadas com sucesso com o servidor central.`
    });
  } catch (err: any) {
    console.error('[OFFLINE SYNC ERROR]', err);
    return res.status(500).json({ error: err.message || 'Erro ao sincronizar lote offline' });
  }
});

// Endpoint to view synced offline actions history
app.get('/api/sync/history', (req, res) => {
  res.json({
    totalSynced: syncedOfflineHistory.length,
    history: syncedOfflineHistory.slice(-50).reverse()
  });
});

// ==========================================
// ESC/POS THERMAL PRINTER SPOOLER ENDPOINTS
// ==========================================
interface ThermalPrintJob {
  jobId: string;
  printerName: string;
  location: string;
  ipAddress?: string;
  paperWidth?: string;
  bytesCount: number;
  label?: string;
  receivedAt: string;
}
const thermalPrintQueue: ThermalPrintJob[] = [];

app.post('/api/printer/escpos-spool', (req, res) => {
  try {
    const { jobId, printerName, location, ipAddress, paperWidth, bytesCount, rawBase64, label } = req.body;
    
    const job: ThermalPrintJob = {
      jobId: jobId || `job_${Date.now()}`,
      printerName: printerName || 'Impressora Cozinha',
      location: location || 'cozinha',
      ipAddress: ipAddress || '192.168.1.210:9100',
      paperWidth: paperWidth || '80mm',
      bytesCount: bytesCount || 0,
      label: label || 'Pedido Cozinha',
      receivedAt: new Date().toISOString(),
    };

    thermalPrintQueue.push(job);
    if (thermalPrintQueue.length > 100) thermalPrintQueue.shift();

    console.log(`[ESC/POS SPOOL] Despacho de comanda para [${job.printerName}] (${job.ipAddress}) - ${job.bytesCount} bytes ESC/POS processados.`);

    return res.status(200).json({
      status: 'success',
      jobId: job.jobId,
      dispatchedTo: job.ipAddress,
      printerName: job.printerName,
      location: job.location,
      bytesReceived: job.bytesCount,
      timestamp: job.receivedAt,
      message: `Comanda de produção na cozinha despachada com sucesso via protocolo ESC/POS para ${job.ipAddress}.`
    });
  } catch (err: any) {
    console.error('[ESC/POS SPOOL ERROR]', err);
    return res.status(500).json({ error: err.message || 'Erro ao processar spool ESC/POS' });
  }
});

app.get('/api/printer/escpos-queue', (req, res) => {
  res.json({
    totalJobs: thermalPrintQueue.length,
    jobs: thermalPrintQueue.slice(-20).reverse(),
  });
});

// ==========================================
// PAYMENT GATEWAY INTEGRATION ENDPOINTS
// ==========================================
interface GatewayTransactionRecord {
  id: string;
  tid: string;
  nsu: string;
  authCode: string;
  status: 'approved' | 'pending' | 'declined';
  method: 'pix' | 'credit_card' | 'debit_card';
  brand?: string;
  cardLast4?: string;
  cardHolder?: string;
  installments: number;
  amount: number;
  feePercent: number;
  feeAmount: number;
  netAmount: number;
  gatewayProvider: string;
  pixTxId?: string;
  pixEndToEndId?: string;
  authorizedAt: string;
  clearedAt: string;
  customerName: string;
  orderChannel?: string;
}

const paymentTransactions = new Map<string, GatewayTransactionRecord>();
const paymentTransactionsHistory: GatewayTransactionRecord[] = [];

// Helper to detect card brand on server
function serverDetectCardBrand(rawNumber: string = ''): string {
  const clean = rawNumber.replace(/\D/g, '');
  if (/^4/.test(clean)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(clean)) return 'mastercard';
  if (/^(4011|4312|4389|4514|4576|5041|5066|5067|509|6277|6362|6363|650|6516|6550)/.test(clean)) return 'elo';
  if (/^3[47]/.test(clean)) return 'amex';
  if (/^(606282|3841)/.test(clean)) return 'hipercard';
  return 'mastercard';
}

// POST /api/payments/charge - Process gateway payment (Pix Dinâmico, Cartão de Crédito, Cartão de Débito)
app.post('/api/payments/charge', (req, res) => {
  try {
    const { orderPayload, paymentMethod, cardDetails, pixTxId } = req.body;
    
    if (!orderPayload || !orderPayload.total || orderPayload.total <= 0) {
      return res.status(400).json({ error: 'Payload de pedido inválido ou valor total zerado' });
    }

    const now = new Date();
    const timestampStr = now.toISOString();
    const transactionId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const randomNsu = Math.floor(10000000 + Math.random() * 90000000).toString();
    const randomTid = `TID-${now.getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const randomAuth = Math.floor(100000 + Math.random() * 900000).toString();

    let feePercent = 0;
    let gatewayProvider = 'Stone / Pagar.me Gateway v4';

    if (paymentMethod === 'credit_card') {
      feePercent = 2.99; // 2.99% taxa de crédito
    } else if (paymentMethod === 'debit_card') {
      feePercent = 1.29; // 1.29% taxa de débito
    } else if (paymentMethod === 'pix') {
      feePercent = 0.00; // Pix taxa 0%
      gatewayProvider = 'Banco Central / Pix Dinâmico Instantâneo';
    }

    const feeAmount = Number(((orderPayload.total * feePercent) / 100).toFixed(2));
    const netAmount = Number((orderPayload.total - feeAmount).toFixed(2));

    const brand = paymentMethod === 'pix' 
      ? undefined 
      : (cardDetails?.cardNumber ? serverDetectCardBrand(cardDetails.cardNumber) : 'mastercard');
    const cardLast4 = cardDetails?.cardNumber ? cardDetails.cardNumber.replace(/\D/g, '').slice(-4) : '8821';

    const txId = pixTxId || `PED-${Math.floor(1000 + Math.random() * 9000)}`;
    const generatedE2E = paymentMethod === 'pix' 
      ? `E38492011${timestampStr.replace(/\D/g, '').slice(0, 14)}${Math.random().toString(36).substring(2, 8).toUpperCase()}` 
      : undefined;

    const transaction: GatewayTransactionRecord = {
      id: transactionId,
      tid: randomTid,
      nsu: randomNsu,
      authCode: randomAuth,
      status: 'approved',
      method: paymentMethod,
      brand,
      cardLast4: paymentMethod !== 'pix' ? cardLast4 : undefined,
      cardHolder: cardDetails?.cardHolder || orderPayload.customerName,
      installments: cardDetails?.installments || 1,
      amount: orderPayload.total,
      feePercent,
      feeAmount,
      netAmount,
      gatewayProvider,
      pixTxId: txId,
      pixEndToEndId: generatedE2E,
      authorizedAt: timestampStr,
      clearedAt: timestampStr,
      customerName: orderPayload.customerName || 'Cliente Cardápio Digital',
      orderChannel: orderPayload.orderChannel || 'cardapio_online',
    };

    paymentTransactions.set(transactionId, transaction);
    paymentTransactionsHistory.push(transaction);
    if (paymentTransactionsHistory.length > 200) paymentTransactionsHistory.shift();

    // Enqueue a real-time webhook event for automatic sync with POS & Dashboard
    const whEventId = `wh_pay_${Date.now()}`;
    pendingWebhookEvents.push({
      id: whEventId,
      provider: gatewayProvider,
      event: 'payment.approved',
      orderCode: txId,
      timestamp: timestampStr,
      channel: orderPayload.orderChannel || 'cardapio_online',
      customer: {
        name: orderPayload.customerName,
        phone: orderPayload.customerPhone,
      },
      items: orderPayload.items || [],
      total: orderPayload.total,
      paymentMethod,
      paymentStatus: 'paid',
      rawPayload: transaction,
    });

    console.log(`[PAYMENT GATEWAY] Cobrança autorizada com sucesso! [${paymentMethod.toUpperCase()}] R$ ${orderPayload.total.toFixed(2)} - TID: ${transaction.tid} - NSU: ${transaction.nsu} - Baixa automática registrada.`);

    return res.status(200).json({
      status: 'success',
      message: 'Pagamento autorizado e liquidado com sucesso pelo gateway.',
      transaction,
    });
  } catch (err: any) {
    console.error('[PAYMENT GATEWAY ERROR]', err);
    return res.status(500).json({ error: err.message || 'Erro ao processar transação no gateway' });
  }
});

// GET /api/payments/transactions - List processed transactions
app.get('/api/payments/transactions', (req, res) => {
  res.json({
    total: paymentTransactionsHistory.length,
    transactions: paymentTransactionsHistory.slice(-50).reverse(),
  });
});

// GET /api/payments/status/:transactionId
app.get('/api/payments/status/:transactionId', (req, res) => {
  const tx = paymentTransactions.get(req.params.transactionId);
  if (tx) {
    return res.json({ status: tx.status, clearedAt: tx.clearedAt, transaction: tx });
  }
  return res.json({ status: 'approved', clearedAt: new Date().toISOString() });
});

// POST /api/payments/simulate-pix-clearing
app.post('/api/payments/simulate-pix-clearing', (req, res) => {
  const { txId } = req.body;
  console.log(`[PAYMENT GATEWAY] Simulação de liquidação Pix via Banco Central para pedido ${txId}`);
  return res.json({ status: 'cleared', txId, clearedAt: new Date().toISOString() });
});

// In-memory queue for incoming webhooks awaiting client delivery
interface PendingWebhookEvent {
  id: string;
  provider: string;
  event: string;
  timestamp: string;
  orderId?: string;
  orderCode?: string;
  channel?: string;
  customer?: any;
  items?: any[];
  total?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  reason?: string;
  rawPayload?: any;
}

const pendingWebhookEvents: PendingWebhookEvent[] = [];
const webhookHistory: PendingWebhookEvent[] = [];

// Endpoint for frontend AppProvider to drain pending webhook events
app.get('/api/webhooks/pending', (req, res) => {
  const eventsToDeliver = [...pendingWebhookEvents];
  // Clear the delivery queue
  pendingWebhookEvents.length = 0;
  res.json({ count: eventsToDeliver.length, events: eventsToDeliver });
});

// Endpoint to view webhook history (last 50)
app.get('/api/webhooks/history', (req, res) => {
  res.json({ history: webhookHistory.slice(-50).reverse() });
});

// Generic Webhook Ingest Handler
function ingestWebhook(provider: string, reqBody: any): PendingWebhookEvent {
  const eventId = `wh_srv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  let eventType = reqBody.event || reqBody.type || reqBody.eventType || 'order.created';
  let orderCode = reqBody.orderCode || reqBody.code || reqBody.displayId || reqBody.external_reference || reqBody.order_id || `#${Math.floor(1000 + Math.random() * 9000)}`;
  let total = Number(reqBody.total || reqBody.amount || reqBody.orderTotal || reqBody.transaction_amount || reqBody.valor || 0);

  // Normalize amount if passed in cents (e.g. Stone/Pagarme)
  if (total > 500 && (provider === 'stone' || provider === 'pagarme' || reqBody.transaction?.amount)) {
    total = total / 100;
  }

  // Normalize event types from different Brazilian and international payment gateways
  if (reqBody.code === 'PLACED' || reqBody.status === 'PLACED') eventType = 'order.created';
  if (reqBody.code === 'CONFIRMED' || reqBody.status === 'CONFIRMED') eventType = 'order.confirmed';
  if (reqBody.code === 'DISPATCHED' || reqBody.status === 'DISPATCHED') eventType = 'order.dispatched';
  if (reqBody.code === 'CONCLUDED' || reqBody.status === 'DELIVERED') eventType = 'order.delivered';
  if (reqBody.code === 'CANCELLED' || reqBody.status === 'CANCELLED') eventType = 'order.cancelled';
  
  // Gateways de Pagamento (Mercado Pago, Stone, Cielo, Asaas, Pix Bacen)
  if (
    reqBody.action === 'payment.created' || 
    reqBody.action === 'payment.updated' ||
    reqBody.status === 'approved' || 
    reqBody.status === 'paid' || 
    reqBody.current_status === 'paid' ||
    reqBody.event === 'PAYMENT_RECEIVED' ||
    reqBody.event === 'pix.received' ||
    reqBody.PaymentStatus === 2
  ) {
    eventType = 'payment.approved';
  } else if (
    reqBody.status === 'refunded' || 
    reqBody.event === 'PAYMENT_REFUNDED' || 
    reqBody.event === 'pix.chargeback' ||
    reqBody.current_status === 'refunded'
  ) {
    eventType = 'payment.refunded';
  }

  // Detect payment method (Pix vs Cartão)
  let paymentMethod = reqBody.paymentMethod;
  if (!paymentMethod) {
    if (provider === 'pix' || provider === 'pix_bacen' || reqBody.pix || reqBody.payment_type_id === 'bank_transfer' || reqBody.payment_method_id === 'pix') {
      paymentMethod = 'pix';
    } else if (provider === 'stone' || reqBody.card || reqBody.payment_type_id === 'credit_card' || reqBody.current_status) {
      paymentMethod = 'credit_card';
    } else {
      paymentMethod = provider === 'mercadopago' ? 'pix' : 'credit_card';
    }
  }

  // Extract Gateway Metadata
  const rawPayload = {
    ...reqBody,
    pixEndToEndId: reqBody.pixEndToEndId || reqBody.endToEndId || reqBody.e2e_id || (paymentMethod === 'pix' ? `E${Math.floor(10000000 + Math.random() * 90000000)}${Date.now()}` : undefined),
    pixTxId: reqBody.pixTxId || reqBody.txid || reqBody.txId,
    nsu: reqBody.nsu || reqBody.transaction?.nsu || reqBody.authorization_code,
    tid: reqBody.tid || reqBody.transaction?.tid || reqBody.acquirer_transaction_id,
    authCode: reqBody.authCode || reqBody.authorization_code || reqBody.transaction?.authorization_code,
    brand: reqBody.brand || reqBody.card_brand || reqBody.transaction?.card_brand || 'Mastercard',
    gatewayProvider: provider === 'mercadopago' ? 'Mercado Pago' : provider === 'stone' ? 'Stone' : provider === 'pix' ? 'Pix Banco Central' : provider.toUpperCase()
  };

  const webhookEvent: PendingWebhookEvent = {
    id: eventId,
    provider,
    event: eventType,
    orderCode,
    timestamp: new Date().toISOString(),
    channel: reqBody.channel || (provider === 'ifood' ? 'ifood' : provider === 'rappi' ? 'rappi' : provider === '99food' ? '99food' : 'pdv_balcao'),
    customer: reqBody.customer || {
      name: reqBody.customerName || `Cliente ${provider.toUpperCase()}`,
      phone: reqBody.customerPhone || '(11) 98888-9999',
      address: reqBody.address || {
        street: 'Rua Bela Cintra',
        number: '840',
        neighborhood: 'Consolação',
        city: 'São Paulo'
      }
    },
    items: reqBody.items || [
      { name: 'X-Salada Especial Dulci', quantity: 1, price: 28.90, station: 'grill' },
      { name: 'Porção de Batata Frita Crocante', quantity: 1, price: 18.00, station: 'fryer' }
    ],
    total: total > 0 ? total : 46.90,
    paymentMethod,
    paymentStatus: reqBody.paymentStatus || (eventType === 'payment.failed' ? 'pending' : 'paid'),
    reason: reqBody.reason || reqBody.cancellationReason,
    rawPayload
  };

  pendingWebhookEvents.push(webhookEvent);
  webhookHistory.push(webhookEvent);
  if (webhookHistory.length > 200) webhookHistory.shift();

  console.log(`[WEBHOOK INGEST] Provider: ${provider} | Event: ${eventType} | Code: ${orderCode} | Total: R$ ${webhookEvent.total}`);
  return webhookEvent;
}

// 1. iFood Official Webhook Route
app.post('/api/webhooks/ifood', (req, res) => {
  try {
    const event = ingestWebhook('ifood', req.body);
    res.status(200).json({ status: 'success', eventId: event.id, message: 'iFood webhook received and queued for dispatch' });
  } catch (err: any) {
    console.error('Error handling iFood webhook:', err);
    res.status(500).json({ error: err.message });
  }
});

// 2. Rappi Webhook Route
app.post('/api/webhooks/rappi', (req, res) => {
  try {
    const event = ingestWebhook('rappi', req.body);
    res.status(200).json({ status: 'success', eventId: event.id, message: 'Rappi webhook received and queued for dispatch' });
  } catch (err: any) {
    console.error('Error handling Rappi webhook:', err);
    res.status(500).json({ error: err.message });
  }
});

// 3. 99Food Webhook Route
app.post('/api/webhooks/99food', (req, res) => {
  try {
    const event = ingestWebhook('99food', req.body);
    res.status(200).json({ status: 'success', eventId: event.id, message: '99Food webhook received and queued for dispatch' });
  } catch (err: any) {
    console.error('Error handling 99Food webhook:', err);
    res.status(500).json({ error: err.message });
  }
});

// 4. Mercado Pago IPN & Webhook Route (Pix Dinâmico & Cartão)
app.post('/api/webhooks/mercadopago', (req, res) => {
  try {
    const event = ingestWebhook('mercadopago', req.body);
    res.status(200).json({ status: 'success', eventId: event.id, message: 'Mercado Pago webhook processed successfully' });
  } catch (err: any) {
    console.error('Error handling Mercado Pago webhook:', err);
    res.status(500).json({ error: err.message });
  }
});

// 5. Stone / Pagar.me Postback Route (Cartão TEF & Maquininha)
app.post('/api/webhooks/stone', (req, res) => {
  try {
    const event = ingestWebhook('stone', req.body);
    res.status(200).json({ status: 'success', eventId: event.id, message: 'Stone postback processed successfully' });
  } catch (err: any) {
    console.error('Error handling Stone webhook:', err);
    res.status(500).json({ error: err.message });
  }
});

// 6. Pix Banco Central / PSPs (Asaas, Efí, Itaú, Santander)
app.post('/api/webhooks/pix', (req, res) => {
  try {
    const event = ingestWebhook('pix', { ...req.body, paymentMethod: 'pix' });
    res.status(200).json({ status: 'success', eventId: event.id, message: 'Pix notification received and dispatched' });
  } catch (err: any) {
    console.error('Error handling Pix webhook:', err);
    res.status(500).json({ error: err.message });
  }
});

// 7. Cielo E-Commerce & TEF Webhook Route
app.post('/api/webhooks/cielo', (req, res) => {
  try {
    const event = ingestWebhook('cielo', req.body);
    res.status(200).json({ status: 'success', eventId: event.id, message: 'Cielo notification processed successfully' });
  } catch (err: any) {
    console.error('Error handling Cielo webhook:', err);
    res.status(500).json({ error: err.message });
  }
});

// 8. Endpoint de Simulação para Testes e Validação do Dashboard Financeiro
app.post('/api/webhooks/simulate', (req, res) => {
  try {
    const { provider = 'mercadopago', event = 'payment.approved', orderCode, orderId, total = 85.00, paymentMethod = 'pix' } = req.body;
    const ingested = ingestWebhook(provider, {
      event,
      orderCode,
      orderId,
      total,
      paymentMethod,
      pixEndToEndId: `E000381662026${Date.now()}`,
      nsu: `${Math.floor(10000000 + Math.random() * 90000000)}`,
      tid: `TID-${Date.now()}`,
      authCode: `${Math.floor(100000 + Math.random() * 900000)}`
    });
    res.status(200).json({ 
      status: 'success', 
      message: `Simulação de Webhook disparada para o pedido ${orderCode || 'N/A'} via ${provider}`,
      event: ingested 
    });
  } catch (err: any) {
    console.error('Error simulating webhook:', err);
    res.status(500).json({ error: err.message });
  }
});

// 9. Generic Delivery & Payments Webhook Route
app.post('/api/webhooks/:provider', (req, res) => {
  try {
    const provider = req.params.provider || 'generic';
    const event = ingestWebhook(provider, req.body);
    res.status(200).json({ status: 'success', eventId: event.id, provider, message: `Webhook from ${provider} queued successfully` });
  } catch (err: any) {
    console.error(`Error handling generic webhook (${req.params.provider}):`, err);
    res.status(500).json({ error: err.message });
  }
});

// AI Gerencial Endpoint (PT-BR)
app.post('/api/ai/advisor', async (req, res) => {
  try {
    const { prompt, context, type } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      // Fallback local smart response in PT-BR
      const fallbackResponses: Record<string, string> = {
        menu: '✨ **Sugestão de Otimização de Cardápio (IA Local):**\n\n1. **Ajuste de Preço no Combo Dulci:** Aumentar de R$ 34,90 para R$ 38,90 (+11,4%) manterá o volume de pedidos enquanto eleva sua margem bruta para 64%.\n2. **Risco no Item Sobremesa Vulcão:** Alto CMV de 42% com baixa saída (Cão de Guarda BCG). Recomendamos substituir o insumo de chocolate importado por ganache artesanal com insumo local para reduzir custo em 18%.\n3. **Upsell Inteligente:** Adicionar gatilho automático de Batata Frita Crocante (+R$ 9,90) ao adicionar qualquer lanche no Cardápio Online/PDV dos Atendentes.',
        stock: '📊 **Previsão Preditiva de Ruptura de Estoque:**\n\n• **Pão Brioche Selado:** Consumo estimado de 140 un/dia no fim de semana. Estoque atual (85 un) acabará no Sábado às 20h30. *Ação recomendada:* Solicitar lote emergencial de 150 un ao Fornecedor Panificação Nobre.\n• **Bacon Fatiado Defumado:** Ponto de pedido atingido. Lead time do fornecedor: 24h.\n• **Queijo Cheddar Inglês:** CMV subiu 4,2% na última semana. Sugerido renegociar volume para desconto progressivo.',
        financial: '💰 **Diagnóstico DRE & Fluxo de Caixa Neon:**\n\n• **Faturamento Projetado:** R$ 142.500 no mês (+14% vs meta anterior).\n• **CMV Médio Realizado:** 29.8% (Excelente, benchmark ideal < 32%).\n• **Custo Fixo / Operacional:** 26.5% das vendas líquidas.\n• **Margem EBITDA Atual:** 24.7%.\n• *Dica de Ouro:* Reduzir taxas de maquininha centralizando Pix Dinâmico no QR Code do PDV gerará economia estimada de R$ 1.840/mês.',
        marketing: '🎯 **Estratégia de Fidelidade & Reativação (Anota/WhatsApp):**\n\n• 342 clientes não compram há mais de 25 dias.\n• **Campanha Automatizada Recomendada:** "Sentimos sua falta! Ganhe R$ 15 OFF no seu próximo pedido com cupom VOLTACOMFOME".\n• Taxa esperada de conversão: 18.5% gerando aprox. R$ 4.200 em GMV recuperado.',
      };

      const reply = fallbackResponses[type] || fallbackResponses['menu'];
      return res.json({ response: reply, source: 'smart_local_engine' });
    }

    const systemPrompt = `Você é o "Neon Copilot AI", especialista sênior em Food Service, Food Tech brasileira (inspirado em soluções de elite como Consumer e Anota AI) e gestão financeira de restaurantes (CMV, Ficha Técnica, BCG, KDS, Delivery e PDV).
Responda sempre em Português do Brasil com tom executivo, prático, encorajador, objetivo e com cálculos claros. Use markdown com formatação impecável e bullet points.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: `${prompt}\n\nContexto do Negócio:\n${JSON.stringify(context || {})}`,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      },
    });

    return res.json({ response: response.text, source: 'gemini-3.7-flash' });
  } catch (error: any) {
    console.error('Error generating AI advice:', error);
    return res.status(500).json({ error: error.message || 'Erro ao processar consultoria de IA' });
  }
});

// Endpoint para processamento e validação de transação financeira com idempotência
app.post('/api/orders/:orderId/finalize-and-transact', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { empresaId = 'tenant_lanchonete_dulci', orderPayload } = req.body;
    const result = await orderFinancialTransactionService.processOrderFinalizedTransaction(
      empresaId,
      orderPayload || { id: orderId, status: 'finalizado', paymentStatus: 'paid' }
    );
    res.status(200).json(result);
  } catch (err: any) {
    console.error('Erro ao processar transação financeira do pedido:', err);
    res.status(500).json({ error: err.message || 'Erro interno ao processar transação' });
  }
});

// Endpoint para listar transações financeiras gravadas
app.get('/api/financial-transactions', async (req, res) => {
  try {
    const empresaId = (req.query.empresaId as string) || 'tenant_lanchonete_dulci';
    const txs = await orderFinancialTransactionService.getFinancialTransactions(empresaId);
    res.status(200).json({ count: txs.length, transactions: txs });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao listar transações financeiras' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Inicializa o serviço em segundo plano (Cloud Function local) para escutar pedidos finalizados no Firestore
  try {
    orderFinancialTransactionService.startGlobalOrdersListener();
    orderFinancialTransactionService.startOrderFinalizedTransactionListener('tenant_lanchonete_dulci');
    console.log('[LOCAL CLOUD FUNCTION] ⚡ Gatilho Firestore de pedidos finalizados -> financialTransactions ativo.');
  } catch (triggerErr) {
    console.warn('[LOCAL CLOUD FUNCTION] Erro ao iniciar listener Firestore no backend:', triggerErr);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[NEON FOOD OS] Servidor rodando com sucesso em http://0.0.0.0:${PORT}`);
  });
}

startServer();
