import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { detectEngine } from "../src/tools/detect-engine.ts";
import { readPeInfo } from "../src/tools/read-pe-info.ts";
import { REPO_ROOT, context } from "./helpers/fixtures.ts";

// Opt-in check against a real install on the owner's machine (never committed):
//   REMASTER_TEST_GAME_DIR="<game dir>" npm test
// Prints what the tools see; asserts only that they run and find an engine and an exe.
const gameDir = process.env.REMASTER_TEST_GAME_DIR;

describe.skipIf(!gameDir)("real game install", () => {
  it("detects an engine and reads the main exe", async () => {
    const ctx = context(REPO_ROOT);
    const detected = await detectEngine.handler({ path: gameDir! }, ctx);
    console.log(JSON.stringify({ ...detected, root: "<game dir>" }, null, 2));
    expect(detected.candidates.length).toBeGreaterThan(0);
    expect(detected.executables.length).toBeGreaterThan(0);

    const pe = await readPeInfo.handler({ path: join(detected.root, detected.executables[0]!) }, ctx);
    console.log(JSON.stringify(pe, null, 2));
    expect(pe.sha256).toMatch(/^[0-9a-f]{64}$/);
  }, 120_000);
});
