import { NextResponse } from "next/server";
import { getSessionUserId } from "../../../lib/agreserge-auth";
import { loadDB } from "../../../lib/agreserge-db";
import { requireSupabaseAdmin } from "../../../lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId)
      return NextResponse.json({ error: "Sesión requerida" }, { status: 401 });
    const { profile = {}, user = {} } = await request.json();
    if (profile.userId && profile.userId !== userId)
      return NextResponse.json(
        { error: "Solo puede actualizar su propio perfil" },
        { status: 403 },
      );
    if (!String(profile.documento || "").trim())
      return NextResponse.json(
        { error: "El número de documento es obligatorio" },
        { status: 400 },
      );
    const supabase = requireSupabaseAdmin() as any;
    const now = new Date().toISOString();
    const normalizedDocument = String(profile.documento).replace(/\D/g, "");
    const { data: duplicate, error: duplicateError } = await supabase
      .from("agreserge_profiles")
      .select("user_id")
      .eq("documento", normalizedDocument)
      .neq("user_id", userId)
      .maybeSingle();
    if (duplicateError) throw duplicateError;
    if (duplicate) {
      const { data: owner } = await supabase
        .from("agreserge_users")
        .select("nombre")
        .eq("id", duplicate.user_id)
        .maybeSingle();
      return NextResponse.json(
        {
          error: `El documento ${normalizedDocument} ya pertenece a otra ficha${owner?.nombre ? `: ${owner.nombre}` : ""}. Verifica el número antes de guardar.`,
        },
        { status: 409 },
      );
    }
    const { error: userError } = await supabase
      .from("agreserge_users")
      .update({
        nombre: String(user.nombre || "").trim(),
        telefono: String(user.telefono || "").trim() || null,
        updated_at: now,
      })
      .eq("id", userId);
    if (userError) throw userError;
    const row = {
      user_id: userId,
      documento: normalizedDocument,
      lugar_expedicion: profile.lugarExpedicion || null,
      cnv: profile.cnv || null,
      fecha_ingreso: profile.fechaIngreso || null,
      fecha_retiro: profile.fechaRetiro || null,
      estado_laboral: profile.estadoLaboral || null,
      formacion: profile.formacion || null,
      proceso: profile.proceso || null,
      direccion: profile.direccion || null,
      barrio: profile.barrio || null,
      municipio: profile.municipio || null,
      departamento: profile.departamento || null,
      sexo: profile.sexo || null,
      estado_civil: profile.estadoCivil || null,
      personas_cargo:
        profile.personasCargo === "" || profile.personasCargo == null
          ? null
          : Number(profile.personasCargo),
      fecha_nacimiento: profile.fechaNacimiento || null,
      lugar_nacimiento: profile.lugarNacimiento || null,
      tipo_contrato: profile.tipoContrato || null,
      forma_pago: profile.formaPago || null,
      banco: profile.banco || null,
      tipo_cuenta: profile.tipoCuenta || null,
      numero_cuenta: profile.numeroCuenta || null,
      eps: profile.eps || null,
      afp: profile.afp || null,
      arl: profile.arl || null,
      caja_compensacion: profile.cajaCompensacion || null,
      rh: profile.rh || null,
      talla: profile.talla || null,
      retencion_fuente: profile.retencionFuente || null,
      observaciones: profile.observaciones || null,
      fecha_examen_medico: profile.fechaExamenMedico || null,
      ciudad_votacion: profile.ciudadVotacion || null,
      puesto_votacion: profile.puestoVotacion || null,
      fuente_origen: profile.fuenteOrigen || "Portal AGRESERGE",
      datos_adicionales: profile.datosAdicionales || {},
      updated_at: now,
    };
    const { error: profileError } = await supabase
      .from("agreserge_profiles")
      .upsert(row, { onConflict: "user_id" });
    if (profileError) throw profileError;
    await supabase.from("agreserge_audit").insert({
      usuario_id: userId,
      evento: "Perfil sociodemográfico actualizado por el afiliado",
      metadata: {
        completado: Boolean(
          profile.datosAdicionales?.perfilSociodemograficoCompletado,
        ),
      },
    });
    return NextResponse.json({ ok: true, db: await loadDB() });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message || "No se pudo guardar el perfil sociodemográfico",
      },
      { status: 500 },
    );
  }
}
