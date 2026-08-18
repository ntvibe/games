import * as THREE from 'three';

const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=THREE.MathUtils.lerp;
const mobile=()=>innerWidth<760||matchMedia('(pointer: coarse)').matches;
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent&&window.__pulseGenerativeDirector?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});

const PROFILES=[
  {name:'SIGNAL BIRTH',colors:[0x42f6ff,0xff5bc9],speed:7.2},
  {name:'GLASS TEMPLE',colors:[0xffa34a,0x61d9ff],speed:5.5},
  {name:'CHROMA SEA',colors:[0x63ffda,0xff6bd8],speed:4.2},
  {name:'ORGANIC CODE',colors:[0xa2ff6d,0x67cfff],speed:6.1},
  {name:'NEURAL CATHEDRAL',colors:[0xeefcff,0xff5cd2],speed:5.0}
];

function makeWorld(scene,area){
  const root=new THREE.Group();root.name=`topology-world-${area+1}`;root.visible=false;scene.add(root);
  const segments=[];
  const add=(a,b)=>segments.push(a.clone(),b.clone());
  const depth=mobile()?112:156;
  const lanes=mobile()?7:10;

  if(area===0){
    // PCB canyon: Manhattan traces form walls and bridges instead of boxes.
    for(const side of [-1,1])for(let z=0;z<depth;z+=8){
      const x=side*(7.5+(z%24)/8*1.8),y=-3+(z%5)*1.5,zz=-18-z;
      add(new THREE.Vector3(x,y,zz),new THREE.Vector3(x,y+4.2+(z%3),zz));
      add(new THREE.Vector3(x,y+2,zz),new THREE.Vector3(x-side*(1.8+(z%4)*.45),y+2,zz-2.2));
      if(z%16===0)add(new THREE.Vector3(-x*.92,y+.4,zz-1),new THREE.Vector3(x*.92,y+.4,zz-1));
    }
  }else if(area===1){
    // Temple: nested perspective arches built from continuous contour ribs.
    for(let z=0;z<depth;z+=10){
      const zz=-22-z,r=5.2+(z%30)*.035,h=6.2+(z%20)*.03;
      const steps=10;
      let prev=new THREE.Vector3(-r,-3.5,zz);
      for(let i=1;i<=steps;i++){
        const u=i/steps,a=Math.PI*u;
        const p=new THREE.Vector3(Math.cos(a)*r,Math.sin(a)*h-3.5,zz);
        add(prev,p);prev=p;
      }
      if(z%20===0){add(new THREE.Vector3(-r,-3.5,zz),new THREE.Vector3(-r*.72,3.2,zz-4));add(new THREE.Vector3(r,-3.5,zz),new THREE.Vector3(r*.72,3.2,zz-4));}
    }
  }else if(area===2){
    // Chroma sea: long flowing ribbons made only from connected curves.
    for(let lane=0;lane<lanes;lane++){
      let prev=null;
      for(let k=0;k<34;k++){
        const z=-18-k*4.3-lane*2.3,a=k*.42+lane*.77,r=4.4+lane*.58;
        const p=new THREE.Vector3(Math.sin(a)*r,Math.cos(a*.73)*r*.52,z);
        if(prev)add(prev,p);prev=p;
      }
    }
  }else if(area===3){
    // Organic code: deterministic branching nerves growing through depth.
    for(let trunk=0;trunk<lanes;trunk++){
      const side=trunk%2?-1:1;let p=new THREE.Vector3(side*(2.2+(trunk%4)*1.6),-3+(trunk%3)*2,-18-trunk*5);
      for(let k=0;k<18;k++){
        const q=p.clone().add(new THREE.Vector3(Math.sin(k*.83+trunk)*1.2,Math.cos(k*.61+trunk)*.75,-5.2));add(p,q);
        if(k%3===1){const branch=q.clone().add(new THREE.Vector3(side*(1.5+(k%4)*.38),Math.sin(trunk+k)*1.3,-2.4));add(q,branch);}
        p=q;
      }
    }
  }else{
    // Cathedral: vaults, vertical nerves and crossing rose-window rings.
    for(let z=0;z<depth;z+=12){
      const zz=-20-z,w=6.4+(z%36)*.025,h=7.5;
      add(new THREE.Vector3(-w,-4,zz),new THREE.Vector3(-w,2.2,zz));add(new THREE.Vector3(w,-4,zz),new THREE.Vector3(w,2.2,zz));
      let prev=new THREE.Vector3(-w,2.2,zz);
      for(let i=1;i<=12;i++){const u=i/12,a=Math.PI*u,p=new THREE.Vector3(Math.cos(a)*w,Math.sin(a)*h*.72+2.2,zz);add(prev,p);prev=p;}
      if(z%24===0){for(let spoke=0;spoke<8;spoke++){const a=spoke/8*TAU;add(new THREE.Vector3(0,2.2,zz-1),new THREE.Vector3(Math.cos(a)*3.1,2.2+Math.sin(a)*3.1,zz-1));}}
    }
  }

  const pos=new Float32Array(segments.length*3);segments.forEach((p,i)=>{pos[i*3]=p.x;pos[i*3+1]=p.y;pos[i*3+2]=p.z;});
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const mat=new THREE.LineBasicMaterial({color:PROFILES[area].colors[0],transparent:true,opacity:.13,blending:THREE.AdditiveBlending,depthWrite:false});
  const lines=new THREE.LineSegments(geo,mat);lines.frustumCulled=false;root.add(lines);

  const packetCount=mobile()?22:36,packetPos=new Float32Array(packetCount*3),packetGeo=new THREE.BufferGeometry();packetGeo.setAttribute('position',new THREE.BufferAttribute(packetPos,3));
  const packetMat=new THREE.PointsMaterial({color:PROFILES[area].colors[1],size:mobile()?.055:.045,transparent:true,opacity:.7,blending:THREE.AdditiveBlending,depthWrite:false,sizeAttenuation:true});
  const packets=new THREE.Points(packetGeo,packetMat);packets.frustumCulled=false;root.add(packets);
  return {root,lines,geo,mat,segments,packetPos,packetGeo,packetMat,packetCount,totalSegments:segments.length/2};
}

