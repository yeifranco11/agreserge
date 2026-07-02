export async function remoteLogin(correo: string, clave: string) {
  const response = await fetch('/api/agreserge-auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo, clave }),
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
