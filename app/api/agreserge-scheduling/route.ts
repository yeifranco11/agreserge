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

const SEPTEMBER_DATES = ["2026-09-07", "2026-09-08", "2026-09-09", "2026-09-10", "2026-09-11"];
const SCHEDULE_TIMES = ["09:30:00", "10:30:00", "11:30:00"];

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

export async function DELETE(request: Request) {
  try {
    const supabase = await context();
    const body = await request.json();
    if (!body.bookingId) {
      return NextResponse.json({ error: "Reserva requerida" }, { status: 400 });
    }
    const result = await supabase.from("agreserge_schedule_bookings")
      .delete().eq("id", body.bookingId).select("id").maybeSingle();
    if (result.error) throw result.error;
    if (!result.data) return NextResponse.json({ error: "La reserva ya no existe" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    const status = /Sesión|permiso/.test(error.message) ? 403 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await context();
    const body = await request.json();
    if (body.action !== "RESET_SEPTEMBER_2026") {
      return NextResponse.json({ error: "Confirmación de reinicio requerida" }, { status: 400 });
    }

    const campaignResult = await supabase.from("agreserge_schedule_campaigns").select("*")
      .eq("slug", "pruebas-psicotecnicas-hgc-agosto-2026").maybeSingle();
    if (campaignResult.error) throw campaignResult.error;
    const campaign = campaignResult.data;
    if (!campaign) return NextResponse.json({ error: "No se encontró la agenda psicotécnica" }, { status: 404 });

    const bookingsResult = await supabase.from("agreserge_schedule_bookings")
      .delete().eq("campaign_id", campaign.id).select("id");
    if (bookingsResult.error) throw bookingsResult.error;

    const slotsResult = await supabase.from("agreserge_schedule_slots")
      .delete().eq("campaign_id", campaign.id).select("id");
    if (slotsResult.error) throw slotsResult.error;

    const newSlots = SEPTEMBER_DATES.flatMap((fecha) =>
      SCHEDULE_TIMES.map((hora) => ({ campaign_id: campaign.id, fecha, hora, capacidad: 8, activo: true }))
    );
    const insertResult = await supabase.from("agreserge_schedule_slots").insert(newSlots).select("id");
    if (insertResult.error) throw insertResult.error;

    const updateResult = await supabase.from("agreserge_schedule_campaigns").update({
      titulo: "Agenda AGRESERGE · Pruebas psicotécnicas",
      descripcion: "Hospital Gonzalo Contreras E.S.E. · Del 7 al 11 de septiembre de 2026",
      activa: true,
      updated_at: new Date().toISOString(),
    }).eq("id", campaign.id);
    if (updateResult.error) throw updateResult.error;

    return NextResponse.json({
      ok: true,
      deletedBookings: bookingsResult.data?.length ?? 0,
      deletedSlots: slotsResult.data?.length ?? 0,
      createdSlots: insertResult.data?.length ?? 0,
      totalCapacity: newSlots.reduce((total, slot) => total + slot.capacidad, 0),
      dates: SEPTEMBER_DATES,
      times: SCHEDULE_TIMES,
    });
  } catch (error: any) {
    const status = /Sesión|permiso/.test(error.message) ? 403 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
