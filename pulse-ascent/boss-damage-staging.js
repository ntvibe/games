import * as THREE from 'three';

const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=THREE.MathUtils.lerp;
const mobile=()=>innerWidth<760||matchMedia('(pointer: coarse)').matches;
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent&&window.__pulseBossTopology&&window.__pulseModelFusion?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});

function wedgeGeometry(){
  const p=[[-.78,-.42,.16],[.78,-.42,.16],[.56,.42,.28],[-.56,.42,.28],[-.62,-.34,-.16],[.62,-.34,-.16],[.44,.34,-.22],[-.44,.34,-.22]];
  const idx=[0,1,2,0,2,3,4,6,5,4,7,6,0,4,5,0,5,1,1,5,6,1,6,2,2,6,7,2,7,3,3,7,4,3,4,0];
  const pos=[];for(const i of idx)pos.push(...p[i]);const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.computeVertexNormals();return g;
}

function makeStage(boss,area){
  const root=new THREE.Group();root.name='boss-damage-stage';boss.group.add(root);
  const colors=window.__pulseTopologyWorlds?.profiles?.[area]?.colors||[0x69efff,0xff63d7];
  const plateGeo=wedgeGeometry(),plates=[];
  for(let i=0;i<8;i++){
    const a=i/8*TAU,plate=new THREE.Mesh(plateGeo.clone(),new THREE.MeshStandardMaterial({color:0x05090e,emissive:colors[i%2],emissiveIntensity:.04,metalness:.9,roughness:.28,transparent:true,opacity:.76,blending:THREE.NormalBlending,depthWrite:true}));
    plate.name='boss-armor-plate';plate.position.set(Math.cos(a)*2.35,Math.sin(a)*1.7,(i%2?-.36:.36));plate.rotation.set(0,-a,a+Math.PI/2);plate.scale.set(.96,1.18,.72);plate.userData={a,base:plate.position.clone(),baseRot:plate.rotation.clone(),breach:0,seed:(i%5)*.21};
    const edge=new THREE.LineSegments(new THREE.EdgesGeometry(plate.geometry,28),new THREE.LineBasicMaterial({color:colors[(i+1)%2],transparent:true,opacity:.2,blending:THREE.NormalBlending,depthWrite:false}));edge.name='boss-armor-edge';plate.add(edge);root.add(plate);plates.push(plate);
  }

  const ribMat=new THREE.MeshStandardMaterial({color:0x080d12,emissive:colors[0],emissiveIntensity:.035,metalness:.78,roughness:.42,transparent:true,opacity:.7,blending:THREE.NormalBlending});
  const ribs=[];for(let i=0;i<6;i++){const a=i/6*TAU,r=new THREE.Mesh(new THREE.CylinderGeometry(.055,.085,3.3,5,1),ribMat.clone());r.position.set(Math.cos(a)*1.05,Math.sin(a)*.72,0);r.rotation.z=-a;r.rotation.x=Math.PI/2;r.userData.a=a;root.add(r);ribs.push(r);}

  const internals=new THREE.Group();internals.name='boss-exposed-internals';root.add(internals);
  const cage=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.DodecahedronGeometry(1.05,0)),new THREE.LineBasicMaterial({color:colors[1],transparent:true,opacity:.08,blending:THREE.NormalBlending,depthWrite:false}));internals.add(cage);
  const core=new THREE.Mesh(new THREE.IcosahedronGeometry(.58,1),new THREE.MeshStandardMaterial({color:0x08080d,emissive:colors[1],emissiveIntensity:.18,metalness:.55,roughness:.25,transparent:true,opacity:.3,blending:THREE.NormalBlending}));internals.add(core);

  const crackPos=new Float32Array(8*6),crackGeo=new THREE.BufferGeometry();crackGeo.setAttribute('position',new THREE.BufferAttribute(crackPos,3));
  const crackMat=new THREE.LineBasicMaterial({color:colors[1],transparent:true,opacity:0,blending:THREE.NormalBlending,depthWrite:false});
  const cracks=new THREE.LineSegments(crackGeo,crackMat);cracks.name='boss-structural-cracks';root.add(cracks);
  return {root,plates,ribs,internals,cage,core,cracks,crackGeo,crackMat,colors,death:false};
}

