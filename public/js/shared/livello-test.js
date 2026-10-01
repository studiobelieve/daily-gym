import { LIVELLI } from './testo.js';

// Test di livello iniziale: risposte per livello -> livello stimato.
// risultati = { A1: {giuste, totali}, A2: {...}, ... } (solo livelli "pieni": A1 A2 B1 B2 C1 C2)
// Il livello è il più alto tale che lui e tutti quelli sotto hanno almeno il 60%.
// Se il livello successivo ha almeno il 40%, si aggiunge il "+".
export function livelloDaTest(risultati) {
  const ordine = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const pct = (l) => (risultati[l] && risultati[l].totali ? risultati[l].giuste / risultati[l].totali : 0);
  let raggiunto = -1;
  for (let k = 0; k < ordine.length; k++) {
    if (pct(ordine[k]) >= 0.6) raggiunto = k; else break;
  }
  if (raggiunto < 0) return 'A1';
  let l = ordine[raggiunto];
  const prossimo = ordine[raggiunto + 1];
  if (prossimo && pct(prossimo) >= 0.4 && LIVELLI.includes(l + '+')) l += '+';
  return l;
}
