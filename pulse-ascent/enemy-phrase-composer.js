import * as THREE from 'three';
import './phrase-memory.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent&&window.__pulseAreaEnemyAttacks&&window.__pulseEnemyAttackAnticipation&&window.__pulsePhraseMemory?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});

const PROFILES=[
  {name:'BUS MOTIF',steps:[6,10,14],notes:[0,7,12],color:0x58edff},
  {name:'MIRROR PHRASE',steps:[6,10,14],notes:[0,5,12],color:0xffaa55},
  {name:'TIDAL PHRASE',steps:[4,8,12],notes:[0,3,7],color:0x68ffe1},
  {name:'BRANCH PHRASE',steps:[6,10,14],notes:[0,5,9],color:0xa5ff72},
  {name:'SERAPH PHRASE',steps:[4,8,12],notes:[0,7,12],color:0xcad0ff}
];

waitFor().then(game=>{
  if(game.__enemyPhraseComposerInstalled)return;game.__enemyPhraseComposerInstalled=true;
  const memory=window.__pulsePhraseMemory;
  const state={phrases:0,steps:0,responseShots:0,resolutions:0,lastArea:1,lastName:'',lastVoice:0,lastStep:-1,lastMutation:'',mutatedPhrases:0};
  const mobile=()=>innerWidth<760||matchMedia('(pointer: coarse)').matches;
  const area=()=>clamp((window.__pulseCampaign?.state?.selected||1)-1,0,4);
  const phase=()=>clamp(game.section||0,0,3);
  const unavailable=()=>!game.running||!!window.__pulseOnboarding?.state?.active||!!window.__pulseDirectAscent?.state?.active||!!game.boss||(game.bar||0)<16||phase()<1;
  const phraseStep=step=>!unavailable()&&PROFILES[area()].steps.includes(step%16);
  const dangerCount=()=>game.enemies.filter(e=>!e.dead&&e.type==='danger').length;
  const maxDanger=()=>mobile()?5:7;
  const sources=()=>game.enemies.filter(e=>!e.dead&&e.type!=='danger'&&e.type!=='rupture'&&e.group?.position?.z<-7&&e.group.position.z>-52);
  const sourceBySide=(sign,pool=sources())=>{const side=pool.filter(e=>sign<0?e.group.position.x<=0:e.group.position.x>=0),candidates=side.length?side:pool;return [...candidates].sort((a,b)=>Math.abs(a.group.position.z+24)-Math.abs(b.group.position.z+24))[0]||null;};
  const activeMutation=a=>memory.current(a);

  function tone(a,voice,time){
    const audio=game.audio,ctx=audio?.ctx;if(!ctx)return;
    const p=PROFILES[a],mutation=activeMutation(a),notes=mutation?.notes||p.notes,root=(audio.rootMidi||43)+24,at=Number.isFinite(time)?Math.max(ctx.currentTime+.006,time):ctx.currentTime+.008;
    const note=notes[voice]??0,pan=(voice-1)*.32*(mutation?.responseSide||1),type=['square','sine','triangle','triangle','sine'][a];
    audio.osc?.(type,audio.midi(root+note),at,.075,voice===2?.012:.0085,audio.fx,0,pan);
    if(voice===2&&a===4){
      audio.osc?.('triangle',audio.midi(root+note+7),at,.1,.0065,audio.fx,0,.34);
      audio.osc?.('sine',audio.midi(root+note-5),at,.1,.006,audio.fx,0,-.34);
    }
  }

  function telegraph(source,color){
    if(source?.core?.material){source.core.material.color.set(color);source.core.scale.multiplyScalar(1.18);}
    if(source?.halo?.material)source.halo.material.opacity=Math.max(source.halo.material.opacity||0,.42);
  }

  function spawnResponse(source,{targetX,targetY,speed=23.5,radius=.78,color,mutation=null}){
    if(!source||source.dead||dangerCount()>=maxDanger())return null;
    telegraph(source,color);
    const p=source.group.position.clone();p.z-=1.2;
    const before=game.enemies.length,result=game.spawnEnemy('danger',p,Math.max(1,phase()));
    const threat=result||game.enemies[before]||[...game.enemies].reverse().find(e=>e.type==='danger'&&!e.__enemyPhraseResponse);
    if(!threat)return null;
    threat.__areaAttackSignature=true;threat.__enemyPhraseResponse=true;threat.__enemyPhraseName=mutation?.name||PROFILES[area()].name;threat.__phraseMutation=mutation?.name||'';
    threat.speed=speed;threat.threatImpactRadius=radius;
    if(Number.isFinite(targetX))threat.threatTargetX=targetX;
    if(Number.isFinite(targetY))threat.threatTargetY=targetY;
    for(const part of [threat.mesh,threat.warning,threat.halo])if(part?.material){part.material.color.set(color);part.material.blending=THREE.NormalBlending;}
    if(threat.mesh?.material)threat.mesh.material.opacity=.72;
    if(threat.warning?.material)threat.warning.material.opacity=.58;
    if(threat.halo?.material)threat.halo.material.opacity=.34;
    state.responseShots++;return threat;
  }

  function responseShot(a,pool,avatar,p){
    if(dangerCount()>=maxDanger()||!pool.length)return false;
    const mutation=activeMutation(a),side=mutation?.responseSide||1,offset=mutation?.responseOffset||0;
    if(a===0){const src=sourceBySide(side,pool);return !!spawnResponse(src,{targetX:avatar.x+.82*side+offset,targetY:avatar.y-.24,speed:23.4+p*.55,radius:.8,color:PROFILES[a].color,mutation});}
    if(a===1){const src=sourceBySide(side,pool);return !!spawnResponse(src,{targetX:avatar.x-.78*side+offset,targetY:avatar.y-.3,speed:23.6+p*.6,radius:.8,color:PROFILES[a].color,mutation});}
    if(a===2){const src=pool[(state.phrases*2+1)%pool.length];return !!spawnResponse(src,{targetX:avatar.x+.12*side+offset,targetY:avatar.y,speed:22.2+p*.52,radius:.77,color:PROFILES[a].color,mutation});}
    if(a===3){const src=pool[(state.phrases+1)%pool.length],spread=(1.15+p*.14)*side;return !!spawnResponse(src,{targetX:avatar.x+spread+offset,targetY:avatar.y-.36,speed:23.6+p*.58,radius:.76,color:PROFILES[a].color,mutation});}
    const src=sourceBySide(side,pool);return !!spawnResponse(src,{targetX:avatar.x+.92*side+offset,targetY:avatar.y-.32,speed:24+p*.58,radius:.75,color:PROFILES[a].color,mutation});
  }

  function playStep(step,time){
    if(!phraseStep(step))return false;
    const a=area(),profile=PROFILES[a],s=step%16,voice=profile.steps.indexOf(s);if(voice<0)return false;
    const pool=sources();if(!pool.length)return false;
    if(voice===0){
      state.phrases++;
      const mutation=memory.begin(a);state.lastMutation=mutation?.name||'';if(mutation)state.mutatedPhrases++;
    }
    const mutation=activeMutation(a);
    tone(a,voice,time);
    let fired=true;
    if(voice===1){
      const baseAlreadyOwnsMiddle=(a===2&&phase()>=3&&!mutation);
      fired=baseAlreadyOwnsMiddle||responseShot(a,pool,game.world.avatar.position,phase());
    }
    if(!fired)return false;
    state.steps++;state.lastArea=a+1;state.lastName=mutation?.name||profile.name;state.lastVoice=voice+1;state.lastStep=s;if(voice===2)state.resolutions++;
    dispatchEvent(new CustomEvent('pulse:enemy-phrase-step',{detail:{area:a+1,name:mutation?.name||profile.name,baseName:profile.name,mutation:mutation?.name||'',voice:voice+1,step:s,resolution:voice===2,response:voice===1,mutated:!!mutation}}));
    if(voice===2)memory.end(a);
    return true;
  }

  const baseOnStep=game.onStep.bind(game);
  game.onStep=(step,time)=>{baseOnStep(step,time);playStep(step,time);};

  window.__pulseEnemyPhraseComposer={
    profiles:PROFILES,phraseStep,playStep,
    stats:()=>({area:area()+1,name:PROFILES[area()].name,phrases:state.phrases,steps:state.steps,responseShots:state.responseShots,resolutions:state.resolutions,lastArea:state.lastArea,lastName:state.lastName,lastVoice:state.lastVoice,lastStep:state.lastStep,lastMutation:state.lastMutation,mutatedPhrases:state.mutatedPhrases,phraseSteps:[...PROFILES[area()].steps],danger:dangerCount(),cap:maxDanger(),memory:memory.stats()})
  };
});
