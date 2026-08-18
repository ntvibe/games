import * as THREE from 'three';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=THREE.MathUtils.lerp;
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent&&window.__pulseGenerativeDirector?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});

const LEGACY_ROOTS=['rezscape-city','rezscape-hex-tunnel','rezscape-veils','reference-architecture','reference-worlds','cinematic-setpieces'];

waitFor().then(game=>{
  if(game.__synesthesiaLayerDirectorInstalled)return;
  game.__synesthesiaLayerDirectorInstalled=true;
  const gen=window.__pulseGenerativeDirector;
  let accent=0,lastSection=-1,lastArea=-1;

  const curate=()=>{
    for(const name of LEGACY_ROOTS){const o=game.scene.getObjectByName(name);if(o)o.visible=false;}
    const old=window.__cinematicEvolution;
    if(old?.setpieces?.root)old.setpieces.root.visible=false;
    if(old?.pilot?.root)old.pilot.root.visible=false;
    old?.skins?.forEach?.(s=>{if(s?.root)s.root.visible=false;});
  };

  const applyLayer=()=>{
    const area=clamp((window.__pulseCampaign?.state?.selected||1)-1,0,4);
    const section=clamp(game.section||0,0,4);
    const group=gen.arch.groups[area];
    const reveal=[.34,.5,.66,.82,1][section];
    if(group){
      const n=Math.max(1,group.children.length);
      group.children.forEach((child,i)=>{
        const keep=(i+1)/n<=reveal || i%Math.max(2,5-section)===0;
        child.visible=keep;
        child.userData.layerBaseOpacity=child.material?.opacity??.1;
      });
    }
    if(area!==lastArea||section!==lastSection){
      accent=1;lastArea=area;lastSection=section;
      game.showCallout?.(`LAYER ${String(section+1).padStart(2,'0')} // ${gen.profiles[area]?.name||'SIGNAL'}`,.92);
    }
  };

  curate();applyLayer();
  const baseSetSection=game.setSection.bind(game);
  game.setSection=(i,name)=>{baseSetSection(i,name);curate();applyLayer();};

  const baseScoreTiming=game.scoreTiming.bind(game);
  game.scoreTiming=(q,count)=>{baseScoreTiming(q,count);if(q>.88)accent=Math.max(accent,.72+Math.min(1,count/8)*.28);};

  const baseUpdate=game.world.update.bind(game.world);
  game.world.update=(dt,t,energy,sync=0)=>{
    baseUpdate(dt,t,energy,sync);
    curate();
    const area=clamp((window.__pulseCampaign?.state?.selected||1)-1,0,4);
    if(area!==lastArea||game.section!==lastSection)applyLayer();
    accent=lerp(accent,0,1-Math.pow(.01,dt));
    const group=gen.arch.groups[area];
    if(group){
      group.children.forEach((c,i)=>{
        if(!c.visible||!c.material)return;
        const base=.055+((i%7)/7)*.045;
        c.material.opacity=clamp(base+energy*.045+sync*.055+accent*.055,.035,.24);
      });
      group.scale.setScalar(1+accent*.012);
    }
    gen.field.mat.opacity=clamp(.12+energy*.10+sync*.10+accent*.07,.1,.42);
    gen.field.mat.size=(innerWidth<760?.026:.023)+energy*.007+accent*.006;
    const bg=gen.profiles[area]?.bg??0x010207;
    game.scene.background.lerp(new THREE.Color(bg),clamp(dt*2.4,0,1));
  };

  window.__pulseSynesthesiaLayerDirector={
    legacyRoots:LEGACY_ROOTS,
    curate,
    get layer(){return clamp((game.section||0)+1,1,5);},
    get area(){return clamp((window.__pulseCampaign?.state?.selected||1),1,5);},
    stats:()=>({area:clamp((window.__pulseCampaign?.state?.selected||1),1,5),layer:clamp((game.section||0)+1,1,5),accent,legacyVisible:LEGACY_ROOTS.filter(n=>game.scene.getObjectByName(n)?.visible)})
  };
});
