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
11. **Macro shell reconstruction** — moved back up the hierarchy and rebuilt the biggest weak forms as a separate `11-pass11-macro-shells` module: segmented convex engine cowls around all four thrusters, continuous cockpit-to-dorsal shoulder geometry, a unified rear propulsion bridge, integrated side armor, larger dorsal command shells, a longitudinal underside keel shell and intentionally different port/starboard hardware clusters.

## Pass 11 outcome

- Four engines are now wrapped in segmented custom convex cowl panels with upper/lower shells, lateral blades, lock rings, braces, vent fields and service lines rather than relying primarily on cylinders plus accessory plates.
- A solid convex cowl volume is kept only as a construction helper and disabled in the viewer so it cannot bury the engine core; the visible housing is made from separated shell panels with readable negative space.
- The cockpit-to-dorsal region now has a continuous bridge and cap that visually carries the canopy mass into the main spine instead of reading as several stacked modules.
- A broad propulsion spine and rear shoulder shells connect the four thrusters into one coherent rear assembly.
- Controlled asymmetry is now visible beyond plumbing: the port side carries an exposed thermal manifold/cooling hardware while starboard carries a more armored sensor installation.
- Pass 10 service trunks are partially buried under larger side armor steps, improving large/medium/small hierarchy and reducing the kitbash look.
- Dorsal silhouette now uses fewer, larger authored shapes with a command shell and radar/probe cluster.
- Underside gained a continuous keel shell and service doors. This remains explicitly inferred because the source image does not reveal the lower surface.
- Pass 11 lives in its own `pass11.js` module so the macro-shell experiment can be iterated or removed without destabilizing the mature Pass 1–10 procedural asset.
- Existing explode and tick handlers are wrapped rather than replaced, so Pass 11 participates in inspection and animation while preserving previous behavior.
- Runtime version is now `ship-forge-v4-pass11`; confidence is 96.5% for the visible side, 87% rear, 73% hidden side and 65% underside. These are reconstruction-confidence labels, not measured geometric accuracy.

## Next refinement targets

- Compare the new engine cowl silhouettes directly against the reference and tune their taper, separation and negative spaces before adding more detail.
- Push the canopy glass/front armor proportions if the reference-pose comparison still shows a silhouette mismatch.
- Introduce procedural roughness variation, subtle edge wear, soot and heat discoloration now that macro geometry is more stable.
- Add an optional material-debug mode so roughness/metalness breakup can be inspected independently of lighting.
- Add GLB export/bake tooling once the macro silhouette stops changing, keeping the procedural source as the editable master.
- If additional top/rear/underside references become available, replace inferred regions rather than refining guesses indefinitely.
