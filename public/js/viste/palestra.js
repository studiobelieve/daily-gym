// Palestra: tutti gli esercizi a scelta, fuori dalla sessione guidata.
import { h, svuota, caricamento } from '../ui.js';
import { api } from '../api.js';
import { stato } from '../app.js';
import { ESERCIZI } from '../shared/piano.js';
import { SCENARI } from '../shared/scenari.js';
import { creaPercorso } from '../esercizi/palazzo.js';

const GRUPPI = [
  ['Inglese', 'inglese', [
    ['writing', 'Scrivi un breve testo, l\'AI lo corregge e spiega gli errori.'],
    ['dettato', 'Ascolta frasi e scrivile: orecchio e ortografia.'],
    ['speaking', 'Conversazione a voce con l\'agente, poi il report.'],
    ['test', 'Rifai il test per ricalibrare il livello.'],
  ]],
  ['Memoria', 'memoria', [
    ['nomi', 'Volti e nomi con il metodo dell\'associazione.'],
    ['palazzo', 'Liste di oggetti nei luoghi del tuo percorso.'],
    ['span', 'Il termometro della memoria di lavoro.'],
  ]],
  ['Cultura', 'cultura', [
    ['cultura', 'Una nuova pillola da una fonte vera, in inglese al tuo livello.'],
  ]],
  ['Ripasso', 'costanza', [
    ['ripasso', 'Tutte le carte in scadenza.'],
  ]],
];

export async function mostra(box, { vai }) {
  const percorsiBox = h('div', caricamento());
  svuota(box,
    h('h1', 'Palestra'),
    h('p', { class: 'muted small' }, 'Allenati quando vuoi, oltre alla sessione del giorno.'),
    GRUPPI.map(([nome, area, voci]) => h('div', { class: 'sezione' },
      h('h2', h('span', { class: 'chip ' + area }, nome)),
      h('div', { class: 'card' }, h('ul', { class: 'lista' }, voci.map(([id, desc]) => {
        const ai = ESERCIZI[id].ai && !stato.ai;
        return h('li', { class: 'row' },
          h('div', { class: 'grow' }, h('strong', ESERCIZI[id].nome), h('div', { class: 'small muted' }, ai ? 'Richiede ANTHROPIC_API_KEY.' : desc)),
          h('button', { class: 'btn piccolo', disabled: ai, onclick: () => vai('esercizio/' + id) }, 'Vai'));
      }))))),
    h('div', { class: 'sezione' }, h('h2', 'Ripasso per tipo'),
      h('div', { class: 'segmenti' },
        [['en', 'Solo inglese'], ['persona', 'Solo persone'], ['ricorda', 'Solo "da ricordare"'], ['cultura', 'Solo cultura']].map(([t, n]) =>
          h('button', { onclick: () => vai('esercizio/ripasso/' + t) }, n)))),
    stato.ai ? h('div', { class: 'sezione' }, h('h2', 'Scenari di speaking'),
      h('div', { class: 'card' }, h('ul', { class: 'lista' }, SCENARI.map((s) => h('li', { class: 'row' },
        h('div', { class: 'grow' }, h('strong', s.titolo), h('div', { class: 'tiny muted' }, s.obiettivo)),
        h('button', { class: 'btn piccolo', onclick: () => vai('esercizio/speaking/' + s.id) }, 'Parla')))))) : null,
    h('div', { class: 'sezione' }, h('h2', 'Archivio pillole'),
      h('button', { class: 'btn pieno', onclick: () => vai('pillole') }, 'Tutte le pillole lette')),
    h('div', { class: 'sezione' }, h('h2', 'I tuoi percorsi (palazzo della memoria)'), percorsiBox));

  const disegnaPercorsi = async () => {
    const { percorsi } = await api.get('/api/percorsi');
    svuota(percorsiBox, h('div', { class: 'card' },
      percorsi.length ? h('ul', { class: 'lista' }, percorsi.map((p) => h('li', { class: 'row' },
        h('div', { class: 'grow' }, h('strong', p.nome), h('div', { class: 'tiny muted' }, `${p.luoghi.length} luoghi: ${p.luoghi.slice(0, 4).join(', ')}…`)),
        h('button', { class: 'btn piccolo', onclick: () => modifica(p) }, 'Modifica'))))
        : h('p', { class: 'small muted' }, 'Nessun percorso: lo crei al primo esercizio del palazzo.'),
      h('button', { class: 'btn piccolo', style: { marginTop: '8px' }, onclick: () => modifica(null) }, '+ Nuovo percorso')));
  };
  const modifica = async (p) => {
    const area = h('div');
    svuota(percorsiBox, area);
    await creaPercorso(area, p, { annullabile: true });
    disegnaPercorsi();
  };
  disegnaPercorsi();
}
