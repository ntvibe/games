import * as THREE from 'three';
import {clamp} from './util.js';

const mobile=()=>innerWidth<760||matchMedia('(pointer: coarse)').matches;
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent&&window.__pulseWeaponSignatures&&window.__pulseWeaponRhythmMastery?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});

function dispose(root){
  if(root.parent)root.parent.remove(root);
  root.traverse?.(n=>{n.geometry?.dispose?.();if(Array.isArray(n.material))n.material.forEach(m=>m.dispose?.());else n.material?.dispose?.();});
}

function valid(t){return !!t&&!t.dead&&!t.part?.dead;}

waitFor().then(game=>{
  if(game.__swarmImpactInstalled)return;game.__swarmImpactInstalled=true;
  const state={launched:0,impacts:0,reacquired:0,fizzles:0,chains:0,active:new Set()};
  const baseFire=game.fireWeaponAt.bind(game);

  const positionOf=t=>valid(t)?game.targetPosition(t,new THREE.Vector3()).clone():null;
  const nearestFrom=(point,exclude=null,radius=8)=>{
    let best=null,bestD=radius;
    for(const t of game.getTargetList()){
      if(t===exclude||!valid(t))continue;
      const p=positionOf(t);if(!p)continue;const d=p.distanceTo(point);if(d<bestD){best=t;bestD=d;}
    }
    return best;
  };

  function applyImpact(target,point,q,damage,index=0,chain=false){
    if(!valid(target))return false;
    const killed=target.hit?.(damage)??false;
    game.particles.burst(point,chain?14:22,0xb18aff,chain?3.2:4.8,chain?6:9);
    if(!chain){
      state.impacts++;game.hits++;game.combo++;game.lastHitAt=game.time;game.maxCombo=Math.max(game.maxCombo,game.combo);
      game.mult=1+Math.min(6.5,game.combo/14)+(game.sync/100)*.75;
      game.score+=Math.round((135+index*30)*(0.72+q*.48)*game.mult);
      game.overdrive=clamp(game.overdrive+(killed?5.8:1.5)+(q>.88?.8:0),0,100);
      game.audio.energy=clamp(.12+(game.combo/55)+game.section*.12+(game.sync/100)*.18,0,1);
      game.updateHud?.();
    }
    return killed;
  }

  function launchMissile(target,index,total,q,damage=1,{chain=false,startOverride=null}={}){
    const start=startOverride?.clone?.()||game.world.avatar.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,.55,-.5));
    let tracked=target,targetPos=positionOf(tracked);if(!targetPos)return;
    const root=new THREE.Group();root.name=chain?'swarm-impact-chain':'swarm-impact-missile';
    const shell=new THREE.Mesh(new THREE.OctahedronGeometry(chain?.055:.09,0),new THREE.MeshStandardMaterial({color:0x080611,emissive:chain?0x7d5cff:0xa884ff,emissiveIntensity:chain?.18:.26,metalness:.35,roughness:.42,blending:THREE.NormalBlending}));root.add(shell);
    const count=mobile()?(chain?4:6):(chain?5:9),trailPos=new Float32Array(count*3),trailGeo=new THREE.BufferGeometry();trailGeo.setAttribute('position',new THREE.BufferAttribute(trailPos,3));
    const trail=new THREE.Line(trailGeo,new THREE.LineBasicMaterial({color:0xb18aff,transparent:true,opacity:chain?.28:.48,blending:THREE.NormalBlending,depthWrite:false}));root.add(trail);game.scene.add(root);root.position.copy(start);
    const velocity=targetPos.clone().sub(start).normalize().multiplyScalar(chain?34:26);const side=new THREE.Vector3(-velocity.y,velocity.x,0).normalize();velocity.addScaledVector(side,(index-(total-1)/2)*1.6+(index%2?2.2:-2.2));
    const history=[],born=performance.now(),maxMs=chain?420:760,turn=chain?10:7.5,speed=chain?36:28;state.active.add(root);if(!chain)state.launched++;

    const finish=()=>{state.active.delete(root);dispose(root);};
    const tick=(now)=>{
      if(!game.running){finish();return;}
      let dt=Math.min(.04,Math.max(.001,(root.userData.last?now-root.userData.last:16)/1000));root.userData.last=now;
      if(!valid(tracked)){
        const next=nearestFrom(root.position,tracked,chain?5.5:8.5);
        if(next){tracked=next;targetPos=positionOf(next);if(!chain)state.reacquired++;}
        else targetPos=null;
      }else targetPos=positionOf(tracked);
      if(targetPos){
        const desired=targetPos.clone().sub(root.position),dist=desired.length();
        if(dist<.38){applyImpact(tracked,targetPos,q,damage,index,chain);if(!chain)spawnChains(tracked,targetPos,q);finish();return;}
        desired.normalize().multiplyScalar(speed);velocity.lerp(desired,clamp(dt*turn,0,1));
      }
      root.position.addScaledVector(velocity,dt);root.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),velocity.clone().normalize());
      history.unshift(root.position.clone());if(history.length>count)history.length=count;
      for(let i=0;i<count;i++){const h=history[Math.min(i,history.length-1)]||root.position,j=i*3;trailPos[j]=h.x-root.position.x;trailPos[j+1]=h.y-root.position.y;trailPos[j+2]=h.z-root.position.z;}trailGeo.attributes.position.needsUpdate=true;
      const age=(now-born)/maxMs;trail.material.opacity=(chain?.28:.48)*(1-clamp(age,0,1)*.5);
      if(now-born>=maxMs){
        if(targetPos&&targetPos.distanceTo(root.position)<2.2){applyImpact(tracked,targetPos,q,damage,index,chain);if(!chain)spawnChains(tracked,targetPos,q);}else if(!chain)state.fizzles++;
        finish();return;
      }
      requestAnimationFrame(tick);
    };requestAnimationFrame(tick);
  }

  function spawnChains(primary,origin,q){
    const candidates=game.getTargetList().filter(t=>t!==primary&&valid(t)).map(t=>[origin.distanceTo(positionOf(t)),t]).filter(([d])=>d<5.6).sort((a,b)=>a[0]-b[0]).slice(0,2);
    candidates.forEach(([d,t],j)=>{state.chains++;setTimeout(()=>{if(valid(t))launchMissile(t,j,candidates.length,Math.max(.7,q*.9),t.type==='danger'?1:.8,{chain:true,startOverride:origin});},35+j*55);});
  }

  game.fireWeaponAt=(target,index,total,q,cfg)=>{
    if(cfg?.id!=='swarm')return baseFire(target,index,total,q,cfg);
    if(!game.running||!valid(target))return;
    launchMissile(target,index,total,q,cfg.damage||1);
    const t=game.audio.ctx?.currentTime;if(t!==undefined){const root=game.audio.rootMidi||43;game.audio.osc('triangle',game.audio.midi(root+31+(index%3)*2),t,.1,.014,game.audio.fx,(index-total/2)*3,(index-total/2)/Math.max(2,total));}
    window.__pulsePilotPerformance?.trigger?.('fire',.72);
  };

  window.__pulseSwarmImpact={
    stats:()=>({launched:state.launched,impacts:state.impacts,reacquired:state.reacquired,fizzles:state.fizzles,chains:state.chains,active:state.active.size}),
    launch:launchMissile
  };
});
