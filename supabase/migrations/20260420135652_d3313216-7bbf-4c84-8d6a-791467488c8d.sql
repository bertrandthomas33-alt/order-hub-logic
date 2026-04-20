-- Fonction qui décrémente les stocks d'ingrédients pour une liste de commandes
-- en fonction des recettes des produits commandés
CREATE OR REPLACE FUNCTION public.decrement_stock_from_orders(_order_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r record;
BEGIN
  -- Vérifier que l'utilisateur est admin
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès non autorisé';
  END IF;

  -- Pour chaque ingrédient nécessaire, calculer la quantité totale à décrémenter
  -- quantité_totale = SUM(quantité_commandée * (qté_ingrédient_recette / yield_recette))
  -- Conversion vers l'unité de base de l'ingrédient
  FOR r IN
    SELECT 
      ri.ingredient_id,
      SUM(
        public.convert_to_base_unit(
          (oi.quantity * ri.quantity / NULLIF(rec.yield_quantity, 0)),
          ri.unit,
          ing.unit
        )
      ) AS qty_to_decrement
    FROM public.order_items oi
    JOIN public.recipes rec ON rec.product_id = oi.product_id
    JOIN public.recipe_ingredients ri ON ri.recipe_id = rec.id
    JOIN public.ingredients ing ON ing.id = ri.ingredient_id
    WHERE oi.order_id = ANY(_order_ids)
    GROUP BY ri.ingredient_id
  LOOP
    UPDATE public.ingredients
    SET stock_quantity = COALESCE(stock_quantity, 0) - COALESCE(r.qty_to_decrement, 0)
    WHERE id = r.ingredient_id;
  END LOOP;
END;
$$;