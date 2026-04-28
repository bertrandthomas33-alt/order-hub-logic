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

type PeriodPreset = 'day' | 'week' | 'month' | 'year' | 'custom';

interface TicketLine {
  product_id?: string;
  product_name?: string;
  name?: string;
  quantity?: number;
  qty?: number;
  unit_price?: number;
  price?: number;
  total?: number;
  tva_rate?: number;
}

function getPeriodRange(preset: PeriodPreset, customFrom?: Date, customTo?: Date): { from: Date; to: Date } {
  const now = new Date();
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);
  const from = new Date(now);
  if (preset === 'day') {
    from.setHours(0, 0, 0, 0);
  } else if (preset === 'week') {
    from.setDate(from.getDate() - 6);
    from.setHours(0, 0, 0, 0);
  } else if (preset === 'month') {
    from.setMonth(from.getMonth() - 1);
    from.setHours(0, 0, 0, 0);
  } else if (preset === 'year') {
    from.setFullYear(from.getFullYear() - 1);
    from.setHours(0, 0, 0, 0);
  } else if (preset === 'custom' && customFrom && customTo) {
    const f = new Date(customFrom); f.setHours(0, 0, 0, 0);
    const t = new Date(customTo); t.setHours(23, 59, 59, 999);
    return { from: f, to: t };
  }
  return { from, to };
}

