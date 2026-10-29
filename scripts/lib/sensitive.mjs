// Rules for what must never be pushed: game files and assets, the owner's private folders,
// secrets, personal paths, emails and usernames. Pure functions, used by check-sensitive.mjs.

// Folders git ignores on purpose (see .gitignore). Committing them leaks the owner's private state.
const PRIVATE_DIRS = ["local/", "captures/", "extracted/"];

// Game executables, packages, archives, raw textures, audio, video and saves.
const GAME_EXTS = new Set(
  (
    ".exe .dll .bin .dat .u .utx .uax .umx .unr .usx .ukx .upx .upk .xxx .pak .vpk .gcf .bsa .ba2 .esm .esp " +
    ".wad .pk3 .pk4 .bsp .mdl .bik .smk .dds .tga .bmp .pcx .ktx .wav .ogg .mp3 .xma .zip .7z .rar .cab .iso " +
    ".sav .assets .resource"
  ).split(" "),
);

// Binary files allowed in the repo: small before/after crops for documentation only.
const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);
export const MAX_IMAGE_BYTES = 500 * 1024;
export const MAX_FILE_BYTES = 1024 * 1024;

// A line containing this marker is skipped, for docs that must show a pattern.
export const ALLOW_MARKER = "sensitive-check: allow";

// The rules' own tests are full of fake paths and emails; their content is not scanned.
const CONTENT_EXEMPT = new Set(["scripts/check-sensitive.test.mjs"]);

const SECRETS = [
  ["GitHub token", /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})/g],
  ["API key", /\b(?:sk-ant-[A-Za-z0-9_-]{20,}|sk-[A-Za-z0-9]{32,}|AIza[0-9A-Za-z_-]{35}|xox[abprs]-[A-Za-z0-9-]{10,})/g],
  ["AWS key", /\bAKIA[0-9A-Z]{16}\b/g],
  ["private key", /-----BEGIN [A-Z ]*PRIVATE KEY-----/g],
];

// Paths under a user's home folder name that user. Placeholders (<user>, %USERPROFILE%, $HOME) don't match.
const WINDOWS_HOME = /[A-Za-z]:(?:\\\\|\\|\/)+Users(?:\\\\|\\|\/)+([^\\/\s"'`<>%$*]+)/gi;
const UNIX_HOME = /(?<![\w.:])\/(?:Users|home)\/([^/\s"'`<>%$*]+)/g;
const SHARED_HOMES = new Set(["public", "default", "all users", "shared"]);

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
const ALLOWED_EMAIL = /(?:@users\.noreply\.github\.com|^noreply@anthropic\.com|^noreply@github\.com|^git@github\.com|@example\.(?:com|org|net))$/i;

export function isAllowedEmail(email) {
  return ALLOWED_EMAIL.test(email);
}

// Shows enough of a match to find it, never the whole secret (CI logs are public).
export function redact(text) {
  return text.length <= 8 ? text : `${text.slice(0, 6)}…`;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Scans text for secrets, personal paths, non-noreply emails and owner terms.
 * opts.terms: words that identify the owner (local username, entries of local/deny.txt).
 * Returns [{ line, rule, match }], match already redacted.
 */
export function scanText(text, opts = {}) {
  const terms = (opts.terms ?? []).filter((t) => t.length >= 3);
  const termRe = terms.length ? new RegExp(`(?<![A-Za-z0-9])(?:${terms.map(escapeRegex).join("|")})(?![A-Za-z0-9])`, "gi") : null;
  const issues = [];
  text.split(/\r?\n/).forEach((line, i) => {
    if (line.includes(ALLOW_MARKER)) return;
    const add = (rule, match) => issues.push({ line: i + 1, rule, match: redact(match) });
    for (const [rule, re] of SECRETS) for (const m of line.matchAll(re)) add(rule, m[0]);
    for (const re of [WINDOWS_HOME, UNIX_HOME])
      for (const m of line.matchAll(re)) if (!SHARED_HOMES.has(m[1].toLowerCase())) add("path with a username", m[0]);
    for (const m of line.matchAll(EMAIL)) if (!isAllowedEmail(m[0])) add("email address", m[0]);
    if (termRe) for (const m of line.matchAll(termRe)) add("owner name or username", m[0]);
  });
  return issues;
}

function extOf(path) {
  const name = path.slice(path.lastIndexOf("/") + 1);
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot).toLowerCase() : "";
}

/**
 * Checks one file about to be pushed. `read()` returns its content as a Buffer; it is only
 * called for files small enough to scan. Returns [{ line?, rule, match? }].
 */
export function checkFile(path, size, read, opts = {}) {
  const issues = [];
  const lower = path.toLowerCase();
  const privateDir = PRIVATE_DIRS.find((d) => lower.startsWith(d) || lower.includes(`/${d}`));
  if (privateDir) issues.push({ rule: `private folder ${privateDir} (git-ignored on purpose)` });
  // Path segments can name the owner too (a folder called after them, say).
  for (const issue of scanText(path, opts)) issues.push({ rule: `${issue.rule} in the file path`, match: issue.match });

  const ext = extOf(path);
  if (GAME_EXTS.has(ext)) return [...issues, { rule: `game file or asset (${ext})` }];
  if (IMAGE_EXTS.has(ext)) {
    if (size > MAX_IMAGE_BYTES) issues.push({ rule: `image over ${MAX_IMAGE_BYTES / 1024} KiB (crops only)` });
    return issues;
  }
  if (size > MAX_FILE_BYTES) return [...issues, { rule: `file over ${MAX_FILE_BYTES / 1024} KiB` }];

  const buf = read();
  if (buf.subarray(0, 8000).includes(0)) return [...issues, { rule: "binary file" }];
  if (CONTENT_EXEMPT.has(path)) return issues;
  return [...issues, ...scanText(buf.toString("utf8"), opts)];
}
