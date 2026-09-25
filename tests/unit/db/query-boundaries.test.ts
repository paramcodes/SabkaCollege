import { asc } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import {
  previewLessonPublicColumns,
  previewLessonWhere,
  progressForUserWhere,
  publicLessonColumns,
  publishedCourseWhere,
  publishedCourseWithSyllabus,
} from "../../../src/db/queries/query-boundaries";
import { lessons, modules } from "../../../src/db/schema";

const compile = (query: Parameters<PgDialect["sqlToQuery"]>[0]) => {
  const compiled = new PgDialect().sqlToQuery(query);

  return {
    sql: compiled.sql.replaceAll('"', "").replace(/\s+/g, " ").trim(),
    params: compiled.params,
  };
};

describe("public course query boundaries", () => {
  it("only selects published courses", () => {
    const compiled = compile(publishedCourseWhere());

    expect(compiled.sql).toBe('"courses"."status" = $1'.replaceAll('"', ""));
    expect(compiled.params).toEqual(["published"]);
  });

  it("omits lesson video references from nested public payloads", () => {
    expect(publicLessonColumns).not.toHaveProperty("videoReference");
    expect(previewLessonPublicColumns).toHaveProperty("videoReference");
  });

  it("orders nested modules and lessons by position", () => {
    const query = publishedCourseWithSyllabus();

    expect(query.with.modules.orderBy).toEqual([asc(modules.position)]);
    expect(query.with.modules.with.lessons.orderBy).toEqual([
      asc(lessons.position),
    ]);
  });

  it("requires a published course and a preview lesson", () => {
    const compiled = compile(
      previewLessonWhere(
        "course-slug",
        "40000000-0000-4000-8000-000000000001",
      ),
    );

    expect(compiled.sql).toBe(
      "(courses.status = $1 and courses.slug = $2 and lessons.is_preview = $3 and lessons.id = $4)",
    );
    expect(compiled.params).toEqual([
      "published",
      "course-slug",
      true,
      "40000000-0000-4000-8000-000000000001",
    ]);
  });
});

describe("progress query boundary", () => {
  it("filters progress by the server-derived Clerk user ID", () => {
    const compiled = compile(progressForUserWhere("user_server_123"));

    expect(compiled.sql).toBe(
      '"lesson_progress"."user_id" = $1'.replaceAll('"', ""),
    );
    expect(compiled.params).toEqual(["user_server_123"]);
  });

  it("rejects an empty user ID instead of querying all progress", () => {
    expect(() => progressForUserWhere("  ")).toThrow(
      "A server-derived user ID is required",
    );
  });
});
