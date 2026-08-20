const waitForGame=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});

const STORAGE='pulse-ascent-campaign-v1';
const LEVELS=[
  {id:1,name:'AREA 01 // SIGNAL BIRTH',theme:'CIRCUIT CITY',bars:36,boss:'THE CONVERGENCE',unlock:1,phases:['CIRCUIT CITY','SIGNAL BLOOM','VECTOR TEMPLE','ASCENSION','THE CONVERGENCE']},
  {id:2,name:'AREA 02 // GLASS TEMPLE',theme:'DATA TEMPLE',bars:40,boss:'THE ARCHON',unlock:2,phases:['DATA TEMPLE','REFRACTION CLOISTER','MIRROR SANCTUM','ARCHON ASCENT','THE ARCHON']},
  {id:3,name:'AREA 03 // CHROMA SEA',theme:'CHROMATIC VOID',bars:44,boss:'THE BLOOM',unlock:3,phases:['CHROMATIC VOID','TIDAL LATTICE','COLOR ABYSS','BLOOM CURRENT','THE BLOOM']},
  {id:4,name:'AREA 04 // ORGANIC CODE',theme:'ORGANIC SIGNAL',bars:48,boss:'THE ORACLE',unlock:4,phases:['ORGANIC SIGNAL','SYNAPSE GROVE','BRANCH MAZE','ORACLE ROOT','THE ORACLE']},
  {id:5,name:'AREA 05 // NEURAL CATHEDRAL',theme:'NEURAL CATHEDRAL',bars:52,boss:'FINAL RESONANCE',unlock:5,phases:['NEURAL CATHEDRAL','CHOIR VAULT','ROSE WINDOW','SERAPH NAVE','FINAL RESONANCE']}
];

const load=()=>{try{return JSON.parse(localStorage.getItem(STORAGE)||'{}')}catch{return {}}};
const save=v=>{try{localStorage.setItem(STORAGE,JSON.stringify(v))}catch{}};

function addLevelSelect(game,state){
  if(document.querySelector('#levelSelect'))return;
  const host=document.querySelector('#start .start-card');if(!host)return;
  const wrap=document.createElement('div');wrap.id='levelSelect';wrap.className='level-select';
  host.insertBefore(wrap,document.querySelector('#startBtn'));
  const style=document.createElement('style');style.textContent=`.level-select{display:flex;gap:6px;margin:14px 0 10px;overflow-x:auto;padding-bottom:3px}.level-select button{min-width:88px;border:1px solid #69eaff40;background:#031018aa;color:#bdefff;padding:7px 8px;font:600 8px/1.25 inherit;letter-spacing:.08em;text-align:left}.level-select button b{display:block;color:#fff;font-size:10px;margin-bottom:3px}.level-select button[disabled]{opacity:.26}.level-select button.active{border-color:#8af7ff;background:linear-gradient(135deg,#083043cc,#23102ecc);box-shadow:0 0 18px #58ecff22}.level-select button small{display:block;font-size:6px;color:#638995;white-space:normal}`;document.head.appendChild(style);
  const render=()=>{wrap.innerHTML='';for(const l of LEVELS){const unlocked=l.id<=state.unlocked,b=document.createElement('button');b.disabled=!unlocked;b.className=l.id===state.selected?'active':'';b.innerHTML=`<b>AREA ${String(l.id).padStart(2,'0')}</b><small>${unlocked?l.theme:'LOCKED'}</small>`;b.onclick=()=>{state.selected=l.id;render();game.showCallout?.(l.name,.9)};wrap.appendChild(b)}};render();state.render=render;
}

waitForGame().then(game=>{
  if(game.__levelCampaignInstalled)return;game.__levelCampaignInstalled=true;
  const persisted=load();
  const state={selected:Math.max(1,Math.min(5,persisted.selected||1)),unlocked:Math.max(1,Math.min(5,persisted.unlocked||1)),completed:persisted.completed||{},levelStartScore:0,levelStartKills:0};
  addLevelSelect(game,state);

  const originalStart=game.start.bind(game);
  game.start=async()=>{const l=LEVELS[state.selected-1];state.levelStartScore=game.score;state.levelStartKills=game.kills;await originalStart();game.showCallout?.(l.name,1);document.querySelector('#sectionName').textContent=l.theme;};

  const originalRestart=game.restart.bind(game);
  game.restart=()=>{originalRestart();const l=LEVELS[state.selected-1];game.showCallout?.(l.name,1);document.querySelector('#sectionName').textContent=l.theme;};

  // Let the base game run its authored Area 1 arc, but when the boss is defeated convert the result
  // into a campaign clear and advance to a new persistent Area rather than treating the whole game as one timed run.
  const originalFinish=game.finish.bind(game);
  game.finish=()=>{
    const l=LEVELS[state.selected-1],score=Math.max(0,Math.floor(game.score-state.levelStartScore));
    state.completed[l.id]={score,date:new Date().toISOString()};
    if(l.id<LEVELS.length)state.unlocked=Math.max(state.unlocked,l.id+1);
    save({selected:state.selected,unlocked:state.unlocked,completed:state.completed});
    originalFinish();
    const h2=document.querySelector('.result-card h2');if(h2)h2.textContent=`${l.name} CLEARED`;
    const btn=document.querySelector('#restartBtn span');if(btn)btn.textContent=l.id<LEVELS.length?'ENTER NEXT AREA':'REPLAY FINAL AREA';
    const restartBtn=document.querySelector('#restartBtn');if(restartBtn&&!restartBtn.__campaignBound){restartBtn.__campaignBound=true;restartBtn.addEventListener('click',()=>{if(l.id<LEVELS.length){state.selected=Math.min(LEVELS.length,l.id+1);save({selected:state.selected,unlocked:state.unlocked,completed:state.completed});state.render?.();}},true)};
  };

  // Every campaign Area owns its full five-phase identity rather than inheriting Area 01's middle acts.
  // The underlying combat substrate stays shared while authored openings, setpieces, topology and audio provide the Area-specific journey.
  const originalSetSection=game.setSection.bind(game);
  game.setSection=(i,name)=>{const l=LEVELS[state.selected-1],phase=l.phases?.[i]||name;originalSetSection(i,phase);if(window.__worldMetamorphosis&&i===0)window.__worldMetamorphosis.trigger?.();};

  window.__pulseCampaign={state,levels:LEVELS,select:id=>{if(id>=1&&id<=state.unlocked){state.selected=id;save({selected:id,unlocked:state.unlocked,completed:state.completed});state.render?.();return true}return false}};
});
