import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { getProceduralTextures } from './procedural-textures.js';
import {
  mats as baseMats,
  buildEnemyModel as buildEnemyModelV3,
  buildBossModel as buildBossModelV3,
  buildPickup as buildPickupV3,
  animateModel as animateModelV3,
} from './models-v3.js';

const tex = getProceduralTextures();
const v2 = (x, y) => new THREE.Vector2(x, y);
const std = ({ color=0xffffff, metalness=.8, roughness=.25, normal=.14, env=1.45, map=true, ...rest }={}) => new THREE.MeshStandardMaterial({
  color, metalness, roughness,
  map: map ? tex.hullColor : null,
  roughnessMap: map ? tex.hullRoughness : null,
  normalMap: map ? tex.hullNormal : null,
  normalScale: v2(normal, normal),
  envMapIntensity: env,
  ...rest,
});

const heroMats = {
  light: std({ color:0x8e9aa8, metalness:.9, roughness:.2, normal:.2, env:1.65, side:THREE.DoubleSide }),
  mid: std({ color:0x4c5a6e, metalness:.88, roughness:.26, normal:.16, env:1.5 }),
  dark: std({ color:0x111722, metalness:.82, roughness:.34, normal:.12, env:1.38 }),
  mech: std({ color:0x080b11, metalness:.56, roughness:.48, normal:.08, env:1.15 }),
  red: std({ color:0x6b111c, metalness:.82, roughness:.27, normal:.12, env:1.5 }),
  redBright: std({ color:0xb42131, metalness:.78, roughness:.24, normal:.1, env:1.5 }),
  violet: new THREE.MeshStandardMaterial({ color:0xd6b6ff, emissive:0x8d32ff, emissiveIntensity:10, emissiveMap:tex.emissiveStripe, metalness:.22, roughness:.14, envMapIntensity:1.35 }),
  cyan: new THREE.MeshStandardMaterial({ color:0xbffaff, emissive:0x21d8ff, emissiveIntensity:8.5, emissiveMap:tex.emissiveStripe, metalness:.2, roughness:.14, envMapIntensity:1.35 }),
  amber: new THREE.MeshStandardMaterial({ color:0xffd18c, emissive:0xff7a21, emissiveIntensity:7.2, metalness:.2, roughness:.2 }),
  glass: new THREE.MeshPhysicalMaterial({ color:0x17314d, roughness:.045, metalness:.08, transmission:.2, thickness:.32, ior:1.33, clearcoat:1, clearcoatRoughness:.035, transparent:true, opacity:.78, envMapIntensity:1.8, depthWrite:false }),
};

export const mats = { ...baseMats, ...heroMats };

const shadow = m => { m.castShadow = true; m.receiveShadow = false; return m; };
const rb = (w,h,d,mat=heroMats.mid,r=.06,segments=2) => shadow(new THREE.Mesh(new RoundedBoxGeometry(w,h,d,segments,Math.min(r,w*.42,h*.42,d*.42)),mat));
const cyl = (r1,r2,h,seg=18,mat=heroMats.dark) => shadow(new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,seg),mat));
const torus = (r,t,mat=heroMats.mid,seg=28) => new THREE.Mesh(new THREE.TorusGeometry(r,t,8,seg),mat);

