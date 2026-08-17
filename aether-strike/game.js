import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const $ = (s) => document.querySelector(s);
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const lerp = THREE.MathUtils.lerp;
const rand = (a,b) => a + Math.random()*(b-a);
const canvas = $('#game');
const scoreEl = $('#score'), shieldBar = $('#shieldBar'), shieldText = $('#shieldText');
const driveBar = $('#driveBar'), driveText = $('#driveText'), waveEl = $('#wave'), objectiveEl = $('#objective');
const reticle = $('#reticle'), start = $('#start'), gameover = $('#gameover'), finalScore = $('#finalScore');
const fireBtn = $('#fire'), dashBtn = $('#dash'), stickZone = $('#stickZone'), stickKnob = $('#stickKnob');
const flash = $('#flash'), damage = $('#damage'), toast = $('#toast'), qualityEl = $('#quality');

const isCoarse = matchMedia('(pointer: coarse)').matches;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const renderer = new THREE.WebGLRenderer({canvas, antialias:false, powerPreference:'high-performance', alpha:false, depth:true, stencil:false});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.14;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const gl2 = renderer.capabilities.isWebGL2;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050915);
scene.fog = new THREE.FogExp2(0x0a1730, 0.0115);
const camera = new THREE.PerspectiveCamera(63,1,.08,420);
camera.position.set(0,4.5,12.5);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene,camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1,1),0.72,0.58,0.72);
composer.addPass(bloom); composer.addPass(new OutputPass());

const hemi = new THREE.HemisphereLight(0x9edcff,0x111020,1.35); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d8,3.3); sun.position.set(-22,34,18); sun.castShadow = true;
sun.shadow.mapSize.set(1024,1024); sun.shadow.camera.left=-28;sun.shadow.camera.right=28;sun.shadow.camera.top=28;sun.shadow.camera.bottom=-28;sun.shadow.camera.near=.1;sun.shadow.camera.far=100; sun.shadow.bias=-0.00035; scene.add(sun);
const rim = new THREE.PointLight(0x5b6cff,18,45,2); rim.position.set(14,8,-10); scene.add(rim);

const world = new THREE.Group(); scene.add(world);
const fx = new THREE.Group(); scene.add(fx);
const enemies = [], projectiles = [], enemyShots = [], shards = [], debris = [];
const clock = new THREE.Clock();
const state = {running:false, score:0, shield:100, drive:100, wave:1, kills:0, targetKills:7, combo:1, comboT:0, fire:false, dashCD:0, dashT:0, time:0, speed:15, shake:0, quality:1, avgFps:60, sampleT:0, sampleFrames:0, spawnT:0, killed:false};
const input = {x:0,y:0, keyX:0,keyY:0, pointer:null, originX:0,originY:0};

