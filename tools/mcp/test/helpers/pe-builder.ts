// Builds small but valid PE files in memory, so tests never need a real game exe.
// One section (.rdata at RVA 0x1000) holds the import, delay-import and version tables.

export interface PeSpec {
  bits?: 32 | 64;
  laa?: boolean;
  dll?: boolean;
  timestamp?: number;
  imports?: Record<string, string[]>;
  delayImports?: string[];
  version?: { file: [number, number, number, number]; product?: [number, number, number, number]; strings?: Record<string, string> };
}

const SECTION_RVA = 0x1000;
const HEADERS_SIZE = 0x200;
const IMAGE_BASE = 0x400000;

class Writer {
  buf = Buffer.alloc(0x4000);
  pos = 0;
  rva(at = this.pos) {
    return SECTION_RVA + at;
  }
  u16(v: number) {
    this.buf.writeUInt16LE(v, this.pos);
    this.pos += 2;
  }
  u32(v: number) {
    this.buf.writeUInt32LE(v, this.pos);
    this.pos += 4;
  }
  u64(v: bigint) {
    this.buf.writeBigUInt64LE(v, this.pos);
    this.pos += 8;
  }
  bytes(b: Buffer) {
    b.copy(this.buf, this.pos);
    this.pos += b.length;
  }
  asciiz(s: string) {
    this.bytes(Buffer.from(`${s}\0`, "latin1"));
  }
  align(n: number) {
    this.pos = Math.ceil(this.pos / n) * n;
  }
  skip(n: number) {
    this.pos += n;
  }
}

function pad4(b: Buffer): Buffer {
  return b.length % 4 ? Buffer.concat([b, Buffer.alloc(4 - (b.length % 4))]) : b;
}

function versionBlock(key: string, value: Buffer | null, isText: boolean, children: Buffer[]): Buffer {
  let body = pad4(Buffer.concat([Buffer.alloc(6), Buffer.from(`${key}\0`, "utf16le")]));
  if (value) body = Buffer.concat([body, value]);
  for (const child of children) body = Buffer.concat([pad4(body), child]);
  body.writeUInt16LE(body.length, 0);
  body.writeUInt16LE(value ? (isText ? value.length / 2 : value.length) : 0, 2);
  body.writeUInt16LE(isText ? 1 : 0, 4);
  return body;
}

export function buildVersionInfo(spec: NonNullable<PeSpec["version"]>): Buffer {
  const [a, b, c, d] = spec.file;
  const [pa, pb, pc, pd] = spec.product ?? spec.file;
  const fixed = Buffer.alloc(52);
  fixed.writeUInt32LE(0xfeef04bd, 0);
  fixed.writeUInt32LE(0x10000, 4);
  fixed.writeUInt32LE(((a << 16) | b) >>> 0, 8);
  fixed.writeUInt32LE(((c << 16) | d) >>> 0, 12);
  fixed.writeUInt32LE(((pa << 16) | pb) >>> 0, 16);
  fixed.writeUInt32LE(((pc << 16) | pd) >>> 0, 20);
  const strings = Object.entries(spec.strings ?? {}).map(([k, v]) => versionBlock(k, Buffer.from(`${v}\0`, "utf16le"), true, []));
  const table = versionBlock("040904b0", null, true, strings);
  const info = versionBlock("StringFileInfo", null, true, [table]);
  return versionBlock("VS_VERSION_INFO", fixed, false, [info]);
}

