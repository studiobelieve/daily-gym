# Daily Gym — note per lo sviluppo

App personale (un solo utente, italiano) per allenare inglese, memoria e cultura generale.
Deploy su **Railway**: un servizio Node + un PostgreSQL. Ogni push su GitHub viene pubblicato da solo.

## Architettura (volutamente semplice)

```
server.js                 HTTP senza framework: file statici da public/ + rotte /api, healthcheck /salute
lib/api.js                TUTTE le rotte /api (tabella 'METODO /percorso' -> handler)
lib/db.js                 pool pg + schema creato all'avvio (migra(): solo istruzioni idempotenti)
lib/auth.js               password unica APP_PASSWORD -> cookie HMAC 180 giorni; freno ai tentativi
lib/ai.js                 Anthropic SDK: chiedi({sistema, messaggi, uso}) -> testo; registra i costi in `consumi`
lib/prompt.js             tutti i prompt (risposte nel formato a etichette [TAG])
lib/voce.js               ElevenLabs: speech-to-text (scribe) e text-to-speech, via fetch
lib/cultura.js            argomenti per categoria + estratto da Wikipedia (simple.wikipedia sotto B2)
lib/libri.js              percorsi dai libri (persuasione, negoziazione, corpo, comunicazione personale): appunti per lezione
lib/srs.js                ripetizione dilazionata (variante SM-2) + serie di giorni — PURO
lib/livello.js            livello adattivo — PURO
lib/statistiche.js        metriche per obiettivi, dati della pagina Progressi, riepilogo settimanale
public/js/shared/*.js     moduli PURI importati sia dal browser sia dal server (testo, obiettivi, piano, scenari, livello-test)
public/js/app.js          avvio, login, router a hash (#/oggi, #/sessione/corta, #/esercizio/<id>/<param>)
public/js/viste/*.js      schermate: export mostra(box, ctx)
public/js/esercizi/*.js   esercizi: export avvia(box, opz) -> Promise<risultato | null>
public/js/ui.js           h() per creare DOM, modale, toast, icone
test/logica.test.js       test della logica pura (npm test)
test/mock-rete.mjs        simula Anthropic/ElevenLabs/Wikipedia per prove locali senza chiavi
```

Niente bundler e niente framework frontend: i moduli ES vanno direttamente nel browser.
Le dipendenze npm sono solo `pg` e `@anthropic-ai/sdk`.

## Regole da non rompere

1. **Mai JSON dal modello.** Tutte le risposte AI usano etichette `[TAG] valore`, interpretate da
   `parseTag` (tollera markdown, CRLF e righe multiple). I campi composti usano `a => b || c` (vedi `campi`).
2. **Testo di sito/utente = DATO.** Wikipedia e i testi dell'utente entrano nei prompt dentro `<materiale>` /
   `<testo_utente>` con la regola `REGOLA_DATI`. Non toglierla.
3. **Mai innerHTML con dati.** `h()` crea sempre nodi di testo. L'opzione `html:` è solo per le icone SVG costanti in ui.js.
4. **Il "giorno" lo decide il client** (`oggiLocale()` → 'YYYY-MM-DD'), perché il server gira in UTC.
   Ogni rotta che scrive per data riceve `giorno`. Postgres restituisce i DATE come stringhe (type parser in db.js).
5. **Carta nuova = `intervallo = 0`.** Dopo qualsiasi ripasso l'intervallo è ≥ 1, anche dopo "Di nuovo".
   Non usare `ripetizioni = 0` per dire "nuova", perché una carta sbagliata ha ripetizioni 0 ma è già in ripasso.
6. **Punteggi 0-100** in `attivita.punteggio` per ogni esercizio, così grafici e livello sono confrontabili.
   La misura grezza (cifre, oggetti, n persone) va in `valore`.
7. **Schema solo additivo e idempotente** (`CREATE ... IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`):
   il database contiene i dati veri dell'utente.
8. **Modello AI**: predefinito `claude-opus-5-5` con `output_config.effort` e `fallbacks: 'default'`
   (beta `server-side-fallback-2026-07-01`). Haiku 4.5 non accetta né effort né fallbacks: in ai.js c'è un ramo apposta.
   Controllare sempre `stop_reason === 'refusal'`.
9. **Ogni testo inglese passa da `inglese()` / `ingleseParagrafi()`** (public/js/parola.js): rende ogni parola
   toccabile → traduzione nel contesto (`POST /api/traduci`), forma base, salvataggio come carta.
   Testi nuovi in inglese (domande, consegne, risposte AI) vanno resi così, non con `h()` semplice.
   Dentro un `<button>` il tocco serve a rispondere: le opzioni dei quiz diventano testo dopo la risposta.
