import { useState, useEffect } from "react";

const SHARP_BOOKS = ["pinnacle", "bookmaker", "lowvig"];
const ALL_BOOKS   = ["pinnacle", "draftkings", "fanduel", "betmgm", "caesars", "bookmaker", "lowvig", "betonlineag"];

const SPORTS = [
  { key: "MLB",    label: "MLB",    emoji: "⚾", oddsKey: "baseball_mlb" },
  { key: "NFL",    label: "NFL",    emoji: "🏈", oddsKey: "americanfootball_nfl" },
  { key: "NBA",    label: "NBA",    emoji: "🏀", oddsKey: "basketball_nba" },
  { key: "NHL",    label: "NHL",    emoji: "🏒", oddsKey: "icehockey_nhl" },
  { key: "NCAAF",  label: "NCAAF",  emoji: "🏈", oddsKey: "americanfootball_ncaaf" },
  { key: "NCAAB",  label: "NCAAB",  emoji: "🏀", oddsKey: "basketball_ncaab" },
  { key: "SOCCER", label: "Soccer", emoji: "⚽", oddsKey: "soccer_usa_mls" },
];

// NOTE: netlify/functions/nfl-context.js independently maintains its own
// TEAM_IDS map keyed by these same NFL abbreviations (to resolve ESPN's numeric
// team IDs). There's no shared source between the two files — if you rename or
// add an NFL abbreviation here, check that file too, or the injury-report lookup
// will silently start pulling the wrong team's data (or none) for that team.
const TEAM_ABBR = {
  "Arizona Diamondbacks":"ARI","Atlanta Braves":"ATL","Baltimore Orioles":"BAL","Boston Red Sox":"BOS","Chicago Cubs":"CHC","Chicago White Sox":"CWS","Cincinnati Reds":"CIN","Cleveland Guardians":"CLE","Colorado Rockies":"COL","Detroit Tigers":"DET","Houston Astros":"HOU","Kansas City Royals":"KC","Los Angeles Angels":"LAA","Los Angeles Dodgers":"LAD","Miami Marlins":"MIA","Milwaukee Brewers":"MIL","Minnesota Twins":"MIN","New York Mets":"NYM","New York Yankees":"NYY","Oakland Athletics":"OAK","Philadelphia Phillies":"PHI","Pittsburgh Pirates":"PIT","San Diego Padres":"SD","San Francisco Giants":"SF","Seattle Mariners":"SEA","St. Louis Cardinals":"STL","Tampa Bay Rays":"TB","Texas Rangers":"TEX","Toronto Blue Jays":"TOR","Washington Nationals":"WSH",
  "Arizona Cardinals":"ARI","Atlanta Falcons":"ATL","Baltimore Ravens":"BAL","Buffalo Bills":"BUF","Carolina Panthers":"CAR","Chicago Bears":"CHI","Cincinnati Bengals":"CIN","Cleveland Browns":"CLE","Dallas Cowboys":"DAL","Denver Broncos":"DEN","Detroit Lions":"DET","Green Bay Packers":"GB","Houston Texans":"HOU","Indianapolis Colts":"IND","Jacksonville Jaguars":"JAX","Kansas City Chiefs":"KC","Las Vegas Raiders":"LV","Los Angeles Chargers":"LAC","Los Angeles Rams":"LAR","Miami Dolphins":"MIA","Minnesota Vikings":"MIN","New England Patriots":"NE","New Orleans Saints":"NO","New York Giants":"NYG","New York Jets":"NYJ","Philadelphia Eagles":"PHI","Pittsburgh Steelers":"PIT","San Francisco 49ers":"SF","Seattle Seahawks":"SEA","Tampa Bay Buccaneers":"TB","Tennessee Titans":"TEN","Washington Commanders":"WSH",
  "Atlanta Hawks":"ATL","Boston Celtics":"BOS","Brooklyn Nets":"BKN","Charlotte Hornets":"CHA","Chicago Bulls":"CHI","Cleveland Cavaliers":"CLE","Dallas Mavericks":"DAL","Denver Nuggets":"DEN","Detroit Pistons":"DET","Golden State Warriors":"GS","Houston Rockets":"HOU","Indiana Pacers":"IND","Los Angeles Clippers":"LAC","Los Angeles Lakers":"LAL","Memphis Grizzlies":"MEM","Miami Heat":"MIA","Milwaukee Bucks":"MIL","Minnesota Timberwolves":"MIN","New Orleans Pelicans":"NO","New York Knicks":"NYK","Oklahoma City Thunder":"OKC","Orlando Magic":"ORL","Philadelphia 76ers":"PHI","Phoenix Suns":"PHX","Portland Trail Blazers":"POR","Sacramento Kings":"SAC","San Antonio Spurs":"SA","Toronto Raptors":"TOR","Utah Jazz":"UTA","Washington Wizards":"WSH",
  "Anaheim Ducks":"ANA","Boston Bruins":"BOS","Buffalo Sabres":"BUF","Calgary Flames":"CGY","Carolina Hurricanes":"CAR","Chicago Blackhawks":"CHI","Colorado Avalanche":"COL","Columbus Blue Jackets":"CBJ","Dallas Stars":"DAL","Detroit Red Wings":"DET","Edmonton Oilers":"EDM","Florida Panthers":"FLA","Los Angeles Kings":"LAK","Minnesota Wild":"MIN","Montreal Canadiens":"MTL","Nashville Predators":"NSH","New Jersey Devils":"NJ","New York Islanders":"NYI","New York Rangers":"NYR","Ottawa Senators":"OTT","Philadelphia Flyers":"PHI","Pittsburgh Penguins":"PIT","San Jose Sharks":"SJ","Seattle Kraken":"SEA","St. Louis Blues":"STL","Tampa Bay Lightning":"TB","Toronto Maple Leafs":"TOR","Utah Hockey Club":"UTA","Vancouver Canucks":"VAN","Vegas Golden Knights":"VGK","Washington Capitals":"WSH","Winnipeg Jets":"WPG",
};

function abbr(name) {
  if (TEAM_ABBR[name]) return TEAM_ABBR[name];
  const words = name.split(" ");
  return words[words.length-1].slice(0,3).toUpperCase();
}

// ── Display names: show school identity, not mascot abbreviation ──────────────
const COLLEGE_DISPLAY_MAP = {
  "Penn State Nittany Lions":"Penn State","Georgia Tech Yellow Jackets":"Georgia Tech",
  "North Texas Mean Green":"North Texas","Louisiana State Tigers":"LSU",
  "Texas A&M Aggies":"Texas A&M","Ole Miss Rebels":"Ole Miss",
  "Mississippi State Bulldogs":"Miss. State","North Carolina Tar Heels":"N. Carolina",
  "North Carolina State Wolfpack":"NC State","Ohio State Buckeyes":"Ohio State",
  "Oregon State Beavers":"Oregon State","Michigan State Spartans":"Michigan St.",
  "Western Michigan Broncos":"W. Michigan","Eastern Michigan Eagles":"E. Michigan",
  "South Carolina Gamecocks":"S. Carolina","Utah State Aggies":"Utah State",
  "Florida State Seminoles":"Florida St.","Kansas State Wildcats":"Kansas State",
  "Oklahoma State Cowboys":"Okla. State","Iowa State Cyclones":"Iowa State",
  "Arizona State Sun Devils":"Arizona St.","Washington State Cougars":"Wash. State",
  "Central Florida Knights":"UCF","Florida International Panthers":"FIU",
  "Florida Atlantic Owls":"Florida Atl","Southern California Trojans":"USC",
  "Notre Dame Fighting Irish":"Notre Dame","Miami Hurricanes":"Miami (FL)",
  "Miami RedHawks":"Miami (OH)","Bowling Green Falcons":"Bowling Green",
  "San Jose State Spartans":"San José St.","Fresno State Bulldogs":"Fresno State",
  "Appalachian State Mountaineers":"App. State","Colorado State Rams":"Colorado St.",
  "New Mexico State Aggies":"NM State","Kennesaw State Owls":"Kennesaw St.",
  "Tarleton State Texans":"Tarleton St.","McNeese State Cowboys":"McNeese St.",
  "Middle Tennessee Blue Raiders":"Mid. Tenn.","Western Kentucky Hilltoppers":"W. Kentucky",
  "Eastern Kentucky Colonels":"E. Kentucky","Western Carolina Catamounts":"W. Carolina",
  "Eastern Washington Eagles":"E. Washington","North Dakota State Bison":"NDSU",
  "South Dakota State Jackrabbits":"SDSU","Jacksonville State Gamecocks":"Jax. State",
  "Sam Houston Bearkats":"Sam Houston","Austin Peay Governors":"Austin Peay",
};

const TWO_WORD_MASCOTS = new Set([
  "Nittany Lions","Mean Green","Yellow Jackets","Golden Eagles","Red Raiders",
  "Horned Frogs","Demon Deacons","Sun Devils","Fighting Irish","Golden Bears",
  "Blue Raiders","Mountain Hawks","Running Rebels","Ragin Cajuns","Black Bears",
  "Wolf Pack","Tar Heels","Cardinal and Gold","Big Green","Silver Hawks",
  "Screaming Eagles","River Hawks","Red Foxes","Blue Hens","Green Wave",
  "Crimson Tide","Blue Devils","Black Knights","Red Wolves","Golden Flashes",
  "War Hawks","Red Storm","Fighting Hawks","Rainbow Warriors","Cardinal and Gold",
  "Mean Green","Blue Hose","Aztec Warriors",
]);

// ─── SP+ 2026 Ratings (as of Week 1, Sept 8 2026) ───────────────────────────
// Keys match displayName() output. offRank/defRank = national rank (lower = better).
// ─── SP+ Live Fetch (CFBD API via Netlify Function) ──────────────────────────
// Static fallback used until live data loads (Week 1 2026 data)
const SP_STATIC_FALLBACK = {
  "Ohio State":   {offRank:3, defRank:1}, "Georgia":     {offRank:4, defRank:3},
  "Notre Dame":   {offRank:1, defRank:7}, "Texas":       {offRank:5, defRank:8},
  "Miami (FL)":   {offRank:10,defRank:4}, "Indiana":     {offRank:9, defRank:8},
  "Oregon":       {offRank:6, defRank:12},"Texas A&M":   {offRank:7, defRank:10},
  "LSU":          {offRank:14,defRank:2}, "Oklahoma":    {offRank:16,defRank:5},
  "Alabama":      {offRank:22,defRank:5}, "Tennessee":   {offRank:2, defRank:36},
  "Penn State":   {offRank:11,defRank:14},"Texas Tech":  {offRank:13,defRank:14},
  "Florida":      {offRank:20,defRank:13},"Iowa":        {offRank:30,defRank:11},
  "USC":          {offRank:8, defRank:27},"Ole Miss":    {offRank:12,defRank:44},
  "Kansas State": {offRank:15,defRank:40},"Michigan":    {offRank:45,defRank:17},
  "S. Carolina":  {offRank:25,defRank:16},"Washington":  {offRank:40,defRank:22},
  "Missouri":     {offRank:36,defRank:21},"Auburn":      {offRank:76,defRank:23},
  "Arkansas":     {offRank:25,defRank:94},"Minnesota":   {offRank:53,defRank:20},
  "Clemson":      {offRank:66,defRank:38},"Wisconsin":   {offRank:113,defRank:34},
  "BYU":          {offRank:18,defRank:19},"Vanderbilt":  {offRank:16,defRank:44},
};

// Maps CFBD team names → our displayName() format for the ones that differ
const CFBD_TO_DISPLAY = {
  "Miami":"Miami (FL)","South Carolina":"S. Carolina","North Carolina":"N. Carolina",
  "Mississippi State":"Miss. State","Florida State":"Florida St.",
  "Michigan State":"Michigan St.","Oklahoma State":"Okla. State",
  "Washington State":"Wash. State","Colorado State":"Colorado St.",
  "Western Michigan":"W. Michigan","Eastern Michigan":"E. Michigan",
  "Western Kentucky":"W. Kentucky","Eastern Kentucky":"E. Kentucky",
  "Central Florida":"UCF","Florida International":"FIU",
  "Florida Atlantic":"Florida Atl","Appalachian State":"App. State",
  "North Dakota State":"NDSU","South Dakota State":"SDSU",
  "Jacksonville State":"Jax. State","Middle Tennessee":"Mid. Tenn.",
  "Sam Houston":"Sam Houston","Louisiana Monroe":"UL Monroe",
};

