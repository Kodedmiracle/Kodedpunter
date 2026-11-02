const SHARE_URL =
  "https://www.sportybet.com/api/ng/orders/share?throwInvalidEvent=true";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Linux; Android 12; Mobile) AppleWebKit/537.36 Chrome/122.0.0.0 Mobile Safari/537.36",
  Referer: "https://www.sportybet.com/ng/",
  Origin: "https://www.sportybet.com",
  Accept: "application/json, text/plain, */*",
};

const FOOTBALL = {
  sportId: "sr:sport:1",
  marketId: "1,18,10,29",
  referer: "https://www.sportybet.com/ng/sport/football",
  keepLines: new Set(["", "total=0.5", "total=1.5", "total=2.5", "total=3.5"]),
};

const BASKETBALL = {marketId: "219,225,68,228,1,18",
  sportId: "sr:sport:2",
  // 219 = winner (common), 225 = total points (common) — we keep whatever comes back
  marketId: "219,225,1,18",
  referer: "https://www.sportybet.com/ng/sport/basketball",
  keepLines: null,
};

function oddsFor(ev, keepLines) {
  const out = {};
  for (const m of ev.markets || []) {
    const spec = m.specifier || "";
    if (keepLines && m.id === "18" && !keepLines.has(spec)) continue;
    for (const o of m.outcomes || []) {
      if (o.isActive !== 1) continue;
      const v = parseFloat(o.odds);
      if (v > 1) out[m.id + "|" + spec + "|" + o.id] = v;
    }
  }
  return out;
}

function listUrl(cfg, pageNum) {
  return (
    "https://www.sportybet.com/api/ng/factsCenter/pcUpcomingEvents" +
    "?sportId=" +
    cfg.sportId +
    "&marketId=" +
    cfg.marketId +
    "&pageSize=100&option=1&pageNum=" +
    pageNum +
    "&_t=" +
    Date.now()
  );
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    if (req.method === "GET") {
      const sport = (req.query.sport || "football").toLowerCase();
      const cfg = sport === "basketball" || sport === "nba" ? BASKETBALL : FOOTBALL;
      const headers = { ...HEADERS, Referer: cfg.referer };

      const events = [];
      const seen = new Set();
      const pages = sport === "basketball" || sport === "nba" ? 6 : 12;

      for (let page = 1; page <= pages; page++) {
        const r = await fetch(listUrl(cfg, page), { headers });
        const json = await r.json();
        if (json.bizCode !== 10000) continue;
        for (const tour of json.data.tournaments || []) {
          for (const ev of tour.events || []) {
            if (seen.has(ev.eventId)) continue;
            seen.add(ev.eventId);
            events.push({
              eventId: ev.eventId,
              league: tour.name,
              home: ev.homeTeamName,
              away: ev.awayTeamName,
              start: ev.estimateStartTime,
              odds: oddsFor(ev, cfg.keepLines),
              marketsRaw: (ev.markets || []).map((m) => ({
                id: m.id,
                specifier: m.specifier || "",
                outcomes: (m.outcomes || [])
                  .filter((o) => o.isActive === 1)
                  .map((o) => ({ id: o.id, desc: o.desc || o.name, odds: o.odds })),
              })),
            });
          }
        }
      }

      return res.status(200).json({
        ok: true,
        sport,
        count: events.length,
        events,
      });
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      const outcomes = body.outcomes;
      if (!Array.isArray(outcomes) || outcomes.length === 0) {
        return res.status(400).json({ ok: false, message: "outcomes array required" });
      }
      const r = await fetch(SHARE_URL, {
        method: "POST",
        headers: { ...HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({ selections: outcomes }),
      });
      const json = await r.json();
      if (json.bizCode !== 10000 || !json.data || !json.data.shareCode) {
        return res.status(502).json({
          ok: false,
          message: json.message || "SportyBet did not return a code",
          bizCode: json.bizCode,
        });
      }
      return res.status(200).json({
        ok: true,
        shareCode: json.data.shareCode,
        shareURL:
          json.data.shareURL ||
          "https://www.sportybet.com/ng/?shareCode=" + json.data.shareCode,
      });
    }

    return res.status(405).json({ ok: false, message: "GET or POST only" });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
}
