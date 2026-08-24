import * as THREE from 'three';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const TAU=Math.PI*2;
const GOLDEN=.6180339887498949;

const waitForRuntime=()=>new Promise(resolve=>{
  const tick=()=>{
    const game=window.__pulseAscent;
    const directorApi=window.__pulseMetamorphosisDirector;
    if(game&&directorApi)return resolve({game,directorApi});
    requestAnimationFrame(tick);
  };
  tick();
});

const makeObservedAdditiveChannel=(read,write,{min=-Infinity,max=Infinity}={})=>{
  let lastOutput=null;
  let lastApplied=0;
  return desired=>{
    const observed=read();
    const externallyRebased=lastOutput===null||Math.abs(observed-lastOutput)>.035;
    const base=externallyRebased?observed:observed-lastApplied;
    const output=clamp(base+desired,min,max);
    write(output);
    lastApplied=output-base;
    lastOutput=output;
    return{base,output,applied:lastApplied,externallyRebased};
  };
};

waitForRuntime().then(({game,directorApi})=>{
  if(game.__timeFracturePerceptionInstalled)return;
  game.__timeFracturePerceptionInstalled=true;

  const mobile=innerWidth<750||innerHeight<520;
  const streakCount=mobile?64:96;
  const positions=new Float32Array(streakCount*2*3);
  const seeds=[];
  for(let i=0;i<streakCount;i++){
    const u=(i*GOLDEN)%1;
    const angle=u*TAU;
    const radius=3.8+((i*37)%29)/29*5.2;
    const depth=-5-((i*53)%97)/97*38;
    const lengthBias=.62+((i*19)%31)/31*.9;
    seeds.push({angle,radius,depth,lengthBias});
  }

  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const material=new THREE.LineBasicMaterial({
    color:0xb9f7ff,
    transparent:true,
    opacity:0,
    blending:THREE.AdditiveBlending,
    depthWrite:false,
    depthTest:false
  });
  const streaks=new THREE.LineSegments(geometry,material);
  streaks.frustumCulled=false;
  streaks.renderOrder=18;
  streaks.visible=false;
  game.scene.add(streaks);

  let flowPhase=0;
  let previewOverride=null;
  let lastSequence=-1;
  let lastPhase='idle';
  let state={active:false,phase:'idle',envelope:0,timeFeel:1,snap:0,streakCount,preview:false};

  const fovChannel=makeObservedAdditiveChannel(
    ()=>game.camera.fov,
    value=>{game.camera.fov=value;game.camera.updateProjectionMatrix();},
    {min:52,max:80}
  );
  const bloomChannel=makeObservedAdditiveChannel(
    ()=>game.bloom?.strength??0,
    value=>{if(game.bloom)game.bloom.strength=value;},
    {min:0,max:2.4}
  );
  const exposureChannel=makeObservedAdditiveChannel(
    ()=>game.renderer?.toneMappingExposure??1,
    value=>{if(game.renderer)game.renderer.toneMappingExposure=value;},
    {min:.72,max:1.55}
  );

  const cueStart=sample=>{
    const audio=game.audio;
    if(!audio?.ctx||!audio.started)return;
    const t=Math.max(audio.ctx.currentTime+.015,audio.quantizedTime?.(1)||0);
    const dur=Math.max(.7,(audio.stepDur||.117)*18);
    audio.osc?.('sine',55,t,dur,.028,audio.fx);
    audio.osc?.('triangle',82.41,t,dur*.72,.012,audio.fx,-7);
    audio.pad?.(t,(audio.rootMidi||43)+12,Math.min(dur,(audio.beatDur||.469)*3.5),.018);
    if(sample?.beatPulse>.5)audio.duck?.(t,.28);
  };

  const cueSnap=()=>{
    const audio=game.audio;
    if(!audio?.ctx||!audio.started)return;
    const t=Math.max(audio.ctx.currentTime+.01,audio.quantizedTime?.(1)||0);
    audio.riserTick?.(t,.13);
    audio.syncNote?.(.96,t+(audio.stepDur||.117)*2);
  };

  const renderStreaks=(sample,dt,snap)=>{
    const env=sample.envelope||0;
    const timeFeel=sample.timeFeel??1;
    flowPhase=(flowPhase+dt*(4+timeFeel*12+snap*36))%43;
    const holdLength=.12+(1-timeFeel)*.24;
    const snapLength=snap*5.8;
    const length=holdLength+snapLength;
    const squeeze=.92+(1-timeFeel)*.08;

    for(let i=0;i<streakCount;i++){
      const s=seeds[i];
      const wobble=Math.sin(flowPhase*.12+i*.73)*.06;
      const radius=s.radius*(1+wobble)*(1+snap*.055);
      const x=Math.cos(s.angle)*radius;
      const y=Math.sin(s.angle)*radius*squeeze;
      let z=s.depth+flowPhase;
      if(z>-2)z-=43;
      const o=i*6;
      positions[o]=x;positions[o+1]=y;positions[o+2]=z;
      positions[o+3]=x*(1+snap*.016);positions[o+4]=y*(1+snap*.016);positions[o+5]=z-length*s.lengthBias;
    }
    geometry.attributes.position.needsUpdate=true;
    material.opacity=clamp(.035+env*.19+(sample.beatPulse||0)*.07+snap*.34,0,.62);
    const hue=.50+snap*.035+(sample.beatPulse||0)*.012;
    material.color.setHSL(hue,.92,.76);
  };

  const consume=(incoming,dt=1/60)=>{
    const sample=previewOverride||incoming||{};
    const active=sample.id==='TIME_FRACTURE';
    const env=active?(sample.envelope??0):0;
    const releaseAge=active&&sample.phase==='release'?1-env:0;
    const snap=active&&sample.phase==='release'?Math.sin(clamp(releaseAge,0,1)*Math.PI):0;

    if(active&&sample.sequence!==lastSequence){lastSequence=sample.sequence;cueStart(sample);}
    if(active&&sample.phase==='release'&&lastPhase!=='release')cueSnap();
    lastPhase=active?sample.phase:'idle';

    const fovIntent=active?(sample.fovOffset||0)-snap*1.4:0;
    const bloomIntent=active?(sample.bloomBoost||0)+snap*.34:0;
    const exposureIntent=active?(-.075*env+snap*.19):0;
    const fov=fovChannel(fovIntent);
    const bloom=bloomChannel(bloomIntent);
    const exposure=exposureChannel(exposureIntent);

    streaks.position.copy(game.camera.position);
    streaks.quaternion.copy(game.camera.quaternion);
    streaks.visible=active&&env>.001;
    if(streaks.visible)renderStreaks(sample,dt,snap);
    else material.opacity=0;

    state={
      active,phase:active?sample.phase:'idle',envelope:env,
      timeFeel:active?(sample.timeFeel??1):1,snap,streakCount,
      preview:!!previewOverride,visible:streaks.visible,
      fovApplied:fov.applied,bloomApplied:bloom.applied,exposureApplied:exposure.applied
    };
    return state;
  };

  directorApi.onFrame((sample,dt)=>consume(sample,dt));

  const api={
    preview:({envelope=1,phase='hold',timeFeel=.36,beatPulse=.55}={})=>{
      previewOverride={
        id:'TIME_FRACTURE',phase,sequence:9999,envelope:clamp(envelope,0,1),
        timeFeel:clamp(timeFeel,.2,1),beatPulse:clamp(beatPulse,0,1),
        fovOffset:-6*clamp(envelope,0,1),bloomBoost:.12*clamp(envelope,0,1)
      };
      return consume(previewOverride,1/60);
    },
    clearPreview:()=>{previewOverride=null;return consume({id:null,phase:'idle',envelope:0,timeFeel:1},1/60);},
    stats:()=>({...state}),
    consume
  };
  window.__pulseTimeFracture=api;
});
