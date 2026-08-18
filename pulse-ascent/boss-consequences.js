import * as THREE from 'three';
import {clamp,TAU} from './util.js';

const waitFor=(getter)=>new Promise(resolve=>{const tick=()=>{const value=getter();value?resolve(value):requestAnimationFrame(tick)};tick()});
const BOSS_TAGS=new Set(['twin-cut','shift-gate','resonance-wall']);

function makeFractureField(boss){
  const count=18,arr=new Float32Array(count*2*3);
  for(let i=0;i<count;i++){
    const a=i/count*TAU,r=1.9+(i%4)*.42,j=i*6;
    arr[j]=Math.cos(a)*r;arr[j+1]=Math.sin(a)*r*.55;arr[j+2]=Math.sin(a*2)*.35;
    arr[j+3]=Math.cos(a+.15)*(r+.55);arr[j+4]=Math.sin(a+.15)*(r+.55)*.55;arr[j+5]=Math.sin(a*2+.4)*.55;
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(arr,3));
  const mat=new THREE.LineBasicMaterial({color:0xb98cff,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false});
  const lines=new THREE.LineSegments(geo,mat);lines.visible=false;boss.group.add(lines);
  return {lines,mat,geo};
}

async function init(){
  const game=await waitFor(()=>window.__pulseAscent);
  const director=await waitFor(()=>window.__pulseDirector);
  const bossDirector=await waitFor(()=>window.__pulseBossDirector);
  const vulnerability=await waitFor(()=>window.__pulseBossVulnerability);
  if(game.__bossConsequencesInstalled)return;game.__bossConsequencesInstalled=true;

  const state={boss:null,fracture:null,spawnSerial:0,suppressed:0,widened:0,slowed:0,lastBroken:{EMITTER:0,GATE:0,RESONATOR:0}};
  const brokenCounts=()=>{
    const boss=game.boss;if(!boss)return {EMITTER:0,GATE:0,RESONATOR:0};
    const out={EMITTER:0,GATE:0,RESONATOR:0};
    for(const p of boss.parts||[])if(p.dead&&out[p.role]!==undefined)out[p.role]++;
    return out;
  };

  const baseSpawnThreat=director.spawnThreat.bind(director);
  director.spawnThreat=(gameArg,cfg={})=>{
    const isBoss=BOSS_TAGS.has(cfg.tag);
    if(!isBoss)return baseSpawnThreat(gameArg,cfg);
    state.spawnSerial++;
    const broken=brokenCounts();

    // Core exposure is a reward window: stop boss pressure so the player can capitalize.
    if(vulnerability.state.exposed){state.suppressed++;return null;}

    // Destroying emitter limbs progressively removes projectile output.
    if(broken.EMITTER===1&&state.spawnSerial%3===0){state.suppressed++;return null;}
    if(broken.EMITTER>=2&&state.spawnSerial%2===0){state.suppressed++;return null;}

    const next={...cfg};
    if(broken.GATE>0){
      const a=game.world.avatar.position;
      let dx=(next.targetX??a.x)-a.x,dy=(next.targetY??a.y)-a.y;
      if(Math.hypot(dx,dy)<.2){dx=(next.x??0)>=a.x?1:-1;dy=((state.spawnSerial%2)*2-1)*.35;}
      const mag=Math.hypot(dx,dy)||1,extra=.72*broken.GATE;
      next.targetX=(next.targetX??a.x)+(dx/mag)*extra;
      next.targetY=(next.targetY??a.y)+(dy/mag)*extra*.72;
      state.widened++;
    }

    const enemy=baseSpawnThreat(gameArg,next);
    if(enemy){
      if(broken.GATE>0)enemy.threatImpactRadius=Math.max(.68,(enemy.threatImpactRadius||1.04)-broken.GATE*.11);
      if(broken.RESONATOR>0){enemy.speed*=1-broken.RESONATOR*.09;state.slowed++;}
      enemy.bossConsequence={emitters:broken.EMITTER,gates:broken.GATE,resonators:broken.RESONATOR};
    }
    return enemy;
  };

  const attach=(boss)=>{
    if(!boss||boss===state.boss)return;state.boss=boss;state.fracture=makeFractureField(boss);state.lastBroken={EMITTER:0,GATE:0,RESONATOR:0};
  };

  const announceChanges=(broken)=>{
    for(const role of ['EMITTER','GATE','RESONATOR']){
      if(broken[role]>state.lastBroken[role]){
        const text=role==='EMITTER'?'EMITTER DOWN // BARRAGE WEAKENED':role==='GATE'?'GATE DOWN // SAFE VECTOR WIDENED':'RESONATOR DOWN // SIGNAL DESTABILIZED';
        game.showCallout(text,.96);game.world.pulse?.(1.15);
      }
    }
    state.lastBroken={...broken};
  };

  const tick=()=>{
    const boss=game.boss;
    if(boss&&!boss.dead){
      attach(boss);const broken=brokenCounts();announceChanges(broken);
      const n=clamp(broken.RESONATOR/4,0,1),fracture=state.fracture;
      if(fracture){
        fracture.lines.visible=n>0;fracture.lines.rotation.z+=.002+.012*n;fracture.lines.rotation.y=Math.sin(game.time*.7)*.18*n;
        fracture.mat.opacity=n*(.12+.14*(.5+.5*Math.sin(game.time*128/60*TAU*2)));
        fracture.lines.scale.setScalar(1+Math.sin(game.time*2.4)*.035*n);
      }
      if(n>0){
        boss.group.position.x=Math.sin(game.time*7.1)*.08*n;boss.group.position.y=Math.cos(game.time*5.7)*.06*n;
        boss.rings?.forEach((r,i)=>{r.material.opacity*=1-(n*.08*((i+Math.floor(game.time*10))%3===0?1:0));});
      }else{boss.group.position.x=0;boss.group.position.y=0;}
    }
    requestAnimationFrame(tick);
  };tick();

  window.__pulseBossConsequences={state,brokenCounts,stats:()=>({patched:!!state.boss,broken:brokenCounts(),suppressed:state.suppressed,widened:state.widened,slowed:state.slowed,corePressurePaused:!!vulnerability.state.exposed,patterns:bossDirector.stats().lastPattern})};
}

init();
