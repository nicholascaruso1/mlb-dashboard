// netlify/functions/odds.js
// Proxies The Odds API server-side so ODDS_API_KEY never ships to the browser.
// Frontend calls /.netlify/functions/odds?sportKey=...&bookmakers=...&... instead
// of hitting api.the-odds-api.com directly with the key in the URL.
//
// PROTECTION: this endpoint is publicly reachable with no auth layer (same
// caveat as ai-analysis.js) and every call costs a real Odds API credit with a
// finite monthly quota — unlike ai-analysis.js there was previously no cache or
// rate limit here at all, so any bot/crawler/repeat page-load against the public
// URL burned quota with nothing to absorb it. Two layers of defense, both via
// Netlify Blobs (already used for ai-analysis.js's rate limiter):
//   1. Server-side response cache, keyed by the exact query params, so repeat
//      requests for the same sport/market within SERVER_CACHE_TTL_MS are served
//      from cache at zero credit cost — this helps even for legitimate use,
//      since the client's own localStorage cache is per-browser/per-device and
//      doesn't cover a second device, an incognito tab, or a bot re-fetching.
//   2. A global (not per-IP) hourly cap on live upstream calls. Once hit, serves
//      the last cached response even if stale rather than making another live
//      call — a hard ceiling protecting the finite monthly quota from any single
//      source hammering this endpoint, distributed or not.

const { getStore } = require("@netlify/blobs");

const SERVER_CACHE_TTL_MS = 5 * 60 * 1000;      // 5 min — absorbs bursts/duplicate hits without staling data much
const GLOBAL_HOURLY_CAP = 40;                    // live upstream calls per rolling hour, across ALL callers

function cacheKeyFor(p) {
  return `odds:${p.sportKey}:${p.bookmakers||""}:${p.markets}:${p.regions}:${p.commenceTimeFrom||""}:${p.commenceTimeTo||""}`;
}

async function getCached(store, key) {
  try { return await store.get(key, { type: "json" }); } catch { return null; }
}
async function setCached(store, key, value) {
  try { await store.setJSON(key, value); } catch { /* fail open — caching is a nice-to-have, not load-bearing */ }
}

async function checkGlobalCap(store) {
  const now = Date.now();
  let rec = null;
  try { rec = await store.get("global-hourly-count", { type: "json" }); } catch {}
  if (!rec || now - rec.windowStart > 60 * 60 * 1000) rec = { windowStart: now, count: 0 };
  rec.count += 1;
  try { await store.setJSON("global-hourly-count", rec); } catch { return true; } // fail open
  return rec.count <= GLOBAL_HOURLY_CAP;
}

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

  const store = getStore("odds-cache");
  const cacheKey = cacheKeyFor({ sportKey, regions, markets, oddsFormat, bookmakers, commenceTimeFrom, commenceTimeTo });
  const cached = await getCached(store, cacheKey);
  const now = Date.now();

  if (cached && now - cached.ts < SERVER_CACHE_TTL_MS) {
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        ...(cached.requestsRemaining != null ? { "x-requests-remaining": String(cached.requestsRemaining) } : {}),
        "x-server-cache": "hit",
      },
      body: JSON.stringify(cached.data),
    };
  }

  const underCap = await checkGlobalCap(store);
  if (!underCap) {
    if (cached) {
      // Over the global hourly cap — serve the last known data (even if stale)
      // rather than spend another live credit. Better a slightly old line than
      // no line and no protection for the monthly quota.
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          ...(cached.requestsRemaining != null ? { "x-requests-remaining": String(cached.requestsRemaining) } : {}),
          "x-server-cache": "stale-over-cap",
        },
        body: JSON.stringify(cached.data),
      };
    }
    // No cache at all yet for this exact query — let it through rather than
    // returning nothing; the cap mainly bites repeat/bot traffic, not the very
    // first legitimate request for a given sport.
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
    await setCached(store, cacheKey, { data, requestsRemaining, ts: now });
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        ...(requestsRemaining != null ? { "x-requests-remaining": requestsRemaining } : {}),
        "x-server-cache": "miss",
      },
      body: JSON.stringify(data),
    };
  } catch (e) {
    return { statusCode: 502, body: JSON.stringify({ error: e.message }) };
  }
};
