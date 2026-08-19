import * as THREE from 'three';

const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=THREE.MathUtils.lerp;
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent&&window.__pulseOnboarding?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});

waitFor().then(game=>{
  if(game.__area1OpeningDirectorInstalled)return;
  game.__area1OpeningDirectorInstalled=true;

  const state={active:false,bar:-1,perfects:0,firstNode:false,arrival:0,successPulse:0,stage:'IDLE',authoredWaves:0};
  const isAreaOne=()=>Math.max(1,Math.min(5,window.__pulseCampaign?.state?.selected||1))===1;
  const isTraining=()=>!!window.__pulseOnboarding?.state?.active;
  const isDirect=()=>!!window.__pulseDirectAscent?.active;
  const shouldDirect=()=>game.running&&isAreaOne()&&!isTraining()&&!isDirect()&&(game.bar||0)<16;

  const spawn=(type,x,y,z,phase=0)=>game.spawnEnemy(type,new THREE.Vector3(x,y,z),phase);
  const stageWave=bar=>{
    state.authoredWaves++;
    if(bar===0){
      // Hold the very first beat open. The three opening drones are already approaching.
      state.stage='FIRST CONTACT';return;
    }
    if(bar===2){
      state.stage='PAINT THE SIGNAL';
      [[-4.8,-1.5,-44],[-1.6,1.3,-48],[1.6,-.9,-52],[4.8,1.7,-56]].forEach((p,i)=>spawn('drone',...p,i));
      game.showCallout?.('PAINT THE SIGNAL',.76);return;
    }
    if(bar===4){
      state.stage='EVOLUTION SEED';
      spawn('drone',-3.4,1.2,-48,1);spawn('node',0,0,-52,1);spawn('drone',3.4,-1.2,-56,1);
      game.showCallout?.('EVOLUTION SEED // NODE ONLINE',.9);return;
    }
    if(bar===6){
      state.stage='ARC ARRAY';
      for(let i=0;i<6;i++){const a=-1.05+i/5*2.1;spawn('drone',Math.sin(a)*6.4,Math.cos(a)*2.7-1,-48-i*2,1);}
      return;
    }
    if(bar===8){
      state.stage='SIGNAL BLOOM';
      spawn('sentinel',0,0,-58,2);
      for(const d of [-1,1]){spawn('drone',d*4.7,1.7,-50,2);spawn('drone',d*6,-1.4,-56,2);}
      game.showCallout?.('SIGNAL BLOOM // VELOCITY UP',.94);state.successPulse=1;return;
    }
    if(bar===10){
      state.stage='CROSS CURRENT';
      for(let i=0;i<6;i++){const d=i%2?-1:1;spawn(i===2?'prism':'drone',d*(2.2+(i>>1)*1.5),-2+i*.78,-50-i*2.2,2);}
      return;
    }
    if(bar===12){
      state.stage='LOCK CASCADE';
      spawn('node',0,1.8,-60,2);
      for(let i=0;i<7;i++){const a=i/7*TAU;spawn(i===3?'prism':'drone',Math.cos(a)*6.2,Math.sin(a)*2.9-1,-48-i*2.5,2);}
      game.showCallout?.('LOCK CASCADE // BUILD THE ARRAY',.9);return;
    }
    if(bar===14){
      state.stage='VECTOR TEMPLE APPROACH';
      spawn('sentinel',-3.8,.8,-58,2);spawn('sentinel',3.8,-.8,-61,2);spawn('prism',0,2,-54,2);
      for(const d of [-1,1])spawn('drone',d*6,-2,-50,2);
      game.showCallout?.('VECTOR TEMPLE // APPROACH',1);state.successPulse=1;return;
    }
  };

  const baseOpening=game.spawnOpening.bind(game);
  game.spawnOpening=()=>{
    if(!isAreaOne()||isDirect())return baseOpening();
    // A quieter first composition creates depth and gives the pilot room to arrive before density ramps.
    spawn('drone',-4.2,-1.1,-38,0);spawn('drone',0,1.7,-45,0);spawn('drone',4.2,-.7,-52,0);
    state.arrival=1;state.stage='ARRIVAL';
  };

  const basePattern=game.spawnPattern.bind(game);
  game.spawnPattern=bar=>{
    const active=shouldDirect();state.active=active;state.bar=bar;
    if(active&&bar%2===0){stageWave(bar);return;}
    return basePattern(bar);
  };

  const playSuccessCue=(q,count)=>{
    if(!game.audio?.ctx)return;
    const t=game.audio.quantizedTime?.(.5)||game.audio.ctx.currentTime+.02,root=(game.audio.rootMidi||43)+24;
    game.audio.pluck?.(t,root+(state.perfects%2?7:0),.038+Math.min(.018,count*.002),.15,-.24);
    game.audio.pluck?.(t+.035,root+12,.024,.18,.28);
    if(state.perfects===2)game.audio.pad?.(t,root,game.audio.beatDur*1.8,.022);
  };

  const baseScoreTiming=game.scoreTiming.bind(game);
  game.scoreTiming=(q,count)=>{
    const result=baseScoreTiming(q,count);
    if(shouldDirect()&&q>.88){
      state.perfects++;state.successPulse=1;playSuccessCue(q,count);
      if(state.perfects===1)game.showCallout?.('SIGNAL ACCEPTED // LAYER RESPONDS',1);
      else if(state.perfects===3)game.showCallout?.('RHYTHM LINK // WORLD AWAKENING',1);
      if(state.perfects===1||state.perfects===3)window.__pulseTopologyMorph?.trigger?.();
    }
    return result;
  };

  const baseDestroyed=game.onEnemyDestroyed.bind(game);
  game.onEnemyDestroyed=enemy=>{
    const result=baseDestroyed(enemy);
    if(shouldDirect()&&enemy?.type==='node'&&!state.firstNode){
      state.firstNode=true;state.successPulse=1;
      game.showCallout?.('FORM SHIFT // SIGNAL BODY',1);
      window.__pulseTopologyMorph?.trigger?.();
      game.audio.sectionStab?.(Math.min(4,game.section+1));
    }
    return result;
  };

  const baseRestart=game.restart.bind(game);
  game.restart=(...args)=>{
    const result=baseRestart(...args);state.active=false;state.bar=-1;state.perfects=0;state.firstNode=false;state.arrival=1;state.successPulse=0;state.stage='ARRIVAL';state.authoredWaves=0;return result;
  };

  const baseWorldUpdate=game.world.update.bind(game.world);
  game.world.update=(dt,t,energy,sync=0)=>{
    const result=baseWorldUpdate(dt,t,energy,sync);
    const active=shouldDirect();state.active=active;
    if(!active)return result;

    state.arrival=lerp(state.arrival,0,1-Math.pow(.012,dt));
    state.successPulse=lerp(state.successPulse,0,1-Math.pow(.006,dt));
    const intro=Math.max(0,1-clamp((game.time||0)/7.5,0,1));

    // Begin wider/farther, then settle into the normal combat lens. This is restrained so aim remains stable.
    const desiredZ=8+intro*1.25;
    game.camera.position.z=lerp(game.camera.position.z,desiredZ,clamp(dt*2.6,0,1));
    const desiredFov=66+intro*8+state.successPulse*1.2;
    game.camera.fov=lerp(game.camera.fov,desiredFov,clamp(dt*2.3,0,1));game.camera.updateProjectionMatrix();

    const topo=window.__pulseTopologyWorlds;
    const world=topo?.worlds?.[0];
    if(world?.root){
      const breath=1+Math.sin(t*.55)*.006+state.successPulse*.018;
      world.root.scale.setScalar(breath);
      world.root.rotation.z=Math.sin(t*.11)*.012+state.successPulse*.01;
    }
    const gen=window.__pulseGenerativeDirector;
    if(gen?.field?.mat){
      const floor=.11+clamp((game.bar||0)/16,0,1)*.07;
      gen.field.mat.opacity=Math.max(floor,Math.min(gen.field.mat.opacity,.27+state.successPulse*.04));
    }
    return result;
  };

  window.__pulseArea1Opening={
    state,
    shouldDirect,
    stats:()=>({active:state.active,bar:game.bar||0,stage:state.stage,perfects:state.perfects,firstNode:state.firstNode,authoredWaves:state.authoredWaves})
  };
});
