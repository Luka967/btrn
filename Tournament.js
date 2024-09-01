const { groupSymbol } = require('./constant');

class Team {
    /**
     * @param {string} name
     * @param {string} isoCode
     * @param {number} fibaRanking
     */
    constructor(name, isoCode, fibaRanking) {
        this.name = name;
        this.isoCode = isoCode;
        this.fibaRanking = fibaRanking;
    }

    static fromJson(obj) {
        return new Team(obj.Team, obj.ISOCode, obj.FIBARanking);
    }
}
exports.Team = Team;

class TeamStats {
    /**
     * @param {Team} team
     * @param {Match[]} matches
     */
    constructor(team, matches) {
        let Pld = 0,
            W = 0,
            L = 0,
            PF = 0,
            PA = 0,
            Pts = 0;
        for (const match of matches) {
            Pld++;
            if (match.t1 === team) {
                if (match.t1Won) W++;
                else L++;
                PF += match.result.t1;
                PA += match.result.t2;
                Pts += match.t1Won ? 2 : 1;
            } else {
                if (match.t2Won) W++;
                else L++;
                PF += match.result.t2;
                PA += match.result.t1;
                Pts += match.t2Won ? 2 : 1;
            }
        }
        this.team = team;
        this.matches = matches;
        this.played = Pld;
        this.won = W;
        this.lost = L;
        this.ptsFor = PF;
        this.ptsAgainst = PA;
        this.ptsDiff = PF - PA;
        this.points = Pts;
    }

    inReadableFormat() {
        const teamName = this.team.name.padStart(20);
        const ptsFor = this.ptsFor.toFixed(0).padStart(4);
        const ptsAgainst = this.ptsAgainst.toFixed(0).padEnd(4);
        const ptsDiffS = this.ptsFor - this.ptsAgainst;
        const ptsDiff = Math.abs(ptsDiffS).toFixed(0).padStart(3);
        return `${teamName} ${this.won}W ${this.lost}L ${ptsFor}-${ptsAgainst} ${ptsDiffS < 0 ? '-' : ' '}${ptsDiff}d ${this.points} poena`;
    }
}
exports.TeamStats = TeamStats;

class Match {
    /**
     * @param {Team} t1
     * @param {Team} t2
     * @param {number?} round
     * @param {number?} group
     */
    constructor(t1, t2, round = null, group = null) {
        this.t1 = t1;
        this.t2 = t2;
        /**
         * @type {{ t1: number; t2: number; }}
         */
        this.result = null;

        /** @type {number?} Nula-indeksirano */
        this.round = round;
        /** @type {number?} Nula-indeksirano */
        this.group = group;

        this.isUpset = false;
        this.t1WinChance = NaN;
    }

    get finished() { return this.result != null; }
    get t1Won() { return this.result != null && this.result.t1 > this.result.t2; }
    get t2Won() { return this.result != null && this.result.t2 > this.result.t1; }
    get winner() {
        if (this.result == null)
            return null;
        if (this.result.t1 > this.result.t2)
            return this.t1;
        if (this.result.t2 > this.result.t1)
            return this.t2;
        return null;
    }
    get loser() {
        if (this.result == null)
            return null;
        if (this.result.t1 > this.result.t2)
            return this.t2;
        if (this.result.t2 > this.result.t1)
            return this.t1;
        return null;
    }

    inReadableFormat() {
        const t1Name = this.t1.name.padStart(20);
        const t2Name = this.t2.name.padEnd(20);
        const t1Won = this.t1Won ? 'W' : ' ';
        const t2Won = this.t2Won ? 'W' : ' ';
        const t1Pts = this.result.t1.toFixed(0).padStart(3);
        const t2Pts = this.result.t2.toFixed(0).padEnd(3);

        let base = `${t1Name} (${(this.t1WinChance * 100).toFixed(1).padStart(4)}%) ${t1Won} ${t1Pts}:${t2Pts} ${t2Won} ${t2Name}`;
        if (this.isUpset) base += ' [PREVRNUĆE]';

        if (this.group != null)
            return `Grupa ${groupSymbol[this.group]} | ${base}`;
        else
            return base;
    }
}
exports.Match = Match;

