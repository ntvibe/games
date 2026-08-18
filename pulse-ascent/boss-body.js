import * as THREE from 'three';
import {clamp,lerp,TAU} from './util.js';

const waitFor=(getter)=>new Promise(resolve=>{const tick=()=>{const value=getter();value?resolve(value):requestAnimationFrame(tick)};tick()});

function makeChargeRig(boss){
  const group=new THREE.Group();
  group.renderOrder=4;
  const cyan=new THREE.MeshBasicMaterial({color:0x6ff7ff,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:false});
  const pink=new THREE.MeshBasicMaterial({color:0xff5bd7,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:false});
  const ringA=new THREE.Mesh(new THREE.TorusGeometry(2.45,.022,4,64),cyan);ringA.rotation.x=Math.PI/2;group.add(ringA);
  const ringB=new THREE.Mesh(new THREE.TorusGeometry(3.05,.018,4,72),pink);ringB.rotation.set(Math.PI/2,.45,.18);group.add(ringB);
  const shardGeo=new THREE.OctahedronGeometry(.1,0),shards=[];
  for(let i=0;i<12;i++){
    const m=new THREE.Mesh(shardGeo.clone(),i%2?pink.clone():cyan.clone());
    m.material.opacity=0;group.add(m);shards.push(m);
  }
  boss.group.add(group);
  return {group,ringA,ringB,shards,mats:[cyan,pink]};
}

function disposeChargeRig(rig){
  rig.group.parent?.remove(rig.group);
  rig.group.traverse(o=>{o.geometry?.dispose?.();o.material?.dispose?.();});
}

