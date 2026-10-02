// Voce con ElevenLabs: trascrizione (speech-to-text) e sintesi (text-to-speech).
// Se ELEVENLABS_API_KEY manca, l'app usa la voce e il riconoscimento del browser.
import { q, leggiImpostazione, scriviImpostazione } from './db.js';

const BASE = 'https://api.elevenlabs.io/v1';
// Voce di default: "George" dagli esempi ufficiali ElevenLabs. Cambiala con ELEVENLABS_VOICE_ID.
const VOCE = process.env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb';
const MODELLO_TTS = process.env.ELEVENLABS_TTS_MODEL || 'eleven_flash_v2_5';
const MODELLO_STT = process.env.ELEVENLABS_STT_MODEL || 'scribe_v1';

export function voceDisponibile() {
  return Boolean(process.env.ELEVENLABS_API_KEY);
}

function errore(msg, status = 502) {
  const e = new Error(msg);
  e.status = status;
  return e;
}

async function controlla(r, cosa) {
  if (r.ok) return;
  let dettaglio = '';
  try { dettaglio = (await r.text()).slice(0, 300); } catch {}
  console.error(`[elevenlabs] ${cosa} ${r.status}: ${dettaglio}`);
  if (r.status === 401) throw errore('ELEVENLABS_API_KEY non valida: controllala su Railway.', 503);
  if (r.status === 429) throw errore('ElevenLabs: troppe richieste o crediti finiti per questo mese.', 429);
  throw errore(`ElevenLabs non ha risposto (${cosa}, errore ${r.status}).`);
}

// audio: Buffer, mime: es. 'audio/webm' o 'audio/mp4' (Safari). Restituisce il testo.
export async function trascrivi(audio, mime) {
  if (!voceDisponibile()) throw errore('Manca ELEVENLABS_API_KEY.', 503);
  const est = mime.includes('mp4') ? 'm4a' : mime.includes('ogg') ? 'ogg' : mime.includes('wav') ? 'wav' : 'webm';
  const form = new FormData();
  form.append('file', new Blob([audio], { type: mime }), `voce.${est}`);
  form.append('model_id', MODELLO_STT);
  form.append('language_code', 'en');
  form.append('tag_audio_events', 'false');
  const r = await fetch(`${BASE}/speech-to-text`, {
    method: 'POST',
    headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY },
    body: form,
    signal: AbortSignal.timeout(60_000),
  });
  await controlla(r, 'trascrizione');
  const dati = await r.json();
  const testo = String(dati.text || '').trim();
  // Stima durata: ~16 KB al secondo per audio compresso a bassa qualità. Serve solo al registro.
  await q('INSERT INTO consumi (servizio, uso, unita) VALUES ($1, $2, $3)', ['elevenlabs-stt', 'speaking', Math.round(audio.length / 16000)]);
  return testo;
}

// Restituisce { audio: Buffer mp3, tipo }.
export async function sintetizza(testo, { lento = false } = {}) {
  if (!voceDisponibile()) throw errore('Manca ELEVENLABS_API_KEY.', 503);
  const pulito = String(testo).slice(0, 1200);
  const r = await fetch(`${BASE}/text-to-speech/${encodeURIComponent(VOCE)}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({
      text: pulito,
      model_id: MODELLO_TTS,
      voice_settings: { stability: 0.5, similarity_boost: 0.75, speed: lento ? 0.85 : 1.0 },
    }),
    signal: AbortSignal.timeout(45_000),
  });
  await controlla(r, 'sintesi vocale');
  const audio = Buffer.from(await r.arrayBuffer());
  await q('INSERT INTO consumi (servizio, uso, unita) VALUES ($1, $2, $3)', ['elevenlabs-tts', 'voce', pulito.length]);
  return { audio, tipo: r.headers.get('content-type') || 'audio/mpeg' };
}

// ---------- Agente vocale in tempo reale (ElevenLabs Agents) ----------
// L'agente si crea una volta sola e il suo id resta nelle impostazioni. Il prompt vero (livello,
// lacune, argomenti) viene passato a ogni sessione come "override", quindi resta sempre aggiornato.
// L'LLM che fa da insegnante gira dentro ElevenLabs e si paga con i crediti ElevenLabs.
const LLM_AGENTE = process.env.ELEVENLABS_AGENT_LLM || 'claude-sonnet-4-6';
const VERSIONE_AGENTE = 2; // cambiala per ricreare l'agente con impostazioni nuove

async function elevenlabs(metodo, percorso, corpo) {
  const r = await fetch(BASE + percorso, {
    method: metodo,
    headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, ...(corpo ? { 'Content-Type': 'application/json' } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  if (!r.ok) {
    const dettaglio = (await r.text().catch(() => '')).slice(0, 500);
    console.error(`[elevenlabs] ${metodo} ${percorso} ${r.status}: ${dettaglio}`);
    if (r.status === 401) throw errore('ELEVENLABS_API_KEY non valida o senza permessi per gli agenti vocali.', 503);
    throw errore(`ElevenLabs agenti: errore ${r.status}. ${dettaglio.slice(0, 160)}`);
  }
  return r.json();
}

async function idAgente() {
  const salvato = await leggiImpostazione('agente_vocale');
  if (salvato && salvato.id && salvato.versione === VERSIONE_AGENTE && salvato.llm === LLM_AGENTE) return salvato.id;
  const creato = await elevenlabs('POST', '/convai/agents/create', {
    name: 'Daily Gym · insegnante di inglese',
    conversation_config: {
      agent: {
        first_message: "Hi! I'm Emma, your English teacher. How are you today?",
        language: 'en',
        prompt: { prompt: 'You are Emma, a friendly English teacher.', llm: LLM_AGENTE, temperature: 0.7 },
      },
      tts: { voice_id: VOCE },
    },
    platform_settings: {
      overrides: {
        conversation_config_override: {
          agent: { first_message: true, language: true, prompt: { prompt: true } },
          tts: { voice_id: true },
        },
      },
    },
  });
  // Conversazione lunga: si prova ad alzare la durata massima a un'ora (se il piano lo consente).
  try {
    await elevenlabs('PATCH', `/convai/agents/${creato.agent_id}`, { conversation_config: { conversation: { max_duration_seconds: 3600 } } });
  } catch (err) {
    console.warn('[elevenlabs] durata massima non modificata:', err.message);
  }
  await scriviImpostazione('agente_vocale', { id: creato.agent_id, versione: VERSIONE_AGENTE, llm: LLM_AGENTE });
  return creato.agent_id;
}

export async function agenteVocale() {
  if (!voceDisponibile()) throw errore('Manca ELEVENLABS_API_KEY: l\'agente vocale non è disponibile.', 503);
  const id = await idAgente();
  const d = await elevenlabs('GET', `/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(id)}`);
  if (!d.signed_url) throw errore('ElevenLabs non ha restituito il collegamento alla conversazione.');
  return { signedUrl: d.signed_url, voiceId: VOCE, agentId: id };
}
