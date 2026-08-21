import * as THREE from 'three';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mobile=()=>innerWidth<760||matchMedia('(pointer: coarse)').matches;
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches||!!window.__pulseSettings?.state?.comfort;
const COLORS={lock:0x78f6ff,lance:0xff69d7,swarm:0xb18aff,system:0xe9fbff};
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent&&window.__pulseCommandExposureVisual&&window.__pulseHitFeedback?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});

function dispose(root){
  if(root.parent)root.parent.remove(root);
  root.traverse?.(n=>{n.geometry?.dispose?.();if(Array.isArray(n.material))n.material.forEach(m=>m.dispose?.());else n.material?.dispose?.();});
}

function makeKillGesture(game,pos,weapon,q){
  const root=new THREE.Group();root.name=`command-exposure-${weapon}-finish`;root.position.copy(pos);game.scene.add(root);
  const color=COLORS[weapon]||COLORS.system,count=4,parts=[];
  for(let i=0;i<count;i++){
    const a=i*Math.PI*.5+Math.PI*.25,mat=new THREE.MeshStandardMaterial({color:0x06090e,emissive:color,emissiveIntensity:.08,metalness:.78,roughness:.32,transparent:true,opacity:.62,depthWrite:false,blending:THREE.NormalBlending,flatShading:true});
    const mesh=new THREE.Mesh(new THREE.TetrahedronGeometry(.18,0),mat);mesh.scale.set(1,.5,.4);mesh.position.set(Math.cos(a)*.34,Math.sin(a)*.28,.04);mesh.rotation.set(.45,a*.22,.2);root.add(mesh);parts.push({mesh,a,mat});
  }
  const coreMat=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.55,depthWrite:false,blending:THREE.NormalBlending});
  const core=new THREE.Mesh(new THREE.OctahedronGeometry(.105,0),coreMat);root.add(core);
  const born=performance.now(),duration=weapon==='lance'?230:weapon==='swarm'?260:210,motion=reduced()?.38:1;
  const tick=now=>{
    const k=clamp((now-born)/duration,0,1),ease=1-Math.pow(1-k,3),fade=(1-k)*(1-k*.15);
    for(let i=0;i<parts.length;i++){
      const p=parts[i],dir=weapon==='lock'?-1:1,dist=weapon==='lance'?.55:weapon==='swarm'?.34:.26;
      if(weapon==='swarm'){
        const stagger=clamp(k*1.25-i*.09,0,1);p.mesh.position.x=Math.cos(p.a)*(.34+dist*stagger*motion);p.mesh.position.y=Math.sin(p.a)*(.28+dist*.75*stagger*motion);p.mesh.rotation.z+=.09*(i%2?1:-1)*motion;
      }else{
        const r=.34+dir*dist*ease*motion;p.mesh.position.x=Math.cos(p.a)*Math.max(.035,r);p.mesh.position.y=Math.sin(p.a)*Math.max(.03,r*.82);p.mesh.rotation.y+=(weapon==='lance'?.11:.06)*(i%2?1:-1)*motion;
      }
      p.mat.opacity=.62*fade;
    }
    core.scale.setScalar(1+(weapon==='lance'?.75:weapon==='swarm'?.48:.28)*ease*motion);coreMat.opacity=.55*fade;
    if(k>=1){dispose(root);return;}requestAnimationFrame(tick);
  };requestAnimationFrame(tick);
}

