CREATE OR REPLACE FUNCTION public.convert_to_base_unit(_qty numeric, _from_unit text, _base_unit text)
 RETURNS numeric
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  f text := lower(coalesce(_from_unit, ''));
  b text := lower(coalesce(_base_unit, ''));
BEGIN
  IF _qty IS NULL THEN RETURN 0; END IF;
  -- Normalize aliases
  IF f IN ('l','liter','liters','litres') THEN f := 'litre'; END IF;
  IF b IN ('l','liter','liters','litres') THEN b := 'litre'; END IF;
  IF f IN ('piece','pièce','pcs','u') THEN f := 'unite'; END IF;
  IF b IN ('piece','pièce','pcs','u') THEN b := 'unite'; END IF;

  IF f = b OR f = '' OR b = '' THEN
    RETURN _qty;
  END IF;

  -- Mass
  IF f = 'g'    AND b = 'kg'    THEN RETURN _qty / 1000.0; END IF;
  IF f = 'kg'   AND b = 'g'     THEN RETURN _qty * 1000.0; END IF;
  -- Volume
  IF f = 'ml'    AND b = 'litre' THEN RETURN _qty / 1000.0; END IF;
  IF f = 'litre' AND b = 'ml'    THEN RETURN _qty * 1000.0; END IF;

  RETURN _qty;
END;
$function$;

-- Recalcul de tous les super ingrédients existants pour corriger les coûts erronés
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.ingredients WHERE is_super = true LOOP
    PERFORM public.recalc_super_ingredient_cost(r.id);
  END LOOP;
  -- puis recalcul des produits qui utilisent ces ingrédients
  FOR r IN SELECT DISTINCT product_id FROM public.recipes LOOP
    PERFORM public.recalc_product_cost_from_recipe(r.product_id);
  END LOOP;
END $$;