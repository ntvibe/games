(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const W = 760;
  const H = 950;

  const game = $("#game");
  const playfield = $("#playfield");
  const characterStage = $("#characterStage");
  const makeupLayers = $("#makeupLayers");
  const optionsEl = $("#options");
  const stepTitle = $("#stepTitle");
  const stepHint = $("#stepHint");
  const stepCounter = $("#stepCounter");
  const categoryName = $("#categoryName");
  const categoryRail = $("#categoryRail");
  const instructionChip = $("#instructionChip");
  const toolLabel = $("#toolLabel");
  const coverageWrap = $("#coverageWrap");
  const coverageFill = $("#coverageFill");
  const coverageText = $("#coverageText");
  const nextButton = $("#nextButton");
  const backButton = $("#backButton");
  const fullscreenButton = $("#fullscreenButton");
  const finishPanel = $("#finishPanel");
  const replayButton = $("#replayButton");
  const closeFinishButton = $("#closeFinishButton");
  const toolCursor = $("#toolCursor");
  const particleLayer = $("#particleLayer");
  const backdrop = $("#backdrop");
  const blinkOverlay = $("#blinkOverlay");
  const leftEyeRig = $("#leftEyeRig");
  const rightEyeRig = $("#rightEyeRig");
  const leftIrisTint = $("#leftIrisTint");
  const rightIrisTint = $("#rightIrisTint");

  const overlays = {
    gems: $("#gemsOverlay"),
    earrings: $("#earringsOverlay"),
    necklace: $("#necklaceOverlay"),
    hairclip: $("#hairclipOverlay"),
    tiara: $("#tiaraOverlay"),
    sparkles: $("#sparkleOverlay")
  };

  const CATEGORIES = ["Face", "Eyes", "Lips", "Style", "Finish"];
  const CATEGORY_INDEX = { Face: 0, Eyes: 1, Lips: 2, Style: 3, Finish: 4 };

  const steps = [
    {
      id: "foundation", category: "Face", title: "Foundation",
      hint: "Choose a shade, then sweep the sponge over the face.",
      mode: "brush", tool: "sponge", toolLabel: "Foundation sponge", brushSize: 72, threshold: 72,
      zones: [[380, 355, 137, 165]],
      options: [
        { label: "Peach", color: "#e7af91" },
        { label: "Honey", color: "#d69a79" },
        { label: "Rose", color: "#ebb2a4" }
      ]
    },
    {
      id: "blush", category: "Face", title: "Blush",
      hint: "Soft circles on both cheeks — a little goes a long way.",
      mode: "brush", tool: "brush", toolLabel: "Fluffy blush brush", brushSize: 62, threshold: 68,
      zones: [[286, 392, 55, 38], [474, 390, 55, 38]],
      options: [
        { label: "Rose", color: "#ed7e9e" },
        { label: "Peach", color: "#ef987c" },
        { label: "Berry", color: "#d86f9a" }
      ]
    },
    {
      id: "highlight", category: "Face", title: "Highlighter",
      hint: "Glide across the cheekbones and nose for a soft glow.",
      mode: "brush", tool: "brush", toolLabel: "Glow brush", brushSize: 48, threshold: 66,
      zones: [[292, 357, 45, 24], [468, 357, 45, 24], [381, 364, 23, 45]],
      options: [
        { label: "Pearl", color: "#fff8df" },
        { label: "Pink", color: "#ffe0ed" },
        { label: "Gold", color: "#ffe8a8" }
      ]
    },
    {
      id: "freckles", category: "Face", title: "Freckles",
      hint: "Tap lightly across the nose and upper cheeks.",
      mode: "brush", tool: "detail", toolLabel: "Freckle pen", brushSize: 42, threshold: 64,
      zones: [[380, 378, 86, 28]],
      options: [
        { label: "Honey", color: "#ae684f" },
        { label: "Cocoa", color: "#82503e" },
        { label: "Rose", color: "#bd756d" }
      ]
    },
    {
      id: "brows", category: "Eyes", title: "Brows",
      hint: "Follow each brow from the inner corner outward.",
      mode: "brush", tool: "detail", toolLabel: "Brow brush", brushSize: 42, threshold: 70,
      zones: [[302, 266, 61, 25], [456, 265, 61, 25]],
      options: [
        { label: "Cocoa", color: "#704836" },
        { label: "Soft", color: "#96694f" },
        { label: "Plum", color: "#65465e" }
      ]
    },
    {
      id: "eyeshadow", category: "Eyes", title: "Eye Shadow",
      hint: "Sweep gently across both upper eyelids.",
      mode: "brush", tool: "shadow", toolLabel: "Eye-shadow applicator", brushSize: 45, threshold: 68,
      zones: [[304, 309, 58, 27], [454, 308, 58, 27]],
      options: [
        { label: "Lilac", color: "#b58be6" },
        { label: "Pink", color: "#ea8bbb" },
        { label: "Sky", color: "#78c7e5" }
      ]
    },
    {
      id: "eyeliner", category: "Eyes", title: "Eyeliner",
      hint: "Trace the lash line slowly from inside to outside.",
      mode: "brush", tool: "liner", toolLabel: "Precision eyeliner", brushSize: 34, threshold: 70,
      zones: [[304, 327, 62, 20], [454, 326, 62, 20]],
      options: [
        { label: "Black", color: "#33252f" },
        { label: "Brown", color: "#694a40" },
        { label: "Violet", color: "#645099" }
      ]
    },
    {
      id: "mascara", category: "Eyes", title: "Mascara",
      hint: "Brush upward across the upper lashes on both eyes.",
      mode: "brush", tool: "mascara", toolLabel: "Mascara wand", brushSize: 35, threshold: 68,
      zones: [[304, 311, 58, 25], [454, 310, 58, 25]],
      options: [
        { label: "Midnight", color: "#241d24" },
        { label: "Cocoa", color: "#543c34" },
        { label: "Plum", color: "#523b52" }
      ]
    },
    {
      id: "eyes", category: "Eyes", title: "Eye Color",
      hint: "Pick a subtle eye color for the finished look.",
      mode: "pick", toolLabel: "Eye color",
      options: [
        { label: "Ocean", color: "linear-gradient(135deg,#9ff3ff,#42add9)", value: "blue" },
        { label: "Violet", color: "linear-gradient(135deg,#dbc4ff,#8068d7)", value: "violet" },
        { label: "Emerald", color: "linear-gradient(135deg,#b6f3d5,#4bad82)", value: "green" }
      ]
    },
    {
      id: "lipstick", category: "Lips", title: "Lipstick",
      hint: "Color inside the lips with the lipstick tip.",
      mode: "brush", tool: "lipstick", toolLabel: "Lipstick", brushSize: 34, threshold: 72,
      zones: [[380, 432, 58, 24]],
      options: [
        { label: "Berry", color: "#c84f72" },
        { label: "Pink", color: "#e9689e" },
        { label: "Coral", color: "#e97763" }
      ]
    },
    {
      id: "gloss", category: "Lips", title: "Lip Gloss",
      hint: "Swipe once across the center of the lips for shine.",
      mode: "brush", tool: "gloss", toolLabel: "Gloss wand", brushSize: 30, threshold: 66,
      zones: [[380, 434, 52, 18]],
      options: [
        { label: "Crystal", color: "#ffffff" },
        { label: "Pink", color: "#ffe3f0" },
        { label: "Gold", color: "#fff1b8" }
      ]
    },
    {
      id: "gems", category: "Style", title: "Face Gems",
      hint: "Choose one delicate gem design.", mode: "pick", toolLabel: "Gem picker",
      options: [
        { label: "Royal", sprite: "gems-royal" },
        { label: "Butterfly", sprite: "gems-butterfly" },
        { label: "Moonlight", sprite: "gems-celestial" }
      ]
    },
    {
      id: "earrings", category: "Style", title: "Earrings",
      hint: "Pick a pair that fits the look.", mode: "pick", toolLabel: "Jewelry",
      options: [
        { label: "Pearls", sprite: "earrings-pearl" },
        { label: "Hearts", sprite: "earrings-heart" },
        { label: "Stars", sprite: "earrings-star" }
      ]
    },
    {
      id: "necklace", category: "Style", title: "Necklace",
      hint: "Choose the finishing necklace.", mode: "pick", toolLabel: "Jewelry",
      options: [
        { label: "Gem", sprite: "necklace-gem" },
        { label: "Heart", sprite: "necklace-heart" },
        { label: "Star", sprite: "necklace-star" }
      ]
    },
    {
      id: "hairclip", category: "Style", title: "Hair Clip",
      hint: "Add one playful accent to her hair.", mode: "pick", toolLabel: "Hair accessory",
      options: [
        { label: "Flower", sprite: "hairclip-flower" },
        { label: "Bow", sprite: "hairclip-bow" },
        { label: "Star", sprite: "hairclip-star" }
      ]
    },
    {
      id: "tiara", category: "Style", title: "Tiara",
      hint: "Choose a crown for the final portrait.", mode: "pick", toolLabel: "Crown",
      options: [
        { label: "Gold", sprite: "tiara-gold" },
        { label: "Crystal", sprite: "tiara-blue" },
        { label: "Pink", sprite: "tiara-pink" }
      ]
    },
    {
      id: "background", category: "Style", title: "Backdrop",
      hint: "Choose the mood behind your finished look.", mode: "pick", toolLabel: "Studio backdrop",
      options: [
        { label: "Rose", color: "linear-gradient(135deg,#ffd8e8,#dfcfff)", value: "rose" },
        { label: "Sky", color: "linear-gradient(135deg,#d6f5ff,#ddd5ff)", value: "sky" },
        { label: "Mint", color: "linear-gradient(135deg,#dff8e9,#dceaff)", value: "mint" }
      ]
    },
    {
      id: "sparkles", category: "Finish", title: "Magic Sparkles",
      hint: "Choose one final shimmer — then reveal the finished look.", mode: "pick", toolLabel: "Finishing magic",
      options: [
        { label: "Soft", color: "#fff0a6", value: "soft", icon: "✨" },
        { label: "Bright", color: "#ffc1df", value: "bright", icon: "✦" },
        { label: "Frost", color: "#a8efff", value: "frost", icon: "❄" }
      ]
    }
  ];

  const state = steps.map(() => ({ selected: null, coverage: 0, celebrated: false }));
  const layerState = new Map();
  let currentStep = 0;
  let pointerDown = false;
  let activePointerId = null;
  let lastPoint = null;
  let blinkTimer = null;
  let atlasUrl = "";

  const ATLAS_PARTS = Array.from({ length: 6 }, (_, index) => `./assets/atlas.${String(index).padStart(2, "0")}.b64`);
  const ATLAS_W = 1024;
  const SPRITES = {
    sparkles: { x: 10, y: 10, w: 360, h: 192 },
    "necklace-heart": { x: 380, y: 10, w: 160, h: 130 },
    "necklace-gem": { x: 550, y: 10, w: 160, h: 130 },
    "necklace-star": { x: 720, y: 10, w: 160, h: 130 },
    "hairclip-bow": { x: 10, y: 212, w: 164, h: 114 },
    "tiara-pink": { x: 184, y: 212, w: 239, h: 110 },
    "tiara-blue": { x: 433, y: 212, w: 242, h: 109 },
    "tiara-gold": { x: 685, y: 212, w: 260, h: 106 },
    "hairclip-flower": { x: 10, y: 336, w: 180, h: 100 },
    "hairclip-star": { x: 200, y: 336, w: 141, h: 89 },
    "earrings-pearl": { x: 351, y: 336, w: 210, h: 75 },
    "earrings-star": { x: 571, y: 336, w: 210, h: 75 },
    "earrings-heart": { x: 791, y: 336, w: 210, h: 75 },
    "gems-royal": { x: 10, y: 446, w: 280, h: 72 },
    "gems-butterfly": { x: 300, y: 446, w: 280, h: 70 },
    "gems-celestial": { x: 590, y: 446, w: 280, h: 68 }
  };

  async function loadAtlas() {
    const parts = await Promise.all(ATLAS_PARTS.map(async (path) => {
      const response = await fetch(path);
      if (!response.ok) throw new Error(`Could not load ${path}`);
      return (await response.text()).trim();
    }));
    const binary = atob(parts.join(""));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    atlasUrl = URL.createObjectURL(new Blob([bytes], { type: "image/webp" }));
  }

  function mountSprite(container, name) {
    const rect = SPRITES[name];
    if (!rect || !atlasUrl) return;
    container.replaceChildren();
    container.style.aspectRatio = `${rect.w} / ${rect.h}`;
    const img = document.createElement("img");
    img.src = atlasUrl;
    img.alt = "";
    img.draggable = false;
    img.style.width = `${ATLAS_W / rect.w * 100}%`;
    img.style.left = `${-rect.x / rect.w * 100}%`;
    img.style.top = `${-rect.y / rect.h * 100}%`;
    container.appendChild(img);
  }

  function setAsset(node, sprite) {
    mountSprite(node, sprite);
    node.classList.remove("visible");
    requestAnimationFrame(() => node.classList.add("visible"));
    reactCharacter();
  }

  function setEyePalette(value) {
    const palette = value === "violet"
      ? ["#886bd9", "#33284f"]
      : value === "green"
        ? ["#4db784", "#214b3d"]
        : ["#4bbfe6", "#183348"];
    [leftIrisTint, rightIrisTint].forEach((iris) => iris.setAttribute("fill", palette[0]));
    [leftEyeRig, rightEyeRig].forEach((eye) => {
      const pupil = eye.querySelector("circle");
      if (pupil) pupil.setAttribute("fill", palette[1]);
    });
    reactCharacter();
  }

  function reactCharacter() {
    characterStage.classList.remove("react");
    void characterStage.offsetWidth;
    characterStage.classList.add("react");
  }

  function ellipseContains(x, y, zone) {
    const [cx, cy, rx, ry = rx] = zone;
    const dx = (x - cx) / rx;
    const dy = (y - cy) / ry;
    return dx * dx + dy * dy <= 1;
  }

  function buildSamples(step) {
    const samples = [];
    const spacing = step.id === "foundation" ? 18 : step.brushSize <= 35 ? 12 : 14;
    step.zones.forEach((zone) => {
      const [cx, cy, rx, ry = rx] = zone;
      for (let y = cy - ry; y <= cy + ry; y += spacing) {
        for (let x = cx - rx; x <= cx + rx; x += spacing) {
          if (ellipseContains(x, y, zone)) samples.push({ x, y });
        }
      }
    });
    return samples;
  }

  function makeCanvas(className, stepId) {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    if (className) canvas.className = className;
    if (stepId) canvas.dataset.step = stepId;
    return canvas;
  }

  function ensureLayer(step) {
    if (layerState.has(step.id)) return layerState.get(step.id);
    const output = makeCanvas("makeup-layer", step.id);
    const design = makeCanvas();
    const reveal = makeCanvas();
    makeupLayers.appendChild(output);
    const layer = {
      output,
      design,
      reveal,
      outCtx: output.getContext("2d"),
      designCtx: design.getContext("2d"),
      revealCtx: reveal.getContext("2d"),
      samples: buildSamples(step),
      painted: new Set(),
      color: null
    };
    layer.revealCtx.lineCap = "round";
    layer.revealCtx.lineJoin = "round";
    layerState.set(step.id, layer);
    return layer;
  }

  function drawLipShape(ctx, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(338, 425);
    ctx.bezierCurveTo(357, 412, 371, 413, 380, 420);
    ctx.bezierCurveTo(392, 411, 405, 414, 422, 425);
    ctx.bezierCurveTo(404, 431, 393, 432, 380, 430);
    ctx.bezierCurveTo(366, 432, 353, 431, 338, 425);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(339, 425);
    ctx.bezierCurveTo(356, 434, 369, 436, 380, 434);
    ctx.bezierCurveTo(394, 436, 407, 433, 421, 425);
    ctx.bezierCurveTo(407, 447, 394, 451, 380, 451);
    ctx.bezierCurveTo(364, 451, 350, 445, 339, 425);
    ctx.closePath();
    ctx.fill();
  }

  function renderDesign(step, color) {
    const layer = ensureLayer(step);
    const ctx = layer.designCtx;
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (step.id === "foundation") {
      const gradient = ctx.createRadialGradient(355, 315, 25, 380, 355, 185);
      gradient.addColorStop(0, color + "d9");
      gradient.addColorStop(1, color + "9e");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(380, 354, 141, 171, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath(); ctx.ellipse(304, 326, 60, 38, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(455, 325, 60, 38, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(380, 433, 57, 25, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = "source-over";
      layer.output.style.opacity = ".19";
    }

    if (step.id === "blush") {
      [[286, 392], [474, 390]].forEach(([x, y]) => {
        const g = ctx.createRadialGradient(x, y, 2, x, y, 54);
        g.addColorStop(0, color + "c7");
        g.addColorStop(.55, color + "75");
        g.addColorStop(1, color + "00");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(x, y, 57, 38, 0, 0, Math.PI * 2); ctx.fill();
      });
      layer.output.style.opacity = ".52";
    }

    if (step.id === "highlight") {
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 13;
      ctx.globalAlpha = .9;
      ctx.lineWidth = 12;
      ctx.beginPath(); ctx.moveTo(260, 362); ctx.quadraticCurveTo(290, 347, 320, 354); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(440, 354); ctx.quadraticCurveTo(470, 347, 500, 362); ctx.stroke();
      ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(381, 345); ctx.quadraticCurveTo(378, 365, 382, 386); ctx.stroke();
      layer.output.style.opacity = ".5";
    }

    if (step.id === "freckles") {
      ctx.fillStyle = color;
      const freckles = [
        [-51, 1, 2.5], [-40, -4, 1.8], [-31, 4, 2.2], [-21, -1, 1.7], [-11, 5, 2.1],
        [0, 0, 1.8], [11, 4, 2], [22, -1, 1.8], [32, 4, 2.2], [42, -4, 1.8], [52, 1, 2.4],
        [-61, 7, 1.5], [-48, 10, 1.6], [48, 10, 1.6], [61, 7, 1.5]
      ];
      freckles.forEach(([dx, dy, r]) => { ctx.beginPath(); ctx.arc(380 + dx, 377 + dy, r, 0, Math.PI * 2); ctx.fill(); });
      layer.output.style.opacity = ".72";
    }

    if (step.id === "brows") {
      ctx.strokeStyle = color;
      ctx.lineWidth = 8;
      ctx.globalAlpha = .9;
      ctx.beginPath(); ctx.moveTo(257, 269); ctx.quadraticCurveTo(301, 246, 344, 265); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(414, 265); ctx.quadraticCurveTo(456, 246, 502, 269); ctx.stroke();
      layer.output.style.opacity = ".9";
    }

    if (step.id === "eyeshadow") {
      ctx.fillStyle = color;
      ctx.globalAlpha = .72;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      [[304, 307], [454, 306]].forEach(([cx, cy]) => {
        ctx.beginPath();
        ctx.moveTo(cx - 57, cy + 13);
        ctx.quadraticCurveTo(cx, cy - 35, cx + 58, cy + 13);
        ctx.quadraticCurveTo(cx, cy - 3, cx - 57, cy + 13);
        ctx.closePath();
        ctx.fill();
      });
      layer.output.style.opacity = ".55";
    }

    if (step.id === "eyeliner") {
      ctx.strokeStyle = color;
      ctx.lineWidth = 5;
      ctx.globalAlpha = .92;
      ctx.beginPath(); ctx.moveTo(252, 328); ctx.quadraticCurveTo(302, 307, 352, 327); ctx.quadraticCurveTo(363, 325, 372, 316); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(404, 327); ctx.quadraticCurveTo(454, 306, 505, 326); ctx.quadraticCurveTo(516, 324, 525, 315); ctx.stroke();
      layer.output.style.opacity = ".92";
    }

    if (step.id === "mascara") {
      ctx.strokeStyle = color;
      ctx.lineWidth = 3.2;
      ctx.globalAlpha = .95;
      const lashes = [
        [265, 313, 258, 296], [279, 306, 275, 288], [294, 302, 293, 283], [309, 302, 311, 283], [324, 306, 329, 289],
        [435, 305, 430, 288], [450, 301, 449, 282], [465, 301, 467, 282], [480, 306, 485, 288], [494, 312, 502, 296]
      ];
      lashes.forEach(([x1, y1, x2, y2]) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo((x1 + x2) / 2, y2 - 2, x2, y2); ctx.stroke(); });
      layer.output.style.opacity = ".96";
    }

    if (step.id === "lipstick") {
      drawLipShape(ctx, color);
      layer.output.style.opacity = ".72";
    }

    if (step.id === "gloss") {
      ctx.strokeStyle = color;
      ctx.shadowColor = "#fff";
      ctx.shadowBlur = 7;
      ctx.lineCap = "round";
      ctx.globalAlpha = .95;
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(353, 434); ctx.quadraticCurveTo(377, 441, 405, 431); ctx.stroke();
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(367, 422); ctx.quadraticCurveTo(380, 418, 392, 423); ctx.stroke();
      layer.output.style.opacity = ".82";
    }

    ctx.restore();
    layer.color = color;
    compositeLayer(layer);
  }

  function compositeLayer(layer) {
    const ctx = layer.outCtx;
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(layer.design, 0, 0);
    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(layer.reveal, 0, 0);
    ctx.globalCompositeOperation = "source-over";
  }

  function strokeReveal(step, from, to) {
    const layer = ensureLayer(step);
    const ctx = layer.revealCtx;
    const radius = step.brushSize;
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,.92)";
    ctx.fillStyle = "rgba(255,255,255,.92)";
    ctx.lineWidth = radius * 1.4;
    ctx.lineCap = "round";
    ctx.shadowColor = "rgba(255,255,255,.7)";
    ctx.shadowBlur = Math.max(3, radius * .14);
    if (from) {
      ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(to.x, to.y, radius * .7, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    const hitRadius = radius * .72;
    const hitRadiusSq = hitRadius * hitRadius;
    layer.samples.forEach((sample, index) => {
      const dx = sample.x - to.x;
      const dy = sample.y - to.y;
      if (dx * dx + dy * dy <= hitRadiusSq) layer.painted.add(index);
    });

    compositeLayer(layer);
    const coverage = layer.samples.length ? (layer.painted.size / layer.samples.length) * 100 : 0;
    state[currentStep].coverage = clamp(coverage, 0, 100);
    updateCoverage(step);
  }

  function updateCoverage(step) {
    const s = state[currentStep];
    const shown = Math.round(s.coverage);
    coverageFill.style.width = `${shown}%`;
    coverageText.textContent = `${shown}%`;
    const complete = s.coverage >= step.threshold;
    nextButton.disabled = !complete;
    if (complete) {
      instructionChip.textContent = "Beautiful — ready! ✨";
      instructionChip.className = "instruction-chip success";
      if (!s.celebrated) {
        s.celebrated = true;
        celebrateAtStage(380, 330);
        reactCharacter();
      }
    } else if (s.selected !== null) {
      instructionChip.textContent = "Use the tool on the highlighted area";
      instructionChip.className = "instruction-chip ready";
    }
  }

  function applyPick(step, option) {
    if (step.id === "gems") setAsset(overlays.gems, option.sprite);
    if (step.id === "earrings") setAsset(overlays.earrings, option.sprite);
    if (step.id === "necklace") setAsset(overlays.necklace, option.sprite);
    if (step.id === "hairclip") setAsset(overlays.hairclip, option.sprite);
    if (step.id === "tiara") setAsset(overlays.tiara, option.sprite);
    if (step.id === "eyes") setEyePalette(option.value);
    if (step.id === "background") {
      backdrop.className = `backdrop backdrop-${option.value}`;
      reactCharacter();
    }
    if (step.id === "sparkles") {
      setAsset(overlays.sparkles, "sparkles");
      overlays.sparkles.style.filter = option.value === "frost"
        ? "hue-rotate(150deg) saturate(.85) brightness(1.04)"
        : option.value === "bright"
          ? "saturate(1.05) brightness(1.06)"
          : "saturate(.78)";
      overlays.sparkles.style.opacity = option.value === "bright" ? ".48" : ".38";
      celebrateAtStage(380, 310, 12);
    }
  }

  function renderCategoryRail(step) {
    const activeIndex = CATEGORY_INDEX[step.category];
    categoryRail.innerHTML = "";
    CATEGORIES.forEach((name, index) => {
      const item = document.createElement("div");
      item.className = "category-pill";
      if (index < activeIndex) item.classList.add("done");
      if (index === activeIndex) item.classList.add("active");
      item.title = name;
      categoryRail.appendChild(item);
    });
  }

  function renderOptions(step) {
    const s = state[currentStep];
    optionsEl.innerHTML = "";
    step.options.forEach((option, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "option-card";
      button.setAttribute("role", "listitem");
      if (s.selected === index) button.classList.add("selected");

      const swatch = document.createElement("span");
      swatch.className = "option-swatch";
      if (option.sprite) {
        const thumb = document.createElement("span");
        thumb.className = "sprite-thumb";
        const rect = SPRITES[option.sprite];
        if (rect) {
          thumb.style.width = `${Math.min(48, rect.w * .24)}px`;
          thumb.style.height = `${Math.min(46, rect.h * .34)}px`;
        }
        mountSprite(thumb, option.sprite);
        swatch.appendChild(thumb);
      } else if (option.icon) {
        swatch.style.setProperty("--swatch", option.color);
        swatch.style.background = option.color;
        swatch.textContent = option.icon;
      } else {
        swatch.style.setProperty("--swatch", option.color);
        swatch.style.background = option.color;
      }

      const label = document.createElement("span");
      label.className = "option-label";
      label.textContent = option.label;
      button.append(swatch, label);
      button.addEventListener("click", () => selectOption(index));
      optionsEl.appendChild(button);
    });
  }

  function selectOption(index) {
    const step = steps[currentStep];
    const s = state[currentStep];
    s.selected = index;
    const option = step.options[index];
    renderOptions(step);

    if (step.mode === "brush") {
      renderDesign(step, option.color);
      toolCursor.style.setProperty("--tool-color", option.color);
      instructionChip.textContent = "Use the tool on the highlighted area";
      instructionChip.className = "instruction-chip ready";
      updateCoverage(step);
    } else {
      applyPick(step, option);
      nextButton.disabled = false;
      instructionChip.textContent = "Great choice! ✨";
      instructionChip.className = "instruction-chip success";
      celebrateAtStage(380, 300, 7);
    }
  }

  function renderStep() {
    const step = steps[currentStep];
    const s = state[currentStep];
    categoryName.textContent = step.category;
    stepCounter.textContent = `${currentStep + 1} / ${steps.length}`;
    stepTitle.textContent = step.title;
    stepHint.textContent = step.hint;
    toolLabel.textContent = step.toolLabel || "Choose a style";
    backButton.disabled = currentStep === 0;
    nextButton.textContent = currentStep === steps.length - 1 ? "Finish ✨" : "Continue →";
    nextButton.disabled = step.mode === "brush" ? s.coverage < step.threshold : s.selected === null;
    coverageWrap.classList.toggle("hidden", step.mode !== "brush");
    toolCursor.dataset.tool = step.tool || "pick";
    toolCursor.classList.remove("visible", "active");
    renderCategoryRail(step);
    renderOptions(step);

    if (step.mode === "brush") {
      coverageFill.style.width = `${Math.round(s.coverage)}%`;
      coverageText.textContent = `${Math.round(s.coverage)}%`;
      if (s.selected !== null) {
        renderDesign(step, step.options[s.selected].color);
        toolCursor.style.setProperty("--tool-color", step.options[s.selected].color);
        updateCoverage(step);
      } else {
        instructionChip.textContent = "Pick a shade below";
        instructionChip.className = "instruction-chip";
      }
    } else if (s.selected !== null) {
      applyPick(step, step.options[s.selected]);
      instructionChip.textContent = "Great choice! ✨";
      instructionChip.className = "instruction-chip success";
    } else {
      instructionChip.textContent = "Choose a style below";
      instructionChip.className = "instruction-chip";
    }
  }

  function screenToStage(clientX, clientY) {
    const rect = characterStage.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const x = ((clientX - rect.left) / rect.width) * W;
    const y = ((clientY - rect.top) / rect.height) * H;
    if (x < 0 || x > W || y < 0 || y > H) return null;
    return { x, y };
  }

  function updateToolCursor(event) {
    const step = steps[currentStep];
    const s = state[currentStep];
    if (step.mode !== "brush" || s.selected === null) {
      toolCursor.classList.remove("visible");
      return;
    }
    const touchOffsetX = event.pointerType === "touch" ? 25 : 0;
    const touchOffsetY = event.pointerType === "touch" ? -16 : 0;
    toolCursor.style.left = `${event.clientX + touchOffsetX}px`;
    toolCursor.style.top = `${event.clientY + touchOffsetY}px`;
    toolCursor.classList.add("visible");
  }

  function updateGaze(clientX, clientY) {
    const rect = characterStage.getBoundingClientRect();
    if (!rect.width) return;
    const cx = rect.left + rect.width * .5;
    const cy = rect.top + rect.height * .345;
    const dx = clamp((clientX - cx) / rect.width * 18, -5.5, 5.5);
    const dy = clamp((clientY - cy) / rect.height * 18, -4, 4);
    leftEyeRig.style.transform = `translate(${dx}px, ${dy}px)`;
    rightEyeRig.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  function maybeBlinkNearEyes(point) {
    if (!point) return;
    const nearLeft = ellipseContains(point.x, point.y, [304, 318, 72, 46]);
    const nearRight = ellipseContains(point.x, point.y, [454, 317, 72, 46]);
    if (nearLeft || nearRight) triggerBlink();
  }

  function triggerBlink() {
    blinkOverlay.classList.remove("blinking");
    void blinkOverlay.offsetWidth;
    blinkOverlay.classList.add("blinking");
  }

  function scheduleBlink() {
    clearTimeout(blinkTimer);
    const delay = 2800 + Math.random() * 3800;
    blinkTimer = setTimeout(() => {
      triggerBlink();
      scheduleBlink();
    }, delay);
  }

  function spawnPaintParticle(clientX, clientY, color) {
    if (Math.random() > .42) return;
    const p = document.createElement("span");
    p.className = "paint-particle";
    p.style.left = `${clientX}px`;
    p.style.top = `${clientY}px`;
    p.style.setProperty("--particle-color", color);
    p.style.setProperty("--px", `${(Math.random() - .5) * 30}px`);
    p.style.setProperty("--py", `${-10 - Math.random() * 24}px`);
    particleLayer.appendChild(p);
    p.addEventListener("animationend", () => p.remove(), { once: true });
  }

  function celebrateAtStage(stageX, stageY, count = 9) {
    const rect = characterStage.getBoundingClientRect();
    const x = rect.left + (stageX / W) * rect.width;
    const y = rect.top + (stageY / H) * rect.height;
    for (let i = 0; i < count; i += 1) {
      const star = document.createElement("span");
      star.className = "reward-star";
      star.textContent = i % 3 === 0 ? "✦" : "✨";
      star.style.left = `${x}px`;
      star.style.top = `${y}px`;
      star.style.setProperty("--sx", `${(Math.random() - .5) * 150}px`);
      star.style.setProperty("--sy", `${(Math.random() - .7) * 110}px`);
      particleLayer.appendChild(star);
      star.addEventListener("animationend", () => star.remove(), { once: true });
    }
  }

  function handlePointerDown(event) {
    const step = steps[currentStep];
    const s = state[currentStep];
    updateGaze(event.clientX, event.clientY);
    updateToolCursor(event);
    if (step.mode !== "brush" || s.selected === null) return;
    const point = screenToStage(event.clientX, event.clientY);
    if (!point) return;
    pointerDown = true;
    activePointerId = event.pointerId;
    lastPoint = point;
    try { playfield.setPointerCapture(event.pointerId); } catch (_) {}
    toolCursor.classList.add("active");
    strokeReveal(step, null, point);
    spawnPaintParticle(event.clientX, event.clientY, step.options[s.selected].color);
    if (["eyeshadow", "eyeliner", "mascara"].includes(step.id)) maybeBlinkNearEyes(point);
  }

  function handlePointerMove(event) {
    updateGaze(event.clientX, event.clientY);
    updateToolCursor(event);
    if (!pointerDown || event.pointerId !== activePointerId) return;
    const step = steps[currentStep];
    const s = state[currentStep];
    const point = screenToStage(event.clientX, event.clientY);
    if (!point || step.mode !== "brush" || s.selected === null) return;
    strokeReveal(step, lastPoint, point);
    lastPoint = point;
    spawnPaintParticle(event.clientX, event.clientY, step.options[s.selected].color);
  }

  function handlePointerUp(event) {
    if (event.pointerId !== activePointerId) return;
    pointerDown = false;
    activePointerId = null;
    lastPoint = null;
    toolCursor.classList.remove("active");
  }

  function goNext() {
    if (nextButton.disabled) return;
    if (currentStep === steps.length - 1) {
      celebrateAtStage(380, 320, 18);
      finishPanel.hidden = false;
      return;
    }
    currentStep += 1;
    renderStep();
  }

  function goBack() {
    if (currentStep === 0) return;
    currentStep -= 1;
    renderStep();
  }

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.();
      else await document.exitFullscreen?.();
    } catch (_) {}
  }

  async function init() {
    try {
      await loadAtlas();
    } catch (error) {
      console.error("Accessory atlas failed to load", error);
    }
    renderStep();
    scheduleBlink();
  }

  playfield.addEventListener("pointerdown", handlePointerDown);
  playfield.addEventListener("pointermove", handlePointerMove);
  playfield.addEventListener("pointerup", handlePointerUp);
  playfield.addEventListener("pointercancel", handlePointerUp);
  playfield.addEventListener("pointerleave", (event) => {
    if (!pointerDown) toolCursor.classList.remove("visible");
    updateGaze(event.clientX, event.clientY);
  });
  document.addEventListener("pointermove", (event) => updateGaze(event.clientX, event.clientY), { passive: true });
  nextButton.addEventListener("click", goNext);
  backButton.addEventListener("click", goBack);
  fullscreenButton.addEventListener("click", toggleFullscreen);
  replayButton.addEventListener("click", () => location.reload());
  closeFinishButton.addEventListener("click", () => { finishPanel.hidden = true; });

  init();
})();
