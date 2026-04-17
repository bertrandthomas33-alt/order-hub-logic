ALTER TABLE public.ingredients
ADD COLUMN supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL;

CREATE INDEX idx_ingredients_supplier_id ON public.ingredients(supplier_id);