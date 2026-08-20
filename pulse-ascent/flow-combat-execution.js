import * as THREE from 'three';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=THREE.MathUtils.lerp;
const reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent?.world?.humanRig&&window.__pulseFlowResonance&&window.__pulsePilotPerformance&&window.__pulsePilot?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});

waitFor().then(game=>{
  if(game.__flowCombatExecutionInstalled)return;game.__flowCombatExecutionInstalled=true;
  const rig=game.world.humanRig,state={tier:0,lockVisualGain:1,fireSyncGain:1,pulse:0,locksStyled:0,releases:0,lastQuality:0,lastCount:0,mechanicalAdvantage:false};

  const baseTryLock=game.tryLock?.bind(game);
  const baseRelease=game.releaseFire?.bind(game);
  if(!baseTryLock||!baseRelease)return;

  game.tryLock=(force=false)=>{
    const before=new Set(game.targetsLocked||[]),result=baseTryLock(force),tier=window.__pulseFlowResonance?.stats?.().tier||0;
    state.tier=tier;state.lockVisualGain=tier>=3?1.35:tier>=2?1.18:tier>=1?1.08:1;
    const added=(game.targetsLocked||[]).filter(t=>!before.has(t));
    if(tier>0&&added.length){
      state.locksStyled+=added.length;state.pulse=1;
      for(const enemy of added){if(enemy?.group)enemy.__flowLockSnap=1;}
    }
    return result;
  };

  game.releaseFire=()=>{
    const tier=window.__pulseFlowResonance?.stats?.().tier||0,count=game.targetsLocked?.length||0,q=game.audio?.timingQuality?.()??.5;
    state.tier=tier;state.fireSyncGain=tier>=3?1.28:tier>=2?1.14:tier>=1?1.06:1;state.lastQuality=q;state.lastCount=count;
    if(tier>0&&count>0){
      state.releases++;state.pulse=1;
      if(tier>=2&&game.audio?.ctx){
        const weaponIndex=window.__pulsePilot?.state?.weapon||0,weapon=window.__pulsePilot?.weapons?.[weaponIndex],div=weapon?.id==='lance'?.5:1;
        const when=game.audio.quantizedTime?.(div)??game.audio.ctx.currentTime,delay=Math.max(0,(when-game.audio.ctx.currentTime)*1000);
        setTimeout(()=>{
          if(!game.running)return;
          window.__pulsePilotPerformance?.trigger?.('fire',clamp(.45+count/8*.35+q*.22,0,1.05));
          dispatchEvent(new CustomEvent('pulse:flow-fire-sync',{detail:{tier,gain:state.fireSyncGain,time:game.time||0,count,quality:q}}));
        },delay);
      }
    }
    return baseRelease();
  };

  const baseUpdate=game.world.update.bind(game.world);
  game.world.update=(dt,t,energy,sync=0)=>{
    baseUpdate(dt,t,energy,sync);
    const tier=window.__pulseFlowResonance?.stats?.().tier||0,comfort=!!window.__pulseSettings?.state?.comfort||reducedMotion(),motion=comfort?.35:1;
    state.tier=tier;state.lockVisualGain=tier>=3?1.35:tier>=2?1.18:tier>=1?1.08:1;state.pulse=lerp(state.pulse,0,1-Math.exp(-dt*10));

    for(const enemy of game.enemies||[]){
      if(!enemy||enemy.dead||!enemy.__flowLockSnap)continue;
      enemy.__flowLockSnap*=Math.exp(-dt*13);const snap=enemy.__flowLockSnap,gain=state.lockVisualGain;
      if(enemy.halo){enemy.halo.scale.setScalar(1+snap*.12*gain);if(enemy.halo.material)enemy.halo.material.opacity=Math.min(.64,(enemy.locked?.32:.1)+snap*.14);}
      if(enemy.group){const s=1+snap*.012*gain;enemy.group.scale.multiplyScalar(s);}
      if(snap<.02)enemy.__flowLockSnap=0;
    }

    if(tier<=0)return;
    const aimX=clamp(game.pointer?.x||0,-1,1),aimY=clamp(game.pointer?.y||0,-1,1),lockMix=clamp((game.targetsLocked?.length||0)/8,0,1),intent=(.12+tier*.06+lockMix*.14)*motion,pulse=state.pulse*motion;
    // Pure execution feel: visual anticipation and pose convergence only. Lock radius, cadence, damage, fire rate and shot quantization remain unchanged.
    rig.headPivot.rotation.y+=-aimX*intent*.035;rig.headPivot.rotation.x+=aimY*intent*.02-pulse*.016;
    rig.torso.rotation.y+=aimX*intent*.025;rig.torso.rotation.x-=lockMix*intent*.022+pulse*.012;
    rig.shoulderL.rotation.z+=intent*.022;rig.shoulderR.rotation.z-=intent*.022;
    rig.elbowL.rotation.x+=lockMix*intent*.045+pulse*.045;rig.elbowR.rotation.x+=lockMix*intent*.045+pulse*.045;
    if(tier>=3){rig.root.position.z+=pulse*.025;rig.root.rotation.x-=pulse*.012;}
  };

  window.__pulseFlowCombatExecution={
    stats:()=>({tier:state.tier,lockVisualGain:Number(state.lockVisualGain.toFixed(2)),fireSyncGain:Number(state.fireSyncGain.toFixed(2)),pulse:Number(state.pulse.toFixed(3)),locksStyled:state.locksStyled,releases:state.releases,lastQuality:Number(state.lastQuality.toFixed(3)),lastCount:state.lastCount,mechanicalAdvantage:false})
  };
});
