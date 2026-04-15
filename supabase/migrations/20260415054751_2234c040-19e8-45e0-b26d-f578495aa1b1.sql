ALTER TABLE public.products
  ADD COLUMN image_url text DEFAULT NULL,
  ADD COLUMN stock numeric NOT NULL DEFAULT 0;