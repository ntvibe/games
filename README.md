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

## Structure

```text
games/
├── index.html
├── README.md
├── makeup/
│   ├── index.html
│   ├── style.css
│   └── game.js
└── neon-rift/
    ├── index.html
    └── game.js
```

Open the repository root as a static site and choose a game, or open a game's `index.html` directly through a local/static web server.
