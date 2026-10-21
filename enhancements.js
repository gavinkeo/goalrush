/* v151: compact entry tools, fixture-derived history and full-resolution exports. */
(function(){
'use strict';
let model=null,selected='',feed=null,roundChosen=false;
const $=id=>document.getElementById(id), S=()=>window.GoalRushScores;
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function message(text){$('gr-message').textContent=text;}
function chosen(){return model?.entries.find(e=>String(e.id)===selected);}
function init(config){
 model=config;
 try{selected=localStorage.getItem('goalrush-my-entry-2026-27')||'';}catch{}
 if(!chosen())selected='';
 const picker=$('gr-entry');
 config.entries.slice().sort((a,b)=>a.entrant.localeCompare(b.entrant)).forEach(e=>picker.add(new Option(e.entrant,String(e.id))));picker.value=selected;
 picker.addEventListener('change',()=>{selected=picker.value;try{localStorage.setItem('goalrush-my-entry-2026-27',selected);}catch{message('This browser cannot remember your selection after you leave.');}update();});
 $('gr-my-entry').addEventListener('click',()=>{
   const e=chosen();if(!e)return;
   if(matchMedia('(max-width:700px)').matches){
     const search=$('search');if(search.value){search.value='';search.dispatchEvent(new Event('input',{bubbles:true}));}
     const card=[...document.querySelectorAll('.mobile-card')].find(c=>c.dataset.entrant===e.entrant);
     if(card){card.open=true;card.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'start'});card.querySelector('summary').focus({preventScroll:true});}
   }else model.open(e.entrant);
 });
 $('gr-history').addEventListener('click',()=>{const panel=$('gr-history-panel');panel.hidden=!panel.hidden;$('gr-history').setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden)renderHistory();});
 $('gr-round').addEventListener('change',()=>{roundChosen=true;renderHistory();});
 $('gr-refresh').addEventListener('click',()=>window.goalRushScoreEngine?.refresh(true));
 update();
}
function status(state){
 feed=state;
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
 $('gr-progress-count').innerHTML=`<strong>${cov.finished}</strong> / ${cov.total} matches complete`;
 $('gr-progress-fill').style.width=`${pct}%`;
 $('gr-progress-meter').setAttribute('aria-valuenow',pct.toFixed(1));
 $('gr-progress-meter').setAttribute('aria-valuetext',`${cov.finished} of ${cov.total} matches complete, ${percent}`);
 const e=chosen(),b=$('gr-my-entry');b.hidden=!e;
 if(e){
  const r=model.ranking().find(r=>String(r.entry.id)===selected);
  b.innerHTML=`<span>View my entry <span aria-hidden="true">↗</span></span><span class="gr-my-score">${escape(r.rankLabel)} <span class="gr-entry-separator">·</span> <strong>${r.total}</strong> goals</span>`;
 }
 document.querySelectorAll('.mobile-card').forEach(card=>card.classList.toggle('gr-selected',!!e&&card.dataset.entrant===e.entrant));
 const available=[];for(let md=1;md<=8;md++){if(model.entries.some(e=>['ucl','uel'].some(c=>e[c].fixtures?.[md-1]?.date<=S().today())))available.push(md);}
 const picker=$('gr-round'),old=picker.value;
 const options=available.length?available:[1];
 if([...picker.options].map(o=>o.value).join(',')!==options.join(',')){picker.replaceChildren(...options.map(n=>new Option(`Matchday ${n}`,String(n))));picker.value=roundChosen&&options.includes(Number(old))?old:String(options.at(-1));}
 if(!$('gr-history-panel').hidden)renderHistory();
}
function history(){return S().round(model.entries,Number($('gr-round').value)||1);}
function renderHistory(){
 const h=history();$('gr-history-note').textContent=h.complete?`Standings after UCL + UEL matchday ${h.md}. Round = goals added that round; Move = places gained or lost since the previous completed round.`:'Provisional: this round or earlier results are incomplete. Position changes will appear when the full round is confirmed.';
 $('gr-history-body').innerHTML=h.rows.map(r=>`<tr${r.id===selected?' class="gr-selected"':''}><td>${r.tied?'T':''}${r.rank}</td><th scope="row">${escape(r.name)}</th><td>+${r.gained}</td><td><strong>${r.total}</strong></td><td class="${r.change>0?'gr-up':r.change<0?'gr-down':''}">${r.change===null?'—':r.change>0?'↑ '+r.change:r.change<0?'↓ '+Math.abs(r.change):'•'}</td></tr>`).join('');
}
window.GoalRushUI={init,update,status};
})();
