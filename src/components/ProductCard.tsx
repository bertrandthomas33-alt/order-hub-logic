import type { Product } from '@/lib/mock-data';
import { useCartStore } from '@/lib/cart-store';
import { Button } from '@/components/ui/button';
import { Plus, Minus } from 'lucide-react';

export function ProductCard({ product }: { product: Product }) {
  const { items, addItem, updateQuantity, removeItem } = useCartStore();
  const cartItem = items.find((i) => i.product.id === product.id);

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:shadow-lg hover:shadow-primary/5">
      <div className="relative aspect-square sm:aspect-[2/1] overflow-hidden bg-muted">
        {product.image ? (
          <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-2xl">
            {getCategoryEmoji(product.category)}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <span className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {product.category.replace('-', ' ')}
        </span>
        <h3 className="font-heading text-base font-semibold text-foreground">
          {product.name}
        </h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
          {product.description}
        </p>
        <div className="mt-auto flex items-center justify-between pt-4">
          <div>
            <span className="font-heading text-lg font-bold text-foreground">
              {product.price.toFixed(2)} €
            </span>
            <span className="ml-1 text-xs text-muted-foreground">/ {product.unit}</span>
          </div>

          {cartItem ? (
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8"
                onClick={() =>
                  cartItem.quantity === 1
                    ? removeItem(product.id)
                    : updateQuantity(product.id, cartItem.quantity - 1)
                }
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="w-6 text-center text-sm font-semibold">
                {cartItem.quantity}
              </span>
              <Button
                size="icon"
                className="h-8 w-8"
                onClick={() => updateQuantity(product.id, cartItem.quantity + 1)}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <Button size="sm" onClick={() => addItem(product)}>
              <Plus className="mr-1 h-4 w-4" />
              Ajouter
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function getCategoryEmoji(category: string): string {
  const map: Record<string, string> = {
    soupes: '🍜',
    antipasti: '🫒',
    'produits-mer': '🐟',
    sauces: '🥫',
    fromages: '🧀',
    viandes: '🥩',
    epicerie: '🏪',
    'fruits-pulpe': '🍓',
    frais: '❄️',
    surgele: '🧊',
  };
  return map[category] || '🍽️';
}
