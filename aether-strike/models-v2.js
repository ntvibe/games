import * as THREE from 'three';
import { getProceduralTextures } from './procedural-textures.js';

const tex = getProceduralTextures();
const C={hull:0x1a2945,hullDark:0x07111f,panel:0x2d4266,cyan:0x65f4ff,hot:0xff5d9d,gold:0xffd16e,orange:0xff8b4d,glass:0x7ccfff};
const std=(o={})=>new THREE.MeshStandardMaterial({map:tex.hullColor,roughnessMap:tex.hullRoughness,normalMap:tex.hullNormal,normalScale:new THREE.Vector2(.17,.17),envMapIntensity:1.35,...o});
export const mats={
  hull:std({color:C.hull,metalness:.88,roughness:.22,side:THREE.DoubleSide}),
  hullDark:std({color:C.hullDark,metalness:.82,roughness:.28}),
  panel:std({color:C.panel,metalness:.74,roughness:.31}),
  carbon:std({color:0x050911,metalness:.45,roughness:.48,normalScale:new THREE.Vector2(.09,.09)}),
  cyan:new THREE.MeshStandardMaterial({color:C.cyan,emissive:0x24dfff,emissiveIntensity:8,emissiveMap:tex.emissiveStripe,metalness:.25,roughness:.16,envMapIntensity:1.25}),
  hot:new THREE.MeshStandardMaterial({color:C.hot,emissive:0xff286f,emissiveIntensity:9,emissiveMap:tex.emissiveStripe,metalness:.18,roughness:.18,envMapIntensity:1.25}),
  gold:new THREE.MeshStandardMaterial({color:C.gold,emissive:0xffa72e,emissiveIntensity:5.8,emissiveMap:tex.emissiveStripe,metalness:.4,roughness:.2,envMapIntensity:1.25}),
  orange:new THREE.MeshStandardMaterial({color:C.orange,emissive:0xff5428,emissiveIntensity:7.2,metalness:.12,roughness:.19}),
  glass:new THREE.MeshPhysicalMaterial({color:C.glass,metalness:.08,roughness:.06,transparent:true,opacity:.5,transmission:.22,thickness:.3,ior:1.32,clearcoat:1,clearcoatRoughness:.05,envMapIntensity:1.5,depthWrite:false}),
  flame:new THREE.MeshBasicMaterial({color:0x7ef8ff,transparent:true,opacity:.72,blending:THREE.AdditiveBlending,depthWrite:false}),
  flameHot:new THREE.MeshBasicMaterial({color:0xff7cb7,transparent:true,opacity:.78,blending:THREE.AdditiveBlending,depthWrite:false})
};

const shadow=m=>{m.castShadow=true;m.receiveShadow=false;return m};
const box=(x,y,z,mat=mats.hull)=>shadow(new THREE.Mesh(new THREE.BoxGeometry(x,y,z),mat));
const cyl=(r1,r2,h,seg=12,mat=mats.hull)=>shadow(new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,seg),mat));
const cone=(r,h,seg=12,mat=mats.hull)=>shadow(new THREE.Mesh(new THREE.ConeGeometry(r,h,seg),mat));
const torus=(r,t,mat=mats.panel,rad=8,tub=24)=>new THREE.Mesh(new THREE.TorusGeometry(r,t,rad,tub),mat);

function wingGeometry(side=1){
  const s=side,p=[0,0,.3,s*2.72,-.05,.95,s*1.7,.02,-1.34,0,.02,-.76,s*2.72,-.05,.95,s*1.7,.02,-1.34],g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex([0,1,2,3,4,5]);g.computeVertexNormals();return g;
}
function enginePod(x,z=.72,scale=1){
  const g=new THREE.Group(),pod=cyl(.25*scale,.32*scale,1.05*scale,14,mats.hullDark);pod.rotation.x=Math.PI/2;g.add(pod);
  const band=torus(.265*scale,.046*scale,mats.panel,7,20);band.rotation.x=Math.PI/2;band.position.z=.12;g.add(band);
  const nozzle=torus(.205*scale,.035*scale,mats.cyan,7,18);nozzle.rotation.x=Math.PI/2;nozzle.position.z=.58*scale;g.add(nozzle);
  const inner=cyl(.145*scale,.145*scale,.2*scale,12,mats.cyan);inner.rotation.x=Math.PI/2;inner.position.z=.58*scale;g.add(inner);
  for(const s of [-1,1]){const vane=box(.055*scale,.18*scale,.46*scale,mats.panel);vane.position.set(s*.22*scale,0,.04);g.add(vane)}
  const flame=new THREE.Mesh(new THREE.ConeGeometry(.18*scale,1.9*scale,10,1,true),mats.flame.clone());flame.rotation.x=Math.PI/2;flame.position.z=1.55*scale;flame.userData.flame=true;g.add(flame);
  g.position.set(x,-.14,z);return g;
}
function addGreebles(g){
  const asym=box(.22,.12,.44,mats.panel);asym.position.set(.34,.28,.95);asym.rotation.y=.18;g.add(asym);
  const sensor=cyl(.07,.09,.38,8,mats.hullDark);sensor.position.set(-.18,.47,.92);sensor.rotation.z=.08;g.add(sensor);
  const antenna=box(.035,.32,.035,mats.gold);antenna.position.set(-.18,.7,.92);antenna.rotation.z=-.14;g.add(antenna);
  for(const s of [-1,1]){for(let i=0;i<3;i++){const vent=box(.24,.035,.055,mats.carbon);vent.position.set(s*.42,.22,.22+i*.13);vent.rotation.y=s*.1;g.add(vent)}}
}

