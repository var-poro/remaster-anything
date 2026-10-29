# Triage

Skill: `remaster-triage`. This page holds the details the skill points to.

## Reading an exe without running it

With the MCP server (`tools/mcp`), `detect_engine` on the install folder and `read_pe_info` on the
main exe do all of the below. Without it, by hand:

- **Bitness:** PE header `Machine` field (`0x14c` = 32-bit, `0x8664` = 64-bit).
- **Renderer API:** the import table and the renderer modules shipped with the game
  (`ddraw.dll`, `d3d8.dll`, `d3d9.dll`, `opengl32.dll`, Glide wrappers). Engines with pluggable
  renderers name the active one in a config file.
- **Engine hints:** file extensions and layout first ([engine-families.md](engine-families.md)),
  then version strings in the exe.
- **Large address aware:** check the PE characteristics flag. Matters for texture work on 32-bit games.

## Identity table (copy into `games/<slug>/NOTES.md`)

| Field | Value | How we know |
|---|---|---|
| Store / version | | |
| Main exe + SHA-256 | | |
| Bitness | | |
| Engine | | |
| Renderer API(s) | | |
| Large address aware | | |
| Owner's OS / GPU / display | | asked |
