import * as THREE from 'three';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mobile=()=>innerWidth<760||matchMedia('(pointer: coarse)').matches;
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches||!!window.__pulseSettings?.state?.comfort;
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent&&window.__pulseModelFusion&&window.__pulseEnemyDamageReactivity?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});

waitFor().then(game=>{
  if(game.__enemyMotionRigsInstalled)return;game.__enemyMotionRigsInstalled=true;
  const tracked=new Set();let styled=0;

  const style=enemy=>{
    // Wait until damage-reactivity has wrapped the enemy update first. Articulation then layers
    // on top of its stable structural offsets instead of being overwritten by them.
    if(!enemy||enemy.dead||enemy.type==='danger'||enemy.type==='rupture'||enemy.__motionRig||!enemy.__fusionModel||!enemy.__damageReactiveState)return enemy;
    const model=enemy.__fusionModel,modules=model.children.filter(c=>c.name==='rez-volume-model');
    if(modules.length<2)return enemy;
    const state={modules,phase:(enemy.phase||0)+(styled%11)*.47,activity:0,lock:0};
    enemy.__motionRig=state;tracked.add(enemy);styled++;

    const baseUpdate=enemy.update?.bind(enemy);
    if(baseUpdate)enemy.update=(dt,t)=>{
      baseUpdate(dt,t);if(enemy.dead||!enemy.__fusionModel||enemy.__damageReactiveState?.released)return;
      const comfort=reduced(),motion=comfort ? .38 : 1,beatDur=game.audio?.beatDur||.46875,beat=((game.audio?.ctx?.currentTime||t)/beatDur)%1,pulse=Math.pow(Math.max(0,Math.cos(beat*Math.PI*2)),10);
      state.lock=THREE.MathUtils.lerp(state.lock,enemy.locked?1:0,clamp(dt*9,0,1));state.activity=THREE.MathUtils.lerp(state.activity,pulse,clamp(dt*7,0,1));
      const q=(state.activity*.06+state.lock*.045)*motion,phase=t+state.phase;

      if(enemy.type==='tank'){
        // Heavy braced motion: side modules compress like pistons while the weapon assembly kicks on downbeats.
        modules.forEach((m,i)=>{const side=i%2?1:-1;m.position.y+=Math.sin(phase*1.25+i)*.012*motion;m.position.x+=side*q*.18;m.rotation.x+=Math.sin(phase*.8+i)*.012*motion;m.rotation.z+=side*state.activity*.028*motion;});
        model.rotation.x=THREE.MathUtils.lerp(model.rotation.x,.035+state.lock*.025,clamp(dt*5,0,1));
      }else if(enemy.type==='node'){
        // Counter-rotating relay petals; locked nodes tighten into a precise signal cross.
        modules.forEach((m,i)=>{const dir=i%2?1:-1,a=phase*(.55+.08*i)*dir;m.rotation.z+=dt*(.28+.07*i)*dir*motion;m.position.x+=Math.cos(a)*.014*motion*(1-state.lock*.55);m.position.y+=Math.sin(a)*.014*motion*(1-state.lock*.55);});
        model.rotation.z+=dt*.08*motion;
      }else if(enemy.type==='prism'){
        // Mirrored blade-fold animation makes the silhouette alternately narrow and flare on the phrase.
        const fold=(.035+.055*Math.sin(phase*1.7))*motion+state.lock*.04;
        modules.forEach((m,i)=>{const side=i===0?0:(i%2?1:-1);m.position.x+=side*fold;m.rotation.z+=side*(.04+state.activity*.055)*motion;m.rotation.y+=side*Math.sin(phase*.9)*.012*motion;});
        model.rotation.y+=dt*.08*motion;
      }else if(enemy.type==='sentinel'){
        // Weapon pods track outward, then brace inward when locked; reads like an alert combat machine.
        const aimX=clamp(game.pointer?.x||0,-1,1),brace=.025+state.lock*.06+state.activity*.025;
        modules.forEach((m,i)=>{const side=i%2?1:-1;m.position.x+=side*brace*motion;m.rotation.y+=side*(aimX*.045+Math.sin(phase*.65+i)*.014)*motion;m.rotation.z+=side*state.activity*.04*motion;});
        model.rotation.z=THREE.MathUtils.lerp(model.rotation.z,-aimX*.035*motion,clamp(dt*4,0,1));
      }else{
        // Drone scissor-wing gait: quick, light and readable against the slower heavy families.
        const wing=.035+Math.sin(phase*2.35)*.025+state.lock*.028;
        modules.forEach((m,i)=>{const side=i%2?1:-1;m.position.x+=side*wing*motion;m.position.y+=Math.sin(phase*2+i)*.009*motion;m.rotation.z+=side*(wing*.9+state.activity*.035)*motion;});
        model.rotation.z+=Math.sin(phase*1.4)*.012*motion;
      }

      const damage=1-clamp((enemy.hp||0)/enemy.__damageReactiveState.initialHp,0,1);
      if(damage>.01){
        // Damaged bodies lose coordination without fighting the structural-damage layer underneath.
        modules.forEach((m,i)=>{const wob=Math.sin(phase*(2.2+i*.09)+i)*damage*.014*motion;m.rotation.x+=wob;m.rotation.y-=wob*.65;});
      }
    };
    return enemy;
  };

  const scan=()=>{
    for(const enemy of game.enemies||[])style(enemy);
    for(const enemy of [...tracked])if(enemy.dead||!enemy.__fusionModel)tracked.delete(enemy);
    requestAnimationFrame(scan);
  };requestAnimationFrame(scan);

  window.__pulseEnemyMotionRigs={
    style,
    stats:()=>({tracked:tracked.size,totalStyled:styled,mobile:mobile(),families:[...new Set([...tracked].map(e=>e.type))].sort()})
  };
});
