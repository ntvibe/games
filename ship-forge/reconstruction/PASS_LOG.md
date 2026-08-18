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
9. **Integrated hard-surface refinement** — replaced much of the box-like kitbash language with chamfered convex armor, layered shoulder/rear caps, deeper vent banks, connected mechanical rails, more complex engine shrouds, canopy framing, seam breaks, dorsal cable runs and a central reactor detail.
10. **Hierarchical detail refinement** — added a dedicated `10-pass10-detail` system with engine cages, nested shrouds, cockpit internals, nose sensors, avionics modules, side service trunks, pistons, nested vents, asymmetric rear plumbing, weapon installation brackets, recoil hardware, underside service trays, hardpoints, latches and additional locator emitters.

## Pass 10 outcome

- Engine areas now have a stronger sense of layered construction: inner cores, bells, multiple ring stages, external cages, shrouds, support struts and asymmetric service plumbing.
- Cockpit/nose received internal frame lines, brow armor, cheek venting and sensor pods so the front reads less like a simple canopy embedded in a wedge.
- Side detail was reorganized into connected service trunks with pistons, collars, branch pipes and nested vent banks rather than isolated greebles.
- Dorsal detail now includes a small avionics/antenna cluster with locator lights.
- Weapon systems gained clearer mounting and recoil hardware so they look installed into the airframe.
- Underside received service trays and hardpoint geometry while remaining explicitly lower-confidence.
- Added 28 fine latch/locator motifs to make small-scale detail feel repeated and authored rather than random.
- Viewer lighting and the reference camera were adjusted so the new dark-on-dark geometry reads more clearly.
- Runtime version is now `ship-forge-v3-pass10` with visible-side confidence at 95.5%, rear at 82%, hidden side at 71%, and underside at 63%.

## Next refinement targets

- Replace the largest remaining box/chamfer rear housings with custom convex macro shells shaped directly around the four engines.
- Improve the cockpit-to-dorsal transition as one continuous sculpted armor flow rather than several overlapping modules.
- Add selected controlled asymmetry to port/starboard surface clusters, not only rear plumbing.
- Introduce procedural roughness, edge wear and subtle surface breakup after macro geometry is stable.
- Consider baking/exporting the procedural result to GLB once the silhouette and engine architecture stop changing.
- If top/rear/underside references become available, replace inferred regions instead of decorating the guesses.
