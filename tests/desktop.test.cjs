const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const S = require('../scores.js');
const source = fs.readFileSync(require.resolve('../app.js'),'utf8');
const context = vm.createContext({GoalRushScores:S,teamAbbr:team=>team.abbr});
for(const [name,next] of [['desktopActivityFixture','desktopActivityMarkup'],['fixtureValues','fixtureTemporalClass'],['desktopFixtureActivity','desktopActivityStatus'],['desktopActivityStatus','desktopEntrantActivity'],['compactFixtureStatus','compactTeamMarkup']]) {
 vm.runInContext(source.slice(source.indexOf(`function ${name}(`),source.indexOf(`function ${next}(`)),context);
}
test('desktop highlights only the active football day, while retaining an ongoing match',()=>{
 const day=S.fixtureDay(new Date('2026-10-22T01:59:59Z'));
 assert.equal(context.desktopFixtureActivity({date:'2026-10-21',status:'scheduled'},day),'today');
 assert.equal(context.desktopFixtureActivity({date:'2026-10-21',status:'played',score:'0-0'},day),'finished');
 assert.equal(context.desktopFixtureActivity({date:'2026-10-20',status:'played',score:'2-1'},day),'');
 assert.equal(context.desktopFixtureActivity({date:'2026-10-22',status:'scheduled'},day),'');
 const next=S.fixtureDay(new Date('2026-10-22T02:00:00Z'));
 assert.equal(context.desktopFixtureActivity({date:'2026-10-21',status:'played',score:'0-0'},next),'');
 assert.equal(context.desktopFixtureActivity({date:'2026-10-22',status:'scheduled'},next),'today');
 assert.equal(context.desktopFixtureActivity({date:'2026-10-21',status:'live'},next),'live');
});
test('desktop fixture tiles retain the supplied live clock and halftime, without inventing minutes',()=>{
 const f={date:'2026-10-21',status:'live',score:'0-0',_liveMatch:{clock:'63:21'}};
 const tile=context.fixtureValues({fixtures:[f]})[0];
 assert.equal(context.desktopActivityStatus(tile,'live'),"LIVE 63'");
 tile._liveMatch={phase:'ht'};
 assert.equal(context.desktopActivityStatus(tile,'live'),'HT');
 tile._liveMatch={};
 assert.equal(context.desktopActivityStatus(tile,'live'),'LIVE');
 assert.equal(context.desktopActivityStatus({status:'played'},'finished'),'FT');
});

test('compact entrant scores keep home-away order and preserve nil-nil without inventing a result',()=>{
 const como={club:'Como',abbr:'COM'},united={club:'Manchester United',abbr:'MUN'};
 const home=context.desktopActivityFixture(como,{venue:'H',status:'played',score:'4-1'},united);
 const away=context.desktopActivityFixture(united,{venue:'A',status:'played',score:'1-4'},como);
 assert.equal(home.description,'Como 4–1 Manchester United');
 assert.equal(away.description,home.description);
 assert.equal(away.homeCode,'COM');assert.equal(away.awayCode,'MUN');
 assert.equal(context.desktopActivityFixture(como,{venue:'H',status:'live',score:'0-0'},united).result,'0–0');
 assert.equal(context.desktopActivityFixture(como,{venue:'H',status:'scheduled',score:''},united).result,null);
 assert.equal(context.desktopActivityFixture(como,{venue:'H',status:'live',score:''},united).result,null);
});
