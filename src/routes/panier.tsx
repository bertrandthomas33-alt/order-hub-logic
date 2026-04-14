import { createFileRoute, Link } from '@tanstack/react-router';
import { Header } from '@/components/Header';
import { useCartStore } from '@/lib/cart-store';
import { Button } from '@/components/ui/button';
import { Minus, Plus, Trash2, ArrowLeft, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';

export const Route = createFileRoute('/panier')({
  head: () => ({
    meta: [
      { title: 'Panier — JDC Distribution' },
      { name: 'description', content: 'Vérifiez votre commande avant de la valider.' },
    ],
  }),
  component: PanierPage,
});

function PanierPage() {
  const { items, updateQuantity, removeItem, clearCart, total } = useCartStore();

  const handleOrder = () => {
    toast.success('Commande envoyée avec succès !', {
      description: `${items.length} produit(s) pour un total de ${total().toFixed(2)} €`,
    });
    clearCart();
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-center px-4 py-32">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-muted">
            <ShoppingBag className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="font-heading text-2xl font-bold text-foreground">Votre panier est vide</h2>
          <p className="mt-2 text-muted-foreground">Ajoutez des produits depuis le catalogue</p>
          <Link to="/catalogue" className="mt-6">
            <Button className="gap-2 rounded-xl">
              <ArrowLeft className="h-4 w-4" />
              Voir le catalogue
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-heading text-3xl font-extrabold text-foreground">Panier</h1>
            <p className="mt-1 text-muted-foreground">{items.length} produit(s)</p>
          </div>
          <Link to="/catalogue">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Continuer
            </Button>
          </Link>
        </div>

        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.product.id}
              className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-muted text-2xl">
                {getCategoryEmoji(item.product.category)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-heading text-sm font-bold text-foreground truncate">{item.product.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {item.product.price.toFixed(2)} € / {item.product.unit}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8"
                  onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8"
                  onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <p className="w-20 text-right font-heading text-sm font-bold text-foreground">
                {(item.product.price * item.quantity).toFixed(2)} €
              </p>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                onClick={() => removeItem(item.product.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* Total & Order */}
        <div className="mt-8 rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <span className="text-lg font-medium text-muted-foreground">Total</span>
            <span className="font-heading text-2xl font-extrabold text-foreground">{total().toFixed(2)} €</span>
          </div>
          <Button className="mt-6 w-full gap-2 rounded-xl py-6 text-base" onClick={handleOrder}>
            <ShoppingBag className="h-5 w-5" />
            Valider la commande
          </Button>
        </div>
      </div>
    </div>
  );
}

function getCategoryEmoji(category: string): string {
  const map: Record<string, string> = {
    soupes: '🍜', antipasti: '🫒', 'produits-mer': '🐟', sauces: '🥫',
    fromages: '🧀', viandes: '🥩', epicerie: '🏪', 'fruits-pulpe': '🍓',
    frais: '❄️', surgele: '🧊',
  };
  return map[category] || '🍽️';
}
