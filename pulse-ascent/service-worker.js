const CACHE='pulse-ascent-v13';
const CORE=[
  './','./index.html','./style.css','./manifest.webmanifest','./icon-192.svg','./icon-512.svg',
  './game.js','./util.js','./audio.js','./particles.js','./world.js','./entities.js','./render-tuning.js','./expansion.js','./player-system.js','./pilot-polish.js','./run-progression.js','./threat-dodge.js','./combat-director.js','./elite-doctrine.js','./doctrine-mastery.js','./boss-director.js','./boss-body.js','./boss-vulnerability.js','./boss-consequences.js','./rezscape.js','./journey-choreography.js','./cinematic-evolution.js','./rez-reference-pass.js','./world-metamorphosis.js','./pilot-transformation.js','./level-campaign.js','./generative-director.js','./area-audio.js','./synesthesia-layer-director.js','./area-arranger.js','./topology-worlds.js','./topology-morph.js','./topology-combat.js','./enemy-art-direction.js','./enemy-materialization.js','./boss-topology-rewrite.js','./area-boss-doctrine.js','./area-boss-vulnerability.js','./boss-synesthesia.js','./area-setpieces.js','./traversal-setpieces.js','./visual-pruning.js','./bloom-governor.js'
];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  const sameOrigin=url.origin===self.location.origin;
  if(sameOrigin){
    event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response;}).catch(()=>caches.match('./index.html'))));
    return;
  }
  if(url.hostname==='cdn.jsdelivr.net'){
    event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response;})));
  }
});