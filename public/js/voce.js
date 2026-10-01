// Voce: sintesi (ElevenLabs via server, oppure la voce del browser) e registrazione dal microfono.
import { api } from './api.js';
import { stato } from './app.js';

const cache = new Map(); // testo -> URL audio, così la stessa frase non si paga due volte
let audioCorrente = null;
let fineCorrente = null;   // risolve la Promise di parla() anche quando l'audio viene fermato
let turno = 0;             // ogni nuova richiesta "vince" su quelle ancora in volo

export function fermaAudio() {
  turno++;
  if (audioCorrente) { audioCorrente.pause(); audioCorrente = null; }
  if (fineCorrente) { fineCorrente(); fineCorrente = null; }
  if (window.speechSynthesis) speechSynthesis.cancel();
}

// Parla in inglese. Restituisce una Promise che si risolve a fine riproduzione.
export async function parla(testo, { lento = false } = {}) {
  fermaAudio();
  const mio = turno;
  if (stato.voce) {
    try {
      const chiave = (lento ? 'L:' : '') + testo;
      let url = cache.get(chiave);
      if (!url) {
        const blob = await api.post('/api/voce/tts', { testo, lento });
        url = URL.createObjectURL(blob);
        cache.set(chiave, url);
      }
      if (mio !== turno) return; // nel frattempo è partito altro audio o l'esercizio è finito
      const a = new Audio(url);
      audioCorrente = a;
      await new Promise((ok) => {
        fineCorrente = ok;
        a.onended = ok; a.onerror = ok;
        a.play().catch(ok);
      });
      return;
    } catch (err) {
      console.warn('ElevenLabs non disponibile, uso la voce del browser:', err.message);
    }
  }
  return parlaBrowser(testo, lento);
}

function parlaBrowser(testo, lento) {
  if (!window.speechSynthesis) return Promise.resolve();
  return new Promise((ok) => {
    fineCorrente = ok;
    const u = new SpeechSynthesisUtterance(testo);
    u.lang = 'en-GB';
    const voci = speechSynthesis.getVoices().filter((v) => v.lang && v.lang.startsWith('en'));
    const migliore = voci.find((v) => /natural|premium|enhanced|google/i.test(v.name)) || voci[0];
    if (migliore) u.voice = migliore;
    u.rate = lento ? 0.75 : 0.95;
    u.onend = ok; u.onerror = ok;
    speechSynthesis.speak(u);
    setTimeout(ok, 30000);
  });
}

export const puoRegistrare = () => Boolean(navigator.mediaDevices && window.MediaRecorder);
export const riconoscimentoBrowser = () => window.SpeechRecognition || window.webkitSpeechRecognition || null;

// Registrazione "premi per parlare". inizia() chiede il microfono la prima volta.
export function registratore() {
  let rec, flusso, pezzi = [], inizio = 0;
  return {
    async inizia() {
      flusso = flusso || (await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }));
      const tipi = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
      const mimeType = tipi.find((t) => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t));
      rec = new MediaRecorder(flusso, mimeType ? { mimeType, audioBitsPerSecond: 32000 } : undefined);
      pezzi = [];
      rec.ondataavailable = (e) => e.data.size && pezzi.push(e.data);
      rec.start();
      inizio = Date.now();
    },
    ferma() {
      return new Promise((ok) => {
        if (!rec || rec.state === 'inactive') return ok(null);
        rec.onstop = () => ok({ blob: new Blob(pezzi, { type: rec.mimeType || 'audio/webm' }), secondi: (Date.now() - inizio) / 1000 });
        rec.stop();
      });
    },
    chiudi() {
      if (flusso) flusso.getTracks().forEach((t) => t.stop());
      flusso = null;
    },
  };
}

// Trascrizione: ElevenLabs se c'è la chiave, altrimenti null (si usa il riconoscimento del browser).
export async function trascriviAudio(blob) {
  const r = await api.audio('/api/voce/stt', blob);
  return r.testo;
}

// Riconoscimento vocale del browser (Chrome/Edge/Safari recenti): ascolta finché non smetti di parlare.
export function ascoltaBrowser() {
  const SR = riconoscimentoBrowser();
  if (!SR) return null;
  const r = new SR();
  r.lang = 'en-US';
  r.interimResults = false;
  r.maxAlternatives = 1;
  r.continuous = true;
  let testo = '';
  const fine = new Promise((ok, ko) => {
    r.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) testo += ' ' + e.results[i][0].transcript;
    };
    r.onerror = (e) => (e.error === 'no-speech' ? ok('') : ko(new Error('Riconoscimento vocale: ' + e.error)));
    r.onend = () => ok(testo.trim());
  });
  r.start();
  return { ferma: () => { try { r.stop(); } catch {} return fine; }, fine };
}
