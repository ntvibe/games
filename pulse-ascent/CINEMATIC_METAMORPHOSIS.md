# PULSE//ASCENT — Cinematic Metamorphosis Director

This document describes the experimental cinematic transformation layer developed on `overnight/pulse-ascent-cinematic-2026-08-24`.

The goal is not to add another gameplay subsystem. The director stages authored-feeling audiovisual transformations on top of the existing rail shooter while keeping combat timing, targeting, enemy simulation, and adaptive quality authoritative.

## Architecture

`cinematic-metamorphosis-director.js` owns beat-aware cue timing and normalized presentation intent. It does not directly own Three.js scene objects or gameplay rules.

The director exposes cue envelopes such as:

- `openness`
- `fovOffset`
- `bloomBoost`
- `roll`
- `timeFeel`
- `streakBoost`

Visual consumers subscribe through the frame-consumer API and apply those values cooperatively instead of adding separate camera or world-update loops.

Deterministic runtime diagnostics are available through `window.__pulseMetamorphosisDirector`.

## Signature transformations

### TEMPLE BLOOM

Triggered on VECTOR TEMPLE. A procedural wireframe city/temple assembles outside the central combat corridor using instanced geometry. Beat pulses drive growth and emphasis while graphics-aware density tiers keep mobile cost bounded.

Diagnostics: `window.__pulseTempleBloom`.

### TIME FRACTURE

Triggered on FREE VECTOR RUPTURE. This is a perception-only bullet-time event: FOV compression, restrained post-process modulation, temporal streaks, and quantized audio punctuation create the sensation of suspended time without changing `game.time`, enemy simulation, projectile timing, or authoritative combat state.

Temporal streak density follows the existing graphics mode rather than forcing the maximum count.

Diagnostics: `window.__pulseTimeFracture`.

### WORLD ASCENT

Triggered on ASCENSION // REENTRY. Decorative environment language rotates toward a 90-degree vertical ascent while camera roll remains intentionally small, preserving targeting comfort. Sparse receding frames and streaks sell the change of orientation without taking ownership of the player camera.

Diagnostics: `window.__pulseWorldAscent`.

## Pacing

The director deliberately avoids holding every transformation at maximum intensity:

- Temple Bloom peaks, then settles to a 0.72 hold level before release.
- Time Fracture keeps its full 1.0 suspended hold to preserve the contrast of the effect.
- World Ascent peaks, then settles to 0.82 before release.

This creates a repeatable excitation → release → excitation rhythm instead of constant maximal visual noise.

## Mobile and readability constraints

- Decorative geometry is kept outside the central targeting corridor where possible.
- Temple Bloom uses instancing and graphics-aware density caps.
- Time Fracture uses one line-segment draw call and reduced streak counts in lower graphics modes.
- World Ascent keeps camera roll bounded while rotating environment cues much more aggressively than the camera.
- Additive/transparent presentation geometry avoids unnecessary depth writes and target occlusion.

## Regression and visual checks

The overnight branch adds three focused workflows:

- `pulse-ascent-cinematic-metamorphosis-check.yml` — deterministic cue/envelope and integration assertions.
- `pulse-ascent-cinematic-breathing-check.yml` — verifies sustained intensity levels and release behavior.
- `pulse-ascent-cinematic-mobile-check.yml` — boots the real WebGL game at 390x844, forces deterministic previews of all three cinematic states, checks corridor/readability and mobile density constraints, captures screenshots, and writes state diagnostics.

At the time this branch was prepared for review, the GitHub connector did not expose completed status checks or pull-request workflow runs for the latest branch-push head. The code therefore should not be treated as CI-verified until the draft PR checks complete and its screenshot artifacts are inspected.

## Review priorities

Before merge, verify:

1. The 390x844 screenshots for all three transformations remain visually readable around active targets.
2. No camera/FOV/bloom offsets drift after preview cleanup or real section transitions.
3. Mobile frame pacing remains acceptable in Battery and Auto graphics modes.
4. The three transformations feel meaningfully different rather than like variations of the same effect.
5. Existing combat, FREE VECTOR, boss, and adaptive-quality workflows remain green.
