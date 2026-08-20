import * as THREE from 'three';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mobile=()=>innerWidth<760||innerHeight<520||matchMedia('(pointer: coarse)').matches;
const reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const AREA_COLORS=[0x55efff,0xffa95e,0x69ffe2,0xa6ff76,0xcbd2ff];
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent&&window.__pulseFormationReveal?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});

function makeSigil(color){
  const r=1.05,v=[];
  const seg=(a,b,c,d)=>v.push(a,b,0,c,d,0);
  // Shape-first command insignia: readable without relying on color.
  seg(-r,-.35,-r,-.82);seg(-r,-.82,-.55,-.82);seg(r,-.35,r,-.82);seg(r,-.82,.55,-.82);
  seg(-r,.35,-r,.82);seg(-r,.82,-.55,.82);seg(r,.35,r,.82);seg(r,.82,.55,.82);
  seg(-.42,1.08,0,.72);seg(0,.72,.42,1.08);seg(-.28,1.25,0,1.02);seg(0,1.02,.28,1.25);
  seg(-.24,-1.08,0,-.88);seg(0,-.88,.24,-1.08);
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(v,3));
  const mat=new THREE.LineBasicMaterial({color,transparent:true,opacity:.46,depthWrite:false,depthTest:true,blending:THREE.NormalBlending});
  const line=new THREE.LineSegments(geo,mat);line.name='formation-command-sigil';line.renderOrder=4;
  return{line,geo,mat};
}

waitFor().then(game=>{
  if(game.__formationLeaderReadabilityInstalled)return;game.__formationLeaderReadabilityInstalled=true;
  const state={markers:new Map(),cues:0,lockCues:0,hinted:new Set(),lastLockAt:-99};
  const area=()=>clamp((window.__pulseCampaign?.state?.selected||1)-1,0,4);
  const comfort=()=>!!window.__pulseSettings?.state?.comfort||reducedMotion();

  function leaderTone(enemy){
    const audio=game.audio,t=audio?.ctx?.currentTime;if(t===undefined||!audio?.osc)return;
    const root=(audio.rootMidi||43)+[31,36,38,34,43][area()];
    audio.osc('triangle',audio.midi(root),t+.004,.055,.009,audio.fx,0,enemy.group.position.x<0?-.24:.24);
    audio.osc('sine',audio.midi(root+7),t+.035,.08,.006,audio.fx,0,enemy.group.position.x<0?.2:-.2);
  }

  function ensure(enemy){
    if(!enemy||enemy.dead||!enemy.group||!enemy.__formationId||enemy.__formationVoice!==0)return null;
    let m=state.markers.get(enemy);if(m)return m;
    const sigil=makeSigil(AREA_COLORS[area()]||AREA_COLORS[0]);game.scene.add(sigil.line);
    m={...sigil,locked:false,shown:false,phase:Math.random()*Math.PI*2};state.markers.set(enemy,m);enemy.__formationLeaderReadable=true;return m;
  }

  function remove(enemy,m){
    if(m?.line?.parent)game.scene.remove(m.line);m?.geo?.dispose?.();m?.mat?.dispose?.();state.markers.delete(enemy);if(enemy)delete enemy.__formationLeaderReadable;
  }

  function tick(){
    const now=game.time||0,beat=game.audio?.beatDur?((game.audio.ctx?.currentTime||now)/game.audio.beatDur)%1:0,pulse=Math.pow(Math.max(0,Math.cos(beat*Math.PI*2)),10);
    const live=new Set();
    for(const enemy of game.enemies||[]){
      if(enemy.dead||!enemy.__formationId||enemy.__formationVoice!==0||!enemy.group)continue;
      live.add(enemy);const m=ensure(enemy);if(!m)continue;
      const p=enemy.group.getWorldPosition(new THREE.Vector3());p.y+=1.35+(enemy.type==='tank'||enemy.type==='sentinel'?.22:0);m.line.position.copy(p);m.line.quaternion.copy(game.camera.quaternion);
      const targetable=!enemy.__revealLocked,locked=!!enemy.locked,base=mobile()?.82:.92,comfortScale=comfort()?.92:1;
      m.line.scale.setScalar(base*comfortScale*(1+(locked?.12:.04)*pulse));
      m.mat.opacity=targetable?(locked?.82:.5+pulse*.08):.25;
      if(targetable&&!m.shown){m.shown=true;state.cues++;if(!state.hinted.has(enemy.__formationId)&&state.hinted.size<2){state.hinted.add(enemy.__formationId);game.showCallout?.('COMMAND TARGET // BREAK FIRST',.68);}}
      if(locked&&!m.locked&&now-state.lastLockAt>.28){leaderTone(enemy);state.lockCues++;state.lastLockAt=now;}
      m.locked=locked;
    }
    for(const [enemy,m] of [...state.markers])if(!live.has(enemy))remove(enemy,m);
    requestAnimationFrame(tick);
  }requestAnimationFrame(tick);

  window.__pulseFormationLeaderReadability={
    stats:()=>({leaders:state.markers.size,cues:state.cues,lockCues:state.lockCues,normalBlending:[...state.markers.values()].every(m=>m.mat.blending===THREE.NormalBlending),comfort:comfort()}),
    refresh:()=>{for(const e of game.enemies||[])ensure(e);}
  };
});