const SP_CACHE_KEY = "sp_plus_cache_v1";
const SP_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

function normalizeCFBDName(name) {
  return CFBD_TO_DISPLAY[name] || name;
}

function parseCFBDResponse(data) {
  const map = {};
  for (const t of data) {
    const key = normalizeCFBDName(t.team);
    if (t.offense && t.defense) {
      map[key] = {
        offRank: t.offense.ranking,
        defRank: t.defense.ranking,
        offRating: t.offense.rating,
        defRating: t.defense.rating,
      };
    }
  }
  return map;
}

async function fetchLiveSPRatings() {
  // Check cache first
  try {
    const raw = localStorage.getItem(SP_CACHE_KEY);
    if (raw) {
      const { data, ts } = JSON.parse(raw);
      if (Date.now() - ts < SP_CACHE_TTL) return data;
    }
  } catch {}
  // Fetch from Netlify function
  try {
    const res = await fetch("/.netlify/functions/sp-ratings");
    if (!res.ok) throw new Error(`SP fetch failed ${res.status}`);
    const json = await res.json();
    const parsed = parseCFBDResponse(json);
    localStorage.setItem(SP_CACHE_KEY, JSON.stringify({ data: parsed, ts: Date.now() }));
    return parsed;
  } catch (e) {
    console.warn("SP+ live fetch failed, using fallback:", e.message);
    return null; // fallback to static
  }
}


function displayName(fullName) {
  if (!fullName) return "";
  // Pro sports — already have clean abbreviations, use as-is
  if (TEAM_ABBR[fullName]) return TEAM_ABBR[fullName];
  // College explicit map
  if (COLLEGE_DISPLAY_MAP[fullName]) return COLLEGE_DISPLAY_MAP[fullName];
  // Smart strip: remove mascot word(s) from end
  const words = fullName.split(" ");
  if (words.length >= 3) {
    const lastTwo = words.slice(-2).join(" ");
    if (TWO_WORD_MASCOTS.has(lastTwo)) return words.slice(0, -2).join(" ");
    return words.slice(0, -1).join(" ");
  }
  if (words.length === 2) return words[0];
  return fullName;
}
function formatTime(iso) {
  const d = new Date(iso);
  const day = d.toLocaleDateString("en-US",{weekday:"short"});
  const date = d.toLocaleDateString("en-US",{month:"numeric",day:"numeric"});
  const time = d.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",timeZoneName:"short"});
  return `${day} ${date} · ${time}`;
}

// ─── localStorage line movement ───────────────────────────────────────────────
function getStoredLines() {
  try { return JSON.parse(localStorage.getItem("opening_lines")||"{}"); } catch { return {}; }
}
function storeOpeningLine(gameKey, pinML, pinSpread, pinTotal) {
  const stored = getStoredLines();
  if (!stored[gameKey]) {
    stored[gameKey] = { pinML, pinSpread, pinTotal, ts: Date.now() };
    localStorage.setItem("opening_lines", JSON.stringify(stored));
  }
}
function getOpeningLine(gameKey) {
  const stored = getStoredLines();
  return stored[gameKey] || null;
}
function cleanOldLines() {
  try {
    const stored = getStoredLines();
    const cutoff = Date.now() - 24*60*60*1000;
    const cleaned = Object.fromEntries(Object.entries(stored).filter(([,v])=>v.ts>cutoff));
    localStorage.setItem("opening_lines", JSON.stringify(cleaned));
  } catch {}
}

// ─── Odds Cache ───────────────────────────────────────────────────────────────
// TTL controls both manual-cache-hit behavior AND the auto-refresh cadence below.
// The Odds API bills per request as (markets requested × regions requested) —
// this app requests 3 markets (h2h, spreads, totals) × 1 region (us) = 3 credits
// per live fetch, so a "500 requests/month" plan is really ~166 live refreshes a
// month, shared across every sport you check. Tune this constant if you want a
// different balance between freshness and quota; 1 hour keeps a single
// continuously-open sport tab well under a day's worth of budget.
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in ms

function getCached(sport) {
  try {
    const raw = localStorage.getItem(`odds_v2_${sport}`);
    if (!raw) return null;
    const { games, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) return null;
    return { games, ts };
  } catch { return null; }
}

function setCached(sport, games) {
  try {
    localStorage.setItem(`odds_v2_${sport}`, JSON.stringify({ games, ts: Date.now() }));
  } catch { /* quota exceeded — silent fail */ }
}

function cacheAgeLabel(ts) {
  const mins = Math.round((Date.now() - ts) / 60000);
  return mins === 0 ? "just now" : `${mins}m ago`;
}
async function fetchLiveOdds(sport) {
  const sportObj = SPORTS.find(s=>s.key===sport);
  if (!sportObj) throw new Error("Unknown sport");
  cleanOldLines();

  const books = ALL_BOOKS.join(",");
  const isCollege = sportObj.oddsKey.includes("ncaa");
  const params = new URLSearchParams({
    sportKey: sportObj.oddsKey, regions: "us",
    markets: "h2h,spreads,totals", oddsFormat: "american",
    bookmakers: books,
  });
  if (isCollege) {
    const from = new Date(); from.setDate(from.getDate()-2); from.setHours(0,0,0,0);
    const to   = new Date(); to.setDate(to.getDate()+5);    to.setHours(23,59,59,999);
    params.set("commenceTimeFrom", `${from.toISOString().split('.')[0]}Z`);
    params.set("commenceTimeTo", `${to.toISOString().split('.')[0]}Z`);
  }
  const res = await fetch(`/.netlify/functions/odds?${params.toString()}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Odds API error ${res.status}`);
  const requestsRemaining = parseInt(res.headers.get("x-requests-remaining"))||null;

  const games = data.map(game => {
    const away = abbr(game.away_team);
    const home = abbr(game.home_team);
    const gameKey = `${sport}_${away}_${home}_${new Date(game.commence_time).toDateString()}`;

    // Helper fns
    const getM  = (bk,key) => bk?.markets?.find(m=>m.key===key);
    const getO  = (m,name) => m?.outcomes?.find(o=>o.name===name)?.price;
    const getPt = (m,name) => m?.outcomes?.find(o=>o.name===name)?.point;

    const pin = game.bookmakers?.find(b=>b.key==="pinnacle");
    const dk  = game.bookmakers?.find(b=>b.key==="draftkings");

    const pinH2H   = getM(pin,"h2h");
    const pinSpread = getM(pin,"spreads");
    const pinTotals = getM(pin,"totals");
    const dkH2H    = getM(dk,"h2h");
    const dkSpread  = getM(dk,"spreads");
    const dkTotals  = getM(dk,"totals");

    const ml = {
      away_pin: getO(pinH2H,game.away_team), home_pin: getO(pinH2H,game.home_team),
      away_dk:  getO(dkH2H,game.away_team),  home_dk:  getO(dkH2H,game.home_team),
    };
    const spread = {
      away_line: getPt(pinSpread,game.away_team), home_line: getPt(pinSpread,game.home_team),
      away_pin:  getO(pinSpread,game.away_team),  home_pin:  getO(pinSpread,game.home_team),
      away_dk:   getO(dkSpread,game.away_team),   home_dk:   getO(dkSpread,game.home_team),
    };
    const ou = {
      total:     pinTotals?.outcomes?.find(o=>o.name==="Over")?.point,
      over_pin:  getO(pinTotals,"Over"),  under_pin: getO(pinTotals,"Under"),
      over_dk:   getO(dkTotals,"Over"),   under_dk:  getO(dkTotals,"Under"),
    };

    const lean = ml.home_pin!=null&&ml.away_pin!=null ? (ml.home_pin<ml.away_pin?home:away) : home;
    const leanIsHome = lean===home;

    // ── Multi-book consensus ──
    let totalBooks=0, agreeBooks=0, sharpAgree=0, sharpTotal=0;
    game.bookmakers?.forEach(bk => {
      const bkH2H = getM(bk,"h2h");
      if (!bkH2H) return;
      const leanOdds = leanIsHome ? getO(bkH2H,game.home_team) : getO(bkH2H,game.away_team);
      if (leanOdds==null) return;
      totalBooks++;
      if (leanOdds < 0) agreeBooks++; // book sees lean team as favorite
      if (SHARP_BOOKS.includes(bk.key)) {
        sharpTotal++;
        if (leanOdds < 0) sharpAgree++;
      }
    });

    // ── Line movement ──
    const pinMLLean   = leanIsHome ? ml.home_pin : ml.away_pin;
    const pinSpreadLean = leanIsHome ? spread.home_pin : spread.away_pin;
    storeOpeningLine(gameKey, pinMLLean, pinSpreadLean, ou.total);
    const opening = getOpeningLine(gameKey);
    const mlMove   = opening && pinMLLean   ? pinMLLean   - opening.pinML     : 0;
    const ouMove   = opening && ou.total    ? ou.total    - opening.pinTotal  : 0;

    return {
      away, home,
      awayDisplay: displayName(game.away_team),
      homeDisplay: displayName(game.home_team),
      time: formatTime(game.commence_time), commenceTime: game.commence_time,
      isLive: new Date(game.commence_time).getTime() < Date.now(),
      ml, spread, ou, lean, gameKey,
      consensus: { agree: agreeBooks, total: totalBooks, sharpAgree, sharpTotal },
      lineMove:  { ml: mlMove, ou: ouMove, hasData: !!opening },
    };
  }).filter(g=>g.ml.away_pin&&g.ml.home_pin);

  return { games, requestsRemaining };
}

// ─── Math ─────────────────────────────────────────────────────────────────────
function toDec(a){if(!a||isNaN(Number(a)))return 2;const n=Number(a);return n>0?n/100+1:100/Math.abs(n)+1;}
function iProb(a){if(!a)return 0.5;return 1/toDec(a);}
function edge(p,d){if(!p||!d)return 0;return iProb(p)*toDec(d)-1;}
function fmt(n){if(n==null||isNaN(Number(n)))return "—";const x=Number(n);return x>0?`+${x}`:`${x}`;}

