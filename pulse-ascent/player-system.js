import * as THREE from 'three';
import {SETTINGS,clamp,lerp,rand,TAU} from './util.js';

const BASE_WORLD_SPEED=17;
const SPEEDS=[1,1.25,1.5,1.8];
const WEAPONS=[
  {id:'lock',name:'LOCK//8',cap:8,damage:1,spacing:.5,threats:false,color:0x72f5ff,description:'8X RHYTHM LOCK'},
  {id:'lance',name:'LANCE',cap:1,damage:3,spacing:.12,threats:true,color:0xff72dc,description:'HEAVY / THREAT INTERCEPT'},
  {id:'swarm',name:'SWARM',cap:6,damage:1,spacing:.3,threats:true,color:0xb18aff,description:'6X LOCK / CHAIN ARC'}
];

const waitFor=(getter)=>new Promise(resolve=>{
  const tick=()=>{const value=getter();value?resolve(value):requestAnimationFrame(tick)};
  tick();
});

function wire(geometry,color=0x75efff,opacity=.72){
  return new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color,wireframe:true,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false}));
}

function limb(length,radius,color){
  const group=new THREE.Group();
  const shaft=wire(new THREE.CylinderGeometry(radius,radius*.82,length,6,2,true),color,.72);shaft.position.y=-length*.5;group.add(shaft);
  const joint=wire(new THREE.IcosahedronGeometry(radius*1.18,0),color,.82);joint.position.y=-length;group.add(joint);
  group.userData.shaft=shaft;group.userData.joint=joint;group.userData.length=length;
  return group;
}

function addHand(parent,y,color){
  const hand=wire(new THREE.IcosahedronGeometry(.105,0),color,.88);hand.position.y=y;parent.add(hand);return hand;
}

function addFoot(parent,y,side,color){
  const foot=wire(new THREE.BoxGeometry(.2,.12,.38),color,.7);foot.position.set(side*.03,y,-.09);parent.add(foot);return foot;
}

