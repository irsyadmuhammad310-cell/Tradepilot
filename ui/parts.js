import {fmtDate,money} from '../core/model.js';
export const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths={home:'M3 10 12 3l9 7v10h-6v-6H9v6H3z',journal:'M5 3h14v18H5z M8 7h8 M8 11h8 M8 15h4',analytics:'M3 20h18 M6 16v-5 M12 16V5 M18 16V8',coach:'m12 3 2.3 6.7L21 12l-6.7 2.3L12 21l-2.3-6.7L3 12l6.7-2.3z',more:'M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h6v6h-6z',plus:'M12 5v14 M5 12h14',plan:'M4 20l5-1L21 7l-4-4L5 15z M14 6l4 4',shield:'M12 2l8 3v6c0 6-4 9-8 11-4-2-8-5-8-11V5z M8 12l3 3 5-6',ledger:'M3 7l9-4 9 4z M5 10v7 M10 10v7 M14 10v7 M19 10v7 M3 20h18',calendar:'M3 5h18v16H3z M3 10h18 M7 3v4 M17 3v4',sun:'M12 7a5 5 0 1 0 0 10a5 5 0 1 0 0-10 M12 1v3 M12 20v3 M1 12h3 M20 12h3 M4 4l2 2 M18 18l2 2 M4 20l2-2 M18 6l2-2',moon:'M20 15A9 9 0 0 1 9 3a9 9 0 1 0 11 12z',bell:'M4 17h16l-2-4V9a6 6 0 0 0-12 0v4z M10 20h4',lock:'M5 10h14v11H5z M8 10V7a4 4 0 0 1 8 0v3',wallet:'M3 6h17v14H3z M3 6l13-4v4 M15 11h6v5h-6z',pulse:'M2 12h5l3-7 4 14 3-7h5',target:'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18 M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8',trend:'M3 17l6-6 4 3 8-9 M16 5h5v5',clock:'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18 M12 6v6l4 3',disc:'M3 4h18v13H3z M8 21h8 M12 17v4',settings:'M3 6h18 M3 12h18 M3 18h18 M8 3v6 M16 9v6 M10 15v6',download:'M12 3v12 M7 10l5 5 5-5 M4 16v5h16v-5',flag:'M5 21V3l7 2 7-2v11l-7 2-7-2',layers:'m2 8 10-5 10 5-10 5z M3 12l9 5 9-5 M3 16l9 5 9-5',warn:'M12 3 2 21h20z M12 9v5 M12 17v1',close:'M5 5l14 14 M19 5 5 19',search:'M10 3a7 7 0 1 0 0 14a7 7 0 1 0 0-14 M15 15l6 6',book:'M3 5q5-2 9 1q4-3 9-1v14q-5-2-9 1q-4-3-9-1z M12 6v14',list:'M5 5h14 M5 12h14 M5 19h14',chevron:'m9 5 7 7-7 7',check:'m4 12 5 5L20 6'};
export const icon=(k,size=20)=>'<svg class="icon" aria-hidden="true" width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="'+paths[k]+'"/></svg>';
export const button=(label,act,kind='',symbol='',key='')=>'<button type="button" class="btn '+kind+'" data-act="'+act+'" data-key="'+esc(key)+'">'+(symbol?icon(symbol,17):'')+esc(label)+'</button>';
export const option=(v,l,sel)=>'<option value="'+esc(v)+'" '+(String(v)===String(sel)?'selected':'')+'>'+esc(l)+'</option>';
export const select=(name,label,items,value)=>'<label>'+esc(label)+'<select name="'+name+'">'+items.map(x=>Array.isArray(x)?option(x[0],x[1],value):option(x,x,value)).join('')+'</select></label>';
export const field=(name,label,value='',type='text',attrs='')=>'<label>'+esc(label)+'<input type="'+type+'" name="'+name+'" value="'+esc(value)+'" '+attrs+'></label>';
export const area=(name,label,value='',attrs='')=>'<label>'+esc(label)+'<textarea maxlength="12000" name="'+name+'" rows="2" '+attrs+'>'+esc(value)+'</textarea></label>';
export const tick=(name,label,on=false)=>'<label class="tick"><input type="checkbox" name="'+name+'" '+(on?'checked':'')+'>'+esc(label)+'</label>';
export const badge=t=>'<span class="badge">'+esc(t)+'</span>';
export const empty=(title,detail='',i='book')=>'<div class="empty">'+icon(i,26)+'<strong>'+esc(title)+'</strong><span>'+esc(detail)+'</span></div>';
export const panel=(title,content,action='',symbol='')=>'<section class="panel"><div class="panelhead"><h2>'+(symbol?icon(symbol,18):'')+esc(title)+'</h2>'+action+'</div>'+content+'</section>';
export const pairs=a=>'<dl class="pairs">'+a.map(([l,v])=>'<div><dt>'+esc(l)+'</dt><dd>'+esc(v)+'</dd></div>').join('')+'</dl>';
export const table=(head,body)=>'<div class="scroll"><table><thead><tr>'+head.map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+body.map(r=>'<tr>'+r.map(c=>'<td>'+c+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
export const cashInput=(name,label,value,attrs='')=>field(name,label,(value/100).toFixed(2),'number','step=".01" '+attrs);
export const dollars=n=>(n/100).toFixed(2);
export function download(name,data,type){const url=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
export function toast(msg){const el=document.querySelector('#toast');el.textContent=msg;el.classList.add('active');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('active'),5000);}
export function modal(title,content,save,submit='Save',after) {
 const d=document.querySelector('#modal');if(d.open)d.close();
 d.innerHTML='<form><header><h2 id="dialog-title">'+esc(title)+'</h2><button type="button" class="iconbtn" aria-label="Close dialog" data-close>'+icon('close')+'</button></header><div class="modalbody">'+content+'</div><footer><span role="alert" class="error"></span>'+(save?'<button type="submit" class="btn primary">'+esc(submit)+'</button>':'<button type="button" data-close class="btn">Close</button>')+'</footer></form>';
 const f=d.querySelector('form');d.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>d.close());
 f.onsubmit=async e=>{e.preventDefault();const b=f.querySelector('[type=submit]');if(!b)return;d.querySelector('.error').textContent='';b.disabled=true;try{await save(new FormData(f),f);d.close();}catch(err){d.querySelector('.error').textContent=err.message;}finally{b.disabled=false;}};
 d.showModal();if(after)after(f);return f;
}


