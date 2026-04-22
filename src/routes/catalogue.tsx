import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Header } from '@/components/Header';
import { ProductCard } from '@/components/ProductCard';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import React, { useState, useEffect, useMemo } from 'react';
import { Search, Zap, LayoutGrid, CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useCartStore } from '@/lib/cart-store';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/catalogue')({
  head: () => ({
    meta: [
      { title: 'Catalogue — JDC Distribution' },
      { name: 'description', content: 'Parcourez notre catalogue de produits frais.' },
    ],
  }),
  component: CataloguePage,
});

interface DbProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  unit: string;
  active: boolean;
  category_id: string;
  image_url: string | null;
  categories: { id: string; name: string; icon: string | null; warehouse_id: string } | null;
}

interface DbCategory {
  id: string;
  name: string;
  icon: string | null;
  warehouse_id: string;
}

interface DbWarehouse {
  id: string;
  name: string;
}

function CataloguePage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeWarehouse, setActiveWarehouse] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const { addItem, items } = useCartStore();
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [warehouses, setWarehouses] = useState<DbWarehouse[]>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: '/login' });
      return;
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchData = async () => {
      const [prodRes, catRes, whRes] = await Promise.all([
        supabase.from('products').select('*, categories(id, name, icon, warehouse_id)').eq('active', true).order('name'),
        supabase.from('categories').select('*').order('name'),
        supabase.from('warehouses').select('id, name').eq('active', true).order('name'),
      ]);
      setProducts((prodRes.data as any) ?? []);
      setCategories((catRes.data as any) ?? []);
      setWarehouses((whRes.data as any) ?? []);
    };
    fetchData();
  }, [isAuthenticated]);

  if (!isAuthenticated) return null;

  const productsForCategoryCount = products.filter((p) => {
    const matchWarehouse = activeWarehouse === 'all' || p.categories?.warehouse_id === activeWarehouse;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.description || '').toLowerCase().includes(search.toLowerCase());
    return matchWarehouse && matchSearch;
  });
  const categoriesWithProducts = new Set(productsForCategoryCount.map((p) => p.category_id));

  const filteredCategories = (activeWarehouse === 'all'
    ? categories
    : categories.filter((c) => c.warehouse_id === activeWarehouse)
  ).filter((c) => categoriesWithProducts.has(c.id));

  const filteredProducts = productsForCategoryCount.filter((p) => {
    return !activeCategory || p.category_id === activeCategory;
  });

  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-7xl px-4 py-4 sm:py-6 sm:px-6">
        <div className="mb-3 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground">Catalogue</h1>
            <p className="mt-1 hidden sm:block text-muted-foreground">Sélectionnez vos produits et ajoutez-les au panier</p>
          </div>
          <Button
            onClick={() => {
              setViewMode(viewMode === 'grid' ? 'table' : 'grid');
              if (viewMode === 'table') setQuantities({});
            }}
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="sm"
            className="gap-2 shrink-0"
          >
            {viewMode === 'grid' ? <Zap className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
            <span className="hidden sm:inline">{viewMode === 'grid' ? 'Commande rapide' : 'Vue catalogue'}</span>
          </Button>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher un produit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-input bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="mb-4 -mx-4 sm:mx-0 overflow-x-auto scrollbar-none border-b border-border">
          <div className="flex w-max gap-2 px-4 sm:px-0 pb-3">
            <button
              onClick={() => { setActiveWarehouse('all'); setActiveCategory(null); }}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                activeWarehouse === 'all' ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              Tous les entrepôts
            </button>
            {warehouses.map((wh) => (
              <button
                key={wh.id}
                onClick={() => { setActiveWarehouse(wh.id); setActiveCategory(null); }}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  activeWarehouse === wh.id ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}
              >
                {wh.name}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4 md:hidden">
          <select
            value={activeCategory ?? ''}
            onChange={(e) => setActiveCategory(e.target.value || null)}
            className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Toutes les catégories ({filteredCategories.length})</option>
            {filteredCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.icon ? `${cat.icon} ` : ''}{cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-6">
          <aside className={`hidden w-56 shrink-0 md:block ${viewMode === 'table' ? '!hidden' : ''}`}>
            <div className="sticky top-24 space-y-1">
              <h2 className="mb-3 text-lg font-bold text-foreground">Catégories</h2>
              <button
                onClick={() => setActiveCategory(null)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                  !activeCategory ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'
                }`}
              >
                Tout
              </button>
              {filteredCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                    activeCategory === cat.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {cat.icon && <span className="mr-1.5">{cat.icon}</span>}{cat.name}
                </button>
              ))}
            </div>
          </aside>

          <div className="flex-1">
            {viewMode === 'grid' ? (
              filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <p className="text-lg font-medium text-muted-foreground">Aucun produit trouvé</p>
                </div>
              ) : (
                <div className="grid gap-3 grid-cols-2 sm:gap-5 lg:grid-cols-3">
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={{
                        id: product.id,
                        name: product.name,
                        description: product.description || '',
                        price: Number(product.price),
                        unit: product.unit,
                        category: product.categories?.name || '',
                        image: product.image_url || undefined,
                      }}
                    />
                  ))}
                </div>
              )
            ) : (
              <QuickOrderTableView
                products={filteredProducts}
                allProducts={products}
                quantities={quantities}
                setQuantities={setQuantities}
                cartItems={items}
                addItem={addItem}
                warehouses={warehouses}
                activeWarehouse={activeWarehouse}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickOrderTableView({
  products,
  allProducts,
  quantities,
  setQuantities,
  cartItems,
  addItem,
  warehouses,
  activeWarehouse,
}: {
  products: DbProduct[];
  allProducts: DbProduct[];
  quantities: Record<string, number>;
  setQuantities: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  cartItems: { product: { id: string }; quantity: number }[];
  addItem: (product: any, qty: number) => void;
  warehouses: DbWarehouse[];
  activeWarehouse: string;
}) {
  const isFiniOnly = useMemo(() => {
    if (products.length === 0) return false;
    const finiIds = new Set(
      warehouses.filter((w) => w.name.toLowerCase().includes('fini')).map((w) => w.id),
    );
    if (finiIds.size === 0) return false;
    return products.every((p) => p.categories && finiIds.has(p.categories.warehouse_id));
  }, [products, warehouses]);

  const [dailyStock, setDailyStock] = useState<Record<string, { recu: number; stock: number; perte: number }>>({});
  const [yesterdayStock, setYesterdayStock] = useState<Record<string, number>>({});
  const [clientId, setClientId] = useState<string | null>(null);
  const savingTimers = useMemo(() => new Map<string, ReturnType<typeof setTimeout>>(), []);
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const today = useMemo(() => format(selectedDate, 'yyyy-MM-dd'), [selectedDate]);
  const yesterday = useMemo(() => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    return format(d, 'yyyy-MM-dd');
  }, [selectedDate]);

  const isToday = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t.getTime() === selectedDate.getTime();
  }, [selectedDate]);

  const shiftDay = (delta: number) => {
    setSelectedDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + delta);
      return d;
    });
  };

  const productIdsKey = useMemo(() => products.map((p) => p.id).sort().join(','), [products]);

  useEffect(() => {
    if (!isFiniOnly) return;
    let cancelled = false;
    const load = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return;
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', uid)
        .maybeSingle();
      const cid = client?.id ?? null;
      if (cancelled) return;
      setClientId(cid);
      if (!cid) return;

      const productIds = productIdsKey ? productIdsKey.split(',') : [];
      if (productIds.length === 0) return;

      const [{ data: todayRows }, { data: yOrders }, { data: yStock }] = await Promise.all([
        supabase
          .from('product_daily_stock')
          .select('product_id, recu, stock, perte')
          .eq('client_id', cid)
          .eq('stock_date', today)
          .in('product_id', productIds),
        supabase
          .from('orders')
          .select('id, order_items(product_id, quantity)')
          .eq('client_id', cid)
          .eq('delivery_date', today),
        supabase
          .from('product_daily_stock')
          .select('product_id, stock')
          .eq('client_id', cid)
          .eq('stock_date', yesterday)
          .in('product_id', productIds),
      ]);

      if (cancelled) return;

      const yReceived: Record<string, number> = {};
      (yOrders ?? []).forEach((o: any) => {
        (o.order_items ?? []).forEach((it: any) => {
          yReceived[it.product_id] = (yReceived[it.product_id] || 0) + Number(it.quantity);
        });
      });

      const todayMap: Record<string, { recu: number; stock: number; perte: number }> = {};
      (todayRows ?? []).forEach((r: any) => {
        todayMap[r.product_id] = {
          recu: Number(r.recu),
          stock: Number(r.stock),
          perte: Number(r.perte),
        };
      });

      const next: Record<string, { recu: number; stock: number; perte: number }> = {};
      productIds.forEach((pid) => {
        next[pid] = todayMap[pid] ?? { recu: yReceived[pid] || 0, stock: 0, perte: 0 };
      });
      setDailyStock(next);

      const yMap: Record<string, number> = {};
      (yStock ?? []).forEach((r: any) => {
        yMap[r.product_id] = Number(r.stock);
      });
      setYesterdayStock(yMap);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [isFiniOnly, activeWarehouse, today, yesterday, productIdsKey]);

  const persistRow = (productId: string, row: { recu: number; stock: number; perte: number }) => {
    if (!clientId) return;
    const existing = savingTimers.get(productId);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(async () => {
      await supabase.from('product_daily_stock').upsert(
        {
          client_id: clientId,
          product_id: productId,
          stock_date: today,
          recu: row.recu,
          stock: row.stock,
          perte: row.perte,
        },
        { onConflict: 'client_id,product_id,stock_date' },
      );
    }, 500);
    savingTimers.set(productId, timer);
  };

  const updateDaily = (productId: string, field: 'recu' | 'stock' | 'perte', value: string) => {
    const num = value === '' ? 0 : parseFloat(value);
    if (isNaN(num) || num < 0) return;
    setDailyStock((prev) => {
      const current = prev[productId] || { recu: 0, stock: 0, perte: 0 };
      const updated = { ...current, [field]: num };
      persistRow(productId, updated);
      // Auto-suggestion quantité à commander = Ventes - Stock
      // Ventes = Dispo - Stock - Perte ; Dispo = recu + stock veille
      const dispo = (updated.recu || 0) + (yesterdayStock[productId] || 0);
      const suggested = Math.max(0, dispo - 2 * (updated.stock || 0) - (updated.perte || 0));
      setQuantities((q) => ({ ...q, [productId]: suggested }));
      return { ...prev, [productId]: updated };
    });
  };

  const grouped = useMemo(() => {
    const sorted = [...products].sort((a, b) => {
      const catA = a.categories?.name || '';
      const catB = b.categories?.name || '';
      const catCmp = catA.localeCompare(catB, 'fr');
      return catCmp !== 0 ? catCmp : a.name.localeCompare(b.name, 'fr');
    });
    const result: { catName: string; catIcon: string | null; items: DbProduct[] }[] = [];
    let currentCat = '';
    sorted.forEach((p) => {
      const cat = p.categories?.name || 'Sans catégorie';
      if (cat !== currentCat) {
        currentCat = cat;
        result.push({ catName: cat, catIcon: p.categories?.icon || null, items: [] });
      }
      result[result.length - 1].items.push(p);
    });
    return result;
  }, [products]);

  const totalItems = Object.values(quantities).filter((q) => q > 0).length;

  const setQty = (id: string, value: string) => {
    const num = value === '' ? 0 : parseFloat(value);
    if (isNaN(num) || num < 0) return;
    setQuantities((prev) => ({ ...prev, [id]: num }));
  };

  const handleAddToCart = () => {
    let added = 0;
    Object.entries(quantities).forEach(([productId, qty]) => {
      if (qty <= 0) return;
      const p = allProducts.find((pr) => pr.id === productId);
      if (!p) return;
      addItem({
        id: p.id,
        name: p.name,
        description: p.description || '',
        price: Number(p.price),
        unit: p.unit,
        category: p.categories?.name || '',
        image: p.image_url || undefined,
      }, qty);
      added++;
    });
    if (added > 0) {
      toast.success(`${added} produit(s) ajouté(s) au panier`);
      setQuantities({});
    }
  };

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg font-medium text-muted-foreground">Aucun produit trouvé</p>
      </div>
    );
  }

  const colSpan = isFiniOnly ? 6 : 4;

  return (
    <div className="space-y-4">
      {isFiniOnly && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-foreground">Date :</span>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => shiftDay(-1)}
            aria-label="Jour précédent"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'h-9 justify-start text-left font-normal min-w-[200px] gap-2',
                )}
              >
                <CalendarIcon className="h-4 w-4" />
                <span className="capitalize">
                  {format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
                </span>
                {isToday && (
                  <span className="ml-auto text-xs text-primary font-semibold">Aujourd'hui</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => {
                  if (d) {
                    const nd = new Date(d);
                    nd.setHours(0, 0, 0, 0);
                    setSelectedDate(nd);
                    setDatePickerOpen(false);
                  }
                }}
                initialFocus
                locale={fr}
                className={cn('p-3 pointer-events-auto')}
              />
            </PopoverContent>
          </Popover>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => shiftDay(1)}
            aria-label="Jour suivant"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isToday && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9"
              onClick={() => {
                const t = new Date();
                t.setHours(0, 0, 0, 0);
                setSelectedDate(t);
              }}
            >
              Aujourd'hui
            </Button>
          )}
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-10 bg-card font-bold">Produit</TableHead>
              {!isFiniOnly && <TableHead className="w-24 text-center">Prix</TableHead>}
              {!isFiniOnly && <TableHead className="w-28 text-center">Unité</TableHead>}
              {isFiniOnly && <TableHead className="w-20 text-center">Reçu</TableHead>}
              {isFiniOnly && <TableHead className="w-20 text-center">Dispo</TableHead>}
              {isFiniOnly && <TableHead className="w-20 text-center">Stock</TableHead>}
              {isFiniOnly && <TableHead className="w-20 text-center">Perte</TableHead>}
              <TableHead className="w-28 text-center">Quantité</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {grouped.map((group) => (
              <React.Fragment key={`cat-${group.catName}`}>
                <TableRow>
                  <TableCell
                    colSpan={colSpan}
                    className="bg-primary/10 font-heading font-bold text-primary text-sm py-1.5 sticky left-0"
                  >
                    {group.catIcon} {group.catName}
                  </TableCell>
                </TableRow>
                {group.items.map((product) => {
                  const cartItem = cartItems.find((i) => i.product.id === product.id);
                  const currentQty = quantities[product.id] || 0;
                  const ds = dailyStock[product.id] || { recu: 0, stock: 0, perte: 0 };
                  const dispo = (ds.recu || 0) + (yesterdayStock[product.id] || 0);
                  return (
                    <TableRow key={product.id}>
                      <TableCell className="sticky left-0 z-10 bg-card font-medium whitespace-nowrap pl-6">
                        {product.name}
                        {isFiniOnly && (
                          <span className="ml-2 text-muted-foreground font-normal">
                            ({Number(product.price).toFixed(2)} €)
                          </span>
                        )}
                        {cartItem && (
                          <span className="ml-2 text-xs text-primary font-semibold">
                            (déjà {cartItem.quantity} au panier)
                          </span>
                        )}
                      </TableCell>
                      {!isFiniOnly && (
                        <TableCell className="text-center text-sm">
                          {Number(product.price).toFixed(2)} €
                        </TableCell>
                      )}
                      {!isFiniOnly && (
                        <TableCell className="text-center text-sm text-muted-foreground">
                          {product.unit}
                        </TableCell>
                      )}
                      {isFiniOnly && (
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            value={ds.recu || ''}
                            onChange={(e) => updateDaily(product.id, 'recu', e.target.value)}
                            className="w-16 mx-auto text-center h-8"
                            placeholder="0"
                          />
                        </TableCell>
                      )}
                      {isFiniOnly && (
                        <TableCell className="text-center text-sm font-semibold">
                          {dispo}
                        </TableCell>
                      )}
                      {isFiniOnly && (
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            value={ds.stock || ''}
                            onChange={(e) => updateDaily(product.id, 'stock', e.target.value)}
                            className="w-16 mx-auto text-center h-8"
                            placeholder="0"
                          />
                        </TableCell>
                      )}
                      {isFiniOnly && (
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            value={ds.perte || ''}
                            onChange={(e) => updateDaily(product.id, 'perte', e.target.value)}
                            className="w-16 mx-auto text-center h-8"
                            placeholder="0"
                          />
                        </TableCell>
                      )}
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={currentQty || ''}
                          onChange={(e) => setQty(product.id, e.target.value)}
                          className="w-20 mx-auto text-center h-8"
                          placeholder="0"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
      {totalItems > 0 && (
        <div className="sticky bottom-4 flex justify-end">
          <Button onClick={handleAddToCart} size="lg" className="gap-2 shadow-lg">
            <Zap className="h-4 w-4" />
            Ajouter {totalItems} produit(s) au panier
          </Button>
        </div>
      )}
    </div>
  );
}
