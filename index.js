const { Tournament, RoundRobinFormat, Team, Match, SingleEliminationFormat } = require('./Tournament');
const { rankGroup, rankBucket } = require('./fibaRanking');
const config = require('./config');


const groups = require('./groups.json');
/** @type {Team[]} */
const groupsArray = [];
for (const group in groups)
    groupsArray.push(groups[group].map(Team.fromJson));

/** @type {Record<string, Team>} Mapirani po ISO kodu */
const teams = {};
for (const team of groupsArray.flat())
    teams[team.isoCode] = team;


// Ovaj deo pretvara FIBA rang i egzibicione mečeve u rejting "forme" koji je nalik ELO.
// Brojke su nameštene testiranjem tako da prave predvidive rezultate, sa manjom šansom da neki underdog pobedi
/** @type {Record<string, number>} */
const teamForm = {};
const matchUpsetThreshold = 0.7;
/**
 * @param {Team} t1
 * @param {Team} t2
 */
function getT1WinChance(t1, t2) {
    // https://www.youtube.com/watch?v=AsYfbmp0To0&t=63s
    const d = (teamForm[t2.isoCode] - teamForm[t1.isoCode]) / config.teamFormWinLadderSize;
    return 1 / (1 + Math.pow(config.teamFormWinLadderBias, d));
}
/**
 * @param {Team} t1
 * @param {Team} t2
 * @param {boolean} t1Won
 * @param {number} ptsDiff
 */
function modifyForm(t1, t2, t1Won, ptsDiff) {
    // Šansa da T1 pobedi
    const P1 = getT1WinChance(t1, t2);
    const bias = 1 + (ptsDiff / config.teamFormLossBias) / 10;

    const t1Point = t1Won ? 1 : 0;
    const t1Change = config.teamFormWinChange * (t1Point - P1) * (t1Won ? 1 : bias);

    const t2Point = t1Won ? 0 : 1;
    const t2Change = config.teamFormWinChange * (t2Point - (1 - P1)) * (t1Won ? bias : 1);

    teamForm[t1.isoCode] += t1Change;
    teamForm[t2.isoCode] += t2Change;
}
for (const isoCode in teams) {
    const team = teams[isoCode];
    const initialForm = config.teamFormBest - (team.fibaRanking - 1) * config.teamFormDropPerRank;
    teamForm[isoCode] = initialForm;
}
// Primeni egzibicione mečeve u formu
const exhibitionMatches = require('./exhibitions.json');
for (const t1IsoCode in exhibitionMatches) {
    const t1 = teams[t1IsoCode];
    for (const match of exhibitionMatches[t1IsoCode]) {
        const t2 = teams[match.Opponent];
        if (t2 == null) continue; // Nemoguće odrediti šansu za pobedu
        const [t1Score, t2Score] = match.Result.split('-').map(x => parseInt(x));
        modifyForm(t1, t2, t1Score > t2Score, Math.abs(t1Score - t2Score));
    }
}


/**
 * @param {Match} match
 */
function simulateMatch(match) {
    // Sredina između T1 - T2 postignutih bodova
    const avg = Math.round(
        config.matchMinMedianScore
        + Math.pow(Math.random(), 0.5) * (config.matchMaxMedianScore - config.matchMinMedianScore)
    );

    const t1WinsChance = getT1WinChance(match.t1, match.t2);
    const t1Won = Math.random() <= t1WinsChance;

    match.t1WinChance = t1WinsChance;
    match.isUpset =
           (!t1Won &&      t1WinsChance  >= matchUpsetThreshold)
        || ( t1Won && (1 - t1WinsChance) >= matchUpsetThreshold);

    const d = config.matchPossibleScoreDiff;

    let scoreDiffMul = t1Won ? t1WinsChance : (1 - t1WinsChance);
    const scoreDiffMin = d.minLowChance + scoreDiffMul * (d.minHighChance - d.minLowChance);
    const scoreDiffMax = d.maxLowChance + scoreDiffMul * (d.maxHighChance - d.maxLowChance);
    const scoreDiff = scoreDiffMin + (Math.random() * scoreDiffMul) * (scoreDiffMax - scoreDiffMin);

    const onePtRandom = Math.random() > 0.5 ? 1 : 0;
    const ptsWinner = Math.ceil(avg + scoreDiff / 2);
    const ptsLoser = Math.floor(avg - scoreDiff / 2) + onePtRandom;

    match.result = {
        t1: t1Won ? ptsWinner : ptsLoser,
        t2: !t1Won ? ptsWinner : ptsLoser
    };
    modifyForm(match.t1, match.t2, t1Won, ptsWinner - ptsLoser);
}


