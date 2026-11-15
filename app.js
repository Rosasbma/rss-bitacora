(()=>{
const $=s=>document.querySelector(s),V=$('#v'),E=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const fm=m=>m>=60?Math.floor(m/60)+'h '+m%60+'m':(m||0)+'m';
const DBP=new Promise(r=>{const q=indexedDB.open('rqb',1);q.onupgradeneeded=()=>q.result.createObjectStore('kv');q.onsuccess=()=>r(q.result)});
const ACTIVE_WORKSPACE_KEY='rss_active_workspace_v1';
let ACTIVE_WORKSPACE=localStorage.getItem(ACTIVE_WORKSPACE_KEY)||'';
const physicalKey=k=>(/^[rp]:/.test(k)&&ACTIVE_WORKSPACE)?('w:'+ACTIVE_WORKSPACE+':'+k):k;
const tx=async(m,f)=>{const d=await DBP;return new Promise((ok,er)=>{const t=d.transaction('kv',m),r=f(t.objectStore('kv'));t.oncomplete=()=>ok(r&&r.result);t.onerror=()=>er(t.error)})};
const put=(k,v)=>(S[k]=v,tx('readwrite',s=>s.put(v,physicalKey(k)))),del=k=>(delete S[k],tx('readwrite',s=>s.delete(physicalKey(k))));
const allRaw=async()=>{const d=await DBP;return new Promise(ok=>{const o={},c=d.transaction('kv').objectStore('kv').openCursor();c.onsuccess=()=>{const x=c.result;if(x){o[x.key]=x.value;x.continue()}else ok(o)}})};
const all=async()=>{const raw=await allRaw(),o={},prefix=ACTIVE_WORKSPACE?'w:'+ACTIVE_WORKSPACE+':':'';for(const k in raw){if(k.startsWith('w:')){if(prefix&&k.startsWith(prefix))o[k.slice(prefix.length)]=raw[k]}else if(/^[rp]:/.test(k)){if(!ACTIVE_WORKSPACE)o[k]=raw[k]}else o[k]=raw[k]}return o};
const b2d=b=>new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result);f.readAsDataURL(b)});
const rs=f=>new Promise(ok=>{const i=new Image();i.onload=()=>{const k=Math.min(1,1400/Math.max(i.width,i.height)),c=document.createElement('canvas');c.width=i.width*k;c.height=i.height*k;c.getContext('2d').drawImage(i,0,0,c.width,c.height);ok(c.toDataURL('image/jpeg',.8))};i.src=URL.createObjectURL(f)});
const dim=u=>new Promise(r=>{const i=new Image();i.onload=()=>r([i.width,i.height]);i.src=u});
let S={},tab='d',P=30,F={t:'',zona:'',equipo:'',q:'',sort:'f'},G={a:'*',tg:''};
const recs=()=>Object.keys(S).filter(k=>k[0]=='r').map(k=>S[k]),pics=()=>Object.keys(S).filter(k=>k[0]=='p').map(k=>S[k]);
const cfg=()=>S.cfg,save=()=>put('cfg',S.cfg);
const today=()=>{const d=new Date();return new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,10)},nowT=()=>new Date().toTimeString().slice(0,5);

function modal(html,fn){const m=document.createElement('div');m.className='md';m.innerHTML=`<div class="gl sh">${html}</div>`;m.onclick=e=>{if(e.target==m)m.remove()};document.body.appendChild(m);fn&&fn(m);return m}
function bgApply(){const b=S.bg,L=$('#bgl');L.innerHTML='';if(b){const u=URL.createObjectURL(b.blob);L.innerHTML=b.type[0]=='v'?`<video src="${u}" autoplay muted loop playsinline></video>`:`<img src="${u}">`}$('#dim').style.opacity=cfg().dim}
const chips=(a,cur,attr)=>a.map(([v,l])=>`<span class="chip ${cur==v?'on':''}" data-${attr}="${E(v)}">${E(l)}</span>`).join('');