export function buildPlayerShip(){
  const g=new THREE.Group();g.name='Aether-9 Interceptor';g.rotation.order='YXZ';
  const fuselage=shadow(new THREE.Mesh(new THREE.CapsuleGeometry(.56,2.42,6,14),mats.hull));fuselage.rotation.x=Math.PI/2;fuselage.scale.set(1,.72,1);g.add(fuselage);
  const belly=box(.5,.28,2.75,mats.hullDark);belly.position.set(0,-.35,.08);g.add(belly);
  const nose=cone(.5,1.78,12,mats.hullDark);nose.rotation.x=-Math.PI/2;nose.position.z=-2.13;nose.scale.y=.82;g.add(nose);
  const noseCap=cone(.22,.72,10,mats.panel);noseCap.rotation.x=-Math.PI/2;noseCap.position.z=-3.18;g.add(noseCap);
  const sensor=new THREE.Mesh(new THREE.SphereGeometry(.105,10,7),mats.cyan);sensor.position.set(0,.02,-3.25);g.add(sensor);

  const canopy=shadow(new THREE.Mesh(new THREE.SphereGeometry(.64,20,11,0,Math.PI*2,0,Math.PI*.58),mats.glass));canopy.scale.set(.72,.53,1.25);canopy.rotation.x=-.22;canopy.position.set(0,.44,-.6);g.add(canopy);
  const canopyBase=box(.82,.12,1.2,mats.carbon);canopyBase.position.set(0,.18,-.46);g.add(canopyBase);
  for(const s of [-1,1]){const frame=box(.035,.18,1.02,mats.panel);frame.position.set(s*.35,.42,-.57);frame.rotation.x=-.18;g.add(frame)}
  const cross=box(.72,.035,.05,mats.panel);cross.position.set(0,.55,-.55);g.add(cross);
  const spine=box(.2,.15,1.9,mats.panel);spine.position.set(0,.32,.8);g.add(spine);

  for(const s of [-1,1]){
    const wing=shadow(new THREE.Mesh(wingGeometry(s),mats.hull));g.add(wing);
    const plate=box(1.24,.06,.44,mats.panel);plate.position.set(s*1.27,.06,-.2);plate.rotation.y=s*.18;g.add(plate);
    const lower=box(.92,.045,.3,mats.hullDark);lower.position.set(s*1.18,-.08,.34);lower.rotation.y=-s*.13;g.add(lower);
    const intake=box(.46,.22,.5,mats.carbon);intake.position.set(s*.84,.03,.38);intake.rotation.y=s*.08;g.add(intake);
    const tip=box(.16,.34,.95,mats.hullDark);tip.position.set(s*2.12,.02,.1);tip.rotation.z=s*.11;g.add(tip);
    const trim=box(.055,.045,1.36,mats.cyan);trim.position.set(s*1.78,.015,-.18);trim.rotation.y=s*.05;g.add(trim);
    const rail=box(.09,.09,1.22,mats.hot);rail.position.set(s*1.7,-.05,-.56);g.add(rail);
    const gun=box(.14,.14,1.04,mats.hullDark);gun.position.set(s*.9,-.14,-1.2);g.add(gun);
    const muzzleRing=torus(.09,.024,mats.hot,6,14);muzzleRing.rotation.x=Math.PI/2;muzzleRing.position.set(s*.9,-.14,-1.73);g.add(muzzleRing);
    const muzzle=new THREE.Object3D();muzzle.position.set(s*.9,-.14,-1.76);g.add(muzzle);(g.userData.muzzles??=[]).push(muzzle);
  }

  const engines=[enginePod(-.64,.82,1),enginePod(.64,.82,1)];engines.forEach(e=>g.add(e));
  const centerGlow=torus(.33,.076,mats.cyan,8,24);centerGlow.rotation.x=Math.PI/2;centerGlow.position.set(0,-.05,.7);g.add(centerGlow);
  const core=new THREE.Mesh(new THREE.SphereGeometry(.21,16,10),mats.cyan);core.position.set(0,.22,.73);g.add(core);
  for(const s of [-1,1]){const fin=box(.085,.76,.74,mats.hullDark);fin.position.set(s*.53,.47,1.08);fin.rotation.z=s*.16;fin.rotation.x=-.25;g.add(fin);const finTrim=box(.025,.48,.38,mats.gold);finTrim.position.set(s*.54,.53,1.05);finTrim.rotation.z=s*.16;finTrim.rotation.x=-.25;g.add(finTrim)}
  addGreebles(g);g.userData.hitRadius=1.05;g.userData.engines=engines;return g;
}

