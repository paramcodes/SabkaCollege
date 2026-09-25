import { asc } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import {
  previewLessonPublicColumns,
  previewLessonWhere,
  progressForUserWhere,
  publicLessonColumns,
  publishedCourseCatalogOrderBy,
  publishedCourseWhere,
  publishedCourseWithSyllabus,
} from "../../../src/db/queries/query-boundaries";
import { courses, lessons, modules } from "../../../src/db/schema";

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

  it("uses only public lesson columns in the nested course relation", () => {
    const relation = publishedCourseWithSyllabus();
    const nestedLessonColumns = relation.with.modules.with.lessons.columns;

    expect(nestedLessonColumns).toBe(publicLessonColumns);
    expect(nestedLessonColumns).not.toHaveProperty("videoReference");
    expect(previewLessonPublicColumns).toHaveProperty("videoReference");
  });

  it("orders the published catalog by ascending course title", () => {
    expect(publishedCourseCatalogOrderBy).toEqual([
      asc(courses.title),
      asc(courses.slug),
    ]);
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
      previewLessonWhere("course-slug", "preview-lesson"),
    );

    expect(compiled.sql).toBe(
      "(courses.status = $1 and courses.slug = $2 and lessons.is_preview = $3 and lessons.slug = $4)",
    );
    expect(compiled.params).toEqual([
      "published",
      "course-slug",
      true,
      "preview-lesson",
    ]);
  });
});

describe("progress query boundary", () => {
  it("uses the shared normalized user ID for progress query scoping", () => {
    const compiled = compile(progressForUserWhere("  user_server_123  "));

    expect(compiled.sql).toBe(
      '"lesson_progress"."user_id" = $1'.replaceAll('"', ""),
    );
    expect(compiled.params).toEqual(["user_server_123"]);
  });

  it("fails closed for an empty user ID", () => {
    expect(() => progressForUserWhere("  ")).toThrow();
  });
});
