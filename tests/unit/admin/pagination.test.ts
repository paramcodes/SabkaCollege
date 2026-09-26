import { describe, expect, it } from "vitest";

import {
  MAX_ADMIN_PAGE,
  normalizeAdminPage,
} from "../../../src/lib/admin/pagination";

describe("normalizeAdminPage", () => {
  it("uses page one for missing and non-numeric values", () => {
    expect(normalizeAdminPage(undefined)).toBe(1);
    expect(normalizeAdminPage("not-a-page")).toBe(1);
    expect(normalizeAdminPage([])).toBe(1);
  });

  it("normalizes positive and repeated query values", () => {
    expect(normalizeAdminPage("3")).toBe(3);
    expect(normalizeAdminPage(["4", "9"])).toBe(4);
    expect(normalizeAdminPage("2.9")).toBe(2);
  });

  it("bounds invalid page values", () => {
    expect(normalizeAdminPage("0")).toBe(1);
    expect(normalizeAdminPage("-8")).toBe(1);
    expect(normalizeAdminPage(String(MAX_ADMIN_PAGE + 1))).toBe(MAX_ADMIN_PAGE);
  });
});
