import { NextResponse } from 'next/server';
import { setSessionCookie, verifyPassword } from '../../../../lib/agreserge-auth';
import { ensureSeeded, loadDB } from '../../../../lib/agreserge-db';
import { requireSupabaseAdmin } from '../../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { usuario, correo, clave } = await request.json();
    const login = String(usuario || correo || '').trim().toLowerCase();
    await ensureSeeded();

    const supabase = requireSupabaseAdmin();
    const { data: user, error } = await supabase
      .from('agreserge_users')
      .select('*')
      .ilike('correo', login)
      .eq('activo', true)
      .maybeSingle();

    if (error) throw error;
    const foundUser = user as any;
    if (!foundUser || !verifyPassword(String(clave || ''), foundUser.clave_hash)) {
      return NextResponse.json({ error: 'Usuario, clave o perfil inactivo' }, { status: 401 });
    }

    await setSessionCookie(foundUser.id);
    return NextResponse.json({ userId: foundUser.id, db: await loadDB() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? 'No se pudo iniciar sesión' }, { status: 500 });
  }
}
