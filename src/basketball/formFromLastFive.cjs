// formFromLastFive.cjs — shared by NBA / NCAAB generators

function sumQuarters(arr) {
  if (!Array.isArray(arr)) return null;
  let s = 0;
  for (const x of arr) {
    const n = Number(x);
    if (!Number.isFinite(n)) return null;
    s += n;
  }
  return s;
}

/** From Highlightly last-five payload (array of matches). */
function formFromLastFive(teamId, games) {
  const rows = Array.isArray(games) ? games : games && games.data;
  if (!Array.isArray(rows) || rows.length === 0) return null;

  let scored = 0;
  let conceded = 0;
  let n = 0;
  const recent = [];

  for (const g of rows) {
    const homeId = g.homeTeam && g.homeTeam.id;
    const awayId = g.awayTeam && g.awayTeam.id;
    const hs = sumQuarters(g.state && g.state.score && g.state.score.homeTeam);
    const as = sumQuarters(g.state && g.state.score && g.state.score.awayTeam);
    if (hs == null || as == null) continue;

    let forPts;
    let againstPts;
    if (homeId === teamId) {
      forPts = hs;
      againstPts = as;
    } else if (awayId === teamId) {
      forPts = as;
      againstPts = hs;
    } else continue;

    scored += forPts;
    conceded += againstPts;
    n++;
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
    ppg: Math.round((scored / n) * 10) / 10,
    oppPpg: Math.round((conceded / n) * 10) / 10,
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
