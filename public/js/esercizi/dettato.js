// Dettato: ascolti una frase e la scrivi. Allena orecchio e ortografia insieme.
import { h, svuota, icona, caricamento, toast } from '../ui.js';
import { api } from '../api.js';
import { parla } from '../voce.js';
import { inglese, suggerimentoTocco } from '../parola.js';
import { confrontaFrase } from '../shared/testo.js';

export async function avvia(box, opz) {
  svuota(box, caricamento('Preparo le frasi…'));
  const { frasi } = await api.post('/api/dettato', {});
  const inizio = Date.now();
  const punteggi = [];

  await new Promise((ok) => svuota(box, h('div', { class: 'card stack' },
    h('h2', `Dettato: ${frasi.length} frasi`),
    h('p', 'Ascolta ogni frase e scrivila. Puoi riascoltarla quante volte vuoi, anche più lenta.'),
    h('p', { class: 'small muted' }, 'Accendi l\'audio del telefono. Maiuscole e punteggiatura non contano.'),
    h('button', { class: 'btn primario pieno', onclick: ok }, 'Inizia'))));

  for (let i = 0; i < frasi.length; i++) {
    if (opz.attuale && !opz.attuale()) return null;
    const f = frasi[i];
    const input = h('textarea', { rows: 3, placeholder: 'Scrivi quello che senti…', spellcheck: false, autocapitalize: 'off', autocomplete: 'off' });
    const scritto = await new Promise((ok) => {
      svuota(box, h('div', { class: 'card stack' },
        h('div', { class: 'tiny muted' }, `Frase ${i + 1} di ${frasi.length}`),
        h('div', { class: 'row' },
          h('button', { class: 'btn', onclick: () => parla(f.en) }, icona('audio'), ' Riascolta'),
          h('button', { class: 'btn', onclick: () => parla(f.en, { lento: true }) }, '🐢 Lento')),
        input,
        h('button', { class: 'btn primario pieno', onclick: () => ok(input.value) }, 'Controlla')));
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ok(input.value); } });
      parla(f.en).catch(() => {});
      setTimeout(() => input.focus(), 30);
    });
    const r = confrontaFrase(f.en, scritto);
    punteggi.push(r.punteggio);
    await new Promise((ok) => {
      const carta = h('button', { class: 'btn piccolo', onclick: async () => {
        carta.disabled = true;
        await api.post('/api/carte', { tipo: 'en', fronte: f.en, retro: f.it, nota: 'Dal dettato' });
        carta.textContent = '✓ Salvata';
        toast('Frase aggiunta alle carte');
      } }, '+ Salva come carta');
      svuota(box, h('div', { class: 'card stack' },
        h('div', { class: 'row between' }, h('strong', r.punteggio + '%'), h('button', { class: 'icona-btn', 'aria-label': 'Riascolta', onclick: () => parla(f.en) }, icona('audio'))),
        h('div', { style: { fontSize: '1.1rem', lineHeight: 1.9 } }, r.dettaglio.map((d) => h('span', { class: 'parola-dettato ' + d.esito, title: d.scritta ? 'hai scritto: ' + d.scritta : '' }, d.parola))),
        inglese(f.en, { tag: 'p', stile: { margin: 0, fontWeight: 600 } }),
        h('p', { class: 'small muted', style: { margin: 0 } }, f.it),
        suggerimentoTocco(),
        r.extra ? h('p', { class: 'tiny muted' }, `${r.extra} parole in più`) : null,
        h('div', { class: 'row' }, carta),
        h('button', { class: 'btn primario pieno', onclick: ok }, i < frasi.length - 1 ? 'Prossima frase' : 'Fine')));
    });
  }

  const punteggio = Math.round(punteggi.reduce((a, b) => a + b, 0) / punteggi.length);
  const r = await api.post('/api/attivita', { tipo: 'dettato', punteggio, durata: Math.round((Date.now() - inizio) / 1000), dettagli: { punteggi } });
  await new Promise((ok) => svuota(box, h('div', { class: 'card stack center' },
    h('p', { class: 'muted' }, 'Precisione del dettato'),
    h('div', { class: 'voto-grande' }, punteggio + '%'),
    h('button', { class: 'btn primario pieno', onclick: ok }, 'Avanti'))));
  return { punteggio, livello: r.livello };
}
