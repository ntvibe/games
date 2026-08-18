import * as THREE from 'three';

const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=THREE.MathUtils.lerp;
const rand=(a,b)=>a+Math.random()*(b-a);
const waitForGame=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});

function addCircuitSkin(tower,index){
  const root=new THREE.Group();root.name='circuit-skin';tower.add(root);
  const side=index%2?-1:1;
  const baseColor=new THREE.Color(index%3===0?0x67fbff:index%3===1?0xff5de1:0xa58aff);
  const paths=[];
  for(let p=0;p<5;p++){
    const pts=[];let y=rand(-.44,.44),z=rand(-.44,.44);
    for(let k=0;k<5;k++){
      const x=side*(.505+rand(.001,.02));
      pts.push(new THREE.Vector3(x,y,z));
      if(k<4){if(k%2)y=clamp(y+rand(-.24,.24),-.48,.48);else z=clamp(z+rand(-.24,.24),-.48,.48);}
    }
    const geo=new THREE.BufferGeometry().setFromPoints(pts),mat=new THREE.LineBasicMaterial({color:baseColor,transparent:true,opacity:.22,blending:THREE.AdditiveBlending,depthWrite:false}),line=new THREE.Line(geo,mat);root.add(line);paths.push({line,phase:rand(0,TAU)});
    const pads=[];for(let k=1;k<pts.length-1;k++){const pad=new THREE.Mesh(new THREE.BoxGeometry(.035,.035,.012),new THREE.MeshBasicMaterial({color:baseColor,transparent:true,opacity:.28,blending:THREE.AdditiveBlending,depthWrite:false}));pad.position.copy(pts[k]);root.add(pad);pads.push(pad);}paths[paths.length-1].pads=pads;
  }
  const pulse=new THREE.Mesh(new THREE.SphereGeometry(.028,5,4),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false}));root.add(pulse);
  return {root,paths,pulse};
}

function buildSetpieces(scene){
  const root=new THREE.Group();root.name='cinematic-setpieces';scene.add(root);
  const groups=[];
  const mkMat=(c,o=.18)=>new THREE.LineBasicMaterial({color:c,transparent:true,opacity:o,blending:THREE.AdditiveBlending,depthWrite:false});
  for(let s=0;s<5;s++){
    const g=new THREE.Group();g.visible=false;root.add(g);groups.push(g);
    if(s===0){
      for(let i=0;i<7;i++){const geo=new THREE.EdgesGeometry(new THREE.BoxGeometry(4+i*.7,4+i*.7,4+i*.7)),m=new THREE.LineSegments(geo,mkMat(i%2?0xff5cd9:0x59f6ff,.1+i*.018));m.position.z=-40-i*8;m.rotation.set(i*.1,i*.13,i*.08);g.add(m);}
    } else if(s===1){
      for(let i=0;i<9;i++){const m=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.ConeGeometry(7-i*.45,8+i*.7,4,1,true)),mkMat(i%2?0x8f75ff:0x73ffff,.11+i*.012));m.position.z=-55-i*9;m.rotation.y=Math.PI/4+i*.16;g.add(m);}
    } else if(s===2){
      for(let i=0;i<14;i++){const m=new THREE.Line(new THREE.TorusGeometry(2.2+i*.45,.018,3,64),mkMat(new THREE.Color().setHSL((i/14+.02)%1,.96,.63),.11));m.position.z=-35-i*6;m.rotation.set(rand(-1,1),rand(-1,1),rand(0,TAU));g.add(m);}
    } else if(s===3){
      for(let i=0;i<12;i++){const m=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.OctahedronGeometry(3.5+i*.38,0)),mkMat(i%3===0?0xffffff:i%2?0xff60d7:0x68f7ff,.1+i*.01));m.position.z=-42-i*7;m.scale.y=.45+((i%4)*.16);g.add(m);}
    } else {
      for(let i=0;i<10;i++){const geo=new THREE.RingGeometry(3+i*.72,3.03+i*.72,8),m=new THREE.LineSegments(new THREE.EdgesGeometry(geo),mkMat(i%2?0xff7fe6:0x8bfffa,.12));m.position.z=-45-i*9;m.rotation.z=i*.2;g.add(m);}
    }
  }
  return {root,groups};
}

