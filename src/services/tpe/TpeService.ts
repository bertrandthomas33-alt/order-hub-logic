/**
 * Service de communication avec le Terminal de Paiement Électronique (TPE)
 * via le protocole Caisse-AP (Concert) V3.20 over IP.
 *
 * Note: nécessite un build Capacitor avec un plugin TCP natif.
 * En web pur, les connexions TCP échouent et la modale affiche une erreur.
 */

import { TcpSocket } from '@/plugins/tcp-socket';
import {
  DEFAULT_PORT,
  RECV_TIMEOUT,
  buildDebitMessage,
  parseDebitResponse,
  toBase64,
  fromBase64,
} from './ConcertProtocol';

export interface TpePaymentRequest {
  amount: number;
  currency?: string;
  transactionId?: string;
}

export interface TpePaymentResponse {
  success: boolean;
  transactionId: string;
  authorizationCode?: string;
  cardType?: string;
  maskedPan?: string;
  receiptData?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface TpeStatus {
  connected: boolean;
  terminalId?: string;
  version?: string;
  lastActivity?: string;
}

type TpeEventCallback = (event: TpeEvent) => void;

export interface TpeEvent {
  type:
    | 'status'
    | 'payment_started'
    | 'card_inserted'
    | 'pin_entry'
    | 'processing'
    | 'payment_complete'
    | 'payment_failed'
    | 'timeout'
    | 'cancelled';
  message?: string;
  data?: Record<string, unknown>;
}

type SharedTpeServiceState = {
  socketId: string | null;
  isConnected: boolean;
  connectionPromise: Promise<boolean> | null;
  paymentPromise: Promise<TpePaymentResponse> | null;
};

const globalForTpeState = globalThis as typeof globalThis & {
  __tpeServiceState?: SharedTpeServiceState;
};

const sharedTpeServiceState =
  globalForTpeState.__tpeServiceState ??
  (globalForTpeState.__tpeServiceState = {
    socketId: null,
    isConnected: false,
    connectionPromise: null,
    paymentPromise: null,
  });

const ls = (key: string, fallback: string): string => {
  if (typeof window === 'undefined') return fallback;
  return localStorage.getItem(key) || fallback;
};

class TpeService {
  private tpeHost: string;
  private tpePort: number;
  private eventCallbacks: TpeEventCallback[] = [];
  private caisseId: string;

  private get socketId() {
    return sharedTpeServiceState.socketId;
  }
  private set socketId(v: string | null) {
    sharedTpeServiceState.socketId = v;
  }
  private get _isConnected() {
    return sharedTpeServiceState.isConnected;
  }
  private set _isConnected(v: boolean) {
    sharedTpeServiceState.isConnected = v;
  }
  private get connectionPromise() {
    return sharedTpeServiceState.connectionPromise;
  }
  private set connectionPromise(v: Promise<boolean> | null) {
    sharedTpeServiceState.connectionPromise = v;
  }
  private get paymentPromise() {
    return sharedTpeServiceState.paymentPromise;
  }
  private set paymentPromise(v: Promise<TpePaymentResponse> | null) {
    sharedTpeServiceState.paymentPromise = v;
  }

  constructor() {
    this.tpeHost = ls('tpe_host', '192.168.1.100');
    this.tpePort = parseInt(ls('tpe_port', String(DEFAULT_PORT)), 10);
    this.caisseId = ls('tpe_caisse_id', '01');
  }

  setBridgeUrl(url: string): void {
    const parts = url.split(':');
    this.tpeHost = parts[0];
    this.tpePort = parts.length > 1 ? parseInt(parts[1], 10) : DEFAULT_PORT;
    if (typeof window !== 'undefined') {
      localStorage.setItem('tpe_host', this.tpeHost);
      localStorage.setItem('tpe_port', String(this.tpePort));
    }
  }

  getBridgeUrl(): string {
    return `${this.tpeHost}:${this.tpePort}`;
  }

  setTpeAddress(host: string, port: number): void {
    this.tpeHost = host;
    this.tpePort = port;
    if (typeof window !== 'undefined') {
      localStorage.setItem('tpe_host', host);
      localStorage.setItem('tpe_port', String(port));
    }
  }

  setCaisseId(id: string): void {
    this.caisseId = id;
    if (typeof window !== 'undefined') {
      localStorage.setItem('tpe_caisse_id', id);
    }
  }

  async connect(): Promise<boolean> {
    if (this.connectionPromise) return this.connectionPromise;

    this.connectionPromise = (async () => {
      try {
        if (this.socketId) {
          try {
            const existing = await TcpSocket.isConnected({ socketId: this.socketId });
            if (existing.connected) {
              this._isConnected = true;
              return true;
            }
          } catch {
            // ignore
          }
          await TcpSocket.disconnect({ socketId: this.socketId }).catch(() => undefined);
          this.socketId = null;
        }

        const result = await TcpSocket.connect({
          host: this.tpeHost,
          port: this.tpePort,
          timeout: 5000,
        });
        this.socketId = result.socketId;
        this._isConnected = true;
        this.emitEvent({ type: 'status', message: 'Connecté au TPE' });
        return true;
      } catch (error) {
        console.error('[Concert] Erreur de connexion:', error);
        this.socketId = null;
        this._isConnected = false;
        this.emitEvent({ type: 'status', message: 'Déconnecté du TPE' });
        return false;
      } finally {
        this.connectionPromise = null;
      }
    })();

    return this.connectionPromise;
  }

