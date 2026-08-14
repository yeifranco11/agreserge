import { NextResponse } from "next/server";
import { getSessionUserId } from "../../../lib/agreserge-auth";
import { requireSupabaseAdmin } from "../../../lib/supabase-admin";
import { loadCertificateTracking } from "../../../lib/apps-script-drive";

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
