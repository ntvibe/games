import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { getProceduralTextures } from './procedural-textures.js';

const tex = getProceduralTextures();
const V2 = (x,y) => new THREE.Vector2(x,y);

function std({color=0xffffff,metalness=.7,roughness=.3,map=true,normal=.16,env=1.35,...rest}={}){
  return new THREE.MeshStandardMaterial({
    color, metalness, roughness,
    map: map ? tex.hullColor : null,
    roughnessMap: map ? tex.hullRoughness : null,
    normalMap: map ? tex.hullNormal : null,
    normalScale: V2(normal,normal),
    envMapIntensity:env,
    ...rest
  });
}

export const mats = {
  hull: std({color:0x566b8c,metalness:.9,roughness:.24,normal:.20,side:THREE.DoubleSide}),
  hullDark: std({color:0x111b2c,metalness:.86,roughness:.3,normal:.14}),
  armor: std({color:0x8291aa,metalness:.84,roughness:.21,normal:.16}),
  armorDark: std({color:0x26364f,metalness:.88,roughness:.25,normal:.15}),
  panel: std({color:0x415a78,metalness:.77,roughness:.34,normal:.12}),
  carbon: std({color:0x10141d,metalness:.38,roughness:.52,normal:.07}),
  ceramic: std({color:0x9eacbd,metalness:.22,roughness:.29,normal:.08,env:1.1}),
  cyan: new THREE.MeshStandardMaterial({color:0xb9fbff,emissive:0x20dfff,emissiveIntensity:7.8,emissiveMap:tex.emissiveStripe,metalness:.24,roughness:.15,envMapIntensity:1.3}),
  hot: new THREE.MeshStandardMaterial({color:0xff9bc5,emissive:0xff236e,emissiveIntensity:8.8,emissiveMap:tex.emissiveStripe,metalness:.18,roughness:.18,envMapIntensity:1.3}),
  gold: new THREE.MeshStandardMaterial({color:0xffdc82,emissive:0xff9d24,emissiveIntensity:5.4,emissiveMap:tex.emissiveStripe,metalness:.46,roughness:.2,envMapIntensity:1.3}),
  orange: new THREE.MeshStandardMaterial({color:0xffa06c,emissive:0xff4d20,emissiveIntensity:6.8,metalness:.14,roughness:.19}),
  glass: new THREE.MeshPhysicalMaterial({color:0x8fdcff,metalness:.08,roughness:.055,transparent:true,opacity:.52,transmission:.24,thickness:.34,ior:1.32,clearcoat:1,clearcoatRoughness:.045,envMapIntensity:1.55,depthWrite:false}),
  glassDark: new THREE.MeshPhysicalMaterial({color:0x274564,metalness:.12,roughness:.08,transparent:true,opacity:.68,transmission:.12,thickness:.22,ior:1.28,clearcoat:1,clearcoatRoughness:.06,envMapIntensity:1.4,depthWrite:false}),
  flame: new THREE.MeshBasicMaterial({color:0x8cfaff,transparent:true,opacity:.76,blending:THREE.AdditiveBlending,depthWrite:false}),
  flameHot: new THREE.MeshBasicMaterial({color:0xff76bd,transparent:true,opacity:.82,blending:THREE.AdditiveBlending,depthWrite:false}),
};

const shadow = m => { m.castShadow=true; m.receiveShadow=false; return m; };
const clampR = (w,h,d,r) => Math.min(r,w*.45,h*.45,d*.45);
const rb = (w,h,d,mat=mats.hull,r=.06,segments=2) => shadow(new THREE.Mesh(new RoundedBoxGeometry(w,h,d,segments,clampR(w,h,d,r)),mat));
const box = (w,h,d,mat=mats.hull) => shadow(new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat));
const cyl = (r1,r2,h,seg=14,mat=mats.hull) => shadow(new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,seg),mat));
const cone = (r,h,seg=14,mat=mats.hull) => shadow(new THREE.Mesh(new THREE.ConeGeometry(r,h,seg),mat));
const torus = (r,t,mat=mats.panel,seg=24) => new THREE.Mesh(new THREE.TorusGeometry(r,t,8,seg),mat);

