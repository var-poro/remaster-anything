# Remaster Anything MCP server

Read-only MCP server (stdio) that gives agents the repo's data and a few safe ways to look at a
game install. Declared in the repo's [`.mcp.json`](../../.mcp.json): clients that read it
(Claude Code and others) start it automatically from a clone.

## Setup

```
npm install        # at the repo root (npm workspaces)
npm test           # unit tests + a stdio round trip
npm run check      # skills mirrors + type check
```

Node 22.18 or newer: the server runs its TypeScript sources directly (type stripping), with no
build step. Code must stay within erasable TypeScript syntax (no `enum`, no parameter properties).

To use it from another client, run `node tools/mcp/src/index.ts` from the repo root. The server
finds the repo from its own location; set `REMASTER_ANYTHING_ROOT` to point it at another checkout.

## Tools

| Tool | Input | Returns |
|---|---|---|
| `search_directory` | `query`, `slug`, `engine`, `axis`, `kind`, `min_qa`, `limit` | Matching `data/directory.yaml` entries, total, invalid entry count |
| `get_game` | `slug` | The game's directory entries and the files in `games/<slug>/` |
| `read_pe_info` | absolute path of an exe/dll | SHA-256, 32/64-bit, large-address-aware, imports (graphics APIs highlighted), delay imports, link timestamp, version resource |
| `detect_engine` | absolute path of an install folder | Engine candidates with confidence and evidence (from [`data/engines.yaml`](../../data/engines.yaml)), renderer modules and config values, executables (likely main exe first) |

Planned next: `detect_asset_formats`, `validate_directory`, `validate_recipe`, `read_playbook`.

## Safety rules

- **Read-only, local only.** No writes, no network, no process launched. Every tool is annotated
  `readOnlyHint: true`, `openWorldHint: false`.
- **Paths.** Inputs must be absolute and are resolved to their real location. Scans never follow
  symlinks or junctions, so they cannot leave the folder they were given.
- **Bounded.** Scans stop at 6 folder levels and 50,000 files and say so (`truncated`,
  `depth_limited`). Text configs are read only below 256 KB.
- **Headers only**, with one exception: `read_pe_info` streams the whole exe once to hash it
  (limit 512 MB), and reads its import and version tables through targeted reads.
  Everything else reads at most the first bytes of a file (magic numbers).

## Engine signatures

`detect_engine` matches folders, file names, extensions and magic numbers listed in
`data/engines.yaml`. Each family has a `sources` list; while it is empty the tool reports
`verified: false`. Most signatures were written from memory and need checking against real
installs and format documentation: add the source when you confirm one.

## Tests

`test/helpers/pe-builder.ts` builds small valid PE files in memory, and fake installs are written to
temp folders: no game file is ever committed. To check the tools against a real install on your
machine (output goes to your terminal only):

```
REMASTER_TEST_GAME_DIR="<game dir>" npm test
```

## Publishing

Not on npm yet (the repo is private until the pilot ships). Node refuses to strip types under
`node_modules`, so an `npx` release will need a build step that emits JavaScript.
