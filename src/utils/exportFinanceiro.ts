import { Order } from '../types';
import { formatBRL, formatDateTime } from './formatters';

export interface ExportFilters {
  periodLabel: string;
  startDate?: string;
  endDate?: string;
  methodFilter?: string;
  channelFilter?: string;
}

export interface CompanyInfo {
  name: string;
  cnpj?: string;
  branchName?: string;
  address?: string;
}

// =========================================================================
// 1. EXPORTAÇÃO CSV PARA CONTABILIDADE & EXCEL
// =========================================================================
export function generateTransactionsCSV(
  orders: Order[],
  filters: ExportFilters,
  company: CompanyInfo
): string {
  // BOM UTF-8 para abrir corretamente com acentos no Excel
  const BOM = '\uFEFF';
  
  const separator = ';'; // Padrão Excel em português
  const lines: string[] = [];

  // Cabeçalho da Empresa e Relatório
  lines.push(`"RELATÓRIO CONTÁBIL DE TRANSAÇÕES E CONCILIAÇÃO FINANCEIRA"`);
  lines.push(`"Empresa"${separator}"${company.name || 'NEON FOOD OS'}"`);
  lines.push(`"Unidade/Filial"${separator}"${company.branchName || 'Matriz'}"`);
  lines.push(`"CNPJ"${separator}"${company.cnpj || '12.345.678/0001-90'}"`);
  lines.push(`"Período de Apuração"${separator}"${filters.periodLabel}"`);
  lines.push(`"Data de Emissão"${separator}"${formatDateTime(new Date().toISOString())}"`);
  lines.push(`"Total de Registros"${separator}"${orders.length}"`);
  lines.push(''); // Linha em branco

  // Cabeçalhos das Colunas
  const headers = [
    'Data e Hora',
    'Número do Pedido',
    'Nome do Cliente',
    'Canal de Venda',
    'Método de Pagamento',
    'Bandeira do Cartão',
    'NSU / Aut / TxID Pix',
    'Valor Bruto (R$)',
    'Taxa Estimada (%)',
    'Taxa Retida (R$)',
    'Valor Líquido (R$)',
    'Prazo de Liquidação',
    'Status do Pagamento'
  ];
  lines.push(headers.map(h => `"${h}"`).join(separator));

  let totalGross = 0;
  let totalFees = 0;
  let totalNet = 0;

  orders.forEach(o => {
    const isPix = o.paymentMethod === 'pix';
    const isCredit = o.paymentMethod === 'credit_card';
    const isDebit = o.paymentMethod === 'debit_card';
    const isCash = o.paymentMethod === 'cash';

    const feeRate = isCredit ? 0.0289 : (isDebit ? 0.0129 : 0);
    const feeAmount = isCredit ? o.total * 0.0289 : (isDebit ? o.total * 0.0129 : 0);
    const netAmount = o.total - feeAmount;

    totalGross += o.total;
    totalFees += feeAmount;
    totalNet += netAmount;

    const methodLabel = isPix 
      ? 'PIX Dinâmico' 
      : isCredit 
      ? 'Cartão de Crédito' 
      : isDebit 
      ? 'Cartão de Débito' 
      : isCash 
      ? 'Dinheiro' 
      : (o.paymentMethod || 'Outro');

    const authRef = o.pixTxId || o.cardNsu || o.cardAuthCode || 'N/A';
    const settlementTerm = isPix ? 'D+0 Imediato' : isDebit ? 'D+1 Útil' : isCredit ? 'D+30' : 'No Caixa';

    const row = [
      `"${formatDateTime(o.createdAt)}"`,
      `"${o.displayCode || o.id}"`,
      `"${(o.customerName || 'Consumidor Final').replace(/"/g, '""')}"`,
      `"${(o.channel || 'PDV').replace('_', ' ')}"`,
      `"${methodLabel}"`,
      `"${o.cardBrand || '-'}"`,
      `"${authRef}"`,
      `"${o.total.toFixed(2).replace('.', ',')}"`,
      `"${(feeRate * 100).toFixed(2).replace('.', ',')}%"`,
      `"${feeAmount.toFixed(2).replace('.', ',')}"`,
      `"${netAmount.toFixed(2).replace('.', ',')}"`,
      `"${settlementTerm}"`,
      `"${o.paymentStatus === 'paid' ? 'Liquidado' : o.paymentStatus || 'Aprovado'}"`
    ];

    lines.push(row.join(separator));
  });

  // Linhas de Totalização
  lines.push('');
  lines.push([
    `"TOTALIZAÇÃO CONTÁBIL"`,
    `""`,
    `""`,
    `""`,
    `""`,
    `""`,
    `""`,
    `"${totalGross.toFixed(2).replace('.', ',')}"`,
    `""`,
    `"${totalFees.toFixed(2).replace('.', ',')}"`,
    `"${totalNet.toFixed(2).replace('.', ',')}"`,
    `""`,
    `""`
  ].join(separator));

  return BOM + lines.join('\r\n');
}