function analyze(game, spRatings = {}) {
  const lh=game.lean===game.home;
  const ml=game.ml||{},sp=game.spread||{},ou=game.ou||{};
  const mlP=lh?ml.home_pin:ml.away_pin, mlD=lh?ml.home_dk:ml.away_dk;
  const spP=lh?sp.home_pin:sp.away_pin, spD=lh?sp.home_dk:sp.away_dk, spL=lh?sp.home_line:sp.away_line;
  const oe=edge(ou.over_pin,ou.over_dk), ue=edge(ou.under_pin,ou.under_dk);
  const ouSide=oe>=ue?"OVER":"UNDER";
  const leanDisp = lh ? (game.homeDisplay||game.home) : (game.awayDisplay||game.away);
  const bets=[
    {type:"ML",     edge:edge(mlP,mlD), label:`${leanDisp} ML`,                          dk:mlD,pin:mlP},
    {type:"SPREAD", edge:edge(spP,spD), label:`${leanDisp} ${spL>0?"+":""}${spL}`,       dk:spD,pin:spP},
    {type:"O/U",    edge:Math.max(oe,ue),label:`${ouSide} ${ou.total}`,                  dk:ouSide==="OVER"?ou.over_dk:ou.under_dk,pin:ouSide==="OVER"?ou.over_pin:ou.under_pin},
  ];
  bets.sort((a,b)=>b.edge-a.edge);
  const impl=iProb(mlP);
  const con=game.consensus||{};
  const conScore=con.total>0?con.agree/con.total:0;
  const sharpScore=con.sharpTotal>0?con.sharpAgree/con.sharpTotal:0;

  // ── ML Vacuum: favorite priced beyond -800 → ML handle signal unreliable ──
  const mlVacuum = mlP != null && mlP < -800;

  // ── Implied Team Totals from spread + O/U ──
  const spreadMag = sp.away_line!=null && sp.home_line!=null
    ? Math.abs(lh ? sp.home_line : sp.away_line)
    : null;
  const impliedTotals = (spreadMag!=null && ou.total!=null) ? {
    fav:  Math.round(((ou.total + spreadMag) / 2) * 10) / 10,
    dog:  Math.round(((ou.total - spreadMag) / 2) * 10) / 10,
    spread: spreadMag,
    // Flag dog as potentially underpriced when dog implied < 10 on large spreads
    dogUnderpricedFlag: ((ou.total - spreadMag) / 2) < 10 && spreadMag > 20,
    // Mild flag: dog implied < 15 on spread > 14
    dogMildFlag: ((ou.total - spreadMag) / 2) < 15 && spreadMag > 14,
  } : null;

  // Enhanced signal using consensus (MARKET tag softened when ML vacuum active)
  const sig = impl>0.60&&bets[0].edge>0.03&&sharpScore>=1.0 ? 4
            : impl>0.54&&bets[0].edge>0.01&&conScore>=0.6   ? 3
            : impl>0.51&&conScore>=0.5                       ? 2 : 1;
  const gap=Math.abs(toDec(mlP)-toDec(mlD));
  const gameIsLive = game.commenceTime ? new Date(game.commenceTime).getTime() < Date.now() : false;
  const lm = gameIsLive ? { hasData: false } : (game.lineMove || {});
  const tags={
    MACRO:   impl>0.52,
    MARKET:  impl>0.54,
    CONFIRM: gap<0.15 && conScore>=0.6,
    VALUE:   bets[0].edge>0.01,
    STEAM:   lm.hasData && lm.ml<-3,
  };
  // ── Key Number Proximity ─────────────────────────────────────────────────────
  // Flags when the spread line is within 0.5 of a key number
  const KEY_NUMBERS = [3, 7, 10, 14, 17];
  const keyNum = (() => {
    if (spreadMag == null) return null;
    for (const k of KEY_NUMBERS) {
      const dist = Math.abs(spreadMag - k);
      if (dist <= 0.5) return { number: k, dist, exact: dist === 0, half: dist === 0.5 };
    }
    return null;
  })();

  // ── RLM Formalization ────────────────────────────────────────────────────────
  const rlm = (() => {
    if (!lm.hasData) return null;
    const con = game.consensus || {};
    const publicOnLean = con.total > 0 ? con.agree / con.total : 0;
    const dogDisp  = lh ? (game.awayDisplay||game.away) : (game.homeDisplay||game.home);
    const leanDisp = lh ? (game.homeDisplay||game.home) : (game.awayDisplay||game.away);
    // ML RLM: line moved toward dog despite heavy public on lean
    if (lm.ml > 2 && publicOnLean > 0.6) return {
      market:"ML", magnitude:lm.ml, publicPct:Math.round(publicOnLean*100),
      backingTeam:dogDisp, fadingTeam:leanDisp,
    };
    // Total RLM: meaningful total movement (±1+) — direction tells you the sharp side
    // Total moving UP = sharp money on Over (books adjust up to balance)
    // Total moving DOWN = sharp money on Under
    if (lm.ou != null && Math.abs(lm.ou) >= 1) return {
      market:"TOTAL", magnitude:lm.ou,
      side: lm.ou < 0 ? "UNDER" : "OVER",
    };
    return null;
  })();

  // ── SP+ 2026 Ratings ─────────────────────────────────────────────────────────
  const leanDisp2 = lh ? (game.homeDisplay||game.home) : (game.awayDisplay||game.away);
  const dogDisp2  = lh ? (game.awayDisplay||game.away) : (game.homeDisplay||game.home);
  const spSource  = (spRatings && Object.keys(spRatings).length > 0) ? spRatings : SP_STATIC_FALLBACK;
  const leanSP = spSource[leanDisp2] || null;
  const dogSP  = spSource[dogDisp2]  || null;
  const spFlag = (leanSP || dogSP) ? {
    leanOff: leanSP?.offRank, leanDef: leanSP?.defRank,
    dogOff:  dogSP?.offRank,  dogDef:  dogSP?.defRank,
    leanName: leanDisp2, dogName: dogDisp2,
    // Against-the-Under: either team has elite offense (top 15)
    underVeto: (leanSP?.offRank <= 15) || (dogSP?.offRank <= 15),
    underVetoTeam: (leanSP?.offRank <= 15 ? leanDisp2 : null) || (dogSP?.offRank <= 15 ? dogDisp2 : null),
    // Against-the-Over: either team has elite defense (top 8)
    overVeto: (leanSP?.defRank <= 8) || (dogSP?.defRank <= 8),
    overVetoTeam: (leanSP?.defRank <= 8 ? leanDisp2 : null) || (dogSP?.defRank <= 8 ? dogDisp2 : null),
  } : null;

  return {optimal:bets[0],bets,sig,tags,impl,conScore,sharpScore,mlVacuum,impliedTotals,keyNum,rlm,spFlag,gap,lm,leanDisp:leanDisp2};
}

// ─── Signal Explainability ─────────────────────────────────────────────────────
// Maps each tag pill to: which of the 4 framework layers it represents, the exact
// rule/threshold being evaluated, the live numbers plugged into that rule, and a
// plain-language verdict. This is what powers the tap-to-explain panel on slide 2.
function explainSignals(a) {
  const pct = n => n==null||isNaN(n) ? "—" : `${(n*100).toFixed(1)}%`;
  const {impl, gap, conScore, bets, lm, tags} = a;
  const edgeTop = bets?.[0]?.edge ?? 0;

  return {
    MACRO: {
      layer: "Layer 1 · Macro",
      concept: "Situational context — rest, travel, schedule spot. Currently implemented as a placeholder threshold on market pricing until real NFL situational data (rest/travel/coaching flags) is wired in — it is not yet reading actual macro inputs the way MLB's automated rest-day check does.",
      rule: "Pinnacle implied win probability > 52%",
      numbers: `Pinnacle implied prob = ${pct(impl)}`,
      pass: tags.MACRO,
      verdict: tags.MACRO
        ? `Lit because implied probability (${pct(impl)}) clears the 52% floor.`
        : `Unlit because implied probability (${pct(impl)}) is at or below 52%.`,
      caveat: "Honest caveat: this tag will read the same as MARKET until situational Macro logic (rest days, travel, coaching system flags) is built for NFL specifically.",
    },
    MARKET: {
      layer: "Layer 2 · Market",
      concept: "Market structure confirmation — is Pinnacle (the sharp reference book) pricing the lean side strongly enough to trust the market's own signal?",
      rule: "Pinnacle implied win probability > 54%",
      numbers: `Pinnacle implied prob = ${pct(impl)}`,
      pass: tags.MARKET,
      verdict: tags.MARKET
        ? `Lit because implied probability (${pct(impl)}) clears the 54% floor.`
        : `Unlit because implied probability (${pct(impl)}) is at or below 54% — market isn't leaning hard enough on its own to confirm.`,
    },
    CONFIRM: {
      layer: "Layer 3 · Confirm (Correlated)",
      concept: "Correlated market confirmation — do the books agree with each other, and is the price gap between Pinnacle and DraftKings tight (i.e. not a fluke/stale line)?",
      rule: "Pinnacle-vs-DK price gap < 0.15 decimal AND book consensus ≥ 60%",
      numbers: `Price gap = ${gap!=null?gap.toFixed(3):"—"} · Consensus = ${pct(conScore)}`,
      pass: tags.CONFIRM,
      verdict: tags.CONFIRM
        ? `Lit — price gap (${gap!=null?gap.toFixed(3):"—"}) is tight and ${pct(conScore)} of tracked books agree.`
        : `Unlit — either the DK/Pinnacle price gap is too wide, book consensus is below 60%, or both.`,
    },
    VALUE: {
      layer: "Layer 4 · Value",
      concept: "CLV entry signal — does DraftKings currently offer better pricing than Pinnacle's fair value on the optimal side, i.e. is there a betting edge right now?",
      rule: "Best available edge vs Pinnacle > 1%",
      numbers: `Top bet edge (${bets?.[0]?.label||"—"}) = ${bets?.[0]?.edge!=null?(bets[0].edge*100).toFixed(2)+"%":"—"}`,
      pass: tags.VALUE,
      verdict: tags.VALUE
        ? `Lit — DK is pricing ${(edgeTop*100).toFixed(2)}% better than Pinnacle fair value on the top bet.`
        : `Unlit — DK's price is within 1% of Pinnacle fair value (or worse), so there's no real CLV edge to capture yet.`,
    },
    STEAM: {
      layer: "Cross-cutting · Steam",
      concept: "Detects coordinated sharp money by watching for fast line movement toward the lean since the opening line — not one of the 4 core layers, but an urgency flag layered on top.",
      rule: "Opening-line tracker has data AND ML has moved 3+ cents toward the lean",
      numbers: lm?.hasData ? `ML movement since open = ${lm.ml>0?"+":""}${lm.ml}` : "No opening-line snapshot stored yet for this game",
      pass: tags.STEAM,
      verdict: tags.STEAM
        ? `Lit — the line has moved ${lm?.ml} cents toward the lean since it opened, consistent with sharp money.`
        : lm?.hasData
          ? `Unlit — line movement (${lm?.ml ?? 0}) hasn't hit the 3-cent threshold yet.`
          : `Unlit — no opening line has been captured for this game yet, so movement can't be measured. (Open the app before the line opens to start tracking.)`,
    },
  };
}

// ─── Colors ───────────────────────────────────────────────────────────────────
const C={
  bg:"#080c0b", card:"#0f1614", cardBorder:"#1c2825", text:"#e2e8f0",
  textDim:"#94a3b8", textMuted:"#8a95a5", accent:"#f59e0b",
  accentDim:"rgba(245,158,11,0.1)", accentBorder:"rgba(245,158,11,0.25)",
  positive:"#6ee7b7", positiveBg:"rgba(110,231,183,0.05)",
  positiveBorder:"rgba(110,231,183,0.15)", lean:"#f1f5f9", nonLean:"#334155",
  steam:"#f87171", steamBg:"rgba(248,113,113,0.08)", steamBorder:"rgba(248,113,113,0.25)",
  info:"#3b82f6", danger:"#ef4444",
  warning:"#eab308", warningBg:"rgba(234,179,8,0.06)", warningBorder:"rgba(234,179,8,0.3)",
  live:"#4ade80", liveBg:"rgba(74,222,128,0.1)", liveBorder:"rgba(74,222,128,0.3)",
  // Consolidated near-duplicate near-black panel backgrounds (was #0c1210 / #0a0f0e)
  surfaceInset:"#0c1210",
  // Consolidated near-duplicate "selected/active" chip background (was #162032 / #111c2c)
  selectedBg:"#162032", selectedBorder:"#2d3f52",
};

// ─── Radius scale ───────────────────────────────────────────────────────────
// Consolidates 11 near-duplicate one-off values into a small set of
// intentional tiers. `xs` is left for hairline/pixel-level bar radii
// (SignalBars ticks, ConsensusBar track), which aren't part of this scale.
const R = { sm:6, md:8, lg:10, pill:20, circle:"50%" };

// ─── Components ───────────────────────────────────────────────────────────────
// Shared alert/info callout used by KeyNumBadge, RLMBadge, SPBadge, and
// OptimalBadge's dog-alert row — extracted to remove the near-identical
// bordered-box-with-icon-and-text markup that was duplicated 6x.
// Two shapes: a titled variant (icon + bold title + body text, stacked)
// and a single-line variant (icon + inline text, centered) when no title.
function Callout({icon, color, bg, border, title, children, compact, marginBottom=8, lineHeight=1.4}){
  return (
    <div style={{background:bg,border:`1px solid ${border}`,borderRadius:R.sm,padding:compact?"5px 10px":"6px 10px",marginBottom,display:"flex",gap:title?8:6,alignItems:title?"flex-start":"center"}}>
      <span style={{fontSize:title?11:9,color}}>{icon}</span>
      {title ? (
        <div>
          <span style={{fontSize:9,fontWeight:700,color,letterSpacing:"0.07em"}}>{title}</span>
          <div style={{fontSize:8,color:C.textMuted,marginTop:2,lineHeight}}>{children}</div>
        </div>
      ) : (
        <span style={{fontSize:8,color,lineHeight}}>{children}</span>
      )}
    </div>
  );
}

function SignalBars({count}){
  const col=count===4?"#f59e0b":count===3?"#6ee7b7":count===2?C.info:"#334155";
  return(<div style={{display:"flex",alignItems:"flex-end",gap:2}}>{[1,2,3,4].map(i=><div key={i} style={{width:5,height:4+i*4,background:i<=count?col:"#1c2825",borderRadius:1}}/>)}</div>);
}

function Tag({label,active,color,onClick}){
  const c=color||C.positive;
  return(
    <button onClick={onClick} style={{fontSize:10,fontWeight:600,letterSpacing:"0.07em",padding:"3px 8px",borderRadius:R.sm,border:`1px solid ${active?C.selectedBorder:C.cardBorder}`,color:active?C.textDim:C.textMuted,background:active?C.selectedBg:"transparent",display:"inline-flex",alignItems:"center",gap:4,cursor:"pointer",fontFamily:"inherit"}}>
      {active&&<span style={{width:5,height:5,borderRadius:R.circle,background:c,display:"inline-block"}}/>}
      {label}
      <span style={{fontSize:8,opacity:0.5}}>ⓘ</span>
    </button>
  );
}

