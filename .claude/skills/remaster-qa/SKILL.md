---
name: remaster-qa
description: Proves a game remaster with evidence instead of impressions - identity record, reproducible capture plan, before/after captures from the same viewpoints, fidelity checks (downscale-and-compare, palette drift), frame time and memory measurements, stability runs across levels - and sets an honest QA level. Use it before changing anything (baseline), after every display or texture pass, and whenever someone claims a remaster or fix "works".
---

# Remaster QA

Full method: [playbook/qa.md](../../playbook/qa.md).

## Baseline (before any change)

1. Confirm the identity record from `remaster-triage`.
2. **Capture plan** in `games/<slug>/NOTES.md`: 8 to 15 viewpoints covering a menu, the HUD in
   play, a cutscene, a dark scene, a bright outdoor scene, a close-up character, a text-heavy
   texture, and the heaviest scene you can find. For each, how to get there reproducibly
   (save file, console command, demo, start position). Saves stay in `local/`.
3. Capture "before" images to `local/captures/before/<viewpoint>.png`.
4. Performance baseline in the heaviest scene: frame time (average and 1% lows) and memory.

## After each pass

1. Same viewpoints, same settings except the ones changed, to `local/captures/after/`.
2. Run the display and texture checks from the playbook. Record pass, fail or `unknown` per check.
3. Performance and memory again in the same scene.
4. Stability: load every level or chapter at least once, plus one 30-minute session.

## QA level (be honest)

| qa | Meaning |
|---|---|
| `none` | Nobody tested, or only the author's claims. |
| `community-reports` | Players report using it, no structured testing. |
| `automated` | The capture plan and checks ran on the recipe's result, with logs. |
| `verified-playthrough` | A full playthrough with the recipe, written up with known issues. |

Never raise the level for checks that didn't run.
