import assert from "node:assert/strict";
import { test } from "node:test";
import { ALLOW_MARKER, MAX_IMAGE_BYTES, checkFile, scanText } from "./lib/sensitive.mjs";

// Fake secrets are built at run time so this file passes the check itself.
const fake = (prefix, n) => prefix + "a1".repeat(n / 2);
const rules = (issues) => issues.map((i) => i.rule);
const text = (s) => () => Buffer.from(s);

test("finds secrets and redacts them", () => {
  const issues = scanText(`token = ${fake("gh" + "p_", 36)}\nkey: ${fake("sk-" + "ant-", 40)}`);
  assert.deepEqual(rules(issues), ["GitHub token", "API key"]);
  assert.ok(issues.every((i) => i.match.length <= 7));
});

test("finds home paths with a username, not placeholders", () => {
  const bad = ["C:\\Users\\jdoe\\Games", "C:/Users/jdoe/x", '"C:\\\\Users\\\\jdoe\\\\x"', "/home/jdoe/.steam", "/Users/jdoe/Library"];
  for (const line of bad) assert.deepEqual(rules(scanText(line)), ["path with a username"], line);
  const ok = ["%USERPROFILE%\\Documents", "C:\\Users\\<user>\\x", "C:\\Users\\Public\\x", "/home/<user>", "$HOME/x", "https://x.com/home/page"];
  for (const line of ok) assert.deepEqual(scanText(line), [], line);
});

test("allows noreply emails only", () => {
  assert.deepEqual(rules(scanText("mail jane.doe@gmail.com")), ["email address"]);
  const ok = "1+var-poro@users.noreply.github.com noreply@anthropic.com a@example.com git@github.com zod@4.6.7 actions/checkout@v7";
  assert.deepEqual(scanText(ok), []);
});

test("finds owner terms as whole words, case-insensitively", () => {
  assert.deepEqual(rules(scanText("Made by JDoe.", { terms: ["jdoe"] })), ["owner name or username"]);
  assert.deepEqual(scanText("jdoes and xjdoe", { terms: ["jdoe"] }), []);
  assert.deepEqual(scanText("ab", { terms: ["ab"] }), [], "terms under 3 chars are ignored");
});

test("skips lines with the allow marker", () => {
  assert.deepEqual(scanText(`C:\\Users\\jdoe\\x  <!-- ${ALLOW_MARKER} -->`), []);
});

test("blocks private folders, game files and binaries", () => {
  assert.deepEqual(rules(checkFile("local/HANDOFF.md", 10, text("ok"))), ["private folder local/ (git-ignored on purpose)"]);
  assert.deepEqual(rules(checkFile("games/deus-ex/System/DeusEx.u", 10, text(""))), ["game file or asset (.u)"]);
  assert.deepEqual(rules(checkFile("games/x/Textures.UTX", 10, text(""))), ["game file or asset (.utx)"]);
  assert.deepEqual(rules(checkFile("notes/blob.txt", 4, () => Buffer.from([1, 0, 2, 3]))), ["binary file"]);
  assert.deepEqual(rules(checkFile("games/x/crop.png", MAX_IMAGE_BYTES + 1, text(""))), ["image over 500 KiB (crops only)"]);
  assert.deepEqual(checkFile("games/x/crop.png", 1000, text("")), []);
  assert.deepEqual(checkFile("games/x/NOTES.md", 5, text("clean")), []);
});

test("reports problems in file content with line numbers", () => {
  const issues = checkFile("games/x/NOTES.md", 30, text("line one\nInstalled in C:\\Users\\jdoe\\Games"));
  assert.deepEqual(issues.map((i) => [i.line, i.rule]), [[2, "path with a username"]]);
});
