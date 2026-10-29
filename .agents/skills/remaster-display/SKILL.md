---
name: remaster-display
description: Makes an old PC game display and play right on modern hardware - widescreen and ultrawide (Hor+), field of view, HUD and menu scaling, high resolutions, high or uncapped frame rates, frame pacing, borderless window, API wrappers and controller support - by assembling existing fixes or writing new ones, without breaking game logic. Use it whenever the user mentions stretched image, black bars, tiny HUD, 60 FPS cap, stutter, crashes at high resolution, controller support or "make it run well" for an old game.
---

# Display & comfort

Read [playbook/display.md](../../playbook/display.md) for tools and engine-specific notes.
Work in the test install. Capture "before" first (`remaster-qa`).

## Order of work

1. **Make it run cleanly at native resolution.** Required base patches first (official or
   community), then an API wrapper only if needed (crashes, missing modes, alt-tab, stutter).
2. **Aspect ratio:** target Hor+ (wider view, same vertical), never stretched or cropped.
   Check cutscenes, menus, loading screens, pre-rendered videos.
3. **FOV:** sane default for the aspect ratio, adjustable if possible. Check the weapon
   viewmodel separately.
4. **HUD and menus:** readable at the target resolution, anchored correctly (not stretched,
   not lost in the corners on ultrawide).
5. **Frame rate:** before unlocking, find out whether physics, animation, AI, scripts or input
   are tied to the frame rate. Many old engines are. Test jumps, doors, timed sequences,
   projectiles and cutscenes at the target FPS. If tied, cap at the highest safe value and
   document why.
6. **Frame pacing and window mode:** borderless or exclusive fullscreen, VSync, stutter.
7. **Controller:** native XInput, a community patch, or a mapping layer. Document what works.

## Path 2: writing a fix

- Prefer the engine's own config or console variables over binary patches.
- If a binary patch is needed, use a loader-based approach (ASI-style plugin or proxy DLL),
  never a modified exe in the recipe. Find values with the reverse-engineering tools the
  owner approves (REA, Ghidra, x64dbg). Document every address against the exe SHA-256.

## Done when

All checks in [playbook/qa.md](../../playbook/qa.md#display-checks) pass, captures are in
`local/captures/after/`, and every installed piece is pinned in the recipe.
