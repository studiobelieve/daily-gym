// Catalogo delle metriche misurabili e calcolo dell'avanzamento degli obiettivi.
// Condiviso: il server calcola i valori attuali, il browser li mostra con le stesse etichette.
import { giorniTra, livelloDaIndice } from './testo.js';

export const METRICHE = {
  livello_inglese: {
    nome: 'Livello di inglese', area: 'inglese', unita: '',
    descrizione: 'Il livello stimato dall\'app (sale da solo quando vai bene).',
    formato: (v) => livelloDaIndice(v),
  },
  parole_mature: {
    nome: 'Parole inglesi consolidate', area: 'inglese', unita: 'parole',
    descrizione: 'Carte di inglese ricordate così bene da essere riproposte ogni 3 settimane o più.',
  },
  parole_totali: {
    nome: 'Parole inglesi in studio', area: 'inglese', unita: 'parole',
    descrizione: 'Quante carte di inglese hai creato.',
  },
  writing_media: {
    nome: 'Voto medio writing', area: 'inglese', unita: '/100',
    descrizione: 'Media degli ultimi 5 writing corretti.',
  },
  speaking_minuti: {
    nome: 'Minuti di speaking', area: 'inglese', unita: 'min',
    descrizione: 'Minuti totali di conversazione con l\'agente.',
  },
  span_record: {
    nome: 'Record digit span', area: 'memoria', unita: 'cifre',
    descrizione: 'La sequenza di cifre più lunga che hai ripetuto giusta.',
  },
  palazzo_record: {
    nome: 'Record palazzo della memoria', area: 'memoria', unita: 'oggetti',
    descrizione: 'Il numero più alto di oggetti ricordati tutti, in ordine.',
  },
  nomi_precisione: {
    nome: 'Precisione sui nomi', area: 'memoria', unita: '%',
    descrizione: 'Media delle ultime 5 sessioni di allenamento nomi.',
  },
  persone_memorizzate: {
    nome: 'Persone reali memorizzate', area: 'memoria', unita: 'persone',
    descrizione: 'Persone vere il cui nome ricordi da almeno una settimana.',
  },
  pillole: {
    nome: 'Pillole di cultura completate', area: 'cultura', unita: 'pillole',
    descrizione: 'Quante pillole hai letto e su cui hai fatto il quiz.',
  },
  cultura_ricordata: {
    nome: 'Pillole ricordate a lungo', area: 'cultura', unita: 'pillole',
    descrizione: 'Testi di cultura ricordati bene in "Ti ricordi?" almeno 3 volte di fila (intervallo di una settimana o più).',
  },
  serie: {
    nome: 'Giorni di fila', area: 'costanza', unita: 'giorni',
    descrizione: 'La serie attuale di giorni con la sessione completata.',
  },
  sessioni: {
    nome: 'Sessioni completate', area: 'costanza', unita: 'sessioni',
    descrizione: 'Il totale delle sessioni giornaliere fatte.',
  },
  manuale: {
    nome: 'Personalizzato', area: 'altro', unita: '',
    descrizione: 'Un obiettivo tuo: aggiorni tu l\'avanzamento a mano.',
  },
};

export function oreMinuti(min) {
  const m = Math.max(0, Math.round(min));
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h${m % 60 ? ' ' + (m % 60) + ' min' : ''}`;
}

export function formatta(metrica, v) {
  const m = METRICHE[metrica];
  if (v == null || Number.isNaN(v)) return '—';
  if (m && m.formato) return m.formato(v);
  const n = Math.round(v * 10) / 10;
  return m && m.unita ? `${n} ${m.unita}` : String(n);
}

// obiettivo: { metrica, target, iniziale, inizio, scadenza, raggiunto }
// attuale: valore di oggi della metrica
// Restituisce percentuale, ritmo atteso e uno stato leggibile.
export function avanzamento(obiettivo, attuale, oggi) {
  const { target, iniziale, inizio, scadenza } = obiettivo;
  const range = target - iniziale;
  const fatto = range <= 0 ? (attuale >= target ? 1 : 0) : (attuale - iniziale) / range;
  const pct = Math.max(0, Math.min(100, Math.round(fatto * 100)));

  const durata = Math.max(1, giorniTra(inizio, scadenza));
  const passati = Math.max(0, Math.min(durata, giorniTra(inizio, oggi)));
  const attesoPct = Math.round((passati / durata) * 100);
  const giorniRimasti = giorniTra(oggi, scadenza);

  let stato;
  if (obiettivo.raggiunto || attuale >= target) stato = 'raggiunto';
  else if (giorniRimasti < 0) stato = 'scaduto';
  else if (pct >= attesoPct - 10) stato = 'in_linea';
  else stato = 'in_ritardo';

  // Quanto serve al giorno per arrivare in tempo (solo se ha senso).
  let alGiorno = null;
  if (stato !== 'raggiunto' && giorniRimasti > 0) alGiorno = (target - attuale) / giorniRimasti;

  return { attuale, pct, attesoPct, giorniRimasti, stato, alGiorno };
}

export const STATI = {
  raggiunto: 'Raggiunto',
  in_linea: 'In linea',
  in_ritardo: 'In ritardo',
  scaduto: 'Scaduto',
};

// Obiettivi proposti partendo dai valori attuali: ambiziosi ma realistici.
export function suggerimenti(valori, oggi, aggiungi) {
  const v = (k) => valori[k] ?? 0;
  const tra = (g) => aggiungi(oggi, g);
  const out = [
    { metrica: 'serie', titolo: '30 giorni di fila', target: 30, scadenza: tra(35) },
    { metrica: 'span_record', titolo: `Ricordare ${Math.max(7, v('span_record') + 2)} cifre`, target: Math.max(7, v('span_record') + 2), scadenza: tra(56) },
    { metrica: 'palazzo_record', titolo: `Palazzo della memoria: ${Math.max(10, v('palazzo_record') + 5)} oggetti`, target: Math.max(10, v('palazzo_record') + 5), scadenza: tra(42) },
    { metrica: 'nomi_precisione', titolo: 'Nomi: 90% di precisione', target: 90, scadenza: tra(42) },
    { metrica: 'persone_memorizzate', titolo: `Memorizzare ${v('persone_memorizzate') + 20} persone reali`, target: v('persone_memorizzate') + 20, scadenza: tra(60) },
    { metrica: 'parole_mature', titolo: `${v('parole_mature') + 150} parole inglesi consolidate`, target: v('parole_mature') + 150, scadenza: tra(90) },
    { metrica: 'livello_inglese', titolo: `Arrivare a ${livelloDaIndice(v('livello_inglese') + 2)}`, target: Math.min(9, v('livello_inglese') + 2), scadenza: tra(120) },
    { metrica: 'speaking_minuti', titolo: '120 minuti di speaking', target: v('speaking_minuti') + 120, scadenza: tra(60) },
    { metrica: 'pillole', titolo: '40 pillole di cultura', target: v('pillole') + 40, scadenza: tra(90) },
  ];
  return out.map((o) => ({ ...o, iniziale: v(o.metrica) })).filter((o) => o.target > o.iniziale);
}
