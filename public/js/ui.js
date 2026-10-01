// Piccola libreria DOM. h() crea elementi: i testi diventano sempre nodi di testo
// (mai innerHTML con dati dell'utente o dell'AI), così niente iniezioni di HTML.

export function h(tag, attrs, ...figli) {
  const el = document.createElement(tag);
  if (attrs && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) {
    figli.unshift(attrs);
    attrs = null;
  }
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v; // SOLO per icone SVG costanti scritte qui nel codice
    else if (k in el && typeof v !== 'string') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  aggiungi(el, figli);
  return el;
}

function aggiungi(el, figli) {
  for (const f of figli.flat(Infinity)) {
    if (f == null || f === false) continue;
    el.appendChild(f instanceof Node ? f : document.createTextNode(String(f)));
  }
}

export function svuota(el, ...figli) {
  el.replaceChildren();
  aggiungi(el, figli);
  return el;
}

// Testo con a capo -> paragrafi.
export function paragrafi(testo, cls) {
  return String(testo || '').split(/\n\s*\n/).filter((p) => p.trim()).map((p) => h('p', { class: cls }, p.trim()));
}

let timerToast;
export function toast(msg, tipo = '') {
  document.querySelectorAll('.toast').forEach((t) => t.remove());
  const t = h('div', { class: 'toast ' + tipo, role: 'status' }, msg);
  document.body.appendChild(t);
  clearTimeout(timerToast);
  timerToast = setTimeout(() => t.remove(), tipo === 'errore' ? 5000 : 2600);
}

export function caricamento(msg = 'Caricamento…') {
  return h('div', { class: 'caricamento' }, h('div', { class: 'spinner' }), msg);
}

export function modale(contenuto, { onChiudi } = {}) {
  const sfondo = h('div', { class: 'modale-sfondo' });
  const box = h('div', { class: 'modale', role: 'dialog', 'aria-modal': 'true' });
  const chiudi = () => { sfondo.remove(); onChiudi && onChiudi(); };
  sfondo.addEventListener('click', (e) => { if (e.target === sfondo) chiudi(); });
  box.appendChild(typeof contenuto === 'function' ? contenuto(chiudi) : contenuto);
  sfondo.appendChild(box);
  document.body.appendChild(sfondo);
  const primo = box.querySelector('input, textarea, select');
  if (primo) setTimeout(() => primo.focus(), 50);
  return chiudi;
}

export function conferma(domanda) {
  return new Promise((ok) => {
    modale((chiudi) => h('div', { class: 'stack' },
      h('p', domanda),
      h('div', { class: 'row', style: { justifyContent: 'flex-end' } },
        h('button', { class: 'btn', onclick: () => { chiudi(); ok(false); } }, 'Annulla'),
        h('button', { class: 'btn primario', onclick: () => { chiudi(); ok(true); } }, 'Conferma'))));
  });
}

export function campo(etichetta, input, aiuto) {
  return h('label', { class: 'campo' }, h('span', etichetta), input, aiuto ? h('small', aiuto) : null);
}

export function barra(pct, { colore, atteso } = {}) {
  return h('div', { class: 'barra', role: 'progressbar', 'aria-valuenow': String(pct), 'aria-valuemin': '0', 'aria-valuemax': '100' },
    h('i', { style: { width: Math.max(0, Math.min(100, pct)) + '%', background: colore || '' } }),
    atteso != null ? h('span', { class: 'atteso', style: { left: `calc(${Math.min(100, atteso)}% - 1px)` }, title: 'dove dovresti essere oggi' }) : null);
}

export function segmenti(opzioni, attivo, onCambio) {
  const box = h('div', { class: 'segmenti', role: 'tablist' });
  const disegna = (val) => svuota(box, opzioni.map(([v, lab]) =>
    h('button', { class: v === val ? 'attivo' : '', role: 'tab', 'aria-selected': String(v === val), onclick: () => { disegna(v); onCambio(v); } }, lab)));
  disegna(attivo);
  return box;
}

export function durata(sec) {
  const m = Math.floor(sec / 60), s = Math.round(sec % 60);
  return m ? `${m} min${s ? ' ' + s + ' s' : ''}` : `${s} s`;
}

export function dataLunga(giorno) {
  return new Date(giorno + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function dataBreve(giorno) {
  return new Date(giorno + 'T12:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}

export function mescola(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const attendi = (ms) => new Promise((r) => setTimeout(r, ms));

// Icone (SVG costanti, stroke = currentColor).
const svg = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
export const ICONE = {
  oggi: svg('<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>'),
  palestra: svg('<path d="M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12"/>'),
  carte: svg('<rect x="3" y="5" width="14" height="16" rx="2"/><path d="M7 3h12a2 2 0 0 1 2 2v14"/>'),
  progressi: svg('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
  obiettivi: svg('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>'),
  impostazioni: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  indietro: svg('<path d="M15 18l-6-6 6-6"/>'),
  chiudi: svg('<path d="M18 6L6 18M6 6l12 12"/>'),
  audio: svg('<path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>'),
  mic: svg('<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5"/>'),
  matita: svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>'),
  cestino: svg('<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>'),
  piu: svg('<path d="M12 5v14M5 12h14"/>'),
};

export function icona(nome) {
  return h('span', { html: ICONE[nome], style: { display: 'inline-flex' }, 'aria-hidden': 'true' });
}
