const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});
const SCARS={lance:'COMMAND BREACH',swarm:'VOICE FRACTURE',lock:'SYNC COLLAPSE'};

waitFor().then(game=>{
  if(game.__formationWeaponScarAudioInstalled)return;game.__formationWeaponScarAudioInstalled=true;
  const audio=game.audio,state={active:new Map(),triggered:0,steps:0,lanceGaps:0,swarmVoices:0,lockStutters:0,spatialEvents:0,lastWeapon:'',lastName:'',lastPan:0};
  const selectedArea=()=>clamp((window.__pulseCampaign?.state?.selected||1)-1,0,4);
  const profile=area=>window.__pulseAreaAudio?.profiles?.[area]||{root:audio.rootMidi||43,scale:audio.scale||[0,2,3,7,9,12]};
  const safeOsc=(type,midi,t,dur,gain,pan=0,detune=0)=>{if(!audio?.ctx||!audio?.osc)return;audio.osc(type,audio.midi(midi),t,dur,gain,audio.music,detune,clamp(pan,-.92,.92));state.spatialEvents++;state.lastPan=clamp(pan,-.92,.92);};
  const formationPan=successor=>clamp((successor?.group?.position?.x||0)/7.5,-.72,.72);

  function arm(detail={}){
    const weapon=detail.weapon;if(!SCARS[weapon]||!detail.id)return null;
    const area=clamp(detail.area??selectedArea(),0,4),step=audio?.step||0,expiresStep=detail.successor?.__commandWeaponScar?.expiresStep||step+16;
    const rec={id:detail.id,weapon,area,name:SCARS[weapon],startedStep:step,expiresStep,voice:detail.successor?.__commandWeaponScar?.voice??2,pan:formationPan(detail.successor)};
    state.active.set(detail.id,rec);state.triggered++;state.lastWeapon=weapon;state.lastName=rec.name;state.lastPan=rec.pan;
    return rec;
  }

  addEventListener('pulse:formation-weapon-scar',e=>arm(e.detail||{}));

  function renderScar(rec,step,t){
    if(!audio?.ctx)return;
    const p=profile(rec.area),local=(step-rec.startedStep+16)%16,s=step%16,root=p.root||audio.rootMidi||43,scale=p.scale||audio.scale||[0,2,3,7,9,12],basePan=rec.pan||0;
    if(rec.weapon==='lance'){
      // COMMAND BREACH is heard as a hole at the damaged commander's real screen position:
      // duck the shared mix, then leave a low broken-bus pulse anchored to that side.
      if(s===0||s===8){audio.duck?.(t,.34);safeOsc('square',root-12,t,.075,.014,basePan,-9);state.lanceGaps++;}
      if(s===6||s===14)safeOsc('sine',root+12+scale[(local>>1)%scale.length],t,.08,.008,clamp(basePan*.7+.2,-.82,.82),0);
    }else if(rec.weapon==='swarm'){
      // VOICE FRACTURE spatializes four formation voices across the successor's local stereo field.
      // The damaged voice is truly absent, so its missing stereo slot can be located by ear.
      if([1,5,9,13].includes(s)){
        const voice=[0,1,2,3][[1,5,9,13].indexOf(s)];
        if(voice!==rec.voice%4){const note=scale[(voice+local)%scale.length]??0,voicePan=clamp(basePan+(voice-1.5)*.28,-.88,.88);safeOsc(voice%2?'triangle':'sine',root+24+note,t,.11,.009,voicePan,voice%2?5:-4);state.swarmVoices++;}
      }
    }else{
      // SYNC COLLAPSE stays on-grid but jitters around the commander's stereo position,
      // making the damaged timing network perceptible without changing global tempo.
      if([2,6,10,14].includes(s)){
        const note=scale[(Math.floor(s/4)+local)%scale.length]??0,m=root+24+note,off=Math.min(audio.stepDur*.34,.045),spread=.2;
        safeOsc('triangle',m,t,.065,.0085,clamp(basePan-spread,-.9,.9),-5);safeOsc('triangle',m,t+off,.05,.006,clamp(basePan+spread,-.9,.9),7);state.lockStutters++;
      }
    }
  }

  function processStep(step,t){
    for(const [id,rec] of [...state.active]){
      if(step>rec.expiresStep){state.active.delete(id);continue;}
      renderScar(rec,step,t);state.steps++;
    }
  }
  audio?.onStep?.(processStep);

  window.__pulseFormationWeaponScarAudio={
    arm,processStep,
    stats:()=>({active:state.active.size,triggered:state.triggered,steps:state.steps,lanceGaps:state.lanceGaps,swarmVoices:state.swarmVoices,lockStutters:state.lockStutters,spatialEvents:state.spatialEvents,lastPan:Number(state.lastPan.toFixed(3)),lastWeapon:state.lastWeapon,lastName:state.lastName})
  };
});
