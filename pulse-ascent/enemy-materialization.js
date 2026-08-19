import * as THREE from 'three';

const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=THREE.MathUtils.lerp;
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent&&window.__pulseTopologyWorlds&&window.__pulseEnemyArtDirection?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});
const mobile=()=>innerWidth<760||matchMedia('(pointer: coarse)').matches;

waitFor().then(game=>{
  if(game.__enemyMaterializationInstalled)return;
  game.__enemyMaterializationInstalled=true;
  const topology=window.__pulseTopologyWorlds;
  let spawned=0,recycled=0,active=0;

  const selectedArea=()=>clamp((window.__pulseCampaign?.state?.selected||1)-1,0,4);
  const activeWorld=()=>topology.worlds?.[selectedArea()];
  const colorFor=()=>topology.profiles?.[selectedArea()]?.colors?.[1]??0x7df7ff;

  function segmentFor(enemy){
    const w=activeWorld(),idx=enemy?.userTopology?.segment;
    if(!w?.segments?.length||idx===undefined)return null;
    const a=w.segments[idx*2],b=w.segments[idx*2+1];
    return a&&b?{a,b}:null;
  }

  function traceBurst(enemy,mode='assemble'){
    if(!enemy?.group)return;
    const seg=segmentFor(enemy);if(!seg)return;
    const center=enemy.group.getWorldPosition(new THREE.Vector3());
    const count=mobile()?7:12,pos=new Float32Array(count*6),from=new Float32Array(count*6),to=new Float32Array(count*6);
    const seed=(enemy.userTopology?.phase||.37)*TAU;
    for(let i=0;i<count;i++){
      const j=i*6,f=(i+.5)/count,ang=seed+i*2.399963;
      const lane=new THREE.Vector3().lerpVectors(seg.a,seg.b,clamp(f*.86+.07,0,1));
      lane.x+=Math.cos(ang)*(.1+(i%3)*.07);lane.y+=Math.sin(ang)*(.08+(i%2)*.06);
      const coreA=center.clone().add(new THREE.Vector3(Math.cos(ang)*(.18+(i%4)*.06),Math.sin(ang)*(.14+(i%3)*.05),(i%2?1:-1)*.08));
      const coreB=center.clone().add(new THREE.Vector3(Math.cos(ang+.45)*(.34+(i%3)*.08),Math.sin(ang+.45)*(.24+(i%2)*.06),(i%3-1)*.09));
      const laneB=lane.clone().lerp(center,.08);
      const A=mode==='assemble'?lane:coreA,B=mode==='assemble'?laneB:coreB,C=mode==='assemble'?coreA:lane,D=mode==='assemble'?coreB:laneB;
      from.set([A.x,A.y,A.z,B.x,B.y,B.z],j);to.set([C.x,C.y,C.z,D.x,D.y,D.z],j);pos.set([A.x,A.y,A.z,B.x,B.y,B.z],j);
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
    const mat=new THREE.LineBasicMaterial({color:colorFor(),transparent:true,opacity:mode==='assemble'?.5:.62,blending:THREE.NormalBlending,depthWrite:false,depthTest:true});
    const lines=new THREE.LineSegments(geo,mat);lines.frustumCulled=false;lines.renderOrder=2;game.scene.add(lines);active++;
    const started=performance.now(),duration=mode==='assemble'?430:520;
    const tick=now=>{
      const q=clamp((now-started)/duration,0,1),ease=q*q*(3-2*q),arr=geo.attributes.position.array;
      for(let i=0;i<arr.length;i++)arr[i]=lerp(from[i],to[i],ease);
      geo.attributes.position.needsUpdate=true;
      mat.opacity=(mode==='assemble'?.5:.62)*(1-q)*(mode==='assemble'?Math.min(1,q*4):1);
      if(q<1){requestAnimationFrame(tick);return;}
      game.scene.remove(lines);geo.dispose();mat.dispose();active=Math.max(0,active-1);
    };
    requestAnimationFrame(tick);
  }

  function attach(enemy){
    if(!enemy||enemy.type==='danger'||enemy.__materializationAttached)return enemy;
    enemy.__materializationAttached=true;spawned++;
    traceBurst(enemy,'assemble');
    const baseDispose=enemy.dispose.bind(enemy);
    enemy.dispose=()=>{
      if(!enemy.__materializationRecycled){enemy.__materializationRecycled=true;recycled++;traceBurst(enemy,'recycle');}
      baseDispose();
    };
    return enemy;
  }

  const baseSpawn=game.spawnEnemy.bind(game);
  game.spawnEnemy=(type,pos,phase=0)=>attach(baseSpawn(type,pos,phase));
  for(const e of game.enemies)attach(e);

  const baseDestroyed=game.onEnemyDestroyed.bind(game);
  game.onEnemyDestroyed=enemy=>{
    if(enemy&&!enemy.__materializationRecycled&&enemy.type!=='danger'){
      enemy.__materializationRecycled=true;recycled++;traceBurst(enemy,'recycle');
      const w=activeWorld();if(w?.packetMat)w.packetMat.opacity=Math.min(.78,(w.packetMat.opacity||.32)+.1);
    }
    baseDestroyed(enemy);
  };

  window.__pulseEnemyMaterialization={
    stats:()=>({area:selectedArea()+1,spawned,recycled,active,attached:game.enemies.filter(e=>e.__materializationAttached&&!e.dead).length})
  };
});
