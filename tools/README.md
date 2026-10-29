# Tools (phase 2, not built yet)

Planned, in TypeScript, installable with `npx`:

| Tool | Purpose |
|---|---|
| `mcp` | MCP server: search the directory, detect engine and renderer from an install folder, detect asset formats, validate directory entries and recipes, read the playbook. Read-only. |
| `capture` | Reproducible before/after captures from the capture plan. |
| `fidelity` | Downscale-and-compare and palette drift on upscaled textures, with a report. |
| `perf` | Frame time and memory capture, before/after comparison. |
| `build-directory` | Render `DIRECTORY.md` from `data/directory.yaml`, validating the schema. |
| `recipe` | Run a recipe: identity check, pinned downloads, steps, rollback. |
