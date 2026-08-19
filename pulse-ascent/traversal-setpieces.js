import * as THREE from 'three';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=THREE.MathUtils.lerp;
const TAU=Math.PI*2;
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent&&window.__pulseAreaSetpieces&&window.__pulseTopologyWorlds?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});

const MODES=['LANE COLLAPSE','ROTATING PASSAGE','CURRENT RIDE','BRANCH ROUTE','CATHEDRAL GATE'];
const COLORS=[0x59f6ff,0xffb46a,0x7dffe4,0xa5ff78,0xd7e9ff];

function makePath(scene){
  const mobile=innerWidth<760,count=mobile?52:76;
  const root=new THREE.Group();root.name='setpiece-traversal';root.visible=false;scene.add(root);
  const lines=[];
  for(let lane=0;lane<3;lane++){
    const pos=new Float32Array(count*3),geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
    const mat=new THREE.LineBasicMaterial({color:COLORS[0],transparent:true,opacity:lane===1?.18:.1,blending:THREE.NormalBlending,depthWrite:false,depthTest:true});
    const line=new THREE.Line(geo,mat);line.frustumCulled=false;root.add(line);lines.push({line,geo,mat,pos,lane});
  }
  const packetCount=mobile?14:22,packetPos=new Float32Array(packetCount*3),packetGeo=new THREE.BufferGeometry();packetGeo.setAttribute('position',new THREE.BufferAttribute(packetPos,3));
  const packetMat=new THREE.PointsMaterial({color:0xffffff,size:mobile?.045:.035,transparent:true,opacity:.35,blending:THREE.NormalBlending,depthWrite:false,sizeAttenuation:true});
  const packets=new THREE.Points(packetGeo,packetMat);packets.frustumCulled=false;root.add(packets);
  return {root,lines,count,packets,packetGeo,packetMat,packetPos,packetCount};
}

