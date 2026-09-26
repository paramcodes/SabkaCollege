import { describe, expect, it } from "vitest";

import { normalizePositions } from "../../../src/lib/utils/course-order";

describe("normalizePositions", () => {
  it("normalizes positions from zero", () => {
    expect(normalizePositions([{ id: "b", position: 9 }, { id: "a", position: 4 }])).toEqual([
      { id: "a", position: 0 },
      { id: "b", position: 1 },
    ]);
  });

  it("does not mutate the input", () => {
    const items = [{ id: "b", position: 9 }, { id: "a", position: 4 }];

    normalizePositions(items);

    expect(items).toEqual([{ id: "b", position: 9 }, { id: "a", position: 4 }]);
  });
});
