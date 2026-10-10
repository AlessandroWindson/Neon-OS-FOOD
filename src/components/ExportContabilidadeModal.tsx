import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileSpreadsheet, 
  FileText, 
  Download, 
  Printer, 
  X, 
  Calendar, 
  Filter, 
  CheckCircle2, 
  Clock, 
  Building, 
  DollarSign, 
  Percent, 
  QrCode, 
  CreditCard,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import { Order } from '../types';
import { formatBRL, formatDateTime } from '../utils/formatters';
import { playBeep, playCashRegister } from '../utils/audio';
import { 
  generateTransactionsCSV, 
  downloadCSV, 
  printAccountingStatementPDF,
  ExportFilters,
  CompanyInfo
} from '../utils/exportFinanceiro';

interface ExportContabilidadeModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  initialTimeFilter?: 'today' | '7days' | '30days' | 'all';
  currentBranchName?: string;
  tenantName?: string;
}

export const ExportContabilidadeModal: React.FC<ExportContabilidadeModalProps> = ({
  isOpen,
  onClose,
  orders,
  initialTimeFilter = 'today',
  currentBranchName = 'Matriz São Paulo',
  tenantName = 'NEON FOOD OS'
}) => {
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'pdf'>('csv');
  const [period, setPeriod] = useState<'today' | '7days' | '30days' | 'all'>(initialTimeFilter);
  const [method, setMethod] = useState<'all' | 'pix' | 'card_all' | 'credit_card' | 'debit_card' | 'cash'>('all');
  const [channel, setChannel] = useState<string>('all');
  const [isExporting, setIsExporting] = useState(false);

  // Filtra as transações com base no período e critérios selecionados no modal
  const exportOrders = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return orders.filter(o => {
      // Ignora cancelados
      if (o.status === 'canceled') return false;

      // Filtro de Data/Período
      const orderDate = o.createdAt ? o.createdAt.split('T')[0] : todayStr;
      if (period === 'today') {
        if (orderDate !== todayStr && o.createdAt) return false;
      } else if (period === '7days') {
        const diffDays = (now.getTime() - new Date(o.createdAt).getTime()) / (1000 * 3600 * 24);
        if (diffDays > 7) return false;
      } else if (period === '30days') {
        const diffDays = (now.getTime() - new Date(o.createdAt).getTime()) / (1000 * 3600 * 24);
        if (diffDays > 30) return false;
      }

      // Filtro de Método
      if (method === 'pix' && o.paymentMethod !== 'pix') return false;
      if (method === 'card_all' && o.paymentMethod !== 'credit_card' && o.paymentMethod !== 'debit_card') return false;
      if (method === 'credit_card' && o.paymentMethod !== 'credit_card') return false;
      if (method === 'debit_card' && o.paymentMethod !== 'debit_card') return false;
      if (method === 'cash' && o.paymentMethod !== 'cash') return false;

      // Filtro de Canal
      if (channel !== 'all' && o.channel !== channel) return false;

      return true;
    });
  }, [orders, period, method, channel]);

  // Cálculos contábeis da prévia
  const stats = useMemo(() => {
    let gross = 0;
    let fees = 0;
    let net = 0;
    let pixCount = 0;
    let cardCount = 0;

    exportOrders.forEach(o => {
      gross += o.total;
      const isCredit = o.paymentMethod === 'credit_card';
      const isDebit = o.paymentMethod === 'debit_card';
      const fee = isCredit ? o.total * 0.0289 : (isDebit ? o.total * 0.0129 : 0);
      fees += fee;
      net += (o.total - fee);

      if (o.paymentMethod === 'pix') pixCount++;
      if (isCredit || isDebit) cardCount++;
    });

    return { gross, fees, net, count: exportOrders.length, pixCount, cardCount };
  }, [exportOrders]);

  const periodLabel = useMemo(() => {
    switch (period) {
      case 'today': return `Hoje (${new Date().toLocaleDateString('pt-BR')})`;
      case '7days': return 'Últimos 7 Dias';
      case '30days': return 'Últimos 30 Dias';
      case 'all': return 'Histórico Completo';
      default: return 'Período Selecionado';
    }
  }, [period]);

  const companyInfo: CompanyInfo = {
    name: tenantName,
    branchName: currentBranchName,
    cnpj: '12.345.678/0001-90',
  };

  const exportFilters: ExportFilters = {
    periodLabel,
    methodFilter: method,
    channelFilter: channel
  };

  const handleExecuteExport = () => {
    setIsExporting(true);
    playCashRegister();

    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `extrato-contabil-${period}-${dateStr}.${selectedFormat}`;

    if (selectedFormat === 'csv') {
      const csvContent = generateTransactionsCSV(exportOrders, exportFilters, companyInfo);
      downloadCSV(csvContent, filename);
    } else {
      printAccountingStatementPDF(exportOrders, exportFilters, companyInfo);
    }

    setTimeout(() => {
      setIsExporting(false);
      onClose();
    }, 600);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-[#12121E] border border-zinc-700/80 rounded-3xl w-full max-w-2xl overflow-hidden shadow-[0_16px_50px_rgba(0,0,0,0.8)] flex flex-col max-h-[90vh]"
      >
        {/* Cabeçalho do Modal */}
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-gradient-to-r from-zinc-900 to-[#12121E]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#00E676]/15 text-[#00E676] border border-[#00E676]/30">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-[#00E676] border border-emerald-500/30">
                  Conciliação & Fiscal
                </span>
                <span className="text-xs text-zinc-400">Contabilidade</span>
              </div>
              <h3 className="text-lg font-black text-white mt-0.5">
                Exportar Histórico de Transações
              </h3>
            </div>
          </div>

          <button
            onClick={() => { playBeep(600, 0.04); onClose(); }}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo com Opções de Filtro e Prévia */}
        <div className="p-6 overflow-y-auto space-y-5">
          
          {/* 1. Escolha do Formato: CSV vs PDF */}
          <div>
            <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block mb-2">
              1. Formato de Exportação
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => { setSelectedFormat('csv'); playBeep(800, 0.04); }}
                className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                  selectedFormat === 'csv'
                    ? 'bg-emerald-500/10 border-[#00E676] text-white shadow-[0_0_20px_rgba(0,230,118,0.2)]'
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                }`}
              >
                <div className={`p-2 rounded-xl border shrink-0 ${
                  selectedFormat === 'csv' ? 'bg-[#00E676] text-black border-[#00E676]' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                }`}>
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm text-white flex items-center gap-1.5">
                    <span>Planilha CSV (.csv)</span>
                    {selectedFormat === 'csv' && <CheckCircle2 className="w-4 h-4 text-[#00E676]" />}
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Compatível com Microsoft Excel, Google Sheets, ERPs (Omie, ContaAzul, TOTVS). Inclui BOM UTF-8.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => { setSelectedFormat('pdf'); playBeep(800, 0.04); }}
                className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                  selectedFormat === 'pdf'
                    ? 'bg-blue-500/10 border-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.2)]'
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                }`}
              >
                <div className={`p-2 rounded-xl border shrink-0 ${
                  selectedFormat === 'pdf' ? 'bg-blue-500 text-white border-blue-500' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                }`}>
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm text-white flex items-center gap-1.5">
                    <span>Extrato PDF (.pdf)</span>
                    {selectedFormat === 'pdf' && <CheckCircle2 className="w-4 h-4 text-blue-400" />}
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Relatório oficial contábil A4 com cabeçalho timbrado, KPIs de liquidação e campo para assinatura do contador.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* 2. Seleção de Período Contábil */}
          <div>
            <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block mb-2">
              2. Período de Apuração
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'today', label: 'Hoje (Ao Vivo)', sub: 'Dia atual' },
                { id: '7days', label: 'Últimos 7 Dias', sub: 'Semana' },
                { id: '30days', label: 'Últimos 30 Dias', sub: 'Mensal' },
                { id: 'all', label: 'Todo o Histórico', sub: 'Geral' }
              ].map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { setPeriod(p.id as any); playBeep(700, 0.03); }}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    period === p.id
                      ? 'bg-zinc-800 border-zinc-500 text-white shadow-md'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:bg-zinc-800/50'
                  }`}
                >
                  <span className="text-xs font-bold block text-white">{p.label}</span>
                  <span className="text-[10px] text-zinc-500">{p.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Filtros Opcionais de Meio e Canal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block mb-1.5">
                Método de Pagamento
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="all">Todos os Meios (Pix + Cartão + Dinheiro)</option>
                <option value="pix">Apenas PIX Dinâmico (D+0)</option>
                <option value="card_all">Todos os Cartões (Crédito & Débito)</option>
                <option value="credit_card">Apenas Cartão de Crédito</option>
                <option value="debit_card">Apenas Cartão de Débito</option>
                <option value="cash">Apenas Dinheiro vivo</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block mb-1.5">
                Canal de Venda
              </label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="all">Todos os Canais de Venda</option>
                <option value="cardapio_online">Cardápio Digital & Online</option>
                <option value="pdv_balcao">PDV Balcão</option>
                <option value="mesa">Salão & Mesas (Comandas)</option>
                <option value="delivery_whatsapp">Delivery WhatsApp</option>
              </select>
            </div>
          </div>

          {/* 4. Resumo Executivo / Prévia Contábil dos Dados a Serem Baixados */}
          <div className="bg-[#0A0A10] border border-zinc-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-[#00E676]" />
                Prévia dos Dados do Extrato
              </span>
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                {stats.count} lançamentos encontrados
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs pt-1">
              <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800">
                <span className="text-[10px] text-zinc-400 block">Total Bruto</span>
                <strong className="font-mono font-bold text-white text-sm">
                  {formatBRL(stats.gross)}
                </strong>
              </div>

              <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800">
                <span className="text-[10px] text-zinc-400 block">Deduções MDR</span>
                <strong className="font-mono font-bold text-rose-400 text-sm">
                  - {formatBRL(stats.fees)}
                </strong>
              </div>

              <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800">
                <span className="text-[10px] text-emerald-400 block">Líquido a Conciliar</span>
                <strong className="font-mono font-bold text-[#00E676] text-sm">
                  {formatBRL(stats.net)}
                </strong>
              </div>
            </div>

            <p className="text-[11px] text-zinc-500 italic">
              Arquivo será gerado com o nome: <code className="text-zinc-300">extrato-contabil-{period}-{new Date().toISOString().split('T')[0]}.{selectedFormat}</code>
            </p>
          </div>

        </div>

        {/* Rodapé do Modal */}
        <div className="p-6 border-t border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isExporting || stats.count === 0}
              onClick={handleExecuteExport}
              className={`px-6 py-2.5 rounded-2xl font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                selectedFormat === 'csv'
                  ? 'bg-[#00E676] text-black hover:brightness-110 shadow-[0_0_20px_rgba(0,230,118,0.3)]'
                  : 'bg-blue-500 text-white hover:brightness-110 shadow-[0_0_20px_rgba(59,130,246,0.3)]'
              }`}
            >
              {selectedFormat === 'csv' ? (
                <>
                  <Download className="w-4 h-4" />
                  <span>Baixar Arquivo CSV</span>
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4" />
                  <span>Gerar & Imprimir PDF Contábil</span>
                </>
              )}
            </button>
          </div>
        </div>

      </motion.div>
    </div>
  );
};