/* ===== DASHBOARD ===== */
function dash(){
 const n=Date.now(),R=recs().filter(r=>!P||n-r.ts<=P*864e5),f=R.filter(r=>r.t=='f'),mins=f.reduce((s,r)=>s+(+r.m||0),0);
 const grp=k=>{const o={};f.forEach(r=>{const z=r[k]||'—';o[z]=(o[z]||0)+(+r.m||0)});return Object.entries(o).sort((a,b)=>b[1]-a[1]).slice(0,5)};
 const by={};R.forEach(r=>{const k=P&&P<=30?r.fecha:r.fecha.slice(0,7),o=by[k]=by[k]||{f:0,a:0,m:0};o[r.t]++;if(r.t=='f')o.m+=+r.m||0});
 const ks=Object.keys(by).sort().slice(-30),mx=Math.max(1,...ks.map(k=>by[k].m));
 const bl=(a,t)=>{const m=Math.max(1,...a.map(x=>x[1]));return a.map(([k,v])=>`<div class="br" data-f="${t}" data-k="${E(k)}"><b style="width:${v/m*100}%"></b><span>${E(k)}</span><em>${fm(v)}</em></div>`).join('')||'<p class="mu">Sin datos de fallas</p>'};
 V.innerHTML=`<div class="row">${chips([[7,'7 días'],[30,'30 días'],[0,'Todo']],P,'p')}</div>
 <div class="kp"><div><span>Fallas</span><b>${f.length}</b></div><div><span>Actividades</span><b>${R.length-f.length}</b></div><div><span>Tiempo de paro</span><b>${fm(mins)}</b></div><div><span>Promedio por falla</span><b>${fm(f.length?Math.round(mins/f.length):0)}</b></div></div>
 <div class="gl"><h3>Tiempo de paro · ${P&&P<=30?'por día':'por mes'}</h3>${ks.length?`<div class="ch">${ks.map(k=>`<i data-k="${k}" style="height:${6+by[k].m/mx*94}%"></i>`).join('')}</div><div id="cap" class="mu">Toca una barra para ver el detalle</div>`:'<p class="mu">Aún no hay registros en este periodo</p>'}</div>
 <div class="gl"><h3>Zonas con más paro</h3>${bl(grp('zona'),'zona')}</div><div class="gl"><h3>Equipos con más paro</h3>${bl(grp('equipo'),'equipo')}</div>`;
 V.querySelectorAll('[data-p]').forEach(e=>e.onclick=()=>{P=+e.dataset.p;dash()});
 V.querySelectorAll('.ch i').forEach(e=>e.onclick=()=>{const o=by[e.dataset.k];$('#cap').textContent=`${e.dataset.k} · ${o.f} fallas · ${o.a} actividades · ${fm(o.m)} de paro`});
 V.querySelectorAll('.br').forEach(e=>e.onclick=()=>{F={t:'',zona:'',equipo:'',q:'',sort:'f'};F[e.dataset.f]=e.dataset.k;go('l')});
}

