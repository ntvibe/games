import * as THREE from 'three';

const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=THREE.MathUtils.lerp;
const mobile=()=>innerWidth<760||matchMedia('(pointer: coarse)').matches;
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent&&window.__pulseTopologyWorlds&&window.__pulseBossBody&&window.__pulseBossDirector?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});

const AREA_NAMES=['CIRCUIT SOVEREIGN','PRISM ARCHON','CHROMA BLOOM','ORGANIC ORACLE','NEURAL SERAPH'];

function buildShell(area){
  const group=new THREE.Group();group.name='boss-topology-shell';
  const seg=[];const add=(a,b)=>seg.push(a.clone(),b.clone());
  if(area===0){
    for(let arm=0;arm<8;arm++){const a=arm/8*TAU,r=2.2+(arm%2)*.55,s=new THREE.Vector3(Math.cos(a)*r,Math.sin(a)*r*.7,0),m=s.clone().add(new THREE.Vector3(Math.sign(s.x||1)*1.2,0,(arm%3-1)*.35)),e=m.clone().add(new THREE.Vector3(0,Math.sign(s.y||1)*1.35,0));add(s,m);add(m,e);}
  }else if(area===1){
    for(let z=-1;z<=1;z++)for(let i=0;i<8;i++){const u=i/7,a=Math.PI*u,p=new THREE.Vector3(Math.cos(a)*4.2,Math.sin(a)*3.8-1.3,z*.7),q=new THREE.Vector3(Math.cos(a+Math.PI/7)*3.35,Math.sin(a+Math.PI/7)*3.05-1.05,z*.25);if(i<7){const u2=(i+1)/7,a2=Math.PI*u2;add(p,new THREE.Vector3(Math.cos(a2)*4.2,Math.sin(a2)*3.8-1.3,z*.7));}add(p,q);}
  }else if(area===2){
    for(let lane=0;lane<5;lane++){let prev=null;for(let i=0;i<22;i++){const a=i/21*TAU*1.7+lane*.7,r=2.5+lane*.38+i*.025,p=new THREE.Vector3(Math.cos(a)*r,Math.sin(a*.83)*r*.72,(i-10.5)*.16+Math.sin(a*1.4)*.5);if(prev)add(prev,p);prev=p;}}
  }else if(area===3){
    for(let trunk=0;trunk<7;trunk++){const a=trunk/7*TAU;let p=new THREE.Vector3(Math.cos(a)*1.1,Math.sin(a)*.8,0);for(let k=0;k<5;k++){const q=p.clone().add(new THREE.Vector3(Math.cos(a+k*.6)*(1.0+k*.12),Math.sin(a+k*.42)*(.75+k*.08),(k-2)*.35));add(p,q);if(k===2)add(q,q.clone().add(new THREE.Vector3(Math.cos(a+1.4)*1.2,Math.sin(a+1.4)*.9,.6)));p=q;}}
  }else{
    for(const z of [-.7,0,.7]){for(let i=0;i<12;i++){const u=i/11,a=Math.PI*u,p=new THREE.Vector3(Math.cos(a)*4.3,Math.sin(a)*4.5-1.25,z);if(i<11){const a2=Math.PI*(i+1)/11;add(p,new THREE.Vector3(Math.cos(a2)*4.3,Math.sin(a2)*4.5-1.25,z));}}for(let s=0;s<10;s++){const a=s/10*TAU;add(new THREE.Vector3(0,.6,z),new THREE.Vector3(Math.cos(a)*2.05,.6+Math.sin(a)*2.05,z));}}add(new THREE.Vector3(0,-4,0),new THREE.Vector3(0,5.2,0));
  }
  const pos=new Float32Array(seg.length*3);seg.forEach((p,i)=>{pos[i*3]=p.x;pos[i*3+1]=p.y;pos[i*3+2]=p.z;});
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const mat=new THREE.LineBasicMaterial({color:0x8df8ff,transparent:true,opacity:.22,blending:THREE.NormalBlending,depthWrite:false,depthTest:true});
  const lines=new THREE.LineSegments(geo,mat);lines.frustumCulled=false;group.add(lines);
  const nodes=[];for(let i=0;i<Math.min(18,seg.length);i+=2)nodes.push(seg[(i*3)%seg.length]);
  const np=new Float32Array(nodes.length*3);nodes.forEach((p,i)=>{np[i*3]=p.x;np[i*3+1]=p.y;np[i*3+2]=p.z;});
  const ng=new THREE.BufferGeometry();ng.setAttribute('position',new THREE.BufferAttribute(np,3));
  const nm=new THREE.PointsMaterial({color:0xff6bd8,size:mobile()?.075:.06,transparent:true,opacity:.55,blending:THREE.NormalBlending,depthWrite:false,sizeAttenuation:true});
  group.add(new THREE.Points(ng,nm));
  return {group,lines,geo,mat,nodeMat:nm,segments:seg};
}

