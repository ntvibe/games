import * as THREE from 'three';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mobile=()=>innerWidth<760||matchMedia('(pointer: coarse)').matches;
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent&&window.__pulseDirectAscent&&window.__pulseDirectAscentRemix&&window.__pulseTopologyWorlds?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});

waitFor().then(game=>{
  if(game.__directAscentCrossoverInstalled)return;game.__directAscentCrossoverInstalled=true;
  const direct=window.__pulseDirectAscent,topology=window.__pulseTopologyWorlds;
  const ghosts=new Set();
  let lastArea=direct.state.area||1,lastSection=game.section||0,echoes=0;

  function makeGhost(sourceArea,duration=4.2,intensity=1){
    if(!direct.active||sourceArea<1||sourceArea>5)return null;
    const src=topology.worlds[sourceArea-1],profile=topology.profiles[sourceArea-1];
    if(!src?.geo||!profile)return null;
    const root=new THREE.Group();root.name='direct-crossover-ghost';
    const mat=new THREE.LineBasicMaterial({
      color:profile.colors[1],transparent:true,opacity:0,
      blending:THREE.NormalBlending,depthWrite:false,depthTest:true
    });
    const line=new THREE.LineSegments(src.geo,mat);line.frustumCulled=false;root.add(line);
    root.position.copy(src.root.position);root.rotation.copy(src.root.rotation);root.scale.copy(src.root.scale);
    game.scene.add(root);ghosts.add(root);echoes++;
    const started=performance.now(),life=duration*1000,peak=(mobile()?.055:.085)*intensity;
    const tick=()=>{
      if(!root.parent)return;
      const p=(performance.now()-started)/life;
      if(p>=1||!direct.active){game.scene.remove(root);mat.dispose();ghosts.delete(root);return;}
      const envelope=Math.sin(Math.PI*clamp(p,0,1));
      mat.opacity=peak*envelope;
      root.position.z+=.018+.02*intensity;
      root.rotation.z+=.0007*(sourceArea%2?1:-1);
      root.rotation.y=Math.sin(p*Math.PI*2+sourceArea)*.018*intensity;
      root.scale.setScalar(1+envelope*.014*intensity);
      requestAnimationFrame(tick);
    };requestAnimationFrame(tick);
    return root;
  }

  function transitionEcho(fromArea,toArea){
    if(!direct.active||fromArea===toArea)return;
    makeGhost(fromArea,5.2,1.15);
    if(toArea>=4)makeGhost(Math.max(1,fromArea-1),3.4,.7);
    game.showCallout?.(`NETWORK MEMORY // AREA ${String(fromArea).padStart(2,'0')} ECHO`,.94);
    const t=game.audio?.ctx?.currentTime;
    if(t!==undefined&&game.audio?.osc&&game.audio?.midi){
      const roots=[43,46,41,45,48],r=roots[clamp(fromArea-1,0,4)];
      game.audio.osc('sine',game.audio.midi(r+24),t,.38,.018,game.audio.fx,0,-.45);
      game.audio.osc('triangle',game.audio.midi(r+31),t+.035,.3,.012,game.audio.fx,0,.45);
    }
  }

  function sectionEcho(area,section){
    if(!direct.active||area<3||section<2||section>3)return;
    const source=Math.max(1,area-(section===3?2:1));
    makeGhost(source,2.6,.6+.1*area);
    if(section===3&&window.__pulseTopologyMorph?.trigger)window.__pulseTopologyMorph.trigger();
  }

  const frame=()=>{
    const area=direct.state.area||1,section=game.section||0;
    if(direct.active){
      if(area!==lastArea)transitionEcho(lastArea,area);
      if(section!==lastSection)sectionEcho(area,section);
    }else if(ghosts.size){
      for(const g of [...ghosts]){if(g.parent)game.scene.remove(g);g.children.forEach(c=>c.material?.dispose?.());ghosts.delete(g);}
    }
    lastArea=area;lastSection=section;
    requestAnimationFrame(frame);
  };requestAnimationFrame(frame);

  window.__pulseDirectAscentCrossover={
    makeGhost,
    transitionEcho,
    stats:()=>({active:direct.active,area:direct.state.area,ghosts:ghosts.size,echoes,mobile:mobile()})
  };
});
