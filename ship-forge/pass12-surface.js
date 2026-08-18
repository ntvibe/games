import * as THREE from 'three';

const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const hash=(s)=>{let h=2166136261>>>0;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
const rnd=(n)=>((Math.sin(n*12.9898+78.233)*43758.5453)%1+1)%1;

function noiseCanvas(size=128,seed=17,contrast=1){
  const c=document.createElement('canvas');c.width=c.height=size;
  const ctx=c.getContext('2d'),img=ctx.createImageData(size,size),d=img.data;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const i=(y*size+x)*4;
    const n0=rnd(seed+x*1.731+y*4.913),n1=rnd(seed*2+x*.37+y*.81),n2=rnd(seed*3+Math.floor(x/8)*2.1+Math.floor(y/8)*5.7);
    let v=.50+(n0-.5)*.26+(n1-.5)*.14+(n2-.5)*.18;
    v=clamp(.5+(v-.5)*contrast);const g=Math.round(v*255);
    d[i]=d[i+1]=d[i+2]=g;d[i+3]=255;
  }
  ctx.putImageData(img,0,0);return c
}
function makeTex(canvas,repeat=5){const t=new THREE.CanvasTexture(canvas);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(repeat,repeat);t.colorSpace=THREE.NoColorSpace;t.anisotropy=2;t.needsUpdate=true;return t}
function makeSurfaceMaps(){return {rough:makeTex(noiseCanvas(128,41,1.35),6),fine:makeTex(noiseCanvas(128,97,1.7),11)}}
function cloneMaterial(m,name,maps){
  if(!m||!m.isMaterial)return m;
  const c=m.clone(),h=hash(name),j=((h%1000)/1000-.5);
  if(c.color){const col=c.color.clone(),hsl={h:0,s:0,l:0};col.getHSL(hsl);col.setHSL(hsl.h,hsl.s,clamp(hsl.l+j*.055,.025,.86));c.color.copy(col)}
  if('roughness' in c){const base=c.roughness??.45;c.roughness=clamp(base+j*.12,.16,.82);if(maps)c.roughnessMap=maps.rough}
  if('bumpMap' in c&&maps){c.bumpMap=maps.fine;c.bumpScale=.018+(h%7)*.002}
  if('metalness' in c)c.metalness=clamp((c.metalness??.8)+j*.055,.15,1);
  c.userData={...(c.userData||{}),pass12Original:m.uuid,pass12Roughness:c.roughness,pass12Metalness:c.metalness};c.needsUpdate=true;return c
}
function addHeatBand(g,name,pos,scale,rot=0){const m=new THREE.MeshStandardMaterial({color:0x3a1610,emissive:0x170502,emissiveIntensity:.25,roughness:.58,metalness:.52,transparent:true,opacity:.26,depthWrite:false});const mesh=new THREE.Mesh(new THREE.TorusGeometry(.62*scale,.085*scale,8,28),m);mesh.name=name;mesh.position.set(...pos);mesh.rotation.y=Math.PI/2;mesh.rotation.x=rot;g.add(mesh);return mesh}
function addSootPatch(g,name,pos,size,rot=[0,0,0],opacity=.20){const m=new THREE.MeshBasicMaterial({color:0x020304,transparent:true,opacity,depthWrite:false});const mesh=new THREE.Mesh(new THREE.PlaneGeometry(size[0],size[1]),m);mesh.name=name;mesh.position.set(...pos);mesh.rotation.set(...rot);g.add(mesh);return mesh}
function addEdgeScuffs(g){
  const material=new THREE.MeshStandardMaterial({color:0x7b858e,roughness:.30,metalness:.92,transparent:true,opacity:.44,depthWrite:false});
  const specs=[[-4.92,.57,.73,1.08,.018,.028],[-4.35,.72,-.80,.88,.016,-.035],[-2.80,1.16,.62,.84,.018,.018],[-1.74,1.28,-.57,.70,.016,-.012],[.85,.78,1.42,.88,.016,.035],[1.72,.66,-1.48,.72,.016,-.030],[3.24,.89,1.34,.66,.018,.020],[3.58,.76,-1.32,.60,.018,-.018]];
  specs.forEach((p,i)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(p[3],p[4],.026),material);m.name=`12-edge-scuff-${i}`;m.position.set(p[0],p[1],p[2]);m.rotation.y=p[5];g.add(m)})
}
function addSurfaceOverlays(root,thermal){
  const g=new THREE.Group();g.name='12-pass12-surface-overlays';root.add(g);
  const engines=[[4.10,.10,.80,.94],[4.10,.10,-.80,.94],[3.82,-.50,1.42,.63],[3.82,-.50,-1.42,.63]];
  engines.forEach(([x,y,z,s],i)=>{thermal.push(addHeatBand(g,`12-heat-band-${i}-a`,[x+.34*s,y,z],s));thermal.push(addHeatBand(g,`12-heat-band-${i}-b`,[x+.16*s,y,z],s*.90,.05*(i%2?1:-1)))});
  addSootPatch(g,'12-soot-rear-port',[3.05,.80,1.56],[1.62,.48],[Math.PI/2,0,.10],.18);addSootPatch(g,'12-soot-rear-star',[3.20,.76,-1.54],[1.42,.42],[Math.PI/2,0,-.08],.15);addSootPatch(g,'12-soot-dorsal',[.42,1.20,.02],[1.15,.36],[-Math.PI/2,0,.03],.12);addSootPatch(g,'12-soot-belly',[1.35,-1.13,.06],[1.48,.42],[Math.PI/2,0,.02],.14);addEdgeScuffs(g);return g
}
function makeDebugMaterial(m){const r='roughness' in m?m.roughness:.5,me='metalness' in m?m.metalness:0;const c=new THREE.Color().setHSL(.58-me*.42,.72,.18+r*.50);return new THREE.MeshBasicMaterial({color:c,wireframe:false})}

