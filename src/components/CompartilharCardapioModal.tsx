import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  Send, 
  Copy, 
  Check, 
  ExternalLink, 
  X, 
  Sparkles, 
  QrCode, 
  Phone, 
  Share2, 
  UtensilsCrossed,
  Truck,
  Tag
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { playBeep } from '../utils/audio';

interface CompartilharCardapioModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTable?: number;
  initialPhone?: string;
  initialCustomerName?: string;
}

export const CompartilharCardapioModal: React.FC<CompartilharCardapioModalProps> = ({
  isOpen,
  onClose,
  initialTable,
  initialPhone,
  initialCustomerName
}) => {
  const { tenant } = useApp();

  const [channel, setChannel] = useState<'geral' | 'mesa' | 'delivery' | 'promo'>(initialTable ? 'mesa' : 'geral');
  const [tableNumber, setTableNumber] = useState<number>(initialTable || 1);
  const [customerPhone, setCustomerPhone] = useState<string>(initialPhone || '');
  const [customerName, setCustomerName] = useState<string>(initialCustomerName || '');
  const [promoCode, setPromoCode] = useState<string>('NEON10');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);

  // Helper phone cleanup & mask
  const cleanPhone = (val: string) => val.replace(/\D/g, '');
  const formatPhoneMask = (val: string) => {
    const digits = cleanPhone(val);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  // Base Menu URL
  const domain = tenant?.settings?.menuCustomDomain || 'https://neonfood.app/cardapio';
  const slug = tenant?.settings?.menuCustomSlug || (tenant?.name ? tenant.name.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'lanchonete-dulci');

  const menuUrl = useMemo(() => {
    let url = `${domain}?loja=${slug}`;
    if (channel === 'mesa') url += `&mesa=${tableNumber}`;
    if (channel === 'delivery') url += `&origem=delivery`;
    if (channel === 'promo') url += `&cupom=${promoCode}`;
    return url;
  }, [domain, slug, channel, tableNumber, promoCode]);

  // Formatted WhatsApp Message
  const formattedMessage = useMemo(() => {
    const greeting = customerName.trim() ? `Olá, *${customerName.trim()}*!` : `Olá!`;
    const storeName = tenant?.name || 'Lanchonete Dulci';

    if (channel === 'mesa') {
      return `${greeting} Seja muito bem-vindo ao *${storeName}*! 🍔✨\n\n` +
        `Para visualizar nosso cardápio completo da *Mesa #${tableNumber}* e fazer seus pedidos pelo celular, acesse:\n` +
        `👉 ${menuUrl}\n\n` +
        `Qualquer dúvida, estamos à sua disposição!`;
    }

    if (channel === 'delivery') {
      return `${greeting} Que tal saborear os melhores lanches do *${storeName}* no conforto da sua casa? 🛵💨\n\n` +
        `Acesse nosso cardápio digital de delivery e peça em poucos segundos:\n` +
        `👉 ${menuUrl}\n\n` +
        `Entregas rápidas com rastreio em tempo real!`;
    }

    if (channel === 'promo') {
      return `${greeting} Temos um presente especial para você no *${storeName}*! 🎁🎉\n\n` +
        `Use o cupom especial *${promoCode}* e aproveite nosso cardápio online com descontos exclusivos:\n` +
        `👉 ${menuUrl}\n\n` +
        `Clique no link acima e garanta sua oferta!`;
    }

    // Geral
    return `${greeting} Acesse o cardápio digital completo do *${storeName}* pelo link abaixo: 🍔🍟🥤\n\n` +
      `👉 ${menuUrl}\n\n` +
      `Faça seu pedido diretamente pelo celular de forma rápida e segura!`;
  }, [customerName, tenant?.name, channel, tableNumber, promoCode, menuUrl]);

  // Direct wa.me URL
  const waMeUrl = useMemo(() => {
    const rawPhone = cleanPhone(customerPhone);
    const textEncoded = encodeURIComponent(formattedMessage);
    if (rawPhone.length >= 10) {
      const phoneWithDDI = rawPhone.length === 10 || rawPhone.length === 11 ? `55${rawPhone}` : rawPhone;
      return `https://wa.me/${phoneWithDDI}?text=${textEncoded}`;
    }
    return `https://wa.me/?text=${textEncoded}`;
  }, [customerPhone, formattedMessage]);

  const handleOpenWaMe = () => {
    playBeep(980, 0.08);
    window.open(waMeUrl, '_blank');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(menuUrl);
    setCopiedLink(true);
    playBeep(880, 0.04);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(formattedMessage);
    setCopiedText(true);
    playBeep(880, 0.04);
    setTimeout(() => setCopiedText(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg bg-[#12121A] border border-[#2A2A3E] rounded-3xl p-6 text-white shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto scrollbar-thin"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#222234] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#25D366]/20 border border-[#25D366]/40 text-[#25D366] flex items-center justify-center shadow-[0_0_15px_rgba(37,211,102,0.3)]">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <span>Compartilhar Cardápio</span>
                  <span className="text-[10px] font-mono font-bold bg-[#25D366] text-black px-2 py-0.5 rounded-full">
                    wa.me
                  </span>
                </h3>
                <p className="text-xs text-[#A1A1AA]">
                  Envio rápido do link do cardápio digital via WhatsApp para o cliente
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#1C1C28] hover:bg-[#28283C] text-[#A1A1AA] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Channel Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#A1A1AA] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#FFC72C]" />
              <span>Selecione o Tipo de Link</span>
            </label>
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-[#181824] rounded-2xl border border-[#252536]">
              <button
                type="button"
                onClick={() => { setChannel('geral'); playBeep(700, 0.02); }}
                className={`py-2 text-xs font-bold rounded-xl flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  channel === 'geral' 
                    ? 'bg-[#25D366] text-black font-black shadow-md' 
                    : 'text-[#A1A1AA] hover:text-white'
                }`}
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Geral</span>
              </button>

              <button
                type="button"
                onClick={() => { setChannel('mesa'); playBeep(700, 0.02); }}
                className={`py-2 text-xs font-bold rounded-xl flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  channel === 'mesa' 
                    ? 'bg-[#FFC72C] text-black font-black shadow-md' 
                    : 'text-[#A1A1AA] hover:text-white'
                }`}
              >
                <UtensilsCrossed className="w-3.5 h-3.5" />
                <span>Mesa Salão</span>
              </button>

              <button
                type="button"
                onClick={() => { setChannel('delivery'); playBeep(700, 0.02); }}
                className={`py-2 text-xs font-bold rounded-xl flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  channel === 'delivery' 
                    ? 'bg-[#FF6B00] text-white font-black shadow-md' 
                    : 'text-[#A1A1AA] hover:text-white'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Delivery</span>
              </button>

              <button
                type="button"
                onClick={() => { setChannel('promo'); playBeep(700, 0.02); }}
                className={`py-2 text-xs font-bold rounded-xl flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  channel === 'promo' 
                    ? 'bg-[#DA291C] text-white font-black shadow-md' 
                    : 'text-[#A1A1AA] hover:text-white'
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                <span>Promoção</span>
              </button>
            </div>
          </div>

          {/* Conditional Channel Inputs */}
          {channel === 'mesa' && (
            <div className="p-3 bg-[#1A1822] border border-[#FFC72C]/30 rounded-2xl flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-white">Número da Mesa do Cliente:</div>
                <div className="text-[10px] text-[#A1A1AA]">O cardápio abrirá pré-configurado nesta mesa</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#FFC72C]">Mesa #</span>
                <select
                  value={tableNumber}
                  onChange={(e) => setTableNumber(Number(e.target.value))}
                  className="bg-[#12121A] border border-[#28283C] text-sm font-black text-[#FFC72C] rounded-xl px-3 py-1.5 focus:border-[#FFC72C] outline-none"
                >
                  {Array.from({ length: 30 }, (_, i) => i + 1).map(n => (
                    <option key={n} value={n} className="bg-[#12121A] text-white">
                      Mesa {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {channel === 'promo' && (
            <div className="p-3 bg-[#201416] border border-[#DA291C]/30 rounded-2xl flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-white">Código do Cupom de Desconto:</div>
                <div className="text-[10px] text-[#A1A1AA]">Aplicado automaticamente no carrinho</div>
              </div>
              <input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                placeholder="Ex: NEON10"
                className="w-28 bg-[#12121A] border border-[#28283C] text-xs font-mono font-black text-[#FFC72C] rounded-xl px-3 py-1.5 text-center uppercase focus:border-[#DA291C] outline-none"
              />
            </div>
          )}

          {/* Customer Specific Fields (Optional Phone & Name) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#A1A1AA] mb-1 flex items-center justify-between">
                <span>WhatsApp do Cliente</span>
                <span className="text-[10px] text-[#71717A]">(Opcional)</span>
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-[#25D366] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(formatPhoneMask(e.target.value))}
                  placeholder="(11) 99999-9999"
                  className="w-full bg-[#181826] border border-[#28283C] rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-[#71717A] focus:border-[#25D366] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#A1A1AA] mb-1 flex items-center justify-between">
                <span>Nome do Cliente</span>
                <span className="text-[10px] text-[#71717A]">(Opcional)</span>
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Ex: Carlos Silva"
                className="w-full bg-[#181826] border border-[#28283C] rounded-xl px-3 py-2 text-xs text-white placeholder-[#71717A] focus:border-[#25D366] outline-none"
              />
            </div>
          </div>

          {/* Generated Link Display */}
          <div className="p-3 bg-[#0D0D14] border border-[#222232] rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#A1A1AA] font-bold flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5 text-[#00E676]" />
                Link Oficial do Cardápio:
              </span>
              <button
                type="button"
                onClick={() => setShowQrCode(!showQrCode)}
                className="text-[10px] font-bold text-[#FFC72C] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <QrCode className="w-3 h-3" />
                <span>{showQrCode ? 'Ocultar QR Code' : 'Mostrar QR Code'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={menuUrl}
                className="flex-1 bg-[#14141E] border border-[#28283C] rounded-xl px-3 py-1.5 text-xs text-[#00E676] font-mono select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3 py-1.5 bg-[#1C1C2A] hover:bg-[#28283C] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-[#00E676]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>

            {/* Optional QR Code Preview */}
            {showQrCode && (
              <div className="p-4 bg-white rounded-xl flex flex-col items-center justify-center gap-2 mt-2">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(menuUrl)}`}
                  alt="QR Code do Cardápio"
                  className="w-36 h-36 rounded-lg"
                />
                <div className="text-[11px] font-black text-black">Aponte a câmera para acessar o cardápio</div>
              </div>
            )}
          </div>

          {/* Formatted Message Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-[#A1A1AA]">
              <span className="font-bold flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-[#25D366]" />
                Mensagem Formatada do Atendente:
              </span>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="text-[10px] text-[#25D366] hover:underline flex items-center gap-1 cursor-pointer font-bold"
              >
                {copiedText ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedText ? 'Texto Copiado!' : 'Copiar Mensagem'}</span>
              </button>
            </div>

            <div className="p-3 bg-[#141A16] border border-[#25D366]/30 rounded-2xl text-xs text-zinc-200 font-sans whitespace-pre-line leading-relaxed max-h-32 overflow-y-auto">
              {formattedMessage}
            </div>
          </div>

          {/* Protocol wa.me Info */}
          <div className="flex items-center justify-between text-[10px] text-[#71717A] bg-[#161622] px-3 py-1.5 rounded-xl border border-[#242436]">
            <span>Protocolo nativo: <strong className="text-[#25D366] font-mono">wa.me</strong> (abertura sem fricção)</span>
            <span className="font-mono text-zinc-400 truncate max-w-[200px]">{waMeUrl}</span>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={handleOpenWaMe}
              className="w-full sm:flex-1 py-3.5 bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:brightness-110 text-black font-black rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(37,211,102,0.4)] cursor-pointer transition-all border border-[#25D366]"
            >
              <Send className="w-4 h-4 text-black" />
              <span>ABRIR NO WHATSAPP (WA.ME)</span>
            </motion.button>

            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-3.5 bg-[#1C1C28] hover:bg-[#252536] text-[#A1A1AA] hover:text-white font-bold rounded-2xl text-xs transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
