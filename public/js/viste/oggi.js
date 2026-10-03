// Schermata principale: la sessione di oggi, la serie, gli obiettivi in corso.
import { h, svuota, segmenti, barra, dataLunga } from '../ui.js';
import { api, oggi } from '../api.js';
import { pianoDelGiorno, minutiTotali } from '../shared/piano.js';
import { passiFatti, durataPreferita, impostaDurata, chiavePasso } from '../locale.js';
import { formatta, STATI, oreMinuti } from '../shared/obiettivi.js';

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
  const cambia = (v) => { tipo = v; impostaDurata(v); disegnaHero(); };
  const scelta = () => h('div', { style: { marginTop: '10px' } },
    segmenti([['corta', 'Corta · 10\''], ['completa', 'Completa · 20\''], ['infinita', 'Infinito ∞']], tipo, cambia));
  const disegnaHero = () => {
    if (tipo === 'infinita') {
      svuota(heroBox, h('div', { class: 'hero' },
        h('div', { class: 'titolo' }, 'Allenamento infinito'),
        scelta(),
        h('p', { class: 'small', style: { margin: '12px 0' } }, 'Un esercizio dopo l\'altro, finché non ti fermi tu:'),
        h('ul', { class: 'passi' },
          h('li', h('span', { class: 'pallino', style: { borderColor: COLORE_AREA.costanza } }), h('span', { class: 't grow' }, 'Ripasso delle carte', h('span', { class: 'muted small' }, ` · ${d.daRipassare} in scadenza`))),
          h('li', h('span', { class: 'pallino', style: { borderColor: COLORE_AREA.inglese } }), h('span', { class: 't grow' }, 'Le tue lacune di inglese', h('span', { class: 'muted small' }, d.lacune ? ` · ${d.lacune} da superare` : ' · ancora nessuna'))),
          h('li', h('span', { class: 'pallino', style: { borderColor: COLORE_AREA.memoria } }), h('span', { class: 't grow' }, 'Tutti gli esercizi della Palestra, a rotazione')),
          h('li', h('span', { class: 'pallino', style: { borderColor: COLORE_AREA.cultura } }), h('span', { class: 't grow' }, 'Cultura ogni 2 esercizi: pillole e "Ti ricordi?"'))),
        h('button', { class: 'btn primario pieno', onclick: () => vai('sessione/infinita') }, 'Inizia l\'allenamento')));
      return;
    }
    const passi = pianoDelGiorno(g, tipo, { ai: d.ai, testFatto: d.testFatto, lacune: d.lacune });
    const locali = passiFatti(g);
    const fatti = passi.filter((p) => passoFatto(p, locali, d.fatteOggi));
    const tutto = fatti.length === passi.length;
    const iniziata = fatti.length > 0;
    svuota(heroBox, h('div', { class: 'hero' },
      h('div', { class: 'row between' },
        h('div', { class: 'titolo' }, tutto ? 'Sessione completata' : 'La sessione di oggi'),
        h('span', { class: 'chip' }, `~${minutiTotali(passi)} min`)),
      scelta(),
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
          tipo === 'corta' ? h('button', { class: 'btn pieno', onclick: () => cambia('completa') }, 'Passa alla completa') : null,
          h('button', { class: 'btn pieno', onclick: () => vai('sessione/infinita') }, 'Continua con l\'allenamento infinito ∞'))
        : h('button', { class: 'btn primario pieno', onclick: () => vai('sessione/' + tipo) }, iniziata ? 'Continua' : 'Inizia')));
  };
  disegnaHero();

  const sett = d.settimana;
  const mancano = Math.max(0, sett.obiettivo - sett.minuti);
  const settimana = h('div', { class: 'card stack' },
    h('div', { class: 'row between' }, h('strong', { class: 'small grow' }, `Allenarsi ${oreMinuti(sett.obiettivo)} questa settimana`),
      h('span', { class: 'stato ' + (sett.raggiunto ? 'raggiunto' : sett.minuti * 100 / sett.obiettivo >= sett.attesoPct - 10 ? 'in_linea' : 'in_ritardo') },
        sett.raggiunto ? 'Raggiunto 🎉' : sett.minuti * 100 / sett.obiettivo >= sett.attesoPct - 10 ? 'In linea' : 'In ritardo')),
    barra(Math.min(100, Math.round((sett.minuti / sett.obiettivo) * 100)), { atteso: sett.attesoPct }),
    h('div', { class: 'tiny muted' }, sett.raggiunto
      ? `${oreMinuti(sett.minuti)} di esercizi: obiettivo raggiunto.`
      : `${oreMinuti(sett.minuti)} su ${oreMinuti(sett.obiettivo)} · mancano ${oreMinuti(mancano)} in ${sett.giorniRimasti} ${sett.giorniRimasti === 1 ? 'giorno' : 'giorni'} (~${Math.ceil(mancano / sett.giorniRimasti)} min al giorno)`));

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
    h('div', { class: 'sezione' }, h('h2', 'Obiettivo della settimana'), settimana),
    h('div', { class: 'sezione' }, h('h2', 'Obiettivi in corso'), obiettivi));
}
