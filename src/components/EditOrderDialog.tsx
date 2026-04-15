import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2, Warehouse } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type OrderStatus = Database['public']['Enums']['order_status'];

const statusOptions: { value: OrderStatus; label: string }[] = [
  { value: 'pending', label: 'En attente' },
  { value: 'confirmed', label: 'Confirmée' },
  { value: 'in_production', label: 'En production' },
  { value: 'delivered', label: 'Livrée' },
];

interface EditOrderDialogProps {
  order: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function EditOrderDialog({ order, open, onOpenChange, onSaved }: EditOrderDialogProps) {
  const [status, setStatus] = useState<OrderStatus>('pending');
  const [notes, setNotes] = useState('');
  const [deliveryDate, setDeliveryDate] = useState<Date | undefined>();
  const [saving, setSaving] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  useEffect(() => {
    if (order) {
      setStatus(order.status);
      setNotes(order.notes || '');
      setDeliveryDate(order.delivery_date ? new Date(order.delivery_date + 'T00:00:00') : undefined);
    }
  }, [order]);

  const handleSave = async () => {
    if (!order) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status,
          notes: notes || null,
          delivery_date: deliveryDate ? format(deliveryDate, 'yyyy-MM-dd') : null,
        })
        .eq('id', order.id);

      if (error) throw error;
      toast.success('Commande mise à jour');
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Erreur lors de la mise à jour', { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifier la commande</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Info lecture seule */}
          <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-sm">
            <p><span className="font-medium">N°</span> {order.id.slice(0, 8)}</p>
            <p><span className="font-medium">Client :</span> {order.clients?.name || '—'}</p>
            <p className="flex items-center gap-1">
              <Warehouse className="h-3 w-3" />
              <span className="font-medium">Entrepôt :</span> {order.warehouses?.name || '—'}
            </p>
            <p><span className="font-medium">Total :</span> {Number(order.total).toFixed(2)} €</p>
          </div>

          {/* Articles */}
          {order.order_items?.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Articles</Label>
              <div className="space-y-1">
                {order.order_items.map((item: any) => (
                  <div key={item.id} className="flex justify-between rounded-md bg-muted/30 px-3 py-1.5 text-sm">
                    <span>{item.products?.name || 'Produit'}</span>
                    <span className="text-muted-foreground">x{Number(item.quantity)} — {(Number(item.unit_price) * Number(item.quantity)).toFixed(2)} €</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Statut */}
          <div className="space-y-2">
            <Label>Statut</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as OrderStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date de livraison */}
          <div className="space-y-2">
            <Label>Date de livraison</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {deliveryDate ? format(deliveryDate, 'dd MMMM yyyy', { locale: fr }) : 'Non définie'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={deliveryDate}
                  onSelect={(d) => { setDeliveryDate(d); setCalendarOpen(false); }}
                  locale={fr}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Instructions, remarques..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
