import * as THREE from 'three';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';

const M={
  graphite:new THREE.MeshPhysicalMaterial({color:0x090e14,roughness:.34,metalness:.97,clearcoat:.17,clearcoatRoughness:.18}),
  armor:new THREE.MeshPhysicalMaterial({color:0x26313c,roughness:.29,metalness:.93,clearcoat:.16,clearcoatRoughness:.18}),
  armorLight:new THREE.MeshPhysicalMaterial({color:0x46535f,roughness:.26,metalness:.91,clearcoat:.16,clearcoatRoughness:.18}),
  steel:new THREE.MeshStandardMaterial({color:0x81909b,roughness:.19,metalness:.99}),
  red:new THREE.MeshPhysicalMaterial({color:0x971218,roughness:.27,metalness:.82,clearcoat:.18,clearcoatRoughness:.18}),
  redGlow:new THREE.MeshStandardMaterial({color:0xff281d,emissive:0xff170f,emissiveIntensity:8.5,roughness:.20,metalness:.20,toneMapped:false}),
  orangeGlow:new THREE.MeshStandardMaterial({color:0xff8a25,emissive:0xff5b12,emissiveIntensity:9.5,roughness:.18,metalness:.15,toneMapped:false}),
  deepGlow:new THREE.MeshStandardMaterial({color:0xa50b12,emissive:0x7d0508,emissiveIntensity:5.2,roughness:.25,metalness:.35,toneMapped:false}),
  dark:new THREE.MeshStandardMaterial({color:0x10161d,roughness:.36,metalness:.96})
};

const shadow=m=>{m.castShadow=m.receiveShadow=true;return m};
function tune(root,name,scale=[1,1,1],move=[0,0,0],rot=[0,0,0]){const o=root.getObjectByName(name);if(!o)return false;o.scale.multiply(new THREE.Vector3(...scale));o.position.add(new THREE.Vector3(...move));o.rotation.x+=rot[0];o.rotation.y+=rot[1];o.rotation.z+=rot[2];return true}
function hull(g,name,points,pos,material,rot=[0,0,0]){const m=shadow(new THREE.Mesh(new ConvexGeometry(points.map(p=>new THREE.Vector3(...p))),material));m.name=name;m.position.set(...pos);m.rotation.set(...rot);g.add(m);return m}
function box(g,name,size,pos,material,rot=[0,0,0]){const m=shadow(new THREE.Mesh(new THREE.BoxGeometry(...size),material));m.name=name;m.position.set(...pos);m.rotation.set(...rot);g.add(m);return m}
function tube(g,name,a,b,r,material,segments=8){const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),d=vb.clone().sub(va),m=shadow(new THREE.Mesh(new THREE.CylinderGeometry(r,r,d.length(),segments),material));m.name=name;m.position.copy(va).add(vb).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());g.add(m);return m}
function torus(g,name,major,tubeR,pos,material,segments=32){const m=shadow(new THREE.Mesh(new THREE.TorusGeometry(major,tubeR,8,segments),material));m.name=name;m.rotation.y=Math.PI/2;m.position.set(...pos);g.add(m);return m}
function makeHaloTexture(){const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),gr=x.createRadialGradient(32,32,2,32,32,31);gr.addColorStop(0,'rgba(255,120,45,.90)');gr.addColorStop(.20,'rgba(255,45,24,.58)');gr.addColorStop(.55,'rgba(255,18,12,.18)');gr.addColorStop(1,'rgba(255,0,0,0)');x.fillStyle=gr;x.fillRect(0,0,64,64);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}

