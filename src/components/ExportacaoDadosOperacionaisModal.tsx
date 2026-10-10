import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Archive, 
  CheckCircle2, 
  X, 
  Calendar, 
  ShoppingBag, 
  Package, 
  ShieldCheck, 
  HardDrive, 
  Sparkles, 
  Clock,
  Filter,
  Check,
  AlertCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatBRL, formatDateTime } from '../utils/formatters';
import { playCashRegister, playSoftClickSound, playBeep } from '../utils/audio';

interface ExportacaoDadosOperacionaisModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'produtos' | 'vendas' | 'auditoria' | 'completo';
}

export const ExportacaoDadosOperacionaisModal: React.FC<ExportacaoDadosOperacionaisModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'completo'
}) => {
  const { products = [], orders = [], auditLogs = [], tenant, currentBranch } = useApp();

  const [activeTab, setActiveTab] = useState<'produtos' | 'vendas' | 'auditoria' | 'completo'>(initialTab);
  const [salesPeriod, setSalesPeriod] = useState<'today' | '7days' | '30days' | 'month' | 'all'>('all');
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [lastExportMessage, setLastExportMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const todayStr = new Date().toISOString().split('T')[0];

  // Helper para download seguro no navegador
  const triggerDownload = (filename: string, content: string, mimeType = 'text/csv;charset=utf-8;') => {
    // Adiciona BOM (\uFEFF) para forçar o Excel a reconhecer caracteres UTF-8 (acentos, cedilha, etc.)
    const blob = new Blob(['\uFEFF' + content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 1. Exportar Produtos & Cardápio para CSV/Excel
  const exportProdutosCSV = () => {
    setIsExporting('produtos');
    playSoftClickSound();

    try {
      const headers = [
        'ID Produto',
        'Nome do Produto',
        'Categoria',
        'Preço de Venda (R$)',
        'Preço de Custo (R$)',
        'Margem Bruta (%)',
        'CMV Estimado (%)',
        'Praça / Estação',
        'Classificação Matriz BCG',
        'Disponível',
        'Descrição / Ficha Técnica'
      ];

      const rows = products.map(p => {
        const cost = p.costPrice || 0;
        const price = p.price || 0;
        const margin = p.marginPercent ?? (price > 0 ? Number((((price - cost) / price) * 100).toFixed(1)) : 0);
        const cmv = p.cmvPercent ?? (price > 0 ? Number(((cost / price) * 100).toFixed(1)) : 0);

        return [
          `"${p.id}"`,
          `"${(p.name || '').replace(/"/g, '""')}"`,
          `"${(p.category || 'Geral').replace(/"/g, '""')}"`,
          price.toFixed(2).replace('.', ','),
          cost.toFixed(2).replace('.', ','),
          `${margin}%`,
          `${cmv}%`,
          `"${p.station || 'Geral'}"`,
          `"${p.bcgClassification || 'Estrela'}"`,
          p.available !== false ? 'Sim' : 'Não',
          `"${(p.description || '').replace(/"/g, '""')}"`
        ];
      });

      const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
      triggerDownload(`produtos_cardapio_${tenant.slug || 'dulci'}_${todayStr}.csv`, csv);

      playCashRegister();
      setLastExportMessage(`Catálogo de ${products.length} produtos exportado com sucesso!`);
    } catch (e) {
      console.warn('Erro ao exportar produtos:', e);
    } finally {
      setIsExporting(null);
    }
  };

  // 2. Exportar Vendas & Pedidos para CSV/Excel
  const exportVendasCSV = () => {
    setIsExporting('vendas');
    playSoftClickSound();

    try {
      // Filtrar por período selecionado
      const filteredOrders = orders.filter(o => {
        if (!o.createdAt) return true;
        const orderDate = new Date(o.createdAt);
        const now = new Date();

        if (salesPeriod === 'today') {
          return o.createdAt.startsWith(todayStr);
        } else if (salesPeriod === '7days') {
          const limit = new Date();
          limit.setDate(limit.getDate() - 7);
          return orderDate >= limit;
        } else if (salesPeriod === '30days') {
          const limit = new Date();
          limit.setDate(limit.getDate() - 30);
          return orderDate >= limit;
        } else if (salesPeriod === 'month') {
          return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
        }
        return true;
      });

      const headers = [
        'ID Pedido',
        'Código / Display',
        'Data e Hora',
        'Canal de Venda',
        'Status do Pedido',
        'Nome do Cliente',
        'Telefone',
        'Endereço de Entrega',
        'Mesa / Comanda',
        'Qtd Itens',
        'Itens Detalhados',
        'Subtotal (R$)',
        'Desconto (R$)',
        'Taxa de Entrega (R$)',
        'Taxa de Serviço (R$)',
        'Total Líquido (R$)',
        'Forma de Pagamento',
        'Status do Pagamento'
      ];

      const rows = filteredOrders.map(o => {
        const itemsSummary = (o.items || [])
          .map(it => `${it.quantity}x ${it.name || (it as any).productName}`)
          .join(' + ');

        const channelLabel = 
          o.channel === 'pdv_balcao' ? 'Balcão PDV' :
          o.channel === 'mesa' ? `Mesa ${o.tableNumber || ''}` :
          o.channel === 'delivery_whatsapp' ? 'WhatsApp Delivery' :
          o.channel === 'cardapio_online' ? 'Cardápio Online' : o.channel;

        return [
          `"${o.id}"`,
          `"${o.displayCode || `#${o.orderNumber}`}"`,
          `"${formatDateTime(o.createdAt)}"`,
          `"${channelLabel}"`,
          `"${o.status}"`,
          `"${(o.customerName || 'Cliente Balcão').replace(/"/g, '""')}"`,
          `"${(o.customerPhone || '').replace(/"/g, '""')}"`,
          `"${(o.customerAddress || '').replace(/"/g, '""')}"`,
          `"${o.tableNumber ? `Mesa ${o.tableNumber}` : o.comandaNumber ? `Comanda ${o.comandaNumber}` : '-'}"`,
          (o.items || []).length,
          `"${itemsSummary.replace(/"/g, '""')}"`,
          (o.subtotal || o.total || 0).toFixed(2).replace('.', ','),
          (o.discount || 0).toFixed(2).replace('.', ','),
          (o.deliveryFee || 0).toFixed(2).replace('.', ','),
          (o.serviceFee || 0).toFixed(2).replace('.', ','),
          (o.total || 0).toFixed(2).replace('.', ','),
          `"${(o.paymentMethod || 'PIX').toUpperCase()}"`,
          `"${(o.paymentStatus || 'PAGO').toUpperCase()}"`
        ];
      });

      const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
      triggerDownload(`vendas_pedidos_${tenant.slug || 'dulci'}_${todayStr}.csv`, csv);

      playCashRegister();
      setLastExportMessage(`Relatório de ${filteredOrders.length} vendas exportado com sucesso!`);
    } catch (e) {
      console.warn('Erro ao exportar vendas:', e);
    } finally {
      setIsExporting(null);
    }
  };

  // 3. Exportar Logs de Auditoria para CSV/Excel
  const exportAuditoriaCSV = () => {
    setIsExporting('auditoria');
    playSoftClickSound();

    try {
      const headers = [
        'ID Evento',
        'Data e Hora (ISO)',
        'Data Formatada',
        'Tenant / Loja ID',
        'Operador / Usuário',
        'E-mail',
        'Função / Cargo',
        'Tipo de Ação',
        'Severidade',
        'Descrição da Operação',
        'IP do Terminal',
        'Metadados / Detalhes'
      ];

      const rows = auditLogs.map(l => [
        `"${l.id}"`,
        `"${l.timestamp}"`,
        `"${formatDateTime(l.timestamp)}"`,
        `"${l.tenantId || tenant.id}"`,
        `"${(l.userName || 'Sistema').replace(/"/g, '""')}"`,
        `"${(l.userEmail || '').replace(/"/g, '""')}"`,
        `"${l.userRole || 'admin'}"`,
        `"${l.actionType || l.action || 'operacao'}"`,
        `"${l.severity || 'info'}"`,
        `"${(l.description || '').replace(/"/g, '""')}"`,
        `"${l.ipAddress || '127.0.0.1'}"`,
        `"${JSON.stringify(l.metadata || l.details || {}).replace(/"/g, '""')}"`
      ]);

      const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
      triggerDownload(`auditoria_lgpd_${tenant.slug || 'dulci'}_${todayStr}.csv`, csv);

      playCashRegister();
      setLastExportMessage(`Trilha de ${auditLogs.length} logs de auditoria exportada com sucesso!`);
    } catch (e) {
      console.warn('Erro ao exportar auditoria:', e);
    } finally {
      setIsExporting(null);
    }
  };

  // 4. Backup Completo Unificado (JSON Estruturado + Todos os CSVs)
  const exportBackupCompleto = () => {
    setIsExporting('completo');
    playSoftClickSound();

    try {
      // 1. Exporta arquivo JSON consolidado de recuperação de desastres
      const backupData = {
        meta: {
          app: 'NEON FOOD OS',
          version: '3.5.0',
          tenantId: tenant.id,
          tenantName: tenant.name,
          branchName: currentBranch?.name,
          exportedAt: new Date().toISOString(),
          totalProducts: products.length,
          totalOrders: orders.length,
          totalAuditLogs: auditLogs.length
        },
        products,
        orders,
        auditLogs
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      triggerDownload(
        `backup_completo_neonfoodos_${tenant.slug || 'dulci'}_${todayStr}.json`,
        jsonStr,
        'application/json;charset=utf-8;'
      );

      // 2. Dispara também os CSVs individuais com intervalo suave
      setTimeout(() => exportProdutosCSV(), 400);
      setTimeout(() => exportVendasCSV(), 800);
      setTimeout(() => exportAuditoriaCSV(), 1200);

      // Salva carimbo do último backup no localStorage
      try {
        localStorage.setItem('neon_last_full_backup_date', new Date().toISOString());
      } catch {}

      playCashRegister();
      setLastExportMessage('Backup Completo físico e local gerado com sucesso!');
    } catch (e) {
      console.warn('Erro no backup completo:', e);
    } finally {
      setTimeout(() => setIsExporting(null), 1500);
    }
  };

  const lastBackupSaved = typeof window !== 'undefined' ? localStorage.getItem('neon_last_full_backup_date') : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto select-none">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-3xl bg-[#111119] border border-[#26263A] rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]"
      >
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-[#222234] bg-gradient-to-r from-[#14121E] via-[#181528] to-[#12121A] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-black font-black flex items-center justify-center shadow-lg">
              <HardDrive className="w-5 h-5 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  Backup Físico & Exportação de Dados
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  CSV / Excel / JSON
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Baixe cópias físicas locais dos produtos, vendas e trilha de auditoria para segurança jurídica e relatórios.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1C1C2A] hover:bg-[#28283C] text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback Alert */}
        <AnimatePresence>
          {lastExportMessage && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-emerald-500/15 border-b border-emerald-500/30 px-6 py-2.5 text-xs font-bold text-emerald-300 flex items-center justify-between shrink-0"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{lastExportMessage}</span>
              </div>
              <button 
                onClick={() => setLastExportMessage(null)}
                className="text-emerald-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-[#202030] bg-[#14141E] px-4 overflow-x-auto scrollbar-none shrink-0 text-xs font-bold">
          <button
            onClick={() => { setActiveTab('completo'); playSoftClickSound(); }}
            className={`py-3 px-4 transition-all border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'completo'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Archive className="w-4 h-4" />
            <span>Backup Completo 1-Clique</span>
          </button>

          <button
            onClick={() => { setActiveTab('produtos'); playSoftClickSound(); }}
            className={`py-3 px-4 transition-all border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'produtos'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Produtos ({products.length})</span>
          </button>

          <button
            onClick={() => { setActiveTab('vendas'); playSoftClickSound(); }}
            className={`py-3 px-4 transition-all border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'vendas'
                ? 'border-blue-400 text-blue-400'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Vendas & Pedidos ({orders.length})</span>
          </button>

          <button
            onClick={() => { setActiveTab('auditoria'); playSoftClickSound(); }}
            className={`py-3 px-4 transition-all border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'auditoria'
                ? 'border-purple-400 text-purple-400'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Auditoria & LGPD ({auditLogs.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
          
          {/* TAB 1: BACKUP COMPLETO (RECOMENDADO) */}
          {activeTab === 'completo' && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-[#161624] border border-[#28283C] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white">Pacote de Backup Geral da Operação</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Recomendado
                    </span>
                  </div>
                  <p className="text-zinc-400 leading-relaxed">
                    Gera simultaneamente uma cópia de segurança em JSON estruturado para restauração e 3 planilhas CSV prontas para o Excel com o histórico completo.
                  </p>
                  {lastBackupSaved && (
                    <div className="text-[11px] text-zinc-500 flex items-center gap-1.5 pt-1">
                      <Clock className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Último backup realizado em: <strong>{formatDateTime(lastBackupSaved)}</strong></span>
                    </div>
                  )}
                </div>

                <button
                  onClick={exportBackupCompleto}
                  disabled={isExporting !== null}
                  className="px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-black font-black text-xs rounded-xl transition-all cursor-pointer shadow-lg whitespace-nowrap flex items-center gap-2 self-stretch md:self-auto justify-center disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{isExporting === 'completo' ? 'GERANDO BACKUP...' : 'BAIXAR BACKUP GERAL AGORA'}</span>
                </button>
              </div>

              {/* Métricas do que será exportado */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-[#14141E] border border-[#222234]">
                  <div className="text-zinc-400 font-bold uppercase text-[10px]">Cardápio</div>
                  <div className="text-xl font-black text-white font-mono mt-1">{products.length} itens</div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">Preços, CMV, margens e receitas</div>
                </div>

                <div className="p-4 rounded-xl bg-[#14141E] border border-[#222234]">
                  <div className="text-zinc-400 font-bold uppercase text-[10px]">Histórico de Vendas</div>
                  <div className="text-xl font-black text-white font-mono mt-1">{orders.length} pedidos</div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">Balcão, mesas, canais e pagamentos</div>
                </div>

                <div className="p-4 rounded-xl bg-[#14141E] border border-[#222234]">
                  <div className="text-zinc-400 font-bold uppercase text-[10px]">Trilha de Auditoria</div>
                  <div className="text-xl font-black text-white font-mono mt-1">{auditLogs.length} eventos</div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">Logins, preços, exclusões e caixa</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PRODUTOS */}
          {activeTab === 'produtos' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#161624] border border-[#28283C] flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-white text-sm">Exportar Produtos e Engenharia de Cardápio</h3>
                  <p className="text-zinc-400 text-xs mt-0.5">
                    Planilha formatada em CSV/Excel com preços de venda, custos unitários, margens de contribuição e classificação BCG.
                  </p>
                </div>

                <button
                  onClick={exportProdutosCSV}
                  disabled={isExporting !== null || products.length === 0}
                  className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-black font-extrabold rounded-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 disabled:opacity-50"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Exportar CSV Produtos</span>
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-[#14141E] border border-[#222234] text-zinc-400 text-[11px]">
                <span className="font-bold text-white">Campos inclusos na planilha:</span> ID, Nome, Categoria, Preço de Venda, Custo, Margem de Lucro, CMV Estimado, Praça de Produção, Matriz BCG e Disponibilidade.
              </div>
            </div>
          )}

          {/* TAB 3: VENDAS */}
          {activeTab === 'vendas' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#161624] border border-[#28283C] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-white text-sm">Exportar Histórico de Vendas e Faturamento</h3>
                    <p className="text-zinc-400 text-xs mt-0.5">
                      Extrato completo com detalhes de cada comanda, meio de pagamento e discriminação de itens.
                    </p>
                  </div>

                  <button
                    onClick={exportVendasCSV}
                    disabled={isExporting !== null || orders.length === 0}
                    className="px-5 py-2.5 bg-blue-500 hover:bg-blue-400 text-white font-extrabold rounded-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 disabled:opacity-50"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Exportar CSV Vendas</span>
                  </button>
                </div>

                {/* Filtro de Período para Vendas */}
                <div className="flex items-center gap-2 pt-2 border-t border-[#222232] overflow-x-auto scrollbar-none">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 shrink-0">Filtrar período:</span>
                  {(['all', 'today', '7days', '30days', 'month'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setSalesPeriod(p)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                        salesPeriod === p
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                          : 'bg-[#12121A] text-zinc-400 hover:text-white border border-[#252538]'
                      }`}
                    >
                      {p === 'all' ? 'Todo o Histórico' : p === 'today' ? 'Hoje' : p === '7days' ? 'Últimos 7 dias' : p === '30days' ? 'Últimos 30 dias' : 'Este Mês'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#14141E] border border-[#222234] text-zinc-400 text-[11px]">
                <span className="font-bold text-white">Campos inclusos na planilha:</span> Código, Data/Hora, Canal (Balcão, Mesa, Delivery), Status, Cliente, Telefone, Endereço, Qtd Itens, Relação de Itens, Subtotal, Desconto, Taxa de Entrega, Total Líquido, Meio de Pagamento e Status do Pagamento.
              </div>
            </div>
          )}

          {/* TAB 4: AUDITORIA */}
          {activeTab === 'auditoria' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#161624] border border-[#28283C] flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-white text-sm">Exportar Trilha de Auditoria & Conformidade LGPD</h3>
                  <p className="text-zinc-400 text-xs mt-0.5">
                    Histórico imutável de logins, criações de pedido, alterações de preço, exclusões e fechamentos de caixa.
                  </p>
                </div>

                <button
                  onClick={exportAuditoriaCSV}
                  disabled={isExporting !== null || auditLogs.length === 0}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-extrabold rounded-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 disabled:opacity-50"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Exportar CSV Auditoria</span>
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-[#14141E] border border-[#222234] text-zinc-400 text-[11px]">
                <span className="font-bold text-white">Campos inclusos na planilha:</span> ID do Evento, Timestamp ISO, Operador, E-mail, Função, Tipo de Ação, Severidade, Descrição Detalhada, Endereço IP e Metadados (JSON).
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[#222234] bg-[#12121A] flex items-center justify-between shrink-0 text-xs">
          <span className="text-zinc-500 font-medium">
            Formatado com UTF-8 BOM para compatibilidade nativa com Excel e Google Planilhas.
          </span>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#1C1C2A] hover:bg-[#252538] text-white font-bold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </motion.div>
    </div>
  );
};
