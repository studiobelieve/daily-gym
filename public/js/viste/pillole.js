// Archivio delle pillole di cultura lette.
import { h, svuota, dataBreve, icona } from '../ui.js';
import { api } from '../api.js';
import { mostraPillola } from '../esercizi/cultura.js';

export async function mostra(box, { parametri, vai }) {
  if (parametri[0]) {
    const { pillola } = await api.get('/api/pillole/' + parametri[0]);
    const corpo = h('div');
    svuota(box, h('button', { class: 'btn piccolo fantasma', onclick: () => vai('pillole') }, icona('indietro'), 'Archivio'), corpo);
    await mostraPillola(corpo, pillola);
    return vai('pillole');
  }
  const { pillole, categorie } = await api.get('/api/pillole');
  svuota(box,
    h('h1', 'Pillole di cultura'),
    h('p', { class: 'small muted' }, `${pillole.filter((p) => p.completata).length} completate. Ogni pillola parte da una pagina di Wikipedia ed è riscritta al tuo livello.`),
    pillole.length
      ? h('div', { class: 'card' }, h('ul', { class: 'lista' }, pillole.map((p) => h('li', { class: 'row' },
        h('div', { class: 'grow' },
          h('strong', p.titolo),
          h('div', { class: 'row', style: { marginTop: '4px' } },
            h('span', { class: 'chip cultura' }, categorie[p.categoria] || p.categoria),
            h('span', { class: 'tiny muted' }, `${dataBreve(p.giorno)} · ${p.livello}${p.completata ? ' · ✓' : ''}`))),
        h('button', { class: 'btn piccolo', onclick: () => vai('pillole/' + p.id) }, 'Apri')))))
      : h('div', { class: 'vuoto' }, 'Nessuna pillola ancora: la prima arriva con la sessione del martedì o dalla Palestra.'));
}
