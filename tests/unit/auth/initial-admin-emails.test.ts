import { describe, expect, it } from "vitest";

import {
  buildAppUserSyncValues,
  parseInitialAdminEmails,
  resolveUserRole,
  type ClerkUserIdentity,
} from "../../../src/lib/validation/user";

const identity = (
  overrides: Partial<ClerkUserIdentity> = {},
): ClerkUserIdentity => ({
  id: "user_2abc",
  email: "learner@example.com",
  name: null,
  avatarUrl: null,
  publicMetadata: {},
  ...overrides,
});

describe("CLERK_INITIAL_ADMIN_EMAILS allow-list parsing", () => {
  it.each([undefined, "", "   "])(
    "promotes nobody when the value is absent or blank: %j",
    (value) => {
      expect(parseInitialAdminEmails(value).size).toBe(0);
    },
  );

  it("normalizes surrounding whitespace, casing, and empty entries", () => {
    const allowList = parseInitialAdminEmails(
      " Admin@Example.com , ,second@example.com,",
    );

    expect([...allowList]).toEqual([
      "admin@example.com",
      "second@example.com",
    ]);
    expect(allowList.has("admin@example.com")).toBe(true);
  });
});

describe("role resolution during user sync", () => {
  it("promotes a listed email to admin even without Clerk metadata", () => {
    const allowList = parseInitialAdminEmails("admin@example.com");
    const email = "Admin@Example.com";

    expect(
      resolveUserRole({}, allowList.has(email.toLowerCase().trim())),
    ).toBe("admin");
  });

  it("leaves Clerk public metadata authoritative for everyone else", () => {
    const allowList = parseInitialAdminEmails("admin@example.com");

    expect(resolveUserRole({ role: "student" }, allowList.has("other@example.com"))).toBe(
      "student",
    );
    expect(resolveUserRole({ role: "admin" }, allowList.has("other@example.com"))).toBe(
      "admin",
    );
    expect(resolveUserRole({}, allowList.has("other@example.com"))).toBe("student");
  });

  it("writes the resolved role into the synchronized row", () => {
    // The allow-list wins over a `student` value in Clerk metadata: that is the
    // documented precedence, and it is why operators should still promote
    // anyone beyond the first admins through Clerk public metadata.
    const syncedAt = new Date("2026-09-26T09:00:00.000Z");

    expect(
      buildAppUserSyncValues(
        identity({
          email: "admin@example.com",
          publicMetadata: { role: "student" },
          isInitialAdmin: true,
        }),
        syncedAt,
      ),
    ).toEqual({
      id: "user_2abc",
      email: "admin@example.com",
      name: null,
      avatarUrl: null,
      role: "admin",
      lastSyncedAt: syncedAt,
      updatedAt: syncedAt,
    });
  });

  it("keeps a student a student when the allow-list is empty", () => {
    expect(
      buildAppUserSyncValues(identity({ publicMetadata: { role: "student" } })).role,
    ).toBe("student");
  });
});
