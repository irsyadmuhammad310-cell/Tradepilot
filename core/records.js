import {id,stamp,check,audit,STATUSES,DATASETS,ZONE,validDate,complete,clone} from './model.js';
import {result,planned,fillsOf} from './finance.js';
import {warnings} from './risk.js';
export const textOK=(v,max=12000)=>typeof v==='string'&&v.length<=max;
export const cents=(v,negative=false)=>Number.isSafeInteger(v)&&Math.abs(v)<=999999999999&&(negative||v>=0);
export const iso=v=>typeof v==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(v)&&!isNaN(Date.parse(v))&&new Date(v).toISOString()===v;
export const price=v=>Number.isInteger(v)&&v>0&&v<=1000000;
export const notes=['setup','market','entryReason','exitReason','emotion','mistakes','reflection','lesson'];
export function validateTrade(t,s) {
 check(STATUSES.includes(t.status)&&DATASETS.includes(t.dataset)&&t.instrument==='FCPO'&&['long','short'].includes(t.direction),'Invalid trade classification.');
 check(t.zone===ZONE&&validDate(t.date)&&validDate(t.entryDate)&&iso(t.time)&&iso(t.entryTime)&&t.entryTime<=t.time&&t.entryDate<=t.date,'Check execution times and exchange dates.');
 check(t.contract==='Unknown'||/^\d{4}-(0[1-9]|1[0-2])$/.test(t.contract),'Select a contract month and year.');
 check(t.status!=='planned'||t.contract!=='Unknown','Select the delivery month for a new plan.');
 check(t.strategy===''||s.strategies.some(v=>v.id===t.strategy),'Unknown strategy version.');
 check([t.fees,t.estimatedFees,t.slippage].every(x=>cents(x)),'Costs must be nonnegative amounts in sen.');
 check(Array.isArray(t.costs)&&t.costs.length<=100&&t.costs.every(c=>textOK(c.label,120)&&c.label.trim()&&cents(c.amount)),'Each additional cost needs a description and amount.');
 check(Number.isInteger(t.qty)&&t.qty>=1&&t.qty<=10000,'Enter a whole contract quantity.');
 for(const f of ['entry','exit','sl','tp'])check(t[f]===null||price(t[f]),'FCPO prices must be positive whole points.');
 check(t.status!=='planned'||(t.entry&&t.sl&&t.tp&&t.setup.trim()),'Plans need entry, stop, target and setup reasoning.');
 if(t.status==='planned'&&t.sl&&t.entry)check(t.direction==='long'?t.sl<t.entry:t.sl>t.entry,'The initial stop must be on the loss side of entry.');
 if(t.status==='planned'&&t.tp&&t.entry)check(t.direction==='long'?t.tp>t.entry:t.tp<t.entry,'The target must be on the profit side of entry.');
 check(Array.isArray(t.fills)&&t.fills.length<=200&&t.fills.every(f=>iso(f.time)&&f.time>=t.entryTime&&f.time<=t.time),'Check fill timestamps against the execution interval.');
 if(['closed','reviewed'].includes(t.status)){result(t);if(t.fills.length){check(t.entryTime===t.fills[0].time&&t.time===t.fills.at(-1).time,'First and final fills must match the recorded execution times.');}}
 check(notes.every(k=>textOK(t[k]))&&['unknown','pass','fail'].includes(t.compliance)&&['unknown','pass','fail'].includes(t.checklist),'Invalid journal observations.');
 check(['retrospective','pretrade'].includes(t.origin)&&typeof t.overnight==='boolean'&&typeof t.deleted==='boolean','Invalid evidence flags.');
 check(Array.isArray(t.images)&&t.images.length<=4&&t.images.every(x=>textOK(x.name,200)&&typeof x.data==='string'&&x.data.length<=2800000&&/^data:image\/(png;base64,iVBORw0KGgo|jpeg;base64,\/9j\/|webp;base64,UklGR)[A-Za-z0-9+/=]*$/.test(x.data)),'Use up to four PNG, JPEG or WebP images under 2 MiB each.');
 check(t.status!=='reviewed'||t.reflection.trim()&&t.lesson.trim(),'Reviewed trades need a reflection and lesson.');
}
export function newTrade(s,date,time) {
 return {id:id(),instrument:'FCPO',zone:ZONE,date,entryDate:date,time,entryTime:time,contract:'Unknown',direction:'long',status:'draft',dataset:'live',origin:'retrospective',strategy:'',qty:1,fees:s.settings.fees,estimatedFees:s.settings.fees,slippage:s.settings.slippage,entry:null,exit:null,sl:null,tp:null,costs:[],fills:[],images:[],initialPlan:null,checklist:'unknown',compliance:'unknown',overnight:false,deleted:false,...Object.fromEntries(notes.map(k=>[k,'']))};
}
export function duplicates(s,t){
 if(!complete(t))return [];
 const a=result(t);return s.trades.filter(o=>o.id!==t.id&&complete(o)&&o.dataset===t.dataset&&o.instrument===t.instrument&&o.contract===t.contract&&o.date===t.date&&o.direction===t.direction&&o.time===t.time).filter(o=>{const b=result(o);return a.entry===b.entry&&a.exit===b.exit&&a.qty===b.qty;});
}
export function saveTrade(s,input,{reason='',ack=false,override='',duplicate=false,now=stamp()}={}){
 const t=clone(input),idx=s.trades.findIndex(v=>v.id===t.id),old=s.trades[idx]||null;
 if(!old)t.order=s.audit.length+1;
 else if(old.order!==undefined)t.order=old.order;
 if(old)check(reason.trim(),'Explain the edit for the audit history.');
 t.initialPlan=old?.initialPlan||null;t.origin=t.initialPlan?'pretrade':'retrospective';
 if(!t.initialPlan&&t.status==='planned'){
 check(!old||['draft','planned'].includes(old.status),'A historical execution cannot become a new pre-trade plan.');
 t.origin='pretrade';t.initialPlan={savedAt:now,entry:t.entry,sl:t.sl,tp:t.tp,direction:t.direction,qty:t.qty,estimatedFees:t.estimatedFees,slippage:t.slippage,date:t.date,entryDate:t.entryDate,entryTime:t.entryTime,time:t.time,checklist:t.checklist,...(t.checkItems?{checkItems:clone(t.checkItems)}:{}),setup:t.setup,market:t.market,contract:t.contract,strategy:t.strategy,images:clone(t.images)};
 }
 if(old?.initialPlan)check(t.dataset===old.dataset,'A saved plan retains its original dataset.');
 if(complete(t)&&t.initialPlan&&t.entryTime<t.initialPlan.savedAt)t.origin='retrospective';
 validateTrade(t,s);
 if(complete(t)&&t.dataset==='live')check(t.time<=now,'A completed live execution needs a past or current time.');
 check(duplicate||!duplicates(s,t).length,'Potential duplicate. Confirm the separate execution before saving.');
 const alerts=warnings(s,t);
 if(alerts.length)check(ack&&override.trim(),'Acknowledge the displayed warnings and enter a written override reason.');
 if(idx>=0)s.trades[idx]=t;else s.trades.push(t);
 audit(s,'trade',t.id,old,t,reason.trim()||(t.status==='planned'?'Saved initial plan':'Created journal record'),alerts.map(a=>({...a,acknowledged:true,reason:override.trim()})),now);return t;
}
export function removeTrade(s,key,reason){check(reason.trim(),'Enter a reason.');const t=s.trades.find(x=>x.id===key);check(t&&!t.deleted,'Trade unavailable.');const before=clone(t);t.deleted=true;audit(s,'trade',key,before,t,reason);}
export function cashEntry(s,c){check(['deposit','withdrawal','adjustment','broker adjustment'].includes(c.type)&&cents(c.amount,true)&&c.amount!==0&&(!['deposit','withdrawal'].includes(c.type)||c.amount>0)&&validDate(c.date)&&iso(c.time)&&textOK(c.note)&&c.note.trim(),'Enter a valid cash amount, date and description.');check(!s.cash.some(x=>x.id===c.id),'Duplicate cash record.');c.order=s.audit.length+1;s.cash.push(c);audit(s,'cash',c.id,null,c,c.note);}
export function strategyVersion(s,name,version,description){name=name.trim();version=version.trim();check(name&&version&&textOK(name,100)&&textOK(version,50)&&textOK(description),'Enter a strategy name and version.');check(!s.strategies.some(v=>v.name.toLowerCase()===name.toLowerCase()&&v.version.toLowerCase()===version.toLowerCase()),'This strategy version already exists.');const v={id:id(),name,version,description,created:stamp()};s.strategies.push(v);audit(s,'strategy',v.id,null,v,'Created immutable strategy version');return v;}


