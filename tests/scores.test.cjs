const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const S=require('../scores.js');
const fixture=(n,status='played')=>({date:'2026-10-20',kickoff:'20:00',opponent:'Other',venue:'H',score:n,status});
const entry=(id,a,b)=>({id,entrant:'Entrant '+id,ucl:{club:'Club '+id,fixtures:a.map((x,i)=>({...fixture(x),date:`2026-10-${20+i}`}))},uel:{club:'UEL '+id,fixtures:b.map((x,i)=>({...fixture(x),date:`2026-10-${20+i}`}))}});
test('strict score parsing preserves 0-0 and rejects missing/malformed values',()=>{
 assert.deepEqual(S.score('0–0'),[0,0]);for(const s of ['',null,'-','1-','-2','1.5-0','NaN-0'])assert.equal(S.score(s),null);
});
test('only finished scores persist; cache restoration recalculates correct totals',()=>{
 const entries=[entry(1,['0-0','2-3'],['1-2'])];entries[0].ucl.fixtures[1].status='live';S.recalc(entries);const saved=S.capture(entries);assert.equal(Object.keys(saved).length,2);
 const copy=structuredClone(entries);S.each(copy,f=>{f.score='';f.status='';});S.restore(copy,saved);assert.equal(copy[0].ucl.played,1);assert.equal(copy[0].uel.goalsFor+copy[0].uel.goalsAgainst,3);assert.equal(copy[0].ucl.fixtures[1].score,'');
});
test('cache never overwrites a newer in-memory score or unknown fixture',()=>{
 const entries=[entry(1,['1-0'],['2-0'])];const records=S.capture(entries);entries[0].ucl.fixtures[0].score='4-0';S.restore(entries,records);assert.equal(entries[0].ucl.goalsFor,4);
 entries[0].uel.fixtures[0].score='';entries[0].uel.fixtures[0].date='2026-11-01';S.restore(entries,records);assert.equal(entries[0].uel.goalsFor,0);
});
test('round history handles tied ranks, gains and position changes',()=>{
 const entries=[entry(1,['1-0','0-0'],['1-0','1-0']),entry(2,['0-0','4-0'],['1-0','0-0']),entry(3,['0-0','2-0'],['1-0','0-0'])];
 const h=S.round(entries,2);assert.equal(h.complete,true);assert.deepEqual(h.rows.map(r=>[r.id,r.rank,r.total,r.change]),[['2',1,5,1],['1',2,3,-1],['3',2,3,0]]);
 assert.equal(h.rows[1].tied,true);assert.equal(h.rows[0].gained,4);
});
test('partial or missing earlier results suppress movement',()=>{
 const entries=[entry(1,['1-0','2-0'],['','0-0'])];const h=S.round(entries,2);assert.equal(h.complete,false);assert.equal(h.rows[0].change,null);
});
test('kickoff follows Dublin daylight saving regardless of machine timezone',()=>{
 assert.equal(S.kickoff({date:'2026-10-21',kickoff:'20:00'}).toISOString(),'2026-10-21T19:00:00.000Z');
 assert.equal(S.kickoff({date:'2026-11-04',kickoff:'20:00'}).toISOString(),'2026-11-04T20:00:00.000Z');
});
test('live updates preserve finals, accept corrections and apply away orientation',()=>{
 const entries=[{id:1,ucl:{club:'Liverpool',fixtures:[{date:'2026-10-20',opponent:'Arsenal',venue:'A',score:'2-1',status:'played'}]},uel:{club:'UEL',fixtures:[]}}];
 const sandbox={entries,GoalRushScores:S,fixturePairing:(t,f)=>({home:f.opponent,away:t.club,venue:f.venue}),findLiveFixtureMatch:S.findLiveFixtureMatch,recalculateTeamTotals:S.totals,generatedFixtureScores:new Map()};vm.createContext(sandbox);
 const source=fs.readFileSync('app.js','utf8');vm.runInContext(source.slice(source.indexOf('function applyLiveScoreFeed('),source.indexOf('function refreshLiveScoreUi(')),sandbox);
 const m={comp:'UCL',date:'2026-10-20',home:'Arsenal',away:'Liverpool',homeScore:null,awayScore:null,status:'upcoming'};
 sandbox.applyLiveScoreFeed([m]);assert.equal(entries[0].ucl.fixtures[0].score,'2-1');
 sandbox.applyLiveScoreFeed([{...m,homeScore:1,awayScore:3,status:'ft'}]);assert.equal(entries[0].ucl.fixtures[0].score,'3-1');assert.equal(entries[0].ucl.goalsFor,3);
 sandbox.applyLiveScoreFeed([{...m,homeScore:0,awayScore:0,status:'live'}]);assert.equal(entries[0].ucl.fixtures[0].score,'3-1');
});
test('bundled result pairs agree and reconstruct the saved live standings',()=>{
 const data=JSON.parse(fs.readFileSync('competition.json')),base=JSON.parse(fs.readFileSync('results.json'));S.restore(data.entries,base.records);let count=0;
 S.each(data.entries,(f,t,c)=>{if(!S.isFinal(f))return;count++;const other=data.entries.map(e=>e[c]).find(t2=>t2.club===f.opponent);const reverse=other.fixtures.find(x=>x.opponent===t.club&&x.date===f.date);assert.equal(reverse.score,S.score(f.score).reverse().join('-'));});assert.ok(count>=144);assert.equal(count,Object.keys(base.records).length);const progress=S.coverage(data.entries);assert.equal(progress.finished,count/2);assert.equal(progress.total,288);assert.equal(progress.finished,81);
});
test('daily movement compares tied competition ranks with start of Irish day',()=>{
 const entries=[entry(1,['1-0','0-0'],['1-0','0-0']),entry(2,['0-0','4-0'],['1-0','0-0']),entry(3,['0-0','4-0'],['1-0','0-0'])];
 const rows=S.dailyStandings(entries,'2026-10-21');
 assert.deepEqual(rows.map(r=>[r.id,r.change,r.played,r.scheduled]),[['1',-2,4,4],['2',1,4,4],['3',1,4,4]]);
 entries[1].ucl.fixtures[1].status='live';
 const live=S.dailyStandings(entries,'2026-10-21')[1];assert.equal(live.played,3);assert.equal(live.total,5);assert.equal(live.change,1);
 entries[0].ucl.fixtures[0].score='';assert.ok(S.dailyStandings(entries,'2026-10-21').every(r=>r.change===null));
});
test('goal stats count mirrored completed fixtures once and exclude live scores',()=>{
 const a={id:1,ucl:{club:'A',fixtures:[{...fixture('2-1'),opponent:'B'},{...fixture('4-2','live'),opponent:'B',date:'2026-10-21'}]},uel:{club:'C',fixtures:[{...fixture('0-0'),opponent:'D'}]}};
 const b={id:2,ucl:{club:'B',fixtures:[{...fixture('1-2'),opponent:'A'}]},uel:{club:'D',fixtures:[{...fixture('0-0'),opponent:'C'}]}};
 assert.deepEqual(S.goalStats([a,b]),{all:{goals:3,matches:2,average:1.5},ucl:{goals:3,matches:1,average:3},uel:{goals:0,matches:1,average:0}});
 assert.equal(S.goalStats([]).all.average,null);
});

test('fixture day switches at 03:00 Irish time across summer, winter and DST changes',()=>{
 const cases=[
  ['2026-10-22T01:59:59Z','2026-10-21'],['2026-10-22T02:00:00Z','2026-10-22'],
  ['2026-11-05T02:59:59Z','2026-11-04'],['2026-11-05T03:00:00Z','2026-11-05'],
  ['2026-10-25T02:59:59Z','2026-10-24'],['2026-10-25T03:00:00Z','2026-10-25'],
  ['2026-03-29T01:59:59Z','2026-03-28'],['2026-03-29T02:00:00Z','2026-03-29'],
  ['2027-01-01T02:59:59Z','2026-12-31'],['2027-01-01T03:00:00Z','2027-01-01']
 ];
 for(const [time,day] of cases)assert.equal(S.fixtureDay(new Date(time)),day,time);
});
