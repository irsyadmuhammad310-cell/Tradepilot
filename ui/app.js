import {dataPanel,dataActions} from './data.js';
import {coachPage,coachActions} from './coach.js';
import {read,transact} from '../core/db.js';
import {today,localTime,monday,shift,fmtDate,money,DATASETS,complete} from '../core/model.js';
import {icon,button,select,badge,panel,pairs,esc,modal,toast,empty} from './parts.js';
import {journal,tradeForm,tradeDetail,discard,recover} from './journal.js';
import {ledger,cashForm,reconcileForm,strategies,brokerForm} from './capital.js';
import {home,analytics,riskView,tracker,reviewForm} from './analytics.js';
const tabs=[['home','Home'],['journal','Journal'],['analytics','Analytics'],['coach','AI Coach'],['more','More']];
const extras={ledger:'Capital ledger',tracker:'Development tracker',risk:'Risk monitor',settings:'Settings & data'};
const headings={home:['Trading command center','Your account, risk limits and trading discipline in one place.'],journal:['Trading journal','Plan, record and review your FCPO executions.'],analytics:['Performance analytics','Explore realised performance and the evidence behind each metric.'],coach:['AI Coach','Review local observations and prepare a report for ChatGPT.'],more:['Workspace tools','Manage your capital, development and device settings.'],ledger:['Capital ledger','Trace every movement in your recorded trading account.'],tracker:['Development tracker','Turn written reviews into measurable improvements.'],risk:['Risk monitor','Review your advisory limits and historical acknowledgments.'],settings:['Settings & data','Configure your account and manage local backups.']};
const state={s:null,period:'Month',dataset:'live',filters:{},strategy:''};const el=document.querySelector('#app'),d=document.querySelector('#modal');
const channel=typeof BroadcastChannel==='function'?new BroadcastChannel('tradepilot-updates'):null;
function page(){const x=location.hash.slice(1);return Object.hasOwn(headings,x)?x:'home';}
function go(x){if(d.open)d.close();if(page()===x)render();else location.hash=x;window.scrollTo(0,0);}
function context(){const revision=state.s.revision;return {...state,go,write:async (change,checkpoint=false)=>{try{state.s=await transact(change,revision,checkpoint);channel?.postMessage(state.s.revision);render();toast('Saved on this device.');}catch(e){state.s=await read();render();throw e;}}};}
function reminders(){const s=state.s,ds=state.dataset,t=today();const nextWed=shift(monday(t),2),reviewed=s.reviews.some(r=>r.dataset===ds&&r.kind==='week'&&monday(r.date)===monday(t)),due=!s.settings.lastBackup||Date.now()-Date.parse(s.settings.lastBackup)>=7*86400000;
 return {backup:due,weekly:t>=nextWed&&!reviewed,pending:s.trades.filter(x=>complete(x)&&x.status==='closed'&&x.dataset===ds).length};}
