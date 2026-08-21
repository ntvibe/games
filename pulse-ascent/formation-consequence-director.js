import * as THREE from 'three';
import './formation-combat-state.js';
import './formation-weapon-scar-visual.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mobile=()=>innerWidth<760||innerHeight<520||matchMedia('(pointer: coarse)').matches;
const reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent&&window.__pulseFormationReveal?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});
const HERO_SCORE={node:5,sentinel:4,tank:3,prism:2,drone:1};
const REACTIONS=['BUS REROUTE','MIRROR INVERT','ORBIT SCATTER','BRANCH SPLIT','CHORD REVOICE'];
const SCAR_LABEL={lance:'COMMAND BREACH',swarm:'VOICE FRACTURE',lock:'SYNC COLLAPSE'};

waitFor().then(game=>{
  if(game.__formationConsequenceInstalled)return;game.__formationConsequenceInstalled=true;
  const state={breaks:0,perfectBreaks:0,commandBreaks:0,commandBonus:0,exposureBreaks:0,exposureBonus:0,weaponScars:0,regroups:0,lastReaction:'',lastScar:'',pending:new Map(),shock:new Map(),formationBreaks:new Map()};
  const comfort=()=>!!window.__pulseSettings?.state?.comfort||reducedMotion(),direct=()=>!!window.__pulseDirectAscent?.state?.active,areaNow=()=>clamp((window.__pulseCampaign?.state?.selected||1)-1,0,4),liveMembers=id=>(game.enemies||[]).filter(e=>!e.dead&&e.__formationId===id&&e.group);
  function scoreLeader(enemy){const hero=(enemy.elite?6:0)+(HERO_SCORE[enemy.type]||0),x=Math.abs(enemy.group?.position?.x||0);return hero*10+(1-clamp(x/10,0,1));}
  function musicalResponse(a,perfect=false){const audio=game.audio,t=audio?.ctx?.currentTime;if(t===undefined||!audio?.osc)return;const root=(audio.rootMidi||43)+[24,29,31,27,36][a],notes=[[0,7,12],[0,5,12],[0,3,10],[0,5,9],[0,6,10]][a],type=['square','sine','triangle','sawtooth','triangle'][a],gain=perfect?.014:.009;notes.forEach((n,i)=>audio.osc(type,audio.midi(root+n),t+i*.018,.09+i*.025,gain*(1-i*.12),audio.fx,(i-1)*3,(i-1)*.32));}
  function queueBreak(enemy){
    const id=enemy?.__formationId;if(!id||enemy.__formationVoice!==0)return;
    const count=state.formationBreaks.get(id)||0;if(count>=2||state.pending.has(id))return;
    const survivors=liveMembers(id);if(survivors.length<2)return;
    const ctx=enemy.__hitFeedbackCtx||{},a=areaNow(),size=Math.max(enemy.__formationSize||survivors.length+1,survivors.length+1),survivorRatio=survivors.length/Math.max(1,size-1),early=survivorRatio>=.6,exposure=enemy.__phraseExposure&&performance.now()<=enemy.__phraseExposure.expires?{...enemy.__phraseExposure}:null;
    const weapon=exposure&&['lance','swarm','lock'].includes(ctx.weapon)?ctx.weapon:'';
    const scar=weapon?{weapon,voice:weapon==='swarm'?Math.min(2,Math.max(1,survivors.length-1)):0}:null;
    state.pending.set(id,{id,area:a,q:ctx.q??.5,queuedAt:game.audio?.step||0,early,enemyScore:enemy.score||220,survivorRatio,exposure,scar});
    state.formationBreaks.set(id,count+1);state.breaks++;window.__pulseFormationCombatState?.markBreak?.(id,a);
  }
  function regroup(event){
    const survivors=liveMembers(event.id);if(survivors.length<2)return;
    const successor=[...survivors].sort((a,b)=>scoreLeader(b)-scoreLeader(a))[0],ordered=[successor,...survivors.filter(e=>e!==successor).sort((a,b)=>(a.__formationVoice||9)-(b.__formationVoice||9))],duration=direct()?620:(comfort()?720:980),now=performance.now();
    ordered.forEach((enemy,i)=>{enemy.__formationVoice=i===0?0:1+((i-1)%Math.max(2,Math.min(4,ordered.length-1)));enemy.__formationSuccessor=i===0;state.shock.set(enemy,{area:event.area,start:now,duration,index:i,total:ordered.length});});
    window.__pulseFormationCombatState?.markRegroup?.(event.id,event.area,event.scar);window.__pulseFormationLeaderReadability?.refresh?.();
    const perfect=event.q>.88,reaction=REACTIONS[event.area];let commandBonus=0,perfectBonus=0,exposureBonus=0;
    if(event.early){commandBonus=Math.floor(event.enemyScore*.25+ordered.length*30);game.score+=commandBonus;state.commandBreaks++;state.commandBonus+=commandBonus;}
    if(perfect){perfectBonus=420+ordered.length*85;state.perfectBreaks++;game.score+=perfectBonus;game.sync=clamp(game.sync+3,0,100);game.overdrive=clamp(game.overdrive+5,0,100);}
    if(event.exposure){exposureBonus=Math.floor(260+event.enemyScore*.35+ordered.length*45);game.score+=exposureBonus;game.sync=clamp(game.sync+2,0,100);state.exposureBreaks++;state.exposureBonus+=exposureBonus;}
    if(event.scar){state.weaponScars++;state.lastScar=SCAR_LABEL[event.scar.weapon]||'';successor.__commandWeaponScar={...event.scar,name:state.lastScar,expiresStep:(game.audio?.step||0)+16};}
    game.updateHud?.();musicalResponse(event.area,perfect||!!event.exposure);window.__pulseRailCamera?.frameEncounter?.(ordered.slice(0,mobile()?3:5));
    const prefix=event.exposure?'EXPOSED COMMAND BREAK':perfect?'PERFECT BREAK':event.early?'COMMAND BREAK x1.25':'FORMATION BREAK',weight=event.exposure?1:(perfect?1:(event.early?.9:.82)),scarSuffix=event.scar?` // ${SCAR_LABEL[event.scar.weapon]}`:'';
    game.showCallout?.(`${prefix} // ${reaction}${scarSuffix}`,weight);game.haptic?.(event.exposure?[10,8,16]:perfect?[8,10,14]:(mobile()?5:7));
    if(event.early||perfect||event.exposure)window.dispatchEvent(new CustomEvent('pulse:skill-reward',{detail:{label:event.exposure?'EXPOSED COMMAND BREAK':perfect?'PERFECT COMMAND BREAK':'COMMAND BREAK',points:commandBonus+perfectBonus+exposureBonus,quality:event.q,kind:event.exposure?'counterpoint':perfect?'perfect':'command'}}));
    if(event.scar)window.dispatchEvent(new CustomEvent('pulse:formation-weapon-scar',{detail:{id:event.id,area:event.area,weapon:event.scar.weapon,name:SCAR_LABEL[event.scar.weapon],successor}}));
    state.lastReaction=reaction;state.regroups++;
  }
  function processStep(step){if(step%4!==0)return;for(const [id,event] of [...state.pending]){state.pending.delete(id);regroup(event);}}game.audio?.onStep?.(processStep);
  const baseDestroyed=game.onEnemyDestroyed.bind(game);game.onEnemyDestroyed=enemy=>{const wasLeader=!!enemy?.__formationId&&enemy.__formationVoice===0,id=enemy?.__formationId,result=baseDestroyed(enemy);if(wasLeader&&id)queueBreak(enemy);return result;};
  const tick=now=>{for(const [enemy,s] of [...state.shock]){if(!enemy||enemy.dead||!enemy.group){state.shock.delete(enemy);continue;}const k=clamp((now-s.start)/s.duration,0,1);if(k>=1){state.shock.delete(enemy);delete enemy.__formationSuccessor;continue;}const comfortScale=comfort()?.55:1,env=Math.sin(k*Math.PI)*(1-k*.18)*comfortScale,p=enemy.group.position,i=s.index,n=Math.max(2,s.total);if(s.area===0){const dir=Math.sign(p.x)||((i%2)?1:-1);p.x+=dir*(.18+i*.035)*env;p.y+=(i-(n-1)/2)*.018*env;}else if(s.area===1){p.x+=(-1.28*p.x)*env;p.y+=Math.sin(i*Math.PI)*.08*env;}else if(s.area===2){const ang=(i%2?1:-1)*.42*env,c=Math.cos(ang),sn=Math.sin(ang),x=p.x,y=p.y;p.x+=(x*c-y*sn-x);p.y+=(x*sn+y*c-y)*.55;}else if(s.area===3){const dir=i%2?1:-1;p.x+=dir*(.34+.055*i)*env;p.y+=((i%3)-1)*.15*env;}else{const lanes=[-2.1,-.72,.72,2.1],tx=lanes[i%lanes.length],ty=((i%3)-1)*.42;p.x+=(tx-p.x)*.34*env;p.y+=(ty-p.y)*.28*env;}if(enemy.__fusionModel)enemy.__fusionModel.rotation.z+=(i%2?1:-1)*.006*env;}requestAnimationFrame(tick);};requestAnimationFrame(tick);
  window.__pulseFormationConsequence={processStep,forceBreak:id=>{const leader=liveMembers(id).find(e=>e.__formationVoice===0);if(leader){queueBreak(leader);return true;}return false;},stats:()=>({breaks:state.breaks,perfectBreaks:state.perfectBreaks,commandBreaks:state.commandBreaks,commandBonus:state.commandBonus,exposureBreaks:state.exposureBreaks,exposureBonus:state.exposureBonus,weaponScars:state.weaponScars,regroups:state.regroups,lastReaction:state.lastReaction,lastScar:state.lastScar,pending:state.pending.size,reacting:state.shock.size})};
});
