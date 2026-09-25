import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import AdminError from "../../../app/(admin)/admin/error";
import AdminLoading from "../../../app/(admin)/admin/loading";
import CourseOverviewError from "../../../app/(catalog)/courses/[courseSlug]/error";
import CourseOverviewLoading from "../../../app/(catalog)/courses/[courseSlug]/loading";
import CourseNotFound from "../../../app/(catalog)/courses/[courseSlug]/not-found";
import LessonError from "../../../app/(learning)/learn/[courseSlug]/[lessonSlug]/error";
import LessonLoading from "../../../app/(learning)/learn/[courseSlug]/[lessonSlug]/loading";
import {
  buildBoundaryLog,
  PageError,
} from "../../../src/components/layout/page-error";

const secretError = Object.assign(
  new Error("select * from users failed: password_hash leak"),
  { stack: "Error: select * from users\n    at ServerComponent", digest: "d1g3st" },
);

const sensitivePattern =
  /(select \*|password_hash|clerk_session|sk_test_|whsec_|cs_test_|pi_|DATABASE_URL|at ServerComponent|\/home\/)/i;

const render = (element: React.ReactElement) => renderToStaticMarkup(element);

const errorBoundaries = [
  {
    label: "admin",
    element: createElement(AdminError, { error: secretError, reset: () => undefined }),
    copy: "We could not load this admin view",
  },
  {
    label: "catalog course",
    element: createElement(CourseOverviewError, {
      error: secretError,
      reset: () => undefined,
    }),
    copy: "We could not load this course",
  },
  {
    label: "learning lesson",
    element: createElement(LessonError, {
      error: secretError,
      reset: () => undefined,
    }),
    copy: "We could not load this lesson",
  },
] as const;

describe("route error boundaries", () => {
  it.each(errorBoundaries)(
    "$label announces a safe alert with a retry control",
    ({ element, copy }) => {
      const markup = render(element);

      expect(markup).toContain('role="alert"');
      expect(markup).toContain(copy);
      expect(markup).toContain("Try again");
    },
  );

  it.each(errorBoundaries)(
    "$label never renders stack traces, SQL, or provider payloads",
    ({ element }) => {
      const markup = render(element);

      expect(markup).not.toMatch(sensitivePattern);
      expect(markup).not.toContain("select *");
      expect(markup).not.toContain(secretError.stack!);
    },
  );

  it("keeps the admin and catalog boundaries inside the layout main landmark", () => {
    expect(render(createElement(AdminError, { error: secretError, reset: () => undefined }))).not.toContain(
      "<main",
    );
    expect(
      render(
        createElement(CourseOverviewError, {
          error: secretError,
          reset: () => undefined,
        }),
      ),
    ).not.toContain("<main");
    expect(
      render(createElement(LessonError, { error: secretError, reset: () => undefined })),
    ).toContain("<main");
  });

  it("logs a structured scope and digest without the failure message", () => {
    const log = buildBoundaryLog("learning.lesson", secretError);

    expect(log).toEqual({ event: "route.error", scope: "learning.lesson", digest: "d1g3st" });
    expect(JSON.stringify(log)).not.toMatch(sensitivePattern);
    expect(buildBoundaryLog("student.dashboard", null).digest).toBeNull();
  });

  it("renders an optional eyebrow, back link, and single main landmark", () => {
    const markup = render(
      createElement(PageError, {
        scope: "catalog.course",
        error: null,
        eyebrow: "Course",
        title: "We could not load this course",
        description: "Try again, or browse the catalogue.",
        reset: () => undefined,
        backHref: "/courses",
        backLabel: "Browse courses",
      }),
    );

    expect(markup).toContain("Course");
    expect(markup).toContain('href="/courses"');
    expect(markup).toContain("Browse courses");
    expect(markup.match(/<main/g)).toHaveLength(1);
  });
});

describe("route loading boundaries", () => {
  const loadingStates = [
    { label: "admin", element: createElement(AdminLoading), copy: "Loading admin workspace" },
    {
      label: "catalog course",
      element: createElement(CourseOverviewLoading),
      copy: "Loading course",
    },
    {
      label: "learning lesson",
      element: createElement(LessonLoading),
      copy: "Loading lesson",
    },
  ] as const;

  it.each(loadingStates)("$label announces a status while skeletons render", ({ element, copy }) => {
    const markup = render(element);

    expect(markup).toContain('role="status"');
    expect(markup).toContain(copy);
    expect(markup).toContain("animate-pulse");
  });

  it.each(loadingStates)("$label renders no course or payment data", ({ element }) => {
    expect(render(element)).not.toMatch(sensitivePattern);
  });
});

describe("route not-found boundaries", () => {
  it("shows a safe public course not-found state with a catalogue link", () => {
    const markup = render(createElement(CourseNotFound));

    expect(markup).toContain("Course not found");
    expect(markup).toContain('href="/courses"');
    expect(markup).not.toMatch(sensitivePattern);
    expect(markup).not.toMatch(/\/admin|\/dashboard/i);
  });
});
