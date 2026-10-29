# Security

## Reporting a problem

Report security issues privately through GitHub: **Security > Report a vulnerability** on this
repo. Please don't open a public issue for them. You'll get an answer within a week; this is a
one-person project, so fixes may take a little longer.

## What counts

- The MCP server (`tools/mcp`) reading or revealing anything outside the paths it was given,
  following links out of a folder, writing anything, or reaching the network.
- A skill, playbook page or recipe that would make an agent run untrusted code, download from an
  unofficial source, skip a hash check, or touch the owner's original install or saves.
- Text in the repo that tries to give instructions to agents (prompt injection), for example
  in a directory entry or a game write-up.
- Personal data, tokens or game files committed by mistake.

## What the project promises

- The MCP server is read-only and local: no writes, no network, no process launched.
- Recipes pin every download to an official source and a SHA-256.
- Nothing from a game (files, extracted or upscaled assets) is ever stored in this repo.

Out of scope: anti-cheat, DRM or online services. This project is single-player only and won't
help with those.
