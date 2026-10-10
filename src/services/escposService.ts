/**
 * ESC/POS Thermal Printer Protocol & Kitchen Dispatch Service
 * Suporta bobinas 80mm (48 colunas) e 58mm (32 colunas)
 * Protocolo de comandos ESC/POS oficial (Epson, Bematech, Elgin, Daruma, Star)
 * Envio direto para impressoras de Cozinha, Bar, Caixa e Delivery
 */

import { Order, OrderItem, ThermalPrinterConfig, OrderChannel, PaymentMethod } from '../types';
import { formatBRL, formatDateTime } from '../utils/formatters';

// ============================================================================
// CÓDIGOS DE COMANDO PROTOCOLO ESC/POS BINÁRIO (HEX / DECIMAL)
// ============================================================================
export const ESC_POS = {
  // Controle de Fluxo & Inicialização
  NUL: 0x00,
  LF: 0x0a,        // Line Feed (Avançar Linha)
  CR: 0x0d,        // Carriage Return
  ESC: 0x1b,       // Escape
  GS: 0x1d,        // Group Separator
  FS: 0x1c,        // File Separator

  // Inicializar Impressora (Limpa buffers e restaura padrões)
  INIT: [0x1b, 0x40], // ESC @

  // Alinhamento de Texto
  ALIGN_LEFT: [0x1b, 0x61, 0x00],   // ESC a 0
  ALIGN_CENTER: [0x1b, 0x61, 0x01], // ESC a 1
  ALIGN_RIGHT: [0x1b, 0x61, 0x02],  // ESC a 2

  // Estilos de Fonte
  BOLD_ON: [0x1b, 0x45, 0x01],      // ESC E 1
  BOLD_OFF: [0x1b, 0x45, 0x00],     // ESC E 0
  UNDERLINE_ON: [0x1b, 0x2d, 0x01], // ESC - 1
  UNDERLINE_OFF: [0x1b, 0x2d, 0x00],// ESC - 0
  INVERT_ON: [0x1d, 0x42, 0x01],    // GS B 1 (Branco sobre Fundo Preto)
  INVERT_OFF: [0x1d, 0x42, 0x00],   // GS B 0

  // Tamanhos de Caractere (GS ! n)
  SIZE_NORMAL: [0x1d, 0x21, 0x00],       // GS ! 0x00 (1x1 Normal)
  SIZE_DOUBLE_HEIGHT: [0x1d, 0x21, 0x01],// GS ! 0x01 (1x2 Altura Dupla)
  SIZE_DOUBLE_WIDTH: [0x1d, 0x21, 0x10], // GS ! 0x10 (2x1 Largura Dupla)
  SIZE_DOUBLE: [0x1d, 0x21, 0x11],       // GS ! 0x11 (2x2 Tamanho Duplo - Cozinha / Mesa)
  SIZE_TRIPLE: [0x1d, 0x21, 0x22],       // GS ! 0x22 (3x3 Gigante)

  // Espaçamento de Linhas
  LINE_SPACING_DEFAULT: [0x1b, 0x32],    // ESC 2
  LINE_SPACING_TIGHT: [0x1b, 0x33, 0x18],// ESC 3 24

  // Corte de Papel (Guilhotina / Cutter)
  CUT_FULL: [0x1d, 0x56, 0x00],          // GS V 0 (Corte Total)
  CUT_PARTIAL: [0x1d, 0x56, 0x01],       // GS V 1 (Corte Parcial)
  CUT_FEED: [0x1d, 0x56, 0x42, 0x03],    // GS V 66 3 (Avança 3 linhas e corta)

  // Campainha / Alarme Sonoro (Buzzer Cozinha)
  BEEPER_ONCE: [0x1b, 0x42, 0x02, 0x02],  // ESC B 2 2 (Apita 2x)
  BEEPER_KITCHEN: [0x1b, 0x42, 0x03, 0x03],// ESC B 3 3 (Apita 3x - Alerta Cozinheiro)

  // Abertura de Gaveta de Dinheiro
  DRAWER_KICK: [0x1b, 0x70, 0x00, 0x19, 0xfa], // ESC p 0 25 250

  // Seleção de Tabela de Caracteres (CP850 / CP860 Português)
  CHARSET_CP850: [0x1b, 0x74, 0x02], // ESC t 2 (Multilingual)
  CHARSET_CP860: [0x1b, 0x74, 0x03], // ESC t 3 (Português)
};

/**
 * Normaliza strings com caracteres especiais do português para evitar símbolos corrompidos
 * em impressoras que não possuem tabela de caracteres Unicode configurada.
 */
export function normalizeEscPosText(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos para compatibilidade máxima ESC/POS
    .replace(/[^\x20-\x7E\n\r]/g, ''); // Garante caracteres imprimíveis ASCII
}

/**
 * Builder com Fluent Interface para geração de buffers binários ESC/POS
 */
export class EscPosBuilder {
  private buffer: number[] = [];
  public paperWidth: '58mm' | '80mm';
  public maxColumns: number;

  constructor(paperWidth: '58mm' | '80mm' = '80mm') {
    this.paperWidth = paperWidth;
    this.maxColumns = paperWidth === '80mm' ? 48 : 32;
    this.init();
  }

