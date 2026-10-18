// Online navigation must not silently pin customers to an obsolete HTML build.
// Offline falls back to an atomically precached shell; hashed assets stay cache-first.
export function offlineShellSource(version: string, files: string[]) {
  return `const CACHE='iprasm-offline-shell-v2-'+${JSON.stringify(version)};
const FILES=${JSON.stringify(files)};
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('iprasm-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);
 if(e.request.method!=='GET'||u.origin!==self.location.origin||u.pathname.startsWith('/api/'))return;
 const cached=()=>caches.open(CACHE).then(c=>c.match(u.pathname,{ignoreVary:true}));
 if(e.request.mode==='navigate'){
   e.respondWith(fetch(e.request).then(async r=>{if(r.ok)return r;const fallback=await cached();return fallback||r;}).catch(async error=>{const fallback=await cached();if(fallback)return fallback;throw error;}));
 }else e.respondWith(cached().then(r=>r||fetch(e.request)));
});
// No remote scripts, token URLs or arbitrary notification links. This worker
// also owns the web FCM subscription passed explicitly to getToken().
self.addEventListener('push',e=>e.waitUntil((async()=>{
 let data;try{data=e.data.json();}catch{return;}
 const n=data.notification||{};if(typeof n.title!=='string'||typeof n.body!=='string')return;
 const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
 for(const c of clients)c.postMessage({type:'IP_RASM_PUSH'});
 if(clients.some(c=>c.visibilityState==='visible'))return;
 await self.registration.showNotification(n.title.slice(0,160),{body:n.body.slice(0,1000),tag:String(data.data?.tag||'iprasm-news').slice(0,100),data:{url:'/'}});
})()));
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil((async()=>{
 const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
 const same=clients.find(c=>new URL(c.url).origin===self.location.origin);
 if(same){same.postMessage({type:'IP_RASM_PUSH'});await same.focus();}
 else await self.clients.openWindow('/');
})());});`;
}
