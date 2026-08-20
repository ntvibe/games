import * as THREE from 'three';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=THREE.MathUtils.lerp;
const mobile=()=>innerWidth<760||matchMedia('(pointer: coarse)').matches;
const reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent?.world?.humanRig&&window.__pulseFlowResonance&&window.__pulsePilotPerformance&&window.__pulsePilot?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});

function circleGeometry(radius=1,steps=24){
  const pts=[];for(let i=0;i<steps;i++){const a=i/steps*Math.PI*2;pts.push(new THREE.Vector3(Math.cos(a)*radius,Math.sin(a)*radius,0));}
  return new THREE.BufferGeometry().setFromPoints(pts);
}

waitFor().then(game=>{
  if(game.__flowExecutionInstalled)return;game.__flowExecutionInstalled=true;
  const rig=game.world.humanRig,fxRoot=new THREE.Group();fxRoot.name='flow-execution-fx';game.scene.add(fxRoot);
  const state={tier:0,acquirePulse:0,releasePulse:0,beatPulse:0,locksStyled:0,releases:0,lastQuality:0,lastCount:0,activeFx:0};
  const effects=[];

  function palette(){
    const area=clamp((window.__pulseCampaign?.state?.selected||1)-1,0,4),colors=window.__pulseTopologyWorlds?.profiles?.[area]?.colors;
    return colors||[0x78f5ff,0xff70d5];
  }

  function spawnAcquireGlyph(target,index,tier){
    if(!target||tier<=0)return;
    const [primary,secondary]=palette(),root=new THREE.Group();root.name='flow-lock-acquire';
    const matA=new THREE.LineBasicMaterial({color:primary,transparent:true,opacity:.42,depthWrite:false,depthTest:true,blending:THREE.NormalBlending});
    const matB=new THREE.LineBasicMaterial({color:secondary,transparent:true,opacity:tier>=3?.28:.16,depthWrite:false,depthTest:true,blending:THREE.NormalBlending});
    const ringA=new THREE.LineLoop(circleGeometry(.42,mobile()?16:24),matA),ringB=new THREE.LineLoop(circleGeometry(.59,mobile()?16:24),matB);
    ringB.rotation.z=Math.PI/(tier>=3?8:12);root.add(ringA,ringB);fxRoot.add(root);
    const life=tier>=3?.18:tier===2?.22:.26;
    effects.push({root,ringA,ringB,matA,matB,target,index,age:0,life,tier});state.activeFx=effects.length;state.locksStyled++;
  }

  function disposeFx(fx){
    fxRoot.remove(fx.root);fx.ringA.geometry.dispose();fx.ringB.geometry.dispose();fx.matA.dispose();fx.matB.dispose();
  }

  const baseTryLock=game.tryLock.bind(game);
  game.tryLock=(force=false)=>{
    const before=new Set(game.targetsLocked||[]),result=baseTryLock(force),flow=window.__pulseFlowResonance?.stats?.()||{tier:0};
    state.tier=flow.tier|0;
    if(state.tier>0){
      const added=(game.targetsLocked||[]).filter(t=>!before.has(t));
      for(let i=0;i<added.length;i++)spawnAcquireGlyph(added[i],(game.targetsLocked?.indexOf(added[i])??i),state.tier);
      if(added.length)state.acquirePulse=Math.max(state.acquirePulse,.55+state.tier*.15);
    }
    return result;
  };

  const baseRelease=game.releaseFire.bind(game);
  game.releaseFire=()=>{
    const flow=window.__pulseFlowResonance?.stats?.()||{tier:0},tier=flow.tier|0,count=game.targetsLocked?.length||0,q=game.audio?.timingQuality?.()??.5;
    state.tier=tier;state.lastQuality=q;state.lastCount=count;
    if(tier>0&&count>0){
      state.releasePulse=Math.max(state.releasePulse,.5+tier*.16);state.releases++;
      if(tier>=2&&game.audio?.ctx){
        const weaponIndex=window.__pulsePilot?.state?.weapon||0,weapon=window.__pulsePilot?.weapons?.[weaponIndex],div=weapon?.id==='lance'?.5:1;
        const when=game.audio.quantizedTime?.(div)??game.audio.ctx.currentTime,delay=Math.max(0,(when-game.audio.ctx.currentTime)*1000);
        setTimeout(()=>{
          if(!game.running)return;state.beatPulse=1;
          // The base combat system already owns damage and shot timing. This only makes the pilot visibly land the gesture on that same quantized beat.
          window.__pulsePilotPerformance?.trigger?.('fire',clamp(.45+count/8*.35+q*.22,0,1.05));
        },delay);
      }
    }
    return baseRelease();
  };

  const baseUpdate=game.world.update.bind(game.world);
  game.world.update=(dt,t,energy,sync=0)=>{
    baseUpdate(dt,t,energy,sync);
    const flow=window.__pulseFlowResonance?.stats?.()||{tier:0},tier=flow.tier|0,comfort=!!window.__pulseSettings?.state?.comfort||reducedMotion(),motion=comfort?.35:1;
    state.tier=tier;state.acquirePulse=lerp(state.acquirePulse,0,1-Math.exp(-dt*10));state.releasePulse=lerp(state.releasePulse,0,1-Math.exp(-dt*9));state.beatPulse=lerp(state.beatPulse,0,1-Math.exp(-dt*13));

    for(let i=effects.length-1;i>=0;i--){
      const fx=effects[i];fx.age+=dt;
      if(fx.age>=fx.life||fx.target?.dead){disposeFx(fx);effects.splice(i,1);continue;}
      const p=game.targetPosition?.(fx.target,new THREE.Vector3());if(p)fx.root.position.copy(p);
      const u=clamp(fx.age/fx.life,0,1),ease=1-Math.pow(1-u,3),collapse=1-u;
      fx.root.scale.setScalar(.58+ease*(fx.tier>=3?.62:.48));fx.root.rotation.z+=dt*(fx.tier>=3?4.2:2.6);
      fx.matA.opacity=.42*collapse;fx.matB.opacity=(fx.tier>=3?.28:.16)*collapse;
    }
    state.activeFx=effects.length;

    if(tier<=0)return;
    const aimX=clamp(game.pointer?.x||0,-1,1),aimY=clamp(game.pointer?.y||0,-1,1),lockCount=game.targetsLocked?.length||0,lockMix=clamp(lockCount/8,0,1),ascend=tier>=3?1:0;
    const intent=(.16+tier*.08+lockMix*.18)*motion,acquire=state.acquirePulse*motion,beat=state.beatPulse*motion;

    // Presentation-only execution polish: stronger anticipation and cleaner convergence, without changing lock radius, lock cadence, damage, fire rate, or quantization.
    rig.headPivot.rotation.y+=-aimX*(.025+intent*.045);rig.headPivot.rotation.x+=aimY*(.018+intent*.028)-beat*.025;
    rig.torso.rotation.y+=aimX*intent*.035;rig.torso.rotation.x-=lockMix*intent*.03+beat*.022;
    rig.shoulderL.rotation.z+=intent*.028+acquire*.02;rig.shoulderR.rotation.z-=intent*.028+acquire*.02;
    rig.elbowL.rotation.x+=lockMix*intent*.06+beat*.08;rig.elbowR.rotation.x+=lockMix*intent*.06+beat*.08;
    rig.root.position.z+=beat*.035*ascend;rig.root.rotation.x-=beat*.018*ascend;
    if(rig.halo){rig.halo.scale.multiplyScalar(1+beat*.028+acquire*.012);}
    if(rig.halo2){rig.halo2.scale.multiplyScalar(1+beat*.035+acquire*.014);}
  };

  window.__pulseFlowExecution={
    stats:()=>({tier:state.tier,locksStyled:state.locksStyled,releases:state.releases,lastQuality:Number(state.lastQuality.toFixed(3)),lastCount:state.lastCount,activeFx:state.activeFx,acquirePulse:Number(state.acquirePulse.toFixed(3)),releasePulse:Number(state.releasePulse.toFixed(3)),beatPulse:Number(state.beatPulse.toFixed(3)),mechanicalAdvantage:false})
  };
});
