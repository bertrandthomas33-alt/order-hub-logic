import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.103.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=60',
    },
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'GET') {
    return jsonResponse({ error: 'Méthode non autorisée.' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return jsonResponse({ error: 'Configuration serveur manquante.' }, 500);
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: products, error } = await adminClient
      .from('products')
      .select('id, name, price_b2c, unit, image_url, description, category_id, categories(name)')
      .eq('active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('public-products query error', error);
      return jsonResponse({ error: 'Erreur lors de la récupération des produits.' }, 500);
    }

    const payload = (products ?? []).map((p: any) => ({
      id: p.id,
      name: p.name,
      price_b2c: Number(p.price_b2c) || 0,
      unit: p.unit,
      image_url: p.image_url,
      description: p.description,
      category_id: p.category_id,
      category_name: p.categories?.name ?? null,
    }));

    return jsonResponse({ products: payload, count: payload.length });
  } catch (error) {
    console.error('public-products function failed', error);
    return jsonResponse({ error: 'Erreur serveur.' }, 500);
  }
});
