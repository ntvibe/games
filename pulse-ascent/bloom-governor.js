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

    // Reserve bloom for highlights only. The game contains many additive materials,
    // so even moderate bloom values can compound into white clipping on mobile OLED/LCD screens.
    const maxStrength=mobile?.24+cinematic*.08:.36+cinematic*.12;
    const maxRadius=mobile?.10+cinematic*.04:.16+cinematic*.05;
    const minThreshold=mobile?.91-cinematic*.025:.84-cinematic*.035;

    game.bloom.strength=Math.min(game.bloom.strength,maxStrength);
    game.bloom.radius=Math.min(game.bloom.radius,maxRadius);
    game.bloom.threshold=Math.max(game.bloom.threshold,minThreshold);

    // Keep headroom for saturated colors and thin linework instead of flattening
    // the scene into white masses during combat or transitions.
    const exposureCap=mobile?1.08+cinematic*.035:1.18+cinematic*.05;
    game.renderer.toneMappingExposure=Math.min(game.renderer.toneMappingExposure,exposureCap);

    return baseRender(...args);
  };

  window.__pulseBloomGovernor={
    limits:()=>({mobile:isMobile(),strength:game.bloom.strength,radius:game.bloom.radius,threshold:game.bloom.threshold,exposure:game.renderer.toneMappingExposure})
  };
});
