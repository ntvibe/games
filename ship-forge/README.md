# Ship Forge — img2threejs-style procedural reconstruction

Interactive reconstruction of the generated cyberpunk spacecraft reference. The live page is designed to be served directly from GitHub Pages under `/games/ship-forge/`.

## What this is

`img2threejs` is an agent-driven procedural reconstruction workflow, not a conventional single-click image-to-mesh executable. It reconstructs objects as editable Three.js code and quality-gates successive passes. This folder adopts that model directly: the reference, a reconstruction spec, pass log, named procedural systems and interactive comparison viewer all live together in version control.

## Files

- `reference.jpg` — source image used for reconstruction.
- `ship-model.js` — procedural Three.js model factory.
- `index.html` — mobile-friendly interactive viewer.
- `reconstruction/sculpt-spec.json` — explicit feature inventory, confidence and pass status.
- `reconstruction/PASS_LOG.md` — current reconstruction state and next targets.
- `reconstruction/AGENT_PROMPT.md` — continuation instructions for another img2threejs/Codex pass.

## Viewer controls

Orbit/pinch/pan with normal touch or mouse controls. UI toggles reference overlay, wireframe, exploded systems and automatic orbit.
