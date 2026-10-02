// Writing: una consegna breve al tuo livello, la scrivi, l'AI corregge e spiega.
// Gli errori diventano carte "Correggi la frase" da ripassare.
import { h, svuota, icona, caricamento, toast } from '../ui.js';
import { api } from '../api.js';
import { parla } from '../voce.js';
import { inglese, suggerimentoTocco } from '../parola.js';

export async function avvia(box) {
  svuota(box, caricamento('Preparo la consegna…'));
  const c = await api.post('/api/writing/consegna', {});
  const inizio = Date.now();
  const area = h('textarea', { rows: 8, placeholder: 'Scrivi qui in inglese (3-6 frasi)…', spellcheck: false, autocapitalize: 'sentences' });
  const conta = h('span', { class: 'tiny muted' }, '0 parole');
  area.addEventListener('input', () => { const n = area.value.trim().split(/\s+/).filter(Boolean).length; conta.textContent = `${n} ${n === 1 ? 'parola' : 'parole'}`; });

  let correzione;
  for (;;) {
    await new Promise((ok) => svuota(box, h('div', { class: 'card stack' },
      h('div', { class: 'row between' }, h('span', { class: 'chip inglese' }, c.tema === 'lavoro' ? 'Lavoro' : 'Cultura e vita'), h('span', { class: 'tiny muted' }, '~5 minuti')),
      h('h2', c.titolo),
      h('div', { class: 'row' }, inglese(c.consegna, { tag: 'p', classe: 'grow', stile: { margin: 0, fontWeight: 600 } }), h('button', { class: 'icona-btn', 'aria-label': 'Ascolta', onclick: () => parla(c.consegna) }, icona('audio'))),
      c.aiuto ? h('p', { class: 'small muted' }, '💡 ' + c.aiuto) : null,
      c.parole.length ? h('div', { class: 'row' }, c.parole.map((p) => h('span', { class: 'chip', title: p.it }, inglese(p.en), ` = ${p.it}`))) : null,
      suggerimentoTocco(),
      area,
      h('div', { class: 'row between' }, conta,
        h('button', { class: 'btn primario', onclick: () => { if (area.value.trim().split(/\s+/).length < 5) return toast('Scrivi almeno una o due frasi.'); ok(); } }, 'Correggi')))));
    svuota(box, caricamento('Correggo il tuo testo…'));
    try {
      correzione = await api.post('/api/writing/correggi', { consegna: c.consegna, testo: area.value });
      break;
    } catch (err) {
      toast(err.message, 'errore');
    }
  }

  const k = correzione;
  const scelte = k.errori.map(() => true);
  await new Promise((ok) => svuota(box, h('div', { class: 'stack correzione' },
    h('div', { class: 'card row' },
      h('div', { class: 'voto-grande', style: { color: k.voto >= 85 ? 'var(--good)' : k.voto >= 60 ? 'var(--accent)' : 'var(--warning)' } }, k.voto),
      h('div', { class: 'grow small' }, k.bravo ? h('p', { style: { margin: 0 } }, '👏 ' + k.bravo) : null)),
    k.errori.length ? h('div', { class: 'card' },
      h('h3', `Errori (${k.errori.length})`),
      k.errori.map((e, i) => h('div', { class: 'errore-riga' },
        h('label', { class: 'row', style: { alignItems: 'flex-start' } },
          h('input', { type: 'checkbox', checked: true, onchange: (ev) => { scelte[i] = ev.target.checked; }, style: { marginTop: '5px' } }),
          h('div', { class: 'grow' },
            h('div', h('span', { class: 'barrato' }, e.sbagliato), ' → ', inglese(e.giusto, { classe: 'giusto' })),
            e.perche ? h('div', { class: 'small muted' }, e.perche) : null)))),
      h('p', { class: 'tiny muted', style: { marginTop: '8px' } }, 'Gli errori spuntati diventano carte di ripasso.')) : h('div', { class: 'card' }, h('p', { style: { margin: 0 } }, 'Nessun errore importante. 🎯')),
    k.corretto ? h('div', { class: 'card' }, h('h3', 'Il tuo testo corretto'), inglese(k.corretto, { tag: 'p', stile: { whiteSpace: 'pre-wrap', margin: 0 } }), suggerimentoTocco()) : null,
    k.naturale ? h('div', { class: 'card' },
      h('div', { class: 'row between' }, h('h3', { style: { margin: 0 } }, 'Come lo direbbe un madrelingua'), h('button', { class: 'icona-btn', 'aria-label': 'Ascolta', onclick: () => parla(k.naturale) }, icona('audio'))),
      inglese(k.naturale, { tag: 'p', stile: { whiteSpace: 'pre-wrap', margin: '8px 0 0' } })) : null,
    k.consiglio ? h('div', { class: 'card small' }, '🎯 ', k.consiglio) : null,
    h('button', { class: 'btn primario pieno', onclick: ok }, 'Salva e continua'))));

  const daSalvare = k.errori.filter((_, i) => scelte[i]).map((e) => ({
    tipo: 'ricorda', fronte: `Correggi: «${e.sbagliato}»`, retro: e.giusto, nota: e.perche, extra: { origine: 'writing' },
  }));
  if (daSalvare.length) await api.post('/api/carte/multi', { carte: daSalvare });
  const r = await api.post('/api/attivita', {
    tipo: 'writing', punteggio: k.voto, durata: Math.round((Date.now() - inizio) / 1000),
    dettagli: { consegna: c.consegna, testo: area.value, errori: k.errori.length },
  });
  return { punteggio: k.voto, livello: r.livello };
}
