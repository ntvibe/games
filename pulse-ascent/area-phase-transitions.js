const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent&&window.__pulseCampaign&&window.__pulseTopologyWorlds&&window.__pulseTopologyMorph&&window.__pulseAreaAudio?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});

const PHASE_ACCENTS=[
  [0,7,12],      // SIGNAL BIRTH: clean machine fifth/octave
  [0,5,11],      // GLASS TEMPLE: suspended/refraction color
  [0,3,10],      // CHROMA SEA: minor floating spread
  [0,5,9],       // ORGANIC CODE: open organic fourth/sixth
  [0,6,13]       // NEURAL CATHEDRAL: tense tritone/expanded octave
];
const MOTION=[
  {roll:.018,scale:.012,packet:.12},
  {roll:.032,scale:.018,packet:.16},
  {roll:.05,scale:.012,packet:.19},
  {roll:.026,scale:.025,packet:.14},
  {roll:.014,scale:.02,packet:.2}
];

waitFor().then(game=>{
  if(game.__areaPhaseTransitionsInstalled)return;
  game.__areaPhaseTransitionsInstalled=true;

  const state={area:1,phase:0,name:'',pulse:0,transitions:0,lastAt:0};
  const selected=()=>clamp(window.__pulseCampaign?.state?.selected||1,1,5);
  const currentLevel=()=>window.__pulseCampaign?.levels?.[selected()-1];
  const isTraining=()=>!!window.__pulseOnboarding?.state?.active;

  const playAccent=(area,phase)=>{
    const audio=game.audio;if(!audio?.ctx||!audio.osc)return;
    const profile=window.__pulseAreaAudio?.profiles?.[area-1];if(!profile)return;
    const t=audio.ctx.currentTime+.025,notes=PHASE_ACCENTS[area-1]||PHASE_ACCENTS[0];
    notes.forEach((n,i)=>audio.osc(i===0?'sine':profile.lead||'triangle',audio.midi(profile.root+24+n+Math.min(12,phase*2)),t+i*.018,.19+phase*.025,.012+phase*.002,audio.music,(i-1)*4,(i-1)*.42));
  };

  const updateHud=(area,phase,name)=>{
    const label=document.querySelector('#sectionLabel'),section=document.querySelector('#sectionName');
    if(label)label.textContent=phase>=4?'BOSS SIGNAL':`AREA ${String(area).padStart(2,'0')} // PHASE ${String(phase+1).padStart(2,'0')}`;
    if(section&&name)section.textContent=name;
  };

  const enter=(phase,name)=>{
    const area=selected(),level=currentLevel(),resolved=level?.phases?.[phase]||name||level?.theme||'SIGNAL';
    state.area=area;state.phase=phase;state.name=resolved;state.pulse=phase===0?.35:1;state.transitions++;state.lastAt=game.time||0;
    updateHud(area,phase,resolved);
    if(!isTraining()&&phase>0){
      window.__pulseTopologyMorph?.trigger?.();
      playAccent(area,phase);
      game.cameraKick=Math.max(game.cameraKick||0,.045+phase*.018);
      if(phase<4)game.showCallout?.(`PHASE ${String(phase+1).padStart(2,'0')} // ${resolved}`,.94);
      game.haptic?.(phase===4?[16,18,34]:[10,16,18]);
    }
  };

  const baseSetSection=game.setSection.bind(game);
  game.setSection=(i,name)=>{baseSetSection(i,name);const level=currentLevel();enter(clamp(i,0,4),level?.phases?.[clamp(i,0,4)]||name);};

  const baseStart=game.start.bind(game);
  game.start=async()=>{const r=await baseStart();const level=currentLevel();enter(clamp(game.section||0,0,4),level?.phases?.[clamp(game.section||0,0,4)]||level?.theme);return r;};

  const baseRestart=game.restart.bind(game);
  game.restart=()=>{const r=baseRestart();const level=currentLevel();enter(clamp(game.section||0,0,4),level?.phases?.[clamp(game.section||0,0,4)]||level?.theme);return r;};

  const baseUpdate=game.world.update.bind(game.world);
  game.world.update=(dt,t,energy,sync=0)=>{
    baseUpdate(dt,t,energy,sync);
    state.pulse=lerp(state.pulse,0,1-Math.pow(.018,dt));
    if(state.pulse<.002)return;
    const topo=window.__pulseTopologyWorlds,w=topo?.worlds?.[state.area-1],m=MOTION[state.area-1]||MOTION[0];
    if(w?.root){
      w.root.rotation.z+=Math.sin(t*1.7+state.area)*m.roll*state.pulse;
      const s=1+m.scale*state.pulse;w.root.scale.setScalar(s);
      if(w.packetMat)w.packetMat.opacity=clamp(w.packetMat.opacity+m.packet*state.pulse,0,.88);
      if(w.mat)w.mat.opacity=clamp(w.mat.opacity+.022*state.pulse,0,.2);
    }
    if(game.camera&&state.phase>0){
      const phaseLift=(state.phase===4?2.2:1.1+state.phase*.25)*state.pulse;
      game.camera.fov=clamp(game.camera.fov+phaseLift,58,82);
      game.camera.updateProjectionMatrix?.();
    }
  };

  const level=currentLevel();enter(clamp(game.section||0,0,4),level?.phases?.[clamp(game.section||0,0,4)]||level?.theme);
  window.__pulseAreaPhaseTransitions={state,profiles:()=>window.__pulseCampaign?.levels?.map(l=>({area:l.id,phases:[...(l.phases||[])]}))||[],trigger:()=>enter(clamp(game.section||0,0,4),currentLevel()?.phases?.[clamp(game.section||0,0,4)]),stats:()=>({...state})};
});
