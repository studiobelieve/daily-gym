// Speaking con un agente vocale vero (ElevenLabs Agents): conversazione continua a mani libere,
// come una telefonata. Emma guida la conversazione, propone gli argomenti e corregge come un'insegnante.
// Non finisce mai da sola: si chiude con "Termina", poi arriva il report e gli errori diventano lacune.
import { h, svuota, caricamento, toast, durata } from '../ui.js';
import { api } from '../api.js';
import { inglese, suggerimentoTocco } from '../parola.js';
import { scenario as trovaScenario } from '../shared/scenari.js';
import { mostraReport } from './speaking.js';

const V = '/vendor/elevenlabs/';

// Telefoni: alcuni browser (Firefox, Safari vecchi) non conoscono permissions.query({name:'microphone'}) e la
// libreria vocale si blocca lì. Se fallisce, si risponde "concesso": il microfono è già stato autorizzato prima.
function proteggiPermessi() {
  const p = navigator.permissions;
  if (!p || !p.query || p.query.__dg) return;
  const orig = p.query.bind(p);
  const finto = { state: 'granted', onchange: null, addEventListener() {}, removeEventListener() {} };
  const query = (d) => { try { return orig(d).catch(() => finto); } catch { return Promise.resolve(finto); } };
  query.__dg = true;
  try { p.query = query; } catch {}
}

// iPhone e alcuni Android: l'audio parte solo se avviato da un tocco. Si "sblocca" subito al tocco su Inizia.
let sbloccato = null;
function sbloccaAudio() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    sbloccato = sbloccato || new AC();
    sbloccato.resume();
    const b = sbloccato.createBuffer(1, 1, 22050);
    const src = sbloccato.createBufferSource();
    src.buffer = b; src.connect(sbloccato.destination); src.start(0);
  } catch {}
}

// Riattiva l'audio creato dalla libreria (elementi <audio> nascosti) dentro un tocco dell'utente.
function riattivaAudio() {
  sbloccaAudio();
  document.querySelectorAll('audio').forEach((a) => { try { a.muted = false; const r = a.play(); if (r) r.catch(() => {}); } catch {} });
}
let sdk = null;
function caricaSdk() {
  if (window.ElevenLabsClient) return Promise.resolve(window.ElevenLabsClient);
  if (!sdk) {
    sdk = new Promise((ok, ko) => {
      const s = document.createElement('script');
      s.src = V + 'client.js';
      s.onload = () => (window.ElevenLabsClient ? ok(window.ElevenLabsClient) : ko(new Error('Libreria vocale non caricata')));
      s.onerror = () => { sdk = null; ko(new Error('Impossibile caricare la libreria vocale')); };
      document.head.appendChild(s);
    });
  }
  return sdk;
}

