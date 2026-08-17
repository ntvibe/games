import * as THREE from 'three';
import {SETTINGS,rand,lerp,TAU} from './util.js';
export class RailWorld {
  constructor(game){
    this.game=game; this.scene=game.scene;
    this.group=new THREE.Group();this.scene.add(this.group);
    this.lines=new THREE.Group();this.scene.add(this.lines);
    this.rings=[];
    this.starField=this.makeStars();
    this.avatar=this.makeAvatar();
    this.makeTunnel();
  }
  makeStars(){
    const count=4800, pos=new Float32Array(count*3), col=new Float32Array(count*3), c=new THREE.Color();
    for(let i=0;i<count;i++){
      const r=rand(8,54), a=rand(0,TAU);
      pos[i*3]=Math.cos(a)*r;pos[i*3+1]=Math.sin(a)*r;pos[i*3+2]=rand(-180,20);
      c.setHSL(rand(.48,.68),rand(.45,1),rand(.45,.85));
      col[i*3]=c.r;col[i*3+1]=c.g;col[i*3+2]=c.b;
    }
    const geo=new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('color',new THREE.BufferAttribute(col,3));
    const mat=new THREE.PointsMaterial({size:.09,vertexColors:true,transparent:true,opacity:.8,depthWrite:false,blending:THREE.AdditiveBlending});
    const p=new THREE.Points(geo,mat); this.scene.add(p); return p;
  }
  makeAvatar(){
    const g=new THREE.Group();
    const body=new THREE.Mesh(new THREE.IcosahedronGeometry(.52,1),new THREE.MeshBasicMaterial({color:0x9dfbff,wireframe:true,transparent:true,opacity:.55,blending:THREE.AdditiveBlending}));
    body.scale.set(.65,1.45,.5);g.add(body);
    const core=new THREE.Mesh(new THREE.SphereGeometry(.13,8,8),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.9,blending:THREE.AdditiveBlending}));core.position.z=.1;g.add(core);
    for(let i=0;i<3;i++){
      const ring=new THREE.Mesh(new THREE.TorusGeometry(.62+i*.11,.012,4,48),new THREE.MeshBasicMaterial({color:i===1?0xff5fd7:0x74efff,transparent:true,opacity:.33,blending:THREE.AdditiveBlending}));
      ring.rotation.x=rand(-.8,.8);ring.rotation.y=rand(-.8,.8);g.add(ring);
    }
    g.position.set(0,-2.7,3.8);this.scene.add(g);return g;
  }
  makeTunnel(){
    for(let i=0;i<15;i++){
      const geo=new THREE.TorusGeometry(rand(7,12),.018,3,64);
      const mat=new THREE.MeshBasicMaterial({color:i%3===0?0x7d63ff:0x24cfe3,transparent:true,opacity:rand(.05,.18),blending:THREE.AdditiveBlending});
      const ring=new THREE.Mesh(geo,mat);ring.position.z=-i*14-12;ring.scale.y=rand(.65,1.15);ring.rotation.z=rand(0,TAU);this.lines.add(ring);this.rings.push(ring);
    }
    const pts=[];
    for(let z=-190;z<10;z+=8){
      for(let k=0;k<6;k++){
        const x=(k-2.5)*5.2;pts.push(x,-5.5,z,x,-5.5,z+7);
      }
    }
    const geo=new THREE.BufferGeometry().setFromPoints(pts.map((v,i)=> i%3===0?new THREE.Vector3(v,pts[i+1],pts[i+2]):null).filter(Boolean));
    const arr=[];
    for(let z=-190;z<10;z+=8){for(let k=0;k<6;k++){const x=(k-2.5)*5.2;arr.push(x,-5.5,z,x,-5.5,z+7);}}
    geo.setAttribute('position',new THREE.Float32BufferAttribute(arr,3));
    const mat=new THREE.LineBasicMaterial({color:0x226b8b,transparent:true,opacity:.16,blending:THREE.AdditiveBlending});
    const grid=new THREE.LineSegments(geo,mat);this.lines.add(grid);this.grid=grid;
  }
  pulse(strength=1){this.rings.forEach((r,i)=>{ if(i%4===0) r.material.opacity=.15+.18*strength; });}
  update(dt,t,energy){
    this.starField.rotation.z=t*.006;
    const p=this.starField.geometry.attributes.position.array;
    for(let i=2;i<p.length;i+=3){p[i]+=SETTINGS.worldSpeed*dt*(.45+energy*.35);if(p[i]>18)p[i]-=200;}
    this.starField.geometry.attributes.position.needsUpdate=true;
    for(const r of this.rings){r.position.z+=SETTINGS.worldSpeed*dt;if(r.position.z>12)r.position.z-=210;r.rotation.z+=dt*.05;r.material.opacity=lerp(r.material.opacity,.055+energy*.08,dt*2);}
    this.grid.position.z=(this.grid.position.z+SETTINGS.worldSpeed*dt)%8;
    this.avatar.rotation.y=Math.sin(t*.9)*.12;this.avatar.rotation.z=Math.sin(t*.7)*.05;
    this.avatar.children.forEach((c,i)=>{if(c.geometry?.type==='TorusGeometry'){c.rotation.z+=dt*(.25+i*.1);c.rotation.x+=dt*.08;}});
  }
}
