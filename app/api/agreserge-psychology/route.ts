import { NextResponse } from "next/server";
import { getSessionUserId } from "../../../lib/agreserge-auth";
import { requireSupabaseAdmin } from "../../../lib/supabase-admin";

export const dynamic = "force-dynamic";
const allowed = new Set(["Administrador de Sistemas", "Coordinadora Administrativa y Financiera", "Coordinación Administrativa", "Psicología", "Talento Humano", "Seguridad y Salud en el Trabajo"]);

async function actor() {
  const id = await getSessionUserId();
  if (!id) return null;
  const supabase = requireSupabaseAdmin() as any;
  const result = await supabase.from("agreserge_users").select("id,nombre,rol,activo").eq("id", id).maybeSingle();
  return result.data?.activo && allowed.has(result.data.rol) ? result.data : null;
}

export async function GET() {
  try {
    if (!(await actor())) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    const supabase = requireSupabaseAdmin() as any;
    const result = await supabase.from("agreserge_psychology_assessments").select("*").order("updated_at", { ascending: false });
    if (result.error) throw result.error;
    return NextResponse.json({ assessments: result.data || [] });
  } catch (error: any) { return NextResponse.json({ error: error.message || "No se pudieron consultar los resultados" }, { status: 500 }); }
}

export async function PUT(request: Request) {
  try {
    const reviewer = await actor();
    if (!reviewer) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    const body = await request.json();
    const supabase = requireSupabaseAdmin() as any;
    const result = await supabase.from("agreserge_psychology_assessments").update({
      professional_observations: String(body.observations || "").trim() || null,
      professional_conclusion: String(body.conclusion || "").trim() || null,
      status: body.markReviewed ? "REVISADO" : "COMPLETADO", reviewed_by: reviewer.id,
      reviewed_at: body.markReviewed ? new Date().toISOString() : null, updated_at: new Date().toISOString(),
    }).eq("id", body.id);
    if (result.error) throw result.error;
    return NextResponse.json({ ok: true });
  } catch (error: any) { return NextResponse.json({ error: error.message || "No se pudo guardar la valoración profesional" }, { status: 500 }); }
}
