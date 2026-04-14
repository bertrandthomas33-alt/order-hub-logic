import { createFileRoute } from '@tanstack/react-router';
import { Header } from '@/components/Header';
import { products, clients, mockOrders } from '@/lib/mock-data';
import { useState } from 'react';
import { Package, Users, ClipboardList, FileText, Search, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Order } from '@/lib/mock-data';

export const Route = createFileRoute('/backoffice')({
  head: () => ({
    meta: [
      { title: 'Back-office — JDC Distribution' },
      { name: 'description', content: 'Gérez et centralisez les commandes de vos points de vente.' },
      { property: 'og:title', content: 'Back-office — JDC Distribution' },
      { property: 'og:description', content: 'Gérez et centralisez les commandes de vos points de vente.' },
    ],
  }),
  component: BackofficePage,
});

type Tab = 'commandes' | 'produits' | 'clients';

const statusLabels: Record<Order['status'], string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  in_production: 'En production',
  delivered: 'Livrée',
};

const statusColors: Record<Order['status'], string> = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-blue-100 text-blue-800',
  in_production: 'bg-purple-100 text-purple-800',
  delivered: 'bg-emerald-100 text-emerald-800',
};

function BackofficePage() {
  const [activeTab, setActiveTab] = useState<Tab>('commandes');
  const [search, setSearch] = useState('');

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: 'commandes', label: 'Commandes', icon: <ClipboardList className="h-4 w-4" />, count: mockOrders.length },
    { id: 'produits', label: 'Produits', icon: <Package className="h-4 w-4" />, count: products.length },
    { id: 'clients', label: 'Clients', icon: <Users className="h-4 w-4" />, count: clients.length },
  ];

  const handleGenerateFiche = () => {
    const productionOrders = mockOrders.filter(
      (o) => o.status === 'confirmed' || o.status === 'pending'
    );
    const aggregated: Record<string, { name: string; total: number; unit: string }> = {};
    productionOrders.forEach((order) => {
      order.items.forEach((item) => {
        if (aggregated[item.product.id]) {
          aggregated[item.product.id].total += item.quantity;
        } else {
          aggregated[item.product.id] = {
            name: item.product.name,
            total: item.quantity,
            unit: item.product.unit,
          };
        }
      });
    });
    toast.success('Fiche de production générée !', {
      description: `${Object.keys(aggregated).length} produit(s) à préparer`,
    });
  };

  return (
    <div className="min-h-screen">
      <Header />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Header */}
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

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-4">
          <StatCard label="Commandes" value={mockOrders.length} />
          <StatCard label="En attente" value={mockOrders.filter((o) => o.status === 'pending').length} />
          <StatCard label="Produits" value={products.length} />
          <StatCard label="Clients actifs" value={clients.filter((c) => c.active).length} />
        </div>

        {/* Tabs */}
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

        {/* Search */}
        <div className="relative mb-6 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Content */}
        {activeTab === 'commandes' && <CommandesTable search={search} />}
        {activeTab === 'produits' && <ProduitsTable search={search} />}
        {activeTab === 'clients' && <ClientsTable search={search} />}
      </div>
    </div>
  );
}

function CommandesTable({ search }: { search: string }) {
  const filtered = mockOrders.filter(
    (o) =>
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.pointOfSale.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="rounded-2xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>N° Commande</TableHead>
            <TableHead>Point de vente</TableHead>
            <TableHead>Articles</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                Aucune commande trouvée
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">{order.id}</TableCell>
                <TableCell>{order.pointOfSale}</TableCell>
                <TableCell>{order.items.length} produit(s)</TableCell>
                <TableCell className="text-right font-medium">{order.total.toFixed(2)} €</TableCell>
                <TableCell>
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[order.status]}`}>
                    {statusLabels[order.status]}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(order.createdAt).toLocaleDateString('fr-FR')}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function ProduitsTable({ search }: { search: string }) {
  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="rounded-2xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Réf.</TableHead>
            <TableHead>Nom</TableHead>
            <TableHead>Catégorie</TableHead>
            <TableHead className="text-right">Prix</TableHead>
            <TableHead>Unité</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                Aucun produit trouvé
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-mono text-xs text-muted-foreground">#{product.id}</TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.description}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium capitalize">
                    {product.category.replace('-', ' ')}
                  </span>
                </TableCell>
                <TableCell className="text-right font-medium">{product.price.toFixed(2)} €</TableCell>
                <TableCell className="text-muted-foreground">/ {product.unit}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function ClientsTable({ search }: { search: string }) {
  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.contact.toLowerCase().includes(search.toLowerCase()) ||
      c.address.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="rounded-2xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Réf.</TableHead>
            <TableHead>Point de vente</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Téléphone</TableHead>
            <TableHead>Ville</TableHead>
            <TableHead>Actif</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                Aucun client trouvé
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((client) => (
              <TableRow key={client.id}>
                <TableCell className="font-mono text-xs text-muted-foreground">{client.id}</TableCell>
                <TableCell className="font-medium">{client.name}</TableCell>
                <TableCell>{client.contact}</TableCell>
                <TableCell className="text-muted-foreground">{client.email}</TableCell>
                <TableCell className="text-muted-foreground">{client.phone}</TableCell>
                <TableCell>{client.address}</TableCell>
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
