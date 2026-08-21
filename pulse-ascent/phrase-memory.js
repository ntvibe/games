const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

const VARIANTS=[
  {
    weak:{name:'BUS ECHO',notes:[0,7,5],responseSide:1,responseOffset:-.28,accent:'echo',kind:'cut'},
    strong:{name:'BUS RETURN',notes:[12,7,0],responseSide:-1,responseOffset:-.72,accent:'reroute',kind:'break'}
  },
  {
    weak:{name:'MIRROR SHARD',notes:[0,5,7],responseSide:1,responseOffset:.34,accent:'shard',kind:'cut'},
    strong:{name:'MIRROR ANSWER',notes:[12,5,0],responseSide:-1,responseOffset:.78,accent:'invert',kind:'break'}
  },
  {
    weak:{name:'TIDAL RIPPLE',notes:[0,3,5],responseSide:-1,responseOffset:.12,accent:'ripple',kind:'cut'},
    strong:{name:'TIDAL ECHO',notes:[7,3,10],responseSide:1,responseOffset:-.18,accent:'bend',kind:'break'}
  },
  {
    weak:{name:'BRANCH FEINT',notes:[0,5,7],responseSide:1,responseOffset:-.38,accent:'feint',kind:'cut'},
    strong:{name:'BRANCH ANSWER',notes:[9,5,0],responseSide:-1,responseOffset:-1.05,accent:'fork',kind:'break'}
  },
  {
    weak:{name:'CHOIR SUSPENSION',notes:[0,7,10],responseSide:1,responseOffset:-.28,accent:'suspend',kind:'cut'},
    strong:{name:'CHOIR AFTERIMAGE',notes:[12,7,16],responseSide:-1,responseOffset:-.82,accent:'revoice',kind:'break'}
  }
];

const state={pending:Array(5).fill(null),active:Array(5).fill(null),armed:0,consumed:0,lastArea:1,lastName:'',lastStrong:false,lastKind:''};

function arm(detail={}){
  const area=clamp((detail.area||1)-1,0,4),strong=!!detail.strong,variant=VARIANTS[area][strong?'strong':'weak'];
  state.pending[area]={...variant,strong,source:detail.name||'',armedAt:performance.now()};
  state.armed++;state.lastArea=area+1;state.lastName=variant.name;state.lastStrong=strong;state.lastKind=variant.kind;
  dispatchEvent(new CustomEvent('pulse:enemy-phrase-memory-armed',{detail:{area:area+1,name:variant.name,strong,kind:variant.kind,source:detail.name||''}}));
}

function begin(areaIndex){
  const area=clamp(areaIndex|0,0,4),next=state.pending[area];
  state.active[area]=next;state.pending[area]=null;
  if(next){
    state.consumed++;
    dispatchEvent(new CustomEvent('pulse:enemy-phrase-memory-begin',{detail:{area:area+1,name:next.name,strong:next.strong,kind:next.kind,accent:next.accent}}));
  }
  return state.active[area];
}

function current(areaIndex){return state.active[clamp(areaIndex|0,0,4)]||null;}
function end(areaIndex){const area=clamp(areaIndex|0,0,4),done=state.active[area];state.active[area]=null;if(done)dispatchEvent(new CustomEvent('pulse:enemy-phrase-memory-end',{detail:{area:area+1,name:done.name,strong:done.strong,kind:done.kind}}));return done;}
function clear(){state.pending.fill(null);state.active.fill(null);}

addEventListener('pulse:enemy-phrase-reharmonized',e=>arm(e.detail||{}));

window.__pulsePhraseMemory={
  variants:VARIANTS,arm,begin,current,end,clear,
  stats:()=>({armed:state.armed,consumed:state.consumed,lastArea:state.lastArea,lastName:state.lastName,lastStrong:state.lastStrong,lastKind:state.lastKind,pending:state.pending.map(v=>v?.name||''),active:state.active.map(v=>v?.name||'')})
};
