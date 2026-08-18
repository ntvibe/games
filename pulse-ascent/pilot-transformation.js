import * as THREE from 'three';

const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=THREE.MathUtils.lerp;
const waitForGame=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});

const FORM_NAMES=['BLOCK','FACET','SIGNAL','ASCEND'];
const FORM_COLORS=[0x65f6ff,0xff62d8,0xe8ffff,0x8d76ff];

function mat(color,opacity=.6,wireframe=false){
  const m=new THREE.MeshBasicMaterial({color,wireframe,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false});
  m.userData.baseOpacity=opacity;
  return m;
}

function addMesh(group,geometry,material,position=[0,0,0],rotation=[0,0,0],scale=[1,1,1]){
  const mesh=new THREE.Mesh(geometry,material);
  mesh.position.set(...position);mesh.rotation.set(...rotation);mesh.scale.set(...scale);group.add(mesh);return mesh;
}

function addSegment(group,kind,length,width,color){
  let geo;
  if(kind==='block')geo=new THREE.BoxGeometry(width,length,width*.82,1,1,1);
  else if(kind==='facet')geo=new THREE.CylinderGeometry(width*.58,width*.78,length,6,1,true);
  else geo=new THREE.CylinderGeometry(width*.22,width*.32,length,5,1,true);
  const mesh=addMesh(group,geo,mat(color,kind==='signal'?.72:.52,kind==='signal'),[0,-length*.5,0]);
  return mesh;
}

function addJoint(group,kind,size,color){
  let geo;
  if(kind==='block')geo=new THREE.BoxGeometry(size,size,size);
  else if(kind==='facet')geo=new THREE.OctahedronGeometry(size*.68,0);
  else geo=new THREE.TorusGeometry(size*.43,size*.07,4,14);
  return addMesh(group,geo,mat(color,kind==='signal'?.74:.56,kind==='signal'));
}

function makeFormLayer(rig,kind,index){
  const root=new THREE.Group();root.name=`pilot-form-${kind}`;rig.root.add(root);
  const materials=[],meshes=[];
  const register=m=>{meshes.push(m);materials.push(m.material);return m;};
  const c0=FORM_COLORS[index%FORM_COLORS.length],c1=FORM_COLORS[(index+1)%FORM_COLORS.length],white=0xffffff;

  const torso=new THREE.Group();root.add(torso);
  if(kind==='block'){
    register(addMesh(torso,new THREE.BoxGeometry(.78,1.04,.46),mat(c0,.45),[0,.43,0],[0,0,0],[1,1,1]));
    register(addMesh(torso,new THREE.BoxGeometry(.58,.34,.42),mat(c1,.5),[0,-.24,0]));
    register(addMesh(rig.headPivot,new THREE.BoxGeometry(.42,.48,.4),mat(white,.62),[0,0,0]));
  }else if(kind==='facet'){
    register(addMesh(torso,new THREE.CylinderGeometry(.31,.48,.98,5,2,true),mat(c0,.54,true),[0,.43,0],[0,Math.PI/5,0]));
    register(addMesh(torso,new THREE.OctahedronGeometry(.34,0),mat(c1,.5,true),[0,-.2,0],[0,0,0],[1.2,.62,.82]));
    register(addMesh(rig.headPivot,new THREE.IcosahedronGeometry(.28,0),mat(white,.72,true),[0,0,0],[0,0,0],[.86,1.05,.86]));
  }else{
    register(addMesh(torso,new THREE.CylinderGeometry(.18,.3,.98,6,3,true),mat(c0,.7,true),[0,.43,0],[0,Math.PI/6,0]));
    register(addMesh(torso,new THREE.TorusGeometry(.36,.025,4,28),mat(c1,.7),[0,.5,.02],[Math.PI/2,0,0]));
    register(addMesh(rig.headPivot,new THREE.IcosahedronGeometry(.255,1),mat(white,.78,true),[0,0,0],[0,0,0],[.8,1.08,.8]));
  }

  const specs=[
    [rig.shoulderL,.57,.13,c0],[rig.shoulderR,.57,.13,c0],
    [rig.elbowL,.55,.105,c1],[rig.elbowR,.55,.105,c1],
    [rig.hipL,.72,.15,c0],[rig.hipR,.72,.15,c0],
    [rig.kneeL,.68,.12,c1],[rig.kneeR,.68,.12,c1]
  ];
  specs.forEach(([parent,length,width,color])=>{
    const segment=register(addSegment(parent,kind,length,width,color));root.userData.detached=root.userData.detached||[];root.userData.detached.push(segment);
    const joint=register(addJoint(parent,kind,width*1.45,white));root.userData.detached.push(joint);
  });

  if(kind==='signal'){
    const halo=register(addMesh(torso,new THREE.TorusGeometry(.68,.018,4,56),mat(c0,.34),[0,.35,0],[Math.PI/2,0,0]));
    const haloB=register(addMesh(torso,new THREE.TorusGeometry(.86,.012,4,64),mat(c1,.25),[0,.35,0],[Math.PI/2,.45,0]));
    root.userData.halos=[halo,haloB];
  }

  materials.forEach(m=>{m.userData.targetOpacity=m.userData.baseOpacity;});
  root.userData={...root.userData,kind,index,meshes,materials,torso};
  return root;
}

