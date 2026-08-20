import * as THREE from 'three';

const TAU=Math.PI*2;
const NAMES=['SIGNAL GRID','PRISM CROWN','CHROMA HELIX','ORGANIC FORK','NEURAL LANCET'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

function stretchModule(module,sx=1,sy=1,sz=1){
  module.scale.x*=sx;module.scale.y*=sy;module.scale.z*=sz;
}

export function applyAreaVariant(root,type,areaIndex=0){
  const area=clamp(areaIndex|0,0,4),modules=root.children.filter(c=>c.name==='rez-volume-model');
  root.userData.areaVariant=NAMES[area];root.userData.areaIndex=area;
  if(!modules.length)return root;

  if(area===0){
    // SIGNAL GRID: low, wide industrial silhouettes with orthogonal bus-like spacing.
    modules.forEach((m,i)=>{
      const side=i===0?0:(i%2?1:-1);m.position.x+=side*(.025+i*.012);m.position.y*=.84;m.position.z*=.92;
      m.rotation.z+=side*.055;stretchModule(m,1.08,.9,.96);m.userData.variantRole=i===0?'core':'bus';
    });
  }else if(area===1){
    // PRISM CROWN: mirrored vertical wings and a narrow central body, distinct at a glance.
    modules.forEach((m,i)=>{
      const side=i===0?0:(i%2?1:-1);m.position.x*=.78;m.position.x+=side*(.07+i*.018);m.position.y=m.position.y*1.12+(i===0?0:.12+.035*i);
      m.rotation.z+=side*(.17+.025*i);m.rotation.y+=side*.08;stretchModule(m,i===0?.78:.72,i===0?1.24:1.34,.92);m.userData.variantRole=i===0?'spire':'mirror-wing';
    });
  }else if(area===2){
    // CHROMA HELIX: modules orbit through depth so the silhouette twists instead of stacking flat.
    const n=Math.max(1,modules.length);
    modules.forEach((m,i)=>{
      const a=i/n*TAU+.55;m.position.x+=Math.cos(a)*(.07+.02*i);m.position.y+=Math.sin(a)*(.07+.018*i);m.position.z+=(i-(n-1)/2)*.12;
      m.rotation.x+=Math.sin(a)*.14;m.rotation.y+=Math.cos(a)*.2;m.rotation.z+=a*.12;stretchModule(m,.94,1.02,1.18);m.userData.variantRole='helix';
    });
  }else if(area===3){
    // ORGANIC FORK: deliberately asymmetric branching with unequal mass on each side.
    modules.forEach((m,i)=>{
      const side=i===0?0:(i%2?1:-1),weight=i%3===1?1.24:.92;m.position.x+=side*(.08+.035*i)*weight;m.position.y+=i===0?-.03:(i%2?.11:-.045);m.position.z+=side*.035*i;
      m.rotation.z+=side*(.2+.035*i);m.rotation.x+=(i%2?.12:-.05);stretchModule(m,weight,1.08+(i%2?.12:0),.95);m.userData.variantRole=i===0?'seed':'branch';
    });
  }else{
    // NEURAL LANCET: tall cathedral-like profile with narrow central spire and aligned side pods.
    modules.forEach((m,i)=>{
      const side=i===0?0:(i%2?1:-1);m.position.x*=.7;m.position.x+=side*(.04+.012*i);m.position.y=m.position.y*1.08+(i===0?.08:.16+.055*i);m.position.z*=.8;
      m.rotation.z+=side*(.075+.012*i);m.rotation.y+=side*.035;stretchModule(m,i===0?.7:.76,i===0?1.38:1.24,.88);m.userData.variantRole=i===0?'lancet':'choir-pod';
    });
  }

  // Family personality survives the Area silhouette pass.
  if(type==='tank')root.scale.x*=1.08;
  else if(type==='node')root.scale.set(root.scale.x*.9,root.scale.y*1.08,root.scale.z*.9);
  else if(type==='prism')root.scale.y*=1.08;
  else if(type==='sentinel')root.scale.set(root.scale.x*1.04,root.scale.y*1.08,root.scale.z*1.04);

  return root;
}

export function areaVariantName(areaIndex=0){return NAMES[clamp(areaIndex|0,0,4)];}
export const AREA_VARIANT_NAMES=NAMES;
