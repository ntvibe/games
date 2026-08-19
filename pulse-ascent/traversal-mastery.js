import * as THREE from 'three';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=THREE.MathUtils.lerp;
const TAU=Math.PI*2;
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent&&window.__pulseTraversalSetpieces&&window.__pulseAreaSetpieces?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});
const COLORS=[0x59f6ff,0xffb46a,0x7dffe4,0xa5ff78,0xd7e9ff];
const GATE_TIMES=[.45,1.9,3.35];
const ROUTES=[
  [[-.42,.12],[.34,-.2],[-.66,.24]],
  [[.36,.24],[-.34,-.18],[.62,.06]],
  [[-.28,-.22],[.38,.18],[-.58,-.05]],
  [[-.38,.16],[.42,-.12],[.7,.2]],
  [[.28,-.18],[-.32,.2],[.58,0]]
];

function makeGate(scene){
  const root=new THREE.Group();root.name='traversal-rhythm-gate';root.visible=false;scene.add(root);
  const verts=[],steps=10;
  for(let i=0;i<steps;i++){
    const a=i/steps*TAU,b=(i+1)/steps*TAU;
    verts.push(Math.cos(a),Math.sin(a),0,Math.cos(b),Math.sin(b),0);
  }
  for(let i=0;i<4;i++){
    const a=i/4*TAU,c=Math.cos(a),s=Math.sin(a);
    verts.push(c*.68,s*.68,0,c*.9,s*.9,0);
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
  const mat=new THREE.LineBasicMaterial({color:COLORS[0],transparent:true,opacity:.66,blending:THREE.NormalBlending,depthWrite:false,depthTest:true});
  const line=new THREE.LineSegments(geo,mat);root.add(line);
  const coreGeo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0)]);
  const coreMat=new THREE.PointsMaterial({color:0xffffff,size:.08,transparent:true,opacity:.55,blending:THREE.NormalBlending,depthWrite:false,sizeAttenuation:true});
  root.add(new THREE.Points(coreGeo,coreMat));
  return {root,line,mat,coreMat};
}

