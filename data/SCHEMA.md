# Directory entry schema

`data/directory.yaml` is a list of entries. One entry = one remaster project (fix, pack,
renderer, port, recipe...) for one game. A game usually has several entries.
A future `build-directory` script will render `DIRECTORY.md` from it: edit the YAML only.

```yaml
- game: Deus Ex                        # display name of the base game
  slug: deus-ex                        # folder name in games/; same slug for every entry of a game
  year: 2000
  engine: Unreal Engine 1              # see playbook/engine-families.md
  project: Example Widescreen Fix      # project name
  url: https://example.org/project     # main page (repo, ModDB, Nexus, site)
  other_urls: []
  kind: fix                            # fix | texture-pack | model-pack | renderer | wrapper | launcher | source-port | recipe | official-remaster | gap
  status: playable                     # playable | partial | alpha | abandoned | official | none
  axes:                                # what it actually improves, only what a source confirms
    display: yes                       # yes | partial | no | unknown
    textures: no
    rendering: no
    audio: no
    port: no
  fidelity: faithful                   # faithful | reinterpretation | mixed | unknown
  game_versions: [unknown]             # store/builds it targets
  requires: []                         # other entries it depends on (by project name)
  conflicts_with: []                   # known conflicts (by project name)
  open_source: unknown                 # yes | no | partial | unknown
  redistribution: unknown              # allowed | forbidden | unknown (decides link-only)
  last_activity: 2026-10               # YYYY-MM of last release/commit you could confirm
  qa: none                             # none | community-reports | automated | verified-playthrough
  notes: ""
  sources:                             # every claim above must be backed by one of these
    - https://example.org/source
  checked: 2026-10-29                  # date the entry was last verified
  made_with_remaster_anything: false   # true = built or assembled with this repo
```

## Rules

- Don't guess. Unknown is `unknown`.
- `slug` is lowercase letters, digits and hyphens (`deus-ex`, `system-shock-2`). It matches
  the game's folder in `games/` and never changes once used.
- Every entry needs at least one source and a `checked` date.
- Gaps use `kind: gap`, `project: "(none found)"`, `status: none`, an empty `url`, and a
  `searched:` field listing where and when you looked.
- `fidelity: reinterpretation` is allowed in the directory, but recipes include it only as
  an optional, labelled step.
