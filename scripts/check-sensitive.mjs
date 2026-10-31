// Fails if something sensitive is about to leave the machine (rules in lib/sensitive.mjs).
//   node scripts/check-sensitive.mjs               every tracked file in the working tree (npm run check, CI)
//   node scripts/check-sensitive.mjs --pre-push    the commits being pushed: files, messages, author emails
//   node scripts/check-sensitive.mjs --install-hook  points git at .githooks/ (run by npm install)
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { basename } from "node:path";
import { homedir, userInfo } from "node:os";
import { ALLOW_MARKER, checkFile, isAllowedEmail, redact, scanText } from "./lib/sensitive.mjs";

const git = (args, opts = {}) => execFileSync("git", args, { maxBuffer: 64 * 1024 * 1024, ...opts });
const gitText = (args) => git(args, { encoding: "utf8" });

if (process.argv.includes("--install-hook")) {
  // Silent outside a git checkout (installed from a tarball, say).
  try {
    gitText(["rev-parse", "--is-inside-work-tree"]);
    gitText(["config", "core.hooksPath", ".githooks"]);
  } catch {}
  process.exit(0);
}

// Words that identify the owner: local username and home folder name, plus local/deny.txt
// (one term per line, # for comments) for real names, handles or anything else. Skipped on CI,
// where the username is the runner's.
function ownerTerms() {
  const terms = new Set();
  if (!process.env.CI) {
    for (const t of [userInfo().username, basename(homedir())]) if (t) terms.add(t);
  }
  if (existsSync("local/deny.txt")) {
    for (const line of readFileSync("local/deny.txt", "utf8").split(/\r?\n/)) {
      const t = line.trim();
      if (t && !t.startsWith("#")) terms.add(t);
    }
  }
  return [...terms];
}

const opts = { terms: ownerTerms() };
const problems = [];
const report = (where, issues) => {
  for (const i of issues) problems.push(`${where}${i.line ? `:${i.line}` : ""}: ${i.rule}${i.match ? ` (${i.match})` : ""}`);
};

function checkTree() {
  const files = gitText(["ls-files", "-z"]).split("\0").filter(Boolean);
  for (const path of files) {
    if (!existsSync(path)) continue;
    report(path, checkFile(path, statSync(path).size, () => readFileSync(path), opts));
  }
  return `${files.length} tracked files`;
}

function commitsToPush() {
  const shas = new Set();
  const zero = /^0+$/;
  for (const line of readFileSync(0, "utf8").split(/\r?\n/)) {
    const [, localSha, , remoteSha] = line.trim().split(/\s+/);
    if (!localSha || zero.test(localSha)) continue; // branch deletion
    const range = remoteSha && !zero.test(remoteSha) ? [`${remoteSha}..${localSha}`] : [localSha, "--not", "--remotes"];
    for (const sha of gitText(["rev-list", ...range]).split("\n").filter(Boolean)) shas.add(sha);
  }
  return [...shas];
}

function checkCommits() {
  const shas = commitsToPush();
  for (const sha of shas) {
    const short = sha.slice(0, 7);
    const [author, committer, message] = gitText(["log", "-1", "--format=%ae%x00%ce%x00%B", sha]).split("\0");
    for (const [who, email] of [["author", author], ["committer", committer]])
      if (!isAllowedEmail(email)) problems.push(`commit ${short}: ${who} email is not a noreply address (${redact(email)})`);
    report(`commit ${short} message`, scanText(message, opts));

    const changed = gitText(["diff-tree", "-r", "--root", "--no-commit-id", "--diff-filter=ACMRT", "--name-only", "-z", sha]);
    for (const path of changed.split("\0").filter(Boolean)) {
      const object = `${sha}:${path}`;
      const size = Number(gitText(["cat-file", "-s", object]));
      report(`commit ${short} ${path}`, checkFile(path, size, () => git(["cat-file", "blob", object]), opts));
    }
  }
  return `${shas.length} commit${shas.length === 1 ? "" : "s"}`;
}

const prePush = process.argv.includes("--pre-push");
const scope = prePush ? checkCommits() : checkTree();
if (problems.length) {
  console.error(`Sensitive content found${prePush ? ", push blocked" : ""}:\n${problems.map((p) => `  ${p}`).join("\n")}`);
  console.error(
    "\nRemove it (rewrite the commit if it is already committed), use placeholders such as <game dir> or" +
      ` %USERPROFILE%, or, for a line that only documents a pattern, add "${ALLOW_MARKER}" to it.`,
  );
  process.exit(1);
}
console.log(`sensitive check OK (${scope})`);
