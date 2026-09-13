(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const portrait = document.getElementById('portrait');
  const pctx = portrait.getContext('2d');

  const ui = {
    startCard: document.getElementById('startCard'),
    finishCard: document.getElementById('finishCard'),
    introText: document.getElementById('introText'),
    friendName: document.getElementById('friendName'),
    avatarDot: document.getElementById('avatarDot'),
    memoryCount: document.getElementById('memoryCount'),
    memoryGoal: document.getElementById('memoryGoal'),
    prompt: document.getElementById('prompt'),
    actionBtn: document.getElementById('actionBtn'),
    startBtn: document.getElementById('startBtn'),
    rerollBtn: document.getElementById('rerollBtn'),
    soundBtn: document.getElementById('soundBtn'),
    keepPlayingBtn: document.getElementById('keepPlayingBtn'),
    newDayBtn: document.getElementById('newDayBtn'),
    finishTitle: document.getElementById('finishTitle'),
    finishText: document.getElementById('finishText'),
    joystick: document.getElementById('joystick'),
    stick: document.getElementById('stick')
  };

  const WORLD = { w: 1280, h: 820 };
  const camera = { x: 0, y: 0, scale: 1 };
  const keys = new Set();
  const touchMove = { x: 0, y: 0, active: false, pointerId: null };

  const names = ['Mia','Leo','Lina','Noah','Nina','Milo','Luca','Maya','Eli','Zoe','Tobi','Leni','Ari','Ivy','Max','Niko'];
  const skins = ['#f2c5a0','#d99a73','#b86e4b','#8a4f32','#f0b98f'];
  const hairs = ['#4a2f26','#8a552e','#d8a24b','#271d1a','#8e3f37','#e2c89e'];
  const shirts = ['#f56f76','#5ab7df','#ffd05b','#8fcf6c','#9a7ee8','#ef8ac4','#f09256'];
  const shorts = ['#38566e','#684c8c','#356b57','#7d5b40','#444c67'];

  let friend = null;
  let started = false;
  let completed = false;
  let soundOn = true;
  let audioCtx = null;
  let last = performance.now();
  let nearest = null;
  let particles = [];

  const player = { x: 620, y: 620, r: 22, speed: 205, facing: 1, bob: 0, lockedUntil: 0 };
  const memories = new Set();
  const GOAL = 5;

  const interactables = [
    { id:'swing', label:'Swing high', x:258, y:224, radius:72, color:'#ef6e8b', action:'SWING' },
    { id:'slide', label:'Zoom down the slide', x:498, y:215, radius:82, color:'#f5a348', action:'SLIDE' },
    { id:'sandbox', label:'Build a sandcastle', x:760, y:247, radius:92, color:'#e9c66a', action:'BUILD' },
    { id:'seesaw', label:'Bounce on the seesaw', x:1010, y:245, radius:82, color:'#7d99dd', action:'BOUNCE' },
    { id:'ball', label:'Kick the ball', x:390, y:545, radius:68, color:'#ffffff', action:'KICK' },
    { id:'ducks', label:'Say hello to the ducks', x:1030, y:580, radius:92, color:'#f0c94f', action:'QUACK' }
  ];

  const trees = [
    [105,110,1.05],[185,520,.92],[1135,108,1],[1190,710,1.08],[650,70,.8],[865,690,.9],[620,730,.76],[65,700,.86],[1160,395,.7]
  ];
  const flowers = Array.from({length:55},(_,i)=>({
    x: 45 + ((i*173)%1180), y: 70 + ((i*97)%690), c:['#fff','#ff8ca5','#ffd658','#8c78dc'][i%4], s: 2+(i%3)
  }));

  function rand(arr){ return arr[(Math.random()*arr.length)|0]; }
  function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
  function lerp(a,b,t){ return a+(b-a)*t; }

  function newFriend(){
    friend = {
      name: rand(names), skin: rand(skins), hair: rand(hairs), shirt: rand(shirts), shorts: rand(shorts),
      hairStyle: (Math.random()*4)|0, freckles: Math.random()>.55
    };
    ui.introText.textContent = `Meet ${friend.name}. Pick five fun things to do together in the park.`;
    ui.friendName.textContent = friend.name;
    ui.avatarDot.style.background = friend.shirt;
    drawPortrait();
  }

  function drawPortrait(){
    const w=portrait.width,h=portrait.height;
    pctx.clearRect(0,0,w,h);
    pctx.fillStyle='#dff2c9'; pctx.beginPath(); pctx.arc(w/2,h/2,80,0,Math.PI*2); pctx.fill();
    drawKid(pctx,w/2,h/2+19,2.25,1,friend,true);
  }

  function resize(){
    const dpr=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.floor(innerWidth*dpr);
    canvas.height=Math.floor(innerHeight*dpr);
    canvas.style.width=innerWidth+'px'; canvas.style.height=innerHeight+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
    camera.scale=Math.min(innerWidth/WORLD.w, innerHeight/WORLD.h);
    camera.scale=Math.max(camera.scale, Math.min(1.25, innerWidth<700 ? .72 : .82));
  }

  function updateCamera(){
    const viewW=innerWidth/camera.scale, viewH=innerHeight/camera.scale;
    const targetX=clamp(player.x-viewW/2,0,Math.max(0,WORLD.w-viewW));
    const targetY=clamp(player.y-viewH/2,0,Math.max(0,WORLD.h-viewH));
    camera.x=lerp(camera.x,targetX,.08); camera.y=lerp(camera.y,targetY,.08);
  }

  function roundedRect(c,x,y,w,h,r){
    r=Math.min(r,w/2,h/2); c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath();
  }

  function drawWorld(time){
    ctx.save(); ctx.scale(camera.scale,camera.scale); ctx.translate(-camera.x,-camera.y);
    ctx.fillStyle='#8fce72'; ctx.fillRect(0,0,WORLD.w,WORLD.h);

    ctx.fillStyle='#83c568';
    for(let i=0;i<12;i++){ctx.beginPath();ctx.ellipse(90+i*112,130+(i%3)*235,85,42,.2,0,Math.PI*2);ctx.fill();}

    ctx.lineCap='round'; ctx.lineJoin='round';
    ctx.strokeStyle='#eadbbf'; ctx.lineWidth=92;
    ctx.beginPath(); ctx.moveTo(-50,420); ctx.bezierCurveTo(220,370,350,650,610,585); ctx.bezierCurveTo(830,530,965,430,1325,445); ctx.stroke();
    ctx.strokeStyle='#f3e6cb'; ctx.lineWidth=76; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(650,860); ctx.bezierCurveTo(625,655,630,500,660,310); ctx.bezierCurveTo(680,180,700,90,710,-40); ctx.strokeStyle='#eadbbf'; ctx.lineWidth=76; ctx.stroke();
    ctx.strokeStyle='#f3e6cb'; ctx.lineWidth=62; ctx.stroke();

    drawPond(time);
    flowers.forEach(f=>drawFlower(f.x,f.y,f.c,f.s));
    trees.forEach(t=>drawTree(t[0],t[1],t[2],time));
    drawBench(153,360); drawBench(1078,390);
    drawSwing(258,224,time); drawSlide(498,215); drawSandbox(760,247); drawSeesaw(1010,245,time);
    drawBall(390,545,time); drawDucks(1030,580,time);
    drawSign(642,395);

    drawNpc(790,545,time,'#e47bb7','#3c657e');
    drawNpc(580,335,time+1200,'#69a8de','#76546a');

    particles.forEach(drawParticle);
    drawKid(ctx,player.x,player.y+Math.sin(player.bob)*2,1,player.facing,friend,false);
    ctx.restore();
  }

  function drawTree(x,y,s,time){
    ctx.save();ctx.translate(x,y);ctx.scale(s,s);
    ctx.fillStyle='#6f4b32';roundedRect(ctx,-11,20,22,58,8);ctx.fill();
    const sway=Math.sin(time*0.0008+x)*2;
    ctx.translate(sway,0);
    ctx.fillStyle='#4c9b54';ctx.beginPath();ctx.arc(-24,4,38,0,Math.PI*2);ctx.arc(20,-7,42,0,Math.PI*2);ctx.arc(3,-35,40,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#70b85e';ctx.beginPath();ctx.arc(-8,-18,24,0,Math.PI*2);ctx.fill();ctx.restore();
  }

  function drawFlower(x,y,c,s){ctx.strokeStyle='#4f9a51';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+7);ctx.stroke();ctx.fillStyle=c;for(let a=0;a<4;a++){ctx.beginPath();ctx.arc(x+Math.cos(a*Math.PI/2)*s,y+Math.sin(a*Math.PI/2)*s,s,0,Math.PI*2);ctx.fill();}}
  function drawBench(x,y){ctx.fillStyle='#7b5738';roundedRect(ctx,x-48,y-8,96,15,6);ctx.fill();roundedRect(ctx,x-42,y-30,84,15,6);ctx.fill();ctx.fillRect(x-32,y+6,8,22);ctx.fillRect(x+24,y+6,8,22)}
  function drawSign(x,y){ctx.fillStyle='#8f603d';ctx.fillRect(x-5,y,10,56);ctx.fillStyle='#fff2c9';roundedRect(ctx,x-58,y-38,116,46,10);ctx.fill();ctx.fillStyle='#527157';ctx.font='900 14px system-ui';ctx.textAlign='center';ctx.fillText('PLAYGROUND',x,y-10);ctx.textAlign='start'}

  function drawPond(time){
    ctx.fillStyle='#5bb9cd';ctx.beginPath();ctx.ellipse(1060,620,162,115,-.12,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#7ed0db';ctx.lineWidth=7;ctx.beginPath();ctx.ellipse(1060,620,132+Math.sin(time*.001)*4,86,-.12,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='#a9d673';for(let i=0;i<7;i++){ctx.beginPath();ctx.ellipse(945+i*34,610+(i%2)*52,14,8,i*.4,0,Math.PI*2);ctx.fill();}
  }
  function drawDucks(x,y,time){for(let i=0;i<3;i++){const dx=x+(i-1)*44+Math.sin(time*.001+i)*8,dy=y+(i%2)*32;ctx.fillStyle='#f3d45b';ctx.beginPath();ctx.ellipse(dx,dy,18,12,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(dx+13,dy-10,9,0,Math.PI*2);ctx.fill();ctx.fillStyle='#e58b3b';ctx.beginPath();ctx.moveTo(dx+20,dy-10);ctx.lineTo(dx+31,dy-6);ctx.lineTo(dx+21,dy-3);ctx.fill();ctx.fillStyle='#253d35';ctx.beginPath();ctx.arc(dx+16,dy-13,1.8,0,Math.PI*2);ctx.fill();}}

  function drawSwing(x,y,time){
    ctx.strokeStyle='#5a7480';ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(x-72,y+60);ctx.lineTo(x-48,y-70);ctx.lineTo(x+48,y-70);ctx.lineTo(x+72,y+60);ctx.stroke();
    ctx.lineWidth=4;ctx.strokeStyle='#f2e6ca';const a=Math.sin(time*.0014)*.08;for(const ox of [-18,18]){ctx.beginPath();ctx.moveTo(x+ox,y-65);ctx.lineTo(x+ox+Math.sin(a)*18,y+25);ctx.stroke();}ctx.fillStyle='#ef6e8b';roundedRect(ctx,x-37,y+18,74,18,7);ctx.fill();
  }
  function drawSlide(x,y){ctx.fillStyle='#f5a348';ctx.beginPath();ctx.moveTo(x-25,y-70);ctx.lineTo(x+45,y+70);ctx.lineTo(x+80,y+70);ctx.lineTo(x+15,y-70);ctx.closePath();ctx.fill();ctx.strokeStyle='#5a7480';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(x-25,y-70);ctx.lineTo(x-75,y+65);ctx.moveTo(x-3,y-70);ctx.lineTo(x-52,y+65);ctx.stroke();ctx.fillStyle='#5cb8df';roundedRect(ctx,x-40,y-85,70,18,8);ctx.fill();}
  function drawSandbox(x,y){ctx.fillStyle='#b97a4c';roundedRect(ctx,x-92,y-70,184,140,18);ctx.fill();ctx.fillStyle='#e8c56b';roundedRect(ctx,x-78,y-56,156,112,13);ctx.fill();ctx.fillStyle='#d6924d';ctx.fillRect(x-8,y-3,38,30);ctx.beginPath();ctx.moveTo(x-16,y-3);ctx.lineTo(x+11,y-34);ctx.lineTo(x+40,y-3);ctx.fill();ctx.fillStyle='#6bb1d6';ctx.beginPath();ctx.arc(x-46,y+24,15,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#6bb1d6';ctx.lineWidth=5;ctx.beginPath();ctx.arc(x-46,y+6,10,Math.PI,0);ctx.stroke();}
  function drawSeesaw(x,y,time){const tilt=Math.sin(time*.0012)*.05;ctx.save();ctx.translate(x,y);ctx.rotate(tilt);ctx.fillStyle='#7d99dd';roundedRect(ctx,-96,-8,192,16,8);ctx.fill();ctx.fillStyle='#f0b54f';ctx.beginPath();ctx.moveTo(-12,7);ctx.lineTo(12,7);ctx.lineTo(0,46);ctx.closePath();ctx.fill();ctx.restore();}
  function drawBall(x,y,time){ctx.save();ctx.translate(x,y);ctx.rotate(time*.001);ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(0,0,22,0,Math.PI*2);ctx.fill();ctx.fillStyle='#4d6780';for(let i=0;i<5;i++){const a=i*Math.PI*2/5;ctx.beginPath();ctx.arc(Math.cos(a)*13,Math.sin(a)*13,5,0,Math.PI*2);ctx.fill();}ctx.restore();}

  function drawKid(c,x,y,s,face,data,portraitMode){
    if(!data) return;
    c.save();c.translate(x,y);c.scale(s*face,s);
    if(!portraitMode){c.fillStyle='#365d4d2d';c.beginPath();c.ellipse(0,26,25,9,0,0,Math.PI*2);c.fill();}
    c.strokeStyle=data.skin;c.lineWidth=9;c.lineCap='round';c.beginPath();c.moveTo(-9,19);c.lineTo(-10,37);c.moveTo(9,19);c.lineTo(10,37);c.stroke();
    c.strokeStyle='#f4f1e6';c.lineWidth=10;c.beginPath();c.moveTo(-13,39);c.lineTo(-2,39);c.moveTo(7,39);c.lineTo(18,39);c.stroke();
    c.fillStyle=data.shorts;roundedRect(c,-19,4,38,23,8);c.fill();c.fillStyle=data.shirt;roundedRect(c,-22,-29,44,40,14);c.fill();
    c.strokeStyle=data.skin;c.lineWidth=9;c.beginPath();c.moveTo(-19,-16);c.lineTo(-30,3);c.moveTo(19,-16);c.lineTo(30,1);c.stroke();
    c.fillStyle=data.skin;c.beginPath();c.arc(0,-48,26,0,Math.PI*2);c.fill();
    c.fillStyle=data.hair;c.beginPath();
    if(data.hairStyle===0){c.arc(0,-54,25,Math.PI,Math.PI*2);c.lineTo(25,-49);c.arc(0,-48,25,0,Math.PI,true);} 
    else if(data.hairStyle===1){c.arc(0,-57,24,Math.PI,Math.PI*2);for(let i=-18;i<=18;i+=9){c.arc(i,-68-Math.abs(i)*.12,8,0,Math.PI*2);}}
    else if(data.hairStyle===2){c.arc(0,-56,25,Math.PI,Math.PI*2);c.rect(-25,-58,8,25);c.rect(17,-58,8,25);} 
    else {c.arc(0,-57,24,Math.PI,Math.PI*2);c.arc(-20,-56,10,0,Math.PI*2);c.arc(20,-56,10,0,Math.PI*2);} c.fill();
    c.fillStyle='#263a35';c.beginPath();c.arc(-8,-48,2.2,0,Math.PI*2);c.arc(8,-48,2.2,0,Math.PI*2);c.fill();
    c.strokeStyle='#8c4f45';c.lineWidth=2;c.beginPath();c.arc(0,-42,7,.15,Math.PI-.15);c.stroke();
    if(data.freckles){c.fillStyle='#ad755e';for(const fx of [-12,-7,7,12]){c.beginPath();c.arc(fx,-41,1,0,Math.PI*2);c.fill();}}
    c.restore();
  }

  function drawNpc(x,y,time,shirt,shorts){
    const data={name:'',skin:'#dca17b',hair:'#56362a',shirt,shorts,hairStyle:1,freckles:false};
    drawKid(ctx,x,y+Math.sin(time*.002+x)*2,.78,Math.sin(time*.0005+x)>0?1:-1,data,false);
  }

  function drawParticle(p){ctx.globalAlpha=p.life;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}
  function burst(x,y,color,count=16){for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,sp=40+Math.random()*75;particles.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-35,life:1,size:3+Math.random()*4,color});}}

  function beep(type='happy'){
    if(!soundOn) return;
    try{
      audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();
      const now=audioCtx.currentTime; const o=audioCtx.createOscillator(); const g=audioCtx.createGain();
      o.type='sine'; o.frequency.setValueAtTime(type==='quack'?220:440,now); o.frequency.exponentialRampToValueAtTime(type==='quack'?150:660,now+.16);
      g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(.12,now+.02);g.gain.exponentialRampToValueAtTime(.0001,now+.22);o.connect(g).connect(audioCtx.destination);o.start(now);o.stop(now+.24);
    }catch(_){/* Audio is optional. */}
  }

  function interact(){
    if(!started || !nearest || performance.now()<player.lockedUntil) return;
    player.lockedUntil=performance.now()+650;
    const first=!memories.has(nearest.id); memories.add(nearest.id); ui.memoryCount.textContent=memories.size;
    burst(nearest.x,nearest.y,nearest.color,first?23:10); beep(nearest.id==='ducks'?'quack':'happy');
    if(nearest.id==='slide'){player.x=nearest.x+70;player.y=nearest.y+90;}
    if(nearest.id==='ball'){nearest.x=clamp(nearest.x+80*player.facing,100,1120);}
    if(first && memories.size>=GOAL && !completed){completed=true;setTimeout(showFinish,420);}
  }

  function showFinish(){
    ui.finishTitle.textContent=`${friend.name} had a brilliant day!`;
    ui.finishText.textContent=`You made ${memories.size} happy memories together. You can keep exploring or meet a new park buddy.`;
    ui.finishCard.classList.add('visible');
  }

  function resetDay(newBuddy=true){
    memories.clear();particles=[];completed=false;ui.memoryCount.textContent='0';player.x=620;player.y=620;nearest=null;
    if(newBuddy)newFriend();
  }

  function begin(){started=true;ui.startCard.classList.remove('visible');beep();}

  function movement(dt){
    if(!started || ui.finishCard.classList.contains('visible')) return;
    let dx=0,dy=0;
    if(keys.has('ArrowLeft')||keys.has('KeyA'))dx--;
    if(keys.has('ArrowRight')||keys.has('KeyD'))dx++;
    if(keys.has('ArrowUp')||keys.has('KeyW'))dy--;
    if(keys.has('ArrowDown')||keys.has('KeyS'))dy++;
    dx+=touchMove.x;dy+=touchMove.y;
    const l=Math.hypot(dx,dy);if(l>.08){dx/=Math.max(1,l);dy/=Math.max(1,l);const nx=player.x+dx*player.speed*dt,ny=player.y+dy*player.speed*dt;
      const pond=Math.hypot((nx-1060)/1.35,ny-620);
      if(pond>88){player.x=clamp(nx,35,WORLD.w-35);player.y=clamp(ny,45,WORLD.h-35);} player.facing=dx<-.08?-1:dx>.08?1:player.facing;player.bob+=dt*10;
    }
    nearest=null;let best=999;
    for(const item of interactables){const d=Math.hypot(player.x-item.x,player.y-item.y);if(d<item.radius&&d<best){best=d;nearest=item;}}
    if(nearest){ui.prompt.textContent=`E · ${nearest.label}`;ui.prompt.classList.remove('hidden');ui.actionBtn.textContent=memories.has(nearest.id)?'AGAIN':'PLAY';ui.actionBtn.classList.remove('hidden');}
    else{ui.prompt.classList.add('hidden');ui.actionBtn.classList.add('hidden');}
  }

  function updateParticles(dt){for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=110*dt;p.life-=dt*1.3;}particles=particles.filter(p=>p.life>0);}

  function loop(now){
    const dt=Math.min(.033,(now-last)/1000);last=now;
    movement(dt);updateParticles(dt);updateCamera();ctx.clearRect(0,0,innerWidth,innerHeight);drawWorld(now);requestAnimationFrame(loop);
  }

  addEventListener('resize',resize);
  addEventListener('keydown',e=>{keys.add(e.code);if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();if(e.code==='KeyE'||e.code==='Space')interact();});
  addEventListener('keyup',e=>keys.delete(e.code));
  ui.startBtn.addEventListener('click',begin); ui.rerollBtn.addEventListener('click',newFriend);
  ui.actionBtn.addEventListener('pointerdown',e=>{e.preventDefault();interact();});
  ui.soundBtn.addEventListener('click',()=>{soundOn=!soundOn;ui.soundBtn.textContent=soundOn?'♪':'×';if(soundOn)beep();});
  ui.keepPlayingBtn.addEventListener('click',()=>ui.finishCard.classList.remove('visible'));
  ui.newDayBtn.addEventListener('click',()=>{ui.finishCard.classList.remove('visible');resetDay(true);});

  function joystickPoint(e){
    const r=ui.joystick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let dx=e.clientX-cx,dy=e.clientY-cy;const max=36,l=Math.hypot(dx,dy);if(l>max){dx=dx/l*max;dy=dy/l*max;}touchMove.x=dx/max;touchMove.y=dy/max;ui.stick.style.transform=`translate(${dx}px,${dy}px)`;
  }
  ui.joystick.addEventListener('pointerdown',e=>{touchMove.active=true;touchMove.pointerId=e.pointerId;ui.joystick.setPointerCapture(e.pointerId);joystickPoint(e);});
  ui.joystick.addEventListener('pointermove',e=>{if(touchMove.active&&e.pointerId===touchMove.pointerId)joystickPoint(e);});
  const stopStick=e=>{if(e.pointerId!==touchMove.pointerId)return;touchMove.active=false;touchMove.pointerId=null;touchMove.x=touchMove.y=0;ui.stick.style.transform='translate(0,0)';};
  ui.joystick.addEventListener('pointerup',stopStick);ui.joystick.addEventListener('pointercancel',stopStick);

  ui.memoryGoal.textContent=GOAL;
  newFriend(); resize(); resetDay(false); updateCamera(); requestAnimationFrame(loop);
})();
