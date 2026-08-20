import * as THREE from 'three';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent&&window.__pulseDodge&&window.__pulseAreaEnemyAttacks?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});
const AREA_COLORS=[0x58edff,0xffaa55,0x68ffe1,0xa5ff72,0xcad0ff];
const mobile=()=>innerWidth<760||matchMedia('(pointer: coarse)').matches;

function makeLine(points,color,opacity=.3){
  const geo=new THREE.BufferGeometry().setFromPoints(points),mat=new THREE.LineBasicMaterial({color,transparent:true,opacity,depthWrite:false,depthTest:false,blending:THREE.NormalBlending});
  const line=new THREE.LineSegments(geo,mat);line.frustumCulled=false;line.renderOrder=8;return line;
}
function makeReticle(color){
  const r=.52,segments=[
    new THREE.Vector3(-r,0,0),new THREE.Vector3(-r*.42,0,0),new THREE.Vector3(r*.42,0,0),new THREE.Vector3(r,0,0),
    new THREE.Vector3(0,-r,0),new THREE.Vector3(0,-r*.42,0),new THREE.Vector3(0,r*.42,0),new THREE.Vector3(0,r,0)
  ];
  return makeLine(segments,color,.44);
}

waitFor().then(game=>{
  if(game.__threatReadabilityInstalled)return;game.__threatReadabilityInstalled=true;
  const root=new THREE.Group();root.name='threat-readability-guides';game.scene.add(root);
  const tracked=new Map();let styled=0;
  const area=()=>clamp((window.__pulseCampaign?.state?.selected||1)-1,0,4);

  function attach(enemy){
    if(!enemy||enemy.type!=='danger'||enemy.__readabilityGuide)return enemy;
    const color=enemy.__areaAttackSignature?AREA_COLORS[area()]:0xff667e;
    const guide=new THREE.Group();guide.name='threat-trajectory-guide';root.add(guide);
    const path=makeLine([new THREE.Vector3(),new THREE.Vector3()],color,.2),reticle=makeReticle(color);
    guide.add(path,reticle);enemy.__readabilityGuide={guide,path,reticle,color};tracked.set(enemy,enemy.__readabilityGuide);styled++;
    const baseDispose=enemy.dispose?.bind(enemy);
    enemy.dispose=()=>{detach(enemy);baseDispose?.();};
    return enemy;
  }
  function detach(enemy){
    const g=tracked.get(enemy);if(!g)return;
    tracked.delete(enemy);g.guide.remove(g.path,g.reticle);root.remove(g.guide);g.path.geometry.dispose();g.path.material.dispose();g.reticle.geometry.dispose();g.reticle.material.dispose();enemy.__readabilityGuide=null;
  }
  function updateGuide(enemy,g,t){
    if(enemy.dead||!enemy.group?.parent){detach(enemy);return;}
    const targetX=Number.isFinite(enemy.threatTargetX)?enemy.threatTargetX:game.world.avatar.position.x;
    const targetY=Number.isFinite(enemy.threatTargetY)?enemy.threatTargetY:game.world.avatar.position.y;
    const start=enemy.group.position,end=new THREE.Vector3(targetX,targetY,7.25);
    const a=g.path.geometry.attributes.position.array;a[0]=start.x;a[1]=start.y;a[2]=start.z;a[3]=end.x;a[4]=end.y;a[5]=end.z;g.path.geometry.attributes.position.needsUpdate=true;
    g.reticle.position.copy(end);g.reticle.rotation.z=t*.35;
    const spawnZ=enemy.threatSpawnZ??start.z,span=Math.max(.001,7.7-spawnZ),u=clamp((start.z-spawnZ)/span,0,1),pulse=Math.pow(Math.max(0,Math.cos(t*128/60*Math.PI*2)),8);
    const authored=!!enemy.__areaAttackSignature;
    g.path.material.opacity=clamp((authored?.18:.11)+u*.18+pulse*.04,.08,.42);
    g.reticle.material.opacity=clamp((authored?.46:.34)+u*.26+pulse*.12,.22,.8);
    g.reticle.scale.setScalar((mobile()?.88:1)*(1+u*.22+pulse*.08));
    if(authored){const c=AREA_COLORS[area()];g.path.material.color.setHex(c);g.reticle.material.color.setHex(c);}
  }

  const baseSpawn=game.spawnEnemy.bind(game);
  game.spawnEnemy=(type,pos,phase=0)=>{
    const before=game.enemies.length,result=baseSpawn(type,pos,phase),enemy=result||game.enemies[before]||game.enemies.at(-1);
    if(type==='danger')attach(enemy);return result||enemy;
  };
  for(const enemy of game.enemies)attach(enemy);

  const tick=()=>{
    if(game.running){for(const enemy of game.enemies)if(enemy.type==='danger'&&!enemy.__readabilityGuide)attach(enemy);}
    const t=game.time||0;for(const [enemy,g] of [...tracked])updateGuide(enemy,g,t);
    root.visible=game.running&&!window.__pulseOnboarding?.state?.active;requestAnimationFrame(tick);
  };requestAnimationFrame(tick);

  window.__pulseThreatReadability={
    attach,
    stats:()=>({active:tracked.size,styled,mobile:mobile(),authored:[...tracked.keys()].filter(e=>e.__areaAttackSignature).length})
  };
});
