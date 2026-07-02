import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'agreserge_session';
const MAX_AGE = 60 * 60 * 24 * 7;

function secret() {
  const value = process.env.APP_SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error('Falta configurar en Vercel: APP_SESSION_SECRET debe tener minimo 32 caracteres');
  }
  return value;
}

export function hashPassword(password: string) {
  return createHmac('sha256', secret()).update(password).digest('hex');
}

function sign(payload: string) {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

function createToken(userId: string) {
  const payload = Buffer.from(JSON.stringify({ userId, exp: Date.now() + MAX_AGE * 1000 })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function parseToken(token?: string) {
  if (!token) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const valid =
    expected.length === signature.length &&
    timingSafeEqual(Buffer.from(expected), Buffer.from(signature));

  if (!valid) return null;

  const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  if (!parsed?.userId || parsed.exp < Date.now()) return null;
  return parsed as { userId: string; exp: number };
}

export async function setSessionCookie(userId: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, createToken(userId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}

export async function getSessionUserId() {
  const store = await cookies();
  return parseToken(store.get(COOKIE_NAME)?.value)?.userId ?? null;
}
