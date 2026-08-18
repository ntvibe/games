import * as THREE from 'three';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';

const M={
  graphite:new THREE.MeshPhysicalMaterial({color:0x0b1118,roughness:.36,metalness:.96,clearcoat:.16,clearcoatRoughness:.20}),
  armor:new THREE.MeshPhysicalMaterial({color:0x2e3945,roughness:.30,metalness:.92,clearcoat:.15,clearcoatRoughness:.19}),
  armorLight:new THREE.MeshPhysicalMaterial({color:0x5a6875,roughness:.26,metalness:.90,clearcoat:.17,clearcoatRoughness:.18}),
  steel:new THREE.MeshStandardMaterial({color:0x7f8e9a,roughness:.19,metalness:.99}),
  red:new THREE.MeshPhysicalMaterial({color:0xc12629,roughness:.25,metalness:.80,clearcoat:.19,clearcoatRoughness:.17}),
  dark:new THREE.MeshStandardMaterial({color:0x121920,roughness:.34,metalness:.95})
};

const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const hash=s=>{let h=2166136261>>>0;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
const unit=(h,shift=0)=>((h>>>shift)&255)/255;
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const shadow=m=>{m.castShadow=m.receiveShadow=true;return m};
function hull(g,name,points,pos,material,rot=[0,0,0]){const m=shadow(new THREE.Mesh(new ConvexGeometry(points.map(p=>new THREE.Vector3(...p))),material));m.name=name;m.position.set(...pos);m.rotation.set(...rot);g.add(m);return m}
function box(g,name,size,pos,material,rot=[0,0,0]){const m=shadow(new THREE.Mesh(new THREE.BoxGeometry(...size),material));m.name=name;m.position.set(...pos);m.rotation.set(...rot);g.add(m);return m}
function tube(g,name,a,b,r,material,segments=8){const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),d=vb.clone().sub(va),m=shadow(new THREE.Mesh(new THREE.CylinderGeometry(r,r,d.length(),segments),material));m.name=name;m.position.copy(va).add(vb).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());g.add(m);return m}
function tune(root,name,scale=[1,1,1],move=[0,0,0],rot=[0,0,0]){const o=root.getObjectByName(name);if(!o)return false;o.scale.multiply(new THREE.Vector3(...scale));o.position.add(new THREE.Vector3(...move));o.rotation.x+=rot[0];o.rotation.y+=rot[1];o.rotation.z+=rot[2];return true}

