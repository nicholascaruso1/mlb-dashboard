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
const UPSTREAM_TIMEOUT_MS = 8000;                // fail fast with a real error instead of a silent platform 502

function cacheKeyFor(p) {
  return `odds:${p.sportKey}:${p.bookmakers||""}:${p.markets}:${p.regions}:${p.commenceTimeFrom||""}:${p.commenceTimeTo||""}`;
}

// Everything Blobs-related is a nice-to-have (quota protection), never load-
// bearing — if the store can't even be opened, or any read/write on it throws
// for any reason, these all resolve to "act as if there's no cache" rather than
// letting the error escape and crash the whole function. A previous version of
// this file called getStore() at the top level, outside any try/catch — if
// that ever threw, it took the whole request down as a bare platform 502 with
// no JSON body (same failure mode nfl-context.js already documents for a slow
// ESPN response). This version never lets a caching failure become a user-
// facing outage of the actual feature.
function safeGetStore(name) {
  try { return getStore(name); } catch { return null; }
}
async function getCached(store, key) {
  if (!store) return null;
  try { return await store.get(key, { type: "json" }); } catch { return null; }
}
async function setCached(store, key, value) {
  if (!store) return;
  try { await store.setJSON(key, value); } catch { /* fail open */ }
}
async function checkGlobalCap(store) {
  if (!store) return true; // no store → can't track a cap → fail open
  const now = Date.now();
  let rec = null;
  try { rec = await store.get("global-hourly-count", { type: "json" }); } catch {}
  if (!rec || now - rec.windowStart > 60 * 60 * 1000) rec = { windowStart: now, count: 0 };
  rec.count += 1;
  try { await store.setJSON("global-hourly-count", rec); } catch { return true; } // fail open
  return rec.count <= GLOBAL_HOURLY_CAP;
}

async function fetchUpstream(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

exports.handler = async (event) => {
  try {
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

    const store = safeGetStore("odds-cache");
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
    if (!underCap && cached) {
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
    // Either under the cap, or over it with no cache at all yet for this exact
    // query — let the live call through rather than returning nothing; the cap
    // mainly bites repeat/bot traffic, not the very first legitimate request.

    const params = new URLSearchParams({ apiKey: key, regions, markets, oddsFormat });
    if (bookmakers) params.set("bookmakers", bookmakers);
    if (commenceTimeFrom) params.set("commenceTimeFrom", commenceTimeFrom);
    if (commenceTimeTo) params.set("commenceTimeTo", commenceTimeTo);

    let res, data;
    try {
      res = await fetchUpstream(`https://api.the-odds-api.com/v4/sports/${sportKey}/odds/?${params.toString()}`, UPSTREAM_TIMEOUT_MS);
      data = await res.json();
    } catch (e) {
      const timedOut = e.name === "AbortError";
      // If the live call fails and we have ANY cached copy (even long stale),
      // serve it rather than surfacing a hard error — a stale line beats no
      // line, and this is exactly the kind of failure (slow/unreachable
      // upstream) a cache should be absorbing for the user.
      if (cached) {
        return {
          statusCode: 200,
          headers: {
            "Content-Type": "application/json",
            ...(cached.requestsRemaining != null ? { "x-requests-remaining": String(cached.requestsRemaining) } : {}),
            "x-server-cache": "stale-upstream-error",
          },
          body: JSON.stringify(cached.data),
        };
      }
      return { statusCode: 502, body: JSON.stringify({ error: timedOut ? "Odds API request timed out" : e.message }) };
    }

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
    // Last-resort catch-all: whatever broke, return a real JSON error instead
    // of letting the function crash into a bare platform 502 with no body.
    return { statusCode: 502, body: JSON.stringify({ error: `Unexpected error: ${e.message}` }) };
  }
};
