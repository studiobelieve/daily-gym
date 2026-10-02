// Piano della sessione del giorno: cosa fare oggi, in che ordine. Funzione pura (testata).
//
//              Sessione corta (~10')          Completa (~20') aggiunge
// Lun / Gio    Ripasso + Allenamento nomi     Speaking
// Mar / Ven    Ripasso + Pillola di cultura   Writing
// Mer / Sab    Ripasso + Palazzo memoria      Speaking sulla pillola
// Domenica     Ripasso + Digit span           Dettato + Riepilogo settimanale
import { giornoSettimana } from './testo.js';

export const ESERCIZI = {
  test: { nome: 'Test di livello', area: 'inglese', minuti: 8, ai: false },
  ripasso: { nome: 'Ripasso carte', area: 'costanza', minuti: 6, ai: false },
  nomi: { nome: 'Allenamento nomi', area: 'memoria', minuti: 4, ai: false },
  palazzo: { nome: 'Palazzo della memoria', area: 'memoria', minuti: 5, ai: false },
  span: { nome: 'Digit span', area: 'memoria', minuti: 2, ai: false },
  cultura: { nome: 'Pillola di cultura', area: 'cultura', minuti: 4, ai: true },
  writing: { nome: 'Writing', area: 'inglese', minuti: 7, ai: true },
  dettato: { nome: 'Dettato', area: 'inglese', minuti: 4, ai: true },
  speaking: { nome: 'Speaking', area: 'inglese', minuti: 8, ai: true },
  riepilogo: { nome: 'Riepilogo settimanale', area: 'costanza', minuti: 2, ai: false },
  lacune: { nome: 'Lavoro sulle lacune', area: 'inglese', minuti: 5, ai: true },
  difficili: { nome: 'Carte difficili', area: 'costanza', minuti: 3, ai: false },
};

// Se l'AI non è configurata, gli esercizi AI vengono sostituiti da esercizi offline.
const SOSTITUTI = { cultura: 'palazzo', writing: 'span', dettato: 'span', speaking: 'nomi', lacune: 'difficili' };

export function pianoDelGiorno(giorno, tipo, { ai = true, testFatto = true, lacune = 0 } = {}) {
  const g = giornoSettimana(giorno);
  let base, extra;
  if (g === 1 || g === 4) { base = ['ripasso', 'nomi']; extra = [{ id: 'speaking' }]; }
  else if (g === 2 || g === 5) { base = ['ripasso', 'cultura']; extra = [{ id: 'writing' }]; }
  else if (g === 3 || g === 6) { base = ['ripasso', 'palazzo']; extra = [{ id: 'speaking', scenario: 'pillola' }]; }
  else { base = ['ripasso', 'span']; extra = [{ id: 'dettato' }, { id: 'riepilogo' }]; }

  let passi = base.map((id) => ({ id }));
  if (tipo === 'completa') passi = passi.concat(extra);
  // Errori ricorrenti da sistemare: la sessione completa li lavora ogni giorno.
  if (tipo === 'completa' && lacune >= 3) passi.splice(1, 0, { id: 'lacune' });
  if (!testFatto) passi.unshift({ id: 'test' });

  const visti = new Set();
  return passi
    .map((p) => (!ai && ESERCIZI[p.id].ai ? { id: SOSTITUTI[p.id] } : p))
    .filter((p) => { const k = p.id + (p.scenario || ''); if (visti.has(k)) return false; visti.add(k); return true; })
    .map((p) => ({ ...p, ...ESERCIZI[p.id] }));
}

export function minutiTotali(passi) {
  return passi.reduce((s, p) => s + p.minuti, 0);
}

// ---------- Allenamento infinito ----------
// Sceglie il prossimo esercizio. stato = GET /api/allenamento/stato; fatti = id già svolti in questo
// allenamento, dal più vecchio al più recente. Priorità: ripasso in scadenza, lacune, punti deboli,
// poi il "programma" (contenuti nuovi), evitando di ripetere gli stessi esercizi di fila.
const PROGRAMMA = ['cultura', 'writing', 'dettato', 'speaking', 'nomi', 'palazzo', 'span'];

export function prossimoEsercizio(stato, fatti = [], rng = Math.random, oggi = null) {
  const recenti = (n) => fatti.slice(-n);
  const ai = stato.ai !== false;
  // Apertura fissa: prima ciò che è in scadenza, poi le lacune. Dopo si alterna con pesi.
  const fisso = (id) => ({ id, ...ESERCIZI[id], ...(id === 'ripasso' ? { limite: 15 } : {}) });
  if (stato.daRipassare > 0 && !fatti.includes('ripasso')) return fisso('ripasso');
  if (ai && stato.lacune > 0 && !fatti.includes('lacune') && fatti.length) return fisso('lacune');
  const candidati = [];
  if (stato.daRipassare > 0 && !recenti(3).includes('ripasso')) candidati.push(['ripasso', 6 + Math.min(4, stato.daRipassare / 10)]);
  if (ai && stato.lacune > 0 && !recenti(3).includes('lacune')) candidati.push(['lacune', 3 + Math.min(4, stato.lacune / 3)]);
  if (stato.difficili > 0 && !recenti(5).includes('difficili')) candidati.push(['difficili', 1.5]);
  for (const id of PROGRAMMA) {
    if (recenti(2).includes(id)) continue;
    if (!ai && ESERCIZI[id].ai) continue;
    const m = (stato.medie || {})[id];
    // Più è basso il punteggio recente, più spesso torna. Mai fatto o fatto da tempo: bonus novità.
    const debolezza = m && m.media != null && m.media < 75 ? (75 - m.media) / 20 : 0;
    let novita = 1.5;
    if (m && m.ultimo && oggi) novita = Math.min(3, Math.max(0, (Date.parse(oggi) - Date.parse(m.ultimo)) / 86400000)) / 2;
    candidati.push([id, 1 + debolezza + novita]);
  }
  if (!candidati.length) candidati.push([ai ? 'cultura' : 'nomi', 1]);
  const tot = candidati.reduce((s, [, w]) => s + w, 0);
  let x = rng() * tot;
  let scelto = candidati[candidati.length - 1][0];
  for (const [id, w] of candidati) { x -= w; if (x <= 0) { scelto = id; break; } }
  const passo = { id: scelto, ...ESERCIZI[scelto] };
  if (scelto === 'ripasso') passo.limite = 15;
  if (scelto === 'speaking') passo.minuti = 5;
  return passo;
}
