// formFromLastFive.cjs — shared by NBA / NCAAB generators

function sumQuarters(arr) {
  if (typeof arr === "number" && Number.isFinite(arr)) return arr;
  if (typeof arr === "string" && arr.trim() && Number.isFinite(Number(arr))) return Number(arr);
  if (!Array.isArray(arr)) return null;
  let s = 0;
  for (const x of arr) {
    const n = Number(x);
    if (!Number.isFinite(n)) return null;
    s += n;
  }
  return s;
}

function scorePair(game) {
  const state = game && game.state;
  const score = state && state.score;
  let home = score && sumQuarters(score.homeTeam);
  let away = score && sumQuarters(score.awayTeam);
  if (home == null) home = sumQuarters(game.homeScore);
  if (away == null) away = sumQuarters(game.awayScore);
  if (home == null && score) home = sumQuarters(score.home);
  if (away == null && score) away = sumQuarters(score.away);
  if (home == null || away == null) return null;
  return { home, away };
}

/** From Highlightly last-five payload (array of matches). */
function formFromLastFive(teamId, games) {
  const rows = Array.isArray(games) ? games : games && games.data;
  if (!Array.isArray(rows) || rows.length === 0) return null;

  let scored = 0;
  let conceded = 0;
  let n = 0;
  let wins = 0;
  let last = 0;
  const recent = [];

  for (const g of rows) {
    const homeId = g.homeTeam && g.homeTeam.id;
    const awayId = g.awayTeam && g.awayTeam.id;
    const pair = scorePair(g);
    if (!pair) continue;

    let forPts;
    let againstPts;
    if (homeId === teamId) {
      forPts = pair.home;
      againstPts = pair.away;
    } else if (awayId === teamId) {
      forPts = pair.away;
      againstPts = pair.home;
    } else continue;

    scored += forPts;
    conceded += againstPts;
    n++;
    if (forPts > againstPts) wins++;
    const playedAt = new Date(g.date).getTime();
    if (Number.isFinite(playedAt)) last = Math.max(last, playedAt);
    recent.push({
      date: g.date,
      for: forPts,
      against: againstPts,
      opp:
        homeId === teamId
          ? (g.awayTeam && (g.awayTeam.displayName || g.awayTeam.name)) || "?"
          : (g.homeTeam && (g.homeTeam.displayName || g.homeTeam.name)) || "?",
    });
  }

  if (n === 0) return null;
  return {
    games: n,
    n,
    ppg: Math.round((scored / n) * 10) / 10,
    oppPpg: Math.round((conceded / n) * 10) / 10,
    wins,
    last,
    recent,
  };
}

function blendPpg(seasonPpg, form, seasonW, formW) {
  if (!form) return seasonPpg;
  return (
    Math.round((seasonW * seasonPpg + formW * form.ppg) * 10) / 10
  );
}

function blendOpp(seasonOpp, form, seasonW, formW) {
  if (!form) return seasonOpp;
  return (
    Math.round((seasonW * seasonOpp + formW * form.oppPpg) * 10) / 10
  );
}

module.exports = {
  formFromLastFive,
  blendPpg,
  blendOpp,
  sumQuarters,
};
