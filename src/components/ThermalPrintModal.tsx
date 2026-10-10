import React, { useState } from 'react';
import { 
  Printer, 
  X, 
  CheckCircle2, 
  Flame, 
  QrCode, 
  Scissors, 
  FileText,
  Settings,
  Bluetooth,
  Server,
  RefreshCw,
  Bell,
  AlertCircle,
  Copy,
  Check,
  Smartphone,
  ChevronDown
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatBRL, formatDateTime } from '../utils/formatters';
import { playBeep, playCashRegister, playKitchenBell, playSoftClickSound } from '../utils/audio';
import { ThermalPrinterSettingsModal } from './ThermalPrinterSettingsModal';
import { 
  thermalPrinterService, 
  buildKitchenOrderEscPos, 
  EscPosBuilder 
} from '../services/escposService';

type PrintMethod = 'spooler' | 'bluetooth' | 'browser';

export const ThermalPrintModal: React.FC = () => {
  const { printOrder, setPrintOrder, tenant, currentBranch } = useApp();
  const [printType, setPrintType] = useState<'customer' | 'kitchen'>('kitchen');
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>(tenant.settings.thermalPaperWidth || '80mm');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  
  // Method selection & execution states
  const [printMethod, setPrintMethod] = useState<PrintMethod>('spooler');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string; details?: string } | null>(null);

  if (!printOrder) return null;

  const isBluetoothAvailable = thermalPrinterService.isBluetoothSupported();

  // Helper para construir o buffer binário ESC/POS do pedido atual
  const generateEscPosBytes = (): Uint8Array => {
    if (printType === 'kitchen') {
      const builder = buildKitchenOrderEscPos(printOrder, { paperWidth }, {
        isReprint: false,
        notesHeader: 'PEDIDO PRODUCAO - COZINHA'
      });
      return builder.build();
    } else {
      // Cupom do Cliente / Recibo de Conferência
      const builder = new EscPosBuilder(paperWidth);
      builder.align('center');
      builder.bold(true);
      builder.line(tenant.name.toUpperCase());
      builder.bold(false);
      builder.line(`CNPJ: ${tenant.cnpj || '38.492.011/0001-85'}`);
      builder.line('São Paulo - SP • (11) 98765-4321');
      builder.line('EXTRATO DE CONFERENCIA');
      builder.separator('=');

      builder.align('left');
      builder.bold(true);
      builder.twoColumns('PEDIDO:', printOrder.displayCode);
      if (printOrder.tableNumber) {
        builder.twoColumns('MESA:', `#${printOrder.tableNumber}`);
      }
      builder.twoColumns('CANAL:', printOrder.channel.replace('_', ' ').toUpperCase());
      builder.twoColumns('CLIENTE:', printOrder.customerName || 'Cliente Balcao');
      builder.twoColumns('DATA/HORA:', new Date().toLocaleTimeString('pt-BR'));
      builder.separator('-');

      builder.twoColumns('QTD ITEM', 'VALOR');
      builder.separator('-');
      printOrder.items.forEach(it => {
        builder.bold(true);
        builder.twoColumns(`${it.quantity}x ${it.productName || it.name}`, formatBRL(it.totalPrice));
        builder.bold(false);
        if (it.notes) {
          builder.line(`  * OBS: ${it.notes}`);
        }
      });
      builder.separator('-');

      builder.twoColumns('Subtotal:', formatBRL(printOrder.subtotal));
      if (printOrder.discount > 0) {
        builder.twoColumns('Desconto:', `-${formatBRL(printOrder.discount)}`);
      }
      if (printOrder.serviceFee > 0) {
        builder.twoColumns('Taxa Servico:', formatBRL(printOrder.serviceFee));
      }
      builder.bold(true);
      builder.size('double');
      builder.twoColumns('TOTAL:', formatBRL(printOrder.total));
      builder.size('normal');
      builder.bold(false);
      builder.twoColumns('Pagamento:', `${printOrder.paymentMethod.toUpperCase()} (${printOrder.paymentStatus.toUpperCase()})`);

      builder.separator('=');
      builder.align('center');
      builder.line('Obrigado pela preferencia! Volte sempre.');
      builder.feed(2);
      builder.cut(true);
      return builder.build();
    }
  };

  // 1. Impressão via Spooler Local / Rede TCP IP
  const handlePrintViaSpooler = async () => {
    setIsProcessing(true);
    setStatusMessage(null);
    playSoftClickSound();

    try {
      const bytes = generateEscPosBytes();
      const result = await thermalPrinterService.printRawSpooler(
        bytes,
        { paperWidth, location: printType === 'kitchen' ? 'cozinha' : 'caixa' },
        `Pedido ${printOrder.displayCode} - ${printType === 'kitchen' ? 'Cozinha' : 'Cliente'}`
      );

      playKitchenBell();
      setStatusMessage({
        type: 'success',
        text: `Comanda ${printOrder.displayCode} despachada com sucesso para a impressora!`,
        details: `${bytes.length} bytes ESC/POS processados pelo Spooler • ID: ${result.jobId}`
      });
    } catch (err: any) {
      playBeep(400, 0.1);
      setStatusMessage({
        type: 'error',
        text: 'Falha ao despachar comanda via Spooler:',
        details: err?.message || 'Serviço de spooler offline.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Impressão via Web Bluetooth API (BLE)
  const handlePrintViaBluetooth = async () => {
    if (!isBluetoothAvailable) {
      setStatusMessage({
        type: 'error',
        text: 'Navegador sem suporte a Web Bluetooth:',
        details: 'A Web Bluetooth API requer Google Chrome, Edge ou Opera em HTTPS ou localhost.'
      });
      return;
    }

    setIsProcessing(true);
    setStatusMessage({
      type: 'info',
      text: 'Aguardando seleção da impressora Bluetooth...',
      details: 'Selecione sua impressora térmica portátil na janela do navegador.'
    });
    playSoftClickSound();

    try {
      const bytes = generateEscPosBytes();
      const res = await thermalPrinterService.printRawBluetooth(bytes);

      playKitchenBell();
      setStatusMessage({
        type: 'success',
        text: `Comanda impressa com sucesso via Web Bluetooth!`,
        details: `${res.message} • ${bytes.length} bytes transmitidos.`
      });
    } catch (err: any) {
      playBeep(400, 0.1);
      setStatusMessage({
        type: 'error',
        text: 'Erro na comunicação Bluetooth:',
        details: err?.message || 'Falha ao conectar com o dispositivo.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. Fallback: Janela de impressão tradicional do navegador
  const handleBrowserPrint = () => {
    playBeep(920, 0.08);
    window.print();
  };

  // Disparador mestre conforme método ativo
  const handlePrimaryPrintAction = () => {
    if (printMethod === 'spooler') {
      handlePrintViaSpooler();
    } else if (printMethod === 'bluetooth') {
      handlePrintViaBluetooth();
    } else {
      handleBrowserPrint();
    }
  };

  const currentBytesCount = generateEscPosBytes().length;

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #thermal-print-receipt, #thermal-print-receipt * {
            visibility: visible !important;
          }
          #thermal-print-receipt {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: ${paperWidth === '80mm' ? '76mm' : '54mm'} !important;
            margin: 0 !important;
            padding: 2mm !important;
            color: black !important;
            background: white !important;
            font-family: monospace !important;
            font-size: 11px !important;
            line-height: 1.2 !important;
          }
        }
      `}</style>

      <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 select-none">
        <div className="bg-[#121218] border border-[#282838] rounded-3xl p-5 sm:p-6 max-w-xl w-full shadow-2xl relative flex flex-col max-h-[92vh]">
          
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-[#20202E] pb-3 mb-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#FFC72C]/20 to-[#FF7A00]/20 text-[#FFC72C] flex items-center justify-center border border-[#FFC72C]/30 shadow-md">
                <Printer className="w-5 h-5 text-[#FFC72C]" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <span>Impressão Térmica ESC/POS Direta</span>
                  <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-[#181824] border border-[#2A2A3E] text-[#14B8A6]">
                    {currentBytesCount} bytes
                  </span>
                </h3>
                <div className="text-[11px] text-[#A1A1AA]">
                  Pedido <strong className="text-white">{printOrder.displayCode}</strong> • {printOrder.customerName} • {paperWidth}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="px-2.5 py-1.5 rounded-xl bg-[#181824] hover:bg-[#222234] text-zinc-300 hover:text-white border border-[#28283C] text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Configurações de Impressoras Térmicas"
              >
                <Settings className="w-3.5 h-3.5 text-[#FFC72C]" />
                <span className="hidden sm:inline text-[11px] font-bold">Impressoras</span>
              </button>

              <button
                onClick={() => setPrintOrder(null)}
                className="text-[#71717A] hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Feedback & Status Alert Banner */}
          {statusMessage && (
            <div className={`p-3 rounded-2xl mb-3 text-xs flex items-start gap-2.5 shrink-0 ${
              statusMessage.type === 'success' 
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300' 
                : statusMessage.type === 'error'
                ? 'bg-red-500/15 border border-red-500/30 text-red-300'
                : 'bg-blue-500/15 border border-blue-500/30 text-blue-300'
            }`}>
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : statusMessage.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              ) : (
                <RefreshCw className="w-4 h-4 text-blue-400 animate-spin shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5 flex-1">
                <div className="font-bold">{statusMessage.text}</div>
                {statusMessage.details && (
                  <div className="text-[11px] opacity-90 font-mono">{statusMessage.details}</div>
                )}
              </div>
              <button 
                onClick={() => setStatusMessage(null)}
                className="opacity-70 hover:opacity-100 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Top Controls: Print Target & Paper Width */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3 shrink-0">
            <div className="flex bg-[#181822] p-1 rounded-xl border border-[#262638] text-xs">
              <button
                onClick={() => { setPrintType('kitchen'); playSoftClickSound(); }}
                className={`px-3 py-1 font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  printType === 'kitchen' ? 'bg-[#FF7A00] text-white shadow-sm' : 'text-[#A1A1AA] hover:text-white'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Via Cozinha (KDS)</span>
              </button>

              <button
                onClick={() => { setPrintType('customer'); playSoftClickSound(); }}
                className={`px-3 py-1 font-bold rounded-lg transition-all cursor-pointer ${
                  printType === 'customer' ? 'bg-[#E31837] text-white shadow-sm' : 'text-[#A1A1AA] hover:text-white'
                }`}
              >
                Via Cliente (Extrato)
              </button>
            </div>

            <div className="flex bg-[#181822] p-1 rounded-xl border border-[#262638] text-xs">
              <button
                onClick={() => { setPaperWidth('80mm'); playSoftClickSound(); }}
                className={`px-2.5 py-1 font-bold rounded-lg cursor-pointer transition-all ${
                  paperWidth === '80mm' ? 'bg-[#2E2E40] text-white' : 'text-[#71717A] hover:text-white'
                }`}
              >
                80 mm (48 col)
              </button>
              <button
                onClick={() => { setPaperWidth('58mm'); playSoftClickSound(); }}
                className={`px-2.5 py-1 font-bold rounded-lg cursor-pointer transition-all ${
                  paperWidth === '58mm' ? 'bg-[#2E2E40] text-white' : 'text-[#71717A] hover:text-white'
                }`}
              >
                58 mm (32 col)
              </button>
            </div>
          </div>

          {/* Integration Protocol Switcher (Spooler vs Web Bluetooth vs Browser) */}
          <div className="p-3 rounded-2xl bg-[#161624] border border-[#242436] mb-3 space-y-2 shrink-0">
            <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">
              Método de Comunicação com a Impressora:
            </span>

            <div className="grid grid-cols-3 gap-2 text-xs">
              {/* Opção 1: Spooler Local */}
              <button
                type="button"
                onClick={() => { setPrintMethod('spooler'); playSoftClickSound(); }}
                className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  printMethod === 'spooler'
                    ? 'bg-[#14B8A6]/15 border-[#14B8A6] text-white shadow-sm'
                    : 'bg-[#12121A] hover:bg-[#1A1A28] border-[#262638] text-zinc-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Server className={`w-4 h-4 ${printMethod === 'spooler' ? 'text-[#14B8A6]' : 'text-zinc-500'}`} />
                  <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-[#14B8A6]/20 text-[#14B8A6]">
                    TCP/IP
                  </span>
                </div>
                <div className="font-bold text-white text-[11px]">Spooler de Rede</div>
                <div className="text-[9px] text-zinc-400">Porta 9100 / Servidor</div>
              </button>

              {/* Opção 2: Web Bluetooth API */}
              <button
                type="button"
                onClick={() => { setPrintMethod('bluetooth'); playSoftClickSound(); }}
                className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  printMethod === 'bluetooth'
                    ? 'bg-blue-500/15 border-blue-500 text-white shadow-sm'
                    : 'bg-[#12121A] hover:bg-[#1A1A28] border-[#262638] text-zinc-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Bluetooth className={`w-4 h-4 ${printMethod === 'bluetooth' ? 'text-blue-400' : 'text-zinc-500'}`} />
                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                    isBluetoothAvailable ? 'bg-blue-500/20 text-blue-300' : 'bg-zinc-800 text-zinc-500'
                  }`}>
                    {isBluetoothAvailable ? 'BLE Ativo' : 'Indisponível'}
                  </span>
                </div>
                <div className="font-bold text-white text-[11px]">Web Bluetooth</div>
                <div className="text-[9px] text-zinc-400">Pareamento sem fio</div>
              </button>

              {/* Opção 3: Diálogo do Navegador */}
              <button
                type="button"
                onClick={() => { setPrintMethod('browser'); playSoftClickSound(); }}
                className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  printMethod === 'browser'
                    ? 'bg-purple-500/15 border-purple-500 text-white shadow-sm'
                    : 'bg-[#12121A] hover:bg-[#1A1A28] border-[#262638] text-zinc-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <FileText className={`w-4 h-4 ${printMethod === 'browser' ? 'text-purple-400' : 'text-zinc-500'}`} />
                  <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-purple-500/20 text-purple-300">
                    PDF/A4
                  </span>
                </div>
                <div className="font-bold text-white text-[11px]">Navegador</div>
                <div className="text-[9px] text-zinc-400">Diálogo de sistema</div>
              </button>
            </div>
          </div>

          {/* Visual Simulated Thermal Paper Cupom */}
          <div 
            id="thermal-print-receipt"
            className={`flex-1 overflow-y-auto bg-white text-black font-mono text-[11px] p-4 rounded-xl border border-neutral-300 shadow-inner mx-auto w-full leading-tight select-text ${
              paperWidth === '80mm' ? 'max-w-sm' : 'max-w-[270px]'
            }`}
          >
            {/* Header */}
            <div className="text-center pb-2 border-b border-dashed border-neutral-400">
              <div className="font-black text-sm uppercase tracking-wider">{tenant.name}</div>
              <div>CNPJ: {tenant.cnpj || '38.492.011/0001-85'}</div>
              <div>São Paulo - SP • (11) 98765-4321</div>
              <div className="mt-1 text-[10px] font-bold">
                {printType === 'customer' ? 'EXTRATO NÃO FISCAL / RECIBO' : '*** VIA DA COZINHA / EXPEDIÇÃO ***'}
              </div>
            </div>

            {/* Order Details */}
            <div className="py-2 border-b border-dashed border-neutral-400 space-y-0.5">
              <div className="flex justify-between font-black text-xs">
                <span>PEDIDO: {printOrder.displayCode}</span>
                <span>{printOrder.channel.replace('_', ' ').toUpperCase()}</span>
              </div>
              {printOrder.tableNumber && (
                <div className="font-bold text-xs bg-black text-white px-1 text-center my-1">
                  MESA: #{printOrder.tableNumber}
                </div>
              )}
              <div>CLIENTE: {printOrder.customerName}</div>
              <div>DATA: {formatDateTime(printOrder.createdAt)}</div>
            </div>

            {/* Items */}
            <div className="py-2 border-b border-dashed border-neutral-400 space-y-1.5">
              <div className="font-black flex justify-between">
                <span>QTD ITEM</span>
                {printType === 'customer' && <span>TOTAL</span>}
              </div>

              {printOrder.items.map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between">
                    <span className="font-bold">{item.quantity}x {item.productName || (item as any).name}</span>
                    {printType === 'customer' && <span>{formatBRL(item.totalPrice)}</span>}
                  </div>
                  {item.notes && (
                    <div className="text-[10px] pl-3 italic text-neutral-700">
                      * OBS: {item.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Totals (Only in customer copy) */}
            {printType === 'customer' && (
              <div className="py-2 border-b border-dashed border-neutral-400 space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatBRL(printOrder.subtotal)}</span>
                </div>
                {printOrder.discount > 0 && (
                  <div className="flex justify-between">
                    <span>Desconto:</span>
                    <span>-{formatBRL(printOrder.discount)}</span>
                  </div>
                )}
                {printOrder.serviceFee > 0 && (
                  <div className="flex justify-between">
                    <span>Taxa Serviço:</span>
                    <span>{formatBRL(printOrder.serviceFee)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-sm pt-1 border-t border-dashed border-neutral-400">
                  <span>TOTAL:</span>
                  <span>{formatBRL(printOrder.total)}</span>
                </div>
                <div className="flex justify-between text-[10px] text-neutral-600">
                  <span>Pagamento:</span>
                  <span>{printOrder.paymentMethod.toUpperCase()} ({printOrder.paymentStatus.toUpperCase()})</span>
                </div>
              </div>
            )}

            {/* Footer with Cut Command & Sound indicator */}
            <div className="pt-3 text-center space-y-1 text-[10px] text-neutral-600">
              <div>Obrigado pela preferência! Volte sempre.</div>
              <div className="font-bold">Protocolo ESC/POS • Campainha & Guilhotina</div>
              <div className="text-[9px] pt-1 text-neutral-400">- - - - - corte automático - - - - -</div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="mt-3 pt-3 border-t border-[#20202E] flex items-center justify-between gap-3 shrink-0">
            <button
              onClick={() => setPrintOrder(null)}
              className="px-4 py-2.5 bg-[#181822] hover:bg-[#20202E] text-[#A1A1AA] hover:text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
            >
              Fechar
            </button>

            <button
              onClick={handlePrimaryPrintAction}
              disabled={isProcessing}
              className={`flex-1 py-3 text-black font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                printMethod === 'bluetooth'
                  ? 'bg-gradient-to-r from-blue-400 to-blue-500 hover:brightness-110 shadow-[0_0_15px_rgba(59,130,246,0.35)] text-white'
                  : printMethod === 'spooler'
                  ? 'bg-gradient-to-r from-[#14B8A6] to-[#00D26A] hover:brightness-110 shadow-[0_0_15px_rgba(20,184,166,0.35)]'
                  : 'bg-[#00D26A] hover:bg-[#00E575] shadow-[0_0_15px_rgba(0,210,106,0.3)]'
              }`}
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>PROCESSANDO COMANDA ESC/POS...</span>
                </>
              ) : printMethod === 'bluetooth' ? (
                <>
                  <Bluetooth className="w-4 h-4" />
                  <span>IMPRIMIR VIA BLUETOOTH ({paperWidth})</span>
                </>
              ) : printMethod === 'spooler' ? (
                <>
                  <Printer className="w-4 h-4" />
                  <span>DESPACHAR PARA SPOOLER TÉRMICO ({paperWidth})</span>
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4" />
                  <span>IMPRIMIR VIA NAVEGADOR ({paperWidth})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Embedded Thermal Printer Configuration Modal */}
      <ThermalPrinterSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
};
