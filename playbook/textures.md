# Textures

Skill: `remaster-textures`. Fidelity rule: upscale, don't repaint.

## Tool families (check current versions and licenses)

| Step | Typical tools |
|---|---|
| End-to-end pipeline | texup (texture-auto-upscaler): scan, classify, upscale, repack in the original format |
| Upscaling | chaiNNer (node-based), Real-ESRGAN and similar; model catalog: OpenModelDB |
| Encoding DDS / BC formats with mipmaps | texconv (Microsoft DirectXTex), AMD Compressonator |
| Engine-specific extraction | Found during research, per engine family |

## Choosing a model

Test 2 to 3 models on a sample of 10 to 20 textures (diffuse, text, organic, metal, UI).
Show the owner side-by-side crops at 100 % and pick per class. Prefer models that sharpen
without inventing detail. Record model name, version and settings in the recipe.

## Pitfalls

- **Alpha:** process separately; cut-out alpha must stay binary.
- **Normal maps:** per-channel upscale, then renormalize; never run a photo model on them.
- **Tiling:** upscaling can break seams; check in-game on large surfaces.
- **Mipmaps:** always regenerate; missing or wrong mips cause shimmering.
- **Compression:** match the original family unless the engine and the override path support better.
- **Memory:** 2x is often enough. 4x on everything can crash 32-bit games. Measure.
- **Lightmaps, skies, fonts:** handle as separate classes; fonts may need a line-art model or none.

## Texture checks

Run them with `remaster-qa`. Thresholds are provisional until tuned on the pilot game.

- [ ] Downscale-and-compare: each upscaled texture, downscaled back to its original size, stays
      close to the original (structural similarity above the threshold in `tools/` once built).
- [ ] Palette drift: average color difference per texture under the threshold.
- [ ] No seam breaks on tiling surfaces in the capture plan.
- [ ] No shimmering at distance (mipmaps present and correct).
- [ ] Peak memory in the heaviest scene under the limit for the exe's bitness, with margin.
- [ ] Every level loads; no missing or pink/black textures.
