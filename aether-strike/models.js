import * as THREE from 'three';

const C = {
  hull: 0x1a2945,
  hullDark: 0x07111f,
  panel: 0x2d4266,
  cyan: 0x65f4ff,
  hot: 0xff5d9d,
  gold: 0xffd16e,
  orange: 0xff8b4d,
  glass: 0x7ccfff,
};

export const mats = {
  hull: new THREE.MeshStandardMaterial({color:C.hull,metalness:.88,roughness:.22}),
  hullDark: new THREE.MeshStandardMaterial({color:C.hullDark,metalness:.8,roughness:.29}),
  panel: new THREE.MeshStandardMaterial({color:C.panel,metalness:.72,roughness:.32}),
  carbon: new THREE.MeshStandardMaterial({color:0x050911,metalness:.42,roughness:.5}),
  cyan: new THREE.MeshStandardMaterial({color:C.cyan,emissive:0x24dfff,emissiveIntensity:8,metalness:.2,roughness:.18}),
  hot: new THREE.MeshStandardMaterial({color:C.hot,emissive:0xff286f,emissiveIntensity:9,metalness:.12,roughness:.2}),
  gold: new THREE.MeshStandardMaterial({color:C.gold,emissive:0xffa72e,emissiveIntensity:5.5,metalness:.35,roughness:.22}),
  orange: new THREE.MeshStandardMaterial({color:C.orange,emissive:0xff5428,emissiveIntensity:7,metalness:.1,roughness:.2}),
  glass: new THREE.MeshPhysicalMaterial({color:C.glass,metalness:.08,roughness:.08,transparent:true,opacity:.5,transmission:.18,thickness:.25,ior:1.32,clearcoat:1,clearcoatRoughness:.08,depthWrite:false}),
  flame: new THREE.MeshBasicMaterial({color:0x7ef8ff,transparent:true,opacity:.72,blending:THREE.AdditiveBlending,depthWrite:false}),
  flameHot: new THREE.MeshBasicMaterial({color:0xff7cb7,transparent:true,opacity:.78,blending:THREE.AdditiveBlending,depthWrite:false}),
};

const shadow = m => { m.castShadow = true; m.receiveShadow = false; return m; };
const box = (x,y,z,mat=mats.hull) => shadow(new THREE.Mesh(new THREE.BoxGeometry(x,y,z),mat));
const cyl = (r1,r2,h,seg=12,mat=mats.hull) => shadow(new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,seg),mat));
const cone = (r,h,seg=12,mat=mats.hull) => shadow(new THREE.Mesh(new THREE.ConeGeometry(r,h,seg),mat));

function wingGeometry(side=1){
  const s=side;
  const p=[
    0,0,.3,  s*2.65,-.05,.95,  s*1.7,.02,-1.28,
    0,.02,-.72, s*2.65,-.05,.95, s*1.7,.02,-1.28,
  ];
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
  g.setIndex([0,1,2,3,4,5]);
  g.computeVertexNormals();
  return g;
}

function enginePod(x,z=.72,scale=1){
  const g=new THREE.Group();
  const pod=cyl(.24*scale,.31*scale,.98*scale,12,mats.hullDark); pod.rotation.x=Math.PI/2; g.add(pod);
  const band=new THREE.Mesh(new THREE.TorusGeometry(.255*scale,.045*scale,7,18),mats.panel);band.rotation.x=Math.PI/2;band.position.z=.18;g.add(band);
  const inner=cyl(.15*scale,.15*scale,.18*scale,12,mats.cyan);inner.rotation.x=Math.PI/2;inner.position.z=.55*scale;g.add(inner);
  const flame=new THREE.Mesh(new THREE.ConeGeometry(.18*scale,1.8*scale,10,1,true),mats.flame.clone());flame.rotation.x=Math.PI/2;flame.position.z=1.48*scale;flame.userData.flame=true;g.add(flame);
  g.position.set(x,-.14,z);
  return g;
}

