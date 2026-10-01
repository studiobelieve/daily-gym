// Digit span: sequenze di cifre sempre più lunghe. Misura la memoria di lavoro (il tuo "termometro").
import { h, svuota, attendi } from '../ui.js';
import { api } from '../api.js';

function sequenza(n) {
  const s = [];
  while (s.length < n) {
    const c = Math.floor(Math.random() * 10);
    if (c !== s[s.length - 1]) s.push(c); // niente cifre ripetute di fila
  }
  return s;
}

export async function avvia(box, opz) {
  await new Promise((ok) => svuota(box, h('div', { class: 'card stack' },
    h('h2', 'Digit span'),
    h('p', 'Vedrai delle cifre una alla volta. Alla fine scrivile nello stesso ordine. Ogni volta che indovini, la sequenza si allunga di una cifra.'),
    h('p', { class: 'small muted' }, 'Trucco: raggruppa le cifre a coppie o a terzine, come un numero di telefono (47 · 29 · 13). Si chiama "chunking" ed è la base di tutte le tecniche di memoria.'),
    h('button', { class: 'btn primario pieno', onclick: ok }, 'Inizia'))));

  const inizio = Date.now();
  let lunghezza = 3, migliore = 0, errori = 0;
  const tentativi = [];
  while (errori < 2 && lunghezza <= 20) {
    if (opz.attuale && !opz.attuale()) return null;
    const seq = sequenza(lunghezza);
    const giusto = await prova(box, seq);
    tentativi.push({ lunghezza, giusto });
    if (giusto) { migliore = lunghezza; lunghezza++; errori = 0; }
    else errori++;
  }
  const punteggio = Math.min(100, Math.round((migliore / 12) * 100));
  const r = await api.post('/api/attivita', { tipo: 'span', punteggio, valore: migliore, durata: Math.round((Date.now() - inizio) / 1000), dettagli: { tentativi } });
  await new Promise((ok) => svuota(box, h('div', { class: 'card stack center' },
    h('p', { class: 'muted' }, 'Il tuo span di oggi'),
    h('div', { class: 'voto-grande' }, migliore, h('span', { class: 'small muted' }, ' cifre')),
    r.record ? h('p', { class: 'chip memoria' }, 'Nuovo record personale!') : null,
    h('p', { class: 'small muted' }, 'Media degli adulti: 7 cifre circa. Con il chunking si arriva molto oltre.'),
    h('button', { class: 'btn primario pieno', onclick: ok }, 'Avanti'))));
  return { punteggio, valore: migliore, record: r.record };
}

async function prova(box, seq) {
  const schermo = h('div', { class: 'cifre', 'aria-live': 'polite' }, '');
  svuota(box, h('div', { class: 'card stack' }, h('div', { class: 'tiny muted center' }, `${seq.length} cifre`), schermo));
  await attendi(700);
  for (const c of seq) {
    schermo.textContent = c;
    await attendi(850);
    schermo.textContent = '';
    await attendi(200);
  }
  return new Promise((ok) => {
    const input = h('input', { type: 'text', inputmode: 'numeric', pattern: '[0-9]*', autocomplete: 'off', class: 'grande-input', placeholder: '…' });
    const invia = () => {
      const scritto = input.value.replace(/\D/g, '');
      const giusto = scritto === seq.join('');
      svuota(box, h('div', { class: 'card stack center' },
        h('div', { style: { fontSize: '2rem' } }, giusto ? '✓' : '✗'),
        h('p', giusto ? 'Giusto!' : 'Era: ' + seq.join(' ')),
        !giusto && scritto ? h('p', { class: 'small muted' }, 'Hai scritto: ' + scritto.split('').join(' ')) : null));
      setTimeout(() => ok(giusto), giusto ? 700 : 1600);
    };
    svuota(box, h('div', { class: 'card stack' },
      h('p', { class: 'center' }, 'Scrivi le cifre in ordine'),
      input,
      h('button', { class: 'btn primario pieno', onclick: invia }, 'Conferma')));
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') invia(); });
    setTimeout(() => input.focus(), 30);
  });
}
