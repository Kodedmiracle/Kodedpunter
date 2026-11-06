// Extra football booking markets. IDs verified from SportyBet's own feed.
// Probabilities come from the model's expectedGoals / scoreMatrix.

const FIRST_HALF_SHARE = 0.45; // approximation: ~45% of goals come in the first half

function poissonCdf(k, mu) {
  let term = Math.exp(-mu);
  let sum = term;
  for (let i = 1; i <= k; i++) {
    term = (term * mu) / i;
    sum += term;
  }
  return Math.min(1, sum);
}

function matrixProb(m, test) {
  const sm = m.prediction && m.prediction.scoreMatrix;
  if (!sm) return null;
  let p = 0;
  for (let h = 0; h < sm.length; h++) {
    for (let a = 0; a < sm[h].length; a++) {
      if (test(h, a)) p += sm[h][a];
    }
  }
  return p;
}

function firstHalfUnder(line) {
  return (m) => {
    const xg = m.prediction && m.prediction.expectedGoals;
    if (!xg) return null;
    const mu = FIRST_HALF_SHARE * (xg.home + xg.away);
    return poissonCdf(Math.floor(line), mu) * 100;
  };
}

export const BOOK_OPTIONS = [
  { key: "1h_u35", label: "1st Half Under 3.5", minProb: 92, approx: true,
    sporty: { marketId: "68", outcomeId: "13", specifier: "total=3.5" }, prob: firstHalfUnder(3.5) },
  { key: "1h_u25", label: "1st Half Under 2.5", minProb: 82, approx: true,
    sporty: { marketId: "68", outcomeId: "13", specifier: "total=2.5" }, prob: firstHalfUnder(2.5) },
  { key: "1h_u15", label: "1st Half Under 1.5", minProb: 68, approx: true,
    sporty: { marketId: "68", outcomeId: "13", specifier: "total=1.5" }, prob: firstHalfUnder(1.5) },
  { key: "ft_u45", label: "Full-time Under 4.5", minProb: 92,
    sporty: { marketId: "18", outcomeId: "13", specifier: "total=4.5" }, prob: (m) => matrixProb(m, (h, a) => h + a <= 4) },
  { key: "dc_hd_u45", label: "Home or Draw & Under 4.5", minProb: 65,
    sporty: { marketId: "547", outcomeId: "1724", specifier: "total=4.5" }, prob: (m) => matrixProb(m, (h, a) => h >= a && h + a <= 4) },
  { key: "dc_ha_u45", label: "Home or Away & Under 4.5", minProb: 65,
    sporty: { marketId: "547", outcomeId: "1725", specifier: "total=4.5" }, prob: (m) => matrixProb(m, (h, a) => h !== a && h + a <= 4) },
  { key: "dc_da_u45", label: "Draw or Away & Under 4.5", minProb: 65,
    sporty: { marketId: "547", outcomeId: "1726", specifier: "total=4.5" }, prob: (m) => matrixProb(m, (h, a) => a >= h && h + a <= 4) },
];

export function oddsKey(sporty) {
  return sporty.marketId + "|" + (sporty.specifier || "") + "|" + sporty.outcomeId;
}
