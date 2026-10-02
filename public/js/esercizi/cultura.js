// Pillola di cultura: leggi (o ascolta) un testo breve in inglese, poi 3 domande.
// Le domande diventano carte di ripasso, così il fatto resta anche tra un mese.
import { h, svuota, mescola, toast, icona, caricamento } from '../ui.js';
import { inglese, ingleseParagrafi, suggerimentoTocco } from '../parola.js';
import { api } from '../api.js';
import { parla, fermaAudio } from '../voce.js';

const CATEGORIE = { antica: 'Storia antica e medievale', moderna: 'Storia moderna', contemporanea: 'Storia contemporanea', scienza: 'Scienza', geografia: 'Luoghi e viaggi', arte: 'Arte, cinema e musica', economia: 'Economia, finanza e business', filosofia: 'Filosofia e psicologia', tecnologia: 'Tecnologia', storia: 'Storia', libero: 'A tua scelta' };
const ICONE = { contemporanea: '📰', moderna: '⚔️', antica: '🏛', scienza: '🔬', economia: '📈', filosofia: '🧠', arte: '🎨', tecnologia: '💡', geografia: '🌍' };

export async function avvia(box, opz) {
  // Nella sessione del giorno: la pillola di oggi. Dalla Palestra: sempre una nuova, quante ne vuoi.
  let richiesta = {};
  if (opz.singolo && !opz.pillolaId) {
    richiesta = await scegliArgomento(box);
    richiesta.nuova = true;
  }
  svuota(box, caricamento('Preparo la pillola (leggo la fonte e la adatto al tuo livello)…'));
  const { pillola } = opz.pillolaId ? await api.get('/api/pillole/' + opz.pillolaId) : await api.post('/api/pillola', richiesta);
  return mostraPillola(box, pillola, opz);
}

function scegliArgomento(box) {
  return new Promise((ok) => {
    const input = h('input', { type: 'text', placeholder: 'es. Napoli, caffè, buchi neri, Beatles…', maxlength: 80 });
    const vai = () => { const t = input.value.trim(); if (t) ok({ argomento: t }); };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') vai(); });
    svuota(box, h('div', { class: 'stack' },
      h('div', { class: 'card stack' },
        h('h2', { style: { margin: 0 } }, 'Nuova pillola'),
        h('p', { class: 'small muted', style: { margin: 0 } }, 'Una pagina vera di Wikipedia, riscritta breve e al tuo livello. Puoi farne quante vuoi.'),
        h('button', { class: 'btn primario pieno', onclick: () => ok({}) }, '🎲 A sorpresa')),
      h('div', { class: 'card stack' },
        h('h3', { style: { margin: 0 } }, 'Scegli un tema'),
        h('div', { class: 'tile-griglia' }, Object.entries(ICONE).map(([k, ic]) =>
          h('button', { class: 'btn', style: { justifyContent: 'flex-start' }, onclick: () => ok({ categoria: k }) }, ic + ' ' + CATEGORIE[k])))),
      h('div', { class: 'card stack' },
        h('h3', { style: { margin: 0 } }, 'Oppure scrivi tu l\'argomento'),
        h('div', { class: 'row' }, h('div', { class: 'grow' }, input), h('button', { class: 'btn primario', onclick: vai }, 'Vai')))));
  });
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
    inglese(p.titolo, { tag: 'h1' }),
    h('div', { class: 'row between' }, btnAscolta, h('span', { class: 'tiny muted' }, 'Testo al livello ' + p.livello)),
    suggerimentoTocco(),
    h('div', { class: 'testo-pillola' }, ingleseParagrafi(p.testo)),
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
      const area = h('div', { class: 'opzioni' }, bottoni);
      // Dopo la risposta le opzioni diventano testo: ogni parola si può toccare e salvare.
      const scegli = (o) => {
        svuota(area, opzioni.map((x) => h('div', { class: 'opzione-fatta ' + (x === d.risposta ? 'giusta' : x === o ? 'sbagliata' : '') },
          x === d.risposta ? '✓ ' : x === o ? '✗ ' : '', inglese(x))),
        suggerimentoTocco(),
        h('button', { class: 'btn primario pieno', onclick: () => fatto(o === d.risposta) }, i < p.domande.length - 1 ? 'Prossima domanda' : 'Fine quiz'));
      };
      svuota(box, h('div', { class: 'card stack' },
        h('div', { class: 'tiny muted' }, `Domanda ${i + 1} di ${p.domande.length}`),
        inglese(d.domanda, { tag: 'h2', stile: { fontWeight: 600 } }),
        area));
    });
    if (ok) giuste++;
  }
  const punteggio = p.domande.length ? Math.round((giuste / p.domande.length) * 100) : 100;
  const r = await api.post(`/api/pillole/${p.id}/completa`, { punteggio, durata: Math.round((Date.now() - inizio) / 1000) });
  await new Promise((ok) => svuota(box, h('div', { class: 'card stack center' },
    h('div', { class: 'voto-grande' }, `${giuste}/${p.domande.length}`),
    daRicordare ? h('div', { class: 'card', style: { textAlign: 'left' } }, h('div', { class: 'tiny muted' }, 'Da ricordare'), h('p', { style: { margin: 0 } }, daRicordare)) : null,
    h('p', { class: 'small muted' }, p.completata ? 'Quiz ripetuto.' : 'Le domande sono diventate carte di ripasso: le ritroverai nei prossimi giorni.'),
    giudizio(p),
    h('button', { class: 'btn primario pieno', onclick: ok }, 'Avanti'))));
  return { punteggio, livello: r.livello };
}

// "Com'era il testo?": sposta di mezzo livello le prossime pillole.
function giudizio(p) {
  const esito = h('p', { class: 'tiny muted', style: { margin: 0 } });
  const scelte = [[-1, 'Troppo facile'], [0, 'Giusto'], [1, 'Troppo difficile']];
  const bottoni = scelte.map(([v, nome]) => h('button', { class: 'btn piccolo' + (p.difficolta === v ? ' primario' : ''), onclick: async () => {
    const r = await api.post(`/api/pillole/${p.id}/difficolta`, { valore: v });
    p.difficolta = v;
    bottoni.forEach((b, i) => b.classList.toggle('primario', scelte[i][0] === v));
    esito.textContent = v === 0 ? `Perfetto: le prossime pillole restano al livello ${r.prossimoLivello}.` : `Ok: le prossime pillole saranno al livello ${r.prossimoLivello}.`;
  } }, nome));
  return h('div', { class: 'card stack', style: { textAlign: 'left' } },
    h('div', { class: 'small' }, h('strong', 'Com\'era il testo per te?')),
    h('div', { class: 'row' }, bottoni), esito);
}
