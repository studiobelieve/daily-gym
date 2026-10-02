// Percorsi di comunicazione basati sui libri scelti dall'utente.
// Ogni lezione = un concetto chiave di un libro, con appunti scritti a mano (conoscenza generale dei libri,
// NON testo copiato). L'AI scrive la pillola partendo da questi appunti, con parole sue.
// "affidabilita": quanto sono sicuro dei contenuti del libro (alta = classico molto noto).
// "avvertenza": cosa la ricerca attuale non conferma; la pillola deve dirlo.

const libro = (id, titolo, autore, affidabilita, avvertenza, lezioni) => ({ id, titolo, autore, affidabilita, avvertenza, lezioni });

const VOSS = libro('voss', 'Never Split the Difference', 'Chris Voss', 'alta', '', [
  ['Tactical empathy', 'Understanding and naming the other side\'s feelings and perspective, without agreeing, to lower defences. Voss built it as an FBI hostage negotiator.'],
  ['Mirroring', 'Repeat the last 1-3 words the person said, with an upward tone, then stay silent: they expand and reveal information. Simple, low-risk rapport tool.'],
  ['Labeling emotions', '"It seems like…", "It sounds like…", "It looks like…" to name an emotion; then silence. Naming negative emotions reduces their intensity.'],
  ['The accusation audit', 'List every negative thing the other side might think about you and say it first ("You probably think I\'m being unfair…"). It defuses objections before they grow.'],
  ['Getting to "No"', '"No" makes people feel safe and in control; ask no-oriented questions ("Is it a bad time to talk?", "Have you given up on this project?") instead of pushing for "yes".'],
  ['"That\'s right" vs "You\'re right"', 'Summarise their view so well that they say "That\'s right": that is real agreement. "You\'re right" usually means "please stop talking".'],
  ['Calibrated questions', 'Open "How" and "What" questions ("How am I supposed to do that?") make the other side solve your problem and give them an illusion of control. Avoid "Why", which sounds accusatory.'],
  ['The late-night FM DJ voice', 'Three voices: calm, slow, downward-inflecting "DJ" voice for key moments; positive playful voice as default; assertive voice rarely. Tone changes how the message lands.'],
  ['The Ackerman bargaining model', 'Set a target; first offer 65%, then 85%, 95%, 100%, with decreasing increments; use empathy and "no" questions between; final number precise and non-round, plus a non-monetary item.'],
  ['Bending reality: anchors, deadlines and fairness', 'Anchor emotions first (prepare them for a bad offer), deadlines are often flexible, and the word "fair" is powerful and can be used to manipulate — handle it carefully.'],
  ['Black swans and leverage', 'Unknown unknowns that change everything; find them by listening, asking, and noticing what does not fit. Types of leverage: positive, negative, normative.'],
  ['The rule of three', 'Get agreement three times (e.g. a "that\'s right", a summary, a calibrated "how" question) to check commitment is real; also watch for liars\' pronouns and Pinocchio effect in speech.'],
]);

