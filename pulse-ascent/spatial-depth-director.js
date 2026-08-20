import * as THREE from 'three';
import {SETTINGS} from './util.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=THREE.MathUtils.lerp;
const TAU=Math.PI*2;
const mobile=()=>innerWidth<760||innerHeight<520||matchMedia('(pointer: coarse)').matches;
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});

function makeBand(scene,name,count,color,baseOpacity){
  const pos=new Float32Array(count*2*3),seed=new Float32Array(count*4);
  for(let i=0;i<count;i++){
    seed[i*4]=Math.random();seed[i*4+1]=Math.random();seed[i*4+2]=Math.random();seed[i*4+3]=Math.random();
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const mat=new THREE.LineBasicMaterial({color,transparent:true,opacity:baseOpacity,blending:THREE.NormalBlending,depthWrite:false,depthTest:true});
  const lines=new THREE.LineSegments(geo,mat);lines.name=name;lines.frustumCulled=false;scene.add(lines);
  return {name,count,pos,seed,geo,mat,lines,baseOpacity};
}

waitFor().then(game=>{
  if(game.__spatialDepthDirectorInstalled)return;game.__spatialDepthDirectorInstalled=true;
  const coarse=mobile();
  const bands=[
    makeBand(game.scene,'depth-near-flybys',coarse?12:18,0xa7f8ff,.16),
    makeBand(game.scene,'depth-mid-streaks',coarse?16:24,0x67dcea,.095),
    makeBand(game.scene,'depth-far-streaks',coarse?18:30,0x5b6f91,.055)
  ];
  const state={beat:0,phrase:0,lastFovOffset:0,lastSpeed:0,flybys:0,activeSegments:0};
  const ranges=[{near:-68,far:7,rad:[7,16],len:[5,13],speed:2.2},{near:-115,far:5,rad:[5,13],len:[2.5,7],speed:1.25},{near:-175,far:3,rad:[3.5,10],len:[1.2,3.8],speed:.72}];

  const reset=(band,i,r,forceFar=false)=>{
    const s=i*4,a=band.seed[s]*TAU,radius=lerp(r.rad[0],r.rad[1],band.seed[s+1]);
    band.seed[s]=Math.random();band.seed[s+1]=Math.random();band.seed[s+2]=Math.random();band.seed[s+3]=Math.random();
    const angle=a+(band.seed[s+3]-.5)*.65;
    const x=Math.cos(angle)*radius,y=Math.sin(angle)*radius*(.58+band.seed[s+2]*.5),z=forceFar?r.near:lerp(r.near,r.far-.5,band.seed[s+2]);
    const j=i*6;band.pos[j]=x;band.pos[j+1]=y;band.pos[j+2]=z;band.pos[j+3]=x;band.pos[j+4]=y;band.pos[j+5]=z-lerp(r.len[0],r.len[1],band.seed[s+1]);
  };
  bands.forEach((band,bi)=>{for(let i=0;i<band.count;i++)reset(band,i,ranges[bi]);band.geo.attributes.position.needsUpdate=true;});

  game.audio?.onStep?.((step)=>{
    if(step%4===0)state.beat=Math.max(state.beat,step%16===0?1:.5);
    if(step%16===0)state.phrase=1;
  });

  const baseUpdate=game.world.update.bind(game.world);
  game.world.update=(dt,t,energy,sync=0)=>{
    baseUpdate(dt,t,energy,sync);
    const running=!!game.running&&!document.hidden;
    const traversal=!!window.__pulseTraversalSetpieces?.active;
    const railActive=game.world.lines?.visible!==false;
    const perfTier=window.__pulsePerformanceDirector?.stats?.().tier??0;
    const section=clamp(game.section||0,0,4),sync01=clamp((game.sync||0)/100,0,1),energy01=clamp(energy||0,0,1);
    const intensity=running&&railActive?clamp(.32+section*.075+energy01*.28+sync01*.22,0,1):.08;
    state.beat=lerp(state.beat,0,1-Math.pow(.008,dt));state.phrase=lerp(state.phrase,0,1-Math.pow(.025,dt));
    const railDrive=clamp(window.__pulseRailCamera?.stats?.().drive??1,.84,1.16);
    const speed=SETTINGS.worldSpeed*(1+section*.075+sync01*.16+energy01*.22)*(1+state.beat*.08+state.phrase*.07)*railDrive;
    state.lastSpeed=lerp(state.lastSpeed,speed,clamp(dt*4,0,1));
    state.activeSegments=0;

    bands.forEach((band,bi)=>{
      const r=ranges[bi],budget=perfTier===2?(bi===0?.45:.5):perfTier===1?.72:1,visible=Math.max(2,Math.floor(band.count*budget));
      band.geo.setDrawRange(0,visible*2);state.activeSegments+=visible;
      for(let i=0;i<band.count;i++){
        const j=i*6;if(i>=visible)continue;
        const proximity=clamp((band.pos[j+2]-r.near)/(r.far-r.near),0,1),parallax=1+proximity*(bi===0?.6:bi===1?.28:.08);
        const dz=state.lastSpeed*r.speed*dt*(.7+intensity*.6+state.beat*.12)*parallax;
        band.pos[j+2]+=dz;band.pos[j+5]+=dz;
        const spread=1+dt*(bi===0?.035:.01)*proximity*(.4+intensity);
        band.pos[j]*=spread;band.pos[j+1]*=spread;band.pos[j+3]*=spread;band.pos[j+4]*=spread;
        if(band.pos[j+2]>r.far){reset(band,i,r,true);if(bi===0)state.flybys++;}
      }
      band.geo.attributes.position.needsUpdate=true;
      const depthWeight=bi===0?1:bi===1?.72:.45;
      band.mat.opacity=clamp(band.baseOpacity*(.45+intensity*.75+state.beat*.28)*depthWeight,0,.28);
    });

    // Add a small, reversible lens-speed contribution after the other camera directors.
    // Track our own prior offset so we never ratchet the FOV upward frame after frame.
    const baseFov=game.camera.fov-state.lastFovOffset;
    const targetOffset=traversal?0:railActive?clamp(.5+section*.32+energy01*1.25+sync01*.8+state.beat*.7+state.phrase*.65,0,4.6):0;
    state.lastFovOffset=lerp(state.lastFovOffset,targetOffset,clamp(dt*(targetOffset>state.lastFovOffset?5:2.2),0,1));
    game.camera.fov=clamp(baseFov+state.lastFovOffset,58,78);game.camera.updateProjectionMatrix();

    // Existing starfield remains the far-depth anchor. Increase perceived velocity without increasing count.
    if(game.world.starField?.material){
      const targetSize=(coarse?.085:.075)+intensity*.035+state.beat*.012;
      game.world.starField.material.size=lerp(game.world.starField.material.size,targetSize,clamp(dt*4,0,1));
      game.world.starField.material.opacity=lerp(game.world.starField.material.opacity,.5+intensity*.28,clamp(dt*2.5,0,1));
    }
  };

  window.__pulseSpatialDepth={
    bands,
    stats:()=>({mobile:coarse,beat:state.beat,phrase:state.phrase,speed:state.lastSpeed,flybys:state.flybys,segments:state.activeSegments,fovOffset:state.lastFovOffset,normalBlending:bands.every(b=>b.mat.blending===THREE.NormalBlending)})
  };
});
