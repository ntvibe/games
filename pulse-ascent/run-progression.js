import {clamp} from './util.js';

const waitFor=getter=>new Promise(resolve=>{const tick=()=>{const v=getter();v?resolve(v):requestAnimationFrame(tick)};tick()});
const STORAGE_KEY='pulse-ascent-best-v1';
const RANKS=[['D',0],['C',45],['B',60],['A',74],['S',88],['S+',96]];
const safeRead=()=>{try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')}catch{return {}}};
const safeWrite=value=>{try{localStorage.setItem(STORAGE_KEY,JSON.stringify(value))}catch{}};

function buildHud(){
  const hud=document.querySelector('#hud');
  if(!hud||document.querySelector('#runProgression'))return document.querySelector('#runProgression');
  const wrap=document.createElement('div');wrap.id='runProgression';wrap.className='run-progression';
  wrap.innerHTML=`<div class="run-rank"><small>LIVE RANK</small><b id="liveRank">C</b><i id="rankFill"></i></div><div class="mission"><small>SECTOR DIRECTIVE</small><strong id="missionText">BUILD SYNC</strong><span id="missionProgress">0%</span><i><b id="missionFill"></b></i></div><div class="best"><small>PERSONAL BEST</small><b id="personalBest">000000</b></div>`;
  hud.appendChild(wrap);
  const style=document.createElement('style');style.textContent=`.run-progression{position:absolute;top:max(92px,calc(env(safe-area-inset-top) + 92px));right:max(16px,env(safe-area-inset-right));display:grid;gap:6px;width:min(250px,32vw);pointer-events:none;text-shadow:none}.run-rank,.mission,.best{position:relative;border-left:1px solid #6feeff55;background:linear-gradient(90deg,#031019cc,#02060c80);padding:7px 9px;overflow:hidden}.run-rank small,.mission small,.best small{display:block;font-size:6px;letter-spacing:.16em;color:#5f91a0}.run-rank b{display:block;font-size:22px;line-height:1;color:#efffff;text-shadow:0 0 16px #75efff}.run-rank>i{position:absolute;left:0;bottom:0;height:2px;width:0;background:linear-gradient(90deg,#6ff6ff,#ff69da);box-shadow:0 0 9px #6ff6ff}.mission strong{display:block;margin:2px 0;font-size:8px;letter-spacing:.09em;color:#e9fdff}.mission span{position:absolute;right:8px;top:8px;font-size:7px;color:#8fc5d0}.mission>i{display:block;height:3px;margin-top:5px;border:1px solid #59859466;padding:1px}.mission>i b{display:block;height:100%;width:0;background:linear-gradient(90deg,#62eaff,#ba76ff,#ff66d6);box-shadow:0 0 8px #79efff;transition:width .2s ease}.mission.complete{border-left-color:#fff}.mission.complete strong{color:#fff;text-shadow:0 0 12px #6df5ff}.best b{display:block;font-size:10px;letter-spacing:.1em;color:#b6d7df;margin-top:2px}.run-summary{grid-column:1/-1;border-top:1px solid #62eaff44;margin-top:2px;padding-top:10px;display:grid;grid-template-columns:repeat(4,1fr);gap:4px}.run-summary div{padding:8px 5px;background:#020912aa;border-top:1px solid #5ce8ff28}.run-summary span{display:block;font-size:6px;letter-spacing:.12em;color:#638b99}.run-summary b{display:block;font-size:15px;margin-top:3px}.run-summary .grade b{font-size:25px;color:#fff;text-shadow:0 0 15px #68f2ff}@media(max-width:700px){.run-progression{top:max(77px,calc(env(safe-area-inset-top) + 77px));right:max(9px,env(safe-area-inset-right));width:132px;gap:3px}.run-rank,.mission,.best{padding:5px 6px}.run-rank{display:flex;align-items:center;justify-content:space-between}.run-rank small,.mission small,.best small{font-size:5px}.run-rank b{font-size:15px}.mission strong{font-size:6px;max-width:88px}.mission span{font-size:5px;top:6px;right:5px}.best{display:none}.run-summary{grid-template-columns:1fr 1fr}.run-summary div{padding:7px 5px}}`;
  document.head.appendChild(style);return wrap;
}

function addResultSummary(){
  const grid=document.querySelector('.result-grid');if(!grid||document.querySelector('#runSummary'))return;
  const summary=document.createElement('div');summary.id='runSummary';summary.className='run-summary';summary.innerHTML=`<div class="grade"><span>RANK</span><b id="finalRank">C</b></div><div><span>PERFECT</span><b id="finalPerfect">0%</b></div><div><span>DAMAGE</span><b id="finalDamage">0</b></div><div><span>BEST</span><b id="finalBest">0</b></div>`;grid.insertAdjacentElement('afterend',summary);
}

function missionFor(section,name,game,state){
  const start={sync:game.sync,perfect:game.perfectReleases,kills:game.kills,maxCombo:game.maxCombo,damage:state.damageTaken,score:game.score};state.sectorStart=start;
  if(name?.includes('RUPTURE'))return {name:'RUPTURE CLEAR // 10 KILLS',progress:()=>(game.kills-start.kills)/10};
  if(name?.includes('ASCENSION'))return {name:'ASCEND // 78% SYNC',progress:()=>game.sync/78};
  if(section>=4||name?.includes('CONVERGENCE'))return {name:'BREAK CONVERGENCE',progress:()=>game.boss?1-game.boss.healthRatio():0};
  const defs=[
    {name:'BUILD SYNC // 60%',progress:()=>game.sync/60},
    {name:'CHAIN DRIVE // ×3.0',progress:()=>game.mult/3},
    {name:'PERFECT GRID // 3 RELEASES',progress:()=>(game.perfectReleases-start.perfect)/3}
  ];
  return defs[Math.max(0,Math.min(defs.length-1,section))];
}

function performance(game,state){
  const perfectRate=game.releaseCount?game.perfectReleases/game.releaseCount:0;
  const survival=clamp(1-state.damageTaken*.18,0,1);
  const chain=clamp((game.maxCombo||0)/36,0,1);
  const score=clamp(game.sync*.48+perfectRate*100*.24+survival*100*.16+chain*100*.12,0,100);
  let rank='D';for(const [r,min] of RANKS)if(score>=min)rank=r;
  return {score,rank,perfectRate,survival,chain};
}

async function init(){
  const game=await waitFor(()=>window.__pulseAscent);if(game.__runProgressionInstalled)return;game.__runProgressionInstalled=true;
  buildHud();addResultSummary();
  const ui={rank:document.querySelector('#liveRank'),rankFill:document.querySelector('#rankFill'),mission:document.querySelector('.mission'),missionText:document.querySelector('#missionText'),missionProgress:document.querySelector('#missionProgress'),missionFill:document.querySelector('#missionFill'),best:document.querySelector('#personalBest')};
  const state={damageTaken:0,threatIntercepts:0,completed:new Set(),mission:null,sectorStart:null,best:safeRead(),lastUi:0};
  const refreshBest=()=>{if(ui.best)ui.best.textContent=String(state.best.score||0).padStart(6,'0')};refreshBest();
  const setMission=(section,name='')=>{state.mission=missionFor(section,name,game,state);ui.mission?.classList.remove('complete');if(ui.missionText)ui.missionText.textContent=state.mission.name};setMission(game.section||0,document.querySelector('#sectionName')?.textContent||'');
  const completeMission=()=>{const key=game.section;if(state.completed.has(key))return;state.completed.add(key);game.score+=750+key*250;game.overdrive=clamp(game.overdrive+12,0,100);game.sync=clamp(game.sync+4,0,100);ui.mission?.classList.add('complete');game.showCallout?.('DIRECTIVE COMPLETE // BONUS',1);game.haptic?.([8,7,16]);game.updateHud?.()};
  const update=()=>{
    const p=performance(game,state);if(ui.rank)ui.rank.textContent=p.rank;if(ui.rankFill)ui.rankFill.style.width=`${p.score}%`;
    const m=state.mission?clamp(state.mission.progress(),0,1):0;if(ui.missionProgress)ui.missionProgress.textContent=`${Math.round(m*100)}%`;if(ui.missionFill)ui.missionFill.style.width=`${m*100}%`;if(m>=1)completeMission();
  };

  const baseSetSection=game.setSection?.bind(game);if(baseSetSection)game.setSection=(i,name)=>{baseSetSection(i,name);setMission(i,name);update()};
  const baseScoreTiming=game.scoreTiming.bind(game);game.scoreTiming=(q,count)=>{baseScoreTiming(q,count);update()};
  const baseDestroyed=game.onEnemyDestroyed.bind(game);game.onEnemyDestroyed=enemy=>{if(enemy?.type==='danger')state.threatIntercepts++;baseDestroyed(enemy);update()};
  const baseTakeHit=game.takeHit.bind(game);game.takeHit=()=>{state.damageTaken++;baseTakeHit();update()};
  const baseRestart=game.restart.bind(game);game.restart=()=>{state.damageTaken=0;state.threatIntercepts=0;state.completed.clear();baseRestart();setMission(0,'AWAKENING');update()};
  const baseFinish=game.finish.bind(game);game.finish=()=>{
    const p=performance(game,state),score=Math.floor(game.score),previous=state.best.score||0,isBest=score>previous;
    if(isBest){state.best={score,rank:p.rank,date:new Date().toISOString()};safeWrite(state.best);refreshBest()}
    baseFinish();addResultSummary();
    const finalRank=document.querySelector('#finalRank'),finalPerfect=document.querySelector('#finalPerfect'),finalDamage=document.querySelector('#finalDamage'),finalBest=document.querySelector('#finalBest');
    if(finalRank)finalRank.textContent=p.rank;if(finalPerfect)finalPerfect.textContent=`${Math.round(p.perfectRate*100)}%`;if(finalDamage)finalDamage.textContent=String(state.damageTaken);if(finalBest)finalBest.textContent=(state.best.score||score).toLocaleString();
    const h2=document.querySelector('.result-card h2');if(h2&&isBest)h2.textContent='NEW PERSONAL BEST';
  };

  const tick=now=>{if(now-state.lastUi>180){state.lastUi=now;update()}requestAnimationFrame(tick)};requestAnimationFrame(tick);update();
  window.__pulseProgression={state,performance:()=>performance(game,state),mission:()=>state.mission?.name||'',stats:()=>({rank:performance(game,state).rank,rankScore:performance(game,state).score,damage:state.damageTaken,threatIntercepts:state.threatIntercepts,completed:[...state.completed],best:state.best.score||0,mission:state.mission?.name||''})};
}

init();