import * as THREE from 'three';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent&&window.__pulseCampaign&&window.__pulseTopologyWorlds?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});

const SETPIECE_NAMES=[
  ['DATA CONVOY','BUS INTERCHANGE','CORE ASCENT'],
  ['PRISM PROCESSION','MIRROR CLOISTER','ARCHON APPROACH'],
  ['TIDAL SPIRAL','CHROMA CURRENT','BLOOM DESCENT'],
  ['HUNTER GROVE','BRANCH SWARM','ORACLE NEST'],
  ['CHOIR AISLE','ROSE CIRCUIT','SERAPH GATE']
];

waitFor().then(game=>{
  if(game.__areaSetpieceDirectorInstalled)return;
  game.__areaSetpieceDirectorInstalled=true;

  const state={fired:new Set(),activeUntil:-1,area:0,section:0,name:'',suppressedBar:-999};
  const selectedArea=()=>clamp((window.__pulseCampaign?.state?.selected||1)-1,0,4);
  const spawn=(type,x,y,z,phase=0)=>game.spawnEnemy(type,new THREE.Vector3(x,y,z),phase);

  const spawnSignalBirth=(section)=>{
    const z=-48,spread=5.2+section*.7;
    spawn('tank',0,0,z-10,0);
    spawn('sentinel',-spread,1.4,z-4,0);spawn('sentinel',spread,-1.4,z-6,0);
    for(let i=0;i<4+section;i++){
      const side=i%2?-1:1,x=side*(2.2+(i%3)*1.35),y=((i%3)-1)*1.45;
      spawn(i===3&&section>=2?'node':'drone',x,y,z-i*3.1,0);
    }
  };

  const spawnGlassTemple=(section)=>{
    const z=-50,pairs=2+section;
    for(let i=0;i<pairs;i++){
      const x=2.5+i*1.15,y=Math.sin(i*1.7)*1.8,depth=z-i*4;
      const type=i%2?'prism':'drone';
      spawn(type,-x,y,depth,1);spawn(type,x,-y,depth-1.4,1);
    }
    spawn(section>=2?'tank':'node',0,0,z-8-pairs*2,1);
  };

  const spawnChromaSea=(section)=>{
    const z=-52,count=6+section;
    for(let i=0;i<count;i++){
      const a=(i/count)*Math.PI*2+section*.55,r=4.5+(i%3)*1.1;
      const type=i%4===0?'sentinel':i%3===0?'prism':'drone';
      spawn(type,Math.cos(a)*r,Math.sin(a)*r*.55,z-i*2.8,2);
    }
    if(section>=2)spawn('node',0,0,z-count*2.8-4,2);
  };

  const spawnOrganicCode=(section)=>{
    const z=-50,branches=3+section;
    spawn('tank',0,-.4,z-9,3);
    for(let i=0;i<branches;i++){
      const y=(i-(branches-1)/2)*1.35,x=3.2+i*.72;
      spawn(i%2?'sentinel':'prism',-x,y,z-i*3.4,3);
      spawn(i%2?'prism':'sentinel',x,-y,z-i*3.4-1.5,3);
    }
  };

  const spawnNeuralCathedral=(section)=>{
    const z=-54,lanes=2+section;
    for(let i=-lanes;i<=lanes;i++){
      if(i===0)continue;
      const x=i*1.65,y=(Math.abs(i)%2?1.65:-1.1);
      spawn(Math.abs(i)%3===0?'sentinel':'drone',x,y,z-Math.abs(i)*2.6,4);
    }
    spawn('node',-2.6,0,z-13,4);spawn('node',2.6,0,z-14.5,4);
    if(section>=2)spawn('tank',0,0,z-19,4);
  };

  const BUILDERS=[spawnSignalBirth,spawnGlassTemple,spawnChromaSea,spawnOrganicCode,spawnNeuralCathedral];

  const trigger=(section)=>{
    if(section<1||section>3||game.boss||window.__pulseExpansion?.state?.active)return false;
    const area=selectedArea(),key=`${area}:${section}`;
    if(state.fired.has(key))return false;
    state.fired.add(key);state.area=area;state.section=section;state.name=SETPIECE_NAMES[area][section-1];
    state.activeUntil=(game.time||0)+5.2;state.suppressedBar=game.bar;
    BUILDERS[area](section);
    game.audio.energy=Math.max(game.audio.energy,.48+section*.08);
    game.world.pulse?.(1.05+section*.12);
    game.particles.burst(new THREE.Vector3(0,0,-22),70+section*18,game.palette?.[0]??0x6ef3ff,9+section*2,11);
    window.__pulseTopologyMorph?.trigger?.();
    game.showCallout?.(`${state.name} // SETPIECE`,.94);
    game.haptic?.([8,7,12+section*3]);
    return true;
  };

  const baseSpawnPattern=game.spawnPattern.bind(game);
  game.spawnPattern=(bar)=>bar===state.suppressedBar?undefined:baseSpawnPattern(bar);

  const baseSetSection=game.setSection.bind(game);
  game.setSection=(i,name)=>{baseSetSection(i,name);trigger(i);};

  const baseRestart=game.restart.bind(game);
  game.restart=()=>{state.fired.clear();state.activeUntil=-1;state.suppressedBar=-999;baseRestart();};

  const baseUpdate=game.world.update.bind(game.world);
  game.world.update=(dt,t,energy,sync=0)=>{
    baseUpdate(dt,t,energy,sync);
    const remaining=state.activeUntil-t;
    if(remaining<=0)return;
    const envelope=clamp(remaining/5.2,0,1);
    const topo=window.__pulseTopologyWorlds?.worlds?.[state.area];
    if(topo?.packetMat)topo.packetMat.opacity=Math.max(topo.packetMat.opacity,.26+envelope*.28);
    if(topo?.mat)topo.mat.opacity=Math.max(topo.mat.opacity,.07+envelope*.08);
    const targetFov=68+state.section*1.1+envelope*2.2;
    game.camera.fov=THREE.MathUtils.lerp(game.camera.fov,targetFov,clamp(dt*2.8,0,1));
    game.camera.updateProjectionMatrix();
  };

  window.__pulseAreaSetpieces={
    trigger,
    get active(){return state.activeUntil>(game.time||0);},
    stats:()=>({area:state.area+1,section:state.section,name:state.name,active:state.activeUntil>(game.time||0),suppressedBar:state.suppressedBar,fired:[...state.fired]})
  };
});
