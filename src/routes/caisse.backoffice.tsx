import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Receipt, CreditCard, Banknote, TrendingUp, Package, Settings, BarChart3, FileText, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PosArticlesTab } from '@/components/caisse/PosArticlesTab';
import { PosConfigTab } from '@/components/caisse/PosConfigTab';

export const Route = createFileRoute('/caisse/backoffice')({
  beforeLoad: async ({ location }) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw redirect({ to: '/login', search: { redirect: location.pathname } });
    }
  },
  component: CaisseBackoffice,
});

interface Ticket {
  id: string;
  ticket_number: string;
  date: string;
  total: number;
  subtotal: number;
  tva_amount: number;
  payment_method: string;
  lines: any;
  client_id: string;
}

function CaisseBackoffice() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
            <span className="text-base font-bold text-secondary-foreground">C</span>
          </div>
          <div>
            <h1 className="font-heading text-lg font-bold text-foreground">Back-office Caisse</h1>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Gestion de la caisse</p>
          </div>
        </div>
        <Link to="/caisse">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
        </Link>
      </div>

      <div className="flex-1 p-6 max-w-7xl mx-auto w-full">
        <Tabs defaultValue="rapport" className="space-y-6">
          <TabsList>
            <TabsTrigger value="rapport" className="gap-2">
              <Receipt className="h-4 w-4" />
              Rapport
            </TabsTrigger>
            <TabsTrigger value="articles" className="gap-2">
              <Package className="h-4 w-4" />
              Articles
            </TabsTrigger>
            <TabsTrigger value="config" className="gap-2">
              <Settings className="h-4 w-4" />
              Configuration
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rapport">
            <RapportPanel />
          </TabsContent>

          <TabsContent value="articles">
            <PosArticlesTab />
          </TabsContent>

          <TabsContent value="config">
            <PosConfigTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function TicketsPanel() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'today' | 'week' | 'all'>('today');
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [clientFilter, setClientFilter] = useState<string>('all');

  useEffect(() => {
    supabase
      .from('clients')
      .select('id, name')
      .eq('active', true)
      .order('name')
      .then(({ data }) => setClients(data || []));
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      let query = supabase
        .from('tickets_caisse')
        .select('*')
        .order('date', { ascending: false });

      if (filter === 'today') {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        query = query.gte('date', start.toISOString());
      } else if (filter === 'week') {
        const start = new Date();
        start.setDate(start.getDate() - 7);
        query = query.gte('date', start.toISOString());
      }

      if (clientFilter !== 'all') {
        query = query.eq('client_id', clientFilter);
      }

      const { data, error } = await query.limit(500);
      if (error) {
        toast.error('Erreur de chargement');
      } else {
        setTickets((data as Ticket[]) || []);
      }
      setLoading(false);
    };
    load();
  }, [filter, clientFilter]);

  const totalAll = tickets.reduce((s, t) => s + Number(t.total), 0);
  const totalCard = tickets
    .filter((t) => t.payment_method === 'card')
    .reduce((s, t) => s + Number(t.total), 0);
  const totalCash = tickets
    .filter((t) => t.payment_method === 'cash')
    .reduce((s, t) => s + Number(t.total), 0);

  const clientNameById = new Map(clients.map((c) => [c.id, c.name]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 items-center">
        {(['today', 'week', 'all'] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f === 'today' ? "Aujourd'hui" : f === 'week' ? '7 derniers jours' : 'Tout'}
          </Button>
        ))}
        <div className="ml-auto">
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Point de vente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les points de vente</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Total" value={totalAll} count={tickets.length} />
        <StatCard icon={<CreditCard className="h-5 w-5" />} label="Carte" value={totalCard} count={tickets.filter(t => t.payment_method === 'card').length} />
        <StatCard icon={<Banknote className="h-5 w-5" />} label="Espèces" value={totalCash} count={tickets.filter(t => t.payment_method === 'cash').length} />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border px-4 py-3 flex items-center gap-2">
          <Receipt className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-heading font-semibold text-foreground">Tickets</h2>
        </div>
        <ScrollArea className="h-[500px]">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Chargement...</div>
          ) : tickets.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Aucun ticket pour cette période</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2">N° ticket</th>
                  <th className="text-left px-4 py-2">Date</th>
                  <th className="text-left px-4 py-2">Point de vente</th>
                  <th className="text-left px-4 py-2">Paiement</th>
                  <th className="text-right px-4 py-2">HT</th>
                  <th className="text-right px-4 py-2">TVA</th>
                  <th className="text-right px-4 py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-2 font-mono text-xs">{t.ticket_number}</td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {new Date(t.date).toLocaleString('fr-FR')}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {clientNameById.get(t.client_id) || '—'}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${t.payment_method === 'card' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                        {t.payment_method === 'card' ? 'Carte' : 'Espèces'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right text-muted-foreground">{Number(t.subtotal).toFixed(2)} €</td>
                    <td className="px-4 py-2 text-right text-muted-foreground">{Number(t.tva_amount).toFixed(2)} €</td>
                    <td className="px-4 py-2 text-right font-semibold">{Number(t.total).toFixed(2)} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, count }: { icon: React.ReactNode; label: string; value: number; count: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        {icon}
        <span className="text-xs uppercase tracking-wider">{label}</span>
      </div>
      <div className="font-heading text-2xl font-bold text-foreground">{value.toFixed(2)} €</div>
      <div className="text-xs text-muted-foreground mt-1">{count} ticket{count > 1 ? 's' : ''}</div>
    </div>
  );
}