function buildHumanoid(game){
  const world=game.world,avatar=world.avatar;
  if(world.humanRig)return world.humanRig;

  if(world.avatarBody)world.avatarBody.visible=false;
  if(world.avatarCore)world.avatarCore.visible=false;
  for(const r of world.avatarRings||[])r.visible=false;
  for(const p of world.avatarPetals||[])p.visible=false;

  const root=new THREE.Group();root.position.y=.68;root.scale.setScalar(.94);avatar.add(root);
  const cyan=0x6ff4ff,pink=0xff65d8,white=0xeaffff;
  const meshes=[];
  const register=(m)=>{meshes.push(m);m.userData.baseOpacity=m.material.opacity;return m};

  const pelvis=register(wire(new THREE.CylinderGeometry(.31,.39,.34,4,1,true),pink,.64));pelvis.position.y=-.24;pelvis.rotation.y=Math.PI/4;root.add(pelvis);
  const torso=register(wire(new THREE.CylinderGeometry(.28,.48,.98,4,3,true),cyan,.78));torso.position.y=.43;torso.rotation.y=Math.PI/4;root.add(torso);
  const chest=register(wire(new THREE.OctahedronGeometry(.29,0),white,.58));chest.position.set(0,.63,.08);chest.scale.set(1.3,.76,.58);root.add(chest);
  const neck=register(wire(new THREE.CylinderGeometry(.09,.105,.22,6,1,true),cyan,.7));neck.position.y=1.02;root.add(neck);
  const headPivot=new THREE.Group();headPivot.position.y=1.31;root.add(headPivot);
  const head=register(wire(new THREE.IcosahedronGeometry(.285,1),white,.86));head.scale.set(.82,1.08,.82);headPivot.add(head);
  const face=register(wire(new THREE.RingGeometry(.105,.125,10),pink,.82));face.position.z=.245;headPivot.add(face);
  const core=new THREE.Mesh(new THREE.IcosahedronGeometry(.08,0),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.95,blending:THREE.AdditiveBlending,depthWrite:false}));core.position.set(0,.55,.25);root.add(core);

  const shoulderBar=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.52,.78,0),new THREE.Vector3(.52,.78,0)]),new THREE.LineBasicMaterial({color:0x8ef8ff,transparent:true,opacity:.55,blending:THREE.AdditiveBlending,depthWrite:false}));root.add(shoulderBar);
  const spine=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,-.25,.02),new THREE.Vector3(0,1.06,.02)]),new THREE.LineBasicMaterial({color:0xff70dc,transparent:true,opacity:.48,blending:THREE.AdditiveBlending,depthWrite:false}));root.add(spine);

  const shoulderL=new THREE.Group(),shoulderR=new THREE.Group();shoulderL.position.set(-.49,.77,0);shoulderR.position.set(.49,.77,0);root.add(shoulderL,shoulderR);
  const upperL=limb(.57,.075,cyan),upperR=limb(.57,.075,cyan);shoulderL.add(upperL);shoulderR.add(upperR);
  const elbowL=new THREE.Group(),elbowR=new THREE.Group();elbowL.position.y=-.57;elbowR.position.y=-.57;shoulderL.add(elbowL);shoulderR.add(elbowR);
  const foreL=limb(.55,.062,pink),foreR=limb(.55,.062,pink);elbowL.add(foreL);elbowR.add(foreR);addHand(elbowL,-.55,white);addHand(elbowR,-.55,white);

  const hipL=new THREE.Group(),hipR=new THREE.Group();hipL.position.set(-.23,-.38,0);hipR.position.set(.23,-.38,0);root.add(hipL,hipR);
  const thighL=limb(.72,.09,cyan),thighR=limb(.72,.09,cyan);hipL.add(thighL);hipR.add(thighR);
  const kneeL=new THREE.Group(),kneeR=new THREE.Group();kneeL.position.y=-.72;kneeR.position.y=-.72;hipL.add(kneeL);hipR.add(kneeR);
  const shinL=limb(.68,.068,pink),shinR=limb(.68,.068,pink);kneeL.add(shinL);kneeR.add(shinR);addFoot(kneeL,-.7,-1,white);addFoot(kneeR,-.7,1,white);

  for(const part of [upperL,upperR,foreL,foreR,thighL,thighR,shinL,shinR]){
    register(part.userData.shaft);register(part.userData.joint);
  }

  const halo=register(wire(new THREE.TorusGeometry(.78,.015,4,56),cyan,.2));halo.position.y=.36;halo.rotation.x=Math.PI/2;root.add(halo);
  const halo2=register(wire(new THREE.TorusGeometry(.92,.011,4,64),pink,.15));halo2.position.y=.38;halo2.rotation.set(Math.PI/2,.5,0);root.add(halo2);

  const count=240,base=new Float32Array(count*3),dirs=new Float32Array(count*3),pos=new Float32Array(count*3);
  const put=(i,x,y,z)=>{const j=i*3;base[j]=x;base[j+1]=y;base[j+2]=z;pos[j]=x;pos[j+1]=y;pos[j+2]=z;const d=new THREE.Vector3(x,y-.15,z).normalize();dirs[j]=d.x+rand(-.35,.35);dirs[j+1]=d.y+rand(-.25,.4);dirs[j+2]=d.z+rand(-.5,.5)};
  for(let i=0;i<count;i++){
    const r=Math.random();
    if(r<.34){const y=rand(-.2,.95),w=lerp(.29,.48,clamp((.95-y)/1.15,0,1));put(i,rand(-w,w),y,rand(-.2,.2));}
    else if(r<.46){const a=rand(0,TAU),b=rand(-1,1),rr=.27;put(i,Math.cos(a)*rr*Math.sqrt(1-b*b),1.31+b*rr,Math.sin(a)*rr*Math.sqrt(1-b*b));}
    else if(r<.68){const side=Math.random()<.5?-1:1,y=rand(-.35,.76),x=side*(.49+(.76-y)*.15);put(i,x+rand(-.09,.09),y,rand(-.1,.1));}
    else{const side=Math.random()<.5?-1:1,y=rand(-1.75,-.38),x=side*(.23+Math.sin((y+.38)*2)*.05);put(i,x+rand(-.1,.1),y,rand(-.1,.1));}
  }
  const particleGeo=new THREE.BufferGeometry();particleGeo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const fragments=new THREE.Points(particleGeo,new THREE.PointsMaterial({color:0x88f7ff,size:.045,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,sizeAttenuation:true}));root.add(fragments);

  const rig={root,meshes,core,headPivot,torso,pelvis,shoulderL,shoulderR,elbowL,elbowR,hipL,hipR,kneeL,kneeR,halo,halo2,fragments,fragmentBase:base,fragmentDirs:dirs,disruptStart:-10,disruptUntil:-10};
  world.humanRig=rig;
  world.triggerDisintegrate=(duration=.9)=>{rig.disruptStart=game.time;rig.disruptUntil=Math.max(rig.disruptUntil,game.time+duration)};
  return rig;
}

