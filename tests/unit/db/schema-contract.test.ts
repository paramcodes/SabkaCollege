import { describe, expect, expectTypeOf, it } from "vitest";

import {
  completionMethod,
  courseStatus,
  purchaseStatus,
  schema,
} from "../../../src/db/schema";

const requiredTables = [
  "users",
  "courses",
  "modules",
  "lessons",
  "purchases",
  "lessonProgress",
] as const;

describe("database schema contract", () => {
  it("exports every LMS-owned table", () => {
    expect(Object.keys(schema)).toEqual(
      expect.arrayContaining([...requiredTables]),
    );
  });

  it("exposes the exact course status union", () => {
    expect(courseStatus).toEqual(["draft", "published", "archived"]);
    expectTypeOf<(typeof courseStatus)[number]>().toEqualTypeOf<
      "draft" | "published" | "archived"
    >();
  });

  it("exposes the exact purchase status union", () => {
    expect(purchaseStatus).toEqual(["pending", "paid", "refunded", "revoked"]);
    expectTypeOf<(typeof purchaseStatus)[number]>().toEqualTypeOf<
      "pending" | "paid" | "refunded" | "revoked"
    >();
  });

  it("exposes the exact lesson completion method union", () => {
    expect(completionMethod).toEqual(["automatic", "manual"]);
    expectTypeOf<(typeof completionMethod)[number]>().toEqualTypeOf<
      "automatic" | "manual"
    >();
  });
});
