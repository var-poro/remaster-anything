import type { FileHandle } from "node:fs/promises";

// Read-only PE (exe/dll) reader. It reads the headers, the section table, the import and
// delay-import tables and the version resource, through targeted reads: never the whole file.
// Layout reference: Microsoft "PE Format" documentation (learn.microsoft.com/windows/win32/debug/pe-format).

export class PeFormatError extends Error {}

/** Random access to bytes. Reads past the end return what exists. */
export interface ByteSource {
  size: number;
  read(offset: number, length: number): Promise<Buffer>;
}

export function bufferSource(buf: Buffer): ByteSource {
  return { size: buf.length, read: async (offset, length) => buf.subarray(offset, Math.min(offset + length, buf.length)) };
}

export function fileSource(handle: FileHandle, size: number): ByteSource {
  return {
    size,
    async read(offset, length) {
      const len = Math.max(0, Math.min(length, size - offset));
      const buf = Buffer.alloc(len);
      if (len > 0) await handle.read(buf, 0, len, offset);
      return buf;
    },
  };
}

const MACHINES: Record<number, string> = {
  0x14c: "i386",
  0x8664: "amd64",
  0xaa64: "arm64",
  0x1c0: "arm",
  0x1c4: "armnt",
  0x200: "ia64",
};
const SUBSYSTEMS: Record<number, string> = { 1: "native", 2: "windows-gui", 3: "windows-console" };

const IMAGE_FILE_LARGE_ADDRESS_AWARE = 0x0020;
const IMAGE_FILE_DLL = 0x2000;
const DIR_IMPORT = 1;
const DIR_RESOURCE = 2;
const DIR_DELAY_IMPORT = 13;
const RT_VERSION = 16;

// Bounds that keep a corrupt or hostile file from making us loop or allocate.
const MAX_SECTIONS = 96;
const MAX_IMPORT_DLLS = 512;
const MAX_THUNKS = 20_000;
const MAX_VERSION_BYTES = 64 * 1024;

export interface Section {
  name: string;
  virtualAddress: number;
  virtualSize: number;
  rawOffset: number;
  rawSize: number;
}

export interface PeInfo {
  machine: { code: string; name: string };
  bitness: 32 | 64;
  kind: "exe" | "dll";
  subsystem: string;
  /** COFF TimeDateStamp as ISO date. Some linkers write a hash here instead (reproducible builds). */
  timestamp: string | null;
  largeAddressAware: boolean;
  sections: string[];
  imports: { dll: string; functions: number }[];
  delayImports: string[];
  version: VersionInfo | null;
  warnings: string[];
}

export interface VersionInfo {
  fileVersion: string | null;
  productVersion: string | null;
  strings: Record<string, string>;
}

function asciiz(buf: Buffer, start = 0): string {
  const end = buf.indexOf(0, start);
  return buf.toString("latin1", start, end === -1 ? buf.length : end);
}

