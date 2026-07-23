import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { getSessionUserId } from '../../../../lib/agreserge-auth';
import { openDrivePeriod } from '../../../../lib/apps-script-drive';
import { loadDB } from '../../../../lib/agreserge-db';
import { canAdmin } from '../../../../lib/agreserge-permissions';
import { driveTemplate } from '../../../../lib/drive-templates';
import { requireSupabaseAdmin } from '../../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: 'Sesión requerida' }, { status: 401 });

    const db = await loadDB();
    const actor = db.usuarios.find((user: any) => user.id === userId);
    if (!canAdmin(actor)) return NextResponse.json({ error: 'Perfil no autorizado' }, { status: 403 });

    const { mes, anio, fechaLimite, assignments } = await request.json();
    if (!mes || !anio || !Array.isArray(assignments) || assignments.length === 0) {
      return NextResponse.json({ error: 'Mes, año y asignaciones son obligatorios' }, { status: 400 });
    }

    const normalized = assignments.map((item: any) => {
      const template = driveTemplate(Number(item.anexo));
      const responsable = db.usuarios.find((user: any) => user.id === item.responsableId && user.activo);
      if (!template || !responsable) throw new Error(`Asignación inválida para el formato #${item.anexo}`);
      return { anexo: template.anexo, responsableId: responsable.id, responsableNombre: responsable.nombre };
    });

    const drive = await openDrivePeriod({ mes, anio: String(anio), assignments: normalized });
    const rows = drive.items.map((item: any) => ({
      id: randomUUID(), anexo: item.anexo, titulo: `ACTIVIDADES CONTRATADAS #${item.anexo}`,
      tipo: 'Administrativo', responsable_id: item.responsableId, coordinador_id: actor.id,
      mes, anio: String(anio), plantilla_google: driveTemplate(item.anexo)?.url,
      copia_google: item.url, fecha_limite: fechaLimite || null, estado: 'Asignado', es_base: false,
    }));
    const supabase = requireSupabaseAdmin();
    const { error } = await supabase.from('agreserge_assignments').insert(rows);
    if (error) throw error;

    return NextResponse.json({ ok: true, folderUrl: drive.folderUrl, items: drive.items, db: await loadDB() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'No se pudo abrir el periodo' }, { status: 500 });
  }
}