export function buildPlayerShip(){
  const g=new THREE.Group();g.name='Aether-9 Interceptor';g.rotation.order='YXZ';

  const fuselage=shadow(new THREE.Mesh(new THREE.CapsuleGeometry(.56,2.35,6,12),mats.hull));fuselage.rotation.x=Math.PI/2;fuselage.scale.set(1,.72,1);g.add(fuselage);
  const keel=box(.44,.24,2.65,mats.hullDark);keel.position.set(0,-.34,.05);g.add(keel);
  const nose=cone(.5,1.75,10,mats.hullDark);nose.rotation.x=-Math.PI/2;nose.position.z=-2.1;nose.scale.y=.82;g.add(nose);
  const noseCap=cone(.22,.7,10,mats.panel);noseCap.rotation.x=-Math.PI/2;noseCap.position.z=-3.15;g.add(noseCap);

  const canopy=shadow(new THREE.Mesh(new THREE.SphereGeometry(.62,18,10,0,Math.PI*2,0,Math.PI*.58),mats.glass));canopy.scale.set(.72,.52,1.22);canopy.rotation.x=-.22;canopy.position.set(0,.43,-.58);g.add(canopy);
  const canopyBase=box(.78,.12,1.18,mats.carbon);canopyBase.position.set(0,.18,-.45);g.add(canopyBase);
  const spine=box(.18,.14,1.8,mats.panel);spine.position.set(0,.31,.78);g.add(spine);

  for(const s of [-1,1]){
    const wing=shadow(new THREE.Mesh(wingGeometry(s),mats.hull));g.add(wing);
    const plate=box(1.18,.055,.42,mats.panel);plate.position.set(s*1.25,.055,-.2);plate.rotation.y=s*.18;g.add(plate);
    const tip=box(.15,.32,.92,mats.hullDark);tip.position.set(s*2.08,.02,.12);tip.rotation.z=s*.11;g.add(tip);
    const rail=box(.08,.08,1.18,mats.hot);rail.position.set(s*1.72,-.04,-.55);g.add(rail);
    const gun=box(.13,.13,.98,mats.hullDark);gun.position.set(s*.88,-.13,-1.18);g.add(gun);
    const muzzle=new THREE.Object3D();muzzle.position.set(s*.88,-.13,-1.72);g.add(muzzle);(g.userData.muzzles??=[]).push(muzzle);
  }

  const engines=[enginePod(-.63,.8,1),enginePod(.63,.8,1)];engines.forEach(e=>g.add(e));
  const centerGlow=new THREE.Mesh(new THREE.TorusGeometry(.32,.075,8,22),mats.cyan);centerGlow.rotation.x=Math.PI/2;centerGlow.position.set(0,-.05,.68);g.add(centerGlow);
  const core=new THREE.Mesh(new THREE.SphereGeometry(.2,14,9),mats.cyan);core.position.set(0,.22,.72);g.add(core);

  const fins=[];
  for(const s of [-1,1]){const fin=box(.08,.72,.72,mats.hullDark);fin.position.set(s*.52,.46,1.05);fin.rotation.z=s*.16;fin.rotation.x=-.25;g.add(fin);fins.push(fin)}

  g.userData.hitRadius=1.05;
  g.userData.engines=engines;
  g.userData.fins=fins;
  return g;
}

function scoutModel(accent=mats.cyan){
  const g=new THREE.Group();
  const body=shadow(new THREE.Mesh(new THREE.OctahedronGeometry(.78,1),mats.hullDark));body.scale.set(.8,.48,1.45);g.add(body);
  const nose=cone(.34,.9,8,mats.hull);nose.rotation.x=-Math.PI/2;nose.position.z=.95;g.add(nose);
  for(const s of [-1,1]){const wing=box(1.25,.09,.48,mats.hull);wing.position.set(s*.72,0,.05);wing.rotation.y=s*.3;g.add(wing);const tip=box(.12,.35,.55,accent);tip.position.set(s*1.28,0,-.02);g.add(tip)}
  const eye=new THREE.Mesh(new THREE.SphereGeometry(.2,12,8),mats.hot);eye.position.z=1.03;g.add(eye);
  for(const s of [-1,1]){const eng=cyl(.12,.18,.42,9,mats.hullDark);eng.rotation.x=Math.PI/2;eng.position.set(s*.38,-.07,-.82);g.add(eng);const glow=new THREE.Mesh(new THREE.CircleGeometry(.12,10),accent);glow.position.set(s*.38,-.07,-1.05);g.add(glow)}
  g.userData.hitRadius=.95;
  return g;
}

function strikerModel(){
  const g=new THREE.Group();
  const body=shadow(new THREE.Mesh(new THREE.DodecahedronGeometry(.82,0),mats.hull));body.scale.set(1.05,.58,1.35);g.add(body);
  const crown=new THREE.Mesh(new THREE.TorusGeometry(.78,.08,7,20),mats.hot);crown.rotation.x=Math.PI/2;crown.position.z=.02;g.add(crown);
  for(const s of [-1,1]){const arm=box(1.4,.14,.3,mats.hullDark);arm.position.x=s*.98;arm.rotation.y=s*.22;g.add(arm);const cannon=cyl(.13,.17,.9,9,mats.panel);cannon.rotation.x=Math.PI/2;cannon.position.set(s*1.55,-.05,.12);g.add(cannon);const emitter=new THREE.Mesh(new THREE.SphereGeometry(.15,10,7),mats.hot);emitter.position.set(s*1.55,-.05,.6);g.add(emitter)}
  const eye=new THREE.Mesh(new THREE.CylinderGeometry(.23,.23,.12,12),mats.hot);eye.rotation.x=Math.PI/2;eye.position.z=.96;g.add(eye);
  g.userData.hitRadius=1.28;
  return g;
}

