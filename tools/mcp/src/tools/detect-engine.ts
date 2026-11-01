import { open } from "node:fs/promises";
import { join } from "node:path";
import * as z from "zod";
import type { Context } from "../config.ts";
import { decodeText, readIniValues } from "../fs/ini.ts";
import { resolveInputDir } from "../fs/safe-path.ts";
import { type Scan, type ScannedFile, baseName, nameMatcher, scanFolder } from "../fs/scan.ts";
import { type EngineFamily, type Signal, loadEngines } from "../schema/engines.ts";
import { defineTool } from "./define.ts";

const Confidence = z.enum(["high", "medium", "low"]);
type Confidence = z.infer<typeof Confidence>;

const Evidence = z.object({
  signal: z.string().describe("What was looked for, e.g. 'ext .u .utx' or 'magic c1832a9e in .u'."),
  strength: z.enum(["strong", "weak"]),
  count: z.number().describe("Matching folders or files (for magic: files whose header matched)."),
  examples: z.array(z.string()).describe("A few matching paths, relative to the scanned folder."),
  note: z.string().optional(),
});
type Evidence = z.infer<typeof Evidence>;

async function readHead(root: string, rel: string, length: number): Promise<Buffer> {
  const handle = await open(join(root, rel), "r");
  try {
    const buf = Buffer.alloc(length);
    const { bytesRead } = await handle.read(buf, 0, length, 0);
    return buf.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

function withExt(files: ScannedFile[], exts: string[]): ScannedFile[] {
  const wanted = new Set(exts.map((e) => e.toLowerCase()));
  return files.filter((f) => wanted.has(f.ext));
}

async function evaluate(signal: Signal, scan: Scan, ctx: Context): Promise<Evidence | null> {
  const examples = (paths: string[]) => paths.slice(0, ctx.limits.maxExamples);
  const base = { strength: signal.strength, ...(signal.note ? { note: signal.note } : {}) };

  if ("dir" in signal) {
    const match = nameMatcher(signal.dir);
    const hits = scan.dirs.filter((d) => match(baseName(d)));
    return hits.length ? { signal: `dir ${signal.dir}`, count: hits.length, examples: examples(hits), ...base } : null;
  }
  if ("file" in signal) {
    const match = nameMatcher(signal.file);
    const hits = scan.files.filter((f) => match(f.name)).map((f) => f.rel);
    return hits.length ? { signal: `file ${signal.file}`, count: hits.length, examples: examples(hits), ...base } : null;
  }
  if ("ext" in signal) {
    const hits = withExt(scan.files, signal.ext).map((f) => f.rel);
    return hits.length ? { signal: `ext ${signal.ext.join(" ")}`, count: hits.length, examples: examples(hits), ...base } : null;
  }

  const { magic } = signal;
  const expected = Buffer.from(magic.hex, "hex");
  const need = Math.max(magic.offset + expected.length, magic.u16le ? magic.u16le.offset + 2 : 0);
  const hits: string[] = [];
  for (const file of withExt(scan.files, magic.ext).slice(0, ctx.limits.maxMagicFilesPerSignal)) {
    let head: Buffer;
    try {
      head = await readHead(scan.root, file.rel, need);
    } catch {
      continue;
    }
    if (head.length < need || !head.subarray(magic.offset, magic.offset + expected.length).equals(expected)) continue;
    if (magic.u16le) {
      const value = head.readUInt16LE(magic.u16le.offset);
      if (value < magic.u16le.min || value > magic.u16le.max) continue;
    }
    hits.push(file.rel);
  }
  const range = magic.u16le ? ` (u16 at ${magic.u16le.offset} in ${magic.u16le.min}-${magic.u16le.max})` : "";
  return hits.length
    ? { signal: `magic ${magic.hex}${range} in ${magic.ext.join(" ")}`, count: hits.length, examples: examples(hits), ...base }
    : null;
}

function confidence(evidence: Evidence[]): Confidence | null {
  const strong = evidence.filter((e) => e.strength === "strong").length;
  if (strong >= 1 && evidence.length >= 2) return "high";
  if (strong >= 1 || evidence.length >= 2) return "medium";
  return evidence.length === 1 ? "low" : null;
}

const RANK: Record<Confidence, number> = { high: 3, medium: 2, low: 1 };

/** Redistributables, installers and uninstallers shipped next to the game. */
const INSTALLER =
  /(^|\/)(_?commonredist|redist\w*|prerequisites|directx|support|installers?|__installer)(\/|$)|vcredist|dxsetup|d3d\w*install|(^|\/)(setup|unins\d*)\.exe$|(^|\/)[^/]*install[^/]*\.exe$/i;

/** Editors, command-line tools and crash reporters: real programs, but not the game. */
const TOOL = /(^|\/)(unrealed\w*|ued\d*|ucc|lcc|[^/]*editor[^/]*|[^/]*crash\w*report[^/]*|[^/]*benchmark[^/]*)\.exe$/i;

/** Likely main executables first: the game, then tools, then installers; largest first within each. */
function rankExecutables(files: ScannedFile[]): string[] {
  const tier = (rel: string) => (INSTALLER.test(rel) ? 2 : TOOL.test(rel) ? 1 : 0);
  return files
    .filter((f) => f.ext === ".exe")
    .sort((a, b) => tier(a.rel) - tier(b.rel) || b.size - a.size)
    .map((f) => f.rel);
}

async function rendererConfig(family: EngineFamily, scan: Scan, ctx: Context) {
  const config = family.renderer_config;
  if (!config) return [];
  const matchers = config.files.map(nameMatcher);
  const found: { file: string; section: string; key: string; value: string }[] = [];
  const candidates = scan.files.filter((f) => matchers.some((m) => m(f.name)) && f.size <= ctx.limits.maxTextBytes);
  for (const file of candidates.slice(0, 50)) {
    let text: string;
    try {
      text = decodeText(await readHead(scan.root, file.rel, file.size));
    } catch {
      continue;
    }
    for (const { key, value } of readIniValues(text, config.section, config.keys)) {
      found.push({ file: file.rel, section: config.section, key, value });
    }
  }
  return found;
}

export const detectEngine = defineTool({
  name: "detect_engine",
  title: "Detect the engine of a game install",
  description:
    "Scan a game install folder (read-only, bounded depth, headers only) and match it against the engine signatures in " +
    "data/engines.yaml. Returns candidate engines with a confidence level and the evidence behind each, the renderer " +
    "modules found in the folder (wrappers, proxy DLLs, engine renderers), the renderer named in the game's config when " +
    "the engine has one, and the executables to pass to read_pe_info. Signatures are hints: confirm and say how you know.",
  input: z.object({
    path: z.string().describe("Absolute path to the game's install folder (or a copy of it)."),
  }),
  output: z.object({
    root: z.string(),
    scan: z.object({
      files: z.number(),
      dirs: z.number(),
      truncated: z.boolean().describe("File limit reached: some files were not seen."),
      depth_limited: z.boolean().describe("Some folders were deeper than the scan goes."),
      skipped_links: z.array(z.string()),
    }),
    candidates: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        confidence: Confidence,
        verified: z.boolean().describe("False: this family's signatures have no sources yet in data/engines.yaml."),
        evidence: z.array(Evidence),
      }),
    ),
    renderer: z.object({
      modules: z.array(z.object({ file: z.string(), kind: z.enum(["system", "proxy", "engine"]), api: z.string() })),
      config: z.array(z.object({ file: z.string(), section: z.string(), key: z.string(), value: z.string() })),
    }),
    executables: z.array(z.string()).describe("Likely main exe first (largest; installers and redistributables last)."),
    notes: z.array(z.string()),
  }),
  async handler({ path }, ctx) {
    const root = await resolveInputDir(path);
    const engines = await loadEngines(ctx.repoRoot);
    const scan = await scanFolder(root, ctx.limits);

    const candidates: { id: string; name: string; confidence: Confidence; verified: boolean; evidence: Evidence[]; family: EngineFamily }[] = [];
    for (const family of engines.families) {
      const evidence: Evidence[] = [];
      for (const signal of family.signals) {
        const hit = await evaluate(signal, scan, ctx);
        if (hit) evidence.push(hit);
      }
      const level = confidence(evidence);
      if (level) {
        candidates.push({ id: family.id, name: family.name, confidence: level, verified: family.sources.length > 0, evidence, family });
      }
    }
    const strongCount = (c: (typeof candidates)[number]) => c.evidence.filter((e) => e.strength === "strong").length;
    candidates.sort(
      (a, b) => RANK[b.confidence] - RANK[a.confidence] || strongCount(b) - strongCount(a) || b.evidence.length - a.evidence.length,
    );

    const modules = new Map(engines.renderer_modules.map((m) => [m.file.toLowerCase(), m]));
    const rendererModules = scan.files.flatMap((f) => {
      const m = modules.get(f.name.toLowerCase());
      return m ? [{ file: f.rel, kind: m.kind, api: m.api }] : [];
    });

    const config = [];
    for (const c of candidates.filter((c) => c.confidence !== "low")) config.push(...(await rendererConfig(c.family, scan, ctx)));

    const notes: string[] = [];
    if (candidates.length === 0) {
      notes.push("No known signature matched. Next: read_pe_info on the main exe (imports, version strings), file magic numbers, or REA.");
    }
    if (candidates.some((c) => !c.verified)) {
      notes.push("Some signatures are not verified yet (verified: false). Confirm the engine from documentation or the exe before relying on it.");
    }
    if (rendererModules.some((m) => m.kind === "system" && !INSTALLER.test(m.file))) {
      notes.push("A system graphics DLL inside the install folder is a wrapper or a bundled runtime, not the Windows copy. Identify it before changing anything.");
    }
    if (rendererModules.some((m) => m.kind === "proxy")) {
      notes.push("Proxy DLLs (dinput8, dsound, winmm, version...) in the folder often mean a mod loader or fix is already installed.");
    }
    if (scan.truncated || scan.depthLimited) notes.push("The scan hit its limits: evidence may be incomplete. Point it at a narrower folder if needed.");

    return {
      root,
      scan: {
        files: scan.files.length,
        dirs: scan.dirs.length,
        truncated: scan.truncated,
        depth_limited: scan.depthLimited,
        skipped_links: scan.skippedLinks.slice(0, 50),
      },
      candidates: candidates.map(({ family: _family, ...c }) => c),
      renderer: { modules: rendererModules, config },
      executables: rankExecutables(scan.files).slice(0, 20),
      notes,
    };
  },
});
