import { NextResponse } from "next/server";
import { getSessionUserId } from "../../../lib/agreserge-auth";
import { loadDB } from "../../../lib/agreserge-db";
import { requireSupabaseAdmin } from "../../../lib/supabase-admin";

export const dynamic = "force-dynamic";
const ALLOWED = new Set(["Coordinación Asistencial", "Coordinación General", "Coordinador General", "Director Ejecutivo", "Administrador de Sistemas"]);

async function context() {
  const userId = await getSessionUserId();
  if (!userId) throw new Error("Sesión requerida");
  const db = await loadDB();
  const actor = db.usuarios.find((user: any) => user.id === userId && user.activo);
  if (!actor || !ALLOWED.has(actor.rol)) throw new Error("No tiene permiso para administrar esta agenda");
  return requireSupabaseAdmin() as any;
}

export async function GET() {
  try {
    const supabase = await context();
    const campaignResult = await supabase.from("agreserge_schedule_campaigns").select("*")
      .eq("slug", "pruebas-psicotecnicas-hgc-agosto-2026").maybeSingle();
    if (campaignResult.error) throw campaignResult.error;
    const campaign = campaignResult.data;
    if (!campaign) return NextResponse.json({ campaign: null, slots: [], bookings: [] });
    const slotsResult = await supabase.from("agreserge_schedule_slots").select("*")
      .eq("campaign_id", campaign.id).order("fecha").order("hora");
    const bookingsResult = await supabase.from("agreserge_schedule_bookings")
      .select("id,slot_id,documento,nombre_completo,area,estado,created_at")
      .eq("campaign_id", campaign.id).order("created_at");
    if (slotsResult.error) throw slotsResult.error;
    if (bookingsResult.error) throw bookingsResult.error;
    return NextResponse.json({ campaign, slots: slotsResult.data ?? [], bookings: bookingsResult.data ?? [] });
  } catch (error: any) {
    const status = /Sesión|permiso/.test(error.message) ? 403 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await context();
    const body = await request.json();
    if (!body.bookingId || !["CONFIRMADA", "CANCELADA", "ASISTIÓ", "NO ASISTIÓ"].includes(body.estado)) {
      return NextResponse.json({ error: "Actualización no válida" }, { status: 400 });
    }
    const result = await supabase.from("agreserge_schedule_bookings")
      .update({ estado: body.estado, updated_at: new Date().toISOString() }).eq("id", body.bookingId).select("id").single();
    if (result.error) throw result.error;
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    const status = /Sesión|permiso/.test(error.message) ? 403 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
