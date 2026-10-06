// Piano della sessione del giorno: cosa fare oggi, in che ordine. Funzione pura (testata).
//
//              Sessione corta (~10')          Completa (~20') aggiunge
// Lun / Gio    Ripasso + Focus                Speaking
// Mar / Ven    Ripasso + Pillola di cultura   Writing
// Mer / Sab    Ripasso + Palazzo memoria      Speaking sulla pillola
// Domenica     Ripasso + Digit span           Dettato + Riepilogo settimanale
import { giornoSettimana } from './testo.js';

export const ESERCIZI = {
  test: { nome: 'Test di livello', area: 'inglese', minuti: 8, ai: false },
  ripasso: { nome: 'Ripasso carte', area: 'costanza', minuti: 6, ai: false },
  focus: { nome: 'Focus e concentrazione', area: 'memoria', minuti: 3, ai: false },
  palazzo: { nome: 'Palazzo della memoria', area: 'memoria', minuti: 5, ai: false },
  span: { nome: 'Digit span', area: 'memoria', minuti: 2, ai: false },
  cultura: { nome: 'Pillola di cultura', area: 'cultura', minuti: 4, ai: true },
  writing: { nome: 'Writing', area: 'inglese', minuti: 7, ai: true },
  dettato: { nome: 'Dettato', area: 'inglese', minuti: 4, ai: true },
  speaking: { nome: 'Speaking', area: 'inglese', minuti: 8, ai: true },
  riepilogo: { nome: 'Riepilogo settimanale', area: 'costanza', minuti: 2, ai: false },
  lacune: { nome: 'Lavoro sulle lacune', area: 'inglese', minuti: 5, ai: true },
  difficili: { nome: 'Carte difficili', area: 'costanza', minuti: 3, ai: false },
  richiamo: { nome: 'Ti ricordi? (cultura)', area: 'cultura', minuti: 3, ai: true },
  grammatica: { nome: 'Grammatica', area: 'inglese', minuti: 7, ai: true },
};

// Se l'AI non è configurata, gli esercizi AI vengono sostituiti da esercizi offline.
const SOSTITUTI = { cultura: 'palazzo', writing: 'span', dettato: 'span', speaking: 'focus', lacune: 'difficili', richiamo: 'focus', grammatica: 'span' };

export function pianoDelGiorno(giorno, tipo, { ai = true, testFatto = true, lacune = 0 } = {}) {
  const g = giornoSettimana(giorno);
  let base, extra;
  if (g === 1 || g === 4) { base = ['ripasso', 'focus']; extra = [{ id: 'speaking' }]; }
  else if (g === 2 || g === 5) { base = ['ripasso', 'cultura']; extra = [{ id: 'writing' }]; }
  else if (g === 3 || g === 6) { base = ['ripasso', 'palazzo']; extra = [{ id: 'speaking', scenario: 'pillola' }]; }
  else { base = ['ripasso', 'span']; extra = [{ id: 'dettato' }, { id: 'riepilogo' }]; }

  let passi = base.map((id) => ({ id }));
  if (tipo === 'completa') passi = passi.concat(extra);
  // Errori ricorrenti da sistemare: la sessione completa li lavora ogni giorno.
  if (tipo === 'completa' && lacune >= 3) passi.splice(1, 0, { id: 'lacune' });
  if (!testFatto) passi.unshift({ id: 'test' });

  const visti = new Set();
  return passi
    .map((p) => (!ai && ESERCIZI[p.id].ai ? { id: SOSTITUTI[p.id] } : p))
    .filter((p) => { const k = p.id + (p.scenario || ''); if (visti.has(k)) return false; visti.add(k); return true; })
    .map((p) => ({ ...p, ...ESERCIZI[p.id] }));
}

export function minutiTotali(passi) {
  return passi.reduce((s, p) => s + p.minuti, 0);
}

