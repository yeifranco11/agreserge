import { NextResponse } from "next/server";
import { getSessionUserId } from "../../../../lib/agreserge-auth";
import { loadDB } from "../../../../lib/agreserge-db";
import { canAdmin } from "../../../../lib/agreserge-permissions";
import { requireSupabaseAdmin } from "../../../../lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Sesión requerida" }, { status: 401 });
    const db = await loadDB();
    const actor = db.usuarios.find((user: any) => user.id === userId && user.activo);
    if (!actor || !canAdmin(actor)) {
      return NextResponse.json({ error: "Solo el administrador del sistema puede ejecutar la limpieza" }, { status: 403 });
    }
    const supabase = requireSupabaseAdmin() as any;
    const users = await supabase.from("agreserge_users").select("id,nombre,usuario,correo");
    if (users.error) throw users.error;
    const demoIds = (users.data || [])
      .filter((user: any) => /\bdemo\b/i.test(`${user.nombre || ""} ${user.usuario || ""} ${user.correo || ""}`))
      .map((user: any) => user.id);

    if (demoIds.length) {
      const nullableReferences = [
        ["agreserge_report_periods", "coordinador_id"],
        ["agreserge_report_annexes", "responsable_id"],
        ["agreserge_report_annexes", "coordinador_id"],
        ["agreserge_report_submissions", "responsable_id"],
        ["agreserge_report_submissions", "delegado_por_id"],
      ] as const;
      for (const [table, column] of nullableReferences) {
        const result = await supabase.from(table).update({ [column]: null }).in(column, demoIds);
        if (result.error && result.error.code !== "42P01") throw result.error;
      }
      const deletion = await supabase.from("agreserge_users").delete().in("id", demoIds);
      if (deletion.error) throw deletion.error;
    }

    const rename = await supabase.from("agreserge_entities").upsert([
      {
        id: "hsv",
        nombre: "Hospital Henry Valencia Orozco E.S.E.",
        ciudad: "Versalles, Valle del Cauca",
        updated_at: new Date().toISOString(),
      },
      {
        id: "oficina-agreserge",
        nombre: "Oficina AGRESERGE",
        ciudad: "Valle del Cauca",
        updated_at: new Date().toISOString(),
      },
    ]);
    if (rename.error) throw rename.error;

    return NextResponse.json({
      ok: true,
      demosDeleted: demoIds.length,
      entitiesUpdated: 2,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "No se pudo ejecutar la preparación de lanzamiento" }, { status: 500 });
  }
}
