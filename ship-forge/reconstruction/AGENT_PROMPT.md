# Continue the img2threejs reconstruction

Use the reference image at `ship-forge/reference.jpg` and the current procedural model at `ship-forge/ship-model.js`.

Rebuild/refine the subject as a procedural Three.js hard-surface model. Preserve the existing runtime hierarchy and interactive viewer. Hold silhouette, proportions, visible panel boundaries, cockpit angle, engine placement and weapon placement to the reference. Enumerate identity-defining details before each pass and implement them as real geometry/material regions rather than texture-only fakes. Prioritize large shape mismatches before micro-detail.

Run strict quality behavior conceptually: do not advance a pass when the reference side-by-side still has a meaningful silhouette, proportion, component, or material mismatch. Record uncertainty instead of inventing confidence for the hidden side, underside and rear. Keep mobile performance viable by instancing repeated bolts/vents and generating repeated greebles procedurally.

Iteration order: camera match → silhouette → cockpit/nose → side hull layers → engines → dorsal silhouette → weapon systems → exposed mechanics → panel seams/fasteners → materials/wear → lighting → optimization.
