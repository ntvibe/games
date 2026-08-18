import * as THREE from 'three';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';

const P={
  graphite:0x10151c, graphite2:0x19212b, armor:0x303b47, armorLight:0x556270,
  gunmetal:0x202a35, steel:0x73818e, red:0xa51d21, redBright:0xe33b30,
  soot:0x080a0d, orange:0xff5b18, amber:0xffad35
};
const mat=(color,roughness=.42,metalness=.9,extra={})=>new THREE.MeshStandardMaterial({color,roughness,metalness,...extra});
const phys=(color,roughness=.34,metalness=.9,extra={})=>new THREE.MeshPhysicalMaterial({color,roughness,metalness,clearcoat:.16,clearcoatRoughness:.24,...extra});
const glow=(color,intensity=5)=>new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:intensity,roughness:.18,metalness:.3,toneMapped:false});
const M={graphite:phys(P.graphite,.46,.94),graphite2:phys(P.graphite2,.40,.92),armor:phys(P.armor,.34,.90),armorLight:phys(P.armorLight,.29,.88),gunmetal:mat(P.gunmetal,.29,.96),steel:mat(P.steel,.21,.99),red:phys(P.red,.31,.80),redBright:phys(P.redBright,.25,.74),soot:mat(P.soot,.76,.48),hot:glow(P.orange,5.4),hot2:glow(P.amber,7.4)};

function shadow(mesh){mesh.castShadow=mesh.receiveShadow=true;return mesh}
function box(g,name,size,pos,material,rot=[0,0,0]){const m=shadow(new THREE.Mesh(new THREE.BoxGeometry(...size),material));m.name=name;m.position.set(...pos);m.rotation.set(...rot);g.add(m);return m}
function cyl(g,name,r,len,pos,material,axis='x',segments=14,r2=r){const m=shadow(new THREE.Mesh(new THREE.CylinderGeometry(r2,r,len,segments),material));m.name=name;if(axis==='x')m.rotation.z=Math.PI/2;if(axis==='z')m.rotation.x=Math.PI/2;m.position.set(...pos);g.add(m);return m}
function torus(g,name,major,tube,pos,material,axis='x',segments=22){const m=shadow(new THREE.Mesh(new THREE.TorusGeometry(major,tube,8,segments),material));m.name=name;if(axis==='x')m.rotation.y=Math.PI/2;if(axis==='y')m.rotation.x=Math.PI/2;m.position.set(...pos);g.add(m);return m}
function tube(g,name,a,b,r,material,segments=8){const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),d=vb.clone().sub(va);const m=shadow(new THREE.Mesh(new THREE.CylinderGeometry(r,r,d.length(),segments),material));m.name=name;m.position.copy(va).add(vb).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());g.add(m);return m}
function chamfer(g,name,size,pos,material,rot=[0,0,0],cut=.12){const [sx,sy,sz]=size,x=sx/2,y=sy/2,z=sz/2,c=Math.min(cut,x*.42,z*.42);const p=[[-x+c,-y,-z],[-x,-y,-z+c],[-x,-y,z-c],[-x+c,-y,z],[x-c,-y,z],[x,-y,z-c],[x,-y,-z+c],[x-c,-y,-z],[-x+c,y,-z],[-x,y,-z+c],[-x,y,z-c],[-x+c,y,z],[x-c,y,z],[x,y,z-c],[x,y,-z+c],[x-c,y,-z]].map(v=>new THREE.Vector3(...v));const m=shadow(new THREE.Mesh(new ConvexGeometry(p),material));m.name=name;m.position.set(...pos);m.rotation.set(...rot);g.add(m);return m}
function wedge(g,name,size,pos,material,rot=[0,0,0],nose=.28){const [sx,sy,sz]=size,x=sx/2,y=sy/2,z=sz/2,n=Math.min(nose,sx*.38);const p=[[-x,-y,-z*.52],[-x,-y,z*.52],[-x,y,-z*.34],[-x,y,z*.34],[-x+n,-y,-z],[-x+n,-y,z],[-x+n,y,-z*.82],[-x+n,y,z*.82],[x,-y,-z*.72],[x,-y,z*.72],[x,y,-z*.58],[x,y,z*.58]].map(v=>new THREE.Vector3(...v));const m=shadow(new THREE.Mesh(new ConvexGeometry(p),material));m.name=name;m.position.set(...pos);m.rotation.set(...rot);g.add(m);return m}
function customHull(g,name,points,pos,material,rot=[0,0,0]){const m=shadow(new THREE.Mesh(new ConvexGeometry(points.map(v=>new THREE.Vector3(...v))),material));m.name=name;m.position.set(...pos);m.rotation.set(...rot);g.add(m);return m}
function slots(g,name,pos,count,step,size,material,axis='z',rot=[0,0,0]){for(let i=0;i<count;i++){const p=[...pos],o=(i-(count-1)/2)*step;if(axis==='x')p[0]+=o;else if(axis==='y')p[1]+=o;else p[2]+=o;box(g,`${name}-${i}`,size,p,material,rot)}}

