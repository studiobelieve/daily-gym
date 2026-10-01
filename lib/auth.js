// Accesso con una sola password (APP_PASSWORD). Dopo il login il browser riceve un cookie
// firmato valido 180 giorni: su telefono e PC si fa il login una volta sola.
import crypto from 'node:crypto';

const DURATA_GIORNI = 180;
const NOME = 'dg_sessione';

let segreto = process.env.SESSION_SECRET;
if (!segreto) {
  // Senza SESSION_SECRET funziona lo stesso, ma a ogni riavvio del server bisogna rifare il login.
  segreto = crypto.randomBytes(32).toString('hex');
  console.warn('[auth] SESSION_SECRET non impostato: le sessioni scadono a ogni riavvio.');
}

const firma = (s) => crypto.createHmac('sha256', segreto).update(s).digest('base64url');

export function passwordConfigurata() {
  return Boolean(process.env.APP_PASSWORD);
}

export function passwordGiusta(tentativo) {
  if (!process.env.APP_PASSWORD) return false;
  const a = crypto.createHash('sha256').update(String(tentativo || '')).digest();
  const b = crypto.createHash('sha256').update(process.env.APP_PASSWORD).digest();
  return crypto.timingSafeEqual(a, b);
}

export function creaCookie(req) {
  const scade = Date.now() + DURATA_GIORNI * 86400000;
  const valore = `${scade}.${firma(String(scade))}`;
  return `${NOME}=${valore}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${DURATA_GIORNI * 86400}${https(req) ? '; Secure' : ''}`;
}

export function cancellaCookie(req) {
  return `${NOME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${https(req) ? '; Secure' : ''}`;
}

export function autenticato(req) {
  const cookie = req.headers.cookie || '';
  const m = cookie.match(new RegExp(`(?:^|;\\s*)${NOME}=([^;]+)`));
  if (!m) return false;
  const [scade, f] = m[1].split('.');
  if (!scade || !f) return false;
  const attesa = firma(scade);
  if (attesa.length !== f.length || !crypto.timingSafeEqual(Buffer.from(attesa), Buffer.from(f))) return false;
  return Number(scade) > Date.now();
}

function https(req) {
  return req.headers['x-forwarded-proto'] === 'https' || req.socket.encrypted;
}

// Freno ai tentativi di password: 10 errori ogni 15 minuti per indirizzo e, per sicurezza,
// 50 errori ogni 15 minuti in totale (se qualcuno cambiasse indirizzo a ogni tentativo).
const FINESTRA = 15 * 60000;
const tentativi = new Map();
let globali = [];
export function troppiTentativi(ip) {
  const ora = Date.now();
  globali = globali.filter((x) => ora - x < FINESTRA);
  for (const [k, v] of tentativi) {
    const f = v.filter((x) => ora - x < FINESTRA);
    if (f.length) tentativi.set(k, f); else tentativi.delete(k);
  }
  return (tentativi.get(ip) || []).length >= 10 || globali.length >= 50;
}
export function registraErrore(ip) {
  const t = tentativi.get(ip) || [];
  t.push(Date.now());
  tentativi.set(ip, t);
  globali.push(Date.now());
}
