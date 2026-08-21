import * as THREE from 'three';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mobile=()=>innerWidth<760||matchMedia('(pointer: coarse)').matches;
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches||!!window.__pulseSettings?.state?.comfort;
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});
const COLORS={lance:0xff68d8,swarm:0xaa82ff,lock:0x68f3ff};
const NAMES={lance:'COMMAND BREACH',swarm:'VOICE FRACTURE',lock:'SYNC COLLAPSE'};

function buildRig(enemy,weapon){
  const color=COLORS[weapon]||0xffffff,root=new THREE.Group();root.name=`formation-weapon-scar-${weapon}`;enemy.group.add(root);
  const lineMat=new THREE.LineBasicMaterial({color,transparent:true,opacity:.22,depthWrite:false,blending:THREE.NormalBlending});
  const coreMat=new THREE.MeshStandardMaterial({color:0x060910,emissive:color,emissiveIntensity:.08,metalness:.75,roughness:.32,transparent:true,opacity:.52,depthWrite:true,blending:THREE.NormalBlending,flatShading:true});
  const core=new THREE.Mesh(new THREE.OctahedronGeometry(.13,0),coreMat);core.position.z=.25;root.add(core);
  const ring=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.TorusGeometry(.34,.018,3,18)),lineMat);ring.rotation.x=Math.PI/2;ring.position.z=.18;root.add(ring);
  const fractureGeo=new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-.32,.08,.12),new THREE.Vector3(-.08,.01,.2),
    new THREE.Vector3(-.08,.01,.2),new THREE.Vector3(.06,.18,.17),
    new THREE.Vector3(.06,.18,.17),new THREE.Vector3(.31,.04,.12),
    new THREE.Vector3(-.18,-.24,.1),new THREE.Vector3(.02,-.08,.2),
    new THREE.Vector3(.02,-.08,.2),new THREE.Vector3(.26,-.2,.11)
  ]),fracture=new THREE.LineSegments(fractureGeo,lineMat.clone());root.add(fracture);
  const moduleOffsets=[];
  root.scale.setScalar(enemy.type==='tank'?1.14:enemy.type==='sentinel'?1.03:.9);
  return{enemy,weapon,root,core,coreMat,ring,lineMat,fracture,fractureMat:fracture.material,moduleOffsets,started:performance.now(),peak:0,lastNow:performance.now(),expiresStep:enemy.__commandWeaponScar?.expiresStep||((window.__pulseAscent?.audio?.step||0)+16)};
}

function removeOffsets(rig){
  for(const o of rig.moduleOffsets){
    const m=o.module;if(!m)continue;
    m.position.x-=o.px;m.position.y-=o.py;m.position.z-=o.pz;
    m.rotation.x-=o.rx;m.rotation.y-=o.ry;m.rotation.z-=o.rz;
  }
  rig.moduleOffsets.length=0;
}
function addOffset(rig,module,{px=0,py=0,pz=0,rx=0,ry=0,rz=0}){
  if(!module)return;module.position.x+=px;module.position.y+=py;module.position.z+=pz;module.rotation.x+=rx;module.rotation.y+=ry;module.rotation.z+=rz;rig.moduleOffsets.push({module,px,py,pz,rx,ry,rz});
}
function applyModules(rig,t,k,pulse){
  removeOffsets(rig);
  const modules=rig.enemy.__fusionModel?.children||[],motion=(reduced()?.38:1)*k;
  if(!modules.length)return;
  if(rig.weapon==='lance'){
    const spread=(mobile()?.09:.13)*motion;
    addOffset(rig,modules[0],{px:-spread,pz:-spread*.45,ry:-.16*motion});
    addOffset(rig,modules[1]||modules[0],{px:spread,pz:spread*.35,ry:.16*motion});
    if(modules[2])addOffset(rig,modules[2],{py:.055*motion,rx:.12*motion});
  }else if(rig.weapon==='swarm'){
    const index=Math.min(modules.length-1,Math.max(0,rig.enemy.__commandWeaponScar?.voice||1)),m=modules[index];
    addOffset(rig,m,{px:.035*Math.sin(t*11)*motion,py:-.045*motion,rz:(.18+.06*pulse)*motion,ry:.12*motion});
  }else{
    modules.forEach((m,i)=>{
      const phase=(i%4)*Math.PI*.5,amp=(.015+.008*pulse)*motion;
      addOffset(rig,m,{px:Math.sin(t*8+phase)*amp,ry:Math.sin(t*6+phase)*.035*motion,rz:(i%2?1:-1)*.018*pulse*motion});
    });
  }
}
function dispose(rig){
  removeOffsets(rig);if(rig.root.parent)rig.root.parent.remove(rig.root);
  rig.core.geometry.dispose();rig.coreMat.dispose();rig.ring.geometry.dispose();rig.lineMat.dispose();rig.fracture.geometry.dispose();rig.fractureMat.dispose();
  if(rig.enemy?.__formationWeaponScarVisual)delete rig.enemy.__formationWeaponScarVisual;
}

