// Impostazioni: livello, modello AI, ritmo delle carte nuove, profilo, tema, backup.
import { h, svuota, campo, toast } from '../ui.js';
import { api } from '../api.js';

function tema() { try { return localStorage.getItem('dg_tema') || 'auto'; } catch { return 'auto'; } }
export function applicaTema(t = tema()) {
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
}

export async function mostra(box, { vai }) {
  const d = await api.get('/api/impostazioni');
  const salva = async (dati, msg = 'Salvato') => { await api.put('/api/impostazioni', dati); toast(msg); };

  const livello = h('select', d.livelli.map((l) => h('option', { value: l, selected: l === d.livello }, l)));
  livello.addEventListener('change', async () => {
    await api.post('/api/livello', { livello: livello.value, motivo: 'impostato a mano' });
    toast('Livello aggiornato a ' + livello.value);
  });

  const modello = h('select', Object.entries(d.modelli).map(([k, m]) =>
    h('option', { value: k, selected: k === d.modello }, `${m.nome} — $${m.input}/$${m.output} per milione di token`)));
  modello.addEventListener('change', () => salva({ modello: modello.value }, 'Modello AI aggiornato'));

  const nuove = h('input', { type: 'number', min: 0, max: 50, value: d.nuove_al_giorno });
  nuove.addEventListener('change', () => salva({ nuove_al_giorno: Number(nuove.value) }));

  const lavoro = h('input', { type: 'text', value: d.lavoro });
  lavoro.addEventListener('change', () => salva({ lavoro: lavoro.value }));

  const oggettiEn = h('input', { type: 'checkbox', checked: d.oggetti_inglese });
  oggettiEn.addEventListener('change', () => salva({ oggetti_inglese: oggettiEn.checked }));

  const temaSel = h('select', [['auto', 'Automatico (come il telefono)'], ['dark', 'Scuro'], ['light', 'Chiaro']].map(([v, n]) => h('option', { value: v, selected: v === tema() }, n)));
  temaSel.addEventListener('change', () => { try { localStorage.setItem('dg_tema', temaSel.value); } catch {} applicaTema(temaSel.value); });

  svuota(box,
    h('h1', 'Impostazioni'),
    h('div', { class: 'card stack' },
      h('h3', 'Servizi'),
      h('p', { class: 'small', style: { margin: 0 } }, d.ai ? '✓ AI attiva (Anthropic)' : '✗ AI spenta: aggiungi ANTHROPIC_API_KEY su Railway'),
      h('p', { class: 'small', style: { margin: 0 } }, d.voce ? '✓ Voce ElevenLabs attiva' : '○ ElevenLabs non configurato: uso la voce del browser (aggiungi ELEVENLABS_API_KEY per una voce naturale)')),
    h('div', { class: 'card stack' },
      h('h3', 'Inglese'),
      campo('Livello attuale', livello, 'Di solito non serve toccarlo: si aggiorna da solo. Cambialo solo se i contenuti sono chiaramente troppo facili o difficili.'),
      h('button', { class: 'btn piccolo', onclick: () => vai('esercizio/test') }, 'Rifai il test di livello'),
      campo('Il tuo lavoro (per esempi e scenari)', lavoro),
      campo('Modello AI', modello, 'Opus: correzioni migliori. Haiku: costa circa un quarto. La stima della spesa è in Progressi.')),
    h('div', { class: 'card stack' },
      h('h3', 'Memoria e ripasso'),
      campo('Carte nuove al giorno', nuove, 'Quante carte mai viste entrano nel ripasso ogni giorno. 10 è un buon ritmo: più carte = ripassi più lunghi nei giorni dopo.'),
      h('label', { class: 'row' }, oggettiEn, h('span', 'Palazzo della memoria con oggetti in inglese (alleni anche il vocabolario)'))),
    h('div', { class: 'card stack' },
      h('h3', 'Aspetto'),
      campo('Tema', temaSel)),
    h('div', { class: 'card stack' },
      h('h3', 'Installa sul telefono'),
      h('p', { class: 'small', style: { margin: 0 } }, 'iPhone: apri il sito in Safari → Condividi → "Aggiungi alla schermata Home". Android: menu di Chrome → "Installa app".')),
    h('div', { class: 'card stack' },
      h('h3', 'I tuoi dati'),
      h('p', { class: 'small', style: { margin: 0 } }, 'Tutto è salvato nel database su Railway, condiviso tra telefono e computer. Scarica un backup ogni tanto.'),
      h('a', { class: 'btn', href: '/api/esporta', download: '' }, 'Scarica backup (JSON)'),
      h('button', { class: 'btn pericolo', onclick: async () => { await api.post('/api/logout'); location.reload(); } }, 'Esci da questo dispositivo')));
}
