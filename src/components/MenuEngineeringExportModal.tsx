import React, { useState } from 'react';
import {
  FileText,
  FileSpreadsheet,
  Download,
  Printer,
  Copy,
  CheckCircle2,
  X,
  Sparkles,
  DollarSign,
  TrendingUp,
  Boxes,
  Award,
  HelpCircle,
  BarChart3,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { formatBRL, formatPercent } from '../utils/formatters';
import { playBeep, playCashRegister } from '../utils/audio';

export interface ExportProductItem {
  id: string;
  name: string;
  category: string;
  price: number;
  costPrice: number;
  cmvPercent: number;
  marginReais: number;
  marginPercent: number;
  salesVolume: number;
  revenue: number;
  profit: number;
  bcgClassification: string;
}

export interface ExportBenchmarks {
  avgVolume: number;
  avgMarginReais: number;
  avgMarginPercent: number;
  totalRevenue: number;
  totalProfit: number;
}

interface MenuEngineeringExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: ExportProductItem[];
  benchmarks: ExportBenchmarks;
  tenantName?: string;
  onOpenCatalogoPdf?: () => void;
}

export const MenuEngineeringExportModal: React.FC<MenuEngineeringExportModalProps> = ({
  isOpen,
  onClose,
  products,
  benchmarks,
  tenantName = 'Lanchonete Dulci',
  onOpenCatalogoPdf
}) => {
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf_preview' | 'clipboard'>('pdf_preview');
  const [exportScope, setExportScope] = useState<'all' | 'high_margin' | 'action_needed'>('all');
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen) return null;

  // Filter products based on selected scope
  const filteredExportItems = products.filter(p => {
    if (exportScope === 'high_margin') {
      return p.bcgClassification === 'star' || p.bcgClassification === 'puzzle' || p.bcgClassification === 'question_mark';
    }
    if (exportScope === 'action_needed') {
      return p.bcgClassification === 'dog' || p.bcgClassification === 'cash_cow' || p.bcgClassification === 'horse' || p.bcgClassification === 'puzzle';
    }
    return true;
  });

  // Helper to translate quadrant
  const getQuadrantInfo = (classification: string) => {
    switch (classification) {
      case 'star':
        return {
          name: 'Estrela (Star)',
          badge: '⭐ Estrela',
          action: 'Manter qualidade rígida e destaque prioritário no topo do cardápio.',
          colorText: 'text-[#FFE600]',
          colorBg: 'bg-[#FFE600]/10 border-[#FFE600]/30',
        };
      case 'cash_cow':
      case 'horse':
        return {
          name: 'Cavalo de Batalha (Plowhorse)',
          badge: '🐎 Cavalo de Batalha',
          action: 'Aumentar preço gradualmente (+R$ 1 a R$ 3) ou renegociar insumos.',
          colorText: 'text-[#00D26A]',
          colorBg: 'bg-[#00D26A]/10 border-[#00D26A]/30',
        };
      case 'puzzle':
      case 'question_mark':
        return {
          name: 'Quebra-Cabeça (Puzzle)',
          badge: '❓ Quebra-Cabeça',
          action: 'Melhorar visibilidade, fotos, combos e comissionamento da equipe.',
          colorText: 'text-[#77D4E1]',
          colorBg: 'bg-[#77D4E1]/10 border-[#77D4E1]/30',
        };
      case 'dog':
        return {
          name: 'Cão de Guarda (Dog)',
          badge: '🐶 Cão de Guarda',
          action: 'Reformular receita com menor custo ou substituir do cardápio.',
          colorText: 'text-[#FF2B4E]',
          colorBg: 'bg-[#FF2B4E]/10 border-[#FF2B4E]/30',
        };
      default:
        return {
          name: 'Prato Geral',
          badge: 'Geral',
          action: 'Monitorar vendas e margem.',
          colorText: 'text-white',
          colorBg: 'bg-[#222232] border-[#333346]',
        };
    }
  };

  // Generate CSV Data and Trigger Download
  const handleExportCSV = () => {
    playCashRegister();
    const currentDate = new Date().toISOString().split('T')[0];
    const fileName = `engenharia-cardapio-neon-food-${currentDate}.csv`;

    const headers = [
      'ID',
      'Nome do Prato',
      'Categoria',
      'Classificacao Matriz Kasavana & Smith',
      'Preco Venda (R$)',
      'Custo Insumos / CMV (R$)',
      'CMV (%)',
      'Margem Contribuicao (R$)',
      'Margem Bruta (%)',
      'Volume Vendas 30d (un)',
      'Faturamento Total (R$)',
      'Lucro Total Gerado (R$)',
      'Recomendacao Estrategica'
    ];

    const rows = filteredExportItems.map(p => {
      const q = getQuadrantInfo(p.bcgClassification);
      return [
        `"${p.id}"`,
        `"${p.name.replace(/"/g, '""')}"`,
        `"${p.category}"`,
        `"${q.name}"`,
        p.price.toFixed(2).replace('.', ','),
        p.costPrice.toFixed(2).replace('.', ','),
        p.cmvPercent.toFixed(1).replace('.', ','),
        p.marginReais.toFixed(2).replace('.', ','),
        p.marginPercent.toFixed(1).replace('.', ','),
        p.salesVolume,
        p.revenue.toFixed(2).replace('.', ','),
        p.profit.toFixed(2).replace('.', ','),
        `"${q.action.replace(/"/g, '""')}"`
      ].join(';');
    });

    // Add Summary at the bottom
    const summaryRows = [
      '',
      'RESUMO GERENCIAL DA ENGENHARIA DE CARDAPIO',
      `Faturamento Total;R$ ${benchmarks.totalRevenue.toFixed(2).replace('.', ',')}`,
      `Lucro Bruto Total;R$ ${benchmarks.totalProfit.toFixed(2).replace('.', ',')}`,
      `Margem Media Unitaria;R$ ${benchmarks.avgMarginReais.toFixed(2).replace('.', ',')}`,
      `Volume Medio por Prato;${benchmarks.avgVolume} unidades`,
      `Margem Media Bruta;${benchmarks.avgMarginPercent.toFixed(1).replace('.', ',')}%`,
      `Data de Emissao;${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`,
    ];

    // UTF-8 BOM for Microsoft Excel compatibility
    const csvContent = '\uFEFF' + [headers.join(';'), ...rows, ...summaryRows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 4000);
  };

  // Copy to Clipboard (Tab-separated for instant Excel / Google Sheets pasting)
  const handleCopyToClipboard = () => {
    playBeep(900, 0.05);
    const headers = [
      'ID',
      'Nome do Prato',
      'Categoria',
      'Quadrante',
      'Preço Venda (R$)',
      'Custo (R$)',
      'CMV (%)',
      'Margem (R$)',
      'Margem (%)',
      'Vendas (un)',
      'Faturamento (R$)',
      'Lucro Total (R$)',
      'Recomendação'
    ].join('\t');

    const rows = filteredExportItems.map(p => {
      const q = getQuadrantInfo(p.bcgClassification);
      return [
        p.id,
        p.name,
        p.category,
        q.name,
        p.price.toFixed(2).replace('.', ','),
        p.costPrice.toFixed(2).replace('.', ','),
        `${p.cmvPercent.toFixed(1)}%`,
        p.marginReais.toFixed(2).replace('.', ','),
        `${p.marginPercent.toFixed(1)}%`,
        p.salesVolume,
        p.revenue.toFixed(2).replace('.', ','),
        p.profit.toFixed(2).replace('.', ','),
        q.action
      ].join('\t');
    }).join('\n');

    const fullText = `${headers}\n${rows}`;
    navigator.clipboard.writeText(fullText);

    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 3000);
  };

  // Print PDF
  const handlePrintPDF = () => {
    playBeep(920, 0.08);
    window.print();
  };

  // Quadrants breakdown
  const starsCount = products.filter(p => p.bcgClassification === 'star').length;
  const horsesCount = products.filter(p => p.bcgClassification === 'cash_cow' || p.bcgClassification === 'horse').length;
  const puzzlesCount = products.filter(p => p.bcgClassification === 'puzzle' || p.bcgClassification === 'question_mark').length;
  const dogsCount = products.filter(p => p.bcgClassification === 'dog').length;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-[#111117] border border-[#262638] rounded-3xl max-w-5xl w-full shadow-2xl relative flex flex-col max-h-[94vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#20202E] flex items-center justify-between bg-[#14141E]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FFE600]/20 text-[#FFE600] flex items-center justify-center border border-[#FFE600]/40">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">Exportação de Engenharia de Cardápio</h3>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#FFE600]/10 text-[#FFE600] border border-[#FFE600]/30">
                  PDF & CSV Excel
                </span>
              </div>
              <p className="text-xs text-[#A1A1AA] mt-0.5">
                Baixe o relatório executivo completo com a matriz de rentabilidade, CMV e recomendações estratégicas.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[#1C1C28] hover:bg-[#2A2A3C] text-[#71717A] hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format Selector Bar */}
        <div className="p-3 sm:p-4 bg-[#181824] border-b border-[#222232] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 bg-[#0E0E14] p-1 rounded-xl border border-[#242436]">
            <button
              onClick={() => setExportFormat('pdf_preview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                exportFormat === 'pdf_preview'
                  ? 'bg-[#FFE600] text-black shadow-md'
                  : 'text-[#A1A1AA] hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Relatório Executivo (PDF / Impressão)</span>
            </button>

            <button
              onClick={() => setExportFormat('csv')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                exportFormat === 'csv'
                  ? 'bg-[#00D26A] text-black shadow-md'
                  : 'text-[#A1A1AA] hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Planilha CSV (Excel)</span>
            </button>

            <button
              onClick={() => setExportFormat('clipboard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                exportFormat === 'clipboard'
                  ? 'bg-[#77D4E1] text-black shadow-md'
                  : 'text-[#A1A1AA] hover:text-white'
              }`}
            >
              <Copy className="w-4 h-4" />
              <span>Copiar Tabela</span>
            </button>

            {onOpenCatalogoPdf && (
              <button
                onClick={() => {
                  onClose();
                  onOpenCatalogoPdf();
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all bg-[#DA291C]/20 hover:bg-[#DA291C]/40 text-[#FFC72C] border border-[#DA291C]/40 cursor-pointer shadow-sm ml-1"
                title="Abrir Cardápio & Catálogo Visual em PDF com fotos e QR Code"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#FFC72C]" />
                <span>Catálogo com QR Code</span>
              </button>
            )}
          </div>

          {/* Scope Selector */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-[#71717A] uppercase">Escopo:</span>
            <select
              value={exportScope}
              onChange={(e) => setExportScope(e.target.value as any)}
              className="bg-[#14141E] border border-[#2D2D42] text-xs text-white rounded-xl px-3 py-1.5 focus:border-[#FFE600] focus:outline-none"
            >
              <option value="all">Todos os Pratos ({products.length} itens)</option>
              <option value="high_margin">Somente Alta Rentabilidade (Estrelas + Quebra-Cab.)</option>
              <option value="action_needed">Itens que Exigem Ação (Cavalos + Quebra-Cab. + Cães)</option>
            </select>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

          {/* SUCCESS NOTIFICATIONS */}
          {downloadSuccess && (
            <div className="p-3.5 bg-[#00D26A]/10 border border-[#00D26A]/40 rounded-2xl flex items-center gap-3 text-xs text-[#00D26A] font-extrabold animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>Download concluído com sucesso! O arquivo CSV formatado para Excel foi salvo em seu computador.</span>
            </div>
          )}

          {copiedSuccess && (
            <div className="p-3.5 bg-[#77D4E1]/10 border border-[#77D4E1]/40 rounded-2xl flex items-center gap-3 text-xs text-[#77D4E1] font-extrabold animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>Tabela copiada para a área de transferência! Cole no Microsoft Excel ou Google Planilhas usando Ctrl + V.</span>
            </div>
          )}

          {/* TAB 1: PDF REPORT PREVIEW (DOCUMENT VIEW) */}
          {exportFormat === 'pdf_preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-[#181824] p-3 rounded-2xl border border-[#242436]">
                <div className="flex items-center gap-2 text-xs text-[#D4D4D8]">
                  <Printer className="w-4 h-4 text-[#FFE600]" />
                  <span>
                    Dica: Ao clicar em <strong>"Imprimir / Salvar PDF"</strong>, selecione <em>"Salvar como PDF"</em> no destino da impressora para gerar o arquivo digital.
                  </span>
                </div>
                <button
                  onClick={handlePrintPDF}
                  className="px-4 py-2 bg-gradient-to-r from-[#E31837] to-[#FF7A00] hover:brightness-110 text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition-all shrink-0"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir / Salvar PDF</span>
                </button>
              </div>

              {/* Printable Document Canvas (Styled as an Executive A4 Page) */}
              <div id="printable-menu-engineering-report" className="bg-[#0C0C12] border border-[#262638] rounded-3xl p-6 sm:p-8 space-y-6 text-white shadow-2xl">
                
                {/* Header do Relatório */}
                <div className="border-b border-[#242436] pb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-[#FFE600] font-black text-xs uppercase tracking-wider">
                      <Sparkles className="w-4 h-4" />
                      <span>{tenantName}</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                      Relatório Executivo de Engenharia de Cardápio
                    </h2>
                    <p className="text-xs text-[#A1A1AA] mt-0.5">
                      Diagnóstico de Rentabilidade vs. Popularidade • Matriz Kasavana & Smith / BCG
                    </p>
                  </div>

                  <div className="text-left sm:text-right text-xs text-[#71717A] space-y-0.5">
                    <div className="flex items-center sm:justify-end gap-1.5 font-bold text-white">
                      <Calendar className="w-3.5 h-3.5 text-[#FFE600]" />
                      <span>{new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div>Período: Últimos 30 Dias Consolidados</div>
                    <div className="text-[10px] text-[#00D26A] font-bold">Status: Atualizado em Tempo Real</div>
                  </div>
                </div>

                {/* Resumo de Indicadores Globais */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#14141E] p-4 rounded-2xl border border-[#222232]">
                  <div>
                    <span className="text-[10px] text-[#71717A] uppercase font-bold">Faturamento Total</span>
                    <div className="text-base font-black text-white">{formatBRL(benchmarks.totalRevenue)}</div>
                    <span className="text-[10px] text-[#A1A1AA]">{products.length} pratos analisados</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-[#71717A] uppercase font-bold">Lucro Bruto Total</span>
                    <div className="text-base font-black text-[#00D26A]">{formatBRL(benchmarks.totalProfit)}</div>
                    <span className="text-[10px] text-[#00D26A] font-bold">Margem: {benchmarks.avgMarginPercent}%</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-[#71717A] uppercase font-bold">Margem Média Unitária</span>
                    <div className="text-base font-black text-[#FFE600]">{formatBRL(benchmarks.avgMarginReais)}</div>
                    <span className="text-[10px] text-[#71717A]">Linha de corte rentab.</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-[#71717A] uppercase font-bold">Volume Médio / Prato</span>
                    <div className="text-base font-black text-[#77D4E1]">{benchmarks.avgVolume} un</div>
                    <span className="text-[10px] text-[#71717A]">Linha de corte popular.</span>
                  </div>
                </div>

                {/* Distribuição dos Quadrantes */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-2xl bg-[#FFE600]/10 border border-[#FFE600]/30 space-y-1">
                    <span className="text-xs font-black text-[#FFE600]">⭐ Estrelas ({starsCount})</span>
                    <p className="text-[10px] text-[#D4D4D8] leading-tight">Alta Margem • Alto Volume ({Math.round((starsCount / (products.length || 1)) * 100)}% do mix)</p>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#00D26A]/10 border border-[#00D26A]/30 space-y-1">
                    <span className="text-xs font-black text-[#00D26A]">🐎 Cavalos ({horsesCount})</span>
                    <p className="text-[10px] text-[#D4D4D8] leading-tight">Baixa Margem • Alto Volume ({Math.round((horsesCount / (products.length || 1)) * 100)}% do mix)</p>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#77D4E1]/10 border border-[#77D4E1]/30 space-y-1">
                    <span className="text-xs font-black text-[#77D4E1]">❓ Quebra-Cab. ({puzzlesCount})</span>
                    <p className="text-[10px] text-[#D4D4D8] leading-tight">Alta Margem • Baixo Volume ({Math.round((puzzlesCount / (products.length || 1)) * 100)}% do mix)</p>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#FF2B4E]/10 border border-[#FF2B4E]/30 space-y-1">
                    <span className="text-xs font-black text-[#FF2B4E]">🐶 Cães ({dogsCount})</span>
                    <p className="text-[10px] text-[#D4D4D8] leading-tight">Baixa Margem • Baixo Volume ({Math.round((dogsCount / (products.length || 1)) * 100)}% do mix)</p>
                  </div>
                </div>

                {/* Tabela Formatada de Todos os Itens */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                      <BarChart3 className="w-4 h-4 text-[#FFE600]" />
                      Detalhamento Financeiro dos Itens ({filteredExportItems.length})
                    </h4>
                    <span className="text-[10px] text-[#71717A]">Valores calculados com base nas fichas técnicas ativas</span>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-[#222232]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#181824] border-b border-[#28283C] text-[10px] font-black uppercase text-[#71717A]">
                          <th className="p-3">Prato</th>
                          <th className="p-3">Classificação</th>
                          <th className="p-3 text-right">Preço</th>
                          <th className="p-3 text-right">Custo (CMV)</th>
                          <th className="p-3 text-right">Margem R$ (%)</th>
                          <th className="p-3 text-right">Volume</th>
                          <th className="p-3 text-right">Faturamento</th>
                          <th className="p-3 text-right">Lucro Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1E1E2C] text-white">
                        {filteredExportItems.map((item, idx) => {
                          const q = getQuadrantInfo(item.bcgClassification);
                          return (
                            <tr key={item.id} className={idx % 2 === 0 ? 'bg-[#0E0E14]' : 'bg-[#12121A]'}>
                              <td className="p-3 font-bold text-white max-w-[200px] truncate">
                                {item.name}
                              </td>
                              <td className="p-3">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${q.colorBg} ${q.colorText}`}>
                                  {q.badge}
                                </span>
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-[#00D26A]">
                                {formatBRL(item.price)}
                              </td>
                              <td className="p-3 text-right font-mono text-[#D4D4D8]">
                                {formatBRL(item.costPrice)} <span className="text-[10px] text-[#71717A]">({formatPercent(item.cmvPercent)})</span>
                              </td>
                              <td className="p-3 text-right font-mono font-black text-[#FFE600]">
                                {formatBRL(item.marginReais)} <span className="text-[10px] text-[#A1A1AA]">({formatPercent(item.marginPercent)})</span>
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-[#77D4E1]">
                                {item.salesVolume} un
                              </td>
                              <td className="p-3 text-right font-mono text-white">
                                {formatBRL(item.revenue)}
                              </td>
                              <td className="p-3 text-right font-mono font-black text-[#00D26A]">
                                {formatBRL(item.profit)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Plano de Ação Estratégico Resumido */}
                <div className="bg-[#14141E] p-4 rounded-2xl border border-[#242436] space-y-3">
                  <h4 className="text-xs font-black uppercase text-[#FFE600] flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    Plano de Ação e Recomendações Estratégicas para o Gestor
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#D4D4D8]">
                    <div className="space-y-1">
                      <strong className="text-[#FFE600] block">1. Proteger os Pratos Estrelas:</strong>
                      <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
                        Manter o padrão de preparo estrito. Nunca reduzir o tamanho das porções ou substituir insumos críticos para não perder a fidelização do cliente.
                      </p>
                    </div>
                    <div className="space-y-1">
                      <strong className="text-[#00D26A] block">2. Monetizar os Cavalos de Batalha:</strong>
                      <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
                        Aumentar o preço em +R$ 1,00 a R$ 3,00 de forma gradual ou criar versões "Especiais/Turbinadas" com margem maior para migrá-los para Estrelas.
                      </p>
                    </div>
                    <div className="space-y-1">
                      <strong className="text-[#77D4E1] block">3. Promover os Quebra-Cabeças:</strong>
                      <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
                        Reposicionar no cardápio visual, criar fotos atraentes de alta qualidade, incluir em combos com bebidas e comissionar os atendentes para sugerir na mesa.
                      </p>
                    </div>
                    <div className="space-y-1">
                      <strong className="text-[#FF2B4E] block">4. Eliminar ou Repaginar os Cães:</strong>
                      <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
                        Avaliar se ocupam insumos que geram desperdício no estoque. Substituir por lançamentos sazonais ou reformular a receita para cortar custos de CMV.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Assinatura do Relatório */}
                <div className="pt-3 border-t border-[#222232] flex flex-col sm:flex-row items-start sm:items-center justify-between text-[10px] text-[#71717A] gap-2">
                  <span>Relatório gerado automaticamente pelo módulo de Inteligência & Engenharia de Cardápio Neon Food OS.</span>
                  <span>Documento oficial para tomada de decisões operacionais e financeiras.</span>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: CSV EXCEL EXPORT DETAILS */}
          {exportFormat === 'csv' && (
            <div className="space-y-4">
              <div className="bg-[#161622] p-5 rounded-3xl border border-[#242436] space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#00D26A]/20 text-[#00D26A] flex items-center justify-center border border-[#00D26A]/40">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-white">Planilha Formatada para Excel / Google Sheets</h4>
                    <p className="text-xs text-[#A1A1AA]">
                      Exportação em arquivo <code className="text-[#FFE600]">.csv</code> com codificação UTF-8 BOM e delimitador ponto-e-vírgula (;) para abertura instantânea sem erros de caracteres.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-3 bg-[#0F0F16] rounded-2xl border border-[#222232]">
                    <span className="text-[10px] font-bold uppercase text-[#71717A] block">Linhas de Dados</span>
                    <span className="text-lg font-black text-white">{filteredExportItems.length} pratos</span>
                  </div>
                  <div className="p-3 bg-[#0F0F16] rounded-2xl border border-[#222232]">
                    <span className="text-[10px] font-bold uppercase text-[#71717A] block">Colunas Calculadas</span>
                    <span className="text-lg font-black text-[#00D26A]">13 métricas financeiras</span>
                  </div>
                  <div className="p-3 bg-[#0F0F16] rounded-2xl border border-[#222232]">
                    <span className="text-[10px] font-bold uppercase text-[#71717A] block">Compatibilidade</span>
                    <span className="text-lg font-black text-[#FFE600]">Excel, Sheets, Power BI</span>
                  </div>
                </div>

                <div className="p-4 bg-[#0A0A0E] rounded-2xl border border-[#20202C] space-y-2 text-xs text-[#A1A1AA]">
                  <strong className="text-white block font-bold">Colunas incluídas na planilha:</strong>
                  <p className="text-[11px] leading-relaxed">
                    ID do Produto, Nome do Prato, Categoria, Classificação Matriz Kasavana & Smith (Estrela, Cavalo, Quebra-Cabeça, Cão), Preço de Venda (R$), Custo CMV (R$), CMV (%), Margem Unitária (R$), Margem Bruta (%), Volume Mensal (un), Faturamento Total (R$), Lucro Bruto Total (R$) e Recomendação Estratégica Individual.
                  </p>
                </div>

                <button
                  onClick={handleExportCSV}
                  className="w-full py-4 bg-[#00D26A] hover:bg-[#00E575] text-black font-black text-sm rounded-2xl shadow-xl flex items-center justify-center gap-2.5 transition-all cursor-pointer"
                >
                  <Download className="w-5 h-5" />
                  <span>BAIXAR PLANILHA CSV AGORA ({filteredExportItems.length} ITENS)</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: CLIPBOARD COPY DETAILS */}
          {exportFormat === 'clipboard' && (
            <div className="space-y-4">
              <div className="bg-[#161622] p-5 rounded-3xl border border-[#242436] space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#77D4E1]/20 text-[#77D4E1] flex items-center justify-center border border-[#77D4E1]/40">
                    <Copy className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-white">Copiar Direto para o Excel (Ctrl + V)</h4>
                    <p className="text-xs text-[#A1A1AA]">
                      Copia toda a matriz tabulada diretamente para a área de transferência do seu computador para colagem imediata em qualquer planilha.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-[#0A0A0E] rounded-2xl border border-[#20202C] text-xs text-[#A1A1AA] space-y-2">
                  <p>
                    Basta clicar no botão abaixo, abrir uma planilha em branco no <strong>Excel</strong> ou <strong>Google Sheets</strong> e pressionar <strong>Ctrl + V</strong>. Todas as colunas se encaixarão perfeitamente.
                  </p>
                </div>

                <button
                  onClick={handleCopyToClipboard}
                  className="w-full py-4 bg-[#77D4E1] hover:bg-[#8AE5F2] text-black font-black text-sm rounded-2xl shadow-xl flex items-center justify-center gap-2.5 transition-all cursor-pointer"
                >
                  <Copy className="w-5 h-5" />
                  <span>COPIAR TABELA TABULADA PARA A ÁREA DE TRANSFERÊNCIA</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#14141E] border-t border-[#20202E] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-[#71717A]">
            <Sparkles className="w-4 h-4 text-[#FFE600]" />
            <span>Engenharia de Cardápio • Neon Food OS</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleExportCSV}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-[#1C1C28] hover:bg-[#28283C] text-[#00D26A] border border-[#00D26A]/40 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Baixar CSV</span>
            </button>

            <button
              onClick={handlePrintPDF}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-[#FFE600] hover:bg-[#FFF04D] text-black font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / PDF</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
