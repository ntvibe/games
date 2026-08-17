import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Boss} from './entities.js';
import {installCyberAudio} from './cyber-audio.js';
import {clamp,lerp,rand,TAU} from './util.js';

const FREE_START_BAR=20;
const FREE_END_BAR=32;   // 12 bars = 22.5 seconds at 128 BPM
const NEW_BOSS_BAR=40;
const MODEL_ROOT='./assets/models/cc0/';
const MODEL_FILES={
  machine:'factory-machine.glb',
  pipe:'factory-pipe.glb',
  conveyor:'factory-conveyor.glb',
  tank:'factory-tank.glb',
  rifle:'blaster-rifle.glb',
  crate:'blaster-crate.glb'
};

const waitForGame=()=>new Promise(resolve=>{
  const tick=()=>window.__pulseAscent?resolve(window.__pulseAscent):requestAnimationFrame(tick);
  tick();
});

class AssetLibrary{
  constructor(game){this.game=game;this.loader=new GLTFLoader();this.models=new Map();this.errors=[];this.ready=false;}
  async load(){
    const jobs=Object.entries(MODEL_FILES).map(async([key,file])=>{
      try{const gltf=await this.loader.loadAsync(MODEL_ROOT+file);this.models.set(key,gltf.scene);}
      catch(err){this.errors.push(`${key}: ${err?.message||err}`);}
    });
    await Promise.all(jobs);this.ready=true;return this;
  }
  clone(key,{tint=0x67efff,size=2,wire=true}={}){
    const src=this.models.get(key);if(!src)return null;
    const obj=src.clone(true),tintColor=new THREE.Color(tint);
    obj.traverse(node=>{
      if(!node.isMesh)return;
      const original=node.material?.color?.clone?.()||new THREE.Color(0x87909a);
      const body=original.multiplyScalar(.34).lerp(new THREE.Color(0x05070b),.42);
      node.material=new THREE.MeshStandardMaterial({color:body,emissive:tintColor,emissiveIntensity:.34,metalness:.82,roughness:.3,transparent:false});
      node.castShadow=false;node.receiveShadow=false;
      if(wire&&node.geometry){
        const edges=new THREE.LineSegments(new THREE.EdgesGeometry(node.geometry,24),new THREE.LineBasicMaterial({color:tint,transparent:true,opacity:.34,blending:THREE.AdditiveBlending,depthWrite:false}));
        node.add(edges);
      }
    });
    obj.updateMatrixWorld(true);
    const box=new THREE.Box3().setFromObject(obj),dim=box.getSize(new THREE.Vector3()),max=Math.max(dim.x,dim.y,dim.z,1e-3);
    obj.scale.multiplyScalar(size/max);box.setFromObject(obj);const center=box.getCenter(new THREE.Vector3());obj.position.sub(center);
    return obj;
  }
}

class RuptureTarget{
  constructor(system,index,wave){
    this.system=system;this.game=system.game;this.type='rupture';this.dead=false;this.locked=false;this.hp=wave>3?3:2;this.score=420+wave*55;this.seed=rand(0,100);this.index=index;this.wave=wave;this.group=new THREE.Group();
    const assetKeys=['machine','crate','tank','conveyor'],key=assetKeys[(index+wave)%assetKeys.length],tint=(index+wave)%2?0xff55d7:0x57efff;
    const shell=system.assets.clone(key,{tint,size:1.35+rand(-.15,.35),wire:true});
    if(shell){shell.rotation.set(rand(-.6,.6),rand(0,TAU),rand(-.5,.5));this.group.add(shell)}
    else{
      const fallback=new THREE.Mesh(new THREE.OctahedronGeometry(.72,0),new THREE.MeshBasicMaterial({color:tint,wireframe:true,transparent:true,opacity:.72,blending:THREE.AdditiveBlending}));this.group.add(fallback);
    }
    this.core=new THREE.Mesh(new THREE.IcosahedronGeometry(.18,0),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.86,blending:THREE.AdditiveBlending}));this.group.add(this.core);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.92,.018,4,36),new THREE.MeshBasicMaterial({color:tint,transparent:true,opacity:.42,blending:THREE.AdditiveBlending}));ring.rotation.x=Math.PI/2;this.group.add(ring);this.ring=ring;
    this.game.scene.add(this.group);this.update(0,this.game.time||0);
  }
  update(dt,t){
    if(this.dead)return;const lane=(this.index%7)-3,phase=t*(.42+.035*this.wave)+this.seed;
    const depth=-17-(this.index%5)*5-Math.sin(phase*.7)*4;
    this.group.position.x=Math.sin(phase+lane*.4)*(6.5+this.wave*.28)+lane*.65;
    this.group.position.y=Math.cos(phase*.83+lane)*(3.5+Math.abs(lane)*.18)+Math.sin(phase*1.7)*.7;
    this.group.position.z=depth;
    this.group.rotation.x+=dt*(.18+.03*this.wave);this.group.rotation.y+=dt*(.32+.04*this.index);this.ring.rotation.z+=dt*1.8;
    this.core.scale.setScalar(1+Math.sin(t*7+this.seed)*.3);this.group.scale.setScalar(1+Math.sin(t*2.2+this.seed)*.04);
  }
  hit(power=1){
    if(this.dead)return false;this.hp-=power;this.core.scale.multiplyScalar(1.35);this.system.game.particles.burst(this.group.position,18,0xff67dc,3.8,9);
    if(this.hp>0){this.system.game.audio.metalHit?.(this.system.game.audio.ctx?.currentTime,.05,rand(-.7,.7));return false;}
    this.dead=true;this.system.game.audio.ruptureKill?.();this.system.game.particles.burst(this.group.position,64,this.index%2?0xff55d7:0x56efff,8,15);this.system.game.onEnemyDestroyed(this);this.dispose();return true;
  }
  dispose(){if(this.group.parent)this.game.scene.remove(this.group);}
}

