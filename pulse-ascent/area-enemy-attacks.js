import * as THREE from 'three';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent&&window.__pulseDodge&&window.__pulseAreaCombatGrammar?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});

const ATTACK_NAMES=[
  ['GRID PING','BUS CROSS','VECTOR CUT','ASCENT BURST'],
  ['PRISM TAP','MIRROR CROSSFIRE','REFRACTION FAN','ARCHON PAIR'],
  ['TIDAL SHOT','DELAYED WAVE','ABYSS SWELL','BLOOM RIPPLE'],
  ['SEED DART','SYNAPSE SPLIT','BRANCH FORK','ROOT PINCER'],
  ['CHOIR NOTE','RHYTHM DYAD','ROSE TRIAD','SERAPH CHORD']
];
const AREA_COLORS=[0x58edff,0xffaa55,0x68ffe1,0xa5ff72,0xcad0ff];

waitFor().then(game=>{
  if(game.__areaEnemyAttacksInstalled)return;
  game.__areaEnemyAttacksInstalled=true;

  const state={inBaseStep:false,patterns:0,spawned:0,suppressedGeneric:0,suppressedFormation:0,lastAttack:'',lastArea:1,lastPhase:1};
  const mobile=()=>innerWidth<760||matchMedia('(pointer: coarse)').matches;
  const area=()=>clamp((window.__pulseCampaign?.state?.selected||1)-1,0,4);
  const phase=()=>clamp(game.section||0,0,3);
  const unavailable=()=>!game.running||!!window.__pulseOnboarding?.state?.active||!!window.__pulseDirectAscent?.state?.active||!!game.boss||(game.bar||0)<16||phase()<1;
  const dangerCount=()=>game.enemies.filter(e=>!e.dead&&e.type==='danger').length;
  const maxDanger=()=>mobile()?5:7;

  function sources(){
    return game.enemies.filter(e=>!e.dead&&e.type!=='danger'&&e.type!=='rupture'&&e.group?.position?.z<-7&&e.group.position.z>-52);
  }
  function sourceBySide(sign,pool=sources()){
    const side=pool.filter(e=>sign<0?e.group.position.x<=0:e.group.position.x>=0);
    const candidates=side.length?side:pool;
    return candidates.sort((a,b)=>Math.abs(a.group.position.z+24)-Math.abs(b.group.position.z+24))[0]||null;
  }
  function telegraph(source,color){
    if(!source)return;
    if(source.core?.material){source.core.material.color.set(color);source.core.scale.multiplyScalar(1.45);}
    if(source.halo?.material)source.halo.material.opacity=Math.max(source.halo.material.opacity||0,.56);
  }
  function attackTone(index,time=game.audio?.ctx?.currentTime){
    if(!game.audio?.ctx||time===undefined)return;
    const root=(game.audio.rootMidi||43)+[12,19,7,14,24][index];
    const wave=['square','sine','triangle','square','sine'][index];
    game.audio.osc?.(wave,game.audio.midi(root),time,.07,.012,game.audio.fx,0,-.22);
    if(index===4)game.audio.osc?.('triangle',game.audio.midi(root+7),time+.012,.09,.009,game.audio.fx,0,.22);
  }
  function spawnThreat(source,options={}){
    if(!source||dangerCount()>=maxDanger())return null;
    const tuned=window.__pulseFormationCombatState?.adjustThreat?.(source,options)||options;
    if(tuned.suppressed){state.suppressedFormation++;return null;}
    const {targetX,targetY,speed=24,radius=.92,color=0xff5274,delay=0}=tuned;
    const launch=()=>{
      if(!game.running||source.dead||dangerCount()>=maxDanger())return null;
      const p=source.group.position.clone();p.z-=1.2;
      const before=game.enemies.length,result=game.spawnEnemy('danger',p,Math.max(1,phase()));
      const threat=result||game.enemies[before]||[...game.enemies].reverse().find(e=>e.type==='danger'&&!e.__areaAttackSignature);
      if(!threat)return null;
      threat.__areaAttackSignature=true;
      threat.__formationAttackState=tuned.formationState||'';
      threat.speed=speed;
      threat.threatImpactRadius=radius;
      if(Number.isFinite(targetX))threat.threatTargetX=targetX;
      if(Number.isFinite(targetY))threat.threatTargetY=targetY;
      if(threat.mesh?.material){threat.mesh.material.color.set(color);threat.mesh.material.blending=THREE.NormalBlending;threat.mesh.material.opacity=.76;}
      if(threat.warning?.material){threat.warning.material.color.set(color);threat.warning.material.blending=THREE.NormalBlending;threat.warning.material.opacity=.62;}
      if(threat.halo?.material){threat.halo.material.color.set(color);threat.halo.material.blending=THREE.NormalBlending;threat.halo.material.opacity=.38;}
      state.spawned++;
      return threat;
    };
    if(delay>0){setTimeout(launch,delay*1000);return true;}
    return launch();
  }
  function mark(name,a,p){
    state.patterns++;state.lastAttack=name;state.lastArea=a+1;state.lastPhase=p+1;
    game.audio.dangerWarning?.();attackTone(a);
  }

  function signalAttack(p){
    const pool=sources();if(!pool.length)return false;
    const avatar=game.world.avatar.position,color=AREA_COLORS[0],name=ATTACK_NAMES[0][p];
    if(p===1){
      const src=pool[(state.patterns+pool.length)%pool.length];telegraph(src,color);spawnThreat(src,{targetX:avatar.x+(state.patterns%2?1.15:-1.15),targetY:avatar.y,speed:23,radius:.86,color});
    }else if(p===2){
      for(const sign of [-1,1]){const src=sourceBySide(sign,pool);telegraph(src,color);spawnThreat(src,{targetX:avatar.x-sign*.72,targetY:avatar.y+sign*.32,speed:24.5,radius:.84,color});}
    }else{
      const count=mobile()?2:3;for(let i=0;i<count;i++){const src=pool[(i+state.patterns)%pool.length];telegraph(src,color);spawnThreat(src,{targetX:avatar.x+(i-(count-1)/2)*1.35,targetY:avatar.y+(i%2?.45:-.35),speed:25.5,radius:.82,color,delay:i*.055});}
    }
    mark(name,0,p);return true;
  }

  function glassAttack(p){
    const pool=sources();if(pool.length<1)return false;
    const avatar=game.world.avatar.position,color=AREA_COLORS[1],name=ATTACK_NAMES[1][p];
    const left=sourceBySide(-1,pool),right=sourceBySide(1,pool);
    // MIRROR CROSSFIRE: paired enemies intentionally cross their aim lanes. A leader
    // break temporarily desynchronizes this through formation-combat-state.
    for(const [src,sign] of [[left,-1],[right,1]]){
      if(!src)continue;telegraph(src,color);spawnThreat(src,{targetX:avatar.x-sign*(p>=2?.95:.65),targetY:avatar.y+sign*.28,speed:23.5+p*.7,radius:.84,color,delay:sign>0?.045:0});
    }
    if(p>=3&&!mobile()&&pool.length>2){const src=pool[Math.floor(pool.length/2)];telegraph(src,color);spawnThreat(src,{targetX:avatar.x,targetY:avatar.y+.75,speed:25.5,radius:.8,color,delay:.09});}
    mark(name,1,p);return true;
  }

  function chromaAttack(p){
    const pool=sources();if(!pool.length)return false;
    const avatar=game.world.avatar.position,color=AREA_COLORS[2],name=ATTACK_NAMES[2][p];
    const count=p>=3?(mobile()?2:3):2;
    // DELAYED WAVE: the same current arrives in readable, staggered pulses rather than a simultaneous wall.
    for(let i=0;i<count;i++){
      const src=pool[(state.patterns+i*2)%pool.length];telegraph(src,color);
      spawnThreat(src,{targetX:avatar.x+Math.sin((i+1)*1.7)*1.1,targetY:avatar.y+(i-(count-1)/2)*.72,speed:21.5+i*1.1+p*.55,radius:.8,color,delay:i*.12});
    }
    mark(name,2,p);return true;
  }

  function organicAttack(p){
    const pool=sources();if(!pool.length)return false;
    const avatar=game.world.avatar.position,color=AREA_COLORS[3],name=ATTACK_NAMES[3][p],src=pool[state.patterns%pool.length];telegraph(src,color);
    // BRANCH FORK: one enemy splits pressure around the player and leaves a deliberate center gap.
    const spread=p>=3?1.65:1.25;
    spawnThreat(src,{targetX:avatar.x-spread,targetY:avatar.y+.35,speed:23.2+p*.65,radius:.78,color});
    spawnThreat(src,{targetX:avatar.x+spread,targetY:avatar.y-.35,speed:23.2+p*.65,radius:.78,color,delay:.055});
    if(p>=3&&!mobile()){const second=pool[(state.patterns+2)%pool.length];telegraph(second,color);spawnThreat(second,{targetX:avatar.x,targetY:avatar.y+1.18,speed:25,radius:.76,color,delay:.11});}
    mark(name,3,p);return true;
  }

  function cathedralAttack(p){
    const pool=sources();if(!pool.length)return false;
    const avatar=game.world.avatar.position,color=AREA_COLORS[4],name=ATTACK_NAMES[4][p];
    // SERAPH CHORD: voices fire together on one musical event, with one readable rest lane.
    // CHORD REVOICE turns surviving formation voices into an arpeggio after a leader break.
    const count=p>=3?(mobile()?3:4):p>=2?3:2,rest=(state.patterns+p)%Math.max(3,count+1),spacing=1.18;
    for(let i=0;i<count+1;i++){
      if(i===rest)continue;
      const src=pool[(i+state.patterns)%pool.length];if(!src)continue;telegraph(src,color);
      const voice=i-count/2;spawnThreat(src,{targetX:avatar.x+voice*spacing,targetY:avatar.y+(i%2?.42:-.26),speed:24.2+p*.65,radius:.78,color,delay:(i%2)*.025});
      if(dangerCount()>=maxDanger())break;
    }
    mark(name,4,p);return true;
  }

  function trigger(step=6){
    if(unavailable()||dangerCount()>=maxDanger())return false;
    const a=area(),p=phase(),s=step%16;
    // Cadence is part of each Area's identity; later phases add pressure without becoming bullet spam.
    const active=a===2?(s===4||s===12||(p>=3&&s===8)):a===4?(s===4||s===12):s===6||s===14;
    if(!active)return false;
    return [signalAttack,glassAttack,chromaAttack,organicAttack,cathedralAttack][a](p);
  }

  const baseSpawn=game.spawnEnemy.bind(game);
  game.spawnEnemy=(type,pos,enemyPhase=0)=>{
    // Replace the old generic mid-level red shot with the authored Area attack grammar.
    if(type==='danger'&&state.inBaseStep&&!game.boss&&!window.__pulseDirectAscent?.state?.active&&(game.bar||0)>=16&&phase()>=1){state.suppressedGeneric++;return null;}
    return baseSpawn(type,pos,enemyPhase);
  };

  const baseOnStep=game.onStep.bind(game);
  game.onStep=(step,time)=>{
    state.inBaseStep=true;
    try{baseOnStep(step,time);}finally{state.inBaseStep=false;}
    trigger(step,time);
  };

  window.__pulseAreaEnemyAttacks={
    attacks:ATTACK_NAMES,
    trigger,
    stats:()=>({area:area()+1,phase:phase()+1,name:ATTACK_NAMES[area()]?.[phase()]||'',patterns:state.patterns,spawned:state.spawned,suppressedGeneric:state.suppressedGeneric,suppressedFormation:state.suppressedFormation,lastAttack:state.lastAttack,danger:dangerCount(),cap:maxDanger()})
  };
});

import('./threat-readability.js').catch(()=>{});
