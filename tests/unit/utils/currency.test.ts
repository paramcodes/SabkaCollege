import { describe, expect, it } from "vitest";

import { formatCoursePrice } from "../../../src/lib/formatting/currency";

describe("formatCoursePrice", () => {
  it("keeps the currency fraction digits when the minor-unit amount is an integer", () => {
    expect(formatCoursePrice(125000, "INR")).toBe("₹1,250.00");
  });

  it("formats non-zero minor units without losing precision", () => {
    expect(formatCoursePrice(125050, "INR")).toBe("₹1,250.50");
  });

  it("returns a readable fallback for an invalid currency", () => {
    expect(formatCoursePrice(125000, "not-a-currency")).toBe(
      "See course price",
    );
  });
});
