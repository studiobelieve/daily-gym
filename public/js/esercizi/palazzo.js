// Palazzo della memoria: metti ogni oggetto in un luogo di un percorso che conosci (casa tua),
// poi ripercorri i luoghi e "ritrovi" gli oggetti. La lista si allunga quando vai bene.
import { h, svuota, mescola, campo } from '../ui.js';
import { api } from '../api.js';
import { OGGETTI, PERCORSO_ESEMPIO } from '../dati/oggetti.js';
import { confronta } from '../shared/testo.js';
import { inglese as ingleseTesto } from '../parola.js';

const inglese_ = (t) => ingleseTesto(t, { tag: 'div', classe: 'oggetto' });

function leggiN() { try { return Number(localStorage.getItem('dg_palazzo_n')) || 5; } catch { return 5; } }
function scriviN(n) { try { localStorage.setItem('dg_palazzo_n', String(n)); } catch {} }

export async function avvia(box, opz) {
  let { percorsi } = await api.get('/api/percorsi');
  if (!percorsi.length) {
    await creaPercorso(box);
    percorsi = (await api.get('/api/percorsi')).percorsi;
  }
  const imp = await api.get('/api/impostazioni');
  const inglese = Boolean(imp.oggetti_inglese);

  let percorso = percorsi[0];
  const nMax = () => percorso.luoghi.length;
  let n = Math.min(leggiN(), nMax());
  await new Promise((ok) => {
    const sel = percorsi.length > 1
      ? h('select', { onchange: (e) => { percorso = percorsi.find((p) => String(p.id) === e.target.value); } },
        percorsi.map((p) => h('option', { value: p.id }, `${p.nome} (${p.luoghi.length} luoghi)`)))
      : null;
    svuota(box, h('div', { class: 'card stack' },
      h('h2', `Palazzo della memoria: ${n} oggetti`),
      h('p', 'Percorri mentalmente i luoghi del tuo percorso, sempre nello stesso ordine. In ogni luogo "lascia" un oggetto con un\'immagine esagerata e in movimento.'),
      h('p', { class: 'small muted' }, 'Esempio: divano + ombrello → l\'ombrello si apre da solo sul divano e lo inzuppa d\'acqua. Più è assurda, meglio funziona.'),
      inglese ? h('p', { class: 'small chip inglese' }, 'Oggetti in inglese: alleni anche il vocabolario') : null,
      sel ? campo('Percorso', sel) : null,
      h('button', { class: 'btn primario pieno', onclick: () => { n = Math.min(n, nMax()); ok(); } }, 'Inizia')));
  });

  const inizio = Date.now();
  const oggetti = mescola(OGGETTI).slice(0, n).map(([it, en]) => ({ it, en, mostra: inglese ? en : it }));
  const luoghi = percorso.luoghi.slice(0, n);

  for (let i = 0; i < n; i++) {
    if (opz.attuale && !opz.attuale()) return null;
    await new Promise((ok) => svuota(box, h('div', { class: 'card stack center' },
      h('div', { class: 'tiny muted' }, `${i + 1} di ${n}`),
      h('div', { class: 'luogo' }, luoghi[i]),
      inglese ? inglese_(oggetti[i].mostra) : h('div', { class: 'oggetto' }, oggetti[i].mostra),
      inglese ? h('div', { class: 'small muted' }, `(${oggetti[i].it})`) : null,
      h('p', { class: 'small muted' }, 'Chiudi gli occhi 3 secondi e "vedi" la scena.'),
      h('button', { class: 'btn primario pieno', onclick: ok }, i < n - 1 ? 'Prossimo luogo' : 'Fatto, verifichiamo'))));
  }

  let punti = 0;
  const esiti = [];
  for (let i = 0; i < n; i++) {
    const input = h('input', { type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: false, placeholder: inglese ? 'in inglese' : 'oggetto' });
    const scritto = await new Promise((ok) => {
      svuota(box, h('div', { class: 'card stack center' },
        h('div', { class: 'tiny muted' }, `${i + 1} di ${n}`),
        h('p', 'Cosa c\'era qui?'),
        h('div', { class: 'luogo', style: { fontSize: '1.2rem' } }, luoghi[i]),
        input,
        h('button', { class: 'btn primario pieno', onclick: () => ok(input.value) }, 'Conferma'),
        h('button', { class: 'btn fantasma piccolo', onclick: () => ok('') }, 'Non ricordo')));
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') ok(input.value); });
      setTimeout(() => input.focus(), 30);
    });
    let esito = confronta(oggetti[i].mostra, scritto);
    // In modalità inglese vale anche la parola italiana, ma conta meno.
    if (inglese && esito === 'sbagliata' && confronta(oggetti[i].it, scritto) !== 'sbagliata') esito = 'italiano';
    // Un refuso non è un errore di memoria: "quasi" vale come giusto.
    const valore = { esatta: 1, quasi: 1, italiano: 0.6, sbagliata: 0 }[esito];
    punti += valore;
    esiti.push({ luogo: luoghi[i], oggetto: oggetti[i].mostra, scritto, esito });
  }

  const punteggio = Math.round((punti / n) * 100);
  let prossimo = n;
  if (punteggio === 100) prossimo = n + 2;
  else if (punteggio >= 80) prossimo = n + 1;
  else if (punteggio < 60) prossimo = Math.max(3, n - 1);
  scriviN(Math.min(prossimo, 100));
  const r = await api.post('/api/attivita', { tipo: 'palazzo', punteggio, valore: n, durata: Math.round((Date.now() - inizio) / 1000), dettagli: { esiti, percorso: percorso.nome, inglese } });

  await new Promise((ok) => svuota(box, h('div', { class: 'card stack' },
    h('div', { class: 'center' }, h('p', { class: 'muted' }, 'Oggetti ritrovati'), h('div', { class: 'voto-grande' }, punteggio + '%')),
    r.record ? h('p', { class: 'chip memoria' }, `Nuovo record: ${n} oggetti tutti giusti!`) : null,
    h('ul', { class: 'lista small' }, esiti.map((e) => h('li', { class: 'row between' },
      h('span', { class: 'muted' }, e.luogo),
      h('span', { class: e.esito === 'sbagliata' ? 'barrato' : 'giusto' }, e.oggetto)))),
    prossimo > n && prossimo > nMax()
      ? h('p', { class: 'small' }, `Stai superando i luoghi del percorso: aggiungine altri in Palestra → Percorsi.`)
      : h('p', { class: 'small muted' }, `La prossima volta: ${Math.min(prossimo, nMax())} oggetti.`),
    h('button', { class: 'btn primario pieno', onclick: ok }, 'Avanti'))));
  return { punteggio, valore: n, record: r.record };
}

