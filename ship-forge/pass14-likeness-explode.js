import * as THREE from 'three';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';

const M={
  graphite:new THREE.MeshPhysicalMaterial({color:0x0f151c,roughness:.38,metalness:.94,clearcoat:.15,clearcoatRoughness:.22}),
  armor:new THREE.MeshPhysicalMaterial({color:0x303b47,roughness:.32,metalness:.90,clearcoat:.14,clearcoatRoughness:.21}),
  armorLight:new THREE.MeshPhysicalMaterial({color:0x53606c,roughness:.28,metalness:.88,clearcoat:.15,clearcoatRoughness:.20}),
  dark:new THREE.MeshStandardMaterial({color:0x151c24,roughness:.34,metalness:.95}),
  steel:new THREE.MeshStandardMaterial({color:0x74828f,roughness:.21,metalness:.99}),
  red:new THREE.MeshPhysicalMaterial({color:0xb72225,roughness:.27,metalness:.78,clearcoat:.18,clearcoatRoughness:.19}),
  soot:new THREE.MeshStandardMaterial({color:0x07090b,roughness:.80,metalness:.44})
};

const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const hash=s=>{let h=2166136261>>>0;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
const unit=(h,shift=0)=>((h>>>shift)&255)/255;
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const shadow=m=>{m.castShadow=m.receiveShadow=true;return m};
function hull(g,name,points,pos,material,rot=[0,0,0]){const m=shadow(new THREE.Mesh(new ConvexGeometry(points.map(p=>new THREE.Vector3(...p))),material));m.name=name;m.position.set(...pos);m.rotation.set(...rot);g.add(m);return m}
function box(g,name,size,pos,material,rot=[0,0,0]){const m=shadow(new THREE.Mesh(new THREE.BoxGeometry(...size),material));m.name=name;m.position.set(...pos);m.rotation.set(...rot);g.add(m);return m}
function tube(g,name,a,b,r,material,segments=8){const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),d=vb.clone().sub(va),m=shadow(new THREE.Mesh(new THREE.CylinderGeometry(r,r,d.length(),segments),material));m.name=name;m.position.copy(va).add(vb).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());g.add(m);return m}
function scaleNamed(root,name,scale=[1,1,1],move=[0,0,0],rot=[0,0,0]){const o=root.getObjectByName(name);if(!o)return false;o.scale.multiply(new THREE.Vector3(...scale));o.position.add(new THREE.Vector3(...move));o.rotation.x+=rot[0];o.rotation.y+=rot[1];o.rotation.z+=rot[2];return true}

