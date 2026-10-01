// Pillola di cultura: leggi (o ascolta) un testo breve in inglese, poi 3 domande.
// Le domande diventano carte di ripasso, così il fatto resta anche tra un mese.
import { h, svuota, paragrafi, mescola, toast, icona, caricamento } from '../ui.js';
import { api } from '../api.js';
import { parla, fermaAudio } from '../voce.js';

const CATEGORIE = { storia: 'Storia', scienza: 'Scienza', geografia: 'Geografia', arte: 'Arte e cultura', economia: 'Economia e business', filosofia: 'Filosofia e mente', tecnologia: 'Tecnologia' };

export async function avvia(box, opz) {
  svuota(box, caricamento('Preparo la pillola di oggi (leggo la fonte e la adatto al tuo livello)…'));
  const { pillola } = opz.pillolaId ? await api.get('/api/pillole/' + opz.pillolaId) : await api.post('/api/pillola', {});
  return mostraPillola(box, pillola, opz);
}

export async function mostraPillola(box, p, opz = {}) {
  const inizio = Date.now();
  const glossario = p.glossario.filter((g) => !g.daRicordare);
  const daRicordare = (p.glossario.find((g) => g.daRicordare) || {}).it;
  let inAscolto = false;
  const btnAscolta = h('button', { class: 'btn piccolo', onclick: async () => {
    if (inAscolto) { fermaAudio(); inAscolto = false; btnAscolta.lastChild.textContent = ' Ascolta'; return; }
    inAscolto = true;
    btnAscolta.lastChild.textContent = ' Ferma';
    for (const par of p.testo.split(/\n\s*\n/)) {
      if (!inAscolto || (opz.segnale && opz.segnale.aborted)) break;
      await parla(par.trim());
    }
    inAscolto = false;
    btnAscolta.lastChild.textContent = ' Ascolta';
  } }, icona('audio'), h('span', ' Ascolta'));

  await new Promise((ok) => svuota(box, h('article', { class: 'card stack' },
    h('div', { class: 'row between' }, h('span', { class: 'chip cultura' }, CATEGORIE[p.categoria] || p.categoria), h('span', { class: 'chip' }, p.livello)),
    h('h1', p.titolo),
    btnAscolta,
    h('div', { class: 'testo-pillola' }, paragrafi(p.testo)),
    glossario.length ? h('div', { class: 'stack' },
      h('h3', 'Parole utili'),
      h('ul', { class: 'lista small' }, glossario.map((g) => {
        const b = h('button', { class: 'btn piccolo', onclick: async () => {
          b.disabled = true;
          await api.post('/api/carte', { tipo: 'en', fronte: g.en, retro: g.it, nota: `Da: ${p.titolo}` });
          b.textContent = '✓';
          toast('Aggiunta alle carte');
        } }, '+ carta');
        return h('li', { class: 'row between' }, h('span', { class: 'grow' }, h('strong', g.en), ' — ', g.it), b);
      }))) : null,
    p.fonte_url ? h('p', { class: 'tiny muted' }, 'Fonte: ', h('a', { href: p.fonte_url, target: '_blank', rel: 'noopener' }, 'Wikipedia'), ' (testo adattato).') : null,
    h('button', { class: 'btn primario pieno', onclick: () => { fermaAudio(); inAscolto = false; ok(); } }, p.completata ? 'Rifai il quiz' : 'Vai al quiz'))));

  let giuste = 0;
  for (let i = 0; i < p.domande.length; i++) {
    const d = p.domande[i];
    const ok = await new Promise((fatto) => {
      const opzioni = mescola([d.risposta, ...d.sbagliate]);
      const bottoni = opzioni.map((o) => h('button', { onclick: () => scegli(o) }, o));
      const scegli = (o) => {
        bottoni.forEach((b) => { b.disabled = true; if (b.textContent === d.risposta) b.classList.add('giusta'); else if (b.textContent === o) b.classList.add('sbagliata'); });
        setTimeout(() => fatto(o === d.risposta), o === d.risposta ? 600 : 1400);
      };
      svuota(box, h('div', { class: 'card stack' },
        h('div', { class: 'tiny muted' }, `Domanda ${i + 1} di ${p.domande.length}`),
        h('h2', { style: { fontWeight: 600 } }, d.domanda),
        h('div', { class: 'opzioni' }, bottoni)));
    });
    if (ok) giuste++;
  }
  const punteggio = p.domande.length ? Math.round((giuste / p.domande.length) * 100) : 100;
  const r = await api.post(`/api/pillole/${p.id}/completa`, { punteggio, durata: Math.round((Date.now() - inizio) / 1000) });
  await new Promise((ok) => svuota(box, h('div', { class: 'card stack center' },
    h('div', { class: 'voto-grande' }, `${giuste}/${p.domande.length}`),
    daRicordare ? h('div', { class: 'card', style: { textAlign: 'left' } }, h('div', { class: 'tiny muted' }, 'Da ricordare'), h('p', { style: { margin: 0 } }, daRicordare)) : null,
    h('p', { class: 'small muted' }, p.completata ? 'Quiz ripetuto.' : 'Le domande sono diventate carte di ripasso: le ritroverai nei prossimi giorni.'),
    h('button', { class: 'btn primario pieno', onclick: ok }, 'Avanti'))));
  return { punteggio, livello: r.livello };
}
