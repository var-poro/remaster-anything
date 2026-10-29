---
name: remaster-textures
description: Faithful texture remaster for old PC games - extract textures from the game's formats and archives, classify them (diffuse, normal map, mask, UI, font, sky, lightmap), upscale each kind with the right model or method, re-encode with correct compression, alpha and mipmaps, and load them back through a repack or an override mechanism, within the game's memory limits. Use it whenever the user wants sharper, HD or upscaled textures, an AI texture pack, or "the game looks blurry", and to vet an existing texture pack.
---

# Textures

Read [playbook/textures.md](../../playbook/textures.md) for tools, formats and pitfalls.
Fidelity rule: **upscale, don't repaint.** Same shapes, same palette, same art direction.

## Path 1: an existing pack

Check it before recommending it: coverage (which levels, characters, UI), fidelity (compare
crops with the originals), compatibility with the display stack, memory use, license.
A pack that reinterprets the art can still be listed, but as optional and labelled.

## Path 2: building it

1. **Extract** to `local/extracted/` with a tool that reads the engine's formats. Keep a
   manifest: original path, format, size, compression, alpha, mip count, hash.
2. **Classify** each texture: diffuse, normal map, specular or mask, UI, font, sky, lightmap,
   detail texture, animated frames. Filename patterns, color statistics and format help.
   Ambiguous ones go to a review list, not to a guess.
3. **Upscale by class:**
   - Diffuse: a faithful upscaling model; test 2 to 3 models on a sample set first and let the
     owner pick from side-by-side crops.
   - Alpha: process separately, keep hard cut-outs hard.
   - Normal maps: never treat as photos; upscale per channel then renormalize.
   - UI and fonts: often best with a model trained for line art, or kept as-is.
   - Tiling textures: check seams after upscaling.
4. **Re-encode** in the format the engine expects (same compression family, regenerate mipmaps),
   or in a better one only if the engine and the override path support it.
5. **Load back** through the least invasive route: a loose-file override the engine supports,
   an injection layer, or a repack into a copy of the archive. Never touch the original install.
6. **Respect limits:** 32-bit games often crash past ~2 GB of address space. Measure memory in a
   heavy scene; use moderate scale factors or the large-address-aware approach documented in the
   playbook, with the owner's agreement.

## Done when

Fidelity checks pass ([qa.md](../../playbook/qa.md#texture-checks)), no level crashes or runs
out of memory, and the whole pipeline (models, versions, settings) is in the recipe so any
owner can regenerate the textures locally. Never commit textures.
