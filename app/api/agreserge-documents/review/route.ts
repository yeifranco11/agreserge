import { NextResponse } from "next/server";
import { getSessionUserId } from "../../../../lib/agreserge-auth";
import { loadDB } from "../../../../lib/agreserge-db";
import { requireSupabaseAdmin } from "../../../../lib/supabase-admin";

export const dynamic = "force-dynamic";
const BUCKET = "agreserge-files";
const allowedRoles = new Set([
  "Administrador de Sistemas",
  "Coordinadora",
  "Coordinación AGRESERGE",
  "Coordinación General",
  "Coordinador General",
  "Director Ejecutivo",
  "Talento Humano",
  "Asesora de Calidad",
]);

export async function POST(request: Request) {
  try {
    const actorId = await getSessionUserId();
    if (!actorId) return NextResponse.json({ error: "Sesión requerida" }, { status: 401 });
    const db = await loadDB();
    const actor = db.usuarios.find((u: any) => u.id === actorId && u.activo);
    if (!actor || !allowedRoles.has(actor.rol))
      return NextResponse.json({ error: "Este perfil no tiene autorización para ejecutar revisión documental con IA" }, { status: 403 });
    const { userId } = await request.json();
    const owner = db.usuarios.find((u: any) => u.id === userId && u.rol === "Agremiado");
    if (!owner) return NextResponse.json({ error: "Seleccione un afiliado válido" }, { status: 400 });
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Falta configurar OPENAI_API_KEY" }, { status: 503 });

    const docs = (db.documentos[owner.id] || []).filter((d: any) => d.archivo);
    const content: any[] = [{
      type: "input_text",
      text: `Analiza los soportes documentales cargados de ${owner.nombre}. Tipo: ${owner.tipo}. Emite un informe ejecutivo en español con: resumen, documentos legibles, posibles problemas de calidad o vigencia, faltantes del checklist, alertas y recomendaciones. No apruebes ni rechaces: la decisión final es humana. Checklist y estados: ${JSON.stringify((db.documentos[owner.id] || []).map((d: any) => ({ nombre: d.nombre, estado: d.estado, vencimiento: d.vencimiento, archivo: d.archivo?.nombre })))}.`,
    }];
    const supabase = requireSupabaseAdmin();
    let totalBytes = 0;
    let attached = 0;
    for (const doc of docs.slice(0, 10)) {
      if (!doc.archivo?.dataUrl || totalBytes > 18 * 1024 * 1024) break;
      const { data } = await supabase.from("agreserge_documents").select("archivo_path,archivo_nombre,archivo_tipo,archivo_tamano").eq("id", doc.id).maybeSingle();
      const row: any = data;
      if (!row?.archivo_path || String(row.archivo_path).startsWith("data:")) continue;
      const { data: file, error } = await supabase.storage.from(BUCKET).download(row.archivo_path);
      if (error || !file || file.size > 8 * 1024 * 1024) continue;
      totalBytes += file.size;
      const mime = row.archivo_tipo || file.type || "application/pdf";
      const encoded = Buffer.from(await file.arrayBuffer()).toString("base64");
      if (mime.startsWith("image/")) content.push({ type: "input_image", image_url: `data:${mime};base64,${encoded}`, detail: "high" });
      else if (mime === "application/pdf") content.push({ type: "input_file", filename: row.archivo_nombre || doc.nombre, file_data: `data:${mime};base64,${encoded}` });
      else continue;
      attached++;
    }
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        safety_identifier: actor.id,
        instructions: "Eres auditor documental de apoyo para AGRESERGE. Evalúa legibilidad, coherencia visible, integridad aparente, vigencias explícitas y faltantes. No autentiques documentos, no tomes decisiones y no inventes datos. Distingue hechos observados, alertas y elementos que requieren revisión humana.",
        input: [{ role: "user", content }],
        max_output_tokens: 1600,
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error?.message || "La IA no pudo analizar los documentos");
    const report = payload.output_text || payload.output?.flatMap((item: any) => item.content || []).map((item: any) => item.text || item.output_text || "").filter(Boolean).join("\n");
    await (supabase as any).from("agreserge_audit").insert({ usuario_id: actor.id, evento: `Informe IA documental: ${owner.nombre}`, metadata: { ownerId: owner.id, archivosAnalizados: attached } });
    return NextResponse.json({ ok: true, report, attached, generatedAt: new Date().toISOString() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "No se pudo generar el informe documental" }, { status: 500 });
  }
}
