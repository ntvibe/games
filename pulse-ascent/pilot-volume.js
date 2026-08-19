import * as THREE from 'three';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=THREE.MathUtils.lerp;
const mobile=()=>innerWidth<760||matchMedia('(pointer: coarse)').matches;
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent?.world?.humanRig&&window.__pilotTransformation?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});

const STAGES=[
  {name:'BLOCK',solid:.86,edge:.22,plate:.78},
  {name:'FACET',solid:.72,edge:.32,plate:.88},
  {name:'SIGNAL',solid:.48,edge:.48,plate:.68},
  {name:'ASCEND',solid:.2,edge:.7,plate:.36}
];

function mat(color=0x0a1018,emissive=0x62efff){
  return new THREE.MeshStandardMaterial({color,emissive,emissiveIntensity:.035,metalness:.78,roughness:.38,transparent:true,opacity:.72,depthWrite:true,blending:THREE.NormalBlending,flatShading:true});
}
function edge(geo,color=0x8df7ff,opacity=.28){return new THREE.LineSegments(new THREE.EdgesGeometry(geo,28),new THREE.LineBasicMaterial({color,transparent:true,opacity,depthWrite:false,blending:THREE.NormalBlending}));}
function addShell(parent,geo,{pos=[0,0,0],rot=[0,0,0],scale=[1,1,1],color=0x0a1018,emissive=0x62efff,edgeColor=0x8df7ff}={}){
  const m=new THREE.Mesh(geo,mat(color,emissive));m.position.set(...pos);m.rotation.set(...rot);m.scale.set(...scale);m.castShadow=false;m.receiveShadow=false;parent.add(m);
  const e=edge(geo,edgeColor,.26);m.add(e);m.userData.edge=e;return m;
}

function build(game){
  const rig=game.world.humanRig,root=new THREE.Group();root.name='pilot-volume-shell';rig.root.add(root);
  const cyan=0x65f3ff,pink=0xff64d6,white=0xeaffff,dark=0x070b12;
  const solids=[],plates=[];
  const add=(...args)=>{const m=addShell(...args);solids.push(m);return m;};

  add(root,new THREE.CylinderGeometry(.3,.47,.92,6,2,false),{pos:[0,.44,0],rot:[0,Math.PI/6,0],color:dark,emissive:cyan});
  add(root,new THREE.BoxGeometry(.52,.28,.38),{pos:[0,-.2,0],rot:[0,Math.PI/4,0],color:dark,emissive:pink});
  add(rig.headPivot,new THREE.IcosahedronGeometry(.27,1),{scale:[.8,1.06,.82],color:dark,emissive:white});

  const chest=add(root,new THREE.OctahedronGeometry(.32,0),{pos:[0,.62,.05],scale:[1.25,.68,.7],color:dark,emissive:cyan});plates.push(chest);
  const sternum=add(root,new THREE.BoxGeometry(.13,.62,.12),{pos:[0,.47,.23],color:dark,emissive:pink});plates.push(sternum);
  const pelvis=add(root,new THREE.OctahedronGeometry(.3,0),{pos:[0,-.33,0],scale:[1.25,.6,.82],color:dark,emissive:pink});plates.push(pelvis);

  const limb=(pivot,len,radius,color,side=1)=>{
    const upper=add(pivot,new THREE.CylinderGeometry(radius*.72,radius,len,6,1,false),{pos:[0,-len*.5,0],color:dark,emissive:color});
    const blade=add(pivot,new THREE.BoxGeometry(radius*.8,len*.7,radius*.42),{pos:[side*radius*.62,-len*.43,-radius*.28],rot:[0,0,side*.08],color:dark,emissive:color});plates.push(blade);return upper;
  };
  limb(rig.shoulderL,.54,.13,cyan,-1);limb(rig.shoulderR,.54,.13,cyan,1);
  limb(rig.elbowL,.5,.105,pink,-1);limb(rig.elbowR,.5,.105,pink,1);
  limb(rig.hipL,.68,.15,cyan,-1);limb(rig.hipR,.68,.15,cyan,1);
  limb(rig.kneeL,.64,.12,pink,-1);limb(rig.kneeR,.64,.12,pink,1);

  for(const [pivot,side] of [[rig.shoulderL,-1],[rig.shoulderR,1],[rig.hipL,-1],[rig.hipR,1]]){
    const p=add(pivot,new THREE.OctahedronGeometry(.12,0),{scale:[1.2,.75,.9],pos:[side*.02,0,0],color:dark,emissive:white});plates.push(p);
  }

  const backFinL=add(root,new THREE.BoxGeometry(.08,.72,.28),{pos:[-.3,.38,-.24],rot:[-.18,0,-.12],color:dark,emissive:cyan});
  const backFinR=add(root,new THREE.BoxGeometry(.08,.72,.28),{pos:[.3,.38,-.24],rot:[-.18,0,.12],color:dark,emissive:pink});plates.push(backFinL,backFinR);

  const halo=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.TorusGeometry(.5,.018,4,40)),new THREE.LineBasicMaterial({color:0xbafcff,transparent:true,opacity:.24,depthWrite:false,blending:THREE.NormalBlending}));halo.rotation.x=Math.PI/2;halo.position.y=.5;root.add(halo);

  return {root,solids,plates,halo,rig};
}

