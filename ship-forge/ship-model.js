import * as THREE from 'three';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';

const C={
  graphite:0x0d1117, graphite2:0x151b23, armor:0x28323d, armorLight:0x46515d,
  gunmetal:0x1c242e, steel:0x697783, darkSteel:0x303a45, red:0x8f171c,
  redBright:0xe23a2f, orange:0xff5a18, amber:0xffa62d, glass:0x130c0a, soot:0x090b0e
};
const mat=(color,roughness=.48,metalness=.82,extra={})=>new THREE.MeshStandardMaterial({color,roughness,metalness,...extra});
const phys=(color,roughness=.3,metalness=.9,extra={})=>new THREE.MeshPhysicalMaterial({color,roughness,metalness,clearcoat:.18,clearcoatRoughness:.22,...extra});
const emissive=(color,intensity=3.5)=>new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:intensity,roughness:.22,metalness:.22,toneMapped:false});

function shadow(m){m.castShadow=m.receiveShadow=true;return m}
function box(g,name,size,pos,material,rot=[0,0,0]){const m=shadow(new THREE.Mesh(new THREE.BoxGeometry(...size),material));m.name=name;m.position.set(...pos);m.rotation.set(...rot);g.add(m);return m}
function cyl(g,name,r,l,pos,material,axis='x',segments=16,rot=[0,0,0],r2=r){const m=shadow(new THREE.Mesh(new THREE.CylinderGeometry(r2,r,l,segments),material));m.name=name;if(axis==='x')m.rotation.z=Math.PI/2;if(axis==='z')m.rotation.x=Math.PI/2;m.rotation.x+=rot[0];m.rotation.y+=rot[1];m.rotation.z+=rot[2];m.position.set(...pos);g.add(m);return m}
function torus(g,name,major,tubeR,pos,material,axis='x',segments=24){const m=shadow(new THREE.Mesh(new THREE.TorusGeometry(major,tubeR,8,segments),material));m.name=name;if(axis==='x')m.rotation.y=Math.PI/2;if(axis==='y')m.rotation.x=Math.PI/2;m.position.set(...pos);g.add(m);return m}
function hull(g,name,x0,x1,y0,y1,zf,zm,zr,material,lift=0){
  const xm=THREE.MathUtils.lerp(x0,x1,.52), xa=THREE.MathUtils.lerp(x0,x1,.12);
  const p=[
    new THREE.Vector3(x0,y0+lift,0),new THREE.Vector3(x0,y1+lift,0),
    new THREE.Vector3(xa,y0+lift,-zf),new THREE.Vector3(xa,y1+lift,-zf),new THREE.Vector3(xa,y0+lift,zf),new THREE.Vector3(xa,y1+lift,zf),
    new THREE.Vector3(xm,y0+lift,-zm),new THREE.Vector3(xm,y1+lift,-zm),new THREE.Vector3(xm,y0+lift,zm),new THREE.Vector3(xm,y1+lift,zm),
    new THREE.Vector3(x1,y0+lift,-zr),new THREE.Vector3(x1,y1+lift,-zr),new THREE.Vector3(x1,y0+lift,zr),new THREE.Vector3(x1,y1+lift,zr)
  ];
  const m=shadow(new THREE.Mesh(new ConvexGeometry(p),material));m.name=name;g.add(m);return m
}
function chamfer(g,name,size,pos,material,rot=[0,0,0],cut=.14){
  const [sx,sy,sz]=size, x=sx/2,y=sy/2,z=sz/2,c=Math.min(cut,x*.45,z*.45);
  const pts=[
    [-x+c,-y,-z],[-x,-y,-z+c],[-x,-y,z-c],[-x+c,-y,z],[x-c,-y,z],[x,-y,z-c],[x,-y,-z+c],[x-c,-y,-z],
    [-x+c,y,-z],[-x,y,-z+c],[-x,y,z-c],[-x+c,y,z],[x-c,y,z],[x,y,z-c],[x,y,-z+c],[x-c,y,-z]
  ].map(v=>new THREE.Vector3(...v));
  const m=shadow(new THREE.Mesh(new ConvexGeometry(pts),material));m.name=name;m.position.set(...pos);m.rotation.set(...rot);g.add(m);return m
}
function fin(g,name,pts,depth,pos,material,rot=[0,0,0]){const s=new THREE.Shape();s.moveTo(...pts[0]);for(let i=1;i<pts.length;i++)s.lineTo(...pts[i]);s.closePath();const geo=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:false,steps:1});geo.center();const m=shadow(new THREE.Mesh(geo,material));m.name=name;m.position.set(...pos);m.rotation.set(...rot);g.add(m);return m}
function tube(g,name,a,b,r,material,segments=10){const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),d=vb.clone().sub(va),m=shadow(new THREE.Mesh(new THREE.CylinderGeometry(r,r,d.length(),segments),material));m.name=name;m.position.copy(va).add(vb).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());g.add(m);return m}
function ringGreebles(g,name,x,radius,count,size,material){for(let i=0;i<count;i++){const a=i/count*Math.PI*2;box(g,`${name}-${i}`,size,[x,Math.cos(a)*radius,Math.sin(a)*radius],material,[a*.025,0,a])}}
function ventBank(g,name,pos,count,spacing,size,material,axis='z',rot=[0,0,0]){for(let i=0;i<count;i++){const p=[...pos];const off=(i-(count-1)/2)*spacing;if(axis==='z')p[2]+=off;else if(axis==='x')p[0]+=off;else p[1]+=off;box(g,`${name}-${i}`,size,p,material,rot)}}
function addPanels(g,m,a){
  const rows=[[-4.25,.62,1.00,5],[-3.25,.71,1.32,6],[-2.05,.80,1.54,6],[-.7,.84,1.68,7],[.72,.81,1.65,7],[2.05,.73,1.48,6],[3.08,.64,1.20,5]];
  for(const[x,y,z,n]of rows)for(let i=0;i<n;i++){
    const sx=.34+((i*7)%3)*.07,sz=.16+((i*5)%4)*.03,px=x+(i-(n-1)/2)*.43,pz=z+(i%2)*.11;
    chamfer(g,`panel-${x}-${i}`,[sx,.038,sz],[px,y,pz],i%5===0?a:m,[0,i%2?-.08:.08,0],.045);
    chamfer(g,`panel-m-${x}-${i}`,[sx,.038,sz],[px,y,-pz],i%5===0?a:m,[0,i%2?.08:-.08,0],.045)
  }
}
function addBolts(g,steel){
  const geo=new THREE.CylinderGeometry(.027,.027,.026,8),pts=[];
  for(let i=0;i<180;i++){
    const x=-5.15+(i%30)*.35,l=Math.floor(i/30),z=(l-2.5)*.36+((i%3)-1)*.03,y=.58+Math.max(0,1-Math.abs(x)/6.2)*.20;
    if(Math.abs(z)>1.18+Math.max(0,x+2.4)*.055)continue;pts.push([x,y,z])
  }
  const inst=new THREE.InstancedMesh(geo,steel,pts.length),q=new THREE.Quaternion().setFromEuler(new THREE.Euler(0,0,Math.PI/2)),m4=new THREE.Matrix4();inst.name='surface-fasteners';
  pts.forEach((p,i)=>{m4.compose(new THREE.Vector3(...p),q,new THREE.Vector3(1,1,1));inst.setMatrixAt(i,m4)});inst.castShadow=true;g.add(inst)
}
function engine(g,x,y,z,s,M,glows,spins){
  const e=new THREE.Group();e.name=`engine-${y}-${z}`;e.position.set(x,y,z);e.scale.setScalar(s);g.add(e);
  cyl(e,'core',.42,1.42,[0,0,0],M.gunmetal,'x',24);
  cyl(e,'inner-shell',.54,1.08,[.05,0,0],M.dark,'x',16);
  cyl(e,'outer-bell',.68,.62,[.26,0,0],M.graphite2,'x',16,[0,0,0],.58);
  torus(e,'ring-a',.55,.085,[-.28,0,0],M.steel,'x',28);torus(e,'ring-b',.50,.055,[.36,0,0],M.red,'x',28);torus(e,'ring-c',.61,.038,[.12,0,0],M.dark,'x',28);
  glows.push(cyl(e,'glow',.38,.09,[.67,0,0],M.hot,'x',28),cyl(e,'inner',.23,.11,[.72,0,0],M.hot2,'x',24));
  spins.push(torus(e,'spin-ring',.64,.032,[.50,0,0],M.steel,'x',28));
  ringGreebles(e,'outer-vane',.02,.78,8,[.68,.075,.19],M.dark);
  ringGreebles(e,'collar',-.52,.54,12,[.20,.085,.12],M.gunmetal);
  for(const sgn of[-1,1]){box(e,`shroud-top-${sgn}`,[.95,.16,.36],[.08,sgn*.72,0],M.armor,[0,0,sgn*.04]);box(e,`shroud-side-${sgn}`,[.82,.34,.13],[.10,0,sgn*.72],M.graphite2,[0,sgn*.03,0])}
  for(let i=0;i<4;i++)tube(e,`engine-line-${i}`,[-.55,-.28+(i%2)*.56,-.34+Math.floor(i/2)*.68],[.18,-.32+(i%2)*.64,-.38+Math.floor(i/2)*.76],.025,M.steel,8);
  return e
}
function turret(g,pos,side,M){
  const t=new THREE.Group();t.name=`turret-${side}`;t.position.set(...pos);g.add(t);
  cyl(t,'rotation-ring',.31,.12,[0,0,0],M.steel,'y',18);chamfer(t,'base',[.68,.18,.54],[0,.08,0],M.dark,[0,side*.08,0],.1);chamfer(t,'cap',[.52,.22,.38],[-.04,.25,0],M.armor,[0,side*.08,0],.08);
  for(const dz of[-.12,.12]){cyl(t,'barrel',.032,.92,[-.55,.29,dz],M.steel,'x',8);cyl(t,'barrel-shroud',.074,.28,[-.18,.29,dz],M.gunmetal,'x',10);torus(t,'muzzle-ring',.047,.014,[-1.01,.29,dz],M.redBright,'x',10)}
  box(t,'sensor',[.10,.075,.12],[.10,.39,side*.12],M.hot)
}
function addSideMechanics(side,s,M,glows){
  const z=s*1.61;
  for(let i=0;i<7;i++){
    const x=-2.65+i*.74, y=-.05+(i%2)*.12;
    cyl(side,`mech-cylinder-${s}-${i}`,.11+(i%3)*.018,.38,[x,y,z],i%3===0?M.steel:M.gunmetal,'x',12);
    torus(side,`mech-collar-${s}-${i}`,.12+(i%3)*.018,.022,[x+.12,y,z],i%4===0?M.red:M.dark,'x',12);
    if(i<6)tube(side,`mech-link-${s}-${i}`,[x+.2,y,z],[x+.52,y+(i%2?.10:-.07),z+s*.03],.022,M.steel,8)
  }
  for(let i=0;i<5;i++){const e=box(side,`side-status-${s}-${i}`,[.12,.045,.035],[-2.40+i*.74,.30,s*1.74],i%2?M.hot:M.hot2);glows.push(e)}
}

