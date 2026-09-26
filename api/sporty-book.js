const LIST_URL =
  "https://www.sportybet.com/api/ng/factsCenter/pcUpcomingEvents" +
  "?sportId=sr:sport:1&marketId=1,18,10,29&pageSize=100&pageNum=1&option=1";

const SHARE_URL =
  "https://www.sportybet.com/api/ng/orders/share?throwInvalidEvent=true";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Linux; Android 12; Mobile) AppleWebKit/537.36 Chrome/122.0.0.0 Mobile Safari/537.36",
  Referer: "https://www.sportybet.com/ng/sport/football",
  Origin: "https://www.sportybet.com",
  Accept: "application/json, text/plain, */*",
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    if (req.method === "GET") {
      const r = await fetch(LIST_URL + "&_t=" + Date.now(), { headers: HEADERS });
      const json = await r.json();
      if (json.bizCode !== 10000) {
        return res.status(502).json({ ok: false, message: json.message || "list failed", bizCode: json.bizCode });
      }
      const events = [];
      for (const tour of json.data.tournaments || []) {
        for (const ev of tour.events || []) {
          events.push({
            eventId: ev.eventId,
            league: tour.name,
            home: ev.homeTeamName,
            away: ev.awayTeamName,
            start: ev.estimateStartTime,
          });
        }
      }
      return res.status(200).json({ ok: true, count: events.length, events });
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
        body: JSON.stringify({ outcomes }),
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
        shareURL: json.data.shareURL || `https://www.sportybet.com/ng/?shareCode=${json.data.shareCode}`,
      });
    }

    return res.status(405).json({ ok: false, message: "GET or POST only" });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
}
