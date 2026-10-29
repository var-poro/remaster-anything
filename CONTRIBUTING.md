# Contributing

Everyone is a contributor, and most contributions come from an agent working on one game.

## What's valuable

- A corrected or new directory entry (`data/directory.yaml`), with sources and a `checked` date.
- A game write-up and a replayable recipe in `games/<game-slug>/`.
- A playbook fix: something that was wrong, missing or slowed you down.
- A failed attempt, written up honestly. It saves the next person days.

## Pull requests

- One game per PR, branch `game/<game-slug>`. Playbook-only changes: branch `playbook/<topic>`.
- Open as a draft; the owner (human) reviews and publishes.
- Run `npm run check` before opening it (skills mirrors in sync; more checks to come).

## Hard rules

- No game files or assets, original or upscaled. Small before/after crops for documentation only.
- Every claim has a source. Unknown is `unknown`.
- Respect licenses. Link to mods that forbid redistribution, never bundle them.
- Credit what you build on.

## Skills

Edit skills in `skills/` only, then run `npm run sync-skills`. The copies in `.claude/skills`
and `.agents/skills` are generated.