class TournamentFormat {
    /**
     * @param {Tournament} tournament
     */
    constructor(tournament) {
        this.tournament = tournament;
    }

    /**
     * @param {Match} completedMatch
     * @returns {boolean}
     */
    advance(completedMatch) {}
}
exports.TournamentFormat = TournamentFormat;

class RoundRobinFormat extends TournamentFormat {
    /**
     * @param {Tournament} tournament
     * @param {(participants: Team[]) => Team[][]} seeder
     */
    constructor(tournament, seeder) {
        super(tournament);

        this.groups = seeder(tournament.participants);

        /** @type {Match[][][]} */
        const roundsPerGroup = new Array(this.groups.length).fill(null).map(() => []);

        for (let gi = 0; gi < this.groups.length; gi++) {
            const groupTeams = this.groups[gi];
            const groupTeamCount = groupTeams.length;
            const groupRounds = roundsPerGroup[gi];
            groupRounds.push(...new Array(groupTeamCount - 1).fill(null).map(() => []));

            /*
                Kola u Olimpijskim igrama se generišu kružnom metodom gde tim 4 ostaje na mestu
                https://en.wikipedia.org/wiki/Round-robin_tournament#Circle_method

                Neka je početna kombinacija ova:
                    12
                    43
                Mečevi prvog kola se prave čitajući sleva nadole; dobijamo 1-4 2-3
                Za 1. grupu to je bilo AUS - ESP, GRE - CAN
                Odatle možemo odrediti seed-ove: 1=AUS 2=GRE 3=CAN 4=ESP
                Za sledeću kombinaciju 4 ostaje na istom mestu a ostali seed-ovi se pomeraju counterclockwise:
                    23
                    41
                Mečevi su onda 2-4 3-1, tj. GRE - ESP, CAN - AUS
                Pošto je Španija već bila na toj strani (u šahu to bi značilo da je ponovo crni igrač)
                tu će se obrnuti redosled seed-ova prvog meča, pa bi konačni mečevi bili
                4-2 3-1, tj. ESP - GRE, CAN - AUS; što se poklapa!
                Na kraju za treće kolo imamo:
                    31
                    42
                odatle 3-4 1-2, tj. CAN - ESP, AUS - GRE
                što se skoro poklapa. Zbog nekog razloga (verovatno zbog određivanja termina)
                na Olimpijskim igrama redosled tih mečeva se takođe obrne.
                Nama to suštinski nije bitno. Samo moramo dobiti istu i predvidivu kombinaciju mečeva
            */

            const rounds = groupTeamCount - 1;
            // Svako kolo će imati n / 2 mečeva, tj. 2 za nas
            // U slučaju da je neparan broj jedan tim dobija bye https://en.wikipedia.org/wiki/Bye_(sports)
            // koji se ne računa kao meč
            const matchesPerRound = Math.floor(groupTeamCount / 2);

            // Ovaj broj u kombinaciji:
            //  [1] 2
            //   4  3
            // je ujedno i broj kola i seed koji ima meč sa protivnikom N (4)
            for (let ri = 0; ri < rounds; ri++) {
                groupRounds[ri].push(new Match(
                    ri % 2 === 1 ? groupTeams[3] : groupTeams[ri],
                    ri % 2 === 1 ? groupTeams[ri] : groupTeams[3],
                    ri, gi
                ));

                for (let mi = 1; mi < matchesPerRound; mi++) {
                    let topSeed = ri + mi,
                        botSeed = ri - mi;
                    // Mečevi posle prvog ne mogu ići protiv protivnika seed N (4), te ako dođe do seed N, okrećemo
                    if (topSeed >= rounds)
                        topSeed -= rounds;
                    // Donji seed ide unazad, ali analogno gore vraća se na seed N-1
                    if (botSeed < 0)
                        botSeed = rounds + botSeed;
                    groupRounds[ri].push(new Match(groupTeams[topSeed], groupTeams[botSeed], ri, gi));
                }
            }
        }

        // Svrstaj mečeve poređanim po grupama sada po kolu
        /** @type {Match[][]} */
        this.rounds = [];
        for (const thisGroupRounds of roundsPerGroup) {
            while (this.rounds.length < thisGroupRounds.length)
                this.rounds.push([]);
            for (let i = 0; i < thisGroupRounds.length; i++)
                this.rounds[i].push(...thisGroupRounds[i]);
        }

        // Započni turnir
        this.tournament.pendingMatches.push(...this.rounds[0]);
        this.currentRound = 0;
    }

