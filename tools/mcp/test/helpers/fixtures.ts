import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach } from "vitest";
import { type Context, DEFAULT_LIMITS, type Limits } from "../../src/config.ts";

/** The real repo this package lives in. */
export const REPO_ROOT = resolve(import.meta.dirname, "../../../..");

const created: string[] = [];
afterEach(() => {
  for (const dir of created.splice(0)) rmSync(dir, { recursive: true, force: true });
});

export function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "remaster-mcp-"));
  created.push(dir);
  return dir;
}

/** Writes files under `root`. Keys are relative paths with forward slashes. */
export function writeTree(root: string, files: Record<string, string | Buffer>): string {
  for (const [rel, content] of Object.entries(files)) {
    const path = join(root, ...rel.split("/"));
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  }
  return root;
}

/** A throwaway repo with the real engines.yaml and the given directory.yaml and games/ files. */
export function fixtureRepo(directoryYaml: string, files: Record<string, string> = {}): string {
  const root = writeTree(tempDir(), { "AGENTS.md": "# fixture\n", "data/directory.yaml": directoryYaml, ...files });
  copyFileSync(join(REPO_ROOT, "data", "engines.yaml"), join(root, "data", "engines.yaml"));
  return root;
}

export function context(repoRoot: string, limits: Partial<Limits> = {}): Context {
  return { repoRoot, limits: { ...DEFAULT_LIMITS, ...limits } };
}

/** Header of an Unreal package: tag 0x9E2A83C1, then the uint16 package version. */
export function unrealPackage(version: number): Buffer {
  const buf = Buffer.alloc(64);
  buf.writeUInt32LE(0x9e2a83c1, 0);
  buf.writeUInt16LE(version, 4);
  return buf;
}

export const ENTRY = {
  game: "Deus Ex",
  slug: "deus-ex",
  year: 2000,
  engine: "Unreal Engine 1",
  project: "Example Widescreen Fix",
  url: "https://example.org/fix",
  kind: "fix",
  status: "playable",
  axes: { display: "yes", textures: "no", rendering: "no", audio: "no", port: "no" },
  fidelity: "faithful",
  game_versions: ["unknown"],
  open_source: "unknown",
  redistribution: "unknown",
  last_activity: "2026-10",
  qa: "community-reports",
  notes: "",
  sources: ["https://example.org/source"],
  checked: "2026-10-29",
};
