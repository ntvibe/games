const waitForGame=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});

waitForGame().then(game=>{
  if(game.__pauseLifecycleInstalled)return;
  game.__pauseLifecycleInstalled=true;

  const state={paused:false,reason:null,backgrounded:false,resuming:false,resumeCount:0};
  const reasons=new Set();
  const aim=document.querySelector('#aim');
  const hud=document.querySelector('#hud');

  const style=document.createElement('style');
  style.textContent=`
    .pause-toggle{position:absolute;z-index:44;right:max(50px,calc(env(safe-area-inset-right) + 50px));bottom:max(12px,env(safe-area-inset-bottom));width:32px;height:32px;border-radius:50%;border:1px solid #72efff44;background:#020810c9;color:#dffcff;font:900 11px/1 system-ui;letter-spacing:-.08em;display:grid;place-items:center;backdrop-filter:blur(8px);touch-action:manipulation}
    .pause-layer{position:fixed;z-index:88;inset:0;display:grid;place-items:center;background:#01040bc4;backdrop-filter:blur(9px);padding:18px}.pause-layer.hidden{display:none}.pause-card{width:min(360px,92vw);padding:20px;border:1px solid #66edff55;background:linear-gradient(145deg,#06111df4,#02060df4);text-align:center;box-shadow:0 20px 70px #000c}.pause-card .eyebrow{font:800 7px/1 system-ui;letter-spacing:.24em;color:#6e9ca8;margin-bottom:9px}.pause-card h3{margin:0 0 8px;color:#f3ffff;font:900 20px/1 system-ui;letter-spacing:.13em}.pause-card p{margin:0 0 16px;color:#789ba4;font:600 9px/1.45 system-ui}.pause-actions{display:grid;gap:7px}.pause-actions button{min-height:44px;border:1px solid #69ebff55;background:#06131c;color:#eaffff;font:800 9px/1 system-ui;letter-spacing:.12em}.pause-actions button.primary{border-color:#7df5ff;background:#0a2732;color:#fff}.resume-count{font:900 46px/1 system-ui;color:#efffff;text-shadow:0 0 20px #6feaff55;margin:2px 0 8px}.pause-card[data-resume='1'] .pause-actions,.pause-card[data-resume='1'] p{display:none}
    html[data-game-paused='1'] #aim{opacity:.28!important}html[data-game-paused='1'] #callout{animation-play-state:paused!important}
  `;
  document.head.appendChild(style);

  const toggle=document.createElement('button');
  toggle.className='pause-toggle';toggle.type='button';toggle.textContent='Ⅱ';toggle.setAttribute('aria-label','Pause game');hud?.appendChild(toggle);

  const layer=document.createElement('div');
  layer.id='pauseLayer';layer.className='pause-layer hidden';
  layer.innerHTML=`<div class="pause-card"><div class="eyebrow">SIGNAL HOLD</div><h3>PAUSED</h3><div class="resume-count" hidden></div><p>Combat, rhythm timing and the simulation are frozen.</p><div class="pause-actions"><button class="primary" data-action="resume">RESUME ON GRID</button><button data-action="settings">SETTINGS</button></div></div>`;
  document.body.appendChild(layer);
  const card=layer.querySelector('.pause-card'),countEl=layer.querySelector('.resume-count');

  const muteAndSuspend=async()=>{
    try{await game.audio?.ctx?.suspend?.();}catch{}
  };
  const clearPointer=()=>{
    game.pointer.down=false;aim?.classList.remove('locking');
  };
  const show=()=>{layer.classList.remove('hidden');document.documentElement.dataset.gamePaused='1';};
  const hide=()=>{layer.classList.add('hidden');document.documentElement.dataset.gamePaused='0';};

  const pause=async(reason='manual')=>{
    if(!game.running)return false;
    reasons.add(reason);state.reason=reason;clearPointer();
    if(!state.paused){state.paused=true;show();}
    await muteAndSuspend();
    return true;
  };

  const alignAudio=async()=>{
    const audio=game.audio;if(!audio?.ctx)return;
    try{await audio.ctx.resume?.();}catch{}
    const now=audio.ctx.currentTime,lead=Math.max(.08,Math.min(.18,audio.stepDur||.12));
    audio.nextStepTime=now+lead;audio.anchor=audio.nextStepTime;audio.step=Math.ceil((audio.step||0)/4)*4;
    game.last=performance.now();
  };

  const resume=async(reason='manual')=>{
    reasons.delete(reason);
    // Returning from the background is intentionally gesture-gated. Never surprise the
    // player by resuming combat while they are still switching back into the app.
    if(reasons.size||!state.paused||state.resuming)return false;
    state.resuming=true;state.backgrounded=false;show();card.dataset.resume='1';countEl.hidden=false;
    const labels=['3','2','1','SYNC'];
    for(const label of labels){countEl.textContent=label;await new Promise(r=>setTimeout(r,label==='SYNC'?180:260));}
    await alignAudio();
    state.paused=false;state.resuming=false;state.reason=null;state.resumeCount++;card.dataset.resume='0';countEl.hidden=true;hide();
    return true;
  };

  toggle.onclick=()=>pause('manual');
  layer.querySelector('[data-action="resume"]').onclick=()=>resume('manual');
  layer.querySelector('[data-action="settings"]').onclick=()=>{
    reasons.add('settings');window.__pulseSettings?.open?.();layer.classList.add('hidden');
  };

  const originalLoop=game.loop.bind(game);
  game.loop=()=>{
    if(state.paused){game.last=performance.now();return;}
    return originalLoop();
  };
  for(const name of ['pointerDown','pointerUp','releaseFire','triggerOverdrive','takeHit']){
    const original=game[name]?.bind(game);if(!original)continue;
    game[name]=(...args)=>state.paused?undefined:original(...args);
  }

  document.addEventListener('visibilitychange',()=>{
    if(!game.running)return;
    if(document.hidden){state.backgrounded=true;pause('background');}
    else if(state.backgrounded){
      // Base game code may optimistically resume AudioContext on visibilitychange;
      // immediately suspend again and wait for an explicit tap.
      muteAndSuspend();show();
    }
  });
  addEventListener('pagehide',()=>{if(game.running){state.backgrounded=true;pause('background');}});
  addEventListener('pageshow',()=>{if(state.backgrounded&&game.running){muteAndSuspend();show();}});

  // Opening settings during live play pauses the simulation; closing settings returns
  // to the pause screen instead of instantly dropping the player back into danger.
  const observeSettings=()=>{
    const panel=document.querySelector('#settingsPanel');if(!panel)return requestAnimationFrame(observeSettings);
    new MutationObserver(()=>{
      const open=!panel.classList.contains('hidden');
      if(open&&game.running){pause('settings');layer.classList.add('hidden');}
      else if(!open&&reasons.has('settings')){reasons.delete('settings');show();}
    }).observe(panel,{attributes:true,attributeFilter:['class']});
  };observeSettings();

  // ESC provides a predictable desktop fallback while keeping mobile UI touch-first.
  addEventListener('keydown',e=>{
    if(e.code!=='Escape'||!game.running)return;
    e.preventDefault();if(state.paused){if(reasons.has('background')){reasons.delete('background');resume('background');}else resume('manual');}else pause('manual');
  });

  // A visible resume tap after app switching clears the background reason.
  layer.addEventListener('pointerdown',e=>{
    if(!state.backgrounded||e.target.closest('[data-action="settings"]'))return;
    if(e.target.closest('[data-action="resume"]')){reasons.delete('background');resume('background');}
  },true);

  window.__pulsePause={state,pause,resume,stats:()=>({paused:state.paused,reason:state.reason,backgrounded:state.backgrounded,resuming:state.resuming,resumeCount:state.resumeCount,reasons:[...reasons],audioState:game.audio?.ctx?.state||'none'})};
});
