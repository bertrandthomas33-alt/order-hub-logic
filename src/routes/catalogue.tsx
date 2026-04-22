import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Header } from '@/components/Header';
import { ProductCard } from '@/components/ProductCard';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect, useMemo } from 'react';
import { Search, Zap, LayoutGrid } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useCartStore } from '@/lib/cart-store';
import { toast } from 'sonner';

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

  // Products filtered by warehouse + search (ignoring active category) — used to know which categories have products
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
        {/* Title + Toggle (mobile compact) */}
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

        {/* Search full-width */}
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

        {/* Warehouse tabs */}
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

        {/* Mobile category filter — native select for compactness */}
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
          {/* Sidebar: Categories only */}
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

          {/* Products content */}
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
}: {
  products: DbProduct[];
  allProducts: DbProduct[];
  quantities: Record<string, number>;
  setQuantities: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  cartItems: { product: { id: string }; quantity: number }[];
  addItem: (product: any, qty: number) => void;
  warehouses: DbWarehouse[];
}) {
  const isFiniOnly = useMemo(() => {
    if (products.length === 0) return false;
    const finiIds = new Set(
      warehouses.filter((w) => w.name.toLowerCase().includes('fini')).map((w) => w.id),
    );
    if (finiIds.size === 0) return false;
    return products.every((p) => p.categories && finiIds.has(p.categories.warehouse_id));
  }, [products, warehouses]);

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

  const colSpan = isFiniOnly ? 2 : 4;

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-10 bg-card font-bold">Produit</TableHead>
              {!isFiniOnly && <TableHead className="w-24 text-center">Prix</TableHead>}
              {!isFiniOnly && <TableHead className="w-28 text-center">Unité</TableHead>}
              <TableHead className="w-28 text-center">Quantité</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {grouped.map((group) => (
              <>
                <TableRow key={`cat-${group.catName}`}>
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
              </>
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
