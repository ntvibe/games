import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {applyAreaVariant} from './enemy-area-variants.js';
import './boss-damage-staging.js';
import './boss-failure-animation.js';
import './enemy-motion-rigs.js';

const ROOT='./assets/models/cc0/';
const FILES={machine:'factory-machine.glb',pipe:'factory-pipe.glb',conveyor:'factory-conveyor.glb',tank:'factory-tank.glb',rifle:'blaster-rifle.glb',crate:'blaster-crate.glb'};
const AREA_COLORS=[[0x49efff,0xff5dcc],[0xffa247,0x5bd6ff],[0x6dffe0,0xff65cf],[0xa1ff70,0x6dccff],[0xffffff,0x7c8cff]];
const TYPE_SCALE={drone:.64,tank:1.04,node:.78,prism:.8,sentinel:.92};
const mobile=()=>innerWidth<760||matchMedia('(pointer: coarse)').matches;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent&&window.__pulseEnemyArtDirection?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});

function normalize(root,size=1){
  root.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(root),dim=box.getSize(new THREE.Vector3()),max=Math.max(dim.x,dim.y,dim.z,1e-4);
  root.scale.multiplyScalar(size/max);root.updateMatrixWorld(true);
  const center=new THREE.Box3().setFromObject(root).getCenter(new THREE.Vector3());root.position.sub(center);
  return root;
}

function finishTemplate(src,key){
  const root=src.clone(true);root.name=`fusion-template-${key}`;
  root.traverse(node=>{
    if(!node.isMesh)return;
    node.material=new THREE.MeshStandardMaterial({color:0x070b10,emissive:0x101820,emissiveIntensity:.08,metalness:.82,roughness:.34,flatShading:true,transparent:true,opacity:.82,depthWrite:true,blending:THREE.NormalBlending});
    node.castShadow=false;node.receiveShadow=false;
    if(node.geometry){
      const edge=new THREE.LineSegments(new THREE.EdgesGeometry(node.geometry,31),new THREE.LineBasicMaterial({color:0xb9f9ff,transparent:true,opacity:.22,depthWrite:false,blending:THREE.NormalBlending}));
      edge.name='fusion-edge';edge.renderOrder=2;node.add(edge);
    }
  });
  return normalize(root,1);
}

function cloneTinted(template,primary,secondary,size=1){
  const obj=template.clone(true);obj.name='rez-volume-model';obj.scale.multiplyScalar(size);let meshIndex=0;
  obj.traverse(node=>{
    if(node.isMesh){
      const mat=node.material.clone();mat.color.set(0x05080d);mat.emissive.set(meshIndex%2?secondary:primary);mat.emissiveIntensity=.06;mat.opacity=.76;node.material=mat;meshIndex++;
    }else if(node.isLineSegments&&node.name==='fusion-edge'){
      const mat=node.material.clone();mat.color.set(meshIndex%2?secondary:primary);mat.opacity=.24;node.material=mat;
    }
  });
  return obj;
}

function assembleType(type,templates,primary,secondary,areaIndex=0){
  const root=new THREE.Group();root.name='fusion-enemy-model';
  const add=(key,size,pos=[0,0,0],rot=[0,0,0])=>{const t=templates.get(key);if(!t)return;const o=cloneTinted(t,primary,secondary,size);o.position.set(...pos);o.rotation.set(...rot);root.add(o);};
  if(type==='tank'){
    add('tank',1.05);add('pipe',.72,[0,.22,-.28],[0,Math.PI/2,Math.PI/2]);add('crate',.5,[0,-.2,.34],[0,Math.PI/4,0]);
  }else if(type==='node'){
    add('crate',.78);add('pipe',.58,[.34,0,0],[0,0,Math.PI/2]);add('pipe',.58,[-.34,0,0],[0,0,-Math.PI/2]);
  }else if(type==='prism'){
    add('machine',.78,[0,0,.05],[0,Math.PI/4,0]);add('rifle',.48,[.34,.08,-.12],[0,.18,.48]);add('rifle',.48,[-.34,.08,-.12],[0,-.18,-.48]);
  }else if(type==='sentinel'){
    add('machine',.92);add('rifle',.58,[.5,0,-.06],[0,.16,.65]);add('rifle',.58,[-.5,0,-.06],[0,-.16,-.65]);add('pipe',.46,[0,.36,.12],[Math.PI/2,0,0]);
  }else{
    add('crate',.55,[0,0,.05],[0,Math.PI/4,0]);add('rifle',.42,[.28,0,-.08],[0,.18,.55]);add('rifle',.42,[-.28,0,-.08],[0,-.18,-.55]);
  }
  applyAreaVariant(root,type,areaIndex);
  normalize(root,TYPE_SCALE[type]||TYPE_SCALE.drone);return root;
}

function addBossShell(boss,templates,primary,secondary){
  const root=new THREE.Group();root.name='fusion-boss-model';boss.group.add(root);
  const keys=['machine','tank','pipe','machine','tank','pipe','machine','tank'],count=mobile()?6:8;
  for(let i=0;i<count;i++){
    const t=templates.get(keys[i]);if(!t)continue;
    const a=i/count*Math.PI*2,o=cloneTinted(t,primary,secondary,.72+(i%3)*.08);
    o.position.set(Math.cos(a)*2.25,Math.sin(a)*1.55,i%2?-.28:.28);o.rotation.set(a*.16,-a,a+Math.PI/2);o.userData.baseAngle=a;root.add(o);
  }
  boss.__fusionModel=root;return root;
}

