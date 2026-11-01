# Unreal Gold (2000): working notes

Second game, used to test the tools and skills on a real Unreal Engine 1 install while the
Deus Ex pilot waits for the owner's copy. Status: triage done on the extracted disc, game not
launched yet.

## Identity

| Field | Value | How we know |
|---|---|---|
| Store / version | Disc image, Unreal Gold 226b, not patched | `System/Manifest.ini` (`Product=Unreal Gold`, `Version=226b`); ISO from the [OldUnreal installer list](https://github.com/OldUnreal/FullGameInstallers), SHA-1 matches archive.org |
| Main exe + SHA-256 | `System/Unreal.exe`, `2bd22dba9cd13c4159f19e0bfccae73f53f8e3f27300c1693e95f8c9d4c330ac` | `read_pe_info` |
| Bitness | 32-bit (i386), built 2000-08-17 | `read_pe_info` (PE `Machine` 0x14c, timestamp) |
| Engine | Unreal Engine 1 | `detect_engine`: `unreal-1` high, verified; package tag `0x9E2A83C1` with versions 60 to 68 in every package |
| Renderer API(s) | Pluggable renderers: Direct3D (`D3DDrv`), OpenGL (`OpenGlDrv`), Glide, S3 MeTaL, software. Default config: software | `detect_engine` renderer modules; `GameRenderDevice=SoftDrv.SoftwareRenderDevice` in `System/Unreal.ini` and `Default.ini`. The exe itself imports no graphics DLL |
| Large address aware | no | `read_pe_info` |
| Install size | 726 files, 659 MB (Maps 275, Sounds 154, Textures 121, System 67, Music 42) | extracted copy |
| Owner's OS / GPU / display | unknown | ask |

Install: game folders copied straight from the ISO (`Help`, `Maps`, `Music`, `Sounds`,
`System`, `Textures`), without the disc's installer, autorun or DirectX setup. The pristine
copy is never modified; every test runs on a separate copy (paths in `local/`).

## Scope agreed with the owner

- Axes: display & comfort, textures (v1), to confirm
- Target resolution / aspect / refresh: unknown
- Fidelity: strictly faithful (default)

## Prior work (not researched yet)

- Nothing in `data/directory.yaml` or `games/` for Unreal Gold.
- Known leads for `remaster-research`: OldUnreal's community patch 227 (Epic-approved, adds
  modern renderers and fixes, and is what the OldUnreal installers apply), Kentie's Direct3D
  10 renderer (supports 226), darknovismc's DirectX 11 renderer (lists Unreal Gold).
- No official remaster known.

## Textures: extraction and inventory (2026-11-01)

### How they were extracted

- The 226 `UCC.exe` has no export commandlet (only `master`, `make`, `conform`, `server`,
  per `System/Editor.int` and `Engine.int`). UnrealEd 226 can export, but only by hand.
