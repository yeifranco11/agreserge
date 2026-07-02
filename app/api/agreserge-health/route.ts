import { NextResponse } from 'next/server';
import { getSupabaseEnvStatus, requireSupabaseAdmin } from '../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';

const tables = [
  'agreserge_users',
  'agreserge_entities',
  'agreserge_areas',
  'agreserge_documents',
  'agreserge_permissions',
  'agreserge_assignments',
  'agreserge_procedures',
  'agreserge_audit',
];

export async function GET() {
  try {
    const env = getSupabaseEnvStatus();
    if (!env.ok) {
      return NextResponse.json({
        ok: false,
        status: 'missing-env',
        missing: env.missing,
        message: `Falta configurar en Vercel: ${env.missing.join(', ')}`,
      }, { status: 500 });
    }

    const supabase = requireSupabaseAdmin();
    const checks = await Promise.all(
      tables.map(async (table) => {
        const { error } = await supabase.from(table).select('id').limit(1);
        return { table, ok: !error, error: error?.message ?? null };
      }),
    );

    return NextResponse.json({
      ok: checks.every((item) => item.ok),
      status: checks.every((item) => item.ok) ? 'ready' : 'missing-tables',
      checks,
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, status: 'error', error: error.message }, { status: 500 });
  }
}
