import * as THREE from 'three';

const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=THREE.MathUtils.lerp;
const rand=(a,b)=>a+Math.random()*(b-a);
const waitForGame=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});

const AREA_PROFILES=[
  {name:'SIGNAL BIRTH',palette:[0x43f7ff,0xff5ac8,0x101827],bg:0x01040a,fog:0x020610,style:'circuit'},
  {name:'GLASS TEMPLE',palette:[0xffa247,0x5bd6ff,0x6e55ff],bg:0x07030a,fog:0x090411,style:'temple'},
  {name:'CHROMA SEA',palette:[0x65ffd8,0xff6bd6,0x7b6cff],bg:0x01070a,fog:0x011016,style:'particles'},
  {name:'ORGANIC CODE',palette:[0xa0ff6a,0x65cfff,0xff7d9e],bg:0x03080a,fog:0x06100b,style:'organic'},
  {name:'NEURAL CATHEDRAL',palette:[0xffffff,0x6d83ff,0xff55ce],bg:0x020207,fog:0x07030c,style:'cathedral'}
];

function material(color,opacity=.14){return new THREE.LineBasicMaterial({color,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false});}
function edgeMesh(geo,color,opacity=.14){return new THREE.LineSegments(new THREE.EdgesGeometry(geo),material(color,opacity));}

function buildSignalField(scene){
  const root=new THREE.Group();root.name='generative-signal-field';scene.add(root);
  const count=innerWidth<760?520:900;
  const pos=new Float32Array(count*3),seed=new Float32Array(count);
  for(let i=0;i<count;i++){const j=i*3,a=(i/count)*TAU*13,r=4+(i%37)*.27;pos[j]=Math.cos(a)*r;pos[j+1]=Math.sin(a*1.7)*r*.48;pos[j+2]=-18-(i%97)*1.65;seed[i]=(i%101)/101;}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const mat=new THREE.PointsMaterial({color:0x7ff8ff,size:innerWidth<760?.04:.032,transparent:true,opacity:.32,blending:THREE.AdditiveBlending,depthWrite:false,sizeAttenuation:true});
  const points=new THREE.Points(geo,mat);points.frustumCulled=false;root.add(points);
  return {root,points,geo,pos,seed,count,mat};
}

function buildArchitectures(scene){
  const root=new THREE.Group();root.name='generative-architecture';scene.add(root);
  const groups=[];
  for(let area=0;area<5;area++){
    const g=new THREE.Group();g.visible=false;root.add(g);groups.push(g);
    if(area===0){
      for(let i=0;i<16;i++){
        const side=i%2?-1:1,h=8+(i%5)*2.5,w=2.6+(i%3)*.9,d=4+(i%4)*1.2;
        const m=edgeMesh(new THREE.BoxGeometry(w,h,d),i%3===0?0xff5ac8:0x43f7ff,.12);m.position.set(side*(8+(i%4)*2.8),-4+h*.5,-24-i*10);g.add(m);
        for(let t=0;t<5;t++){
          const p=new THREE.Line(new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(side*(7.9+(i%4)*2.8),-2+t*1.6,-24-i*10-d*.52),
            new THREE.Vector3(side*(7.9+(i%4)*2.8),-2+t*1.6,-24-i*10+d*.52)
          ]),material(t%2?0xff9be0:0x8ffaff,.1));g.add(p);
        }
      }
    } else if(area===1){
      for(let i=0;i<12;i++){
        const a=(i/12)*TAU,rad=7+(i%3)*2.2;
        const p=edgeMesh(new THREE.ConeGeometry(2.2+(i%2)*.8,7+(i%4)*1.1,4,1,true),i%3===0?0xffa247:i%2?0x5bd6ff:0x6e55ff,.12);p.position.set(Math.cos(a)*rad,Math.sin(a)*rad*.45,-28-i*9);p.rotation.y=Math.PI/4+a*.25;g.add(p);
      }
    } else if(area===2){
      for(let i=0;i<18;i++){
        const tor=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.TorusGeometry(2.5+(i%5)*.5,.025,3,42)),material(new THREE.Color().setHSL((i/18+.45)%1,.9,.65),.1));tor.position.set(Math.sin(i*.8)*6,Math.cos(i*.53)*3.5,-22-i*7);tor.rotation.set(i*.07,i*.11,i*.19);g.add(tor);
      }
    } else if(area===3){
      for(let i=0;i<14;i++){
        const geo=i%2?new THREE.IcosahedronGeometry(2.4+(i%4)*.45,1):new THREE.OctahedronGeometry(2.2+(i%5)*.4,0);
        const m=edgeMesh(geo,i%3===0?0xa0ff6a:i%2?0x65cfff:0xff7d9e,.09);m.position.set(Math.sin(i*1.1)*7,Math.cos(i*.7)*4,-24-i*8);m.scale.y=.45+(i%4)*.2;g.add(m);
      }
    } else {
      for(let i=0;i<18;i++){
        const col=edgeMesh(new THREE.CylinderGeometry(.4+(i%3)*.18,.8+(i%4)*.16,11+(i%5)*1.5,6,1,true),i%3===0?0xffffff:i%2?0x6d83ff:0xff55ce,.1);col.position.set((i%2?-1:1)*(6+(i%5)*2.1),-1,-22-i*8.5);col.rotation.z=(i%2?-1:1)*.06;g.add(col);
      }
    }
  }
  return {root,groups};
}