function engineMacroShell(g,i,x,y,z,s,side){
  const sg=Math.sign(z)||1;
  const shell=new THREE.Group();shell.name=`11-engine-macro-${i}`;shell.position.set(x,y,z);shell.scale.setScalar(s);g.add(shell);
  const pts=[[-1.05,-.54,-.62],[-1.05,-.54,.62],[-1.05,.52,-.55],[-1.05,.52,.55],[-.32,-.80,-.78],[-.32,-.80,.78],[-.32,.78,-.76],[-.32,.78,.76],[.72,-.70,-.68],[.72,-.70,.68],[.72,.66,-.62],[.72,.66,.62],[1.00,-.47,-.48],[1.00,-.47,.48],[1.00,.47,-.44],[1.00,.47,.44]];
  const outer=customHull(shell,'outer-cowl',pts,[0,0,0],i<2?M.graphite2:M.gunmetal,[0,0,0]);outer.scale.set(1,.93,1);
  customHull(shell,'upper-cowl',[[-.86,.20,-.55],[-.86,.20,.55],[-.64,.78,-.40],[-.64,.78,.40],[.52,.66,-.48],[.52,.66,.48],[.86,.28,-.38],[.86,.28,.38]],[-.02,.18,0],i%2?M.armor:M.armorLight,[0,0,sg*.025]);
  customHull(shell,'lower-cowl',[[-.76,-.64,-.58],[-.76,-.64,.58],[-.55,-.84,-.42],[-.55,-.84,.42],[.58,-.68,-.50],[.58,-.68,.50],[.88,-.38,-.36],[.88,-.38,.36]],[.02,-.06,0],M.graphite,[0,0,-sg*.02]);
  for(const ss of[-1,1]){
    wedge(shell,`lateral-blade-${ss}`,[1.18,.28,.24],[-.02,.02,ss*.79],ss===sg?M.armorLight:M.graphite2,[0,ss*.06,ss*.02],.20);
    tube(shell,`cowl-brace-${ss}-a`,[-.62,.55,ss*.60],[.55,.48,ss*.60],.035,M.steel,8);
    tube(shell,`cowl-brace-${ss}-b`,[-.62,-.56,ss*.60],[.58,-.48,ss*.58],.030,M.gunmetal,8);
  }
  torus(shell,'forward-lock-ring',.70,.032,[-.58,0,0],M.steel,'x',26);
  torus(shell,'rear-lock-ring',.62,.027,[.58,0,0],M.red,'x',26);
  slots(shell,'cowl-top-slots',[-.05,.81,0],7,.12,[.26,.035,.055],M.soot,'z');
  slots(shell,'cowl-side-slots',[.12,.03,sg*.86],5,.11,[.28,.052,.035],M.soot,'x',[0,sg*.04,0]);
  for(let k=0;k<4;k++){const yy=-.42+k*.28;tube(shell,`service-${k}`,[-.72,yy,-sg*.63],[.44,yy+(k%2?.08:-.04),-sg*.70],.020+(k%2)*.006,k%2?M.steel:M.gunmetal,8)}
  const lamp=box(shell,'engine-shell-locator',[.07,.05,.04],[-.42,.63,sg*.52],i%2?M.hot:M.hot2);lamp.userData.pass11Glow=true;
}

