// Login mit Passwort + signiertem Cookie (90 Tage). Nur Nikita nutzt die App.
import { json, err, sign, safeEqual, hashPassword, getSetting, setSetting } from './util.js';

const COOKIE = 'nmy_s';
const MAX_AGE = 60 * 60 * 24 * 90;

export async function isAuthed(request, env) {
  const cookie = request.headers.get('cookie') || '';
  const m = cookie.match(new RegExp(`${COOKIE}=([^;]+)`));
  if (!m) return false;
  const [exp, sig] = decodeURIComponent(m[1]).split('.');
  if (!exp || !sig || Date.now() / 1000 > +exp) return false;
  return safeEqual(sig, await sign(env.SESSION_SECRET, 'session:' + exp));
}

async function checkPassword(env, password) {
  const stored = await getSetting(env, 'password_hash');
  if (stored) {
    const [salt, hash] = stored.split(':');
    return safeEqual((await hashPassword(password, salt)).hash, hash);
  }
  return !!env.APP_PASSWORD && safeEqual(password, env.APP_PASSWORD);
}

export async function login(request, env) {
  const { password = '' } = await request.json().catch(() => ({}));
  // kleine Bremse gegen Durchprobieren
  await new Promise(r => setTimeout(r, 400));
  if (!(await checkPassword(env, password))) return err('Passwort falsch', 401);
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const value = `${exp}.${await sign(env.SESSION_SECRET, 'session:' + exp)}`;
  return json({ ok: true }, 200, {
    'set-cookie': `${COOKIE}=${encodeURIComponent(value)}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Lax`,
  });
}

export function logout() {
  return json({ ok: true }, 200, { 'set-cookie': `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax` });
}

export async function changePassword(request, env) {
  const { current = '', next = '' } = await request.json().catch(() => ({}));
  if (!(await checkPassword(env, current))) return err('Aktuelles Passwort falsch', 401);
  if (next.length < 10) return err('Neues Passwort: mindestens 10 Zeichen');
  const { salt, hash } = await hashPassword(next);
  await setSetting(env, 'password_hash', `${salt}:${hash}`);
  return json({ ok: true });
}
