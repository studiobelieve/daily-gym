// Numeri per tracking, obiettivi e riepilogo settimanale. Tutto calcolato dal database.
import { uno, tutti, leggiImpostazione } from './db.js';
import { serie } from './srs.js';
import { indiceLivello, aggiungiGiorni, giornoSettimana } from '../public/js/shared/testo.js';

export async function livelloAttuale() {
  return (await leggiImpostazione('livello')) || 'A2';
}

export async function giorniSessione() {
  return (await tutti('SELECT giorno FROM sessioni ORDER BY giorno')).map((r) => r.giorno);
}

// Serie più lunga mai fatta.
export function serieRecord(giorni) {
  let best = 0, cur = 0, prec = null;
  for (const g of giorni) {
    cur = prec && aggiungiGiorni(prec, 1) === g ? cur + 1 : 1;
    best = Math.max(best, cur);
    prec = g;
  }
  return best;
}

// Valore attuale di ogni metrica del catalogo (public/js/shared/obiettivi.js).
export async function valoriMetriche(oggi) {
  const giorni = await giorniSessione();
  const [carte, span, palazzo, nomi, writing, speaking, pillole, sessioni] = await Promise.all([
    uno(`SELECT
        count(*) FILTER (WHERE tipo = 'en')::int AS parole_totali,
        count(*) FILTER (WHERE tipo = 'en' AND intervallo >= 21)::int AS parole_mature,
        (SELECT count(*) FROM pillole WHERE richiamo_passo >= 3)::int AS cultura_ricordata
      FROM carte`),
    uno(`SELECT coalesce(max(valore), 0) AS v FROM attivita WHERE tipo = 'span'`),
    uno(`SELECT coalesce(max(valore), 0) AS v FROM attivita WHERE tipo = 'palazzo' AND punteggio >= 100`),
    uno(`SELECT coalesce(avg(punteggio), 0) AS v FROM (SELECT punteggio FROM attivita WHERE tipo = 'focus' ORDER BY quando DESC LIMIT 5) t`),
    uno(`SELECT coalesce(avg(punteggio), 0) AS v FROM (SELECT punteggio FROM attivita WHERE tipo = 'writing' ORDER BY quando DESC LIMIT 5) t`),
    uno(`SELECT coalesce(sum(durata), 0) / 60.0 AS v FROM attivita WHERE tipo = 'speaking'`),
    uno(`SELECT count(*)::int AS v FROM pillole WHERE completata`),
    uno(`SELECT count(*)::int AS v FROM sessioni`),
  ]);
  return {
    livello_inglese: indiceLivello(await livelloAttuale()),
    parole_totali: carte.parole_totali,
    parole_mature: carte.parole_mature,
    cultura_ricordata: carte.cultura_ricordata,
    span_record: Number(span.v),
    palazzo_record: Number(palazzo.v),
    focus_precisione: Math.round(Number(nomi.v)),
    writing_media: Math.round(Number(writing.v)),
    speaking_minuti: Math.round(Number(speaking.v)),
    pillole: pillole.v,
    sessioni: sessioni.v,
    serie: serie(giorni, oggi),
  };
}

// Tutto ciò che serve alla pagina Progressi.
export async function progressi(oggi) {
  const da90 = aggiungiGiorni(oggi, -90);
  const da30 = aggiungiGiorni(oggi, -29);
  const da112 = aggiungiGiorni(oggi, -111); // 16 settimane per la heatmap
  const giorni = await giorniSessione();

  const [ripassiGiorno, attivita, livelli, carte, consumi, attivitaGiorno] = await Promise.all([
    tutti(`SELECT giorno, count(*)::int AS n, count(*) FILTER (WHERE voto >= 3)::int AS ok
           FROM ripassi WHERE giorno >= $1 GROUP BY giorno ORDER BY giorno`, [da30]),
    tutti(`SELECT tipo, giorno, punteggio, valore, durata FROM attivita
           WHERE giorno >= $1 ORDER BY quando`, [da90]),
    tutti(`SELECT giorno, livello, motivo FROM livelli ORDER BY quando`),
    tutti(`SELECT tipo, count(*)::int AS totali,
             count(*) FILTER (WHERE intervallo >= 21)::int AS mature,
             count(*) FILTER (WHERE intervallo = 0)::int AS nuove
           FROM carte GROUP BY tipo`),
    tutti(`SELECT servizio, sum(unita)::float AS unita, sum(costo)::float AS costo, count(*)::int AS chiamate
           FROM consumi WHERE quando >= date_trunc('month', now()) GROUP BY servizio`),
    tutti(`SELECT giorno, count(*)::int AS n FROM (
             SELECT giorno FROM ripassi WHERE giorno >= $1
             UNION ALL SELECT giorno FROM attivita WHERE giorno >= $1
           ) t GROUP BY giorno`, [da112]),
  ]);

  // Ritenzione per settimana (ultime 8): % di carte ricordate al ripasso.
  const ritenzione = await tutti(`
    SELECT date_trunc('week', giorno)::date AS settimana,
           round(100.0 * count(*) FILTER (WHERE voto >= 3) / count(*))::int AS pct,
           count(*)::int AS n
    FROM ripassi WHERE giorno >= $1 GROUP BY 1 ORDER BY 1`, [aggiungiGiorni(oggi, -56)]);

  return {
    oggi,
    serie: serie(giorni, oggi),
    serieRecord: serieRecord(giorni),
    sessioniTotali: giorni.length,
    giorniSessione: giorni.filter((g) => g >= da112),
    attivitaGiorno,
    ripassiGiorno,
    ritenzione,
    attivita,
    livelli,
    livello: await livelloAttuale(),
    carte,
    consumi,
  };
}

