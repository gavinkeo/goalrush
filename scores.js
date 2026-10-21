/* Euro Goal Rush: durable final scores and recoverable live updates. */
(function(root){
"use strict";
const LIVE_NAME_ALIASES = {
  "inter milan": ["internazionale", "inter", "fc internazionale milano"],
  "feyenoord": ["feyenoord rotterdam"],
  "atletico madrid": ["atletico de madrid", "atletico madrid"],
  "bayern munich": ["bayern munchen", "fc bayern munich", "fc bayern munchen"],
  "paris saint germain": ["psg", "paris sg"],
  "porto": ["fc porto"],
  "sporting cp": ["sporting lisbon", "sporting clube de portugal"],
  "union sg": ["union saint gilloise", "union st gilloise", "union st.-gilloise", "royale union saint gilloise"],
  "rb salzburg": ["red bull salzburg", "fc salzburg", "salzburg"],
  "sparta prague": ["sparta praha", "ac sparta praha"],
  "slavia prague": ["slavia praha", "sk slavia praha"],
  "viktoria plzen": ["viktoria plzen", "fc viktoria plzen"],
  "fenerbahce": ["fenerbahce sk"],
  "roma": ["as roma", "a.s. roma"],
  "besiktas": ["besiktas jk"],
  "omonia": ["omonia nicosia", "ac omonia"],
  "lillestrom": ["lillestrom sk"],
  "hapoel beer sheva": ["hapoel be'er sheva", "hapoel beersheba"],
  "hoffenneim": ["tsg hoffenheim"],
  "hoffenheim": ["tsg hoffenheim", "1899 hoffenheim"],
  "marseille": ["olympique de marseille"],
  "lens": ["rc lens"],
  "rennes": ["stade rennais", "stade rennais fc"],
  "ofi crete": ["ofi", "ofi fc"],
  "torreense": ["scu torreense", "sc torreense"],
  "nec nijmegen": ["nec", "n.e.c."],
  "como": ["como 1907"],
  "celje": ["nk celje"],
  "viking": ["viking fk"],
  "sabah": ["sabah fk"],
  "jagiellonia": ["jagiellonia bialystok"],
  "bodo glimt": ["bodo/glimt", "fk bodo glimt"],
  "psv eindhoven": ["psv"],
  "stuttgart": ["vfb stuttgart"],
  "anderlecht": ["rsc anderlecht"],
  "shakhtar donetsk": ["shakhtar", "fc shakhtar donetsk"],
  "dinamo zagreb": ["gnk dinamo zagreb"],
  "ferencvaros": ["ferencvarosi tc", "ferencvaros tc"],
  "olympiacos": ["olympiacos fc", "olympiakos"],
  "slovan bratislava": ["sk slovan bratislava"],
  "sturm graz": ["sk sturm graz"],
  "lecs poznan": ["lech poznan"],
  "lech poznan": ["kks lech poznan"],
  "lask": ["lask linz"],
  "real betis": ["real betis balompie"],
  "celtic": ["celtic fc"],
  "liverpool": ["liverpool fc"],
  "aston villa": ["aston villa fc"],
  "manchester city": ["man city"],
  "manchester united": ["man united", "man utd"],
  "real sociedad": ["real sociedad san sebastian"],
  "ararat armenia": ["fc ararat armenia"]
};

function liveClubKey(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(fc|cf|sc|ac|afc|fk|sk|rc|sv|vfb|nk|gnk|kks|rsc|jk|as|ss|ssc|sl|pfc|tsg)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function liveClubKeys(name) {
  const base = liveClubKey(name);
  const aliases = LIVE_NAME_ALIASES[base] || [];
  return new Set([base, ...aliases.map(liveClubKey)].filter(Boolean));
}

function liveSameClub(a, b) {
  const aKeys = liveClubKeys(a);
  const bKeys = liveClubKeys(b);
  for (const key of aKeys) if (bKeys.has(key)) return true;
  return false;
}

function findLiveFixtureMatch(feedMatches, comp, pairing, fixtureDate) {
  // First demand the strongest possible match: same competition, same date and both clubs.
  // The date check matters because the history refresh contains every matchday seen so far.
  const sameDate = feedMatches.filter(candidate =>
    candidate?.comp === comp && String(candidate?.date || "") === String(fixtureDate || "")
  );

  const exact = sameDate.find(candidate =>
    liveSameClub(candidate.home, pairing.home) &&
    liveSameClub(candidate.away, pairing.away)
  );
  if (exact) return exact;

  // ESPN occasionally expands one club name (e.g. Roma -> AS Roma, Feyenoord ->
  // Feyenoord Rotterdam). A single correctly matched side on the correct date/home-away
  // slot is enough to identify a fixture uniquely, so don't let one naming variation
  // block the score for both entrants.
  const homeSide = sameDate.filter(candidate => liveSameClub(candidate.home, pairing.home));
  if (homeSide.length === 1) return homeSide[0];

  const awaySide = sameDate.filter(candidate => liveSameClub(candidate.away, pairing.away));
  if (awaySide.length === 1) return awaySide[0];

  return null;
}

const finalStates = new Set(['played','finished','ft']);
const isFinal = f => finalStates.has(String(f?.status).toLowerCase());
function score(value) {
  const m = /^(\d{1,2})\s*[-–—]\s*(\d{1,2})$/.exec(String(value ?? '').trim());
  return m ? [Number(m[1]),Number(m[2])] : null;
}
function key(comp, team, f) { return [comp.toUpperCase(),team.club,f.opponent || f.code,f.venue,f.date].join('|'); }
function each(entries, fn) { entries.forEach(e => ['ucl','uel'].forEach(c => (e[c]?.fixtures || []).forEach((f,i) => fn(f,e[c],c,i,e)))); }
function totals(team) {
  let gf=0,ga=0,played=0;
  (team.fixtures || []).forEach(f => { const s=score(f.score); if(s && (isFinal(f)||f.status==='live')){gf+=s[0];ga+=s[1];if(isFinal(f))played++;} });
  Object.assign(team,{goalsFor:gf,goalsAgainst:ga,played});
}
function recalc(entries) { entries.forEach(e=>['ucl','uel'].forEach(c=>totals(e[c]))); }
function capture(entries) {
  const records={}; each(entries,(f,t,c)=>{if(isFinal(f)&&score(f.score))records[key(c,t,f)]=score(f.score).join('-');}); return records;
}
function restore(entries, records) {
  if(!records || typeof records!=='object')return;
  each(entries,(f,t,c)=>{const s=score(records[key(c,t,f)]);if(s&&!score(f.score)){f.score=s.join('-');f.status='played';}}); recalc(entries);
}
function today() { return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Dublin',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()); }
function kickoff(f) {
  const [y,m,d]=String(f.date||'').split('-').map(Number), [h,min]=String(f.kickoff||'00:00').split(':').map(Number);
  if(!y||!m||!d||!Number.isFinite(h)||!Number.isFinite(min))return null;
  const utc=Date.UTC(y,m-1,d,h,min), parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Dublin',hour:'2-digit',hourCycle:'h23'}).format(new Date(utc));
  const offset=(Number(parts)-h+24)%24; return new Date(utc-offset*3600000);
}
function coverage(entries) {
  let missing=0,finished=0,live=0,total=0;
  each(entries,f=>{total++;if(isFinal(f)&&score(f.score))finished++;else if(f.status==='live')live++;else {const k=kickoff(f);if(k&&k.getTime()+3*3600000<Date.now())missing++;}});
  return {missing:missing/2,finished:finished/2,live:live/2,total:total/2};
}
// Count actual completed matches once, rather than both entrants' fixture copies.
function goalStats(entries) {
  const groups={all:{goals:0,matches:0},ucl:{goals:0,matches:0},uel:{goals:0,matches:0}},seen=new Set();
  each(entries,(f,t,c)=>{
    const s=score(f.score);if(!isFinal(f)||!s)return;
    const fixture=JSON.stringify([c,f.date,...[t.club,f.opponent||f.code].sort()]);
    if(seen.has(fixture))return;seen.add(fixture);
    [groups[c],groups.all].forEach(g=>{g.matches++;g.goals+=s[0]+s[1];});
  });
  Object.values(groups).forEach(g=>g.average=g.matches?g.goals/g.matches:null);
  return groups;
}
// Daily movement uses Irish calendar dates and competition ranks (ties share a rank).
function dailyStandings(entries, day=today()) {
  let baselineComplete=true;
  const rows=entries.map(e=>{
    let before=0,total=0,played=0,scheduled=0;
    ['ucl','uel'].forEach(c=>(e[c].fixtures||[]).forEach(f=>{
      scheduled++;
      const s=score(f.score),final=isFinal(f)&&!!s;
      if(final)played++;
      if(s&&(final||f.status==='live'))total+=s[0]+s[1];
      if(f.date<day){if(final)before+=s[0]+s[1];else baselineComplete=false;}
    }));
    return {id:String(e.id),before,total,played,scheduled};
  });
  return rows.map(r=>({...r,change:baselineComplete
    ? (1+rows.filter(x=>x.before>r.before).length)-(1+rows.filter(x=>x.total>r.total).length)
    : null}));
}
function round(entries, md) {
  let complete=true, previousComplete=true, any=false;
  const rows=entries.map(e=>{
    let total=0,gained=0,previous=0;
    ['ucl','uel'].forEach(c=>(e[c].fixtures||[]).slice(0,md).forEach((f,i)=>{
      const s=score(f.score),valid=isFinal(f)&&s;
      if(!valid){complete=false;if(i<md-1)previousComplete=false;}
      if(s&&(isFinal(f)||f.status==='live')){any=true;const n=s[0]+s[1];total+=n;if(i===md-1)gained+=n;else previous+=n;}
    }));return {id:String(e.id),name:e.entrant,total,gained,previous,entry:e};
  });
  const ranked=[...rows].sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name));
  const prev=[...rows].sort((a,b)=>b.previous-a.previous||a.name.localeCompare(b.name));
  ranked.forEach(r=>{r.rank=1+rows.filter(x=>x.total>r.total).length;r.tied=rows.filter(x=>x.total===r.total).length>1;r.change=md>1&&complete&&previousComplete?(1+prev.filter(x=>x.previous>r.previous).length)-r.rank:null;});
  return {md,rows:ranked,complete,previousComplete,any};
}
async function json(url) {
  const ctrl=new AbortController(), timer=setTimeout(()=>ctrl.abort(),12000);
  try{const r=await fetch(url,{cache:'no-store',signal:ctrl.signal});if(!r.ok)throw new Error(`HTTP ${r.status}`);return await r.json();}finally{clearTimeout(timer);}
}
function engine(options) {
  const entries=options.entries,signature=JSON.stringify(entries.map(e=>[e.id,e.ucl.club,e.uel.club,e.ucl.fixtures.map(f=>f.date),e.uel.fixtures.map(f=>f.date)]));
  const storageKey='goalrush-final-scores-2026-27-v151';
  const status={busy:false,lastChecked:null,failures:0,storage:true};let fullAt=0,stopped=false;
  function notify(){options.repaint?.();options.status?.({...status,...coverage(entries)});}
  function save(){try{localStorage.setItem(storageKey,JSON.stringify({signature,records:capture(entries),savedAt:new Date().toISOString()}));}catch{status.storage=false;}}
  try{const saved=JSON.parse(localStorage.getItem(storageKey)||'null');if(saved?.signature===signature)restore(entries,saved.records);}catch{status.storage=false;}
  async function refresh(force=false) {
    if(status.busy||stopped)return;status.busy=true;notify();
    const full=force||Date.now()-fullAt>300000, day=today(), jobs=[];
    ['UCL','UEL'].forEach(c=>{
      const dates=new Set();each(entries,(f,t,comp)=>{if(comp.toUpperCase()===c&&f.date<=day&&(full||!isFinal(f)||f.date===day))dates.add(f.date);});
      [...dates].sort().forEach(date=>jobs.push({comp:c,date}));
    });
    let failures=0,index=0;
    await Promise.all(Array.from({length:Math.min(4,jobs.length)},async()=>{
      while(index<jobs.length){const job=jobs[index++];try{const feed=await options.fetch(job.comp,job.date);options.apply(feed);save();notify();}catch{failures++;}}
    }));
    if(full)fullAt=Date.now();status.failures=failures;status.busy=false;
    if(!failures)status.lastChecked=new Date().toISOString();notify();
  }
  async function start(){notify();try{const baseline=await json('results.json?v=151');if(baseline?.season==='2026/27'){restore(entries,baseline.records);save();notify();}}catch{}await refresh(true);}
  start();const interval=setInterval(()=>{if(!document.hidden)refresh();},30000);
  const resume=()=>{if(!document.hidden)refresh();};document.addEventListener('visibilitychange',resume);window.addEventListener('online',resume);
  return {refresh,status,stop(){stopped=true;clearInterval(interval);document.removeEventListener('visibilitychange',resume);window.removeEventListener('online',resume);}};
}
const api={score,isFinal,key,each,totals,recalc,capture,restore,today,kickoff,coverage,goalStats,dailyStandings,round,json,engine,liveSameClub,findLiveFixtureMatch};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GoalRushScores=api;
})(typeof window!=='undefined'?window:globalThis);
