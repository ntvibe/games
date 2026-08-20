import * as THREE from 'three';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mobile=()=>innerWidth<760||innerHeight<520||matchMedia('(pointer: coarse)').matches;
const reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent&&window.__pulseEnemyReveal?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});
const HERO_SCORE={node:5,sentinel:4,tank:3,prism:2,drone:1};
const GRAMMARS=['CASCADE','MIRROR PHRASE','ORBIT BLOOM','BRANCH UNFOLD','CHORD ENTRY'];

waitFor().then(game=>{
  if(game.__formationRevealInstalled)return;game.__formationRevealInstalled=true;

  const state={nextId:1,open:null,formations:new Map(),directed:0,activated:0,completed:0,lastFormation:null};
  const area=()=>clamp((window.__pulseCampaign?.state?.selected||1)-1,0,4);
  const comfort=()=>!!window.__pulseSettings?.state?.comfort||reducedMotion();
  const onboarding=()=>!!window.__pulseOnboarding?.state?.active;
  const traversal=()=>!!window.__pulseTraversalSetpieces?.active;
  const direct=()=>!!window.__pulseDirectAscent?.state?.active;
  const eligible=e=>e&&!e.dead&&e.type!=='danger'&&e.type!=='rupture'&&e.group&&!onboarding()&&!traversal();

  function leaderScore(enemy){
    const hero=(enemy.elite?6:0)+(HERO_SCORE[enemy.type]||0);
    const center=1-clamp(Math.abs(enemy.group?.position?.x||0)/10,0,1);
    return hero*10+center;
  }

  function orderMembers(list,a){
    if(!list.length)return list;
    const leader=[...list].sort((x,y)=>leaderScore(y)-leaderScore(x))[0];
    const rest=list.filter(e=>e!==leader);
    if(a===1)rest.sort((x,y)=>Math.abs(x.group.position.x)-Math.abs(y.group.position.x)||x.group.position.x-y.group.position.x);
    else if(a===2)rest.sort((x,y)=>Math.atan2(x.group.position.y,x.group.position.x)-Math.atan2(y.group.position.y,y.group.position.x));
    else if(a===3)rest.sort((x,y)=>Math.abs(x.group.position.y)-Math.abs(y.group.position.y)||x.group.position.x-y.group.position.x);
    else if(a===4)rest.sort((x,y)=>y.group.position.y-x.group.position.y||Math.abs(x.group.position.x)-Math.abs(y.group.position.x));
    else rest.sort((x,y)=>Math.abs(x.group.position.x)-Math.abs(y.group.position.x)||x.group.position.x-y.group.position.x);
    return [leader,...rest];
  }

  function releaseToNormal(enemy){
    const r=enemy?.__revealState;if(!r||r.activated)return;
    if(enemy.__formationOriginalHold!==undefined)r.minHold=enemy.__formationOriginalHold;
    delete enemy.__formationId;delete enemy.__formationVoice;delete enemy.__formationOriginalHold;
  }

  function finalize(batch){
    if(!batch||batch.finalized)return;batch.finalized=true;
    const members=batch.members.filter(eligible);
    if(members.length<3){members.forEach(releaseToNormal);return;}
    const a=batch.area,ordered=orderMembers(members,a),id=batch.id;
    batch.members=ordered;batch.grammar=GRAMMARS[a];batch.started=false;batch.startStep=-1;batch.done=false;batch.voiceCount=Math.min(4,Math.max(3,Math.ceil(ordered.length/2)));
    ordered.forEach((enemy,i)=>{
      const r=enemy.__revealState;if(!r||r.activated)return;
      enemy.__formationId=id;enemy.__formationVoice=i===0?0:1+((i-1)%(batch.voiceCount-1));
      enemy.__formationOriginalHold=enemy.__formationOriginalHold??r.minHold;r.minHold=99;
    });
    state.formations.set(id,batch);state.lastFormation=batch;state.directed+=ordered.length;
    const focus=ordered.slice(0,mobile()?4:6);window.__pulseRailCamera?.frameEncounter?.(focus);
  }

  function queue(enemy){
    if(!eligible(enemy))return enemy;
    window.__pulseEnemyReveal?.directEnemy?.(enemy);
    const r=enemy.__revealState;if(!r||r.activated)return enemy;
    enemy.__formationOriginalHold=enemy.__formationOriginalHold??r.minHold;r.minHold=99;
    const now=performance.now();
    let batch=state.open;
    if(!batch||batch.finalized||now-batch.lastAt>90||batch.area!==area()){
      batch={id:state.nextId++,area:area(),members:[],createdAt:now,lastAt:now,finalized:false};state.open=batch;
      setTimeout(()=>finalize(batch),120);
    }
    batch.members.push(enemy);batch.lastAt=now;
    return enemy;
  }

  const baseSpawn=game.spawnEnemy.bind(game);
  game.spawnEnemy=(type,pos,phase=0)=>{
    const before=game.enemies.length,result=baseSpawn(type,pos,phase),enemy=result||game.enemies[before]||game.enemies.at(-1);
    queue(enemy);return result||enemy;
  };

  function activateVoice(batch,voice){
    if(!batch||batch.done)return;
    let count=0;
    for(const enemy of batch.members){
      if(enemy.dead||enemy.__formationVoice!==voice)continue;
      const r=enemy.__revealState;if(!r||r.activated)continue;
      window.__pulseEnemyReveal.activate(enemy,true);count++;state.activated++;
    }
    if(count&&voice===0){
      game.showCallout?.(`${batch.grammar} // FORMATION`,.82);
      game.haptic?.(mobile()?4:6);
    }
    const remaining=batch.members.some(e=>!e.dead&&e.__revealState&&!e.__revealState.activated);
    if(!remaining){batch.done=true;state.completed++;state.formations.delete(batch.id);}
  }

  function processStep(step){
    for(const batch of [...state.formations.values()]){
      if(batch.done)continue;
      const live=batch.members.filter(e=>!e.dead&&e.__revealState&&!e.__revealState.activated);
      if(!live.length){batch.done=true;state.formations.delete(batch.id);continue;}
      if(!batch.started){
        const ready=batch.members.every(e=>e.dead||!e.__revealState||e.__revealState.age>=Math.min(.18,e.__formationOriginalHold??.16)*.7);
        if(!ready||step%4!==0)continue;
        batch.started=true;batch.startStep=step;
      }
      const stride=direct()?1:(comfort()?2:1),elapsed=step-batch.startStep;
      if(elapsed<0||elapsed%stride!==0)continue;
      const voice=Math.floor(elapsed/stride);
      if(voice<batch.voiceCount)activateVoice(batch,voice);
      else for(const enemy of live)window.__pulseEnemyReveal.activate(enemy,true);
    }
  }
  game.audio?.onStep?.(processStep);

  const tick=()=>{
    for(const batch of state.formations.values()){
      if(batch.done)continue;
      for(const enemy of batch.members){
        if(enemy.dead||!enemy.__revealState||enemy.__revealState.activated)continue;
        // Give followers a subtle authored fan-out before activation without fighting their normal path.
        const voice=enemy.__formationVoice||0,lead=batch.members[0];
        if(voice>0&&lead?.group){
          const dir=Math.sign(enemy.group.position.x-lead.group.position.x)||((voice%2)?1:-1);
          const amount=(comfort()?.015:.035)*(1+voice*.12);
          enemy.group.position.x+=dir*amount;
        }
      }
    }
    requestAnimationFrame(tick);
  };requestAnimationFrame(tick);

  for(const enemy of game.enemies)queue(enemy);

  window.__pulseFormationReveal={
    queue,
    finalize:()=>finalize(state.open),
    processStep,
    stats:()=>({active:state.formations.size,directed:state.directed,activated:state.activated,completed:state.completed,lastGrammar:state.lastFormation?.grammar||'',lastSize:state.lastFormation?.members?.length||0,comfort:comfort(),direct:direct()})
  };
});
