import { createFileRoute, Link, Outlet, redirect, useLocation } from '@tanstack/react-router';
import { ShoppingCart, BarChart3, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

export const Route = createFileRoute('/caisse')({
  beforeLoad: async ({ location }) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw redirect({ to: '/login', search: { redirect: location.pathname } });
    }
  },
  component: CaisseLayout,
});

function CaisseLayout() {
  const location = useLocation();
  if (location.pathname !== '/caisse') {
    return <Outlet />;
  }
  return <CaisseHub />;
}


function CaisseHub() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
            <span className="text-base font-bold text-secondary-foreground">C</span>
          </div>
          <div>
            <h1 className="font-heading text-lg font-bold text-foreground">Caisse</h1>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">JDC Distribution</p>
          </div>
        </div>
        <Link to="/">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="grid w-full max-w-4xl gap-6 sm:grid-cols-2">
          <div className="h-full rounded-2xl border border-border bg-card p-8 transition-all hover:border-primary hover:shadow-lg">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground mb-6">
              <ShoppingCart className="h-7 w-7" />
            </div>
            <h2 className="font-heading text-2xl font-bold text-foreground mb-2">Caisse</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Encaisser une vente, gérer le panier, paiement carte ou espèces et impression du ticket.
            </p>
            <Link to="/caisse/pos" className="mt-6 inline-flex">
              <Button className="gap-2">
                Ouvrir la caisse
              </Button>
            </Link>
          </div>

          <div className="h-full rounded-2xl border border-border bg-card p-8 transition-all hover:border-primary hover:shadow-lg">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary text-secondary-foreground mb-6">
              <BarChart3 className="h-7 w-7" />
            </div>
            <h2 className="font-heading text-2xl font-bold text-foreground mb-2">Back-office</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Consulter l'historique des tickets, suivre les ventes par mode de paiement et clôturer la caisse.
            </p>
            <Link to="/caisse/backoffice" className="mt-6 inline-flex">
              <Button variant="outline" className="gap-2">
                Ouvrir le back-office
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