function buildTethers(game){
  const count=mobile()?8:12,pos=new Float32Array(count*6),geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setDrawRange(0,0);
  const mat=new THREE.LineBasicMaterial({color:0x7ef7ff,transparent:true,opacity:.18,blending:THREE.NormalBlending,depthWrite:false,depthTest:true});
  const lines=new THREE.LineSegments(geo,mat);lines.frustumCulled=false;game.scene.add(lines);
  const pp=new Float32Array(count*3),pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(pp,3));const pm=new THREE.PointsMaterial({color:0xff6bd8,size:mobile()?.07:.055,transparent:true,opacity:.7,blending:THREE.NormalBlending,depthWrite:false,sizeAttenuation:true});const packets=new THREE.Points(pg,pm);packets.frustumCulled=false;game.scene.add(packets);
  return {count,pos,geo,mat,lines,pp,pg,pm,packets};
}

function releaseToWorld(game,topology,boss,area){
  const w=topology.worlds?.[area];if(!w?.geo)return;
  const center=boss.group.getWorldPosition(new THREE.Vector3()),attr=w.geo.attributes.position,count=mobile()?12:20,pos=new Float32Array(count*6),from=new Float32Array(count*6),to=new Float32Array(count*6),tmp=new THREE.Vector3();
  for(let i=0;i<count;i++){const vi=Math.floor((i+.5)/count*Math.max(2,w.geo.drawRange.count||attr.count-1));tmp.set(attr.getX(vi),attr.getY(vi),attr.getZ(vi));w.root.localToWorld(tmp);const j=i*6;from.set([center.x,center.y,center.z,center.x,center.y,center.z],j);to.set([tmp.x,tmp.y,tmp.z,lerp(center.x,tmp.x,.82),lerp(center.y,tmp.y,.82),lerp(center.z,tmp.z,.82)],j);pos.set([center.x,center.y,center.z,center.x,center.y,center.z],j);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));const mat=new THREE.LineBasicMaterial({color:topology.profiles?.[area]?.colors?.[1]??0x8ffcff,transparent:true,opacity:.6,blending:THREE.NormalBlending,depthWrite:false});const lines=new THREE.LineSegments(geo,mat);lines.frustumCulled=false;game.scene.add(lines);
  const start=performance.now(),dur=820,tick=now=>{const q=clamp((now-start)/dur,0,1),e=q*q*(3-2*q),arr=geo.attributes.position.array;for(let i=0;i<arr.length;i++)arr[i]=lerp(from[i],to[i],e);geo.attributes.position.needsUpdate=true;mat.opacity=.6*(1-q);if(q<1){requestAnimationFrame(tick);return;}game.scene.remove(lines);geo.dispose();mat.dispose();};requestAnimationFrame(tick);
}