function animateHumanoid(game,rig,dt,t,speedMult){
  const sync=game.sync/100,energy=game.audio.energy,free=window.__pulseExpansion?.state?.active;
  const cycle=t*(1.55+speedMult*.48+energy*.32),stride=Math.sin(cycle),counter=Math.sin(cycle+Math.PI);
  rig.root.rotation.y=game.pointer.x*.12+Math.sin(t*.45)*.04;
  rig.root.rotation.z=-game.pointer.x*.025+Math.sin(t*.73)*.018;
  rig.torso.rotation.z=Math.sin(cycle*.5)*.025;rig.pelvis.rotation.z=-Math.sin(cycle*.5)*.04;
  rig.headPivot.rotation.y=lerp(rig.headPivot.rotation.y,-game.pointer.x*.34,dt*5);rig.headPivot.rotation.x=lerp(rig.headPivot.rotation.x,game.pointer.y*.14,dt*5);
  const armSpread=free?.65:.16,legSpread=free?.14:.055;
  rig.shoulderL.rotation.z=lerp(rig.shoulderL.rotation.z,armSpread,dt*4);rig.shoulderR.rotation.z=lerp(rig.shoulderR.rotation.z,-armSpread,dt*4);
  rig.shoulderL.rotation.x=stride*(free?.18:.48);rig.shoulderR.rotation.x=counter*(free?.18:.48);
  rig.elbowL.rotation.x=.22+Math.max(0,-stride)*.5;rig.elbowR.rotation.x=.22+Math.max(0,-counter)*.5;
  rig.elbowL.rotation.z=-.08;rig.elbowR.rotation.z=.08;
  rig.hipL.rotation.z=legSpread;rig.hipR.rotation.z=-legSpread;rig.hipL.rotation.x=counter*(free?.1:.36);rig.hipR.rotation.x=stride*(free?.1:.36);
  rig.kneeL.rotation.x=Math.max(0,stride)*.55;rig.kneeR.rotation.x=Math.max(0,counter)*.55;
  rig.core.scale.setScalar(1+Math.sin(t*8)*.15+sync*.2);rig.core.material.opacity=.72+sync*.25;
  rig.halo.rotation.z+=dt*(.25+sync*.7);rig.halo2.rotation.z-=dt*(.19+energy*.55);

  const autoPhase=t%8.4,auto=autoPhase>6.85?Math.sin(clamp((autoPhase-6.85)/1.35,0,1)*Math.PI):0;
  const manual=t<rig.disruptUntil?Math.sin(clamp((t-rig.disruptStart)/Math.max(.001,rig.disruptUntil-rig.disruptStart),0,1)*Math.PI):0;
  const amount=Math.max(auto,manual);
  const arr=rig.fragments.geometry.attributes.position.array,b=rig.fragmentBase,d=rig.fragmentDirs;
  for(let i=0;i<arr.length;i+=3){const wob=Math.sin(t*7+i*.17)*amount*.06;arr[i]=b[i]+d[i]*amount*(.5+((i/3)%7)*.055)+wob;arr[i+1]=b[i+1]+d[i+1]*amount*(.65+((i/3)%5)*.05);arr[i+2]=b[i+2]+d[i+2]*amount*.9-wob;}
  rig.fragments.geometry.attributes.position.needsUpdate=true;rig.fragments.material.opacity=amount*.88;rig.fragments.material.size=.04+amount*.045;
  for(let i=0;i<rig.meshes.length;i++){const m=rig.meshes[i],flick=amount>.48&&((Math.floor(t*30)+i*3)%11===0)?.2:1;m.material.opacity=m.userData.baseOpacity*(1-amount*.62)*flick;}
  rig.root.scale.setScalar(.94+amount*.035+sync*.025);
}

