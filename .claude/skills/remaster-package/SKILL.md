---
name: remaster-package
description: Turns a finished remaster into something anyone can replay on their own copy and gives it back to the community - a pinned, reversible recipe that installs fixes and regenerates assets locally, a write-up with before/after crops and known issues, a directory entry, and a draft pull request to Remaster Anything. Use it when a remaster or fix stack is working and tested, or when the user wants to share, publish, package or document it.
---

# Package & give back

Method: [playbook/packaging.md](../../playbook/packaging.md).

## The recipe (`games/<slug>/recipe.yaml`)

Start from [templates/recipe.yaml](../../templates/recipe.yaml). It must contain:
- The identity it applies to (store, version, exe SHA-256). Refuse to run on a mismatch.
- Every download: official URL, version, SHA-256, license, whether redistribution is allowed.
- Every step in order: copy, install, config change, generate (upscale with model X, version,
  settings), verify.
- A rollback that restores the test install exactly.
- Nothing from the game itself. Assets are generated on the player's machine.

## The write-up (`games/<slug>/README.md`)

From [templates/game-writeup.md](../../templates/game-writeup.md): what it improves per axis,
small before/after crops, QA level and what it's based on, performance impact, known issues,
credits.

## Give back

1. Update `data/directory.yaml` (your recipe as an entry, plus everything research found).
2. Fix the playbook where it was wrong or missing something.
3. Run `npm run check`.
4. Draft PR on branch `game/<slug>`. Your owner reviews the diff and publishes it.
5. If you fixed bugs in someone else's mod, offer the fix to its author too.
