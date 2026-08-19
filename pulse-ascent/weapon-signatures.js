import * as THREE from 'three';

const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const waitFor=()=>new Promise(resolve=>{
  const tick=()=>window.__pulseAscent&&window.__pulsePilot&&window.__pulsePilotPerformance?resolve(window.__pulseAscent):requestAnimationFrame(tick);
  tick();
});
const mobile=()=>innerWidth<760||matchMedia('(pointer: coarse)').matches;

function disposeObject(scene,obj){
  if(obj.parent)obj.parent.remove(obj);else scene.remove(obj);
  obj.traverse?.(n=>{n.geometry?.dispose?.();if(Array.isArray(n.material))n.material.forEach(m=>m.dispose?.());else n.material?.dispose?.();});
}

function makeLanceBeam(game,start,end,q){
  const dir=end.clone().sub(start),len=Math.max(.01,dir.length()),mid=start.clone().add(end).multiplyScalar(.5);
  const root=new THREE.Group();root.name='lance-signature-beam';
  const coreMat=new THREE.MeshBasicMaterial({color:0xff5fcf,transparent:true,opacity:.58,blending:THREE.NormalBlending,depthWrite:false});
  const core=new THREE.Mesh(new THREE.CylinderGeometry(.034,.052,len,6,1,true),coreMat);core.position.copy(mid);core.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.clone().normalize());root.add(core);
  const edgeMat=new THREE.LineBasicMaterial({color:0xffd9f4,transparent:true,opacity:.82,blending:THREE.NormalBlending,depthWrite:false});
  const edge=new THREE.Line(new THREE.BufferGeometry().setFromPoints([start,end]),edgeMat);root.add(edge);
  const impact=new THREE.Mesh(new THREE.OctahedronGeometry(.16,0),new THREE.MeshBasicMaterial({color:0xff8ddd,transparent:true,opacity:.62,blending:THREE.NormalBlending,depthWrite:false}));impact.position.copy(end);root.add(impact);
  game.scene.add(root);
  const begun=performance.now(),dur=140+q*55;
  const tick=()=>{
    const k=clamp((performance.now()-begun)/dur,0,1),fade=1-k;
    core.material.opacity=.58*fade;edge.material.opacity=.82*fade;impact.material.opacity=.62*fade;impact.scale.setScalar(1+k*1.5);
    if(k>=1){disposeObject(game.scene,root);return;}requestAnimationFrame(tick);
  };requestAnimationFrame(tick);
}

function makeSwarmMissile(game,start,end,index,total,q){
  const root=new THREE.Group();root.name='swarm-signature-missile';
  const shell=new THREE.Mesh(new THREE.OctahedronGeometry(.085,0),new THREE.MeshStandardMaterial({color:0x090714,emissive:0x8d6cff,emissiveIntensity:.3,metalness:.25,roughness:.45,blending:THREE.NormalBlending}));root.add(shell);
  const trailCount=mobile()?6:9,trailPos=new Float32Array(trailCount*3);for(let i=0;i<trailCount;i++){trailPos[i*3]=start.x;trailPos[i*3+1]=start.y;trailPos[i*3+2]=start.z;}
  const trailGeo=new THREE.BufferGeometry();trailGeo.setAttribute('position',new THREE.BufferAttribute(trailPos,3));
  const trail=new THREE.Line(trailGeo,new THREE.LineBasicMaterial({color:0xb18aff,transparent:true,opacity:.5,blending:THREE.NormalBlending,depthWrite:false}));root.add(trail);
  game.scene.add(root);
  const forward=end.clone().sub(start),distance=forward.length(),side=new THREE.Vector3(-forward.y,forward.x,0).normalize();if(side.lengthSq()<.01)side.set(1,0,0);
  const lift=(index-(total-1)/2)*.18,curve=(.9+distance*.035)*(index%2?1:-1),c1=start.clone().lerp(end,.32).addScaledVector(side,curve).add(new THREE.Vector3(0,lift+.3,0)),c2=start.clone().lerp(end,.68).addScaledVector(side,-curve*.55).add(new THREE.Vector3(0,lift-.2,0));
  const begun=performance.now(),dur=190+index*14+(1-q)*45,history=[];
  const point=(t)=>{
    const a=start.clone().multiplyScalar((1-t)**3),b=c1.clone().multiplyScalar(3*(1-t)**2*t),c=c2.clone().multiplyScalar(3*(1-t)*t*t),d=end.clone().multiplyScalar(t**3);return a.add(b).add(c).add(d);
  };
  const tick=()=>{
    const k=clamp((performance.now()-begun)/dur,0,1),p=point(k);root.position.copy(p);root.rotation.z+=.12;root.rotation.y+=.18;history.unshift(p.clone());if(history.length>trailCount)history.length=trailCount;
    for(let i=0;i<trailCount;i++){const h=history[Math.min(i,history.length-1)]||start,j=i*3;trailPos[j]=h.x-p.x;trailPos[j+1]=h.y-p.y;trailPos[j+2]=h.z-p.z;}trailGeo.attributes.position.needsUpdate=true;trail.material.opacity=.5*(1-k*.55);
    if(k>=1){game.particles.burst(end,10,0xb18aff,2.4,5);disposeObject(game.scene,root);return;}requestAnimationFrame(tick);
  };requestAnimationFrame(tick);
}

