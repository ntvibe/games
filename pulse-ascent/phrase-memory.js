const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

const VARIANTS=[
  {name:'BUS RETURN',notes:[12,7,0],responseSide:-1,responseOffset:-.72,accent:'reroute'},
  {name:'MIRROR ANSWER',notes:[12,5,0],responseSide:-1,responseOffset:.78,accent:'invert'},
  {name:'TIDAL ECHO',notes:[7,3,10],responseSide:1,responseOffset:-.18,accent:'bend'},
  {name:'BRANCH ANSWER',notes:[9,5,0],responseSide:-1,responseOffset:-1.05,accent:'fork'},
  {name:'CHOIR AFTERIMAGE',notes:[12,7,16],responseSide:-1,responseOffset:-.82,accent:'revoice'}
];

const state={pending:Array(5).fill(null),active:Array(5).fill(null),armed:0,consumed:0,lastArea:1,lastName:'',lastStrong:false};

function arm(detail={}){
  const area=clamp((detail.area||1)-1,0,4),variant=VARIANTS[area],strong=!!detail.strong;
  state.pending[area]={...variant,strong,source:detail.name||'',armedAt:performance.now()};
  state.armed++;state.lastArea=area+1;state.lastName=variant.name;state.lastStrong=strong;
  dispatchEvent(new CustomEvent('pulse:enemy-phrase-memory-armed',{detail:{area:area+1,name:variant.name,strong,source:detail.name||''}}));
}

function begin(areaIndex){
  const area=clamp(areaIndex|0,0,4),next=state.pending[area];
  state.active[area]=next;state.pending[area]=null;
  if(next){
    state.consumed++;
    dispatchEvent(new CustomEvent('pulse:enemy-phrase-memory-begin',{detail:{area:area+1,name:next.name,strong:next.strong,accent:next.accent}}));
  }
  return state.active[area];
}

function current(areaIndex){return state.active[clamp(areaIndex|0,0,4)]||null;}
function end(areaIndex){const area=clamp(areaIndex|0,0,4),done=state.active[area];state.active[area]=null;if(done)dispatchEvent(new CustomEvent('pulse:enemy-phrase-memory-end',{detail:{area:area+1,name:done.name,strong:done.strong}}));return done;}
function clear(){state.pending.fill(null);state.active.fill(null);}

addEventListener('pulse:enemy-phrase-reharmonized',e=>arm(e.detail||{}));

window.__pulsePhraseMemory={
  variants:VARIANTS,arm,begin,current,end,clear,
  stats:()=>({armed:state.armed,consumed:state.consumed,lastArea:state.lastArea,lastName:state.lastName,lastStrong:state.lastStrong,pending:state.pending.map(v=>v?.name||''),active:state.active.map(v=>v?.name||'')})
};
