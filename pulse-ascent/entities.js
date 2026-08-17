import * as THREE from 'three';
import {SETTINGS,rand,lerp,TAU} from './util.js';
const stats={
  drone:{hp:1,score:220,size:.62},
  tank:{hp:4,score:820,size:1.25},
  node:{hp:2,score:520,size:.9},
  prism:{hp:2,score:420,size:.82},
  sentinel:{hp:3,score:680,size:1.0},
  danger:{hp:1,score:0,size:.45}
};
export class Enemy {
  constructor(game,type,pos,phase=0){
    this.game=game;this.type=type;this.dead=false;this.locked=false;this.age=0;this.phase=phase;const st=stats[type]||stats.drone;this.hp=st.hp;this.score=st.score;this.group=new THREE.Group();this.group.position.copy(pos);
    const palette=game.palette,col=type==='danger'?0xff416d:type==='node'?palette[2]:type==='tank'?palette[1]:type==='prism'?0xffd86d:type==='sentinel'?0xb58cff:palette[0];
    let geo;if(type==='tank')geo=new THREE.DodecahedronGeometry(st.size,0);else if(type==='node')geo=new THREE.OctahedronGeometry(st.size,0);else if(type==='prism')geo=new THREE.ConeGeometry(.8,1.55,3,1);else if(type==='sentinel')geo=new THREE.TorusKnotGeometry(.58,.12,44,5,2,3);else if(type==='danger')geo=new THREE.TetrahedronGeometry(st.size,0);else geo=new THREE.IcosahedronGeometry(st.size,0);
    this.mesh=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:col,wireframe:true,transparent:true,opacity:.82,blending:THREE.AdditiveBlending}));this.group.add(this.mesh);
    const haloRadius=type==='tank'?1.7:type==='sentinel'?1.35:type==='danger'?.8:1.05;const halo=new THREE.Mesh(new THREE.TorusGeometry(haloRadius,.025,4,40),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:type==='danger'?.5:.28,blending:THREE.AdditiveBlending}));halo.rotation.x=rand(0,TAU);halo.rotation.y=rand(0,TAU);this.group.add(halo);this.halo=halo;
    const core=new THREE.Mesh(new THREE.SphereGeometry(type==='tank'?.16:.1,8,8),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.92,blending:THREE.AdditiveBlending}));this.group.add(core);this.core=core;
    if(type==='sentinel'){this.blades=[];for(let i=0;i<3;i++){const b=new THREE.Mesh(new THREE.BoxGeometry(.05,1.8,.05),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.42,blending:THREE.AdditiveBlending}));b.rotation.z=i*TAU/3;this.group.add(b);this.blades.push(b);}}
    if(type==='danger'){this.warning=new THREE.Mesh(new THREE.RingGeometry(.62,.69,32),new THREE.MeshBasicMaterial({color:0xff5477,transparent:true,opacity:.65,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthTest:false}));this.warning.rotation.x=Math.PI/2;this.group.add(this.warning);}
    this.game.scene.add(this.group);this.baseX=pos.x;this.baseY=pos.y;this.seed=rand(0,100);this.speed=type==='danger'?25+phase*2.5:SETTINGS.worldSpeed*(.78+rand(-.06,.12));
  }
  hit(dmg=1){if(this.dead)return false;this.hp-=dmg;this.mesh.material.opacity=1;this.mesh.scale.setScalar(1.34);if(this.hp<=0){this.kill();return true;}this.game.particles.burst(this.group.position,14,this.mesh.material.color.getHex(),3.3,6);return false;}
  kill(){if(this.dead)return;this.dead=true;const amount=this.type==='tank'?150:this.type==='sentinel'?110:this.type==='prism'?75:58;this.game.particles.burst(this.group.position,amount,this.mesh.material.color.getHex(),this.type==='tank'?12:8,this.type==='tank'?16:11);if(this.type==='prism')this.game.particles.burst(this.group.position,32,0xffffff,5,8);this.game.audio.destroyNote(undefined,this.type==='tank'||this.type==='sentinel');this.game.onEnemyDestroyed(this);this.dispose();}
  dispose(){this.game.scene.remove(this.group);this.group.traverse(o=>{o.geometry?.dispose?.();o.material?.dispose?.();});}
  update(dt,t){
    this.age+=dt;this.group.position.z+=this.speed*dt;
    if(this.type!=='danger'){
      if(this.type==='prism'){const a=t*1.25+this.seed;this.group.position.x=this.baseX+Math.sin(a)*2.1;this.group.position.y=this.baseY+Math.sin(a*2.1)*1.2;}
      else if(this.type==='sentinel'){const a=t*.72+this.seed;this.group.position.x=this.baseX+Math.cos(a)*1.5;this.group.position.y=this.baseY+Math.sin(a)*1.4;}
      else{const sway=this.type==='tank'?.62:1.15;this.group.position.x=this.baseX+Math.sin(t*.9+this.seed)*sway;this.group.position.y=this.baseY+Math.cos(t*.75+this.seed*.7)*sway*.55;}
    }
    const rot=this.type==='prism'?1.8:this.type==='sentinel'?1.2:.8;this.mesh.rotation.x+=dt*(.5+this.phase*.08)*rot;this.mesh.rotation.y+=dt*.8*rot;this.mesh.scale.lerp(new THREE.Vector3(1,1,1),dt*7);this.halo.rotation.z+=dt*(this.type==='danger'?3.5:this.type==='sentinel'?1.8:.8);this.core.scale.setScalar(1+Math.sin(t*8+this.seed)*.35);
    if(this.blades)this.blades.forEach((b,i)=>b.rotation.z+=dt*(.55+i*.12));
    if(this.warning){const beat=t*SETTINGS.bpm/60,phase=beat%1;this.warning.scale.setScalar(1+phase*1.5);this.warning.material.opacity=.75*(1-phase);this.mesh.scale.setScalar(.85+Math.sin(beat*TAU)*.12);}
    if(this.locked)this.halo.material.opacity=.92;else this.halo.material.opacity=lerp(this.halo.material.opacity,this.type==='danger'?.5:.28,dt*7);
    if(this.group.position.z>8){if(this.type==='danger')this.game.takeHit();this.dead=true;this.dispose();}
  }
}

