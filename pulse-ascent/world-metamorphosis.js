import * as THREE from 'three';

const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=THREE.MathUtils.lerp;
const waitForGame=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});

const palettes=[
  [new THREE.Color(0xff5d26),new THREE.Color(0x3e5dff),new THREE.Color(0xffd06a)],
  [new THREE.Color(0x60f7ff),new THREE.Color(0xff55d8),new THREE.Color(0xffffff)],
  [new THREE.Color(0x8d6bff),new THREE.Color(0x48ffd3),new THREE.Color(0xff6ebc)],
  [new THREE.Color(0x7dff9f),new THREE.Color(0xff7fe9),new THREE.Color(0x5ff3ff)],
  [new THREE.Color(0xe8fbff),new THREE.Color(0x6f89ff),new THREE.Color(0xff6dcc)]
];

function makeCircuitMaterial(side){
  return new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
    uniforms:{uTime:{value:0},uEnergy:{value:0},uTransition:{value:0},uColorA:{value:palettes[0][0].clone()},uColorB:{value:palettes[0][1].clone()},uColorC:{value:palettes[0][2].clone()},uSide:{value:side}},
    vertexShader:`
      varying vec2 vUv;
      varying float vDepth;
      uniform float uTransition;
      void main(){
        vUv=uv;
        vec3 p=position;
        float fold=sin((uv.y*8.0+uv.x*3.0)*3.14159)*uTransition;
        p.z+=fold*0.7;
        p.x+=sin(uv.y*18.0+uTransition*6.0)*uTransition*0.22;
        vec4 mv=modelViewMatrix*vec4(p,1.0);
        vDepth=clamp((-mv.z-4.0)/140.0,0.0,1.0);
        gl_Position=projectionMatrix*mv;
      }`,
    fragmentShader:`
      precision highp float;
      varying vec2 vUv;
      varying float vDepth;
      uniform float uTime;
      uniform float uEnergy;
      uniform float uTransition;
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      uniform vec3 uColorC;
      uniform float uSide;
      float line(float d,float w){return 1.0-smoothstep(w,w+0.012,d);}
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      void main(){
        vec2 uv=vUv;
        vec2 g=fract(uv*vec2(18.0,42.0));
        vec2 id=floor(uv*vec2(18.0,42.0));
        float h=hash(id);
        float trace=0.0;
        if(h>.36){
          trace=max(trace,line(abs(g.y-.5),.035));
          if(h>.58)trace=max(trace,line(abs(g.x-.5),.035)*step(.22,g.y));
          if(h>.77)trace=max(trace,line(abs(g.y-.22),.025)*step(.45,g.x));
        }
        float pad=step(.78,h)*step(length(g-.5),.16);
        float sweep=pow(max(0.0,1.0-abs(fract(uv.y*5.0-uTime*(.22+uEnergy*.18)+h)-.5)*8.0),5.0);
        float packet=trace*sweep;
        float grid=(line(min(g.x,1.0-g.x),.018)+line(min(g.y,1.0-g.y),.012))*.12;
        vec3 col=mix(uColorA,uColorB,clamp(uv.y*.7+uv.x*.25,0.0,1.0));
        col=mix(col,uColorC,packet*.9+pad*.35);
        float alpha=(trace*.28+grid+pad*.18+packet*(.65+uEnergy*.4))*(.45+vDepth*.55);
        alpha*=1.0+uTransition*.7;
        if(alpha<.018)discard;
        gl_FragColor=vec4(col,alpha);
      }`
  });
}

function buildCircuitCanyon(scene){
  const root=new THREE.Group();root.name='metamorph-circuit-canyon';scene.add(root);
  const walls=[];
  for(const side of [-1,1]){
    const mat=makeCircuitMaterial(side);
    const wall=new THREE.Mesh(new THREE.PlaneGeometry(34,190,1,1),mat);
    wall.rotation.x=-Math.PI/2;
    wall.rotation.z=side<0?Math.PI/2:-Math.PI/2;
    wall.position.set(side*12,1,-82);
    root.add(wall);walls.push(wall);
    for(let i=0;i<7;i++){
      const rib=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(.18,12,22)),new THREE.LineBasicMaterial({color:i%2?0xff6a2d:0x4867ff,transparent:true,opacity:.12,blending:THREE.AdditiveBlending,depthWrite:false}));
      rib.position.set(side*(10.4+(i%2)*2.2),-1,-18-i*24);root.add(rib);
    }
  }
  return {root,walls};
}