waitForGame().then(game=>{
  if(game.__generativeDirectorInstalled)return;game.__generativeDirectorInstalled=true;
  const field=buildSignalField(game.scene),arch=buildArchitectures(game.scene);
  let currentArea=0,lastSection=game.section||0,morph=0,beatPulse=0;

  const applyArea=(area)=>{
    currentArea=clamp(area,0,4);const p=AREA_PROFILES[currentArea];
    arch.groups.forEach((g,i)=>g.visible=i===currentArea);
    game.scene.background.set(p.bg);if(game.scene.fog)game.scene.fog.color.set(p.fog);
    field.mat.color.set(p.palette[0]);
  };
  const getSelectedArea=()=>Math.max(0,Math.min(4,(window.__pulseCampaign?.state?.selected||1)-1));
  applyArea(getSelectedArea());

  const baseSetSection=game.setSection.bind(game);
  game.setSection=(i,name)=>{baseSetSection(i,name);lastSection=i;morph=1;applyArea(getSelectedArea());};

  const baseUpdate=game.world.update.bind(game.world);
  game.world.update=(dt,t,energy,sync=0)=>{
    baseUpdate(dt,t,energy,sync);
    const area=getSelectedArea();if(area!==currentArea)applyArea(area);
    morph=lerp(morph,0,1-Math.pow(.005,dt));beatPulse=lerp(beatPulse,Math.max(0,Math.cos(t*TAU*(128/60)))*.18,dt*8);
    const profile=AREA_PROFILES[currentArea];

    arch.groups.forEach((g,gi)=>{if(!g.visible)return;const mood=currentArea;
      g.rotation.z=Math.sin(t*(.05+.01*mood))*(.015+.012*mood);
      g.children.forEach((c,i)=>{
        const depth=(i%11)/10;
        c.position.z+=dt*(4.5+currentArea*1.1+energy*2.2);
        if(c.position.z>10)c.position.z-=150+currentArea*12;
        c.rotation.x+=dt*(i%2?1:-1)*(.01+.008*mood+energy*.02);
        c.rotation.y+=dt*(i%3-1)*(.008+.006*mood);
        if(c.material)c.material.opacity=.045+.05*depth+energy*.055+sync*.05+morph*.05;
      });
    });

    const arr=field.pos;
    for(let i=0;i<field.count;i++){
      const j=i*3,s=field.seed[i],z=-18-(i%97)*1.65;let x=arr[j],y=arr[j+1];
      if(currentArea===0){x+=Math.sin(t*.7+s*21)*.004;y+=Math.cos(t*.6+s*13)*.003;}
      else if(currentArea===1){const a=t*.18+s*TAU*8,r=5+s*12;x=lerp(x,Math.cos(a)*r,dt*.04);y=lerp(y,Math.sin(a)*r*.42,dt*.04);}
      else if(currentArea===2){const a=t*.32+s*TAU*15,r=3+s*15;x=lerp(x,Math.cos(a)*r,dt*.08);y=lerp(y,Math.sin(a*1.3)*r*.55,dt*.08);}
      else if(currentArea===3){x+=Math.sin(t*1.2+s*33)*.009;y+=Math.sin(t*.9+s*17)*.007;}
      else {const a=t*.13+s*TAU*10,r=4+s*13;x=lerp(x,Math.cos(a)*r,dt*.05);y=lerp(y,Math.sin(a*.7)*r*.5,dt*.05);}
      arr[j]=x;arr[j+1]=y;arr[j+2]=z+((t*(3.5+currentArea*.8))%(150));
      if(arr[j+2]>8)arr[j+2]-=160;
    }
    field.geo.attributes.position.needsUpdate=true;
    field.mat.opacity=.18+energy*.14+sync*.12+beatPulse;
    field.mat.size=(innerWidth<760?.032:.026)+energy*.012+morph*.012;
    field.root.rotation.z=Math.sin(t*.08+currentArea)*.05;

    const p=profile.palette;field.mat.color.set(p[0]).lerp(new THREE.Color(p[1]),.25+.2*Math.sin(t*.2));
  };

  window.__pulseGenerativeDirector={profiles:AREA_PROFILES,field,arch,get area(){return currentArea;}};
});
