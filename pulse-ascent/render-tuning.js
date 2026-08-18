document.querySelector('#rotateHint')?.remove();

const coarse=matchMedia('(pointer: coarse)').matches;
const mobile=()=>innerWidth<750||innerHeight<520||coarse;

const applyRenderTuning=()=>{
  const game=window.__pulseAscent;
  if(!game?.bloom||!game?.camera||!game?.world?.avatar){requestAnimationFrame(applyRenderTuning);return;}

  const isMobile=mobile();
  game.bloom.threshold=isMobile?.58:.46;
  game.bloom.radius=isMobile?.36:.48;
  game.bloom.strength=isMobile?.78:1.05;

  const fov=isMobile?72:68;
  if(Math.abs(game.camera.fov-fov)>.05){game.camera.fov=fov;game.camera.updateProjectionMatrix();}

  // Rez-style framing: the avatar is a small orientation cue near the lower edge,
  // leaving the center and lower-middle playfield open for targets and attack reads.
  const avatar=game.world.avatar;
  avatar.position.y=isMobile?-3.55:-3.05;
  avatar.position.z=isMobile?.65:2.15;
  avatar.scale.setScalar(isMobile?.58:.78);

  const rig=game.world.humanRig;
  if(rig?.root){
    const sync=(game.sync||0)/100;
    const base=isMobile?.62:.8;
    rig.root.scale.setScalar(base+sync*.018);
    rig.root.position.y=isMobile?.48:.62;
    for(const m of rig.meshes||[]){
      if(m?.material&&Number.isFinite(m.userData?.baseOpacity))m.material.opacity=Math.min(m.material.opacity,m.userData.baseOpacity*(isMobile?.72:.9));
    }
    if(rig.core?.material)rig.core.material.opacity=Math.min(rig.core.material.opacity,isMobile?.72:.88);
    if(rig.halo?.material)rig.halo.material.opacity=Math.min(rig.halo.material.opacity,isMobile?.11:.16);
    if(rig.halo2?.material)rig.halo2.material.opacity=Math.min(rig.halo2.material.opacity,isMobile?.08:.13);
  }

  requestAnimationFrame(applyRenderTuning);
};
applyRenderTuning();
