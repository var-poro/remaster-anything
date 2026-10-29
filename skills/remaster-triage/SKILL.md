---
name: remaster-triage
description: First step of any game remaster. Identifies the game, store, version, exe hash, engine, renderer API and bitness, checks the Remaster Anything directory for prior work, and agrees with the owner which axes to improve (display, textures). Use this whenever the user wants to remaster, modernize, upscale, fix widescreen or improve the visuals of an old PC game, even if they don't say "remaster", and before any other remaster-* skill.
---

# Remaster triage

Goal: know exactly what you're working on and what the owner wants, before touching anything.

## 1. Identity record

If the `remaster-anything` MCP server is available, start with `detect_engine` on the install
folder, then `read_pe_info` on the main exe it lists first. Treat their output as evidence to
record, not as the answer: candidates with `verified: false` must be confirmed.

Write it to `games/<game-slug>/NOTES.md` (identity table at the top) and `local/identity.md`:

- Game, release year, store (Steam, GOG, disc, other), store version or build id.
- Main exe: file name, SHA-256, 32 or 64-bit (PE header `Machine` field).
- Engine: use [playbook/engine-families.md](../../playbook/engine-families.md). Look at file
  extensions and folder layout first, then exe strings. Say how you know.
- Renderer API: imported DLLs of the exe and renderer modules (`ddraw`, `d3d8`, `d3d9`,
  `opengl32`, Glide). Some engines pick the renderer from a config file: check it.
- Install size, OS, GPU of the owner (ask, don't scan the system).

If anything is uncertain, write `unknown` and how you'd find out.

## 2. Prior work

- Search `data/directory.yaml` and `games/` for the game (MCP: `search_directory`, `get_game`).
- If an existing recipe matches the identity record (same store and exe hash), follow it
  instead of starting over. If it doesn't match, note the difference and continue.
- If an official remaster exists, tell the owner. It doesn't stop the project, but it changes
  its value and the owner should decide knowingly.

## 3. Agree the scope with the owner

Ask, in one message:
- Which axes: display & comfort, textures (v1). Rendering, audio, port are not covered yet.
- Target: resolution, aspect ratio (16:9, 21:9, 32:9), refresh rate, controller or not.
- Fidelity tolerance: strictly faithful (default) or open to optional reinterpretations.

## 4. Choose the path per axis

For each axis: if research is likely to find usable work (well-known game), plan path 1
(assemble). If not, plan path 2 (build). Confirm after `remaster-research`.

## 5. Workspace

- Copy the install to a test folder, never work in the original.
- Create `local/` (git-ignored) for paths, logs, captures and extracted assets.

Next: `remaster-research`.
