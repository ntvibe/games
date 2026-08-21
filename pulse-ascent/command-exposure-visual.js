import * as THREE from 'three';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=t=>t*t*(3-2*t);
const mobile=()=>innerWidth<760||matchMedia('(pointer: coarse)').matches;
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches||!!window.__pulseSettings?.state?.comfort;
const AREA_COLORS=[0x55efff,0xffa95e,0x69ffe2,0xa6ff76,0xcbd2ff];
const TYPE_SIZE={drone:.72,node:.84,prism:.86,sentinel:1.02,tank:1.12};
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent&&window.__pulsePhraseTacticalOpening&&window.__pulseModelFusion?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});

function buildRig(enemy,color){
  const size=TYPE_SIZE[enemy.type]||.78,root=new THREE.Group();root.name='command-exposure-rig';enemy.group.add(root);
  const plateGeo=new THREE.TetrahedronGeometry(size*.32,0),plates=[];
  for(let i=0;i<4;i++){
    const a=i*Math.PI*.5+Math.PI*.25,g=new THREE.Group();g.userData.angle=a;
    const mat=new THREE.MeshStandardMaterial({color:0x060a0f,emissive:new THREE.Color(color).multiplyScalar(.18),emissiveIntensity:.1,metalness:.82,roughness:.3,transparent:true,opacity:.72,depthWrite:true,blending:THREE.NormalBlending,flatShading:true});
    const mesh=new THREE.Mesh(plateGeo,mat);mesh.scale.set(1,.52,.42);mesh.rotation.set(.55,a*.22,.25);g.add(mesh);
    const edgeMat=new THREE.LineBasicMaterial({color,transparent:true,opacity:.18,depthWrite:false,blending:THREE.NormalBlending});
    const edge=new THREE.LineSegments(new THREE.EdgesGeometry(plateGeo,25),edgeMat);edge.scale.copy(mesh.scale);edge.rotation.copy(mesh.rotation);edge.renderOrder=5;g.add(edge);
    root.add(g);plates.push({group:g,mesh,mat,edge,edgeMat,angle:a});
  }
  const coreMat=new THREE.MeshStandardMaterial({color:0x0a1118,emissive:color,emissiveIntensity:.08,metalness:.55,roughness:.22,transparent:true,opacity:0,depthWrite:false,blending:THREE.NormalBlending,flatShading:true});
  const core=new THREE.Mesh(new THREE.IcosahedronGeometry(size*.17,1),coreMat);core.position.z=.18;core.renderOrder=4;root.add(core);
  const coreEdgeMat=new THREE.LineBasicMaterial({color,transparent:true,opacity:0,depthWrite:false,blending:THREE.NormalBlending});
  const coreEdge=new THREE.LineSegments(new THREE.EdgesGeometry(core.geometry,20),coreEdgeMat);core.add(coreEdge);
  root.visible=false;
  return{root,plates,plateGeo,core,coreMat,coreEdge,coreEdgeMat,size,open:0,target:0,activatedAt:0,exposureRef:null,maxOpen:0};
}

function disposeRig(enemy,rig){
  if(rig.root.parent)rig.root.parent.remove(rig.root);
  rig.plateGeo.dispose();rig.core.geometry.dispose();
  for(const p of rig.plates){p.mat.dispose();p.edge.geometry.dispose();p.edgeMat.dispose();}
  rig.coreMat.dispose();rig.coreEdge.geometry.dispose();rig.coreEdgeMat.dispose();
  delete enemy.__commandExposureVisual;
}