function makeAscendedLayer(rig){
  const root=new THREE.Group();root.name='pilot-form-ascend';rig.root.add(root);
  const joints=[rig.headPivot,rig.shoulderL,rig.shoulderR,rig.elbowL,rig.elbowR,rig.hipL,rig.hipR,rig.kneeL,rig.kneeR];
  const crowns=[];
  joints.forEach((parent,i)=>{
    const g=new THREE.Group();parent.add(g);root.userData.detached=root.userData.detached||[];root.userData.detached.push(g);
    for(let k=0;k<3;k++){
      const ring=addMesh(g,new THREE.TorusGeometry(.11+k*.045,.008,3,18),mat(k===1?0xff63dc:0x75f8ff,.46-k*.08),[0,0,0],[Math.PI/2,k*.55,k*.7]);
      crowns.push(ring);
    }
  });
  const core=addMesh(root,new THREE.IcosahedronGeometry(.13,1),mat(0xffffff,.9),[0,.54,.18]);
  const spine=[];
  for(let i=0;i<9;i++)spine.push(addMesh(root,new THREE.OctahedronGeometry(.035+i*.003,0),mat(i%2?0xff62da:0x7bfbff,.62),[0,-.28+i*.15,.04]));
  root.userData={...root.userData,kind:'ascend',index:3,crowns,core,spine,materials:[core.material,...spine.map(x=>x.material),...crowns.map(x=>x.material)]};
  return root;
}

