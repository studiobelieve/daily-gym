// Percorso di grammatica inglese per livello (ordine dei sillabi CEFR più usati).
// Ogni argomento: spiegazione (generata una volta e salvata) + esercizi nuovi ogni volta.
// Un argomento è "consolidato" quando fai almeno l'80% in due giorni diversi; quando l'80% degli
// argomenti del livello è consolidato, si passa al livello successivo.
// "focus": cosa curare per chi parla italiano (gli errori tipici), passato all'AI come appunto.

const a = (id, titolo, categoria, focus) => ({ id, titolo, categoria, focus });

export const LIVELLI_GRAMMATICA = ['A1', 'A2', 'B1', 'B2', 'C1'];

export const PROGRAMMA = {
  A1: [
    a('to-be', 'Il verbo "to be"', 'ausiliari (do/be/have)', 'am/is/are, forme contratte, domande e negazioni; "I have 30 years" è sbagliato: "I am 30".'),
    a('present-simple', 'Present simple', 'tempi verbali', 'abitudini e fatti; -s alla terza persona; do/does nelle domande e negazioni.'),
    a('articoli-base', 'Articoli a / an / the', 'articoli', 'a/an davanti a suono consonante/vocale; niente articolo con concetti generali ("Life is beautiful").'),
    a('plurali', 'I plurali', 'plurali', 'plurali regolari e irregolari (people, children, men); nomi sempre singolari (information, advice).'),
    a('possessivi', 'Possessivi e genitivo \'s', 'pronomi', 'my/your/his/her/its/our/their; "Marco\'s car" invece di "the car of Marco".'),
    a('there-is', 'There is / there are', 'ausiliari (do/be/have)', 'per dire che qualcosa esiste; non "it is" o "there has".'),
    a('can', 'Can / can\'t', 'verbi modali', 'abilità e permesso; niente "to" dopo can, niente -s.'),
    a('preposizioni-tempo', 'Preposizioni di tempo: in, on, at', 'preposizioni', 'at 5 o\'clock, on Monday, in July / in 2020; "at the weekend" vs "on the weekend".'),
    a('domande-wh', 'Domande con what, where, when, who, how', 'domande e negazioni', 'ordine: parola wh + ausiliare + soggetto + verbo.'),
    a('pronomi-oggetto', 'Pronomi soggetto e oggetto', 'pronomi', 'I/me, he/him, she/her…; il soggetto non si può omettere ("It is raining", non "Is raining").'),
  ],
  A2: [
    a('present-continuous', 'Present continuous vs present simple', 'tempi verbali', 'azione in corso adesso vs abitudine; verbi di stato (know, like, want) non vanno al continuous.'),
    a('past-simple', 'Past simple (regolari e irregolari)', 'verbi irregolari', 'passato concluso con un tempo definito; i 30 irregolari più comuni; did nelle domande con il verbo base.'),
    a('countable', 'Some, any, much, many, a lot of', 'plurali', 'numerabili e non numerabili; much/many nelle domande e negazioni, a lot of nelle affermative.'),
    a('comparativi', 'Comparativi e superlativi', 'ordine delle parole', '-er/-est vs more/most; than (non "of" o "that"); good/better/best, bad/worse/worst.'),
    a('futuro-going-to', 'Futuro: going to e will', 'tempi verbali', 'going to per piani e previsioni con prove; will per decisioni sul momento e promesse.'),
    a('avverbi-frequenza', 'Avverbi di frequenza', 'ordine delle parole', 'always/usually/often/never prima del verbo principale ma dopo "to be".'),
    a('have-to-must', 'Have to e must', 'verbi modali', 'obbligo; mustn\'t (divieto) vs don\'t have to (non serve).'),
    a('present-perfect-intro', 'Present perfect: ever, never, just, already, yet', 'tempi verbali', 'esperienze senza tempo definito; "I have been to London" vs "I went to London last year".'),
    a('preposizioni-luogo', 'Preposizioni di luogo e movimento', 'preposizioni', 'in/on/at per i luoghi; to/into/out of; "arrive in/at" (mai "arrive to").'),
    a('verbo-ing-to', 'Like, love, want, would like + -ing / to', 'tempi verbali', '"I like reading", "I want to go", "I\'d like to"; niente "I want that you…".'),
  ],
  B1: [
    a('pp-vs-past', 'Present perfect vs past simple', 'tempi verbali', 'l\'errore più comune per gli italiani: "Yesterday I have seen" è sbagliato; con un tempo finito si usa il past simple.'),
    a('for-since', 'Present perfect con for e since', 'tempi verbali', '"I have lived here for 5 years / since 2019"; non "I live here since…".'),
    a('past-continuous', 'Past continuous e past simple insieme', 'tempi verbali', 'azione in corso interrotta: "I was working when she called"; while/when.'),
    a('used-to', 'Used to e would per le abitudini passate', 'tempi verbali', 'abitudini finite; non confondere con "be used to + -ing" (essere abituato).'),
    a('primo-condizionale', 'Primo condizionale', 'condizionali', 'if + present, will + verbo; mai "will" nella frase con if; anche when/unless/as soon as.'),
    a('secondo-condizionale', 'Secondo condizionale', 'condizionali', 'ipotesi irreali: if + past, would + verbo; "If I were you"; niente "would" dopo if.'),
    a('consigli-obblighi', 'Should, must, have to, don\'t have to', 'verbi modali', 'consiglio vs obbligo vs mancanza di obbligo; "You should to go" è sbagliato.'),
    a('passivo-base', 'Il passivo (presente e passato)', 'tempi verbali', 'be + participio; by per chi fa l\'azione; quando usarlo (processi, email formali).'),
    a('relative', 'Frasi relative: who, which, that, where', 'pronomi', 'who per persone, which per cose, that per entrambi; "the client who called" non "the client which called".'),
    a('gerundio-infinito', 'Gerundio o infinito dopo i verbi', 'tempi verbali', 'enjoy/avoid/finish + -ing; decide/plan/hope + to; dopo le preposizioni sempre -ing ("before leaving").'),
    a('discorso-indiretto', 'Discorso indiretto (base)', 'tempi verbali', 'say vs tell; spostamento dei tempi ("She said she was tired"); tell someone, non "tell to someone".'),
    a('too-enough', 'Too, enough, so, such', 'ordine delle parole', '"too expensive", "old enough", "so good", "such a good idea"; posizione di enough.'),
  ],
  B2: [
    a('pp-continuous', 'Present perfect continuous', 'tempi verbali', 'durata fino ad ora: "I\'ve been working on this project for months"; differenza con il present perfect semplice.'),
    a('past-perfect', 'Past perfect', 'tempi verbali', 'il passato prima del passato: "When I arrived, the meeting had already started".'),
    a('terzo-condizionale', 'Terzo condizionale e condizionali misti', 'condizionali', 'rimpianti sul passato: if + had + participio, would have + participio; misti passato/presente.'),
    a('wish', 'Wish e if only', 'condizionali', 'wish + past (presente), wish + past perfect (passato), wish + would (lamentele).'),
    a('deduzione', 'Modali di deduzione: must, might, can\'t (have)', 'verbi modali', '"He must be tired", "She can\'t have forgotten"; mai "mustn\'t" per la deduzione negativa.'),
    a('passivo-avanzato', 'Passivo avanzato e have something done', 'tempi verbali', 'passivo con modali e tempi perfetti; "I had my car repaired"; "It is said that…".'),
    a('indiretto-avanzato', 'Discorso indiretto: domande e ordini', 'domande e negazioni', '"She asked me where I lived" (niente inversione); ask/tell someone to do; verbi come suggest, recommend.'),
    a('relative-non-def', 'Relative determinative e non determinative', 'pronomi', 'virgole e niente "that" nelle non determinative; whose, whom; preposizione a fine frase.'),
    a('futuro-avanzato', 'Future continuous e future perfect', 'tempi verbali', '"This time tomorrow I\'ll be flying", "By Friday I\'ll have finished".'),
    a('connettivi', 'Connettivi: although, despite, however, whereas', 'ordine delle parole', 'despite + nome/-ing (mai "despite of"), although + frase; however con la punteggiatura giusta.'),
    a('articoli-avanzati', 'Articoli: casi difficili', 'articoli', 'niente articolo con nomi generici plurali e astratti, sì con quelli specifici; istituzioni (go to school/the school).'),
  ],
  C1: [
    a('inversione', 'Inversione per enfasi', 'ordine delle parole', '"Never have I seen…", "Not only did she…", "Hardly had we…"; registro formale.'),
    a('cleft', 'Frasi scisse (cleft sentences)', 'ordine delle parole', '"What I need is…", "It was Marco who…"; per mettere in evidenza un\'informazione.'),
    a('condizionali-formali', 'Condizionali formali e alternativi', 'condizionali', '"Should you need…", "Were I to…", "Had I known…", provided/as long as/otherwise.'),
    a('participio', 'Frasi con il participio', 'tempi verbali', '"Having finished the report, she left", "Written in 1990, the book…"; soggetto implicito corretto.'),
    a('ipotesi-formali', 'It\'s time, I\'d rather, as if', 'tempi verbali', 'passato con valore di presente: "It\'s time we left", "I\'d rather you didn\'t", "as if he were…".'),
    a('enfasi', 'Enfasi: do/did, auxiliary e so/neither', 'ausiliari (do/be/have)', '"I do agree", "So do I / Neither have I", ellissi con gli ausiliari.'),
    a('nominalizzazione', 'Nominalizzazione e stile formale', 'registro (formale/informale)', 'da verbi a nomi ("decide" → "the decision to") per email e report professionali.'),
    a('hedging', 'Hedging: esprimersi con cautela', 'registro (formale/informale)', '"It seems that…", "This may suggest…", "tend to"; utile in riunioni e negoziazioni.'),
  ],
};