async function init(){
  const game=await waitFor(()=>window.__pulseAscent),director=await waitFor(()=>window.__pulseBossDirector);
  if(game.__bossBodyInstalled)return;game.__bossBodyInstalled=true;

  const state={boss:null,rig:null,mode:'idle',chargeStart:-10,chargeUntil:-10,recoverUntil:-10,releases:0,opens:0,lastPhase:0,lastStep:-1};

  const beginCharge=(boss,duration=.46)=>{
    state.mode='charge';state.chargeStart=game.time;state.chargeUntil=game.time+duration;state.recoverUntil=state.chargeUntil+.54;state.opens++;
    game.world.pulse?.(.8+boss.phase*.15);
  };

  const release=(boss)=>{
    state.mode='release';state.releases++;state.chargeUntil=game.time;state.recoverUntil=Math.max(state.recoverUntil,game.time+.58);
    const wp=boss.group.position.clone();wp.z+=2.2;
    game.particles.burst(wp,120,boss.phase===3?0xff5bd7:0x6ff7ff,9+boss.phase*1.5,12);
  };

  const shouldBegin=(phase,s)=>phase===1?s===4:phase===2?(s===0||s===8):(s===4||s===12);
  const shouldRelease=(phase,s)=>phase===1?s===8:phase===2?(s===4||s===12):(s===0||s===8);

  const patchBoss=(boss)=>{
    if(!boss||boss.__bodyChoreographyInstalled)return;
    boss.__bodyChoreographyInstalled=true;state.boss=boss;state.lastPhase=boss.phase;state.rig=makeChargeRig(boss);

    const baseBeat=boss.beat.bind(boss);
    boss.beat=(step)=>{
      baseBeat(step);
      const s=step%16;state.lastStep=s;
      if(shouldBegin(boss.phase,s))beginCharge(boss,boss.phase===3?.5:.44);
      if(shouldRelease(boss.phase,s))release(boss);
    };

    const baseUpdate=boss.update.bind(boss);
    boss.update=(dt,t)=>{
      baseUpdate(dt,t);
      const rig=state.rig;if(!rig||boss.dead)return;
      const now=game.time,charging=now<state.chargeUntil,recovering=!charging&&now<state.recoverUntil;
      if(charging)state.mode='charge';else if(recovering)state.mode='recover';else state.mode='idle';

      const charge=charging?clamp((now-state.chargeStart)/Math.max(.001,state.chargeUntil-state.chargeStart),0,1):0;
      const recover=recovering?1-clamp((now-state.chargeUntil)/Math.max(.001,state.recoverUntil-state.chargeUntil),0,1):0;
      const intensity=Math.max(charge,recover*.72),pulse=.5+.5*Math.sin(t*128/60*TAU*2);

      rig.ringA.rotation.z+=dt*(1.05+boss.phase*.35+intensity*2.2);
      rig.ringB.rotation.z-=dt*(.8+boss.phase*.28+intensity*1.7);
      rig.ringA.scale.setScalar(.82+intensity*.34+pulse*.035*intensity);
      rig.ringB.scale.setScalar(.9+intensity*.24);
      rig.ringA.material.opacity=.03+intensity*(.2+pulse*.16);
      rig.ringB.material.opacity=.02+intensity*(.14+pulse*.12);

      rig.shards.forEach((m,i)=>{
        const a=i/rig.shards.length*TAU+t*(.28+i*.004)*(i%2?-1:1),r=2.1+intensity*(1.2+(i%3)*.22);
        m.position.set(Math.cos(a)*r,Math.sin(a)*r*.62,Math.sin(a*2+i)*.55);
        m.rotation.x+=dt*(1.4+i*.06);m.rotation.y+=dt*(.9+i*.04);
        m.scale.setScalar(.55+intensity*(.8+pulse*.25));m.material.opacity=intensity*(.18+(i%2?.14:.22));
      });

      const phase=boss.phase;
      boss.parts.forEach((p,i)=>{
        if(p.dead)return;
        const radial=new THREE.Vector3(p.pivot.position.x,p.pivot.position.y,0);
        const len=Math.max(.001,radial.length());radial.multiplyScalar(1/len);
        const open=charging?charge:(recovering?recover:0);
        const phaseSpread=phase===1?.52:phase===2?.82:1.08;
        p.pivot.position.x+=radial.x*open*phaseSpread;
        p.pivot.position.y+=radial.y*open*phaseSpread*.78;
        p.pivot.position.z+=Math.sin(i*TAU/8+phase)*open*(phase===3?1.15:.72);
        p.pivot.rotation.z+=Math.sin(t*2.4+i)*open*.08;
        p.mesh.scale.multiplyScalar(1+open*(.12+phase*.025)+pulse*open*.035);
        p.mesh.material.opacity=Math.min(1,p.mesh.material.opacity+open*(.08+pulse*.06));
      });

      boss.core.scale.multiplyScalar(1+intensity*(.08+phase*.025)+pulse*intensity*.035);
      boss.innerCore.scale.multiplyScalar(1+intensity*(.16+phase*.04)+pulse*intensity*.09);
      boss.innerCore.material.opacity=lerp(boss.innerCore.material.opacity,.48+intensity*(.24+pulse*.16),dt*9);
      boss.rings.forEach((r,i)=>{r.scale.multiplyScalar(1+intensity*.006*(i+1));r.material.opacity=Math.min(.42,r.material.opacity+intensity*.025);});
    };

    const baseKill=boss.kill.bind(boss);
    boss.kill=()=>{if(state.rig){disposeChargeRig(state.rig);state.rig=null;}baseKill();};
  };

  const basePhase=game.onBossPhase.bind(game);
  game.onBossPhase=(phase)=>{basePhase(phase);state.lastPhase=phase;if(state.boss&&!state.boss.dead){beginCharge(state.boss,.62);game.showCallout(phase===3?'CORE UNBOUND // FINAL RESONANCE':'CONVERGENCE RECONFIGURING',.95);}};

  const tick=()=>{
    if(game.boss&&!game.boss.dead&&game.boss!==state.boss)patchBoss(game.boss);
    requestAnimationFrame(tick);
  };tick();

  window.__pulseBossBody={state,patchBoss,beginCharge,release,stats:()=>({patched:!!state.boss,mode:state.mode,releases:state.releases,opens:state.opens,phase:state.boss?.phase||0,rig:!!state.rig,shards:state.rig?.shards.length||0})};
}

init();
