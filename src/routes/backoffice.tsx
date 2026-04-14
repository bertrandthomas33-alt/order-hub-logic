import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Header } from '@/components/Header';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { Package, Users, ClipboardList, FileText, Search, Check, X, Warehouse, Pencil } from 'lucide-react';
import { EditProductDialog } from '@/components/EditProductDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

export const Route = createFileRoute('/backoffice')({
  head: () => ({
    meta: [
      { title: 'Back-office — JDC Distribution' },
      { name: 'description', content: 'Gérez et centralisez les commandes de vos points de vente.' },
    ],
  }),
  component: BackofficePage,
});

type Tab = 'commandes' | 'produits' | 'clients';

const statusLabels: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  in_production: 'En production',
  delivered: 'Livrée',
};

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-blue-100 text-blue-800',
  in_production: 'bg-purple-100 text-purple-800',
  delivered: 'bg-emerald-100 text-emerald-800',
};

function BackofficePage() {
  const { isAuthenticated, role } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('commandes');
  const [search, setSearch] = useState('');

  // Data state
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    if (!isAuthenticated || role !== 'admin') {
      navigate({ to: '/login' });
      return;
    }
  }, [isAuthenticated, role, navigate]);

  useEffect(() => {
    if (role !== 'admin') return;
    
    const fetchData = async () => {
      const [ordersRes, productsRes, clientsRes, warehousesRes, categoriesRes] = await Promise.all([
        supabase.from('orders').select('*, clients(name), warehouses(name), order_items(*, products(name))').order('created_at', { ascending: false }),
        supabase.from('products').select('*, categories(name, warehouses(name))').order('name'),
        supabase.from('clients').select('*').order('name'),
        supabase.from('warehouses').select('*').order('name'),
        supabase.from('categories').select('*, warehouses(name)').order('name'),
      ]);
      setOrders(ordersRes.data ?? []);
      setProducts(productsRes.data ?? []);
      setClients(clientsRes.data ?? []);
      setWarehouses(warehousesRes.data ?? []);
      setCategories(categoriesRes.data ?? []);
    };
    fetchData();
  }, [role]);

  if (role !== 'admin') return null;

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: 'commandes', label: 'Commandes', icon: <ClipboardList className="h-4 w-4" />, count: orders.length },
    { id: 'produits', label: 'Produits', icon: <Package className="h-4 w-4" />, count: products.length },
    { id: 'clients', label: 'Clients', icon: <Users className="h-4 w-4" />, count: clients.length },
  ];

  const handleGenerateFiche = () => {
    const productionOrders = orders.filter(
      (o: any) => o.status === 'confirmed' || o.status === 'pending'
    );
    
    // Group by warehouse
    const byWarehouse: Record<string, Record<string, { name: string; total: number }>> = {};
    productionOrders.forEach((order: any) => {
      const whName = order.warehouses?.name || 'Inconnu';
      if (!byWarehouse[whName]) byWarehouse[whName] = {};
      order.order_items?.forEach((item: any) => {
        const pName = item.products?.name || 'Produit';
        if (byWarehouse[whName][pName]) {
          byWarehouse[whName][pName].total += Number(item.quantity);
        } else {
          byWarehouse[whName][pName] = { name: pName, total: Number(item.quantity) };
        }
      });
    });

    const warehouseCount = Object.keys(byWarehouse).length;
    toast.success('Fiche de production générée !', {
      description: `${warehouseCount} entrepôt(s) — ${productionOrders.length} commande(s)`,
    });
  };

  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-extrabold text-foreground">Back-office</h1>
            <p className="mt-1 text-muted-foreground">Gestion centralisée des commandes, produits et clients</p>
          </div>
          <Button className="gap-2 rounded-xl" onClick={handleGenerateFiche}>
            <FileText className="h-4 w-4" />
            Fiche de production
          </Button>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-4">
          <StatCard label="Commandes" value={orders.length} />
          <StatCard label="En attente" value={orders.filter((o: any) => o.status === 'pending').length} />
          <StatCard label="Produits" value={products.length} />
          <StatCard label="Clients actifs" value={clients.filter((c: any) => c.active).length} />
        </div>

        <div className="mb-6 flex items-center gap-6 border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSearch(''); }}
              className={`flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.icon}
              {tab.label}
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{tab.count}</span>
            </button>
          ))}
        </div>

        <div className="relative mb-6 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        {activeTab === 'commandes' && <CommandesTable orders={orders} search={search} />}
        {activeTab === 'produits' && <ProduitsTable products={products} categories={categories} search={search} onRefresh={() => {
          supabase.from('products').select('*, categories(name, warehouses(name))').order('name').then(r => setProducts(r.data ?? []));
        }} />}
        {activeTab === 'clients' && <ClientsTable clients={clients} search={search} />}
      </div>
    </div>
  );
}

function CommandesTable({ orders, search }: { orders: any[]; search: string }) {
  const filtered = orders.filter(
    (o: any) =>
      o.id?.toLowerCase().includes(search.toLowerCase()) ||
      o.clients?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="rounded-2xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>N° Commande</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Entrepôt</TableHead>
            <TableHead>Articles</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">Aucune commande trouvée</TableCell>
            </TableRow>
          ) : (
            filtered.map((order: any) => (
              <TableRow key={order.id}>
                <TableCell className="font-mono text-xs">{order.id.slice(0, 8)}</TableCell>
                <TableCell className="font-medium">{order.clients?.name || '—'}</TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1 text-xs">
                    <Warehouse className="h-3 w-3" />
                    {order.warehouses?.name || '—'}
                  </span>
                </TableCell>
                <TableCell>{order.order_items?.length || 0} produit(s)</TableCell>
                <TableCell className="text-right font-medium">{Number(order.total).toFixed(2)} €</TableCell>
                <TableCell>
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[order.status] || ''}`}>
                    {statusLabels[order.status] || order.status}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(order.created_at).toLocaleDateString('fr-FR')}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function ProduitsTable({ products, search }: { products: any[]; search: string }) {
  const filtered = products.filter(
    (p: any) =>
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.categories?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="rounded-2xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Catégorie</TableHead>
            <TableHead>Entrepôt</TableHead>
            <TableHead className="text-right">Prix</TableHead>
            <TableHead>Unité</TableHead>
            <TableHead>Actif</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">Aucun produit trouvé</TableCell>
            </TableRow>
          ) : (
            filtered.map((product: any) => (
              <TableRow key={product.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.description}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                    {product.categories?.name || '—'}
                  </span>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {product.categories?.warehouses?.name || '—'}
                </TableCell>
                <TableCell className="text-right font-medium">{Number(product.price).toFixed(2)} €</TableCell>
                <TableCell className="text-muted-foreground">/ {product.unit}</TableCell>
                <TableCell>
                  {product.active ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                      <Check className="h-3 w-3" /> Oui
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                      <X className="h-3 w-3" /> Non
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function ClientsTable({ clients, search }: { clients: any[]; search: string }) {
  const filtered = clients.filter(
    (c: any) =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.contact?.toLowerCase().includes(search.toLowerCase()) ||
      c.address?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="rounded-2xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Point de vente</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Téléphone</TableHead>
            <TableHead>Adresse</TableHead>
            <TableHead>Actif</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">Aucun client trouvé</TableCell>
            </TableRow>
          ) : (
            filtered.map((client: any) => (
              <TableRow key={client.id}>
                <TableCell className="font-medium">{client.name}</TableCell>
                <TableCell>{client.contact || '—'}</TableCell>
                <TableCell className="text-muted-foreground">{client.email || '—'}</TableCell>
                <TableCell className="text-muted-foreground">{client.phone || '—'}</TableCell>
                <TableCell>{client.address || '—'}</TableCell>
                <TableCell>
                  {client.active ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                      <Check className="h-3 w-3" /> Oui
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                      <X className="h-3 w-3" /> Non
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 font-heading text-3xl font-extrabold text-foreground">{value}</p>
    </div>
  );
}