function flattenAndWiden(root){
  const changed=[];
  const t=(name,s,m=[0,0,0],r=[0,0,0])=>{if(tune(root,name,s,m,r))changed.push(name)};

  // The screenshot still reads as a tall carrier. Flatten the center mass and give more width to the side architecture.
  t('main-keel',[.965,.82,1.08],[.04,-.035,0]);
  t('upper-spine',[.94,.68,1.06],[.05,-.135,0]);
  t('center-shoulder',[.92,.68,1.06],[.05,-.145,0]);
  t('lower-keel',[.97,.90,1.045],[.03,.005,0]);
  for(const s of[-1,1]){
    t(`side-hull-${s}`,[.96,.86,1.06],[.02,-.035,s*.055]);
    t(`armor-rail-${s}`,[.96,.84,1.05],[.02,-.040,s*.055]);
    t(`upper-rail-${s}`,[.95,.82,1.045],[.02,-.055,s*.045]);
    t(`wing-${s}`,[1.04,.92,1.08],[.03,-.015,s*.090]);
    t(`wing-step-${s}`,[1.03,.90,1.06],[.03,-.015,s*.080]);
    t(`wingtip-pod-${s}`,[.92,.88,.92],[.01,-.025,s*.070]);
  }

  // Reduce the oversized deck/tower language and the large triangular dorsal fins visible in the phone screenshot.
  t('dorsal-deck',[.91,.62,.94],[-.02,-.18,0]);
  t('dorsal-plating',[.88,.62,.92],[-.05,-.20,0]);
  t('command-hump',[.78,.60,.82],[-.04,-.24,0],[0,0,.035]);
  t('command-shadow',[.80,.62,.84],[-.04,-.24,0]);
  t('mast-base',[.76,.68,.76],[0,-.20,0]);
  t('mast-main',[.64,.54,.64],[0,-.62,0]);
  t('mast-tip',[.62,.50,.62],[0,-1.05,0]);
  t('mast-side',[.65,.56,.65],[0,-.58,0]);
  t('sensor-array',[.76,.72,.80],[0,-.20,0]);
  t('sensor-ring',[.72,.72,.72],[0,-.48,0]);
  t('dorsal-fin',[.58,.58,.58],[0,-.27,0]);
  t('dorsal-fin-r',[.58,.58,.58],[0,-.27,0]);
  for(const s of[-1,1])t(`turret-${s}`,[.76,.72,.78],[.03,-.25,0]);

  // Rear block is too rectangular; compress the bridge/armor and let the propulsion pods read as separate rounded systems.
  t('engine-bridge',[.92,.76,.91],[.02,-.09,0]);
  t('rear-armor',[.88,.80,.93],[.03,-.11,0]);
  t('rear-spine-cap',[.90,.72,.88],[.01,-.13,0]);
  const engines=[['engine-0.1-0.8',true,1],['engine-0.1--0.8',true,-1],['engine--0.5-1.42',false,1],['engine--0.5--1.42',false,-1]];
  for(const [name,main,sg] of engines){const e=root.getObjectByName(name);if(!e)continue;e.scale.x*=1.01;e.scale.y*=main?.82:.88;e.scale.z*=main?.82:.88;e.position.z+=sg*(main?.045:.055);changed.push(name)}
  for(let i=0;i<4;i++){const e=root.getObjectByName(`11-engine-macro-${i}`);if(!e)continue;e.scale.y*=.94;e.scale.z*=.95;e.position.z+=Math.sign(e.position.z||1)*.025;changed.push(e.name)}
  return changed;
}

function addReferenceArmor(g){
  // Long shallow side plates break the carrier-like box silhouette into the reference's swept wedge language.
  for(const s of[-1,1]){
    hull(g,`17-side-shear-${s}`,[
      [-3.65,-.10,-.18],[-3.65,-.10,.18],[-3.38,.11,-.14],[-3.38,.11,.14],
      [2.62,-.13,-.34],[2.62,-.13,.34],[2.92,.08,-.27],[2.92,.08,.27]
    ],[-.10,.43,s*1.35],s>0?M.armor:M.graphite,[0,s*.055,s*.010]);
    hull(g,`17-rear-swept-fin-${s}`,[
      [-.72,-.08,-.055],[-.72,-.08,.055],[-.50,.18,-.045],[-.50,.18,.045],
      [.70,-.10,-.12],[.70,-.10,.12],[.82,.12,-.09],[.82,.12,.09]
    ],[3.28,.78,s*1.58],M.graphite,[0,s*.10,s*.025]);
    box(g,`17-rear-fin-glow-${s}`,[.72,.028,.055],[3.43,.84,s*1.64],M.redGlow,[0,s*.08,0]);
    tube(g,`17-rear-truss-${s}`,[2.65,.47,s*1.18],[3.82,.55,s*1.52],.016,M.steel,8);
  }

  // Thin emissive strips follow the same scattered red accents visible in the source image.
  const strips=[[-4.75,.43,.82,.34],[-3.82,.62,1.02,.40],[-2.82,.70,1.17,.34],[-1.78,.74,1.30,.44],[-.58,.74,1.41,.38],[.62,.69,1.50,.46],[1.72,.61,1.52,.38],[2.62,.56,1.42,.34]];
  for(const s of[-1,1])strips.forEach((p,i)=>box(g,`17-hull-glow-${s}-${i}`,[p[3],.024,.050],[p[0],p[1],s*p[2]],i%3===1?M.orangeGlow:M.redGlow,[0,s*(i%2?.045:-.025),0]));
  for(const s of[-1,1]){
    box(g,`17-canopy-glow-${s}`,[.62,.022,.045],[-4.50,.56,s*.49],M.redGlow,[0,s*.045,0]);
    box(g,`17-cheek-glow-${s}`,[.52,.022,.040],[-4.08,.25,s*.96],M.orangeGlow,[0,s*.060,0]);
  }
}

