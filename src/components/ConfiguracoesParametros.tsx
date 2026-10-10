import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, 
  Printer, 
  FileText, 
  MessageSquare, 
  Truck, 
  Percent, 
  Clock, 
  CheckCircle2, 
  Flame, 
  Save,
  Share2,
  Sliders,
  Building2,
  Sparkles,
  QrCode,
  Key,
  CreditCard,
  Wifi,
  Radio,
  Crown
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { playCashRegister, playBeep } from '../utils/audio';
import { WhatsAppConfiguracaoCompartilhamento } from './WhatsAppConfiguracaoCompartilhamento';
import { PixConfiguracaoPainel } from './PixConfiguracaoPainel';
import { ConfiguracaoGatewayPagamento } from './ConfiguracaoGatewayPagamento';
import { ThermalPrinterSettingsModal } from './ThermalPrinterSettingsModal';
import { SmartPOSPaymentModal } from './SmartPOSPaymentModal';
import { SuperAdminSuportePanel } from './SuperAdminSuportePanel';
import { SuperAdminConfiguracoesMaster } from './superadmin/SuperAdminConfiguracoesMaster';

type ConfigMode = 'super_admin' | 'usuario';
type ConfigTab = 'pix' | 'whatsapp' | 'impressao' | 'maquininhas' | 'taxas' | 'fiscal' | 'superadmin_suporte' | 'todos';

