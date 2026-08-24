import * as THREE from 'three';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=t=>{const x=clamp(t,0,1);return x*x*(3-2*x);};

function makeRng(seed=0x51a7){
  let s=seed>>>0;
  return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};
}

export class TempleBloomEnvironment{
  constructor(game){
    this.game=game;
    this.scene=game.scene;
    this.group=new THREE.Group();
    this.group.name='temple-bloom-environment';
    this.group.visible=false;
    this.scene.add(this.group);

    this.maxPillars=64;
    this.maxLintels=32;
    this.activePillars=0;
    this.activeLintels=0;
    this.lastEnvelope=0;
    this.lastBeatPulse=0;
    this.previewEnvelope=null;
    this.previewBeat=null;
    this.densityOverride=null;
    this._dummy=new THREE.Object3D();
    this._rng=makeRng();
    this.layout=[];

    const pillarGeo=new THREE.BoxGeometry(1,1,1,1,1,1);
    const lineMat=new THREE.MeshBasicMaterial({color:0x53e9ff,wireframe:true,transparent:true,opacity:.34,blending:THREE.AdditiveBlending,depthWrite:false});
    this.pillars=new THREE.InstancedMesh(pillarGeo,lineMat,this.maxPillars);
    this.pillars.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.pillars.frustumCulled=false;
    this.group.add(this.pillars);

    const lintelGeo=new THREE.BoxGeometry(1,1,1,1,1,1);
    const accentMat=new THREE.MeshBasicMaterial({color:0xb675ff,wireframe:true,transparent:true,opacity:.28,blending:THREE.AdditiveBlending,depthWrite:false});
    this.lintels=new THREE.InstancedMesh(lintelGeo,accentMat,this.maxLintels);
    this.lintels.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.lintels.frustumCulled=false;
    this.group.add(this.lintels);

    const ringGeo=new THREE.TorusGeometry(10.5,.035,3,48);
    const ringMat=new THREE.MeshBasicMaterial({color:0x69f7ff,transparent:true,opacity:.18,blending:THREE.AdditiveBlending,depthWrite:false});
    this.gates=[];
    for(let i=0;i<4;i++){
      const ring=new THREE.Mesh(ringGeo,ringMat.clone());
      ring.position.z=-34-i*30;
      ring.scale.y=.62+i*.035;
      ring.rotation.z=i*.34;
      ring.visible=false;
      this.group.add(ring);
      this.gates.push(ring);
    }

    this.buildLayout();
    this.applyDensity();
  }

  buildLayout(){
    this.layout.length=0;
    const rng=this._rng;
    for(let i=0;i<this.maxPillars;i++){
      const side=i%2===0?-1:1;
      const lane=Math.floor(i/2)%4;
      const depth=Math.floor(i/8);
      const x=side*(9.5+lane*3.7+rng()*1.4);
      const z=-22-depth*15-rng()*6;
      const h=4.5+rng()*11+(depth%3)*2.2;
      const y=(rng()-.5)*2.4;
      const width=.65+rng()*1.25;
      const delay=(i%8)/10+depth*.035;
      this.layout.push({x,y,z,h,width,delay,lean:(rng()-.5)*.08});
    }
  }

  densityTarget(){
    if(Number.isFinite(this.densityOverride))return clamp(Math.round(this.densityOverride),8,this.maxPillars);
    const settings=window.__pulseSettings?.state;
    const mobile=innerWidth<760||matchMedia?.('(pointer: coarse)').matches;
    if(settings?.graphics==='battery')return mobile?24:32;
    if(settings?.graphics==='quality')return mobile?48:64;
    return mobile?36:52;
  }

  applyDensity(){
    this.activePillars=this.densityTarget();
    this.activeLintels=Math.min(this.maxLintels,Math.floor(this.activePillars/2));
    this.pillars.count=this.activePillars;
    this.lintels.count=this.activeLintels;
  }

