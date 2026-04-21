
-- Fonction utilitaire : active récursivement un ingrédient et, s'il est super, ses composants
CREATE OR REPLACE FUNCTION public.activate_ingredient_recursive(_ingredient_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  WITH RECURSIVE chain AS (
    SELECT _ingredient_id AS id
    UNION
    SELECT sic.component_ingredient_id
    FROM chain c
    JOIN public.super_ingredient_components sic ON sic.super_ingredient_id = c.id
  )
  UPDATE public.ingredients i
  SET active = true
  FROM chain c
  WHERE i.id = c.id AND i.active = false;
END;
$$;

-- Trigger : produit devient actif -> activer tous les ingrédients de sa recette
CREATE OR REPLACE FUNCTION public.trg_products_activate_ingredients()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  IF NEW.active = true AND (TG_OP = 'INSERT' OR OLD.active = false) THEN
    FOR r IN
      SELECT ri.ingredient_id
      FROM public.recipes rec
      JOIN public.recipe_ingredients ri ON ri.recipe_id = rec.id
      WHERE rec.product_id = NEW.id
    LOOP
      PERFORM public.activate_ingredient_recursive(r.ingredient_id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_activate_ingredients ON public.products;
CREATE TRIGGER products_activate_ingredients
AFTER INSERT OR UPDATE OF active ON public.products
FOR EACH ROW EXECUTE FUNCTION public.trg_products_activate_ingredients();

-- Trigger : ingrédient ajouté à une recette d'un produit actif -> l'activer
CREATE OR REPLACE FUNCTION public.trg_recipe_ing_activate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active boolean;
BEGIN
  SELECT p.active INTO v_active
  FROM public.recipes r
  JOIN public.products p ON p.id = r.product_id
  WHERE r.id = NEW.recipe_id;

  IF COALESCE(v_active, false) THEN
    PERFORM public.activate_ingredient_recursive(NEW.ingredient_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS recipe_ingredients_activate ON public.recipe_ingredients;
CREATE TRIGGER recipe_ingredients_activate
AFTER INSERT OR UPDATE OF ingredient_id ON public.recipe_ingredients
FOR EACH ROW EXECUTE FUNCTION public.trg_recipe_ing_activate();

-- Trigger : composant ajouté à un super-ingrédient déjà actif -> l'activer
CREATE OR REPLACE FUNCTION public.trg_super_comp_activate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active boolean;
BEGIN
  SELECT active INTO v_active FROM public.ingredients WHERE id = NEW.super_ingredient_id;
  IF COALESCE(v_active, false) THEN
    PERFORM public.activate_ingredient_recursive(NEW.component_ingredient_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS super_components_activate ON public.super_ingredient_components;
CREATE TRIGGER super_components_activate
AFTER INSERT OR UPDATE OF component_ingredient_id ON public.super_ingredient_components
FOR EACH ROW EXECUTE FUNCTION public.trg_super_comp_activate();
