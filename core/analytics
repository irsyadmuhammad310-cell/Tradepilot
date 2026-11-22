import {complete,ordered,period,monday,shift,localTime,today,check,id,stamp,audit} from './model.js';
import {sum,result,planned} from './finance.js';import {streak,environment,recordedPeak} from './risk.js';
export function selected(s,dataset='live',from='',to='9999'){return s.trades.filter(t=>complete(t)&&t.dataset===dataset&&t.date>=from&&t.date<=to).sort(ordered);}
const mean=a=>a.length?sum(a)/a.length:null;
export function metrics(ts) {
 const rs=ts.map(result),ps=ts.map(planned).filter(Boolean),wins=rs.filter(r=>r.net>0),losses=rs.filter(r=>r.net<0),w=sum(wins,r=>r.net),l=-sum(losses,r=>r.net);
 return {n:ts.length,gross:sum(rs,r=>r.gross),fees:sum(rs,r=>r.fees),costs:sum(rs,r=>r.costs),net:w-l,winRate:rs.length?wins.length/rs.length:null,averageWin:mean(wins.map(r=>r.net)),averageLoss:mean(losses.map(r=>r.net)),expectancy:mean(rs.map(r=>r.net)),factor:l?w/l:null,lossTotal:l,avgRisk:mean(ps.map(p=>p.risk)),grossRR:mean(ps.map(p=>p.grossRR).filter(x=>x!=null)),netRR:mean(ps.map(p=>p.netRR).filter(x=>x!=null)),plans:ps.length,...streak(ts)};
}
export const session=t=>{const h=Number(localTime(t.entryTime).slice(11,13));return h<6||h>=19?'Evening':h<13?'Morning':'Afternoon';};
export function grouped(ts,key){const g=new Map();for(const t of ts){const k=key(t);if(!g.has(k))g.set(k,[]);g.get(k).push(t);}return [...g].map(([key,items])=>({key,...metrics(items)}));}
export function overrides(s,t){return s.audit.filter(a=>a.entity==='trade'&&a.key===t.id&&a.overrides.length).flatMap(a=>a.overrides);}
export function rolling(ts,size){const a=[...ts].sort(ordered);return a.slice(size-1).map((t,i)=>({date:t.date,...metrics(a.slice(i,i+size))}));}
export const weights={rules:.35,risk:.35,journal:.20,reviews:.10};
export function dueWeeks(first,to){if(!first||first>to)return [];let d=shift(monday(first),2);if(d<first)d=shift(d,7);let weeks=[];for(;d<=to;d=shift(d,7))weeks.push(monday(d));return weeks;}
export function discipline(s,ts,dataset,to=today(),from='') {
 const c=Object.fromEntries(Object.keys(weights).map(k=>[k,{applicable:0,assessed:0,passed:0}]));
 const add=(k,v)=>{c[k].applicable++;if(v!=null){c[k].assessed++;if(v)c[k].passed++;}};
 for(const t of ts){
 const p=t.initialPlan,checklist=t.origin==='pretrade'?p?.checklist:'unknown';
 add('rules',checklist==='pass'?true:checklist==='fail'?false:null);add('rules',t.compliance==='unknown'?null:t.compliance==='pass');
 const z=planned(t),warnings=overrides(s,t);
 add('risk',z&&p&&t.origin==='pretrade'?z.risk<environment(s,t.dataset,p.entryDate,p.entryTime,t.id).cap:null);
 add('risk',recordedPeak(s,t)<=1);add('risk',!t.overnight&&localTime(t.entryTime).slice(0,10)===localTime(t.time).slice(0,10));
 add('risk',!warnings.some(w=>['day','week','actual-risk','streak'].includes(w.rule)));
 for(const v of [t.strategy,t.entryReason||t.setup,t.exitReason,t.reflection,t.lesson])add('journal',!!v);
 }
 const first=selected(s,dataset)[0]?.date;const start=first&&from>first?from:first;
 for(const week of dueWeeks(start,to))add('reviews',s.reviews.some(r=>r.dataset===dataset&&r.kind==='week'&&r.date<=to&&period(r.date,'week')===week));
 let assessed=0,applicable=0,weighted=0,available=true;
 for(const [k,v] of Object.entries(c)){v.score=v.assessed?v.passed/v.assessed*100:null;v.coverage=v.applicable?v.assessed/v.applicable:null;assessed+=v.assessed;applicable+=v.applicable;if(v.score===null)available=false;else weighted+=v.score*weights[k];}
 const coverage=applicable?assessed/applicable:null;return {components:c,assessed,applicable,coverage,score:available?weighted:null,provisional:coverage!==null&&coverage<.8,n:ts.length};
}
export const milestones=['Strategy documentation completed','Initial 50-trade review','100-trade strategy evaluation','150-trade consistency assessment','12-month live-performance review','Capital-readiness assessment'];
export function progress(s,dataset='live',asOf=today(),strategy=''){
 const ts=selected(s,dataset,'',asOf),specific=strategy?ts.filter(t=>t.strategy===strategy):ts;
 const first=ts[0]?.date;let anniversary='';if(first){const d=new Date(first+'T12:00Z');d.setUTCFullYear(d.getUTCFullYear()+1);anniversary=d.toISOString().slice(0,10);}
 const docs=s.strategies.filter(v=>v.description.trim()&&(!strategy||v.id===strategy)).length;
 return milestones.map((name,i)=>{
 const review=s.reviews.find(r=>r.dataset===dataset&&r.milestone===name&&r.date<=asOf&&(!strategy||r.strategy===strategy));
 const n=i===0?docs:i===2?specific.length:ts.length;
 const eligible=[docs>0,n>=50,!!strategy&&n>=100,n>=150,dataset==='live'&&!!first&&anniversary<=asOf,dataset==='live'&&s.reviews.some(r=>r.dataset==='live'&&r.milestone===milestones[4]&&r.date<=asOf)][i];
 return {name,eligible,done:i===0?docs>0:!!review,detail:[docs+' documented versions',n+' / 50 trades',strategy?n+' / 100 version trades':'Select a strategy version',n+' / 150 trades',anniversary?'First anniversary '+anniversary:'Awaiting first live trade','Requires a written 12-month live review'][i]};});
}
export function saveReview(s,r) {
 check(['week','month','quarter','year','milestone'].includes(r.kind)&&r.reflection.trim()&&r.objective.trim(),'Write a reflection and a measurable objective.');
 check(r.date<=today(),'Completed reviews require a current or past date.');
 if(r.kind==='milestone'){const m=progress(s,r.dataset,r.date,r.strategy).find(m=>m.name===r.milestone);check(m?.eligible,'More recorded evidence is required for this milestone review.');}
 const item={...r,id:id(),savedAt:stamp()};s.reviews.push(item);audit(s,'review',item.id,null,item,'Archived written review');return item;
}

