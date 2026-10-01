// Obiettivi: traguardi misurabili con scadenza. L'avanzamento si calcola da solo dai tuoi dati
// (tranne quelli "personalizzati", che aggiorni a mano). La tacca sulla barra è dove dovresti essere oggi.
import { h, svuota, modale, barra, campo, toast, conferma, icona, dataBreve } from '../ui.js';
import { api, oggi } from '../api.js';
import { METRICHE, formatta, STATI } from '../shared/obiettivi.js';
import { LIVELLI, aggiungiGiorni } from '../shared/testo.js';

const COLORE = { inglese: 'var(--accent)', memoria: 'var(--memoria)', cultura: 'var(--cultura)', costanza: 'var(--costanza)', altro: 'var(--text-2)' };

let ricarica;

function ritmo(o) {
  const a = o.avanzamento;
  if (a.stato === 'raggiunto') return `Raggiunto il ${dataBreve(o.raggiunto || oggi())}`;
  if (a.stato === 'scaduto') return 'Scadenza passata: allungala o archivialo.';
  if (a.alGiorno == null) return '';
  const m = METRICHE[o.metrica];
  if (o.metrica === 'serie') return 'Non saltare nessun giorno.';
  if (o.metrica === 'livello_inglese') return `Mancano ${a.giorniRimasti} giorni: fai writing e speaking con regolarità.`;
  const sett = a.alGiorno * 7;
  const n = sett >= 10 ? Math.round(sett) : Math.round(sett * 10) / 10;
  return `Ritmo necessario: +${n} ${m.unita || ''} a settimana.`;
}

function schedaObiettivo(o) {
  const m = METRICHE[o.metrica] || METRICHE.manuale;
  const a = o.avanzamento;
  const manuale = o.metrica === 'manuale' ? (() => {
    const i = h('input', { type: 'number', step: 'any', value: o.manuale, style: { width: '110px' } });
    return h('div', { class: 'row' }, h('span', { class: 'small' }, 'Avanzamento:'), i,
      h('button', { class: 'btn piccolo', onclick: async () => { await api.put('/api/obiettivi/' + o.id, { manuale: Number(i.value) }); toast('Aggiornato'); ricarica(); } }, 'Salva'));
  })() : null;
  return h('div', { class: 'card obiettivo stack' },
    h('div', { class: 'row between', style: { alignItems: 'flex-start' } },
      h('div', { class: 'grow' }, h('strong', o.titolo), h('div', { class: 'tiny', style: { color: COLORE[m.area] } }, m.nome)),
      h('span', { class: 'stato ' + a.stato }, STATI[a.stato])),
    barra(a.pct, { colore: COLORE[m.area], atteso: a.stato === 'raggiunto' ? null : a.attesoPct }),
    h('div', { class: 'row between small' },
      h('span', `${formatta(o.metrica, a.attuale)} → ${formatta(o.metrica, o.target)}`),
      h('span', { class: 'muted' }, a.stato === 'raggiunto' ? '' : a.giorniRimasti >= 0 ? `${a.giorniRimasti} giorni` : '')),
    h('div', { class: 'tiny muted' }, `Partenza: ${formatta(o.metrica, o.iniziale)} il ${dataBreve(o.inizio)} · scadenza ${dataBreve(o.scadenza)}. ${ritmo(o)}`),
    manuale,
    h('div', { class: 'row', style: { justifyContent: 'flex-end' } },
      h('button', { class: 'btn piccolo fantasma', onclick: () => apriModifica(o) }, icona('matita'), 'Modifica'),
      h('button', { class: 'btn piccolo fantasma', onclick: async () => { await api.put('/api/obiettivi/' + o.id, { archiviato: !o.archiviato }); ricarica(); } }, o.archiviato ? 'Riattiva' : 'Archivia'),
      h('button', { class: 'btn piccolo fantasma pericolo', onclick: async () => { if (await conferma('Eliminare questo obiettivo?')) { await api.del('/api/obiettivi/' + o.id); ricarica(); } } }, icona('cestino'))));
}

function apriModifica(o) {
  modale((chiudi) => {
    const titolo = h('input', { type: 'text', value: o.titolo });
    const target = h('input', { type: 'number', step: 'any', value: o.target });
    const scad = h('input', { type: 'date', value: o.scadenza, min: aggiungiGiorni(oggi(), 1) });
    const msg = h('p', { class: 'small', style: { color: 'var(--critical)' } });
    return h('div', { class: 'stack' }, h('h2', 'Modifica obiettivo'),
      campo('Titolo', titolo), o.metrica === 'livello_inglese' ? null : campo('Traguardo', target), campo('Scadenza', scad), msg,
      h('div', { class: 'row' },
        h('button', { class: 'btn primario grow', onclick: async () => {
          try { await api.put('/api/obiettivi/' + o.id, { titolo: titolo.value, target: Number(target.value), scadenza: scad.value }); chiudi(); ricarica(); }
          catch (err) { msg.textContent = err.message; }
        } }, 'Salva'),
        h('button', { class: 'btn', onclick: chiudi }, 'Annulla')));
  });
}

