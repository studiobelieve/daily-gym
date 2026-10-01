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
9. **Costi sotto controllo**: ogni chiamata viene registrata in `consumi`; c'è un limite di `LIMITE_AI_GIORNO` chiamate in 24 ore.
   L'audio TTS è messo in cache nel browser per frase.

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
