-- Table pour le suivi quotidien du stock par produit (entrepôt fini)
CREATE TABLE public.product_daily_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  stock_date date NOT NULL DEFAULT CURRENT_DATE,
  recu numeric NOT NULL DEFAULT 0,
  stock numeric NOT NULL DEFAULT 0,
  perte numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, product_id, stock_date)
);

CREATE INDEX idx_pds_client_date ON public.product_daily_stock(client_id, stock_date);
CREATE INDEX idx_pds_product ON public.product_daily_stock(product_id);

ALTER TABLE public.product_daily_stock ENABLE ROW LEVEL SECURITY;

-- Admins: full access
CREATE POLICY "Admins full access on product_daily_stock"
ON public.product_daily_stock
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- PDV: voir et gérer leurs propres stocks
CREATE POLICY "PDV can view own daily stock"
ON public.product_daily_stock
FOR SELECT
TO authenticated
USING (client_id = get_client_id_for_user(auth.uid()));

CREATE POLICY "PDV can insert own daily stock"
ON public.product_daily_stock
FOR INSERT
TO authenticated
WITH CHECK (client_id = get_client_id_for_user(auth.uid()));

CREATE POLICY "PDV can update own daily stock"
ON public.product_daily_stock
FOR UPDATE
TO authenticated
USING (client_id = get_client_id_for_user(auth.uid()))
WITH CHECK (client_id = get_client_id_for_user(auth.uid()));

CREATE TRIGGER trg_pds_updated_at
BEFORE UPDATE ON public.product_daily_stock
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();