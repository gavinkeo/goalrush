/* v151: compact entry tools, fixture-derived history and full-resolution exports. */
(function(){
'use strict';
let model=null,roundChosen=false;
const $=id=>document.getElementById(id), S=()=>window.GoalRushScores;
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function init(config){
 model=config;
 $('gr-history').addEventListener('click',()=>{const panel=$('gr-history-panel');panel.hidden=!panel.hidden;$('gr-history').setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden)renderHistory();});
 $('gr-round').addEventListener('change',()=>{roundChosen=true;renderHistory();});
 $('gr-refresh').addEventListener('click',()=>window.goalRushScoreEngine?.refresh(true));
 update();
}
function status(state){
 const stamp=state.lastChecked?new Date(state.lastChecked).toLocaleTimeString('en-IE',{timeZone:'Europe/Dublin',hour:'2-digit',minute:'2-digit'}):'';
 const parts=[];
 if(state.busy)parts.push('Updating scores…');
 else if(state.failures)parts.push('Feed unavailable · saved results shown');
 else if(stamp)parts.push(`Checked ${stamp} Irish time`);
 else parts.push('Saved results');
 if(state.missing)parts.push(`${state.missing} result${state.missing===1?'':'s'} awaiting confirmation`);
 if(!state.storage)parts.push('Device saving unavailable');
 $('gr-status').textContent=parts.join(' · ');$('gr-status').classList.toggle('gr-warning',!!(state.failures||state.missing));
 $('gr-refresh').disabled=state.busy;
}
function update(){
 if(!model)return;
 const cov=S().coverage(model.entries),pct=cov.total?Math.min(100,cov.finished/cov.total*100):0;
 const percent=`${pct.toFixed(1)}%`;
 $('gr-progress-percent').textContent=percent;
 $('gr-progress-count').innerHTML=`<strong>${cov.finished}</strong> / ${cov.total} matches`;
 $('gr-progress-fill').style.width=`${pct}%`;
 $('gr-progress-meter').setAttribute('aria-valuenow',pct.toFixed(1));
 $('gr-progress-meter').setAttribute('aria-valuetext',`${cov.finished} of ${cov.total} matches, ${percent}`);
 const stats=S().goalStats(model.entries);
 ['all','ucl','uel'].forEach(comp=>{
   $(`gr-goals-${comp}`).textContent=stats[comp].goals.toLocaleString('en-IE');
   $(`gr-average-${comp}`).textContent=stats[comp].average===null?'—':stats[comp].average.toFixed(2);
   $(`gr-stat-${comp}`).setAttribute('aria-label',`${comp==='all'?'All competitions':comp.toUpperCase()}: ${stats[comp].goals} goals in ${stats[comp].matches} completed matches, ${stats[comp].average===null?'no average yet':stats[comp].average.toFixed(2)+' goals per game'}`);
 });
 const available=[];for(let md=1;md<=8;md++){if(model.entries.some(e=>['ucl','uel'].some(c=>e[c].fixtures?.[md-1]?.date<=S().today())))available.push(md);}
 const picker=$('gr-round'),old=picker.value;
 const options=available.length?available:[1];
 if([...picker.options].map(o=>o.value).join(',')!==options.join(',')){picker.replaceChildren(...options.map(n=>new Option(`Matchday ${n}`,String(n))));picker.value=roundChosen&&options.includes(Number(old))?old:String(options.at(-1));}
 if(!$('gr-history-panel').hidden)renderHistory();
}
function history(){return S().round(model.entries,Number($('gr-round').value)||1);}
function renderHistory(){
 const h=history();$('gr-history-note').textContent=h.complete?`Standings after UCL + UEL matchday ${h.md}. Round = goals added that round; Move = places gained or lost since the previous completed round.`:'Provisional: this round or earlier results are incomplete. Position changes will appear when the full round is confirmed.';
 $('gr-history-body').innerHTML=h.rows.map(r=>`<tr><td>${r.tied?'T':''}${r.rank}</td><th scope="row">${escape(r.name)}</th><td>+${r.gained}</td><td><strong>${r.total}</strong></td><td class="${r.change>0?'gr-up':r.change<0?'gr-down':''}">${r.change===null?'—':r.change>0?'↑ '+r.change:r.change<0?'↓ '+Math.abs(r.change):'•'}</td></tr>`).join('');
}
window.GoalRushUI={init,update,status};
})();
