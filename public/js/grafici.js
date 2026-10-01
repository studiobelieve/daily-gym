// Grafici SVG senza librerie: linea (andamento), barre (quantità per giorno), heatmap (costanza).
// Una serie per grafico (il titolo la nomina), linee 2px, punti 8px, tooltip al passaggio/tocco,
// tabella dei dati sotto ogni grafico.
import { h, dataBreve } from './ui.js';
import { aggiungiGiorni, giornoSettimana } from './shared/testo.js';

const NS = 'http://www.w3.org/2000/svg';
const W = 600, H = 190, M = { t: 14, r: 12, b: 26, l: 34 };

function el(tag, attrs = {}, testo) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (testo != null) e.textContent = testo;
  return e;
}

function tabella(righe, intestazioni) {
  return h('details', { class: 'dati' }, h('summary', 'Mostra i dati'),
    h('table', h('thead', h('tr', intestazioni.map((t) => h('th', t)))),
      h('tbody', righe.map((r) => h('tr', r.map((c) => h('td', c)))))));
}

function scalaY(min, max) {
  if (min === max) { min -= 1; max += 1; }
  // Le grandezze dell'app sono intere (cifre, oggetti, %): niente tacche decimali.
  const passo = Math.max(1, Math.pow(10, Math.floor(Math.log10((max - min) / 3))));
  const tacche = [];
  const p = [1, 2, 5, 10].map((m) => m * passo).find((s) => (max - min) / s <= 5) || passo * 10;
  for (let v = Math.ceil(min / p) * p; v <= max + 1e-9; v += p) tacche.push(Math.round(v * 100) / 100);
  return tacche;
}

// Tooltip condiviso: segue il punto più vicino al puntatore.
function interattivo(box, svg, punti, testo) {
  const tip = h('div', { class: 'tooltip hidden' });
  const guida = el('line', { y1: M.t, y2: H - M.b, stroke: 'currentColor', 'stroke-width': 1, opacity: 0.25, visibility: 'hidden' });
  svg.appendChild(guida);
  box.appendChild(tip);
  const muovi = (e) => {
    const r = svg.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    let migliore = null, d = Infinity;
    for (const p of punti) { const dd = Math.abs(p.px - x); if (dd < d) { d = dd; migliore = p; } }
    if (!migliore) return;
    guida.setAttribute('x1', migliore.px); guida.setAttribute('x2', migliore.px); guida.setAttribute('visibility', 'visible');
    tip.textContent = testo(migliore);
    tip.classList.remove('hidden');
    tip.style.left = (migliore.px / W) * r.width + 'px';
    tip.style.top = (migliore.py / H) * r.height + 'px';
  };
  const esci = () => { tip.classList.add('hidden'); guida.setAttribute('visibility', 'hidden'); };
  svg.addEventListener('pointermove', muovi);
  svg.addEventListener('pointerdown', muovi);
  svg.addEventListener('pointerleave', esci);
}