function detachDeathStage(game,stage){
  if(!stage?.root?.parent)return;
  game.scene.attach(stage.root);stage.death=true;
  const start=performance.now(),duration=mobile()?620:760;
  const bases=stage.plates.map(p=>({p:p.position.clone(),r:p.rotation.clone(),s:p.scale.clone()}));
  const ribBases=stage.ribs.map(r=>r.position.clone());
  const tick=now=>{
    const q=clamp((now-start)/duration,0,1),e=1-Math.pow(1-q,3);
    stage.plates.forEach((p,i)=>{const a=p.userData.a,base=bases[i];p.position.copy(base.p).add(new THREE.Vector3(Math.cos(a)*e*(2.8+(i%3)*.5),Math.sin(a)*e*(2.1+(i%2)*.35),((i%3)-1)*e*1.2));p.rotation.x=base.r.x+e*(.7+i*.07);p.rotation.y=base.r.y+e*(i%2?1.1:-1.1);p.rotation.z=base.r.z+e*(i%2?.8:-.8);p.material.opacity=.72*(1-q);p.traverse(o=>{if(o.isLineSegments)o.material.opacity=.22*(1-q)});});
    stage.ribs.forEach((r,i)=>{const a=r.userData.a;r.position.copy(ribBases[i]).add(new THREE.Vector3(Math.cos(a)*e*1.5,Math.sin(a)*e*1.2,e*(i%2?.8:-.8)));r.rotation.y+=.02;r.material.opacity=.55*(1-q);});
    stage.crackMat.opacity=.45*(1-q);stage.cage.material.opacity=.18*(1-q);stage.core.material.opacity=.42*(1-q);stage.root.scale.setScalar(1+e*.18);
    if(q<1){requestAnimationFrame(tick);return;}stage.root.parent?.remove(stage.root);stage.root.traverse(o=>{o.geometry?.dispose?.();o.material?.dispose?.();});
  };requestAnimationFrame(tick);
}

