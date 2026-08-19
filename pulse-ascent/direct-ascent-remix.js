import * as THREE from 'three';
import './direct-ascent-crossover.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent&&window.__pulseDirectAscent&&window.__pulseAreaAudio&&window.__pulseTopologyWorlds?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});

waitFor().then(game=>{
  if(game.__directAscentRemixInstalled)return;game.__directAscentRemixInstalled=true;
  const direct=window.__pulseDirectAscent,areaAudio=window.__pulseAreaAudio,topology=window.__pulseTopologyWorlds;
  let lastArea=-1,lastActive=false,lastSection=-1,remixed=0;
  const mobile=()=>innerWidth<760||matchMedia('(pointer: coarse)').matches;
  const level=()=>clamp((direct.state.area-1)/4+(game.section||0)*.05,0,1.2);
  const selectedArea=()=>clamp((window.__pulseCampaign?.state?.selected||1)-1,0,4);

  function applyTempo(){
    const a=selectedArea(),profile=areaAudio.profiles[a];if(!profile||!game.audio?.ctx)return;
    const boost=direct.active?.025+level()*.075:0,bpm=Math.round(profile.bpm*(1+boost));
    game.audio.stepDur=60/bpm/4;game.audio.beatDur=60/bpm;
    if(game.audio.delay)game.audio.delay.delayTime.value=game.audio.beatDur*.75;
    const el=document.querySelector('#bpm');if(el)el.textContent=`${bpm} BPM`;
  }

  const baseAreaApply=areaAudio.apply.bind(areaAudio);
  areaAudio.apply=i=>{const out=baseAreaApply(i);applyTempo();return out;};

  const baseSpawn=game.spawnEnemy.bind(game);
  game.spawnEnemy=(type,pos,phase=0)=>{
    let next=type;
    if(direct.active&&type==='drone'){
      const r=Math.random(),p=.08+level()*.22;
      if(r<p){
        const pool=direct.state.area>=5?['prism','sentinel','tank']:direct.state.area>=3?['prism','sentinel']:['prism','node'];
        next=pool[Math.floor(Math.random()*pool.length)];remixed++;
      }
    }
    return baseSpawn(next,pos,phase);
  };

  const baseUpdate=game.world.update.bind(game.world);
  game.world.update=(dt,t,energy,sync=0)=>{
    baseUpdate(dt,t,energy,sync);
    if(!direct.active)return;
    const a=selectedArea(),w=topology.worlds[a];if(!w)return;
    const l=level(),corrupt=.018+l*.032;
    w.root.rotation.z+=Math.sin(t*(.7+l*.45)+a)*corrupt*dt;
    w.root.rotation.y=(a===2?Math.sin(t*.08)*.08:0)+Math.sin(t*.31+a)*corrupt*.55;
    w.mat.opacity=clamp(w.mat.opacity+l*.015,.05,.205);
    w.packetMat.opacity=clamp(w.packetMat.opacity+l*.06,.28,.88);
    const colors=topology.profiles[(a+1)%topology.profiles.length]?.colors;
    if(colors&&l>.35){const mix=clamp((l-.35)*.12,0,.09);w.mat.color.lerp(new THREE.Color(colors[1]),mix);}
  };

  const baseBossPhase=game.onBossPhase?.bind(game);
  if(baseBossPhase)game.onBossPhase=p=>{const out=baseBossPhase(p);if(direct.active){applyTempo();game.sync=clamp(game.sync+2+direct.state.area,0,100);game.showCallout?.(`DIRECT REMIX // PHASE ${p}`,1);}return out;};

  const tick=()=>{
    const active=direct.active,area=direct.state.area,section=game.section||0;
    if(active!==lastActive||area!==lastArea||section!==lastSection){
      applyTempo();
      if(active&&(area!==lastArea||!lastActive))game.showCallout?.(`DIRECT REMIX // INTENSITY ${area}`,1);
      lastActive=active;lastArea=area;lastSection=section;
    }
    const chip=document.querySelector('#directAscentChip');
    if(chip&&active)chip.textContent=`DIRECT ASCENT · AREA ${area}/5 · REMIX ${Math.round(level()*100)} · ${Math.floor(game.score||0).toLocaleString()}`;
    requestAnimationFrame(tick);
  };requestAnimationFrame(tick);

  window.__pulseDirectAscentRemix={
    get intensity(){return level();},
    get remixedEnemies(){return remixed;},
    applyTempo,
    stats:()=>({active:direct.active,area:direct.state.area,intensity:level(),remixedEnemies:remixed,bpm:Math.round(60/(game.audio?.beatDur||.46875))})
  };
});
