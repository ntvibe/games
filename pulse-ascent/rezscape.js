import * as THREE from 'three';

const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=THREE.MathUtils.lerp;
const rand=(a,b)=>a+Math.random()*(b-a);

const waitForGame=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});

function makeLineMaterial(color,opacity=.22){return new THREE.LineBasicMaterial({color,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false});}
function edgesBox(w,h,d,color,opacity=.22){const g=new THREE.EdgesGeometry(new THREE.BoxGeometry(w,h,d)),m=new THREE.LineSegments(g,makeLineMaterial(color,opacity));m.frustumCulled=false;return m;}

function makeCityLayer(scene){
  const root=new THREE.Group();root.name='rezscape-city';scene.add(root);
  const palette=[0x36f3ff,0xff5ed8,0x7f6cff,0xff8a3c,0x6dffb0];
  const towers=[];
  const count=innerWidth<700?30:44;
  for(let i=0;i<count;i++){
    const side=i%2?-1:1,z=-22-i*4.7-rand(0,3.5),w=rand(1.2,3.4),h=rand(5,18),d=rand(1.2,3.8);
    const tower=edgesBox(w,h,d,palette[i%palette.length],rand(.1,.26));
    tower.position.set(side*rand(8.5,18),-5.3+h*.5,z);tower.rotation.y=rand(-.08,.08);root.add(tower);towers.push(tower);
    if(i%3===0){const crown=edgesBox(w*.72,rand(.45,1.2),d*.72,palette[(i+2)%palette.length],.28);crown.position.set(0,h*.5+rand(.4,1.1),0);tower.add(crown);}
  }
  return {root,towers};
}

function makeHexTunnel(scene){
  const root=new THREE.Group();root.name='rezscape-hex-tunnel';scene.add(root);
  const rings=[];const mats=[makeLineMaterial(0x74f9ff,.16),makeLineMaterial(0xff4fd6,.14),makeLineMaterial(0x8b70ff,.13)];
  for(let i=0;i<22;i++){
    const pts=[];const r=rand(7.5,11.2);for(let k=0;k<7;k++){const a=(k/6)*TAU;pts.push(new THREE.Vector3(Math.cos(a)*r,Math.sin(a)*r*.76,-i*9.5-28));}
    const geo=new THREE.BufferGeometry().setFromPoints(pts),line=new THREE.Line(geo,mats[i%mats.length]);line.rotation.z=(i%2?1:-1)*.03*i;root.add(line);rings.push(line);
  }
  return {root,rings};
}

