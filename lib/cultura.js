// Pillole di cultura: ogni pillola parte da una pagina vera di Wikipedia (fonte citata),
// poi l'AI la riscrive in inglese al livello dell'utente. Così i fatti non sono inventati.
import { indiceLivello } from '../public/js/shared/testo.js';

// Argomenti SPECIFICI (una storia, una persona, un evento, un esperimento), non temi generici:
// ogni pillola deve lasciare qualcosa da raccontare. I nomi sono titoli della Wikipedia inglese;
// se un titolo non esiste esattamente, creaPillola cerca la pagina più vicina.
export const CATEGORIE = {
  antica: {
    nome: 'Storia antica e medievale',
    argomenti: ['Assassination of Julius Caesar', 'Library of Alexandria', 'Eruption of Mount Vesuvius in 79 AD',
      "Hannibal's crossing of the Alps", 'Battle of Thermopylae', 'Code of Hammurabi', 'Spartacus', 'Cleopatra',
      'Hypatia', 'Sack of Rome (410)', 'Antikythera mechanism', 'Great Fire of Rome', 'Black Death',
      'Battle of Hastings', 'Marco Polo', 'Knights Templar', 'Joan of Arc', 'Frederick II, Holy Roman Emperor',
      'Sicilian Vespers', 'Fall of Constantinople', 'Genghis Khan', 'Schola Medica Salernitana', "Children's Crusade",
      'Leif Erikson', 'Domesday Book', 'Diocletian', 'Nero', 'Terracotta Army'],
  },
  moderna: {
    nome: 'Storia moderna',
    argomenti: ["Lorenzo de' Medici", 'Girolamo Savonarola', 'Sack of Rome (1527)', 'Galileo affair', 'Spanish Armada',
      'Masaniello', 'Boston Tea Party', 'Storming of the Bastille', 'Marie Antoinette', 'French invasion of Russia',
      'Battle of Waterloo', 'Expedition of the Thousand', 'Giuseppe Garibaldi', 'Naples–Portici railway',
      'Great Famine (Ireland)', 'Assassination of Abraham Lincoln', 'Meiji Restoration', 'Suez Canal', 'Luddite',
      'California gold rush', 'Treaty of Tordesillas', 'Hernán Cortés', 'Eleonora Fonseca Pimentel',
      'Neapolitan Republic (1799)', 'Brigandage in Southern Italy', 'Jack the Ripper'],
  },
  contemporanea: {
    nome: 'Storia contemporanea',
    argomenti: ['Mani pulite', 'Bettino Craxi', 'Sinking of the Titanic', 'Assassination of Archduke Franz Ferdinand',
      'March on Rome', 'Giacomo Matteotti', 'Wall Street crash of 1929', 'Attack on Pearl Harbor', 'Normandy landings',
      'Four days of Naples', 'Atomic bombings of Hiroshima and Nagasaki', 'Nuremberg trials',
      '1946 Italian institutional referendum', 'Enrico Mattei', 'Adriano Olivetti', 'Italian economic miracle',
      'Cuban Missile Crisis', 'Assassination of John F. Kennedy', 'Years of Lead (Italy)', 'Kidnapping of Aldo Moro',
      'Bologna massacre', 'Chernobyl disaster', 'Capaci bombing', 'Giovanni Falcone', 'Paolo Borsellino',
      'Dissolution of the Soviet Union', 'Maastricht Treaty', 'September 11 attacks', 'Watergate scandal',
      'Apollo 13', 'Nelson Mandela', '1980 Irpinia earthquake'],
  },
  scienza: {
    nome: 'Scienza',
    argomenti: ['Stanford prison experiment', 'Milgram experiment', 'Phineas Gage', 'Edward Jenner', 'Ignaz Semmelweis',
      'Rosalind Franklin', 'Marie Curie', 'Higgs boson', 'Tardigrade', 'Voyager Golden Record', 'Hubble Space Telescope',
      'CRISPR gene editing', 'Dolly (sheep)', 'Chicxulub crater', 'Tunguska event', 'Henrietta Lacks',
      'Thalidomide scandal', 'Ozone depletion', 'Great Pacific garbage patch', 'Human microbiome', 'Neuroplasticity',
      'Ettore Majorana', 'Enrico Fermi', 'Rita Levi-Montalcini', 'Campi Flegrei', 'Discovery of penicillin',
      'Circadian rhythm', 'Mpemba effect'],
  },
  geografia: {
    nome: 'Luoghi e viaggi',
    argomenti: ['Fontanelle cemetery', 'Strait of Messina Bridge', 'Matera', 'Point Nemo', 'Atacama Desert',
      'Kowloon Walled City', 'Easter Island', 'Machu Picchu', 'Petra', 'Pripyat', 'Svalbard Global Seed Vault',
      'Gross National Happiness', 'MOSE project', 'Panama Canal', 'Palm Islands', 'Lake Baikal', 'Socotra',
      '1996 Mount Everest disaster', 'Danakil Depression', 'Vatican City', 'San Marino', 'Faroe Islands',
      'Silicon Valley', 'Pompeii', 'Amalfi Coast', 'Trans-Siberian Railway'],
  },
  arte: {
    nome: 'Arte, cinema e musica',
    argomenti: ['The Last Supper (Leonardo)', 'Sistine Chapel ceiling', 'Veiled Christ', 'Han van Meegeren', 'Banksy',
      'Girl with a Pearl Earring', 'The Starry Night', 'Guernica (Picasso)', 'La Dolce Vita', 'Sergio Leone', 'Totò',
      'Enrico Caruso', "'O sole mio", 'Teatro di San Carlo', 'Woodstock', 'Live Aid', 'Freddie Mercury',
      'Abbey Road', 'Elvis Presley', 'Divine Comedy', 'Elena Ferrante', 'Umberto Eco', 'The Adventures of Pinocchio',
      'Hollywood blacklist', 'Pino Daniele', 'Massimo Troisi', 'Caravaggio'],
  },
  economia: {
    nome: 'Economia, finanza e business',
    argomenti: ['Tulip mania', 'Charles Ponzi', 'Bernie Madoff', 'Enron scandal', 'Bankruptcy of Lehman Brothers',
      'Black Monday (1987)', 'Parmalat', 'Dot-com bubble', 'GameStop short squeeze', 'Warren Buffett',
      'Compound interest', 'Index fund', 'Bretton Woods system', 'Hyperinflation in the Weimar Republic',
      'Hyperinflation in Zimbabwe', 'Ferrero SpA', 'Barilla Group', 'IKEA', 'Nike, Inc.', 'Netflix', 'Tesla, Inc.',
      'Planned obsolescence', 'Marshall Plan', 'Wirecard scandal', 'Bankruptcy of FTX', 'Theranos',
      'South Sea Company', '2008 financial crisis', 'Medici Bank'],
  },
  filosofia: {
    nome: 'Filosofia e psicologia',
    argomenti: ['Allegory of the cave', 'Trolley problem', 'Ship of Theseus', "Prisoner's dilemma",
      'Stanford marshmallow experiment', 'Pygmalion effect', 'Confirmation bias', 'Sunk cost', 'Impostor syndrome',
      'Bystander effect', "Maslow's hierarchy of needs", 'Pareto principle', "Occam's razor", 'Memento mori',
      'Ikigai', 'Hedonic treadmill', 'The Paradox of Choice', 'Overview effect', 'Mere-exposure effect',
      'Cognitive dissonance', 'Socratic method', 'Marcus Aurelius', 'The Prince', 'Diogenes', 'Placebo',
      'Anchoring effect'],
  },
  // Solo approcci con evidenze attuali. Le idee superate (PNL, power posing, la regola 7-38-55)
  // compaiono solo come pillole "sfata il mito": il prompt chiede di dire chiaramente cosa è stato smentito.
  comunicazione: {
    nome: 'Comunicazione, persuasione e negoziazione',
    argomenti: [
      // linguaggio del corpo
      'Nonverbal communication', 'Proxemics', 'Duchenne smile', 'Mirroring (psychology)', 'Paralanguage',
      'Eye contact', 'Facial Action Coding System', 'Albert Mehrabian', 'Power posing', 'Lie detection',
      // persuasione
      'Robert Cialdini', 'Reciprocity (social psychology)', 'Social proof', 'Foot-in-the-door technique',
      'Door-in-the-face technique', 'Elaboration likelihood model', 'Framing effect (psychology)', 'Nudge theory',
      'Loss aversion', 'Decoy effect', 'Inoculation theory', 'Transportation theory (psychology)',
      // negoziazione
      'Getting to Yes', 'Best alternative to a negotiated agreement', 'Zone of possible agreement', 'Chris Voss',
      'Integrative negotiation', 'Distributive negotiation', 'Active listening', 'Harvard Negotiation Project',
      'Ultimatum game', 'Nonviolent Communication', 'Camp David Accords'],
  },
  tecnologia: {
    nome: 'Tecnologia',
    argomenti: ['ENIAC', 'Enigma machine', 'ARPANET', 'Year 2000 problem', 'IPhone (1st generation)',
      'Deep Blue versus Garry Kasparov', 'AlphaGo versus Lee Sedol', 'ChatGPT', 'Stuxnet', 'WannaCry ransomware attack',
      'Facebook–Cambridge Analytica data scandal', 'Olivetti Programma 101', 'Federico Faggin', 'Tim Berners-Lee',
      'Linux', 'Napster', 'Concorde', 'Voyager program', 'Starlink', 'Tetris', 'Super Mario Bros.', 'QR code',
      'Ada Lovelace', 'Alan Turing', 'Bitcoin', 'Nokia 3310'],
  },
};

