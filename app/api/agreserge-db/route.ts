import { NextResponse } from 'next/server';
import { getSessionUserId } from '../../../lib/agreserge-auth';
import { loadDB, saveFullDB } from '../../../lib/agreserge-db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Sesión requerida' }, { status: 401 });

  try {
    return NextResponse.json({ db: await loadDB() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? 'No se pudo cargar Supabase' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Sesión requerida' }, { status: 401 });

  try {
    const { db } = await request.json();
    const current = await loadDB();
    const actor = current.usuarios.find((user: any) => user.id === userId);

    await saveFullDB(db, { actor });
    return NextResponse.json({ ok: true, db: await loadDB() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? 'No se pudo guardar en Supabase' }, { status: 500 });
  }
}
