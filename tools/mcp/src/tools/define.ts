import type * as z from "zod";
import type { Context } from "../config.ts";

/** A problem with the agent's input (bad path, unknown slug...): reported as a tool error, not a crash. */
export class ToolError extends Error {}

/**
 * One MCP tool. Handlers are plain async functions so tests call them without the protocol;
 * server.ts registers them all the same way.
 */
export interface ToolDef<I extends z.ZodObject = z.ZodObject, O extends z.ZodObject = z.ZodObject> {
  name: string;
  title: string;
  description: string;
  input: I;
  output: O;
  handler: (args: z.output<I>, ctx: Context) => Promise<z.input<O>>;
}

export function defineTool<I extends z.ZodObject, O extends z.ZodObject>(def: ToolDef<I, O>): ToolDef<I, O> {
  return def;
}