/* ===== BITÁCORA ===== */
function log(){
 const q=F.q.toLowerCase(),R=recs().filter(r=>(!F.t||r.t==F.t)&&(!F.zona||r.zona==F.zona)&&(!F.equipo||r.equipo==F.equipo)&&(!q||JSON.stringify(r).toLowerCase().includes(q)));
 R.sort(F.sort=='m'?(a,b)=>(b.m||0)-(a.m||0):(a,b)=>b.ts-a.ts);
 const act=['zona','equipo'].filter(k=>F[k]).map(k=>`<span class="chip on" data-x="${k}">${E(F[k])} ✕</span>`).join('');
 V.innerHTML=`<input class="inp" id="q" placeholder="Buscar…" value="${E(F.q)}">
 <div class="row">${chips([['','Todo'],['f','Fallas'],['a','Actividades']],F.t,'t')}${act}</div>
 <div class="row">${chips([['f','Por fecha'],['m','Por duración de falla']],F.sort,'s')}<span class="chip" id="pp">PDF periodo ⎙</span></div>
 ${R.map(r=>`<div class="gl rc" data-id="${r.id}"><i class="d" style="background:${r.t=='f'?'var(--red)':'var(--blu)'}"></i><div class="i"><div>${E(r.zona)} · ${E(r.equipo)}</div><small>${r.fecha} ${r.hora} · ${E((r.t=='f'?r.diag:r.act)||'')}</small></div><span class="pill">${r.m?fm(r.m):r.t=='f'?'Falla':'Act.'}</span></div>`).join('')||'<p class="mu">Sin registros. Toca ＋ para crear uno.</p>'}`;
 $('#q').oninput=e=>{F.q=e.target.value;clearTimeout(log.t);log.t=setTimeout(()=>{log();$('#q').focus();$('#q').setSelectionRange(99,99)},300)};
 V.querySelectorAll('[data-t]').forEach(e=>e.onclick=()=>{F.t=e.dataset.t;log()});
 V.querySelectorAll('[data-s]').forEach(e=>e.onclick=()=>{F.sort=e.dataset.s;log()});
 V.querySelectorAll('[data-x]').forEach(e=>e.onclick=()=>{F[e.dataset.x]='';log()});
 V.querySelectorAll('.rc').forEach(e=>e.onclick=()=>detail(e.dataset.id));
 $('#pp').onclick=()=>modal(`<h3>PDF de un periodo</h3><div class="two"><div><label>Desde</label><input class="inp" type="date" id="d1" value="${today().slice(0,8)}01"></div><div><label>Hasta</label><input class="inp" type="date" id="d2" value="${today()}"></div></div><label>Incluir</label><select class="inp" id="dt"><option value="">Fallas y actividades</option><option value="f">Solo fallas</option><option value="a">Solo actividades</option></select><button class="btn p" id="go" style="width:100%">Generar PDF</button>`,m=>m.querySelector('#go').onclick=async()=>{const desde=$('#d1').value,hasta=$('#d2').value,t=$('#dt').value;if(!desde||!hasta)return alert('Selecciona las dos fechas del periodo');if(desde>hasta)return alert('La fecha inicial no puede ser posterior a la fecha final');const L=recs().filter(r=>{const fecha=String(r.fecha||'').slice(0,10);return fecha>=desde&&fecha<=hasta&&(!t||r.t==t)}).sort((x,y)=>String(x.fecha||'').localeCompare(String(y.fecha||''))||String(x.hora||'').localeCompare(String(y.hora||'')));if(!L.length)return alert('No hay registros en ese periodo');m.remove();pdf(L,`Reporte ${desde} al ${hasta}`).catch(e=>{console.error('Error al generar PDF por periodo',e);alert('No se pudo generar el PDF. Revisa la conexión y vuelve a intentarlo.')})})
}
function detail(id){
 const r=S['r:'+id],ph=pics().filter(p=>p.rid==id),row=(l,v)=>v?`<div class="fl"><span>${l}</span><p>${E(v)}</p></div>`:'';
 modal(`<h3>${r.t=='f'?'Falla':'Actividad'}</h3>${row('Zona',r.zona)}${row('Equipo',r.equipo)}${row('Fecha',r.fecha+' '+r.hora)}${row(r.t=='f'?'Tiempo de falla':'Tiempo',r.m?fm(r.m):'')}${row('Diagnóstico',r.diag)}${row('Acciones',r.acc)}${row('Actividad',r.act)}${row('Notas',r.notas)}<div class="th" style="margin-top:10px">${ph.map(p=>`<img src="${p.src}">`).join('')}</div><div class="row"><button class="btn p" id="b1">PDF ⎙</button><button class="btn" id="b2">Editar</button><button class="btn r" id="b3">Eliminar</button></div>`,m=>{
  m.querySelector('#b1').onclick=()=>pdf([r],(r.t=='f'?'Reporte de falla':'Reporte de actividad'));
  m.querySelector('#b2').onclick=()=>{m.remove();form(id)};
  m.querySelector('#b3').onclick=async()=>{if(!confirm('¿Eliminar este registro y sus fotos?'))return;await del('r:'+id);for(const p of ph)await del('p:'+p.id);m.remove();render()}})
}
function form(id){
 const r=S['r:'+id]||{t:'f',fecha:today(),hora:nowT()},C=cfg(),np=[],hh=Math.floor((r.m||0)/60),mm=(r.m||0)%60;let t=r.t;
 const dl=(i,a)=>`<datalist id="${i}">${a.map(x=>`<option value="${E(x)}">`).join('')}</datalist>`;
 const m=modal(`<div class="seg"><button data-t="f">Falla</button><button data-t="a">Actividad</button></div>
 <div class="two"><div><label>Zona</label><input class="inp" id="zona" list="zl" value="${E(r.zona)}"></div><div><label>Equipo</label><input class="inp" id="equipo" list="el" value="${E(r.equipo)}"></div>
 <div><label>Fecha</label><input class="inp" type="date" id="fecha" value="${r.fecha}"></div><div><label>Hora</label><input class="inp" type="time" id="hora" value="${r.hora}"></div></div>${dl('zl',C.zonas)}${dl('el',C.equipos)}
 <label id="lt">Tiempo de falla</label><div class="two"><input class="inp" type="number" min="0" id="hh" placeholder="Horas" value="${hh||''}"><input class="inp" type="number" min="0" max="59" id="mm" placeholder="Minutos" value="${mm||''}"></div>
 <div class="F"><label>Diagnóstico</label><textarea class="inp" id="diag">${E(r.diag)}</textarea><label>Acciones realizadas</label><textarea class="inp" id="acc">${E(r.acc)}</textarea></div>
 <div class="A"><label>Actividad realizada</label><textarea class="inp" id="act">${E(r.act)}</textarea><label>Notas</label><textarea class="inp" id="notas">${E(r.notas)}</textarea></div>
 <label>Fotos (cámara o galería)</label><input type="file" id="ph" accept="image/*" multiple class="inp"><div class="th" id="pv"></div>
 <button class="btn p" id="sv" style="width:100%">Guardar</button>`,m=>{
  const sw=()=>{m.querySelectorAll('.seg button').forEach(b=>b.classList.toggle('on',b.dataset.t==t));m.querySelector('.F').classList.toggle('hid',t!='f');m.querySelector('.A').classList.toggle('hid',t=='f');m.querySelector('#lt').textContent=t=='f'?'Tiempo de falla':'Tiempo';};sw();
  m.querySelectorAll('.seg button').forEach(b=>b.onclick=()=>{t=b.dataset.t;sw()});
  m.querySelector('#ph').onchange=async e=>{for(const f of e.target.files){const s=await rs(f);np.push(s);m.querySelector('#pv').insertAdjacentHTML('beforeend',`<img src="${s}">`)}e.target.value=''};
  m.querySelector('#sv').onclick=async()=>{const g=i=>m.querySelector('#'+i).value.trim(),o={id:r.id||uid(),t,zona:g('zona'),equipo:g('equipo'),fecha:g('fecha'),hora:g('hora'),m:(+g('hh')||0)*60+(+g('mm')||0),diag:g('diag'),acc:g('acc'),act:g('act'),notas:g('notas')};
   if(!o.zona||!o.equipo||!o.fecha)return alert('Zona, equipo y fecha son obligatorios');
   if(t=='f'){o.act=o.notas=''}else{o.diag=o.acc=''}
   o.ts=new Date(o.fecha+'T'+(o.hora||'00:00')).getTime();await put('r:'+o.id,o);
   for(const s of np){const p=uid();await put('p:'+p,{id:p,rid:o.id,src:s,title:'',desc:'',tags:[],album:'',fav:0,ts:Date.now()})}
   let ch=0;if(!C.zonas.includes(o.zona)){C.zonas.push(o.zona);ch=1}if(!C.equipos.includes(o.equipo)){C.equipos.push(o.equipo);ch=1}if(ch)await save();
   m.remove();render()}});
 if(id)(pics().filter(p=>p.rid==id)).forEach(p=>m.querySelector('#pv').insertAdjacentHTML('beforeend',`<img src="${p.src}">`));
}