waitFor().then(game=>{
  if(game.__formationWeaponScarVisualInstalled)return;game.__formationWeaponScarVisualInstalled=true;
  const tracked=new Map();const totals={lance:0,swarm:0,lock:0};let peak=0,lastWeapon='';
  function attach(enemy,weapon){
    if(!enemy||enemy.dead||!enemy.group||!COLORS[weapon])return null;
    const old=tracked.get(enemy);if(old){dispose(old);tracked.delete(enemy);}
    const rig=buildRig(enemy,weapon);tracked.set(enemy,rig);totals[weapon]++;lastWeapon=weapon;return rig;
  }
  addEventListener('pulse:formation-weapon-scar',e=>{const d=e.detail||{};attach(d.successor,d.weapon);});
  function tick(now){
    const t=game.time||0,step=game.audio?.step||0,beatDur=game.audio?.beatDur||.46875,beat=((game.audio?.ctx?.currentTime||t)/beatDur)%1,pulse=Math.pow(Math.max(0,Math.cos(beat*Math.PI*2)),10);
    for(const [enemy,rig] of [...tracked]){
      if(!enemy||enemy.dead||!enemy.group?.parent||step>rig.expiresStep){dispose(rig);tracked.delete(enemy);continue;}
      const age=now-rig.started,remaining=Math.max(0,rig.expiresStep-step),fadeIn=clamp(age/180,0,1),fadeOut=clamp(remaining/3,0,1),k=fadeIn*fadeOut;rig.peak=Math.max(rig.peak,k);peak=Math.max(peak,k);
      applyModules(rig,t,k,pulse);
      rig.root.visible=k>.02;rig.root.rotation.z=rig.weapon==='lock'?Math.sin(t*8)*.025*k:0;
      rig.core.scale.setScalar(.68+k*(rig.weapon==='lance'?.62:rig.weapon==='swarm'?.4:.3)+pulse*.05*k);
      rig.coreMat.opacity=clamp(.18+k*.5,0,.72);rig.coreMat.emissiveIntensity=.04+k*(rig.weapon==='lance'?.18:.11)+pulse*.05*k;
      rig.lineMat.opacity=clamp(.12+k*(rig.weapon==='swarm'?.42:.26)+pulse*.04*k,0,.58);
      rig.fractureMat.opacity=rig.weapon==='swarm'?clamp(.16+k*.44+pulse*.06,0,.62):clamp(.08+k*.18,0,.3);
      rig.ring.visible=rig.weapon!=='swarm';rig.fracture.visible=rig.weapon!=='lance';
      enemy.__formationWeaponScarVisual={weapon:rig.weapon,name:NAMES[rig.weapon],strength:Number(k.toFixed(3)),coreOpacity:Number(rig.coreMat.opacity.toFixed(3)),modules:rig.moduleOffsets.length,normalBlending:rig.coreMat.blending===THREE.NormalBlending&&rig.lineMat.blending===THREE.NormalBlending&&rig.fractureMat.blending===THREE.NormalBlending};
    }
    requestAnimationFrame(tick);
  }requestAnimationFrame(tick);
  window.__pulseFormationWeaponScarVisual={attach,stats:()=>({active:tracked.size,peak:Number(peak.toFixed(3)),lastWeapon,totals:{...totals},normalBlending:[...tracked.values()].every(r=>r.coreMat.blending===THREE.NormalBlending&&r.lineMat.blending===THREE.NormalBlending&&r.fractureMat.blending===THREE.NormalBlending)})};
});
