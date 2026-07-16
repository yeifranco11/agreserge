export async function remoteLogin(usuario: string, clave: string) {
  const response = await fetch('/api/agreserge-auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuario, clave }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error ?? 'No se pudo iniciar sesión');
  return payload;
}

export async function remoteLogout() {
  await fetch('/api/agreserge-auth/logout', { method: 'POST' });
}

export async function saveRemoteDB(db: unknown) {
  const response = await fetch('/api/agreserge-db', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ db }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error ?? 'No se pudo guardar en Supabase');
  return payload;
}

export async function uploadDocument(documentId: string, file: File) {
  const form = new FormData();
  form.append('documentId', documentId);
  form.append('file', file);
  const response = await fetch('/api/agreserge-documents', { method: 'POST', body: form });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar el documento');
  return payload;
}

export async function openRemoteDrivePeriod(input: {
  mes: string;
  anio: string;
  fechaLimite?: string;
  assignments: Array<{ anexo: number; responsableId: string }>;
}) {
  const response = await fetch('/api/agreserge-drive/open-period', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error ?? 'No se pudo crear el periodo en Google Drive');
  return payload;
}

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || 'La operación no pudo completarse');
  return payload;
}

export const lookupPayroll = (documento: string) => postJson('/api/agreserge-payroll/lookup', { documento });
export async function loadPayrollReport() {
  const response = await fetch('/api/agreserge-payroll/report', { cache: 'no-store' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || 'No se pudo generar el informe de nómina');
  return payload;
}
export const askAgrebot = (message: string, history: Array<{role:'user'|'assistant';content:string}> = []) => postJson('/api/agrebot', { message, history });
export const createDigitalRequest = (tipo: string, datos: unknown) => postJson('/api/agreserge-requests', { tipo, datos });
export async function decideDigitalRequest(id: string, action: string, comentario = '') {
  const response = await fetch('/api/agreserge-requests', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action, comentario }) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || 'No se pudo actualizar la solicitud');
  return payload;
}
