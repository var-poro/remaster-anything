import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { open } from "node:fs/promises";
import { basename } from "node:path";
import * as z from "zod";
import { resolveInputFile } from "../fs/safe-path.ts";
import { PeFormatError, fileSource, parsePe } from "../pe/parse.ts";
import { loadEngines } from "../schema/engines.ts";
import { ToolError, defineTool } from "./define.ts";

async function sha256(path: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk as Buffer);
  return hash.digest("hex");
}

export const readPeInfo = defineTool({
  name: "read_pe_info",
  title: "Read an exe or dll header",
  description:
    "Identify a Windows exe or dll without running it: SHA-256, 32/64-bit, large-address-aware flag, imported DLLs " +
    "(graphics APIs highlighted), link timestamp and version resource. Use it for the identity record in triage. " +
    "Reads the headers and import/version tables only, plus one streaming pass for the hash. " +
    "Note: engines with pluggable renderers (Unreal Engine 1/2) load the renderer at run time, so the exe's imports " +
    "do not show it; detect_engine reads the renderer from the game's config instead.",
  input: z.object({
    path: z.string().describe("Absolute path to the .exe or .dll."),
  }),
  output: z.object({
    file: z.string().describe("File name only."),
    size: z.number(),
    sha256: z.string(),
    machine: z.object({ code: z.string(), name: z.string() }),
    bitness: z.union([z.literal(32), z.literal(64)]),
    kind: z.enum(["exe", "dll"]),
    subsystem: z.string(),
    timestamp: z.string().nullable(),
    large_address_aware: z.boolean(),
    sections: z.array(z.string()),
    imports: z.array(z.object({ dll: z.string(), functions: z.number() })),
    delay_imports: z.array(z.string()),
    graphics_imports: z.array(z.object({ dll: z.string(), api: z.string() })),
    version: z
      .object({ file_version: z.string().nullable(), product_version: z.string().nullable(), strings: z.record(z.string(), z.string()) })
      .nullable(),
    warnings: z.array(z.string()),
  }),
  async handler({ path }, ctx) {
    const file = await resolveInputFile(path, ctx.limits.maxPeBytes);
    const handle = await open(file.path, "r");
    let info;
    try {
      info = await parsePe(fileSource(handle, file.size));
    } catch (e) {
      if (e instanceof PeFormatError) throw new ToolError(`${basename(file.path)}: ${e.message}`);
      throw e;
    } finally {
      await handle.close();
    }

    const { renderer_modules } = await loadEngines(ctx.repoRoot);
    const graphics = new Map(renderer_modules.filter((m) => m.kind === "system").map((m) => [m.file.toLowerCase(), m.api]));
    const graphics_imports = [...info.imports.map((i) => i.dll), ...info.delayImports]
      .filter((dll) => graphics.has(dll.toLowerCase()))
      .map((dll) => ({ dll, api: graphics.get(dll.toLowerCase())! }));

    return {
      file: basename(file.path),
      size: file.size,
      sha256: await sha256(file.path),
      machine: info.machine,
      bitness: info.bitness,
      kind: info.kind,
      subsystem: info.subsystem,
      timestamp: info.timestamp,
      large_address_aware: info.largeAddressAware,
      sections: info.sections,
      imports: info.imports,
      delay_imports: info.delayImports,
      graphics_imports,
      version: info.version && {
        file_version: info.version.fileVersion,
        product_version: info.version.productVersion,
        strings: info.version.strings,
      },
      warnings: info.warnings,
    };
  },
});