  update(sample,dt=1/60){
    const envelope=clamp(this.previewEnvelope??sample?.openness??0,0,1);
    const beatPulse=clamp(this.previewBeat??sample?.beatPulse??0,0,1);
    this.lastEnvelope=envelope;
    this.lastBeatPulse=beatPulse;
    const active=envelope>.006;
    this.group.visible=active;
    if(!active)return;

    this.applyDensity();
    const pulse=1+beatPulse*.09;
    const drift=(this.game.time||0)*.08;

    for(let i=0;i<this.activePillars;i++){
      const p=this.layout[i];
      const local=smooth(clamp((envelope-p.delay*.22)*1.24,0,1));
      const h=Math.max(.04,p.h*local*pulse);
      const outward=(1-local)*2.8;
      this._dummy.position.set(p.x+Math.sign(p.x)*outward,p.y-(1-local)*3.2,p.z);
      this._dummy.rotation.set(p.lean*Math.sin(drift+i*.21),p.lean*.5,beatPulse*.015*Math.sign(p.x));
      this._dummy.scale.set(p.width*mix(.45,1,local),h, p.width*mix(.55,1.35,local));
      this._dummy.updateMatrix();
      this.pillars.setMatrixAt(i,this._dummy.matrix);
    }
    this.pillars.instanceMatrix.needsUpdate=true;

    for(let i=0;i<this.activeLintels;i++){
      const left=this.layout[i*2],right=this.layout[i*2+1];
      const local=smooth(clamp((envelope-left.delay*.18)*1.3,0,1));
      const x=(left.x+right.x)*.5;
      const y=4.8+(i%4)*1.8+beatPulse*.45;
      const z=(left.z+right.z)*.5;
      const span=Math.max(10,Math.abs(right.x-left.x)-2.5);
      this._dummy.position.set(x,y,z);
      this._dummy.rotation.set(0,0,(i%2?-.035:.035)*(1-local));
      this._dummy.scale.set(span*local,.18+.22*local,.35+.45*local);
      this._dummy.updateMatrix();
      this.lintels.setMatrixAt(i,this._dummy.matrix);
    }
    this.lintels.instanceMatrix.needsUpdate=true;

    this.pillars.material.opacity=.12+envelope*.24+beatPulse*.08;
    this.lintels.material.opacity=.08+envelope*.2+beatPulse*.1;
    this.gates.forEach((ring,i)=>{
      const local=smooth(clamp((envelope-i*.09)*1.28,0,1));
      ring.visible=local>.01;
      ring.scale.x=mix(.72,1.05,local)*(1+beatPulse*.035);
      ring.scale.y=mix(.34,.7,local)*(1+beatPulse*.025);
      ring.rotation.z+=dt*(.035+i*.008);
      ring.material.opacity=.04+local*.16+beatPulse*.05;
    });
  }

  preview(envelope=1,beatPulse=1){
    this.previewEnvelope=clamp(envelope,0,1);
    this.previewBeat=clamp(beatPulse,0,1);
    this.update({openness:this.previewEnvelope,beatPulse:this.previewBeat},0);
    return this.stats();
  }

  clearPreview(){this.previewEnvelope=null;this.previewBeat=null;return this.stats();}
  setDensityOverride(count=null){this.densityOverride=Number.isFinite(count)?count:null;this.applyDensity();return this.stats();}
  stats(){return{visible:this.group.visible,envelope:this.lastEnvelope,beatPulse:this.lastBeatPulse,pillars:this.activePillars,lintels:this.activeLintels,gates:this.gates.filter(g=>g.visible).length,densityOverride:this.densityOverride};}
}

const waitFor=()=>new Promise(resolve=>{
  const tick=()=>window.__pulseAscent&&window.__pulseMetamorphosisDirector?resolve([window.__pulseAscent,window.__pulseMetamorphosisDirector]):requestAnimationFrame(tick);
  tick();
});

if(typeof window!=='undefined')waitFor().then(([game,metamorphosis])=>{
  if(game.__templeBloomInstalled)return;
  game.__templeBloomInstalled=true;
  const environment=new TempleBloomEnvironment(game);
  const unsubscribe=metamorphosis.onFrame?.((sample,dt)=>environment.update(sample,dt));
  window.__pulseTempleBloom={
    environment,
    preview:(envelope=1,beatPulse=1)=>environment.preview(envelope,beatPulse),
    clearPreview:()=>environment.clearPreview(),
    setDensityOverride:count=>environment.setDensityOverride(count),
    stats:()=>environment.stats(),
    dispose:()=>{unsubscribe?.();environment.scene.remove(environment.group);}
  };
});
