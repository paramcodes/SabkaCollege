import { describe, expect, it } from "vitest";

import { requireAdmin, requireUser } from "../../../src/lib/auth/guards";
import type { AppUser } from "../../../src/lib/validation/user";

const appUser = (role: AppUser["role"]): AppUser => ({
  id: `user_${role}`,
  email: `${role}@example.com`,
  name: role,
  avatarUrl: null,
  role,
  lastSyncedAt: new Date("2026-09-25T00:00:00.000Z"),
  createdAt: new Date("2026-09-25T00:00:00.000Z"),
  updatedAt: new Date("2026-09-25T00:00:00.000Z"),
});

describe("server authorization guards", () => {
  it("rejects a missing user", async () => {
    await expect(requireUser(null)).rejects.toThrow("Authentication required");
  });

  it("returns an authenticated user", async () => {
    const user = appUser("student");

    await expect(requireUser(user)).resolves.toBe(user);
  });

  it("rejects a student attempting an admin mutation", async () => {
    await expect(requireAdmin(appUser("student"))).rejects.toThrow(
      "Admin access required",
    );
  });

  it("returns an authenticated admin", async () => {
    const user = appUser("admin");

    await expect(requireAdmin(user)).resolves.toBe(user);
  });
});
