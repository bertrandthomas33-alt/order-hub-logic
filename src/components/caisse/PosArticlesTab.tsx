import { Fragment, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Search, Plus, ChevronRight, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Category {
  id: string;
  name: string;
  warehouse_id: string;
  tva_rate: number;
}

const TVA_OPTIONS = [5.5, 10, 20] as const;

interface Product {
  id: string;
  name: string;
  category_id: string;
  price_b2c: number;
  price: number;
  active: boolean;
}

export function PosArticlesTab() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: cats } = await supabase
        .from('categories')
        .select('id, name, warehouse_id, tva_rate')
        .order('name');
      setCategories((cats || []) as Category[]);

      const { data: p } = await supabase
        .from('products')
        .select('id, name, category_id, price_b2c, price, active')
        .order('name');
      setProducts((p || []) as Product[]);
    } catch (e: any) {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  // Visible par défaut sur le POS si actif et prix B2C > 0
  const computeVisible = (p: Product) => p.active && (p.price_b2c || 0) > 0;

  const catName = (id: string) => categories.find((c) => c.id === id)?.name || '—';

  const [editingPrice, setEditingPrice] = useState<Record<string, string>>({});
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleCat = (id: string) =>
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));

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
          {visibleCount} / {products.length} visibles sur le POS
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const all: Record<string, boolean> = {};
            [...grouped, ...(uncategorized.length > 0 ? [{ category: { id: '__none__' } }] : [])].forEach(
              (g: any) => (all[g.category.id] = true)
            );
            setCollapsed(all);
          }}
          className="gap-1"
        >
          <ChevronsDownUp className="h-4 w-4" />
          Tout plier
        </Button>
        <Button variant="outline" size="sm" onClick={() => setCollapsed({})} className="gap-1">
          <ChevronsUpDown className="h-4 w-4" />
          Tout déplier
        </Button>
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
                </tr>
              </thead>
              <tbody>
                {[...grouped, ...(uncategorized.length > 0 ? [{ category: { id: '__none__', name: 'Sans catégorie', warehouse_id: '' }, items: uncategorized }] : [])].map((group) => {
                  const isCollapsed = !!collapsed[group.category.id];
                  return (
                  <Fragment key={group.category.id}>
                    <tr
                      key={`h-${group.category.id}`}
                      className="bg-muted/30 cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleCat(group.category.id)}
                    >
                      <td colSpan={4} className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <span className="inline-flex items-center gap-2">
                          <ChevronRight
                            className={`h-3.5 w-3.5 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
                          />
                          {group.category.name}{' '}
                          <span className="text-muted-foreground/60 font-normal normal-case">
                            ({group.items.length})
                          </span>
                        </span>
                      </td>
                    </tr>
                    {!isCollapsed && group.items.map((p) => {
                      const visible = computeVisible(p);
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
                            <Switch checked={visible} disabled />
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                  );
                })}
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
