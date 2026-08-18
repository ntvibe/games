import * as THREE from 'three';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=t=>t*t*(3-2*t);
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent&&window.__pulseTopologyWorlds?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});

waitFor().then(game=>{
  if(game.__topologyMorphInstalled)return;
  game.__topologyMorphInstalled=true;

  const topo=window.__pulseTopologyWorlds;
  const worlds=topo.worlds;
  const bases=worlds.map(w=>new Float32Array(w.geo.attributes.position.array));
  const durations={layer:1.05,area:1.65};
  let age=99,kind='layer',fromArea=topo.area-1,toArea=topo.area-1,fromLayer=topo.layer-1,toLayer=topo.layer-1;
  let previousWorld=null;

  const revealFor=l=>[.25,.42,.61,.8,1][clamp(l,0,4)];
  const restore=(idx)=>{
    const w=worlds[idx];if(!w)return;
    w.geo.attributes.position.array.set(bases[idx]);
    w.geo.attributes.position.needsUpdate=true;
  };

  const trigger=(nextArea,nextLayer)=>{
    const currentArea=toArea,currentLayer=toLayer;
    const areaChanged=nextArea!==currentArea;
    fromArea=currentArea;fromLayer=currentLayer;toArea=nextArea;toLayer=nextLayer;
    kind=areaChanged?'area':'layer';age=0;
    previousWorld=areaChanged?worlds[fromArea]:null;
    if(previousWorld){
      restore(fromArea);
      previousWorld.root.visible=true;
      previousWorld.root.userData.morphGhost=true;
    }
    restore(toArea);
  };

  const baseSetSection=game.setSection.bind(game);
  game.setSection=(i,name)=>{
    const beforeArea=toArea,beforeLayer=toLayer;
    baseSetSection(i,name);
    const nextArea=clamp((topo.area||1)-1,0,4),nextLayer=clamp((topo.layer||1)-1,0,4);
    if(nextArea!==beforeArea||nextLayer!==beforeLayer)trigger(nextArea,nextLayer);
  };

  const baseUpdate=game.world.update.bind(game.world);
  game.world.update=(dt,t,energy,sync=0)=>{
    baseUpdate(dt,t,energy,sync);

    const liveArea=clamp((topo.area||1)-1,0,4),liveLayer=clamp((topo.layer||1)-1,0,4);
    if(liveArea!==toArea||liveLayer!==toLayer)trigger(liveArea,liveLayer);

    age+=dt;
    const duration=durations[kind],p=clamp(age/duration,0,1),ease=smooth(p);
    const active=worlds[toArea],base=bases[toArea],arr=active.geo.attributes.position.array;
    const oldReveal=revealFor(fromArea===toArea?fromLayer:0),newReveal=revealFor(toLayer);
    const oldVertices=Math.floor(active.totalSegments*oldReveal)*2;
    const newVertices=Math.floor(active.totalSegments*newReveal)*2;
    const strength=(1-ease)*(kind==='area'?1:.72);

    // New topology grows from a central signal spine while existing geometry flexes
    // through a smooth wave. This keeps transitions spatial and avoids flash/bloom wipes.
    for(let i=0;i<newVertices;i++){
      const j=i*3,bx=base[j],by=base[j+1],bz=base[j+2];
      const depth=clamp((-bz-14)/170,0,1),phase=t*2.2+depth*11+i*.013;
      const newlyRevealed=i>=oldVertices;
      const birth=newlyRevealed?ease:1;
      const spineX=Math.sin(phase*.37)*(.3+depth*1.2),spineY=Math.cos(phase*.31)*(.2+depth*.75);
      const fold=strength*(.25+depth*.75);
      arr[j]=THREE.MathUtils.lerp(spineX,bx,birth)+Math.sin(phase)*fold*.55;
      arr[j+1]=THREE.MathUtils.lerp(spineY,by,birth)+Math.cos(phase*.83)*fold*.38;
      arr[j+2]=bz+Math.sin(phase*.41)*fold*2.2;
    }
    active.geo.attributes.position.needsUpdate=true;
    active.root.scale.setScalar(.96+ease*.04);
    active.mat.opacity=Math.min(active.mat.opacity,(.045+ease*.13)*(1+energy*.18));

    if(previousWorld){
      const prevBase=bases[fromArea],prevArr=previousWorld.geo.attributes.position.array;
      const visibleVertices=Math.floor(previousWorld.totalSegments*revealFor(fromLayer))*2;
      const vanish=1-ease;
      for(let i=0;i<visibleVertices;i++){
        const j=i*3,bx=prevBase[j],by=prevBase[j+1],bz=prevBase[j+2],depth=clamp((-bz-14)/170,0,1),phase=t*1.8+depth*9+i*.017;
        prevArr[j]=bx*(.72+.28*vanish)+Math.sin(phase)*(1-vanish)*(1.5+depth*3.2);
        prevArr[j+1]=by*(.72+.28*vanish)+Math.cos(phase*.7)*(1-vanish)*(1+depth*2);
        prevArr[j+2]=bz-(1-vanish)*(8+depth*22);
      }
      previousWorld.geo.attributes.position.needsUpdate=true;
      previousWorld.mat.opacity=Math.min(.11,vanish*.11);
      previousWorld.packetMat.opacity=Math.min(.42,vanish*.42);
      if(p>=1){
        restore(fromArea);previousWorld.root.visible=false;previousWorld.root.userData.morphGhost=false;previousWorld=null;
      }
    }

    if(p>=1){
      restore(toArea);active.root.scale.setScalar(1);
    }
  };

  window.__pulseTopologyMorph={
    trigger:()=>trigger(clamp((topo.area||1)-1,0,4),clamp((topo.layer||1)-1,0,4)),
    get active(){return age<durations[kind];},
    get progress(){return clamp(age/durations[kind],0,1);},
    stats:()=>({kind,fromArea:fromArea+1,toArea:toArea+1,fromLayer:fromLayer+1,toLayer:toLayer+1,active:age<durations[kind],progress:clamp(age/durations[kind],0,1)})
  };
});
