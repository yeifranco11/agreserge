import { NextResponse } from "next/server";
import { requireSupabaseAdmin } from "../../../../lib/supabase-admin";

export const dynamic = "force-dynamic";
const CAMPAIGN = "pruebas-psicotecnicas-hgc-agosto-2026";
const digits = (value: unknown) => String(value ?? "").replace(/\D/g, "");
const canonicalName = (value: unknown) => String(value ?? "")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toUpperCase().replace(/[^A-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const identityError = "Los datos no coinciden con un afiliado activo del Hospital Gonzalo Contreras.";

async function findPerson(supabase: any, documento: string) {
  const profileResult = await supabase.from("agreserge_profiles")
    .select("user_id,documento").eq("documento", documento).maybeSingle();
  if (profileResult.error) throw profileResult.error;
  if (!profileResult.data) return { found: false };

  const userResult = await supabase.from("agreserge_users")
    .select("id,nombre,entidad_id,area_id,cargo,activo")
    .eq("id", profileResult.data.user_id).maybeSingle();
  if (userResult.error) throw userResult.error;
  if (!userResult.data || userResult.data.entidad_id !== "hgc" || !userResult.data.activo) {
    return { found: false, unavailable: true };
  }

  const areaResult = userResult.data.area_id
    ? await supabase.from("agreserge_areas").select("nombre").eq("id", userResult.data.area_id).maybeSingle()
    : { data: null, error: null };
  if (areaResult.error) throw areaResult.error;
  return {
    found: true,
    person: {
      documento,
      nombre: canonicalName(userResult.data.nombre),
      area: canonicalName(areaResult.data?.nombre || userResult.data.cargo || "SIN ÁREA REGISTRADA"),
    },
  };
}

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
    const supabase = requireSupabaseAdmin() as any;

    const lookup = await findPerson(supabase, documento);
    if (body.action === "lookup") {
      if (lookup.unavailable) {
        return NextResponse.json({ error: identityError }, { status: 403 });
      }
      return NextResponse.json(lookup);
    }

    if (body.action !== "book" || !body.slotId) {
      return NextResponse.json({ error: "Selecciona un horario disponible." }, { status: 400 });
    }

    if (!lookup.found) {
      const area = canonicalName(body.area);
      if (!body.register || nombre.length < 5 || area.length < 2) {
        return NextResponse.json({ error: "Completa nombres, apellidos y área o servicio para crear el registro." }, { status: 400 });
      }
      const userId = crypto.randomUUID();
      const userInsert = await supabase.from("agreserge_users").insert({
        id: userId,
        nombre,
        correo: `agenda.${documento}@registro.agreserge.local`,
        usuario: documento,
        rol: "Agremiado",
        tipo: "Asistencial",
        entidad_id: "hgc",
        cargo: area,
        activo: true,
      });
      if (userInsert.error) {
        if (String(userInsert.error.message).toLowerCase().includes("duplicate")) {
          return NextResponse.json({ error: "La cédula ya tiene un registro. Vuelve a consultarla." }, { status: 409 });
        }
        throw userInsert.error;
      }
      const profileInsert = await supabase.from("agreserge_profiles").insert({
        user_id: userId,
        documento,
        estado_laboral: "Activo",
        proceso: area,
        fuente_origen: "Agenda pública pruebas psicotécnicas",
      });
      if (profileInsert.error) {
        await supabase.from("agreserge_users").delete().eq("id", userId);
        throw profileInsert.error;
      }
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
