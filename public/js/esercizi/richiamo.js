// Richiamo di cultura: domande NUOVE sulle pillole lette giorni fa, a intervalli crescenti
// (1, 3, 7, 14, 30… giorni). Ricordare a distanza di tempo è ciò che fissa davvero i fatti.
import { h, svuota, mescola, caricamento } from '../ui.js';
import { api } from '../api.js';
import { inglese, suggerimentoTocco } from '../parola.js';

export async function avvia(box, opz) {
  svuota(box, caricamento('Preparo le domande sui testi che hai letto…'));
  let dati;
  try {
    dati = await api.post('/api/richiamo/esercizio', { anche: Boolean(opz.singolo) });
  } catch (err) {
    if (err.status !== 404) throw err;
    await new Promise((ok) => svuota(box, h('div', { class: 'card vuoto stack' },
      h('div', { style: { fontSize: '2.2rem' } }, '🧠'),
      h('p', err.message),
      h('button', { class: 'btn primario pieno', onclick: ok }, 'Avanti'))));
    return { punteggio: 100, vuoto: true };
  }
  const inizio = Date.now();
  const titoli = Object.fromEntries(dati.pillole.map((p) => [p.id, p]));
  await new Promise((ok) => svuota(box, h('div', { class: 'card stack' },
    h('h2', { style: { margin: 0 } }, 'Ti ricordi?'),
    h('p', { class: 'small', style: { margin: 0 } }, 'Domande nuove su testi che hai letto qualche giorno fa:'),
    h('ul', { class: 'lista small' }, dati.pillole.map((p) => h('li', inglese(p.titolo)))),
    h('p', { class: 'tiny muted', style: { margin: 0 } }, 'Se rispondi bene, il testo torna tra più giorni; se sbagli, torna presto.'),
    h('button', { class: 'btn primario pieno', onclick: ok }, 'Inizia'))));

  const conti = {};
  for (let i = 0; i < dati.domande.length; i++) {
    if (opz.attuale && !opz.attuale()) return null;
    const d = dati.domande[i];
    const giusto = await new Promise((fatto) => {
      const opzioni = mescola([d.risposta, ...d.sbagliate]);
      const area = h('div', { class: 'opzioni' }, opzioni.map((o) => h('button', { onclick: () => scegli(o) }, o)));
      const scegli = (o) => svuota(area, opzioni.map((x) => h('div', { class: 'opzione-fatta ' + (x === d.risposta ? 'giusta' : x === o ? 'sbagliata' : '') },
        x === d.risposta ? '✓ ' : x === o ? '✗ ' : '', inglese(x))),
      suggerimentoTocco(),
      h('button', { class: 'btn primario pieno', onclick: () => fatto(o === d.risposta) }, i < dati.domande.length - 1 ? 'Prossima domanda' : 'Fine'));
      svuota(box, h('div', { class: 'card stack' },
        h('div', { class: 'row between' }, h('span', { class: 'chip cultura' }, (titoli[d.pillola] || {}).titolo || ''), h('span', { class: 'tiny muted' }, `${i + 1} di ${dati.domande.length}`)),
        inglese(d.domanda, { tag: 'h2', stile: { fontWeight: 600 } }),
        area));
    });
    const c = (conti[d.pillola] ||= { pillola: d.pillola, giuste: 0, totali: 0 });
    c.totali++;
    if (giusto) c.giuste++;
  }
  const esiti = Object.values(conti);
  const r = await api.post('/api/richiamo/risultato', { esiti, durata: Math.round((Date.now() - inizio) / 1000) });
  await new Promise((ok) => svuota(box, h('div', { class: 'card stack' },
    h('div', { class: 'center' }, h('p', { class: 'muted', style: { margin: 0 } }, 'Ricordati'), h('div', { class: 'voto-grande' }, r.punteggio + '%')),
    h('ul', { class: 'lista small' }, esiti.map((e) => h('li', { class: 'row between' },
      h('span', { class: 'grow' }, (titoli[e.pillola] || {}).titolo), h('span', { class: 'muted' }, `${e.giuste}/${e.totali} ${e.giuste === e.totali ? '→ torna più avanti' : '→ torna presto'}`)))),
    h('button', { class: 'btn primario pieno', onclick: ok }, 'Avanti'))));
  return { punteggio: r.punteggio };
}
