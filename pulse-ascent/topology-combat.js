import * as THREE from 'three';

const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=THREE.MathUtils.lerp;
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent&&window.__pulseTopologyWorlds?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});

waitFor().then(game=>{
  if(game.__topologyCombatInstalled)return;
  game.__topologyCombatInstalled=true;
  const topology=window.__pulseTopologyWorlds;
  let spawnSerial=0,resonance=0;

  const selectedArea=()=>clamp((window.__pulseCampaign?.state?.selected||1)-1,0,4);
  const activeWorld=()=>topology.worlds[selectedArea()];

  function nearestSegment(z,serial){
    const w=activeWorld();
    if(!w?.segments?.length)return null;
    const count=w.totalSegments||Math.floor(w.segments.length/2);
    let best=0,bestD=Infinity;
    const stride=Math.max(1,Math.floor(count/48));
    const offset=(serial*7)%stride;
    for(let s=offset;s<count;s+=stride){
      const a=w.segments[s*2],b=w.segments[s*2+1];
      const mz=(a.z+b.z)*.5,d=Math.abs(mz-z);
      if(d<bestD){bestD=d;best=s;}
    }
    const a=w.segments[best*2],b=w.segments[best*2+1];
    return {a,b,index:best};
  }

  function bindEnemy(enemy,requested){
    if(!enemy||enemy.type==='danger'||enemy.__topologyBound)return;
    enemy.__topologyBound=true;
    const area=selectedArea(),seg=nearestSegment(requested.z,spawnSerial++);
    if(!seg)return;
    const f=.18+((spawnSerial*0.381966)%1)*.64;
    const lane=new THREE.Vector3().lerpVectors(seg.a,seg.b,f);
    lane.x=clamp(lane.x,-8.2,8.2);lane.y=clamp(lane.y,-4.2,4.8);
    enemy.group.position.x=lane.x;enemy.group.position.y=lane.y;
    enemy.baseX=lane.x;enemy.baseY=lane.y;
    enemy.userTopology={area,segment:seg.index,phase:(spawnSerial%17)/17,origin:lane.clone()};

    const col=topology.profiles?.[area]?.colors?.[1]??0x78f5ff;
    game.particles.burst(new THREE.Vector3(lane.x,lane.y,requested.z),10,col,1.7,3.8);

    const baseUpdate=enemy.update.bind(enemy);
    enemy.update=(dt,t)=>{
      baseUpdate(dt,t);
      if(enemy.dead)return;
      const p=enemy.userTopology,age=enemy.age||0,phase=p.phase*TAU;
      if(p.area===0){
        // PCB traffic: short orthogonal lane changes on musical phrases.
        const cell=Math.floor((t*.72+p.phase*3)%4),targetX=p.origin.x+(cell===1?1.15:cell===3?-1.15:0);
        enemy.group.position.x=lerp(enemy.group.position.x,clamp(targetX,-8.4,8.4),dt*2.8);
      }else if(p.area===1){
        // Temple procession: enemies ride shallow architectural arches.
        enemy.group.position.y+=Math.sin(age*1.15+phase)*dt*.72;
        enemy.group.rotation.z=Math.sin(age*.7+phase)*.13;
      }else if(p.area===2){
        // Chroma currents: coherent ribbon drift rather than independent wobble.
        enemy.group.position.x+=Math.sin(age*.82+phase)*dt*1.05;
        enemy.group.position.y+=Math.cos(age*.61+phase*1.3)*dt*.72;
        enemy.group.rotation.z+=dt*.18;
      }else if(p.area===3){
        // Organic branching: periodic fork choices make formations split/rejoin.
        const fork=Math.sin(age*1.35+phase);
        enemy.group.position.x+=fork*dt*.88;
        enemy.group.position.y+=Math.sin(age*2.1+phase)*dt*.46;
      }else{
        // Cathedral columns: restrained vertical procession with mirrored sway.
        enemy.group.position.x+=Math.sin(age*.48+phase)*dt*.42;
        enemy.group.position.y+=Math.sin(age*.92+phase)*dt*.62;
        enemy.group.rotation.z=Math.sin(age*.4+phase)*.08;
      }
      const appear=clamp(age/.42,0,1);
      enemy.group.scale.setScalar(.68+appear*.32);
    };
  }

  const baseSpawn=game.spawnEnemy.bind(game);
  game.spawnEnemy=(type,pos,phase=0)=>{
    const before=game.enemies.length;
    baseSpawn(type,pos,phase);
    const enemy=game.enemies.length>before?game.enemies[game.enemies.length-1]:null;
    bindEnemy(enemy,pos);
    return enemy;
  };

  // Re-bind the opening wave that can exist before this module finishes installing.
  for(const e of game.enemies){if(!e.dead)bindEnemy(e,e.group.position.clone());}

  const baseDestroyed=game.onEnemyDestroyed.bind(game);
  game.onEnemyDestroyed=enemy=>{
    baseDestroyed(enemy);
    if(enemy?.userTopology){
      resonance=Math.min(1,resonance+.24);
      const w=activeWorld();
      if(w?.packetMat)w.packetMat.opacity=Math.min(.92,(w.packetMat.opacity||.4)+.16);
    }
  };

  const baseUpdate=game.world.update.bind(game.world);
  game.world.update=(dt,t,energy,sync=0)=>{
    baseUpdate(dt,t,energy,sync);
    resonance=lerp(resonance,0,1-Math.pow(.025,dt));
    const w=activeWorld();
    if(w?.root)w.root.scale.setScalar(1+resonance*.008);
    if(w?.mat)w.mat.opacity=clamp(w.mat.opacity+resonance*.018,.04,.2);
  };

  window.__pulseTopologyCombat={
    get area(){return selectedArea()+1;},
    get resonance(){return resonance;},
    stats:()=>({area:selectedArea()+1,bound:game.enemies.filter(e=>e.__topologyBound&&!e.dead).length,resonance})
  };
});
