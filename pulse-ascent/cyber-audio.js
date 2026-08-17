import {clamp,rand} from './util.js';

const makeCurve=(amount=7)=>{
  const n=512,curve=new Float32Array(n);
  for(let i=0;i<n;i++){
    const x=i*2/(n-1)-1;
    curve[i]=Math.tanh(x*amount)/Math.tanh(amount);
  }
  return curve;
};

export function installCyberAudio(audio,getMode=()=> 'rail'){
  if(audio.__cyberInstalled)return;
  audio.__cyberInstalled=true;
  audio._cyberCurve=makeCurve(5.5);
  const baseSchedule=audio.scheduleMusic.bind(audio);

  const route=(node,dest=audio.music)=>{node.connect(dest);return node};
  const drive=(amount=.85)=>{
    const sh=audio.ctx.createWaveShaper();sh.curve=audio._cyberCurve;sh.oversample='2x';
    const g=audio.ctx.createGain();g.gain.value=amount;sh.connect(g);g.connect(audio.music);return sh;
  };

  audio.cyberKick=(t,g=.18)=>{
    if(!audio.ctx)return;
    const o=audio.ctx.createOscillator(),gain=audio.ctx.createGain(),sh=drive(.55);
    o.type='sine';o.frequency.setValueAtTime(176,t);o.frequency.exponentialRampToValueAtTime(39,t+.11);
    gain.gain.setValueAtTime(g,t);gain.gain.exponentialRampToValueAtTime(.0001,t+.17);
    o.connect(gain);gain.connect(sh);o.start(t);o.stop(t+.18);
  };

  audio.industrialTom=(t,n=0,g=.07)=>{
    if(!audio.ctx)return;
    const f=[132,111,92,78][n%4],o=audio.ctx.createOscillator(),gain=audio.ctx.createGain(),pan=audio.ctx.createStereoPanner?.();
    o.type=n%2?'triangle':'sine';o.frequency.setValueAtTime(f*1.5,t);o.frequency.exponentialRampToValueAtTime(f,t+.13);
    gain.gain.setValueAtTime(g,t);gain.gain.exponentialRampToValueAtTime(.0001,t+.2);o.connect(gain);
    if(pan){pan.pan.value=(n%4-1.5)*.35;gain.connect(pan);pan.connect(audio.music)}else gain.connect(audio.music);
    o.start(t);o.stop(t+.22);
  };

  audio.metalHit=(t,g=.045,panValue=0)=>{
    if(!audio.ctx)return;
    const src=audio.ctx.createBufferSource(),bp=audio.ctx.createBiquadFilter(),gain=audio.ctx.createGain(),pan=audio.ctx.createStereoPanner?.();
    src.buffer=audio.noiseBuffer;bp.type='bandpass';bp.frequency.value=2600+rand(-500,1200);bp.Q.value=9;
    gain.gain.setValueAtTime(g,t);gain.gain.exponentialRampToValueAtTime(.0001,t+.055);src.connect(bp);bp.connect(gain);
    if(pan){pan.pan.value=clamp(panValue,-1,1);gain.connect(pan);pan.connect(audio.music)}else gain.connect(audio.music);
    src.start(t);src.stop(t+.06);
    audio.osc('square',rand(680,1100),t,.027,g*.16,audio.music,rand(-22,22),-panValue);
  };

  audio.fmStab=(t,midi=55,g=.05,panValue=0)=>{
    if(!audio.ctx)return;
    const carrier=audio.ctx.createOscillator(),mod=audio.ctx.createOscillator(),modGain=audio.ctx.createGain(),gain=audio.ctx.createGain(),filter=audio.ctx.createBiquadFilter(),pan=audio.ctx.createStereoPanner?.();
    const f=audio.midi(midi);carrier.type='sawtooth';carrier.frequency.value=f;mod.type='sine';mod.frequency.value=f*2.01;modGain.gain.setValueAtTime(f*.85,t);modGain.gain.exponentialRampToValueAtTime(2,t+.13);
    filter.type='bandpass';filter.frequency.setValueAtTime(900,t);filter.frequency.exponentialRampToValueAtTime(4200,t+.055);filter.Q.value=5.5;
    gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(g,t+.004);gain.gain.exponentialRampToValueAtTime(.0001,t+.14);
    mod.connect(modGain);modGain.connect(carrier.frequency);carrier.connect(filter);filter.connect(gain);
    if(pan){pan.pan.value=clamp(panValue,-1,1);gain.connect(pan);pan.connect(audio.music)}else gain.connect(audio.music);
    carrier.start(t);mod.start(t);carrier.stop(t+.15);mod.stop(t+.15);
  };

  audio.reese=(t,midi=36,g=.035,dur=.22)=>{
    if(!audio.ctx)return;
    const sum=audio.ctx.createGain(),filter=audio.ctx.createBiquadFilter(),sh=drive(.48),gain=audio.ctx.createGain();
    const f=audio.midi(midi);filter.type='lowpass';filter.frequency.setValueAtTime(520+audio.energy*620,t);filter.frequency.exponentialRampToValueAtTime(190,t+dur);filter.Q.value=3.2;
    gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(g,t+.008);gain.gain.exponentialRampToValueAtTime(.0001,t+dur);
    sum.connect(filter);filter.connect(gain);gain.connect(sh);
    [-17,0,14].forEach((det,i)=>{const o=audio.ctx.createOscillator();o.type=i===1?'square':'sawtooth';o.frequency.value=f;o.detune.value=det;o.connect(sum);o.start(t);o.stop(t+dur+.02)});
  };

  audio.acid=(t,midi=67,g=.025,panValue=0)=>{
    if(!audio.ctx)return;
    const o=audio.ctx.createOscillator(),filter=audio.ctx.createBiquadFilter(),gain=audio.ctx.createGain(),pan=audio.ctx.createStereoPanner?.();
    o.type='sawtooth';o.frequency.value=audio.midi(midi);filter.type='lowpass';filter.Q.value=13;filter.frequency.setValueAtTime(380,t);filter.frequency.exponentialRampToValueAtTime(4800,t+.07);filter.frequency.exponentialRampToValueAtTime(560,t+.17);
    gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(g,t+.004);gain.gain.exponentialRampToValueAtTime(.0001,t+.18);o.connect(filter);filter.connect(gain);
    if(pan){pan.pan.value=panValue;gain.connect(pan);pan.connect(audio.delay)}else gain.connect(audio.delay);o.start(t);o.stop(t+.19);
  };

  audio.glitch=(t,g=.018,panValue=0)=>{
    if(!audio.ctx)return;
    const src=audio.ctx.createBufferSource(),hp=audio.ctx.createBiquadFilter(),gain=audio.ctx.createGain(),pan=audio.ctx.createStereoPanner?.();
    src.buffer=audio.noiseBuffer;src.playbackRate.value=rand(.35,1.9);hp.type='highpass';hp.frequency.value=rand(2800,7000);
    const dur=rand(.012,.045);gain.gain.setValueAtTime(g,t);gain.gain.exponentialRampToValueAtTime(.0001,t+dur);src.connect(hp);hp.connect(gain);
    if(pan){pan.pan.value=panValue;gain.connect(pan);pan.connect(audio.fx)}else gain.connect(audio.fx);src.start(t,rand(0,.7));src.stop(t+dur+.005);
  };

  audio.ruptureDrop=(t=audio.ctx?.currentTime)=>{
    if(!audio.ctx||t===undefined)return;
    audio.cyberKick(t,.34);audio.reese(t,audio.rootMidi-12,.095,audio.beatDur*1.8);
    [0,3,7,10].forEach((n,i)=>audio.fmStab(t+i*.035,audio.rootMidi+24+n,.055,(i-1.5)*.45));
    for(let i=0;i<7;i++)audio.glitch(t+i*.035,.025,(i%2?1:-1)*.75);
  };

  audio.ruptureKill=(t=audio.ctx?.currentTime)=>{
    if(!audio.ctx||t===undefined)return;
    audio.metalHit(t,.075,rand(-.8,.8));audio.fmStab(t,audio.rootMidi+31+[0,3,7][Math.floor(rand(0,3))],.04,rand(-.8,.8));
  };

  audio.scheduleMusic=(step,t)=>{
    baseSchedule(step,t);
    if(!audio.ctx)return;
    const s=step%16,bar=Math.floor(step/16),e=audio.energy,mode=getMode();
    if(e>.24&&[3,11].includes(s))audio.metalHit(t,.025+e*.018,s===3?-.6:.6);
    if(e>.42&&[6,14].includes(s))audio.industrialTom(t,(bar+s)%4,.035+e*.025);
    if(e>.58&&[1,5,9,13].includes(s))audio.fmStab(t,audio.rootMidi+24+[0,3,7,10][(bar+s)%4],.018+e*.018,(s-7)/8);
    if(e>.72&&s%2===1)audio.glitch(t,.009+e*.008,(s%4===1?-.65:.65));
    if(e>.66&&[0,8].includes(s))audio.reese(t,audio.rootMidi-7+[0,3,5,0][bar%4],.018+e*.024,.18);
    if(mode==='rupture'){
      if([0,7,10].includes(s))audio.cyberKick(t,s===0?.18:.075);
      if([2,6,10,14].includes(s))audio.acid(t,audio.rootMidi+36+[0,7,3,10][(bar+s)%4],.022,(s%4===2?-.7:.7));
      if([4,12].includes(s))audio.industrialTom(t,bar+s,.065);
      if(s%2===1)audio.glitch(t,.018,(s%4===1?-.85:.85));
      if(s===0)audio.reese(t,audio.rootMidi-12+[0,3,5,7][bar%4],.055,audio.beatDur*.62);
    }
    if(audio.section>=4&&e>.72){
      if([2,5,10,13].includes(s))audio.metalHit(t,.055,(s%4<2?-.8:.8));
      if([0,8].includes(s))audio.reese(t,audio.rootMidi-12,.052,.28);
    }
  };
}