waitFor().then(game=>{
  if(game.__bossTopologyRewriteInstalled)return;game.__bossTopologyRewriteInstalled=true;
  const topology=window.__pulseTopologyWorlds;
  const state={boss:null,shell:null,tethers:buildTethers(game),area:0,phase:0,phaseShock:0,releases:0};
  const selectedArea=()=>clamp((window.__pulseCampaign?.state?.selected||1)-1,0,4);

  const disposeShell=()=>{if(!state.shell)return;state.shell.group.parent?.remove(state.shell.group);state.shell.group.traverse(o=>{o.geometry?.dispose?.();o.material?.dispose?.();});state.shell=null;};
  const patchBoss=boss=>{
    if(!boss||boss.__topologyRewriteInstalled||!boss.__bodyChoreographyInstalled)return false;
    boss.__topologyRewriteInstalled=true;state.boss=boss;state.area=selectedArea();state.phase=boss.phase;disposeShell();state.shell=buildShell(state.area);boss.group.add(state.shell.group);
    const baseKill=boss.kill.bind(boss);boss.kill=()=>{releaseToWorld(game,topology,boss,state.area);state.releases++;baseKill();};
    game.showCallout?.(`${AREA_NAMES[state.area]} // TOPOLOGY CORE`,.94);return true;
  };

  const basePhase=game.onBossPhase.bind(game);
  game.onBossPhase=phase=>{basePhase(phase);state.phase=phase;state.phaseShock=1;window.__pulseTopologyMorph?.trigger?.();};

  const baseWorldUpdate=game.world.update.bind(game.world);
  game.world.update=(dt,t,energy,sync=0)=>{
    baseWorldUpdate(dt,t,energy,sync);
    if(game.boss&&!game.boss.dead&&game.boss!==state.boss)patchBoss(game.boss);
    const boss=state.boss;if(!boss||boss.dead||!state.shell){state.tethers.geo.setDrawRange(0,0);state.tethers.pm.opacity=0;return;}
    if(!boss.__topologyRewriteInstalled)patchBoss(boss);
    state.phase=boss.phase;state.phaseShock=lerp(state.phaseShock,0,1-Math.pow(.015,dt));
    const charge=window.__pulseBossBody?.state?.mode==='charge'?1:window.__pulseBossBody?.state?.mode==='recover'?.45:0;
    const phaseN=(boss.phase-1)/2,intensity=clamp(.2+energy*.25+sync*.18+charge*.28+state.phaseShock*.3,0,1);
    const profile=topology.profiles?.[state.area],c0=profile?.colors?.[0]??0x7ef7ff,c1=profile?.colors?.[1]??0xff6bd8;
    state.shell.mat.color.set(c0).lerp(new THREE.Color(c1),.18+phaseN*.38+charge*.18);state.shell.mat.opacity=clamp(.13+phaseN*.07+intensity*.09,.12,.34);state.shell.nodeMat.color.set(c1);state.shell.nodeMat.opacity=clamp(.36+intensity*.32,.3,.76);state.shell.group.rotation.z+=dt*(.08+boss.phase*.055)*(state.area%2?-1:1);state.shell.group.scale.setScalar(1+charge*.08+state.phaseShock*.055+Math.sin(t*2.1)*.012);

    boss.core.material.opacity=Math.min(boss.core.material.opacity,.08);boss.innerCore.material.opacity=Math.min(boss.innerCore.material.opacity,.38);boss.rings.forEach(r=>r.material.opacity=Math.min(r.material.opacity,.055));boss.spokes?.forEach(s=>s.material.opacity=Math.min(s.material.opacity,.045));boss.parts.forEach(p=>{if(!p.dead)p.mesh.material.opacity=p.locked?.94:.58+phaseN*.08;});

    const w=topology.worlds?.[state.area],attr=w?.geo?.attributes?.position,activeVertices=Math.max(2,Math.min(attr?.count||2,w?.geo?.drawRange?.count||attr?.count||2));const living=boss.parts.filter(p=>!p.dead),activeTethers=Math.min(state.tethers.count,[4,7,10][boss.phase-1]||10);
    if(w&&attr&&living.length){
      const bossCenter=boss.group.getWorldPosition(new THREE.Vector3()),src=new THREE.Vector3(),end=new THREE.Vector3();
      for(let i=0;i<activeTethers;i++){const vi=Math.min(activeVertices-1,Math.floor(((i+.35)/activeTethers)*activeVertices)),j=i*6;src.set(attr.getX(vi),attr.getY(vi),attr.getZ(vi));w.root.localToWorld(src);const part=living[i%living.length];part.pivot.getWorldPosition(end);state.tethers.pos[j]=src.x;state.tethers.pos[j+1]=src.y;state.tethers.pos[j+2]=src.z;state.tethers.pos[j+3]=end.x;state.tethers.pos[j+4]=end.y;state.tethers.pos[j+5]=end.z;const f=(t*(.34+.08*boss.phase)+i*.113)%1,k=i*3;state.tethers.pp[k]=lerp(src.x,end.x,f);state.tethers.pp[k+1]=lerp(src.y,end.y,f);state.tethers.pp[k+2]=lerp(src.z,end.z,f);}
      state.tethers.geo.setDrawRange(0,activeTethers*2);state.tethers.geo.attributes.position.needsUpdate=true;state.tethers.pg.attributes.position.needsUpdate=true;state.tethers.mat.color.set(c0);state.tethers.mat.opacity=clamp(.08+phaseN*.05+charge*.1+state.phaseShock*.1,.07,.28);state.tethers.pm.color.set(c1);state.tethers.pm.opacity=clamp(.38+intensity*.3,.32,.78);state.tethers.lines.visible=true;state.tethers.packets.visible=true;
      w.mat.opacity=Math.min(.22,(w.mat.opacity||.1)+phaseN*.025+charge*.018);w.packetMat.opacity=Math.min(.82,(w.packetMat.opacity||.4)+phaseN*.04+charge*.05);w.root.scale.setScalar(1+Math.sin(t*.55)*.006+state.phaseShock*.018);
      if(state.phaseShock>.04){w.root.rotation.z+=Math.sin(t*5.5)*state.phaseShock*.0025;}
      void bossCenter;
    }
  };

  window.__pulseBossTopology={state,patchBoss,stats:()=>({patched:!!state.boss?.__topologyRewriteInstalled,area:state.area+1,phase:state.phase,tethers:state.tethers.geo.drawRange.count/2,releases:state.releases,shell:!!state.shell,name:AREA_NAMES[state.area]})};
});