// Focus e concentrazione: tre esercizi a rotazione, scelti per le evidenze che hanno.
// 1. Conta i respiri (Levinson et al. 2014): attenzione focalizzata sul respiro; 4 settimane di pratica
//    hanno ridotto la mente che vaga. È l'allenamento con più prove.
// 2. Non premere il 3 (SART, Robertson 1997): misura i cali di attenzione sostenuta, il "pilota automatico".
// 3. Colori (Stroop): attenzione selettiva, ignorare ciò che distrae.
// Onestà: gli esercizi tipo gioco migliorano soprattutto il compito stesso; il trasferimento alla vita
// reale è dimostrato meglio per la pratica del respiro. Per questo il respiro è il primo della rotazione.
import { h, svuota, attendi } from '../ui.js';
import { api } from '../api.js';

const MODI = {
  respiro: { nome: 'Conta i respiri', durata: '3 min' },
  sart: { nome: 'Non premere il 3', durata: '2 min e mezzo' },
  stroop: { nome: 'Colori', durata: '1 min e mezzo' },
};
const GIRO = ['respiro', 'sart', 'respiro', 'stroop'];

function prossimoModo() {
  let n = 0;
  try { n = Number(localStorage.getItem('dg_focus_giro')) || 0; localStorage.setItem('dg_focus_giro', String(n + 1)); } catch { n = Math.floor(Math.random() * GIRO.length); }
  return GIRO[n % GIRO.length];
}

export async function avvia(box, opz) {
  let modo = opz.modo && MODI[opz.modo] ? opz.modo : null;
  if (!modo && opz.singolo) modo = await scegli(box);
  if (!modo) modo = prossimoModo();
  const inizio = Date.now();
  const fuori = () => (opz.attuale && !opz.attuale()) || (opz.segnale && opz.segnale.aborted);
  const esito = modo === 'respiro' ? await respiro(box, fuori) : modo === 'sart' ? await sart(box, fuori) : await stroop(box, fuori);
  if (!esito) return null;
  const durata = Math.round((Date.now() - inizio) / 1000);
  await api.post('/api/attivita', { tipo: 'focus', punteggio: esito.punteggio, valore: esito.valore, durata, dettagli: { modo, ...esito.dettagli } });
  await new Promise((ok) => svuota(box, h('div', { class: 'card stack' },
    h('div', { class: 'center' }, h('p', { class: 'muted', style: { margin: 0 } }, MODI[modo].nome), h('div', { class: 'voto-grande' }, esito.punteggio + '%')),
    ...esito.righe.map((r) => h('p', { class: 'small', style: { margin: 0 } }, r)),
    h('p', { class: 'tiny muted', style: { margin: 0 } }, esito.consiglio),
    h('button', { class: 'btn primario pieno', onclick: ok }, 'Avanti'))));
  return { punteggio: esito.punteggio };
}

function scegli(box) {
  return new Promise((ok) => svuota(box, h('div', { class: 'card stack' },
    h('h2', { style: { margin: 0 } }, 'Focus e concentrazione'),
    h('p', { class: 'small muted', style: { margin: 0 } }, 'Scegli l\'esercizio. Nell\'allenamento guidato si alternano da soli, con il respiro più spesso perché è quello con più prove.'),
    h('button', { class: 'btn pieno', onclick: () => ok('respiro') }, '🌬 Conta i respiri · 3 min'),
    h('button', { class: 'btn pieno', onclick: () => ok('sart') }, '🎯 Non premere il 3 · 2 min e mezzo'),
    h('button', { class: 'btn pieno', onclick: () => ok('stroop') }, '🎨 Colori · 1 min e mezzo'))));
}

const intro = (box, titolo, ...testo) => new Promise((ok) => svuota(box, h('div', { class: 'card stack' },
  h('h2', { style: { margin: 0 } }, titolo),
  ...testo.map((t) => h('p', { class: 'small', style: { margin: 0 } }, t)),
  h('button', { class: 'btn primario pieno', onclick: ok }, 'Inizia'))));