waitFor().then(game=>{
  if(game.__topologyWorldsInstalled)return;game.__topologyWorldsInstalled=true;
  const worlds=PROFILES.map((_,i)=>makeWorld(game.scene,i));
  let current=-1,lastLayer=-1,accent=0;
  const area=()=>clamp((window.__pulseCampaign?.state?.selected||1)-1,0,4);
  const layer=()=>clamp(game.section||0,0,4);

  const apply=()=>{
    current=area();lastLayer=layer();accent=1;
    worlds.forEach((w,i)=>w.root.visible=i===current);
    const w=worlds[current],reveal=[.25,.42,.61,.8,1][lastLayer];
    w.geo.setDrawRange(0,Math.floor(w.totalSegments*reveal)*2);
    game.showCallout?.(`TOPOLOGY ${String(lastLayer+1).padStart(2,'0')} // ${PROFILES[current].name}`,.9);
  };
  apply();

  const baseSetSection=game.setSection.bind(game);
  game.setSection=(i,name)=>{baseSetSection(i,name);apply();};

  const baseScoreTiming=game.scoreTiming.bind(game);
  game.scoreTiming=(q,count)=>{baseScoreTiming(q,count);if(q>.88)accent=Math.max(accent,.55+count/18);};

  const baseUpdate=game.world.update.bind(game.world);
  game.world.update=(dt,t,energy,sync=0)=>{
    baseUpdate(dt,t,energy,sync);
    if(area()!==current||layer()!==lastLayer)apply();
    accent=lerp(accent,0,1-Math.pow(.02,dt));
    const w=worlds[current],profile=PROFILES[current],reveal=[.25,.42,.61,.8,1][lastLayer];
    w.mat.opacity=clamp(.065+energy*.045+sync*.055+accent*.04,.05,.19);
    w.mat.color.set(profile.colors[0]).lerp(new THREE.Color(profile.colors[1]),.16+.12*Math.sin(t*.22+current));
    w.packetMat.opacity=clamp(.35+energy*.2+sync*.18+accent*.18,.28,.82);
    w.packetMat.size=(mobile()?.045:.038)+energy*.012+accent*.008;
    w.root.position.z=(t*profile.speed)%12;
    w.root.rotation.z=Math.sin(t*(.055+current*.012))*(.012+current*.006);
    if(current===2)w.root.rotation.y=Math.sin(t*.08)*.08;
    if(current===3)w.root.scale.setScalar(1+Math.sin(t*.6)*.008+accent*.008);

    const active=Math.max(1,Math.floor(w.totalSegments*reveal));
    for(let i=0;i<w.packetCount;i++){
      const phase=(t*(.18+current*.025)+i/w.packetCount*1.7)%1;
      const seg=Math.min(active-1,Math.floor(((i*13)%active+phase*active)%active));
      const a=w.segments[seg*2],b=w.segments[seg*2+1],f=(phase*active)%1,j=i*3;
      w.packetPos[j]=lerp(a.x,b.x,f);w.packetPos[j+1]=lerp(a.y,b.y,f);w.packetPos[j+2]=lerp(a.z,b.z,f);
    }
    w.packetGeo.attributes.position.needsUpdate=true;
  };

  window.__pulseTopologyWorlds={worlds,profiles:PROFILES,get area(){return current+1;},get layer(){return lastLayer+1;},stats:()=>({area:current+1,layer:lastLayer+1,segments:worlds[current]?.totalSegments||0})};
});
