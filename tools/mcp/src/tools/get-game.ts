import { readdir } from "node:fs/promises";
import { join } from "node:path";
import * as z from "zod";
import { scanFolder } from "../fs/scan.ts";
import { DirectoryEntry, SLUG, loadDirectory } from "../schema/directory.ts";
import { defineTool } from "./define.ts";

async function gameFolders(repoRoot: string): Promise<string[]> {
  try {
    const entries = await readdir(join(repoRoot, "games"), { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
}

export const getGame = defineTool({
  name: "get_game",
  title: "Get everything known about a game",
  description:
    "Return the directory entries of one game and the files in its games/<slug>/ folder (NOTES.md, README.md write-up, " +
    "recipe.yaml). Use it at the start of work on a game, then read the files you need. " +
    "Unknown slug: the result lists the known ones.",
  input: z.object({
    slug: z.string().regex(SLUG).describe("Game slug: lowercase, digits, hyphens, e.g. deus-ex."),
  }),
  output: z.object({
    slug: z.string(),
    entries: z.array(DirectoryEntry),
    folder: z.object({
      path: z.string().describe("Relative to the repo root."),
      exists: z.boolean(),
      files: z.array(z.object({ path: z.string(), size: z.number() })),
    }),
    invalid_entries: z.number().describe("Entries of this game skipped because they fail the schema."),
    known_slugs: z.array(z.string()).optional().describe("Present when nothing matched the slug."),
  }),
  async handler({ slug }, ctx) {
    const { entries, errors } = await loadDirectory(ctx.repoRoot);
    const mine = entries.filter((e) => e.slug === slug);
    const folders = await gameFolders(ctx.repoRoot);
    const exists = folders.includes(slug);
    const files = exists
      ? (await scanFolder(join(ctx.repoRoot, "games", slug), { maxDepth: 3, maxFiles: 500 })).files.map((f) => ({
          path: `games/${slug}/${f.rel}`,
          size: f.size,
        }))
      : [];
    const brokenOfMine = errors.filter((e) => e.slug === slug).length;

    return {
      slug,
      entries: mine,
      folder: { path: `games/${slug}`, exists, files },
      invalid_entries: brokenOfMine,
      ...(mine.length === 0 && !exists
        ? { known_slugs: [...new Set([...entries.map((e) => e.slug), ...folders])].sort() }
        : {}),
    };
  },
});
