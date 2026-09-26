// sportyMarkets.js
// Best Picks label -> SportyBet share-API fields

const MARKETS = {
  "Home Win": { marketId: "1", outcomeId: "1" },
  "Draw": { marketId: "1", outcomeId: "2" },
  "Away Win": { marketId: "1", outcomeId: "3" },
  "BTTS Yes": { marketId: "29", outcomeId: "74" },
  "BTTS No": { marketId: "29", outcomeId: "76" },
  "Over 2.5": { marketId: "18", outcomeId: "12", specifier: "total=2.5" },
  "Under 2.5": { marketId: "18", outcomeId: "13", specifier: "total=2.5" },
  "Over 1.5": { marketId: "18", outcomeId: "12", specifier: "total=1.5" },
  "Under 1.5": { marketId: "18", outcomeId: "13", specifier: "total=1.5" },
  "Over 3.5": { marketId: "18", outcomeId: "12", specifier: "total=3.5" },
  "Under 3.5": { marketId: "18", outcomeId: "13", specifier: "total=3.5" },
  "Home or Draw": { marketId: "10", outcomeId: "9" },
  "Home or Away": { marketId: "10", outcomeId: "10" },
  "Draw or Away": { marketId: "10", outcomeId: "11" },
};

export function leanToSporty(leanKey) {
  return MARKETS[leanKey] || null;
}
