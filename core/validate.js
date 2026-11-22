import {check,DATASETS,SCHEMA,validDate,initial} from './model.js';
import {validateTrade,iso,cents,price,textOK} from './records.js';import {balance} from './finance.js';
import {milestones} from './analytics.js';
const keyOK=x=>typeof x==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(x);
function plain(v){return v&&Object.getPrototypeOf(v)===Object.prototype;}
function safeTree(v,depth=0){
 check(depth<32,'Backup structure exceeds the nesting limit.');
 if(v===null||typeof v!=='object')return;
 for(const k of Object.keys(v)){check(!['__proto__','constructor','prototype'].includes(k),'Invalid object key.');safeTree(v[k],depth+1);}
}
function financialSettings(v){
 check(plain(v)&&['opening','fees','slippage','margin'].every(k=>cents(v[k]))&&Number.isFinite(v.intradayPct)&&v.intradayPct>=0&&v.intradayPct<=100,'Invalid account configuration.');
 check(['light','dark'].includes(v.theme)&&typeof v.notifications==='boolean'&&(v.lastBackup===null||iso(v.lastBackup)),'Invalid device preferences.');
}
function statSnapshot(v){check(plain(v)&&Number.isSafeInteger(v.n)&&v.n>=0&&Number.isSafeInteger(v.net),'Invalid historical statistics.');}
function plan(t,s){
 const p=t.initialPlan;
 if(p===null){check(t.origin==='retrospective','Pre-trade evidence needs an original plan.');return;}
 check(plain(p)&&iso(p.savedAt)&&['pass','fail','unknown'].includes(p.checklist)&&p.contract!=='Unknown','Invalid original plan evidence.');
 validateTrade({...t,...p,status:'planned',fills:[],exit:null},s);
}
function tradeSnapshot(t,s){check(keyOK(t.id),'Invalid trade identifier.');validateTrade(t,s);plan(t,s);}
function cash(c){check(['withdrawal','deposit','broker adjustment','adjustment'].includes(c.type)&&validDate(c.date)&&iso(c.time)&&cents(c.amount,true)&&c.amount!==0&&(!['deposit','withdrawal'].includes(c.type)||c.amount>0)&&textOK(c.note)&&c.note.trim(),'Invalid cash transaction.');}
function strategy(v){check(textOK(v.name,100)&&v.name.trim()&&textOK(v.version,50)&&v.version.trim()&&textOK(v.description)&&iso(v.created),'Invalid strategy version.');}
function recon(r){check(validDate(r.date)&&iso(r.savedAt)&&['realised cash','brokerage equity','available funds'].includes(r.kind)&&textOK(r.ref)&&cents(r.amount,true)&&plain(r.snapshot)&&Number.isSafeInteger(r.snapshot.recorded)&&Number.isSafeInteger(r.snapshot.difference)&&['Reconciled','Difference Detected','Not Reconciled'].includes(r.snapshot.status),'Invalid statement comparison.');}
function review(r,s){check(DATASETS.includes(r.dataset)&&validDate(r.date)&&iso(r.savedAt)&&['week','month','quarter','year','milestone'].includes(r.kind)&&textOK(r.reflection)&&r.reflection.trim()&&textOK(r.objective)&&r.objective.trim()&&(!r.strategy||s.strategies.some(v=>v.id===r.strategy))&&(r.kind!=='milestone'||milestones.includes(r.milestone)),'Invalid development review.');statSnapshot(r.stats);}
function report(r,s){check(DATASETS.includes(r.dataset)&&validDate(r.date)&&iso(r.savedAt)&&['selected','week','month'].includes(r.kind)&&textOK(r.title,120)&&textOK(r.text,8*1024*1024)&&Array.isArray(r.ids)&&new Set(r.ids).size===r.ids.length&&r.ids.every(k=>s.trades.some(t=>t.id===k))&&['includeNotes','includeTrades','includeCompliance'].every(k=>typeof r[k]==='boolean'),'Invalid coaching report.');statSnapshot(r.stats);check(r.stats.n===r.ids.length,'Report count differs from its selected records.');}
export function validate(s){
 safeTree(s);check(plain(s)&&s.schema===SCHEMA&&Number.isSafeInteger(s.revision)&&s.revision>=0,'Invalid account header.');
 financialSettings(s.settings);
 const collections=['cash','trades','strategies','reconciliations','reviews','reports','audit'];
 for(const k of collections){check(Array.isArray(s[k])&&s[k].length<=200000,'Invalid '+k+' collection.');let seen=new Set();for(const v of s[k]){check(plain(v)&&keyOK(v.id)&&!seen.has(v.id),'Invalid or duplicate ID in '+k+'.');seen.add(v.id);}}
 s.strategies.forEach(strategy);s.trades.forEach(t=>tradeSnapshot(t,s));s.cash.forEach(cash);s.reconciliations.forEach(recon);s.reviews.forEach(r=>review(r,s));s.reports.forEach(r=>report(r,s));
 const byEntity={trade:s.trades,cash:s.cash,strategy:s.strategies,reconciliation:s.reconciliations,review:s.reviews,report:s.reports};
 const latest=new Map();
 const created=new Set();
 for(const a of s.audit){
 check((a.entity==='settings'||Object.hasOwn(byEntity,a.entity))&&keyOK(a.key)&&iso(a.time)&&textOK(a.reason)&&a.reason.trim()&&Array.isArray(a.overrides)&&a.overrides.length<=25,'Invalid audit event.');
 if(a.entity!=='settings')check(byEntity[a.entity].some(v=>v.id===a.key),'Audit references an unknown record.');
 if(a.entity==='trade'){
 const prev=latest.get(a.key)||null;check(JSON.stringify(prev)===JSON.stringify(a.before),'Trade audit chain is incomplete.');
 tradeSnapshot(a.after,s);check(a.after.id===a.key,'Invalid audit trade ID.');latest.set(a.key,a.after);
 }
 if(a.entity!=='trade'&&a.entity!=='settings'){
   const record=byEntity[a.entity].find(v=>v.id===a.key);
   const token=a.entity+'/'+a.key;
   check(!created.has(token)&&a.before===null,'Duplicate immutable record audit.');
   created.add(token);
   const expected=a.entity==='report'?{id:record.id,title:record.title}:record;
   check(JSON.stringify(a.after)===JSON.stringify(expected),'Record and audit snapshot disagree.');
 }
 if(a.entity==='settings'){financialSettings(a.before);financialSettings(a.after);}
 for(const w of a.overrides){check(a.entity==='trade'&&w.acknowledged===true&&textOK(w.reason)&&w.reason.trim()&&textOK(w.rule,100)&&textOK(w.label,300)&&['sen','contracts','trades','overnights'].includes(w.unit)&&Number.isSafeInteger(w.limit)&&Number.isSafeInteger(w.exposure),'Invalid warning acknowledgment.');}
 }
 for(const t of s.trades)check(JSON.stringify(latest.get(t.id))===JSON.stringify(t),'Saved trade differs from its audit history.');
 for(const [entity,items] of Object.entries(byEntity)){
   if(entity!=='trade')for(const item of items)check(created.has(entity+'/'+item.id),'Missing historical record audit.');
 }
 check(Number.isSafeInteger(balance(s)),'Account total is outside the supported range.');return s;
}


