-- 1. Marquer les ingrédients comme "super" + ajouter rendement
ALTER TABLE public.ingredients
  ADD COLUMN IF NOT EXISTS is_super boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS yield_quantity numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS yield_unit text;

-- 2. Table des composants d'un super ingrédient
CREATE TABLE IF NOT EXISTS public.super_ingredient_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  super_ingredient_id uuid NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  component_ingredient_id uuid NOT NULL REFERENCES public.ingredients(id) ON DELETE RESTRICT,
  quantity numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'kg',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT no_self_reference CHECK (super_ingredient_id <> component_ingredient_id)
);

CREATE INDEX IF NOT EXISTS idx_sic_super ON public.super_ingredient_components(super_ingredient_id);
CREATE INDEX IF NOT EXISTS idx_sic_component ON public.super_ingredient_components(component_ingredient_id);

ALTER TABLE public.super_ingredient_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on super_ingredient_components"
  ON public.super_ingredient_components
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view super_ingredient_components"
  ON public.super_ingredient_components
  FOR SELECT
  TO authenticated
  USING (true);

-- 3. Fonction qui recalcule le cost_per_unit d'un super ingrédient
CREATE OR REPLACE FUNCTION public.recalc_super_ingredient_cost(_super_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total numeric := 0;
  v_yield numeric := 1;
  v_is_super boolean := false;
BEGIN
  SELECT is_super, COALESCE(NULLIF(yield_quantity, 0), 1)
    INTO v_is_super, v_yield
  FROM public.ingredients WHERE id = _super_id;

  IF NOT COALESCE(v_is_super, false) THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM(sic.quantity * COALESCE(i.cost_per_unit, 0)), 0)
    INTO v_total
  FROM public.super_ingredient_components sic
  JOIN public.ingredients i ON i.id = sic.component_ingredient_id
  WHERE sic.super_ingredient_id = _super_id;

  UPDATE public.ingredients
  SET cost_per_unit = ROUND((v_total / v_yield)::numeric, 4)
  WHERE id = _super_id;
END;
$$;

-- 4. Trigger sur super_ingredient_components
CREATE OR REPLACE FUNCTION public.trg_sic_recalc()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_super uuid;
BEGIN
  v_super := COALESCE(NEW.super_ingredient_id, OLD.super_ingredient_id);
  PERFORM public.recalc_super_ingredient_cost(v_super);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sic_recalc_aiud ON public.super_ingredient_components;
CREATE TRIGGER trg_sic_recalc_aiud
AFTER INSERT OR UPDATE OR DELETE ON public.super_ingredient_components
FOR EACH ROW EXECUTE FUNCTION public.trg_sic_recalc();

-- 5. Étendre le trigger ingredients : si cost_per_unit change, recalculer aussi les supers qui l'utilisent
CREATE OR REPLACE FUNCTION public.trg_ingredients_recalc_cost()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  s record;
BEGIN
  IF NEW.cost_per_unit IS DISTINCT FROM OLD.cost_per_unit THEN
    -- Recalculer recettes utilisant cet ingrédient
    FOR r IN
      SELECT DISTINCT rec.product_id
      FROM public.recipe_ingredients ri
      JOIN public.recipes rec ON rec.id = ri.recipe_id
      WHERE ri.ingredient_id = NEW.id
    LOOP
      PERFORM public.recalc_product_cost_from_recipe(r.product_id);
    END LOOP;

    -- Recalculer super-ingrédients qui contiennent cet ingrédient
    FOR s IN
      SELECT DISTINCT super_ingredient_id
      FROM public.super_ingredient_components
      WHERE component_ingredient_id = NEW.id
    LOOP
      PERFORM public.recalc_super_ingredient_cost(s.super_ingredient_id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ingredients_recalc_cost ON public.ingredients;
CREATE TRIGGER trg_ingredients_recalc_cost
AFTER UPDATE ON public.ingredients
FOR EACH ROW EXECUTE FUNCTION public.trg_ingredients_recalc_cost();

-- S'assurer que les triggers de recettes existent aussi
DROP TRIGGER IF EXISTS trg_recipe_ingredients_recalc_cost ON public.recipe_ingredients;
CREATE TRIGGER trg_recipe_ingredients_recalc_cost
AFTER INSERT OR UPDATE OR DELETE ON public.recipe_ingredients
FOR EACH ROW EXECUTE FUNCTION public.trg_recipe_ingredients_recalc_cost();

DROP TRIGGER IF EXISTS trg_recipes_recalc_cost ON public.recipes;
CREATE TRIGGER trg_recipes_recalc_cost
AFTER INSERT OR UPDATE OR DELETE ON public.recipes
FOR EACH ROW EXECUTE FUNCTION public.trg_recipes_recalc_cost();