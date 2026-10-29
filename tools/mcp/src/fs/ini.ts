// Minimal INI reader for old game configs: [Section] headers, key=value lines, ; comments.
// Files are decoded as UTF-16 when they start with a UTF-16 BOM, otherwise as Latin-1
// (old games write ANSI, and Latin-1 never fails to decode).

export function decodeText(bytes: Buffer): string {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return bytes.subarray(2).toString("utf16le");
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return bytes.subarray(3).toString("utf8");
  return bytes.toString("latin1");
}

/** Values of `keys` inside `section` (both case-insensitive), in file order. */
export function readIniValues(text: string, section: string, keys: string[]): { key: string; value: string }[] {
  const wanted = new Set(keys.map((k) => k.toLowerCase()));
  const found: { key: string; value: string }[] = [];
  let inSection = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith("[") && line.endsWith("]")) {
      inSection = line.slice(1, -1).trim().toLowerCase() === section.toLowerCase();
      continue;
    }
    if (!inSection || line.startsWith(";")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    if (wanted.has(key.toLowerCase())) found.push({ key, value: line.slice(eq + 1).trim() });
  }
  return found;
}
