# Display & comfort

Skill: `remaster-display`. Tools below are well-known starting points: always check the
current version, the official source and whether the game's own page recommends something else.

## Tool families

| Need | Typical tools | Notes |
|---|---|---|
| Load small plugins / fixes | Ultimate ASI Loader (ThirteenAG) | Proxy DLL that loads `.asi` plugins; many per-game fixes use it. |
| Per-game widescreen / FOV fixes | ThirteenAG's Widescreen Fixes Pack, Flawless Widescreen, game-specific patches | Check PCGamingWiki and GitHub per game. |
| API wrappers (stability, modes, alt-tab) | dgVoodoo 2 (Glide, DirectDraw, Direct3D 1-9 to modern Direct3D), DXVK (Direct3D to Vulkan) | Only add a wrapper to fix a real problem, and test the HUD and videos after. |
| Frame pacing, HDR, window modes | Special K | Powerful but invasive; test conflicts. |
| Post-processing | ReShade | Out of v1 scope unless the owner asks (it changes the look). |
| Memory on 32-bit games | Large-address-aware flag (e.g. NTCore's 4GB Patch) | Modifies the exe header: only on the test copy, with the owner's agreement, and documented. |

## Display checks

Run them with `remaster-qa`. Each is pass / fail / unknown.

- [ ] Image is Hor+ at the target aspect ratio (no stretch, no vertical crop).
- [ ] Menus, loading screens, videos and cutscenes display correctly (pillarboxed is fine).
- [ ] HUD readable and correctly anchored at target resolution, including ultrawide if targeted.
- [ ] FOV sane by default; viewmodel not distorted.
- [ ] Target frame rate reached; physics, animation, AI, scripts and input behave the same as at
      the original rate (test jumps, doors, timed events, projectiles, cutscenes).
- [ ] No stutter in the capture plan's heaviest scene; alt-tab and window mode work.
- [ ] Controller works in menus and gameplay (if in scope).
- [ ] Saves from before the changes still load.