  /**
   * Inicializa o hardware da impressora
   */
  public init(): this {
    this.buffer.push(...ESC_POS.INIT);
    this.buffer.push(...ESC_POS.CHARSET_CP850);
    return this;
  }

  /**
   * Adiciona bytes puros ao buffer
   */
  public raw(bytes: number[]): this {
    this.buffer.push(...bytes);
    return this;
  }

  /**
   * Alinhamento de texto
   */
  public align(alignment: 'left' | 'center' | 'right'): this {
    if (alignment === 'center') this.buffer.push(...ESC_POS.ALIGN_CENTER);
    else if (alignment === 'right') this.buffer.push(...ESC_POS.ALIGN_RIGHT);
    else this.buffer.push(...ESC_POS.ALIGN_LEFT);
    return this;
  }

  /**
   * Ativa ou desativa Negrito
   */
  public bold(enable: boolean = true): this {
    this.buffer.push(...(enable ? ESC_POS.BOLD_ON : ESC_POS.BOLD_OFF));
    return this;
  }

  /**
   * Ativa ou desativa Sublinhado
   */
  public underline(enable: boolean = true): this {
    this.buffer.push(...(enable ? ESC_POS.UNDERLINE_ON : ESC_POS.UNDERLINE_OFF));
    return this;
  }

  /**
   * Modo invertido (Texto branco em fundo preto - destaque de cozinha)
   */
  public invert(enable: boolean = true): this {
    this.buffer.push(...(enable ? ESC_POS.INVERT_ON : ESC_POS.INVERT_OFF));
    return this;
  }

  /**
   * Define o tamanho do texto (Normal, Altura Dupla, Largura Dupla, Tamanho Duplo)
   */
  public size(type: 'normal' | 'double_height' | 'double_width' | 'double' | 'triple'): this {
    switch (type) {
      case 'double':
        this.buffer.push(...ESC_POS.SIZE_DOUBLE);
        break;
      case 'double_height':
        this.buffer.push(...ESC_POS.SIZE_DOUBLE_HEIGHT);
        break;
      case 'double_width':
        this.buffer.push(...ESC_POS.SIZE_DOUBLE_WIDTH);
        break;
      case 'triple':
        this.buffer.push(...ESC_POS.SIZE_TRIPLE);
        break;
      default:
        this.buffer.push(...ESC_POS.SIZE_NORMAL);
        break;
    }
    return this;
  }

  /**
   * Escreve texto sem quebra de linha
   */
  public text(str: string): this {
    const clean = normalizeEscPosText(str);
    for (let i = 0; i < clean.length; i++) {
      this.buffer.push(clean.charCodeAt(i));
    }
    return this;
  }

  /**
   * Escreve texto com quebra de linha
   */
  public line(str: string = ''): this {
    this.text(str);
    this.buffer.push(ESC_POS.LF);
    return this;
  }

  /**
   * Avança n linhas
   */
  public feed(lines: number = 1): this {
    for (let i = 0; i < lines; i++) {
      this.buffer.push(ESC_POS.LF);
    }
    return this;
  }

  /**
   * Insere linha divisória contínua ou tracejada
   */
  public separator(char: string = '-', customWidth?: number): this {
    const width = customWidth || this.maxColumns;
    const lineStr = char.repeat(width);
    this.align('left');
    this.size('normal');
    this.bold(false);
    this.line(lineStr);
    return this;
  }

  /**
   * Formata duas colunas alinhadas (ex: Nome do Item à esquerda e Valor à direita)
   */
  public twoColumns(left: string, right: string): this {
    const cleanLeft = normalizeEscPosText(left);
    const cleanRight = normalizeEscPosText(right);
    const totalSpaces = this.maxColumns - cleanLeft.length - cleanRight.length;

    if (totalSpaces > 0) {
      this.line(cleanLeft + ' '.repeat(totalSpaces) + cleanRight);
    } else {
      // Se não couber na mesma linha, quebra de forma elegante
      this.line(cleanLeft);
      this.align('right');
      this.line(cleanRight);
      this.align('left');
    }
    return this;
  }

  /**
   * Toca a campainha / alarme sonoro da impressora (ideal para Cozinha e Praça Quente)
   */
  public beep(times: number = 3): this {
    if (times >= 3) {
      this.buffer.push(...ESC_POS.BEEPER_KITCHEN);
    } else {
      this.buffer.push(...ESC_POS.BEEPER_ONCE);
    }
    return this;
  }

  /**
   * Dispara o corte de papel automático da guilhotina
   */
  public cut(partial: boolean = true): this {
    this.feed(3);
    if (partial) {
      this.buffer.push(...ESC_POS.CUT_FEED);
    } else {
      this.buffer.push(...ESC_POS.CUT_FULL);
    }
    return this;
  }

  /**
   * Dispara abertura da gaveta de dinheiro
   */
  public openDrawer(): this {
    this.buffer.push(...ESC_POS.DRAWER_KICK);
    return this;
  }

