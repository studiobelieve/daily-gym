// Volti disegnati al volo: tratti distintivi (capelli, occhiali, barba, cappello...) da agganciare al nome.
// Non sono foto vere, ma allenano la stessa abilità: notare un dettaglio e legarlo al nome.
const NS = 'http://www.w3.org/2000/svg';

const PELLE = ['#f6d7c3', '#eac0a2', '#d9a27e', '#b97a56', '#8d5a3c', '#5e3b26'];
const CAPELLI = ['#1f1a17', '#4a2f1d', '#8a5a2b', '#c99a5b', '#e8d2a0', '#b5452f', '#9a9a9a', '#e6e6e6'];
const SFONDI = ['#cde2fb', '#f9d9c8', '#d4f0e3', '#fbeab3', '#f6d3e2', '#ddd7f7', '#e3e8ec'];
const CAPPELLI = ['#2a78d6', '#e34948', '#1baf7a', '#4a3aa7', '#eda100', '#333'];

const scegli = (arr, r) => arr[Math.floor(r() * arr.length)];

export function generaAvatar(r = Math.random) {
  return {
    pelle: scegli(PELLE, r),
    sfondo: scegli(SFONDI, r),
    capelli: scegli(['corti', 'lunghi', 'ricci', 'calvo', 'coda', 'ciuffo'], r),
    coloreCapelli: scegli(CAPELLI, r),
    occhiali: r() < 0.35 ? scegli(['tondi', 'quadrati', 'sole'], r) : null,
    barba: r() < 0.3 ? scegli(['piena', 'baffi', 'pizzetto'], r) : null,
    orecchini: r() < 0.25,
    cappello: r() < 0.18 ? scegli(CAPPELLI, r) : null,
    neo: r() < 0.2,
    sopracciglia: scegli(['dritte', 'arcuate', 'folte'], r),
  };
}

// Descrizione a parole dei tratti più evidenti (aiuta a creare l'associazione).
export function trattiAvatar(a) {
  const t = [];
  if (a.capelli === 'calvo') t.push('calvo');
  else t.push({ corti: 'capelli corti', lunghi: 'capelli lunghi', ricci: 'capelli ricci', coda: 'coda di cavallo', ciuffo: 'ciuffo alto' }[a.capelli]);
  if (a.occhiali) t.push(a.occhiali === 'sole' ? 'occhiali da sole' : `occhiali ${a.occhiali}`);
  if (a.barba) t.push(a.barba === 'piena' ? 'barba' : a.barba);
  if (a.cappello) t.push('berretto');
  if (a.orecchini) t.push('orecchini');
  if (a.neo) t.push('un neo sulla guancia');
  return t;
}

function el(tag, attrs) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

