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

## Pass 12 outcome

- Added procedural 128×128 roughness and fine bump textures generated in-browser, so the viewer gains material breakup without shipping new raster assets.
- UV-capable meshes receive shared procedural roughness and bump maps; convex geometry without UVs still gets deterministic roughness, metalness and tonal variation through cloned material variants.
- Dark graphite, armor, steel and gunmetal no longer share perfectly uniform reflections, making the layered geometry easier to read under the studio lights.
- Added subtle engine heat bands around all four propulsion units.
- Added soot patches around rear, dorsal and underside service areas.
- Added a small controlled edge-scuff layer on selected high-wear armor edges rather than globally whitening every edge.
- Added **Mat debug** in the viewer. It temporarily replaces materials with a roughness/metalness proxy palette and hides the decorative surface overlays so breakup can be inspected independently from the beauty lighting.
- Wireframe and material-debug modes are mutually exclusive to avoid confusing inspection states.
- Pass 12 wraps the existing explode/tick behavior instead of replacing it, so previous animation and inspection features remain intact.
- Runtime version is now `ship-forge-v5-pass12` with visible-side reconstruction confidence at 97.2%, rear at 89%, hidden side at 74% and underside at 66%. These remain reconstruction-confidence labels, not measured geometric accuracy.

## Next refinement targets

- **Pass 13 should be a silhouette/comparison correction pass rather than another density pass.** Compare the reference pose against the source and correct whichever large proportions still diverge most.
- Tune engine cowl taper, gaps and rear-negative-space shapes directly against the reference before adding more engine detail.
- Revisit canopy height, windscreen angle and front cheek width if the reference overlay still shows mismatch.
- Add targeted anisotropy/heat-metal behavior only where it materially improves the engine and exposed steel surfaces.
- Consider a lightweight post-processing pass (very restrained bloom / contact enhancement) only after material readability is confirmed on mobile.
- Add GLB export/bake tooling once the macro silhouette stops changing, keeping the procedural source as the editable master.
- If additional top/rear/underside references become available, replace inferred geometry instead of refining guesses indefinitely.
