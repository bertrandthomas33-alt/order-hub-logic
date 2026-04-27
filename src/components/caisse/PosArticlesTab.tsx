import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Search, Plus } from 'lucide-react';

interface Warehouse {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  warehouse_id: string;
}

interface Product {
  id: string;
  name: string;
  category_id: string;
  price_b2c: number;
  price: number;
  active: boolean;
}

interface PosOverride {
  product_id: string;
  visible: boolean;
}

export function PosArticlesTab() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState<string>('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('warehouses')
        .select('id, name')
        .eq('active', true)
        .order('name');
      setWarehouses(data || []);
      if (data && data.length > 0) setWarehouseId(data[0].id);
    })();
  }, []);

  useEffect(() => {
    if (!warehouseId) return;
    loadData(warehouseId);
  }, [warehouseId]);

  const loadData = async (whId: string) => {
    setLoading(true);
    try {
      const { data: cats } = await supabase
        .from('categories')
        .select('id, name, warehouse_id')
        .eq('warehouse_id', whId)
        .order('name');
      const catRows = (cats || []) as Category[];
      setCategories(catRows);
      const catIds = catRows.map((c) => c.id);

      let prods: Product[] = [];
      if (catIds.length > 0) {
        const { data: p } = await supabase
          .from('products')
          .select('id, name, category_id, price_b2c, price, active')
          .in('category_id', catIds)
          .order('name');
        prods = (p || []) as Product[];
      }
      setProducts(prods);

      const { data: ov } = await supabase
        .from('pos_products')
        .select('product_id, visible')
        .eq('warehouse_id', whId);
      const map: Record<string, boolean> = {};
      ((ov || []) as PosOverride[]).forEach((r) => {
        map[r.product_id] = r.visible;
      });
      setOverrides(map);
    } catch (e: any) {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  // Visible par défaut si actif et prix b2c > 0, sinon override décide
  const computeVisible = (p: Product) => {
    if (p.id in overrides) return overrides[p.id];
    return p.active && (p.price_b2c || 0) > 0;
  };

  const toggleVisible = async (p: Product, value: boolean) => {
    const { error } = await supabase
      .from('pos_products')
      .upsert(
        {
          warehouse_id: warehouseId,
          product_id: p.id,
          visible: value,
        },
        { onConflict: 'warehouse_id,product_id' }
      );
    if (error) {
      toast.error('Échec de la mise à jour');
      return;
    }
    setOverrides((prev) => ({ ...prev, [p.id]: value }));
  };

  const resetOverride = async (p: Product) => {
    const { error } = await supabase
      .from('pos_products')
      .delete()
      .eq('warehouse_id', warehouseId)
      .eq('product_id', p.id);
    if (error) {
      toast.error('Échec');
      return;
    }
    setOverrides((prev) => {
      const n = { ...prev };
      delete n[p.id];
      return n;
    });
  };

  const catName = (id: string) => categories.find((c) => c.id === id)?.name || '—';

  const [editingPrice, setEditingPrice] = useState<Record<string, string>>({});

  const savePrice = async (p: Product) => {
    const raw = editingPrice[p.id];
    if (raw === undefined) return;
    const value = parseFloat(raw.replace(',', '.'));
    if (isNaN(value) || value < 0) {
      toast.error('Prix invalide');
      return;
    }
    if (value === Number(p.price_b2c || 0)) {
      setEditingPrice((prev) => {
        const n = { ...prev };
        delete n[p.id];
        return n;
      });
      return;
    }
    const { error } = await supabase
      .from('products')
      .update({ price_b2c: value })
      .eq('id', p.id);
    if (error) {
      toast.error('Échec de la mise à jour du prix');
      return;
    }
    setProducts((prev) =>
      prev.map((it) => (it.id === p.id ? { ...it, price_b2c: value } : it))
    );
    setEditingPrice((prev) => {
      const n = { ...prev };
      delete n[p.id];
      return n;
    });
    toast.success('Prix mis à jour');
  };

  const filtered = products.filter((p) => {
    if (!showInactive && !p.active) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Groupage par catégorie
  const grouped = categories
    .map((c) => ({
      category: c,
      items: filtered.filter((p) => p.category_id === c.id),
    }))
    .filter((g) => g.items.length > 0)
    .sort((a, b) => a.category.name.localeCompare(b.category.name));

  const uncategorized = filtered.filter(
    (p) => !categories.some((c) => c.id === p.category_id)
  );

  const visibleCount = products.filter((p) => computeVisible(p)).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[220px]">
          <Select value={warehouseId} onValueChange={setWarehouseId}>
            <SelectTrigger>
              <SelectValue placeholder="Point de vente" />
            </SelectTrigger>
            <SelectContent>
              {warehouses.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un article..."
            className="pl-9"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Switch checked={showInactive} onCheckedChange={setShowInactive} />
          Inclure les inactifs
        </label>
        <div className="text-sm text-muted-foreground ml-auto">
          {visibleCount} / {products.length} visibles
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <ScrollArea className="h-[520px]">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Chargement...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Aucun article. Sélectionnez un autre point de vente ou ajustez les filtres.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground sticky top-0 z-10">
                <tr>
                  <th className="text-left px-4 py-2">Article</th>
                  <th className="text-right px-4 py-2 w-40">Prix B2C</th>
                  <th className="text-center px-4 py-2 w-24">Actif BO</th>
                  <th className="text-center px-4 py-2 w-28">Visible POS</th>
                  <th className="text-right px-4 py-2 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {[...grouped, ...(uncategorized.length > 0 ? [{ category: { id: '__none__', name: 'Sans catégorie', warehouse_id: '' }, items: uncategorized }] : [])].map((group) => (
                  <>
                    <tr key={`h-${group.category.id}`} className="bg-muted/30">
                      <td colSpan={5} className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {group.category.name} <span className="text-muted-foreground/60 font-normal normal-case">({group.items.length})</span>
                      </td>
                    </tr>
                    {group.items.map((p) => {
                      const visible = computeVisible(p);
                      const overridden = p.id in overrides;
                      const isEditing = p.id in editingPrice;
                      return (
                        <tr key={p.id} className="border-t border-border hover:bg-muted/30">
                          <td className="px-4 py-2 font-medium">{p.name}</td>
                          <td className="px-4 py-2 text-right">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={isEditing ? editingPrice[p.id] : Number(p.price_b2c || 0).toFixed(2)}
                              onChange={(e) =>
                                setEditingPrice((prev) => ({ ...prev, [p.id]: e.target.value }))
                              }
                              onBlur={() => isEditing && savePrice(p)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                              }}
                              className="h-8 text-right ml-auto w-24"
                            />
                          </td>
                          <td className="px-4 py-2 text-center">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-xs ${
                                p.active
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {p.active ? 'Oui' : 'Non'}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-center">
                            <Switch
                              checked={visible}
                              onCheckedChange={(v) => toggleVisible(p, v)}
                            />
                          </td>
                          <td className="px-4 py-2 text-right">
                            {overridden && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => resetOverride(p)}
                                title="Revenir au comportement par défaut"
                              >
                                Défaut
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </>
                ))}
              </tbody>
            </table>
          )}
        </ScrollArea>
      </div>

      <p className="text-xs text-muted-foreground flex items-start gap-2">
        <Plus className="h-3 w-3 mt-0.5 flex-shrink-0" />
        Par défaut, tous les articles actifs avec un prix B2C sont visibles sur la
        caisse. Activez le switch pour ajouter manuellement un article (même
        inactif), ou désactivez-le pour le masquer du POS sur ce point de vente.
      </p>
    </div>
  );
}
