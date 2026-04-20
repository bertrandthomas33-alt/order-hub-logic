
-- Enum for purchase order status
CREATE TYPE public.purchase_order_status AS ENUM ('pending', 'completed');

-- Header table
CREATE TABLE public.purchase_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_label TEXT NOT NULL,
  supplier_id UUID NULL,
  status public.purchase_order_status NOT NULL DEFAULT 'pending',
  total NUMERIC NOT NULL DEFAULT 0,
  notes TEXT NULL,
  validated_at TIMESTAMP WITH TIME ZONE NULL,
  validated_by UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Items table
CREATE TABLE public.purchase_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id),
  ingredient_name TEXT NOT NULL,
  uvc_label TEXT NULL,
  uvc_quantity NUMERIC NOT NULL DEFAULT 1,  -- contenu d'1 UVC en unité de base
  quantity_uvc NUMERIC NOT NULL DEFAULT 1,  -- nombre d'UVC commandés
  unit TEXT NOT NULL DEFAULT 'kg',          -- unité de base de l'ingrédient
  cost_per_unit NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_po_items_order ON public.purchase_order_items(purchase_order_id);
CREATE INDEX idx_po_items_ingredient ON public.purchase_order_items(ingredient_id);
CREATE INDEX idx_po_status ON public.purchase_orders(status);

-- Enable RLS
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Policies: admins only
CREATE POLICY "Admins full access on purchase_orders"
  ON public.purchase_orders FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins full access on purchase_order_items"
  ON public.purchase_order_items FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- updated_at trigger
CREATE TRIGGER update_purchase_orders_updated_at
  BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Validation function: increments ingredient stocks and marks order as completed
CREATE OR REPLACE FUNCTION public.validate_purchase_order(_order_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_status public.purchase_order_status;
  r record;
BEGIN
  SELECT status INTO v_status FROM public.purchase_orders WHERE id = _order_id;
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Commande introuvable';
  END IF;
  IF v_status = 'completed' THEN
    RAISE EXCEPTION 'Commande déjà validée';
  END IF;

  -- Increment stocks (quantity_uvc * uvc_quantity en unité de base)
  FOR r IN
    SELECT ingredient_id, SUM(quantity_uvc * uvc_quantity) AS qty
    FROM public.purchase_order_items
    WHERE purchase_order_id = _order_id
    GROUP BY ingredient_id
  LOOP
    UPDATE public.ingredients
    SET stock_quantity = COALESCE(stock_quantity, 0) + r.qty
    WHERE id = r.ingredient_id;
  END LOOP;

  -- Mark order as completed
  UPDATE public.purchase_orders
  SET status = 'completed',
      validated_at = now(),
      validated_by = auth.uid()
  WHERE id = _order_id;
END;
$$;
