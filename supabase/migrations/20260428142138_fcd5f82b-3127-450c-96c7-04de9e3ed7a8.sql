-- Drop old tables
DROP TABLE IF EXISTS public.pos_hidden_categories CASCADE;
DROP TABLE IF EXISTS public.pos_hidden_products CASCADE;

-- New configurations table
CREATE TABLE public.pos_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pos_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage pos_configurations"
ON public.pos_configurations FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view pos_configurations"
ON public.pos_configurations FOR SELECT TO authenticated
USING (true);

CREATE TRIGGER update_pos_configurations_updated_at
BEFORE UPDATE ON public.pos_configurations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Hidden categories per configuration
CREATE TABLE public.pos_configuration_hidden_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  configuration_id UUID NOT NULL REFERENCES public.pos_configurations(id) ON DELETE CASCADE,
  category_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (configuration_id, category_name)
);

ALTER TABLE public.pos_configuration_hidden_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage pos_cfg_hidden_cats"
ON public.pos_configuration_hidden_categories FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view pos_cfg_hidden_cats"
ON public.pos_configuration_hidden_categories FOR SELECT TO authenticated
USING (true);

-- Hidden products per configuration
CREATE TABLE public.pos_configuration_hidden_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  configuration_id UUID NOT NULL REFERENCES public.pos_configurations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (configuration_id, product_id)
);

ALTER TABLE public.pos_configuration_hidden_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage pos_cfg_hidden_prods"
ON public.pos_configuration_hidden_products FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view pos_cfg_hidden_prods"
ON public.pos_configuration_hidden_products FOR SELECT TO authenticated
USING (true);

-- Link clients to a configuration
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS pos_configuration_id UUID REFERENCES public.pos_configurations(id) ON DELETE SET NULL;