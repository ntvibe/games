import * as THREE from 'three';

const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent&&window.__pulseDirector&&window.__pulseBossTopology&&window.__pulseAreaAudio?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});

const PROFILES=[
  {name:'CIRCUIT SOVEREIGN',pattern:'BUS SWEEP',color:0x5ef5ff},
  {name:'PRISM ARCHON',pattern:'MIRROR FAN',color:0xffa45b},
  {name:'CHROMA BLOOM',pattern:'SPIRAL TIDE',color:0xff67d8},
  {name:'ORGANIC ORACLE',pattern:'HUNTER PULSE',color:0x9dff76},
  {name:'NEURAL SERAPH',pattern:'CATHEDRAL CROSS',color:0xb7c3ff}
];

waitFor().then(game=>{
  if(game.__areaBossDoctrineInstalled)return;game.__areaBossDoctrineInstalled=true;
  const director=window.__pulseDirector,audio=game.audio;
  const state={boss:null,area:0,patterns:0,lastPattern:'',lastStep:-1,phase:0};
  const selectedArea=()=>clamp((window.__pulseCampaign?.state?.selected||1)-1,0,4);
  const spawn=cfg=>director.spawnThreat(game,cfg);
  const avatar=()=>game.world.avatar.position;
  const announce=(text)=>{state.lastPattern=text;game.showCallout?.(text,.9);};

  const bossTone=(area,phase,t)=>{
    if(!audio.ctx)return;
    const p=window.__pulseAreaAudio.profiles?.[area];if(!p)return;
    const root=p.root+12+phase*2;
    if(area===0){audio.osc('square',audio.midi(root+12),t,.09,.018,audio.fx,-7,-.35);audio.osc('square',audio.midi(root+19),t+.035,.07,.012,audio.fx,6,.35);}
    else if(area===1){audio.osc('sine',audio.midi(root+24),t,.28,.028,audio.fx,0,-.45);audio.osc('triangle',audio.midi(root+31),t+.045,.22,.018,audio.fx,4,.45);}
    else if(area===2){audio.osc('sine',audio.midi(root+7),t,.55,.02,audio.music,-9,-.5);audio.osc('sine',audio.midi(root+19),t+.08,.48,.016,audio.fx,11,.5);}
    else if(area===3){audio.osc('sawtooth',audio.midi(root),t,.12,.018,audio.fx,-12,-.25);audio.osc('triangle',audio.midi(root+10),t+.055,.1,.014,audio.fx,9,.25);}
    else{[0,6,13].forEach((n,i)=>audio.osc(i===0?'triangle':'sine',audio.midi(root+12+n),t+i*.025,.38,.014,audio.fx,(i-1)*6,(i-1)*.42));}
  };

  const busSweep=(boss,step)=>{
    const a=avatar(),phase=boss.phase,gap=(state.patterns%3)-1;
    [-4.2,-1.4,1.4,4.2].forEach((lane,i)=>{if(i===gap+1)return;spawn({x:lane*1.25,y:a.y+(i%2?.9:-.9),z:-39-i*3,targetX:a.x+lane*.72,targetY:a.y,phase,accent:0x58f5ff,tag:'area-boss:bus-sweep'});});
    announce('BUS SWEEP // BREAK THE OPEN LANE');
  };

  const mirrorFan=(boss,step)=>{
    const a=avatar(),phase=boss.phase,spread=phase===1?3:phase===2?4:5;
    for(let i=0;i<spread;i++){const y=(i-(spread-1)/2)*1.15,side=i%2?-1:1;spawn({x:side*7,y:a.y+y,z:-38-i*3.2,targetX:a.x-side*(1.8+phase*.3),targetY:a.y-y*.32,phase,accent:i%2?0xffa454:0x6edcff,tag:'area-boss:mirror-fan'});}
    announce('MIRROR FAN // CROSS THE REFLECTION');
  };

  const spiralTide=(boss,step)=>{
    const a=avatar(),phase=boss.phase,n=3+phase;
    for(let i=0;i<n;i++){const ang=(state.patterns*.7+i/n*TAU),r=6.5+i*.35;spawn({x:Math.cos(ang)*r,y:a.y+Math.sin(ang)*3.4,z:-36-i*3.5,targetX:a.x+Math.cos(ang+Math.PI/2)*1.8,targetY:a.y+Math.sin(ang+Math.PI/2)*1.25,phase,accent:i%2?0xff64d7:0x62f4dc,tag:'area-boss:spiral-tide'});}
    announce('SPIRAL TIDE // FLOW WITH THE TURN');
  };

  const hunterPulse=(boss,step)=>{
    const a=avatar(),phase=boss.phase,leadX=a.x+(game.pointer?.x||0)*(2.2+phase*.45),leadY=a.y-(game.pointer?.y||0)*(1.2+phase*.2);
    const n=2+phase;for(let i=0;i<n;i++){const ang=i/n*TAU+state.patterns*.4;spawn({x:Math.cos(ang)*7.5,y:a.y+Math.sin(ang)*3.6,z:-38-i*4,targetX:leadX+(i-(n-1)/2)*.55,targetY:leadY+(i%2?.5:-.5),phase,accent:i%2?0x9eff78:0xff7d9c,tag:'area-boss:hunter-pulse'});}
    announce('HUNTER PULSE // BREAK YOUR VECTOR');
  };

  const cathedralCross=(boss,step)=>{
    const a=avatar(),phase=boss.phase,gap=state.patterns%4;
    const targets=[[0,2.3],[0,-2.3],[3.2,0],[-3.2,0],[0,0]];
    targets.forEach(([ox,oy],i)=>{if(i===gap)return;const ang=i/targets.length*TAU+phase*.22;spawn({x:Math.cos(ang)*8,y:a.y+Math.sin(ang)*4,z:-40-i*3.1,targetX:a.x+ox,targetY:a.y+oy,phase,accent:i%2?0xb8c5ff:0xff62d1,tag:'area-boss:cathedral-cross'});});
    announce('CATHEDRAL CROSS // READ THE SILENT QUADRANT');
  };

  const patterns=[busSweep,mirrorFan,spiralTide,hunterPulse,cathedralCross];

  const patchBoss=boss=>{
    if(!boss||boss.__areaBossDoctrineInstalled)return false;
    boss.__areaBossDoctrineInstalled=true;state.boss=boss;state.area=selectedArea();state.phase=boss.phase;
    const baseBeat=boss.beat.bind(boss);
    boss.beat=step=>{
      baseBeat(step);if(boss.dead)return;
      const s=step%16,phase=boss.phase;state.phase=phase;state.lastStep=s;
      // One area-signature attack per bar in phase 1, twice in later phases. Offset from
      // the base choreography so the patterns layer rhythmically rather than all firing together.
      const trigger=phase===1?s===2:phase===2?(s===2||s===10):(s===2||s===10);
      if(trigger){state.patterns++;patterns[state.area](boss,s);bossTone(state.area,phase,audio.ctx?.currentTime||0);}
      else if((s===0||s===8)&&audio.ctx)bossTone(state.area,phase,audio.ctx.currentTime);
    };
    game.showCallout?.(`${PROFILES[state.area].name} // ${PROFILES[state.area].pattern}`,.95);
    return true;
  };

  const tick=()=>{if(game.boss&&!game.boss.dead&&game.boss!==state.boss)patchBoss(game.boss);requestAnimationFrame(tick);};tick();

  window.__pulseAreaBossDoctrine={
    profiles:PROFILES,state,patchBoss,
    stats:()=>({patched:!!state.boss?.__areaBossDoctrineInstalled,area:state.area+1,name:PROFILES[state.area]?.name||'',pattern:PROFILES[state.area]?.pattern||'',patterns:state.patterns,lastPattern:state.lastPattern,phase:state.phase,lastStep:state.lastStep})
  };
});
