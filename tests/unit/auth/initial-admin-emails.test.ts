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
  it("bootstraps a listed email as admin when Clerk metadata has no role", () => {
    const allowList = parseInitialAdminEmails("admin@example.com");
    const email = "Admin@Example.com";

    expect(
      resolveUserRole({}, allowList.has(email.toLowerCase().trim())),
    ).toBe("admin");
  });

  it("leaves an unlisted user with no metadata as a student", () => {
    const allowList = parseInitialAdminEmails("admin@example.com");

    expect(resolveUserRole({}, allowList.has("other@example.com"))).toBe(
      "student",
    );
  });

  it("ignores metadata roles that are neither admin nor student", () => {
    const allowList = parseInitialAdminEmails("admin@example.com");

    expect(
      resolveUserRole({ role: "owner" }, allowList.has("other@example.com")),
    ).toBe("student");
    expect(
      resolveUserRole({ role: 1 }, allowList.has("admin@example.com")),
    ).toBe("admin");
  });

  it("keeps explicit Clerk metadata authoritative over the allow-list", () => {
    const allowList = parseInitialAdminEmails("admin@example.com");

    expect(
      resolveUserRole({ role: "admin" }, allowList.has("other@example.com")),
    ).toBe("admin");
    expect(
      resolveUserRole({ role: "student" }, allowList.has("other@example.com")),
    ).toBe("student");
  });

  it("demotes a listed email whose Clerk metadata says student", () => {
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
      role: "student",
      lastSyncedAt: syncedAt,
      updatedAt: syncedAt,
    });
  });

  it("bootstraps a listed email with no metadata as admin", () => {
    const syncedAt = new Date("2026-09-26T09:00:00.000Z");

    expect(
      buildAppUserSyncValues(
        identity({ email: "admin@example.com", isInitialAdmin: true }),
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
