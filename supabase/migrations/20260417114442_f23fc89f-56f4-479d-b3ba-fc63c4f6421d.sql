-- Fonction qui recalcule le cost_price d'un produit à partir de sa fiche technique
CREATE OR REPLACE FUNCTION public.recalc_product_cost_from_recipe(_product_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total numeric := 0;
  v_yield numeric := 1;
  v_recipe_id uuid;
BEGIN
  SELECT id, COALESCE(NULLIF(yield_quantity, 0), 1)
    INTO v_recipe_id, v_yield
  FROM public.recipes
  WHERE product_id = _product_id
  LIMIT 1;

  -- Pas de fiche technique → on ne touche pas au cost_price
  IF v_recipe_id IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM(ri.quantity * COALESCE(i.cost_per_unit, 0)), 0)
    INTO v_total
  FROM public.recipe_ingredients ri
  JOIN public.ingredients i ON i.id = ri.ingredient_id
  WHERE ri.recipe_id = v_recipe_id;

  UPDATE public.products
  SET cost_price = ROUND((v_total / v_yield)::numeric, 4)
  WHERE id = _product_id;
END;
$$;

-- Trigger : quand on modifie une recette (yield) → recalcule
CREATE OR REPLACE FUNCTION public.trg_recipes_recalc_cost()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    PERFORM public.recalc_product_cost_from_recipe(OLD.product_id);
    RETURN OLD;
  ELSE
    PERFORM public.recalc_product_cost_from_recipe(NEW.product_id);
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS recipes_recalc_cost ON public.recipes;
CREATE TRIGGER recipes_recalc_cost
AFTER INSERT OR UPDATE OR DELETE ON public.recipes
FOR EACH ROW EXECUTE FUNCTION public.trg_recipes_recalc_cost();

-- Trigger : quand on modifie les ingrédients d'une recette → recalcule
CREATE OR REPLACE FUNCTION public.trg_recipe_ingredients_recalc_cost()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product_id uuid;
  v_recipe_id uuid;
BEGIN
  v_recipe_id := COALESCE(NEW.recipe_id, OLD.recipe_id);
  SELECT product_id INTO v_product_id FROM public.recipes WHERE id = v_recipe_id;
  IF v_product_id IS NOT NULL THEN
    PERFORM public.recalc_product_cost_from_recipe(v_product_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS recipe_ingredients_recalc_cost ON public.recipe_ingredients;
CREATE TRIGGER recipe_ingredients_recalc_cost
AFTER INSERT OR UPDATE OR DELETE ON public.recipe_ingredients
FOR EACH ROW EXECUTE FUNCTION public.trg_recipe_ingredients_recalc_cost();

-- Trigger : quand on modifie le coût d'un ingrédient → recalcule tous les produits qui l'utilisent
CREATE OR REPLACE FUNCTION public.trg_ingredients_recalc_cost()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  IF NEW.cost_per_unit IS DISTINCT FROM OLD.cost_per_unit THEN
    FOR r IN
      SELECT DISTINCT rec.product_id
      FROM public.recipe_ingredients ri
      JOIN public.recipes rec ON rec.id = ri.recipe_id
      WHERE ri.ingredient_id = NEW.id
    LOOP
      PERFORM public.recalc_product_cost_from_recipe(r.product_id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ingredients_recalc_cost ON public.ingredients;
CREATE TRIGGER ingredients_recalc_cost
AFTER UPDATE ON public.ingredients
FOR EACH ROW EXECUTE FUNCTION public.trg_ingredients_recalc_cost();

-- Backfill : recalcule TOUS les produits qui ont une fiche technique maintenant
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT DISTINCT product_id FROM public.recipes LOOP
    PERFORM public.recalc_product_cost_from_recipe(r.product_id);
  END LOOP;
END $$;