waitFor().then(async game=>{
  if(game.__modelFusionInstalled)return;game.__modelFusionInstalled=true;
  const loader=new GLTFLoader(),templates=new Map(),errors=[];
  await Promise.all(Object.entries(FILES).map(async([key,file])=>{
    try{const gltf=await loader.loadAsync(ROOT+file);templates.set(key,finishTemplate(gltf.scene,key));}
    catch(err){errors.push(`${key}: ${err?.message||err}`);}
  }));

  let styled=0,lastBoss=null,bossShell=null;
  const area=()=>clamp((window.__pulseCampaign?.state?.selected||1)-1,0,4);
  const shouldStyle=enemy=>{
    if(!enemy||enemy.dead||enemy.type==='danger'||enemy.type==='rupture'||enemy.__fusionModel)return false;
    if(!mobile())return true;
    if(enemy.type==='tank'||enemy.type==='sentinel'||enemy.type==='node'||enemy.type==='prism')return true;
    return styled%2===0;
  };
  const styleEnemy=enemy=>{
    if(!shouldStyle(enemy)||templates.size<3)return enemy;
    const areaIndex=area(),[primary,secondary]=AREA_COLORS[areaIndex]||AREA_COLORS[0],model=assembleType(enemy.type,templates,primary,secondary,areaIndex);
    model.rotation.set(.08,-.12,0);model.scale.setScalar(.08);enemy.group.add(model);enemy.__fusionModel=model;enemy.__fusionVariant=model.userData.areaVariant;styled++;
    if(enemy.mesh?.material){enemy.mesh.material.opacity=.025;enemy.mesh.material.depthWrite=false;}
    if(enemy.halo?.material)enemy.halo.material.opacity=Math.min(enemy.halo.material.opacity,.05);
    const baseUpdate=enemy.update?.bind(enemy);
    if(baseUpdate)enemy.update=(dt,t)=>{
      baseUpdate(dt,t);if(enemy.dead||!enemy.__fusionModel)return;
      const m=enemy.__fusionModel,age=Math.max(0,enemy.age||0),appear=1-Math.exp(-age*5.5),beat=game.audio?.beatDur?((game.audio.ctx?.currentTime||t)/game.audio.beatDur)%1:0,pulse=Math.pow(Math.max(0,Math.cos(beat*Math.PI*2)),12);
      m.scale.setScalar(.08+appear*.92);
      m.rotation.y+=dt*(.12+(enemy.type==='sentinel' ? .16 : .04));
      m.rotation.z=Math.sin(t*.7+(enemy.phase||0))*.05;
      m.traverse(n=>{
        if(n.isMesh&&n.material)n.material.emissiveIntensity=(enemy.locked ? .16 : .05)+pulse*.025;
        else if(n.isLineSegments&&n.name==='fusion-edge')n.material.opacity=enemy.locked ? .5 : .2+pulse*.04;
      });
    };
    return enemy;
  };

  const baseSpawn=game.spawnEnemy.bind(game);
  game.spawnEnemy=(type,pos,phase=0)=>{
    const before=game.enemies.length,result=baseSpawn(type,pos,phase),enemy=result||game.enemies[before]||game.enemies.at(-1);styleEnemy(enemy);return result||enemy;
  };
  for(const enemy of game.enemies)styleEnemy(enemy);

  const tick=()=>{
    for(const enemy of game.enemies)styleEnemy(enemy);
    const boss=game.boss;
    if(boss&&boss!==lastBoss){lastBoss=boss;const [primary,secondary]=AREA_COLORS[area()]||AREA_COLORS[0];bossShell=addBossShell(boss,templates,primary,secondary);}
    if(!boss&&lastBoss){lastBoss=null;bossShell=null;}
    if(bossShell&&boss&&!boss.dead){
      const phase=Math.max(1,boss.phase||1),t=game.time||0;
      bossShell.children.forEach((o,i)=>{
        const a=o.userData.baseAngle??i/Math.max(1,bossShell.children.length)*Math.PI*2,open=.06+(phase-1)*.16;
        o.position.x=Math.cos(a)*(2.2+open)+Math.sin(t*.7+i)*.08;o.position.y=Math.sin(a)*(1.5+open*.65)+Math.cos(t*.6+i)*.05;
        o.rotation.y+=.003*phase;o.rotation.z+=.0015*(i%2?1:-1);
      });
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  window.__pulseModelFusion={
    get ready(){return templates.size>=3;},errors,templates:[...templates.keys()],styleEnemy,
    stats:()=>{
      const active=game.enemies.filter(e=>e.__fusionModel&&!e.dead),variants={};active.forEach(e=>{const key=e.__fusionVariant||'UNSET';variants[key]=(variants[key]||0)+1;});
      return{ready:templates.size>=3,templates:templates.size,styled:active.length,boss:!!bossShell,mobile:mobile(),variants};
    }
  };
});
