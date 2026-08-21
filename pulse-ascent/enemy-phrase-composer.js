const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent&&window.__pulseAreaEnemyAttacks&&window.__pulseEnemyAttackAnticipation?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});

const PROFILES=[
  {name:'BUS MOTIF',steps:[6,10,14],notes:[0,7,12],color:0x58edff},
  {name:'MIRROR PHRASE',steps:[6,10,14],notes:[0,5,12],color:0xffaa55},
  {name:'TIDAL PHRASE',steps:[4,8,12],notes:[0,3,7],color:0x68ffe1},
  {name:'BRANCH PHRASE',steps:[6,10,14],notes:[0,5,9],color:0xa5ff72},
  {name:'SERAPH PHRASE',steps:[4,8,12],notes:[0,7,12],color:0xcad0ff}
];

waitFor().then(game=>{
  if(game.__enemyPhraseComposerInstalled)return;game.__enemyPhraseComposerInstalled=true;
  const api=window.__pulseAreaEnemyAttacks;
  const state={phrases:0,steps:0,shots:0,resolutions:0,lastArea:1,lastName:'',lastVoice:0,lastStep:-1};
  const area=()=>clamp((window.__pulseCampaign?.state?.selected||1)-1,0,4);
  const phase=()=>clamp(game.section||0,0,3);
  const unavailable=()=>!game.running||!!window.__pulseOnboarding?.state?.active||!!window.__pulseDirectAscent?.state?.active||!!game.boss||(game.bar||0)<16||phase()<1;
  const ownsStep=step=>!unavailable()&&PROFILES[area()].steps.includes(step%16);

  function tone(a,voice,time){
    const audio=game.audio,ctx=audio?.ctx;if(!ctx)return;
    const p=PROFILES[a],root=(audio.rootMidi||43)+24,at=Number.isFinite(time)?Math.max(ctx.currentTime+.006,time):ctx.currentTime+.008;
    const note=p.notes[voice]??0,pan=(voice-1)*.32,type=['square','sine','triangle','triangle','sine'][a];
    audio.osc?.(type,audio.midi(root+note),at,.075,voice===2?.012:.0085,audio.fx,0,pan);
    if(voice===2&&a===4){audio.osc?.('triangle',audio.midi(root+note+7),at,.1,.0065,audio.fx,0,.34);audio.osc?.('sine',audio.midi(root+note-5),at,.1,.006,-.34);}
  }

  function shoot(source,options){
    if(!source)return null;api.telegraph?.(source,options.color);const result=api.spawnThreat?.(source,options);if(result)state.shots++;return result;
  }

  function playSignal(voice,pool,avatar,p){
    const sign=voice===0?-1:voice===1?1:0,src=voice<2?api.sourceBySide?.(sign,pool):pool[(state.phrases+1)%pool.length];
    if(voice<2)return shoot(src,{targetX:avatar.x+sign*.9,targetY:avatar.y-sign*.22,speed:22.8+p*.65,radius:.82,color:PROFILES[0].color});
    let fired=0;for(const s of [-1,1]){const e=api.sourceBySide?.(s,pool);if(shoot(e,{targetX:avatar.x-s*.62,targetY:avatar.y+s*.28,speed:24.8+p*.55,radius:.8,color:PROFILES[0].color}))fired++;}return fired>0;
  }

  function playGlass(voice,pool,avatar,p){
    const sign=voice===0?-1:voice===1?1:0;
    if(voice<2){const src=api.sourceBySide?.(sign,pool);return shoot(src,{targetX:avatar.x-sign*.78,targetY:avatar.y+sign*.3,speed:23.2+p*.65,radius:.82,color:PROFILES[1].color});}
    let fired=0;for(const s of [-1,1]){const src=api.sourceBySide?.(s,pool);if(shoot(src,{targetX:avatar.x-s*.96,targetY:avatar.y+s*.18,speed:24.6+p*.6,radius:.8,color:PROFILES[1].color}))fired++;}return fired>0;
  }

  function playChroma(voice,pool,avatar,p){
    const offsets=[-1.05,.15,1.05],src=pool[(state.phrases+voice*2)%pool.length];
    return shoot(src,{targetX:avatar.x+offsets[voice],targetY:avatar.y+(voice-1)*.58,speed:21.4+voice*.85+p*.5,radius:.78,color:PROFILES[2].color});
  }

  function playOrganic(voice,pool,avatar,p){
    const src=pool[(state.phrases+voice)%pool.length],spread=1.08+p*.16;
    if(voice===0)return shoot(src,{targetX:avatar.x-spread,targetY:avatar.y+.34,speed:22.8+p*.65,radius:.77,color:PROFILES[3].color});
    if(voice===1)return shoot(src,{targetX:avatar.x+spread,targetY:avatar.y-.34,speed:23.5+p*.65,radius:.77,color:PROFILES[3].color});
    let fired=0;for(const x of [-spread*.72,spread*.72])if(shoot(src,{targetX:avatar.x+x,targetY:avatar.y+(x<0?.5:-.5),speed:24.6+p*.6,radius:.75,color:PROFILES[3].color}))fired++;return fired>0;
  }

  function playCathedral(voice,pool,avatar,p){
    if(voice<2){const sign=voice===0?-1:1,src=api.sourceBySide?.(sign,pool);return shoot(src,{targetX:avatar.x+sign*.88,targetY:avatar.y+(voice?-.3:.3),speed:23.8+p*.62,radius:.77,color:PROFILES[4].color});}
    const spacing=1.05,count=innerWidth<760?2:3;let fired=0;
    for(let i=0;i<count;i++){const src=pool[(state.phrases+i)%pool.length],x=(i-(count-1)/2)*spacing;if(shoot(src,{targetX:avatar.x+x,targetY:avatar.y+(i%2?.38:-.22),speed:24.7+p*.62,radius:.75,color:PROFILES[4].color}))fired++;}
    return fired>0;
  }

  const PLAYERS=[playSignal,playGlass,playChroma,playOrganic,playCathedral];
  function playStep(step,time){
    if(!ownsStep(step))return false;
    const a=area(),profile=PROFILES[a],s=step%16,voice=profile.steps.indexOf(s);if(voice<0)return false;
    const pool=api.sources?.()||[];if(!pool.length||api.dangerCount?.()>=api.maxDanger?.())return false;
    const avatar=game.world.avatar.position,p=phase();
    if(voice===0)state.phrases++;
    tone(a,voice,time);const fired=PLAYERS[a](voice,pool,avatar,p);
    if(!fired)return false;
    state.steps++;state.lastArea=a+1;state.lastName=profile.name;state.lastVoice=voice+1;state.lastStep=s;if(voice===2)state.resolutions++;
    dispatchEvent(new CustomEvent('pulse:enemy-phrase-step',{detail:{area:a+1,name:profile.name,voice:voice+1,step:s,resolution:voice===2}}));
    return true;
  }

  const baseOnStep=game.onStep.bind(game);
  game.onStep=(step,time)=>{baseOnStep(step,time);playStep(step,time);};

  window.__pulseEnemyPhraseComposer={
    profiles:PROFILES,ownsStep,playStep,
    stats:()=>({area:area()+1,name:PROFILES[area()].name,phrases:state.phrases,steps:state.steps,shots:state.shots,resolutions:state.resolutions,lastArea:state.lastArea,lastName:state.lastName,lastVoice:state.lastVoice,lastStep:state.lastStep,ownedSteps:[...PROFILES[area()].steps]})
  };
});
