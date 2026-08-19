const STORAGE='pulse-ascent-direct-ascent-v1';
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent&&window.__pulseCampaign&&window.__pulseMasteryProgression?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const load=()=>{try{return JSON.parse(localStorage.getItem(STORAGE)||'{}')}catch{return {}}};
const save=v=>{try{localStorage.setItem(STORAGE,JSON.stringify(v))}catch{}};

function installStyle(){
  if(document.querySelector('#directAscentStyle'))return;
  const style=document.createElement('style');style.id='directAscentStyle';style.textContent=`
    .direct-ascent-launch{width:100%;margin:2px 0 9px;border:1px solid #ff6bd744;background:linear-gradient(90deg,#070f18d9,#180918d9);padding:8px 10px;color:#dffcff;text-align:left;font:800 8px/1.1 system-ui;letter-spacing:.12em}
    .direct-ascent-launch small{display:block;margin-top:3px;color:#718e99;font:600 6px/1.2 system-ui;letter-spacing:.1em}.direct-ascent-launch:disabled{opacity:.3}
    .direct-ascent-chip{position:absolute;left:50%;top:max(112px,calc(env(safe-area-inset-top) + 112px));transform:translateX(-50%);padding:5px 9px;border:1px solid #ff70da55;background:#060510cc;color:#dffcff;font:800 7px/1 system-ui;letter-spacing:.13em;pointer-events:none;white-space:nowrap}
    .direct-ascent-transition{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none;background:radial-gradient(circle at center,#15051a66,#01020700 48%);z-index:18}.direct-ascent-transition.hidden{display:none}.direct-ascent-transition div{text-align:center}.direct-ascent-transition small{display:block;font:700 7px/1 system-ui;letter-spacing:.2em;color:#7ca6b2}.direct-ascent-transition b{display:block;margin-top:7px;font:900 20px/1 system-ui;letter-spacing:.1em;color:#efffff}
    .direct-ascent-result{margin:8px 0 0;padding:8px;border:1px solid #ff70da33;background:#08040db5;display:grid;grid-template-columns:1fr 1fr;gap:8px}.direct-ascent-result span{display:block;font:700 6px/1 system-ui;letter-spacing:.14em;color:#78919b}.direct-ascent-result b{display:block;margin-top:4px;font:900 12px/1 system-ui;color:#f3ffff}
    @media(max-width:760px){.direct-ascent-chip{top:max(100px,calc(env(safe-area-inset-top) + 100px));font-size:6px}.direct-ascent-transition b{font-size:17px}}
  `;document.head.appendChild(style);
}

