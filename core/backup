import {compressImages,expandImages} from './images.js';
import {SCHEMA,check,migrate,clone} from './model.js';
export const MAX_BACKUP=80*1024*1024;
export function envelope(s,at=new Date().toISOString()){const account=clone(s);account.settings.lastBackup=at;return {app:'TradePilot',version:SCHEMA,exportedAt:at,...compressImages(account)};}
export function unpack(text,validate) {
 check(typeof text==='string' && text.length<=MAX_BACKUP,'Backup exceeds the 80 MiB limit.');
 let data;try{data=JSON.parse(text);}catch{throw new Error('Invalid JSON. Your current records are intact.');}
 check(data?.app==='TradePilot'&&[1,2].includes(data.version)&&data.account?.schema===data.version,'Unrecognised backup format.');
 check(Array.isArray(data.account.trades)&&Array.isArray(data.account.audit),'Missing trade or audit collection.');const s=migrate(expandImages(data.account,data.assets));validate(s);return s;
}
export function csvCell(v){const t=String(v??'');return '"'+(/^[=+@\t\r-]/.test(t)&&!/^[-+]?\d+(\.\d+)?$/.test(t)?"'":'')+t.replaceAll('"','""')+'"';}


async function digest(text) {
 const bytes=new TextEncoder().encode(text);
 const hash=await crypto.subtle.digest('SHA-256',bytes);
 return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
}
export async function backupText(account,at){
 const payload=envelope(account,at);
 const checksum=await digest(JSON.stringify(payload));
 return JSON.stringify({...payload,checksum});
}
export async function readBackup(text,validate){
 check(typeof text==='string' && text.length<=MAX_BACKUP,'Backup exceeds 80 MiB.');
 let payload;
 try{payload=JSON.parse(text);}catch{throw new Error('Invalid JSON. Your current records are intact.');}
 if(payload&&Object.hasOwn(payload,'checksum')){
   const {checksum,...original}=payload;
   check(await digest(JSON.stringify(original))===checksum,'Backup integrity check failed. Choose an intact copy.');
 }
 return unpack(text,validate);
}