function doIt() {
    console.log('Početna forma timova');
    for (const teamIsoCode in teams)
        console.log(`    ${teams[teamIsoCode].name.padStart(20)}: ${teamForm[teamIsoCode].toFixed(0)}`);

    const groupStageDraws = config.groupStageDraws.map(
        group => group.map(teamIsoCode => teams[teamIsoCode])
    );
    const groupStageTournament = new Tournament(groupStageDraws.flat(2));
    const groupStageFormat = new RoundRobinFormat(groupStageTournament, () => groupStageDraws);
    groupStageTournament.format = groupStageFormat;

    console.log('\nGrupna faza');
    // Prati broj kola da znamo kad da ispišemo razmak
    let round = -1;
    while (true) {
        const match = groupStageTournament.pendingMatches[0];
        if (match.round !== round) {
            round = match.round;
            console.log(`    ${config.roundSymbol[match.round]} kolo`);
        }
        simulateMatch(match);
        console.log(`        ${match.inReadableFormat()}`);
        if (!groupStageTournament.markMatchComplete(match))
            break;
    }

    const groupStats = groupStageFormat.groups.map(
        group => group.map(team => groupStageTournament.compileStatsFor(team))
    );
    const groupRanks = groupStats.map(
        group => rankGroup(groupStageTournament, group)
    );

    console.log('\nKonačni rangovi u grupi');
    for (let i = 0; i < groupRanks.length; i++) {
        console.log(`    Grupa ${config.groupSymbol[i]}`);
        for (let j = 0; j < groupRanks[i].length; j++)
            console.log(`       ${groupRanks[i][j].inReadableFormat()}`);
    }

    const drawPots = [
        [groupRanks[0][0], groupRanks[1][0], groupRanks[2][0]],
        [groupRanks[0][1], groupRanks[1][1], groupRanks[2][1]],
        [groupRanks[0][2], groupRanks[1][2], groupRanks[2][2]]
    ];
    const drawPotsRanked = [
        rankBucket(drawPots[0].map(s => ({ group: s }))),
        rankBucket(drawPots[1].map(s => ({ group: s }))),
        rankBucket(drawPots[2].map(s => ({ group: s })))
    ].flat();

    console.log('\nKonačna rang lista timova');
    for (let i = 0; i < drawPotsRanked.length; i++) {
        const form = teamForm[drawPotsRanked[i].team.isoCode].toFixed(0).padStart(4);
        console.log(`    ${1 + i}. ${drawPotsRanked[i].inReadableFormat()} ${form} forma`);
    }

    const drawPotTeams = drawPotsRanked.map(s => s.team);
    const potD = [drawPotTeams[0], drawPotTeams[1]];
    const potE = [drawPotTeams[2], drawPotTeams[3]];
    const potF = [drawPotTeams[4], drawPotTeams[5]];
    const potG = [drawPotTeams[6], drawPotTeams[7]];

    console.log('\nŠeširi');
    console.log(`    D: ${potD[0].name}, ${potD[1].name}`);
    console.log(`    E: ${potE[0].name}, ${potE[1].name}`);
    console.log(`    F: ${potF[0].name}, ${potF[1].name}`);
    console.log(`    G: ${potG[0].name}, ${potG[1].name}`);

    /**
     * @param {Team[]} pot1
     * @param {Team[]} pot2
     */
    function matchPots(pot1, pot2) {
        // Jedine dve jedinstvene kombinacije među 4 timova su
        // A: 11-21, 22-12
        // B: 11-22, 12-21

        const pot1t1GroupIdx = groupStageFormat.groups.findIndex(group => group.includes(pot1[0])),
            pot1t2GroupIdx = groupStageFormat.groups.findIndex(group => group.includes(pot1[1]));

        const pot1t1Group = groupStageFormat.groups[pot1t1GroupIdx],
            pot1t2Group = groupStageFormat.groups[pot1t2GroupIdx];

        const pullAPossible =
               !pot1t1Group.includes(pot2[0])
            && !pot1t2Group.includes(pot2[1]);
        const pullBPossible =
               !pot1t1Group.includes(pot2[1])
            && !pot1t2Group.includes(pot2[0]);

        const pullA = [{ t1: pot1[0], t2: pot2[0] }, { t1: pot1[1], t2: pot2[1] }],
            pullB = [{ t1: pot1[0], t2: pot2[1] }, { t1: pot1[1], t2: pot2[0] }];

        if (pullAPossible && pullBPossible)
            return Math.random() >= 0.5 ? pullA : pullB;
        else if (pullAPossible)
            return pullA;
        else if (pullBPossible)
            return pullB;

        // Nadam se da se nikad neće desiti
        throw new Error(`Nemoguće je napraviti kombinaciju za ovaj meč!`);
    }

    const finalMatchups = [
        ...matchPots(potD, potG),
        ...matchPots(potE, potF)
    ];
    // Ref. https://www.fiba.basketball/en/events/mens-olympic-basketball-tournament-paris-2024/competition-system
    // Trenutno su u nizu   D1-G1 D2-G2 E1-F1 E2-F2
    //                              |
    //                              \-----\
    //                                    v
    // Treba da promenimo u D1-G1 E1-F1 D2-G2 E2-F2
    const matchD2G2 = finalMatchups.splice(1, 1)[0];
    finalMatchups.splice(1, 0, matchD2G2);

    console.log('\nEliminaciona faza');
    for (let i = 0; i < finalMatchups.length; i++)
        console.log(`    ${finalMatchups[i].t1.name.padStart(20)} - ${finalMatchups[i].t2.name}`);

    const finalStageTournament = new Tournament([...potD, ...potE, ...potF, ...potG]);
    const finalStageFormat = new SingleEliminationFormat(finalStageTournament, () => finalMatchups);
    finalStageTournament.format = finalStageFormat;

    round = -1;
    while (true) {
        const match = finalStageTournament.pendingMatches[0];
        if (round !== match.round) {
            round = match.round;
            console.log(config.finalStageLabels[round]);
        }
        simulateMatch(match);
        console.log(`    ${match.inReadableFormat()}`);
        if (!finalStageTournament.markMatchComplete(match))
            break;
    }

    const goldMedalMatch = finalStageFormat.rounds[finalStageFormat.rounds.length - 1][0];

    console.log('\nMedalje:');
    console.log(`    1. ${goldMedalMatch.winner.name}`);
    console.log(`    2. ${goldMedalMatch.loser.name}`);
    console.log(`    3. ${finalStageFormat.thirdPlaceMatch.winner.name}`);
}

doIt();