function RapportPanel() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodPreset>('day');
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
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
      const { from, to } = getPeriodRange(period, customFrom, customTo);
      let query = supabase
        .from('tickets_caisse')
        .select('*')
        .gte('date', from.toISOString())
        .lte('date', to.toISOString())
        .order('date', { ascending: false });

      if (clientFilter !== 'all') {
        query = query.eq('client_id', clientFilter);
      }

      const { data, error } = await query.limit(1000);
      if (error) {
        toast.error('Erreur de chargement');
      } else {
        setTickets((data as Ticket[]) || []);
      }
      setLoading(false);
    };
    if (period !== 'custom' || (customFrom && customTo)) {
      load();
    }
  }, [period, customFrom, customTo, clientFilter]);

  const totalAll = tickets.reduce((s, t) => s + Number(t.total), 0);
  const totalCard = tickets.filter((t) => t.payment_method === 'card').reduce((s, t) => s + Number(t.total), 0);
  const totalCash = tickets.filter((t) => t.payment_method === 'cash').reduce((s, t) => s + Number(t.total), 0);

  const clientNameById = useMemo(() => new Map(clients.map((c) => [c.id, c.name])), [clients]);

  return (
    <div className="space-y-6">
      {/* Filtres période + point de vente */}
      <div className="flex flex-wrap gap-2 items-center">
        {(['day', 'week', 'month', 'year', 'custom'] as const).map((p) => (
          <Button
            key={p}
            variant={period === p ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod(p)}
          >
            {p === 'day' ? 'Jour' : p === 'week' ? 'Semaine' : p === 'month' ? 'Mois' : p === 'year' ? 'Année' : 'Personnalisé'}
          </Button>
        ))}
        {period === 'custom' && (
          <>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn('gap-2', !customFrom && 'text-muted-foreground')}>
                  <CalendarIcon className="h-4 w-4" />
                  {customFrom ? format(customFrom, 'dd MMM yyyy', { locale: fr }) : 'Du'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={customFrom} onSelect={setCustomFrom} initialFocus className={cn('p-3 pointer-events-auto')} />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn('gap-2', !customTo && 'text-muted-foreground')}>
                  <CalendarIcon className="h-4 w-4" />
                  {customTo ? format(customTo, 'dd MMM yyyy', { locale: fr }) : 'Au'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={customTo} onSelect={setCustomTo} initialFocus className={cn('p-3 pointer-events-auto')} />
              </PopoverContent>
            </Popover>
          </>
        )}
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

      {/* Stats globales */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Total" value={totalAll} count={tickets.length} />
        <StatCard icon={<CreditCard className="h-5 w-5" />} label="Carte" value={totalCard} count={tickets.filter(t => t.payment_method === 'card').length} />
        <StatCard icon={<Banknote className="h-5 w-5" />} label="Espèces" value={totalCash} count={tickets.filter(t => t.payment_method === 'cash').length} />
      </div>

      {/* Sous-onglets */}
      <Tabs defaultValue="tickets" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tickets" className="gap-2">
            <Receipt className="h-4 w-4" />
            Tickets
          </TabsTrigger>
          <TabsTrigger value="produits" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Rapport produits
          </TabsTrigger>
          <TabsTrigger value="fiscal" className="gap-2">
            <FileText className="h-4 w-4" />
            Rapport fiscal
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tickets">
          <TicketsTable tickets={tickets} loading={loading} clientNameById={clientNameById} />
        </TabsContent>
        <TabsContent value="produits">
          <ProductsReport tickets={tickets} loading={loading} />
        </TabsContent>
        <TabsContent value="fiscal">
          <FiscalReport tickets={tickets} loading={loading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TicketsTable({ tickets, loading, clientNameById }: { tickets: Ticket[]; loading: boolean; clientNameById: Map<string, string> }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
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
                  <td className="px-4 py-2 text-muted-foreground">{new Date(t.date).toLocaleString('fr-FR')}</td>
                  <td className="px-4 py-2 text-muted-foreground">{clientNameById.get(t.client_id) || '—'}</td>
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
  );
}

function ProductsReport({ tickets, loading }: { tickets: Ticket[]; loading: boolean }) {
  const rows = useMemo(() => {
    const map = new Map<string, { name: string; quantity: number; total: number }>();
    for (const t of tickets) {
      const lines: TicketLine[] = Array.isArray(t.lines) ? t.lines : [];
      for (const l of lines) {
        const name = l.product_name || l.name || 'Produit inconnu';
        const key = (l.product_id as string) || name;
        const qty = Number(l.quantity ?? l.qty ?? 0);
        const unit = Number(l.unit_price ?? l.price ?? 0);
        const lineTotal = Number(l.total ?? unit * qty);
        const cur = map.get(key) || { name, quantity: 0, total: 0 };
        cur.quantity += qty;
        cur.total += lineTotal;
        map.set(key, cur);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [tickets]);

  const grandTotal = rows.reduce((s, r) => s + r.total, 0);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <ScrollArea className="h-[500px]">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Chargement...</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Aucune vente sur cette période</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2">Produit</th>
                <th className="text-right px-4 py-2">Quantité</th>
                <th className="text-right px-4 py-2">Total TTC</th>
                <th className="text-right px-4 py-2">% CA</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-2 font-medium">{r.name}</td>
                  <td className="px-4 py-2 text-right text-muted-foreground">{r.quantity.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right font-semibold">{r.total.toFixed(2)} €</td>
                  <td className="px-4 py-2 text-right text-muted-foreground">
                    {grandTotal > 0 ? ((r.total / grandTotal) * 100).toFixed(1) : '0.0'} %
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-border bg-muted/30 font-semibold">
                <td className="px-4 py-2">Total</td>
                <td className="px-4 py-2 text-right">{rows.reduce((s, r) => s + r.quantity, 0).toFixed(2)}</td>
                <td className="px-4 py-2 text-right">{grandTotal.toFixed(2)} €</td>
                <td className="px-4 py-2 text-right">100,0 %</td>
              </tr>
            </tbody>
          </table>
        )}
      </ScrollArea>
    </div>
  );
}

function FiscalReport({ tickets, loading }: { tickets: Ticket[]; loading: boolean }) {
  const rows = useMemo(() => {
    const map = new Map<number, { rate: number; ht: number; tva: number; ttc: number }>();
    for (const t of tickets) {
      const lines: TicketLine[] = Array.isArray(t.lines) ? t.lines : [];
      if (lines.length > 0 && lines.some((l) => l.tva_rate != null)) {
        // Ventilation par ligne si dispo
        for (const l of lines) {
          const rate = Number(l.tva_rate ?? 0);
          const qty = Number(l.quantity ?? l.qty ?? 0);
          const unit = Number(l.unit_price ?? l.price ?? 0);
          const ttc = Number(l.total ?? unit * qty);
          const ht = rate > 0 ? ttc / (1 + rate / 100) : ttc;
          const tva = ttc - ht;
          const cur = map.get(rate) || { rate, ht: 0, tva: 0, ttc: 0 };
          cur.ht += ht; cur.tva += tva; cur.ttc += ttc;
          map.set(rate, cur);
        }
      } else {
        // Fallback: taux du ticket
        const rate = Number((t as any).tva_rate ?? 0);
        const ttc = Number(t.total);
        const tva = Number(t.tva_amount);
        const ht = Number(t.subtotal);
        const cur = map.get(rate) || { rate, ht: 0, tva: 0, ttc: 0 };
        cur.ht += ht; cur.tva += tva; cur.ttc += ttc;
        map.set(rate, cur);
      }
    }
    return Array.from(map.values()).sort((a, b) => a.rate - b.rate);
  }, [tickets]);

  const totHt = rows.reduce((s, r) => s + r.ht, 0);
  const totTva = rows.reduce((s, r) => s + r.tva, 0);
  const totTtc = rows.reduce((s, r) => s + r.ttc, 0);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <ScrollArea className="h-[500px]">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Chargement...</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Aucune vente sur cette période</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2">Taux TVA</th>
                <th className="text-right px-4 py-2">Base HT</th>
                <th className="text-right px-4 py-2">Montant TVA</th>
                <th className="text-right px-4 py-2">Total TTC</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.rate} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-2 font-medium">{r.rate.toFixed(2)} %</td>
                  <td className="px-4 py-2 text-right text-muted-foreground">{r.ht.toFixed(2)} €</td>
                  <td className="px-4 py-2 text-right text-muted-foreground">{r.tva.toFixed(2)} €</td>
                  <td className="px-4 py-2 text-right font-semibold">{r.ttc.toFixed(2)} €</td>
                </tr>
              ))}
              <tr className="border-t-2 border-border bg-muted/30 font-semibold">
                <td className="px-4 py-2">Total</td>
                <td className="px-4 py-2 text-right">{totHt.toFixed(2)} €</td>
                <td className="px-4 py-2 text-right">{totTva.toFixed(2)} €</td>
                <td className="px-4 py-2 text-right">{totTtc.toFixed(2)} €</td>
              </tr>
            </tbody>
          </table>
        )}
      </ScrollArea>
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
