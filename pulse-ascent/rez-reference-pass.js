import * as THREE from 'three';

const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=THREE.MathUtils.lerp;
const rand=(a,b)=>a+Math.random()*(b-a);
const waitForGame=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});

function lineMat(color,opacity=.2){return new THREE.LineBasicMaterial({color,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false});}
function meshMat(color,opacity=.14){return new THREE.MeshBasicMaterial({color,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});}

function buildCircuitFacade(){
  const root=new THREE.Group();
  const traces=[];
  for(let lane=0;lane<14;lane++){
    const x=-1.35+(lane%7)*.45,y=-1.9+Math.floor(lane/7)*2.2,pts=[];
    pts.push(new THREE.Vector3(x,y,0));pts.push(new THREE.Vector3(x+.18,y,0));pts.push(new THREE.Vector3(x+.18,y+.35,0));pts.push(new THREE.Vector3(x+.62,y+.35,0));pts.push(new THREE.Vector3(x+.62,y+.68,0));pts.push(new THREE.Vector3(x+.92,y+.68,0));
    const geo=new THREE.BufferGeometry().setFromPoints(pts),mat=lineMat(lane%3===0?0xff7a2f:lane%3===1?0x4f6bff:0xffc04d,.22),ln=new THREE.Line(geo,mat);root.add(ln);
    const pulse=new THREE.Mesh(new THREE.BoxGeometry(.06,.06,.015),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false}));root.add(pulse);
    traces.push({ln,pulse,phase:rand(0,1)});
  }
  const chips=[];
  for(let i=0;i<16;i++){const c=new THREE.Mesh(new THREE.BoxGeometry(rand(.12,.34),rand(.08,.22),.02),new THREE.MeshBasicMaterial({color:i%2?0xffa94f:0x506cff,transparent:true,opacity:.28,blending:THREE.AdditiveBlending,depthWrite:false}));c.position.set(rand(-1.45,1.45),rand(-2.1,2.1),.015);root.add(c);chips.push(c);}
  return {root,traces,chips};
}

function buildArchitecture(scene){
  const root=new THREE.Group();root.name='reference-architecture';scene.add(root);
  const towers=[];
  const mobile=innerWidth<760;
  const count=mobile?16:24;
  for(let i=0;i<count;i++){
    const side=i%2?-1:1,h=rand(7,18),w=rand(2.8,5.2),d=rand(2.4,5),group=new THREE.Group();
    const shell=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w,h,d)),lineMat(i%2?0x3f57ff:0xff6b2d,.2));group.add(shell);
    const facade=buildCircuitFacade();facade.root.scale.set(w/3.3,h/4.6,1);facade.root.position.set(side>0?-w*.505:w*.505,0,0);facade.root.rotation.y=side>0?-Math.PI/2:Math.PI/2;group.add(facade.root);
    group.position.set(side*rand(8.5,15),-4.8+h*.5,-30-i*8.5);root.add(group);towers.push({group,shell,facade,baseZ:group.position.z});
  }
  return {root,towers};
}

function buildTransformationFields(scene){
  const root=new THREE.Group();root.name='reference-worlds';scene.add(root);
  const worlds=[];

  const city=new THREE.Group();root.add(city);worlds.push(city);
  for(let i=0;i<11;i++){const g=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(6+i*1.2,4+i*.9,8+i*2.6)),lineMat(i%2?0xff6b2d:0x3a5dff,.1+i*.009));g.position.z=-42-i*11;city.add(g);}

  const temple=new THREE.Group();root.add(temple);worlds.push(temple);
  for(let i=0;i<13;i++){const g=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.ConeGeometry(9-i*.42,7+i*.9,4,1,true)),lineMat(i%3===0?0xffffff:i%2?0xff5bd7:0x5deeff,.1+i*.008));g.position.z=-46-i*9;g.rotation.y=Math.PI/4+i*.12;temple.add(g);}

  const voidField=new THREE.Group();root.add(voidField);worlds.push(voidField);
  for(let i=0;i<18;i++){const mat=meshMat(new THREE.Color().setHSL(i/18,.95,.56),.035),p=new THREE.Mesh(new THREE.PlaneGeometry(18+i*.5,8+i*.22),mat);p.position.set(rand(-8,8),rand(-5,7),-26-i*7);p.rotation.set(rand(-.6,.6),rand(-.6,.6),rand(-1.2,1.2));voidField.add(p);}

  const organism=new THREE.Group();root.add(organism);worlds.push(organism);
  for(let i=0;i<16;i++){const r=2.5+i*.42,tor=new THREE.Line(new THREE.TorusKnotGeometry(r*.34,.018,54,4,2,3),lineMat(i%2?0x7dffca:0xff7be7,.11));tor.position.z=-34-i*7.5;tor.scale.set(1.6,1,.8);organism.add(tor);}

  const cathedral=new THREE.Group();root.add(cathedral);worlds.push(cathedral);
  for(let z=0;z<9;z++){for(let side=-1;side<=1;side+=2){const a=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2.4,8+z*.7,2.4)),lineMat(z%2?0x5deeff:0xffffff,.12));a.position.set(side*(5.5+z*.35),0,-42-z*12);cathedral.add(a);}const ring=new THREE.Line(new THREE.TorusGeometry(5+z*.4,.025,3,64),lineMat(0xff76d7,.12));ring.position.z=-42-z*12;ring.rotation.x=Math.PI/2;cathedral.add(ring);}

  return {root,worlds};
}

