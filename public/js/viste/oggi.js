// Schermata principale: la sessione di oggi, la serie, gli obiettivi in corso.
import { h, svuota, segmenti, barra, dataLunga } from '../ui.js';
import { api, oggi } from '../api.js';
import { pianoDelGiorno, minutiTotali } from '../shared/piano.js';
import { passiFatti, durataPreferita, impostaDurata, chiavePasso } from '../locale.js';
import { formatta, STATI } from '../shared/obiettivi.js';

const COLORE_AREA = { inglese: 'var(--accent)', memoria: 'var(--memoria)', cultura: 'var(--cultura)', costanza: 'var(--costanza)' };

export function passoFatto(p, locali, server) {
  return locali.includes(chiavePasso(p)) || (server.includes(p.id) && !p.scenario) ||
    (p.id === 'test' && server.includes('test'));
}

export async function mostra(box, { vai }) {
  const g = oggi();
  const d = await api.get('/api/oggi');
  let tipo = durataPreferita();

  const ora = new Date().getHours();
  const saluto = ora < 12 ? 'Buongiorno' : ora < 18 ? 'Buon pomeriggio' : 'Buonasera';

  const heroBox = h('div');
  const disegnaHero = () => {
    const passi = pianoDelGiorno(g, tipo, { ai: d.ai, testFatto: d.testFatto });
    const locali = passiFatti(g);
    const fatti = passi.filter((p) => passoFatto(p, locali, d.fatteOggi));
    const tutto = fatti.length === passi.length;
    const iniziata = fatti.length > 0;
    svuota(heroBox, h('div', { class: 'hero' },
      h('div', { class: 'row between' },
        h('div', { class: 'titolo' }, tutto ? 'Sessione completata' : 'La sessione di oggi'),
        h('span', { class: 'chip' }, `~${minutiTotali(passi)} min`)),
      h('div', { style: { marginTop: '10px' } }, segmenti([['corta', 'Corta · 10\''], ['completa', 'Completa · 20\'']], tipo, (v) => {
        tipo = v; impostaDurata(v); disegnaHero();
      })),
      h('ul', { class: 'passi' }, passi.map((p) => {
        const f = fatti.includes(p);
        return h('li', { class: f ? 'fatto' : '' },
          h('span', { class: 'pallino', style: { borderColor: f ? '' : COLORE_AREA[p.area] } }, f ? '✓' : ''),
          h('span', { class: 't grow' }, p.nome, p.id === 'ripasso' && !f ? h('span', { class: 'muted small' }, ` · ${d.daRipassare} da ripassare${d.nuoveDisponibili ? ', nuove in arrivo' : ''}`) : null),
          h('span', { class: 'muted tiny' }, p.minuti + '\''));
      })),
      tutto
        ? h('div', { class: 'stack' },
          h('p', { class: 'small' }, tipo === 'corta' ? 'Ottimo lavoro. Se hai altri 10 minuti, passa alla completa.' : 'Ottimo lavoro: ci vediamo domani.'),
          tipo === 'corta' ? h('button', { class: 'btn pieno', onclick: () => { tipo = 'completa'; impostaDurata('completa'); disegnaHero(); } }, 'Passa alla completa') : null)
        : h('button', { class: 'btn primario pieno', onclick: () => vai('sessione/' + tipo) }, iniziata ? 'Continua' : 'Inizia')));
  };
  disegnaHero();

  const obiettivi = d.obiettivi.length
    ? h('div', { class: 'card stack' }, d.obiettivi.map((o) => h('div', { class: 'obiettivo' },
      h('div', { class: 'row between' }, h('strong', { class: 'small grow' }, o.titolo), h('span', { class: 'stato ' + o.avanzamento.stato }, STATI[o.avanzamento.stato])),
      h('div', { style: { margin: '6px 0 2px' } }, barra(o.avanzamento.pct, { atteso: o.avanzamento.attesoPct })),
      h('div', { class: 'tiny muted' }, `${formatta(o.metrica, o.avanzamento.attuale)} su ${formatta(o.metrica, o.target)} · ${o.avanzamento.giorniRimasti} giorni`))),
      h('button', { class: 'btn piccolo fantasma', onclick: () => vai('obiettivi') }, 'Tutti gli obiettivi →'))
    : h('div', { class: 'card' },
      h('p', { class: 'small' }, 'Non hai ancora obiettivi. Darsi un traguardo con una scadenza aiuta a restare costanti.'),
      h('button', { class: 'btn piccolo', onclick: () => vai('obiettivi') }, 'Imposta un obiettivo'));

  svuota(box,
    h('div', { class: 'saluto' },
      h('div', { class: 'data' }, dataLunga(g)),
      h('h1', saluto)),
    !d.ai ? h('div', { class: 'card small', style: { marginBottom: '12px' } },
      'Funzioni AI spente: manca ANTHROPIC_API_KEY su Railway. Pillole, writing, dettato e speaking vengono sostituiti da esercizi di memoria.') : null,
    heroBox,
    h('div', { class: 'tile-griglia', style: { marginTop: '12px' } },
      h('div', { class: 'tile' }, h('div', { class: 'num fiamma' }, d.serie), h('div', { class: 'lab' }, d.serie === 1 ? 'giorno di fila' : 'giorni di fila')),
      h('div', { class: 'tile' }, h('div', { class: 'num', style: { color: 'var(--accent)' } }, d.livello), h('div', { class: 'lab' }, 'livello inglese')),
      h('div', { class: 'tile' }, h('div', { class: 'num' }, d.daRipassare), h('div', { class: 'lab' }, 'carte da ripassare')),
      h('div', { class: 'tile' }, h('div', { class: 'num' }, d.nuoveDisponibili), h('div', { class: 'lab' }, 'carte nuove'))),
    d.pillola ? h('div', { class: 'card row', style: { marginTop: '12px' } },
      h('div', { class: 'grow' }, h('div', { class: 'tiny muted' }, 'Pillola di oggi'), h('strong', d.pillola.titolo)),
      h('button', { class: 'btn piccolo', onclick: () => vai('pillole/' + d.pillola.id) }, d.pillola.completata ? 'Rileggi' : 'Leggi')) : null,
    h('div', { class: 'sezione' }, h('h2', 'Obiettivi in corso'), obiettivi));
}
