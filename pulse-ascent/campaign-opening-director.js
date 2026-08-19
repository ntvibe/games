import * as THREE from 'three';

const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=THREE.MathUtils.lerp;
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent&&window.__pulseArea1Opening&&window.__pulseAreaAudio?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});

const SIGNATURE_TYPE={2:'prism',3:'node',4:'sentinel',5:'node'};
const INTRO_CAMERA={
  2:{z:9.55,fov:72},
  3:{z:9.2,fov:77},
  4:{z:9.05,fov:73},
  5:{z:9.7,fov:70}
};

waitFor().then(game=>{
  if(game.__campaignOpeningDirectorInstalled)return;
  game.__campaignOpeningDirectorInstalled=true;

  const state={active:false,area:1,bar:-1,stage:'IDLE',perfects:0,firstSignature:false,arrival:0,successPulse:0,authoredWaves:0,startedAt:0};
  const selectedArea=()=>clamp(window.__pulseCampaign?.state?.selected||1,1,5);
  const isTraining=()=>!!window.__pulseOnboarding?.state?.active;
  const isDirect=()=>!!window.__pulseDirectAscent?.active;
  const shouldDirect=()=>game.running&&selectedArea()>1&&!isTraining()&&!isDirect()&&(game.bar||0)<16;
  const spawn=(type,x,y,z,phase=0)=>game.spawnEnemy(type,new THREE.Vector3(x,y,z),phase);

  const reset=area=>{
    state.active=false;state.area=area;state.bar=-1;state.stage='ARRIVAL';state.perfects=0;state.firstSignature=false;
    state.arrival=1;state.successPulse=0;state.authoredWaves=0;state.startedAt=game.time||0;
  };

  function openingComposition(area){
    reset(area);
    if(area===2){
      spawn('prism',0,1.1,-47,0);spawn('drone',-5.1,-1.1,-55,0);spawn('drone',5.1,-1.1,-55,0);
      state.stage='TEMPLE THRESHOLD';game.showCallout?.('GLASS TEMPLE // THRESHOLD',.94);
    }else if(area===3){
      spawn('drone',-4.8,.5,-43,0);spawn('drone',-1.6,-1.4,-50,0);spawn('drone',1.8,1.4,-55,0);spawn('node',5,-.4,-61,0);
      state.stage='COLOR DRIFT';game.showCallout?.('CHROMA SEA // ENTER THE CURRENT',.94);
    }else if(area===4){
      spawn('drone',-4.2,-1.5,-46,0);spawn('sentinel',0,1.25,-54,0);spawn('drone',4.2,-.8,-61,0);
      state.stage='GERMINATION';game.showCallout?.('ORGANIC CODE // GERMINATION',.94);
    }else if(area===5){
      spawn('node',0,2,-52,0);spawn('sentinel',-4.8,-1.1,-60,0);spawn('sentinel',4.8,-1.1,-60,0);
      state.stage='CHOIR DOOR';game.showCallout?.('NEURAL CATHEDRAL // CHOIR DOOR',1);
    }
  }

  function stageArea2(bar){
    if(bar===0){state.stage='TEMPLE THRESHOLD';return;}
    if(bar===2){
      state.stage='PRISM PROCESSION';
      for(let i=0;i<5;i++){const x=(i-2)*2.45;spawn(i===2?'prism':'drone',x,Math.abs(i-2)*.55-1.2,-47-i*2.5,1);}
      game.showCallout?.('PRISM PROCESSION // LISTEN FOR GLASS',.88);return;
    }
    if(bar===4){
      state.stage='MIRROR PAIR';
      spawn('prism',-3.8,.7,-52,1);spawn('prism',3.8,.7,-52,1);spawn('node',0,-1.5,-59,1);
      game.showCallout?.('MIRROR PAIR // BREAK THE SYMMETRY',.94);return;
    }
    if(bar===6){
      state.stage='RESONANT ARCH';
      for(let i=0;i<7;i++){const a=-1.18+i/6*2.36;spawn(i%3===0?'prism':'drone',Math.sin(a)*6.6,Math.cos(a)*3.4-1.4,-49-i*2.2,1);}
      return;
    }
    if(bar===8){
      state.stage='GLASS HARMONIC';spawn('sentinel',0,1.1,-61,2);
      for(const d of [-1,1]){spawn('prism',d*3.8,-.8,-54,2);spawn('drone',d*6,1.2,-60,2);}
      game.showCallout?.('GLASS HARMONIC // TEMPLE OPENS',1);state.successPulse=1;return;
    }
    if(bar===10){
      state.stage='REFRACTION FAN';
      for(let i=0;i<7;i++){const d=i%2?-1:1;spawn(i===3?'node':i%3===0?'prism':'drone',d*(2+(i>>1)*1.35),-2.1+i*.68,-49-i*2.4,2);}
      return;
    }
    if(bar===12){
      state.stage='ARCHON LITURGY';spawn('sentinel',-4.2,1.3,-58,2);spawn('sentinel',4.2,1.3,-58,2);spawn('prism',0,-1,-54,2);spawn('node',0,2.5,-65,2);
      game.showCallout?.('ARCHON LITURGY // HOLD THE GRID',.96);return;
    }
    if(bar===14){
      state.stage='INNER SANCTUM';
      for(let i=0;i<8;i++){const a=i/8*TAU;spawn(i%4===0?'prism':'drone',Math.cos(a)*6.4,Math.sin(a)*3.2-1,-52-i*1.8,2);}
      game.showCallout?.('INNER SANCTUM // DESCEND',1);state.successPulse=1;
    }
  }

  function stageArea3(bar){
    if(bar===0){state.stage='COLOR DRIFT';return;}
    if(bar===2){
      state.stage='TIDAL THREAD';
      for(let i=0;i<6;i++){const a=i*.75;spawn('drone',Math.sin(a)*6.2,Math.cos(a*.72)*2.6,-48-i*3,1);}
      game.showCallout?.('TIDAL THREAD // FOLLOW THE CURRENT',.86);return;
    }
    if(bar===4){
      state.stage='CHROMA ORBIT';spawn('node',0,0,-58,1);
      for(let i=0;i<6;i++){const a=i/6*TAU;spawn('drone',Math.cos(a)*5.4,Math.sin(a)*2.9,-52-i*1.4,1);}
      game.showCallout?.('CHROMA ORBIT // WEAK POINT DRIFTS',.94);return;
    }
    if(bar===6){
      state.stage='CURRENT BRAID';
      for(let i=0;i<8;i++){const band=i%2?-1:1;spawn(i%4===0?'prism':'drone',band*(2.2+(i>>1)*1.25),Math.sin(i*.9)*2.2,-48-i*2.2,1);}
      return;
    }
    if(bar===8){
      state.stage='COLOR SURGE';spawn('sentinel',0,-.4,-63,2);
      for(let i=0;i<6;i++){const a=i/6*TAU+.35;spawn(i%3===0?'prism':'drone',Math.cos(a)*6.3,Math.sin(a)*3.3,-53-i*2,2);}
      game.showCallout?.('COLOR SURGE // LET IT FLOW',1);state.successPulse=1;return;
    }
    if(bar===10){
      state.stage='PARALLAX SHOAL';
      for(let i=0;i<9;i++){spawn(i===4?'node':i%4===0?'prism':'drone',Math.sin(i*.95)*6.8,Math.cos(i*.56)*3.1,-49-i*2.1,2);}
      return;
    }
    if(bar===12){
      state.stage='BLOOM DESCENT';spawn('node',-3.5,1.7,-60,2);spawn('node',3.5,-1.1,-64,2);spawn('sentinel',0,.3,-57,2);
      for(const d of [-1,1])spawn('drone',d*6,-2,-53,2);
      game.showCallout?.('BLOOM DESCENT // CURRENT DEEPENS',.98);return;
    }
    if(bar===14){
      state.stage='ABYSSAL CHROMA';
      for(let i=0;i<8;i++){const a=i/8*TAU;spawn(i%3===0?'prism':'drone',Math.cos(a)*(5.6+(i%2)),Math.sin(a)*3.6,-54-i*2.1,2);}
      game.showCallout?.('ABYSSAL CHROMA // DIVE',1);state.successPulse=1;
    }
  }

  function stageArea4(bar){
    if(bar===0){state.stage='GERMINATION';return;}
    if(bar===2){
      state.stage='BRANCH WAKE';
      for(let i=0;i<6;i++){const side=i%2?-1:1;spawn('drone',side*(2.4+(i>>1)*1.55),-1.9+i*.72,-48-i*2.5,1);}
      game.showCallout?.('BRANCH WAKE // NETWORK GROWS',.86);return;
    }
    if(bar===4){
      state.stage='HUNTER SEED';spawn('sentinel',0,1,-57,1);spawn('node',-3.8,-1.3,-61,1);spawn('node',3.8,-1.3,-61,1);
      game.showCallout?.('HUNTER SEED // READ THE PULSE',.94);return;
    }
    if(bar===6){
      state.stage='BIFURCATION';
      for(let i=0;i<8;i++){const side=i<4?-1:1,j=i%4;spawn(j===3?'prism':'drone',side*(2.1+j*1.25),-1.8+j*1.05,-50-j*3-(side>0?2:0),1);}
      return;
    }
    if(bar===8){
      state.stage='ORGANIC PULSE';spawn('tank',0,-1,-63,2);spawn('sentinel',-4.5,1.3,-58,2);spawn('sentinel',4.5,1.3,-58,2);
      game.showCallout?.('ORGANIC PULSE // BODY OF THE NETWORK',1);state.successPulse=1;return;
    }
    if(bar===10){
      state.stage='SYNAPSE THICKET';
      for(let i=0;i<8;i++){spawn(i%3===0?'sentinel':'drone',Math.sin(i*1.14)*6.4,Math.cos(i*.77)*3,-50-i*2.4,2);}
      return;
    }
    if(bar===12){
      state.stage='HUNTER GROVE';spawn('tank',-3.7,-.8,-61,2);spawn('tank',3.7,-.8,-64,2);spawn('node',0,2,-58,2);
      for(const d of [-1,1])spawn('drone',d*6,1.1,-54,2);
      game.showCallout?.('HUNTER GROVE // SEVER THE BRANCHES',.98);return;
    }
    if(bar===14){
      state.stage='ORACLE ROOT';
      for(let i=0;i<8;i++){const a=i/8*TAU;spawn(i%4===0?'sentinel':i===3?'prism':'drone',Math.cos(a)*6.6,Math.sin(a)*3.2-1,-52-i*2,2);}
      game.showCallout?.('ORACLE ROOT // DESCEND',1);state.successPulse=1;
    }
  }

  function stageArea5(bar){
    if(bar===0){state.stage='CHOIR DOOR';return;}
    if(bar===2){
      state.stage='LANCET PROCESSION';
      for(let i=0;i<5;i++){spawn(i===2?'node':'drone',(i-2)*2.7,Math.abs(i-2)*.65-1.2,-50-i*2.8,1);}
      game.showCallout?.('LANCET PROCESSION // ENTER IN TIME',.9);return;
    }
    if(bar===4){
      state.stage='CHORD LOCK';spawn('node',-3.6,.8,-56,1);spawn('node',3.6,.8,-56,1);spawn('sentinel',0,-1.2,-63,1);
      game.showCallout?.('CHORD LOCK // HOLD BOTH VOICES',1);return;
    }
    if(bar===6){
      state.stage='CHOIR AISLE';
      for(let i=0;i<8;i++){const side=i%2?-1:1;spawn(i%4===0?'sentinel':'drone',side*(2.1+(i>>1)*1.35),-2+i*.72,-50-i*2.1,1);}
      return;
    }
    if(bar===8){
      state.stage='NEURAL HYMN';spawn('tank',0,-1.4,-66,2);spawn('node',0,2.3,-59,2);
      for(const d of [-1,1]){spawn('sentinel',d*4.8,.8,-60,2);spawn('drone',d*6.2,-1.8,-55,2);}
      game.showCallout?.('NEURAL HYMN // CATHEDRAL AWAKES',1);state.successPulse=1;return;
    }
    if(bar===10){
      state.stage='ROSE WINDOW';
      for(let i=0;i<8;i++){const a=i/8*TAU;spawn(i%4===0?'node':i%3===0?'prism':'drone',Math.cos(a)*6.2,Math.sin(a)*3.5-1,-53-i*1.8,2);}
      return;
    }
    if(bar===12){
      state.stage='SERAPH GATE';spawn('sentinel',-4.4,1.5,-61,2);spawn('sentinel',4.4,1.5,-61,2);spawn('tank',0,-1.7,-67,2);spawn('node',0,2.7,-58,2);
      game.showCallout?.('SERAPH GATE // RESOLVE THE CHORD',1);return;
    }
    if(bar===14){
      state.stage='FINAL NAVE';
      for(let i=0;i<9;i++){const a=i/9*TAU;spawn(i%3===0?'sentinel':i===4?'node':'drone',Math.cos(a)*(5.8+(i%2)*.8),Math.sin(a)*3.4-1,-54-i*2,2);}
      game.showCallout?.('FINAL NAVE // ASCEND',1);state.successPulse=1;
    }
  }

  function stageWave(area,bar){
    state.authoredWaves++;
    if(area===2)stageArea2(bar);
    else if(area===3)stageArea3(bar);
    else if(area===4)stageArea4(bar);
    else if(area===5)stageArea5(bar);
  }

  function playSuccessCue(area,count){
    const audio=game.audio;if(!audio?.ctx)return;
    const profile=window.__pulseAreaAudio?.profiles?.[area-1],root=profile?.root??audio.rootMidi??43;
    const t=audio.quantizedTime?.(.5)||audio.ctx.currentTime+.02;
    if(area===2){
      audio.osc?.('sine',audio.midi(root+31),t,.18,.025+Math.min(.012,count*.0015),audio.music,5,-.35);
      audio.osc?.('triangle',audio.midi(root+43),t+.03,.16,.017,audio.music,-4,.35);
    }else if(area===3){
      audio.osc?.('sine',audio.midi(root+24+(state.perfects%2?7:3)),t,.32,.026,audio.music,0,-.3);
      audio.osc?.('sine',audio.midi(root+36),t+.06,.38,.016,audio.music,6,.3);
    }else if(area===4){
      audio.osc?.('triangle',audio.midi(root+24),t,.13,.028,audio.music,-3,-.22);
      audio.osc?.('square',audio.midi(root+36+(state.perfects%3)*2),t+.04,.055,.011,audio.music,4,.22);
    }else if(area===5){
      [0,6,10,13].forEach((n,i)=>audio.osc?.(i%2?'triangle':'sine',audio.midi(root+24+n),t+i*.018,.28,.014+(i===0?.008:0),audio.music,(i-1.5)*3,(i-1.5)/2));
    }
  }

  const baseOpening=game.spawnOpening.bind(game);
  game.spawnOpening=()=>{
    const area=selectedArea();
    if(area===1||isDirect())return baseOpening();
    openingComposition(area);
  };

  const basePattern=game.spawnPattern.bind(game);
  game.spawnPattern=bar=>{
    const area=selectedArea(),active=shouldDirect();state.active=active;state.bar=bar;
    if(active&&bar%2===0){stageWave(area,bar);return;}
    return basePattern(bar);
  };

  const baseScoreTiming=game.scoreTiming.bind(game);
  game.scoreTiming=(q,count)=>{
    const result=baseScoreTiming(q,count);
    if(shouldDirect()&&q>.88){
      state.perfects++;state.successPulse=1;const area=selectedArea();playSuccessCue(area,count);
      const calls={2:'RESONANCE LOCK // TEMPLE ANSWERS',3:'CURRENT SYNC // COLOR DRIFTS',4:'BIOFEEDBACK // BRANCH RESPONDS',5:'CHOIR LOCK // HARMONIC GATE'};
      if(state.perfects===1||state.perfects===3){game.showCallout?.(calls[area],1);window.__pulseTopologyMorph?.trigger?.();}
    }
    return result;
  };

  const baseDestroyed=game.onEnemyDestroyed.bind(game);
  game.onEnemyDestroyed=enemy=>{
    const result=baseDestroyed(enemy);
    if(shouldDirect()&&!state.firstSignature&&enemy?.type===SIGNATURE_TYPE[selectedArea()]){
      state.firstSignature=true;state.successPulse=1;
      const calls={2:'RESONANCE FRACTURE // GLASS OPENS',3:'CURRENT CAPTURED // COLOR RELEASED',4:'BRANCH SEVERED // NETWORK RECOILS',5:'CHORD RESOLVED // NAVE RESPONDS'};
      game.showCallout?.(calls[selectedArea()],1);window.__pulseTopologyMorph?.trigger?.();
      game.audio.sectionStab?.(Math.min(4,game.section+1));
    }
    return result;
  };

  const baseRestart=game.restart.bind(game);
  game.restart=(...args)=>{const result=baseRestart(...args);reset(selectedArea());return result;};

  const baseWorldUpdate=game.world.update.bind(game.world);
  game.world.update=(dt,t,energy,sync=0)=>{
    const result=baseWorldUpdate(dt,t,energy,sync),area=selectedArea(),active=shouldDirect();state.active=active;
    if(!active)return result;

    state.arrival=lerp(state.arrival,0,1-Math.pow(.012,dt));
    state.successPulse=lerp(state.successPulse,0,1-Math.pow(.006,dt));
    const elapsed=Math.max(0,(game.time||0)-state.startedAt),intro=Math.max(0,1-clamp(elapsed/8,0,1)),cam=INTRO_CAMERA[area];
    game.camera.position.z=lerp(game.camera.position.z,8+intro*(cam.z-8),clamp(dt*2.2,0,1));
    game.camera.fov=lerp(game.camera.fov,66+intro*(cam.fov-66)+state.successPulse*.9,clamp(dt*2.1,0,1));game.camera.updateProjectionMatrix();

    const topo=window.__pulseTopologyWorlds,world=topo?.worlds?.[area-1];
    if(world?.root){
      const areaPhase=(area-2)*.7,breath=1+Math.sin(t*(.38+area*.045)+areaPhase)*(.005+area*.001)+state.successPulse*.014;
      world.root.scale.setScalar(breath);
      if(area===2)world.root.rotation.z=Math.sin(t*.09)*.016+state.successPulse*.008;
      else if(area===3)world.root.rotation.z=Math.sin(t*.13)*.028+state.successPulse*.01;
      else if(area===4)world.root.rotation.z=Math.sin(t*.17)*.018+Math.sin(t*.31)*.008+state.successPulse*.008;
      else world.root.rotation.z=Math.sin(t*.07)*.009+state.successPulse*.006;
    }

    const gen=window.__pulseGenerativeDirector;
    if(gen?.field?.mat){
      const floor=.1+clamp((game.bar||0)/16,0,1)*.065;
      gen.field.mat.opacity=Math.max(floor,Math.min(gen.field.mat.opacity,.25+state.successPulse*.04));
    }
    return result;
  };

  window.__pulseCampaignOpening={
    state,shouldDirect,
    stats:()=>({active:state.active,area:selectedArea(),bar:game.bar||0,stage:state.stage,perfects:state.perfects,firstSignature:state.firstSignature,authoredWaves:state.authoredWaves})
  };
});