// ---------- 1. Conta i respiri ----------
// Conti da 1 a 9 senza vedere il numero: a ogni espirazione tocchi "Respiro", alla nona "Nono".
// Se perdi il conto lo dici: accorgersene è proprio l'abilità che si allena.
async function respiro(box, fuori) {
  await intro(box, '🌬 Conta i respiri',
    'Siediti comodo e respira normalmente, senza forzare. Puoi tenere gli occhi semichiusi.',
    'A ogni espirazione tocca "Respiro". Alla nona espirazione tocca invece "Nono ✓", poi ricomincia da 1. Il numero non lo vedi: lo tieni tu a mente.',
    'Se ti accorgi di aver perso il conto, tocca "Mi sono perso" e riparti da 1. Non è una sconfitta: notare che la mente è scappata è esattamente ciò che si allena.');
  const SECONDI = 180;
  let conteggio = 0, giusti = 0, sbagliati = 0, persi = 0;
  const fine = Date.now() + SECONDI * 1000;
  const tempo = h('div', { class: 'tiny muted center' });
  const segno = h('div', { class: 'center', style: { fontSize: '2.4rem', minHeight: '3rem' } }, '·');
  const lampo = (c) => { segno.textContent = c; setTimeout(() => { segno.textContent = '·'; }, 250); };
  return new Promise((ok) => {
    const chiudi = () => { clearInterval(t); document.removeEventListener('keydown', tasti); };
    const respira = () => { conteggio++; if (conteggio > 9) { sbagliati++; conteggio = 0; } lampo('○'); };
    const nono = () => { if (conteggio === 8) giusti++; else sbagliati++; conteggio = 0; lampo('✓'); };
    const perso = () => { persi++; conteggio = 0; lampo('↺'); };
    const tasti = (e) => { if (e.key === ' ' || e.key === 'ArrowDown') { e.preventDefault(); respira(); } else if (e.key === 'Enter') nono(); };
    document.addEventListener('keydown', tasti);
    const t = setInterval(() => {
      if (fuori()) { chiudi(); ok(null); return; }
      const rest = Math.max(0, Math.round((fine - Date.now()) / 1000));
      tempo.textContent = `${Math.floor(rest / 60)}:${String(rest % 60).padStart(2, '0')}`;
      if (rest <= 0) {
        chiudi();
        const tot = giusti + sbagliati + persi;
        const punteggio = tot ? Math.round((giusti / tot) * 100) : 0;
        ok({
          punteggio, valore: giusti, dettagli: { giusti, sbagliati, persi },
          righe: [`Cicli da 9 completati giusti: ${giusti}`, `Conteggi sbagliati: ${sbagliati}`, `Volte in cui ti sei accorto di esserti perso: ${persi}`],
          consiglio: 'In 3 minuti di solito si fanno 3-5 cicli. Conta di più la costanza che il punteggio: pochi minuti ogni giorno. "Mi sono perso" non abbassa la tua capacità, solo il punteggio di oggi.',
        });
      }
    }, 250);
    svuota(box, h('div', { class: 'card stack' },
      tempo, segno,
      h('button', { class: 'btn primario pieno', style: { padding: '28px 0', fontSize: '1.2rem' }, onclick: respira }, 'Respiro'),
      h('div', { class: 'row' },
        h('button', { class: 'btn grow', style: { padding: '18px 0' }, onclick: nono }, 'Nono ✓'),
        h('button', { class: 'btn grow', style: { padding: '18px 0' }, onclick: perso }, '↺ Mi sono perso')),
      h('p', { class: 'tiny muted center', style: { margin: 0 } }, 'Da tastiera: spazio = respiro, Invio = nono.')));
  });
}