class RuptureSystem{
  constructor(game,assets,state){
    this.game=game;this.assets=assets;this.state=state;this.group=new THREE.Group();game.scene.add(this.group);this.decor=[];this.rings=[];this.lastT=performance.now()/1000;this.weaponGroup=new THREE.Group();game.world.avatar.add(this.weaponGroup);
    this.makeProceduralField();
  }
  makeProceduralField(){
    for(let i=0;i<9;i++){
      const ring=new THREE.Mesh(new THREE.TorusGeometry(5.5+i*1.75,.022,3,72),new THREE.MeshBasicMaterial({color:i%2?0xff43cf:0x42eaff,transparent:true,opacity:.08,blending:THREE.AdditiveBlending,depthWrite:false}));
      ring.rotation.set(rand(-1.2,1.2),rand(-1.2,1.2),rand(0,TAU));ring.position.z=-14-i*4.2;this.group.add(ring);this.rings.push(ring);
    }
    const count=900,pos=new Float32Array(count*3),col=new Float32Array(count*3),c=new THREE.Color();
    for(let i=0;i<count;i++){const r=rand(6,31),a=rand(0,TAU),b=rand(-1,1);pos[i*3]=Math.cos(a)*r;pos[i*3+1]=Math.sin(a)*r*b;pos[i*3+2]=rand(-82,4);c.setHSL(i%2?.52:.88,.9,.62);col[i*3]=c.r;col[i*3+1]=c.g;col[i*3+2]=c.b;}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('color',new THREE.BufferAttribute(col,3));
    this.dataCloud=new THREE.Points(geo,new THREE.PointsMaterial({size:.075,vertexColors:true,transparent:true,opacity:.62,blending:THREE.AdditiveBlending,depthWrite:false}));this.group.add(this.dataCloud);
    this.group.visible=false;
  }
  buildImportedScene(){
    for(const d of this.decor){if(d.obj.parent)this.group.remove(d.obj)}this.decor.length=0;this.weaponGroup.clear();
    const keys=['machine','pipe','conveyor','tank','crate'];
    for(let i=0;i<18;i++){
      const key=keys[i%keys.length],obj=this.assets.clone(key,{tint:i%3===0?0xff4fd6:0x48eaff,size:rand(1.8,4.2),wire:i<12});if(!obj)continue;
      this.group.add(obj);this.decor.push({obj,railX:(i%2?1:-1)*rand(8,15),railY:rand(-5,5),railZ:-12-i*7.2,angle:(i/18)*TAU+rand(-.2,.2),radius:rand(9,23),freeY:rand(-8,8),spin:rand(-.35,.35)});
    }
    for(const side of [-1,1]){
      const gun=this.assets.clone('rifle',{tint:side<0?0x52ecff:0xff56d5,size:1.05,wire:true});if(!gun)continue;
      gun.position.set(side*.58,-.02,-.18);gun.rotation.set(0,side<0?-.25:.25,side<0?.12:-.12);this.weaponGroup.add(gun);
    }
  }
  start(forced=false){
    if(this.state.active)return;this.state.active=true;this.state.forced=forced;this.state.mode='rupture';this.state.startedAt=this.game.time;this.state.wave=0;
    for(const e of this.game.enemies)e.dispose?.();this.game.enemies=[];this.game.clearLocks?.();
    this.game.world.lines.visible=false;this.group.visible=true;this.game.world.starField.material.size=.14;this.game.scene.fog.density=.008;
    this.game.audio.energy=1;this.game.audio.section=3;this.game.audio.ruptureDrop?.();this.game.showCallout('RAIL BREAK // FREE VECTOR',1);this.game.haptic?.([18,20,35,22,60]);
    this.game.particles.burst(new THREE.Vector3(0,0,-18),420,0x56efff,22,20);this.game.particles.burst(new THREE.Vector3(0,0,-22),280,0xff52d7,18,18);this.spawnWave();
    this.updateChip();
  }
  end(){
    if(!this.state.active)return;this.state.active=false;this.state.forced=false;this.state.mode='rail';
    this.game.enemies=this.game.enemies.filter(e=>{if(e.type==='rupture'){e.dispose?.();return false}return true});
    this.group.visible=false;this.game.world.lines.visible=true;this.game.world.starField.material.size=.095;this.game.scene.fog.density=.018;
    this.game.audio.ruptureDrop?.();this.game.setSection(3,'ASCENSION // REENTRY');this.game.showCallout('RAIL RECAPTURED',1);this.game.particles.burst(new THREE.Vector3(0,0,-18),360,0xffffff,18,19);this.updateChip();
  }
  spawnWave(){
    this.state.wave++;const count=6+Math.min(6,this.state.wave);
    for(let i=0;i<count;i++){const e=new RuptureTarget(this,i,this.state.wave);this.game.enemies.push(e);this.game.spawned++;}
    this.game.showCallout(this.state.wave%3===0?'VOLUME SWARM':'FREE VECTOR LOCK',.8);
  }
  beat(step,time){
    const s=step%16;if(s%4===0){this.game.world.pulse(s===0?1.35:.62);for(const r of this.rings)r.material.opacity=Math.min(.26,r.material.opacity+.08);}
    if([3,7,11,15].includes(s)){
      const a=(step*.71)%TAU,p=new THREE.Vector3(Math.cos(a)*10,Math.sin(a)*5,-24-rand(0,14));this.game.particles.burst(p,20,s%2?0xff4fd6:0x50ecff,5,11);
    }
    if(s===0&&this.state.wave<7&&((Math.floor(step/16)-FREE_START_BAR)%2===0||this.state.forced))this.spawnWave();
  }
  updateChip(){
    const chip=document.querySelector('#modeChip');if(!chip)return;chip.textContent=this.state.active?'FREE VECTOR // 3D FLIGHT':'RAIL VECTOR';chip.classList.toggle('active',this.state.active);
  }
  update(dt,t){
    const active=this.state.active,spread=active?1:0;this.group.visible=active||(this.game.section>=2&&this.assets.models.size>0);
    this.dataCloud.rotation.z+=dt*(active?.08:.012);this.dataCloud.rotation.y=Math.sin(t*.13)*.08;
    this.rings.forEach((r,i)=>{r.rotation.z+=dt*(.04+i*.015)*(active?4:1);r.rotation.x+=dt*.013;r.material.opacity=lerp(r.material.opacity,active?.11:.025,dt*2.5);});
    for(let i=0;i<this.decor.length;i++){
      const d=this.decor[i],z=((d.railZ+(t*(active?7:4)))+104)%104-94,fx=Math.cos(d.angle+t*.08)*d.radius,fy=d.freeY+Math.sin(t*.3+d.angle)*2,fz=-18-(i%7)*7+Math.sin(t*.21+d.angle)*4;
      d.obj.position.x=lerp(d.railX,fx,spread);d.obj.position.y=lerp(d.railY,fy,spread);d.obj.position.z=lerp(z,fz,spread);d.obj.rotation.y+=dt*(d.spin+(active?.32:.08));d.obj.rotation.x+=dt*(active?.09:.02);
      d.obj.visible=active||z<-6;
    }
    if(active){
      const px=this.game.pointer.x,py=this.game.pointer.y;
      this.game.world.avatar.position.x=lerp(this.game.world.avatar.position.x,px*3.7,dt*7);this.game.world.avatar.position.y=lerp(this.game.world.avatar.position.y,-1.5+py*2.55,dt*7);
      this.game.camera.position.x=lerp(this.game.camera.position.x,px*3.2,dt*8);this.game.camera.position.y=lerp(this.game.camera.position.y,py*2.05,dt*8);this.game.camera.position.z=7.2+Math.sin(t*.45)*.42;this.game.camera.rotation.z=lerp(this.game.camera.rotation.z,-px*.13,dt*7);this.game.camera.rotation.x=lerp(this.game.camera.rotation.x,py*.055,dt*7);
      this.game.camera.fov=lerp(this.game.camera.fov,72-this.game.sync/100*2,dt*2.8);this.game.camera.updateProjectionMatrix();
    }else{
      this.game.world.avatar.position.x=lerp(this.game.world.avatar.position.x,0,dt*3);this.game.world.avatar.position.y=lerp(this.game.world.avatar.position.y,-2.7,dt*3);
    }
  }
}