export const ConfiguracoesParametros: React.FC = () => {
  const { tenant, updateTenantSettings, tables, currentUser, setCurrentView } = useApp();
  const [configMode, setConfigMode] = useState<ConfigMode>(
    currentUser.role === 'super_admin' ? 'super_admin' : 'usuario'
  );
  const [activeTab, setActiveTab] = useState<ConfigTab>('pix');
  const [settings, setSettings] = useState(tenant.settings);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Modals state
  const [isThermalPrintersModalOpen, setIsThermalPrintersModalOpen] = useState(false);
  const [isPOSModalOpen, setIsPOSModalOpen] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateTenantSettings(settings);
    setSavedSuccess(true);
    playCashRegister();
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-6 pb-20 select-none">
      {/* Seletor Superior: Separação Clara entre Super Admin e Usuário */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2 bg-[#12121A] border border-[#242438] rounded-3xl shadow-lg">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => {
              setConfigMode('super_admin');
              playBeep(650, 0.05);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              configMode === 'super_admin'
                ? 'bg-gradient-to-r from-[#DA291C] to-[#FF7A00] text-white shadow-[0_0_15px_rgba(218,41,28,0.4)] border border-[#FFC72C]/40'
                : 'text-zinc-400 hover:text-white hover:bg-[#1A1A28]'
            }`}
          >
            <Crown className="w-4 h-4 text-[#FFC72C]" />
            <span>Configurações do Super Admin</span>
            <span className="text-[10px] bg-black/30 text-[#FFC72C] px-2 py-0.5 rounded-full font-bold">
              12 Módulos Master
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setConfigMode('usuario');
              playBeep(650, 0.05);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              configMode === 'usuario'
                ? 'bg-[#6366F1] text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]'
                : 'text-zinc-400 hover:text-white hover:bg-[#1A1A28]'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Configurações do Usuário (Loja / PDV)</span>
            <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full font-bold">
              {tenant.name}
            </span>
          </button>
        </div>

        <div className="text-[11px] text-zinc-400 font-medium px-2 flex items-center gap-1.5 justify-end">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Sessão: <strong className="text-white">{currentUser.name}</strong></span>
        </div>
      </div>

      {/* Visão de Super Admin */}
      {configMode === 'super_admin' && (
        <SuperAdminConfiguracoesMaster />
      )}

      {/* Visão do Usuário (Configurações da Loja / Filial / PDV) */}
      {configMode === 'usuario' && (
        <div className="space-y-6">
          {/* Abas de Navegação de Configurações da Loja */}
          <div className="flex items-center gap-2 p-1.5 bg-[#12121A] border border-[#242438] rounded-3xl overflow-x-auto scrollbar-none shadow-lg">
            <button
              type="button"
              onClick={() => {
                setActiveTab('pix');
                playBeep(600, 0.05);
              }}
              className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeTab === 'pix'
                  ? 'bg-[#00E676] text-black shadow-[0_0_15px_rgba(0,230,118,0.4)]'
                  : 'text-[#A1A1AA] hover:text-white hover:bg-[#1A1A28]'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Gateways de Pagamento</span>
              <span className="text-[10px] bg-black/20 text-black px-2 py-0.5 rounded-full font-bold">
                PIX & CARTÃO
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('whatsapp');
                playBeep(600, 0.05);
              }}
              className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeTab === 'whatsapp'
                  ? 'bg-[#25D366] text-white shadow-[0_0_15px_rgba(37,211,102,0.4)]'
                  : 'text-[#A1A1AA] hover:text-white hover:bg-[#1A1A28]'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>WhatsApp & Cardápio</span>
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">
                LINK & API
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('impressao');
                playBeep(600, 0.05);
              }}
              className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeTab === 'impressao'
                  ? 'bg-[#FFC72C] text-black shadow-[0_0_15px_rgba(255,199,44,0.4)]'
                  : 'text-[#A1A1AA] hover:text-white hover:bg-[#1A1A28]'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>Impressão Térmica</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('maquininhas');
                playBeep(600, 0.05);
              }}
              className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeTab === 'maquininhas'
                  ? 'bg-gradient-to-r from-[#DA291C] to-[#FF7A00] text-white shadow-[0_0_15px_rgba(218,41,28,0.4)]'
                  : 'text-[#A1A1AA] hover:text-white hover:bg-[#1A1A28]'
              }`}
            >
              <CreditCard className="w-4 h-4 text-[#FFC72C]" />
              <span>Maquininhas (Smart POS & TEF)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('taxas');
                playBeep(600, 0.05);
              }}
              className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeTab === 'taxas'
                  ? 'bg-[#FF6B00] text-white shadow-[0_0_15px_rgba(255,107,0,0.4)]'
                  : 'text-[#A1A1AA] hover:text-white hover:bg-[#1A1A28]'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Taxas & Delivery</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('fiscal');
                playBeep(600, 0.05);
              }}
              className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeTab === 'fiscal'
                  ? 'bg-[#00E676] text-black shadow-[0_0_15px_rgba(0,230,118,0.4)]'
                  : 'text-[#A1A1AA] hover:text-white hover:bg-[#1A1A28]'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>NFC-e / Fiscal</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('superadmin_suporte');
                playBeep(600, 0.05);
              }}
              className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeTab === 'superadmin_suporte'
                  ? 'bg-gradient-to-r from-[#DA291C] to-[#FF7A00] text-white shadow-[0_0_15px_rgba(218,41,28,0.4)] border border-[#FFC72C]/40'
                  : 'text-[#A1A1AA] hover:text-white hover:bg-[#1A1A28]'
              }`}
            >
              <Crown className="w-4 h-4 text-[#FFC72C]" />
              <span>Suporte ao Usuário</span>
              <span className="text-[10px] bg-red-950/80 text-[#FFC72C] px-2 py-0.5 rounded-full font-bold border border-[#FFC72C]/30">
                CHAMADOS
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('todos');
                playBeep(600, 0.05);
              }}
              className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeTab === 'todos'
                  ? 'bg-[#DA291C] text-white shadow-[0_0_15px_rgba(218,41,28,0.4)]'
                  : 'text-[#A1A1AA] hover:text-white hover:bg-[#1A1A28]'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Todos os Módulos</span>
            </button>
          </div>

          {/* Renderização Condicional da Aba Selecionada */}
          {activeTab === 'superadmin_suporte' && (
            <SuperAdminSuportePanel />
          )}

          {activeTab === 'pix' && (
            <ConfiguracaoGatewayPagamento />
          )}

          {activeTab === 'whatsapp' && (
            <WhatsAppConfiguracaoCompartilhamento />
          )}

          {(activeTab === 'impressao' || activeTab === 'maquininhas' || activeTab === 'taxas' || activeTab === 'fiscal' || activeTab === 'todos') && (
        <div className="space-y-6">
          {/* Header Padrão das outras abas */}
          <motion.div 
            layout
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-r from-[#141218] via-[#181522] to-[#12121A] border border-[#28283C] shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#FF6B00] px-3 py-1 rounded-full bg-[#FF6B00]/15 border border-[#FF6B00]/30">Parâmetros Operacionais</span>
                <span className="text-xs text-[#71717A]">•</span>
                <span className="text-xs font-bold text-[#FFC72C]">{tenant.name}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black font-display text-white tracking-tight pt-1">
                Configurações do Restaurante & PDV
              </h1>
              <p className="text-xs sm:text-sm text-[#A1A1AA] max-w-2xl leading-relaxed">
                Ajuste impressoras térmicas (58mm/80mm), maquininhas Smart POS (TEF), taxas de entrega por KM, NFC-e/SAT e automações da sua unidade.
              </p>
            </div>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 500, damping: 22 }}
              onClick={handleSave}
              className="bg-gradient-to-r from-[#DA291C] to-[#FF6B00] hover:brightness-110 text-white px-6 py-3 rounded-2xl text-xs sm:text-sm font-black shadow-[0_0_15px_rgba(218,41,28,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 border border-[#FFC72C]/30 shrink-0 w-full md:w-auto"
            >
              <Save className="w-4 h-4 text-[#FFC72C]" />
              <span>SALVAR PARÂMETROS</span>
            </motion.button>
          </motion.div>

          <AnimatePresence>
            {savedSuccess && (
              <motion.div 
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="p-4 bg-[#00E676]/20 border border-[#00E676] rounded-2xl text-xs text-[#00E676] font-bold flex items-center gap-2 shadow-lg overflow-hidden"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Configurações atualizadas e sincronizadas com todas as estações de trabalho!</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Settings Sections Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Impressão Térmica */}
            {(activeTab === 'impressao' || activeTab === 'todos') && (
              <motion.div 
                layout
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ layout: { type: 'spring', stiffness: 350, damping: 30 }, duration: 0.2 }}
                className="bg-[#12121A] border border-[#242438] p-6 rounded-3xl space-y-4 shadow-xl"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <Printer className="w-5 h-5 text-[#FFC72C]" />
                    <span>Impressoras Térmicas de Recibo & Comanda</span>
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFC72C]/15 text-[#FFC72C] border border-[#FFC72C]/30">
                    ESC/POS
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-[#A1A1AA] mb-1">Largura da Bobina Térmica Padrão</label>
                    <select
                      value={settings.thermalPaperWidth || settings.printerPaperWidth || '80mm'}
                      onChange={e => setSettings({ ...settings, thermalPaperWidth: e.target.value as any, printerPaperWidth: e.target.value as any })}
                      className="w-full bg-[#161624] border border-[#282838] rounded-2xl px-4 py-2.5 text-xs text-white focus:border-[#DA291C] focus:outline-none"
                    >
                      <option value="80mm">80mm (Padrão Epson TM-T20, Elgin i9, Bematech MP-4200 TH)</option>
                      <option value="58mm">58mm (Mini Impressora Compacta Bluetooth / Bobina Estreita)</option>
                    </select>
                  </div>

                  <div className="space-y-2 pt-2">
                    <label className="flex items-center gap-2 text-xs text-[#D4D4D8] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.printAutoOnOrder}
                        onChange={e => setSettings({ ...settings, printAutoOnOrder: e.target.checked })}
                        className="rounded accent-[#DA291C]"
                      />
                      <span>Imprimir automaticamente no PDV ao finalizar venda</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs text-[#D4D4D8] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.printKitchenCopy}
                        onChange={e => setSettings({ ...settings, printKitchenCopy: e.target.checked })}
                        className="rounded accent-[#DA291C]"
                      />
                      <span>Imprimir 2ª via separada para a Cozinha / Expedição</span>
                    </label>
                  </div>

                  {/* Open advanced thermal modal */}
                  <div className="pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setCurrentView('gerenciamento_impressoras')}
                        className="w-full py-3 px-4 bg-gradient-to-r from-sky-500 to-blue-600 hover:brightness-110 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md active:scale-98"
                      >
                        <Printer className="w-4 h-4 text-white" />
                        <span>Módulo: Gerenciamento de Impressoras (Rede/USB)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsThermalPrintersModalOpen(true)}
                        className="w-full py-3 px-4 bg-[#1B1B28] hover:bg-[#252538] text-white border border-[#3A3A54] rounded-2xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md active:scale-98"
                      >
                        <Printer className="w-4 h-4 text-[#FFC72C]" />
                        <span>Configurar Roteamento & Provas de Impressão</span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Maquininhas Smart POS & TEF */}
            {(activeTab === 'maquininhas' || activeTab === 'todos') && (
              <motion.div 
                layout
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ layout: { type: 'spring', stiffness: 350, damping: 30 }, duration: 0.2, delay: 0.05 }}
                className="bg-[#12121A] border border-[#242438] p-6 rounded-3xl space-y-4 shadow-xl"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-[#00D26A]" />
                    <span>Maquininhas Smart POS (Crédito, Débito e Pix)</span>
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#00D26A]/15 text-[#00E676] border border-[#00D26A]/30 flex items-center gap-1">
                    <Wifi className="w-3 h-3" /> TEF Conectado
                  </span>
                </div>

                <div className="space-y-3 text-xs text-[#A1A1AA]">
                  <p className="leading-relaxed">
                    Permite enviar o valor da Mesa ou Comanda diretamente para o visor da maquininha sem digitação manual. O sistema registra o NSU, autorização e baixa automaticamente a conta no salão.
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-3 bg-[#161624] border border-[#262638] rounded-2xl">
                      <div className="font-bold text-white mb-0.5">Adquirentes Compatíveis:</div>
                      <div className="text-zinc-400">Stone Smart, Cielo LIO, PagBank PRO, Rede Smart, SafraPay</div>
                    </div>
                    <div className="p-3 bg-[#161624] border border-[#262638] rounded-2xl">
                      <div className="font-bold text-white mb-0.5">Formas de Pagamento:</div>
                      <div className="text-zinc-400">Crédito à vista / parcelado, Débito, Pix no visor e Voucher Refeição</div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setIsPOSModalOpen(true)}
                      className="w-full py-3 px-4 bg-gradient-to-r from-[#DA291C] to-[#FF7A00] hover:brightness-110 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition-all shadow-[0_0_15px_rgba(218,41,28,0.3)] active:scale-98"
                    >
                      <CreditCard className="w-4 h-4 text-[#FFC72C]" />
                      <span>Simular / Testar Cobrança na Maquininha Smart POS</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Taxas & Logística */}
            {(activeTab === 'taxas' || activeTab === 'todos') && (
              <motion.div 
                layout
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ layout: { type: 'spring', stiffness: 350, damping: 30 }, duration: 0.2, delay: 0.05 }}
                className="bg-[#12121A] border border-[#242438] p-6 rounded-3xl space-y-4 shadow-xl"
              >
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Truck className="w-5 h-5 text-[#FF6B00]" />
                  <span>Taxa de Entrega & Serviço de Salão</span>
                </h3>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-[#A1A1AA] mb-1">Taxa Base de Entrega (R$)</label>
                      <input
                        type="number"
                        value={settings.deliveryBaseFee || settings.defaultDeliveryFee || 7.5}
                        onChange={e => setSettings({ ...settings, deliveryBaseFee: Number(e.target.value), defaultDeliveryFee: Number(e.target.value) })}
                        className="w-full bg-[#161624] border border-[#282838] rounded-2xl px-4 py-2 text-xs text-white focus:border-[#DA291C] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-[#A1A1AA] mb-1">Adicional por KM (R$)</label>
                      <input
                        type="number"
                        value={settings.deliveryFeePerKm || 1.5}
                        onChange={e => setSettings({ ...settings, deliveryFeePerKm: Number(e.target.value) })}
                        className="w-full bg-[#161624] border border-[#282838] rounded-2xl px-4 py-2 text-xs text-white focus:border-[#DA291C] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-[#A1A1AA] mb-1">Taxa de Serviço de Atendentes no Salão (%)</label>
                    <input
                      type="number"
                      value={settings.serviceTaxPercent}
                      onChange={e => setSettings({ ...settings, serviceTaxPercent: Number(e.target.value) })}
                      className="w-full bg-[#161624] border border-[#282838] rounded-2xl px-4 py-2 text-xs text-white focus:border-[#DA291C] focus:outline-none"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Emissão Fiscal NFC-e */}
            {(activeTab === 'fiscal' || activeTab === 'todos') && (
              <motion.div 
                layout
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ layout: { type: 'spring', stiffness: 350, damping: 30 }, duration: 0.2, delay: 0.1 }}
                className="bg-[#12121A] border border-[#242438] p-6 rounded-3xl space-y-4 shadow-xl"
              >
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#00E676]" />
                  <span>Módulo Fiscal NFC-e / SAT / SPED</span>
                </h3>

                <div className="space-y-3 text-xs text-[#A1A1AA]">
                  <div className="p-3 bg-[#161624] rounded-2xl border border-[#262638]">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-white">Status do Certificado Digital A1:</span>
                      <span className="text-[#00E676] font-bold">Válido até 12/2027</span>
                    </div>
                    <div className="text-[10px]">CNPJ: {tenant.cnpj || '38.492.011/0001-85'} • SEFAZ SP Online</div>
                  </div>

                  <label className="flex items-center gap-2 text-xs text-[#D4D4D8] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autoEmitNfce ?? true}
                      onChange={e => setSettings({ ...settings, autoEmitNfce: e.target.checked })}
                      className="rounded accent-[#00E676]"
                    />
                    <span>Emitir NFC-e automaticamente em todas as vendas do PDV e Cardápio</span>
                  </label>
                </div>
              </motion.div>
            )}

            {/* Atendente Virtual */}
            {(activeTab === 'fiscal' || activeTab === 'todos') && (
              <motion.div 
                layout
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ layout: { type: 'spring', stiffness: 350, damping: 30 }, duration: 0.2, delay: 0.15 }}
                className="bg-[#12121A] border border-[#242438] p-6 rounded-3xl space-y-4 shadow-xl"
              >
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-[#00E676]" />
                  <span>Automação & Atendente Virtual</span>
                </h3>

                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-xs text-[#D4D4D8] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.enableWhatsappBot ?? true}
                      onChange={e => setSettings({ ...settings, enableWhatsappBot: e.target.checked })}
                      className="rounded accent-[#00E676]"
                    />
                    <span>Ativar Atendente Inteligente Anota AI no WhatsApp</span>
                  </label>

                  <div className="p-3 bg-[#161624] rounded-2xl border border-[#262638] text-xs text-[#A1A1AA]">
                    O bot responde dúvidas sobre o cardápio, calcula frete pelo CEP e lança pedidos direto no KDS.
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}
        </div>
      )}

      {/* Embedded Modals */}
      <ThermalPrinterSettingsModal
        isOpen={isThermalPrintersModalOpen}
        onClose={() => setIsThermalPrintersModalOpen(false)}
      />

      <SmartPOSPaymentModal
        isOpen={isPOSModalOpen}
        onClose={() => setIsPOSModalOpen(false)}
        target={{
          type: 'mesa',
          id: 1,
          title: 'Mesa 01 - Teste de Maquininha',
          amount: 89.90,
          customerName: 'Cliente Teste TEF'
        }}
        onPaymentApproved={(result) => {
          setIsPOSModalOpen(false);
          playCashRegister();
        }}
      />
    </div>
  );
};
