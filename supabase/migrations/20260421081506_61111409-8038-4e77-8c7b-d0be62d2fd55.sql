-- 1) Recalculer d'abord tous les super-ingrédients (ordre important : un super peut composer un autre super)
DO $$
DECLARE r record;
BEGIN
  -- Deux passes pour gérer les super-of-super
  FOR r IN SELECT id FROM public.ingredients WHERE is_super = true LOOP
    PERFORM public.recalc_super_ingredient_cost(r.id);
  END LOOP;
  FOR r IN SELECT id FROM public.ingredients WHERE is_super = true LOOP
    PERFORM public.recalc_super_ingredient_cost(r.id);
  END LOOP;
END $$;

-- 2) Recalculer tous les produits ayant une recette
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT product_id FROM public.recipes LOOP
    PERFORM public.recalc_product_cost_from_recipe(r.product_id);
  END LOOP;
END $$;