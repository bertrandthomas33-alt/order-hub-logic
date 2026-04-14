import { Outlet, Link, createRootRouteWithContext, HeadContent, Scripts, useRouter } from "@tanstack/react-router";
import { Toaster } from "sonner";
import type { AuthState } from "@/hooks/use-auth";
import { useAuth } from "@/hooks/use-auth";

import appCss from "../styles.css?url";

interface RouterContext {
  auth: AuthState;
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          Page non trouvée
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          La page que vous recherchez n'existe pas.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "JDC Distribution — Plateforme de commande" },
      { name: "description", content: "Solution de commande centralisée pour vos points de vente." },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const auth = useAuth();

  return (
    <RouterContextProvider auth={auth}>
      <Outlet />
      <Toaster position="top-right" richColors />
    </RouterContextProvider>
  );
}

function RouterContextProvider({ auth, children }: { auth: AuthState; children: React.ReactNode }) {
  const router = useRouter();
  
  // Update router context with current auth state
  if (router.options.context) {
    (router.options.context as any).auth = auth;
  }

  if (auth.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