export async function avvia(box, opz) {
  const sc = trovaScenario(opz.scenario && opz.scenario !== 'pillola' ? opz.scenario : 'coach') || trovaScenario('coach');
  const giocoDiRuolo = sc.id !== 'coach';

  // 1. Schermata iniziale: serve un tocco dell'utente per attivare microfono e audio.
  let microfono = null;
  const diario = [];
  const nota = (t) => { diario.push(`${Math.round(performance.now() / 100) / 10}s ${t}`); if (diarioEl) diarioEl.textContent = diario.slice(-8).join('\n'); };
  let diarioEl = null;
  const scelta = await new Promise((ok) => svuota(box, h('div', { class: 'card stack' },
    h('div', { class: 'orb' }),
    h('h2', { class: 'center', style: { margin: 0 } }, giocoDiRuolo ? sc.titolo : 'Parla con Emma'),
    h('p', { class: 'small center', style: { margin: 0 } }, giocoDiRuolo
      ? `Gioco di ruolo: ${sc.obiettivo} Emma ti corregge come un'insegnante.`
      : 'Una conversazione vera, a voce, senza pulsanti da tenere premuti. Emma propone gli argomenti, ti corregge e ti fa ripetere. Va avanti finché non la chiudi tu.'),
    h('ul', { class: 'small muted', style: { margin: 0, paddingLeft: '20px' } },
      h('li', 'Usa le cuffiette se puoi: l\'audio è più pulito e lei non sente se stessa.'),
      h('li', 'Parla normalmente: capisce da sola quando hai finito. Puoi anche interromperla.'),
      h('li', 'Alla fine premi "Termina": arriva il report e gli errori entrano nel tuo allenamento.')),
    h('button', { class: 'btn primario pieno', onclick: () => {
      // Dentro il tocco: sblocca l'audio e chiede il microfono (su iPhone deve succedere qui).
      sbloccaAudio();
      microfono = navigator.mediaDevices && navigator.mediaDevices.getUserMedia
        ? navigator.mediaDevices.getUserMedia({ audio: true }).then((st) => st.getTracks().forEach((t) => t.stop()))
        : Promise.reject(new Error('Questo browser non permette di usare il microfono. Su iPhone usa Safari, su Android Chrome.'));
      microfono.catch(() => {});
      ok('via');
    } }, '🎙 Inizia la conversazione'),
    h('button', { class: 'btn fantasma piccolo', onclick: () => ok('classico') }, 'Usa la modalità "premi per parlare"'))));
  if (scelta === 'classico') return 'classico';

  svuota(box, caricamento('Mi collego con Emma…'));
  let SDK;
  try {
    if (!window.isSecureContext) throw new Error('Serve una connessione sicura (https) per usare il microfono.');
    await microfono;
    nota('microfono ok');
    SDK = await caricaSdk();
    nota('libreria vocale caricata');
    proteggiPermessi();
  } catch (err) {
    nota('errore: ' + (err.name || '') + ' ' + err.message);
    return erroreAvvio(box, err.name === 'NotAllowedError'
      ? 'Il microfono è bloccato. Su iPhone: Impostazioni › Safari › Microfono › Consenti (o tocca "aA" nella barra e consenti il microfono per questo sito). Su Android: tocca il lucchetto vicino all\'indirizzo › Autorizzazioni › Microfono.'
      : err.message, diario);
  }

  const storia = [];
  const inizio = Date.now();
  let conv = null, chiusoDaMe = false, tentativi = 0;
  const chat = h('div', { class: 'chat', 'aria-live': 'polite' });
  const orb = h('div', { class: 'orb connessione' });
  const statoTesto = h('div', { class: 'small center muted' }, 'Connessione…');
  const tempo = h('span', { class: 'tiny muted' }, '0 s');
  const muto = h('button', { class: 'btn piccolo' }, '🔇 Muto');
  const nonSento = h('button', { class: 'btn piccolo', onclick: () => { riattivaAudio(); nota('audio riattivato a mano'); } }, '🔊 Non sento Emma');
  diarioEl = h('pre', { class: 'tiny muted', style: { whiteSpace: 'pre-wrap', margin: 0 } });
  const dettagli = h('details', { class: 'tiny muted' }, h('summary', 'Dettagli tecnici (se qualcosa non va)'), diarioEl);
  const fine = h('button', { class: 'btn primario pieno' }, 'Termina e ricevi il report');
  const avanti = opz.minuti ? h('button', { class: 'btn pieno hidden' }, 'Prossimo esercizio →') : null;
  let microMuto = false;

  const aggiungi = (ruolo, grezzo) => {
    // La voce usa indicazioni di tono come [happy] o [excited]: servono all'audio, non vanno mostrate.
    const testo = String(grezzo || '').replace(/\[[a-z][a-z ,'-]{1,30}\]\s*/gi, '').replace(/\s{2,}/g, ' ').trim();
    if (!testo) return;
    const ultimo = storia[storia.length - 1];
    // L'agente a volte manda la risposta in più pezzi: si uniscono nella stessa bolla.
    if (ultimo && ultimo.ruolo === ruolo && ruolo === 'ai' && Date.now() - ultimo.t < 1500) {
      ultimo.testo += ' ' + testo;
      ultimo.el.replaceWith((ultimo.el = h('div', { class: 'bolla ai' }, inglese(ultimo.testo))));
    } else {
      const el = h('div', { class: 'bolla ' + ruolo }, inglese(testo));
      storia.push({ ruolo, testo, t: Date.now(), el });
      chat.appendChild(el);
    }
    chat.lastChild.scrollIntoView({ behavior: 'smooth', block: 'end' });
  };

  const timer = setInterval(() => {
    const sec = (Date.now() - inizio) / 1000;
    tempo.textContent = durata(sec);
    if (avanti && sec >= opz.minuti * 60) avanti.classList.remove('hidden');
  }, 1000);

  const collega = async (ripresa) => {
    const cfg = await api.post('/api/voce/agente', { ripresa, scenario: sc.id });
    nota('collegamento autorizzato, apro la linea');
    conv = await SDK.Conversation.startSession({
      signedUrl: cfg.signedUrl,
      connectionType: 'websocket',
      overrides: {
        agent: { prompt: { prompt: cfg.prompt }, firstMessage: cfg.primoMessaggio, language: 'en' },
        tts: { voiceId: cfg.voiceId },
      },
      workletPaths: { rawAudioProcessor: V + 'rawAudioProcessor.js', audioConcatProcessor: V + 'audioConcatProcessor.js' },
      libsampleratePath: V + 'libsamplerate.worklet.js',
      onConnect: () => { tentativi = 0; nota('linea aperta'); setTimeout(riattivaAudio, 300); },
      onMessage: (m) => {
        aggiungi(m.source === 'user' || m.role === 'user' ? 'io' : 'ai', m.message);
      },
      onModeChange: ({ mode }) => {
        nota('modalità: ' + mode);
        orb.className = 'orb ' + (mode === 'speaking' ? 'parla' : 'ascolta');
        statoTesto.textContent = mode === 'speaking' ? 'Emma sta parlando… (puoi interromperla)' : microMuto ? 'Microfono in pausa' : 'Ti ascolto…';
      },
      onError: (msg) => { console.warn('[agente]', msg); nota('errore: ' + (msg && msg.message ? msg.message : msg)); },
      onDisconnect: (d) => {
        if (chiusoDaMe) return;
        nota('linea chiusa: ' + JSON.stringify(d || {}).slice(0, 160));
        // La linea è caduta (rete, durata massima del piano): si riprende da dove si era rimasti.
        if (tentativi++ < 3) {
          statoTesto.textContent = 'Linea caduta, mi ricollego…';
          orb.className = 'orb connessione';
          const contesto = storia.slice(-12).map((t) => `${t.ruolo === 'io' ? 'STUDENT' : 'EMMA'}: ${t.testo}`).join('\n');
          setTimeout(() => collega(contesto).catch(() => { statoTesto.textContent = 'Non riesco a ricollegarmi. Premi Termina per il report.'; }), 800);
        } else {
          statoTesto.textContent = 'Connessione persa. Premi Termina per il report.';
          console.warn('[agente] disconnessione', d);
        }
      },
    });
    if (microMuto) conv.setMicMuted(true);
  };

  muto.addEventListener('click', () => {
    microMuto = !microMuto;
    if (conv) conv.setMicMuted(microMuto);
    muto.textContent = microMuto ? '🎙 Riattiva' : '🔇 Muto';
    statoTesto.textContent = microMuto ? 'Microfono in pausa' : 'Ti ascolto…';
  });

  svuota(box, h('div', { class: 'stack' },
    h('div', { class: 'card stack' },
      h('div', { class: 'row between' }, h('strong', giocoDiRuolo ? sc.titolo : 'Conversazione con Emma'), tempo),
      orb, statoTesto,
      h('div', { class: 'row', style: { justifyContent: 'center' } }, muto, nonSento),
      h('p', { class: 'tiny muted center', style: { margin: 0 } }, 'Su iPhone, se la voce è bassissima, usa le cuffiette o alza il volume: con il microfono acceso iOS a volte usa la capsula delle chiamate.')),
    chat,
    suggerimentoTocco(),
    avanti, fine, dettagli));

  try {
    await collega('');
  } catch (err) {
    clearInterval(timer);
    nota('errore di avvio: ' + (err.name || '') + ' ' + err.message);
    return erroreAvvio(box, 'Non riesco a collegarmi a ElevenLabs. Dettaglio: ' + err.message, diario);
  }

  const motivo = await new Promise((ok) => {
    fine.addEventListener('click', () => ok('fine'));
    if (avanti) avanti.addEventListener('click', () => ok('avanti'));
    if (opz.segnale) opz.segnale.addEventListener('abort', () => ok('abort'), { once: true });
  });
  chiusoDaMe = true;
  clearInterval(timer);
  try { if (conv) await conv.endSession(); } catch {}
  if (motivo === 'abort') return null;

  const parlato = storia.filter((t) => t.ruolo === 'io');
  if (!parlato.length) {
    toast('Non hai detto niente: nessun report questa volta.');
    return { punteggio: 0 };
  }
  return mostraReport(box, sc, storia.map(({ ruolo, testo }) => ({ ruolo, testo })), { inizio, opz });
}

function erroreAvvio(box, messaggio, diario = []) {
  return new Promise((ok) => svuota(box, h('div', { class: 'card stack' },
    h('h3', { style: { margin: 0 } }, 'L\'agente vocale non è partito'),
    h('p', { class: 'small', style: { margin: 0 } }, messaggio),
    diario.length ? h('details', { class: 'tiny muted', open: true }, h('summary', 'Dettagli tecnici'),
      h('pre', { style: { whiteSpace: 'pre-wrap', margin: 0 } }, [...diario, navigator.userAgent].join('\n'))) : null,
    h('button', { class: 'btn primario pieno', onclick: () => ok('classico') }, 'Usa la modalità "premi per parlare"'))));
}
