import { useState, useEffect } from "react";

const ODDS_API_KEY = "e95f810e37a0140a9a34d5ee986ef8c8";
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
function formatTime(iso) {
  return new Date(iso).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",timeZoneName:"short"});
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

// ─── Fetch ────────────────────────────────────────────────────────────────────
async function fetchLiveOdds(sport) {
  const sportObj = SPORTS.find(s=>s.key===sport);
  if (!sportObj) throw new Error("Unknown sport");
  cleanOldLines();

  const books = ALL_BOOKS.join(",");
  const url = `/odds-api/v4/sports/${sportObj.oddsKey}/odds/?apiKey=${ODDS_API_KEY}&regions=us&markets=h2h,spreads,totals&oddsFormat=american&bookmakers=${books}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Odds API error ${res.status}`);
  const data = await res.json();
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
      away, home, time: formatTime(game.commence_time), ml, spread, ou, lean, gameKey,
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

function analyze(game) {
  const lh=game.lean===game.home;
  const ml=game.ml||{},sp=game.spread||{},ou=game.ou||{};
  const mlP=lh?ml.home_pin:ml.away_pin, mlD=lh?ml.home_dk:ml.away_dk;
  const spP=lh?sp.home_pin:sp.away_pin, spD=lh?sp.home_dk:sp.away_dk, spL=lh?sp.home_line:sp.away_line;
  const oe=edge(ou.over_pin,ou.over_dk), ue=edge(ou.under_pin,ou.under_dk);
  const ouSide=oe>=ue?"OVER":"UNDER";
  const bets=[
    {type:"ML",     edge:edge(mlP,mlD), label:`${game.lean} ML`,             dk:mlD,pin:mlP},
    {type:"SPREAD", edge:edge(spP,spD), label:`${game.lean} ${spL>0?"+":""}${spL}`, dk:spD,pin:spP},
    {type:"O/U",    edge:Math.max(oe,ue),label:`${ouSide} ${ou.total}`,       dk:ouSide==="OVER"?ou.over_dk:ou.under_dk,pin:ouSide==="OVER"?ou.over_pin:ou.under_pin},
  ];
  bets.sort((a,b)=>b.edge-a.edge);
  const impl=iProb(mlP);
  const con=game.consensus||{};
  const conScore=con.total>0?con.agree/con.total:0;
  const sharpScore=con.sharpTotal>0?con.sharpAgree/con.sharpTotal:0;
  // Enhanced signal using consensus
  const sig = impl>0.60&&bets[0].edge>0.03&&sharpScore>=1.0 ? 4
            : impl>0.54&&bets[0].edge>0.01&&conScore>=0.6   ? 3
            : impl>0.51&&conScore>=0.5                       ? 2 : 1;
  const gap=Math.abs(toDec(mlP)-toDec(mlD));
  const lm=game.lineMove||{};
  const tags={
    MACRO:   impl>0.52,
    MARKET:  impl>0.54,
    CONFIRM: gap<0.15 && conScore>=0.6,
    VALUE:   bets[0].edge>0.01,
    STEAM:   lm.hasData && lm.ml<-3,  // line moved 3+ cents toward lean = steam
  };
  return {optimal:bets[0],bets,sig,tags,impl,conScore,sharpScore};
}

// ─── Colors ───────────────────────────────────────────────────────────────────
const C={
  bg:"#080c0b", card:"#0f1614", cardBorder:"#1c2825", text:"#e2e8f0",
  textDim:"#94a3b8", textMuted:"#475569", accent:"#f59e0b",
  accentDim:"rgba(245,158,11,0.1)", accentBorder:"rgba(245,158,11,0.25)",
  positive:"#6ee7b7", positiveBg:"rgba(110,231,183,0.05)",
  positiveBorder:"rgba(110,231,183,0.15)", lean:"#f1f5f9", nonLean:"#334155",
  steam:"#f87171", steamBg:"rgba(248,113,113,0.08)",
};

// ─── Components ───────────────────────────────────────────────────────────────
function SignalBars({count}){
  const col=count===4?"#f59e0b":count===3?"#6ee7b7":"#334155";
  return(<div style={{display:"flex",alignItems:"flex-end",gap:2}}>{[1,2,3,4].map(i=><div key={i} style={{width:5,height:4+i*4,background:i<=count?col:"#1c2825",borderRadius:1}}/>)}</div>);
}

function Tag({label,active,color}){
  const c=color||C.positive;
  return(
    <span style={{fontSize:10,fontWeight:600,letterSpacing:"0.07em",padding:"3px 8px",borderRadius:4,border:`1px solid ${active?"#2d3f52":C.cardBorder}`,color:active?C.textDim:C.textMuted,background:active?"#162032":"transparent",display:"inline-flex",alignItems:"center",gap:4}}>
      {active&&<span style={{width:5,height:5,borderRadius:"50%",background:c,display:"inline-block"}}/>}
      {label}
    </span>
  );
}

function ConsensusBar({consensus, lineMove, sharpScore}) {
  if (!consensus||consensus.total===0) return null;
  const pct=Math.round((consensus.agree/consensus.total)*100);
  const allSharpAgree=consensus.sharpTotal>0&&consensus.sharpAgree===consensus.sharpTotal;
  const steamDetected=lineMove?.hasData&&lineMove?.ml<-3;

  return (
    <div style={{background:"#0a0f0e",borderRadius:8,padding:"10px 12px",marginBottom:10}}>
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
        <div style={{display:"flex",alignItems:"center",gap:5,background:allSharpAgree?"rgba(110,231,183,0.06)":"#0c1210",border:`1px solid ${allSharpAgree?C.positiveBorder:C.cardBorder}`,borderRadius:6,padding:"4px 8px"}}>
          <span style={{fontSize:9,color:C.textMuted}}>SHARP</span>
          <span style={{fontSize:11,fontWeight:700,color:allSharpAgree?C.positive:C.textMuted}}>{consensus.sharpAgree}/{consensus.sharpTotal}</span>
          {allSharpAgree&&<span style={{fontSize:9,color:C.positive}}>✓</span>}
        </div>

        {/* Line movement */}
        {lineMove?.hasData && (
          <div style={{display:"flex",alignItems:"center",gap:5,background:steamDetected?C.steamBg:"#0c1210",border:`1px solid ${steamDetected?"rgba(248,113,113,0.25)":C.cardBorder}`,borderRadius:6,padding:"4px 8px"}}>
            <span style={{fontSize:9,color:C.textMuted}}>LINE MOVE</span>
            <span style={{fontSize:11,fontWeight:700,color:lineMove.ml<0?C.positive:lineMove.ml>0?"#f87171":C.textMuted}}>
              {lineMove.ml===0?"—":lineMove.ml<0?`↓ ${lineMove.ml}¢`:`↑ +${lineMove.ml}¢`}
            </span>
            {steamDetected&&<span style={{fontSize:9,color:C.steam}}>STEAM</span>}
          </div>
        )}

        {/* Total movement */}
        {lineMove?.hasData && lineMove.ou!==0 && (
          <div style={{display:"flex",alignItems:"center",gap:5,background:"#0c1210",border:`1px solid ${C.cardBorder}`,borderRadius:6,padding:"4px 8px"}}>
            <span style={{fontSize:9,color:C.textMuted}}>TOTAL</span>
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

function OptimalBadge({bet}){
  const ep=(bet.edge*100).toFixed(1);
  const hasEdge=bet.edge>0.005;
  return(
    <div style={{background:hasEdge?C.accentDim:"rgba(255,255,255,0.02)",border:`1px solid ${hasEdge?C.accentBorder:C.cardBorder}`,borderRadius:8,padding:"9px 12px",marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
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
  );
}

function BetTabs({active,onChange,bets}){
  return(
    <div style={{display:"flex",gap:3,background:"#0a0f0e",borderRadius:8,padding:3,marginBottom:12}}>
      {["ML","SPREAD","O/U"].map(t=>{
        const isActive=active===t,isOpt=bets[0]?.type===t;
        return(<button key={t} onClick={()=>onChange(t)} style={{flex:1,padding:"6px 0",borderRadius:6,border:`1px solid ${isActive?"#2d3f52":"transparent"}`,background:isActive?"#162032":"transparent",color:isActive?C.text:isOpt?C.textDim:C.textMuted,fontSize:10,fontWeight:700,letterSpacing:"0.07em",cursor:"pointer",position:"relative"}}>
          {t}{isOpt&&!isActive&&<span style={{position:"absolute",top:-3,right:4,width:5,height:5,borderRadius:"50%",background:C.accent,display:"block"}}/>}
        </button>);
      })}
    </div>
  );
}

function SideCard({label,pin,dk,isLean}){
  const e=(edge(pin,dk)*100).toFixed(1);
  const hasEdge=edge(pin,dk)>0;
  return(
    <div style={{background:isLean?C.positiveBg:"#0c1210",border:`1px solid ${isLean?C.positiveBorder:C.cardBorder}`,borderRadius:7,padding:"9px 11px"}}>
      <div style={{fontSize:9,color:isLean?C.positive:C.textMuted,marginBottom:6}}>{isLean?"◄ ":""}{label}</div>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:9,color:C.textMuted}}>PIN</span><span style={{fontSize:13,fontWeight:700,fontFamily:"monospace",color:isLean?C.text:C.textDim}}>{fmt(pin)}</span></div>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontSize:9,color:C.textMuted}}>DK</span><span style={{fontSize:13,fontWeight:700,fontFamily:"monospace",color:isLean?C.positive:C.textDim}}>{fmt(dk)}</span></div>
      <div style={{fontSize:9,color:C.textMuted,borderTop:`1px solid ${C.cardBorder}`,paddingTop:4}}>EDGE <span style={{color:hasEdge?C.positive:C.textMuted}}>{hasEdge?"+":""}{e}%</span></div>
    </div>
  );
}

function MLView({game}){
  const lh=game.lean===game.home;const ml=game.ml||{};
  return(
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 60px 80px",gap:8,alignItems:"start"}}>
      <div>
        <div style={{fontSize:9,color:C.textMuted,marginBottom:5}}>LEAN ML</div>
        <div style={{fontSize:9,color:C.textMuted,display:"flex",gap:16,marginBottom:3}}><span>PIN</span><span>DK</span></div>
        <div style={{display:"flex",gap:12,fontFamily:"monospace",fontSize:14,fontWeight:700}}>
          <span style={{color:C.textDim}}>{fmt(lh?ml.home_pin:ml.away_pin)}</span>
          <span style={{color:C.positive}}>{fmt(lh?ml.home_dk:ml.away_dk)}</span>
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
        <div style={{fontFamily:"monospace",fontSize:16,fontWeight:700,color:C.text,marginTop:8}}>{(iProb(lh?ml.home_pin:ml.away_pin)*100).toFixed(1)}%</div>
      </div>
    </div>
  );
}
function SpreadView({game}){
  const lh=game.lean===game.home;const sp=game.spread||{};
  return(<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
    <SideCard label={`${game.away} ${fmt(sp.away_line)}`} pin={sp.away_pin} dk={sp.away_dk} isLean={!lh}/>
    <SideCard label={`${game.home} ${fmt(sp.home_line)}`} pin={sp.home_pin} dk={sp.home_dk} isLean={lh}/>
  </div>);
}
function OUView({game}){
  const ou=game.ou||{};
  const oe=edge(ou.over_pin,ou.over_dk),ue=edge(ou.under_pin,ou.under_dk);
  const best=oe>=ue?"OVER":"UNDER";
  return(<div>
    <div style={{fontSize:9,color:C.textMuted,marginBottom:8}}>TOTAL <span style={{fontSize:20,color:C.text,fontFamily:"monospace",fontWeight:700,marginLeft:6}}>{ou.total}</span></div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
      <SideCard label={`OVER ${ou.total}`}  pin={ou.over_pin}  dk={ou.over_dk}  isLean={best==="OVER"}/>
      <SideCard label={`UNDER ${ou.total}`} pin={ou.under_pin} dk={ou.under_dk} isLean={best==="UNDER"}/>
    </div>
  </div>);
}

function GameCard({rawGame}){
  const [tab,setTab]=useState("ML");
  const {optimal,bets,sig,tags}=analyze(rawGame);
  const lh=rawGame.lean===rawGame.home;
  const mlP=lh?rawGame.ml?.home_pin:rawGame.ml?.away_pin;
  const steamDetected=rawGame.lineMove?.hasData&&rawGame.lineMove?.ml<-3;

  return(
    <div style={{background:steamDetected?"rgba(248,113,113,0.04)":C.card,border:`1px solid ${steamDetected?"rgba(248,113,113,0.2)":C.cardBorder}`,borderRadius:12,padding:"14px 14px 12px",marginBottom:10}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
        <div>
          <div style={{fontSize:9,color:C.textMuted,letterSpacing:"0.06em",marginBottom:4}}>{rawGame.time}</div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:22,fontWeight:800,fontFamily:"monospace",color:!lh?C.lean:C.nonLean}}>{rawGame.away}</span>
            <span style={{fontSize:10,color:C.textMuted}}>@</span>
            <span style={{fontSize:22,fontWeight:800,fontFamily:"monospace",color:lh?C.lean:C.nonLean}}>{rawGame.home}</span>
          </div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:11,color:C.textDim,fontFamily:"monospace",marginBottom:5}}>◄ {rawGame.lean} {fmt(mlP)}</div>
          <div style={{display:"flex",alignItems:"center",gap:6,justifyContent:"flex-end"}}>
            {steamDetected&&<span style={{fontSize:8,color:C.steam,background:C.steamBg,border:"1px solid rgba(248,113,113,0.25)",borderRadius:3,padding:"2px 5px"}}>🔥 STEAM</span>}
            <span style={{fontSize:8,color:C.textMuted,background:"#0f1614",border:`1px solid ${C.cardBorder}`,borderRadius:3,padding:"2px 5px"}}>MACRO AUTO</span>
            <SignalBars count={sig}/>
            <span style={{fontSize:9,color:sig===4?"#f59e0b":C.textDim}}>{sig}/4</span>
          </div>
        </div>
      </div>

      <ConsensusBar consensus={rawGame.consensus} lineMove={rawGame.lineMove} sharpScore={rawGame.consensus?.sharpTotal>0?rawGame.consensus.sharpAgree/rawGame.consensus.sharpTotal:0}/>
      <OptimalBadge bet={optimal}/>
      <BetTabs active={tab} onChange={setTab} bets={bets}/>

      <div style={{marginBottom:12}}>
        {tab==="ML"&&<MLView game={rawGame}/>}
        {tab==="SPREAD"&&<SpreadView game={rawGame}/>}
        {tab==="O/U"&&<OUView game={rawGame}/>}
      </div>

      <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
        {Object.entries(tags).map(([k,v])=><Tag key={k} label={k} active={v} color={k==="STEAM"?C.steam:C.positive}/>)}
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

  async function load(s){
    setLoading(p=>({...p,[s]:true}));
    setErrors(p=>({...p,[s]:null}));
    try{
      const {games:raw,requestsRemaining}=await fetchLiveOdds(s);
      setGames(p=>({...p,[s]:raw}));
      setUpdated(p=>({...p,[s]:new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"})}));
      if(requestsRemaining!==null) setCreditsLeft(requestsRemaining);
    }catch(e){setErrors(p=>({...p,[s]:e.message}));}
    finally{setLoading(p=>({...p,[s]:false}));}
  }

  useEffect(()=>{load(sport);},[sport]);

  const cur=games[sport]||[],isLoading=loading[sport],err=errors[sport],upd=updated[sport];
  const filtered=cur.filter(g=>{try{return analyze(g).sig>=sigFilter;}catch{return false;}});

  return(
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:"'Inter',system-ui,sans-serif",paddingBottom:40}}>
      <div style={{background:C.bg,borderBottom:`1px solid ${C.cardBorder}`,padding:"12px 14px",position:"sticky",top:0,zIndex:10}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <span style={{fontSize:12,color:C.text,fontWeight:800,letterSpacing:"0.12em"}}>SIGNALS</span>
          <button onClick={()=>load(sport)} disabled={isLoading} style={{background:"transparent",border:`1px solid ${C.cardBorder}`,borderRadius:20,color:C.textDim,fontSize:10,fontWeight:600,padding:"4px 12px",cursor:"pointer"}}>
            {isLoading?"⟳ LOADING...":"⟳ REFRESH"}
          </button>
        </div>

        <div style={{display:"flex",gap:4,marginBottom:10,overflowX:"auto",paddingBottom:2}}>
          {SPORTS.map(s=>(
            <button key={s.key} onClick={()=>setSport(s.key)} style={{padding:"5px 12px",borderRadius:20,whiteSpace:"nowrap",border:`1px solid ${sport===s.key?"#2d3f52":C.cardBorder}`,background:sport===s.key?"#162032":"transparent",color:sport===s.key?C.text:C.textMuted,fontSize:11,fontWeight:600,cursor:"pointer",position:"relative"}}>
              {s.emoji} {s.label}
              {games[s.key]?.length>0&&sport!==s.key&&<span style={{position:"absolute",top:-3,right:-2,width:5,height:5,borderRadius:"50%",background:"#6ee7b7",display:"block"}}/>}
            </button>
          ))}
        </div>

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          {upd?<span style={{fontSize:9,color:C.textMuted}}>Updated {upd} · Pinnacle + 7 books</span>:<span/>}
          {creditsLeft!==null&&<span style={{fontSize:9,color:creditsLeft<50?"#f59e0b":C.textMuted}}>{creditsLeft}/500 requests left</span>}
        </div>

        <div style={{display:"flex",gap:4}}>
          {[1,2,3,4].map(n=>(
            <button key={n} onClick={()=>setSigFilter(n)} style={{padding:"4px 12px",borderRadius:20,border:`1px solid ${sigFilter===n?"#2d3f52":C.cardBorder}`,background:sigFilter===n?"#162032":"transparent",color:sigFilter===n?C.text:C.textMuted,fontSize:10,fontWeight:600,cursor:"pointer"}}>Signal {n}+</button>
          ))}
        </div>
      </div>

      <div style={{padding:"8px 14px",display:"flex",gap:14,borderBottom:`1px solid ${C.cardBorder}`,flexWrap:"wrap"}}>
        {[["#f59e0b","4/4 Max"],["#6ee7b7","3/4 High"],["#3b82f6","2/4 Dev"],["#334155","1/4 Watch"],["#f87171","🔥 Steam"]].map(([c,l])=>(
          <span key={l} style={{fontSize:9,color:C.textMuted,display:"flex",alignItems:"center",gap:4}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:c,display:"inline-block"}}/>{l}
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
        {err&&!isLoading&&(
          <div style={{margin:16,background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:10,padding:16}}>
            <div style={{fontSize:11,color:"#ef4444",fontWeight:700,marginBottom:6}}>⚠ ERROR</div>
            <div style={{fontSize:10,color:C.textDim,marginBottom:12}}>{err}</div>
            <button onClick={()=>load(sport)} style={{background:"transparent",border:`1px solid ${C.cardBorder}`,color:C.textDim,fontSize:10,fontWeight:600,borderRadius:6,padding:"6px 16px",cursor:"pointer"}}>RETRY</button>
          </div>
        )}
        {!isLoading&&!err&&filtered.length===0&&cur.length>0&&<div style={{textAlign:"center",padding:"40px 0",color:C.textMuted,fontSize:11}}>No games at Signal {sigFilter}+ — try lowering the filter</div>}
        {!isLoading&&!err&&cur.length===0&&upd&&<div style={{textAlign:"center",padding:"40px 0",color:C.textMuted,fontSize:11}}>No {sport} games today</div>}
        {!isLoading&&filtered.map((g,i)=>{try{return<GameCard key={i} rawGame={g}/>;}catch{return null;}})}
      </div>

      <div style={{textAlign:"center",fontSize:8,color:"#1c2825",letterSpacing:"0.08em",padding:"12px 0 0"}}>
        SHARP BOOKS: PINNACLE · BOOKMAKER · LOWVIG · CONSENSUS ACROSS 8 BOOKS
      </div>
    </div>
  );
}
