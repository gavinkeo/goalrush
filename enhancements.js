/* v151: compact entry tools, fixture-derived history and full-resolution exports. */
(function(){
'use strict';
let model=null,selected='',feed=null,exporting=false,roundChosen=false;
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
 $('gr-export').addEventListener('click',()=>exportImage(false));
 $('gr-history-export').addEventListener('click',()=>exportImage(true));
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
 const e=chosen(),b=$('gr-my-entry');b.hidden=!e;
 if(e){
  const r=model.ranking().find(r=>String(r.entry.id)===selected);
  const fixtures=[];['ucl','uel'].forEach(c=>(e[c].fixtures||[]).forEach(f=>{if(!S().isFinal(f)){const k=S().kickoff(f);if(k&&(f.status==='live'||k.getTime()>=Date.now()))fixtures.push({f,t:e[c],k});}}));fixtures.sort((a,b)=>a.k-b.k);
  const next=fixtures[0];const line=next?`${next.f.status==='live'?'LIVE':next.k.toLocaleDateString('en-IE',{timeZone:'Europe/Dublin',day:'numeric',month:'short'})+' · '+next.f.kickoff} · ${next.t.club} v ${next.f.opponent}`:'All available results below';
  b.innerHTML=`<span><strong>${escape(e.entrant)}</strong><small>${escape(line)}</small></span><span class="gr-my-score">${escape(r.rankLabel)} · ${r.total}<small>View entry ↗</small></span>`;
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
async function exportImage(useHistory){
 if(exporting||!model)return;exporting=true;message('Preparing high-resolution image…');
 $('gr-export').disabled=true;$('gr-history-export').disabled=true;
 try{
  await document.fonts.ready;
  const h=useHistory?history():null;
  const rows=h?h.rows.map(r=>({...r,rankLabel:(r.tied?'T':'')+r.rank,prizeLabel:''})):model.ranking().map(r=>({...r,id:String(r.entry.id),name:r.entry.entrant}));
  const width=1800,rowH=80,top=300,height=top+rows.length*rowH+160;
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');
  ctx.fillStyle='#061024';ctx.fillRect(0,0,width,height);
  const grad=ctx.createLinearGradient(80,0,width-80,0);grad.addColorStop(0,'#4de0ff');grad.addColorStop(1,'#f4b062');ctx.fillStyle=grad;ctx.fillRect(0,0,width,9);
  ctx.font='900 65px Inter, sans-serif';ctx.fillText('EURO GOAL RUSH 26/27',80,112);
  ctx.fillStyle='#bed0e7';ctx.font='500 27px Inter, sans-serif';
  ctx.fillText(h?`MATCHDAY ${h.md}  ·  ${h.complete?'COMPLETED ROUND':'PROVISIONAL STANDINGS'}`:'LIVE LEADERBOARD  ·  36 ENTRANTS',80,167);
  const cov=S().coverage(model.entries),now=new Date().toLocaleString('en-IE',{timeZone:'Europe/Dublin',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
  const freshness=feed?.failures?'Saved results · feed unavailable':cov.missing?'Incomplete results':feed?.busy?'Update in progress':'Latest available results';
  ctx.font='400 24px Inter, sans-serif';ctx.fillStyle='#8da4c7';ctx.fillText(`${now} Irish time  ·  ${h?(h.complete?'Final round totals':'Round still in progress'):`${cov.finished}/${cov.total} fixtures complete · ${freshness}`}`,80,212);
  ctx.font='700 21px Inter, sans-serif';ctx.fillText('RANK',90,275);ctx.fillText('ENTRANT',230,275);ctx.fillText(h?'ROUND / MOVE':'CLUB TOTALS',1050,275);ctx.textAlign='right';ctx.fillText('TOTAL',1705,275);ctx.textAlign='left';
  rows.forEach((r,i)=>{
   const y=top+i*rowH;ctx.fillStyle=r.id===selected?'#12364a':i%2?'#0b1930':'#09152a';ctx.fillRect(65,y,width-130,rowH-3);
   if(r.rank<=3){ctx.fillStyle=grad;ctx.fillRect(65,y,4,rowH-3);}
   ctx.fillStyle=r.rank<=3?'#f4c77a':'#9fb4d0';ctx.font='800 29px Inter, sans-serif';ctx.fillText(r.rankLabel,90,y+48);
   ctx.fillStyle='#f5f8ff';ctx.font='700 29px Inter, sans-serif';ctx.fillText(r.name,230,y+48,760);
   ctx.font='600 24px Inter, sans-serif';ctx.fillStyle='#a9bdd6';
   if(h)ctx.fillText(`+${r.gained} goals${r.change===null?'':r.change>0?'  ·  ↑ '+r.change:r.change<0?'  ·  ↓ '+Math.abs(r.change):'  ·  unchanged'}`,1050,y+48);
   else{const t=r.entry;ctx.fillText(`${t.ucl.abbr||t.ucl.club} ${t.ucl.goalsFor+t.ucl.goalsAgainst}  +  ${t.uel.abbr||t.uel.club} ${t.uel.goalsFor+t.uel.goalsAgainst}`,1050,y+48,470);}
   ctx.textAlign='right';ctx.font='900 37px Inter, sans-serif';ctx.fillStyle='#ffffff';ctx.fillText(String(r.total),1705,y+49);ctx.textAlign='left';
  });
  ctx.fillStyle='#8da4c7';ctx.font='500 25px Inter, sans-serif';ctx.fillText('Goals scored + goals conceded  ·  UCL + UEL league phase',80,height-92);ctx.fillText('gavinkeo.github.io/goalrush',80,height-48);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error('Image creation failed');
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`euro-goal-rush-${h?'md'+h.md:'leaderboard'}-${S().today()}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
  message('Image ready — check your downloads.');
 }catch(e){message('Could not save the image. Please try again.');console.error(e);}finally{exporting=false;$('gr-export').disabled=false;$('gr-history-export').disabled=false;}
}
window.GoalRushUI={init,update,status};
})();
