// Copies skills/ to the folders agents look in. With --check, fails if the copies are stale.
import { cpSync, rmSync, readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const SRC = "skills";
const TARGETS = [".claude/skills", ".agents/skills"];
const check = process.argv.includes("--check");

function files(dir, base = dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? files(p, base) : [p.slice(base.length + 1)];
  });
}

let stale = false;
for (const target of TARGETS) {
  if (check) {
    for (const f of files(SRC)) {
      const t = join(target, f);
      if (!existsSync(t) || readFileSync(t, "utf8") !== readFileSync(join(SRC, f), "utf8")) {
        console.error(`stale: ${t}`);
        stale = true;
      }
    }
  } else {
    rmSync(target, { recursive: true, force: true });
    cpSync(SRC, target, { recursive: true });
    console.log(`synced ${SRC} -> ${target}`);
  }
}

// Every SKILL.md needs name + description frontmatter, and name must match its folder.
for (const skill of readdirSync(SRC)) {
  const text = readFileSync(join(SRC, skill, "SKILL.md"), "utf8");
  const name = text.match(/^---\n[\s\S]*?^name: (.+)$/m)?.[1];
  const hasDesc = /^description: .+$/m.test(text.split("\n---")[0]);
  if (name !== skill || !hasDesc) {
    console.error(`bad frontmatter: ${skill}/SKILL.md`);
    stale = true;
  }
}
if (stale) process.exit(1);
if (check) console.log("skills OK");
