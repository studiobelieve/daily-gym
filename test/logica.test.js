// Test della logica pura. Eseguili con: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pianifica, serie } from '../lib/srs.js';
import { valutaLivello, livelloDaTest } from '../lib/livello.js';
import { serieRecord } from '../lib/statistiche.js';
import {
  normalizza, confronta, confrontaFrase, parseTag, primo, tuttiTag, voci, campi, numero, aggiungiGiorni, giornoSettimana,
} from '../public/js/shared/testo.js';
import { avanzamento, suggerimenti, formatta } from '../public/js/shared/obiettivi.js';
import { pianoDelGiorno, prossimoEsercizio } from '../public/js/shared/piano.js';
import { prossimoArgomento, CATEGORIE, cercaArgomento } from '../lib/cultura.js';

const OGGI = '2026-10-01'; // giovedì

test('SRS: una carta nuova ricordata torna domani, poi a intervalli crescenti', () => {
  let c = { intervallo: 0, facilita: 2.5, ripetizioni: 0, errori: 0 };
  c = pianifica(c, 4, OGGI);
  assert.equal(c.intervallo, 1);
  assert.equal(c.scadenza, '2026-10-02');
  c = pianifica(c, 4, c.scadenza);
  assert.equal(c.intervallo, 4);
  const prima = c.intervallo;
  c = pianifica(c, 4, c.scadenza);
  assert.ok(c.intervallo > prima * 2, 'il terzo intervallo deve crescere');
});

test('SRS: "di nuovo" azzera le ripetizioni, conta l\'errore e abbassa la facilità', () => {
  const c = pianifica({ intervallo: 20, facilita: 2.5, ripetizioni: 5, errori: 0 }, 0, OGGI);
  assert.equal(c.ripetizioni, 0);
  assert.equal(c.errori, 1);
  assert.equal(c.intervallo, 1);
  assert.ok(c.facilita < 2.5);
  assert.ok(c.intervallo > 0, 'deve restare nel ripasso (intervallo > 0), non tornare "nuova"');
});

test('SRS: facilità mai sotto 1.3, intervallo mai oltre un anno', () => {
  let c = { intervallo: 300, facilita: 1.3, ripetizioni: 10, errori: 0 };
  c = pianifica(c, 5, OGGI);
  assert.ok(c.intervallo <= 365);
  for (let i = 0; i < 10; i++) c = pianifica(c, 0, OGGI);
  assert.equal(c.facilita, 1.3);
  assert.throws(() => pianifica(c, 2, OGGI));
});

test('Serie: conta i giorni consecutivi fino a oggi o ieri', () => {
  assert.equal(serie(['2026-09-29', '2026-09-30', '2026-10-01'], OGGI), 3);
  assert.equal(serie(['2026-09-29', '2026-09-30'], OGGI), 2, 'ieri tiene viva la serie');
  assert.equal(serie(['2026-09-28', '2026-09-29'], OGGI), 0);
  assert.equal(serieRecord(['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-10']), 3);
});

test('Confronto risposte: accenti, maiuscole e refusi minimi', () => {
  assert.equal(normalizza('  Caffè, Rossi! '), 'caffe rossi');
  assert.equal(confronta('Giulia', 'giulia'), 'esatta');
  assert.equal(confronta('Giulia', 'Giuila'), 'quasi');
  assert.equal(confronta('Giulia', 'Marta'), 'sbagliata');
  assert.equal(confronta('Ugo', 'Ugi'), 'sbagliata', 'sui nomi cortissimi niente tolleranza');
});

test('Dettato: parole mancanti, refusi e parole in più', () => {
  const r = confrontaFrase('I usually take the train to work', 'I usualy take train to work');
  assert.equal(r.dettaglio.find((d) => d.parola === 'the').esito, 'manca');
  assert.equal(r.dettaglio.find((d) => d.parola === 'usually').esito, 'quasi');
  assert.ok(r.punteggio > 60 && r.punteggio < 90);
  assert.equal(confrontaFrase('Hello world', 'hello, WORLD!').punteggio, 100);
  assert.equal(confrontaFrase('Hello world', '').punteggio, 0);
});

test('Parser a etichette: tollera markdown, due punti, righe multiple e CRLF', () => {
  const t = '**[VOTO]** 78\r\n[CORRETTO]\r\nriga uno\r\nriga due\r\n\r\n[ERRORE]: I goed => I went || irregolare\r\n[ERRORE] a => b';
  const tags = parseTag(t);
  assert.equal(numero(primo(tags, 'VOTO')), 78);
  assert.equal(primo(tags, 'CORRETTO'), 'riga uno\nriga due');
  assert.deepEqual(campi(tuttiTag(tags, 'ERRORE')[0]), ['I goed', 'I went', 'irregolare']);
  assert.deepEqual(campi('a -> b'), ['a', 'b', '']);
  assert.deepEqual(campi('english sentence || traduzione'), ['english sentence', '', 'traduzione']);
  assert.equal(numero('voto: 105'), 100);
});

