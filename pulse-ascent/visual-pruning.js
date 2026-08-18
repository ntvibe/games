const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent&&window.__pulseGenerativeDirector?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

waitFor().then(game=>{
  if(game.__visualPruningInstalled)return;
  game.__visualPruningInstalled=true;

  const HARD_HIDE=[
    'rezscape-city','rezscape-hex-tunnel','rezscape-veils','reference-architecture','reference-worlds',
    'cinematic-setpieces','metamorph-circuit-canyon','metamorph-iris','generative-signal-field'
  ];

  const prune=()=>{
    for(const name of HARD_HIDE){
      const o=game.scene.getObjectByName(name);
      if(o)o.visible=false;
    }
    // Once the connected topology worlds are available, retire the obvious primitive
    // boxes/cones/toruses/polyhedra from the older generative architecture layer.
    const primitiveArch=game.scene.getObjectByName('generative-architecture');
    if(primitiveArch&&window.__pulseTopologyWorlds)primitiveArch.visible=false;

    const old=window.__cinematicEvolution;
    if(old?.setpieces?.root)old.setpieces.root.visible=false;
    if(old?.pilot?.root)old.pilot.root.visible=false;
    old?.skins?.forEach?.(s=>{if(s?.root)s.root.visible=false;});
    const wm=window.__worldMetamorphosis;
    if(wm?.canyon?.root)wm.canyon.root.visible=false;
    if(wm?.iris?.root)wm.iris.root.visible=false;
    if(wm?.field?.points)wm.field.points.visible=false;
  };

  const baseUpdate=game.world.update.bind(game.world);
  game.world.update=(dt,t,energy,sync=0)=>{
    baseUpdate(dt,t,energy,sync);
    prune();
    const topology=window.__pulseTopologyWorlds;
    const area=clamp((window.__pulseCampaign?.state?.selected||1)-1,0,4);
    const world=topology?.worlds?.[area];
    if(world){
      world.mat.opacity=Math.min(world.mat.opacity??.12,.18);
      world.packetMat.opacity=Math.min(world.packetMat.opacity??.7,.82);
    }
  };

  prune();
  window.__pulseVisualPruning={prune,hidden:HARD_HIDE};
});
