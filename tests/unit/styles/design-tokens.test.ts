import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const tokensPath = join(process.cwd(), "src/styles/tokens.css");

describe("Editorial Academy design tokens", () => {
  it("defines the approved core color tokens", () => {
    const tokens = readFileSync(tokensPath, "utf8");

    expect(tokens).toContain("--accent: 74 18% 42%;");
    expect(tokens).toContain("--background: 42 33% 96%;");
    expect(tokens).toContain("--foreground: 45 8% 9%;");
    expect(tokens).toContain("--primary: 14 63% 40%;");
    expect(tokens).toContain("--border: 38 18% 80%;");
  });
});