function buildReconstructionField(scene){
  const mobile=innerWidth<760,count=mobile?850:1450;
  const pos=new Float32Array(count*3),a=new Float32Array(count*3),b=new Float32Array(count*3),phase=new Float32Array(count);
  for(let i=0;i<count;i++){
    const j=i*3,side=i%2?-1:1,lane=(i%19)/18,z=-18-(i%73)*2.15;
    a[j]=side*(5.5+lane*8.5);a[j+1]=-5+(i%31)/30*13;a[j+2]=z;
    const ang=(i/count)*TAU*17+(i%11)*.13,rad=2.5+(i%37)/36*14;
    b[j]=Math.cos(ang)*rad;b[j+1]=Math.sin(ang*1.7)*rad*.58;b[j+2]=-22-(i%97)*1.45;
    pos[j]=a[j];pos[j+1]=a[j+1];pos[j+2]=a[j+2];phase[i]=(i%101)/101;
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const mat=new THREE.PointsMaterial({color:0xc6fbff,size:mobile?.055:.045,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,sizeAttenuation:true});
  const points=new THREE.Points(geo,mat);points.frustumCulled=false;scene.add(points);
  return {points,geo,mat,pos,a,b,phase,count};
}

function buildIris(scene){
  const root=new THREE.Group();root.name='metamorph-iris';root.position.z=-26;scene.add(root);
  const blades=[];
  for(let i=0;i<18;i++){
    const geo=new THREE.BoxGeometry(.08,4.7,.18),mat=new THREE.MeshBasicMaterial({color:i%3===0?0xffffff:i%2?0xff59d6:0x62f5ff,transparent:true,opacity:.0,blending:THREE.AdditiveBlending,depthWrite:false}),blade=new THREE.Mesh(geo,mat);
    const ang=i/18*TAU;blade.position.set(Math.cos(ang)*5.6,Math.sin(ang)*5.6,0);blade.rotation.z=ang;root.add(blade);blades.push(blade);
  }
  return {root,blades};
}

waitForGame().then(game=>{
  const install=()=>{
    const ref=window.__rezReferencePass;
    if(!ref){requestAnimationFrame(install);return;}
    const canyon=buildCircuitCanyon(game.scene),field=buildReconstructionField(game.scene),iris=buildIris(game.scene);
    let lastSection=game.section||0,transition=0,transitionAge=99;

    const applySection=(section,initial=false)=>{
      lastSection=section;transition=initial?0:1;transitionAge=0;
      const p=palettes[section%palettes.length];
      canyon.walls.forEach(w=>{w.material.uniforms.uColorA.value.copy(p[0]);w.material.uniforms.uColorB.value.copy(p[1]);w.material.uniforms.uColorC.value.copy(p[2]);});
      canyon.root.visible=section===0||section===4;
      if(ref.arch?.root)ref.arch.root.visible=section===0;
      const rez=window.__rezscape;
      if(rez?.city?.root)rez.city.root.visible=section===0;
      if(rez?.tunnel?.root)rez.tunnel.root.visible=section===1;
      if(rez?.veils?.root)rez.veils.root.visible=section===2||section===3;
      game.world.triggerDisintegrate?.(1.15);
      if(!initial)game.showCallout?.('WORLD RECOMPILE // '+String(section+1).padStart(2,'0'),.98);
    };
    applySection(lastSection,true);

    const baseUpdate=game.world.update.bind(game.world);
    game.world.update=(dt,t,energy,sync=0)=>{
      baseUpdate(dt,t,energy,sync);
      if(game.section!==lastSection)applySection(game.section,false);
      transitionAge+=dt;
      const attack=clamp(transitionAge/.34,0,1),hold=transitionAge<.58?1:clamp(1-(transitionAge-.58)/1.25,0,1);
      transition=hold;
      const reconstruct=transitionAge<.45?attack:clamp(1-(transitionAge-.45)/1.18,0,1);

      canyon.walls.forEach((w,i)=>{const u=w.material.uniforms;u.uTime.value=t+i*.2;u.uEnergy.value=clamp(energy+sync*.45,0,1);u.uTransition.value=transition;});

      const arr=field.pos;
      for(let i=0;i<field.count;i++){
        const j=i*3,p=field.phase[i],wave=Math.sin(t*5.2+p*TAU*3)*.18*transition;
        const k=reconstruct*reconstruct*(3-2*reconstruct);
        arr[j]=lerp(field.a[j],field.b[j],k)+wave;
        arr[j+1]=lerp(field.a[j+1],field.b[j+1],k)+Math.cos(t*4+p*12)*.12*transition;
        arr[j+2]=lerp(field.a[j+2],field.b[j+2],k)+Math.sin(t*3+p*9)*.2*transition;
      }
      field.geo.attributes.position.needsUpdate=true;
      field.mat.opacity=transition*(.35+energy*.42);
      field.mat.size=(innerWidth<760?.055:.045)+transition*.055;
      const pc=palettes[lastSection%palettes.length];field.mat.color.copy(pc[2]).lerp(pc[0],.35+.35*Math.sin(t*.7));

      iris.root.rotation.z+=dt*(.35+transition*2.2);
      iris.root.scale.setScalar(.72+transition*.72);
      iris.blades.forEach((b,i)=>{const stagger=clamp(transition*2.2-i/18*.65,0,1);b.material.opacity=stagger*(.18+energy*.34);b.scale.y=.55+stagger*1.35;b.rotation.z=i/18*TAU+transition*.7;});

      if(transition>.02){
        const pulse=Math.sin(clamp(transitionAge/.95,0,1)*Math.PI);
        game.camera.fov=lerp(game.camera.fov,66+9*pulse,dt*7);game.camera.updateProjectionMatrix();
        game.renderer.toneMappingExposure=1.05+transition*.75+energy*.12;
        if(game.bloom){game.bloom.strength=lerp(game.bloom.strength,1.15+transition*.65,dt*6);game.bloom.radius=lerp(game.bloom.radius,.5+transition*.22,dt*5);}
        game.scene.fog.density=lerp(game.scene.fog.density,.008+transition*.006,dt*6);
      }
    };
    window.__worldMetamorphosis={canyon,field,iris,get transition(){return transition;},trigger:()=>applySection(lastSection,false)};
  };
  install();
});
