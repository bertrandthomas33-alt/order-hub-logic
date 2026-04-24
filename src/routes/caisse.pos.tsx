import { createFileRoute, redirect, Link } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Edit,
  CreditCard,
  Banknote,
  Wifi,
  WifiOff,
  Printer,
  Receipt,
  LogOut,
} from 'lucide-react';
import { TpePaymentModal } from '@/components/caisse/TpePaymentModal';
import { CategoryFilterModal } from '@/components/caisse/CategoryFilterModal';
import { PrinterConfigModal } from '@/components/caisse/PrinterConfigModal';
import { LastReceiptModal } from '@/components/caisse/LastReceiptModal';
import { useTpe } from '@/hooks/useTpe';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  printReceipt,
  generateTicketNumber,
  getPrinterIp,
  type ReceiptData,
} from '@/services/printer/EpsonPrinterService';
import { useAuth } from '@/hooks/use-auth';

export const Route = createFileRoute('/caisse/pos')({
  component: CaisseEnregistreuse,
});

interface Product {
  id: string;
  name: string;
  category_id: string;
  price_b2c: number;
  price: number;
  image_url?: string | null;
}

interface Category {
  id: string;
  name: string;
  warehouse_id: string;
}

interface Warehouse {
  id: string;
  name: string;
}

