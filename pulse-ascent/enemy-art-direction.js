import * as THREE from 'three';

const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=THREE.MathUtils.lerp;
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent&&window.__pulseTopologyCombat?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});

const TYPE_SCALE={drone:.72,tank:1.2,node:.92,prism:.9,sentinel:1.05};
const TYPE_COLOR={tank:0xff9f52,node:0xff6bd8,prism:0xffd86a,sentinel:0x9f8cff};

function pushSeg(out,a,b){out.push(a.x,a.y,a.z,b.x,b.y,b.z);}
function ring(out,r,z=0,steps=8,phase=0,ys=1){
  for(let i=0;i<steps;i++){
    const a=phase+i/steps*TAU,b=phase+(i+1)/steps*TAU;
    pushSeg(out,new THREE.Vector3(Math.cos(a)*r,Math.sin(a)*r*ys,z),new THREE.Vector3(Math.cos(b)*r,Math.sin(b)*r*ys,z));
  }
}
function spoke(out,a,bx=0,by=0,bz=0){pushSeg(out,new THREE.Vector3(0,0,0),new THREE.Vector3(bx,by,bz));}

function typeGlyph(type,s){
  const o=[];
  if(type==='tank'){
    ring(o,s,0,6,Math.PI/6,.78);ring(o,s*.62,.2,6,0,.78);
    for(let i=0;i<6;i++){const a=i/6*TAU+Math.PI/6;pushSeg(o,new THREE.Vector3(Math.cos(a)*s,Math.sin(a)*s*.78,0),new THREE.Vector3(Math.cos(a)*s*.62,Math.sin(a)*s*.62*.78,.2));}
    spoke(o,null,s*1.25,0,0);spoke(o,null,-s*1.25,0,0);
  }else if(type==='node'){
    ring(o,s*.7,0,4,Math.PI/4,1);ring(o,s*.38,.18,4,0,1);
    for(const [x,y] of [[1,0],[-1,0],[0,1],[0,-1]])pushSeg(o,new THREE.Vector3(x*s*.35,y*s*.35,.18),new THREE.Vector3(x*s*1.05,y*s*1.05,0));
  }else if(type==='prism'){
    const p=[new THREE.Vector3(0,s*1.18,0),new THREE.Vector3(-s*.82,-s*.72,.22),new THREE.Vector3(s*.82,-s*.72,.22),new THREE.Vector3(0,-s*.16,-s*.9)];
    [[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]].forEach(([a,b])=>pushSeg(o,p[a],p[b]));
  }else if(type==='sentinel'){
    ring(o,s*.84,0,10,0,.82);ring(o,s*.5,.18,6,Math.PI/6,.82);
    for(let i=0;i<3;i++){const a=i/3*TAU;pushSeg(o,new THREE.Vector3(Math.cos(a)*s*.5,Math.sin(a)*s*.5*.82,.18),new THREE.Vector3(Math.cos(a)*s*1.18,Math.sin(a)*s*1.18*.82,-.08));}
  }else{
    const p=[new THREE.Vector3(0,s*.95,0),new THREE.Vector3(s*.95,0,0),new THREE.Vector3(0,-s*.95,0),new THREE.Vector3(-s*.95,0,0)];
    for(let i=0;i<4;i++)pushSeg(o,p[i],p[(i+1)%4]);
    pushSeg(o,new THREE.Vector3(-s*.72,0,0),new THREE.Vector3(0,0,-s*.72));pushSeg(o,new THREE.Vector3(s*.72,0,0),new THREE.Vector3(0,0,-s*.72));
  }
  return o;
}

function areaMotif(area,s){
  const o=[];
  if(area===0){
    // PCB elbows: compact orthogonal traces, matching Signal Birth topology.
    const p=[[-1,0,-.1],[-.55,0,-.1],[-.55,.48,-.1],[.55,.48,-.1],[.55,0,-.1],[1,0,-.1]];
    for(let i=0;i<p.length-1;i++)pushSeg(o,new THREE.Vector3(p[i][0]*s,p[i][1]*s,p[i][2]),new THREE.Vector3(p[i+1][0]*s,p[i+1][1]*s,p[i+1][2]));
  }else if(area===1){
    // Glass Temple crest.
    const n=7;for(let i=0;i<n;i++){const x0=-s+i/(n-1)*s*2,x1=-s+(i+1)/(n-1)*s*2;const y0=Math.cos((x0/s)*Math.PI*.5)*s*.62,y1=Math.cos((x1/s)*Math.PI*.5)*s*.62;pushSeg(o,new THREE.Vector3(x0,y0,-.16),new THREE.Vector3(x1,y1,-.16));}
  }else if(area===2){
    // Chroma current: two offset flowing arcs.
    for(let band=0;band<2;band++)for(let i=0;i<7;i++){const x0=-s+i/6*s*2,x1=-s+(i+1)/6*s*2;pushSeg(o,new THREE.Vector3(x0,Math.sin(i*.8+band)*s*.26,-.18-band*.06),new THREE.Vector3(x1,Math.sin((i+1)*.8+band)*s*.26,-.18-band*.06));}
  }else if(area===3){
    // Organic fork.
    pushSeg(o,new THREE.Vector3(0,-s*.7,-.14),new THREE.Vector3(0,s*.18,-.14));
    for(const d of [-1,1]){pushSeg(o,new THREE.Vector3(0,s*.1,-.14),new THREE.Vector3(d*s*.72,s*.72,-.14));pushSeg(o,new THREE.Vector3(d*s*.38,s*.42,-.14),new THREE.Vector3(d*s*.92,s*.28,-.14));}
  }else{
    // Neural Cathedral vertical lancet.
    pushSeg(o,new THREE.Vector3(0,-s,-.16),new THREE.Vector3(0,s*.72,-.16));
    for(const d of [-1,1]){pushSeg(o,new THREE.Vector3(0,s*.72,-.16),new THREE.Vector3(d*s*.52,s*.22,-.16));pushSeg(o,new THREE.Vector3(d*s*.52,s*.22,-.16),new THREE.Vector3(d*s*.52,-s*.55,-.16));}
  }
  return o;
}

