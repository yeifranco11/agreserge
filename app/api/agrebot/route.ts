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
    const { message, history } = await request.json();
    if (!String(message || '').trim()) return NextResponse.json({ error: 'Escribe una consulta' }, { status: 400 });
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'AGREBOT IA está preparado, pero falta configurar OPENAI_API_KEY en Vercel.' }, { status: 503 });

    const question = String(message).slice(0, 4000);
    const conversation=(Array.isArray(history)?history:[]).filter((item:any)=>['user','assistant'].includes(item?.role)&&String(item?.content||'').trim()).slice(-12).map((item:any)=>({role:item.role,content:String(item.content).slice(0,2500)}));
    const ownDocs = (db.documentos[user.id] || []).map((d: any) => ({ nombre: d.nombre, estado: d.estado, vencimiento: d.vencimiento }));
    const managerialRoles = ['Administrador de Sistemas','Coordinadora','Coordinación AGRESERGE','Coordinación General','Coordinación Administrativa','Coordinación Asistencial','Coordinador de Sede','Tesorería','Talento Humano','Gerente','Coordinador General','Coordinadora Administrativa y Financiera','Experiencia al Agremiado'];
    const isManager = managerialRoles.includes(user.rol);
    const allowedUsers = user.rol === 'Agremiado'
      ? db.usuarios.filter((u: any) => u.id === user.id)
      : ['Líder Institucional','Líder de Proceso'].includes(user.rol)
        ? db.usuarios.filter((u: any) => u.id === user.id || u.liderId === user.id)
        : db.usuarios;
    const tokens = question.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z0-9]+/).filter((token: string) => token.length >= 4);
    const exactDocuments: string[] = question.match(/\b\d{6,12}\b/g) || [];
    const matchedUsers = allowedUsers.filter((u: any) => {
      const profile = db.perfiles?.[u.id];
      const haystack = `${u.nombre} ${u.correo} ${profile?.documento || ''}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return exactDocuments.includes(profile?.documento) || tokens.some((token: string) => haystack.includes(token));
    }).slice(0, 25);
    const profileSummary = (u: any, includeDocument = false) => {
      const p = db.perfiles?.[u.id] || {};
      return { nombre: u.nombre, documento: includeDocument ? p.documento : undefined, cargo: u.cargo, tipo: u.tipo, entidadId: u.entidadId, areaId: u.areaId, estado: p.estadoLaboral, formacion: p.formacion, proceso: p.proceso, municipio: p.municipio, eps: p.eps, afp: p.afp, arl: p.arl, fechaIngreso: p.fechaIngreso, fechaRetiro: p.fechaRetiro };
    };
    const aggregate = (items: any[], get: (item: any) => string) => Object.fromEntries(Object.entries(items.reduce((acc: any, item: any) => { const value = get(item) || 'Sin registrar'; acc[value] = (acc[value] || 0) + 1; return acc; }, {})).sort((a: any,b: any) => b[1]-a[1]));
    const affiliates = db.usuarios.filter((u: any) => u.rol === 'Agremiado');
    const context = {
      usuarioActual: { nombre: user.nombre, rol: user.rol },
      resumenInstitucional: isManager ? {
        totalAfiliados: affiliates.length,
        porEntidad: aggregate(affiliates, (u: any) => db.entidades.find((e: any) => e.id === u.entidadId)?.nombre),
        porTipo: aggregate(affiliates, (u: any) => u.tipo),
        porEstado: aggregate(affiliates, (u: any) => db.perfiles?.[u.id]?.estadoLaboral || (u.activo ? 'ACTIVO' : 'INACTIVO')),
        totalInformes: db.asignacionesMensuales.length,
        totalTramites: (db.tramites || []).length,
      } : undefined,
      fichasCoincidentes: matchedUsers.map((u: any) => profileSummary(u, isManager || u.id === user.id)),
      miFicha: profileSummary(user, true),
      documentosPropios: ownDocs,
      informes: db.asignacionesMensuales.filter((a: any) => isManager || a.responsableId === user.id || a.coordinadorId === user.id).map((a: any) => ({ anexo: a.anexo, titulo: a.titulo, mes: a.mes, anio: a.anio, estado: a.estado, responsableId: a.responsableId, fechaLimite: a.fechaLimite })),
      tramites: (db.tramites || []).filter((t: any) => isManager || t.agremiadoId === user.id).slice(0, 100),
    };
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        safety_identifier: user.id,
        text: { verbosity: 'medium' },
        instructions: `Eres AGREBOT, asistente institucional conversacional de AGRESERGE. Responde en español claro y útil. Mantén continuidad con los mensajes anteriores: interpreta respuestas breves como "sí", "continúa" o "por hospital" usando la pregunta previa. Usa únicamente el contexto autorizado. Puedes calcular, resumir y explicar informes y fichas incluidas. Si una persona no aparece en fichasCoincidentes, pide nombre completo o documento. Nunca inventes datos, claves, pagos ni decisiones. No reveles cuentas bancarias, direcciones, datos médicos ni información personal no incluida. Un afiliado partícipe solo puede consultar su propia información. Toda aprobación administrativa requiere intervención humana.\n\nCONTEXTO AUTORIZADO ACTUAL:\n${JSON.stringify(context)}`,
        input: [...conversation,{role:'user',content:question}],
        max_output_tokens: 900,
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error?.message || 'OpenAI no respondió');
    const answer = payload.output_text || payload.output?.flatMap((item: any) => item.content || []).map((item: any) => item.text || item.output_text || '').filter(Boolean).join('\n').trim();
    if (!answer) throw new Error('La IA respondió sin texto. Intenta formular nuevamente la consulta.');
    return NextResponse.json({ ok: true, answer });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'AGREBOT no pudo responder' }, { status: 500 });
  }
}