export function avatar(a, { piccolo = false } = {}) {
  const s = el('svg', { viewBox: '0 0 120 120', class: 'avatar' + (piccolo ? ' piccolo' : ''), role: 'img', 'aria-label': 'Volto' });
  const add = (tag, attrs) => s.appendChild(el(tag, attrs));
  add('rect', { width: 120, height: 120, rx: 24, fill: a.sfondo });
  // capelli dietro
  if (a.capelli === 'lunghi') add('path', { d: 'M28 58 Q26 104 40 112 L80 112 Q94 104 92 58 Z', fill: a.coloreCapelli });
  if (a.capelli === 'coda') add('ellipse', { cx: 92, cy: 66, rx: 9, ry: 20, fill: a.coloreCapelli });
  // collo e spalle
  add('rect', { x: 50, y: 82, width: 20, height: 16, fill: a.pelle });
  add('path', { d: 'M22 120 Q24 96 60 94 Q96 96 98 120 Z', fill: '#5b6b7d' });
  // viso
  add('ellipse', { cx: 60, cy: 60, rx: 27, ry: 31, fill: a.pelle });
  add('ellipse', { cx: 33, cy: 62, rx: 4, ry: 7, fill: a.pelle });
  add('ellipse', { cx: 87, cy: 62, rx: 4, ry: 7, fill: a.pelle });
  if (a.orecchini) { add('circle', { cx: 33, cy: 71, r: 2.6, fill: '#eda100' }); add('circle', { cx: 87, cy: 71, r: 2.6, fill: '#eda100' }); }
  // capelli sopra
  const c = a.coloreCapelli;
  if (a.capelli === 'corti') add('path', { d: 'M33 52 Q34 26 60 26 Q86 26 87 52 Q80 38 60 38 Q40 38 33 52 Z', fill: c });
  if (a.capelli === 'lunghi' || a.capelli === 'coda') add('path', { d: 'M32 58 Q30 24 60 24 Q90 24 88 58 Q84 36 62 36 Q48 44 32 58 Z', fill: c });
  if (a.capelli === 'ricci') for (let i = 0; i < 9; i++) add('circle', { cx: 34 + i * 6.5, cy: 32 + Math.abs(4 - i) * 2.2, r: 8, fill: c });
  if (a.capelli === 'ciuffo') add('path', { d: 'M34 50 Q36 22 64 18 Q76 16 82 26 Q90 34 86 50 Q78 34 56 36 Q42 38 34 50 Z', fill: c });
  if (a.capelli === 'calvo') add('path', { d: 'M33 58 Q32 50 35 46 L37 56 Z M87 58 Q88 50 85 46 L83 56 Z', fill: c });
  if (a.cappello) {
    add('path', { d: 'M30 46 Q32 20 60 20 Q88 20 90 46 Z', fill: a.cappello });
    add('rect', { x: 26, y: 42, width: 68, height: 7, rx: 3, fill: a.cappello });
  }
  // sopracciglia
  const yS = 50;
  const w = a.sopracciglia === 'folte' ? 3.5 : 2;
  const curva = a.sopracciglia === 'arcuate' ? -4 : 0;
  add('path', { d: `M41 ${yS} Q48 ${yS - 3 + curva} 55 ${yS}`, stroke: c === '#e6e6e6' ? '#999' : c, 'stroke-width': w, fill: 'none', 'stroke-linecap': 'round' });
  add('path', { d: `M65 ${yS} Q72 ${yS - 3 + curva} 79 ${yS}`, stroke: c === '#e6e6e6' ? '#999' : c, 'stroke-width': w, fill: 'none', 'stroke-linecap': 'round' });
  // occhi
  add('circle', { cx: 48, cy: 58, r: 2.8, fill: '#222' });
  add('circle', { cx: 72, cy: 58, r: 2.8, fill: '#222' });
  if (a.occhiali) {
    const f = a.occhiali === 'sole' ? '#222' : 'none';
    if (a.occhiali === 'quadrati') {
      add('rect', { x: 38, y: 51, width: 19, height: 14, rx: 3, fill: f, stroke: '#222', 'stroke-width': 2.2 });
      add('rect', { x: 63, y: 51, width: 19, height: 14, rx: 3, fill: f, stroke: '#222', 'stroke-width': 2.2 });
    } else {
      add('circle', { cx: 48, cy: 58, r: 9, fill: f, stroke: '#222', 'stroke-width': 2.2 });
      add('circle', { cx: 72, cy: 58, r: 9, fill: f, stroke: '#222', 'stroke-width': 2.2 });
    }
    add('path', { d: 'M57 58 L63 58', stroke: '#222', 'stroke-width': 2.2 });
  }
  // naso e bocca
  add('path', { d: 'M60 62 Q57 70 61 71', stroke: 'rgba(0,0,0,.35)', 'stroke-width': 1.8, fill: 'none', 'stroke-linecap': 'round' });
  if (a.barba === 'piena') add('path', { d: 'M34 66 Q36 92 60 92 Q84 92 86 66 Q80 80 60 80 Q40 80 34 66 Z', fill: c });
  if (a.barba === 'pizzetto') add('path', { d: 'M54 82 Q60 90 66 82 Z', fill: c });
  if (a.barba === 'baffi' || a.barba === 'piena') add('path', { d: 'M50 75 Q60 70 70 75 Q60 73 50 75 Z', fill: c, stroke: c, 'stroke-width': 2.5 });
  add('path', { d: 'M52 79 Q60 84 68 79', stroke: '#8a3b3b', 'stroke-width': 2.2, fill: 'none', 'stroke-linecap': 'round' });
  if (a.neo) add('circle', { cx: 74, cy: 72, r: 1.6, fill: '#5e3b26' });
  return s;
}
