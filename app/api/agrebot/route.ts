import { NextResponse } from 'next/server';
import { getSessionUserId } from '../../../lib/agreserge-auth';
import { loadDB } from '../../../lib/agreserge-db';

export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: 'Sesión requerida' }, { status: 401 });
    const db = await loadDB();
    const user = db.usuarios.find((item: any) => item.id === userId && item.activo);
    if (!user) return NextResponse.json({ error: 'Usuario no autorizado' }, { status: 403 });
    const { message } = await request.json();
    if (!String(message || '').trim()) return NextResponse.json({ error: 'Escribe una consulta' }, { status: 400 });
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'AGREBOT IA está preparado, pero falta configurar OPENAI_API_KEY en Vercel.' }, { status: 503 });

    const ownDocs = (db.documentos[user.id] || []).map((d: any) => ({ nombre: d.nombre, estado: d.estado, vencimiento: d.vencimiento }));
    const visibleUsers = user.rol === 'Agremiado' ? [{ id: user.id, nombre: user.nombre, rol: user.rol, cargo: user.cargo }] : db.usuarios.map((u: any) => ({ id: u.id, nombre: u.nombre, rol: u.rol, cargo: u.cargo, areaId: u.areaId, entidadId: u.entidadId, liderId: u.liderId }));
    const context = { usuarioActual: { nombre: user.nombre, rol: user.rol }, entidades: db.entidades, areas: db.areas, usuarios: visibleUsers, documentosPropios: ownDocs, informes: db.asignacionesMensuales.map((a: any) => ({ anexo: a.anexo, mes: a.mes, anio: a.anio, estado: a.estado, responsableId: a.responsableId })), tramites: (db.tramites || []).filter((t: any) => user.rol !== 'Agremiado' || t.agremiadoId === user.id) };
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-5.4-mini',
        instructions: 'Eres AGREBOT, asistente institucional de AGRESERGE. Responde en español claro. Usa solo el contexto autorizado. No inventes datos, claves, pagos ni decisiones. No reveles información personal de otros usuarios a un afiliado partícipe. Para decisiones administrativas indica que requieren aprobación humana.',
        input: `CONTEXTO AUTORIZADO:\n${JSON.stringify(context)}\n\nCONSULTA:\n${String(message).slice(0, 4000)}`,
        max_output_tokens: 900,
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error?.message || 'OpenAI no respondió');
    return NextResponse.json({ ok: true, answer: payload.output_text || 'No fue posible generar una respuesta.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'AGREBOT no pudo responder' }, { status: 500 });
  }
}
