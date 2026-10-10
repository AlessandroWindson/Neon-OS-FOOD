import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Printer, 
  Settings, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  RefreshCw, 
  CheckCircle2, 
  Wifi, 
  Usb, 
  Bluetooth, 
  Sliders, 
  FileText, 
  Utensils, 
  Beer, 
  Store, 
  Receipt,
  Eye,
  Terminal,
  BellRing,
  CookingPot,
  Cpu,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ThermalPrinterConfig } from '../types';
import { formatDateTime } from '../utils/formatters';
import { playBeep, playKitchenBell } from '../utils/audio';
import { thermalPrinterService } from '../services/escposService';

interface ThermalPrinterSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ThermalPrinterSettingsModal: React.FC<ThermalPrinterSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { tenant, updateTenantSettings, setPrintOrder } = useApp();

  const [activeTab, setActiveTab] = useState<'printers' | 'layout' | 'routing' | 'escpos'>('printers');
  const [escposConsoleOutput, setEscposConsoleOutput] = useState<{
    success: boolean;
    message: string;
    bytesCount: number;
    hexPreview: string;
    printerName: string;
    timestamp: string;
  } | null>(null);
  const [selectedEscPosPrinterId, setSelectedEscPosPrinterId] = useState<string>('prn_02');

  // Registered Printers
  const [printers, setPrinters] = useState<ThermalPrinterConfig[]>([
    {
      id: 'prn_01',
      name: 'Impressora Principal - Caixa & Balcão',
      location: 'caixa',
      paperWidth: '80mm',
      interfaceType: 'usb',
      status: 'online',
      printCopies: 1,
      autoPrintTriggers: {
        onNewOrder: true,
        onBillRequested: true,
        onPaymentSettled: true,
        onSangria: true,
        onKitchenProduction: false,
      },
      customHeader: 'NEON BURGER OS - MATRIZ',
      customFooter: 'OBRIGADO PELA PREFERÊNCIA! VOLTE SEMPRE.',
    },
    {
      id: 'prn_02',
      name: 'Impressora Cozinha - Praça Quente / KDS',
      location: 'cozinha',
      paperWidth: '80mm',
      interfaceType: 'network_ip',
      ipAddress: '192.168.1.210:9100',
      status: 'online',
      printCopies: 1,
      autoPrintTriggers: {
        onNewOrder: true,
        onBillRequested: false,
        onPaymentSettled: false,
        onSangria: false,
        onKitchenProduction: true,
      },
      customHeader: '*** VIA DA COZINHA ***',
      customFooter: 'ATENÇÃO AO PONTO DA CARNE',
    },
    {
      id: 'prn_03',
      name: 'Impressora Bar & Bebidas',
      location: 'bar',
      paperWidth: '58mm',
      interfaceType: 'bluetooth',
      status: 'online',
      printCopies: 1,
      autoPrintTriggers: {
        onNewOrder: true,
        onBillRequested: false,
        onPaymentSettled: false,
        onSangria: false,
        onKitchenProduction: false,
      },
      customHeader: '*** BAR & BEBIDAS ***',
      customFooter: 'SERVIR COM GELO E LIMÃO',
    },
    {
      id: 'prn_04',
      name: 'Impressora Delivery & Expedição',
      location: 'delivery',
      paperWidth: '80mm',
      interfaceType: 'network_ip',
      ipAddress: '192.168.1.215:9100',
      status: 'online',
      printCopies: 2,
      autoPrintTriggers: {
        onNewOrder: true,
        onBillRequested: false,
        onPaymentSettled: true,
        onSangria: false,
        onKitchenProduction: false,
      },
      customHeader: '*** EXPEDIÇÃO & MOTOBOY ***',
      customFooter: 'CONFERIR LACRE DE SEGURANÇA',
    },
  ]);

  // Selected printer to edit
  const [selectedPrinterId, setSelectedPrinterId] = useState<string>('prn_01');

  // Preview paper width toggle
  const [previewWidth, setPreviewWidth] = useState<'58mm' | '80mm'>('80mm');

  // Test Print status feedback
  const [testPrintSuccess, setTestPrintSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const currentPrinter = printers.find(p => p.id === selectedPrinterId) || printers[0];

  const handleUpdateCurrentPrinter = (updates: Partial<ThermalPrinterConfig>) => {
    setPrinters(prev => prev.map(p => p.id === currentPrinter.id ? { ...p, ...updates } : p));
  };

  // Test print trigger
  const handleTestPrint = (printer: ThermalPrinterConfig) => {
    playKitchenBell();
    setTestPrintSuccess(true);

    // Launch print simulation order with test slip content
    setPrintOrder({
      id: `test_print_${Date.now()}`,
      orderNumber: 999,
      displayCode: 'TESTE #01',
      tenantId: 'tenant_01',
      branchId: 'branch_01',
      channel: 'pdv_balcao',
      status: 'completed',
      customerName: `Página de Teste - ${printer.name}`,
      items: [
        {
          id: 'item_test_1',
          productId: 'p_test_1',
          productName: `Teste Bobina Térmica ${printer.paperWidth}`,
          quantity: 1,
          unitPrice: 0.00,
          totalPrice: 0.00,
          station: 'assembly',
          status: 'ready',
          notes: `Interface: ${printer.interfaceType.toUpperCase()} • ${printer.ipAddress || 'Porta USB 001'}`
        },
        {
          id: 'item_test_2',
          productId: 'p_test_2',
          productName: 'Guilhotina Automática',
          quantity: 1,
          unitPrice: 0.00,
          totalPrice: 0.00,
          station: 'assembly',
          status: 'ready',
          notes: 'Alinhamento OK • Densidade 100%'
        }
      ],
      subtotal: 0,
      serviceFee: 0,
      discount: 0,
      deliveryFee: 0,
      total: 0,
      paymentMethod: 'pix',
      paymentStatus: 'paid',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    setTimeout(() => {
      setTestPrintSuccess(false);
    }, 3000);
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-[#101018] border border-[#242436] rounded-2xl sm:rounded-3xl p-4 sm:p-6 max-w-4xl w-full shadow-2xl relative flex flex-col max-h-[94vh] sm:max-h-[92vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1E1E2C] pb-3 sm:pb-4 mb-3 sm:mb-4">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-[#FFC72C] to-[#FF7A00] flex items-center justify-center text-black shadow-[0_0_12px_rgba(255,199,44,0.4)] shrink-0">
              <Printer className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black text-white">Central de Impressoras Térmicas</h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#FFC72C]/15 text-[#FFC72C] border border-[#FFC72C]/30">
                  ESC/POS 58mm & 80mm
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-zinc-400 line-clamp-1 sm:line-clamp-none">
                Gerencie impressoras de cupom, vias de cozinha/bar e roteamento automático de pedidos.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 min-h-[36px] min-w-[36px] rounded-xl bg-[#1A1A26] text-zinc-400 hover:text-white hover:bg-[#262638] transition-colors cursor-pointer flex items-center justify-center shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs (Horizontally scrollable on mobile) */}
        <div className="flex items-center gap-2 border-b border-[#1E1E2C] pb-3 mb-3 sm:mb-4 overflow-x-auto scrollbar-none">
          <button
            onClick={() => {
              setActiveTab('printers');
              playBeep(850, 0.02);
            }}
            className={`px-3.5 py-2 min-h-[38px] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'printers'
                ? 'bg-[#FFC72C] text-black shadow-[0_0_12px_rgba(255,199,44,0.3)]'
                : 'bg-[#161622] text-zinc-400 hover:text-white'
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Impressoras Cadastradas ({printers.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('routing');
              playBeep(850, 0.02);
            }}
            className={`px-3.5 py-2 min-h-[38px] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'routing'
                ? 'bg-[#FFC72C] text-black shadow-[0_0_12px_rgba(255,199,44,0.3)]'
                : 'bg-[#161622] text-zinc-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Roteamento de Vias & Praças</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('layout');
              playBeep(850, 0.02);
            }}
            className={`px-3.5 py-2 min-h-[38px] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'layout'
                ? 'bg-[#FFC72C] text-black shadow-[0_0_12px_rgba(255,199,44,0.3)]'
                : 'bg-[#161622] text-zinc-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Layout do Cupom & Bobina</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('escpos');
              playBeep(850, 0.02);
            }}
            className={`px-3.5 py-2 min-h-[38px] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'escpos'
                ? 'bg-gradient-to-r from-[#DA291C] to-[#FF7A00] text-white shadow-[0_0_12px_rgba(218,41,28,0.4)]'
                : 'bg-[#161622] text-zinc-400 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-[#FFC72C]" />
            <span>Protocolo ESC/POS & Cozinha</span>
          </button>
        </div>

        {/* CONTENT TABS */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {/* TAB 1: PRINTERS LIST & CONFIG */}
          {activeTab === 'printers' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Printers List */}
              <div className="md:col-span-1 space-y-2">
                <div className="text-[11px] font-black uppercase text-zinc-400 mb-1">
                  Dispositivos de Impressão
                </div>
                {printers.map(p => {
                  const isSelected = p.id === currentPrinter.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedPrinterId(p.id);
                        playBeep(850, 0.02);
                      }}
                      className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer relative ${
                        isSelected
                          ? 'bg-[#DA291C]/15 border-[#DA291C] text-white shadow-[0_0_10px_rgba(218,41,28,0.25)]'
                          : 'bg-[#141420] border-[#222234] text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs truncate max-w-[140px]">{p.name}</span>
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#00D26A]" />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-zinc-400">
                        <span className="capitalize">{p.location} • {p.paperWidth}</span>
                        <span className="uppercase text-zinc-500 font-mono">{p.interfaceType}</span>
                      </div>
                    </button>
                  );
                })}

                <button
                  onClick={() => {
                    const newPrn: ThermalPrinterConfig = {
                      id: `prn_${Date.now()}`,
                      name: `Nova Impressora ${printers.length + 1}`,
                      location: 'cozinha',
                      paperWidth: '80mm',
                      interfaceType: 'network_ip',
                      ipAddress: '192.168.1.220:9100',
                      status: 'online',
                      printCopies: 1,
                      autoPrintTriggers: {
                        onNewOrder: true,
                        onBillRequested: false,
                        onPaymentSettled: false,
                        onSangria: false,
                        onKitchenProduction: true,
                      },
                    };
                    setPrinters(prev => [...prev, newPrn]);
                    setSelectedPrinterId(newPrn.id);
                    playBeep(920, 0.03);
                  }}
                  className="w-full py-2.5 rounded-xl border border-dashed border-zinc-700 text-zinc-400 hover:text-white hover:border-[#FFC72C] text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Nova Impressora</span>
                </button>
              </div>

              {/* Printer Details Form */}
              <div className="md:col-span-2 bg-[#141420] border border-[#222234] rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-[#202030] pb-2.5">
                  <div>
                    <h4 className="font-black text-sm text-white">{currentPrinter.name}</h4>
                    <p className="text-[10px] text-zinc-400">Configuração de interface e acionamento</p>
                  </div>

                  <button
                    onClick={() => handleTestPrint(currentPrinter)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimir Teste</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10.5px] font-black uppercase text-zinc-400 mb-1">
                      Nome da Impressora
                    </label>
                    <input
                      type="text"
                      value={currentPrinter.name}
                      onChange={e => handleUpdateCurrentPrinter({ name: e.target.value })}
                      className="w-full bg-[#1A1A28] border border-[#28283C] rounded-xl px-3 py-2 text-xs text-white focus:border-[#FFC72C] focus:outline-none font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-black uppercase text-zinc-400 mb-1">
                      Destino / Praça
                    </label>
                    <select
                      value={currentPrinter.location}
                      onChange={e => handleUpdateCurrentPrinter({ location: e.target.value as any })}
                      className="w-full bg-[#1A1A28] border border-[#28283C] rounded-xl px-3 py-2 text-xs text-white focus:border-[#FFC72C] focus:outline-none font-bold"
                    >
                      <option value="caixa">Caixa / Balcão (Recibos e Extratos)</option>
                      <option value="cozinha">Cozinha / KDS (Praça Quente / Montagem)</option>
                      <option value="bar">Bar / Bebidas (Sucos, Chopp e Drinks)</option>
                      <option value="delivery">Delivery / Expedição (Etiqueta & Motoboy)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-black uppercase text-zinc-400 mb-1">
                      Largura da Bobina
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleUpdateCurrentPrinter({ paperWidth: '80mm' })}
                        className={`py-2 rounded-xl border text-xs font-bold text-center cursor-pointer transition-all ${
                          currentPrinter.paperWidth === '80mm'
                            ? 'bg-[#DA291C]/20 border-[#DA291C] text-white font-black'
                            : 'bg-[#181824] border-[#28283C] text-zinc-400'
                        }`}
                      >
                        80mm (Padrão)
                      </button>

                      <button
                        type="button"
                        onClick={() => handleUpdateCurrentPrinter({ paperWidth: '58mm' })}
                        className={`py-2 rounded-xl border text-xs font-bold text-center cursor-pointer transition-all ${
                          currentPrinter.paperWidth === '58mm'
                            ? 'bg-[#DA291C]/20 border-[#DA291C] text-white font-black'
                            : 'bg-[#181824] border-[#28283C] text-zinc-400'
                        }`}
                      >
                        58mm (POS Compacta)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-black uppercase text-zinc-400 mb-1">
                      Tipo de Conexão
                    </label>
                    <select
                      value={currentPrinter.interfaceType}
                      onChange={e => handleUpdateCurrentPrinter({ interfaceType: e.target.value as any })}
                      className="w-full bg-[#1A1A28] border border-[#28283C] rounded-xl px-3 py-2 text-xs text-white focus:border-[#FFC72C] focus:outline-none font-bold"
                    >
                      <option value="usb">USB Direta (Plug and Play)</option>
                      <option value="network_ip">Rede Ethernet / Wi-Fi (IP Fixo)</option>
                      <option value="bluetooth">Bluetooth (Impressora Portátil)</option>
                      <option value="serial">Serial COM (Balcão Legado)</option>
                    </select>
                  </div>

                  {currentPrinter.interfaceType === 'network_ip' && (
                    <div className="sm:col-span-2">
                      <label className="block text-[10.5px] font-black uppercase text-zinc-400 mb-1">
                        Endereço IP & Porta (ESC/POS Raw)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: 192.168.1.200:9100"
                        value={currentPrinter.ipAddress || ''}
                        onChange={e => handleUpdateCurrentPrinter({ ipAddress: e.target.value })}
                        className="w-full bg-[#1A1A28] border border-[#28283C] rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-[#FFC72C] focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                {/* Automation triggers */}
                <div className="pt-2 border-t border-[#202030] space-y-2">
                  <div className="text-[11px] font-black uppercase text-zinc-400">
                    Disparos Automáticos de Impressão
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-zinc-300">
                    <label className="flex items-center gap-2 p-2 rounded-lg bg-[#181826] border border-[#222232] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={currentPrinter.autoPrintTriggers.onNewOrder}
                        onChange={e => handleUpdateCurrentPrinter({
                          autoPrintTriggers: { ...currentPrinter.autoPrintTriggers, onNewOrder: e.target.checked }
                        })}
                        className="rounded accent-[#DA291C]"
                      />
                      <span>Imprimir ao receber novo pedido</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-lg bg-[#181826] border border-[#222232] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={currentPrinter.autoPrintTriggers.onBillRequested}
                        onChange={e => handleUpdateCurrentPrinter({
                          autoPrintTriggers: { ...currentPrinter.autoPrintTriggers, onBillRequested: e.target.checked }
                        })}
                        className="rounded accent-[#DA291C]"
                      />
                      <span>Imprimir conferência de mesa (pré-conta)</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-lg bg-[#181826] border border-[#222232] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={currentPrinter.autoPrintTriggers.onPaymentSettled}
                        onChange={e => handleUpdateCurrentPrinter({
                          autoPrintTriggers: { ...currentPrinter.autoPrintTriggers, onPaymentSettled: e.target.checked }
                        })}
                        className="rounded accent-[#DA291C]"
                      />
                      <span>Imprimir recibo ao liquidar pagamento</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-lg bg-[#181826] border border-[#222232] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={currentPrinter.autoPrintTriggers.onKitchenProduction}
                        onChange={e => handleUpdateCurrentPrinter({
                          autoPrintTriggers: { ...currentPrinter.autoPrintTriggers, onKitchenProduction: e.target.checked }
                        })}
                        className="rounded accent-[#DA291C]"
                      />
                      <span>Separar via individual para a Cozinha</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ROUTING RULES */}
          {activeTab === 'routing' && (
            <div className="space-y-4 bg-[#141420] border border-[#222234] rounded-2xl p-5">
              <div className="border-b border-[#202030] pb-3">
                <h4 className="text-sm font-black text-white">Roteamento de Itens por Praça de Produção</h4>
                <p className="text-xs text-zinc-400">
                  Defina qual impressora recebe automaticamente cada tipo de produto lançado por atendentes ou clientes online.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#1A1A28] border border-[#28283C] space-y-2">
                  <div className="flex items-center gap-2 text-white font-bold text-xs">
                    <Utensils className="w-4 h-4 text-[#DA291C]" />
                    <span>Praça Quente (Hambúrgueres, Grelhados e Frituras)</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Itens das estações: Chapa, Fritura e Montagem.
                  </p>
                  <div className="text-xs pt-1">
                    <span className="text-zinc-500 font-bold">Impressora Atribuída: </span>
                    <span className="text-[#FFC72C] font-bold">Impressora Cozinha - Praça Quente / KDS (80mm)</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#1A1A28] border border-[#28283C] space-y-2">
                  <div className="flex items-center gap-2 text-white font-bold text-xs">
                    <Beer className="w-4 h-4 text-[#00B8FF]" />
                    <span>Bar & Bebidas (Chopp, Sucos, Refrigerantes e Cafés)</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Itens das estações: Bar e Bebidas.
                  </p>
                  <div className="text-xs pt-1">
                    <span className="text-zinc-500 font-bold">Impressora Atribuída: </span>
                    <span className="text-[#00B8FF] font-bold">Impressora Bar & Bebidas (58mm)</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#1A1A28] border border-[#28283C] space-y-2">
                  <div className="flex items-center gap-2 text-white font-bold text-xs">
                    <Store className="w-4 h-4 text-[#00D26A]" />
                    <span>Salão / Conferência de Contas</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Extrato de consumo para fechamento de mesa ou conferência individual.
                  </p>
                  <div className="text-xs pt-1">
                    <span className="text-zinc-500 font-bold">Impressora Atribuída: </span>
                    <span className="text-[#00D26A] font-bold">Impressora Principal - Caixa & Balcão (80mm)</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#1A1A28] border border-[#28283C] space-y-2">
                  <div className="flex items-center gap-2 text-white font-bold text-xs">
                    <Receipt className="w-4 h-4 text-[#FF7A00]" />
                    <span>Delivery & Expedição</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Cupom com endereço completo, observações e comprovante para o motoboy.
                  </p>
                  <div className="text-xs pt-1">
                    <span className="text-zinc-500 font-bold">Impressora Atribuída: </span>
                    <span className="text-[#FF7A00] font-bold">Impressora Delivery & Expedição (80mm)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LAYOUT & VISUAL PREVIEW */}
          {activeTab === 'layout' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Form Customizer */}
              <div className="space-y-3 bg-[#141420] border border-[#222234] rounded-2xl p-4">
                <h4 className="text-sm font-black text-white border-b border-[#202030] pb-2">
                  Personalização dos Dados Impressos
                </h4>

                <div>
                  <label className="block text-[10.5px] font-black uppercase text-zinc-400 mb-1">
                    Nome / Razão Social do Restaurante
                  </label>
                  <input
                    type="text"
                    value={tenant.name}
                    className="w-full bg-[#1A1A28] border border-[#28283C] rounded-xl px-3 py-2 text-xs text-white font-bold"
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-[10.5px] font-black uppercase text-zinc-400 mb-1">
                    CNPJ / Inscrição Estadual
                  </label>
                  <input
                    type="text"
                    value={tenant.cnpj || '38.492.011/0001-85'}
                    className="w-full bg-[#1A1A28] border border-[#28283C] rounded-xl px-3 py-2 text-xs text-white font-mono"
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-[10.5px] font-black uppercase text-zinc-400 mb-1">
                    Mensagem de Agradecimento (Rodapé)
                  </label>
                  <input
                    type="text"
                    defaultValue="Obrigado pela preferência! Volte sempre."
                    className="w-full bg-[#1A1A28] border border-[#28283C] rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div className="pt-2">
                  <label className="block text-[10.5px] font-black uppercase text-zinc-400 mb-1">
                    Simular Visualização da Bobina:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewWidth('80mm')}
                      className={`py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        previewWidth === '80mm'
                          ? 'bg-[#FFC72C] text-black font-black'
                          : 'bg-[#181824] border-[#28283C] text-zinc-400'
                      }`}
                    >
                      Bobina 80mm
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewWidth('58mm')}
                      className={`py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        previewWidth === '58mm'
                          ? 'bg-[#FFC72C] text-black font-black'
                          : 'bg-[#181824] border-[#28283C] text-zinc-400'
                      }`}
                    >
                      Bobina 58mm
                    </button>
                  </div>
                </div>
              </div>

              {/* Realistic Thermal Receipt Slip */}
              <div className="bg-[#0A0A0E] p-4 rounded-2xl border border-[#222234] flex flex-col items-center">
                <div className="text-[10px] text-zinc-500 uppercase font-mono mb-2">
                  Pré-visualização Térmica ({previewWidth})
                </div>

                <div 
                  className={`bg-white text-black font-mono text-[11px] p-4 shadow-xl transition-all leading-tight ${
                    previewWidth === '80mm' ? 'w-72' : 'w-56'
                  }`}
                  style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
                >
                  <div className="text-center border-b border-dashed border-neutral-400 pb-2 space-y-0.5">
                    <div className="font-black text-xs uppercase">{tenant.name}</div>
                    <div className="text-[9.5px]">CNPJ: {tenant.cnpj || '38.492.011/0001-85'}</div>
                    <div className="text-[9px]">SÃO PAULO - SP • (11) 98765-4321</div>
                    <div className="text-[8.5px] font-bold mt-1">*** EXTRATO NÃO FISCAL ***</div>
                  </div>

                  <div className="py-2 border-b border-dashed border-neutral-400 space-y-0.5 text-[10px]">
                    <div className="flex justify-between font-bold">
                      <span>PEDIDO: #104</span>
                      <span>MESA #04</span>
                    </div>
                    <div>ATENDENTE: MARCELO SALÃO</div>
                    <div>DATA: {formatDateTime(new Date().toISOString())}</div>
                  </div>

                  <div className="py-2 border-b border-dashed border-neutral-400 space-y-1">
                    <div className="font-bold flex justify-between text-[10px]">
                      <span>QTD ITEM</span>
                      <span>TOTAL</span>
                    </div>
                    <div className="flex justify-between">
                      <span>2x Smash Bacon Duplo</span>
                      <span>R$ 64,00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>2x Coca-Cola Zero 350ml</span>
                      <span>R$ 16,00</span>
                    </div>
                  </div>

                  <div className="py-2 border-b border-dashed border-neutral-400 space-y-0.5 text-[10px]">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>R$ 80,00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Serviço (10%):</span>
                      <span>R$ 8,00</span>
                    </div>
                    <div className="flex justify-between font-black text-xs pt-1 border-t border-dashed border-neutral-300">
                      <span>TOTAL:</span>
                      <span>R$ 88,00</span>
                    </div>
                    <div className="text-[9px] text-neutral-600">PAGAMENTO: CARTÃO CRÉDITO (TEF)</div>
                  </div>

                  <div className="pt-2 text-center text-[9px] text-neutral-600 space-y-0.5">
                    <div>Obrigado pela preferência! Volte sempre.</div>
                    <div className="text-[8px] text-neutral-400">- - - - - corte aqui - - - - -</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ESC/POS CONSOLE & KITCHEN HARDWARE TESTING */}
          {activeTab === 'escpos' && (
            <div className="space-y-4">
              {/* Hardware Diagnostic Banner */}
              <div className="p-4 rounded-2xl bg-[#141420] border border-[#222234] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#00E676]/15 text-[#00E676] border border-[#00E676]/30 flex items-center gap-1">
                      <Zap className="w-3 h-3 fill-current" />
                      Spooler ESC/POS Ativo
                    </span>
                    <span className="text-xs text-zinc-500">•</span>
                    <span className="text-xs font-mono text-zinc-400">Porta RAW 9100 / WebUSB / WebSerial</span>
                  </div>
                  <h4 className="text-sm font-black text-white mt-1">
                    Comunicação Binária Direta com Impressoras Térmicas de Cozinha
                  </h4>
                  <p className="text-xs text-zinc-400">
                    O sistema gera comandos em binário puro (ESC/POS padrão Epson/Bematech/Elgin) acionando alarme sonoro (buzzer) e corte automático de bobina.
                  </p>
                </div>

                {/* Target Printer Selector */}
                <div className="w-full md:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <select
                    value={selectedEscPosPrinterId}
                    onChange={(e) => setSelectedEscPosPrinterId(e.target.value)}
                    className="bg-[#1A1A28] border border-[#2E2E42] text-white text-xs font-bold rounded-xl px-3 py-2 cursor-pointer focus:border-[#FFC72C] outline-none"
                  >
                    {printers.map((prn) => (
                      <option key={prn.id} value={prn.id}>
                        {prn.name} ({prn.location.toUpperCase()})
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={async () => {
                      playKitchenBell();
                      const target = printers.find((p) => p.id === selectedEscPosPrinterId) || printers[1];
                      const res = await thermalPrinterService.testKitchenPrinter(target);
                      setEscposConsoleOutput({
                        success: res.success,
                        message: res.message,
                        bytesCount: res.bytesCount,
                        hexPreview: res.hexPreview || '',
                        printerName: res.targetPrinter,
                        timestamp: new Date().toLocaleTimeString('pt-BR'),
                      });
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-[#DA291C] to-[#FF7A00] hover:brightness-110 text-white font-black text-xs rounded-xl transition-all shadow-[0_0_15px_rgba(218,41,28,0.4)] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <BellRing className="w-4 h-4 text-[#FFC72C]" />
                    <span>Disparar Teste Cozinha</span>
                  </button>
                </div>
              </div>

              {/* Console & Hex Monitor */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Protocol Commands Explanation */}
                <div className="p-4 rounded-2xl bg-[#141420] border border-[#222234] space-y-3">
                  <h5 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Terminal className="w-4 h-4 text-[#FFC72C]" />
                    Tabela de Instruções ESC/POS Injetadas
                  </h5>

                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-[#1A1A28] border border-[#262638] flex items-start justify-between gap-2">
                      <div>
                        <div className="font-mono font-bold text-[#FFC72C]">ESC @ (0x1B 0x40)</div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">
                          Reinicializa o buffer de memória da impressora e reseta alinhamento.
                        </div>
                      </div>
                      <span className="text-[10px] font-mono bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded">INIT</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#1A1A28] border border-[#262638] flex items-start justify-between gap-2">
                      <div>
                        <div className="font-mono font-bold text-[#FF7A00]">GS ! 0x11 (0x1D 0x21 0x11)</div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">
                          Ativa fonte com Largura Dupla e Altura Dupla para leitura rápida na chapa da cozinha.
                        </div>
                      </div>
                      <span className="text-[10px] font-mono bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded">DOUBLE</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#1A1A28] border border-[#262638] flex items-start justify-between gap-2">
                      <div>
                        <div className="font-mono font-bold text-[#00E676]">GS B 0x01 (0x1D 0x42 0x01)</div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">
                          Modo Invertido (letras brancas em tarja preta), destacando observações como "SEM CEBOLA".
                        </div>
                      </div>
                      <span className="text-[10px] font-mono bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded">INVERT</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#1A1A28] border border-[#262638] flex items-start justify-between gap-2">
                      <div>
                        <div className="font-mono font-bold text-[#DA291C]">ESC B 0x03 0x03 (0x1B 0x42 0x03 0x03)</div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">
                          Aciona campainha / buzzer sonoro embutido para alertar os cozinheiros.
                        </div>
                      </div>
                      <span className="text-[10px] font-mono bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded">BUZZER</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#1A1A28] border border-[#262638] flex items-start justify-between gap-2">
                      <div>
                        <div className="font-mono font-bold text-[#00D2FF]">GS V 0x42 0x03 (0x1D 0x56 0x42 0x03)</div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">
                          Avança 3 linhas e aciona a guilhotina com corte parcial da comanda.
                        </div>
                      </div>
                      <span className="text-[10px] font-mono bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded">CUT</span>
                    </div>
                  </div>
                </div>

                {/* Live Hex Dump & Diagnostics Output */}
                <div className="p-4 rounded-2xl bg-[#141420] border border-[#222234] space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-[#202030]">
                      <h5 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Cpu className="w-4 h-4 text-[#00E676]" />
                        Monitor de Bytes ESC/POS (Hex Dump)
                      </h5>
                      {escposConsoleOutput && (
                        <span className="text-[10px] font-mono text-zinc-400">
                          {escposConsoleOutput.timestamp} • {escposConsoleOutput.bytesCount} bytes
                        </span>
                      )}
                    </div>

                    <div className="mt-3">
                      {escposConsoleOutput ? (
                        <div className="space-y-2">
                          <div className="p-3 rounded-xl bg-[#0C0C12] border border-[#262638] text-[11px] font-mono text-emerald-400 break-all select-all max-h-48 overflow-y-auto leading-relaxed">
                            {escposConsoleOutput.hexPreview}
                          </div>
                          <div className="flex items-center justify-between text-xs text-zinc-300">
                            <span className="font-bold text-white">Status:</span>
                            <span className="text-[#00E676] font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Transmitido para {escposConsoleOutput.printerName}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="py-12 text-center text-zinc-500 text-xs space-y-2">
                          <Terminal className="w-8 h-8 mx-auto opacity-30" />
                          <p>Clique em "Disparar Teste Cozinha" para gerar o pacote binário ESC/POS.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Hardware compatibility note */}
                  <div className="p-3 rounded-xl bg-[#161624] border border-[#252538] text-[11px] text-zinc-400">
                    <div className="font-bold text-white flex items-center gap-1.5 mb-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#FFC72C]" />
                      Compatibilidade Homologada
                    </div>
                    <span>Epson TM-T20X / T88, Bematech MP-4200 TH, Elgin i7/i9, Daruma DR800, Star Micronics e POS Android.</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="pt-4 border-t border-[#1E1E2C] mt-2 flex items-center justify-between">
          <span className="text-xs text-zinc-500 font-mono">
            {printers.length} impressoras ativas no sistema
          </span>

          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-[#FFC72C] hover:bg-[#FFD24D] text-black font-black text-xs transition-all cursor-pointer shadow-[0_0_15px_rgba(255,199,44,0.3)]"
          >
            Salvar & Fechar
          </button>
        </div>
      </motion.div>
    </div>
  );
};
