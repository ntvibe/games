import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

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

const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance', stencil: false, depth: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.22;
renderer.setClearColor(0x020208, 1);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020208);
scene.fog = new THREE.FogExp2(0x04030d, 0.018);

const camera = new THREE.PerspectiveCamera(72, 1, 0.05, 320);
camera.position.set(0, 1.1, 8.3);

const world = new THREE.Group();
scene.add(world);

scene.add(new THREE.HemisphereLight(0x576cff, 0x12071f, 0.52));
const keyLight = new THREE.DirectionalLight(0x9dfcff, 2.1);
keyLight.position.set(4, 5, 6);
scene.add(keyLight);
const violetLight = new THREE.PointLight(0x825cff, 24, 24, 2);
scene.add(violetLight);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 1.05, 0.65, 0.12);
composer.addPass(bloomPass);

const lensShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uHit: { value: 0 }, uBoost: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime; uniform float uHit; uniform float uBoost; varying vec2 vUv;
    float rnd(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
    void main(){
      vec2 p=vUv-0.5; float r=length(p); float aberr=(0.0011+uBoost*0.0014+uHit*0.0028)*(0.25+r);
      vec2 dir=normalize(p+0.00001);
      float rr=texture2D(tDiffuse,vUv+dir*aberr).r;
      float gg=texture2D(tDiffuse,vUv).g;
      float bb=texture2D(tDiffuse,vUv-dir*aberr).b;
      vec3 col=vec3(rr,gg,bb);
      float vign=smoothstep(0.82,0.28,r); col*=mix(0.56,1.0,vign);
      float scan=0.985+0.015*sin(vUv.y*900.0+uTime*5.0);
      float grain=(rnd(vUv*vec2(1703.0,977.0)+uTime)-0.5)*0.028;
      col=col*scan+grain;
      col+=uHit*vec3(0.42,0.015,0.055)*(1.0-r);
      gl_FragColor=vec4(col,1.0);
    }`
};
const lensPass = new ShaderPass(lensShader);
composer.addPass(lensPass);
composer.addPass(new OutputPass());

const state = {
  started: false, paused: false, distance: 0, speed: 22, score: 0,
  shield: 100, energy: 100, boostHeld: false, hitPulse: 0, boostPulse: 0,
  targetX: 0, targetY: 0, pointerActive: false, qualityTier: lowHardware ? 1 : 2,
  renderScale: 1, fps: 60, gameOver: false
};

const COLORS = { cyan: 0x64f5ff, violet: 0x835dff, pink: 0xff4fa7, red: 0xff285f, dark: 0x090914 };
const matGlowCyan = new THREE.MeshBasicMaterial({ color: COLORS.cyan, toneMapped: false });
const matGlowViolet = new THREE.MeshBasicMaterial({ color: COLORS.violet, toneMapped: false });
const matGlowPink = new THREE.MeshBasicMaterial({ color: COLORS.pink, toneMapped: false });
const matDarkMetal = new THREE.MeshStandardMaterial({ color: 0x090a12, metalness: 0.96, roughness: 0.22, emissive: 0x090019, emissiveIntensity: 1.3 });
const matObstacle = new THREE.MeshStandardMaterial({ color: 0x16040a, metalness: 0.8, roughness: 0.18, emissive: COLORS.red, emissiveIntensity: 2.8 });

function pathAt(w){
  return {
    x: Math.sin(w*0.020)*1.15 + Math.sin(w*0.008+1.8)*1.05,
    y: Math.sin(w*0.016+0.7)*0.65 + Math.cos(w*0.006)*0.5
  };
}
function pathBank(w){
  const a=pathAt(w), b=pathAt(w+2.0);
  return Math.atan2(b.x-a.x, 2.0)*0.7;
}

function createShip(){
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.OctahedronGeometry(0.62, 1), matDarkMetal);
  body.scale.set(0.78,0.45,1.85); body.rotation.x=Math.PI*0.5; g.add(body);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.38,1.55,4), matDarkMetal);
  nose.rotation.x=-Math.PI/2; nose.position.z=-1.25; g.add(nose);
  const wingGeo = new THREE.BufferGeometry();
  wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([
    0,0,0, -2.0,-0.07,0.48, -0.35,0,-0.62,
    0,0,0, 2.0,-0.07,0.48, 0.35,0,-0.62
  ],3));
  wingGeo.computeVertexNormals();
  const wings = new THREE.Mesh(wingGeo, matDarkMetal); g.add(wings);
  const edgeGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-2,-.06,.48),new THREE.Vector3(-.35,-.02,-.62),new THREE.Vector3(0,-.01,-1.75),new THREE.Vector3(.35,-.02,-.62),new THREE.Vector3(2,-.06,.48)
  ]);
  g.add(new THREE.Line(edgeGeo,new THREE.LineBasicMaterial({color:COLORS.cyan,transparent:true,opacity:.92,toneMapped:false})));
  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(.35,18,10), new THREE.MeshStandardMaterial({color:0x03141a,metalness:.35,roughness:.08,emissive:0x0aa7c8,emissiveIntensity:1.1,transparent:true,opacity:.9}));
  cockpit.scale.set(0.75,0.42,1.25); cockpit.position.set(0,.28,-.2); g.add(cockpit);
  for(const x of [-.78,.78]){
    const engine = new THREE.Mesh(new THREE.CylinderGeometry(.15,.24,.72,16,1,true), matDarkMetal);
    engine.rotation.x=Math.PI/2; engine.position.set(x,-.12,.52); g.add(engine);
    const glow = new THREE.Mesh(new THREE.CircleGeometry(.13,16), matGlowCyan); glow.rotation.y=Math.PI; glow.position.set(x,-.12,.9); g.add(glow);
  }
  const aura = new THREE.PointLight(COLORS.cyan,13,8,2); aura.position.set(0,-.1,.8); g.add(aura);
  g.position.set(0,0.05,1.6); g.scale.setScalar(.72);
  return g;
}
const ship = createShip();
world.add(ship);

const ringCount=34, ringSpacing=6.4, tunnelLength=ringCount*ringSpacing;
const ringGeo = new THREE.TorusGeometry(6.3,0.035,6,72);
const rings=[];
for(let i=0;i<ringCount;i++){
  const m = new THREE.Mesh(ringGeo, i%3===0 ? matGlowViolet : matGlowCyan);
  m.material = m.material.clone(); m.material.transparent=true; m.material.opacity=i%3===0?.66:.34;
  world.add(m); rings.push(m);
}
const panelGeo = new THREE.BoxGeometry(.18,1.65,.08);
const panelMat = new THREE.MeshStandardMaterial({color:0x070812,metalness:.9,roughness:.28,emissive:0x27106d,emissiveIntensity:1.25});
const segments=16;
const panels = new THREE.InstancedMesh(panelGeo,panelMat,ringCount*segments);
panels.instanceMatrix.setUsage(THREE.DynamicDrawUsage); world.add(panels);
const dummy = new THREE.Object3D();

const starCount=lowHardware?520:900;
const starPos=new Float32Array(starCount*3), starSeed=new Float32Array(starCount);
for(let i=0;i<starCount;i++){
  const a=Math.random()*Math.PI*2, r=8+Math.random()*28;
  starPos[i*3]=Math.cos(a)*r; starPos[i*3+1]=Math.sin(a)*r*.7; starPos[i*3+2]=-Math.random()*250;
  starSeed[i]=Math.random();
}
const starGeo=new THREE.BufferGeometry(); starGeo.setAttribute('position',new THREE.BufferAttribute(starPos,3)); starGeo.setAttribute('aSeed',new THREE.BufferAttribute(starSeed,1));
const starMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,
  uniforms:{uTravel:{value:0},uSpeed:{value:0}},
  vertexShader:`attribute float aSeed;uniform float uTravel;uniform float uSpeed;varying float vA;void main(){vec3 p=position;p.z=mod(p.z+uTravel+aSeed*40.0+250.0,250.0)-250.0;vec4 mv=modelViewMatrix*vec4(p,1.0);float s=(2.0+aSeed*3.0+uSpeed*2.0)*(180.0/-mv.z);gl_PointSize=clamp(s,1.0,16.0);gl_Position=projectionMatrix*mv;vA=(.25+aSeed*.75)*smoothstep(-250.0,-8.0,p.z);}`,
  fragmentShader:`varying float vA;void main(){vec2 p=gl_PointCoord-.5;float d=length(p);float a=smoothstep(.5,0.0,d)*vA;vec3 c=mix(vec3(.35,.58,1.0),vec3(.42,1.0,.98),gl_PointCoord.y);gl_FragColor=vec4(c,a);}`});
world.add(new THREE.Points(starGeo,starMat));

const singularity = new THREE.Group();
const black = new THREE.Mesh(new THREE.SphereGeometry(2.1,32,20),new THREE.MeshBasicMaterial({color:0x000000})); singularity.add(black);
for(let i=0;i<4;i++){
  const t=new THREE.Mesh(new THREE.TorusGeometry(2.7+i*.42,.035+i*.015,6,96),i%2?matGlowPink:matGlowViolet);
  t.rotation.x=1.05+i*.14; t.rotation.y=i*.32; singularity.add(t);
}
const singularityGlow=new THREE.PointLight(0x774cff,34,35,2); singularity.add(singularityGlow);
singularity.position.set(0,0,-118); world.add(singularity);

function makeObstacle(){
  const g=new THREE.Group();
  const core=new THREE.Mesh(new THREE.IcosahedronGeometry(.72,1),matObstacle); g.add(core);
  const halo=new THREE.Mesh(new THREE.TorusGeometry(1.25,.055,6,32),matGlowPink); halo.rotation.x=Math.PI/2; g.add(halo);
  const spikeGeo=new THREE.ConeGeometry(.16,.9,5);
  for(let i=0;i<5;i++){const s=new THREE.Mesh(spikeGeo,matObstacle); const a=i/5*Math.PI*2;s.position.set(Math.cos(a)*1.0,Math.sin(a)*1.0,0);s.rotation.z=-a;s.rotation.x=Math.PI/2;g.add(s);}
  world.add(g); return {g,at:0,offX:0,offY:0,hit:false,spin:Math.random()*.7+.3};
}
const obstacles=Array.from({length:9},makeObstacle);
function resetObstacle(o,at){o.at=at;o.offX=(Math.random()-.5)*6.5;o.offY=(Math.random()-.5)*4.2;o.hit=false;}
obstacles.forEach((o,i)=>resetObstacle(o,55+i*26+Math.random()*16));

function makeShard(){
  const g=new THREE.Group();
  const core=new THREE.Mesh(new THREE.OctahedronGeometry(.38,0),matGlowCyan);g.add(core);
  const halo=new THREE.Mesh(new THREE.TorusGeometry(.62,.025,5,24),matGlowViolet);halo.rotation.x=Math.PI/2;g.add(halo);
  world.add(g); return {g,at:0,offX:0,offY:0,taken:false};
}
const shards=Array.from({length:14},makeShard);
function resetShard(s,at){s.at=at;s.offX=(Math.random()-.5)*5.5;s.offY=(Math.random()-.5)*3.5;s.taken=false;s.g.visible=true;}
shards.forEach((s,i)=>resetShard(s,32+i*18+Math.random()*12));

let audio=null;
function initAudio(){
  if(audio) return;
  const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return;
  const ctx=new AC(); const master=ctx.createGain(); master.gain.value=.18; master.connect(ctx.destination);
  const osc=ctx.createOscillator(), osc2=ctx.createOscillator(), gain=ctx.createGain();
  osc.type='sawtooth'; osc2.type='sine'; osc.frequency.value=55; osc2.frequency.value=110; gain.gain.value=.075;
  osc.connect(gain);osc2.connect(gain);gain.connect(master);osc.start();osc2.start();
  audio={ctx,master,osc,osc2,gain};
}
function ping(freq=720,duration=.08,type='sine',amount=.12){
  if(!audio) return; const {ctx,master}=audio; const o=ctx.createOscillator(), g=ctx.createGain();
  o.type=type;o.frequency.setValueAtTime(freq,ctx.currentTime);o.frequency.exponentialRampToValueAtTime(freq*1.6,ctx.currentTime+duration);
  g.gain.setValueAtTime(amount,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+duration);
  o.connect(g);g.connect(master);o.start();o.stop(ctx.currentTime+duration+.02);
}

function haptic(ms){ if(navigator.vibrate) navigator.vibrate(ms); }
let toastTimer=0;
function showToast(text,color='#8cfbff'){toast.textContent=text;toast.style.color=color;toast.style.opacity='1';toast.style.transform='translateY(-8px) scale(1.04)';toastTimer=.85;}
function doHit(){
  if(state.hitPulse>.2||state.gameOver)return;state.shield=Math.max(0,state.shield-24);state.hitPulse=1;haptic([20,30,20]);ping(90,.18,'sawtooth',.18);showToast('SHIELD HIT','#ff4d7c');
  if(state.shield<=0){state.gameOver=true;showToast('SYSTEM REBOOT','#ff4d7c');setTimeout(resetRun,1100);}
}
function collectShard(){state.energy=Math.min(100,state.energy+16);state.score+=250;haptic(8);ping(720,.08,'sine',.11);showToast('+ ENERGY','#69f7ff');}
function resetRun(){state.distance=0;state.score=0;state.shield=100;state.energy=100;state.targetX=0;state.targetY=0;state.gameOver=false;obstacles.forEach((o,i)=>resetObstacle(o,55+i*27+Math.random()*12));shards.forEach((s,i)=>resetShard(s,32+i*18+Math.random()*10));}

function updateTunnel(){
  let idx=0;
  const modDist=state.distance%ringSpacing;
  for(let i=0;i<ringCount;i++){
    let depth=(i*ringSpacing-modDist+ringSpacing)%tunnelLength;
    if(depth<2) depth+=tunnelLength;
    const w=state.distance+depth, p=pathAt(w), z=6-depth, bank=pathBank(w);
    const ring=rings[i];ring.position.set(p.x,p.y,z);ring.rotation.z=bank;const pulse=.9+Math.sin(w*.11+performance.now()*.0018)*.08;ring.scale.setScalar(pulse);
    for(let j=0;j<segments;j++){
      const a=j/segments*Math.PI*2+bank; const radius=6.28; const flick=.86+Math.sin(w*.19+j*2.1)*.16;
      dummy.position.set(p.x+Math.cos(a)*radius,p.y+Math.sin(a)*radius,z);
      dummy.rotation.set(0,0,a);dummy.scale.set(1,flick,1);dummy.updateMatrix();panels.setMatrixAt(idx++,dummy.matrix);
    }
  }
  panels.instanceMatrix.needsUpdate=true;
}

function updateGameplay(dt,t){
  const boosting=state.boostHeld&&state.energy>1&&!state.gameOver;
  const targetSpeed=boosting?38:22;
  state.speed=THREE.MathUtils.damp(state.speed,targetSpeed,3.5,dt);
  state.boostPulse=THREE.MathUtils.damp(state.boostPulse,boosting?1:0,5,dt);
  if(boosting) state.energy=Math.max(0,state.energy-dt*17); else state.energy=Math.min(100,state.energy+dt*4.2);
  if(!state.gameOver){state.distance+=state.speed*dt;state.score+=state.speed*dt*4.3;}

  ship.position.x=THREE.MathUtils.damp(ship.position.x,state.targetX,7.5,dt);
  ship.position.y=THREE.MathUtils.damp(ship.position.y,state.targetY,7.5,dt);
  ship.rotation.z=THREE.MathUtils.damp(ship.rotation.z,-(state.targetX-ship.position.x)*.24,7,dt);
  ship.rotation.x=THREE.MathUtils.damp(ship.rotation.x,(state.targetY-ship.position.y)*.08,7,dt);
  ship.position.z=1.6+Math.sin(t*5.2)*.035;
  ship.children.forEach((c)=>{if(c.isPointLight)c.intensity=10+state.boostPulse*24+Math.sin(t*20)*2;});

  const camX=ship.position.x*.22, camY=1.15+ship.position.y*.18;
  camera.position.x=THREE.MathUtils.damp(camera.position.x,camX,4,dt);
  camera.position.y=THREE.MathUtils.damp(camera.position.y,camY,4,dt);
  camera.fov=THREE.MathUtils.damp(camera.fov,boosting?79:72,4,dt);camera.updateProjectionMatrix();
  camera.lookAt(ship.position.x*.35,ship.position.y*.28,-10);
  violetLight.position.set(ship.position.x-3,ship.position.y+2,3);

  for(const o of obstacles){
    let depth=o.at-state.distance;
    if(depth<-8){resetObstacle(o,o.at+210+Math.random()*90);depth=o.at-state.distance;}
    const p=pathAt(o.at);o.g.position.set(p.x+o.offX,p.y+o.offY,6-depth);o.g.rotation.x+=dt*o.spin;o.g.rotation.z+=dt*o.spin*1.4;
    const scale=1+Math.sin(t*4+o.at)*.08;o.g.scale.setScalar(scale);
    if(!o.hit&&depth<5.2&&depth>2.5){const dx=ship.position.x-o.g.position.x,dy=ship.position.y-o.g.position.y;if(dx*dx+dy*dy<1.45){o.hit=true;doHit();}}
  }
  for(const s of shards){
    let depth=s.at-state.distance;
    if(depth<-7){resetShard(s,s.at+190+Math.random()*70);depth=s.at-state.distance;}
    const p=pathAt(s.at);s.g.position.set(p.x+s.offX,p.y+s.offY,6-depth);s.g.rotation.y+=dt*2.2;s.g.rotation.z+=dt*1.1;
    if(!s.taken&&depth<5.0&&depth>2.8){const dx=ship.position.x-s.g.position.x,dy=ship.position.y-s.g.position.y;if(dx*dx+dy*dy<1.15){s.taken=true;s.g.visible=false;collectShard();}}
  }

  const far=pathAt(state.distance+120);singularity.position.x=far.x;singularity.position.y=far.y;singularity.rotation.z+=dt*.08;singularity.scale.setScalar(.88+Math.sin(t*.8)*.05);
  starMat.uniforms.uTravel.value=state.distance*1.9;starMat.uniforms.uSpeed.value=state.boostPulse;
  state.hitPulse=Math.max(0,state.hitPulse-dt*2.6);
  lensPass.uniforms.uHit.value=state.hitPulse;lensPass.uniforms.uBoost.value=state.boostPulse;lensPass.uniforms.uTime.value=t;
  renderer.toneMappingExposure=1.18+state.boostPulse*.16;
  bloomPass.strength=(state.qualityTier===0?.72:1.02)+state.boostPulse*.35;
  flash.style.opacity=String(state.hitPulse*.52);
  boostButton.classList.toggle('active',boosting);
  if(audio){audio.osc.frequency.setTargetAtTime(52+state.speed*1.7,audio.ctx.currentTime,.04);audio.osc2.frequency.setTargetAtTime(105+state.speed*2.3,audio.ctx.currentTime,.04);audio.gain.gain.setTargetAtTime(.06+state.boostPulse*.05,audio.ctx.currentTime,.05);}

  if(toastTimer>0){toastTimer-=dt;toast.style.opacity=String(Math.min(1,toastTimer*3));}else toast.style.opacity='0';
  scoreEl.textContent=Math.floor(state.score).toString().padStart(6,'0');
  shieldBar.style.transform=`scaleX(${state.shield/100})`;energyBar.style.transform=`scaleX(${state.energy/100})`;
  shieldText.textContent=`${Math.round(state.shield)}%`;energyText.textContent=`${Math.round(state.energy)}%`;
}

let targetPixelRatio=1;
function applyQuality(){
  const dpr=Math.min(devicePixelRatio||1,3);
  const tier=state.qualityTier;
  targetPixelRatio=Math.min(dpr,tier===2?(isMobile?1.65:2):tier===1?1.28:1.0);
  renderer.setPixelRatio(targetPixelRatio); composer.setPixelRatio(targetPixelRatio);
  bloomPass.enabled=tier>0;
  qualityLabel.textContent=`Adaptive render · Q${tier+1} · ${targetPixelRatio.toFixed(2)}x`;
  resize();
}
function resize(){
  const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);composer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();
}
addEventListener('resize',resize,{passive:true});
applyQuality();

let fpsFrames=0,fpsTime=0,qualityCooldown=0;
function tuneQuality(dt){
  fpsFrames++;fpsTime+=dt;qualityCooldown=Math.max(0,qualityCooldown-dt);
  if(fpsTime<2.5)return;
  state.fps=fpsFrames/fpsTime;fpsFrames=0;fpsTime=0;
  if(qualityCooldown<=0&&state.started){
    if(state.fps<39&&state.qualityTier>0){state.qualityTier--;qualityCooldown=8;applyQuality();showToast('GPU LOAD ↓','#b3b8ff');}
    else if(state.fps>57&&state.qualityTier<2&&!lowHardware){state.qualityTier++;qualityCooldown=12;applyQuality();showToast('GPU DETAIL ↑','#b3b8ff');}
  }
}

function setTargetFromPointer(e){
  const nx=e.clientX/innerWidth*2-1, ny=-(e.clientY/innerHeight*2-1);
  state.targetX=THREE.MathUtils.clamp(nx*4.4,-4.5,4.5);
  state.targetY=THREE.MathUtils.clamp(ny*3.1,-3.2,3.2);
}
addEventListener('pointerdown',e=>{if(e.target===boostButton||e.target===enterButton)return;state.pointerActive=true;setTargetFromPointer(e);},{passive:true});
addEventListener('pointermove',e=>{if(state.pointerActive)setTargetFromPointer(e);},{passive:true});
addEventListener('pointerup',()=>state.pointerActive=false,{passive:true});
addEventListener('pointercancel',()=>state.pointerActive=false,{passive:true});
boostButton.addEventListener('pointerdown',e=>{e.preventDefault();state.boostHeld=true;try{boostButton.setPointerCapture(e.pointerId);}catch{}},{passive:false});
boostButton.addEventListener('pointerup',()=>state.boostHeld=false);boostButton.addEventListener('pointercancel',()=>state.boostHeld=false);

const keys=new Set();
addEventListener('keydown',e=>{keys.add(e.code);if(e.code==='Space')state.boostHeld=true;});
addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='Space')state.boostHeld=false;});
function keyboardSteer(dt){
  const sx=(keys.has('ArrowRight')||keys.has('KeyD')?1:0)-(keys.has('ArrowLeft')||keys.has('KeyA')?1:0);
  const sy=(keys.has('ArrowUp')||keys.has('KeyW')?1:0)-(keys.has('ArrowDown')||keys.has('KeyS')?1:0);
  if(sx)state.targetX=THREE.MathUtils.clamp(state.targetX+sx*dt*6,-4.4,4.4);if(sy)state.targetY=THREE.MathUtils.clamp(state.targetY+sy*dt*5,-3,3);
}

function startGame(){
  if(state.started)return;resetRun();state.started=true;startScreen.classList.add('hidden');initAudio();if(audio?.ctx.state==='suspended')audio.ctx.resume();showToast('RIFT LINKED','#69f7ff');
}
enterButton.addEventListener('click',startGame);
startScreen.addEventListener('pointerup',e=>{if(e.target===startScreen)startGame();});

document.addEventListener('visibilitychange',()=>{state.paused=document.hidden;if(audio){if(document.hidden)audio.ctx.suspend();else if(state.started)audio.ctx.resume();}});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();state.paused=true;showToast('GPU CONTEXT LOST','#ff4d7c');});
canvas.addEventListener('webglcontextrestored',()=>{state.paused=false;applyQuality();showToast('GPU RESTORED','#69f7ff');});

const clock=new THREE.Clock();
function frame(){
  requestAnimationFrame(frame);
  const dt=Math.min(clock.getDelta(),.05),t=clock.elapsedTime;
  if(state.paused)return;
  if(state.started){keyboardSteer(dt);updateGameplay(dt,t);} else {
    state.distance+=dt*5.0; ship.rotation.z=Math.sin(t*.7)*.08; ship.position.y=.15+Math.sin(t*1.6)*.09; singularity.rotation.z+=dt*.05; lensPass.uniforms.uTime.value=t;
  }
  updateTunnel();tuneQuality(dt);composer.render();
}
frame();
