import { describe, expect, it } from "vitest";

import {
  calculateCourseProgress,
  shouldAutoComplete,
} from "../../../src/lib/utils/progress";

describe("progress rules", () => {
  it("completes at ninety percent", () => {
    expect(shouldAutoComplete(0.89)).toBe(false);
    expect(shouldAutoComplete(0.9)).toBe(true);
  });

  it("rounds course progress", () => {
    expect(calculateCourseProgress(3, 1)).toBe(33);
    expect(calculateCourseProgress(0, 0)).toBe(0);
  });

  it("clamps percentages at both ends of the valid range", () => {
    expect(shouldAutoComplete(-1)).toBe(false);
    expect(shouldAutoComplete(2)).toBe(true);
  });

  it("caps completed lessons at the total", () => {
    expect(calculateCourseProgress(2, 4)).toBe(100);
  });
});
