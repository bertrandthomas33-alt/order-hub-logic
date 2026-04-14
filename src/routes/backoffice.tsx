import { createFileRoute } from '@tanstack/react-router';
import { Header } from '@/components/Header';
import { OrderCard } from '@/components/OrderCard';
import { mockOrders } from '@/lib/mock-data';
import { useState } from 'react';
import { ClipboardList, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
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

function BackofficePage() {
  const [statusFilter, setStatusFilter] = useState<Order['status'] | 'all'>('all');

  const filteredOrders = statusFilter === 'all'
    ? mockOrders
    : mockOrders.filter((o) => o.status === statusFilter);

  const stats = {
    total: mockOrders.length,
    pending: mockOrders.filter((o) => o.status === 'pending').length,
    confirmed: mockOrders.filter((o) => o.status === 'confirmed').length,
    inProduction: mockOrders.filter((o) => o.status === 'in_production').length,
    delivered: mockOrders.filter((o) => o.status === 'delivered').length,
  };

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
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-extrabold text-foreground">Back-office</h1>
            <p className="mt-1 text-muted-foreground">Gestion centralisée des commandes</p>
          </div>
          <Button className="gap-2 rounded-xl" onClick={handleGenerateFiche}>
            <FileText className="h-4 w-4" />
            Générer fiche de production
          </Button>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-4">
          <StatCard label="Total" value={stats.total} />
          <StatCard label="En attente" value={stats.pending} color="warning" />
          <StatCard label="Confirmées" value={stats.confirmed} color="primary" />
          <StatCard label="En production" value={stats.inProduction} color="chart-2" />
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-2">
          {([['all', 'Toutes'], ['pending', 'En attente'], ['confirmed', 'Confirmées'], ['in_production', 'En production'], ['delivered', 'Livrées']] as const).map(
            ([value, label]) => (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  statusFilter === value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}
              >
                {label}
              </button>
            )
          )}
        </div>

        {/* Orders */}
        {filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <ClipboardList className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium text-muted-foreground">Aucune commande</p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color = 'foreground' }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 font-heading text-3xl font-extrabold text-foreground">{value}</p>
    </div>
  );
}
