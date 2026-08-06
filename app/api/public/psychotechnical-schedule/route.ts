import { NextResponse } from "next/server";
import { requireSupabaseAdmin } from "../../../../lib/supabase-admin";

export const dynamic = "force-dynamic";
const CAMPAIGN = "pruebas-psicotecnicas-hgc-agosto-2026";
const digits = (value: unknown) => String(value ?? "").replace(/\D/g, "");
const canonicalName = (value: unknown) => String(value ?? "")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toUpperCase().replace(/[^A-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const identityError = "Los datos no coinciden con un afiliado activo del Hospital Gonzalo Contreras.";

async function schedule(supabase: any) {
  const campaignResult = await supabase.from("agreserge_schedule_campaigns")
    .select("id,slug,titulo,descripcion,ubicacion,activa")
    .eq("slug", CAMPAIGN).maybeSingle();
  if (campaignResult.error) throw campaignResult.error;
  const campaign = campaignResult.data;
  if (!campaign?.activa) return { campaign: null, slots: [] };

  const slotsResult = await supabase.from("agreserge_schedule_slots")
    .select("id,fecha,hora,capacidad,activo")
    .eq("campaign_id", campaign.id).eq("activo", true)
    .order("fecha").order("hora");
  if (slotsResult.error) throw slotsResult.error;
  const ids = (slotsResult.data ?? []).map((slot: any) => slot.id);
  const bookingsResult = ids.length
    ? await supabase.from("agreserge_schedule_bookings").select("slot_id")
      .in("slot_id", ids).neq("estado", "CANCELADA")
    : { data: [], error: null };
  if (bookingsResult.error) throw bookingsResult.error;
  const occupied = (bookingsResult.data ?? []).reduce((map: Record<string, number>, row: any) => {
    map[row.slot_id] = (map[row.slot_id] ?? 0) + 1;
    return map;
  }, {});
  return {
    campaign,
    slots: (slotsResult.data ?? []).map((slot: any) => ({
      ...slot,
      hora: String(slot.hora).slice(0, 5),
      ocupados: occupied[slot.id] ?? 0,
      disponibles: Math.max(0, slot.capacidad - (occupied[slot.id] ?? 0)),
    })),
  };
}

export async function GET() {
  try {
    return NextResponse.json(await schedule(requireSupabaseAdmin() as any), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "No se pudo consultar la agenda." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const documento = digits(body.documento);
    const nombre = canonicalName(body.nombre);
    if (documento.length < 5 || documento.length > 15) {
      return NextResponse.json({ error: "Escribe un número de documento válido." }, { status: 400 });
    }
    if (body.action !== "book" || !body.slotId || nombre.length < 5) {
      return NextResponse.json({ error: "Completa nombres, apellidos, documento y horario." }, { status: 400 });
    }
    const supabase = requireSupabaseAdmin() as any;
    const profileResult = await supabase.from("agreserge_profiles")
      .select("user_id,documento").eq("documento", documento).maybeSingle();
    if (profileResult.error) throw profileResult.error;
    if (!profileResult.data) {
      return NextResponse.json({ error: identityError }, { status: 400 });
    }
    const userResult = await supabase.from("agreserge_users")
      .select("id,nombre,entidad_id,activo")
      .eq("id", profileResult.data.user_id).eq("entidad_id", "hgc").eq("activo", true).maybeSingle();
    if (userResult.error) throw userResult.error;
    if (!userResult.data || canonicalName(userResult.data.nombre) !== nombre) {
      return NextResponse.json({ error: identityError }, { status: 400 });
    }
    const bookingResult = await supabase.rpc("agreserge_book_psychotechnical_slot", {
      p_slot_id: body.slotId,
      p_documento: documento,
    });
    if (bookingResult.error) {
      const code = ["YA_TIENE_RESERVA", "CUPO_AGOTADO", "HORARIO_NO_DISPONIBLE", "AGENDA_NO_DISPONIBLE"]
        .find((item) => bookingResult.error.message?.includes(item));
      const messages: Record<string, string> = {
        YA_TIENE_RESERVA: "Ya tienes una reserva confirmada para estas pruebas.",
        CUPO_AGOTADO: "Ese horario acaba de llenarse. Selecciona otro disponible.",
        HORARIO_NO_DISPONIBLE: "El horario seleccionado ya no está disponible.",
        AGENDA_NO_DISPONIBLE: "La agenda ya no está habilitada.",
      };
      return NextResponse.json({ error: messages[code || ""] || "No fue posible confirmar la reserva." }, { status: 409 });
    }
    return NextResponse.json({ ok: true, booking: bookingResult.data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "No se pudo procesar el agendamiento." }, { status: 500 });
  }
}
