import { NextResponse } from "next/server";
import { getSessionUserId } from "../../../../lib/agreserge-auth";
import { loadDB } from "../../../../lib/agreserge-db";
import { requireSupabaseAdmin } from "../../../../lib/supabase-admin";

const MASTER_ID = "11R2hU9IzD55MBa8FivztC38boeQAxGpoMly_3yH0Ajk";
const managers = new Set([
  "Administrador de Sistemas",
  "Coordinadora",
  "Coordinación AGRESERGE",
  "Coordinación General",
  "Coordinación Administrativa",
  "Coordinadora Administrativa y Financiera",
  "Director Ejecutivo",
  "Gerente",
]);
const sheetId = (value: string) =>
  value.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)?.[1] ||
  (/^[a-zA-Z0-9_-]{20,}$/.test(value) ? value : "");

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId)
    return NextResponse.json({ error: "Sesión requerida" }, { status: 401 });
  const supabase = requireSupabaseAdmin() as any;
  const { data, error } = await supabase
    .from("agreserge_audit")
    .select("created_at,usuario_id,metadata")
    .eq("evento", "Periodo de nómina abierto")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const unique = new Map();
  for (const row of data || []) {
    const key = `${row.metadata?.anio}-${row.metadata?.mes}`;
    if (!unique.has(key))
      unique.set(key, { ...row.metadata, createdAt: row.created_at });
  }
  return NextResponse.json({
    ok: true,
    periods: [...unique.values()],
    masterCopyUrl: `https://docs.google.com/spreadsheets/d/${MASTER_ID}/copy`,
  });
}

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId)
    return NextResponse.json({ error: "Sesión requerida" }, { status: 401 });
  const db = await loadDB();
  const actor = db.usuarios.find((u: any) => u.id === userId && u.activo);
  if (!actor || !managers.has(actor.rol))
    return NextResponse.json(
      { error: "Perfil no autorizado para abrir nómina mensual" },
      { status: 403 },
    );
  const body = await request.json();
  const mes = String(body.mes || "");
  const anio = String(body.anio || "");
  const spreadsheetId = sheetId(String(body.sheetUrl || ""));
  if (!mes || !/^20\d{2}$/.test(anio) || !spreadsheetId)
    return NextResponse.json(
      { error: "Mes, año y enlace de Google Sheets válido son obligatorios" },
      { status: 400 },
    );
  const supabase = requireSupabaseAdmin() as any;
  const { data: existing } = await supabase
    .from("agreserge_audit")
    .select("id")
    .eq("evento", "Periodo de nómina abierto")
    .contains("metadata", { mes, anio })
    .limit(1);
  if (existing?.length)
    return NextResponse.json(
      { error: `La nómina de ${mes} ${anio} ya está en el historial.` },
      { status: 409 },
    );
  const sourceUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  const { error } = await supabase
    .from("agreserge_audit")
    .insert({
      usuario_id: userId,
      evento: "Periodo de nómina abierto",
      metadata: {
        mes,
        anio,
        spreadsheetId,
        sourceUrl,
        abiertoPor: actor.nombre,
      },
    });
  if (error) throw error;
  return NextResponse.json({ ok: true, sourceUrl });
}
