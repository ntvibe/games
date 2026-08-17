const applyRenderTuning=()=>{
  const game=window.__pulseAscent;
  if(!game?.bloom){requestAnimationFrame(applyRenderTuning);return;}
  game.bloom.threshold=.46;
  game.bloom.radius=.48;
};
applyRenderTuning();
