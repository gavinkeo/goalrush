const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../app.js'),'utf8');
const context=vm.createContext({totalScore:entry=>entry.total});
vm.runInContext(source.slice(source.indexOf('function gapSummary('),source.indexOf('function managerTeamCard(')),context);
test('entrant lead status distinguishes sole leaders, tied leaders and gaps to first place',()=>{
 assert.equal(context.gapSummary([{total:25},{total:24},{total:20}],1,25),'LEADER');
 assert.equal(context.gapSummary([{total:25},{total:25},{total:20}],1,25),'TIED FOR THE LEAD');
 assert.equal(context.gapSummary([{total:25},{total:24},{total:20}],3,20),'5 goals off the lead');
 assert.equal(context.gapSummary([{total:25},{total:24}],2,24),'1 goal off the lead');
});
