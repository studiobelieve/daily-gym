// Lavoro sulle lacune: esercizi brevi generati sui tuoi errori ricorrenti (da writing e speaking).
// Ogni risposta giusta "consuma" un errore della categoria; quando arriva a zero, la lacuna è superata.
import { h, svuota, caricamento } from '../ui.js';
import { api } from '../api.js';
import { inglese, suggerimentoTocco } from '../parola.js';
import { confronta } from '../shared/testo.js';

export async function avvia(box, opz) {
  svuota(box, caricamento('Preparo esercizi sui tuoi errori ricorrenti…'));
  let dati;
  try {
    dati = await api.post('/api/lacune/esercizio', {});
  } catch (err) {
    if (err.status !== 404) throw err;
    await new Promise((ok) => svuota(box, h('div', { class: 'card vuoto stack' },
      h('div', { style: { fontSize: '2.2rem' } }, '🎯'),
      h('p', err.message),
      h('button', { class: 'btn primario pieno', onclick: ok }, 'Avanti'))));
    return { punteggio: 100, vuoto: true };
  }
  const inizio = Date.now();
  await new Promise((ok) => svuota(box, h('div', { class: 'card stack' },
    h('h2', { style: { margin: 0 } }, 'Lavoriamo sulle tue lacune'),
    h('p', { class: 'small', style: { margin: 0 } }, 'Esercizi sugli errori che fai più spesso nel writing e nello speaking. Non ti dico la regola: trovarla fa parte dell\'esercizio.'),
    h('p', { class: 'tiny muted', style: { margin: 0 } }, 'Ogni risposta giusta riduce la lacuna; quando arriva a zero è superata. Un errore che rifai la fa ripartire.'),
    h('button', { class: 'btn primario pieno', onclick: ok }, 'Inizia'))));

  const esiti = [];
  for (let i = 0; i < dati.items.length; i++) {
    if (opz.attuale && !opz.attuale()) return null;
    const it = dati.items[i];
    const input = h('input', { type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: false, placeholder: 'La tua risposta in inglese' });
    const risposta = await new Promise((ok) => {
      svuota(box, h('div', { class: 'card stack' },
        h('div', { class: 'tiny muted' }, `${i + 1} di ${dati.items.length}`),
        h('p', { class: 'small muted', style: { margin: 0 } }, it.istruzione),
        it.tipo === 'traduci' ? h('h2', { style: { fontWeight: 600, margin: 0 } }, it.testo) : inglese(it.testo, { tag: 'h2', stile: { fontWeight: 600, margin: 0 } }),
        input,
        h('button', { class: 'btn primario pieno', onclick: () => ok(input.value) }, 'Controlla'),
        h('button', { class: 'btn fantasma piccolo', onclick: () => ok('') }, 'Non lo so')));
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') ok(input.value); });
      setTimeout(() => input.focus(), 30);
    });
    const esito = risposta.trim() ? it.risposte.map((r) => confronta(r, risposta)).find((x) => x !== 'sbagliata') || 'sbagliata' : 'sbagliata';
    const giusto = esito !== 'sbagliata';
    esiti.push({ categoria: it.categoria, giusto });
    await new Promise((ok) => svuota(box, h('div', { class: 'card stack' },
      h('div', { class: 'row between' }, h('div', { style: { fontSize: '1.8rem' } }, giusto ? (esito === 'quasi' ? '≈ Quasi, va bene' : '✓ Giusto') : '✗'), h('span', { class: 'chip inglese' }, it.categoria)),
      h('div', h('span', { class: 'muted small' }, 'Risposta: '), inglese(it.risposte[0], { tag: 'strong', classe: 'giusto' })),
      risposta.trim() && !giusto ? h('div', { class: 'small' }, 'Hai scritto: ', h('span', { class: 'barrato' }, risposta)) : null,
      it.spiegazione ? h('p', { class: 'small', style: { margin: 0 } }, it.spiegazione) : null,
      suggerimentoTocco(),
      h('button', { class: 'btn primario pieno', onclick: ok }, i < dati.items.length - 1 ? 'Avanti' : 'Fine'))));
  }
  const r = await api.post('/api/lacune/risultato', { esiti, durata: Math.round((Date.now() - inizio) / 1000) });
  const lac = await api.get('/api/lacune');
  await new Promise((ok) => svuota(box, h('div', { class: 'card stack' },
    h('div', { class: 'center' }, h('p', { class: 'muted', style: { margin: 0 } }, 'Risposte giuste'), h('div', { class: 'voto-grande' }, r.punteggio + '%')),
    lac.categorie.length ? h('div', h('h3', 'Le tue lacune adesso'),
      h('ul', { class: 'lista small' }, lac.categorie.slice(0, 6).map((c) => h('li', { class: 'row between' }, h('span', c.categoria), h('span', { class: 'muted' }, `${c.volte} da superare`)))))
      : h('p', '🎉 Nessuna lacuna aperta!'),
    lac.risolti ? h('p', { class: 'tiny muted', style: { margin: 0 } }, `Errori già superati: ${lac.risolti}`) : null,
    h('button', { class: 'btn primario pieno', onclick: ok }, 'Avanti'))));
  return { punteggio: r.punteggio };
}
