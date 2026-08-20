const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent&&window.__pulseScoreMasteryFeedback?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});

const THRESHOLDS=[1,2,4,6];
const NAMES=['BASE','DRIVE','RESONANCE','ASCENT'];

waitFor().then(game=>{
  if(game.__flowResonanceInstalled)return;game.__flowResonanceInstalled=true;
  const audio=game.audio,state={tier:0,targetTier:0,resonance:0,peakTier:0,lastRiseAt:-99,lastMult:1};
  const mastery=document.querySelector('#masteryFeedback');
  const style=document.createElement('style');style.textContent=`
    #masteryFeedback[data-flow-tier="1"] #mfFlow{color:#b9f6ff}
    #masteryFeedback[data-flow-tier="2"] #mfFlow{color:#ffd3f1;text-shadow:0 0 7px #ff5ac744}
    #masteryFeedback[data-flow-tier="3"] #mfFlow{color:#fff;text-shadow:0 0 8px #8ff7ff55,0 0 12px #ff62cf33}
    #masteryFeedback .mf-flow-state{font-size:5px;letter-spacing:.13em;color:#638c98;margin-left:1px}
    #masteryFeedback[data-flow-tier="2"] .mf-flow-state{color:#d7a9cb}
    #masteryFeedback[data-flow-tier="3"] .mf-flow-state{color:#dffaff}
  `;document.head.appendChild(style);
  let stateEl=null;
  if(mastery){const row=mastery.querySelector('.mf-flow');stateEl=document.createElement('span');stateEl.className='mf-flow-state';stateEl.textContent='BASE';row?.appendChild(stateEl);mastery.dataset.flowTier='0';}

  function resolveTier(mult,current){
    let next=current;
    while(next<3&&mult>=THRESHOLDS[next+1]+.03)next++;
    while(next>0&&mult<THRESHOLDS[next]-.28)next--;
    return next;
  }

  function setTier(next,{announce=true}={}){
    next=clamp(next|0,0,3);if(next===state.tier)return;
    const previous=state.tier,rising=next>previous;state.tier=next;state.peakTier=Math.max(state.peakTier,next);
    if(mastery)mastery.dataset.flowTier=String(next);if(stateEl)stateEl.textContent=NAMES[next];
    if(rising&&announce&&game.running){
      const now=game.time||0;if(now-state.lastRiseAt>.7){state.lastRiseAt=now;game.showCallout?.(`FLOW ${next===1?'II':next===2?'IV':'VI'} // ${NAMES[next]}`,.91);game.haptic?.(next===3?[9,14,18]:[7,10,7]);}
      dispatchEvent(new CustomEvent('pulse:flow-tier',{detail:{tier:next,name:NAMES[next],mult:game.mult||1}}));
      window.__pulseTopologyMorph?.trigger?.();
    }
  }

  const baseSchedule=audio.scheduleMusic.bind(audio);
  audio.scheduleMusic=(step,t)=>{
    baseSchedule(step,t);
    if(!audio.ctx||!game.running||state.tier<=0)return;
    const s=step%16,root=audio.rootMidi||43,e=clamp(audio.energy||0,0,1),tier=state.tier;
    // FLOW adds musical stems rather than simply making the master bus louder.
    if(tier>=1&&(s===0||s===8))audio.osc('sine',audio.midi(root+12),t,.12,.009+e*.004,audio.music,0,s===0?-.18:.18);
    if(tier>=2&&[2,6,10,14].includes(s)){
      const scale=audio.scale||[0,2,3,7,9,12],note=scale[(Math.floor(step/4)+s/2)%scale.length|0]||0;
      audio.pluck(t,root+24+note,.012+e*.006,.08,(s-8)/10);
    }
    if(tier>=3&&s===0){
      audio.osc('triangle',audio.midi(root+24),t,audio.beatDur*1.8,.012,audio.music,-5,-.25);
      audio.osc('triangle',audio.midi(root+31),t,audio.beatDur*1.8,.010,audio.music,5,.25);
    }
  };

  const baseUpdate=game.world.update.bind(game.world);
  game.world.update=(dt,t,energy,sync=0)=>{
    baseUpdate(dt,t,energy,sync);
    const mult=Math.max(1,game.mult||1),next=resolveTier(mult,state.tier);state.targetTier=next;setTier(next);
    const target=clamp((mult-1)/6,0,1),speed=reducedMotion()?2.4:4.2;state.resonance=lerp(state.resonance,target,1-Math.exp(-dt*speed));state.lastMult=mult;
    const topology=window.__pulseTopologyWorlds,area=clamp((window.__pulseCampaign?.state?.selected||1)-1,0,4),w=topology?.worlds?.[area];
    if(w?.root?.visible){
      // Keep the response structural and crisp: more packet presence/color, no bloom or exposure escalation.
      w.mat.opacity=clamp(w.mat.opacity*(1+state.resonance*.12),.035,.2);
      w.packetMat.opacity=clamp(w.packetMat.opacity*(1+state.resonance*.18),.2,.88);
      w.packetMat.size*=1+state.resonance*.07;
      const accent=topology.profiles?.[area]?.colors?.[1];if(accent!==undefined)w.mat.color.lerp(new w.mat.color.constructor(accent),state.resonance*.055);
    }
  };

  const baseTakeHit=game.takeHit.bind(game);
  game.takeHit=(...args)=>{const result=baseTakeHit(...args);setTier(resolveTier(Math.max(1,game.mult||1),state.tier),{announce:false});return result;};
  const baseRestart=game.restart.bind(game);
  game.restart=(...args)=>{const result=baseRestart(...args);state.resonance=0;state.peakTier=0;setTier(0,{announce:false});return result;};

  window.__pulseFlowResonance={
    setTier,
    stats:()=>({tier:state.tier,name:NAMES[state.tier],peakTier:state.peakTier,resonance:state.resonance,mult:state.lastMult,thresholds:[...THRESHOLDS]})
  };
});
