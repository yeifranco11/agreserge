import { createHash, randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { getSessionUserId } from '../../../lib/agreserge-auth';
import { loadDB } from '../../../lib/agreserge-db';
import { requireSupabaseAdmin } from '../../../lib/supabase-admin';

function signature(userId: string, requestId: string, action: string, at: string) {
  return createHash('sha256').update(`${userId}|${requestId}|${action}|${at}|${process.env.APP_SESSION_SECRET}`).digest('hex');
}

export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: 'Sesión requerida' }, { status: 401 });
    const db = await loadDB();
    const actor = db.usuarios.find((user: any) => user.id === userId && user.activo);
    if (!actor) return NextResponse.json({ error: 'Usuario no autorizado' }, { status: 403 });
    const { tipo, datos } = await request.json();
    const allowed = ['Solicitud de permiso', 'Cambio de turno', 'Solicitud de viáticos'];
    if (!allowed.includes(tipo)) return NextResponse.json({ error: 'Tipo de solicitud inválido' }, { status: 400 });
    const id = randomUUID();
    const at = new Date().toISOString();
    const metadata = { ...datos, solicitanteNombre: actor.nombre, solicitanteRol: actor.rol, liderId: actor.liderId || null, historial: [{ estado: 'Solicitado', usuarioId: actor.id, nombre: actor.nombre, fecha: at, firma: signature(actor.id, id, 'Solicitado', at) }] };
    const supabase = requireSupabaseAdmin() as any;
    const { error } = await supabase.from('agreserge_procedures').insert({ id, agremiado_id: actor.id, tipo, periodo: String(datos?.fechaSolicitud || at).slice(0, 7), estado: 'Solicitado', generado: at.slice(0, 10), observacion: JSON.stringify(metadata) });
    if (error) throw error;
    return NextResponse.json({ ok: true, id, db: await loadDB() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'No se pudo radicar la solicitud' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: 'Sesión requerida' }, { status: 401 });
    const db = await loadDB();
    const actor = db.usuarios.find((user: any) => user.id === userId && user.activo);
    if (!actor) return NextResponse.json({ error: 'Usuario no autorizado' }, { status: 403 });
    const { id, action, comentario } = await request.json();
    const item = (db.tramites || []).find((value: any) => value.id === id);
    if (!item) return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 });
    let metadata: any = {};
    try { metadata = JSON.parse(item.observacion || '{}'); } catch { metadata = { detalle: item.observacion }; }
    const isLeader = ['Líder Institucional','Líder de Proceso'].includes(actor.rol) && metadata.liderId === actor.id;
    const isCoordinator = ['Administrador de Sistemas','Coordinadora','Coordinación AGRESERGE','Coordinación General','Coordinación Administrativa','Coordinación Asistencial','Coordinador de Sede','Coordinador General','Coordinador de Proceso AGRESERGE','Coordinadora Administrativa y Financiera','Gerente'].includes(actor.rol);
    if (!isLeader && !isCoordinator) return NextResponse.json({ error: 'No tiene permiso para decidir esta solicitud' }, { status: 403 });
    const states: Record<string, string> = { approve: isLeader ? 'Aprobado por líder' : 'Aprobado administrativo', reject: 'Rechazado', finalize: 'Finalizado' };
    const estado = states[action];
    if (!estado) return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });
    const at = new Date().toISOString();
    metadata.historial = [...(metadata.historial || []), { estado, usuarioId: actor.id, nombre: actor.nombre, rol: actor.rol, comentario: comentario || '', fecha: at, firma: signature(actor.id, id, estado, at) }];
    const supabase = requireSupabaseAdmin() as any;
    const { error } = await supabase.from('agreserge_procedures').update({ estado, observacion: JSON.stringify(metadata), updated_at: at }).eq('id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true, db: await loadDB() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'No se pudo actualizar la solicitud' }, { status: 500 });
  }
}
