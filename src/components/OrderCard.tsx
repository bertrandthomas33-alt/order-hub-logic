import type { Order } from '@/lib/mock-data';
import { Badge } from '@/components/ui/badge';

const statusConfig: Record<Order['status'], { label: string; className: string }> = {
  pending: { label: 'En attente', className: 'bg-warning/15 text-warning-foreground border-warning/30' },
  confirmed: { label: 'Confirmée', className: 'bg-primary/15 text-foreground border-primary/30' },
  in_production: { label: 'En production', className: 'bg-chart-2/15 text-foreground border-chart-2/30' },
  delivered: { label: 'Livrée', className: 'bg-success/15 text-foreground border-success/30' },
};

export function OrderCard({ order }: { order: Order }) {
  const config = statusConfig[order.status];
  const date = new Date(order.createdAt);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 transition-all hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="font-heading text-base font-bold text-foreground">{order.id}</h3>
            <Badge variant="outline" className={config.className}>
              {config.label}
            </Badge>
          </div>
          <p className="mt-1 text-sm font-medium text-muted-foreground">{order.pointOfSale}</p>
        </div>
        <div className="text-right">
          <p className="font-heading text-lg font-bold text-foreground">{order.total.toFixed(2)} €</p>
          <p className="text-xs text-muted-foreground">
            {date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {order.items.map((item) => (
          <div key={item.product.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
            <span className="text-sm text-foreground">{item.product.name}</span>
            <span className="text-sm font-medium text-muted-foreground">
              x{item.quantity} — {(item.product.price * item.quantity).toFixed(2)} €
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
