import { spawn } from "node:child_process";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { describe, expect, it } from "vitest";
import { REPO_ROOT } from "./helpers/fixtures.ts";

// End to end: start the real entry point and talk JSON-RPC over stdio, like an MCP client.
describe("stdio server", () => {
  it("initializes, lists the four tools and answers a call", async () => {
    const child = spawn(process.execPath, [join(REPO_ROOT, "tools/mcp/src/index.ts")], {
      env: { ...process.env, REMASTER_ANYTHING_ROOT: REPO_ROOT },
      stdio: ["pipe", "pipe", "pipe"],
    });
    const pending = new Map<number, (msg: any) => void>();
    createInterface({ input: child.stdout }).on("line", (line) => {
      const msg = JSON.parse(line);
      pending.get(msg.id)?.(msg);
    });
    let nextId = 1;
    const request = (method: string, params: object) =>
      new Promise<any>((resolve) => {
        const id = nextId++;
        pending.set(id, resolve);
        child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
      });

    try {
      const init = await request("initialize", {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "test", version: "0" },
      });
      expect(init.result.serverInfo.name).toBe("remaster-anything");
      child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`);

      const list = await request("tools/list", {});
      const tools = list.result.tools;
      expect(tools.map((t: any) => t.name).sort()).toEqual(["detect_engine", "get_game", "read_pe_info", "search_directory"]);
      expect(tools.every((t: any) => t.annotations.readOnlyHint === true && t.annotations.openWorldHint === false)).toBe(true);

      const call = await request("tools/call", { name: "get_game", arguments: { slug: "deus-ex" } });
      expect(call.result.isError).toBeFalsy();
      expect(call.result.structuredContent.folder.exists).toBe(true);

      const bad = await request("tools/call", { name: "detect_engine", arguments: { path: "relative/path" } });
      expect(bad.result.isError).toBe(true);
      expect(bad.result.content[0].text).toMatch(/absolute/);
    } finally {
      child.kill();
    }
  }, 20_000);
});