test('Livello: sale con media alta, scende con media bassa, aspetta abbastanza dati', () => {
  const att = (p, n = 8) => Array.from({ length: n }, (_, i) => ({ tipo: 'writing', giorno: aggiungiGiorni(OGGI, -i), punteggio: p }));
  assert.equal(valutaLivello({ livello: 'A2', ultimoCambio: null, attivita: att(90), oggi: OGGI }).cambio.nuovo, 'A2+');
  assert.equal(valutaLivello({ livello: 'B1', ultimoCambio: null, attivita: att(40), oggi: OGGI }).cambio.nuovo, 'A2+');
  assert.equal(valutaLivello({ livello: 'A2', ultimoCambio: null, attivita: att(95, 5), oggi: OGGI }).cambio, null, 'pochi esercizi');
  assert.equal(valutaLivello({ livello: 'A2', ultimoCambio: aggiungiGiorni(OGGI, -3), attivita: att(95), oggi: OGGI }).cambio, null, 'cambio troppo recente');
  const misti = att(95).map((a, i) => ({ ...a, tipo: i % 2 ? 'span' : 'writing' }));
  assert.equal(valutaLivello({ livello: 'A2', ultimoCambio: null, attivita: misti, oggi: OGGI }).esercizi, 4, 'solo esercizi di inglese');
});

test('Test di livello: stima con il "+"', () => {
  const r = (a) => Object.fromEntries(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((l, i) => [l, { giuste: a[i] ?? 0, totali: 5 }]));
  assert.equal(livelloDaTest(r([5, 4, 1])), 'A2');
  assert.equal(livelloDaTest(r([5, 4, 2])), 'A2+');
  assert.equal(livelloDaTest(r([5, 5, 4, 3, 1])), 'B2');
  assert.equal(livelloDaTest(r([2])), 'A1');
});

test('Obiettivi: percentuale, ritmo atteso e stati', () => {
  const o = { target: 10, iniziale: 0, inizio: '2026-09-01', scadenza: '2026-10-31' };
  const a = avanzamento(o, 5, OGGI); // metà strada a metà tempo
  assert.equal(a.pct, 50);
  assert.equal(a.stato, 'in_linea');
  assert.equal(avanzamento(o, 1, OGGI).stato, 'in_ritardo');
  assert.equal(avanzamento(o, 10, OGGI).stato, 'raggiunto');
  assert.equal(avanzamento(o, 3, '2026-11-02').stato, 'scaduto');
  assert.ok(avanzamento(o, 5, OGGI).alGiorno > 0);
  assert.equal(formatta('livello_inglese', 3), 'B1');
  const s = suggerimenti({ span_record: 6, livello_inglese: 1 }, OGGI, aggiungiGiorni);
  assert.ok(s.every((x) => x.target > x.iniziale), 'ogni proposta deve essere sopra il valore attuale');
});

test('Piano del giorno: rotazione settimanale, test iniziale, senza AI', () => {
  const ids = (g, t, o) => pianoDelGiorno(g, t, o).map((p) => p.id);
  assert.deepEqual(ids(OGGI, 'corta'), ['ripasso', 'nomi']); // giovedì
  assert.deepEqual(ids(OGGI, 'completa'), ['ripasso', 'nomi', 'speaking']);
  assert.deepEqual(ids('2026-10-02', 'completa'), ['ripasso', 'cultura', 'writing']); // venerdì
  assert.deepEqual(ids('2026-10-04', 'completa'), ['ripasso', 'span', 'dettato', 'riepilogo']); // domenica
  assert.equal(pianoDelGiorno('2026-10-03', 'completa')[2].scenario, 'pillola'); // sabato
  assert.equal(ids(OGGI, 'corta', { testFatto: false })[0], 'test');
  assert.ok(!ids('2026-10-02', 'completa', { ai: false }).some((id) => ['cultura', 'writing'].includes(id)));
  assert.equal(giornoSettimana('2026-10-04'), 0);
});

test('Cultura: rotazione delle categorie senza ripetere argomenti', () => {
  const usati = [];
  const viste = new Set();
  for (let i = 0; i < 14; i++) {
    const p = prossimoArgomento(usati, i);
    assert.ok(!usati.includes(p.argomento));
    usati.push(p.argomento);
    viste.add(p.categoria);
  }
  assert.equal(viste.size, Object.keys(CATEGORIE).length);
});

