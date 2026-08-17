import * as THREE from 'three';
import {SETTINGS,rand,lerp,TAU} from './util.js';
export class RailWorld {
  constructor(game){
    this.game=game;this.scene=game.scene;this.group=new THREE.Group();this.scene.add(this.group);this.lines=new THREE.Group();this.scene.add(this.lines);this.rings=[];this.ribbonData=[];this.pulseEnergy=0;this.section=0;
    this.starField=this.makeStars();this.avatar=this.makeAvatar();this.makeTunnel();this.makeRibbons();this.setEvolution(3);
  }
  makeStars(){
    const count=5200,pos=new Float32Array(count*3),col=new Float32Array(count*3),c=new THREE.Color();
    for(let i=0;i<count;i++){const r=rand(8,58),a=rand(0,TAU);pos[i*3]=Math.cos(a)*r;pos[i*3+1]=Math.sin(a)*r;pos[i*3+2]=rand(-200,20);c.setHSL(rand(.48,.72),rand(.45,1),rand(.42,.88));col[i*3]=c.r;col[i*3+1]=c.g;col[i*3+2]=c.b;}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('color',new THREE.BufferAttribute(col,3));
    const mat=new THREE.PointsMaterial({size:.095,vertexColors:true,transparent:true,opacity:.82,depthWrite:false,blending:THREE.AdditiveBlending});const p=new THREE.Points(geo,mat);this.scene.add(p);return p;
  }
  makeAvatar(){
    const g=new THREE.Group();
    const body=new THREE.Mesh(new THREE.IcosahedronGeometry(.52,1),new THREE.MeshBasicMaterial({color:0x9dfbff,wireframe:true,transparent:true,opacity:.56,blending:THREE.AdditiveBlending}));body.scale.set(.65,1.45,.5);g.add(body);this.avatarBody=body;
    const core=new THREE.Mesh(new THREE.SphereGeometry(.13,8,8),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.95,blending:THREE.AdditiveBlending}));core.position.z=.1;g.add(core);this.avatarCore=core;
    this.avatarRings=[];for(let i=0;i<5;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(.58+i*.13,.012,4,56),new THREE.MeshBasicMaterial({color:i%2?0xff5fd7:0x74efff,transparent:true,opacity:.16+i*.04,blending:THREE.AdditiveBlending}));ring.rotation.x=rand(-1,1);ring.rotation.y=rand(-1,1);g.add(ring);this.avatarRings.push(ring);}
    this.avatarPetals=[];for(let i=0;i<6;i++){const petal=new THREE.Mesh(new THREE.OctahedronGeometry(.09,0),new THREE.MeshBasicMaterial({color:i%2?0xff6bdc:0x7cf8ff,wireframe:true,transparent:true,opacity:.75,blending:THREE.AdditiveBlending}));g.add(petal);this.avatarPetals.push(petal);}
    g.position.set(0,-2.7,3.8);this.scene.add(g);return g;
  }
  makeTunnel(){
    for(let i=0;i<18;i++){const geo=new THREE.TorusGeometry(rand(7,12.5),.018,3,72),mat=new THREE.MeshBasicMaterial({color:i%3===0?0x7d63ff:0x24cfe3,transparent:true,opacity:rand(.05,.17),blending:THREE.AdditiveBlending}),ring=new THREE.Mesh(geo,mat);ring.position.z=-i*12.5-12;ring.scale.y=rand(.62,1.2);ring.rotation.z=rand(0,TAU);this.lines.add(ring);this.rings.push(ring);}
    const arr=[];for(let z=-210;z<10;z+=8){for(let k=0;k<7;k++){const x=(k-3)*4.6;arr.push(x,-5.5,z,x,-5.5,z+7);}}
    for(let z=-210;z<10;z+=16){arr.push(-16,-5.5,z,16,-5.5,z);}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(arr,3));const mat=new THREE.LineBasicMaterial({color:0x226b8b,transparent:true,opacity:.16,blending:THREE.AdditiveBlending});this.grid=new THREE.LineSegments(geo,mat);this.lines.add(this.grid);
  }
  makeRibbons(){
    for(let r=0;r<3;r++){const count=128,arr=new Float32Array(count*3),geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(arr,3));const mat=new THREE.LineBasicMaterial({color:[0x55efff,0xff5fd5,0x8c79ff][r],transparent:true,opacity:.12,blending:THREE.AdditiveBlending,depthWrite:false});const line=new THREE.Line(geo,mat);line.frustumCulled=false;this.lines.add(line);this.ribbonData.push({line,arr,seed:r*2.1});}
  }
  pulse(strength=1){this.pulseEnergy=Math.max(this.pulseEnergy,strength);this.rings.forEach((r,i)=>{if(i%3===0)r.material.opacity=.14+.17*strength;});}
  setEvolution(level){
    if(!this.avatar)return;const l=Math.max(1,Math.min(6,level));this.avatarBody.scale.set(.62+.035*l,1.2+.09*l,.46+.025*l);this.avatarRings.forEach((r,i)=>r.visible=i<Math.max(1,l-1));this.avatarPetals.forEach((p,i)=>p.visible=l>=4||i<l);
  }
  setSection(i){this.section=i;const cols=[0x226b8b,0x1f8e88,0xa15a5d,0x5356a8,0x8d4a92];this.grid.material.color.set(cols[Math.min(i,cols.length-1)]);this.ribbonData.forEach((r,n)=>r.line.material.opacity=.1+i*.025+n*.015);}
  updateRibbons(t,energy,sync){
    this.ribbonData.forEach((r,ri)=>{const a=r.arr,amp=.8+energy*2.4+sync*1.4;for(let i=0;i<a.length/3;i++){const z=6-i*1.25,x=Math.sin(i*.22+t*(1.05+ri*.13)+r.seed)*(4.3+ri*1.8)+Math.sin(i*.055+t*.4)*2.2,y=-.8+Math.cos(i*.17+t*.8+r.seed)*amp+ri*.45;a[i*3]=x;a[i*3+1]=y;a[i*3+2]=z;}r.line.geometry.attributes.position.needsUpdate=true;r.line.material.opacity=lerp(r.line.material.opacity,.07+energy*.08+sync*.11,.08);});
  }
  update(dt,t,energy,sync=0){
    const speed=SETTINGS.worldSpeed*(1+this.section*.055+sync*.12);this.pulseEnergy=lerp(this.pulseEnergy,0,dt*4.5);this.starField.rotation.z=t*(.006+.002*this.section);
    const p=this.starField.geometry.attributes.position.array;for(let i=2;i<p.length;i+=3){p[i]+=speed*dt*(.46+energy*.38);if(p[i]>18)p[i]-=220;}this.starField.geometry.attributes.position.needsUpdate=true;
    for(const r of this.rings){r.position.z+=speed*dt;if(r.position.z>12)r.position.z-=225;r.rotation.z+=dt*(.045+.012*this.section);const pulseScale=1+this.pulseEnergy*.04;r.scale.x=lerp(r.scale.x,pulseScale,dt*8);r.material.opacity=lerp(r.material.opacity,.052+energy*.07+sync*.05,dt*2.5);}
    this.grid.position.z=(this.grid.position.z+speed*dt)%8;this.updateRibbons(t,energy,sync);
    this.avatar.rotation.y=Math.sin(t*.9)*.12+this.game.pointer.x*.08;this.avatar.rotation.z=Math.sin(t*.7)*.05-this.game.pointer.x*.035;const avatarPulse=1+this.pulseEnergy*.035+sync*.025;this.avatar.scale.setScalar(lerp(this.avatar.scale.x,avatarPulse,dt*8));this.avatarCore.scale.setScalar(1+Math.sin(t*8)*.18+sync*.42);
    this.avatarRings.forEach((c,i)=>{c.rotation.z+=dt*(.25+i*.1+sync*.3);c.rotation.x+=dt*(.08+i*.018);c.material.opacity=lerp(c.material.opacity,.12+i*.045+sync*.12,dt*4);});
    this.avatarPetals.forEach((p,i)=>{const a=t*(1.2+sync*.7)+(i/6)*TAU,r=.78+sync*.2;p.position.set(Math.cos(a)*r,Math.sin(a)*r*.55,Math.sin(a*2)*.22);p.rotation.x+=dt*1.3;p.rotation.y+=dt*.9;});
  }
}
