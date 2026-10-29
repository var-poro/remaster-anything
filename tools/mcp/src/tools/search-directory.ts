import * as z from "zod";
import { AXES, DirectoryEntry, KINDS, QA_LEVELS, SLUG, loadDirectory } from "../schema/directory.ts";
import { defineTool } from "./define.ts";

export const searchDirectory = defineTool({
  name: "search_directory",
  title: "Search the remaster directory",
  description:
    "Search data/directory.yaml, the list of known remaster projects (fixes, texture packs, renderers, ports, recipes, gaps) " +
    "for old PC games. Use it during triage and research to find prior work before building anything. " +
    "All filters are optional and combine with AND. Entries that fail the schema are skipped and counted.",
  input: z.object({
    query: z.string().optional().describe("Words to find in game, slug, project, engine or notes. Every word must match. Case-insensitive."),
    slug: z.string().regex(SLUG).optional().describe("Exact game slug, e.g. deus-ex."),
    engine: z.string().optional().describe("Engine name or part of it, e.g. 'Unreal Engine 1'. Case-insensitive."),
    axis: z.enum(AXES).optional().describe("Only entries that improve this axis (axes.<axis> is yes or partial)."),
    kind: z.enum(KINDS).optional(),
    min_qa: z.enum(QA_LEVELS).optional().describe("Minimum QA level, in order: none, community-reports, automated, verified-playthrough."),
    limit: z.number().int().min(1).max(200).default(50),
  }),
  output: z.object({
    total: z.number().describe("Matching entries before the limit."),
    entries: z.array(DirectoryEntry),
    invalid_entries: z.number().describe("Entries skipped because they fail data/SCHEMA.md."),
    hint: z.string().optional(),
  }),
  async handler(args, ctx) {
    const { entries, errors } = await loadDirectory(ctx.repoRoot);
    const words = (args.query ?? "").toLowerCase().split(/\s+/).filter(Boolean);
    const engine = args.engine?.toLowerCase();
    const minQa = args.min_qa ? QA_LEVELS.indexOf(args.min_qa) : 0;

    const matches = entries.filter((e) => {
      if (args.slug && e.slug !== args.slug) return false;
      if (args.kind && e.kind !== args.kind) return false;
      if (engine && !e.engine.toLowerCase().includes(engine)) return false;
      if (args.axis && e.axes[args.axis] !== "yes" && e.axes[args.axis] !== "partial") return false;
      if (QA_LEVELS.indexOf(e.qa) < minQa) return false;
      const haystack = [e.game, e.slug, e.project, e.engine, e.notes].join(" ").toLowerCase();
      return words.every((w) => haystack.includes(w));
    });

    const hints: string[] = [];
    if (entries.length === 0 && errors.length === 0) hints.push("The directory is empty: no research run has added entries yet.");
    else if (matches.length === 0) hints.push("No match. A miss is a result too: record it as a kind: gap entry after researching.");
    if (errors.length > 0) hints.push(`${errors.length} entries fail the schema and were skipped; run validate_directory.`);

    return {
      total: matches.length,
      entries: matches.slice(0, args.limit),
      invalid_entries: errors.length,
      ...(hints.length ? { hint: hints.join(" ") } : {}),
    };
  },
});
