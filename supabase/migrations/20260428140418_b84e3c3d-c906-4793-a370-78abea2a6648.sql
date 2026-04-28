-- Ajout colonne warehouse_id pour configuration POS par point de vente
ALTER TABLE public.pos_hidden_categories
  ADD COLUMN warehouse_id uuid;

ALTER TABLE public.pos_hidden_products
  ADD COLUMN warehouse_id uuid;

-- Contraintes d'unicité par point de vente
CREATE UNIQUE INDEX IF NOT EXISTS pos_hidden_categories_unique
  ON public.pos_hidden_categories (warehouse_id, category_name);

CREATE UNIQUE INDEX IF NOT EXISTS pos_hidden_products_unique
  ON public.pos_hidden_products (warehouse_id, product_id);
