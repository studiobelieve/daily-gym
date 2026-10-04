// Esecuzione della sessione guidata (#/sessione/corta|completa) o di un singolo esercizio
// (#/esercizio/<id>[/<parametro>]). Ogni esercizio è un modulo in js/esercizi/ con
// avvia(box, opzioni) -> Promise<risultato | null>.
import { h, svuota, icona, toast, conferma, durata } from '../ui.js';
import { api, oggi } from '../api.js';
import { pianoDelGiorno, prossimoEsercizio, ESERCIZI } from '../shared/piano.js';
import { passiFatti, segnaPasso, chiavePasso } from '../locale.js';
import { passoFatto } from './oggi.js';
import { fermaAudio } from '../voce.js';

const MODULI = {
  test: () => import('../esercizi/test.js'),
  ripasso: () => import('../esercizi/ripasso.js'),
  nomi: () => import('../esercizi/nomi.js'),
  palazzo: () => import('../esercizi/palazzo.js'),
  span: () => import('../esercizi/span.js'),
  cultura: () => import('../esercizi/cultura.js'),
  writing: () => import('../esercizi/writing.js'),
  dettato: () => import('../esercizi/dettato.js'),
  speaking: () => import('../esercizi/speaking.js'),
  riepilogo: () => import('../esercizi/riepilogo.js'),
  lacune: () => import('../esercizi/lacune.js'),
  difficili: () => import('../esercizi/ripasso.js'),
  richiamo: () => import('../esercizi/richiamo.js'),
};

export async function mostra(box, { nome, parametri, vai, attuale }) {
  if (nome === 'esercizio') return singolo(box, parametri, vai);
  if (parametri[0] === 'infinita') return infinita(box, vai, attuale);
  const tipo = parametri[0] === 'completa' ? 'completa' : 'corta';
  const g = oggi();
  const d = await api.get('/api/oggi');
  const passi = pianoDelGiorno(g, tipo, { ai: d.ai, testFatto: d.testFatto, lacune: d.lacune });
  const inizio = Date.now();
  const cambiLivello = [];
  const record = [];

  for (let i = 0; i < passi.length; i++) {
    if (!attuale()) return;
    const p = passi[i];
    if (passoFatto(p, passiFatti(g), d.fatteOggi)) continue;
    const esito = await eseguiPasso(box, p, { indice: i, passi, vai, g, attuale });
    if (esito === 'esci') return;
    if (esito && esito.livello) cambiLivello.push(esito.livello);
    if (esito && esito.record) record.push(p.nome);
    if (esito !== 'saltato') segnaPasso(g, chiavePasso(p));
  }
  if (!attuale()) return;

  const fatti = passi.filter((p) => passiFatti(g).includes(chiavePasso(p)) || passoFatto(p, [], d.fatteOggi));
  const completata = fatti.length === passi.length;
  let serie = d.serie;
  if (completata) {
    const r = await api.post('/api/sessione', { tipo, durata: Math.round((Date.now() - inizio) / 1000) });
    serie = r.serie;
  }
  svuota(box, h('div', { class: 'card festa stack' },
    h('div', { class: 'grande' }, completata ? '🔥' : '👍'),
    h('h1', completata ? `${serie} ${serie === 1 ? 'giorno' : 'giorni'} di fila` : 'Per oggi basta così'),
    h('p', { class: 'muted' }, completata ? 'Sessione completata. La costanza è l\'esercizio più importante.' : 'Hai saltato qualche passo: la sessione non conta per la serie finché non li completi.'),
    cambiLivello.map((l) => h('p', { class: 'chip inglese' }, `Livello inglese: ${l.da} → ${l.a}`)),
    record.length ? h('p', `Nuovo record: ${record.join(', ')}!`) : null,
    h('button', { class: 'btn primario pieno', onclick: () => vai('oggi') }, 'Torna a Oggi'),
    completata ? h('button', { class: 'btn pieno', onclick: () => vai('progressi') }, 'Guarda i progressi') : null));
}

async function singolo(box, [id, param], vai) {
  if (!ESERCIZI[id]) return vai('palestra');
  const opz = {};
  if (id === 'speaking' && param) opz.scenario = param;
  if (id === 'ripasso' && param) opz.tipo = param;
  const p = { id, ...ESERCIZI[id], ...opz };
  const esito = await eseguiPasso(box, p, { indice: 0, passi: [p], vai, g: oggi(), singolo: true, attuale: () => true });
  if (esito === 'esci') return;
  svuota(box, h('div', { class: 'card festa stack' },
    h('div', { class: 'grande' }, '✅'),
    h('h2', `${p.nome}: fatto`),
    esito && esito.livello ? h('p', { class: 'chip inglese' }, `Livello inglese: ${esito.livello.da} → ${esito.livello.a}`) : null,
    esito && esito.record ? h('p', 'Nuovo record personale!') : null,
    h('button', { class: 'btn primario pieno', onclick: () => vai('esercizio/' + id + (param ? '/' + param : '')) }, id === 'cultura' ? 'Un\'altra pillola' : 'Ancora una volta'),
    h('button', { class: 'btn pieno', onclick: () => vai('palestra') }, 'Torna alla palestra')));
}

