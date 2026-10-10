import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  Wifi, 
  Usb, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Trash2, 
  Edit3, 
  Play, 
  FileText, 
  Utensils, 
  Receipt, 
  Settings2, 
  Layers,
  ArrowRight,
  ShieldCheck,
  Check,
  X,
  HardDrive
} from 'lucide-react';
import { ThermalPrinterConfig } from '../types';
import { thermalPrinterService } from '../services/escposService';
import { useApp } from '../context/AppContext';

export const GerenciamentoImpressoras: React.FC = () => {
  const { showNotification } = useApp();
  const [printers, setPrinters] = useState<ThermalPrinterConfig[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'kitchen' | 'receipt'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<ThermalPrinterConfig | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<ThermalPrinterConfig>>({
    name: '',
    location: 'cozinha',
    interfaceType: 'network_ip',
    ipAddress: '192.168.1.100',
    usbPort: 'COM3',
    paperWidth: '80mm',
    status: 'online',
    copies: 1,
    cutPaper: true,
    openCashDrawer: false,
    printKitchenOrder: true,
    printCustomerReceipt: false,
    headerText: 'NEON FOOD OS - SISTEMA GASTRONÔMICO',
    footerText: 'Obrigado pela preferência! Volte sempre.'
  });

  const loadPrinters = () => {
    const list = thermalPrinterService.getPrinters();
    setPrinters(list);
  };

  useEffect(() => {
    loadPrinters();
  }, []);

  const handleOpenAdd = () => {
    setEditingPrinter(null);
    setFormData({
      name: '',
      location: 'cozinha',
      interfaceType: 'network_ip',
      ipAddress: '192.168.1.' + Math.floor(Math.random() * 80 + 20),
      usbPort: 'COM3',
      paperWidth: '80mm',
      status: 'online',
      copies: 1,
      cutPaper: true,
      openCashDrawer: false,
      printKitchenOrder: true,
      printCustomerReceipt: false,
      headerText: 'NEON FOOD OS - SISTEMA GASTRONÔMICO',
      footerText: 'Obrigado pela preferência! Volte sempre.'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: ThermalPrinterConfig) => {
    setEditingPrinter(p);
    setFormData({ ...p });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja remover esta impressora do sistema?')) {
      const updated = printers.filter(p => p.id !== id);
      thermalPrinterService.savePrinters(updated);
      setPrinters(updated);
      showNotification('Impressora removida com sucesso.', 'info');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      showNotification('Por favor, informe um nome identificador para a impressora.', 'warning');
      return;
    }

    if (formData.interfaceType === 'network_ip' && !formData.ipAddress?.trim()) {
      showNotification('Informe o endereço IP da impressora de rede.', 'warning');
      return;
    }

    let updated: ThermalPrinterConfig[];
    if (editingPrinter) {
      updated = printers.map(p => p.id === editingPrinter.id ? { ...p, ...formData } as ThermalPrinterConfig : p);
      showNotification(`Impressora "${formData.name}" atualizada com sucesso!`, 'success');
    } else {
      const newPrinter: ThermalPrinterConfig = {
        ...formData,
        id: `prn_${Date.now()}`,
        status: 'online',
      } as ThermalPrinterConfig;
      updated = [...printers, newPrinter];
      showNotification(`Nova impressora "${formData.name}" cadastrada!`, 'success');
    }

    thermalPrinterService.savePrinters(updated);
    setPrinters(updated);
    setIsModalOpen(false);
  };

  const handleTestPrint = async (printer: ThermalPrinterConfig) => {
    setTestingId(printer.id);
    try {
      const res = await thermalPrinterService.testPrinter(printer);
      if (res.success) {
        showNotification(`Teste de impressão enviado com sucesso para ${printer.name}!`, 'success');
      } else {
        showNotification(`Aviso: ${res.message || 'Falha ao conectar com o hardware.'}`, 'warning');
      }
    } catch (err: any) {
      showNotification(`Erro de comunicação com a impressora: ${err.message}`, 'error');
    } finally {
      setTestingId(null);
    }
  };

  const toggleKitchenTrigger = (printer: ThermalPrinterConfig) => {
    const updated = printers.map(p => 
      p.id === printer.id ? { ...p, printKitchenOrder: !p.printKitchenOrder } : p
    );
    thermalPrinterService.savePrinters(updated);
    setPrinters(updated);
    showNotification(`Roteamento de cozinha ${!printer.printKitchenOrder ? 'ATIVADO' : 'DESATIVADO'} para ${printer.name}.`, 'info');
  };

  const toggleReceiptTrigger = (printer: ThermalPrinterConfig) => {
    const updated = printers.map(p => 
      p.id === printer.id ? { ...p, printCustomerReceipt: !p.printCustomerReceipt } : p
    );
    thermalPrinterService.savePrinters(updated);
    setPrinters(updated);
    showNotification(`Comprovante ao cliente ${!printer.printCustomerReceipt ? 'ATIVADO' : 'DESATIVADO'} para ${printer.name}.`, 'info');
  };

  const filteredPrinters = printers.filter(p => {
    if (filterType === 'kitchen') return p.printKitchenOrder;
    if (filterType === 'receipt') return p.printCustomerReceipt;
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-850 to-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-xs font-semibold uppercase tracking-wider">
              <Printer className="w-3.5 h-3.5" /> Hardware & Roteamento ESC/POS
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Gerenciamento de Impressoras Térmicas
            </h1>
            <p className="text-gray-400 text-sm max-w-2xl leading-relaxed">
              Cadastre impressoras térmicas via <span className="text-primary-300 font-medium">Rede Ethernet/Wi-Fi (IP)</span> ou <span className="text-primary-300 font-medium">Cabo USB</span>. Configure o roteamento automático para imprimir comandas de cozinha e comprovantes fiscais/pedidos instantaneamente ao finalizar vendas no PDV.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={loadPrinters}
              className="p-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl border border-gray-700 transition-all flex items-center gap-2 text-sm"
              title="Recarregar status"
            >
              <RefreshCw className="w-4 h-4" /> Atualizar
            </button>
            <button
              onClick={handleOpenAdd}
              className="px-5 py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-bold rounded-xl shadow-lg shadow-primary-500/25 flex items-center gap-2 text-sm transition-all transform hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4" /> Nova Impressora
            </button>
          </div>
        </div>

        {/* Status bar badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-800/80">
          <div className="bg-gray-800/40 rounded-xl p-3 border border-gray-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-gray-400 uppercase font-semibold">Total Ativas</div>
              <div className="text-xl font-bold text-white">{printers.filter(p => p.status === 'online').length} de {printers.length}</div>
            </div>
          </div>

          <div className="bg-gray-800/40 rounded-xl p-3 border border-gray-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-gray-400 uppercase font-semibold">Comanda Cozinha</div>
              <div className="text-xl font-bold text-white">{printers.filter(p => p.printKitchenOrder).length}</div>
            </div>
          </div>

          <div className="bg-gray-800/40 rounded-xl p-3 border border-gray-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-gray-400 uppercase font-semibold">Comprovante Venda</div>
              <div className="text-xl font-bold text-white">{printers.filter(p => p.printCustomerReceipt).length}</div>
            </div>
          </div>

          <div className="bg-gray-800/40 rounded-xl p-3 border border-gray-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Wifi className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-gray-400 uppercase font-semibold">Rede IP vs USB</div>
              <div className="text-xl font-bold text-white">
                {printers.filter(p => p.interfaceType === 'network_ip').length} <span className="text-xs text-gray-400 font-normal">IP</span> / {printers.filter(p => p.interfaceType === 'usb').length} <span className="text-xs text-gray-400 font-normal">USB</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              filterType === 'all'
                ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
            }`}
          >
            Todas as Impressoras ({printers.length})
          </button>
          <button
            onClick={() => setFilterType('kitchen')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
              filterType === 'kitchen'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
            }`}
          >
            <Utensils className="w-4 h-4" /> Auto Cozinha ({printers.filter(p => p.printKitchenOrder).length})
          </button>
          <button
            onClick={() => setFilterType('receipt')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
              filterType === 'receipt'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
            }`}
          >
            <Receipt className="w-4 h-4" /> Auto Comprovante ({printers.filter(p => p.printCustomerReceipt).length})
          </button>
        </div>
      </div>

      {/* Grid of Printers */}
      {filteredPrinters.length === 0 ? (
        <div className="bg-gray-900 border border-dashed border-gray-800 rounded-2xl p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto text-gray-500">
            <Printer className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white">Nenhuma impressora encontrada</h3>
          <p className="text-gray-400 text-sm max-w-md mx-auto">
            Cadastre uma impressora térmica para emitir comandas de produção na cozinha e recibos automáticos ao fechar vendas no caixa.
          </p>
          <button
            onClick={handleOpenAdd}
            className="px-5 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-sm font-bold inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Cadastrar Agora
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPrinters.map((printer) => {
            const isTesting = testingId === printer.id;
            return (
              <div
                key={printer.id}
                className="bg-gray-900/90 border border-gray-800 hover:border-gray-700/80 rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all group"
              >
                <div>
                  {/* Top card header */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        printer.interfaceType === 'network_ip'
                          ? 'bg-purple-500/10 border border-purple-500/20 text-purple-400'
                          : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                      }`}>
                        {printer.interfaceType === 'network_ip' ? (
                          <Wifi className="w-6 h-6" />
                        ) : (
                          <Usb className="w-6 h-6" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-base group-hover:text-primary-400 transition-colors">
                          {printer.name}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                          <span className="capitalize">{printer.location}</span>
                          <span>•</span>
                          <span className="font-mono bg-gray-800 px-2 py-0.5 rounded text-gray-300">
                            {printer.paperWidth}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${
                        printer.status === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
                      }`} />
                      <span className="text-xs text-gray-400 capitalize">{printer.status}</span>
                    </div>
                  </div>

                  {/* Connection Details */}
                  <div className="bg-gray-950/60 rounded-xl p-3 border border-gray-800/80 mb-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-gray-400">
                      <span>Interface:</span>
                      <span className="font-semibold text-gray-200 uppercase">
                        {printer.interfaceType === 'network_ip' ? 'Rede IP (Ethernet/Wi-Fi)' : 'Cabo USB / Serial'}
                      </span>
                    </div>
                    {printer.interfaceType === 'network_ip' ? (
                      <div className="flex items-center justify-between text-gray-400">
                        <span>Endereço IP:</span>
                        <span className="font-mono font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                          {printer.ipAddress || 'Não configurado'}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-gray-400">
                        <span>Porta USB:</span>
                        <span className="font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          {printer.usbPort || 'Auto-Detect (ESC/POS)'}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-gray-400">
                      <span>Cópias / Corte:</span>
                      <span className="text-gray-300">
                        {printer.copies || 1} via(s) {printer.cutPaper ? '• Guilhotina Ativa' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Trigger Auto Switches */}
                  <div className="space-y-2 mb-4">
                    <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                      Roteamento Automático de Venda
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleKitchenTrigger(printer)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${
                        printer.printKitchenOrder
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                          : 'bg-gray-800/30 border-gray-800 text-gray-400 hover:bg-gray-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Utensils className="w-4 h-4" />
                        <span className="font-semibold">Comandas de Cozinha</span>
                      </div>
                      <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        printer.printKitchenOrder ? 'bg-amber-500/20 text-amber-300' : 'bg-gray-800 text-gray-500'
                      }`}>
                        {printer.printKitchenOrder ? 'Ativado' : 'Desativado'}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleReceiptTrigger(printer)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${
                        printer.printCustomerReceipt
                          ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                          : 'bg-gray-800/30 border-gray-800 text-gray-400 hover:bg-gray-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Receipt className="w-4 h-4" />
                        <span className="font-semibold">Comprovante Fiscal / Pedido</span>
                      </div>
                      <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        printer.printCustomerReceipt ? 'bg-blue-500/20 text-blue-300' : 'bg-gray-800 text-gray-500'
                      }`}>
                        {printer.printCustomerReceipt ? 'Ativado' : 'Desativado'}
                      </div>
                    </button>
                  </div>
                </div>

                {/* Actions footer */}
                <div className="pt-3 border-t border-gray-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleTestPrint(printer)}
                    disabled={isTesting}
                    className="flex-1 py-2 px-3 bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-gray-700"
                  >
                    {isTesting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary-400" />
                    ) : (
                      <Play className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    {isTesting ? 'Imprimindo...' : 'Teste ESC/POS'}
                  </button>

                  <button
                    onClick={() => handleOpenEdit(printer)}
                    className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl text-xs transition-colors border border-gray-700"
                    title="Editar configurações"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(printer.id)}
                    className="p-2 bg-gray-800 hover:bg-rose-900/40 text-gray-400 hover:text-rose-400 rounded-xl text-xs transition-colors border border-gray-700"
                    title="Remover impressora"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE CADASTRO / EDIÇÃO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-8 animate-scaleUp">
            <div className="p-6 bg-gradient-to-r from-gray-850 to-gray-900 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-500/10 border border-primary-500/20 text-primary-400 flex items-center justify-center">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">
                    {editingPrinter ? 'Editar Impressora Térmica' : 'Cadastrar Nova Impressora Térmica'}
                  </h3>
                  <p className="text-gray-400 text-xs">
                    Configure conexão física ou de rede e regras automáticas de impressão ESC/POS
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5">
              {/* Nome e Local */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Nome Identificador *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Epson Cozinha Quente"
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Setor / Localização
                  </label>
                  <select
                    value={formData.location || 'cozinha'}
                    onChange={e => setFormData({ ...formData, location: e.target.value as any })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-primary-500"
                  >
                    <option value="cozinha">Cozinha / Produção</option>
                    <option value="caixa">Caixa / Balcão</option>
                    <option value="bar">Bar / Copa de Bebidas</option>
                    <option value="delivery">Expedição / Delivery</option>
                  </select>
                </div>
              </div>

              {/* Tipo de Conexão: Rede IP ou USB */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-gray-300">
                  Tipo de Conexão *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, interfaceType: 'network_ip' })}
                    className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all ${
                      formData.interfaceType === 'network_ip'
                        ? 'bg-primary-500/10 border-primary-500 text-white shadow-lg shadow-primary-500/10'
                        : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${formData.interfaceType === 'network_ip' ? 'bg-primary-500/20 text-primary-400' : 'bg-gray-800 text-gray-400'}`}>
                      <Wifi className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white">Rede IP (Ethernet/Wi-Fi)</div>
                      <div className="text-[11px] text-gray-400 mt-0.5">Impressoras conectadas ao roteador via cabo de rede ou wireless</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, interfaceType: 'usb' })}
                    className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all ${
                      formData.interfaceType === 'usb'
                        ? 'bg-primary-500/10 border-primary-500 text-white shadow-lg shadow-primary-500/10'
                        : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${formData.interfaceType === 'usb' ? 'bg-primary-500/20 text-primary-400' : 'bg-gray-800 text-gray-400'}`}>
                      <Usb className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white">Conexão USB / Serial</div>
                      <div className="text-[11px] text-gray-400 mt-0.5">Plugada diretamente ao computador ou terminal PDV</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Configurações específicas da interface */}
              {formData.interfaceType === 'network_ip' ? (
                <div className="bg-gray-950/80 p-4 rounded-xl border border-gray-800 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-purple-400">
                    <Wifi className="w-4 h-4" /> Configuração de Endereço IP da Impressora
                  </div>
                  <div>
                    <label className="block text-xs text-gray-300 mb-1">
                      Endereço IP (Ex: 192.168.1.100 ou 10.0.0.45)
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.ipAddress || ''}
                      onChange={e => setFormData({ ...formData, ipAddress: e.target.value })}
                      placeholder="192.168.1.100"
                      className="w-full font-mono bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm focus:border-purple-500"
                    />
                    <p className="text-[11px] text-gray-500 mt-1">
                      Dica: Imprima o auto-teste da impressora segurando o botão FEED ao ligar para descobrir o IP fixado.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-950/80 p-4 rounded-xl border border-gray-800 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                    <Usb className="w-4 h-4" /> Configuração da Porta USB / Serial
                  </div>
                  <div>
                    <label className="block text-xs text-gray-300 mb-1">
                      Porta / Identificador do Sistema Operacional
                    </label>
                    <input
                      type="text"
                      value={formData.usbPort || ''}
                      onChange={e => setFormData({ ...formData, usbPort: e.target.value })}
                      placeholder="COM3, /dev/usb/lp0 ou USB001"
                      className="w-full font-mono bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}

              {/* Largura da Bobina e Cópias */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Largura da Bobina Térmica
                  </label>
                  <select
                    value={formData.paperWidth || '80mm'}
                    onChange={e => setFormData({ ...formData, paperWidth: e.target.value as any })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-primary-500"
                  >
                    <option value="80mm">80mm (Padrão Comercial - 48/42 colunas)</option>
                    <option value="58mm">58mm (Bobina Estreita - 32 colunas)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Número de Vias / Cópias
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={formData.copies || 1}
                    onChange={e => setFormData({ ...formData, copies: parseInt(e.target.value) || 1 })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>

              {/* Gatilhos Automáticos ao Finalizar a Venda */}
              <div className="p-4 bg-gray-950/60 rounded-xl border border-gray-800/80 space-y-3">
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary-400" />
                  Regras de Impressão Automática (Ao Finalizar Venda no PDV)
                </div>

                <div className="space-y-2.5">
                  <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-900/60 transition-colors">
                    <input
                      type="checkbox"
                      checked={!!formData.printKitchenOrder}
                      onChange={e => setFormData({ ...formData, printKitchenOrder: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-700 bg-gray-900 text-primary-600 focus:ring-primary-500"
                    />
                    <div>
                      <div className="text-sm font-semibold text-gray-200">
                        Imprimir comanda de cozinha automaticamente
                      </div>
                      <div className="text-xs text-gray-400">
                        Envia lista de itens de preparo com observações assim que a venda é confirmada
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-900/60 transition-colors">
                    <input
                      type="checkbox"
                      checked={!!formData.printCustomerReceipt}
                      onChange={e => setFormData({ ...formData, printCustomerReceipt: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-700 bg-gray-900 text-primary-600 focus:ring-primary-500"
                    />
                    <div>
                      <div className="text-sm font-semibold text-gray-200">
                        Imprimir comprovante fiscal / cupom de venda automaticamente
                      </div>
                      <div className="text-xs text-gray-400">
                        Emite via para o cliente com resumo dos itens, forma de pagamento e total
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-900/60 transition-colors">
                    <input
                      type="checkbox"
                      checked={!!formData.cutPaper}
                      onChange={e => setFormData({ ...formData, cutPaper: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-700 bg-gray-900 text-primary-600 focus:ring-primary-500"
                    />
                    <div>
                      <div className="text-sm font-semibold text-gray-200">
                        Acionar corte automático da guilhotina (Cutter)
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Botões do modal */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800 text-sm font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white text-sm font-bold shadow-lg shadow-primary-500/20 transition-all flex items-center gap-2"
                >
                  <Check className="w-4 h-4" /> Salvar Impressora
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
