import { describe, expect, it } from "vitest";

import { canAccessAdmin, normalizeUserRole } from "../../../src/lib/auth/roles";

describe("admin role authorization", () => {
  it("allows students", () => {
    expect(canAccessAdmin({ role: "student" })).toBe(false);
  });

  it("allows admins", () => {
    expect(canAccessAdmin({ role: "admin" })).toBe(true);
  });

  it.each([undefined, null, "owner", 1, {}])(
    "defaults an invalid Clerk role to student: %j",
    (role) => {
      expect(normalizeUserRole(role)).toBe("student");
    },
  );
});