// Confronto settimana corrente (ultimi 7 giorni) con quella prima.
export async function riepilogo(oggi) {
  const inizio = aggiungiGiorni(oggi, -6);
  const inizioPrima = aggiungiGiorni(oggi, -13);
  const periodo = async (da, a) => {
    const [s, r, att, nuove] = await Promise.all([
      uno('SELECT count(*)::int AS n FROM sessioni WHERE giorno BETWEEN $1 AND $2', [da, a]),
      uno(`SELECT count(*)::int AS n, coalesce(round(100.0 * count(*) FILTER (WHERE voto >= 3) / nullif(count(*), 0)), 0)::int AS pct
           FROM ripassi WHERE giorno BETWEEN $1 AND $2`, [da, a]),
      tutti(`SELECT tipo, round(avg(punteggio))::int AS media, max(valore)::float AS max, count(*)::int AS n,
                    sum(durata)::int AS durata
             FROM attivita WHERE giorno BETWEEN $1 AND $2 GROUP BY tipo`, [da, a]),
      uno(`SELECT count(*)::int AS n FROM carte WHERE coalesce(giorno_creazione, creata::date) BETWEEN $1 AND $2`, [da, a]),
    ]);
    const perTipo = Object.fromEntries(att.map((x) => [x.tipo, x]));
    return { sessioni: s.n, ripassi: r.n, ritenzione: r.pct, perTipo, carteNuove: nuove.n };
  };
  const [questa, prima] = await Promise.all([periodo(inizio, oggi), periodo(inizioPrima, aggiungiGiorni(inizio, -1))]);
  // Record = miglior valore della settimana oltre il massimo di prima (per il palazzo contano solo le prove perfette,
  // come in /api/attivita e nelle metriche degli obiettivi).
  const record = await tutti(`
    SELECT a.tipo, max(a.valore)::float AS valore FROM attivita a
    WHERE a.giorno BETWEEN $1 AND $2 AND a.tipo IN ('span', 'palazzo') AND a.valore IS NOT NULL
      AND (a.tipo <> 'palazzo' OR a.punteggio >= 100)
      AND a.valore > coalesce((SELECT max(b.valore) FROM attivita b
                               WHERE b.tipo = a.tipo AND b.giorno < $1 AND (b.tipo <> 'palazzo' OR b.punteggio >= 100)), 0)
    GROUP BY a.tipo`, [inizio, oggi]);
  return { da: inizio, a: oggi, questa, prima, record };
}

// ---------- Tempo di allenamento per settimana (lunedì-domenica) ----------
// Conta solo il tempo passato negli esercizi: durata di ogni attività (max 1 ora l'una, per non contare
// un'app lasciata aperta) + il tempo su ogni carta del ripasso (max 2 minuti a carta; i ripassi vecchi,
// senza misura, valgono 10 secondi l'uno).
export const OBIETTIVO_SETTIMANA_PREDEFINITO = 120;

export const lunedi = (g) => aggiungiGiorni(g, -((giornoSettimana(g) + 6) % 7));

export async function tempoSettimane(oggi, quante = 8) {
  const da = aggiungiGiorni(lunedi(oggi), -7 * (quante - 1));
  const righe = await tutti(`
    SELECT to_char(date_trunc('week', giorno), 'YYYY-MM-DD') AS settimana, sum(sec)::int AS secondi FROM (
      SELECT giorno, least(durata, 3600) AS sec FROM attivita WHERE giorno >= $1
      UNION ALL
      SELECT giorno, least(coalesce(secondi, 10), 120) FROM ripassi WHERE giorno >= $1
    ) t GROUP BY 1`, [da]);
  const mappa = Object.fromEntries(righe.map((r) => [r.settimana, r.secondi]));
  const obiettivo = Number(await leggiImpostazione('obiettivo_settimana_minuti', OBIETTIVO_SETTIMANA_PREDEFINITO));
  const settimane = [];
  for (let i = quante - 1; i >= 0; i--) {
    const inizio = aggiungiGiorni(lunedi(oggi), -7 * i);
    const minuti = Math.round((mappa[inizio] || 0) / 60);
    settimane.push({ inizio, minuti, raggiunto: minuti >= obiettivo });
  }
  const corrente = settimane[settimane.length - 1];
  const giornoNum = (giornoSettimana(oggi) + 6) % 7; // 0 = lunedì
  return { obiettivo, settimane, corrente: { ...corrente, giorniRimasti: 7 - giornoNum, attesoPct: Math.round(((giornoNum + 1) / 7) * 100) } };
}
