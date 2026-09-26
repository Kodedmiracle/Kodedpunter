// sportyNames.js
// Turns "Manchester United" and "Man Utd" into the same key
// so we can match Kodedpunter teams to SportyBet teams.

const ALIASES = {
  "manchester united": "man utd",
  "man united": "man utd",
  "tottenham hotspur": "tottenham",
  "spurs": "tottenham",
  "brighton hove albion": "brighton",
  "afc bournemouth": "bournemouth",
  "bournemouth": "bournemouth",
  "hull city afc": "hull city",
  "nottingham forest": "nottingham forest",
  "newcastle united": "newcastle",
  "west ham united": "west ham",
  "wolverhampton wanderers": "wolves",
  "leicester city": "leicester",
  "internazionale": "inter",
  "fc internazionale milano": "inter",
  "inter milan": "inter",
  "ac milan": "milan",
  "ssc napoli": "napoli",
  "as roma": "roma",
  "ss lazio": "lazio",
  "juventus": "juventus",
  "atletico madrid": "atletico madrid",
  "club atletico de madrid": "atletico madrid",
  "atletico de madrid": "atletico madrid",
  "fc barcelona": "barcelona",
  "real madrid cf": "real madrid",
  "athletic club": "athletic bilbao",
  "athletic bilbao": "athletic bilbao",
  "rcd espanyol de barcelona": "espanyol",
  "villarreal cf": "villarreal",
  "getafe cf": "getafe",
  "bayern munchen": "bayern",
  "fc bayern munchen": "bayern",
  "bayern munich": "bayern",
  "borussia dortmund": "dortmund",
  "borussia monchengladbach": "gladbach",
  "bayer 04 leverkusen": "leverkusen",
  "bayer leverkusen": "leverkusen",
  "rb leipzig": "leipzig",
  "eintracht frankfurt": "frankfurt",
  "paris saint germain": "psg",
  "paris saint-germain": "psg",
  "olympique lyonnais": "lyon",
  "olympique marseille": "marseille",
  "lille osc": "lille",
  "ogc nice": "nice",
  "as monaco": "monaco",
  "stade rennais 1901": "rennes",
  "stade rennais": "rennes",
  "racing club de lens": "lens",
  "sporting clube de portugal": "sporting",
  "club brugge kv": "club brugge",
  "galatasaray sk": "galatasaray",
  "sk slavia praha": "slavia prague",
};

function stripAccents(s) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizeTeam(name) {
  if (!name) return "";
  let s = stripAccents(String(name).toLowerCase());
  s = s.replace(/&/g, " ");
  s = s.replace(/[^a-z0-9]+/g, " ");
  s = s.replace(
    /\b(fc|cf|afc|cfc|sc|sk|ssc|ss|ac|as|rc|rcd|ca|us|ogc|osc|sv|vfb|tsg|1)\b/g,
    " "
  );
  s = s.replace(/\b(19|20)\d{2}\b/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  if (ALIASES[s]) return ALIASES[s];
  return s;
}

export function sameTeam(a, b) {
  const na = normalizeTeam(a);
  const nb = normalizeTeam(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

export function sameMatch(ourHome, ourAway, sbHome, sbAway) {
  return sameTeam(ourHome, sbHome) && sameTeam(ourAway, sbAway);
}
