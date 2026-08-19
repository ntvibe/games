import * as THREE from 'three';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const damp=(v,target,rate,dt)=>THREE.MathUtils.lerp(v,target,1-Math.exp(-rate*dt));
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent?.world?.humanRig&&window.__pulsePilotVolume&&window.__pilotTransformation?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});

waitFor().then(game=>{
  if(game.__pilotPerformanceInstalled)return;game.__pilotPerformanceInstalled=true;
  const rig=game.world.humanRig;
  const state={fire:0,fireQ:.5,fireCount:0,hit:0,hitDir:1,overdrive:0,lock:0,free:0,lastPose:'CRUISE'};

  const trigger=(name,strength=1)=>{
    const s=clamp(strength,0,1.5);
    if(name==='fire')state.fire=Math.max(state.fire,s);
    else if(name==='hit'){state.hit=Math.max(state.hit,s);state.hitDir*=-1;}
    else if(name==='overdrive')state.overdrive=Math.max(state.overdrive,s);
  };

  const baseRelease=game.releaseFire.bind(game);
  game.releaseFire=()=>{
    const count=Math.max(1,game.targetsLocked?.length||1),q=game.audio?.timingQuality?.()??.5;
    state.fire=Math.max(state.fire,clamp(.38+count/8*.52+q*.18,0,1.2));state.fireQ=q;state.fireCount=count;
    return baseRelease();
  };

  const baseHit=game.takeHit.bind(game);
  game.takeHit=()=>{
    state.hit=1;state.hitDir=(game.pointer?.x||0)>=0?-1:1;
    return baseHit();
  };

  const baseOverdrive=game.triggerOverdrive.bind(game);
  game.triggerOverdrive=()=>{
    const ready=(game.overdrive||0)>=100;if(ready)state.overdrive=1;
    return baseOverdrive();
  };

  const baseUpdate=game.world.update.bind(game.world);
  game.world.update=(dt,t,energy,sync=0)=>{
    baseUpdate(dt,t,energy,sync);
    const pointer=game.pointer||{x:0,y:0,down:false},form=clamp(window.__pilotTransformation?.form??0,0,3);
    const expressive=.72+form*.11,free=!!window.__pulseExpansion?.state?.active;
    const lockTarget=pointer.down?clamp(.2+(game.targetsLocked?.length||0)/8*.8,0,1):0;
    state.lock=damp(state.lock,lockTarget,lockTarget>state.lock?10:7,dt);
    state.free=damp(state.free,free?1:0,free?4.5:5.5,dt);
    state.fire=damp(state.fire,0,9.5,dt);state.hit=damp(state.hit,0,5.4,dt);state.overdrive=damp(state.overdrive,0,2.7,dt);

    const fire=state.fire,hit=state.hit,od=state.overdrive,lock=state.lock,freeMix=state.free;
    const recoil=fire*(.65+.35*state.fireQ),aimX=clamp(pointer.x,-1,1),aimY=clamp(pointer.y,-1,1);
    const breathing=Math.sin(t*(1.7+energy*.45))*(.012+sync*.012)*(1-freeMix*.55);

    // Additive pose pass after the locomotion system: combat intent remains readable without replacing the base rig animation.
    rig.root.rotation.x=damp(rig.root.rotation.x,-freeMix*.17+recoil*.055-hit*.04,10,dt);
    rig.root.rotation.y+=aimX*(.055+.035*lock)*expressive+state.hitDir*hit*.1;
    rig.root.rotation.z+=-aimX*freeMix*.045+state.hitDir*hit*.13;
    rig.root.position.x=damp(rig.root.position.x,state.hitDir*hit*.1,12,dt);
    rig.root.position.z=damp(rig.root.position.z,recoil*.12-od*.09+freeMix*.07,12,dt);
    rig.root.position.y=damp(rig.root.position.y,.68+breathing+od*.035-hit*.025,8,dt);

    rig.torso.rotation.x=damp(rig.torso.rotation.x,-aimY*lock*.13-freeMix*.08+recoil*.035,9,dt);
    rig.torso.rotation.y=damp(rig.torso.rotation.y,aimX*lock*.15+state.hitDir*hit*.08,9,dt);
    rig.pelvis.rotation.y=damp(rig.pelvis.rotation.y,-aimX*lock*.06-state.hitDir*hit*.05,8,dt);

    const armAim=.22+lock*.46,armBack=freeMix*.48,recoilBack=recoil*.32;
    rig.shoulderL.rotation.x+=-aimY*armAim-armBack-recoilBack;
    rig.shoulderR.rotation.x+=-aimY*armAim-armBack-recoilBack;
    rig.shoulderL.rotation.y=damp(rig.shoulderL.rotation.y,-aimX*lock*.24-state.hitDir*hit*.12,10,dt);
    rig.shoulderR.rotation.y=damp(rig.shoulderR.rotation.y,-aimX*lock*.24-state.hitDir*hit*.12,10,dt);
    const spread=.16+lock*.18+freeMix*.32+od*.62;
    rig.shoulderL.rotation.z=damp(rig.shoulderL.rotation.z,spread,12,dt);
    rig.shoulderR.rotation.z=damp(rig.shoulderR.rotation.z,-spread,12,dt);
    rig.elbowL.rotation.x+=lock*.34+recoil*.28+od*.18;
    rig.elbowR.rotation.x+=lock*.34+recoil*.28+od*.18;

    const tuck=freeMix*.28+recoil*.06;
    rig.hipL.rotation.x+=tuck;rig.hipR.rotation.x+=tuck;
    rig.hipL.rotation.z+=freeMix*.045+od*.035;rig.hipR.rotation.z-=freeMix*.045+od*.035;
    rig.kneeL.rotation.x+=freeMix*.24+hit*.08;rig.kneeR.rotation.x+=freeMix*.24+hit*.08;

    rig.headPivot.rotation.y+=-aimX*lock*.12+state.hitDir*hit*.18;
    rig.headPivot.rotation.x+=aimY*lock*.08-recoil*.12+hit*.08;

    if(od>.03){
      rig.halo.scale.setScalar(1+od*.22);rig.halo2.scale.setScalar(1+od*.3);
    }else{
      rig.halo.scale.setScalar(damp(rig.halo.scale.x,1,8,dt));rig.halo2.scale.setScalar(damp(rig.halo2.scale.x,1,8,dt));
    }

    state.lastPose=od>.12?'OVERDRIVE':hit>.12?'HIT':fire>.1?'FIRE':freeMix>.55?'FREE_VECTOR':lock>.12?'LOCK':'CRUISE';
  };

  window.__pulsePilotPerformance={
    trigger,
    state,
    stats:()=>({pose:state.lastPose,fire:Number(state.fire.toFixed(3)),hit:Number(state.hit.toFixed(3)),overdrive:Number(state.overdrive.toFixed(3)),lock:Number(state.lock.toFixed(3)),free:Number(state.free.toFixed(3)),fireCount:state.fireCount,fireQuality:Number(state.fireQ.toFixed(3))})
  };
});
