import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  Printer,
  QrCode,
  Share2,
  Copy,
  Check,
  X,
  Sparkles,
  Download,
  Smartphone,
  CheckCircle2,
  Flame,
  UtensilsCrossed,
  Layers,
  Search,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Product } from '../types';
import { formatBRL } from '../utils/formatters';
import { playBeep, playCashRegister } from '../utils/audio';
import { getPixQrCodeUrl } from '../utils/pix';

interface CatalogoPdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
}

export const CatalogoPdfExportModal: React.FC<CatalogoPdfExportModalProps> = ({
  isOpen,
  onClose,
  products
}) => {
  const { tenant } = useApp();
  const printContainerRef = useRef<HTMLDivElement>(null);

  // Settings for the PDF generation
  const [themeStyle, setThemeStyle] = useState<'dark_gourmet' | 'light_clean'>('dark_gourmet');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showImages, setShowImages] = useState<boolean>(true);
  const [showDescriptions, setShowDescriptions] = useState<boolean>(true);
  const [showQrCode, setShowQrCode] = useState<boolean>(true);
  const [showPrices, setShowPrices] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [whatsappSent, setWhatsappSent] = useState<boolean>(false);

  // Menu base URL for the QR code
  const menuDomain = tenant?.settings?.menuCustomDomain || window.location.origin || 'https://neonfood.app/cardapio';
  const menuSlug = tenant?.settings?.menuCustomSlug || (tenant?.name ? tenant.name.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'neon-gourmet');
  const fullMenuUrl = `${menuDomain}?loja=${menuSlug}&origem=pdf_catalogo`;

  // QR Code URL based on the menu URL
  const qrCodeUrl = useMemo(() => {
    return getPixQrCodeUrl(fullMenuUrl, 260);
  }, [fullMenuUrl]);

  // Extract all categories available in products
  const categoryMap: Record<string, { name: string; icon: string; order: number }> = {
    cat_promocoes_dulci: { name: '🔥 Ofertas & Promoções da Dulci', icon: '🔥', order: 1 },
    cat_lanches_dulci: { name: '🍔 X-Saladas & Lanches Artesanais', icon: '🍔', order: 2 },
    cat_mistos_dulci: { name: '🥪 Mistos Quentes na Chapa', icon: '🥪', order: 3 },
    cat_pasteis_dulci: { name: '🥟 Pastéis Crocantes Fritos na Hora', icon: '🥟', order: 4 },
    cat_acompanhamentos_dulci: { name: '🍟 Acompanhamentos & Batatas Fritas', icon: '🍟', order: 5 },
    cat_pizzas_dulci: { name: '🍕 Pizzas da Dulci (Massa Crocante)', icon: '🍕', order: 6 },
    cat_refrigerantes_dulci: { name: '🥤 Refrigerantes & Guaranás Regionais', icon: '🥤', order: 7 },
    cat_sucos_dulci: { name: '🧃 Sucos Naturais da Fruta', icon: '🧃', order: 8 },
    cat_combos_dulci: { name: '⭐ Combos Especiais com Refrigerante', icon: '⭐', order: 9 },
    cat_smash: { name: 'Burguers & Smash Artesanais', icon: '🍔', order: 10 },
    cat_pizzas_tradicionais: { name: 'Pizzas Tradicionais', icon: '🍕', order: 11 },
    cat_pizzas_especiais: { name: 'Pizzas Especiais & Gourmet', icon: '⭐', order: 12 },
    cat_pizzas_doces: { name: 'Pizzas Doces & Sobremesas', icon: '🍫', order: 13 },
    cat_lanches: { name: 'Lanches & Sanduíches da Casa', icon: '🥪', order: 14 },
    cat_portions: { name: 'Porções & Fritas Crocantes', icon: '🍟', order: 15 },
    cat_acai: { name: 'Açaí & Tigelas Gourmet', icon: '🍧', order: 16 },
    cat_combos: { name: 'Combos & Promoções do Chef', icon: '🏷️', order: 17 },
    cat_drinks: { name: 'Bebidas Geladas & Chopp', icon: '🥤', order: 18 },
  };

  // Filter products by selected category and search term
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
      const matchSearch = searchTerm.trim() === '' || 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, searchTerm]);

  // Group filtered products by category
  const groupedProducts = useMemo(() => {
    const groups: { [catId: string]: Product[] } = {};
    
    filteredProducts.forEach(p => {
      const catKey = p.category || 'cat_smash';
      if (!groups[catKey]) {
        groups[catKey] = [];
      }
      groups[catKey].push(p);
    });

    return Object.entries(groups).sort(([catA], [catB]) => {
      const orderA = categoryMap[catA]?.order ?? 99;
      const orderB = categoryMap[catB]?.order ?? 99;
      return orderA - orderB;
    });
  }, [filteredProducts]);

  // Copy Menu URL handler
  const handleCopyLink = () => {
    playCashRegister();
    navigator.clipboard.writeText(fullMenuUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Open WhatsApp with formatted catalog menu link
  const handleShareWhatsApp = () => {
    playCashRegister();
    const restaurantName = tenant?.name || 'Nosso Restaurante';
    const totalItems = products.length;

    const message = 
      `*Olá! Confira o Cardápio & Catálogo Digital do ${restaurantName}* 🍔🍕🥤\n\n` +
      `Temos mais de ${totalItems} opções preparadas com ingredientes selecionados e muito carinho!\n\n` +
      `👉 *Acesse pelo link e faça seu pedido online:* \n` +
      `${fullMenuUrl}\n\n` +
      `🛵 *Entregamos rápido e aceitamos PIX e Cartões!*`;

    const encoded = encodeURIComponent(message);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
    setWhatsappSent(true);
    setTimeout(() => setWhatsappSent(false), 2500);
  };

  // Handle native browser print
  const handlePrint = () => {
    playCashRegister();
    window.print();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="bg-[#101016] border border-[#2B2B3E] w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden my-auto text-zinc-100 flex flex-col max-h-[95vh]"
        >
          {/* Top Navigation & Controls Toolbar */}
          <div className="p-4 sm:p-5 bg-[#0C0C12] border-b border-[#222232] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#E31837] to-[#FF7A00] flex items-center justify-center text-white shadow-[0_0_15px_rgba(227,24,55,0.4)]">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black text-white">
                    Exportar Catálogo em PDF & Impressão
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-[#00E676]/20 border border-[#00E676]/40 text-[#00E676] text-[10px] font-bold">
                    QR Code Integrado
                  </span>
                </div>
                <p className="text-xs text-[#A1A1AA]">
                  Gere o cardápio oficial pronto para download em PDF, impressão gráfica A4 ou envio rápido aos clientes.
                </p>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
              <button
                onClick={handleCopyLink}
                className="px-3 py-2 bg-[#1A1A28] hover:bg-[#242438] text-zinc-200 border border-[#2F2F44] hover:border-[#FFC72C] text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="Copiar link do cardápio online"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#00E676]" />
                    <span className="text-[#00E676]">Link Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#FFC72C]" />
                    <span>Copiar Link</span>
                  </>
                )}
              </button>

              <button
                onClick={handleShareWhatsApp}
                className="px-3 py-2 bg-[#00D26A] hover:bg-[#00E676] text-black text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                title="Enviar catálogo no WhatsApp"
              >
                <MessageSquare className="w-3.5 h-3.5 fill-black" />
                <span>Enviar WhatsApp</span>
              </button>

              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-gradient-to-r from-[#E31837] to-[#FF7A00] hover:brightness-110 text-white text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(227,24,55,0.4)]"
                title="Salvar como PDF ou Imprimir em papel"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir / Salvar PDF</span>
              </button>

              <button
                onClick={onClose}
                className="p-2 text-zinc-400 hover:text-white hover:bg-[#1E1E2C] rounded-xl transition-all cursor-pointer ml-1"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Options & Filters Bar */}
          <div className="px-4 sm:px-6 py-3 bg-[#14141E] border-b border-[#222232] flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Style Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[#71717A] font-bold">Estilo Visual:</span>
              <div className="flex items-center bg-[#0C0C12] p-1 rounded-xl border border-[#28283C]">
                <button
                  onClick={() => setThemeStyle('dark_gourmet')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    themeStyle === 'dark_gourmet'
                      ? 'bg-[#E31837] text-white shadow-sm'
                      : 'text-[#A1A1AA] hover:text-white'
                  }`}
                >
                  ★ Gourmet Escuro
                </button>
                <button
                  onClick={() => setThemeStyle('light_clean')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    themeStyle === 'light_clean'
                      ? 'bg-[#FFC72C] text-black shadow-sm'
                      : 'text-[#A1A1AA] hover:text-white'
                  }`}
                >
                  📄 Impressão Clean
                </button>
              </div>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <span className="text-[#71717A] font-bold">Categoria:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-[#0C0C12] border border-[#28283C] text-white px-3 py-1.5 rounded-xl font-bold text-xs focus:outline-none focus:border-[#FFC72C] cursor-pointer"
              >
                <option value="all">Todas as Categorias ({products.length} itens)</option>
                {Object.entries(categoryMap).map(([id, info]) => (
                  <option key={id} value={id}>
                    {info.icon} {info.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Customization Toggles */}
            <div className="flex flex-wrap items-center gap-4 text-zinc-300">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showImages}
                  onChange={(e) => setShowImages(e.target.checked)}
                  className="rounded border-zinc-700 text-[#E31837] focus:ring-0 accent-[#E31837]"
                />
                <span>Exibir Fotos</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showDescriptions}
                  onChange={(e) => setShowDescriptions(e.target.checked)}
                  className="rounded border-zinc-700 text-[#E31837] focus:ring-0 accent-[#E31837]"
                />
                <span>Exibir Ingredientes</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showQrCode}
                  onChange={(e) => setShowQrCode(e.target.checked)}
                  className="rounded border-zinc-700 text-[#E31837] focus:ring-0 accent-[#E31837]"
                />
                <span>QR Code de Pedidos</span>
              </label>
            </div>
          </div>

          {/* Printable Document Preview Area */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-[#08080C] scrollbar-thin">
            <div
              id="catalogo-pdf-print-area"
              ref={printContainerRef}
              className={`max-w-4xl mx-auto rounded-3xl p-6 sm:p-10 shadow-2xl transition-all duration-300 ${
                themeStyle === 'dark_gourmet'
                  ? 'bg-[#100D12] text-white border-4 border-[#FFC72C]/40 shadow-[0_0_40px_rgba(255,199,44,0.15)]'
                  : 'bg-[#FCFCFA] text-zinc-900 border-2 border-zinc-300 shadow-xl'
              }`}
            >
              {/* DOCUMENT HEADER / BRANDING BANNER */}
              <div
                className={`pb-6 mb-6 border-b-2 ${
                  themeStyle === 'dark_gourmet'
                    ? 'border-[#FFC72C]/40'
                    : 'border-zinc-300'
                }`}
              >
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  {/* Brand & Slogan */}
                  <div className="space-y-2 text-center md:text-left">
                    <div
                      className={`inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[11px] font-black uppercase tracking-widest ${
                        themeStyle === 'dark_gourmet'
                          ? 'bg-[#DA291C] text-white shadow-md'
                          : 'bg-[#181824] text-[#FFC72C]'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>CARDÁPIO OFICIAL • QUALIDADE ARTESANAL</span>
                    </div>

                    <h1
                      className={`text-3xl sm:text-4xl lg:text-5xl font-black font-display tracking-tight ${
                        themeStyle === 'dark_gourmet'
                          ? 'text-[#FFC72C] drop-shadow-[0_2px_10px_rgba(255,199,44,0.4)]'
                          : 'text-[#DA291C]'
                      }`}
                    >
                      {tenant?.name || 'LANCHEONETE DULCI'}
                    </h1>

                    <p
                      className={`text-xs sm:text-sm max-w-xl font-medium ${
                        themeStyle === 'dark_gourmet' ? 'text-zinc-300' : 'text-zinc-700'
                      }`}
                    >
                      Seu sabor favorito em Manaus! Lanches no pão brioche, X-Saladas artesanais, Pizzas de massa crocante, Pastéis fritos na hora, Batatas crocantes e o autêntico Guaraná Baré do Amazonas.
                    </p>

                    {/* Operational Highlights */}
                    <div
                      className={`flex flex-wrap items-center justify-center md:justify-start gap-3 text-xs font-bold pt-1 ${
                        themeStyle === 'dark_gourmet' ? 'text-[#FFC72C]' : 'text-zinc-800'
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        📍 Manaus – Amazonas – Brasil
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-mono">
                        📲 Peça no Zap: (92) 99303-2598
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        ⚡ Aceitamos PIX, Crédito & Débito
                      </span>
                    </div>
                  </div>

                  {/* Embedded Scannable QR Code */}
                  {showQrCode && (
                    <div
                      className={`p-3 rounded-2xl flex flex-col items-center text-center shrink-0 border ${
                        themeStyle === 'dark_gourmet'
                          ? 'bg-[#181520] border-[#FFC72C]/40 text-white'
                          : 'bg-white border-zinc-300 text-zinc-900 shadow-md'
                      }`}
                    >
                      <div className="w-24 h-24 sm:w-28 sm:h-28 bg-white p-1.5 rounded-xl flex items-center justify-center overflow-hidden shadow-inner">
                        <img
                          src={qrCodeUrl}
                          alt="QR Code do Cardápio"
                          className="w-full h-full object-contain"
                          crossOrigin="anonymous"
                        />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider mt-2 text-[#FFC72C]">
                        Peça pelo Celular
                      </span>
                      <span
                        className={`text-[9px] ${
                          themeStyle === 'dark_gourmet' ? 'text-zinc-400' : 'text-zinc-500'
                        }`}
                      >
                        Escaneie o QR Code
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* PRODUCTS LIST BY CATEGORY */}
              <div className="space-y-8">
                {groupedProducts.length === 0 ? (
                  <div className="text-center py-12 text-zinc-500">
                    <p className="text-sm">Nenhum produto encontrado com os filtros atuais.</p>
                  </div>
                ) : (
                  groupedProducts.map(([catId, items], catIndex) => {
                    const catInfo = categoryMap[catId] || { name: catId, icon: '🍽️', order: 99 };

                    return (
                      <div key={catId} className="space-y-4 break-inside-avoid">
                        {/* Category Header Badge */}
                        <div
                          className={`px-4 py-2 rounded-2xl flex items-center justify-between font-black text-sm sm:text-base shadow-md ${
                            themeStyle === 'dark_gourmet'
                              ? 'bg-gradient-to-r from-[#DA291C] to-[#E31837] text-white border border-[#FFC72C]/30'
                              : 'bg-zinc-900 text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{catInfo.icon}</span>
                            <span className="uppercase tracking-wider">{catInfo.name}</span>
                          </div>
                          <span
                            className={`text-xs font-mono px-2 py-0.5 rounded-full ${
                              themeStyle === 'dark_gourmet'
                                ? 'bg-black/30 text-[#FFC72C]'
                                : 'bg-zinc-800 text-zinc-200'
                            }`}
                          >
                            {items.length} {items.length === 1 ? 'item' : 'opções'}
                          </span>
                        </div>

                        {/* Products 2-Column Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                          {items.map((prod, index) => {
                            const itemNumber = `#${String(index + 1).padStart(2, '0')}`;
                            const isStar = prod.bcgClassification === 'star';

                            return (
                              <div
                                key={prod.id}
                                className={`p-3 sm:p-3.5 rounded-2xl border transition-all flex gap-3 items-start ${
                                  themeStyle === 'dark_gourmet'
                                    ? 'bg-[#15121A] border-zinc-800 hover:border-[#FFC72C]/40'
                                    : 'bg-white border-zinc-200 hover:border-zinc-400'
                                }`}
                              >
                                {/* Optional Product Thumbnail */}
                                {showImages && prod.imageUrl && (
                                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden shrink-0 bg-zinc-900 border border-zinc-700/50 relative">
                                    <img
                                      src={prod.imageUrl}
                                      alt={prod.name}
                                      className="w-full h-full object-cover"
                                      crossOrigin="anonymous"
                                    />
                                    {isStar && (
                                      <span className="absolute top-1 left-1 bg-[#FFC72C] text-black text-[9px] font-black px-1 rounded shadow-sm">
                                        TOP
                                      </span>
                                    )}
                                  </div>
                                )}

                                {/* Product Info & Price */}
                                <div className="flex-1 min-w-0 flex flex-col justify-between h-full">
                                  <div>
                                    <div className="flex items-start justify-between gap-2">
                                      <h3
                                        className={`font-black text-xs sm:text-sm leading-snug truncate ${
                                          themeStyle === 'dark_gourmet' ? 'text-white' : 'text-zinc-900'
                                        }`}
                                      >
                                        <span className="text-[#DA291C] mr-1.5 font-mono font-bold">
                                          {itemNumber}
                                        </span>
                                        {prod.name}
                                      </h3>

                                      {/* Product Price Tag */}
                                      {showPrices && (
                                        prod.priceVariants && prod.priceVariants.length > 0 ? (
                                          <div className="flex flex-wrap items-center gap-1 shrink-0 justify-end">
                                            {prod.priceVariants.map((v, vIdx) => (
                                              <span
                                                key={vIdx}
                                                className={`font-black font-mono text-[10px] px-1.5 py-0.5 rounded-md ${
                                                  themeStyle === 'dark_gourmet'
                                                    ? 'bg-[#FFC72C] text-black shadow-xs'
                                                    : 'bg-[#DA291C] text-white shadow-xs'
                                                }`}
                                              >
                                                {v.label.split(' ')[0]}: {formatBRL(v.price)}
                                              </span>
                                            ))}
                                          </div>
                                        ) : (
                                          <span
                                            className={`font-black font-mono text-xs sm:text-sm px-2 py-0.5 rounded-lg shrink-0 ${
                                              themeStyle === 'dark_gourmet'
                                                ? 'bg-[#FFC72C] text-black shadow-sm'
                                                : 'bg-[#DA291C] text-white shadow-sm'
                                            }`}
                                          >
                                            {formatBRL(prod.price)}
                                          </span>
                                        )
                                      )}
                                    </div>

                                    {/* Description */}
                                    {showDescriptions && prod.description && (
                                      <p
                                        className={`text-[11px] leading-relaxed mt-1 line-clamp-2 ${
                                          themeStyle === 'dark_gourmet' ? 'text-zinc-400' : 'text-zinc-600'
                                        }`}
                                      >
                                        {prod.description}
                                      </p>
                                    )}
                                  </div>

                                  {/* Tags / Badges */}
                                  {prod.tags && prod.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {prod.tags.slice(0, 2).map((tag, tIdx) => (
                                        <span
                                          key={tIdx}
                                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                                            themeStyle === 'dark_gourmet'
                                              ? 'bg-zinc-800 text-zinc-300'
                                              : 'bg-zinc-100 text-zinc-700'
                                          }`}
                                        >
                                          {tag}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* DOCUMENT FOOTER & BRANDING */}
              <div
                className={`mt-10 pt-6 border-t-2 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs ${
                  themeStyle === 'dark_gourmet'
                    ? 'border-[#FFC72C]/40 text-zinc-400'
                    : 'border-zinc-300 text-zinc-600'
                }`}
              >
                <div className="text-center sm:text-left space-y-0.5">
                  <p
                    className={`font-black uppercase tracking-wider ${
                      themeStyle === 'dark_gourmet' ? 'text-white' : 'text-zinc-900'
                    }`}
                  >
                    {tenant?.name || 'NEON FOOD OS'} • PEDIDOS & ATENDIMENTO
                  </p>
                  <p className="text-[11px]">
                    Chave PIX: <span className="font-mono text-[#00E676] font-bold">pix@neonfood.com.br</span> • CNPJ: 00.000.000/0001-00
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 rounded font-bold text-[10px] border ${
                      themeStyle === 'dark_gourmet'
                        ? 'bg-zinc-900 border-zinc-800 text-zinc-300'
                        : 'bg-white border-zinc-300 text-zinc-700'
                    }`}
                  >
                    VISA
                  </span>
                  <span
                    className={`px-2 py-1 rounded font-bold text-[10px] border ${
                      themeStyle === 'dark_gourmet'
                        ? 'bg-zinc-900 border-zinc-800 text-zinc-300'
                        : 'bg-white border-zinc-300 text-zinc-700'
                    }`}
                  >
                    MASTERCARD
                  </span>
                  <span
                    className={`px-2 py-1 rounded font-bold text-[10px] border ${
                      themeStyle === 'dark_gourmet'
                        ? 'bg-zinc-900 border-zinc-800 text-zinc-300'
                        : 'bg-white border-zinc-300 text-zinc-700'
                    }`}
                  >
                    ELO
                  </span>
                  <span className="px-2 py-1 rounded font-black text-[10px] bg-[#00E676]/20 border border-[#00E676]/40 text-[#00E676]">
                    PIX INSTANTÂNEO
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Footer Info */}
          <div className="p-3 bg-[#0C0C12] border-t border-[#222232] text-center text-xs text-[#71717A] flex flex-wrap items-center justify-between px-6 gap-2">
            <span>
              💡 Dica: Clique em <strong>Imprimir / Salvar PDF</strong> e selecione a opção "Salvar como PDF" no seu navegador.
            </span>
            <span className="font-mono text-[11px] text-[#A1A1AA]">
              Link: {fullMenuUrl}
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
