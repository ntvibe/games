import * as THREE from 'three';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';

const M={
  graphite:new THREE.MeshPhysicalMaterial({color:0x0d131a,roughness:.37,metalness:.95,clearcoat:.15,clearcoatRoughness:.21}),
  armor:new THREE.MeshPhysicalMaterial({color:0x303b47,roughness:.31,metalness:.91,clearcoat:.14,clearcoatRoughness:.20}),
  armorLight:new THREE.MeshPhysicalMaterial({color:0x56636f,roughness:.27,metalness:.89,clearcoat:.16,clearcoatRoughness:.19}),
  steel:new THREE.MeshStandardMaterial({color:0x788793,roughness:.20,metalness:.99}),
  dark:new THREE.MeshStandardMaterial({color:0x151c24,roughness:.33,metalness:.95}),
  red:new THREE.MeshPhysicalMaterial({color:0xba2427,roughness:.26,metalness:.79,clearcoat:.18,clearcoatRoughness:.18}),
  soot:new THREE.MeshStandardMaterial({color:0x06080a,roughness:.82,metalness:.42})
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

function refineReference(root,g){
  const changed=[];
  const tune=(name,s,m=[0,0,0],r=[0,0,0])=>{if(scaleNamed(root,name,s,m,r))changed.push(name)};
  tune('nose-primary',[1.025,.975,.965],[-.030,-.004,0],[0,0,-.004]);
  tune('nose-upper',[1.020,.970,.965],[-.020,-.008,0],[0,0,-.005]);
  tune('nose-center-ridge',[1.025,.965,.955],[-.024,-.010,0],[0,0,-.006]);
  tune('canopy',[1.012,.965,.965],[-.006,-.014,0],[0,0,-.008]);
  tune('canopy-roof',[1.015,.955,.965],[-.004,-.014,0],[0,0,-.008]);
  for(const s of[-1,1]){
    tune(`nose-cheek-${s}`,[1.018,.975,.965],[-.006,-.004,-s*.012],[0,s*.005,0]);
    tune(`nose-cheek-lower-${s}`,[1.015,.980,.970],[-.008,.004,-s*.010]);
    tune(`11-side-macro-armor-${s}`,[1.010,.985,.970],[0,-.006,-s*.018]);
  }
  for(let i=0;i<4;i++){
    const e=root.getObjectByName(`11-engine-macro-${i}`);if(!e)continue;
    const main=i<2,sg=Math.sign(e.position.z)||1;
    e.scale.x*=main?1.026:1.035;e.scale.y*=.982;e.scale.z*=main?.972:.965;e.position.x+=main?.018:.026;e.position.z+=sg*(main?.020:.030);changed.push(e.name);
    const up=e.getObjectByName('upper-cowl'),lo=e.getObjectByName('lower-cowl');if(up){up.scale.x*=1.018;up.scale.z*=.976}if(lo){lo.scale.x*=1.018;lo.scale.z*=.976}
  }
  tune('11-rear-propulsion-spine',[1.012,.985,.970],[.010,-.006,0]);
  tune('11-dorsal-command-shell',[1.010,.975,.980],[-.008,-.012,0],[0,0,.003]);

  hull(g,'15-nose-needle',[
    [-.72,-.07,-.018],[-.72,-.07,.018],[-.72,.06,-.013],[-.72,.06,.013],
    [.68,-.13,-.12],[.68,-.13,.12],[.68,.11,-.09],[.68,.11,.09]
  ],[-6.72,-.11,0],M.graphite,[0,0,-.010]);
  for(const s of[-1,1]){
    hull(g,`15-canopy-side-cowl-${s}`,[
      [-.58,-.13,-.09],[-.58,-.13,.09],[-.48,.13,-.07],[-.48,.13,.07],
      [.58,-.12,-.14],[.58,-.12,.14],[.66,.11,-.11],[.66,.11,.11]
    ],[-4.38,.54,s*.49],s>0?M.armorLight:M.armor,[0,s*.075,s*.010]);
    tube(g,`15-canopy-rail-${s}`,[-5.13,.63,s*.28],[-3.82,.67,s*.45],.020,M.steel,8);
    box(g,`15-cheek-red-cut-${s}`,[.78,.040,.11],[-4.08,.31,s*.92],M.red,[0,s*.08,0]);
    tube(g,`15-engine-truss-${s}`,[3.02,.66,s*.72],[4.22,.52,s*1.29],.020,M.steel,8);
    box(g,`15-engine-strake-${s}`,[1.18,.038,.095],[3.63,.63,s*1.18],M.red,[0,s*.07,0]);
  }
  for(let i=0;i<6;i++)box(g,`15-spine-slit-${i}`,[.34,.030,.06],[-2.60+i*.66,1.02,(i%2?-.34:.34)],i===2?M.red:M.dark,[0,(i%2?-.05:.05),0]);
  return changed;
}

function roleFor(o,sections){
  if(sections.has(o))return 'primary';
  if(o.isMesh)return 'tertiary';
  return 'secondary';
}
function directionFor(o,role){
  const n=(o.name||'').toLowerCase();
  let d;
  if(n.includes('cockpit')||n.includes('nose')||n.includes('canopy')||n.includes('reference13')||n.includes('likeness14')||n.includes('mobile15'))d=new THREE.Vector3(-1.4,.25,0);
  else if(n.includes('port'))d=new THREE.Vector3(-.05,.18,1.55);
  else if(n.includes('starboard')||n.includes('star'))d=new THREE.Vector3(.02,.14,-1.55);
  else if(n.includes('engine')||n.includes('rear')||n.includes('thruster'))d=new THREE.Vector3(1.7,.08,Math.sign(o.position.z)*.35);
  else if(n.includes('dorsal')||n.includes('mast')||n.includes('antenna')||n.includes('probe'))d=new THREE.Vector3(.06,1.45,0);
  else if(n.includes('weapon')||n.includes('turret')||n.includes('cannon')||n.includes('gun'))d=new THREE.Vector3(-.05,-1.1,Math.sign(o.position.z)*.65);
  else if(n.includes('under')||n.includes('belly')||n.includes('landing'))d=new THREE.Vector3(.15,-1.2,Math.sign(o.position.z)*.3);
  else d=new THREE.Vector3(.45,.45,Math.sign(o.position.z||1)*.48);
  if(role==='tertiary'){
    const radial=new THREE.Vector3(o.position.x*.12,o.position.y*.25,o.position.z*.35);
    if(radial.lengthSq()>.0001)d.add(radial.normalize().multiplyScalar(.55));
  }
  return d.normalize();
}
function collectTargets(root,pass15){
  const sections=new Set(Object.values(root.userData.sculptRuntime?.sections||{}).filter(o=>o?.isObject3D));
  sections.add(pass15);
  const targets=[],seen=new Set();
  root.traverse(o=>{
    if(o===root||!o.parent||!o.visible||seen.has(o.uuid))return;
    const role=roleFor(o,sections);
    if(role==='primary'||(role==='secondary'&&o.children.length>0)||role==='tertiary'){
      if(o.name==='outer-cowl'&&!o.visible)return;
      if(role==='tertiary'&&o.isInstancedMesh){targets.push({o,role:'secondary'});seen.add(o.uuid);return}
      targets.push({o,role});seen.add(o.uuid);
    }
  });
  return targets;
}
function makeProfile(item,index){
  const {o,role}=item,h=hash(`${o.name||'unnamed'}:${o.uuid}:${index}`);
  const delay=role==='primary'?.01+unit(h,0)*.18:role==='secondary'?.05+unit(h,0)*.28:.10+unit(h,0)*.34;
  const speed=role==='primary'?.90+unit(h,8)*.25:.82+unit(h,8)*.46;
  const distance=role==='primary'?2.5+unit(h,16)*2.1:role==='secondary'?1.0+unit(h,16)*1.45:.18+unit(h,16)*.62;
  const jitter=new THREE.Vector3(unit(h,3)-.5,unit(h,11)-.5,unit(h,19)-.5).multiplyScalar(role==='tertiary'?.75:.40);
  const dir=directionFor(o,role).add(jitter).normalize();
  const rotScale=role==='primary'?.22:role==='secondary'?.34:.48;
  const rot=new THREE.Vector3((unit(h,5)-.5)*rotScale,(unit(h,13)-.5)*rotScale,(unit(h,21)-.5)*rotScale);
  return {o,role,basePos:o.position.clone(),baseQuat:o.quaternion.clone(),dir,delay,speed,distance,rot};
}
function createExplodeController(root,pass15){
  const state={current:0,from:0,target:0,startMs:0,durationMs:2000,active:false};
  let profiles=[];
  const install=()=>{
    profiles=collectTargets(root,pass15).map(makeProfile);
    const previousTick=root.userData.tick;
    const rotQ=new THREE.Quaternion(),euler=new THREE.Euler();
    const apply=p=>{
      for(const pr of profiles){
        const local=clamp((p-pr.delay)/(1-pr.delay));
        const paced=Math.pow(local,1/pr.speed),e=ease(paced);
        pr.o.position.copy(pr.basePos).addScaledVector(pr.dir,pr.distance*e);
        euler.set(pr.rot.x*e,pr.rot.y*e,pr.rot.z*e);rotQ.setFromEuler(euler);pr.o.quaternion.copy(pr.baseQuat).multiply(rotQ);
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
      const now=performance.now();sample(now);state.from=state.current;state.target=clamp(value);state.startMs=now;state.active=Math.abs(state.target-state.from)>.0001;if(!state.active)apply(state.current)
    };
    root.userData.getExplode=()=>state.current;
    root.userData.tick=(t,dt)=>{previousTick?.(t,dt);apply(sample(performance.now()))};
    apply(0);
    const counts=profiles.reduce((a,p)=>(a[p.role]++,a),{primary:0,secondary:0,tertiary:0});
    root.userData.pass15.explode={state,counts,get profiles(){return profiles}};
    const meta=root.userData.sculptRuntime;meta.animation={...(meta.animation||{}),explodeDuration:2,explodeStyle:'hierarchical full-detail stagger',explodeTargets:profiles.length,explodeIncludesSmallMeshes:true,explodeCounts:counts};
  };
  return {install,state,get profiles(){return profiles}};
}

export function applyPass15(root){
  const pass15=new THREE.Group();pass15.name='15-pass15-mobile-refine';root.add(pass15);
  const changed=refineReference(root,pass15);
  const meta=root.userData.sculptRuntime||{};
  meta.version='ship-forge-v8-pass15';meta.sections={...(meta.sections||{}),mobile15:pass15};
  meta.confidence={...(meta.confidence||{}),visibleSide:.987,rear:.922,hiddenSide:.752,underside:.66};
  meta.inferred=[...(meta.inferred||[]),'pass15 refines visible reference silhouette and uses hierarchical small-part explode motion'];
  meta.referenceCorrection={...(meta.referenceCorrection||{}),pass15Targets:['nose sharpness','canopy framing','cheek silhouette','engine pod proportion','sparse hard-surface accents'],pass15Changed:changed.length};
  root.userData.sculptRuntime=meta;
  const controller=createExplodeController(root,pass15);
  root.userData.pass15={group:pass15,changed,installExplode:controller.install,controller};
  return root.userData.pass15;
}
