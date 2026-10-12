// Controllo delle risposte scritte (grammatica, lacune): prima il confronto automatico, flessibile
// (parole in più dalla frase, forme contratte, frase intera); se dice "sbagliata" ma hai scritto qualcosa,
// un secondo parere dell'AI. Così una risposta corretta scritta in un altro modo non viene segnata sbagliata.
import { api } from '../api.js';
import { valutaRisposta } from '../shared/testo.js';

export async function controllaRisposta(it, risposta) {
  const esito = valutaRisposta(it.risposte, risposta, { testo: it.testo });
  if (esito !== 'sbagliata' || !String(risposta || '').trim()) return { giusto: esito !== 'sbagliata', esito, nota: '' };
  try {
    const r = await api.post('/api/verifica', { istruzione: it.istruzione, testo: it.testo, risposte: it.risposte, scritto: risposta });
    if (r.giusta) return { giusto: true, esito: 'accettata', nota: r.nota };
    return { giusto: false, esito: 'sbagliata', nota: r.nota };
  } catch {
    return { giusto: false, esito: 'sbagliata', nota: '' };
  }
}
