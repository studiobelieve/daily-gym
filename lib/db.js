import pg from 'pg';

// I giorni restano stringhe 'YYYY-MM-DD': il "giorno" lo decide il telefono/PC dell'utente,
// non il fuso orario del server (Railway gira in UTC).
pg.types.setTypeParser(1082, (v) => v);
// REAL / NUMERIC tornano come numeri, non stringhe.
pg.types.setTypeParser(700, (v) => parseFloat(v));
pg.types.setTypeParser(1700, (v) => parseFloat(v));
pg.types.setTypeParser(20, (v) => parseInt(v, 10));

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === '1' ? { rejectUnauthorized: false } : undefined,
  max: 5,
});

export const q = (text, params) => pool.query(text, params);
export const uno = async (text, params) => (await pool.query(text, params)).rows[0] || null;
export const tutti = async (text, params) => (await pool.query(text, params)).rows;

// Schema creato all'avvio: niente tool di migrazione, l'app è di una persona sola.
// Ogni modifica futura va scritta in modo idempotente (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
export async function migra() {
  await q(`
    CREATE TABLE IF NOT EXISTS carte (
      id          SERIAL PRIMARY KEY,
      tipo        TEXT NOT NULL CHECK (tipo IN ('en','persona','ricorda','cultura')),
      fronte      TEXT NOT NULL,
      retro       TEXT NOT NULL DEFAULT '',
      nota        TEXT NOT NULL DEFAULT '',
      extra       JSONB NOT NULL DEFAULT '{}',
      scadenza    DATE NOT NULL,
      intervallo  REAL NOT NULL DEFAULT 0,
      facilita    REAL NOT NULL DEFAULT 2.5,
      ripetizioni INT  NOT NULL DEFAULT 0,
      errori      INT  NOT NULL DEFAULT 0,
      creata      TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS carte_scadenza ON carte (scadenza);
    ALTER TABLE carte ADD COLUMN IF NOT EXISTS giorno_creazione DATE;

    CREATE TABLE IF NOT EXISTS ripassi (
      id      SERIAL PRIMARY KEY,
      carta   INT REFERENCES carte(id) ON DELETE SET NULL,
      tipo    TEXT NOT NULL,
      voto    INT  NOT NULL,
      giorno  DATE NOT NULL,
      quando  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS ripassi_giorno ON ripassi (giorno);

    -- Ogni esercizio svolto: span, palazzo, nomi, writing, dettato, speaking, cultura, test.
    -- punteggio è sempre 0-100 così i grafici sono confrontabili.
    CREATE TABLE IF NOT EXISTS attivita (
      id        SERIAL PRIMARY KEY,
      tipo      TEXT NOT NULL,
      giorno    DATE NOT NULL,
      punteggio REAL NOT NULL DEFAULT 0,
      valore    REAL,                       -- misura "grezza": cifre ricordate, oggetti, minuti...
      durata    INT  NOT NULL DEFAULT 0,    -- secondi
      dettagli  JSONB NOT NULL DEFAULT '{}',
      quando    TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS attivita_tipo_giorno ON attivita (tipo, giorno);

    CREATE TABLE IF NOT EXISTS sessioni (
      giorno DATE PRIMARY KEY,
      tipo   TEXT NOT NULL DEFAULT 'corta',
      durata INT  NOT NULL DEFAULT 0,
      quando TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS impostazioni (
      chiave TEXT PRIMARY KEY,
      valore JSONB NOT NULL
    );

    CREATE TABLE IF NOT EXISTS livelli (
      id      SERIAL PRIMARY KEY,
      giorno  DATE NOT NULL,
      livello TEXT NOT NULL,
      motivo  TEXT NOT NULL DEFAULT '',
      quando  TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS obiettivi (
      id        SERIAL PRIMARY KEY,
      metrica   TEXT NOT NULL,
      titolo    TEXT NOT NULL,
      target    REAL NOT NULL,
      iniziale  REAL NOT NULL DEFAULT 0,
      manuale   REAL NOT NULL DEFAULT 0,
      inizio    DATE NOT NULL,
      scadenza  DATE NOT NULL,
      raggiunto DATE,
      archiviato BOOLEAN NOT NULL DEFAULT false,
      creato    TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS pillole (
      id        SERIAL PRIMARY KEY,
      giorno    DATE NOT NULL,
      categoria TEXT NOT NULL,
      argomento TEXT NOT NULL,
      titolo    TEXT NOT NULL,
      fonte_url TEXT NOT NULL DEFAULT '',
      livello   TEXT NOT NULL,
      testo     TEXT NOT NULL,
      glossario JSONB NOT NULL DEFAULT '[]',
      domande   JSONB NOT NULL DEFAULT '[]',
      completata BOOLEAN NOT NULL DEFAULT false,
      creata    TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS pillole_giorno ON pillole (giorno);
    -- Giudizio dell'utente sul testo: -1 troppo facile, 0 giusto, 1 troppo difficile.
    ALTER TABLE pillole ADD COLUMN IF NOT EXISTS difficolta INT;

    CREATE TABLE IF NOT EXISTS percorsi (
      id     SERIAL PRIMARY KEY,
      nome   TEXT NOT NULL,
      luoghi JSONB NOT NULL DEFAULT '[]',
      creato TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- Stima dei costi API, per tenere d'occhio la spesa mensile.
    CREATE TABLE IF NOT EXISTS consumi (
      id        SERIAL PRIMARY KEY,
      servizio  TEXT NOT NULL,         -- 'claude' | 'elevenlabs-tts' | 'elevenlabs-stt'
      uso       TEXT NOT NULL DEFAULT '',
      unita     REAL NOT NULL DEFAULT 0,
      costo     REAL NOT NULL DEFAULT 0, -- dollari stimati
      quando    TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

export async function leggiImpostazione(chiave, predefinito = null) {
  const r = await uno('SELECT valore FROM impostazioni WHERE chiave = $1', [chiave]);
  return r ? r.valore : predefinito;
}

export async function scriviImpostazione(chiave, valore) {
  await q(
    `INSERT INTO impostazioni (chiave, valore) VALUES ($1, $2)
     ON CONFLICT (chiave) DO UPDATE SET valore = EXCLUDED.valore`,
    [chiave, JSON.stringify(valore)]
  );
}
