const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent&&window.__pulseEnemyPhraseComposer&&window.__pulseAreaEnemyAttacks?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});

const RESOLUTION_STEPS=[14,14,12,14,12];
const ANSWER_INTERVALS=[[0,7,12],[0,5,12],[0,3,7],[0,5,9],[0,7,12]];

waitFor().then(game=>{
  if(game.__playerCounterpointInstalled)return;game.__playerCounterpointInstalled=true;
  const state={open:false,answered:false,area:1,name:'',responseStep:-1,resolutionStep:-1,armed:false,strong:false,count:0,quality:0,answers:0,cuts:0,breaks:0,suppressed:0,lastResult:'',blockUntil:0,remaining:0};
  const areaIndex=()=>clamp((window.__pulseCampaign?.state?.selected||1)-1,0,4);
  const unavailable=()=>!game.running||!!window.__pulseOnboarding?.state?.active||!!window.__pulseDirectAscent?.state?.active||!!game.boss||(game.bar||0)<16;

  function answerTone(a,strong=false){
    const audio=game.audio,ctx=audio?.ctx;if(!ctx)return;
    const root=(audio.rootMidi||43)+24,notes=ANSWER_INTERVALS[a]||ANSWER_INTERVALS[0],now=ctx.currentTime+.008;
    notes.slice(0,strong?3:2).forEach((n,i)=>audio.osc?.(i===0?'triangle':'sine',audio.midi(root+n+(strong?12:0)),now+i*.018,.09,.0085+(strong?.002:0),audio.fx,0,(i-(strong?1:.5))*.28));
  }

  function reward(points,label,strong){
    game.score+=points;game.sync=clamp(game.sync+(strong?3:1.5),0,100);game.overdrive=clamp(game.overdrive+(strong?3:1.25),0,100);game.updateHud?.();
    dispatchEvent(new CustomEvent('pulse:skill-reward',{detail:{label,points,source:'counterpoint',quality:state.quality,count:state.count}}));
  }

  function armAnswer(q,count){
    if(unavailable()||!state.open||state.answered||q<=.88)return false;
    state.answered=true;state.armed=true;state.strong=count>=4;state.count=count;state.quality=q;state.answers++;
    const points=state.strong?360+count*55:170+count*35,label=state.strong?'COUNTERPOINT BREAK':'HARMONIC CUT';
    reward(points,label,state.strong);answerTone(state.area-1,state.strong);game.showCallout?.(`${label} // ARMED`,q);game.haptic?.(state.strong?[10,18,14]:[8,12,8]);
    return true;
  }

  addEventListener('pulse:enemy-phrase-step',e=>{
    const d=e.detail||{};
    if(d.voice===1){state.open=false;state.answered=false;state.armed=false;state.area=d.area||areaIndex()+1;state.name=d.name||'';state.responseStep=-1;state.resolutionStep=RESOLUTION_STEPS[state.area-1]??14;}
    else if(d.voice===2){state.open=true;state.answered=false;state.armed=false;state.area=d.area||areaIndex()+1;state.name=d.name||'';state.responseStep=d.step??-1;state.resolutionStep=RESOLUTION_STEPS[state.area-1]??14;}
    else if(d.voice===3){state.open=false;state.answered=false;state.armed=false;state.remaining=0;state.blockUntil=0;}
  });

  const baseScoreTiming=game.scoreTiming.bind(game);
  game.scoreTiming=(q,count)=>{const result=baseScoreTiming(q,count);armAnswer(q,count);return result;};

  const baseSpawn=game.spawnEnemy.bind(game);
  game.spawnEnemy=(type,pos,phase=0)=>{
    if(type==='danger'&&state.armed&&performance.now()<state.blockUntil&&state.remaining>0){
      state.remaining--;state.suppressed++;
      if(state.strong)state.breaks++;else state.cuts++;
      if(!state.lastResult){
        state.lastResult=state.strong?'RESOLUTION BROKEN':'RESOLUTION CUT';
        game.showCallout?.(state.strong?'COUNTERPOINT // RESOLUTION BROKEN':'HARMONIC CUT // VOICE REMOVED',1);
        game.world?.pulse?.(state.strong?1.15:.7);
        dispatchEvent(new CustomEvent('pulse:player-counterpoint',{detail:{area:state.area,name:state.name,strong:state.strong,count:state.count,quality:state.quality,result:state.lastResult}}));
      }
      return null;
    }
    return baseSpawn(type,pos,phase);
  };

  const baseOnStep=game.onStep.bind(game);
  game.onStep=(step,time)=>{
    const s=step%16;
    if(state.armed&&state.open&&s===state.resolutionStep){
      state.blockUntil=performance.now()+260;state.remaining=state.strong?12:1;state.lastResult='';
      const result=baseOnStep(step,time);
      setTimeout(()=>{if(performance.now()>=state.blockUntil){state.remaining=0;state.armed=false;}},275);
      return result;
    }
    return baseOnStep(step,time);
  };

  window.__pulsePlayerCounterpoint={
    armAnswer,
    stats:()=>({open:state.open,answered:state.answered,armed:state.armed,area:state.area,name:state.name,responseStep:state.responseStep,resolutionStep:state.resolutionStep,strong:state.strong,count:state.count,quality:Number(state.quality.toFixed(3)),answers:state.answers,cuts:state.cuts,breaks:state.breaks,suppressed:state.suppressed,lastResult:state.lastResult})
  };
});
