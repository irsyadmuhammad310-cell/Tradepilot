import {INSTRUMENTS,complete,ordered,check} from './model.js';
export const sum=(a,fn=x=>x)=>a.reduce((n,x)=>n+fn(x),0);
export function fillsOf(t){return t.fills?.length?t.fills:[{side:'entry',price:t.entry,qty:t.qty,time:t.entryTime||t.time},{side:'exit',price:t.exit,qty:t.qty,time:t.time}];}
export function executions(t) {
 let open=0,peak=0,entered=0,exited=0,buy=0,sell=0,previous='';
 for(const f of fillsOf(t)){
 check(['entry','exit'].includes(f.side)&&Number.isSafeInteger(f.price)&&f.price>0&&f.price<=1000000&&Number.isSafeInteger(f.qty)&&f.qty>=1&&f.qty<=10000,'Fills need a side, whole-point price and whole contracts.');
 check(typeof f.time==='string' && !isNaN(Date.parse(f.time)) && f.time>=previous,'Fill times must be in execution order.');previous=f.time;
 if(f.side==='entry'){open+=f.qty;entered+=f.qty;buy+=f.price*f.qty;}else{open-=f.qty;exited+=f.qty;sell+=f.price*f.qty;}
 check(open>=0,'An exit fill exceeds the entered quantity.');peak=Math.max(peak,open);
 }
 check(entered>0&&entered===exited,'Closed trades need matching entry and exit quantities.');
 const gross=(sell-buy)*INSTRUMENTS[t.instrument].pointSen*(t.direction==='long'?1:-1);
 check(Number.isSafeInteger(gross),'Trading value exceeds the supported range.');
 return {gross,peak,qty:entered,entry:buy/entered,exit:sell/exited};
}
export function result(t) {
 const x=executions(t),costs=sum(t.costs||[],c=>c.amount);
 return {...x,fees:t.fees,costs,net:x.gross-t.fees-costs};
}
export function planned(t) {
 const p=t.status==='planned'?t:(t.initialPlan||t);
 if(!p.entry||!p.sl||!p.qty)return null;
 const distance=Math.abs(p.entry-p.sl)*2500*p.qty;
 const risk=distance+p.estimatedFees+p.slippage;
 const reward=p.tp?((p.tp-p.entry)*(p.direction==='long'?1:-1))*2500*p.qty:null;
 return {risk,reward:reward==null?null:reward-p.estimatedFees-p.slippage,grossRR:distance&&reward!=null?reward/distance:null,netRR:risk&&reward!=null?(reward-p.estimatedFees-p.slippage)/risk:null};
}
export function rows(s,dataset='live') {
 const cash=dataset==='live'?s.cash.map(c=>({...c,value:c.type==='withdrawal'?-c.amount:c.amount})):[];
 const settlements=s.trades.filter(t=>complete(t)&&t.dataset===dataset).map(t=>({id:'settlement/'+t.id,tradeId:t.id,order:t.order??0,date:t.date,time:t.time,type:'settlement',note:t.contract,value:result(t).net}));
 return [...cash,...settlements].sort(ordered);
}
export function balance(s,items=rows(s)){return s.settings.opening+sum(items,r=>r.value);}
export function reconciliation(s,r) {
 const recorded=balance(s,rows(s).filter(x=>x.date<=r.date)),difference=r.amount-recorded;
 return {recorded,difference,status:r.kind!=='realised cash'?'Not Reconciled':difference===0?'Reconciled':'Difference Detected'};
}
export function trend(s,dataset='live',before='',through='9999',opening=s.settings.opening) {
 const events=rows(s,dataset);let account=opening,performance=opening,peak=opening,dd=0,ddPct=0,growth=1,returnPeak=1,usable=true;
 const points=[];for(const r of events){
 if(r.date>through)break;
 if(r.date<before){account+=r.value;performance=peak=account;continue;}
 if(r.type==='settlement'){
 if(account>0&&usable){
   growth*=1+r.value/account;
   returnPeak=Math.max(returnPeak,growth);
   ddPct=Math.max(ddPct,(returnPeak-growth)/returnPeak);
 }else usable=false;
 performance+=r.value;peak=Math.max(peak,performance);dd=Math.max(dd,peak-performance);
 }account+=r.value;points.push({date:r.date,account,performance});
 }return {points,dd,ddPct:usable?ddPct:null,growth:usable?growth-1:null};
}


