import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "yaml";
import * as z from "zod";

// Machine version of data/SCHEMA.md. Change both together.

export const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const AXES = ["display", "textures", "rendering", "audio", "port"] as const;
export const KINDS = [
  "fix", "texture-pack", "model-pack", "renderer", "wrapper", "launcher",
  "source-port", "recipe", "official-remaster", "gap",
] as const;
export const STATUSES = ["playable", "partial", "alpha", "abandoned", "official", "none"] as const;
/** Ordered from weakest to strongest evidence. */
export const QA_LEVELS = ["none", "community-reports", "automated", "verified-playthrough"] as const;

const AxisLevel = z.enum(["yes", "partial", "no", "unknown"]);
const IsoDate = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, "expected YYYY-MM-DD");
const Names = z.array(z.string().min(1)).default([]);

export const DirectoryEntry = z
  .strictObject({
    game: z.string().min(1),
    slug: z.string().regex(SLUG, "lowercase letters, digits and hyphens"),
    year: z.number().int().min(1970).max(2100),
    engine: z.string().min(1),
    project: z.string().min(1),
    url: z.union([z.url(), z.literal("")]),
    other_urls: z.array(z.url()).default([]),
    kind: z.enum(KINDS),
    status: z.enum(STATUSES),
    axes: z.strictObject(Object.fromEntries(AXES.map((a) => [a, AxisLevel])) as Record<(typeof AXES)[number], typeof AxisLevel>),
    fidelity: z.enum(["faithful", "reinterpretation", "mixed", "unknown"]),
    game_versions: z.array(z.string().min(1)).min(1),
    requires: Names,
    conflicts_with: Names,
    open_source: z.enum(["yes", "no", "partial", "unknown"]),
    redistribution: z.enum(["allowed", "forbidden", "unknown"]),
    last_activity: z.union([z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "expected YYYY-MM"), z.literal("unknown")]),
    qa: z.enum(QA_LEVELS),
    notes: z.string().default(""),
    sources: z.array(z.url()).min(1, "every entry needs at least one source"),
    checked: IsoDate,
    made_with_remaster_anything: z.boolean().default(false),
    searched: z.array(z.string().min(1)).optional(),
  })
  .superRefine((entry, ctx) => {
    const gap = entry.kind === "gap";
    if (gap && entry.project !== "(none found)") ctx.addIssue({ code: "custom", path: ["project"], message: 'gaps use project "(none found)"' });
    if (gap && entry.status !== "none") ctx.addIssue({ code: "custom", path: ["status"], message: "gaps use status none" });
    if (gap && entry.url !== "") ctx.addIssue({ code: "custom", path: ["url"], message: "gaps have an empty url" });
    if (gap && !entry.searched?.length) ctx.addIssue({ code: "custom", path: ["searched"], message: "gaps list where and when you searched" });
    if (!gap && entry.url === "") ctx.addIssue({ code: "custom", path: ["url"], message: "only gaps may have an empty url" });
  });

export type DirectoryEntry = z.infer<typeof DirectoryEntry>;

export interface EntryError {
  index: number;
  label: string;
  /** The entry's slug when it has a string one, so broken entries still map to a game. */
  slug?: string;
  issues: string[];
}

export interface LoadedDirectory {
  entries: DirectoryEntry[];
  errors: EntryError[];
}

function describe(issues: z.core.$ZodIssue[]): string[] {
  return issues.map((i) => `${i.path.length ? i.path.join(".") : "(entry)"}: ${i.message}`);
}

/** Parses data/directory.yaml. Valid entries are returned even when others are broken. */
export async function loadDirectory(repoRoot: string): Promise<LoadedDirectory> {
  const text = await readFile(join(repoRoot, "data", "directory.yaml"), "utf8");
  const doc: unknown = parse(text) ?? [];
  if (!Array.isArray(doc)) {
    return { entries: [], errors: [{ index: -1, label: "data/directory.yaml", issues: ["the file must be a YAML list"] }] };
  }
  const loaded: LoadedDirectory = { entries: [], errors: [] };
  doc.forEach((item: unknown, index) => {
    const result = DirectoryEntry.safeParse(item);
    if (result.success) {
      loaded.entries.push(result.data);
    } else {
      const raw = (item ?? {}) as Record<string, unknown>;
      loaded.errors.push({
        index,
        label: `${raw.game ?? "?"} / ${raw.project ?? "?"}`,
        ...(typeof raw.slug === "string" ? { slug: raw.slug } : {}),
        issues: describe(result.error.issues),
      });
    }
  });
  return loaded;
}
