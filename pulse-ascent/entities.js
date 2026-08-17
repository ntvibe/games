import * as THREE from 'three';
import {SETTINGS,rand,lerp,TAU} from './util.js';
export class Enemy {
  constructor(game,type,pos,phase=0){
    this.game=game;this.type=type;this.dead=false;this.locked=false;this.age=0;this.phase=phase;this.hp=type==='tank'?4:type==='node'?2:1;
    this.score=type==='tank'?800:type==='node'?500:220;
    this.group=new THREE.Group();this.group.position.copy(pos);
    const palette=game.palette;
    const col=type==='danger'?0xff416d:type==='node'?palette[2]:type==='tank'?palette[1]:palette[0];
    let geo;
    if(type==='tank')geo=new THREE.DodecahedronGeometry(1.25,0);
    else if(type==='node')geo=new THREE.OctahedronGeometry(.9,0);
    else if(type==='danger')geo=new THREE.TetrahedronGeometry(.45,0);
    else geo=new THREE.IcosahedronGeometry(.62,0);
    this.mesh=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:col,wireframe:true,transparent:true,opacity:.8,blending:THREE.AdditiveBlending}));
    this.group.add(this.mesh);
    const halo=new THREE.Mesh(new THREE.TorusGeometry(type==='tank'?1.6:1,.025,4,32),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.28,blending:THREE.AdditiveBlending}));
    halo.rotation.x=rand(0,TAU);halo.rotation.y=rand(0,TAU);this.group.add(halo);this.halo=halo;
    const core=new THREE.Mesh(new THREE.SphereGeometry(type==='tank'?.16:.1,8,8),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.9,blending:THREE.AdditiveBlending}));
    this.group.add(core);this.core=core;
    this.game.scene.add(this.group);
    this.baseX=pos.x;this.baseY=pos.y;this.seed=rand(0,100);
    this.speed=type==='danger'?26:SETTINGS.worldSpeed*(.82+rand(-.08,.08));
  }
  hit(dmg=1){
    if(this.dead)return false;
    this.hp-=dmg;
    this.mesh.material.opacity=1;this.mesh.scale.setScalar(1.3);
    if(this.hp<=0){this.kill();return true;}
    this.game.particles.burst(this.group.position,12,this.mesh.material.color.getHex(),3,5);
    return false;
  }
  kill(){
    if(this.dead)return;this.dead=true;
    this.game.particles.burst(this.group.position,this.type==='tank'?130:54,this.mesh.material.color.getHex(),this.type==='tank'?12:7,this.type==='tank'?15:10);
    this.game.audio.destroyNote(undefined,this.type==='tank');
    this.game.onEnemyDestroyed(this);
    this.dispose();
  }
  dispose(){this.game.scene.remove(this.group);this.group.traverse(o=>{o.geometry?.dispose?.();o.material?.dispose?.();});}
  update(dt,t){
    this.age+=dt;this.group.position.z+=this.speed*dt;
    if(this.type!=='danger'){
      const sway=this.type==='tank'?.7:1.2;
      this.group.position.x=this.baseX+Math.sin(t*.9+this.seed)*sway;
      this.group.position.y=this.baseY+Math.cos(t*.75+this.seed*.7)*sway*.55;
    }
    this.mesh.rotation.x+=dt*(.5+this.phase*.08);this.mesh.rotation.y+=dt*.8;this.mesh.scale.lerp(new THREE.Vector3(1,1,1),dt*7);
    this.halo.rotation.z+=dt*(this.type==='danger'?3:.8);this.core.scale.setScalar(1+Math.sin(t*8+this.seed)*.35);
    if(this.locked)this.halo.material.opacity=.85;else this.halo.material.opacity=lerp(this.halo.material.opacity,.28,dt*7);
    if(this.group.position.z>8){if(this.type==='danger')this.game.takeHit();this.dead=true;this.dispose();}
  }
}

