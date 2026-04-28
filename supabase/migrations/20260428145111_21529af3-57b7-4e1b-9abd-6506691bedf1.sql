ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS tva_rate numeric NOT NULL DEFAULT 10;
ALTER TABLE public.categories ADD CONSTRAINT categories_tva_rate_check CHECK (tva_rate IN (5.5, 10, 20));