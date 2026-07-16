import { NextResponse } from 'next/server';
import { getSessionUserId } from '../../../../lib/agreserge-auth';
import { loadDB } from '../../../../lib/agreserge-db';
import { lookupPayrollInDrive } from '../../../../lib/apps-script-drive';
import { lookupPayrollInPublicSheet } from '../../../../lib/public-payroll';

export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: 'Sesión requerida' }, { status: 401 });
    const db = await loadDB();
    const actor = db.usuarios.find((user: any) => user.id === userId && user.activo);
    if (!actor) return NextResponse.json({ error: 'Usuario no autorizado' }, { status: 403 });
    const body = await request.json();
    const documento = String(body.documento || '').replace(/\D/g, '');
    if (!documento) return NextResponse.json({ error: 'Digite el número de documento' }, { status: 400 });
    let result: any;
    let sourceMode = 'apps-script';
    try {
      result = await lookupPayrollInDrive(documento);
      if (!result?.payroll?.nombre) throw new Error('Google Drive devolvió un comprobante incompleto');
    }
    catch { result = await lookupPayrollInPublicSheet(documento); sourceMode = 'google-sheet-public'; }
    if (actor.rol === 'Agremiado') {
      const normalize = (value: string) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
      if (normalize(result.payroll?.nombre) !== normalize(actor.nombre)) {
        return NextResponse.json({ error: 'Solo puede consultar su propio comprobante' }, { status: 403 });
      }
    }
    return NextResponse.json({ ok: true, payroll: result.payroll, source: { spreadsheetId: '11R2hU9IzD55MBa8FivztC38boeQAxGpoMly_3yH0Ajk', tab: result.tab, mode: sourceMode, updatedAt: new Date().toISOString() } });
  } catch (error: any) {
    const message = error.message || 'No se pudo consultar la nómina';
    return NextResponse.json({ error: message }, { status: /no se encontró/i.test(message) ? 404 : 500 });
  }
}