function wedgeGeometry(w,h,l,front=.45,rear=1){
  const z0=-l*.5,z1=l*.5,fw=w*.5*front,fh=h*.5*front,rw=w*.5*rear,rh=h*.5*rear;
  const p=[-fw,-fh,z0, fw,-fh,z0, fw,fh,z0, -fw,fh,z0, -rw,-rh,z1, rw,-rh,z1, rw,rh,z1, -rw,rh,z1];
  const idx=[0,1,2,0,2,3,4,6,5,4,7,6,0,4,5,0,5,1,1,5,6,1,6,2,2,6,7,2,7,3,3,7,4,3,4,0];
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(p,3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function wedge(w,h,l,front=.45,rear=1,mat=mats.hull){ return shadow(new THREE.Mesh(wedgeGeometry(w,h,l,front,rear),mat)); }

function prismXZ(points,thickness=.08){
  const n=points.length, p=[];
  for(const y of [-thickness*.5,thickness*.5]) for(const [x,z] of points) p.push(x,y,z);
  const idx=[];
  for(let i=1;i<n-1;i++){idx.push(0,i+1,i); idx.push(n,n+i,n+i+1);}
  for(let i=0;i<n;i++){const j=(i+1)%n;idx.push(i,j,n+j,i,n+j,n+i);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();return g;
}
function plateXZ(points,thickness,mat){ return shadow(new THREE.Mesh(prismXZ(points,thickness),mat)); }

function linePlate(a,b,width=.035,height=.035,mat=mats.panel){
  const mid=a.clone().add(b).multiplyScalar(.5),len=a.distanceTo(b),m=rb(width,height,len,mat,Math.min(width,height)*.3,1);
  m.position.copy(mid); m.lookAt(b); return m;
}

function ventBank(count=5,spacing=.1,length=.34,mat=mats.carbon){
  const g=new THREE.Group();
  const geo=new RoundedBoxGeometry(.045,.025,length,1,.01), inst=new THREE.InstancedMesh(geo,mat,count),d=new THREE.Object3D();
  for(let i=0;i<count;i++){d.position.x=(i-(count-1)/2)*spacing;d.updateMatrix();inst.setMatrixAt(i,d.matrix);}inst.castShadow=true;g.add(inst);return g;
}

function boltStrip(count=7,spacing=.12,axis='x',mat=mats.ceramic){
  const g=new THREE.Group(),geo=new THREE.CylinderGeometry(.022,.022,.018,6),inst=new THREE.InstancedMesh(geo,mat,count),d=new THREE.Object3D();
  for(let i=0;i<count;i++){const q=(i-(count-1)/2)*spacing;d.position.set(axis==='x'?q:0,axis==='y'?q:0,axis==='z'?q:0);d.rotation.x=Math.PI/2;d.updateMatrix();inst.setMatrixAt(i,d.matrix);}g.add(inst);return g;
}

function enginePod({x=0,y=-.1,z=.92,scale=1,accent=mats.cyan}={}){
  const g=new THREE.Group();g.name='enginePod';
  const shoulder=wedge(.64*scale,.52*scale,.9*scale,.76,1,mats.armorDark);shoulder.rotation.x=0;shoulder.position.z=-.18*scale;g.add(shoulder);
  const nac=cyl(.27*scale,.34*scale,1.2*scale,16,mats.hullDark);nac.rotation.x=Math.PI/2;g.add(nac);
  const collar=torus(.31*scale,.055*scale,mats.armor,28);collar.rotation.x=Math.PI/2;collar.position.z=.34*scale;g.add(collar);
  const rear=torus(.285*scale,.045*scale,mats.panel,28);rear.rotation.x=Math.PI/2;rear.position.z=.62*scale;g.add(rear);
  const inner=cyl(.17*scale,.22*scale,.26*scale,14,mats.carbon);inner.rotation.x=Math.PI/2;inner.position.z=.7*scale;g.add(inner);
  const glow=new THREE.Mesh(new THREE.CircleGeometry(.155*scale,18),accent);glow.position.z=.84*scale;g.add(glow);
  for(let i=0;i<6;i++){const a=i*Math.PI/3,v=rb(.035*scale,.28*scale,.05*scale,mats.panel,.01,1);v.position.set(Math.cos(a)*.15*scale,Math.sin(a)*.15*scale,.78*scale);v.rotation.z=a;g.add(v);}
  const flame=new THREE.Mesh(new THREE.ConeGeometry(.17*scale,1.65*scale,12,1,true),mats.flame.clone());flame.rotation.x=Math.PI/2;flame.position.z=1.55*scale;flame.userData.flame=true;g.add(flame);
  const socket=new THREE.Object3D();socket.name='exhaustSocket';socket.position.z=.92*scale;g.add(socket);g.userData.exhaustSocket=socket;g.userData.flame=flame;
  g.position.set(x,y,z);return g;
}

function microAntenna(height=.42){
  const g=new THREE.Group();const mast=cyl(.025,.032,height,7,mats.carbon);mast.position.y=height*.5;g.add(mast);const head=new THREE.Mesh(new THREE.SphereGeometry(.055,8,6),mats.cyan);head.position.y=height+.02;g.add(head);return g;
}

function buildWing(side=1){
  const g=new THREE.Group();
  const s=side;
  const base=plateXZ([[s*.28,.58],[s*2.95,.98],[s*2.6,.16],[s*1.78,-1.15],[s*.38,-.75]],.11,mats.hull);g.add(base);
  const upper=plateXZ([[s*.5,.38],[s*2.45,.72],[s*2.1,.08],[s*1.45,-.72],[s*.5,-.47]],.055,mats.armor);upper.position.y=.095;g.add(upper);
  const leading=rb(1.78,.08,.15,mats.armorDark,.03,1);leading.position.set(s*1.53,.08,.58);leading.rotation.y=s*.18;g.add(leading);
  const tip=rb(.18,.42,1.08,mats.hullDark,.045,2);tip.position.set(s*2.55,.08,.03);tip.rotation.z=s*.10;tip.rotation.y=s*.16;g.add(tip);
  const trim=rb(.055,.035,1.34,mats.hot,.015,1);trim.position.set(s*2.07,.13,-.15);trim.rotation.y=s*.25;g.add(trim);
  const intake=rb(.46,.24,.48,mats.carbon,.06,2);intake.position.set(s*.92,-.05,.2);intake.rotation.y=s*.12;g.add(intake);
  const intakeLip=rb(.5,.045,.52,mats.armor,.018,1);intakeLip.position.set(s*.92,.07,.2);intakeLip.rotation.y=s*.12;g.add(intakeLip);
  const vent=ventBank(5,.07,.32);vent.position.set(s*1.36,.145,-.18);vent.rotation.y=s*.16;g.add(vent);
  const bolts=boltStrip(7,.13,'z');bolts.position.set(s*1.75,.145,.0);g.add(bolts);
  const hardpoint=new THREE.Object3D();hardpoint.name=`missileHardpoint_${side>0?'R':'L'}`;hardpoint.position.set(s*1.72,-.16,-.42);g.add(hardpoint);
  return {group:g,hardpoint};
}

export function buildPlayerShip(){
  const g=new THREE.Group();g.name='Aether-9 Interceptor';g.rotation.order='YXZ';
  const core=new THREE.Group();core.name='fuselageCore';g.add(core);

  const belly=wedge(1.08,.58,3.4,.62,.92,mats.hullDark);belly.position.z=-.05;core.add(belly);
  const top=wedge(1.0,.52,2.72,.65,1,mats.hull);top.position.set(0,.18,-.22);core.add(top);
  const rearDeck=rb(1.18,.28,1.45,mats.armorDark,.11,3);rearDeck.position.set(0,.24,.98);core.add(rearDeck);
  const nose=wedge(.86,.42,1.62,.16,1,mats.armor);nose.position.z=-2.35;core.add(nose);
  const noseKeel=wedge(.36,.26,1.28,.1,1,mats.hullDark);noseKeel.position.set(0,-.3,-2.15);core.add(noseKeel);
  const chin=rb(.52,.16,1.4,mats.carbon,.05,2);chin.position.set(0,-.34,-.85);core.add(chin);

  const canopy=new THREE.Mesh(new THREE.SphereGeometry(.67,22,12,0,Math.PI*2,0,Math.PI*.58),mats.glass);canopy.scale.set(.72,.5,1.18);canopy.rotation.x=-.2;canopy.position.set(0,.46,-.72);core.add(canopy);
  const canopyRear=rb(.82,.12,.48,mats.carbon,.04,2);canopyRear.position.set(0,.31,-.04);core.add(canopyRear);
  const frameA=rb(.055,.055,1.16,mats.armorDark,.018,1);frameA.position.set(0,.55,-.68);frameA.rotation.x=-.16;core.add(frameA);
  for(const s of [-1,1]){const rail=rb(.05,.06,1.12,mats.armorDark,.018,1);rail.position.set(s*.38,.39,-.68);rail.rotation.z=s*.2;rail.rotation.x=-.16;core.add(rail);}

  const spine=rb(.22,.18,1.9,mats.armor,.055,2);spine.position.set(0,.48,.62);core.add(spine);
  const spineTrim=rb(.07,.035,1.78,mats.cyan,.015,1);spineTrim.position.set(0,.58,.62);core.add(spineTrim);
  const sensor=new THREE.Mesh(new THREE.SphereGeometry(.105,10,7),mats.glassDark);sensor.position.set(-.22,.62,.26);core.add(sensor);
  const antenna=microAntenna(.35);antenna.position.set(.25,.48,.78);antenna.rotation.z=-.12;core.add(antenna);

  for(const s of [-1,1]){
    const cheek=wedge(.34,.3,1.45,.55,1,mats.armorDark);cheek.position.set(s*.48,.03,-.84);cheek.rotation.y=s*.04;core.add(cheek);
    const cheekTrim=rb(.035,.04,.88,s>0?mats.hot:mats.cyan,.012,1);cheekTrim.position.set(s*.64,.12,-.82);core.add(cheekTrim);
    const sideVent=ventBank(6,.055,.25);sideVent.position.set(s*.58,.03,.18);sideVent.rotation.z=Math.PI/2;core.add(sideVent);
  }

  const wings=[],hardpoints=[];
  for(const s of [-1,1]){const w=buildWing(s);g.add(w.group);wings.push(w.group);hardpoints.push(w.hardpoint);}

  const engines=[enginePod({x:-.67,y:-.13,z:.93,scale:1.08,accent:mats.cyan}),enginePod({x:.67,y:-.13,z:.93,scale:1.08,accent:mats.cyan})];engines.forEach(e=>g.add(e));
  const centerHousing=rb(.64,.34,.72,mats.carbon,.1,3);centerHousing.position.set(0,-.06,.82);g.add(centerHousing);
  const centerRing=torus(.3,.065,mats.cyan,30);centerRing.rotation.x=Math.PI/2;centerRing.position.set(0,-.03,1.19);g.add(centerRing);

  const muzzles=[];
  for(const s of [-1,1]){
    const gunRoot=new THREE.Group();gunRoot.position.set(s*.92,-.16,-1.15);g.add(gunRoot);
    const fairing=wedge(.24,.22,1.2,.58,1,mats.hullDark);gunRoot.add(fairing);
    const barrel=cyl(.055,.065,.92,10,mats.carbon);barrel.rotation.x=Math.PI/2;barrel.position.z=-.46;gunRoot.add(barrel);
    const muzzleRing=torus(.085,.018,mats.hot,16);muzzleRing.position.z=-.93;gunRoot.add(muzzleRing);
    const muzzle=new THREE.Object3D();muzzle.name=`muzzle_${s>0?'R':'L'}`;muzzle.position.z=-1.02;gunRoot.add(muzzle);muzzles.push(muzzle);
  }

  for(const s of [-1,1]){
    const dorsal=plateXZ([[s*.32,.22],[s*.52,.72],[s*.64,1.42],[s*.4,1.14]],.07,mats.hullDark);dorsal.rotation.x=Math.PI/2;dorsal.position.set(0,.38,.84);g.add(dorsal);
  }

  const underKeel=rb(.26,.34,1.65,mats.hullDark,.06,2);underKeel.position.set(0,-.45,.22);g.add(underKeel);
  const underTrim=rb(.06,.035,1.35,mats.hot,.012,1);underTrim.position.set(0,-.63,.12);g.add(underTrim);

  g.userData.hitRadius=1.18;
  g.userData.muzzles=muzzles;
  g.userData.engines=engines;
  g.userData.wings=wings;
  g.userData.hardpoints=hardpoints;
  g.userData.sockets={muzzles,hardpoints,exhaust:engines.map(e=>e.userData.exhaustSocket)};
  g.userData.flames=engines.map(e=>e.userData.flame);
  return g;
}

function scoutModel(){
  const g=new THREE.Group();g.name='Scout Drone';
  const core=wedge(.82,.5,1.72,.48,.86,mats.hullDark);g.add(core);
  const shell=wedge(.64,.32,1.42,.45,1,mats.armor);shell.position.y=.1;g.add(shell);
  const eye=new THREE.Mesh(new THREE.SphereGeometry(.18,12,8),mats.hot);eye.position.set(0,.02,-.9);g.add(eye);
  const ring=torus(.46,.045,mats.cyan,22);ring.rotation.x=Math.PI/2;ring.position.z=.18;g.add(ring);
  for(const s of [-1,1]){
    const wing=plateXZ([[s*.25,.2],[s*1.45,.62],[s*1.72,.04],[s*.7,-.58]],.075,mats.hull);wing.position.y=.02;g.add(wing);
    const blade=plateXZ([[s*.92,.22],[s*1.88,.58],[s*1.45,-.08]],.035,mats.armor);blade.position.y=.08;g.add(blade);
    const trim=rb(.035,.028,.72,mats.cyan,.01,1);trim.position.set(s*1.42,.12,.05);trim.rotation.y=s*.45;g.add(trim);
    const engine=enginePod({x:s*.42,y:-.08,z:.78,scale:.47,accent:mats.cyan});g.add(engine);
  }
  const vent=ventBank(5,.07,.22);vent.position.set(0,.27,.25);g.add(vent);
  g.userData.ring=ring;g.userData.hitRadius=1.08;return g;
}

function strikerModel(){
  const g=new THREE.Group();g.name='Striker Gunship';
  const body=rb(1.22,.72,1.88,mats.hull,.18,3);body.scale.z=1.05;g.add(body);
  const nose=wedge(.9,.55,1.05,.36,1,mats.armor);nose.position.z=-1.28;g.add(nose);
  const reactor=torus(.68,.075,mats.hot,28);reactor.rotation.x=Math.PI/2;reactor.position.z=.08;g.add(reactor);
  const reactorCore=new THREE.Mesh(new THREE.SphereGeometry(.25,12,8),mats.hot);reactorCore.position.z=.1;g.add(reactorCore);
  const rotors=[reactor];
  for(const s of [-1,1]){
    const shoulder=rb(.86,.3,.92,mats.armorDark,.11,2);shoulder.position.set(s*.92,.02,.05);shoulder.rotation.y=s*.12;g.add(shoulder);
    const arm=rb(.72,.16,.3,mats.hullDark,.05,2);arm.position.set(s*1.38,-.02,-.18);arm.rotation.z=s*.05;g.add(arm);
    const cannonBody=cyl(.15,.2,1.18,12,mats.panel);cannonBody.rotation.x=Math.PI/2;cannonBody.position.set(s*1.62,-.08,-.42);g.add(cannonBody);
    const barrel=cyl(.065,.075,.9,10,mats.carbon);barrel.rotation.x=Math.PI/2;barrel.position.set(s*1.62,-.08,-1.22);g.add(barrel);
    const muzzle=torus(.095,.02,mats.hot,16);muzzle.position.set(s*1.62,-.08,-1.68);g.add(muzzle);
    const engine=enginePod({x:s*.52,y:-.18,z:.9,scale:.6,accent:mats.hot});g.add(engine);
  }
  const crown=rb(.42,.12,1.15,mats.armor,.04,2);crown.position.set(0,.48,.05);g.add(crown);
  const vents=ventBank(7,.07,.28);vents.position.set(0,.56,.22);g.add(vents);
  g.userData.rotors=rotors;g.userData.hitRadius=1.48;return g;
}

function tankModel(){
  const g=new THREE.Group();g.name='Bulwark Tank Drone';
  const hull=shadow(new THREE.Mesh(new THREE.IcosahedronGeometry(1.18,1),mats.hull));hull.scale.set(1.32,.86,1.22);g.add(hull);
  const equator=torus(1.46,.11,mats.gold,34);equator.rotation.x=Math.PI/2;g.add(equator);
  const gyro=torus(1.18,.07,mats.cyan,30);gyro.rotation.y=Math.PI/2;g.add(gyro);
  const rotors=[equator,gyro];
  for(let i=0;i<6;i++){
    const a=i*Math.PI/3,plate=rb(.52,.3,.82,i%2?mats.armorDark:mats.armor,.09,2);plate.position.set(Math.cos(a)*1.03,Math.sin(a)*.62,.02);plate.rotation.z=a;g.add(plate);
    const bolt=boltStrip(4,.09,'z');bolt.position.copy(plate.position);bolt.rotation.z=a;g.add(bolt);
  }
  const core=new THREE.Mesh(new THREE.SphereGeometry(.38,16,10),mats.gold);core.position.z=-1.17;g.add(core);
  for(const s of [-1,1]){
    const cannon=rb(.28,.24,1.42,mats.hullDark,.07,2);cannon.position.set(s*.68,-.12,-1.05);g.add(cannon);
    const barrel=cyl(.07,.085,.72,10,mats.carbon);barrel.rotation.x=Math.PI/2;barrel.position.set(s*.68,-.12,-1.95);g.add(barrel);
    const engine=enginePod({x:s*.6,y:.1,z:.92,scale:.58,accent:mats.gold});g.add(engine);
  }
  const topVent=ventBank(8,.08,.34);topVent.position.set(0,.82,.15);g.add(topVent);
  g.userData.rotors=rotors;g.userData.hitRadius=1.76;return g;
}

export function buildEnemyModel(type='scout'){
  if(type==='striker') return strikerModel();
  if(type==='tank') return tankModel();
  return scoutModel();
}

function bossShoulder(side=1){
  const g=new THREE.Group();const s=side;
  const main=rb(1.85,.72,2.6,mats.hullDark,.18,3);main.position.x=s*1.85;main.rotation.y=s*.06;g.add(main);
  const top=rb(1.45,.24,1.9,mats.armor,.08,2);top.position.set(s*1.85,.48,-.12);g.add(top);
  const blade=plateXZ([[s*2.35,.7],[s*3.55,1.16],[s*3.2,-.1],[s*2.15,-.62]],.12,mats.hull);blade.position.y=.02;g.add(blade);
  const trim=rb(.055,.045,1.85,side>0?mats.hot:mats.cyan,.015,1);trim.position.set(s*2.75,.32,.05);trim.rotation.y=s*.18;g.add(trim);
  const bay=rb(.88,.34,1.05,mats.carbon,.08,2);bay.position.set(s*1.92,-.32,.2);g.add(bay);
  for(let i=0;i<3;i++){const light=rb(.18,.035,.42,mats.hot,.01,1);light.position.set(s*(1.58+i*.27),-.13,.72);g.add(light);}
  const engineA=enginePod({x:s*1.55,y:-.25,z:1.45,scale:.95,accent:mats.hot});g.add(engineA);
  const engineB=enginePod({x:s*2.25,y:-.18,z:1.23,scale:.72,accent:mats.cyan});g.add(engineB);
  return {group:g,engines:[engineA,engineB]};
}

export function buildBossModel(){
  const g=new THREE.Group();g.name='Harbinger Carrier';
  const center=rb(1.7,1.02,3.5,mats.hullDark,.22,3);g.add(center);
  const centerArmor=wedge(1.5,.72,2.8,.56,1,mats.armorDark);centerArmor.position.z=-.38;g.add(centerArmor);
  const prow=wedge(1.25,.65,1.6,.15,1,mats.armor);prow.position.z=-2.48;g.add(prow);
  const keel=rb(.48,.54,2.5,mats.carbon,.09,2);keel.position.set(0,-.62,.1);g.add(keel);

  const core=new THREE.Mesh(new THREE.SphereGeometry(.55,20,12),mats.hot);core.position.set(0,.05,-1.72);g.add(core);
  const coreCage=torus(.72,.085,mats.gold,34);coreCage.position.z=-1.7;g.add(coreCage);
  const ring=torus(2.35,.12,mats.gold,42);ring.rotation.x=Math.PI/2;ring.position.z=.2;g.add(ring);
  const innerRing=torus(1.62,.065,mats.cyan,38);innerRing.rotation.y=Math.PI/2;innerRing.position.z=.2;g.add(innerRing);

  const shoulders=[],engines=[];
  for(const s of [-1,1]){const sh=bossShoulder(s);g.add(sh.group);shoulders.push(sh.group);engines.push(...sh.engines);}

  for(const s of [-1,1]){
    const lanceRoot=new THREE.Group();lanceRoot.position.set(s*1.22,.18,-1.28);g.add(lanceRoot);
    const mount=rb(.38,.28,.74,mats.panel,.08,2);lanceRoot.add(mount);
    const barrel=cyl(.08,.1,1.62,12,mats.carbon);barrel.rotation.x=Math.PI/2;barrel.position.z=-.92;lanceRoot.add(barrel);
    const emitter=torus(.13,.028,mats.hot,18);emitter.position.z=-1.74;lanceRoot.add(emitter);
  }

  for(let i=0;i<4;i++){
    const s=i<2?-1:1, z=i%2?-.4:.65;
    const turret=new THREE.Group();turret.position.set(s*.82,.66,z);g.add(turret);
    const base=cyl(.16,.2,.16,10,mats.panel);turret.add(base);
    const gun=rb(.12,.1,.72,mats.hullDark,.035,1);gun.position.z=-.38;turret.add(gun);
    const dot=new THREE.Mesh(new THREE.SphereGeometry(.06,8,6),mats.hot);dot.position.z=-.74;turret.add(dot);
  }

  const dorsal=rb(.46,.5,1.8,mats.armor,.1,2);dorsal.position.set(0,.72,.45);g.add(dorsal);
  const vents=ventBank(9,.09,.42);vents.position.set(0,1.0,.38);g.add(vents);
  const antenna=microAntenna(.7);antenna.position.set(.28,.93,.86);g.add(antenna);
  const fins=[];
  for(const s of [-1,1]){const fin=plateXZ([[s*.28,.2],[s*.62,1.42],[s*.86,.46]],.09,mats.hullDark);fin.rotation.x=Math.PI/2;fin.position.set(0,.68,1.02);g.add(fin);fins.push(fin);}

  g.userData.core=core;
  g.userData.ring=ring;
  g.userData.rotors=[ring,innerRing,coreCage];
  g.userData.shoulders=shoulders;
  g.userData.engines=engines;
  g.userData.fins=fins;
  g.userData.hitRadius=3.25;
  return g;
}

export function buildPickup(kind='shield'){
  const g=new THREE.Group(),mat=kind==='shield'?mats.cyan:(kind==='drive'?mats.gold:mats.hot);
  const cage=new THREE.Mesh(new THREE.OctahedronGeometry(.48,0),mat);cage.scale.set(.72,.72,1.08);g.add(cage);
  const ringA=torus(.68,.05,mat,22);ringA.rotation.x=Math.PI/2;g.add(ringA);
  const ringB=torus(.5,.035,mats.ceramic,18);ringB.rotation.y=Math.PI/2;g.add(ringB);
  const core=new THREE.Mesh(new THREE.SphereGeometry(.18,12,8),mat);g.add(core);
  g.userData.ring=ringA;g.userData.rotors=[ringA,ringB];g.userData.kind=kind;g.userData.hitRadius=.82;return g;
}

export function animateModel(model,dt,time,intensity=1){
  if(model.userData.rotors){
    model.userData.rotors.forEach((r,i)=>{
      if(!r)return;
      r.rotation.z+=dt*(.55+i*.42)*intensity;
      if(i%2)r.rotation.x+=dt*.31*intensity;
    });
  }
  if(model.userData.ring) model.userData.ring.rotation.z+=dt*.58*intensity;
  if(model.userData.flames){
    model.userData.flames.forEach((f,i)=>{if(!f)return;f.scale.y=.92+Math.sin(time*31+i*1.7)*.1;f.material.opacity=.62+Math.sin(time*23+i)*.1;});
  }
}