export async function parsePe(src: ByteSource): Promise<PeInfo> {
  const warnings: string[] = [];
  const dos = await src.read(0, 64);
  if (dos.length < 64 || dos.toString("latin1", 0, 2) !== "MZ") throw new PeFormatError("not a PE file (no MZ header)");
  const peOffset = dos.readUInt32LE(0x3c);
  const head = await src.read(peOffset, 24);
  if (head.length < 24 || head.toString("latin1", 0, 4) !== "PE\0\0") throw new PeFormatError("not a PE file (no PE signature)");

  const machineCode = head.readUInt16LE(4);
  const sectionCount = Math.min(head.readUInt16LE(6), MAX_SECTIONS);
  const rawStamp = head.readUInt32LE(8);
  const optionalSize = head.readUInt16LE(20);
  const characteristics = head.readUInt16LE(22);

  const opt = await src.read(peOffset + 24, optionalSize);
  if (opt.length < 2) throw new PeFormatError("truncated optional header");
  const magic = opt.readUInt16LE(0);
  if (magic !== 0x10b && magic !== 0x20b) throw new PeFormatError(`unknown optional header magic 0x${magic.toString(16)}`);
  const pe64 = magic === 0x20b;
  const dirStart = pe64 ? 112 : 96;
  if (opt.length < dirStart) throw new PeFormatError("truncated optional header");
  const imageBase = pe64 ? Number(opt.readBigUInt64LE(24)) : opt.readUInt32LE(28);
  const subsystemCode = opt.readUInt16LE(68);
  const dirCount = Math.min(opt.readUInt32LE(dirStart - 4), 16, Math.floor((opt.length - dirStart) / 8));
  const dataDir = (i: number) =>
    i < dirCount ? { rva: opt.readUInt32LE(dirStart + i * 8), size: opt.readUInt32LE(dirStart + i * 8 + 4) } : { rva: 0, size: 0 };

  const table = await src.read(peOffset + 24 + optionalSize, sectionCount * 40);
  const sections: Section[] = [];
  for (let i = 0; i + 40 <= table.length; i += 40) {
    sections.push({
      name: asciiz(table.subarray(i, i + 8)),
      virtualSize: table.readUInt32LE(i + 8),
      virtualAddress: table.readUInt32LE(i + 12),
      rawSize: table.readUInt32LE(i + 16),
      rawOffset: table.readUInt32LE(i + 20),
    });
  }
  const toOffset = (rva: number): number | null => {
    for (const s of sections) {
      const span = Math.max(s.virtualSize, s.rawSize);
      if (rva >= s.virtualAddress && rva < s.virtualAddress + span) {
        const offset = rva - s.virtualAddress + s.rawOffset;
        return offset < src.size ? offset : null;
      }
    }
    return null;
  };
  const readString = async (rva: number): Promise<string | null> => {
    const offset = toOffset(rva);
    return offset === null ? null : asciiz(await src.read(offset, 256));
  };

  const imports = await readImports(src, dataDir(DIR_IMPORT), pe64, toOffset, readString, warnings);
  const delayImports = await readDelayImports(src, dataDir(DIR_DELAY_IMPORT), imageBase, toOffset, readString, warnings);
  let version: VersionInfo | null = null;
  try {
    version = await readVersion(src, dataDir(DIR_RESOURCE), toOffset);
  } catch (e) {
    warnings.push(`version resource unreadable: ${(e as Error).message}`);
  }

  return {
    machine: { code: `0x${machineCode.toString(16)}`, name: MACHINES[machineCode] ?? "unknown" },
    bitness: pe64 ? 64 : 32,
    kind: characteristics & IMAGE_FILE_DLL ? "dll" : "exe",
    subsystem: SUBSYSTEMS[subsystemCode] ?? `other (${subsystemCode})`,
    timestamp: rawStamp ? new Date(rawStamp * 1000).toISOString() : null,
    largeAddressAware: (characteristics & IMAGE_FILE_LARGE_ADDRESS_AWARE) !== 0,
    sections: sections.map((s) => s.name),
    imports,
    delayImports,
    version,
    warnings,
  };
}

type ToOffset = (rva: number) => number | null;
type ReadString = (rva: number) => Promise<string | null>;

async function readImports(
  src: ByteSource,
  dir: { rva: number; size: number },
  pe64: boolean,
  toOffset: ToOffset,
  readString: ReadString,
  warnings: string[],
): Promise<PeInfo["imports"]> {
  if (!dir.rva) return [];
  const start = toOffset(dir.rva);
  if (start === null) {
    warnings.push("import table points outside the file");
    return [];
  }
  const imports: PeInfo["imports"] = [];
  const thunkSize = pe64 ? 8 : 4;
  for (let i = 0; i < MAX_IMPORT_DLLS; i++) {
    const desc = await src.read(start + i * 20, 20);
    if (desc.length < 20 || desc.every((b) => b === 0)) break;
    const lookupRva = desc.readUInt32LE(0) || desc.readUInt32LE(16);
    const dll = await readString(desc.readUInt32LE(12));
    if (dll === null) {
      warnings.push(`import descriptor ${i} has an unreadable name`);
      continue;
    }
    let functions = 0;
    const thunks = toOffset(lookupRva);
    if (thunks !== null) {
      // Read thunks in chunks until the zero terminator.
      for (let read = 0; read < MAX_THUNKS; read += 256) {
        const chunk = await src.read(thunks + read * thunkSize, 256 * thunkSize);
        let done = false;
        for (let j = 0; j + thunkSize <= chunk.length; j += thunkSize) {
          const zero = pe64 ? chunk.readBigUInt64LE(j) === 0n : chunk.readUInt32LE(j) === 0;
          if (zero) {
            done = true;
            break;
          }
          functions++;
        }
        if (done || chunk.length < 256 * thunkSize) break;
      }
    }
    imports.push({ dll, functions });
  }
  return imports;
}

async function readDelayImports(
  src: ByteSource,
  dir: { rva: number; size: number },
  imageBase: number,
  toOffset: ToOffset,
  readString: ReadString,
  warnings: string[],
): Promise<string[]> {
  if (!dir.rva) return [];
  const start = toOffset(dir.rva);
  if (start === null) {
    warnings.push("delay-import table points outside the file");
    return [];
  }
  const names: string[] = [];
  for (let i = 0; i < MAX_IMPORT_DLLS; i++) {
    const desc = await src.read(start + i * 32, 32);
    if (desc.length < 32 || desc.every((b) => b === 0)) break;
    const attributes = desc.readUInt32LE(0);
    const nameField = desc.readUInt32LE(4);
    // Bit 0 set: fields are RVAs. Old linkers (VC6) wrote virtual addresses instead.
    const name = await readString(attributes & 1 ? nameField : nameField - imageBase);
    if (name !== null) names.push(name);
  }
  return names;
}

