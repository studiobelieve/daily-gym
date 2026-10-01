// Carte: elenco, ricerca, modifica, e il modulo "+" per aggiungerne di nuove.
import { h, svuota, modale, segmenti, campo, toast, conferma, icona, caricamento } from '../ui.js';
import { api, oggi } from '../api.js';
import { giorniTra } from '../shared/testo.js';
import { parla } from '../voce.js';

const TIPI = {
  en: { nome: 'Inglese', area: 'inglese' },
  persona: { nome: 'Persona', area: 'memoria' },
  ricorda: { nome: 'Da ricordare', area: 'memoria' },
  cultura: { nome: 'Cultura', area: 'cultura' },
};

let ricarica = null;

export function apriAggiungi(tipoIniziale = 'en', carta = null) {
  let tipo = carta ? carta.tipo : tipoIniziale;
  modale((chiudi) => {
    const corpo = h('div');
    const disegna = () => svuota(corpo, modulo(tipo, carta, chiudi));
    disegna();
    return h('div', { class: 'stack' },
      h('div', { class: 'row between' }, h('h2', { style: { margin: 0 } }, carta ? 'Modifica carta' : 'Nuova carta'),
        h('button', { class: 'icona-btn', 'aria-label': 'Chiudi', onclick: chiudi }, icona('chiudi'))),
      carta ? null : segmenti([['en', 'Inglese'], ['persona', 'Persona'], ['ricorda', 'Da ricordare'], ['cultura', 'Cultura']], tipo, (v) => { tipo = v; disegna(); }),
      corpo);
  });
}

function modulo(tipo, carta, chiudi) {
  const c = carta || { fronte: '', retro: '', nota: '', extra: {} };
  const inp = (val, ph, extra = {}) => { const i = h('input', { type: 'text', placeholder: ph, ...extra }); i.value = val || ''; return i; };
  const ta = (val, ph, righe = 3) => { const t = h('textarea', { rows: righe, placeholder: ph, style: { minHeight: 'auto' } }); t.value = val || ''; return t; };
  const msg = h('p', { class: 'small', style: { color: 'var(--critical)', margin: 0 } });
  let campi, leggi;

  if (tipo === 'en') {
    const fronte = inp(c.fronte, 'es. to look forward to', { autocapitalize: 'off' });
    const retro = inp(c.retro, 'es. non vedere l\'ora di');
    const nota = ta(c.nota, 'es. I\'m looking forward to meeting you.', 2);
    campi = [
      campo('Parola o espressione in inglese', h('div', { class: 'row' }, h('div', { class: 'grow' }, fronte), h('button', { class: 'icona-btn', type: 'button', 'aria-label': 'Ascolta', onclick: () => fronte.value && parla(fronte.value) }, icona('audio')))),
      campo('Significato in italiano', retro),
      campo('Frase di esempio (facoltativa)', nota, 'Meglio la frase in cui l\'hai trovata: le parole nel contesto si ricordano molto di più.'),
    ];
    leggi = () => ({ fronte: fronte.value, retro: retro.value, nota: nota.value });
  } else if (tipo === 'persona') {
    const nome = inp(c.fronte, 'es. Giulia Esposito', { autocapitalize: 'words' });
    const chi = inp(c.retro, 'es. responsabile marketing di Caffè Rossi');
    const dettaglio = inp(c.extra.dettaglio, 'es. capelli ricci rossi, ride spesso');
    const assoc = ta(c.nota, 'es. "Giulia" → una giuggiola gigante tra i suoi ricci rossi', 2);
    campi = [
      campo('Nome', nome),
      campo('Chi è / dove l\'hai conosciuta', chi),
      campo('Un dettaglio che noti (aspetto, voce, modo di fare)', dettaglio),
      campo('La tua associazione', assoc, 'Trasforma il nome in un\'immagine e attaccala al dettaglio. Più è assurda, più funziona. In ripasso vedrai chi è e il dettaglio: dovrai ricordare il nome.'),
    ];
    leggi = () => ({ fronte: nome.value, retro: chi.value, nota: assoc.value, extra: { ...c.extra, dettaglio: dettaglio.value.trim() } });
  } else {
    const fronte = ta(c.fronte, tipo === 'cultura' ? 'es. In che anno cadde il muro di Berlino?' : 'es. Quando scade l\'assicurazione dell\'auto?', 2);
    const retro = ta(c.retro, tipo === 'cultura' ? 'es. 1989' : 'es. 15 marzo', 2);
    const nota = tipo === 'ricorda' ? ta(c.nota, 'Note (facoltative)', 2) : null;
    campi = [
      campo('Domanda', fronte, 'Scrivila come domanda: il ripasso funziona meglio se devi tirare fuori tu la risposta.'),
      campo('Risposta', retro),
      nota ? campo('Note', nota) : null,
    ];
    leggi = () => ({ fronte: fronte.value, retro: retro.value, nota: nota ? nota.value : c.nota });
  }

  const salva = async (continua) => {
    const dati = leggi();
    if (!dati.fronte.trim()) { msg.textContent = 'Manca il campo principale.'; return; }
    try {
      if (carta) await api.put('/api/carte/' + carta.id, dati);
      else await api.post('/api/carte', { tipo, ...dati });
      toast(carta ? 'Carta aggiornata' : 'Carta aggiunta: la vedrai nel prossimo ripasso');
      if (ricarica) ricarica();
      if (continua) { chiudi(); apriAggiungi(tipo); } else chiudi();
    } catch (err) { msg.textContent = err.message; }
  };

  const multipla = tipo === 'en' && !carta ? h('details', { class: 'small' },
    h('summary', { class: 'muted', style: { cursor: 'pointer' } }, 'Aggiungi tante parole insieme'),
    (() => {
      const t = ta('', 'una per riga:\nto achieve = raggiungere\ndeadline = scadenza', 6);
      return h('div', { class: 'stack', style: { marginTop: '8px' } }, t,
        h('button', { class: 'btn piccolo', onclick: async () => {
          const carte = t.value.split(/\n|;/).map((r) => r.split(/\s*(?:=|:|\t| - )\s*/)).filter((p) => p[0] && p[0].trim())
            .map(([en, ...it]) => ({ tipo: 'en', fronte: en.trim(), retro: it.join(' ').trim() }));
          if (!carte.length) return;
          try {
            const r = await api.post('/api/carte/multi', { carte });
            toast(`${r.ids.length} carte aggiunte`);
            if (ricarica) ricarica();
            chiudi();
          } catch (err) { msg.textContent = err.message; }
        } }, 'Aggiungi tutte'));
    })()) : null;

  return h('form', { class: 'stack', onsubmit: (e) => { e.preventDefault(); salva(false); } },
    campi, msg,
    h('div', { class: 'row' },
      h('button', { class: 'btn primario grow', type: 'submit' }, carta ? 'Salva' : 'Aggiungi'),
      carta ? null : h('button', { class: 'btn', type: 'button', onclick: () => salva(true) }, 'Aggiungi e un\'altra')),
    multipla);
}