function scoutModel(){
  const g=new THREE.Group(),body=shadow(new THREE.Mesh(new THREE.OctahedronGeometry(.78,1),mats.hullDark));body.scale.set(.78,.44,1.5);g.add(body);
  const nose=cone(.34,.96,8,mats.hull);nose.rotation.x=-Math.PI/2;nose.position.z=1;g.add(nose);
  for(const s of [-1,1]){const wing=box(1.3,.085,.46,mats.hull);wing.position.set(s*.74,0,.02);wing.rotation.y=s*.32;g.add(wing);const blade=box(.15,.52,.72,mats.panel);blade.position.set(s*1.3,.02,-.06);blade.rotation.z=s*.2;g.add(blade);const tip=box(.055,.22,.64,mats.cyan);tip.position.set(s*1.42,.02,-.08);g.add(tip)}
  const eye=new THREE.Mesh(new THREE.SphereGeometry(.21,12,8),mats.hot);eye.position.z=1.07;g.add(eye);const brow=box(.62,.08,.1,mats.panel);brow.position.set(0,.18,.94);g.add(brow);
  for(const s of [-1,1]){const eng=cyl(.12,.18,.44,9,mats.hullDark);eng.rotation.x=Math.PI/2;eng.position.set(s*.38,-.07,-.84);g.add(eng);const glow=torus(.13,.028,mats.cyan,6,12);glow.rotation.x=Math.PI/2;glow.position.set(s*.38,-.07,-1.06);g.add(glow)}
  g.userData.hitRadius=.95;return g;
}
function strikerModel(){
  const g=new THREE.Group(),body=shadow(new THREE.Mesh(new THREE.DodecahedronGeometry(.84,0),mats.hull));body.scale.set(1.08,.58,1.38);g.add(body);const crown=torus(.8,.08,mats.hot,7,22);crown.rotation.x=Math.PI/2;g.add(crown);
  const dorsal=box(.3,.42,.88,mats.panel);dorsal.position.set(0,.42,-.08);g.add(dorsal);
  for(const s of [-1,1]){const arm=box(1.44,.15,.32,mats.hullDark);arm.position.x=s*.99;arm.rotation.y=s*.22;g.add(arm);const armor=box(.52,.28,.6,mats.panel);armor.position.set(s*1.23,.05,-.18);armor.rotation.y=s*.13;g.add(armor);const cannon=cyl(.14,.18,.98,10,mats.panel);cannon.rotation.x=Math.PI/2;cannon.position.set(s*1.58,-.05,.12);g.add(cannon);const emitter=new THREE.Mesh(new THREE.SphereGeometry(.16,10,7),mats.hot);emitter.position.set(s*1.58,-.05,.64);g.add(emitter)}
  const eye=new THREE.Mesh(new THREE.CylinderGeometry(.24,.24,.12,12),mats.hot);eye.rotation.x=Math.PI/2;eye.position.z=1;g.add(eye);g.userData.hitRadius=1.3;return g;
}
function tankModel(){
  const g=new THREE.Group(),shell=shadow(new THREE.Mesh(new THREE.IcosahedronGeometry(1.16,1),mats.hull));shell.scale.set(1.16,.9,1.12);g.add(shell);const ringA=torus(1.44,.105,mats.gold,9,30);ringA.rotation.x=Math.PI/2;g.add(ringA);const ringB=torus(1.18,.075,mats.cyan,8,28);ringB.rotation.y=Math.PI/2;g.add(ringB);
  for(let i=0;i<4;i++){const a=i*Math.PI/2,armor=box(.48,.36,.78,mats.hullDark);armor.position.set(Math.cos(a)*1.07,Math.sin(a)*.7,0);armor.rotation.z=a;g.add(armor);const bolt=new THREE.Mesh(new THREE.SphereGeometry(.09,8,6),mats.gold);bolt.position.set(Math.cos(a)*1.24,Math.sin(a)*.8,.35);g.add(bolt)}
  for(const s of [-1,1]){const gun=cyl(.12,.15,.78,9,mats.panel);gun.rotation.x=Math.PI/2;gun.position.set(s*.66,-.18,.82);g.add(gun)}
  const core=new THREE.Mesh(new THREE.SphereGeometry(.37,16,10),mats.gold);core.position.z=1.1;g.add(core);g.userData.rotors=[ringA,ringB];g.userData.hitRadius=1.58;return g;
}
export function buildEnemyModel(type='scout'){if(type==='striker')return strikerModel();if(type==='tank')return tankModel();return scoutModel()}