function buildPilotEvolution(game){
  const rig=game.world.humanRig;if(!rig)return null;
  const root=new THREE.Group();root.name='pilot-evolution';rig.root.add(root);
  const forms=[];
  const colors=[0x7af8ff,0xff69db,0xb18bff,0xffffff,0x6dffb6,0xffa15c];
  const addForm=(geoFactory,count,scale)=>{const g=new THREE.Group();g.visible=false;root.add(g);for(let i=0;i<count;i++){const m=new THREE.Mesh(geoFactory(i),new THREE.MeshBasicMaterial({color:colors[i%colors.length],wireframe:true,transparent:true,opacity:.4,blending:THREE.AdditiveBlending,depthWrite:false}));const a=i/count*TAU,r=.42+(i%3)*.19;m.position.set(Math.cos(a)*r,rand(-1.3,1.2),Math.sin(a)*r*.32);m.scale.setScalar(scale*(.8+(i%4)*.12));g.add(m);}forms.push(g);};
  addForm(()=>new THREE.BoxGeometry(.16,.16,.16),22,1);
  addForm(()=>new THREE.TetrahedronGeometry(.12,0),24,.95);
  addForm(()=>new THREE.OctahedronGeometry(.13,0),26,1);
  addForm(()=>new THREE.IcosahedronGeometry(.11,0),30,.9);
  addForm(()=>new THREE.TorusGeometry(.11,.018,3,10),22,1);
  addForm(()=>new THREE.ConeGeometry(.08,.22,5),28,.9);
  return {root,forms,last:-1};
}

waitForGame().then(game=>{
  const install=()=>{
    const rez=window.__rezscape;if(!rez||!game.world.humanRig){requestAnimationFrame(install);return;}
    const skins=rez.city.towers.map((t,i)=>addCircuitSkin(t,i));
    const setpieces=buildSetpieces(game.scene);
    const pilot=buildPilotEvolution(game);
    let transition=0,lastSection=-1;

    const applySection=section=>{
      setpieces.groups.forEach((g,i)=>g.visible=i===section%setpieces.groups.length);
      transition=1;lastSection=section;
      if(pilot){const idx=clamp((game.evolution||1)-1,0,pilot.forms.length-1);pilot.forms.forEach((f,i)=>f.visible=i===idx);pilot.last=idx;}
      game.world.triggerDisintegrate?.(.7);
      game.showCallout?.('FORM SHIFT // '+String((game.evolution||1)).padStart(2,'0'),.94);
    };
    applySection(game.section||0);

    const baseUpdate=game.world.update.bind(game.world);
    game.world.update=(dt,t,energy,sync=0)=>{
      baseUpdate(dt,t,energy,sync);
      if(game.section!==lastSection)applySection(game.section);
      const evoIdx=clamp((game.evolution||1)-1,0,5);
      if(pilot&&pilot.last!==evoIdx){pilot.forms.forEach((f,i)=>f.visible=i===evoIdx);pilot.last=evoIdx;game.world.triggerDisintegrate?.(.85);transition=1;}
      transition=lerp(transition,0,1-Math.pow(.003,dt));

      skins.forEach((skin,i)=>{skin.paths.forEach((p,j)=>{p.line.material.opacity=.13+energy*.16+sync*.11+Math.sin(t*3+p.phase)*.06;p.pads.forEach((pad,k)=>pad.material.opacity=.12+.24*Math.max(0,Math.sin(t*5+p.phase+k*.7)));});const path=skin.paths[Math.floor((t*.9+i)%skin.paths.length)];if(path){const pts=path.line.geometry.attributes.position;const seg=(t*.8+i*.17)%Math.max(1,pts.count-1),a=Math.floor(seg),f=seg-a;skin.pulse.position.set(lerp(pts.getX(a),pts.getX(Math.min(a+1,pts.count-1)),f),lerp(pts.getY(a),pts.getY(Math.min(a+1,pts.count-1)),f),lerp(pts.getZ(a),pts.getZ(Math.min(a+1,pts.count-1)),f));skin.pulse.material.opacity=.45+energy*.5;}});

      setpieces.groups.forEach((g,gi)=>{if(!g.visible)return;g.rotation.z+=dt*(.025+gi*.008+energy*.045);g.rotation.y=Math.sin(t*.18+gi)*.18;g.children.forEach((c,i)=>{c.rotation.x+=dt*(i%2?1:-1)*(.03+transition*.22);if(c.material)c.material.opacity=.08+energy*.08+sync*.08+transition*.16;});});

      if(pilot){pilot.root.rotation.y=Math.sin(t*.7)*.08;pilot.root.children.forEach((form,fi)=>{if(!form.visible)return;form.children.forEach((m,i)=>{const beat=Math.max(0,Math.sin(t*6.4+i*.47));m.rotation.x+=dt*(.7+(i%5)*.08);m.rotation.y-=dt*(.45+(i%3)*.06);const s=.78+beat*.18+sync*.12;m.scale.setScalar(s);m.material.opacity=.18+energy*.28+beat*.25;});});}

      if(transition>.04){game.camera.rotation.z+=Math.sin(t*20)*transition*.0025;game.renderer.toneMappingExposure=1.05+transition*.55+energy*.12;game.scene.fog.density=.012+transition*.006;}else{game.renderer.toneMappingExposure=lerp(game.renderer.toneMappingExposure,1.08+energy*.08,dt*2);game.scene.fog.density=lerp(game.scene.fog.density,.018,dt*1.6);}
    };
    window.__cinematicEvolution={skins,setpieces,pilot};
  };
  install();
});