  disconnect(): void {
    if (this.socketId) {
      TcpSocket.disconnect({ socketId: this.socketId }).catch(console.error);
      this.socketId = null;
    }
    this._isConnected = false;
    this.emitEvent({ type: 'status', message: 'Déconnecté du TPE' });
  }

  isConnectedToTpe(): boolean {
    return this._isConnected;
  }

  private async sendAndReceive(message: string, timeout = RECV_TIMEOUT * 1000): Promise<string | null> {
    if (!this.socketId) throw new Error('Non connecté');
    const encoder = new TextEncoder();
    const data = toBase64(encoder.encode(message));
    await TcpSocket.send({ socketId: this.socketId, data });

    const startTime = Date.now();
    let accumulated = '';
    while (Date.now() - startTime < timeout) {
      const result = await TcpSocket.receive({
        socketId: this.socketId,
        timeout: Math.min(5000, timeout - (Date.now() - startTime)),
      });
      if (result.length > 0) {
        const bytes = fromBase64(result.data);
        const decoder = new TextDecoder();
        accumulated += decoder.decode(bytes);
        if (accumulated.length >= 5 && this.isCompleteTLV(accumulated)) {
          return accumulated;
        }
      }
    }
    return accumulated.length > 0 ? accumulated : null;
  }

  private isCompleteTLV(data: string): boolean {
    let pos = 0;
    while (pos + 5 <= data.length) {
      const lenStr = data.substring(pos + 2, pos + 5);
      const len = parseInt(lenStr, 10);
      if (isNaN(len)) return false;
      if (pos + 5 + len > data.length) return false;
      pos += 5 + len;
    }
    return pos === data.length && pos > 0;
  }

  async initiatePayment(request: TpePaymentRequest): Promise<TpePaymentResponse> {
    if (this.paymentPromise) return this.paymentPromise;

    this.paymentPromise = (async () => {
      const transactionId = request.transactionId || `TXN-${Date.now()}`;
      if (!this._isConnected || !this.socketId) {
        const connected = await this.connect();
        if (!connected || !this.socketId) {
          return {
            success: false,
            transactionId,
            errorCode: 'NOT_CONNECTED',
            errorMessage: 'Non connecté au TPE',
          };
        }
      }
      this.emitEvent({ type: 'payment_started', message: 'Paiement initié...' });
      try {
        const debitMessage = buildDebitMessage(request.amount, this.caisseId);
        const responseData = await this.sendAndReceive(debitMessage);
        if (!responseData) {
          this.emitEvent({ type: 'timeout', message: 'Délai dépassé' });
          return {
            success: false,
            transactionId,
            errorCode: 'TIMEOUT',
            errorMessage: 'Délai de paiement dépassé',
          };
        }
        const response = parseDebitResponse(responseData);
        if (response.accepted) {
          this.emitEvent({
            type: 'payment_complete',
            message: 'Paiement accepté',
            data: response as unknown as Record<string, unknown>,
          });
          return {
            success: true,
            transactionId,
            authorizationCode: response.authorizationCode,
            cardType: response.cardType,
            maskedPan: response.maskedPan,
          };
        }
        this.emitEvent({
          type: 'payment_failed',
          message: 'Paiement refusé',
          data: response as unknown as Record<string, unknown>,
        });
        return {
          success: false,
          transactionId,
          errorCode: response.responseCode,
          errorMessage: `Paiement refusé (code ${response.responseCode})`,
        };
      } catch (error) {
        console.error('[Concert] Erreur paiement:', error);
        this.emitEvent({ type: 'payment_failed', message: String(error) });
        return {
          success: false,
          transactionId,
          errorCode: 'ERROR',
          errorMessage: String(error),
        };
      } finally {
        this.paymentPromise = null;
      }
    })();

    return this.paymentPromise;
  }

  cancelTransaction(): void {
    if (this.socketId && this._isConnected) {
      this.disconnect();
      this.emitEvent({ type: 'cancelled', message: 'Transaction annulée' });
    }
  }

  async getStatus(): Promise<TpeStatus> {
    if (!this._isConnected || !this.socketId) return { connected: false };
    try {
      const check = await TcpSocket.isConnected({ socketId: this.socketId });
      return { connected: check.connected, lastActivity: new Date().toISOString() };
    } catch {
      return { connected: false };
    }
  }

  private emitEvent(event: TpeEvent): void {
    this.eventCallbacks.forEach((cb) => cb(event));
  }

  onEvent(callback: TpeEventCallback): () => void {
    this.eventCallbacks.push(callback);
    return () => {
      this.eventCallbacks = this.eventCallbacks.filter((cb) => cb !== callback);
    };
  }
}

const globalForTpeService = globalThis as typeof globalThis & {
  __tpeService?: TpeService;
};

export const tpeService = globalForTpeService.__tpeService ?? new TpeService();

if (!globalForTpeService.__tpeService) {
  globalForTpeService.__tpeService = tpeService;
}