function buildMorphShell(game){
  const rig=game.world.humanRig;if(!rig)return null;
  const root=new THREE.Group();root.name='reference-pilot-morph';rig.root.add(root);
  const nodes=[];
  const bones=[
    [0,1.25,0],[0,.65,0],[0,0,0],[-.45,.72,0],[-.72,.22,0],[.45,.72,0],[.72,.22,0],[-.24,-.35,0],[-.28,-1.05,0],[.24,-.35,0],[.28,-1.05,0]
  ];
  for(let i=0;i<bones.length;i++){const cube=new THREE.Mesh(new THREE.BoxGeometry(.22,.22,.22),new THREE.MeshBasicMaterial({color:i%2?0xff69db:0x69f7ff,wireframe:true,transparent:true,opacity:.52,blending:THREE.AdditiveBlending,depthWrite:false}));cube.position.fromArray(bones[i]);root.add(cube);nodes.push(cube);}
  const links=[];
  const pairs=[[0,1],[1,2],[1,3],[3,4],[1,5],[5,6],[2,7],[7,8],[2,9],[9,10]];
  pairs.forEach((p,i)=>{const a=new THREE.Vector3(...bones[p[0]]),b=new THREE.Vector3(...bones[p[1]]),geo=new THREE.BufferGeometry().setFromPoints([a,b]),ln=new THREE.Line(geo,lineMat(i%2?0xffffff:0x7efaff,.48));root.add(ln);links.push(ln);});
  return {root,nodes,links};
}

waitForGame().then(game=>{
  const install=()=>{
    if(!game.world.humanRig){requestAnimationFrame(install);return;}
    const arch=buildArchitecture(game.scene),fields=buildTransformationFields(game.scene),pilot=buildMorphShell(game);
    let lastSection=-1,transition=0,phase=0;
    const oldCinematic=window.__cinematicEvolution;
    if(oldCinematic){oldCinematic.setpieces?.root&&(oldCinematic.setpieces.root.visible=false);oldCinematic.pilot?.root&&(oldCinematic.pilot.root.visible=false);oldCinematic.skins?.forEach?.(s=>s.root&&(s.root.visible=false));}

    const setSection=(s)=>{lastSection=s;transition=1;phase=0;fields.worlds.forEach((w,i)=>w.visible=i===s%fields.worlds.length);game.world.triggerDisintegrate?.(1.05);game.showCallout?.(['CIRCUIT CITY','DATA TEMPLE','CHROMATIC VOID','ORGANIC SIGNAL','NEURAL CATHEDRAL'][s%5],.96);};
    setSection(game.section||0);
    const baseUpdate=game.world.update.bind(game.world);
    game.world.update=(dt,t,energy,sync=0)=>{
      baseUpdate(dt,t,energy,sync);
      if(game.section!==lastSection)setSection(game.section);
      transition=lerp(transition,0,1-Math.pow(.0008,dt));phase+=dt;
      const speed=17*(1+game.section*.055+sync*.12);

      arch.towers.forEach((tw,i)=>{
        tw.group.position.z+=speed*dt*(.46+transition*.8);if(tw.group.position.z>14)tw.group.position.z-=215;
        tw.group.rotation.y=Math.sin(t*.18+i)*.025;
        tw.facade.traces.forEach((tr,j)=>{const pos=tr.ln.geometry.attributes.position,count=Math.max(2,pos.count),u=(t*.55+tr.phase+j*.07)%1,seg=u*(count-1),a=Math.floor(seg),f=seg-a,b=Math.min(a+1,count-1);tr.pulse.position.set(lerp(pos.getX(a),pos.getX(b),f),lerp(pos.getY(a),pos.getY(b),f),lerp(pos.getZ(a),pos.getZ(b),f));tr.pulse.material.opacity=.35+energy*.55;tr.ln.material.opacity=.16+energy*.12+sync*.08;});
      });

      fields.worlds.forEach((w,wi)=>{if(!w.visible)return;w.rotation.z=Math.sin(t*.13+wi)*.08;w.children.forEach((c,i)=>{c.rotation.z+=dt*(i%2?1:-1)*(.035+energy*.035);c.rotation.y+=dt*.018*(1+wi*.2);if(c.material)c.material.opacity=.07+energy*.07+sync*.09+transition*.14;});});

      if(pilot){const evo=clamp((game.evolution||1)-1,0,5),morph=evo/5;pilot.nodes.forEach((n,i)=>{const cubeBias=1-morph,beat=Math.max(0,Math.sin(t*6.3+i*.6));n.rotation.x+=dt*(.35+i*.015);n.rotation.y-=dt*(.28+i*.012);const stretch=1+morph*(i%3===0?.8:.2);n.scale.set(.85+cubeBias*.55+beat*.08,stretch,.85+cubeBias*.4);n.material.opacity=.28+cubeBias*.28+energy*.2;});pilot.links.forEach((l,i)=>l.material.opacity=.24+morph*.36+sync*.08);pilot.root.rotation.y=Math.sin(t*.55)*.06;}

      if(transition>.03){const burst=Math.sin(clamp((1-transition)*Math.PI*1.4,0,Math.PI));game.camera.position.y=lerp(game.camera.position.y,Math.sin(phase*2.4)*.35*transition,dt*5);game.camera.rotation.z+=Math.sin(t*12)*transition*.002;game.renderer.toneMappingExposure=1.05+transition*.7+energy*.1;game.scene.fog.density=.01+transition*.004;if(window.__rezscape?.triggerRush&&transition>.7)window.__rezscape.triggerRush();}
    };
    window.__rezReferencePass={arch,fields,pilot};
  };
  install();
});
