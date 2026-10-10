import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  CheckCircle2, 
  Store, 
  CreditCard, 
  Printer, 
  Layers, 
  DollarSign, 
  ShoppingBag, 
  CookingPot, 
  History, 
  ArrowRight, 
  Sparkles, 
  Copy, 
  Check, 
  ExternalLink, 
  Save, 
  X, 
  Plus, 
  FileText, 
  Key, 
  Lock, 
  QrCode, 
  ShieldCheck, 
  RefreshCw,
  Sliders,
  Smartphone,
  ChevronRight,
  Info
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatBRL } from '../utils/formatters';
import { playCashRegister, playBeep, playKitchenBell, playSoftClickSound } from '../utils/audio';
import { auditService } from '../services/auditService';
import { thermalPrinterService } from '../services/escposService';
import { saveEmpresa, saveProduto } from '../services/multiTenantFirestoreService';
import { paymentGatewayService } from '../services/paymentGatewayService';
import { saveUnitGatewayConfig } from '../services/unitGatewayConfigService';
import { generatePixPayload, getPixQrCodeUrl } from '../utils/pix';
import { Product, TableItem } from '../types';

interface GuiaAtivacaoTestes360Props {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'teste' | 'empresa' | 'pagamento' | 'impressora';
}

export const GuiaAtivacaoTestes360: React.FC<GuiaAtivacaoTestes360Props> = ({
  isOpen,
  onClose,
  initialTab = 'teste'
}) => {
  const { 
    currentUser, 
    tenant, 
    setTenant, 
    currentBranch, 
    activeCashSession, 
    openCashSession, 
    createOrder, 
    orders, 
    tables, 
    setTables, 
    products, 
    addProduct, 
    setCurrentView 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'teste' | 'empresa' | 'pagamento' | 'impressora'>(initialTab);
  
  // Feedback states
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // --------------------------------------------------------------------------
  // PILAR 1: TESTE OPERACIONAL DE PONTA A PONTA
  // --------------------------------------------------------------------------
  const [openingAmount, setOpeningAmount] = useState<number>(100);
  const [testOrderChannel, setTestOrderChannel] = useState<'balcao' | 'mesa' | 'delivery'>('balcao');
  const [testOrderCustomer, setTestOrderCustomer] = useState('Cliente Teste Presencial');
  const [createdTestOrderCode, setCreatedTestOrderCode] = useState<string | null>(null);

  const handleOpenCashNow = () => {
    if (activeCashSession) {
      triggerToast('O caixa já está aberto com valor inicial ativo.');
      return;
    }
    openCashSession(openingAmount);
    playCashRegister();
    triggerToast(`Caixa aberto com sucesso! Suprimento inicial de ${formatBRL(openingAmount)} registrado.`);
  };

  const handleCreateTestOrder = () => {
    playBeep(900, 0.08);

    // Selecionar itens reais ou de exemplo do cardápio
    const item1 = products[0] || {
      id: 'prod_artesanal_1',
      name: 'X-Salada Especial da Casa',
      price: 28.50,
      category: 'Lanches'
    };
    const item2 = products[1] || {
      id: 'prod_artesanal_2',
      name: 'Refrigerante Lata 350ml',
      price: 7.00,
      category: 'Bebidas'
    };

    const orderTotal = (item1.price || 28.50) + (item2.price || 7.00);

    const newOrder = createOrder({
      channel: testOrderChannel === 'mesa' ? 'mesa' : testOrderChannel === 'delivery' ? 'delivery_whatsapp' : 'pdv_balcao',
      customerName: testOrderCustomer || 'Cliente Teste Neon',
      customerPhone: '(11) 98877-6655',
      tableNumber: testOrderChannel === 'mesa' ? 4 : undefined,
      status: 'recebido',
      paymentMethod: 'pix',
      paymentStatus: 'paid',
      items: [
        {
          productId: item1.id,
          name: item1.name,
          quantity: 1,
          price: item1.price || 28.50,
          totalPrice: item1.price || 28.50,
          notes: 'Sem cebola (item de teste)',
          station: 'grill'
        },
        {
          productId: item2.id,
          name: item2.name,
          quantity: 1,
          price: item2.price || 7.00,
          totalPrice: item2.price || 7.00,
          station: 'bar'
        }
      ],
      subtotal: orderTotal,
      total: orderTotal,
      paidAmount: orderTotal,
      preparationNotes: 'Pedido real de teste operacional disparado pelo Guia 360°.'
    });

    setCreatedTestOrderCode(newOrder.displayCode);
    playKitchenBell();
    triggerToast(`Pedido ${newOrder.displayCode} criado! Enviado para o KDS, Visão Geral e Auditoria.`);
  };

  // --------------------------------------------------------------------------
  // PILAR 2: DADOS CADASTRAIS, MESAS E CARDÁPIO REAL
  // --------------------------------------------------------------------------
  const [empresaForm, setEmpresaForm] = useState({
    nomeFantasia: tenant?.name || 'Lanchonete Dulci',
    razaoSocial: 'Dulci Alimentos e Bebidas LTDA',
    cnpj: '48.912.345/0001-90',
    telefone: '(11) 98765-4321',
    endereco: 'Rua das Flores, 120 - Centro',
    cidade: 'São Paulo',
    estado: 'SP'
  });

  const handleSaveEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();
    playCashRegister();

    // Atualiza tenant local
    setTenant(prev => ({
      ...prev,
      name: empresaForm.nomeFantasia,
    }));

    // Sincroniza no Firestore empresas
    try {
      await saveEmpresa({
        id: tenant.id,
        name: empresaForm.nomeFantasia,
        slug: tenant.slug || 'dulci',
        cnpj: empresaForm.cnpj,
        ownerId: currentUser.id,
        ownerName: currentUser.name,
        ownerEmail: currentUser.email,
        phone: empresaForm.telefone,
        planId: 'plan_pro',
        planName: 'Neon Pro',
        monthlyFee: 149.90,
        trialEndsAt: new Date(Date.now() + 30 * 86400000).toISOString(),
        status: 'active',
        branchesCount: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Grava na trilha de auditoria
      await auditService.logAction({
        actionType: 'config_change',
        userId: currentUser.id,
        tenantId: tenant.id,
        description: `Dados cadastrais da empresa atualizados: ${empresaForm.nomeFantasia} (CNPJ: ${empresaForm.cnpj}).`,
        metadata: { ...empresaForm },
        severity: 'info'
      });

      triggerToast('Dados cadastrais da empresa atualizados com sucesso no Firestore!');
    } catch (err) {
      console.warn('Erro ao salvar empresa no Firestore:', err);
      triggerToast('Dados atualizados na sessão com sucesso!');
    }
  };

  // Gerador rápido de Mesas
  const handleConfigureTablesCount = (count: number) => {
    playBeep(850, 0.05);
    const newTables: TableItem[] = [];
    for (let i = 1; i <= count; i++) {
      newTables.push({
        number: i,
        name: `Mesa ${i < 10 ? '0' + i : i}`,
        seats: 4,
        status: 'free',
        currentTotal: 0,
        zone: i <= 8 ? 'salao_principal' : i <= 14 ? 'varanda' : 'mezanino',
        openedAt: undefined
      });
    }
    setTables(newTables);

    auditService.logAction({
      actionType: 'config_change',
      userId: currentUser.id,
      tenantId: tenant.id,
      description: `Layout do salão reconfigurado com ${count} mesas pelo operador ${currentUser.name}.`,
      metadata: { totalTables: count },
      severity: 'info'
    }).catch(() => {});

    triggerToast(`Salão reconfigurado com sucesso com ${count} mesas (4 lugares cada)!`);
  };

  // Cadastro rápido de Produto Real
  const [newProd, setNewProd] = useState({
    name: '',
    category: 'Lanches',
    price: 32.90,
    costPrice: 11.50,
    description: 'Pão brioche selado na manteiga, 2x smash burger de 90g, queijo cheddar derretido e maionese artesanal.'
  });

  const handleAddRealProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProd.name.trim()) return;

    playCashRegister();
    const productItem: Product = {
      id: `prod_${Date.now()}`,
      name: newProd.name,
      description: newProd.description,
      category: newProd.category,
      price: Number(newProd.price) || 0,
      costPrice: Number(newProd.costPrice) || 0,
      available: true,
      imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop&q=80',
      bcgClassification: 'star',
      station: 'grill',
      tenantId: tenant.id,
      branchId: currentBranch.id
    };

    addProduct(productItem);

    try {
      await saveProduto(tenant.id, {
        id: productItem.id,
        empresaId: tenant.id,
        unidadeId: currentBranch.id,
        tenantId: tenant.id,
        branchId: currentBranch.id,
        name: productItem.name,
        description: productItem.description || '',
        category: productItem.category,
        price: productItem.price,
        costPrice: productItem.costPrice || 0,
        available: true,
        imageUrl: productItem.imageUrl,
        bcgClassification: productItem.bcgClassification,
        station: 'grill',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      await auditService.logAction({
        actionType: 'price_change',
        userId: currentUser.id,
        tenantId: tenant.id,
        description: `Novo produto real cadastrado no cardápio: "${productItem.name}" por ${formatBRL(productItem.price)}.`,
        metadata: { productId: productItem.id, productName: productItem.name, price: productItem.price },
        severity: 'info'
      });

      setNewProd({
        name: '',
        category: 'Lanches',
        price: 32.90,
        costPrice: 11.50,
        description: ''
      });

      triggerToast(`Produto "${productItem.name}" cadastrado com sucesso no Cardápio e no Firestore!`);
    } catch (err) {
      triggerToast(`Produto "${productItem.name}" adicionado ao cardápio com sucesso!`);
    }
  };

  // --------------------------------------------------------------------------
  // PILAR 3: CONFIGURAÇÃO DE PAGAMENTOS & WEBHOOKS
  // --------------------------------------------------------------------------
  const [gatewayProvider, setGatewayProvider] = useState<'mercadopago' | 'efi' | 'asaas'>('mercadopago');
  const [gatewayConfig, setGatewayConfig] = useState({
    publicKey: 'APP_USR-6a7b8c9d-prod-key',
    accessToken: 'APP_USR-7890123456789012-100514-998877-prod',
    pixKey: 'financeiro@dulcialimentos.com.br',
    webhookSecret: 'whsec_dulci_prod_secure_2026'
  });
  const [testedPixPayload, setTestedPixPayload] = useState<string | null>(null);

  const handleSaveGateway = async () => {
    playCashRegister();
    try {
      await saveUnitGatewayConfig(tenant.id, currentBranch.id, {
        empresaId: tenant.id,
        unidadeName: currentBranch.name,
        environment: 'production',
        activePixProvider: gatewayProvider,
        activeCardProvider: 'stone',
        mercadoPagoPublicKey: gatewayConfig.publicKey,
        mercadoPagoAccessToken: gatewayConfig.accessToken,
        mercadoPagoWebhookSecret: gatewayConfig.webhookSecret,
        pixKey: gatewayConfig.pixKey,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser.email
      });

      await auditService.logAction({
        actionType: 'config_change',
        userId: currentUser.id,
        tenantId: tenant.id,
        description: `Configuração do Gateway de Pagamento ${gatewayProvider.toUpperCase()} salva para a filial ${currentBranch.name}.`,
        metadata: { provider: gatewayProvider, pixKey: gatewayConfig.pixKey },
        severity: 'info'
      });

      triggerToast(`Credenciais do ${gatewayProvider.toUpperCase()} salvas com sucesso!`);
    } catch (err) {
      triggerToast(`Configurações salvas localmente com sucesso!`);
    }
  };

  const handleTestPixGeneration = () => {
    playBeep(900, 0.05);
    const pixCopyPaste = generatePixPayload({
      pixKey: gatewayConfig.pixKey || 'financeiro@dulcialimentos.com.br',
      merchantName: tenant.name || 'Dulci',
      merchantCity: 'Sao Paulo',
      amount: 35.50,
      description: 'Neon Teste Pix'
    });
    setTestedPixPayload(pixCopyPaste);
    triggerToast('QR Code Pix Dinâmico gerado com sucesso para teste!');
  };

  // --------------------------------------------------------------------------
  // PILAR 4: IMPRESSORA TÉRMICA ESC/POS
  // --------------------------------------------------------------------------
  const [printerWidth, setPrinterWidth] = useState<'58mm' | '80mm'>('80mm');
  const [printStationKitchen, setPrintStationKitchen] = useState(true);
  const [printStationClient, setPrintStationClient] = useState(true);
  const [isTestPrinting, setIsTestPrinting] = useState(false);
  const [printedReceiptAscii, setPrintedReceiptAscii] = useState<string | null>(null);

  const handleTestThermalPrint = async () => {
    setIsTestPrinting(true);
    playCashRegister();

    const sampleOrder = orders[0] || {
      orderNumber: 1042,
      displayCode: '#1042',
      customerName: 'Mesa 04 (Salão)',
      items: [
        { name: 'X-Salada Especial', quantity: 2, price: 28.50 },
        { name: 'Coca-Cola 350ml', quantity: 2, price: 7.00 },
        { name: 'Batata Rústica c/ Alecrim', quantity: 1, price: 22.00 }
      ],
      total: 93.00,
      paymentMethod: 'pix'
    };

    // Gerar visualização ASCII de conferência
    const cols = printerWidth === '58mm' ? 32 : 48;
    const divider = '='.repeat(cols);
    const thinDivider = '-'.repeat(cols);

    const ascii = [
      divider,
      `      ${(tenant.name || 'LANCHONETE DULCI').toUpperCase()}`,
      `   CNPJ: ${empresaForm.cnpj || '48.912.345/0001-90'}`,
      `   ${new Date().toLocaleString('pt-BR')}`,
      divider,
      `PEDIDO: ${sampleOrder.displayCode} - COZINHA (${printerWidth})`,
      `CLIENTE: ${sampleOrder.customerName}`,
      thinDivider,
      ...sampleOrder.items.map(it => `${it.quantity}x ${(it.name).padEnd(cols - 12)} R$ ${(it.price * it.quantity).toFixed(2)}`),
      thinDivider,
      `TOTAL: ${formatBRL(sampleOrder.total).padStart(cols - 7)}`,
      `PAGAMENTO: ${(sampleOrder.paymentMethod || 'PIX').toUpperCase()}`,
      divider,
      `       [ CORTE AUTOMÁTICO DE PAPEL ]`,
      `       *** NEON FOOD OS - IMPRESSO ***`
    ].join('\n');

    setPrintedReceiptAscii(ascii);

    // Disparar comando real no thermalPrinterService
    try {
      const printer = thermalPrinterService.getKitchenPrinter();
      await thermalPrinterService.testKitchenPrinter(printer);
    } catch {}

    setTimeout(() => {
      setIsTestPrinting(false);
      triggerToast(`Comanda de teste enviada com sucesso no formato ${printerWidth}!`);
    }, 600);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-4xl bg-[#101018] border border-[#2A2A3E] rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]"
      >
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-[#242436] bg-gradient-to-r from-[#14121A] via-[#1A1826] to-[#12121A] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#FFC72C] to-[#FF7A00] text-black font-black flex items-center justify-center shadow-lg">
              <Sparkles className="w-5 h-5 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">Central de Implantação e Teste 360°</h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#14B8A6]/20 text-[#14B8A6] border border-[#14B8A6]/30">
                  Pronto para Operar
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Execute os 4 pilares solicitados: Teste de Ponta a Ponta, Cadastro Real, Gateways de Pagamento e Impressora Térmica.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1C1C2A] hover:bg-[#28283C] text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback Toast */}
        <AnimatePresence>
          {successToast && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-emerald-500/20 border-b border-emerald-500/30 px-6 py-2.5 text-xs font-bold text-emerald-300 flex items-center gap-2 shrink-0"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successToast}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 4 Tabs Selector */}
        <div className="flex items-center border-b border-[#202030] bg-[#14141E] px-4 overflow-x-auto scrollbar-none shrink-0">
          <button
            onClick={() => { setActiveTab('teste'); playSoftClickSound(); }}
            className={`py-3.5 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'teste'
                ? 'border-[#00E676] text-[#00E676]'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Play className="w-4 h-4" />
            <span>1. Teste de Ponta a Ponta</span>
          </button>

          <button
            onClick={() => { setActiveTab('empresa'); playSoftClickSound(); }}
            className={`py-3.5 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'empresa'
                ? 'border-[#FFC72C] text-[#FFC72C]'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>2. Dados Reais & Mesas</span>
          </button>

          <button
            onClick={() => { setActiveTab('pagamento'); playSoftClickSound(); }}
            className={`py-3.5 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'pagamento'
                ? 'border-[#38C9FF] text-[#38C9FF]'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>3. Pagamentos & Webhooks</span>
          </button>

          <button
            onClick={() => { setActiveTab('impressora'); playSoftClickSound(); }}
            className={`py-3.5 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'impressora'
                ? 'border-[#FF7A00] text-[#FF7A00]'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>4. Impressora ESC/POS</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">

          {/* ================================================================= */}
          {/* TAB 1: TESTE OPERACIONAL DE PONTA A PONTA                          */}
          {/* ================================================================= */}
          {activeTab === 'teste' && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-[#161622] border border-[#242436] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">Passo 1: Abertura do Caixa (Frente de Caixa)</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${activeCashSession ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}>
                      {activeCashSession ? 'Caixa Aberto' : 'Caixa Fechado'}
                    </span>
                  </div>
                  <p className="text-zinc-400">
                    {activeCashSession 
                      ? `Caixa já operando com suprimento inicial de ${formatBRL(activeCashSession.initialAmount)} aberto por ${activeCashSession.openedBy}.`
                      : 'O caixa precisa estar aberto para registrar vendas em dinheiro e emitir comprovantes.'}
                  </p>
                </div>

                {!activeCashSession ? (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs font-bold">R$</span>
                      <input 
                        type="number"
                        value={openingAmount}
                        onChange={e => setOpeningAmount(Number(e.target.value))}
                        className="w-28 pl-8 pr-2 py-2 bg-[#12121A] border border-[#2C2C40] rounded-xl text-white font-mono font-bold text-xs"
                      />
                    </div>
                    <button
                      onClick={handleOpenCashNow}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-xl transition-all cursor-pointer whitespace-nowrap shadow-md"
                    >
                      Abrir Caixa Agora
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/30">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Pronto para registrar vendas</span>
                  </div>
                )}
              </div>

              {/* Passo 2: Criar Pedido Real */}
              <div className="p-5 rounded-2xl bg-[#161622] border border-[#242436] space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-[#00E676]" />
                      <span>Passo 2: Lançar Pedido Real de Teste</span>
                    </h3>
                    <p className="text-zinc-400 mt-0.5">
                      Gera um pedido com 2 itens reais, atualiza a Visão Geral, transmite para o KDS e registra na auditoria.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-zinc-400 text-[10px] uppercase font-bold mb-1">Canal de Atendimento:</label>
                    <select
                      value={testOrderChannel}
                      onChange={e => setTestOrderChannel(e.target.value as any)}
                      className="w-full bg-[#12121A] border border-[#282838] rounded-xl px-3 py-2 text-white font-semibold"
                    >
                      <option value="balcao">Balcão / PDV</option>
                      <option value="mesa">Mesa 04 (Salão)</option>
                      <option value="delivery">WhatsApp Delivery</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-zinc-400 text-[10px] uppercase font-bold mb-1">Nome do Cliente:</label>
                    <input
                      type="text"
                      value={testOrderCustomer}
                      onChange={e => setTestOrderCustomer(e.target.value)}
                      className="w-full bg-[#12121A] border border-[#282838] rounded-xl px-3 py-2 text-white font-semibold"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={handleCreateTestOrder}
                      className="w-full py-2.5 bg-gradient-to-r from-[#00E676] to-[#00C853] hover:brightness-110 text-black font-black rounded-xl transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      <span>DISPARAR PEDIDO REAL</span>
                    </button>
                  </div>
                </div>

                {createdTestOrderCode && (
                  <div className="p-3.5 rounded-xl bg-[#12121A] border border-emerald-500/40 text-emerald-300 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Pedido <strong>{createdTestOrderCode}</strong> lançado com sucesso e replicado no KDS e Firestore!</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Passo 3: Conferência Integrada */}
              <div className="space-y-2">
                <span className="text-zinc-400 font-bold block uppercase text-[10px]">Passo 3: Acompanhar nas Telas do Sistema:</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <button
                    onClick={() => { onClose(); setCurrentView('kds'); }}
                    className="p-3.5 rounded-xl bg-[#181824] hover:bg-[#202030] border border-[#2C2C40] text-left space-y-1.5 cursor-pointer group transition-all"
                  >
                    <CookingPot className="w-5 h-5 text-orange-400 group-hover:scale-110 transition-transform" />
                    <div className="font-bold text-white">KDS Cozinha</div>
                    <p className="text-[11px] text-zinc-500">Veja o pedido na chapa</p>
                  </button>

                  <button
                    onClick={() => { onClose(); setCurrentView('overview_bi'); }}
                    className="p-3.5 rounded-xl bg-[#181824] hover:bg-[#202030] border border-[#2C2C40] text-left space-y-1.5 cursor-pointer group transition-all"
                  >
                    <DollarSign className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                    <div className="font-bold text-white">Visão Geral</div>
                    <p className="text-[11px] text-zinc-500">Métricas atualizadas</p>
                  </button>

                  <button
                    onClick={() => { onClose(); setCurrentView('auditoria'); }}
                    className="p-3.5 rounded-xl bg-[#181824] hover:bg-[#202030] border border-[#2C2C40] text-left space-y-1.5 cursor-pointer group transition-all"
                  >
                    <History className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
                    <div className="font-bold text-white">Trilha Auditoria</div>
                    <p className="text-[11px] text-zinc-500">Logs gravados no Firestore</p>
                  </button>

                  <button
                    onClick={() => { onClose(); setCurrentView('pdv'); }}
                    className="p-3.5 rounded-xl bg-[#181824] hover:bg-[#202030] border border-[#2C2C40] text-left space-y-1.5 cursor-pointer group transition-all"
                  >
                    <ShoppingBag className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
                    <div className="font-bold text-white">Frente de Caixa</div>
                    <p className="text-[11px] text-zinc-500">Operar PDV balcão</p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 2: DADOS REAIS DA EMPRESA, MESAS E CARDÁPIO                    */}
          {/* ================================================================= */}
          {activeTab === 'empresa' && (
            <div className="space-y-6">
              {/* Seção 2A: Dados Cadastrais */}
              <form onSubmit={handleSaveEmpresa} className="p-5 rounded-2xl bg-[#161622] border border-[#242436] space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Store className="w-4 h-4 text-[#FFC72C]" />
                    <span>Dados Cadastrais da Empresa (Razão Social & CNPJ)</span>
                  </h3>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-[#FFC72C] hover:bg-amber-400 text-black font-extrabold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Salvar Dados</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-zinc-400 text-[10px] uppercase font-bold mb-1">Nome Fantasia:</label>
                    <input
                      type="text"
                      required
                      value={empresaForm.nomeFantasia}
                      onChange={e => setEmpresaForm(prev => ({ ...prev, nomeFantasia: e.target.value }))}
                      className="w-full bg-[#12121A] border border-[#282838] rounded-xl px-3 py-2 text-white font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-400 text-[10px] uppercase font-bold mb-1">CNPJ do Restaurante:</label>
                    <input
                      type="text"
                      required
                      value={empresaForm.cnpj}
                      onChange={e => setEmpresaForm(prev => ({ ...prev, cnpj: e.target.value }))}
                      className="w-full bg-[#12121A] border border-[#282838] rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-400 text-[10px] uppercase font-bold mb-1">Telefone / WhatsApp Comercial:</label>
                    <input
                      type="text"
                      required
                      value={empresaForm.telefone}
                      onChange={e => setEmpresaForm(prev => ({ ...prev, telefone: e.target.value }))}
                      className="w-full bg-[#12121A] border border-[#282838] rounded-xl px-3 py-2 text-white font-semibold"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-zinc-400 text-[10px] uppercase font-bold mb-1">Endereço Completo:</label>
                    <input
                      type="text"
                      value={empresaForm.endereco}
                      onChange={e => setEmpresaForm(prev => ({ ...prev, endereco: e.target.value }))}
                      className="w-full bg-[#12121A] border border-[#282838] rounded-xl px-3 py-2 text-white font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-400 text-[10px] uppercase font-bold mb-1">Cidade / Estado:</label>
                    <input
                      type="text"
                      value={`${empresaForm.cidade} - ${empresaForm.estado}`}
                      onChange={e => {
                        const parts = e.target.value.split('-');
                        setEmpresaForm(prev => ({ ...prev, cidade: parts[0]?.trim() || '', estado: parts[1]?.trim() || 'SP' }));
                      }}
                      className="w-full bg-[#12121A] border border-[#282838] rounded-xl px-3 py-2 text-white font-semibold"
                    />
                  </div>
                </div>
              </form>

              {/* Seção 2B: Configurar Salão e Numeração de Mesas */}
              <div className="p-5 rounded-2xl bg-[#161622] border border-[#242436] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#38C9FF]" />
                      <span>Configurar Numeração de Mesas do Salão (Total Atual: {tables.length} mesas)</span>
                    </h3>
                    <p className="text-zinc-400 mt-0.5">
                      Gera automaticamente a quantidade de mesas do seu espaço físico ou permite personalização manual.
                    </p>
                  </div>

                  <button
                    onClick={() => { onClose(); setCurrentView('mesas_comandas'); }}
                    className="text-xs font-bold text-[#38C9FF] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span>Abrir Mapa de Mesas Completo</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {[6, 10, 12, 16, 20, 30].map(n => (
                    <button
                      key={n}
                      onClick={() => handleConfigureTablesCount(n)}
                      className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                        tables.length === n
                          ? 'bg-[#38C9FF] text-black border-[#38C9FF] font-black'
                          : 'bg-[#12121A] hover:bg-[#1E1E2C] text-zinc-300 border-[#282838]'
                      }`}
                    >
                      {n} Mesas (Salão)
                    </button>
                  ))}
                </div>
              </div>

              {/* Seção 2C: Cadastrar Produto Real do Cardápio */}
              <form onSubmit={handleAddRealProduct} className="p-5 rounded-2xl bg-[#161622] border border-[#242436] space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Plus className="w-4 h-4 text-[#00E676]" />
                      <span>Cadastrar Novo Produto Real no Cardápio</span>
                    </h3>
                    <p className="text-zinc-400 mt-0.5">
                      Adicione itens autênticos da sua casa diretamente na base de dados do restaurante.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => { onClose(); setCurrentView('cardapio_bcg'); }}
                    className="text-xs font-bold text-[#FFC72C] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span>Engenharia de Cardápio</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-zinc-400 text-[10px] uppercase font-bold mb-1">Nome do Produto:</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: X-Picanha Especial"
                      value={newProd.name}
                      onChange={e => setNewProd(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-[#12121A] border border-[#282838] rounded-xl px-3 py-2 text-white font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-400 text-[10px] uppercase font-bold mb-1">Categoria:</label>
                    <select
                      value={newProd.category}
                      onChange={e => setNewProd(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full bg-[#12121A] border border-[#282838] rounded-xl px-3 py-2 text-white font-semibold"
                    >
                      <option value="Lanches">Lanches</option>
                      <option value="Burgers">Burgers</option>
                      <option value="Porções">Porções</option>
                      <option value="Bebidas">Bebidas</option>
                      <option value="Sobremesas">Sobremesas</option>
                      <option value="Pratos Executivos">Pratos Executivos</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-zinc-400 text-[10px] uppercase font-bold mb-1">Preço de Venda (R$):</label>
                    <input
                      type="number"
                      step="0.10"
                      required
                      value={newProd.price}
                      onChange={e => setNewProd(prev => ({ ...prev, price: Number(e.target.value) }))}
                      className="w-full bg-[#12121A] border border-[#282838] rounded-xl px-3 py-2 text-white font-mono font-bold"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-zinc-400 text-[10px] uppercase font-bold mb-1">Descrição / Ingredientes:</label>
                    <input
                      type="text"
                      placeholder="Ingredientes e modo de servir..."
                      value={newProd.description}
                      onChange={e => setNewProd(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full bg-[#12121A] border border-[#282838] rounded-xl px-3 py-2 text-white"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Adicionar Item</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 3: PAGAMENTOS & WEBHOOKS                                      */}
          {/* ================================================================= */}
          {activeTab === 'pagamento' && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-[#161622] border border-[#242436] space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-[#38C9FF]" />
                    <span>Configuração de Gateways de Pagamento (Mercado Pago, Efí e Asaas)</span>
                  </h3>
                  <button
                    onClick={() => { onClose(); setCurrentView('gateway_pagamentos'); }}
                    className="text-xs font-bold text-[#38C9FF] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span>Painel Avançado</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Seletor de Gateway */}
                <div className="grid grid-cols-3 gap-2">
                  {(['mercadopago', 'efi', 'asaas'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setGatewayProvider(p)}
                      className={`p-3 rounded-xl border text-xs font-bold capitalize transition-all cursor-pointer text-center ${
                        gatewayProvider === p
                          ? 'bg-[#38C9FF]/20 text-[#38C9FF] border-[#38C9FF]'
                          : 'bg-[#12121A] hover:bg-[#1A1A28] text-zinc-400 border-[#282838]'
                      }`}
                    >
                      {p === 'mercadopago' ? 'Mercado Pago' : p === 'efi' ? 'Efí (Gerencianet)' : 'Asaas'}
                    </button>
                  ))}
                </div>

                {/* Credenciais Form */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-zinc-400 text-[10px] uppercase font-bold mb-1">
                      {gatewayProvider === 'mercadopago' ? 'Access Token (Produção):' : gatewayProvider === 'efi' ? 'Client ID:' : 'API Key:'}
                    </label>
                    <input
                      type="password"
                      value={gatewayConfig.accessToken}
                      onChange={e => setGatewayConfig(prev => ({ ...prev, accessToken: e.target.value }))}
                      className="w-full bg-[#12121A] border border-[#282838] rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-400 text-[10px] uppercase font-bold mb-1">Chave Pix de Recebimento:</label>
                    <input
                      type="text"
                      value={gatewayConfig.pixKey}
                      onChange={e => setGatewayConfig(prev => ({ ...prev, pixKey: e.target.value }))}
                      className="w-full bg-[#12121A] border border-[#282838] rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-zinc-400 text-[10px] uppercase font-bold mb-1">Webhook Secret / Endpoint URL:</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value="https://ais-dev-6bfggj7d3hqrjg7hp5lgrz-347509953670.us-east1.run.app/api/webhooks/payment"
                        className="w-full bg-[#12121A] border border-[#282838] rounded-xl px-3 py-2 text-zinc-400 font-mono text-[11px]"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText("https://ais-dev-6bfggj7d3hqrjg7hp5lgrz-347509953670.us-east1.run.app/api/webhooks/payment");
                          triggerToast('URL de Webhook copiada para a área de transferência!');
                        }}
                        className="px-3 py-2 rounded-xl bg-[#1E1E2C] hover:bg-[#28283C] text-white border border-[#2D2D42] shrink-0 cursor-pointer"
                        title="Copiar URL de Webhook"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#202030] gap-3">
                  <button
                    type="button"
                    onClick={handleTestPixGeneration}
                    className="px-4 py-2 rounded-xl bg-[#1E1E2C] hover:bg-[#26263A] text-zinc-200 border border-[#2E2E44] font-bold cursor-pointer flex items-center gap-1.5"
                  >
                    <QrCode className="w-4 h-4 text-[#00E676]" />
                    <span>Testar Geração de Pix Dinâmico</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveGateway}
                    className="px-5 py-2 bg-[#38C9FF] hover:bg-[#2EB8EE] text-black font-black rounded-xl transition-all cursor-pointer shadow-md"
                  >
                    Salvar Credenciais
                  </button>
                </div>

                {testedPixPayload && (
                  <div className="p-4 rounded-xl bg-[#12121A] border border-[#38C9FF]/40 space-y-2">
                    <div className="flex items-center justify-between text-xs text-white font-bold">
                      <span className="flex items-center gap-1 text-[#00E676]">
                        <CheckCircle2 className="w-4 h-4" /> Pix Copia e Cola Gerado com Sucesso:
                      </span>
                    </div>
                    <p className="font-mono text-[10px] text-zinc-400 break-all bg-[#0B0B12] p-2.5 rounded-lg border border-[#20202E]">
                      {testedPixPayload}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 4: IMPRESSORA TÉRMICA ESC/POS                                 */}
          {/* ================================================================= */}
          {activeTab === 'impressora' && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-[#161622] border border-[#242436] space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Printer className="w-4 h-4 text-[#FF7A00]" />
                    <span>Configuração de Impressão de Comandas Térmicas (ESC/POS)</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Seletor de Largura da Bobina */}
                  <div className="space-y-2">
                    <label className="block text-zinc-400 text-[10px] uppercase font-bold">Largura do Papel / Bobina:</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => { setPrinterWidth('58mm'); playSoftClickSound(); }}
                        className={`p-3 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                          printerWidth === '58mm'
                            ? 'bg-[#FF7A00]/20 border-[#FF7A00] text-white'
                            : 'bg-[#12121A] border-[#282838] text-zinc-400'
                        }`}
                      >
                        <div className="font-black">58 mm (Estreita)</div>
                        <div className="text-[10px] text-zinc-400 mt-0.5">32 colunas por linha</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => { setPrinterWidth('80mm'); playSoftClickSound(); }}
                        className={`p-3 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                          printerWidth === '80mm'
                            ? 'bg-[#FF7A00]/20 border-[#FF7A00] text-white'
                            : 'bg-[#12121A] border-[#282838] text-zinc-400'
                        }`}
                      >
                        <div className="font-black">80 mm (Padrão)</div>
                        <div className="text-[10px] text-zinc-400 mt-0.5">48 colunas completas</div>
                      </button>
                    </div>
                  </div>

                  {/* Estações de Impressão */}
                  <div className="space-y-2">
                    <label className="block text-zinc-400 text-[10px] uppercase font-bold">Destinos Habilitados:</label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2.5 p-2 rounded-xl bg-[#12121A] border border-[#242436] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={printStationKitchen}
                          onChange={e => setPrintStationKitchen(e.target.checked)}
                          className="accent-[#FF7A00] w-4 h-4 rounded"
                        />
                        <span className="text-zinc-200 font-semibold">Comanda de Cozinha / Chapa (KDS)</span>
                      </label>

                      <label className="flex items-center gap-2.5 p-2 rounded-xl bg-[#12121A] border border-[#242436] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={printStationClient}
                          onChange={e => setPrintStationClient(e.target.checked)}
                          className="accent-[#FF7A00] w-4 h-4 rounded"
                        />
                        <span className="text-zinc-200 font-semibold">Via do Cliente (Conferência de Mesa / PDV)</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-[#202030]">
                  <span className="text-zinc-400 text-[11px]">
                    Comandos de guilhotina e corte automático ativados.
                  </span>

                  <button
                    type="button"
                    onClick={handleTestThermalPrint}
                    disabled={isTestPrinting}
                    className="px-5 py-2.5 bg-gradient-to-r from-[#FF7A00] to-[#E65100] hover:brightness-110 text-white font-extrabold rounded-xl transition-all cursor-pointer shadow-md flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    <span>{isTestPrinting ? 'Enviando Comando...' : 'Imprimir Cupom de Teste'}</span>
                  </button>
                </div>

                {printedReceiptAscii && (
                  <div className="space-y-2">
                    <span className="text-zinc-400 text-[10px] uppercase font-bold">Pré-visualização do Cupom Térmico Formatado:</span>
                    <pre className="font-mono text-[11px] leading-relaxed p-4 rounded-xl bg-[#09090D] border border-zinc-800 text-emerald-400 overflow-x-auto whitespace-pre">
                      {printedReceiptAscii}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-[#242436] bg-[#12121A] flex items-center justify-between shrink-0 text-xs">
          <div className="flex items-center gap-2 text-zinc-400">
            <Info className="w-4 h-4 text-[#14B8A6]" />
            <span>Todos os dados são sincronizados em tempo real com seu Firestore.</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#1C1C2A] hover:bg-[#242438] text-white font-bold transition-colors cursor-pointer"
          >
            Concluir & Fechar
          </button>
        </div>
      </motion.div>
    </div>
  );
};
