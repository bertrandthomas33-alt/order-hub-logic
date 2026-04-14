import { createFileRoute } from '@tanstack/react-router';
import { Header } from '@/components/Header';
import { ProductCard } from '@/components/ProductCard';
import { categories, products } from '@/lib/mock-data';
import { useState } from 'react';
import { Search } from 'lucide-react';

export const Route = createFileRoute('/catalogue')({
  head: () => ({
    meta: [
      { title: 'Catalogue — JDC Distribution' },
      { name: 'description', content: 'Parcourez notre catalogue de produits frais : soupes, antipasti, fromages, viandes et plus.' },
      { property: 'og:title', content: 'Catalogue — JDC Distribution' },
      { property: 'og:description', content: 'Parcourez notre catalogue de produits frais.' },
    ],
  }),
  component: CataloguePage,
});

function CataloguePage() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filteredProducts = products.filter((p) => {
    const matchCategory = !activeCategory || p.category === activeCategory;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="min-h-screen">
      <Header />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-extrabold text-foreground">Catalogue</h1>
          <p className="mt-2 text-muted-foreground">Sélectionnez vos produits et ajoutez-les au panier</p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher un produit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-input bg-card py-3 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Categories */}
        <div className="mb-8 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory(null)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              !activeCategory
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            Tout
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeCategory === cat.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>

        {/* Products */}
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-lg font-medium text-muted-foreground">Aucun produit trouvé</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
