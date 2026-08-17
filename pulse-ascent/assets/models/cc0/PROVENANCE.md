# Pulse Ascent CC0 model provenance

Runtime models in this directory are curated automatically from the official free Kenney packs below.

- Kenney Factory Kit 3.0 — https://kenney.nl/assets/factory-kit — Creative Commons CC0.
- Kenney Blaster Kit 2.1 — https://www.kenney.nl/assets/blaster-kit — Creative Commons CC0.

The import workflow matches source GLB basenames, copies a small runtime subset, and normalizes filenames for stable game references. `Textures/colormap.png` is bundled because the source GLBs reference that shared relative dependency. Pulse Ascent replaces the imported source materials at runtime with its own cyber-metal/emissive materials, but the dependency is still packaged so GLTFLoader resolves every asset cleanly.

Original creators retain authorship; CC0 does not require attribution, but provenance is kept intentionally.
