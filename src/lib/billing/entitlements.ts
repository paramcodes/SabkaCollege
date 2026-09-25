import { and, eq } from "drizzle-orm";

import type { PurchaseStatus } from "@/src/db/schema";

export const canAccessPurchase = (status: PurchaseStatus): boolean =>
  status === "paid";

export const nextPurchaseStatus = (
  current: PurchaseStatus,
  incoming: PurchaseStatus,
): PurchaseStatus => {
  if (current === "revoked") {
    return "revoked";
  }

  if (incoming === "revoked") {
    return "revoked";
  }

  if (current === "refunded") {
    return "refunded";
  }

  if (current === "paid" && incoming === "pending") {
    return "paid";
  }

  return incoming;
};

export async function hasCourseAccess(
  userId: string,
  courseId: string,
): Promise<boolean> {
  if (!userId || !courseId) {
    return false;
  }

  const [{ db }, { purchases }] = await Promise.all([
    import("@/src/db"),
    import("@/src/db/schema"),
  ]);
  const matchingPurchase = await db
    .select({ id: purchases.id })
    .from(purchases)
    .where(
      and(
        eq(purchases.userId, userId),
        eq(purchases.courseId, courseId),
        eq(purchases.status, "paid"),
      ),
    )
    .limit(1);

  return matchingPurchase.length > 0;
}
