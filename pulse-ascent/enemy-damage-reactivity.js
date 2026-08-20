import * as THREE from 'three';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mobile=()=>innerWidth<760||matchMedia('(pointer: coarse)').matches;
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent&&window.__pulseModelFusion&&window.__pulseHitFeedback?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});

function disposeMaterials(root){
  root.traverse?.(n=>{
    if(Array.isArray(n.material))n.material.forEach(m=>m?.dispose?.());
    else n.material?.dispose?.();
    // Fusion geometry is shared by cloned GLB templates. Do not dispose it per enemy.
    if(n.userData?.damageOwnedGeometry)n.geometry?.dispose?.();
  });
}

function makeCracks(model,color){
  const verts=[];
  const modules=model.children.filter(c=>c.name==='rez-volume-model');
  for(let i=0;i<modules.length;i++){
    const p=modules[i].position;
    verts.push(0,0,0,p.x*.82,p.y*.82,p.z*.82);
    if(i>0){const q=modules[i-1].position;verts.push(q.x*.72,q.y*.72,q.z*.72,p.x*.72,p.y*.72,p.z*.72);}
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.userData.damageOwnedGeometry=true;
  const mat=new THREE.LineBasicMaterial({color,transparent:true,opacity:0,blending:THREE.NormalBlending,depthWrite:false});
  const line=new THREE.LineSegments(geo,mat);line.name='fusion-damage-cracks';line.renderOrder=3;model.add(line);return line;
}

function releaseModel(game,enemy,state){
  const model=enemy.__fusionModel;if(!model||state.released)return;
  state.released=true;enemy.group.updateMatrixWorld(true);game.scene.attach(model);model.updateMatrixWorld(true);
  const pieces=model.children.filter(c=>c!==state.cracks && c.name==='rez-volume-model');
  const born=performance.now(),duration=mobile()?520:700;
  const velocities=pieces.map((p,i)=>{
    const d=p.position.clone();if(d.lengthSq()<.01)d.set((i%2?1:-1)*.4,((i%3)-1)*.35,.2);d.normalize();
    d.x+=(Math.random()-.5)*.45;d.y+=(Math.random()-.5)*.35;d.z+=(Math.random()-.5)*.4;
    return d.multiplyScalar(1.2+Math.random()*1.45);
  });
  const spins=pieces.map(()=>new THREE.Vector3((Math.random()-.5)*4,(Math.random()-.5)*4,(Math.random()-.5)*5));
  if(state.cracks)state.cracks.material.opacity=.68;
  const tick=now=>{
    const k=clamp((now-born)/duration,0,1),dt=.016;
    pieces.forEach((p,i)=>{
      p.position.addScaledVector(velocities[i],dt*(1+.7*k));p.rotation.x+=spins[i].x*dt;p.rotation.y+=spins[i].y*dt;p.rotation.z+=spins[i].z*dt;
      p.traverse(n=>{if(n.material&&'opacity' in n.material)n.material.opacity*=.94;});
    });
    if(state.cracks)state.cracks.material.opacity=.68*(1-k);
    model.scale.multiplyScalar(.997);
    if(k>=1){if(model.parent)model.parent.remove(model);disposeMaterials(model);return;}
    requestAnimationFrame(tick);
  };requestAnimationFrame(tick);
}

waitFor().then(game=>{
  if(game.__enemyDamageReactivityInstalled)return;game.__enemyDamageReactivityInstalled=true;
  const tracked=new Set();let hits=0,disassemblies=0;

  function style(enemy){
    if(!enemy||enemy.dead||enemy.type==='danger'||enemy.type==='rupture'||enemy.__damageReactive||!enemy.__fusionModel)return enemy;
    enemy.__damageReactive=true;tracked.add(enemy);
    const model=enemy.__fusionModel,modules=model.children.filter(c=>c.name==='rez-volume-model');
    const initialHp=Math.max(1,enemy.hp||1),primary=modules[0]?.children?.[0]?.material?.emissive?.getHex?.()||0x74efff;
    const state={initialHp,modules,base:modules.map(m=>({p:m.position.clone(),r:m.rotation.clone()})),impulse:0,hitIndex:0,released:false,cracks:makeCracks(model,primary)};
    enemy.__damageReactiveState=state;

    const baseDispose=enemy.dispose?.bind(enemy);
    if(baseDispose)enemy.dispose=()=>{
      // Avoid disposing shared GLB geometry through Enemy.dispose().
      if(model.parent===enemy.group)enemy.group.remove(model);
      baseDispose();
      if(!state.released){if(model.parent)model.parent.remove(model);disposeMaterials(model);}
    };

    const baseHit=enemy.hit?.bind(enemy);
    if(baseHit)enemy.hit=(dmg=1)=>{
      if(enemy.dead)return false;
      const lethal=(enemy.hp??1)-dmg<=0;
      if(lethal){releaseModel(game,enemy,state);disassemblies++;}
      const result=baseHit(dmg);hits++;
      if(!lethal&&!enemy.dead){
        state.impulse=Math.min(1,state.impulse+.72);state.hitIndex=(state.hitIndex+1)%Math.max(1,modules.length);
        const hpRatio=clamp((enemy.hp||0)/state.initialHp,0,1);state.cracks.material.opacity=.12+(1-hpRatio)*.5;
        state.cracks.scale.setScalar(1+(1-hpRatio)*.08);
      }
      return result;
    };

    const baseUpdate=enemy.update?.bind(enemy);
    if(baseUpdate)enemy.update=(dt,t)=>{
      baseUpdate(dt,t);if(enemy.dead||state.released)return;
      state.impulse*=Math.pow(.035,dt);
      const damage=1-clamp((enemy.hp||0)/state.initialHp,0,1);
      modules.forEach((m,i)=>{
        const b=state.base[i],dir=b.p.clone();if(dir.lengthSq()<.001)dir.set(i%2?.5:-.5,(i%3-1)*.3,.1);dir.normalize();
        const permanent=damage*(.035+.012*(i%3)),kick=(i===state.hitIndex?state.impulse*.12:state.impulse*.025);
        const target=b.p.clone().addScaledVector(dir,permanent+kick);m.position.lerp(target,clamp(dt*14,0,1));
        m.rotation.x=THREE.MathUtils.lerp(m.rotation.x,b.r.x+dir.y*(damage*.08+kick*.35),clamp(dt*12,0,1));
        m.rotation.y=THREE.MathUtils.lerp(m.rotation.y,b.r.y-dir.x*(damage*.1+kick*.4),clamp(dt*12,0,1));
        m.rotation.z=THREE.MathUtils.lerp(m.rotation.z,b.r.z+(i%2?1:-1)*(damage*.045+kick*.2),clamp(dt*12,0,1));
      });
      state.cracks.rotation.z=Math.sin(t*1.8+(enemy.seed||0))*.025;state.cracks.material.opacity=Math.max(state.cracks.material.opacity*.995,damage*.36);
    };
    return enemy;
  }

  const scan=()=>{
    for(const enemy of game.enemies||[])style(enemy);
    for(const enemy of [...tracked])if(enemy.dead)tracked.delete(enemy);
    requestAnimationFrame(scan);
  };requestAnimationFrame(scan);

  window.__pulseEnemyDamageReactivity={
    style,
    stats:()=>({tracked:tracked.size,hits,disassemblies,activeCracks:[...tracked].filter(e=>e.__damageReactiveState?.cracks?.material?.opacity>0.05).length})
  };
});
