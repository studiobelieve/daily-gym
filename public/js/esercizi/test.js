// Test di livello: domande dal facile al difficile; si ferma quando un livello va male.
import { h, svuota, mescola } from '../ui.js';
import { api } from '../api.js';
import { DOMANDE } from '../dati/test-livello.js';
import { livelloDaTest } from '../shared/livello-test.js';
import { LIVELLI } from '../shared/testo.js';

export async function avvia(box) {
  await new Promise((ok) => svuota(box, h('div', { class: 'card stack' },
    h('h2', 'Quanto inglese sai già?'),
    h('p', 'Rispondi a qualche domanda di grammatica e lessico, dalla più facile alla più difficile. Ci vogliono 5-8 minuti.'),
    h('p', { class: 'small muted' }, 'Se non sai, premi "Non lo so": tirare a indovinare falsa il risultato. È una stima di partenza: poi il livello si aggiusta da solo in base a come vai negli esercizi.'),
    h('button', { class: 'btn primario pieno', onclick: ok }, 'Inizia il test'))));

  const inizio = Date.now();
  const risultati = {};
  const livelliTest = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  let giuste = 0, fatte = 0;
  for (const liv of livelliTest) {
    const domande = DOMANDE.filter((d) => d[0] === liv);
    risultati[liv] = { giuste: 0, totali: domande.length };
    for (const [, testo, opzioni] of domande) {
      fatte++;
      const ok = await domanda(box, testo, opzioni, fatte);
      if (ok) { risultati[liv].giuste++; giuste++; }
    }
    // Livello andato male (1 o 0 su 5): inutile proseguire con quelli più difficili.
    if (risultati[liv].giuste <= 1) break;
  }

  const stimato = livelloDaTest(risultati);
  const sel = h('select', LIVELLI.map((l) => h('option', { value: l, selected: l === stimato }, l)));
  await new Promise((ok) => svuota(box, h('div', { class: 'card stack center' },
    h('p', { class: 'muted' }, 'Livello stimato'),
    h('div', { class: 'voto-grande', style: { color: 'var(--accent)' } }, stimato),
    h('p', { class: 'small' }, `${giuste} risposte giuste su ${fatte}.`),
    h('ul', { class: 'lista small', style: { textAlign: 'left' } }, Object.entries(risultati).map(([l, r]) =>
      h('li', { class: 'row between' }, h('span', l), h('span', `${r.giuste}/${r.totali}`)))),
    h('label', { class: 'campo', style: { textAlign: 'left' } }, h('span', 'Ti sembra giusto? Puoi correggerlo'), sel),
    h('button', { class: 'btn primario pieno', onclick: ok }, 'Conferma'))));

  const scelto = sel.value;
  await api.post('/api/livello', { livello: scelto, motivo: scelto === stimato ? 'test di livello' : `test di livello (stimato ${stimato}, corretto a mano)` });
  await api.post('/api/attivita', {
    tipo: 'test', punteggio: Math.round((giuste / fatte) * 100), valore: LIVELLI.indexOf(scelto),
    durata: Math.round((Date.now() - inizio) / 1000), dettagli: { risultati, stimato, scelto },
  });
  return { punteggio: Math.round((giuste / fatte) * 100) };
}

function domanda(box, testo, opzioni, n) {
  return new Promise((ok) => {
    const giusta = opzioni[0];
    const bottoni = mescola(opzioni).map((o) => h('button', { onclick: () => scegli(o) }, o));
    const scegli = (o) => {
      bottoni.forEach((b) => { b.disabled = true; if (b.textContent === giusta) b.classList.add('giusta'); else if (b.textContent === o) b.classList.add('sbagliata'); });
      setTimeout(() => ok(o === giusta), o === giusta ? 450 : 1100);
    };
    svuota(box, h('div', { class: 'card stack' },
      h('div', { class: 'tiny muted' }, `Domanda ${n}`),
      h('h2', { style: { fontWeight: 600 } }, testo),
      h('div', { class: 'opzioni' }, bottoni,
        h('button', { class: 'muted', onclick: () => { bottoni.forEach((b) => (b.disabled = true)); ok(false); } }, 'Non lo so'))));
  });
}
