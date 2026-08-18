import * as THREE from 'three';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';

const M={
  graphite:new THREE.MeshPhysicalMaterial({color:0x111820,roughness:.40,metalness:.93,clearcoat:.14,clearcoatRoughness:.24}),
  armor:new THREE.MeshPhysicalMaterial({color:0x34404c,roughness:.33,metalness:.89,clearcoat:.13,clearcoatRoughness:.22}),
  steel:new THREE.MeshStandardMaterial({color:0x73818e,roughness:.22,metalness:.99}),
  dark:new THREE.MeshStandardMaterial({color:0x171e26,roughness:.34,metalness:.94}),
  red:new THREE.MeshPhysicalMaterial({color:0xb42425,roughness:.29,metalness:.76,clearcoat:.18,clearcoatRoughness:.20}),
  soot:new THREE.MeshStandardMaterial({color:0x07090c,roughness:.78,metalness:.48})
};
const shadow=m=>{m.castShadow=m.receiveShadow=true;return m};
function tube(g,name,a,b,r,material,segments=8){const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),d=vb.clone().sub(va),m=shadow(new THREE.Mesh(new THREE.CylinderGeometry(r,r,d.length(),segments),material));m.name=name;m.position.copy(va).add(vb).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());g.add(m);return m}
function box(g,name,size,pos,material,rot=[0,0,0]){const m=shadow(new THREE.Mesh(new THREE.BoxGeometry(...size),material));m.name=name;m.position.set(...pos);m.rotation.set(...rot);g.add(m);return m}
function hull(g,name,points,pos,material,rot=[0,0,0]){const m=shadow(new THREE.Mesh(new ConvexGeometry(points.map(p=>new THREE.Vector3(...p))),material));m.name=name;m.position.set(...pos);m.rotation.set(...rot);g.add(m);return m}
function scaleNamed(root,name,scale=[1,1,1],move=[0,0,0],rot=[0,0,0]){const o=root.getObjectByName(name);if(!o)return false;o.scale.multiply(new THREE.Vector3(...scale));o.position.add(new THREE.Vector3(...move));o.rotation.x+=rot[0];o.rotation.y+=rot[1];o.rotation.z+=rot[2];return true}
function correctEngineShell(root,i){const g=root.getObjectByName(`11-engine-macro-${i}`);if(!g)return false;const main=i<2,sg=Math.sign(g.position.z)||1;
  g.scale.x*=main?1.055:1.075;g.scale.y*=main?.91:.90;g.scale.z*=main?.90:.88;
  g.position.x+=main?.03:.08;g.position.y+=main?-.015:-.045;g.position.z+=sg*(main?.085:.12);
  const upper=g.getObjectByName('upper-cowl'),lower=g.getObjectByName('lower-cowl');if(upper){upper.scale.x*=1.08;upper.scale.z*=.91;upper.position.y-=.025}if(lower){lower.scale.x*=1.06;lower.scale.z*=.90;lower.position.y+=.015}
  for(const ss of[-1,1]){const blade=g.getObjectByName(`lateral-blade-${ss}`);if(blade){blade.scale.x*=1.05;blade.scale.z*=.82;blade.position.z+=ss*.075}}
  const f=g.getObjectByName('forward-lock-ring'),r=g.getObjectByName('rear-lock-ring');if(f)f.scale.set(1,.94,.94);if(r)r.scale.set(1,.92,.92);return true
}
function addCorrectionGeometry(g){
  // sharper spear tip and lower chin, matching the long low reference profile
  hull(g,'13-nose-spear',[[-.62,-.16,-.05],[-.62,-.16,.05],[-.62,.12,-.035],[-.62,.12,.035],[.58,-.25,-.24],[.58,-.25,.24],[.58,.22,-.20],[.58,.22,.20]],[-6.02,-.02,0],M.graphite,[0,0,-.018]);
  hull(g,'13-nose-top-cap',[[-.48,-.07,-.025],[-.48,-.07,.025],[-.48,.10,-.018],[-.48,.10,.018],[.54,-.12,-.15],[.54,-.12,.15],[.54,.16,-.12],[.54,.16,.12]],[-5.62,.47,0],M.armor,[0,0,-.028]);
  for(const s of[-1,1]){
    tube(g,`13-canopy-shoulder-rail-${s}`,[-4.88,.69,s*.31],[-2.84,1.02,s*.48],.022,M.steel,8);
    tube(g,`13-rear-gap-brace-a-${s}`,[3.08,.58,s*.72],[3.92,.45,s*1.13],.028,M.steel,8);
    tube(g,`13-rear-gap-brace-b-${s}`,[3.16,-.26,s*.82],[3.78,-.34,s*1.22],.024,M.dark,8);
    box(g,`13-rear-gap-lock-${s}`,[.28,.12,.16],[3.51,.10,s*1.10],M.red,[0,s*.08,0]);
  }
  // sparse top silhouette ridges; these read from the reference pose without filling negative space
  for(let i=0;i<5;i++)box(g,`13-top-ridge-${i}`,[.42,.055,.20],[-2.58+i*.73,1.12,(i%2?-.28:.28)],i===2?M.red:M.armor,[0,(i%2?-.06:.06),0]);
}

