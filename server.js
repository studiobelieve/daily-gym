// Daily Gym — server unico: serve l'app (cartella public/) e le API (/api/...).
// Avvio: `npm start`. Su Railway parte da solo a ogni push su GitHub.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { migra, pool } from './lib/db.js';
import { rotte } from './lib/api.js';
import { autenticato } from './lib/auth.js';

const qui = path.dirname(fileURLToPath(import.meta.url));
const PUBBLICA = path.join(qui, 'public');
const PORTA = parseInt(process.env.PORT || '3000', 10);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const SICUREZZA = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'microphone=(self), camera=()',
  'Content-Security-Policy':
    "default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self'; script-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
};

// Rotte con parametri (/api/carte/:id) compilate una volta.
const tabella = Object.entries(rotte).map(([chiave, fn]) => {
  const [metodo, schema] = chiave.split(' ');
  const nomi = [];
  const re = new RegExp('^' + schema.replace(/:(\w+)/g, (_, n) => { nomi.push(n); return '([^/]+)'; }) + '$');
  return { metodo, re, nomi, fn, pubblica: ['/api/stato', '/api/login', '/api/logout'].includes(schema) };
});

function trova(metodo, percorso) {
  for (const r of tabella) {
    if (r.metodo !== metodo) continue;
    const m = percorso.match(r.re);
    if (m) {
      try { return { ...r, params: Object.fromEntries(r.nomi.map((n, i) => [n, decodeURIComponent(m[i + 1])])) }; }
      catch { return null; }
    }
  }
  return null;
}

function leggiCorpo(req, limite) {
  return new Promise((ok, ko) => {
    const pezzi = [];
    let tot = 0;
    req.on('data', (c) => {
      tot += c.length;
      if (tot > limite) {
        const e = new Error('Richiesta troppo grande.');
        e.status = 413;
        ko(e);
        req.destroy();
      } else pezzi.push(c);
    });
    req.on('end', () => ok(Buffer.concat(pezzi)));
    req.on('error', ko);
  });
}

function json(res, status, dati) {
  const corpo = JSON.stringify(dati);
  res.writeHead(status, { ...SICUREZZA, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(corpo);
}

async function gestisciApi(req, res, url) {
  const rotta = trova(req.method, url.pathname);
  if (!rotta) return json(res, 404, { errore: 'Rotta non trovata.' });
  const auth = autenticato(req);
  if (!rotta.pubblica && !auth) return json(res, 401, { errore: 'Accesso richiesto.' });

  let body = {};
  let raw = null;
  if (req.method !== 'GET' && req.method !== 'DELETE') {
    const audio = url.pathname === '/api/voce/stt';
    const buf = await leggiCorpo(req, audio ? 15 * 1024 * 1024 : 512 * 1024);
    if (audio) raw = buf;
    else if (buf.length) {
      // Solo JSON: un form di un altro sito non può spedire application/json (difesa in più oltre a SameSite).
      if (!String(req.headers['content-type'] || '').includes('application/json')) return json(res, 415, { errore: 'Serve JSON.' });
      try { body = JSON.parse(buf.toString('utf8')); } catch { return json(res, 400, { errore: 'JSON non valido.' }); }
      if (!body || typeof body !== 'object') body = {};
    }
  }
  // Il proxy di Railway AGGIUNGE l'IP vero in fondo a X-Forwarded-For: i valori prima li può inventare il client.
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',').pop().trim();
  const out = await rotta.fn({
    req, res, body, raw, ip, params: rotta.params, query: Object.fromEntries(url.searchParams), autenticato: auth,
  });
  if (out && out._raw) {
    res.writeHead(200, { ...SICUREZZA, 'Content-Type': out.tipo, 'Cache-Control': 'no-store' });
    return res.end(out._raw);
  }
  return json(res, 200, out);
}

async function gestisciFile(req, res, url) {
  let rel;
  try { rel = decodeURIComponent(url.pathname); } catch { res.writeHead(400); return res.end(); }
  if (rel === '/' || !path.extname(rel)) rel = '/index.html'; // app a pagina singola
  const file = path.join(PUBBLICA, path.normalize(rel));
  if (!file.startsWith(PUBBLICA + path.sep)) { res.writeHead(403); return res.end(); }
  try {
    const dati = await fs.readFile(file);
    const ext = path.extname(file);
    res.writeHead(200, {
      ...SICUREZZA,
      'Content-Type': MIME[ext] || 'application/octet-stream',
      // Il service worker gestisce la cache: il server chiede sempre di rivalidare.
      'Cache-Control': 'no-cache',
    });
    res.end(req.method === 'HEAD' ? undefined : dati);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Non trovato');
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname === '/salute') { res.writeHead(200); return res.end('ok'); }
    if (url.pathname.startsWith('/api/')) return await gestisciApi(req, res, url);
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
    return await gestisciFile(req, res, url);
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) console.error(`[errore] ${req.method} ${url.pathname}:`, err.causa || err);
    if (!res.headersSent) json(res, status, { errore: status >= 500 && !err.status ? 'Errore interno del server.' : err.message });
    else res.end();
  }
});

async function avvia() {
  if (!process.env.DATABASE_URL) {
    console.error('Manca DATABASE_URL: aggiungi un database PostgreSQL al progetto su Railway.');
    process.exit(1);
  }
  await migra();
  server.listen(PORTA, () => console.log(`Daily Gym attivo sulla porta ${PORTA}`));
}

process.on('SIGTERM', () => server.close(() => pool.end().then(() => process.exit(0))));

avvia().catch((err) => {
  console.error('Avvio fallito:', err);
  process.exit(1);
});
