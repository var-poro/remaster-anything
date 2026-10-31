# Deus Ex (2000): working notes

Pilot game of Remaster Anything. Status: research done (web only), game not installed yet.

## Identity

| Field | Value | How we know |
|---|---|---|
| Store / version | unknown (owner does not have the game yet) | |
| Main exe + SHA-256 | unknown | |
| Bitness | unknown (expected 32-bit, to confirm) | |
| Engine | Unreal Engine 1 (to confirm on the install) | |
| Renderer API(s) | stock: Direct3D 7, OpenGL 1.2, Glide, software ([PCGW](https://www.pcgamingwiki.com/wiki/Deus_Ex)); to confirm | |
| Large address aware | unknown | |
| Owner's OS / GPU / display | unknown | ask |

Every digital release is the Game of the Year Edition, already patched to 1.112fm
([PCGW](https://www.pcgamingwiki.com/wiki/Deus_Ex)).

## Scope agreed with the owner

- Axes: display & comfort, textures
- Target resolution / aspect / refresh: unknown
- Fidelity: strictly faithful (default)

## Research summary (2026-10-31)

Directory entries: 14 projects and 1 gap in `data/directory.yaml` (slug `deus-ex`).

| Axis | What exists | Faithful? |
|---|---|---|
| Launcher / modern-PC fixes | Deus Exe v8.1 (Kentie), Launch (Hanfling, 2019), Community Update 3.4.1 (bundle) | yes |
| Renderer | Kentie D3D10 v29, Dohnal OpenGL 2.1 / D3D9 1.3 | yes (D3D10 with ClassicLighting) |
| Renderer, new look | DirectX 11 (darknovismc), DECoR (PBR), Echelon + RTX Remix | no |
| Bug fixes | Transcended (bundled by the Community Update), Confix | art yes, gameplay partly changed |
| Textures | New Vision 1.5 (grungy restyle), HDTP (new models), Helios (unknown), New Vision 2.0a (2019 AI test) | only 2.0a claims it, unverified |
| Official | Deus Ex Remastered (Aspyr): delayed indefinitely, no date | no (new models and lighting) |

Out of scope for now (total overhauls, no `kind` fits, see `data/SCHEMA.md`): Deus Ex:
Revision (new level design and music, authorised by Square Enix, free on Steam/GOG), GMDX
and its forks (gameplay overhaul that bundles New Vision and HDTP).

## Stack proposal (to confirm with the owner before installing anything)

### Display & comfort

Proposed: **minimal stack, each piece pinned and reversible**.

1. Base: GOTY 1.112fm, untouched copy of the install.
2. Launcher: Deus Exe v8.1 (FOV, borderless, GUI scaling, frame limit, 2 TB save fix,
   audio stutter fix). Fallback: Launch, if Deus Exe misbehaves (menu freezes with its
   limiter are reported).
3. Renderer: Kentie Direct3D 10 v29 with ClassicLighting on, HDR, bloom and parallax off,
   so the look matches the original. Fallback: Dohnal Direct3D 9 / OpenGL.
4. Wide-FOV weapon models: PCGamingWiki's weapon offsets, or Transcended's viewmodel fix
   (Transcended also changes AI and augmentations, owner's call).
5. HUD scaling: Deus Exe's GUI scaling first; OTP UI Fix if it falls short at the target
   resolution.

Why not the Community Update as the base: it is the community's one-click answer and a good
reference, but it is a 1.2 GB installer that overwrites core files and enables Transcended
and Confix by default. A recipe built from separate pinned pieces is easier to verify,
reproduce and roll back. Worth comparing against during QA.

To verify on the install: Hor+ FOV value per aspect ratio, HUD and menu size at the target
resolution, weapon model position, frame pacing at 60 / 120 / 144 FPS (PCGW reports stutter
above 120 FPS and with NVIDIA drivers 442+), Alt+Tab, saves on a large disk.

### Textures

Nothing faithful and current exists (gap entry). This is the axis to build:

1. Extract the textures from the game's `.utx` packages (tools to evaluate: UModel and the
   New Vision SDK, both referenced by the community).
2. Classify (world, characters, items, UI, fonts, masked, animated), upscale faithfully,
   re-encode to S3TC with mipmaps.
3. Load them back. Two paths to compare on the install:
   - repacked packages with S3TC, as New Vision 1.5 does (works with OpenGL, D3D9, D3D10);
   - Kentie D3D10 texture hotloading, as New Vision 2.0a does (no repacking, D3D10 only).
4. Optional, labelled reinterpretations in the recipe: New Vision 1.5, HDTP.

To verify: maximum texture size the engine accepts per class (HDTP mentions 256 for its
objects, New Vision goes higher), memory headroom of the 32-bit exe (LAA), texture cache
size (`CacheSizeMegs`).

### Decisions for the owner

- Which store to buy: GOG (DRM-free, cloud saves; PCGW reports the 32-bit colour bug only
  on Steam) or Steam (the version Kentie tested). Both are 1.112fm.
- Vanilla gameplay, or Transcended's fixes (AI and augmentation changes, incompatible saves).
- Target resolution, aspect ratio and refresh rate.

## Leads still to verify

- OTP UI Fix and Peixoto's patch (HUD scaling), PCGW weapon offset file.
- UE1 Launcher (bundled by the Community Update, borderless by default).
- Veronika's HDR brightness fix (only relevant if HDR is on).
- Helios Texture Overhaul: how it was made; compare against originals.
- DaveW's other AI texture demo mentioned by DSOGaming (may be New Vision 2.0a itself).

## Observations

- PCGamingWiki, ModDB and Kentie's pages are the main sources; ModDB and PCGamingWiki block
  plain HTTP fetches and had to be read in a browser.
- Kentie's pages give version numbers (Deus Exe v8.1, D3D10 v29) but no release dates.

## Deductions

- The display axis is mostly assembly; the texture axis is mostly building.

## Guesses

- none

## Capture plan

To write at baseline (`remaster-qa`), once the game is installed.

## Log

- 2026-10-31: web research for display and textures; 14 directory entries and 1 gap.