test('Liste: più voci sotto una sola etichetta, una per riga (risposta reale di Claude)', () => {
  const t = `[VOTO] 60
[ERRORE] I write for confirm => I am writing to confirm || Per lo scopo si usa "to" + verbo.
Nelle email si dice "I am writing".
I am agree => I agree | "Agree" è già un verbo
- the next Tuesday => next Tuesday || niente articolo
[BRAVO] ok`;
  const e = voci(parseTag(t), 'ERRORE');
  assert.equal(e.length, 3);
  assert.deepEqual(campi(e[0]), ['I write for confirm', 'I am writing to confirm', 'Per lo scopo si usa "to" + verbo. Nelle email si dice "I am writing".']);
  assert.deepEqual(campi(e[1]).slice(0, 2), ['I am agree', 'I agree']);
  assert.deepEqual(campi(e[2]).slice(0, 2), ['the next Tuesday', 'next Tuesday']);
  const d = voci(parseTag('[FRASE] One two three || Uno due tre\nFour five six || Quattro'), 'FRASE', '||');
  assert.equal(d.length, 2);
});

test('Allenamento infinito: ripasso e lacune prima, poi punti deboli, senza ripetere di fila', () => {
  let i = 0;
  const seq = [0.01, 0.5, 0.99, 0.3, 0.7, 0.1, 0.9, 0.45];
  const rng = () => seq[i++ % seq.length];
  const stato = { ai: true, daRipassare: 30, lacune: 9, difficili: 3, medie: { nomi: { media: 30, ultimo: '2026-10-01' }, span: { media: 90, ultimo: '2026-10-02' } } };
  assert.equal(prossimoEsercizio(stato, [], () => 0, '2026-10-02').id, 'ripasso');
  assert.equal(prossimoEsercizio(stato, [], () => 0, '2026-10-02').limite, 15);
  assert.equal(prossimoEsercizio(stato, ['ripasso'], () => 0.99, '2026-10-02').id, 'lacune', 'dopo il ripasso, le lacune');
  const fatti = [];
  for (let k = 0; k < 40; k++) fatti.push(prossimoEsercizio(stato, fatti, rng, '2026-10-02').id);
  for (let k = 1; k < fatti.length; k++) assert.notEqual(fatti[k], fatti[k - 1], 'mai lo stesso esercizio due volte di fila');
  // senza AI niente esercizi AI
  const senza = Array.from({ length: 30 }, () => prossimoEsercizio({ ...stato, ai: false }, [], Math.random).id);
  assert.ok(!senza.some((id) => ['cultura', 'writing', 'dettato', 'speaking', 'lacune'].includes(id)));
  // punto debole (nomi 30%) esce più spesso di uno forte (span 90%)
  const conta = { nomi: 0, span: 0 };
  for (let k = 0; k < 3000; k++) { const id = prossimoEsercizio({ ai: true, daRipassare: 0, lacune: 0, difficili: 0, medie: stato.medie }, [], Math.random, '2026-10-02').id; if (id in conta) conta[id]++; }
  assert.ok(conta.nomi > conta.span * 1.5, JSON.stringify(conta));
});

test('Sessione completa: le lacune entrano solo se ce ne sono abbastanza', () => {
  const ids = (o) => pianoDelGiorno('2026-10-02', 'completa', o).map((p) => p.id);
  assert.ok(ids({ lacune: 5 }).includes('lacune'));
  assert.ok(!ids({ lacune: 1 }).includes('lacune'));
  assert.ok(!pianoDelGiorno('2026-10-02', 'corta', { lacune: 9 }).some((p) => p.id === 'lacune'));
});

test('Errori con categoria', async () => {
  const { campiErrore } = await import('../public/js/shared/testo.js');
  const e = campiErrore('I am agree => I agree || "agree" è un verbo || ausiliari (do/be/have)');
  assert.deepEqual([e.sbagliato, e.giusto, e.perche, e.categoria], ['I am agree', 'I agree', '"agree" è un verbo', 'ausiliari (do/be/have)']);
  assert.equal(campiErrore('a => b || perché').categoria, 'altro');
});

test('Cultura: argomento libero, niente risultati a caso', async () => {
  const finto = (risposte) => async (url) => {
    const r = risposte.find(([chiave]) => url.includes(chiave));
    return new Response(JSON.stringify(r ? r[1] : { query: { pages: [{ title: 'x', missing: true }] } }), { status: 200 });
  };
  // titolo esatto esistente su en.wikipedia
  assert.equal(await cercaArgomento('Power posing', 'B1', finto([['en.wikipedia.org/w/api.php?format=json&formatversion=2&action=query&redirects=1&titles=Power', { query: { pages: [{ title: 'Power posing' }] } }]])), 'Power posing');
  // nessun titolo esatto: la ricerca restituisce "Nuclear power" (non pertinente) e poi quello giusto
  const r = await cercaArgomento('power posing', 'B1', finto([['list=search', { query: { search: [{ title: 'Nuclear power' }, { title: 'Power posing' }] } }]]));
  assert.equal(r, 'Power posing');
  assert.equal(await cercaArgomento('power posing', 'B1', finto([['list=search', { query: { search: [{ title: 'Nuclear power' }] } }]])), null);
  assert.equal(await cercaArgomento('caffè', 'B1', finto([['list=search', { query: { search: [{ title: 'Caffè latte' }] } }]])), 'Caffè latte');
});