    /**
     * @param {Match} completedMatch
     * @returns Da li turnir ima još mečeva
     */
    advance(completedMatch) {
        if (this.tournament.pendingMatches.length > 0)
            // Dopunjuj sa novim mečevima tek kad se celo kolo završi
            return true;
        if (++this.currentRound >= this.rounds.length)
            return false;
        this.tournament.pendingMatches.push(...this.rounds[this.currentRound]);
        return true;
    }
}
exports.RoundRobinFormat = RoundRobinFormat;

class SingleEliminationFormat extends TournamentFormat {
    /**
     * @param {Tournament} tournament
     * @param {(participants: Team[]) => { t1: Team; t2: Team; }[]} seeder
     */
    constructor(tournament, seeder) {
        super(tournament);

        const round1 = seeder(tournament.participants)
            .map(matchup => new Match(matchup.t1, matchup.t2, 0));

        this.rounds = [round1];
        /** @type {Match?} Ujedno označava da li je ovo poslednja runda turnira */
        this.thirdPlaceMatch = null;

        this.tournament.pendingMatches.push(...round1);
    }

    advance(match) {
        if (this.tournament.pendingMatches.length > 0)
            return true;
        if (this.thirdPlaceMatch != null)
            // Ovo je bila poslednja runda
            return false;

        const oldRound = this.rounds[this.rounds.length - 1];
        const newRound = [];
        const newRoundIdx = this.rounds.length; // Match traži nula-indeksiran
        for (let i = 0; i < oldRound.length;)
            newRound.push(new Match(oldRound[i++].winner, oldRound[i++].winner, newRoundIdx));

        if (newRound.length === 1) {
            newRound[0].round++; // Da se razlikuje od ovog meča
            this.thirdPlaceMatch = new Match(oldRound[0].loser, oldRound[1].loser, newRoundIdx);
            this.tournament.pendingMatches.push(this.thirdPlaceMatch); // Da bude prvi u nizu prilikom vađenja u index.js
        }

        this.rounds.push(newRound);
        this.tournament.pendingMatches.push(...newRound);
        return true;
    }
}
exports.SingleEliminationFormat = SingleEliminationFormat;

class Tournament {
    /**
     * @param {Team[]} participants
     */
    constructor(participants) {
        this.participants = participants;
        /** @type {TournamentFormat} */
        this.format = null;

        /** @type {Match[]} */
        this.completedMatches = [];
        /** @type {Match[]} */
        this.pendingMatches = [];
    }

    /**
     * @param {Match} match
     * @returns Da li turnir ima još mečeva
     */
    markMatchComplete(match) {
        this.pendingMatches.splice(this.pendingMatches.indexOf(match), 1);
        this.completedMatches.push(match);
        return this.format.advance(match);
    }

    /**
     * Izračunaj statistiku za određeni tim koristeći sve mečeve
     * ili samo one koji su bili protiv određenih protivnika
     * @param {Team} team
     * @param {Team[]} opponents
     * @returns {TeamStats}
     */
    compileStatsFor(team, opponents = null) {
        const matches = [];
        for (const match of this.completedMatches) {
            if (match.t1 !== team && match.t2 !== team)
                continue;
            const otherTeam = match.t1 === team ? match.t2 : match.t1;
            if (opponents != null && !opponents.includes(otherTeam))
                continue;
            matches.push(match);
        }
        return new TeamStats(team, matches);
    }
}

exports.Tournament = Tournament;