export function createCyberShip(){
  const root=new THREE.Group();root.name='NX-79 Acheron';
  const M={
    graphite:phys(C.graphite,.48,.93),graphite2:phys(C.graphite2,.43,.91),armor:phys(C.armor,.36,.90),armorLight:phys(C.armorLight,.31,.88),
    gunmetal:mat(C.gunmetal,.29,.95),steel:mat(C.steel,.22,.99),dark:mat(C.darkSteel,.30,.95),red:phys(C.red,.34,.78),redBright:phys(C.redBright,.26,.72),
    soot:mat(C.soot,.7,.55),hot:emissive(C.orange,5.8),hot2:emissive(C.amber,8.5),
    glass:new THREE.MeshPhysicalMaterial({color:C.glass,roughness:.055,metalness:.08,transmission:.18,transparent:true,opacity:.84,ior:1.56,thickness:.55,clearcoat:.5,clearcoatRoughness:.08,emissive:0x361000,emissiveIntensity:1.0})
  };
  const glows=[],spins=[],explode=[];
  const section=(n,d)=>{const g=new THREE.Group();g.name=n;root.add(g);explode.push({g,base:new THREE.Vector3(),dir:new THREE.Vector3(...d)});return g};
  const core=section('01-core',[0,0,0]),cockpit=section('02-cockpit',[-1,0,0]),port=section('03-port',[0,0,1]),star=section('04-starboard',[0,0,-1]),eng=section('05-engines',[1,0,0]),dorsal=section('06-dorsal',[0,1,0]),weapons=section('07-weapons',[0,-.3,1]),details=section('08-surface-details',[0,.45,0]),refine=section('09-refinement',[0,.2,0]);

  // PASS 1 — stronger macro silhouette and layered center mass
  hull(core,'main-keel',-4.85,4.45,-.50,.46,.38,1.10,1.36,M.graphite2,.03);
  hull(core,'upper-spine',-3.62,3.92,.34,.82,.26,.74,.92,M.armor,.02);
  hull(core,'lower-keel',-4.02,3.66,-.82,-.36,.20,.72,.92,M.gunmetal);
  hull(core,'center-shoulder',-2.65,3.15,.66,1.03,.16,.92,.82,M.graphite2);
  chamfer(core,'mid-keel',[5.75,.28,.72],[-.02,-.57,0],M.dark,[0,0,0],.09);
  for(const s of[-1,1]){chamfer(core,`keel-cheek-${s}`,[4.55,.24,.28],[-.10,-.38,s*.72],M.armor,[0,s*.025,0],.06);tube(core,`keel-line-${s}`,[-2.8,-.65,s*.52],[2.65,-.66,s*.63],.024,M.steel,8)}

  // PASS 2 — cockpit / nose fidelity
  hull(cockpit,'nose-primary',-6.45,-3.75,-.30,.27,.035,.60,.80,M.graphite);
  hull(cockpit,'nose-upper',-5.92,-3.28,.18,.68,.03,.48,.72,M.armor);
  hull(cockpit,'nose-lower',-6.05,-3.72,-.64,-.18,.025,.46,.64,M.gunmetal);
  hull(cockpit,'nose-center-ridge',-6.28,-3.90,.50,.77,.02,.20,.32,M.graphite2);
  const canopy=hull(cockpit,'canopy',-5.52,-3.86,.36,.76,.018,.34,.45,M.glass,.02);canopy.scale.z=.94;
  chamfer(cockpit,'canopy-roof',[1.05,.09,.72],[-4.43,.79,0],M.graphite,[0,0,-.035],.10);
  for(const s of[-1,1]){
    tube(cockpit,`canopy-frame-long-${s}`,[-5.18,.68,s*.29],[-3.96,.70,s*.42],.035,M.steel,8);
    tube(cockpit,`canopy-frame-front-${s}`,[-5.18,.68,s*.29],[-5.45,.48,s*.18],.032,M.steel,8);
    chamfer(cockpit,`nose-cheek-${s}`,[1.75,.36,.34],[-4.55,.05,s*.74],M.armor,[0,s*.10,s*.025],.09);
    chamfer(cockpit,`nose-cheek-lower-${s}`,[1.38,.24,.28],[-4.82,-.33,s*.63],M.dark,[0,s*.08,0],.07);
    chamfer(cockpit,`nose-red-${s}`,[.92,.052,.18],[-4.05,.41,s*.80],M.redBright,[0,s*.08,0],.04);
    ventBank(cockpit,`nose-intake-${s}`,[-4.66,.11,s*.935],5,.10,[.26,.10,.028],M.soot,'x',[0,s*.06,0]);
  }
  chamfer(cockpit,'cockpit-glow',[.82,.045,.07],[-4.56,.55,.405],M.hot,[0,-.015,0],.02);glows.push(cockpit.children[cockpit.children.length-1]);
  for(let i=0;i<7;i++){const e=box(cockpit,`nose-light-${i}`,[.075,.04,.05],[-4.85+i*.17,.37,.47],i%3===0?M.hot2:M.hot);glows.push(e)}
  for(const s of[-1,1]){for(let j=0;j<3;j++){cyl(cockpit,`micro-gun-${s}-${j}`,.022,.68,[-5.85,-.43,s*(.22+j*.09)],M.steel,'x',8);cyl(cockpit,`micro-gun-collar-${s}-${j}`,.046,.13,[-5.58,-.43,s*(.22+j*.09)],M.gunmetal,'x',8)}}

  // PASS 3 — side armor stacks, mechanical channels, wings
  for(const s of[-1,1]){
    const side=s>0?port:star;
    const h=hull(side,`side-hull-${s}`,-3.38,3.86,-.35,.39,.15,.52,.77,M.graphite2);h.position.z=s*.98;
    chamfer(side,`rail-${s}`,[4.72,.24,.32],[.30,-.17,s*1.35],M.dark,[0,s*.018,0],.07);
    chamfer(side,`armor-rail-${s}`,[2.90,.31,.42],[-.78,.23,s*1.30],M.armor,[0,s*.035,0],.09);
    chamfer(side,`upper-rail-${s}`,[2.42,.24,.33],[.50,.53,s*1.17],M.graphite2,[0,s*.05,0],.08);
    chamfer(side,`red-rail-${s}`,[1.35,.058,.34],[.20,.47,s*1.53],M.red,[0,s*.06,0],.05);
    for(let i=0;i<7;i++){
      const x=-2.74+i*.79;
      chamfer(side,`side-block-${s}-${i}`,[.60,.42,.26],[x,.04,s*(1.47+(i%2)*.08)],i%3===0?M.armorLight:M.gunmetal,[0,s*(i%2?.07:-.05),0],.07);
      ventBank(side,`block-vent-${s}-${i}`,[x+.02,.06,s*(1.615+(i%2)*.08)],3,.065,[.20,.055,.022],M.soot,'y',[0,s*.02,0]);
    }
    ventBank(side,`belly-vent-${s}`,[.2,-.34,s*1.58],11,.29,[.21,.28,.045],M.steel,'x',[0,s*.05,0]);
    addSideMechanics(side,s,M,glows);
    fin(side,`wing-${s}`,[[-1.55,-.16],[1.60,-.42],[2.58,-.09],[.58,.37]],.13,[1.12,-.12,s*1.72],M.graphite,[Math.PI/2,0,s<0?Math.PI:0]);
    fin(side,`wing-step-${s}`,[[-.82,-.10],[.95,-.25],[1.52,-.05],[-.10,.26]],.065,[1.22,-.01,s*1.80],M.armor,[Math.PI/2,0,s<0?Math.PI:0]);
    fin(side,`wing-red-${s}`,[[-.62,-.08],[.86,-.19],[1.12,-.02],[-.05,.19]],.038,[1.39,.03,s*1.86],M.red,[Math.PI/2,0,s<0?Math.PI:0]);
    chamfer(side,`wingtip-pod-${s}`,[1.05,.34,.30],[1.30,-.43,s*2.00],M.dark,[0,s*.10,0],.08);
  }

  // PASS 4 — rear mass and engine architecture
  engine(eng,4.18,.10,.80,.92,M,glows,spins);engine(eng,4.18,.10,-.80,.92,M,glows,spins);
  engine(eng,3.90,-.50,1.42,.61,M,glows,spins);engine(eng,3.90,-.50,-1.42,.61,M,glows,spins);
  chamfer(eng,'engine-bridge',[2.45,.58,2.65],[3.10,.06,0],M.graphite2,[0,0,0],.13);
  chamfer(eng,'rear-armor',[1.28,.92,2.88],[3.73,.26,0],M.armor,[0,0,0],.14);
  chamfer(eng,'rear-spine-cap',[1.70,.38,1.36],[3.08,.93,0],M.graphite2,[0,0,0],.11);
  for(const s of[-1,1]){
    fin(eng,`rear-fin-${s}`,[[-.72,-.12],[1.02,-.19],[1.58,.07],[.30,.27]],.11,[3.48,.70,s*1.45],M.graphite,[Math.PI/2,0,s<0?Math.PI:0]);
    fin(eng,`rear-fin-inset-${s}`,[[-.40,-.07],[.70,-.12],[1.02,.02],[.12,.16]],.04,[3.53,.74,s*1.53],M.red,[Math.PI/2,0,s<0?Math.PI:0]);
    chamfer(eng,`rear-red-${s}`,[.82,.058,.26],[3.18,.67,s*1.59],M.redBright,[0,s*.1,0],.05);
    for(let p=0;p<3;p++)tube(eng,`rear-pipe-${s}-${p}`,[2.72,.10+p*.18,s*(1.02+p*.10)],[3.62,.18+p*.15,s*(1.10+p*.11)],.025+p*.007,p===1?M.steel:M.dark,8)
  }
  ventBank(eng,'rear-top-vents',[3.18,1.13,0],7,.18,[.34,.055,.10],M.soot,'z');

  // PASS 5 — dorsal command/sensor layer
  chamfer(dorsal,'dorsal-deck',[3.92,.33,1.14],[-.02,.76,0],M.graphite2,[0,0,0],.10);
  chamfer(dorsal,'dorsal-plating',[2.30,.24,.98],[-1.05,1.05,0],M.armor,[0,0,0],.08);
  chamfer(dorsal,'command-hump',[1.16,.40,.78],[-1.58,1.25,0],M.armorLight,[0,0,-.08],.12);
  chamfer(dorsal,'command-shadow',[.78,.18,.54],[-1.95,1.44,0],M.graphite,[0,0,-.06],.08);
  cyl(dorsal,'mast-base',.20,.58,[-.34,1.48,0],M.steel,'y',12);cyl(dorsal,'mast-main',.060,1.18,[-.34,2.20,0],M.gunmetal,'y',10);cyl(dorsal,'mast-tip',.027,.62,[-.34,3.10,0],M.redBright,'y',8);
  cyl(dorsal,'mast-side',.050,.82,[.22,2.00,-.19],M.steel,'y',8);chamfer(dorsal,'sensor-array',[.55,.17,.28],[.49,1.53,.02],M.gunmetal,[0,.12,0],.06);torus(dorsal,'sensor-ring',.19,.027,[.22,2.20,-.19],M.hot,'y',20);
  fin(dorsal,'dorsal-fin',[[-.70,-.08],[.64,-.13],[.19,.94],[-.32,.62]],.075,[1.70,1.48,.45],M.graphite,[0,Math.PI/2,0]);
  fin(dorsal,'dorsal-fin-r',[[-.70,-.08],[.64,-.13],[.19,.94],[-.32,.62]],.075,[1.70,1.48,-.45],M.graphite,[0,-Math.PI/2,0]);
  for(const s of[-1,1]){tube(dorsal,`dorsal-cable-${s}`,[-1.8,1.36,s*.42],[.35,1.18,s*.50],.022,M.steel,8);chamfer(dorsal,`dorsal-side-plate-${s}`,[1.15,.12,.26],[.75,1.07,s*.58],M.red,[0,s*.08,0],.04)}

  // PASS 6 — weapons and exposed mechanical hardware
  turret(weapons,[-1.62,1.43,.86],1,M);turret(weapons,[-1.62,1.43,-.86],-1,M);
  for(const s of[-1,1]){
    const side=s>0?port:star;
    cyl(side,`wing-cannon-${s}`,.075,1.32,[.42,-.78,s*1.72],M.steel,'x',10);cyl(side,`wing-cannon-shell-${s}`,.16,.62,[.72,-.78,s*1.72],M.gunmetal,'x',12);torus(side,`wing-cannon-ring-${s}`,.17,.025,[.46,-.78,s*1.72],M.redBright,'x',12);
    chamfer(side,`weapon-pod-${s}`,[.96,.34,.31],[1.00,-.61,s*1.56],M.armor,[0,s*.04,0],.08);
    ventBank(side,`weapon-pod-slots-${s}`,[1.02,-.60,s*1.73],4,.10,[.34,.045,.025],M.soot,'x',[0,s*.03,0]);
    for(let p=0;p<4;p++){const z=s*(1.13+p*.115);tube(side,`belly-pipe-${s}-${p}`,[-2.72,-.45,z],[2.70,-.44+p*.055,z],.022+p*.006,p===1?M.steel:M.dark,8)}
  }

  // PASS 7 — panel language and hardware density
  addPanels(details,M.armorLight,M.red);addBolts(details,M.steel);
  for(let i=0;i<48;i++){
    const x=-3.75+(i%16)*.48,z=(Math.floor(i/16)-1)*.60, y=.90+(i%2)*.04;
    chamfer(details,`greeble-${i}`,[.18+(i%3)*.045,.10+(i%2)*.055,.15],[x,y,z],i%9===0?M.red:M.gunmetal,[0,(i%4-1.5)*.025,0],.04);
    if(i%3===0)cyl(details,`greeble-cylinder-${i}`,.050+(i%2)*.012,.26,[x+.03,y+.13,z],M.steel,'x',8)
  }
  for(let i=0;i<20;i++)chamfer(details,`spine-rib-${i}`,[.18,.17,.88],[-2.92+i*.32,.91,0],i%6===0?M.red:M.dark,[0,0,i%2?-.04:.04],.05);
  for(let i=0;i<14;i++){const e=chamfer(details,`nav-${i}`,[.11,.04,.05],[-3.10+i*.49,.76,(i%2?1:-1)*(.84+(i%3)*.09)],i%4===0?M.hot2:M.hot,[0,0,0],.02);glows.push(e)}

  // PASS 8 — underside structure and service geometry
  for(let i=0;i<8;i++){
    const x=-2.92+i*.76;
    chamfer(core,`under-module-${i}`,[.56,.28,.56],[x,-.86,i%2?-.44:.44],i%3===0?M.armor:M.gunmetal,[0,i%2?.09:-.09,0],.08);
    cyl(core,`under-coil-${i}`,.10,.42,[x+.12,-1.01,i%2?-.57:.57],M.steel,'x',12);torus(core,`under-coil-ring-${i}`,.11,.020,[x+.25,-1.01,i%2?-.57:.57],M.red,'x',10)
  }
  for(const s of[-1,1]){chamfer(core,`landing-socket-${s}`,[.42,.19,.28],[1.34,-1.08,s*.80],M.dark,[0,0,0],.06);cyl(core,`landing-pin-${s}`,.06,.40,[1.34,-1.30,s*.80],M.steel,'y',10);chamfer((s>0?port:star),`macro-red-${s}`,[1.16,.05,.30],[1.62,.55,s*1.17],M.redBright,[0,s*.14,0],.05)}
  chamfer(dorsal,'top-red-plate',[.82,.05,.56],[1.17,1.22,.02],M.redBright,[0,.05,0],.05);chamfer(dorsal,'top-steel-plate',[.66,.045,.44],[2.08,1.07,-.30],M.steel,[0,-.08,0],.04);

  // PASS 9 — refinement: manufactured transitions, seam breaks, accent depth
  for(const s of[-1,1]){
    chamfer(refine,`shoulder-cap-${s}`,[1.78,.22,.42],[-2.25,.72,s*.92],M.armorLight,[0,s*.055,-.04],.08);
    chamfer(refine,`mid-cap-${s}`,[1.52,.20,.38],[-.55,.82,s*1.10],M.graphite2,[0,s*.04,0],.07);
    chamfer(refine,`rear-cap-${s}`,[1.45,.18,.36],[1.35,.76,s*1.08],M.armor,[0,s*.08,.02],.07);
    for(let i=0;i<6;i++)box(refine,`seam-${s}-${i}`,[.70,.018,.025],[-3.20+i*.98,.84,s*(.72+(i%3)*.14)],M.soot,[0,s*.05,0]);
    for(let i=0;i<5;i++)tube(refine,`upper-pipe-${s}-${i}`,[-2.45+i*.70,.98,s*.54],[-2.02+i*.70,1.04,s*.68],.018+(i%2)*.006,i%2?M.steel:M.dark,8);
    ventBank(refine,`shoulder-vent-${s}`,[-2.22,.85,s*1.16],6,.11,[.33,.045,.028],M.soot,'x',[0,s*.04,0]);
  }
  chamfer(refine,'central-reactor-cover',[1.05,.17,.78],[.15,1.04,0],M.graphite,[0,0,0],.11);
  torus(refine,'reactor-ring',.25,.032,[.08,1.14,0],M.redBright,'y',24);const reactor=torus(refine,'reactor-glow',.17,.022,[.08,1.145,0],M.hot,'y',24);glows.push(reactor);
  for(let i=0;i<6;i++){const a=i/6*Math.PI*2;box(refine,`reactor-lock-${i}`,[.18,.06,.07],[.08+Math.cos(a)*.34,1.13,Math.sin(a)*.34],M.steel,[0,-a,0])}
  for(let i=0;i<10;i++){const x=-3.85+i*.78;ventBank(refine,`top-slot-${i}`,[x,.985,(i%2?1:-1)*.30],3,.055,[.26,.025,.030],M.soot,'z',[0,(i%2?1:-1)*.04,0])}

  root.userData.sculptRuntime={
    version:'ship-forge-v2-pass09',sections:{core,cockpit,port,starboard:star,engines:eng,dorsal,weapons,details,refinement:refine},
    confidence:{visibleSide:.94,hiddenSide:.69,underside:.60,rear:.78},
    inferred:['hidden-side panel topology','underside service geometry','rear engine plumbing','single-view canopy depth']
  };
  root.userData.setExplode=t=>{const k=THREE.MathUtils.clamp(t,0,1)*1.5;for(const e of explode)e.g.position.copy(e.base).addScaledVector(e.dir,k)};
  root.userData.setWireframe=v=>{const seen=new Set();root.traverse(o=>{if(o.isMesh){const a=Array.isArray(o.material)?o.material:[o.material];a.forEach(mm=>{if(mm&&!seen.has(mm)){seen.add(mm);mm.wireframe=v;mm.needsUpdate=true}})}})};
  root.userData.tick=(t,dt)=>{const pulse=1+Math.sin(t*7.2)*.12+Math.sin(t*13.7)*.05;glows.forEach((m,i)=>{if(m.material?.emissiveIntensity!=null)m.material.emissiveIntensity=(i%3===0?5.8:7.6)*pulse});spins.forEach((m,i)=>m.rotation.x+=dt*(.82+i*.06))};
  root.rotation.y=-.08;return root;
}
