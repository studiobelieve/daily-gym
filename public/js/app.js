// Avvio dell'app, login e navigazione (hash router: #/oggi, #/carte, ...).
import { h, svuota, toast, icona, caricamento } from './ui.js';
import { api, quandoNonAutenticato } from './api.js';
import { apriAggiungi } from './viste/carte.js';
import './parola.js'; // attiva "tocca una parola" in tutta l'app

const app = document.getElementById('app');

// Tema scelto in Impostazioni (auto = segue il telefono).
try {
  const t = localStorage.getItem('dg_tema');
  if (t === 'dark' || t === 'light') document.documentElement.setAttribute('data-theme', t);
} catch {}
export const stato = { ai: false, voce: false };

const SCHEDE = [
  ['oggi', 'Oggi'],
  ['palestra', 'Palestra'],
  ['carte', 'Carte'],
  ['progressi', 'Progressi'],
  ['obiettivi', 'Obiettivi'],
];

const VISTE = {
  oggi: () => import('./viste/oggi.js'),
  palestra: () => import('./viste/palestra.js'),
  carte: () => import('./viste/carte.js'),
  progressi: () => import('./viste/progressi.js'),
  obiettivi: () => import('./viste/obiettivi.js'),
  impostazioni: () => import('./viste/impostazioni.js'),
  sessione: () => import('./viste/sessione.js'),
  esercizio: () => import('./viste/sessione.js'),
  pillole: () => import('./viste/pillole.js'),
  grammatica: () => import('./viste/grammatica.js'),
};

let main, nav, fab;

function guscio() {
  main = h('main', { id: 'contenuto' });
  nav = h('nav', { class: 'nav', 'aria-label': 'Navigazione' },
    SCHEDE.map(([id, nome]) => h('button', { 'data-id': id, onclick: () => vai(id) }, icona(id), nome)));
  fab = h('button', { class: 'fab', 'aria-label': 'Aggiungi carta', title: 'Aggiungi', onclick: () => apriAggiungi() }, '+');
  svuota(app,
    h('header', { class: 'topbar' },
      h('a', { class: 'logo', href: '#/oggi', style: { color: 'inherit', textDecoration: 'none' } }, h('span', { class: 'logo-dot' }), 'Daily Gym'),
      h('button', { class: 'icona-btn', 'aria-label': 'Impostazioni', onclick: () => vai('impostazioni') }, icona('impostazioni'))),
    main, nav, fab);
}

export function vai(percorso) {
  const nuovo = '#/' + percorso;
  if (location.hash === nuovo) instrada();
  else location.hash = nuovo;
}

// Le viste "a schermo pieno" (sessione, esercizi) nascondono barra e pulsante +.
function modalitaFocus(attiva) {
  nav.classList.toggle('hidden', attiva);
  fab.classList.toggle('hidden', attiva);
  document.body.style.paddingBottom = attiva ? '24px' : '';
}

let navigazione = 0;
async function instrada() {
  ricaricaSeServe();
  controllaVersione();
  const [nome, ...resto] = (location.hash.replace(/^#\/?/, '') || 'oggi').split('/');
  const chiave = VISTE[nome] ? nome : 'oggi';
  const mio = ++navigazione;
  nav.querySelectorAll('button').forEach((b) => b.classList.toggle('attivo', b.dataset.id === chiave));
  modalitaFocus(chiave === 'sessione' || chiave === 'esercizio');
  svuota(main, caricamento());
  window.scrollTo(0, 0);
  try {
    const modulo = await VISTE[chiave]();
    if (mio !== navigazione) return;
    const box = h('div');
    svuota(main, box);
    await modulo.mostra(box, { nome: chiave, parametri: resto, vai, attuale: () => mio === navigazione });
  } catch (err) {
    if (err.status === 401) return;
    console.error(err);
    if (mio === navigazione) svuota(main, h('div', { class: 'card' }, h('p', 'Qualcosa è andato storto: ' + err.message), h('button', { class: 'btn', onclick: instrada }, 'Riprova')));
  }
}

function login(motivo) {
  const pass = h('input', { type: 'password', autocomplete: 'current-password', placeholder: 'Password' });
  const msg = h('p', { class: 'small', style: { color: 'var(--critical)', minHeight: '1.5em' } }, motivo || '');
  const entra = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/login', { password: pass.value });
      avvia();
    } catch (err) {
      msg.textContent = err.message;
      pass.select();
    }
  };
  svuota(app, h('div', { class: 'login card' },
    h('div', { class: 'logo', style: { marginBottom: '12px' } }, h('span', { class: 'logo-dot' }), 'Daily Gym'),
    h('p', { class: 'muted' }, 'La tua palestra mentale. Inserisci la password che hai impostato su Railway.'),
    h('form', { onsubmit: entra, class: 'stack' }, pass, msg, h('button', { class: 'btn primario pieno', type: 'submit' }, 'Entra'))));
  setTimeout(() => pass.focus(), 50);
}

// Aggiornamento automatico: se sul server c'è una versione nuova, l'app si ricarica da sola
// (mai durante un esercizio: aspetta di tornare su una schermata normale).
let versioneCaricata = null, ultimoControllo = 0, daRicaricare = false;
async function controllaVersione() {
  if (!versioneCaricata || Date.now() - ultimoControllo < 20_000) return;
  ultimoControllo = Date.now();
  try {
    const s = await fetch('/api/stato', { credentials: 'same-origin', cache: 'no-store' }).then((r) => r.json());
    if (s.versione && s.versione !== versioneCaricata) daRicaricare = true;
  } catch {}
}
function inEsercizio() { return /^#\/(sessione|esercizio)/.test(location.hash); }
function ricaricaSeServe() { if (daRicaricare && !inEsercizio()) location.reload(); }
document.addEventListener('visibilitychange', async () => { if (!document.hidden) { await controllaVersione(); ricaricaSeServe(); } });
setInterval(async () => { await controllaVersione(); ricaricaSeServe(); }, 5 * 60_000);

async function avvia() {
  let s;
  try {
    s = await fetch('/api/stato', { credentials: 'same-origin' }).then((r) => r.json());
  } catch {
    svuota(app, h('div', { class: 'login card' }, h('p', 'Il server non risponde. Controlla la connessione e ricarica la pagina.')));
    return;
  }
  versioneCaricata = s.versione;
  if (!s.passwordConfigurata) {
    svuota(app, h('div', { class: 'login card' }, h('h2', 'Manca la password'),
      h('p', 'Imposta la variabile APP_PASSWORD su Railway, poi ricarica questa pagina.')));
    return;
  }
  if (!s.autenticato) return login();
  stato.ai = s.ai;
  stato.voce = s.voce;
  guscio();
  instrada();
}

quandoNonAutenticato(() => login('Sessione scaduta: rientra.'));
window.addEventListener('hashchange', () => main && instrada());
window.addEventListener('unhandledrejection', (e) => {
  if (e.reason && e.reason.status === 401) return;
  if (e.reason && e.reason.message) toast(e.reason.message, 'errore');
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

avvia();