// dati: [{ x: 'YYYY-MM-DD', y: numero }], ordinati per data.
export function linea(dati, { colore = 'var(--accent)', unita = '', min, max, formato = (v) => v, gradini = false, etichettaY } = {}) {
  const box = h('div', { class: 'grafico' });
  if (!dati.length) return h('p', { class: 'small muted' }, 'Ancora nessun dato: fai l\'esercizio e qui vedrai l\'andamento.');
  if (dati.length === 1) {
    return h('p', { class: 'small' }, h('strong', { style: { fontSize: '1.4rem' } }, formato(dati[0].y) + unita),
      h('span', { class: 'muted' }, ` il ${dataBreve(dati[0].x)}. Dal secondo giorno qui vedrai la linea dei progressi.`));
  }
  const ys = dati.map((d) => d.y);
  const yMin = min ?? Math.min(...ys);
  const yMax = max ?? Math.max(...ys);
  const tacche = scalaY(yMin, yMax);
  const lo = Math.min(yMin, tacche[0]), hi = Math.max(yMax, tacche[tacche.length - 1]);
  const t0 = Date.parse(dati[0].x), t1 = Date.parse(dati[dati.length - 1].x);
  const sx = (x) => (t1 === t0 ? (M.l + W - M.r) / 2 : M.l + ((Date.parse(x) - t0) / (t1 - t0)) * (W - M.l - M.r));
  const sy = (y) => H - M.b - ((y - lo) / (hi - lo || 1)) * (H - M.t - M.b);

  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Grafico andamento' });
  for (const t of tacche) {
    svg.appendChild(el('line', { class: 'griglia', x1: M.l, x2: W - M.r, y1: sy(t), y2: sy(t) }));
    svg.appendChild(el('text', { class: 'asse', x: M.l - 6, y: sy(t) + 4, 'text-anchor': 'end' }, etichettaY ? etichettaY(t) : t));
  }
  const etich = dati.length > 1 ? [dati[0], dati[dati.length - 1]] : [dati[0]];
  for (const d of etich) svg.appendChild(el('text', { class: 'asse', x: sx(d.x), y: H - 6, 'text-anchor': d === dati[0] && dati.length > 1 ? 'start' : 'end' }, dataBreve(d.x)));

  const punti = dati.map((d) => ({ ...d, px: sx(d.x), py: sy(d.y) }));
  let path = '';
  punti.forEach((p, i) => {
    if (!i) path = `M${p.px},${p.py}`;
    else path += gradini ? ` H${p.px} V${p.py}` : ` L${p.px},${p.py}`;
  });
  if (punti.length > 1) svg.appendChild(el('path', { d: path, fill: 'none', stroke: colore, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
  // Punti solo se pochi (altrimenti affollano); ultimo punto sempre evidenziato con etichetta diretta.
  punti.forEach((p, i) => {
    if (punti.length <= 20 || i === punti.length - 1) {
      svg.appendChild(el('circle', { cx: p.px, cy: p.py, r: 4, fill: colore, stroke: 'var(--surface)', 'stroke-width': 2 }));
    }
  });
  const ult = punti[punti.length - 1];
  svg.appendChild(el('text', { x: Math.min(ult.px, W - M.r), y: ult.py - 9, 'text-anchor': 'end', style: 'font-size:12px;font-weight:700;fill:var(--text)' }, formato(ult.y) + unita));
  box.appendChild(svg);
  interattivo(box, svg, punti, (p) => `${dataBreve(p.x)}: ${formato(p.y)}${unita}`);
  return h('div', box, tabella(dati.slice().reverse().map((d) => [dataBreve(d.x), formato(d.y) + unita]), ['Giorno', 'Valore']));
}

// dati: [{ x: 'YYYY-MM-DD', y }] per ogni giorno del periodo (anche gli zeri).
export function barre(dati, { colore = 'var(--accent)', unita = '' } = {}) {
  const box = h('div', { class: 'grafico' });
  const max = Math.max(1, ...dati.map((d) => d.y));
  const tacche = scalaY(0, max);
  const hi = Math.max(max, tacche[tacche.length - 1]);
  const larg = (W - M.l - M.r) / dati.length;
  const sy = (y) => H - M.b - (y / hi) * (H - M.t - M.b);
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Grafico a barre' });
  for (const t of tacche) {
    svg.appendChild(el('line', { class: 'griglia', x1: M.l, x2: W - M.r, y1: sy(t), y2: sy(t) }));
    svg.appendChild(el('text', { class: 'asse', x: M.l - 6, y: sy(t) + 4, 'text-anchor': 'end' }, t));
  }
  const punti = [];
  dati.forEach((d, i) => {
    const x = M.l + i * larg + 1;
    const w = Math.max(2, larg - 2); // 2px di spazio tra le barre
    const y = sy(d.y);
    const base = H - M.b;
    if (d.y > 0) {
      const r = Math.min(4, w / 2, base - y);
      svg.appendChild(el('path', { d: `M${x},${base} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${base} Z`, fill: colore }));
    }
    punti.push({ ...d, px: x + w / 2, py: y });
  });
  svg.appendChild(el('text', { class: 'asse', x: M.l, y: H - 6 }, dataBreve(dati[0].x)));
  svg.appendChild(el('text', { class: 'asse', x: W - M.r, y: H - 6, 'text-anchor': 'end' }, dataBreve(dati[dati.length - 1].x)));
  box.appendChild(svg);
  interattivo(box, svg, punti, (p) => `${dataBreve(p.x)}: ${p.y}${unita}`);
  return h('div', box, tabella(dati.filter((d) => d.y).reverse().map((d) => [dataBreve(d.x), d.y + unita]), ['Giorno', 'Valore']));
}

// Calendario di costanza stile GitHub: colonne = settimane, righe = lun..dom.
// valori: { 'YYYY-MM-DD': numero di attività }, sessioni: Set dei giorni con sessione completata.
export function heatmap(oggi, valori, sessioni, settimane = 16) {
  const g = giornoSettimana(oggi);
  const lunediCorrente = aggiungiGiorni(oggi, -((g + 6) % 7));
  const inizio = aggiungiGiorni(lunediCorrente, -(settimane - 1) * 7);
  const griglia = h('div', { class: 'heatmap', style: { gridTemplateColumns: `repeat(${settimane}, 1fr)` } });
  const max = Math.max(1, ...Object.values(valori));
  for (let i = 0; i < settimane * 7; i++) {
    const giorno = aggiungiGiorni(inizio, i);
    const v = valori[giorno] || 0;
    const futuro = giorno > oggi;
    let livello = 0;
    if (v > 0) livello = Math.min(4, 1 + Math.floor((v / max) * 3.999));
    if (sessioni.has(giorno)) livello = Math.max(livello, 3);
    griglia.appendChild(h('i', {
      title: `${dataBreve(giorno)}: ${sessioni.has(giorno) ? 'sessione completata, ' : ''}${v} attività`,
      style: { background: futuro ? 'transparent' : `var(--heat-${livello})`, outline: giorno === oggi ? '2px solid var(--text-2)' : '' },
    }));
  }
  return h('div', griglia,
    h('div', { class: 'row between', style: { marginTop: '8px' } },
      h('span', { class: 'tiny muted' }, `Ultime ${settimane} settimane`),
      h('span', { class: 'legenda-heat' }, 'meno', [0, 1, 2, 3, 4].map((l) => h('i', { style: { background: `var(--heat-${l})` } })), 'più')));
}
