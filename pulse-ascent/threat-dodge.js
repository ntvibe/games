import * as THREE from 'three';
import {clamp,lerp,rand,TAU} from './util.js';

const waitFor=(getter)=>new Promise(resolve=>{const tick=()=>{const v=getter();v?resolve(v):requestAnimationFrame(tick)};tick()});

function addDashUi(game,state){
  if(document.querySelector('#phaseDash'))return document.querySelector('#phaseDash');
  const button=document.createElement('button');
  button.id='phaseDash';button.className='phase-dash';button.type='button';button.setAttribute('aria-label','Phase dash');
  button.innerHTML='<small>PHASE · SHIFT</small><b>DASH</b><em>READY</em>';
  document.querySelector('#hud')?.appendChild(button);
  const style=document.createElement('style');style.textContent=`
    .phase-dash{--dash-ready:1;pointer-events:auto;position:absolute;right:max(16px,env(safe-area-inset-right));bottom:max(126px,calc(env(safe-area-inset-bottom) + 126px));width:70px;height:70px;padding:0;border:1px solid #67f0ff88;border-radius:50%;display:grid;place-content:center;gap:1px;text-align:center;color:#e9fdff;background:radial-gradient(circle at 50% 50%,#081827 0 57%,transparent 58%),conic-gradient(#5cf2ff calc(var(--dash-ready)*1turn),#18303b 0);box-shadow:0 0 18px #49e8ff1f,inset 0 0 16px #57eaff12;touch-action:none;z-index:2;transition:transform .1s ease,filter .1s ease,opacity .15s ease}
    .phase-dash small,.phase-dash em{font-size:5px;line-height:1;letter-spacing:.11em;font-style:normal;color:#6d9eaa}.phase-dash b{font-size:11px;line-height:1.05;letter-spacing:.1em}.phase-dash.ready{filter:drop-shadow(0 0 10px #5cf2ff66)}.phase-dash.active{transform:scale(1.13);filter:drop-shadow(0 0 18px #fff) drop-shadow(0 0 22px #5cf2ff)}.phase-dash.cooling{opacity:.58}.phase-dash:active{transform:scale(.94)}
    @media(max-width:650px){.phase-dash{width:64px;height:64px;right:max(12px,env(safe-area-inset-right));bottom:max(139px,calc(env(safe-area-inset-bottom) + 139px))}.phase-dash b{font-size:10px}.phase-dash small,.phase-dash em{font-size:4.5px}}
  `;document.head.appendChild(style);
  return button;
}

function dashStrength(state,t){
  if(t<state.start||t>=state.activeUntil)return 0;
  const elapsed=t-state.start,attack=.085;
  if(elapsed<attack)return clamp(elapsed/attack,0,1);
  return clamp(1-(elapsed-attack)/(state.duration-attack),0,1);
}

function patchThreat(game,enemy){
  if(!enemy||enemy.type!=='danger'||enemy.__spatialThreat)return enemy;
  enemy.__spatialThreat=true;
  enemy.threatSpawnZ=enemy.group.position.z;
  enemy.threatStartX=enemy.group.position.x;enemy.threatStartY=enemy.group.position.y;
  const avatar=game.world.avatar.position;
  enemy.threatTargetX=avatar.x+rand(-.42,.42);
  enemy.threatTargetY=avatar.y+rand(-.34,.34);
  enemy.threatImpactRadius=1.08;
  enemy.update=(dt,t)=>{
    if(enemy.dead)return;
    enemy.age+=dt;enemy.group.position.z+=enemy.speed*dt;
    const span=Math.max(.001,7.7-enemy.threatSpawnZ),u=clamp((enemy.group.position.z-enemy.threatSpawnZ)/span,0,1),steer=1-Math.pow(1-u,2.2);
    enemy.group.position.x=lerp(enemy.threatStartX,enemy.threatTargetX,steer);
    enemy.group.position.y=lerp(enemy.threatStartY,enemy.threatTargetY,steer);
    enemy.mesh.rotation.x+=dt*(1.05+enemy.phase*.1);enemy.mesh.rotation.y+=dt*1.7;
    enemy.halo.rotation.z+=dt*3.8;enemy.core.scale.setScalar(1+Math.sin(t*10+enemy.seed)*.34);
    const beat=t*128/60,phase=beat%1,pulse=Math.pow(Math.max(0,Math.cos(phase*TAU)),7);
    enemy.mesh.scale.setScalar(.9+pulse*.16+u*.16);
    if(enemy.warning){enemy.warning.scale.setScalar(1+phase*1.35+u*.55);enemy.warning.material.opacity=.24+(1-phase)*.45+u*.18;}
    if(enemy.threatTrail)enemy.threatTrail.material.opacity=.24+u*.5;
    if(enemy.threatCage){enemy.threatCage.rotation.z+=dt*(2.1+u*3);enemy.threatCage.material.opacity=.18+u*.3;}
    if(enemy.threatBrackets){enemy.threatBrackets.rotation.z-=dt*(.7+u*1.4);enemy.threatBrackets.scale.setScalar(.9+u*.28);}
    enemy.halo.material.opacity=enemy.locked?.92:.42+u*.28;
    if(enemy.group.position.z>7.7){game.resolveThreatImpact?.(enemy);enemy.dead=true;enemy.dispose();}
  };
  return enemy;
}

