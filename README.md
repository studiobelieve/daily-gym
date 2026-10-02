# Daily Gym

La tua palestra mentale: **inglese, memoria e cultura generale** in 10-20 minuti al giorno.
Si usa dal telefono e dal computer con gli stessi dati.

## Cosa c'è dentro

**Sessione del giorno** (corta 10' o completa 20'). Gli esercizi ruotano durante la settimana:

| Giorno | Corta | La completa aggiunge |
|---|---|---|
| Lun / Gio | Ripasso carte + Allenamento nomi | Speaking |
| Mar / Ven | Ripasso carte + Pillola di cultura | Writing |
| Mer / Sab | Ripasso carte + Palazzo della memoria | Speaking sulla pillola |
| Domenica | Ripasso carte + Digit span | Dettato + Riepilogo settimanale |

La prima sessione parte con un **test di livello** (8 minuti).

**Allenamento infinito ∞** (da Oggi o dalla Palestra): un esercizio dopo l'altro, finché non premi *Termina*. Ogni volta l'app sceglie il più utile:
1. prima le carte in scadenza;
2. poi le lacune di inglese;
3. poi gli esercizi dove vai peggio, o che non fai da più tempo;
4. infine il programma, cioè pillole, writing, dettato, speaking e memoria.

Tutto è collegato: gli errori dello speaking diventano lacune, le lacune diventano esercizi, i passi fatti nell'infinito contano anche per la sessione del giorno.

**Inglese**
- *Writing*: una consegna breve al tuo livello. L'AI corregge, spiega gli errori in italiano e mostra come lo direbbe un madrelingua.
- *Dettato*: frasi lette ad alta voce da scrivere, con la versione lenta.
- *Speaking con Emma*: un agente vocale vero (ElevenLabs Agents, in tempo reale), come una telefonata.
  - Non ci sono pulsanti da tenere premuti: lei capisce da sola quando hai finito, e puoi interromperla.
  - Fa l'insegnante: guida la conversazione, propone sempre nuovi argomenti, corregge subito gli errori importanti e ti fa ripetere.
  - Non finisce mai da sola. Quando premi *Termina* ricevi il report, e gli errori finiscono nelle tue **lacune**.
  - Ci sono anche giochi di ruolo (cliente, riunione, viaggio…).
  - Se l'agente non si collega, resta la modalità "premi per parlare".
- *Lacune*: ogni errore di writing e speaking viene salvato con il suo tipo (articoli, tempi verbali, preposizioni…). L'esercizio *Lavoro sulle lacune* crea frasi nuove proprio su quei tipi di errore. Ogni risposta giusta riduce la lacuna fino a superarla, e un errore ripetuto la fa ripartire.
- *Livello adattivo*: sale di mezzo livello quando la media degli esercizi resta sopra 85 per almeno una settimana, e scende se resta sotto 55.

**Memoria**
- *Ripetizione dilazionata*: le carte tornano appena prima che tu le dimentichi. Ci sono 4 tipi: parole inglesi, persone vere, cose da ricordare, nozioni di cultura.
- *Allenamento nomi*: volti disegnati con tratti distintivi, nome, lavoro e città. Usi il metodo dell'associazione, poi una pausa che distrae, poi il richiamo. Il numero di persone cresce quando vai bene.
- *Palazzo della memoria*: liste di oggetti da mettere nei luoghi di casa tua. Gli oggetti possono essere anche in inglese.
- *Digit span*: il termometro della memoria di lavoro.

**Tocca una parola**: in ogni testo inglese dell'app (pillole, domande, consegne, correzioni, dettato, risposte dell'agente, carte) tocchi una parola e vedi la traduzione nel contesto e la forma base. Puoi allargare la selezione a un'espressione e salvarla nelle carte con la frase di esempio. Nel modulo **+** c'è anche il pulsante *Traduci* per le parole che incontri fuori dall'app.

**Cultura**: ogni pillola parte da una pagina vera di Wikipedia (la fonte è citata). L'AI la riscrive in inglese al tuo livello, con regole precise per ogni livello: lunghezza delle frasi, tempi verbali, vocabolario. Poi fai un quiz di 3 domande. Dalla Palestra le pillole sono illimitate: a sorpresa, per tema o su un argomento che scrivi tu. Quando gli argomenti della lista finiscono, l'app continua con pagine Wikipedia collegate a quelle già lette. Alla fine dici se il testo era troppo facile, giusto o troppo difficile, e le pillole successive si spostano di mezzo livello. Le domande diventano carte di ripasso.

