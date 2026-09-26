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

  it("does not let pending events downgrade paid or refunded purchases", () => {
    expect(nextPurchaseStatus("paid", "pending")).toBe("paid");
    expect(nextPurchaseStatus("refunded", "pending")).toBe("refunded");
  });

  it("keeps refunded purchases from returning to paid", () => {
    expect(nextPurchaseStatus("refunded", "paid")).toBe("refunded");
  });

  it("keeps revoked strongest except an explicit won-dispute restoration", () => {
    expect(nextPurchaseStatus("revoked", "paid")).toBe("revoked");
    expect(nextPurchaseStatus("revoked", "pending")).toBe("revoked");
  });

  it("allows paid and refunded purchases to become revoked", () => {
    expect(nextPurchaseStatus("paid", "revoked")).toBe("revoked");
    expect(nextPurchaseStatus("refunded", "revoked")).toBe("revoked");
  });
});