function makeTransformField(rig){
  const mobile=innerWidth<760,count=mobile?360:620,pos=new Float32Array(count*3),base=new Float32Array(count*3),dir=new Float32Array(count*3),phase=new Float32Array(count);
  const skeleton=[
    [[0,1.28,0],[0,.78,0]],[[0,.78,0],[0,-.3,0]],
    [[0,.74,0],[-.49,.77,0]],[[-.49,.77,0],[-.49,.2,0]],[[-.49,.2,0],[-.49,-.35,0]],
    [[0,.74,0],[.49,.77,0]],[[.49,.77,0],[.49,.2,0]],[[.49,.2,0],[.49,-.35,0]],
    [[0,-.28,0],[-.23,-.38,0]],[[-.23,-.38,0],[-.23,-1.1,0]],[[-.23,-1.1,0],[-.23,-1.78,0]],
    [[0,-.28,0],[.23,-.38,0]],[[.23,-.38,0],[.23,-1.1,0]],[[.23,-1.1,0],[.23,-1.78,0]]
  ];
  for(let i=0;i<count;i++){
    const seg=skeleton[i%skeleton.length],u=((i*37)%101)/100,j=i*3;
    base[j]=lerp(seg[0][0],seg[1][0],u)+(Math.sin(i*2.17)*.035);
    base[j+1]=lerp(seg[0][1],seg[1][1],u)+(Math.cos(i*1.31)*.035);
    base[j+2]=lerp(seg[0][2],seg[1][2],u)+(Math.sin(i*.73)*.05);
    const v=new THREE.Vector3(base[j],base[j+1]-.15,base[j+2]).normalize();
    dir[j]=v.x+Math.sin(i*1.7)*.7;dir[j+1]=v.y+Math.cos(i*.9)*.5;dir[j+2]=v.z+Math.sin(i*2.4)*1.1;phase[i]=(i%97)/97;
    pos[j]=base[j];pos[j+1]=base[j+1];pos[j+2]=base[j+2];
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const material=new THREE.PointsMaterial({color:0xd9ffff,size:mobile?.05:.04,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,sizeAttenuation:true});
  const points=new THREE.Points(geo,material);points.frustumCulled=false;rig.root.add(points);
  return {points,geo,material,pos,base,dir,phase,count};
}

waitForGame().then(game=>{
  const install=()=>{
    const rig=game.world.humanRig;
    if(!rig){requestAnimationFrame(install);return;}

    if(window.__rezReferencePass?.pilot?.root)window.__rezReferencePass.pilot.root.visible=false;
    if(window.__cinematicEvolution?.pilot?.root)window.__cinematicEvolution.pilot.root.visible=false;

    const layers=[makeFormLayer(rig,'block',0),makeFormLayer(rig,'facet',1),makeFormLayer(rig,'signal',2),makeAscendedLayer(rig)];
    const field=makeTransformField(rig);
    let lastEvolution=game.evolution||1,transformAge=99,transformPower=0;

    const trigger=(evolution,announce=true)=>{
      lastEvolution=evolution;transformAge=0;transformPower=1;
      game.world.triggerDisintegrate?.(1.1);
      const stage=Math.min(3,Math.floor(((clamp(evolution,1,6)-1)/5)*3+.35));
      if(announce)game.showCallout?.(`FORM SHIFT // ${FORM_NAMES[stage]}`,.98);
      game.audio.energy=Math.max(game.audio.energy,.5);
      game.world.pulse?.(.95);
    };

    const baseUpdate=game.world.update.bind(game.world);
    game.world.update=(dt,t,energy,sync=0)=>{
      baseUpdate(dt,t,energy,sync);
      if(game.evolution!==lastEvolution)trigger(game.evolution,true);
      transformAge+=dt;
      const worldShift=window.__worldMetamorphosis?.transition||0;
      const cinematic=Math.max(transformPower,worldShift*.7);
      transformPower=lerp(transformPower,0,1-Math.pow(.0015,dt));

      const form=(clamp(game.evolution||1,1,6)-1)/5*3;
      layers.forEach((layer,i)=>{
        const d=Math.abs(form-i),weight=clamp(1-d,0,1),pulse=.92+Math.max(0,Math.sin(t*6.4+i*.9))*.08;
        layer.visible=weight>.015||cinematic>.2;
        (layer.userData.materials||[]).forEach((m,mi)=>{
          const base=m.userData.baseOpacity??m.userData.targetOpacity??.55;
          m.opacity=base*weight*(.72+sync*.18+energy*.14)*(1-cinematic*.28)+cinematic*.08;
        });
        layer.scale.setScalar((.94+weight*.06)*pulse*(1+cinematic*.045));
        if(layer.userData.torso)layer.userData.torso.rotation.y=Math.sin(t*.65+i)*.035*weight;
        (layer.userData.halos||[]).forEach((h,hi)=>{h.rotation.z+=dt*(hi?-.9:1.15)*(1+sync);});
        (layer.userData.crowns||[]).forEach((c,ci)=>{c.rotation.z+=dt*(.8+ci*.035+sync*.6);c.rotation.y+=dt*.22;});
        (layer.userData.spine||[]).forEach((s,si)=>{s.rotation.y+=dt*(.5+si*.04);s.scale.setScalar(.8+Math.max(0,Math.sin(t*7+si*.55))*.5);});
      });

      const age=transformAge,attack=clamp(age/.22,0,1),release=age<.34?1:clamp(1-(age-.34)/.88,0,1),burst=release;
      const arr=field.pos;
      for(let i=0;i<field.count;i++){
        const j=i*3,p=field.phase[i],swirl=burst*(.55+.45*Math.sin(p*TAU+t*3.2)),distance=burst*(.35+attack*1.5+worldShift*.8);
        arr[j]=field.base[j]+field.dir[j]*distance+Math.cos(p*TAU*5+t*5)*.08*swirl;
        arr[j+1]=field.base[j+1]+field.dir[j+1]*distance+Math.sin(p*TAU*4+t*4)*.1*swirl;
        arr[j+2]=field.base[j+2]+field.dir[j+2]*distance-Math.sin(p*TAU+t*6)*.22*burst;
      }
      field.geo.attributes.position.needsUpdate=true;
      field.material.opacity=Math.max(burst*.88,worldShift*.28)*(innerWidth<760?.8:1);
      field.material.size=(innerWidth<760?.05:.04)+burst*.055+sync*.015;
      field.material.color.setHSL((.48+form*.055+t*.012)%1,.95,.72);

      if(cinematic>.04){
        rig.root.rotation.y+=Math.sin(t*18)*cinematic*.0018;
        rig.root.scale.setScalar(.94+cinematic*.08+Math.sin(t*11)*cinematic*.018);
      }
    };

    trigger(lastEvolution,false);
    window.__pilotTransformation={layers,field,trigger,get form(){return (clamp(game.evolution||1,1,6)-1)/5*3;}};
  };
  install();
});
