const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches||!!window.__pulseSettings?.state?.comfort;
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent&&window.__pulsePhraseMemoryFormationResponse?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});

waitFor().then(game=>{
  if(game.__phraseTacticalOpeningInstalled)return;game.__phraseTacticalOpeningInstalled=true;
  const state={opened:0,strong:0,weak:0,lastName:'',lastLeader:'',active:new Map()};
  const live=id=>(game.enemies||[]).filter(e=>!e.dead&&e.__formationId===id&&e.group);
  const formationFor=area=>{
    const groups=new Map();
    for(const e of game.enemies||[]){if(e.dead||!e.group||!e.__formationId||((e.__fusionModel?.userData?.areaIndex??area)!==area))continue;if(!groups.has(e.__formationId))groups.set(e.__formationId,[]);groups.get(e.__formationId).push(e);}
    return [...groups.entries()].sort((a,b)=>b[1].length-a[1].length)[0]||null;
  };
  function clear(id){
    const entry=state.active.get(id);if(!entry)return;
    for(const e of live(id)){delete e.__phraseTacticalOpening;delete e.__phraseExposure;delete e.__phraseChaos;}
    state.active.delete(id);
  }
  addEventListener('pulse:enemy-phrase-memory-begin',e=>{
    const d=e.detail||{},area=clamp((d.area||1)-1,0,4),picked=formationFor(area);if(!picked)return;
    const [id,members]=picked;clear(id);const leader=members.find(x=>x.__formationVoice===0)||members[0],strong=!!d.strong;
    const duration=strong?1500:1050,entry={id,area,strong,name:d.name||'',start:performance.now(),duration,leader};state.active.set(id,entry);
    for(const m of members)m.__phraseTacticalOpening=strong?'exposure':'fracture';
    if(strong){leader.__phraseExposure={name:d.name||'',expires:entry.start+duration,multiplier:1.35};state.strong++;game.showCallout?.('COUNTERPOINT OPENING // COMMAND EXPOSED',.78);}
    else{for(const m of members)if(m!==leader)m.__phraseChaos={name:d.name||'',expires:entry.start+duration};state.weak++;}
    state.opened++;state.lastName=d.name||'';state.lastLeader=leader.type||'';
    window.__pulseFormationLeaderReadability?.refresh?.();
  });
  addEventListener('pulse:enemy-phrase-memory-end',e=>{
    const area=clamp((e.detail?.area||1)-1,0,4);for(const [id,s] of [...state.active])if(s.area===area&&performance.now()>s.start+240)clear(id);
  });
  function tick(now){
    for(const [id,s] of [...state.active]){
      const members=live(id);if(!members.length||now>=s.start+s.duration){clear(id);continue;}
      const k=clamp((now-s.start)/s.duration,0,1),env=Math.sin(k*Math.PI)*(reduced()?.35:1);
      if(!s.strong){for(let i=0;i<members.length;i++){const m=members[i];if(m===s.leader)continue;const side=i%2?1:-1;m.group.position.x+=side*.0045*env;m.group.rotation.z+=side*.0015*env;}}
    }
    requestAnimationFrame(tick);
  }requestAnimationFrame(tick);
  window.__pulsePhraseTacticalOpening={stats:()=>({opened:state.opened,strong:state.strong,weak:state.weak,lastName:state.lastName,lastLeader:state.lastLeader,active:state.active.size}),clear};
});