function makeSky(){
  const geo = new THREE.SphereGeometry(210,32,18);
  const mat = new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{uTime:{value:0},uTop:{value:new THREE.Color(0x081228)},uHorizon:{value:new THREE.Color(0x315281)},uGlow:{value:new THREE.Color(0x8fdcff)}},vertexShader:`varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,fragmentShader:`uniform float uTime;uniform vec3 uTop,uHorizon,uGlow;varying vec3 vW;float n(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}void main(){vec3 d=normalize(vW-cameraPosition);float h=clamp(d.y*.55+.47,0.,1.);vec3 c=mix(uHorizon,uTop,smoothstep(.0,.72,h));float sun=pow(max(dot(d,normalize(vec3(-.42,.36,-.5))),0.),24.);float haze=pow(1.-abs(d.y),5.);float stars=step(.997,n(floor((d.xz+uTime*.0004)*900.)))*smoothstep(.45,.9,h);c+=uGlow*sun*.8+vec3(.18,.32,.55)*haze*.28+stars*.45;gl_FragColor=vec4(c,1.);}`});
  const mesh = new THREE.Mesh(geo,mat); mesh.frustumCulled=false; scene.add(mesh); return mesh;
}
const sky = makeSky();

function makeOcean(){
  const geo = new THREE.PlaneGeometry(360,360,72,72); geo.rotateX(-Math.PI/2);
  const mat = new THREE.ShaderMaterial({transparent:false,uniforms:{uTime:{value:0},uC1:{value:new THREE.Color(0x08182d)},uC2:{value:new THREE.Color(0x174769)},uGlow:{value:new THREE.Color(0x65e8ff)}},vertexShader:`uniform float uTime;varying float vH;varying vec3 vW;void main(){vec3 p=position;float w=sin(p.x*.08+uTime*.65)*1.0+sin(p.z*.11-uTime*.52)*.7+sin((p.x+p.z)*.045+uTime*.9)*.55;p.y+=w;vH=w;vec4 wp=modelMatrix*vec4(p,1.);vW=wp.xyz;gl_Position=projectionMatrix*viewMatrix*wp;}`,fragmentShader:`uniform float uTime;uniform vec3 uC1,uC2,uGlow;varying float vH;varying vec3 vW;void main(){vec3 V=normalize(cameraPosition-vW);float fres=pow(1.-abs(V.y),3.);float band=.5+.5*sin(vW.x*.035+vW.z*.047+uTime*.35);vec3 c=mix(uC1,uC2,clamp(vH*.12+.5,0.,1.));c+=uGlow*(fres*.18+band*.025);gl_FragColor=vec4(c,1.);}`});
  const mesh=new THREE.Mesh(geo,mat);mesh.position.y=-12;scene.add(mesh);return mesh;
}
const ocean=makeOcean();

function makeDust(){
  const n=isCoarse?700:1100; const pos=new Float32Array(n*3), size=new Float32Array(n);
  for(let i=0;i<n;i++){pos[i*3]=rand(-65,65);pos[i*3+1]=rand(-7,35);pos[i*3+2]=rand(-150,25);size[i]=rand(.7,2.2)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('aSize',new THREE.BufferAttribute(size,1));
  const m=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{uPixel:{value:1},uTime:{value:0}},vertexShader:`attribute float aSize;uniform float uPixel,uTime;varying float vA;void main(){vec3 p=position;p.z=mod(p.z+uTime*12.+150.,175.)-150.;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=aSize*uPixel*(90./-mv.z);vA=smoothstep(160.,18.,-mv.z);}`,fragmentShader:`varying float vA;void main(){vec2 p=gl_PointCoord-.5;float d=dot(p,p);if(d>.25)discard;float a=smoothstep(.25,0.,d)*vA;gl_FragColor=vec4(.55,.9,1.,a*.55);}`});
  const pts=new THREE.Points(g,m);pts.frustumCulled=false;scene.add(pts);return pts;
}
const dust=makeDust();

const metal = new THREE.MeshStandardMaterial({color:0x17223c,metalness:.86,roughness:.25});
const metalDark = new THREE.MeshStandardMaterial({color:0x07101e,metalness:.78,roughness:.32});
const rockMat = new THREE.MeshStandardMaterial({color:0x24344c,metalness:.1,roughness:.78});
const emissiveCyan = new THREE.MeshStandardMaterial({color:0x7ffaff,emissive:0x32dfff,emissiveIntensity:8,roughness:.18,metalness:.25});
const emissiveHot = new THREE.MeshStandardMaterial({color:0xff86c2,emissive:0xff347e,emissiveIntensity:9,roughness:.22,metalness:.15});

function buildShip(){
  const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(.56,2.0,5,10),metal);body.rotation.x=Math.PI/2;body.scale.set(1,.72,1);body.castShadow=true;g.add(body);
  const nose=new THREE.Mesh(new THREE.ConeGeometry(.42,1.65,12),metalDark);nose.rotation.x=-Math.PI/2;nose.position.z=-1.85;nose.castShadow=true;g.add(nose);
  const wingGeo=new THREE.BufferGeometry();wingGeo.setAttribute('position',new THREE.Float32BufferAttribute([0,.03,.4,-2.15,-.08,.85,-.82,.02,-1.05,0,.03,.4,2.15,-.08,.85,.82,.02,-1.05],3));wingGeo.setIndex([0,1,2,3,4,5]);wingGeo.computeVertexNormals();const wings=new THREE.Mesh(wingGeo,metal);wings.castShadow=true;g.add(wings);
  const core=new THREE.Mesh(new THREE.SphereGeometry(.25,16,10),emissiveCyan);core.position.set(0,.22,.42);g.add(core);
  for(const x of [-.57,.57]){const eng=new THREE.Mesh(new THREE.CylinderGeometry(.19,.28,.8,10),metalDark);eng.rotation.x=Math.PI/2;eng.position.set(x,-.12,.63);g.add(eng);const flame=new THREE.Mesh(new THREE.ConeGeometry(.17,1.7,10,1,true),new THREE.MeshBasicMaterial({color:0x65f7ff,transparent:true,opacity:.72,blending:THREE.AdditiveBlending,depthWrite:false}));flame.rotation.x=Math.PI/2;flame.position.set(x,-.12,1.65);g.add(flame);flame.userData.flame=true}
  const gunMat=emissiveHot;for(const x of [-.72,.72]){const gun=new THREE.Mesh(new THREE.BoxGeometry(.11,.11,.7),gunMat);gun.position.set(x,-.04,-.7);g.add(gun)}
  g.position.set(0,0,3.5);g.rotation.order='YXZ';scene.add(g);return g;
}
const ship=buildShip();

function buildRuins(){
  const count=isCoarse?42:64; const baseGeo=new THREE.IcosahedronGeometry(1,1);const rocks=new THREE.InstancedMesh(baseGeo,rockMat,count*3);rocks.castShadow=true;rocks.receiveShadow=true;let idx=0;const dummy=new THREE.Object3D();
  for(let i=0;i<count;i++){const side=Math.random()<.5?-1:1;const x=side*rand(10,42), z=-i*rand(4.2,7.0)-10, y=rand(-8,10);const s=rand(2,6);for(let k=0;k<3;k++){dummy.position.set(x+rand(-s,s),y+rand(-2,2),z+rand(-2,2));dummy.scale.set(rand(.8,2.3)*s,rand(.5,1.7)*s,rand(.8,2.1)*s);dummy.rotation.set(rand(0,3),rand(0,3),rand(0,3));dummy.updateMatrix();rocks.setMatrixAt(idx++,dummy.matrix)}}
  rocks.count=idx;world.add(rocks);
  const pGeo=new THREE.BoxGeometry(1,1,1);const pylons=new THREE.InstancedMesh(pGeo,metalDark,count);pylons.castShadow=true;idx=0;
  for(let i=0;i<count;i++){const side=i%2?-1:1;dummy.position.set(side*rand(12,30),rand(-2,12),-i*6-rand(5,15));dummy.scale.set(rand(.5,1.3),rand(3,12),rand(.5,1.4));dummy.rotation.y=rand(-.6,.6);dummy.updateMatrix();pylons.setMatrixAt(idx++,dummy.matrix)}world.add(pylons);
}
buildRuins();

function makeEnemy(z=-80, elite=false){
  const g=new THREE.Group();
  const shell=new THREE.Mesh(new THREE.OctahedronGeometry(elite?1.25:.9,1),elite?metal:metalDark);shell.castShadow=true;g.add(shell);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(elite?1.45:1.08,.09,8,28),elite?emissiveHot:emissiveCyan);ring.rotation.x=Math.PI/2;g.add(ring);
  const eye=new THREE.Mesh(new THREE.SphereGeometry(elite?.29:.22,12,8),emissiveHot);eye.position.z=.74;g.add(eye);
  for(let i=0;i<3;i++){const fin=new THREE.Mesh(new THREE.ConeGeometry(.18,1.25,5),metal);fin.rotation.z=(i/3)*Math.PI*2;fin.position.set(Math.cos(i/3*Math.PI*2)*.8,Math.sin(i/3*Math.PI*2)*.8,0);g.add(fin)}
  g.position.set(rand(-9,9),rand(-2.5,7.5),z);g.userData={hp:elite?8:3,elite,phase:rand(0,6),fire:rand(.5,1.8),baseX:g.position.x,baseY:g.position.y,dead:false};world.add(g);enemies.push(g);return g;
}

function spawnWave(){state.targetKills=6+state.wave*2;state.kills=0;objectiveEl.textContent=`0 / ${state.targetKills} SENTINELS`;for(let i=0;i<Math.min(4+state.wave,8);i++)makeEnemy(-55-i*15, state.wave>2 && i===0 && state.wave%3===0);}

const projectileGeo=new THREE.CylinderGeometry(.055,.09,1.7,7);projectileGeo.rotateX(Math.PI/2);
const shotMat=new THREE.MeshBasicMaterial({color:0xff76b8,transparent:true,opacity:.96,blending:THREE.AdditiveBlending,depthWrite:false});
const enemyShotMat=new THREE.MeshBasicMaterial({color:0xffb052,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false});
function shoot(){
  if(!state.running)return; for(const x of [-.72,.72]){const p=new THREE.Mesh(projectileGeo,shotMat);p.position.copy(ship.position);p.position.x+=x;p.position.y-=.04;p.position.z-=1.1;p.userData={life:1.45,vel:new THREE.Vector3(input.x*2,input.y*1.2,-70)};fx.add(p);projectiles.push(p)}
  blip(520,.028,.025,'sawtooth');
}
function enemyShoot(e){const p=new THREE.Mesh(new THREE.SphereGeometry(.16,8,6),enemyShotMat);p.position.copy(e.position);const aim=ship.position.clone().sub(e.position).normalize().multiplyScalar(18+state.wave*1.1);p.userData={life:5,vel:aim};fx.add(p);enemyShots.push(p)}

function explode(pos,hot=false){
  for(let i=0;i<(isCoarse?8:14);i++){const m=new THREE.Mesh(new THREE.TetrahedronGeometry(rand(.05,.18)),hot?emissiveHot:emissiveCyan);m.position.copy(pos);m.userData={life:rand(.35,.8),vel:new THREE.Vector3(rand(-6,6),rand(-5,5),rand(-3,8)),spin:new THREE.Vector3(rand(-8,8),rand(-8,8),rand(-8,8))};fx.add(m);debris.push(m)}
  state.shake=Math.max(state.shake,.38);flash.style.opacity=.65;setTimeout(()=>flash.style.opacity=0,70);blip(hot?90:150,.12,.08,'square');
}
function killEnemy(e){if(e.userData.dead)return;e.userData.dead=true;state.kills++;state.combo=Math.min(6,state.combo+.35);state.comboT=2.2;state.score+=Math.round((e.userData.elite?1200:320)*state.combo);state.drive=clamp(state.drive+(e.userData.elite?28:9),0,100);explode(e.position,true);world.remove(e);const i=enemies.indexOf(e);if(i>=0)enemies.splice(i,1);objectiveEl.textContent=`${state.kills} / ${state.targetKills} SENTINELS`;toastMsg(`COMBO ×${state.combo.toFixed(1)}`);if(state.kills>=state.targetKills){state.wave++;waveEl.textContent=String(state.wave).padStart(2,'0');toastMsg('AIRSPACE CLEARED');setTimeout(spawnWave,850)} }
function hurt(amount){if(state.dashT>0)return;state.shield-=amount;state.shake=.8;damage.style.opacity=.9;setTimeout(()=>damage.style.opacity=0,120);navigator.vibrate?.(28);blip(62,.12,.1,'sawtooth');if(state.shield<=0)endGame()}

function updateEnemies(dt,t){
  if(state.spawnT>0)state.spawnT-=dt;
  for(let i=enemies.length-1;i>=0;i--){const e=enemies[i],u=e.userData;u.phase+=dt; e.position.z+=state.speed*dt*.72;e.position.x=lerp(e.position.x,u.baseX+Math.sin(u.phase*1.2)*2.8,dt*1.8);e.position.y=lerp(e.position.y,u.baseY+Math.cos(u.phase*.9)*1.5,dt*1.8);e.rotation.x+=dt*.6;e.rotation.z+=dt*.85;u.fire-=dt;if(u.fire<0&&e.position.z>-75&&e.position.z<-8){enemyShoot(e);u.fire=rand(1.2,2.5)*Math.max(.5,1-state.wave*.035)}if(e.position.z>12){world.remove(e);enemies.splice(i,1);hurt(11);if(state.spawnT<=0){makeEnemy(-90);state.spawnT=.4}}
  }
  const target=enemies.filter(e=>e.position.z<3&&e.position.z>-70).sort((a,b)=>a.position.distanceToSquared(ship.position)-b.position.distanceToSquared(ship.position))[0];reticle.classList.toggle('lock',!!target&&target.position.distanceTo(ship.position)<40);
}

function updateShots(dt){
  for(let i=projectiles.length-1;i>=0;i--){const p=projectiles[i];p.userData.life-=dt;p.position.addScaledVector(p.userData.vel,dt);let hit=null;for(const e of enemies){if(p.position.distanceToSquared(e.position)<1.8){hit=e;break}}if(hit){hit.userData.hp--;fx.remove(p);projectiles.splice(i,1);if(hit.userData.hp<=0)killEnemy(hit);continue}if(p.userData.life<=0||p.position.z<-130){fx.remove(p);projectiles.splice(i,1)}}
  for(let i=enemyShots.length-1;i>=0;i--){const p=enemyShots[i];p.userData.life-=dt;p.position.addScaledVector(p.userData.vel,dt);p.scale.setScalar(1+Math.sin(state.time*15+i)*.12);if(p.position.distanceToSquared(ship.position)<1.05){fx.remove(p);enemyShots.splice(i,1);hurt(13+state.wave*.6);continue}if(p.userData.life<=0||p.position.z>25){fx.remove(p);enemyShots.splice(i,1)}}
  for(let i=debris.length-1;i>=0;i--){const d=debris[i],u=d.userData;u.life-=dt;d.position.addScaledVector(u.vel,dt);u.vel.y-=5*dt;d.rotation.x+=u.spin.x*dt;d.rotation.y+=u.spin.y*dt;d.rotation.z+=u.spin.z*dt;d.scale.multiplyScalar(.985);if(u.life<=0){fx.remove(d);debris.splice(i,1)}}
}

function updateShip(dt){
  const tx=(input.x+input.keyX)*8.2, ty=(input.y+input.keyY)*4.7+1.2;ship.position.x=lerp(ship.position.x,clamp(tx,-8.8,8.8),1-Math.pow(.0005,dt));ship.position.y=lerp(ship.position.y,clamp(ty,-3.7,7.3),1-Math.pow(.001,dt));ship.rotation.z=lerp(ship.rotation.z,-clamp(input.x+input.keyX,-1,1)*.36,dt*6);ship.rotation.x=lerp(ship.rotation.x,clamp(input.y+input.keyY,-1,1)*.12,dt*5);ship.rotation.y=lerp(ship.rotation.y,-clamp(input.x+input.keyX,-1,1)*.08,dt*5);
  ship.children.forEach(c=>{if(c.userData.flame){const boost=state.dashT>0?1.7:(state.fire?1.12:1);c.scale.y=lerp(c.scale.y,boost,dt*12);c.material.opacity=.55+Math.random()*.32}});
  if(state.dashT>0){state.dashT-=dt;state.speed=lerp(state.speed,30,dt*8)}else state.speed=lerp(state.speed,15+state.wave*.25,dt*2.4);
  if(state.dashCD>0)state.dashCD-=dt;
  state.drive=clamp(state.drive+dt*3.2,0,100);
}

let fireAccumulator=0;
function updateCombat(dt){if(state.fire){fireAccumulator-=dt;if(fireAccumulator<=0){shoot();fireAccumulator=.105}}else fireAccumulator=0;if(state.comboT>0){state.comboT-=dt}else state.combo=lerp(state.combo,1,dt*2.4)}

function updateCamera(dt){const target=new THREE.Vector3(ship.position.x*.25,ship.position.y*.32+4.1,12.7);camera.position.lerp(target,1-Math.pow(.002,dt));const look=new THREE.Vector3(ship.position.x*.14,ship.position.y*.22,-9);camera.lookAt(look);if(state.shake>0&&!reduced){state.shake=Math.max(0,state.shake-dt*2.8);camera.position.x+=rand(-1,1)*state.shake*.16;camera.position.y+=rand(-1,1)*state.shake*.13}}

function updateQuality(dt){state.sampleT+=dt;state.sampleFrames++;if(state.sampleT>2.2){const fps=state.sampleFrames/state.sampleT;state.avgFps=lerp(state.avgFps,fps,.45);state.sampleT=0;state.sampleFrames=0;if(state.avgFps<42&&state.quality>.66)state.quality-=.08;else if(state.avgFps>56&&state.quality<1)state.quality+=.035;state.quality=clamp(state.quality,.62,1);applyQuality();}}
let lastRatio=0;
function applyQuality(){const base=Math.min(devicePixelRatio||1, isCoarse?1.65:2);const ratio=base*state.quality;if(Math.abs(ratio-lastRatio)>.04){renderer.setPixelRatio(ratio);composer.setPixelRatio(ratio);lastRatio=ratio}bloom.enabled=state.quality>.68;bloom.strength=.45+state.quality*.34;renderer.shadowMap.enabled=state.quality>.7;qualityEl.textContent=`${gl2?'WebGL2':'WebGL'} · ${Math.round(state.avgFps)} FPS · ${Math.round(state.quality*100)}%`}

function updateWorld(dt){world.position.z+=state.speed*dt*.04;if(world.position.z>6)world.position.z=0;sky.material.uniforms.uTime.value=state.time;ocean.material.uniforms.uTime.value=state.time;dust.material.uniforms.uTime.value=state.time;dust.material.uniforms.uPixel.value=renderer.getPixelRatio();}

function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.034);state.time+=dt;if(state.running){updateShip(dt);updateCombat(dt);updateEnemies(dt,state.time);updateShots(dt);updateCamera(dt);updateWorld(dt);updateQuality(dt);updateHud()}else{sky.material.uniforms.uTime.value=state.time;ocean.material.uniforms.uTime.value=state.time;dust.material.uniforms.uTime.value=state.time;ship.rotation.y=Math.sin(state.time*.6)*.08;ship.position.y=1.2+Math.sin(state.time*.8)*.18;updateCamera(dt)}composer.render()}

function updateHud(){scoreEl.textContent=String(Math.floor(state.score)).padStart(6,'0');shieldBar.style.transform=`scaleX(${clamp(state.shield/100,0,1)})`;shieldText.textContent=Math.max(0,Math.round(state.shield));driveBar.style.transform=`scaleX(${state.drive/100})`;driveText.textContent=Math.round(state.drive);dashBtn.style.opacity=state.drive>=35&&state.dashCD<=0?'1':'.42'}
function toastMsg(text){toast.textContent=text;toast.animate([{opacity:0,transform:'translate(-50%,-6px) scale(.94)'},{opacity:1,transform:'translate(-50%,0) scale(1)',offset:.15},{opacity:1,offset:.62},{opacity:0,transform:'translate(-50%,10px) scale(1.05)'}],{duration:950,easing:'ease-out'})}

let audioCtx=null;function audio(){if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();return audioCtx}
function blip(freq=200,dur=.05,gain=.04,type='sine'){try{const c=audio(),o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(freq,c.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(35,freq*.65),c.currentTime+dur);g.gain.setValueAtTime(gain,c.currentTime);g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+dur);o.connect(g).connect(c.destination);o.start();o.stop(c.currentTime+dur)}catch{}}

function startGame(){for(const e of [...enemies])world.remove(e);enemies.length=0;for(const p of [...projectiles,...enemyShots,...debris])fx.remove(p);projectiles.length=enemyShots.length=debris.length=0;Object.assign(state,{running:true,score:0,shield:100,drive:100,wave:1,kills:0,targetKills:7,combo:1,comboT:0,fire:false,dashCD:0,dashT:0,time:0,speed:15,shake:0,spawnT:0,killed:false});ship.position.set(0,1.2,3.5);input.x=input.y=0;waveEl.textContent='01';spawnWave();start.classList.add('hidden');gameover.classList.remove('show');audio();toastMsg('INTERCEPTOR ONLINE');navigator.vibrate?.(16)}
function endGame(){if(!state.running)return;state.running=false;state.fire=false;state.killed=true;finalScore.firstChild.nodeValue=String(Math.floor(state.score));gameover.classList.add('show');navigator.vibrate?.([45,40,70]);explode(ship.position,true)}
function pulse(){if(!state.running||state.drive<35||state.dashCD>0)return;state.drive-=35;state.dashT=.48;state.dashCD=.9;state.shield=clamp(state.shield+7,0,100);toastMsg('PHASE PULSE');navigator.vibrate?.(18);blip(90,.18,.08,'sawtooth')}

function setStick(px,py){const rect=stickZone.getBoundingClientRect();const baseX=rect.left+74,baseY=rect.bottom-74;let dx=px-baseX,dy=py-baseY;const max=42,mag=Math.hypot(dx,dy)||1;if(mag>max){dx*=max/mag;dy*=max/mag}input.x=clamp(dx/max,-1,1);input.y=clamp(-dy/max,-1,1);stickKnob.style.transform=`translate(${dx}px,${dy}px)`}
stickZone.addEventListener('pointerdown',e=>{input.pointer=e.pointerId;stickZone.setPointerCapture(e.pointerId);setStick(e.clientX,e.clientY)});stickZone.addEventListener('pointermove',e=>{if(e.pointerId===input.pointer)setStick(e.clientX,e.clientY)});function releaseStick(e){if(e.pointerId!==input.pointer)return;input.pointer=null;input.x=input.y=0;stickKnob.style.transform='translate(0,0)'}stickZone.addEventListener('pointerup',releaseStick);stickZone.addEventListener('pointercancel',releaseStick);
function fireOn(e){e.preventDefault();state.fire=true;fireBtn.classList.add('active');audio()}function fireOff(e){e?.preventDefault();state.fire=false;fireBtn.classList.remove('active')}fireBtn.addEventListener('pointerdown',fireOn);fireBtn.addEventListener('pointerup',fireOff);fireBtn.addEventListener('pointercancel',fireOff);fireBtn.addEventListener('pointerleave',e=>{if(e.buttons===0)fireOff(e)});dashBtn.addEventListener('pointerdown',e=>{e.preventDefault();pulse()});

addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].includes(e.code))e.preventDefault();if(e.code==='KeyA'||e.code==='ArrowLeft')input.keyX=-1;if(e.code==='KeyD'||e.code==='ArrowRight')input.keyX=1;if(e.code==='KeyW'||e.code==='ArrowUp')input.keyY=1;if(e.code==='KeyS'||e.code==='ArrowDown')input.keyY=-1;if(e.code==='Space'){state.fire=true;fireBtn.classList.add('active')}if(e.code==='ShiftLeft'||e.code==='ShiftRight')pulse()});
addEventListener('keyup',e=>{if(['KeyA','KeyD','ArrowLeft','ArrowRight'].includes(e.code))input.keyX=0;if(['KeyW','KeyS','ArrowUp','ArrowDown'].includes(e.code))input.keyY=0;if(e.code==='Space'){state.fire=false;fireBtn.classList.remove('active')}});
$('#enter').addEventListener('click',startGame);$('#restart').addEventListener('click',startGame);

document.addEventListener('visibilitychange',()=>{if(document.hidden){state.fire=false;fireBtn.classList.remove('active')}});
function resize(){const w=innerWidth,h=innerHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);composer.setSize(w,h);applyQuality()}addEventListener('resize',resize,{passive:true});
applyQuality();resize();updateHud();animate();
