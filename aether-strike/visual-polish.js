import * as THREE from 'three';
import { getProceduralTextures, getParticleTextures } from './procedural-textures.js';

let installed = false;
const coarse = matchMedia('(pointer: coarse)').matches;
const pfx = getParticleTextures();
const pbr = getProceduralTextures();

function polishMaterial(mat) {
  if (!mat || mat.userData?.__aetherPolished) return;
  if (!(mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial)) return;
  mat.userData.__aetherPolished = true;
  if (mat.metalness > .38) {
    if (!mat.map) mat.map = pbr.hullColor;
    if (!mat.roughnessMap) mat.roughnessMap = pbr.hullRoughness;
    if (!mat.normalMap) mat.normalMap = pbr.hullNormal;
    mat.normalScale?.set(.17, .17);
    mat.envMapIntensity = Math.max(mat.envMapIntensity || 1, 1.25);
  } else if (mat.roughness > .62 && !mat.transparent) {
    if (!mat.map) mat.map = pbr.rockColor;
    if (!mat.roughnessMap) mat.roughnessMap = pbr.rockRoughness;
  }
  if (mat.emissiveIntensity > 2 && !mat.emissiveMap) mat.emissiveMap = pbr.emissiveStripe;
  if (mat.isMeshPhysicalMaterial) {
    mat.clearcoat = Math.max(mat.clearcoat || 0, .24);
    mat.clearcoatRoughness = Math.min(mat.clearcoatRoughness ?? .2, .18);
  }
  mat.needsUpdate = true;
}

function polishObject(root) {
  root.traverse?.(o => {
    if (!o.isMesh || !o.material) return;
    const materials = Array.isArray(o.material) ? o.material : [o.material];
    materials.forEach(polishMaterial);
  });
}

function makeAtmosphere() {
  const group = new THREE.Group();
  group.name = '__AETHER_VISUAL_ATMOSPHERE__';
  group.userData.__polishInternal = true;

  const count = coarse ? 260 : 520;
  const pos = new Float32Array(count * 3);
  const size = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - .5) * 130;
    pos[i * 3 + 1] = -8 + Math.random() * 45;
    pos[i * 3 + 2] = -180 + Math.random() * 220;
    size[i] = .45 + Math.random() * 1.6;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uMap: { value: pfx.glow } },
    vertexShader: `attribute float aSize;uniform float uTime;varying float vA;void main(){vec3 p=position;p.z=mod(p.z+uTime*7.+180.,220.)-180.;p.x+=sin(uTime*.33+p.z*.027)*1.2;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=aSize*(95./max(2.,-mv.z));vA=smoothstep(210.,18.,-mv.z);}`,
    fragmentShader: `uniform sampler2D uMap;varying float vA;void main(){vec4 t=texture2D(uMap,gl_PointCoord);gl_FragColor=vec4(t.rgb,t.a*vA*.33);}`
  });
  const motes = new THREE.Points(g, m); motes.frustumCulled = false;
  motes.onBeforeRender = () => { m.uniforms.uTime.value = performance.now() * .001; };
  group.add(motes);

  const mistCount = coarse ? 75 : 130;
  const mistPos = new Float32Array(mistCount * 3);
  for (let i = 0; i < mistCount; i++) {
    mistPos[i * 3] = (Math.random() - .5) * 150;
    mistPos[i * 3 + 1] = -10 + Math.random() * 8;
    mistPos[i * 3 + 2] = -170 + Math.random() * 210;
  }
  const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.BufferAttribute(mistPos, 3));
  const mm = new THREE.PointsMaterial({ map: pfx.smoke, size: coarse ? 7 : 9, transparent: true, opacity: .12, depthWrite: false, color: 0x8aa8c2, sizeAttenuation: true });
  const mist = new THREE.Points(mg, mm); mist.frustumCulled = false; group.add(mist);

  const lineCount = coarse ? 32 : 56;
  const lp = new Float32Array(lineCount * 6);
  for (let i = 0; i < lineCount; i++) {
    const x = (Math.random() - .5) * 100, y = -4 + Math.random() * 34, z = -150 + Math.random() * 175, len = 1 + Math.random() * 4;
    lp[i * 6] = x; lp[i * 6 + 1] = y; lp[i * 6 + 2] = z;
    lp[i * 6 + 3] = x; lp[i * 6 + 4] = y; lp[i * 6 + 5] = z + len;
  }
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(lp, 3));
  const lm = new THREE.LineBasicMaterial({ color: 0x7eeaff, transparent: true, opacity: .12, blending: THREE.AdditiveBlending, depthWrite: false });
  const streaks = new THREE.LineSegments(lg, lm); group.add(streaks);
  streaks.onBeforeRender = () => { streaks.position.z = (performance.now() * .018) % 14; };

  const lightning = new THREE.PointLight(0x8ddcff, 0, 85, 2); lightning.position.set(0, 20, -45); group.add(lightning);
  lightning.onBeforeRender = () => {
    const t = performance.now() * .001;
    const pulse = Math.sin(t * 1.13) > .995 ? 18 : (Math.sin(t * .37 + 2.4) > .999 ? 26 : 0);
    lightning.intensity = pulse;
  };

  return group;
}