function tankModel(){
  const g=new THREE.Group();
  const shell=shadow(new THREE.Mesh(new THREE.IcosahedronGeometry(1.15,1),mats.hull));shell.scale.set(1.15,.88,1.1);g.add(shell);
  const ringA=new THREE.Mesh(new THREE.TorusGeometry(1.42,.1,9,28),mats.gold);ringA.rotation.x=Math.PI/2;g.add(ringA);
  const ringB=new THREE.Mesh(new THREE.TorusGeometry(1.16,.07,8,26),mats.cyan);ringB.rotation.y=Math.PI/2;g.add(ringB);
  for(let i=0;i<4;i++){const a=i*Math.PI/2;const armor=box(.45,.34,.75,mats.hullDark);armor.position.set(Math.cos(a)*1.05,Math.sin(a)*.68,0);armor.rotation.z=a;g.add(armor)}
  const core=new THREE.Mesh(new THREE.SphereGeometry(.35,14,9),mats.gold);core.position.z=1.08;g.add(core);
  g.userData.rotors=[ringA,ringB];g.userData.hitRadius=1.55;
  return g;
}

export function buildEnemyModel(type='scout'){
  if(type==='striker')return strikerModel();
  if(type==='tank')return tankModel();
  return scoutModel();
}

export function buildBossModel(){
  const g=new THREE.Group();g.name='Harbinger Carrier';
  const coreShell=shadow(new THREE.Mesh(new THREE.DodecahedronGeometry(1.7,1),mats.hullDark));coreShell.scale.set(1.35,.72,1.65);g.add(coreShell);
  const core=new THREE.Mesh(new THREE.SphereGeometry(.56,18,12),mats.hot);core.position.z=1.6;g.add(core);g.userData.core=core;
  const ring=new THREE.Mesh(new THREE.TorusGeometry(2.05,.12,10,38),mats.gold);ring.rotation.x=Math.PI/2;g.add(ring);g.userData.ring=ring;
  const pylons=[];
  for(let i=0;i<4;i++){
    const a=i*Math.PI/2;
    const arm=box(2.15,.24,.48,mats.hull);arm.position.set(Math.cos(a)*1.3,Math.sin(a)*.78,0);arm.rotation.z=a;g.add(arm);
    const pod=shadow(new THREE.Mesh(new THREE.OctahedronGeometry(.58,0),mats.panel));pod.position.set(Math.cos(a)*2.38,Math.sin(a)*1.35,0);g.add(pod);pylons.push(pod);
    const emitter=new THREE.Mesh(new THREE.SphereGeometry(.18,10,7),i%2?mats.cyan:mats.hot);emitter.position.copy(pod.position);emitter.position.z=.58;g.add(emitter);
  }
  for(const s of [-1,1]){const engine=enginePod(s*1.15,-1.1,1.18);engine.rotation.z=s*.04;g.add(engine)}
  g.userData.pylons=pylons;g.userData.hitRadius=2.75;
  return g;
}

export function buildPickup(kind='shield'){
  const g=new THREE.Group();
  const mat=kind==='shield'?mats.cyan:(kind==='drive'?mats.gold:mats.hot);
  const cage=new THREE.Mesh(new THREE.OctahedronGeometry(.48,0),mat);cage.scale.set(.7,.7,1);g.add(cage);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.65,.055,7,18),mat);ring.rotation.x=Math.PI/2;g.add(ring);
  const core=new THREE.Mesh(new THREE.SphereGeometry(.18,10,7),mat);g.add(core);
  g.userData.ring=ring;g.userData.kind=kind;g.userData.hitRadius=.8;
  return g;
}

export function animateModel(model,dt,time,intensity=1){
  if(model.userData.rotors){model.userData.rotors[0].rotation.z+=dt*1.7*intensity;model.userData.rotors[1].rotation.x+=dt*1.25*intensity}
  if(model.userData.ring)model.userData.ring.rotation.z+=dt*.65*intensity;
  if(model.userData.flame){model.scale.y=.9+Math.sin(time*28)*.08}
}
