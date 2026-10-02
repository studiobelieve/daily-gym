// SOLO PER I TEST: sostituisce fetch per simulare Anthropic, ElevenLabs e Wikipedia senza rete.
// Uso: node --import ./test/mock-rete.mjs server.js
const veroFetch = globalThis.fetch;

const RISPOSTE = [
  ['create short daily writing exercises', () => `[TITOLO] Una mail al cliente
[CONSEGNA] Write a short email to a client to confirm a meeting next Tuesday.
[AIUTO] Usa il futuro con "will" e una formula di chiusura cortese.
[PAROLA] to confirm => confermare
[PAROLA] meeting => riunione
[PAROLA] looking forward => non vedo l'ora`],
  ['correcting short texts', () => `**[VOTO]** 72
[CORRETTO]
Hi Mark, I am writing to confirm our meeting next Tuesday. See you soon.
[ERRORE] I write for confirm => I am writing to confirm || Si usa il present continuous e "to" + verbo per lo scopo || tempi verbali
[ERRORE] the next Tuesday => next Tuesday || Con "next" non si mette l'articolo || articoli
[BRAVO] Il tono è cortese e chiaro.
[CONSIGLIO] Ripassa "to" + infinito per esprimere lo scopo.
[VERSIONE_NATURALE] Hi Mark, just confirming our meeting next Tuesday. Looking forward to it!`],
  ['dictation sentences', () => `[FRASE] I usually take the train to work in the morning. || Di solito prendo il treno per andare al lavoro la mattina.
[FRASE] Our client wants a new campaign before Christmas. || Il nostro cliente vuole una nuova campagna prima di Natale.
[FRASE] The weather in Naples was beautiful yesterday. || Il tempo a Napoli ieri era bellissimo.
[FRASE] Could you send me the report by Friday? || Potresti mandarmi il report entro venerdì?
[FRASE] She has never been to London before. || Non è mai stata a Londra prima.`],
  ['memory-check questions', (corpo) => {
    const ids = [...JSON.stringify(corpo.messages).matchAll(/pillola id=\\"(\d+)\\"/g)].map((m) => m[1]);
    return ids.flatMap((id) => [
      `[DOMANDA] ${id} || Who was the first Roman emperor? || Augustus || Nero || Caligula`,
      `[DOMANDA] ${id} || What did the Romans build? || Roads and bridges || Pyramids || Skyscrapers`,
    ]).join('\n');
  }],
  ['teaches communication skills', () => `[TITOLO] Repeat Their Last Words
[TESTO]
Imagine a client says: "The price is too high for us." You answer only: "Too high?" Then you wait.

This is mirroring. You repeat the last words, and the other person explains more. People feel heard, and you learn what they really think.

At work this week, try it in a meeting. Say: "Too high?" and stay quiet for a few seconds.

Does it still hold up? It is a simple, low-risk way to build rapport, but use it naturally, not all the time.
[PAROLA] to repeat => ripetere
[PAROLA] to wait => aspettare
[PAROLA] to explain => spiegare
[PAROLA] meeting => riunione
[DOMANDA] What do you repeat when you mirror? || The last words || The first sentence || Their name
[DOMANDA] What do you do after mirroring? || Stay quiet || Ask why || Change topic
[DOMANDA] Why does mirroring work? || People feel heard || People feel afraid || People get bored
[DA_RICORDARE] Ripeti le ultime 1-3 parole dell'altro e resta in silenzio: ti spiegherà di più.`],
  ['encyclopedia material', () => `[TITOLO] The Empire That Built Roads
[TESTO]
Did you know that many roads in Europe still follow Roman paths? The Roman Empire was one of the biggest empires in history.

It started in 27 BC, when Augustus became the first emperor. At its largest, it covered land from Britain to Egypt.

The Romans built roads, bridges and aqueducts. Many of them still exist today, and you can visit them in Italy and in other countries.
[PAROLA] empire => impero
[PAROLA] emperor => imperatore
[PAROLA] bridge => ponte
[PAROLA] still => ancora
[PAROLA] to cover => coprire
[DOMANDA] Who was the first Roman emperor? || Augustus || Julius Caesar || Nero
[DOMANDA] When did the Roman Empire start? || 27 BC || 476 AD || 100 BC
[DOMANDA] What did the Romans build? || Roads and aqueducts || Pyramids || Castles
[DA_RICORDARE] L'Impero romano iniziò nel 27 a.C. con Augusto, il primo imperatore.`],
  ['targeted drills', () => `[ITEM] articoli || completa || Completa con l'articolo giusto || I work in ___ agency in Naples. || an || "agency" inizia con vocale: an
[ITEM] articoli || correggi || Correggi la parte sbagliata || See you the next Monday. || next Monday || con "next" niente articolo
[ITEM] tempi verbali || traduci || Traduci in inglese || Ti scrivo per confermare || I am writing to confirm | I'm writing to confirm || present continuous + to
[ITEM] ausiliari (do/be/have) || correggi || Correggi la parte sbagliata || I am agree with you. || I agree || agree è un verbo`],
  ['concise English-Italian dictionary', (corpo) => {
    const t = (corpo.messages[0].content.match(/<testo_utente>([^<]*)</) || [])[1] || '';
    const diz = { built: ['costruirono', 'to build'], roads: ['strade', 'road'], 'built roads': ['costruirono strade', ''], empire: ['impero', ''] };
    const [it, base] = diz[t.toLowerCase()] || ['(traduzione di ' + t + ')', ''];
    return `[TRADUZIONE] ${it}\n[BASE] ${base}\n[NOTA] ${t.toLowerCase() === 'built' ? 'Passato irregolare di "build".' : ''}`;
  }],
  ['conversation partner', (corpo) => {
    const n = corpo.messages.length;
    return ['That sounds great! And what do you do exactly at the agency?', 'Interesting. What is the most difficult part of your job?', 'I see. How do you usually solve that problem?'][n % 3];
  }],
  ['reviewing a spoken conversation', () => `[VOTO] 68
[BRAVO] Hai risposto sempre e con frasi complete.
[ERRORE] I work in agency => I work in an agency || Serve l'articolo "an" davanti a sostantivi singolari || articoli
[ERRORE] I am agree => I agree || "Agree" è un verbo: niente "am" || ausiliari (do/be/have)
[FRASE] I'm in charge of => sono responsabile di
[FRASE] It depends on => dipende da
[FRASE] To be honest => a dire il vero
[CONSIGLIO] Fai attenzione agli articoli a/an.`],
];

