import { NextResponse } from "next/server";
import { getSessionUserId } from "../../../../lib/agreserge-auth";
import { loadDB } from "../../../../lib/agreserge-db";
import { importReportFile } from "../../../../lib/apps-script-drive";
import { requireSupabaseAdmin } from "../../../../lib/supabase-admin";

export const dynamic = "force-dynamic";

const supervisors = new Set([
  "Administrador de Sistemas", "Coordinación AGRESERGE", "Coordinación General",
  "Coordinador General", "Director Ejecutivo",
]);

export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Sesión requerida" }, { status: 401 });
    const db = await loadDB();
    const actor = db.usuarios.find((user: any) => user.id === userId && user.activo);
    if (!actor) return NextResponse.json({ error: "Usuario inactivo" }, { status: 403 });
    const form = await request.formData();
    const id = String(form.get("id") || "");
    const file = form.get("file");
    if (!id || !(file instanceof File)) return NextResponse.json({ error: "Seleccione un archivo" }, { status: 400 });
    const allowed = new Set([
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "image/jpeg", "image/png",
    ]);
    if (!allowed.has(file.type)) return NextResponse.json({ error: "Use PDF, Word, Excel, JPG o PNG" }, { status: 400 });
    if (file.size > 25 * 1024 * 1024) return NextResponse.json({ error: "El archivo supera 25 MB" }, { status: 400 });
    const supabase = requireSupabaseAdmin() as any;
    const submission = await supabase.from("agreserge_report_submissions").select("*").eq("id", id).single();
    if (submission.error) throw submission.error;
    if (submission.data.responsable_id !== actor.id && !supervisors.has(actor.rol))
      return NextResponse.json({ error: "Este anexo está asignado a otra persona" }, { status: 403 });
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `reports/${submission.data.period_id}/${id}/${Date.now()}-${safeName}`;
    const upload = await supabase.storage.from("agreserge-files").upload(path, file, { contentType: file.type, upsert: true });
    if (upload.error) throw upload.error;
    const signed = await supabase.storage.from("agreserge-files").createSignedUrl(path, 600);
    if (signed.error) throw signed.error;
    const drive = await importReportFile({
      folderId: submission.data.drive_folder_id,
      fileUrl: signed.data.signedUrl,
      fileName: file.name,
      mimeType: file.type,
    });
    const update = await supabase.from("agreserge_report_submissions").update({
      estado: "Cargado", archivo_path: path, archivo_nombre: file.name, archivo_tipo: file.type,
      drive_file_id: drive.id, drive_file_url: drive.url, submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    if (update.error) throw update.error;
    return NextResponse.json({ ok: true, url: drive.url });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "No se pudo cargar el informe" }, { status: 500 });
  }
}
