function skipReason(key) {
  if (key) return null;
  return (
    "API_FOOTBALL_KEY is not set, so extra-league collection is skipped and existing data files are left as they are. " +
    "The seven main leagues still update with FOOTBALL_API_KEY. " +
    "Adding API_FOOTBALL_KEY would refresh fixtures outside those leagues and keep the historical results file growing, which is what the extra predictions on the home page and future backtests use. " +
    "It does not change the accuracy of the main seven-league model."
  );
}

module.exports = { skipReason };