function loftGeometry(sections){
  const ring = 8, pos=[];
  const ringPts=(w,h,y=0)=>[
    [-w*.62,y-h*.5], [w*.62,y-h*.5], [w,y-h*.12], [w,y+h*.26],
    [w*.58,y+h*.5], [-w*.58,y+h*.5], [-w,y+h*.26], [-w,y-h*.12]
  ];
  for(const s of sections){ for(const [x,y] of ringPts(s.w,s.h,s.y||0)) pos.push(x,y,s.z); }
  const idx=[];
  for(let k=0;k<sections.length-1;k++) for(let i=0;i<ring;i++){
    const j=(i+1)%ring,a=k*ring+i,b=k*ring+j,c=(k+1)*ring+j,d=(k+1)*ring+i;
    idx.push(a,b,c,a,c,d);
  }
  for(let i=1;i<ring-1;i++){ idx.push(0,i,i+1); const o=(sections.length-1)*ring; idx.push(o,o+i+1,o+i); }
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function loft(sections,mat){ return shadow(new THREE.Mesh(loftGeometry(sections),mat)); }

function prismXZ(points,thickness=.08){
  const n=points.length,p=[]; for(const y of [-thickness*.5,thickness*.5]) for(const [x,z] of points) p.push(x,y,z);
  const idx=[]; for(let i=1;i<n-1;i++){idx.push(0,i+1,i,n,n+i,n+i+1);} for(let i=0;i<n;i++){const j=(i+1)%n;idx.push(i,j,n+j,i,n+j,n+i);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();return g;
}
const plateXZ=(pts,t,mat)=>shadow(new THREE.Mesh(prismXZ(pts,t),mat));

function prismYZ(points,thickness=.08){
  const n=points.length,p=[]; for(const x of [-thickness*.5,thickness*.5]) for(const [y,z] of points) p.push(x,y,z);
  const idx=[]; for(let i=1;i<n-1;i++){idx.push(0,i,i+1,n,n+i+1,n+i);} for(let i=0;i<n;i++){const j=(i+1)%n;idx.push(i,n+j,j,i,n+i,n+j);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();return g;
}
const plateYZ=(pts,t,mat)=>shadow(new THREE.Mesh(prismYZ(pts,t),mat));

function ventArray(count=8,spacing=.09,length=.34,width=.045,mat=heroMats.mech){
  const group=new THREE.Group(),geo=new RoundedBoxGeometry(width,.025,length,1,.01),inst=new THREE.InstancedMesh(geo,mat,count),d=new THREE.Object3D();
  for(let i=0;i<count;i++){d.position.x=(i-(count-1)/2)*spacing;d.updateMatrix();inst.setMatrixAt(i,d.matrix);}inst.castShadow=true;group.add(inst);return group;
}
function fastenerStrip(count=9,spacing=.12,axis='z'){
  const group=new THREE.Group(),geo=new THREE.CylinderGeometry(.018,.018,.016,6),inst=new THREE.InstancedMesh(geo,heroMats.mid,count),d=new THREE.Object3D();
  for(let i=0;i<count;i++){const q=(i-(count-1)/2)*spacing;d.position.set(axis==='x'?q:0,0,axis==='z'?q:0);d.rotation.x=Math.PI/2;d.updateMatrix();inst.setMatrixAt(i,d.matrix);}group.add(inst);return group;
}
function glowBlock(w=.14,d=.22,mat=heroMats.violet){ const m=rb(w,.025,d,mat,.008,1); m.castShadow=false; return m; }

function engineNacelle(side){
  const s=side,g=new THREE.Group();g.name=`heroEngine_${s>0?'R':'L'}`;g.position.set(s*.82,-.08,1.22);
  const shoulder=loft([
    {z:-.72,w:.46,h:.48,y:.02},{z:-.25,w:.58,h:.62,y:.02},{z:.42,w:.62,h:.68,y:.0},{z:.76,w:.55,h:.6,y:0}
  ],heroMats.mid);g.add(shoulder);
  const barrel=cyl(.49,.54,1.48,24,heroMats.light);barrel.rotation.x=Math.PI/2;barrel.position.z=.22;g.add(barrel);
  const darkBand=cyl(.505,.505,.33,24,heroMats.dark);darkBand.rotation.x=Math.PI/2;darkBand.position.z=.52;g.add(darkBand);
  const ringA=torus(.5,.055,heroMats.mid,34);ringA.rotation.x=Math.PI/2;ringA.position.z=.89;g.add(ringA);
  const ringB=torus(.41,.05,heroMats.dark,32);ringB.rotation.x=Math.PI/2;ringB.position.z=.94;g.add(ringB);
  const ringGlow=torus(.33,.035,heroMats.violet,30);ringGlow.rotation.x=Math.PI/2;ringGlow.position.z=.99;g.add(ringGlow);
  const inner=cyl(.23,.31,.26,20,heroMats.mech);inner.rotation.x=Math.PI/2;inner.position.z=1.03;g.add(inner);
  const disc=new THREE.Mesh(new THREE.CircleGeometry(.215,24),heroMats.violet);disc.position.z=1.18;g.add(disc);
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4,v=rb(.035,.23,.055,heroMats.dark,.01,1);v.position.set(Math.cos(a)*.25,Math.sin(a)*.25,1.13);v.rotation.z=a;g.add(v);
  }
  for(const s2 of [-1,1]){
    const brace=rb(.13,.16,1.15,heroMats.dark,.035,2);brace.position.set(s2*.48,.04,.08);g.add(brace);
    const accent=glowBlock(.07,.43,s2===s?heroMats.cyan:heroMats.violet);accent.position.set(s2*.55,-.12,.2);g.add(accent);
  }
  const topArmor=rb(.72,.12,.78,heroMats.light,.055,2);topArmor.position.set(0,.39,.12);g.add(topArmor);
  const vent=ventArray(6,.075,.28,.04);vent.position.set(0,.47,.12);g.add(vent);
  const flame=new THREE.Mesh(new THREE.ConeGeometry(.25,1.95,16,1,true),baseMats.flame.clone());flame.rotation.x=Math.PI/2;flame.position.z=2.0;g.add(flame);
  const socket=new THREE.Object3D();socket.name=`exhaust_${s>0?'R':'L'}`;socket.position.z=1.25;g.add(socket);
  g.userData.flame=flame;g.userData.exhaustSocket=socket;return g;
}

function buildWing(side){
  const s=side,g=new THREE.Group();g.name=`heroWing_${s>0?'R':'L'}`;
  const main=plateXZ([[s*.46,.88],[s*3.18,.72],[s*3.0,-.22],[s*2.42,-.9],[s*1.42,-1.18],[s*.52,-.56]],.11,heroMats.mid);g.add(main);
  const armor=plateXZ([[s*.62,.66],[s*2.94,.54],[s*2.73,-.08],[s*2.12,-.68],[s*1.2,-.86],[s*.68,-.43]],.055,heroMats.light);armor.position.y=.1;g.add(armor);
  const root=plateXZ([[s*.48,.54],[s*1.45,.58],[s*1.58,-.45],[s*.62,-.56]],.13,heroMats.dark);root.position.y=.04;g.add(root);
  const trailingRed=plateXZ([[s*1.75,-.42],[s*2.9,-.12],[s*2.76,-.42],[s*2.24,-.8]],.045,heroMats.redBright);trailingRed.position.y=.145;g.add(trailingRed);
  const tipDark=plateXZ([[s*2.72,.4],[s*3.22,.7],[s*3.02,-.18],[s*2.72,-.35]],.075,heroMats.dark);tipDark.position.y=.07;g.add(tipDark);
  const tipGlow=rb(.055,.035,.72,heroMats.violet,.012,1);tipGlow.position.set(s*2.99,.17,.08);tipGlow.rotation.y=s*.11;g.add(tipGlow);
  const rootGlow=glowBlock(.16,.22,heroMats.cyan);rootGlow.position.set(s*1.3,.16,.16);g.add(rootGlow);
  const vents=ventArray(5,.07,.28,.04);vents.position.set(s*1.65,.17,.14);vents.rotation.y=s*.08;g.add(vents);
  const bolts=fastenerStrip(8,.11,'z');bolts.position.set(s*2.25,.17,.0);g.add(bolts);
  const fin=plateYZ([[0,-.15],[.98,.16],[1.35,.58],[.32,.48]],.11,heroMats.red);fin.position.set(s*1.92,.18,.38);fin.rotation.z=s*-.06;g.add(fin);
  const finInset=plateYZ([[.18,-.04],[.8,.2],[1.06,.49],[.36,.39]],.06,heroMats.dark);finInset.position.set(s*1.92,.19,.38);finInset.rotation.z=s*-.06;g.add(finInset);
  const finGlow=glowBlock(.045,.38,heroMats.violet);finGlow.position.set(s*1.92,.76,.42);finGlow.rotation.x=.2;g.add(finGlow);
  const hardpoint=new THREE.Object3D();hardpoint.name=`missileHardpoint_${s>0?'R':'L'}`;hardpoint.position.set(s*2.0,-.16,-.58);g.add(hardpoint);
  return {group:g,hardpoint};
}

function gunPod(side){
  const s=side,g=new THREE.Group();g.name=`gunPod_${s>0?'R':'L'}`;g.position.set(s*2.05,-.18,-.72);
  const shell=loft([{z:-.58,w:.17,h:.17},{z:.1,w:.25,h:.23},{z:.62,w:.2,h:.2}],heroMats.dark);g.add(shell);
  const rail=rb(.16,.11,.72,heroMats.mid,.035,2);rail.position.z=-.48;g.add(rail);
  for(let i=0;i<2;i++){const b=cyl(.038,.046,.82,10,heroMats.mech);b.rotation.x=Math.PI/2;b.position.set((i?1:-1)*.055,-.015,-.85);g.add(b);}
  const glow=glowBlock(.13,.22,heroMats.violet);glow.position.set(0,.11,-.12);g.add(glow);
  const muzzle=new THREE.Object3D();muzzle.name=`muzzle_${s>0?'R':'L'}`;muzzle.position.z=-1.28;g.add(muzzle);return {group:g,muzzle};
}

export function buildPlayerShip(){
  const ship=new THREE.Group();ship.name='Aether-9 Interceptor';ship.rotation.order='YXZ';
  const core=new THREE.Group();core.name='heroFuselage';ship.add(core);

  // PASS 1 — continuous macro silhouette: long nose, broad rear mass, low side profile.
  const hull=loft([
    {z:-3.25,w:.10,h:.17,y:-.03},{z:-2.82,w:.43,h:.34,y:.0},{z:-2.15,w:.68,h:.54,y:.02},
    {z:-1.2,w:.83,h:.69,y:.02},{z:-.2,w:.92,h:.78,y:.0},{z:.72,w:.98,h:.8,y:-.02},{z:1.48,w:.87,h:.68,y:-.06},{z:1.92,w:.58,h:.5,y:-.08}
  ],heroMats.dark);core.add(hull);
  const upperShell=loft([
    {z:-2.65,w:.32,h:.22,y:.28},{z:-1.85,w:.56,h:.32,y:.33},{z:-.78,w:.66,h:.38,y:.36},{z:.22,w:.72,h:.38,y:.36},{z:1.12,w:.66,h:.31,y:.32},{z:1.55,w:.46,h:.22,y:.27}
  ],heroMats.light);core.add(upperShell);
  const lowerKeel=loft([{z:-2.5,w:.22,h:.18,y:-.35},{z:-1.2,w:.36,h:.3,y:-.38},{z:.3,w:.38,h:.34,y:-.4},{z:1.5,w:.28,h:.24,y:-.36}],heroMats.mech);core.add(lowerKeel);

  // PASS 2 — cockpit, dorsal spine, mechanical trenches and cheek armor.
  const canopy=new THREE.Mesh(new THREE.SphereGeometry(.72,28,14,0,Math.PI*2,0,Math.PI*.58),heroMats.glass);canopy.scale.set(.64,.42,1.42);canopy.rotation.x=-.18;canopy.position.set(0,.58,-1.38);core.add(canopy);
  const canopyBase=loft([{z:-2.25,w:.38,h:.1,y:.3},{z:-1.32,w:.53,h:.13,y:.31},{z:-.45,w:.48,h:.1,y:.3}],heroMats.mech);core.add(canopyBase);
  const centerFrame=rb(.045,.045,1.85,heroMats.mid,.015,1);centerFrame.position.set(0,.72,-1.34);centerFrame.rotation.x=-.14;core.add(centerFrame);
  for(const s of [-1,1]){
    const rail=rb(.045,.055,1.65,heroMats.mid,.015,1);rail.position.set(s*.36,.57,-1.32);rail.rotation.x=-.14;rail.rotation.z=s*.12;core.add(rail);
    const cheek=loft([{z:-2.35,w:.12,h:.2,y:.02},{z:-1.42,w:.2,h:.33,y:.02},{z:-.4,w:.21,h:.32,y:.0}],heroMats.light);cheek.position.x=s*.6;core.add(cheek);
    const cheekDark=rb(.16,.19,1.32,heroMats.dark,.04,2);cheekDark.position.set(s*.7,-.02,-1.25);core.add(cheekDark);
    const strip=glowBlock(.055,.52,s>0?heroMats.violet:heroMats.cyan);strip.position.set(s*.79,.12,-1.12);core.add(strip);
  }
  const dorsalTrench=rb(.56,.09,2.52,heroMats.mech,.035,2);dorsalTrench.position.set(0,.62,.15);core.add(dorsalTrench);
  const dorsalPanel=rb(.38,.07,.9,heroMats.mid,.025,2);dorsalPanel.position.set(0,.69,.7);core.add(dorsalPanel);
  const dorsalVents=ventArray(7,.055,.42,.04);dorsalVents.position.set(0,.735,.16);core.add(dorsalVents);
  for(let i=0;i<4;i++){const amber=glowBlock(.08,.08,heroMats.amber);amber.position.set((i-1.5)*.1,.72,.78);core.add(amber);}

  // PASS 3 — large rear nacelles and layered wing assemblies from the approved concept sheet.
  const engines=[engineNacelle(-1),engineNacelle(1)];engines.forEach(e=>ship.add(e));
  const bridge=rb(.65,.33,.72,heroMats.mech,.09,3);bridge.position.set(0,-.02,1.34);ship.add(bridge);
  const bridgeGlow=glowBlock(.36,.12,heroMats.violet);bridgeGlow.position.set(0,-.02,1.72);ship.add(bridgeGlow);
  const wings=[],hardpoints=[];for(const s of [-1,1]){const w=buildWing(s);ship.add(w.group);wings.push(w.group);hardpoints.push(w.hardpoint);}
  for(const s of [-1,1]){
    const innerStrake=plateXZ([[s*.38,-1.98],[s*.66,-2.38],[s*1.42,-1.08],[s*.94,.52],[s*.55,.28]],.075,heroMats.light);innerStrake.position.y=.31;ship.add(innerStrake);
    const darkStrake=plateXZ([[s*.49,-1.84],[s*.69,-2.14],[s*1.17,-1.05],[s*.82,.2]],.04,heroMats.dark);darkStrake.position.y=.37;ship.add(darkStrake);
    const rootMech=rb(.42,.28,1.22,heroMats.mech,.07,2);rootMech.position.set(s*1.16,-.02,.6);rootMech.rotation.y=s*.06;ship.add(rootMech);
    const rootLight=glowBlock(.18,.22,s>0?heroMats.cyan:heroMats.violet);rootLight.position.set(s*1.18,.18,.54);ship.add(rootLight);
  }

  // PASS 4 — weapon pods, panel seams, fasteners and asymmetric identity details.
  const guns=[gunPod(-1),gunPod(1)];guns.forEach(o=>ship.add(o.group));
  const muzzles=guns.map(o=>o.muzzle);
  const nosePlate=plateXZ([[-.28,-3.08],[.28,-3.08],[.5,-2.52],[.34,-2.28],[-.34,-2.28],[-.5,-2.52]],.045,heroMats.red);nosePlate.position.y=.14;ship.add(nosePlate);
  const spineBolts=fastenerStrip(13,.12,'z');spineBolts.position.set(.31,.7,.25);ship.add(spineBolts);
  const spineBolts2=fastenerStrip(13,.12,'z');spineBolts2.position.set(-.31,.7,.25);ship.add(spineBolts2);
  for(const s of [-1,1]){
    const sideArmor=rb(.18,.24,1.4,heroMats.mid,.055,2);sideArmor.position.set(s*.98,.03,.72);sideArmor.rotation.y=s*.04;ship.add(sideArmor);
    const sideVents=ventArray(5,.055,.28,.035);sideVents.position.set(s*.98,.18,.72);sideVents.rotation.z=Math.PI/2;ship.add(sideVents);
  }
  const sensorMast=rb(.05,.32,.05,heroMats.mech,.015,1);sensorMast.position.set(-.28,.82,.42);ship.add(sensorMast);
  const sensorHead=new THREE.Mesh(new THREE.SphereGeometry(.07,10,7),heroMats.cyan);sensorHead.position.set(-.28,1.0,.42);ship.add(sensorHead);
  const asymBox=rb(.19,.12,.3,heroMats.redBright,.035,2);asymBox.position.set(.46,.69,.3);ship.add(asymBox);

  ship.userData.hitRadius=1.22;
  ship.userData.muzzles=muzzles;
  ship.userData.engines=engines;
  ship.userData.wings=wings;
  ship.userData.hardpoints=hardpoints;
  ship.userData.sockets={muzzles,hardpoints,exhaust:engines.map(e=>e.userData.exhaustSocket)};
  ship.userData.flames=engines.map(e=>e.userData.flame);
  ship.userData.sculptVersion='img2threejs-v4';
  ship.userData.detailInventory=[
    'continuous faceted fuselage','long low nose','elongated framed canopy','deep dorsal mechanical trench','twin oversized engine nacelles',
    'segmented nozzle rings','inner turbine vanes','layered swept wings','red vertical fins','inner forward strakes','wing-root mechanical bays',
    'dual gun pods','missile hardpoints','panel fasteners','vent banks','emissive cyan-violet systems','asymmetric sensor hardware'
  ];
  return ship;
}

export const buildEnemyModel = (type='scout') => buildEnemyModelV3(type);
export const buildBossModel = () => buildBossModelV3();
export const buildPickup = (kind='shield') => buildPickupV3(kind);
export function animateModel(model,dt,time,intensity=1){ animateModelV3(model,dt,time,intensity); }
