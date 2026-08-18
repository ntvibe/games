# PULSE//ASCENT

An original mobile-first synesthetic rail shooter built as a browser game. It is inspired by the design principles of music-driven rail shooters: lock-on targeting, quantized attacks, evolving audiovisual density, spatial mode changes, and transforming boss encounters.

No proprietary Rez Infinite art, code, models, UI assets, sound effects, or music are included.

## Play

- Drag / mouse move: aim
- Hold pointer: collect target locks
- Release: queue the active weapon into the shared music clock
- WEAPON button / `Q`: cycle weapon mode
- VECTOR SPEED button / `R`: cycle world-flow speed
- OVERDRIVE: when the meter is full, trigger a beat-quantized screen attack
- Desktop: Space can hold/release the lock array

## Humanoid pilot

The player is now a persistent articulated procedural humanoid rather than an abstract core.

The rig is built entirely from runtime wireframe geometry:

- separate head and face ring
- neck, tapered torso and pelvis
- articulated shoulders, elbows, hips and knees
- wireframe hands and feet
- animated chest core, spine and shoulder line
- two reactive halo layers
- imported blaster geometry mounted around the rig

Every frame drives independent limb motion, head tracking, torso counter-rotation and different free-flight poses. The character is deliberately positioned closer and higher in the frame so the full human silhouette remains readable during combat.

A 240-point fragment cloud is sampled from the body volume. Roughly every eight seconds the pilot partially disintegrates into that cloud and reforms. Damage, weapon changes, vector-speed changes and overdrive can also trigger shorter breakup/reconstruction events.

Evolution no longer restores the old abstract orbiting avatar pieces. Higher evolution instead increases the humanoid core/halo presence while preserving the human silhouette.

## Weapons

Three weapon roles share the same rhythm clock but solve different combat problems.

### LOCK//8

- classic rhythmic paint-and-release weapon
- up to 8 simultaneous locks
- best for scoring chains and clearing normal formations
- intentionally ignores red incoming threat rings

### LANCE

- one heavy lock at a time
- 3x direct damage
- shorter quantized release delay
- stronger camera/particle kick
- can target and destroy red incoming threats
- best against tanks, sentinels, boss parts and urgent threat interception

### SWARM

- up to 6 simultaneous locks
- each primary impact can arc into nearby targets
- can intercept red incoming threats
- best for dense formations and spatial FREE VECTOR groups

The lock-array denominator in the HUD changes with the active weapon so the player always sees the current lock capacity.

## Red threat rule

Red objects are no longer presented as mysterious normal enemies.

They are **incoming attack pulses**:

- hollow red torus/ring core
- octagonal warning cage
- four bracket markers
- red rear trail showing travel direction
- persistent HUD legend: `RED RING = INCOMING ATTACK`
- first appearance calls out the interception rule

`LOCK//8` cannot target them. Switch to **LANCE** or **SWARM**, aim at the red ring, hold to lock and release to intercept it before it reaches the camera. Successful interception awards score, SYNC and overdrive charge. If a threat reaches the player, it causes signal damage.

## Vector speed

The game now starts at `1.25x` world flow and exposes four selectable speed levels:

- `1.00x`
- `1.25x`
- `1.50x`
- `1.80x`

Changing speed affects tunnel/star flow and current/future rail enemy velocity rather than merely changing FOV or adding camera shake. Existing enemies are rescaled when the player changes speed so the transition is immediate.

## Shared rhythm clock

The entire game runs from a 128 BPM Web Audio clock:

- 16-step sequencer
- enemy formations spawn on bar boundaries
- danger projectiles arrive on fixed rhythmic subdivisions
- player volleys snap to the same subdivision grid
- each lock and shot creates a pitched synthesized note
- boss pulses, transformations, and attacks share the same clock
- bloom, exposure, camera response, haptics, rupture choreography, and synth accents read the same musical phase

## Generative cyber audio

There are no prerecorded music files. The soundtrack is synthesized live in Web Audio and becomes more aggressive as performance and game state intensify.

Core and expansion layers include:

