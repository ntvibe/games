const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent&&window.__pulsePlayerCounterpoint&&window.__pulseEnemyPhraseComposer?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});

const PROFILES=[
  {name:'BUS DIVERT',type:'square',notes:[0,7,12],pan:[-.35,.1,.4]},
  {name:'MIRROR INVERSION',type:'sine',notes:[7,12,17],pan:[-.72,.72,0]},
  {name:'TIDAL BEND',type:'triangle',notes:[0,3,10],pan:[-.5,0,.5]},
  {name:'BRANCH VARIATION',type:'triangle',notes:[0,5,9],pan:[-.42,.35,.08]},
  {name:'CHOIR RESOLVE',type:'sine',notes:[0,7,12,16],pan:[-.55,-.16,.2,.58]}
];

waitFor().then(game=>{
  if(game.__counterpointReharmonizationInstalled)return;game.__counterpointReharmonizationInstalled=true;
  const state={reactions:0,strong:0,weak:0,lastArea:1,lastName:'',lastStrong:false,lastNotes:0,lastScheduledAt:0,lastSource:'',events:0};

  function scheduleTone(audio,type,midi,at,dur,gain,pan=0,glide=0){
    const voice=audio.osc?.(type,audio.midi(midi),at,dur,gain,audio.music,0,pan);
    if(glide&&voice?.o){
      const target=audio.midi(midi+glide);
      voice.o.frequency.exponentialRampToValueAtTime(Math.max(1,target),at+dur*.82);
    }
    return voice;
  }

  function react(detail={}){
    const audio=game.audio,ctx=audio?.ctx;if(!ctx)return false;
    const area=clamp((detail.area||1)-1,0,4),profile=PROFILES[area],strong=!!detail.strong,root=(audio.rootMidi||43)+24;
    const step=audio.stepDur||.117,at=Math.max(ctx.currentTime+.012,audio.quantizedTime?.(1)??ctx.currentTime+.018);
    const count=strong?profile.notes.length:Math.min(2,profile.notes.length);

    audio.duck?.(at,strong?.11:.065);
    for(let i=0;i<count;i++){
      const note=profile.notes[i],delay=area===3?i*step*.48:area===4?i*step*.34:i*step*.28;
      const dur=area===4?step*1.9:area===2?step*1.45:step*1.15;
      const gain=(strong?.0135:.0095)*(1-i*.08),pan=profile.pan[i]??0,glide=area===2?(i===0?5:i===1?-2:0):0;
      scheduleTone(audio,profile.type,root+note+(strong&&area===0?12:0),at+delay,dur,gain,pan,glide);
    }

    if(area===1&&strong){
      // Glass Temple answers a broken mirror phrase with a consonant stereo inversion.
      scheduleTone(audio,'triangle',root+24,at+step*.5,step*1.4,.0075,-.58);
      scheduleTone(audio,'triangle',root+19,at+step*.5,step*1.4,.0075,.58);
    }else if(area===4&&strong){
      // Neural Cathedral resolves the interrupted combat chord into a stable choir cadence.
      [0,7,12].forEach((n,i)=>scheduleTone(audio,i?'sine':'triangle',root+12+n,at+step*.75,step*2.1,.0068,(i-1)*.42));
    }

    game.world?.pulse?.(strong?1.05:.62);
    if(window.__pulseTopologyMorph?.trigger&&strong)window.__pulseTopologyMorph.trigger(.42);
    state.reactions++;state[strong?'strong':'weak']++;state.lastArea=area+1;state.lastName=profile.name;state.lastStrong=strong;state.lastNotes=count;state.lastScheduledAt=at;state.lastSource=detail.name||'';
    dispatchEvent(new CustomEvent('pulse:enemy-phrase-reharmonized',{detail:{area:area+1,name:profile.name,strong,notes:count,source:detail.name||'',scheduledAt:at}}));
    return true;
  }

  addEventListener('pulse:player-counterpoint',e=>{state.events++;react(e.detail||{});});

  window.__pulseCounterpointReharmonization={
    profiles:PROFILES,
    react,
    stats:()=>({reactions:state.reactions,strong:state.strong,weak:state.weak,lastArea:state.lastArea,lastName:state.lastName,lastStrong:state.lastStrong,lastNotes:state.lastNotes,lastScheduledAt:Number(state.lastScheduledAt.toFixed(4)),lastSource:state.lastSource,events:state.events})
  };
});
