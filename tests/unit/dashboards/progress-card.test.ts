import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import StudentDashboardError from "../../../app/(student)/dashboard/error";
import { ContinueLearning } from "../../../src/components/dashboards/continue-learning";
import { CourseProgressCard } from "../../../src/components/dashboards/course-progress-card";
import {
  studentDashboardCourseColumns,
  studentDashboardCourseWhere,
  studentDashboardProgressColumns,
  studentDashboardProgressWhere,
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

  it("limits dashboard progress to lessons in courses with a matching paid purchase", () => {
    const compiled = compile(studentDashboardProgressWhere("user_server_123"));

    expect(compiled.sql).toContain("lesson_progress.user_id = ");
    expect(compiled.sql).toContain("lessons.id = lesson_progress.lesson_id");
    expect(compiled.sql).toContain("modules.id = lessons.module_id");
    expect(compiled.sql).toContain("courses.id = modules.course_id");
    expect(compiled.sql).toContain("purchases.course_id = courses.id");
    expect(compiled.sql).toContain("purchases.user_id = ");
    expect(compiled.sql).toContain("purchases.status = ");
    expect(compiled.params).toEqual(
      expect.arrayContaining(["user_server_123", "user_server_123", "paid"]),
    );
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

  it("returns no Continue Learning target when every lesson is complete", () => {
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
    expect(dashboard.continueLearning).toBeNull();
  });

  it("keeps a paid course with no lessons incomplete and out of Continue Learning", () => {
    const dashboard = buildStudentDashboardData(
      [{ ...course("empty-course", []), modules: [] }],
      [],
    );

    expect(dashboard.courses[0]).toMatchObject({
      progressPercent: 0,
      isComplete: false,
      totalLessons: 0,
    });
    expect(dashboard.continueLearning).toBeNull();
  });
});

describe("student dashboard semantics", () => {
  it("renders each dashboard course title as an h3", () => {
    const markup = renderToStaticMarkup(
      createElement(CourseProgressCard, {
        course: buildStudentDashboardData(
          [course("semantic-course", [{ id: "lesson-one", slug: "lesson-one" }])],
          [],
        ).courses[0]!,
      }),
    );

    expect(markup).toContain("<h3");
    expect(markup).toContain("semantic-course course");
  });

  it("renders the Continue Learning title as an h2", () => {
    const markup = renderToStaticMarkup(
      createElement(ContinueLearning, { learning: null }),
    );

    expect(markup).toContain("<h2");
    expect(markup).toContain("Your learning starts here");
  });

  it("announces the dashboard error state as an alert", () => {
    const markup = renderToStaticMarkup(
      createElement(StudentDashboardError, {
        error: new Error("private database detail"),
        reset: () => undefined,
      }),
    );

    expect(markup).toContain('role="alert"');
    expect(markup).not.toContain("private database detail");
  });
});
