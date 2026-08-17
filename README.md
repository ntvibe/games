# games

A collection of small browser games. Each game lives in its own top-level folder so it can be developed and deployed independently.

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

Open `makeup/index.html` directly, or serve the repository as a static site.

## Structure

```text
games/
├── index.html
├── README.md
└── makeup/
    ├── index.html
    ├── style.css
    └── game.js
```

Future games should be added as sibling folders such as `hospital/`, `dressup/`, or `animals/`.
