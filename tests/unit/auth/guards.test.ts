import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AppUser } from "../../../src/lib/validation/user";

const getCurrentAppUserMock = vi.fn<() => Promise<AppUser | null>>();

vi.mock("server-only", () => ({}));
vi.mock("../../../src/lib/auth/session", () => ({
  getCurrentAppUser: getCurrentAppUserMock,
}));

const { requireAdmin, requireUser } = await import(
  "../../../src/lib/auth/guards"
);

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
  beforeEach(() => {
    getCurrentAppUserMock.mockReset();
    getCurrentAppUserMock.mockResolvedValue(null);
  });

  it("rejects a missing server-side user", async () => {
    await expect(requireUser()).rejects.toThrow("Authentication required");
  });

  it("returns the user resolved from the server session", async () => {
    const user = appUser("student");
    getCurrentAppUserMock.mockResolvedValue(user);

    await expect(requireUser()).resolves.toBe(user);
  });

  it("rejects a server-side student attempting an admin mutation", async () => {
    getCurrentAppUserMock.mockResolvedValue(appUser("student"));

    await expect(requireAdmin()).rejects.toThrow("Admin access required");
  });

  it("rejects an admin attempt without a server-side session", async () => {
    await expect(requireAdmin()).rejects.toThrow("Authentication required");
  });

  it("returns a server-side admin", async () => {
    const user = appUser("admin");
    getCurrentAppUserMock.mockResolvedValue(user);

    await expect(requireAdmin()).resolves.toBe(user);
  });
});
