import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.103.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type CreateClientPayload = {
  name: string;
  contact: string;
  address: string;
  email: string;
  password: string;
  phone?: string;
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function validatePayload(payload: unknown): payload is CreateClientPayload {
  if (!payload || typeof payload !== 'object') return false;

  const data = payload as Record<string, unknown>;
  return [data.name, data.contact, data.address, data.email, data.password].every(
    (value) => typeof value === 'string' && value.trim().length > 0,
  ) && typeof data.email === 'string'
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)
    && typeof data.password === 'string'
    && data.password.length >= 6
    && (data.phone === undefined || typeof data.phone === 'string');
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Méthode non autorisée.' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const authorization = request.headers.get('Authorization');

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return jsonResponse({ error: 'Configuration serveur manquante. Contactez l\'administrateur.' }, 500);
    }

    if (!authorization) {
      return jsonResponse({ error: 'Session invalide. Reconnectez-vous.' }, 401);
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authorization,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return jsonResponse({ error: 'Session invalide. Reconnectez-vous.' }, 401);
    }

    const { data: roleData, error: roleError } = await userClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (roleError || roleData?.role !== 'admin') {
      return jsonResponse({ error: 'Accès refusé.' }, 403);
    }

    const payload = await request.json();

    if (!validatePayload(payload)) {
      return jsonResponse({ error: 'Données invalides.' }, 400);
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: authData, error: createUserError } = await adminClient.auth.admin.createUser({
      email: payload.email,
      password: payload.password,
      email_confirm: true,
    });

    if (createUserError || !authData.user) {
      return jsonResponse({ error: createUserError?.message || 'Erreur lors de la création du compte.' }, 400);
    }

    const userId = authData.user.id;

    const { error: roleInsertError } = await adminClient.from('user_roles').insert({
      user_id: userId,
      role: 'pdv',
    });

    if (roleInsertError) {
      await adminClient.auth.admin.deleteUser(userId);
      return jsonResponse({ error: `Erreur assignation rôle: ${roleInsertError.message}` }, 400);
    }

    const { error: clientInsertError } = await adminClient.from('clients').insert({
      user_id: userId,
      name: payload.name,
      contact: payload.contact,
      address: payload.address,
      email: payload.email,
      phone: payload.phone || null,
      active: true,
    });

    if (clientInsertError) {
      await adminClient.auth.admin.deleteUser(userId);
      return jsonResponse({ error: `Erreur création client: ${clientInsertError.message}` }, 400);
    }

    return jsonResponse({ success: true });
  } catch (error) {
    console.error('create-client function failed', error);
    return jsonResponse({ error: 'Erreur serveur lors de la création du client.' }, 500);
  }
});