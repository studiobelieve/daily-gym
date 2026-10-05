// Progressi: costanza, livello di inglese, andamento di ogni esercizio, ripasso, costi.
import { h, svuota, segmenti, barra } from '../ui.js';
import { api, oggi } from '../api.js';
import { linea, barre, heatmap } from '../grafici.js';
import { LIVELLI, aggiungiGiorni, indiceLivello } from '../shared/testo.js';
import { vistaRiepilogo } from '../esercizi/riepilogo.js';
import { oreMinuti } from '../shared/obiettivi.js';

// Un punto per giorno: massimo (record) o media.
function perGiorno(attivita, tipo, campo = 'punteggio', modo = 'media', filtro = () => true) {
  const m = new Map();
  for (const a of attivita) {
    if (a.tipo !== tipo || !filtro(a) || a[campo] == null) continue;
    if (!m.has(a.giorno)) m.set(a.giorno, []);
    m.get(a.giorno).push(Number(a[campo]));
  }
  return [...m.entries()].sort(([x], [y]) => (x < y ? -1 : 1)).map(([x, v]) => ({
    x, y: modo === 'max' ? Math.max(...v) : modo === 'somma' ? v.reduce((a, b) => a + b, 0) : Math.round(v.reduce((a, b) => a + b, 0) / v.length),
  }));
}

function blocco(titolo, sotto, contenuto) {
  return h('div', { class: 'card' }, h('h3', titolo), sotto ? h('p', { class: 'tiny muted' }, sotto) : null, contenuto);
}

