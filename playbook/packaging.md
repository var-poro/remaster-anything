# Packaging & giving back

Skill: `remaster-package`.

## Principles

- **A recipe, not a bundle.** The repo ships instructions and tools; the player's machine
  downloads pinned mods from official sources and generates upscaled assets from their own copy.
- **Pinned and verified:** every download has a version and a SHA-256.
- **Identity-locked:** the recipe refuses to run on a different exe hash.
- **Reversible:** a rollback restores the test install exactly.
- **Honest:** QA level, performance impact and known issues in the write-up.

## Recipe

Template: [templates/recipe.yaml](../templates/recipe.yaml). A future `npx` runner will
execute recipes; until then they are followed by the agent step by step.

## Write-up

Template: [templates/game-writeup.md](../templates/game-writeup.md). Before/after crops only,
small, for documentation.