- OldUnreal 227k ([v227k_15](https://github.com/OldUnreal/Unreal-testing/releases/tag/v227k_15),
  Windows zip, SHA-256 matches the release digest) has `batchexport` (BMP or PCX) and
  `dumptextureinfo`. It was installed on a separate test copy, never on the pristine one.
- 227k replaces three original texture packages (`SkyBox`, `UPakFonts`, `UWindowFonts`) and
  every code package in `System/`. The replaced `.utx` files were left out of the patch so
  the 226 versions were exported. The 226 code packages were copied under another name
  (`UnrealShare226.u`...) so they load next to 227k's own: this works for every package
  except `Core.u` (no textures) and `Engine.u` (38 textures, mostly editor icons, fail to
  load with 227k's classes: serial size mismatch).
- Commands, from the test copy's `System` folder:
  `ucc batchexport <package> texture bmp <out dir>` and `ucc dumptextureinfo <package>`.

### What there is

| | Count |
|---|---|
| Textures exported (BMP, 8-bit paletted) | 4430: 3319 in 52 `.utx`, 1111 in 8 code packages |
| Biggest code packages | `UnrealShare` 651, `UMenu` 143, `UnrealI` 125, `UPak` 118 |
| Textures embedded in maps | 0 (55 maps exported, 3 also dumped) |
| Format | all `TEXF_P8` (paletted), with mipmaps |
| Size (largest side) | 128: 1840, 256: 1613, 64: 473, 32: 333, 512: 35, 1024: 1, smaller: 135 |
| Non-square | 1302 |
| Masked (`PolyFlags` bit 0x2) | 760 |
| Animated (`AnimNext` set) | 319 |
| Procedural, generated at run time | 226: `FireTexture` 140, `WetTexture` 75, `IceTexture` 7, `WaveTexture` 4 |
| Using a detail texture / macro texture | 1886 / 29 |
| Total base-level pixels | 112 million |

Per-package dump counts match the exported file counts. The exports, dumps and inventory
stay outside the repo (paths in `local/`).

### What it means for the texture pass

- Procedural textures (`FireTexture`, `WaveTexture`) are drawn by the engine each frame: the
  exported image is not what the player sees, so they must not be upscaled as images. Wet and
  ice textures distort a source texture (from memory, to confirm), which could be upscaled.
- Masked textures need their mask kept sharp through the upscale (no blended edges).
- Animated chains (`AnimNext`) must be upscaled as a set, so frames stay consistent.
- Detail textures are drawn over 1886 surfaces at close range: they belong in their own class.

### Upscale test 1 (2026-11-01)

Setup: Python 3.10 venv outside the repo, PyTorch 2.14.1+cu130, spandrel 0.4.2, Pillow
12.3.0, owner's RTX 3080 Ti (12 GB). Models from OpenModelDB, SHA-256 checked against its
entries:

| Method | Arch | License | SHA-256 (start) |
|---|---|---|---|
| Lanczos 4x (no model, reference) | | | |
| [Real-ESRGAN x2plus](https://github.com/xinntao/Real-ESRGAN/releases/tag/v0.2.1) | ESRGAN | BSD-3-Clause | `49fafd45f8fd` |
| [Real-ESRGAN x4plus](https://github.com/xinntao/Real-ESRGAN/releases/tag/v0.1.0) | ESRGAN | BSD-3-Clause | `4fa0d38905f7` |
| [4x-UltraSharpV2](https://huggingface.co/Kim2091/UltraSharpV2) | DAT | CC-BY-NC-SA-4.0 | `2b5db674aa8f` |

Test set, 12 textures: a wall, a door, two masked grates, a three-frame animated chain, a
detail texture, a player skin, a menu logo, a font page and a sky. Masked textures: palette
index 0 put back at its exact colour, at nearest-neighbour edges, after the upscale.

Fidelity check: the upscaled image is box-downscaled to the original size and compared
(PSNR, higher is closer; drift = largest shift of a channel's mean, in 0-255 levels).

| Method | PSNR median (min) | Drift median (max) | Time per texture, median |
|---|---|---|---|
| Lanczos 4x | 40.3 (23.2) | 0.4 (2.3) | |
| Real-ESRGAN x2plus | 29.9 (22.6) | 1.5 (7.0) | 73 ms |
| Real-ESRGAN x4plus | 30.2 (25.6) | 2.3 (15.4) | 253 ms |
| 4x-UltraSharpV2 | 38.0 (27.2) | 0.7 (4.1) | 702 ms |

What the crops show (same regions, side by side):

- Real-ESRGAN x4plus is a reinterpretation: it darkens and adds contrast (drift 15 on a
  stone floor), smooths the original grain and draws new cracks. Out.
- Real-ESRGAN x2plus also wipes the grain (the grates turn into smooth metal). Out.
- 4x-UltraSharpV2 keeps colours and grain closest to the original and is clearly sharper
  than Lanczos. It still invents fine scratches on noisy metal. Best candidate so far.
- Lanczos wins on PSNR because the downscale-and-compare check rewards blur: PSNR alone
  cannot rank methods, the crops are needed.
- Masks: the mask colour here is pure blue. The models see it and bleed a fringe into the
  edge of the bars. Fix to try: fill masked pixels from their neighbours before the upscale,
  then put the mask back.
- Font pages: every method blurs or deforms the glyphs. Fonts need their own path (nearest
  neighbour, or redrawn at the new size) and the engine's font metrics must follow.

Speed: at UltraSharpV2's median rate (0.7 s), the 4430 textures take about 50 minutes
on this GPU.

## Observations

- `detect_engine` read the headers of only 20 packages out of 302 (the per-signal cap,
  `maxMagicFilesPerSignal`). A separate full read found the tag in all of them.
- The disc's `System` folder holds GameSpy's installer and `Setup.exe` next to the game,
  which `detect_engine` used to rank first (fixed in #5).

## Deductions

- Patch 226b is the version Kentie's D3D10 renderer supports, so the stock disc is a usable
  base for a display recipe without OldUnreal's 227. Whether 227 is the better base is a
  research question.
- Memory budget: 112 million base pixels become 448 million at 2x and 1.8 billion at 4x.
  Compressed (DXT1 0.5 byte per pixel, DXT5 1 byte) plus a third for mipmaps, that is roughly
  0.3 to 0.6 GB at 2x and 1.2 to 2.4 GB at 4x, if every texture were loaded at once. A
  uniform 4x does not fit a 32-bit exe without LAA; per-class factors will be needed.
- Code packages hold a quarter of the textures (1111 of 4430): a pass limited to
  `Textures/` would miss the weapons, pickups and menus.

## Guesses

From memory of UE1, to confirm:

- Masked textures use palette index 0 for transparency. The test crops agree (index 0 is
  pure blue in the gaps of a grate), but the engine's rule is not checked.
- `PolyFlags` bits: 0x2 masked, 0x4 translucent, 0x40 modulated. Only the masked bit is
  set on any texture here; translucency is likely set per surface or actor instead.

## Capture plan

To write at baseline (`remaster-qa`). Needs the owner to launch the game: no screen access
from the agent.

## Log

- 2026-10-31: ISO downloaded and verified, game folders extracted, triage with
  `detect_engine` and `read_pe_info`; exe ranking fixed and `unreal-1` signature verified (#5).
- 2026-11-01: identity record written. 226 UCC cannot export; 227k downloaded and installed on
  a test copy; 4430 textures exported from the 226 packages and inventoried. First upscale
  test: Lanczos, Real-ESRGAN x2 and x4, 4x-UltraSharpV2 on 12 textures.