// ---------- Allenamento infinito ----------
// Sceglie il prossimo esercizio. stato = GET /api/allenamento/stato; fatti = id già svolti in questo
// allenamento, dal più vecchio al più recente.
// - Un esercizio su due è di cultura (pillola nuova, alternata al richiamo dei testi già letti quando
//   ce ne sono in scadenza): allena anche l'inglese.
// - Gli altri girano in modo EQUO su tutti gli esercizi della Palestra: si sceglie tra quelli fatti
//   meno volte in questo allenamento, evitando la stessa area di fila; a parità pesa il punto debole.
export const ROTAZIONE = ['ripasso', 'focus', 'grammatica', 'palazzo', 'writing', 'span', 'dettato', 'speaking', 'lacune', 'difficili'];
const CULTURA = ['cultura', 'richiamo'];

export function prossimoEsercizio(stato, fatti = [], rng = Math.random, oggi = null) {
  const ai = stato.ai !== false;
  const passo = (id) => {
    const p = { id, ...ESERCIZI[id] };
    if (id === 'ripasso') p.limite = 15;
    if (id === 'speaking') p.minuti = 5;
    return p;
  };
  // Si parte dalle carte in scadenza, se ce ne sono.
  if (!fatti.length && stato.daRipassare > 0) return passo('ripasso');

  if (ai && fatti.length % 2 === 1) {
    const ultimaCultura = [...fatti].reverse().find((id) => CULTURA.includes(id));
    return passo(stato.richiamo > 0 && ultimaCultura === 'cultura' ? 'richiamo' : 'cultura');
  }

  const disponibile = (id) => {
    if (!ai && ESERCIZI[id].ai) return false;
    if (id === 'ripasso') return stato.daRipassare > 0;
    if (id === 'lacune') return stato.lacune > 0;
    if (id === 'difficili') return stato.difficili > 0;
    return true;
  };
  const pool = ROTAZIONE.filter(disponibile);
  const volte = (id) => fatti.filter((x) => x === id).length;
  const minimo = Math.min(...pool.map(volte));
  let scelta = pool.filter((id) => volte(id) === minimo);
  const altri = fatti.filter((id) => !CULTURA.includes(id));
  const ultimo = altri[altri.length - 1];
  if (scelta.length > 1) scelta = scelta.filter((id) => id !== ultimo);
  const areaUltima = ultimo && ESERCIZI[ultimo] ? ESERCIZI[ultimo].area : null;
  const altraArea = scelta.filter((id) => ESERCIZI[id].area !== areaUltima);
  if (altraArea.length) scelta = altraArea;
  // Tra le aree possibili, quella con più esercizi ancora da fare nel giro: così le aree si alternano
  // in modo regolare e a fine giro non restano tre esercizi della stessa area di fila.
  const perArea = {};
  for (const id of scelta) perArea[ESERCIZI[id].area] = (perArea[ESERCIZI[id].area] || 0) + 1;
  const piuPiena = Math.max(...Object.values(perArea));
  scelta = scelta.filter((id) => perArea[ESERCIZI[id].area] === piuPiena);
  // A parità: più spesso ciò in cui vai peggio o che non fai da tempo.
  const peso = (id) => {
    const m = (stato.medie || {})[id];
    const debolezza = m && m.media != null && m.media < 75 ? (75 - m.media) / 20 : 0;
    let novita = 1.5;
    if (m && m.ultimo && oggi) novita = Math.min(3, Math.max(0, (Date.parse(oggi) - Date.parse(m.ultimo)) / 86400000)) / 2;
    return 1 + debolezza + novita;
  };
  const pesi = scelta.map((id) => [id, peso(id)]);
  const tot = pesi.reduce((s, [, w]) => s + w, 0);
  let x = rng() * tot;
  for (const [id, w] of pesi) { x -= w; if (x <= 0) return passo(id); }
  return passo(pesi[pesi.length - 1][0]);
}