function installThreatVisual(enemy){
  if(!enemy||enemy.type!=='danger'||enemy.__threatStyled)return;enemy.__threatStyled=true;
  enemy.mesh.geometry.dispose();enemy.mesh.geometry=new THREE.TorusGeometry(.34,.052,5,18);enemy.mesh.material.color.set(0xff315f);enemy.mesh.material.opacity=.95;
  enemy.mesh.rotation.set(0,0,0);
  if(enemy.warning){enemy.warning.geometry.dispose();enemy.warning.geometry=new THREE.RingGeometry(.58,.66,8);enemy.warning.material.color.set(0xff315f);enemy.warning.rotation.set(0,0,Math.PI/8);enemy.warning.material.depthTest=false;}
  const trailGeo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,-.2),new THREE.Vector3(0,0,-4.2)]),trailMat=new THREE.LineBasicMaterial({color:0xff315f,transparent:true,opacity:.42,blending:THREE.AdditiveBlending,depthWrite:false}),trail=new THREE.Line(trailGeo,trailMat);enemy.group.add(trail);enemy.threatTrail=trail;
  const brackets=new THREE.Group();
  for(let i=0;i<4;i++){const b=wire(new THREE.BoxGeometry(.24,.035,.035),0xff6b83,.72);b.position.set(Math.cos(i*TAU/4)*.78,Math.sin(i*TAU/4)*.78,0);b.rotation.z=i*TAU/4;brackets.add(b);}
  enemy.group.add(brackets);enemy.threatBrackets=brackets;
  const cage=wire(new THREE.OctahedronGeometry(.72,0),0xff315f,.24);cage.scale.z=.35;enemy.group.add(cage);enemy.threatCage=cage;
}

function createControls(game,state){
  const wrap=document.createElement('div');wrap.id='pilotControls';wrap.className='pilot-controls';wrap.innerHTML=`<button id="weaponCycle" type="button"><small>WEAPON · Q</small><b>${WEAPONS[state.weapon].name}</b><em>${WEAPONS[state.weapon].description}</em></button><button id="speedCycle" type="button"><small>VECTOR SPEED · R</small><b>×${SPEEDS[state.speed].toFixed(2)}</b><em>WORLD FLOW</em></button><div class="threat-key"><i></i><span>RED RING = INCOMING ATTACK<br><b>LANCE / SWARM CAN INTERCEPT</b></span></div>`;
  document.querySelector('#hud')?.appendChild(wrap);
  const style=document.createElement('style');style.textContent=`.pilot-controls{position:absolute;left:max(16px,env(safe-area-inset-left));bottom:max(82px,calc(env(safe-area-inset-bottom) + 82px));display:flex;gap:6px;align-items:flex-end;pointer-events:auto;text-shadow:none}.pilot-controls button{width:118px;min-height:48px;padding:7px 8px;border:1px solid #63e7ff55;background:#020a13c9;color:#e9fdff;text-align:left;clip-path:polygon(0 0,92% 0,100% 20%,100% 100%,0 100%)}.pilot-controls button:active{transform:scale(.96)}.pilot-controls small,.pilot-controls em{display:block;font-size:6px;letter-spacing:.12em;color:#6598a8;font-style:normal}.pilot-controls b{display:block;font-size:11px;letter-spacing:.08em;margin:2px 0;color:#fff}.threat-key{display:flex;gap:6px;align-items:center;padding:6px 7px;border-left:1px solid #ff436a55;background:#12020a80;font-size:6px;line-height:1.35;letter-spacing:.08em;color:#bd7181;pointer-events:none}.threat-key i{width:9px;height:9px;border:2px solid #ff315f;border-radius:50%;box-shadow:0 0 10px #ff315f}.threat-key b{font-size:6px;color:#ff8ca4;margin:0}@media(max-width:650px){.pilot-controls{bottom:max(88px,calc(env(safe-area-inset-bottom) + 88px));gap:4px}.pilot-controls button{width:92px;min-height:43px;padding:6px}.pilot-controls small,.pilot-controls em{font-size:5px}.pilot-controls b{font-size:9px}.threat-key{position:absolute;left:0;bottom:49px;width:188px;font-size:5px;opacity:.88}.threat-key b{font-size:5px}}`;
  document.head.appendChild(style);
  return wrap;
}

