/**
 * Service pour l'impression sur imprimante Epson TM-m30II via ePOS SDK (réseau).
 * Fonctionne en web tant que l'imprimante est joignable et accepte CORS,
 * sinon nécessite un build Capacitor pour contourner CORS via CapacitorHttp.
 */

export interface PrinterConfig {
  ipAddress: string;
  port?: number;
  deviceId?: string;
}

export interface ReceiptLine {
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface ReceiptData {
  storeName: string;
  storeAddress?: string;
  ticketNumber: string;
  date: Date;
  lines: ReceiptLine[];
  subtotal: number;
  tvaRate: number;
  tvaAmount: number;
  total: number;
  paymentMethod: 'cash' | 'card';
  cashierName?: string;
}

let printerConnected = false;
let printerIp =
  typeof window !== 'undefined'
    ? localStorage.getItem('epson_printer_ip') || ''
    : '';

export const getPrinterConfig = (): PrinterConfig | null => {
  if (!printerIp) return null;
  return {
    ipAddress: printerIp,
    port: 8008,
    deviceId: 'local_printer',
  };
};

export const setPrinterIp = (ip: string) => {
  printerIp = ip;
  if (typeof window !== 'undefined') {
    localStorage.setItem('epson_printer_ip', ip);
  }
};

export const getPrinterIp = () => printerIp;

export const isPrinterConnected = () => printerConnected;

const sendXmlToEpson = async (
  ip: string,
  xmlBody: string,
  timeout = 3000,
): Promise<{ ok: boolean; body: string }> => {
  const url = `http://${ip}/cgi-bin/epos/service.cgi?devid=local_printer&timeout=${timeout}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: '""',
      },
      body: xmlBody,
    });
    clearTimeout(timeoutId);
    const body = await response.text();
    return { ok: response.ok, body };
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
};

export const testPrinterConnection = async (ip: string): Promise<boolean> => {
  try {
    const xmlBody = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Body>
    <epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">
    </epos-print>
  </s:Body>
</s:Envelope>`;
    const result = await sendXmlToEpson(ip, xmlBody, 3000);
    printerConnected = result.ok;
    return result.ok;
  } catch (error) {
    console.error('Erreur connexion imprimante:', error);
    printerConnected = false;
    return false;
  }
};

const escapeXml = (str: string): string =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const generateReceiptXml = (receipt: ReceiptData): string => {
  const formatDate = (date: Date) =>
    date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  const formatPrice = (price: number) => `${price.toFixed(2)} EUR`;

  let xml = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Body>
    <epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">
      <text align="center" font="font_a" width="2" height="2"/>
      <text>${escapeXml(receipt.storeName)}&#10;</text>
      <text width="1" height="1"/>`;
  if (receipt.storeAddress) {
    xml += `
      <text align="center"/>
      <text>${escapeXml(receipt.storeAddress)}&#10;</text>`;
  }
  xml += `
      <text>================================&#10;</text>
      <text align="left"/>
      <text>Ticket: ${escapeXml(receipt.ticketNumber)}&#10;</text>
      <text>Date: ${formatDate(receipt.date)}&#10;</text>`;
  if (receipt.cashierName) {
    xml += `
      <text>Caissier: ${escapeXml(receipt.cashierName)}&#10;</text>`;
  }
  xml += `
      <text>--------------------------------&#10;</text>`;
  for (const line of receipt.lines) {
    const productName = line.productName.substring(0, 20).padEnd(20);
    const qtyPrice = `${line.quantity}x${line.unitPrice.toFixed(2)}`;
    const total = formatPrice(line.totalPrice).padStart(10);
    xml += `
      <text>${escapeXml(productName)}&#10;</text>
      <text>  ${qtyPrice.padEnd(18)}${total}&#10;</text>`;
  }
  xml += `
      <text>--------------------------------&#10;</text>
      <text>Sous-total:${formatPrice(receipt.subtotal).padStart(21)}&#10;</text>
      <text>TVA (${receipt.tvaRate}%):${formatPrice(receipt.tvaAmount).padStart(18)}&#10;</text>
      <text>================================&#10;</text>
      <text width="2" height="2"/>
      <text align="center"/>
      <text>TOTAL: ${formatPrice(receipt.total)}&#10;</text>
      <text width="1" height="1"/>
      <text>================================&#10;</text>`;
  const paymentLabel =
    receipt.paymentMethod === 'cash' ? 'ESPECES' : 'CARTE BANCAIRE';
  xml += `
      <text align="center"/>
      <text>Paiement: ${paymentLabel}&#10;</text>
      <text>&#10;</text>
      <text>Merci de votre visite !&#10;</text>
      <text>&#10;</text>
      <cut type="feed"/>
    </epos-print>
  </s:Body>
</s:Envelope>`;
  return xml;
};

export const printReceipt = async (receipt: ReceiptData): Promise<boolean> => {
  const config = getPrinterConfig();
  if (!config) {
    throw new Error("Imprimante non configurée. Veuillez configurer l'adresse IP.");
  }
  const xml = generateReceiptXml(receipt);
  const result = await sendXmlToEpson(config.ipAddress, xml, 10000);
  if (!result.ok) throw new Error(`Erreur imprimante: réponse non-OK`);
  if (result.body.includes('success="true"')) return true;
  throw new Error("L'impression a échoué");
};

export const generateTicketNumber = (): string => {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = now.getTime().toString().slice(-6);
  return `${dateStr}-${timeStr}`;
};
