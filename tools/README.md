# Tools

In TypeScript, one npm workspace per tool. Run `npm install` at the repo root.

| Tool | Purpose | Status |
|---|---|---|
| [`mcp`](mcp/README.md) | MCP server: search the directory, get a game, read exe headers, detect engine and renderer. Next: detect asset formats, validate directory entries and recipes, read the playbook. Read-only. | 4 tools built |
| `capture` | Reproducible before/after captures from the capture plan. | planned |
| `fidelity` | Downscale-and-compare and palette drift on upscaled textures, with a report. | planned |
| `perf` | Frame time and memory capture, before/after comparison. | planned |
| `build-directory` | Render `DIRECTORY.md` from `data/directory.yaml`, validating the schema. | planned |
| `recipe` | Run a recipe: identity check, pinned downloads, steps, rollback. | planned |
