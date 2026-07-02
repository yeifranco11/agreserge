import { NextResponse } from 'next/server';
import { hashPassword, setSessionCookie } from '../../../../lib/agreserge-auth';
import { ensureSeeded, loadDB } from '../../../../lib/agreserge-db';
import { requireSupabaseAdmin } from '../../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { correo, clave } = await request.json();
    await ensureSeeded();

    const supabase = requireSupabaseAdmin();
    const { data: user, error } = await supabase
      .from('agreserge_users')
      .select('*')
      .eq('correo', correo)
      .eq('activo', true)
      .maybeSingle();

    if (error) throw error;
    const foundUser = user as any;
    if (!foundUser || foundUser.clave_hash !== hashPassword(clave)) {
      return NextResponse.json({ error: 'Usuario, clave o perfil inactivo' }, { status: 401 });
    }

    await setSessionCookie(foundUser.id);
    return NextResponse.json({ userId: foundUser.id, db: await loadDB() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? 'No se pudo iniciar sesión' }, { status: 500 });
  }
}