waitFor().then(game=>{
  if(game.__commandExposureVisualInstalled)return;game.__commandExposureVisualInstalled=true;
  const tracked=new Map();let peak=0,total=0,lastType='';
  const area=()=>clamp((window.__pulseCampaign?.state?.selected||1)-1,0,4);
  const ensure=enemy=>{
    let rig=tracked.get(enemy);if(rig)return rig;
    rig=buildRig(enemy,AREA_COLORS[area()]||AREA_COLORS[0]);tracked.set(enemy,rig);total++;return rig;
  };
  function tick(now){
    const t=game.time||0,beatDur=game.audio?.beatDur||.46875,beat=((game.audio?.ctx?.currentTime||t)/beatDur)%1,pulse=Math.pow(Math.max(0,Math.cos(beat*Math.PI*2)),12),motion=reduced()?.38:1;
    let active=0;
    for(const enemy of game.enemies||[]){
      if(enemy.dead||!enemy.group||!enemy.__formationId||enemy.__formationVoice!==0)continue;
      const exposure=enemy.__phraseExposure,rig=ensure(enemy);
      if(exposure&&exposure.expires>now){
        if(rig.exposureRef!==exposure){rig.exposureRef=exposure;rig.activatedAt=now;lastType=enemy.type||'';}
        const age=now-rig.activatedAt,remaining=exposure.expires-now,openIn=smooth(clamp(age/180,0,1)),close=smooth(clamp(remaining/240,0,1));
        rig.target=openIn*close;active++;
      }else{rig.target=0;rig.exposureRef=null;}
      const dt=Math.min(.05,Math.max(.001,(now-(rig.lastNow||now-16))/1000));rig.lastNow=now;
      rig.open=THREE.MathUtils.lerp(rig.open,rig.target,1-Math.exp(-dt*(rig.target>rig.open?14:10)));rig.maxOpen=Math.max(rig.maxOpen,rig.open);peak=Math.max(peak,rig.open);
      const k=rig.open*motion,baseR=rig.size*.28,peel=rig.size*.3*k;
      rig.root.visible=rig.open>.012;
      rig.root.rotation.z=Math.sin(t*2.1)*.018*k;
      for(let i=0;i<rig.plates.length;i++){
        const p=rig.plates[i],a=p.angle,side=i%2?1:-1,r=baseR+peel;
        p.group.position.set(Math.cos(a)*r,Math.sin(a)*r*.82,.07+Math.sin(a)*.035*k);
        p.group.rotation.z=a-Math.PI*.25+side*.42*k;
        p.group.rotation.y=side*.34*k;p.group.rotation.x=-.12+.25*k;
        p.mat.opacity=.7-.18*k;p.mat.emissiveIntensity=.07+.09*k;
        p.edgeMat.opacity=.16+.28*k+pulse*.04*k;
      }
      rig.core.scale.setScalar(.45+.62*k+pulse*.035*k);
      rig.core.rotation.y+=dt*(.55+1.4*k);rig.core.rotation.x+=dt*.28*k;
      rig.coreMat.opacity=clamp(k*.72+pulse*.08*k,0,.82);rig.coreMat.emissiveIntensity=.06+.22*k+pulse*.08*k;
      rig.coreEdgeMat.opacity=clamp(k*.48+pulse*.1*k,0,.58);
      enemy.__commandExposureVisual={open:rig.open,plates:rig.plates.length,coreOpacity:rig.coreMat.opacity,normalBlending:rig.coreMat.blending===THREE.NormalBlending&&rig.plates.every(p=>p.mat.blending===THREE.NormalBlending&&p.edgeMat.blending===THREE.NormalBlending)};
    }
    for(const [enemy,rig] of [...tracked])if(enemy.dead||!enemy.group?.parent){disposeRig(enemy,rig);tracked.delete(enemy);}
    requestAnimationFrame(tick);
  }requestAnimationFrame(tick);
  window.__pulseCommandExposureVisual={
    refresh:()=>{for(const e of game.enemies||[])if(!e.dead&&e.__formationVoice===0)ensure(e);},
    stats:()=>({tracked:tracked.size,active:[...tracked.entries()].filter(([e,r])=>!e.dead&&r.open>.03).length,peak:Number(peak.toFixed(3)),total,lastType,normalBlending:[...tracked.values()].every(r=>r.coreMat.blending===THREE.NormalBlending&&r.plates.every(p=>p.mat.blending===THREE.NormalBlending&&p.edgeMat.blending===THREE.NormalBlending)),plates:[...tracked.values()].reduce((n,r)=>n+r.plates.length,0)})
  };
});
