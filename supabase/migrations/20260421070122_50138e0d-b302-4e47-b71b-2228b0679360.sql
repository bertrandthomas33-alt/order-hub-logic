-- Create enum for ingredient types
CREATE TYPE public.ingredient_type AS ENUM ('surgele', 'frais', 'epicerie', 'fruits_legumes', 'emballage');

-- Add column to ingredients
ALTER TABLE public.ingredients
ADD COLUMN ingredient_type public.ingredient_type NOT NULL DEFAULT 'epicerie';