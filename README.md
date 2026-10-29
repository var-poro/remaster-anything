# Remaster Anything

**Any old PC game. Sharper, wider, smoother. Faithful to the original. Your agent does the work.**

> **Status: early work in progress, not ready to use yet.** No game has been remastered with it so far
> and the directory is empty. Pilot game: **Deus Ex (2000)**. v1 covers two axes: **display & comfort**
> and **textures**. Follow [ROADMAP.md](ROADMAP.md) for progress.

Want to replay an old game on a modern PC without it looking stretched, blurry or broken?
Point your AI coding agent at this repo. It identifies the game and its engine, finds every
community fix and remaster that already exists, assembles the ones that work together,
fills the gaps (AI texture upscaling, display fixes), **proves the result with before/after
captures and performance checks**, and packages it as a recipe anyone can replay on their
own copy.

This repo never ships game files or assets. It ships **methods, tools and recipes**.
Every player generates their remaster locally, from a copy they own.

## Quick start

Tell your agent (Claude Code, Codex, Gemini CLI, Cursor, ...):

```
Read https://github.com/var-poro/remaster-anything and follow AGENTS.md.
I want to remaster <game>.
```

The agent follows [AGENTS.md](AGENTS.md) and the skills in [`skills/`](skills)
(mirrored in `.claude/skills` and `.agents/skills`).

## How it works

|        | Path 1: assemble what exists | Path 2: build what's missing |
|--------|------------------------------|------------------------------|
| When   | Fixes, packs or ports already exist (most well-known games). | Nothing usable exists for an axis you care about. |
| How    | Find every fix, check versions and conflicts, build one clean, pinned install recipe, prove it. | Extract assets, upscale faithfully, write display fixes, repack, prove it. |
| Skills | `remaster-triage`, `remaster-research`, `remaster-qa`, `remaster-package` | + `remaster-display`, `remaster-textures` |

Both paths end the same way: before/after captures, fidelity and performance checks,
a replayable recipe, and a pull request back here.

## The axes

| Axis | What it covers | v1 |
|------|----------------|----|
| Display & comfort | Widescreen, FOV, HUD scaling, high FPS, frame pacing, controller | ✅ |
| Textures | Faithful AI upscaling, correct formats and mipmaps, memory limits | ✅ |
| Rendering | Modern lighting, path tracing, API wrappers, post-processing | later |
| Audio | Restoration, higher-quality sound banks | later |
| Port | Native builds from decompilations or source ports | later |

## The fidelity rule

A remaster here is **respectful**: sharper and cleaner, same art direction. No generative
repaint, no new style. When a change reinterprets the original, the recipe says so and keeps
it optional.

## Rules

Don't commit game files or assets, not even upscaled ones (they remain derived works).
No personal info. Credit and link the mods you build on, follow their licenses, give fixes
back to them. Single-player only: nothing that touches anti-cheat or online services.

See [CONTRIBUTING.md](CONTRIBUTING.md) and [ROADMAP.md](ROADMAP.md).

License: MIT.
