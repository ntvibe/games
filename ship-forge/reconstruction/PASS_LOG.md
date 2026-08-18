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
17. **Screenshot-driven fidelity + emissive redesign** — dedicated `pass17-reference-fidelity-glow.js` pass driven by the user-supplied phone screenshot: flattens/widens the hull, reduces oversized dorsal mass, shrinks/recesses engine faces, strengthens swept side/rear shapes, replaces the dominant yellow engine look with red/orange emissive rings and fixes phone double-tap recognition.

## Pass 17 outcome

- The user screenshot showed the current model reading too much like a tall rectangular carrier compared with the lower, wider, swept reference. `main-keel`, `upper-spine`, center/side armor and rear bridge proportions are compressed vertically and widened laterally to move the silhouette toward the source.
- Large top-side visual mass is deliberately reduced: dorsal deck/plating, command hump, tower/mast, sensor hardware, turrets and the oversized triangular dorsal fins are all lowered or scaled back.
- Side architecture is pushed outward slightly and new shallow `17-side-shear-*` plates reinforce the long swept wedge silhouette without adding another blocky shell.
- Rear bridge/armor is compressed so the four propulsion pods read as separate systems rather than a single rectangular rear wall.
- Base engine groups are narrowed in Y/Z and the existing bright engine disks are reduced and moved inward so they read as recessed cores.
- Engine emission is redesigned around **red outer rings + orange inner cores**. Existing engine `glow`/`inner` meshes are retuned, additional emissive torus rings are added, and lightweight additive halo sprites plus two local red/orange rear lights strengthen the propulsion glow without adding a full post-processing stack.
- Existing yellow/amber nav/status/sensor emitters are converted primarily to red/orange so the lighting language matches the reference more closely.
- Added restrained red/orange emissive strips along the canopy, cheeks, side armor and rear fins instead of increasing generic surface greeble density.
- Canopy remains dark and faceted but receives a slightly stronger deep-red internal emission to better match the source cockpit mood.
- Runtime version is now `ship-forge-v10-pass17`; visible-side reconstruction confidence is 99.2%, rear 93.6%, hidden side 75.6%, underside 66%. These remain qualitative reconstruction-confidence labels, not measured geometric accuracy.

### Double-tap reliability fix

- Android/touch no longer relies on a very tight ~290 ms same-spot double tap.
- Touch/pen now uses a dedicated pointer recognizer in capture phase with a broader **620 ms** second-tap window and **160 px** spatial tolerance.
- A tap is rejected only when the gesture moved more than 24 px or was held longer than 520 ms, which separates normal taps from orbit drags without requiring tap-spam.
- Desktop keeps native `dblclick`; mobile does not attach that handler, preventing synthesized double-click events from racing with the custom touch detector.
- A short trigger cooldown prevents accidental duplicate toggles.
- The menu button briefly pulses when explode is successfully triggered, giving immediate feedback even while the control panel is collapsed.

### Phone/reference presentation

- Floor/grid remain removed and controls stay collapsed behind the single menu button.
- Mobile auto-orbit is **off by default**, so the ship stays in a stable comparison pose after load instead of immediately drifting away from the reference angle.
- Reference camera is lowered to show less top surface and more of the long side silhouette visible in the source.
- Mobile render budget remains capped at 1.45 pixel ratio and 512 shadow-map resolution.
- Pass 17 geometry is applied before Pass 12 material variation; the Pass 16 deep explode controller still installs last, so all new Pass 17 meshes participate automatically in group/mesh/instance disassembly.
- CI now syntax-checks `pass17-reference-fidelity-glow.js` alongside all previous procedural modules.

## Next refinement targets

- Add automated browser-render capture of exact **Ref pose beauty + Silhouette** screenshots as GitHub Actions artifacts so the next geometry corrections are driven by rendered evidence instead of visual memory.
- Add a representative Android-sized viewport capture and a scripted two-tap interaction smoke test to catch regressions in menu/touch/explode behavior.
- Compare the new red/orange propulsion treatment against the source and tune ring diameter/depth rather than adding more rear geometry.
- Continue reducing any remaining tall rectangular center-body areas visible in the captured reference pose; prioritize silhouette before more microdetail.
- Once macro/reference errors become small, consider a very restrained mobile-safe bloom/contact enhancement pass and selective heat-metal behavior.
- Add GLB export/bake tooling once the silhouette stops changing, keeping procedural source code as the editable master.
