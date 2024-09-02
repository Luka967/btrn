/**
 * Redosled timova je bitan za konstruisanje kola.
 * Vidi RoundRobinFormat.constructor i https://www.youtube.com/watch?v=wk9SK5sQxT4&t=108s
 */
exports.groupStageDraws = [
    ['AUS', 'GRE', 'CAN', 'ESP'],
    ['GER', 'FRA', 'BRA', 'JPN'],
    ['SSD', 'SRB', 'USA', 'PRI']
];
exports.teamFormBest = 1000;
exports.teamFormDropPerRank = 10;
/**
 * Ako je forma tima veća od protivnika za SIZE,
 * šansa da on pobedi je BIAS prema 1.
 *
 * Npr. tim A ima formu 1200, tim B ima formu 1000, SIZE je 200 a BIAS 10
 * Šansa da tim A pobedi je 10:1, tj. 10/11, 90.9%
 */
exports.teamFormWinLadderSize = 200;
exports.teamFormWinLadderBias = 10;
/**
 * Najveća promena u formi koja se može desiti ako tim ima 100% šanse za pobedu.
 * Za 50% šanse ovo je polovina
 */
exports.teamFormWinChange = 40;
/**
 * Kad je meč završen, svakih N bodova razlike
 * vuče formu gubitničkog tima nadole za 10% više
 */
exports.teamFormLossBias = 10;

exports.matchMinMedianScore = 60;
exports.matchMaxMedianScore = 110;
/**
 * Razlika u postignutim bodovima zavisi od šanse za pobedu.
 * Ako je tim imao malu šansu da pobedi, i pobedi, obično to bude za par bodova.
 * Kada je mala   šansa koristi se  minLowChance - maxLowChance
 * Kada je velika šansa koristi se minHighChance - maxHighChance
 */
exports.matchPossibleScoreDiff = {
    minLowChance: 1,
    minHighChance: 10,
    maxLowChance: 5,
    maxHighChance: 40
};

/**
 * Ako tim sa šansom većom od ove izgubi, on se naglašava u izlazu
 */
exports.matchUpsetThreshold = 0.7;

// Konstante
exports.groupSymbol = ['A', 'B', 'C'];
exports.roundSymbol = ['I', 'II', 'III'];
exports.finalStageLabels = ['Četvrtfinale', 'Polufinale', 'Bronzana medalja', 'Zlatna medalja'];