function attachEngineTrail(ship, addOriginal) {
  if (ship.userData.__trailAttached) return;
  ship.userData.__trailAttached = true;
  const count = coarse ? 86 : 150;
  const p = new Float32Array(count * 3), phase = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const side = i % 2 ? -1 : 1;
    p[i * 3] = side * .62 + (Math.random() - .5) * .12;
    p[i * 3 + 1] = -.14 + (Math.random() - .5) * .12;
    p[i * 3 + 2] = 1.15 + Math.random() * 7;
    phase[i] = Math.random();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  const m = new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{uTime:{value:0},uMap:{value:pfx.glow}},vertexShader:`attribute float aPhase;uniform float uTime;varying float vA;void main(){vec3 p=position;float z=mod(p.z+(uTime*8.+aPhase*7.),7.)+1.;p.z=z;p.x+=sin(uTime*7.+aPhase*18.)*.08*z*.12;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=(10.-min(z,8.))*(70./max(2.,-mv.z));vA=1.-smoothstep(1.,8.,z);}`,fragmentShader:`uniform sampler2D uMap;varying float vA;void main(){vec4 t=texture2D(uMap,gl_PointCoord);gl_FragColor=vec4(mix(vec3(.25,.95,1.),vec3(.8,.25,1.),1.-vA),t.a*vA*.68);}`});
  const trail = new THREE.Points(g,m); trail.frustumCulled=false; trail.userData.__polishInternal=true;
  trail.onBeforeRender=()=>{m.uniforms.uTime.value=performance.now()*.001};
  addOriginal.call(ship, trail);

  const wing = new THREE.BufferGeometry();
  wing.setAttribute('position', new THREE.Float32BufferAttribute([-2.05,.02,.1,2.05,.02,.1],3));
  const wm = new THREE.PointsMaterial({map:pfx.glow,size:.42,transparent:true,opacity:.68,depthWrite:false,blending:THREE.AdditiveBlending,color:0x9af9ff});
  const tips = new THREE.Points(wing, wm); tips.userData.__polishInternal=true; addOriginal.call(ship,tips);
}

function attachEnemyAura(obj, addOriginal) {
  if (obj.userData.__auraAttached) return;
  const type = obj.userData.type;
  if (!type && obj.name !== 'Harbinger Carrier') return;
  obj.userData.__auraAttached = true;
  const count = type === 'boss' || obj.name === 'Harbinger Carrier' ? (coarse?34:60) : (coarse?10:18);
  const radius = type === 'boss' || obj.name === 'Harbinger Carrier' ? 3.2 : (type === 'tank' ? 1.7 : 1.15);
  const pos = new Float32Array(count*3);
  for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,r=radius*(.55+Math.random()*.55);pos[i*3]=Math.cos(a)*r;pos[i*3+1]=(Math.random()-.5)*radius;pos[i*3+2]=Math.sin(a)*r*.42;}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const color=type==='tank'?0xffd16e:(type==='boss'?0xff5d9d:0x65f4ff);
  const m=new THREE.PointsMaterial({map:pfx.glow,size:type==='boss'?.34:.2,color,transparent:true,opacity:.4,depthWrite:false,blending:THREE.AdditiveBlending});
  const pts=new THREE.Points(g,m);pts.userData.__polishInternal=true;pts.onBeforeRender=()=>{pts.rotation.z=performance.now()*.00018;pts.rotation.y=performance.now()*.00011};addOriginal.call(obj,pts);
}

