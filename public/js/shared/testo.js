// Funzioni pure condivise tra browser e server (stesso file, importato da entrambi).
// Niente DOM, niente Node: solo stringhe in, dati out. Testate in test/testo.test.js.

export const LIVELLI = ['A1', 'A2', 'A2+', 'B1', 'B1+', 'B2', 'B2+', 'C1', 'C1+', 'C2'];

export function indiceLivello(l) {
  const i = LIVELLI.indexOf(String(l || '').toUpperCase().trim());
  return i < 0 ? 1 : i;
}

export function livelloDaIndice(i) {
  return LIVELLI[Math.max(0, Math.min(LIVELLI.length - 1, Math.round(i)))];
}

// Minuscole, senza accenti, senza punteggiatura, spazi singoli.
// Gli apostrofi interni (don't, it's) restano, così "dont" e "don't" contano diversi
// solo se l'utente sbaglia davvero.
export function normalizza(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[’‘`´]/g, "'")
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/(^|\s)'+|'+(\s|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parole(s) {
  const n = normalizza(s);
  return n ? n.split(' ') : [];
}

// Distanza di modifica (Damerau, variante "optimal string alignment"):
// inserire, togliere, cambiare una lettera o scambiarne due vicine costa 1.
// Così "Giuila" per "Giulia" è un refuso, non un errore di memoria.
export function levenshtein(a, b) {
  a = String(a); b = String(b);
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + costo);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

// 1 = identiche, 0 = completamente diverse.
export function somiglianza(a, b) {
  const x = normalizza(a), y = normalizza(b);
  if (!x && !y) return 1;
  return 1 - levenshtein(x, y) / Math.max(x.length, y.length);
}

// Confronto di una risposta breve (un nome, un oggetto): esatta, quasi (refuso), sbagliata.
export function confronta(atteso, scritto) {
  const s = somiglianza(atteso, scritto);
  if (s === 1) return 'esatta';
  const lung = normalizza(atteso).length;
  // Sui nomi corti un solo carattere sbagliato pesa molto: tolleranza di 1 lettera.
  if (levenshtein(normalizza(atteso), normalizza(scritto)) <= 1 && lung >= 4) return 'quasi';
  if (s >= 0.8) return 'quasi';
  return 'sbagliata';
}

// Dettato: allinea le parole attese a quelle scritte (sottosequenza comune più lunga)
// e restituisce, per ogni parola attesa, se è stata scritta giusta.
// Una parola con un refuso minimo (1 lettera su parole lunghe) conta mezzo punto.
export function confrontaFrase(atteso, scritto) {
  const A = parole(atteso), B = parole(scritto);
  const uguali = (x, y) => x === y || (x.length >= 5 && levenshtein(x, y) <= 1);
  const m = A.length, n = B.length;
  const L = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      L[i][j] = uguali(A[i], B[j]) ? 1 + L[i + 1][j + 1] : Math.max(L[i + 1][j], L[i][j + 1]);
    }
  }
  const dettaglio = [];
  let i = 0, j = 0, punti = 0;
  while (i < m) {
    if (j < n && uguali(A[i], B[j])) {
      const esatta = A[i] === B[j];
      dettaglio.push({ parola: A[i], esito: esatta ? 'ok' : 'quasi', scritta: B[j] });
      punti += esatta ? 1 : 0.5;
      i++; j++;
    } else if (j < n && L[i][j + 1] >= L[i + 1][j]) {
      j++; // parola in più scritta dall'utente
    } else {
      dettaglio.push({ parola: A[i], esito: 'manca', scritta: '' });
      i++;
    }
  }
  const extra = Math.max(0, n - dettaglio.filter((d) => d.esito !== 'manca').length);
  const totale = Math.max(1, m);
  // Le parole in più tolgono poco: chi scrive "the the" non deve perdere tutto.
  const punteggio = Math.max(0, Math.round(((punti - extra * 0.25) / totale) * 100));
  return { punteggio: Math.min(100, punteggio), dettaglio, extra };
}

// Parser del formato a etichette usato in tutte le risposte AI.
// Esempio:
//   [VOTO] 78
//   [ERRORE] I goed => I went || "go" è irregolare
//   [CORRETTO]
//   testo su più righe...
// Restituisce un array di { tag, valore } nell'ordine in cui compaiono.
// Tollera markdown (**[VOTO]**), spazi, due punti dopo l'etichetta, CRLF, righe vuote.
export function parseTag(testo) {
  const out = [];
  let cur = null;
  for (const grezza of String(testo || '').split(/\r?\n/)) {
    const riga = grezza.replace(/^\s*[*_#>-]*\s*/, '');
    const m = riga.match(/^\[([A-Za-zÀ-ú_ ]{2,20})\]\s*[*_]*\s*:?\s*(.*)$/);
    if (m) {
      cur = { tag: m[1].trim().toUpperCase().replace(/\s+/g, '_'), valore: m[2].replace(/[*_]+$/, '').trim() };
      out.push(cur);
    } else if (cur) {
      cur.valore += (cur.valore ? '\n' : '') + grezza.trimEnd();
    }
  }
  for (const t of out) t.valore = t.valore.replace(/\n+$/, '').trim();
  return out;
}

export function primo(tags, nome) {
  const t = tags.find((x) => x.tag === nome);
  return t ? t.valore : '';
}

export function tuttiTag(tags, nome) {
  return tags.filter((x) => x.tag === nome).map((x) => x.valore).filter(Boolean);
}

// Come tuttiTag, ma per le liste "una voce per riga": il modello a volte scrive più voci
// sotto una sola etichetta, una per riga, senza ripeterla. Una riga che contiene il separatore
// (es. "=>" o "||") apre una voce nuova; le altre righe continuano la voce precedente.
export function voci(tags, nome, separatore = '=>') {
  const out = [];
  for (const valore of tuttiTag(tags, nome)) {
    for (const riga of valore.split('\n')) {
      const r = riga.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '').trim();
      if (!r) continue;
      if (r.includes(separatore) || !out.length) out.push(r);
      else out[out.length - 1] += ' ' + r;
    }
  }
  return out;
}

// "a => b || c" -> ['a', 'b', 'c'] ; separatori tollerati: => -> → e || |
export function campi(valore) {
  const [testa, ...coda] = String(valore).split(/\s*\|\|?\s*/);
  const [a, b] = testa.split(/\s*(?:=>|->|→)\s*/);
  return [a || '', b || '', coda.join(' | ')].map((s) => s.trim());
}

export function numero(valore, min = 0, max = 100) {
  const m = String(valore || '').match(/-?\d+(?:[.,]\d+)?/);
  if (!m) return null;
  return Math.max(min, Math.min(max, Math.round(parseFloat(m[0].replace(',', '.')))));
}

// Data locale 'YYYY-MM-DD' (non UTC: alle 00:30 italiane è già "oggi").
export function oggiLocale(d = new Date()) {
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

export function aggiungiGiorni(giorno, n) {
  const d = new Date(giorno + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + Math.round(n));
  return d.toISOString().slice(0, 10);
}

export function giorniTra(da, a) {
  return Math.round((Date.parse(a + 'T00:00:00Z') - Date.parse(da + 'T00:00:00Z')) / 86400000);
}

// 0 = domenica ... 6 = sabato, calcolato sulla data (non sull'ora del dispositivo).
export function giornoSettimana(giorno) {
  return new Date(giorno + 'T12:00:00Z').getUTCDay();
}
