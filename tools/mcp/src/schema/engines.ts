import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "yaml";
import * as z from "zod";

// Schema of data/engines.yaml (format documented at the top of that file).

const Strength = z.enum(["strong", "weak"]);
const Extensions = z.array(z.string().regex(/^\.[a-z0-9]+$/i, "extensions start with a dot")).min(1);
const common = { strength: Strength, note: z.string().optional() };

export const Signal = z.union([
  z.strictObject({ dir: z.string().min(1), ...common }),
  z.strictObject({ file: z.string().min(1), ...common }),
  z.strictObject({ ext: Extensions, ...common }),
  z.strictObject({
    magic: z.strictObject({
      ext: Extensions,
      hex: z.string().regex(/^([0-9a-f]{2})+$/i, "hex bytes, quoted in YAML"),
      offset: z.number().int().min(0).max(4096),
      u16le: z.strictObject({ offset: z.number().int().min(0).max(4096), min: z.number().int(), max: z.number().int() }).optional(),
    }),
    ...common,
  }),
]);
export type Signal = z.infer<typeof Signal>;

export const EngineFamily = z.strictObject({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  name: z.string().min(1),
  years: z.string().min(1),
  signals: z.array(Signal).min(1),
  renderer_config: z
    .strictObject({ files: z.array(z.string().min(1)).min(1), section: z.string().min(1), keys: z.array(z.string().min(1)).min(1) })
    .optional(),
  sources: z.array(z.url()),
});
export type EngineFamily = z.infer<typeof EngineFamily>;

export const RendererModule = z.strictObject({
  file: z.string().min(1),
  kind: z.enum(["system", "proxy", "engine"]),
  api: z.string().min(1),
});
export type RendererModule = z.infer<typeof RendererModule>;

export const EnginesFile = z.strictObject({
  families: z.array(EngineFamily).min(1),
  renderer_modules: z.array(RendererModule),
});
export type EnginesFile = z.infer<typeof EnginesFile>;

export async function loadEngines(repoRoot: string): Promise<EnginesFile> {
  const text = await readFile(join(repoRoot, "data", "engines.yaml"), "utf8");
  const result = EnginesFile.safeParse(parse(text));
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`data/engines.yaml is invalid: ${issues}`);
  }
  return result.data;
}
