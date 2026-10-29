import { describe, expect, it } from "vitest";
import { stringify } from "yaml";
import type * as z from "zod";
import { loadDirectory } from "../src/schema/directory.ts";
import { loadEngines } from "../src/schema/engines.ts";
import { getGame } from "../src/tools/get-game.ts";
import { searchDirectory } from "../src/tools/search-directory.ts";
import { ENTRY, REPO_ROOT, context, fixtureRepo } from "./helpers/fixtures.ts";

const search = (repo: string, args: z.input<typeof searchDirectory.input>) =>
  searchDirectory.handler(searchDirectory.input.parse(args), context(repo));

const TEXTURES = {
  ...ENTRY,
  project: "Example HD Textures",
  kind: "texture-pack",
  axes: { ...ENTRY.axes, display: "no", textures: "partial" },
  qa: "none",
  notes: "Upscaled world textures",
};
const OTHER_GAME = { ...ENTRY, game: "Thief", slug: "thief", engine: "Dark Engine", project: "Thief Widescreen", qa: "automated" };

describe("the repo's own data", () => {
  it("has a valid directory and engines file", async () => {
    expect((await loadDirectory(REPO_ROOT)).errors).toEqual([]);
    expect((await loadEngines(REPO_ROOT)).families.length).toBeGreaterThan(5);
  });
});

describe("directory schema", () => {
  it("accepts a complete entry and fills defaults", async () => {
    const { entries, errors } = await loadDirectory(fixtureRepo(stringify([ENTRY])));
    expect(errors).toEqual([]);
    expect(entries[0]).toMatchObject({ slug: "deus-ex", requires: [], made_with_remaster_anything: false });
  });

  it("reports broken entries with their slug and keeps the valid ones", async () => {
    const broken = { ...ENTRY, sources: [], qa: "great", extra: 1 };
    const { entries, errors } = await loadDirectory(fixtureRepo(stringify([ENTRY, broken])));
    expect(entries).toHaveLength(1);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ index: 1, slug: "deus-ex", label: "Deus Ex / Example Widescreen Fix" });
    expect(errors[0]!.issues.join("\n")).toMatch(/sources/);
    expect(errors[0]!.issues.join("\n")).toMatch(/qa/);
    expect(errors[0]!.issues.join("\n")).toMatch(/extra/);
  });

  it("enforces the gap rules", async () => {
    const gap = { ...ENTRY, kind: "gap", project: "(none found)", status: "none", url: "", searched: ["PCGamingWiki 2026-10-29"] };
    expect((await loadDirectory(fixtureRepo(stringify([gap])))).errors).toEqual([]);
    const badGap = { ...gap, url: "https://example.org", searched: undefined };
    const { errors } = await loadDirectory(fixtureRepo(stringify([badGap])));
    expect(errors[0]!.issues.join("\n")).toMatch(/url.*empty[\s\S]*searched/);
  });

  it("rejects a file that is not a list", async () => {
    const { errors } = await loadDirectory(fixtureRepo("game: Deus Ex\n"));
    expect(errors[0]!.issues).toEqual(["the file must be a YAML list"]);
  });
});

describe("search_directory", () => {
  const repo = () => fixtureRepo(stringify([ENTRY, TEXTURES, OTHER_GAME]));

  it("says when the directory is empty", async () => {
    const result = await search(fixtureRepo("[]\n"), {});
    expect(result.total).toBe(0);
    expect(result.hint).toMatch(/empty/);
  });

  it("matches every query word across fields", async () => {
    const r = repo();
    expect((await search(r, { query: "deus" })).total).toBe(2);
    expect((await search(r, { query: "deus upscaled" })).entries.map((e) => e.project)).toEqual(["Example HD Textures"]);
    expect((await search(r, { query: "doom" })).hint).toMatch(/gap/);
  });

  it("filters by engine, axis, kind, slug and minimum QA", async () => {
    const r = repo();
    expect((await search(r, { engine: "unreal" })).total).toBe(2);
    expect((await search(r, { axis: "textures" })).entries.map((e) => e.project)).toEqual(["Example HD Textures"]);
    expect((await search(r, { kind: "fix" })).total).toBe(2);
    expect((await search(r, { slug: "thief" })).total).toBe(1);
    expect((await search(r, { min_qa: "community-reports" })).total).toBe(2);
    expect((await search(r, { min_qa: "automated" })).entries.map((e) => e.slug)).toEqual(["thief"]);
  });

  it("applies the limit but reports the total", async () => {
    const result = await search(repo(), { limit: 1 });
    expect(result.total).toBe(3);
    expect(result.entries).toHaveLength(1);
  });

  it("counts invalid entries", async () => {
    const result = await search(fixtureRepo(stringify([ENTRY, { game: "Broken" }])), {});
    expect(result.total).toBe(1);
    expect(result.invalid_entries).toBe(1);
    expect(result.hint).toMatch(/validate_directory/);
  });
});

describe("get_game", () => {
  it("returns the entries and the files of the game folder", async () => {
    const repo = fixtureRepo(stringify([ENTRY, OTHER_GAME]), {
      "games/deus-ex/NOTES.md": "# notes\n",
      "games/deus-ex/recipe.yaml": "recipe: 1\n",
    });
    const result = await getGame.handler({ slug: "deus-ex" }, context(repo));
    expect(result.entries.map((e) => e.project)).toEqual(["Example Widescreen Fix"]);
    expect(result.folder).toEqual({
      path: "games/deus-ex",
      exists: true,
      files: [
        { path: "games/deus-ex/NOTES.md", size: 8 },
        { path: "games/deus-ex/recipe.yaml", size: 10 },
      ],
    });
    expect(result.known_slugs).toBeUndefined();
  });

  it("lists known slugs when the game is unknown", async () => {
    const repo = fixtureRepo(stringify([OTHER_GAME]), { "games/deus-ex/NOTES.md": "" });
    const result = await getGame.handler({ slug: "system-shock-2" }, context(repo));
    expect(result.entries).toEqual([]);
    expect(result.folder.exists).toBe(false);
    expect(result.known_slugs).toEqual(["deus-ex", "thief"]);
  });

  it("rejects slugs that could escape games/", () => {
    expect(getGame.input.safeParse({ slug: "../data" }).success).toBe(false);
    expect(getGame.input.safeParse({ slug: "Deus Ex" }).success).toBe(false);
  });
});
