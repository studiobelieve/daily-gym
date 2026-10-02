// Consegne di writing: la situazione la sceglie il codice (non l'AI), a rotazione e senza ripetere
// le ultime usate. Lasciata libera, l'AI propone quasi sempre "sposta una riunione".
export const SITUAZIONI = {
  lavoro: [
    'thank a client for a meeting and summarise the three decisions you took',
    'tell a client that a campaign will be two days late, and why',
    'ask a colleague for help with a deadline, offering something in return',
    'reply to a client who is unhappy with the results of last month',
    'propose a new idea for a social media campaign to your boss',
    'introduce yourself to a new client you will work with',
    'ask a client for missing materials (photos, logo, texts) before a deadline',
    'say no politely to an extra request that is not in the contract',
    'give feedback to a junior colleague on a video script',
    'write to a supplier to ask for a discount on a large order',
    'confirm the details of a video shooting: place, time, people, what to bring',
    'follow up with a potential client who has not answered for two weeks',
    'explain to a client why the number of followers is less important than sales',
    'announce to the team that a new client has signed with the agency',
    'apologise to a client for a mistake in a published post',
    'ask your boss for a day off next week',
    'invite a client to an event organised by the agency',
    'write the result of a campaign in a short report: numbers and next steps',
    'recommend a colleague for a new project',
    'answer a candidate after a job interview',
    'describe a problem with a tool or software to the support team',
    'negotiate a new price with a client who wants to pay less',
    'ask a client for a testimonial or a review',
    'explain a new process to the team (how to approve the posts)',
    'congratulate a colleague on a great result',
    'write a short LinkedIn post about something you learned at work',
    'prepare the agenda for a meeting with a new e-commerce client',
    'reply to a logistics company that wants to start a TikTok account',
    'tell a financial services client what content is allowed and what is risky',
    'write a message to the team after a difficult week',
    'ask an influencer to collaborate with a brand',
    'refuse a meeting time and propose two alternatives',
    'thank the team after a successful project launch',
    'ask a client to approve a budget before Friday',
    'describe your role and your agency in a short bio',
  ],
  cultura: [
    'describe the best trip you have ever taken',
    'give your opinion: should phones be banned in schools?',
    'recommend a film or series to a friend and explain why',
    'describe a typical Sunday in Naples to a foreign friend',
    'tell a funny thing that happened to you recently',
    'write a short review of a restaurant you like',
    'describe a person who changed your way of thinking',
    'give your opinion: is working from home better than the office?',
    'explain a traditional Italian recipe to a friend',
    'write about a book or a podcast you want to recommend',
    'describe your ideal weekend',
    'tell about a mistake you made and what you learned',
    'give your opinion: is social media good or bad for young people?',
    'describe a place in your city that tourists don\'t know',
    'write a message to a friend you haven\'t seen for years',
    'explain a curious historical fact you know',
    'describe a habit you want to start and why',
    'give your opinion: will artificial intelligence change your job?',
    'tell about the best concert or event you have been to',
    'describe your favourite football memory or sports moment',
    'write about something you are proud of',
    'compare life in a big city and in a small town',
    'describe a goal you have for next year',
    'tell a short story that starts with "I opened the door and…"',
    'explain what you would do with one free month',
    'describe a gift you received that you still remember',
    'give advice to someone who wants to visit Italy',
    'describe the job you wanted to do as a child',
    'write about a tradition in your family',
    'give your opinion: is it better to save money or to enjoy it now?',
  ],
};

export const FORMATI = {
  lavoro: ['an email', 'a short chat message (Slack or WhatsApp)', 'an email', 'a short message', 'a short paragraph'],
  cultura: ['a short paragraph', 'a message to a friend', 'a short post', 'a short paragraph'],
};

// Sceglie una situazione non usata di recente. `recenti` = indici già usati (dal più recente).
export function scegliSituazione(tema, recenti = [], rng = Math.random) {
  const lista = SITUAZIONI[tema];
  const evita = new Set(recenti.slice(0, Math.floor(lista.length * 0.7)));
  const libere = lista.map((_, i) => i).filter((i) => !evita.has(i));
  const indice = libere[Math.floor(rng() * libere.length)];
  const formati = FORMATI[tema];
  return { indice, situazione: lista[indice], formato: formati[Math.floor(rng() * formati.length)] };
}
