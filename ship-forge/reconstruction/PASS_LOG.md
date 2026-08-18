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
14. **Reference likeness + cinematic explode** — dedicated `pass14-likeness-explode.js` pass that further lengthens the spear, tightens canopy/cheek armor, flattens the upper profile, elongates/separates propulsion pods and adds sparse reference-specific rear/canopy shapes. It also replaces the old binary explode jump with a deterministic two-second staggered animation controller.

## Pass 14 outcome

- Nose and canopy proportions are pushed another step toward the source: longer spear, slightly narrower/lower front mass, tighter cheek armor and a thinner canopy brow that preserves the dark faceted glass instead of covering it with a solid shell.
- Added reference-specific cheek blades, canopy side frames and red cheek accents to strengthen the visible front-quarter identity.
- Cockpit-to-dorsal bridge and command shell are lowered again slightly so the top line stays flatter before the mast/sensor region.
- All four macro engine groups are stretched longitudinally and tightened vertically/laterally, with additional spacing so the rear reads as distinct propulsion pods rather than one filled block.
- Rear propulsion spine/shoulder and side macro armor are compressed subtly to preserve stronger mechanical negative spaces.
- Added sparse rear fin caps, red fin accents, rear braces and engine red strakes without filling the open gaps.
- Runtime version is now `ship-forge-v7-pass14`; visible-side reconstruction confidence is 98.4%, rear 91.5%, hidden side 75%, underside 66%. These remain qualitative reconstruction-confidence labels rather than measured geometric accuracy.

### Cinematic explode behavior

- `Explode` now animates instead of jumping.
- Full transition duration is **2.0 seconds** in either direction.
- Uses a cubic ease-in/out curve for smooth acceleration/deceleration.
- Major systems receive deterministic pseudo-random timing profiles derived from their names, so the effect is stable between clicks rather than using frame-by-frame randomness.
- Each target gets a different delay, perceived speed, distance multiplier and small rotational drift.
- Cockpit travels forward, port/starboard systems peel outward, engines pull strongly rearward, dorsal systems lift upward and weapons drop/spread away from the hull.
- Selected nested assemblies — the four base engines, four Pass 11 macro cowls, turrets and dorsal command shell — receive secondary motion on top of their parent section, producing a more dramatic layered disassembly.
- Tapping Explode again while the animation is still running reverses smoothly from the current progress instead of popping to a new state.
- The controller is installed after Pass 12 so it supersedes all older immediate explode wrappers while still animating the Pass 12 surface overlay group.
- CI now syntax-checks `pass14-likeness-explode.js` alongside the earlier procedural passes.

## Next refinement targets

- Add an automated browser render workflow that captures exact **Ref pose beauty + Silhouette** screenshots as GitHub Actions artifacts. This is now the highest-value next step because further reference-likeness work should be driven by actual visual comparisons rather than another blind geometry pass.
- Use those captures to tune only the largest remaining differences in canopy angle/visibility, nose length, engine cowl spacing/taper and rear negative-space silhouette.
- Consider a dedicated per-child explode profile for a few additional high-value mechanical subassemblies only if the current animation still feels too block-based; avoid animating every greeble or fastener.
- Once reference-pose macro errors become small, tune selective engine heat-metal behavior and exposed-steel anisotropy rather than adding more geometry.
- Add GLB export/bake tooling once the silhouette stops changing, keeping procedural source code as the editable master.
- If additional top/rear/underside references become available, replace inferred geometry instead of refining guesses indefinitely.