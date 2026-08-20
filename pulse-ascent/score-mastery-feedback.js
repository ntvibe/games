const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});

waitFor().then(game=>{
  if(game.__scoreMasteryFeedbackInstalled)return;game.__scoreMasteryFeedbackInstalled=true;
  const state={skillChain:0,bestSkillChain:0,lastSkillAt:-99,totalRewards:0,totalRewardPoints:0,lastLabel:'',feed:[]};
  const hud=document.querySelector('#hud');if(!hud)return;

  const root=document.createElement('div');root.id='masteryFeedback';root.innerHTML=`<div class="mf-flow"><span>FLOW</span><b id="mfFlow">x1.00</b><i></i><span>SKILL</span><b id="mfSkill">0</b></div><div id="mfFeed" class="mf-feed"></div>`;hud.appendChild(root);
  const style=document.createElement('style');style.textContent=`
    #masteryFeedback{position:absolute;left:max(16px,env(safe-area-inset-left));top:max(56px,calc(env(safe-area-inset-top) + 42px));width:min(190px,46vw);pointer-events:none;text-shadow:none;font-family:Inter,system-ui,sans-serif}
    .mf-flow{display:flex;align-items:baseline;gap:6px;height:18px;color:#6e9baa;font-size:6px;font-weight:800;letter-spacing:.15em}
    .mf-flow b{font-size:10px;color:#e7fbff;letter-spacing:.06em}.mf-flow i{width:1px;height:9px;background:#406570;margin:0 2px}
    #mfFlow.hot{color:#fff}#mfSkill.hot{color:#ffb9e8}.mf-feed{display:flex;flex-direction:column;gap:2px;align-items:flex-start}
    .mf-reward{max-width:100%;display:flex;gap:6px;align-items:center;padding:3px 5px;border-left:1px solid #72ddef66;background:#02070cb3;color:#8db1bd;font-size:6px;font-weight:800;letter-spacing:.09em;white-space:nowrap;opacity:0;transform:translateX(-5px);transition:opacity .12s,transform .12s}
    .mf-reward.on{opacity:.84;transform:none}.mf-reward.perfect{border-left-color:#ff74d4;color:#f7d9ef}.mf-reward.route{border-left-color:#ffc56c;color:#f3dab2}.mf-reward.weapon{border-left-color:#c18bff;color:#ded0ff}.mf-reward b{color:#fff;font-size:7px}.mf-reward.out{opacity:0;transform:translateY(-3px)}
    @media(max-width:600px){#masteryFeedback{top:max(48px,calc(env(safe-area-inset-top) + 36px));width:145px}.mf-flow{gap:4px}.mf-reward{font-size:5px;padding:2px 4px}}
    @media(prefers-reduced-motion:reduce){.mf-reward{transition:none}}
  `;document.head.appendChild(style);
  const flowEl=root.querySelector('#mfFlow'),skillEl=root.querySelector('#mfSkill'),feedEl=root.querySelector('#mfFeed');

  function renderFeed(){
    feedEl.innerHTML='';for(const item of state.feed){const row=document.createElement('div');row.className=`mf-reward on ${item.kind||''}`;row.innerHTML=`<span>${item.label}</span>${item.points?`<b>+${Math.round(item.points).toLocaleString()}</b>`:''}`;feedEl.appendChild(row);}
  }

  function reward(detail={}){
    const now=game.time||0,label=(detail.label||'SKILL').toUpperCase(),points=Math.max(0,Math.round(detail.points||0)),quality=clamp(detail.quality??.7,0,1),kind=detail.kind||(quality>.88?'perfect':'');
    if(now-state.lastSkillAt>3.1)state.skillChain=0;
    state.skillChain++;state.bestSkillChain=Math.max(state.bestSkillChain,state.skillChain);state.lastSkillAt=now;state.totalRewards++;state.totalRewardPoints+=points;state.lastLabel=label;
    state.feed.unshift({label,points,quality,kind,at:now});state.feed=state.feed.slice(0,3);renderFeed();
    skillEl.textContent=String(state.skillChain);skillEl.classList.toggle('hot',state.skillChain>=3);
    root.animate?.([{transform:'translateX(0)'},{transform:'translateX(2px)'},{transform:'translateX(0)'}],{duration:reducedMotion()?0:110});
  }

  function reset(){state.skillChain=0;state.lastSkillAt=-99;skillEl.textContent='0';skillEl.classList.remove('hot');}
  addEventListener('pulse:skill-reward',e=>reward(e.detail||{}));
  addEventListener('pulse:traversal-gate',e=>{const d=e.detail||{};if(d.success)reward({label:d.risk?'OVERDRIVE GATE':'RHYTHM GATE',points:d.award||0,quality:d.quality??.7,kind:'route'});});
  addEventListener('pulse:route-mastered',e=>{const d=e.detail||{};reward({label:'ROUTE MASTERED',points:d.award||0,quality:1,kind:'route'});});

  const baseScoreTiming=game.scoreTiming.bind(game);
  game.scoreTiming=(q,count)=>{const before=game.score,result=baseScoreTiming(q,count);if(q>.88)reward({label:count===8?'PERFECT OCTAVE':'PERFECT SYNC',points:Math.max(0,game.score-before),quality:q,kind:'perfect'});return result;};
  const baseTakeHit=game.takeHit.bind(game);
  game.takeHit=(...args)=>{reset();return baseTakeHit(...args);};
  const baseRestart=game.restart.bind(game);
  game.restart=(...args)=>{reset();state.feed=[];renderFeed();return baseRestart(...args);};

  const tick=()=>{
    const now=game.time||0,mult=Math.max(1,game.mult||1);flowEl.textContent=`x${mult.toFixed(2)}`;flowEl.classList.toggle('hot',mult>=3);
    if(state.skillChain&&now-state.lastSkillAt>3.1)reset();
    const next=state.feed.filter(x=>now-x.at<4.2);if(next.length!==state.feed.length){state.feed=next;renderFeed();}
    requestAnimationFrame(tick);
  };requestAnimationFrame(tick);

  window.__pulseScoreMasteryFeedback={reward,reset,stats:()=>({skillChain:state.skillChain,bestSkillChain:state.bestSkillChain,totalRewards:state.totalRewards,totalRewardPoints:state.totalRewardPoints,lastLabel:state.lastLabel,feed:state.feed.map(x=>({label:x.label,points:x.points,kind:x.kind})),flow:Math.max(1,game.mult||1)})};
  import('./flow-resonance.js').catch(()=>{});
});
