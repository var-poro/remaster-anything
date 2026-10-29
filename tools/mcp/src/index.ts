#!/usr/bin/env node
// Remaster Anything MCP server over stdio. stdout carries the protocol: log to stderr only.
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { DEFAULT_LIMITS, findRepoRoot } from "./config.ts";
import { createServer } from "./server.ts";

const ctx = { repoRoot: findRepoRoot(), limits: DEFAULT_LIMITS };
serveStdio(() => createServer(ctx), { onerror: (e) => console.error(`[remaster-anything] ${e.message}`) });
