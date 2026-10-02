// Tutte le rotte /api. Ogni handler riceve (ctx) e restituisce un oggetto (diventa JSON)
// oppure { _raw: Buffer, tipo } per l'audio. Gli errori con .status diventano risposte HTTP.
import { q, uno, tutti, pool, leggiImpostazione, scriviImpostazione } from './db.js';
import { pianifica, serie } from './srs.js';
import { valutaLivello, TIPI_INGLESE } from './livello.js';
import { chiedi, aiDisponibile, modelloAttivo, MODELLI } from './ai.js';
import { voceDisponibile, trascrivi, sintetizza, agenteVocale } from './voce.js';
import { LEZIONI } from './libri.js';
import { scegliSituazione } from './writing.js';
import { CATEGORIE, CATEGORIA_LIBERA, CATEGORIE_STORICHE, verificaTitoli, prossimoArgomento, estrattoWikipedia, cercaArgomento, argomentiCollegati } from './cultura.js';
import * as P from './prompt.js';
import { valoriMetriche, progressi, riepilogo, livelloAttuale, giorniSessione } from './statistiche.js';
import { METRICHE, avanzamento, suggerimenti } from '../public/js/shared/obiettivi.js';
import { scenario as trovaScenario } from '../public/js/shared/scenari.js';
import {
  LIVELLI, indiceLivello, livelloDaIndice, campiErrore, confronta, parseTag, primo, tuttiTag, voci, campi, numero, aggiungiGiorni, giornoSettimana,
} from '../public/js/shared/testo.js';
import { passwordGiusta, passwordConfigurata, creaCookie, cancellaCookie, troppiTentativi, registraErrore } from './auth.js';

// ---------- utilità di validazione ----------

function errore(msg, status = 400) {
  const e = new Error(msg);
  e.status = status;
  return e;
}

const GIORNO = /^\d{4}-\d{2}-\d{2}$/;
function giorno(v) {
  if (typeof v !== 'string' || !GIORNO.test(v)) throw errore('giorno mancante o non valido (YYYY-MM-DD)');
  const d = new Date(v + 'T00:00:00Z');
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) throw errore('data inesistente: ' + v);
  return v;
}
function testo(v, max = 2000, obbligatorio = false) {
  const s = typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim();
  if (obbligatorio && !s) throw errore('campo obbligatorio mancante');
  if (s.length > max) throw errore(`testo troppo lungo (massimo ${max} caratteri)`);
  return s;
}
function intero(v, min, max, predefinito) {
  const n = Number.isFinite(Number(v)) ? Math.round(Number(v)) : predefinito;
  if (n == null) throw errore('numero non valido');
  return Math.max(min, Math.min(max, n));
}
const TIPI_CARTA = ['en', 'persona', 'ricorda', 'cultura'];
const TIPI_ATTIVITA = ['span', 'palazzo', 'nomi', 'writing', 'dettato', 'speaking', 'cultura', 'test', 'lacune', 'ripasso'];

function cartaPubblica(c) {
  return {
    id: c.id, tipo: c.tipo, fronte: c.fronte, retro: c.retro, nota: c.nota, extra: c.extra,
    scadenza: c.scadenza, intervallo: c.intervallo, ripetizioni: c.ripetizioni, errori: c.errori,
    creata: c.creata,
  };
}

async function profilo() {
  return {
    livello: await livelloAttuale(),
    lavoro: await leggiImpostazione('lavoro', 'lavora in un\'agenzia di marketing e comunicazione a Napoli'),
  };
}

// ---------- rotte ----------

