// Pillole di cultura: ogni pillola parte da una pagina vera di Wikipedia (fonte citata),
// poi l'AI la riscrive in inglese al livello dell'utente. Così i fatti non sono inventati.
import { indiceLivello } from '../public/js/shared/testo.js';

export const CATEGORIE = {
  storia: {
    nome: 'Storia',
    argomenti: ['Roman Empire', 'Ancient Egypt', 'Renaissance', 'French Revolution', 'Industrial Revolution',
      'World War I', 'Cold War', 'Fall of the Berlin Wall', 'Byzantine Empire', 'Vikings', 'Silk Road',
      'Magna Carta', 'Printing press', 'Kingdom of the Two Sicilies', 'Pompeii', 'Ottoman Empire',
      'Apollo 11', 'Christopher Columbus', 'Julius Caesar', 'Napoleon'],
  },
  scienza: {
    nome: 'Scienza',
    argomenti: ['Photosynthesis', 'Black hole', 'DNA', 'Evolution', 'Theory of relativity', 'Vaccine',
      'Plate tectonics', 'Big Bang', 'Antibiotic', 'Human brain', 'Sleep', 'Memory', 'Gravity',
      'Penicillin', 'Electricity', 'Volcano', 'Climate change', 'Placebo', 'Octopus', 'Bee'],
  },
  geografia: {
    nome: 'Geografia',
    argomenti: ['Amazon rainforest', 'Sahara', 'Himalayas', 'Iceland', 'Japan', 'Mount Vesuvius',
      'Great Barrier Reef', 'Antarctica', 'Venice', 'Nile', 'Mediterranean Sea', 'New Zealand',
      'Mongolia', 'Grand Canyon', 'Dead Sea', 'Singapore', 'Norway', 'Patagonia', 'Madagascar', 'Istanbul'],
  },
  arte: {
    nome: 'Arte e cultura',
    argomenti: ['Leonardo da Vinci', 'Michelangelo', 'Caravaggio', 'Impressionism', 'Vincent van Gogh',
      'Opera', 'William Shakespeare', 'Dante Alighieri', 'The Beatles', 'Cinema of Italy', 'Pablo Picasso',
      'Frida Kahlo', 'Jazz', 'Gothic architecture', 'Mona Lisa', 'Baroque', 'Andy Warhol', 'Bauhaus',
      'Federico Fellini', 'Street art'],
  },
  economia: {
    nome: 'Economia e business',
    argomenti: ['Inflation', 'Supply and demand', 'Stock market', 'Advertising', 'Brand', 'Marketing',
      'Globalization', 'Great Depression', 'Euro', 'Startup company', 'Coca-Cola', 'Apple Inc.',
      'Ferrari', 'Social media', 'Influencer marketing', 'Bitcoin', 'Central bank', 'Adam Smith',
      'Behavioral economics', 'Fast fashion'],
  },
  filosofia: {
    nome: 'Filosofia e mente',
    argomenti: ['Stoicism', 'Socrates', 'Plato', 'Aristotle', 'Confucius', 'Buddhism', 'Existentialism',
      'Ethics', 'Cognitive bias', 'Habit', 'Happiness', 'Mindfulness', 'Friedrich Nietzsche',
      'Niccolò Machiavelli', 'Seneca the Younger', 'Epicureanism', 'Free will', 'Critical thinking',
      'Dunning–Kruger effect', 'Flow (psychology)'],
  },
  tecnologia: {
    nome: 'Tecnologia',
    argomenti: ['Internet', 'Artificial intelligence', 'Smartphone', 'World Wide Web', 'Alan Turing',
      'Ada Lovelace', 'Electric car', 'Satellite', 'GPS', 'Renewable energy', 'Nuclear power',
      '3D printing', 'Robot', 'Video game', 'Computer virus', 'Wikipedia', 'Steve Jobs', 'Transistor',
      'Space Shuttle', 'Television'],
  },
};

// Argomento scelto dall'utente: non appartiene a una categoria fissa.
export const CATEGORIA_LIBERA = { nome: 'A tua scelta' };

export const ORDINE_CATEGORIE = ['storia', 'scienza', 'economia', 'arte', 'geografia', 'filosofia', 'tecnologia'];

