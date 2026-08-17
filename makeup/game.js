(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  const character = $("#character");
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

  const steps = [
    {
      id: "foundation",
      title: "Foundation",
      hint: "Pick a shade, then gently brush over the face.",
      mode: "brush",
      zones: [[400, 370, 210]],
      options: [
        { label: "Peach", color: "#eab38f" },
        { label: "Honey", color: "#d9966f" },
        { label: "Rose", color: "#efb59f" }
      ]
    },
    {
      id: "brows",
      title: "Eyebrows",
      hint: "Brush along both brows.",
      mode: "brush",
      zones: [[316, 292, 76], [484, 292, 76]],
      options: [
        { label: "Cocoa", color: "#704532" },
        { label: "Soft", color: "#9b6c50" },
        { label: "Plum", color: "#66425b" }
      ]
    },
    {
      id: "eyeshadow",
      title: "Eye Shadow",
      hint: "Sweep color over both eyelids.",
      mode: "brush",
      zones: [[323, 326, 82], [477, 326, 82]],
      options: [
        { label: "Lilac", color: "#b68ae8" },
        { label: "Pink", color: "#ef8dbd" },
        { label: "Sky", color: "#79cfe8" }
      ]
    },
    {
      id: "eyeliner",
      title: "Eyeliner",
      hint: "Trace close to both eyes.",
      mode: "brush",
      zones: [[323, 349, 82], [477, 349, 82]],
      options: [
        { label: "Black", color: "#33232f" },
        { label: "Brown", color: "#704a3d" },
        { label: "Violet", color: "#644c99" }
      ]
    },
    {
      id: "mascara",
      title: "Mascara",
      hint: "Brush the upper lashes on both eyes.",
      mode: "brush",
      zones: [[306, 320, 74], [494, 320, 74]],
      options: [
        { label: "Midnight", color: "#2a222b" },
        { label: "Cocoa", color: "#5a4037" },
        { label: "Plum", color: "#563b56" }
      ]
    },
    {
      id: "blush",
      title: "Blush",
      hint: "Add a little color to both cheeks.",
      mode: "brush",
      zones: [[286, 455, 78], [514, 455, 78]],
      options: [
        { label: "Rosy", color: "#ef7d9c" },
        { label: "Peach", color: "#f39a7e" },
        { label: "Berry", color: "#d96f9c" }
      ]
    },
    {
      id: "highlight",
      title: "Highlighter",
      hint: "Tap the cheeks and nose for a little glow.",
      mode: "brush",
      zones: [[286, 414, 60], [514, 414, 60], [405, 398, 58]],
      options: [
        { label: "Pearl", color: "#fff7dd" },
        { label: "Pink", color: "#ffd9e7" },
        { label: "Gold", color: "#ffe8a8" }
      ]
    },
    {
      id: "freckles",
      title: "Freckles",
      hint: "Dab across the nose and cheeks.",
      mode: "brush",
      zones: [[400, 420, 105]],
      options: [
        { label: "Honey", color: "#b86e55" },
        { label: "Cocoa", color: "#86513f" },
        { label: "Rose", color: "#c77872" }
      ]
    },
    {
      id: "lipstick",
      title: "Lipstick",
      hint: "Brush color over the lips.",
      mode: "brush",
      zones: [[400, 520, 88]],
      options: [
        { label: "Berry", color: "#c84f72" },
        { label: "Pink", color: "#ed6ba2" },
        { label: "Coral", color: "#ea765f" }
      ]
    },
    {
      id: "gloss",
      title: "Lip Gloss",
      hint: "Swipe across the lips for shine.",
      mode: "brush",
      zones: [[400, 526, 86]],
      options: [
        { label: "Crystal", color: "#ffffff" },
        { label: "Pink", color: "#ffe3f1" },
        { label: "Gold", color: "#fff0b4" }
      ]
    },
    {
      id: "gems",
      title: "Face Gems",
      hint: "Choose a gem set.",
      mode: "pick",
      options: [
        { label: "Rainbow", color: "linear-gradient(135deg,#78dfff,#ff91d4,#ffe981)", value: "rainbow", icon: "✦" },
        { label: "Ocean", color: "linear-gradient(135deg,#72e9e5,#79a9ff)", value: "ocean", icon: "✧" },
        { label: "Candy", color: "linear-gradient(135deg,#ff8fc7,#d99cff)", value: "candy", icon: "◆" }
      ]
    },
    {
      id: "earrings",
      title: "Earrings",
      hint: "Pick a pair that sparkles.",
      mode: "pick",
      options: [
        { label: "Pearls", color: "#fff4dc", value: "pearl", icon: "●" },
        { label: "Hearts", color: "#ff79ad", value: "heart", icon: "♥" },
        { label: "Stars", color: "#ffd75f", value: "star", icon: "★" }
      ]
    },
    {
      id: "necklace",
      title: "Necklace",
      hint: "Choose the finishing necklace.",
      mode: "pick",
      options: [
        { label: "Gem", color: "#ffd76d", value: "circle", icon: "●" },
        { label: "Heart", color: "#ff77ad", value: "heart", icon: "♥" },
        { label: "Star", color: "#8cdcff", value: "star", icon: "★" }
      ]
    },
    {
      id: "hairclip",
      title: "Hair Clip",
      hint: "Add something fun to the hair.",
      mode: "pick",
      options: [
        { label: "Flower", color: "#ff9fca", value: "flower", icon: "🌸" },
        { label: "Bow", color: "#b996ff", value: "bow", icon: "🎀" },
        { label: "Star", color: "#7fe2ff", value: "star", icon: "★" }
      ]
    },
    {
      id: "tiara",
      title: "Tiara",
      hint: "Every makeover deserves a crown.",
      mode: "pick",
      options: [
        { label: "Gold", color: "linear-gradient(135deg,#fff2a4,#e7a33d)", value: "classic", icon: "♛" },
        { label: "Crystal", color: "#9fe8ff", value: "crystal", icon: "♛" },
        { label: "Pink", color: "#ff9bcf", value: "pink", icon: "♛" }
      ]
    },
    {
      id: "hair",
      title: "Hair Color",
      hint: "Try a new hair color.",
      mode: "pick",
      options: [
        { label: "Chestnut", color: "#8a573a" },
        { label: "Midnight", color: "#403242" },
        { label: "Rose", color: "#b9687d" }
      ]
    },
    {
      id: "background",
      title: "Backdrop",
      hint: "Choose a studio backdrop.",
      mode: "pick",
      options: [
        { label: "Rose", color: "linear-gradient(135deg,#ffd8e8,#d9c9ff)", value: "rose" },
        { label: "Sky", color: "linear-gradient(135deg,#d6f5ff,#ddd0ff)", value: "sky" },
        { label: "Mint", color: "linear-gradient(135deg,#dff8e9,#d7e8ff)", value: "mint" }
      ]
    },
    {
      id: "sparkles",
      title: "Magic Sparkles",
      hint: "Pick the final sparkle style.",
      mode: "pick",
      options: [
        { label: "Starlight", color: "#fff1a6", value: "gold", icon: "✨" },
        { label: "Fairy", color: "#ffbfe0", value: "pink", icon: "✦" },
        { label: "Frost", color: "#a9efff", value: "blue", icon: "❄" }
      ]
    }
  ];

  const state = steps.map(() => ({ selected: null, coverage: 0 }));
  let currentStep = 0;
  let pointerDown = false;
  let activePointerId = null;
  let lastApplyAt = 0;

  const basePupils = {
    left: { x: 323, y: 350 },
    right: { x: 477, y: 350 }
  };

  function setOpacity(selector, value) {
    const node = $(selector);
    if (node) node.setAttribute("opacity", String(value));
  }

  function showVariant(selectors, activeSelector) {
    selectors.forEach((selector) => setOpacity(selector, selector === activeSelector ? 1 : 0));
  }

  function opacityFromCoverage(coverage, minimum = 0.2) {
    return clamp(minimum + (coverage / 100) * (1 - minimum), minimum, 1);
  }

  function applyVisual(step, option, coverage = 100) {
    const opacity = opacityFromCoverage(coverage);

    switch (step.id) {
      case "foundation":
        $("#foundationTint").setAttribute("fill", option.color);
        setOpacity("#foundationTint", Math.min(0.38, opacity * 0.38));
        break;
      case "brows":
        $("#browsGroup").setAttribute("stroke", option.color);
        break;
      case "eyeshadow":
        $("#leftShadow").setAttribute("fill", option.color);
        $("#rightShadow").setAttribute("fill", option.color);
        setOpacity("#eyeShadowGroup", Math.min(0.72, opacity * 0.72));
        break;
      case "eyeliner":
        $("#eyelinerGroup").setAttribute("stroke", option.color);
        setOpacity("#eyelinerGroup", opacity);
        break;
      case "mascara":
        $("#mascaraGroup").setAttribute("stroke", option.color);
        setOpacity("#mascaraGroup", opacity);
        break;
      case "blush":
        $("#leftBlush").setAttribute("fill", option.color);
        $("#rightBlush").setAttribute("fill", option.color);
        setOpacity("#blushGroup", Math.min(0.48, opacity * 0.48));
        break;
      case "highlight":
        $("#highlightGroup").setAttribute("fill", option.color);
        setOpacity("#highlightGroup", Math.min(0.72, opacity * 0.72));
        break;
      case "freckles":
        $("#frecklesGroup").setAttribute("fill", option.color);
        setOpacity("#frecklesGroup", opacity);
        break;
      case "lipstick":
        $("#upperLip").setAttribute("fill", option.color);
        $("#lowerLip").setAttribute("fill", option.color);
        break;
      case "gloss":
        $("#lipGloss").setAttribute("stroke", option.color);
        setOpacity("#lipGloss", Math.min(0.92, opacity * 0.92));
        break;
      case "gems": {
        const colors = {
          rainbow: ["#82ddff", "#ff8ed7", "#fff2a8"],
          ocean: ["#7ee8e7", "#78aaff", "#d7fbff"],
          candy: ["#ff82bd", "#c68cff", "#ffe1f1"]
        }[option.value];
        const gemNodes = $("#faceGems").children;
        Array.from(gemNodes).forEach((node, index) => node.setAttribute("fill", colors[index % colors.length]));
        setOpacity("#faceGems", 1);
        break;
      }
      case "earrings":
        setOpacity("#earringsGroup", 1);
        showVariant(["#earrings-pearl", "#earrings-heart", "#earrings-star"], `#earrings-${option.value}`);
        break;
      case "necklace":
        setOpacity("#necklaceGroup", 1);
        showVariant(["#necklaceCharmCircle", "#necklaceCharmHeart", "#necklaceCharmStar"], `#necklaceCharm${option.value[0].toUpperCase()}${option.value.slice(1)}`);
        break;
      case "hairclip":
        setOpacity("#hairClipGroup", 1);
        showVariant(["#clip-flower", "#clip-bow", "#clip-star"], `#clip-${option.value}`);
        break;
      case "tiara":
        setOpacity("#tiaraGroup", 1);
        showVariant(["#tiaraClassic", "#tiaraCrystal", "#tiaraPink"], `#tiara${option.value[0].toUpperCase()}${option.value.slice(1)}`);
        break;
      case "hair":
        $("#hairBack").setAttribute("fill", option.color);
        $("#hairFront").setAttribute("fill", option.color);
        break;
      case "background":
        backdrop.className = `backdrop backdrop-${option.value}`;
        break;
      case "sparkles": {
        const sparkleColors = { gold: "#fff1a6", pink: "#ffbfe0", blue: "#a9efff" };
        const color = sparkleColors[option.value];
        Array.from($("#sparkleLayer").children).forEach((node, index) => {
          node.setAttribute("fill", index % 2 ? color : "#ffffff");
        });
        setOpacity("#sparkleLayer", 1);
        break;
      }
      default:
        break;
    }
  }

  function renderStep() {
    const step = steps[currentStep];
    const currentState = state[currentStep];

    stepCounter.textContent = `${currentStep + 1} / ${steps.length}`;
    stepTitle.textContent = step.title;
    stepHint.textContent = step.hint;
    backButton.disabled = currentStep === 0;
    nextButton.textContent = currentStep === steps.length - 1 ? "Finish ✨" : "Next ✨";
    coverageWrap.classList.toggle("hidden", step.mode !== "brush");

    optionsEl.innerHTML = "";
    step.options.forEach((option, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "option-card" + (currentState.selected === index ? " selected" : "");
      button.setAttribute("role", "listitem");
      button.setAttribute("aria-label", option.label);
      button.innerHTML = `
        <span class="option-swatch" style="--swatch:${option.color || "#f4b5d3"}">${option.icon || ""}</span>
        <span class="option-label">${option.label}</span>
      `;
      button.addEventListener("pointerdown", (event) => {
        lookAtClient(event.clientX, event.clientY);
      });
      button.addEventListener("click", () => selectOption(index));
      optionsEl.appendChild(button);
    });

    updateProgressUI();
  }

  function selectOption(index) {
    const step = steps[currentStep];
    const currentState = state[currentStep];
    currentState.selected = index;

    if (step.mode === "pick") currentState.coverage = 100;

    const option = step.options[index];
    applyVisual(step, option, step.mode === "pick" ? 100 : Math.max(currentState.coverage, 12));
    brushCursor.style.setProperty("--brush-color", option.color && !option.color.startsWith("linear") ? option.color : "rgba(255,130,180,.56)");

    Array.from(optionsEl.children).forEach((node, optionIndex) => {
      node.classList.toggle("selected", optionIndex === index);
    });

    updateProgressUI();
  }

  function updateProgressUI() {
    const step = steps[currentStep];
    const currentState = state[currentStep];
    const hasChoice = currentState.selected !== null;
    const ready = step.mode === "pick" ? hasChoice : hasChoice && currentState.coverage >= 38;

    coverageText.textContent = `${Math.round(currentState.coverage)}%`;
    coverageFill.style.width = `${currentState.coverage}%`;
    nextButton.disabled = !ready;
    applyHint.classList.toggle("ready", ready);

    if (!hasChoice) {
      applyHint.textContent = "Choose a style below";
    } else if (step.mode === "brush" && !ready) {
      applyHint.textContent = "Touch and brush the highlighted area";
    } else if (step.mode === "brush") {
      applyHint.textContent = "Lovely! Add more or continue ✨";
    } else {
      applyHint.textContent = "Great choice! ✨";
    }
  }

  function clientToSvg(clientX, clientY) {
    const point = character.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const matrix = character.getScreenCTM();
    return matrix ? point.matrixTransform(matrix.inverse()) : { x: 0, y: 0 };
  }

  function pointHitsZones(point, zones) {
    return zones.some(([x, y, radius]) => {
      const dx = point.x - x;
      const dy = point.y - y;
      return dx * dx + dy * dy <= radius * radius;
    });
  }

  function addDab(clientX, clientY, color) {
    const rect = playfield.getBoundingClientRect();
    const dab = document.createElement("span");
    dab.className = "brush-dab";
    dab.style.left = `${clientX - rect.left}px`;
    dab.style.top = `${clientY - rect.top}px`;
    dab.style.setProperty("--dab-color", color && !color.startsWith("linear") ? color : "#ff9ac6");
    dabLayer.appendChild(dab);
    setTimeout(() => dab.remove(), 450);
  }

  function tryApply(event, strong = false) {
    const step = steps[currentStep];
    const currentState = state[currentStep];
    if (step.mode !== "brush" || currentState.selected === null) return;

    const now = performance.now();
    if (!strong && now - lastApplyAt < 28) return;
    lastApplyAt = now;

    const point = clientToSvg(event.clientX, event.clientY);
    if (!pointHitsZones(point, step.zones)) return;

    currentState.coverage = clamp(currentState.coverage + (strong ? 13 : 4.5), 0, 100);
    const option = step.options[currentState.selected];
    applyVisual(step, option, currentState.coverage);
    addDab(event.clientX, event.clientY, option.color);
    updateProgressUI();
  }

  function setCursor(event, visible) {
    brushCursor.style.left = `${event.clientX}px`;
    brushCursor.style.top = `${event.clientY}px`;
    brushCursor.classList.toggle("visible", visible);
  }

  character.addEventListener("pointerdown", (event) => {
    const step = steps[currentStep];
    if (step.mode !== "brush") return;
    pointerDown = true;
    activePointerId = event.pointerId;
    character.setPointerCapture?.(event.pointerId);
    setCursor(event, true);
    tryApply(event, true);
    event.preventDefault();
  });

  character.addEventListener("pointermove", (event) => {
    setCursor(event, state[currentStep].selected !== null && steps[currentStep].mode === "brush");
    lookAtClient(event.clientX, event.clientY);
    if (pointerDown && activePointerId === event.pointerId) tryApply(event);
  });

  const endPointer = (event) => {
    if (activePointerId !== null && event.pointerId !== activePointerId) return;
    pointerDown = false;
    activePointerId = null;
    brushCursor.classList.remove("visible");
  };

  character.addEventListener("pointerup", endPointer);
  character.addEventListener("pointercancel", endPointer);
  character.addEventListener("pointerleave", () => {
    if (!pointerDown) brushCursor.classList.remove("visible");
  });

  function lookAtClient(clientX, clientY) {
    const rect = character.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const faceCenterX = rect.left + rect.width * 0.5;
    const faceCenterY = rect.top + rect.height * 0.39;
    const dx = clamp((clientX - faceCenterX) / (rect.width * 0.42), -1, 1);
    const dy = clamp((clientY - faceCenterY) / (rect.height * 0.35), -1, 1);

    $("#leftPupil").setAttribute("cx", String(basePupils.left.x + dx * 8));
    $("#leftPupil").setAttribute("cy", String(basePupils.left.y + dy * 5.5));
    $("#rightPupil").setAttribute("cx", String(basePupils.right.x + dx * 8));
    $("#rightPupil").setAttribute("cy", String(basePupils.right.y + dy * 5.5));

    $("#leftIris").setAttribute("cx", String(basePupils.left.x + dx * 4));
    $("#leftIris").setAttribute("cy", String(basePupils.left.y + dy * 2.7));
    $("#rightIris").setAttribute("cx", String(basePupils.right.x + dx * 4));
    $("#rightIris").setAttribute("cy", String(basePupils.right.y + dy * 2.7));
  }

  window.addEventListener("pointermove", (event) => lookAtClient(event.clientX, event.clientY), { passive: true });
  window.addEventListener("pointerdown", (event) => lookAtClient(event.clientX, event.clientY), { passive: true });

  function blink() {
    const eyes = [$("#leftEye"), $("#rightEye")];
    eyes.forEach((eye) => {
      eye.animate(
        [
          { transform: "scaleY(1)" },
          { transform: "scaleY(0.08)", offset: 0.45 },
          { transform: "scaleY(0.08)", offset: 0.58 },
          { transform: "scaleY(1)" }
        ],
        { duration: 190, easing: "ease-in-out" }
      );
    });
    scheduleBlink();
  }

  function scheduleBlink() {
    const delay = 2400 + Math.random() * 3900;
    window.setTimeout(blink, delay);
  }

  nextButton.addEventListener("click", () => {
    if (nextButton.disabled) return;
    if (currentStep === steps.length - 1) {
      finishPanel.hidden = false;
      setOpacity("#sparkleLayer", 1);
      return;
    }
    currentStep += 1;
    renderStep();
  });

  backButton.addEventListener("click", () => {
    if (currentStep === 0) return;
    currentStep -= 1;
    renderStep();
  });

  fullscreenButton.addEventListener("click", async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen?.();
      } else {
        await document.exitFullscreen?.();
      }
    } catch (_) {
      // Fullscreen can be blocked by the browser; the layout already fills the viewport.
    }
  });

  replayButton.addEventListener("click", () => window.location.reload());

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) brushCursor.classList.remove("visible");
  });

  renderStep();
  scheduleBlink();
})();
