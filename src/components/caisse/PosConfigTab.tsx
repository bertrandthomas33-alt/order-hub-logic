import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
import { Search, Settings } from 'lucide-react';

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  category_id: string;
  price_b2c: number;
  active: boolean;
}

interface Client {
  id: string;
  name: string;
}

interface HiddenCatRow {
  category_name: string;
  client_id: string | null;
}
interface HiddenProdRow {
  product_id: string;
  client_id: string | null;
}

const GLOBAL = '__global__';

export function PosConfigTab() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [hiddenCats, setHiddenCats] = useState<HiddenCatRow[]>([]);
  const [hiddenProds, setHiddenProds] = useState<HiddenProdRow[]>([]);
  const [scope, setScope] = useState<string>(GLOBAL); // GLOBAL ou client_id
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [{ data: cats }, { data: prods }, { data: whs }, { data: hc }, { data: hp }] =
        await Promise.all([
          supabase.from('categories').select('id, name').order('name'),
          supabase
            .from('products')
            .select('id, name, category_id, price_b2c, active')
            .order('name'),
          supabase.from('clients').select('id, name').eq('active', true).order('name'),
          supabase.from('pos_hidden_categories').select('category_name, client_id'),
          supabase.from('pos_hidden_products').select('product_id, client_id'),
        ]);

      setCategories((cats || []) as Category[]);
      setProducts((prods || []) as Product[]);
      setClients((whs || []) as Client[]);
      setHiddenCats((hc || []) as HiddenCatRow[]);
      setHiddenProds((hp || []) as HiddenProdRow[]);
    } catch (e) {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const currentWh = scope === GLOBAL ? null : scope;

  const isCatHidden = (name: string) =>
    hiddenCats.some(
      (r) => r.category_name === name && (r.client_id ?? null) === currentWh,
    );
  const isProdHidden = (id: string) =>
    hiddenProds.some(
      (r) => r.product_id === id && (r.client_id ?? null) === currentWh,
    );

  const toggleCategory = async (name: string, visible: boolean) => {
    if (visible) {
      let q = supabase.from('pos_hidden_categories').delete().eq('category_name', name);
      q = currentWh ? q.eq('client_id', currentWh) : q.is('client_id', null);
      const { error } = await q;
      if (error) return toast.error('Échec');
      setHiddenCats((prev) =>
        prev.filter(
          (r) => !(r.category_name === name && (r.client_id ?? null) === currentWh),
        ),
      );
    } else {
      const { error } = await supabase
        .from('pos_hidden_categories')
        .insert({ category_name: name, client_id: currentWh });
      if (error) return toast.error('Échec');
      setHiddenCats((prev) => [...prev, { category_name: name, client_id: currentWh }]);
    }
  };

  const toggleProduct = async (id: string, visible: boolean) => {
    if (visible) {
      let q = supabase.from('pos_hidden_products').delete().eq('product_id', id);
      q = currentWh ? q.eq('client_id', currentWh) : q.is('client_id', null);
      const { error } = await q;
      if (error) return toast.error('Échec');
      setHiddenProds((prev) =>
        prev.filter(
          (r) => !(r.product_id === id && (r.client_id ?? null) === currentWh),
        ),
      );
    } else {
      const { error } = await supabase
        .from('pos_hidden_products')
        .insert({ product_id: id, client_id: currentWh });
      if (error) return toast.error('Échec');
      setHiddenProds((prev) => [...prev, { product_id: id, client_id: currentWh }]);
    }
  };

  const eligibleProds = products.filter((p) => p.active && (p.price_b2c || 0) > 0);
  const uniqueCatNames = Array.from(new Set(categories.map((c) => c.name))).sort();

  const productsByCatName = new Map<string, Product[]>();
  eligibleProds.forEach((p) => {
    const cat = categories.find((c) => c.id === p.category_id);
    const name = cat?.name || 'Sans catégorie';
    if (!productsByCatName.has(name)) productsByCatName.set(name, []);
    productsByCatName.get(name)!.push(p);
  });

  const visibleCatCount = uniqueCatNames.filter((n) => !isCatHidden(n)).length;
  const visibleProdCount = eligibleProds.filter((p) => !isProdHidden(p.id)).length;

  const filteredCatNames = uniqueCatNames.filter((n) => {
    if (!search) return true;
    const q = search.toLowerCase();
    if (n.toLowerCase().includes(q)) return true;
    return (productsByCatName.get(n) || []).some((p) =>
      p.name.toLowerCase().includes(q),
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Configuration de :</span>
          <Select value={scope} onValueChange={setScope}>
            <SelectTrigger className="w-[240px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={GLOBAL}>Tous les points de vente (défaut)</SelectItem>
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
            placeholder="Rechercher une catégorie ou un article..."
            className="pl-9"
          />
        </div>
        <div className="text-sm text-muted-foreground ml-auto">
          {visibleCatCount}/{uniqueCatNames.length} catégories ·{' '}
          {visibleProdCount}/{eligibleProds.length} articles
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <ScrollArea className="h-[560px]">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Chargement...</div>
          ) : filteredCatNames.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Aucune catégorie.</div>
          ) : (
            <div className="divide-y divide-border">
              {filteredCatNames.map((catName) => {
                const catVisible = !isCatHidden(catName);
                const items = productsByCatName.get(catName) || [];
                return (
                  <div key={catName} className="p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div>
                        <div className="font-semibold text-foreground">{catName}</div>
                        <div className="text-xs text-muted-foreground">
                          {items.filter((p) => !isProdHidden(p.id)).length}/{items.length}{' '}
                          articles visibles
                        </div>
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">
                          {catVisible ? 'Affichée' : 'Masquée'}
                        </span>
                        <Switch
                          checked={catVisible}
                          onCheckedChange={(v) => toggleCategory(catName, v)}
                        />
                      </label>
                    </div>

                    {catVisible && items.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-2 border-l-2 border-border">
                        {items.map((p) => {
                          const visible = !isProdHidden(p.id);
                          return (
                            <label
                              key={p.id}
                              className="flex items-center justify-between gap-2 px-3 py-2 rounded-md hover:bg-muted/40"
                            >
                              <span className="text-sm truncate">{p.name}</span>
                              <Switch
                                checked={visible}
                                onCheckedChange={(v) => toggleProduct(p.id, v)}
                              />
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      <p className="text-xs text-muted-foreground flex items-start gap-2">
        <Settings className="h-3 w-3 mt-0.5 flex-shrink-0" />
        Choisissez le point de vente à configurer en haut à gauche. La configuration
        « Tous les points de vente » s'applique partout par défaut ; chaque point de
        vente peut ensuite masquer des éléments supplémentaires de manière indépendante.
      </p>
    </div>
  );
}
