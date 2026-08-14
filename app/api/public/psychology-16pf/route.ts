import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { psychologyQuestions, responseSummary } from "../../../../lib/psychology-16pf";
import { scorePsychologyAssessment } from "../../../../lib/psychology-scoring";
import { requireSupabaseAdmin } from "../../../../lib/supabase-admin";

export const dynamic = "force-dynamic";
const COOKIE = "agreserge_psychology_test";
const VERSION = "Cuestionario descriptivo 163 reactivos v1";
const digits = (value: unknown) => String(value ?? "").replace(/\D/g, "");

function secret() {
  const value = process.env.APP_SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("Falta APP_SESSION_SECRET");
  return value;
}
function sign(payload: string) { return createHmac("sha256", secret()).update(payload).digest("base64url"); }
function token(userId: string) {
  const payload = Buffer.from(JSON.stringify({ userId, exp: Date.now() + 4 * 60 * 60 * 1000 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}
async function sessionUser() {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [payload, signature] = raw.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  if (expected.length !== signature.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return null;
  const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  return parsed?.exp > Date.now() ? String(parsed.userId) : null;
}

async function identity(supabase: any, documento: string) {
  const profile = await supabase.from("agreserge_profiles").select("user_id,documento").eq("documento", documento).maybeSingle();
  if (profile.error) throw profile.error;
  if (!profile.data) return null;
  const user = await supabase.from("agreserge_users").select("id,nombre,entidad_id,area_id,cargo,activo").eq("id", profile.data.user_id).maybeSingle();
  if (user.error) throw user.error;
  if (!user.data?.activo) return null;
  const [entity, area] = await Promise.all([
    user.data.entidad_id ? supabase.from("agreserge_entities").select("nombre").eq("id", user.data.entidad_id).maybeSingle() : Promise.resolve({ data: null }),
    user.data.area_id ? supabase.from("agreserge_areas").select("nombre").eq("id", user.data.area_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  return { ...user.data, documento, entidad_nombre: entity.data?.nombre || "Sin entidad", area_nombre: area.data?.nombre || user.data.cargo || "Sin área" };
}

async function assessmentFor(supabase: any, userId: string) {
  const result = await supabase.from("agreserge_psychology_assessments").select("*").eq("user_id", userId).eq("instrument_version", VERSION).maybeSingle();
  if (result.error) throw result.error;
  return result.data;
}

export async function GET() {
  try {
    const userId = await sessionUser();
    if (!userId) return NextResponse.json({ error: "Acceso requerido" }, { status: 401 });
    const supabase = requireSupabaseAdmin() as any;
    const assessment = await assessmentFor(supabase, userId);
    if (!assessment) return NextResponse.json({ error: "Aplicación no encontrada" }, { status: 404 });
    return NextResponse.json({ questions: psychologyQuestions, assessment: { ...assessment, analysis: scorePsychologyAssessment(assessment.responses) }, person: { nombre: assessment.nombre_completo, entidad: assessment.entidad_nombre, area: assessment.area_nombre } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "No se pudo abrir el cuestionario" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = requireSupabaseAdmin() as any;
    if (body.action === "login") {
      const documento = digits(body.documento);
      const configured = process.env.PSYCHOLOGY_TEST_ACCESS_KEY || "agre1234";
      const supplied = String(body.clave || "");
      const valid = supplied.length === configured.length && timingSafeEqual(Buffer.from(supplied), Buffer.from(configured));
      if (!valid) return NextResponse.json({ error: "Clave de acceso incorrecta" }, { status: 401 });
      const person = await identity(supabase, documento);
      if (!person) return NextResponse.json({ error: "La cédula no corresponde a un afiliado activo" }, { status: 404 });
      const existing = await assessmentFor(supabase, person.id);
      if (existing?.status === "COMPLETADO" || existing?.status === "REVISADO") {
        return NextResponse.json({ error: "Este cuestionario ya fue completado" }, { status: 409 });
      }
      if (!existing) {
        const inserted = await supabase.from("agreserge_psychology_assessments").insert({
          user_id: person.id, documento, nombre_completo: person.nombre, entidad_id: person.entidad_id,
          entidad_nombre: person.entidad_nombre, area_id: person.area_id, area_nombre: person.area_nombre,
          instrument_version: VERSION, consent_at: new Date().toISOString(),
        });
        if (inserted.error) throw inserted.error;
      }
      (await cookies()).set(COOKIE, token(person.id), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 14400 });
      return NextResponse.json({ ok: true, person: { nombre: person.nombre, entidad: person.entidad_nombre, area: person.area_nombre } });
    }

    const userId = await sessionUser();
    if (!userId) return NextResponse.json({ error: "La sesión del cuestionario venció" }, { status: 401 });
    const responses = Array.isArray(body.responses) ? body.responses.map(Number) : [];
    if (responses.some((value: number) => !Number.isInteger(value) || value < 1 || value > 5) || responses.length > psychologyQuestions.length) {
      return NextResponse.json({ error: "Las respuestas no son válidas" }, { status: 400 });
    }
    if (body.action === "complete" && responses.length !== psychologyQuestions.length) {
      return NextResponse.json({ error: `Faltan ${psychologyQuestions.length - responses.length} respuestas` }, { status: 400 });
    }
    const now = new Date().toISOString();
    const analysis = scorePsychologyAssessment(responses);
    const result = await supabase.from("agreserge_psychology_assessments").update({
      responses, response_summary: responseSummary(responses),
      status: body.action === "complete" ? "COMPLETADO" : "EN_PROGRESO",
      completed_at: body.action === "complete" ? now : null, updated_at: now,
    }).eq("user_id", userId).eq("instrument_version", VERSION);
    if (result.error) throw result.error;
    return NextResponse.json({ ok: true, summary: responseSummary(responses), analysis });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "No fue posible guardar las respuestas" }, { status: 500 });
  }
}
