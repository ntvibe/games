import * as THREE from 'three';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mobile=()=>innerWidth<760||matchMedia('(pointer: coarse)').matches;
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches||!!window.__pulseSettings?.state?.comfort;
const NAMES=['BUS DIVERT','MIRROR INVERSION','TIDAL BEND','BRANCH VARIATION','CHOIR RESOLVE'];
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent&&window.__pulseModelFusion&&window.__pulseEnemyMotionRigs?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});

waitFor().then(game=>{
  if(game.__formationReharmonizationVisualInstalled)return;game.__formationReharmonizationVisualInstalled=true;
  const active=[];
  const state={reactions:0,strong:0,weak:0,lastArea:1,lastName:'',lastFormationId:null,lastFormationSize:0,lastAppliedModules:0,lastPeakDisplacement:0};

  function liveModels(area){
    return (game.enemies||[]).filter(e=>!e.dead&&e.type!=='danger'&&e.type!=='rupture'&&e.__fusionModel&&clamp(e.__fusionModel.userData.areaIndex??0,0,4)===area);
  }

  function chooseFormation(area){
    const enemies=liveModels(area);if(!enemies.length)return {id:null,members:[]};
    const groups=new Map();
    for(const enemy of enemies){
      const id=enemy.__formationId;
      if(id==null)continue;
      if(!groups.has(id))groups.set(id,[]);groups.get(id).push(enemy);
    }
    let best=null;
    for(const [id,members] of groups){if(members.length>=2&&(!best||members.length>best.members.length))best={id,members};}
    if(best)return best;
    return {id:null,members:enemies.slice(0,mobile()?5:8)};
  }

  function restoreModule(entry){
    const m=entry.module,a=entry.applied;if(!m?.parent)return;
    m.position.x-=a.px;m.position.y-=a.py;m.position.z-=a.pz;
    m.rotation.x-=a.rx;m.rotation.y-=a.ry;m.rotation.z-=a.rz;
    a.px=a.py=a.pz=a.rx=a.ry=a.rz=0;
  }

  function applyModule(entry,offset){
    const m=entry.module,a=entry.applied;restoreModule(entry);
    a.px=offset.px||0;a.py=offset.py||0;a.pz=offset.pz||0;a.rx=offset.rx||0;a.ry=offset.ry||0;a.rz=offset.rz||0;
    m.position.x+=a.px;m.position.y+=a.py;m.position.z+=a.pz;
    m.rotation.x+=a.rx;m.rotation.y+=a.ry;m.rotation.z+=a.rz;
  }

  function offsets(area,module,index,count,envelope,strong,t){
    const role=module.userData.variantRole||'',power=(strong?1:.62)*(reduced()?.38:1),e=envelope*power;
    const side=Math.sign(module.position.x)||((index%2)?1:-1),phase=index/Math.max(1,count-1),o={px:0,py:0,pz:0,rx:0,ry:0,rz:0};
    if(area===0){
      // BUS DIVERT: machine buses snap into an alternating orthogonal reroute, then settle.
      if(role==='bus'){const step=index%2?1:-1;o.px=side*e*.045;o.py=step*e*.035;o.ry=side*e*.12;o.rz=-step*e*.055;}
      else{o.py=-e*.018;o.ry=e*.035;}
    }else if(area===1){
      // MIRROR INVERSION: mirrored wings exchange the direction of their open pose around the central spire.
      if(role==='mirror-wing'){o.px=-side*e*.075;o.py=e*(.018+.018*phase);o.ry=-side*e*.16;o.rz=-side*e*.28;}
      else if(role==='spire'){o.py=e*.045;o.ry=Math.sin(t*7)*e*.025;}
    }else if(area===2){
      // TIDAL BEND: helix modules visibly unwind in the same direction as the musical pitch bend.
      const a=phase*Math.PI*2+t*1.8;o.px=Math.cos(a)*e*.035;o.py=Math.sin(a)*e*.035;o.pz=-Math.sin(a+.7)*e*.12;o.rx=-Math.sin(a)*e*.16;o.ry=Math.cos(a)*e*.2;
    }else if(area===3){
      // BRANCH VARIATION: alternate branches choose a visibly different fork after the player's answer.
      if(role==='branch'){const fork=index%2?1:-1;o.px=side*fork*e*.09;o.py=Math.abs(Math.sin(index*1.7))*e*.05;o.pz=fork*e*.045;o.rx=fork*e*.1;o.rz=side*fork*e*.24;}
      else if(role==='seed'){o.py=-e*.025;o.ry=e*.08;}
    }else{
      // CHOIR RESOLVE: choir pods settle into a four-voice visual chord while the lancet remains the tonal anchor.
      if(role==='choir-pod'){const voice=index%4,voicing=[-.045,-.012,.018,.052][voice];o.py=e*(.035+voice*.018);o.px=side*e*Math.abs(voicing);o.rz=side*e*(.12-voice*.018);o.ry=(voice-1.5)*e*.045;}
      else if(role==='lancet'){o.py=e*.055;o.ry=Math.sin(t*4)*e*.018;}
    }
    return o;
  }

  function begin(detail={}){
    const area=clamp((detail.area||1)-1,0,4),selection=chooseFormation(area);if(!selection.members.length)return false;
    const entries=[];
    for(const enemy of selection.members){
      const modules=enemy.__fusionModel?.children?.filter(c=>c.name==='rez-volume-model')||[];
      for(const module of modules)entries.push({enemy,module,applied:{px:0,py:0,pz:0,rx:0,ry:0,rz:0}});
    }
    if(!entries.length)return false;
    const strong=!!detail.strong,duration=(reduced()?.42:(strong?.82:.62))*(mobile()?.92:1);
    const reaction={area,strong,name:NAMES[area],formationId:selection.id,members:selection.members,entries,start:performance.now()/1000,duration,peak:0};
    active.push(reaction);state.reactions++;state[strong?'strong':'weak']++;state.lastArea=area+1;state.lastName=reaction.name;state.lastFormationId=selection.id;state.lastFormationSize=selection.members.length;state.lastAppliedModules=entries.length;
    window.__pulseRailCamera?.frameEncounter?.(selection.members.slice(0,mobile()?4:6));
    return true;
  }

  addEventListener('pulse:enemy-phrase-reharmonized',e=>begin(e.detail||{}));

  function tick(){
    const now=performance.now()/1000;
    for(let i=active.length-1;i>=0;i--){
      const r=active[i],p=clamp((now-r.start)/Math.max(.001,r.duration),0,1),envelope=Math.sin(p*Math.PI),wave=.82+.18*Math.sin(p*Math.PI*2);
      let peak=0;
      for(let j=0;j<r.entries.length;j++){
        const entry=r.entries[j];if(entry.enemy.dead||!entry.module?.parent){restoreModule(entry);continue;}
        const o=offsets(r.area,entry.module,j,r.entries.length,envelope*wave,r.strong,now);applyModule(entry,o);
        peak=Math.max(peak,Math.hypot(o.px,o.py,o.pz));
      }
      r.peak=Math.max(r.peak,peak);state.lastPeakDisplacement=Math.max(state.lastPeakDisplacement,r.peak);
      if(p>=1){for(const entry of r.entries)restoreModule(entry);active.splice(i,1);}
    }
    requestAnimationFrame(tick);
  }requestAnimationFrame(tick);

  window.__pulseFormationReharmonizationVisual={
    begin,
    stats:()=>({active:active.length,reactions:state.reactions,strong:state.strong,weak:state.weak,lastArea:state.lastArea,lastName:state.lastName,lastFormationId:state.lastFormationId,lastFormationSize:state.lastFormationSize,lastAppliedModules:state.lastAppliedModules,lastPeakDisplacement:Number(state.lastPeakDisplacement.toFixed(4)),comfort:reduced()})
  };
});
