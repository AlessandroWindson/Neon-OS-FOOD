import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  Share2, 
  Copy, 
  Check, 
  ExternalLink, 
  QrCode, 
  Printer, 
  Sparkles, 
  Phone, 
  Send, 
  Smartphone, 
  UtensilsCrossed, 
  Truck, 
  Tag, 
  FileText, 
  Eye, 
  Save, 
  CheckCircle2, 
  RotateCcw, 
  Flame, 
  HelpCircle,
  Clock,
  Zap,
  Users,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { playBeep, playCashRegister } from '../utils/audio';

type TemplateType = 'greeting' | 'table' | 'delivery' | 'promo' | 'pdf';

export const WhatsAppConfiguracaoCompartilhamento: React.FC = () => {
  const { tenant, updateTenantSettings, tables } = useApp();
  
  // Local Settings State
  const [whatsappNumber, setWhatsappNumber] = useState(tenant.settings.whatsappNumber || '92993032598');
  const [menuSlug, setMenuSlug] = useState(tenant.settings.menuCustomSlug || 'lanchonete-dulci');
  const [menuDomain, setMenuDomain] = useState(tenant.settings.menuCustomDomain || 'https://neonfood.app/cardapio');
  const [enableBot, setEnableBot] = useState(tenant.settings.enableWhatsappBot ?? true);
  const [linkGeneratedFeedback, setLinkGeneratedFeedback] = useState(false);
  const [activeLinkChannel, setActiveLinkChannel] = useState<'geral' | 'mesa' | 'delivery' | 'promo'>('geral');
  
  // Templates
  const [activeTemplateTab, setActiveTemplateTab] = useState<TemplateType>('greeting');
  const [greetingTpl, setGreetingTpl] = useState(
    tenant.settings.whatsappGreetingTemplate || 
    '🍔 *Olá! Seja muito bem-vindo à {loja}!* 🍟\n\nConfira nosso cardápio digital completo com fotos, combos e promoções exclusivas:\n👉 {link_cardapio}\n\nFaça seu pedido diretamente pelo link ou mande sua dúvida por aqui!'
  );
  const [tableTpl, setTableTpl] = useState(
    tenant.settings.whatsappTableTemplate || 
    '🍽️ *Cardápio de Mesa - {loja}* (Mesa {mesa})\n\nOlá! Para fazer seu pedido direto para a cozinha sem esperar o atendente, acesse:\n👉 {link_cardapio}?mesa={mesa}\n\nNosso atendente está à sua disposição no salão!'
  );
  const [deliveryTpl, setDeliveryTpl] = useState(
    tenant.settings.whatsappDeliveryTemplate || 
    '🛵 *Delivery Rápido - {loja}*\n\nPeça os melhores x-saladas artesanais, pizzas crocantes, pastéis e porções no conforto da sua casa:\n👉 {link_cardapio}?origem=delivery\n\n⚡ Entrega rápida em Manaus! Tempo estimado: 25-35 min.'
  );
  const [promoTpl, setPromoTpl] = useState(
    tenant.settings.whatsappPromoTemplate || 
    '🔥 *PROMOÇÃO RELÂMPAGO DO DIA - {loja}* 🔥\n\nGanhe *10% OFF* no seu pedido hoje usando o cupom *DULCI10*!\n\nAcesse nosso cardápio digital:\n👉 {link_cardapio}?cupom=DULCI10\n\n_Válido apenas hoje até às 23h59._'
  );
  const [pdfTpl, setPdfTpl] = useState(
    tenant.settings.whatsappPdfTemplate || 
    '📄 *Cardápio Completo em PDF / Panfleto - {loja}*\n\nQuer ver nosso menu em formato clássico ou imprimir para sua equipe?\nAcesse nosso PDF interativo:\n👉 {link_cardapio}?modo=pdf\n\nOu faça seu pedido online direto pelo site!'
  );

  // Quick Dispatcher Tool State (para os atendentes)
  const [targetCustomerPhone, setTargetCustomerPhone] = useState('');
  const [selectedTable, setSelectedTable] = useState('01');
  const [customPromoCode, setCustomPromoCode] = useState('DULCI10');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [copiedApiEndpoint, setCopiedApiEndpoint] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // Helper formatting for phone
  const cleanPhone = (val: string) => val.replace(/\D/g, '');
  
  const formatPhoneMask = (val: string) => {
    const numbers = cleanPhone(val);
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  // Auto Generate Custom Menu Link
  const handleAutoGenerateLink = () => {
    const generatedSlug = (tenant.name || 'minha-loja')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    setMenuSlug(generatedSlug);
    setLinkGeneratedFeedback(true);
    playBeep(900, 0.08);
    setTimeout(() => setLinkGeneratedFeedback(false), 2500);
  };

  // Base Generated Menu Link
  const baseMenuUrl = useMemo(() => {
    const cleanSlug = menuSlug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    let url = `${menuDomain}?loja=${cleanSlug || 'neon-food'}`;
    if (activeLinkChannel === 'mesa') url += `&mesa=${selectedTable}`;
    if (activeLinkChannel === 'delivery') url += `&origem=delivery`;
    if (activeLinkChannel === 'promo') url += `&cupom=${customPromoCode}`;
    return url;
  }, [menuDomain, menuSlug, activeLinkChannel, selectedTable, customPromoCode]);

  // WhatsApp API URL for direct link sharing
  const whatsAppApiShareUrl = useMemo(() => {
    const textToShare = `Olá! Acesse nosso cardápio digital completo: ${baseMenuUrl}`;
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(textToShare)}`;
  }, [baseMenuUrl]);

  // Compiled text for active template
  const getCompiledTemplate = (tplType: TemplateType) => {
    let raw = '';
    switch (tplType) {
      case 'greeting': raw = greetingTpl; break;
      case 'table': raw = tableTpl; break;
      case 'delivery': raw = deliveryTpl; break;
      case 'promo': raw = promoTpl; break;
      case 'pdf': raw = pdfTpl; break;
    }

    return raw
      .replace(/{loja}/g, tenant.name)
      .replace(/{link_cardapio}/g, baseMenuUrl)
      .replace(/{mesa}/g, selectedTable)
      .replace(/{cupom}/g, customPromoCode)
      .replace(/{taxa_entrega}/g, `R$ ${tenant.settings.defaultDeliveryFee.toFixed(2)}`);
  };

  const currentCompiledMessage = useMemo(() => {
    return getCompiledTemplate(activeTemplateTab);
  }, [activeTemplateTab, greetingTpl, tableTpl, deliveryTpl, promoTpl, pdfTpl, tenant.name, baseMenuUrl, selectedTable, customPromoCode, tenant.settings.defaultDeliveryFee]);

  // Handle Save
  const handleSaveSettings = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    updateTenantSettings({
      whatsappNumber: cleanPhone(whatsappNumber),
      whatsappCustomLink: `https://wa.me/55${cleanPhone(whatsappNumber)}`,
      menuCustomSlug: menuSlug,
      menuCustomDomain: menuDomain,
      enableWhatsappBot: enableBot,
      whatsappGreetingTemplate: greetingTpl,
      whatsappTableTemplate: tableTpl,
      whatsappDeliveryTemplate: deliveryTpl,
      whatsappPromoTemplate: promoTpl,
      whatsappPdfTemplate: pdfTpl,
    });
    setSavedSuccess(true);
    playCashRegister();
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Copy Link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(baseMenuUrl);
    setCopiedLink(true);
    playBeep(880, 0.08);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Copy Full Formatted Message
  const handleCopyMessage = () => {
    navigator.clipboard.writeText(currentCompiledMessage);
    setCopiedMsg(true);
    playBeep(980, 0.08);
    setTimeout(() => setCopiedMsg(false), 2000);
  };

  // Send Direct via WhatsApp Web / App API
  const handleSendViaWhatsApp = (toPhone?: string) => {
    const rawTarget = toPhone ? cleanPhone(toPhone) : cleanPhone(targetCustomerPhone);
    const targetWithDDI = rawTarget.length === 10 || rawTarget.length === 11 ? `55${rawTarget}` : rawTarget;
    const encodedText = encodeURIComponent(currentCompiledMessage);
    
    let url = '';
    if (targetWithDDI) {
      url = `https://api.whatsapp.com/send?phone=${targetWithDDI}&text=${encodedText}`;
    } else {
      // General sharing link
      url = `https://api.whatsapp.com/send?text=${encodedText}`;
    }
    
    window.open(url, '_blank');
    playBeep(1040, 0.1);
  };

  // Open Direct WhatsApp conversation with the store
  const handleOpenStoreWhatsApp = () => {
    const num = cleanPhone(whatsappNumber);
    const url = num ? `https://wa.me/55${num}` : `https://wa.me/`;
    window.open(url, '_blank');
    playBeep(900, 0.05);
  };

  // Insert tag into active template
  const insertTag = (tag: string) => {
    playBeep(650, 0.05);
    const updateMap = {
      greeting: () => setGreetingTpl(prev => prev + ' ' + tag),
      table: () => setTableTpl(prev => prev + ' ' + tag),
      delivery: () => setDeliveryTpl(prev => prev + ' ' + tag),
      promo: () => setPromoTpl(prev => prev + ' ' + tag),
      pdf: () => setPdfTpl(prev => prev + ' ' + tag),
    };
    updateMap[activeTemplateTab]();
  };

  // Reset Template to Default
  const resetToDefault = () => {
    if (activeTemplateTab === 'greeting') {
      setGreetingTpl('🍔 *Olá! Seja muito bem-vindo ao {loja}!* 🍕\n\nConfira nosso cardápio digital completo com fotos, combos e promoções exclusivas:\n👉 {link_cardapio}\n\nFaça seu pedido diretamente pelo link ou mande sua dúvida por aqui!');
    } else if (activeTemplateTab === 'table') {
      setTableTpl('🍽️ *Cardápio de Mesa - {loja}* (Mesa {mesa})\n\nOlá! Para fazer seu pedido direto para a cozinha sem esperar o atendente, acesse:\n👉 {link_cardapio}?mesa={mesa}\n\nNosso atendente está à sua disposição no salão!');
    } else if (activeTemplateTab === 'delivery') {
      setDeliveryTpl('🛵 *Delivery Rápido - {loja}*\n\nPeça os melhores smash burgers, pizzas artesanais e porções crocantes no conforto da sua casa:\n👉 {link_cardapio}?origem=delivery\n\n⚡ Frete Grátis acima de R$ 80,00! Tempo estimado: 25-35 min.');
    } else if (activeTemplateTab === 'promo') {
      setPromoTpl('🔥 *PROMOÇÃO RELÂMPAGO DO DIA - {loja}* 🔥\n\nGanhe *10% OFF* no seu pedido hoje usando o cupom *DULCI10*!\n\nAcesse nosso cardápio digital:\n👉 {link_cardapio}?cupom=DULCI10\n\n_Válido apenas hoje até às 23h59._');
    } else if (activeTemplateTab === 'pdf') {
      setPdfTpl('📄 *Cardápio Completo em PDF / Panfleto - {loja}*\n\nQuer ver nosso menu em formato clássico ou imprimir para sua equipe?\nAcesse nosso PDF interativo:\n👉 {link_cardapio}?modo=pdf\n\nOu faça seu pedido online direto pelo site!');
    }
  };

  return (
    <div className="space-y-6 select-none">
      {/* Banner de Cabeçalho da Seção Integração WhatsApp */}
      <motion.div 
        layout
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="relative overflow-hidden p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-[#0C1A14] via-[#12241C] to-[#0A1612] border border-[#00E676]/30 shadow-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6"
      >
        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#00E676] px-3 py-1 rounded-full bg-[#00E676]/15 border border-[#00E676]/30 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-[#00E676]" />
              INTEGRAÇÃO WHATSAPP & API
            </span>
            <span className="text-xs text-[#71717A]">•</span>
            <span className="text-xs font-bold text-[#FFC72C]">Cardápio Digital & Compartilhamento Rápido</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-display text-white tracking-tight pt-1">
            Integração WhatsApp & Link do Cardápio
          </h1>
          <p className="text-xs sm:text-sm text-[#A1A1AA] max-w-3xl leading-relaxed">
            Configure o número de telefone da loja, gere automaticamente o link personalizado do cardápio digital e compartilhe com clientes em 1 clique via API oficial do WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-3 z-10 w-full sm:w-auto">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => handleSendViaWhatsApp()}
            className="flex-1 sm:flex-none bg-[#25D366] hover:bg-[#20bd5a] text-black px-5 py-3 rounded-2xl text-xs sm:text-sm font-black shadow-[0_0_20px_rgba(37,211,102,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer border border-[#25D366]"
          >
            <Send className="w-4 h-4" />
            <span>DISPARAR VIA API</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleSaveSettings}
            className="flex-1 sm:flex-none bg-gradient-to-r from-[#DA291C] to-[#FF6B00] hover:brightness-110 text-white px-6 py-3 rounded-2xl text-xs sm:text-sm font-black shadow-[0_0_20px_rgba(218,41,28,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer border border-[#FFC72C]/40"
          >
            <Save className="w-4 h-4 text-[#FFC72C]" />
            <span>SALVAR CONFIGURAÇÕES</span>
          </motion.button>
        </div>

        {/* Glow de fundo */}
        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-[#00E676]/10 rounded-full blur-3xl pointer-events-none" />
      </motion.div>

      {/* Alerta de Sucesso */}
      <AnimatePresence>
        {savedSuccess && (
          <motion.div 
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="p-4 bg-[#00E676]/20 border border-[#00E676] rounded-2xl text-xs sm:text-sm text-[#00E676] font-bold flex items-center gap-3 shadow-lg overflow-hidden"
          >
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>Configurações do WhatsApp salvas com sucesso! O link do cardápio e as mensagens já estão ativos para todos os atendentes.</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid Principal: 2 Colunas (Configurações + Central de Envio Rápido do Atendente) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Coluna da Esquerda (7 cols): Configurações e Modelos de Mensagem */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Card 1: Número do WhatsApp & Gerador de Link Personalizado */}
          <div className="bg-[#12121A] border border-[#242438] p-6 rounded-3xl space-y-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white flex items-center gap-2.5">
                <Phone className="w-5 h-5 text-[#25D366]" />
                <span>Integração WhatsApp & Link do Cardápio</span>
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#00E676] bg-[#00E676]/15 border border-[#00E676]/30 px-2.5 py-0.5 rounded-full">
                API Conectada
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Campo de Telefone da Loja */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#A1A1AA] mb-1.5 flex items-center justify-between">
                  <span>Telefone WhatsApp da Loja</span>
                  <span className="text-[10px] text-[#25D366]">DDI +55 (Brasil)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#71717A]">
                    🇧🇷 +55
                  </span>
                  <input
                    type="text"
                    value={formatPhoneMask(whatsappNumber)}
                    onChange={e => setWhatsappNumber(e.target.value)}
                    placeholder="(11) 98765-4321"
                    className="w-full bg-[#161624] border border-[#282838] rounded-2xl pl-20 pr-4 py-2.5 text-xs sm:text-sm text-white font-bold tracking-wide focus:border-[#25D366] focus:ring-1 focus:ring-[#25D366] focus:outline-none transition-all"
                  />
                </div>
                <p className="text-[10px] text-[#71717A] mt-1">
                  Número para recebimento de pedidos automáticos do cardápio digital.
                </p>
              </div>

              {/* Slug / Identificador da Loja */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#A1A1AA] mb-1.5">
                  Identificador / Slug da Loja
                </label>
                <input
                  type="text"
                  value={menuSlug}
                  onChange={e => setMenuSlug(e.target.value)}
                  placeholder="lanchonete-dulci"
                  className="w-full bg-[#161624] border border-[#282838] rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-white font-bold focus:border-[#FFC72C] focus:ring-1 focus:ring-[#FFC72C] focus:outline-none transition-all"
                />
                <p className="text-[10px] text-[#71717A] mt-1">
                  Nome único na URL do cardápio web responsivo.
                </p>
              </div>
            </div>

            {/* BOTÃO DEDICADO: Gerar Automaticamente Link Personalizado */}
            <div className="p-4 bg-gradient-to-r from-[#16201B] to-[#121A15] border border-[#00E676]/40 rounded-2xl space-y-3 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <div className="text-xs font-black text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#00E676]" />
                    <span>Gerador Inteligente de Link do Cardápio</span>
                  </div>
                  <p className="text-[11px] text-[#A1A1AA]">
                    Cria automaticamente o link oficial otimizado para o WhatsApp
                  </p>
                </div>

                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  type="button"
                  onClick={handleAutoGenerateLink}
                  className="px-4 py-2.5 bg-[#00E676] hover:bg-[#00C853] text-black font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(0,230,118,0.4)] cursor-pointer transition-all shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Gerar Link Personalizado</span>
                </motion.button>
              </div>

              {/* Seletor de Canais do Link (Geral, Mesa, Delivery, Promo) */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-[#24332A]">
                <span className="text-[10px] font-bold text-[#71717A] uppercase mr-1">Canal do Link:</span>
                <button
                  type="button"
                  onClick={() => setActiveLinkChannel('geral')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    activeLinkChannel === 'geral'
                      ? 'bg-[#00E676] text-black'
                      : 'bg-[#1C2822] text-[#A1A1AA] hover:text-white'
                  }`}
                >
                  Geral
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLinkChannel('mesa')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    activeLinkChannel === 'mesa'
                      ? 'bg-[#FFC72C] text-black'
                      : 'bg-[#1C2822] text-[#A1A1AA] hover:text-white'
                  }`}
                >
                  Mesa {selectedTable}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLinkChannel('delivery')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    activeLinkChannel === 'delivery'
                      ? 'bg-[#FF6B00] text-white'
                      : 'bg-[#1C2822] text-[#A1A1AA] hover:text-white'
                  }`}
                >
                  Delivery
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLinkChannel('promo')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    activeLinkChannel === 'promo'
                      ? 'bg-[#DA291C] text-white'
                      : 'bg-[#1C2822] text-[#A1A1AA] hover:text-white'
                  }`}
                >
                  Cupom {customPromoCode}
                </button>
              </div>

              {/* Link Gerado com Ações */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={baseMenuUrl}
                  className="flex-1 bg-[#090E0C] border border-[#203328] rounded-xl px-3.5 py-2 text-xs text-[#00E676] font-mono select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3.5 py-2 bg-[#00E676]/20 hover:bg-[#00E676]/30 border border-[#00E676]/40 text-[#00E676] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                  title="Copiar Link"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-[#00E676]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copiado!' : 'Copiar'}</span>
                </button>
                <a
                  href={baseMenuUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 bg-[#1C2822] hover:bg-[#25362E] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center shrink-0"
                  title="Abrir Cardápio em Nova Aba"
                >
                  <ExternalLink className="w-4 h-4 text-[#FFC72C]" />
                </a>
              </div>
            </div>

            {/* OPÇÕES DE COMPARTILHAMENTO RÁPIDO VIA API DO WHATSAPP */}
            <div className="p-4 bg-[#161624] border border-[#2A2A40] rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-black text-white flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-[#25D366]" />
                  <span>Opções de Compartilhamento Rápido via API do WhatsApp</span>
                </div>
                <span className="text-[10px] bg-[#25D366]/20 text-[#25D366] px-2 py-0.5 rounded font-mono font-bold">
                  api.whatsapp.com
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleSendViaWhatsApp()}
                  className="p-3 bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/40 rounded-xl text-left flex items-center justify-between group cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#25D366] text-black flex items-center justify-center font-bold">
                      <Send className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-[#25D366] transition-colors">
                        Compartilhar Geral (API)
                      </div>
                      <div className="text-[10px] text-[#71717A]">
                        Abre WhatsApp com link pronto
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#25D366] group-hover:translate-x-0.5 transition-transform" />
                </button>

                <button
                  type="button"
                  onClick={handleOpenStoreWhatsApp}
                  className="p-3 bg-[#1C1C2C] hover:bg-[#25253A] border border-[#2E2E44] rounded-xl text-left flex items-center justify-between group cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#25D366]/20 text-[#25D366] flex items-center justify-center font-bold">
                      <Phone className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-[#25D366] transition-colors">
                        Conversa Oficial (wa.me)
                      </div>
                      <div className="text-[10px] text-[#71717A]">
                        wa.me/55{cleanPhone(whatsappNumber) || '11987654321'}
                      </div>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-[#A1A1AA] group-hover:text-white" />
                </button>
              </div>

              {/* Endpoint API Preview */}
              <div className="p-2.5 bg-[#0D0D14] rounded-xl border border-zinc-800 space-y-1">
                <div className="text-[10px] font-bold text-[#71717A] uppercase flex items-center justify-between">
                  <span>URL da Requisição API WhatsApp Gerada</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(whatsAppApiShareUrl);
                      setCopiedApiEndpoint(true);
                      setTimeout(() => setCopiedApiEndpoint(false), 2000);
                    }}
                    className="text-[#25D366] hover:underline text-[10px] flex items-center gap-1 cursor-pointer"
                  >
                    {copiedApiEndpoint ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedApiEndpoint ? 'URL Copiada' : 'Copiar URL API'}</span>
                  </button>
                </div>
                <div className="text-[10px] font-mono text-zinc-400 break-all truncate">
                  {whatsAppApiShareUrl}
                </div>
              </div>
            </div>

            {/* Switch de Atendente Inteligente */}
            <div className="flex items-center justify-between p-4 bg-[#161624]/60 border border-[#282838] rounded-2xl">
              <div className="space-y-0.5">
                <div className="text-xs font-black text-white flex items-center gap-2">
                  <span>Atendente Virtual IA (Anota AI / Bot)</span>
                  <span className="text-[9px] bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/40 px-2 py-0.5 rounded-full font-bold">RECOMENDADO</span>
                </div>
                <div className="text-[11px] text-[#71717A]">
                  Dispara resposta automática com o cardápio quando novos clientes chamam no WhatsApp.
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableBot}
                  onChange={e => setEnableBot(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[#272738] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#25D366]"></div>
              </label>
            </div>
          </div>

          {/* Card 2: Editor de Modelos de Mensagens para Atendentes */}
          <div className="bg-[#12121A] border border-[#242438] p-6 rounded-3xl space-y-5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2.5">
                  <FileText className="w-5 h-5 text-[#FFC72C]" />
                  <span>Modelos de Mensagens Rápidas (Templates)</span>
                </h3>
                <p className="text-xs text-[#71717A]">
                  Personalize os textos pré-formatados que os atendentes usam ao conversar com clientes.
                </p>
              </div>

              <button
                type="button"
                onClick={resetToDefault}
                className="text-[11px] text-[#A1A1AA] hover:text-white flex items-center gap-1 cursor-pointer transition-colors self-start sm:self-auto"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar Padrão</span>
              </button>
            </div>

            {/* Tabs de Seleção de Template */}
            <div className="flex items-center gap-1.5 p-1 bg-[#161624] border border-[#262638] rounded-2xl overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={() => setActiveTemplateTab('greeting')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeTemplateTab === 'greeting' 
                    ? 'bg-[#25D366] text-black shadow-md' 
                    : 'text-[#A1A1AA] hover:text-white hover:bg-[#1E1E2E]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>1. Boas-Vindas Geral</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTemplateTab('table')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeTemplateTab === 'table' 
                    ? 'bg-[#FFC72C] text-black shadow-md' 
                    : 'text-[#A1A1AA] hover:text-white hover:bg-[#1E1E2E]'
                }`}
              >
                <UtensilsCrossed className="w-3.5 h-3.5" />
                <span>2. Atendimento Mesa</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTemplateTab('delivery')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeTemplateTab === 'delivery' 
                    ? 'bg-[#FF6B00] text-white shadow-md' 
                    : 'text-[#A1A1AA] hover:text-white hover:bg-[#1E1E2E]'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span>3. Delivery</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTemplateTab('promo')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeTemplateTab === 'promo' 
                    ? 'bg-[#DA291C] text-white shadow-md' 
                    : 'text-[#A1A1AA] hover:text-white hover:bg-[#1E1E2E]'
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                <span>4. Cupom / Promo</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTemplateTab('pdf')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeTemplateTab === 'pdf' 
                    ? 'bg-[#9333EA] text-white shadow-md' 
                    : 'text-[#A1A1AA] hover:text-white hover:bg-[#1E1E2E]'
                }`}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>5. Cardápio PDF</span>
              </button>
            </div>

            {/* Inserção de Tags Dinâmicas */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#A1A1AA] uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[#FFC72C]" />
                <span>Clique nas Tags Dinâmicas para inserir no texto:</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => insertTag('{loja}')}
                  className="px-2.5 py-1 bg-[#1A1A2A] hover:bg-[#25253A] border border-[#2E2E44] rounded-lg text-[11px] font-mono text-[#FFC72C] transition-all cursor-pointer"
                >
                  +{'{loja}'}
                </button>
                <button
                  type="button"
                  onClick={() => insertTag('{link_cardapio}')}
                  className="px-2.5 py-1 bg-[#1A1A2A] hover:bg-[#25253A] border border-[#2E2E44] rounded-lg text-[11px] font-mono text-[#00E676] transition-all cursor-pointer"
                >
                  +{'{link_cardapio}'}
                </button>
                <button
                  type="button"
                  onClick={() => insertTag('{mesa}')}
                  className="px-2.5 py-1 bg-[#1A1A2A] hover:bg-[#25253A] border border-[#2E2E44] rounded-lg text-[11px] font-mono text-[#FF6B00] transition-all cursor-pointer"
                >
                  +{'{mesa}'}
                </button>
                <button
                  type="button"
                  onClick={() => insertTag('{cupom}')}
                  className="px-2.5 py-1 bg-[#1A1A2A] hover:bg-[#25253A] border border-[#2E2E44] rounded-lg text-[11px] font-mono text-[#DA291C] transition-all cursor-pointer"
                >
                  +{'{cupom}'}
                </button>
                <button
                  type="button"
                  onClick={() => insertTag('{taxa_entrega}')}
                  className="px-2.5 py-1 bg-[#1A1A2A] hover:bg-[#25253A] border border-[#2E2E44] rounded-lg text-[11px] font-mono text-[#60A5FA] transition-all cursor-pointer"
                >
                  +{'{taxa_entrega}'}
                </button>
              </div>
            </div>

            {/* Textarea do Template Ativo */}
            <div>
              {activeTemplateTab === 'greeting' && (
                <textarea
                  rows={5}
                  value={greetingTpl}
                  onChange={e => setGreetingTpl(e.target.value)}
                  className="w-full bg-[#161624] border border-[#282838] rounded-2xl p-4 text-xs sm:text-sm text-white font-mono leading-relaxed focus:border-[#25D366] focus:ring-1 focus:ring-[#25D366] focus:outline-none transition-all"
                  placeholder="Escreva a mensagem de boas-vindas..."
                />
              )}

              {activeTemplateTab === 'table' && (
                <textarea
                  rows={5}
                  value={tableTpl}
                  onChange={e => setTableTpl(e.target.value)}
                  className="w-full bg-[#161624] border border-[#282838] rounded-2xl p-4 text-xs sm:text-sm text-white font-mono leading-relaxed focus:border-[#FFC72C] focus:ring-1 focus:ring-[#FFC72C] focus:outline-none transition-all"
                  placeholder="Escreva a mensagem para atendimento na mesa..."
                />
              )}

              {activeTemplateTab === 'delivery' && (
                <textarea
                  rows={5}
                  value={deliveryTpl}
                  onChange={e => setDeliveryTpl(e.target.value)}
                  className="w-full bg-[#161624] border border-[#282838] rounded-2xl p-4 text-xs sm:text-sm text-white font-mono leading-relaxed focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] focus:outline-none transition-all"
                  placeholder="Escreva a mensagem para pedidos delivery..."
                />
              )}

              {activeTemplateTab === 'promo' && (
                <textarea
                  rows={5}
                  value={promoTpl}
                  onChange={e => setPromoTpl(e.target.value)}
                  className="w-full bg-[#161624] border border-[#282838] rounded-2xl p-4 text-xs sm:text-sm text-white font-mono leading-relaxed focus:border-[#DA291C] focus:ring-1 focus:ring-[#DA291C] focus:outline-none transition-all"
                  placeholder="Escreva a mensagem promocional..."
                />
              )}

              {activeTemplateTab === 'pdf' && (
                <textarea
                  rows={5}
                  value={pdfTpl}
                  onChange={e => setPdfTpl(e.target.value)}
                  className="w-full bg-[#161624] border border-[#282838] rounded-2xl p-4 text-xs sm:text-sm text-white font-mono leading-relaxed focus:border-[#9333EA] focus:ring-1 focus:ring-[#9333EA] focus:outline-none transition-all"
                  placeholder="Escreva a mensagem com link do cardápio em PDF..."
                />
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#71717A]">
              <span>💡 Use asteriscos (*palavra*) para negrito e sublinhados (_palavra_) para itálico no WhatsApp.</span>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="text-[#FFC72C] hover:underline font-bold flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Mensagem</span>
              </button>
            </div>
          </div>
        </div>

        {/* Coluna da Direita (5 cols): Central de Disparo Rápido do Atendente & Live Preview */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Caixa de Ação Rápida para o Atendente */}
          <div className="bg-gradient-to-b from-[#161624] to-[#12121A] border-2 border-[#25D366]/40 p-6 rounded-3xl space-y-5 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-[#25D366]/20 border border-[#25D366]/40 flex items-center justify-center text-[#25D366]">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Disparo Rápido do Atendente</h3>
                  <p className="text-[11px] text-[#A1A1AA]">Envie o link personalizado em 1 toque</p>
                </div>
              </div>

              <span className="text-[10px] font-black uppercase text-[#25D366] bg-[#25D366]/15 border border-[#25D366]/30 px-2.5 py-1 rounded-full">
                1-Clique
              </span>
            </div>

            {/* Parâmetros do Disparo */}
            <div className="space-y-3.5">
              
              {/* WhatsApp do Cliente Destino */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-[#A1A1AA] mb-1">
                  WhatsApp do Cliente (Opcional)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#71717A] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={formatPhoneMask(targetCustomerPhone)}
                    onChange={e => setTargetCustomerPhone(e.target.value)}
                    placeholder="Ex: (11) 97777-8888 ou deixe em branco"
                    className="w-full bg-[#1A1A2E] border border-[#2E2E44] rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-[#525266] focus:border-[#25D366] focus:outline-none font-bold"
                  />
                </div>
              </div>

              {/* Seletor de Mesa & Cupom */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#A1A1AA] mb-1">
                    Mesa do Salão
                  </label>
                  <select
                    value={selectedTable}
                    onChange={e => setSelectedTable(e.target.value)}
                    className="w-full bg-[#1A1A2E] border border-[#2E2E44] rounded-2xl px-3.5 py-2.5 text-xs text-white font-bold focus:border-[#FFC72C] focus:outline-none"
                  >
                    {Array.from({ length: 20 }, (_, i) => {
                      const num = String(i + 1).padStart(2, '0');
                      return (
                        <option key={num} value={num}>
                          Mesa {num}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#A1A1AA] mb-1">
                    Cupom Aplicado
                  </label>
                  <input
                    type="text"
                    value={customPromoCode}
                    onChange={e => setCustomPromoCode(e.target.value.toUpperCase())}
                    placeholder="DULCI10"
                    className="w-full bg-[#1A1A2E] border border-[#2E2E44] rounded-2xl px-3.5 py-2.5 text-xs text-white font-bold focus:border-[#DA291C] focus:outline-none uppercase"
                  />
                </div>
              </div>

              {/* Botões de Ação Imediata */}
              <div className="space-y-2 pt-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleSendViaWhatsApp(targetCustomerPhone)}
                  className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-black font-black py-3.5 px-4 rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(37,211,102,0.35)] transition-all cursor-pointer border border-[#25D366]"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {targetCustomerPhone.trim() ? `ENVIAR PARA ${formatPhoneMask(targetCustomerPhone)}` : 'DISPARAR LINK NO WHATSAPP'}
                  </span>
                </motion.button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleCopyMessage}
                    className="bg-[#1C1C2C] hover:bg-[#242438] border border-[#2E2E48] text-white py-2.5 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    {copiedMsg ? <Check className="w-3.5 h-3.5 text-[#00E676]" /> : <Copy className="w-3.5 h-3.5 text-[#FFC72C]" />}
                    <span>{copiedMsg ? 'Mensagem Copiada!' : 'Copiar Texto'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="bg-[#1C1C2C] hover:bg-[#242438] border border-[#2E2E48] text-white py-2.5 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-[#00E676]" /> : <ExternalLink className="w-3.5 h-3.5 text-[#25D366]" />}
                    <span>{copiedLink ? 'Link Copiado!' : 'Copiar Link'}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowQrModal(true)}
                  className="w-full bg-[#FFC72C]/10 hover:bg-[#FFC72C]/20 border border-[#FFC72C]/30 text-[#FFC72C] py-2.5 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Ver QR Code & Imprimir Display Acrílico de Mesa</span>
                </button>
              </div>
            </div>
          </div>

          {/* Simulador Visual do WhatsApp (Smartphone Live Preview) */}
          <div className="bg-[#12121A] border border-[#242438] p-5 rounded-3xl space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#A1A1AA] flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-[#25D366]" />
                Preview em Tempo Real no WhatsApp
              </span>
              <span className="text-[10px] text-[#71717A]">Como o cliente visualiza</span>
            </div>

            {/* Mockup de Tela do WhatsApp */}
            <div className="rounded-2xl border border-[#262638] bg-[#0B141A] overflow-hidden shadow-inner font-sans">
              
              {/* Barra Superior do Chat WhatsApp */}
              <div className="bg-[#1F2C34] p-3 flex items-center justify-between border-b border-[#2A3942]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#DA291C] to-[#FF6B00] flex items-center justify-center text-white font-black text-xs border border-white/20">
                    🍔
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#E9EDEF] flex items-center gap-1">
                      <span>{tenant.name}</span>
                      <CheckCircle2 className="w-3 h-3 text-[#00A884]" />
                    </div>
                    <div className="text-[10px] text-[#8696A0]">Conta comercial oficial</div>
                  </div>
                </div>

                <div className="text-[10px] text-[#00A884] font-bold bg-[#00A884]/15 px-2 py-0.5 rounded-full">
                  Online
                </div>
              </div>

              {/* Área das Mensagens com Fundo Clássico WhatsApp Dark */}
              <div className="p-4 space-y-3 min-h-[190px] bg-[radial-gradient(#1B2831_1px,transparent_1px)] [background-size:16px_16px]">
                <div className="flex justify-center">
                  <span className="text-[9px] bg-[#182229] text-[#8696A0] px-2.5 py-0.5 rounded-md">
                    HOJE
                  </span>
                </div>

                {/* Balão de Mensagem Enviada */}
                <div className="flex justify-end">
                  <div className="max-w-[90%] bg-[#005C4B] text-[#E9EDEF] rounded-2xl rounded-tr-xs p-3 space-y-2 shadow-md">
                    <p className="text-[11px] leading-relaxed whitespace-pre-wrap">
                      {currentCompiledMessage}
                    </p>

                    {/* Preview do Link Card */}
                    <div className="bg-[#025143] p-2.5 rounded-xl border border-white/10 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[#DA291C] flex items-center justify-center text-base shrink-0">
                          🍔
                        </div>
                        <div className="min-w-0">
                          <div className="text-[11px] font-bold text-white truncate">{tenant.name} - Cardápio Online</div>
                          <div className="text-[9px] text-[#A1A1AA] truncate">{baseMenuUrl}</div>
                        </div>
                      </div>
                      <div className="text-[10px] text-[#D1D7DB] line-clamp-2">
                        Faça seu pedido online com fotos, adicionais e acompanhamento em tempo real.
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-1 text-[9px] text-[#8696A0] pt-0.5">
                      <span>12:00</span>
                      <span className="text-[#53BDEB] font-bold">✓✓</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Modal de QR Code & Display de Mesa */}
      <AnimatePresence>
        {showQrModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#12121A] border border-[#2C2C40] rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-[#FFC72C]" />
                  <h3 className="text-base font-black text-white">Display Acrílico de Mesa</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowQrModal(false)}
                  className="w-8 h-8 rounded-full bg-[#1E1E2E] text-[#A1A1AA] hover:text-white flex items-center justify-center cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Visual da Plaquinha de Mesa */}
              <div id="printable-table-card" className="bg-gradient-to-b from-[#1C1726] to-[#0E0C16] border-2 border-[#FFC72C] rounded-2xl p-6 text-center space-y-4 shadow-xl text-white">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#FFC72C] px-2.5 py-0.5 rounded-full bg-[#FFC72C]/10 border border-[#FFC72C]/30">
                    CARDÁPIO DIGITAL INTERATIVO
                  </span>
                  <h4 className="text-lg font-black font-display text-white">{tenant.name}</h4>
                  <p className="text-xs text-[#FFC72C] font-bold">MESA {selectedTable}</p>
                </div>

                <div className="w-44 h-44 mx-auto bg-white p-3 rounded-2xl flex flex-col items-center justify-center shadow-lg">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`${baseMenuUrl}&mesa=${selectedTable}`)}`}
                    alt="QR Code Mesa"
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-bold text-white">Aponte a câmera do seu celular</p>
                  <p className="text-[10px] text-[#A1A1AA]">Peça pelo smartphone e receba direto na sua mesa</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 bg-[#FFC72C] hover:bg-[#e5b327] text-black font-black py-3 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>IMPRIMIR DISPLAY (A5/A6)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowQrModal(false)}
                  className="px-4 py-3 bg-[#1C1C2C] hover:bg-[#25253A] text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
