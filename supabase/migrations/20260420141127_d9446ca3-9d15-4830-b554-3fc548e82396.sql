-- Mise à jour: décrémenter aussi les composants des super-ingrédients
CREATE OR REPLACE FUNCTION public.decrement_stock_from_orders(_order_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r record;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès non autorisé';
  END IF;

  -- CTE récursive: éclate les super-ingrédients en ingrédients simples
  -- en propageant la quantité (convertie en unité de base) à chaque niveau.
  FOR r IN
    WITH RECURSIVE recipe_needs AS (
      -- Niveau 0 : besoins directs depuis les recettes des produits commandés
      -- Quantité par recette = qty_recette / yield_recette ; multipliée par qty commandée
      SELECT
        ri.ingredient_id,
        ri.unit AS from_unit,
        (oi.quantity * ri.quantity / NULLIF(rec.yield_quantity, 0)) AS qty
      FROM public.order_items oi
      JOIN public.recipes rec ON rec.product_id = oi.product_id
      JOIN public.recipe_ingredients ri ON ri.recipe_id = rec.id
      WHERE oi.order_id = ANY(_order_ids)
    ),
    exploded AS (
      -- Convertit en unité de base de l'ingrédient courant
      SELECT
        rn.ingredient_id,
        public.convert_to_base_unit(rn.qty, rn.from_unit, ing.unit) AS qty_base,
        ing.is_super
      FROM recipe_needs rn
      JOIN public.ingredients ing ON ing.id = rn.ingredient_id

      UNION ALL

      -- Si super-ingrédient: on descend dans ses composants
      -- qty_composant_total = qty_base_super * (qty_composant / yield_super)
      SELECT
        sic.component_ingredient_id AS ingredient_id,
        public.convert_to_base_unit(
          e.qty_base * sic.quantity / NULLIF(super_ing.yield_quantity, 0),
          sic.unit,
          comp_ing.unit
        ) AS qty_base,
        comp_ing.is_super
      FROM exploded e
      JOIN public.ingredients super_ing ON super_ing.id = e.ingredient_id AND super_ing.is_super = true
      JOIN public.super_ingredient_components sic ON sic.super_ingredient_id = e.ingredient_id
      JOIN public.ingredients comp_ing ON comp_ing.id = sic.component_ingredient_id
    )
    SELECT ingredient_id, SUM(qty_base) AS qty_to_decrement
    FROM exploded
    -- On décrémente TOUS les niveaux (super et simples) car on consomme
    -- aussi le stock de préparations intermédiaires si elles existent.
    GROUP BY ingredient_id
  LOOP
    UPDATE public.ingredients
    SET stock_quantity = COALESCE(stock_quantity, 0) - COALESCE(r.qty_to_decrement, 0)
    WHERE id = r.ingredient_id;
  END LOOP;
END;
$$;