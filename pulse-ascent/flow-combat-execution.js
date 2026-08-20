const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent&&window.__pulseFlowResonance&&window.__pulsePilotPerformance?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});

waitFor().then(game=>{
  if(game.__flowCombatExecutionInstalled)return;
  game.__flowCombatExecutionInstalled=true;

  const state={tier:0,lockVisualGain:1,fireSyncGain:1,pulse:0};
  const baseAcquire=game.acquireLocks?.bind(game);
  const baseRelease=game.releaseLocks?.bind(game);
  if(!baseAcquire||!baseRelease)return;

  game.acquireLocks=(...args)=>{
    const before=game.locked?.length||0;
    const result=baseAcquire(...args);
    const tier=window.__pulseFlowResonance?.stats?.().tier||0;
    state.tier=tier;
    // Pure presentation acceleration: targets already acquired by game logic animate into lock state faster at high FLOW.
    const gain=tier>=3?1.35:tier>=2?1.18:tier>=1?1.08:1;
    state.lockVisualGain=gain;
    const added=(game.locked?.length||0)-before;
    if(added>0){
      for(const enemy of game.locked||[]){
        if(!enemy?.group)continue;
        enemy.__flowLockSnap=1;
      }
      state.pulse=1;
    }
    return result;
  };

  game.releaseLocks=(...args)=>{
    const tier=window.__pulseFlowResonance?.stats?.().tier||0;
    state.tier=tier;
    state.fireSyncGain=tier>=3?1.28:tier>=2?1.14:tier>=1?1.06:1;
    if(tier>=2){
      window.dispatchEvent(new CustomEvent('pulse:flow-fire-sync',{detail:{tier,gain:state.fireSyncGain,time:game.time||0}}));
    }
    const result=baseRelease(...args);
    state.pulse=1;
    return result;
  };

  const tick=()=>{
    const tier=window.__pulseFlowResonance?.stats?.().tier||0;
    state.tier=tier;
    const lockGain=tier>=3?1.35:tier>=2?1.18:tier>=1?1.08:1;
    state.lockVisualGain=lockGain;
    state.pulse*=.88;
    for(const enemy of game.enemies||[]){
      if(!enemy||enemy.dead||!enemy.__flowLockSnap)continue;
      enemy.__flowLockSnap*=.74;
      const snap=enemy.__flowLockSnap;
      if(enemy.halo){enemy.halo.scale.setScalar(1+snap*.12*lockGain);if(enemy.halo.material)enemy.halo.material.opacity=Math.min(.72,(enemy.locked?.34:.12)+snap*.16);}
      if(enemy.group){const s=1+snap*.018*lockGain;enemy.group.scale.multiplyScalar(s);}
      if(snap<.02)enemy.__flowLockSnap=0;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  window.__pulseFlowCombatExecution={
    stats:()=>({tier:state.tier,lockVisualGain:Number(state.lockVisualGain.toFixed(2)),fireSyncGain:Number(state.fireSyncGain.toFixed(2)),pulse:Number(state.pulse.toFixed(3))})
  };
});
