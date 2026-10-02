// "Tocca una parola": ogni testo inglese dell'app passa da inglese()/ingleseParagrafi().
// Ogni parola diventa toccabile: si apre un pannello con traduzione nel contesto, forma base,
// pronuncia e il pulsante per salvarla nelle carte. Si può allargare la selezione a un'espressione.
import { h, svuota, modale, campo, toast, icona } from './ui.js';
import { api } from './api.js';
import { parla } from './voce.js';

const PAROLA = /[A-Za-z][A-Za-z'’-]*[A-Za-z]|[A-Za-z]/g;
let gruppo = 0;

// Testo inglese -> elemento con le parole toccabili. Le frasi restano il contesto della traduzione.
export function inglese(testo, { tag = 'span', classe = '', stile } = {}) {
  const el = h(tag, { class: ('testo-en ' + classe).trim(), style: stile });
  const frasi = String(testo || '').match(/[^.!?\n]+[.!?]*\s*|\n/g) || [];
  for (const frase of frasi) {
    const id = String(++gruppo);
    let ultimo = 0;
    for (const m of frase.matchAll(PAROLA)) {
      if (m.index > ultimo) el.appendChild(document.createTextNode(frase.slice(ultimo, m.index)));
      el.appendChild(h('span', { class: 'pt', 'data-g': id, 'data-f': frase.trim() }, m[0]));
      ultimo = m.index + m[0].length;
    }
    if (ultimo < frase.length) el.appendChild(document.createTextNode(frase.slice(ultimo)));
  }
  return el;
}

export function ingleseParagrafi(testo, classe) {
  return String(testo || '').split(/\n\s*\n/).filter((p) => p.trim()).map((p) => inglese(p.trim(), { tag: 'p', classe }));
}

export function suggerimentoTocco() {
  return h('p', { class: 'tiny muted', style: { margin: '4px 0 0' } }, '👆 Tocca una parola per tradurla e salvarla nelle carte.');
}

const cache = new Map();

function apri(span) {
  const parole = [...document.querySelectorAll(`.pt[data-g="${span.dataset.g}"]`)];
  let da = parole.indexOf(span), a = da;
  const frase = span.dataset.f || '';
  const evidenzia = () => parole.forEach((p, i) => p.classList.toggle('sel', i >= da && i <= a));

  modale((chiudi) => {
    const titolo = h('div', { class: 'oggetto', style: { margin: 0, fontSize: '1.5rem' } });
    const info = h('div', { class: 'small' });
    const en = h('input', { type: 'text', autocapitalize: 'off', spellcheck: false });
    const it = h('input', { type: 'text', placeholder: 'traduzione' });
    const nota = h('textarea', { rows: 2, style: { minHeight: 'auto' } });
    nota.value = frase;
    const msg = h('p', { class: 'small', style: { margin: 0 } });
    const salva = h('button', { class: 'btn primario pieno', type: 'submit' }, '+ Aggiungi alle carte');
    let richiesta = 0;

    const selezione = () => parole.slice(da, a + 1).map((p) => p.textContent).join(' ');
    const aggiorna = async () => {
      evidenzia();
      const t = selezione();
      titolo.textContent = t;
      en.value = t;
      it.value = '';
      msg.textContent = '';
      svuota(info, h('span', { class: 'muted' }, 'Traduco…'));
      const mio = ++richiesta;
      const chiave = t + '|' + frase;
      try {
        const r = cache.get(chiave) || (await api.post('/api/traduci', { testo: t, frase }));
        cache.set(chiave, r);
        if (mio !== richiesta) return;
        it.value = r.traduzione;
        svuota(info,
          h('div', h('strong', r.traduzione)),
          r.base && r.base.toLowerCase() !== t.toLowerCase()
            ? h('div', { class: 'row', style: { marginTop: '4px' } }, h('span', { class: 'muted' }, `Forma base: ${r.base}`),
              h('button', { class: 'btn piccolo', type: 'button', onclick: () => { en.value = r.base; } }, 'Usa questa'))
            : null,
          r.nota ? h('div', { class: 'muted', style: { marginTop: '4px' } }, r.nota) : null);
        if (r.esistente) msg.textContent = `Hai già una carta per "${r.esistente.fronte}". Puoi aggiungerla comunque.`;
      } catch (err) {
        if (mio === richiesta) svuota(info, h('span', { class: 'muted' }, 'Traduzione non disponibile: scrivila tu. (' + err.message + ')'));
      }
    };

    const btn = (testoBtn, fn, attivo) => h('button', { class: 'btn piccolo', type: 'button', disabled: !attivo(), onclick: () => { fn(); ridisegnaComandi(); aggiorna(); } }, testoBtn);
    const comandi = h('div', { class: 'row' });
    const ridisegnaComandi = () => svuota(comandi,
      btn('◀ + parola', () => da--, () => da > 0),
      btn('+ parola ▶', () => a++, () => a < parole.length - 1),
      btn('Riduci', () => { if (a > da) a--; }, () => a > da),
      h('button', { class: 'icona-btn', type: 'button', 'aria-label': 'Ascolta', onclick: () => parla(en.value) }, icona('audio')));
    ridisegnaComandi();
    aggiorna();

    return h('form', { class: 'stack', onsubmit: async (e) => {
      e.preventDefault();
      if (!en.value.trim()) return;
      salva.disabled = true;
      try {
        await api.post('/api/carte', { tipo: 'en', fronte: en.value.trim(), retro: it.value.trim(), nota: nota.value.trim(), extra: { origine: 'tocca' } });
        toast(`"${en.value.trim()}" aggiunta alle carte`);
        chiudi();
      } catch (err) {
        msg.textContent = err.message;
        salva.disabled = false;
      }
    } },
    h('div', { class: 'row between' }, titolo, h('button', { class: 'icona-btn', type: 'button', 'aria-label': 'Chiudi', onclick: chiudi }, icona('chiudi'))),
    info, comandi,
    campo('In inglese (fronte della carta)', en),
    campo('Significato', it),
    campo('Frase di esempio', nota),
    msg, salva);
  }, { onChiudi: () => parole.forEach((p) => p.classList.remove('sel')) });
}

// Un solo ascoltatore per tutta l'app: funziona anche sui testi creati dopo.
document.addEventListener('click', (e) => {
  const span = e.target.closest && e.target.closest('.pt');
  if (!span || span.closest('button:disabled')) return;
  // Dentro un pulsante (es. opzione di un quiz non ancora scelta) il tocco serve a rispondere.
  if (span.closest('button')) return;
  e.preventDefault();
  e.stopPropagation();
  apri(span);
}, true);
