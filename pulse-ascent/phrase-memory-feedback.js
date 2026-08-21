import * as THREE from 'three';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mobile=()=>innerWidth<760||matchMedia('(pointer: coarse)').matches;
const reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent&&window.__pulsePhraseMemory?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});
const AREA_COLORS=[0x58edff,0xffaa55,0x68ffe1,0xa5ff72,0xcad0ff];

waitFor().then(game=>{
  if(game.__phraseMemoryFeedbackInstalled)return;game.__phraseMemoryFeedbackInstalled=true;
  const state={mode:'idle',area:1,name:'',strong:false,voice:0,markers:[],markerFormation:0,lastEvent:0};
  const comfort=()=>!!window.__pulseSettings?.state?.comfort||reducedMotion();

  const chip=document.createElement('div');chip.id='phraseMemoryFeedback';chip.className='phrase-memory-feedback';
  chip.innerHTML='<small>NEXT REPLY</small><b>—</b><span class="phrase-voices"><i></i><i></i><i></i></span>';
  document.querySelector('#hud')?.appendChild(chip);
  const label=chip.querySelector('small'),title=chip.querySelector('b'),dots=[...chip.querySelectorAll('i')];
  const style=document.createElement('style');style.textContent=`
    .phrase-memory-feedback{position:absolute;left:50%;top:112px;transform:translate(-50%,-5px);min-width:142px;padding:6px 10px 7px;border:1px solid #8ef8ff26;background:#020610b5;backdrop-filter:blur(7px);text-align:center;pointer-events:none;opacity:0;transition:opacity .16s ease,transform .16s ease;z-index:7}
    .phrase-memory-feedback.show{opacity:.9;transform:translate(-50%,0)}
    .phrase-memory-feedback.active{border-color:#c8fbff42;background:#020610d2}
    .phrase-memory-feedback small{display:block;font:700 6px/1 system-ui;letter-spacing:.22em;color:#7b9ca7;margin-bottom:4px}
    .phrase-memory-feedback b{display:block;font:800 9px/1 system-ui;letter-spacing:.13em;color:#dffcff;white-space:nowrap}
    .phrase-voices{display:flex;justify-content:center;gap:5px;margin-top:5px}.phrase-voices i{width:13px;height:2px;background:#67808a38;transition:opacity .08s ease,transform .08s ease}.phrase-voices i.on{background:currentColor;opacity:.86;transform:scaleX(1.1)}
    @media(max-width:760px){.phrase-memory-feedback{top:106px;min-width:132px;padding:5px 8px 6px}.phrase-memory-feedback b{font-size:8px}}
  `;document.head.appendChild(style);

  const markerGeo=new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0,.72,.05),new THREE.Vector3(.54,.1,.05),new THREE.Vector3(.34,-.56,.05),new THREE.Vector3(0,-.72,.05),new THREE.Vector3(-.34,-.56,.05),new THREE.Vector3(-.54,.1,.05)
  ]);
  const markerMat=new THREE.LineBasicMaterial({color:AREA_COLORS[0],transparent:true,opacity:0,depthWrite:false,depthTest:false,blending:THREE.NormalBlending});

  function renderChip(){
    const visible=state.mode!=='idle'&&state.name;
    chip.classList.toggle('show',!!visible);chip.classList.toggle('active',state.mode==='active');
    if(!visible)return;
    label.textContent=state.mode==='armed'?'NEXT REPLY':'ENEMY REPLY';title.textContent=state.name;
    const color=new THREE.Color(AREA_COLORS[clamp(state.area-1,0,4)]).getStyle();chip.style.color=color;chip.style.borderColor=`${color}42`;title.style.color=color;
    dots.forEach((d,i)=>d.classList.toggle('on',state.mode==='active'&&i<state.voice));
  }

  function clearMarkers(){
    for(const m of state.markers)if(m.parent)m.parent.remove(m);
    state.markers.length=0;state.markerFormation=0;markerMat.opacity=0;
  }

  function pickFormation(){
    const eligible=game.enemies.filter(e=>!e.dead&&e.type!=='danger'&&e.type!=='rupture'&&e.group?.position?.z<-6&&e.group.position.z>-55);
    const groups=new Map();
    for(const e of eligible){if(e.__formationId==null)continue;const list=groups.get(e.__formationId)||[];list.push(e);groups.set(e.__formationId,list);}
    if(groups.size){
      const ranked=[...groups.entries()].sort((a,b)=>b[1].length-a[1].length||Math.abs((a[1][0]?.group?.position?.z||-24)+24)-Math.abs((b[1][0]?.group?.position?.z||-24)+24));
      state.markerFormation=ranked[0][0];return ranked[0][1];
    }
    return eligible.slice(0,mobile()?3:4);
  }

  function markFormation(){
    clearMarkers();const members=pickFormation().slice(0,mobile()?4:6);if(!members.length)return;
    markerMat.color.set(AREA_COLORS[clamp(state.area-1,0,4)]);
    for(const enemy of members){
      const marker=new THREE.LineLoop(markerGeo,markerMat);marker.name='phrase-memory-marker';marker.renderOrder=20;
      const scale=enemy.type==='tank'||enemy.type==='sentinel'?1.28:enemy.type==='node'?1.12:.96;
      marker.scale.setScalar(scale);marker.userData.lastPulse=1;marker.position.z=.28;enemy.group.add(marker);state.markers.push(marker);
    }
  }

  addEventListener('pulse:enemy-phrase-memory-armed',e=>{
    const d=e.detail||{};state.mode='armed';state.area=d.area||1;state.name=d.name||'';state.strong=!!d.strong;state.voice=0;state.lastEvent=performance.now();clearMarkers();renderChip();
  });
  addEventListener('pulse:enemy-phrase-memory-begin',e=>{
    const d=e.detail||{};state.mode='active';state.area=d.area||1;state.name=d.name||state.name;state.strong=!!d.strong;state.voice=0;state.lastEvent=performance.now();markFormation();renderChip();
  });
  addEventListener('pulse:enemy-phrase-step',e=>{
    const d=e.detail||{};if(!d.mutated||state.mode!=='active'||d.name!==state.name)return;
    state.voice=clamp(d.voice||0,0,3);state.lastEvent=performance.now();renderChip();
  });
  addEventListener('pulse:enemy-phrase-memory-end',e=>{
    const d=e.detail||{};if(state.name&&d.name&&d.name!==state.name)return;
    state.voice=3;renderChip();clearMarkers();
    const stamp=performance.now();state.lastEvent=stamp;setTimeout(()=>{if(state.lastEvent!==stamp)return;state.mode='idle';state.name='';state.voice=0;renderChip();},comfort()?180:520);
  });

  const tick=()=>{
    if(state.mode==='active'&&state.markers.length){
      const ctx=game.audio?.ctx,stepDur=game.audio?.stepDur||.117;
      const phase=ctx?((ctx.currentTime/stepDur)%1):((performance.now()/1000/stepDur)%1);
      const pulse=Math.pow(Math.max(0,Math.cos(phase*Math.PI*2)),8);
      const base=comfort()?.1:(mobile()?.16:.2);
      markerMat.opacity=clamp(base+pulse*(state.strong?.17:.1),0,.4);
      const nextPulse=1+pulse*(comfort()?.008:.025);
      for(const marker of state.markers){
        const previous=marker.userData.lastPulse||1;marker.scale.multiplyScalar(nextPulse/Math.max(.001,previous));marker.userData.lastPulse=nextPulse;
      }
    }
    requestAnimationFrame(tick);
  };requestAnimationFrame(tick);

  window.__pulsePhraseMemoryFeedback={
    chip,markerMaterial:markerMat,
    stats:()=>({mode:state.mode,area:state.area,name:state.name,strong:state.strong,voice:state.voice,markers:state.markers.length,formation:state.markerFormation,normalBlending:markerMat.blending===THREE.NormalBlending,visible:chip.classList.contains('show')})
  };
});
