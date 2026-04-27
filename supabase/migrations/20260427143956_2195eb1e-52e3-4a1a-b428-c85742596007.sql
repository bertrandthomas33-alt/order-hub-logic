-- Configuration POS globale (non liée à un entrepôt)
-- Catégories masquées sur le POS (par nom de catégorie pour rester stable malgré les doublons par entrepôt)
CREATE TABLE public.pos_hidden_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pos_hidden_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view pos_hidden_categories"
  ON public.pos_hidden_categories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage pos_hidden_categories"
  ON public.pos_hidden_categories
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Articles masqués sur le POS (override global)
CREATE TABLE public.pos_hidden_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pos_hidden_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view pos_hidden_products"
  ON public.pos_hidden_products
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage pos_hidden_products"
  ON public.pos_hidden_products
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));