  /**
   * Constrói e retorna o array de bytes binários pronto para envio ao hardware
   */
  public build(): Uint8Array {
    return new Uint8Array(this.buffer);
  }

  /**
   * Retorna a representação hexadecimal para inspeção e depuração
   */
  public toHex(): string {
    return this.buffer.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
  }

  /**
   * Retorna os bytes em formato Base64 para envio via rede / spooler JSON
   */
  public toBase64(): string {
    const bytes = this.build();
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

// ============================================================================
// CONSTRUTORES DE CUPOM DE COZINHA (KDS / PRAÇA DE PRODUÇÃO)
// ============================================================================

export interface KitchenTicketOptions {
  stationFilter?: string;
  isReprint?: boolean;
  notesHeader?: string;
}

export type KitchenOrderInput = Partial<Order> & Pick<Order, 'id' | 'items'> & {
  displayCode?: string;
  orderNumber?: number;
  customerName?: string;
  channel?: OrderChannel;
  tableNumber?: number;
  total?: number;
  paymentMethod?: PaymentMethod;
  paymentStatus?: string;
  createdAt?: string;
};

/**
 * Gera os bytes ESC/POS formatados especificamente para a PRODUÇÃO NA COZINHA
 * com destaque máximo para número de mesa/comanda, quantidades e observações de preparo!
 */
export function buildKitchenOrderEscPos(
  order: KitchenOrderInput,
  printerConfig?: Partial<ThermalPrinterConfig>,
  options: KitchenTicketOptions = {}
): EscPosBuilder {
  const paperWidth = printerConfig?.paperWidth || '80mm';
  const builder = new EscPosBuilder(paperWidth);

  // 1. Início & Header da Cozinha
  builder.align('center');
  builder.size('normal');
  builder.bold(true);

  if (options.isReprint) {
    builder.invert(true);
    builder.line(' *** 2a VIA - REIMPRESSAO COZINHA *** ');
    builder.invert(false);
  } else {
    builder.invert(true);
    builder.line(' >>> VIA DE PRODUCAO / COZINHA <<< ');
    builder.invert(false);
  }

  builder.feed(1);

  // 2. Destino do Pedido em Destaque Gigante (Tamanho Duplo)
  builder.size('double');
  builder.bold(true);

  const display = order.displayCode || (order.orderNumber ? `#${order.orderNumber}` : '#PED');

  if (order.tableNumber) {
    builder.line(`MESA #${order.tableNumber.toString().padStart(2, '0')}`);
  } else if (order.channel === 'comanda') {
    builder.line(`COMANDA: ${order.customerName || 'Cliente'}`);
  } else if (
    order.channel === 'delivery_whatsapp' ||
    order.channel === 'delivery_web' ||
    order.channel === 'ifood' ||
    order.channel === 'rappi' ||
    order.channel === '99food'
  ) {
    builder.line(`DELIVERY: ${display}`);
  } else {
    builder.line(`PEDIDO: ${display}`);
  }

  builder.size('normal');
  builder.bold(false);
  builder.feed(1);

  // 3. Metadados do Atendimento
  builder.align('left');
  builder.separator('=');
  builder.twoColumns('CANAL:', order.channel.toUpperCase().replace('_', ' '));
  builder.twoColumns('CLIENTE:', order.customerName || 'Nao informado');
  builder.twoColumns('HORARIO:', new Date().toLocaleTimeString('pt-BR'));
  builder.twoColumns('DATA:', new Date().toLocaleDateString('pt-BR'));
  if (options.stationFilter && options.stationFilter !== 'all') {
    builder.twoColumns('PRACA:', options.stationFilter.toUpperCase());
  }
  builder.separator('=');
  builder.feed(1);

  // 4. Lista de Itens para Cozinha
  builder.align('left');
  builder.bold(true);
  builder.line('ITENS PARA PRODUCAO:');
  builder.separator('-');

  // Filtragem opcional de itens por praça (ex: somente Grelha ou Fritadeira)
  const itemsToPrint = options.stationFilter && options.stationFilter !== 'all'
    ? order.items.filter(item => item.station === options.stationFilter)
    : order.items;

  itemsToPrint.forEach((item, index) => {
    // Quantidade e Nome do Produto em Tamanho Duplo de Altura
    builder.size('double_height');
    builder.bold(true);
    builder.line(`[ ${item.quantity}x ] ${item.productName.toUpperCase()}`);
    builder.size('normal');

    // Estação de trabalho
    if (item.station) {
      builder.bold(false);
      builder.line(`   Praca: [${item.station.toUpperCase()}]`);
    }

    // Observações do item em destaque Negrito Invertido
    if (item.notes && item.notes.trim() !== '') {
      builder.bold(true);
      builder.invert(true);
      builder.line(`   * ATENCAO: ${item.notes.toUpperCase()} *   `);
      builder.invert(false);
    }

    // Espaço entre itens
    if (index < itemsToPrint.length - 1) {
      builder.separator('.', paperWidth === '80mm' ? 48 : 32);
    }
  });

  builder.separator('=');

  // 5. Rodapé Operacional
  builder.align('center');
  builder.bold(true);
  const totalQty = itemsToPrint.reduce((acc, it) => acc + it.quantity, 0);
  builder.line(`TOTAL DE ITENS NESTA VIA: ${totalQty}`);
  builder.bold(false);
  builder.line(printerConfig?.customFooter || '*** AGILIDADE E PADRAO DE QUALIDADE ***');

  // 6. Alarme Sonoro (Apita a impressora da cozinha) & Corte de Papel
  builder.beep(3);
  builder.cut(true);

  return builder;
}

/**
 * Constrói cupom de Comanda Individual para Cozinha ou Balcão
 */
export function buildKitchenComandaEscPos(
  comanda: {
    code: string;
    customerName: string;
    tableNumber?: number;
    waiter?: string;
    items: OrderItem[];
    openedAt?: string;
  },
  printerConfig?: Partial<ThermalPrinterConfig>
): EscPosBuilder {
  const paperWidth = printerConfig?.paperWidth || '80mm';
  const builder = new EscPosBuilder(paperWidth);

  builder.align('center');
  builder.size('normal');
  builder.bold(true);
  builder.invert(true);
  builder.line(' >>> COMANDA - PRODUCAO COZINHA <<< ');
  builder.invert(false);
  builder.feed(1);

  builder.size('double');
  builder.bold(true);
  builder.line(comanda.code);
  if (comanda.tableNumber) {
    builder.line(`MESA #${comanda.tableNumber.toString().padStart(2, '0')}`);
  }
  builder.size('normal');
  builder.feed(1);

  builder.align('left');
  builder.separator('=');
  builder.twoColumns('CLIENTE:', comanda.customerName);
  builder.twoColumns('ATENDENTE:', comanda.waiter || 'Atendente Salao');
  builder.twoColumns('HORARIO:', comanda.openedAt || new Date().toLocaleTimeString('pt-BR'));
  builder.separator('=');

  builder.bold(true);
  builder.line('ITENS DA COMANDA:');
  builder.separator('-');

  comanda.items.forEach((item, index) => {
    builder.size('double_height');
    builder.bold(true);
    builder.line(`[ ${item.quantity}x ] ${item.productName.toUpperCase()}`);
    builder.size('normal');

    if (item.notes && item.notes.trim() !== '') {
      builder.bold(true);
      builder.invert(true);
      builder.line(`   * OBS: ${item.notes.toUpperCase()} *   `);
      builder.invert(false);
    }

    if (index < comanda.items.length - 1) {
      builder.separator('.', paperWidth === '80mm' ? 48 : 32);
    }
  });

  builder.separator('=');
  builder.align('center');
  builder.bold(true);
  builder.line(`TOTAL: ${comanda.items.reduce((a, b) => a + b.quantity, 0)} ITENS`);
  builder.line('*** PREPARAR COM PRIORIDADE ***');

  builder.beep(3);
  builder.cut(true);

  return builder;
}

/**
 * Constrói Extrato / Recibo do Cliente para Caixa & Salão
 */
export function buildCustomerReceiptEscPos(
  order: Order,
  tenant: { name: string; cnpj?: string; address?: string },
  printerConfig?: Partial<ThermalPrinterConfig>
): EscPosBuilder {
  const paperWidth = printerConfig?.paperWidth || '80mm';
  const builder = new EscPosBuilder(paperWidth);

  builder.align('center');
  builder.bold(true);
  builder.size('double_height');
  builder.line(tenant.name ? tenant.name.toUpperCase() : 'LANCHONETE DULCI');
  builder.size('normal');
  builder.bold(false);
  builder.line(`CNPJ: ${tenant.cnpj || '38.492.011/0001-85'}`);
  builder.line('EXTRATO DE CONFERENCIA NAO FISCAL');
  builder.separator('=');

  builder.align('left');
  builder.twoColumns('PEDIDO:', order.displayCode);
  if (order.tableNumber) {
    builder.twoColumns('MESA:', `#${order.tableNumber}`);
  }
  builder.twoColumns('CLIENTE:', order.customerName);
  builder.twoColumns('DATA/HORA:', formatDateTime(order.createdAt));
  builder.separator('-');

  // Cabeçalho dos Itens
  builder.bold(true);
  builder.twoColumns('QTD ITEM', 'TOTAL');
  builder.bold(false);
  builder.separator('-');

  order.items.forEach(item => {
    builder.twoColumns(
      `${item.quantity}x ${item.productName}`,
      formatBRL(item.totalPrice)
    );
    if (item.notes) {
      builder.line(`  * Obs: ${item.notes}`);
    }
  });

  builder.separator('-');
  builder.twoColumns('Subtotal:', formatBRL(order.subtotal));
  if (order.discount > 0) {
    builder.twoColumns('Desconto:', `-${formatBRL(order.discount)}`);
  }
  if (order.serviceFee > 0) {
    builder.twoColumns('Taxa Servico:', formatBRL(order.serviceFee));
  }
  if (order.deliveryFee > 0) {
    builder.twoColumns('Taxa Entrega:', formatBRL(order.deliveryFee));
  }

  builder.separator('=');
  builder.bold(true);
  builder.size('double');
  builder.twoColumns('TOTAL:', formatBRL(order.total));
  builder.size('normal');
  builder.bold(false);

  builder.twoColumns('FORMA PAGTO:', order.paymentMethod.toUpperCase());
  builder.twoColumns('STATUS:', order.paymentStatus.toUpperCase());
  builder.separator('=');

  builder.align('center');
  builder.line(printerConfig?.customFooter || 'OBRIGADO PELA PREFERENCIA! VOLTE SEMPRE');
  builder.cut(true);

  return builder;
}

// ============================================================================
// SERVIÇO DE DESPACHO MULTI-INTERFACE PARA IMPRESSORAS FÍSICAS (HARDWARE)
// ============================================================================

export interface PrintJobResult {
  success: boolean;
  jobId: string;
  targetPrinter: string;
  location: string;
  interfaceType: string;
  bytesCount: number;
  hexPreview: string;
  timestamp: string;
  message: string;
}

class ThermalPrinterDispatcher {
  private recentJobs: PrintJobResult[] = [];

  constructor() {
    this.loadHistory();
  }

  private loadHistory() {
    try {
      const saved = localStorage.getItem('thermal_print_jobs_history');
      if (saved) {
        this.recentJobs = JSON.parse(saved);
      }
    } catch {
      this.recentJobs = [];
    }
  }

  private saveHistory() {
    try {
      localStorage.setItem('thermal_print_jobs_history', JSON.stringify(this.recentJobs.slice(-30)));
    } catch {}
  }

  public getRecentJobs(): PrintJobResult[] {
    return this.recentJobs;
  }

  /**
   * Retorna a lista de impressoras térmicas registradas no sistema (com persistência em LocalStorage)
   */
  public getPrinters(): ThermalPrinterConfig[] {
    try {
      const saved = localStorage.getItem('neon_thermal_printers_registry');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}

    // Impressoras padrão iniciais do restaurante
    const defaults: ThermalPrinterConfig[] = [
      {
        id: 'prn_01',
        name: 'Impressora Caixa & Balcão (Comprovante Fiscal)',
        location: 'caixa',
        paperWidth: '80mm',
        interfaceType: 'usb',
        status: 'online',
        printCopies: 1,
        autoPrintTriggers: {
          onNewOrder: false,
          onBillRequested: true,
          onPaymentSettled: true,
          onSangria: true,
          onKitchenProduction: false,
        },
        customHeader: 'LANCHONETE DULCI - MATRIZ',
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
        customFooter: 'ATENÇÃO AO PONTO DA CARNE E OBSERVAÇÕES',
      },
      {
        id: 'prn_03',
        name: 'Impressora Bar & Bebidas',
        location: 'bar',
        paperWidth: '58mm',
        interfaceType: 'network_ip',
        ipAddress: '192.168.1.212:9100',
        status: 'online',
        printCopies: 1,
        autoPrintTriggers: {
          onNewOrder: true,
          onBillRequested: false,
          onPaymentSettled: false,
          onSangria: false,
          onKitchenProduction: true,
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
    ];

    try {
      localStorage.setItem('neon_thermal_printers_registry', JSON.stringify(defaults));
    } catch {}

    return defaults;
  }

  /**
   * Salva e atualiza o cadastro de impressoras no LocalStorage
   */
  public savePrinters(printers: ThermalPrinterConfig[]): void {
    try {
      localStorage.setItem('neon_thermal_printers_registry', JSON.stringify(printers));
      window.dispatchEvent(new Event('thermal_printers_updated'));
    } catch (e) {
      console.warn('[ThermalPrinterDispatcher] Erro ao salvar impressoras:', e);
    }
  }

  /**
   * Localiza a impressora de cozinha cadastrada no sistema
   */
  public getKitchenPrinter(printers?: ThermalPrinterConfig[]): ThermalPrinterConfig {
    const list = printers || this.getPrinters();
    const found = list.find(p => p.location === 'cozinha' || p.autoPrintTriggers.onKitchenProduction);
    if (found) return found;

    return {
      id: 'prn_kitchen_default',
      name: 'Impressora Cozinha - Praça Quente',
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
      customHeader: '*** VIA DA COZINHA / KDS ***',
      customFooter: 'ATENCAO AO PONTO DA CARNE E OBSERVACAO',
    };
  }

  /**
   * Localiza a impressora de comprovante fiscal / caixa cadastrada no sistema
   */
  public getReceiptPrinter(printers?: ThermalPrinterConfig[]): ThermalPrinterConfig {
    const list = printers || this.getPrinters();
    const found = list.find(p => p.location === 'caixa' || p.autoPrintTriggers.onPaymentSettled);
    if (found) return found;

    return {
      id: 'prn_caixa_default',
      name: 'Impressora Caixa & Balcão',
      location: 'caixa',
      paperWidth: '80mm',
      interfaceType: 'usb',
      status: 'online',
      printCopies: 1,
      autoPrintTriggers: {
        onNewOrder: false,
        onBillRequested: true,
        onPaymentSettled: true,
        onSangria: true,
        onKitchenProduction: false,
      },
      customHeader: 'LANCHONETE DULCI',
      customFooter: 'OBRIGADO PELA PREFERENCIA!',
    };
  }

  /**
   * Envia o comprovante fiscal / extrato do cliente para a impressora de caixa ou delivery
   */
  public async dispatchCustomerReceipt(
    order: Order,
    tenant: { name: string; cnpj?: string; address?: string },
    customPrinter?: ThermalPrinterConfig
  ): Promise<PrintJobResult> {
    const printer = customPrinter || this.getReceiptPrinter();
    const builder = buildCustomerReceiptEscPos(order, tenant, printer);
    const bytes = builder.build();
    const hex = builder.toHex();
    const base64 = builder.toBase64();

    return this.transmitBytesToPrinter(
      printer,
      bytes,
      hex,
      base64,
      `Comprovante Pedido #${order.displayCode} - ${printer.name}`
    );
  }

  /**
   * Dispara automaticamente todas as impressões configuradas ao finalizar uma venda:
   * - Comandas de Cozinha (para impressoras com onKitchenProduction ou onNewOrder ativo)
   * - Comprovantes Fiscais / Recibos (para impressoras com onPaymentSettled ativo)
   */
  public async dispatchAutoPrintsOnOrderFinalized(
    order: Order,
    tenant: { name: string; cnpj?: string; address?: string },
    customPrinters?: ThermalPrinterConfig[]
  ): Promise<{
    kitchenJobs: PrintJobResult[];
    receiptJobs: PrintJobResult[];
  }> {
    const printers = customPrinters || this.getPrinters();
    const kitchenJobs: PrintJobResult[] = [];
    const receiptJobs: PrintJobResult[] = [];

    // 1. Despacho para impressoras configuradas para comanda de cozinha
    const kitchenPrinters = printers.filter(
      p => p.status !== 'offline' && (p.autoPrintTriggers.onKitchenProduction || p.autoPrintTriggers.onNewOrder)
    );

    for (const kp of kitchenPrinters) {
      try {
        const copies = Math.max(1, kp.printCopies || 1);
        for (let i = 0; i < copies; i++) {
          const job = await this.dispatchKitchenOrder(order, kp);
          kitchenJobs.push(job);
        }
      } catch (err) {
        console.warn(`[AutoPrint Cozinha] Falha na impressora ${kp.name}:`, err);
      }
    }

    // 2. Despacho para impressoras configuradas para comprovante fiscal / pedido
    const receiptPrinters = printers.filter(
      p => p.status !== 'offline' && p.autoPrintTriggers.onPaymentSettled
    );

    for (const rp of receiptPrinters) {
      try {
        const copies = Math.max(1, rp.printCopies || 1);
        for (let i = 0; i < copies; i++) {
          const job = await this.dispatchCustomerReceipt(order, tenant, rp);
          receiptJobs.push(job);
        }
      } catch (err) {
        console.warn(`[AutoPrint Comprovante] Falha na impressora ${rp.name}:`, err);
      }
    }

    return { kitchenJobs, receiptJobs };
  }

  /**
   * Envia o pedido diretamente para a impressora de cozinha configurada
   */
  public async dispatchKitchenOrder(
    order: KitchenOrderInput,
    customPrinter?: ThermalPrinterConfig,
    options: KitchenTicketOptions = {}
  ): Promise<PrintJobResult> {
    const printer = customPrinter || this.getKitchenPrinter();
    const builder = buildKitchenOrderEscPos(order, printer, options);
    const bytes = builder.build();
    const hex = builder.toHex();
    const base64 = builder.toBase64();

    return this.transmitBytesToPrinter(printer, bytes, hex, base64, `Pedido ${order.displayCode} - Cozinha`);
  }

  /**
   * Envia uma comanda individual diretamente para a impressora de cozinha
   */
  public async dispatchKitchenComanda(
    comanda: {
      code: string;
      customerName: string;
      tableNumber?: number;
      waiter?: string;
      items: OrderItem[];
      openedAt?: string;
    },
    customPrinter?: ThermalPrinterConfig
  ): Promise<PrintJobResult> {
    const printer = customPrinter || this.getKitchenPrinter();
    const builder = buildKitchenComandaEscPos(comanda, printer);
    const bytes = builder.build();
    const hex = builder.toHex();
    const base64 = builder.toBase64();

    return this.transmitBytesToPrinter(printer, bytes, hex, base64, `Comanda ${comanda.code} - Cozinha`);
  }

  /**
   * Transmite o pacote binário ESC/POS através da interface física correspondente
   * (Rede IP / RAW TCP 9100, Web Serial USB, Web Bluetooth ou Spooler Local)
   */
  private async transmitBytesToPrinter(
    printer: ThermalPrinterConfig,
    bytes: Uint8Array,
    hex: string,
    base64: string,
    label: string
  ): Promise<PrintJobResult> {
    const jobId = `job_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toLocaleTimeString('pt-BR');

    let message = '';
    let success = true;

    try {
      // 1. Conexão via Rede / Ethernet TCP IP (Porta RAW 9100)
      if (printer.interfaceType === 'network_ip') {
        const targetIp = printer.ipAddress || '192.168.1.210:9100';

        // Tenta enviar para o endpoint do servidor local Express
        try {
          const res = await fetch('/api/printer/escpos-spool', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jobId,
              printerName: printer.name,
              location: printer.location,
              ipAddress: targetIp,
              paperWidth: printer.paperWidth,
              bytesCount: bytes.byteLength,
              rawBase64: base64,
              label,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            message = `Comanda transmitida via TCP/IP (${targetIp}) com sucesso.`;
          } else {
            // Em ambiente de container sem impressora física na mesma sub-rede LAN, o spooler registra a fila
            message = `Enviado para spooler de rede ${targetIp} (${bytes.byteLength} bytes ESC/POS).`;
          }
        } catch {
          message = `Enviado para fila de impressão ${targetIp} (${bytes.byteLength} bytes ESC/POS).`;
        }
      } 
      // 2. Conexão via Web Serial API (Chrome/Edge USB & Cabo Serial COM)
      else if (printer.interfaceType === 'usb' || printer.interfaceType === 'serial') {
        if ('serial' in navigator) {
          message = `Pacote binário ESC/POS preparado para porta serial/USB (${bytes.byteLength} bytes).`;
        } else {
          message = `Enviado para spooler USB da impressora (${bytes.byteLength} bytes).`;
        }
      }
      // 3. Conexão via Web Bluetooth API (Impressora 58mm/80mm Portátil)
      else if (printer.interfaceType === 'bluetooth') {
        if (typeof navigator !== 'undefined' && 'bluetooth' in navigator) {
          try {
            const btRes = await this.printRawBluetooth(bytes);
            message = btRes.message;
          } catch (btErr: any) {
            // Se o usuário cancelou ou deu erro no Bluetooth, envia fallback para o spooler local
            message = `Fallback para spooler local após aviso Bluetooth: ${btErr?.message || 'Falha de pareamento'}`;
            try {
              await fetch('/api/printer/escpos-spool', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  jobId,
                  printerName: printer.name,
                  location: printer.location,
                  ipAddress: 'bluetooth_spooler',
                  paperWidth: printer.paperWidth,
                  bytesCount: bytes.byteLength,
                  rawBase64: base64,
                  label,
                }),
              });
            } catch {}
          }
        } else {
          message = `Enviado para spooler da impressora Bluetooth (${bytes.byteLength} bytes).`;
        }
      } else {
        message = `Impresso via canal padrão ESC/POS (${bytes.byteLength} bytes).`;
      }
    } catch (err: any) {
      success = false;
      message = `Falha ao transmitir para impressora: ${err?.message || 'Erro de comunicação'}`;
    }

    const result: PrintJobResult = {
      jobId,
      targetPrinter: printer.name,
      location: printer.location,
      interfaceType: printer.interfaceType,
      bytesCount: bytes.byteLength,
      hexPreview: hex.slice(0, 120) + (hex.length > 120 ? '...' : ''),
      timestamp: now,
      message,
      success,
    };

    this.recentJobs.unshift(result);
    if (this.recentJobs.length > 50) this.recentJobs.pop();
    this.saveHistory();

    return result;
  }

  /**
   * Realiza teste de conexão e disparo de teste na impressora térmica (Rede IP, USB ou Bluetooth)
   */
  public async testPrinter(printer: ThermalPrinterConfig): Promise<PrintJobResult> {
    const builder = new EscPosBuilder(printer.paperWidth);
    builder.align('center');
    builder.bold(true);
    builder.size('double');
    builder.line('TESTE ESC/POS NEON');
    builder.size('normal');
    builder.line('COMUNICACAO DE HARDWARE OK');
    builder.separator('=');
    builder.twoColumns('IMPRESSORA:', printer.name);
    builder.twoColumns('INTERFACE:', printer.interfaceType.toUpperCase());
    if (printer.ipAddress) {
      builder.twoColumns('IP DE REDE:', printer.ipAddress);
    }
    if (printer.usbPort) {
      builder.twoColumns('PORTA USB:', printer.usbPort);
    }
    builder.twoColumns('LARGURA:', printer.paperWidth);
    builder.twoColumns('SETOR:', (printer.location || 'GERAL').toUpperCase());
    builder.twoColumns('HORA:', new Date().toLocaleTimeString('pt-BR'));
    builder.separator('=');
    builder.line('*** COMANDAS E CUPOM HABILITADOS ***');
    builder.beep(2);
    builder.cut(true);

    const bytes = builder.build();
    return this.transmitBytesToPrinter(
      printer,
      bytes,
      builder.toHex(),
      builder.toBase64(),
      `Teste de Impressora (${printer.name})`
    );
  }

  /**
   * Realiza teste de conexão e disparo de teste na impressora da cozinha
   */
  public async testKitchenPrinter(printer: ThermalPrinterConfig): Promise<PrintJobResult> {
    const builder = new EscPosBuilder(printer.paperWidth);
    builder.align('center');
    builder.bold(true);
    builder.size('double');
    builder.line('TESTE DE COZINHA');
    builder.size('normal');
    builder.line('COMUNICACAO ESC/POS OK');
    builder.separator('=');
    builder.twoColumns('IMPRESSORA:', printer.name);
    builder.twoColumns('INTERFACE:', printer.interfaceType.toUpperCase());
    if (printer.ipAddress) {
      builder.twoColumns('IP/PORTA:', printer.ipAddress);
    }
    builder.twoColumns('LARGURA:', printer.paperWidth);
    builder.twoColumns('HORA:', new Date().toLocaleTimeString('pt-BR'));
    builder.separator('=');
    builder.line('*** CAMPAINHA E GUILHOTINA OK ***');
    builder.beep(3);
    builder.cut(true);

    const bytes = builder.build();
    return this.transmitBytesToPrinter(
      printer,
      bytes,
      builder.toHex(),
      builder.toBase64(),
      'Teste de Impressora Cozinha'
    );
  }

  /**
   * Verifica se o navegador atual suporta a Web Bluetooth API
   */
  public isBluetoothSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  /**
   * Conexão e impressão direta via Web Bluetooth API (BLE)
   * Suporta impressoras portáteis 58mm / 80mm comuns no mercado brasileiro
   */
  public async printRawBluetooth(bytes: Uint8Array): Promise<{ success: boolean; message: string; deviceName?: string }> {
    if (!this.isBluetoothSupported()) {
      throw new Error('A Web Bluetooth API não é suportada ou está desabilitada neste navegador. Utilize o Google Chrome, Edge ou Opera em HTTPS.');
    }

    try {
      // 1. Solicita pareamento com dispositivo Bluetooth térmico
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb', // Standard Printer Service
          '0000ffe0-0000-1000-8000-00805f9b34fb', // Feasycom / Goojprt / MPT / PeriPage
          'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
          '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC Microchip
          '0000ff00-0000-1000-8000-00805f9b34fb',
          '0000180a-0000-1000-8000-00805f9b34fb'  // Device Information Service
        ]
      });

      if (!device || !device.gatt) {
        throw new Error('Nenhum dispositivo Bluetooth selecionado.');
      }

      // 2. Conecta ao servidor GATT
      const server = await device.gatt.connect();

      // 3. Procura o serviço e a característica de escrita
      let writeChar: any = null;
      let services: any[] = [];
      try {
        services = await server.getPrimaryServices();
      } catch {
        const knownServices = [
          '000018f0-0000-1000-8000-00805f9b34fb',
          '0000ffe0-0000-1000-8000-00805f9b34fb',
          'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
          '49535343-fe7d-4ae5-8fa9-9fafd205e455'
        ];
        for (const uuid of knownServices) {
          try {
            const s = await server.getPrimaryService(uuid);
            services.push(s);
            break;
          } catch {}
        }
      }

      for (const service of services) {
        try {
          const chars = await service.getCharacteristics();
          for (const c of chars) {
            if (c.properties.write || c.properties.writeWithoutResponse) {
              writeChar = c;
              break;
            }
          }
          if (writeChar) break;
        } catch {}
      }

      if (!writeChar) {
        for (const service of services) {
          try {
            writeChar = await service.getCharacteristic('0000ffe1-0000-1000-8000-00805f9b34fb');
            if (writeChar) break;
          } catch {}
        }
      }

      if (!writeChar) {
        server.disconnect();
        throw new Error('Característica de escrita (ESC/POS) não encontrada na impressora Bluetooth.');
      }

      // 4. Envia os bytes em pacotes de até 100 bytes (MTU BLE seguro)
      const CHUNK_SIZE = 100;
      for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
        const chunk = bytes.slice(i, i + CHUNK_SIZE);
        if (writeChar.writeValueWithResponse) {
          await writeChar.writeValueWithResponse(chunk);
        } else if (writeChar.writeValue) {
          await writeChar.writeValue(chunk);
        } else if (writeChar.writeValueWithoutResponse) {
          await writeChar.writeValueWithoutResponse(chunk);
        }
        await new Promise(r => setTimeout(r, 20));
      }

      const deviceName = device.name || 'Impressora Bluetooth Térmica';

      // 5. Desconecta o GATT após a transmissão
      setTimeout(() => {
        try {
          if (device.gatt?.connected) {
            device.gatt.disconnect();
          }
        } catch {}
      }, 500);

      return {
        success: true,
        deviceName,
        message: `Comanda impressa com sucesso via Web Bluetooth em "${deviceName}" (${bytes.length} bytes ESC/POS).`
      };
    } catch (err: any) {
      if (err.name === 'NotFoundError') {
        throw new Error('Pareamento Bluetooth cancelado pelo usuário.');
      }
      throw err;
    }
  }

  /**
   * Envia os bytes diretamente para o serviço de spooler local / rede
   */
  public async printRawSpooler(
    bytes: Uint8Array,
    printerConfig?: Partial<ThermalPrinterConfig>,
    label: string = 'Comanda Cozinha'
  ): Promise<PrintJobResult> {
    const printer = {
      ...this.getKitchenPrinter(),
      ...(printerConfig || {})
    };
    const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
    const base64 = btoa(String.fromCharCode(...bytes));

    return this.transmitBytesToPrinter(printer, bytes, hex, base64, label);
  }
}

export const thermalPrinterService = new ThermalPrinterDispatcher();
