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
13. **Reference proportion correction** — dedicated `pass13-reference.js` pass that moves back to large-form accuracy: narrows and lengthens the spear nose, lowers/slopes the canopy, flattens the cockpit-to-dorsal stack, tapers and separates the engine cowls, opens rear negative space, pulls side armor inward and adds a dedicated flat silhouette inspection mode.

## Pass 13 outcome

- Nose-primary, upper/lower nose, center ridge, canopy, canopy roof and cheek assemblies are proportionally corrected toward a longer/lower/narrower source silhouette rather than receiving additional microdetail.
- Canopy height is reduced and the side-profile angle strengthened; the cockpit-to-dorsal bridge/cap and dorsal command shell are lowered so the top contour is less bulky.
- All four Pass 11 engine macro groups are stretched longitudinally, flattened vertically, narrowed laterally and spaced farther apart. Their visible upper/lower cowl plates and lateral blades are also retuned so the propulsion block exposes more negative space.
- Rear propulsion spine and shoulder shells are compressed laterally/vertically to stop the rear from reading as one solid mass.
- Port thermal and starboard sensor installations remain asymmetric, but both are pulled closer to the corrected macro silhouette.
- Large side macro armor is moved slightly inward so the wing/engine outline dominates more strongly in the reference view.
- Added a sharper spear-tip/chin correction shell, sparse canopy-to-shoulder rails and rear gap braces without filling the newly opened spaces.
- Added **Silhouette** viewer mode. It temporarily replaces visible ship materials with a flat light material and hides Pass 12 surface overlays, making pure contour comparison against the source much easier at **Ref pose**.
- Silhouette, material-debug and wireframe modes are mutually coordinated so inspection state does not corrupt material restoration.
- Runtime version is now `ship-forge-v6-pass13`; visible-side reconstruction confidence is 97.9%, rear 90.5%, hidden side 74.5%, underside 66%. These are reconstruction-confidence labels, not measured geometric accuracy.
- CI now syntax-checks `pass13-reference.js` alongside all earlier procedural modules.

## Next refinement targets

- **Pass 14 should automate visual comparison rather than guessing another shape correction blindly.** Add a CI/browser render capture of the exact `Ref pose` plus the flat Silhouette view and retain those images as workflow artifacts.
- Use that capture loop to compare canopy angle, engine spacing/taper, nose length and rear negative space directly against `reference.webp`, then make only the highest-impact corrections.
- Once reference-pose macro errors become small, tune selective engine heat-metal behavior and exposed-steel anisotropy rather than adding more geometry.
- Add GLB export/bake tooling once the silhouette stops changing, keeping procedural source code as the editable master.
- If additional top/rear/underside references become available, replace inferred geometry instead of refining guesses indefinitely.
