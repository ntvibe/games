import './performance-director.js';

const STORAGE='pulse-ascent-settings-v1';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const read=()=>{try{return JSON.parse(localStorage.getItem(STORAGE)||'{}')}catch{return {}}};
const write=v=>{try{localStorage.setItem(STORAGE,JSON.stringify(v))}catch{}};
const waitForGame=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});

function buildUi(state,apply){
  if(document.querySelector('#settingsPanel'))return;
  const style=document.createElement('style');style.textContent=`
  .settings-toggle{position:absolute;z-index:40;width:34px;height:34px;border:1px solid #72efff55;background:#020810cc;color:#dffcff;font:800 15px/1 system-ui;display:grid;place-items:center;backdrop-filter:blur(8px);border-radius:50%;box-shadow:0 0 0 1px #0008 inset;touch-action:manipulation}.settings-toggle.start{right:14px;top:14px}.settings-toggle.hud{right:max(10px,env(safe-area-inset-right));bottom:max(12px,env(safe-area-inset-bottom))}.settings-panel{position:fixed;z-index:90;inset:0;background:#01040bd9;display:grid;place-items:center;padding:18px;backdrop-filter:blur(10px)}.settings-panel.hidden{display:none}.settings-card{width:min(420px,94vw);max-height:86vh;overflow:auto;background:linear-gradient(145deg,#06111df4,#02060df4);border:1px solid #69ebff55;padding:18px;box-shadow:0 20px 70px #000b}.settings-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}.settings-head b{font:800 15px/1 system-ui;letter-spacing:.16em;color:#efffff}.settings-close{border:1px solid #638c9a66;background:#02070c;color:#dffcff;width:34px;height:34px;font-size:18px}.setting-row{padding:12px 0;border-top:1px solid #5be8ff18}.setting-row:first-of-type{border-top:0}.setting-row label{display:flex;justify-content:space-between;gap:12px;font:700 9px/1.25 system-ui;letter-spacing:.1em;color:#b8d9e0}.setting-row small{display:block;margin-top:5px;color:#648894;font:500 8px/1.35 system-ui;letter-spacing:.02em}.setting-row input[type=range]{width:100%;margin-top:10px;accent-color:#75efff}.seg{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-top:9px}.seg button,.toggle-setting{border:1px solid #5e8c9955;background:#020911;color:#789ca7;padding:9px 7px;font:800 8px/1 system-ui;letter-spacing:.08em}.seg button.active,.toggle-setting.active{border-color:#76f2ff;background:#08202b;color:#fff;box-shadow:0 0 14px #52e8ff15}.toggle-setting{width:100%;margin-top:9px}.settings-note{margin-top:12px;color:#567986;font:600 7px/1.4 system-ui;letter-spacing:.08em}.settings-panel *{box-sizing:border-box}@media(max-width:700px){.settings-toggle.start{right:9px;top:9px}.settings-toggle.hud{width:32px;height:32px}.settings-card{padding:15px}.setting-row{padding:10px 0}}
  html[data-comfort='1'] .callout{animation-duration:.16s!important;text-shadow:none!important}html[data-comfort='1'] .scanlines{opacity:.15!important}`;document.head.appendChild(style);

  const panel=document.createElement('div');panel.id='settingsPanel';panel.className='settings-panel hidden';panel.innerHTML=`<div class="settings-card"><div class="settings-head"><b>GAME SETTINGS</b><button class="settings-close" aria-label="Close settings">×</button></div><div class="setting-row"><label><span>MASTER VOLUME</span><b id="volumeValue">${Math.round(state.volume*100)}%</b></label><input id="volumeSlider" type="range" min="0" max="100" step="1" value="${Math.round(state.volume*100)}"><small>Controls music and combat audio together.</small></div><div class="setting-row"><label><span>HAPTICS</span><b id="hapticValue">${state.haptics?'ON':'OFF'}</b></label><button id="hapticToggle" class="toggle-setting ${state.haptics?'active':''}">${state.haptics?'ENABLED':'DISABLED'}</button><small>Phone vibration for rhythm, hits and Overdrive.</small></div><div class="setting-row"><label><span>COMFORT FX</span><b id="comfortValue">${state.comfort?'REDUCED':'FULL'}</b></label><button id="comfortToggle" class="toggle-setting ${state.comfort?'active':''}">${state.comfort?'REDUCED FLASH / SHAKE':'FULL SYNESTHESIA'}</button><small>Reduces flashes, camera kick and bloom without changing gameplay timing.</small></div><div class="setting-row"><label><span>GRAPHICS</span><b id="graphicsValue">${state.graphics.toUpperCase()}</b></label><div class="seg" id="graphicsSeg"><button data-mode="battery">BATTERY</button><button data-mode="auto">AUTO</button><button data-mode="quality">QUALITY</button></div><small>Auto adapts resolution and decorative density. Battery favors stable performance; Quality favors sharper rendering.</small></div><div class="settings-note">SETTINGS SAVE ON THIS DEVICE · GAMEPLAY SCORE RULES ARE UNCHANGED</div></div>`;document.body.appendChild(panel);

  const makeButton=(cls,parent)=>{const b=document.createElement('button');b.className=`settings-toggle ${cls}`;b.type='button';b.setAttribute('aria-label','Open game settings');b.textContent='⚙';b.onclick=()=>panel.classList.remove('hidden');parent?.appendChild(b);return b};
  makeButton('start',document.querySelector('#start'));
  makeButton('hud',document.querySelector('#hud'));
  panel.querySelector('.settings-close').onclick=()=>panel.classList.add('hidden');
  panel.addEventListener('pointerdown',e=>{if(e.target===panel)panel.classList.add('hidden')});

  const refresh=()=>{
    panel.querySelector('#volumeValue').textContent=`${Math.round(state.volume*100)}%`;panel.querySelector('#volumeSlider').value=Math.round(state.volume*100);
    const hb=panel.querySelector('#hapticToggle');hb.classList.toggle('active',state.haptics);hb.textContent=state.haptics?'ENABLED':'DISABLED';panel.querySelector('#hapticValue').textContent=state.haptics?'ON':'OFF';
    const cb=panel.querySelector('#comfortToggle');cb.classList.toggle('active',state.comfort);cb.textContent=state.comfort?'REDUCED FLASH / SHAKE':'FULL SYNESTHESIA';panel.querySelector('#comfortValue').textContent=state.comfort?'REDUCED':'FULL';
    panel.querySelector('#graphicsValue').textContent=state.graphics.toUpperCase();panel.querySelectorAll('#graphicsSeg button').forEach(b=>b.classList.toggle('active',b.dataset.mode===state.graphics));
  };
  panel.querySelector('#volumeSlider').oninput=e=>{state.volume=clamp(Number(e.target.value)/100,0,1);apply();refresh()};
  panel.querySelector('#hapticToggle').onclick=()=>{state.haptics=!state.haptics;apply();refresh()};
  panel.querySelector('#comfortToggle').onclick=()=>{state.comfort=!state.comfort;apply();refresh()};
  panel.querySelectorAll('#graphicsSeg button').forEach(b=>b.onclick=()=>{state.graphics=b.dataset.mode;apply();refresh()});refresh();
}

