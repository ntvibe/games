import * as THREE from 'three';
import {clamp,TAU} from './util.js';

const waitFor=(getter)=>new Promise(resolve=>{const tick=()=>{const value=getter();value?resolve(value):requestAnimationFrame(tick)};tick()});

function addSafeWindow(game,x,y,label='PHASE WINDOW'){
  const group=new THREE.Group();
  const ringMat=new THREE.MeshBasicMaterial({color:0x67f6ff,transparent:true,opacity:.42,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:false});
  const ring=new THREE.Mesh(new THREE.RingGeometry(.42,.5,18),ringMat);ring.position.set(x,y,3.52);ring.renderOrder=6;group.add(ring);
  const crossGeo=new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(x-.7,y,3.51),new THREE.Vector3(x+.7,y,3.51),
    new THREE.Vector3(x,y-.7,3.51),new THREE.Vector3(x,y+.7,3.51)
  ]);
  const crossMat=new THREE.LineBasicMaterial({color:0x67f6ff,transparent:true,opacity:.2,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:false});
  const cross=new THREE.LineSegments(crossGeo,crossMat);cross.renderOrder=6;group.add(cross);game.scene.add(group);
  const born=game.time||0,duration=1.35;
  const tick=()=>{
    const t=(game.time||0)-born,u=clamp(t/duration,0,1),pulse=.5+.5*Math.sin((game.time||0)*128/60*TAU);
    ring.scale.setScalar(1+u*.5+pulse*.08);ring.rotation.z+=.035;ringMat.opacity=(1-u)*(.28+pulse*.22);crossMat.opacity=(1-u)*(.1+pulse*.12);
    if(u>=1){game.scene.remove(group);ring.geometry.dispose();ringMat.dispose();crossGeo.dispose();crossMat.dispose();return;}
    requestAnimationFrame(tick);
  };tick();
  game.showCallout(label,.9);
}

async function init(){
  const game=await waitFor(()=>window.__pulseAscent),director=await waitFor(()=>window.__pulseDirector),dodge=await waitFor(()=>window.__pulseDodge);
  if(game.__bossDirectorInstalled)return;game.__bossDirectorInstalled=true;
  const state={patchedBoss:null,sequences:0,lastPattern:'',spawned:0,phase:0,gapSide:1};

  const spawn=(cfg)=>{const e=director.spawnThreat(game,cfg);if(e){e.directorTag=`boss:${cfg.tag||'pattern'}`;state.spawned++;}return e};

  const twinCut=(boss,step)=>{
    const a=game.world.avatar.position,side=(state.sequences%2?1:-1);state.gapSide=side;
    const gapX=a.x+side*2.35,gapY=a.y;
    spawn({x:-7,y:a.y+1.6,z:-36,targetX:a.x-side*.35,targetY:a.y+.55,phase:boss.phase,accent:0xff315f,tag:'twin-cut'});
    spawn({x:7,y:a.y-1.5,z:-42,targetX:a.x-side*.55,targetY:a.y-.45,phase:boss.phase,accent:0xff537d,tag:'twin-cut'});
    addSafeWindow(game,gapX,gapY,'BOSS CUT // DASH TO CYAN');game.audio.dangerWarning?.();state.lastPattern='TWIN CUT';
  };

  const shiftGate=(boss,step)=>{
    const a=game.world.avatar.position,side=(state.sequences%2?1:-1),gapX=a.x+side*2.6,gapY=a.y+(step%16===12?.7:-.6);state.gapSide=side;
    const lanes=[-3.9,-1.3,1.3,3.9];
    lanes.forEach((lane,i)=>{
      const targetX=a.x+lane;
      if(Math.abs(targetX-gapX)<1.25)return;
      spawn({x:lane*1.45,y:a.y+(i-1.5)*1.05,z:-35-i*4.8,targetX,targetY:a.y+(i%2?.65:-.65),phase:boss.phase,accent:i%2?0xff315f:0xff6a88,tag:'shift-gate'});
    });
    addSafeWindow(game,gapX,gapY,'SHIFT GATE // FIND THE GAP');game.audio.dangerWarning?.();state.lastPattern='SHIFT GATE';
  };

  const resonanceWall=(boss,step)=>{
    const a=game.world.avatar.position,quadrant=(state.sequences%4),dirs=[[1,0],[0,1],[-1,0],[0,-1]],gap=dirs[quadrant],gapX=a.x+gap[0]*2.55,gapY=a.y+gap[1]*1.75;
    const impact=[[0,0],[2.7,0],[-2.7,0],[0,1.9],[0,-1.9]];
    impact.forEach(([ox,oy],i)=>{
      if(Math.hypot((a.x+ox)-gapX,(a.y+oy)-gapY)<1.35)return;
      const angle=i/impact.length*TAU+step*.09,r=7.4;
      spawn({x:Math.cos(angle)*r,y:a.y+Math.sin(angle)*3.3,z:-38-i*3.8,targetX:a.x+ox,targetY:a.y+oy,phase:boss.phase,accent:i===0?0xff315f:0xff5e82,tag:'resonance-wall'});
    });
    addSafeWindow(game,gapX,gapY,'FINAL RESONANCE // PHASE GAP');game.audio.dangerWarning?.();state.lastPattern='RESONANCE WALL';
  };

  const patchBoss=(boss)=>{
    if(!boss||boss.__choreographyInstalled)return;boss.__choreographyInstalled=true;state.patchedBoss=boss;state.phase=boss.phase;
    const baseBeat=boss.beat.bind(boss);
    boss.beat=(step)=>{
      if(boss.dead)return;const originalSpawnDanger=boss.spawnDanger;
      boss.spawnDanger=()=>{};
      try{baseBeat(step);}finally{boss.spawnDanger=originalSpawnDanger;}
      const s=step%16;
      if(boss.phase===1&&s===8){state.sequences++;twinCut(boss,s);}
      else if(boss.phase===2&&(s===4||s===12)){state.sequences++;shiftGate(boss,s);}
      else if(boss.phase===3&&(s===0||s===8)){state.sequences++;resonanceWall(boss,s);}
    };
    game.showCallout('CONVERGENCE // READ THE CYAN GAP',.92);
  };

  const baseBossPhase=game.onBossPhase.bind(game);
  game.onBossPhase=(phase)=>{
    baseBossPhase(phase);state.phase=phase;state.sequences++;
    const a=game.world.avatar.position;
    addSafeWindow(game,a.x+(phase===2?-2.2:2.2),a.y,phase===3?'FINAL PHASE // WATCH THE GAP':'PHASE SHIFT // NEW PATTERN');
  };

  const tick=()=>{
    if(game.boss&&!game.boss.dead&&game.boss!==state.patchedBoss)patchBoss(game.boss);
    requestAnimationFrame(tick);
  };tick();

  window.__pulseBossDirector={state,patchBoss,patterns:{twinCut,shiftGate,resonanceWall},stats:()=>({sequences:state.sequences,lastPattern:state.lastPattern,spawned:state.spawned,phase:state.phase,patched:!!state.patchedBoss,dashReady:dodge.stats().ready})};
}

init();
