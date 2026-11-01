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

## Textures: first inventory

- 52 `.utx` packages in `Textures/` (121 MB): world sets, effects, skies, skins, fonts and
  menu graphics (`MenuGr`, `UWindowFonts`, `UPakFonts`), palettes.
- Extraction must also look inside maps and code packages (see Guesses) before assuming
  `Textures/` is complete.

## Observations

- `detect_engine` read the headers of only 20 packages out of 302 (the per-signal cap,
  `maxMagicFilesPerSignal`). A separate full read found the tag in all of them.
- The disc's `System` folder holds GameSpy's installer and `Setup.exe` next to the game,
  which `detect_engine` used to rank first (fixed in #5).

## Deductions

- Patch 226b is the version Kentie's D3D10 renderer supports, so the stock disc is a usable
  base for a display recipe without OldUnreal's 227. Whether 227 is the better base is a
  research question.

## Guesses

From memory of UE1, to confirm on extraction:

- Maps (`.unr`) can embed their own textures, and code packages (`UnrealShare.u`,
  `UnrealI.u`, `UPak.u`) carry some.
- Most textures are 8-bit paletted with mipmaps; masked textures use palette index 0 for
  transparency, so classification must keep masks apart.

## Capture plan

To write at baseline (`remaster-qa`). Needs the owner to launch the game: no screen access
from the agent.

## Log

- 2026-10-31: ISO downloaded and verified, game folders extracted, triage with
  `detect_engine` and `read_pe_info`; exe ranking fixed and `unreal-1` signature verified (#5).
- 2026-11-01: identity record written.
