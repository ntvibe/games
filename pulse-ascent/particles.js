import * as THREE from 'three';
import {rand,TAU} from './util.js';
export class ParticlePool {
  constructor(scene, count=6500){
    this.count=count;
    this.positions=new Float32Array(count*3);
    this.colors=new Float32Array(count*3);
    this.sizes=new Float32Array(count);
    this.life=new Float32Array(count);
    this.maxLife=new Float32Array(count);
    this.vel=new Float32Array(count*3);
    for(let i=0;i<count;i++) this.positions[i*3+2]=9999;
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.BufferAttribute(this.positions,3));
    geo.setAttribute('color',new THREE.BufferAttribute(this.colors,3));
    geo.setAttribute('aSize',new THREE.BufferAttribute(this.sizes,1));
    this.mat=new THREE.ShaderMaterial({
      transparent:true, depthWrite:false, vertexColors:true, blending:THREE.AdditiveBlending,
      uniforms:{uPixel:{value:Math.min(devicePixelRatio,2)}},
      vertexShader:`uniform float uPixel; attribute float aSize; varying vec3 vColor; void main(){vColor=color; vec4 mv=modelViewMatrix*vec4(position,1.); float depth=max(5.0,-mv.z); gl_PointSize=clamp(aSize*uPixel*(68.0/depth),1.0,42.0*uPixel); gl_Position=projectionMatrix*mv;}`,
      fragmentShader:`varying vec3 vColor; void main(){vec2 p=gl_PointCoord-.5; float d=length(p); float a=smoothstep(.5,.08,d); gl_FragColor=vec4(vColor,a*a*.86);}`
    });
    this.points=new THREE.Points(geo,this.mat); this.points.frustumCulled=false; scene.add(this.points);
    this.cursor=0; this.tmp=new THREE.Color();
  }
  burst(pos,amount=42,color=0x6af7ff,power=7,size=10){
    this.tmp.set(color);
    const lifeScale=.75+Math.min(1.35,power/18);
    for(let n=0;n<amount;n++){
      const i=this.cursor++%this.count, j=i*3;
      this.positions[j]=pos.x;this.positions[j+1]=pos.y;this.positions[j+2]=pos.z;
      const a=rand(0,TAU), u=rand(-1,1), r=Math.sqrt(1-u*u)*rand(.35,1);
      const p=power*rand(.35,1.15);
      this.vel[j]=Math.cos(a)*r*p;this.vel[j+1]=Math.sin(a)*r*p;this.vel[j+2]=u*p+rand(-1,2);
      this.colors[j]=this.tmp.r*rand(.65,1.08);this.colors[j+1]=this.tmp.g*rand(.65,1.08);this.colors[j+2]=this.tmp.b*rand(.65,1.08);
      const life=rand(.18,.52)*lifeScale;this.life[i]=this.maxLife[i]=life;this.sizes[i]=rand(size*.35,size);
    }
    this.dirty();
  }
  trail(pos,color=0xffffff,size=6){
    const i=this.cursor++%this.count,j=i*3; this.tmp.set(color);
    this.positions[j]=pos.x+rand(-.06,.06);this.positions[j+1]=pos.y+rand(-.06,.06);this.positions[j+2]=pos.z+rand(-.1,.1);
    this.vel[j]=rand(-.2,.2);this.vel[j+1]=rand(-.2,.2);this.vel[j+2]=rand(-.4,.4);
    this.colors[j]=this.tmp.r;this.colors[j+1]=this.tmp.g;this.colors[j+2]=this.tmp.b;
    this.life[i]=this.maxLife[i]=rand(.12,.3);this.sizes[i]=rand(size*.5,size); this.dirty();
  }
  update(dt){
    let any=false;
    for(let i=0;i<this.count;i++){
      if(this.life[i]<=0) continue;
      any=true; const j=i*3;
      this.life[i]-=dt;
      if(this.life[i]<=0){this.positions[j+2]=9999;continue;}
      this.positions[j]+=this.vel[j]*dt;this.positions[j+1]+=this.vel[j+1]*dt;this.positions[j+2]+=this.vel[j+2]*dt;
      this.vel[j]*=.985;this.vel[j+1]*=.985;this.vel[j+2]*=.985;
      this.sizes[i]*=.982;
    }
    if(any) this.dirty();
  }
  dirty(){
    this.points.geometry.attributes.position.needsUpdate=true;
    this.points.geometry.attributes.color.needsUpdate=true;
    this.points.geometry.attributes.aSize.needsUpdate=true;
  }
}