/* ===== GALERÍA ===== */
function gal(){
 const A=pics().sort((a,b)=>b.ts-a.ts),al=[...new Set(A.map(p=>p.album).filter(Boolean))],tg=[...new Set(A.flatMap(p=>p.tags))];
 const L=A.filter(p=>(G.a=='*'||(G.a=='fav'?p.fav:p.album==G.a))&&(!G.tg||p.tags.includes(G.tg)));
 V.innerHTML=`<div class="row">${chips([['*','Todas'],['fav','★ Favoritas'],...al.map(x=>[x,x])],G.a,'a')}</div>${tg.length?`<div class="row">${chips([['','Todas las etiquetas'],...tg.map(x=>[x,'#'+x])],G.tg,'g')}</div>`:''}
 <div class="row"><label style="margin:0">Columnas</label><input type="range" id="co" min="1" max="6" value="${cfg().cols}" style="flex:1"><label class="btn p" style="margin:0;opacity:1;letter-spacing:0;text-transform:none;font-size:14px">＋ Agregar<input type="file" id="gp" accept="image/*" multiple hidden></label></div>
 <div class="gg" style="grid-template-columns:repeat(${cfg().cols},1fr)">${L.map(p=>`<div data-id="${p.id}" style="background-image:url(${p.src})">${p.fav?'<s>★</s>':''}</div>`).join('')}</div>${L.length?'':'<p class="mu">Sin fotos aquí. Las fotos de tus registros aparecen automáticamente.</p>'}`;
 V.querySelectorAll('[data-a]').forEach(e=>e.onclick=()=>{G.a=e.dataset.a;gal()});V.querySelectorAll('[data-g]').forEach(e=>e.onclick=()=>{G.tg=e.dataset.g;gal()});
 $('#co').oninput=e=>{cfg().cols=+e.target.value;$('.gg').style.gridTemplateColumns=`repeat(${e.target.value},1fr)`;save()};
 $('#gp').onchange=async e=>{for(const f of e.target.files){const p=uid();await put('p:'+p,{id:p,rid:'',src:await rs(f),title:'',desc:'',tags:[],album:G.a!='*'&&G.a!='fav'?G.a:'',fav:0,ts:Date.now()})}gal()};
 V.querySelectorAll('.gg div').forEach(e=>e.onclick=()=>view(e.dataset.id));
}
function view(id){const p=S['p:'+id],al=[...new Set(pics().map(x=>x.album).filter(Boolean))];let fv=p.fav;
 modal(`<img src="${p.src}" style="width:100%;border-radius:16px;margin-bottom:12px"><label>Título</label><input class="inp" id="ti" value="${E(p.title)}"><label>Descripción</label><textarea class="inp" id="de">${E(p.desc)}</textarea><label>Etiquetas (separadas por coma)</label><input class="inp" id="tg" value="${E(p.tags.join(', '))}"><label>Álbum</label><input class="inp" id="al" list="all" value="${E(p.album)}"><datalist id="all">${al.map(a=>`<option value="${E(a)}">`).join('')}</datalist><div class="row"><button class="btn" id="fv">${fv?'★ Favorita':'☆ Favorita'}</button><button class="btn p" id="sv">Guardar</button><button class="btn r" id="dl">Eliminar</button></div>`,m=>{
  m.querySelector('#fv').onclick=e=>{fv=fv?0:1;e.target.textContent=fv?'★ Favorita':'☆ Favorita'};
  m.querySelector('#sv').onclick=async()=>{const g=i=>m.querySelector('#'+i).value.trim();await put('p:'+id,{...p,title:g('ti'),desc:g('de'),tags:g('tg').split(',').map(x=>x.trim()).filter(Boolean),album:g('al'),fav:fv});m.remove();gal()};
  m.querySelector('#dl').onclick=async()=>{if(confirm('¿Eliminar foto?')){await del('p:'+id);m.remove();gal()}}})}