function rispostaClaude(corpo) {
  const sistema = typeof corpo.system === 'string' ? corpo.system : JSON.stringify(corpo.system);
  const voce = RISPOSTE.find(([k]) => sistema.includes(k));
  const testo = voce ? voce[1](corpo) : '[NOTA] risposta generica';
  return {
    id: 'msg_test', type: 'message', role: 'assistant', model: corpo.model,
    content: [{ type: 'text', text: testo }], stop_reason: 'end_turn', stop_sequence: null,
    usage: { input_tokens: 1200, output_tokens: 350 },
  };
}

const WIKI = `The Roman Empire was the period of ancient Roman civilization characterized by an autocratic form of government. It started in 27 BC when Augustus became the first emperor. At its height it controlled land from Britain to Egypt. The Romans built roads, bridges, aqueducts and cities. Latin, the language of the Romans, is the ancestor of Italian, Spanish, French and other languages. The Western Roman Empire ended in 476 AD. The Eastern Roman Empire, also called the Byzantine Empire, lasted until 1453. Roman law influenced many legal systems in the modern world. Many Roman roads are still used today, and Roman monuments can be seen in many countries.`.repeat(2);

globalThis.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : input.url;
  if (url.includes('api.anthropic.com')) {
    const corpo = JSON.parse(typeof init.body === 'string' ? init.body : await new Response(init.body).text());
    if (process.env.MOCK_RITARDO) await new Promise((r) => setTimeout(r, Number(process.env.MOCK_RITARDO)));
    return new Response(JSON.stringify(rispostaClaude(corpo)), { status: 200, headers: { 'content-type': 'application/json', 'request-id': 'req_test' } });
  }
  if (url.includes('wikipedia.org') && url.includes('list=search')) {
    const q = decodeURIComponent(url.split('srsearch=')[1] || '');
    const titolo = /zzz/.test(q) ? null : q.charAt(0).toUpperCase() + q.slice(1);
    return new Response(JSON.stringify({ query: { search: titolo ? [{ title: titolo }] : [] } }), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  if (url.includes('wikipedia.org') && url.includes('prop=links')) {
    return new Response(JSON.stringify({ query: { pages: [{ links: [{ title: 'Aqueduct' }, { title: 'Latin' }, { title: 'List of Roman emperors' }, { title: '1453' }] }] } }), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  if (url.includes('wikipedia.org')) {
    const titolo = decodeURIComponent(url.split('titles=')[1] || 'Roman Empire');
    return new Response(JSON.stringify({ query: { pages: [{ title: titolo, fullurl: 'https://simple.wikipedia.org/wiki/' + encodeURIComponent(titolo), extract: WIKI }] } }), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  if (url.includes('/v1/convai/agents/create')) {
    return new Response(JSON.stringify({ agent_id: 'agent_test_123' }), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  if (url.includes('/v1/convai/agents/')) return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
  if (url.includes('/v1/convai/conversation/get-signed-url')) {
    return new Response(JSON.stringify({ signed_url: 'wss://localhost:1/finto' }), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  if (url.includes('api.elevenlabs.io/v1/speech-to-text')) {
    return new Response(JSON.stringify({ text: 'I work in agency and I am agree with you.' }), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  if (url.includes('api.elevenlabs.io/v1/text-to-speech')) {
    return new Response(new Uint8Array([0xff, 0xfb, 0x90, 0x00]), { status: 200, headers: { 'content-type': 'audio/mpeg' } });
  }
  return veroFetch(input, init);
};