waitFor().then(game=>{
  if(game.__traversalMasteryInstalled)return;game.__traversalMasteryInstalled=true;
  const visual=makeGate(game.scene);
  const state={active:false,key:'',area:0,section:0,startedAt:0,sequence:0,gate:null,hits:0,misses:0,streak:0,bestStreak:0,routeClears:0,lastAward:0};

  const setpiece=()=>window.__pulseAreaSetpieces?.stats?.()||{};
  const traversal=()=>window.__pulseTraversalSetpieces?.stats?.()||{};
  const areaRoute=(area,index)=>ROUTES[clamp(area,0,4)][clamp(index,0,2)];

  function worldAtNdc(nx,ny,z){
    const p=new THREE.Vector3(nx,ny,.35).unproject(game.camera),dir=p.sub(game.camera.position).normalize();
    const dist=(z-game.camera.position.z)/(Math.abs(dir.z)<1e-4?-1:dir.z);
    return game.camera.position.clone().add(dir.multiplyScalar(dist));
  }

  function beginGate(index,t){
    const [x,y]=areaRoute(state.area,index),risk=index===2;
    state.gate={index,start:t,duration:risk?1.5:1.62,x,y,risk,resolved:false};
    visual.root.visible=true;visual.mat.color.set(COLORS[state.area]);visual.coreMat.color.set(risk?0xffd86a:0xffffff);
    game.showCallout?.(risk?'OVERDRIVE ROUTE // RELEASE ON BEAT':'RHYTHM GATE // RELEASE ON BEAT',risk ? .92 : .78);
  }

  function resolveGate(success,q=0){
    const gate=state.gate;if(!gate||gate.resolved)return false;gate.resolved=true;
    if(success){
      state.hits++;state.streak++;state.bestStreak=Math.max(state.bestStreak,state.streak);
      const quality=clamp(q,0,1),base=700+state.section*260,award=Math.round(base*(gate.risk?1.9:1)*(1+Math.min(4,state.streak-1)*.18)*(.72+quality*.55));
      state.lastAward=award;game.score+=award;game.sync=clamp(game.sync+(gate.risk?5:3)+(quality>.86?2:0),0,100);game.overdrive=clamp(game.overdrive+(gate.risk?9:5),0,100);game.updateHud?.();
      game.audio.syncNote?.(Math.max(.7,q));game.haptic?.(gate.risk?[8,8,18]:[6,5,10]);
      game.particles.burst(visual.root.position.clone(),gate.risk?34:22,COLORS[state.area],gate.risk?5.5:3.8,8);
      game.showCallout?.(`${gate.risk?'OVERDRIVE GATE':'RHYTHM GATE'} +${award}`,q);
      if(state.sequence===3&&state.streak>=3){state.routeClears++;const clear=2400+state.section*650;game.score+=clear;game.sync=clamp(game.sync+4,0,100);game.updateHud?.();game.showCallout?.(`ROUTE MASTERED +${clear}`,1);window.__pulseTopologyMorph?.trigger?.();}
    }else{
      state.misses++;state.streak=0;game.showCallout?.('ROUTE MISSED',.2);
    }
    return success;
  }

  function tryGate(q=game.audio?.timingQuality?.()??.5){
    const gate=state.gate;if(!state.active||!gate||gate.resolved)return false;
    const progress=clamp(((game.time||0)-gate.start)/gate.duration,0,1);if(progress<.48||progress>.98)return false;
    const px=game.pointer?.x||0,py=game.pointer?.y||0,aspect=innerWidth/Math.max(1,innerHeight),d=Math.hypot((px-gate.x)*Math.min(1.55,aspect),py-gate.y);
    const inside=d<(gate.risk ? .16 : .23);
    if(!inside)return false;
    if(q<.55){game.showCallout?.('GATE // WAIT FOR GRID',.35);game.haptic?.(4);return false;}
    return resolveGate(true,q);
  }

  const baseRelease=game.releaseFire.bind(game);
  game.releaseFire=()=>{tryGate();return baseRelease();};

  const baseRestart=game.restart.bind(game);
  game.restart=()=>{state.active=false;state.key='';state.sequence=0;state.gate=null;state.streak=0;visual.root.visible=false;baseRestart();};

  const baseUpdate=game.world.update.bind(game.world);
  game.world.update=(dt,t,energy,sync=0)=>{
    baseUpdate(dt,t,energy,sync);
    const sp=setpiece(),tr=traversal(),key=`${sp.area||0}:${sp.section||0}:${sp.name||''}`,now=!!sp.active&&!!tr.active;
    if(now&&(!state.active||state.key!==key)){
      state.active=true;state.key=key;state.area=clamp((sp.area||1)-1,0,4);state.section=clamp(sp.section||1,1,3);state.startedAt=t;state.sequence=0;state.gate=null;state.streak=0;
    }else if(!now&&state.active){
      if(state.gate&&!state.gate.resolved)resolveGate(false,0);state.active=false;state.gate=null;visual.root.visible=false;
    }
    if(!state.active)return;

    const elapsed=t-state.startedAt;
    if(state.sequence<GATE_TIMES.length&&elapsed>=GATE_TIMES[state.sequence]&&(!state.gate||state.gate.resolved)){
      beginGate(state.sequence,t);state.sequence++;
    }
    const gate=state.gate;if(!gate)return;
    const p=clamp((t-gate.start)/gate.duration,0,1),z=lerp(-42,1.5,p),pos=worldAtNdc(gate.x,gate.y,z);visual.root.position.copy(pos);
    const pulse=Math.pow(Math.max(0,Math.cos(((game.audio?.ctx?.currentTime||t)/(game.audio?.beatDur||.47))*TAU)),10);
    const baseScale=gate.risk ? .82 : 1.08;visual.root.scale.setScalar(baseScale*(1+p*.14+pulse*.08));visual.root.rotation.z+=dt*(gate.risk?1.15:.58);
    visual.mat.opacity=(gate.resolved ? .12 : .42)+pulse*.26;visual.coreMat.opacity=(gate.resolved ? .1 : .38)+pulse*.34;
    if(p>=1&&!gate.resolved)resolveGate(false,0);
    if(gate.resolved){visual.mat.opacity=lerp(visual.mat.opacity,0,clamp(dt*8,0,1));visual.coreMat.opacity=lerp(visual.coreMat.opacity,0,clamp(dt*8,0,1));if(visual.mat.opacity<.03)visual.root.visible=false;}
  };

  window.__pulseTraversalMastery={
    tryGate,
    forceGate:(index=0)=>{if(!state.active){const sp=setpiece();state.active=true;state.area=clamp((sp.area||1)-1,0,4);state.section=clamp(sp.section||1,1,3);state.startedAt=game.time||0;}beginGate(clamp(index,0,2),game.time||0);state.sequence=Math.max(state.sequence,index+1);return state.gate;},
    stats:()=>({active:state.active,area:state.area+1,section:state.section,sequence:state.sequence,gate:state.gate?{index:state.gate.index,risk:state.gate.risk,resolved:state.gate.resolved,x:state.gate.x,y:state.gate.y}:null,hits:state.hits,misses:state.misses,streak:state.streak,bestStreak:state.bestStreak,routeClears:state.routeClears,lastAward:state.lastAward,visible:visual.root.visible})
  };
});