// ---------- 2. Non premere il 3 (SART) ----------
async function sart(box, fuori) {
  await intro(box, '🎯 Non premere il 3',
    'Appariranno numeri da 1 a 9, uno alla volta e veloci. Tocca il pulsante per OGNI numero, tranne quando esce il 3: col 3 non toccare.',
    'Il 3 esce di rado: per questo la mano parte in automatico. Ogni 3 toccato è un momento in cui l\'attenzione è andata in "pilota automatico". Precisione prima della velocità.');
  const prove = [];
  for (let d = 1; d <= 9; d++) for (let k = 0; k < 13; k++) prove.push(d);
  for (let i = prove.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [prove[i], prove[j]] = [prove[j], prove[i]]; }
  const schermo = h('div', { class: 'cifre', style: { minHeight: '5rem' } }, '');
  let premuto = false, mostrato = 0;
  const tocca = () => { if (!premuto) { premuto = true; tempi.push(performance.now() - mostrato); } };
  const tasti = (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); tocca(); } };
  let tempi = [];
  svuota(box, h('div', { class: 'card stack' }, schermo,
    h('button', { class: 'btn primario pieno', style: { padding: '34px 0', fontSize: '1.2rem', touchAction: 'manipulation' }, onpointerdown: (e) => { e.preventDefault(); tocca(); } }, 'Tocca'),
    h('p', { class: 'tiny muted center', style: { margin: 0 } }, 'Da tastiera: spazio.')));
  document.addEventListener('keydown', tasti);
  await attendi(800);
  let commissioni = 0, omissioni = 0;
  const rt = [];
  try {
    for (const d of prove) {
      if (fuori()) return null;
      premuto = false; tempi = [];
      schermo.style.fontSize = ['2.4rem', '3rem', '3.6rem', '4.2rem'][Math.floor(Math.random() * 4)];
      schermo.textContent = d;
      mostrato = performance.now();
      await attendi(250);
      schermo.textContent = '⊗';
      await attendi(900);
      if (d === 3 && premuto) commissioni++;
      if (d !== 3 && !premuto) omissioni++;
      if (d !== 3 && premuto) rt.push(tempi[0]);
    }
  } finally {
    document.removeEventListener('keydown', tasti);
  }
  const tre = prove.filter((d) => d === 3).length, altri = prove.length - tre;
  const media = rt.length ? rt.reduce((s, x) => s + x, 0) / rt.length : 0;
  const dev = rt.length ? Math.sqrt(rt.reduce((s, x) => s + (x - media) ** 2, 0) / rt.length) : 0;
  const punteggio = Math.max(0, Math.round(100 * (1 - 0.75 * (commissioni / tre) - 0.25 * (omissioni / altri))));
  return {
    punteggio, valore: commissioni, dettagli: { commissioni, omissioni, rtMedio: Math.round(media), variabilita: media ? Math.round((dev / media) * 100) : 0 },
    righe: [`3 toccati (pilota automatico): ${commissioni} su ${tre}`, `Numeri mancati: ${omissioni} su ${altri}`,
      `Tempo medio: ${Math.round(media)} ms · regolarità: ${media ? Math.round((dev / media) * 100) : 0}% di variazione (più è bassa, più l'attenzione è stabile)`],
    consiglio: 'Se tocchi molti 3 vai troppo veloce: rallenta un poco e resta presente su ogni numero. È lo stesso errore di quando leggi una pagina e non ricordi niente.',
  };
}

// ---------- 3. Colori (Stroop) ----------
const COLORI = [['ROSSO', '#e5484d'], ['BLU', '#2f6fed'], ['VERDE', '#2f9e44'], ['GIALLO', '#e0a800']];

async function stroop(box, fuori) {
  await intro(box, '🎨 Colori',
    'Vedrai il nome di un colore scritto con un inchiostro di un altro colore. Tocca il colore dell\'INCHIOSTRO, non quello che c\'è scritto.',
    'Esempio: la parola ROSSO scritta in blu → tocca Blu. Il cervello legge da solo: allenarsi a ignorarlo è attenzione selettiva.');
  const N = 40;
  const prove = Array.from({ length: N }, (_, i) => {
    const ink = Math.floor(Math.random() * 4);
    const coerente = i % 3 === 0;
    let parola = ink;
    if (!coerente) while (parola === ink) parola = Math.floor(Math.random() * 4);
    return { ink, parola, coerente };
  });
  const risultati = [];
  for (let i = 0; i < N; i++) {
    if (fuori()) return null;
    const p = prove[i];
    const t0 = performance.now();
    const scelta = await new Promise((ok) => svuota(box, h('div', { class: 'card stack' },
      h('div', { class: 'tiny muted center' }, `${i + 1} di ${N}`),
      h('div', { class: 'center', style: { fontSize: '2.8rem', fontWeight: 800, color: COLORI[p.ink][1], minHeight: '4rem', letterSpacing: '.04em' } }, COLORI[p.parola][0]),
      h('div', { class: 'tile-griglia' }, COLORI.map(([nome], k) =>
        h('button', { class: 'btn', style: { padding: '18px 0', touchAction: 'manipulation' }, onpointerdown: (e) => { e.preventDefault(); ok(k); } }, nome[0] + nome.slice(1).toLowerCase()))))));
    risultati.push({ giusto: scelta === p.ink, rt: performance.now() - t0, coerente: p.coerente });
    await attendi(180);
  }
  const giusti = risultati.filter((r) => r.giusto).length;
  const mediaRt = (lista) => (lista.length ? lista.reduce((s, r) => s + r.rt, 0) / lista.length : 0);
  const interferenza = Math.round(mediaRt(risultati.filter((r) => r.giusto && !r.coerente)) - mediaRt(risultati.filter((r) => r.giusto && r.coerente)));
  const punteggio = Math.round((giusti / N) * 100);
  return {
    punteggio, valore: interferenza, dettagli: { giusti, interferenza },
    righe: [`Risposte giuste: ${giusti} su ${N}`, `Interferenza: ${interferenza} ms (quanto ti rallenta la parola scritta: più è bassa, meglio ignori le distrazioni)`],
    consiglio: 'Punta prima a sbagliare poco, poi a ridurre l\'interferenza. Nella vita reale lo stesso muscolo serve per non farsi agganciare dalle notifiche.',
  };
}
