import * as THREE from 'three';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=THREE.MathUtils.lerp;
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent&&window.__pulseAreaBossVulnerability&&window.__pulseTopologyWorlds&&window.__pulseAreaAudio?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});

const CUE_NAMES=['BUS RESOLVE','MIRROR HARMONY','CHROMA TRANSFER','ORGANIC REGROWTH','CHORD RESOLUTION'];

waitFor().then(game=>{
  if(game.__bossSynesthesiaInstalled)return;game.__bossSynesthesiaInstalled=true;
  const audio=game.audio,topology=window.__pulseTopologyWorlds,puzzle=window.__pulseAreaBossVulnerability;
  const state={boss:null,area:-1,pulse:0,resolutions:0,cues:0,lastLive:-1,lastActive:-2,lastMirror:0,lastShield:false,lastChord:false,lastCue:'',lastCueAt:-99};
  const area=()=>clamp((window.__pulseCampaign?.state?.selected||1)-1,0,4);
  const profile=()=>window.__pulseAreaAudio?.profiles?.[area()]||{root:43,scale:[0,3,7,12]};
  const mark=(name,strength=.8)=>{state.lastCue=name;state.lastCueAt=game.time;state.cues++;state.pulse=Math.max(state.pulse,strength);};

  const ping=(m,t,g=.03,type='sine',pan=0,d=.14)=>audio.osc(type,audio.midi(m),t,d,g,audio.fx||audio.music,0,pan);
  const cueBus=(step=0,strong=false)=>{
    if(!audio.ctx)return;const p=profile(),t=audio.ctx.currentTime+.012,n=p.scale[Math.min(p.scale.length-1,step%p.scale.length)]||0;
    [0,7,12].forEach((iv,i)=>ping(p.root+24+n+iv,t+i*.014,strong ? .038 : .025,i===1?'triangle':'sine',(i-1)*.48,.16));
  };
  const cueMirror=()=>{
    if(!audio.ctx)return;const p=profile(),t=audio.ctx.currentTime+.012,m=p.root+31;
    ping(m,t,.03,'sine',-.72,.2);ping(m+7,t+.018,.03,'triangle',.72,.2);
  };
  const cueChroma=(idx=0)=>{
    if(!audio.ctx)return;const p=profile(),t=audio.ctx.currentTime+.01,m=p.root+24+(p.scale[Math.max(0,idx)%p.scale.length]||0),{o}=ping(m,t,.024,'sine',(idx%2?1:-1)*.4,.28);
    o?.frequency?.exponentialRampToValueAtTime?.(audio.midi(m+7),t+.25);
  };
  const cueOrganic=(regrow=false)=>{
    if(!audio.ctx)return;const p=profile(),t=audio.ctx.currentTime+.012,m=p.root+(regrow?19:12),{o}=ping(m,t,.032,regrow?'triangle':'sawtooth',0,.3);
    if(o?.frequency){o.frequency.setValueAtTime(audio.midi(m),t);o.frequency.exponentialRampToValueAtTime(audio.midi(m+(regrow?7:-7)),t+.27);}
  };
  const cueChord=()=>{
    if(!audio.ctx)return;const p=profile(),t=audio.ctx.currentTime+.012,root=p.root+24;
    [0,6,10,13].forEach((n,i)=>ping(root+n,t+i*.012,.026,i%2?'triangle':'sine',(i-1.5)/2,.38));
    audio.pad?.(t,root,audio.beatDur*1.7,.03);
  };

  const resetForBoss=boss=>{
    state.boss=boss;state.area=area();state.pulse=0;state.lastLive=-1;state.lastActive=-2;state.lastMirror=0;state.lastShield=false;state.lastChord=false;
  };

  const react=()=>{
    const boss=game.boss;if(!boss||boss.dead)return;
    if(boss!==state.boss||area()!==state.area)resetForBoss(boss);
    const s=puzzle.stats();

    if(state.lastLive<0)state.lastLive=s.live.length;
    if(area()===0&&s.live.length<state.lastLive){
      const step=Math.max(0,(s.required?.length||2)-s.live.length);cueBus(step,s.live.length===0);mark('BUS NODE RESOLVED',s.live.length===0?1:.72);state.resolutions++;
      if(s.live.length===0)window.__pulseTopologyMorph?.trigger?.();
    }
    if(area()===1&&s.mirroredHits>state.lastMirror){cueMirror();mark('MIRROR HARMONY',.78);state.resolutions+=s.mirroredHits-state.lastMirror;}
    if(area()===2&&s.activeIndex!==state.lastActive&&s.activeIndex>=0){cueChroma(s.activeIndex);mark('CHROMA WEAK POINT SHIFT',.52);}
    if(area()===3&&s.shielded!==state.lastShield){cueOrganic(!s.shielded);mark(s.shielded?'BRANCH SEVERED':'BRANCH REGROWN',s.shielded ? .82 : .5);if(s.shielded)state.resolutions++;}
    if(area()===4&&s.chordOpen&&!state.lastChord){cueChord();mark('CHORD RESOLVED',1);state.resolutions++;window.__pulseTopologyMorph?.trigger?.();}

    state.lastLive=s.live.length;state.lastActive=s.activeIndex;state.lastMirror=s.mirroredHits;state.lastShield=s.shielded;state.lastChord=s.chordOpen;
  };

  const baseWorldUpdate=game.world.update.bind(game.world);
  game.world.update=(dt,t,energy,sync=0)=>{
    baseWorldUpdate(dt,t,energy,sync);react();state.pulse=lerp(state.pulse,0,1-Math.pow(.008,dt));
    const boss=game.boss;if(!boss||boss.dead||state.pulse<.002)return;
    const a=area(),w=topology.worlds?.[a],p=topology.profiles?.[a];if(!w||!p)return;
    const accent=new THREE.Color(p.colors?.[1]??0xffffff),q=clamp(state.pulse,0,1);
    w.mat.color.lerp(accent,.12+q*.24);w.mat.opacity=clamp((w.mat.opacity||.1)+q*.055,.05,.24);
    w.packetMat.color.lerp(accent,.2+q*.35);w.packetMat.opacity=clamp((w.packetMat.opacity||.4)+q*.12,.3,.88);
    const breathe=1+q*(a===3 ? .024 : a===4 ? .018 : .012);w.root.scale.setScalar(breathe);
    if(a===1)w.root.rotation.z+=Math.sin(t*6)*q*.0018;
    if(a===2)w.root.rotation.y+=Math.sin(t*4.5)*q*.0025;
  };

  window.__pulseBossSynesthesia={state,cueNames:CUE_NAMES,stats:()=>({area:area()+1,cue:CUE_NAMES[area()],lastCue:state.lastCue,cues:state.cues,resolutions:state.resolutions,pulse:state.pulse,boss:!!state.boss&&!state.boss.dead})};
});
