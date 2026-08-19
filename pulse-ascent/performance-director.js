const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const mobile=()=>innerWidth<760||innerHeight<520||matchMedia('(pointer: coarse)').matches;
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent&&window.__pulseSettings?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});

waitFor().then(game=>{
  if(game.__performanceDirectorInstalled)return;game.__performanceDirectorInstalled=true;
  const settings=window.__pulseSettings;
  const state={tier:0,fps:60,lowFor:0,highFor:0,last:performance.now(),lastShift:0,mode:'auto',forced:null,burstScale:1,trailStride:1,trailCounter:0};
  const tierProfiles=[
    {name:'FULL',packet:.99,field:.99,burst:1,trail:1,mobileDpr:1.35,desktopDpr:1.7},
    {name:'BALANCED',packet:.68,field:.72,burst:.72,trail:2,mobileDpr:1.16,desktopDpr:1.42},
    {name:'LEAN',packet:.38,field:.48,burst:.48,trail:3,mobileDpr:.96,desktopDpr:1.18}
  ];

  const baseBurst=game.particles?.burst?.bind(game.particles),baseTrail=game.particles?.trail?.bind(game.particles);
  if(baseBurst)game.particles.burst=(pos,amount=42,color=0x6af7ff,power=7,size=10)=>baseBurst(pos,Math.max(3,Math.round(amount*state.burstScale)),color,power,size);
  if(baseTrail)game.particles.trail=(...args)=>{state.trailCounter++;if(state.trailCounter%state.trailStride===0)return baseTrail(...args);};

  function applyDecorativeBudget(){
    const profile=tierProfiles[state.tier];state.burstScale=profile.burst;state.trailStride=profile.trail;
    const topology=window.__pulseTopologyWorlds;
    topology?.worlds?.forEach(w=>w.packetGeo?.setDrawRange?.(0,Math.max(4,Math.floor(w.packetCount*profile.packet))));
    const field=window.__pulseGenerativeDirector?.field;
    if(field?.geo&&field?.count)field.geo.setDrawRange(0,Math.max(80,Math.floor(field.count*profile.field)));
    for(const enemy of game.enemies||[]){
      if(!enemy.__fusionModel)continue;
      const important=enemy.type==='tank'||enemy.type==='sentinel';
      const medium=enemy.type==='node'||enemy.type==='prism';
      enemy.__fusionModel.visible=state.tier===0||(state.tier===1?enemy.type!=='drone':important||(medium&&((enemy.phase||0)%2===0)));
    }
    if(game.boss?.__fusionModel)game.boss.__fusionModel.visible=true;
  }

  function applyResolutionBudget(){
    if(state.mode!=='auto')return;
    const profile=tierProfiles[state.tier],dpr=Math.min(devicePixelRatio||1,2),cap=mobile()?profile.mobileDpr:profile.desktopDpr;
    const target=Math.min(dpr,cap);game.targetPixelRatio=target;
    if(game.setPixelRatio&&game.pixelRatio>target+.01)game.setPixelRatio(target);
  }

  function setTier(next,reason='auto'){
    next=clamp(Math.round(next),0,2);if(next===state.tier){applyDecorativeBudget();return false;}
    state.tier=next;state.lowFor=0;state.highFor=0;state.lastShift=performance.now();applyResolutionBudget();applyDecorativeBudget();
    document.documentElement.dataset.perfTier=String(next);
    dispatchEvent(new CustomEvent('pulse-performance-tier',{detail:{tier:next,name:tierProfiles[next].name,reason,fps:state.fps}}));
    return true;
  }

  function syncMode(){
    const mode=settings.state.graphics||'auto';if(mode===state.mode&&state.forced===null)return;
    state.mode=mode;
    if(state.forced!==null){setTier(state.forced,'forced');return;}
    if(mode==='battery')setTier(2,'battery');else if(mode==='quality')setTier(0,'quality');else applyResolutionBudget();
  }

  function evaluate(dtMs){
    const fps=1000/Math.max(1,dtMs);state.fps=lerp(state.fps,clamp(fps,5,120),.055);
    syncMode();if(state.forced!==null||state.mode!=='auto'||!game.running||document.hidden)return;
    const dt=Math.min(.1,dtMs/1000),sinceShift=(performance.now()-state.lastShift)/1000;
    if(state.fps<34){state.lowFor+=dt*2.6;state.highFor=0;}
    else if(state.fps<45){state.lowFor+=dt;state.highFor=0;}
    else if(state.fps>56){state.highFor+=dt;state.lowFor=Math.max(0,state.lowFor-dt*.5);}
    else{state.lowFor=Math.max(0,state.lowFor-dt*.35);state.highFor=Math.max(0,state.highFor-dt*.5);}
    if(sinceShift>2.5&&state.lowFor>2.4&&state.tier<2)setTier(state.tier+1,'sustained-low-fps');
    else if(sinceShift>7&&state.highFor>8&&state.tier>0)setTier(state.tier-1,'sustained-recovery');
  }

  let decorTick=0;
  const frame=now=>{
    const dt=Math.min(250,Math.max(1,now-state.last));state.last=now;evaluate(dt);
    if(++decorTick%45===0)applyDecorativeBudget();
    requestAnimationFrame(frame);
  };requestAnimationFrame(frame);

  addEventListener('resize',()=>{syncMode();applyResolutionBudget();},{passive:true});
  document.addEventListener('visibilitychange',()=>{state.last=performance.now();state.lowFor=0;state.highFor=0;});
  syncMode();applyDecorativeBudget();

  window.__pulsePerformanceDirector={
    forceTier:tier=>{state.forced=clamp(Math.round(tier),0,2);setTier(state.forced,'forced');},
    releaseForce:()=>{state.forced=null;state.mode='';syncMode();},
    sample:ms=>evaluate(ms),
    stats:()=>({tier:state.tier,name:tierProfiles[state.tier].name,fps:Math.round(state.fps*10)/10,mode:state.mode,forced:state.forced,burstScale:state.burstScale,trailStride:state.trailStride,pixelRatio:game.pixelRatio,targetPixelRatio:game.targetPixelRatio})
  };
});
