import { NextResponse } from 'next/server';
import { getSessionUserId } from '../../../../lib/agreserge-auth';
import { loadDB } from '../../../../lib/agreserge-db';
import { requireSupabaseAdmin } from '../../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';
const BUCKET = 'agreserge-files';
const reviewerRoles = new Set(['Administrador de Sistemas','Coordinadora','Coordinación AGRESERGE','Coordinación General','Coordinación Administrativa','Coordinación Asistencial','Coordinador General','Talento Humano','Experiencia al Agremiado']);

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: 'Sesión requerida' }, { status: 401 });
    const { id } = await params;
    const db = await loadDB();
    const actor = db.usuarios.find((u: any) => u.id === userId && u.activo);
    const supabase = requireSupabaseAdmin();
    const { data, error } = await supabase.from('agreserge_documents').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    const document = data as any;
    if (!document) return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 });
    const ownerId = document.agremiado_id;
    const canReview = actor && (reviewerRoles.has(actor.rol) || (['Líder Institucional','Líder de Proceso'].includes(actor.rol) && ownerId && db.usuarios.some((u: any) => u.id === ownerId && u.liderId === actor.id)));
    if (document.agremiado_id !== userId && !canReview) return NextResponse.json({ error: 'Documento no autorizado' }, { status: 403 });
    if (!document.archivo_path) return NextResponse.json({ error: 'El documento no tiene archivo' }, { status: 404 });
    if (String(document.archivo_path).startsWith('data:')) {
      const match = String(document.archivo_path).match(/^data:([^;,]+)?(;base64)?,([\s\S]*)$/);
      if (!match) throw new Error('Archivo histórico inválido');
      const bytes = match[2] ? Buffer.from(match[3], 'base64') : Buffer.from(decodeURIComponent(match[3]));
      return new NextResponse(bytes, { headers: { 'Content-Type': match[1] || document.archivo_tipo || 'application/octet-stream', 'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(document.archivo_nombre || document.nombre)}`, 'Cache-Control': 'private, no-store' } });
    }
    const { data: fileData, error: downloadError } = await supabase.storage.from(BUCKET).download(document.archivo_path);
    if (downloadError) throw downloadError;
    return new NextResponse(await fileData.arrayBuffer(), { headers: {
      'Content-Type': document.archivo_tipo || 'application/octet-stream',
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(document.archivo_nombre || document.nombre)}`,
      'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
    }});
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'No se pudo abrir el documento' }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: 'Sesión requerida' }, { status: 401 });
    const { id } = await params;
    const supabase = requireSupabaseAdmin(); const database = supabase as any;
    const { data, error } = await database.from('agreserge_documents').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    const document = data as any;
    if (!document || document.agremiado_id !== userId) return NextResponse.json({ error: 'Solo puede eliminar documentos de su propio perfil' }, { status: 403 });
    if (document.archivo_path && !String(document.archivo_path).startsWith('data:')) await supabase.storage.from(BUCKET).remove([document.archivo_path]);
    const isAdditional = String(document.nombre || '').includes(' — ');
    const query = database.from('agreserge_documents');
    const { error: mutationError } = isAdditional
      ? await query.delete().eq('id', id).eq('agremiado_id', userId)
      : await query.update({ archivo_path:null, archivo_nombre:null, archivo_tipo:null, archivo_tamano:null, fecha_carga:null, estado:'Pendiente', observacion:'Pendiente por cargar', updated_at:new Date().toISOString() }).eq('id', id).eq('agremiado_id', userId);
    if (mutationError) throw mutationError;
    await database.from('agreserge_audit').insert({ usuario_id:userId, evento:`Documento eliminado: ${document.nombre}`, metadata:{documentId:id} });
    return NextResponse.json({ ok:true, db:await loadDB() });
  } catch (error:any) {
    return NextResponse.json({ error:error.message || 'No se pudo eliminar el documento' }, { status:500 });
  }
}
