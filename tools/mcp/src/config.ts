import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

export interface Limits {
  /** Folder levels below the scanned root that a scan descends into. */
  maxDepth: number;
  /** Files listed before a scan stops and reports `truncated`. */
  maxFiles: number;
  /** Largest exe or dll read_pe_info accepts (it hashes the whole file). */
  maxPeBytes: number;
  /** Largest text file (ini, cfg) read in full. */
  maxTextBytes: number;
  /** Files whose header is read per magic-number signal. */
  maxMagicFilesPerSignal: number;
  /** Example paths returned per piece of evidence. */
  maxExamples: number;
}

export const DEFAULT_LIMITS: Limits = {
  maxDepth: 6,
  maxFiles: 50_000,
  maxPeBytes: 512 * 1024 * 1024,
  maxTextBytes: 256 * 1024,
  maxMagicFilesPerSignal: 20,
  maxExamples: 5,
};

/** What every tool handler receives. Tests build their own with a fixture repo. */
export interface Context {
  repoRoot: string;
  limits: Limits;
}

function isRepoRoot(dir: string): boolean {
  return existsSync(join(dir, "AGENTS.md")) && existsSync(join(dir, "data", "directory.yaml"));
}

/**
 * The Remaster Anything checkout the server reads `data/`, `games/` and `playbook/` from:
 * REMASTER_ANYTHING_ROOT if set, otherwise the first parent of this file that looks like the repo.
 */
export function findRepoRoot(start: string = import.meta.dirname): string {
  const fromEnv = process.env.REMASTER_ANYTHING_ROOT;
  if (fromEnv) {
    const root = resolve(fromEnv);
    if (!isRepoRoot(root)) {
      throw new Error(`REMASTER_ANYTHING_ROOT=${root} is not a Remaster Anything checkout (no AGENTS.md or data/directory.yaml)`);
    }
    return root;
  }
  for (let dir = resolve(start); ; dir = dirname(dir)) {
    if (isRepoRoot(dir)) return dir;
    if (dirname(dir) === dir) {
      throw new Error("Remaster Anything checkout not found above the server; set REMASTER_ANYTHING_ROOT");
    }
  }
}
