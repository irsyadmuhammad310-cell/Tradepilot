import {compressImages,expandImages} from './images.js';
import {validate} from './validate.js';
import {MAX_BACKUP} from './backup.js';
import {initial,migrate,check} from './model.js';
let connection;
async function open() {
 if(connection)return connection;
 connection=await new Promise((resolve,reject)=>{
 const r=indexedDB.open('tradepilot-personal',2);
 r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('account'))r.result.createObjectStore('account');};
 r.onblocked=()=>reject(new Error('Close other TradePilot windows to finish upgrading storage.'));
 r.onerror=()=>reject(r.error);
 r.onsuccess=()=>{r.result.onversionchange=()=>{r.result.close();connection=null;};resolve(r.result);};
 });return connection;
}
export async function transact(change,expected,checkpoint=false) {
 const db=await open();return new Promise((resolve,reject)=>{
 const tx=db.transaction('account','readwrite'),store=tx.objectStore('account');let next,error;
 const req=store.get('primary');req.onsuccess=()=>{try{
 const previous=req.result;const raw=previous?.account?expandImages(previous.account,previous.assets):previous;const old=raw?migrate(raw):initial();
 if(expected!==undefined)check(old.revision===expected,'Another window changed the account. Reopen this form before saving.');
 next=change?change(old)??old:old;
 if(change)next.revision=old.revision+1;
 if(checkpoint)store.put(compressImages(old),'prior-restore');
 if(change||!previous||raw.schema!==next.schema){
   if(change)validate(next);
   const packed=compressImages(next);
   if(change)check(new Blob([JSON.stringify(packed)]).size<MAX_BACKUP-4096,'The account would exceed the full-backup size limit. Reduce new attachment sizes and retry.');
   store.put(packed,'primary');
 }
 }catch(e){error=e;tx.abort();}};
 tx.oncomplete=()=>resolve(next);
 tx.onabort=()=>reject(error||tx.error||new Error('Storage transaction cancelled.'));
 tx.onerror=()=>{error??=tx.error;};
 });
}
export const read=()=>transact();


export async function beforeRestore(){const db=await open();return new Promise((res,rej)=>{const r=db.transaction('account').objectStore('account').get('prior-restore');r.onerror=()=>rej(r.error);r.onsuccess=()=>res(r.result?migrate(expandImages(r.result.account,r.result.assets)):null);});}
