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
  cultura: { nome: 'Pillola di cultura', area: 'cultura', minuti: 5, ai: true },
  writing: { nome: 'Writing', area: 'inglese', minuti: 7, ai: true },
  dettato: { nome: 'Dettato', area: 'inglese', minuti: 4, ai: true },
  speaking: { nome: 'Speaking', area: 'inglese', minuti: 8, ai: true },
  riepilogo: { nome: 'Riepilogo settimanale', area: 'costanza', minuti: 2, ai: false },
};

// Se l'AI non è configurata, gli esercizi AI vengono sostituiti da esercizi offline.
const SOSTITUTI = { cultura: 'palazzo', writing: 'span', dettato: 'span', speaking: 'nomi' };

export function pianoDelGiorno(giorno, tipo, { ai = true, testFatto = true } = {}) {
  const g = giornoSettimana(giorno);
  let base, extra;
  if (g === 1 || g === 4) { base = ['ripasso', 'nomi']; extra = [{ id: 'speaking' }]; }
  else if (g === 2 || g === 5) { base = ['ripasso', 'cultura']; extra = [{ id: 'writing' }]; }
  else if (g === 3 || g === 6) { base = ['ripasso', 'palazzo']; extra = [{ id: 'speaking', scenario: 'pillola' }]; }
  else { base = ['ripasso', 'span']; extra = [{ id: 'dettato' }, { id: 'riepilogo' }]; }

  let passi = base.map((id) => ({ id }));
  if (tipo === 'completa') passi = passi.concat(extra);
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
