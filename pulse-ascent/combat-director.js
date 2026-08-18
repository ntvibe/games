import * as THREE from 'three';
import {clamp,TAU} from './util.js';

const waitFor=(getter)=>new Promise(resolve=>{const tick=()=>{const value=getter();value?resolve(value):requestAnimationFrame(tick)};tick()});

function addTelegraph(game,enemy,targetX,targetY,accent=0xff416d){
  const start=enemy.group.position.clone();
  const end=new THREE.Vector3(targetX,targetY,7.55);
  const geo=new THREE.BufferGeometry().setFromPoints([start,end]);
  const mat=new THREE.LineBasicMaterial({color:accent,transparent:true,opacity:.18,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:false});
  const line=new THREE.Line(geo,mat);line.renderOrder=4;game.scene.add(line);
  const marker=new THREE.Mesh(new THREE.RingGeometry(.24,.29,12),new THREE.MeshBasicMaterial({color:accent,transparent:true,opacity:.34,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:false}));
  marker.position.copy(end);marker.rotation.x=Math.PI/2;marker.renderOrder=4;game.scene.add(marker);

  const baseUpdate=enemy.update.bind(enemy),baseDispose=enemy.dispose.bind(enemy);
  enemy.update=(dt,t)=>{
    if(enemy.dead)return baseUpdate(dt,t);
    baseUpdate(dt,t);
    if(enemy.dead)return;
    const u=clamp((enemy.group.position.z-(enemy.threatSpawnZ??start.z))/Math.max(.001,7.7-(enemy.threatSpawnZ??start.z)),0,1);
    const pulse=.5+.5*Math.sin(t*128/60*TAU);
    mat.opacity=.08+(1-u)*.16+pulse*.08;
    marker.material.opacity=.18+(1-u)*.22+pulse*.12;
    marker.scale.setScalar(.82+u*.9+pulse*.12);
    marker.rotation.z+=dt*(1.4+u*2.4);
  };
  enemy.dispose=()=>{
    game.scene.remove(line,marker);geo.dispose();mat.dispose();marker.geometry.dispose();marker.material.dispose();baseDispose();
  };
  enemy.__directorTelegraph={line,marker};
}

function spawnThreat(game,{x=0,y=0,z=-34,targetX,targetY,phase=1,accent=0xff416d,tag='aimed'}={}){
  const before=new Set(game.enemies);
  game.spawnEnemy('danger',new THREE.Vector3(x,y,z),phase);
  const enemy=[...game.enemies].reverse().find(e=>e.type==='danger'&&!before.has(e));
  if(!enemy)return null;
  const avatar=game.world.avatar.position;
  enemy.threatTargetX=targetX??avatar.x;
  enemy.threatTargetY=targetY??avatar.y;
  enemy.threatImpactRadius=tag==='gate'?.92:1.04;
  enemy.directorTag=tag;
  enemy.mesh?.material?.color?.set(accent);
  if(enemy.warning?.material?.color)enemy.warning.material.color.set(accent);
  addTelegraph(game,enemy,enemy.threatTargetX,enemy.threatTargetY,accent);
  return enemy;
}

async function init(){
  const game=await waitFor(()=>window.__pulseAscent),dodge=await waitFor(()=>window.__pulseDodge);
  if(game.__combatDirectorInstalled)return;game.__combatDirectorInstalled=true;
  const state={sequences:0,lastBar:-99,lastPattern:'',spawned:0};

  const sideCut=(bar)=>{
    const a=game.world.avatar.position,phase=Math.max(1,game.section+1),depth=-34;
    spawnThreat(game,{x:-6.5,y:a.y+.45,z:depth,targetX:a.x,targetY:a.y+.12,phase,accent:0xff416d,tag:'sidecut'});
    spawnThreat(game,{x:6.5,y:a.y-.35,z:depth-7,targetX:a.x,targetY:a.y-.08,phase,accent:0xff5b7a,tag:'sidecut'});
    state.spawned+=2;game.audio.dangerWarning?.();game.showCallout('CROSSFIRE // PHASE WINDOW',.74);state.lastPattern='CROSSFIRE';
  };

  const pulseGate=(bar)=>{
    const a=game.world.avatar.position,phase=Math.max(1,game.section+1),gap=(bar%2?1:-1)*1.7;
    const lanes=[-3.4,0,3.4];
    lanes.forEach((lane,i)=>{
      const isAimed=i===1;
      spawnThreat(game,{x:lane*1.65,y:a.y+(i-1)*1.1,z:-36-i*5.5,targetX:isAimed?a.x:a.x+gap*(i===0?-1:1),targetY:isAimed?a.y:a.y+(i===0?1.8:-1.8),phase,accent:isAimed?0xff315f:0xff6f8c,tag:'gate'});
    });
    state.spawned+=3;game.audio.dangerWarning?.();game.showCallout('PULSE GATE // READ THE LANE',.78);state.lastPattern='PULSE GATE';
  };

  const spiralPin=(bar)=>{
    const a=game.world.avatar.position,phase=Math.max(1,game.section+1),count=game.section>=3?4:3;
    for(let i=0;i<count;i++){
      const angle=(i/count)*TAU+(bar%4)*.34,r=6.2;
      spawnThreat(game,{x:Math.cos(angle)*r,y:a.y+Math.sin(angle)*2.8,z:-38-i*5,targetX:a.x+(i===count-1?0:Math.cos(angle)*1.25),targetY:a.y+(i===count-1?0:Math.sin(angle)*.9),phase,accent:i===count-1?0xff315f:0xff597d,tag:'spiral'});
    }
    state.spawned+=count;game.audio.dangerWarning?.();game.showCallout('SPIRAL PIN // BREAK VECTOR',.8);state.lastPattern='SPIRAL PIN';
  };

  const patterns=[sideCut,pulseGate,spiralPin];
  const baseSpawnPattern=game.spawnPattern.bind(game);
  game.spawnPattern=(bar)=>{
    baseSpawnPattern(bar);
    if(!game.running||game.boss||window.__pulseExpansion?.state?.active)return;
    if(game.section<1)return;
    const cadence=game.section>=3?2:3;
    if(bar<2||bar%cadence!==1||state.lastBar===bar)return;
    state.lastBar=bar;state.sequences++;
    const pick=patterns[(bar+game.section*2+state.sequences)%patterns.length];
    setTimeout(()=>{if(game.running&&!game.boss&&!window.__pulseExpansion?.state?.active)pick(bar)},110);
  };

  // Keep the player silhouette from competing with the warning read: during a live
  // choreographed attack, suppress decorative halo energy rather than shrinking targets.
  const tick=()=>{
    const active=game.enemies.some(e=>!e.dead&&e.type==='danger'&&e.directorTag);
    const rig=game.world.humanRig;
    if(rig){
      if(rig.halo?.material)rig.halo.material.opacity=Math.min(rig.halo.material.opacity,active?.075:.16);
      if(rig.halo2?.material)rig.halo2.material.opacity=Math.min(rig.halo2.material.opacity,active?.05:.13);
    }
    requestAnimationFrame(tick);
  };tick();

  window.__pulseDirector={state,spawnThreat,patterns,stats:()=>({sequences:state.sequences,lastPattern:state.lastPattern,spawned:state.spawned,activeThreats:game.enemies.filter(e=>!e.dead&&e.type==='danger'&&e.directorTag).length,dodgeReady:dodge.stats().ready})};
}

init();
