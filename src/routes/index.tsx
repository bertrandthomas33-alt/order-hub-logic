import { createFileRoute, Link } from '@tanstack/react-router';
import { Header } from '@/components/Header';
import { ArrowRight, Package, BarChart3, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'JDC Distribution — Plateforme de commande' },
      { name: 'description', content: 'Solution de commande centralisée pour vos points de vente. Catalogue produits, gestion des commandes et fiches de production.' },
      { property: 'og:title', content: 'JDC Distribution — Plateforme de commande' },
      { property: 'og:description', content: 'Solution de commande centralisée pour vos points de vente.' },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/10" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-32">
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5">
              <span className="text-xs font-medium text-primary">Solution restauration sans cuisson</span>
            </div>
            <h1 className="font-heading text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl">
              Commandez vos
              <span className="text-primary"> produits frais</span>
              {' '}en un clic
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              Tous les ingrédients pour des réalisations haut de gamme. Livraison le lendemain pour toute commande passée avant 12h.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/catalogue">
                <Button size="lg" className="gap-2 rounded-xl px-8 text-base">
                  Commander maintenant
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/backoffice">
                <Button size="lg" variant="outline" className="rounded-xl px-8 text-base">
                  Accéder au back-office
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-card/50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-8 sm:grid-cols-3">
            <FeatureCard
              icon={<Package className="h-6 w-6" />}
              title="Catalogue complet"
              description="Soupes, antipasti, fromages, viandes… Tous vos produits en un seul endroit."
            />
            <FeatureCard
              icon={<BarChart3 className="h-6 w-6" />}
              title="Back-office centralisé"
              description="Visualisez et gérez toutes les commandes de vos points de vente en temps réel."
            />
            <FeatureCard
              icon={<Truck className="h-6 w-6" />}
              title="Livraison J+1"
              description="Commandez avant 12h, livraison le lendemain dans tous vos établissements."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-muted-foreground sm:px-6">
          © 2026 JDC Distribution — Tous droits réservés — 06 99 42 49 47
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-8 transition-all hover:shadow-lg hover:shadow-primary/5">
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="font-heading text-lg font-bold text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}
