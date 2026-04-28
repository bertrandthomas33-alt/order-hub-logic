-- Remplacer warehouse_id par client_id (points de vente = clients)
DROP INDEX IF EXISTS public.pos_hidden_categories_unique;
DROP INDEX IF EXISTS public.pos_hidden_products_unique;

ALTER TABLE public.pos_hidden_categories DROP COLUMN IF EXISTS warehouse_id;
ALTER TABLE public.pos_hidden_products DROP COLUMN IF EXISTS warehouse_id;

ALTER TABLE public.pos_hidden_categories ADD COLUMN client_id uuid;
ALTER TABLE public.pos_hidden_products ADD COLUMN client_id uuid;

CREATE UNIQUE INDEX pos_hidden_categories_unique
  ON public.pos_hidden_categories (client_id, category_name);

CREATE UNIQUE INDEX pos_hidden_products_unique
  ON public.pos_hidden_products (client_id, product_id);

-- Permettre aux PDV de lire leur propre config
DROP POLICY IF EXISTS "Authenticated can view pos_hidden_categories" ON public.pos_hidden_categories;
DROP POLICY IF EXISTS "Authenticated can view pos_hidden_products" ON public.pos_hidden_products;

CREATE POLICY "Authenticated can view pos_hidden_categories"
  ON public.pos_hidden_categories FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated can view pos_hidden_products"
  ON public.pos_hidden_products FOR SELECT
  TO authenticated USING (true);
