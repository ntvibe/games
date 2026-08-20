const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});
const STATES=['BUS REROUTE','MIRROR DESYNC','ORBIT SCATTER','BRANCH PANIC','CHORD REVOICE'];

waitFor().then(game=>{
  if(game.__formationCombatStateInstalled)return;game.__formationCombatStateInstalled=true;

  const state={formations:new Map(),adjusted:0,suppressed:0,lastState:'',lastFormation:null};
  const stepNow=()=>game.audio?.step||0;
  const liveMembers=id=>(game.enemies||[]).filter(e=>!e.dead&&e.__formationId===id);

  function stampMembers(record){
    for(const enemy of liveMembers(record.id))enemy.__formationCombatState={id:record.id,area:record.area,name:record.name,phase:record.phase,expiresStep:record.expiresStep};
  }

  function markBreak(id,area){
    if(!id)return;
    const record={id,area:clamp(area,0,4),name:STATES[clamp(area,0,4)],phase:'leaderless',startedStep:stepNow(),expiresStep:stepNow()+6};
    state.formations.set(id,record);state.lastState=record.name;state.lastFormation=id;stampMembers(record);
  }

  function markRegroup(id,area){
    if(!id)return;
    const record={id,area:clamp(area,0,4),name:STATES[clamp(area,0,4)],phase:'regrouped',startedStep:stepNow(),expiresStep:stepNow()+16};
    state.formations.set(id,record);state.lastState=record.name;state.lastFormation=id;stampMembers(record);
  }

  function recordFor(source){
    const id=source?.__formationId;if(!id)return null;
    const record=state.formations.get(id);if(!record)return null;
    if(stepNow()>record.expiresStep){state.formations.delete(id);return null;}
    return record;
  }

  function adjustThreat(source,options={}){
    const record=recordFor(source);if(!record)return options;
    const out={...options},voice=Math.max(0,source.__formationVoice||0),avatar=game.world?.avatar?.position||{x:0,y:0};
    const localStep=stepNow()-record.startedStep;

    // Formation damage changes attack grammar for roughly one bar. The effects are
    // deliberately mechanical/readable rather than simply increasing bullet count.
    if(record.area===0){
      // BUS REROUTE: leaderless circuitry drops alternating shots; the rebuilt bus fires
      // slower, offset lanes until routing stabilizes.
      if(record.phase==='leaderless'&&((voice+localStep)&1)===1){state.suppressed++;return {...out,suppressed:true,formationState:record.name};}
      out.speed=(out.speed||24)*.9;out.targetX=(Number.isFinite(out.targetX)?out.targetX:avatar.x)+(voice%2?.48:-.48);
    }else if(record.area===1){
      // MIRROR DESYNC: paired crossfire loses perfect symmetry after its leader breaks.
      const tx=Number.isFinite(out.targetX)?out.targetX:avatar.x;
      out.targetX=avatar.x-(tx-avatar.x)*.68+(voice%2?.28:-.28);out.delay=(out.delay||0)+voice*.035;out.speed=(out.speed||24)*.94;
    }else if(record.area===2){
      // ORBIT SCATTER: surviving voices drift out of the shared current and arrive in
      // wider, staggered pulses.
      const sign=voice%2?1:-1;out.targetX=(Number.isFinite(out.targetX)?out.targetX:avatar.x)+sign*(.45+voice*.08);out.targetY=(Number.isFinite(out.targetY)?out.targetY:avatar.y)+((voice%3)-1)*.32;out.delay=(out.delay||0)+voice*.045;out.speed=(out.speed||24)*.91;
    }else if(record.area===3){
      // BRANCH PANIC: a severed hierarchy becomes more erratic, widening its forks and
      // slightly accelerating the surviving branches.
      const tx=Number.isFinite(out.targetX)?out.targetX:avatar.x,dx=tx-avatar.x||((voice%2)?1:-1);out.targetX=avatar.x+dx*1.28;out.targetY=(Number.isFinite(out.targetY)?out.targetY:avatar.y)+((voice%3)-1)*.38;out.speed=(out.speed||24)*1.06;out.delay=(out.delay||0)+(voice%2)*.025;
    }else{
      // CHORD REVOICE: simultaneous Cathedral attacks break into a readable arpeggio.
      out.delay=(out.delay||0)+voice*.065;out.speed=(out.speed||24)*(.96+Math.min(voice,3)*.018);out.targetY=(Number.isFinite(out.targetY)?out.targetY:avatar.y)+(voice-1.5)*.12;
    }

    out.formationState=record.name;state.adjusted++;return out;
  }

  function processStep(step){
    for(const [id,record] of [...state.formations]){
      if(step<=record.expiresStep)continue;
      state.formations.delete(id);
      for(const enemy of liveMembers(id))delete enemy.__formationCombatState;
    }
  }
  game.audio?.onStep?.(processStep);

  window.__pulseFormationCombatState={
    states:STATES,markBreak,markRegroup,adjustThreat,processStep,
    stateFor:id=>state.formations.get(id)||null,
    stats:()=>({active:state.formations.size,adjusted:state.adjusted,suppressed:state.suppressed,lastState:state.lastState,lastFormation:state.lastFormation})
  };
});