export async function mostra(box) {
  const g = oggi();
  const [d, rie] = await Promise.all([api.get('/api/progressi'), api.get('/api/riepilogo')]);
  const att = d.attivita;
  const totCarte = Object.fromEntries(d.carte.map((c) => [c.tipo, c]));
  const consolidate = d.carte.reduce((s, c) => s + c.mature, 0);

  // ---- livello ----
  const storicoLivello = d.livelli.map((l) => ({ x: l.giorno, y: indiceLivello(l.livello) }));
  if (storicoLivello.length && storicoLivello[storicoLivello.length - 1].x !== g) storicoLivello.push({ x: g, y: indiceLivello(d.livello) });
  const s = d.statoLivello;
  const prossimo = LIVELLI[Math.min(LIVELLI.length - 1, indiceLivello(d.livello) + 1)];
  const livelloBox = h('div', { class: 'card stack' },
    h('div', { class: 'row between' }, h('h3', { style: { margin: 0 } }, 'Livello di inglese'), h('span', { class: 'chip inglese' }, d.livello)),
    s.cambio && s.cambio.nuovo === prossimo
      ? h('p', { class: 'small' }, h('strong', `Sei pronto per ${prossimo}: `), 'il cambio scatta al prossimo esercizio di inglese.')
      : s.esercizi < 8
      ? h('p', { class: 'small' }, `Ancora ${s.servono} esercizi di inglese (writing, dettato, speaking, quiz di cultura) per la prossima valutazione.`)
      : h('p', { class: 'small' }, `Media degli ultimi ${s.esercizi} esercizi: `, h('strong', s.media), `. Per passare a ${prossimo} serve una media di almeno 85.`),
    s.media != null ? h('div', barra(Math.min(100, Math.round((s.media / 85) * 100)), { colore: 'var(--accent)' }),
      h('div', { class: 'tiny muted', style: { marginTop: '4px' } }, `${s.media} / 85 verso ${prossimo}`)) : null,
    storicoLivello.length > 1 ? linea(storicoLivello, { gradini: true, min: 0, max: LIVELLI.length - 1, formato: (v) => LIVELLI[v], etichettaY: (v) => LIVELLI[v] || '' }) : null,
    h('p', { class: 'tiny muted' }, 'Il livello sale da solo quando la media resta alta per almeno una settimana, e scende se i contenuti sono troppo difficili.'));

  // ---- aree ----
  const area = h('div', { class: 'stack' });
  const ultimi30 = Array.from({ length: 30 }, (_, i) => aggiungiGiorni(g, i - 29));
  const ripassiMap = Object.fromEntries(d.ripassiGiorno.map((r) => [r.giorno, r]));
  const AREE = {
    memoria: () => [
      blocco('Digit span', 'Cifre ricordate in ordine (il tuo termometro della memoria di lavoro). Media adulti: ~7.',
        linea(perGiorno(att, 'span', 'valore', 'max'), { colore: 'var(--memoria)', unita: ' cifre', min: 3 })),
      blocco('Palazzo della memoria', 'Oggetti ritrovati per sessione.',
        linea(perGiorno(att.map((a) => (a.tipo === 'palazzo' ? { ...a, ritrovati: Math.round((a.valore * a.punteggio) / 100) } : a)), 'palazzo', 'ritrovati', 'max'), { colore: 'var(--memoria)', unita: ' oggetti', min: 0 })),
      blocco('Focus e concentrazione', 'Punteggio degli esercizi di concentrazione (respiro, "non premere il 3", colori).',
        linea(perGiorno(att, 'focus'), { colore: 'var(--memoria)', unita: '%', min: 0, max: 100 })),
      blocco('Persone reali', null, h('p', { style: { margin: 0 } }, `${(totCarte.persona || {}).totali || 0} in studio, ${(totCarte.persona || {}).mature || 0} consolidate (ricordi il nome a 3+ settimane di distanza).`)),
    ],
    inglese: () => [
      blocco('Writing', 'Voto della correzione, calibrato sul tuo livello.', linea(perGiorno(att, 'writing'), { unita: '', min: 0, max: 100 })),
      blocco('Dettato', 'Parole scritte giuste.', linea(perGiorno(att, 'dettato'), { unita: '%', min: 0, max: 100 })),
      blocco('Speaking', 'Voto del report di conversazione.', linea(perGiorno(att, 'speaking'), { min: 0, max: 100 })),
      blocco('Minuti di speaking', 'Per giorno, ultimi 30 giorni.', barre(ultimi30.map((x) => ({
        x, y: Math.round(att.filter((a) => a.tipo === 'speaking' && a.giorno === x).reduce((s2, a) => s2 + a.durata, 0) / 60),
      })), { unita: ' min' })),
      blocco('Vocabolario', null, h('p', { style: { margin: 0 } }, `${(totCarte.en || {}).totali || 0} parole in studio, ${(totCarte.en || {}).mature || 0} consolidate (ricordate a 3+ settimane).`)),
    ],
    cultura: () => [
      blocco('Quiz delle pillole', 'Risposte giuste sulle pillole di cultura.', linea(perGiorno(att, 'cultura'), { colore: 'var(--cultura)', unita: '%', min: 0, max: 100 })),
      blocco('Nozioni', null, h('p', { style: { margin: 0 } }, `${(totCarte.cultura || {}).totali || 0} nozioni in ripasso, ${(totCarte.cultura || {}).mature || 0} consolidate.`)),
    ],
    ripasso: () => [
      blocco('Carte ripassate', 'Ultimi 30 giorni.', barre(ultimi30.map((x) => ({ x, y: (ripassiMap[x] || {}).n || 0 })), { colore: 'var(--costanza)' })),
      blocco('Quanto ricordi', 'Percentuale di carte ricordate al ripasso, per settimana. Tra 80% e 90% è il punto giusto: vuol dire che ripassi al momento giusto.',
        linea(d.ritenzione.map((r) => ({ x: r.settimana, y: r.pct })), { colore: 'var(--costanza)', unita: '%', min: 0, max: 100 })),
    ],
  };
  const disegnaArea = (k) => svuota(area, AREE[k]());

  // ---- costi ----
  const claude = d.consumi.find((c) => c.servizio === 'claude');
  const tts = d.consumi.find((c) => c.servizio === 'elevenlabs-tts');
  const stt = d.consumi.find((c) => c.servizio === 'elevenlabs-stt');

  svuota(box,
    h('h1', 'Progressi'),
    h('div', { class: 'tile-griglia' },
      h('div', { class: 'tile' }, h('div', { class: 'num fiamma' }, d.serie), h('div', { class: 'lab' }, `giorni di fila · record ${d.serieRecord}`)),
      h('div', { class: 'tile' }, h('div', { class: 'num' }, d.sessioniTotali), h('div', { class: 'lab' }, 'sessioni totali')),
      h('div', { class: 'tile' }, h('div', { class: 'num', style: { color: 'var(--accent)' } }, d.livello), h('div', { class: 'lab' }, 'livello inglese')),
      h('div', { class: 'tile' }, h('div', { class: 'num' }, consolidate), h('div', { class: 'lab' }, 'carte consolidate'))),
    h('div', { class: 'sezione' }, h('h2', 'Costanza'),
      h('div', { class: 'card' }, heatmap(g, Object.fromEntries(d.attivitaGiorno.map((x) => [x.giorno, x.n])), new Set(d.giorniSessione)))),
    h('div', { class: 'sezione' }, h('h2', `Tempo di esercizio (obiettivo ${oreMinuti(d.tempo.obiettivo)} a settimana)`),
      h('div', { class: 'card stack' },
        h('div', { class: 'small' }, `Settimane raggiunte: ${d.tempo.settimane.filter((s) => s.raggiunto).length} su ${settimaneUsate(d.tempo.settimane).length}`),
        settimaneUsate(d.tempo.settimane).reverse().map((s, i) => h('div', { class: 'stack', style: { gap: '4px' } },
          h('div', { class: 'row between tiny' }, h('span', i === 0 ? 'Questa settimana' : 'Dal ' + new Date(s.inizio + 'T12:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })),
            h('span', { class: s.raggiunto ? '' : 'muted' }, oreMinuti(s.minuti) + (s.raggiunto ? ' ✓' : ''))),
          barra(Math.min(100, Math.round((s.minuti / d.tempo.obiettivo) * 100))))))),
    h('div', { class: 'sezione' }, h('h2', 'Questa settimana'), await vistaRiepilogo(rie)),
    h('div', { class: 'sezione' }, h('h2', 'Inglese'), livelloBox),
    h('div', { class: 'sezione' }, h('h2', 'Andamento per area'),
      segmenti([['memoria', 'Memoria'], ['inglese', 'Inglese'], ['cultura', 'Cultura'], ['ripasso', 'Ripasso']], 'memoria', disegnaArea),
      h('div', { style: { marginTop: '10px' } }, area)),
    h('div', { class: 'sezione' }, h('h2', 'Costi di questo mese (stima)'),
      h('div', { class: 'card small' },
        h('p', `Claude: ${claude ? '$' + claude.costo.toFixed(2) + ` (${claude.chiamate} chiamate)` : 'nessun uso'}`),
        h('p', `ElevenLabs voce: ${tts ? Math.round(tts.unita).toLocaleString('it-IT') + ' caratteri' : 'nessun uso'} · trascrizione: ${stt ? '~' + Math.round(stt.unita / 60) + ' min' : 'nessun uso'}`),
        h('p', { class: 'tiny muted', style: { margin: 0 } }, 'Claude: stima calcolata dai token. ElevenLabs si paga a crediti secondo il tuo piano: qui vedi i caratteri usati da confrontare con quelli inclusi.'))));
  disegnaArea('memoria');
}

// Le settimane vuote prima del primo allenamento non contano (l'app non c'era ancora).
function settimaneUsate(settimane) {
  const primo = settimane.findIndex((s) => s.minuti > 0);
  return settimane.slice(primo < 0 ? settimane.length - 1 : primo);
}