export const AREE_LIBRI = {
  persuasione: {
    nome: 'Persuasione',
    libri: [
      libro('influence', 'Influence (Le armi della persuasione)', 'Robert B. Cialdini', 'alta', '', [
        ['Click, whirr: why shortcuts work', 'Humans use automatic responses (fixed-action patterns) to save effort; persuaders trigger them. Knowing the principles is also the best defence against manipulation.'],
        ['Reciprocity', 'People feel obliged to return favours. Give first; gifts that are personalised, unexpected and significant work best (restaurant mints and tips studies). Reject "fake favours".'],
        ['Commitment and consistency', 'Once we commit, especially actively, publicly and in writing, we act consistently. Small first requests grow into bigger ones (foot-in-the-door; the lawn sign study).'],
        ['Social proof', 'Under uncertainty we copy similar others (canned laughter, "most people like you…"). Note: the famous Kitty Genovese "38 witnesses" story was later shown to be exaggerated.'],
        ['Liking', 'We say yes to people we like: similarity, genuine compliments, cooperation, familiarity, positive associations (Joe Girard the car salesman).'],
        ['Authority', 'We defer to signals of authority: titles, clothes, expertise (Milgram). Ethical use: show real expertise early and admit a small weakness to build credibility.'],
        ['Scarcity', 'Things become more valuable when rare or when we may lose them; loss framing is stronger than gain framing. Use only real scarcity.'],
        ['Unity', 'The 7th principle (new edition): a shared identity ("we", family, place, team) makes influence much stronger than mere liking.'],
      ]),
      libro('presuasion', 'Pre-Suasion', 'Robert B. Cialdini', 'alta', 'Some priming studies cited in the book did not replicate in later research: present them as hypotheses, not facts.', [
        ['Privileged moments', 'What people focus on just before a message changes how they respond to it. Prepare the moment, not only the message.'],
        ['Attention makes things seem important', 'Whatever is focal seems more important and more causal ("focus = importance"). Directing attention is a form of influence.'],
        ['The single-question opener', 'Asking a question first ("Do you consider yourself adventurous?") makes people more likely to agree with a related request afterwards.'],
        ['Associations and the geography of influence', 'Words, images and places activate related ideas; environments prime behaviour. Choose what surrounds your message.'],
        ['The ethics of pre-suasion', 'Cialdini argues that misleading pre-suasion wins once but destroys trust; use it only to highlight things that are true and relevant.'],
      ]),
      libro('yes', 'Yes! 50 Scientifically Proven Ways to Be Persuasive', 'Goldstein, Martin, Cialdini', 'alta', 'Some effects in these studies turned out smaller in replications: treat them as useful tendencies, not magic.', [
        ['The hotel towel experiment', 'Descriptive norms ("most guests in this room reused their towels") worked better than environmental appeals: the more similar the reference group, the stronger.'],
        ['When social proof backfires', 'Saying "many people do the wrong thing" (e.g. stealing wood from a park) normalises it and can increase the behaviour. Highlight the desired majority instead.'],
        ['The power of "because"', 'Giving a reason, even a weak one, increases compliance with small requests (Ellen Langer\'s photocopier study).'],
        ['The personal touch', 'A handwritten sticky note on a request greatly increased response rates: personal effort signals respect.'],
        ['Admitting a weakness', 'Mentioning a small drawback first makes the strengths more credible ("we\'re not the cheapest, but…").'],
        ['Too many choices', 'Large choice sets can reduce decisions (the famous jam study); later research shows the effect depends on context, so simplify when options confuse.'],
      ]),
      libro('smallbig', 'The Small BIG', 'Martin, Goldstein, Cialdini', 'media', '', [
        ['Small changes, big differences', 'Tiny changes in wording or context can change responses a lot; test small details before big strategies.'],
        ['Active commitment and no-shows', 'Asking patients to write down their own appointment details, and to say they would call if cancelling, reduced missed appointments.'],
        ['Precise numbers as anchors', 'Precise figures ("€4,850") look researched and anchor negotiations more strongly than round numbers.'],
        ['Defaults and the order of options', 'What is pre-selected and what comes first strongly influence choices; design them deliberately and honestly.'],
      ]),
      libro('nudge', 'Nudge', 'Richard H. Thaler, Cass R. Sunstein', 'alta', '', [
        ['Choice architecture', 'There is no neutral way to present options: the order, defaults and layout always influence decisions (the cafeteria example).'],
        ['Humans vs Econs', 'Real people are not perfectly rational "Econs": they have limited attention and self-control, and are influenced by context.'],
        ['The power of defaults', 'Opt-out systems (organ donation, automatic pension enrollment) change behaviour massively because people stick with the default.'],
        ['Save More Tomorrow', 'Thaler and Benartzi\'s plan: commit now to save part of future pay rises; it raised savings because it avoids feeling a loss today.'],
        ['Libertarian paternalism', 'Nudges steer people toward better choices while keeping freedom to choose; critics worry about manipulation and who decides what is "better".'],
        ['Sludge', 'The opposite of a nudge: unnecessary friction (forms, waiting, hard cancellations) that stops people doing what is good for them.'],
      ]),
      libro('kahneman', 'Thinking, Fast and Slow', 'Daniel Kahneman', 'alta', 'The chapter on behavioural priming relies on studies that later failed to replicate; Kahneman himself acknowledged this.', [
        ['System 1 and System 2', 'Fast, automatic, intuitive thinking vs slow, effortful, deliberate thinking. Most persuasion works on System 1.'],
        ['Anchoring', 'An initial number influences estimates, even when it is random (the wheel of fortune experiment). The first offer often anchors a negotiation.'],
        ['Availability', 'We judge frequency by how easily examples come to mind: vivid news makes rare risks feel common.'],
        ['Loss aversion and prospect theory', 'Losses weigh roughly twice as much as equal gains; people take risks to avoid losses. Kahneman won the Nobel for this work with Tversky.'],
        ['Framing', '"90% survival" and "10% mortality" are the same fact but lead to different choices.'],
        ['WYSIATI and overconfidence', '"What you see is all there is": we build confident stories from little information; the planning fallacy makes projects late.'],
        ['The peak-end rule', 'We remember experiences by their most intense moment and their end, not their length (the colonoscopy study).'],
      ]),
      libro('lakhani', 'Persuasion: The Art of Getting What You Want', 'Dave Lakhani', 'media', 'Practical sales-oriented book, mostly based on experience rather than controlled studies.', [
        ['Persuasion vs manipulation', 'Lakhani distinguishes persuasion (the other person gets real value) from manipulation (they lose); long-term influence needs the first.'],
        ['Credibility and trust first', 'Before arguments, people decide if they trust you: expertise, consistency and openness build the base for persuasion.'],
        ['Stories that sell', 'People remember and act on stories more than data; a short, relevant story makes a proposal concrete.'],
      ]),
      libro('hogan', 'The Psychology of Persuasion', 'Kevin Hogan', 'media', 'Parts of the book draw on neuro-linguistic programming (NLP), which is not supported by scientific evidence: keep only ideas that match established psychology.', [
        ['The law of contrast', 'Things are judged relative to what came before: show the expensive option first and the next one seems cheaper.'],
        ['The law of expectations', 'People tend to behave according to what others confidently expect of them (related to the Pygmalion effect).'],
        ['Involvement', 'Getting the other person to participate (questions, trying, imagining) increases their commitment to the outcome.'],
        ['What NLP got wrong', 'Ideas like "eye movements reveal thinking style" or guaranteed hypnotic language have not held up in research; use evidence-based methods instead.'],
      ]),
      libro('seduction', 'The Art of Seduction', 'Robert Greene', 'media', 'Strategic and historical, not scientific; several strategies are manipulative. Study them to recognise them, not to use them on people.', [
        ['The seducer types', 'Greene describes nine types (Siren, Rake, Ideal Lover, Dandy, Natural, Coquette, Charmer, Charismatic, Star) with historical examples like Cleopatra and Casanova.'],
        ['The anti-seducer', 'Traits that repel: insecurity, neediness, talking only about yourself, lack of attention to others. Useful as a checklist of what not to do.'],
        ['Attention and mystery', 'Greene argues that ambiguity and mixed signals create interest; research on attraction suggests warmth and reliability matter more long-term.'],
        ['Recognising manipulation', 'Isolation, false scarcity of attention and guilt are classic tactics; noticing them protects you at work and in relationships.'],
      ]),
    ],
  },
  negoziazione: {
    nome: 'Negoziazione',
    libri: [
      VOSS,
      libro('gettingtoyes', 'Getting to Yes', 'Roger Fisher, William Ury, Bruce Patton', 'alta', '', [
        ['Separate the people from the problem', 'Treat the relationship and the issue separately: be soft on people, hard on the problem.'],
        ['Interests, not positions', 'Positions are what people say they want; interests are why. Two sisters fighting over an orange: one wanted the juice, the other the peel.'],
        ['Invent options for mutual gain', 'Brainstorm many options before deciding; avoid assuming the pie is fixed.'],
        ['Insist on objective criteria', 'Use fair standards (market value, precedent, expert opinion) instead of a battle of wills.'],
        ['BATNA', 'Your Best Alternative To a Negotiated Agreement: know it before negotiating; it is your real source of power and protects you from bad deals.'],
        ['Negotiation jujitsu', 'When the other side attacks, do not counterattack: ask questions, invite criticism, reframe attacks as attacks on the problem.'],
      ]),
      libro('gettingmore', 'Getting More', 'Stuart Diamond', 'alta', '', [
        ['Goals are paramount', 'Every move should bring you closer to your goal; ask "will this help me reach my goal?" before reacting.'],
        ['It\'s about them', 'Understand the pictures in the other person\'s head: their perceptions, needs and emotions, not only yours.'],
        ['Emotional payments', 'When people are emotional, they cannot listen; acknowledge feelings, apologise, give respect before discussing terms.'],
        ['Use their standards', 'Find the other side\'s own policies and past statements and ask them to apply them: very effective with companies.'],
        ['Trade things of unequal value', 'Find items cheap for you but valuable to them (and vice versa) to expand the deal.'],
        ['Incremental steps', 'Big changes scare people; move in small steps and make each step easy to accept.'],
      ]),
      libro('shell', 'Bargaining for Advantage', 'G. Richard Shell', 'alta', '', [
        ['Your bargaining style', 'Five styles (competing, accommodating, avoiding, compromising, problem-solving); know your default and adapt it to the situation.'],
        ['Goals: high and specific', 'People with specific, optimistic, justifiable goals get better results than those who just "do their best".'],
        ['Leverage', 'Positive (they want something from you), negative (you can take something away) and normative (their own standards); leverage shifts during the deal.'],
        ['The four stages', 'Preparation, information exchange, opening and concessions, closing and commitment; most mistakes happen by skipping preparation.'],
        ['Ethics in bargaining', 'Three approaches: "it\'s a game" (poker), idealist (never lie), pragmatist; Shell suggests a personal standard you can defend publicly.'],
      ]),
      libro('impossible', 'Negotiating the Impossible', 'Deepak Malhotra', 'alta', '', [
        ['The power of framing', 'How a proposal is framed (as a gain, as fair, as a small step) can unlock deals that seemed impossible.'],
        ['The power of process', 'Agree on the process before the substance: how decisions are made, what is confidential, the timeline.'],
        ['The power of empathy', 'Understanding the other side\'s constraints and pressures, even when they are hostile, often reveals solutions.'],
        ['The Cuban Missile Crisis', 'Kennedy answered Khrushchev\'s softer letter and ignored the harder one, and gave him a way to save face: a lesson in empathy under pressure.'],
      ]),
      libro('3d', '3D Negotiation', 'David A. Lax, James K. Sebenius', 'media', '', [
        ['Three dimensions', 'Tactics (at the table), deal design (creating value) and setup (who, what, when, sequence): many deals are won before the conversation starts.'],
        ['Setup: right parties, right sequence', 'Map all parties who can block or support the deal, and decide the order in which to approach them.'],
        ['Designing for value', 'Differences (in risk, timing, priorities) are opportunities: contingent agreements turn disagreement into value.'],
      ]),
      libro('positiveno', 'The Power of a Positive No', 'William Ury', 'alta', '', [
        ['Yes! No. Yes?', 'A positive no has three parts: a Yes to your own interests, a clear No, and a Yes? that proposes an alternative.'],
        ['The three traps', 'Accommodate (say yes when you mean no), attack (say no badly), avoid (say nothing); each damages you or the relationship.'],
        ['Uncover your Yes', 'Ground your no in your deeper interests and values, so it feels natural and firm.'],
        ['Plan B and staying firm', 'Prepare your alternative before saying no; when they push back, repeat calmly and do not escalate.'],
      ]),
      libro('camp', 'Start with No', 'Jim Camp', 'media', 'Contrarian and largely anecdotal; useful as a different view from "win-win" approaches.', [
        ['Never need the deal', 'Wanting a deal is fine, needing it makes you weak; neediness shows and invites pressure.'],
        ['Invite "no"', 'Give the other side the right to say no: it removes pressure and leads to more honest decisions.'],
        ['Mission and purpose', 'Base the negotiation on a clear mission centred on the other side\'s world, not on a target number.'],
        ['Control your behaviour, not results', 'You cannot control the outcome, only your activities and behaviour; measure those.'],
      ]),
      libro('genius', 'Negotiation Genius', 'Deepak Malhotra, Max H. Bazerman', 'alta', '', [
        ['Preparing: BATNA, reservation value, ZOPA', 'Estimate your walk-away point and theirs; the zone of possible agreement lies in between.'],
        ['Claiming value: first offers', 'A well-researched ambitious first offer anchors the deal; if they anchor first, re-anchor quickly and do not negotiate around their number.'],
        ['Creating value', 'Negotiate many issues at once, trade on priorities (logrolling) and use contingent contracts.'],
        ['Biases that cost money', 'Fixed-pie bias, overconfidence, escalation of commitment and ignoring the other side\'s perspective.'],
        ['Lies and deception', 'Ask questions that make lying costly, verify, and do not lie yourself: reputation is long-term leverage.'],
      ]),
      libro('difficult', 'Difficult Conversations', 'Douglas Stone, Bruce Patton, Sheila Heen', 'alta', '', [
        ['The three conversations', 'Every difficult conversation has three layers: "What happened?", feelings, and identity ("what does this say about me?").'],
        ['Intent vs impact', 'Separate what you think they intended from how it affected you; we judge others by impact and ourselves by intent.'],
        ['Contribution, not blame', 'Ask what each person contributed to the problem; blame looks backward, contribution helps fix it.'],
        ['Begin from the third story', 'Start by describing the situation as a neutral observer would, then invite the other person to share their view.'],
        ['Listening from curiosity', 'Ask, paraphrase and acknowledge before defending your view; people listen after they feel heard.'],
      ]),
    ],
  },
  corpo: {
    nome: 'Linguaggio del corpo',
    libri: [
      libro('navarro', 'What Every BODY Is Saying', 'Joe Navarro', 'alta', 'Navarro himself stresses there is no single sign of lying ("no Pinocchio effect"); read comfort and discomfort instead.', [
        ['The limbic brain: freeze, flight, fight', 'Our oldest reactions show in the body: freezing, distancing or blocking, and aggression signals.'],
        ['Comfort and discomfort', 'The most useful reading is not "lying vs truth" but comfort vs discomfort, and when it changes.'],
        ['The feet tell the truth', 'Feet and legs are less controlled: feet turning toward the exit can signal wanting to leave.'],
        ['Pacifying behaviours', 'Touching the neck, rubbing hands or face calms us under stress: they show stress, not necessarily lies.'],
        ['Baselines and changes', 'Observe how a person normally behaves; what matters is change from their baseline.'],
        ['Torso and hands', 'Leaning away, blocking with objects, hiding hands or steepling fingers reflect comfort, confidence or discomfort.'],
      ]),
      libro('pease', 'The Definitive Book of Body Language', 'Allan & Barbara Pease', 'media', 'Many gesture meanings depend on culture and context, and the book\'s "lying gestures" (like touching the nose) are not supported by research.', [
        ['Context, clusters and congruence', 'Read gestures in clusters, in context, and check if body and words match; a single gesture means little.'],
        ['Palms and handshakes', 'Open palms are associated with honesty and openness; handshake styles convey dominance or equality.'],
        ['Smiles', 'Genuine smiles involve the eyes; people smile back automatically, which builds rapport.'],
        ['Arms and barriers', 'Crossed arms can signal defensiveness, but also cold or comfort; look for clusters before concluding.'],
        ['Territories and zones', 'Personal distance zones vary across cultures; invading them causes discomfort.'],
        ['Mirroring and rapport', 'People in rapport naturally mirror posture; subtle, natural mirroring can help, mechanical copying backfires.'],
      ]),
      libro('navarrodict', 'The Dictionary of Body Language', 'Joe Navarro', 'media', 'A reference of common meanings: always interpret in context.', [
        ['Face signals', 'Eyebrow flash (recognition and liking), lip compression (stress or holding back), jaw tension.'],
        ['Hands and legs signals', 'Hand wringing, interlaced fingers, leg bouncing that suddenly stops: changes worth noticing, not proof.'],
      ]),
      libro('emotionsrevealed', 'Emotions Revealed', 'Paul Ekman', 'alta', 'The universality of facial expressions is debated today (e.g. Lisa Feldman Barrett\'s research); context matters a lot.', [
        ['Basic emotions', 'Ekman proposed universal emotions (anger, fear, sadness, disgust, contempt, surprise, happiness) based on studies including isolated cultures in Papua New Guinea.'],
        ['Triggers and the refractory period', 'Emotions start fast and can block new information for a moment; noticing your triggers helps you respond better.'],
        ['Reading emotions in others', 'Each emotion has typical signs (e.g. contempt: one-sided lip corner raise) that can help empathy.'],
        ['Micro-expressions', 'Very brief expressions may leak hidden emotions; research shows they are rare and training has limited effect on detecting lies.'],
      ]),
      libro('unmasking', 'Unmasking the Face', 'Paul Ekman, Wallace V. Friesen', 'alta', '', [
        ['Three areas of the face', 'Brows and forehead, eyes and lids, lower face: emotions show differently in each area.'],
        ['Surprise or fear?', 'Both raise the brows, but fear pulls them together and tenses the lower eyelids; small details change meaning.'],
        ['Masks and blends', 'People mix emotions and mask them with social smiles; the Duchenne smile (eyes involved) is harder to fake.'],
      ]),
      libro('tellinglies', 'Telling Lies', 'Paul Ekman', 'alta', 'Research shows most people detect lies only slightly better than chance (about 54% in meta-analyses).', [
        ['Leakage and clues', 'Liars may leak emotions they try to hide, but these clues show emotion, not lying itself.'],
        ['The Othello error', 'Mistaking the stress of an honest person who fears not being believed for signs of lying.'],
        ['Why lie catchers fail', 'Overconfidence and individual differences (the "Brokaw hazard") make lie detection unreliable; better to verify facts.'],
      ]),
      libro('silentlanguage', 'The Silent Language', 'Edward T. Hall', 'alta', '', [
        ['Culture is communication', 'Hall showed that culture speaks through time, space and behaviour, not only words.'],
        ['Time talks', 'Cultures treat time differently (later called monochronic vs polychronic): being late means different things in different places.'],
        ['Space speaks: proxemics', 'How close we stand communicates; Hall later defined intimate, personal, social and public distances (The Hidden Dimension).'],
      ]),
      libro('presence', 'Presence', 'Amy Cuddy', 'media', 'The claim that "power poses" change hormones failed to replicate; a small effect on how people feel may remain.', [
        ['What presence means', 'Cuddy describes presence as being attuned to your real thoughts and values in stressful moments, not acting confident.'],
        ['Impostor feelings', 'Many capable people feel like frauds; naming the feeling and preparing well reduces its power.'],
        ['Power posing: what is left', 'Rise and fall of the idea: hormones did not change in replications; posture may still affect mood slightly.'],
      ]),
      libro('spythelie', 'Spy the Lie', 'Houston, Floyd, Carnicero, Tennant', 'media', 'Based on interview practice more than controlled studies; lie detection by behaviour remains unreliable.', [
        ['Look and listen at the same time', 'Watch behaviour in the first seconds after a question, while listening to the words.'],
        ['Verbal deception indicators', 'Not answering the question, repeating it, "convincing" statements ("I would never…"), excessive qualifiers.'],
        ['Clusters, not single signs', 'The authors look for two or more indicators together, and still treat them as reasons to ask more, not proof.'],
      ]),
      libro('louder', 'Louder Than Words', 'Joe Navarro', 'media', '', [
        ['Nonverbal intelligence', 'Noticing others and managing your own signals is a skill that improves with observation.'],
        ['First impressions at work', 'Posture, appearance and greeting create quick impressions that colour everything after.'],
        ['Comfort as leadership', 'Leaders who make others feel comfortable get more honesty and cooperation.'],
      ]),
    ],
  },
  personale: {
    nome: 'Comunicazione personale',
    libri: [
      libro('carnegie', 'How to Win Friends and Influence People', 'Dale Carnegie', 'alta', '', [
        ['Don\'t criticise, condemn or complain', 'Criticism makes people defensive; understand why they acted as they did.'],
        ['Honest, sincere appreciation', 'People crave feeling important; specific, genuine appreciation (not flattery) changes relationships.'],
        ['See it from their point of view', 'Arouse an eager want: talk about what the other person wants and how to get it.'],
        ['Become genuinely interested in others', 'You make more friends in two months by being interested in others than in two years trying to get them interested in you.'],
        ['Remember names', 'A person\'s name is to them the sweetest sound; use it and remember it (connect it with the memory training).'],
        ['Be a good listener', 'Encourage others to talk about themselves; ask questions they enjoy answering.'],
        ['Avoid arguments', 'The only way to win an argument is to avoid it; respect the other\'s opinion and admit your mistakes quickly.'],
        ['Let them save face', 'Begin with praise, call attention to mistakes indirectly, and let people keep their dignity.'],
      ]),
      libro('crucial', 'Crucial Conversations', 'Kerry Patterson, Joseph Grenny, Ron McMillan, Al Switzler', 'alta', '', [
        ['What makes a conversation crucial', 'Opinions differ, stakes are high and emotions run strong: exactly when we behave worst.'],
        ['Start with heart', 'Ask yourself: what do I really want for me, for them, for the relationship?'],
        ['Silence or violence', 'Watch for the moment safety is lost: people withdraw (silence) or attack (violence).'],
        ['Make it safe', 'Restore mutual purpose and mutual respect; use contrasting ("I don\'t mean…, I do mean…") and apologise when needed.'],
        ['Master your stories', 'Between what we see and how we feel there is a story we tell ourselves; question it.'],
        ['STATE your path', 'Share facts, Tell your story, Ask for others\' paths, Talk tentatively, Encourage testing.'],
        ['Explore others\' paths and move to action', 'Ask, mirror, paraphrase, prime; finish by deciding who does what by when, and how you follow up.'],
      ]),
      libro('lowndes', 'How to Talk to Anyone', 'Leil Lowndes', 'media', 'Practical tips mostly based on experience, not research.', [
        ['The flooding smile', 'Pause a moment before smiling when you meet someone, so the smile feels personal.'],
        ['Sticky eyes', 'Keep eye contact a little longer than usual to show interest (adapt to culture).'],
        ['The parrot', 'Repeat the last words of the other person to keep them talking (similar to Voss\'s mirroring).'],
        ['Never the naked "Me too"', 'When you have something in common, wait and then share it with detail, so it does not sound automatic.'],
      ]),
      { ...VOSS, lezioni: VOSS.lezioni.slice(0, 3) },
      libro('justlisten', 'Just Listen', 'Mark Goulston', 'media', '', [
        ['From resisting to listening', 'People under stress cannot hear arguments; calm them first by listening, then they become open.'],
        ['Make them feel "felt"', 'Show you understand what they feel ("I bet you feel frustrated…"); feeling understood lowers resistance.'],
        ['Be more interested than interesting', 'Curiosity about the other person builds more connection than trying to impress.'],
        ['The impossibility question', '"What is one thing that is impossible to do, but if it were possible would change everything?" opens new thinking.'],
      ]),
      libro('nvc', 'Nonviolent Communication', 'Marshall B. Rosenberg', 'alta', '', [
        ['Observations without evaluations', 'Describe what happened ("you arrived at 9:20") instead of judging ("you are always late").'],
        ['Feelings, not thoughts', 'Express real feelings ("I feel worried") instead of hidden judgements ("I feel you don\'t care").'],
        ['Needs behind feelings', 'Every feeling points to a need (respect, clarity, rest); naming it reduces conflict.'],
        ['Requests, not demands', 'Ask for a concrete, positive, doable action; a request accepts a "no".'],
        ['Empathic listening', 'Listen for the other person\'s feelings and needs, even when they speak with blame.'],
      ]),
      libro('charisma', 'The Charisma Myth', 'Olivia Fox Cabane', 'alta', 'Some body-related exercises echo power posing, whose hormonal effects did not replicate.', [
        ['Presence, power and warmth', 'Cabane defines charisma as three behaviours that can be learned, not an innate gift.'],
        ['Presence', 'Being fully present in a conversation is noticed immediately; a wandering mind shows in the face.'],
        ['Four charisma styles', 'Focus, kindness, visionary and authority charisma: each fits different people and situations.'],
        ['Internal obstacles', 'Physical discomfort, anxiety and self-criticism block charisma; managing your inner state comes first.'],
      ]),
      libro('ted', 'Talk Like TED', 'Carmine Gallo', 'alta', '', [
        ['Unleash the master within', 'Speak about what you are passionate about: passion is contagious.'],
        ['Master storytelling', 'Personal stories, stories about others and brand stories make ideas emotional and memorable.'],
        ['Teach something new', 'The brain loves novelty: give the audience one new way to see a problem.'],
        ['Jaw-dropping moments', 'One memorable moment (a demo, a surprising statistic, an image) is what people repeat afterwards.'],
        ['The 18-minute rule', 'Short talks force clarity and keep attention; say less, better.'],
      ]),
      libro('stick', 'Made to Stick', 'Chip Heath, Dan Heath', 'alta', '', [
        ['The curse of knowledge', 'Once we know something we cannot imagine not knowing it (the tappers and listeners experiment).'],
        ['Simple and unexpected', 'Find the core of the message and break a pattern to get attention.'],
        ['Concrete and credible', 'Concrete images beat abstractions; testable credentials ("see for yourself") build belief.'],
        ['Emotional stories', 'People care about one person more than statistics; stories act as mental flight simulators.'],
      ]),
      libro('likeswitch', 'The Like Switch', 'Jack Schafer, Marvin Karlins', 'media', '', [
        ['The friendship formula', 'Friendship = proximity + frequency + duration + intensity.'],
        ['Friend signals', 'Eyebrow flash, head tilt and genuine smile signal you are not a threat.'],
        ['The golden rule', 'Make people feel good about themselves: empathic statements and letting them talk.'],
      ]),
    ],
  },
};

// Lezioni in ordine di percorso, indicizzate per chiave unica ("Libro — Lezione").
export const LEZIONI = {};
for (const [area, a] of Object.entries(AREE_LIBRI)) {
  for (const l of a.libri) {
    l.lezioni.forEach(([titolo, nota], i) => {
      const chiave = `${l.titolo} — ${titolo}`;
      if (!LEZIONI[chiave]) LEZIONI[chiave] = { area, libro: l, titolo, nota, numero: i + 1, totale: l.lezioni.length };
    });
  }
}

export function argomentiArea(area) {
  return AREE_LIBRI[area].libri.flatMap((l) => l.lezioni.map(([titolo]) => `${l.titolo} — ${titolo}`));
}
