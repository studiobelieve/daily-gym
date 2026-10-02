// Speaking con l'agente AI: "premi per parlare", l'agente risponde a voce.
// A fine conversazione: report con voto, errori e frasi utili (che diventano carte).
import { h, svuota, icona, caricamento, toast, durata } from '../ui.js';
import { api, oggi } from '../api.js';
import { stato } from '../app.js';
import { parla, fermaAudio, registratore, trascriviAudio, ascoltaBrowser, puoRegistrare, riconoscimentoBrowser } from '../voce.js';
import { SCENARI, scenario as trovaScenario } from '../shared/scenari.js';
import { giornoSettimana } from '../shared/testo.js';
import { inglese, suggerimentoTocco } from '../parola.js';

function scenarioDelGiorno() {
  const giorno = Math.floor(Date.parse(oggi()) / 86400000);
  const lista = SCENARI.filter((s) => s.id !== 'pillola');
  return lista[giorno % lista.length].id;
}

export async function avvia(box, opz) {
  let id = opz.scenario;
  if (!id) id = await scegliScenario(box, scenarioDelGiorno());
  const sc = trovaScenario(id) || trovaScenario(scenarioDelGiorno());
  return conversazione(box, sc, opz);
}

function scegliScenario(box, suggerito) {
  return new Promise((ok) => {
    const gruppi = [['lavoro', 'Lavoro'], ['vita', 'Vita quotidiana'], ['cultura', 'Cultura']];
    svuota(box, h('div', { class: 'stack' },
      h('p', { class: 'muted small' }, 'Scegli con chi parlare. Ti suggerisco quello evidenziato.'),
      gruppi.map(([g, nome]) => h('div', { class: 'card' },
        h('h3', nome),
        h('div', { class: 'opzioni' }, SCENARI.filter((s) => s.categoria === g).map((s) =>
          h('button', { onclick: () => ok(s.id), style: s.id === suggerito ? { borderColor: 'var(--accent)' } : null },
            h('strong', s.titolo), h('div', { class: 'tiny muted' }, s.obiettivo))))))));
  });
}

