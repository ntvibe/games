const waitForGame=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

const PROFILES=[
  {name:'SIGNAL BIRTH',root:43,scale:[0,2,3,7,9,12,14,15],bpm:128,hat:'noise',lead:'triangle',bass:'sawtooth',pad:'sawtooth',density:.58},
  {name:'GLASS TEMPLE',root:46,scale:[0,1,5,7,8,12,13,17],bpm:132,hat:'glass',lead:'sine',bass:'triangle',pad:'sine',density:.5},
  {name:'CHROMA SEA',root:38,scale:[0,3,5,7,10,12,15,17],bpm:124,hat:'air',lead:'sine',bass:'sine',pad:'triangle',density:.42},
  {name:'ORGANIC CODE',root:41,scale:[0,2,5,7,9,11,14,16],bpm:136,hat:'click',lead:'square',bass:'triangle',pad:'sawtooth',density:.67},
  {name:'NEURAL CATHEDRAL',root:36,scale:[0,1,3,6,7,10,12,13],bpm:140,hat:'metal',lead:'sawtooth',bass:'sawtooth',pad:'triangle',density:.74}
];

waitForGame().then(game=>{
  if(game.__areaAudioInstalled)return;game.__areaAudioInstalled=true;
  const audio=game.audio;
  const originalSchedule=audio.scheduleMusic.bind(audio);
  const selected=()=>Math.max(0,Math.min(4,(window.__pulseCampaign?.state?.selected||1)-1));
  let last=-1;

  function applyProfile(i){
    const p=PROFILES[i];last=i;audio.rootMidi=p.root;audio.scale=[...p.scale];
    if(audio.ctx){audio.stepDur=60/p.bpm/4;audio.beatDur=60/p.bpm;if(audio.delay)audio.delay.delayTime.value=audio.beatDur*.75;}
    const bpm=document.querySelector('#bpm');if(bpm)bpm.textContent=`${p.bpm} BPM`;
  }

  const glass=(t,g=.04)=>{if(!audio.ctx)return;const f=audio.ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=3100;f.Q.value=9;const o=audio.ctx.createOscillator(),gain=audio.ctx.createGain();o.type='sine';o.frequency.value=audio.midi(audio.rootMidi+31);gain.gain.setValueAtTime(g,t);gain.gain.exponentialRampToValueAtTime(.0001,t+.11);o.connect(f);f.connect(gain);gain.connect(audio.music);o.start(t);o.stop(t+.12)};
  const air=(t,g=.025)=>{if(!audio.ctx)return;const src=audio.ctx.createBufferSource(),f=audio.ctx.createBiquadFilter(),gain=audio.ctx.createGain();src.buffer=audio.noiseBuffer;f.type='bandpass';f.frequency.value=5200;f.Q.value=.7;gain.gain.setValueAtTime(g,t);gain.gain.exponentialRampToValueAtTime(.0001,t+.18);src.connect(f);f.connect(gain);gain.connect(audio.music);src.start(t);src.stop(t+.2)};
  const click=(t,g=.035)=>{audio.osc('square',audio.midi(audio.rootMidi+43),t,.025,g,audio.music,0,0)};
  const metal=(t,g=.03)=>{audio.osc('square',audio.midi(audio.rootMidi+36),t,.04,g,audio.music,-11,-.2);audio.osc('sine',audio.midi(audio.rootMidi+48),t,.05,g*.55,audio.music,9,.2)};

  audio.scheduleMusic=(step,t)=>{
    const idx=selected();if(idx!==last)applyProfile(idx);
    const p=PROFILES[idx],s=step%16,bar=Math.floor(step/16),e=audio.energy;
    originalSchedule(step,t);

    // Distinctive area instrument layers are additive and reactive rather than replacing
    // the combat sounds, so lock/fire feedback stays musically coherent across the campaign.
    if(idx===0){
      if(e>.32&&[3,7,11,15].includes(s))audio.osc('square',audio.midi(p.root+24+p.scale[(bar+s)%p.scale.length]),t,.055,.012+e*.01,audio.music,-8,(s-8)/10);
    }else if(idx===1){
      if([2,6,10,14].includes(s))glass(t,.018+e*.018);
      if(s===0&&e>.18)audio.osc('sine',audio.midi(p.root+24),t,audio.beatDur*2.7,.028+e*.012,audio.music,7,-.25);
    }else if(idx===2){
      if(s%4===2)air(t,.012+e*.02);
      if([1,5,9,13].includes(s)&&e>.26)audio.osc('sine',audio.midi(p.root+36+p.scale[(bar+Math.floor(s/4))%p.scale.length]),t,.24,.022+e*.014,audio.music,0,(s-7)/8);
    }else if(idx===3){
      if(s%2===1&&e>.2)click(t,.012+e*.018);
      if([0,4,8,12].includes(s))audio.osc('triangle',audio.midi(p.root+12+p.scale[(bar+s/4)%p.scale.length|0]),t,.13,.025+e*.02,audio.music,0,(s-6)/8);
    }else{
      if([1,3,5,7,9,11,13,15].includes(s)&&e>.18)metal(t,.01+e*.015);
      if(s===0){const chord=[0,6,10,13];chord.forEach((n,i)=>audio.osc(i%2?'triangle':'sawtooth',audio.midi(p.root+24+n),t,audio.beatDur*3.5,.012+e*.007,audio.music,(i-1.5)*5,(i-1.5)/2));}
    }
  };

  applyProfile(selected());
  window.__pulseAreaAudio={profiles:PROFILES,get current(){return selected();},apply:applyProfile};
});
