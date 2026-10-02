// Speaking con un agente vocale vero (ElevenLabs Agents): conversazione continua a mani libere,
// come una telefonata. Emma guida la conversazione, propone gli argomenti e corregge come un'insegnante.
// Non finisce mai da sola: si chiude con "Termina", poi arriva il report e gli errori diventano lacune.
import { h, svuota, caricamento, toast, durata } from '../ui.js';
import { api } from '../api.js';
import { inglese, suggerimentoTocco } from '../parola.js';
import { scenario as trovaScenario } from '../shared/scenari.js';
import { mostraReport } from './speaking.js';

const V = '/vendor/elevenlabs/';
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
    h('button', { class: 'btn primario pieno', onclick: () => ok('via') }, '🎙 Inizia la conversazione'),
    h('button', { class: 'btn fantasma piccolo', onclick: () => ok('classico') }, 'Usa la modalità "premi per parlare"'))));
  if (scelta === 'classico') return 'classico';

  svuota(box, caricamento('Mi collego con Emma…'));
  let SDK;
  try {
    SDK = await caricaSdk();
    await navigator.mediaDevices.getUserMedia({ audio: true }).then((s) => s.getTracks().forEach((t) => t.stop()));
  } catch (err) {
    return erroreAvvio(box, err.name === 'NotAllowedError' ? 'Il microfono è bloccato: consentilo nelle impostazioni del browser per questo sito.' : err.message);
  }

  const storia = [];
  const inizio = Date.now();
  let conv = null, chiusoDaMe = false, tentativi = 0;
  const chat = h('div', { class: 'chat', 'aria-live': 'polite' });
  const orb = h('div', { class: 'orb connessione' });
  const statoTesto = h('div', { class: 'small center muted' }, 'Connessione…');
  const tempo = h('span', { class: 'tiny muted' }, '0 s');
  const muto = h('button', { class: 'btn piccolo' }, '🔇 Muto');
  const fine = h('button', { class: 'btn primario pieno' }, 'Termina e ricevi il report');
  const avanti = opz.minuti ? h('button', { class: 'btn pieno hidden' }, 'Prossimo esercizio →') : null;
  let microMuto = false;

  const aggiungi = (ruolo, testo) => {
    if (!testo || !testo.trim()) return;
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
    conv = await SDK.Conversation.startSession({
      signedUrl: cfg.signedUrl,
      connectionType: 'websocket',
      overrides: {
        agent: { prompt: { prompt: cfg.prompt }, firstMessage: cfg.primoMessaggio, language: 'en' },
        tts: { voiceId: cfg.voiceId },
      },
      workletPaths: { rawAudioProcessor: V + 'rawAudioProcessor.js', audioConcatProcessor: V + 'audioConcatProcessor.js' },
      libsampleratePath: V + 'libsamplerate.worklet.js',
      onConnect: () => { tentativi = 0; },
      onMessage: (m) => {
        aggiungi(m.source === 'user' || m.role === 'user' ? 'io' : 'ai', m.message);
      },
      onModeChange: ({ mode }) => {
        orb.className = 'orb ' + (mode === 'speaking' ? 'parla' : 'ascolta');
        statoTesto.textContent = mode === 'speaking' ? 'Emma sta parlando… (puoi interromperla)' : microMuto ? 'Microfono in pausa' : 'Ti ascolto…';
      },
      onError: (msg) => console.warn('[agente]', msg),
      onDisconnect: (d) => {
        if (chiusoDaMe) return;
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
      h('div', { class: 'row', style: { justifyContent: 'center' } }, muto)),
    chat,
    suggerimentoTocco(),
    avanti, fine));

  try {
    await collega('');
  } catch (err) {
    clearInterval(timer);
    return erroreAvvio(box, 'Non riesco a collegarmi a ElevenLabs. Dettaglio: ' + err.message);
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

function erroreAvvio(box, messaggio) {
  return new Promise((ok) => svuota(box, h('div', { class: 'card stack' },
    h('h3', { style: { margin: 0 } }, 'L\'agente vocale non è partito'),
    h('p', { class: 'small', style: { margin: 0 } }, messaggio),
    h('button', { class: 'btn primario pieno', onclick: () => ok('classico') }, 'Usa la modalità "premi per parlare"'))));
}
