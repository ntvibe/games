const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mobile=()=>innerWidth<760||matchMedia('(pointer: coarse)').matches;
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches||!!window.__pulseSettings?.state?.comfort;
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent&&window.__pulsePhraseMemory&&window.__pulseModelFusion?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});

const REPLIES=[
  {weak:'BUS ECHO',strong:'BUS RETURN'},
  {weak:'MIRROR SHARD',strong:'MIRROR ANSWER'},
  {weak:'TIDAL RIPPLE',strong:'TIDAL ECHO'},
  {weak:'BRANCH FEINT',strong:'BRANCH ANSWER'},
  {weak:'CHOIR SUSPENSION',strong:'CHOIR AFTERIMAGE'}
];

waitFor().then(game=>{
  if(game.__phraseMemoryFormationResponseInstalled)return;game.__phraseMemoryFormationResponseInstalled=true;
  const active=[];
  const state={begun:0,weak:0,strong:0,lastArea:1,lastName:'',lastKind:'',lastMembers:0,lastPeak:0,lastVoice:0};

  function liveModels(area){
    return (game.enemies||[]).filter(e=>!e.dead&&e.type!=='danger'&&e.type!=='rupture'&&e.__fusionModel&&clamp(e.__fusionModel.userData.areaIndex??0,0,4)===area);
  }
  function chooseFormation(area){
    const pool=liveModels(area);if(!pool.length)return [];
    const groups=new Map();
    for(const e of pool){const id=e.__formationId;if(id==null)continue;if(!groups.has(id))groups.set(id,[]);groups.get(id).push(e);}
    let best=[];for(const members of groups.values())if(members.length>best.length)best=members;
    return (best.length>=2?best:pool).slice(0,mobile()?5:8);
  }
  function clearApplied(entry){
    const m=entry.model,a=entry.applied;if(!m)return;
    m.position.x-=a.x;m.position.y-=a.y;m.position.z-=a.z;
    m.rotation.x-=a.rx;m.rotation.y-=a.ry;m.rotation.z-=a.rz;
    a.x=a.y=a.z=a.rx=a.ry=a.rz=0;
  }
  function setApplied(entry,o){
    clearApplied(entry);const m=entry.model,a=entry.applied;
    a.x=o.x||0;a.y=o.y||0;a.z=o.z||0;a.rx=o.rx||0;a.ry=o.ry||0;a.rz=o.rz||0;
    m.position.x+=a.x;m.position.y+=a.y;m.position.z+=a.z;
    m.rotation.x+=a.rx;m.rotation.y+=a.ry;m.rotation.z+=a.rz;
  }

  function targetFor(area,strong,index,count,member,voice){
    const amp=(strong?1:.56)*(reduced()?.38:1),side=index%2?1:-1,phase=index/Math.max(1,count-1),v=clamp((voice||1)-1,0,2),o={x:0,y:0,z:0,rx:0,ry:0,rz:0};
    if(area===0){
      if(strong){o.x=-side*.28*amp;o.y=((index%3)-1)*.11*amp;o.ry=side*.18*amp;o.rz=-side*.07*amp;}
      else{o.x=side*.08*amp;o.y=(index%2?-.06:.04)*amp;o.ry=side*.06*amp;}
    }else if(area===1){
      if(strong){o.x=-side*(.24+.07*phase)*amp;o.y=(.05+.06*(1-Math.abs(.5-phase)*2))*amp;o.ry=-side*.28*amp;o.rz=-side*.2*amp;}
      else if(index%2===0){o.x=side*(.12+.05*phase)*amp;o.y=(index%3-1)*.045*amp;o.ry=side*.1*amp;o.rz=side*.14*amp;}
    }else if(area===2){
      const a=phase*Math.PI*2+v*.72;
      if(strong){o.x=Math.cos(a)*.22*amp;o.y=Math.sin(a)*.13*amp;o.z=Math.sin(a+.8)*.22*amp;o.rx=-Math.sin(a)*.16*amp;o.ry=Math.cos(a)*.2*amp;}
      else{o.y=Math.sin(a)*.07*amp;o.z=Math.cos(a)*.09*amp;o.ry=Math.sin(a)*.07*amp;}
    }else if(area===3){
      const fork=index%2?1:-1;
      if(strong){o.x=side*fork*(.18+.05*phase)*amp;o.y=Math.abs(.5-phase)*.1*amp;o.z=fork*.08*amp;o.rz=side*fork*.2*amp;}
      else if(index%2){o.x=side*.1*amp;o.y=-.045*amp;o.rz=-side*.08*amp;}
    }else{
      const voicing=[-.14,-.045,.055,.15][index%4];
      if(strong){o.x=voicing*amp;o.y=(index%4)*.07*amp;o.z=((index%2)?-.06:.06)*amp;o.ry=(index%4-1.5)*.055*amp;o.rz=side*.07*amp;}
      else{o.y=(index%4)*.035*amp;o.x=voicing*.35*amp;o.ry=(index%4-1.5)*.025*amp;}
    }
    return o;
  }

  function begin(detail={}){
    const area=clamp((detail.area||1)-1,0,4),strong=!!detail.strong,members=chooseFormation(area);if(!members.length)return false;
    const entries=members.map(enemy=>({enemy,model:enemy.__fusionModel,applied:{x:0,y:0,z:0,rx:0,ry:0,rz:0}}));
    const reaction={area,strong,kind:detail.kind||strong?'break':'cut',name:detail.name||REPLIES[area][strong?'strong':'weak'],entries,voice:1,start:performance.now()/1000,releasing:false,releaseStart:0,peak:0};
    active.push(reaction);state.begun++;state[strong?'strong':'weak']++;state.lastArea=area+1;state.lastName=reaction.name;state.lastKind=strong?'break':'cut';state.lastMembers=entries.length;state.lastVoice=1;
    window.__pulseRailCamera?.frameEncounter?.(members.slice(0,mobile()?4:6));
    return true;
  }

  addEventListener('pulse:enemy-phrase-memory-begin',e=>begin(e.detail||{}));
  addEventListener('pulse:enemy-phrase-step',e=>{
    const d=e.detail||{};if(!d.mutated)return;
    const area=clamp((d.area||1)-1,0,4);for(const r of active)if(r.area===area&&!r.releasing){r.voice=clamp(d.voice||1,1,3);state.lastVoice=r.voice;}
  });
  addEventListener('pulse:enemy-phrase-memory-end',e=>{
    const area=clamp((e.detail?.area||1)-1,0,4),now=performance.now()/1000;
    for(const r of active)if(r.area===area&&!r.releasing){r.releasing=true;r.releaseStart=now;}
  });

  function tick(){
    const now=performance.now()/1000;
    for(let i=active.length-1;i>=0;i--){
      const r=active[i],attackAge=now-r.start,attackIn=clamp(attackAge/(r.strong?.24:.18),0,1),release=r.releasing?clamp((now-r.releaseStart)/(reduced()?.18:.34),0,1):0;
      const envelope=(1-Math.pow(1-attackIn,3))*(1-release),voiceAccent=1+(r.voice-1)*(r.strong?.08:.035);let peak=0;
      for(let j=0;j<r.entries.length;j++){
        const entry=r.entries[j];if(entry.enemy.dead||!entry.model?.parent){clearApplied(entry);continue;}
        const base=targetFor(r.area,r.strong,j,r.entries.length,entry.enemy,r.voice),o={};
        for(const k of ['x','y','z','rx','ry','rz'])o[k]=(base[k]||0)*envelope*voiceAccent;
        setApplied(entry,o);peak=Math.max(peak,Math.hypot(o.x||0,o.y||0,o.z||0));
      }
      r.peak=Math.max(r.peak,peak);state.lastPeak=Math.max(state.lastPeak,r.peak);
      if(r.releasing&&release>=1){for(const entry of r.entries)clearApplied(entry);active.splice(i,1);}
    }
    requestAnimationFrame(tick);
  }requestAnimationFrame(tick);

  window.__pulsePhraseMemoryFormationResponse={
    begin,
    stats:()=>({active:active.length,begun:state.begun,weak:state.weak,strong:state.strong,lastArea:state.lastArea,lastName:state.lastName,lastKind:state.lastKind,lastMembers:state.lastMembers,lastPeak:Number(state.lastPeak.toFixed(4)),lastVoice:state.lastVoice,reduced:reduced()})
  };
});
