import * as THREE from 'three';

const STORAGE='pulse-ascent-onboarding-v1';
const waitForGame=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const load=()=>{try{return JSON.parse(localStorage.getItem(STORAGE)||'{}')}catch{return {}}};
const save=value=>{try{localStorage.setItem(STORAGE,JSON.stringify(value))}catch{}};

const STEPS=[
  {tag:'VECTOR',title:'DRAG TO AIM',body:'Move the reticle through the field. Your pilot and camera follow the signal.'},
  {tag:'LOCK',title:'HOLD ON A TARGET',body:'Press and hold while painting across an enemy to acquire a lock.'},
  {tag:'RHYTHM',title:'RELEASE ON THE PULSE',body:'Release as the beat marker contracts. ON GRID or PERFECT builds SYNC.'},
  {tag:'ARRAY',title:'PAINT 4+ TARGETS',body:'Keep holding and sweep across several enemies, then release the whole lock array.'},
  {tag:'POWER',title:'TRIGGER OVERDRIVE',body:'The calibration core is charged. Fire OVERDRIVE to complete synchronization.'}
];

waitForGame().then(game=>{
  if(game.__onboardingInstalled)return;
  game.__onboardingInstalled=true;
  const persisted=load();
  const state={
    active:false,step:clamp(Number(persisted.step)||0,0,STEPS.length-1),completed:!!persisted.completed,dismissed:!!persisted.dismissed,
    forceNext:false,moved:0,lastX:0,lastY:0,attempts:0,startedAt:0,finishing:false
  };

  const style=document.createElement('style');
  style.textContent=`
    .calibration-card{position:fixed;z-index:54;left:50%;bottom:max(112px,calc(env(safe-area-inset-bottom) + 102px));transform:translateX(-50%);width:min(360px,calc(100vw - 30px));padding:11px 12px 10px;border:1px solid #69efff55;background:linear-gradient(135deg,#03111be8,#080817e8);backdrop-filter:blur(10px);box-shadow:0 16px 48px #0009;pointer-events:none;transition:opacity .18s ease,transform .18s ease}.calibration-card.hidden{opacity:0;transform:translate(-50%,12px);visibility:hidden}.calibration-top{display:flex;align-items:center;gap:8px}.calibration-step{font:900 7px/1 system-ui;letter-spacing:.18em;color:#69eaff;white-space:nowrap}.calibration-progress{height:2px;flex:1;background:#19313a;overflow:hidden}.calibration-progress i{display:block;height:100%;width:20%;background:linear-gradient(90deg,#58efff,#ff63d7);transition:width .22s ease}.calibration-beat{width:20px;height:20px;border:1px solid #76f4ff66;border-radius:50%;display:grid;place-items:center}.calibration-beat i{width:5px;height:5px;border-radius:50%;background:#eaffff;transform:scale(var(--calibration-pulse,1));opacity:var(--calibration-alpha,.7);box-shadow:0 0 8px #6ff4ff66}.calibration-card h3{margin:7px 0 4px;color:#f5ffff;font:900 14px/1 system-ui;letter-spacing:.09em}.calibration-card p{margin:0;color:#8fb0b9;font:650 9px/1.35 system-ui;letter-spacing:.02em;max-width:310px}.calibration-footer{display:flex;justify-content:space-between;align-items:center;margin-top:8px}.calibration-feedback{font:800 7px/1 system-ui;letter-spacing:.12em;color:#ff8edb;min-height:7px}.calibration-skip{pointer-events:auto;border:0;background:transparent;color:#65848d;padding:6px 0 6px 12px;font:800 7px/1 system-ui;letter-spacing:.12em;touch-action:manipulation}.calibration-start{margin-top:7px!important}.calibration-complete h3{color:#fff}.calibration-complete .calibration-progress i{width:100%!important}.calibration-complete .calibration-feedback{color:#7ef7ff}
    @media (max-height:620px){.calibration-card{bottom:max(70px,calc(env(safe-area-inset-bottom) + 64px));padding:8px 10px}.calibration-card p{display:none}.calibration-card h3{margin-bottom:2px}}
  `;
  document.head.appendChild(style);

  const card=document.createElement('div');card.id='calibrationCard';card.className='calibration-card hidden';card.innerHTML=`
    <div class="calibration-top"><span class="calibration-step"></span><div class="calibration-progress"><i></i></div><div class="calibration-beat"><i></i></div></div>
    <h3></h3><p></p><div class="calibration-footer"><span class="calibration-feedback"></span><button class="calibration-skip" type="button">SKIP CALIBRATION</button></div>`;
  document.body.appendChild(card);
  const els={step:card.querySelector('.calibration-step'),bar:card.querySelector('.calibration-progress i'),title:card.querySelector('h3'),body:card.querySelector('p'),feedback:card.querySelector('.calibration-feedback'),skip:card.querySelector('.calibration-skip')};

  const startCard=document.querySelector('#start .start-card');
  const trainingBtn=document.createElement('button');trainingBtn.id='trainingBtn';trainingBtn.type='button';trainingBtn.className='start-btn compact calibration-start';trainingBtn.innerHTML='<span>SIGNAL CALIBRATION</span><small>PLAYABLE TRAINING</small>';
  const installBtn=document.querySelector('#installBtn');if(startCard)startCard.insertBefore(trainingBtn,installBtn||startCard.querySelector('.legal-note'));

  const persist=()=>save({step:state.step,completed:state.completed,dismissed:state.dismissed});
  const ensureTargets=(count=6)=>{
    const alive=game.enemies.filter(e=>!e.dead&&e.type!=='danger').length;if(alive>=count)return;
    for(let i=alive;i<count;i++){
      const a=i/Math.max(count,1)*Math.PI*2;
      game.spawnEnemy('drone',new THREE.Vector3(Math.cos(a)*5.2,Math.sin(a)*2.6,-28-i*2.4));
    }
  };
  const render=(feedback='')=>{
    const s=STEPS[state.step]||STEPS.at(-1);els.step.textContent=`CALIBRATION ${state.step+1}/${STEPS.length} · ${s.tag}`;els.bar.style.width=`${((state.step+1)/STEPS.length)*100}%`;els.title.textContent=s.title;els.body.textContent=s.body;els.feedback.textContent=feedback;
  };
  const enterStep=(index,feedback='')=>{
    state.step=clamp(index,0,STEPS.length-1);state.attempts=0;persist();render(feedback);
    if(state.step===1||state.step===2)ensureTargets(5);
    if(state.step===3)ensureTargets(7);
    if(state.step===4){game.overdrive=100;game.updateHud?.();}
  };
  const advance=(feedback='SYNCED')=>{
    if(!state.active||state.finishing)return;
    if(state.step>=STEPS.length-1)return finish();
    game.haptic?.(8);enterStep(state.step+1,feedback);
  };
  const resetRun=()=>{
    if(!game.running)return;
    try{game.clearLocks?.();}catch{}
    game.restart?.();
  };
  const finish=()=>{
    if(state.finishing)return;state.finishing=true;state.completed=true;state.dismissed=false;persist();
    card.classList.add('calibration-complete');els.step.textContent='CALIBRATION COMPLETE';els.bar.style.width='100%';els.title.textContent='SIGNAL SYNCHRONIZED';els.body.textContent='Core controls learned. Entering Area 01 with a clean score state.';els.feedback.textContent='LIVE RUN ARMED';game.showCallout?.('CALIBRATION COMPLETE',1);
    setTimeout(()=>{state.active=false;state.finishing=false;card.classList.add('hidden');card.classList.remove('calibration-complete');resetRun();},850);
  };
  const skip=()=>{
    if(!state.active)return;state.active=false;state.dismissed=true;persist();card.classList.add('hidden');game.showCallout?.('CALIBRATION SKIPPED',.65);resetRun();
  };
  const begin=(forced=false)=>{
    if(!game.running||state.active)return false;
    state.active=true;state.finishing=false;state.startedAt=game.time||0;state.moved=0;state.lastX=game.pointer.x||0;state.lastY=game.pointer.y||0;
    if(forced){state.step=0;state.dismissed=false;}
    card.classList.remove('hidden','calibration-complete');enterStep(state.step);
    ensureTargets(state.step>=3?7:5);game.showCallout?.('SIGNAL CALIBRATION',.9);return true;
  };

  els.skip.onclick=skip;
  trainingBtn.onclick=()=>{state.forceNext=true;window.__pulseCampaign?.select?.(1);document.querySelector('#startBtn')?.click();};

  const baseStart=game.start.bind(game);
  game.start=async(...args)=>{
    const forced=state.forceNext;state.forceNext=false;
    const result=await baseStart(...args);
    if(forced||(!state.completed&&!state.dismissed))setTimeout(()=>begin(forced),180);
    return result;
  };

  const basePointerMove=game.pointerMove.bind(game);
  game.pointerMove=e=>{
    const beforeX=game.pointer.x,beforeY=game.pointer.y,result=basePointerMove(e);
    if(state.active&&state.step===0){state.moved+=Math.hypot(game.pointer.x-beforeX,game.pointer.y-beforeY);if(state.moved>.42)advance('VECTOR ACQUIRED');}
    return result;
  };
  const baseTryLock=game.tryLock.bind(game);
  game.tryLock=(force=false)=>{
    const before=game.targetsLocked.length,result=baseTryLock(force);
    if(state.active&&state.step===1&&game.targetsLocked.length>before)advance('LOCK ACQUIRED');
    return result;
  };
  const baseScoreTiming=game.scoreTiming.bind(game);
  game.scoreTiming=(q,count)=>{
    const result=baseScoreTiming(q,count);
    if(!state.active)return result;
    if(state.step===2){state.attempts++;if(q>.64)advance(q>.88?'PERFECT SYNC':'ON GRID');else render('EARLY/LATE · TRY AGAIN');}
    else if(state.step===3){if(count>=4)advance(`${count}X ARRAY RELEASE`);else render(`${count}X LOCK · BUILD 4+`);}
    return result;
  };
  const baseTrigger=game.triggerOverdrive.bind(game);
  game.triggerOverdrive=(...args)=>{
    const armed=state.active&&state.step===4&&game.overdrive>=100,result=baseTrigger(...args);if(armed)setTimeout(finish,60);return result;
  };
  const baseTakeHit=game.takeHit.bind(game);
  game.takeHit=(...args)=>state.active?undefined:baseTakeHit(...args);

  // Keep the training readable if the player takes a long time: remove danger projectiles
  // and replenish a small target set, while leaving the actual rhythm/audio loop running.
  const maintenance=()=>{
    if(state.active){
      game.enemies=game.enemies.filter(e=>{if(e.type==='danger'){e.dispose?.();return false}return true});
      if(state.step>=1&&state.step<=3&&game.enemies.filter(e=>!e.dead&&e.type!=='danger').length<3)ensureTargets(state.step===3?7:5);
      const beat=game.audio?.ctx&&game.audio?.beatDur?((game.audio.ctx.currentTime-(game.audio.anchor||0))/game.audio.beatDur):0,phase=((beat%1)+1)%1,pulse=Math.pow(Math.max(0,Math.cos(phase*Math.PI*2)),10);
      card.style.setProperty('--calibration-pulse',String(.72+pulse*.8));card.style.setProperty('--calibration-alpha',String(.48+pulse*.48));
    }
    requestAnimationFrame(maintenance);
  };requestAnimationFrame(maintenance);

  window.__pulseOnboarding={
    state,begin,skip,finish,advance,
    reset:()=>{state.completed=false;state.dismissed=false;state.step=0;persist();},
    stats:()=>({active:state.active,step:state.step+1,completed:state.completed,dismissed:state.dismissed,attempts:state.attempts,moved:state.moved,forced:state.forceNext})
  };
});
