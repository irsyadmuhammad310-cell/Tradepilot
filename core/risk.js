import {complete,ordered,monday,localTime} from './model.js';
import {balance,rows,sum,planned,result,fillsOf} from './finance.js';
export const RULES={rate:.03,cap:40000,daily:45000,weekly:75000,streak:3};
export const limit=b=>Math.max(0,Math.min(Math.floor(b*3/100),RULES.cap));
export function streak(trades) {
 let current=0,longest=0;for(const t of [...trades].sort(ordered)){let n=result(t).net;if(n<0)current++;if(n>0)current=0;longest=Math.max(longest,current);}return {current,longest};
}
export function environment(s,dataset,date,time='9999',except='') {
 const original=s.trades.find(t=>t.id===except);
 const cutoff={date,time,order:original?.order??(original?0:Infinity),id:except||'~'};
 const before=(r)=>ordered({...r,id:r.tradeId||r.id},cutoff)<=0;
 const eligible=s.trades.filter(t=>t.id!==except&&complete(t)&&t.dataset===dataset&&before(t)).sort(ordered);
 const daily=eligible.filter(t=>t.date===date),weekly=eligible.filter(t=>monday(t.date)===monday(date));
 const account=balance(s,rows(s,dataset).filter(r=>r.tradeId!==except&&before(r)));
 return {account,cap:limit(account),day:sum(daily,t=>result(t).net),week:sum(weekly,t=>result(t).net),losingDay:-sum(daily,t=>Math.min(0,result(t).net)),losingWeek:-sum(weekly,t=>Math.min(0,result(t).net)),...streak(eligible)};
}
// Check only documented execution intervals in one dataset. At an equal
// timestamp assume exits can precede unrelated entries. Zero-duration
// round trips still overlap quantities held continuously across that instant.
export function recordedPeak(s, candidate) {
 const overlapping = s.trades.filter(other =>
   other.id !== candidate.id && complete(other) && other.dataset === candidate.dataset &&
   other.entryTime <= candidate.time && other.time >= candidate.entryTime);
 if (!overlapping.length) return result(candidate).peak;
 const timeline = new Map();
 for (const trade of [candidate, ...overlapping]) {
   for (const fill of fillsOf(trade)) {
     if (!timeline.has(fill.time)) timeline.set(fill.time, new Map());
     const groups = timeline.get(fill.time);
     if (!groups.has(trade.id)) groups.set(trade.id, []);
     groups.get(trade.id).push((fill.side === 'entry' ? 1 : -1) * fill.qty);
   }
 }
 const positions = new Map();
 let peak = 0;
 for (const time of [...timeline.keys()].sort()) {
   const prior = new Map(positions);
   const maxima = new Map();
   for (const [key, changes] of timeline.get(time)) {
     let quantity = positions.get(key) || 0;
     let high = quantity;
     for (const delta of changes) { quantity += delta; high = Math.max(high, quantity); }
     positions.set(key, quantity);
     maxima.set(key, high);
   }
   const held = positions.get(candidate.id) || 0;
   const wasHeld = prior.get(candidate.id) || 0;
   if (held) peak = Math.max(peak, sum([...positions.values()]));
   const continuous = key => Math.min(prior.get(key) || 0, positions.get(key) || 0);
   const base = sum([...positions.keys()], continuous);
   for (const [key, high] of maxima) {
     if (key === candidate.id || (held && wasHeld))
       peak = Math.max(peak, base - continuous(key) + high);
   }
 }
 return peak;
}
export function warnings(s,t) {
 if(!['closed','reviewed','planned'].includes(t.status))return [];
 const risk=planned(t),finished=complete(t),p=t.status==='planned'?t:(t.initialPlan||t);
 const env=environment(s,t.dataset,t.date,t.time,t.id),atEntry=environment(s,t.dataset,p.entryDate||p.date||t.date,p.entryTime||t.entryTime||t.time,t.id),out=[];
 const add=(rule,label,limit,exposure,unit='sen')=>out.push({rule,label,limit,exposure,unit});
 if(risk&&risk.risk>=atEntry.cap)add('per-trade','Planned stop risk · review size or skip the trade',atEntry.cap,risk.risk);
 if(finished&&result(t).net<0&&-result(t).net>=atEntry.cap)add('actual-risk','Realised trade loss',atEntry.cap,-result(t).net);
 const projected=!finished,impact=finished?result(t).net:-(risk?.risk||0);
 for(const [key,label] of [['day','Daily'],['week','Weekly']]){
 const cap=key==='day'?RULES.daily:RULES.weekly;
 if(env[key]+impact<=-cap)add(key,label+(projected?' stop projection':' net realised loss'),cap,-(env[key]+impact));
 }
 const count=finished?(impact<0?env.current+1:impact>0?0:env.current):env.current;
 if(count>=3)add('streak','Consecutive losses',3,count,'trades');
 const quantity=finished?recordedPeak(s,t):t.qty;if(quantity>1)add('size','Simultaneous contracts',1,quantity,'contracts');
 if(t.overnight||(finished&&localTime(t.entryTime).slice(0,10)!==localTime(t.time).slice(0,10)))add('overnight','Overnight holding',0,1,'overnights');
 return out;
}


