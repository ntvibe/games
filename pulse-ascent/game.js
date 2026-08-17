import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {SETTINGS,clamp,lerp,rand,TAU} from './util.js';
import {AudioCore} from './audio.js';
import {ParticlePool} from './particles.js';
import {RailWorld} from './world.js';
import {Enemy,Boss} from './entities.js';
const $=s=>document.querySelector(s);
const dom={root:$('#game'),hud:$('#hud'),start:$('#start'),result:$('#result'),startBtn:$('#startBtn'),restartBtn:$('#restartBtn'),aim:$('#aim'),score:$('#score'),chain:$('#chain'),locks:$('#locks'),evo:$('#evo'),lifeSegments:$('#lifeSegments'),overdrivePct:$('#overdrivePct'),overdriveFill:$('#overdriveFill'),overdriveBtn:$('#overdriveBtn'),bpm:$('#bpm'),beatLamp:$('#beatLamp'),sectionLabel:$('#sectionLabel'),sectionName:$('#sectionName'),finalScore:$('#finalScore'),shotDown:$('#shotDown'),analysis:$('#analysis'),maxChain:$('#maxChain')};
class Game {
  constructor(){
    this.running=false;this.time=0;this.last=performance.now();this.score=0;this.combo=0;this.mult=1;this.maxCombo=0;
    this.shots=0;this.hits=0;this.kills=0;this.spawned=0;this.evolution=3;this.overdrive=0;this.section=0;
    this.targetsLocked=[];this.enemies=[];this.projectiles=[];this.boss=null;this.pendingFire=[];this.bar=0;
    this.pointer={x:0,y:0,down:false};
    this.palette=[0x6ef3ff,0x8b6fff,0xff63d7];
    this.audio=new AudioCore();
    this.initRenderer();this.particles=new ParticlePool(this.scene);this.world=new RailWorld(this);
    this.makeLockLines();this.bind();this.updateHud();
  }
  initRenderer(){
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0x010207);this.scene.fog=new THREE.FogExp2(0x02030a,.018);
    this.camera=new THREE.PerspectiveCamera(66,innerWidth/innerHeight,.1,250);this.camera.position.set(0,0,8);this.camera.lookAt(0,0,-30);
    this.renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:'high-performance',alpha:false});
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.12;
    this.pixelRatio=Math.min(devicePixelRatio,innerWidth<700?1.45:1.75);this.renderer.setPixelRatio(this.pixelRatio);this.renderer.setSize(innerWidth,innerHeight);
    this.renderer.domElement.style.touchAction='none';dom.root.appendChild(this.renderer.domElement);
    this.composer=new EffectComposer(this.renderer);this.composer.addPass(new RenderPass(this.scene,this.camera));
    this.bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),1.2,.72,.18);this.composer.addPass(this.bloom);
    this.resize();
  }
  makeLockLines(){
    const pos=new Float32Array(SETTINGS.maxLocks*2*3);
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setDrawRange(0,0);
    this.lockLinePositions=pos;this.lockGeo=geo;
    this.lockLines=new THREE.LineSegments(geo,new THREE.LineBasicMaterial({color:0xff79db,transparent:true,opacity:.72,blending:THREE.AdditiveBlending,depthTest:false}));
    this.lockLines.renderOrder=5;this.scene.add(this.lockLines);
  }
  bind(){
    dom.startBtn.addEventListener('click',()=>this.start());
    dom.restartBtn.addEventListener('click',()=>this.restart());
    dom.overdriveBtn.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();this.triggerOverdrive();});
    addEventListener('resize',()=>this.resize(),{passive:true});
    addEventListener('contextmenu',e=>e.preventDefault());
    const canvas=this.renderer.domElement;
    canvas.addEventListener('pointerdown',e=>this.pointerDown(e));
    canvas.addEventListener('pointermove',e=>this.pointerMove(e));
    canvas.addEventListener('pointerup',e=>this.pointerUp(e));
    canvas.addEventListener('pointercancel',e=>this.pointerUp(e));
    addEventListener('keydown',e=>{if(e.code==='Space'&&!e.repeat){e.preventDefault();this.pointer.down=true;dom.aim.classList.add('locking');}});
    addEventListener('keyup',e=>{if(e.code==='Space'){e.preventDefault();this.releaseFire();this.pointer.down=false;dom.aim.classList.remove('locking');}});
  }
  async start(){
    dom.startBtn.disabled=true;dom.startBtn.querySelector('span').textContent='SYNCHRONIZING…';
    await this.audio.init();
    this.audio.energy=.12;
    this.audio.onStep((s,t)=>this.onStep(s,t));
    dom.start.classList.add('hidden');dom.hud.classList.remove('hidden');dom.aim.classList.remove('hidden');
    this.running=true;this.last=performance.now();this.renderer.setAnimationLoop(()=>this.loop());
    this.spawnOpening();
  }
  restart(){
    for(const e of this.enemies)e.dispose();this.enemies=[];
    if(this.boss)this.boss.dispose();this.boss=null;
    this.score=0;this.combo=0;this.mult=1;this.maxCombo=0;this.shots=0;this.hits=0;this.kills=0;this.spawned=0;
    this.evolution=3;this.overdrive=0;this.section=0;this.targetsLocked=[];this.bar=0;this.time=0;
    this.audio.step=0;this.audio.section=0;this.audio.energy=.12;this.audio.nextStepTime=this.audio.ctx.currentTime+.08;this.audio.anchor=this.audio.nextStepTime;
    dom.result.classList.add('hidden');dom.hud.classList.remove('hidden');dom.aim.classList.remove('hidden');
    this.running=true;this.spawnOpening();this.updateHud();
  }
  resize(){
    const w=innerWidth,h=innerHeight;this.camera.aspect=w/h;this.camera.updateProjectionMatrix();
    this.renderer.setSize(w,h,false);this.composer.setSize(w,h);
    const mobile=w<750||h<520;this.pixelRatio=Math.min(devicePixelRatio,mobile?1.35:1.7);
    this.renderer.setPixelRatio(this.pixelRatio);this.composer.setPixelRatio?.(this.pixelRatio);
    this.particles?.mat?.uniforms.uPixel && (this.particles.mat.uniforms.uPixel.value=this.pixelRatio);
  }
  pointerDown(e){if(!this.running)return;this.renderer.domElement.setPointerCapture?.(e.pointerId);this.pointer.down=true;this.pointerMove(e);dom.aim.classList.add('locking');this.tryLock(true);}
  pointerMove(e){const x=e.clientX,y=e.clientY;this.pointer.x=(x/innerWidth)*2-1;this.pointer.y=-(y/innerHeight)*2+1;dom.aim.style.left=`${x}px`;dom.aim.style.top=`${y}px`;}
  pointerUp(e){if(!this.pointer.down)return;this.pointerMove(e);this.releaseFire();this.pointer.down=false;dom.aim.classList.remove('locking');}
  getTargetList(){const a=this.enemies.filter(e=>!e.dead);if(this.boss&&!this.boss.dead)a.push(...this.boss.getTargets());return a;}
  targetPosition(target,out=new THREE.Vector3()){if(target.bossPart)return target.part.pivot.getWorldPosition(out);return target.group.getWorldPosition(out);}
  tryLock(force=false){
    if(!this.pointer.down||this.targetsLocked.length>=SETTINGS.maxLocks)return;
    const temp=new THREE.Vector3(),candidates=[];
    for(const t of this.getTargetList()){
      if(t.dead||t.locked||t.part?.locked)continue;
      this.targetPosition(t,temp);temp.project(this.camera);if(temp.z<-1||temp.z>1)continue;
      const dx=(temp.x-this.pointer.x)*(innerWidth/innerHeight),dy=temp.y-this.pointer.y,d=Math.hypot(dx,dy);
      if(d<(.14+(force?.035:0)))candidates.push([d,t]);
    }
    candidates.sort((a,b)=>a[0]-b[0]);
    for(const [,t] of candidates){
      if(this.targetsLocked.length>=SETTINGS.maxLocks)break;
      if(t.bossPart)t.part.locked=true;else t.locked=true;
      this.targetsLocked.push(t);this.audio.lockNote(this.targetsLocked.length-1);this.haptic(7);
      this.particles.burst(this.targetPosition(t,new THREE.Vector3()),8,0xff72da,2,4);
    }this.updateHud();
  }
  clearLocks(){for(const t of this.targetsLocked){if(t.bossPart)t.part.locked=false;else t.locked=false;}this.targetsLocked.length=0;this.lockGeo.setDrawRange(0,0);this.updateHud();}
  releaseFire(){
    if(!this.running)return;
    if(!this.targetsLocked.length){const nearest=this.findNearestAim();if(nearest){if(nearest.bossPart)nearest.part.locked=true;else nearest.locked=true;this.targetsLocked.push(nearest);}}
    if(!this.targetsLocked.length)return;
    const targets=[...this.targetsLocked];this.clearLocks();const start=this.audio.quantizedTime(1),spacing=this.audio.stepDur/2;
    targets.forEach((target,i)=>{const when=start+i*spacing;this.audio.shotNote(i,when,1);const delay=Math.max(0,(when-this.audio.ctx.currentTime)*1000);setTimeout(()=>this.fireAt(target,i,targets.length),delay);});
    this.shots+=targets.length;
  }
  findNearestAim(){let best=null,bd=.18;const p=new THREE.Vector3();for(const t of this.getTargetList()){this.targetPosition(t,p);p.project(this.camera);const d=Math.hypot((p.x-this.pointer.x)*(innerWidth/innerHeight),p.y-this.pointer.y);if(d<bd){bd=d;best=t;}}return best;}
  fireAt(target,index,total){
    if(!this.running||target.dead||target.part?.dead)return;
    const end=this.targetPosition(target,new THREE.Vector3()),start=this.world.avatar.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,.4,-.4));
    this.makeShotBeam(start,end,index,total);const killed=target.hit?.(1) ?? target.hit?.();
    this.hits++;this.combo++;this.maxCombo=Math.max(this.maxCombo,this.combo);this.mult=1+Math.min(7,this.combo/12);
    this.score+=Math.round((140+index*25)*this.mult);this.overdrive=clamp(this.overdrive+(killed?5:1.25),0,100);this.audio.energy=clamp(.12+(this.combo/55)+this.section*.12,0,1);this.updateHud();
  }
  makeShotBeam(start,end,index,total){
    const geo=new THREE.BufferGeometry().setFromPoints([start,end]),hue=.48+(index/Math.max(1,total))*.36,color=new THREE.Color().setHSL(hue%1,.95,.7);
    const mat=new THREE.LineBasicMaterial({color,transparent:true,opacity:1,blending:THREE.AdditiveBlending,depthTest:false}),line=new THREE.Line(geo,mat);this.scene.add(line);this.particles.trail(start,color.getHex(),12);
    const duration=170,begun=performance.now(),tick=()=>{const k=(performance.now()-begun)/duration;mat.opacity=1-k;line.scale.setScalar(1+k*.03);if(k>=1){this.scene.remove(line);geo.dispose();mat.dispose();return;}requestAnimationFrame(tick);};tick();
    this.particles.burst(end,8,color.getHex(),2.6,6);this.cameraKick=.09+index*.008;this.haptic(10);
  }
  triggerOverdrive(){
    if(!this.running||this.overdrive<100)return;this.overdrive=0;this.updateHud();const when=this.audio.quantizedTime(.25),delay=Math.max(0,(when-this.audio.ctx.currentTime)*1000);
    setTimeout(()=>{this.audio.overdrive(this.audio.ctx.currentTime+.01);this.haptic([25,20,25,20,50]);const all=this.getTargetList().slice(0,20);for(const t of all){for(let i=0;i<(t.bossPart?2:1);i++)t.hit?.(1);}this.particles.burst(new THREE.Vector3(0,0,-12),600,0xffffff,24,20);this.flash=1.5;},delay);
  }
  haptic(pattern){if(navigator.vibrate)navigator.vibrate(pattern);}
  onEnemyDestroyed(enemy){this.kills++;this.score+=Math.round(enemy.score*this.mult);if(enemy.type==='node'){this.evolution=clamp(this.evolution+1,1,6);this.overdrive=clamp(this.overdrive+15,0,100);}else if(this.kills%7===0){this.evolution=clamp(this.evolution+1,1,6);}this.updateHud();}
  takeHit(){if(!this.running)return;this.evolution--;this.combo=0;this.mult=1;this.audio.energy=Math.max(.12,this.audio.energy*.55);this.audio.hurt();this.haptic([40,25,80]);this.flash=-.75;this.cameraKick=.3;if(this.evolution<=0){this.evolution=1;this.score=Math.max(0,this.score-1500);}this.updateHud();}
  spawnEnemy(type,pos,phase=0){if(this.enemies.length>=SETTINGS.maxTargets)return;const e=new Enemy(this,type,pos,phase);this.enemies.push(e);if(type!=='danger')this.spawned++;}
  spawnOpening(){for(let i=0;i<6;i++){const a=(i/6)*TAU;this.spawnEnemy('drone',new THREE.Vector3(Math.cos(a)*6,Math.sin(a)*3,-52-i*2));}}
  spawnPattern(bar){
    if(this.boss)return;const section=this.section,z=-72,pat=(bar+section*2)%5;
    if(pat===0){const n=6+section;for(let i=0;i<n;i++){const a=i/n*TAU;this.spawnEnemy('drone',new THREE.Vector3(Math.cos(a)*(5+section),Math.sin(a)*(2.6+section*.3),z-i*.7),section);}}
    else if(pat===1){const n=5+section;for(let i=0;i<n;i++){this.spawnEnemy(i===Math.floor(n/2)?'node':'drone',new THREE.Vector3((i-(n-1)/2)*2.15,Math.sin(i*1.7)*1.5,z-i*2),section);}}
    else if(pat===2){const n=7+section;for(let i=0;i<n;i++){const a=i*.9+bar;this.spawnEnemy(i%5===0?'tank':'drone',new THREE.Vector3(Math.sin(a)*7,Math.cos(a*.7)*3,z-i*2.1),section);}}
    else if(pat===3){for(let i=0;i<4+section;i++){this.spawnEnemy('drone',new THREE.Vector3((i%2?1:-1)*(3+i*.8),rand(-3,3),z-i*3),section);}if(section>=2)this.spawnEnemy('tank',new THREE.Vector3(0,0,z-12),section);}
    else{for(let i=0;i<8;i++){const a=i/8*TAU;this.spawnEnemy('drone',new THREE.Vector3(Math.cos(a)*8,Math.sin(a)*4,z-Math.sin(a)*5),section);}}
  }
  onStep(step,time){
    if(!this.running)return;const s=step%16;this.bar=Math.floor(step/16);dom.beatLamp.classList.toggle('on',s%4===0);if(s%4===0)setTimeout(()=>dom.beatLamp.classList.remove('on'),65);
    if(s===0){
      this.world.pulse(1);this.flash=Math.max(this.flash||0,.16);
      if(this.bar===8)this.setSection(1,'SIGNAL BLOOM');if(this.bar===16)this.setSection(2,'VECTOR TEMPLE');if(this.bar===24)this.setSection(3,'ASCENSION');
      if(this.bar===SETTINGS.bossBar&&!this.boss){this.setSection(4,'THE CONVERGENCE');this.boss=new Boss(this);}else if(this.bar<SETTINGS.bossBar&&this.bar%2===0)this.spawnPattern(this.bar);
    }
    if(this.boss)this.boss.beat(step);
    if(s===12&&this.section>=1&&!this.boss&&this.enemies.length){const source=this.enemies.find(e=>!e.dead&&e.type!=='danger'&&e.group.position.z<-18);if(source){const p=source.group.position.clone();this.spawnEnemy('danger',p,this.section);}}
  }
  setSection(i,name){
    this.section=i;this.audio.section=i;this.audio.rootMidi=43+[0,0,2,5,7][i];this.palette=[[0x6ef3ff,0x8b6fff,0xff63d7],[0x6cf7c5,0x3da6ff,0xb471ff],[0xffcf62,0xff6e8b,0x66d9ff],[0x8affff,0xff65dc,0xffffff],[0xffffff,0xff5fd7,0x62efff]][i];
    dom.sectionLabel.textContent=i===4?'BOSS SIGNAL':`SECTOR ${String(i+1).padStart(2,'0')}`;dom.sectionName.textContent=name;this.scene.fog.color.set(i===2?0x10050b:i===3?0x040418:0x02030a);this.particles.burst(new THREE.Vector3(0,0,-18),220,this.palette[0],14,16);
  }
  onBossPhase(p){this.audio.section=3+p;this.audio.energy=1;this.flash=1.2;this.haptic([35,30,35]);dom.sectionName.textContent=['','THE CONVERGENCE','PHASE SHIFT','FINAL RESONANCE'][p];this.particles.burst(this.boss.group.position,320,p===3?0xff52d4:0x6bf4ff,16,18);}
  updateLockLines(){
    const start=this.world.avatar.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,.5,-.4));let n=0;const temp=new THREE.Vector3();
    for(const t of this.targetsLocked){if(t.dead||t.part?.dead)continue;const end=this.targetPosition(t,temp),j=n*6;this.lockLinePositions[j]=start.x;this.lockLinePositions[j+1]=start.y;this.lockLinePositions[j+2]=start.z;this.lockLinePositions[j+3]=end.x;this.lockLinePositions[j+4]=end.y;this.lockLinePositions[j+5]=end.z;n++;}
    this.lockGeo.attributes.position.needsUpdate=true;this.lockGeo.setDrawRange(0,n*2);
  }
  updateHud(){dom.score.textContent=String(Math.floor(this.score)).padStart(6,'0');dom.chain.textContent=`x${this.mult.toFixed(1)}`;dom.locks.textContent=String(this.targetsLocked.length);dom.evo.textContent=String(this.evolution).padStart(2,'0');dom.overdrivePct.textContent=`${Math.floor(this.overdrive)}%`;dom.overdriveFill.style.width=`${this.overdrive}%`;dom.overdriveBtn.classList.toggle('ready',this.overdrive>=100);dom.lifeSegments.innerHTML='';for(let i=0;i<6;i++){const el=document.createElement('i');if(i<this.evolution)el.className='on';dom.lifeSegments.appendChild(el);}}
  finish(){if(!this.running)return;this.running=false;this.clearLocks();dom.hud.classList.add('hidden');dom.aim.classList.add('hidden');const shotPct=this.spawned?Math.round(this.kills/this.spawned*100):0,accuracy=this.shots?Math.round(this.hits/this.shots*100):0;dom.finalScore.textContent=Math.floor(this.score).toLocaleString();dom.shotDown.textContent=`${clamp(shotPct,0,100)}%`;dom.analysis.textContent=`${clamp(accuracy,0,100)}%`;dom.maxChain.textContent=String(this.maxCombo);dom.result.classList.remove('hidden');this.audio.energy=.18;}
  adaptiveQuality(dt){this.fpsEMA=this.fpsEMA?lerp(this.fpsEMA,1/dt,.04):60;if(this.time>4&&Math.floor(this.time)%5===0&&!this.qualityTick){this.qualityTick=true;if(this.fpsEMA<42&&this.pixelRatio>.9){this.pixelRatio=Math.max(.9,this.pixelRatio-.12);this.renderer.setPixelRatio(this.pixelRatio);this.composer.setPixelRatio?.(this.pixelRatio);}}if(Math.floor(this.time)%5!==0)this.qualityTick=false;}
  loop(){
    const now=performance.now(),dt=Math.min(.04,(now-this.last)/1000);this.last=now;this.time+=dt;if(!this.running){this.world.update(dt,this.time,.12);this.particles.update(dt);this.composer.render();return;}
    this.adaptiveQuality(dt);if(this.pointer.down)this.tryLock(false);this.enemies=this.enemies.filter(e=>{if(!e.dead)e.update(dt,this.time);return !e.dead;});if(this.boss)this.boss.update(dt,this.time);this.world.update(dt,this.time,this.audio.energy);this.particles.update(dt);this.updateLockLines();
    const beatPhase=(this.audio.ctx?this.audio.ctx.currentTime:0)/this.audio.beatDur,pulse=Math.pow(Math.max(0,Math.cos((beatPhase%1)*TAU)),12);this.bloom.strength=1.05+this.audio.energy*.65+pulse*.2;this.renderer.toneMappingExposure=1.04+this.audio.energy*.25+pulse*.07+(this.flash||0)*.4;this.flash=lerp(this.flash||0,0,dt*5);
    const targetCamX=this.pointer.x*.36,targetCamY=this.pointer.y*.22;this.camera.position.x=lerp(this.camera.position.x,targetCamX,dt*3.5);this.camera.position.y=lerp(this.camera.position.y,targetCamY,dt*3.5);if(this.cameraKick){this.camera.position.x+=rand(-this.cameraKick,this.cameraKick);this.camera.position.y+=rand(-this.cameraKick,this.cameraKick);this.cameraKick*=Math.pow(.02,dt);}this.camera.rotation.z=lerp(this.camera.rotation.z,-this.pointer.x*.018,dt*3);this.composer.render();
  }
}
const game=new Game();window.__pulseAscent=game;
