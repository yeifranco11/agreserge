import { NextResponse } from 'next/server';
import { getSessionUserId } from '../../../lib/agreserge-auth';
import { loadDB } from '../../../lib/agreserge-db';
import { requireSupabaseAdmin } from '../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';
const BUCKET = 'agreserge-files';
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set([
  'application/pdf','image/jpeg','image/png','image/webp','image/gif',
  'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);
const safeName = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-120);

export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: 'Sesión requerida' }, { status: 401 });
    const form = await request.formData();
    const documentId = String(form.get('documentId') || '');
    const file = form.get('file');
    if (!(file instanceof File) || !documentId) return NextResponse.json({ error: 'Seleccione un archivo válido' }, { status: 400 });
    if (!ALLOWED.has(file.type)) return NextResponse.json({ error: 'Formato no permitido. Use PDF, JPG, PNG, WEBP, Word o Excel.' }, { status: 415 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: 'El archivo supera el límite de 10 MB.' }, { status: 413 });

    const supabase = requireSupabaseAdmin();
    const database = supabase as any;
    const { data, error: findError } = await database.from('agreserge_documents').select('*').eq('id', documentId).maybeSingle();
    if (findError) throw findError;
    const document = data as any;
    if (!document || document.agremiado_id !== userId) return NextResponse.json({ error: 'Solo puede cargar documentos en su propio perfil' }, { status: 403 });

    const path = `documentos/${userId}/${documentId}/${Date.now()}-${safeName(file.name)}`;
    let upload = await supabase.storage.from(BUCKET).upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });
    if (upload.error && /bucket.*not found/i.test(upload.error.message)) {
      const created = await supabase.storage.createBucket(BUCKET, { public: false, fileSizeLimit: MAX_BYTES, allowedMimeTypes: [...ALLOWED] });
      if (created.error && !/already exists/i.test(created.error.message)) throw created.error;
      upload = await supabase.storage.from(BUCKET).upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });
    }
    if (upload.error) throw upload.error;

    if (document.archivo_path && !String(document.archivo_path).startsWith('data:')) await supabase.storage.from(BUCKET).remove([document.archivo_path]);
    const today = new Date().toISOString().slice(0, 10);
    const { error: updateError } = await database.from('agreserge_documents').update({
      archivo_path: path, archivo_nombre: file.name, archivo_tipo: file.type,
      archivo_tamano: file.size, fecha_carga: today, estado: 'Cargado',
      observacion: 'Documento cargado, pendiente de revisión.', updated_at: new Date().toISOString(),
    }).eq('id', documentId).eq('agremiado_id', userId);
    if (updateError) throw updateError;
    await database.from('agreserge_audit').insert({ usuario_id: userId, evento: `Documento cargado: ${document.nombre}`, metadata: { documentId, tipo: file.type, tamano: file.size } });
    return NextResponse.json({ ok: true, db: await loadDB() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'No se pudo cargar el archivo' }, { status: 500 });
  }
}