export function applyPass11(root){
  const pass11=new THREE.Group();pass11.name='11-pass11-macro-shells';root.add(pass11);
  const animated=[];

  // Cockpit-to-dorsal transition: one continuous armored shoulder instead of stacked boxes.
  customHull(pass11,'11-cockpit-dorsal-bridge',[[-3.72,.60,-.64],[-3.72,.60,.64],[-3.28,1.05,-.55],[-3.28,1.05,.55],[-2.18,1.24,-.70],[-2.18,1.24,.70],[-1.18,1.14,-.82],[-1.18,1.14,.82],[-.70,.83,-.88],[-.70,.83,.88]], [0,0,0],M.graphite2);
  customHull(pass11,'11-cockpit-dorsal-cap',[[-3.48,.78,-.44],[-3.48,.78,.44],[-3.04,1.12,-.34],[-3.04,1.12,.34],[-2.18,1.34,-.44],[-2.18,1.34,.44],[-1.46,1.24,-.58],[-1.46,1.24,.58],[-1.06,1.02,-.62],[-1.06,1.02,.62]],[0,.02,0],M.armor,[0,0,-.018]);
  for(const s of[-1,1]){
    wedge(pass11,`11-shoulder-chevron-${s}`,[1.65,.15,.34],[-2.15,1.20,s*.62],s>0?M.armorLight:M.armor,[0,s*.08,-.03],.20);
    slots(pass11,`11-transition-vent-${s}`,[-2.56,1.23,s*.48],5,.115,[.29,.035,.045],M.soot,'x',[0,s*.04,0]);
    tube(pass11,`11-transition-rail-${s}`,[-3.25,.92,s*.54],[-1.20,1.08,s*.70],.024,s>0?M.steel:M.gunmetal,8);
  }

  // Bespoke convex engine housings around all four existing thrusters.
  engineMacroShell(pass11,0,4.10,.10,.80,.94,1);
  engineMacroShell(pass11,1,4.10,.10,-.80,.94,-1);
  engineMacroShell(pass11,2,3.82,-.50,1.42,.63,1);
  engineMacroShell(pass11,3,3.82,-.50,-1.42,.63,-1);

  // Rear propulsion bridge: large authored shapes connect engine housings into one believable assembly.
  customHull(pass11,'11-rear-propulsion-spine',[[-.95,-.42,-1.46],[-.95,-.42,1.46],[-.82,.50,-1.55],[-.82,.50,1.55],[.45,-.60,-1.72],[.45,-.60,1.72],[.62,.72,-1.60],[.62,.72,1.60],[1.02,-.32,-1.35],[1.02,-.32,1.35],[1.08,.48,-1.30],[1.08,.48,1.30]],[3.12,.18,0],M.graphite2);
  for(const s of[-1,1]){
    customHull(pass11,`11-rear-shoulder-${s}`,[[-.66,-.25,-.48],[-.66,-.25,.48],[-.55,.60,-.55],[-.55,.60,.55],[.62,-.36,-.62],[.62,-.36,.62],[.72,.48,-.50],[.72,.48,.50]],[3.34,.44,s*1.27],s>0?M.armorLight:M.armor,[0,s*.05,0]);
    wedge(pass11,`11-rear-red-inset-${s}`,[1.18,.08,.30],[3.48,.88,s*1.32],M.redBright,[0,s*.10,0],.16);
  }

  // Controlled asymmetry: port gets exposed thermal hardware, starboard gets armored sensor hardware.
  chamfer(pass11,'11-port-thermal-manifold',[1.52,.42,.38],[2.34,.18,1.78],M.gunmetal,[0,.07,0],.09);
  for(let i=0;i<5;i++){cyl(pass11,`11-port-thermal-${i}`,.095+(i%2)*.015,.46,[1.88+i*.25,.19,1.98],i%2?M.steel:M.gunmetal,'x',12);torus(pass11,`11-port-thermal-ring-${i}`,.108+(i%2)*.015,.018,[1.98+i*.25,.19,1.98],i===2?M.red:M.steel,'x',12)}
  tube(pass11,'11-port-feed-a',[1.68,.04,1.92],[3.35,.22,1.62],.032,M.steel,10);tube(pass11,'11-port-feed-b',[1.82,.34,1.94],[3.52,.52,1.55],.024,M.gunmetal,8);
  customHull(pass11,'11-starboard-sensor-armor',[[-.92,-.28,-.34],[-.92,-.28,.34],[-.76,.48,-.30],[-.76,.48,.30],[.66,-.36,-.42],[.66,-.36,.42],[.82,.34,-.36],[.82,.34,.36]],[2.43,.30,-1.73],M.armor,[0,-.09,0]);
  for(let i=0;i<4;i++){const e=box(pass11,`11-starboard-sensor-${i}`,[.08,.055,.045],[2.04+i*.30,.50,-1.94],i===1?M.hot2:M.hot);e.userData.pass11Glow=true;animated.push(e)}
  slots(pass11,'11-starboard-sensor-slots',[2.48,.18,-1.96],6,.13,[.30,.045,.025],M.soot,'x',[0,-.04,0]);

  // Large side armor steps integrate the busy Pass 10 service trunks into the hull.
  for(const s of[-1,1]){
    customHull(pass11,`11-side-macro-armor-${s}`,[[-1.15,-.22,-.33],[-1.15,-.22,.33],[-.98,.34,-.38],[-.98,.34,.38],[.95,-.30,-.45],[.95,-.30,.45],[1.12,.26,-.37],[1.12,.26,.37]],[-.50,.43,s*1.49],s>0?M.armor:M.graphite2,[0,s*.055,0]);
    wedge(pass11,`11-side-step-${s}`,[1.65,.18,.34],[1.12,.57,s*1.45],s>0?M.graphite2:M.armor,[0,s*.08,0],.19);
    slots(pass11,`11-side-shadow-${s}`,[-.40,.39,s*1.72],8,.20,[.33,.042,.022],M.soot,'x',[0,s*.04,0]);
  }

  // Dorsal authored modules: fewer but larger shapes to improve top silhouette.
  customHull(pass11,'11-dorsal-command-shell',[[-.92,-.20,-.48],[-.92,-.20,.48],[-.70,.48,-.40],[-.70,.48,.40],[.62,-.24,-.58],[.62,-.24,.58],[.84,.32,-.46],[.84,.32,.46]],[-1.25,1.32,0],M.armorLight,[0,0,-.04]);
  chamfer(pass11,'11-dorsal-radar-base',[.82,.20,.66],[.18,1.34,0],M.graphite2,[0,0,0],.09);
  torus(pass11,'11-dorsal-radar-ring',.28,.035,[.18,1.47,0],M.red,'y',24);
  for(let i=0;i<3;i++){cyl(pass11,`11-dorsal-probe-${i}`,.020,.42,[.00+i*.18,1.72,(i-1)*.18],M.steel,'y',7);const e=box(pass11,`11-dorsal-probe-light-${i}`,[.035,.035,.035],[.00+i*.18,1.95,(i-1)*.18],i===1?M.hot2:M.hot);e.userData.pass11Glow=true;animated.push(e)}

  // Underside longitudinal keel shell and service doors, still explicitly inferred.
  customHull(pass11,'11-under-keel-shell',[[-2.30,-.12,-.58],[-2.30,-.12,.58],[-2.10,.22,-.48],[-2.10,.22,.48],[2.25,-.18,-.70],[2.25,-.18,.70],[2.40,.16,-.52],[2.40,.16,.52]],[.00,-.96,0],M.graphite);
  for(let i=0;i<5;i++){chamfer(pass11,`11-under-door-${i}`,[.62,.065,.48],[-1.55+i*.78,-1.15,(i%2?-.23:.23)],i===2?M.armor:M.gunmetal,[0,(i%2?.05:-.05),0],.055);slots(pass11,`11-under-door-slot-${i}`,[-1.55+i*.78,-1.19,(i%2?-.23:.23)],3,.09,[.045,.020,.28],M.soot,'z')}

  // Engine shell locator glows collected after construction.
  pass11.traverse(o=>{if(o.userData?.pass11Glow)animated.push(o)});

  // Integrate with existing inspector/runtime without changing Pass 1-10 code.
  const previousExplode=root.userData.setExplode;
  const previousTick=root.userData.tick;
  const basePos=pass11.position.clone();
  root.userData.setExplode=t=>{previousExplode?.(t);const k=THREE.MathUtils.clamp(t,0,1)*1.5;pass11.position.copy(basePos).addScaledVector(new THREE.Vector3(.35,.45,0),k)};
  root.userData.tick=(t,dt)=>{previousTick?.(t,dt);const p=1+Math.sin(t*5.6)*.10+Math.sin(t*11.1)*.035;for(const o of animated)if(o.material?.emissiveIntensity!=null)o.material.emissiveIntensity=(o.name.includes('probe')?5.4:6.5)*p};
  const meta=root.userData.sculptRuntime||{sections:{},confidence:{},inferred:[]};
  meta.version='ship-forge-v4-pass11';meta.sections={...meta.sections,pass11};meta.confidence={...meta.confidence,visibleSide:.965,hiddenSide:.73,underside:.65,rear:.87};meta.inferred=[...(meta.inferred||[]),'pass11 custom engine shell depth from single view','pass11 underside keel continuity'];root.userData.sculptRuntime=meta;
  return pass11;
}
