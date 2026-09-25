import "server-only";

import { and, asc, count, countDistinct, desc, eq } from "drizzle-orm";

import { db } from "@/src/db";
import { ADMIN_PAGE_SIZE, normalizeAdminPage } from "@/src/lib/admin/pagination";
import { courses, lessons, modules, purchases, users } from "@/src/db/schema";

export async function getAdminOverview() {
  const [courseCounts, studentCount, purchaseCount] = await Promise.all([
    db
      .select({ status: courses.status, total: count() })
      .from(courses)
      .groupBy(courses.status),
    db
      .select({ total: countDistinct(users.id) })
      .from(users)
      .innerJoin(purchases, eq(users.id, purchases.userId))
      .where(and(eq(users.role, "student"), eq(purchases.status, "paid"))),
    db.select({ total: count() }).from(purchases),
  ]);

  return {
    courses: Object.fromEntries(
      courseCounts.map((row) => [row.status, row.total]),
    ) as Partial<Record<"draft" | "published" | "archived", number>>,
    students: studentCount[0]?.total ?? 0,
    purchases: purchaseCount[0]?.total ?? 0,
  };
}

export async function getAdminCourses() {
  return db.query.courses.findMany({
    columns: {
      id: true,
      title: true,
      slug: true,
      status: true,
      priceAmount: true,
      currency: true,
      updatedAt: true,
    },
    orderBy: [desc(courses.updatedAt), asc(courses.title)],
  });
}

export async function getAdminCourse(courseId: string) {
  return db.query.courses.findFirst({
    where: eq(courses.id, courseId),
    columns: {
      id: true,
      title: true,
      slug: true,
      shortDescription: true,
      description: true,
      coverImageUrl: true,
      status: true,
      priceAmount: true,
      currency: true,
      stripeProductId: true,
      stripePriceId: true,
      estimatedDurationMinutes: true,
    },
    with: {
      modules: {
        columns: {
          id: true,
          courseId: true,
          title: true,
          description: true,
          position: true,
        },
        orderBy: [asc(modules.position)],
        with: {
          lessons: {
            columns: {
              id: true,
              moduleId: true,
              slug: true,
              title: true,
              description: true,
              position: true,
              videoProvider: true,
              videoReference: true,
              durationSeconds: true,
              isPreview: true,
            },
            orderBy: [asc(lessons.position)],
          },
        },
      },
    },
  });
}

export async function getAdminStudents(page: number) {
  const safePage = normalizeAdminPage(String(page));
  return db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .innerJoin(purchases, eq(users.id, purchases.userId))
    .where(and(eq(users.role, "student"), eq(purchases.status, "paid")))
    .groupBy(users.id, users.email, users.name, users.role, users.createdAt)
    .orderBy(desc(users.createdAt), asc(users.email))
    .limit(ADMIN_PAGE_SIZE + 1)
    .offset((safePage - 1) * ADMIN_PAGE_SIZE);
}

export async function getAdminPurchases(page: number) {
  const safePage = normalizeAdminPage(String(page));
  return db
    .select({
      id: purchases.id,
      userEmail: users.email,
      userName: users.name,
      courseTitle: courses.title,
      amount: purchases.amount,
      currency: purchases.currency,
      status: purchases.status,
      purchasedAt: purchases.purchasedAt,
    })
    .from(purchases)
    .innerJoin(users, eq(purchases.userId, users.id))
    .innerJoin(courses, eq(purchases.courseId, courses.id))
    .orderBy(desc(purchases.purchasedAt), asc(users.email))
    .limit(ADMIN_PAGE_SIZE + 1)
    .offset((safePage - 1) * ADMIN_PAGE_SIZE);
}
