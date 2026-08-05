import { NextResponse } from "next/server";
import { getSessionUserId } from "../../../../lib/agreserge-auth";
import { loadDB } from "../../../../lib/agreserge-db";
import { hasCrossHospitalReportAccess } from "../../../../lib/agreserge-report-access";
import { importReportFromUrl } from "../../../../lib/apps-script-drive";
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
    const input = await request.json().catch(() => ({}));
    const id = String(input.id || "");
    const action = String(input.action || "");
    const fileName = String(input.fileName || "").trim();
    const extension = fileName.split(".").pop()?.toLowerCase();
    const inferredTypes: Record<string, string> = {
      pdf: "application/pdf", doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xls: "application/vnd.ms-excel",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
    };
    const providedType = String(input.fileType || "");
    const fileType = providedType && providedType !== "application/octet-stream"
      ? providedType
      : inferredTypes[extension || ""] || "application/octet-stream";
    const fileSize = Number(input.fileSize || 0);
    if (!id || !fileName || !["prepare", "finalize"].includes(action))
      return NextResponse.json({ error: "Solicitud de carga inválida" }, { status: 400 });
    const allowed = new Set([
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "image/jpeg", "image/png",
    ]);
    if (!allowed.has(fileType)) return NextResponse.json({ error: "Use PDF, Word, Excel, JPG o PNG" }, { status: 400 });
    if (fileSize > 50 * 1024 * 1024) return NextResponse.json({ error: "El archivo supera 50 MB" }, { status: 400 });
    const supabase = requireSupabaseAdmin() as any;
    const submission = await supabase.from("agreserge_report_submissions").select("*").eq("id", id).single();
    if (submission.error) throw submission.error;
    const period = await supabase.from("agreserge_report_periods")
      .select("estado")
      .eq("id", submission.data.period_id)
      .single();
    if (period.error) throw period.error;
    if (period.data.estado === "Cerrado")
      return NextResponse.json(
        { error: "Este mes ya fue cerrado. Sus obligaciones quedaron archivadas y no admite nuevas cargas." },
        { status: 423 },
      );
    if (["Aprobado", "Con observación"].includes(submission.data.estado))
      return NextResponse.json(
        { error: "Este soporte ya fue revisado y quedó bloqueado hasta el próximo mes." },
        { status: 423 },
      );
    const parent = submission.data.parent_id
      ? await supabase.from("agreserge_report_submissions").select("*").eq("id", submission.data.parent_id).maybeSingle()
      : { data: null };
    const responsible = db.usuarios.find((user: any) => user.id === submission.data.responsable_id);
    const isLeader = submission.data.delegado_por_id === actor.id ||
      parent.data?.responsable_id === actor.id ||
      parent.data?.delegado_por_id === actor.id ||
      responsible?.liderId === actor.id;
    if (
      submission.data.responsable_id !== actor.id &&
      !isLeader &&
      !supervisors.has(actor.rol) &&
      !hasCrossHospitalReportAccess(actor)
    )
      return NextResponse.json({ error: "Este anexo está asignado a otra persona" }, { status: 403 });
    if (action === "prepare") {
      const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `reports/${submission.data.period_id}/${id}/${Date.now()}-${safeName}`;
      const signed = await supabase.storage.from("agreserge-files").createSignedUploadUrl(path);
      if (signed.error) throw signed.error;
      return NextResponse.json({ ok: true, path, token: signed.data.token, signedUrl: signed.data.signedUrl });
    }
    const path = String(input.path || "");
    if (!path.startsWith(`reports/${submission.data.period_id}/${id}/`))
      return NextResponse.json({ error: "Ruta de archivo inválida" }, { status: 400 });
    const signedDownload = await supabase.storage.from("agreserge-files").createSignedUrl(path, 15 * 60);
    if (signedDownload.error) throw signedDownload.error;
    const drive = await importReportFromUrl({
      folderId: submission.data.drive_folder_id,
      fileUrl: signedDownload.data.signedUrl,
      fileName,
      mimeType: fileType,
    });
    const update = await supabase.from("agreserge_report_submissions").update({
      estado: "Cargado", archivo_path: path, archivo_nombre: fileName, archivo_tipo: fileType,
      drive_file_id: drive.id, drive_file_url: drive.url, submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    if (update.error) throw update.error;
    const fileRow = await supabase.from("agreserge_audit").insert({
      usuario_id: actor.id,
      evento: "Archivo múltiple de informe",
      metadata: {
        submission_id: id,
        storage_path: path,
        nombre: fileName,
        mime_type: fileType,
        drive_file_id: drive.id,
        drive_file_url: drive.url,
      },
    }).select("*").single();
    if (fileRow.error) throw fileRow.error;
    return NextResponse.json({ ok: true, url: drive.url, file: fileRow.data.metadata });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "No se pudo cargar el informe" }, { status: 500 });
  }
}
