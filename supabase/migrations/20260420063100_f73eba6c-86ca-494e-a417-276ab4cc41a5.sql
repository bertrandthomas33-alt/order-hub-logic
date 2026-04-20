-- Helper: convert quantity from a "from_unit" to the ingredient's base unit.
-- Supports: g <-> kg, ml <-> litre (and l), unite/piece passthrough.
-- If units are unknown or incompatible, returns the quantity unchanged.
CREATE OR REPLACE FUNCTION public.convert_to_base_unit(_qty numeric, _from_unit text, _base_unit text)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  f text := lower(coalesce(_from_unit, ''));
  b text := lower(coalesce(_base_unit, ''));
BEGIN
  IF _qty IS NULL THEN RETURN 0; END IF;
  -- Normalize aliases
  IF f IN ('l') THEN f := 'litre'; END IF;
  IF b IN ('l') THEN b := 'litre'; END IF;
  IF f IN ('piece','pièce','pcs','u') THEN f := 'unite'; END IF;
  IF b IN ('piece','pièce','pcs','u') THEN b := 'unite'; END IF;

  IF f = b OR f = '' OR b = '' THEN
    RETURN _qty;
  END IF;

  -- Mass
  IF f = 'g'    AND b = 'kg'    THEN RETURN _qty / 1000.0; END IF;
  IF f = 'kg'   AND b = 'g'     THEN RETURN _qty * 1000.0; END IF;
  -- Volume
  IF f = 'ml'   AND b = 'litre' THEN RETURN _qty / 1000.0; END IF;
  IF f = 'litre' AND b = 'ml'   THEN RETURN _qty * 1000.0; END IF;

  -- Incompatible/unknown: return as-is (best effort)
  RETURN _qty;
END;
$$;

-- Update super-ingredient cost calc to convert each component qty to its base unit
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

  SELECT COALESCE(SUM(
    public.convert_to_base_unit(sic.quantity, sic.unit, i.unit)
    * COALESCE(i.cost_per_unit, 0)
  ), 0)
    INTO v_total
  FROM public.super_ingredient_components sic
  JOIN public.ingredients i ON i.id = sic.component_ingredient_id
  WHERE sic.super_ingredient_id = _super_id;

  UPDATE public.ingredients
  SET cost_per_unit = ROUND((v_total / v_yield)::numeric, 4)
  WHERE id = _super_id;
END;
$$;

-- Update recipe cost calc the same way
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

  IF v_recipe_id IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM(
    public.convert_to_base_unit(ri.quantity, ri.unit, i.unit)
    * COALESCE(i.cost_per_unit, 0)
  ), 0)
    INTO v_total
  FROM public.recipe_ingredients ri
  JOIN public.ingredients i ON i.id = ri.ingredient_id
  WHERE ri.recipe_id = v_recipe_id;

  UPDATE public.products
  SET cost_price = ROUND((v_total / v_yield)::numeric, 4)
  WHERE id = _product_id;
END;
$$;

-- Recompute everything once with new conversion logic
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.ingredients WHERE is_super = true LOOP
    PERFORM public.recalc_super_ingredient_cost(r.id);
  END LOOP;
  FOR r IN SELECT product_id FROM public.recipes LOOP
    PERFORM public.recalc_product_cost_from_recipe(r.product_id);
  END LOOP;
END $$;