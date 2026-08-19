const STORAGE='pulse-ascent-mastery-v1';
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent&&window.__pulseCampaign&&window.__pulseTraversalMastery?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const load=()=>{try{return JSON.parse(localStorage.getItem(STORAGE)||'{}')}catch{return {}}};
const save=v=>{try{localStorage.setItem(STORAGE,JSON.stringify(v))}catch{}};
const emptyRun=area=>({area,attempts:0,hits:0,riskHits:0,perfectHits:0,routeSections:new Set(),scoreStart:0});

function grade(areaData={}){
  const routes=areaData.bestRoutes||0,hits=areaData.bestHits||0;
  if(routes>=3&&hits>=9)return {id:'platinum',label:'PLATINUM',mark:'◆'};
  if(routes>=2)return {id:'gold',label:'GOLD',mark:'●'};
  if(routes>=1)return {id:'silver',label:'SILVER',mark:'◐'};
  if(areaData.clears>0)return {id:'bronze',label:'BRONZE',mark:'○'};
  return {id:'none',label:'UNCLEARED',mark:'·'};
}

function installStyle(){
  if(document.querySelector('#masteryProgressionStyle'))return;
  const style=document.createElement('style');style.id='masteryProgressionStyle';style.textContent=`
    .mastery-medal{display:block;margin-top:4px;font:800 7px/1 system-ui;letter-spacing:.11em;color:#8aa4ad}
    .mastery-medal[data-grade="silver"]{color:#b6dce8}.mastery-medal[data-grade="gold"]{color:#ffd38a}.mastery-medal[data-grade="platinum"]{color:#d7fbff;text-shadow:0 0 8px #8ff8ff55}
    .mastery-result{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:10px 0 2px;padding:8px;border:1px solid #7cefff2e;background:#020812b8}
    .mastery-result div{min-width:0}.mastery-result span{display:block;font:700 7px/1.2 system-ui;letter-spacing:.12em;color:#668692}.mastery-result b{display:block;margin-top:4px;font:800 12px/1 system-ui;color:#e7fbff}.mastery-result b[data-grade="gold"]{color:#ffd38a}.mastery-result b[data-grade="platinum"]{color:#d7fbff;text-shadow:0 0 8px #8ff8ff55}
    @media(max-width:760px){.mastery-result{margin-top:8px;padding:7px}.mastery-result b{font-size:11px}}
  `;document.head.appendChild(style);
}

waitFor().then(game=>{
  if(game.__masteryProgressionInstalled)return;game.__masteryProgressionInstalled=true;installStyle();
  const campaign=window.__pulseCampaign,state=load();state.areas=state.areas||{};
  let run=emptyRun(campaign.state.selected||1),annotating=false;

  const areaData=id=>state.areas[id]||(state.areas[id]={clears:0,bestRoutes:0,bestHits:0,bestRiskHits:0,bestPerfectHits:0,bestScore:0});
  const persist=()=>save({areas:state.areas});

  function annotateLevelSelect(){
    if(annotating)return;annotating=true;
    const buttons=[...document.querySelectorAll('#levelSelect button')];
    buttons.forEach((button,index)=>{
      const id=index+1,data=areaData(id),g=grade(data);let badge=button.querySelector('.mastery-medal');
      if(!badge){badge=document.createElement('span');badge.className='mastery-medal';button.appendChild(badge);}
      badge.dataset.grade=g.id;badge.textContent=data.clears?`${g.mark} ${g.label} · ${data.bestRoutes}/3 ROUTES`:'· NO CLEAR';
    });
    annotating=false;
  }

  const baseRender=campaign.state.render;
  if(baseRender){campaign.state.render=()=>{baseRender();annotateLevelSelect();};campaign.state.render();}else annotateLevelSelect();
  const levelSelect=document.querySelector('#levelSelect');
  if(levelSelect)new MutationObserver(()=>queueMicrotask(annotateLevelSelect)).observe(levelSelect,{childList:true,subtree:false});

  function resetRun(){run=emptyRun(campaign.state.selected||1);run.scoreStart=game.score||0;}
  const baseStart=game.start.bind(game);game.start=async(...args)=>{resetRun();return baseStart(...args);};
  const baseRestart=game.restart.bind(game);game.restart=(...args)=>{const result=baseRestart(...args);resetRun();return result;};

  addEventListener('pulse:traversal-gate',event=>{
    const d=event.detail||{};if(!d.area)return;if(run.area!==d.area)run=emptyRun(d.area);
    run.attempts++;if(d.success){run.hits++;if(d.risk)run.riskHits++;if((d.quality||0)>=.88)run.perfectHits++;}
  });
  addEventListener('pulse:route-mastered',event=>{
    const d=event.detail||{};if(!d.area)return;if(run.area!==d.area)run=emptyRun(d.area);run.routeSections.add(d.section||0);
  });

  function renderResult(id,data,g){
    const card=document.querySelector('.result-card'),grid=card?.querySelector('.result-grid');if(!card||!grid)return;
    let panel=card.querySelector('.mastery-result');if(!panel){panel=document.createElement('div');panel.className='mastery-result';grid.insertAdjacentElement('afterend',panel);}
    const routes=run.routeSections.size,hits=run.hits,attempts=Math.max(run.attempts,9);
    panel.innerHTML=`<div><span>AREA MASTERY</span><b data-grade="${g.id}">${g.mark} ${g.label}</b></div><div><span>RHYTHM ROUTES</span><b>${routes}/3 · ${hits}/${attempts} GATES</b></div>`;
    if(g.id==='platinum')game.showCallout?.('AREA PLATINUM // SIGNAL COMPLETE',1);
  }

  const baseFinish=game.finish.bind(game);
  game.finish=(...args)=>{
    const id=clamp(campaign.state.selected||run.area||1,1,5),data=areaData(id),runScore=Math.max(0,Math.floor((game.score||0)-(run.scoreStart||0)));
    data.clears=(data.clears||0)+1;data.bestRoutes=Math.max(data.bestRoutes||0,run.routeSections.size);data.bestHits=Math.max(data.bestHits||0,run.hits);data.bestRiskHits=Math.max(data.bestRiskHits||0,run.riskHits);data.bestPerfectHits=Math.max(data.bestPerfectHits||0,run.perfectHits);data.bestScore=Math.max(data.bestScore||0,runScore);persist();
    const result=baseFinish(...args),g=grade(data);renderResult(id,data,g);annotateLevelSelect();return result;
  };

  window.__pulseMasteryProgression={
    grade:id=>grade(areaData(clamp(id,1,5))),
    getArea:id=>({...areaData(clamp(id,1,5))}),
    stats:()=>({area:run.area,attempts:run.attempts,hits:run.hits,routes:run.routeSections.size,riskHits:run.riskHits,perfectHits:run.perfectHits,areas:Object.fromEntries(Object.entries(state.areas).map(([id,data])=>[id,{...data,grade:grade(data).label}]))})
  };
});