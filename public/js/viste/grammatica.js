// Il percorso di grammatica: argomenti per livello con lo stato (nuovo, in corso, consolidato).
import { h, svuota, barra } from '../ui.js';
import { api } from '../api.js';

export async function mostra(box, { vai }) {
  const d = await api.get('/api/grammatica');
  const stato = (x) => (x.consolidato ? ['✓', 'Consolidato', 'var(--good)'] : x.volte ? [`${x.ultimoVoto}%`, `${(x.giorni_ok || []).length}/${d.giorniPerConsolidare} giorni ok`, 'var(--accent)'] : ['·', 'Da fare', 'var(--text-2)']);
  svuota(box,
    h('h1', 'Grammatica'),
    h('p', { class: 'small muted' }, `Prima la spiegazione, poi gli esercizi. Un argomento è consolidato con almeno l'${d.soglia}% in ${d.giorniPerConsolidare} giorni diversi; con l'80% degli argomenti consolidati passi al livello successivo.`),
    h('div', { class: 'card stack' },
      h('div', { class: 'row between' }, h('strong', `Il tuo livello: ${d.livello}`), h('span', { class: 'small muted' }, `${Math.round(d.quota * 100)}% consolidato`)),
      barra(Math.round(d.quota * 100), { atteso: Math.round(d.quotaLivello * 100) }),
      d.prossimo ? h('button', { class: 'btn primario pieno', onclick: () => vai('esercizio/grammatica/' + d.prossimo.id) },
        `${d.prossimo.ripasso ? 'Ripasso' : 'Continua'}: ${(Object.values(d.programma).flat().find((x) => x.id === d.prossimo.id) || {}).titolo || ''}`) : null),
    d.livelli.map((l) => h('div', { class: 'sezione' },
      h('h2', l, l === d.livello ? h('span', { class: 'chip inglese', style: { marginLeft: '8px' } }, 'il tuo livello') : null),
      h('div', { class: 'card' }, h('ul', { class: 'lista' }, d.programma[l].map((x) => {
        const [segno, testo, colore] = stato(x);
        return h('li', { class: 'row' },
          h('span', { style: { width: '42px', fontWeight: 700, color: colore } }, segno),
          h('div', { class: 'grow' }, h('strong', { class: 'small' }, x.titolo), h('div', { class: 'tiny muted' }, testo)),
          h('button', { class: 'btn piccolo', onclick: () => vai('esercizio/grammatica/' + x.id) }, x.volte ? 'Rifai' : 'Studia'));
      }))))));
}