waitFor().then(game=>{
  if(game.__bossDamageStagingInstalled)return;game.__bossDamageStagingInstalled=true;
  const state={boss:null,stage:null,area:0,phase:0,breaches:0,phaseShock:0,lastRatio:1,deathDisassemblies:0};
  const area=()=>clamp((window.__pulseCampaign?.state?.selected||1)-1,0,4);

  const breach=(boss,index)=>{
    const stage=state.stage,plate=stage?.plates[index];if(!plate||plate.userData.breach)return;
    plate.userData.breach=1;state.breaches++;state.phaseShock=1;
    const wp=boss.parts[index]?.pivot?.getWorldPosition(new THREE.Vector3())||boss.group.getWorldPosition(new THREE.Vector3());
    game.particles.burst(wp,mobile()?24:34,stage.colors[1],4.2,7);game.haptic?.([12,18,24]);
  };

  const patchBoss=boss=>{
    if(!boss||boss.__damageStagingInstalled)return false;boss.__damageStagingInstalled=true;
    state.boss=boss;state.area=area();state.phase=boss.phase;state.lastRatio=boss.healthRatio();state.breaches=0;state.stage=makeStage(boss,state.area);
    const baseHit=boss.hitPart.bind(boss);
    boss.hitPart=(part,dmg=1)=>{const i=boss.parts.indexOf(part),wasDead=part.dead,result=baseHit(part,dmg);if(i>=0&&!wasDead&&part.dead)breach(boss,i);return result;};
    const baseKill=boss.kill.bind(boss);
    boss.kill=()=>{if(boss.dead)return;if(state.stage&&!state.stage.death){detachDeathStage(game,state.stage);state.deathDisassemblies++;}baseKill();};
    return true;
  };

  const baseWorldUpdate=game.world.update.bind(game.world);
  game.world.update=(dt,t,energy,sync=0)=>{
    baseWorldUpdate(dt,t,energy,sync);
    if(game.boss&&!game.boss.dead&&game.boss!==state.boss)patchBoss(game.boss);
    const boss=state.boss,stage=state.stage;if(!boss||boss.dead||!stage||stage.death)return;
    const ratio=boss.healthRatio(),damage=clamp(1-ratio,0,1),phase=boss.phase;
    if(phase!==state.phase){state.phase=phase;state.phaseShock=1;game.showCallout?.(phase===2?'ARMOR BREACH // INTERNAL BUS EXPOSED':'CORE CAGE OPEN // FINAL SHELL',.92);}
    state.phaseShock=lerp(state.phaseShock,0,1-Math.pow(.012,dt));state.lastRatio=ratio;
    const phaseOpen=[0,.34,.74][phase-1]||0,open=clamp(phaseOpen+damage*.36+state.phaseShock*.16,0,1.25),beat=Math.pow(Math.max(0,Math.cos((t*(game.audio?.beatDur?1/game.audio.beatDur:2.13)%1)*TAU)),12);

    stage.plates.forEach((p,i)=>{const u=p.userData,a=u.a,part=boss.parts[i],dead=!!part?.dead,partDamage=part?clamp(1-part.hp/15,0,1):0,breachAmt=dead?1:partDamage*.38;
      const radial=1+open*.52+breachAmt*.8;p.position.set(Math.cos(a)*2.35*radial,Math.sin(a)*1.7*(1+open*.42+breachAmt*.48),(i%2?-.36:.36)+Math.sin(t*.8+i)*open*.18+(dead?(i%3-1)*.7:0));
      p.rotation.x=u.baseRot.x+(dead?.45+i*.03:partDamage*.08)+Math.sin(t*.7+u.seed)*open*.05;p.rotation.y=u.baseRot.y+(dead?(i%2?.65:-.65):open*(i%2?.16:-.16));p.rotation.z=u.baseRot.z+(dead?(i%2?.28:-.28):Math.sin(t*.55+i)*open*.07);
      p.scale.set(.96,1.18,.72).multiplyScalar(1+beat*.018*(1-damage));p.material.opacity=dead?.26:clamp(.76-damage*.22-open*.14,.34,.76);p.material.emissiveIntensity=.035+partDamage*.08+beat*.025+(dead?.03:0);p.traverse(o=>{if(o.isLineSegments)o.material.opacity=dead?.08:.18+partDamage*.12;});
    });

    stage.ribs.forEach((r,i)=>{const a=r.userData.a;r.position.set(Math.cos(a)*(1.05+open*.22),Math.sin(a)*(.72+open*.18),Math.sin(t*.9+i)*open*.12);r.material.opacity=clamp(.7-damage*.18,.42,.7);r.material.emissiveIntensity=.03+damage*.08;});
    stage.cage.rotation.x+=dt*(.08+phase*.04);stage.cage.rotation.y-=dt*(.11+phase*.05);stage.cage.material.opacity=clamp(.06+damage*.24+phaseOpen*.12,.06,.38);
    stage.core.rotation.x-=dt*(.3+phase*.12);stage.core.rotation.y+=dt*(.44+phase*.16);stage.core.scale.setScalar(.9+damage*.3+beat*.08);stage.core.material.opacity=clamp(.22+damage*.42+phaseOpen*.2,.22,.82);stage.core.material.emissiveIntensity=.12+damage*.34+beat*.08;

    const arr=stage.crackGeo.attributes.position.array;for(let i=0;i<8;i++){const p=boss.parts[i],j=i*6;if(!p){arr.fill(0,j,j+6);continue;}const local=p.pivot.position;const strength=p.dead?1:clamp(1-p.hp/15,0,1);arr[j]=local.x*.82;arr[j+1]=local.y*.82;arr[j+2]=local.z*.82;arr[j+3]=local.x*(.25+.12*strength);arr[j+4]=local.y*(.25+.12*strength);arr[j+5]=local.z*(.25+.12*strength);}
    stage.crackGeo.attributes.position.needsUpdate=true;stage.crackMat.opacity=clamp(damage*.42+state.breaches*.045+state.phaseShock*.15,0,.58);

    const fusion=boss.__fusionModel;if(fusion){fusion.children.forEach((o,i)=>{const part=boss.parts[i%boss.parts.length],damaged=part?clamp(1-part.hp/15,0,1):damage;o.scale.setScalar(1-damaged*.08);o.traverse(n=>{if(n.isMesh&&n.material){n.material.opacity=clamp(.76-damage*.18-damaged*.12,.38,.76);n.material.emissiveIntensity=.04+damaged*.1;}else if(n.isLineSegments&&n.name==='fusion-edge')n.material.opacity=clamp(.22+damaged*.12,.18,.36);});});}
  };

  window.__pulseBossDamageStaging={state,patchBoss,breach,stats:()=>({patched:!!state.boss?.__damageStagingInstalled,phase:state.phase,health:state.boss?.healthRatio?.()??0,breaches:state.breaches,plates:state.stage?.plates.length||0,crackOpacity:state.stage?.crackMat.opacity||0,coreOpacity:state.stage?.core.material.opacity||0,deathDisassemblies:state.deathDisassemblies,normal:state.stage?.crackMat.blending===THREE.NormalBlending})};
});
