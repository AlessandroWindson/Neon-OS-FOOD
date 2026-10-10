/**
 * Gerador de Payload e QR Code PIX (Padrão BR Code do Banco Central do Brasil)
 */

// Função para calcular CRC16-CCITT (0x1021)
function calculateCRC16(str: string): string {
  let crc = 0xffff;
  const strlen = str.length;
  for (let c = 0; c < strlen; c++) {
    crc ^= str.charCodeAt(c) << 8;
    for (let i = 0; i < 8; i++) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

// Remove acentos e caracteres especiais para compatibilidade com o padrão EMV
function sanitizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .toUpperCase();
}

function formatTLV(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

export interface PixPayloadParams {
  pixKey: string;
  pixKeyType?: 'cnpj' | 'cpf' | 'email' | 'phone' | 'random';
  merchantName: string;
  merchantCity: string;
  amount?: number;
  txId?: string;
  description?: string;
}

/**
 * Gera a string "PIX Copia e Cola" oficial
 */
export function generatePixPayload({
  pixKey,
  merchantName,
  merchantCity,
  amount,
  txId = '***',
  description,
}: PixPayloadParams): string {
  if (!pixKey) return '';

  const cleanKey = pixKey.trim();
  const cleanName = sanitizeText(merchantName || 'NEON FOOD').slice(0, 25);
  const cleanCity = sanitizeText(merchantCity || 'SAO PAULO').slice(0, 15);
  const cleanTxId = (txId ? sanitizeText(txId) : '***').slice(0, 25);

  // Merchant Account Info (ID 26)
  const gui = formatTLV('00', 'BR.GOV.BCB.PIX');
  const key = formatTLV('01', cleanKey);
  const desc = description ? formatTLV('02', sanitizeText(description).slice(0, 40)) : '';
  const merchantAccountInfo = formatTLV('26', `${gui}${key}${desc}`);

  // Base Elements
  const payloadFormat = formatTLV('00', '01');
  const merchantCategory = formatTLV('52', '0000');
  const transactionCurrency = formatTLV('53', '986'); // BRL
  const transactionAmount = amount && amount > 0 ? formatTLV('54', amount.toFixed(2)) : '';
  const countryCode = formatTLV('58', 'BR');
  const nameTLV = formatTLV('59', cleanName || 'LOJA');
  const cityTLV = formatTLV('60', cleanCity || 'SAO PAULO');

  // Additional Data (ID 62)
  const txIdTLV = formatTLV('05', cleanTxId || '***');
  const additionalData = formatTLV('62', txIdTLV);

  const payloadWithoutCRC = `${payloadFormat}${merchantAccountInfo}${merchantCategory}${transactionCurrency}${transactionAmount}${countryCode}${nameTLV}${cityTLV}${additionalData}6304`;
  const checksum = calculateCRC16(payloadWithoutCRC);

  return `${payloadWithoutCRC}${checksum}`;
}

/**
 * Retorna URL de imagem do QR Code a partir da string Pix ou dados
 */
export function getPixQrCodeUrl(payload: string, size: number = 260): string {
  if (!payload) return '';
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(payload)}`;
}
