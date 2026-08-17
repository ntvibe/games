import {SETTINGS,clamp,rand} from './util.js';
export class AudioCore {
  constructor(){this.ctx=null;this.master=null;this.music=null;this.fx=null;this.delay=null;this.delayGain=null;this.comp=null;this.noiseBuffer=null;this.started=false;this.timer=0;this.nextStepTime=0;this.step=0;this.lookAhead=.12;this.stepDur=60/SETTINGS.bpm/4;this.beatDur=60/SETTINGS.bpm;this.listeners=new Set();this.energy=0;this.section=0;this.scale=[0,2,3,7,9,12,14,15];this.rootMidi=43}
  async init(){
    if(this.started){await this.ctx?.resume?.();return;}
    this.ctx=new(window.AudioContext||window.webkitAudioContext)({latencyHint:'interactive'});await this.ctx.resume();
    this.master=this.ctx.createGain();this.master.gain.value=.72;this.comp=this.ctx.createDynamicsCompressor();this.comp.threshold.value=-12;this.comp.knee.value=16;this.comp.ratio.value=4;this.comp.attack.value=.004;this.comp.release.value=.22;
    this.music=this.ctx.createGain();this.music.gain.value=.6;this.fx=this.ctx.createGain();this.fx.gain.value=.82;
    this.delay=this.ctx.createDelay(1);this.delay.delayTime.value=this.beatDur*.75;this.delayGain=this.ctx.createGain();this.delayGain.gain.value=.19;this.delay.connect(this.delayGain);this.delayGain.connect(this.delay);this.delayGain.connect(this.comp);
    this.music.connect(this.comp);this.fx.connect(this.comp);this.fx.connect(this.delay);this.comp.connect(this.master);this.master.connect(this.ctx.destination);
    this.noiseBuffer=this.makeNoiseBuffer();this.started=true;this.nextStepTime=this.ctx.currentTime+.08;this.anchor=this.nextStepTime;this.scheduler();this.timer=setInterval(()=>this.scheduler(),25);
  }
  destroy(){clearInterval(this.timer);this.timer=0;this.started=false;if(this.ctx)this.ctx.close();this.ctx=null}
  makeNoiseBuffer(){const len=this.ctx.sampleRate,b=this.ctx.createBuffer(1,len,this.ctx.sampleRate),d=b.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;return b}
  onStep(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn)}
  scheduler(){if(!this.ctx||this.ctx.state==='suspended')return;while(this.nextStepTime<this.ctx.currentTime+this.lookAhead){const scheduledStep=this.step,t=this.nextStepTime;this.scheduleMusic(scheduledStep,t);const delayMs=Math.max(0,(t-this.ctx.currentTime)*1000);setTimeout(()=>{for(const fn of this.listeners)fn(scheduledStep,t)},delayMs);this.nextStepTime+=this.stepDur;this.step++}}
  scheduleMusic(step,t){
    const s=step%16,bar=Math.floor(step/16),section=this.section,e=this.energy;
    if(s===0||s===8||(e>.75&&s===10)){this.kick(t,s===0?1:.72);this.duck(t,.18+e*.08)}
    if(s===4||s===12)this.snare(t,.64+e*.18);if(e>.08&&s%2===0)this.hat(t,.07+e*.06,s%4===2);if(e>.35&&s%2===1)this.hat(t,.035+e*.035,true);
    const pat=section<2?[0,null,0,null,3,null,5,null,0,null,7,null,5,null,3,null]:[0,null,7,null,3,0,5,null,0,null,10,null,7,5,3,null],n=pat[s];if(e>.1&&n!==null)this.bass(t,this.rootMidi+n,.11+e*.06);
    if(e>.48&&[2,6,10,14].includes(s)){const seq=[0,7,3,10,5,12,7,14],note=seq[(bar+Math.floor(s/2))%seq.length];this.pluck(t,this.rootMidi+24+note,.055+e*.035,.11)}
    if(e>.68&&section>=2&&[1,5,9,13].includes(s))this.pluck(t,this.rootMidi+36+[0,3,7,10][(bar+s)%4],.03+e*.02,.07);
    if(s===0&&e>.18)this.pad(t,this.rootMidi+12+[0,3,7,5][bar%4],this.beatDur*3.8,.032+e*.026);if(s===0&&e>.82)this.riserTick(t,bar%4===3?.16:.07)
  }
  duck(t,amount=.2){if(!this.music)return;const g=this.music.gain;g.cancelScheduledValues(t);g.setValueAtTime(Math.max(.2,g.value),t);g.linearRampToValueAtTime(.6*(1-amount),t+.012);g.exponentialRampToValueAtTime(.6,t+.12)}
  osc(type,freq,t,dur,gain,dest=this.music,detune=0,pan=0){const o=this.ctx.createOscillator(),g=this.ctx.createGain(),p=this.ctx.createStereoPanner?.();o.type=type;o.frequency.setValueAtTime(freq,t);o.detune.value=detune;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,gain),t+.006);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);if(p){p.pan.value=clamp(pan,-1,1);g.connect(p);p.connect(dest)}else g.connect(dest);o.start(t);o.stop(t+dur+.03);return{o,g}}
  midi(m){return 440*Math.pow(2,(m-69)/12)}
  kick(t,g=.9){const o=this.ctx.createOscillator(),gain=this.ctx.createGain();o.type='sine';o.frequency.setValueAtTime(145,t);o.frequency.exponentialRampToValueAtTime(42,t+.13);gain.gain.setValueAtTime(g*.75,t);gain.gain.exponentialRampToValueAtTime(.0001,t+.19);o.connect(gain);gain.connect(this.music);o.start(t);o.stop(t+.2)}
  snare(t,g=.5){const src=this.ctx.createBufferSource(),f=this.ctx.createBiquadFilter(),gain=this.ctx.createGain();src.buffer=this.noiseBuffer;f.type='highpass';f.frequency.value=1250;gain.gain.setValueAtTime(g*.28,t);gain.gain.exponentialRampToValueAtTime(.0001,t+.13);src.connect(f);f.connect(gain);gain.connect(this.music);src.start(t);src.stop(t+.15);this.osc('triangle',185,t,.07,g*.09,this.music)}
  hat(t,g=.08,open=false){const src=this.ctx.createBufferSource(),f=this.ctx.createBiquadFilter(),gain=this.ctx.createGain();src.buffer=this.noiseBuffer;f.type='highpass';f.frequency.value=6500;const d=open?.12:.035;gain.gain.setValueAtTime(g,t);gain.gain.exponentialRampToValueAtTime(.0001,t+d);src.connect(f);f.connect(gain);gain.connect(this.music);src.start(t);src.stop(t+d+.01)}
  bass(t,midi,g=.14){const f=this.midi(midi);this.osc('sawtooth',f,t,.15,g*.32,this.music);this.osc('sine',f/2,t,.17,g*.48,this.music)}
  pluck(t,midi,g=.08,dur=.12,pan=0){const f=this.midi(midi),{g:gain}=this.osc('triangle',f,t,dur,g,this.music,0,pan);this.osc('sine',f*2,t,dur*.55,g*.22,this.fx,rand(-4,4),-pan);return gain}
  pad(t,midi,dur,g=.04){const f=this.midi(midi);[-9,0,8].forEach((det,i)=>{const o=this.ctx.createOscillator(),gain=this.ctx.createGain(),filter=this.ctx.createBiquadFilter(),pan=this.ctx.createStereoPanner?.();o.type='sawtooth';o.frequency.value=f;o.detune.value=det;filter.type='lowpass';filter.frequency.value=900+this.energy*1400;filter.Q.value=.7;gain.gain.setValueAtTime(.0001,t);gain.gain.linearRampToValueAtTime(g/3,t+.18);gain.gain.linearRampToValueAtTime(.0001,t+dur);o.connect(filter);filter.connect(gain);if(pan){pan.pan.value=(i-1)*.5;gain.connect(pan);pan.connect(this.music)}else gain.connect(this.music);o.start(t);o.stop(t+dur+.05)})}
  riserTick(t,g=.1){const src=this.ctx.createBufferSource(),f=this.ctx.createBiquadFilter(),gain=this.ctx.createGain();src.buffer=this.noiseBuffer;f.type='bandpass';f.frequency.setValueAtTime(1800,t);f.frequency.exponentialRampToValueAtTime(7800,t+.3);f.Q.value=3;gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(g,t+.04);gain.gain.exponentialRampToValueAtTime(.0001,t+.3);src.connect(f);f.connect(gain);gain.connect(this.fx);src.start(t);src.stop(t+.31)}
  lockNote(index){if(!this.ctx)return;const t=this.ctx.currentTime,m=this.rootMidi+24+this.scale[index%this.scale.length];this.osc('sine',this.midi(m),t,.065,.075,this.fx,0,(index-3.5)/4)}
  shotNote(index,time,mult=1){if(!this.ctx)return;const m=this.rootMidi+24+this.scale[index%this.scale.length]+(this.section>=3?12:0),f=this.midi(m),pan=(index-3.5)/4;this.osc('sine',f,time,.16,.10*mult,this.fx,0,pan);this.osc('triangle',f*2,time,.07,.035*mult,this.fx,rand(-6,6),-pan)}
  syncNote(q,time=this.ctx?.currentTime){if(!this.ctx||time===undefined)return;const root=this.rootMidi+36;if(q>.88){[0,7,12].forEach((n,i)=>this.pluck(time+i*.018,root+n,.055,.16,(i-1)*.55));this.pad(time,root,this.beatDur*.75,.025)}else if(q>.62)this.pluck(time,root+7,.045,.1,0);else this.osc('triangle',this.midi(root-5),time,.08,.025,this.fx)}
  sectionStab(index,time=this.ctx?.currentTime){if(!this.ctx||time===undefined)return;const root=this.rootMidi+24+[0,3,7,10,12][Math.min(index,4)];[0,7,12].forEach((n,i)=>this.osc(i?'triangle':'sine',this.midi(root+n),time,.45,.05,this.fx,0,(i-1)*.5));this.riserTick(time,.12)}
  bossPulse(phase,time=this.ctx?.currentTime){if(!this.ctx||time===undefined)return;const n=this.rootMidi+12+[0,3,7][Math.max(0,phase-1)];this.osc('sawtooth',this.midi(n),time,.18,.045+.012*phase,this.fx,-10);this.osc('sine',this.midi(n-12),time,.24,.05,this.fx)}
  dangerWarning(time=this.ctx?.currentTime){if(!this.ctx||time===undefined)return;this.osc('square',this.midi(this.rootMidi+31),time,.055,.018,this.fx);this.osc('square',this.midi(this.rootMidi+34),time+.06,.055,.014,this.fx)}
  destroyNote(time,heavy=false){if(!this.ctx)return;const t=time??this.ctx.currentTime;this.osc('sine',heavy?74:108,t,heavy?.34:.18,heavy?.16:.08,this.fx);if(heavy)this.riserTick(t,.1)}
  hurt(){if(!this.ctx)return;const t=this.ctx.currentTime,{o}=this.osc('sawtooth',130,t,.33,.09,this.fx);o.frequency.exponentialRampToValueAtTime(43,t+.3)}
  overdrive(time){if(!this.ctx)return;for(let i=0;i<8;i++)this.shotNote(i,time+i*this.stepDur/2,1.4);this.pad(time,this.rootMidi+24,this.beatDur*2,.09)}
  quantizedTime(div=1){if(!this.ctx)return 0;const q=this.stepDur/div,now=this.ctx.currentTime+.018,anchor=this.anchor??0;return anchor+Math.ceil((now-anchor)/q)*q}
  timingQuality(){if(!this.ctx)return .5;const q=this.stepDur,now=this.ctx.currentTime,anchor=this.anchor??now;const phase=((now-anchor)%q+q)%q,dist=Math.min(phase,q-phase);return clamp(1-dist/(q*.5),0,1)}
}
