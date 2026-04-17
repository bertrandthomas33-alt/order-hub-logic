import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Header } from '@/components/Header';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { Package, Users, ClipboardList, FileText, Search, Check, X, Warehouse, Pencil, Plus, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { CreateClientDialog } from '@/components/CreateClientDialog';
import { EditClientDialog } from '@/components/EditClientDialog';
import { EditProductDialog } from '@/components/EditProductDialog';
import { CreateProductDialog } from '@/components/CreateProductDialog';
import { EditOrderDialog } from '@/components/EditOrderDialog';
import { ProductionSheetDialog } from '@/components/ProductionSheetDialog';
import { WarehousesManager } from '@/components/WarehousesManager';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter } from 'lucide-react';
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

type Tab = 'commandes' | 'produits' | 'clients' | 'entrepots';

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
  const { isAuthenticated, isLoading, role } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('commandes');
  const [search, setSearch] = useState('');

  // Data state
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [showProductionSheet, setShowProductionSheet] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || role !== 'admin') {
      navigate({ to: '/login' });
      return;
    }
  }, [isAuthenticated, isLoading, role, navigate]);

  useEffect(() => {
    if (isLoading || role !== 'admin') return;
    
    const fetchData = async () => {
      const [ordersRes, productsRes, clientsRes, warehousesRes, categoriesRes] = await Promise.all([
        supabase.from('orders').select('*, clients(name), warehouses(name), order_items(*, products(name, category_id, categories(name)))').order('created_at', { ascending: false }),
        supabase.from('products').select('*, categories(name, warehouses(name))').order('name'),
        supabase.from('clients').select('*').order('name'),
        supabase.from('warehouses').select('*').order('name'),
        supabase.from('categories').select('*, warehouses(id, name)').order('name'),
      ]);
      setOrders(ordersRes.data ?? []);
      setProducts(productsRes.data ?? []);
      setClients(clientsRes.data ?? []);
      setWarehouses(warehousesRes.data ?? []);
      setCategories(categoriesRes.data ?? []);
    };
    fetchData();
  }, [isLoading, role]);

  if (isLoading || role !== 'admin') return null;

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: 'commandes', label: 'Commandes', icon: <ClipboardList className="h-4 w-4" />, count: orders.length },
    { id: 'produits', label: 'Produits', icon: <Package className="h-4 w-4" />, count: products.length },
    { id: 'clients', label: 'Clients', icon: <Users className="h-4 w-4" />, count: clients.length },
    { id: 'entrepots', label: 'Entrepôts', icon: <Warehouse className="h-4 w-4" />, count: warehouses.length },
  ];

  const handleRefreshOrders = () => {
    supabase.from('orders').select('*, clients(name), warehouses(name), order_items(*, products(name, category_id, categories(name)))').order('created_at', { ascending: false }).then(r => setOrders(r.data ?? []));
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
          <Button className="gap-2 rounded-xl" onClick={() => setShowProductionSheet(true)}>
            <FileText className="h-4 w-4" />
            Fiche de production
          </Button>
        </div>

        {orders.filter((o: any) => o.status === 'pending').length > 0 && (
          <p className="mb-6 text-sm text-muted-foreground">
            📋 <span className="font-semibold text-foreground">{orders.filter((o: any) => o.status === 'pending').length}</span> commande(s) en attente pour demain
          </p>
        )}

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




        {activeTab === 'commandes' && <CommandesTable orders={orders} search={search} onRefresh={() => {
          supabase.from('orders').select('*, clients(name), warehouses(name), order_items(*, products(name, category_id, categories(name)))').order('created_at', { ascending: false }).then(r => setOrders(r.data ?? []));
        }} />}
        {activeTab === 'produits' && <ProduitsTable products={products} categories={categories} warehouses={warehouses} search={search} onRefresh={() => {
          supabase.from('products').select('*, categories(name, warehouses(name))').order('name').then(r => setProducts(r.data ?? []));
        }} />}
        {activeTab === 'clients' && <ClientsTable clients={clients} search={search} onRefresh={() => {
          supabase.from('clients').select('*').order('name').then(r => setClients(r.data ?? []));
        }} />}
        {activeTab === 'entrepots' && <WarehousesManager warehouses={warehouses} categories={categories} onRefresh={() => {
          Promise.all([
            supabase.from('warehouses').select('*').order('name'),
            supabase.from('categories').select('*, warehouses(id, name)').order('name'),
          ]).then(([whRes, catRes]) => { setWarehouses(whRes.data ?? []); setCategories(catRes.data ?? []); });
        }} />}
        <ProductionSheetDialog
          open={showProductionSheet}
          onOpenChange={setShowProductionSheet}
          orders={orders}
          onRefresh={handleRefreshOrders}
        />
      </div>
    </div>
  );
}

