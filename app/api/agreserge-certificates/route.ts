import { NextResponse } from "next/server";
import { getSessionUserId } from "../../../lib/agreserge-auth";
import { requireSupabaseAdmin } from "../../../lib/supabase-admin";
import { loadCertificateTracking, markCertificateAlerts } from "../../../lib/apps-script-drive";

export const dynamic = "force-dynamic";

const allowed = new Set([
  "Administrador de Sistemas", "Coordinación General", "Coordinador General", "Director Ejecutivo",
  "Gerente", "Talento Humano", "Seguridad y Salud en el Trabajo", "Asesora de Calidad",
  "Coordinadora Administrativa y Financiera", "Coordinación Administrativa", "Coordinación Asistencial",
  "Coordinador de Sede", "Coordinación AGRESERGE", "Coordinador de Proceso AGRESERGE",
]);

export async function GET(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Sesión requerida" }, { status: 401 });
    const supabase = requireSupabaseAdmin() as any;
    const user = await supabase.from("agreserge_users").select("id,rol,activo").eq("id", userId).maybeSingle();
    if (!user.data?.activo || !allowed.has(user.data.rol)) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    const days = Number(new URL(request.url).searchParams.get("days") || 60);
    return NextResponse.json(await loadCertificateTracking(days));
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "No se pudo consultar certificados" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Sesión requerida" }, { status: 401 });
    const supabase = requireSupabaseAdmin() as any;
    const user = await supabase.from("agreserge_users").select("id,rol,activo").eq("id", userId).maybeSingle();
    if (!user.data?.activo || !allowed.has(user.data.rol)) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    const body = await request.json().catch(() => ({}));
    if (body.action !== "markAlerts") return NextResponse.json({ error: "Acción no soportada" }, { status: 400 });
    return NextResponse.json(await markCertificateAlerts(Number(body.days || 60)));
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "No se pudieron marcar las alertas" }, { status: 500 });
  }
}