**Tracking**
- Calendario della costanza.
- Serie di giorni di fila e record.
- Andamento di ogni esercizio.
- Storico del livello.
- Percentuale di carte ricordate.
- Confronto con la settimana prima.
- Stima dei costi del mese.

**Obiettivi**
- Traguardi con scadenza, per esempio "30 giorni di fila", "ricordare 9 cifre" o "arrivare a B1".
- L'avanzamento si calcola da solo dai tuoi dati.
- Una tacca sulla barra indica dove dovresti essere oggi, e l'app ti dice il ritmo necessario per arrivare in tempo.
- Ci sono proposte già calibrate sui tuoi valori, oppure obiettivi personalizzati che aggiorni a mano.

## Metterla online su Railway (una volta sola)

> Le schermate di Railway cambiano spesso. Se un nome di menu è diverso da quello scritto qui, cerca la voce più simile.

1. **Codice su GitHub.** Il repository `daily-gym` deve esistere su GitHub e contenere questi file.
2. **Nuovo progetto.** Su [railway.com](https://railway.com) scegli *New Project* → *Deploy from GitHub repo* → `daily-gym`.
3. **Database.** Nello stesso progetto: *+ New* (o *Create*) → *Database* → *PostgreSQL*.
4. **Variabili.** Apri il servizio dell'app (non il database) → *Variables* e aggiungi:

   | Variabile | Valore |
   |---|---|
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}`: il riferimento al database del passo 3 (Railway lo propone anche come "reference variable") |
   | `APP_PASSWORD` | la password che userai per entrare |
   | `SESSION_SECRET` | una frase lunga e casuale (almeno 30 caratteri). Senza, a ogni riavvio devi rifare il login |
   | `ANTHROPIC_API_KEY` | la chiave da console.anthropic.com. Senza, writing, dettato, speaking e pillole sono spenti |
   | `ELEVENLABS_API_KEY` | la chiave ElevenLabs. Senza, l'app usa la voce e il riconoscimento del browser |

   Variabili facoltative:
   - `ELEVENLABS_VOICE_ID`: un'altra voce dalla tua libreria ElevenLabs.
   - `AI_MODEL`: il modello di partenza, che si cambia anche dalle Impostazioni.
   - `LIMITE_AI_GIORNO`: limite di sicurezza sulle chiamate AI in 24 ore. Il valore predefinito è 200.

5. **Indirizzo web.** Servizio dell'app → *Settings* → *Networking* → *Generate Domain*. Ottieni un indirizzo tipo `daily-gym-production.up.railway.app`.
6. **Sul telefono.** Apri l'indirizzo, inserisci la password e installa l'app:
   - iPhone (Safari): *Condividi* → *Aggiungi alla schermata Home*
   - Android (Chrome): menu → *Installa app*

Da quel momento ogni modifica al codice spinta su GitHub viene pubblicata da sola da Railway.

## Costi (stime, da verificare con l'uso reale)

- **Railway**: rientra nel tuo abbonamento. L'app è leggera: un piccolo server più un database piccolo.
- **Anthropic**: dipende dal modello, che si sceglie in Impostazioni.
  - Con *Claude Opus 5.5* (predefinito, qualità massima) una sessione completa costa indicativamente qualche decina di centesimi di dollaro. Lo speaking è la parte più costosa, perché ogni battuta è una chiamata.
  - Con *Claude Haiku 4.5* si spende circa un quarto.
  - Il costo vero del mese lo vedi in **Progressi → Costi**: è calcolato dai token effettivamente usati.
- **ElevenLabs**: si paga a crediti secondo il tuo piano. In Progressi vedi i caratteri di voce usati nel mese, da confrontare con quelli inclusi nel tuo piano. Non conosco i limiti esatti del tuo piano: controllali sul tuo account.

## Backup

Impostazioni → **Scarica backup (JSON)**: contiene tutte le carte, gli esercizi, gli obiettivi e le pillole.
Conviene farlo una volta al mese.

## Per sviluppatori

```bash
npm install
DATABASE_URL=postgres://... APP_PASSWORD=prova npm start   # http://localhost:3000
npm test                                                   # test della logica
```

Per provare tutto **senza chiavi vere** e senza rete (Anthropic, ElevenLabs e Wikipedia simulati):

```bash
DATABASE_URL=postgres://... APP_PASSWORD=prova ANTHROPIC_API_KEY=test ELEVENLABS_API_KEY=test \
  node --import ./test/mock-rete.mjs server.js
```

Le note tecniche sono in `CLAUDE.md`.
