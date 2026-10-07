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
});`;
}
