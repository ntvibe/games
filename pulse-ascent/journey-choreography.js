import * as THREE from 'three';

const lerp=THREE.MathUtils.lerp;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const waitForGame=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});

waitForGame().then(game=>{
  const rez=window.__rezscape;
  if(!rez)return;

  const cam=game.camera;
  const baseUpdate=game.world.update.bind(game.world);
  let transition=0,transitionTarget=0,bank=0,targetBank=0,drop=0,targetDrop=0,flash=0;
  let lastSection=game.section||0;

  const triggerJourney=(section)=>{
    transition=0;
    transitionTarget=1;
    const mode=section%5;
    targetBank=[-.18,.24,-.1,.32,-.26][mode];
    targetDrop=[-.35,.1,.55,-.55,.3][mode];
    rez.triggerRush?.();
    flash=1;
  };

  triggerJourney(lastSection);

  game.world.update=(dt,t,energy,sync=0)=>{
    baseUpdate(dt,t,energy,sync);
    if(game.section!==lastSection){lastSection=game.section;triggerJourney(lastSection);}

    transitionTarget=Math.max(0,transitionTarget-dt*1.35);
    transition=lerp(transition,transitionTarget,1-Math.pow(.001,dt));
    bank=lerp(bank,targetBank*(.35+transition*.65),1-Math.pow(.02,dt));
    drop=lerp(drop,targetDrop*(.25+transition*.75),1-Math.pow(.02,dt));
    flash=Math.max(0,flash-dt*1.8);

    const phrase=(t%16)/16;
    const wave=Math.sin(phrase*Math.PI*2);
    const breath=Math.sin(t*.42)*.04;
    const pointer=game.pointer?.x||0;

    cam.rotation.z=lerp(cam.rotation.z,bank+wave*.035+pointer*.015,dt*4.5);
    cam.position.x=lerp(cam.position.x,pointer*.38+Math.sin(t*.27)*.18,dt*3.2);
    cam.position.y=lerp(cam.position.y,drop+Math.cos(t*.31)*.13,dt*3.2);
    cam.lookAt(cam.position.x*.08,cam.position.y*.08,-30);

    if(rez.city?.root?.visible){
      rez.city.root.rotation.z=lerp(rez.city.root.rotation.z,-bank*.55,dt*2.5);
      rez.city.root.position.y=lerp(rez.city.root.position.y,-drop*.7,dt*2.5);
    }
    if(rez.tunnel?.root?.visible){
      rez.tunnel.root.rotation.z+=dt*(.018+energy*.025+transition*.12);
      const tunnelScale=1+Math.sin(t*.55)*.025+transition*.08;
      rez.tunnel.root.scale.set(tunnelScale,1-transition*.035,1);
    }
    if(rez.veils?.root?.visible){
      rez.veils.root.rotation.z=lerp(rez.veils.root.rotation.z,bank*.35,dt*1.8);
      rez.veils.root.position.y=lerp(rez.veils.root.position.y,drop*.45+Math.sin(t*.5)*.25,dt*2);
    }

    const rush=rez.rush||0;
    const targetExposure=1.05+energy*.08+sync*.06+rush*.18+flash*.12;
    game.renderer.toneMappingExposure=lerp(game.renderer.toneMappingExposure,targetExposure,dt*3.2);
    if(game.scene.fog){
      game.scene.fog.density=lerp(game.scene.fog.density,.016-rush*.004+transition*.002,dt*2.5);
    }

    const targetBg=new THREE.Color().setHSL((lastSection*.17+t*.003)%1,.7,.015+.018*energy+.012*rush);
    game.scene.background.lerp(targetBg,clamp(dt*1.7,0,1));
  };

  window.__pulseJourney={triggerJourney,get transition(){return transition;},get bank(){return bank;},get drop(){return drop;}};
});
