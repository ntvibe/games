import {clamp,lerp} from './util.js';

const waitFor=(getter)=>new Promise(resolve=>{const tick=()=>{const v=getter();v?resolve(v):requestAnimationFrame(tick)};tick()});

async function init(){
  const game=await waitFor(()=>window.__pulseAscent),pilot=await waitFor(()=>window.__pulsePilot);
  if(game.__pilotPolishInstalled)return;game.__pilotPolishInstalled=true;
  const world=game.world,rig=pilot.rig,baseSetEvolution=world.setEvolution.bind(world);

  world.setEvolution=(level)=>{
    baseSetEvolution(level);
    if(world.avatarBody)world.avatarBody.visible=false;
    if(world.avatarCore)world.avatarCore.visible=false;
    for(const r of world.avatarRings||[])r.visible=false;
    for(const p of world.avatarPetals||[])p.visible=false;
    const evo=clamp(level,1,6),n=(evo-1)/5;
    rig.halo.visible=evo>=2;rig.halo2.visible=evo>=4;
    rig.halo.material.opacity=.1+n*.2;rig.halo2.material.opacity=.08+n*.18;
    rig.core.material.opacity=.7+n*.28;
    rig.root.scale.setScalar(.92+n*.045);
  };
  world.setEvolution(game.evolution);

  const baseLoop=game.loop.bind(game);
  game.loop=()=>{
    baseLoop();
    const n=clamp((game.evolution-1)/5,0,1),sync=game.sync/100;
    rig.halo.scale.setScalar(lerp(rig.halo.scale.x,1+n*.09+sync*.025,.08));
    rig.halo2.scale.setScalar(lerp(rig.halo2.scale.x,1+n*.14+sync*.04,.08));
  };
}

init();
