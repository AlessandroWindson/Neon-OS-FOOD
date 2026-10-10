import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Share2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Power,
  RefreshCw,
  Sliders,
  Key,
  ShieldCheck,
  Zap,
  Activity,
  ArrowRight,
  Sparkles,
  Layers,
  Database,
  Volume2,
  FileText,
  Clock,
  ExternalLink,
  ChevronRight,
  Copy,
  Check,
  PlusCircle,
  Smartphone,
  Truck,
  RotateCcw
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  marketplaceManager,
  MarketplacePlatformId,
  MarketplaceConfig,
  MarketplaceLog,
  playNewOrderSound,
  IntegrationStatus
} from '../services/universalMarketplaceService';
import { formatBRL } from '../utils/formatters';

export const CentralIntegracoesMarketplace: React.FC = () => {
  const { products, addOrder, tenant } = useApp();
  const [configs, setConfigs] = useState<Record<MarketplacePlatformId, MarketplaceConfig>>(() => marketplaceManager.getConfigs());
  const [logs, setLogs] = useState<MarketplaceLog[]>(() => marketplaceManager.getLogs());
  const [selectedPlatform, setSelectedPlatform] = useState<MarketplacePlatformId>('ifood');
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [filterLog, setFilterLog] = useState<'all' | MarketplacePlatformId>('all');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    showToast(`Copiado para área de transferência: ${label}`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const currentConfig = configs[selectedPlatform];

  const handleToggleEnable = (id: MarketplacePlatformId) => {
    const updated = marketplaceManager.updateConfig(id, {
      enabled: !configs[id].enabled,
      status: !configs[id].enabled ? 'connected' : 'disconnected'
    });
    setConfigs({ ...marketplaceManager.getConfigs() });
    setLogs(marketplaceManager.getLogs());
    showToast(`${updated.name} foi ${updated.enabled ? 'ativado com sucesso' : 'desativado'}.`);
  };

  const handleUpdateConfigField = (id: MarketplacePlatformId, field: keyof MarketplaceConfig, value: any) => {
    marketplaceManager.updateConfig(id, { [field]: value });
    setConfigs({ ...marketplaceManager.getConfigs() });
  };

  const handleTestConnection = async (id: MarketplacePlatformId) => {
    setIsTesting(true);
    const result = await marketplaceManager.testConnection(id);
    setIsTesting(false);
    setConfigs({ ...marketplaceManager.getConfigs() });
    setLogs(marketplaceManager.getLogs());
    if (result.success) {
      showToast(`🟢 ${result.message}`);
    } else {
      showToast(`🔴 ${result.message}`);
    }
  };

  const handleSyncAllCatalogs = async () => {
    setIsSyncingAll(true);
    const res = await marketplaceManager.syncAllCatalogs(products);
    setIsSyncingAll(false);
    setConfigs({ ...marketplaceManager.getConfigs() });
    setLogs(marketplaceManager.getLogs());
    showToast(`✅ ${res.totalSynced} itens sincronizados nos marketplaces: ${res.platforms.join(', ')}`);
  };

  // Simulação de pedido em tempo real chegando do Marketplace
  const handleSimulateIncomingOrder = (platform: MarketplacePlatformId) => {
    playNewOrderSound();
    const cfg = configs[platform];

    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const code = platform === 'ifood' ? `IF-${randomNum}` : platform === '99food' ? `99F-${randomNum}` : `UB-${randomNum}`;

    const orderDulci = {
      id: `ord_${Date.now()}`,
      displayCode: code,
      channel: (platform === 'uber_direct' ? 'uber' : platform) as any,
      orderType: 'delivery' as const,
      customerName: ['Lucas Ferreira (Manaus)', 'Ana Beatriz Melo', 'Carlos Eduardo Silva', 'Camila Amazonas'][Math.floor(Math.random() * 4)],
      customerPhone: '(92) 99182-4412',
      deliveryAddress: 'Av. Djalma Batista, 1661 - Chapada, Manaus - AM',
      items: [
        {
          productId: 'dulci_promo_01',
          name: '3 X-Saladas (Oferta da Casa)',
          quantity: 1,
          unitPrice: 25.00,
          totalPrice: 25.00,
        },
        {
          productId: 'dulci_batata_p',
          name: 'Batata Frita P – 200g',
          quantity: 1,
          unitPrice: 10.00,
          totalPrice: 10.00,
        },
        {
          productId: 'dulci_refri_bare_2l',
          name: 'Baré 2L',
          quantity: 1,
          unitPrice: 10.00,
          totalPrice: 10.00,
        }
      ],
      subtotal: 45.00,
      deliveryFee: 6.00,
      discount: 0,
      total: 51.00,
      paymentMethod: 'online' as const,
      paymentStatus: 'paid' as const,
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: 'Entregar na portaria do condomínio. Tocar interfone 402.'
    };

    addOrder(orderDulci);
    marketplaceManager.addLog({
      platform,
      eventType: 'order_received',
      status: 'success',
      title: `🔥 NOVO PEDIDO RECEBIDO! #${code} (${cfg.name})`,
      details: `Cliente: ${orderDulci.customerName} | Total: ${formatBRL(orderDulci.total)} | Itens: 3 X-Saladas, Batata P, Baré 2L.`,
      payload: orderDulci
    });

    marketplaceManager.updateConfig(platform, {
      totalOrdersReceived: cfg.totalOrdersReceived + 1
    });

    setConfigs({ ...marketplaceManager.getConfigs() });
    setLogs(marketplaceManager.getLogs());

    showToast(`🔥 NOVO PEDIDO RECEBIDO! #${code} via ${cfg.name} (Tocado Alerta Sonoro)`);
  };

  const getStatusBadge = (status: IntegrationStatus) => {
    switch (status) {
      case 'connected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            🟢 Conectado
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            🟡 Atenção
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            🔴 Erro
          </span>
        );
      case 'disconnected':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-zinc-700/30 text-zinc-400 border border-zinc-700/40">
            <span className="w-2 h-2 rounded-full bg-zinc-400" />
            ⚪ Desativado
          </span>
        );
    }
  };

  const filteredLogs = logs.filter(l => filterLog === 'all' || l.platform === filterLog);

  return (
    <div className="space-y-6 pb-16">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 right-6 z-50 px-5 py-3 rounded-xl bg-gradient-to-r from-[#DA291C] to-[#B91C1C] text-white font-bold shadow-2xl border border-[#FFC72C]/40 flex items-center gap-3"
          >
            <Sparkles className="w-5 h-5 text-[#FFC72C] animate-spin" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1A0505] via-[#120303] to-[#0A0A10] border border-[#DA291C]/40 p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[#DA291C]/20 to-[#FFC72C]/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-md text-xs font-black uppercase tracking-wider bg-[#DA291C] text-white shadow-md">
                Fast-Food Omnichannel
              </span>
              <span className="text-xs font-bold text-[#FFC72C] flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" /> Universal Delivery Connector
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
              Central de Integrações & Marketplaces
            </h1>
            <p className="text-sm text-zinc-300 leading-relaxed">
              Conecte a <strong className="text-white">Lanchonete Dulci</strong> às APIs oficiais do <strong className="text-[#EA1D2C]">iFood</strong>, <strong className="text-[#FF9E00]">99Food</strong>, <strong className="text-[#06C167]">Uber Eats</strong> e <strong className="text-[#00D2FF]">Uber Direct</strong>. Sincronização automática de produtos, preços, estoque e recepção de pedidos em tempo real.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleSyncAllCatalogs}
              disabled={isSyncingAll}
              className="px-4 py-3 rounded-xl bg-gradient-to-r from-[#FFC72C] to-[#F59E0B] hover:brightness-110 text-zinc-950 font-black text-sm flex items-center gap-2 shadow-lg transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncingAll ? 'animate-spin' : ''}`} />
              {isSyncingAll ? 'Sincronizando...' : 'Sincronizar Todo o Cardápio'}
            </button>
            <button
              onClick={playNewOrderSound}
              className="px-4 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 font-bold text-sm flex items-center gap-2 transition-all active:scale-95"
              title="Testar alerta sonoro de novo pedido"
            >
              <Volume2 className="w-4 h-4 text-[#FFC72C]" />
              Testar Som de Pedido
            </button>
          </div>
        </div>
      </div>

      {/* Cards de Status Rápido das Plataformas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {(Object.keys(configs) as MarketplacePlatformId[]).map(id => {
          const cfg = configs[id];
          const isSelected = selectedPlatform === id;
          return (
            <motion.div
              key={id}
              whileHover={{ y: -2 }}
              onClick={() => setSelectedPlatform(id)}
              className={`cursor-pointer rounded-2xl p-5 border transition-all relative overflow-hidden ${
                isSelected
                  ? 'bg-gradient-to-br from-zinc-900 to-zinc-950 border-[#FFC72C] shadow-[0_0_20px_rgba(255,199,44,0.15)] ring-1 ring-[#FFC72C]/40'
                  : 'bg-zinc-950/80 hover:bg-zinc-900/80 border-zinc-800/80'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <span className={`text-base font-black ${cfg.tagColor}`}>
                  {cfg.name}
                </span>
                {getStatusBadge(cfg.status)}
              </div>

              <div className="space-y-1 text-xs text-zinc-400">
                <div className="flex justify-between">
                  <span>Ambiente:</span>
                  <span className="font-semibold text-zinc-200 capitalize">{cfg.environment}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pedidos recebidos:</span>
                  <span className="font-bold text-white">{cfg.totalOrdersReceived}</span>
                </div>
                <div className="flex justify-between">
                  <span>Auto-Aceite:</span>
                  <span className={cfg.autoAcceptOrders ? 'text-emerald-400 font-bold' : 'text-zinc-500'}>
                    {cfg.autoAcceptOrders ? 'Ativo' : 'Manual'}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between">
                <span className="text-[11px] text-zinc-400">
                  {cfg.enabled ? '🟢 Canal Ligado' : '⚪ Canal Pausado'}
                </span>
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Workspace Principal da Plataforma Selecionada */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel Esquerdo: Configurações & Credenciais (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-6 space-y-6 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl border ${currentConfig.bgColor} ${currentConfig.borderColor} ${currentConfig.tagColor}`}>
                  {currentConfig.id === 'ifood' ? 'iF' : currentConfig.id === '99food' ? '99' : currentConfig.id === 'uber' ? 'UB' : 'UD'}
                </div>
                <div>
                  <h2 className="text-xl font-black text-white flex items-center gap-2">
                    {currentConfig.name}
                    {getStatusBadge(currentConfig.status)}
                  </h2>
                  <p className="text-xs text-zinc-400">
                    ID da Loja: <span className="font-mono text-zinc-300">{currentConfig.merchantId}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleToggleEnable(selectedPlatform)}
                  className={`px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                    currentConfig.enabled
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
                      : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700'
                  }`}
                >
                  <Power className="w-4 h-4" />
                  {currentConfig.enabled ? 'Canal Ativo' : 'Canal Desativado'}
                </button>
                <button
                  onClick={() => handleTestConnection(selectedPlatform)}
                  disabled={isTesting}
                  className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-bold text-xs flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  <Activity className={`w-4 h-4 text-[#FFC72C] ${isTesting ? 'animate-spin' : ''}`} />
                  {isTesting ? 'Testando...' : 'Testar Conexão'}
                </button>
              </div>
            </div>

            {/* Configurações de API & Chaves Oficiais */}
            <div className="space-y-4">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Key className="w-4 h-4 text-[#FFC72C]" /> Credenciais & Autenticação Oficial
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400">Ambiente de Operação</label>
                  <select
                    value={currentConfig.environment}
                    onChange={e => handleUpdateConfigField(selectedPlatform, 'environment', e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#FFC72C]"
                  >
                    <option value="production">Produção Oficial</option>
                    <option value="homologation">Homologação / Piloto</option>
                    <option value="sandbox">Sandbox / Testes de Desenvolvedor</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400">Merchant ID (Código da Loja Dulci)</label>
                  <input
                    type="text"
                    value={currentConfig.merchantId}
                    onChange={e => handleUpdateConfigField(selectedPlatform, 'merchantId', e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-[#FFC72C]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400">Client ID da Aplicação</label>
                  <input
                    type="text"
                    value={currentConfig.clientId}
                    onChange={e => handleUpdateConfigField(selectedPlatform, 'clientId', e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-[#FFC72C]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400">Client Secret (Token Protegido)</label>
                  <input
                    type="password"
                    value={currentConfig.clientSecret}
                    onChange={e => handleUpdateConfigField(selectedPlatform, 'clientSecret', e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-[#FFC72C]"
                  />
                </div>
              </div>

              {/* Endpoint Webhook da Loja */}
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-[#FFC72C]" /> Endpoint de Webhook (Recepção de Pedidos e Eventos)
                  </label>
                  <button
                    onClick={() => handleCopy(currentConfig.webhookUrl, 'Webhook URL')}
                    className="text-xs text-[#FFC72C] hover:underline flex items-center gap-1 font-bold"
                  >
                    {copiedKey === 'Webhook URL' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedKey === 'Webhook URL' ? 'Copiado!' : 'Copiar URL'}
                  </button>
                </div>
                <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-zinc-300 break-all select-all flex items-center justify-between">
                  <span>{currentConfig.webhookUrl}</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Insira este endpoint no Portal de Desenvolvedor da plataforma ({currentConfig.name}) para receber eventos instantâneos.
                </p>
              </div>
            </div>

            {/* Parâmetros de Sincronização Automática */}
            <div className="space-y-3 pt-4 border-t border-zinc-800">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#FFC72C]" /> Parâmetros de Operação & Cardápio
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 cursor-pointer hover:bg-zinc-900 transition-all">
                  <input
                    type="checkbox"
                    checked={currentConfig.autoAcceptOrders}
                    onChange={e => handleUpdateConfigField(selectedPlatform, 'autoAcceptOrders', e.target.checked)}
                    className="w-4 h-4 rounded text-[#DA291C] focus:ring-[#FFC72C]"
                  />
                  <div>
                    <div className="text-xs font-bold text-white">Auto-Aceitar Pedidos</div>
                    <div className="text-[10px] text-zinc-400">Envia direto para a cozinha/KDS</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 cursor-pointer hover:bg-zinc-900 transition-all">
                  <input
                    type="checkbox"
                    checked={currentConfig.syncCatalogEnabled}
                    onChange={e => handleUpdateConfigField(selectedPlatform, 'syncCatalogEnabled', e.target.checked)}
                    className="w-4 h-4 rounded text-[#DA291C] focus:ring-[#FFC72C]"
                  />
                  <div>
                    <div className="text-xs font-bold text-white">Sincronizar Catálogo</div>
                    <div className="text-[10px] text-zinc-400">Atualiza fotos, descrições e preços</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 cursor-pointer hover:bg-zinc-900 transition-all">
                  <input
                    type="checkbox"
                    checked={currentConfig.syncStockEnabled}
                    onChange={e => handleUpdateConfigField(selectedPlatform, 'syncStockEnabled', e.target.checked)}
                    className="w-4 h-4 rounded text-[#DA291C] focus:ring-[#FFC72C]"
                  />
                  <div>
                    <div className="text-xs font-bold text-white">Estoque & Pausa</div>
                    <div className="text-[10px] text-zinc-400">Pausa item se esgotar no PDV</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Ações de Teste e Simulação */}
            <div className="pt-4 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-zinc-400">
                Última sincronização: <span className="text-zinc-200 font-semibold">{currentConfig.lastSyncAt ? new Date(currentConfig.lastSyncAt).toLocaleTimeString() : 'Pendente'}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSimulateIncomingOrder(selectedPlatform)}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#DA291C] to-[#B91C1C] hover:brightness-110 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-all active:scale-95"
                >
                  <Zap className="w-4 h-4 text-[#FFC72C]" />
                  Simular Pedido Recebido via {currentConfig.name}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Painel Direito: Logs de Integração & Eventos (1 col) */}
        <div className="space-y-4">
          <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#FFC72C]" /> Logs & Webhooks em Tempo Real
              </h3>
              <span className="text-xs text-zinc-500">{filteredLogs.length} eventos</span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {(['all', 'ifood', '99food', 'uber', 'uber_direct'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setFilterLog(tab)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${
                    filterLog === tab
                      ? 'bg-[#FFC72C] text-zinc-950 shadow-sm'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white'
                  }`}
                >
                  {tab === 'all' ? 'Todos' : tab.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
              {filteredLogs.map(log => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800/80 space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-black uppercase text-[10px] px-1.5 py-0.5 rounded ${
                      log.platform === 'ifood' ? 'bg-[#EA1D2C]/20 text-[#EA1D2C]' :
                      log.platform === '99food' ? 'bg-[#FF9E00]/20 text-[#FF9E00]' :
                      log.platform === 'uber' ? 'bg-[#06C167]/20 text-[#06C167]' : 'bg-[#00D2FF]/20 text-[#00D2FF]'
                    }`}>
                      {log.platform}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="font-bold text-zinc-200">
                    {log.title}
                  </div>

                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    {log.details}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
