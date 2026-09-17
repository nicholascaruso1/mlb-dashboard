// netlify/functions/odds.js
// Proxies The Odds API server-side so ODDS_API_KEY never ships to the browser.
// Frontend calls /.netlify/functions/odds?sportKey=...&bookmakers=...&... instead
// of hitting api.the-odds-api.com directly with the key in the URL.

exports.handler = async (event) => {
  const key = process.env.ODDS_API_KEY;
  if (!key) {
    return { statusCode: 500, body: JSON.stringify({ error: "ODDS_API_KEY not configured in Netlify environment variables" }) };
  }

  const {
    sportKey,
    regions = "us",
    markets = "h2h,spreads,totals",
    oddsFormat = "american",
    bookmakers,
    commenceTimeFrom,
    commenceTimeTo,
  } = event.queryStringParameters || {};

  if (!sportKey) {
    return { statusCode: 400, body: JSON.stringify({ error: "sportKey is required" }) };
  }

  const params = new URLSearchParams({ apiKey: key, regions, markets, oddsFormat });
  if (bookmakers) params.set("bookmakers", bookmakers);
  if (commenceTimeFrom) params.set("commenceTimeFrom", commenceTimeFrom);
  if (commenceTimeTo) params.set("commenceTimeTo", commenceTimeTo);

  try {
    const res = await fetch(`https://api.the-odds-api.com/v4/sports/${sportKey}/odds/?${params.toString()}`);
    const data = await res.json();
    if (!res.ok) {
      return { statusCode: res.status, body: JSON.stringify({ error: data?.message || `Odds API error ${res.status}` }) };
    }
    const requestsRemaining = res.headers.get("x-requests-remaining");
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        ...(requestsRemaining != null ? { "x-requests-remaining": requestsRemaining } : {}),
      },
      body: JSON.stringify(data),
    };
  } catch (e) {
    return { statusCode: 502, body: JSON.stringify({ error: e.message }) };
  }
};
