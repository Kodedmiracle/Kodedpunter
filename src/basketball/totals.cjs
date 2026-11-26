// Full-game total probabilities from a projected points total.
// NBA and college game totals are roughly bell-shaped. A normal curve around
// the projection is a much tighter description than a flat 52/48, and it
// stays near 50% when the projection sits on the line.

function normalCdf(z) {
  const az = Math.abs(z);
  const t = 1 / (1 + 0.2316419 * az);
  const d = 0.3989422804014327 * Math.exp((-z * z) / 2);
  const p =
    d *
    t *
    (0.31938153 +
      t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const lower = z >= 0 ? 1 - p : p;
  return Math.min(1, Math.max(0, lower));
}

function totalOverProbability(projected, line, sigma) {
  const mean = Number(projected);
  const ln = Number(line);
  const sd = Number(sigma);
  if (!Number.isFinite(mean) || !Number.isFinite(ln) || !(sd > 0)) return null;
  const over = 1 - normalCdf((ln - mean) / sd);
  const clipped = Math.min(0.9, Math.max(0.1, over));
  return Math.round(clipped * 1000) / 10;
}

function totalMarket(projected, line, sigma) {
  const over = totalOverProbability(projected, line, sigma);
  if (over == null) return null;
  const under = Math.round((100 - over) * 10) / 10;
  const side = over >= under ? "Over" : "Under";
  const probability = side === "Over" ? over : under;
  let confidence = "LOW";
  if (probability >= 62) confidence = "MEDIUM";
  return {
    line,
    projected: Math.round(Number(projected) * 10) / 10,
    over: { probability: over, confidence: confidence === "MEDIUM" && side === "Over" ? "MEDIUM" : "LOW" },
    under: { probability: under, confidence: confidence === "MEDIUM" && side === "Under" ? "MEDIUM" : "LOW" },
    side,
    probability,
    confidence,
  };
}

const SIGMA = { NBA: 16.5, NCAAB: 14 };

function sigmaFor(competition) {
  return SIGMA[competition] || SIGMA.NBA;
}

module.exports = {
  normalCdf,
  totalOverProbability,
  totalMarket,
  sigmaFor,
  SIGMA,
};
