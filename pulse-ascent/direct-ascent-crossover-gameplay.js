import * as THREE from 'three';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const TAU=Math.PI*2;
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent&&window.__pulseDirectAscent&&window.__pulseDirector&&window.__pulseCampaign?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});

const AREA_NAMES=['SIGNAL BIRTH','GLASS TEMPLE','CHROMA SEA','ORGANIC CODE','NEURAL CATHEDRAL'];
const INVASION_TYPES=[
  ['drone','node'],
  ['prism','sentinel'],
  ['prism','drone'],
  ['sentinel','tank'],
  ['node','sentinel']
];

waitFor().then(game=>{
  if(game.__directAscentCrossoverGameplayInstalled)return;
  game.__directAscentCrossoverGameplayInstalled=true;
  const direct=window.__pulseDirectAscent,director=window.__pulseDirector;
  const state={invasions:0,legacyBossPatterns:0,lastSectionKey:'',lastBossPhaseKey:'',lastSourceArea:0};
  const active=()=>!!direct.active;
  const currentArea=()=>clamp((direct.state.area||1),1,5);
  const sourceArea=()=>Math.max(1,currentArea()-1);
  const spawnThreat=cfg=>director.spawnThreat(game,cfg);

  function invasionFormation(source,target){
    if(!active()||source===target)return false;
    const types=INVASION_TYPES[source-1]||INVASION_TYPES[0],count=target>=5?5:4;
    const z=-48;
    for(let i=0;i<count;i++){
      const a=i/Math.max(1,count-1)*Math.PI-Math.PI/2;
      const pos=new THREE.Vector3(Math.sin(a)*6.4,Math.cos(a)*2.6,z-i*3.2);
      game.spawnEnemy?.(types[i%types.length],pos,Math.max(0,target-1));
    }
    state.invasions++;state.lastSourceArea=source;
    game.showCallout?.(`LEGACY INVASION // ${AREA_NAMES[source-1]}`,.96);
    game.haptic?.([8,18,8]);
    const t=game.audio?.ctx?.currentTime;
    if(t!==undefined&&game.audio?.osc&&game.audio?.midi){
      const root=[43,46,41,45,48][source-1]||43;
      game.audio.osc('triangle',game.audio.midi(root+24),t,.18,.018,game.audio.fx,0,-.35);
      game.audio.osc('sine',game.audio.midi(root+31),t+.04,.24,.013,game.audio.fx,0,.35);
    }
    return true;
  }

  function legacyBossPattern(source,phase=1){
    if(!active()||!game.boss||game.boss.dead)return false;
    const a=game.world.avatar.position,accent=[0x58f5ff,0xffa454,0xff64d7,0x9eff78,0xb8c5ff][source-1]||0xffffff;
    const tag=`direct-crossover:${source}`;
    if(source===1){
      [-4.5,0,4.5].forEach((x,i)=>spawnThreat({x,y:a.y+(i-1)*1.15,z:-39-i*3,targetX:a.x+x*.55,targetY:a.y,phase,accent,tag}));
    }else if(source===2){
      for(let i=0;i<4;i++){const side=i%2?-1:1,y=(i-1.5)*1.05;spawnThreat({x:side*7,y:a.y+y,z:-38-i*3,targetX:a.x-side*1.8,targetY:a.y-y*.3,phase,accent,tag});}
    }else if(source===3){
      for(let i=0;i<4;i++){const ang=i/4*TAU+state.legacyBossPatterns*.45;spawnThreat({x:Math.cos(ang)*7,y:a.y+Math.sin(ang)*3.4,z:-39-i*3,targetX:a.x+Math.cos(ang+Math.PI/2)*1.7,targetY:a.y+Math.sin(ang+Math.PI/2)*1.2,phase,accent,tag});}
    }else if(source===4){
      const px=game.pointer?.x||0,py=game.pointer?.y||0;
      for(let i=0;i<3;i++){const ang=i/3*TAU;spawnThreat({x:Math.cos(ang)*7.5,y:a.y+Math.sin(ang)*3.5,z:-40-i*4,targetX:a.x+px*2.4+(i-1)*.45,targetY:a.y-py*1.4,phase,accent,tag});}
    }else{
      [[0,2.2],[0,-2.2],[3.1,0],[-3.1,0]].forEach(([ox,oy],i)=>spawnThreat({x:(i<2?0:(i===2?7:-7)),y:a.y+(i<2?(i===0?4:-4):0),z:-40-i*3,targetX:a.x+ox,targetY:a.y+oy,phase,accent,tag}));
    }
    state.legacyBossPatterns++;state.lastSourceArea=source;
    game.showCallout?.(`MEMORY ATTACK // ${AREA_NAMES[source-1]}`,.9);
    return true;
  }

  const frame=()=>{
    if(active()){
      const area=currentArea(),section=game.section||0;
      const sectionKey=`${area}:${section}`;
      // Later Direct Ascent Areas gain one playable invasion during the middle layers.
      if(area>=2&&(section===2||section===3)&&sectionKey!==state.lastSectionKey){
        state.lastSectionKey=sectionKey;
        invasionFormation(sourceArea(),area);
      }
      const boss=game.boss;
      if(boss&&!boss.dead&&area>=3){
        const phase=boss.phase||1,key=`${area}:${phase}`;
        if(key!==state.lastBossPhaseKey){
          state.lastBossPhaseKey=key;
          // One previous-Area signature attack on each boss phase; no extra attack spam per beat.
          setTimeout(()=>{if(active()&&game.boss===boss&&!boss.dead)legacyBossPattern(sourceArea(),phase);},260);
        }
      }
    }else{
      state.lastSectionKey='';state.lastBossPhaseKey='';
    }
    requestAnimationFrame(frame);
  };requestAnimationFrame(frame);

  window.__pulseDirectAscentCrossoverGameplay={
    invasionFormation,legacyBossPattern,state,
    stats:()=>({active:active(),area:currentArea(),invasions:state.invasions,legacyBossPatterns:state.legacyBossPatterns,lastSourceArea:state.lastSourceArea})
  };
});