export function applyPass13(root){
  const correction=new THREE.Group();correction.name='13-pass13-reference-correction';root.add(correction);
  const changed=[];
  const tune=(name,s,m=[0,0,0],r=[0,0,0])=>{if(scaleNamed(root,name,s,m,r))changed.push(name)};

  // Nose/canopy: narrower, lower, longer, and more strongly sloped in side profile.
  tune('nose-primary',[1.025,.95,.86],[-.055,-.015,0],[0,0,-.010]);
  tune('nose-upper',[1.025,.90,.88],[-.025,-.035,0],[0,0,-.018]);
  tune('nose-lower',[1.02,.92,.87],[-.035,.018,0],[0,0,.008]);
  tune('nose-center-ridge',[1.03,.84,.82],[-.035,-.030,0],[0,0,-.022]);
  tune('canopy',[1.035,.82,.88],[-.025,-.055,0],[0,0,-.028]);
  tune('canopy-roof',[1.04,.82,.90],[-.015,-.055,0],[0,0,-.020]);
  for(const s of[-1,1]){tune(`nose-cheek-${s}`,[1.02,.92,.90],[-.015,-.012,0],[0,s*.012,0]);tune(`nose-cheek-lower-${s}`,[1.02,.94,.91],[-.018,.015,0],[0,s*.010,0])}

  // Lower and flatten cockpit-to-dorsal flow so the top profile matches the reference more closely.
  tune('11-cockpit-dorsal-bridge',[1.025,.90,.94],[.00,-.070,0],[0,0,-.010]);
  tune('11-cockpit-dorsal-cap',[1.035,.86,.92],[.00,-.075,0],[0,0,-.012]);
  tune('11-dorsal-command-shell',[1.06,.88,.94],[-.055,-.060,0],[0,0,.010]);
  tune('11-dorsal-radar-base',[.95,.90,.94],[.05,-.040,0]);

  // Engine housings: longer, flatter, narrower, and spaced farther apart to expose negative space.
  for(let i=0;i<4;i++)if(correctEngineShell(root,i))changed.push(`11-engine-macro-${i}`);
  tune('11-rear-propulsion-spine',[1.02,.88,.89],[.015,-.025,0]);
  for(const s of[-1,1]){tune(`11-rear-shoulder-${s}`,[1.03,.91,.84],[.025,-.015,s*.085],[0,s*.012,0]);tune(`11-rear-red-inset-${s}`,[1.05,.88,.90],[.02,-.025,s*.055])}
  tune('11-port-thermal-manifold',[1.02,.94,.92],[.02,-.025,.035]);
  tune('11-starboard-sensor-armor',[1.02,.92,.90],[.02,-.025,-.035]);

  // Side macro armor is pulled slightly inward so the engine and wing silhouette dominates as in the source.
  for(const s of[-1,1]){tune(`11-side-macro-armor-${s}`,[1.02,.93,.91],[0,-.025,-s*.055]);tune(`11-side-step-${s}`,[1.02,.92,.90],[0,-.018,-s*.035])}

  addCorrectionGeometry(correction);

  // Inspector integration.
  const prevExplode=root.userData.setExplode,prevTick=root.userData.tick;
  root.userData.setExplode=t=>{prevExplode?.(t);const k=THREE.MathUtils.clamp(t,0,1)*1.5;correction.position.set(-.12*k,.30*k,0)};
  root.userData.tick=(t,dt)=>{prevTick?.(t,dt)};

  // Flat silhouette mode is deliberately material-only so it works after Pass 12 surface materials are applied.
  const silhouetteMaterial=new THREE.MeshBasicMaterial({color:0xf2f5f7});
  const saved=new Map();let silhouette=false;
  const setSilhouette=on=>{
    silhouette=!!on;saved.clear();
    const overlays=root.getObjectByName('12-pass12-surface-overlays');if(overlays)overlays.visible=!silhouette;
    if(silhouette){root.traverse(o=>{if(!o.isMesh||!o.visible)return;saved.set(o.uuid,o.material);o.material=silhouetteMaterial})}
    else root.traverse(o=>{if(o.isMesh&&saved.has(o.uuid))o.material=saved.get(o.uuid)});
  };
  // restore needs persistent references, so wrap the toggle with a second cache retained between calls
  const persistent=new Map();
  const toggleSilhouette=on=>{
    const want=!!on;if(want===silhouette)return;
    const overlays=root.getObjectByName('12-pass12-surface-overlays');
    if(want){persistent.clear();root.traverse(o=>{if(!o.isMesh||!o.visible)return;persistent.set(o.uuid,o.material);o.material=silhouetteMaterial});if(overlays)overlays.visible=false}
    else{root.traverse(o=>{if(o.isMesh&&persistent.has(o.uuid))o.material=persistent.get(o.uuid)});if(overlays)overlays.visible=true;persistent.clear()}
    silhouette=want;
  };

  const meta=root.userData.sculptRuntime||{};
  meta.version='ship-forge-v6-pass13';meta.sections={...(meta.sections||{}),reference13:correction};
  meta.confidence={...(meta.confidence||{}),visibleSide:.979,rear:.905,hiddenSide:.745,underside:.66};
  meta.inferred=[...(meta.inferred||[]),'pass13 proportions tuned against the single reference view; orthographic dimensions remain inferred'];
  meta.referenceCorrection={changedObjects:changed.length,targets:['nose width','canopy height/angle','dorsal profile','engine cowl taper','engine spacing','rear negative space']};
  root.userData.sculptRuntime=meta;
  root.userData.pass13={setSilhouette:toggleSilhouette,get silhouette(){return silhouette},changed};
  return root.userData.pass13
}
