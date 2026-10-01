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

**Inglese**
- *Writing*: una consegna breve al tuo livello. L'AI corregge, spiega gli errori in italiano e mostra come lo direbbe un madrelingua.
- *Dettato*: frasi lette ad alta voce da scrivere, con la versione lenta.
- *Speaking*: conversazione a voce con un agente AI su 9 scenari (cliente, riunione, small talk, viaggio, opinioni, la pillola del giorno…). Si tiene premuto il microfono per parlare. Alla fine arriva un report con voto, errori e frasi utili.
- *Livello adattivo*: sale di mezzo livello quando la media degli esercizi resta sopra 85 per almeno una settimana, e scende se resta sotto 55.

**Memoria**
- *Ripetizione dilazionata*: le carte tornano appena prima che tu le dimentichi. Ci sono 4 tipi: parole inglesi, persone vere, cose da ricordare, nozioni di cultura.
- *Allenamento nomi*: volti disegnati con tratti distintivi, nome, lavoro e città. Usi il metodo dell'associazione, poi una pausa che distrae, poi il richiamo. Il numero di persone cresce quando vai bene.
- *Palazzo della memoria*: liste di oggetti da mettere nei luoghi di casa tua. Gli oggetti possono essere anche in inglese.
- *Digit span*: il termometro della memoria di lavoro.

**Cultura**: ogni pillola parte da una pagina vera di Wikipedia (la fonte è citata). L'AI la riscrive in inglese al tuo livello, poi fai un quiz di 3 domande. Le domande diventano carte di ripasso.

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
