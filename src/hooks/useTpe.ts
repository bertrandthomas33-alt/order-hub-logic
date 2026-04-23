import { useState, useEffect, useCallback } from 'react';
import {
  tpeService,
  TpeEvent,
  TpePaymentRequest,
  TpePaymentResponse,
  TpeStatus,
} from '@/services/tpe/TpeService';

export interface UseTpeReturn {
  isConnected: boolean;
  isProcessing: boolean;
  status: TpeStatus | null;
  lastEvent: TpeEvent | null;
  connect: () => Promise<boolean>;
  disconnect: () => void;
  initiatePayment: (amountCents: number) => Promise<TpePaymentResponse>;
  cancelTransaction: () => void;
  getStatus: () => Promise<TpeStatus>;
  setBridgeUrl: (url: string) => void;
  bridgeUrl: string;
}

export function useTpe(): UseTpeReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<TpeStatus | null>(null);
  const [lastEvent, setLastEvent] = useState<TpeEvent | null>(null);
  const [bridgeUrl, setBridgeUrlState] = useState(tpeService.getBridgeUrl());

  useEffect(() => {
    setIsConnected(tpeService.isConnectedToTpe());
    const unsubscribe = tpeService.onEvent((event) => {
      setLastEvent(event);
      if (event.type === 'status') {
        setIsConnected(event.message === 'Connecté au TPE');
      }
      if (
        event.type === 'payment_complete' ||
        event.type === 'payment_failed' ||
        event.type === 'timeout' ||
        event.type === 'cancelled'
      ) {
        setIsProcessing(false);
      }
      if (event.type === 'payment_started') {
        setIsProcessing(true);
      }
    });
    return () => unsubscribe();
  }, []);

  const connect = useCallback(async () => {
    const c = await tpeService.connect();
    setIsConnected(c);
    return c;
  }, []);

  const disconnect = useCallback(() => {
    tpeService.disconnect();
    setIsConnected(false);
  }, []);

  const initiatePayment = useCallback(async (amountCents: number) => {
    setIsProcessing(true);
    try {
      const request: TpePaymentRequest = { amount: amountCents, currency: 'EUR' };
      return await tpeService.initiatePayment(request);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const cancelTransaction = useCallback(() => {
    tpeService.cancelTransaction();
    setIsProcessing(false);
  }, []);

  const getStatus = useCallback(async () => {
    const s = await tpeService.getStatus();
    setStatus(s);
    return s;
  }, []);

  const setBridgeUrl = useCallback((url: string) => {
    tpeService.setBridgeUrl(url);
    setBridgeUrlState(url);
  }, []);

  return {
    isConnected,
    isProcessing,
    status,
    lastEvent,
    connect,
    disconnect,
    initiatePayment,
    cancelTransaction,
    getStatus,
    setBridgeUrl,
    bridgeUrl,
  };
}
