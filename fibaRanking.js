/**
 * @param {import('./Tournament').Tournament} tournament
 * @param {import('./Tournament').Team} t1
 * @param {import('./Tournament').Team} t2
 */
function getH2HResult(tournament, t1, t2) {
    const h2hMatches = tournament.completedMatches
        .filter(m =>
            (m.t1 === t1 && m.t2 === t2)
         || (m.t1 === t2 && m.t2 === t1)
        );
    if (h2hMatches.length === 0)
        return null;
    const t1Wins = h2hMatches.map(m => m.t1Won).length;
    if (t1Wins > h2hMatches.length / 2)
        return 1;
    if (t1Wins === h2hMatches.length / 2)
        return 0;
    return 2;
}

/**
 * @param {{ group: import('./Tournament').TeamStats; bucket: import('./Tournament').TeamStats; }[]} bucketStats
 */
function rankBucket(bucketStats) {
    const ret = bucketStats.slice(0);

    ret.sort((t1, t2) => {
        // Prvoplasirani timovi iz grupa A, B i C se međusobno rangiraju po primarno po broju bodova
        // Ovo nikad neće određivati kada je rangiranje po grupi
        if (t2.group.points - t1.group.points !== 0)
            return t2.group.points - t1.group.points;

        // Koristi se prvo kada imamo konflikt u grupnoj fazi
        if (t2.bucket != null && t1.bucket != null) {
            if (t2.bucket.ptsDiff - t1.bucket.ptsDiff !== 0)
                return t2.bucket.ptsDiff - t1.bucket.ptsDiff;
            if (t2.bucket.ptsFor - t1.bucket.ptsFor !== 0)
                return t2.bucket.ptsFor - t1.bucket.ptsFor;
        }

        // Ref: https://www.fiba.basketball/documents/official-basketball-rules/current.pdf
        //      p. 79
        if (t2.group.ptsDiff - t1.group.ptsDiff !== 0)
            return t2.group.ptsDiff - t1.group.ptsDiff;
        if (t2.group.ptsFor - t1.group.ptsFor !== 0)
            return t2.group.ptsFor - t1.group.ptsFor;
        return t2.group.team.fibaRanking - t1.group.team.fibaRanking;
    });

    return ret.map(s => s.group);
}
exports.rankBucket = rankBucket;

/**
 * @param {import('./Tournament').Tournament} tournament
 * @param {import('./Tournament').TeamStats[]} groupStats
 */
function rankGroup(tournament, groupStats) {
    /** @type {import('./Tournament').TeamStats[][]} */
    const samePts = [];
    let remaining = groupStats.slice(0);

    remaining.sort((a, b) => b.points - a.points);

    while (remaining.length > 0) {
        const adding = [remaining.shift()];
        while (remaining.length > 0 && remaining[0].points === adding[0].points)
            adding.push(remaining.shift());
        samePts.push(adding);
    }

    const extracted = [];

    for (let i = 0; i < samePts.length; i++) {
        const bucket = samePts[i];
        switch (bucket.length) {
        case 1:
            extracted.push(bucket[0]);
            break;
        case 2:
            // U slučaju da dva tima iz iste grupe imaju isti broj bodova,
            // rezultat međusobnog susreta će biti korišćen kao kriterijum za rangiranje
            const s1 = bucket[0], s2 = bucket[1];
            const h2hResult = getH2HResult(tournament, s1.team, s2.team);
            if (h2hResult === 1)
                extracted.push(s1, s2);
            else if (h2hResult === 2)
                extracted.push(s2, s1);
            else
                // Tehnički nikada
                throw new Error(`Head-to-head za ${samePts[i][0].team.isoCode}-${samePts[i][1].team.isoCode} je nerešeno po mečevima`);
            break;
        default:
            // U slučaju da 3 tima iz iste grupe imaju isti broj bodova,
            // kriterijum za rangiranje biće razlika u poenima u međusobnim utakmicama između ta 3 tima
            const bucketTeams = bucket.map(s => s.team);
            const bucketStats = bucket.map(t => ({
                group: t,
                bucket: tournament.compileStatsFor(t.team, bucketTeams)
            }));
            const bucketSorted = rankBucket(bucketStats);
            extracted.push(bucketSorted[0], bucketSorted[1], bucketSorted[2]);
            break;
        }
    }

    return extracted;
}
exports.rankGroup = rankGroup;