function installUi(){
  if(document.querySelector('#modeChip'))return;
  const chip=document.createElement('div');chip.id='modeChip';chip.textContent='RAIL VECTOR';document.querySelector('#hud')?.appendChild(chip);
  const style=document.createElement('style');style.textContent=`#modeChip{position:absolute;left:50%;top:78px;transform:translateX(-50%);padding:4px 8px;border:1px solid #59dceb33;background:#02071088;font:800 7px/1 system-ui;letter-spacing:.18em;color:#5d8d9a;pointer-events:none;transition:.25s}#modeChip.active{color:#fff;border-color:#ff56d988;box-shadow:0 0 18px #ff56d944,inset 0 0 12px #50ecff22;text-shadow:0 0 10px #57efff}@media(max-width:600px){#modeChip{top:66px;font-size:6px}}`;
  document.head.appendChild(style);
}

async function init(){
  const game=await waitForGame();installUi();
  const state={active:false,forced:false,mode:'rail',wave:0,startedAt:0};
  installCyberAudio(game.audio,()=>state.mode);
  const assets=new AssetLibrary(game),system=new RuptureSystem(game,assets,state);
  const ambient=new THREE.HemisphereLight(0x77eaff,0x120018,.72);game.scene.add(ambient);
  const pulseLight=new THREE.PointLight(0xff4fd4,1.25,34,2);pulseLight.position.set(0,1,-8);game.scene.add(pulseLight);
  assets.load().then(()=>system.buildImportedScene());

  const originalOnStep=game.onStep.bind(game);
  game.onStep=(step,time)=>{
    const bar=Math.floor(step/16),s=step%16;
    if(state.forced){game.bar=bar;document.querySelector('#beatLamp')?.classList.toggle('on',s%4===0);system.beat(step,time);return;}
    if(bar<FREE_START_BAR){originalOnStep(step,time);return;}
    game.bar=bar;
    const lamp=document.querySelector('#beatLamp');if(lamp){lamp.classList.toggle('on',s%4===0);if(s%4===0)setTimeout(()=>lamp.classList.remove('on'),70)}
    if(bar===FREE_START_BAR&&s===0)system.start(false);
    if(bar>=FREE_START_BAR&&bar<FREE_END_BAR){system.beat(step,time);return;}
    if(bar===FREE_END_BAR&&s===0&&state.active)system.end();
    if(bar>=FREE_END_BAR&&bar<NEW_BOSS_BAR){
      if(s%4===0)game.world.pulse(s===0?1.1:.45);
      if(s===0&&bar%2===0)game.spawnPattern(bar);
      if([6,14].includes(s)&&game.enemies.length){const src=game.enemies.find(e=>!e.dead&&e.group?.position?.z<-18);if(src){game.audio.dangerWarning(time);game.spawnEnemy('danger',src.group.position.clone(),game.section)}}
      return;
    }
    if(bar===NEW_BOSS_BAR&&s===0&&!game.boss){game.setSection(4,'THE CONVERGENCE // ENGINE');game.boss=new Boss(game);game.showBossHud();game.audio.ruptureDrop?.();}
    if(game.boss)game.boss.beat(step);
  };

  const originalLoop=game.loop.bind(game);
  game.loop=()=>{
    const now=performance.now()/1000,dt=clamp(now-system.lastT,.001,.1);system.lastT=now;originalLoop();system.update(dt,game.time||now);pulseLight.intensity=state.active?1.4+Math.sin((game.time||0)*8)*.45:.38+game.audio.energy*.35;
  };

  const originalRestart=game.restart.bind(game);
  game.restart=()=>{system.end();originalRestart();state.mode='rail';state.wave=0;system.updateChip();};

  window.__pulseExpansion={
    state,assets,system,
    startTestRupture:()=>system.start(true),
    stopTestRupture:()=>system.end(),
    stats:()=>({mode:state.mode,active:state.active,wave:state.wave,assetsLoaded:assets.models.size,assetErrors:[...assets.errors],decor:system.decor.length,weapons:system.weaponGroup.children.length})
  };
}

init();
