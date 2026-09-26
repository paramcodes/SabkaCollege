import { describe, expect, it } from "vitest";

import { buildAppUserTombstoneValues } from "../../../src/lib/validation/user";

describe("Clerk user deletion sync values", () => {
  it("anonymizes the local mirror while preserving its Clerk ID", () => {
    const syncedAt = new Date("2026-09-25T12:30:00.000Z");

    expect(
      buildAppUserTombstoneValues("user_2abcDeleted", syncedAt),
    ).toEqual({
      id: "user_2abcDeleted",
      email: "tombstone+user_2abcDeleted@users.invalid",
      name: null,
      avatarUrl: null,
      role: "student",
      lastSyncedAt: syncedAt,
      updatedAt: syncedAt,
    });
  });
});