// Mostra testata + esercizio. Restituisce il risultato, 'saltato' o 'esci'.
async function eseguiPasso(box, p, { indice, passi, vai, singolo, attuale, infinito }) {
  const corpo = h('div');
  let uscita;
  // Quando la sessione abbandona l'esercizio (esci o salta), il modulo riceve un segnale
  // di "abort" per staccare listener, microfono e timer: non deve restare niente in sottofondo.
  const ctrl = new AbortController();
  const promessaUscita = new Promise((r) => { uscita = (v) => { ctrl.abort(); fermaAudio(); r(v); }; });
  const attivo = () => attuale() && !ctrl.signal.aborted;
  const esci = async () => {
    if (infinito) {
      if (await conferma('Terminare l\'allenamento? Gli esercizi fatti restano salvati.')) uscita('termina');
      return;
    }
    if (await conferma('Vuoi uscire? I passi già completati restano salvati.')) {
      uscita('esci');
      vai(singolo ? 'palestra' : 'oggi');
    }
  };
  const salta = () => uscita('saltato');
  svuota(box,
    h('div', { class: 'esercizio-testa' },
      h('button', { class: 'icona-btn', 'aria-label': 'Esci', onclick: esci }, icona('chiudi')),
      h('strong', { class: 'grow center' }, p.nome),
      singolo ? h('span', { style: { width: '38px' } }) : h('button', { class: 'btn piccolo fantasma', onclick: salta }, 'Salta')),
    infinito ? h('div', { class: 'row between tiny muted', style: { marginBottom: '12px' } },
      h('span', `∞ Allenamento · esercizio ${indice + 1}`), infinito.tempo,
      h('button', { class: 'btn piccolo', onclick: esci }, 'Termina'))
      : singolo ? null : h('div', { class: 'progresso-passi' }, passi.map((_, k) => h('i', { class: k < indice ? 'fatto' : k === indice ? 'ora' : '' }))),
    corpo);

  for (;;) {
    try {
      const modulo = await MODULI[p.id]();
      const opzModulo = { ...p, attuale: attivo, segnale: ctrl.signal, singolo: Boolean(singolo) };
      if (p.id === 'difficili') opzModulo.difficili = true;
      const risultato = await Promise.race([modulo.avvia(corpo, opzModulo), promessaUscita]);
      return risultato;
    } catch (err) {
      if (err.status === 401) return 'esci';
      console.error(err);
      const scelta = await new Promise((r) => {
        svuota(corpo, h('div', { class: 'card stack' },
          h('p', err.message || 'Errore imprevisto.'),
          h('div', { class: 'row' },
            h('button', { class: 'btn primario', onclick: () => r('riprova') }, 'Riprova'),
            singolo ? null : h('button', { class: 'btn', onclick: () => r('salta') }, 'Salta questo passo'))));
        promessaUscita.then(r);
      });
      if (scelta === 'esci' || scelta === 'termina') return scelta;
      if (scelta === 'salta' || scelta === 'saltato') { ctrl.abort(); toast('Passo saltato'); return 'saltato'; }
    }
  }
}

// Allenamento infinito: un esercizio dopo l'altro finché non premi "Termina".
// Ogni volta si rilegge lo stato (carte in scadenza, lacune, punteggi recenti) e si sceglie il passo più utile.
async function infinita(box, vai, attuale) {
  const inizio = Date.now();
  const fatti = [];
  const risultati = [];
  const tempo = h('span');
  const timer = setInterval(() => { tempo.textContent = durata((Date.now() - inizio) / 1000); }, 1000);
  try {
    for (;;) {
      if (!attuale()) return;
      const stato = await api.get('/api/allenamento/stato');
      const p = { ...prossimoEsercizio(stato, fatti, Math.random, oggi()), infinito: true };
      const esito = await eseguiPasso(box, p, { indice: fatti.length, passi: [], vai, attuale, infinito: { tempo } });
      if (esito === 'esci' || !attuale()) return;
      if (esito === 'termina') break;
      fatti.push(p.id);
      if (esito !== 'saltato') {
        risultati.push({ nome: p.nome, punteggio: esito && esito.punteggio, livello: esito && esito.livello, record: esito && esito.record });
        if (ESERCIZI[p.id] && p.id !== 'difficili') segnaPasso(oggi(), p.id);
      }
    }
  } finally {
    clearInterval(timer);
  }
  const secondi = Math.round((Date.now() - inizio) / 1000);
  let serie = null;
  if (risultati.length) serie = (await api.post('/api/sessione', { tipo: 'infinita', durata: secondi })).serie;
  svuota(box, h('div', { class: 'card stack' },
    h('div', { class: 'festa' }, h('div', { class: 'grande' }, risultati.length ? '💪' : '👋'),
      h('h1', risultati.length ? `${risultati.length} esercizi in ${durata(secondi)}` : 'Allenamento chiuso')),
    serie != null ? h('p', { class: 'center muted', style: { margin: 0 } }, `Serie: ${serie} ${serie === 1 ? 'giorno' : 'giorni'} di fila`) : null,
    risultati.length ? h('ul', { class: 'lista small' }, risultati.map((r) => h('li', { class: 'row between' },
      h('span', r.nome, r.record ? ' 🏆' : ''), h('span', { class: 'muted' }, r.punteggio != null ? r.punteggio + '%' : '✓')))) : null,
    ...risultati.filter((r) => r.livello).map((r) => h('p', { class: 'chip inglese' }, `Livello inglese: ${r.livello.da} → ${r.livello.a}`)),
    h('button', { class: 'btn primario pieno', onclick: () => vai('oggi') }, 'Torna a Oggi'),
    h('button', { class: 'btn pieno', onclick: () => vai('sessione/infinita') }, 'Ricomincia')));
}