async function conversazione(box, sc, opz) {
  const storia = [];
  const inizio = Date.now();
  let secondiParlati = 0;
  let occupato = false;
  const usaServer = stato.voce && puoRegistrare();
  const usaBrowser = !usaServer && riconoscimentoBrowser();

  const chat = h('div', { class: 'chat', 'aria-live': 'polite' });
  const info = h('div', { class: 'tiny muted center' });
  const tempo = h('span', { class: 'tiny muted' }, '0 s');
  const mic = h('button', { class: 'microfono', 'aria-label': 'Tieni premuto per parlare' }, icona('mic'));
  const testoIn = h('input', { type: 'text', placeholder: 'oppure scrivi qui e premi Invio', autocomplete: 'off' });
  const fine = h('button', { class: 'btn pieno', disabled: true }, 'Termina e ricevi il report');

  const timer = setInterval(() => { tempo.textContent = durata((Date.now() - inizio) / 1000); }, 1000);

  const bolla = (ruolo, testo) => {
    const b = h('div', { class: 'bolla ' + ruolo }, inglese(testo),
      ruolo === 'ai' ? h('div', { class: 'azioni' }, h('button', { onclick: () => parla(testo) }, '🔊 riascolta'), ' ',
        h('button', { onclick: () => parla(testo, { lento: true }) }, '🐢 lento')) : null);
    chat.appendChild(b);
    b.scrollIntoView({ behavior: 'smooth', block: 'end' });
    return b;
  };

  const turnoAi = async () => {
    if (opz.segnale && opz.segnale.aborted) return;
    occupato = true;
    const attesa = h('div', { class: 'bolla ai muted' }, '…');
    chat.appendChild(attesa);
    try {
      const r = await api.post('/api/speaking/turno', { scenario: sc.id, storia, pillolaId: opz.pillolaId });
      attesa.remove();
      storia.push({ ruolo: 'ai', testo: r.risposta });
      bolla('ai', r.risposta);
      if (!(opz.segnale && opz.segnale.aborted)) await parla(r.risposta);
    } catch (err) {
      attesa.remove();
      toast(err.message, 'errore');
    } finally {
      occupato = false;
    }
  };

  const invia = async (testo) => {
    testo = (testo || '').trim();
    if (!testo) { toast('Non ho sentito niente: riprova, parlando vicino al telefono.'); return; }
    storia.push({ ruolo: 'io', testo });
    bolla('io', testo);
    fine.disabled = storia.filter((t) => t.ruolo === 'io').length < 2;
    await turnoAi();
  };

  // ---- microfono: tieni premuto, oppure tocca una volta per iniziare e una per finire ----
  let reg = usaServer ? registratore() : null;
  let ascolto = null, registrando = false, premuto = 0;
  const avviaReg = async () => {
    if (occupato || registrando) return;
    fermaAudio();
    try {
      if (usaServer) await reg.inizia();
      else if (usaBrowser) ascolto = ascoltaBrowser();
      else return toast('Questo browser non supporta il microfono: scrivi le risposte.');
      registrando = true;
      mic.classList.add('registra');
      info.textContent = 'Sto ascoltando… rilascia (o tocca di nuovo) quando hai finito';
    } catch (err) {
      toast('Microfono non disponibile: ' + (err.message || 'permesso negato'), 'errore');
    }
  };
  const fermaReg = async () => {
    if (!registrando) return;
    registrando = false;
    mic.classList.remove('registra');
    info.textContent = 'Trascrivo…';
    occupato = true;
    try {
      let testo = '';
      if (usaServer) {
        const rec = await reg.ferma();
        if (rec && rec.secondi > 0.6) { secondiParlati += rec.secondi; testo = await trascriviAudio(rec.blob); }
      } else if (ascolto) {
        testo = await ascolto.ferma();
      }
      occupato = false;
      info.textContent = '';
      await invia(testo);
    } catch (err) {
      occupato = false;
      info.textContent = '';
      toast(err.message, 'errore');
    }
  };
  // Tocco su microfono spento = inizia. Se tieni premuto, al rilascio si ferma ("premi per parlare");
  // se è stato un tocco breve, resta acceso finché non tocchi di nuovo.
  let avvio = null, modo = '';
  mic.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    premuto = Date.now();
    if (!registrando && !avvio) { modo = 'nuovo'; avvio = avviaReg().finally(() => { avvio = null; }); }
    else modo = 'stop';
  });
  mic.addEventListener('pointerup', async () => {
    if (modo === 'stop') { modo = ''; return fermaReg(); }
    if (modo === 'nuovo' && Date.now() - premuto > 400) { modo = ''; if (avvio) await avvio; return fermaReg(); }
  });
  mic.addEventListener('contextmenu', (e) => e.preventDefault());
  testoIn.addEventListener('keydown', async (e) => {
    if (e.key !== 'Enter' || occupato) return;
    const t = testoIn.value;
    testoIn.value = '';
    await invia(t);
  });

  const report = new Promise((ok) => fine.addEventListener('click', () => ok()));
  // Uscita o salto a metà conversazione: spegni microfono, timer e audio.
  if (opz.segnale) opz.segnale.addEventListener('abort', () => {
    clearInterval(timer);
    fermaAudio();
    if (reg) { reg.ferma().finally(() => reg.chiudi()); }
    if (ascolto) ascolto.ferma();
  }, { once: true });
  svuota(box, h('div', { class: 'stack' },
    h('div', { class: 'card small' },
      h('div', { class: 'row between' }, h('strong', sc.titolo), tempo),
      h('div', { class: 'muted' }, '🎯 ', sc.obiettivo),
      h('div', { class: 'tiny muted', style: { marginTop: '4px' } },
        usaServer ? 'Voce: ElevenLabs.' : usaBrowser ? 'Voce: riconoscimento del browser (funziona meglio su Chrome).' : 'Il microfono non è supportato qui: puoi scrivere.',
        ' Obiettivo: 6-8 minuti.')),
    chat,
    suggerimentoTocco(),
    h('div', { class: 'center' }, (usaServer || usaBrowser) ? mic : null, info),
    testoIn,
    fine));

  await turnoAi();
  await report;
  clearInterval(timer);
  fermaAudio();
  if (reg) reg.chiudi();

  svuota(box, caricamento('Preparo il report della conversazione…'));
  let k;
  for (;;) {
    try { k = await api.post('/api/speaking/report', { scenario: sc.id, storia, pillolaId: opz.pillolaId }); break; }
    catch (err) {
      const ancora = await new Promise((r) => svuota(box, h('div', { class: 'card stack' }, h('p', err.message),
        h('button', { class: 'btn primario', onclick: () => r(true) }, 'Riprova'))));
      if (ancora) svuota(box, caricamento('Riprovo…'));
    }
  }

  const durataSec = Math.round((Date.now() - inizio) / 1000);
  const selErr = k.errori.map(() => true);
  const selFrasi = k.frasi.map(() => true);
  await new Promise((ok) => svuota(box, h('div', { class: 'stack correzione' },
    h('div', { class: 'card row' },
      h('div', { class: 'voto-grande', style: { color: k.voto >= 85 ? 'var(--good)' : k.voto >= 60 ? 'var(--accent)' : 'var(--warning)' } }, k.voto),
      h('div', { class: 'grow small' }, h('div', { class: 'muted' }, `${durata(durataSec)} di conversazione`), k.bravo ? h('p', { style: { margin: '4px 0 0' } }, '👏 ' + k.bravo) : null)),
    k.errori.length ? h('div', { class: 'card' }, h('h3', 'Da migliorare'),
      k.errori.map((e, i) => h('div', { class: 'errore-riga' }, h('label', { class: 'row', style: { alignItems: 'flex-start' } },
        h('input', { type: 'checkbox', checked: true, onchange: (ev) => { selErr[i] = ev.target.checked; }, style: { marginTop: '5px' } }),
        h('div', { class: 'grow' },
          h('div', h('span', { class: 'barrato' }, e.detto), ' → ', inglese(e.meglio, { classe: 'giusto' })),
          e.perche ? h('div', { class: 'small muted' }, e.perche) : null))))) : null,
    k.frasi.length ? h('div', { class: 'card' }, h('h3', 'Frasi utili'),
      k.frasi.map((f, i) => h('div', { class: 'errore-riga' }, h('label', { class: 'row' },
        h('input', { type: 'checkbox', checked: true, onchange: (ev) => { selFrasi[i] = ev.target.checked; } }),
        h('div', { class: 'grow' }, inglese(f.en, { tag: 'strong' }), ' — ', h('span', { class: 'muted' }, f.it)),
        h('button', { class: 'icona-btn', 'aria-label': 'Ascolta', onclick: (e) => { e.preventDefault(); parla(f.en); } }, icona('audio')))))) : null,
    k.consiglio ? h('div', { class: 'card small' }, '🎯 ', k.consiglio) : null,
    h('p', { class: 'tiny muted center' }, 'Quello che è spuntato diventa carte di ripasso.'),
    h('button', { class: 'btn primario pieno', onclick: ok }, 'Salva e continua'))));

  const carte = [
    ...k.errori.filter((_, i) => selErr[i]).map((e) => ({ tipo: 'ricorda', fronte: `Dillo meglio: «${e.detto}»`, retro: e.meglio, nota: e.perche, extra: { origine: 'speaking' } })),
    ...k.frasi.filter((_, i) => selFrasi[i]).map((f) => ({ tipo: 'en', fronte: f.en, retro: f.it, nota: sc.titolo, extra: { origine: 'speaking' } })),
  ];
  if (carte.length) await api.post('/api/carte/multi', { carte });
  const r = await api.post('/api/attivita', {
    tipo: 'speaking', punteggio: k.voto, valore: Math.round(secondiParlati), durata: durataSec,
    dettagli: { scenario: sc.id, turni: storia.filter((t) => t.ruolo === 'io').length, giorno: giornoSettimana(oggi()) },
  });
  return { punteggio: k.voto, livello: r.livello };
}
