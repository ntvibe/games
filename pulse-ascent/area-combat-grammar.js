import * as THREE from 'three';

const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=THREE.MathUtils.lerp;
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent&&window.__pulseCampaign&&window.__pulseAreaPhaseTransitions?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});

const GRAMMARS=[
  ['GRID TRAFFIC','STEP LANES','VECTOR PAIRS','ASCENT CONVERGENCE'],
  ['TEMPLE ENTRY','PRISM PROCESSION','MIRROR PAIRS','ARCHON HELIX'],
  ['COLOR DRIFT','TIDAL LATTICE','ABYSS ORBITS','BLOOM CURRENT'],
  ['GERMINATION','SYNAPSE FORKS','BRANCH MAZE','ROOT CONVERGENCE'],
  ['CHOIR ENTRY','RHYTHM COLUMNS','ROSE ORBITS','SERAPH CHORDS']
];

waitFor().then(game=>{
  if(game.__areaCombatGrammarInstalled)return;
  game.__areaCombatGrammarInstalled=true;

  let serial=0,promotions=0;
  const selectedArea=()=>clamp((window.__pulseCampaign?.state?.selected||1)-1,0,4);
  const phase=()=>clamp(game.section||0,0,3);
  const suppressed=()=>!!window.__pulseOnboarding?.state?.active||!!window.__pulseDirectAscent?.state?.active||!!game.boss;
  const grammarName=()=>GRAMMARS[selectedArea()]?.[phase()]||'SIGNAL';

  function maybePromote(type){
    if(type!=='drone'||suppressed()||(game.bar||0)<16)return type;
    const a=selectedArea(),p=phase(),n=serial+1;
    if(p<1)return type;
    const cadence=[9,8,7,7,6][a]-Math.min(2,p-1);
    if(n%cadence!==0)return type;
    promotions++;
    if(a===0)return p>=3?'tank':p===2?'sentinel':'prism';
    if(a===1)return p>=2?(n%2?'sentinel':'prism'):'prism';
    if(a===2)return p>=3?'sentinel':p===2?'prism':'node';
    if(a===3)return p>=3?'tank':p===2?'sentinel':'node';
    return p>=3?'sentinel':p===2?'node':'prism';
  }

  function bind(enemy){
    if(!enemy||enemy.dead||enemy.type==='danger'||enemy.type==='rupture'||enemy.__areaCombatGrammar)return enemy;
    enemy.__areaCombatGrammar=true;
    const id=serial++,seed=((id*0.61803398875)%1),sign=id%2?1:-1,group=id%4;
    enemy.userAreaGrammar={id,seed,sign,group};
    const baseUpdate=enemy.update?.bind(enemy);if(!baseUpdate)return enemy;
    enemy.update=(dt,t)=>{
      baseUpdate(dt,t);if(enemy.dead||suppressed())return;
      const a=selectedArea(),p=phase(),g=enemy.userAreaGrammar;
      const beatDur=game.audio?.beatDur||.46875,clock=game.audio?.ctx?.currentTime??t,beat=((clock/beatDur)%1+1)%1;
      const pulse=Math.pow(Math.max(0,Math.cos(beat*TAU)),10),phrase=Math.floor(clock/(beatDur*4));
      const x=enemy.group.position.x,y=enemy.group.position.y;

      if(a===0){
        if(p===1){
          // SIGNAL BLOOM: PCB traffic snaps between readable orthogonal lanes.
          const step=(phrase+g.group)%4,off=step===1?.72:step===3?-.72:0;
          enemy.group.position.x=lerp(x,clamp(enemy.baseX+off,-8.4,8.4),clamp(dt*5,0,1));
          enemy.group.position.y+=((step===2?1:0)-(step===0?.5:0))*.16;
        }else if(p===2){
          // VECTOR TEMPLE: paired diagonals create deliberate cross-field lock sweeps.
          enemy.group.position.x+=g.sign*Math.sin(t*.82+g.seed*TAU)*.64;
          enemy.group.position.y+=g.sign*Math.cos(t*.82+g.seed*TAU)*.34;
          enemy.group.rotation.z=g.sign*.16*Math.sin(t*.6);
        }else if(p===3){
          // ASCENSION: formations repeatedly converge on center, then breathe back out on the beat.
          enemy.group.position.x=lerp(x,x*(.76+pulse*.18),clamp(dt*3.2,0,1));
          enemy.group.position.y=lerp(y,y*(.88+pulse*.08),clamp(dt*2.5,0,1));
        }
      }else if(a===1){
        if(p===1){
          // REFRACTION CLOISTER: stately arched procession.
          enemy.group.position.y+=Math.abs(Math.sin(t*.72+g.seed*TAU))*.42-.15;
          enemy.group.rotation.z=g.sign*.1;
        }else if(p===2){
          // MIRROR SANCTUM: enemies resolve into left/right mirrored pairs.
          const radius=clamp(Math.abs(x),1.6,7.2),shared=Math.sin(t*.66+g.group*.8)*.52;
          enemy.group.position.x=lerp(x,g.sign*radius,clamp(dt*4.2,0,1));
          enemy.group.position.y+=shared*.22;
          enemy.group.rotation.z=g.sign*(.08+pulse*.06);
        }else if(p===3){
          // ARCHON ASCENT: shallow helix motion raises the lock path through the temple.
          const ang=t*.48+g.seed*TAU;
          enemy.group.position.x+=Math.cos(ang)*.48;enemy.group.position.y+=Math.sin(ang)*.42;
          enemy.group.rotation.z+=dt*g.sign*.32;
        }
      }else if(a===2){
        if(p===1){
          // TIDAL LATTICE: the whole formation rides one coherent current.
          const wave=Math.sin(t*.62+g.group*.55);
          enemy.group.position.x+=wave*.52;enemy.group.position.y+=Math.cos(t*.48+g.group*.55)*.34;
        }else if(p===2){
          // COLOR ABYSS: targets orbit around local centers, encouraging circular aim movement.
          const ang=t*(.5+g.group*.035)+g.seed*TAU,r=.42+g.group*.08;
          enemy.group.position.x+=Math.cos(ang)*r;enemy.group.position.y+=Math.sin(ang)*r*.8;
          enemy.group.rotation.z=ang*.18;
        }else if(p===3){
          // BLOOM CURRENT: synchronized outward/inward breathing creates wave-like target bands.
          const swell=.82+pulse*.3+Math.sin(t*.55+g.seed*TAU)*.08;
          enemy.group.position.x*=swell;enemy.group.position.y*=.94+pulse*.1;
        }
      }else if(a===3){
        if(p===1){
          // SYNAPSE GROVE: branches peel away in opposite directions then rejoin.
          const branch=Math.sin(t*.74+g.seed*TAU)>0?1:-1;
          enemy.group.position.x+=g.sign*branch*.5;enemy.group.position.y+=Math.sin(t*1.2+g.seed*TAU)*.24;
        }else if(p===2){
          // BRANCH MAZE: phrase-quantized forks produce readable route changes.
          const fork=((phrase+g.group)%3)-1;
          enemy.group.position.x=lerp(x,clamp(enemy.baseX+fork*1.05,-8,8),clamp(dt*3.6,0,1));
          enemy.group.position.y+=g.sign*fork*.18;
        }else if(p===3){
          // ORACLE ROOT: enemies root toward a shared central trunk before spreading again.
          const root=.68+pulse*.28;
          enemy.group.position.x=lerp(x,x*root,clamp(dt*2.8,0,1));
          enemy.group.position.y+=Math.sin(t*.42+g.group)*.28;
        }
      }else{
        if(p===1){
          // CHOIR VAULT: four rhythmic columns move as chord voices, not independent targets.
          const voice=g.group-1.5,columnBeat=Math.floor(clock/beatDur+g.group)%4;
          enemy.group.position.x=lerp(x,clamp(voice*2.25,-7,7),clamp(dt*3,0,1));
          enemy.group.position.y+=columnBeat===0?.42:-.06;
        }else if(p===2){
          // ROSE WINDOW: radial target motion makes the formation read like a rotating window.
          const ang=t*.38+g.group*TAU/4+g.seed*.4,r=1.1+g.group*.14;
          enemy.group.position.x+=Math.cos(ang)*r*.42;enemy.group.position.y+=Math.sin(ang)*r*.42;
          enemy.group.rotation.z=ang*.24;
        }else if(p===3){
          // SERAPH NAVE: chord groups pulse vertically together on quarter notes.
          const quarter=Math.floor(beat*4),voice=(g.group-1.5)*.28;
          enemy.group.position.y+=voice+(quarter===g.group?pulse*.62:0);
          enemy.group.position.x=lerp(x,clamp(x*.86+g.sign*.34,-8,8),clamp(dt*2.6,0,1));
        }
      }

      // Keep the grammar readable and prevent stacked motion systems from pushing targets off-screen.
      enemy.group.position.x=clamp(enemy.group.position.x,-8.7,8.7);
      enemy.group.position.y=clamp(enemy.group.position.y,-4.7,5.1);
      if(enemy.core?.scale){const s=1+pulse*(.05+p*.018);enemy.core.scale.multiplyScalar(s);}
    };
    return enemy;
  }

  const baseSpawn=game.spawnEnemy.bind(game);
  game.spawnEnemy=(type,pos,enemyPhase=0)=>{
    const promoted=maybePromote(type),before=game.enemies.length,result=baseSpawn(promoted,pos,enemyPhase);
    const enemy=result||game.enemies[before]||game.enemies.at(-1);bind(enemy);return result||enemy;
  };
  for(const enemy of game.enemies)bind(enemy);

  window.__pulseAreaCombatGrammar={
    grammars:GRAMMARS,
    bind,
    get area(){return selectedArea()+1;},
    get phase(){return phase()+1;},
    get name(){return grammarName();},
    stats:()=>({area:selectedArea()+1,phase:phase()+1,name:grammarName(),bound:game.enemies.filter(e=>e.__areaCombatGrammar&&!e.dead).length,promotions})
  };
});
