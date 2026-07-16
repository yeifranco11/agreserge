type PeriodAssignment = {
  anexo: number;
  responsableId: string;
  responsableNombre: string;
};

export async function openDrivePeriod(input: {
  mes: string;
  anio: string;
  assignments: PeriodAssignment[];
}) {
  const url = process.env.GOOGLE_APPS_SCRIPT_URL;
  const secret = process.env.GOOGLE_APPS_SCRIPT_SECRET;
  if (!url || !secret) {
    throw new Error('Falta configurar GOOGLE_APPS_SCRIPT_URL y GOOGLE_APPS_SCRIPT_SECRET en Vercel.');
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'openPeriod', secret, ...input }),
    redirect: 'follow',
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.ok) throw new Error(payload?.error || 'Google Drive no pudo abrir el periodo.');
  return payload;
}

export async function lookupPayrollInDrive(documento: string) {
  const url = process.env.GOOGLE_APPS_SCRIPT_URL;
  const secret = process.env.GOOGLE_APPS_SCRIPT_SECRET;
  if (!url || !secret) throw new Error('La integración con Google Drive no está configurada.');
  const response = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'lookupPayroll', secret, documento }), redirect: 'follow', cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.ok) throw new Error(payload?.error || 'No se pudo consultar la nómina en Google Drive.');
  return payload;
}