export const rotte = {
  // ----- accesso -----
  'GET /api/stato': async ({ autenticato }) => ({
    autenticato,
    passwordConfigurata: passwordConfigurata(),
    ai: aiDisponibile(),
    voce: voceDisponibile(),
  }),

  'POST /api/login': async ({ body, req, res, ip }) => {
    if (!passwordConfigurata()) throw errore('APP_PASSWORD non impostata su Railway.', 503);
    if (troppiTentativi(ip)) throw errore('Troppi tentativi. Riprova tra 15 minuti.', 429);
    if (!passwordGiusta(body.password)) {
      registraErrore(ip);
      throw errore('Password sbagliata.', 401);
    }
    res.setHeader('Set-Cookie', creaCookie(req));
    return { ok: true };
  },

  'POST /api/logout': async ({ req, res }) => {
    res.setHeader('Set-Cookie', cancellaCookie(req));
    return { ok: true };
  },

  // ----- home -----
  'GET /api/oggi': async ({ query }) => {
    const g = giorno(query.giorno);
    const [due, nuove, sessione, pillola, testFatto, livello, giorni] = await Promise.all([
      uno('SELECT count(*)::int AS n FROM carte WHERE intervallo > 0 AND scadenza <= $1', [g]),
      uno('SELECT count(*)::int AS n FROM carte WHERE intervallo = 0', []),
      uno('SELECT tipo, durata FROM sessioni WHERE giorno = $1', [g]),
      uno('SELECT id, titolo, completata FROM pillole WHERE giorno = $1 ORDER BY id DESC LIMIT 1', [g]),
      uno(`SELECT count(*)::int AS n FROM attivita WHERE tipo = 'test'`),
      livelloAttuale(),
      giorniSessione(),
    ]);
    const fatte = await tutti('SELECT DISTINCT tipo FROM attivita WHERE giorno = $1', [g]);
    const lacune = await uno('SELECT coalesce(sum(volte), 0)::int AS n FROM errori WHERE NOT risolto');
    const ripassatiOggi = await uno('SELECT count(*)::int AS n FROM ripassi WHERE giorno = $1', [g]);
    const obiettivi = await obiettiviCalcolati(g);
    return {
      livello,
      serie: serie(giorni, g),
      sessione,
      daRipassare: due.n,
      lacune: lacune.n,
      fatteOggi: fatte.map((r) => r.tipo).concat(ripassatiOggi.n > 0 && due.n === 0 ? ['ripasso'] : []),
      nuoveDisponibili: nuove.n,
      pillola,
      testFatto: testFatto.n > 0,
      obiettivi: obiettivi.filter((o) => !o.archiviato && o.avanzamento.stato !== 'raggiunto').slice(0, 3),
      ai: aiDisponibile(),
      voce: voceDisponibile(),
    };
  },

  // ----- ripetizione dilazionata -----
  'GET /api/ripasso': async ({ query }) => {
    const g = giorno(query.giorno);
    const tipo = TIPI_CARTA.includes(query.tipo) ? query.tipo : null;
    const nuoveMax = intero(await leggiImpostazione('nuove_al_giorno', 10), 0, 50, 10);
    // Carte nuove già introdotte oggi (il primo ripasso è di oggi): non superare il limite giornaliero.
    const giaIntrodotte = await uno(
      `SELECT count(*)::int AS n FROM (SELECT carta, min(giorno) AS primo FROM ripassi WHERE carta IS NOT NULL GROUP BY carta) t WHERE primo = $1`,
      [g]
    );
    const limite = intero(query.limite, 1, 200, 200);
    if (query.difficili) {
      // Allenamento extra sulle carte che sbagli più spesso, anche se non sono in scadenza.
      const difficili = await tutti(
        `SELECT * FROM carte WHERE errori >= 2 AND intervallo > 0 ORDER BY errori DESC, random() LIMIT $1`, [Math.min(limite, 15)]);
      return { carte: difficili.map(cartaPubblica) };
    }
    const scadute = await tutti(
      `SELECT * FROM carte WHERE intervallo > 0 AND scadenza <= $1 AND ($2::text IS NULL OR tipo = $2)
       ORDER BY scadenza, random() LIMIT 80`,
      [g, tipo]
    );
    const quante = Math.max(0, nuoveMax - giaIntrodotte.n);
    const nuove = quante
      ? await tutti(
        `SELECT * FROM carte WHERE intervallo = 0 AND ($2::text IS NULL OR tipo = $2) ORDER BY creata LIMIT $1`,
        [quante, tipo]
      )
      : [];
    return { carte: [...scadute, ...nuove].slice(0, limite).map(cartaPubblica) };
  },

  'POST /api/ripasso': async ({ body }) => {
    const g = giorno(body.giorno);
    const id = intero(body.id, 1, 2e9);
    const voto = intero(body.voto, 0, 5);
    const c = await uno('SELECT * FROM carte WHERE id = $1', [id]);
    if (!c) throw errore('carta non trovata', 404);
    const nuovo = pianifica(c, voto, g);
    await q(
      `UPDATE carte SET intervallo = $2, facilita = $3, ripetizioni = $4, errori = $5, scadenza = $6 WHERE id = $1`,
      [id, nuovo.intervallo, nuovo.facilita, nuovo.ripetizioni, nuovo.errori, nuovo.scadenza]
    );
    await q('INSERT INTO ripassi (carta, tipo, voto, giorno) VALUES ($1, $2, $3, $4)', [id, c.tipo, voto, g]);
    return { ok: true, scadenza: nuovo.scadenza, intervallo: nuovo.intervallo };
  },

  // ----- carte -----
  'GET /api/carte': async ({ query }) => {
    const cond = [];
    const par = [];
    if (TIPI_CARTA.includes(query.tipo)) { par.push(query.tipo); cond.push(`tipo = $${par.length}`); }
    if (query.cerca) {
      par.push('%' + String(query.cerca).slice(0, 100) + '%');
      cond.push(`(fronte ILIKE $${par.length} OR retro ILIKE $${par.length} OR nota ILIKE $${par.length})`);
    }
    const righe = await tutti(
      `SELECT * FROM carte ${cond.length ? 'WHERE ' + cond.join(' AND ') : ''} ORDER BY creata DESC LIMIT 1000`, par
    );
    return { carte: righe.map(cartaPubblica) };
  },

  'POST /api/carte': async ({ body }) => {
    const id = await creaCarta(body, giorno(body.giorno));
    return { ok: true, id };
  },

  'POST /api/carte/multi': async ({ body }) => {
    const g = giorno(body.giorno);
    const lista = Array.isArray(body.carte) ? body.carte : [];
    if (lista.length > 200) throw errore('Massimo 200 carte alla volta.');
    lista.forEach((c, i) => {
      try { validaCarta(c); } catch (e) { throw errore(`Riga ${i + 1}: ${e.message}`); }
    });
    // Tutte o nessuna: se una fallisce non restano carte a metà (che poi si duplicherebbero riprovando).
    const client = await pool.connect();
    const ids = [];
    try {
      await client.query('BEGIN');
      for (const c of lista) ids.push(await creaCarta(c, g, client));
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
    return { ok: true, ids };
  },

  'PUT /api/carte/:id': async ({ params, body }) => {
    const c = await uno('SELECT * FROM carte WHERE id = $1', [intero(params.id, 1, 2e9)]);
    if (!c) throw errore('carta non trovata', 404);
    await q('UPDATE carte SET fronte = $2, retro = $3, nota = $4, extra = $5 WHERE id = $1', [
      c.id,
      body.fronte !== undefined ? testo(body.fronte, 500, true) : c.fronte,
      body.retro !== undefined ? testo(body.retro, 2000) : c.retro,
      body.nota !== undefined ? testo(body.nota, 2000) : c.nota,
      JSON.stringify(body.extra && typeof body.extra === 'object' ? body.extra : c.extra),
    ]);
    if (body.ricomincia) {
      await q('UPDATE carte SET ripetizioni = 0, intervallo = 0, facilita = 2.5, scadenza = CURRENT_DATE WHERE id = $1', [c.id]);
    }
    return { ok: true };
  },

  'DELETE /api/carte/:id': async ({ params }) => {
    await q('DELETE FROM carte WHERE id = $1', [intero(params.id, 1, 2e9)]);
    return { ok: true };
  },

  // ----- esercizi e sessioni -----
  'POST /api/attivita': async ({ body }) => {
    const g = giorno(body.giorno);
    if (!TIPI_ATTIVITA.includes(body.tipo)) throw errore('tipo di attività non valido');
    const punteggio = Math.max(0, Math.min(100, Number(body.punteggio) || 0));
    const valore = body.valore == null ? null : Number(body.valore);
    const durata = intero(body.durata, 0, 7200, 0);
    const dettagli = body.dettagli && typeof body.dettagli === 'object' ? body.dettagli : {};
    if (JSON.stringify(dettagli).length > 50000) throw errore('dettagli troppo grandi');
    // Record battuto? Lo si calcola prima di salvare.
    let record = false;
    if (valore != null && (body.tipo === 'span' || (body.tipo === 'palazzo' && punteggio >= 100))) {
      const r = await uno(
        `SELECT coalesce(max(valore), 0) AS v FROM attivita WHERE tipo = $1 ${body.tipo === 'palazzo' ? 'AND punteggio >= 100' : ''}`,
        [body.tipo]
      );
      record = valore > Number(r.v);
    }
    await q('INSERT INTO attivita (tipo, giorno, punteggio, valore, durata, dettagli) VALUES ($1, $2, $3, $4, $5, $6)', [
      body.tipo, g, punteggio, valore, durata, JSON.stringify(dettagli),
    ]);
    const livello = TIPI_INGLESE.includes(body.tipo) ? await aggiornaLivello(g) : null;
    return { ok: true, record, livello };
  },

  'POST /api/sessione': async ({ body }) => {
    const g = giorno(body.giorno);
    const tipo = ['completa', 'infinita'].includes(body.tipo) ? body.tipo : 'corta';
    await q(
      `INSERT INTO sessioni (giorno, tipo, durata) VALUES ($1, $2, $3)
       ON CONFLICT (giorno) DO UPDATE SET
         tipo = CASE WHEN EXCLUDED.tipo = 'corta' THEN sessioni.tipo ELSE EXCLUDED.tipo END,
         durata = sessioni.durata + EXCLUDED.durata`,
      [g, tipo, intero(body.durata, 0, 14400, 0)]
    );
    const giorni = await giorniSessione();
    return { ok: true, serie: serie(giorni, g) };
  },

  // ----- tracking -----
  'GET /api/progressi': async ({ query }) => {
    const g = giorno(query.giorno);
    const dati = await progressi(g);
    const stato = await statoLivello(g);
    return { ...dati, statoLivello: stato };
  },

  'GET /api/riepilogo': async ({ query }) => riepilogo(giorno(query.giorno)),

  // ----- obiettivi -----
  'GET /api/obiettivi': async ({ query }) => {
    const g = giorno(query.giorno);
    const valori = await valoriMetriche(g);
    return {
      obiettivi: await obiettiviCalcolati(g, valori),
      valori,
      suggerimenti: suggerimenti(valori, g, aggiungiGiorni),
    };
  },

  'POST /api/obiettivi': async ({ body }) => {
    const g = giorno(body.giorno);
    if (!METRICHE[body.metrica]) throw errore('metrica non valida');
    const scadenza = giorno(body.scadenza);
    if (scadenza <= g) throw errore('la scadenza deve essere nel futuro');
    const target = Number(body.target);
    if (!Number.isFinite(target)) throw errore('obiettivo numerico mancante');
    const valori = await valoriMetriche(g);
    const iniziale = body.metrica === 'manuale' ? 0 : valori[body.metrica] ?? 0;
    if (body.metrica !== 'manuale' && target <= iniziale) {
      throw errore(`Il valore di partenza è già ${iniziale}: scegli un obiettivo più alto.`);
    }
    const r = await uno(
      `INSERT INTO obiettivi (metrica, titolo, target, iniziale, inizio, scadenza) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [body.metrica, testo(body.titolo, 120, true), target, iniziale, g, scadenza]
    );
    return { ok: true, id: r.id };
  },

  'PUT /api/obiettivi/:id': async ({ params, body }) => {
    const o = await uno('SELECT * FROM obiettivi WHERE id = $1', [intero(params.id, 1, 2e9)]);
    if (!o) throw errore('obiettivo non trovato', 404);
    await q(
      `UPDATE obiettivi SET titolo = $2, target = $3, scadenza = $4, manuale = $5, archiviato = $6 WHERE id = $1`,
      [
        o.id,
        body.titolo !== undefined ? testo(body.titolo, 120, true) : o.titolo,
        body.target !== undefined && Number.isFinite(Number(body.target)) ? Number(body.target) : o.target,
        body.scadenza !== undefined ? giorno(body.scadenza) : o.scadenza,
        body.manuale !== undefined && Number.isFinite(Number(body.manuale)) ? Number(body.manuale) : o.manuale,
        body.archiviato !== undefined ? Boolean(body.archiviato) : o.archiviato,
      ]
    );
    return { ok: true };
  },

  'DELETE /api/obiettivi/:id': async ({ params }) => {
    await q('DELETE FROM obiettivi WHERE id = $1', [intero(params.id, 1, 2e9)]);
    return { ok: true };
  },

  // ----- impostazioni e livello -----
  'GET /api/impostazioni': async () => ({
    livello: await livelloAttuale(),
    livelli: LIVELLI,
    modello: await modelloAttivo(),
    modelli: MODELLI,
    nuove_al_giorno: await leggiImpostazione('nuove_al_giorno', 10),
    lavoro: await leggiImpostazione('lavoro', 'lavora in un\'agenzia di marketing e comunicazione a Napoli'),
    oggetti_inglese: await leggiImpostazione('oggetti_inglese', false),
    livello_pillole: await livelloPillola(),
    ai: aiDisponibile(),
    voce: voceDisponibile(),
  }),

  'PUT /api/impostazioni': async ({ body }) => {
    if (body.modello !== undefined) {
      if (!MODELLI[body.modello]) throw errore('modello non valido');
      await scriviImpostazione('modello_ai', body.modello);
    }
    if (body.nuove_al_giorno !== undefined) await scriviImpostazione('nuove_al_giorno', intero(body.nuove_al_giorno, 0, 50, 10));
    if (body.lavoro !== undefined) await scriviImpostazione('lavoro', testo(body.lavoro, 300));
    if (body.oggetti_inglese !== undefined) await scriviImpostazione('oggetti_inglese', Boolean(body.oggetti_inglese));
    return { ok: true };
  },

  'POST /api/livello': async ({ body }) => {
    const g = giorno(body.giorno);
    if (!LIVELLI.includes(body.livello)) throw errore('livello non valido');
    await impostaLivello(body.livello, g, testo(body.motivo, 200) || 'impostato a mano');
    return { ok: true };
  },

  // ----- palazzo della memoria -----
  'GET /api/percorsi': async () => ({ percorsi: await tutti('SELECT * FROM percorsi ORDER BY id') }),

  'POST /api/percorsi': async ({ body }) => {
    const luoghi = pulisciLuoghi(body.luoghi);
    const r = await uno('INSERT INTO percorsi (nome, luoghi) VALUES ($1, $2) RETURNING id', [
      testo(body.nome, 80, true), JSON.stringify(luoghi),
    ]);
    return { ok: true, id: r.id };
  },

  'PUT /api/percorsi/:id': async ({ params, body }) => {
    await q('UPDATE percorsi SET nome = $2, luoghi = $3 WHERE id = $1', [
      intero(params.id, 1, 2e9), testo(body.nome, 80, true), JSON.stringify(pulisciLuoghi(body.luoghi)),
    ]);
    return { ok: true };
  },

  'DELETE /api/percorsi/:id': async ({ params }) => {
    await q('DELETE FROM percorsi WHERE id = $1', [intero(params.id, 1, 2e9)]);
    return { ok: true };
  },

  // ----- writing -----
  'POST /api/writing/consegna': async ({ body }) => {
    const g = giorno(body.giorno);
    // Tema alternato: conta i writing già fatti oggi (così nell'allenamento infinito non è sempre lo stesso).
    const fattiOggi = (await uno(`SELECT count(*)::int AS n FROM attivita WHERE tipo = 'writing' AND giorno = $1`, [g])).n;
    const tema = body.tema === 'lavoro' || body.tema === 'cultura' ? body.tema : ((giornoSettimana(g) + fattiOggi) % 2 ? 'lavoro' : 'cultura');
    // Situazione a rotazione: niente ripetizioni finché non sono passate quasi tutte le altre.
    const chiave = 'writing_recenti_' + tema;
    const salvati = await leggiImpostazione(chiave, []);
    const recenti = Array.isArray(salvati) ? salvati.filter(Number.isInteger) : [];
    const scelta = scegliSituazione(tema, recenti);
    await scriviImpostazione(chiave, [scelta.indice, ...recenti].slice(0, 60));
    const lacune = (await tutti(`SELECT categoria FROM errori WHERE NOT risolto AND categoria <> 'altro' GROUP BY categoria ORDER BY sum(volte) DESC LIMIT 3`)).map((r) => r.categoria);
    const { sistema, messaggi } = P.promptConsegnaWriting(await profilo(), tema, { ...scelta, lacune });
    const tags = parseTag(await chiedi({ sistema, messaggi, uso: 'writing-consegna', maxTokens: 1500 }));
    const consegna = primo(tags, 'CONSEGNA');
    if (!consegna) throw errore('L\'AI non ha prodotto una consegna valida. Riprova.', 502);
    return {
      tema,
      titolo: primo(tags, 'TITOLO') || 'Writing',
      consegna,
      aiuto: primo(tags, 'AIUTO'),
      parole: voci(tags, 'PAROLA').map((p) => { const [en, it] = campi(p); return { en, it }; }).filter((p) => p.en),
    };
  },

  'POST /api/writing/correggi': async ({ body }) => {
    const consegna = testo(body.consegna, 1000, true);
    const scritto = testo(body.testo, 3000, true);
    const { sistema, messaggi } = P.promptCorrezioneWriting(await profilo(), consegna, scritto);
    const tags = parseTag(await chiedi({ sistema, messaggi, uso: 'writing-correzione', maxTokens: 3000, sforzo: 'medium' }));
    const voto = numero(primo(tags, 'VOTO'));
    if (voto == null) throw errore('Correzione non valida. Riprova.', 502);
    const errori = voci(tags, 'ERRORE').map(campiErrore).filter((e) => e.sbagliato && e.giusto);
    if (GIORNO.test(body.giorno || '')) await salvaErrori('writing', errori, giorno(body.giorno));
    return {
      voto,
      corretto: primo(tags, 'CORRETTO'),
      errori,
      bravo: primo(tags, 'BRAVO'),
      consiglio: primo(tags, 'CONSIGLIO'),
      naturale: primo(tags, 'VERSIONE_NATURALE'),
    };
  },

  // ----- dettato -----
  'POST /api/dettato': async ({ body }) => {
    giorno(body.giorno);
    // Il dettato usa anche parole che stai studiando: così le senti pronunciate in contesto.
    const mie = await tutti(`SELECT fronte FROM carte WHERE tipo = 'en' ORDER BY random() LIMIT 4`);
    const temi = ['a day at work in a marketing agency', 'travel and holidays', 'food and cooking', 'health and sport',
      'technology in everyday life', 'a famous story from history', 'friends and family', 'city life in Naples'];
    const tema = temi[Math.floor(Math.random() * temi.length)] +
      (mie.length ? `. If natural, use some of these words: ${mie.map((m) => m.fronte).join(', ')}` : '');
    const { sistema, messaggi } = P.promptDettato(await profilo(), tema);
    const tags = parseTag(await chiedi({ sistema, messaggi, uso: 'dettato', maxTokens: 1500 }));
    const frasi = voci(tags, 'FRASE', '||').map((f) => { const [en, , it] = campi(f); return { en, it }; })
      .filter((f) => f.en && f.en.split(' ').length >= 3).slice(0, 5);
    if (frasi.length < 3) throw errore('Frasi del dettato non valide. Riprova.', 502);
    return { frasi };
  },

  // ----- cultura -----
  'GET /api/pillola': async ({ query }) => {
    const g = giorno(query.giorno);
    const p = await uno('SELECT * FROM pillole WHERE giorno = $1 ORDER BY id DESC LIMIT 1', [g]);
    return { pillola: p };
  },

  'GET /api/pillole': async () => ({
    pillole: await tutti('SELECT id, giorno, categoria, argomento, titolo, fonte_url, livello, completata FROM pillole ORDER BY id DESC LIMIT 300'),
    categorie: { ...CATEGORIE_STORICHE, ...Object.fromEntries(Object.entries(CATEGORIE).map(([k, v]) => [k, v.nome])), libero: CATEGORIA_LIBERA.nome },
  }),

  // Manutenzione: controlla che i titoli delle liste esistano su Wikipedia.
  'GET /api/cultura/verifica': async () => verificaTitoli(),

  'GET /api/pillole/:id': async ({ params }) => {
    const p = await uno('SELECT * FROM pillole WHERE id = $1', [intero(params.id, 1, 2e9)]);
    if (!p) throw errore('pillola non trovata', 404);
    return { pillola: p };
  },

  'POST /api/pillola': async ({ body }) => {
    const g = giorno(body.giorno);
    if (!body.nuova) {
      const esiste = await uno('SELECT * FROM pillole WHERE giorno = $1 ORDER BY id DESC LIMIT 1', [g]);
      if (esiste) return { pillola: esiste };
    }
    return { pillola: await creaPillola(g, { categoria: body.categoria, argomento: testo(body.argomento, 80) }) };
  },

  // Il tuo giudizio sul testo sposta di mezzo livello le pillole successive.
  'POST /api/pillole/:id/difficolta': async ({ params, body }) => {
    const p = await uno('SELECT id, difficolta FROM pillole WHERE id = $1', [intero(params.id, 1, 2e9)]);
    if (!p) throw errore('pillola non trovata', 404);
    const valore = intero(body.valore, -1, 1);
    let offset = intero(await leggiImpostazione('cultura_offset', 0), -3, 3, 0);
    // Si conta un solo giudizio per pillola: cambiarlo annulla quello di prima.
    if (p.difficolta != null) offset += p.difficolta;
    offset = Math.max(-3, Math.min(3, offset - valore));
    await scriviImpostazione('cultura_offset', offset);
    await q('UPDATE pillole SET difficolta = $2 WHERE id = $1', [p.id, valore]);
    return { ok: true, offset, prossimoLivello: await livelloPillola() };
  },

  'POST /api/traduci': async ({ body }) => {
    const t = testo(body.testo, 120, true);
    const frase = testo(body.frase, 600);
    const chiave = (t + '\u0000' + frase).toLowerCase();
    let r = cacheTraduzioni.get(chiave);
    if (!r) {
      const { sistema, messaggi } = P.promptTraduci(t, frase);
      const tags = parseTag(await chiedi({ sistema, messaggi, uso: 'traduci', maxTokens: 400, sforzo: 'low' }));
      r = { traduzione: primo(tags, 'TRADUZIONE'), base: primo(tags, 'BASE').replace(/^["']|["']$/g, ''), nota: primo(tags, 'NOTA') };
      if (!r.traduzione) throw errore('Traduzione non riuscita. Riprova.', 502);
      cacheTraduzioni.set(chiave, r);
      if (cacheTraduzioni.size > 500) cacheTraduzioni.delete(cacheTraduzioni.keys().next().value);
    }
    const esistente = await uno(
      `SELECT id, fronte FROM carte WHERE tipo = 'en' AND (lower(fronte) = lower($1) OR ($2 <> '' AND lower(fronte) = lower($2))) LIMIT 1`,
      [t, r.base || '']
    );
    return { ...r, esistente };
  },

  'POST /api/pillole/:id/completa': async ({ params, body }) => {
    const g = giorno(body.giorno);
    const p = await uno('SELECT * FROM pillole WHERE id = $1', [intero(params.id, 1, 2e9)]);
    if (!p) throw errore('pillola non trovata', 404);
    const punteggio = Math.max(0, Math.min(100, Number(body.punteggio) || 0));
    if (!p.completata) {
      await q('UPDATE pillole SET completata = true WHERE id = $1', [p.id]);
      // Le domande diventano carte di cultura: così i fatti restano, non solo per un giorno.
      for (const d of p.domande) {
        await creaCarta({ tipo: 'cultura', fronte: d.domanda, retro: d.risposta, nota: p.titolo, extra: { pillola: p.id, fonte: p.fonte_url } }, g);
      }
      const daRicordare = (p.glossario.find((x) => x.daRicordare) || {}).it;
      if (daRicordare) {
        await creaCarta({ tipo: 'cultura', fronte: `Il fatto chiave di "${p.titolo}"?`, retro: daRicordare, extra: { pillola: p.id } }, g);
      }
    }
    // Rifare un quiz già fatto è un ripasso: non conta per il livello né per la sessione del giorno.
    if (p.completata) return { ok: true, livello: null, ripetuto: true };
    await q('INSERT INTO attivita (tipo, giorno, punteggio, durata, dettagli) VALUES ($1, $2, $3, $4, $5)', [
      'cultura', g, punteggio, intero(body.durata, 0, 3600, 0), JSON.stringify({ pillola: p.id, titolo: p.titolo }),
    ]);
    const livello = await aggiornaLivello(g);
    return { ok: true, livello };
  },

  // ----- speaking -----
  'POST /api/speaking/turno': async ({ body }) => {
    const sc = trovaScenario(body.scenario);
    if (!sc) throw errore('scenario non valido');
    const storia = pulisciStoria(body.storia);
    const contesto = sc.id === 'pillola' ? await contestoPillola(body.pillolaId) : '';
    if (!storia.length) {
      // Apertura: frase fissa (o costruita sulla pillola), niente chiamata AI.
      if (sc.apertura) return { risposta: sc.apertura };
      const p = body.pillolaId ? await uno('SELECT titolo FROM pillole WHERE id = $1', [intero(body.pillolaId, 1, 2e9)]) : null;
      return { risposta: p ? `Hello! Today we read about "${p.titolo}". What do you remember about it?` : 'Hello! What did you learn recently that surprised you?' };
    }
    // Conversazione senza fine: al modello arrivano solo gli ultimi 40 turni.
    storia.splice(0, Math.max(0, storia.length - 40));
    const { sistema } = P.promptTurnoSpeaking(await profilo(), sc, contesto);
    const messaggi = storiaInMessaggi(sc, storia);
    const risposta = await chiedi({ sistema, messaggi, uso: 'speaking', maxTokens: 600, sforzo: 'low' });
    return { risposta: risposta.replace(/[*_#]/g, '') };
  },

  'POST /api/speaking/report': async ({ body }) => {
    const sc = trovaScenario(body.scenario);
    if (!sc) throw errore('scenario non valido');
    const storia = pulisciStoria(body.storia, 600);
    if (!storia.some((t) => t.ruolo === 'io')) throw errore('Non hai ancora detto niente: nessun report da fare.');
    // Conversazioni lunghe (l'agente vocale non ha limite): si tengono gli ultimi ~16.000 caratteri.
    let trascrizione = storia.map((t) => `${t.ruolo === 'io' ? 'LEARNER' : 'PARTNER'}: ${t.testo}`).join('\n');
    if (trascrizione.length > 16000) trascrizione = '[...]\n' + trascrizione.slice(-16000);
    const { sistema, messaggi } = P.promptReportSpeaking(await profilo(), sc, trascrizione);
    const tags = parseTag(await chiedi({ sistema, messaggi, uso: 'speaking-report', maxTokens: 2500, sforzo: 'medium' }));
    const voto = numero(primo(tags, 'VOTO'));
    if (voto == null) throw errore('Report non valido. Riprova.', 502);
    const errori = voci(tags, 'ERRORE').map(campiErrore).filter((e) => e.sbagliato && e.giusto);
    if (GIORNO.test(body.giorno || '')) await salvaErrori('speaking', errori, giorno(body.giorno));
    return {
      voto,
      bravo: primo(tags, 'BRAVO'),
      errori: errori.map((e) => ({ detto: e.sbagliato, meglio: e.giusto, perche: e.perche, categoria: e.categoria })),
      frasi: voci(tags, 'FRASE').map((f) => { const [en, it] = campi(f); return { en, it }; }).filter((f) => f.en),
      consiglio: primo(tags, 'CONSIGLIO'),
    };
  },

  // ----- lacune (errori ricorrenti) -----
  'GET /api/lacune': async () => ({
    categorie: await tutti(`
      SELECT categoria, sum(volte)::int AS volte, count(*)::int AS errori,
             (array_agg(json_build_object('sbagliato', sbagliato, 'giusto', giusto) ORDER BY ultimo DESC))[1:3] AS esempi
      FROM errori WHERE NOT risolto AND categoria <> 'altro' GROUP BY categoria ORDER BY sum(volte) DESC`),
    risolti: (await uno('SELECT count(*)::int AS n FROM errori WHERE risolto')).n,
  }),

  'POST /api/lacune/esercizio': async ({ body }) => {
    giorno(body.giorno);
    const gruppi = await tutti(`
      SELECT categoria, sum(volte)::int AS volte,
             (array_agg(json_build_object('sbagliato', sbagliato, 'giusto', giusto) ORDER BY ultimo DESC))[1:3] AS esempi
      FROM errori WHERE NOT risolto AND categoria <> 'altro' GROUP BY categoria ORDER BY sum(volte) DESC LIMIT 3`);
    if (!gruppi.length) throw errore('Nessuna lacuna registrata per ora: fai writing o speaking e gli errori arriveranno qui.', 404);
    const { sistema, messaggi } = P.promptLacune(await profilo(), gruppi);
    const tags = parseTag(await chiedi({ sistema, messaggi, uso: 'lacune', maxTokens: 2500, sforzo: 'medium' }));
    const items = voci(tags, 'ITEM', '||').map((v) => {
      const [categoria, tipo, istruzione, testoItem, risposte, spiegazione] = v.split(/\s*\|\|\s*/).map((x) => (x || '').trim());
      const accettate = (risposte || '').split(/\s*\|\s*/).filter(Boolean);
      return testoItem && accettate.length ? { categoria: categoria.toLowerCase(), tipo, istruzione, testo: testoItem, risposte: accettate, spiegazione } : null;
    }).filter(Boolean).slice(0, 8);
    if (items.length < 3) throw errore('Esercizio non valido. Riprova.', 502);
    return { items, categorie: gruppi.map((g) => g.categoria) };
  },

  // Esiti dell'esercizio: risposte giuste "consumano" la lacuna, quelle sbagliate la rinforzano.
  'POST /api/lacune/risultato': async ({ body }) => {
    const g = giorno(body.giorno);
    const esiti = Array.isArray(body.esiti) ? body.esiti.slice(0, 20) : [];
    for (const e of esiti) {
      const cat = testo(e.categoria, 60);
      if (e.giusto) {
        await q(`UPDATE errori SET volte = volte - 1, risolto = (volte - 1 <= 0) WHERE id = (
                   SELECT id FROM errori WHERE NOT risolto AND categoria = $1 ORDER BY ultimo LIMIT 1)`, [cat]);
      } else {
        await q(`UPDATE errori SET volte = volte + 1, ultimo = $2 WHERE id = (
                   SELECT id FROM errori WHERE NOT risolto AND categoria = $1 ORDER BY ultimo DESC LIMIT 1)`, [cat, g]);
      }
    }
    const giuste = esiti.filter((e) => e.giusto).length;
    const punteggio = esiti.length ? Math.round((giuste / esiti.length) * 100) : 0;
    await q('INSERT INTO attivita (tipo, giorno, punteggio, valore, durata, dettagli) VALUES ($1, $2, $3, $4, $5, $6)', [
      'lacune', g, punteggio, esiti.length, intero(body.durata, 0, 3600, 0), JSON.stringify({ esiti }),
    ]);
    return { ok: true, punteggio };
  },

  // ----- allenamento infinito: cosa serve di più adesso -----
  'GET /api/allenamento/stato': async ({ query }) => {
    const g = giorno(query.giorno);
    const [due, nuove, difficili, lacune, medie] = await Promise.all([
      uno('SELECT count(*)::int AS n FROM carte WHERE intervallo > 0 AND scadenza <= $1', [g]),
      uno('SELECT count(*)::int AS n FROM carte WHERE intervallo = 0'),
      uno('SELECT count(*)::int AS n FROM carte WHERE errori >= 2 AND intervallo > 0'),
      uno('SELECT coalesce(sum(volte), 0)::int AS n FROM errori WHERE NOT risolto'),
      tutti(`SELECT tipo, round(avg(punteggio))::int AS media, max(giorno) AS ultimo FROM (
               SELECT tipo, punteggio, giorno, row_number() OVER (PARTITION BY tipo ORDER BY quando DESC) AS r FROM attivita
             ) t WHERE r <= 5 GROUP BY tipo`),
    ]);
    // Carte nuove che entrano ancora oggi (rispettando il limite giornaliero delle Impostazioni).
    const nuoveMax = intero(await leggiImpostazione('nuove_al_giorno', 10), 0, 50, 10);
    const introdotte = await uno(
      `SELECT count(*)::int AS n FROM (SELECT carta, min(giorno) AS primo FROM ripassi WHERE carta IS NOT NULL GROUP BY carta) t WHERE primo = $1`, [g]);
    const nuoveOggi = Math.min(nuove.n, Math.max(0, nuoveMax - introdotte.n));
    return {
      daRipassare: due.n + nuoveOggi, inScadenza: due.n, nuove: nuove.n, nuoveOggi, difficili: difficili.n, lacune: lacune.n,
      medie: Object.fromEntries(medie.map((m) => [m.tipo, { media: m.media, ultimo: m.ultimo }])),
      ai: aiDisponibile(), voce: voceDisponibile(),
    };
  },

  // ----- agente vocale (ElevenLabs, conversazione in tempo reale) -----
  'POST /api/voce/agente': async ({ body }) => {
    const prof = await profilo();
    const lacune = (await tutti(`SELECT categoria FROM errori WHERE NOT risolto AND categoria <> 'altro' GROUP BY categoria ORDER BY sum(volte) DESC LIMIT 4`)).map((r) => r.categoria);
    const pillole = (await tutti(`SELECT titolo FROM pillole ORDER BY id DESC LIMIT 3`)).map((r) => `today's culture lesson "${r.titolo}"`);
    const base = ['your job and a typical day at the agency', 'a recent trip or a place you love', 'food and cooking in Naples',
      'a film, series or book you liked', 'social media: good or bad?', 'your plans for next weekend', 'a funny or strange story',
      'technology and AI at work', 'sport and health', 'a person who inspires you', 'money, shopping and saving', 'your childhood',
      'a difficult client situation and how to handle it', 'presenting a project idea', 'news and current events'];
    for (let i = base.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [base[i], base[j]] = [base[j], base[i]]; }
    let prompt = P.promptAgenteVocale(prof, { argomenti: [...pillole.slice(0, 1), ...base.slice(0, 8)], lacune });
    const sc = trovaScenario(body.scenario);
    if (sc && sc.id !== 'coach') {
      prompt += `\n\nSTART WITH THIS ROLE-PLAY: ${sc.ruolo} The student's goal: ${sc.obiettivo} Stay in the role, but still correct important mistakes briefly as a teacher would (you can step out of the role for one sentence). When the role-play is naturally finished, continue with free conversation on new topics.`;
    }
    const ripresa = testo(body.ripresa, 4000);
    const { signedUrl, voiceId } = await agenteVocale();
    return {
      signedUrl, voiceId,
      prompt: ripresa ? `${prompt}\n\nTHE CALL DROPPED AND IS RESTARTING. Last part of the conversation (data):\n<materiale>${ripresa}</materiale>\nContinue naturally from there.` : prompt,
      primoMessaggio: ripresa ? 'Sorry, the line dropped for a second! Where were we? Let\'s keep going.'
        : sc && sc.id !== 'coach' && sc.apertura ? sc.apertura : 'Hi! I\'m Emma, your English teacher. How are you today?',
    };
  },

  // ----- voce -----
  'POST /api/voce/stt': async ({ raw, req }) => {
    if (!raw || raw.length < 1000) throw errore('Audio vuoto o troppo corto.');
    const mime = String(req.headers['content-type'] || 'audio/webm').split(';')[0];
    if (!mime.startsWith('audio/') && !mime.startsWith('video/')) throw errore('Formato audio non valido.');
    return { testo: await trascrivi(raw, mime) };
  },

  'POST /api/voce/tts': async ({ body }) => {
    const { audio, tipo } = await sintetizza(testo(body.testo, 1200, true), { lento: Boolean(body.lento) });
    return { _raw: audio, tipo };
  },

  // ----- backup -----
  'GET /api/esporta': async ({ res }) => {
    const tabelle = ['carte', 'ripassi', 'attivita', 'sessioni', 'impostazioni', 'livelli', 'obiettivi', 'pillole', 'percorsi'];
    const out = { app: 'daily-gym', versione: 1, esportato: new Date().toISOString() };
    for (const t of tabelle) out[t] = await tutti(`SELECT * FROM ${t} ORDER BY 1`);
    res.setHeader('Content-Disposition', `attachment; filename="daily-gym-backup-${new Date().toISOString().slice(0, 10)}.json"`);
    return out;
  },
};

// ---------- logica di supporto ----------

// Registra gli errori come lacune: lo stesso errore ripetuto aumenta "volte" invece di duplicarsi.
async function salvaErrori(origine, lista, g) {
  for (const e of lista.slice(0, 12)) {
    const esistente = await uno(
      `SELECT id FROM errori WHERE NOT risolto AND categoria = $1 AND lower(giusto) = lower($2) LIMIT 1`, [e.categoria, e.giusto]);
    if (esistente) await q('UPDATE errori SET volte = volte + 1, ultimo = $2 WHERE id = $1', [esistente.id, g]);
    else {
      await q(`INSERT INTO errori (origine, sbagliato, giusto, perche, categoria, giorno, ultimo) VALUES ($1, $2, $3, $4, $5, $6, $6)`,
        [origine, e.sbagliato.slice(0, 300), e.giusto.slice(0, 300), (e.perche || '').slice(0, 600), e.categoria, g]);
    }
  }
}

const cacheTraduzioni = new Map();

// Livello dei testi di cultura: il tuo livello, spostato dai giudizi "troppo facile / troppo difficile".
async function livelloPillola() {
  const offset = intero(await leggiImpostazione('cultura_offset', 0), -3, 3, 0);
  return livelloDaIndice(indiceLivello(await livelloAttuale()) + offset);
}

function validaCarta(c) {
  if (!c || !TIPI_CARTA.includes(c.tipo)) throw errore('tipo di carta non valido');
  const extra = c.extra && typeof c.extra === 'object' ? c.extra : {};
  if (JSON.stringify(extra).length > 20000) throw errore('dati extra troppo grandi');
  return [c.tipo, testo(c.fronte, 500, true), testo(c.retro, 2000), testo(c.nota, 2000), JSON.stringify(extra)];
}

async function creaCarta(c, g, db = pool) {
  const valori = validaCarta(c);
  const r = await db.query(
    `INSERT INTO carte (tipo, fronte, retro, nota, extra, scadenza, giorno_creazione) VALUES ($1, $2, $3, $4, $5, $6, $6) RETURNING id`,
    [...valori, g]
  );
  return r.rows[0].id;
}

async function impostaLivello(livello, g, motivo) {
  await scriviImpostazione('livello', livello);
  await q('INSERT INTO livelli (giorno, livello, motivo) VALUES ($1, $2, $3)', [g, livello, motivo]);
}

async function statoLivello(g) {
  const ultimo = await uno('SELECT giorno FROM livelli ORDER BY quando DESC LIMIT 1');
  const attivita = await tutti(
    `SELECT tipo, giorno, punteggio FROM attivita WHERE giorno >= $1 AND tipo = ANY($2)`,
    [aggiungiGiorni(g, -14), TIPI_INGLESE]
  );
  return valutaLivello({ livello: await livelloAttuale(), ultimoCambio: ultimo?.giorno || null, attivita, oggi: g });
}

async function aggiornaLivello(g) {
  const stato = await statoLivello(g);
  if (stato.cambio) {
    await impostaLivello(stato.cambio.nuovo, g, stato.cambio.motivo);
    return { da: stato.livello, a: stato.cambio.nuovo, motivo: stato.cambio.motivo };
  }
  return null;
}

async function obiettiviCalcolati(g, valori) {
  valori = valori || (await valoriMetriche(g));
  const lista = await tutti('SELECT * FROM obiettivi ORDER BY archiviato, scadenza');
  const out = [];
  for (const o of lista) {
    const attuale = o.metrica === 'manuale' ? o.manuale : valori[o.metrica] ?? 0;
    const av = avanzamento(o, attuale, g);
    if (av.stato === 'raggiunto' && !o.raggiunto) {
      await q('UPDATE obiettivi SET raggiunto = $2 WHERE id = $1', [o.id, g]);
      o.raggiunto = g;
    }
    out.push({ ...o, avanzamento: av });
  }
  return out;
}

function pulisciLuoghi(v) {
  const lista = Array.isArray(v) ? v : String(v || '').split(/[\n,;]+/);
  const luoghi = lista.map((x) => String(x).trim().slice(0, 80)).filter(Boolean).slice(0, 100);
  if (luoghi.length < 3) throw errore('Servono almeno 3 luoghi nel percorso.');
  return luoghi;
}

function pulisciStoria(v, max = 80) {
  if (!Array.isArray(v)) return [];
  return v.slice(-max).map((t) => ({
    ruolo: t && t.ruolo === 'io' ? 'io' : 'ai',
    testo: String((t && t.testo) || '').slice(0, 1500),
  })).filter((t) => t.testo.trim());
}

// La conversazione per l'API deve alternare user/assistant e iniziare con user.
function storiaInMessaggi(sc, storia) {
  const msgs = [];
  for (const t of storia) {
    const role = t.ruolo === 'io' ? 'user' : 'assistant';
    if (!msgs.length && role === 'assistant') {
      msgs.push({ role: 'user', content: '(The conversation starts. Say your opening line.)' });
    }
    const ultimo = msgs[msgs.length - 1];
    if (ultimo && ultimo.role === role) ultimo.content += '\n' + t.testo;
    else msgs.push({ role, content: t.testo });
  }
  if (msgs[msgs.length - 1].role !== 'user') msgs.push({ role: 'user', content: '(silence)' });
  return msgs;
}

async function contestoPillola(id) {
  const n = intero(id, 0, 2e9, 0);
  const p = n ? await uno('SELECT titolo, testo FROM pillole WHERE id = $1', [n]) : await uno('SELECT titolo, testo FROM pillole ORDER BY id DESC LIMIT 1');
  return p ? `${p.titolo}\n\n${p.testo}` : '';
}

async function creaPillola(g, { categoria: categoriaRichiesta, argomento: argomentoLibero } = {}) {
  const usati = (await tutti('SELECT argomento FROM pillole')).map((r) => r.argomento);
  const conta = (await uno('SELECT count(*)::int AS n FROM pillole')).n;
  const prof = { ...(await profilo()), livello: await livelloPillola() };

  // 1. Quale argomento: scritto dall'utente, della categoria scelta, o il prossimo a rotazione.
  let candidati;
  let categoria;
  if (argomentoLibero) {
    const titolo = await cercaArgomento(argomentoLibero, prof.livello);
    if (!titolo) throw errore(`Non trovo "${argomentoLibero}" su Wikipedia. Prova con un'altra parola, anche in inglese.`, 404);
    categoria = 'libero';
    candidati = [titolo];
  } else {
    categoria = CATEGORIE[categoriaRichiesta] ? categoriaRichiesta : prossimoArgomento(usati, conta).categoria;
    const lista = CATEGORIE[categoria].argomenti;
    if (CATEGORIE[categoria].libri) {
      // Aree dai libri: la prossima lezione del percorso; finito il percorso si ripassano le lezioni.
      const argomento = lista.find((a) => !usati.includes(a)) || lista[conta % lista.length];
      return creaLezioneLibro(g, prof, categoria, argomento);
    }
    const libero = lista.find((a) => !usati.includes(a));
    if (libero) candidati = [libero];
    else {
      // Lista della categoria finita: pagine collegate a un argomento già letto.
      const seme = lista[Math.floor(Math.random() * lista.length)];
      candidati = await argomentiCollegati(seme, usati, prof.livello);
      if (!candidati.length) candidati = [lista[conta % lista.length]];
    }
  }
  let fonte = null, argomento = null;
  for (const c of candidati.slice(0, 4)) {
    fonte = await estrattoWikipedia(c, prof.livello);
    if (!fonte) {
      // Titolo non esatto: si cerca la pagina più vicina.
      const vicino = await cercaArgomento(c, prof.livello);
      if (vicino) fonte = await estrattoWikipedia(vicino, prof.livello);
    }
    if (fonte) { argomento = c; break; }
  }
  const scelta = { categoria, argomento };
  const nomeCategoria = (CATEGORIE[categoria] || CATEGORIA_LIBERA).nome;
  const paroleInStudio = await paroleDaStudiare();
  if (!fonte) throw errore('Non riesco a leggere Wikipedia in questo momento. Riprova tra poco.', 502);
  const { sistema, messaggi } = P.promptPillola(prof, {
    argomento: scelta.argomento, categoria: nomeCategoria, estratto: fonte.testo, paroleInStudio,
  });
  const tags = parseTag(await chiedi({ sistema, messaggi, uso: 'cultura', maxTokens: 3000, sforzo: 'medium' }));
  return salvaPillola(g, scelta, prof, tags, { titolo: fonte.titolo, url: fonte.url, fonte: '' });
}

const paroleDaStudiare = async () =>
  (await tutti(`SELECT fronte FROM carte WHERE tipo = 'en' AND intervallo < 21 ORDER BY random() LIMIT 12`)).map((r) => r.fronte);

async function creaLezioneLibro(g, prof, categoria, argomento) {
  const lezione = LEZIONI[argomento];
  const { sistema, messaggi } = P.promptLezioneLibro(prof, { lezione, paroleInStudio: await paroleDaStudiare() });
  const tags = parseTag(await chiedi({ sistema, messaggi, uso: 'cultura', maxTokens: 3000, sforzo: 'medium' }));
  const fonte = `Basato su: ${lezione.libro.titolo} — ${lezione.libro.autore} · lezione ${lezione.numero} di ${lezione.totale}`;
  return salvaPillola(g, { categoria, argomento }, prof, tags, { titolo: lezione.titolo, url: '', fonte });
}

async function salvaPillola(g, scelta, prof, tags, fonte) {
  const testoPillola = primo(tags, 'TESTO');
  if (!testoPillola || testoPillola.length < 150) throw errore('Pillola non valida. Riprova.', 502);
  const glossario = voci(tags, 'PAROLA').map((p) => { const [en, it] = campi(p); return { en, it }; }).filter((p) => p.en && p.it);
  const daRicordare = primo(tags, 'DA_RICORDARE');
  if (daRicordare) glossario.push({ daRicordare: true, it: daRicordare });
  const domande = voci(tags, 'DOMANDA', '||').map((d) => {
    const parti = d.split(/\s*\|\|\s*/).map((s) => s.trim()).filter(Boolean);
    return parti.length >= 3 ? { domanda: parti[0], risposta: parti[1], sbagliate: parti.slice(2, 4) } : null;
  }).filter(Boolean).slice(0, 3);
  return uno(
    `INSERT INTO pillole (giorno, categoria, argomento, titolo, fonte_url, fonte, livello, testo, glossario, domande)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [g, scelta.categoria, scelta.argomento, primo(tags, 'TITOLO') || fonte.titolo, fonte.url, fonte.fonte, prof.livello,
      testoPillola, JSON.stringify(glossario), JSON.stringify(domande)]
  );
}
