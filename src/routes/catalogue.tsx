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

  const filteredCategories = activeWarehouse === 'all'
    ? categories
    : categories.filter((c) => c.warehouse_id === activeWarehouse);

  const filteredProducts = products.filter((p) => {
    const matchCategory = !activeCategory || p.category_id === activeCategory;
    const matchWarehouse = activeWarehouse === 'all' || p.categories?.warehouse_id === activeWarehouse;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.description || '').toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchWarehouse && matchSearch;
  });

  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Title + Warehouse tabs + Search */}
        <div className="mb-2 flex flex-wrap items-center gap-4">
          <div>
            <h1 className="font-heading text-3xl font-extrabold text-foreground">Catalogue</h1>
            <p className="mt-1 text-muted-foreground">Sélectionnez vos produits et ajoutez-les au panier</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Button onClick={() => setQuickOrderOpen(true)} variant="outline" className="gap-2">
              <Zap className="h-4 w-4" />
              Commande rapide
            </Button>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Rechercher un produit..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-input bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </div>

        {/* Warehouse tabs */}
        <div className="mb-6 flex flex-wrap gap-2 border-b border-border pb-3">
          <button
            onClick={() => { setActiveWarehouse('all'); setActiveCategory(null); }}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              activeWarehouse === 'all' ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            Tous les entrepôts
          </button>
          {warehouses.map((wh) => (
            <button
              key={wh.id}
              onClick={() => { setActiveWarehouse(wh.id); setActiveCategory(null); }}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                activeWarehouse === wh.id ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {wh.name}
            </button>
          ))}
        </div>

        <div className="flex gap-6">
          {/* Sidebar: Categories only */}
          <aside className="hidden w-56 shrink-0 md:block">
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

          {/* Mobile category filters */}
          <div className="mb-4 flex flex-wrap gap-1.5 md:hidden">
            <button
              onClick={() => setActiveCategory(null)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                !activeCategory ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              Tout
            </button>
            {filteredCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeCategory === cat.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}
              >
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>

          {/* Products grid */}
          <div className="flex-1">
            {filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <p className="text-lg font-medium text-muted-foreground">Aucun produit trouvé</p>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
            )}
          </div>
        </div>
      </div>
      <QuickOrderDialog
        open={quickOrderOpen}
        onOpenChange={setQuickOrderOpen}
        products={products}
        warehouses={warehouses}
      />
    </div>
  );
}
