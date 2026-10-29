import { describe, expect, it } from "vitest";
import { PeFormatError, bufferSource, parsePe, parseVersionBlock } from "../src/pe/parse.ts";
import { buildPe, buildVersionInfo } from "./helpers/pe-builder.ts";

describe("parsePe", () => {
  it("reads a 32-bit large-address-aware exe with imports", async () => {
    const pe = buildPe({
      bits: 32,
      laa: true,
      timestamp: Date.UTC(2000, 5, 23) / 1000,
      imports: { "Core.dll": ["appInit", "appExit"], "KERNEL32.dll": ["GetTickCount"], "d3d8.dll": ["Direct3DCreate8"] },
    });
    const info = await parsePe(bufferSource(pe));
    expect(info.machine).toEqual({ code: "0x14c", name: "i386" });
    expect(info.bitness).toBe(32);
    expect(info.kind).toBe("exe");
    expect(info.subsystem).toBe("windows-gui");
    expect(info.largeAddressAware).toBe(true);
    expect(info.timestamp).toBe("2000-06-23T00:00:00.000Z");
    expect(info.imports).toEqual([
      { dll: "Core.dll", functions: 2 },
      { dll: "KERNEL32.dll", functions: 1 },
      { dll: "d3d8.dll", functions: 1 },
    ]);
    expect(info.warnings).toEqual([]);
  });

  it("reads a 64-bit dll with delay imports", async () => {
    const info = await parsePe(bufferSource(buildPe({ bits: 64, dll: true, imports: { "dxgi.dll": ["CreateDXGIFactory"] }, delayImports: ["d3d11.dll"] })));
    expect(info.machine.name).toBe("amd64");
    expect(info.bitness).toBe(64);
    expect(info.kind).toBe("dll");
    expect(info.largeAddressAware).toBe(false);
    expect(info.imports).toEqual([{ dll: "dxgi.dll", functions: 1 }]);
    expect(info.delayImports).toEqual(["d3d11.dll"]);
  });

  it("reads the version resource", async () => {
    const info = await parsePe(
      bufferSource(buildPe({ version: { file: [1, 1, 2, 0], product: [1, 1, 0, 0], strings: { ProductName: "Deus Ex", CompanyName: "Ion Storm" } } })),
    );
    expect(info.version).toEqual({
      fileVersion: "1.1.2.0",
      productVersion: "1.1.0.0",
      strings: { ProductName: "Deus Ex", CompanyName: "Ion Storm" },
    });
  });

  it("returns no version when the exe has no resources", async () => {
    expect((await parsePe(bufferSource(buildPe()))).version).toBeNull();
  });

  it("rejects files that are not PE", async () => {
    await expect(parsePe(bufferSource(Buffer.from("not an exe at all, just text".padEnd(128))))).rejects.toThrow(PeFormatError);
    const noSignature = Buffer.alloc(256);
    noSignature.write("MZ");
    noSignature.writeUInt32LE(0x40, 0x3c);
    await expect(parsePe(bufferSource(noSignature))).rejects.toThrow(/PE signature/);
  });

  it("survives a truncated file", async () => {
    const pe = buildPe({ imports: { "a.dll": ["f"] } });
    const info = await parsePe(bufferSource(pe.subarray(0, 0x200)));
    expect(info.bitness).toBe(32);
    expect(info.imports).toEqual([]);
    expect(info.warnings.join()).toMatch(/import table/);
  });
});

describe("parseVersionBlock", () => {
  it("ignores blocks that are not VS_VERSION_INFO", () => {
    expect(parseVersionBlock(Buffer.alloc(64))).toBeNull();
  });

  it("round-trips the builder", () => {
    const info = parseVersionBlock(buildVersionInfo({ file: [10, 20, 30, 40], strings: { FileVersion: "10.20" } }));
    expect(info?.fileVersion).toBe("10.20.30.40");
    expect(info?.strings).toEqual({ FileVersion: "10.20" });
  });
});
