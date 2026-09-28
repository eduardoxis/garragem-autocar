const CACHE='garagem-auto-car-shell-v5';
const SHELL=['/login.html','/index.html','/404.html','/js/onepage.js','/css/variables.css','/css/global.css','/css/components.css','/css/responsive.css'];
self.addEventListener('install',event=>event.waitUntil(
  caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())
));
self.addEventListener('activate',event=>event.waitUntil(
  caches.keys()
    .then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
    .then(()=>self.clients.claim())
));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;

  const requestUrl=new URL(event.request.url);
  if(requestUrl.origin!==self.location.origin)return;

  event.respondWith(
    fetch(event.request).catch(async()=>{
      const cached=await caches.match(event.request);
      return cached||Response.error();
    })
  );
});
