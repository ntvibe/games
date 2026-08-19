import * as THREE from 'three';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=t=>t*t*(3-2*t);
const waitFor=()=>new Promise(resolve=>{
  const tick=()=>window.__pulseAscent&&window.__pulsePilot&&window.__pulseWeaponSignatures?resolve(window.__pulseAscent):requestAnimationFrame(tick);
  tick();
});

waitFor().then(game=>{
  if(game.__weaponRhythmMasteryInstalled)return;
  game.__weaponRhythmMasteryInstalled=true;

  const state={pressedAt:0,charging:false,charge:0,queuedCharge:.45,perfects:0,releases:0};
  const current=()=>window.__pulsePilot?.weapons?.[window.__pulsePilot?.state?.weapon||0]||{id:'lock'};
  const now=()=>performance.now()/1000;
  const chargeFromDuration=seconds=>smooth(clamp((seconds-.10)/.92,0,1));

  const beginCharge=()=>{
    if(!game.running||current().id!=='lance')return;
    state.pressedAt=now();state.charging=true;state.charge=0;
  };
  const endCharge=()=>{
    if(!state.charging)return state.queuedCharge;
    const held=Math.max(0,now()-state.pressedAt),charge=chargeFromDuration(held);
    state.charge=charge;state.queuedCharge=Math.max(.35,charge);state.charging=false;state.releases++;
    return state.queuedCharge;
  };

  const basePointerDown=game.pointerDown.bind(game);
  game.pointerDown=e=>{beginCharge();return basePointerDown(e);};
  addEventListener('keydown',e=>{if(e.code==='Space'&&!e.repeat)beginCharge();},{passive:true});

  const baseRelease=game.releaseFire.bind(game);
  game.releaseFire=()=>{
    const cfg=current();
    if(cfg.id==='lance'){
      const charge=endCharge(),timing=game.audio?.timingQuality?.()??.5;
      if(charge>.84&&timing>.88){
        state.perfects++;game.sync=clamp((game.sync||0)+4,0,100);game.overdrive=clamp((game.overdrive||0)+5,0,100);
        game.showCallout?.('LANCE RESONANCE // PERFECT CHARGE',1);game.haptic?.([10,12,26]);
      }else if(charge>.72)game.showCallout?.('LANCE CHARGED',.82);
    }
    return baseRelease();
  };

  const baseFire=game.fireWeaponAt.bind(game);
  game.fireWeaponAt=(target,index,total,q,cfg)=>{
    if(cfg?.id!=='lance')return baseFire(target,index,total,q,cfg);
    const charge=state.queuedCharge||.45;
    const tuned={...cfg,damage:cfg.damage*(.72+charge*.92)};
    const result=baseFire(target,index,total,q,tuned);
    const p=game.targetPosition?.(target,new THREE.Vector3());
    if(p&&charge>.72)game.particles?.burst?.(p,Math.round(10+charge*12),0xff78dc,2.2+charge*1.8,5+charge*3);
    game.cameraKick=(game.cameraKick||0)+charge*.045;
    state.queuedCharge=.45;
    return result;
  };

  const tick=()=>{
    if(state.charging)state.charge=chargeFromDuration(Math.max(0,now()-state.pressedAt));
    else if(current().id!=='lance')state.charge=0;
    requestAnimationFrame(tick);
  };requestAnimationFrame(tick);

  window.__pulseWeaponRhythmMastery={beginCharge,endCharge,stats:()=>({weapon:current().id,charging:state.charging,charge:state.charge,queuedCharge:state.queuedCharge,releases:state.releases,perfects:state.perfects})};
});