// ─── Signal Explanation Panel (slide 2) ─────────────────────────────────────────
function SignalExplainPanel({explain, expandedTag, onToggle}){
  const order = ["MACRO","MARKET","CONFIRM","VALUE","STEAM"];
  return (
    <div>
      <div style={{fontSize:9,color:C.textMuted,letterSpacing:"0.07em",marginBottom:8}}>
        SIGNAL BREAKDOWN · tap any layer to see the live numbers behind it
      </div>
      {order.map(key=>{
        const e = explain[key];
        const isOpen = expandedTag===key;
        return (
          <div key={key} style={{marginBottom:6,border:`1px solid ${e.pass?C.selectedBorder:C.cardBorder}`,borderRadius:R.md,overflow:"hidden"}}>
            <button onClick={()=>onToggle(isOpen?null:key)} style={{width:"100%",textAlign:"left",background:e.pass?C.selectedBg:C.surfaceInset,border:"none",padding:"8px 10px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:"inherit"}}>
              <span style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{width:6,height:6,borderRadius:R.circle,background:e.pass?(key==="STEAM"?C.steam:C.positive):C.textMuted,display:"inline-block"}}/>
                <span style={{fontSize:11,fontWeight:700,color:e.pass?C.text:C.textDim}}>{key}</span>
                <span style={{fontSize:8,color:C.textMuted}}>{e.layer}</span>
              </span>
              <span style={{fontSize:10,color:C.textMuted}}>{isOpen?"▲":"▼"}</span>
            </button>
            {isOpen && (
              <div style={{padding:"8px 10px 10px",background:"#080c0b",borderTop:`1px solid ${C.cardBorder}`}}>
                <div style={{fontSize:10,color:C.textDim,marginBottom:6,lineHeight:1.5}}>{e.concept}</div>
                <div style={{fontSize:9,color:C.textMuted,marginBottom:3}}>RULE</div>
                <div style={{fontSize:10,color:C.text,fontFamily:"monospace",marginBottom:6}}>{e.rule}</div>
                <div style={{fontSize:9,color:C.textMuted,marginBottom:3}}>LIVE NUMBERS</div>
                <div style={{fontSize:10,color:C.text,fontFamily:"monospace",marginBottom:6}}>{e.numbers}</div>
                <div style={{fontSize:10,color:e.pass?C.positive:C.textDim,fontWeight:600,lineHeight:1.5}}>{e.verdict}</div>
                {e.caveat && <div style={{fontSize:9,color:C.accent,marginTop:6,lineHeight:1.5,fontStyle:"italic"}}>{e.caveat}</div>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ConsensusBar({consensus, lineMove}) {
  if (!consensus||consensus.total===0) return null;
  const pct=Math.round((consensus.agree/consensus.total)*100);
  const allSharpAgree=consensus.sharpTotal>0&&consensus.sharpAgree===consensus.sharpTotal;
  const steamDetected=lineMove?.hasData&&lineMove?.ml<-3;

  return (
    <div style={{background:C.surfaceInset,borderRadius:R.md,padding:"10px 12px",marginBottom:10}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <span style={{fontSize:9,color:C.textMuted,letterSpacing:"0.08em"}}>BOOK CONSENSUS</span>
        <span style={{fontSize:9,color:C.textMuted}}>{consensus.agree}/{consensus.total} books</span>
      </div>

      {/* Consensus bar */}
      <div style={{height:4,background:"#1c2825",borderRadius:2,marginBottom:8,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${pct}%`,background:pct>=75?"#6ee7b7":pct>=50?"#f59e0b":"#f87171",borderRadius:2,transition:"width 0.3s"}}/>
      </div>

      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {/* Sharp consensus */}
        <div style={{display:"flex",alignItems:"center",gap:5,background:allSharpAgree?"rgba(110,231,183,0.06)":C.surfaceInset,border:`1px solid ${allSharpAgree?C.positiveBorder:C.cardBorder}`,borderRadius:R.sm,padding:"4px 8px"}}>
          <span style={{fontSize:9,color:C.textMuted}}>SHARP</span>
          <span style={{fontSize:11,fontWeight:700,color:allSharpAgree?C.positive:C.textMuted}}>{consensus.sharpAgree}/{consensus.sharpTotal}</span>
          {allSharpAgree&&<span style={{fontSize:9,color:C.positive}}>✓</span>}
        </div>

        {/* Line movement */}
        {lineMove?.hasData && lineMove.ml!=null && (
          <div style={{display:"flex",alignItems:"center",gap:5,background:steamDetected?C.steamBg:C.surfaceInset,border:`1px solid ${steamDetected?C.steamBorder:C.cardBorder}`,borderRadius:R.sm,padding:"4px 8px"}}>
            <span style={{fontSize:9,color:C.textMuted}}>ML</span>
            <span style={{fontSize:11,fontWeight:700,color:lineMove.ml<0?C.positive:lineMove.ml>0?"#f87171":C.textMuted}}>
              {lineMove.ml===0?"—":lineMove.ml<0?`↓ ${lineMove.ml}¢`:`↑ +${lineMove.ml}¢`}
            </span>
            {steamDetected&&<span style={{fontSize:9,color:C.steam}}>STEAM</span>}
          </div>
        )}

        {/* Total movement */}
        {lineMove?.hasData && lineMove.ou!=null && lineMove.ou!==0 && (
          <div style={{display:"flex",alignItems:"center",gap:5,background:C.surfaceInset,border:`1px solid ${C.cardBorder}`,borderRadius:R.sm,padding:"4px 8px"}}>
            <span style={{fontSize:9,color:C.textMuted}}>O/U</span>
            <span style={{fontSize:11,fontWeight:700,color:C.textDim}}>
              {lineMove.ou>0?`↑ +${lineMove.ou}`:` ↓ ${lineMove.ou}`}
            </span>
          </div>
        )}

        {/* Pct label */}
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center"}}>
          <span style={{fontSize:13,fontWeight:700,fontFamily:"monospace",color:pct>=75?C.positive:pct>=50?C.accent:"#f87171"}}>{pct}%</span>
        </div>
      </div>
    </div>
  );
}

// ─── Key Number Badge ─────────────────────────────────────────────────────────
function KeyNumBadge({keyNum}) {
  if (!keyNum) return null;
  const isExact = keyNum.exact;
  const color = isExact ? "#f59e0b" : "#6ee7b7";
  const bg    = isExact ? "rgba(245,158,11,0.08)" : "rgba(110,231,183,0.06)";
  const border= isExact ? "rgba(245,158,11,0.25)" : "rgba(110,231,183,0.15)";
  const label = isExact
    ? `ON KEY # ${keyNum.number}`
    : `+0.5 OFF KEY # ${keyNum.number}`;
  const note  = keyNum.half
    ? "Half-point cushion on key number — strong cover protection"
    : "Spread sits exactly on key number — push risk, shop for half-point";
  return <Callout icon="⚡" color={color} bg={bg} border={border} title={label}>{note}</Callout>;
}

// ─── RLM Badge ────────────────────────────────────────────────────────────────
function RLMBadge({rlm}) {
  if (!rlm) return null;
  const isTotalRLM = rlm.market === "TOTAL";
  return (
    <Callout icon="↩" color={C.positive} bg="rgba(110,231,183,0.06)" border="rgba(110,231,183,0.2)"
      title={`${rlm.market} REVERSE LINE MOVEMENT`} lineHeight={1.5}>
      {isTotalRLM ? (
        <>
          Total moved <span style={{color:C.positive,fontWeight:700}}>{rlm.magnitude>0?`up +${rlm.magnitude}`:`down ${rlm.magnitude}`}</span> —{" "}
          suggests sharp money on the <span style={{color:C.positive,fontWeight:700}}>{rlm.side}</span>.{" "}
          {rlm.side==="UNDER"
            ? "Books dropping total to attract Over bettors — sharps are on the Under."
            : "Books raising total to attract Under bettors — sharps are on the Over."}
        </>
      ) : (
        <>
          ML line moved toward{" "}
          <span style={{color:C.positive,fontWeight:700}}>{rlm.backingTeam}</span> despite{" "}
          <span style={{color:"#f87171",fontWeight:700}}>{rlm.publicPct}%</span> public on{" "}
          <span style={{color:"#f87171",fontWeight:700}}>{rlm.fadingTeam}</span> — sharp money backing {rlm.backingTeam}.
        </>
      )}
    </Callout>
  );
}

function OptimalBadge({bet, impliedTotals}){
  const ep=(bet.edge*100).toFixed(1);
  const hasEdge=bet.edge>0.005;
  const dogAlert = impliedTotals?.dogUnderpricedFlag || impliedTotals?.dogMildFlag;
  const alertColor = impliedTotals?.dogUnderpricedFlag ? "#f87171" : "#f59e0b";
  const alertBg    = impliedTotals?.dogUnderpricedFlag ? "rgba(248,113,113,0.06)" : "rgba(245,158,11,0.06)";
  const alertBorder= impliedTotals?.dogUnderpricedFlag ? "rgba(248,113,113,0.2)" : "rgba(245,158,11,0.2)";
  return(
    <div style={{marginBottom:10}}>
      <div style={{background:hasEdge?C.accentDim:"rgba(255,255,255,0.02)",border:`1px solid ${hasEdge?C.accentBorder:C.cardBorder}`,borderRadius:R.md,padding:"9px 12px",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom: dogAlert ? 6 : 0}}>
        <div>
          <div style={{fontSize:9,color:hasEdge?C.accent:C.textMuted,letterSpacing:"0.1em",marginBottom:3}}>★ OPTIMAL BET</div>
          <div style={{fontSize:15,fontWeight:700,color:C.text,fontFamily:"monospace"}}>
            {bet.label}<span style={{fontSize:12,color:C.textDim,marginLeft:8}}>{fmt(bet.dk)}</span>
          </div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:9,color:C.textMuted,letterSpacing:"0.07em",marginBottom:3}}>EDGE vs PIN</div>
          <div style={{fontSize:17,fontWeight:800,fontFamily:"monospace",color:hasEdge?C.accent:C.textMuted}}>{hasEdge?`+${ep}%`:`${ep}%`}</div>
        </div>
      </div>
      {dogAlert && (
        <Callout icon="⚠" color={alertColor} bg={alertBg} border={alertBorder} compact marginBottom={0}>
          Dog implied total <strong>{impliedTotals.dog} pts</strong> — possibly underpriced for this opponent. Check Over confluence.
        </Callout>
      )}
    </div>
  );
}

function BetTabs({active,onChange,bets}){
  return(
    <div style={{display:"flex",gap:3,background:C.surfaceInset,borderRadius:R.md,padding:3,marginBottom:12}}>
      {["ML","SPREAD","O/U"].map(t=>{
        const isActive=active===t;
        const isOpt=bets[0]?.type===t;
        return(<button key={t} onClick={()=>onChange(t)} style={{flex:1,padding:"6px 0",borderRadius:R.sm,border:`1px solid ${isActive?C.selectedBorder:"transparent"}`,background:isActive?C.selectedBg:"transparent",color:isActive?C.text:isOpt?C.textDim:C.textMuted,fontSize:10,fontWeight:700,letterSpacing:"0.07em",cursor:"pointer",position:"relative"}}>
          {t}{isOpt&&!isActive&&<span style={{position:"absolute",top:-3,right:4,width:5,height:5,borderRadius:R.circle,background:C.accent,display:"block"}}/>}
        </button>);
      })}
    </div>
  );
}

function SideCard({label,pin,dk,isLean}){
  const e=(edge(pin,dk)*100).toFixed(1);
  const hasEdge=edge(pin,dk)>0;
  return(
    <div style={{background:isLean?C.positiveBg:C.surfaceInset,border:`1px solid ${isLean?C.positiveBorder:C.cardBorder}`,borderRadius:R.sm,padding:"9px 11px"}}>
      <div style={{fontSize:9,color:isLean?C.positive:C.textMuted,marginBottom:6}}>{isLean?"◄ ":""}{label}</div>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:9,color:C.textMuted}}>PIN</span><span style={{fontSize:13,fontWeight:700,fontFamily:"monospace",color:isLean?C.text:C.textDim}}>{fmt(pin)}</span></div>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontSize:9,color:C.textMuted}}>DK</span><span style={{fontSize:13,fontWeight:700,fontFamily:"monospace",color:isLean?C.positive:C.textDim}}>{fmt(dk)}</span></div>
      <div style={{fontSize:9,color:C.textMuted,borderTop:`1px solid ${C.cardBorder}`,paddingTop:4}}>EDGE <span style={{color:hasEdge?C.positive:C.textMuted}}>{hasEdge?"+":""}{e}%</span></div>
    </div>
  );
}

function MLView({game, mlVacuum, myPrice, onMyPriceChange}){
  const lh=game.lean===game.home;const ml=game.ml||{};
  const leanPin = lh?ml.home_pin:ml.away_pin;
  const leanDk  = lh?ml.home_dk:ml.away_dk;
  return(
    <div>
      {mlVacuum && (
        <div style={{background:"rgba(245,158,11,0.06)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:R.sm,padding:"7px 10px",marginBottom:10,display:"flex",gap:6,alignItems:"flex-start"}}>
          <span style={{fontSize:10}}>⚠</span>
          <span style={{fontSize:9,color:"#f59e0b",lineHeight:1.4}}>
            Favorite ML beyond -800 — external handle/ticket splits may reflect a pricing vacuum, not genuine sharp action. Spread movement is a more reliable signal here.
          </span>
        </div>
      )}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 60px 80px",gap:8,alignItems:"start"}}>
        <div>
          <div style={{fontSize:9,color:C.textMuted,marginBottom:5}}>LEAN ML</div>
          <div style={{fontSize:9,color:C.textMuted,display:"flex",gap:16,marginBottom:3}}><span>PIN</span><span>DK</span></div>
          <div style={{display:"flex",gap:12,fontFamily:"monospace",fontSize:14,fontWeight:700}}>
            <span style={{color:C.textDim}}>{fmt(leanPin)}</span>
            <span style={{color:C.positive}}>{fmt(leanDk)}</span>
          </div>
        </div>
        <div>
          <div style={{fontSize:9,color:C.textMuted,marginBottom:5}}>OPP ML</div>
          <div style={{fontSize:9,color:C.textMuted,display:"flex",gap:16,marginBottom:3}}><span>PIN</span><span>DK</span></div>
          <div style={{display:"flex",gap:12,fontFamily:"monospace",fontSize:14,fontWeight:700}}>
            <span style={{color:C.textMuted}}>{fmt(lh?ml.away_pin:ml.home_pin)}</span>
            <span style={{color:C.textMuted}}>{fmt(lh?ml.away_dk:ml.home_dk)}</span>
          </div>
        </div>
        <div>
          <div style={{fontSize:9,color:C.textMuted,marginBottom:5}}>TOTAL</div>
          <div style={{fontFamily:"monospace",fontSize:16,fontWeight:700,color:C.textDim,marginTop:8}}>{game.ou?.total??"—"}</div>
        </div>
        <div>
          <div style={{fontSize:9,color:C.textMuted,marginBottom:5}}>IMPLIED</div>
          <div style={{fontFamily:"monospace",fontSize:16,fontWeight:700,color:C.text,marginTop:8}}>{(iProb(leanPin)*100).toFixed(1)}%</div>
        </div>
      </div>
      <BookPriceInput pinPrice={leanPin} dkPrice={leanDk} label={`${lh?game.homeDisplay||game.home:game.awayDisplay||game.away} ML`} value={myPrice} onChange={onMyPriceChange}/>
    </div>
  );
}
function SpreadView({game, myPrice, onMyPriceChange}){
  const lh=game.lean===game.home;const sp=game.spread||{};
  const leanPin = lh?sp.home_pin:sp.away_pin;
  const leanDk  = lh?sp.home_dk:sp.away_dk;
  const leanLine = lh?sp.home_line:sp.away_line;
  const awayDisp = game.awayDisplay||game.away;
  const homeDisp = game.homeDisplay||game.home;
  const leanDisp = lh?homeDisp:awayDisp;
  return(<div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
      <SideCard label={`${awayDisp} ${fmt(sp.away_line)}`} pin={sp.away_pin} dk={sp.away_dk} isLean={!lh}/>
      <SideCard label={`${homeDisp} ${fmt(sp.home_line)}`} pin={sp.home_pin} dk={sp.home_dk} isLean={lh}/>
    </div>
    <BookPriceInput pinPrice={leanPin} dkPrice={leanDk} label={`${leanDisp} ${leanLine>0?"+":""}${leanLine}`} value={myPrice} onChange={onMyPriceChange}/>
  </div>);
}
// ─── Implied Totals Row ───────────────────────────────────────────────────────
function ImpliedTotalsRow({impliedTotals, leanTeam, dogTeam}) {
  if (!impliedTotals) return null;
  const {fav, dog, dogUnderpricedFlag, dogMildFlag} = impliedTotals;
  const dogColor = dogUnderpricedFlag ? "#f87171" : dogMildFlag ? "#f59e0b" : C.textDim;
  const dogBg    = dogUnderpricedFlag ? "rgba(248,113,113,0.06)" : dogMildFlag ? "rgba(245,158,11,0.06)" : C.surfaceInset;
  const dogBorder= dogUnderpricedFlag ? C.steamBorder : dogMildFlag ? "rgba(245,158,11,0.25)" : C.cardBorder;
  return (
    <div style={{marginBottom:10}}>
      <div style={{fontSize:9,color:C.textMuted,letterSpacing:"0.08em",marginBottom:6}}>IMPLIED TEAM TOTALS</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <div style={{background:C.surfaceInset,border:`1px solid ${C.cardBorder}`,borderRadius:R.sm,padding:"8px 11px"}}>
          <div style={{fontSize:9,color:C.positive,marginBottom:4}}>▲ FAV · {leanTeam}</div>
          <div style={{fontFamily:"monospace",fontSize:20,fontWeight:800,color:C.text}}>{fav}</div>
          <div style={{fontSize:8,color:C.textMuted,marginTop:3}}>(Total + Spread) / 2</div>
        </div>
        <div style={{background:dogBg,border:`1px solid ${dogBorder}`,borderRadius:R.sm,padding:"8px 11px"}}>
          <div style={{fontSize:9,color:dogColor,marginBottom:4}}>▼ DOG · {dogTeam}</div>
          <div style={{fontFamily:"monospace",fontSize:20,fontWeight:800,color:dogColor}}>{dog}</div>
          <div style={{fontSize:8,color:C.textMuted,marginTop:3}}>(Total − Spread) / 2</div>
          {dogUnderpricedFlag && <div style={{fontSize:8,color:"#f87171",marginTop:4,fontWeight:700}}>⚠ Possibly underpriced</div>}
          {dogMildFlag && !dogUnderpricedFlag && <div style={{fontSize:8,color:"#f59e0b",marginTop:4,fontWeight:700}}>~ Check dog scoring</div>}
        </div>
      </div>
    </div>
  );
}

// ─── Your Book Price Input ────────────────────────────────────────────────────
function BookPriceInput({pinPrice, dkPrice, label, value, onChange}) {
  const raw = value.trim();
  const parsed = raw === "" ? null : raw.startsWith("+") ? parseInt(raw) : parseInt(raw);
  const valid  = parsed != null && !isNaN(parsed) && parsed !== 0 && !(parsed > -100 && parsed < 100);
  const myEdge    = valid ? (edge(pinPrice, parsed) * 100).toFixed(2) : null;
  const dkEdge    = dkPrice ? (edge(pinPrice, dkPrice) * 100).toFixed(2) : null;
  const clvDelta  = (valid && dkEdge != null) ? (parseFloat(myEdge) - parseFloat(dkEdge)).toFixed(2) : null;
  const breakeven = valid ? (iProb(parsed) * 100).toFixed(1) : null;
  const hasGain   = clvDelta != null && parseFloat(clvDelta) > 0;
  const hasEdge   = myEdge != null && parseFloat(myEdge) > 0;

  return (
    <div style={{marginTop:12,background:C.surfaceInset,border:`1px solid ${hasGain?"rgba(110,231,183,0.2)":C.cardBorder}`,borderRadius:R.md,padding:"10px 12px"}}>
      <div style={{fontSize:9,color:C.textMuted,letterSpacing:"0.08em",marginBottom:8}}>YOUR BOOK · {label}</div>
      <div style={{display:"flex",gap:8,alignItems:"center",marginBottom: valid ? 10 : 0}}>
        <input
          type="text"
          placeholder="e.g. +100 or -108"
          value={value}
          onChange={e=>onChange(e.target.value)}
          className="app-focusable"
          style={{
            flex:1, background:C.surfaceInset, border:`1px solid ${valid?C.positiveBorder:C.cardBorder}`,
            borderRadius:R.sm, color:C.text, fontSize:13, fontWeight:700,
            fontFamily:"monospace", padding:"6px 10px", outline:"none",
            caretColor:C.positive,
          }}
        />
        {valid && <span style={{fontSize:11,color:hasEdge?C.positive:"#f87171",fontWeight:700,fontFamily:"monospace",whiteSpace:"nowrap"}}>
          {hasEdge ? `+${myEdge}%` : `${myEdge}%`} edge
        </span>}
      </div>
      {valid && (
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          <div style={{background:C.surfaceInset,border:`1px solid ${C.cardBorder}`,borderRadius:R.sm,padding:"4px 8px"}}>
            <span style={{fontSize:8,color:C.textMuted}}>BREAKEVEN </span>
            <span style={{fontSize:10,fontWeight:700,fontFamily:"monospace",color:C.textDim}}>{breakeven}%</span>
          </div>
          {dkEdge != null && (
            <div style={{background:C.surfaceInset,border:`1px solid ${C.cardBorder}`,borderRadius:R.sm,padding:"4px 8px"}}>
              <span style={{fontSize:8,color:C.textMuted}}>DK EDGE </span>
              <span style={{fontSize:10,fontWeight:700,fontFamily:"monospace",color:C.textDim}}>{parseFloat(dkEdge)>0?`+${dkEdge}%`:`${dkEdge}%`}</span>
            </div>
          )}
          {clvDelta != null && (
            <div style={{background:hasGain?"rgba(110,231,183,0.06)":"rgba(248,113,113,0.06)",border:`1px solid ${hasGain?C.positiveBorder:"rgba(248,113,113,0.2)"}`,borderRadius:R.sm,padding:"4px 8px"}}>
              <span style={{fontSize:8,color:C.textMuted}}>CLV vs DK </span>
              <span style={{fontSize:10,fontWeight:700,fontFamily:"monospace",color:hasGain?C.positive:"#f87171"}}>{hasGain?`+${clvDelta}%`:`${clvDelta}%`}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function OUView({game, impliedTotals, myPrice, onMyPriceChange}){
  const ou=game.ou||{};
  const oe=edge(ou.over_pin,ou.over_dk),ue=edge(ou.under_pin,ou.under_dk);
  const best=oe>=ue?"OVER":"UNDER";
  const lh=game.lean===game.home;
  const awayDisp=game.awayDisplay||game.away;
  const homeDisp=game.homeDisplay||game.home;
  const bestPin = best==="OVER" ? ou.over_pin : ou.under_pin;
  const bestDk  = best==="OVER" ? ou.over_dk  : ou.under_dk;
  return(<div>
    <div style={{fontSize:9,color:C.textMuted,marginBottom:8}}>TOTAL <span style={{fontSize:20,color:C.text,fontFamily:"monospace",fontWeight:700,marginLeft:6}}>{ou.total}</span></div>
    <ImpliedTotalsRow impliedTotals={impliedTotals} leanTeam={lh?homeDisp:awayDisp} dogTeam={lh?awayDisp:homeDisp}/>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
      <SideCard label={`OVER ${ou.total}`}  pin={ou.over_pin}  dk={ou.over_dk}  isLean={best==="OVER"}/>
      <SideCard label={`UNDER ${ou.total}`} pin={ou.under_pin} dk={ou.under_dk} isLean={best==="UNDER"}/>
    </div>
    <BookPriceInput pinPrice={bestPin} dkPrice={bestDk} label={`${best} ${ou.total}`} value={myPrice} onChange={onMyPriceChange}/>
  </div>);
}

// ─── SP+ Badge ────────────────────────────────────────────────────────────────
function SPBadge({spFlag, optimalType}) {
  if (!spFlag) return null;
  const rows = [];
  if (spFlag.underVeto && (optimalType === "O/U")) {
    rows.push(
      <Callout key="uv" icon="📈" color="#f87171" bg="rgba(248,113,113,0.06)" border="rgba(248,113,113,0.2)"
        title="SP+ AGAINST-THE-UNDER" marginBottom={6}>
        <strong style={{color:"#f87171"}}>{spFlag.underVetoTeam}</strong> has a top-15 projected offense (SP+). Historical Under data may not reflect their scoring ceiling.
      </Callout>
    );
  }
  if (spFlag.overVeto && (optimalType === "O/U")) {
    rows.push(
      <Callout key="ov" icon="🛡" color={C.positive} bg="rgba(110,231,183,0.06)" border="rgba(110,231,183,0.2)"
        title="SP+ ELITE DEFENSE" marginBottom={6}>
        <strong style={{color:C.positive}}>{spFlag.overVetoTeam}</strong> has a top-8 projected defense (SP+). Against-the-Over lean — suppressed scoring expected.
      </Callout>
    );
  }
  // Always show ratings summary row when SP+ data available
  const hasInfo = spFlag.leanOff || spFlag.dogOff;
  if (hasInfo && rows.length === 0) {
    // Show quiet info row
    const lOff = spFlag.leanOff ? `Off #${spFlag.leanOff}` : "";
    const lDef = spFlag.leanDef ? `Def #${spFlag.leanDef}` : "";
    const dOff = spFlag.dogOff  ? `Off #${spFlag.dogOff}`  : "";
    const dDef = spFlag.dogDef  ? `Def #${spFlag.dogDef}`  : "";
    rows.push(
      <div key="info" style={{background:C.surfaceInset,border:`1px solid ${C.cardBorder}`,borderRadius:R.sm,padding:"5px 10px",marginBottom:6,display:"flex",gap:16,alignItems:"center"}}>
        <span style={{fontSize:8,color:C.textMuted,letterSpacing:"0.07em"}}>SP+</span>
        {(lOff||lDef) && <span style={{fontSize:8,color:C.textDim}}><strong>{spFlag.leanName}</strong> {[lOff,lDef].filter(Boolean).join(" · ")}</span>}
        {(dOff||dDef) && <span style={{fontSize:8,color:C.textMuted}}><strong>{spFlag.dogName}</strong> {[dOff,dDef].filter(Boolean).join(" · ")}</span>}
      </div>
    );
  }
  return rows.length > 0 ? <>{rows}</> : null;
}

// ─── CLV Helpers ──────────────────────────────────────────────────────────────
function calcCLV(entryOdds, currentPinOdds) {
  const e = toDec(entryOdds), c = toDec(currentPinOdds);
  if (!e || !c) return null;
  return ((e - c) / c * 100).toFixed(1);
}
function saveBetLog(log) {
  try { localStorage.setItem("bet_log_v2", JSON.stringify(log)); } catch {}
}
function loadBetLog() {
  try { return JSON.parse(localStorage.getItem("bet_log_v2") || "[]"); } catch { return []; }
}

// ─── Bet Log Panel ─────────────────────────────────────────────────────────────
function BetLogPanel({log, onDelete, onClose}) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:100,display:"flex",flexDirection:"column"}}>
      <div style={{background:C.card,borderBottom:`1px solid ${C.cardBorder}`,padding:"12px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:13,fontWeight:800,letterSpacing:"0.1em",color:C.text}}>BET LOG</span>
        <button onClick={onClose} style={{background:"transparent",border:`1px solid ${C.cardBorder}`,borderRadius:R.pill,color:C.textDim,fontSize:10,fontWeight:600,padding:"4px 12px",cursor:"pointer"}}>✕ CLOSE</button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:12}}>
        {log.length === 0 && (
          <div style={{textAlign:"center",padding:"60px 0",color:C.textMuted,fontSize:11}}>
            No bets logged yet. Tap LOG BET on any game card.
          </div>
        )}
        {[...log].reverse().map(b => {
          const clv = calcCLV(b.entryOdds, b.pinAtEntry);
          const clvNum = clv ? parseFloat(clv) : null;
          const clvColor = clvNum > 0 ? C.positive : clvNum < 0 ? "#f87171" : C.textMuted;
          return (
            <div key={b.id} style={{background:C.card,border:`1px solid ${C.cardBorder}`,borderRadius:R.lg,padding:"10px 12px",marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:C.text,marginBottom:2}}>{b.pick}</div>
                  <div style={{fontSize:9,color:C.textMuted}}>{b.game} · {b.sport} · {new Date(b.ts).toLocaleDateString("en-US",{month:"numeric",day:"numeric",hour:"numeric",minute:"2-digit"})}</div>
                </div>
                <button onClick={()=>onDelete(b.id)} style={{background:"transparent",border:"none",color:C.textMuted,fontSize:12,cursor:"pointer",padding:"0 4px"}}>✕</button>
              </div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <div style={{background:C.surfaceInset,border:`1px solid ${C.cardBorder}`,borderRadius:R.sm,padding:"3px 8px"}}>
                  <span style={{fontSize:8,color:C.textMuted}}>ENTRY </span>
                  <span style={{fontSize:10,fontFamily:"monospace",fontWeight:700,color:C.text}}>{fmt(b.entryOdds)}</span>
                </div>
                {b.pinAtEntry && <div style={{background:C.surfaceInset,border:`1px solid ${C.cardBorder}`,borderRadius:R.sm,padding:"3px 8px"}}>
                  <span style={{fontSize:8,color:C.textMuted}}>PIN @ ENTRY </span>
                  <span style={{fontSize:10,fontFamily:"monospace",fontWeight:700,color:C.textDim}}>{fmt(b.pinAtEntry)}</span>
                </div>}
                {clv && <div style={{background:clvNum>0?"rgba(110,231,183,0.06)":"rgba(248,113,113,0.06)",border:`1px solid ${clvNum>0?"rgba(110,231,183,0.2)":"rgba(248,113,113,0.2)"}`,borderRadius:R.sm,padding:"3px 8px"}}>
                  <span style={{fontSize:8,color:C.textMuted}}>CLV </span>
                  <span style={{fontSize:10,fontFamily:"monospace",fontWeight:700,color:clvColor}}>{clvNum>0?`+${clv}%`:`${clv}%`}</span>
                </div>}
                {b.stake && <div style={{background:C.surfaceInset,border:`1px solid ${C.cardBorder}`,borderRadius:R.sm,padding:"3px 8px"}}>
                  <span style={{fontSize:8,color:C.textMuted}}>STAKE </span>
                  <span style={{fontSize:10,fontFamily:"monospace",fontWeight:700,color:C.textDim}}>${b.stake}</span>
                </div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Live View ────────────────────────────────────────────────────────────────
function LiveView({game}) {
  const lh = game.lean === game.home;
  const ml = game.ml || {}, sp = game.spread || {}, ou = game.ou || {};
  const lm = game.lineMove || {};
  const rows = [
    { label:"ML",     leanVal: fmt(lh?ml.home_dk:ml.away_dk),  leanPin: fmt(lh?ml.home_pin:ml.away_pin),  dogVal: fmt(lh?ml.away_dk:ml.home_dk),  move: lm.ml  != null ? lm.ml  : null, moveLabel:"ML" },
    { label:"SPREAD", leanVal: fmt(lh?sp.home_line:sp.away_line), leanPin: fmt(lh?sp.home_pin:sp.away_pin), dogVal: fmt(lh?sp.away_line:sp.home_line), move: null,   moveLabel:"SPREAD" },
    { label:"O/U",    leanVal: `O ${ou.total}`,                  leanPin: fmt(ou.over_pin),                 dogVal: `U ${ou.total}`,                 move: lm.ou  != null ? lm.ou  : null, moveLabel:"TOTAL" },
  ];
  const leanDisp = lh?(game.homeDisplay||game.home):(game.awayDisplay||game.away);
  const dogDisp  = lh?(game.awayDisplay||game.away):(game.homeDisplay||game.home);
  return (
    <div>
      <div style={{background:"rgba(74,222,128,0.05)",border:"1px solid rgba(74,222,128,0.15)",borderRadius:R.sm,padding:"6px 10px",marginBottom:10,display:"flex",gap:6,alignItems:"center"}}>
        <span style={{fontSize:9,color:C.live}}>● LIVE</span>
        <span style={{fontSize:8,color:C.textMuted}}>Line movement reflects game score — not sharp pre-game action. Edge vs Pinnacle still valid for live bet value.</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"60px 1fr 1fr 60px",gap:6,marginBottom:6}}>
        <div style={{fontSize:8,color:C.textMuted}}>MARKET</div>
        <div style={{fontSize:8,color:C.lean}}>▲ {leanDisp}</div>
        <div style={{fontSize:8,color:C.nonLean}}>▼ {dogDisp}</div>
        <div style={{fontSize:8,color:C.textMuted}}>MOVE</div>
      </div>
      {rows.map(r=>(
        <div key={r.label} style={{display:"grid",gridTemplateColumns:"60px 1fr 1fr 60px",gap:6,padding:"7px 0",borderTop:`1px solid ${C.cardBorder}`}}>
          <div style={{fontSize:9,color:C.textMuted,fontWeight:700}}>{r.label}</div>
          <div>
            <div style={{fontFamily:"monospace",fontSize:13,fontWeight:700,color:C.lean}}>{r.leanVal}</div>
            {r.leanPin && <div style={{fontSize:8,color:C.textMuted}}>PIN {r.leanPin}</div>}
          </div>
          <div>
            <div style={{fontFamily:"monospace",fontSize:13,fontWeight:700,color:C.nonLean}}>{r.dogVal}</div>
          </div>
          <div>
            {r.move != null && r.move !== 0 ? (
              <span style={{fontSize:10,fontWeight:700,fontFamily:"monospace",color:r.move<0?C.live:"#f87171"}}>
                {r.move>0?`+${r.move}`:r.move}
              </span>
            ) : <span style={{fontSize:10,color:C.textMuted}}>—</span>}
          </div>
        </div>
      ))}
      <div style={{marginTop:8,padding:"6px 8px",background:C.surfaceInset,border:`1px solid ${C.cardBorder}`,borderRadius:R.sm}}>
        <div style={{fontSize:8,color:C.textMuted}}>LIVE EDGE vs PIN (DK) · {leanDisp} ML</div>
        <div style={{fontFamily:"monospace",fontSize:13,fontWeight:700,color:C.positive,marginTop:2}}>
          {lh ? fmt(ml.home_dk) : fmt(ml.away_dk)} <span style={{fontSize:9,color:C.textMuted}}>DK</span>
          <span style={{fontSize:9,color:C.textMuted,margin:"0 6px"}}>vs</span>
          {lh ? fmt(ml.home_pin) : fmt(ml.away_pin)} <span style={{fontSize:9,color:C.textMuted}}>PIN</span>
        </div>
      </div>
    </div>
  );
}

// ─── NFL Research Panel (slide 2, NFL only) ────────────────────────────────────
// Pulls inactives/injury report from a Netlify function that proxies ESPN's public
// NFL data, and offers on-demand AI analysis via a second function that calls the
// Anthropic API. Both are on-demand (button-triggered), not auto-fetched, to avoid
// burning API calls/credits on games the user isn't actively looking at.
function NFLResearchPanel({game, analysis, explain}){
  const [data,setData]=useState(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState(null);
  const [ai,setAi]=useState(null);
  const [aiLoading,setAiLoading]=useState(false);
  const [aiError,setAiError]=useState(null);

  const awayAbbr = abbr(game.away);
  const homeAbbr = abbr(game.home);

  const loadContext = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/.netlify/functions/nfl-context?away=${awayAbbr}&home=${homeAbbr}&commence=${encodeURIComponent(game.commenceTime||"")}`);
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || `Request failed (${res.status})`);
      setData(json);
    } catch(e) {
      setError(e.message || "Couldn't load injury/inactives data");
    } finally {
      setLoading(false);
    }
  };

  const generateAnalysis = async () => {
    setAiLoading(true); setAiError(null);
    try {
      const passedTags = Object.entries(explain).filter(([,v])=>v.pass).map(([k])=>k);
      const res = await fetch(`/.netlify/functions/ai-analysis`, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          away: game.awayDisplay||game.away, home: game.homeDisplay||game.home,
          lean: analysis.leanDisp, optimal: analysis.optimal,
          impliedProb: analysis.impl, signalScore: analysis.sig, passedTags,
          injuries: data?.injuries || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || `Request failed (${res.status})`);
      setAi(json.analysis);
    } catch(e) {
      setAiError(e.message || "Couldn't generate analysis");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div style={{marginTop:14,paddingTop:12,borderTop:`1px solid ${C.cardBorder}`}}>
      <div style={{fontSize:9,color:C.textMuted,letterSpacing:"0.07em",marginBottom:8}}>
        NFL RESEARCH · inactives typically post ~90 min before kickoff
      </div>

      {!data && !loading && (
        <button onClick={loadContext} style={{width:"100%",background:"transparent",border:`1px dashed ${C.cardBorder}`,borderRadius:R.sm,color:C.textMuted,fontSize:10,fontWeight:600,padding:"8px 0",cursor:"pointer",letterSpacing:"0.05em",marginBottom:8}}>
          + LOAD INJURY REPORT / INACTIVES
        </button>
      )}
      {loading && <div style={{fontSize:10,color:C.textMuted,padding:"8px 0"}}>Loading injury report…</div>}
      {error && (
        <div style={{fontSize:9,color:"#f87171",background:"rgba(248,113,113,0.06)",border:"1px solid rgba(248,113,113,0.2)",borderRadius:R.sm,padding:"6px 8px",marginBottom:8}}>
          {error} <button onClick={loadContext} style={{background:"none",border:"none",color:"#f87171",textDecoration:"underline",cursor:"pointer",fontSize:9,padding:0,marginLeft:4}}>retry</button>
        </div>
      )}

      {data && (
        <div style={{marginBottom:10}}>
          {[{team:awayAbbr,label:game.awayDisplay||game.away},{team:homeAbbr,label:game.homeDisplay||game.home}].map(t=>{
            const list = data.injuries?.[t.team] || [];
            return (
              <div key={t.team} style={{marginBottom:8}}>
                <div style={{fontSize:9,fontWeight:700,color:C.textDim,marginBottom:4}}>{t.label}</div>
                {list.length===0 && <div style={{fontSize:9,color:C.textMuted}}>No injury designations reported yet.</div>}
                {list.map((p,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:10,padding:"3px 0",borderTop:i>0?`1px solid ${C.cardBorder}`:"none"}}>
                    <span style={{color:C.text}}>{p.name} <span style={{color:C.textMuted,fontSize:9}}>{p.position}</span></span>
                    <span style={{color: p.status==="Out"?"#f87171":p.status==="Doubtful"?"#f59e0b":C.textMuted,fontWeight:600}}>{p.status}</span>
                  </div>
                ))}
              </div>
            );
          })}
          {data.note && <div style={{fontSize:9,color:C.textMuted,fontStyle:"italic",marginTop:4}}>{data.note}</div>}
        </div>
      )}

      {!ai && !aiLoading && (
        <button onClick={generateAnalysis} style={{width:"100%",background:"rgba(245,158,11,0.06)",border:`1px solid ${C.accentBorder}`,borderRadius:R.sm,color:C.accent,fontSize:10,fontWeight:700,padding:"8px 0",cursor:"pointer",letterSpacing:"0.05em"}}>
          ✦ GENERATE AI ANALYSIS
        </button>
      )}
      {aiLoading && <div style={{fontSize:10,color:C.textMuted,padding:"8px 0"}}>Generating analysis…</div>}
      {aiError && (
        <div style={{fontSize:9,color:"#f87171",background:"rgba(248,113,113,0.06)",border:"1px solid rgba(248,113,113,0.2)",borderRadius:R.sm,padding:"6px 8px"}}>
          {aiError} <button onClick={generateAnalysis} style={{background:"none",border:"none",color:"#f87171",textDecoration:"underline",cursor:"pointer",fontSize:9,padding:0,marginLeft:4}}>retry</button>
        </div>
      )}
      {ai && (
        <div style={{background:C.surfaceInset,border:`1px solid ${C.accentBorder}`,borderRadius:R.md,padding:"10px 12px",marginTop:4}}>
          <div style={{fontSize:9,color:C.accent,fontWeight:700,letterSpacing:"0.07em",marginBottom:6}}>✦ AI ANALYSIS</div>
          <div style={{fontSize:11,color:C.textDim,lineHeight:1.6,whiteSpace:"pre-wrap"}}>{ai}</div>
        </div>
      )}
    </div>
  );
}

function GameCard({rawGame, onLogBet, spRatings={}, sport}){
  const isLive = rawGame.commenceTime ? new Date(rawGame.commenceTime).getTime() < Date.now() : false;
  const [tab,setTab]=useState(isLive ? "LIVE" : "ML");
  const [myPrices,setMyPrices]=useState({ML:"",SPREAD:"","O/U":""});
  const [showLogForm,setShowLogForm]=useState(false);
  const [logStake,setLogStake]=useState("");
  const [slide,setSlide]=useState(1);
  const [expandedTag,setExpandedTag]=useState(null);
  const analysis=analyze(rawGame, spRatings);
  const {optimal,bets,sig,tags,mlVacuum,impliedTotals,keyNum,rlm,spFlag}=analysis;
  const explain=explainSignals(analysis);
  const isNFL = sport==="NFL";
  const lh=rawGame.lean===rawGame.home;
  const mlP=lh?rawGame.ml?.home_pin:rawGame.ml?.away_pin;
  const steamDetected=!isLive&&rawGame.lineMove?.hasData&&rawGame.lineMove?.ml<-3;
  const setMyPrice = (t,v) => setMyPrices(p=>({...p,[t]:v}));

  return(
    <div style={{background:steamDetected?"rgba(248,113,113,0.04)":C.card,border:`1px solid ${steamDetected?"rgba(248,113,113,0.2)":C.cardBorder}`,borderRadius:R.lg,padding:"14px 14px 12px",marginBottom:10}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
            <span style={{fontSize:9,color:C.textMuted,letterSpacing:"0.06em"}}>{rawGame.time}</span>
            {isLive && <span style={{fontSize:8,fontWeight:700,color:C.live,background:C.liveBg,border:`1px solid ${C.liveBorder}`,borderRadius:3,padding:"1px 5px",letterSpacing:"0.06em"}}>● LIVE</span>}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:18,fontWeight:800,fontFamily:"monospace",color:!lh?C.lean:C.nonLean}}>{rawGame.awayDisplay}</span>
            <span style={{fontSize:10,color:C.textMuted}}>@</span>
            <span style={{fontSize:18,fontWeight:800,fontFamily:"monospace",color:lh?C.lean:C.nonLean}}>{rawGame.homeDisplay}</span>
          </div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:11,color:C.textDim,fontFamily:"monospace",marginBottom:5}}>◄ {lh?rawGame.homeDisplay:rawGame.awayDisplay} {fmt(mlP)}</div>
          <div style={{display:"flex",alignItems:"center",gap:6,justifyContent:"flex-end"}}>
            {steamDetected&&<span style={{fontSize:8,color:C.steam,background:C.steamBg,border:`1px solid ${C.steamBorder}`,borderRadius:3,padding:"2px 5px"}}>🔥 STEAM</span>}
            <span style={{fontSize:8,color:C.textMuted,background:"#0f1614",border:`1px solid ${C.cardBorder}`,borderRadius:3,padding:"2px 5px"}}>MACRO AUTO</span>
            <SignalBars count={sig}/>
            <span style={{fontSize:9,color:sig===4?"#f59e0b":C.textDim}}>{sig}/4</span>
          </div>
        </div>
      </div>

      {/* SLIDE NAV */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:10}}>
        <button onClick={()=>setSlide(1)} disabled={slide===1} style={{background:"transparent",border:"none",color:slide===1?C.textMuted:C.text,fontSize:11,cursor:slide===1?"default":"pointer",opacity:slide===1?0.3:1,padding:"2px 6px"}}>‹</button>
        <span style={{fontSize:9,color:C.textMuted,letterSpacing:"0.1em",fontFamily:"monospace"}}>
          {slide===1 ? "1/2 · ODDS" : "2/2 · RESEARCH"}
        </span>
        <button onClick={()=>setSlide(2)} disabled={slide===2} style={{background:"transparent",border:"none",color:slide===2?C.textMuted:C.text,fontSize:11,cursor:slide===2?"default":"pointer",opacity:slide===2?0.3:1,padding:"2px 6px"}}>›</button>
      </div>

      {slide===2 && (
        <div style={{marginBottom:12}}>
          <SignalExplainPanel explain={explain} expandedTag={expandedTag} onToggle={setExpandedTag}/>
          {isNFL && (
            <NFLResearchPanel
              game={rawGame}
              analysis={analysis}
              explain={explain}
            />
          )}
        </div>
      )}

      {slide===1 && (<>
      <ConsensusBar consensus={rawGame.consensus} lineMove={isLive ? null : rawGame.lineMove}/>
      <KeyNumBadge keyNum={keyNum}/>
      <RLMBadge rlm={rlm}/>
      <SPBadge spFlag={spFlag} optimalType={optimal?.type}/>
      <OptimalBadge bet={optimal} impliedTotals={impliedTotals}/>
      {/* LOG BET */}
      {!showLogForm && (
        <button onClick={()=>setShowLogForm(true)} style={{width:"100%",background:"transparent",border:`1px dashed ${C.cardBorder}`,borderRadius:R.sm,color:C.textMuted,fontSize:9,fontWeight:600,padding:"5px 0",cursor:"pointer",letterSpacing:"0.07em",marginBottom:10}}>
          + LOG BET
        </button>
      )}
      {showLogForm && (
        <div style={{background:C.surfaceInset,border:`1px solid ${C.positiveBorder}`,borderRadius:R.md,padding:"10px 12px",marginBottom:10}}>
          <div style={{fontSize:9,color:C.positive,fontWeight:700,letterSpacing:"0.07em",marginBottom:8}}>LOG BET · {optimal?.label}</div>
          <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}>
            <div style={{flex:1}}>
              <div style={{fontSize:8,color:C.textMuted,marginBottom:3}}>ENTRY ODDS</div>
              <div style={{fontFamily:"monospace",fontSize:13,fontWeight:700,color:C.text}}>{fmt(optimal?.dk)}</div>
              <div style={{fontSize:8,color:C.textMuted,marginTop:1}}>PIN: {fmt(optimal?.pin)}</div>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:8,color:C.textMuted,marginBottom:3}}>STAKE ($)</div>
              <input type="number" placeholder="e.g. 20" value={logStake} onChange={e=>setLogStake(e.target.value)}
                className="app-focusable"
                style={{width:"100%",background:C.surfaceInset,border:`1px solid ${C.cardBorder}`,borderRadius:R.sm,color:C.text,fontSize:12,fontWeight:700,padding:"5px 8px",outline:"none",boxSizing:"border-box"}}/>
            </div>
          </div>
          <div style={{display:"flex",gap:6}}>
            <button onClick={()=>{
              onLogBet({
                id: Date.now(), ts: new Date().toISOString(),
                game: `${rawGame.awayDisplay||rawGame.away} @ ${rawGame.homeDisplay||rawGame.home}`,
                pick: optimal?.label, market: optimal?.type,
                entryOdds: optimal?.dk, pinAtEntry: optimal?.pin,
                stake: logStake || null,
              });
              setShowLogForm(false); setLogStake("");
            }} style={{flex:1,background:"rgba(110,231,183,0.1)",border:`1px solid ${C.positiveBorder}`,borderRadius:R.sm,color:C.positive,fontSize:10,fontWeight:700,padding:"6px 0",cursor:"pointer"}}>
              SAVE BET
            </button>
            <button onClick={()=>{setShowLogForm(false);setLogStake("");}} style={{background:"transparent",border:`1px solid ${C.cardBorder}`,borderRadius:R.sm,color:C.textMuted,fontSize:10,fontWeight:600,padding:"6px 12px",cursor:"pointer"}}>
              CANCEL
            </button>
          </div>
        </div>
      )}
      <div style={{display: isLive ? "block" : "none", marginBottom:10}}>
        <button
          onClick={()=>setTab(tab==="LIVE" ? "ML" : "LIVE")}
          style={{width:"100%",padding:"8px 0",borderRadius:R.md,
            border: tab==="LIVE" ? `2px solid ${C.live}` : "2px solid rgba(74,222,128,0.25)",
            background: tab==="LIVE" ? "rgba(74,222,128,0.08)" : "transparent",
            color: tab==="LIVE" ? C.live : "rgba(74,222,128,0.5)",
            fontSize:11,fontWeight:800,letterSpacing:"0.1em",cursor:"pointer"}}>
          {tab==="LIVE" ? "● LIVE LINES  ✕ CLOSE" : "● VIEW LIVE LINES →"}
        </button>
      </div>

      <BetTabs active={tab==="LIVE"?"ML":tab} onChange={setTab} bets={bets}/>

      <div style={{marginBottom:12}}>
        {tab==="LIVE"  &&<LiveView   game={rawGame}/>}
        {tab!=="LIVE"  &&tab==="ML"    &&<MLView     game={rawGame} mlVacuum={mlVacuum} myPrice={myPrices.ML}     onMyPriceChange={v=>setMyPrice("ML",v)}/>}
        {tab!=="LIVE"  &&tab==="SPREAD"&&<SpreadView game={rawGame}                     myPrice={myPrices.SPREAD} onMyPriceChange={v=>setMyPrice("SPREAD",v)}/>}
        {tab!=="LIVE"  &&tab==="O/U"   &&<OUView     game={rawGame} impliedTotals={impliedTotals} myPrice={myPrices["O/U"]} onMyPriceChange={v=>setMyPrice("O/U",v)}/>}
      </div>
      </>)}

      <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
        {Object.entries(tags).map(([k,v])=><Tag key={k} label={k} active={v} color={k==="STEAM"?C.steam:C.positive} onClick={()=>{setSlide(2);setExpandedTag(k);}}/>)}
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App(){
  const [sport,setSport]=useState("MLB");
  const [games,setGames]=useState({});
  const [loading,setLoading]=useState({});
  const [errors,setErrors]=useState({});
  const [updated,setUpdated]=useState({});
  const [creditsLeft,setCreditsLeft]=useState(null);
  const [sigFilter,setSigFilter]=useState(2);
  const [sortBy,setSortBy]=useState("edge");
  const [sortDir,setSortDir]=useState("desc");
  const [betLog,setBetLog]=useState(()=>loadBetLog());
  const [betLogOpen,setBetLogOpen]=useState(false);
  const [spRatings,setSpRatings]=useState({});

  useEffect(()=>{
    fetchLiveSPRatings().then(data=>{ if(data) setSpRatings(data); });
  },[]);

  function handleLogBet(bet) {
    setBetLog(prev => {
      const updated = [...prev, bet];
      saveBetLog(updated);
      return updated;
    });
  }
  function handleDeleteBet(id) {
    setBetLog(prev => {
      const updated = prev.filter(b=>b.id!==id);
      saveBetLog(updated);
      return updated;
    });
  }

  async function load(s, forceRefresh=false){
    // ── Serve from cache if fresh and not a manual refresh ──
    if (!forceRefresh) {
      const cached = getCached(s);
      if (cached) {
        setGames(p=>({...p,[s]:cached.games}));
        setUpdated(p=>({...p,[s]:{time:new Date(cached.ts).toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"}),cached:true,ts:cached.ts}}));
        return;
      }
    }
    // ── Fresh fetch ──
    setLoading(p=>({...p,[s]:true}));
    setErrors(p=>({...p,[s]:null}));
    try{
      const {games:raw,requestsRemaining}=await fetchLiveOdds(s);
      setCached(s, raw);
      setGames(p=>({...p,[s]:raw}));
      setUpdated(p=>({...p,[s]:{time:new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"}),cached:false,ts:Date.now()}}));
      if(requestsRemaining!==null) setCreditsLeft(requestsRemaining);
    }catch(e){setErrors(p=>({...p,[s]:e.message}));}
    finally{setLoading(p=>({...p,[s]:false}));}
  }

  useEffect(()=>{load(sport);},[sport]);

  const cur=games[sport]||[],isLoading=loading[sport],err=errors[sport],upd=updated[sport];
  const filtered=cur.filter(g=>{try{return analyze(g,spRatings).sig>=sigFilter;}catch(e){console.error(`analyze() failed during filter for ${g.gameKey}:`,e);return false;}});
  const sorted=[...filtered].sort((a,b)=>{
    let av,bv;
    if(sortBy==="time"){
      av=a.commenceTime?new Date(a.commenceTime).getTime():0;
      bv=b.commenceTime?new Date(b.commenceTime).getTime():0;
    }else{
      try{av=analyze(a,spRatings).optimal.edge;}catch(e){console.error(`analyze() failed during sort for ${a.gameKey}:`,e);av=-Infinity;}
      try{bv=analyze(b,spRatings).optimal.edge;}catch(e){console.error(`analyze() failed during sort for ${b.gameKey}:`,e);bv=-Infinity;}
    }
    return sortDir==="asc"?av-bv:bv-av;
  });

  return(
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:"'Inter',system-ui,sans-serif",paddingBottom:40}}>
      <div style={{background:C.bg,borderBottom:`1px solid ${C.cardBorder}`,padding:"12px 14px",position:"sticky",top:0,zIndex:10}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <span style={{fontSize:12,color:C.text,fontWeight:800,letterSpacing:"0.12em"}}>SIGNALS</span>
          <button onClick={()=>load(sport,true)} disabled={isLoading} title="Bypasses the cache — costs 3 API credits (3 markets × 1 region)" style={{background:"transparent",border:`1px solid ${C.cardBorder}`,borderRadius:R.pill,color:C.textDim,fontSize:10,fontWeight:600,padding:"4px 12px",cursor:"pointer"}}>
            {isLoading?"⟳ LOADING...":"⟳ FORCE (uses 3 credits)"}
          </button>
          <button onClick={()=>setBetLogOpen(true)} style={{background:betLog.length>0?"rgba(110,231,183,0.08)":"transparent",border:`1px solid ${betLog.length>0?C.positiveBorder:C.cardBorder}`,borderRadius:R.pill,color:betLog.length>0?C.positive:C.textMuted,fontSize:10,fontWeight:600,padding:"4px 12px",cursor:"pointer"}}>
            BETS {betLog.length>0?`(${betLog.length})`:""}
          </button>
        </div>

        <div style={{display:"flex",gap:4,marginBottom:10,overflowX:"auto",paddingBottom:2}}>
          {SPORTS.map(s=>(
            <button key={s.key} onClick={()=>setSport(s.key)} style={{padding:"5px 12px",borderRadius:R.pill,whiteSpace:"nowrap",border:`1px solid ${sport===s.key?C.selectedBorder:C.cardBorder}`,background:sport===s.key?C.selectedBg:"transparent",color:sport===s.key?C.text:C.textMuted,fontSize:11,fontWeight:600,cursor:"pointer",position:"relative"}}>
              {s.emoji} {s.label}
              {games[s.key]?.length>0&&sport!==s.key&&<span style={{position:"absolute",top:-3,right:-2,width:5,height:5,borderRadius:R.circle,background:"#6ee7b7",display:"block"}}/>}
            </button>
          ))}
        </div>

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          {upd
            ? <span style={{fontSize:9,color:C.textMuted}}>
                {upd.cached
                  ? <span>⚡ Cached {cacheAgeLabel(upd.ts)} · auto-serves for 1hr · <span style={{color:"#f59e0b"}}>FORCE for live</span></span>
                  : `Updated ${upd.time} · Pinnacle + 7 books`
                }
              </span>
            : <span/>
          }
          {creditsLeft!==null&&<span style={{fontSize:9,color:creditsLeft<50?"#f59e0b":C.textMuted}}>{creditsLeft}/500 requests left</span>}
        </div>

        <div style={{display:"flex",gap:4,marginBottom:8}}>
          {[1,2,3,4].map(n=>(
            <button key={n} onClick={()=>setSigFilter(n)} style={{padding:"4px 12px",borderRadius:R.pill,border:`1px solid ${sigFilter===n?C.selectedBorder:C.cardBorder}`,background:sigFilter===n?C.selectedBg:"transparent",color:sigFilter===n?C.text:C.textMuted,fontSize:10,fontWeight:600,cursor:"pointer"}}>Signal {n}+</button>
          ))}
        </div>

        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <span style={{fontSize:9,color:C.textMuted,letterSpacing:"0.06em"}}>SORT</span>
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)} className="app-focusable" style={{background:C.surfaceInset,border:`1px solid ${C.cardBorder}`,borderRadius:R.sm,color:C.textDim,fontSize:10,padding:"3px 8px",cursor:"pointer",outline:"none"}}>
            <option value="edge">Edge vs Pinnacle</option>
            <option value="time">Start Time</option>
          </select>
          <button onClick={()=>setSortDir(d=>d==="asc"?"desc":"asc")} style={{background:"transparent",border:`1px solid ${C.cardBorder}`,borderRadius:R.sm,color:C.textDim,fontSize:10,fontWeight:700,padding:"3px 10px",cursor:"pointer"}}>
            {sortDir==="asc"?"↑ ASC":"↓ DESC"}
          </button>
        </div>
      </div>

      <div style={{padding:"8px 14px",display:"flex",gap:14,borderBottom:`1px solid ${C.cardBorder}`,flexWrap:"wrap"}}>
        {[["#f59e0b","4/4 Max"],["#6ee7b7","3/4 High"],[C.info,"2/4 Dev"],["#334155","1/4 Watch"],["#f87171","🔥 Steam"]].map(([c,l])=>(
          <span key={l} style={{fontSize:9,color:C.textMuted,display:"flex",alignItems:"center",gap:4}}>
            <span style={{width:6,height:6,borderRadius:R.circle,background:c,display:"inline-block"}}/>{l}
          </span>
        ))}
      </div>

      <div style={{padding:"10px 10px 0"}}>
        {isLoading&&(
          <div style={{textAlign:"center",padding:"60px 0",color:C.textDim}}>
            <div style={{fontSize:28,marginBottom:12,animation:"spin 1s linear infinite"}}>⟳</div>
            <div style={{fontSize:11,letterSpacing:"0.1em"}}>FETCHING {sport} ODDS</div>
            <div style={{fontSize:9,color:C.textMuted,marginTop:6}}>Pulling 8 books including Pinnacle, Bookmaker, LowVig...</div>
            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
          </div>
        )}
        {err&&!isLoading&&cur.length===0&&(
          <div style={{margin:16,background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:R.lg,padding:16}}>
            <div style={{fontSize:11,color:C.danger,fontWeight:700,marginBottom:6}}>⚠ ERROR</div>
            <div style={{fontSize:10,color:C.textDim,marginBottom:12}}>{err}</div>
            <button onClick={()=>load(sport)} style={{background:"transparent",border:`1px solid ${C.cardBorder}`,color:C.textDim,fontSize:10,fontWeight:600,borderRadius:R.sm,padding:"6px 16px",cursor:"pointer"}}>RETRY</button>
          </div>
        )}
        {err&&!isLoading&&cur.length>0&&(
          <div style={{margin:"0 6px 10px",background:C.warningBg,border:`1px solid ${C.warningBorder}`,borderRadius:R.md,padding:"8px 12px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
            <div style={{fontSize:10,color:C.warning}}>Showing cached data{upd?.time?` from ${upd.time}`:""} — live refresh failed ({err})</div>
            <button onClick={()=>load(sport,true)} style={{background:"transparent",border:`1px solid ${C.warningBorder}`,color:C.warning,fontSize:9,fontWeight:600,borderRadius:R.sm,padding:"4px 10px",cursor:"pointer",whiteSpace:"nowrap"}}>RETRY</button>
          </div>
        )}
        {!isLoading&&(!err||cur.length>0)&&sorted.length===0&&cur.length>0&&<div style={{textAlign:"center",padding:"40px 0",color:C.textMuted,fontSize:11}}>No games at Signal {sigFilter}+ — try lowering the filter</div>}
        {!isLoading&&!err&&cur.length===0&&upd&&<div style={{textAlign:"center",padding:"40px 0",color:C.textMuted,fontSize:11}}>No {sport} games today</div>}
        {!isLoading&&(!err||cur.length>0)&&sorted.map((g)=>{try{return<GameCard key={g.gameKey} rawGame={g} onLogBet={handleLogBet} spRatings={spRatings} sport={sport}/>;}catch(e){console.error(`GameCard render failed for ${g.gameKey}:`,e);return null;}})}
      </div>
      {betLogOpen&&<BetLogPanel log={betLog} onDelete={handleDeleteBet} onClose={()=>setBetLogOpen(false)}/>}

      <div style={{textAlign:"center",fontSize:8,color:"#1c2825",letterSpacing:"0.08em",padding:"12px 0 0"}}>
        SHARP BOOKS: PINNACLE · BOOKMAKER · LOWVIG · CONSENSUS ACROSS 8 BOOKS
      </div>
    </div>
  );
}