interface CartItem {
  product: Product;
  quantite: number;
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

const PRODUCT_ACCENTS = [
  'bg-white',
  'bg-orange-500',
  'bg-blue-500',
  'bg-red-500',
  'bg-amber-500',
  'bg-green-500',
];

function CaisseEnregistreuse() {
  const { clientId, role, isAuthenticated } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryRows, setCategoryRows] = useState<Category[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [excludedCategories, setExcludedCategories] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    const s = localStorage.getItem('caisse_excluded_categories');
    return s ? JSON.parse(s) : [];
  });
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showTpe, setShowTpe] = useState(false);
  const [showPrinter, setShowPrinter] = useState(false);
  const [showLastReceipt, setShowLastReceipt] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<ReceiptData | null>(() => {
    if (typeof window === 'undefined') return null;
    const s = localStorage.getItem('caisse_last_receipt');
    if (!s) return null;
    try {
      const p = JSON.parse(s);
      p.date = new Date(p.date);
      return p;
    } catch {
      return null;
    }
  });

  const { isConnected: isTpeConnected } = useTpe();

  useEffect(() => {
    fetchWarehouses();
  }, [clientId, role]);

  useEffect(() => {
    if (selectedWarehouse) {
      fetchCategoriesAndProducts(selectedWarehouse);
    }
  }, [selectedWarehouse]);

  const fetchWarehouses = async () => {
    if (role === 'pdv' && clientId) {
      const { data } = await supabase
        .from('client_warehouses')
        .select('warehouse_id, warehouses(id, name)')
        .eq('client_id', clientId);
      const whs = (data || [])
        .map((r: any) => r.warehouses)
        .filter(Boolean) as Warehouse[];
      setWarehouses(whs);
      if (whs.length > 0 && !selectedWarehouse) setSelectedWarehouse(whs[0].id);
    } else {
      const { data } = await supabase.from('warehouses').select('id, name').eq('active', true).order('name');
      setWarehouses(data || []);
      if (data && data.length > 0 && !selectedWarehouse) setSelectedWarehouse(data[0].id);
    }
  };

  const fetchCategoriesAndProducts = async (warehouseId: string) => {
    const { data: cats } = await supabase
      .from('categories')
      .select('id, name, warehouse_id')
      .eq('warehouse_id', warehouseId)
      .order('name');
    const catRows = cats || [];
    setCategoryRows(catRows);

    const catIds = catRows.map((c) => c.id);
    if (catIds.length === 0) {
      setProducts([]);
      setAllCategories([]);
      setCategories([]);
      return;
    }

    const { data: prods } = await supabase
      .from('products')
      .select('id, name, category_id, price_b2c, price, image_url')
      .in('category_id', catIds)
      .eq('active', true)
      .gt('price_b2c', 0)
      .order('name');

    setProducts(prods || []);

    const allCats = catRows.map((c) => c.name);
    setAllCategories(allCats);
    const visibles = allCats.filter((c) => !excludedCategories.includes(c));
    setCategories(visibles);
    if (visibles.length > 0 && !visibles.includes(selectedCategory)) {
      setSelectedCategory(visibles[0]);
    }
  };

  const addToCart = (product: Product) => {
    const existing = cart.find((i) => i.product.id === product.id);
    if (existing) updateQty(product.id, existing.quantite + 1);
    else setCart([...cart, { product, quantite: 1 }]);
  };

  const updateQty = (productId: string, q: number) => {
    if (q <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(cart.map((i) => (i.product.id === productId ? { ...i, quantite: q } : i)));
  };

  const removeFromCart = (id: string) =>
    setCart(cart.filter((i) => i.product.id !== id));

  const getPrice = (p: Product) => p.price_b2c || p.price;

  const getTotal = () =>
    cart.reduce((t, i) => t + getPrice(i.product) * i.quantite, 0);

  const getCategoryName = (catId: string) =>
    categoryRows.find((c) => c.id === catId)?.name || '';

  const filtered = products.filter((p) => getCategoryName(p.category_id) === selectedCategory);

  const handleCheckout = async (method: 'cash' | 'card' = 'cash') => {
    if (cart.length === 0) {
      toast.error('Le panier est vide');
      return;
    }
    if (!selectedWarehouse) {
      toast.error('Sélectionnez un point de vente');
      return;
    }
    if (method === 'card') {
      setShowTpe(true);
      return;
    }
    await processOrder('cash');
  };

  const processOrder = async (method: 'cash' | 'card' = 'cash') => {
    if (!clientId) {
      toast.error('Compte client introuvable');
      return;
    }
    setProcessing(true);
    try {
      const wh = warehouses.find((w) => w.id === selectedWarehouse);
      const subtotal = getTotal();
      const tvaRate = 10;
      const tvaAmount = subtotal * (tvaRate / (100 + tvaRate));
      const ticketNumber = generateTicketNumber();
      const receipt: ReceiptData = {
        storeName: wh?.name || 'Point de vente',
        ticketNumber,
        date: new Date(),
        lines: cart.map((i) => ({
          productName: i.product.name,
          quantity: i.quantite,
          unitPrice: getPrice(i.product),
          totalPrice: getPrice(i.product) * i.quantite,
        })),
        subtotal: subtotal - tvaAmount,
        tvaRate,
        tvaAmount,
        total: subtotal,
        paymentMethod: method,
      };

      const { error } = await supabase.from('tickets_caisse').insert({
        ticket_number: ticketNumber,
        client_id: clientId,
        warehouse_id: selectedWarehouse,
        date: receipt.date.toISOString(),
        lines: receipt.lines as any,
        subtotal: receipt.subtotal,
        tva_rate: receipt.tvaRate,
        tva_amount: receipt.tvaAmount,
        total: receipt.total,
        payment_method: method,
      });
      if (error) throw error;

      setLastReceipt(receipt);
      if (typeof window !== 'undefined') {
        localStorage.setItem('caisse_last_receipt', JSON.stringify(receipt));
      }

      if (getPrinterIp()) {
        try {
          await printReceipt(receipt);
          toast.success('Ticket imprimé !');
        } catch {
          toast.error("Vente OK mais erreur d'impression");
        }
      }

      toast.success('Vente enregistrée !');
      setCart([]);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erreur lors de l'enregistrement");
    } finally {
      setProcessing(false);
    }
  };

  const handleTpeComplete = async (success: boolean) => {
    setShowTpe(false);
    if (success) {
      toast.success('Paiement CB accepté');
      await processOrder('card');
    } else {
      toast.error('Paiement CB annulé ou refusé');
    }
  };

  const handleExcludedChange = (excluded: string[]) => {
    setExcludedCategories(excluded);
    const v = allCategories.filter((c) => !excluded.includes(c));
    setCategories(v);
    if (v.length > 0 && !v.includes(selectedCategory)) setSelectedCategory(v[0]);
  };

  const accent = (i: number) => PRODUCT_ACCENTS[i % PRODUCT_ACCENTS.length];

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p>Connectez-vous pour accéder à la caisse.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold">Caisse</h1>
          <CategoryFilterModal
            allCategories={allCategories}
            excludedCategories={excludedCategories}
            onExcludedCategoriesChange={handleExcludedChange}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowPrinter(true)}
            className="text-gray-300 hover:text-white hover:bg-gray-700"
            title="Configuration imprimante"
          >
            <Printer className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowLastReceipt(true)}
            className="text-gray-300 hover:text-white hover:bg-gray-700"
            title="Dernier ticket"
          >
            <Receipt className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
            <SelectTrigger className="w-[220px] bg-gray-700 border-gray-600">
              <SelectValue placeholder="Point de vente" />
            </SelectTrigger>
            <SelectContent className="bg-gray-700 border-gray-600">
              {warehouses.map((w) => (
                <SelectItem key={w.id} value={w.id} className="text-white">
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Link to="/">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-300 hover:text-white hover:bg-gray-700 gap-2"
              title="Quitter la caisse"
            >
              <LogOut className="h-4 w-4" />
              Quitter
            </Button>
          </Link>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 grid grid-cols-12 gap-0">
        {/* Cart */}
        <div className="col-span-3 bg-gray-800 border-r border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-sm font-semibold mb-2">Vente directe</h2>
          </div>
          <ScrollArea className="flex-1 p-4">
            {cart.length === 0 ? (
              <div className="text-center text-gray-500 py-8">Panier vide</div>
            ) : (
              <div className="space-y-2">
                {cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex items-center justify-between bg-gray-700 p-3 rounded hover:bg-gray-600 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{item.quantite}</span>
                        <span className="text-sm font-medium">{item.product.name}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => removeFromCart(item.product.id)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <span className="text-sm font-semibold">
                      {(getPrice(item.product) * item.quantite).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="border-t border-gray-700 p-4 space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-lg font-bold">Total</span>
                <span className="text-2xl font-bold">€ {getTotal().toFixed(2)}</span>
              </div>
              <div className="text-xs text-gray-400">Incluant TVA 10%</div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'C', color: 'bg-red-600 hover:bg-red-700' },
                { label: '.', color: 'bg-gray-700 hover:bg-gray-600' },
                { label: '×', color: 'bg-gray-700 hover:bg-gray-600' },
                { label: '7', color: 'bg-gray-700 hover:bg-gray-600' },
                { label: '8', color: 'bg-gray-700 hover:bg-gray-600' },
                { label: '9', color: 'bg-gray-700 hover:bg-gray-600' },
                { label: '4', color: 'bg-gray-700 hover:bg-gray-600' },
                { label: '5', color: 'bg-gray-700 hover:bg-gray-600' },
                { label: '6', color: 'bg-gray-700 hover:bg-gray-600' },
                { label: '1', color: 'bg-gray-700 hover:bg-gray-600' },
                { label: '2', color: 'bg-gray-700 hover:bg-gray-600' },
                { label: '3', color: 'bg-gray-700 hover:bg-gray-600' },
                { label: '00', color: 'bg-gray-700 hover:bg-gray-600' },
                { label: '0', color: 'bg-gray-700 hover:bg-gray-600' },
                { label: '⌫', color: 'bg-gray-700 hover:bg-gray-600' },
              ].map((k) => (
                <Button key={k.label} variant="ghost" className={`${k.color} text-white h-12`}>
                  {k.label}
                </Button>
              ))}
            </div>

            <div className="space-y-2">
              <Button
                className="w-full bg-green-600 hover:bg-green-700 h-12 text-lg font-semibold"
                onClick={() => handleCheckout('cash')}
                disabled={processing || cart.length === 0}
              >
                <Banknote className="mr-2 h-5 w-5" />
                Espèces
              </Button>
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg font-semibold flex items-center justify-center gap-2"
                onClick={() => handleCheckout('card')}
                disabled={processing || cart.length === 0}
              >
                <CreditCard className="h-5 w-5" />
                Carte
                {isTpeConnected ? (
                  <Wifi className="h-4 w-4 text-green-300" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-300" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="col-span-2 bg-gray-800 border-r border-gray-700">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-sm font-semibold text-blue-400">Catégories</h2>
          </div>
          <ScrollArea className="h-[calc(100vh-8rem)]">
            <div className="flex flex-col gap-0">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedCategory(c)}
                  className={`p-4 text-left font-medium transition-colors border-b border-gray-700 ${
                    selectedCategory === c
                      ? CATEGORY_COLORS[c] || 'bg-blue-600'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Products */}
        <div className="col-span-7 bg-gray-900 p-6">
          <ScrollArea className="h-[calc(100vh-8rem)]">
            <div className="grid grid-cols-2 gap-4 pb-20">
              {filtered.map((p, idx) => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className="bg-gray-700 hover:bg-gray-600 rounded-lg p-4 h-28 flex flex-col justify-between transition-all transform hover:scale-105 relative overflow-hidden"
                >
                  <span className="text-lg font-semibold text-white text-center flex-1 flex items-center justify-center">
                    {p.name}
                  </span>
                  <div className="text-xs text-gray-300 text-center">
                    {getPrice(p).toFixed(2)} €
                  </div>
                  <div className={`absolute bottom-0 left-0 right-0 h-1 ${accent(idx)}`} />
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="col-span-2 text-center text-gray-500 py-12">
                  Aucun produit dans cette catégorie
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      <TpePaymentModal
        open={showTpe}
        onOpenChange={setShowTpe}
        amount={getTotal()}
        onPaymentComplete={handleTpeComplete}
      />
      <PrinterConfigModal open={showPrinter} onOpenChange={setShowPrinter} />
      <LastReceiptModal
        open={showLastReceipt}
        onOpenChange={setShowLastReceipt}
        receiptData={lastReceipt}
      />
    </div>
  );
}
