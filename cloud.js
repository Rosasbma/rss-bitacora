/* RSS Bitácora · Supabase cloud module
 * Local IndexedDB remains the source of truth until the user explicitly syncs.
 * No local records/photos are deleted by this module.
 */
(()=>{'use strict';
 const DB='rqb', STORE='kv', KEY='rss_cloud_config_v1';
 let client=null, session=null, workspaceId=null, busy=false;
 const $=s=>document.querySelector(s);
 const cfg=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return {}}};
 const saveCfg=o=>localStorage.setItem(KEY,JSON.stringify(o));
 const openDB=()=>new Promise((ok,err)=>{const q=indexedDB.open(DB,1);q.onsuccess=()=>ok(q.result);q.onerror=()=>err(q.error)});
 const all=async()=>{const d=await openDB();return new Promise((ok,err)=>{const o={},c=d.transaction(STORE).objectStore(STORE).openCursor();c.onsuccess=()=>{const x=c.result;if(x){o[x.key]=x.value;x.continue()}else ok(o)};c.onerror=()=>err(c.error)})};
 const put=async(k,v)=>{const d=await openDB();return new Promise((ok,err)=>{const t=d.transaction(STORE,'readwrite');t.objectStore(STORE).put(v,k);t.oncomplete=ok;t.onerror=()=>err(t.error)})};
 const blobFromDataURL=async u=>await (await fetch(u)).blob();
 const dataURLFromBlob=b=>new Promise((ok,err)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=()=>err(r.error);r.readAsDataURL(b)});
 const say=(s,bad=false)=>{const n=$('#cloud-status');if(n){n.textContent=s;n.style.color=bad?'#ff9ca6':''}};
 const init=async()=>{
  const c=cfg(); if(!c.url||!c.key||!window.supabase)return;
  const {createClient}=window.supabase;client=createClient(c.url,c.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const {data}=await client.auth.getSession();session=data.session;
  client.auth.onAuthStateChange((_e,s)=>{session=s;renderState()});
 };
 const renderState=()=>{const n=$('#cloud-account');if(n)n.textContent=session?('Sesión: '+session.user.email):'Sin sesión iniciada';};
 const connect=async()=>{
  const url=$('#cloud-url')?.value.trim(),key=$('#cloud-key')?.value.trim();
  if(!url||!key)return say('Introduce la URL y la clave publishable/anon de Supabase.',true);
  try{new URL(url)}catch{return say('La URL de Supabase no es válida.',true)}
  saveCfg({url,key});await init();if(!client)return say('No se pudo inicializar Supabase. Revisa la URL y la clave.',true);
  say('Conexión configurada. Inicia sesión para continuar.');renderState();
 };
 const signIn=async()=>{
  if(!client)return say('Primero configura la conexión.',true);
  const email=$('#cloud-email')?.value.trim(),password=$('#cloud-password')?.value;
  if(!email||!password)return say('Introduce correo y contraseña.',true);
  const {error}=await client.auth.signInWithPassword({email,password});if(error)say(error.message,true);else say('Sesión iniciada.');
 };
 const signUp=async()=>{
  if(!client)return say('Primero configura la conexión.',true);
  const email=$('#cloud-email')?.value.trim(),password=$('#cloud-password')?.value;
  if(!email||!password)return say('Introduce correo y contraseña.',true);
  if(password.length<8)return say('Usa una contraseña de al menos 8 caracteres.',true);
  const {error}=await client.auth.signUp({email,password});if(error)say(error.message,true);else say('Registro enviado. Si la confirmación por correo está activa, revisa tu bandeja.');
 };
 const signOut=async()=>{if(client){const {error}=await client.auth.signOut();if(error)say(error.message,true);else{workspaceId=null;say('Sesión cerrada.')}}};
 const listWorkspaces=async()=>{
  if(!session)return say('Inicia sesión primero.',true);
  const {data,error}=await client.from('workspace_members').select('workspace_id,role,workspaces(id,name,created_at)').eq('user_id',session.user.id);
  if(error)return say('No se pudieron consultar espacios: '+error.message,true);
  const sel=$('#cloud-workspace');sel.innerHTML='';
  (data||[]).sort((a,b)=>new Date(a.workspaces?.created_at||0)-new Date(b.workspaces?.created_at||0)).forEach(m=>{const o=document.createElement('option');o.value=m.workspace_id;o.textContent=(m.workspaces?.name||m.workspace_id)+' · '+m.role;sel.append(o)});
  workspaceId=sel.value||null;say(data?.length?'Espacios cargados.':'No tienes espacios. Crea uno para iniciar.');
 };
 const createWorkspace=async()=>{
  if(!client)return say('Configura Supabase primero.',true);
  const name=$('#cloud-new-workspace')?.value.trim();if(!name)return say('Escribe el nombre del espacio.',true);
  await listWorkspaces();
  const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLocaleLowerCase();
  const existing=[...($('#cloud-workspace')?.options||[])].find(o=>normalize(o.textContent.split(' · ')[0])===normalize(name));
  if(existing){$('#cloud-workspace').value=existing.value;workspaceId=existing.value;return say('Ese espacio ya existe. Se seleccionó el existente; no se creó un duplicado.');}
  const {data:authData,error:authError}=await client.auth.getUser();
  if(authError||!authData?.user)return say('Supabase no valida una sesión autenticada. Cierra sesión e inicia nuevamente.',true);
  const userId=authData.user.id;
  if(session?.user?.id&&session.user.id!==userId)return say('La sesión local y la sesión validada no coinciden. Cierra sesión e inicia nuevamente.',true);
  const {error}=await client.from('workspaces').insert({name,created_by:userId});
  if(error)return say('No se pudo crear el espacio. Usuario validado: '+userId+'. Error: '+error.message,true);
  await listWorkspaces();
  const sel=$('#cloud-workspace');
  const matches=[...sel.options].filter(o=>o.textContent.startsWith(name+' · admin'));
  if(matches.length){sel.value=matches[matches.length-1].value;workspaceId=sel.value;say('Espacio creado. Tu usuario queda como administrador.');}
  else say('El espacio se creó, pero no apareció en la lista. Pulsa Cargar espacios para actualizar.',true);
 };
 const sync=async()=>{
  if(busy)return;say('Sincronizando…');busy=true;
  try{
   if(!session)throw Error('Inicia sesión primero.');
   workspaceId=$('#cloud-workspace')?.value||workspaceId;if(!workspaceId)throw Error('Selecciona o crea un espacio de trabajo.');
   const local=await all(),records=Object.keys(local).filter(k=>k.startsWith('r:')).map(k=>local[k]);
   const photos=Object.keys(local).filter(k=>k.startsWith('p:')).map(k=>local[k]);
   const stable=v=>JSON.stringify(v&&typeof v==='object'&&!Array.isArray(v)?Object.keys(v).sort().reduce((o,k)=>(o[k]=v[k],o),{}):v);
   const {data:remote,error:readErr}=await client.from('maintenance_records').select('id,payload').eq('workspace_id',workspaceId);
   if(readErr)throw Error('Lectura de registros en nube: '+readErr.message);
   const remoteById=new Map((remote||[]).map(x=>[String(x.id),x]));
   let sent=0,downloaded=0,conflicts=0;
   for(const r of records){
    const id=String(r.id),existing=remoteById.get(id);
    if(existing){
     if(stable(existing.payload)!==stable(r))conflicts++;
     continue;
    }
    const row={id,workspace_id:workspaceId,created_by:session.user.id,payload:r,updated_at:new Date().toISOString(),created_at:new Date(r.ts||Date.now()).toISOString()};
    const {error}=await client.from('maintenance_records').insert(row);
    if(error)throw Error('Registro '+id+': '+error.message);
    sent++;
   }
   for(const row of (remote||[])){
    const key='r:'+row.id;
    if(!local[key]){await put(key,row.payload);downloaded++}
   }
   const {data:evRows,error:evReadErr}=await client.from('evidence').select('id,record_id,object_path,metadata').eq('workspace_id',workspaceId);
   if(evReadErr)throw Error('Lectura de evidencias: '+evReadErr.message);
   const evidenceById=new Map((evRows||[]).map(x=>[String(x.id),x]));
   let uploaded=0,photoDownloads=0;
   for(const p of photos){
    const id=String(p.id),existing=evidenceById.get(id);
    if(existing){
     const meta=existing.metadata||{};
     const same=String(existing.record_id||'')===String(p.rid||'')&&stable({title:meta.title||'',desc:meta.desc||'',tags:meta.tags||[],album:meta.album||'',fav:meta.fav||0,ts:meta.ts||0})===stable({title:p.title||'',desc:p.desc||'',tags:p.tags||[],album:p.album||'',fav:p.fav||0,ts:p.ts||0});
     if(!same)conflicts++;
     continue;
    }
    const path=workspaceId+'/'+session.user.id+'/'+id+'.jpg';
    const blob=await blobFromDataURL(p.src);
    const {error:upErr}=await client.storage.from('rss-evidence').upload(path,blob,{contentType:'image/jpeg',upsert:false});
    if(upErr)throw Error('Foto '+id+': '+upErr.message);
    const {error:evErr}=await client.from('evidence').insert({id,workspace_id:workspaceId,created_by:session.user.id,record_id:p.rid?String(p.rid):null,object_path:path,metadata:{title:p.title||'',desc:p.desc||'',tags:p.tags||[],album:p.album||'',fav:p.fav||0,ts:p.ts||Date.now()}});
    if(evErr)throw Error('Índice de foto '+id+': '+evErr.message);
    uploaded++;
   }
   for(const ev of (evRows||[])){
    const key='p:'+ev.id;if(local[key])continue;
    const {data:file,error:fileErr}=await client.storage.from('rss-evidence').download(ev.object_path);
    if(fileErr)throw Error('Descarga de evidencia '+ev.id+': '+fileErr.message);
    const meta=ev.metadata||{};
    await put(key,{id:String(ev.id),rid:ev.record_id||'',src:await dataURLFromBlob(file),title:meta.title||'',desc:meta.desc||'',tags:meta.tags||[],album:meta.album||'',fav:meta.fav||0,ts:meta.ts||Date.now()});
    photoDownloads++;
   }
   say('Sincronización terminada. '+sent+' registros nuevos enviados; '+uploaded+' fotos nuevas enviadas; '+downloaded+' registros descargados; '+photoDownloads+' fotos descargadas; '+conflicts+' conflictos detectados. Los conflictos no se sobrescribieron y los datos locales se conservaron.');
  }catch(e){say(e.message||String(e),true)}finally{busy=false}
 };
 const mount=()=>{
  const c=cfg();
  const panel=document.createElement('div');panel.className='gl';panel.innerHTML='<h3>Sincronización en la nube · Supabase</h3><p class="mu" style="margin-bottom:10px">La bitácora local y sus respaldos se conservan. La sincronización no elimina registros locales.</p><label>URL del proyecto</label><input class="inp" id="cloud-url" placeholder="https://tu-proyecto.supabase.co"><label>Clave publishable / anon (nunca service_role)</label><input class="inp" id="cloud-key" type="password" autocomplete="off" placeholder="sb_publishable_… o anon key"><button class="btn" id="cloud-connect" style="width:100%;margin-bottom:10px">Guardar conexión</button><div id="cloud-account" class="mu">Sin sesión iniciada</div><label>Correo</label><input class="inp" id="cloud-email" type="email" autocomplete="username"><label>Contraseña</label><input class="inp" id="cloud-password" type="password" autocomplete="current-password"><div class="row"><button class="btn p" id="cloud-login">Iniciar sesión</button><button class="btn" id="cloud-signup">Crear usuario</button><button class="btn" id="cloud-logout">Cerrar sesión</button></div><div class="row"><button class="btn" id="cloud-list">Cargar espacios</button><select class="inp" id="cloud-workspace" style="flex:1;min-width:150px;margin:0"></select></div><label>Crear espacio de trabajo</label><input class="inp" id="cloud-new-workspace" placeholder="RSS Bitácora"><button class="btn" id="cloud-create" style="width:100%;margin-bottom:10px">Crear espacio</button><button class="btn p" id="cloud-sync" style="width:100%">Sincronizar registros y evidencias</button><p id="cloud-status" class="mu" style="margin-top:10px">Configura Supabase para comenzar.</p>';
  const v=$('#v');if(v&&!$('#cloud-panel')){panel.id='cloud-panel';v.append(panel)}
  $('#cloud-url').value=c.url||'';
  $('#cloud-key').value=c.key||'';
  $('#cloud-connect').onclick=connect;$('#cloud-login').onclick=signIn;$('#cloud-signup').onclick=signUp;$('#cloud-logout').onclick=signOut;$('#cloud-list').onclick=listWorkspaces;$('#cloud-create').onclick=createWorkspace;$('#cloud-sync').onclick=sync;
  renderState();if(client)listWorkspaces();
 };
 window.RSSCloud={mount,init};
 document.addEventListener('DOMContentLoaded',()=>init().catch(e=>console.error('RSS cloud init',e)));
})();