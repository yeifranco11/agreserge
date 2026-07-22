import { NextResponse } from "next/server";
import { getSessionUserId } from "../../../../lib/agreserge-auth";
import { loadDB } from "../../../../lib/agreserge-db";
import { lookupPayrollInDrive } from "../../../../lib/apps-script-drive";
import { lookupPayrollInPublicSheet } from "../../../../lib/public-payroll";

export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId)
      return NextResponse.json({ error: "Sesión requerida" }, { status: 401 });
    const db = await loadDB();
    const actor = db.usuarios.find(
      (user: any) => user.id === userId && user.activo,
    );
    if (!actor)
      return NextResponse.json(
        { error: "Usuario no autorizado" },
        { status: 403 },
      );
    const body = await request.json();
    const ownDocument = db.perfiles?.[userId]?.documento;
    const documento = String(
      actor.rol === "Agremiado" ? ownDocument : body.documento || "",
    ).replace(/\D/g, "");
    if (!documento)
      return NextResponse.json(
        { error: "Digite el número de documento" },
        { status: 400 },
      );
    let result: any;
    let spreadsheetId = "11R2hU9IzD55MBa8FivztC38boeQAxGpoMly_3yH0Ajk";
    if (body.mes && body.anio) {
      const supabase = (
        await import("../../../../lib/supabase-admin")
      ).requireSupabaseAdmin() as any;
      const { data: periods } = await supabase
        .from("agreserge_audit")
        .select("metadata")
        .eq("evento", "Periodo de nómina abierto")
        .order("created_at", { ascending: false });
      const period = (periods || []).find(
        (row: any) =>
          String(row.metadata?.mes) === String(body.mes) &&
          String(row.metadata?.anio) === String(body.anio),
      );
      if (!period)
        return NextResponse.json(
          { error: "Este periodo de nómina todavía no ha sido habilitado." },
          { status: 404 },
        );
      spreadsheetId = period.metadata.spreadsheetId;
    }
    let sourceMode = "apps-script";
    try {
      if (body.mes && body.anio)
        throw new Error("Consulta histórica por hoja pública");
      result = await lookupPayrollInDrive(documento);
      if (!result?.payroll?.nombre)
        throw new Error("Google Drive devolvió un comprobante incompleto");
    } catch {
      result = await lookupPayrollInPublicSheet(documento, spreadsheetId);
      sourceMode =
        body.mes && body.anio ? "historial-mensual" : "google-sheet-public";
    }
    if (actor.rol === "Agremiado") {
      const normalize = (value: string) =>
        String(value || "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, " ")
          .trim()
          .toUpperCase();
      if (normalize(result.payroll?.nombre) !== normalize(actor.nombre)) {
        return NextResponse.json(
          { error: "Solo puede consultar su propio comprobante" },
          { status: 403 },
        );
      }
    }
    return NextResponse.json({
      ok: true,
      payroll: result.payroll,
      source: {
        spreadsheetId,
        tab: result.tab,
        mode: sourceMode,
        mes: body.mes,
        anio: body.anio,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    const message = error.message || "No se pudo consultar la nómina";
    return NextResponse.json(
      { error: message },
      { status: /no se encontró/i.test(message) ? 404 : 500 },
    );
  }
}
