import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const tokensPath = join(process.cwd(), "src/styles/tokens.css");
const reducedMotionProviderPath = join(
  process.cwd(),
  "src/components/motion/reduced-motion-provider.tsx",
);
const tablePath = join(process.cwd(), "src/components/ui/table.tsx");

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

describe("Design system boundaries", () => {
  it("uses a hydration-safe reduced-motion external store", () => {
    const provider = readFileSync(reducedMotionProviderPath, "utf8");

    expect(provider).toMatch(
      /React\.useSyncExternalStore\(\s*subscribeToReducedMotion,\s*getReducedMotionSnapshot,\s*getServerSnapshot,?\s*\)/,
    );
    expect(provider).toContain(
      "window.matchMedia(REDUCED_MOTION_QUERY).matches",
    );
    expect(provider).toContain("const getServerSnapshot = () => false;");
  });

  it("keeps the presentational table free of a client directive", () => {
    const table = readFileSync(tablePath, "utf8");

    expect(table.trimStart().startsWith('"use client"')).toBe(false);
  });
});
