import * as THREE from 'three';

const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mobile=()=>innerWidth<760||matchMedia('(pointer: coarse)').matches;
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent&&window.__pulseWeaponSignatures?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});

const WEAPON_COLORS={lock:0x6ef3ff,lance:0xff65d8,swarm:0xa884ff,system:0xe9fbff};
const ELITES=new Set(['tank','sentinel','prism']);

function addSeg(out,a,b){out.push(a.x,a.y,a.z,b.x,b.y,b.z);}
function radial(out,count,r0,r1,z=0,phase=0){
  for(let i=0;i<count;i++){const a=phase+i/count*TAU;addSeg(out,new THREE.Vector3(Math.cos(a)*r0,Math.sin(a)*r0,z),new THREE.Vector3(Math.cos(a)*r1,Math.sin(a)*r1,z));}
}
function ring(out,count,r,z=0,phase=0,ys=1){
  for(let i=0;i<count;i++){const a=phase+i/count*TAU,b=phase+(i+1)/count*TAU;addSeg(out,new THREE.Vector3(Math.cos(a)*r,Math.sin(a)*r*ys,z),new THREE.Vector3(Math.cos(b)*r,Math.sin(b)*r*ys,z));}
}
function box(out,r,z=0){
  const p=[[-r,-r],[r,-r],[r,r],[-r,r]];for(let i=0;i<4;i++)addSeg(out,new THREE.Vector3(p[i][0],p[i][1],z),new THREE.Vector3(p[(i+1)%4][0],p[(i+1)%4][1],z));
}

function dispose(root){
  if(root.parent)root.parent.remove(root);
  root.traverse?.(n=>{n.geometry?.dispose?.();if(Array.isArray(n.material))n.material.forEach(m=>m.dispose?.());else n.material?.dispose?.();});
}

