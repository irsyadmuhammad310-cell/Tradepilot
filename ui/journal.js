import {newTrade,saveTrade,duplicates,notes,removeTrade} from '../core/records.js';
import {localTime,toISO,today,ZONE,clone,complete,money,signed,fmtDate,sen,ordered,DATASETS,check} from '../core/model.js';
import {planned,result} from '../core/finance.js';import {warnings} from '../core/risk.js';
import {button,select,field,area,tick,badge,panel,pairs,table,empty,esc,modal,toast,cashInput} from './parts.js';
const labels=['Setup reasoning','Market condition','Entry reasoning','Exit reasoning','Emotional observations','Execution mistakes','Post-trade reflection','Lesson learned'];
export const versionName=(s,id)=>{const v=s.strategies.find(x=>x.id===id);return v?v.name+' · '+v.version:'Unassigned';};
export function journal(ctx){
 const {s}=ctx;const f={dataset:ctx.dataset,...ctx.filters};
 const ts=s.trades.filter(t=>t.deleted===Boolean(f.deleted)&&(!f.status||t.status===f.status)&&(!f.strategy||t.strategy===f.strategy)&&(!f.contract||t.contract===f.contract)&&(!f.dataset||f.dataset===t.dataset)&&(!f.outcome||complete(t)&&Math.sign(result(t).net)===Number(f.outcome))&&(!f.search||[t.id,t.contract,t.direction,versionName(s,t.strategy),...notes.map(k=>t[k])].join(' ').toLowerCase().includes(f.search.toLowerCase()))).sort(ordered);if(f.sort!=='oldest')ts.reverse();
 const toolbar='<div class="filterbar">'+field('search','Search history',f.search,'search')+select('dataset','Dataset',[['','All datasets'],...DATASETS],f.dataset)+select('status','Status',[['','All statuses'],'draft','planned','cancelled','closed','reviewed'],f.status)+select('strategy','Strategy',[['','All strategies'],...s.strategies.map(v=>[v.id,versionName(s,v.id)])],f.strategy)+select('contract','Contract',[['','All contracts'],...new Set(s.trades.map(t=>t.contract))],f.contract)+select('outcome','Result',[['','All outcomes'],['1','Profit'],['-1','Loss'],['0','Break-even']],f.outcome)+select('sort','Sort',['newest','oldest'],f.sort)+tick('deleted','Recovery bin',f.deleted)+'</div>';
 return panel('Trade history',toolbar+(ts.length?table(['Exchange date','Contract / side','Status','Dataset','Net realised P/L',''],ts.map(t=>[esc(fmtDate(t.date)),esc(t.contract+' · '+t.direction),badge(t.status),esc(t.dataset),complete(t)?signed(result(t).net):'—',button(t.deleted?'Recover':'Open',t.deleted?'recover':'trade-detail','small','',t.id)])):empty(f.deleted?'Recovery bin is empty':'No matching trades','Saved trades appear here with their exchange date and audit history.')),button('Strategy versions','strategies','small','layers'));
}
function parseCosts(str){return str.trim()?str.trim().split('\n').map(line=>{let k=line.lastIndexOf('|');check(k>0,'Use Description | amount for each cost.');return {label:line.slice(0,k).trim(),amount:sen(line.slice(k+1))};}):[];}
function parseFills(str){return str.trim()?str.trim().split('\n').map(line=>{let [side,p,q,at]=line.split('|').map(x=>x.trim());return {side,price:Number(p),qty:Number(q),time:toISO(at)};}):[];}
async function readImages(files){check(files.filter(f=>f.size).length<=4,'Choose up to four chart images.');return Promise.all(files.filter(f=>f.size).map(f=>{check(f.size<=2097152,'Each attachment must be under 2 MiB.');return new Promise((res,rej)=>{const r=new FileReader();r.onerror=()=>rej(new Error('Could not read attachment.'));r.onload=()=>res({name:f.name,data:r.result});r.readAsDataURL(f);});}));}
export function tradeForm(ctx,mode,old){
 const {s}=ctx;let original=old?clone(old):newTrade(s,today(),toISO(localTime()));
 if(!old)original.dataset=ctx.dataset;
 const plan=mode==='plan'||(old?.status==='planned'||old?.status==='draft'&&mode==='edit')&&mode!=='close';const closing=mode==='close';
 const status=closing?'closed':old?.status||(plan?'planned':'closed');
 const allowStatus=old?.status==='planned'?['planned','cancelled','closed','reviewed']:old?.initialPlan&&old.status!=='draft'?['closed','reviewed','cancelled']:plan?(old?.status==='draft'?['planned','draft','cancelled','closed','reviewed']:['planned','draft','cancelled']):['closed','reviewed','draft','cancelled'];
 const moneyOpts='min="0" required';
 const priceField=(k,l)=>field(k,l,original[k],'number','min="1" step="1"');
 const dataFields=select('status','Record status',allowStatus,status)+select('dataset','Trading dataset',DATASETS,original.dataset)+field('entryTime','Entry / plan time (MYT)',localTime(original.entryTime),'datetime-local','required')+field('time','Exit / record time (MYT)',closing?localTime():localTime(original.time),'datetime-local','required')+field('entryDate','Entry exchange date',original.entryDate,'date','required')+field('date','Settlement / plan exchange date',closing?today():original.date,'date','required')+field('contract','FCPO delivery month',original.contract==='Unknown'?'':original.contract,'month')+select('direction','Position',['long','short'],original.direction);
 const riskFields=priceField('sl','Initial stop-loss (points)')+priceField('tp','Take-profit target (points)')+cashInput('estimatedFees','Estimated round-trip fees (RM)',original.estimatedFees,moneyOpts)+cashInput('slippage','Planned slippage allowance (RM)',original.slippage,moneyOpts);
 const strategyField=select('strategy','Strategy version',[['','Unassigned'],...s.strategies.map(v=>[v.id,versionName(s,v.id)])],original.strategy);
 const checkItems=[['setupChecked','Setup matches the selected strategy'],['riskChecked','Stop distance, fees and risk reviewed'],['contractChecked','Contract month, size and session checked']];
 const checks=plan?'<fieldset class="checklist"><legend>Pre-trade checklist</legend>'+checkItems.map(([key,label])=>tick(key,label,original.checkItems?.[key])).join('')+'</fieldset>':'';
 const evidence=checks+select('checklist','Pre-trade checklist evidence',['unknown','pass','fail'],original.checklist)+tick('overnight','Planned or actual overnight holding',original.overnight);
 const noteFields=notes.map((k,i)=>area(k,labels[i],original[k]));
 const core='<p class="hint">'+(plan?'Save the plan before execution. The original plan and save time stay in the audit.':'Quick entries are labelled retrospective. Leave the delivery month blank for an unknown historical contract.')+' Match exchange dates to your statement, including evening sessions and holidays.</p><div class="formgrid">'+dataFields+priceField('entry',plan?'Planned entry (points)':'Entry price (points)')+(!plan||old?priceField('exit','Exit price (points)'):'')+field('qty','Quantity (contracts)',original.qty,'number','min="1" step="1" required')+cashInput('fees','Actual round-trip fees (RM)',original.fees,moneyOpts)+(plan?riskFields+strategyField+noteFields[0]+noteFields[1]+evidence:'')+'</div>';
 const more='<details '+(old?'open':'')+'><summary>Advanced journal fields</summary><div class="formgrid">'+(!plan?riskFields+strategyField+noteFields[0]+noteFields[1]+evidence:'')+select('compliance','Recorded rule compliance',['unknown','pass','fail'],original.compliance)+noteFields.slice(2).join('')+area('costs','Additional costs · description | RM',original.costs.map(c=>c.label+' | '+c.amount/100).join('\n'))+area('fills','Execution fills · side | price | qty | MYT datetime',original.fills.map(f=>[f.side,f.price,f.qty,localTime(f.time)].join(' | ')).join('\n'))+'<p class="hint">One fill per line, using entry or exit and YYYY-MM-DDTHH:MM. Fills determine realised P/L when provided.</p><label>Chart screenshots<input type="file" name="images" accept="image/png,image/webp,image/jpeg" multiple></label>'+(original.images.length?tick('clearImages','Replace existing attachments'):'')+'</div></details>';
 const verification='<div id="calc" class="calc" aria-live="polite"></div><div id="alerts"></div><div id="override" hidden>'+tick('ack','I acknowledge the displayed rule warnings')+area('override','Written override reason')+'</div><div id="duplicate" hidden>'+tick('dup','I confirm this potential duplicate is a separate execution')+'</div>';
 function get(fd){const val=k=>String(fd.get(k)??'');const t=clone(original);
 Object.assign(t,{status:val('status'),dataset:val('dataset'),entryTime:toISO(val('entryTime')),time:toISO(val('time')),entryDate:val('entryDate'),date:val('date'),contract:val('contract')||'Unknown',direction:val('direction'),qty:Number(val('qty')),strategy:val('strategy'),costs:parseCosts(val('costs')),fills:parseFills(val('fills')),overnight:fd.has('overnight'),compliance:val('compliance'),checklist:val('checklist')});
 for(const k of ['entry','exit','sl','tp'])t[k]=val(k)?Number(val(k)):null;
 for(const k of ['fees','estimatedFees','slippage'])t[k]=sen(val(k));
 notes.forEach(k=>t[k]=val(k).trim());
 if(plan){
   t.checkItems=Object.fromEntries(checkItems.map(([key])=>[key,fd.has(key)]));
   if(Object.values(t.checkItems).every(Boolean))t.checklist='pass';
   else if(t.checklist==='pass')t.checklist='unknown';
 }
 if(t.fills.length){t.entryTime=t.fills[0].time;t.time=t.fills.at(-1).time;}
 if(t.status==='planned'||t.status==='draft'&&plan){t.time=t.entryTime;t.date=t.entryDate;}
 return t;}
 modal(old?'Edit journal record':plan?'Plan new trade':'Log completed trade',core+more+verification+(old?area('reason','Reason for this edit','','required'):''),async fd=>{const t=get(fd);
 t.images=[...(fd.has('clearImages')?[]:original.images),...await readImages(fd.getAll('images'))];
 await ctx.write(a=>{saveTrade(a,t,{reason:String(fd.get('reason')||''),ack:fd.has('ack'),override:String(fd.get('override')||''),duplicate:fd.has('dup')});});},'Save record',f=>{
 const preview=()=>{const calc=f.querySelector('#calc'),alerts=f.querySelector('#alerts');f.querySelector('#override').hidden=true;f.querySelector('#duplicate').hidden=true;alerts.innerHTML='';
 try{const t=get(new FormData(f)),p=planned(t),r=complete(t)&&(t.fills.length||t.entry&&t.exit)?result(t):null;
 calc.innerHTML=pairs([...(r?[['Gross realised P/L',signed(r.gross)],['Net realised P/L',signed(r.net)]]:[]),...(p?[['Planned risk',money(p.risk)],['Expected net reward',money(p.reward)],['Gross / net R:R',[p.grossRR,p.netRR].map(n=>n?.toFixed(2)??'—').join(' / ')]]:[])])||'';
 if(!p&&!r)calc.textContent='Enter prices to calculate risk and results.';
 if(complete(t)&&!r)return; const all=warnings(s,t);alerts.innerHTML=all.map(a=>'<p class="alert">'+esc(a.label)+' · '+esc(a.unit==='sen'?money(a.exposure)+' / '+money(a.limit):a.exposure+' / '+a.limit+' '+a.unit)+'</p>').join('');f.querySelector('#override').hidden=!all.length;
 f.querySelector('#duplicate').hidden=!duplicates(s,t).length;
 }catch(e){calc.textContent=e.message;}};
 f.addEventListener('input',e=>{if(!['ack','override','reason','dup'].includes(e.target.name)){f.elements.ack.checked=false;preview();}});preview();});
}
export function tradeDetail(ctx,key){
 const t=ctx.s.trades.find(v=>v.id===key);const r=complete(t)?result(t):null,p=planned(t);
 const log=ctx.s.audit.filter(a=>a.entity==='trade'&&a.key===key);
 const history=log.map(a=>'<details><summary>'+esc(localTime(a.time).replace('T',' ')+' · '+a.reason)+'</summary><pre>'+esc(JSON.stringify({...a,before:strip(a.before),after:strip(a.after)},(k,v)=>k==='data'?'[image content in full backup]':v,2))+'</pre></details>').join('');
 modal('FCPO · '+t.contract,pairs([['Trade ID',t.id],['Status',t.status],['Entry evidence',t.origin],['Strategy',versionName(ctx.s,t.strategy)],['Exchange date',t.date],['Gross / net',r?signed(r.gross)+' / '+signed(r.net):'Unavailable'],['Initial planned risk',money(p?.risk)],...notes.filter(k=>t[k]).map(k=>[labels[notes.indexOf(k)],t[k]])])+t.images.map(x=>'<a class="chartimg"><img alt="'+esc(x.name)+'" src="'+esc(x.data)+'"></a>').join('')+'<h3>Historical audit</h3>'+history+'<div class="actions">'+button('Edit record','edit','', 'plan',key)+(t.status==='planned'?button('Record execution','finish','primary','plus',key):'')+button('Move to recovery bin','delete','danger','',key)+'</div>');}
function strip(t){return t?{...t}:t;}
export function discard(ctx,key){modal('Move trade to recovery bin',area('reason','Reason','','required'),async fd=>ctx.write(s=>removeTrade(s,key,fd.get('reason'))),'Move to bin');}
export function recover(ctx,key){let t=clone(ctx.s.trades.find(x=>x.id===key));t.deleted=false;const a=warnings(ctx.s,t);
 modal('Recover trade',area('reason','Recovery reason','','required')+(a.length?'<div class="alert">'+a.map(x=>esc(x.label+' · '+(x.unit==='sen'?money(x.exposure)+' / '+money(x.limit):x.exposure+' / '+x.limit))).join('<br>')+'</div>'+tick('ack','I acknowledge these warnings')+area('override','Written override reason','','required'):'')+(duplicates(ctx.s,t).length?tick('dup','I confirm this is a separate execution'):''),fd=>ctx.write(s=>{saveTrade(s,t,{reason:fd.get('reason'),ack:fd.has('ack'),override:fd.get('override')||'',duplicate:fd.has('dup')});}),'Recover trade');}