export class Boss {
  constructor(game){
    this.game=game;this.scene=game.scene;this.group=new THREE.Group();this.group.position.set(0,0,-42);this.scene.add(this.group);
    this.hp=90;this.maxHp=90;this.phase=1;this.dead=false;this.age=0;this.parts=[];
    this.core=new THREE.Mesh(new THREE.IcosahedronGeometry(2.4,2),new THREE.MeshBasicMaterial({color:0xffffff,wireframe:true,transparent:true,opacity:.5,blending:THREE.AdditiveBlending}));this.group.add(this.core);
    for(let r=0;r<4;r++){
      const tor=new THREE.Mesh(new THREE.TorusGeometry(3.4+r*.78,.035,4,64),new THREE.MeshBasicMaterial({color:r%2?0xff5fd5:0x6ff7ff,transparent:true,opacity:.32,blending:THREE.AdditiveBlending}));
      tor.rotation.x=rand(0,TAU);tor.rotation.y=rand(0,TAU);this.group.add(tor);
    }
    for(let i=0;i<8;i++){
      const pivot=new THREE.Group();
      const m=new THREE.Mesh(new THREE.OctahedronGeometry(.55,0),new THREE.MeshBasicMaterial({color:i%2?0xff68d7:0x66eeff,wireframe:true,transparent:true,opacity:.9,blending:THREE.AdditiveBlending}));
      pivot.add(m);pivot.userData.index=i;this.group.add(pivot);this.parts.push({pivot,mesh:m,locked:false,dead:false,hp:12,worldPos:new THREE.Vector3()});
    }
    game.particles.burst(this.group.position,260,0x8bf5ff,16,18);
  }
  getTargets(){return this.parts.filter(p=>!p.dead).map(p=>({bossPart:true,part:p,locked:p.locked,group:{getWorldPosition:v=>p.pivot.getWorldPosition(v)},hit:(d=1)=>this.hitPart(p,d)}));}
  hitPart(p,dmg=1){
    if(p.dead||this.dead)return false;
    p.hp-=dmg;this.hp-=dmg;p.mesh.scale.setScalar(1.5);
    const wp=p.pivot.getWorldPosition(new THREE.Vector3());this.game.particles.burst(wp,18,p.mesh.material.color.getHex(),4,7);
    if(p.hp<=0){p.dead=true;p.pivot.visible=false;this.game.particles.burst(wp,90,p.mesh.material.color.getHex(),9,12);}
    const ratio=this.hp/this.maxHp,next=ratio<.32?3:ratio<.67?2:1;
    if(next!==this.phase){this.phase=next;this.game.onBossPhase(next);}
    if(this.hp<=0){this.kill();return true;}return p.dead;
  }
  beat(step){
    if(this.dead)return;const s=step%16;
    if(s===0){
      this.game.world.pulse(1.4);const pos=this.group.position.clone();pos.z+=3;this.game.particles.burst(pos,36,this.phase===3?0xff4fd8:0x63efff,5,8);
      if(this.phase>=2&&this.game.enemies.length<SETTINGS.maxTargets){const count=this.phase===3?4:2;for(let i=0;i<count;i++){const a=TAU*i/count+Math.random();this.game.spawnEnemy('danger',new THREE.Vector3(Math.cos(a)*6,Math.sin(a)*3,-31),this.phase);}}
    }
  }
  kill(){
    if(this.dead)return;this.dead=true;const p=this.group.position.clone();
    this.game.particles.burst(p,900,0xffffff,24,24);this.game.particles.burst(p,600,0xff52d4,18,20);this.game.particles.burst(p,600,0x63efff,18,20);
    this.game.audio.overdrive(this.game.audio.ctx.currentTime+.02);this.group.visible=false;setTimeout(()=>this.game.finish(),2200);
  }
  update(dt,t){
    if(this.dead)return;this.age+=dt;this.group.position.z=lerp(this.group.position.z,-25,dt*.3);this.group.rotation.z+=dt*.07*this.phase;
    this.core.rotation.x+=dt*.22;this.core.rotation.y+=dt*.37;this.core.scale.setScalar(1+Math.sin(t*SETTINGS.bpm/60*TAU)*.08*this.phase);
    const radius=this.phase===1?5.1:this.phase===2?6.5:8;
    this.parts.forEach((p,i)=>{if(p.dead)return;const a=t*(.36+.12*this.phase)+(i/8)*TAU,tilt=Math.sin(t*.5+i)*1.25;p.pivot.position.set(Math.cos(a)*radius,Math.sin(a)*radius*.48+tilt,Math.sin(a*2)*1.8);p.mesh.rotation.x+=dt*(1+i*.03);p.mesh.rotation.y+=dt*.7;p.mesh.scale.lerp(new THREE.Vector3(1,1,1),dt*7);});
  }
  dispose(){this.scene.remove(this.group);this.group.traverse(o=>{o.geometry?.dispose?.();o.material?.dispose?.();});}
}