async function init(){
  const game=await waitFor(()=>window.__pulseAscent),pilot=await waitFor(()=>window.__pulsePilot),expansion=await waitFor(()=>window.__pulseExpansion);
  if(game.__threatDodgeInstalled)return;game.__threatDodgeInstalled=true;
  const state={duration:.56,cooldown:1.9,start:-99,activeUntil:-99,lastAt:-99,quality:0,vector:new THREE.Vector2(1,0),dodges:0,perfectDodges:0,nearMisses:0,lastSide:1};
  const button=addDashUi(game,state),status=button.querySelector('em');

  const triggerDash=()=>{
    if(!game.running)return false;const t=game.time||0,remaining=state.cooldown-(t-state.lastAt);if(remaining>0)return false;
    let x=game.pointer.x,y=game.pointer.y*.72;if(Math.hypot(x,y)<.24){state.lastSide*=-1;x=state.lastSide;y=0;}
    const len=Math.max(.001,Math.hypot(x,y));state.vector.set(x/len,y/len);state.lastAt=t;state.start=t;state.activeUntil=t+state.duration;state.quality=game.audio.timingQuality?.()??.5;
    game.world.triggerDisintegrate?.(.32);game.particles.burst(game.world.avatar.position.clone(),72,state.quality>.86?0xffffff:0x63efff,8,12);game.haptic?.([7,7,16]);
    if(state.quality>.86){game.audio.syncNote?.(state.quality);game.showCallout('PHASE DASH // ON GRID',1);}else game.showCallout('PHASE DASH',.72);
    return true;
  };

  button.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();triggerDash()});
  addEventListener('keydown',e=>{if((e.code==='ShiftLeft'||e.code==='ShiftRight')&&!e.repeat){e.preventDefault();triggerDash()}},{passive:false});

  game.resolveThreatImpact=(enemy)=>{
    const t=game.time||0,strength=dashStrength(state,t),avatar=game.world.avatar.position;
    const effectiveX=avatar.x+state.vector.x*2.65*strength,effectiveY=avatar.y+state.vector.y*1.75*strength;
    const dist=Math.hypot(enemy.group.position.x-effectiveX,enemy.group.position.y-effectiveY),evaded=dist>enemy.threatImpactRadius;
    if(!evaded){game.takeHit(enemy);return false;}
    const phased=strength>.18,perfect=phased&&state.quality>.86;
    state.dodges++;if(perfect)state.perfectDodges++;if(!phased)state.nearMisses++;
    game.score+=perfect?950:phased?620:360;game.sync=clamp(game.sync+(perfect?8:phased?5:2.5),0,100);game.overdrive=clamp(game.overdrive+(perfect?11:phased?7:4),0,100);game.lastHitAt=game.time;
    game.particles.burst(enemy.group.position.clone(),perfect?110:72,perfect?0xffffff:0x61efff,perfect?11:8,15);game.world.triggerDisintegrate?.(phased?.2:.1);game.haptic?.(perfect?[7,7,20]:[6,8,12]);
    game.showCallout(perfect?'PERFECT PHASE':phased?'PHASE EVADE':'NEAR MISS',perfect?1:.82);game.updateHud();return true;
  };

  const baseSpawn=game.spawnEnemy.bind(game);
  game.spawnEnemy=(type,pos,phase=0)=>{const enemy=baseSpawn(type,pos,phase);if(enemy?.type==='danger')patchThreat(game,enemy);else if(type==='danger'){const found=[...game.enemies].reverse().find(e=>e.type==='danger'&&!e.__spatialThreat);if(found)patchThreat(game,found);}return enemy;};
  for(const enemy of game.enemies)patchThreat(game,enemy);

  const system=expansion.system,baseUpdate=system.update.bind(system);
  system.update=(dt,t)=>{
    baseUpdate(dt,t);const strength=dashStrength(state,t);
    if(strength>0){game.world.avatar.position.x+=state.vector.x*2.15*strength;game.world.avatar.position.y+=state.vector.y*1.25*strength;pilot.rig.root.rotation.z=lerp(pilot.rig.root.rotation.z,-state.vector.x*.42*strength,dt*18);pilot.rig.root.rotation.x=lerp(pilot.rig.root.rotation.x,state.vector.y*.22*strength,dt*18);pilot.rig.halo.scale.setScalar(1+strength*.48);pilot.rig.halo2.scale.setScalar(1+strength*.7);}
    const elapsed=(game.time||0)-state.lastAt,ready=clamp(elapsed/state.cooldown,0,1);button.style.setProperty('--dash-ready',String(ready));button.classList.toggle('ready',ready>=1);button.classList.toggle('cooling',ready<1&&strength<=0);button.classList.toggle('active',strength>0);status.textContent=strength>0?'PHASING':ready>=1?'READY':`${Math.max(0,state.cooldown-elapsed).toFixed(1)}S`;
  };

  const oldLede=document.querySelector('.lede');if(oldLede)oldLede.textContent='Paint targets, release on beat, switch weapons, and PHASE DASH through aimed red attacks. LANCE or SWARM can intercept threats; movement can evade them.';
  window.__pulseDodge={state,triggerDash,patchThreat,stats:()=>({dodges:state.dodges,perfectDodges:state.perfectDodges,nearMisses:state.nearMisses,ready:(game.time||0)-state.lastAt>=state.cooldown,active:(game.time||0)<state.activeUntil})};
}

init();
