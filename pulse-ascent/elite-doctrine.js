import * as THREE from 'three';
import {clamp,TAU} from './util.js';

const waitFor=getter=>new Promise(resolve=>{const tick=()=>{const value=getter();value?resolve(value):requestAnimationFrame(tick)};tick()});
const LESSONS={
  1:{role:'EMITTER',type:'sentinel',hp:8,color:0xff5f9f,callout:'ELITE // EMITTER ARRAY',hint:'BREAK EMITTERS // REDUCE BARRAGE'},
  2:{role:'GATE',type:'tank',hp:11,color:0x70f4ff,callout:'ELITE // GATE KEEPER',hint:'READ THE GAP // OWN THE LANE'},
  3:{role:'RESONATOR',type:'node',hp:9,color:0xb889ff,callout:'ELITE // RESONATOR',hint:'BREAK RESONANCE // SLOW PRESSURE'}
};

function decorateElite(game,enemy,lesson){
  enemy.__eliteDoctrine=true;enemy.eliteRole=lesson.role;enemy.hp=lesson.hp;enemy.score+=1100;enemy.speed=Math.min(enemy.speed,6.2);
  enemy.mesh.material.color.set(lesson.color);enemy.mesh.material.opacity=.96;enemy.halo.material.color.set(lesson.color);enemy.halo.material.opacity=.72;
  const rings=[];
  for(let i=0;i<3;i++){
    const ring=new THREE.Mesh(new THREE.TorusGeometry(1.42+i*.27,.025+i*.004,4,48),new THREE.MeshBasicMaterial({color:i===1?0xffffff:lesson.color,transparent:true,opacity:.18+i*.08,blending:THREE.AdditiveBlending,depthWrite:false}));
    ring.rotation.set(i*.7,.4+i*.9,i*.55);enemy.group.add(ring);rings.push(ring);
  }
  const crown=new THREE.Group();
  for(let i=0;i<6;i++){
    const pip=new THREE.Mesh(new THREE.OctahedronGeometry(.09,0),new THREE.MeshBasicMaterial({color:lesson.color,wireframe:true,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false}));
    crown.add(pip);
  }
  enemy.group.add(crown);
  const baseUpdate=enemy.update.bind(enemy);enemy.update=(dt,t)=>{
    if(enemy.dead)return baseUpdate(dt,t);baseUpdate(dt,t);if(enemy.dead)return;
    rings.forEach((r,i)=>{r.rotation.z+=dt*(.45+i*.25)*(i%2?-1:1);r.rotation.x+=dt*.11*(i+1);const beat=(t*128/60)%1;r.material.opacity=.14+i*.07+Math.pow(1-beat,7)*.2;});
    crown.children.forEach((p,i)=>{const a=t*(1.1+i*.035)+(i/6)*TAU,r=1.08+.12*Math.sin(t*2+i);p.position.set(Math.cos(a)*r,Math.sin(a)*r*.62,Math.sin(a*2)*.3);p.rotation.x+=dt*1.5;p.rotation.y+=dt*1.1;});
  };
  return enemy;
}

function spawnLessonThreats(game,director,enemy,lesson,beat){
  if(enemy.dead||!game.running||game.boss||window.__pulseExpansion?.state?.active)return;
  const a=game.world.avatar.position,phase=Math.max(2,game.section+1),z=-34;
  if(lesson.role==='EMITTER'){
    director.spawnThreat(game,{x:-6.2,y:a.y+.8,z,targetX:a.x,targetY:a.y+.08,phase,accent:0xff416d,tag:'elite-emitter'});
    director.spawnThreat(game,{x:6.2,y:a.y-.7,z:z-6,targetX:a.x,targetY:a.y-.08,phase,accent:0xff6b8d,tag:'elite-emitter'});
  }else if(lesson.role==='GATE'){
    const gap=beat%8<4?-1.9:1.9;
    [-3.6,0,3.6].forEach((x,i)=>director.spawnThreat(game,{x:x*1.5,y:a.y+(i-1)*1.15,z:z-i*4.5,targetX:a.x+(i===1?gap:-gap*.65),targetY:a.y+(i-1)*1.35,phase,accent:i===1?0xff315f:0xff7894,tag:'gate'}));
  }else{
    for(let i=0;i<3;i++){
      const angle=(i/3)*TAU+beat*.18,threat=director.spawnThreat(game,{x:Math.cos(angle)*6,y:a.y+Math.sin(angle)*2.6,z:z-i*5,targetX:a.x+(i===2?0:Math.cos(angle)*1.1),targetY:a.y+(i===2?0:Math.sin(angle)*.8),phase,accent:i===2?0xff315f:0xb96cff,tag:'elite-resonator'});
      if(threat)threat.speed*=.82;
    }
  }
  game.audio.dangerWarning?.();game.world.pulse?.(1.15);game.particles.burst(enemy.group.position.clone(),28,lesson.color,4.5,7);
}

async function init(){
  const game=await waitFor(()=>window.__pulseAscent),director=await waitFor(()=>window.__pulseDirector);
  if(game.__eliteDoctrineInstalled)return;game.__eliteDoctrineInstalled=true;
  const state={seen:new Set(),active:null,lastBeat:-99,cleared:[],spawned:0};

  const spawnElite=section=>{
    const lesson=LESSONS[section];if(!lesson||state.seen.has(section)||state.active||game.boss)return;
    state.seen.add(section);const before=new Set(game.enemies);game.spawnEnemy(lesson.type,new THREE.Vector3(0,1.1,-48),section+2);
    const enemy=[...game.enemies].reverse().find(e=>!before.has(e));if(!enemy)return;
    decorateElite(game,enemy,lesson);state.active={enemy,lesson,section};state.spawned++;
    game.showCallout(lesson.callout,.94);setTimeout(()=>{if(game.running&&!enemy.dead)game.showCallout(lesson.hint,.82)},900);game.audio.sectionStab?.(Math.min(4,section+1));game.world.pulse?.(1.5);
    const baseKill=enemy.kill.bind(enemy);enemy.kill=()=>{
      if(enemy.dead)return;baseKill();
      game.score+=1400+section*350;game.sync=clamp(game.sync+6,0,100);game.overdrive=clamp(game.overdrive+16,0,100);game.showCallout(`${lesson.role} DOCTRINE ACQUIRED`,1);game.haptic?.([10,8,22]);game.updateHud?.();
      state.cleared.push(lesson.role);state.active=null;
    };
  };

  const baseSpawnPattern=game.spawnPattern.bind(game);game.spawnPattern=bar=>{
    baseSpawnPattern(bar);
    if(!game.running||game.boss||window.__pulseExpansion?.state?.active)return;
    if(LESSONS[game.section]&&!state.seen.has(game.section)&&bar>=2&&bar%4===2)setTimeout(()=>spawnElite(game.section),160);
  };

  const baseRestart=game.restart.bind(game);game.restart=()=>{state.seen.clear();state.active=null;state.lastBeat=-99;state.cleared.length=0;state.spawned=0;baseRestart();};

  const tick=()=>{
    if(state.active&&state.active.enemy.dead)state.active=null;
    if(state.active&&game.running){
      const beat=Math.floor(game.time*128/60);
      if(beat!==state.lastBeat&&beat%4===0){state.lastBeat=beat;spawnLessonThreats(game,director,state.active.enemy,state.active.lesson,beat);}
    }
    requestAnimationFrame(tick);
  };tick();

  window.__pulseEliteDoctrine={state,stats:()=>({active:state.active?.lesson.role||'',cleared:[...state.cleared],spawned:state.spawned,seen:[...state.seen]})};
}

init();
