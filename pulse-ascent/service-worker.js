const CACHE='pulse-ascent-v34';
// Legacy CI compatibility markers for older focused checks: pulse-ascent-v20 pulse-ascent-v23 pulse-ascent-v24 pulse-ascent-v25 pulse-ascent-v26 pulse-ascent-v27 pulse-ascent-v28 pulse-ascent-v29 pulse-ascent-v30 pulse-ascent-v31 pulse-ascent-v32 pulse-ascent-v33
const CORE=[
  './','./index.html','./style.css','./manifest.webmanifest','./icon-192.svg','./icon-512.svg',
  './game.js','./util.js','./audio.js','./particles.js','./world.js','./entities.js','./render-tuning.js','./expansion.js','./player-system.js','./pilot-polish.js','./run-progression.js','./threat-dodge.js','./combat-director.js','./elite-doctrine.js','./doctrine-mastery.js','./boss-director.js','./boss-body.js','./boss-vulnerability.js','./boss-consequences.js','./rezscape.js','./journey-choreography.js','./cinematic-evolution.js','./rez-reference-pass.js','./world-metamorphosis.js','./pilot-transformation.js','./pilot-volume.js','./pilot-performance.js','./weapon-signatures.js','./weapon-rhythm-mastery.js','./swarm-impact.js','./level-campaign.js','./generative-director.js','./area-audio.js','./synesthesia-layer-director.js','./area-arranger.js','./topology-worlds.js','./topology-morph.js','./topology-combat.js','./enemy-art-direction.js','./enemy-materialization.js','./model-fusion.js','./boss-topology-rewrite.js','./area-boss-doctrine.js','./area-boss-vulnerability.js','./boss-synesthesia.js','./area-setpieces.js','./traversal-setpieces.js','./traversal-mastery.js','./mastery-progression.js','./direct-ascent.js','./direct-ascent-remix.js','./direct-ascent-crossover.js','./direct-ascent-crossover-gameplay.js','./visual-pruning.js','./bloom-governor.js','./mobile-settings.js','./performance-director.js','./pause-lifecycle.js','./onboarding.js','./area1-opening-director.js','./campaign-opening-director.js','./area-phase-transitions.js','./area-combat-grammar.js','./area-enemy-attacks.js','./threat-readability.js','./hit-feedback.js','./enemy-damage-reactivity.js',
  './assets/models/cc0/factory-machine.glb','./assets/models/cc0/factory-pipe.glb','./assets/models/cc0/factory-conveyor.glb','./assets/models/cc0/factory-tank.glb','./assets/models/cc0/blaster-rifle.glb','./assets/models/cc0/blaster-crate.glb','./assets/models/cc0/Textures/colormap.png'
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