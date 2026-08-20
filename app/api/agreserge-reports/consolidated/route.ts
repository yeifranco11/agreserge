import { NextResponse } from "next/server";
import { getSessionUserId } from "../../../../lib/agreserge-auth";
import { loadDB } from "../../../../lib/agreserge-db";
import { canAdmin } from "../../../../lib/agreserge-permissions";
import { hasCrossHospitalReportAccess } from "../../../../lib/agreserge-report-access";
import { requireSupabaseAdmin } from "../../../../lib/supabase-admin";

export const dynamic = "force-dynamic";

const REPORT_MANAGERS = new Set([
  "Coordinación AGRESERGE",
  "Coordinación General",
  "Coordinador General",
  "Director Ejecutivo",
  "Coordinadora Administrativa y Financiera",
  "Coordinación Administrativa",
  "Coordinación Asistencial",
]);

export async function GET(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Sesión requerida" }, { status: 401 });

    const db = await loadDB();
    const actor = db.usuarios.find((user: any) => user.id === userId && user.activo);
    if (!actor) return NextResponse.json({ error: "Usuario inactivo" }, { status: 403 });

    const periodId = new URL(request.url).searchParams.get("periodId");
    if (!periodId) return NextResponse.json({ error: "Periodo requerido" }, { status: 400 });

    const supabase = requireSupabaseAdmin() as any;
    const period = await supabase.from("agreserge_report_periods")
      .select("id,estado,consolidated_doc_id")
      .eq("id", periodId)
      .single();
    if (period.error || !period.data) {
      return NextResponse.json({ error: "No se encontró el periodo" }, { status: 404 });
    }

    const canManage = canAdmin(actor) || hasCrossHospitalReportAccess(actor) || REPORT_MANAGERS.has(actor.rol);
    if (!canManage) {
      const assignment = await supabase.from("agreserge_report_submissions")
        .select("id")
        .eq("period_id", periodId)
        .or(`responsable_id.eq.${actor.id},delegado_por_id.eq.${actor.id}`)
        .limit(1);
      if (assignment.error || !assignment.data?.length) {
        return NextResponse.json({ error: "No tiene acceso a este consolidado" }, { status: 403 });
      }
    }

    const storagePath = String(period.data.consolidated_doc_id || "");
    if (!storagePath.startsWith("reports/")) {
      return NextResponse.json({ error: "El consolidado todavía no está disponible" }, { status: 404 });
    }

    const signed = await supabase.storage.from("agreserge-files").createSignedUrl(storagePath, 10 * 60);
    if (signed.error || !signed.data?.signedUrl) throw signed.error || new Error("No se pudo preparar la descarga");
    return NextResponse.redirect(signed.data.signedUrl);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "No se pudo descargar el consolidado" }, { status: 500 });
  }
}
