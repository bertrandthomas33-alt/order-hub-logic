-- Table de configuration des articles visibles dans le POS par point de vente
CREATE TABLE public.pos_products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  warehouse_id uuid NOT NULL,
  product_id uuid NOT NULL,
  visible boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (warehouse_id, product_id)
);

ALTER TABLE public.pos_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on pos_products"
  ON public.pos_products
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view pos_products"
  ON public.pos_products
  FOR SELECT
  TO authenticated
  USING (true);

CREATE TRIGGER update_pos_products_updated_at
  BEFORE UPDATE ON public.pos_products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_pos_products_warehouse ON public.pos_products(warehouse_id);
CREATE INDEX idx_pos_products_product ON public.pos_products(product_id);