waitFor().then(game=>{
  if(game.__pilotVolumeInstalled)return;game.__pilotVolumeInstalled=true;
  const v=build(game);let flash=0;
  const oldBody=game.world.avatarBody;if(oldBody)oldBody.visible=false;

  const baseTrigger=window.__pilotTransformation.trigger?.bind(window.__pilotTransformation);
  if(baseTrigger)window.__pilotTransformation.trigger=(evolution,announce=true)=>{flash=1;return baseTrigger(evolution,announce);};

  const baseUpdate=game.world.update.bind(game.world);
  game.world.update=(dt,t,energy,sync=0)=>{
    baseUpdate(dt,t,energy,sync);
    const form=window.__pilotTransformation?.form??0,lo=Math.floor(form),hi=Math.min(3,Math.ceil(form)),mix=form-lo;
    const stage={
      solid:lerp(STAGES[lo].solid,STAGES[hi].solid,mix),
      edge:lerp(STAGES[lo].edge,STAGES[hi].edge,mix),
      plate:lerp(STAGES[lo].plate,STAGES[hi].plate,mix)
    };
    flash=lerp(flash,0,1-Math.pow(.002,dt));
    const beat=game.audio?.beatDur?((game.audio.ctx?.currentTime||t)/game.audio.beatDur)%1:0,pulse=Math.pow(Math.max(0,Math.cos(beat*Math.PI*2)),12);
    v.solids.forEach(m=>{
      const isPlate=v.plates.includes(m),target=(isPlate?stage.plate:stage.solid)*(mobile()?.78:1);
      m.material.opacity=clamp(target+flash*.08,0,.9);m.material.emissiveIntensity=.025+energy*.025+sync*.035+pulse*.02+flash*.035;
      if(m.userData.edge)m.userData.edge.material.opacity=clamp(stage.edge+(isPlate?.05:0)+pulse*.04+flash*.08,.08,.82);
    });
    v.halo.material.opacity=.1+stage.edge*.28+sync*.08+pulse*.03;v.halo.rotation.z+=dt*(.22+sync*.5);
    v.root.rotation.y=Math.sin(t*.45)*.018;v.root.scale.setScalar(1+flash*.035+pulse*.008);
    if(form>2.25){
      const dissolve=clamp((form-2.25)/.75,0,1);
      v.solids.forEach((m,i)=>{if(i%3===0)m.material.opacity*=1-dissolve*.62;});
    }
  };

  window.__pulsePilotVolume={
    root:v.root,
    stats:()=>({stage:STAGES[Math.round(clamp(window.__pilotTransformation?.form??0,0,3))].name,solids:v.solids.length,plates:v.plates.length,mobile:mobile(),normalBlending:v.solids.every(m=>m.material.blending===THREE.NormalBlending)})
  };
});
