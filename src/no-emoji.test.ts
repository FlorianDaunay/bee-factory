import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Icons are drawn (src/art) or come from Lucide; emoji render differently on every platform.
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(f) ? [p] : [];
  });
}

describe("no emoji", () => {
  it("source files use drawn icons, not emoji", () => {
    const offenders = files("src")
      .filter((f) => !f.includes("themes"))
      .flatMap((f) =>
        readFileSync(f, "utf8")
          .split("\n")
          .map((line, i) => ({ f, i: i + 1, line }))
          .filter((l) => EMOJI.test(l.line)),
      )
      .map((l) => `${l.f}:${l.i}`);
    expect(offenders).toEqual([]);
  });
});
