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

// Se il database manca o non risponde, l'app NON va in crash: mostra una pagina che spiega
// cosa sistemare su Railway e riprova da sola a collegarsi ogni 10 secondi.
function paginaConfigurazione(motivo) {
  const html = `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Daily Gym · configurazione</title><style>body{font:16px/1.6 system-ui,sans-serif;background:#111110;color:#fff;margin:0;padding:24px}
main{max-width:560px;margin:8vh auto}code{background:#242422;padding:2px 6px;border-radius:6px}.m{color:#c3c2b7}</style></head>
<body><main><h1>Daily Gym è quasi pronta</h1><p><strong>${motivo}</strong></p>
<p>Su Railway, nello stesso progetto:</p><ol>
<li><strong>+ Create</strong> → <strong>Database</strong> → <strong>PostgreSQL</strong>.</li>
<li>Servizio <strong>daily-gym</strong> → <strong>Variables</strong> → nuova variabile <code>DATABASE_URL</code> con valore <code>\${{Postgres.DATABASE_URL}}</code>.</li>
</ol><p class="m">Railway riavvia l'app da solo. Questa pagina si aggiorna ogni 15 secondi.</p></main>
<script>setTimeout(()=>location.reload(),15000)</script></body></html>`;
  return http.createServer((req, res) => {
    if (req.url === '/salute') { res.writeHead(200); return res.end('in attesa del database'); }
    res.writeHead(503, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Retry-After': '15' });
    res.end(html);
  });
}

async function avvia() {
  if (!process.env.DATABASE_URL) {
    console.error('Manca DATABASE_URL: aggiungi un database PostgreSQL al progetto su Railway.');
    paginaConfigurazione('Manca il database (variabile DATABASE_URL).').listen(PORTA, () => console.log(`Pagina di configurazione sulla porta ${PORTA}`));
    return;
  }
  let attesa = null;
  for (;;) {
    try {
      await migra();
      break;
    } catch (err) {
      console.error('Database non raggiungibile, riprovo tra 10 secondi:', err.message);
      if (!attesa) attesa = paginaConfigurazione('Il database non risponde ancora: ' + String(err.message).replace(/[<>&]/g, '')).listen(PORTA);
      await new Promise((r) => setTimeout(r, 10000));
    }
  }
  if (attesa) await new Promise((r) => attesa.close(r));
  server.listen(PORTA, () => console.log(`Daily Gym attivo sulla porta ${PORTA}`));
}

process.on('SIGTERM', () => server.close(() => pool.end().then(() => process.exit(0))));

avvia().catch((err) => {
  console.error('Avvio fallito:', err);
  process.exit(1);
});
