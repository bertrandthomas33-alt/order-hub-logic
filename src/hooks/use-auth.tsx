import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  session: Session | null;
  role: 'admin' | 'pdv' | null;
  clientId: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

const defaultAuthState: AuthState = {
  isAuthenticated: false,
  isLoading: true,
  user: null,
  session: null,
  role: null,
  clientId: null,
  login: async () => {},
  logout: async () => {},
};

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    // During SSR, AuthProvider may not be mounted yet — return safe defaults
    if (typeof window === 'undefined') return defaultAuthState;
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<'admin' | 'pdv' | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(typeof window !== 'undefined');
  const [isMounted, setIsMounted] = useState(false);

  const fetchRoleAndClient = useCallback(async (userId: string) => {
    try {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .limit(1)
        .single();

      const r = (roleData?.role as 'admin' | 'pdv') ?? null;
      setRole(r);

      if (r === 'pdv') {
        const { data: clientData } = await supabase
          .from('clients')
          .select('id')
          .eq('user_id', userId)
          .limit(1)
          .single();
        setClientId(clientData?.id ?? null);
      } else {
        setClientId(null);
      }
    } catch {
      setRole(null);
      setClientId(null);
    }
  }, []);

  useEffect(() => {
    setIsMounted(true);

    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    const syncAuthState = (sess: Session | null) => {
      setSession(sess);
      setUser(sess?.user ?? null);

      if (!sess?.user) {
        setRole(null);
        setClientId(null);
        setIsLoading(false);
        return;
      }

      void fetchRoleAndClient(sess.user.id).finally(() => {
        setIsLoading(false);
      });
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, sess) => {
        syncAuthState(sess);
      }
    );

    void supabase.auth.getSession().then(({ data: { session: sess } }) => {
      syncAuthState(sess);
    });

    return () => subscription.unsubscribe();
  }, [fetchRoleAndClient]);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setRole(null);
    setClientId(null);
  }, []);

  const value: AuthState = {
    isAuthenticated: !!user,
    isLoading,
    user,
    session,
    role,
    clientId,
    login,
    logout,
  };

  if (isMounted && isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
