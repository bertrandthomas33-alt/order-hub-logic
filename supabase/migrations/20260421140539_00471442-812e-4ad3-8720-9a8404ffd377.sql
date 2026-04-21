ALTER TABLE public.ingredients
ADD COLUMN IF NOT EXISTS kcal_per_unit numeric NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.ingredients.kcal_per_unit IS 'Calories (kcal) pour 1 unité de base (ex: 1 kg, 1 litre, 1 unité)';