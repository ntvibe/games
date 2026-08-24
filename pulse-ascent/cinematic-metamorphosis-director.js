const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smoothstep=t=>{const x=clamp(t,0,1);return x*x*(3-2*x);};

export const METAMORPHOSIS_CUES=Object.freeze({
  TEMPLE_BLOOM:Object.freeze({
    id:'TEMPLE_BLOOM',attackSteps:4,holdSteps:48,releaseSteps:12,
    intent:Object.freeze({openness:1,fovOffset:5,bloomBoost:.18,roll:0,timeFeel:1,streakBoost:.08})
  }),
  TIME_FRACTURE:Object.freeze({
    id:'TIME_FRACTURE',attackSteps:4,holdSteps:16,releaseSteps:8,
    intent:Object.freeze({openness:.18,fovOffset:-6,bloomBoost:.12,roll:0,timeFeel:.36,streakBoost:.16})
  }),
  WORLD_ASCENT:Object.freeze({
    id:'WORLD_ASCENT',attackSteps:8,holdSteps:32,releaseSteps:16,
    intent:Object.freeze({openness:.72,fovOffset:2.5,bloomBoost:.1,roll:.2,timeFeel:1,streakBoost:.12})
  })
});

const EMPTY_SAMPLE=Object.freeze({
  id:null,phase:'idle',sequence:0,progress:0,envelope:0,beatPulse:0,
  openness:0,fovOffset:0,bloomBoost:0,roll:0,timeFeel:1,streakBoost:0
});

export class CinematicMetamorphosisDirector{
  constructor({stepsPerBar=16}={}){
    this.stepsPerBar=stepsPerBar;
    this.step=0;
    this.sequence=0;
    this.active=null;
    this.beatPulse=0;
    this.frameAge=0;
    this.listeners=new Set();
    this.frameListeners=new Set();
    this.history=[];
  }

  trigger(id,options={}){
    const spec=METAMORPHOSIS_CUES[id];
    if(!spec)throw new Error(`Unknown metamorphosis cue: ${id}`);
    const attackSteps=Math.max(1,options.attackSteps??spec.attackSteps);
    const holdSteps=Math.max(0,options.holdSteps??spec.holdSteps);
    const releaseSteps=Math.max(1,options.releaseSteps??spec.releaseSteps);
    this.sequence++;
    this.active={
      id,sequence:this.sequence,startedStep:this.step,elapsedSteps:0,
      attackSteps,holdSteps,releaseSteps,
      totalSteps:attackSteps+holdSteps+releaseSteps,
      reason:options.reason||'manual',completed:false
    };
    this.frameAge=0;
    this.history.push({id,sequence:this.sequence,step:this.step,reason:this.active.reason});
    if(this.history.length>12)this.history.shift();
    this.emit('trigger');
    return this.snapshot();
  }

  onStep(step){
    this.step=Number.isFinite(step)?step:this.step+1;
    if(this.step%4===0)this.beatPulse=this.step%16===0?1:.55;
    if(!this.active)return;
    this.active.elapsedSteps=Math.max(0,this.step-this.active.startedStep);
    if(this.active.elapsedSteps>=this.active.totalSteps){
      const completed={...this.active,completed:true};
      this.active=null;
      this.emit('complete',completed);
    }
  }

  update(dt){
    const safeDt=clamp(Number.isFinite(dt)?dt:0,0,.1);
    this.frameAge+=safeDt;
    this.beatPulse*=Math.pow(.018,safeDt);
    return this.sample();
  }

  phase(){
    const a=this.active;
    if(!a)return'idle';
    if(a.elapsedSteps<a.attackSteps)return'attack';
    if(a.elapsedSteps<a.attackSteps+a.holdSteps)return'hold';
    return'release';
  }

  envelope(){
    const a=this.active;
    if(!a)return 0;
    if(a.elapsedSteps<a.attackSteps)return smoothstep(a.elapsedSteps/a.attackSteps);
    if(a.elapsedSteps<a.attackSteps+a.holdSteps)return 1;
    const releaseAge=a.elapsedSteps-a.attackSteps-a.holdSteps;
    return 1-smoothstep(releaseAge/a.releaseSteps);
  }

  sample(){
    const a=this.active;
    if(!a)return{...EMPTY_SAMPLE,beatPulse:this.beatPulse,sequence:this.sequence};
    const spec=METAMORPHOSIS_CUES[a.id],env=this.envelope(),intent=spec.intent;
    return{
      id:a.id,phase:this.phase(),sequence:a.sequence,
      progress:clamp(a.elapsedSteps/a.totalSteps,0,1),envelope:env,beatPulse:this.beatPulse,
      openness:intent.openness*env,
      fovOffset:intent.fovOffset*env,
      bloomBoost:intent.bloomBoost*env,
      roll:intent.roll*env,
      timeFeel:1-(1-intent.timeFeel)*env,
      streakBoost:intent.streakBoost*env
    };
  }

  snapshot(){
    const sample=this.sample();
    return{
      step:this.step,stepsPerBar:this.stepsPerBar,active:this.active?{...this.active}:null,
      sample,history:this.history.map(item=>({...item})),frameConsumers:this.frameListeners.size
    };
  }

  subscribe(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn);}
  onFrame(fn){this.frameListeners.add(fn);return()=>this.frameListeners.delete(fn);}
  emitFrame(sample,dt){
    for(const fn of this.frameListeners){try{fn(sample,dt);}catch(error){console.warn('metamorphosis frame consumer failed',error);}}
  }
  emit(type,payload=this.snapshot()){
    for(const fn of this.listeners){try{fn(type,payload);}catch(error){console.warn('metamorphosis listener failed',error);}}
  }
}

const waitForGame=()=>new Promise(resolve=>{
  const tick=()=>window.__pulseAscent?resolve(window.__pulseAscent):requestAnimationFrame(tick);
  tick();
});

if(typeof window!=='undefined')waitForGame().then(game=>{
  if(game.__cinematicMetamorphosisDirectorInstalled)return;
  game.__cinematicMetamorphosisDirectorInstalled=true;
  const director=new CinematicMetamorphosisDirector();

  game.audio?.onStep?.(step=>director.onStep(step));

  const baseSetSection=game.setSection?.bind(game);
  if(baseSetSection)game.setSection=(index,name)=>{
    const result=baseSetSection(index,name);
    if(index===2&&director.sample().id!=='TEMPLE_BLOOM')director.trigger('TEMPLE_BLOOM',{reason:'sector-vector-temple'});
    return result;
  };

  const baseWorldUpdate=game.world?.update?.bind(game.world);
  if(baseWorldUpdate)game.world.update=(dt,t,energy,sync=0)=>{
    const result=baseWorldUpdate(dt,t,energy,sync);
    const sample=director.update(dt);
    director.emitFrame(sample,dt);
    return result;
  };

  const api={
    director,
    cues:METAMORPHOSIS_CUES,
    trigger:(id,options={})=>director.trigger(id,options),
    stats:()=>director.snapshot(),
    sample:()=>director.sample(),
    onFrame:fn=>director.onFrame(fn)
  };
  window.__pulseMetamorphosisDirector=api;
  import('./temple-bloom-environment.js').catch(error=>console.warn('Temple Bloom environment failed to load',error));
});
