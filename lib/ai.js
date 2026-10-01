import Anthropic from '@anthropic-ai/sdk';
import { q, uno, leggiImpostazione } from './db.js';

// Modelli selezionabili dalle Impostazioni. Prezzi in $ per milione di token (input / output),
// usati solo per la stima dei costi mostrata nell'app.
export const MODELLI = {
  'claude-opus-5-5': { nome: 'Claude Opus 5.5 (qualità massima)', input: 4, output: 20 },
  'claude-sonnet-5-5': { nome: 'Claude Sonnet 5.5 (equilibrato)', input: 2, output: 10 },
  'claude-haiku-4-5': { nome: 'Claude Haiku 4.5 (il più economico)', input: 1, output: 5 },
};
export const MODELLO_PREDEFINITO = 'claude-opus-5-5';

const LIMITE_GIORNO = parseInt(process.env.LIMITE_AI_GIORNO || '200', 10);

let client = null;
function cliente() {
  if (!process.env.ANTHROPIC_API_KEY) {
    const e = new Error('Manca ANTHROPIC_API_KEY nelle variabili di Railway: le funzioni AI sono spente.');
    e.status = 503;
    throw e;
  }
  if (!client) client = new Anthropic({ maxRetries: 2, timeout: 90_000 });
  return client;
}

export function aiDisponibile() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function modelloAttivo() {
  const m = (await leggiImpostazione('modello_ai')) || process.env.AI_MODEL || MODELLO_PREDEFINITO;
  return MODELLI[m] ? m : MODELLO_PREDEFINITO;
}

// Una chiamata = un messaggio di sistema + la conversazione. Restituisce il testo.
// uso: etichetta per il registro dei consumi ('writing', 'speaking', ...).
// sforzo: 'low' per le risposte rapide (speaking), 'medium' per correzioni e contenuti.
export async function chiedi({ sistema, messaggi, uso, maxTokens = 4000, sforzo = 'low' }) {
  const oggi = await uno(`SELECT count(*)::int AS n FROM consumi WHERE servizio = 'claude' AND quando > now() - interval '1 day'`);
  if (oggi.n >= LIMITE_GIORNO) {
    const e = new Error(`Limite di sicurezza raggiunto (${LIMITE_GIORNO} chiamate AI nelle ultime 24 ore). Riprova domani o alza LIMITE_AI_GIORNO.`);
    e.status = 429;
    throw e;
  }

  const model = await modelloAttivo();
  const corpo = { model, max_tokens: maxTokens, system: sistema, messages: messaggi };
  let risposta;
  try {
    if (model === 'claude-haiku-4-5') {
      // Haiku 4.5 non accetta effort né fallback lato server.
      risposta = await cliente().messages.create(corpo);
    } else {
      risposta = await cliente().beta.messages.create({
        ...corpo,
        output_config: { effort: sforzo },
        // Se un filtro di sicurezza rifiuta per errore (falso positivo), l'API
        // riprova da sola su un altro modello invece di restituire un rifiuto.
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
      });
    }
  } catch (err) {
    throw traduciErrore(err);
  }

  const u = risposta.usage || {};
  const prezzo = MODELLI[model];
  const costo = ((u.input_tokens || 0) * prezzo.input + (u.output_tokens || 0) * prezzo.output) / 1e6;
  await q('INSERT INTO consumi (servizio, uso, unita, costo) VALUES ($1, $2, $3, $4)', [
    'claude', uso, (u.input_tokens || 0) + (u.output_tokens || 0), costo,
  ]);

  if (risposta.stop_reason === 'refusal') {
    const e = new Error('Il modello non ha risposto a questa richiesta. Riprova con parole diverse.');
    e.status = 422;
    throw e;
  }
  const testo = risposta.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
  if (!testo) {
    const e = new Error('Risposta vuota dal modello. Riprova.');
    e.status = 502;
    throw e;
  }
  return testo;
}

function traduciErrore(err) {
  let msg = 'Errore del servizio AI. Riprova tra poco.';
  let status = 502;
  if (err instanceof Anthropic.AuthenticationError) { msg = 'ANTHROPIC_API_KEY non valida: controllala su Railway.'; status = 503; }
  else if (err instanceof Anthropic.RateLimitError) { msg = 'Troppe richieste ad Anthropic in poco tempo. Aspetta un minuto.'; status = 429; }
  else if (err instanceof Anthropic.BadRequestError) { msg = 'Richiesta rifiutata dal servizio AI: ' + err.message; status = 502; }
  else if (err instanceof Anthropic.APIConnectionError) { msg = 'Il server non riesce a raggiungere Anthropic.'; status = 502; }
  else if (err instanceof Anthropic.APIError) { msg = `Errore AI (${err.status}). Riprova tra poco.`; }
  const e = new Error(msg);
  e.status = status;
  e.causa = err;
  return e;
}
