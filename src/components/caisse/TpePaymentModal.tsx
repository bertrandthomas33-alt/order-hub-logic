import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTpe } from '@/hooks/useTpe';
import {
  CreditCard,
  Loader2,
  CheckCircle,
  XCircle,
  Wifi,
  WifiOff,
  Settings,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  onPaymentComplete: (success: boolean, transactionData?: Record<string, unknown>) => void;
}

type Step = 'connecting' | 'waiting_card' | 'pin_entry' | 'processing' | 'success' | 'error';

export function TpePaymentModal({ open, onOpenChange, amount, onPaymentComplete }: Props) {
  const { isConnected, lastEvent, connect, initiatePayment, cancelTransaction, setBridgeUrl, bridgeUrl } = useTpe();
  const [step, setStep] = useState<Step>('connecting');
  const [errorMessage, setErrorMessage] = useState('');
  const [transactionResult, setTransactionResult] = useState<Record<string, unknown> | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const startedRef = useRef(false);

  const parsed = bridgeUrl.split(':');
  const [tempHost, setTempHost] = useState(parsed[0] || '192.168.1.100');
  const [tempPort, setTempPort] = useState(parsed[1] || '8887');

  useEffect(() => {
    if (!open) {
      startedRef.current = false;
      setStep('connecting');
      setErrorMessage('');
      setTransactionResult(null);
    }
  }, [open]);

  useEffect(() => {
    if (!lastEvent) return;
    switch (lastEvent.type) {
      case 'card_inserted':
      case 'pin_entry':
        setStep('pin_entry');
        break;
      case 'processing':
        setStep('processing');
        break;
      case 'payment_complete':
        setStep('success');
        setTransactionResult(lastEvent.data || {});
        break;
      case 'payment_failed':
      case 'timeout':
      case 'cancelled':
        setStep('error');
        setErrorMessage(lastEvent.message || 'Paiement échoué');
        break;
    }
  }, [lastEvent]);

  const startPayment = useCallback(async () => {
    setStep('waiting_card');
    setErrorMessage('');
    setTransactionResult(null);
    const result = await initiatePayment(Math.round(amount * 100));
    if (result.success) {
      setStep('success');
      const txData = result as unknown as Record<string, unknown>;
      setTransactionResult(txData);
      setTimeout(() => {
        onPaymentComplete(true, txData);
        onOpenChange(false);
      }, 1500);
    } else {
      setStep('error');
      setErrorMessage(result.errorMessage || 'Paiement refusé');
    }
  }, [amount, initiatePayment, onPaymentComplete, onOpenChange]);

  useEffect(() => {
    if (!open || startedRef.current) return;
    startedRef.current = true;
    (async () => {
      setStep('connecting');
      const c = await connect();
      if (c) {
        await startPayment();
      } else {
        setStep('error');
        setErrorMessage("Impossible de se connecter au TPE. Vérifiez l'IP et le port.");
      }
    })().catch((err) => {
      console.error('[TpePaymentModal]', err);
      setStep('error');
      setErrorMessage("Erreur lors de l'initialisation du paiement");
      startedRef.current = false;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleCancel = () => {
    cancelTransaction();
    onOpenChange(false);
    onPaymentComplete(false);
  };

  const handleClose = () => {
    if (step === 'success') onPaymentComplete(true, transactionResult || undefined);
    else onPaymentComplete(false);
    onOpenChange(false);
  };

  const handleSaveSettings = () => {
    setBridgeUrl(`${tempHost}:${tempPort}`);
    setShowSettings(false);
    connect();
  };

  const renderSettings = () => (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="tpe-host">Adresse IP du TPE</Label>
        <Input id="tpe-host" value={tempHost} onChange={(e) => setTempHost(e.target.value)} placeholder="192.168.1.100" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="tpe-port">Port</Label>
        <Input id="tpe-port" type="number" value={tempPort} onChange={(e) => setTempPort(e.target.value)} placeholder="8887" />
        <p className="text-xs text-muted-foreground">Protocole Concert V3.20 — Ingenico, Verifone, PAX</p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setShowSettings(false)}>Annuler</Button>
        <Button onClick={handleSaveSettings}>Enregistrer</Button>
      </div>
    </div>
  );

  const renderStep = () => {
    switch (step) {
      case 'connecting':
        return (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
            <p className="text-lg">Connexion au terminal...</p>
            <p className="text-xs text-muted-foreground">{bridgeUrl}</p>
          </div>
        );
      case 'waiting_card':
        return (
          <div className="flex flex-col items-center gap-4 py-8">
            <CreditCard className="h-16 w-16 text-blue-500 animate-pulse" />
            <p className="text-xl font-semibold">Insérez ou présentez la carte</p>
            <p className="text-3xl font-bold text-green-500">{amount.toFixed(2)} €</p>
          </div>
        );
      case 'pin_entry':
        return (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-4 h-4 rounded-full bg-blue-500 animate-pulse" />
              ))}
            </div>
            <p className="text-xl font-semibold">Saisie du code PIN</p>
          </div>
        );
      case 'processing':
        return (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
            <p className="text-xl font-semibold">Transaction en cours...</p>
          </div>
        );
      case 'success':
        return (
          <div className="flex flex-col items-center gap-4 py-8">
            <CheckCircle className="h-16 w-16 text-green-500" />
            <p className="text-xl font-semibold text-green-500">Paiement accepté</p>
            <p className="text-3xl font-bold">{amount.toFixed(2)} €</p>
            <Button onClick={handleClose} className="mt-4">Fermer</Button>
          </div>
        );
      case 'error':
        return (
          <div className="flex flex-col items-center gap-4 py-8">
            <XCircle className="h-16 w-16 text-red-500" />
            <p className="text-xl font-semibold text-red-500">Paiement refusé</p>
            <p className="text-muted-foreground text-center text-sm">{errorMessage}</p>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={handleClose}>Fermer</Button>
              <Button onClick={startPayment}>Réessayer</Button>
            </div>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Paiement par carte
            </span>
            <div className="flex items-center gap-2">
              {isConnected ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4 text-red-500" />}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  const addr = bridgeUrl.split(':');
                  setTempHost(addr[0] || '192.168.1.100');
                  setTempPort(addr[1] || '8887');
                  setShowSettings(!showSettings);
                }}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {showSettings ? renderSettings() : renderStep()}

        {step !== 'success' && step !== 'error' && !showSettings && (
          <div className="flex justify-center pt-4 border-t">
            <Button variant="destructive" onClick={handleCancel}>
              Annuler la transaction
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