// Primo avvio: crea il percorso partendo da un esempio.
export function creaPercorso(box, esistente, { annullabile = false } = {}) {
  return new Promise((ok) => {
    const nome = h('input', { type: 'text', value: esistente ? esistente.nome : 'Casa mia' });
    const luoghi = h('textarea', { rows: 12 });
    luoghi.value = (esistente ? esistente.luoghi : PERCORSO_ESEMPIO).join('\n');
    const msg = h('p', { class: 'small', style: { color: 'var(--critical)' } });
    svuota(box, h('div', { class: 'card stack' },
      h('h2', esistente ? 'Modifica percorso' : 'Crea il tuo primo percorso'),
      h('p', { class: 'small' }, 'Scegli un posto che conosci benissimo (casa tua) e scrivi i luoghi nell\'ordine in cui li incontri camminando. Uno per riga. Più luoghi = liste più lunghe.'),
      campo('Nome', nome),
      campo('Luoghi, in ordine', luoghi, 'Ho messo un esempio: cambialo con i luoghi veri di casa tua.'),
      msg,
      h('button', { class: 'btn primario pieno', onclick: async () => {
        try {
          if (esistente) await api.put('/api/percorsi/' + esistente.id, { nome: nome.value, luoghi: luoghi.value });
          else await api.post('/api/percorsi', { nome: nome.value, luoghi: luoghi.value });
          ok(true);
        } catch (err) { msg.textContent = err.message; }
      } }, 'Salva percorso'),
      esistente ? h('button', { class: 'btn pericolo piccolo', onclick: async () => { await api.del('/api/percorsi/' + esistente.id); ok(false); } }, 'Elimina percorso') : null,
      annullabile ? h('button', { class: 'btn fantasma piccolo', onclick: () => ok(false) }, 'Annulla') : null));
  });
}
