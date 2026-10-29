import { symlinkSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { decodeText, readIniValues } from "../src/fs/ini.ts";
import { resolveInputDir, resolveInputFile } from "../src/fs/safe-path.ts";
import { nameMatcher, scanFolder } from "../src/fs/scan.ts";
import { ToolError } from "../src/tools/define.ts";
import { tempDir, writeTree } from "./helpers/fixtures.ts";

describe("scanFolder", () => {
  it("lists files breadth-first with relative paths and lowercase extensions", async () => {
    const root = writeTree(tempDir(), { "Game.EXE": "x", "System/Core.u": "xx", "System/Sub/deep.TXT": "" });
    const scan = await scanFolder(root, { maxDepth: 6, maxFiles: 100 });
    expect(scan.files.map((f) => [f.rel, f.ext, f.size])).toEqual([
      ["Game.EXE", ".exe", 1],
      ["System/Core.u", ".u", 2],
      ["System/Sub/deep.TXT", ".txt", 0],
    ]);
    expect(scan.dirs).toEqual(["System", "System/Sub"]);
    expect(scan.truncated).toBe(false);
  });

  it("stops at the depth limit and says so", async () => {
    const root = writeTree(tempDir(), { "a/b/c/file": "" });
    const scan = await scanFolder(root, { maxDepth: 2, maxFiles: 100 });
    expect(scan.dirs).toEqual(["a", "a/b"]);
    expect(scan.files).toEqual([]);
    expect(scan.depthLimited).toBe(true);
  });

  it("stops at the file limit and says so", async () => {
    const root = writeTree(tempDir(), { "1": "", "2": "", "3": "" });
    const scan = await scanFolder(root, { maxDepth: 6, maxFiles: 2 });
    expect(scan.files).toHaveLength(2);
    expect(scan.truncated).toBe(true);
  });

  it("does not follow links or junctions out of the root", async () => {
    const outside = writeTree(tempDir(), { "secret.txt": "x" });
    const root = writeTree(tempDir(), { "inside.txt": "" });
    symlinkSync(outside, join(root, "escape"), process.platform === "win32" ? "junction" : "dir");
    const scan = await scanFolder(root, { maxDepth: 6, maxFiles: 100 });
    expect(scan.files.map((f) => f.rel)).toEqual(["inside.txt"]);
    expect(scan.skippedLinks).toEqual(["escape"]);
  });
});

describe("nameMatcher", () => {
  it("matches whole names, case-insensitively, with * wildcards", () => {
    expect(nameMatcher("*_Data")("DeusEx_data")).toBe(true);
    expect(nameMatcher("*_Data")("Data")).toBe(false);
    expect(nameMatcher("System")("system")).toBe(true);
    expect(nameMatcher("a.b")("axb")).toBe(false);
  });
});

describe("safe paths", () => {
  it("rejects relative and missing paths", async () => {
    await expect(resolveInputDir("games/deus-ex")).rejects.toThrow(ToolError);
    await expect(resolveInputDir(join(tempDir(), "missing"))).rejects.toThrow(/not found/);
  });

  it("checks the kind and size of the target", async () => {
    const root = writeTree(tempDir(), { "f.bin": Buffer.alloc(10) });
    await expect(resolveInputDir(join(root, "f.bin"))).rejects.toThrow(/not a folder/);
    await expect(resolveInputFile(root, 100)).rejects.toThrow(/not a file/);
    await expect(resolveInputFile(join(root, "f.bin"), 5)).rejects.toThrow(/limit/);
    expect((await resolveInputFile(join(root, "f.bin"), 100)).size).toBe(10);
  });
});

describe("ini", () => {
  const ini = "[Engine.Engine]\r\nGameRenderDevice=D3DDrv.D3DRenderDevice\r\n;RenderDevice=Nope\r\n[Other]\r\nGameRenderDevice=Wrong\r\n";

  it("reads keys of one section only, skipping comments", () => {
    expect(readIniValues(ini, "engine.engine", ["GameRenderDevice", "RenderDevice"])).toEqual([
      { key: "GameRenderDevice", value: "D3DDrv.D3DRenderDevice" },
    ]);
  });

  it("decodes UTF-16 files with a BOM", () => {
    const utf16 = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(ini, "utf16le")]);
    expect(readIniValues(decodeText(utf16), "Engine.Engine", ["GameRenderDevice"])).toHaveLength(1);
  });
});
