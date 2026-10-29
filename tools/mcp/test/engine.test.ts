import { createHash } from "node:crypto";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { detectEngine } from "../src/tools/detect-engine.ts";
import { readPeInfo } from "../src/tools/read-pe-info.ts";
import { REPO_ROOT, context, tempDir, unrealPackage, writeTree } from "./helpers/fixtures.ts";
import { buildPe } from "./helpers/pe-builder.ts";

const ctx = context(REPO_ROOT);
const detect = (path: string) => detectEngine.handler({ path }, ctx);

/** Looks like a Deus Ex install, from memory of the UE1 layout: enough to exercise the signatures. */
function fakeUnreal1Install(): string {
  return writeTree(tempDir(), {
    "System/DeusEx.exe": buildPe({ imports: { "Core.dll": ["appInit"], "Engine.dll": ["x"] } }),
    "System/Core.u": unrealPackage(68),
    "System/Engine.u": unrealPackage(68),
    "System/Core.int": "[Public]\n",
    "System/D3DDrv.dll": buildPe({ dll: true }),
    "System/OpenGLDrv.dll": buildPe({ dll: true }),
    "System/DeusEx.ini": "[Engine.Engine]\nGameRenderDevice=D3DDrv.D3DRenderDevice\n",
    "Textures/CoreTexMetal.utx": unrealPackage(68),
    "Music/Intro.umx": unrealPackage(68),
  });
}

describe("detect_engine", () => {
  it("recognises an Unreal Engine 1 install, its renderers and its config", async () => {
    const result = await detect(fakeUnreal1Install());
    const top = result.candidates[0]!;
    expect(top).toMatchObject({ id: "unreal-1", confidence: "high", verified: false });
    expect(top.evidence.find((e) => e.signal.startsWith("magic"))).toMatchObject({ strength: "strong", count: 4 });
    expect(result.candidates.find((c) => c.id === "unreal-2")?.confidence ?? "none").not.toBe("high");
    expect(result.renderer.modules).toEqual([
      { file: "System/D3DDrv.dll", kind: "engine", api: "Direct3D (version unknown)" },
      { file: "System/OpenGLDrv.dll", kind: "engine", api: "OpenGL" },
    ]);
    expect(result.renderer.config).toEqual([
      { file: "System/DeusEx.ini", section: "Engine.Engine", key: "GameRenderDevice", value: "D3DDrv.D3DRenderDevice" },
    ]);
    expect(result.executables).toEqual(["System/DeusEx.exe"]);
    expect(result.notes.join()).toMatch(/not verified/);
  });

  it("tells Unreal Engine 2 apart by package version", async () => {
    const root = writeTree(tempDir(), { "System/Engine.u": unrealPackage(128), "StaticMeshes/Rocks.usx": unrealPackage(128) });
    expect((await detect(root)).candidates[0]).toMatchObject({ id: "unreal-2", confidence: "high" });
  });

  it("recognises Unreal Engine 3 with a localized cooked folder", async () => {
    const root = writeTree(tempDir(), { "XGame/CookedPCConsole_FR/Startup.xxx": unrealPackage(727) });
    expect((await detect(root)).candidates[0]).toMatchObject({ id: "unreal-3", confidence: "high" });
  });

  it("lists the likely main exe first and does not call a redistributable a wrapper", async () => {
    const root = writeTree(tempDir(), {
      "Binaries/Prerequisites/vcredist_x86.exe": Buffer.alloc(3000),
      "Binaries/Prerequisites/D3D11Install/d3d11.dll": "",
      "Binaries/Win32/Game.exe": Buffer.alloc(2000),
      "Launcher.exe": Buffer.alloc(1000),
      "unins000.exe": Buffer.alloc(5000),
    });
    const result = await detect(root);
    expect(result.executables).toEqual(["Binaries/Win32/Game.exe", "Launcher.exe", "unins000.exe", "Binaries/Prerequisites/vcredist_x86.exe"]);
    expect(result.renderer.modules).toHaveLength(1);
    expect(result.notes.join()).not.toMatch(/wrapper/);
  });

  it("recognises Unity and flags wrappers and proxy DLLs", async () => {
    const root = writeTree(tempDir(), {
      "UnityPlayer.dll": "",
      "Game_Data/globalgamemanagers": "",
      "d3d9.dll": "",
      "dinput8.dll": "",
    });
    const result = await detect(root);
    expect(result.candidates[0]).toMatchObject({ id: "unity", confidence: "high" });
    expect(result.renderer.modules.map((m) => m.kind)).toEqual(["system", "proxy"]);
    expect(result.notes.join()).toMatch(/wrapper/);
    expect(result.notes.join()).toMatch(/mod loader/);
  });

  it("does not match magic numbers on the wrong bytes", async () => {
    const root = writeTree(tempDir(), { "pak0.pak": "NOPE and some bytes" });
    const result = await detect(root);
    expect(result.candidates.find((c) => c.id === "idtech-2")).toBeUndefined();
  });

  it("says what to do when nothing matches", async () => {
    const result = await detect(writeTree(tempDir(), { "game.exe": buildPe() }));
    expect(result.candidates).toEqual([]);
    expect(result.notes[0]).toMatch(/read_pe_info/);
  });

  it("reports scan limits", async () => {
    const root = writeTree(tempDir(), { "a.txt": "", "b.txt": "", "c.txt": "" });
    const result = await detectEngine.handler({ path: root }, context(REPO_ROOT, { maxFiles: 2 }));
    expect(result.scan.truncated).toBe(true);
    expect(result.notes.join()).toMatch(/limits/);
  });
});

describe("read_pe_info", () => {
  it("hashes the file and highlights graphics imports", async () => {
    const exe = buildPe({ laa: true, imports: { "KERNEL32.dll": ["Sleep"], "D3D9.dll": ["Direct3DCreate9"] }, delayImports: ["opengl32.dll"] });
    const path = join(writeTree(tempDir(), { "game.exe": exe }), "game.exe");
    const result = await readPeInfo.handler({ path }, ctx);
    expect(result).toMatchObject({
      file: "game.exe",
      size: exe.length,
      sha256: createHash("sha256").update(exe).digest("hex"),
      bitness: 32,
      large_address_aware: true,
      graphics_imports: [
        { dll: "D3D9.dll", api: "Direct3D 9" },
        { dll: "opengl32.dll", api: "OpenGL" },
      ],
    });
  });

  it("turns a non-PE file into a clear tool error", async () => {
    const path = join(writeTree(tempDir(), { "readme.exe": "hello" }), "readme.exe");
    await expect(readPeInfo.handler({ path }, ctx)).rejects.toThrow(/readme\.exe: not a PE file/);
  });

  it("refuses files above the size limit before reading them", async () => {
    const path = join(writeTree(tempDir(), { "big.exe": buildPe() }), "big.exe");
    await expect(readPeInfo.handler({ path }, context(REPO_ROOT, { maxPeBytes: 100 }))).rejects.toThrow(/limit/);
  });
});