function tuneReference(root,group){
  const changed=[];
  const tune=(name,s,m=[0,0,0],r=[0,0,0])=>{if(scaleNamed(root,name,s,m,r))changed.push(name)};

  // Reference reads as a very long, low spear with the glass buried in cheek armor.
  tune('nose-primary',[1.035,.95,.91],[-.055,-.010,0],[0,0,-.008]);
  tune('nose-upper',[1.030,.93,.92],[-.035,-.020,0],[0,0,-.010]);
  tune('nose-center-ridge',[1.045,.92,.90],[-.040,-.018,0],[0,0,-.010]);
  tune('canopy',[1.02,.90,.94],[-.015,-.032,0],[0,0,-.016]);
  tune('canopy-roof',[1.02,.90,.95],[-.010,-.030,0],[0,0,-.012]);
  for(const s of[-1,1]){
    tune(`nose-cheek-${s}`,[1.035,.96,.94],[-.010,-.005,-s*.018],[0,s*.008,0]);
    tune(`nose-cheek-lower-${s}`,[1.03,.96,.94],[-.015,.006,-s*.016]);
  }

  // The top line in the concept stays flatter before rising into the mast.
  tune('11-cockpit-dorsal-bridge',[1.018,.94,.96],[0,-.038,0],[0,0,-.006]);
  tune('11-cockpit-dorsal-cap',[1.02,.92,.95],[0,-.040,0],[0,0,-.006]);
  tune('11-dorsal-command-shell',[1.025,.93,.96],[-.018,-.035,0],[0,0,.006]);

  // Engine pods in the reference are elongated mechanical barrels with strong gaps between them.
  for(let i=0;i<4;i++){
    const e=root.getObjectByName(`11-engine-macro-${i}`);if(!e)continue;
    const main=i<2,sg=Math.sign(e.position.z)||1;
    e.scale.x*=main?1.045:1.060;e.scale.y*=main?.965:.955;e.scale.z*=main?.94:.93;
    e.position.x+=main?.035:.055;e.position.z+=sg*(main?.040:.060);changed.push(e.name);
    const up=e.getObjectByName('upper-cowl'),lo=e.getObjectByName('lower-cowl');
    if(up){up.scale.x*=1.035;up.scale.z*=.95;up.position.y-=.015}
    if(lo){lo.scale.x*=1.035;lo.scale.z*=.95;lo.position.y+=.010}
    for(const ss of[-1,1]){const blade=e.getObjectByName(`lateral-blade-${ss}`);if(blade){blade.scale.x*=1.04;blade.scale.z*=.90;blade.position.z+=ss*.040}}
  }
  tune('11-rear-propulsion-spine',[1.02,.96,.93],[.020,-.015,0]);
  for(const s of[-1,1]){
    tune(`11-rear-shoulder-${s}`,[1.03,.96,.91],[.020,-.010,s*.045]);
    tune(`11-side-macro-armor-${s}`,[1.015,.97,.95],[0,-.010,-s*.025]);
    tune(`11-side-step-${s}`,[1.02,.96,.94],[.010,-.010,-s*.020]);
  }

  // Reference-specific angular armor that makes the front read less generic.
  hull(group,'14-spear-knife',[
    [-.78,-.11,-.025],[-.78,-.11,.025],[-.78,.09,-.018],[-.78,.09,.018],
    [.68,-.20,-.19],[.68,-.20,.19],[.68,.16,-.15],[.68,.16,.15]
  ],[-6.38,-.09,0],M.graphite,[0,0,-.012]);
  hull(group,'14-canopy-cowl',[
    [-.78,-.16,-.42],[-.78,-.16,.42],[-.66,.20,-.34],[-.66,.20,.34],
    [.60,-.15,-.50],[.60,-.15,.50],[.74,.18,-.42],[.74,.18,.42]
  ],[-4.34,.72,0],M.armor,[0,0,-.030]);
  for(const s of[-1,1]){
    hull(group,`14-cheek-blade-${s}`,[
      [-.62,-.22,-.18],[-.62,-.22,.18],[-.52,.19,-.15],[-.52,.19,.15],
      [.60,-.18,-.25],[.60,-.18,.25],[.70,.15,-.20],[.70,.15,.20]
    ],[-4.62,.08,s*.82],s>0?M.armorLight:M.armor,[0,s*.10,s*.012]);
    box(group,`14-red-cheek-${s}`,[.92,.055,.17],[-4.02,.38,s*.87],M.red,[0,s*.09,0]);
    tube(group,`14-rear-open-brace-${s}`,[3.15,.58,s*.70],[4.05,.38,s*1.26],.027,M.steel,8);
    tube(group,`14-rear-open-brace2-${s}`,[3.18,-.30,s*.78],[4.00,-.43,s*1.31],.022,M.dark,8);
  }
  // Sparse rear fins, keeping the reference's mechanical negative space open.
  for(const s of[-1,1]){
    hull(group,`14-rear-fin-cap-${s}`,[[-.62,-.10,-.10],[-.62,-.10,.10],[-.52,.34,-.08],[-.52,.34,.08],[.70,-.12,-.14],[.70,-.12,.14],[.78,.22,-.11],[.78,.22,.11]],[3.62,.78,s*1.50],M.graphite,[0,s*.10,s*.03]);
    box(group,`14-rear-fin-red-${s}`,[.72,.045,.13],[3.75,.91,s*1.56],M.red,[0,s*.10,0]);
  }
  return changed;
}

