import { realpath, stat } from "node:fs/promises";
import { isAbsolute } from "node:path";
import { ToolError } from "../tools/define.ts";

// Paths come from the agent. They must be absolute and are resolved to their real location
// (symlinks and junctions in the path itself are followed once, here); scans below them never
// follow links, so nothing outside the resolved root is read.

async function resolveExisting(input: string): Promise<{ path: string; isFile: boolean; isDir: boolean; size: number }> {
  if (!isAbsolute(input)) throw new ToolError(`path must be absolute: ${input}`);
  let path: string;
  try {
    path = await realpath(input);
  } catch {
    throw new ToolError(`path not found: ${input}`);
  }
  const info = await stat(path);
  return { path, isFile: info.isFile(), isDir: info.isDirectory(), size: info.size };
}

export async function resolveInputDir(input: string): Promise<string> {
  const found = await resolveExisting(input);
  if (!found.isDir) throw new ToolError(`not a folder: ${input}`);
  return found.path;
}

export async function resolveInputFile(input: string, maxBytes: number): Promise<{ path: string; size: number }> {
  const found = await resolveExisting(input);
  if (!found.isFile) throw new ToolError(`not a file: ${input}`);
  if (found.size > maxBytes) {
    throw new ToolError(`file is ${found.size} bytes, above the ${maxBytes} byte limit: ${input}`);
  }
  return { path: found.path, size: found.size };
}
