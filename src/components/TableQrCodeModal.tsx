import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import QRCode from 'qrcode';
import { 
  QrCode, 
  X, 
  Copy, 
  Check, 
  Download, 
  Printer, 
  ExternalLink, 
  Share2, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Smartphone, 
  Wifi, 
  UtensilsCrossed, 
  Layers, 
  Grid, 
  Info,
  CheckCircle2,
  Users
} from 'lucide-react';
import { TableItem } from '../types';
import { useApp } from '../context/AppContext';
import { playBeep, playCashRegister } from '../utils/audio';

interface TableQrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  table: TableItem | null;
  allTables: TableItem[];
  onSelectTable: (table: TableItem) => void;
}

export const TableQrCodeModal: React.FC<TableQrCodeModalProps> = ({
  isOpen,
  onClose,
  table,
  allTables,
  onSelectTable,
}) => {
  const { tenant, setCurrentView } = useApp();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [viewMode, setViewMode] = useState<'single' | 'batch'>('single');
  const [batchQrCodes, setBatchQrCodes] = useState<Record<number, string>>({});
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  // Current table resolution
  const currentTable = table || allTables[0] || null;

  // Domain & Base URL construction
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://neonfood.app';
  const targetTableUrl = useMemo(() => {
    if (!currentTable) return '';
    return `${origin}/?view=cardapio_digital&mesa=${currentTable.number}`;
  }, [origin, currentTable]);

  // Generate QR Code for single table
  useEffect(() => {
    if (!currentTable) return;
    const url = `${origin}/?view=cardapio_digital&mesa=${currentTable.number}`;

    QRCode.toDataURL(url, {
      width: 600,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    })
      .then((dataUrl) => {
        setQrDataUrl(dataUrl);
      })
      .catch((err) => {
        console.error('Erro ao gerar QR Code da mesa:', err);
      });
  }, [currentTable, origin]);

  // Generate all QR codes for batch print mode
  useEffect(() => {
    if (viewMode === 'batch' && allTables.length > 0) {
      setIsGeneratingBatch(true);
      const promises = allTables.map(async (t) => {
        const url = `${origin}/?view=cardapio_digital&mesa=${t.number}`;
        const dataUrl = await QRCode.toDataURL(url, {
          width: 380,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
          errorCorrectionLevel: 'M',
        });
        return { tableNumber: t.number, dataUrl };
      });

      Promise.all(promises)
        .then((results) => {
          const map: Record<number, string> = {};
          results.forEach((r) => {
            map[r.tableNumber] = r.dataUrl;
          });
          setBatchQrCodes(map);
        })
        .finally(() => {
          setIsGeneratingBatch(false);
        });
    }
  }, [viewMode, allTables, origin]);

  // Table Navigation: Next & Prev
  const currentIndex = allTables.findIndex((t) => t.number === currentTable?.number);
  const handlePrevTable = () => {
    if (allTables.length === 0) return;
    playBeep(750, 0.03);
    const prevIdx = (currentIndex - 1 + allTables.length) % allTables.length;
    onSelectTable(allTables[prevIdx]);
  };

  const handleNextTable = () => {
    if (allTables.length === 0) return;
    playBeep(750, 0.03);
    const nextIdx = (currentIndex + 1) % allTables.length;
    onSelectTable(allTables[nextIdx]);
  };

  // Copy Link
  const handleCopyLink = () => {
    if (!targetTableUrl) return;
    navigator.clipboard.writeText(targetTableUrl);
    setCopiedLink(true);
    playCashRegister();
    setTimeout(() => setCopiedLink(false), 2400);
  };

  // Download QR Code PNG
  const handleDownloadPng = () => {
    if (!qrDataUrl || !currentTable) return;
    playBeep(900, 0.05);
    const link = document.createElement('a');
    link.download = `qrcode-mesa-${currentTable.number.toString().padStart(2, '0')}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  // Test Direct Digital Menu in SPA
  const handleTestInApp = () => {
    if (!currentTable) return;
    playBeep(850, 0.04);
    // Set query string or simulate direct access
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('view', 'cardapio_digital');
      url.searchParams.set('mesa', String(currentTable.number));
      window.history.pushState({}, '', url.toString());
    } catch {}
    setCurrentView('cardapio_digital');
    onClose();
  };

  // Share via WhatsApp
  const handleShareWhatsApp = () => {
    if (!currentTable) return;
    playBeep(950, 0.05);
    const restaurantName = tenant?.name || 'Lanchonete Dulci';
    const text = encodeURIComponent(
      `Olá! Acesse o Cardápio Digital exclusivo da *Mesa #${currentTable.number}* do *${restaurantName}* para fazer seus pedidos diretamente pelo celular:\n\n👉 ${targetTableUrl}\n\nBom apetite! 🍔✨`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  // Trigger Print Display
  const handlePrint = () => {
    playBeep(880, 0.04);
    window.print();
  };

  if (!isOpen || !currentTable) return null;

  return (
    <AnimatePresence>
      <div 
        id="table-qrcode-modal-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md select-none overflow-y-auto"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-2xl bg-[#111118] border border-[#2A2A3E] rounded-3xl p-5 sm:p-6 text-white shadow-[0_0_40px_rgba(0,0,0,0.8)] my-auto overflow-hidden"
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-1/4 w-72 h-36 bg-[#00D26A]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-72 h-36 bg-[#FFC72C]/10 rounded-full blur-3xl pointer-events-none" />

          {/* Modal Header */}
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-[#242436] relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#00D26A]/20 border border-[#00D26A]/40 flex items-center justify-center text-[#00D26A] shadow-[0_0_15px_rgba(0,210,106,0.25)]">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <span>QR Code da Mesa {currentTable.number.toString().padStart(2, '0')}</span>
                  {currentTable.name && (
                    <span className="text-xs font-normal text-zinc-400">({currentTable.name})</span>
                  )}
                </h3>
                <p className="text-xs text-zinc-400">
                  Cardápio digital vinculado automaticamente para autoatendimento
                </p>
              </div>
            </div>

            {/* View Mode Toggle & Close */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center p-1 bg-[#1A1A28] border border-[#2C2C3E] rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => {
                    playBeep(750, 0.02);
                    setViewMode('single');
                  }}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    viewMode === 'single'
                      ? 'bg-[#00D26A] text-black shadow-xs'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Mesa Individual
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playBeep(750, 0.02);
                    setViewMode('batch');
                  }}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    viewMode === 'batch'
                      ? 'bg-[#FFC72C] text-black shadow-xs'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Grid className="w-3 h-3" />
                  <span>Todas as Mesas ({allTables.length})</span>
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-[#1C1C28] hover:bg-[#28283C] text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-[#2B2B3C]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Table Selector & Stepper (Single Mode) */}
          {viewMode === 'single' && (
            <div className="py-3 flex flex-wrap items-center justify-between gap-3 relative z-10 border-b border-[#202030]">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrevTable}
                  className="px-2.5 py-1.5 rounded-xl bg-[#181824] hover:bg-[#242436] text-zinc-300 hover:text-white border border-[#2A2A3C] text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  title="Mesa Anterior"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Anterior</span>
                </button>

                <select
                  value={currentTable.number}
                  onChange={(e) => {
                    const found = allTables.find((t) => t.number === Number(e.target.value));
                    if (found) {
                      playBeep(800, 0.03);
                      onSelectTable(found);
                    }
                  }}
                  className="bg-[#181824] border border-[#2E2E44] text-[#00D26A] font-mono font-bold text-xs sm:text-sm rounded-xl px-3 py-1.5 focus:border-[#00D26A] outline-none cursor-pointer"
                >
                  {allTables.map((t) => (
                    <option key={t.number} value={t.number} className="bg-[#12121A] text-white">
                      Mesa {t.number.toString().padStart(2, '0')} {t.name ? `• ${t.name}` : ''} ({t.seats || 4}L)
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleNextTable}
                  className="px-2.5 py-1.5 rounded-xl bg-[#181824] hover:bg-[#242436] text-zinc-300 hover:text-white border border-[#2A2A3C] text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  title="Próxima Mesa"
                >
                  <span className="hidden sm:inline">Próxima</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Status & Capacity pills */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-zinc-400 flex items-center gap-1 bg-[#181824] px-2.5 py-1 rounded-lg border border-[#26263A]">
                  <Users className="w-3 h-3 text-[#00B8FF]" />
                  <span>{currentTable.seats || 4} Lugares</span>
                </span>
                <span
                  className={`text-[11px] font-black uppercase px-2.5 py-1 rounded-lg border ${
                    currentTable.status === 'occupied'
                      ? 'bg-[#FF2B4E]/15 text-[#FF4D6D] border-[#FF2B4E]/40'
                      : currentTable.status === 'bill_requested'
                      ? 'bg-[#FFC72C]/15 text-[#FFC72C] border-[#FFC72C]/40'
                      : currentTable.status === 'reserved'
                      ? 'bg-[#A855F7]/15 text-[#A855F7] border-[#A855F7]/40'
                      : 'bg-[#00D26A]/15 text-[#00D26A] border-[#00D26A]/40'
                  }`}
                >
                  {currentTable.status === 'occupied'
                    ? 'Ocupada'
                    : currentTable.status === 'bill_requested'
                    ? 'Pediu Conta'
                    : currentTable.status === 'reserved'
                    ? 'Reservada'
                    : 'Livre'}
                </span>
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <div className="py-4 relative z-10 max-h-[60vh] overflow-y-auto scrollbar-thin">
            {viewMode === 'single' ? (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                {/* Visual Printable Acrylic Display Card Preview */}
                <div className="md:col-span-6 flex justify-center">
                  <div
                    ref={printAreaRef}
                    id={`display-mesa-${currentTable.number}`}
                    className="w-full max-w-[270px] bg-white text-zinc-900 rounded-3xl p-5 shadow-2xl border-4 border-zinc-900 flex flex-col items-center text-center relative overflow-hidden"
                  >
                    {/* Top Restaurant Identification */}
                    <div className="space-y-0.5 mb-2">
                      <div className="text-[10px] uppercase font-extrabold tracking-widest text-zinc-500">
                        {tenant?.name || 'Lanchonete Dulci'}
                      </div>
                      <div className="text-xs font-black text-black uppercase tracking-tight flex items-center justify-center gap-1">
                        <UtensilsCrossed className="w-3 h-3 text-[#DA291C]" />
                        <span>Cardápio Digital</span>
                      </div>
                    </div>

                    {/* Prominent Table Number Callout */}
                    <div className="my-1.5 px-4 py-1.5 rounded-2xl bg-zinc-900 text-white w-full">
                      <div className="text-[9px] uppercase font-bold tracking-widest text-amber-400">
                        AUTOATENDIMENTO
                      </div>
                      <div className="text-2xl font-black font-mono tracking-wider">
                        MESA {currentTable.number.toString().padStart(2, '0')}
                      </div>
                      {currentTable.name && (
                        <div className="text-[10px] text-zinc-300 font-medium truncate">
                          {currentTable.name}
                        </div>
                      )}
                    </div>

                    {/* Crisp Dynamic QR Code */}
                    <div className="p-2 bg-white rounded-2xl border-2 border-zinc-200 my-2 shadow-inner">
                      {qrDataUrl ? (
                        <img
                          src={qrDataUrl}
                          alt={`QR Code Mesa ${currentTable.number}`}
                          className="w-44 h-44 object-contain rounded-lg"
                        />
                      ) : (
                        <div className="w-44 h-44 flex items-center justify-center bg-zinc-100 text-zinc-400 text-xs">
                          Gerando QR Code...
                        </div>
                      )}
                    </div>

                    {/* Step-by-Step Instructions */}
                    <div className="space-y-1 my-1 text-left w-full px-1">
                      <div className="text-[10px] text-zinc-700 font-bold flex items-center gap-1.5">
                        <span className="w-3.5 h-3.5 rounded-full bg-zinc-900 text-white text-[9px] font-black flex items-center justify-center shrink-0">
                          1
                        </span>
                        <span>Aponte a câmera do seu celular</span>
                      </div>
                      <div className="text-[10px] text-zinc-700 font-bold flex items-center gap-1.5">
                        <span className="w-3.5 h-3.5 rounded-full bg-zinc-900 text-white text-[9px] font-black flex items-center justify-center shrink-0">
                          2
                        </span>
                        <span>Faça seu pedido diretamente</span>
                      </div>
                      <div className="text-[10px] text-zinc-700 font-bold flex items-center gap-1.5">
                        <span className="w-3.5 h-3.5 rounded-full bg-zinc-900 text-white text-[9px] font-black flex items-center justify-center shrink-0">
                          3
                        </span>
                        <span>Acompanhe o preparo na cozinha</span>
                      </div>
                    </div>

                    {/* Wi-Fi footnote */}
                    <div className="mt-2 pt-2 border-t border-zinc-200 text-[9px] text-zinc-500 flex items-center justify-center gap-1 w-full">
                      <Wifi className="w-2.5 h-2.5 text-zinc-700" />
                      <span>Wi-Fi Grátis disponível no salão</span>
                    </div>
                  </div>
                </div>

                {/* Right Side: Details & Live Link */}
                <div className="md:col-span-6 space-y-4">
                  {/* Explanation Card */}
                  <div className="p-3.5 bg-[#171724] border border-[#28283E] rounded-2xl space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#00D26A]">
                      <Sparkles className="w-4 h-4" />
                      <span>Como Funciona a Vinculação Automática:</span>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      Ao escanear este QR Code, o cliente acessa instantaneamente o cardápio digital do 
                      restaurante com a <strong>Mesa {currentTable.number}</strong> já fixada e vinculada. 
                      Qualquer pedido enviado vai diretamente para a cozinha (KDS) e passa a constar na comanda desta mesa.
                    </p>
                  </div>

                  {/* Generated Dynamic URL */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Link Direto do Cardápio desta Mesa:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={targetTableUrl}
                        className="flex-1 bg-[#161622] border border-[#2B2B3E] rounded-xl px-3 py-2 text-xs text-zinc-300 font-mono focus:outline-none select-all"
                      />
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 border ${
                          copiedLink
                            ? 'bg-[#00D26A] text-black border-[#00D26A]'
                            : 'bg-[#1C1C28] hover:bg-[#28283C] text-white border-[#2C2C40]'
                        }`}
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedLink ? 'Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Direct Actions Grid */}
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={handleTestInApp}
                      className="py-2.5 px-3 rounded-xl bg-[#00D26A]/15 hover:bg-[#00D26A] text-[#00D26A] hover:text-black border border-[#00D26A]/30 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>Testar Cardápio</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadPng}
                      className="py-2.5 px-3 rounded-xl bg-[#1C1C28] hover:bg-[#28283C] text-white border border-[#2C2C40] text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      <Download className="w-3.5 h-3.5 text-[#FFC72C]" />
                      <span>Baixar PNG</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleShareWhatsApp}
                      className="py-2.5 px-3 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366] text-[#25D366] hover:text-black border border-[#25D366]/30 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>

                    <button
                      type="button"
                      onClick={handlePrint}
                      className="py-2.5 px-3 rounded-xl bg-[#00B8FF]/15 hover:bg-[#00B8FF] text-[#00B8FF] hover:text-black border border-[#00B8FF]/30 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Imprimir Placa</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Batch Mode: Grid of All Tables */
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-[#181826] p-3 rounded-2xl border border-[#28283E]">
                  <div className="text-xs text-zinc-300">
                    Exibindo todos os <strong>{allTables.length} QR Codes</strong> cadastrados no salão para impressão em lote.
                  </div>
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="px-4 py-2 bg-[#00D26A] hover:bg-[#00b85c] text-black font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
                  >
                    <Printer className="w-3.5 h-3.5 text-black" />
                    <span>Imprimir Todas ({allTables.length})</span>
                  </button>
                </div>

                {isGeneratingBatch ? (
                  <div className="py-12 text-center text-zinc-400 text-xs flex flex-col items-center justify-center gap-2">
                    <div className="w-6 h-6 border-2 border-[#00D26A] border-t-transparent rounded-full animate-spin" />
                    <span>Gerando QR Codes dinâmicos de todas as mesas...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                    {allTables.map((t) => {
                      const dataUrl = batchQrCodes[t.number];
                      return (
                        <div
                          key={t.number}
                          onClick={() => {
                            onSelectTable(t);
                            setViewMode('single');
                          }}
                          className="bg-[#171724] hover:bg-[#1E1E2E] border border-[#2B2B3E] hover:border-[#00D26A]/50 rounded-2xl p-3 flex flex-col items-center text-center gap-2 cursor-pointer transition-all group"
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="text-xs font-mono font-black text-white group-hover:text-[#00D26A]">
                              Mesa {t.number.toString().padStart(2, '0')}
                            </span>
                            <span className="text-[10px] text-zinc-400">
                              {t.seats || 4}L
                            </span>
                          </div>

                          <div className="p-1.5 bg-white rounded-xl shadow-md">
                            {dataUrl ? (
                              <img
                                src={dataUrl}
                                alt={`QR Mesa ${t.number}`}
                                className="w-24 h-24 object-contain"
                              />
                            ) : (
                              <div className="w-24 h-24 bg-zinc-100 flex items-center justify-center text-[10px] text-zinc-400">
                                Carregando...
                              </div>
                            )}
                          </div>

                          <span className="text-[10px] text-zinc-400 group-hover:text-white transition-colors">
                            {t.name || 'Salão'} • Clique p/ detalhes
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-[#202030] flex items-center justify-between text-[11px] text-zinc-500">
            <span>
              Padrão URL: <strong className="text-zinc-400 font-mono">{origin}/?mesa={currentTable.number}</strong>
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-[#1C1C28] hover:bg-[#28283C] text-zinc-300 hover:text-white rounded-xl font-bold transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