waitFor().then(game=>{
  if(game.__hitFeedbackInstalled)return;game.__hitFeedbackInstalled=true;
  const state={hits:0,kills:0,eliteKills:0,nodeKills:0,perfectKills:0,bossBreaks:0,intercepts:0,active:new Set()};
  let wrappedBoss=null;

  const currentWeapon=()=>window.__pulseWeaponSignatures?.stats?.().weapon||window.__pulsePilot?.weapons?.[window.__pulsePilot?.state?.weapon||0]?.id||'system';
  const freshContext=owner=>{
    const c=owner?.__hitFeedbackCtx;if(c&&performance.now()-(c.at||0)<1400)return c;
    return {weapon:currentWeapon(),q:.5,at:performance.now(),index:0,total:1};
  };

  function tone(kind,ctx){
    const audio=game.audio,t=audio?.ctx?.currentTime;if(t===undefined||!audio?.osc)return;
    const root=audio.rootMidi||43,perfect=(ctx?.q||0)>.88;
    if(kind==='hit'){
      audio.osc('triangle',audio.midi(root+31),t,.045,.0075,audio.fx,0,0);
      return;
    }
    if(kind==='regular'){
      audio.osc('sine',audio.midi(root+24),t,.085,.014,audio.fx,0,-.12);
      audio.osc('triangle',audio.midi(root+31),t+.012,.06,.009,audio.fx,4,.12);
    }else if(kind==='elite'){
      audio.osc('sine',audio.midi(root+7),t,.16,.026,audio.fx,-4,-.18);
      audio.osc('triangle',audio.midi(root+26),t+.018,.13,.019,audio.fx,5,.18);
    }else if(kind==='node'){
      [0,7,12].forEach((n,i)=>audio.osc(i===0?'sine':'triangle',audio.midi(root+24+n),t+i*.014,.18,.018,audio.fx,(i-1)*3,(i-1)*.35));
    }else if(kind==='boss'){
      audio.osc('sine',audio.midi(root-12),t,.25,.034,audio.fx,-5,0);
      [0,7,12].forEach((n,i)=>audio.osc('triangle',audio.midi(root+19+n),t+.016+i*.012,.18,.017,audio.fx,(i-1)*4,(i-1)*.3));
    }else if(kind==='intercept'){
      audio.osc('square',audio.midi(root+36),t,.055,.009,audio.fx,0,0);
      audio.osc('sine',audio.midi(root+43),t+.018,.08,.012,audio.fx,0,0);
    }
    if(perfect&&kind!=='hit'){
      [0,7,12].forEach((n,i)=>audio.osc('sine',audio.midi(root+36+n),t+.028+i*.012,.11,.0105,audio.fx,0,(i-1)*.42));
    }
  }

  function makeGlyph(pos,kind,ctx={weapon:'system',q:.5}){
    const maxActive=mobile()?14:24;if(state.active.size>=maxActive){const first=state.active.values().next().value;if(first){state.active.delete(first);dispose(first);}}
    const perfect=(ctx.q||0)>.88,weapon=ctx.weapon||'system',color=kind==='intercept'?0xff5f75:WEAPON_COLORS[weapon]||WEAPON_COLORS.system;
    const verts=[];let radius=.18,duration=150,opacity=.68;
    if(kind==='hit'){
      radius=.13;duration=120;radial(verts,4,.015,.14,0,Math.PI/4);ring(verts,4,.07,0,Math.PI/4);
    }else if(kind==='regular'){
      radius=.38;duration=230;radial(verts,6,.08,.42);ring(verts,6,.19,0,Math.PI/6,.8);
    }else if(kind==='elite'){
      radius=.68;duration=330;radial(verts,8,.16,.72);ring(verts,8,.34,0,Math.PI/8,.78);ring(verts,8,.52,.03,0,.78);
    }else if(kind==='node'){
      radius=.76;duration=390;box(verts,.32);box(verts,.58,.03);for(const [x,y] of [[1,0],[-1,0],[0,1],[0,-1]])addSeg(verts,new THREE.Vector3(x*.18,y*.18,0),new THREE.Vector3(x*.8,y*.8,0));
    }else if(kind==='boss'){
      radius=1.05;duration=440;radial(verts,12,.22,1.02);ring(verts,12,.46,0,Math.PI/12,.78);ring(verts,12,.78,.05,0,.62);
    }else{
      radius=.42;duration=250;ring(verts,4,.3,0,Math.PI/4);addSeg(verts,new THREE.Vector3(-.42,-.42,0),new THREE.Vector3(.42,.42,0));addSeg(verts,new THREE.Vector3(.42,-.42,0),new THREE.Vector3(-.42,.42,0));
    }
    if(perfect&&kind!=='hit'){ring(verts,12,radius*.92,.09,Math.PI/12,.72);opacity+=.12;duration+=55;}
    if(weapon==='lance'&&kind!=='hit'){
      addSeg(verts,new THREE.Vector3(0,-radius*1.05,-.04),new THREE.Vector3(0,radius*1.25,.04));
      addSeg(verts,new THREE.Vector3(-radius*.12,-radius*.9,0),new THREE.Vector3(radius*.12,radius*1.08,0));
    }else if(weapon==='swarm'&&kind!=='hit'){
      for(let i=0;i<3;i++){const a=i/3*TAU+.35;ring(verts,5,radius*(.18+i*.11),i*.025,a,.72);}
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
    const mat=new THREE.LineBasicMaterial({color,transparent:true,opacity:clamp(opacity,0,1),blending:THREE.NormalBlending,depthWrite:false,depthTest:true});
    const root=new THREE.LineSegments(geo,mat);root.name=`combat-feedback-${kind}`;root.position.copy(pos);root.rotation.z=Math.random()*TAU;game.scene.add(root);state.active.add(root);
    const born=performance.now(),startOpacity=mat.opacity,spin=(Math.random()<.5?-1:1)*(kind==='boss'?1.5:2.4);
    const tick=now=>{
      if(!root.parent){state.active.delete(root);return;}
      const k=clamp((now-born)/duration,0,1),ease=1-Math.pow(1-k,3);root.scale.setScalar(.35+ease*.95);root.rotation.z+=spin*.016*(1-k);mat.opacity=startOpacity*(1-k)*(1-k*.2);root.position.z+=.012;
      if(k>=1){state.active.delete(root);dispose(root);return;}requestAnimationFrame(tick);
    };requestAnimationFrame(tick);
  }

  function feedback(kind,pos,ctx){
    makeGlyph(pos,kind,ctx);tone(kind,ctx);
    const perfect=(ctx?.q||0)>.88;
    const kick={hit:.002,regular:.006,elite:.012,node:.017,boss:.024,intercept:.007}[kind]||.005;
    game.cameraKick=(game.cameraKick||0)+kick*(perfect?1.25:1);
    if(kind==='elite')game.haptic?.(perfect?[10,14,16]:8);
    else if(kind==='node')game.haptic?.(perfect?[10,14,22]:[8,12,14]);
    else if(kind==='boss')game.haptic?.(perfect?[12,12,28]:[10,10,18]);
    else if(kind==='intercept')game.haptic?.(6);
  }

  function classify(enemy,killed){
    if(enemy.type==='danger')return 'intercept';
    if(!killed)return 'hit';
    if(enemy.type==='node')return 'node';
    if(ELITES.has(enemy.type))return 'elite';
    return 'regular';
  }

  function styleEnemy(enemy){
    if(!enemy||enemy.__hitFeedbackWrapped||enemy.dead)return;enemy.__hitFeedbackWrapped=true;
    const baseHit=enemy.hit?.bind(enemy);if(!baseHit)return;
    enemy.hit=(dmg=1)=>{
      if(enemy.dead)return false;
      const pos=enemy.group?.getWorldPosition?.(new THREE.Vector3())||enemy.group?.position?.clone?.()||new THREE.Vector3(),beforeDead=enemy.dead,ctx=freshContext(enemy),result=baseHit(dmg),killed=!beforeDead&&enemy.dead;
      const kind=classify(enemy,killed);state.hits++;
      if(killed){state.kills++;if(kind==='elite')state.eliteKills++;else if(kind==='node')state.nodeKills++;else if(kind==='intercept')state.intercepts++;if((ctx.q||0)>.88)state.perfectKills++;}
      feedback(kind,pos,ctx);return result;
    };
  }

  function styleBoss(boss){
    if(!boss||boss.__hitFeedbackWrapped)return;boss.__hitFeedbackWrapped=true;
    const base=boss.hitPart?.bind(boss);if(!base)return;
    boss.hitPart=(part,dmg=1)=>{
      if(part?.dead||boss.dead)return false;
      const pos=part.pivot?.getWorldPosition?.(new THREE.Vector3())||boss.group.position.clone(),wasDead=part.dead,ctx=freshContext(part),result=base(part,dmg),broken=!wasDead&&part.dead;
      state.hits++;if(broken){state.bossBreaks++;state.kills++;if((ctx.q||0)>.88)state.perfectKills++;feedback('boss',pos,ctx);}else feedback('hit',pos,ctx);return result;
    };
  }

  const baseFire=game.fireWeaponAt.bind(game);
  game.fireWeaponAt=(target,index,total,q,cfg)=>{
    const ctx={weapon:cfg?.id||currentWeapon(),q:q??.5,at:performance.now(),index,total};
    if(target){target.__hitFeedbackCtx=ctx;if(target.bossPart&&target.part)target.part.__hitFeedbackCtx=ctx;}
    return baseFire(target,index,total,q,cfg);
  };

  const scan=()=>{
    for(const enemy of game.enemies||[])styleEnemy(enemy);
    if(game.boss!==wrappedBoss){wrappedBoss=game.boss||null;if(wrappedBoss)styleBoss(wrappedBoss);}
    requestAnimationFrame(scan);
  };requestAnimationFrame(scan);

  window.__pulseHitFeedback={
    styleEnemy,
    stats:()=>({...state,active:state.active.size,activeKinds:[...state.active].map(o=>o.name),weapon:currentWeapon()})
  };
});
