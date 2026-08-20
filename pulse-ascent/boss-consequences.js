import * as THREE from 'three';
import {clamp,TAU} from './util.js';

const waitFor=(getter)=>new Promise(resolve=>{const tick=()=>{const value=getter();value?resolve(value):requestAnimationFrame(tick)};tick()});
const BOSS_TAGS=new Set(['twin-cut','shift-gate','resonance-wall']);
const ROLE_FOR_TAG={'twin-cut':'EMITTER','shift-gate':'GATE','resonance-wall':'RESONATOR'};

function makeFractureField(boss){
  const count=18,arr=new Float32Array(count*2*3);
  for(let i=0;i<count;i++){
    const a=i/count*TAU,r=1.9+(i%4)*.42,j=i*6;
    arr[j]=Math.cos(a)*r;arr[j+1]=Math.sin(a)*r*.55;arr[j+2]=Math.sin(a*2)*.35;
    arr[j+3]=Math.cos(a+.15)*(r+.55);arr[j+4]=Math.sin(a+.15)*(r+.55)*.55;arr[j+5]=Math.sin(a*2+.4)*.55;
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(arr,3));
  const mat=new THREE.LineBasicMaterial({color:0xb98cff,transparent:true,opacity:0,blending:THREE.NormalBlending,depthWrite:false});
  const lines=new THREE.LineSegments(geo,mat);lines.visible=false;boss.group.add(lines);
  return {lines,mat,geo};
}

