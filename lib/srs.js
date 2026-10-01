// Ripetizione dilazionata: variante semplice di SM-2.
// Funzione pura: (stato carta, voto, giorno di oggi) -> nuovo stato. Testata in test/srs.test.js.
//
// Voti (i 4 pulsanti dell'app):
//   0 = Di nuovo  (non ricordavo)
//   3 = Difficile (ricordato con fatica)
//   4 = Bene
//   5 = Facile

import { aggiungiGiorni } from '../public/js/shared/testo.js';

export const VOTI = { DI_NUOVO: 0, DIFFICILE: 3, BENE: 4, FACILE: 5 };

export function pianifica(carta, voto, oggi) {
  let { intervallo = 0, facilita = 2.5, ripetizioni = 0, errori = 0 } = carta;
  if (![0, 3, 4, 5].includes(voto)) throw new Error('voto non valido: ' + voto);

  if (voto < 3) {
    // Dimenticata: si riparte da capo, ma la facilità scende (la carta è "difficile per te").
    ripetizioni = 0;
    errori += 1;
    intervallo = 1;
    facilita = Math.max(1.3, facilita - 0.2);
  } else {
    if (ripetizioni === 0) intervallo = voto === 5 ? 3 : 1;
    else if (ripetizioni === 1) intervallo = voto === 5 ? 6 : voto === 3 ? 2 : 4;
    else if (voto === 3) intervallo = Math.max(intervallo + 1, intervallo * 1.2);
    else intervallo = intervallo * facilita * (voto === 5 ? 1.3 : 1);
    ripetizioni += 1;
    facilita = Math.max(1.3, facilita + (0.1 - (5 - voto) * (0.08 + (5 - voto) * 0.02)));
  }

  intervallo = Math.min(365, Math.round(intervallo * 10) / 10);
  return {
    intervallo,
    facilita: Math.round(facilita * 100) / 100,
    ripetizioni,
    errori,
    scadenza: aggiungiGiorni(oggi, Math.max(1, intervallo)),
  };
}

// Serie di giorni consecutivi. giorni = elenco di 'YYYY-MM-DD' con sessione completata.
// La serie resta viva se l'ultima sessione è di oggi o di ieri.
export function serie(giorni, oggi) {
  const set = new Set(giorni);
  let g = set.has(oggi) ? oggi : aggiungiGiorni(oggi, -1);
  let n = 0;
  while (set.has(g)) { n++; g = aggiungiGiorni(g, -1); }
  return n;
}