export function buildBossModel(){
  const g=new THREE.Group();g.name='Harbinger Carrier';const shell=shadow(new THREE.Mesh(new THREE.DodecahedronGeometry(1.72,1),mats.hullDark));shell.scale.set(1.38,.74,1.68);g.add(shell);
  const outer=box(2.8,.32,1.55,mats.hull);outer.position.z=-.18;g.add(outer);const spine=box(.5,.62,3.2,mats.panel);spine.position.y=.25;g.add(spine);
  const core=new THREE.Mesh(new THREE.SphereGeometry(.58,20,13),mats.hot);core.position.z=1.65;g.add(core);g.userData.core=core;
  const ring=torus(2.08,.13,mats.gold,10,40);ring.rotation.x=Math.PI/2;g.add(ring);g.userData.ring=ring;
  const pylons=[];
  for(let i=0;i<4;i++){const a=i*Math.PI/2,arm=box(2.18,.25,.5,mats.hull);arm.position.set(Math.cos(a)*1.32,Math.sin(a)*.8,0);arm.rotation.z=a;g.add(arm);const pod=shadow(new THREE.Mesh(new THREE.OctahedronGeometry(.6,0),mats.panel));pod.position.set(Math.cos(a)*2.42,Math.sin(a)*1.38,0);g.add(pod);pylons.push(pod);const emitter=new THREE.Mesh(new THREE.SphereGeometry(.19,10,7),i%2?mats.cyan:mats.hot);emitter.position.copy(pod.position);emitter.position.z=.6;g.add(emitter);const bay=box(.42,.22,.7,mats.carbon);bay.position.set(Math.cos(a)*1.75,Math.sin(a)*1.05,-.55);bay.rotation.z=a;g.add(bay)}
  for(const s of [-1,1]){g.add(enginePod(s*1.18,-1.12,1.2));const lance=box(.14,.14,2.05,mats.hot);lance.position.set(s*1.72,-.16,.1);g.add(lance)}
  for(const s of [-1,1]){const blade=box(.18,1.2,1.7,mats.hullDark);blade.position.set(s*2.15,.15,-.45);blade.rotation.z=s*.26;g.add(blade);const trim=box(.045,.72,1.1,s>0?mats.cyan:mats.hot);trim.position.set(s*2.17,.2,-.38);trim.rotation.z=s*.26;g.add(trim)}
  g.userData.pylons=pylons;g.userData.hitRadius=2.85;return g;
}

export function buildPickup(kind='shield'){
  const g=new THREE.Group(),mat=kind==='shield'?mats.cyan:(kind==='drive'?mats.gold:mats.hot),cage=new THREE.Mesh(new THREE.OctahedronGeometry(.5,0),mat);cage.scale.set(.7,.7,1);g.add(cage);const ring=torus(.67,.055,mat,7,20);ring.rotation.x=Math.PI/2;g.add(ring);g.add(new THREE.Mesh(new THREE.SphereGeometry(.19,12,8),mat));for(let i=0;i<3;i++){const fin=box(.05,.32,.45,mat);fin.rotation.z=i*Math.PI*2/3;g.add(fin)}g.userData.ring=ring;g.userData.kind=kind;g.userData.hitRadius=.82;return g;
}
export function animateModel(model,dt,time,intensity=1){if(model.userData.rotors){model.userData.rotors[0].rotation.z+=dt*1.7*intensity;model.userData.rotors[1].rotation.x+=dt*1.25*intensity}if(model.userData.ring)model.userData.ring.rotation.z+=dt*.65*intensity;if(model.userData.flame)model.scale.y=.9+Math.sin(time*28)*.08}
