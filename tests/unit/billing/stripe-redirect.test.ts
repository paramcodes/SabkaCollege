import { describe, expect, it } from "vitest";

import { isAllowedStripeRedirectUrl } from "../../../src/lib/validation/stripe-redirect";

describe("Stripe client redirect policy", () => {
  it.each([
    "https://checkout.stripe.com/c/pay/cs_test_a1B2c3D4e5F6g7H8#tdp",
    "https://checkout.stripe.com/c/pay/cs_live_a1B2c3D4e5F6g7H8#tdp",
    "https://buy.stripe.com/a1B2c3D4e5F6g7H8",
    "https://buy.stripe.com/test_a1B2c3D4e5F6g7H8",
  ])("accepts an approved Checkout or Payment Link URL: %s", (value) => {
    expect(isAllowedStripeRedirectUrl(value)).toBe(true);
  });

  it.each([
    "http://checkout.stripe.com/c/pay/cs_test_a1B2c3D4e5F6g7H8",
    "https://stripe.com/c/pay/cs_test_a1B2c3D4e5F6g7H8",
    "https://dashboard.stripe.com/test/sessions",
    "https://checkout.stripe.com/dashboard",
    "https://buy.stripe.com/account/settings",
    "https://checkout.stripe.com/c/pay/not-a-session",
    "https://user:password@buy.stripe.com/a1B2c3D4e5F6g7H8",
    "https://evil.example/c/pay/cs_test_a1B2c3D4e5F6g7H8",
    "not a URL",
  ])("rejects an unapproved Stripe redirect URL: %s", (value) => {
    expect(isAllowedStripeRedirectUrl(value)).toBe(false);
  });
});
