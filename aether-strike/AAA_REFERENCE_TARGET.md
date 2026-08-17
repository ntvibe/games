# Aether Strike — AAA Reference Target

This file turns the approved cyberpunk gameplay reference into an implementation contract for future model/render passes.

## Visual target

The target frame is a third-person cyberpunk aerial-combat scene with the player interceptor occupying a strong lower-third silhouette, premium hard-surface construction, rich PBR response, distinct enemy classes, dense but readable combat FX, stormy sky/ocean atmosphere, and cyan/magenta/orange energy accents.

This is a direction and quality bar, not a promise of literal AAA-engine parity in a mobile browser.

## img2threejs-inspired modeling rule

Every hero asset must read at three distances:

1. **Macro silhouette** — recognizable class, wing/engine/body proportions, strong negative space.
2. **Meso structure** — layered armor, intakes, nacelles, weapon mounts, canopy framing, bays, fins, structural seams.
3. **Micro detail** — vents, fasteners, trim strips, nozzle vanes, sensor heads, panel breaks, small asymmetry.

Do not add detail that cannot be placed on a real component. Avoid floating decorative primitives.

## Aether-9 interceptor detail inventory

Required identity details:

- tapered armored fuselage with separate belly/top shells
- long faceted nose with under-nose keel
- inset cockpit canopy with visible framing rails
- dorsal mechanical spine and emissive center strip
- side cheek armor and heat vents
- broad swept wings with secondary armor plates
- wing-root intakes with dark tunnel/readable lip
- tip housings and emissive leading/side trim
- twin engine nacelles with collars, rear rings, inner nozzle vanes and emissive cores
- separate weapon fairings, barrels, muzzle rings and muzzle sockets
- missile hardpoint sockets under wings
- underbody keel and emissive underside trim
- asymmetrical sensor + antenna details
- repeated fasteners/vent banks using instancing where practical

## Enemy class gates

### Scout
- thin insect-like silhouette
- central hot core/eye
- swept blade wings
- twin micro engines
- cyan reactor ring

### Striker
- heavier gunship body
- large side gun assemblies with barrels and muzzle emitters
- visible reactor ring/core
- twin rear engines
- dorsal vent/crown structure

### Tank
- armored spherical/fortress silhouette
- segmented armor plates
- dual gyro/reactor rings
- heavy forward cannons
- gold central core

### Harbinger Carrier
- unmistakably larger multi-body silhouette
- armored central spine/prow
- huge asymmetric-feeling shoulder masses with hangar/bay shapes
- multiple engine pods
- giant reactor rings
- exposed hot core cage
- long weapon lances/turrets
- dorsal structure, vents, fins, antennae and trim

## Material gates

- metals must show roughness breakup and normal detail at close range
- bright armor and dark armor must separate by both value and roughness, not just hue
- emissive accents are secondary structure, not a substitute for geometry
- glass must retain cockpit readability under bloom
- no large downloaded texture packs; use procedural/generated lightweight maps

## Runtime gates

- preserve mobile-first adaptive quality behavior
- repeated micro details should prefer InstancedMesh or shared geometry
- temporary FX must be disposed or reused
- model factories expose useful sockets/pivots in `userData` for weapons, exhaust and future animation
- keep old model generations in git history / separate files for rollback

## Iteration rule

For each future pass, compare against this order:

1. silhouette
2. proportions
3. structure
4. material separation
5. micro detail
6. lighting/readability
7. performance

Never compensate for a weak silhouette with particles or bloom.
