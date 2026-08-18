import { NextResponse } from "next/server";
import { getSessionUserId } from "../../../lib/agreserge-auth";
import { requireSupabaseAdmin } from "../../../lib/supabase-admin";

export const dynamic = "force-dynamic";

const allowed = new Set([
  "Administrador de Sistemas",
  "Talento Humano",
  "Coordinador General",
  "Coordinación General",
]);

async function actor() {
  const id = await getSessionUserId();
  if (!id) return null;
  const supabase = requireSupabaseAdmin() as any;
  const result = await supabase.from("agreserge_users").select("id,nombre,rol,activo").eq("id", id).maybeSingle();
  return result.data?.activo && allowed.has(result.data.rol) ? result.data : null;
}

function cleanResponses(value: unknown) {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return Object.fromEntries(Object.entries(input).map(([key, item]) => [key, String(item ?? "").trim().slice(0, 4000)]));
}

function buildAnalysis(responses: Record<string, string>) {
  const parts: string[] = [];
  if (responses.educationMotivation) parts.push(`Motivación profesional: ${responses.educationMotivation}`);
  if (responses.workExperience) parts.push(`Trayectoria referida: ${responses.workExperience}`);
  if (responses.withdrawalReasons) parts.push(`Motivos de retiro y permanencia: ${responses.withdrawalReasons}`);
  if (responses.futureExpectations) parts.push(`Expectativas laborales: ${responses.futureExpectations}`);
  if (responses.personalPhrase) parts.push(`Autopercepción: ${responses.personalPhrase}`);
  if (responses.familyGroup || responses.livesWith) parts.push(`Entorno familiar y convivencia: ${[responses.livesWith, responses.familyGroup].filter(Boolean).join(". ")}`);
  return parts.length
    ? `Síntesis automática de apoyo para Talento Humano. ${parts.join(" ")}. La conclusión de selección debe ser emitida y validada por el profesional responsable.`
    : "Pendiente de información suficiente para generar la síntesis de apoyo.";
}

export async function GET() {
  try {
    if (!(await actor())) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    const supabase = requireSupabaseAdmin() as any;
    const [assessmentResult, interviewResult] = await Promise.all([
      supabase.from("agreserge_psychology_assessments").select("id,user_id,documento,nombre_completo,entidad_id,entidad_nombre,area_id,area_nombre,status,completed_at").in("status", ["COMPLETADO", "REVISADO"]).order("completed_at", { ascending: false }),
      supabase.from("agreserge_talent_interviews").select("*").order("updated_at", { ascending: false }),
    ]);
    if (assessmentResult.error) throw assessmentResult.error;
    if (interviewResult.error) throw interviewResult.error;
    const interviews = new Map((interviewResult.data || []).map((row: any) => [row.assessment_id, row]));
    const candidates = (assessmentResult.data || []).map((assessment: any) => ({
      ...assessment,
      interview: interviews.get(assessment.id) || null,
    }));
    return NextResponse.json({ candidates });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "No se pudieron consultar las entrevistas" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const interviewer = await actor();
    if (!interviewer) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    const body = await request.json();
    const assessmentId = String(body.assessmentId || "").trim();
    if (!assessmentId) return NextResponse.json({ error: "Falta seleccionar el agremiado" }, { status: 400 });
    const supabase = requireSupabaseAdmin() as any;
    const assessmentResult = await supabase.from("agreserge_psychology_assessments").select("id,user_id,status").eq("id", assessmentId).maybeSingle();
    if (assessmentResult.error) throw assessmentResult.error;
    if (!assessmentResult.data || !["COMPLETADO", "REVISADO"].includes(assessmentResult.data.status)) {
      return NextResponse.json({ error: "La entrevista solo se habilita después de finalizar la prueba psicológica" }, { status: 409 });
    }
    const responses = cleanResponses(body.responses);
    const finalize = Boolean(body.finalize);
    const payload = {
      assessment_id: assessmentId,
      affiliate_user_id: assessmentResult.data.user_id,
      interviewer_user_id: interviewer.id,
      responses,
      automatic_analysis: buildAnalysis(responses),
      hr_conclusion: String(body.conclusion || "").trim().slice(0, 8000) || null,
      status: finalize ? "FINALIZADA" : "BORRADOR",
      interview_date: String(body.interviewDate || "").trim() || new Date().toISOString().slice(0, 10),
      completed_at: finalize ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };
    if (finalize && !payload.hr_conclusion) return NextResponse.json({ error: "Escribe la conclusión de Talento Humano antes de finalizar" }, { status: 400 });
    const result = await supabase.from("agreserge_talent_interviews").upsert(payload, { onConflict: "assessment_id" }).select("*").single();
    if (result.error) throw result.error;
    return NextResponse.json({ ok: true, interview: result.data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "No se pudo guardar la entrevista" }, { status: 500 });
  }
}