export class Boss {
  constructor(game){
    this.game=game;this.scene=game.scene;this.group=new THREE.Group();this.group.position.set(0,0,-44);this.scene.add(this.group);this.hp=120;this.maxHp=120;this.phase=1;this.dead=false;this.age=0;this.parts=[];this.rings=[];
    this.core=new THREE.Mesh(new THREE.IcosahedronGeometry(1.72,1),new THREE.MeshBasicMaterial({color:0x62e6ff,wireframe:true,transparent:true,opacity:.28,blending:THREE.AdditiveBlending}));this.group.add(this.core);
    this.innerCore=new THREE.Mesh(new THREE.OctahedronGeometry(.48,0),new THREE.MeshBasicMaterial({color:0xff66d8,wireframe:true,transparent:true,opacity:.68,blending:THREE.AdditiveBlending}));this.group.add(this.innerCore);
    for(let r=0;r<5;r++){const tor=new THREE.Mesh(new THREE.TorusGeometry(3.5+r*.72,.028,4,72),new THREE.MeshBasicMaterial({color:r%2?0xff5fd5:0x6ff7ff,transparent:true,opacity:.14+r*.018,blending:THREE.AdditiveBlending}));tor.rotation.x=rand(0,TAU);tor.rotation.y=rand(0,TAU);this.group.add(tor);this.rings.push(tor);}
    this.spokes=[];for(let i=0;i<8;i++){const pivot=new THREE.Group(),m=new THREE.Mesh(new THREE.OctahedronGeometry(.62,0),new THREE.MeshBasicMaterial({color:i%2?0xff68d7:0x66eeff,wireframe:true,transparent:true,opacity:.92,blending:THREE.AdditiveBlending}));pivot.add(m);const spoke=new THREE.Mesh(new THREE.BoxGeometry(.035,4.4,.035),new THREE.MeshBasicMaterial({color:i%2?0xff68d7:0x66eeff,transparent:true,opacity:.13,blending:THREE.AdditiveBlending}));spoke.position.y=2.2;pivot.add(spoke);pivot.userData.index=i;this.group.add(pivot);this.parts.push({pivot,mesh:m,locked:false,dead:false,hp:15,worldPos:new THREE.Vector3()});this.spokes.push(spoke);}
    game.particles.burst(this.group.position,150,0x6ff5ff,10,11);game.particles.burst(this.group.position,90,0xff5fd7,8,8);game.audio.sectionStab(4);
  }
  getTargets(){return this.parts.filter(p=>!p.dead).map(p=>({bossPart:true,part:p,locked:p.locked,group:{getWorldPosition:v=>p.pivot.getWorldPosition(v)},hit:(d=1)=>this.hitPart(p,d)}));}
  healthRatio(){return Math.max(0,this.hp/this.maxHp)}
  hitPart(p,dmg=1){if(p.dead||this.dead)return false;p.hp-=dmg;this.hp-=dmg;p.mesh.scale.setScalar(1.55);const wp=p.pivot.getWorldPosition(new THREE.Vector3());this.game.particles.burst(wp,20,p.mesh.material.color.getHex(),4.5,8);if(p.hp<=0){p.dead=true;p.pivot.visible=false;this.game.particles.burst(wp,120,p.mesh.material.color.getHex(),10,14);this.game.audio.destroyNote(undefined,true);}const ratio=this.healthRatio(),next=ratio<.34?3:ratio<.68?2:1;if(next!==this.phase){this.phase=next;this.game.onBossPhase(next);}this.game.updateBossHud();if(this.hp<=0){this.kill();return true;}return p.dead;}
  spawnDanger(count,offset=0,radius=6){for(let i=0;i<count;i++){const a=TAU*i/count+offset;this.game.spawnEnemy('danger',new THREE.Vector3(Math.cos(a)*radius,Math.sin(a)*radius*.55,-30-rand(0,4)),this.phase);}}
  beat(step){
    if(this.dead)return;const s=step%16;this.game.audio.bossPulse(this.phase);
    if(s===0){this.game.world.pulse(1.5+this.phase*.15);const pos=this.group.position.clone();pos.z+=3;this.game.particles.burst(pos,46,this.phase===3?0xff4fd8:0x63efff,6,9);}
    if(this.phase===1&&s===8){this.game.audio.dangerWarning();this.spawnDanger(2,this.age*.3,5.2);}
    if(this.phase===2&&(s===4||s===12)){this.game.audio.dangerWarning();this.spawnDanger(3,this.age*.42+(s===12?.55:0),6.4);}
    if(this.phase===3&&s%4===0){this.game.audio.dangerWarning();this.spawnDanger(s===0?5:3,this.age*.62+s*.12,7.4);}
    if(this.phase>=2&&(s===2||s===10)){const p=this.group.position.clone();p.z+=2;this.game.particles.burst(p,70,this.phase===3?0xff5bd7:0x70f4ff,8,10);}
  }
  kill(){if(this.dead)return;this.dead=true;const p=this.group.position.clone();this.game.particles.burst(p,1100,0xffffff,26,26);this.game.particles.burst(p,700,0xff52d4,20,22);this.game.particles.burst(p,700,0x63efff,20,22);this.game.audio.overdrive(this.game.audio.ctx.currentTime+.02);this.group.visible=false;this.game.hideBossHud();setTimeout(()=>this.game.finish(),2200);}
  update(dt,t){
    if(this.dead)return;this.age+=dt;this.group.position.z=lerp(this.group.position.z,-25,dt*.32);this.group.rotation.z+=dt*.065*this.phase;this.core.rotation.x+=dt*.24;this.core.rotation.y+=dt*.4;this.innerCore.rotation.x-=dt*.72*this.phase;this.innerCore.rotation.z+=dt*.95;const beat=t*SETTINGS.bpm/60,pulse=Math.pow(Math.max(0,Math.cos((beat%1)*TAU)),10);this.core.scale.setScalar(1+pulse*.08*this.phase);this.innerCore.scale.setScalar(.9+pulse*.3);
    this.rings.forEach((r,i)=>{r.rotation.z+=dt*(.08+i*.025)*(i%2?-1:1)*this.phase;r.material.opacity=lerp(r.material.opacity,.13+i*.018+pulse*.07+(this.phase-1)*.025,dt*5);r.scale.setScalar(1+pulse*.012*(i+1));});
    const radius=this.phase===1?5.2:this.phase===2?6.7:8.2;this.parts.forEach((p,i)=>{if(p.dead)return;const dir=i%2?-1:1,a=t*(.34+.13*this.phase)*dir+(i/8)*TAU,tilt=Math.sin(t*.55+i)*1.35;p.pivot.position.set(Math.cos(a)*radius,Math.sin(a)*radius*.5+tilt,Math.sin(a*2)*1.9);p.pivot.lookAt(0,0,0);p.mesh.rotation.x+=dt*(1+i*.03);p.mesh.rotation.y+=dt*.75;p.mesh.scale.lerp(new THREE.Vector3(1,1,1),dt*7);p.mesh.material.opacity=p.locked?.98:.86;});
  }
  dispose(){this.scene.remove(this.group);this.group.traverse(o=>{o.geometry?.dispose?.();o.material?.dispose?.();});}
}