function projectileLike(o) {
  return !!(o?.isMesh && o.material?.blending === THREE.AdditiveBlending && (o.geometry?.type === 'CylinderGeometry' || o.geometry?.type === 'SphereGeometry'));
}

function attachProjectileGlow(obj, addOriginal) {
  if (obj.userData.__projectileGlow || !projectileLike(obj)) return;
  obj.userData.__projectileGlow = true;
  const color = obj.material.color?.getHex?.() ?? 0xffffff;
  const sm = new THREE.SpriteMaterial({map:pfx.glow,color,transparent:true,opacity:.7,depthWrite:false,blending:THREE.AdditiveBlending});
  const sp = new THREE.Sprite(sm); sp.scale.setScalar(obj.geometry.type === 'SphereGeometry' ? .8 : .5); sp.position.z=.35;sp.userData.__polishInternal=true;addOriginal.call(obj,sp);
}

function spawnBurst(parent, pos, color=0x9ffcff) {
  if (!parent || !pos) return;
  const count = coarse ? 9 : 15;
  const p = new Float32Array(count*3), v = new Float32Array(count*3);
  for(let i=0;i<count;i++){v[i*3]=(Math.random()-.5)*5;v[i*3+1]=(Math.random()-.5)*5;v[i*3+2]=(Math.random()-.5)*5;}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));g.setAttribute('aVel',new THREE.BufferAttribute(v,3));
  const m=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{uAge:{value:0},uMap:{value:pfx.spark},uColor:{value:new THREE.Color(color)}},vertexShader:`attribute vec3 aVel;uniform float uAge;varying float vA;void main(){vec3 p=position+aVel*uAge;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=(1.-uAge)*18.*(65./max(2.,-mv.z));vA=1.-uAge;}`,fragmentShader:`uniform sampler2D uMap;uniform vec3 uColor;varying float vA;void main(){vec4 t=texture2D(uMap,gl_PointCoord);gl_FragColor=vec4(uColor,t.a*vA);}`});
  const pts=new THREE.Points(g,m);pts.position.copy(pos);pts.userData.__polishInternal=true;const start=performance.now();
  pts.onBeforeRender=()=>{const age=(performance.now()-start)/420;m.uniforms.uAge.value=age;if(age>=1&&pts.parent){const par=pts.parent;par.remove(pts);g.dispose();m.dispose();}};
  parent.add(pts);
}

export function installVisualPolish() {
  if (installed) return;
  installed = true;
  const addOriginal = THREE.Object3D.prototype.add;
  const removeOriginal = THREE.Object3D.prototype.remove;
  let atmosphereInstalled = false;

  THREE.Object3D.prototype.add = function (...objects) {
    const result = addOriginal.apply(this, objects);
    for (const obj of objects) {
      if (!obj) continue;
      polishObject(obj);
      if (this.isScene && !atmosphereInstalled) {
        atmosphereInstalled = true;
        addOriginal.call(this, makeAtmosphere());
      }
      if (obj.name === 'Aether-9 Interceptor') attachEngineTrail(obj, addOriginal);
      if (obj.userData?.type || obj.name === 'Harbinger Carrier') attachEnemyAura(obj, addOriginal);
      if (projectileLike(obj)) attachProjectileGlow(obj, addOriginal);
    }
    return result;
  };

  THREE.Object3D.prototype.remove = function (...objects) {
    for (const obj of objects) {
      if (projectileLike(obj) && obj.parent === this) {
        const c = obj.material?.color?.getHex?.() ?? 0xffffff;
        spawnBurst(this, obj.position.clone(), c);
      }
    }
    return removeOriginal.apply(this, objects);
  };
}
