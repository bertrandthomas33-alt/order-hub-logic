ALTER TABLE public.ingredients ADD COLUMN stock_quantity numeric NOT NULL DEFAULT 0;
ALTER TABLE public.ingredients ADD COLUMN stock_min numeric NOT NULL DEFAULT 0;