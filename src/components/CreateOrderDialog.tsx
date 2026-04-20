import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Minus, X, Search } from 'lucide-react';

type Client = { id: string; name: string };
type Warehouse = { id: string; name: string };
type Product = {
  id: string;
  name: string;
  price: number;
  unit: string;
  category_id: string;
  active?: boolean;
  categories?: { name: string; warehouses?: { id: string; name: string } } | null;
};

type Line = { product: Product; quantity: number };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Client[];
  warehouses: Warehouse[];
  products: Product[];
  onCreated: () => void;
}

export function CreateOrderDialog({ open, onOpenChange, clients, warehouses, products, onCreated }: Props) {
  const [clientId, setClientId] = useState<string>('');
  const [warehouseId, setWarehouseId] = useState<string>('');
  const [deliveryDate, setDeliveryDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [lines, setLines] = useState<Line[]>([]);
  const [search, setSearch] = useState('');
  const [allowedWarehouseIds, setAllowedWarehouseIds] = useState<string[] | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Reset on open
  useEffect(() => {
    if (open) {
      setClientId('');
      setWarehouseId('');
      setDeliveryDate('');
      setNotes('');
      setLines([]);
      setSearch('');
      setAllowedWarehouseIds(null);
    }
  }, [open]);

  // When client changes, fetch its associated warehouses (informational only)
  useEffect(() => {
    if (!clientId) {
      setAllowedWarehouseIds(null);
      return;
    }
    supabase
      .from('client_warehouses')
      .select('warehouse_id')
      .eq('client_id', clientId)
      .then(({ data }) => {
        const ids = (data ?? []).map((r: any) => r.warehouse_id);
        setAllowedWarehouseIds(ids);
      });
  }, [clientId]);

  // Admin can pick any active warehouse; we only show a hint when none are linked to the client.
  const availableWarehouses = warehouses;

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (p.active === false) return false;
      if (warehouseId && p.categories?.warehouses?.id !== warehouseId) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [products, warehouseId, search]);

  const groupedProducts = useMemo(() => {
    const groups = new Map<string, { name: string; items: Product[] }>();
    for (const p of filteredProducts) {
      const key = p.category_id || 'uncat';
      const name = p.categories?.name || 'Sans catégorie';
      if (!groups.has(key)) groups.set(key, { name, items: [] });
      groups.get(key)!.items.push(p);
    }
    return Array.from(groups.values())
      .map(g => ({ ...g, items: g.items.sort((a, b) => a.name.localeCompare(b.name)) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredProducts]);

  const total = lines.reduce((s, l) => s + l.quantity * (Number(l.product.price) || 0), 0);

  const addProduct = (p: Product) => {
    setLines(prev => {
      const existing = prev.find(l => l.product.id === p.id);
      if (existing) return prev.map(l => l.product.id === p.id ? { ...l, quantity: l.quantity + 1 } : l);
      return [...prev, { product: p, quantity: 1 }];
    });
  };

  const updateQty = (id: string, qty: number) => {
    if (qty <= 0) {
      setLines(prev => prev.filter(l => l.product.id !== id));
      return;
    }
    setLines(prev => prev.map(l => l.product.id === id ? { ...l, quantity: qty } : l));
  };

  const handleSubmit = async () => {
    if (!clientId) { toast.error('Sélectionnez un client'); return; }
    if (!warehouseId) { toast.error('Sélectionnez un entrepôt'); return; }
    if (lines.length === 0) { toast.error('Ajoutez au moins un produit'); return; }
    setSubmitting(true);
    try {
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          client_id: clientId,
          warehouse_id: warehouseId,
          delivery_date: deliveryDate || null,
          notes: notes || null,
          status: 'pending',
          total,
        })
        .select()
        .single();
      if (orderErr || !order) throw orderErr || new Error('Création commande échouée');

      const itemsPayload = lines.map(l => ({
        order_id: order.id,
        product_id: l.product.id,
        quantity: l.quantity,
        unit_price: Number(l.product.price) || 0,
      }));
      const { error: itemsErr } = await supabase.from('order_items').insert(itemsPayload);
      if (itemsErr) throw itemsErr;

      toast.success('Commande créée');
      onCreated();
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Erreur création commande');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouvelle commande</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Client *</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger><SelectValue placeholder="Choisir un client" /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Entrepôt *</Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un entrepôt" />
                </SelectTrigger>
                <SelectContent>
                  {availableWarehouses.map(w => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                      {allowedWarehouseIds && !allowedWarehouseIds.includes(w.id) ? ' (non associé)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {clientId && allowedWarehouseIds && allowedWarehouseIds.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">Aucun entrepôt associé à ce client — vous pouvez quand même en choisir un.</p>
              )}
            </div>
            <div>
              <Label>Date de livraison *</Label>
              <Input type="date" required value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optionnel" />
          </div>

          {/* Product picker */}
          <div className="rounded-xl border border-border p-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h4 className="font-semibold text-sm">Produits du catalogue</h4>
              <div className="relative w-64">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8 h-8"
                  placeholder="Rechercher..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  disabled={!warehouseId}
                />
              </div>
            </div>
            {!warehouseId ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Sélectionnez un entrepôt pour voir les produits</p>
            ) : filteredProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Aucun produit</p>
            ) : (
              <div className="max-h-72 overflow-y-auto space-y-3">
                {groupedProducts.map(group => (
                  <div key={group.name}>
                    <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1 mb-1 sticky top-0 bg-background py-1">
                      {group.name} <span className="text-muted-foreground/60 font-normal">({group.items.length})</span>
                    </h5>
                    <div className="space-y-1">
                      {group.items.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => addProduct(p)}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/60 transition-colors text-left text-sm"
                        >
                          <span className="font-medium">{p.name}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium">{Number(p.price).toFixed(2)} €/{p.unit}</span>
                            <Plus className="h-4 w-4 text-primary" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected lines */}
          {lines.length > 0 && (
            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produit</TableHead>
                    <TableHead className="text-center w-40">Quantité</TableHead>
                    <TableHead className="text-right">PU</TableHead>
                    <TableHead className="text-right">Sous-total</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map(l => (
                    <TableRow key={l.product.id}>
                      <TableCell className="font-medium">{l.product.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(l.product.id, l.quantity - 1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={l.quantity}
                            onChange={(e) => updateQty(l.product.id, parseFloat(e.target.value) || 0)}
                            className="h-7 w-16 text-center text-sm"
                          />
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(l.product.id, l.quantity + 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm">{Number(l.product.price).toFixed(2)} €</TableCell>
                      <TableCell className="text-right font-medium">{(l.quantity * Number(l.product.price)).toFixed(2)} €</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => updateQty(l.product.id, 0)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-end gap-3 px-4 py-3 bg-primary/5 border-t border-border">
                <span className="text-sm text-muted-foreground">Total :</span>
                <span className="text-lg font-bold">{total.toFixed(2)} €</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Création...' : 'Créer la commande'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
