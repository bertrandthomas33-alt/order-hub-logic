/**
 * Protocole Caisse-AP (Concert) V3.20 over IP — format TLV.
 * Référence : https://github.com/akretion/caisse-ap-ip
 */

export const TAGS = {
  CZ: 'CZ',
  CJ: 'CJ',
  CA: 'CA',
  CB: 'CB',
  CC: 'CC',
  CD: 'CD',
  CE: 'CE',
  BA: 'BA',
} as const;

export const RESP_TAGS = {
  AE: 'AE',
  AF: 'AF',
  AN: 'AN',
  AO: 'AO',
  AB: 'AB',
} as const;

export const DEVISE_EUR = '978';
export const PROTOCOL_VERSION = '0300';
export const PROTOCOL_ID = '012345678901';
export const DEFAULT_PORT = 8887;
export const RECV_TIMEOUT = 180;

export function encodeTLV(tag: string, value: string): string {
  const len = String(value.length).padStart(3, '0');
  return `${tag}${len}${value}`;
}

export function buildDebitMessage(amountCents: number, caisseId = '01'): string {
  const fields: [string, string][] = [
    [TAGS.CZ, PROTOCOL_VERSION],
    [TAGS.CJ, PROTOCOL_ID],
    [TAGS.CA, caisseId],
    [TAGS.CE, DEVISE_EUR],
    [TAGS.BA, '0'],
    [TAGS.CD, '0'],
    [TAGS.CB, String(amountCents)],
  ];
  return fields.map(([t, v]) => encodeTLV(t, v)).join('');
}

export function buildRefundMessage(amountCents: number, caisseId = '01'): string {
  const fields: [string, string][] = [
    [TAGS.CZ, PROTOCOL_VERSION],
    [TAGS.CJ, PROTOCOL_ID],
    [TAGS.CA, caisseId],
    [TAGS.CE, DEVISE_EUR],
    [TAGS.BA, '0'],
    [TAGS.CD, '1'],
    [TAGS.CB, String(amountCents)],
  ];
  return fields.map(([t, v]) => encodeTLV(t, v)).join('');
}

export function parseTLVResponse(data: string): Record<string, string> {
  const result: Record<string, string> = {};
  let pos = 0;
  while (pos + 5 <= data.length) {
    const tag = data.substring(pos, pos + 2);
    const lenStr = data.substring(pos + 2, pos + 5);
    const len = parseInt(lenStr, 10);
    if (isNaN(len) || pos + 5 + len > data.length) break;
    const value = data.substring(pos + 5, pos + 5 + len);
    result[tag] = value;
    pos += 5 + len;
  }
  return result;
}

export interface ConcertResponse {
  accepted: boolean;
  responseCode: string;
  authorizationCode: string;
  cardType: string;
  maskedPan: string;
  amount: number;
  rawFields: Record<string, string>;
  rawData: string;
}

export function parseDebitResponse(data: string): ConcertResponse {
  const fields = parseTLVResponse(data);
  const responseCode = fields['AE'] || '';
  const accepted =
    responseCode === '00' || responseCode === '10' || responseCode === '';
  const authorizationCode = fields['AC'] || fields['AF'] || '';
  const maskedPan = fields['AA'] || fields['AN'] || '';
  const cardType = fields['CC'] || fields['AO'] || '';
  const amountStr = fields['AB'] || fields['CB'] || '0';
  const amount = parseInt(amountStr, 10) || 0;
  return {
    accepted,
    responseCode,
    authorizationCode,
    cardType,
    maskedPan,
    amount,
    rawFields: fields,
    rawData: data,
  };
}

export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