/* ===== AJUSTES ===== */
function set(){const C=cfg();
 V.innerHTML=`<div class="gl"><h3>Respaldo</h3><div class="row"><button class="btn p" id="bk">Respaldar todo (.rqb)</button><label class="btn" style="margin:0;opacity:1;letter-spacing:0;text-transform:none;font-size:14px">Restaurar todo<input type="file" id="rt" hidden></label></div><p class="mu">Los datos viven solo en este navegador. Respalda con frecuencia.</p></div>
 <div class="gl"><h3>Fondo de pantalla</h3><div class="row"><label class="btn" style="margin:0;opacity:1;letter-spacing:0;text-transform:none;font-size:14px">Elegir imagen o video<input type="file" id="bf" accept="image/*,video/*" hidden></label><button class="btn r" id="bx">Quitar</button></div><label>Oscurecer fondo</label><input type="range" id="dm" min="0" max="0.95" step="0.01" value="${C.dim}"></div>
 <div class="gl"><h3>Catálogos</h3><label>Zonas (una por línea)</label><textarea class="inp" id="cz" style="min-height:100px">${E(C.zonas.join('\n'))}</textarea><label>Equipos (uno por línea)</label><textarea class="inp" id="ce" style="min-height:100px">${E(C.equipos.join('\n'))}</textarea><button class="btn p" id="cs">Guardar catálogos</button></div>`;
 window.RSSCloud?.mount();
 $('#dm').oninput=e=>{cfg().dim=+e.target.value;$('#dim').style.opacity=e.target.value};$('#dm').onchange=save;
 $('#bf').onchange=async e=>{const f=e.target.files[0];if(f){await put('bg',{type:f.type,blob:f});bgApply()}};
 $('#bx').onclick=async()=>{await del('bg');bgApply()};
 $('#cs').onclick=async()=>{const l=i=>[...new Set($(i).value.split('\n').map(x=>x.trim()).filter(Boolean))];C.zonas=l('#cz');C.equipos=l('#ce');await save();alert('Catálogos guardados')};
 $('#bk').onclick=async()=>{const o={v:1,d:{}},raw=await allRaw();for(const k in raw)o.d[k]=k=='bg'?{type:raw.bg.type,data:await b2d(raw.bg.blob)}:raw[k];const n=`RSS-Bitacora-${today()}.rqb`,f=new File([JSON.stringify(o)],n,{type:'application/octet-stream'});
  if(navigator.canShare&&navigator.canShare({files:[f]}))try{await navigator.share({files:[f]});return}catch(e){if(e.name=='AbortError')return}
  const a=document.createElement('a');a.href=URL.createObjectURL(f);a.download=n;a.click()};
 $('#rt').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const o=JSON.parse(await f.text());if(!o.d)throw 0;if(!confirm('Esto reemplazará TODOS los datos actuales. ¿Continuar?'))return;await tx('readwrite',s=>s.clear());for(const k in o.d){let v=o.d[k];if(k=='bg')v={type:v.type,blob:await (await fetch(v.data)).blob()};await tx('readwrite',s=>s.put(v,k))}location.reload()}catch(x){alert('Archivo .rqb no válido')}};
}

