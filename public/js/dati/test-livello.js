// Test di livello: 30 domande, 5 per livello (A1 → C2). La prima opzione è sempre quella giusta:
// l'ordine viene mescolato quando il test parte. È una STIMA rapida (grammatica e lessico),
// non una certificazione: poi il livello si aggiusta da solo con gli esercizi.
export const DOMANDE = [
  ['A1', 'She ___ a teacher.', ['is', 'are', 'am', 'be']],
  ['A1', 'I ___ coffee every morning.', ['drink', 'drinks', 'drinking', 'am drink']],
  ['A1', 'There ___ two cats in the garden.', ['are', 'is', 'be', 'has']],
  ['A1', 'What time ___ you get up?', ['do', 'does', 'are', 'is']],
  ['A1', 'This is ___ book. It belongs to me.', ['my', 'me', 'I', 'mine']],

  ['A2', 'Yesterday we ___ to the beach.', ['went', 'go', 'goes', 'have gone']],
  ['A2', 'Marco is ___ than his sister.', ['taller', 'more tall', 'tallest', 'the taller']],
  ['A2', 'I\'m ___ to visit my grandmother next weekend.', ['going', 'go', 'will', 'gone']],
  ['A2', 'How ___ water do you drink every day?', ['much', 'many', 'lot', 'few']],
  ['A2', 'When I arrived, they ___ dinner.', ['were having', 'had have', 'are having', 'have']],

  ['B1', 'I ___ in Naples since 2015.', ['have lived', 'live', 'am living', 'lived']],
  ['B1', 'If it rains tomorrow, we ___ at home.', ['will stay', 'would stay', 'stay will', 'stayed']],
  ['B1', 'The meeting was ___ because the manager was ill.', ['called off', 'called on', 'called up', 'called in']],
  ['B1', 'You ___ wear a helmet here: it\'s the law.', ['must', 'might', 'could', 'would']],
  ['B1', 'This is the agency ___ I told you about.', ['that', 'who', 'what', 'where']],

  ['B2', 'If I ___ about the problem, I would have helped.', ['had known', 'knew', 'have known', 'would know']],
  ['B2', 'The new campaign is expected ___ next month.', ['to be launched', 'launching', 'to launch', 'be launched']],
  ['B2', 'She denied ___ the email.', ['sending', 'to send', 'send', 'to have send']],
  ['B2', 'By the time you arrive, we ___ the report.', ['will have finished', 'will finish', 'have finished', 'finish']],
  ['B2', 'Closest meaning: "The results were somewhat disappointing."', ['a bit disappointing', 'extremely disappointing', 'not disappointing at all', 'surprisingly good']],

  ['C1', '___ had I sat down than the phone rang.', ['No sooner', 'Hardly', 'Scarcely', 'Barely']],
  ['C1', 'The proposal was rejected, ___ came as no surprise.', ['which', 'what', 'that', 'it']],
  ['C1', 'We need to ___ the pros and cons before deciding.', ['weigh up', 'weight up', 'way up', 'weigh out']],
  ['C1', 'I\'d rather you ___ tell anyone about this yet.', ['didn\'t', 'don\'t', 'won\'t', 'not']],
  ['C1', 'His argument doesn\'t hold ___: the numbers don\'t add up.', ['water', 'ground', 'fire', 'air']],

  ['C2', 'The minister\'s remarks were ___ to calm the critics.', ['calculated', 'calculating', 'computed', 'reckoned']],
  ['C2', 'Little ___ that the decision would cost him his job.', ['did he know', 'he knew', 'he did know', 'knew he']],
  ['C2', 'The plot is so ___ that few readers make it to the end.', ['convoluted', 'convicted', 'consolidated', 'conveyed']],
  ['C2', 'She has a ___ for saying the wrong thing at the worst moment.', ['knack', 'knock', 'nack', 'knick']],
  ['C2', 'Closest meaning: "His complaint was given short shrift."', ['it was dismissed quickly', 'it was written briefly', 'it was paid for', 'it was postponed']],
];
