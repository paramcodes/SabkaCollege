import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AppUser } from "../../../src/lib/validation/user";

const requireUserMock = vi.fn<() => Promise<AppUser>>();
const createCourseCheckoutMock =
  vi.fn<
    (input: { courseSlug: string; userId: string }) => Promise<{
      checkoutUrl: string;
    }>
  >();

vi.mock("server-only", () => ({}));
vi.mock("../../../src/lib/auth/guards", () => ({
  requireUser: requireUserMock,
}));
vi.mock("../../../src/lib/billing/checkout", () => ({
  createCourseCheckout: createCourseCheckoutMock,
}));

const { startCourseCheckout } = await import("../../../src/actions/billing");

const user: AppUser = {
  id: "user_123",
  email: "student@example.com",
  name: "Student",
  avatarUrl: null,
  role: "student",
  lastSyncedAt: new Date("2026-09-25T00:00:00.000Z"),
  createdAt: new Date("2026-09-25T00:00:00.000Z"),
  updatedAt: new Date("2026-09-25T00:00:00.000Z"),
};

beforeEach(() => {
  requireUserMock.mockReset();
  createCourseCheckoutMock.mockReset();
  requireUserMock.mockResolvedValue(user);
});

describe("billing action contract", () => {
  it("passes the authenticated user and normalized course slug to checkout", async () => {
    createCourseCheckoutMock.mockResolvedValue({
      checkoutUrl: "https://checkout.stripe.test/session_123",
    });

    const result = await startCourseCheckout({ courseSlug: "  course-slug  " });

    expect(createCourseCheckoutMock).toHaveBeenCalledWith({
      courseSlug: "course-slug",
      userId: "user_123",
    });
    expect(result).toEqual({
      ok: true,
      data: { checkoutUrl: "https://checkout.stripe.test/session_123" },
    });
  });

  it("returns a redacted unauthenticated result when authentication fails", async () => {
    requireUserMock.mockRejectedValue(
      new Error("Clerk token sk_live_should_not_escape"),
    );

    await expect(
      startCourseCheckout({ courseSlug: "course-slug" }),
    ).resolves.toEqual({
      ok: false,
      error: {
        code: "UNAUTHENTICATED",
        message: "Sign in to purchase this course.",
      },
    });
    expect(createCourseCheckoutMock).not.toHaveBeenCalled();
  });

  it("redacts Stripe and infrastructure errors from checkout failures", async () => {
    createCourseCheckoutMock.mockRejectedValue(
      new Error("Stripe request failed with sk_live_should_not_escape"),
    );

    const result = await startCourseCheckout({
      courseSlug: "course-slug",
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "CHECKOUT_UNAVAILABLE",
        message: "Checkout is temporarily unavailable. Please try again.",
      },
    });
    expect(JSON.stringify(result)).not.toContain("sk_live");
  });

  it("rejects invalid input without calling Stripe", async () => {
    await expect(startCourseCheckout({ courseSlug: "  " })).resolves.toEqual({
      ok: false,
      error: {
        code: "INVALID_INPUT",
        message: "Enter a valid course to purchase.",
      },
    });
    expect(createCourseCheckoutMock).not.toHaveBeenCalled();
  });
});