export function buildPe(spec: PeSpec = {}): Buffer {
  const pe64 = spec.bits === 64;
  const w = new Writer();
  const dirs: Record<number, { rva: number; size: number }> = {};

  const imports = Object.entries(spec.imports ?? {});
  if (imports.length) {
    const descStart = w.pos;
    w.skip((imports.length + 1) * 20);
    imports.forEach(([dll, fns], i) => {
      const hints = fns.map((fn) => {
        w.align(2);
        const at = w.rva();
        w.u16(0);
        w.asciiz(fn);
        return at;
      });
      const name = w.rva();
      w.asciiz(dll);
      w.align(8);
      const thunks = w.rva();
      for (const h of hints) (pe64 ? w.u64(BigInt(h)) : w.u32(h));
      pe64 ? w.u64(0n) : w.u32(0);
      const d = descStart + i * 20;
      w.buf.writeUInt32LE(thunks, d);
      w.buf.writeUInt32LE(name, d + 12);
      w.buf.writeUInt32LE(thunks, d + 16);
    });
    dirs[1] = { rva: w.rva(descStart), size: (imports.length + 1) * 20 };
  }

  if (spec.delayImports?.length) {
    w.align(4);
    const descStart = w.pos;
    w.skip((spec.delayImports.length + 1) * 32);
    spec.delayImports.forEach((dll, i) => {
      const name = w.rva();
      w.asciiz(dll);
      w.buf.writeUInt32LE(1, descStart + i * 32);
      w.buf.writeUInt32LE(name, descStart + i * 32 + 4);
    });
    dirs[13] = { rva: w.rva(descStart), size: (spec.delayImports.length + 1) * 32 };
  }

  if (spec.version) {
    w.align(4);
    const base = w.pos;
    const dir = (offset: number, id: number, target: number) => {
      w.pos = base + offset;
      w.skip(14);
      w.u16(1);
      w.u32(id);
      w.u32(target);
    };
    // High bit = "points to a subdirectory"; >>> 0 keeps the value unsigned.
    dir(0, 16, (0x80000000 | 24) >>> 0);
    dir(24, 1, (0x80000000 | 48) >>> 0);
    dir(48, 0x409, 72);
    const data = buildVersionInfo(spec.version);
    w.pos = base + 72;
    w.u32(w.rva(base + 88));
    w.u32(data.length);
    w.u32(0);
    w.u32(0);
    w.bytes(data);
    dirs[2] = { rva: w.rva(base), size: w.pos - base };
  }

  const sectionData = w.buf.subarray(0, Math.max(w.pos, 16));
  const rawSize = Math.ceil(sectionData.length / 0x200) * 0x200;
  const optSize = (pe64 ? 112 : 96) + 16 * 8;
  const out = Buffer.alloc(HEADERS_SIZE + rawSize);

  out.write("MZ", 0, "latin1");
  out.writeUInt32LE(0x40, 0x3c);
  out.write("PE\0\0", 0x40, "latin1");
  const coff = 0x44;
  out.writeUInt16LE(pe64 ? 0x8664 : 0x14c, coff);
  out.writeUInt16LE(1, coff + 2);
  out.writeUInt32LE(spec.timestamp ?? 0x3a000000, coff + 4);
  out.writeUInt16LE(optSize, coff + 16);
  out.writeUInt16LE(0x0002 | (spec.laa ? 0x0020 : 0) | (spec.dll ? 0x2000 : 0), coff + 18);

  const opt = coff + 20;
  out.writeUInt16LE(pe64 ? 0x20b : 0x10b, opt);
  if (pe64) out.writeBigUInt64LE(BigInt(IMAGE_BASE), opt + 24);
  else out.writeUInt32LE(IMAGE_BASE, opt + 28);
  out.writeUInt16LE(2, opt + 68);
  const dirStart = opt + (pe64 ? 112 : 96);
  out.writeUInt32LE(16, dirStart - 4);
  for (const [i, d] of Object.entries(dirs)) {
    out.writeUInt32LE(d.rva, dirStart + Number(i) * 8);
    out.writeUInt32LE(d.size, dirStart + Number(i) * 8 + 4);
  }

  const section = opt + optSize;
  out.write(".rdata", section, "latin1");
  out.writeUInt32LE(sectionData.length, section + 8);
  out.writeUInt32LE(SECTION_RVA, section + 12);
  out.writeUInt32LE(rawSize, section + 16);
  out.writeUInt32LE(HEADERS_SIZE, section + 20);
  sectionData.copy(out, HEADERS_SIZE);
  return out;
}
