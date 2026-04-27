import { Fragment, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
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

export function PosConfigTab() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [hiddenCats, setHiddenCats] = useState<Set<string>>(new Set());
  const [hiddenProds, setHiddenProds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [{ data: cats }, { data: prods }, { data: hc }, { data: hp }] =
        await Promise.all([
          supabase.from('categories').select('id, name').order('name'),
          supabase
            .from('products')
            .select('id, name, category_id, price_b2c, active')
            .order('name'),
          supabase.from('pos_hidden_categories').select('category_name'),
          supabase.from('pos_hidden_products').select('product_id'),
        ]);

      setCategories((cats || []) as Category[]);
      setProducts((prods || []) as Product[]);
      setHiddenCats(new Set((hc || []).map((r: any) => r.category_name)));
      setHiddenProds(new Set((hp || []).map((r: any) => r.product_id)));
    } catch (e) {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  // Catégorie POS = unique par nom
  const uniqueCatNames = Array.from(
    new Set(categories.map((c) => c.name))
  ).sort();

  const toggleCategory = async (name: string, visible: boolean) => {
    if (visible) {
      const { error } = await supabase
        .from('pos_hidden_categories')
        .delete()
        .eq('category_name', name);
      if (error) return toast.error('Échec');
      setHiddenCats((prev) => {
        const n = new Set(prev);
        n.delete(name);
        return n;
      });
    } else {
      const { error } = await supabase
        .from('pos_hidden_categories')
        .insert({ category_name: name });
      if (error) return toast.error('Échec');
      setHiddenCats((prev) => new Set(prev).add(name));
    }
  };

  const toggleProduct = async (id: string, visible: boolean) => {
    if (visible) {
      const { error } = await supabase
        .from('pos_hidden_products')
        .delete()
        .eq('product_id', id);
      if (error) return toast.error('Échec');
      setHiddenProds((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
    } else {
      const { error } = await supabase
        .from('pos_hidden_products')
        .insert({ product_id: id });
      if (error) return toast.error('Échec');
      setHiddenProds((prev) => new Set(prev).add(id));
    }
  };

  // Articles candidats (actifs avec prix B2C)
  const eligibleProds = products.filter(
    (p) => p.active && (p.price_b2c || 0) > 0
  );

  // Map nom catégorie -> articles éligibles
  const productsByCatName = new Map<string, Product[]>();
  eligibleProds.forEach((p) => {
    const cat = categories.find((c) => c.id === p.category_id);
    const name = cat?.name || 'Sans catégorie';
    if (!productsByCatName.has(name)) productsByCatName.set(name, []);
    productsByCatName.get(name)!.push(p);
  });

  const visibleCatCount = uniqueCatNames.filter((n) => !hiddenCats.has(n)).length;
  const visibleProdCount = eligibleProds.filter((p) => !hiddenProds.has(p.id)).length;

  const filteredCatNames = uniqueCatNames.filter((n) => {
    if (!search) return true;
    const q = search.toLowerCase();
    if (n.toLowerCase().includes(q)) return true;
    return (productsByCatName.get(n) || []).some((p) =>
      p.name.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
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
          {visibleCatCount}/{uniqueCatNames.length} catégories · {visibleProdCount}/
          {eligibleProds.length} articles
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <ScrollArea className="h-[560px]">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Chargement...</div>
          ) : filteredCatNames.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Aucune catégorie.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredCatNames.map((catName) => {
                const catVisible = !hiddenCats.has(catName);
                const items = productsByCatName.get(catName) || [];
                return (
                  <div key={catName} className="p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div>
                        <div className="font-semibold text-foreground">{catName}</div>
                        <div className="text-xs text-muted-foreground">
                          {items.filter((p) => !hiddenProds.has(p.id)).length}/
                          {items.length} articles visibles
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
                          const visible = !hiddenProds.has(p.id);
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
        Par défaut, toutes les catégories et tous les articles actifs avec un prix
        B2C sont affichés sur la caisse. Désactivez le switch d'une catégorie pour
        la masquer entièrement, ou désactivez un article pour le retirer.
      </p>
    </div>
  );
}