waitFor().then(game=>{
  if(game.__commandExposureImpactInstalled)return;game.__commandExposureImpactInstalled=true;
  const wrapped=new WeakSet(),reactions=new Map(),state={hits:0,lance:0,swarm:0,lock:0,perfectLock:0,kills:0,lastWeapon:'',lastType:'',peak:0};

  const exposed=enemy=>!!enemy?.__phraseExposure&&enemy.__phraseExposure.expires>performance.now()&&(enemy.__commandExposureVisual?.open||0)>.04;
  const context=enemy=>{
    const c=enemy?.__hitFeedbackCtx;if(c&&performance.now()-(c.at||0)<1600)return c;
    return{weapon:window.__pulseWeaponSignatures?.stats?.().weapon||'system',q:.5,index:0,total:1,at:performance.now()};
  };
  const beginReaction=(enemy,ctx)=>{
    const weapon=ctx.weapon||'system',r=reactions.get(enemy)||{lance:0,lock:0,plate:[0,0,0,0],last:performance.now()};
    if(weapon==='lance'){r.lance=1;state.lance++;}
    else if(weapon==='swarm'){const i=Math.abs(ctx.index||state.hits)%4;r.plate[i]=1;state.swarm++;}
    else if(weapon==='lock'){r.lock=Math.max(r.lock,(ctx.q||0)>.88?1:.55);state.lock++;if((ctx.q||0)>.88)state.perfectLock++;}
    reactions.set(enemy,r);state.hits++;state.lastWeapon=weapon;state.lastType=enemy.type||'';
    dispatchEvent(new CustomEvent('pulse:command-exposure-impact',{detail:{enemy,weapon,q:ctx.q||0,index:ctx.index||0}}));
  };

  function wrap(enemy){
    if(!enemy||wrapped.has(enemy)||!enemy.hit)return;wrapped.add(enemy);
    const base=enemy.hit.bind(enemy);
    enemy.hit=(dmg=1)=>{
      const active=exposed(enemy),ctx=active?context(enemy):null,pos=active?(enemy.group?.getWorldPosition?.(new THREE.Vector3())||enemy.group?.position?.clone?.()):null;
      if(active)beginReaction(enemy,ctx);
      const result=base(dmg),killed=!!enemy.dead;
      if(active&&killed&&pos){state.kills++;makeKillGesture(game,pos,ctx.weapon||'system',ctx.q||0);}
      return result;
    };
  }

  function animate(now){
    const motion=reduced()?.38:1,dt=.016;
    for(const enemy of game.enemies||[])wrap(enemy);
    for(const [enemy,r] of [...reactions]){
      if(enemy.dead||!enemy.group){reactions.delete(enemy);continue;}
      const root=enemy.group.getObjectByName?.('command-exposure-rig');if(!root){reactions.delete(enemy);continue;}
      const groups=root.children.filter(c=>c.isGroup).slice(0,4),core=root.children.find(c=>c.isMesh)||null;
      r.lance=THREE.MathUtils.lerp(r.lance,0,1-Math.exp(-dt*11));r.lock=THREE.MathUtils.lerp(r.lock,0,1-Math.exp(-dt*13));
      for(let i=0;i<4;i++)r.plate[i]=THREE.MathUtils.lerp(r.plate[i],0,1-Math.exp(-dt*(9+i*.6)));
      const peak=Math.max(r.lance,r.lock,...r.plate);state.peak=Math.max(state.peak,peak);
      for(let i=0;i<groups.length;i++){
        const g=groups[i],radial=1+r.lance*.38*motion+r.plate[i]*.22*motion-r.lock*.18*motion;
        g.position.x*=radial;g.position.y*=radial;g.rotation.y+=(i%2?1:-1)*(r.lance*.12+r.plate[i]*.09-r.lock*.06)*motion;g.rotation.z+=(i%2?1:-1)*r.plate[i]*.045*motion;
      }
      if(core){const s=1+r.lance*.34*motion+r.plate.reduce((a,b)=>a+b,0)*.045*motion+r.lock*.16*motion;core.scale.multiplyScalar(s);}
      enemy.__commandExposureImpact={weapon:state.lastWeapon,lance:Number(r.lance.toFixed(3)),lock:Number(r.lock.toFixed(3)),plates:r.plate.map(v=>Number(v.toFixed(3))),active:peak>.03};
      if(peak<.008&&!exposed(enemy))reactions.delete(enemy);
    }
    requestAnimationFrame(animate);
  }requestAnimationFrame(animate);

  window.__pulseCommandExposureImpact={
    stats:()=>({...state,active:reactions.size,normalBlending:game.scene.children.filter(o=>o.name?.startsWith('command-exposure-')&&o.name?.endsWith('-finish')).every(o=>o.children.every(c=>!c.material||c.material.blending===THREE.NormalBlending))}),
    wrap
  };
});
