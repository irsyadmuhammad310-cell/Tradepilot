import {check} from './model.js';
// Image bodies are shared by immutable plan, trade and audit snapshots.
function imageGroups(s){const groups=[];const collect=t=>{if(t?.images)groups.push(t.images);if(t?.initialPlan?.images)groups.push(t.initialPlan.images);};s.trades.forEach(collect);s.audit.forEach(a=>{if(a.entity==='trade'){collect(a.before);collect(a.after);}});return groups;}
export function compressImages(account){const refs=new Map(),assets=[];const s=structuredClone(account);for(const group of imageGroups(s)){for(const image of group){if(!image.data)continue;const body=image.data;if(!refs.has(body)){refs.set(body,assets.length);assets.push(body);}image.asset=refs.get(body);delete image.data;}}return {account:s,assets};}
export function expandImages(account,assets=[]){check(Array.isArray(assets)&&assets.every(x=>typeof x==='string'&&x.length<=2800000),'Invalid attachment collection.');for(const group of imageGroups(account)){check(Array.isArray(group)&&group.length<=4,'Invalid chart list.');for(const image of group){if(image.asset===undefined)continue;check(Number.isInteger(image.asset)&&image.asset>=0&&image.asset<assets.length,'Missing chart attachment.');image.data=assets[image.asset];delete image.asset;}}return account;}


