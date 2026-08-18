export function tunePass11Shells(root){
  const pass11=root.getObjectByName('11-pass11-macro-shells');
  if(!pass11)return;
  let hiddenSolids=0;
  pass11.traverse(o=>{
    if(o.name==='outer-cowl'){
      o.visible=false;
      hiddenSolids++;
    }
  });
  pass11.userData.shellMode='segmented-cowl';
  pass11.userData.hiddenConvexFillers=hiddenSolids;
  const meta=root.userData.sculptRuntime;
  if(meta){
    meta.inferred=[...(meta.inferred||[]),'engine cowl rendered as segmented plates; solid convex filler disabled'];
  }
}