// Sceglie la prossima categoria a rotazione e il primo argomento non ancora usato.
export function prossimoArgomento(usati, contatore) {
  const set = new Set(usati);
  for (let k = 0; k < ORDINE_CATEGORIE.length; k++) {
    const categoria = ORDINE_CATEGORIE[(contatore + k) % ORDINE_CATEGORIE.length];
    const libero = CATEGORIE[categoria].argomenti.find((a) => !set.has(a));
    if (libero) return { categoria, argomento: libero };
  }
  // Tutti usati (dopo ~140 pillole): si ricomincia dal giro più vecchio.
  const categoria = ORDINE_CATEGORIE[contatore % ORDINE_CATEGORIE.length];
  const lista = CATEGORIE[categoria].argomenti;
  return { categoria, argomento: lista[contatore % lista.length] };
}

const UA = 'DailyGym/1.0 (personal learning app; contact: owner)';

function dominiPer(livello) {
  return indiceLivello(livello) < indiceLivello('B2') ? ['simple.wikipedia.org', 'en.wikipedia.org'] : ['en.wikipedia.org'];
}

async function wiki(dominio, parametri, fetchImpl) {
  const url = `https://${dominio}/w/api.php?format=json&formatversion=2&${parametri}`;
  const r = await fetchImpl(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15_000) });
  if (!r.ok) throw new Error(`Wikipedia ${r.status}`);
  return r.json();
}

// Argomento scritto dall'utente ("Napoli", "caffè", "buchi neri") -> titolo della pagina Wikipedia più pertinente.
export async function cercaArgomento(testo, livello, fetchImpl = fetch) {
  for (const dominio of dominiPer(livello)) {
    try {
      const d = await wiki(dominio, `action=query&list=search&srlimit=3&srsearch=${encodeURIComponent(testo)}`, fetchImpl);
      const titolo = d?.query?.search?.find((x) => !/disambiguation/i.test(x.title))?.title;
      if (titolo) return titolo;
    } catch (err) {
      console.error(`[cultura] ricerca ${dominio}: ${err.message}`);
    }
  }
  return null;
}

// Quando gli argomenti della lista finiscono: pagine collegate a quelle già lette (praticamente infinite).
const ESCLUSI = /^(List of|Lists of|Index of|Outline of|Timeline of|History of the|Category:|Template:)|\(disambiguation\)|^\d+(s| BC| AD)?$/i;
export async function argomentiCollegati(daTitolo, usati, livello, fetchImpl = fetch) {
  const set = new Set(usati.map((u) => u.toLowerCase()));
  const dominio = dominiPer(livello)[dominiPer(livello).length - 1]; // la Wikipedia inglese ha molti più collegamenti
  try {
    const d = await wiki(dominio, `action=query&prop=links&plnamespace=0&pllimit=200&redirects=1&titles=${encodeURIComponent(daTitolo)}`, fetchImpl);
    const link = (d?.query?.pages?.[0]?.links || []).map((l) => l.title).filter((t) => !ESCLUSI.test(t) && !set.has(t.toLowerCase()));
    for (let i = link.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [link[i], link[j]] = [link[j], link[i]]; }
    return link.slice(0, 6);
  } catch (err) {
    console.error(`[cultura] collegamenti di ${daTitolo}: ${err.message}`);
    return [];
  }
}

// Sotto B2 si parte da Simple English Wikipedia (frasi più semplici); se la pagina
// non esiste lì, si usa la Wikipedia inglese normale.
export async function estrattoWikipedia(argomento, livello, fetchImpl = fetch) {
  const domini = dominiPer(livello);
  for (const dominio of domini) {
    const url = `https://${dominio}/w/api.php?action=query&prop=extracts|info&inprop=url&explaintext=1&redirects=1&format=json&formatversion=2&titles=${encodeURIComponent(argomento)}`;
    try {
      const r = await fetchImpl(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15_000) });
      if (!r.ok) continue;
      const dati = await r.json();
      const pagina = dati?.query?.pages?.[0];
      if (!pagina || pagina.missing || !pagina.extract || pagina.extract.length < 400) continue;
      return {
        titolo: pagina.title,
        url: pagina.fullurl || `https://${dominio}/wiki/${encodeURIComponent(pagina.title.replace(/ /g, '_'))}`,
        // Le prime sezioni bastano per una pillola; il resto costerebbe token senza servire.
        testo: pulisci(pagina.extract).slice(0, 7000),
      };
    } catch (err) {
      console.error(`[cultura] ${dominio} ${argomento}: ${err.message}`);
    }
  }
  return null;
}

function pulisci(t) {
  return t
    .split(/\n==+\s*(See also|References|Notes|External links|Further reading|Related pages|Other websites)\s*==+/i)[0]
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
