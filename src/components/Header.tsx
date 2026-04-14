import { Link, useLocation } from '@tanstack/react-router';
import { ShoppingCart, Package, Menu } from 'lucide-react';
import { useCartStore } from '@/lib/cart-store';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export function Header() {
  const location = useLocation();
  const itemCount = useCartStore((s) => s.itemCount());
  const [mobileOpen, setMobileOpen] = useState(false);
  const isBackoffice = location.pathname.startsWith('/backoffice');

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <span className="text-lg font-bold text-primary-foreground">J</span>
          </div>
          <div className="hidden sm:block">
            <span className="font-heading text-lg font-bold text-foreground">JDC</span>
            <span className="font-heading text-lg font-medium text-muted-foreground"> Distribution</span>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Link
            to="/catalogue"
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            activeProps={{ className: 'rounded-lg px-4 py-2 text-sm font-medium bg-accent text-foreground' }}
          >
            Catalogue
          </Link>
          <Link
            to="/backoffice"
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            activeProps={{ className: 'rounded-lg px-4 py-2 text-sm font-medium bg-accent text-foreground' }}
          >
            Back-office
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {!isBackoffice && (
            <Link to="/panier" className="relative">
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingCart className="h-5 w-5" />
                {itemCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {itemCount}
                  </span>
                )}
              </Button>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-border bg-card px-4 pb-4 pt-2 md:hidden">
          <Link
            to="/catalogue"
            className="block rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent"
            onClick={() => setMobileOpen(false)}
          >
            Catalogue
          </Link>
          <Link
            to="/backoffice"
            className="block rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent"
            onClick={() => setMobileOpen(false)}
          >
            Back-office
          </Link>
        </div>
      )}
    </header>
  );
}