function quando(c) {
  if (c.intervallo === 0) return 'nuova';
  const g = giorniTra(oggi(), c.scadenza);
  if (g <= 0) return 'da ripassare oggi';
  return g === 1 ? 'domani' : `tra ${g} giorni`;
}

export async function mostra(box) {
  let filtro = '';
  let cerca = '';
  const lista = h('div', caricamento());
  const input = h('input', { type: 'search', placeholder: 'Cerca…' });
  let timer;
  input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => { cerca = input.value.trim(); carica(); }, 250); });

  const carica = async () => {
    const qs = new URLSearchParams();
    if (filtro) qs.set('tipo', filtro);
    if (cerca) qs.set('cerca', cerca);
    const { carte } = await api.get('/api/carte?' + qs);
    if (!carte.length) {
      svuota(lista, h('div', { class: 'vuoto' }, cerca ? 'Nessuna carta trovata.' : 'Ancora nessuna carta. Premi + per aggiungere parole, persone e cose da ricordare.'));
      return;
    }
    svuota(lista,
      h('p', { class: 'tiny muted' }, `${carte.length} carte`),
      h('div', { class: 'card' }, h('ul', { class: 'lista' }, carte.map((c) => h('li', { class: 'row', style: { alignItems: 'flex-start' } },
        h('div', { class: 'grow', style: { minWidth: 0 } },
          h('div', h('strong', c.fronte)),
          c.retro ? h('div', { class: 'small muted', style: { overflow: 'hidden', textOverflow: 'ellipsis' } }, c.retro) : null,
          h('div', { class: 'row', style: { marginTop: '4px' } },
            h('span', { class: 'chip ' + TIPI[c.tipo].area }, TIPI[c.tipo].nome),
            h('span', { class: 'tiny muted' }, quando(c)),
            c.intervallo >= 21 ? h('span', { class: 'tiny', style: { color: 'var(--good)' } }, '✓ consolidata') : null)),
        h('button', { class: 'icona-btn', 'aria-label': 'Modifica', onclick: () => apriAggiungi(c.tipo, c) }, icona('matita')),
        h('button', { class: 'icona-btn', 'aria-label': 'Elimina', onclick: async () => {
          if (await conferma(`Eliminare "${c.fronte}"?`)) { await api.del('/api/carte/' + c.id); toast('Carta eliminata'); carica(); }
        } }, icona('cestino')))))));
  };
  ricarica = carica;

  svuota(box,
    h('div', { class: 'row between' }, h('h1', { style: { margin: 0 } }, 'Carte'),
      h('button', { class: 'btn piccolo primario', onclick: () => apriAggiungi(filtro || 'en') }, '+ Nuova')),
    h('div', { class: 'stack', style: { marginTop: '12px' } },
      segmenti([['', 'Tutte'], ['en', 'Inglese'], ['persona', 'Persone'], ['ricorda', 'Da ricordare'], ['cultura', 'Cultura']], filtro, (v) => { filtro = v; carica(); }),
      input,
      lista));
  carica();
}
