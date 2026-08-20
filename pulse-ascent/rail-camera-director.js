import * as THREE from 'three';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=THREE.MathUtils.lerp;
const mobile=()=>innerWidth<760||innerHeight<520||matchMedia('(pointer: coarse)').matches;
const reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});

waitFor().then(game=>{
  if(game.__railCameraDirectorInstalled)return;game.__railCameraDirectorInstalled=true;

  const state={
    beat:0,phrase:0,reveal:0,impact:0,transition:0,revealX:0,revealY:0,
    drive:1,encounters:0,punctuations:0,
    offset:{x:0,y:0,z:0,pitch:0,yaw:0,roll:0},
    target:{x:0,y:0,z:0,pitch:0,yaw:0,roll:0}
  };

  const comfort=()=>!!window.__pulseSettings?.state?.comfort||reducedMotion();
  const selectedArea=()=>clamp((window.__pulseCampaign?.state?.selected||1)-1,0,4);
  const onboarding=()=>!!window.__pulseOnboarding?.state?.active;
  const traversal=()=>!!window.__pulseTraversalSetpieces?.active;
  const paused=()=>!!window.__pulsePause?.state?.paused;

  const frameEncounter=(enemies)=>{
    const live=enemies.filter(e=>e&&!e.dead&&e.type!=='danger'&&e.group);
    if(!live.length)return;
    let x=0,y=0,n=0;
    for(const enemy of live){x+=enemy.group.position.x||0;y+=enemy.group.position.y||0;n++;}
    state.revealX=clamp((x/Math.max(1,n))/9,-1,1);
    state.revealY=clamp((y/Math.max(1,n))/5,-1,1);
    state.reveal=1;state.encounters++;
  };

  const baseSpawnPattern=game.spawnPattern?.bind(game);
  if(baseSpawnPattern)game.spawnPattern=(bar)=>{
    const before=game.enemies.length,r=baseSpawnPattern(bar);
    frameEncounter(game.enemies.slice(before));
    return r;
  };

  const baseSetSection=game.setSection?.bind(game);
  if(baseSetSection)game.setSection=(i,name)=>{
    const r=baseSetSection(i,name);state.transition=1;state.phrase=Math.max(state.phrase,.8);return r;
  };

  const baseDestroyed=game.onEnemyDestroyed?.bind(game);
  if(baseDestroyed)game.onEnemyDestroyed=(enemy)=>{
    const r=baseDestroyed(enemy);
    const heavy=enemy?.type==='node'||enemy?.type==='sentinel'||enemy?.type==='tank'||enemy?.elite;
    if(heavy||(game.combo>0&&game.combo%12===0)){
      state.impact=Math.max(state.impact,heavy?1:.58);state.punctuations++;
    }
    return r;
  };

  game.audio?.onStep?.((step)=>{
    if(step%4===0)state.beat=Math.max(state.beat,step%16===0?1:.48);
    if(step%16===0)state.phrase=1;
  });

  const removePriorOffset=()=>{
    const o=state.offset,c=game.camera;
    c.position.x-=o.x;c.position.y-=o.y;c.position.z-=o.z;
    c.rotation.x-=o.pitch;c.rotation.y-=o.yaw;c.rotation.z-=o.roll;
    o.x=o.y=o.z=o.pitch=o.yaw=o.roll=0;
  };

  const baseUpdate=game.world.update.bind(game.world);
  game.world.update=(dt,t,energy,sync=0)=>{
    removePriorOffset();
    baseUpdate(dt,t,energy,sync);

    const rail=!!game.running&&!paused()&&!document.hidden&&game.world.lines?.visible!==false&&!traversal();
    const section=clamp(game.section||0,0,4),area=selectedArea(),sync01=clamp((game.sync||0)/100,0,1),energy01=clamp(energy||0,0,1);
    const motionScale=comfort()?.16:(mobile()?.68:1)*(onboarding()?.28:1);

    state.beat=lerp(state.beat,0,1-Math.pow(.006,dt));
    state.phrase=lerp(state.phrase,0,1-Math.pow(.02,dt));
    state.reveal=lerp(state.reveal,0,1-Math.pow(.012,dt));
    state.impact=lerp(state.impact,0,1-Math.pow(.0018,dt));
    state.transition=lerp(state.transition,0,1-Math.pow(.008,dt));

    if(rail){
      const driftAmp=(.18+section*.035+sync01*.05)*motionScale;
      const phase=t*(.11+area*.012)+area*1.37;
      const revealEase=state.reveal*state.reveal;
      const impactEase=state.impact*state.impact;
      state.target.x=Math.sin(phase)*driftAmp+state.revealX*revealEase*.28*motionScale;
      state.target.y=Math.sin(phase*1.37+1.2)*driftAmp*.34+state.revealY*revealEase*.12*motionScale;
      state.target.z=(-state.beat*.045+state.phrase*.055+state.transition*.09+impactEase*.16)*motionScale;
      state.target.pitch=(-state.revealY*revealEase*.012+Math.sin(phase*.72)*.004)*motionScale;
      state.target.yaw=(-state.revealX*revealEase*.018+Math.sin(phase*.56)*.004)*motionScale;
      state.target.roll=(-Math.cos(phase*.9)*(.012+section*.0025)-state.revealX*revealEase*.009)*motionScale;

      const rawDrive=1+section*.012+energy01*.025+sync01*.02+state.beat*.035+state.phrase*.075-state.reveal*.045-state.transition*.06-impactEase*.105;
      const desiredDrive=comfort()?lerp(1,rawDrive,.18):rawDrive;
      state.drive=lerp(state.drive,clamp(desiredDrive,.86,1.15),clamp(dt*(desiredDrive>state.drive?3.4:7),0,1));
    }else{
      for(const k of Object.keys(state.target))state.target[k]=0;
      state.drive=lerp(state.drive,1,clamp(dt*7,0,1));
    }

    const o=state.offset,rate=clamp(dt*5.5,0,1);
    for(const k of Object.keys(o))o[k]=lerp(o[k],state.target[k],rate);
    const c=game.camera;
    c.position.x+=o.x;c.position.y+=o.y;c.position.z+=o.z;
    c.rotation.x+=o.pitch;c.rotation.y+=o.yaw;c.rotation.z+=o.roll;
  };

  window.__pulseRailCamera={
    state,
    frameEncounter,
    pulseImpact:(strength=1)=>{state.impact=Math.max(state.impact,clamp(strength,0,1));},
    stats:()=>({active:!!game.running&&game.world.lines?.visible!==false&&!traversal()&&!paused(),drive:state.drive,encounters:state.encounters,punctuations:state.punctuations,reveal:state.reveal,impact:state.impact,offset:{...state.offset},comfort:comfort(),reducedMotion:reducedMotion()})
  };
});
