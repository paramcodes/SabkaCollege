const checkoutSessionPathPattern =
  /^\/c\/pay\/cs_(?:live|test)_[A-Za-z0-9]{8,255}$/;
const paymentLinkPathPattern = /^\/(?:test_)?[A-Za-z0-9_-]{16,255}$/;

export const isAllowedStripeRedirectUrl = (value: string): boolean => {
  try {
    const url = new URL(value);

    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port
    ) {
      return false;
    }

    if (url.hostname === "checkout.stripe.com") {
      return checkoutSessionPathPattern.test(url.pathname);
    }

    if (url.hostname === "buy.stripe.com") {
      return paymentLinkPathPattern.test(url.pathname);
    }

    return false;
  } catch {
    return false;
  }
};
