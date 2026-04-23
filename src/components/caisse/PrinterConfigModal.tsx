import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Printer, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  getPrinterIp,
  setPrinterIp,
  testPrinterConnection,
} from '@/services/printer/EpsonPrinterService';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PrinterConfigModal({ open, onOpenChange }: Props) {
  const [ipAddress, setIpAddress] = useState('');
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (open) {
      setIpAddress(getPrinterIp());
      setStatus('idle');
    }
  }, [open]);

  const handleTest = async () => {
    if (!ipAddress) {
      toast.error('Veuillez entrer une adresse IP');
      return;
    }
    setTesting(true);
    setStatus('idle');
    try {
      const ok = await testPrinterConnection(ipAddress);
      setStatus(ok ? 'success' : 'error');
      ok ? toast.success('Imprimante connectée !') : toast.error('Connexion échouée');
    } catch {
      setStatus('error');
      toast.error('Erreur de connexion');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    if (!ipAddress) {
      toast.error('Veuillez entrer une adresse IP');
      return;
    }
    setPrinterIp(ipAddress);
    toast.success('Configuration sauvegardée');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Configuration imprimante
          </DialogTitle>
          <DialogDescription>Imprimante Epson TM-m30II en réseau</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="ip">Adresse IP</Label>
            <div className="flex gap-2">
              <Input
                id="ip"
                placeholder="192.168.1.100"
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
              />
              <Button variant="outline" onClick={handleTest} disabled={testing}>
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Tester'}
              </Button>
            </div>
          </div>
          {status !== 'idle' && (
            <div
              className={`flex items-center gap-2 p-3 rounded-lg ${
                status === 'success'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              }`}
            >
              {status === 'success' ? (
                <>
                  <CheckCircle className="h-5 w-5" />
                  <span>Imprimante détectée</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5" />
                  <span>Connexion échouée</span>
                </>
              )}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave}>Enregistrer</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
