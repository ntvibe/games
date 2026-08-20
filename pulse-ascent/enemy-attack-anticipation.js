import * as THREE from 'three';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches||!!window.__pulseSettings?.state?.comfort;
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent&&window.__pulseAreaEnemyAttacks&&window.__pulseEnemyMotionRigs?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});
const AREA_NAMES=['GRID CHARGE','MIRROR OPEN','HELIX WIND','BRANCH RECOIL','CHOIR COUNT'];
// Fallback seconds only when WebAudio is unavailable. Normal gameplay uses the musical grid below.
const WINDUP=[.12,.18,.22,.16,.24];
// Minimum sixteenth-note lead plus the musical boundary each Area resolves onto.
// Glass/Organic resolve from the usual off-beat attack step onto the next beat;
// Chroma winds across a measured subdivision; Cathedral counts a full four-voice beat.
const LEAD_STEPS=[1,2,3,2,4];
const RELEASE_GRID=[2,4,4,4,4];

waitFor().then(game=>{
  if(game.__enemyAttackAnticipationInstalled)return;game.__enemyAttackAnticipationInstalled=true;
  const active=new Set();let armed=0,launched=0,lastArea=1,lastName='',lastLaunchErrorMs=0,syncedLaunches=0;
  const area=()=>clamp((window.__pulseCampaign?.state?.selected||1)-1,0,4);
  const perfNow=()=>performance.now()/1000;

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

  function musicalWindow(a){
    const audio=game.audio,ctx=audio?.ctx,stepDur=audio?.stepDur;
    if(!ctx||!Number.isFinite(stepDur)||stepDur<=0)return null;
    const now=ctx.currentTime,anchor=Number.isFinite(audio.anchor)?audio.anchor:now;
    // Rounding is intentional: arm() runs immediately after an onStep spawn and should
    // treat that scheduled sixteenth as the current musical step, not skip one ahead.
    const currentStep=Math.max(0,Math.round((now-anchor)/stepDur));
    const minStep=currentStep+(LEAD_STEPS[a]||2),grid=RELEASE_GRID[a]||4;
    const targetStep=Math.ceil(minStep/grid)*grid,targetAudio=anchor+targetStep*stepDur;
    return{now,anchor,stepDur,currentStep,targetStep,targetAudio,duration:Math.max(.055,targetAudio-now)};
  }

  function scheduleCue(a,window){
    const audio=game.audio,ctx=audio?.ctx;if(!ctx||!window)return;
    const root=(audio.rootMidi||43)+24,step=window.stepDur,target=window.targetAudio;
    const play=(offset,n,type='sine',gain=.009,pan=0,dur=.06)=>{
      const t=target-offset*step;if(t<=ctx.currentTime+.006)return;
      audio.osc?.(type,audio.midi(root+n),t,dur,gain,audio.fx,0,pan);
    };
    if(a===0){
      play(2,0,'square',.007,-.25,.045);play(1,7,'square',.009,.25,.045);
    }else if(a===1){
      // Mirror wings open as two sixteenth-note voices and resolve together on the beat.
      play(2,0,'sine',.01,-.48,.075);play(1,7,'triangle',.01,.48,.075);
      audio.osc?.('sine',audio.midi(root+12),target,.08,.008,audio.fx,0,0);
    }else if(a===2){
      // A measured helix winding over three subdivisions.
      play(3,0,'sine',.007,-.45,.08);play(2,3,'triangle',.008,0,.08);play(1,7,'sine',.009,.45,.08);
    }else if(a===3){
      play(2,-5,'triangle',.009,-.25,.065);play(1,0,'square',.007,.25,.055);
    }else{
      // Four choir voices count through the beat before the chord attack resolves.
      const notes=[0,3,7,12];for(let i=0;i<4;i++)play(4-i,notes[i],i%2?'triangle':'sine',.0075,(i-1.5)*.28,.085);
      [0,7,12].forEach((n,i)=>audio.osc?.(i?'triangle':'sine',audio.midi(root+12+n),target,.11,.0065,audio.fx,0,(i-1)*.38));
    }
  }

  function capture(source,a,duration){
    if(!source?.__fusionModel)return null;
    const modules=source.__fusionModel.children.filter(c=>c.name==='rez-volume-model');if(!modules.length)return null;
    const state={source,area:a,duration,start:perfNow(),modules,base:modules.map(m=>m.scale.clone()),modelRotZ:source.__fusionModel.rotation.z,progress:0,name:AREA_NAMES[a]};
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
    const a=area(),source=nearestSource(threat),music=musicalWindow(a),duration=music?.duration??WINDUP[a]??.16;
    if(!source)return;
    const ownsPose=!source.__attackAnticipation,poseState=ownsPose?capture(source,a,duration):null;
    if(ownsPose&&!poseState)return;
    const originalSpeed=threat.speed||24,startPerf=perfNow();
    threat.__attackAnticipationArmed=true;threat.__attackSource=source;threat.__attackWindup=duration;threat.__attackOriginalSpeed=originalSpeed;
    threat.__attackGridSynced=!!music;threat.__attackTargetStep=music?.targetStep??-1;threat.__attackTargetAudio=music?.targetAudio??0;
    threat.speed=0;if(threat.group)threat.group.visible=false;
    const item={threat,source,pose:poseState,startPerf,duration,originalSpeed,area:a,ownsPose,music};active.add(item);armed++;lastArea=a+1;lastName=AREA_NAMES[a];
    if(music)scheduleCue(a,music);
  }

  const baseSpawn=game.spawnEnemy.bind(game);
  game.spawnEnemy=(type,pos,phase=0)=>{
    const before=game.enemies.length,result=baseSpawn(type,pos,phase),enemy=result||game.enemies[before]||game.enemies.at(-1);
    if(type==='danger'&&enemy)queueMicrotask(()=>arm(enemy));
    return result||enemy;
  };

  function tick(){
    const pNow=perfNow(),audioNow=game.audio?.ctx?.currentTime;
    for(const item of [...active]){
      const {threat,source,pose:poseState,startPerf,duration,originalSpeed,ownsPose,music}=item;
      if(!threat||threat.dead||!source||source.dead){if(ownsPose)restore(poseState);active.delete(item);continue;}
      const progress=music&&Number.isFinite(audioNow)?clamp(1-(music.targetAudio-audioNow)/Math.max(.001,music.duration),0,1):clamp((pNow-startPerf)/Math.max(.001,duration),0,1);
      if(ownsPose&&poseState)pose(poseState,progress);
      const due=music&&Number.isFinite(audioNow)?audioNow>=music.targetAudio-.002:progress>=1;
      if(due){
        if(ownsPose)restore(poseState);threat.speed=originalSpeed;if(threat.group)threat.group.visible=true;threat.__attackLaunched=true;threat.__attackLaunchTime=pNow;active.delete(item);launched++;
        if(music&&Number.isFinite(audioNow)){lastLaunchErrorMs=(audioNow-music.targetAudio)*1000;syncedLaunches++;threat.__attackLaunchErrorMs=lastLaunchErrorMs;}
        dispatchEvent(new CustomEvent('pulse:enemy-beat-launch',{detail:{area:item.area+1,name:AREA_NAMES[item.area],targetStep:music?.targetStep??-1,errorMs:lastLaunchErrorMs}}));
        game.haptic?.(reduced()?4:7);
      }
    }
    requestAnimationFrame(tick);
  }requestAnimationFrame(tick);

  window.__pulseEnemyAttackAnticipation={
    areaNames:AREA_NAMES,windups:WINDUP,leadSteps:LEAD_STEPS,releaseGrid:RELEASE_GRID,arm,
    stats:()=>({active:active.size,armed,launched,syncedLaunches,lastArea,lastName,lastLaunchErrorMs:Number(lastLaunchErrorMs.toFixed(2)),states:[...active].map(x=>({area:x.area+1,name:AREA_NAMES[x.area],progress:Number((x.pose?.progress||0).toFixed(3)),visible:x.threat.group?.visible!==false,speed:x.threat.speed||0,ownsPose:x.ownsPose,gridSynced:!!x.music,targetStep:x.music?.targetStep??-1,targetAudio:x.music?Number(x.music.targetAudio.toFixed(4)):0}))})
  };
});
