// Refresh the shared final-result fallback. Never removes a saved result on feed failure.
const fs=require('node:fs');
const S=require('../scores.js');
async function main(){
 const data=JSON.parse(fs.readFileSync('competition.json','utf8'));
 let old={};try{old=JSON.parse(fs.readFileSync('results.json','utf8'));}catch{}
 S.restore(data.entries,old.records);
 const dates={UCL:new Set(),UEL:new Set()};
 S.each(data.entries,(f,t,c)=>{if(f.date<=S.today())dates[c.toUpperCase()].add(f.date);});
 let failures=0;
 for(const c of ['UCL','UEL'])for(const date of dates[c]){
  try{
   const league=c==='UCL'?'champions':'europa';
   const payload=await S.json(`https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.${league}/scoreboard?dates=${date.replaceAll('-','')}&limit=500`);
   const feed=(payload.events||[]).flatMap(e=>{const m=e.competitions?.[0],h=m?.competitors?.find(x=>x.homeAway==='home'),a=m?.competitors?.find(x=>x.homeAway==='away'),status=m?.status?.type||e.status?.type;if(!h||!a||!status?.completed)return [];const hs=h.score?.displayValue??h.score,as=a.score?.displayValue??a.score;if(!S.score(`${hs}-${as}`))return [];return [{comp:c,date:e.date.slice(0,10),home:h.team.displayName,away:a.team.displayName,homeScore:Number(hs),awayScore:Number(as)}];});
   S.each(data.entries,(f,t,comp)=>{if(comp.toUpperCase()!==c||f.date!==date)return;const away=f.venue==='A';const match=S.findLiveFixtureMatch(feed,c,{home:away?f.opponent:t.club,away:away?t.club:f.opponent},f.date);if(match){f.score=(away?[match.awayScore,match.homeScore]:[match.homeScore,match.awayScore]).join('-');f.status='played';}});
  }catch(e){failures++;console.error(`${c} ${date}: ${e.message}`);}
 }
 const records=S.capture(data.entries);
 if(Object.keys(records).length)fs.writeFileSync('results.json',JSON.stringify({season:'2026/27',savedAt:new Date().toISOString(),records},null,2)+'\n');
 console.log(`${Object.keys(records).length/2} confirmed matches saved; ${failures} failed requests.`);
 if(failures)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1;});
