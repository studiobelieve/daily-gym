// Allenamento nomi: memorizzi alcune persone (volto + nome + dettagli), poi una pausa che distrae,
// poi devi ricordare i nomi. Il numero di persone cresce quando vai bene.
import { h, svuota, mescola, attendi } from '../ui.js';
import { api } from '../api.js';
import { avatar, generaAvatar, trattiAvatar } from '../avatar.js';
import { NOMI_F, NOMI_M, COGNOMI, LAVORI, CITTA, DETTAGLI, lavoroPer, dettaglioPer } from '../dati/nomi.js';
import { confronta } from '../shared/testo.js';

const scegli = (a) => a[Math.floor(Math.random() * a.length)];

function leggiN() { try { return Number(localStorage.getItem('dg_nomi_n')) || 4; } catch { return 4; } }
function scriviN(n) { try { localStorage.setItem('dg_nomi_n', String(n)); } catch {} }

function persone(n) {
  const usati = new Set();
  const out = [];
  while (out.length < n) {
    const femmina = Math.random() < 0.5;
    const nome = scegli(femmina ? NOMI_F : NOMI_M);
    if (usati.has(nome)) continue;
    usati.add(nome);
    const a = generaAvatar();
    if (!femmina && Math.random() < 0.4 && !a.barba) a.barba = scegli(['piena', 'baffi', 'pizzetto']);
    if (femmina) a.barba = null;
    out.push({
      nome, cognome: scegli(COGNOMI), femmina, avatar: a,
      lavoro: lavoroPer(scegli(LAVORI), femmina), citta: scegli(CITTA), dettaglio: dettaglioPer(scegli(DETTAGLI), femmina),
    });
  }
  return out;
}