waitFor().then(game=>{
  if(game.__directAscentInstalled)return;game.__directAscentInstalled=true;installStyle();
  const campaign=window.__pulseCampaign,record=load();
  const state={active:false,area:1,score:0,areaStartScore:0,damage:0,bestScore:record.bestScore||0,bestDamage:Number.isFinite(record.bestDamage)?record.bestDamage:null,transitioning:false};
  const api=window.__pulseDirectAscent={state,get active(){return state.active;},isUnlocked:()=>Object.keys(campaign.state.completed||{}).filter(k=>campaign.state.completed[k]).length>=5,stats:()=>({...state,unlocked:api.isUnlocked()})};

  const host=document.querySelector('#start .start-card'),startBtn=document.querySelector('#startBtn');
  const launch=document.createElement('button');launch.id='directAscentBtn';launch.className='direct-ascent-launch';
  host?.insertBefore(launch,startBtn);
  const chip=document.createElement('div');chip.id='directAscentChip';chip.className='direct-ascent-chip hidden';document.querySelector('#hud')?.appendChild(chip);
  const transition=document.createElement('div');transition.id='directAscentTransition';transition.className='direct-ascent-transition hidden';transition.innerHTML='<div><small>DIRECT ASCENT // LINK</small><b>AREA 02</b></div>';document.body.appendChild(transition);

  const refreshLaunch=()=>{
    const unlocked=api.isUnlocked();launch.disabled=!unlocked||state.active;
    launch.innerHTML=unlocked?`DIRECT ASCENT <small>5-AREA GAUNTLET · LIMITED RECOVERY · BEST ${Number(state.bestScore||0).toLocaleString()}</small>`:`DIRECT ASCENT <small>LOCKED · CLEAR ALL 5 AREAS</small>`;
  };
  const refreshChip=()=>{if(!state.active){chip.classList.add('hidden');return;}chip.classList.remove('hidden');chip.textContent=`DIRECT ASCENT · AREA ${state.area}/5 · ${Math.floor(game.score||0).toLocaleString()}`;};
  refreshLaunch();

  const begin=async()=>{
    if(state.active||!api.isUnlocked())return false;
    state.active=true;state.area=1;state.score=0;state.areaStartScore=0;state.damage=0;state.transitioning=false;
    campaign.state.selected=1;campaign.state.render?.();
    document.querySelectorAll('#levelSelect button').forEach(b=>b.disabled=true);refreshLaunch();refreshChip();
    await game.start();game.showCallout?.('DIRECT ASCENT // NO FULL RECOVERY',1);return true;
  };
  api.begin=begin;launch.addEventListener('click',e=>{e.preventDefault();begin();});

  const baseTakeHit=game.takeHit.bind(game);game.takeHit=(...args)=>{if(state.active)state.damage++;return baseTakeHit(...args);};
  const baseRestart=game.restart.bind(game);
  const restartInto=(next,carry)=>{
    campaign.state.selected=next;campaign.state.render?.();
    baseRestart();
    game.score=state.score;
    game.sync=clamp(Math.max(38,carry.sync*.78),0,100);
    game.evolution=clamp(carry.evolution+1,1,6);
    game.overdrive=clamp(carry.overdrive*.45,0,100);
    game.world?.setEvolution?.(game.evolution);game.updateHud?.();
    state.area=next;state.areaStartScore=state.score;state.transitioning=false;transition.classList.add('hidden');refreshChip();
    game.showCallout?.(`DIRECT ASCENT // AREA ${String(next).padStart(2,'0')}`,1);
  };

  const renderFinal=()=>{
    const card=document.querySelector('.result-card'),grid=card?.querySelector('.result-grid');if(!card||!grid)return;
    let panel=card.querySelector('.direct-ascent-result');if(!panel){panel=document.createElement('div');panel.className='direct-ascent-result';grid.insertAdjacentElement('afterend',panel);}
    panel.innerHTML=`<div><span>DIRECT SCORE</span><b>${Math.floor(state.score).toLocaleString()}</b></div><div><span>DAMAGE</span><b>${state.damage}</b></div><div><span>BEST SCORE</span><b>${Math.floor(state.bestScore).toLocaleString()}</b></div><div><span>BEST DAMAGE</span><b>${state.bestDamage??state.damage}</b></div>`;
  };

  const baseFinish=game.finish.bind(game);game.finish=(...args)=>{
    if(!state.active)return baseFinish(...args);
    const area=clamp(campaign.state.selected||state.area,1,5),carry={sync:game.sync||38,evolution:game.evolution||1,overdrive:game.overdrive||0};
    state.score=Math.max(state.score,Math.floor(game.score||0));state.area=area;
    const result=baseFinish(...args);
    if(area<5){
      state.transitioning=true;document.querySelector('#result')?.classList.add('hidden');
      transition.querySelector('b').textContent=`AREA ${String(area+1).padStart(2,'0')}`;transition.classList.remove('hidden');
      game.haptic?.([12,28,12]);setTimeout(()=>restartInto(area+1,carry),850);return result;
    }
    state.active=false;state.transitioning=false;
    state.bestScore=Math.max(state.bestScore||0,state.score);
    state.bestDamage=state.bestDamage===null?state.damage:Math.min(state.bestDamage,state.damage);save({bestScore:state.bestScore,bestDamage:state.bestDamage,date:new Date().toISOString()});
    const h2=document.querySelector('.result-card h2');if(h2)h2.textContent='DIRECT ASCENT COMPLETE';
    const eyebrow=document.querySelector('.result-card .eyebrow');if(eyebrow)eyebrow.textContent='FIVE-AREA TRANSMISSION COMPLETE';
    const btn=document.querySelector('#restartBtn span');if(btn)btn.textContent='RESTART AREA 01';
    campaign.state.selected=1;campaign.state.render?.();document.querySelectorAll('#levelSelect button').forEach(b=>b.disabled=false);
    renderFinal();refreshLaunch();refreshChip();game.showCallout?.('DIRECT ASCENT // COMPLETE',1);return result;
  };

  const tick=()=>{if(state.active)refreshChip();requestAnimationFrame(tick)};requestAnimationFrame(tick);
});