export const ARGOMENTI = Object.fromEntries(Object.entries(PROGRAMMA).flatMap(([livello, lista]) =>
  lista.map((x, i) => [x.id, { ...x, livello, ordine: i }])));

// Livello di partenza: il livello di grammatica intero più vicino a quello dell'app (A2+ → A2).
export function livelloGrammaticaDa(livelloApp) {
  const base = String(livelloApp || 'A2').replace('+', '');
  return LIVELLI_GRAMMATICA.includes(base) ? base : base === 'C2' ? 'C1' : 'A2';
}

export const SOGLIA_OK = 80;           // % per contare una sessione come riuscita
export const GIORNI_PER_CONSOLIDARE = 2; // sessioni riuscite in giorni diversi
export const QUOTA_LIVELLO = 0.8;     // quota di argomenti consolidati per salire

// Argomento successivo: il primo non consolidato del livello; ogni tanto un ripasso di uno consolidato da tempo.
export function prossimoArgomento(livello, stato, { oggi, sessioni = 0 } = {}) {
  const lista = PROGRAMMA[livello] || [];
  if (sessioni % 4 === 3) {
    const vecchio = Object.entries(stato)
      .filter(([id, s]) => s.consolidato && ARGOMENTI[id] && s.ultimo && oggi && (Date.parse(oggi) - Date.parse(s.ultimo)) / 864e5 >= 14)
      .sort((x, y) => String(x[1].ultimo).localeCompare(String(y[1].ultimo)))[0];
    if (vecchio) return { id: vecchio[0], ripasso: true };
  }
  const libero = lista.find((x) => !(stato[x.id] && stato[x.id].consolidato));
  return libero ? { id: libero.id, ripasso: false } : lista.length ? { id: lista[0].id, ripasso: true } : null;
}

export function quotaConsolidata(livello, stato) {
  const lista = PROGRAMMA[livello] || [];
  return lista.length ? lista.filter((x) => stato[x.id] && stato[x.id].consolidato).length / lista.length : 0;
}
