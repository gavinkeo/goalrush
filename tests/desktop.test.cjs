const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const S = require('../scores.js');
const source = fs.readFileSync(require.resolve('../app.js'),'utf8');
const context = vm.createContext({GoalRushScores:S});
for(const [name,next] of [['fixtureValues','fixtureTemporalClass'],['desktopFixtureActivity','desktopActivityStatus'],['desktopActivityStatus','desktopEntrantActivity'],['compactFixtureStatus','compactTeamMarkup']]) {
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
