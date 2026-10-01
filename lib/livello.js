// Livello di inglese adattivo. Funzione pura, testata in test/livello.test.js.
//
// Regola (volutamente semplice e prevedibile, così sai sempre perché sali o scendi):
// - si guardano gli esercizi di inglese con punteggio (writing, dettato, speaking, cultura)
//   fatti dall'ultimo cambio di livello, al massimo degli ultimi 14 giorni;
// - servono almeno 8 esercizi e almeno 7 giorni dall'ultimo cambio;
// - media >= 85  -> sali di mezzo livello (es. A2+ -> B1);
// - media <  55  -> scendi di mezzo livello (i contenuti erano troppo difficili).
import { indiceLivello, livelloDaIndice, aggiungiGiorni, giorniTra, LIVELLI } from '../public/js/shared/testo.js';

export const TIPI_INGLESE = ['writing', 'dettato', 'speaking', 'cultura'];
export const SOGLIA_SU = 85;
export const SOGLIA_GIU = 55;
export const MINIMO_ESERCIZI = 8;
export const MINIMO_GIORNI = 7;

export function valutaLivello({ livello, ultimoCambio, attivita, oggi }) {
  const da = ultimoCambio && giorniTra(ultimoCambio, oggi) < 14 ? ultimoCambio : aggiungiGiorni(oggi, -14);
  const utili = attivita.filter(
    (a) => TIPI_INGLESE.includes(a.tipo) && a.giorno >= da && a.giorno <= oggi && a.punteggio != null
  );
  const media = utili.length ? utili.reduce((s, a) => s + a.punteggio, 0) / utili.length : null;
  const stato = {
    livello,
    media: media == null ? null : Math.round(media),
    esercizi: utili.length,
    servono: Math.max(0, MINIMO_ESERCIZI - utili.length),
    giorniDalCambio: ultimoCambio ? giorniTra(ultimoCambio, oggi) : null,
    cambio: null,
  };
  if (utili.length < MINIMO_ESERCIZI) return stato;
  if (ultimoCambio && giorniTra(ultimoCambio, oggi) < MINIMO_GIORNI) return stato;

  const i = indiceLivello(livello);
  if (media >= SOGLIA_SU && i < LIVELLI.length - 1) {
    stato.cambio = { nuovo: livelloDaIndice(i + 1), motivo: `media ${Math.round(media)} su ${utili.length} esercizi` };
  } else if (media < SOGLIA_GIU && i > 0) {
    stato.cambio = { nuovo: livelloDaIndice(i - 1), motivo: `media ${Math.round(media)}: contenuti troppo difficili` };
  }
  return stato;
}

export { livelloDaTest } from '../public/js/shared/livello-test.js';