function toolsPage(){return '<div class="toolgrid">'+Object.entries(extras).map(([key,title],i)=>'<button class="toolcard" data-act="'+key+'"><span class="iconbox">'+icon(['ledger','flag','shield','settings'][i],24)+'</span><strong>'+title+'</strong><span>'+['Transactions and monthly statement reconciliation','Milestones, written reviews and objectives','Thresholds, loss streaks and override history','Backups, restoration and appearance'][i]+'</span></button>').join('')+'</div>';}
function settings(ctx){const c=ctx.s.settings;return panel('Account & instrument',pairs([['Starting capital',money(c.opening)],['FCPO round-trip fees',money(c.fees)],['Slippage allowance',money(c.slippage)],['Broker margin reference · full / intraday',money(c.margin)+' / '+money(Math.round(c.margin*c.intradayPct/100))],['Intraday margin payable',c.intradayPct+'%']]),button('Edit configuration','broker','small','settings'))+panel('Appearance & reminders',pairs([['Saved theme',c.theme],['Device notifications',c.notifications?'Enabled when supported':'Off'],['Weekly review','Wednesday · in-app reminders'],['Pending journal reviews',reminders().pending]])+'<div class="actions">'+button('Switch theme','theme','','sun')+button(c.notifications?'Disable device reminders':'Enable device reminders','notify','','bell')+'</div>')+dataPanel(ctx);}
function reminderPanel(){const r=reminders();modal('Workspace reminders',pairs([['Weekly review',r.weekly?'Due · Wednesday review':'Up to date or upcoming'],['Backup',r.backup?'Weekly backup due':'Current'],['Pending journal reviews',r.pending]])+'<div class="actions">'+button('Start weekly review','review','small','plan')+button('Manage data','settings','small','download')+'</div>');}
function render(){
 if(!state.s)return;
 const ctx=context(),p=page(),r=reminders();document.documentElement.dataset.theme=state.s.settings.theme;
 const active=Object.hasOwn(extras,p)?'more':p;const nav=tabs.map(([k,l])=>'<a href="#'+k+'" '+(active===k?'aria-current="page"':'')+'>'+icon(k)+'<span>'+l+'</span></a>').join('');
 el.innerHTML='<aside><a class="brand" href="#home"><img src="./icon-192.png" alt="">Trade<span>Pilot</span></a><div class="navlabel">Workspace</div><nav>'+nav+'</nav><div class="navlabel secondary">Quick actions</div><div class="sideactions">'+button('Log completed trade','log','','plus')+button('Plan new trade','plan','','plan')+button('Weekly review','review','','calendar')+button('Capital ledger','ledger','','ledger')+'</div><div class="sidefoot"><span class="device-icon">'+icon('disc')+'</span><div><b>Local workspace</b><small>On-device storage</small></div></div></aside>'+
 '<div class="workspace"><header class="top"><div class="crumb">'+icon('layers',17)+'<span>Workspace</span><b>/</b><strong>'+esc(tabs.find(t=>t[0]===active)[1])+'</strong></div><div class="toptools">'+(p==='ledger'?badge('Live capital account'):p==='settings'?badge('Account settings'):select('datasetMain','Dataset',DATASETS.map(x=>[x,x[0].toUpperCase()+x.slice(1)+' records']),state.dataset))+'<button class="iconbtn" data-act="theme" aria-label="Switch theme">'+icon(state.s.settings.theme==='dark'?'sun':'moon',18)+'</button><button class="iconbtn reminder" aria-label="Open reminders" data-act="reminders">'+icon('bell',18)+(r.backup||r.weekly||r.pending?'<i></i>':'')+'</button></div></header><main><div class="titlearea"><div><div class="date">'+icon('calendar',14)+esc(new Date(today()+'T12:00Z').toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}))+'</div><h1>'+headings[p][0]+'</h1><p>'+headings[p][1]+'</p></div>'+(['home','journal'].includes(p)?'<div class="actions">'+button('Plan new trade','plan','','plan')+button('Log completed trade','log','primary','plus')+'</div>':'')+'</div>'+
 ({home,journal,analytics,coach:coachPage,more:toolsPage,ledger,tracker,risk:riskView,settings}[p])(ctx)+
 (p==='home'&&r.backup?'<div class="notice">'+icon('download',17)+'<span>Weekly backup due · '+(state.s.settings.lastBackup?'Last download '+esc(fmtDate(state.s.settings.lastBackup.slice(0,10))):'No backup download recorded')+'</span>'+button('Manage backups','settings','small')+'</div>':'')+'</main></div><nav class="mobile">'+nav+'</nav>';
 document.title=headings[p][0]+' · TradePilot';
}
async function act(k,key){const ctx=context(),t=state.s.trades.find(x=>x.id===key);
 if(Object.hasOwn(headings,k)){go(k);return;}
 const actions={log:()=>tradeForm(ctx,'log'),plan:()=>tradeForm(ctx,'plan'),edit:()=>tradeForm(ctx,'edit',t),finish:()=>tradeForm(ctx,'close',t),'trade-detail':()=>tradeDetail(ctx,key),delete:()=>discard(ctx,key),recover:()=>recover(ctx,key),cash:()=>cashForm(ctx),reconcile:()=>reconcileForm(ctx),strategies:()=>strategies(ctx),broker:()=>brokerForm(ctx),review:()=>reviewForm(ctx),milestone:()=>reviewForm(ctx,key),reminders:reminderPanel,theme:()=>ctx.write(s=>{s.settings.theme=s.settings.theme==='light'?'dark':'light';}),period:()=>{state.period=key;render();},notify:async()=>{if(state.s.settings.notifications){await ctx.write(s=>{s.settings.notifications=false;});return;}if(!('Notification' in window)){toast('Device notifications unavailable. In-app reminders remain active.');return;}let ok=await Notification.requestPermission();if(ok==='granted')await ctx.write(s=>{s.settings.notifications=true;});else toast('Permission unavailable. In-app reminders remain active.');},...extraActions(ctx,key)};await actions[k]?.();}
document.addEventListener('click',async e=>{const b=e.target.closest('[data-act]');if(b)try{await act(b.dataset.act,b.dataset.key);}catch(err){toast(err.message);}});
el.addEventListener('change',e=>{const {name,value,checked}=e.target;if(name==='datasetMain'){state.dataset=value;state.filters.dataset=value;render();}else if(name==='milestoneStrategy'){state.strategy=value;render();}else if(page()==='journal'&&name){state.filters[name]=name==='deleted'?checked:value;render();}});
window.addEventListener('hashchange',render);if(channel)channel.onmessage=async()=>{if(!d.open){state.s=await read();render();}};
try{state.s=await read();render();}catch(err){el.innerHTML='<main><h1>Storage unavailable</h1><p>'+esc(err.message)+'</p><p>Enable browser storage and reopen TradePilot.</p></main>';}
function extraActions(ctx,key){return {...coachActions(ctx,key),...dataActions(ctx)};}


if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>toast('Offline installation unavailable. Open the app directly on HTTPS or localhost.'));
async function remindDevice(){
 if(!state.s?.settings.notifications||!('Notification' in window)||Notification.permission!=='granted'||!navigator.serviceWorker?.controller)return;
 const r=reminders();const messages=[r.weekly&&'Wednesday trading review is due.',r.backup&&'Weekly JSON backup is due.',r.pending&&r.pending+' journal reviews pending.'].filter(Boolean);
 if(!messages.length)return;
 try{const key='tradepilot-reminder-'+today();if(sessionStorage.getItem(key))return;const reg=await navigator.serviceWorker.ready;await reg.showNotification('TradePilot reminders',{body:messages.join(' '),tag:'tradepilot-daily',icon:'./icon-192.png'});sessionStorage.setItem(key,'1');}catch{/* In-app reminders remain available on restricted devices. */}
}
document.addEventListener('visibilitychange',async()=>{if(document.visibilityState==='visible'&&!d.open){state.s=await read();render();void remindDevice();}});
if(navigator.serviceWorker)navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!d.open)render();void remindDevice();});
void remindDevice();