async function readVersion(src: ByteSource, dir: { rva: number; size: number }, toOffset: ToOffset): Promise<VersionInfo | null> {
  if (!dir.rva) return null;
  const base = toOffset(dir.rva);
  if (base === null) return null;

  // Resource tree: type -> name -> language -> data entry. Offsets are relative to `base`.
  const entries = async (offset: number) => {
    const head = await src.read(base + offset, 16);
    if (head.length < 16) return [];
    const count = Math.min(head.readUInt16LE(12) + head.readUInt16LE(14), 256);
    const raw = await src.read(base + offset + 16, count * 8);
    const list: { id: number; target: number; isDir: boolean }[] = [];
    for (let i = 0; i + 8 <= raw.length; i += 8) {
      const target = raw.readUInt32LE(i + 4);
      list.push({ id: raw.readUInt32LE(i), target: target & 0x7fffffff, isDir: (target & 0x80000000) !== 0 });
    }
    return list;
  };
  const type = (await entries(0)).find((e) => e.id === RT_VERSION && e.isDir);
  if (!type) return null;
  const name = (await entries(type.target)).find((e) => e.isDir);
  if (!name) return null;
  const lang = (await entries(name.target)).find((e) => !e.isDir);
  if (!lang) return null;
  const dataEntry = await src.read(base + lang.target, 8);
  if (dataEntry.length < 8) return null;
  const dataOffset = toOffset(dataEntry.readUInt32LE(0));
  if (dataOffset === null) return null;
  const block = await src.read(dataOffset, Math.min(dataEntry.readUInt32LE(4), MAX_VERSION_BYTES));
  return parseVersionBlock(block);
}

// VS_VERSIONINFO is a tree of blocks: wLength, wValueLength, wType, UTF-16 key, padding to
// 4 bytes, value, padding, children. Offsets are aligned relative to the block start.
interface Block {
  key: string;
  value: Buffer;
  isText: boolean;
  children: Block[];
}

function align4(n: number): number {
  return (n + 3) & ~3;
}

function readBlock(buf: Buffer, start: number, depth: number): Block | null {
  if (start + 6 > buf.length || depth > 4) return null;
  const length = buf.readUInt16LE(start);
  const valueLength = buf.readUInt16LE(start + 2);
  const isText = buf.readUInt16LE(start + 4) === 1;
  const end = Math.min(start + length, buf.length);
  if (length < 6) return null;
  let keyEnd = start + 6;
  while (keyEnd + 1 < end && buf.readUInt16LE(keyEnd) !== 0) keyEnd += 2;
  const key = buf.toString("utf16le", start + 6, keyEnd);
  const valueStart = align4(keyEnd + 2);
  // Text values count UTF-16 characters, binary values count bytes.
  const valueEnd = Math.min(valueStart + (isText ? valueLength * 2 : valueLength), end);
  const value = buf.subarray(Math.min(valueStart, end), valueEnd);
  const children: Block[] = [];
  for (let child = align4(valueEnd); child < end; ) {
    const block = readBlock(buf, child, depth + 1);
    const childLength = child + 2 <= buf.length ? buf.readUInt16LE(child) : 0;
    if (!block || childLength === 0) break;
    children.push(block);
    child = align4(child + childLength);
  }
  return { key, value, isText, children };
}

function versionFromFixed(ms: number, ls: number): string {
  return `${ms >>> 16}.${ms & 0xffff}.${ls >>> 16}.${ls & 0xffff}`;
}

export function parseVersionBlock(buf: Buffer): VersionInfo | null {
  const root = readBlock(buf, 0, 0);
  if (!root || root.key !== "VS_VERSION_INFO") return null;
  let fileVersion: string | null = null;
  let productVersion: string | null = null;
  if (root.value.length >= 24 && root.value.readUInt32LE(0) === 0xfeef04bd) {
    fileVersion = versionFromFixed(root.value.readUInt32LE(8), root.value.readUInt32LE(12));
    productVersion = versionFromFixed(root.value.readUInt32LE(16), root.value.readUInt32LE(20));
  }
  const strings: Record<string, string> = {};
  for (const info of root.children.filter((c) => c.key === "StringFileInfo")) {
    for (const table of info.children) {
      for (const entry of table.children) {
        if (Object.keys(strings).length >= 32) break;
        const text = entry.value.toString("utf16le");
        const nul = text.indexOf("\0");
        strings[entry.key] = (nul === -1 ? text : text.slice(0, nul)).slice(0, 256);
      }
    }
  }
  return { fileVersion, productVersion, strings };
}