function retuneExistingGlow(root){
  let changed=0;
  root.traverse(o=>{
    if(!o.isMesh||!o.material)return;
    const n=(o.name||'').toLowerCase();
    if(n==='glow'){
      o.scale.y*=.62;o.scale.z*=.62;o.position.x-=.10;o.material=M.redGlow;changed++;return;
    }
    if(n==='inner'){
      o.scale.y*=.48;o.scale.z*=.48;o.position.x-=.12;o.material=M.orangeGlow;changed++;return;
    }
    if(n==='spin-ring'||n==='ring-b'){o.material=M.deepGlow;changed++;return}
    if(n.includes('nose-light')||n.includes('side-status')||n.startsWith('nav-')||n.includes('locator')||n.includes('sensor-ring')||n.includes('reactor-glow')||n.includes('cockpit-glow')||n==='sensor'){
      o.material=(changed%4===0)?M.orangeGlow:M.redGlow;changed++;
    }
  });
  const canopy=root.getObjectByName('canopy');if(canopy?.material){canopy.material.emissive?.set?.(0x5f100b);canopy.material.emissiveIntensity=1.55;canopy.material.roughness=.07;canopy.material.opacity=.88;canopy.material.needsUpdate=true}
  return changed;
}

function addThrusterGlow(root,g){
  const haloTex=makeHaloTexture();
  const haloMat=new THREE.SpriteMaterial({map:haloTex,color:0xff321d,transparent:true,opacity:.55,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
  const names=['engine-0.1-0.8','engine-0.1--0.8','engine--0.5-1.42','engine--0.5--1.42'];
  let count=0;
  names.forEach((name,i)=>{
    const e=root.getObjectByName(name);if(!e)return;
    const main=i<2;
    torus(e,'17-thruster-red-ring',main?.47:.45,.032,[.61,0,0],M.redGlow,34);
    torus(e,'17-thruster-dark-ring',main?.56:.54,.018,[.59,0,0],M.deepGlow,34);
    const halo=new THREE.Sprite(haloMat.clone());halo.name='17-thruster-halo';halo.position.set(.62,0,0);halo.scale.setScalar(main?1.15:.96);e.add(halo);count++;
  });
  const l1=new THREE.PointLight(0xff2416,17,4.2,2);l1.name='17-rear-red-light-a';l1.position.set(4.15,.08,.78);g.add(l1);
  const l2=new THREE.PointLight(0xff4b18,15,4.0,2);l2.name='17-rear-red-light-b';l2.position.set(4.15,.08,-.78);g.add(l2);
  const lc=new THREE.PointLight(0xff3518,5.5,2.4,2);lc.name='17-canopy-red-light';lc.position.set(-4.45,.52,0);g.add(lc);
  return count;
}

export function applyPass17(root){
  const pass17=new THREE.Group();pass17.name='17-pass17-reference-fidelity-glow';root.add(pass17);
  const changed=flattenAndWiden(root);
  addReferenceArmor(pass17);
  const glowRetuned=retuneExistingGlow(root);
  const thrusterGlow=addThrusterGlow(root,pass17);

  const meta=root.userData.sculptRuntime||{};
  meta.version='ship-forge-v10-pass17';
  meta.sections={...(meta.sections||{}),fidelity17:pass17};
  meta.confidence={...(meta.confidence||{}),visibleSide:.992,rear:.936,hiddenSide:.756,underside:.66};
  meta.inferred=[...(meta.inferred||[]),'pass17 proportions and glow placement are tuned from the user-supplied phone screenshot and embedded reference view'];
  meta.referenceCorrection={...(meta.referenceCorrection||{}),pass17Targets:['flatter wider hull','reduced dorsal tower','smaller recessed thruster faces','swept side silhouette','reference-like red/orange emissive accents'],pass17Changed:changed.length};
  meta.glow17={retunedExisting:glowRetuned,thrusterAssemblies:thrusterGlow,enginePalette:'red/orange recessed rings'};
  root.userData.sculptRuntime=meta;
  root.userData.pass17={group:pass17,changed,glowRetuned,thrusterGlow};
  return root.userData.pass17;
}
