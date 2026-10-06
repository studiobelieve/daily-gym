// Grammatica: prima la spiegazione (in italiano, con esempi toccabili), poi 8 esercizi nuovi.
// Un argomento si consolida con l'80% in due giorni diversi; con l'80% degli argomenti consolidati si sale di livello.
import { h, svuota, caricamento, mescola } from '../ui.js';
import { api } from '../api.js';
import { inglese, suggerimentoTocco } from '../parola.js';
import { confronta, confrontaFrase } from '../shared/testo.js';

export async function avvia(box, opz) {
  svuota(box, caricamento('Preparo la lezione di grammatica…'));
  const d = await api.post('/api/grammatica/lezione', { argomento: opz.argomento });
  const { argomento: arg, lezione: L, stato, ripasso } = d;
  const giaVista = stato && stato.volte > 0;

  // 1. Spiegazione
  await new Promise((ok) => svuota(box, h('article', { class: 'card stack' },
    h('div', { class: 'row between' }, h('span', { class: 'chip inglese' }, `Grammatica ${arg.livello}`), ripasso ? h('span', { class: 'chip' }, 'Ripasso') : stato && stato.consolidato ? h('span', { class: 'chip' }, '✓ Consolidato') : null),
    h('h1', { style: { margin: 0 } }, L.titolo),
    L.quando ? h('p', { style: { margin: 0 } }, L.quando) : null,
    L.regole.length ? h('div', { class: 'card stack', style: { background: 'var(--surface-2)' } },
      h('strong', { class: 'small' }, 'La regola'),
      h('ul', { style: { margin: 0, paddingLeft: '20px' } }, L.regole.map((r) => h('li', r)))) : null,
    h('div', { class: 'stack' }, h('strong', { class: 'small' }, 'Esempi'),
      L.esempi.map((e) => h('div', inglese(e.en, { tag: 'div', stile: { fontWeight: 600 } }), h('div', { class: 'small muted' }, e.it)))),
    L.errori.length ? h('div', { class: 'stack' }, h('strong', { class: 'small' }, 'Errori tipici di chi parla italiano'),
      L.errori.map((e) => h('div', { class: 'errore-riga' },
        h('div', h('span', { class: 'barrato' }, e.no), ' → ', inglese(e.si, { classe: 'giusto' })),
        e.perche ? h('div', { class: 'small muted' }, e.perche) : null))) : null,
    L.trucco ? h('div', { class: 'card small' }, '💡 ', L.trucco) : null,
    suggerimentoTocco(),
    h('button', { class: 'btn primario pieno', onclick: ok }, giaVista ? 'Agli esercizi' : 'Ho capito: agli esercizi'))));
  if (opz.attuale && !opz.attuale()) return null;

  // 2. Esercizi
  svuota(box, caricamento('Preparo gli esercizi…'));
  const { items } = await api.post('/api/grammatica/esercizio', { argomento: arg.id });
  const inizio = Date.now();
  const esiti = [];
  for (let i = 0; i < items.length; i++) {
    if (opz.attuale && !opz.attuale()) return null;
    const it = items[i];
    const risposta = await new Promise((ok) => {
      const input = h('input', { type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: false, placeholder: it.tipo === 'traduci' ? 'La frase in inglese' : 'La tua risposta' });
      const comandi = it.tipo === 'scegli'
        ? h('div', { class: 'opzioni' }, mescola(it.opzioni).map((o) => h('button', { onclick: () => ok(o) }, o)))
        : h('div', { class: 'stack' }, input,
          h('button', { class: 'btn primario pieno', onclick: () => ok(input.value) }, 'Controlla'),
          h('button', { class: 'btn fantasma piccolo', onclick: () => ok('') }, 'Non lo so'));
      svuota(box, h('div', { class: 'card stack' },
        h('div', { class: 'row between tiny muted' }, h('span', arg.titolo), h('span', `${i + 1} di ${items.length}`)),
        h('p', { class: 'small muted', style: { margin: 0 } }, it.istruzione),
        it.tipo === 'traduci' ? h('h2', { style: { fontWeight: 600, margin: 0 } }, it.testo) : inglese(it.testo, { tag: 'h2', stile: { fontWeight: 600, margin: 0 } }),
        comandi));
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') ok(input.value); });
      if (it.tipo !== 'scegli') setTimeout(() => input.focus(), 30);
    });
    const valuta = (r) => (it.tipo === 'traduci' && r.split(/\s+/).length > 3 ? (confrontaFrase(r, risposta).punteggio >= 90 ? 'giusta' : 'sbagliata') : confronta(r, risposta));
    const esito = risposta.trim() ? it.risposte.map(valuta).find((x) => x !== 'sbagliata') || 'sbagliata' : 'sbagliata';
    const giusto = esito !== 'sbagliata';
    esiti.push({ giusto, risposta, corretta: it.risposte[0], spiegazione: it.spiegazione });
    await new Promise((ok) => svuota(box, h('div', { class: 'card stack' },
      h('div', { style: { fontSize: '1.8rem' } }, giusto ? (esito === 'quasi' ? '≈ Quasi, va bene' : '✓ Giusto') : '✗'),
      h('div', h('span', { class: 'muted small' }, 'Risposta: '), inglese(it.risposte[0], { tag: 'strong', classe: 'giusto' })),
      risposta.trim() && !giusto ? h('div', { class: 'small' }, 'Hai scritto: ', h('span', { class: 'barrato' }, risposta)) : null,
      it.spiegazione ? h('p', { class: 'small', style: { margin: 0 } }, it.spiegazione) : null,
      h('button', { class: 'btn primario pieno', onclick: ok }, i < items.length - 1 ? 'Avanti' : 'Fine'))));
  }

  // 3. Risultato e avanzamento
  const r = await api.post('/api/grammatica/risultato', { argomento: arg.id, esiti, durata: Math.round((Date.now() - inizio) / 1000) });
  const msg = r.salito ? `🎉 Livello di grammatica superato: passi da ${r.salito.da} a ${r.salito.a}!`
    : r.appenaConsolidato ? '✓ Argomento consolidato! Il prossimo esercizio passa all\'argomento successivo.'
      : r.consolidato ? 'Argomento già consolidato: ottimo ripasso.'
        : r.voto >= 80 ? `Bene: ancora ${Math.max(0, 2 - r.giorniOk)} ${2 - r.giorniOk === 1 ? 'giorno' : 'giorni'} con l'80% per consolidarlo (serve in giorni diversi, così resta).`
          : 'Sotto l\'80%: ripassa la regola, l\'argomento torna finché non lo consolidi. Gli errori entrano anche nelle tue lacune.';
  await new Promise((ok) => svuota(box, h('div', { class: 'card stack' },
    h('div', { class: 'center' }, h('p', { class: 'muted', style: { margin: 0 } }, arg.titolo), h('div', { class: 'voto-grande' }, r.voto + '%')),
    h('p', { style: { margin: 0 } }, msg),
    h('p', { class: 'tiny muted', style: { margin: 0 } }, `Livello ${r.salito ? r.salito.a : arg.livello}: ${Math.round(r.quota * 100)}% degli argomenti consolidati (si sale all'80%).`),
    h('button', { class: 'btn primario pieno', onclick: ok }, 'Avanti'))));
  return { punteggio: r.voto };
}