waitForGame().then(game=>{
  if(game.__mobileSettingsInstalled)return;game.__mobileSettingsInstalled=true;
  const persisted=read(),state={volume:clamp(Number.isFinite(persisted.volume)?persisted.volume:.72,0,1),haptics:persisted.haptics!==false,comfort:!!persisted.comfort,graphics:['battery','auto','quality'].includes(persisted.graphics)?persisted.graphics:'auto'};
  const baseHaptic=game.haptic.bind(game);game.haptic=pattern=>{if(state.haptics)baseHaptic(pattern)};
  const mobile=()=>innerWidth<760||matchMedia('(pointer: coarse)').matches;
  const apply=()=>{
    write(state);document.documentElement.dataset.comfort=state.comfort?'1':'0';
    if(game.audio?.master)game.audio.master.gain.value=state.volume;
    if(game.targetPixelRatio!==undefined){
      const dpr=Math.min(devicePixelRatio||1,2),cap=state.graphics==='battery'?(mobile()?1:1.25):state.graphics==='quality'?(mobile()?1.55:1.8):(mobile()?1.35:1.7);
      game.targetPixelRatio=Math.min(dpr,cap);if(state.graphics!=='auto'&&game.setPixelRatio)game.setPixelRatio(Math.min(game.pixelRatio||cap,game.targetPixelRatio));
    }
  };
  const baseStart=game.start.bind(game);game.start=async()=>{const r=await baseStart();apply();return r};
  const baseRender=game.composer?.render?.bind(game.composer);if(baseRender)game.composer.render=(...args)=>{
    if(state.comfort){game.flash=clamp(game.flash||0,-.22,.28);game.cameraKick=Math.min(game.cameraKick||0,.055);if(game.bloom){game.bloom.strength=Math.min(game.bloom.strength,.16);game.bloom.radius=Math.min(game.bloom.radius,.08);game.bloom.threshold=Math.max(game.bloom.threshold,.9);}game.renderer.toneMappingExposure=Math.min(game.renderer.toneMappingExposure,1.14);}
    return baseRender(...args);
  };
  addEventListener('resize',apply,{passive:true});buildUi(state,apply);apply();
  window.__pulseSettings={state,apply,open:()=>document.querySelector('#settingsPanel')?.classList.remove('hidden'),close:()=>document.querySelector('#settingsPanel')?.classList.add('hidden'),stats:()=>({volume:state.volume,haptics:state.haptics,comfort:state.comfort,graphics:state.graphics,pixelRatio:game.pixelRatio,targetPixelRatio:game.targetPixelRatio})};
});
