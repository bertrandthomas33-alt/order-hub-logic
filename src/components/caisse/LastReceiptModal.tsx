import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import {
  printReceipt,
  getPrinterIp,
  type ReceiptData,
} from '@/services/printer/EpsonPrinterService';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receiptData: ReceiptData | null;
}

export function LastReceiptModal({ open, onOpenChange, receiptData }: Props) {
  const handleReprint = async () => {
    if (!receiptData) return;
    if (!getPrinterIp()) {
      toast.error('Aucune imprimante configurée');
      return;
    }
    try {
      await printReceipt(receiptData);
      toast.success('Ticket réimprimé !');
    } catch {
      toast.error('Erreur lors de la réimpression');
    }
  };

  if (!receiptData) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Dernier ticket</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8 text-gray-400">Aucun ticket disponible</div>
        </DialogContent>
      </Dialog>
    );
  }

  const formatDate = (date: Date) =>
    new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Dernier ticket</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReprint}
              className="bg-gray-700 border-gray-600 hover:bg-gray-600"
            >
              <Printer className="h-4 w-4 mr-2" />
              Réimprimer
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="bg-white text-black rounded-lg p-4 font-mono text-sm">
          <div className="text-center border-b border-dashed border-gray-400 pb-2 mb-2">
            <div className="font-bold text-lg">{receiptData.storeName}</div>
            <div className="text-xs text-gray-600">Ticket N° {receiptData.ticketNumber}</div>
            <div className="text-xs text-gray-600">{formatDate(receiptData.date)}</div>
          </div>
          <ScrollArea className="max-h-60">
            <div className="space-y-1">
              {receiptData.lines.map((line, idx) => (
                <div key={idx} className="flex justify-between text-xs">
                  <span className="flex-1">
                    {line.quantity}x {line.productName}
                  </span>
                  <span className="ml-2">{line.totalPrice.toFixed(2)}€</span>
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="border-t border-dashed border-gray-400 pt-2 mt-2 space-y-1">
            <div className="flex justify-between text-xs">
              <span>Sous-total HT</span>
              <span>{receiptData.subtotal.toFixed(2)}€</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>TVA {receiptData.tvaRate}%</span>
              <span>{receiptData.tvaAmount.toFixed(2)}€</span>
            </div>
            <div className="flex justify-between font-bold text-base border-t border-gray-400 pt-1">
              <span>TOTAL</span>
              <span>{receiptData.total.toFixed(2)}€</span>
            </div>
          </div>
          <div className="text-center text-xs text-gray-600 mt-2 pt-2 border-t border-dashed border-gray-400">
            Payé par {receiptData.paymentMethod === 'cash' ? 'Espèces' : 'Carte'}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
