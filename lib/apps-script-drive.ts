type PeriodAssignment = {
  anexo: number;
  obligacion?: number;
  titulo?: string;
  responsableId: string;
  responsableNombre: string;
  subinformes?: Array<{ responsableId: string; responsableNombre: string; titulo: string; orden: number }>;
};

export async function openDrivePeriod(input: {
  mes: string;
  anio: string;
  obligations: Array<{ obligacion: number; titulo: string }>;
  assignments: PeriodAssignment[];
  hospital?: string;
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

export async function consolidateDrivePeriod(input: {
  mes: string;
  anio: string;
  hospital: string;
  items: any[];
}) {
  const url = process.env.GOOGLE_APPS_SCRIPT_URL;
  const secret = process.env.GOOGLE_APPS_SCRIPT_SECRET;
  if (!url || !secret) throw new Error('La integración con Google Drive no está configurada.');
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'consolidate', secret, ...input }),
    redirect: 'follow',
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.ok) throw new Error(payload?.error || 'No se pudo consolidar el informe.');
  return payload;
}

export async function importReportFile(input: {
  folderId: string;
  fileBase64: string;
  fileName: string;
  mimeType: string;
}) {
  const url = process.env.GOOGLE_APPS_SCRIPT_URL;
  const secret = process.env.GOOGLE_APPS_SCRIPT_SECRET;
  if (!url || !secret) throw new Error('La integración con Google Drive no está configurada.');
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'importReportFile', secret, ...input }),
    redirect: 'follow',
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.ok) throw new Error(payload?.error || 'No se pudo guardar el archivo en Drive.');
  return payload;
}

export async function createDriveSubreport(input: {
  folderId: string;
  title: string;
  responsibleName: string;
  order: number;
}) {
  const url = process.env.GOOGLE_APPS_SCRIPT_URL;
  const secret = process.env.GOOGLE_APPS_SCRIPT_SECRET;
  if (!url || !secret) throw new Error('La integración con Google Drive no está configurada.');
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'createSubreport', secret, ...input }),
    redirect: 'follow',
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.ok) throw new Error(payload?.error || 'No se pudo crear el subinforme en Drive.');
  return payload;
}

export async function resetDrivePeriods() {
  const url = process.env.GOOGLE_APPS_SCRIPT_URL;
  const secret = process.env.GOOGLE_APPS_SCRIPT_SECRET;
  if (!url || !secret) throw new Error('La integración con Google Drive no está configurada.');
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'resetPeriods', secret }),
    redirect: 'follow',
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.ok) throw new Error(payload?.error || 'No se pudo reiniciar el historial de Drive.');
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