/* ===== PDF ===== */
async function pdf(R,title){
 if(!window.jspdf)return alert('El generador de PDF no está disponible (se necesita conexión la primera vez).');
 const d=new window.jspdf.jsPDF('p','mm','a4'),L=14,lg=await b2d(await (await fetch('logo.jpg')).blob()),cols=[[255,95,141],[255,177,92],[92,214,255],[154,123,255]];let y;
 const head=()=>{d.setFillColor(8,9,12);d.rect(0,0,210,30,'F');d.addImage(lg,'JPEG',L,5,20,20);d.setTextColor(235);d.setFontSize(16);d.text(title,L+26,15);d.setFontSize(8);d.setTextColor(150);d.text('RSS · Bitácora · generado '+new Date().toLocaleString('es-MX'),L+26,22);cols.forEach((c,i)=>{d.setFillColor(...c);d.rect(i*52.5,30,52.5,1.4,'F')});y=40};
 head();const f=R.filter(r=>r.t=='f'),mn=f.reduce((s,r)=>s+(+r.m||0),0);
 d.setTextColor(40);d.setFontSize(10);d.text(`Registros: ${R.length}   ·   Fallas: ${f.length}   ·   Actividades: ${R.length-f.length}   ·   Tiempo de paro: ${fm(mn)}`,L,y);y+=9;
 for(const r of R){
  const ph=pics().filter(p=>p.rid==r.id),rows=[['Zona',r.zona],['Equipo',r.equipo],['Fecha / hora',r.fecha+' '+r.hora],[r.t=='f'?'Tiempo de falla':'Tiempo',r.m?fm(r.m):''],['Diagnóstico',r.diag],['Acciones realizadas',r.acc],['Actividad',r.act],['Notas',r.notas]].filter(x=>x[1]);
  const need=14+rows.reduce((s,x)=>s+Math.max(1,d.splitTextToSize(x[1],130).length)*4.6,0);if(y+need>275){d.addPage();head()}
  const c=r.t=='f'?[255,95,109]:[92,182,255];d.setFillColor(...c);d.roundedRect(L,y,182,7,2,2,'F');d.setTextColor(255);d.setFontSize(10);d.text((r.t=='f'?'FALLA':'ACTIVIDAD')+'  ·  '+r.zona+' / '+r.equipo,L+3,y+5);y+=12;d.setFontSize(9);
  for(const [l,v] of rows){const t=d.splitTextToSize(v,130);d.setTextColor(120);d.text(l,L+2,y);d.setTextColor(30);d.text(t,L+48,y);y+=t.length*4.6}
  y+=2;let x=L;
  for(const p of ph){const [w,h]=await dim(p.src),k=Math.min(88/w,62/h),pw=w*k,ph2=h*k;if(x+pw>196){x=L;y+=64}if(y+ph2>280){d.addPage();head();x=L}d.addImage(p.src,'JPEG',x,y,pw,ph2);x+=pw+4;r._h=Math.max(r._h||0,ph2)}
  if(ph.length)y+=64;y+=6}
 const n=d.getNumberOfPages();for(let i=1;i<=n;i++){d.setPage(i);d.setFontSize(8);d.setTextColor(150);d.text(`Página ${i} de ${n}`,196,290,{align:'right'})}
 d.save(title.replace(/[^\w\-]+/g,'_')+'.pdf')}

/* ===== NAV ===== */
const T={d:['Dashboard',dash],l:['Bitácora',log],g:['Galería',gal],s:['Ajustes',set]};
function render(){$('#ttl').textContent=T[tab][0];document.querySelectorAll('nav [data-t]').forEach(b=>b.classList.toggle('on',b.dataset.t==tab));V.scrollTop=0;T[tab][1]()}
function go(t){tab=t;render()}
document.querySelectorAll('nav [data-t]').forEach(b=>b.onclick=()=>go(b.dataset.t));$('#nw').onclick=()=>form();
all().then(o=>{S=o;S.cfg=Object.assign({zonas:[],equipos:[],dim:.45,cols:3},S.cfg);bgApply();render()});
if('serviceWorker'in navigator){
 navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).then(reg=>{
  const check=()=>reg.update().catch(()=>{});
  check();
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')check()});
  let reloading=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
   if(reloading)return;reloading=true;location.reload();
  });
 }).catch(()=>{});
}
})();
