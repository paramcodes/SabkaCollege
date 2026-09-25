import { describe, expect, it } from "vitest";

import {
  canAccessPurchase,
  nextPurchaseStatus,
} from "../../../src/lib/billing/entitlements";

describe("purchase entitlement decisions", () => {
  it.each([
    ["pending", false],
    ["paid", true],
    ["refunded", false],
    ["revoked", false],
  ] as const)("grants learning access only for paid purchases (%s)", (status, expected) => {
    expect(canAccessPurchase(status)).toBe(expected);
  });

  it("does not let a replayed pending event revoke a paid purchase", () => {
    expect(nextPurchaseStatus("paid", "pending")).toBe("paid");
  });

  it("keeps refunded and revoked states terminal", () => {
    expect(nextPurchaseStatus("refunded", "paid")).toBe("refunded");
    expect(nextPurchaseStatus("revoked", "paid")).toBe("revoked");
  });
});
