import { NextResponse } from "next/server";
import {
  getSessionUserId,
  hashPortablePassword,
  verifyPassword,
} from "../../../../lib/agreserge-auth";
import { requireSupabaseAdmin } from "../../../../lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Sesión requerida" }, { status: 401 });
    const { actual, nueva } = await request.json();
    if (!actual || !nueva || String(nueva).length < 8) {
      return NextResponse.json({ error: "La nueva contraseña debe tener al menos 8 caracteres" }, { status: 400 });
    }
    if (actual === nueva) {
      return NextResponse.json({ error: "La nueva contraseña debe ser diferente a la actual" }, { status: 400 });
    }
    const supabase = requireSupabaseAdmin() as any;
    const current = await supabase.from("agreserge_users")
      .select("id,clave_hash,activo").eq("id", userId).single();
    if (current.error) throw current.error;
    if (!current.data.activo || !verifyPassword(String(actual), current.data.clave_hash)) {
      return NextResponse.json({ error: "La contraseña actual no es correcta" }, { status: 403 });
    }
    const update = await supabase.from("agreserge_users").update({
      clave_hash: hashPortablePassword(String(nueva)),
      updated_at: new Date().toISOString(),
    }).eq("id", userId);
    if (update.error) throw update.error;
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "No se pudo cambiar la contraseña" }, { status: 500 });
  }
}
