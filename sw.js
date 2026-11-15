const CACHE='rss-bitacora-v6';
const CORE=['./','./index.html','./app.css','./app.js','./cloud.js','./manifest.json','./logo.jpg','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  await Promise.allSettled(CORE.map(path=>cache.add(new Request(path,{cache:'reload'}))));
  await self.skipWaiting();
 })());
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(key=>key.startsWith('rss-bitacora-')&&key!==CACHE).map(key=>caches.delete(key)));
  await self.clients.claim();
 })());
});
self.addEventListener('message',event=>{
 if(event.data==='SKIP_WAITING')self.skipWaiting();
});
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET')return;
 const url=new URL(req.url);
 if(url.origin!==self.location.origin)return;
 const isNavigation=req.mode==='navigate';
 const isAppAsset=/\.(?:js|css|html|json)$/.test(url.pathname)||url.pathname.endsWith('/');
 if(isNavigation||isAppAsset){
  event.respondWith((async()=>{
   const cache=await caches.open(CACHE);
   try{
    const response=await fetch(req,{cache:'no-cache'});
    if(response&&response.ok)await cache.put(req,response.clone());
    return response;
   }catch(error){
    const cached=await cache.match(req)||await cache.match('./index.html');
    if(cached)return cached;
    throw error;
   }
  })());
  return;
 }
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  const cached=await cache.match(req);
  if(cached)return cached;
  try{
   const response=await fetch(req);
   if(response&&response.ok)await cache.put(req,response.clone());
   return response;
  }catch(error){throw error}
 })());
});