function lancePierce(game,primary,start,end,q){
  const dir=end.clone().sub(start),primaryLen=dir.length();if(primaryLen<.01)return 0;dir.normalize();
  const maxLen=primaryLen+18,candidates=[];
  for(const t of game.getTargetList()){
    if(t===primary||t.dead||t.part?.dead)continue;
    const p=game.targetPosition(t,new THREE.Vector3()),v=p.clone().sub(start),proj=v.dot(dir);if(proj<1||proj>maxLen)continue;
    const miss=v.clone().addScaledVector(dir,-proj).length();if(miss<.78)candidates.push([proj,t,p]);
  }
  candidates.sort((a,b)=>a[0]-b[0]);const hits=candidates.slice(0,mobile()?1:2);
  for(const [,t,p] of hits){const killed=t.hit?.(t.type==='danger'?2:1.15)??false;game.particles.burst(p,12,0xff65d6,2.8,6);if(killed)game.overdrive=clamp(game.overdrive+2.5,0,100);}
  if(hits.length){const far=hits[hits.length-1][2].clone().addScaledVector(dir,1.5);makeLanceBeam(game,end,far,Math.max(.75,q));game.showCallout?.(`LANCE PIERCE ×${hits.length+1}`,.9);}
  return hits.length;
}

waitFor().then(game=>{
  if(game.__weaponSignaturesInstalled)return;game.__weaponSignaturesInstalled=true;
  const stats={lockShots:0,lanceShots:0,swarmShots:0,pierces:0,missiles:0};
  const current=()=>window.__pulsePilot?.weapons?.[window.__pulsePilot?.state?.weapon||0]||{id:'lock'};

  const baseFire=game.fireWeaponAt.bind(game);
  game.fireWeaponAt=(target,index,total,q,cfg)=>{
    const start=game.world.avatar.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,.55,-.5)),end=game.targetPosition(target,new THREE.Vector3()).clone();
    if(cfg.id==='lock'){
      stats.lockShots++;return baseFire(target,index,total,q,cfg);
    }
    const originalBeam=game.makeShotBeam;game.makeShotBeam=()=>{};
    let result;try{result=baseFire(target,index,total,q,cfg);}finally{game.makeShotBeam=originalBeam;}
    if(cfg.id==='lance'){
      stats.lanceShots++;makeLanceBeam(game,start,end,q);stats.pierces+=lancePierce(game,target,start,end,q);
      const t=game.audio.ctx?.currentTime;if(t!==undefined){const root=game.audio.rootMidi||43;const a=game.audio.osc('sawtooth',game.audio.midi(root+12),t,.18,.034,game.audio.fx,-7);a?.o?.frequency?.exponentialRampToValueAtTime?.(game.audio.midi(root+5),t+.16);game.audio.osc('sine',game.audio.midi(root-12),t,.22,.045,game.audio.fx);}
      window.__pulsePilotPerformance?.trigger?.('fire',1.18);
    }else if(cfg.id==='swarm'){
      stats.swarmShots++;stats.missiles++;makeSwarmMissile(game,start,end,index,total,q);
      const t=game.audio.ctx?.currentTime;if(t!==undefined){const root=game.audio.rootMidi||43;for(let i=0;i<3;i++){const a=game.audio.osc(i===1?'triangle':'sine',game.audio.midi(root+31+i*3),t+i*.014,.11,.014,game.audio.fx,(i-1)*5,(i-1)*.35);a?.o?.frequency?.exponentialRampToValueAtTime?.(game.audio.midi(root+38+i*2),t+.1+i*.014);}}
      window.__pulsePilotPerformance?.trigger?.('fire',.78);
    }
    return result;
  };

  const baseRelease=game.releaseFire.bind(game);
  game.releaseFire=()=>{
    const cfg=current(),count=Math.max(1,game.targetsLocked?.length||1),result=baseRelease();
    if(cfg.id==='lance')game.cameraKick=(game.cameraKick||0)+.055;
    if(cfg.id==='swarm'&&count>=4)game.showCallout?.('SWARM SALVO // GUIDANCE ONLINE',.84);
    return result;
  };

  window.__pulseWeaponSignatures={
    stats:()=>({...stats,weapon:current().id,activeMissiles:game.scene.children.filter(o=>o.name==='swarm-signature-missile').length,activeLances:game.scene.children.filter(o=>o.name==='lance-signature-beam').length})
  };
});