function refineReference(root,g){
  const changed=[];
  const t=(name,s,m=[0,0,0],r=[0,0,0])=>{if(tune(root,name,s,m,r))changed.push(name)};
  t('15-nose-needle',[1.06,.93,.91],[-.055,-.006,0],[0,0,-.006]);
  t('canopy',[1.015,.955,.955],[-.006,-.015,0],[0,0,-.006]);
  t('canopy-roof',[1.015,.950,.960],[-.004,-.014,0],[0,0,-.006]);
  for(const s of[-1,1]){
    t(`15-canopy-side-cowl-${s}`,[1.02,.94,.93],[-.006,-.006,-s*.012],[0,s*.006,0]);
    t(`nose-cheek-${s}`,[1.012,.97,.96],[-.004,-.004,-s*.008]);
    t(`11-side-macro-armor-${s}`,[1.006,.98,.978],[0,-.004,-s*.010]);
  }
  for(let i=0;i<4;i++){
    const e=root.getObjectByName(`11-engine-macro-${i}`);if(!e)continue;
    const main=i<2,sg=Math.sign(e.position.z)||1;
    e.scale.x*=main?1.018:1.025;e.scale.y*=.986;e.scale.z*=main?.978:.972;e.position.x+=main?.012:.018;e.position.z+=sg*(main?.012:.018);changed.push(e.name);
    const up=e.getObjectByName('upper-cowl'),lo=e.getObjectByName('lower-cowl');if(up){up.scale.x*=1.012;up.scale.z*=.982}if(lo){lo.scale.x*=1.012;lo.scale.z*=.982}
  }
  t('11-rear-propulsion-spine',[1.008,.99,.98],[.006,-.003,0]);
  t('11-dorsal-command-shell',[1.006,.982,.985],[-.004,-.008,0],[0,0,.002]);

  hull(g,'16-nose-razor',[
    [-.86,-.045,-.012],[-.86,-.045,.012],[-.86,.040,-.008],[-.86,.040,.008],
    [.72,-.095,-.085],[.72,-.095,.085],[.72,.078,-.064],[.72,.078,.064]
  ],[-7.02,-.12,0],M.graphite,[0,0,-.008]);
  for(const s of[-1,1]){
    hull(g,`16-cheek-knife-${s}`,[
      [-.66,-.11,-.075],[-.66,-.11,.075],[-.58,.10,-.058],[-.58,.10,.058],
      [.62,-.10,-.12],[.62,-.10,.12],[.68,.085,-.095],[.68,.085,.095]
    ],[-4.52,.28,s*.78],s>0?M.armorLight:M.armor,[0,s*.075,s*.008]);
    tube(g,`16-canopy-lower-rail-${s}`,[-5.02,.48,s*.33],[-3.84,.50,s*.48],.016,M.steel,8);
    box(g,`16-cheek-red-slit-${s}`,[.92,.032,.085],[-4.10,.24,s*.94],M.red,[0,s*.07,0]);
    hull(g,`16-engine-shoulder-vane-${s}`,[[-.54,-.08,-.08],[-.54,-.08,.08],[-.48,.22,-.06],[-.48,.22,.06],[.60,-.10,-.12],[.60,-.10,.12],[.64,.16,-.09],[.64,.16,.09]],[3.25,.72,s*1.42],M.armor,[0,s*.12,s*.018]);
    box(g,`16-engine-red-rail-${s}`,[1.26,.032,.075],[3.72,.67,s*1.28],M.red,[0,s*.07,0]);
  }
  for(let i=0;i<8;i++)box(g,`16-dorsal-slot-${i}`,[.26,.026,.05],[-2.50+i*.52,1.00,(i%2?-.30:.30)],i===3||i===4?M.red:M.dark,[0,(i%2?-.04:.04),0]);
  for(const s of[-1,1])for(let i=0;i<4;i++)box(g,`16-rear-rib-${s}-${i}`,[.055,.32,.12],[3.15+i*.24,.18+(i%2)*.12,s*(1.05+i*.08)],i===2?M.steel:M.dark,[0,s*.06,0]);
  return changed;
}

