// Ripasso delle carte con ripetizione dilazionata.
// Inglese: a volte EN→IT (capire), a volte IT→EN (produrre, con risposta scritta facoltativa).
// Persone: vedi chi è e il dettaglio, devi ricordare il NOME (come nella vita vera).
import { h, svuota, icona, mescola } from '../ui.js';
import { api } from '../api.js';
import { parla } from '../voce.js';
import { confronta } from '../shared/testo.js';
import { avatar } from '../avatar.js';
import { inglese } from '../parola.js';

const VOTI = [
  [0, 'Di nuovo', 'non ricordavo', 'v0'],
  [3, 'Difficile', 'con fatica', 'v3'],
  [4, 'Bene', 'ricordato', 'v4'],
  [5, 'Facile', 'subito', 'v5'],
];

export async function avvia(box, opz) {
  svuota(box, h('div', { class: 'caricamento' }, h('div', { class: 'spinner' }), 'Preparo le carte…'));
  const { carte } = await api.get('/api/ripasso' + (opz.tipo ? '?tipo=' + opz.tipo : ''));
  if (!carte.length) {
    return new Promise((ok) => svuota(box, h('div', { class: 'card vuoto stack' },
      h('div', { style: { fontSize: '2.4rem' } }, '🎉'),
      h('p', 'Niente da ripassare adesso.'),
      h('p', { class: 'small' }, 'Aggiungi parole, persone e cose da ricordare con il pulsante +: domani le ritroverai qui.'),
      h('button', { class: 'btn primario pieno', onclick: () => ok({ punteggio: 100, n: 0 }) }, 'Avanti'))));
  }

  const coda = mescola(carte).map((c) => ({ c, giri: 0 }));
  let ricordate = 0, totali = 0;
  const contatore = h('div', { class: 'tiny muted center' });
  const area = h('div');
  svuota(box, contatore, area);

  while (coda.length) {
    if (opz.attuale && !opz.attuale()) return null;
    contatore.textContent = `${coda.length} ${coda.length === 1 ? 'carta' : 'carte'} rimaste`;
    const voce = coda.shift();
    const voto = await mostraCarta(area, voce.c, opz.segnale);
    if (opz.segnale && opz.segnale.aborted) return null;
    totali++;
    if (voto >= 3) ricordate++;
    api.post('/api/ripasso', { id: voce.c.id, voto }).catch((e) => console.error(e));
    // Sbagliata: torna in fondo alla coda (massimo due volte), così la rivedi oggi stesso.
    if (voto === 0 && voce.giri < 2) coda.push({ c: voce.c, giri: voce.giri + 1 });
  }
  return { punteggio: Math.round((ricordate / Math.max(1, totali)) * 100), n: totali };
}

