import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { toast } from 'sonner';
import { Plus, Trash2, Eye, EyeOff, Settings, RotateCcw, Users } from 'lucide-react';

interface Category {
  id: string;
  name: string;
}
interface Product {
  id: string;
  name: string;
  category_id: string;
  price_b2c: number;
  price: number;
  active: boolean;
}
interface PosConfig {
  id: string;
  name: string;
  description: string | null;
}
interface Client {
  id: string;
  name: string;
  pos_configuration_id: string | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  Soupes: 'bg-orange-600',
  Antipasti: 'bg-amber-700',
  'Produits mer': 'bg-blue-500',
  Sauces: 'bg-red-700',
  Fromages: 'bg-yellow-600',
  Viandes: 'bg-red-800',
  Épicerie: 'bg-amber-800',
  'Fruits/pulpe': 'bg-green-600',
  Frais: 'bg-blue-400',
  Surgelé: 'bg-blue-700',
};

export function PosConfigTab() {
  const [configs, setConfigs] = useState<PosConfig[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string>('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [hiddenCats, setHiddenCats] = useState<string[]>([]);
  const [hiddenProds, setHiddenProds] = useState<string[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [assignOpen, setAssignOpen] = useState(false);

  useEffect(() => {
    loadInitial();
  }, []);

  useEffect(() => {
    if (selectedConfigId) loadConfigItems(selectedConfigId);
    else {
      setHiddenCats([]);
      setHiddenProds([]);
    }
  }, [selectedConfigId]);

  const loadInitial = async () => {
    setLoading(true);
    try {
      const [{ data: cfgs }, { data: cats }, { data: prods }, { data: cls }] =
        await Promise.all([
          supabase.from('pos_configurations').select('id, name, description').order('name'),
          supabase.from('categories').select('id, name').order('name'),
          supabase
            .from('products')
            .select('id, name, category_id, price_b2c, price, active')
            .order('name'),
          supabase
            .from('clients')
            .select('id, name, pos_configuration_id')
            .eq('active', true)
            .order('name'),
        ]);
      setConfigs((cfgs || []) as PosConfig[]);
      setCategories((cats || []) as Category[]);
      setProducts((prods || []) as Product[]);
      setClients((cls || []) as Client[]);
      if (cfgs && cfgs.length > 0 && !selectedConfigId) {
        setSelectedConfigId(cfgs[0].id);
      }
    } catch {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const loadConfigItems = async (cfgId: string) => {
    const [{ data: hc }, { data: hp }] = await Promise.all([
      supabase
        .from('pos_configuration_hidden_categories')
        .select('category_name')
        .eq('configuration_id', cfgId),
      supabase
        .from('pos_configuration_hidden_products')
        .select('product_id')
        .eq('configuration_id', cfgId),
    ]);
    setHiddenCats(((hc || []) as { category_name: string }[]).map((r) => r.category_name));
    setHiddenProds(((hp || []) as { product_id: string }[]).map((r) => r.product_id));
  };

  const eligibleProducts = useMemo(
    () => products.filter((p) => p.active && (p.price_b2c || 0) > 0),
    [products],
  );

  const allCategoryNames = useMemo(() => {
    const set = new Set<string>();
    eligibleProducts.forEach((p) => {
      const c = categories.find((c) => c.id === p.category_id);
      if (c) set.add(c.name);
    });
    return Array.from(set).sort();
  }, [eligibleProducts, categories]);

  const visibleCategoryNames = useMemo(
    () => allCategoryNames.filter((n) => !hiddenCats.includes(n)),
    [allCategoryNames, hiddenCats],
  );

  useEffect(() => {
    if (visibleCategoryNames.length > 0 && !visibleCategoryNames.includes(selectedCategory)) {
      setSelectedCategory(visibleCategoryNames[0]);
    }
    if (visibleCategoryNames.length === 0) setSelectedCategory('');
  }, [visibleCategoryNames, selectedCategory]);

  const productsForSelectedCat = useMemo(() => {
    if (!selectedCategory) return [];
    return eligibleProducts.filter((p) => {
      const c = categories.find((c) => c.id === p.category_id);
      return c?.name === selectedCategory;
    });
  }, [eligibleProducts, categories, selectedCategory]);

  // ======== Actions ========
  const createConfig = async () => {
    if (!newName.trim()) return toast.error('Nom requis');
    const { data, error } = await supabase
      .from('pos_configurations')
      .insert({ name: newName.trim(), description: newDesc.trim() || null })
      .select()
      .single();
    if (error) return toast.error(error.message);
    setConfigs((p) => [...p, data as PosConfig].sort((a, b) => a.name.localeCompare(b.name)));
    setSelectedConfigId(data!.id);
    setCreateOpen(false);
    setNewName('');
    setNewDesc('');
    toast.success('Configuration créée');
  };

  const deleteConfig = async () => {
    if (!selectedConfigId) return;
    if (!confirm('Supprimer cette configuration ? Les points de vente assignés seront déliés.'))
      return;
    const { error } = await supabase
      .from('pos_configurations')
      .delete()
      .eq('id', selectedConfigId);
    if (error) return toast.error(error.message);
    setConfigs((p) => p.filter((c) => c.id !== selectedConfigId));
    setSelectedConfigId('');
    loadInitial();
    toast.success('Supprimée');
  };

  const hideCategory = async (name: string) => {
    if (!selectedConfigId) return;
    const { error } = await supabase
      .from('pos_configuration_hidden_categories')
      .insert({ configuration_id: selectedConfigId, category_name: name });
    if (error) return toast.error(error.message);
    setHiddenCats((p) => [...p, name]);
  };

  const showCategory = async (name: string) => {
    if (!selectedConfigId) return;
    const { error } = await supabase
      .from('pos_configuration_hidden_categories')
      .delete()
      .eq('configuration_id', selectedConfigId)
      .eq('category_name', name);
    if (error) return toast.error(error.message);
    setHiddenCats((p) => p.filter((n) => n !== name));
  };

  const hideProduct = async (id: string) => {
    if (!selectedConfigId) return;
    const { error } = await supabase
      .from('pos_configuration_hidden_products')
      .insert({ configuration_id: selectedConfigId, product_id: id });
    if (error) return toast.error(error.message);
    setHiddenProds((p) => [...p, id]);
  };

  const showProduct = async (id: string) => {
    if (!selectedConfigId) return;
    const { error } = await supabase
      .from('pos_configuration_hidden_products')
      .delete()
      .eq('configuration_id', selectedConfigId)
      .eq('product_id', id);
    if (error) return toast.error(error.message);
    setHiddenProds((p) => p.filter((x) => x !== id));
  };

  const resetAll = async () => {
    if (!selectedConfigId) return;
    if (!confirm('Réafficher tous les éléments masqués ?')) return;
    await Promise.all([
      supabase
        .from('pos_configuration_hidden_categories')
        .delete()
        .eq('configuration_id', selectedConfigId),
      supabase
        .from('pos_configuration_hidden_products')
        .delete()
        .eq('configuration_id', selectedConfigId),
    ]);
    setHiddenCats([]);
    setHiddenProds([]);
    toast.success('Réinitialisée');
  };

  const assignClient = async (clientId: string, configurationId: string | null) => {
    const { error } = await supabase
      .from('clients')
      .update({ pos_configuration_id: configurationId })
      .eq('id', clientId);
    if (error) return toast.error(error.message);
    setClients((p) =>
      p.map((c) => (c.id === clientId ? { ...c, pos_configuration_id: configurationId } : c)),
    );
  };

  const currentConfig = configs.find((c) => c.id === selectedConfigId);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Configuration :</span>
          <Select value={selectedConfigId} onValueChange={setSelectedConfigId}>
            <SelectTrigger className="w-[260px]">
              <SelectValue placeholder="Aucune configuration" />
            </SelectTrigger>
            <SelectContent>
              {configs.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Nouvelle
        </Button>
        {selectedConfigId && (
          <>
            <Button size="sm" variant="outline" onClick={resetAll}>
              <RotateCcw className="h-4 w-4 mr-1" /> Tout réafficher
            </Button>
            <Button size="sm" variant="outline" onClick={() => setAssignOpen(true)}>
              <Users className="h-4 w-4 mr-1" /> Assigner aux PDV
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive"
              onClick={deleteConfig}
            >
              <Trash2 className="h-4 w-4 mr-1" /> Supprimer
            </Button>
          </>
        )}
        <div className="ml-auto text-xs text-muted-foreground">
          {hiddenCats.length} cat. masquée(s) · {hiddenProds.length} article(s) masqué(s)
        </div>
      </div>

      {!selectedConfigId ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
          <Settings className="h-8 w-8 mx-auto mb-3 opacity-50" />
          <p className="mb-2">Aucune configuration sélectionnée</p>
          <p className="text-xs">Créez une configuration pour commencer.</p>
        </div>
      ) : loading ? (
        <div className="p-8 text-center text-muted-foreground">Chargement...</div>
      ) : (
        <>
          <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 flex items-start gap-2">
            <Settings className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>
              Aperçu du POS pour <strong>{currentConfig?.name}</strong>. <strong>Clic droit</strong>{' '}
              sur une catégorie ou un article pour le masquer/afficher. Les éléments masqués
              apparaissent grisés.
            </span>
          </div>

          {/* Aperçu POS */}
          <div className="rounded-xl border border-border bg-gray-900 text-white overflow-hidden">
            <div className="grid grid-cols-12 min-h-[560px]">
              {/* Catégories */}
              <div className="col-span-3 bg-gray-800 border-r border-gray-700">
                <div className="p-3 border-b border-gray-700">
                  <h2 className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
                    Catégories
                  </h2>
                </div>
                <ScrollArea className="h-[520px]">
                  <div className="flex flex-col">
                    {allCategoryNames.map((c) => {
                      const hidden = hiddenCats.includes(c);
                      const active = selectedCategory === c;
                      return (
                        <ContextMenu key={c}>
                          <ContextMenuTrigger asChild>
                            <button
                              onClick={() => !hidden && setSelectedCategory(c)}
                              className={`p-3 text-left text-sm font-medium transition-colors border-b border-gray-700 relative ${
                                hidden
                                  ? 'bg-gray-800 text-gray-500 line-through opacity-60'
                                  : active
                                    ? CATEGORY_COLORS[c] || 'bg-blue-600'
                                    : 'bg-gray-700 hover:bg-gray-600'
                              }`}
                            >
                              <span className="flex items-center justify-between">
                                <span>{c}</span>
                                {hidden && <EyeOff className="h-3 w-3" />}
                              </span>
                            </button>
                          </ContextMenuTrigger>
                          <ContextMenuContent>
                            {hidden ? (
                              <ContextMenuItem onClick={() => showCategory(c)}>
                                <Eye className="h-4 w-4 mr-2" /> Afficher la catégorie
                              </ContextMenuItem>
                            ) : (
                              <ContextMenuItem onClick={() => hideCategory(c)}>
                                <EyeOff className="h-4 w-4 mr-2" /> Masquer la catégorie
                              </ContextMenuItem>
                            )}
                          </ContextMenuContent>
                        </ContextMenu>
                      );
                    })}
                    {allCategoryNames.length === 0 && (
                      <div className="p-6 text-center text-xs text-gray-500">
                        Aucune catégorie
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Articles */}
              <div className="col-span-9 bg-gray-900 p-4">
                <ScrollArea className="h-[520px]">
                  <div className="grid grid-cols-3 gap-3 pb-4">
                    {productsForSelectedCat.map((p) => {
                      const hidden = hiddenProds.includes(p.id);
                      return (
                        <ContextMenu key={p.id}>
                          <ContextMenuTrigger asChild>
                            <button
                              className={`rounded-lg p-3 h-24 flex flex-col justify-between transition-all relative overflow-hidden ${
                                hidden
                                  ? 'bg-gray-800 text-gray-500 line-through opacity-60'
                                  : 'bg-gray-700 hover:bg-gray-600'
                              }`}
                            >
                              <span className="text-sm font-semibold text-center flex-1 flex items-center justify-center px-1">
                                {p.name}
                              </span>
                              <div className="text-xs text-gray-300 text-center">
                                {(p.price_b2c || p.price).toFixed(2)} €
                              </div>
                              {hidden && (
                                <EyeOff className="absolute top-1 right-1 h-3 w-3" />
                              )}
                            </button>
                          </ContextMenuTrigger>
                          <ContextMenuContent>
                            {hidden ? (
                              <ContextMenuItem onClick={() => showProduct(p.id)}>
                                <Eye className="h-4 w-4 mr-2" /> Afficher l'article
                              </ContextMenuItem>
                            ) : (
                              <ContextMenuItem onClick={() => hideProduct(p.id)}>
                                <EyeOff className="h-4 w-4 mr-2" /> Masquer l'article
                              </ContextMenuItem>
                            )}
                          </ContextMenuContent>
                        </ContextMenu>
                      );
                    })}
                    {productsForSelectedCat.length === 0 && (
                      <div className="col-span-3 text-center text-gray-500 py-12 text-sm">
                        Aucun article dans cette catégorie
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Dialog création */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle configuration POS</DialogTitle>
            <DialogDescription>
              Donnez un nom à cette configuration (ex : « Config Londres »).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground">Nom *</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Config Londres"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Description</label>
              <Input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Optionnel"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button onClick={createConfig}>Créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog assignation */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assignation des points de vente</DialogTitle>
            <DialogDescription>
              Choisissez la configuration utilisée par chaque point de vente.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2 pr-2">
              {clients.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-2 p-2 rounded-md border border-border"
                >
                  <span className="text-sm font-medium truncate flex-1">{c.name}</span>
                  <Select
                    value={c.pos_configuration_id ?? '__none__'}
                    onValueChange={(v) => assignClient(c.id, v === '__none__' ? null : v)}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Aucune (tout afficher)</SelectItem>
                      {configs.map((cfg) => (
                        <SelectItem key={cfg.id} value={cfg.id}>
                          {cfg.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
              {clients.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-6">
                  Aucun point de vente
                </div>
              )}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button onClick={() => setAssignOpen(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
