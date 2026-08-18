import {clamp} from './util.js';

const waitFor=getter=>new Promise(resolve=>{const tick=()=>{const value=getter();value?resolve(value):requestAnimationFrame(tick)};tick()});

const REWARDS={
  EMITTER:{label:'THREAT PROFILE -15%',detail:'smaller hostile impact envelope'},
  GATE:{label:'PHASE RECOVERY +18%',detail:'faster dash recharge'},
  RESONATOR:{label:'RHYTHM WINDOW +12%',detail:'more forgiving beat calibration'}
};

async function init(){
  const game=await waitFor(()=>window.__pulseAscent),elite=await waitFor(()=>window.__pulseEliteDoctrine),dodge=await waitFor(()=>window.__pulseDodge);
  if(game.__doctrineMasteryInstalled)return;game.__doctrineMasteryInstalled=true;

  const state={acquired:new Set(),threatsCalibrated:0,baseDashCooldown:dodge.state.cooldown,timingBoost:.12};
  const baseTimingQuality=game.audio.timingQuality.bind(game.audio);

  game.audio.timingQuality=()=>{
    const q=baseTimingQuality();
    return state.acquired.has('RESONATOR')?clamp(q+(1-q)*state.timingBoost,0,1):q;
  };

  const announce=role=>{
    const reward=REWARDS[role];if(!reward)return;
    setTimeout(()=>{
      if(!game.running||!state.acquired.has(role))return;
      game.showCallout(`${role} MASTERED // ${reward.label}`,1);
      game.audio.syncNote?.(.94);game.world.pulse?.(1.25);game.haptic?.([7,6,15]);
    },680);
  };

  const acquire=role=>{
    if(state.acquired.has(role)||!REWARDS[role])return;
    state.acquired.add(role);
    if(role==='GATE')dodge.state.cooldown=state.baseDashCooldown*.82;
    announce(role);
  };

  const calibrateThreat=enemy=>{
    if(!state.acquired.has('EMITTER')||!enemy||enemy.dead||enemy.type!=='danger'||enemy.__masteryImpactCalibrated)return;
    if(typeof enemy.threatImpactRadius!=='number')return;
    enemy.__masteryImpactCalibrated=true;enemy.threatImpactRadius*=.85;state.threatsCalibrated++;
    if(enemy.warning?.scale)enemy.warning.scale.multiplyScalar(.96);
  };

  const baseRestart=game.restart.bind(game);
  game.restart=()=>{
    state.acquired.clear();state.threatsCalibrated=0;dodge.state.cooldown=state.baseDashCooldown;
    baseRestart();
  };

  const tick=()=>{
    for(const role of elite.state.cleared)acquire(role);
    if(state.acquired.has('EMITTER'))for(const enemy of game.enemies)calibrateThreat(enemy);
    requestAnimationFrame(tick);
  };tick();

  window.__pulseDoctrineMastery={
    state,
    rewards:REWARDS,
    stats:()=>({
      acquired:[...state.acquired],
      emitterImpactScale:state.acquired.has('EMITTER')?.85:1,
      dashCooldown:dodge.state.cooldown,
      rhythmAssist:state.acquired.has('RESONATOR')?state.timingBoost:0,
      threatsCalibrated:state.threatsCalibrated
    })
  };
}

init();
