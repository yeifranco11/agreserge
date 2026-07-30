import { NextResponse } from "next/server";
import { getSessionUserId, hashPassword } from "../../../../lib/agreserge-auth";
import { loadDB } from "../../../../lib/agreserge-db";
import { canAdmin } from "../../../../lib/agreserge-permissions";
import { requireSupabaseAdmin } from "../../../../lib/supabase-admin";

export const dynamic = "force-dynamic";

const affiliateRoles = new Set([
  "Agremiado",
  "Afiliado partícipe",
  "Afiliado Partícipe",
]);

const normalizeDocument = (value: unknown) => {
  const raw = String(value || "").trim();
  return raw.replace(/\D/g, "") || raw;
};

export async function POST() {
  try {
    const actorId = await getSessionUserId();
    if (!actorId) return NextResponse.json({ error: "Sesión requerida" }, { status: 401 });

    const db = await loadDB();
    const actor = db.usuarios.find((user: any) => user.id === actorId && user.activo);
    if (!actor || !canAdmin(actor)) {
      return NextResponse.json(
        { error: "Solo un perfil administrador puede habilitar los accesos masivos" },
        { status: 403 },
      );
    }

    const supabase = requireSupabaseAdmin() as any;
    const [usersResult, profilesResult] = await Promise.all([
      supabase.from("agreserge_users").select("id,rol,usuario"),
      supabase.from("agreserge_profiles").select("user_id,documento"),
    ]);
    if (usersResult.error) throw usersResult.error;
    if (profilesResult.error) throw profilesResult.error;

    const profilesByUser = new Map<string, string>(
      (profilesResult.data || []).map((profile: any) => [
        profile.user_id,
        normalizeDocument(profile.documento),
      ]),
    );
    const usersByLogin = new Map<string, string>(
      (usersResult.data || [])
        .filter((user: any) => user.usuario)
        .map((user: any) => [String(user.usuario).trim().toLowerCase(), user.id]),
    );

    let updated = 0;
    let skippedWithoutDocument = 0;
    const conflicts: Array<{ userId: string; documento: string }> = [];
    const passwordHash = hashPassword("1234");

    for (const user of usersResult.data || []) {
      if (!affiliateRoles.has(user.rol)) continue;
      const documento = profilesByUser.get(user.id);
      if (!documento) {
        skippedWithoutDocument += 1;
        continue;
      }
      const conflictingUserId = usersByLogin.get(documento.toLowerCase());
      if (conflictingUserId && conflictingUserId !== user.id) {
        conflicts.push({ userId: user.id, documento });
        continue;
      }
      const update = await supabase.from("agreserge_users").update({
        usuario: documento,
        clave_hash: passwordHash,
        activo: true,
        updated_at: new Date().toISOString(),
      }).eq("id", user.id);
      if (update.error) throw update.error;
      usersByLogin.set(documento.toLowerCase(), user.id);
      updated += 1;
    }

    const audit = await supabase.from("agreserge_audit").insert({
      usuario_id: actor.id,
      evento: "Acceso masivo de afiliados",
      metadata: {
        updated,
        skipped_without_document: skippedWithoutDocument,
        conflicts: conflicts.length,
        username_source: "documento",
      },
    });
    if (audit.error) throw audit.error;

    return NextResponse.json({
      ok: true,
      updated,
      skippedWithoutDocument,
      conflicts,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "No se pudieron habilitar los accesos" },
      { status: 500 },
    );
  }
}
