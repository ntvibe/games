import * as THREE from 'three';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=x=>x*x*(3-2*x);
const mobile=()=>innerWidth<760||innerHeight<520||matchMedia('(pointer: coarse)').matches;
const reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const AREA_COLORS=[0x55efff,0xffa95e,0x69ffe2,0xa6ff76,0xcbd2ff];
const HERO_TYPES=new Set(['node','sentinel','tank','prism']);
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});

function makeRevealIris(game,color,hero=false){
  const r=hero ? 1.45 : .95,verts=[];
  const seg=(ax,ay,bx,by)=>verts.push(ax,ay,0,bx,by,0);
  // Faceted aperture language: no solid rectangles, only converging topology blades.
  seg(-r,-r*.52,-r*.46,0);seg(-r,r*.52,-r*.46,0);
  seg(r,-r*.52,r*.46,0);seg(r,r*.52,r*.46,0);
  seg(-r*.48,-r,0,-r*.48);seg(r*.48,-r,0,-r*.48);
  seg(-r*.48,r,0,r*.48);seg(r*.48,r,0,r*.48);
  if(hero){seg(-r*.72,-r*.72,-r*.34,-r*.34);seg(r*.72,-r*.72,r*.34,-r*.34);seg(-r*.72,r*.72,-r*.34,r*.34);seg(r*.72,r*.72,r*.34,r*.34);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
  const mat=new THREE.LineBasicMaterial({color,transparent:true,opacity:hero ? .46 : .3,depthWrite:false,depthTest:true,blending:THREE.NormalBlending});
  const line=new THREE.LineSegments(geo,mat);line.name='enemy-reveal-iris';line.renderOrder=1;game.scene.add(line);
  return {line,geo,mat};
}

waitFor().then(game=>{
  if(game.__enemyRevealDirectorInstalled)return;game.__enemyRevealDirectorInstalled=true;

  const state={directed:0,activated:0,heroFrames:0,pending:new Set(),irises:new Set(),lastHeroFrame:-99};
  const area=()=>clamp((window.__pulseCampaign?.state?.selected||1)-1,0,4);
  const comfort=()=>!!window.__pulseSettings?.state?.comfort||reducedMotion();
  const onboarding=()=>!!window.__pulseOnboarding?.state?.active;
  const traversal=()=>!!window.__pulseTraversalSetpieces?.active;
  const direct=()=>!!window.__pulseDirectAscent?.state?.active;
  const canDirect=()=>!!game.running&&!onboarding()&&!traversal()&&game.world?.lines?.visible!==false;

  const baseTargets=game.getTargetList.bind(game);
  game.getTargetList=()=>baseTargets().filter(target=>!target?.__revealLocked);

  function cleanupIris(reveal){
    const iris=reveal?.iris;if(!iris)return;
    if(iris.line.parent)game.scene.remove(iris.line);
    iris.geo.dispose();iris.mat.dispose();state.irises.delete(iris);reveal.iris=null;
  }

  function activationTone(enemy){
    if(!game.audio?.ctx)return;
    const hero=enemy.__revealState?.hero,a=area(),root=(game.audio.rootMidi||43)+24+[0,5,7,3,12][a];
    const t=game.audio.ctx.currentTime+.006;
    game.audio.osc?.(a===1?'sine':a===3?'triangle':'square',game.audio.midi(root),t,hero ? .11 : .055,hero ? .018 : .007,game.audio.fx,0,enemy.group.position.x<0 ? -.28 : .28);
    if(hero)game.audio.osc?.('sine',game.audio.midi(root+7),t+.018,.13,.009,game.audio.fx,0,enemy.group.position.x<0 ? .2 : -.2);
  }

  function activate(enemy,fromBeat=true){
    const reveal=enemy?.__revealState;if(!reveal||reveal.activated)return;
    reveal.activated=true;reveal.activationAge=0;enemy.__revealLocked=false;state.pending.delete(enemy);state.activated++;
    if(fromBeat)activationTone(enemy);
    if(reveal.hero&&fromBeat){
      const now=game.time||0;
      if(now-state.lastHeroFrame>.7){window.__pulseRailCamera?.frameEncounter?.([enemy]);state.lastHeroFrame=now;state.heroFrames++;}
      game.haptic?.(mobile()?5:7);
    }
  }

  function directEnemy(enemy){
    if(!enemy||enemy.dead||enemy.__revealDirected||enemy.type==='danger'||enemy.type==='rupture'||!enemy.group)return enemy;
    enemy.__revealDirected=true;state.directed++;
    const hero=HERO_TYPES.has(enemy.type)||!!enemy.elite;
    const fast=direct() ? .68 : 1;
    const hold=(hero ? .34 : .16)*fast*(comfort() ? .55 : 1);
    const reveal={hero,age:0,minHold:hold,activated:false,activationAge:0,side:enemy.group.position.x<0 ? -1 : 1,iris:null};
    enemy.__revealState=reveal;

    if(!canDirect()){
      reveal.activated=true;enemy.__revealLocked=false;return enemy;
    }

    enemy.__revealLocked=true;state.pending.add(enemy);
    reveal.iris=makeRevealIris(game,AREA_COLORS[area()]||AREA_COLORS[0],hero);state.irises.add(reveal.iris);

    if(hero){
      const now=game.time||0;
      if(now-state.lastHeroFrame>.7){window.__pulseRailCamera?.frameEncounter?.([enemy]);state.lastHeroFrame=now;state.heroFrames++;}
    }

    const baseUpdate=enemy.update?.bind(enemy);
    if(baseUpdate)enemy.update=(dt,t)=>{
      baseUpdate(dt,t);if(enemy.dead)return;
      const r=enemy.__revealState;if(!r)return;
      if(!r.activated&&!canDirect())activate(enemy,false);
      if(!r.activated){
        r.age+=dt;
        const k=smooth(clamp(r.age/Math.max(.001,r.minHold),0,1));
        const motion=comfort() ? .3 : 1;
        // Hold as a readable distant silhouette, then let the enemy emerge into its real authored path.
        enemy.group.position.x+=r.side*(1-k)*(r.hero ? 1.25 : .62)*motion;
        enemy.group.position.y+=(1-k)*(r.hero ? .42 : .18)*Math.sin((enemy.phase||0)+1.3)*motion;
        enemy.group.position.z-=(1-k)*(r.hero ? 5.5 : 3.0)*motion;
        enemy.group.scale.multiplyScalar((r.hero ? .34 : .48)+(r.hero ? .66 : .52)*k);
      }else{
        r.activationAge+=dt;
        if(r.activationAge<.24){
          const p=clamp(r.activationAge/.24,0,1),overshoot=Math.sin(p*Math.PI)*(r.hero ? .055 : .025);
          enemy.group.scale.multiplyScalar(1+overshoot);
        }
      }

      const iris=r.iris;
      if(iris){
        const wp=enemy.group.getWorldPosition(new THREE.Vector3());iris.line.position.copy(wp);iris.line.quaternion.copy(game.camera.quaternion);
        if(!r.activated){const k=smooth(clamp(r.age/Math.max(.001,r.minHold),0,1));iris.line.scale.setScalar(1.35-k*.35);iris.mat.opacity=(r.hero ? .46 : .3)*(1-k*.18);}
        else{const k=clamp(r.activationAge/.24,0,1);iris.line.scale.setScalar(1+k*.28);iris.mat.opacity=(r.hero ? .38 : .24)*(1-k);if(k>=1)cleanupIris(r);}
      }
    };

    const baseDispose=enemy.dispose?.bind(enemy);
    if(baseDispose)enemy.dispose=()=>{state.pending.delete(enemy);cleanupIris(enemy.__revealState);return baseDispose();};
    return enemy;
  }

  game.audio?.onStep?.((step)=>{
    if(step%4!==0)return;
    for(const enemy of [...state.pending]){
      const r=enemy?.__revealState;
      if(!enemy||enemy.dead){state.pending.delete(enemy);continue;}
      if(r&&!r.activated&&r.age>=r.minHold*.92)activate(enemy,true);
    }
  });

  const tick=()=>{
    if(game.running){for(const enemy of game.enemies)directEnemy(enemy);}
    requestAnimationFrame(tick);
  };requestAnimationFrame(tick);

  window.__pulseEnemyReveal={
    directEnemy,
    activate,
    stats:()=>({directed:state.directed,activated:state.activated,pending:state.pending.size,irises:state.irises.size,heroFrames:state.heroFrames,normalBlending:true,comfort:comfort(),direct:direct()})
  };
});
