const test=require('node:test'),assert=require('node:assert/strict'),S=require('../scores.js');
test('failed historical date retries and final results survive a new engine',async()=>{
 const entries=[{id:1,entrant:'A',ucl:{club:'A',fixtures:[{date:'2026-09-08',opponent:'B',venue:'H',score:'',status:''}]},uel:{club:'C',fixtures:[]}}];
 const memory=new Map();global.localStorage={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)};
 global.document={hidden:false,addEventListener(){},removeEventListener(){}};global.window={addEventListener(){},removeEventListener(){}};
 const originalFetch=global.fetch;global.fetch=async()=>{throw new Error('offline baseline');};
 let calls=0,done;const states=[],first=new Promise(r=>done=r);
 const engine=S.engine({entries,fetch:async()=>{calls++;if(calls===1)throw new Error('outage');return [{score:'2-1'}];},apply:feed=>{entries[0].ucl.fixtures[0].score=feed[0].score;entries[0].ucl.fixtures[0].status='played';S.recalc(entries);},status:s=>{states.push(s);if(!s.busy&&calls)done();}});
 await first;assert.equal(states.at(-1).failures,1);await engine.refresh();assert.equal(calls,2);assert.equal(entries[0].ucl.goalsFor,2);engine.stop();
 const copy=structuredClone(entries);copy[0].ucl.fixtures[0].score='';copy[0].ucl.fixtures[0].status='';
 const restored=S.engine({entries:copy,fetch:async()=>{throw new Error('offline');},apply(){}});assert.equal(copy[0].ucl.fixtures[0].score,'2-1');restored.stop();global.fetch=originalFetch;
});
