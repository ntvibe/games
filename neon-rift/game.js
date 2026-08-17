import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { TAU, clamp, lerp, smoothstep, hash, noise1, fbm1, makeRng, makeTexturePack } from './procedural.js';

const canvas = document.querySelector('#game');
const startScreen = document.querySelector('#start');
const enterButton = document.querySelector('#enter');
const boostButton = document.querySelector('#boost');
const scoreEl = document.querySelector('#score');
const shieldBar = document.querySelector('#shieldBar');
const energyBar = document.querySelector('#energyBar');
const shieldText = document.querySelector('#shieldText');
const energyText = document.querySelector('#energyText');
const flash = document.querySelector('#flash');
const toast = document.querySelector('#toast');
const qualityLabel = document.querySelector('#quality');

const isMobile = matchMedia('(pointer:coarse)').matches;
const lowHardware = (navigator.deviceMemory && navigator.deviceMemory <= 4) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const textures = makeTexturePack();

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false,
  alpha: false,
  powerPreference: 'high-performance',
  stencil: false,
  depth: true
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.setClearColor(0x020207, 1);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020207);
scene.fog = new THREE.FogExp2(0x05030d, 0.0165);

const camera = new THREE.PerspectiveCamera(72, 1, 0.05, 360);
camera.position.set(0, 1.1, 8.5);

const world = new THREE.Group();
scene.add(world);

const hemi = new THREE.HemisphereLight(0x6d7cff, 0x12051d, 0.48);
scene.add(hemi);
const keyLight = new THREE.DirectionalLight(0xb6f8ff, 2.2);
keyLight.position.set(4, 5, 6);
scene.add(keyLight);
const chaseLight = new THREE.PointLight(0x6af5ff, 22, 24, 2);
scene.add(chaseLight);
const rimLight = new THREE.PointLight(0x9a63ff, 22, 28, 2);
scene.add(rimLight);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 1.18, 0.72, 0.1);
composer.addPass(bloomPass);

const lensShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uHit: { value: 0 },
    uBoost: { value: 0 },
    uSurge: { value: 0 },
    uSpeed: { value: 0 }
  },
  vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime,uHit,uBoost,uSurge,uSpeed;
    varying vec2 vUv;
    float rnd(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
    void main(){
      vec2 p=vUv-.5;
      float r=length(p);
      float warp=(uBoost*.012+uSurge*.008)*r*r;
      vec2 uv=.5+p*(1.0-warp);
      vec2 dir=normalize(p+0.00001);
      float aberr=(.0008+uBoost*.0021+uHit*.0032+uSurge*.0012)*(.25+r);
      float rr=texture2D(tDiffuse,uv+dir*aberr).r;
      float gg=texture2D(tDiffuse,uv).g;
      float bb=texture2D(tDiffuse,uv-dir*aberr).b;
      vec3 col=vec3(rr,gg,bb);
      float vign=smoothstep(.86,.24,r);
      col*=mix(.49,1.02,vign);
      float radial=atan(p.y,p.x)*19.0+r*42.0-uTime*(4.0+uSpeed*7.0);
      float speedLines=pow(max(0.0,sin(radial)),18.0)*smoothstep(.18,.65,r)*(uBoost*.12+uSurge*.06);
      col+=speedLines*vec3(.18,.55,1.0);
      float scan=.987+.013*sin(vUv.y*980.0+uTime*4.0);
      float grain=(rnd(vUv*vec2(1703.0,977.0)+uTime)-.5)*(.018+uBoost*.012);
      col=col*scan+grain;
      col+=uHit*vec3(.5,.01,.05)*(1.0-r);
      col+=uSurge*vec3(.03,.015,.1)*(1.0-r*r);
      gl_FragColor=vec4(col,1.0);
    }`
};
const lensPass = new ShaderPass(lensShader);
composer.addPass(lensPass);
composer.addPass(new OutputPass());

const state = {
  started: false,
  paused: false,
  gameOver: false,
  distance: 0,
  speed: 22,
  score: 0,
  combo: 1,
  comboTimer: 0,
  shield: 100,
  energy: 100,
  boostHeld: false,
  boostPulse: 0,
  hitPulse: 0,
  surge: 0,
  surgeTimer: 8,
  targetX: 0,
  targetY: 0,
  pointerActive: false,
  qualityTier: lowHardware ? 1 : 2,
  fps: 60,
  biome: 0,
  nextBiome: 1,
  biomeMix: 0,
  lastBoost: false,
  seed: (Date.now() ^ 0x5f3759df) >>> 0
};

const PALETTES = [
  { name: 'ION GARDEN', bg: 0x02070b, fog: 0x041018, a: 0x5efff4, b: 0x6377ff, c: 0xcf58ff },
  { name: 'MAGENTA STORM', bg: 0x0b020b, fog: 0x130413, a: 0xff4fc4, b: 0x825dff, c: 0xff8a43 },
  { name: 'GHOST CIRCUIT', bg: 0x020509, fog: 0x050b11, a: 0x9afcff, b: 0x37a5ff, c: 0xb7ff6a },
  { name: 'SOLAR VOID', bg: 0x090602, fog: 0x130a04, a: 0xffd05f, b: 0xff5f86, c: 0xa86cff }
];

const colorA = new THREE.Color();
const colorB = new THREE.Color();
const colorC = new THREE.Color();
const bgColor = new THREE.Color();
const fogColor = new THREE.Color();
const tmpColor = new THREE.Color();
const whiteColor = new THREE.Color(0xffffff);
let lastQualityText = '';

function currentPalette() {
  const a = PALETTES[state.biome % PALETTES.length];
  const b = PALETTES[state.nextBiome % PALETTES.length];
  colorA.set(a.a).lerp(tmpColor.set(b.a), state.biomeMix);
  colorB.set(a.b).lerp(tmpColor.set(b.b), state.biomeMix);
  colorC.set(a.c).lerp(tmpColor.set(b.c), state.biomeMix);
  bgColor.set(a.bg).lerp(tmpColor.set(b.bg), state.biomeMix);
  fogColor.set(a.fog).lerp(tmpColor.set(b.fog), state.biomeMix);
}

function pathAt(w) {
  const long = fbm1(w * 0.0021 + 11.4) - .5;
  const mid = fbm1(w * 0.0065 + 71.8) - .5;
  return {
    x: Math.sin(w * .016) * 1.08 + Math.sin(w * .0067 + 1.7) * 1.35 + long * 2.1 + mid * .75,
    y: Math.sin(w * .013 + .7) * .72 + Math.cos(w * .0052) * .62 + long * .78 + mid * .35
  };
}

function pathBank(w) {
  const a = pathAt(w - 1.8);
  const b = pathAt(w + 1.8);
  return Math.atan2(b.x - a.x, 3.6) * .95 + Math.sin(w * .004) * .12;
}

function tunnelRadius(w) {
  const wave = Math.sin(w * .006 + noise1(w * .001) * 4) * .48;
  const n = (fbm1(w * .0043 + 9.3) - .5) * 1.25;
  return 5.75 + wave + n + state.surge * .22 * Math.sin(w * .16);
}

function tunnelSquash(w) {
  return .86 + (fbm1(w * .003 + 31.1) - .5) * .18;
}

const hullMat = new THREE.MeshStandardMaterial({
  color: 0x151a26,
  map: textures.hull,
  roughnessMap: textures.roughness,
  metalness: .94,
  roughness: .29,
  emissive: 0x071121,
  emissiveIntensity: 1.05
});
textures.hull.repeat.set(2.5, 2.5);
textures.roughness.repeat.set(3, 3);

const glowMat = new THREE.MeshBasicMaterial({ color: 0x67f8ff, toneMapped: false });
const glowMat2 = new THREE.MeshBasicMaterial({ color: 0x8b67ff, toneMapped: false });
const glowMat3 = new THREE.MeshBasicMaterial({ color: 0xff58c8, toneMapped: false });
const redMat = new THREE.MeshStandardMaterial({ color: 0x190309, metalness: .78, roughness: .2, emissive: 0xff245e, emissiveIntensity: 3.2 });

function createShip() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.OctahedronGeometry(.66, 2), hullMat);
  body.scale.set(.76, .42, 1.78);
  body.rotation.x = Math.PI * .5;
  g.add(body);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(.34, 1.5, 5), hullMat);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -1.28;
  g.add(nose);

  const wingGeo = new THREE.BufferGeometry();
  wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([
    0, 0, .18, -2.15, -.1, .64, -.44, 0, -.72,
    0, 0, .18, 2.15, -.1, .64, .44, 0, -.72
  ], 3));
  wingGeo.computeVertexNormals();
  g.add(new THREE.Mesh(wingGeo, hullMat));

  const finGeo = new THREE.ConeGeometry(.11, .82, 4);
  for (const side of [-1, 1]) {
    const fin = new THREE.Mesh(finGeo, hullMat);
    fin.rotation.z = side * .68;
    fin.rotation.x = .12;
    fin.position.set(side * 1.38, .02, .34);
    g.add(fin);
  }

  const edgeGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-2.16, -.08, .63), new THREE.Vector3(-.46, -.02, -.72),
    new THREE.Vector3(0, 0, -1.82), new THREE.Vector3(.46, -.02, -.72), new THREE.Vector3(2.16, -.08, .63)
  ]);
  const edge = new THREE.Line(edgeGeo, new THREE.LineBasicMaterial({ color: 0x6dfcff, transparent: true, opacity: .92, toneMapped: false }));
  edge.name = 'accent';
  g.add(edge);

  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(.38, 20, 12), new THREE.MeshPhysicalMaterial({
    color: 0x06141b,
    metalness: .3,
    roughness: .08,
    transmission: .18,
    thickness: .4,
    emissive: 0x0b9fc0,
    emissiveIntensity: 1.15
  }));
  cockpit.scale.set(.72, .4, 1.3);
  cockpit.position.set(0, .28, -.2);
  g.add(cockpit);

  const stripeMat = new THREE.MeshBasicMaterial({ color: 0x6ffcff, toneMapped: false });
  for (const x of [-.34, .34]) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(.045, .045, 1.25), stripeMat.clone());
    stripe.position.set(x, .18, -.15);
    stripe.name = 'stripe';
    g.add(stripe);
  }

  const plumeMat = new THREE.MeshBasicMaterial({ color: 0x7efcff, transparent: true, opacity: .75, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  for (const x of [-.8, .8]) {
    const engine = new THREE.Mesh(new THREE.CylinderGeometry(.15, .24, .72, 14, 1, true), hullMat);
    engine.rotation.x = Math.PI / 2;
    engine.position.set(x, -.13, .5);
    g.add(engine);
    const glow = new THREE.Mesh(new THREE.CircleGeometry(.14, 16), stripeMat);
    glow.rotation.y = Math.PI;
    glow.position.set(x, -.13, .9);
    g.add(glow);
    const plume = new THREE.Mesh(new THREE.ConeGeometry(.2, 1.6, 14, 1, true), plumeMat.clone());
    plume.rotation.x = -Math.PI / 2;
    plume.position.set(x, -.13, 1.62);
    plume.name = 'plume';
    g.add(plume);
  }

  const aura = new THREE.PointLight(0x63f7ff, 12, 8, 2);
  aura.name = 'aura';
  aura.position.set(0, -.1, .7);
  g.add(aura);
  g.position.set(0, .05, 1.7);
  g.scale.setScalar(.72);
  return g;
}

const ship = createShip();
world.add(ship);

const ringCount = lowHardware ? 32 : 40;
const ringSpacing = 5.7;
const tunnelLength = ringCount * ringSpacing;
const ringGeo = new THREE.TorusGeometry(1, .035, 5, lowHardware ? 48 : 72);
const rings = [];
for (let i = 0; i < ringCount; i++) {
  const mat = new THREE.MeshBasicMaterial({ color: 0x62f9ff, transparent: true, opacity: .42, toneMapped: false });
  const ring = new THREE.Mesh(ringGeo, mat);
  world.add(ring);
  rings.push(ring);
}

const segmentCount = lowHardware ? 14 : 18;
const panelGeo = new THREE.BoxGeometry(.16, 1.45, .07);
const panelMat = new THREE.MeshStandardMaterial({
  color: 0x070912,
  map: textures.glyph,
  roughnessMap: textures.roughness,
  metalness: .88,
  roughness: .28,
  emissive: 0x26106d,
  emissiveIntensity: 1.35
});
textures.glyph.repeat.set(.6, 2.2);
const panels = new THREE.InstancedMesh(panelGeo, panelMat, ringCount * segmentCount);
panels.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
world.add(panels);

const lightGeo = new THREE.BoxGeometry(.035, .5, .025);
const lightMat = new THREE.MeshBasicMaterial({ color: 0x67f8ff, toneMapped: false });
const lightStrips = new THREE.InstancedMesh(lightGeo, lightMat, ringCount * Math.ceil(segmentCount / 2));
lightStrips.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
world.add(lightStrips);
const dummy = new THREE.Object3D();

const debrisCount = lowHardware ? 80 : 170;
const debrisGeo = new THREE.TetrahedronGeometry(.16, 0);
const debrisMat = new THREE.MeshStandardMaterial({ color: 0x10121c, metalness: .85, roughness: .38, emissive: 0x090318, emissiveIntensity: .7 });
const debris = new THREE.InstancedMesh(debrisGeo, debrisMat, debrisCount);
debris.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
world.add(debris);
const debrisSeed = Array.from({ length: debrisCount }, (_, i) => ({
  a: hash(i * 17.31 + state.seed) * TAU,
  r: 7 + hash(i * 91.7 + 4) * 8,
  z: hash(i * 33.1 + 8) * 240,
  s: .35 + hash(i * 43.7 + 9) * 2.2,
  spin: hash(i * 5.17 + 11) * TAU
}));

const starCount = lowHardware ? 520 : 980;
const starPos = new Float32Array(starCount * 3);
const starSeed = new Float32Array(starCount);
for (let i = 0; i < starCount; i++) {
  const a = Math.random() * TAU;
  const r = 8 + Math.random() * 28;
  starPos[i * 3] = Math.cos(a) * r;
  starPos[i * 3 + 1] = Math.sin(a) * r * .72;
  starPos[i * 3 + 2] = -Math.random() * 260;
  starSeed[i] = Math.random();
}
const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
starGeo.setAttribute('aSeed', new THREE.BufferAttribute(starSeed, 1));
const starMat = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  toneMapped: false,
  uniforms: { uTravel: { value: 0 }, uSpeed: { value: 0 }, uA: { value: new THREE.Color(0x62f9ff) }, uB: { value: new THREE.Color(0x8b66ff) } },
  vertexShader: `attribute float aSeed;uniform float uTravel,uSpeed;varying float vA;void main(){vec3 p=position;p.z=mod(p.z+uTravel+aSeed*48.0+260.0,260.0)-260.0;vec4 mv=modelViewMatrix*vec4(p,1.0);float s=(1.5+aSeed*3.0+uSpeed*4.0)*(170.0/-mv.z);gl_PointSize=clamp(s,1.0,22.0);gl_Position=projectionMatrix*mv;vA=(.18+aSeed*.82)*smoothstep(-260.0,-8.0,p.z);}`,
  fragmentShader: `uniform vec3 uA,uB;varying float vA;void main(){vec2 p=gl_PointCoord-.5;float d=length(p);float a=smoothstep(.5,0.0,d)*vA;vec3 c=mix(uB,uA,gl_PointCoord.y);gl_FragColor=vec4(c,a);}`
});
world.add(new THREE.Points(starGeo, starMat));

const smokeCount = lowHardware ? 12 : 26;
const smokeGroup = new THREE.Group();
const smokeSprites = [];
for (let i = 0; i < smokeCount; i++) {
  const m = new THREE.SpriteMaterial({ map: textures.smoke, color: 0x6c58ff, transparent: true, opacity: .18, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const s = new THREE.Sprite(m);
  const a = hash(i * 10.7) * TAU;
  const r = 6.8 + hash(i * 18.1) * 5;
  s.userData = { baseA: a, r, z: hash(i * 31.2) * 220, phase: hash(i * 7.9) * TAU };
  const scale = 4 + hash(i * 14.6) * 8;
  s.scale.set(scale, scale, 1);
  smokeGroup.add(s);
  smokeSprites.push(s);
}
world.add(smokeGroup);

const singularity = new THREE.Group();
const black = new THREE.Mesh(new THREE.SphereGeometry(2.1, 28, 18), new THREE.MeshBasicMaterial({ color: 0x000000 }));
singularity.add(black);
for (let i = 0; i < 5; i++) {
  const mat = new THREE.MeshBasicMaterial({ color: i % 2 ? 0xff57c6 : 0x7b68ff, transparent: true, opacity: .86, toneMapped: false });
  const t = new THREE.Mesh(new THREE.TorusGeometry(2.7 + i * .36, .028 + i * .006, 5, 80), mat);
  t.rotation.x = .95 + i * .13;
  t.rotation.y = i * .29;
  singularity.add(t);
}
const singularityGlow = new THREE.PointLight(0x7b54ff, 38, 38, 2);
singularity.add(singularityGlow);
singularity.position.set(0, 0, -118);
world.add(singularity);

const shockwaves = Array.from({ length: 5 }, () => {
  const m = new THREE.Mesh(new THREE.TorusGeometry(1, .032, 5, 64), new THREE.MeshBasicMaterial({ color: 0x72faff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  m.visible = false;
  world.add(m);
  return { m, life: 0, max: 1, x: 0, y: 0, z: 0 };
});
let shockIndex = 0;
function spawnShockwave(x = ship.position.x, y = ship.position.y, z = ship.position.z - .5, strength = 1) {
  const q = shockwaves[shockIndex++ % shockwaves.length];
  q.life = q.max = .55 + strength * .25;
  q.x = x; q.y = y; q.z = z;
  q.m.visible = true;
  q.m.position.set(x, y, z);
  q.m.scale.setScalar(.35);
  q.m.material.color.copy(colorA);
}

function makeObstacle(index) {
  const g = new THREE.Group();
  const mine = new THREE.Group();
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(.7, 1), redMat);
  mine.add(core);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(1.18, .05, 5, 32), glowMat3.clone());
  halo.rotation.x = Math.PI / 2;
  mine.add(halo);
  const spikeGeo = new THREE.ConeGeometry(.13, .8, 5);
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Mesh(spikeGeo, redMat);
    const a = i / 6 * TAU;
    s.position.set(Math.cos(a) * .92, Math.sin(a) * .92, 0);
    s.rotation.z = -a;
    s.rotation.x = Math.PI / 2;
    mine.add(s);
  }
  g.add(mine);

  const blade = new THREE.Group();
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, .55, 12), redMat);
  hub.rotation.x = Math.PI / 2;
  blade.add(hub);
  for (let i = 0; i < 4; i++) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(.16, 2.7, .13), redMat);
    arm.position.y = 1.25;
    const pivot = new THREE.Group();
    pivot.rotation.z = i * Math.PI / 2;
    pivot.add(arm);
    blade.add(pivot);
  }
  g.add(blade);

  const drone = new THREE.Group();
  const dbody = new THREE.Mesh(new THREE.OctahedronGeometry(.52, 1), redMat);
  dbody.scale.set(1.6, .5, 1);
  drone.add(dbody);
  for (const x of [-1, 1]) {
    const orb = new THREE.Mesh(new THREE.SphereGeometry(.18, 10, 8), glowMat3.clone());
    orb.position.set(x * .75, 0, 0);
    drone.add(orb);
  }
  g.add(drone);

  world.add(g);
  return { g, mine, blade, drone, at: 0, offX: 0, offY: 0, hit: false, near: false, spin: .3, type: 0, seed: index * 137 + state.seed };
}

const obstacleCount = lowHardware ? 8 : 11;
const obstacles = Array.from({ length: obstacleCount }, (_, i) => makeObstacle(i));
function resetObstacle(o, at) {
  o.at = at;
  const r = makeRng((o.seed + Math.floor(at * 13)) >>> 0);
  o.type = Math.floor(r() * 3);
  o.mine.visible = o.type === 0;
  o.blade.visible = o.type === 1;
  o.drone.visible = o.type === 2;
  const danger = clamp(state.distance / 1500, 0, 1);
  o.offX = (r() - .5) * lerp(6.7, 5.8, danger);
  o.offY = (r() - .5) * lerp(4.4, 3.7, danger);
  o.spin = .35 + r() * 1.2;
  o.hit = false;
  o.near = false;
}
obstacles.forEach((o, i) => resetObstacle(o, 52 + i * 28 + hash(i * 17) * 18));

function makeShard(index) {
  const g = new THREE.Group();
  const mat = glowMat.clone();
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(.38, 0), mat);
  g.add(core);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(.62, .024, 5, 24), glowMat2.clone());
  halo.rotation.x = Math.PI / 2;
  g.add(halo);
  world.add(g);
  return { g, core, halo, at: 0, offX: 0, offY: 0, taken: false, seed: state.seed + index * 97 };
}
const shards = Array.from({ length: 16 }, (_, i) => makeShard(i));
function resetShard(s, at) {
  const r = makeRng((s.seed + Math.floor(at * 7)) >>> 0);
  s.at = at;
  s.offX = (r() - .5) * 5.8;
  s.offY = (r() - .5) * 3.7;
  s.taken = false;
  s.g.visible = true;
}
shards.forEach((s, i) => resetShard(s, 28 + i * 18 + hash(i * 23) * 10));

const gateCount = 4;
const gates = Array.from({ length: gateCount }, (_, i) => {
  const mat = new THREE.MeshBasicMaterial({ color: 0x67f9ff, transparent: true, opacity: .7, toneMapped: false });
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(1.35, .055, 6, 48), mat);
  world.add(mesh);
  return { mesh, at: 95 + i * 125, offX: 0, offY: 0, taken: false, seed: state.seed + 812 + i * 41 };
});
function resetGate(g, at) {
  const r = makeRng((g.seed + Math.floor(at)) >>> 0);
  g.at = at;
  g.offX = (r() - .5) * 4.8;
  g.offY = (r() - .5) * 3.1;
  g.taken = false;
  g.mesh.visible = true;
}
gates.forEach((g, i) => resetGate(g, 90 + i * 130));

let audio = null;
function initAudio() {
  if (audio) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  const ctx = new AC();
  const master = ctx.createGain();
  master.gain.value = .17;
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -18;
  compressor.knee.value = 18;
  compressor.ratio.value = 4;
  master.connect(compressor);
  compressor.connect(ctx.destination);

  const engineGain = ctx.createGain();
  engineGain.gain.value = .055;
  const engine = ctx.createOscillator();
  const sub = ctx.createOscillator();
  engine.type = 'sawtooth';
  sub.type = 'sine';
  engine.frequency.value = 58;
  sub.frequency.value = 116;
  engine.connect(engineGain);
  sub.connect(engineGain);
  engineGain.connect(master);
  engine.start();
  sub.start();
  audio = { ctx, master, engineGain, engine, sub, nextBeat: ctx.currentTime + .1, beat: 0 };
}

function blip(freq = 720, duration = .08, type = 'sine', amount = .1, glide = 1.4) {
  if (!audio) return;
  const { ctx, master } = audio;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, ctx.currentTime);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * glide), ctx.currentTime + duration);
  g.gain.setValueAtTime(amount, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + duration);
  o.connect(g);
  g.connect(master);
  o.start();
  o.stop(ctx.currentTime + duration + .02);
}

function updateMusic(boosting) {
  if (!audio || audio.ctx.state !== 'running') return;
  const bpm = 108 + state.boostPulse * 28 + state.surge * 12;
  const interval = 60 / bpm / 2;
  const now = audio.ctx.currentTime;
  while (audio.nextBeat < now + .02) {
    const beat = audio.beat++;
    if (beat % 4 === 0) blip(48 + state.biome * 3, .11, 'sine', .07, .82);
    if (beat % 2 === 1 && state.qualityTier > 0) blip(1600 + (beat % 8) * 120, .025, 'square', .018, .7);
    if (beat % 8 === 6 || (boosting && beat % 4 === 2)) {
      const scale = [220, 247, 294, 330, 392, 440];
      blip(scale[(beat / 2 + state.biome) % scale.length | 0], .07, 'triangle', .035, 1.08);
    }
    audio.nextBeat += interval;
  }
}

function haptic(pattern) { if (navigator.vibrate) navigator.vibrate(pattern); }
let toastTimer = 0;
function showToast(text, color = '#8cfbff') {
  toast.textContent = text;
  toast.style.color = color;
  toast.style.opacity = '1';
  toast.style.transform = 'translateY(-8px) scale(1.04)';
  toastTimer = .9;
}

function addCombo(amount = 1) {
  state.combo = clamp(state.combo + amount, 1, 8);
  state.comboTimer = 3.2;
}

function doHit() {
  if (state.hitPulse > .2 || state.gameOver) return;
  state.shield = Math.max(0, state.shield - 22);
  state.hitPulse = 1;
  state.combo = 1;
  haptic([22, 30, 22]);
  blip(86, .18, 'sawtooth', .16, .55);
  showToast('SHIELD HIT', '#ff4d7c');
  spawnShockwave(ship.position.x, ship.position.y, ship.position.z - .6, .8);
  if (state.shield <= 0) {
    state.gameOver = true;
    showToast('SYSTEM REBOOT', '#ff4d7c');
    setTimeout(resetRun, 1100);
  }
}

function collectShard() {
  state.energy = Math.min(100, state.energy + 15);
  state.score += 220 * state.combo;
  addCombo(.35);
  haptic(8);
  blip(720 + state.combo * 35, .08, 'sine', .1, 1.55);
  showToast(`ENERGY ×${state.combo.toFixed(1)}`, '#69f7ff');
  spawnShockwave(ship.position.x, ship.position.y, ship.position.z - .5, .45);
}

function gateBonus() {
  state.energy = Math.min(100, state.energy + 25);
  state.shield = Math.min(100, state.shield + 7);
  state.score += 650 * state.combo;
  addCombo(.75);
  haptic([8, 18, 8]);
  blip(980, .12, 'triangle', .14, 1.8);
  showToast(`RIFT GATE ×${state.combo.toFixed(1)}`, '#ffffff');
  spawnShockwave(ship.position.x, ship.position.y, ship.position.z - 1.2, 1.2);
}

function nearMiss() {
  state.score += 180 * state.combo;
  addCombo(.2);
  blip(440 + state.combo * 22, .05, 'triangle', .05, 1.3);
  showToast(`NEAR MISS ×${state.combo.toFixed(1)}`, '#d9c3ff');
}

function resetRun() {
  state.distance = 0;
  state.score = 0;
  state.combo = 1;
  state.comboTimer = 0;
  state.shield = 100;
  state.energy = 100;
  state.targetX = 0;
  state.targetY = 0;
  state.gameOver = false;
  state.surgeTimer = 8;
  obstacles.forEach((o, i) => resetObstacle(o, 52 + i * 28 + hash(i * 17) * 18));
  shards.forEach((s, i) => resetShard(s, 28 + i * 18 + hash(i * 23) * 10));
  gates.forEach((g, i) => resetGate(g, 90 + i * 130));
}

function updateBiome() {
  const span = 520;
  const x = state.distance / span;
  const index = Math.floor(x);
  const f = x - index;
  state.biome = index % PALETTES.length;
  state.nextBiome = (state.biome + 1) % PALETTES.length;
  state.biomeMix = smoothstep(.68, .96, f);
  currentPalette();
  scene.background.copy(bgColor);
  scene.fog.color.copy(fogColor);
  panelMat.emissive.copy(colorB).multiplyScalar(.45);
  lightMat.color.copy(colorA);
  starMat.uniforms.uA.value.copy(colorA);
  starMat.uniforms.uB.value.copy(colorB);
  chaseLight.color.copy(colorA);
  rimLight.color.copy(colorB);
  keyLight.color.copy(colorA).lerp(whiteColor, .55);
  hemi.color.copy(colorB);
  singularityGlow.color.copy(colorB);
  singularity.children.forEach((child, i) => {
    if (child.isMesh && child !== black && child.material?.color) child.material.color.copy(i % 2 ? colorC : colorB);
  });
  smokeSprites.forEach((s, i) => s.material.color.copy(i % 2 ? colorB : colorC));
  const qText = `${PALETTES[state.biome].name} · Q${state.qualityTier + 1}`;
  if (qText !== lastQualityText) { qualityLabel.textContent = qText; lastQualityText = qText; }
}

function updateTunnel(t) {
  let panelIndex = 0;
  let lightIndex = 0;
  const modDist = state.distance % ringSpacing;
  for (let i = 0; i < ringCount; i++) {
    let depth = (i * ringSpacing - modDist + ringSpacing) % tunnelLength;
    if (depth < 2) depth += tunnelLength;
    const w = state.distance + depth;
    const p = pathAt(w);
    const z = 6 - depth;
    const bank = pathBank(w) + Math.sin(w * .009 + t * .28) * .05;
    const radius = tunnelRadius(w);
    const squash = tunnelSquash(w);
    const ring = rings[i];
    ring.position.set(p.x, p.y, z);
    ring.rotation.z = bank;
    const pulse = 1 + Math.sin(w * .09 - t * 3.6) * (.018 + state.surge * .025);
    ring.scale.set(radius * pulse, radius * squash * pulse, 1);
    ring.material.color.copy(i % 4 === 0 ? colorC : (i % 2 ? colorA : colorB));
    ring.material.opacity = .18 + (i % 5 === 0 ? .34 : .12) + state.surge * .12;

    for (let j = 0; j < segmentCount; j++) {
      const a = j / segmentCount * TAU + bank + Math.sin(w * .011) * .14;
      const radialNoise = 1 + (hash(i * 97 + j * 17 + Math.floor(w / 40)) - .5) * .07;
      const rx = radius * radialNoise;
      const ry = radius * squash * radialNoise;
      const px = p.x + Math.cos(a) * rx;
      const py = p.y + Math.sin(a) * ry;
      const flick = .72 + Math.sin(w * .21 + j * 2.17 + t * 1.8) * .16 + hash(j * 19 + i) * .18;
      dummy.position.set(px, py, z);
      dummy.rotation.set(0, 0, a);
      dummy.scale.set(1, flick * (1 + state.surge * .08), 1);
      dummy.updateMatrix();
      panels.setMatrixAt(panelIndex++, dummy.matrix);

      if (j % 2 === 0) {
        dummy.position.set(px * .998 + p.x * .002, py * .998 + p.y * .002, z + .012);
        dummy.rotation.set(0, 0, a);
        dummy.scale.set(1, .6 + .45 * Math.sin(t * 5 + j + w * .1), 1);
        dummy.updateMatrix();
        lightStrips.setMatrixAt(lightIndex++, dummy.matrix);
      }
    }
  }
  panels.instanceMatrix.needsUpdate = true;
  lightStrips.instanceMatrix.needsUpdate = true;
}

function updateDebris(t) {
  if (!debris.visible) return;
  for (let i = 0; i < debrisCount; i++) {
    const d = debrisSeed[i];
    const zTravel = (d.z - (state.distance * 1.16) % 240 + 240) % 240;
    const z = 6 - zTravel;
    const wob = Math.sin(t * .45 + d.spin) * .35;
    dummy.position.set(Math.cos(d.a + t * .02) * (d.r + wob), Math.sin(d.a + t * .018) * (d.r * .73), z);
    dummy.rotation.set(t * .25 + d.spin, t * .17 + d.a, d.spin);
    dummy.scale.setScalar(d.s);
    dummy.updateMatrix();
    debris.setMatrixAt(i, dummy.matrix);
  }
  debris.instanceMatrix.needsUpdate = true;
}

function updateSmoke(t) {
  for (const s of smokeSprites) {
    const d = s.userData;
    const zTravel = (d.z - (state.distance * .64) % 220 + 220) % 220;
    const z = 4 - zTravel;
    const a = d.baseA + Math.sin(t * .08 + d.phase) * .16;
    s.position.set(Math.cos(a) * d.r, Math.sin(a) * d.r * .72, z);
    s.material.opacity = (.045 + .12 * smoothstep(210, 20, zTravel)) * (state.qualityTier > 0 ? 1 : .35);
    s.material.rotation = t * .015 + d.phase;
  }
}

function updateShockwaves(dt) {
  for (const q of shockwaves) {
    if (q.life <= 0) continue;
    q.life -= dt;
    const k = 1 - q.life / q.max;
    q.m.scale.setScalar(.35 + k * (7 + q.max * 2.5));
    q.m.material.opacity = (1 - k) * .5;
    q.m.position.z -= dt * state.speed * .35;
    if (q.life <= 0) q.m.visible = false;
  }
}

function updateSurge(dt) {
  state.surgeTimer -= dt;
  if (state.surgeTimer <= 0 && state.surge < .05) {
    state.surgeTimer = 12 + hash(state.distance * .071) * 12;
    state.surge = 1;
    showToast('RIFT SURGE', '#ffffff');
    blip(120, .28, 'sawtooth', .11, 2.4);
    haptic([10, 35, 10]);
    spawnShockwave(ship.position.x, ship.position.y, ship.position.z - 1, 1.4);
  }
  state.surge = Math.max(0, state.surge - dt * .42);
}

function updateGameplay(dt, t) {
  const boosting = state.boostHeld && state.energy > 1 && !state.gameOver;
  const difficulty = clamp(state.distance / 1800, 0, 1);
  const baseSpeed = lerp(22, 27, difficulty);
  const targetSpeed = boosting ? baseSpeed + 17 : baseSpeed;
  state.speed = THREE.MathUtils.damp(state.speed, targetSpeed, 3.3, dt);
  state.boostPulse = THREE.MathUtils.damp(state.boostPulse, boosting ? 1 : 0, 5.5, dt);
  if (boosting) state.energy = Math.max(0, state.energy - dt * 16.5);
  else state.energy = Math.min(100, state.energy + dt * (4.4 + state.surge * 1.5));
  if (!state.gameOver) {
    state.distance += state.speed * dt;
    state.score += state.speed * dt * (4.2 + (state.combo - 1) * .28);
  }

  if (state.comboTimer > 0) state.comboTimer -= dt;
  else state.combo = THREE.MathUtils.damp(state.combo, 1, 1.7, dt);

  updateSurge(dt);
  updateBiome();

  const steerLag = 7.4 + state.boostPulse * 1.4;
  ship.position.x = THREE.MathUtils.damp(ship.position.x, state.targetX, steerLag, dt);
  ship.position.y = THREE.MathUtils.damp(ship.position.y, state.targetY, steerLag, dt);
  const dx = state.targetX - ship.position.x;
  const dy = state.targetY - ship.position.y;
  ship.rotation.z = THREE.MathUtils.damp(ship.rotation.z, -dx * .27 - pathBank(state.distance + 12) * .28, 6.8, dt);
  ship.rotation.x = THREE.MathUtils.damp(ship.rotation.x, dy * .09, 6.8, dt);
  ship.rotation.y = THREE.MathUtils.damp(ship.rotation.y, -dx * .035, 5, dt);
  ship.position.z = 1.7 + Math.sin(t * 5.4) * .035;
  ship.children.forEach((c) => {
    if (c.name === 'plume') {
      c.scale.y = 1 + state.boostPulse * 1.75 + Math.sin(t * 27 + c.position.x) * .09;
      c.material.opacity = .55 + state.boostPulse * .33;
      c.material.color.copy(colorA);
    } else if (c.name === 'stripe' || c.name === 'accent') {
      c.material.color.copy(colorA);
    } else if (c.name === 'aura') {
      c.intensity = 10 + state.boostPulse * 25 + state.surge * 8 + Math.sin(t * 18) * 2;
      c.color.copy(colorA);
    }
  });

  if (boosting && !state.lastBoost) {
    spawnShockwave(ship.position.x, ship.position.y, ship.position.z - .8, .9);
    blip(160, .13, 'sawtooth', .08, 1.9);
  }
  state.lastBoost = boosting;

  const bank = pathBank(state.distance + 20);
  const shake = reducedMotion ? 0 : state.hitPulse * .14 + state.surge * .02 + state.boostPulse * .012;
  const camX = ship.position.x * .2 + Math.sin(t * 41) * shake;
  const camY = 1.12 + ship.position.y * .17 + Math.cos(t * 37) * shake;
  camera.position.x = THREE.MathUtils.damp(camera.position.x, camX, 4.2, dt);
  camera.position.y = THREE.MathUtils.damp(camera.position.y, camY, 4.2, dt);
  camera.position.z = THREE.MathUtils.damp(camera.position.z, 8.5 + state.boostPulse * .42, 4, dt);
  camera.fov = THREE.MathUtils.damp(camera.fov, 72 + state.boostPulse * 8 + state.surge * 2.5, 4, dt);
  camera.updateProjectionMatrix();
  camera.lookAt(ship.position.x * .34, ship.position.y * .26, -11);
  camera.rotation.z += (-bank * .12 - ship.rotation.z * .08 - camera.rotation.z) * (1 - Math.exp(-3.5 * dt));

  chaseLight.position.set(ship.position.x - 2.8, ship.position.y + 1.7, 3.2);
  rimLight.position.set(ship.position.x + 3.1, ship.position.y - 1.2, 1.8);

  for (const o of obstacles) {
    let depth = o.at - state.distance;
    if (depth < -8) {
      resetObstacle(o, o.at + lerp(190, 155, difficulty) + hash(o.at) * 80);
      depth = o.at - state.distance;
    }
    const p = pathAt(o.at);
    if (o.type === 2) {
      const chase = smoothstep(45, 8, depth);
      o.offX += (ship.position.x - (p.x + o.offX)) * dt * chase * .32;
      o.offY += (ship.position.y - (p.y + o.offY)) * dt * chase * .28;
    }
    o.g.position.set(p.x + o.offX, p.y + o.offY, 6 - depth);
    o.g.rotation.x += dt * o.spin * .72;
    o.g.rotation.z += dt * o.spin * (o.type === 1 ? 2.5 : 1.25);
    const pulse = 1 + Math.sin(t * 5.2 + o.at) * .07;
    o.g.scale.setScalar(pulse);
    const dxo = ship.position.x - o.g.position.x;
    const dyo = ship.position.y - o.g.position.y;
    const d2 = dxo * dxo + dyo * dyo;
    if (!o.hit && depth < 5.3 && depth > 2.35 && d2 < 1.5) {
      o.hit = true;
      doHit();
    } else if (!o.hit && !o.near && depth < 2.35 && depth > .8 && d2 < 4.0 && d2 > 1.55) {
      o.near = true;
      nearMiss();
    }
  }

  for (const s of shards) {
    let depth = s.at - state.distance;
    if (depth < -7) {
      resetShard(s, s.at + 180 + hash(s.at) * 60);
      depth = s.at - state.distance;
    }
    const p = pathAt(s.at);
    s.g.position.set(p.x + s.offX, p.y + s.offY, 6 - depth);
    s.g.rotation.y += dt * 2.5;
    s.g.rotation.z += dt * 1.2;
    s.g.scale.setScalar(.9 + Math.sin(t * 6 + s.at) * .12);
    s.core.material.color.copy(colorA);
    s.halo.material.color.copy(colorB);
    if (!s.taken && depth < 5.0 && depth > 2.6) {
      const sx = ship.position.x - s.g.position.x;
      const sy = ship.position.y - s.g.position.y;
      if (sx * sx + sy * sy < 1.15) {
        s.taken = true;
        s.g.visible = false;
        collectShard();
      }
    }
  }

  for (const g of gates) {
    let depth = g.at - state.distance;
    if (depth < -9) {
      resetGate(g, g.at + 460 + hash(g.at) * 110);
      depth = g.at - state.distance;
    }
    const p = pathAt(g.at);
    g.mesh.position.set(p.x + g.offX, p.y + g.offY, 6 - depth);
    g.mesh.rotation.z = pathBank(g.at) + t * .22;
    const pulse = 1 + Math.sin(t * 5 + g.at) * .08;
    g.mesh.scale.setScalar(pulse);
    g.mesh.material.color.copy(colorC);
    if (!g.taken && depth < 5.1 && depth > 2.4) {
      const gx = ship.position.x - g.mesh.position.x;
      const gy = ship.position.y - g.mesh.position.y;
      if (gx * gx + gy * gy < 1.4) {
        g.taken = true;
        g.mesh.visible = false;
        gateBonus();
      }
    }
  }

  const far = pathAt(state.distance + 120);
  singularity.position.x = far.x;
  singularity.position.y = far.y;
  singularity.rotation.z += dt * (.07 + state.surge * .15);
  singularity.scale.setScalar(.88 + Math.sin(t * .82) * .05 + state.surge * .08);

  starMat.uniforms.uTravel.value = state.distance * (1.85 + state.boostPulse * .8);
  starMat.uniforms.uSpeed.value = state.boostPulse;
  state.hitPulse = Math.max(0, state.hitPulse - dt * 2.5);
  lensPass.uniforms.uHit.value = state.hitPulse;
  lensPass.uniforms.uBoost.value = state.boostPulse;
  lensPass.uniforms.uSurge.value = state.surge;
  lensPass.uniforms.uSpeed.value = state.speed / 40;
  lensPass.uniforms.uTime.value = t;
  renderer.toneMappingExposure = 1.17 + state.boostPulse * .17 + state.surge * .08;
  bloomPass.strength = (state.qualityTier === 0 ? .72 : 1.08) + state.boostPulse * .38 + state.surge * .22;
  bloomPass.radius = .62 + state.boostPulse * .11;
  flash.style.opacity = String(state.hitPulse * .54);
  boostButton.classList.toggle('active', boosting);

  if (audio) {
    audio.engine.frequency.setTargetAtTime(52 + state.speed * 1.72, audio.ctx.currentTime, .035);
    audio.sub.frequency.setTargetAtTime(104 + state.speed * 2.26, audio.ctx.currentTime, .045);
    audio.engineGain.gain.setTargetAtTime(.052 + state.boostPulse * .052 + state.surge * .018, audio.ctx.currentTime, .05);
    updateMusic(boosting);
  }

  if (toastTimer > 0) {
    toastTimer -= dt;
    toast.style.opacity = String(Math.min(1, toastTimer * 3));
  } else toast.style.opacity = '0';

  scoreEl.textContent = Math.floor(state.score).toString().padStart(6, '0');
  shieldBar.style.transform = `scaleX(${state.shield / 100})`;
  energyBar.style.transform = `scaleX(${state.energy / 100})`;
  shieldText.textContent = `${Math.round(state.shield)}%`;
  energyText.textContent = `${Math.round(state.energy)}%`;
}

function updateWorld(dt, t) {
  updateTunnel(t);
  updateDebris(t);
  updateSmoke(t);
  updateShockwaves(dt);
}

let targetPixelRatio = 1;
function applyQuality() {
  const dpr = Math.min(devicePixelRatio || 1, 3);
  const tier = state.qualityTier;
  targetPixelRatio = Math.min(dpr, tier === 2 ? (isMobile ? 1.7 : 2) : tier === 1 ? 1.28 : .95);
  renderer.setPixelRatio(targetPixelRatio);
  composer.setPixelRatio(targetPixelRatio);
  bloomPass.enabled = tier > 0;
  debris.visible = tier > 0;
  smokeGroup.visible = tier > 0 || !lowHardware;
  const qText = `${PALETTES[state.biome].name} · Q${state.qualityTier + 1}`;
  if (qText !== lastQualityText) { qualityLabel.textContent = qText; lastQualityText = qText; }
  resize();
}

function resize() {
  const w = innerWidth;
  const h = innerHeight;
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize, { passive: true });
applyQuality();

let fpsFrames = 0;
let fpsTime = 0;
let qualityCooldown = 0;
function tuneQuality(dt) {
  fpsFrames++;
  fpsTime += dt;
  qualityCooldown = Math.max(0, qualityCooldown - dt);
  if (fpsTime < 2.6) return;
  state.fps = fpsFrames / fpsTime;
  fpsFrames = 0;
  fpsTime = 0;
  if (qualityCooldown <= 0 && state.started) {
    if (state.fps < 38 && state.qualityTier > 0) {
      state.qualityTier--;
      qualityCooldown = 8;
      applyQuality();
      showToast('GPU LOAD ↓', '#b3b8ff');
    } else if (state.fps > 57 && state.qualityTier < 2 && !lowHardware) {
      state.qualityTier++;
      qualityCooldown = 12;
      applyQuality();
      showToast('GPU DETAIL ↑', '#b3b8ff');
    }
  }
}

function setTargetFromPointer(e) {
  const nx = e.clientX / innerWidth * 2 - 1;
  const ny = -(e.clientY / innerHeight * 2 - 1);
  state.targetX = clamp(nx * 4.45, -4.55, 4.55);
  state.targetY = clamp(ny * 3.12, -3.15, 3.15);
}
addEventListener('pointerdown', e => {
  if (e.target === boostButton || e.target === enterButton) return;
  state.pointerActive = true;
  setTargetFromPointer(e);
}, { passive: true });
addEventListener('pointermove', e => { if (state.pointerActive) setTargetFromPointer(e); }, { passive: true });
addEventListener('pointerup', () => state.pointerActive = false, { passive: true });
addEventListener('pointercancel', () => state.pointerActive = false, { passive: true });
boostButton.addEventListener('pointerdown', e => {
  e.preventDefault();
  state.boostHeld = true;
  try { boostButton.setPointerCapture(e.pointerId); } catch {}
}, { passive: false });
boostButton.addEventListener('pointerup', () => state.boostHeld = false);
boostButton.addEventListener('pointercancel', () => state.boostHeld = false);

const keys = new Set();
addEventListener('keydown', e => {
  keys.add(e.code);
  if (e.code === 'Space') state.boostHeld = true;
});
addEventListener('keyup', e => {
  keys.delete(e.code);
  if (e.code === 'Space') state.boostHeld = false;
});
function keyboardSteer(dt) {
  const sx = (keys.has('ArrowRight') || keys.has('KeyD') ? 1 : 0) - (keys.has('ArrowLeft') || keys.has('KeyA') ? 1 : 0);
  const sy = (keys.has('ArrowUp') || keys.has('KeyW') ? 1 : 0) - (keys.has('ArrowDown') || keys.has('KeyS') ? 1 : 0);
  if (sx) state.targetX = clamp(state.targetX + sx * dt * 6, -4.45, 4.45);
  if (sy) state.targetY = clamp(state.targetY + sy * dt * 5, -3.05, 3.05);
}

function startGame() {
  if (state.started) return;
  resetRun();
  state.started = true;
  startScreen.classList.add('hidden');
  initAudio();
  if (audio?.ctx.state === 'suspended') audio.ctx.resume();
  showToast('RIFT LINKED', '#69f7ff');
}
enterButton.addEventListener('click', startGame);
startScreen.addEventListener('pointerup', e => { if (e.target === startScreen) startGame(); });

document.addEventListener('visibilitychange', () => {
  state.paused = document.hidden;
  if (audio) {
    if (document.hidden) audio.ctx.suspend();
    else if (state.started) audio.ctx.resume();
  }
});
canvas.addEventListener('webglcontextlost', e => {
  e.preventDefault();
  state.paused = true;
  showToast('GPU CONTEXT LOST', '#ff4d7c');
});
canvas.addEventListener('webglcontextrestored', () => {
  state.paused = false;
  applyQuality();
  showToast('GPU RESTORED', '#69f7ff');
});

const clock = new THREE.Clock();
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), .05);
  const t = clock.elapsedTime;
  if (state.paused) return;

  if (state.started) {
    keyboardSteer(dt);
    updateGameplay(dt, t);
  } else {
    state.distance += dt * 5.5;
    state.biomeMix = 0;
    currentPalette();
    ship.rotation.z = Math.sin(t * .7) * .08;
    ship.position.y = .15 + Math.sin(t * 1.6) * .09;
    singularity.rotation.z += dt * .05;
    lensPass.uniforms.uTime.value = t;
    updateBiome();
  }

  updateWorld(dt, t);
  tuneQuality(dt);
  composer.render();
}
frame();