function CommandesTable({ orders, search, onRefresh }: { orders: any[]; search: string; onRefresh: () => void }) {
  const [editOrder, setEditOrder] = useState<any | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [filterClient, setFilterClient] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('');

  const uniqueClients = Array.from(new Map(orders.map((o: any) => [o.client_id, o.clients?.name])).entries()).filter(([, name]) => name);

  const filtered = orders.filter((o: any) => {
    const matchSearch = !search || o.id?.toLowerCase().includes(search.toLowerCase()) || o.clients?.name?.toLowerCase().includes(search.toLowerCase());
    const matchClient = filterClient === 'all' || o.client_id === filterClient;
    const matchStatus = filterStatus === 'all' || o.status === filterStatus;
    const matchDate = !filterDate || o.delivery_date === filterDate;
    return matchSearch && matchClient && matchStatus && matchDate;
  });

  const allSelected = filtered.length > 0 && filtered.every((o: any) => selected.has(o.id));
  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((o: any) => o.id)));
    }
  };
  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    setDeleting(true);
    try {
      const ids = Array.from(selected);
      const { error: itemsErr } = await supabase.from('order_items').delete().in('order_id', ids);
      if (itemsErr) throw itemsErr;
      const { error } = await supabase.from('orders').delete().in('id', ids);
      if (error) throw error;
      toast.success(`${ids.length} commande(s) supprimée(s)`);
      setSelected(new Set());
      onRefresh();
    } catch (err: any) {
      toast.error('Erreur lors de la suppression', { description: err.message });
    } finally {
      setDeleting(false);
    }
  };

  const hasFilters = filterClient !== 'all' || filterStatus !== 'all' || !!filterDate;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          Filtres
        </div>
        <Select value={filterClient} onValueChange={setFilterClient}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Client" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les clients</SelectItem>
            {uniqueClients.map(([id, name]) => (
              <SelectItem key={id} value={id}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {Object.entries(statusLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="w-[160px]"
          placeholder="Date livraison"
        />
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => { setFilterClient('all'); setFilterStatus('all'); setFilterDate(''); }}>
            Réinitialiser
          </Button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">{filtered.length} commande(s)</span>
      </div>
      {selected.size > 0 && (
        <div className="mb-4 flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{selected.size} sélectionnée(s)</span>
          <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={deleting}>
            <Trash2 className="mr-1 h-4 w-4" />
            Supprimer
          </Button>
        </div>
      )}
      <div className="rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
              </TableHead>
              <TableHead>N° Commande</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Entrepôt</TableHead>
              <TableHead>Articles</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Livraison</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-12 text-center text-muted-foreground">Aucune commande trouvée</TableCell>
              </TableRow>
            ) : (
              filtered.map((order: any) => (
                <TableRow key={order.id} data-state={selected.has(order.id) ? 'selected' : undefined}>
                  <TableCell>
                    <Checkbox checked={selected.has(order.id)} onCheckedChange={() => toggleOne(order.id)} />
                  </TableCell>
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
                    {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('fr-FR') : '—'}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => setEditOrder(order)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <EditOrderDialog
        order={editOrder}
        open={!!editOrder}
        onOpenChange={(open) => { if (!open) setEditOrder(null); }}
        onSaved={onRefresh}
      />
    </>
  );
}

function ProduitsTable({ products, categories, warehouses, search, onRefresh }: { products: any[]; categories: any[]; warehouses: any[]; search: string; onRefresh: () => void }) {
  const [editProduct, setEditProduct] = useState<any | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterWarehouse, setFilterWarehouse] = useState<string>('all');
  const [filterActive, setFilterActive] = useState<string>('all');

  const toggleActive = async (productId: string, active: boolean) => {
    const { error } = await supabase.from('products').update({ active }).eq('id', productId);
    if (error) { toast.error('Erreur'); console.error(error); }
    else { toast.success(active ? 'Produit activé' : 'Produit désactivé'); onRefresh(); }
  };

  const nav = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        if (selectedProductId) {
          nav({ to: '/recettes', search: { productId: selectedProductId } });
        } else {
          nav({ to: '/recettes' });
        }
        return;
      }
      if (!selectedProductId) return;
      if (e.ctrlKey && e.key === 'i') {
        e.preventDefault();
        toggleActive(selectedProductId, false);
      }
      if (e.ctrlKey && e.key === 'a') {
        e.preventDefault();
        toggleActive(selectedProductId, true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedProductId, nav]);

  const filtered = products.filter((p: any) => {
    const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.categories?.name?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = filterCategory === 'all' || p.category_id === filterCategory;
    const matchWarehouse = filterWarehouse === 'all' || p.categories?.warehouses?.name === warehouses.find((w: any) => w.id === filterWarehouse)?.name;
    const matchActive = filterActive === 'all' || (filterActive === 'true' ? p.active : !p.active);
    return matchSearch && matchCategory && matchWarehouse && matchActive;
  });

  const filteredCategories = filterWarehouse === 'all'
    ? categories
    : categories.filter((cat: any) => cat.warehouse_id === filterWarehouse);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          Filtres
        </div>
        <Select value={filterWarehouse} onValueChange={(val) => {
          setFilterWarehouse(val);
          // Reset category if it doesn't belong to new warehouse
          if (val !== 'all' && filterCategory !== 'all') {
            const cat = categories.find((c: any) => c.id === filterCategory);
            if (cat && cat.warehouse_id !== val) setFilterCategory('all');
          }
        }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Entrepôt" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous entrepôts</SelectItem>
            {warehouses.map((wh: any) => (
              <SelectItem key={wh.id} value={wh.id}>{wh.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes catégories</SelectItem>
            {filteredCategories.map((cat: any) => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterActive} onValueChange={setFilterActive}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="true">Actifs</SelectItem>
            <SelectItem value="false">Inactifs</SelectItem>
          </SelectContent>
        </Select>
        {(filterCategory !== 'all' || filterWarehouse !== 'all' || filterActive !== 'all') && (
          <Button variant="ghost" size="sm" onClick={() => { setFilterCategory('all'); setFilterWarehouse('all'); setFilterActive('all'); }}>
            Réinitialiser
          </Button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">{filtered.length} produit(s)</span>
        <Button className="gap-2" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" />
          Nouveau produit
        </Button>
      </div>
      <div className="rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Image</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Entrepôt</TableHead>
              <TableHead className="text-right">Prix BtoB</TableHead>
              <TableHead className="text-right">Prix BtoC</TableHead>
              <TableHead>Unité</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead>Actif</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
              <TableCell colSpan={9} className="py-12 text-center text-muted-foreground">Aucun produit trouvé</TableCell>
              </TableRow>
            ) : (
              filtered.map((product: any) => (
                <TableRow key={product.id} className={`cursor-pointer ${selectedProductId === product.id ? 'bg-muted/50' : ''}`} onClick={() => setSelectedProductId(product.id === selectedProductId ? null : product.id)}>
                  <TableCell>
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="h-10 w-10 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <Package className="h-4 w-4" />
                      </div>
                    )}
                  </TableCell>
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
                  <TableCell className="text-right">{Number(product.price_b2c ?? 0).toFixed(2)} €</TableCell>
                  <TableCell className="text-muted-foreground">/ {product.unit}</TableCell>
                  <TableCell className="text-right">{Number(product.stock ?? 0)}</TableCell>
                  <TableCell>
                    <Switch checked={product.active} onCheckedChange={(checked) => toggleActive(product.id, checked)} />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setEditProduct(product)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={async () => {
                        if (!confirm(`Supprimer "${product.name}" ?`)) return;
                        const { error } = await supabase.from('products').delete().eq('id', product.id);
                        if (error) { toast.error('Erreur lors de la suppression'); console.error(error); }
                        else { toast.success('Produit supprimé'); onRefresh(); }
                      }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <EditProductDialog
        product={editProduct}
        categories={categories}
        open={!!editProduct}
        onOpenChange={(open) => { if (!open) setEditProduct(null); }}
        onSaved={onRefresh}
      />
      <CreateProductDialog
        categories={categories}
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreated={onRefresh}
      />
    </>
  );
}

function ClientsTable({ clients, search, onRefresh }: { clients: any[]; search: string; onRefresh: () => void }) {
  const [showCreate, setShowCreate] = useState(false);
  const [editClient, setEditClient] = useState<any>(null);
  const filtered = clients.filter(
    (c: any) =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.contact?.toLowerCase().includes(search.toLowerCase()) ||
      c.address?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{filtered.length} client(s)</span>
        <Button className="gap-2" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" />
          Nouveau client
        </Button>
      </div>
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
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">Aucun client trouvé</TableCell>
              </TableRow>
            ) : (
              filtered.map((client: any) => (
                <TableRow key={client.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setEditClient(client)}>
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
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setEditClient(client); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <CreateClientDialog open={showCreate} onOpenChange={setShowCreate} onCreated={onRefresh} />
      <EditClientDialog open={!!editClient} onOpenChange={(v) => !v && setEditClient(null)} client={editClient} onUpdated={onRefresh} />
    </>
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
