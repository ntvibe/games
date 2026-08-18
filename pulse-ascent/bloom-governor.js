const waitForGame=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});
const coarse=matchMedia('(pointer: coarse)').matches;
const isMobile=()=>innerWidth<750||innerHeight<520||coarse;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

waitForGame().then(game=>{
  if(game.__bloomGovernorInstalled||!game.composer||!game.bloom)return;
  game.__bloomGovernorInstalled=true;

  const baseRender=game.composer.render.bind(game.composer);
  game.composer.render=(...args)=>{
    const mobile=isMobile();
    const rush=window.__rezscape?.rush||0;
    const morph=window.__worldMetamorphosis?.transition||0;
    const cinematic=clamp(Math.max(rush,morph),0,1);

    // Keep luminous edges crisp instead of allowing large soft halos to wash out
    // enemies, circuitry, pilot silhouette and threat telegraphs.
    const maxStrength=mobile?.52+cinematic*.14:.72+cinematic*.18;
    const maxRadius=mobile?.22+cinematic*.07:.34+cinematic*.09;
    const minThreshold=mobile?.74-cinematic*.05:.64-cinematic*.05;

    game.bloom.strength=Math.min(game.bloom.strength,maxStrength);
    game.bloom.radius=Math.min(game.bloom.radius,maxRadius);
    game.bloom.threshold=Math.max(game.bloom.threshold,minThreshold);

    // Several cinematic systems intentionally raise exposure. Preserve the punch,
    // but prevent bright additive geometry from clipping into white on phone screens.
    const exposureCap=mobile?1.28+cinematic*.08:1.42+cinematic*.1;
    game.renderer.toneMappingExposure=Math.min(game.renderer.toneMappingExposure,exposureCap);

    return baseRender(...args);
  };

  window.__pulseBloomGovernor={
    limits:()=>({mobile:isMobile(),strength:game.bloom.strength,radius:game.bloom.radius,threshold:game.bloom.threshold,exposure:game.renderer.toneMappingExposure})
  };
});