function sectionSet(root,pass16){const set=new Set(Object.values(root.userData.sculptRuntime?.sections||{}).filter(o=>o?.isObject3D));set.add(pass16);return set}
function normalRole(o,sections){if(sections.has(o))return 'primary';if(o.isMesh)return 'tertiary';if(o.children?.length)return 'secondary';return null}
function baseDirection(o,role){
  const n=(o.name||'').toLowerCase();let d;
  if(n.includes('nose')||n.includes('canopy')||n.includes('cockpit')||n.includes('reference13')||n.includes('likeness14')||n.includes('mobile15')||n.includes('micro16'))d=new THREE.Vector3(-1.45,.22,0);
  else if(n.includes('engine')||n.includes('thruster')||n.includes('rear'))d=new THREE.Vector3(1.72,.06,Math.sign(o.position.z||1)*.38);
  else if(n.includes('port'))d=new THREE.Vector3(-.04,.18,1.55);
  else if(n.includes('starboard')||n.includes('star'))d=new THREE.Vector3(.02,.15,-1.55);
  else if(n.includes('dorsal')||n.includes('mast')||n.includes('antenna')||n.includes('probe'))d=new THREE.Vector3(.04,1.42,0);
  else if(n.includes('weapon')||n.includes('turret')||n.includes('cannon')||n.includes('gun'))d=new THREE.Vector3(-.06,-1.08,Math.sign(o.position.z||1)*.68);
  else if(n.includes('under')||n.includes('belly')||n.includes('landing'))d=new THREE.Vector3(.12,-1.15,Math.sign(o.position.z||1)*.35);
  else d=new THREE.Vector3(.42,.42,Math.sign(o.position.z||1)*.52);
  if(role==='tertiary'){
    const radial=new THREE.Vector3(o.position.x*.10,o.position.y*.22,o.position.z*.32);if(radial.lengthSq()>.0001)d.add(radial.normalize().multiplyScalar(.62));
  }
  return d.normalize();
}
function profileFor(o,role,index){
  const h=hash(`${o.name||'unnamed'}:${o.uuid}:${index}`);
  const delay=role==='primary'?.01+unit(h,0)*.15:role==='secondary'?.04+unit(h,0)*.26:.08+unit(h,0)*.38;
  const speed=role==='primary'?.92+unit(h,8)*.22:.80+unit(h,8)*.48;
  const distance=role==='primary'?2.7+unit(h,16)*2.2:role==='secondary'?1.05+unit(h,16)*1.55:.20+unit(h,16)*.72;
  const jitter=new THREE.Vector3(unit(h,3)-.5,unit(h,11)-.5,unit(h,19)-.5).multiplyScalar(role==='tertiary'?.90:.42);
  const dir=baseDirection(o,role).add(jitter).normalize();
  const rs=role==='primary'?.20:role==='secondary'?.32:.56;
  const rot=new THREE.Vector3((unit(h,5)-.5)*rs,(unit(h,13)-.5)*rs,(unit(h,21)-.5)*rs);
  return {o,role,basePos:o.position.clone(),baseQuat:o.quaternion.clone(),dir,delay,speed,distance,rot};
}
function collectNormalTargets(root,pass16){
  const sections=sectionSet(root,pass16),out=[],seen=new Set();
  root.traverse(o=>{
    if(o===root||!o.parent||!o.visible||seen.has(o.uuid)||o.isInstancedMesh)return;
    if((o.material?.transparent&&o.material?.opacity<.7)||o.name.startsWith('12-soot'))return;
    const role=normalRole(o,sections);if(!role)return;
    out.push(profileFor(o,role,out.length));seen.add(o.uuid);
  });
  return out;
}
function captureInstances(root){
  const groups=[];root.traverse(o=>{
    if(!o.isInstancedMesh||!o.visible||!o.count)return;
    const base=[],profiles=[],m=new THREE.Matrix4(),p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();
    for(let i=0;i<o.count;i++){
      o.getMatrixAt(i,m);m.decompose(p,q,s);base.push({p:p.clone(),q:q.clone(),s:s.clone()});
      const h=hash(`${o.name||'inst'}:${i}`),radial=new THREE.Vector3(p.x*.18,p.y*.28,p.z*.40);if(radial.lengthSq()<.0001)radial.set(unit(h,0)-.5,unit(h,8)-.5,unit(h,16)-.5);radial.normalize();
      radial.add(new THREE.Vector3(unit(h,2)-.5,unit(h,10)-.5,unit(h,18)-.5).multiplyScalar(.52)).normalize();
      profiles.push({delay:.10+unit(h,0)*.40,speed:.78+unit(h,8)*.52,distance:.16+unit(h,16)*.48,dir:radial,rot:new THREE.Vector3((unit(h,4)-.5)*.70,(unit(h,12)-.5)*.70,(unit(h,20)-.5)*.70)});
    }
    groups.push({mesh:o,base,profiles});
  });return groups;
}
function createExplodeController(root,pass16){
  const state={current:0,from:0,target:0,startMs:0,durationMs:2000,active:false,lastApplied:-1};
  let normal=[],instances=[];
  const install=()=>{
    normal=collectNormalTargets(root,pass16);instances=captureInstances(root);
    const previousTick=root.userData.tick,rotQ=new THREE.Quaternion(),euler=new THREE.Euler(),m4=new THREE.Matrix4(),p=new THREE.Vector3(),q=new THREE.Quaternion();
    const apply=value=>{
      if(Math.abs(value-state.lastApplied)<1e-5)return;state.lastApplied=value;
      for(const pr of normal){const local=clamp((value-pr.delay)/(1-pr.delay)),paced=Math.pow(local,1/pr.speed),e=ease(paced);pr.o.position.copy(pr.basePos).addScaledVector(pr.dir,pr.distance*e);euler.set(pr.rot.x*e,pr.rot.y*e,pr.rot.z*e);rotQ.setFromEuler(euler);pr.o.quaternion.copy(pr.baseQuat).multiply(rotQ)}
      for(const grp of instances){for(let i=0;i<grp.base.length;i++){const b=grp.base[i],pr=grp.profiles[i],local=clamp((value-pr.delay)/(1-pr.delay)),paced=Math.pow(local,1/pr.speed),e=ease(paced);p.copy(b.p).addScaledVector(pr.dir,pr.distance*e);euler.set(pr.rot.x*e,pr.rot.y*e,pr.rot.z*e);rotQ.setFromEuler(euler);q.copy(b.q).multiply(rotQ);m4.compose(p,q,b.s);grp.mesh.setMatrixAt(i,m4)}grp.mesh.instanceMatrix.needsUpdate=true}
    };
    const sample=now=>{if(!state.active)return state.current;const u=clamp((now-state.startMs)/state.durationMs);state.current=THREE.MathUtils.lerp(state.from,state.target,ease(u));if(u>=1){state.current=state.target;state.active=false}return state.current};
    root.userData.setExplode=value=>{const now=performance.now();sample(now);state.from=state.current;state.target=clamp(value);state.startMs=now;state.active=Math.abs(state.target-state.from)>.0001;if(!state.active)apply(state.current)};
    root.userData.getExplode=()=>state.current;
    root.userData.tick=(t,dt)=>{previousTick?.(t,dt);if(state.active||state.current>0||state.lastApplied!==0)apply(sample(performance.now()))};
    apply(0);
    const counts=normal.reduce((a,p)=>(a[p.role]++,a),{primary:0,secondary:0,tertiary:0});const instanceCount=instances.reduce((n,g)=>n+g.base.length,0);
    root.userData.pass16.explode={state,counts,instanceCount,get normal(){return normal},get instances(){return instances}};
    const meta=root.userData.sculptRuntime;meta.animation={...(meta.animation||{}),explodeDuration:2,explodeStyle:'deep hierarchical + per-instance stagger',explodeTargets:normal.length+instanceCount,explodeIncludesSmallMeshes:true,explodeIncludesInstances:true,explodeCounts:{...counts,instances:instanceCount}};
  };
  return {install,state};
}

export function applyPass16(root){
  const pass16=new THREE.Group();pass16.name='16-pass16-reference-microexplode';root.add(pass16);
  const changed=refineReference(root,pass16);
  const meta=root.userData.sculptRuntime||{};
  meta.version='ship-forge-v9-pass16';meta.sections={...(meta.sections||{}),micro16:pass16};
  meta.confidence={...(meta.confidence||{}),visibleSide:.989,rear:.928,hiddenSide:.754,underside:.66};
  meta.inferred=[...(meta.inferred||[]),'pass16 adds another visible-side reference refinement and per-instance fastener explosion'];
  meta.referenceCorrection={...(meta.referenceCorrection||{}),pass16Targets:['sharper nose','tighter canopy','cleaner cheek silhouette','leaner engine pods','rear rib rhythm'],pass16Changed:changed.length};
  root.userData.sculptRuntime=meta;
  const controller=createExplodeController(root,pass16);
  root.userData.pass16={group:pass16,changed,installExplode:controller.install,controller};
  return root.userData.pass16;
}
