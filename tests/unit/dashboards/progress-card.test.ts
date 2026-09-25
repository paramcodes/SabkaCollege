import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import {
  studentDashboardCourseColumns,
  studentDashboardCourseWhere,
  studentDashboardProgressColumns,
} from "../../../src/db/queries/query-boundaries";
import { buildStudentDashboardData } from "../../../src/lib/student-dashboard";

const compile = (query: Parameters<PgDialect["sqlToQuery"]>[0]) => {
  const compiled = new PgDialect().sqlToQuery(query);

  return {
    sql: compiled.sql.replaceAll('"', "").replace(/\s+/g, " ").trim(),
    params: compiled.params,
  };
};

const course = (slug: string, lessons: Array<{ id: string; slug: string }>) => ({
  slug,
  title: `${slug} course`,
  shortDescription: `${slug} description`,
  coverImageUrl: null,
  estimatedDurationMinutes: 60,
  modules: [
    {
      title: "Start here",
      position: 1,
      lessons: lessons.map((lesson, index) => ({
        id: lesson.id,
        slug: lesson.slug,
        title: lesson.slug,
        position: index + 1,
      })),
    },
  ],
});

describe("student dashboard data selection", () => {
  it("limits course selection to published courses with a paid purchase for the user", () => {
    const compiled = compile(studentDashboardCourseWhere("user_server_123"));

    expect(compiled.sql).toContain("courses.status = ");
    expect(compiled.sql).toContain("purchases.user_id = ");
    expect(compiled.sql).toContain("purchases.status = ");
    expect(compiled.sql).toContain("purchases.course_id = courses.id");
    expect(compiled.params).toEqual(
      expect.arrayContaining(["published", "user_server_123", "paid"]),
    );
  });

  it("does not select payment identifiers or video references", () => {
    expect(studentDashboardCourseColumns).not.toHaveProperty("stripeProductId");
    expect(studentDashboardCourseColumns).not.toHaveProperty("stripePriceId");
    expect(studentDashboardProgressColumns).not.toHaveProperty("userId");
    expect(studentDashboardProgressColumns).not.toHaveProperty("lessonProgressId");
  });
});

describe("student dashboard progress selection", () => {
  it("continues at the most recently active incomplete lesson", () => {
    const dashboard = buildStudentDashboardData(
      [
        course("older-course", [
          { id: "older-lesson", slug: "older-lesson" },
        ]),
        course("active-course", [
          { id: "active-complete", slug: "active-complete" },
          { id: "active-next", slug: "active-next" },
        ]),
      ],
      [
        {
          lessonId: "active-next",
          completedAt: null,
          updatedAt: new Date("2026-09-20T10:00:00.000Z"),
        },
        {
          lessonId: "older-lesson",
          completedAt: null,
          updatedAt: new Date("2026-09-19T10:00:00.000Z"),
        },
        {
          lessonId: "active-complete",
          completedAt: new Date("2026-09-20T09:00:00.000Z"),
          updatedAt: new Date("2026-09-20T09:00:00.000Z"),
        },
      ],
    );

    expect(dashboard.continueLearning).toEqual({
      courseSlug: "active-course",
      courseTitle: "active-course course",
      lessonSlug: "active-next",
      lessonTitle: "active-next",
      href: "/learn/active-course/active-next",
    });
  });

  it("returns zero progress and starts at the first lesson without progress", () => {
    const dashboard = buildStudentDashboardData(
      [course("new-course", [
        { id: "first-lesson", slug: "first-lesson" },
        { id: "second-lesson", slug: "second-lesson" },
      ])],
      [],
    );

    expect(dashboard.overallProgress).toBe(0);
    expect(dashboard.courses[0]?.progressPercent).toBe(0);
    expect(dashboard.continueLearning?.href).toBe(
      "/learn/new-course/first-lesson",
    );
  });

  it("links to the course learning home when every lesson is complete", () => {
    const dashboard = buildStudentDashboardData(
      [course("complete-course", [
        { id: "complete-one", slug: "complete-one" },
        { id: "complete-two", slug: "complete-two" },
      ])],
      [
        {
          lessonId: "complete-one",
          completedAt: new Date("2026-09-20T10:00:00.000Z"),
          updatedAt: new Date("2026-09-20T10:00:00.000Z"),
        },
        {
          lessonId: "complete-two",
          completedAt: new Date("2026-09-20T11:00:00.000Z"),
          updatedAt: new Date("2026-09-20T11:00:00.000Z"),
        },
      ],
    );

    expect(dashboard.overallProgress).toBe(100);
    expect(dashboard.continueLearning?.href).toBe("/learn/complete-course");
  });
});
