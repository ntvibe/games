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

## Pass 15 outcome

- Nose/front silhouette receives another small correction toward a longer, sharper spear with a thinner `15-nose-needle` extension rather than another bulky shell.
- Canopy remains visually exposed while thin side cowls and rails tighten the frame around the glass.
- Cheek armor, red cuts, engine trusses/strakes and sparse spine slits add authored reference cues without filling the negative space created in Passes 13–14.
- Main engine macro groups are stretched and narrowed slightly again, with small spacing adjustments so propulsion pods stay distinct.
- Runtime version is now `ship-forge-v8-pass15`; visible-side reconstruction confidence is 98.7%, rear 92.2%, hidden side 75.2%, underside 66%. These are qualitative reconstruction-confidence labels, not measured geometric accuracy.

### Full-detail explode behavior

- Explode remains a **2.0 second** smooth eased transition and still reverses cleanly from mid-animation.
- The controller now collects the final assembled hierarchy after the surface pass and assigns three deterministic motion tiers:
  - **primary** major section groups with the largest travel,
  - **secondary** nested assemblies with medium travel,
  - **tertiary** individual visible meshes with smaller local drift and rotation.
- Small meshes receive their own deterministic delay, speed, distance, direction jitter and rotation drift, so the ship no longer separates as only a handful of large blocks.
- Parent and child motion intentionally compound to create a layered exploded-engineering-diagram effect while keeping tertiary travel much shorter than major-system travel.
- Instanced fasteners remain one instanced target rather than expanding every instance into a separate object, preserving mobile performance.
- Runtime metadata exposes total explode target count and major/assembly/small-part counts.

### Phone / fullscreen viewer

- Removed the circular floor and grid helper entirely; only the ship, environment and lights remain.
- Viewer fills `100dvh` and defaults to a clean scene with no persistent HUD over the model.
- All controls are hidden behind one floating hamburger/menu button; the control panel is closed on load.
- Added a **Fullscreen** control using the browser Fullscreen API where supported.
- Added desktop double-click and mobile/pen double-tap detection directly on the renderer canvas to toggle explode without opening the menu.
- Touch double-tap detection rejects gestures that moved more than 12 px, reducing accidental explode triggers while orbiting.
- Mobile pixel ratio is capped at 1.5 and shadow-map resolution at 512 to keep the more complex explode hierarchy responsive on phone.
- Panning is disabled on mobile while orbit/pinch zoom remain available.
- CI now syntax-checks `pass15-mobile-refine.js` alongside all previous procedural modules.

## Next refinement targets

- Add an automated browser-render workflow that captures exact **Ref pose beauty + Silhouette** screenshots as GitHub Actions artifacts; further likeness work should now be driven by actual rendered comparison rather than blind proportion tweaks.
- Add a mobile screenshot/smoke-test capture at a representative phone viewport so menu, reference panel, double-tap and exploded state can be visually checked in CI.
- If the full-detail explode proves too expensive on lower-end phones, add a mobile detail budget that samples tertiary targets deterministically while preserving the same visual rhythm.
- Once reference-pose macro errors are small, tune selective heat-metal/anisotropy behavior instead of adding more geometry.
- Add GLB export/bake tooling once the silhouette stops changing, keeping procedural source code as the editable master.
