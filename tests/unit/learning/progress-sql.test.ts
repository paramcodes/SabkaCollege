import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const progressActionSource = readFileSync(
  fileURLToPath(new URL("../../../src/actions/progress.ts", import.meta.url)),
  "utf8",
);

describe("lesson progress upsert SQL", () => {
  it("keeps delayed saves from lowering progress or clearing completion", () => {
    expect(progressActionSource).toMatch(
      /lastPositionSeconds:\s*sql`GREATEST\(/,
    );
    expect(progressActionSource).toMatch(
      /maxWatchedPercentage:\s*sql`GREATEST\(/,
    );
    expect(progressActionSource).toContain("completedAt: sql`COALESCE(");
    expect(progressActionSource).toContain(
      "completionMethod: sql`COALESCE(",
    );
  });
});