async function init(){
  const game=await waitFor(()=>window.__pulseAscent),expansion=await waitFor(()=>window.__pulseExpansion);
  if(game.__playerSystemInstalled)return;game.__playerSystemInstalled=true;
  const state={weapon:0,speed:1,lastSpeed:SPEEDS[1],threatTutorial:false};game.playerLoadout=state;
  const rig=buildHumanoid(game);const controls=createControls(game,state),weaponBtn=controls.querySelector('#weaponCycle'),speedBtn=controls.querySelector('#speedCycle'),lockDen=document.querySelector('.lock-ring small');

  const refreshWeapon=()=>{
    const cfg=WEAPONS[state.weapon];weaponBtn.querySelector('b').textContent=cfg.name;weaponBtn.querySelector('em').textContent=cfg.description;if(lockDen)lockDen.textContent=`/${cfg.cap}`;
    const wg=expansion.system.weaponGroup;if(wg){wg.position.set(0,.35,-.42);wg.scale.setScalar(cfg.id==='lance'?1.13:cfg.id==='swarm'?.92:1);wg.traverse(o=>{if(o.material?.emissive){o.material.emissive.set(cfg.color);o.material.emissiveIntensity=cfg.id==='lance'?.62:.38;}if(o.material?.color&&o.type==='LineSegments')o.material.color.set(cfg.color);});}
    game.clearLocks();game.showCallout(`${cfg.name} // ${cfg.description}`,1);game.world.triggerDisintegrate?.(.55);
  };
  const cycleWeapon=()=>{state.weapon=(state.weapon+1)%WEAPONS.length;refreshWeapon()};
  const setSpeed=(index,announce=true)=>{
    const previous=SPEEDS[state.speed]||1;state.speed=(index+SPEEDS.length)%SPEEDS.length;const next=SPEEDS[state.speed],ratio=next/previous;state.lastSpeed=next;SETTINGS.worldSpeed=BASE_WORLD_SPEED*next;
    for(const e of game.enemies){if(Number.isFinite(e.speed))e.speed*=e.type==='danger'?Math.sqrt(ratio):ratio;}
    speedBtn.querySelector('b').textContent=`×${next.toFixed(2)}`;document.documentElement.style.setProperty('--vector-speed',String(next));if(announce){game.showCallout(`VECTOR SPEED // ×${next.toFixed(2)}`,1);game.world.triggerDisintegrate?.(.7);game.particles.burst(game.world.avatar.position.clone(),100,0x72f5ff,7+next*2,10);}
  };
  const cycleSpeed=()=>setSpeed(state.speed+1,true);
  weaponBtn.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();cycleWeapon()});speedBtn.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();cycleSpeed()});
  addEventListener('keydown',e=>{if(e.repeat)return;if(e.code==='KeyQ'){e.preventDefault();cycleWeapon()}if(e.code==='KeyR'){e.preventDefault();cycleSpeed()}},{passive:false});
  setSpeed(state.speed,false);refreshWeapon();

  const baseGetTargetList=game.getTargetList.bind(game);
  game.getTargetList=()=>{const list=baseGetTargetList(),cfg=WEAPONS[state.weapon];if(cfg.threats){for(const e of game.enemies)if(!e.dead&&e.type==='danger')list.push(e);}return list;};

  game.tryLock=(force=false)=>{
    const cfg=WEAPONS[state.weapon];if(!game.pointer.down||game.targetsLocked.length>=cfg.cap)return;const temp=new THREE.Vector3(),candidates=[],assist=.14+(force?.035:0)+(game.sync/100)*.018+(cfg.id==='lance'?.028:0);
    for(const t of game.getTargetList()){if(t.dead||t.locked||t.part?.locked)continue;game.targetPosition(t,temp);temp.project(game.camera);if(temp.z<-1||temp.z>1)continue;const dx=(temp.x-game.pointer.x)*(innerWidth/innerHeight),dy=temp.y-game.pointer.y,d=Math.hypot(dx,dy);if(d<assist)candidates.push([d,t]);}
    candidates.sort((a,b)=>a[0]-b[0]);for(const [,t] of candidates){if(game.targetsLocked.length>=cfg.cap)break;if(t.bossPart)t.part.locked=true;else t.locked=true;game.targetsLocked.push(t);game.audio.lockNote(game.targetsLocked.length-1);game.haptic(t.type==='danger'?12:7);game.particles.burst(game.targetPosition(t,new THREE.Vector3()),t.type==='danger'?18:10,t.type==='danger'?0xff315f:cfg.color,2.6,6);if(game.targetsLocked.length===cfg.cap&&cfg.cap>1)game.showCallout(`${cfg.name} FULL LOCK`,.96);}game.updateHud();
  };

  const baseDestroyed=game.onEnemyDestroyed.bind(game);
  game.onEnemyDestroyed=(enemy)=>{
    if(enemy.type==='danger'){game.score+=Math.round(420*game.mult);game.overdrive=clamp(game.overdrive+7,0,100);game.sync=clamp(game.sync+3.5,0,100);game.showCallout('THREAT INTERCEPT // +SYNC',1);game.haptic([8,8,16]);game.updateHud();return;}
    baseDestroyed(enemy);
  };

  const baseSpawn=game.spawnEnemy.bind(game);
  game.spawnEnemy=(type,pos,phase=0)=>{
    const before=game.enemies.length;baseSpawn(type,pos,phase);const enemy=game.enemies.length>before?game.enemies[game.enemies.length-1]:null;
    if(type==='danger'&&enemy){installThreatVisual(enemy);if(!state.threatTutorial){state.threatTutorial=true;setTimeout(()=>game.showCallout('RED THREAT // LANCE OR SWARM INTERCEPT',0),120);}}
    return enemy;
  };

  game.fireWeaponAt=(target,index,total,q,cfg)=>{
    if(!game.running||target.dead||target.part?.dead)return;const end=game.targetPosition(target,new THREE.Vector3()),start=game.world.avatar.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,.55,-.5));game.makeShotBeam(start,end,index,total,q);
    const killed=target.hit?.(cfg.damage)??false;game.hits++;game.combo++;game.lastHitAt=game.time;game.maxCombo=Math.max(game.maxCombo,game.combo);game.mult=1+Math.min(6.5,game.combo/14)+(game.sync/100)*.75;game.score+=Math.round((135+index*30)*(cfg.id==='lance'?1.42:1)*(0.72+q*.48)*game.mult);game.overdrive=clamp(game.overdrive+(killed?5.8:1.5)+(q>.88?.8:0),0,100);game.audio.energy=clamp(.12+(game.combo/55)+game.section*.12+(game.sync/100)*.18,0,1);
    if(cfg.id==='lance'){game.particles.trail(start,0xff6bd8,24);game.cameraKick=(game.cameraKick||0)+.11;game.world.triggerDisintegrate?.(.22);}
    if(cfg.id==='swarm'){
      const origin=end.clone(),candidates=game.getTargetList().filter(t=>t!==target&&!t.dead&&!t.part?.dead).map(t=>[origin.distanceTo(game.targetPosition(t,new THREE.Vector3())),t]).filter(([d])=>d<5.3).sort((a,b)=>a[0]-b[0]).slice(0,2);
      candidates.forEach(([d,t],j)=>setTimeout(()=>{if(t.dead||t.part?.dead)return;const p=game.targetPosition(t,new THREE.Vector3());game.makeShotBeam(origin,p,j,2,Math.max(.7,q*.9));t.hit?.(t.type==='danger'?1:.8);game.particles.burst(p,18,0xb18aff,4.5,8);},30+j*45));
    }
    game.updateHud();
  };

  game.releaseFire=()=>{
    if(!game.running)return;const cfg=WEAPONS[state.weapon];if(!game.targetsLocked.length){const nearest=game.findNearestAim();if(nearest){if(nearest.bossPart)nearest.part.locked=true;else nearest.locked=true;game.targetsLocked.push(nearest);}}
    if(!game.targetsLocked.length)return;const targets=[...game.targetsLocked],q=game.audio.timingQuality();game.scoreTiming(q,targets.length);game.clearLocks();const start=game.audio.quantizedTime(cfg.id==='lance'?.5:1),spacing=game.audio.stepDur*cfg.spacing,power=.9+q*.35+(game.sync/100)*.14;
    targets.forEach((target,i)=>{const when=start+i*spacing;game.audio.shotNote(i,when,power);const delay=Math.max(0,(when-game.audio.ctx.currentTime)*1000);setTimeout(()=>game.fireWeaponAt(target,i,targets.length,q,cfg),delay);});game.shots+=targets.length;
  };

  const baseTakeHit=game.takeHit.bind(game);game.takeHit=()=>{game.world.triggerDisintegrate?.(1.25);baseTakeHit()};
  const baseOverdrive=game.triggerOverdrive.bind(game);game.triggerOverdrive=()=>{if(game.overdrive>=100)game.world.triggerDisintegrate?.(1.4);baseOverdrive()};

  const system=expansion.system,baseExpansionUpdate=system.update.bind(system);
  system.update=(dt,t)=>{baseExpansionUpdate(dt,t);if(expansion.state.active){game.world.avatar.position.y=lerp(game.world.avatar.position.y,-.8+game.pointer.y*1.95,dt*4.5);game.world.avatar.position.z=lerp(game.world.avatar.position.z,2.9,dt*5);}else{game.world.avatar.position.y=lerp(game.world.avatar.position.y,-1.82,dt*5);game.world.avatar.position.z=lerp(game.world.avatar.position.z,3.2,dt*5);}};

  const baseLoop=game.loop.bind(game);let last=performance.now()/1000;
  game.loop=()=>{baseLoop();const now=performance.now()/1000,dt=clamp(now-last,.001,.1);last=now;animateHumanoid(game,rig,dt,game.time||now,SPEEDS[state.speed]);};

  const lede=document.querySelector('.lede');if(lede)lede.textContent='Paint targets, switch weapons, and push vector speed. Hold to lock, release near the rhythm grid, and use LANCE or SWARM to intercept incoming red threat rings.';
  window.__pulsePilot={state,weapons:WEAPONS,speeds:SPEEDS,rig,cycleWeapon,cycleSpeed,setSpeed,stats:()=>({weapon:WEAPONS[state.weapon].name,speed:SPEEDS[state.speed],humanoid:!!game.world.humanRig,threats:game.enemies.filter(e=>!e.dead&&e.type==='danger').length})};
}

init();
