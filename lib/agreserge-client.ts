export async function remoteLogin(usuario: string, clave: string) {
  const response = await fetch("/api/agreserge-auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usuario, clave }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(payload?.error ?? "No se pudo iniciar sesión");
  return payload;
}

export async function remoteLogout() {
  await fetch("/api/agreserge-auth/logout", { method: "POST" });
}

export async function saveRemoteDB(db: unknown) {
  const response = await fetch("/api/agreserge-db", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ db }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(payload?.error ?? "No se pudo guardar en Supabase");
  return payload;
}

export async function uploadDocument(
  documentId: string,
  file: File,
  append = false,
  metadata: { name?: string; category?: string } = {},
) {
  const form = new FormData();
  form.append("documentId", documentId);
  form.append("file", file);
  form.append("append", String(append));
  form.append("documentName", metadata.name || "Documento");
  form.append("category", metadata.category || "General");
  const response = await fetch("/api/agreserge-documents", {
    method: "POST",
    body: form,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(payload?.error || "No se pudo cargar el documento");
  return payload;
}

export async function deleteDocument(documentId: string) {
  const response = await fetch(
    `/api/agreserge-documents/${encodeURIComponent(documentId)}`,
    { method: "DELETE" },
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(payload?.error || "No se pudo eliminar el documento");
  return payload;
}

export const reviewAffiliateDocuments = (userId: string) =>
  postJson("/api/agreserge-documents/review", { userId });

export async function saveOwnProfile(profile: unknown, user: unknown) {
  const response = await fetch("/api/agreserge-profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile, user }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      payload?.error || "No se pudo guardar el perfil sociodemográfico",
    );
  return payload;
}

export async function openRemoteDrivePeriod(input: {
  mes: string;
  anio: string;
  fechaLimite?: string;
  assignments: Array<{ anexo: number; responsableId: string }>;
}) {
  const response = await fetch("/api/agreserge-drive/open-period", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      payload?.error ?? "No se pudo crear el periodo en Google Drive",
    );
  return payload;
}

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(payload?.error || "La operación no pudo completarse");
  return payload;
}

export const lookupPayroll = (documento = "", mes = "", anio = "") =>
  postJson("/api/agreserge-payroll/lookup", { documento, mes, anio });
export async function loadPayrollPeriods() {
  const response = await fetch("/api/agreserge-payroll/periods", {
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      payload?.error || "No se pudo cargar el historial de nómina",
    );
  return payload;
}
export const openPayrollPeriod = (
  mes: string,
  anio: string,
  sheetUrl: string,
) => postJson("/api/agreserge-payroll/periods", { mes, anio, sheetUrl });
export async function loadPayrollReport() {
  const response = await fetch("/api/agreserge-payroll/report", {
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      payload?.error || "No se pudo generar el informe de nómina",
    );
  return payload;
}
export const askAgrebot = (
  message: string,
  history: Array<{ role: "user" | "assistant"; content: string }> = [],
) => postJson("/api/agrebot", { message, history });
export const createDigitalRequest = (tipo: string, datos: unknown) =>
  postJson("/api/agreserge-requests", { tipo, datos });
export async function decideDigitalRequest(
  id: string,
  action: string,
  comentario = "",
) {
  const response = await fetch("/api/agreserge-requests", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, action, comentario }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(payload?.error || "No se pudo actualizar la solicitud");
  return payload;
}
