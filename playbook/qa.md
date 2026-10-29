# QA

Skill: `remaster-qa`.

## Capture plan

8 to 15 viewpoints, each reachable reproducibly (save, console command, demo, start position):
menu, HUD in play, cutscene, dark scene, bright outdoor scene, character close-up, text-heavy
texture, heaviest scene. Keep saves and captures in `local/`.

Same settings before and after, except what the pass changes. Name files
`<viewpoint>_<before|after>_<resolution>.png`.

## Performance

- Frame time in the heaviest scene: average and 1 % lows, same route each time
  (e.g. Intel PresentMon or an equivalent frame-time logger).
- Peak memory of the game process. On 32-bit games, compare with the address-space limit.

## Display checks

See [display.md](display.md#display-checks).

## Texture checks

See [textures.md](textures.md#texture-checks).

## Stability

Every level or chapter loaded at least once. One 30-minute session without crash.
Old saves still load.

## QA levels

| qa | Meaning |
|---|---|
| `none` | Nobody tested, or only the author's claims. |
| `community-reports` | Players report using it, no structured testing. |
| `automated` | Capture plan and checks ran on the recipe's result, with logs kept. |
| `verified-playthrough` | Full playthrough with the recipe, written up with known issues. |