waitFor().then(game=>{
  if(game.__traversalSetpiecesInstalled)return;game.__traversalSetpiecesInstalled=true;
  const path=makePath(game.scene);
  let active=false,area=0,section=0,mode=MODES[0],phase=0,blend=0,lastSetpieceKey='',routeBias=0;

  const selectedArea=()=>clamp((window.__pulseCampaign?.state?.selected||1)-1,0,4);
  const setpieceState=()=>window.__pulseAreaSetpieces?.stats?.()||{};
  const topology=()=>window.__pulseTopologyWorlds?.worlds?.[area];

  const begin=(stats)=>{
    area=clamp((stats.area||1)-1,0,4);section=clamp(stats.section||1,1,3);mode=MODES[area];phase=0;blend=0;routeBias=0;
    path.root.visible=true;path.lines.forEach(l=>l.mat.color.set(COLORS[area]));path.packetMat.color.set(COLORS[area]);
    game.showCallout?.(`${mode} // TRAVERSAL`,.9);
  };

  const shape=(u,t,lane)=>{
    const z=4-u*105,laneOffset=(lane-1)*1.35;
    let x=laneOffset,y=0,bank=0;
    if(area===0){ // Signal Birth: data lanes squeeze and cross like a collapsing bus interchange.
      const squeeze=.45+.55*Math.abs(Math.sin(u*Math.PI*2+phase*.55));
      x=laneOffset*squeeze+Math.sin(u*11+phase*.85)*(.25+.18*section);
      y=Math.sin(u*7+phase*.45)*.32;bank=Math.sin(u*8+phase)*.12;
    }else if(area===1){ // Glass Temple: corkscrew passage around a stable central firing corridor.
      const a=u*TAU*(1.2+.18*section)+phase*.35,r=(1.2+lane*.65)*(1-u*.25);
      x=Math.cos(a)*r;y=Math.sin(a)*r*.62;bank=Math.sin(a)*.22;
    }else if(area===2){ // Chroma Sea: broad current with smooth vertical swells.
      const a=u*TAU*1.6+phase*.32;
      x=Math.sin(a)*2.6+laneOffset*.45;y=Math.sin(a*.63+lane*.7)*1.35;bank=Math.cos(a)*.16;
    }else if(area===3){ // Organic Code: pointer chooses which branch the traversal favors.
      const fork=Math.tanh((u-.42)*8),chosen=routeBias||Math.sign(game.pointer?.x||.001);
      x=laneOffset*.55+chosen*fork*(1.7+.35*section)+Math.sin(u*13+phase)*.28;
      y=Math.sin(u*5.5+lane*.9)*.75+fork*.35;bank=chosen*fork*.18;
    }else{ // Neural Cathedral: repeated gates narrow, then open on the beat.
      const gate=Math.pow(Math.abs(Math.sin(u*Math.PI*(5+section)+phase*.25)),2);
      x=laneOffset*(.55+gate*.85);y=Math.sin(u*Math.PI*(4+section))*gate*.45;bank=Math.sin(u*9+phase*.35)*.07;
    }
    return {x,y,z,bank};
  };

  const updateGeometry=(t)=>{
    for(const l of path.lines){
      const arr=l.pos;
      for(let i=0;i<path.count;i++){
        const u=i/(path.count-1),p=shape(u,t,l.lane),j=i*3;arr[j]=p.x;arr[j+1]=p.y;arr[j+2]=p.z;
      }
      l.geo.attributes.position.needsUpdate=true;
      l.mat.opacity=(l.lane===1?.16:.085)*blend*(.8+.2*Math.sin(t*2+l.lane));
    }
    for(let i=0;i<path.packetCount;i++){
      const u=(i/path.packetCount+t*(.12+.02*section))%1,p=shape(u,t,i%3),j=i*3;
      path.packetPos[j]=p.x;path.packetPos[j+1]=p.y;path.packetPos[j+2]=p.z;
    }
    path.packetGeo.attributes.position.needsUpdate=true;path.packetMat.opacity=.12+blend*.42;
  };

  const baseUpdate=game.world.update.bind(game.world);
  game.world.update=(dt,t,energy,sync=0)=>{
    baseUpdate(dt,t,energy,sync);
    const stats=setpieceState(),key=`${stats.area||0}:${stats.section||0}:${stats.name||''}`;
    const nowActive=!!stats.active;
    if(nowActive&&(!active||key!==lastSetpieceKey)){lastSetpieceKey=key;begin(stats);}
    active=nowActive;blend=lerp(blend,active?1:0,1-Math.pow(active?.015:.08,dt));phase+=dt*(1.1+energy*.5+section*.12);
    if(area===3&&active&&Math.abs(game.pointer?.x||0)>.16)routeBias=lerp(routeBias,Math.sign(game.pointer.x),clamp(dt*4,0,1));
    if(blend<.015&&!active){path.root.visible=false;return;}path.root.visible=true;updateGeometry(t);

    const center=shape(.18,t,1),late=shape(.48,t,1);
    const targetX=center.x*.18*blend,targetY=center.y*.13*blend,targetRoll=(center.bank+late.bank*.45)*blend;
    game.camera.position.x=lerp(game.camera.position.x,targetX+(game.pointer?.x||0)*.3,clamp(dt*2.5,0,1));
    game.camera.position.y=lerp(game.camera.position.y,targetY+(game.pointer?.y||0)*.18,clamp(dt*2.5,0,1));
    game.camera.rotation.z=lerp(game.camera.rotation.z,targetRoll-(game.pointer?.x||0)*.018,clamp(dt*3,0,1));
    const targetFov=67+blend*(2.5+section*.85)+(area===2?1.6:0);game.camera.fov=lerp(game.camera.fov,targetFov,clamp(dt*2.3,0,1));game.camera.updateProjectionMatrix();

    const topo=topology();if(topo?.root){
      topo.root.rotation.z=lerp(topo.root.rotation.z,-targetRoll*.7,clamp(dt*1.5,0,1));
      topo.root.position.x=lerp(topo.root.position.x,-targetX*.9,clamp(dt*1.2,0,1));
      topo.root.position.y=lerp(topo.root.position.y,-targetY*.75,clamp(dt*1.2,0,1));
    }
    if(active&&section>=2&&Math.sin(phase*2.2)>.96)game.world.pulse?.(.18+.09*section);
  };

  window.__pulseTraversalSetpieces={
    get active(){return active;},get area(){return area+1;},get section(){return section;},get mode(){return mode;},
    stats:()=>({active,area:area+1,section,mode,blend,routeBias,visible:path.root.visible,pathPoints:path.count,packets:path.packetCount})
  };
});
