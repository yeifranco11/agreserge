import { createClient } from '@supabase/supabase-js';

let cachedClient: ReturnType<typeof createClient> | null = null;
let cachedSignature = '';

export function getSupabaseEnvStatus() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const missing = [
    !supabaseUrl ? 'NEXT_PUBLIC_SUPABASE_URL' : null,
    !serviceRoleKey ? 'SUPABASE_SERVICE_ROLE_KEY' : null,
  ].filter(Boolean) as string[];

  return {
    ok: missing.length === 0,
    missing,
    hasUrl: Boolean(supabaseUrl),
    hasServiceRoleKey: Boolean(serviceRoleKey),
    supabaseUrl,
    serviceRoleKey,
  };
}

export function requireSupabaseAdmin() {
  const status = getSupabaseEnvStatus();

  if (!status.ok || !status.supabaseUrl || !status.serviceRoleKey) {
    throw new Error(`Falta configurar en Vercel: ${status.missing.join(', ')}`);
  }

  const signature = `${status.supabaseUrl}:${status.serviceRoleKey.slice(0, 12)}`;
  if (!cachedClient || cachedSignature !== signature) {
    cachedSignature = signature;
    cachedClient = createClient(status.supabaseUrl, status.serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return cachedClient;
}
