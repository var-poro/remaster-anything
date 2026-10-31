# Contributing

Everyone is a contributor, and most contributions come from an agent working on one game.

## What's valuable

- A corrected or new directory entry (`data/directory.yaml`), with sources and a `checked` date.
- A game write-up and a replayable recipe in `games/<game-slug>/`.
- A playbook fix: something that was wrong, missing or slowed you down.
- A failed attempt, written up honestly. It saves the next person days.

## Issues

Use the templates: **Game request** to suggest a game or announce work on one, **Directory
correction** for a wrong or missing entry (with sources). Security problems go through
[SECURITY.md](SECURITY.md), not issues.

## Pull requests

- One game per PR, branch `game/<game-slug>`. Playbook-only changes: branch `playbook/<topic>`.
- Open as a draft; the owner (human) reviews and publishes.
- Run `npm install` once, then `npm run check` and `npm test` before opening it (skills mirrors
  in sync, sensitive content, type check, MCP server tests).
- `npm install` also turns on a pre-push hook (`.githooks/pre-push`) that blocks a push carrying
  game files or assets, files from `local/`, tokens, paths with a username, non-noreply emails
  or author addresses, or your local username. Add your real name and other handles to
  `local/deny.txt` (one per line, git-ignored) and the hook blocks those too. CI runs the same
  check on every tracked file. Never bypass it with `--no-verify`: fix the commit instead.

## Hard rules

- No game files or assets, original or upscaled. Small before/after crops for documentation only.
- Every claim has a source. Unknown is `unknown`.
- Respect licenses. Link to mods that forbid redistribution, never bundle them.
- Credit what you build on.

## Skills

Edit skills in `skills/` only, then run `npm run sync-skills`. The copies in `.claude/skills`
and `.agents/skills` are generated.