async function init(){
  const game=await waitFor(()=>window.__pulseAscent);
  const director=await waitFor(()=>window.__pulseDirector);
  const bossDirector=await waitFor(()=>window.__pulseBossDirector);
  const vulnerability=await waitFor(()=>window.__pulseBossVulnerability);
  if(game.__bossConsequencesInstalled)return;game.__bossConsequencesInstalled=true;

  const state={
    boss:null,fracture:null,spawnSerial:0,suppressed:0,widened:0,slowed:0,misfires:0,audioCues:0,
    lastBroken:{EMITTER:0,GATE:0,RESONATOR:0},lastBand:0,lastAudioBar:-1,stability:1,roleSuppressed:{EMITTER:0,GATE:0,RESONATOR:0}
  };
  const brokenCounts=()=>{
    const boss=game.boss;if(!boss)return {EMITTER:0,GATE:0,RESONATOR:0};
    const out={EMITTER:0,GATE:0,RESONATOR:0};
    for(const p of boss.parts||[])if(p.dead&&out[p.role]!==undefined)out[p.role]++;
    return out;
  };
  const healthDamage=()=>game.boss?clamp(1-game.boss.healthRatio(),0,1):0;
  const stabilityFor=(broken,damage)=>clamp(1-damage*.62-broken.EMITTER*.07-broken.GATE*.055-broken.RESONATOR*.035,.08,1);

  const instabilityTone=(kind='damage',severity=.5)=>{
    const a=game.audio;if(!a?.ctx||a.ctx.state==='suspended')return;
    const t=a.ctx.currentTime+.006,s=clamp(severity,0,1);state.audioCues++;
    if(kind==='EMITTER'){
      a.osc?.('square',a.midi?.(31)??49,t,.12,.015+s*.012,a.fx,-14,-.35);
      a.osc?.('sine',a.midi?.(38)??73,t+.045,.16,.012+s*.01,a.fx,7,.3);
    }else if(kind==='GATE'){
      a.osc?.('triangle',a.midi?.(43)??98,t,.19,.014+s*.011,a.fx,-18,.25);
      a.osc?.('triangle',a.midi?.(36)??65,t+.035,.17,.011+s*.009,a.fx,12,-.25);
    }else if(kind==='RESONATOR'){
      a.osc?.('sawtooth',a.midi?.(29)??43,t,.2,.012+s*.012,a.fx,-24,0);
      a.riserTick?.(t,.025+s*.025);
    }else{
      const root=34-Math.round(s*7);a.osc?.('sawtooth',a.midi?.(root)??55,t,.1+s*.08,.008+s*.012,a.fx,-20,0);
    }
  };

  const shouldRoleMisfire=(tag,broken,damage)=>{
    const role=ROLE_FOR_TAG[tag];if(!role)return false;
    const count=broken[role]||0;
    if(count>0){
      const divisor=count>=2?2:4;
      if(state.spawnSerial%divisor===0){state.roleSuppressed[role]++;return true;}
    }
    if(damage>.66&&state.spawnSerial%5===0){state.misfires++;return true;}
    return false;
  };

  const baseSpawnThreat=director.spawnThreat.bind(director);
  director.spawnThreat=(gameArg,cfg={})=>{
    const isBoss=BOSS_TAGS.has(cfg.tag);
    if(!isBoss)return baseSpawnThreat(gameArg,cfg);
    state.spawnSerial++;
    const broken=brokenCounts(),damage=healthDamage();

    // Core exposure is a reward window: stop boss pressure so the player can capitalize.
    if(vulnerability.state.exposed){state.suppressed++;return null;}

    // Damage now disables the attack system that the destroyed component actually powers.
    // Emitters break Twin Cut output, Gates corrupt Shift Gate targeting, Resonators destabilize Resonance Wall.
    if(shouldRoleMisfire(cfg.tag,broken,damage)){
      state.suppressed++;
      if((state.suppressed%3)===1&&damage>.45){game.showCallout?.('BOSS SIGNAL MISFIRE',.72);instabilityTone(ROLE_FOR_TAG[cfg.tag],damage);}
      return null;
    }

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
      if(damage>.58){
        const jitter=((state.spawnSerial%3)-1)*.045;enemy.speed*=1+jitter;
        enemy.bossInstability={damage,stability:state.stability,misfireRisk:true};
      }
      enemy.bossConsequence={emitters:broken.EMITTER,gates:broken.GATE,resonators:broken.RESONATOR};
    }
    return enemy;
  };

  const attach=(boss)=>{
    if(!boss||boss===state.boss)return;state.boss=boss;state.fracture=makeFractureField(boss);state.lastBroken={EMITTER:0,GATE:0,RESONATOR:0};state.lastBand=0;state.lastAudioBar=-1;state.stability=1;
  };

  const announceChanges=(broken)=>{
    for(const role of ['EMITTER','GATE','RESONATOR']){
      if(broken[role]>state.lastBroken[role]){
        const text=role==='EMITTER'?'EMITTER DOWN // TWIN CUT MISFIRING':role==='GATE'?'GATE DOWN // SAFE VECTOR WIDENED':'RESONATOR DOWN // WALL SIGNAL UNSTABLE';
        game.showCallout(text,.96);game.world.pulse?.(1.15);instabilityTone(role,.65+.08*broken[role]);
      }
    }
    state.lastBroken={...broken};
  };

  const tick=()=>{
    const boss=game.boss;
    if(boss&&!boss.dead){
      attach(boss);const broken=brokenCounts(),damage=healthDamage();announceChanges(broken);state.stability=stabilityFor(broken,damage);
      const n=clamp(broken.RESONATOR/4,0,1),fracture=state.fracture;
      if(fracture){
        fracture.lines.visible=n>0||damage>.52;fracture.lines.rotation.z+=.002+.012*n+.003*damage;fracture.lines.rotation.y=Math.sin(game.time*.7)*(.18*n+.05*damage);
        fracture.mat.opacity=clamp(n*(.1+.12*(.5+.5*Math.sin(game.time*128/60*TAU*2)))+Math.max(0,damage-.5)*.18,0,.32);
        fracture.lines.scale.setScalar(1+Math.sin(game.time*2.4)*(.035*n+.012*damage));
      }
      if(n>0||damage>.62){
        const shake=clamp(n*.08+Math.max(0,damage-.62)*.16,0,.13);
        boss.group.position.x=Math.sin(game.time*(7.1+damage*3))*shake;boss.group.position.y=Math.cos(game.time*(5.7+damage*2))*shake*.75;
        boss.rings?.forEach((r,i)=>{if((i+Math.floor(game.time*10))%3===0)r.material.opacity*=1-clamp(n*.08+damage*.025,0,.12);});
      }else{boss.group.position.x=0;boss.group.position.y=0;}

      // Progressive mechanical instability enters the soundtrack only after meaningful damage.
      const band=damage>.76?3:damage>.5?2:damage>.28?1:0;
      if(band>state.lastBand){state.lastBand=band;instabilityTone('damage',damage);game.showCallout?.(band===3?'CORE SIGNAL CRITICAL':band===2?'BOSS FRAME DESTABILIZING':'ARMOR SIGNAL FRACTURED',.78);}
      const bar=game.bar??-1;
      if(damage>.42&&bar>=0&&bar!==state.lastAudioBar&&bar%2===0){state.lastAudioBar=bar;instabilityTone('damage',damage*.72);}
    }
    requestAnimationFrame(tick);
  };tick();

  window.__pulseBossConsequences={
    state,brokenCounts,stabilityFor,
    stats:()=>({patched:!!state.boss,broken:brokenCounts(),suppressed:state.suppressed,roleSuppressed:{...state.roleSuppressed},widened:state.widened,slowed:state.slowed,misfires:state.misfires,audioCues:state.audioCues,stability:Number(state.stability.toFixed(3)),corePressurePaused:!!vulnerability.state.exposed,patterns:bossDirector.stats().lastPattern,normal:state.fracture?.mat?.blending===THREE.NormalBlending})
  };
}

init();
