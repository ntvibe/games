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

## Next refinement targets

- Increase front canopy frame accuracy and inner cockpit silhouette.
- Replace selected box greebles with custom convex wedges for closer reference matching.
- Add more engine-housing asymmetry and rear service plumbing.
- Add procedural wear/roughness maps once macro geometry is stable.
- If a top/rear/underside reference is generated later, replace all inferred regions instead of merely decorating them.
