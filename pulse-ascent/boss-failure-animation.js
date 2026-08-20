import * as THREE from 'three';

const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=THREE.MathUtils.lerp;
const ROLE_BY_INDEX=['EMITTER','RESONATOR','GATE','RESONATOR','EMITTER','RESONATOR','GATE','RESONATOR'];
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent&&window.__pulseBossBody&&window.__pulseBossDamageStaging&&window.__pulseBossConsequences?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});

waitFor().then(game=>{
  if(game.__bossFailureAnimationInstalled)return;game.__bossFailureAnimationInstalled=true;
  const state={boss:null,falters:0,lastFalterRole:'',falterPulse:0,lastSuppressed:{EMITTER:0,GATE:0,RESONATOR:0},emitterDroop:0,gateError:0,resonatorStutter:0,chargeCollapsed:0};
  const consequences=window.__pulseBossConsequences;
  const body=window.__pulseBossBody;
  const damageStage=window.__pulseBossDamageStaging;

  const partBroken=(boss,role)=>boss.parts?.filter((p,i)=>(p.role||ROLE_BY_INDEX[i])===role&&p.dead).length||0;

  const collapseCharge=(role)=>{
    state.falters++;state.lastFalterRole=role;state.falterPulse=1;state.chargeCollapsed++;
    const rig=body.state?.boss===state.boss?body.state.rig:null;
    if(rig){
      rig.ringA.scale.multiplyScalar(.72);rig.ringB.scale.multiplyScalar(.78);
      rig.ringA.material.opacity=Math.min(rig.ringA.material.opacity,.08);rig.ringB.material.opacity=Math.min(rig.ringB.material.opacity,.06);
      rig.shards?.forEach((s,i)=>{s.scale.multiplyScalar(.58);s.position.z+=(i%2?1:-1)*.18;});
    }
    game.haptic?.([8,16,8]);
  };

  const watchSuppression=()=>{
    const current=consequences.state?.roleSuppressed||{};
    for(const role of ['EMITTER','GATE','RESONATOR']){
      const n=current[role]||0;if(n>(state.lastSuppressed[role]||0))collapseCharge(role);state.lastSuppressed[role]=n;
    }
  };

  const applyFailurePose=(boss,dt,t)=>{
    const stage=damageStage.state?.boss===boss?damageStage.state.stage:null;
    const brokenEmitter=partBroken(boss,'EMITTER'),brokenGate=partBroken(boss,'GATE'),brokenRes=partBroken(boss,'RESONATOR');
    const stability=consequences.state?.stability??1,damage=clamp(1-boss.healthRatio(),0,1);
    state.emitterDroop=lerp(state.emitterDroop,clamp(brokenEmitter/2,0,1),1-Math.pow(.01,dt));
    state.gateError=lerp(state.gateError,clamp(brokenGate/2,0,1),1-Math.pow(.01,dt));
    state.resonatorStutter=lerp(state.resonatorStutter,clamp(brokenRes/4,0,1),1-Math.pow(.01,dt));
    state.falterPulse=lerp(state.falterPulse,0,1-Math.pow(.002,dt));

    // Make destroyed systems read physically on the staged shell. These offsets are applied after the
    // normal boss/body animation so they behave like mechanical failure rather than a second animation rig.
    if(stage&&!stage.death){
      stage.plates.forEach((plate,i)=>{
        const role=boss.parts?.[i]?.role||ROLE_BY_INDEX[i],dead=!!boss.parts?.[i]?.dead;
        if(role==='EMITTER'&&dead){
          const side=i<4?-1:1;plate.rotation.x+=.32+Math.sin(t*2.2+i)*.055;plate.rotation.z+=side*.18;plate.position.y-=.18+.08*Math.sin(t*1.7+i);plate.position.z-=.12;
        }else if(role==='GATE'&&dead){
          const slip=Math.sin(t*(3.2+i*.17))*state.gateError;plate.rotation.y+=slip*.28;plate.rotation.z+=Math.cos(t*2.6+i)*.12;plate.position.x+=Math.sin(t*1.9+i)*.16;
        }else if(role==='RESONATOR'&&dead){
          const beat=game.audio?.beatDur?((game.audio.ctx?.currentTime||t)/game.audio.beatDur)%1:(t*2.13)%1;
          const cut=((Math.floor((beat*8)+i)%3)===0)?1:0;plate.scale.multiplyScalar(1-cut*.055*state.resonatorStutter);plate.material.opacity*=1-cut*.22*state.resonatorStutter;
        }
      });
      stage.ribs?.forEach((rib,i)=>{
        const wobble=(1-stability)*(.05+.018*(i%3));rib.rotation.y+=Math.sin(t*(2.1+i*.13))*wobble;rib.rotation.z+=Math.cos(t*(1.7+i*.09))*wobble*.7;
      });
    }

    // Imported boss modules inherit the same component failure language instead of staying pristine.
    const fusion=boss.__fusionModel;
    if(fusion){
      fusion.children.forEach((o,i)=>{
        const role=boss.parts?.[i%boss.parts.length]?.role||ROLE_BY_INDEX[i%8],dead=!!boss.parts?.[i%boss.parts.length]?.dead;
        if(role==='EMITTER'&&dead){o.rotation.x+=dt*(.24+(i%3)*.05);o.position.y-=dt*.035;}
        else if(role==='GATE'&&dead)o.rotation.y+=Math.sin(t*4+i)*dt*.42;
        else if(role==='RESONATOR'&&dead)o.rotation.z+=((Math.floor(t*12+i)%4)===0?1:-.22)*dt*.28;
      });
    }

    // The charge rig now visibly loses coherence as its supporting systems fail. No extra bloom is added.
    const rig=body.state?.boss===boss?body.state.rig:null;
    if(rig){
      const falter=state.falterPulse,em=state.emitterDroop,gate=state.gateError,res=state.resonatorStutter;
      rig.ringA.position.y=-em*.2+Math.sin(t*7)*em*.035;rig.ringA.rotation.x=Math.PI/2+em*.12+falter*.08;
      rig.ringB.position.x=Math.sin(t*3.4)*gate*.16;rig.ringB.rotation.y=.45+gate*(.18*Math.sin(t*3.1));
      rig.ringA.material.opacity*=1-falter*.52;rig.ringB.material.opacity*=1-falter*.58;
      rig.shards?.forEach((s,i)=>{const stutter=res&&((Math.floor(t*16+i)%5)===0);if(stutter)s.scale.multiplyScalar(.58);s.position.z+=Math.sin(t*5+i)*res*.035;});
    }

    // Severe instability adds a small, readable whole-body hitch rather than camera shake or flash spam.
    if(stability<.42){
      const hitch=((Math.floor(t*8)%7)===0)?1:0,bias=(.42-stability)*.16;
      boss.group.rotation.z=Math.sin(t*4.6)*bias+hitch*bias*.65;
      boss.group.rotation.x=Math.cos(t*3.8)*bias*.42;
    }
    if(damage<.3&&stability>.7){boss.group.rotation.z*=.92;boss.group.rotation.x*=.92;}
  };

  const patchBoss=boss=>{
    if(!boss||boss.__failureAnimationInstalled)return false;boss.__failureAnimationInstalled=true;state.boss=boss;
    state.lastSuppressed={...(consequences.state?.roleSuppressed||{EMITTER:0,GATE:0,RESONATOR:0})};
    const baseUpdate=boss.update.bind(boss);
    boss.update=(dt,t)=>{baseUpdate(dt,t);if(!boss.dead){watchSuppression();applyFailurePose(boss,dt,t);}};
    return true;
  };

  const tick=()=>{if(game.boss&&!game.boss.dead&&game.boss!==state.boss)patchBoss(game.boss);requestAnimationFrame(tick);};tick();

  window.__pulseBossFailureAnimation={state,patchBoss,collapseCharge,stats:()=>({patched:!!state.boss?.__failureAnimationInstalled,falters:state.falters,lastFalterRole:state.lastFalterRole,emitterDroop:Number(state.emitterDroop.toFixed(3)),gateError:Number(state.gateError.toFixed(3)),resonatorStutter:Number(state.resonatorStutter.toFixed(3)),chargeCollapsed:state.chargeCollapsed,stability:Number((consequences.state?.stability??1).toFixed(3))})};
});
