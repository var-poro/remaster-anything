import { readdir, stat } from "node:fs/promises";
import { extname, join } from "node:path";

export interface ScannedFile {
  /** Path relative to the scan root, with forward slashes. */
  rel: string;
  name: string;
  /** Lowercase extension with the dot, "" when none. */
  ext: string;
  size: number;
}

export interface Scan {
  root: string;
  files: ScannedFile[];
  /** Folders below the root, relative, forward slashes. */
  dirs: string[];
  /** True when maxFiles was hit: some files were not listed. */
  truncated: boolean;
  /** True when folders existed below maxDepth and were not entered. */
  depthLimited: boolean;
  /** Symlinks and junctions seen and not followed. */
  skippedLinks: string[];
  /** Entries that could not be read (permissions, races). */
  unreadable: number;
}

/**
 * Breadth-first listing of `root`, bounded in depth and file count. Never follows links, so it
 * cannot leave `root`. Breadth-first means a truncated scan still has the top of the tree.
 */
export async function scanFolder(root: string, opts: { maxDepth: number; maxFiles: number }): Promise<Scan> {
  const scan: Scan = { root, files: [], dirs: [], truncated: false, depthLimited: false, skippedLinks: [], unreadable: 0 };
  let level: string[] = [""];
  for (let depth = 0; level.length > 0; depth++) {
    const next: string[] = [];
    for (const relDir of level) {
      let entries;
      try {
        entries = await readdir(join(root, relDir), { withFileTypes: true });
      } catch {
        scan.unreadable++;
        continue;
      }
      entries.sort((a, b) => a.name.localeCompare(b.name));
      for (const entry of entries) {
        const rel = relDir ? `${relDir}/${entry.name}` : entry.name;
        if (entry.isSymbolicLink()) {
          scan.skippedLinks.push(rel);
        } else if (entry.isDirectory()) {
          if (depth < opts.maxDepth) {
            scan.dirs.push(rel);
            next.push(rel);
          } else {
            scan.depthLimited = true;
          }
        } else if (entry.isFile()) {
          if (scan.files.length >= opts.maxFiles) {
            scan.truncated = true;
            return scan;
          }
          let size = 0;
          try {
            size = (await stat(join(root, rel))).size;
          } catch {
            scan.unreadable++;
            continue;
          }
          scan.files.push({ rel, name: entry.name, ext: extname(entry.name).toLowerCase(), size });
        }
      }
    }
    level = next;
  }
  return scan;
}

/** Case-insensitive whole-name match where "*" stands for any run of characters. */
export function nameMatcher(pattern: string): (name: string) => boolean {
  const source = pattern
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  const re = new RegExp(`^${source}$`, "i");
  return (name) => re.test(name);
}

export function baseName(rel: string): string {
  return rel.slice(rel.lastIndexOf("/") + 1);
}
