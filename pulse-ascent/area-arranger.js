const waitFor=()=>new Promise(resolve=>{const tick=()=>window.__pulseAscent&&window.__pulseAreaAudio?resolve(window.__pulseAscent):requestAnimationFrame(tick);tick();});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

waitFor().then(game=>{
  if(game.__areaArrangerInstalled)return;
  game.__areaArrangerInstalled=true;
  const audio=game.audio,areaAudio=window.__pulseAreaAudio;
  let lastArea=-1;
  const selected=()=>clamp((window.__pulseCampaign?.state?.selected||1)-1,0,4);
  const layer=()=>clamp(game.section||0,0,4);

  const ping=(t,m,g=.025,type='sine',pan=0)=>audio.osc(type,audio.midi(m),t,.11,g,audio.music,0,pan);
  const air=(t,g=.018)=>{if(!audio.ctx)return;const s=audio.ctx.createBufferSource(),f=audio.ctx.createBiquadFilter(),gn=audio.ctx.createGain();s.buffer=audio.noiseBuffer;f.type='bandpass';f.frequency.value=4300;f.Q.value=.8;gn.gain.setValueAtTime(g,t);gn.gain.exponentialRampToValueAtTime(.0001,t+.22);s.connect(f);f.connect(gn);gn.connect(audio.music);s.start(t);s.stop(t+.24)};
  const glass=(t,m,g=.022)=>{if(!audio.ctx)return;const o=audio.ctx.createOscillator(),f=audio.ctx.createBiquadFilter(),gn=audio.ctx.createGain();o.type='sine';o.frequency.value=audio.midi(m);f.type='bandpass';f.frequency.value=2600;f.Q.value=10;gn.gain.setValueAtTime(g,t);gn.gain.exponentialRampToValueAtTime(.0001,t+.16);o.connect(f);f.connect(gn);gn.connect(audio.music);o.start(t);o.stop(t+.18)};
  const chord=(t,root,notes,dur,g=.018,type='triangle')=>notes.forEach((n,i)=>audio.osc(type,audio.midi(root+n),t,dur,g,audio.music,(i-(notes.length-1)/2)*4,(i-(notes.length-1)/2)/Math.max(1,notes.length-1)));

  audio.scheduleMusic=(step,t)=>{
    const a=selected(),l=layer(),p=areaAudio.profiles[a],s=step%16,bar=Math.floor(step/16),e=clamp(audio.energy,0,1),sync=clamp((game.sync||0)/100,0,1);
    if(a!==lastArea){lastArea=a;areaAudio.apply(a);}
    const density=.35+l*.12+e*.22;

    if(a===0){ // SIGNAL BIRTH: machine-grid techno that assembles in layers
      if(s===0||s===8||(l>=3&&s===12))audio.kick(t,s===0?.92:.62);
      if(s===4||s===12)audio.snare(t,.48+l*.04);
      if(l>=1&&s%2===0)audio.hat(t,.04+density*.035,s%4===2);
      if(l>=1&&[0,3,6,10,13].includes(s))audio.bass(t,p.root+p.scale[(bar+s)%p.scale.length],.09+e*.045);
      if(l>=2&&[2,6,10,14].includes(s))ping(t,p.root+24+p.scale[(bar+s/2)%p.scale.length|0],.018+e*.015,'square',(s-8)/10);
      if(l>=3&&s===0)chord(t,p.root+12,[0,7,12],audio.beatDur*3.2,.014+sync*.009,'sawtooth');
      if(l===4&&[1,5,9,13].includes(s))audio.pluck(t,p.root+36+p.scale[(bar+s)%p.scale.length],.025,.08,(s-7)/8);
    }else if(a===1){ // GLASS TEMPLE: angular half-time, resonant glass and suspended harmony
      if(s===0||(l>=2&&s===10))audio.kick(t,.72);
      if(s===8)audio.snare(t,.5);
      if(l>=1&&[2,6,10,14].includes(s))glass(t,p.root+24+p.scale[(bar+Math.floor(s/2))%p.scale.length],.016+e*.018);
      if(l>=1&&[0,5,9,13].includes(s))audio.bass(t,p.root-12+p.scale[(bar+s)%p.scale.length],.07+e*.035);
      if(l>=2&&s%4===3)audio.hat(t,.035+e*.02,true);
      if(l>=3&&s===0)chord(t,p.root+12,[0,5,12,17],audio.beatDur*3.6,.012+sync*.008,'sine');
      if(l===4&&[3,7,11,15].includes(s))glass(t,p.root+36+p.scale[(s+bar)%p.scale.length],.028+e*.014);
    }else if(a===2){ // CHROMA SEA: airy pulse, slow sub, drifting tones
      if(s===0||s===12)audio.kick(t,.46+l*.04);
      if(l>=2&&s===8)audio.snare(t,.28);
      if(s%4===2)air(t,.01+e*.016+l*.002);
      if(l>=1&&[0,6,10].includes(s))audio.bass(t,p.root-12+p.scale[(bar+s)%p.scale.length],.055+e*.025);
      if(l>=2&&[1,5,9,13].includes(s))ping(t,p.root+24+p.scale[(bar+Math.floor(s/4))%p.scale.length],.018+sync*.012,'sine',(s-7)/8);
      if(l>=3&&s===0)chord(t,p.root+12,[0,3,7,15],audio.beatDur*4.5,.011+sync*.008,'triangle');
      if(l===4&&s%2===1)air(t,.012+e*.012);
    }else if(a===3){ // ORGANIC CODE: fast asymmetrical percussion and elastic bass
      if([0,7,10].includes(s)||(l>=3&&s===14))audio.kick(t,.68+(s===0?.16:0));
      if([4,12].includes(s))audio.snare(t,.44+l*.04);
      if(l>=1&&s%2===1)ping(t,p.root+43+(s%3),.008+e*.01,'square',(s-7)/8);
      if([0,3,5,8,11,14].includes(s))audio.bass(t,p.root+p.scale[(bar+s)%p.scale.length],.075+e*.04);
      if(l>=2&&[2,6,10,15].includes(s))audio.pluck(t,p.root+24+p.scale[(s+bar)%p.scale.length],.022+e*.014,.075,(s-8)/8);
      if(l>=3&&s===0)chord(t,p.root+12,[0,5,9,16],audio.beatDur*2.7,.012+sync*.008,'sawtooth');
      if(l===4&&s%2===0)audio.hat(t,.032+e*.03,s%4===2);
    }else{ // NEURAL CATHEDRAL: driving ritual pulse + metallic choir
      if(s===0||s===6||s===10||(l>=3&&s===14))audio.kick(t,.72+(s===0?.2:0));
      if([4,12].includes(s))audio.snare(t,.5);
      if(l>=1&&s%2===1){ping(t,p.root+36+(s%4)*2,.011+e*.012,'square',(s-7)/8);ping(t,p.root+48+(s%3),.007+sync*.009,'sine',-(s-7)/8);}
      if([0,3,7,10,13].includes(s))audio.bass(t,p.root-12+p.scale[(bar+s)%p.scale.length],.082+e*.045);
      if(l>=2&&[2,5,9,14].includes(s))audio.pluck(t,p.root+24+p.scale[(bar+s)%p.scale.length],.02+sync*.014,.08,(s-8)/8);
      if(l>=3&&s===0)chord(t,p.root+12,[0,6,10,13],audio.beatDur*3.8,.014+sync*.009,l===4?'sawtooth':'triangle');
      if(l===4&&s%2===0)audio.hat(t,.035+e*.032,true);
    }

    if(l>=3&&e>.72&&s===15)audio.riserTick(t,.045+e*.035);
    if(s===0)audio.duck(t,.08+Math.min(.12,l*.025));
  };

  window.__pulseAreaArranger={
    get area(){return selected()+1;},
    get layer(){return layer()+1;},
    stats:()=>({area:selected()+1,layer:layer()+1,profile:areaAudio.profiles[selected()]?.name||'',bpm:areaAudio.profiles[selected()]?.bpm||0})
  };
});
