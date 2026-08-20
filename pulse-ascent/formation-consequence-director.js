import * as THREE from 'three';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mobile=()=>innerWidth<760||innerHeight<520||matchMedia('(pointer: coarse)').matches;
const reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent&&window.__pulseFormationReveal?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});
const HERO_SCORE={node:5,sentinel:4,tank:3,prism:2,drone:1};
const REACTIONS=['BUS REROUTE','MIRROR INVERT','ORBIT SCATTER','BRANCH SPLIT','CHORD REVOICE'];

waitFor().then(game=>{
  if(game.__formationConsequenceInstalled)return;game.__formationConsequenceInstalled=true;

  const state={breaks:0,perfectBreaks:0,regroups:0,lastReaction:'',pending:new Map(),shock:new Map(),formationBreaks:new Map()};
  const comfort=()=>!!window.__pulseSettings?.state?.comfort||reducedMotion();
  const direct=()=>!!window.__pulseDirectAscent?.state?.active;
  const areaNow=()=>clamp((window.__pulseCampaign?.state?.selected||1)-1,0,4);
  const liveMembers=id=>(game.enemies||[]).filter(e=>!e.dead&&e.__formationId===id&&e.group);

  function scoreLeader(enemy){
    const hero=(enemy.elite?6:0)+(HERO_SCORE[enemy.type]||0),x=Math.abs(enemy.group?.position?.x||0);
    return hero*10+(1-clamp(x/10,0,1));
  }

  function musicalResponse(a,perfect=false){
    const audio=game.audio,t=audio?.ctx?.currentTime;if(t===undefined||!audio?.osc)return;
    const root=(audio.rootMidi||43)+[24,29,31,27,36][a],notes=[[0,7,12],[0,5,12],[0,3,10],[0,5,9],[0,6,10]][a];
    const type=['square','sine','triangle','sawtooth','triangle'][a];
    notes.forEach((n,i)=>audio.osc(type,audio.midi(root+n),t+i*.018,.09+i*.025,(perfect?.014:.009)*(1-i*.12),audio.fx,(i-1)*3,(i-1)*.32));
  }

  function queueBreak(enemy){
    const id=enemy?.__formationId;if(!id||enemy.__formationVoice!==0)return;
    const count=state.formationBreaks.get(id)||0;if(count>=2||state.pending.has(id))return;
    const survivors=liveMembers(id);if(survivors.length<2)return;
    const ctx=enemy.__hitFeedbackCtx||{},a=areaNow();
    state.pending.set(id,{id,area:a,q:ctx.q??.5,queuedAt:game.audio?.step||0});
    state.formationBreaks.set(id,count+1);state.breaks++;
  }

  function regroup(event){
    const survivors=liveMembers(event.id);if(survivors.length<2)return;
    const successor=[...survivors].sort((a,b)=>scoreLeader(b)-scoreLeader(a))[0];
    const ordered=[successor,...survivors.filter(e=>e!==successor).sort((a,b)=>(a.__formationVoice||9)-(b.__formationVoice||9))];
    const duration=direct()?620:(comfort()?720:980),now=performance.now();
    ordered.forEach((enemy,i)=>{
      enemy.__formationVoice=i===0?0:1+((i-1)%Math.max(2,Math.min(4,ordered.length-1)));
      enemy.__formationSuccessor=i===0;
      state.shock.set(enemy,{area:event.area,start:now,duration,index:i,total:ordered.length});
    });
    const perfect=event.q>.88,reaction=REACTIONS[event.area];
    if(perfect){state.perfectBreaks++;game.score+=420+ordered.length*85;game.sync=clamp(game.sync+3,0,100);game.overdrive=clamp(game.overdrive+5,0,100);game.updateHud?.();}
    musicalResponse(event.area,perfect);window.__pulseRailCamera?.frameEncounter?.(ordered.slice(0,mobile()?3:5));
    game.showCallout?.(`${perfect?'PERFECT BREAK':'FORMATION BREAK'} // ${reaction}`,perfect?1:.82);game.haptic?.(perfect?[8,10,14]:(mobile()?5:7));
    state.lastReaction=reaction;state.regroups++;
  }

  function processStep(step){
    if(step%4!==0)return;
    for(const [id,event] of [...state.pending]){
      state.pending.delete(id);regroup(event);
    }
  }
  game.audio?.onStep?.(processStep);

  const baseDestroyed=game.onEnemyDestroyed.bind(game);
  game.onEnemyDestroyed=enemy=>{
    const wasLeader=!!enemy?.__formationId&&enemy.__formationVoice===0,id=enemy?.__formationId;
    const result=baseDestroyed(enemy);
    if(wasLeader&&id)queueBreak(enemy);
    return result;
  };

  const tick=now=>{
    for(const [enemy,s] of [...state.shock]){
      if(!enemy||enemy.dead||!enemy.group){state.shock.delete(enemy);continue;}
      const k=clamp((now-s.start)/s.duration,0,1);if(k>=1){state.shock.delete(enemy);delete enemy.__formationSuccessor;continue;}
      const env=Math.sin(k*Math.PI)*(1-k*.18)*(comfort()?.55:1),p=enemy.group.position,i=s.index,n=Math.max(2,s.total);
      if(s.area===0){
        const dir=Math.sign(p.x)||((i%2)?1:-1);p.x+=dir*(.18+i*.035)*env;p.y+=(i-(n-1)/2)*.018*env;
      }else if(s.area===1){
        p.x+=(-1.28*p.x)*env;p.y+=Math.sin(i*Math.PI)*.08*env;
      }else if(s.area===2){
        const ang=(i%2?1:-1)*.42*env,c=Math.cos(ang),sn=Math.sin(ang),x=p.x,y=p.y;p.x+=(x*c-y*sn-x);p.y+=(x*sn+y*c-y)*.55;
      }else if(s.area===3){
        const dir=i%2?1:-1;p.x+=dir*(.34+.055*i)*env;p.y+=((i%3)-1)*.15*env;
      }else{
        const lanes=[-2.1,-.72,.72,2.1],tx=lanes[i%lanes.length],ty=((i%3)-1)*.42;p.x+=(tx-p.x)*.34*env;p.y+=(ty-p.y)*.28*env;
      }
      if(enemy.__fusionModel)enemy.__fusionModel.rotation.z+=(i%2?1:-1)*.006*env;
    }
    requestAnimationFrame(tick);
  };requestAnimationFrame(tick);

  window.__pulseFormationConsequence={
    processStep,
    forceBreak:id=>{const leader=liveMembers(id).find(e=>e.__formationVoice===0);if(leader){queueBreak(leader);return true;}return false;},
    stats:()=>({breaks:state.breaks,perfectBreaks:state.perfectBreaks,regroups:state.regroups,lastReaction:state.lastReaction,pending:state.pending.size,reacting:state.shock.size})
  };
});
