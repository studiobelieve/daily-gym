// Riepilogo settimanale: questi 7 giorni contro i 7 precedenti.
import { h, svuota, caricamento, dataBreve } from '../ui.js';
import { api } from '../api.js';

const NOMI = { span: 'Digit span (cifre)', palazzo: 'Palazzo (oggetti)', focus: 'Focus (%)', grammatica: 'Grammatica (%)', writing: 'Writing (voto)', dettato: 'Dettato (%)', speaking: 'Speaking (voto)', cultura: 'Quiz cultura (%)' };

export async function vistaRiepilogo(r) {
  const riga = (nome, ora, prima, unita = '') => {
    const delta = prima == null || ora == null ? null : ora - prima;
    return h('li', { class: 'row between' },
      h('span', { class: 'grow' }, nome),
      h('strong', ora == null ? '—' : `${ora}${unita}`),
      h('span', { class: 'tiny', style: { width: '64px', textAlign: 'right', color: delta == null || delta === 0 ? 'var(--muted)' : delta > 0 ? 'var(--good)' : 'var(--critical)' } },
        delta == null ? '' : delta === 0 ? '=' : `${delta > 0 ? '▲' : '▼'} ${Math.abs(Math.round(delta * 10) / 10)}`));
  };
  const q = r.questa, p = r.prima;
  const tipi = Object.keys(NOMI).filter((t) => q.perTipo[t] || p.perTipo[t]);
  const valore = (x, t) => (x.perTipo[t] ? (t === 'span' || t === 'palazzo' ? x.perTipo[t].max : x.perTipo[t].media) : null);
  return h('div', { class: 'stack' },
    h('div', { class: 'card' },
      h('div', { class: 'tiny muted' }, `${dataBreve(r.da)} – ${dataBreve(r.a)} · confronto con la settimana prima`),
      h('ul', { class: 'lista' },
        riga('Sessioni completate', q.sessioni, p.sessioni, '/7'),
        riga('Carte ripassate', q.ripassi, p.ripassi),
        riga('Carte ricordate', q.ripassi ? q.ritenzione : null, p.ripassi ? p.ritenzione : null, '%'),
        riga('Carte nuove create', q.carteNuove, p.carteNuove))),
    tipi.length ? h('div', { class: 'card' }, h('h3', 'Esercizi'), h('ul', { class: 'lista' }, tipi.map((t) => riga(NOMI[t], valore(q, t), valore(p, t))))) : null,
    r.record.length ? h('div', { class: 'card' }, h('h3', '🏆 Record della settimana'),
      h('ul', { class: 'lista' }, r.record.map((x) => h('li', x.tipo === 'span' ? `Digit span: ${x.valore} cifre` : `Palazzo: ${x.valore} oggetti tutti giusti`)))) : null,
    h('p', { class: 'small muted' }, q.sessioni >= 6 ? 'Settimana quasi perfetta. Continua così.' : q.sessioni >= 4 ? 'Buona costanza. Prova a non saltare più di un giorno.' : 'Settimana leggera: anche 10 minuti al giorno fanno la differenza, più di un\'ora una volta a settimana.'));
}

export async function avvia(box) {
  svuota(box, caricamento());
  const r = await api.get('/api/riepilogo');
  const vista = await vistaRiepilogo(r);
  await new Promise((ok) => svuota(box, h('h2', 'La tua settimana'), vista, h('button', { class: 'btn primario pieno', style: { marginTop: '12px' }, onclick: ok }, 'Chiudi la settimana')));
  return { punteggio: 100 };
}
