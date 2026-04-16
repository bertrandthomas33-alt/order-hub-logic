import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { ShoppingCart } from 'lucide-react';
import { useCartStore } from '@/lib/cart-store';
import { toast } from 'sonner';

interface QuickProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  unit: string;
  category_id: string;
  image_url: string | null;
  categories: { id: string; name: string; icon: string | null; warehouse_id: string } | null;
}

interface QuickWarehouse {
  id: string;
  name: string;
}

interface QuickOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: QuickProduct[];
  warehouses: QuickWarehouse[];
}

export function QuickOrderDialog({ open, onOpenChange, products, warehouses }: QuickOrderDialogProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const { addItem, items } = useCartStore();

  // Group products by warehouse, then by category
  const warehouseGroups = useMemo(() => {
    const groups: Record<string, {
      warehouse: QuickWarehouse;
      categories: Record<string, QuickProduct[]>;
      categoryOrder: string[];
    }> = {};

    warehouses.forEach((wh) => {
      groups[wh.id] = { warehouse: wh, categories: {}, categoryOrder: [] };
    });

    // Sort products by category name then product name
    const sorted = [...products].sort((a, b) => {
      const catA = a.categories?.name || '';
      const catB = b.categories?.name || '';
      const catCmp = catA.localeCompare(catB, 'fr');
      return catCmp !== 0 ? catCmp : a.name.localeCompare(b.name, 'fr');
    });

    sorted.forEach((p) => {
      const whId = p.categories?.warehouse_id;
      if (!whId || !groups[whId]) return;
      const catName = p.categories?.name || 'Sans catégorie';
      if (!groups[whId].categories[catName]) {
        groups[whId].categories[catName] = [];
        groups[whId].categoryOrder.push(catName);
      }
      groups[whId].categories[catName].push(p);
    });

    return Object.values(groups).filter((g) => g.categoryOrder.length > 0);
  }, [products, warehouses]);

  const setQty = (productId: string, value: string) => {
    const num = value === '' ? 0 : parseFloat(value);
    if (isNaN(num) || num < 0) return;
    setQuantities((prev) => ({ ...prev, [productId]: num }));
  };

  const totalItems = Object.values(quantities).filter((q) => q > 0).length;

  const handleAddToCart = () => {
    let added = 0;
    Object.entries(quantities).forEach(([productId, qty]) => {
      if (qty <= 0) return;
      const product = products.find((p) => p.id === productId);
      if (!product) return;
      addItem({
        id: product.id,
        name: product.name,
        description: product.description || '',
        price: Number(product.price),
        unit: product.unit,
        category: product.categories?.name || '',
        image: product.image_url || undefined,
      }, qty);
      added++;
    });

    if (added > 0) {
      toast.success(`${added} produit(s) ajouté(s) au panier`);
      setQuantities({});
      onOpenChange(false);
    } else {
      toast.error('Aucune quantité saisie');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Commande rapide
          </DialogTitle>
          <DialogDescription>
            Saisissez les quantités souhaitées puis ajoutez au panier
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-8">
          {warehouseGroups.map((group) => (
            <div key={group.warehouse.id}>
              <h3 className="mb-3 font-heading text-lg font-bold text-foreground">
                🏭 {group.warehouse.name}
              </h3>
              <div className="overflow-x-auto rounded-xl border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 z-10 bg-card font-bold">Produit</TableHead>
                      <TableHead className="w-24 text-center">Prix</TableHead>
                      <TableHead className="w-28 text-center">Unité</TableHead>
                      <TableHead className="w-28 text-center">Quantité</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.categoryOrder.map((catName) => {
                      const catProducts = group.categories[catName];
                      return (
                        <>{/* Fragment for category group */}
                          <TableRow key={`cat-${catName}`}>
                            <TableCell
                              colSpan={4}
                              className="bg-primary/10 font-heading font-bold text-primary text-sm py-1.5 sticky left-0"
                            >
                              {catProducts[0]?.categories?.icon} {catName}
                            </TableCell>
                          </TableRow>
                          {catProducts.map((product) => {
                            const cartItem = items.find((i) => i.product.id === product.id);
                            const currentQty = quantities[product.id] || 0;
                            return (
                              <TableRow key={product.id}>
                                <TableCell className="sticky left-0 z-10 bg-card font-medium whitespace-nowrap pl-6">
                                  {product.name}
                                  {cartItem && (
                                    <span className="ml-2 text-xs text-primary font-semibold">
                                      (déjà {cartItem.quantity} au panier)
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="text-center text-sm">
                                  {Number(product.price).toFixed(2)} €
                                </TableCell>
                                <TableCell className="text-center text-sm text-muted-foreground">
                                  {product.unit}
                                </TableCell>
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
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
          <Button onClick={handleAddToCart} disabled={totalItems === 0} className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            Ajouter {totalItems > 0 ? `${totalItems} produit(s)` : ''} au panier
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
