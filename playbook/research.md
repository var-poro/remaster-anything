# Research

Skill: `remaster-research`.

## Search order

1. This repo: `data/directory.yaml`, `games/`.
2. PCGamingWiki (per-game fixes for widescreen, FOV, frame rate, controller, wrappers).
3. GitHub, ModDB, Nexus Mods, Steam guides and forums, Reddit, Discord servers of mod authors.
4. Same-engine games ([engine-families.md](engine-families.md)): their fixes may transfer.

## Evaluating a candidate

| Question | Why |
|---|---|
| Which game versions? | Most fixes target one exe build. Mismatch = crashes or silent no-op. |
| What does it really change? | Readmes overclaim. Prefer screenshots, code, changelogs. |
| Faithful or reinterpretation? | Core rule of this project. Label reinterpretations as optional. |
| Conflicts and load order? | Two fixes hooking the same thing is the #1 cause of broken stacks. |
| License / redistribution? | Decides link-only vs. scripted download in the recipe. |
| Evidence? | Author claim, player reports, or tested. Feeds the `qa` field. |

## Recording gaps

No result is a result. Add a `kind: gap` entry with what you searched and when.
