import * as THREE from 'three';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches||!!window.__pulseSettings?.state?.comfort;
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent&&window.__pulseAreaEnemyAttacks&&window.__pulseEnemyMotionRigs?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});
const AREA_NAMES=['GRID CHARGE','MIRROR OPEN','HELIX WIND','BRANCH RECOIL','CHOIR COUNT'];
const WINDUP=[.12,.18,.22,.16,.24];

waitFor().then(game=>{
  if(game.__enemyAttackAnticipationInstalled)return;game.__enemyAttackAnticipationInstalled=true;
  const active=new Set();let armed=0,launched=0,lastArea=1,lastName='';
  const area=()=>clamp((window.__pulseCampaign?.state?.selected||1)-1,0,4);
  const now=()=>performance.now()/1000;

  function nearestSource(threat){
    if(!threat?.group)return null;
    let best=null,bestD=Infinity;
    for(const e of game.enemies||[]){
      if(e===threat||e.dead||e.type==='danger'||e.type==='rupture'||!e.group||!e.__fusionModel)continue;
      const d=e.group.position.distanceToSquared(threat.group.position);
      if(d<bestD){bestD=d;best=e;}
    }
    return bestD<16?best:null;
  }

  function capture(source,a,duration){
    if(!source?.__fusionModel)return null;
    const modules=source.__fusionModel.children.filter(c=>c.name==='rez-volume-model');if(!modules.length)return null;
    const state={source,area:a,duration,start:now(),modules,base:modules.map(m=>m.scale.clone()),modelRotZ:source.__fusionModel.rotation.z,progress:0,name:AREA_NAMES[a]};
    source.__attackAnticipation=state;return state;
  }

  function pose(state,p){
    const motion=reduced()?.38:1,w=Math.sin(clamp(p,0,1)*Math.PI*.5)*motion,a=state.area;
    state.progress=w;
    state.modules.forEach((m,i)=>{
      const b=state.base[i];m.scale.copy(b);
      const role=m.userData.variantRole||'';
      if(a===0){
        if(role==='bus'||i>0){m.scale.x=b.x*(1-.14*w);m.scale.y=b.y*(1+.09*w);m.scale.z=b.z*(1+.04*w);}
      }else if(a===1){
        if(role==='mirror-wing'){m.scale.x=b.x*(1+.24*w);m.scale.y=b.y*(1+.08*w);m.scale.z=b.z*(1-.05*w);}else if(role==='spire')m.scale.y=b.y*(1+.12*w);
      }else if(a===2){
        const voice=.55+.45*Math.sin(i*1.7+p*Math.PI);m.scale.x=b.x*(1+.07*w*voice);m.scale.y=b.y*(1-.04*w*voice);m.scale.z=b.z*(1+.16*w*voice);
      }else if(a===3){
        if(role==='branch'){m.scale.x=b.x*(1-.07*w);m.scale.y=b.y*(1+.2*w);m.scale.z=b.z*(1-.05*w);}else if(role==='seed')m.scale.set(b.x*(1+.06*w),b.y*(1+.06*w),b.z*(1+.06*w));
      }else{
        if(role==='choir-pod'){const voice=i%4,gate=clamp(p*4-voice*.55,0,1),pulse=Math.sin(gate*Math.PI*.5)*w;m.scale.set(b.x*(1+.12*pulse),b.y*(1+.22*pulse),b.z*(1+.12*pulse));}
        else if(role==='lancet')m.scale.y=b.y*(1+.08*w);
      }
    });
    if(a===2)state.source.__fusionModel.rotation.z=state.modelRotZ+w*.09;
  }

  function restore(state){
    if(!state)return;
    state.modules.forEach((m,i)=>m.scale.copy(state.base[i]));
    if(state.source?.__fusionModel)state.source.__fusionModel.rotation.z=state.modelRotZ;
    if(state.source?.__attackAnticipation===state)delete state.source.__attackAnticipation;
  }

  function arm(threat){
    if(!threat||threat.dead||!threat.__areaAttackSignature||threat.__attackAnticipationArmed)return;
    const a=area(),source=nearestSource(threat),duration=WINDUP[a]||.16;
    if(!source)return;
    const ownsPose=!source.__attackAnticipation,poseState=ownsPose?capture(source,a,duration):null;
    if(ownsPose&&!poseState)return;
    const originalSpeed=threat.speed||24;
    threat.__attackAnticipationArmed=true;threat.__attackSource=source;threat.__attackWindup=duration;threat.__attackOriginalSpeed=originalSpeed;
    threat.speed=0;if(threat.group)threat.group.visible=false;
    const item={threat,source,pose:poseState,start:now(),duration,originalSpeed,area:a,ownsPose};active.add(item);armed++;lastArea=a+1;lastName=AREA_NAMES[a];
  }

  const baseSpawn=game.spawnEnemy.bind(game);
  game.spawnEnemy=(type,pos,phase=0)=>{
    const before=game.enemies.length,result=baseSpawn(type,pos,phase),enemy=result||game.enemies[before]||game.enemies.at(-1);
    if(type==='danger'&&enemy)queueMicrotask(()=>arm(enemy));
    return result||enemy;
  };

  function tick(){
    const t=now();
    for(const item of [...active]){
      const {threat,source,pose:poseState,start,duration,originalSpeed,ownsPose}=item;
      if(!threat||threat.dead||!source||source.dead){if(ownsPose)restore(poseState);active.delete(item);continue;}
      const p=clamp((t-start)/Math.max(.001,duration),0,1);if(ownsPose&&poseState)pose(poseState,p);
      if(p>=1){
        if(ownsPose)restore(poseState);threat.speed=originalSpeed;if(threat.group)threat.group.visible=true;threat.__attackLaunched=true;threat.__attackLaunchTime=t;active.delete(item);launched++;
        game.haptic?.(reduced()?4:7);
      }
    }
    requestAnimationFrame(tick);
  }requestAnimationFrame(tick);

  window.__pulseEnemyAttackAnticipation={
    areaNames:AREA_NAMES,windups:WINDUP,arm,
    stats:()=>({active:active.size,armed,launched,lastArea,lastName,states:[...active].map(x=>({area:x.area+1,name:AREA_NAMES[x.area],progress:Number((x.pose?.progress||0).toFixed(3)),visible:x.threat.group?.visible!==false,speed:x.threat.speed||0,ownsPose:x.ownsPose}))})
  };
});
