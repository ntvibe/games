import * as THREE from 'three';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=THREE.MathUtils.lerp;
const mobile=()=>innerWidth<760||matchMedia('(pointer: coarse)').matches;
const reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent?.world?.humanRig&&window.__pulsePilotVolume?.plates&&window.__pulseFlowResonance?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});

const PAIRS=[[0,1],[0,2],[1,2],[1,3],[2,4],[1,5],[2,6],[5,6],[5,7],[6,8],[3,5],[4,6]];
const TIER_TARGET=[0,.28,.64,1];

waitFor().then(game=>{
  if(game.__pilotFlowResonanceInstalled)return;game.__pilotFlowResonanceInstalled=true;
  const rig=game.world.humanRig,volume=window.__pulsePilotVolume;
  const joints=[rig.headPivot,rig.shoulderL,rig.shoulderR,rig.elbowL,rig.elbowR,rig.hipL,rig.hipR,rig.kneeL,rig.kneeR];
  const locals=joints.map(()=>new THREE.Vector3()),tmp=new THREE.Vector3();
  const state={intensity:0,pulse:0,tier:0,traceOpacity:0,pointOpacity:0,dematerialization:0};

  const root=new THREE.Group();root.name='pilot-flow-resonance';rig.root.add(root);
  const tracePos=new Float32Array(PAIRS.length*6),traceGeo=new THREE.BufferGeometry();traceGeo.setAttribute('position',new THREE.BufferAttribute(tracePos,3));
  const traceMat=new THREE.LineBasicMaterial({color:0x7ef4ff,transparent:true,opacity:0,depthWrite:false,blending:THREE.NormalBlending});
  const trace=new THREE.LineSegments(traceGeo,traceMat);trace.renderOrder=3;root.add(trace);

  const pointCount=mobile()?12:20,pointPos=new Float32Array(pointCount*3),pointGeo=new THREE.BufferGeometry();pointGeo.setAttribute('position',new THREE.BufferAttribute(pointPos,3));
  const pointMat=new THREE.PointsMaterial({color:0xff74d7,size:mobile()?.026:.031,transparent:true,opacity:0,depthWrite:false,blending:THREE.NormalBlending,sizeAttenuation:true});
  const points=new THREE.Points(pointGeo,pointMat);points.renderOrder=4;root.add(points);

  addEventListener('pulse:flow-tier',e=>{if((e.detail?.tier||0)>0)state.pulse=1;});

  function updateJointGeometry(t,intensity,tier){
    rig.root.updateWorldMatrix(true,true);
    for(let i=0;i<joints.length;i++){
      joints[i].getWorldPosition(tmp);locals[i].copy(tmp);rig.root.worldToLocal(locals[i]);
    }
    let o=0;
    for(const [a,b] of PAIRS){
      const pa=locals[a],pb=locals[b];tracePos[o++]=pa.x;tracePos[o++]=pa.y;tracePos[o++]=pa.z;tracePos[o++]=pb.x;tracePos[o++]=pb.y;tracePos[o++]=pb.z;
    }
    traceGeo.attributes.position.needsUpdate=true;

    const signal=clamp((intensity-.18)/.55,0,1),demat=tier>=3?clamp((intensity-.62)/.38,0,1):0;
    for(let i=0;i<pointCount;i++){
      const base=locals[(i*5+2)%locals.length],a=t*(1.05+(i%5)*.08)+i*2.17,r=(.025+(i%4)*.012)+demat*.09;
      const j=i*3;pointPos[j]=base.x+Math.cos(a)*r*signal;pointPos[j+1]=base.y+Math.sin(a*1.17)*r*signal;pointPos[j+2]=base.z+Math.sin(a*.73)*r*.65*signal;
    }
    pointGeo.attributes.position.needsUpdate=true;
    state.dematerialization=demat;
  }

  const baseUpdate=game.world.update.bind(game.world);
  game.world.update=(dt,t,energy,sync=0)=>{
    baseUpdate(dt,t,energy,sync);
    const flow=window.__pulseFlowResonance?.stats?.()||{tier:0,resonance:0},tier=clamp(flow.tier|0,0,3),comfort=!!window.__pulseSettings?.state?.comfort||reducedMotion(),previousTier=state.tier;
    state.tier=tier;state.intensity=lerp(state.intensity,TIER_TARGET[tier],1-Math.exp(-dt*(tier>previousTier?5.5:4.2)));state.pulse=lerp(state.pulse,0,1-Math.exp(-dt*6.5));
    const intensity=state.intensity,motionScale=comfort?.32:1;
    updateJointGeometry(t,intensity,tier);

    const area=clamp((window.__pulseCampaign?.state?.selected||1)-1,0,4),colors=window.__pulseTopologyWorlds?.profiles?.[area]?.colors||[0x7ef4ff,0xff74d7];
    traceMat.color.set(colors[0]??0x7ef4ff);pointMat.color.set(colors[1]??0xff74d7);
    const signal=clamp((intensity-.18)/.55,0,1),demat=state.dematerialization;
    state.traceOpacity=signal*(mobile()?.2:.27)+state.pulse*.07;
    state.pointOpacity=demat*(mobile()?.28:.4)+signal*.055+state.pulse*.05;
    traceMat.opacity=clamp(state.traceOpacity,0,.38);pointMat.opacity=clamp(state.pointOpacity,0,.5);root.visible=intensity>.012||state.pulse>.02;

    // FLOW alters the pilot silhouette in stages: posture first, signal skeleton second, controlled dematerialization at ASCENT.
    const drive=intensity*motionScale;
    rig.root.rotation.x-=drive*.022;rig.torso.rotation.x-=drive*.034;rig.headPivot.rotation.x-=drive*.014;
    rig.shoulderL.rotation.z+=drive*.032;rig.shoulderR.rotation.z-=drive*.032;rig.elbowL.rotation.x+=drive*.025;rig.elbowR.rotation.x+=drive*.025;
    rig.hipL.rotation.z+=drive*.012;rig.hipR.rotation.z-=drive*.012;

    const plates=volume.plates||[];
    if(demat>0){
      plates.forEach((m,i)=>{
        if(!m?.material)return;
        const selected=i%2===0||i%5===0;if(!selected)return;
        m.material.opacity*=1-demat*(mobile()?.24:.36);
        if(m.userData?.edge?.material)m.userData.edge.material.opacity=clamp(m.userData.edge.material.opacity+demat*.18,0,.9);
      });
    }
    if(volume.halo){volume.halo.scale.setScalar(1+signal*.05+demat*.08+state.pulse*.035);volume.halo.material.opacity=clamp(volume.halo.material.opacity+signal*.05+demat*.07,0,.55);}
  };

  window.__pulsePilotFlowResonance={
    root,trace,points,
    stats:()=>({tier:state.tier,intensity:Number(state.intensity.toFixed(3)),traceOpacity:Number(traceMat.opacity.toFixed(3)),pointOpacity:Number(pointMat.opacity.toFixed(3)),dematerialization:Number(state.dematerialization.toFixed(3)),plates:volume.plates?.length||0,normalBlending:traceMat.blending===THREE.NormalBlending&&pointMat.blending===THREE.NormalBlending})
  };
});