10. **Livello delle pillole** = livello dell'utente + `cultura_offset` (impostazione, mezzi livelli da -3 a +3),
   spostato dal giudizio "troppo facile / giusto / troppo difficile". Le regole misurabili per livello
   (parole, lunghezza frasi, tempi, lessico) sono in `REGOLE_LETTURA` di lib/prompt.js.
11. **Agente vocale** (public/js/esercizi/agente.js + `POST /api/voce/agente` + lib/voce.js `agenteVocale`):
   l'agente ElevenLabs si crea una volta (id in impostazioni `agente_vocale`, ricreato se cambia `VERSIONE_AGENTE`
   o `ELEVENLABS_AGENT_LLM`); il prompt vero (livello, lacune, argomenti) arriva a ogni sessione come override.
   La libreria è in public/vendor/elevenlabs (client.js = @elevenlabs/client 1.26.0 IIFE, worklet self-hosted:
   così la CSP non deve permettere blob:). CSP: connect-src include api.elevenlabs.io (https e wss).
   Se la linea cade, il client si ricollega da solo passando gli ultimi turni (max 3 tentativi).
12. **Lacune** = tabella `errori` (categoria da `CATEGORIE_ERRORI`, `volte` sale con le ripetizioni e scende con
   gli esercizi; a 0 risolto). Writing e report dello speaking le scrivono da soli. Allenamento infinito:
   `prossimoEsercizio()` in shared/piano.js (puro, testato): posizioni dispari = cultura/richiamo, le altre
   a rotazione equa su `ROTAZIONE` (meno fatti prima, area diversa dalla precedente). Nelle lacune la categoria
   NON si mostra prima della risposta, e il prompt vieta istruzioni che rivelano la regola.
   Richiamo: colonne `richiamo_passo`/`richiamo_data` in pillole, intervalli `INTERVALLI_RICHIAMO` in api.js.
13. **Costi sotto controllo**: ogni chiamata viene registrata in `consumi`; c'è un limite di `LIMITE_AI_GIORNO` chiamate in 24 ore.
   L'audio TTS è messo in cache nel browser per frase.

14. **Le 4 aree di comunicazione NON usano Wikipedia.** Le lezioni vengono da `lib/libri.js` (appunti scritti a mano,
   mai testo copiato dai libri) e da `promptLezioneLibro`. Ogni libro ha `affidabilita` e `avvertenza`: ciò che la ricerca
   non conferma (power posing, PNL, "gesto = bugia", microespressioni come lie detector) deve essere detto nella lezione.
   La chiave dell'argomento è "Titolo libro — Lezione": non cambiarla, o le lezioni già fatte tornano come nuove.

## Provare in locale

```bash
# Postgres locale, poi:
DATABASE_URL=postgres://postgres@127.0.0.1:5432/gym APP_PASSWORD=prova SESSION_SECRET=x \
ANTHROPIC_API_KEY=test ELEVENLABS_API_KEY=test node --import ./test/mock-rete.mjs server.js
npm test
```

Prima di ogni push: `npm test` e `node --check` su ogni file .js.

## Idee non ancora fatte

- Ripasso offline con coda di sincronizzazione (oggi offline si apre l'app, ma serve rete per i dati).
- Punteggio di pronuncia (servirebbe un servizio dedicato: l'AI testuale vede solo la trascrizione).
- Conversazione vocale in tempo reale (oggi è "premi per parlare").
- Foto vere per l'allenamento nomi (oggi i volti sono disegnati).
- Notifica/promemoria giornaliero.

- **Focus** (`esercizi/focus.js`) ha sostituito l'allenamento nomi (rimosso su richiesta): respiro contato (più evidenze), SART, Stroop. Le attività vecchie di tipo `nomi` restano nel DB ma non si creano più.
- **Carte uniche**: indice `carte_uniche` su (tipo, chiave_carta(fronte)); `creaCarta` usa ON CONFLICT DO NOTHING e restituisce null se esiste già (POST /api/carte → 409, multi → `saltate`).
- **Grammatica** (`lib/grammatica.js`): PROGRAMMA per livello; lezione salvata in `grammatica_lezioni`, avanzamento in `grammatica`; consolidato = ≥80% in 2 giorni diversi; livello in impostazione `grammatica_livello`, sale con l'80% consolidato.