export async function avvia(box, opz) {
  const n = leggiN();
  await new Promise((ok) => svuota(box, h('div', { class: 'card stack' },
    h('h2', `Ricorda ${n} persone`),
    h('p', 'Per ogni persona usa questo metodo in 3 passi:'),
    h('ol', { class: 'small', style: { paddingLeft: '20px', margin: 0 } },
      h('li', 'Ripeti il nome ad alta voce, anche sottovoce.'),
      h('li', 'Trasformalo in un\'immagine: "Rosa" → una rosa, "Marino" → il mare, "Bruno" → un orso bruno.'),
      h('li', 'Aggancia l\'immagine a un dettaglio del volto: la rosa tra i capelli ricci, il mare dentro gli occhiali.')),
    h('p', { class: 'small muted' }, 'Più l\'immagine è strana ed esagerata, più resta in testa.'),
    h('button', { class: 'btn primario pieno', onclick: ok }, 'Inizia'))));

  const inizio = Date.now();
  const lista = persone(n);
  // 1. Studio
  for (let i = 0; i < lista.length; i++) {
    if (opz.attuale && !opz.attuale()) return null;
    const p = lista[i];
    const assoc = h('input', { type: 'text', placeholder: 'La tua immagine per il nome (facoltativa)' });
    await new Promise((ok) => {
      svuota(box, h('div', { class: 'card stack center' },
        h('div', { class: 'tiny muted' }, `Persona ${i + 1} di ${lista.length}`),
        avatar(p.avatar),
        h('div', { class: 'oggetto' }, `${p.nome} ${p.cognome}`),
        h('div', `${p.lavoro} · ${p.citta}`),
        h('div', { class: 'small muted' }, p.dettaglio),
        h('div', { class: 'tiny muted' }, 'Tratti: ' + trattiAvatar(p.avatar).join(', ')),
        assoc,
        h('button', { class: 'btn primario pieno', onclick: () => { p.associazione = assoc.value.trim(); ok(); } }, i < lista.length - 1 ? 'Prossima persona' : 'Ho finito')));
    });
  }

  // 2. Distrazione: impedisce di ripetere i nomi a mente (così si misura la memoria vera).
  const partenza = 80 + Math.floor(Math.random() * 20);
  const timer = h('div', { class: 'voto-grande' }, '20');
  svuota(box, h('div', { class: 'card stack center' },
    h('p', 'Pausa di 20 secondi'),
    h('p', { class: 'small' }, `Conta all'indietro di 3 in 3 partendo da ${partenza} (${partenza}, ${partenza - 3}, ${partenza - 6}…).`),
    timer));
  for (let s = 20; s > 0; s--) { timer.textContent = s; await attendi(1000); if (opz.attuale && !opz.attuale()) return null; }

  // 3. Richiamo
  let punti = 0;
  const esiti = [];
  for (const p of mescola(lista)) {
    const nomeIn = h('input', { type: 'text', placeholder: 'Nome', autocomplete: 'off', autocapitalize: 'words', spellcheck: false });
    const cognIn = h('input', { type: 'text', placeholder: 'Cognome (bonus)', autocomplete: 'off', autocapitalize: 'words', spellcheck: false });
    const risposta = await new Promise((ok) => {
      const invia = () => ok({ nome: nomeIn.value, cognome: cognIn.value });
      svuota(box, h('div', { class: 'card stack center' },
        avatar(p.avatar),
        h('div', `${p.lavoro} · ${p.citta}`),
        h('div', { class: 'small muted' }, p.dettaglio),
        h('div', { class: 'row' }, h('div', { class: 'grow' }, nomeIn), h('div', { class: 'grow' }, cognIn)),
        h('button', { class: 'btn primario pieno', onclick: invia }, 'Conferma'),
        h('button', { class: 'btn fantasma piccolo', onclick: () => ok({ nome: '', cognome: '' }) }, 'Non ricordo')));
      [nomeIn, cognIn].forEach((i) => i.addEventListener('keydown', (e) => { if (e.key === 'Enter') invia(); }));
      setTimeout(() => nomeIn.focus(), 30);
    });
    const en = risposta.nome ? confronta(p.nome, risposta.nome) : 'sbagliata';
    const ec = risposta.cognome ? confronta(p.cognome, risposta.cognome) : 'sbagliata';
    const val = { esatta: 1, quasi: 0.75, sbagliata: 0 };
    const pp = val[en] * 0.8 + val[ec] * 0.2;
    punti += pp;
    esiti.push({ nome: p.nome, esito: en });
    await new Promise((ok) => {
      svuota(box, h('div', { class: 'card stack center' },
        h('div', { style: { fontSize: '2rem' } }, en === 'esatta' ? '✓' : en === 'quasi' ? '≈' : '✗'),
        h('div', { class: 'oggetto' }, `${p.nome} ${p.cognome}`),
        p.associazione ? h('p', { class: 'small muted' }, '🧠 ' + p.associazione) : null,
        h('button', { class: 'btn primario pieno', onclick: ok }, 'Avanti')));
    });
  }

  const punteggio = Math.round((punti / lista.length) * 100);
  let prossimo = n;
  if (punteggio >= 90) prossimo = Math.min(12, n + 1);
  else if (punteggio < 55) prossimo = Math.max(3, n - 1);
  scriviN(prossimo);
  await api.post('/api/attivita', { tipo: 'nomi', punteggio, valore: n, durata: Math.round((Date.now() - inizio) / 1000), dettagli: { esiti } });
  await new Promise((ok) => svuota(box, h('div', { class: 'card stack center' },
    h('p', { class: 'muted' }, 'Precisione'),
    h('div', { class: 'voto-grande' }, punteggio + '%'),
    h('p', { class: 'small' }, prossimo > n ? `Ottimo: la prossima volta ${prossimo} persone.` : prossimo < n ? `La prossima volta ${prossimo} persone: consolidiamo la tecnica.` : `La prossima volta di nuovo ${n} persone.`),
    h('p', { class: 'small muted' }, 'Usa la stessa tecnica con le persone vere: aggiungile con + → Persona, così l\'app te le ripropone finché non le sai.'),
    h('button', { class: 'btn primario pieno', onclick: ok }, 'Avanti'))));
  return { punteggio, valore: n };
}
