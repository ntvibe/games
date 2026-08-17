# games

A collection of browser games. Each game lives in its own top-level folder so it can be developed and deployed independently.

## Current games

### `makeup/` — Magic Makeup Studio

An ad-free full-screen makeup and jewelry game prototype with:

- 18 sequential makeover steps
- touch and mouse makeup application
- character eyes that track the current interaction point
- randomized natural blinking
- layered SVG makeup, jewelry, hair and crown elements
- portrait and landscape responsive layouts
- zero runtime dependencies and no build step

### `neon-rift/` — Neon Rift: Gravity Run

A mobile-first 3D WebGL racer/showpiece with:

- full-screen touch steering and hold-to-boost controls
- adaptive render resolution based on live frame rate
- ACES tone mapping, bloom, vignette, grain and chromatic lens effects
- procedural infinite tunnel geometry and instanced wall panels
- GPU particle streak field and animated singularity focal point
- obstacles, collectibles, shields, energy, score and haptics
- synthesized WebAudio engine and interaction sounds
- keyboard controls for desktop testing
- no game art downloads; runtime geometry and effects are procedural

### `aether-strike/` — Aether Strike: Skybreak

A high-end mobile-first 3D aerial combat demo with:

- twin-thumb touch controls plus keyboard controls for desktop testing
- escalating enemy waves, plasma fire, enemy projectiles, combo scoring and a phase-pulse evade
- procedurally built interceptor, drones, floating rock fields and sci-fi pylons
- animated shader sky, living storm ocean and GPU dust field
- ACES tone mapping, soft realtime shadows, emissive PBR materials and UnrealBloom post-processing
- live render-resolution scaling based on measured frame rate
- automatic bloom/shadow quality degradation on slower phones
- synthesized WebAudio feedback and vibration/haptics where supported
- no downloaded game-art assets and no build step

## Structure

```text
games/
├── index.html
├── README.md
├── makeup/
│   ├── index.html
│   ├── style.css
│   └── game.js
├── neon-rift/
│   ├── index.html
│   └── game.js
└── aether-strike/
    ├── index.html
    └── game.js
```

Open the repository root as a static site and choose a game, or open a game's `index.html` directly through a local/static web server.
