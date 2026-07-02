import { NextResponse } from 'next/server';
import { requireSupabaseAdmin } from '../../../lib/supabase-admin';

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
    const supabase = requireSupabaseAdmin();
    const checks = await Promise.all(
      tables.map(async (table) => {
        const { error } = await supabase.from(table).select('id').limit(1);
        return { table, ok: !error, error: error?.message ?? null };
      }),
    );

    return NextResponse.json({
      ok: checks.every((item) => item.ok),
      checks,
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
