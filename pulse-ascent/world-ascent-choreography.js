import * as THREE from 'three';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=THREE.MathUtils.lerp;
const TAU=Math.PI*2;

const waitForRuntime=()=>new Promise(resolve=>{
  const tick=()=>{
    const game=window.__pulseAscent;
    const directorApi=window.__pulseMetamorphosisDirector;
    if(game&&directorApi)return resolve({game,directorApi});
    requestAnimationFrame(tick);
  };
  tick();
});

const makeObservedAdditiveChannel=(read,write,{min=-Infinity,max=Infinity,tolerance=.035}={})=>{
  let lastOutput=null,lastApplied=0;
  return desired=>{
    const observed=read();
    const rebased=lastOutput===null||Math.abs(observed-lastOutput)>tolerance;
    const base=rebased?observed:observed-lastApplied;
    const output=clamp(base+desired,min,max);
    write(output);
    lastApplied=output-base;
    lastOutput=output;
    return{base,output,applied:lastApplied,rebased};
  };
};

waitForRuntime().then(({game,directorApi})=>{
  if(game.__worldAscentChoreographyInstalled)return;
  game.__worldAscentChoreographyInstalled=true;

  const mobile=innerWidth<750||innerHeight<520;
  const frameCount=mobile?14:22;
  const railCount=mobile?8:12;
  const root=new THREE.Group();
  root.name='world-ascent-choreography';
  root.visible=false;
  game.scene.add(root);

  const linePositions=[];
  const frameHalfW=8.8;
  const frameHalfH=5.4;
  for(let i=0;i<frameCount;i++){
    const z=-10-i*7.2;
    const scale=1+(i%5)*.055;
    const w=frameHalfW*scale,h=frameHalfH*scale;
    linePositions.push(
      -w,-h,z, w,-h,z,
       w,-h,z, w, h,z,
       w, h,z,-w, h,z,
      -w, h,z,-w,-h,z
    );
  }
  for(let i=0;i<railCount;i++){
    const a=i/railCount*TAU;
    const x=Math.cos(a)*10.4,y=Math.sin(a)*6.7;
    linePositions.push(x,y,-9,x,y,-165);
  }

  const frameGeometry=new THREE.BufferGeometry();
  frameGeometry.setAttribute('position',new THREE.Float32BufferAttribute(linePositions,3));
  const frameMaterial=new THREE.LineBasicMaterial({
    color:0xa7f8ff,transparent:true,opacity:0,
    blending:THREE.AdditiveBlending,depthWrite:false,depthTest:true
  });
  const frames=new THREE.LineSegments(frameGeometry,frameMaterial);
  frames.frustumCulled=false;
  root.add(frames);

  const ascentCount=mobile?72:112;
  const ascentPos=new Float32Array(ascentCount*2*3);
  const ascentSeeds=[];
  for(let i=0;i<ascentCount;i++){
    const side=i%2?-1:1;
    ascentSeeds.push({
      x:side*(4.8+((i*17)%43)/43*8.4),
      y:-6+((i*29)%47)/47*12,
      z:-8-((i*37)%101)/101*150,
      len:.38+((i*13)%19)/19*1.15
    });
  }
  const ascentGeometry=new THREE.BufferGeometry();
  ascentGeometry.setAttribute('position',new THREE.BufferAttribute(ascentPos,3));
  const ascentMaterial=new THREE.LineBasicMaterial({
    color:0xff74dd,transparent:true,opacity:0,
    blending:THREE.AdditiveBlending,depthWrite:false,depthTest:false
  });
  const ascentLines=new THREE.LineSegments(ascentGeometry,ascentMaterial);
  ascentLines.frustumCulled=false;
  root.add(ascentLines);

  const fovChannel=makeObservedAdditiveChannel(
    ()=>game.camera.fov,
    value=>{game.camera.fov=value;game.camera.updateProjectionMatrix();},
    {min:52,max:82}
  );
  const rollChannel=makeObservedAdditiveChannel(
    ()=>game.camera.rotation.z,
    value=>{game.camera.rotation.z=value;},
    {min:-.14,max:.14,tolerance:.012}
  );

  let previewOverride=null;
  let flow=0;
  let lastSequence=-1;
  let state={active:false,phase:'idle',envelope:0,worldRotation:0,cameraRoll:0,frameCount,ascentCount,preview:false};

  const cueStart=sample=>{
    const audio=game.audio;
    if(!audio?.ctx||!audio.started)return;
    const t=Math.max(audio.ctx.currentTime+.015,audio.quantizedTime?.(1)||0);
    audio.riserTick?.(t,.1);
    audio.osc?.('triangle',110,t,Math.max(.8,(audio.beatDur||.469)*2.8),.016,audio.fx,-5);
    if(sample?.beatPulse>.5)audio.syncNote?.(.74,t+(audio.stepDur||.117)*2);
  };

  const updateAscentLines=(env,beatPulse,dt)=>{
    flow=(flow+dt*(7+env*24+beatPulse*9))%157;
    for(let i=0;i<ascentCount;i++){
      const s=ascentSeeds[i];
      let z=s.z+flow;
      if(z>-5)z-=157;
      const yDrift=Math.sin(flow*.045+i*.73)*.24*env;
      const o=i*6;
      ascentPos[o]=s.x;ascentPos[o+1]=s.y+yDrift;ascentPos[o+2]=z;
      ascentPos[o+3]=s.x;ascentPos[o+4]=s.y+yDrift+s.len*(.5+env*1.8);ascentPos[o+5]=z-.08-env*.34;
    }
    ascentGeometry.attributes.position.needsUpdate=true;
  };

  const consume=(incoming,dt=1/60)=>{
    const sample=previewOverride||incoming||{};
    const active=sample.id==='WORLD_ASCENT';
    const env=active?(sample.envelope??0):0;
    const beatPulse=active?(sample.beatPulse??0):0;
    if(active&&sample.sequence!==lastSequence){lastSequence=sample.sequence;cueStart(sample);}

    const eased=env*env*(3-2*env);
    const worldRotation=eased*Math.PI*.5;
    const cameraRoll=eased*.055;
    const releaseKick=active&&sample.phase==='release'?Math.sin((1-env)*Math.PI)*.018:0;

    root.visible=active&&env>.001;
    root.rotation.z=worldRotation;
    root.position.y=-eased*1.6;
    root.position.z=eased*1.2;
    frameMaterial.opacity=root.visible?clamp(.06+env*.17+beatPulse*.08,0,.32):0;
    ascentMaterial.opacity=root.visible?clamp(.04+env*.24+beatPulse*.1,0,.42):0;
    frameMaterial.color.setHSL(.51+eased*.08,.92,.72);
    ascentMaterial.color.setHSL(.89-eased*.35,.94,.7);
    if(root.visible)updateAscentLines(env,beatPulse,dt);

    const fov=fovChannel(active?(sample.fovOffset||0)+releaseKick*24:0);
    const roll=rollChannel(active?cameraRoll+releaseKick:0);

    state={
      active,phase:active?sample.phase:'idle',envelope:env,
      worldRotation,cameraRoll:roll.applied,fovApplied:fov.applied,
      frameCount,ascentCount,visible:root.visible,preview:!!previewOverride
    };
    return state;
  };

  directorApi.onFrame((sample,dt)=>consume(sample,dt));

  const api={
    preview:({envelope=1,phase='hold',beatPulse=.55}={})=>{
      const e=clamp(envelope,0,1);
      previewOverride={
        id:'WORLD_ASCENT',phase,sequence:9998,envelope:e,
        beatPulse:clamp(beatPulse,0,1),fovOffset:2.5*e,roll:.2*e
      };
      return consume(previewOverride,1/60);
    },
    clearPreview:()=>{previewOverride=null;return consume({id:null,phase:'idle',envelope:0},1/60);},
    stats:()=>({...state}),
    consume
  };
  window.__pulseWorldAscent=api;
});
