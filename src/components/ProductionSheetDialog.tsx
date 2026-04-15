import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Download, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ProductionSheetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orders: any[];
  onRefresh: () => void;
}

export function ProductionSheetDialog({ open, onOpenChange, orders, onRefresh }: ProductionSheetDialogProps) {
  const [confirmOrders, setConfirmOrders] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Tomorrow's date
  const tomorrow = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  // Filter orders: pending + tomorrow's delivery date
  const filteredOrders = useMemo(() => {
    return orders.filter(
      (o: any) => o.status === 'pending' && o.delivery_date === tomorrow
    );
  }, [orders, tomorrow]);

  // Build data grouped by warehouse
  const warehouseData = useMemo(() => {
    const result: Record<string, {
      warehouseName: string;
      clients: string[];
      clientIds: string[];
      products: string[];
      grid: Record<string, Record<string, number>>; // product -> client -> qty
      orderIds: string[];
    }> = {};

    filteredOrders.forEach((order: any) => {
      const whId = order.warehouse_id;
      const whName = order.warehouses?.name || 'Inconnu';
      const clientName = order.clients?.name || 'Inconnu';
      const clientId = order.client_id;

      if (!result[whId]) {
        result[whId] = { warehouseName: whName, clients: [], clientIds: [], products: [], grid: {}, orderIds: [] };
      }

      if (!result[whId].clientIds.includes(clientId)) {
        result[whId].clients.push(clientName);
        result[whId].clientIds.push(clientId);
      }

      result[whId].orderIds.push(order.id);

      order.order_items?.forEach((item: any) => {
        const productName = item.products?.name || 'Produit';
        if (!result[whId].products.includes(productName)) {
          result[whId].products.push(productName);
        }
        if (!result[whId].grid[productName]) {
          result[whId].grid[productName] = {};
        }
        const existing = result[whId].grid[productName][clientName] || 0;
        result[whId].grid[productName][clientName] = existing + Number(item.quantity);
      });
    });

    // Sort products alphabetically
    Object.values(result).forEach((wh) => {
      wh.products.sort();
      wh.clients.sort();
    });

    return result;
  }, [filteredOrders]);

  const warehouseEntries = Object.entries(warehouseData);
  const totalOrders = filteredOrders.length;

  const handleGeneratePDF = () => {
    if (warehouseEntries.length === 0) {
      toast.error('Aucune commande à traiter');
      return;
    }

    const doc = new jsPDF({ orientation: 'landscape' });

    warehouseEntries.forEach(([, wh], idx) => {
      if (idx > 0) doc.addPage();

      doc.setFontSize(16);
      doc.text(`Fiche de production — ${wh.warehouseName}`, 14, 20);
      doc.setFontSize(10);
      doc.text(`Date de livraison : ${new Date(tomorrow).toLocaleDateString('fr-FR')}`, 14, 28);
      doc.text(`${wh.clients.length} client(s) — ${wh.products.length} produit(s)`, 14, 34);

      const headers = ['Produit', ...wh.clients, 'Total'];
      const body = wh.products.map((product) => {
        const row = [product];
        let total = 0;
        wh.clients.forEach((client) => {
          const qty = wh.grid[product]?.[client] || 0;
          total += qty;
          row.push(qty > 0 ? String(qty) : '');
        });
        row.push(String(total));
        return row;
      });

      autoTable(doc, {
        startY: 40,
        head: [headers],
        body,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [56, 102, 65], textColor: 255, fontSize: 8 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 40 },
          [headers.length - 1]: { fontStyle: 'bold', fillColor: [240, 240, 240] },
        },
      });
    });

    doc.save(`fiche-production-${tomorrow}.pdf`);
    toast.success('PDF téléchargé !');
  };

  const handleConfirmAndGenerate = async () => {
    setProcessing(true);
    try {
      handleGeneratePDF();

      if (confirmOrders) {
        const allOrderIds = warehouseEntries.flatMap(([, wh]) => wh.orderIds);
        const uniqueIds = [...new Set(allOrderIds)];
        const { error } = await supabase
          .from('orders')
          .update({ status: 'confirmed' as any })
          .in('id', uniqueIds);
        if (error) throw error;
        toast.success(`${uniqueIds.length} commande(s) confirmée(s)`);
        onRefresh();
      }

      onOpenChange(false);
    } catch (err: any) {
      toast.error('Erreur', { description: err.message });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Fiche de production — {new Date(tomorrow).toLocaleDateString('fr-FR')}
          </DialogTitle>
          <DialogDescription>
            Commandes en attente pour livraison demain • {totalOrders} commande(s)
          </DialogDescription>
        </DialogHeader>

        {warehouseEntries.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            Aucune commande en attente pour demain
          </div>
        ) : (
          <div className="space-y-8">
            {warehouseEntries.map(([whId, wh]) => (
              <div key={whId}>
                <h3 className="mb-3 font-heading text-lg font-bold text-foreground">
                  🏭 {wh.warehouseName}
                </h3>
                <div className="overflow-x-auto rounded-xl border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 z-10 bg-card font-bold">Produit</TableHead>
                        {wh.clients.map((client) => (
                          <TableHead key={client} className="text-center whitespace-nowrap">{client}</TableHead>
                        ))}
                        <TableHead className="text-center font-bold bg-muted">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {wh.products.map((product) => {
                        let total = 0;
                        return (
                          <TableRow key={product}>
                            <TableCell className="sticky left-0 z-10 bg-card font-medium whitespace-nowrap">{product}</TableCell>
                            {wh.clients.map((client) => {
                              const qty = wh.grid[product]?.[client] || 0;
                              total += qty;
                              return (
                                <TableCell key={client} className="text-center">
                                  {qty > 0 ? <span className="font-medium">{qty}</span> : <span className="text-muted-foreground">—</span>}
                                </TableCell>
                              );
                            })}
                            <TableCell className="text-center font-bold bg-muted">{total}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row items-start sm:items-center gap-4 pt-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={confirmOrders} onCheckedChange={(v) => setConfirmOrders(!!v)} />
            <span className="text-sm">Valider les commandes traitées (passer en « Confirmée »)</span>
          </label>
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
            <Button onClick={handleConfirmAndGenerate} disabled={processing || warehouseEntries.length === 0} className="gap-2">
              <Download className="h-4 w-4" />
              Télécharger PDF
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