// Argomento scelto dall'utente: non appartiene a una categoria fissa.
export const CATEGORIA_LIBERA = { nome: 'A tua scelta' };

export const ORDINE_CATEGORIE = ['contemporanea', 'scienza', 'comunicazione', 'economia', 'antica', 'arte', 'filosofia', 'moderna', 'tecnologia', 'geografia'];

// Nomi delle vecchie categorie, per le pillole già salvate.
export const CATEGORIE_STORICHE = { storia: 'Storia' };

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

// Argomento scritto dall'utente ("Napoli", "caffè", "power posing") -> titolo della pagina Wikipedia.
// 1) pagina con quel titolo esatto (anche via redirect), 2) ricerca, ma solo risultati che contengono
// davvero le parole cercate: la Wikipedia semplificata, se non ha la pagina, restituisce risultati a caso.
export async function cercaArgomento(testo, livello, fetchImpl = fetch) {
  const domini = [...new Set(['en.wikipedia.org', ...dominiPer(livello)])];
  const parole = testo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z0-9]+/).filter((p) => p.length >= 3);
  const pertinente = (titolo) => {
    const t = titolo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return parole.length ? parole.every((p) => t.includes(p.slice(0, Math.max(4, p.length - 2)))) : true;
  };
  for (const dominio of domini) {
    try {
      const d = await wiki(dominio, `action=query&redirects=1&titles=${encodeURIComponent(testo)}`, fetchImpl);
      const pagina = d?.query?.pages?.[0];
      if (pagina && pagina.missing === undefined && pagina.invalid === undefined && pagina.title) return pagina.title;
    } catch (err) {
      console.error(`[cultura] titolo ${dominio}: ${err.message}`);
    }
  }
  for (const dominio of domini) {
    try {
      const d = await wiki(dominio, `action=query&list=search&srlimit=5&srsearch=${encodeURIComponent(testo)}`, fetchImpl);
      const titolo = (d?.query?.search || []).map((x) => x.title).find((t) => !/disambiguation/i.test(t) && pertinente(t));
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

// Controlla in blocchi di 50 che i titoli delle liste esistano sulla Wikipedia inglese.
export async function verificaTitoli(fetchImpl = fetch) {
  const tutti = Object.entries(CATEGORIE).flatMap(([cat, c]) => c.argomenti.map((a) => ({ cat, a })));
  const mancanti = [];
  const reindirizzati = [];
  for (let i = 0; i < tutti.length; i += 50) {
    const blocco = tutti.slice(i, i + 50);
    const d = await wiki('en.wikipedia.org', `action=query&redirects=1&titles=${encodeURIComponent(blocco.map((x) => x.a).join('|'))}`, fetchImpl);
    const norm = Object.fromEntries((d.query.normalized || []).map((n) => [n.from, n.to]));
    const redir = Object.fromEntries((d.query.redirects || []).map((n) => [n.from, n.to]));
    const missing = new Set((d.query.pages || []).filter((p) => p.missing !== undefined || p.invalid !== undefined).map((p) => p.title));
    for (const x of blocco) {
      const t = norm[x.a] || x.a;
      if (missing.has(t)) mancanti.push(`${x.cat}: ${x.a}`);
      else if (redir[t]) reindirizzati.push(`${x.a} -> ${redir[t]}`);
    }
  }
  return { totale: tutti.length, mancanti, reindirizzati };
}