function apriNuovo(valori, suggerimenti) {
  modale((chiudi) => {
    const corpo = h('div', { class: 'stack' });
    const msg = h('p', { class: 'small', style: { color: 'var(--critical)' } });
    const crea = async (dati) => {
      try {
        await api.post('/api/obiettivi', dati);
        toast('Obiettivo creato');
        chiudi();
        ricarica();
      } catch (err) { msg.textContent = err.message; }
    };

    // Proposte pronte (calibrate sui tuoi valori attuali).
    const proposte = h('div', { class: 'opzioni' }, suggerimenti.map((s) => h('button', { onclick: () => crea(s) },
      h('strong', s.titolo), h('div', { class: 'tiny muted' }, `${METRICHE[s.metrica].nome} · oggi ${formatta(s.metrica, s.iniziale)} · entro il ${dataBreve(s.scadenza)}`))));

    // Personalizzato.
    const metrica = h('select', Object.entries(METRICHE).map(([k, m]) => h('option', { value: k }, `${m.nome}`)));
    const descr = h('p', { class: 'tiny muted', style: { margin: 0 } });
    const targetBox = h('div');
    const titolo = h('input', { type: 'text', placeholder: 'Titolo' });
    const scad = h('input', { type: 'date', value: aggiungiGiorni(oggi(), 42), min: aggiungiGiorni(oggi(), 1) });
    let target;
    const aggiorna = () => {
      const k = metrica.value;
      const m = METRICHE[k];
      descr.textContent = `${m.descrizione}${k !== 'manuale' ? ` Valore di oggi: ${formatta(k, valori[k])}.` : ''}`;
      if (k === 'livello_inglese') {
        target = h('select', LIVELLI.map((l, i) => h('option', { value: i, disabled: i <= valori[k], selected: i === Math.min(LIVELLI.length - 1, valori[k] + 2) }, l)));
      } else {
        target = h('input', { type: 'number', step: 'any', value: k === 'manuale' ? 100 : Math.ceil((valori[k] || 0) * 1.5 + 5) });
      }
      svuota(targetBox, campo(`Traguardo${m.unita ? ' (' + m.unita + ')' : ''}`, target));
      titolo.placeholder = k === 'manuale' ? 'es. Leggere un libro in inglese' : `es. ${m.nome}: nuovo traguardo`;
    };
    metrica.addEventListener('change', aggiorna);
    aggiorna();

    svuota(corpo,
      h('div', { class: 'row between' }, h('h2', { style: { margin: 0 } }, 'Nuovo obiettivo'), h('button', { class: 'icona-btn', 'aria-label': 'Chiudi', onclick: chiudi }, icona('chiudi'))),
      h('h3', 'Proposte per te'), proposte,
      h('h3', { style: { marginTop: '12px' } }, 'Oppure crealo tu'),
      campo('Cosa vuoi misurare', metrica), descr, targetBox, campo('Titolo', titolo), campo('Entro il', scad), msg,
      h('button', { class: 'btn primario pieno', onclick: () => {
        const k = metrica.value;
        const t = Number(target.value);
        crea({
          metrica: k, target: t, scadenza: scad.value,
          titolo: titolo.value.trim() || (k === 'livello_inglese' ? `Arrivare a ${LIVELLI[t]}` : `${METRICHE[k].nome}: ${formatta(k, t)}`),
        });
      } }, 'Crea obiettivo'));
    return corpo;
  });
}

export async function mostra(box) {
  const carica = async () => {
    const d = await api.get('/api/obiettivi');
    const attivi = d.obiettivi.filter((o) => !o.archiviato && o.avanzamento.stato !== 'raggiunto');
    const raggiunti = d.obiettivi.filter((o) => !o.archiviato && o.avanzamento.stato === 'raggiunto');
    const archiviati = d.obiettivi.filter((o) => o.archiviato);
    svuota(box,
      h('div', { class: 'row between' }, h('h1', { style: { margin: 0 } }, 'Obiettivi'),
        h('button', { class: 'btn piccolo primario', onclick: () => apriNuovo(d.valori, d.suggerimenti) }, '+ Nuovo')),
      h('p', { class: 'small muted', style: { marginTop: '8px' } }, 'L\'avanzamento si aggiorna da solo con i tuoi esercizi. La tacca sulla barra indica dove dovresti essere oggi per arrivare in tempo.'),
      attivi.length ? h('div', { class: 'stack' }, attivi.map(schedaObiettivo))
        : h('div', { class: 'card vuoto stack' }, h('p', 'Nessun obiettivo attivo.'),
          h('button', { class: 'btn primario', onclick: () => apriNuovo(d.valori, d.suggerimenti) }, 'Scegline uno')),
      raggiunti.length ? h('div', { class: 'sezione' }, h('h2', `🏆 Raggiunti (${raggiunti.length})`), h('div', { class: 'stack' }, raggiunti.map(schedaObiettivo))) : null,
      archiviati.length ? h('details', { class: 'sezione' }, h('summary', { class: 'muted' }, `Archiviati (${archiviati.length})`),
        h('div', { class: 'stack', style: { marginTop: '10px' } }, archiviati.map(schedaObiettivo))) : null);
  };
  ricarica = carica;
  await carica();
}