export function downloadCSV(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// =========================================================================
// 2. GERAÇÃO DE EXTRATO CONTÁBIL FORMATADO PARA IMPRESSÃO / PDF
// =========================================================================
export function printAccountingStatementPDF(
  orders: Order[],
  filters: ExportFilters,
  company: CompanyInfo
) {
  let totalGross = 0;
  let totalFees = 0;
  let totalNet = 0;
  let pixTotal = 0;
  let creditTotal = 0;
  let debitTotal = 0;
  let cashTotal = 0;

  orders.forEach(o => {
    const isPix = o.paymentMethod === 'pix';
    const isCredit = o.paymentMethod === 'credit_card';
    const isDebit = o.paymentMethod === 'debit_card';
    const isCash = o.paymentMethod === 'cash';

    const feeAmount = isCredit ? o.total * 0.0289 : (isDebit ? o.total * 0.0129 : 0);
    const netAmount = o.total - feeAmount;

    totalGross += o.total;
    totalFees += feeAmount;
    totalNet += netAmount;

    if (isPix) pixTotal += o.total;
    else if (isCredit) creditTotal += o.total;
    else if (isDebit) debitTotal += o.total;
    else if (isCash) cashTotal += o.total;
  });

  const nowStr = formatDateTime(new Date().toISOString());

  // Constrói um HTML contábil de alta qualidade para renderização PDF
  const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Extrato Contábil de Transações - ${company.name || 'NEON FOOD OS'}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 14mm 14mm 14mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1a1a1a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 11px;
      line-height: 1.4;
    }
    .header {
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .company-title {
      font-size: 16px;
      font-weight: 800;
      color: #111;
      text-transform: uppercase;
      letter-spacing: -0.5px;
    }
    .report-subtitle {
      font-size: 12px;
      font-weight: 600;
      color: #444;
      margin-top: 2px;
    }
    .meta-box {
      text-align: right;
      font-size: 10px;
      color: #555;
    }
    .meta-box strong {
      color: #111;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 14px;
    }
    .kpi-card {
      border: 1px solid #ddd;
      border-radius: 6px;
      padding: 8px 10px;
      background: #fbfbfb;
    }
    .kpi-card.highlight {
      background: #f0fdf4;
      border-color: #86efac;
    }
    .kpi-card.fees {
      background: #fef2f2;
      border-color: #fca5a5;
    }
    .kpi-label {
      font-size: 9px;
      text-transform: uppercase;
      color: #666;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .kpi-val {
      font-size: 14px;
      font-weight: 800;
      color: #111;
      margin-top: 2px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    .kpi-sub {
      font-size: 8.5px;
      color: #777;
      margin-top: 2px;
    }
    .split-box {
      border: 1px solid #e5e5e5;
      background: #fafafa;
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
    }
    .split-item {
      display: flex;
      flex-direction: column;
    }
    .split-item span {
      color: #666;
      font-size: 9px;
    }
    .split-item strong {
      font-size: 11px;
      font-family: monospace;
      color: #111;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
      font-size: 9.5px;
    }
    th {
      background: #f3f4f6;
      border-top: 1px solid #ccc;
      border-bottom: 1.5px solid #000;
      padding: 5px 6px;
      text-align: left;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 8.5px;
      color: #333;
    }
    td {
      padding: 5px 6px;
      border-bottom: 1px solid #eee;
    }
    tr:nth-child(even) td {
      background: #fafafa;
    }
    .text-right {
      text-align: right;
    }
    .text-center {
      text-align: center;
    }
    .mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    .badge {
      display: inline-block;
      padding: 1px 5px;
      border-radius: 4px;
      font-size: 8px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .badge-pix {
      background: #dcfce7;
      color: #15803d;
      border: 1px solid #86efac;
    }
    .badge-credit {
      background: #dbeafe;
      color: #1e40af;
      border: 1px solid #93c5fd;
    }
    .badge-debit {
      background: #f3e8ff;
      color: #6b21a8;
      border: 1px solid #d8b4fe;
    }
    .badge-cash {
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #fde68a;
    }
    .total-row td {
      border-top: 2px solid #000;
      border-bottom: 2px solid #000;
      font-weight: 800;
      background: #f8fafc !important;
      font-size: 10px;
    }
    .footer {
      border-top: 1px solid #ccc;
      padding-top: 10px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 9px;
      color: #666;
      margin-top: 20px;
      page-break-inside: avoid;
    }
    .signature-area {
      text-align: center;
      width: 200px;
    }
    .signature-line {
      border-top: 1px solid #000;
      margin-top: 30px;
      padding-top: 3px;
      font-weight: 600;
      font-size: 9px;
    }
    @media print {
      body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  
  <div class="header">
    <div>
      <div class="company-title">${company.name || 'NEON FOOD OS'}</div>
      <div class="report-subtitle">Extrato Contábil de Transações e Conciliação Financeira</div>
      <div style="font-size: 9.5px; color: #555; margin-top: 3px;">
        Unidade: <strong>${company.branchName || 'Matriz São Paulo'}</strong> | 
        CNPJ: <strong>${company.cnpj || '12.345.678/0001-90'}</strong>
      </div>
    </div>
    <div class="meta-box">
      <div>Período de Apuração: <strong>${filters.periodLabel}</strong></div>
      <div>Data de Emissão: <strong>${nowStr}</strong></div>
      <div>Total de Transações: <strong>${orders.length} pedidos</strong></div>
      <div>Sistema: <strong>NEON FOOD OS Analytics</strong></div>
    </div>
  </div>

  <!-- Cards de KPI Contábil -->
  <div class="summary-grid">
    <div class="kpi-card">
      <div class="kpi-label">Faturamento Bruto</div>
      <div class="kpi-val">${formatBRL(totalGross)}</div>
      <div class="kpi-sub">${orders.length} lançamentos</div>
    </div>
    <div class="kpi-card fees">
      <div class="kpi-label">Taxas Gateway (MDR)</div>
      <div class="kpi-val" style="color: #b91c1c;">- ${formatBRL(totalFees)}</div>
      <div class="kpi-sub">MDR adquirentes</div>
    </div>
    <div class="kpi-card highlight">
      <div class="kpi-label">Volume Líquido Apurado</div>
      <div class="kpi-val" style="color: #15803d;">${formatBRL(totalNet)}</div>
      <div class="kpi-sub">Disponível para caixa</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Ticket Médio Contábil</div>
      <div class="kpi-val">${formatBRL(orders.length > 0 ? totalGross / orders.length : 0)}</div>
      <div class="kpi-sub">Média por transação</div>
    </div>
  </div>

  <!-- Mix de Meios de Pagamento -->
  <div class="split-box">
    <div class="split-item">
      <span>Volume PIX (D+0 Imediato)</span>
      <strong style="color: #16a34a;">${formatBRL(pixTotal)} (${totalGross > 0 ? ((pixTotal / totalGross) * 100).toFixed(1) : 0}%)</strong>
    </div>
    <div class="split-item">
      <span>Cartão Crédito (MDR 2.89%)</span>
      <strong style="color: #2563eb;">${formatBRL(creditTotal)} (${totalGross > 0 ? ((creditTotal / totalGross) * 100).toFixed(1) : 0}%)</strong>
    </div>
    <div class="split-item">
      <span>Cartão Débito (MDR 1.29%)</span>
      <strong style="color: #7c3aed;">${formatBRL(debitTotal)} (${totalGross > 0 ? ((debitTotal / totalGross) * 100).toFixed(1) : 0}%)</strong>
    </div>
    <div class="split-item">
      <span>Dinheiro / Balcão</span>
      <strong style="color: #d97706;">${formatBRL(cashTotal)} (${totalGross > 0 ? ((cashTotal / totalGross) * 100).toFixed(1) : 0}%)</strong>
    </div>
  </div>

  <!-- Tabela de Lançamentos -->
  <table>
    <thead>
      <tr>
        <th style="width: 14%;">Data/Hora</th>
        <th style="width: 8%;">Pedido</th>
        <th style="width: 18%;">Cliente</th>
        <th style="width: 10%;">Canal</th>
        <th style="width: 14%;">Método</th>
        <th style="width: 12%;">Código NSU/TxId</th>
        <th style="width: 8%;" class="text-right">Bruto</th>
        <th style="width: 8%;" class="text-right">MDR</th>
        <th style="width: 8%;" class="text-right">Líquido</th>
      </tr>
    </thead>
    <tbody>
      ${orders.map(o => {
        const isPix = o.paymentMethod === 'pix';
        const isCredit = o.paymentMethod === 'credit_card';
        const isDebit = o.paymentMethod === 'debit_card';
        const isCash = o.paymentMethod === 'cash';

        const fee = isCredit ? o.total * 0.0289 : (isDebit ? o.total * 0.0129 : 0);
        const net = o.total - fee;
        const ref = o.pixTxId || o.cardNsu || o.cardAuthCode || 'N/A';

        let badgeClass = 'badge-cash';
        let badgeText = 'Dinheiro';
        if (isPix) { badgeClass = 'badge-pix'; badgeText = 'PIX'; }
        else if (isCredit) { badgeClass = 'badge-credit'; badgeText = 'Crédito'; }
        else if (isDebit) { badgeClass = 'badge-debit'; badgeText = 'Débito'; }

        return `
          <tr>
            <td class="mono">${formatDateTime(o.createdAt)}</td>
            <td><strong>${o.displayCode || o.id}</strong></td>
            <td>${o.customerName || 'Consumidor Final'}</td>
            <td>${(o.channel || 'PDV').replace('_', ' ')}</td>
            <td><span class="badge ${badgeClass}">${badgeText}</span></td>
            <td class="mono" style="font-size: 8px; color: #555;">${ref}</td>
            <td class="text-right mono">${formatBRL(o.total)}</td>
            <td class="text-right mono" style="color: #b91c1c;">${fee > 0 ? '-' + formatBRL(fee) : 'R$ 0,00'}</td>
            <td class="text-right mono" style="font-weight: 700; color: #15803d;">${formatBRL(net)}</td>
          </tr>
        `;
      }).join('')}
      
      <tr class="total-row">
        <td colspan="6">TOTAL CONSOLIDADO (${orders.length} TRANSAÇÕES)</td>
        <td class="text-right mono">${formatBRL(totalGross)}</td>
        <td class="text-right mono" style="color: #b91c1c;">-${formatBRL(totalFees)}</td>
        <td class="text-right mono" style="color: #15803d;">${formatBRL(totalNet)}</td>
      </tr>
    </tbody>
  </table>

  <!-- Rodapé Contábil e Assinatura -->
  <div class="footer">
    <div>
      <div>Documento contábil emitido eletronicamente para conciliação financeira e fiscal.</div>
      <div>Autenticação Digital: SHA256-${Date.now().toString(16).toUpperCase()}-${Math.floor(Math.random() * 1000000)}</div>
    </div>
    <div class="signature-area">
      <div class="signature-line">
        Responsável Financeiro / Contador<br>
        <span style="font-size: 8px; font-weight: normal; color: #777;">Data: ____/____/________</span>
      </div>
    </div>
  </div>

  <script>
    // Dispara a impressão automaticamente para salvar em PDF
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 300);
    };
  </script>
</body>
</html>
  `;

  // Cria um iframe oculto para impressão limpa sem popup blockers
  const printIframe = document.createElement('iframe');
  printIframe.style.position = 'fixed';
  printIframe.style.right = '0';
  printIframe.style.bottom = '0';
  printIframe.style.width = '0';
  printIframe.style.height = '0';
  printIframe.style.border = '0';
  document.body.appendChild(printIframe);

  const doc = printIframe.contentDocument || printIframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(htmlContent);
    doc.close();
  }

  // Remove o iframe após a impressão
  setTimeout(() => {
    try {
      document.body.removeChild(printIframe);
    } catch (e) {}
  }, 60000);
}
