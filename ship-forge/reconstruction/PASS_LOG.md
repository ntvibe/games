# NX-79 reconstruction pass log

This folder follows the img2threejs reconstruction philosophy: code-only geometry, named component hierarchy, explicit evidence/confidence, and pass-gated refinement. The working loop is `blockout → structural → form → material → surface → lighting → interaction → optimization` rather than opaque image-to-mesh generation.

## Current pass state

1. **Blockout** — locked long/low silhouette, spear nose, wide mid-body and rear propulsion mass.
2. **Structural** — split cockpit, core, port, starboard, dorsal, engine, weapon and detail systems into independently editable groups.
3. **Propulsion** — four thrusters with shells, collars, fins, rings and emissive interiors.
4. **Form** — faceted canopy, nose cheeks, dorsal armor, stabilizers and sensor fins.
5. **Mechanical** — twin-barrel turrets, nose guns, underwing cannons, side cylinders and exposed pipes.
6. **Surface** — procedural panel arrays, ribs, vents, fasteners and greebles.
7. **Underside** — deliberately lower-confidence because the source does not show it directly.
8. **Material / lighting / interaction** — PBR material classes, emitters, animated engine pulse, explode/wireframe/reference inspection tools.
9. **Integrated hard-surface refinement** — chamfered armor, shoulder/rear caps, deeper vent banks, connected mechanical rails, canopy framing and seam breaks.
10. **Hierarchical detail refinement** — dedicated `10-pass10-detail` system with engine cages, cockpit internals, avionics, service trunks, pistons, asymmetric rear plumbing, weapon installation hardware, underside trays and locator emitters.
11. **Macro shell reconstruction** — dedicated `11-pass11-macro-shells` system with segmented engine cowls, continuous cockpit-to-dorsal armor flow, unified rear propulsion bridge, authored side armor, dorsal command geometry and deliberate port/starboard asymmetry. Solid convex cowl fillers are disabled so engine negative space stays visible.
12. **Surface realism** — dedicated runtime `pass12-surface.js` system with procedural roughness/micro-bump maps for UV-capable meshes, deterministic per-mesh material variation, heat bands, soot overlays, edge scuffs and a material-debug inspection mode.
13. **Reference proportion correction** — dedicated `pass13-reference.js` pass that narrows/lengthens the spear nose, lowers/slopes the canopy, flattens the cockpit-to-dorsal stack, tapers/separates engine cowls, opens rear negative space and adds a flat silhouette inspection mode.
14. **Reference likeness + cinematic explode** — dedicated `pass14-likeness-explode.js` pass that pushes visible proportions closer to the source and replaces the binary explode jump with a deterministic two-second staggered animation for major systems and selected nested assemblies.
15. **Phone-first viewer + full-detail explode** — dedicated `pass15-mobile-refine.js` pass that sharpens the visible silhouette again, adds restrained reference-specific armor/rail/engine accents, removes the floor/grid from the viewer, collapses all controls behind a single floating menu, adds double-tap explode and upgrades the explode controller to include major groups, medium assemblies and individual visible meshes.
16. **Reference micro-refinement + per-instance explode** — dedicated `pass16-reference-microexplode.js` pass that sharpens the nose/canopy/cheek and engine silhouette again, adds restrained reference-specific ribs/slits/rails, and upgrades explode so instanced fasteners and other instanced parts separate individually in addition to groups and normal meshes.

## Pass 16 outcome

- Added a thinner `16-nose-razor` extension and tightened the canopy, canopy roof and side-cowl proportions again to keep the front profile long, low and sharp.
- Added small cheek knives, lower canopy rails and red cheek slits to make the visible front-quarter silhouette read closer to the reference without covering the dark glass.
- Main engine macro groups are stretched and narrowed slightly again, with new shoulder vanes, red rails and rear rib rhythm to emphasize distinct propulsion pods and mechanical negative space.
- Added sparse dorsal slot details instead of adding another bulky top shell.
- Runtime version is now `ship-forge-v9-pass16`; visible-side reconstruction confidence is 98.9%, rear 92.8%, hidden side 75.4%, underside 66%. These remain qualitative reconstruction-confidence labels rather than measured geometric accuracy.

### Deep micro-explode behavior

- Explode remains a **2.0 second** eased transition and still reverses smoothly from the current progress when triggered mid-animation.
- Major sections, medium assemblies and normal visible meshes continue to receive deterministic per-object delay, speed, distance, direction jitter and rotation drift.
- **Instanced meshes are now expanded at the matrix level during the animation.** Every instance captures its assembled local transform and receives an independent deterministic explode profile.
- The existing instanced surface-fastener field therefore no longer travels as one block: individual bolts/fasteners separate with their own delays, short travel distances and small rotations.
- Instance animation is performed through `InstancedMesh.setMatrixAt()` and only updates while exploded/animating, preserving the single-draw-call benefit of instancing while still producing individual-part motion.
- Runtime metadata now reports normal explode targets plus the number of individually animated instances and explicitly marks `explodeIncludesInstances: true`.

### Phone / fullscreen viewer

- Floor and grid remain completely removed.
- Viewer remains a clean `100dvh` full-viewport scene with only one floating menu button visible by default.
- All controls stay inside the collapsed menu panel.
- Desktop double-click and mobile/pen double-tap continue to toggle explode directly on the ship.
- Fullscreen control remains available through the browser Fullscreen API where supported.
- Mobile render pixel ratio is now capped at 1.45 to offset the extra per-instance explode work while preserving the same lighting and phone-first interaction model.
- Pass 16 geometry is applied before the surface pass, while the Pass 16 explode controller installs after the surface pass so it is the only active explode controller and sees the final assembled hierarchy.
- CI now syntax-checks `pass16-reference-microexplode.js` alongside all previous procedural modules.

## Next refinement targets

- Add automated browser-render capture of exact **Ref pose beauty + Silhouette** screenshots as GitHub Actions artifacts so further reference corrections are driven by actual visual comparison.
- Add a representative mobile viewport screenshot/smoke test that captures collapsed-menu, exploded and fullscreen-like states.
- If per-instance explode proves expensive on lower-end phones, add a deterministic mobile instance budget while keeping the same visual rhythm.
- Once reference-pose macro errors are small, tune selective engine heat-metal/anisotropy behavior instead of adding more geometry.
- Add GLB export/bake tooling once the silhouette stops changing, keeping procedural source code as the editable master.
