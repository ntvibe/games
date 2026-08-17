(() => {
  "use strict";

  const $ = (s) => document.querySelector(s);
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const characterStage = $("#characterStage");
  const playfield = $("#playfield");
  const optionsEl = $("#options");
  const stepTitle = $("#stepTitle");
  const stepCounter = $("#stepCounter");
  const stepHint = $("#stepHint");
  const applyHint = $("#applyHint");
  const coverageWrap = $(".coverage-wrap");
  const coverageText = $("#coverageText");
  const coverageFill = $("#coverageFill");
  const nextButton = $("#nextButton");
  const backButton = $("#backButton");
  const fullscreenButton = $("#fullscreenButton");
  const finishPanel = $("#finishPanel");
  const replayButton = $("#replayButton");
  const brushCursor = $("#brushCursor");
  const dabLayer = $("#dabLayer");
  const backdrop = $("#backdrop");
  const blinkOverlay = $("#blinkOverlay");
  const leftIris = $("#leftMovingIris");
  const rightIris = $("#rightMovingIris");

  const overlays = {
    gems: $("#gemsOverlay"),
    earrings: $("#earringsOverlay"),
    necklace: $("#necklaceOverlay"),
    hairclip: $("#hairclipOverlay"),
    tiara: $("#tiaraOverlay"),
    sparkles: $("#sparkleOverlay")
  };

  let ATLAS = "";
  const ATLAS_PARTS = Array.from({ length: 6 }, (_, index) =>
    `./assets/atlas.${String(index).padStart(2, "0")}.b64`
  );

  async function loadAtlas() {
    const parts = await Promise.all(ATLAS_PARTS.map(async (path) => {
      const response = await fetch(path);
      if (!response.ok) throw new Error(`Could not load ${path}`);
      return (await response.text()).trim();
    }));
    const binary = atob(parts.join(""));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    ATLAS = URL.createObjectURL(new Blob([bytes], { type: "image/webp" }));
  }
  const ATLAS_W = 1024;
  const ATLAS_H = 1024;
  const SPRITES = {
    "sparkles": {x:10,y:10,w:360,h:192},
    "necklace-heart": {x:380,y:10,w:160,h:130},
    "necklace-gem": {x:550,y:10,w:160,h:130},
    "necklace-star": {x:720,y:10,w:160,h:130},
    "hairclip-bow": {x:10,y:212,w:164,h:114},
    "tiara-pink": {x:184,y:212,w:239,h:110},
    "tiara-blue": {x:433,y:212,w:242,h:109},
    "tiara-gold": {x:685,y:212,w:260,h:106},
    "hairclip-flower": {x:10,y:336,w:180,h:100},
    "hairclip-star": {x:200,y:336,w:141,h:89},
    "earrings-pearl": {x:351,y:336,w:210,h:75},
    "earrings-star": {x:571,y:336,w:210,h:75},
    "earrings-heart": {x:791,y:336,w:210,h:75},
    "gems-royal": {x:10,y:446,w:280,h:72},
    "gems-butterfly": {x:300,y:446,w:280,h:70},
    "gems-celestial": {x:590,y:446,w:280,h:68}
  };

  function mountSprite(container, name) {
    const r = SPRITES[name];
    if (!r) return;
    container.replaceChildren();
    container.style.aspectRatio = `${r.w} / ${r.h}`;
    const img = document.createElement("img");
    img.src = ATLAS;
    img.alt = "";
    img.draggable = false;
    img.style.width = `${ATLAS_W / r.w * 100}%`;
    img.style.left = `${-r.x / r.w * 100}%`;
    img.style.top = `${-r.y / r.h * 100}%`;
    container.appendChild(img);
  }

  const steps = [
    { id:"foundation", title:"Foundation", hint:"Pick a shade, then gently brush over the face.", mode:"brush", zones:[[380,354,155]], options:[
      {label:"Peach",color:"#eab38f"},{label:"Honey",color:"#d99a77"},{label:"Rose",color:"#efb19f"}] },
    { id:"brows", title:"Brows", hint:"Brush along both brows.", mode:"brush", zones:[[302,262,55],[456,262,55]], options:[
      {label:"Cocoa",color:"#704532"},{label:"Soft",color:"#9b6c50"},{label:"Plum",color:"#65445e"}] },
    { id:"eyeshadow", title:"Eye Shadow", hint:"Sweep color softly over both eyelids.", mode:"brush", zones:[[304,310,58],[454,309,58]], options:[
      {label:"Lilac",color:"#b68ae8"},{label:"Pink",color:"#ef8dbd"},{label:"Sky",color:"#79cfe8"}] },
    { id:"eyeliner", title:"Eyeliner", hint:"Trace close to both eyes.", mode:"brush", zones:[[304,325,59],[454,324,59]], options:[
      {label:"Black",color:"#33232f"},{label:"Brown",color:"#704a3d"},{label:"Violet",color:"#644c99"}] },
    { id:"mascara", title:"Mascara", hint:"Brush the upper lashes on both eyes.", mode:"brush", zones:[[304,316,57],[454,315,57]], options:[
      {label:"Midnight",color:"#241c25"},{label:"Cocoa",color:"#5a4037"},{label:"Plum",color:"#563b56"}] },
    { id:"blush", title:"Blush", hint:"Add a little color to both cheeks.", mode:"brush", zones:[[282,386,55],[477,385,55]], options:[
      {label:"Rosy",color:"#ef7d9c"},{label:"Peach",color:"#f39a7e"},{label:"Berry",color:"#d96f9c"}] },
    { id:"highlight", title:"Highlighter", hint:"Tap the cheeks and nose for a magical glow.", mode:"brush", zones:[[292,357,42],[468,357,42],[380,362,42]], options:[
      {label:"Pearl",color:"#fff7dd"},{label:"Pink",color:"#ffd9e7"},{label:"Gold",color:"#ffe8a8"}] },
    { id:"freckles", title:"Freckles", hint:"Dab across the nose and cheeks.", mode:"brush", zones:[[380,375,90]], options:[
      {label:"Honey",color:"#b86e55"},{label:"Cocoa",color:"#86513f"},{label:"Rose",color:"#c77872"}] },
    { id:"lipstick", title:"Lipstick", hint:"Brush color over the lips.", mode:"brush", zones:[[380,432,60]], options:[
      {label:"Berry",color:"#c84f72"},{label:"Pink",color:"#ed6ba2"},{label:"Coral",color:"#ea765f"}] },
    { id:"gloss", title:"Lip Gloss", hint:"Swipe across the lips for shine.", mode:"brush", zones:[[380,432,60]], options:[
      {label:"Crystal",color:"#ffffff"},{label:"Pink",color:"#ffe3f1"},{label:"Gold",color:"#fff0b4"}] },
    { id:"gems", title:"Face Gems", hint:"Choose a magical gem design.", mode:"pick", options:[
      {label:"Royal",sprite:"gems-royal"},{label:"Butterfly",sprite:"gems-butterfly"},{label:"Moonlight",sprite:"gems-celestial"}] },
    { id:"earrings", title:"Earrings", hint:"Pick a pair that sparkles.", mode:"pick", options:[
      {label:"Pearls",sprite:"earrings-pearl"},{label:"Hearts",sprite:"earrings-heart"},{label:"Stars",sprite:"earrings-star"}] },
    { id:"necklace", title:"Necklace", hint:"Choose a necklace for the look.", mode:"pick", options:[
      {label:"Gem",sprite:"necklace-gem"},{label:"Heart",sprite:"necklace-heart"},{label:"Star",sprite:"necklace-star"}] },
    { id:"hairclip", title:"Hair Clip", hint:"Add something fun to her hair.", mode:"pick", options:[
      {label:"Flower",sprite:"hairclip-flower"},{label:"Bow",sprite:"hairclip-bow"},{label:"Star",sprite:"hairclip-star"}] },
    { id:"tiara", title:"Tiara", hint:"Every makeover deserves a crown.", mode:"pick", options:[
      {label:"Gold",sprite:"tiara-gold"},{label:"Crystal",sprite:"tiara-blue"},{label:"Pink",sprite:"tiara-pink"}] },
    { id:"eyes", title:"Eye Color", hint:"Choose a magical eye color.", mode:"pick", options:[
      {label:"Ocean",color:"linear-gradient(135deg,#9ff8ff,#2472ce)",value:"blue"},{label:"Violet",color:"linear-gradient(135deg,#d9b5ff,#6648cb)",value:"violet"},{label:"Emerald",color:"linear-gradient(135deg,#a6f6cb,#2f9f75)",value:"green"}] },
    { id:"background", title:"Backdrop", hint:"Choose the studio backdrop.", mode:"pick", options:[
      {label:"Rose",color:"linear-gradient(135deg,#ffd8e8,#d9c9ff)",value:"rose"},{label:"Sky",color:"linear-gradient(135deg,#d6f5ff,#ddd0ff)",value:"sky"},{label:"Mint",color:"linear-gradient(135deg,#dff8e9,#d7e8ff)",value:"mint"}] },
    { id:"sparkles", title:"Magic Sparkles", hint:"Add the final shower of sparkle.", mode:"pick", options:[
      {label:"Soft",color:"#fff1a6",value:"soft",icon:"✨"},{label:"Bright",color:"#ffbfe0",value:"bright",icon:"✦"},{label:"Frost",color:"#a9efff",value:"frost",icon:"❄"}] }
  ];

  const state = steps.map(() => ({ selected:null, coverage:0 }));
  let currentStep = 0;
  let pointerDown = false;
  let activePointerId = null;
  let lastApplyAt = 0;
  let blinkTimer = null;

  const setOpacity = (selector, value) => { const n=$(selector); if(n) n.setAttribute("opacity", String(value)); };
  const opacityFromCoverage = (coverage, min=.2) => clamp(min + (coverage/100)*(1-min), min, 1);

  function setEyePalette(value) {
    const palette = value === "violet"
      ? ["#d9b5ff","#8f73ff","#513a9c"]
      : value === "green"
        ? ["#b9ffe0","#49ca9a","#176b59"]
        : ["#9ff8ff","#45c8ff","#18336e"];
    [leftIris,rightIris].forEach(group => {
      const disk=group.querySelector("circle");
      disk.setAttribute("fill", palette[1]);
      disk.setAttribute("stroke", palette[2]);
    });
  }

  function setAsset(node, sprite) {
    mountSprite(node, sprite);
    node.classList.add("visible");
  }

  function applyVisual(step, option, coverage=100) {
    const opacity = opacityFromCoverage(coverage);
    switch(step.id) {
      case "foundation":
        $("#foundationTint").setAttribute("fill",option.color); setOpacity("#foundationTint",Math.min(.24,opacity*.24)); break;
      case "brows":
        $("#browsGroup").setAttribute("stroke",option.color); setOpacity("#browsGroup",Math.min(.88,opacity)); break;
      case "eyeshadow":
        $("#leftShadow").setAttribute("fill",option.color); $("#rightShadow").setAttribute("fill",option.color); setOpacity("#eyeShadowGroup",Math.min(.52,opacity*.52)); break;
      case "eyeliner":
        $("#eyelinerGroup").setAttribute("stroke",option.color); setOpacity("#eyelinerGroup",Math.min(.95,opacity)); break;
      case "mascara":
        $("#mascaraGroup").setAttribute("stroke",option.color); setOpacity("#mascaraGroup",Math.min(.95,opacity)); break;
      case "blush":
        $("#leftBlush").setAttribute("fill",option.color); $("#rightBlush").setAttribute("fill",option.color); setOpacity("#blushGroup",Math.min(.42,opacity*.42)); break;
      case "highlight":
        $("#highlightGroup").setAttribute("fill",option.color); setOpacity("#highlightGroup",Math.min(.55,opacity*.55)); break;
      case "freckles":
        $("#frecklesGroup").setAttribute("fill",option.color); setOpacity("#frecklesGroup",opacity); break;
      case "lipstick":
        $("#upperLip").setAttribute("fill",option.color); $("#lowerLip").setAttribute("fill",option.color); setOpacity("#lipsOverlay",Math.min(.78,opacity*.78)); break;
      case "gloss":
        $("#lipGloss").setAttribute("stroke",option.color); setOpacity("#lipGloss",Math.min(.9,opacity*.9)); break;
      case "gems": setAsset(overlays.gems,option.sprite); break;
      case "earrings": setAsset(overlays.earrings,option.sprite); break;
      case "necklace": setAsset(overlays.necklace,option.sprite); break;
      case "hairclip": setAsset(overlays.hairclip,option.sprite); break;
      case "tiara": setAsset(overlays.tiara,option.sprite); break;
      case "eyes": setEyePalette(option.value); break;
      case "background": backdrop.className=`backdrop backdrop-${option.value}`; break;
      case "sparkles":
        setAsset(overlays.sparkles,"sparkles");
        overlays.sparkles.style.filter = option.value === "frost" ? "hue-rotate(150deg) saturate(1.2)" : option.value === "bright" ? "saturate(1.4) brightness(1.08)" : "none";
        break;
    }
  }

  function renderStep() {
    const step=steps[currentStep], s=state[currentStep];
    stepCounter.textContent=`${currentStep+1} / ${steps.length}`;
    stepTitle.textContent=step.title;
    stepHint.textContent=step.hint;
    backButton.disabled=currentStep===0;
    nextButton.textContent=currentStep===steps.length-1?"Finish ✨":"Next ✨";
    coverageWrap.classList.toggle("hidden",step.mode!=="brush");
    optionsEl.innerHTML="";
    step.options.forEach((option,index)=>{
      const b=document.createElement("button");
      b.type="button";
      b.className="option-card"+(s.selected===index?" selected":"");
      b.setAttribute("role","listitem");
      b.setAttribute("aria-label",option.label);
      const swatch=document.createElement("span");
      swatch.className="option-swatch";
      swatch.style.setProperty("--swatch",option.color||"rgba(255,255,255,.68)");
      if(option.sprite){
        const thumb=document.createElement("span"); thumb.className="sprite-thumb"; mountSprite(thumb,option.sprite);
        const r=SPRITES[option.sprite];
        if(r.w>=r.h){thumb.style.width="100%";thumb.style.height="auto";}else{thumb.style.width="auto";thumb.style.height="100%";}
        swatch.appendChild(thumb);
      } else { swatch.textContent=option.icon||""; }
      const label=document.createElement("span"); label.className="option-label"; label.textContent=option.label;
      b.append(swatch,label);
      b.addEventListener("pointerdown",e=>lookAtClient(e.clientX,e.clientY));
      b.addEventListener("click",()=>selectOption(index));
      optionsEl.appendChild(b);
    });
    updateProgressUI();
  }

  function selectOption(index) {
    const step=steps[currentStep], s=state[currentStep];
    s.selected=index;
    if(step.mode==="pick") s.coverage=100;
    const option=step.options[index];
    applyVisual(step,option,step.mode==="pick"?100:Math.max(s.coverage,12));
    brushCursor.style.setProperty("--brush-color", option.color && !option.color.startsWith("linear") ? option.color : "#ff9ac6");
    [...optionsEl.children].forEach((n,i)=>n.classList.toggle("selected",i===index));
    updateProgressUI();
  }

  function updateProgressUI() {
    const step=steps[currentStep], s=state[currentStep];
    const has=s.selected!==null;
    const ready=step.mode==="pick"?has:(has&&s.coverage>=38);
    coverageText.textContent=`${Math.round(s.coverage)}%`;
    coverageFill.style.width=`${s.coverage}%`;
    nextButton.disabled=!ready;
    applyHint.classList.toggle("ready",ready);
    if(!has) applyHint.textContent="Choose a style below";
    else if(step.mode==="brush"&&!ready) applyHint.textContent="Touch and brush the highlighted area";
    else if(step.mode==="brush") applyHint.textContent="Lovely! Add more or continue ✨";
    else applyHint.textContent="Great choice! ✨";
  }

  function clientToStage(x,y) {
    const r=characterStage.getBoundingClientRect();
    return {x:(x-r.left)/r.width*760,y:(y-r.top)/r.height*950};
  }
  function pointHitsZones(point,zones) {
    return zones.some(([x,y,r])=>{const dx=point.x-x,dy=point.y-y;return dx*dx+dy*dy<=r*r;});
  }
  function addDab(x,y,color) {
    const r=playfield.getBoundingClientRect();
    const dab=document.createElement("span"); dab.className="brush-dab";
    dab.style.left=`${x-r.left}px`; dab.style.top=`${y-r.top}px`; dab.style.setProperty("--dab-color",color||"#ff9ac6");
    dabLayer.appendChild(dab); setTimeout(()=>dab.remove(),460);
  }
  function tryApply(event,strong=false) {
    const step=steps[currentStep], s=state[currentStep];
    if(step.mode!=="brush"||s.selected===null) return;
    const now=performance.now(); if(!strong&&now-lastApplyAt<28) return; lastApplyAt=now;
    const p=clientToStage(event.clientX,event.clientY); if(!pointHitsZones(p,step.zones)) return;
    s.coverage=clamp(s.coverage+(strong?13:4.5),0,100);
    const option=step.options[s.selected]; applyVisual(step,option,s.coverage); addDab(event.clientX,event.clientY,option.color); updateProgressUI();
  }
  function setCursor(event,visible) { brushCursor.style.left=`${event.clientX}px`; brushCursor.style.top=`${event.clientY}px`; brushCursor.classList.toggle("visible",visible); }

  characterStage.addEventListener("pointerdown",event=>{
    const step=steps[currentStep];
    if(step.mode!=="brush") { lookAtClient(event.clientX,event.clientY); return; }
    pointerDown=true; activePointerId=event.pointerId; characterStage.setPointerCapture?.(event.pointerId); setCursor(event,true); tryApply(event,true); event.preventDefault();
  });
  characterStage.addEventListener("pointermove",event=>{
    lookAtClient(event.clientX,event.clientY);
    setCursor(event,state[currentStep].selected!==null&&steps[currentStep].mode==="brush");
    if(pointerDown&&activePointerId===event.pointerId) tryApply(event);
  });
  const endPointer=(event)=>{if(activePointerId!==null&&event.pointerId!==activePointerId)return;pointerDown=false;activePointerId=null;brushCursor.classList.remove("visible");};
  characterStage.addEventListener("pointerup",endPointer); characterStage.addEventListener("pointercancel",endPointer); characterStage.addEventListener("pointerleave",()=>{if(!pointerDown)brushCursor.classList.remove("visible");});

  function lookAtClient(clientX,clientY) {
    const r=characterStage.getBoundingClientRect(); if(!r.width||!r.height)return;
    const cx=r.left+r.width*.5, cy=r.top+r.height*.34;
    const dx=clamp((clientX-cx)/(r.width*.44),-1,1); const dy=clamp((clientY-cy)/(r.height*.36),-1,1);
    const tx=(dx*5.5).toFixed(2), ty=(dy*4.2).toFixed(2);
    leftIris.setAttribute("transform",`translate(${tx} ${ty})`); rightIris.setAttribute("transform",`translate(${tx} ${ty})`);
  }
  window.addEventListener("pointermove",e=>lookAtClient(e.clientX,e.clientY),{passive:true});
  window.addEventListener("pointerdown",e=>lookAtClient(e.clientX,e.clientY),{passive:true});

  function blink() {
    blinkOverlay.classList.remove("blinking"); void blinkOverlay.offsetWidth; blinkOverlay.classList.add("blinking");
    scheduleBlink();
  }
  function scheduleBlink() { clearTimeout(blinkTimer); blinkTimer=setTimeout(blink,2300+Math.random()*3900); }

  nextButton.addEventListener("click",()=>{
    if(nextButton.disabled)return;
    if(currentStep===steps.length-1){finishPanel.hidden=false;overlays.sparkles.classList.add("visible");return;}
    currentStep++; renderStep();
  });
  backButton.addEventListener("click",()=>{if(currentStep===0)return;currentStep--;renderStep();});
  fullscreenButton.addEventListener("click",async()=>{try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen?.();else await document.exitFullscreen?.();}catch(_){}});
  replayButton.addEventListener("click",()=>window.location.reload());
  document.addEventListener("visibilitychange",()=>{if(document.hidden)brushCursor.classList.remove("visible");});

  async function startGame() {
    try {
      await loadAtlas();
    } catch (error) {
      console.error("Accessory art failed to load:", error);
    }
    renderStep();
    scheduleBlink();
  }

  startGame();
})();
