import { McpServer } from "@modelcontextprotocol/server";
import type { Context } from "./config.ts";
import { ToolError, type ToolDef } from "./tools/define.ts";
import { detectEngine } from "./tools/detect-engine.ts";
import { getGame } from "./tools/get-game.ts";
import { readPeInfo } from "./tools/read-pe-info.ts";
import { searchDirectory } from "./tools/search-directory.ts";

export const TOOLS: ToolDef[] = [searchDirectory, getGame, readPeInfo, detectEngine] as unknown as ToolDef[];

export const SERVER_INFO = { name: "remaster-anything", version: "0.0.1" };

export function createServer(ctx: Context): McpServer {
  const server = new McpServer(SERVER_INFO, { capabilities: { tools: {} } });
  for (const tool of TOOLS) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.input,
        outputSchema: tool.output,
        // Every tool only reads local files: no writes, no network.
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      },
      async (args) => {
        try {
          const result = (await tool.handler(args, ctx)) as Record<string, unknown>;
          return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], structuredContent: result };
        } catch (e) {
          const message = e instanceof ToolError ? e.message : `internal error: ${(e as Error).message}`;
          return { isError: true, content: [{ type: "text", text: message }] };
        }
      },
    );
  }
  return server;
}
