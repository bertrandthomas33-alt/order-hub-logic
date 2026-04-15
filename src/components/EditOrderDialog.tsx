import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2, Warehouse, Trash2, AlertTriangle } from 'lucide-react';
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

interface EditableItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  deleted: boolean;
}

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
  const [items, setItems] = useState<EditableItem[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

export function EditOrderDialog({ order, open, onOpenChange, onSaved }: EditOrderDialogProps) {
  const [status, setStatus] = useState<OrderStatus>('pending');
  const [notes, setNotes] = useState('');
  const [deliveryDate, setDeliveryDate] = useState<Date | undefined>();
  const [saving, setSaving] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [items, setItems] = useState<EditableItem[]>([]);

  useEffect(() => {
    if (order) {
      setStatus(order.status);
      setNotes(order.notes || '');
      setDeliveryDate(order.delivery_date ? new Date(order.delivery_date + 'T00:00:00') : undefined);
      setItems(
        (order.order_items || []).map((item: any) => ({
          id: item.id,
          product_name: item.products?.name || 'Produit',
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          deleted: false,
        }))
      );
    }
  }, [order]);

  const updateItemQuantity = (id: string, qty: number) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity: Math.max(0.1, qty) } : i)));
  };

  const toggleDeleteItem = (id: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, deleted: !i.deleted } : i)));
  };

  const activeItems = items.filter((i) => !i.deleted);
  const newTotal = activeItems.reduce((s, i) => s + i.unit_price * i.quantity, 0);

  const handleSave = async () => {
    if (!order) return;
    if (activeItems.length === 0) {
      toast.error('La commande doit contenir au moins un article');
      return;
    }
    setSaving(true);
    try {
      // Update order
      const { error } = await supabase
        .from('orders')
        .update({
          status,
          notes: notes || null,
          delivery_date: deliveryDate ? format(deliveryDate, 'yyyy-MM-dd') : null,
          total: newTotal,
        })
        .eq('id', order.id);
      if (error) throw error;

      // Update quantities for active items
      for (const item of activeItems) {
        const orig = order.order_items?.find((o: any) => o.id === item.id);
        if (orig && Number(orig.quantity) !== item.quantity) {
          const { error: itemErr } = await supabase
            .from('order_items')
            .update({ quantity: item.quantity })
            .eq('id', item.id);
          if (itemErr) throw itemErr;
        }
      }

      // Delete removed items
      const deletedItems = items.filter((i) => i.deleted);
      for (const item of deletedItems) {
        const { error: delErr } = await supabase.from('order_items').delete().eq('id', item.id);
        if (delErr) throw delErr;
      }

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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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
            <p><span className="font-medium">Total :</span> {newTotal.toFixed(2)} €</p>
          </div>

          {/* Articles éditables */}
          {items.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Articles</Label>
              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${item.deleted ? 'bg-destructive/10 opacity-50 line-through' : 'bg-muted/30'}`}
                  >
                    <span className="flex-1 truncate">{item.product_name}</span>
                    <Input
                      type="number"
                      min={0.1}
                      step={0.1}
                      value={item.quantity}
                      onChange={(e) => updateItemQuantity(item.id, parseFloat(e.target.value) || 0.1)}
                      className="w-20 h-7 text-center"
                      disabled={item.deleted}
                    />
                    <span className="text-muted-foreground w-20 text-right">
                      {(item.unit_price * item.quantity).toFixed(2)} €
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => toggleDeleteItem(item.id)}
                    >
                      <Trash2 className={`h-3.5 w-3.5 ${item.deleted ? 'text-muted-foreground' : 'text-destructive'}`} />
                    </Button>
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
                  className="pointer-events-auto"
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
