-- Table tickets_caisse pour stocker les ventes en caisse enregistreuse
CREATE TABLE public.tickets_caisse (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number TEXT NOT NULL UNIQUE,
  client_id UUID NOT NULL,
  warehouse_id UUID,
  date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  lines JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tva_rate NUMERIC NOT NULL DEFAULT 10,
  tva_amount NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_tickets_caisse_client_id ON public.tickets_caisse(client_id);
CREATE INDEX idx_tickets_caisse_date ON public.tickets_caisse(date DESC);

ALTER TABLE public.tickets_caisse ENABLE ROW LEVEL SECURITY;

-- Admins: tout
CREATE POLICY "Admins full access on tickets_caisse"
ON public.tickets_caisse
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- PDV: voir ses propres tickets
CREATE POLICY "PDV can view own tickets"
ON public.tickets_caisse
FOR SELECT
TO authenticated
USING (client_id = get_client_id_for_user(auth.uid()));

-- PDV: créer ses propres tickets
CREATE POLICY "PDV can insert own tickets"
ON public.tickets_caisse
FOR INSERT
TO authenticated
WITH CHECK (client_id = get_client_id_for_user(auth.uid()));

-- Trigger updated_at
CREATE TRIGGER trg_tickets_caisse_updated_at
BEFORE UPDATE ON public.tickets_caisse
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();