function directionFor(name){
  const n=name.toLowerCase();
  if(n.includes('cockpit')||n.includes('reference13')||n.includes('likeness14'))return new THREE.Vector3(-1.45,.30,0);
  if(n.includes('port'))return new THREE.Vector3(-.05,.18,1.65);
  if(n.includes('starboard')||n.includes('star'))return new THREE.Vector3(.02,.12,-1.65);
  if(n.includes('engine')||n.includes('rear'))return new THREE.Vector3(1.85,.06,0);
  if(n.includes('dorsal'))return new THREE.Vector3(.08,1.55,0);
  if(n.includes('weapon')||n.includes('turret'))return new THREE.Vector3(-.10,-1.25,.55);
  if(n.includes('detail')||n.includes('refine'))return new THREE.Vector3(.10,.75,.65);
  if(n.includes('surface'))return new THREE.Vector3(.20,.45,0);
  if(n.includes('core'))return new THREE.Vector3(.30,-.72,0);
  return new THREE.Vector3(.55,.55,.45);
}
function makeProfile(o,index){
  const h=hash(o.name||`target-${index}`),base=directionFor(o.name||'');
  const jitter=new THREE.Vector3(unit(h,0)-.5,unit(h,8)-.5,unit(h,16)-.5).multiplyScalar(.40);
  const dir=base.add(jitter).normalize();
  const delay=.02+unit(h,0)*.31;
  const speed=.84+unit(h,8)*.44;
  const distance=(1.85+unit(h,16)*1.80)*(o.userData?.pass14Secondary?.7:1);
  const rot=new THREE.Vector3((unit(h,4)-.5)*.22,(unit(h,12)-.5)*.28,(unit(h,20)-.5)*.22);
  return {o,basePos:o.position.clone(),baseRot:o.rotation.clone(),dir,delay,speed,distance,rot,index};
}
function collectTargets(root,pass14){
  const unique=new Map();
  const sections=root.userData.sculptRuntime?.sections||{};
  for(const [key,o] of Object.entries(sections))if(o?.isObject3D&&o!==root){if(!o.name)o.name=key;unique.set(o.uuid,o)}
  unique.set(pass14.uuid,pass14);
  // Secondary assemblies add the staggered 'some parts fly faster/slower' behavior without exploding every bolt.
  const names=['engine-0.1-0.8','engine-0.1--0.8','engine--0.5-1.42','engine--0.5--1.42','11-engine-macro-0','11-engine-macro-1','11-engine-macro-2','11-engine-macro-3','turret-1','turret--1','11-dorsal-command-shell'];
  for(const name of names){const o=root.getObjectByName(name);if(o&&!unique.has(o.uuid)){o.userData.pass14Secondary=true;unique.set(o.uuid,o)}}
  return [...unique.values()].filter(o=>o.parent);
}

function createExplodeController(root,pass14){
  let profiles=[];
  const state={current:0,from:0,target:0,startMs:0,durationMs:2000,active:false};
  const install=()=>{
    // Capture final assembled transforms only after all prior passes have been applied.
    profiles=collectTargets(root,pass14).map(makeProfile);
    const previousTick=root.userData.tick;
    const apply=p=>{
      for(const pr of profiles){
        const local=clamp((p-pr.delay)/(1-pr.delay));
        const paced=Math.pow(local,1/pr.speed);
        const e=ease(paced);
        pr.o.position.copy(pr.basePos).addScaledVector(pr.dir,pr.distance*e);
        pr.o.rotation.set(pr.baseRot.x+pr.rot.x*e,pr.baseRot.y+pr.rot.y*e,pr.baseRot.z+pr.rot.z*e);
      }
    };
    const sample=now=>{
      if(!state.active)return state.current;
      const u=clamp((now-state.startMs)/state.durationMs);
      state.current=THREE.MathUtils.lerp(state.from,state.target,ease(u));
      if(u>=1){state.current=state.target;state.active=false}
      return state.current;
    };
    root.userData.setExplode=value=>{
      const now=performance.now();sample(now);
      state.from=state.current;state.target=clamp(value);state.startMs=now;state.active=Math.abs(state.target-state.from)>.0001;
      if(!state.active)apply(state.current);
    };
    root.userData.getExplode=()=>state.current;
    root.userData.tick=(t,dt)=>{previousTick?.(t,dt);apply(sample(performance.now()))};
    apply(0);
    root.userData.pass14.explode={duration:2,profiles:profiles.map(p=>({name:p.o.name,delay:p.delay,speed:p.speed,distance:p.distance})),state};
    const meta=root.userData.sculptRuntime;meta.animation={...(meta.animation||{}),explodeDuration:2,explodeStyle:'deterministic staggered cubic ease',explodeTargets:profiles.length};
  };
  return {install,state,get profiles(){return profiles}};
}

export function applyPass14(root){
  const pass14=new THREE.Group();pass14.name='14-pass14-likeness';root.add(pass14);
  const changed=tuneReference(root,pass14);
  const meta=root.userData.sculptRuntime||{};
  meta.version='ship-forge-v7-pass14';
  meta.sections={...(meta.sections||{}),likeness14:pass14};
  meta.confidence={...(meta.confidence||{}),visibleSide:.984,rear:.915,hiddenSide:.75,underside:.66};
  meta.inferred=[...(meta.inferred||[]),'pass14 further tunes front and propulsion proportions from the single visible reference'];
  meta.referenceCorrection={...(meta.referenceCorrection||{}),pass14Targets:['spear length','canopy burial','cheek width','flat dorsal line','engine elongation','rear negative space'],pass14Changed:changed.length};
  root.userData.sculptRuntime=meta;
  const controller=createExplodeController(root,pass14);
  root.userData.pass14={group:pass14,changed,installExplode:controller.install,controller};
  return root.userData.pass14;
}