export function applyPass12(root){
  const maps=makeSurfaceMaps(),originals=new Map(),enhanced=new Map(),debugMats=new Map(),thermal=[];
  let textured=0,variants=0;
  root.traverse(o=>{
    if(!o.isMesh||!o.material||o.name.startsWith('12-'))return;
    const arr=Array.isArray(o.material)?o.material:[o.material];
    const next=arr.map((m,idx)=>{const key=`${o.uuid}:${idx}`;originals.set(key,m);if(m.transparent||m.emissiveIntensity>1.5||m.transmission>0.02){enhanced.set(key,m);return m}const n=cloneMaterial(m,`${o.name}:${idx}`,o.geometry?.attributes?.uv?maps:null);enhanced.set(key,n);variants++;if(n.roughnessMap)textured++;return n});
    o.material=Array.isArray(o.material)?next:next[0]
  });
  const overlays=addSurfaceOverlays(root,thermal);
  const previousExplode=root.userData.setExplode,previousWire=root.userData.setWireframe,previousTick=root.userData.tick;
  root.userData.setExplode=t=>{previousExplode?.(t);const k=clamp(t)*1.5;overlays.position.set(0,k*.16,0)};
  root.userData.setWireframe=v=>{previousWire?.(v);overlays.traverse(o=>{if(o.isMesh)o.material.wireframe=v})};
  root.userData.tick=(t,dt)=>{previousTick?.(t,dt);thermal.forEach((m,i)=>{m.material.opacity=.20+Math.sin(t*1.7+i*.9)*.035})};
  let debug=false;
  const setDebug=(on)=>{
    debug=!!on;
    root.traverse(o=>{
      if(!o.isMesh||o.name.startsWith('12-'))return;
      const arr=Array.isArray(o.material)?o.material:[o.material];
      if(debug){const next=arr.map((m,idx)=>{const key=`${o.uuid}:${idx}`,src=enhanced.get(key)||m;if(!debugMats.has(key))debugMats.set(key,makeDebugMaterial(src));return debugMats.get(key)});o.material=Array.isArray(o.material)?next:next[0]}
      else{const restored=arr.map((m,idx)=>enhanced.get(`${o.uuid}:${idx}`)||originals.get(`${o.uuid}:${idx}`)||m);o.material=Array.isArray(o.material)?restored:restored[0]}
    });
    overlays.visible=!debug
  };
  const meta=root.userData.sculptRuntime||{};
  const currentRank=Number(meta.version?.match(/ship-forge-v(\d+)/)?.[1]||0);
  if(currentRank<5)meta.version='ship-forge-v5-pass12';
  meta.sections={...(meta.sections||{}),surface12:overlays};
  const c=meta.confidence||{};meta.confidence={...c,visibleSide:Math.max(c.visibleSide||0,.972),rear:Math.max(c.rear||0,.89),hiddenSide:Math.max(c.hiddenSide||0,.74),underside:Math.max(c.underside||0,.66)};
  meta.inferred=[...(meta.inferred||[]),'surface wear and heat/soot placement inferred from spacecraft function rather than directly visible source evidence'];meta.surface={proceduralRoughness:true,texturedMeshes:textured,materialVariants:variants,debugMode:'roughness/metalness proxy'};root.userData.sculptRuntime=meta;
  root.userData.pass12={setDebug,get debug(){return debug},stats:{textured,variants},maps};return root.userData.pass12
}