function makePsychedelicVeils(scene){
  const root=new THREE.Group();root.name='rezscape-veils';scene.add(root);
  const planes=[];
  for(let i=0;i<10;i++){
    const hue=i/10,mat=new THREE.MeshBasicMaterial({color:new THREE.Color().setHSL(hue,.92,.56),transparent:true,opacity:.035,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
    const p=new THREE.Mesh(new THREE.PlaneGeometry(28,10),mat);p.position.set(rand(-10,10),rand(-2,8),-35-i*13);p.rotation.z=rand(-.8,.8);p.rotation.y=rand(-.5,.5);root.add(p);planes.push(p);
  }
  return {root,planes};
}

function makeSpeedLines(scene){
  const count=innerWidth<700?140:220,pos=new Float32Array(count*6),geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setDrawRange(0,count*2);
  const mat=new THREE.LineBasicMaterial({color:0xb7faff,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false});const lines=new THREE.LineSegments(geo,mat);lines.frustumCulled=false;scene.add(lines);
  return {lines,pos,count,mat};
}

waitForGame().then(game=>{
  const city=makeCityLayer(game.scene),tunnel=makeHexTunnel(game.scene),veils=makePsychedelicVeils(game.scene),speedFx=makeSpeedLines(game.scene);
  const baseUpdate=game.world.update.bind(game.world),baseSetSection=game.world.setSection.bind(game.world);
  let rush=0,rushTarget=0,lastSection=-1,sectionPulseAt=0;

  const configureSection=(section)=>{
    const mode=section%5;
    city.root.visible=mode===0||mode===3;
    tunnel.root.visible=mode===1||mode===4;
    veils.root.visible=mode===2||mode===3||mode===4;
    city.towers.forEach((t,i)=>{t.material.color.setHSL(((section*.17+i*.027)%1),.9,.56);});
    tunnel.rings.forEach((r,i)=>{r.material.color.setHSL(((section*.2+i*.04)%1),.95,.62);});
    veils.planes.forEach((p,i)=>p.material.color.setHSL(((section*.23+i*.09)%1),.95,.58));
    rushTarget=1;sectionPulseAt=game.time;
    game.showCallout?.(mode===0?'NEON CITY GRID':mode===1?'HEX DATA TUNNEL':mode===2?'CHROMA DREAM':mode===3?'SKYSCRAPER RUSH':'PRISMATIC DESCENT',.9);
  };

  game.world.setSection=(section)=>{baseSetSection(section);configureSection(section);lastSection=section;};
  configureSection(game.section||0);

  game.world.update=(dt,t,energy,sync=0)=>{
    baseUpdate(dt,t,energy,sync);
    if(game.section!==lastSection){configureSection(game.section);lastSection=game.section;}
    const elapsed=t-sectionPulseAt;
    if(rushTarget>0&&elapsed>.15)rushTarget=0;
    const periodic=(t%14.5>12.9)?Math.sin(clamp((t%14.5-12.9)/1.6,0,1)*Math.PI):0;
    rush=lerp(rush,Math.max(rushTarget,periodic)*(game.running?1:0),1-Math.pow(.002,dt));
    const speed=17*(1+game.section*.055+sync*.12)*(1+rush*2.25);

    city.towers.forEach((tower,i)=>{tower.position.z+=speed*dt*(.62+rush*.9);if(tower.position.z>12)tower.position.z-=220;tower.rotation.y+=dt*(i%2?1:-1)*.008*(1+rush*3);tower.material.opacity=.08+energy*.08+sync*.08+rush*.18;});
    tunnel.rings.forEach((ring,i)=>{ring.position.z+=speed*dt*(.55+rush*1.05);if(ring.position.z>10)ring.position.z-=210;ring.scale.x=1+rush*.12;ring.scale.y=1-rush*.05;ring.material.opacity=.08+energy*.08+rush*.22;});
    veils.planes.forEach((p,i)=>{p.position.z+=speed*dt*(.34+rush*.6);if(p.position.z>6)p.position.z-=155;p.rotation.z+=dt*(i%2?1:-1)*(.04+energy*.06);p.material.opacity=.018+energy*.035+sync*.04+rush*.075;});

    const arr=speedFx.pos;for(let i=0;i<speedFx.count;i++){
      const a=(i/speedFx.count)*TAU+i*.17,r=rand(5.5,17),z=-rand(3,70),j=i*6,len=1.5+rush*8+energy*1.5;
      const x=Math.cos(a)*r,y=Math.sin(a)*r*.65;arr[j]=x;arr[j+1]=y;arr[j+2]=z;arr[j+3]=x*.98;arr[j+4]=y*.98;arr[j+5]=z+len;
    }
    speedFx.lines.geometry.attributes.position.needsUpdate=true;speedFx.mat.opacity=rush*(innerWidth<700?.34:.48);

    const targetFov=66+rush*(innerWidth<700?8:11);game.camera.fov=lerp(game.camera.fov,targetFov,dt*(rush?7:3));game.camera.updateProjectionMatrix();
    if(game.bloom){game.bloom.strength=lerp(game.bloom.strength,1.05+rush*.4+energy*.16,dt*2.6);game.bloom.radius=lerp(game.bloom.radius,.48+rush*.18,dt*2.4);}
    if(rush>.08){game.world.pulse?.(.35+rush*.5);game.audio.energy=Math.max(game.audio.energy,.18+rush*.16);}
  };

  window.__rezscape={city,tunnel,veils,speedFx,get rush(){return rush;},triggerRush:()=>{sectionPulseAt=game.time;rushTarget=1;}};
});