waitFor().then(game=>{
  if(game.__enemyArtDirectionInstalled)return;
  game.__enemyArtDirectionInstalled=true;
  let styledCount=0;
  const selectedArea=()=>clamp((window.__pulseCampaign?.state?.selected||1)-1,0,4);
  const paletteFor=area=>window.__pulseTopologyWorlds?.profiles?.[area]?.colors||[0x6ef3ff,0xff63d7];

  function styleEnemy(enemy){
    if(!enemy||enemy.type==='danger'||enemy.type==='rupture'||enemy.__artDirected)return enemy;
    enemy.__artDirected=true;styledCount++;
    const area=selectedArea(),scale=TYPE_SCALE[enemy.type]||TYPE_SCALE.drone,palette=paletteFor(area),primary=TYPE_COLOR[enemy.type]??palette[0],secondary=palette[1]??0xffffff;
    const root=new THREE.Group();root.name='topology-enemy-silhouette';enemy.group.add(root);
    const make=(verts,color,opacity)=>{const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));const mat=new THREE.LineBasicMaterial({color,transparent:true,opacity,blending:THREE.NormalBlending,depthWrite:false});const line=new THREE.LineSegments(geo,mat);root.add(line);return line;};
    const shell=make(typeGlyph(enemy.type,scale),primary,.74),motif=make(areaMotif(area,scale*1.08),secondary,.38);
    const pointMat=new THREE.PointsMaterial({color:secondary,size:.045,transparent:true,opacity:.48,blending:THREE.NormalBlending,depthWrite:false,sizeAttenuation:true});
    const pointGeo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0),new THREE.Vector3(scale*.34,0,.12),new THREE.Vector3(-scale*.34,0,.12)]);const nodes=new THREE.Points(pointGeo,pointMat);root.add(nodes);
    root.scale.setScalar(.08);
    enemy.userDataArt={area,root,shell,motif,nodes,seed:(styledCount%19)/19};

    // Retain the original collision/target mesh, but stop it dominating the silhouette or bloom.
    if(enemy.mesh?.material){enemy.mesh.material.opacity=.12;enemy.mesh.material.blending=THREE.NormalBlending;enemy.mesh.material.depthWrite=false;}
    if(enemy.halo?.material){enemy.halo.material.opacity=.1;enemy.halo.material.blending=THREE.NormalBlending;}
    if(enemy.core?.material){enemy.core.material.opacity=.46;enemy.core.material.blending=THREE.NormalBlending;}

    const baseUpdate=enemy.update.bind(enemy);
    enemy.update=(dt,t)=>{
      baseUpdate(dt,t);if(enemy.dead)return;
      const a=enemy.userDataArt,appear=1-Math.exp(-Math.max(0,enemy.age||0)*6.2),beat=(t*(game.audio?.beatDur?1/game.audio.beatDur:2.13))%1,pulse=Math.pow(Math.max(0,Math.cos(beat*TAU)),10);
      a.root.scale.setScalar(lerp(.08,1,appear)*(1+pulse*.025));
      a.root.rotation.z=Math.sin(t*(.35+a.area*.06)+a.seed*TAU)*(.035+a.area*.008);
      a.motif.rotation.z=-a.root.rotation.z*.7;
      a.shell.material.opacity=enemy.locked?.94:.66+pulse*.05;
      a.motif.material.opacity=enemy.locked?.62:.3+pulse*.06;
      a.nodes.material.opacity=.38+pulse*.16;
      if(enemy.mesh?.material)enemy.mesh.material.opacity=enemy.locked?.22:.08;
      if(enemy.halo?.material)enemy.halo.material.opacity=enemy.locked?.64:.08;
    };
    return enemy;
  }

  const baseSpawn=game.spawnEnemy.bind(game);
  game.spawnEnemy=(type,pos,phase=0)=>styleEnemy(baseSpawn(type,pos,phase));
  for(const enemy of game.enemies)styleEnemy(enemy);

  window.__pulseEnemyArtDirection={
    styleEnemy,
    stats:()=>({area:selectedArea()+1,styled:game.enemies.filter(e=>e.__artDirected&&!e.dead).length,totalStyled:styledCount})
  };
});