- techno kick, snare and high hats
- Reese bass and sub pulses
- FM cyber stabs
- acid-style resonant sequences
- industrial toms and metallic impacts
- glitch/noise percussion
- melodic plucks, pads and lock tones
- spatial shot notes
- danger, damage, phase-shift and overdrive cues
- a dedicated FREE VECTOR drop and denser rupture pattern

Player locks, release timing, kills, damage, overdrive, section transitions and boss phases all contribute directly to the musical arrangement.

## FREE VECTOR rupture

The rail intentionally breaks during the middle act for 12 bars (about 22.5 seconds at 128 BPM).

During FREE VECTOR:

- the tunnel rail disappears
- the camera and humanoid avatar move through a broader 3D flight volume
- target formations occupy true depth, height and lateral space
- imported machine fragments spread into a floating cyber-temple field
- rotating procedural rings and a dense data cloud replace the normal corridor language
- rhythmic waves, particles and cyber synth layers intensify together
- the game collapses back onto the rail on a synchronized re-entry hit

The Convergence boss now arrives later, after the post-rupture re-entry section.

## CC0 3D asset pipeline

`pulse-ascent/assets/models/cc0/` contains a small curated runtime subset from free Kenney CC0 packs. The current import uses industrial pieces from Factory Kit and weapon/prop pieces from Blaster Kit.

The repository includes `.github/workflows/pulse-ascent-import-cc0.yml`, which can reproducibly:

1. download the official source packs
2. choose models by source GLB basename rather than brittle folder matching
3. normalize runtime filenames
4. package the shared `Textures/colormap.png` dependency required by the source GLBs
5. preserve provenance information
6. rebase/retry its generated asset commit when other game work is landing on `main`

Imported source materials are replaced at runtime with Pulse Ascent's own dark metallic, cyan/magenta emissive treatment and optional procedural edge outlines.

## Procedural rendering

- Three.js r185 with ACES tone mapping and UnrealBloom
- articulated procedural humanoid wireframe pilot
- 240-point pilot disintegration/reformation cloud
- procedural wireframe enemies
- locally served imported GLB machine/weapon geometry
- moving tunnel and perspective grid
- 4,800-point rail data/star field plus a 900-point rupture cloud
- 6,500-slot GPU particle pool
- procedural free-vector ring lattice
- palette/fog transitions by sector
- transforming eight-part boss with three phases
- adaptive pixel ratio for slower mobile GPUs
- low-FPS simulation catch-up so visuals remain much closer to the Web Audio clock

## Game progression

The course now behaves as a sequence of contrasting acts rather than one continuously denser rail:

1. AWAKENING
2. SIGNAL BLOOM
3. VECTOR TEMPLE
4. RUPTURE // FREE VECTOR
5. ASCENSION // REENTRY
6. THE CONVERGENCE // ENGINE

Enemy choreography includes rings, lines, spirals, tanks, analysis nodes, sentinels, prisms, volumetric rupture targets, rhythmic incoming attack pulses and an eight-part boss. Performance drives score multiplier, music energy, audiovisual density, evolution, aim assistance and overdrive charge.

## Browser gauntlet

The visual GitHub Actions gauntlet boots the actual WebGL/WebAudio game in Chromium and verifies more than syntax:

- humanoid pilot rig exists with enough articulated wireframe parts
- pilot disintegration cloud is present
- weapon and speed controls exist
- normal LOCK//8 combat still fires correctly
- LANCE can target and destroy a spawned red threat
- speed cycling changes the active speed state
- local GLB loading without console/page errors
- FREE VECTOR state and imported scene population
- humanoid remains active in FREE VECTOR and boss states
- desktop screenshots
- 390x844 mobile FREE VECTOR screenshot and control overflow checks
- forced boss state with no stale pre-boss entities

Screenshots and state JSON are uploaded as workflow artifacts for visual review.

## Technical notes

This is a no-build static game intended for GitHub Pages. Three.js modules are pinned through an import map. `window.__pulseAscent` exposes the live game instance, `window.__pulseExpansion` exposes FREE VECTOR/asset diagnostics, and `window.__pulsePilot` exposes pilot/weapon/speed diagnostics used by the browser gauntlet.
