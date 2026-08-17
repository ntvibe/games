# PULSE//ASCENT

An original mobile-first synesthetic rail shooter built as a browser game. It is inspired by the design principles of music-driven rail shooters: lock-on targeting, quantized attacks, evolving audiovisual density, and transforming boss encounters.

No proprietary Rez Infinite art, code, models, UI assets, sound effects, or music are included.

## Play

- Drag / mouse move: aim
- Hold pointer: collect up to 8 target locks
- Release: queue the lock array into the shared music clock
- OVERDRIVE: when the meter is full, trigger a beat-quantized screen attack
- Desktop: Space can hold/release the lock array

## Shared rhythm clock

The entire game runs from a 128 BPM Web Audio clock:

- 16-step sequencer
- enemy formations spawn on bar boundaries
- danger projectiles arrive on fixed rhythmic subdivisions
- player volleys snap to the same subdivision grid
- each lock and shot creates a pitched synthesized note
- boss pulses, transformations, and attacks share the same clock
- bloom, exposure, and camera response read the live beat phase

## Generative audio

There are no audio files. The game synthesizes its kick, snare, hats, bass, plucks, pads, lock notes, shot notes, damage cues, and overdrive effects in Web Audio. Additional musical density is unlocked dynamically as the player's chain and sector intensity increase.

## Procedural rendering

- Three.js r185 with ACES tone mapping and UnrealBloom
- procedural wireframe enemies and avatar
- moving tunnel and perspective grid
- 4,800-point data/star field
- 6,500-slot GPU particle pool
- palette/fog transitions by sector
- transforming eight-part boss with three phases
- adaptive pixel ratio for slower mobile GPUs

## Game loop

Five escalating sectors:

1. AWAKENING
2. SIGNAL BLOOM
3. VECTOR TEMPLE
4. ASCENSION
5. THE CONVERGENCE

Enemy choreography includes rings, lines, spirals, tanks, analysis nodes, and rhythmic danger projectiles. Performance drives score multiplier, music energy, audiovisual density, evolution, and overdrive charge.

## Technical notes

This is a no-build static game intended for GitHub Pages. Three.js modules are pinned through an import map. `window.__pulseAscent` exposes the live game instance for browser inspection and debugging.