function mostraCarta(area, c, segnale) {
  return new Promise((ok) => {
    const verso = c.tipo === 'en' ? (Math.random() < 0.5 ? 'en-it' : 'it-en') : c.tipo;
    let girata = false;
    const input = h('input', { type: 'text', placeholder: verso === 'persona' ? 'Scrivi il nome (facoltativo)' : 'Scrivi in inglese (facoltativo)', autocomplete: 'off', autocapitalize: 'off', spellcheck: false });
    const scrive = verso === 'it-en' || verso === 'persona';
    const esitoScritto = h('div', { class: 'small', style: { marginTop: '8px' } });
    const retro = h('div', { class: 'retro hidden' });
    const voti = h('div', { class: 'voti hidden' }, VOTI.map(([v, nome, sotto, cls]) =>
      h('button', { class: cls, onclick: () => fine(v) }, nome, h('small', sotto))));
    const gira = h('button', { class: 'btn primario pieno', style: { marginTop: '12px' }, onclick: () => scopri() }, 'Mostra risposta');

    const audioBtn = (testo) => h('button', { class: 'icona-btn', 'aria-label': 'Ascolta', onclick: (e) => { e.stopPropagation(); parla(testo); } }, icona('audio'));

    let fronte, risposta;
    if (verso === 'en-it') {
      fronte = [h('div', { class: 'row', style: { justifyContent: 'center' } }, h('span', { class: 'fronte' }, c.fronte), audioBtn(c.fronte)), h('div', { class: 'sotto' }, 'Cosa significa?')];
      risposta = [h('div', { class: 'principale' }, c.retro || '—'), c.nota ? inglese(c.nota, { tag: 'div', classe: 'muted', stile: { marginTop: '6px' } }) : null];
    } else if (verso === 'it-en') {
      fronte = [h('div', { class: 'fronte' }, c.retro || c.fronte), h('div', { class: 'sotto' }, 'Come si dice in inglese?')];
      risposta = [h('div', { class: 'row', style: { justifyContent: 'center' } }, h('span', { class: 'principale' }, c.fronte), audioBtn(c.fronte)),
        c.nota ? inglese(c.nota, { tag: 'div', classe: 'muted', stile: { marginTop: '6px' } }) : null];
    } else if (verso === 'persona') {
      const ex = c.extra || {};
      fronte = [ex.avatar ? avatar(ex.avatar) : null, h('div', { class: 'fronte', style: { fontSize: '1.2rem' } }, c.retro || 'Chi è?'),
        ex.dettaglio ? h('div', { class: 'sotto' }, ex.dettaglio) : null, h('div', { class: 'sotto' }, 'Come si chiama?')];
      risposta = [h('div', { class: 'principale' }, c.fronte), c.nota ? h('div', { class: 'muted', style: { marginTop: '6px' } }, '🧠 ' + c.nota) : null];
    } else {
      // Domande di cultura e correzioni di writing/speaking sono in inglese: parole toccabili.
      const enRisposta = c.tipo === 'cultura' || (c.extra && ['writing', 'speaking'].includes(c.extra.origine));
      fronte = [c.tipo === 'cultura' ? inglese(c.fronte, { tag: 'div', classe: 'fronte', stile: { fontSize: '1.25rem' } }) : h('div', { class: 'fronte', style: { fontSize: '1.25rem' } }, c.fronte),
        c.tipo === 'cultura' && c.nota ? h('div', { class: 'sotto tiny' }, c.nota) : null];
      risposta = [enRisposta ? inglese(c.retro, { tag: 'div', classe: 'principale' }) : h('div', { class: 'principale' }, c.retro),
        c.tipo === 'ricorda' && c.nota ? h('div', { class: 'muted small', style: { marginTop: '6px' } }, c.nota) : null];
    }
    svuota(retro, risposta);

    const scheda = h('div', { class: 'card flash' }, fronte, retro);
    svuota(area, scheda, scrive ? h('div', { style: { marginTop: '10px' } }, input, esitoScritto) : null, gira, voti);
    if (verso === 'en-it') parla(c.fronte).catch(() => {});

    function scopri() {
      if (girata) return;
      girata = true;
      retro.classList.remove('hidden');
      gira.classList.add('hidden');
      voti.classList.remove('hidden');
      if (scrive && input.value.trim()) {
        const esito = confronta(c.fronte, input.value);
        esitoScritto.textContent = esito === 'esatta' ? '✓ Scritto giusto' : esito === 'quasi' ? '≈ Quasi: controlla le lettere' : '✗ Non corrisponde';
        esitoScritto.style.color = esito === 'esatta' ? 'var(--good)' : esito === 'quasi' ? 'var(--warning)' : 'var(--critical)';
      }
      input.disabled = true;
      if (verso === 'it-en') parla(c.fronte).catch(() => {});
    }
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); scopri(); } });
    const tasti = (e) => {
      if (!scheda.isConnected) { document.removeEventListener('keydown', tasti); return; }
      if (e.target === input && !girata) return;
      if (!girata && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); scopri(); }
      else if (girata && ['1', '2', '3', '4'].includes(e.key)) fine(VOTI[Number(e.key) - 1][0]);
    };
    document.addEventListener('keydown', tasti);
    if (segnale) segnale.addEventListener('abort', () => document.removeEventListener('keydown', tasti), { once: true });
    function fine(v) {
      document.removeEventListener('keydown', tasti);
      if (segnale && segnale.aborted) return;
      ok(v);
    }
  });
}
