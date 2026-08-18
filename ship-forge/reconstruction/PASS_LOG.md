# NX-79 reconstruction pass log

This folder follows the img2threejs reconstruction philosophy: code-only geometry, named component hierarchy, explicit evidence/confidence, and pass-gated refinement. The original project describes an agent loop of `blockout → structural → form → material → surface → lighting → interaction → optimization` rather than photogrammetry or an opaque mesh.

## Current pass state

1. **Blockout** — locked long/low silhouette, spear nose, wide mid-body and rear propulsion mass.
2. **Structural** — split cockpit, core, port, starboard, dorsal, engine, weapon and detail systems into independently editable groups.
3. **Propulsion** — four thrusters with shells, collars, fins, rings and emissive interiors.
4. **Form** — faceted canopy, nose cheeks, dorsal armor, stabilizers and sensor fins.
5. **Mechanical** — twin-barrel turrets, nose guns, underwing cannons, side cylinders and exposed pipes.
6. **Surface** — procedural panel arrays, ribs, vents, fasteners and greebles.
7. **Underside** — deliberately marked lower-confidence because the source does not show it directly.
8. **Material / lighting / interaction** — PBR material classes, red/orange emitters, animated engine pulse, explode/wireframe/reference inspection tools.
9. **Integrated hard-surface refinement** — replaced much of the box-like kitbash language with chamfered convex armor, layered shoulder/rear caps, deeper vent banks, connected mechanical rails, more complex engine shrouds, canopy framing, seam breaks, dorsal cable runs and a central reactor detail. Viewer now has brighter studio-style lighting and a dedicated reference pose for silhouette comparison.

## Pass 09 outcome

- More pointed and layered nose/cockpit construction.
- Heavier rear propulsion mass with nested bells, shrouds, collars and plumbing.
- Side armor reads as connected manufactured assemblies rather than isolated blocks.
- Mechanical channels now include linked cylinders, collars, pipes, vents and status emitters.
- Added a ninth named `refinement` system so future iterations can be isolated and exploded independently.
- Visible-side reconstruction confidence raised to 94%; underside remains intentionally conservative at 60% because it is inferred from one image.

## Next refinement targets

- Push exact top-profile silhouette around the cockpit-to-dorsal transition.
- Build larger custom convex engine housings instead of relying on cylindrical cores plus accessory plates.
- Introduce controlled asymmetry in exposed machinery so the ship feels authored rather than mirrored.
- Add procedural roughness/wear masks and edge breakup after the macro geometry is stable.
- Add optional GLB export/bake tooling so a mature procedural pass can be shipped as a conventional game asset.
- If top/rear/underside references become available, replace inferred regions instead of decorating the guesses.
