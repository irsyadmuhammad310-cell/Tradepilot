export const SCHEMA = 2;
export const ZONE = 'Asia/Kuala_Lumpur';
export const INSTRUMENTS = Object.freeze({FCPO:{currency:'MYR', pointSen:2500, multiplier:25, fxToAccount:1}});
export const DATASETS = ['live','simulated','backtested'];
export const STATUSES = ['draft','planned','cancelled','closed','reviewed'];
export const id = () => crypto.randomUUID();
export const stamp = () => new Date().toISOString();
export const clone = value => structuredClone(value);
export function check(condition, message) { if (!condition) throw new Error(message); }
export const complete = t => !t.deleted && ['closed','reviewed'].includes(t.status);
export const cmp = (a,b) => a < b ? -1 : a > b ? 1 : 0;
export const ordered = (a,b) => cmp(a.date,b.date)||cmp(a.time,b.time)||cmp(a.order??0,b.order??0)||cmp(a.id,b.id);
export function localTime(instant=new Date()) {return new Date(+new Date(instant)+8*3600000).toISOString().slice(0,16);}
export const today = () => localTime().slice(0,10);
export const toISO = local => new Date(local + ':00+08:00').toISOString();
export const validDate = d => typeof d==='string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && Number.isFinite(Date.parse(d)) && new Date(d+'T00:00:00Z').toISOString().startsWith(d);
export function shift(date,days) {const d=new Date(date+'T12:00Z'); d.setUTCDate(d.getUTCDate()+days); return d.toISOString().slice(0,10);}
export function monday(date) {return shift(date,-((new Date(date+'T12:00Z').getUTCDay()+6)%7));}
export function period(date,unit) {
 if(unit==='week')return monday(date);
 if(unit==='month')return date.slice(0,7);
 if(unit==='quarter')return date.slice(0,4)+'-Q'+Math.ceil(Number(date.slice(5,7))/3);
 if(unit==='year')return date.slice(0,4);
 return date;
}
export function initial() {return {schema:SCHEMA,revision:0,settings:{opening:1000000,fees:5000,slippage:0,margin:800000,intradayPct:25,theme:'light',lastBackup:null,notifications:false},trades:[],cash:[],strategies:[],reviews:[],reconciliations:[],reports:[],audit:[]};}
export function audit(s,entity,key,before,after,reason,overrides=[],at=stamp()) {
 check(typeof reason==="string" && reason.trim() && reason.length<=12000,"A written audit reason is required (up to 12,000 characters).");
 s.audit.push({id:id(),entity,key,before:clone(before),after:clone(after),reason,time:at,overrides:clone(overrides)});
}
export function migrate(raw) {
 const s=clone(raw);
 if(s?.schema===1){s.schema=2;s.reports??=[];s.settings.lastBackup??=null;s.settings.notifications??=false;}
 check(s?.schema===SCHEMA,'Unsupported database or backup version.');return s;
}
export function sen(value) {
 const str=String(value).trim();check(/^-?\d{1,10}(\.\d{1,2})?$/.test(str),'Enter an amount with up to two decimal places.');
 const [whole,part='']=str.replace('-','').split('.');return (Number(whole)*100+Number(part.padEnd(2,'0')))*(str.startsWith('-')?-1:1);
}
export const money = n => n==null?'Unavailable':((n<0?'−':'')+'RM'+(Math.abs(n)/100).toLocaleString('en-MY',{minimumFractionDigits:2,maximumFractionDigits:2}));
export const signed = n => n>0?'+'+money(n):money(n);
export const fmtDate = d => new Date(d+'T12:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
export const sample = n => n===0?'No completed trades.':n+' completed trade'+(n===1?'':'s')+(n<20?' · Small sample. Interpret cautiously.':' · Sample size alone does not establish an edge.');


